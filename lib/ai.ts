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

type DebateStance = "support" | "oppose";

// SIDE FIDELITY: the fallback opponent must argue its ASSIGNED side. Government/Affirmative/For
// supports and defends the motion; Opposition/Negative/Against opposes it. buildPersonaArgument
// dispatches on stance so a Government persona never attacks its own motion.
function buildPersonaArgument(personaId: string, claim: string | null, motion: string, stance: DebateStance) {
  return stance === "support"
    ? buildSupportArgument(personaId, claim, motion)
    : buildOpposeArgument(personaId, claim ?? "there's a real problem worth solving here", motion);
}

// SUPPORT: defend the motion. Give a reason it should happen, answer the strongest objection, and
// keep the persona's distinct emphasis. Never attack the motion or propose a "narrower fix instead".
function buildSupportArgument(personaId: string, claim: string | null, motion: string) {
  const objection = claim ?? "that the rule will be unfair or go too far";
  const builders: Record<string, () => { response: string; move: string }> = {
    "evidence-specialist": () => ({
      move: "defending the motion with concrete benefits",
      response: `${capitalize(motion)}, and I'll defend that with concrete reasons rather than slogans. The benefits are specific: clearer expectations, fewer daily conflicts, and a setting that keeps the focus on learning. When people ask for proof, the honest answer is to point to places that adopted this and saw exactly those gains. The fair objection is ${objection}, and it deserves an answer: write the rule narrowly — clear standards, equal enforcement, no arbitrary targeting. That keeps the upside while removing the part critics actually fear. Real benefits with manageable, designable risks is why this should happen.`
    }),
    "policy-analyst": () => ({
      move: "defending the motion on implementation",
      response: `Let me defend ${motion} on the practical details, because that is where it is won or lost. It works when it is implemented well: simple published rules, consistent enforcement, and a clear process for exceptions. Yes, ${objection} is a real risk — but that is a design problem, not a reason to do nothing. Build the policy to avoid it and you get the structure and predictability a school needs without the overreach. Done right, the upside is steady and the downside is contained, which is exactly why I would implement it.`
    }),
    "devils-advocate": () => ({
      move: "defending the motion by beating its strongest objection",
      response: `I will defend ${motion} by taking the strongest argument against it head on: ${objection}. That is the objection that sounds best, and it still does not hold. Nothing about this policy requires it to be unfair or heavy-handed — that is a failure of bad implementation, not of the idea itself. Written with clear rules and equal enforcement, it delivers the benefit while removing the very thing critics fear. If the only case against it is "it could be done badly," then the answer is to do it well, and the motion stands.`
    }),
    "socratic-questioner": () => ({
      move: "defending the motion by answering the decisive question",
      response: `Let me defend ${motion}, starting with the question that actually decides it: does this do more good than harm when it is done well? It clearly does. The real benefits — structure, fewer distractions, clearer expectations — are concrete and everyday. The usual worry is ${objection}; but is that a flaw in the idea, or only in a sloppy version of it? Write it narrowly and the worry falls away while the benefit stays. That is why the answer here is yes, and why I am defending the motion.`
    }),
    "ethics-philosopher": () => ({
      move: "defending the motion on principle",
      response: `I will defend ${motion} on principle. A school owes every student a fair, focused environment, and clear shared standards serve that duty better than leaving things to chance. The honest objection is ${objection}, and fairness does cut both ways — which is exactly why the rule must be written narrowly and enforced equally, with no targeting. Done that way, it protects students rather than controlling them. The principled position is not to avoid the policy; it is to implement it fairly.`
    }),
    "rhetorician": () => ({
      move: "defending the motion by reframing the choice",
      response: `Let me make the case for ${motion}, plainly. Strip away the noise and the choice is simple: a clear, shared standard that keeps the focus on learning, versus leaving everyone to sort it out alone. The objection you will hear is ${objection} — but that is an argument for writing the rule well, not for refusing to write it at all. With clear standards and equal enforcement, this gives students structure without being heavy-handed. That is the version worth defending, and it is why this should happen.`
    }),
    "tournament-judge": () => ({
      move: "defending the motion on the substance",
      response: `I am defending ${motion}, and here is the substance before any debate terms. The case rests on real, recurring benefits — clearer expectations, fewer distractions, a steadier learning environment. The best response against me is ${objection}, and it only has force if the policy is written carelessly. Written narrowly, with clear rules and equal enforcement, that objection falls away. So weigh it directly: real, everyday benefits against a risk we can design out. That comparison comes down on the side of the motion.`
    }),
    "deca-judge": () => ({
      move: "defending the motion as a sound decision",
      response: `From a practical standpoint, ${motion} is the right call, and I will defend it like a sound decision. The benefits are tangible — clearer expectations, fewer conflicts, more time kept on learning — and they recur every day. The cost critics raise is ${objection}; treat that as a risk to manage, not a dealbreaker. Clear rules, equal enforcement, and a simple exceptions process keep that cost low. Steady benefit at a controllable cost is a good investment, which is why I would implement it.`
    }),
    "hosa-judge": () => ({
      move: "defending the motion as the responsible policy",
      response: `I will defend ${motion} as the more responsible policy. A predictable, well-run environment protects students and keeps the focus where it belongs. The worry worth taking seriously is ${objection}; the answer is to implement carefully — clear standards, equal enforcement, real exceptions — not to walk away from the benefit. Handled that way, the policy supports students without overreaching. Protecting a steady, safe environment comes first, and this is how you deliver it.`
    }),
    "starter-coach": () => ({
      move: "defending the motion and modelling a clean case",
      response: `Let me defend ${motion}, and model how to do it well. Lead with the benefit: clearer expectations and fewer daily distractions, so more time goes to learning. Then answer the obvious objection — ${objection} — instead of dodging it: the fix is a narrow rule with clear standards and equal enforcement. Notice the move: claim, reason, then pre-empting the strongest pushback. That is a complete case for the motion, and it is why the policy holds up.`
    }),
    "friendly-practice": () => ({
      move: "defending the motion directly",
      response: `I am happy to defend ${motion}. The simple case is that a clear, shared standard helps a school run better — fewer distractions, clearer expectations, less daily friction. The fair pushback is ${objection}, so let me answer it directly: write the rule narrowly, enforce it equally, and that worry mostly goes away. You keep the real benefit without the heavy-handedness. That is why I would back this rather than leave things as they are.`
    })
  };

  const build = builders[personaId] ?? builders["policy-analyst"];
  return build();
}

// OPPOSE: argue against the motion. Acknowledge the real point, expose the hidden assumption, attack
// the weakest link, offer a countermodel, and explain why it is stronger. No template tics.
function buildOpposeArgument(personaId: string, claim: string, motion: string) {
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
  // Government/Affirmative defends the motion; Opposition/Negative argues against it.
  const stance: DebateStance = isAffirmative ? "support" : "oppose";
  const studentRole: MessageRole = isAffirmative ? "NEGATIVE" : "AFFIRMATIVE";
  const motion = cleanMotion(input.topic);
  const studentPoint = extractStudentPoint(input.transcript, studentRole);
  const { response, move } = buildPersonaArgument(persona.id, studentPoint, motion, stance);
  const advanced = input.level === "ELITE" || persona.difficulty === "elite";
  // Advanced/elite mode expects a longer speech (180-260 words): add a concrete weighing close that
  // matches the assigned stance so the fallback still hits the expected shape.
  const advancedClose =
    stance === "support"
      ? ` And weigh it directly: the everyday benefits — structure, focus, clearer expectations — land for every student, every day, while the main risk only appears if the policy is implemented badly, which we can prevent by writing it narrowly. Concrete, recurring upside against a risk we can design out is why my side should win this.`
      : ` And weigh it directly: a narrower fix reaches the same goal with less collateral damage, which on this motion matters more than the sweep of the full version, because a smaller change is both more likely to work and easier to walk back if it doesn't. Comparable benefit at far less risk is why my side should come out ahead here.`;
  const fullResponse = advanced ? `${response}${advancedClose}` : response;
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
    response: fullResponse,
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

    if (canUseDevelopmentFallback(fallback)) {
      console.warn(`[ai] Using fallback ${label} because: ${reason}.`);
      return tagProvider(fallback(), "fallback");
    }

    console.error(`[ai] ${label} unavailable and no fallback allowed: ${reason}.`);
    throw new OpenAIUnavailableError(`AI service unavailable: ${reason}`);
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
  const advanced = input.level === "ELITE" || persona.difficulty === "elite";
  const wordTarget = advanced ? "180-260 words" : "100-180 words";
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
Persona / opponent voice: ${persona.name} — ${persona.style}. ${persona.promptInstructions}
Difficulty / rating: ${ratingLabel}
Debate format: ${input.format ?? input.eventType ?? "default"} (${input.organization})
Practice mode: ${input.practiceMode ?? "DEBATE"}
Student level: ${input.level}
Current round: ${input.round}${input.phase ? ` — phase: ${input.phase}` : ""}
Latest student speech (answer THIS directly): ${latestStudentSpeech || "(none yet — open the clash)"}
Your previous speeches this round (do not repeat yourself): ${previousAiSpeeches.length ? JSON.stringify(previousAiSpeeches) : "(none)"}
Full transcript so far (JSON): ${JSON.stringify(input.transcript)}

Respond to the student's most recent point using the reasoning flow above. Sound like a real, specific, persuasive human — not a template.

Length and shape: aim for ${wordTarget}, conversational but sharp. The response must contain (woven into natural prose, NOT as headings): one direct response to the student, one concrete counterargument, one comparison or better alternative, and a final sentence explaining why your side is stronger. Do not pad, do not use headings.
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
    () => fallbackPerformanceJudge({ organization: "DECA", eventType: input.eventType }),
    "DECA judge",
    isValidPerformanceJudge
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
    () => fallbackPerformanceJudge({ organization: "HOSA", eventType: input.eventType }),
    "HOSA judge",
    isValidPerformanceJudge
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
