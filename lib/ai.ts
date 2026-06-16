import type { Level, MessageRole, Organization, PracticeMode } from "@prisma/client";
import {
  OpenAIUnavailableError,
  getOpenAIClient,
  hasUsableOpenAIKey,
  isLikelyOpenAIUnavailableError,
  openAIModel
} from "@/lib/openai";
import { getAiPersona } from "@/lib/ai-personas";
import { buildTranscriptBasedDebateJudge } from "@/lib/debate-judge-analysis";
import { pickFallbackDebateTopic } from "@/lib/debate-topics";
import { getRubricSeed, SHARED_SPEAKING_SKILLS, type RubricCategorySeed } from "@/lib/rubrics";
import { buildFallbackPracticeQuestions } from "@/lib/test-question-bank";

type DebateTranscriptMessage = {
  role: MessageRole;
  round: number;
  content: string;
};

type CategoryScore = {
  key: string;
  label: string;
  score: number;
  reason: string;
};

type SharedSpeakingScores = {
  clarity: number;
  confidence: number;
  pacing: number;
  volume: number;
  organization: number;
  vocabulary: number;
  persuasion: number;
  professionalism: number;
};

type ReadinessForNextLevel = {
  ready: boolean;
  rationale: string;
  nextMilestone: string;
};

type LessonRecommendation = {
  lessonSlug: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

type TopicPackage = {
  topic: string;
  background: string;
  affirmativePosition: string;
  negativePosition: string;
  suggestedEvidenceAngles: string[];
  fallbackNotice?: string;
};

type OpponentResponse = {
  response: string;
  strategy: string;
  pressurePoints: string[];
  fallbackNotice?: string;
};

type DebateJudgeResult = {
  overallScore: number;
  categoryScores: CategoryScore[];
  sharedSpeaking: SharedSpeakingScores;
  speakerScores: Array<{
    speaker: string;
    team: "GOVERNMENT" | "OPPOSITION";
    score: number;
    rank: 1 | 2 | 3 | 4;
    descriptor: "poor" | "developing" | "competent" | "good" | "excellent" | "outstanding" | "exceptional";
    rationale: string;
  }>;
  teamWinner: "GOVERNMENT" | "OPPOSITION";
  losingSide?: "GOVERNMENT" | "OPPOSITION";
  confidenceLevel?: "low" | "medium" | "high";
  shortReasonForDecision?: string;
  longReasonForDecision?: string;
  reasonForDecision: string;
  sideFeedback?: {
    government: {
      didWell: string[];
      missed: string[];
    };
    opposition: {
      didWell: string[];
      missed: string[];
    };
  };
  sideAnalysis?: {
    government: TranscriptSideAnalysis;
    opposition: TranscriptSideAnalysis;
  };
  transcriptFeedback?: {
    studentSide: "GOVERNMENT" | "OPPOSITION";
    strongestClaim: string;
    weakestClaim: string;
    bestRefutation: string;
    biggestDroppedArgument: string;
    mostMissingPiece: string;
    betterSentence: string;
    modelRewrite: string;
    skillToPractice: string;
  };
  internalScoringSummary?: {
    governmentScore: number;
    oppositionScore: number;
    reasonWinnerSelected: string;
  };
  judgeFairnessReport?: {
    emptyPhraseWarning: string | null;
    motionConnection: string;
    mechanismCheck: string;
    betterVersion: string;
    fairWinnerLogic: string;
  };
  keyClash?: string;
  strongestArgument?: string;
  weakestArgument?: string;
  strengths: string[];
  weaknesses: string[];
  improvementAdvice: string[];
  recommendedLessons: LessonRecommendation[];
  readinessForNextLevel: ReadinessForNextLevel;
  fallbackNotice?: string;
};

type TranscriptSideAnalysis = {
  whatTheyClaimed: string[];
  bestArgument: string;
  weakestArgument: string;
  failedToAnswer: string[];
  dropped: string[];
  neededMoreWarrant: string;
  neededMoreImpact: string;
  neededMoreWeighing: string;
  vagueOrUnsupported: string;
  persuasiveReframe: string;
  hiddenAssumptionAttack: string;
};

type PerformanceJudgeResult = {
  overallScore: number;
  categoryScores: CategoryScore[];
  sharedSpeaking: SharedSpeakingScores;
  strengths: string[];
  weaknesses: string[];
  improvementAdvice: string[];
  recommendedLessons: LessonRecommendation[];
  judgeQuestionFeedback?: string[];
  accuracyFlags?: string[];
  readinessForNextLevel: ReadinessForNextLevel;
  fallbackNotice?: string;
};

const DEV_AI_FALLBACK_NOTICE =
  "Development-only local AI fallback is active because OpenAI is unavailable. Add a valid OPENAI_API_KEY to use live AI.";

function compactRubric(categories: RubricCategorySeed[]) {
  return categories.map((category) => ({
    key: category.key,
    label: category.label,
    description: category.description,
    scoreMin: category.scoreMin,
    scoreMax: category.scoreMax,
    weight: category.weight,
    lessonSlugs: category.lessonSlugs
  }));
}

function rubricFor(organization: Organization, eventType: string) {
  const seed = getRubricSeed(organization, eventType);
  return seed ? compactRubric(seed.categories) : [];
}

function originalRubricInstruction() {
  return "Use an original DebateArena scoring system. The uploaded judge packet is reference material only: preserve the evaluation ideas but do not copy its wording.";
}

function canUseDevelopmentFallback<T>(fallback?: () => T): fallback is () => T {
  // Development-only safety valve: local deterministic content is used only while running Next.js locally.
  // Production never bypasses OpenAI when NODE_ENV is not "development".
  return process.env.NODE_ENV === "development" && Boolean(fallback);
}

function fallbackCategories(organization: Organization, eventType: string) {
  const rubric = rubricFor(organization, eventType);

  if (rubric.length > 0) {
    return rubric.map((category, index) => ({
      key: category.key,
      label: category.label,
      score: [4, 3, 4, 3, 4][index % 5],
      reason: `Local development estimate: shows usable ${category.label.toLowerCase()} with one clear next step.`
    }));
  }

  const defaults: Record<Organization, Array<{ key: string; label: string }>> = {
    DEBATE: [
      { key: "argument", label: "Argument" },
      { key: "refutation", label: "Refutation" },
      { key: "contentEvidence", label: "Content and Evidence" },
      { key: "organization", label: "Organization" },
      { key: "delivery", label: "Delivery" },
      { key: "clash", label: "Clash" }
    ],
    MODEL_UN: [
      { key: "argument", label: "Position Logic" },
      { key: "diplomacy", label: "Diplomacy" },
      { key: "organization", label: "Organization" },
      { key: "delivery", label: "Delivery" }
    ],
    DECA: [
      { key: "scenarioUnderstanding", label: "Understanding of the Business Scenario" },
      { key: "performanceIndicators", label: "Use of Performance Indicators" },
      { key: "solutionQuality", label: "Quality of Proposed Solution" },
      { key: "businessReasoning", label: "Business Reasoning" },
      { key: "professionalCommunication", label: "Professional Communication" },
      { key: "confidenceDelivery", label: "Confidence and Delivery" }
    ],
    HOSA: [
      { key: "healthScienceKnowledge", label: "Health Science Knowledge" },
      { key: "medicalAccuracy", label: "Medical and Health Accuracy" },
      { key: "taskCompletion", label: "Task Completion" },
      { key: "scenarioResponse", label: "Scenario Response" },
      { key: "communication", label: "Communication" },
      { key: "professionalism", label: "Professionalism" }
    ],
    MOCK_TRIAL: [
      { key: "argument", label: "Case Theory" },
      { key: "refutation", label: "Witness Control" },
      { key: "organization", label: "Courtroom Organization" },
      { key: "delivery", label: "Courtroom Delivery" }
    ],
    PUBLIC_SPEAKING: [
      { key: "argument", label: "Central Message" },
      { key: "organization", label: "Speech Structure" },
      { key: "style", label: "Style" },
      { key: "delivery", label: "Delivery" }
    ]
  };

  return defaults[organization].map((category, index) => ({
    ...category,
    score: [76, 72, 78, 74, 80][index % 5],
    reason: `Local development estimate: ${category.label.toLowerCase()} is functional and ready for another practice rep.`
  }));
}

function fallbackSharedSpeaking(): SharedSpeakingScores {
  return {
    clarity: 78,
    confidence: 74,
    pacing: 72,
    volume: 76,
    organization: 80,
    vocabulary: 73,
    persuasion: 75,
    professionalism: 82
  };
}

function fallbackLessons(organization: Organization, eventType: string): LessonRecommendation[] {
  const lessonSlugs = Array.from(
    new Set(rubricFor(organization, eventType).flatMap((category) => category.lessonSlugs))
  );

  const defaults: Record<Organization, string[]> = {
    DEBATE: ["debate-claim-building-1", "debate-rebuttal-1", "debate-evidence-1"],
    MODEL_UN: ["model-un-resolution-writing-1", "model-un-diplomacy-1"],
    DECA: ["deca-roleplay-1", "deca-marketing-1", "deca-roleplay-2"],
    HOSA: ["hosa-medical-terminology-1", "hosa-patient-communication-1"],
    MOCK_TRIAL: ["mock-trial-case-theory-1"],
    PUBLIC_SPEAKING: ["public-speaking-delivery-1"]
  };

  return (lessonSlugs.length > 0 ? lessonSlugs : defaults[organization]).slice(0, 3).map((lessonSlug, index) => ({
    lessonSlug,
    reason: "Targets the most visible gap from this local development scoring pass.",
    priority: index === 0 ? "high" : index === 1 ? "medium" : "low"
  }));
}

function fallbackTopic(input: {
  organization: Organization;
  level: Level;
  eventType?: string;
  practiceMode?: PracticeMode;
  focusArea?: string;
  previousTopics?: string[];
}): TopicPackage {
  if (input.organization === "DEBATE") {
    return {
      ...pickFallbackDebateTopic(input),
      fallbackNotice: DEV_AI_FALLBACK_NOTICE
    };
  }

  const eventType = input.eventType ?? "GENERAL";
  const focus = input.focusArea ?? "strategic communication";
  const normalizedFocus = focus.toLowerCase();
  const levelLens: Record<Level, string> = {
    BEGINNER: "clear, student-friendly",
    INTERMEDIATE: "policy tradeoff",
    ELITE: "multi-stakeholder, high-clash"
  };
  const debateMotionsByFocus: Record<string, string[]> = {
    global: [
      "This House would require schools to teach practical AI literacy before graduation.",
      "This House believes international student exchanges should prioritize climate resilience projects.",
      "This House would make digital privacy education a graduation requirement."
    ],
    education: [
      "This House would require every high school student to complete a financial literacy course.",
      "This House believes schools should replace some homework with supervised skill labs.",
      "This House would let students use AI tools only after completing a responsible-use certification."
    ],
    technology: [
      "This House would require social media platforms to offer teen accounts with default time limits.",
      "This House believes schools should teach students how to audit AI-generated information.",
      "This House would prioritize public funding for cybersecurity education over consumer device subsidies."
    ],
    health: [
      "This House would require schools to provide mental health first-aid training for student leaders.",
      "This House believes public health campaigns should focus more on prevention than punishment.",
      "This House would expand school-based health clinics in underserved communities."
    ],
    "civic life": [
      "This House would require local governments to include youth advisory councils in major policy decisions.",
      "This House believes community service should be a graduation requirement.",
      "This House would make civic media literacy a required high school course."
    ],
    ethics: [
      "This House would require companies to label AI-generated customer service interactions.",
      "This House believes schools should prioritize restorative accountability over zero-tolerance discipline.",
      "This House would ban persuasive design features that target minors."
    ],
    business: [
      "This House believes student entrepreneurs should receive school credit for validated business projects.",
      "This House would require large companies to publish plain-language explanations of pricing changes.",
      "This House believes local governments should prioritize grants for youth-run small businesses."
    ],
    law: [
      "This House would require schools to teach basic legal rights and responsibilities.",
      "This House believes restorative justice should be the default response to minor school discipline issues.",
      "This House would limit the use of predictive algorithms in public decision-making."
    ]
  };

  const topicPools: Record<Organization, string[]> = {
    DEBATE:
      debateMotionsByFocus[
        Object.keys(debateMotionsByFocus).find((key) => normalizedFocus.includes(key)) ?? "global"
      ],
    MODEL_UN: [
      "A committee must design a regional agreement for responsible AI use in education.",
      "A committee must negotiate a public health cooperation plan for climate-related displacement.",
      "A committee must balance national security with youth digital privacy rights."
    ],
    DECA: [
      "A local business needs a student-friendly launch strategy for a new tutoring subscription.",
      "A community retailer needs a loyalty plan that improves repeat visits without over-discounting.",
      "A student startup needs a lean validation plan before building its first app."
    ],
    HOSA: [
      "A community clinic needs a youth outreach plan to improve preventive health communication.",
      "A health science team must explain a safety checklist to nervous first-time patients.",
      "A public health group needs a plain-language campaign about credible health information."
    ],
    MOCK_TRIAL: [
      "A trial team must argue whether a school policy reasonably protected student safety.",
      "A trial team must decide whether a business acted negligently after ignoring repeated warnings.",
      "A trial team must evaluate whether digital evidence was reliable enough to use."
    ],
    PUBLIC_SPEAKING: [
      "Students should learn persuasive speaking as a core career-readiness skill.",
      "Young leaders should practice explaining complex topics in plain language.",
      "Public speaking courses should include debate-style rebuttal practice."
    ]
  };
  const pool = topicPools[input.organization];
  const rotationSeed = Date.now() + focus.length + eventType.length + input.level.length;
  const topic = pool[rotationSeed % pool.length];
  const formatLabel = eventType.replaceAll("_", " ").toLowerCase();

  return {
    topic,
    background: `Local ${input.level.toLowerCase()} development prompt for ${formatLabel}. It is original practice content focused on ${focus} with a ${levelLens[input.level]} clash.`,
    affirmativePosition: "Defend the proposal by showing clear benefits, practical implementation, and why the status quo leaves students underprepared.",
    negativePosition: "Challenge the proposal by testing feasibility, tradeoffs, cost, unintended consequences, and whether a narrower solution is better.",
    suggestedEvidenceAngles: [
      "Define the stakeholders and success criteria.",
      "Use one concrete example and one measurable impact.",
      "Weigh feasibility against long-term educational value."
    ],
    fallbackNotice: DEV_AI_FALLBACK_NOTICE
  };
}

function cleanMotion(topic: string) {
  const cleaned = topic
    .replace(/^\s*this house (would|believes that|believes|supports|opposes|that)?\s*/i, "")
    .replace(/\s+/g, " ")
    .replace(/[.\s]+$/, "")
    .trim();

  return cleaned.length > 4 ? cleaned : topic.replace(/[.\s]+$/, "").trim();
}

function extractStudentPoint(transcript: DebateTranscriptMessage[], studentRole: MessageRole) {
  const latestStudentSpeech = [...transcript].reverse().find((message) => message.role === studentRole)?.content ?? "";
  const firstSentence = latestStudentSpeech
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .find((sentence) => sentence.length > 20);

  if (!firstSentence) {
    return null;
  }

  // Strip trailing terminal punctuation so the claim embeds cleanly mid-sentence.
  const stripped = firstSentence.replace(/[.!?]+$/, "");
  const trimmed = stripped.length > 200 ? `${stripped.slice(0, 197)}...` : stripped;
  // Lowercase the first letter so the claim reads naturally when embedded mid-sentence.
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

// Each persona argues like a distinct, thoughtful human: acknowledge the real point, expose the
// hidden assumption, attack the mechanism, offer a narrower alternative, and explain why that wins.
// No speech labels, no "First/Second/Finally", no empty ballot vocabulary.
function buildPersonaArgument(personaId: string, claim: string, motion: string) {
  const builders: Record<string, () => { response: string; move: string }> = {
    "evidence-specialist": () => ({
      move: "asking for proof before accepting the claim",
      response: `I hear you when you say ${claim}. The part I'm not sold on yet is the proof. What actually shows that ${motion} produces that result, instead of just sounding like it should? If the strongest support is a story or a hunch, then we'd be making a big change on thin evidence. Show me the case where a narrower, more targeted version wouldn't get most of the same benefit — because if it would, the sweeping version isn't worth the cost.`
    }),
    "devils-advocate": () => ({
      move: "attacking the hidden assumption",
      response: `Let me take the strongest version of your point: ${claim}. Even granting that, your argument quietly assumes the only fix is ${motion}. That skips the middle ground. If the real harm is narrower than the whole system, a smaller change solves it without the side effects. So the question isn't whether your problem is real — it might be. It's whether the blunt solution is the one that actually fixes it, and I don't think you've shown that.`
    }),
    "policy-analyst": () => ({
      move: "focusing on implementation and a narrower alternative",
      response: `I'll take your concern seriously: ${claim}. But implementation is where this falls apart. ${capitalize(motion)} is a blunt instrument — it changes everything at once, including the parts that were working fine. A more precise policy targets just the harm you named and leaves the rest alone. That gets most of the benefit with far less disruption, which is exactly why I'd pick the narrower fix over the sweeping one.`
    }),
    "socratic-questioner": () => ({
      move: "questioning the cause of the harm",
      response: `You're arguing that ${claim}. Let me ask what's underneath it: what is actually causing the harm — the thing itself, or the way it's used? Because if it's how it's used, then ${motion} is aimed at the wrong target. Wouldn't changing how it works solve the problem more directly than removing it entirely? Until that's answered, I don't see why the full change is the right call.`
    }),
    "ethics-philosopher": () => ({
      move: "weighing fairness on both sides",
      response: `I agree the fairness concern in your point — ${claim} — is worth taking seriously. But fairness cuts both ways. ${capitalize(motion)} helps the people you're worried about, and it may take something away from others who were relying on it. The more principled move is the narrower one: fix the unfairness you named without creating a new group of people who lose out.`
    }),
    "rhetorician": () => ({
      move: "reframing the real choice",
      response: `I'll meet your point head-on: ${claim} lands, and I'm not going to pretend it doesn't. But step back and look at what we're really choosing. This isn't "problem versus solution." It's a sweeping change versus a precise one. When a smaller fix gets the same result without the collateral damage, the bold-sounding option is the riskier bet — not the safer one.`
    }),
    "tournament-judge": () => ({
      move: "testing the link from problem to solution",
      response: `Take your best point — ${claim} — and I'll even grant it. The trouble is the link to your conclusion. Getting from "this is a real problem" to "${motion}" means showing that the full change is what fixes it, and that a narrower option wouldn't do the same job. That's the step I'd need you to win, and right now it's missing, so the more careful side is ahead.`
    }),
    "deca-judge": () => ({
      move: "treating it as a cost-benefit decision",
      response: `From a practical standpoint, ${claim} is a fair concern. But weigh it the way a decision-maker would: ${motion} is broad and high-cost, while a targeted change is cheaper and hits the same problem. If the narrower option gets most of the result for a fraction of the disruption, that's simply the better decision — and that's the one I'd defend.`
    }),
    "hosa-judge": () => ({
      move: "favoring the more measured intervention",
      response: `I understand the worry behind ${claim}. But the safer path is the more measured one. ${capitalize(motion)} changes everything at once, and broad changes carry side effects you can't always predict. A narrower fix addresses the specific harm while protecting the parts that were already working — and protecting what works should come first.`
    }),
    "starter-coach": () => ({
      move: "coaching toward a stronger version of the argument",
      response: `Good instinct — ${claim} is a real concern, and you're right to start there. Here's how I'd push back, and watch the move: you have a claim, but the warrant is doing a lot of quiet work. You're assuming ${motion} is the only fix. A stronger version of your own case would explain why a smaller, targeted change wouldn't work just as well — because if it would, the calmer option usually wins.`
    }),
    "friendly-practice": () => ({
      move: "answering directly and offering a cleaner alternative",
      response: `Fair point — ${claim} is worth taking seriously, so let me answer it directly. The issue is that you've jumped straight to ${motion} as the answer. If the harm you described is really about one specific part, a narrower change fixes that part without upending everything else. That's the version I'd back, because it solves the same problem with less to go wrong.`
    })
  };

  const build = builders[personaId] ?? builders["devils-advocate"];
  return build();
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function fallbackOpponent(input: {
  side: "AFFIRMATIVE" | "NEGATIVE";
  topic: string;
  round: number;
  level: Level;
  personaId?: string;
  transcript: DebateTranscriptMessage[];
}): OpponentResponse {
  const isAffirmative = input.side === "AFFIRMATIVE";
  const persona = getAiPersona(input.personaId);
  const studentRole: MessageRole = isAffirmative ? "NEGATIVE" : "AFFIRMATIVE";
  const motion = cleanMotion(input.topic);
  const studentPoint = extractStudentPoint(input.transcript, studentRole) ?? "there's a real problem worth solving here";
  const { response, move } = buildPersonaArgument(persona.id, studentPoint, motion);

  return {
    response,
    strategy: `${persona.name} — ${move}`,
    pressurePoints: [
      "Name the exact harm and explain what actually causes it.",
      `Show why ${motion} solves better than a narrower, more targeted fix.`,
      "Connect the claim to a concrete impact, not just a label."
    ],
    fallbackNotice: DEV_AI_FALLBACK_NOTICE
  };
}

function fallbackDebateJudge(input: {
  organization: Organization;
  level: Level;
  topic: string;
  eventType?: string;
  transcript: DebateTranscriptMessage[];
  studentSide?: "GOVERNMENT" | "OPPOSITION" | "FOR" | "AGAINST";
}): DebateJudgeResult {
  const eventType = input.eventType ?? "PARLIAMENTARY_DEBATE";
  return buildTranscriptBasedDebateJudge({
    organization: input.organization,
    eventType,
    level: input.level,
    topic: input.topic,
    transcript: input.transcript,
    studentSide: input.studentSide
  }) as DebateJudgeResult;
}

function fallbackPerformanceJudge(input: {
  organization: Extract<Organization, "DECA" | "HOSA">;
  eventType: string;
}): PerformanceJudgeResult {
  const isDeca = input.organization === "DECA";

  return {
    overallScore: isDeca ? 78 : 77,
    categoryScores: fallbackCategories(input.organization, input.eventType),
    sharedSpeaking: fallbackSharedSpeaking(),
    strengths: isDeca
      ? ["Clear business recommendation", "Professional tone", "Practical first implementation step"]
      : ["Clear health communication", "Professional demeanor", "Good scenario prioritization"],
    weaknesses: isDeca
      ? ["Tie every recommendation to a performance indicator", "Add one measurable business metric"]
      : ["State safety assumptions clearly", "Use more precise health terminology"],
    improvementAdvice: isDeca
      ? ["Open with the business problem, then number your solution steps.", "Answer judge questions with a direct claim before explanation."]
      : ["Use plain-language patient explanations after technical terms.", "Close by summarizing the safest next action."],
    recommendedLessons: fallbackLessons(input.organization, input.eventType),
    judgeQuestionFeedback: isDeca ? ["Answer was organized; add a metric and risk tradeoff next time."] : undefined,
    accuracyFlags: isDeca ? undefined : ["Local fallback cannot verify medical accuracy; use instructor review for safety-critical content."],
    readinessForNextLevel: {
      ready: false,
      rationale: "Local development scoring shows a competitive foundation with one or two repeatable gaps.",
      nextMilestone: "Repeat the same event type and improve the weakest category by one point."
    },
    fallbackNotice: DEV_AI_FALLBACK_NOTICE
  };
}

function fallbackPracticeQuestions(input: {
  organization: Extract<Organization, "DECA" | "HOSA">;
  eventType: string;
  eventCluster?: string;
  difficulty: Level;
  count: 10 | 25 | 50 | 100;
}) {
  return {
    fallbackNotice: DEV_AI_FALLBACK_NOTICE,
    questions: buildFallbackPracticeQuestions(input)
  };
}

function fallbackLessonContent(input: { organization: Organization; level: Level; skillName: string }) {
  return {
    fallbackNotice: DEV_AI_FALLBACK_NOTICE,
    lesson: `Local development lesson for ${input.skillName}: define the skill, show one strong model, then practice it under a short timer at the ${input.level.toLowerCase()} level.`,
    examples: [
      `Strong ${input.skillName}: names the goal, uses specific evidence, and explains why it matters.`,
      `Developing ${input.skillName}: has a good idea but needs clearer structure and comparison.`
    ],
    guidedPractice: [
      "Write a one-sentence goal for the skill.",
      "Add one concrete example.",
      "Revise the response so the judge can see the scoring category."
    ],
    independentPractice: [
      "Set a three-minute timer and complete one full rep.",
      "Circle the sentence that would most help your judge understand your point."
    ],
    masteryQuiz: [
      {
        question: `What is the main purpose of ${input.skillName}?`,
        answer: "To make the performance easier to follow, score, and compare.",
        explanation: "Judges reward skills that are clear, intentional, and connected to the event criteria."
      }
    ]
  };
}

async function jsonCompletion<T>(system: string, prompt: string, fallback?: () => T): Promise<T> {
  if (!hasUsableOpenAIKey()) {
    if (canUseDevelopmentFallback(fallback)) {
      return fallback();
    }

    throw new OpenAIUnavailableError();
  }

  const openai = getOpenAIClient();

  try {
    const response = await openai.chat.completions.create({
      model: openAIModel,
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ]
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new OpenAIUnavailableError("AI service unavailable. The model returned an empty response.");
    }

    return JSON.parse(content) as T;
  } catch (error) {
    if (canUseDevelopmentFallback(fallback)) {
      console.warn("[development-only AI fallback] OpenAI request failed. Using local fallback content.", error);
      return fallback();
    }

    if (isLikelyOpenAIUnavailableError(error)) {
      throw new OpenAIUnavailableError();
    }

    throw new OpenAIUnavailableError("AI service unavailable. Try again later.");
  }
}

export async function generateTopic(input: {
  organization: Organization;
  level: Level;
  eventType?: string;
  practiceMode?: PracticeMode;
  focusArea?: string;
  previousTopics?: string[];
}) {
  return jsonCompletion<TopicPackage>(
    "You generate original, age-appropriate competitive practice prompts. Avoid copyrighted prompts, past exams, judge packet wording, and real private student data. Return JSON only.",
    `Generate one ${input.level} ${input.organization} practice prompt.
Event type: ${input.eventType ?? "default"}
Practice mode: ${input.practiceMode ?? "DEBATE"}
Optional focus area: ${input.focusArea ?? "none"}.
Avoid repeating these previous topics from the current session: ${JSON.stringify(input.previousTopics ?? [])}.
Return JSON with topic, background, affirmativePosition, negativePosition, and suggestedEvidenceAngles.`,
    () => fallbackTopic(input)
  );
}

export async function generateOpponentResponse(input: {
  organization: Organization;
  level: Level;
  eventType?: string;
  practiceMode?: PracticeMode;
  topic: string;
  side: "AFFIRMATIVE" | "NEGATIVE";
  round: number;
  transcript: DebateTranscriptMessage[];
  personaId?: string | null;
}) {
  const persona = getAiPersona(input.personaId);

  return jsonCompletion<OpponentResponse>(
    `You are a smart, real person arguing the ${input.side} side of a debate. You are NOT a debate-format generator.

Talk like an articulate human in a real conversation. Your reasoning must follow this flow:
1. Understand the other person's actual point.
2. Admit the strongest part of it if it genuinely holds up.
3. Find the hidden assumption their argument depends on.
4. Attack the mechanism — explain why their cause-and-effect does not hold.
5. Offer a better alternative, narrower fix, or countermodel.
6. Explain, in plain language, why that means your side is more persuasive.

HARD BANS — never write any of these:
- Speech labels like "Negative speech 2", "Affirmative speech 1", or any "<side> speech <number>".
- Outline headers like "First, direct clash", "Second, independent offense", "Finally, weighing", or "First/Second/Third/Finally" as section labels.
- Jargon used as filler: "direct clash", "independent offense", "I answer the warrant then compare impacts", "the key is direct clash".
- Empty ballot lines like "the judge should prefer my side because we have clearer causation, lower risk, and stronger impact comparison." You may only claim you are ahead if you have just explained, concretely, WHY.

Write in flowing paragraphs, specific to THIS motion and to what the other side actually said. Be genuinely persuasive, not formulaic. Never invent citations as real sources. Persona — argue in this voice: ${persona.name}. ${persona.promptInstructions}`,
    `Motion: ${input.topic}
Organization: ${input.organization}
Event type: ${input.eventType ?? "default"}
Practice mode: ${input.practiceMode ?? "DEBATE"}
Level: ${input.level}
You are arguing: ${input.side}
Round: ${input.round}
Persona voice: ${persona.name} — ${persona.style}. ${persona.promptInstructions}
Transcript so far (JSON): ${JSON.stringify(input.transcript)}

Respond to the other side's most recent point using the 6-step reasoning flow. Sound like a real, specific, persuasive human — not a template.
Return JSON with:
- "response": your spoken argument as natural paragraphs (no headings, no speech labels, no jargon filler).
- "strategy": a short plain-English note on the line of attack you took (for the coach, not spoken).
- "pressurePoints": 2-4 specific things the student must answer next.`,
    () => fallbackOpponent({ ...input, personaId: input.personaId ?? undefined })
  );
}

export async function judgeDebate(input: {
  organization: Organization;
  level: Level;
  eventType?: string;
  topic: string;
  transcript: DebateTranscriptMessage[];
  studentSide?: "GOVERNMENT" | "OPPOSITION" | "FOR" | "AGAINST";
  opponentSide?: "GOVERNMENT" | "OPPOSITION" | "FOR" | "AGAINST";
  format?: string;
  aiPersona?: string | null;
}) {
  const eventType = input.eventType ?? "PARLIAMENTARY_DEBATE";
  const rubric = rubricFor(input.organization, eventType);

  return jsonCompletion<DebateJudgeResult>(
    `You are a fair educational debate judge. ${originalRubricInstruction()} Return JSON only.
Do not default to Government, Affirmative, the student, the AI, the first speaker, or the longer speech.
You must decide the winner from the actual transcript and quote or tightly paraphrase what each side said.

CRITICAL — do not reward debate-sounding filler. Phrases like "judge should prefer us", "clearer causation", "lower risk", "impact comparison", "stronger impact", "we outweigh", "direct clash", and "independent offense" are NOT arguments by themselves. They earn ZERO credit unless the speaker also actually:
- states a specific claim,
- explains why it is true (a real warrant / mechanism, not a label),
- connects it to THIS motion,
- names a concrete harm or benefit and who it affects,
- answers what the opponent actually said,
- and explains why it outweighs the other side with real reasoning.

A side must never win just because it used weighing vocabulary. If a side says something like "even if they win a small benefit, prefer us for clearer causation and lower risk" but never proves the underlying claim, you must score it LOW, flag it as empty jargon, and you must NOT give it the win on that basis. The winner is decided on real argument quality, not on who sounds more like a debater.`,
    `Judge this ${input.level} ${input.organization} ${eventType} round.
Topic: ${input.topic}
Format: ${input.format ?? eventType}
Student side: ${input.studentSide ?? "unknown"}
Opponent side: ${input.opponentSide ?? "unknown"}
Selected AI persona: ${input.aiPersona ?? "unknown"}
Transcript JSON: ${JSON.stringify(input.transcript)}
Rubric JSON: ${JSON.stringify(rubric)}
Shared speaking skills to score from 0-100: ${SHARED_SPEAKING_SKILLS.join(", ")}.

Required analysis:
- Score Government/Affirmative and Opposition/Negative separately on claim clarity, warrant/reasoning, impact, refutation/direct clash, weighing/comparison, evidence/examples, organization/signposting, responsiveness, final speech quality, and rule compliance.
- Identify what each side claimed, what each side dropped, which claims were extended, and which final speech introduced new arguments if it happened.
- Penalize speeches like "my opponent is wrong" for no warrant, no specific refutation, no impact comparison, and no evidence/example.
- Penalize empty debate jargon just as hard: weighing words with no proven claim behind them, generic "judge should prefer" lines, claims with no warrant, claims with no impact, arguments that never connect to the motion, and "refutations" that do not answer the opponent's actual claim.
- Reward only real argumentation: topic-specific claims, clear warrants/mechanisms, concrete impacts, actual refutation that answers the opponent, and comparison that explains WHY one impact matters more.
- The RFD must reference actual speech content. Include at least one quoted or tightly paraphrased phrase from the transcript in side feedback and student feedback.

Speaker points must use the 19-30 range:
19 poor; 20-21 developing; 22-23 competent; 24-26 good; 27-28 excellent; 29 outstanding; 30 exceptional.
Create four speaker slots if names are absent: Government 1, Government 2, Opposition 1, Opposition 2.
Assign ranks 1-4 with no ties.

Return JSON with overallScore, categoryScores, sharedSpeaking, speakerScores, teamWinner, losingSide, confidenceLevel, shortReasonForDecision, longReasonForDecision, reasonForDecision, sideFeedback, sideAnalysis, transcriptFeedback, internalScoringSummary, keyClash, strongestArgument, weakestArgument, strengths, weaknesses, improvementAdvice, recommendedLessons, and readinessForNextLevel.
categoryScores must include transcript-specific reason strings.
sideFeedback must contain government.didWell, government.missed, opposition.didWell, and opposition.missed arrays.
sideAnalysis must explain what each side claimed, bestArgument, weakestArgument, failedToAnswer, dropped, neededMoreWarrant, neededMoreImpact, neededMoreWeighing, vagueOrUnsupported, persuasiveReframe, and hiddenAssumptionAttack.
transcriptFeedback must focus on the student side and include strongestClaim, weakestClaim, bestRefutation, biggestDroppedArgument, mostMissingPiece, betterSentence, modelRewrite, and skillToPractice.
internalScoringSummary must include governmentScore, oppositionScore, and reasonWinnerSelected.
judgeFairnessReport must include:
- emptyPhraseWarning: if either side leaned on weighing words or generic ballot phrases without proving the claim, name the side and the exact phrase and say it was not backed by a real argument (for example: "Opposition used weighing language like 'clearer causation' but never explained what causes what or how it applies to the motion."). Use null only if neither side did this.
- motionConnection: judge how well the student's argument actually connected to the specific motion, and say what was weak if it did not.
- mechanismCheck: state the cause-and-effect the student needed to prove and whether they proved it.
- betterVersion: rewrite the student's weakest line into a real argument with claim, warrant, motion connection, and impact.
- fairWinnerLogic: explain that the winner was chosen on real argument quality, not debate vocabulary, referencing the actual transcript.`,
    () => fallbackDebateJudge(input)
  );
}

export async function judgeDecaRoleplay(input: {
  level: Level;
  eventType: string;
  scenario: string;
  transcript: DebateTranscriptMessage[];
}) {
  const rubric = rubricFor("DECA", input.eventType);

  return jsonCompletion<PerformanceJudgeResult>(
    "You are an educational DECA judge for original practice roleplays and case studies. Do not judge like debate. Return JSON only.",
    `Evaluate this ${input.level} DECA ${input.eventType} practice.
Scenario: ${input.scenario}
Transcript JSON: ${JSON.stringify(input.transcript)}
Rubric JSON: ${JSON.stringify(rubric)}
Shared speaking skills to score from 0-100: ${SHARED_SPEAKING_SKILLS.join(", ")}.

Focus on business scenario understanding, performance indicators, solution quality, business reasoning, creativity, feasibility, professional communication, organization, judge questions, and delivery.
Return JSON with overallScore, categoryScores, sharedSpeaking, strengths, weaknesses, improvementAdvice, recommendedLessons, judgeQuestionFeedback, and readinessForNextLevel.`,
    () => fallbackPerformanceJudge({ organization: "DECA", eventType: input.eventType })
  );
}

export async function judgeHosaPerformance(input: {
  level: Level;
  eventType: string;
  scenario: string;
  transcript: DebateTranscriptMessage[];
}) {
  const rubric = rubricFor("HOSA", input.eventType);

  return jsonCompletion<PerformanceJudgeResult>(
    "You are an educational HOSA judge for original health science practice. Do not judge like debate. Return JSON only.",
    `Evaluate this ${input.level} HOSA ${input.eventType} performance.
Scenario: ${input.scenario}
Transcript JSON: ${JSON.stringify(input.transcript)}
Rubric JSON: ${JSON.stringify(rubric)}
Shared speaking skills to score from 0-100: ${SHARED_SPEAKING_SKILLS.join(", ")}.

Focus on health science knowledge, medical/health accuracy, event task completion, scenario response, communication, professionalism, presentation quality, and skill/performance quality when relevant.
Return JSON with overallScore, categoryScores, sharedSpeaking, strengths, weaknesses, improvementAdvice, recommendedLessons, accuracyFlags, and readinessForNextLevel.`,
    () => fallbackPerformanceJudge({ organization: "HOSA", eventType: input.eventType })
  );
}

export async function generatePracticeQuestions(input: {
  organization: Extract<Organization, "DECA" | "HOSA">;
  eventType: string;
  eventCluster?: string;
  difficulty: Level;
  count: 10 | 25 | 50 | 100;
}) {
  return jsonCompletion<{
    questions: Array<{
      question: string;
      choices: string[];
      correctAnswer: string;
      explanation: string;
      skillTag: string;
    }>;
  }>(
    "You generate original practice exam questions inspired by public competition guidelines, event structures, and career/health science standards. Do not copy copyrighted past exams, official sample questions, or protected exam wording. Return JSON only.",
    `Create ${input.count} original ${input.organization} ${input.difficulty} multiple-choice practice questions.
Event/category: ${input.eventType}
Cluster or focus: ${input.eventCluster ?? "general"}
Each question must include question, choices, correctAnswer, explanation, skillTag, linkedSkill, difficulty, and either eventCluster or eventCategory.
DECA questions should align to career clusters, instructional areas, performance-indicator style skills, roleplay/case reasoning, metrics, and judge-facing business decisions.
HOSA questions should be labeled as original practice inspired by public event guidelines and health science topics, not official HOSA practice tests.
Questions should test transferable standards and concepts, not reproduce protected exam language.`,
    () => fallbackPracticeQuestions(input)
  );
}

export async function generateLessonContent(input: {
  organization: Organization;
  level: Level;
  skillName: string;
}) {
  return jsonCompletion<{
    lesson: string;
    examples: string[];
    guidedPractice: string[];
    independentPractice: string[];
    masteryQuiz: Array<{ question: string; answer: string; explanation: string }>;
  }>(
    "You write concise, scaffolded lessons for middle and high school competitors. Return JSON only.",
    `Generate a ${input.level} lesson for ${input.organization} skill "${input.skillName}".
Return lesson, examples, guidedPractice, independentPractice, and masteryQuiz.`,
    () => fallbackLessonContent(input)
  );
}

export async function recommendLessons(input: {
  organization: Organization;
  eventType?: string;
  weaknesses: string[];
  availableLessons: Array<{ slug: string; title: string; skill: string }>;
}) {
  return jsonCompletion<{
    recommendations: Array<{
      lessonSlug: string;
      reason: string;
      priority: "high" | "medium" | "low";
    }>;
  }>(
    "You map student weaknesses to the most relevant lessons. Return JSON only.",
    `Organization: ${input.organization}
Event type: ${input.eventType ?? "general"}
Weaknesses: ${JSON.stringify(input.weaknesses)}
Available lessons: ${JSON.stringify(input.availableLessons)}

Return JSON recommendations with lessonSlug, reason, and priority.`,
    () => ({
      recommendations: input.availableLessons.slice(0, 3).map((lesson, index) => ({
        lessonSlug: lesson.slug,
        reason: `Development fallback recommendation for ${lesson.skill}: addresses one of the listed weak areas.`,
        priority: index === 0 ? "high" : index === 1 ? "medium" : "low"
      }))
    })
  );
}

export async function evaluateReadiness(input: {
  organization: Organization;
  eventType?: string;
  currentLevel: Level;
  recentScores: number[];
  weaknessSummary: string[];
}) {
  return jsonCompletion<{
    ready: boolean;
    confidence: number;
    rationale: string;
    requiredEvidence: string[];
  }>(
    "You evaluate whether a student is ready for the next competitive training level. Return JSON only.",
    `Organization: ${input.organization}
Event type: ${input.eventType ?? "general"}
Current level: ${input.currentLevel}
Recent scores: ${JSON.stringify(input.recentScores)}
Weakness summary: ${JSON.stringify(input.weaknessSummary)}

Return JSON with ready, confidence, rationale, and requiredEvidence.`,
    () => {
      const averageScore = input.recentScores.reduce((total, score) => total + score, 0) / input.recentScores.length;
      return {
        ready: averageScore >= 85 && input.weaknessSummary.length <= 1,
        confidence: Math.round(Math.min(95, Math.max(45, averageScore))),
        rationale:
          averageScore >= 85
            ? "Development fallback: recent scores suggest the student is close to readiness, pending consistent performance."
            : "Development fallback: keep practicing until recent scores are consistently above the readiness target.",
        requiredEvidence: [
          "Two recent scores above 85",
          "One judged round with clear improvement in the weakest skill",
          "A completed lesson tied to the current weakness summary"
        ]
      };
    }
  );
}
