import type { Level, MessageRole, Organization, PracticeMode } from "@prisma/client";
import {
  OpenAIUnavailableError,
  getOpenAIClient,
  hasUsableOpenAIKey,
  isLikelyOpenAIUnavailableError,
  openAIModel
} from "@/lib/openai";
import { getAiPersona } from "@/lib/ai-personas";
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
  const studentRole = isAffirmative ? "NEGATIVE" : "AFFIRMATIVE";
  const latestStudentSpeech = [...input.transcript].reverse().find((message) => message.role === studentRole)?.content ?? "";
  const firstSentence = latestStudentSpeech.split(/[.!?]/).find((sentence) => sentence.trim().length > 20)?.trim();
  const studentClaim = firstSentence ? `${firstSentence.slice(0, 180)}${firstSentence.length > 180 ? "..." : ""}` : "the other side's main claim";
  const strategyPool = [
    {
      name: "feasibility attack",
      direct: `Their strongest claim assumes the plan can be implemented smoothly, but the warrant is missing: who pays, who trains staff, and how do we measure success?`,
      independent: "A policy that sounds good but lacks a working mechanism can crowd out simpler fixes that reach students faster.",
      weighing: "Prefer the side with the more realistic mechanism because probability comes before magnitude."
    },
    {
      name: "rights and fairness",
      direct: `Their claim about benefits does not answer who bears the burden or whether the policy treats students fairly.`,
      independent: "A fair policy must protect the students most likely to be overregulated, priced out, or misclassified.",
      weighing: "Fairness should outweigh convenience because unfair rules create durable harms."
    },
    {
      name: "cost-benefit weighing",
      direct: `They identify a benefit, but they have not shown that the benefit is larger than the tradeoffs.`,
      independent: "The opportunity cost matters: time, money, attention, and trust spent here cannot be spent on targeted support.",
      weighing: "The judge should prefer the side that proves net benefit, not just possible benefit."
    },
    {
      name: "unintended consequences",
      direct: `The other side's solution may create the exact problem it tries to solve by changing incentives in the wrong direction.`,
      independent: "Broad mandates often push people toward compliance theater instead of real learning or safety.",
      weighing: "Unintended consequences are highly probable because institutions respond to metrics and rules."
    },
    {
      name: "alternative solution",
      direct: `Even if their problem is real, their remedy is not the best answer to it.`,
      independent: "A narrower opt-in pilot can test benefits, protect resources, and avoid forcing a one-size-fits-all policy.",
      weighing: "A smaller solution wins if it solves enough of the harm with less risk."
    },
    {
      name: "impact turn",
      direct: `Their impact can flip: the proposal may reduce independence, trust, or flexibility instead of improving outcomes.`,
      independent: "When people feel managed rather than supported, they often disengage from the very system meant to help them.",
      weighing: "A turned impact matters because it converts their offense into a reason to vote against the plan."
    },
    {
      name: "no-link response",
      direct: `The other side has not connected the policy to the claimed outcome with a clear causal link.`,
      independent: "Good intentions do not prove solvency; the judge needs a mechanism between action and impact.",
      weighing: "No-link responses come first because an impact without causation has little ballot weight."
    },
    {
      name: "values principle",
      direct: `Their argument treats efficiency as the main value, but the round also asks what students and communities should control for themselves.`,
      independent: "A strong policy must respect agency, transparency, and accountability, not just produce a cleaner metric.",
      weighing: "Principles matter when the policy sets a precedent for future decisions."
    },
    {
      name: "evidence challenge",
      direct: `The claim needs stronger support. A plausible story is not the same as evidence that the policy works across different schools or communities.`,
      independent: "Without examples, metrics, or comparison, the judge cannot know whether the benefit is typical or exceptional.",
      weighing: "Evidence quality should decide close rounds because it separates asserted impacts from proven impacts."
    },
    {
      name: "strategic weighing",
      direct: `Even granting part of their case, they have not explained why their impact is bigger, sooner, or more likely than ours.`,
      independent: "This round should be judged on probability and reversibility: avoid the side that creates hard-to-fix harms.",
      weighing: "Our impact controls because it is more probable and less reversible."
    }
  ];
  const strategy = strategyPool[(input.round + input.topic.length + persona.id.length) % strategyPool.length];
  const sideLabel = isAffirmative ? "Affirmative" : "Negative";
  const levelPressure: Record<Level, string> = {
    BEGINNER: "I will keep the structure simple: one answer, one argument, and one comparison.",
    INTERMEDIATE: "The key is direct clash: I answer the warrant, then compare impacts.",
    ELITE: "I am collapsing to a ballot path: link defense, an independent turn, and explicit weighing."
  };
  const personaLine =
    persona.id === "socratic-questioner"
      ? "Before accepting their case, ask: what assumption makes their impact happen, and what happens if that assumption fails?"
      : persona.id === "evidence-specialist"
        ? "The evidence burden matters here: examples must prove the mechanism, not just decorate the claim."
        : persona.id === "policy-analyst"
          ? "Implementation is the center of this speech: resources, incentives, and accountability decide whether the plan survives contact with reality."
          : persona.id === "rhetorician"
            ? "Frame the round around what the judge can trust: a persuasive story still needs a working link."
            : persona.id === "ethics-philosopher"
              ? "The ethical question is whether the policy respects fairness while solving the harm."
              : persona.id === "deca-judge"
                ? "Treat this like a performance indicator: name the stakeholder, the metric, and the risk."
                : persona.id === "hosa-judge"
                  ? "Safety, communication, and professional boundaries should guide the decision."
                  : "I will pressure the part of the case that matters most to the ballot.";

  return {
    response: `${sideLabel} speech ${input.round}. ${levelPressure[input.level]}

First, direct clash: they say "${studentClaim}", but ${strategy.direct}

Second, independent offense: ${strategy.independent} On this motion, ${personaLine}

Finally, weighing: ${strategy.weighing} Even if the other side wins a small benefit, the judge should prefer the side with clearer causation, lower risk, and a more defensible impact comparison.`,
    strategy: `${persona.name}: ${strategy.name}`,
    pressurePoints: [
      `Clarify the mechanism behind: ${input.topic}`,
      "Answer the opponent's strongest claim before adding new offense.",
      "Force comparison on magnitude, probability, timeframe, or reversibility."
    ],
    fallbackNotice: DEV_AI_FALLBACK_NOTICE
  };
}

function fallbackDebateJudge(input: {
  organization: Organization;
  eventType?: string;
  transcript: DebateTranscriptMessage[];
}): DebateJudgeResult {
  const eventType = input.eventType ?? "PARLIAMENTARY_DEBATE";
  const categories = fallbackCategories(input.organization, eventType);
  const affirmativeTurns = input.transcript.filter((message) => message.role === "AFFIRMATIVE").length;
  const negativeTurns = input.transcript.filter((message) => message.role === "NEGATIVE").length;
  const winner = affirmativeTurns >= negativeTurns ? "GOVERNMENT" : "OPPOSITION";

  return {
    overallScore: 76,
    categoryScores: categories,
    sharedSpeaking: fallbackSharedSpeaking(),
    speakerScores: [
      {
        speaker: "Government 1",
        team: "GOVERNMENT",
        score: 25,
        rank: 1,
        descriptor: "good",
        rationale: "Clear structure and usable offense, with room to sharpen weighing."
      },
      {
        speaker: "Opposition 1",
        team: "OPPOSITION",
        score: 24,
        rank: 2,
        descriptor: "good",
        rationale: "Direct responses and practical pressure, but needs deeper comparison."
      },
      {
        speaker: "Government 2",
        team: "GOVERNMENT",
        score: 23,
        rank: 3,
        descriptor: "competent",
        rationale: "Good signposting, though some claims need stronger examples."
      },
      {
        speaker: "Opposition 2",
        team: "OPPOSITION",
        score: 22,
        rank: 4,
        descriptor: "competent",
        rationale: "Understands the clash but should collapse to fewer decisive issues."
      }
    ],
    teamWinner: winner,
    losingSide: winner === "GOVERNMENT" ? "OPPOSITION" : "GOVERNMENT",
    shortReasonForDecision: "The winning side did more comparison on the central clash.",
    longReasonForDecision:
      "Local development judge: the winning side gave the judge a clearer path to the ballot by extending a usable impact, answering the main response, and explaining why that issue outweighed the opponent's best material.",
    reasonForDecision:
      "Local development judge: the winning side did the better job extending a clear impact and comparing it against the opponent's main answer.",
    sideFeedback: {
      government: {
        didWell: ["Presented a readable case structure", "Connected at least one argument to a ballot impact"],
        missed: ["Needed tighter weighing in the final speech", "Could make definitions and contention labels more explicit"]
      },
      opposition: {
        didWell: ["Put pressure on feasibility and opportunity cost", "Created direct clash against the main proposal"],
        missed: ["Needed more organized refutation", "Could collapse to fewer decisive voters"]
      }
    },
    keyClash: "Whether the proposal's long-term preparation benefit outweighs feasibility and opportunity-cost concerns.",
    strongestArgument: "The strongest argument was the side that connected its main claim to a concrete, judge-relevant impact.",
    weakestArgument: "The weakest argument was the least developed response, where the speaker asserted a problem without enough warrant or comparison.",
    strengths: ["Clear baseline structure", "Some direct clash", "Usable examples for the level"],
    weaknesses: ["Needs more explicit weighing", "Evidence should be tied to the claim earlier", "Final turns should collapse to fewer voters"],
    improvementAdvice: [
      "Name the main voting issue before giving supporting details.",
      "Compare your impact against the opponent's best impact.",
      "Use signposting before each rebuttal answer."
    ],
    recommendedLessons: fallbackLessons(input.organization, eventType),
    readinessForNextLevel: {
      ready: false,
      rationale: "This is a solid local practice result, but the student should show stronger weighing across multiple rounds before moving up.",
      nextMilestone: "Complete one more judged round with explicit voters and impact comparison."
    },
    fallbackNotice: DEV_AI_FALLBACK_NOTICE
  };
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
    `You are a realistic debate sparring partner. Match the student's level, keep arguments educational, and never invent citations as real sources. Persona: ${persona.name}. ${persona.promptInstructions}`,
    `Topic: ${input.topic}
Organization: ${input.organization}
Event type: ${input.eventType ?? "default"}
Practice mode: ${input.practiceMode ?? "DEBATE"}
Level: ${input.level}
Opponent side: ${input.side}
Round: ${input.round}
Persona JSON: ${JSON.stringify(persona)}
Transcript JSON: ${JSON.stringify(input.transcript)}

Return JSON with response, strategy, and pressurePoints.`,
    () => fallbackOpponent({ ...input, personaId: input.personaId ?? undefined })
  );
}

export async function judgeDebate(input: {
  organization: Organization;
  level: Level;
  eventType?: string;
  topic: string;
  transcript: DebateTranscriptMessage[];
}) {
  const eventType = input.eventType ?? "PARLIAMENTARY_DEBATE";
  const rubric = rubricFor(input.organization, eventType);

  return jsonCompletion<DebateJudgeResult>(
    `You are a fair educational parliamentary debate judge. ${originalRubricInstruction()} Return JSON only.`,
    `Judge this ${input.level} ${input.organization} ${eventType} round.
Topic: ${input.topic}
Transcript JSON: ${JSON.stringify(input.transcript)}
Rubric JSON: ${JSON.stringify(rubric)}
Shared speaking skills to score from 0-100: ${SHARED_SPEAKING_SKILLS.join(", ")}.

Speaker points must use the 19-30 range:
19 poor; 20-21 developing; 22-23 competent; 24-26 good; 27-28 excellent; 29 outstanding; 30 exceptional.
Create four speaker slots if names are absent: Government 1, Government 2, Opposition 1, Opposition 2.
Assign ranks 1-4 with no ties.

Return JSON with overallScore, categoryScores, sharedSpeaking, speakerScores, teamWinner, losingSide, shortReasonForDecision, longReasonForDecision, reasonForDecision, sideFeedback, keyClash, strongestArgument, weakestArgument, strengths, weaknesses, improvementAdvice, recommendedLessons, and readinessForNextLevel.
sideFeedback must contain government.didWell, government.missed, opposition.didWell, and opposition.missed arrays.`,
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
