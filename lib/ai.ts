import type { Level, MessageRole, Organization, PracticeMode } from "@prisma/client";
import { OpenAIUnavailableError } from "@/lib/openai";
import {
  AllProvidersUnavailableError,
  extractJson,
  getProviderOrder,
  providerBanner,
  providerLabel,
  runProviderCompletion,
  type ProviderName
} from "@/lib/ai-providers";
import { getAiPersona } from "@/lib/ai-personas";
import { buildTranscriptBasedDebateJudge } from "@/lib/debate-judge-analysis";
import { findSpecForEvent, getSpecRubricBreakdown } from "@/lib/competition-specs";
import { pickFallbackDebateTopic } from "@/lib/debate-topics";
import { getRubricSeed, SHARED_SPEAKING_SKILLS, type RubricCategorySeed } from "@/lib/rubrics";
import { buildFallbackPracticeQuestions } from "@/lib/test-question-bank";
import { assessStudentSpeech, OPPONENT_COACHING_RESPONSE } from "@/lib/speech-quality";

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
  aiNotice?: string;
  aiProvider?: ProviderName;
};

type DebateJudgeResult = {
  rubricSource?: RubricSourceTag;
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
    whyWinnerWon?: string;
    whyLoserLost?: string;
  };
  roundDecidingClash?: {
    governmentBestArgument: string;
    oppositionBestAnswer: string;
    whyItDecides: string;
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
  aiNotice?: string;
  aiProvider?: ProviderName;
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


// --- Competition Specification Registry integration -----------------------------------------
// Judges reference the registry's rubric categories when an active spec covers the event, and
// tag output with the spec attribution so students see WHICH season's guidelines scored them.
export type RubricSourceTag = {
  specId: string;
  eventName: string;
  season: string;
  verificationStatus: string;
  source: "registry";
  categories: string[];
};

async function registryRubricForJudge(
  organization: Organization,
  eventType?: string
): Promise<{ tag: RubricSourceTag; promptBlock: string } | null> {
  try {
    const spec = await findSpecForEvent(organization, eventType);
    if (!spec) return null;
    const breakdown = await getSpecRubricBreakdown(spec);
    if (breakdown.categories.length === 0) return null;
    const names = breakdown.categories.map((category) => category.name);
    const promptBlock = `Official rubric categories from the ${spec.eventName} ${spec.season} specification (${spec.verificationStatus}): ${names.join(
      "; "
    )}.
Tag EVERY item in strengths, weaknesses, and improvementAdvice with the single most relevant category above, prefixing the item text with "[<category name>] ". Use the category names EXACTLY as written.`;
    return {
      tag: {
        specId: spec.id,
        eventName: spec.eventName,
        season: spec.season,
        verificationStatus: spec.verificationStatus,
        source: "registry",
        categories: names
      },
      promptBlock
    };
  } catch {
    return null;
  }
}

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
  rubricSource?: RubricSourceTag;
  // Present only when an objection round was judged: prepared pitch vs. unscripted Q&A (0-100 each).
  presentationScore?: number;
  questioningScore?: number;
};

const DEV_AI_FALLBACK_NOTICE = "AI is temporarily unavailable, so we used a backup response.";

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

function hasFallback<T>(fallback?: () => T): fallback is () => T {
  // The deterministic local fallback is the last resort in EVERY environment (including production on
  // Vercel). AI must never hard-fail the UI just because a provider errors or no key is configured.
  return Boolean(fallback);
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

type DebateStance = "support" | "oppose";
type StrengthTier = "beginner" | "jv" | "tournament" | "elite";

// Strength tier scales the opponent's depth. Driven mainly by the debate level, nudged by how strong
// the chosen bot (persona rating) is. More layers = more depth, more weighing, harsher pushback.
const TIER_LAYER_COUNT: Record<StrengthTier, number> = { beginner: 2, jv: 3, tournament: 5, elite: 6 };
const TIER_ORDER: StrengthTier[] = ["beginner", "jv", "tournament", "elite"];

function strengthTier(level: Level, personaRating: number): StrengthTier {
  let index = level === "BEGINNER" ? 0 : level === "ELITE" ? 3 : 1;
  if (personaRating >= 1500) {
    index += 1;
  } else if (personaRating < 800) {
    index -= 1;
  }
  return TIER_ORDER[Math.max(0, Math.min(TIER_ORDER.length - 1, index))];
}

// Each persona contributes ordered layers (most essential first). A beginner bot uses the first two;
// an elite bot uses all six and so adds a steelman, a countermodel, explicit weighing, and a close.
// The SHAPE differs by persona: Socratic = questions, Evidence = proof demands, Devil's = assumption
// attacks, Policy = implementation, Tournament = ballot framing, Rhetorician = framing, Friendly = gentle.
const PERSONA_MOVE: Record<string, { support: string; oppose: string }> = {
  "friendly-practice": { support: "backing the motion supportively", oppose: "pointing out one gentle improvement" },
  "socratic-questioner": { support: "leading to yes with questions", oppose: "exposing the gap with questions" },
  "devils-advocate": { support: "beating the strongest objection", oppose: "attacking the hidden assumption hard" },
  "evidence-specialist": { support: "defending with concrete proof", oppose: "demanding evidence and examples" },
  "policy-analyst": { support: "defending on implementation", oppose: "stress-testing implementation and tradeoffs" },
  "tournament-judge": { support: "winning the ballot on substance", oppose: "framing the ballot path" },
  "rhetorician": { support: "winning the framing", oppose: "reframing the real choice" },
  "starter-coach": { support: "modelling a clean case", oppose: "coaching toward a stronger argument" },
  "ethics-philosopher": { support: "defending on principle", oppose: "showing fairness cuts both ways" },
  "deca-judge": { support: "defending as a sound decision", oppose: "making the cost-benefit call" },
  "hosa-judge": { support: "defending the measured policy", oppose: "favoring the measured intervention" }
};

// Style directives the LIVE model uses so each persona debates in a genuinely different shape.
const PERSONA_STYLE: Record<string, string> = {
  "friendly-practice":
    "Supportive and encouraging. Explain the weakness gently and give ONE clear improvement. Do not be aggressive.",
  "socratic-questioner":
    "Lead with QUESTIONS. Ask sharp questions that expose the gap (which policy exactly? what causes the harm? why this over the cheaper alternative?) instead of delivering a full countercase.",
  "devils-advocate":
    "Aggressive assumption attacks. Name the hidden assumption and push the hardest possible counterargument. Sound sharper than the other bots.",
  "evidence-specialist":
    "Demand proof. Ask for studies, data, examples, or concrete evidence. Do not argue philosophy — argue what the evidence actually shows.",
  "policy-analyst":
    "Talk like a policy designer: the exact mechanism (tax, subsidy, regulation, rule change), enforcement, costs, incentives, and unintended consequences.",
  "tournament-judge":
    "Ballot-focused: say which side is currently winning and why, and what each side must do to win. Use debate terms only when tied to real substance.",
  "rhetorician":
    "Framing and persuasion: reframe what the round is really about and use vivid, plain, emotionally resonant language to make the point land.",
  "starter-coach":
    "Teach while you push back: name the weakness plainly and model a stronger version of the student's line.",
  "ethics-philosopher":
    "Argue from duties, rights, fairness, and moral consistency — but stay concrete, never vague moral fog.",
  "deca-judge": "Decide it like a business case: name the stakeholder, the cost, the return, and the cheaper targeted option.",
  "hosa-judge":
    "Favor the measured, safer intervention; weigh certain everyday benefits against unpredictable side effects."
};

// Difficulty/strength directives: depth and length scale with the bot's tier.
const DIFFICULTY_DIRECTIVE: Record<StrengthTier, string> = {
  beginner: "BEGINNER strength: keep it short and simple — about 70-100 words, raise ONE weakness only, no layering.",
  jv: "JV strength: about 100-140 words — one clear counterargument plus one comparison or alternative.",
  tournament:
    "TOURNAMENT-STRONG strength: about 140-190 words — direct refutation, a countermodel, and an explicit impact comparison.",
  elite:
    "ELITE strength: about 180-240 words — steelman the student, name the hidden assumption, give a countermodel, weigh the impacts, and point out a dropped argument."
};

function opposeLayers(personaId: string, claim: string, motion: string): string[] {
  const layers: Record<string, string[]> = {
    "friendly-practice": [
      `You've got a real instinct here with ${claim}, and you're right to lead with it.`,
      `The one piece I'd gently push on is the mechanism — how exactly does ${motion} produce the result you want, step by step?`,
      `Name that clearly — who does what, and why it works — and your point gets much harder to answer.`,
      `A cleaner version might target the specific harm rather than the whole system, so you keep the benefit with less to defend.`,
      `Set side by side, the narrower fix asks you to prove less, which usually makes it the easier case to win.`,
      `So there's no need to overhaul your argument — just fill in that "how," and you're in good shape.`
    ],
    "socratic-questioner": [
      `Before I answer ${claim}, let me ask you a few things.`,
      `What exactly are you defending — which specific policy, and applied to whom?`,
      `And what's really causing the harm: the thing itself, or the way it gets used?`,
      `If it's the way it's used, why does that require ${motion} rather than changing how the current system works?`,
      `Who gains here, and who quietly loses something they were relying on?`,
      `Answer those and we'll see whether the full change is truly necessary — right now, I don't think you've shown it is.`
    ],
    "devils-advocate": [
      `Let's not be polite about this — ${claim} rests on an assumption you haven't earned.`,
      `You're treating "there's a problem" as if it automatically means "${motion}." Those are two completely different claims.`,
      `That's the weak link: plenty of real problems don't justify a sweeping fix, and you haven't shown why this one does.`,
      `And if the milder approach already failed, why would a broad mandate avoid the same failure instead of breeding resentment or workarounds?`,
      `Weigh it honestly — your upside is speculative, while the cost of overreach lands on everyone, immediately.`,
      `Until you prove the full change is the only thing that works, the assumption collapses, and the whole case goes with it.`
    ],
    "evidence-specialist": [
      `Let's set the philosophy aside — ${claim} needs proof, not a good story.`,
      `What's the actual evidence that ${motion} delivers the result you're promising: a study, a real case, a number?`,
      `Because without it, the honest version is far weaker — this might help some people, sometimes.`,
      `Show me somewhere that tried this and got the outcome, and that it beat cheaper options like labeling or subsidies.`,
      `On the evidence we actually have, the smaller, testable version is the safer bet.`,
      `Bring data that your specific policy outperforms the alternatives and I'll move — until then it's unproven.`
    ],
    "policy-analyst": [
      `Let's treat ${claim} like a real policy memo, because that's where it lives or dies.`,
      `What's the actual mechanism — a tax, a subsidy, a regulation, a rule change? Each carries different costs and failure modes.`,
      `Who enforces it, what gets cut to pay for it, and how do you stop it becoming a box-ticking exercise?`,
      `A narrower, opt-in design hits the same harm with far less enforcement burden and fewer unintended consequences.`,
      `So the real comparison is broad-and-costly versus targeted-and-cheaper, and on net the targeted option usually wins.`,
      `Give me implementation details that survive contact with reality, or ${motion} stays a slogan, not a policy.`
    ],
    "tournament-judge": [
      `Let me tell you how this round is actually flowing right now.`,
      `Your instinct is strong, but the ballot turns on the link from "${claim}" to "${motion}," and that link isn't proven yet.`,
      `The other bench is ahead because a narrower countermodel does the same work with less risk.`,
      `To win this you'd need to collapse on why only the full change solves, and why the cheaper alternative fails.`,
      `Weigh it as impact against impact: your benefit only lands if the sweep is necessary, while the cost is paid daily by everyone.`,
      `Close that gap and the ballot flips to you — leave it open and the more careful side takes the round.`
    ],
    "rhetorician": [
      `Step back from the mechanics and look at the story you're telling with ${claim}.`,
      `Right now it lands as "control," and that's a losing frame — people resist being managed.`,
      `Reframe the choice: this was never problem-versus-nothing, it's a sweeping change versus a precise one.`,
      `The precise fix sounds like respect — solve the harm without treating everyone as the problem.`,
      `When a smaller move reaches the same goal without the collateral damage, the bold option looks reckless, not brave.`,
      `Win that framing — least breakage, most respect — and you win the room; ${motion} doesn't.`
    ],
    "starter-coach": [
      `Good start with ${claim} — let me coach you through where it's thin.`,
      `You've got a claim, but the warrant is doing quiet work; say out loud HOW it produces the result.`,
      `Then answer the obvious response — that a smaller, targeted change gets most of the benefit.`,
      `Try this model line: "the broad policy is worth it because it does X, and the narrow fix fails because of Y."`,
      `Fill that in with something concrete and you're comparing real impacts, which is what wins rounds.`,
      `Right now the only missing piece is that "how" — nail it and this becomes a genuinely strong case.`
    ],
    "ethics-philosopher": [
      `Take the fairness concern in ${claim} seriously — it deserves a real answer, not a dismissal.`,
      `But fairness cuts both ways: ${motion} helps one group while quietly taking something from another.`,
      `A principle that fixes one unfairness by creating a new one isn't fair — it just hides the cost.`,
      `The more defensible path is the narrower one: address the specific harm without making a new group lose out.`,
      `Weigh the duties honestly and the targeted fix respects everyone's claim, not only the loudest.`,
      `So on principle, not just practicality, the sweeping version is the harder one to justify.`
    ],
    "deca-judge": [
      `Practically, ${claim} points at a real cost, and I won't wave it away.`,
      `But make the call like any resource decision: ${motion} is the broad, expensive option across the board.`,
      `A targeted alternative goes after the same problem at a fraction of the cost and reaches who actually needs it.`,
      `If a cheaper, narrower move captures most of the upside, that's simply the smarter investment.`,
      `So weigh return on cost: the sweep has to deliver a lot of extra benefit to justify its extra price.`,
      `I don't see that return here, which is why the targeted option is the better decision.`
    ],
    "hosa-judge": [
      `I hear the worry behind ${claim}, and it's worth taking seriously.`,
      `But the more responsible move is the measured one — ${motion} changes everything at once.`,
      `Broad changes carry side effects you can't fully predict, so caution should come first.`,
      `A narrower response treats the specific harm while protecting the parts already working.`,
      `Weigh certain, everyday benefits against unpredictable downside, and the careful fix wins.`,
      `Protect what works, expand only once you've seen results — that's why the targeted version is safer here.`
    ]
  };
  return layers[personaId] ?? layers["devils-advocate"];
}

function supportLayers(personaId: string, objection: string, motion: string): string[] {
  const layers: Record<string, string[]> = {
    "friendly-practice": [
      `I'm glad to defend ${motion} — and the case is more solid than it first looks.`,
      `The benefit is concrete: clearer expectations and fewer daily distractions, so more time goes to learning.`,
      `The fair worry is ${objection}, and it deserves a straight answer, not a dodge.`,
      `Write the rule narrowly — clear standards, equal enforcement — and that worry mostly disappears.`,
      `Set against doing nothing, you keep a real, everyday benefit at a cost you can actually control.`,
      `So the friendly version of my case is simple: good idea, done carefully, worth backing.`
    ],
    "socratic-questioner": [
      `Let me defend ${motion} by starting with the question that decides it.`,
      `Does this do more good than harm when it's implemented well? I think it clearly does.`,
      `What's the real worry — ${objection}? And is that a flaw in the idea, or only in a sloppy version of it?`,
      `If careful drafting removes the worry, what's left except the benefit?`,
      `Weigh it: concrete everyday gains against a risk we can design out — which should win?`,
      `Answer honestly and you land on yes, which is exactly where I am.`
    ],
    "devils-advocate": [
      `I'll defend ${motion} by taking its strongest objection head on: ${objection}.`,
      `That's the best shot against it — and it still misses.`,
      `Nothing about this requires it to be unfair or heavy-handed; that's bad implementation, not the idea.`,
      `Written with clear rules and equal enforcement, it delivers the benefit and removes the very thing critics fear.`,
      `Weigh it: a real, recurring benefit against a risk that only appears if you do it badly.`,
      `If the only case against it is "it could be botched," then do it well — and the motion stands.`
    ],
    "evidence-specialist": [
      `I'll defend ${motion} with concrete benefits, not slogans.`,
      `The gains are specific: clearer expectations, fewer conflicts, more time on task.`,
      `When people ask for proof, point to places that adopted this and saw exactly those results.`,
      `The fair objection is ${objection} — answered by narrow drafting and equal enforcement.`,
      `On the evidence, a well-run version delivers the benefit while keeping the risk small and measurable.`,
      `Real, observable gains at a manageable cost is why this should happen.`
    ],
    "policy-analyst": [
      `Let me defend ${motion} on the implementation, because that's where it's won.`,
      `It works when it's done well: simple published rules, consistent enforcement, a clear exceptions process.`,
      `Yes, ${objection} is a real risk — but that's a design problem, not a reason to do nothing.`,
      `Build it to avoid that and you get the structure a school needs without the overreach.`,
      `Weigh steady, contained benefit against a downside you've engineered out — the policy comes out ahead.`,
      `Done right, the upside is reliable and the cost is controlled, which is why I'd implement it.`
    ],
    "tournament-judge": [
      `Here's why ${motion} is winning this round on the substance.`,
      `The case rests on real, recurring benefits — clearer expectations, fewer distractions, a steadier room.`,
      `The best response against me is ${objection}, and it only bites if the policy is written carelessly.`,
      `Written narrowly, with equal enforcement, that objection falls away.`,
      `Weigh it as impact against impact: everyday benefit versus a risk we can design out.`,
      `On that comparison the ballot comes down for the motion.`
    ],
    "rhetorician": [
      `Let me make the case for ${motion}, and notice the framing.`,
      `This isn't control — it's a clear, shared standard that keeps the focus on learning.`,
      `The objection you'll hear is ${objection}, but that argues for writing the rule well, not refusing to.`,
      `Framed right, it's not banning anything — it's making the better choice the easier one.`,
      `Against leaving everyone to sort it out alone, structure wins without heavy-handedness.`,
      `Win that frame and the motion is the obvious, humane choice.`
    ],
    "starter-coach": [
      `Let me defend ${motion} and model how to build it cleanly.`,
      `Lead with the benefit: clearer expectations and fewer distractions, so more time goes to learning.`,
      `Then pre-empt the obvious objection — ${objection} — instead of dodging it.`,
      `The fix is a narrow rule: clear standards, equal enforcement, real exceptions.`,
      `Notice the move — claim, reason, then answer the strongest pushback; that's a complete case.`,
      `That structure is why the motion holds up under pressure.`
    ],
    "ethics-philosopher": [
      `I'll defend ${motion} on principle, not just practicality.`,
      `A school owes every student a fair, focused environment, and clear standards serve that duty.`,
      `The honest objection is ${objection}, and fairness does cut both ways.`,
      `That's exactly why the rule must be narrow and enforced equally, with no targeting.`,
      `Weighed as duties, it protects students rather than controlling them.`,
      `The principled position isn't to avoid the policy; it's to implement it fairly.`
    ],
    "deca-judge": [
      `From a practical standpoint, ${motion} is the right call.`,
      `The benefits are tangible — clearer expectations, fewer conflicts, time kept on learning — and they recur daily.`,
      `The cost critics raise is ${objection}; treat it as a risk to manage, not a dealbreaker.`,
      `Clear rules, equal enforcement, and a simple exceptions process keep that cost low.`,
      `Weigh return on cost: steady benefit at a controllable price is a good investment.`,
      `That's why I'd implement it rather than leave things as they are.`
    ],
    "hosa-judge": [
      `I'll defend ${motion} as the more responsible policy.`,
      `A predictable, well-run environment protects students and keeps the focus where it belongs.`,
      `The worry worth taking seriously is ${objection}.`,
      `The answer is careful implementation — clear standards, equal enforcement, real exceptions — not walking away.`,
      `Weigh steady protection against a risk we can manage, and the measured policy wins.`,
      `Protecting a safe, steady environment comes first, and this is how you deliver it.`
    ]
  };
  return layers[personaId] ?? layers["policy-analyst"];
}

// SIDE FIDELITY + DIFFICULTY: assemble a persona-distinct speech and scale its depth to the tier.
// Government/Affirmative supports the motion; Opposition/Negative opposes it.
function buildPersonaArgument(personaId: string, claim: string | null, motion: string, stance: DebateStance, tier: StrengthTier) {
  const layers =
    stance === "support"
      ? supportLayers(personaId, claim ?? "that the rule will be unfair or go too far", motion)
      : opposeLayers(personaId, claim ?? "there's a real problem worth solving here", motion);
  const response = layers.slice(0, TIER_LAYER_COUNT[tier]).join(" ");
  const move = PERSONA_MOVE[personaId]?.[stance] ?? (stance === "support" ? "defending the motion" : "pressing the weak link");
  return { response, move };
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
  // Government/Affirmative defends the motion; Opposition/Negative argues against it.
  const stance: DebateStance = isAffirmative ? "support" : "oppose";
  const studentRole: MessageRole = isAffirmative ? "NEGATIVE" : "AFFIRMATIVE";
  const motion = cleanMotion(input.topic);
  const studentPoint = extractStudentPoint(input.transcript, studentRole);
  // The bot's strength (persona rating) plus the debate level set how deep/long the speech goes.
  const tier = strengthTier(input.level, persona.rating);
  const { response, move } = buildPersonaArgument(persona.id, studentPoint, motion, stance, tier);
  const pressurePoints =
    stance === "support"
      ? [
          "Answer the strongest objection to the motion directly, not in the abstract.",
          `Show how ${motion} is implemented fairly: clear rules and equal enforcement.`,
          "Tie the policy to a concrete, everyday benefit for students."
        ]
      : [
          "Name the exact harm and explain what actually causes it.",
          `Show why ${motion} solves better than a narrower, more targeted fix.`,
          "Connect the claim to a concrete impact, not just a label."
        ];

  return {
    response,
    strategy: `${persona.name} — ${move}`,
    pressurePoints,
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

// Tag a result object with which provider produced it and the UI banner to show (if any).
function tagProvider<T>(value: T, provider: ProviderName): T {
  if (value && typeof value === "object") {
    (value as Record<string, unknown>).aiProvider = provider;
    const banner = providerBanner(provider);
    if (banner) {
      (value as Record<string, unknown>).aiNotice = banner;
    }
  }
  return value;
}

// Run a JSON completion through the multi-provider layer (Gemini -> Groq -> OpenRouter -> OpenAI),
// falling back to deterministic local content only when every configured provider fails or the
// provider returns JSON that fails the optional structural `validate` check.
async function jsonCompletion<T>(
  system: string,
  prompt: string,
  fallback?: () => T,
  label = "AI",
  validate?: (value: T) => boolean
): Promise<T> {
  try {
    const { content, provider } = await runProviderCompletion({ system, prompt, temperature: 0.7 }, label);
    const parsed = extractJson<T>(content);
    if (validate && !validate(parsed)) {
      throw new Error("provider response failed structural validation (missing required fields)");
    }
    return tagProvider(parsed, provider);
  } catch (error) {
    const reason =
      error instanceof AllProvidersUnavailableError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);

    if (hasFallback(fallback)) {
      console.warn(`[ai] Using fallback ${label} because: ${reason}.`);
      return tagProvider(fallback(), "fallback");
    }

    console.error(`[ai] ${label} failed and no local fallback is available: ${reason}.`);
    throw new OpenAIUnavailableError(`AI is temporarily unavailable: ${reason}`);
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
    () => fallbackTopic(input),
    "topic generator"
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
  format?: string;
  phase?: string;
}) {
  const persona = getAiPersona(input.personaId);
  const studentRole: MessageRole = input.side === "AFFIRMATIVE" ? "NEGATIVE" : "AFFIRMATIVE";
  const latestStudentSpeech = [...input.transcript].reverse().find((message) => message.role === studentRole)?.content ?? "";
  const previousAiSpeeches = input.transcript.filter((message) => message.role === input.side).map((message) => message.content);

  // Non-substantive speech guardrail: if the student's last speech is nonsense or too short to
  // debate, coach them instead of inventing a full opposition speech around "n". (Only when there IS
  // a student speech to answer — an opening AI speech with an empty transcript proceeds normally.)
  if (latestStudentSpeech.trim().length > 0 && !assessStudentSpeech(latestStudentSpeech, input.level).ok) {
    console.info("[ai] Coaching opponent because: the last student speech was non-substantive.");
    return {
      response: OPPONENT_COACHING_RESPONSE,
      strategy: "Coaching: the last speech was too short or unclear to debate.",
      pressurePoints: [
        "State one clear claim (your position on the motion).",
        "Give one reason for it — a 'because' clause.",
        "Tie that reason to the motion with a concrete impact."
      ]
    };
  }
  const ratingLabel = `${persona.rating} (${persona.difficulty})`;
  const tier = strengthTier(input.level, persona.rating);
  const personaStyle = PERSONA_STYLE[persona.id] ?? persona.promptInstructions;
  const difficultyDirective = DIFFICULTY_DIRECTIVE[tier];
  const supportsMotion = input.side === "AFFIRMATIVE";
  const stanceLabel = supportsMotion ? "Government / Affirmative / For" : "Opposition / Negative / Against";
  const stanceRule = supportsMotion
    ? `You are on the ${stanceLabel} side, so you SUPPORT and DEFEND the motion. Argue that the motion SHOULD happen: give reasons it is right, defend how it would be implemented, and answer objections to it. Do NOT attack the motion, ask for proof that the motion is true, or propose a "narrower fix instead of" the motion — that is the other side's job.`
    : `You are on the ${stanceLabel} side, so you OPPOSE the motion. Argue that the motion SHOULD NOT happen: attack the case for it, expose its weak links, and offer alternatives or disadvantages. Do NOT end up defending the motion.`;

  const fallbackFn = () => fallbackOpponent({ ...input, personaId: input.personaId ?? undefined });
  const systemPrompt = `You are a sharp, human-sounding debate opponent in a student training app, arguing the ${stanceLabel} side. Your job is not to sound formal — your job is to make the student better with realistic, persuasive opposition FROM YOUR ASSIGNED SIDE.

SIDE FIDELITY — THIS OVERRIDES EVERYTHING: ${stanceRule}

For every response:
1. Understand the student's actual argument (or, if you speak first, open your own case).
2. Briefly acknowledge the strongest part of the other side's position.
3. Identify the hidden assumption or weak link in the OTHER side's case (never in your own motion if you are Government).
4. Make YOUR side's argument with a concrete reason and, where useful, an alternative or implementation detail.
5. Explain why your side is stronger.
6. Sound natural, like a smart person debating — not like a template.

Before you finish, run a side-fidelity check: if you are Government/Affirmative/For, does your speech clearly DEFEND the motion? If you are Opposition/Negative/Against, does it clearly OPPOSE the motion? If not, rewrite it so it argues your assigned side.

NEVER write any of these (they make you sound robotic and fake):
- "Negative speech 2", "Affirmative speech 1", or any "<side> speech <number>"
- "First, direct clash", "Second, independent offense", "Finally, weighing", or First/Second/Finally as section labels
- "Take your best point", "I'll grant it" / "I'll even grant it", "The trouble is the link", "That's the step I need you to win"
- "direct clash", "independent offense", "the key is direct clash", "I answer the warrant then compare impacts"
- "Judge should prefer us", "This is my ballot story", or any empty ballot line. You may only claim you are ahead once you have explained, concretely, WHY.

Use normal, persuasive language in flowing paragraphs, specific to THIS motion and to what the student actually said. Target voice, for example: "I get why your point sounds appealing. If students are going to use AI anyway, schools should probably teach them to use it responsibly. But your argument assumes the best way to do that is a separate school requirement. That isn't obvious. A better approach is to teach AI use inside English, science, and research work, where students actually need to evaluate sources and check whether AI is wrong."

Never invent citations as real sources. Argue in this persona's voice: ${persona.name}. ${persona.promptInstructions}`;
  const userPrompt = `Motion: ${input.topic}
You are arguing: ${stanceLabel} — you ${supportsMotion ? "SUPPORT and defend this motion" : "OPPOSE this motion"}.
Persona / opponent voice: ${persona.name} — ${persona.style}.
Persona STYLE (debate in this distinct way, not a generic "I hear you, but..." pattern): ${personaStyle}
Difficulty / rating: ${ratingLabel}. ${difficultyDirective}
Debate format: ${input.format ?? input.eventType ?? "default"} (${input.organization})
Practice mode: ${input.practiceMode ?? "DEBATE"}
Student level: ${input.level}
Current round: ${input.round}${input.phase ? ` — phase: ${input.phase}` : ""}
Latest student speech (answer THIS directly): ${latestStudentSpeech || "(none yet — open the clash)"}
Your previous speeches this round (do not repeat yourself): ${previousAiSpeeches.length ? JSON.stringify(previousAiSpeeches) : "(none)"}
Full transcript so far (JSON): ${JSON.stringify(input.transcript)}

Respond to the student's most recent point using the reasoning flow above. Sound like a real, specific, persuasive human — not a template.

Length and shape: ${difficultyDirective} Conversational but sharp, woven into natural prose, NOT headings. Do not pad, do not use headings, and do not fall into the same template as other personas.
Return JSON with:
- "response": your spoken argument as natural paragraphs (no headings, no speech labels, no jargon filler).
- "strategy": a short plain-English note on the line of attack you took (for the coach, not spoken).
- "pressurePoints": 2-4 specific things the student must answer next.`;

  let result = await jsonCompletion<OpponentResponse>(systemPrompt, userPrompt, fallbackFn, "opponent");

  // Side-fidelity guardrail on live output: if a provider returned the wrong side, regenerate once,
  // then fall back to the deterministic (side-correct) opponent. The fallback is already side-correct.
  if (result.aiProvider && result.aiProvider !== "fallback" && arguesWrongSide(result.response, supportsMotion)) {
    console.warn("[ai] Opponent argued the wrong side; regenerating once.");
    result = await jsonCompletion<OpponentResponse>(
      `${systemPrompt}\n\nIMPORTANT: your previous attempt argued the WRONG side. You are ${stanceLabel}; you MUST ${supportsMotion ? "DEFEND" : "OPPOSE"} the motion "${input.topic}". Rewrite so you clearly argue your assigned side.`,
      userPrompt,
      fallbackFn,
      "opponent (side retry)"
    );

    if (result.aiProvider && result.aiProvider !== "fallback" && arguesWrongSide(result.response, supportsMotion)) {
      console.warn("[ai] Opponent still argued the wrong side; using side-correct fallback.");
      return tagProvider(fallbackFn(), "fallback");
    }
  }

  return result;
}

// Conservative live-output side check: flags only a clear inversion (>= 2 wrong-side cues dominating)
// so we never regenerate a genuinely on-side speech.
export function arguesWrongSide(text: string, supportsMotion: boolean): boolean {
  const lower = (text ?? "").toLowerCase();
  const supportCues = [
    "should be implemented",
    "should be adopted",
    "should happen",
    "we should",
    "i support",
    "i'm defending",
    "i am defending",
    "i will defend",
    "defend the motion",
    "in favor of",
    "this policy should"
  ];
  const opposeCues = [
    "should not be implemented",
    "should not",
    "shouldn't",
    "i oppose",
    "oppose the motion",
    "against the motion",
    "do not support",
    "this should not happen",
    "a narrower fix",
    "reject the motion"
  ];
  const support = supportCues.filter((cue) => lower.includes(cue)).length;
  const oppose = opposeCues.filter((cue) => lower.includes(cue)).length;

  return supportsMotion ? oppose >= 2 && oppose > support : support >= 2 && support > oppose;
}

type ModelRewrite = {
  rewrite: string;
  whatChanged: string;
  fallbackNotice?: string;
};

export async function generateModelRewrite(input: {
  motion: string;
  side: string;
  weakSentence: string;
  organization?: Organization;
  level?: Level;
}) {
  return jsonCompletion<ModelRewrite>(
    `You are a supportive debate coach. Rewrite a student's weak line into ONE or TWO strong, natural sentences that a real debater would say: a clear claim, a genuine warrant (why it is true), and a concrete impact, all tied to the motion. No debate jargon as filler, no headings. Return JSON.`,
    `Motion: ${input.motion}
Student side: ${input.side}
Student level: ${input.level ?? "INTERMEDIATE"}
Student's weak line: "${input.weakSentence}"

Return JSON with:
- "rewrite": the stronger version (1-2 sentences, natural and human, tied to the motion).
- "whatChanged": one short clause naming what you added (e.g. "added a causal warrant and a concrete impact").`,
    () => {
      const trimmed = input.weakSentence.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
      const core = trimmed.length > 140 ? `${trimmed.slice(0, 140).replace(/\s+\S*$/, "")}` : trimmed || "your main point";
      return {
        rewrite: `${core.charAt(0).toUpperCase() + core.slice(1)} — and here is why that matters: explain the mechanism that makes it happen and name the concrete harm or benefit it creates on "${input.motion}", so the judge can weigh it.`,
        whatChanged: "Added a causal warrant and a concrete, motion-specific impact.",
        fallbackNotice: DEV_AI_FALLBACK_NOTICE
      };
    },
    "model rewrite"
  );
}

export type JudgeEnhancement = {
  shortReason?: unknown;
  whyWinnerWon?: unknown;
  whyLoserLost?: unknown;
  biggestFix?: unknown;
  betterSentence?: unknown;
  practiceNext?: unknown;
};

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const JUDGE_PROSE_SYSTEM = `You are an experienced debate judge writing the student-facing summary of a ballot that has ALREADY been scored by a rubric. Do NOT re-score and do NOT change the winner — only explain the decision clearly, fairly, and kindly.

Return ONLY valid JSON. No markdown. No code fences. No commentary outside the JSON. Use EXACTLY this schema:
{"shortReason": string (at most 3 sentences), "whyWinnerWon": string (1-2 sentences), "whyLoserLost": string (1-2 sentences), "biggestFix": string (1 sentence), "betterSentence": string (one polished model sentence the student could have said), "practiceNext": string (one concrete skill)}

Reference the actual motion and what was said. No debate jargon as filler.`;

function judgeProsePrompt(
  input: { topic: string; studentSide?: string; transcript: DebateTranscriptMessage[] },
  base: DebateJudgeResult
): string {
  return `Motion: ${input.topic}
Student side: ${input.studentSide ?? "unknown"}
Winner (already decided — do not change): ${base.teamWinner ?? "unknown"} at ${base.confidenceLevel ?? "unknown"} confidence.
Rubric scores: Government ${base.internalScoringSummary?.governmentScore ?? "?"} vs Opposition ${base.internalScoringSummary?.oppositionScore ?? "?"}.
The central clash: ${base.keyClash ?? "see transcript"}
Student's strongest idea: ${base.transcriptFeedback?.strongestClaim ?? "n/a"}
Student's weakest moment: ${base.transcriptFeedback?.weakestClaim ?? "n/a"}
Transcript JSON: ${JSON.stringify(input.transcript)}

Write the compact ballot summary. Return ONLY the JSON object with shortReason, whyWinnerWon, whyLoserLost, biggestFix, betterSentence, practiceNext.`;
}

// Merge provider prose onto the local ballot. Returns null when the enhancement has no usable field.
export function mergeJudgeEnhancement(base: DebateJudgeResult, raw: JudgeEnhancement, provider: ProviderName): DebateJudgeResult | null {
  const shortReason = nonEmptyString(raw.shortReason);
  const whyWinnerWon = nonEmptyString(raw.whyWinnerWon);
  const whyLoserLost = nonEmptyString(raw.whyLoserLost);
  const biggestFix = nonEmptyString(raw.biggestFix);
  const betterSentence = nonEmptyString(raw.betterSentence);
  const practiceNext = nonEmptyString(raw.practiceNext);

  if (![shortReason, whyWinnerWon, whyLoserLost, biggestFix, betterSentence, practiceNext].some(Boolean)) {
    return null;
  }

  const merged: DebateJudgeResult = { ...base };
  merged.aiProvider = provider;
  merged.aiNotice = providerBanner(provider) ?? undefined;

  if (shortReason) {
    merged.shortReasonForDecision = shortReason;
  }
  merged.judgeFairnessReport = {
    ...(base.judgeFairnessReport ?? {
      emptyPhraseWarning: null,
      motionConnection: "",
      mechanismCheck: "",
      betterVersion: "",
      fairWinnerLogic: ""
    }),
    ...(whyWinnerWon ? { whyWinnerWon, realArgumentQuality: whyWinnerWon } : {}),
    ...(whyLoserLost ? { whyLoserLost } : {}),
    ...(practiceNext ? { practiceSkill: practiceNext } : {})
  };
  merged.transcriptFeedback = {
    ...(base.transcriptFeedback ?? { studentSide: "GOVERNMENT" }),
    ...(biggestFix ? { mostMissingPiece: biggestFix } : {}),
    ...(betterSentence ? { betterSentence } : {})
  } as DebateJudgeResult["transcriptFeedback"];

  return merged;
}

const JUDGE_LOCAL_FALLBACK_NOTICE = "Live AI judge unavailable — showing the local rubric judge.";

// Crash-proof judge. The deterministic local rubric judge is the SOURCE OF TRUTH (full 12-dimension
// ballot, winner, scores, side fidelity). A provider (Gemini first) is used ONLY to improve the
// compact prose. Any provider/JSON/structure failure keeps the complete local ballot — never a 500.
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
}): Promise<DebateJudgeResult> {
  const base = fallbackDebateJudge(input);
  // Attribute the ballot to the registry spec covering this format (PF today); the score itself
  // still comes from the local rubric ballot — the registry supplies season + verification context.
  const registry = await registryRubricForJudge(input.organization, input.eventType ?? input.format);
  if (registry) {
    base.rubricSource = registry.tag;
  }

  // No external provider configured -> keep the local ballot (already full rubric + side-correct).
  if (getProviderOrder().length === 0) {
    base.aiProvider = "fallback";
    return base;
  }

  let content: string;
  let provider: ProviderName;
  try {
    const result = await runProviderCompletion(
      { system: JUDGE_PROSE_SYSTEM, prompt: judgeProsePrompt(input, base), temperature: 0.5 },
      "judge"
    );
    content = result.content;
    provider = result.provider;
  } catch (error) {
    // 503 / 429 / timeout / network / all-providers-failed — never crash the route.
    console.warn(`[ai] judge provider failed because: ${errorMessage(error)}.`);
    console.info("[ai] Using local rubric judge fallback.");
    base.aiNotice = JUDGE_LOCAL_FALLBACK_NOTICE;
    base.aiProvider = "fallback";
    return base;
  }

  let enhancement: JudgeEnhancement;
  try {
    enhancement = extractJson<JudgeEnhancement>(content);
  } catch (parseError) {
    console.warn(`[ai] ${providerLabel(provider)} judge failed because JSON_PARSE_ERROR: ${errorMessage(parseError)}.`);
    console.info("[ai] Using local rubric judge fallback.");
    base.aiNotice = JUDGE_LOCAL_FALLBACK_NOTICE;
    base.aiProvider = "fallback";
    return base;
  }

  const merged = mergeJudgeEnhancement(base, enhancement, provider);
  if (!merged) {
    console.warn(`[ai] ${providerLabel(provider)} judge failed because MISSING_FIELDS: enhancement had no usable prose.`);
    console.info("[ai] Using local rubric judge fallback.");
    base.aiNotice = JUDGE_LOCAL_FALLBACK_NOTICE;
    base.aiProvider = "fallback";
    return base;
  }

  return merged;
}

// A provider performance ballot must carry the fields the judge route reads, or we keep the local one.
function isValidPerformanceJudge(result: PerformanceJudgeResult): boolean {
  return (
    Array.isArray(result?.categoryScores) &&
    result.categoryScores.length > 0 &&
    typeof result.overallScore === "number" &&
    Array.isArray(result.strengths) &&
    Array.isArray(result.weaknesses) &&
    Boolean(result.readinessForNextLevel)
  );
}

// --- DECA role-play: registry-sourced scenarios + in-character objection judging ---------------
// All of this reuses the same jsonCompletion path as judgeDecaRoleplay (same providers, same
// fallback, same registry rubric helpers) — no new AI pipeline.

export type RoleplayScenario = {
  scenario: string; // the business situation the student must handle
  judgeCharacter: string; // who the AI plays and how they behave in the interaction
  performanceIndicators: string[]; // what the student is evaluated on
  piSource: "registry" | "generic"; // registry = pulled from the spec's rubric categories
  rubricSource?: RubricSourceTag;
  eventName?: string;
  season?: string;
  verificationStatus?: string;
  fallbackNotice?: string;
};

function fallbackRoleplayScenario(input: { cluster: string; studentRole: string; judgeRole: string }): RoleplayScenario {
  return {
    scenario: `You are the ${input.studentRole} for a ${input.cluster} business. The ${input.judgeRole} presents a common operational challenge and asks how you would handle it. Analyze the situation, recommend a professional course of action, and be ready to defend your reasoning.`,
    judgeCharacter: `The AI plays the ${input.judgeRole}, speaking and reacting as that person naturally would in a real business meeting.`,
    performanceIndicators: [
      "Understanding of the business scenario",
      "Quality and feasibility of the recommendation",
      "Professional communication"
    ],
    piSource: "generic",
    fallbackNotice: "No competition specification was found for this event, so this is generic practice — performance indicators are not sourced from official guidelines."
  };
}

// Generate a role-play scenario. Performance indicators come from the registry's rubric categories
// (not invented) when a spec covers the event; otherwise the scenario is clearly labeled generic.
export async function generateDecaRoleplayScenario(input: {
  level: Level;
  eventType: string; // e.g. "DECA Business Management Role Play" or the HLM event name
  cluster: string;
  instructionalArea?: string;
  studentRole: string;
  judgeRole: string;
}): Promise<RoleplayScenario> {
  // Only attribute to a registry spec when the selected cluster matches the domain that spec
  // actually covers. The seeded HLM spec is Hospitality & Tourism; a Finance role-play has no spec,
  // so it must degrade to generic rather than borrow HLM's event name and categories.
  const clusterMatchesSpec = /hospitality|tourism|lodging|hotel/i.test(input.cluster);
  const spec = clusterMatchesSpec ? await findSpecForEvent("DECA", "ROLEPLAY") : null;
  const registryPis = spec ? (await getSpecRubricBreakdown(spec)).categories.map((category) => category.name) : [];
  const hasRegistry = registryPis.length > 0;

  const fallback = () =>
    fallbackRoleplayScenario({ cluster: input.cluster, studentRole: input.studentRole, judgeRole: input.judgeRole });

  const piInstruction = hasRegistry
    ? `The student is evaluated ONLY on these official rubric categories from the ${spec?.eventName} ${spec?.season} specification — use them verbatim as the performanceIndicators, do NOT invent official indicators: ${registryPis
        .map((pi) => `"${pi}"`)
        .join(", ")}.`
    : `No official specification covers this event. Propose 3 reasonable practice performance indicators and understand they are GENERIC, not official.`;

  const result = await jsonCompletion<RoleplayScenario>(
    // In-character enforcement lives in the system prompt so it applies to the whole interaction.
    `You author authentic DECA role-play scenarios. The interlocutor (the "${input.judgeRole}") is a REAL business character, never an AI assistant: they have a role, a goal, and a personality, and everything they say sounds like that person in a real meeting — not like a helpful chatbot. Return JSON only.`,
    `Create a ${input.level} DECA role-play.
Event: ${input.eventType}
Career cluster: ${input.cluster}
Instructional area: ${input.instructionalArea ?? "general to the cluster"}
Student plays: ${input.studentRole}
The AI plays (in character): ${input.judgeRole}
${piInstruction}

Return a single JSON object with EXACTLY these fields:
- scenario: 3-5 sentences describing the business situation the student must handle, specific to the cluster and instructional area
- judgeCharacter: 1-2 sentences describing who the ${input.judgeRole} is and how they behave in this interaction (their goal, tone, and what would make them skeptical)
- performanceIndicators: array of strings ${hasRegistry ? "(use the official categories above VERBATIM)" : "(generic, clearly not official)"}`,
    fallback,
    "DECA roleplay scenario"
  ) as RoleplayScenario;

  if (hasRegistry && spec) {
    // Trust the registry categories over anything the model returned for the scored dimensions.
    result.performanceIndicators = registryPis;
    result.piSource = "registry";
    result.eventName = spec.eventName;
    result.season = spec.season;
    result.verificationStatus = spec.verificationStatus;
    const tag = await registryRubricForJudge("DECA", "ROLEPLAY");
    if (tag) result.rubricSource = tag.tag;
  } else if (result.piSource !== "generic") {
    result.piSource = "generic";
    result.fallbackNotice =
      "No competition specification was found for this event, so performance indicators are generic practice, not official.";
  }

  return result;
}

export type JudgeObjections = {
  objections: string[]; // 2-3 in-character follow-up questions
  judgeCharacter: string;
  fallbackNotice?: string;
};

function fallbackObjections(judgeRole: string): JudgeObjections {
  return {
    judgeCharacter: `The ${judgeRole}, pressing for specifics.`,
    objections: [
      "That sounds good, but what does it actually cost us, and how soon do we see a return?",
      "How would you measure whether this is working after 90 days?",
      "We tried something like this before and it stalled — why is your approach different?"
    ],
    fallbackNotice: "AI is temporarily unavailable, so these are generic backup objections."
  };
}

// After the student's pitch, the in-character judge raises 2-3 realistic objections. Reuses the
// same completion path — this is the "judge questions" phase of the same role-play, not a new AI.
export async function generateDecaJudgeObjections(input: {
  level: Level;
  eventType: string;
  scenario: string;
  judgeRole: string;
  studentPitch: string;
}): Promise<JudgeObjections> {
  return jsonCompletion<JudgeObjections>(
    `You ARE the ${input.judgeRole} in a DECA role-play — a real business person, not an AI assistant. Stay fully in character: your questions sound like this specific person under real business pressure, using first person ("I", "we", "our"). Never break character, never mention being an AI or a judge. Return JSON only.`,
    `The role-play scenario: ${input.scenario}
You are the ${input.judgeRole}. The student (playing their business role) just told you:
"${input.studentPitch}"

As the ${input.judgeRole}, ask 2-3 pointed follow-up questions that a real ${input.judgeRole} would ask before deciding — probe at least two of: cost/ROI, feasibility/implementation, measurement/metrics, and alternatives already tried. Each question must be in your voice and specific to what the student actually said.

Return a single JSON object with EXACTLY these fields:
- objections: array of 2-3 strings, each a first-person in-character question
- judgeCharacter: 1 sentence describing your character and current mood`,
    () => fallbackObjections(input.judgeRole),
    "DECA judge objections"
  );
}

export async function judgeDecaRoleplay(input: {
  level: Level;
  eventType: string;
  scenario: string;
  transcript: DebateTranscriptMessage[];
  // When true, the transcript contains an objection round (judge questions + student answers) after
  // the opening pitch, so the judge scores prepared vs. unscripted performance separately.
  hasObjectionRound?: boolean;
}) {
  const rubric = rubricFor("DECA", input.eventType);
  const registry = await registryRubricForJudge("DECA", input.eventType);

  // DECA's real judging distinguishes the prepared presentation from unscripted questioning. The
  // registry rubric does not yet encode a point split for this, so we surface it as a labeled,
  // structure-based split (not an official point weighting) only when an objection round happened.
  const splitInstruction = input.hasObjectionRound
    ? `
This role-play included an OBJECTION ROUND: after the opening pitch, the ${"judge"} asked follow-up questions and the student answered under pressure. DECA judging weighs prepared presentation and unscripted questioning separately. Also return:
- presentationScore: number 0-100 for the prepared opening pitch
- questioningScore: number 0-100 for how the student handled the unscripted follow-up questions
(This prepared-vs-unscripted split reflects standard DECA role-play structure; the exact point weighting is not encoded in the registry, so treat both as 0-100 sub-scores, not official points.)`
    : "";

  const result = await jsonCompletion<PerformanceJudgeResult>(
    "You are an educational DECA judge for original practice roleplays and case studies. Do not judge like debate. Return JSON only.",
    `Evaluate this ${input.level} DECA ${input.eventType} practice.
Scenario: ${input.scenario}
Transcript JSON: ${JSON.stringify(input.transcript)}
Rubric JSON: ${JSON.stringify(rubric)}
Shared speaking skills to score from 0-100: ${SHARED_SPEAKING_SKILLS.join(", ")}.

Focus on business scenario understanding, performance indicators, solution quality, business reasoning, creativity, feasibility, professional communication, organization, judge questions, and delivery.
Return a single JSON object with EXACTLY these fields:
- overallScore: number 0-100
- categoryScores: an ARRAY (not an object) with one entry per rubric category above, each shaped {"key": "<rubric key>", "label": "<rubric label>", "score": <number within that category's scoreMin-scoreMax>, "reason": "<one sentence>"}
- sharedSpeaking: object with numeric 0-100 values for exactly: clarity, confidence, pacing, volume, organization, vocabulary, persuasion, professionalism
- strengths, weaknesses, improvementAdvice: arrays of strings
- recommendedLessons: array of {"lessonSlug": string, "reason": string, "priority": "high" | "medium" | "low"}
- judgeQuestionFeedback: array of strings
- readinessForNextLevel: {"ready": boolean, "rationale": string, "nextMilestone": string}${splitInstruction}
${registry ? registry.promptBlock : ""}`,
    () => fallbackPerformanceJudge({ organization: "DECA", eventType: input.eventType }),
    "DECA judge",
    isValidPerformanceJudge
  );
  if (registry) {
    result.rubricSource = registry.tag;
  }
  return result;
}

export async function judgeHosaPerformance(input: {
  level: Level;
  eventType: string;
  scenario: string;
  transcript: DebateTranscriptMessage[];
}) {
  const rubric = rubricFor("HOSA", input.eventType);
  const registry = await registryRubricForJudge("HOSA", input.eventType);

  const result = await jsonCompletion<PerformanceJudgeResult>(
    "You are an educational HOSA judge for original health science practice. Do not judge like debate. Return JSON only.",
    `Evaluate this ${input.level} HOSA ${input.eventType} performance.
Scenario: ${input.scenario}
Transcript JSON: ${JSON.stringify(input.transcript)}
Rubric JSON: ${JSON.stringify(rubric)}
Shared speaking skills to score from 0-100: ${SHARED_SPEAKING_SKILLS.join(", ")}.

Focus on health science knowledge, medical/health accuracy, event task completion, scenario response, communication, professionalism, presentation quality, and skill/performance quality when relevant.
Return a single JSON object with EXACTLY these fields:
- overallScore: number 0-100
- categoryScores: an ARRAY (not an object) with one entry per rubric category above, each shaped {"key": "<rubric key>", "label": "<rubric label>", "score": <number within that category's scoreMin-scoreMax>, "reason": "<one sentence>"}
- sharedSpeaking: object with numeric 0-100 values for exactly: clarity, confidence, pacing, volume, organization, vocabulary, persuasion, professionalism
- strengths, weaknesses, improvementAdvice: arrays of strings
- recommendedLessons: array of {"lessonSlug": string, "reason": string, "priority": "high" | "medium" | "low"}
- accuracyFlags: array of strings
- readinessForNextLevel: {"ready": boolean, "rationale": string, "nextMilestone": string}
${registry ? registry.promptBlock : ""}`,
    () => fallbackPerformanceJudge({ organization: "HOSA", eventType: input.eventType }),
    "HOSA judge",
    isValidPerformanceJudge
  );
  if (registry) {
    result.rubricSource = registry.tag;
  }
  return result;
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
    () => fallbackPracticeQuestions(input),
    "practice questions"
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
    () => fallbackLessonContent(input),
    "lesson content"
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
    }),
    "lesson recommendations"
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
    },
    "readiness evaluation"
  );
}
