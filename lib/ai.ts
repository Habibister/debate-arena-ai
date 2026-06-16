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
    centralClash?: string;
    realArgumentQuality?: string;
    emptyPhraseWarning: string | null;
    droppedArguments?: string;
    motionConnection: string;
    mechanismCheck: string;
    weighingCheck?: string;
    betterVersion: string;
    fairWinnerLogic: string;
    practiceSkill?: string;
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
  "Fallback AI is active. Opponent quality is limited until OPENAI_API_KEY is configured.";

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

const STUDENT_HEDGE_PREFIXES = [
  "i am not exactly sure what the opposition is referring to",
  "i am not exactly sure what the opposition is refering to",
  "i am not exactly sure",
  "i'm not exactly sure",
  "i am not entirely sure",
  "i am not sure",
  "i'm not sure",
  "i still stand on my points",
  "i still stand on my point",
  "what i'm trying to say is",
  "what i am trying to say is",
  "i guess what i'm saying is",
  "to be honest",
  "honestly",
  "i think that",
  "i think",
  "i believe that",
  "i believe",
  "i guess",
  "i mean",
  "basically",
  "well",
  "um",
  "uh",
  "like"
];

// Pull out the student's actual point and tidy it so it can be acknowledged cleanly: pick the most
// substantive clause, strip rambling hedges, and fix casing without breaking acronyms like "AI".
function extractStudentPoint(transcript: DebateTranscriptMessage[], studentRole: MessageRole) {
  const latestStudentSpeech = [...transcript].reverse().find((message) => message.role === studentRole)?.content ?? "";

  const clauses = latestStudentSpeech
    .split(/(?<=[.!?])\s+|\b(?:however|but|although|though)\b/i)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 20);

  if (clauses.length === 0) {
    return null;
  }

  let best = clauses.reduce((longest, clause) => (clause.length > longest.length ? clause : longest));

  let lower = best.toLowerCase();
  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const hedge of STUDENT_HEDGE_PREFIXES) {
      if (lower.startsWith(hedge)) {
        best = best.slice(hedge.length).replace(/^[\s,.;:]+/, "");
        lower = best.toLowerCase();
        stripped = true;
      }
    }
  }

  best = best.replace(/[.!?]+$/, "").trim();

  if (best.length < 8) {
    return null;
  }

  if (best.length > 180) {
    best = best.slice(0, 180).replace(/\s+\S*$/, "");
  }

  // Lowercase the first letter for mid-sentence embedding, but leave acronyms ("AI", "UN") intact.
  return /^[A-Z][a-z]/.test(best) ? best.charAt(0).toLowerCase() + best.slice(1) : best;
}

// Each persona argues like a distinct, thoughtful human: acknowledge the real point, expose the
// hidden assumption, attack the weakest link, offer a countermodel, and explain why it is stronger.
// No speech labels, no "First/Second/Finally", no empty ballot vocabulary, no template tics.
function buildPersonaArgument(personaId: string, claim: string, motion: string) {
  const builders: Record<string, () => { response: string; move: string }> = {
    "evidence-specialist": () => ({
      move: "asking for proof before accepting the claim",
      response: `You're claiming ${claim}, and that might turn out to be true — but right now it's asserted, not shown. What's the actual evidence that ${motion} produces the result you're promising, rather than just sounding like it should? Before backing a change this big, I'd want real cases where it worked and didn't just add another layer that looks good on paper. Without that, the safer claim is the modest one: this can help some people, some of the time, when it's done carefully — not that we should build the whole system around it. A smaller, testable version would let us check whether the benefit is real before committing everyone to it.`
    }),
    "devils-advocate": () => ({
      move: "attacking the hidden assumption",
      response: `I get why ${claim} feels persuasive — there's a real concern underneath it. But your argument leans on an assumption you haven't proven: that because the problem is real, ${motion} must be the answer. Those are two different claims. We don't adopt a sweeping policy every time something is imperfect; the burden is to show this specific change is worth what it costs and that a narrower fix wouldn't do the same job. A more targeted version — addressing the exact harm you named without overhauling everything — would likely capture most of the benefit with far less downside. Until you show why only the full change works, the more measured option is winning this.`
    }),
    "policy-analyst": () => ({
      move: "weighing tradeoffs and implementation",
      response: `I'll take ${claim} seriously, because the concern is legitimate. The problem is what happens when this becomes a real policy. ${capitalize(motion)} sounds clean in the abstract, but you have to ask who carries it out, what gets pushed aside to make room, and how you stop it from turning into a box-ticking exercise. A narrower, opt-in version targets the same harm without those tradeoffs — it reaches the people who actually need it and leaves the rest of the system intact. So the honest comparison isn't this policy versus nothing; it's a broad change versus a precise one that costs far less and is much harder to get wrong. On that comparison, the targeted fix wins.`
    }),
    "socratic-questioner": () => ({
      move: "asking questions that expose the gap",
      response: `Before I accept ${claim}, I want to pin down what we're actually solving. What exactly is causing the harm here — the thing itself, or the way it gets used? And if it's the way it's used, why does fixing that require ${motion} rather than changing how the existing system works? Which specific people benefit, and which ones lose something they were relying on? I ask because the answer changes everything: if the real problem is narrow, then a narrow fix is the honest response, and the sweeping version does more than the problem justifies. Convince me the full change is necessary — not just that the concern is real.`
    }),
    "ethics-philosopher": () => ({
      move: "showing fairness cuts both ways",
      response: `I take the fairness concern in ${claim} seriously — it deserves a real answer, not a dismissal. But fairness has two sides here. ${capitalize(motion)} protects the people you're worried about, and in the same move it can take something away from others who were depending on the current system. A principle that helps one group by quietly harming another isn't actually fair; it just moves the unfairness somewhere less visible. The fairer path is the narrower one: address the specific harm you've identified without creating a new set of people who lose out. That respects everyone's claim, not only the group whose problem is loudest right now.`
    }),
    "rhetorician": () => ({
      move: "reframing the real choice",
      response: `I understand why ${claim} resonates — it's the kind of argument that sounds right the moment you hear it. But step back and look at the real choice in front of us. This was never a clean question of fixing a problem or ignoring it. It's a question of how much to change, and how carefully. ${capitalize(motion)} is the maximal option, and the maximal option always feels bold — but bold and wise aren't the same thing. When a smaller, sharper fix reaches the same goal without the collateral damage, the sweeping version isn't the brave choice; it's the careless one. The side that solves the problem with the least breakage should come out ahead, and that isn't yours.`
    }),
    "tournament-judge": () => ({
      move: "testing the connection from problem to policy",
      response: `Let's be precise about what you actually have to prove. ${capitalize(claim)} establishes the problem, and I'll accept the problem is real. What's missing is the connection from there to ${motion}. You need to show the full policy is what fixes the harm, and that a narrower option wouldn't do the same work — otherwise the comparison runs against you. Think of it as impact against impact: your benefit only lands if the sweeping change is genuinely necessary, while the cost of overreach is paid by everyone, every day. A targeted fix is more likely to deliver and far less likely to backfire. Close that gap and you're ahead; until then, you're not.`
    }),
    "deca-judge": () => ({
      move: "making the cost-benefit decision",
      response: `Practically speaking, ${claim} points at a real cost, and I won't wave it away. But make the decision the way you'd make any resource call. ${capitalize(motion)} is the expensive, broad option: it commits time, money, and attention across the board. A targeted alternative goes after the same problem at a fraction of that cost and reaches the people who actually need it. If a cheaper, narrower move captures most of the upside, that's the smarter investment. So the real question isn't whether your concern matters — it's whether the sweeping fix returns enough extra benefit to justify its extra cost. I don't think it does.`
    }),
    "hosa-judge": () => ({
      move: "favoring the more measured intervention",
      response: `I hear the worry behind ${claim}, and it's worth taking seriously. But the more responsible move is the measured one. ${capitalize(motion)} changes everything at once, and broad changes carry side effects you can't fully predict in advance. A narrower response treats the specific harm you've named while protecting the parts of the system that were already working. When you're not certain of the downstream effects, you protect what works first and expand only once you've seen results. That's why a careful, targeted fix beats the sweeping one here — the same goal, with far less risk of doing harm while trying to help.`
    }),
    "starter-coach": () => ({
      move: "coaching toward a stronger version of the argument",
      response: `Your claim is solid, and you're right to lead with it — ${claim} is the kind of point that can win a round. But the warrant underneath it is thin, and I'm going to push on it. You're assuming ${motion} is the way to deliver that benefit without explaining how it actually produces better outcomes than the alternatives. Walk me through the mechanism: what specifically changes for people, step by step? And answer the obvious response — that a smaller, more targeted version gets you most of the way there. If you can show the full change clearly beats the narrow one, you've got me. Right now that connection is missing.`
    }),
    "friendly-practice": () => ({
      move: "answering directly and offering a cleaner alternative",
      response: `That's a fair point — ${claim} is worth taking seriously, so let me actually engage it instead of brushing it off. Here's where I'd push: you've gone straight from the problem to ${motion} as if it's the only option on the table. It isn't. If the harm you're describing is really about one specific part, a narrower change fixes that part without turning everything upside down. I'd back that version, because it solves the same problem with a lot less that can go wrong. So before we commit to the big change, what's the reason a smaller, more focused fix wouldn't do the job?`
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
    `You are a sharp, human-sounding debate opponent arguing the ${input.side} side in a student training app. Your job is not to sound formal — your job is to make the student better.

For every response:
1. Understand the student's actual argument.
2. Briefly acknowledge the strongest part.
3. Identify the hidden assumption.
4. Attack the weakest link — claim, warrant, mechanism, evidence, impact, or weighing.
5. Offer a better alternative or countermodel if useful.
6. Explain why your side is stronger.
7. Sound natural, like a smart person debating — not like a template.

NEVER write any of these (they make you sound robotic and fake):
- "Negative speech 2", "Affirmative speech 1", or any "<side> speech <number>"
- "First, direct clash", "Second, independent offense", "Finally, weighing", or First/Second/Finally as section labels
- "Take your best point", "I'll grant it" / "I'll even grant it", "The trouble is the link", "That's the step I need you to win"
- "direct clash", "independent offense", "the key is direct clash", "I answer the warrant then compare impacts"
- "Judge should prefer us", "This is my ballot story", or any empty ballot line. You may only claim you are ahead once you have explained, concretely, WHY.

Use normal, persuasive language in flowing paragraphs, specific to THIS motion and to what the student actually said. Target voice, for example: "I get why your point sounds appealing. If students are going to use AI anyway, schools should probably teach them to use it responsibly. But your argument assumes the best way to do that is a separate school requirement. That isn't obvious. A better approach is to teach AI use inside English, science, and research work, where students actually need to evaluate sources and check whether AI is wrong."

Never invent citations as real sources. Argue in this persona's voice: ${persona.name}. ${persona.promptInstructions}`,
    `Motion: ${input.topic}
Organization: ${input.organization}
Event type: ${input.eventType ?? "default"}
Practice mode: ${input.practiceMode ?? "DEBATE"}
Level: ${input.level}
You are arguing: ${input.side}
Round: ${input.round}
Persona voice: ${persona.name} — ${persona.style}. ${persona.promptInstructions}
Transcript so far (JSON): ${JSON.stringify(input.transcript)}

Respond to the student's most recent point using the reasoning flow above. Sound like a real, specific, persuasive human — not a template.
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

CRITICAL — do not reward debate-sounding filler. Phrases like "judge should prefer us", "clearer causation", "lower risk", "impact comparison", "stronger impact", "we outweigh", "direct clash", "independent offense", "ballot", "voter", "solvency", "turn", "link", "no link", "magnitude", "probability", "timeframe", and even "weighing" itself are NOT arguments by themselves. They earn ZERO credit unless the speaker also actually:
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
- Score Government/Affirmative and Opposition/Negative separately on these dimensions: (1) claim quality — clear, testable, topic-specific; (2) warrant quality — why the claim is true; (3) mechanism quality — how the harm/benefit actually happens; (4) impact quality — why it matters; (5) refutation quality — does it answer the opponent's actual claim; (6) evidence/example quality — concrete support or reasoning; (7) weighing quality — real comparison via magnitude, probability, timeframe, scope, reversibility, or prerequisites (NOT just the word "weighing"); (8) collapse/strategy — focuses on the most important issue; (9) motion connection — actually connects to the motion; (10) empty-jargon penalty — used debate words without proving anything.
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
- centralClash: what the debate was really about — the one disagreement that decided it.
- realArgumentQuality: which side proved a real, topic-specific argument (claim + warrant + impact), not just which side sounded like a debater.
- emptyPhraseWarning: if either side leaned on weighing words or generic ballot phrases without proving the claim, name the side and the exact phrase and say it was not backed by a real argument (for example: "Opposition used weighing language like 'clearer causation' but never explained what causes what or how it applies to the motion."). Use null only if neither side did this.
- droppedArguments: name the important argument the student failed to answer (unanswered arguments count as conceded).
- motionConnection: judge how well the student's argument actually connected to the specific motion, and say what was weak if it did not.
- mechanismCheck: state the cause-and-effect the student needed to prove and whether they proved it.
- weighingCheck: state whether the student compared impacts with real substance (magnitude, probability, timeframe, scope, reversibility) or only used weighing vocabulary.
- betterVersion: rewrite the student's weakest line into a real argument with claim, warrant, motion connection, and impact.
- fairWinnerLogic: explain that the winner was chosen on real argument quality, not debate vocabulary, referencing the actual transcript.
- practiceSkill: name the single real skill the student should drill next (claim-warrant-impact, rebuttal, weighing/impact calculus, flowing, evidence comparison, mechanism analysis, or collapse).`,
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
