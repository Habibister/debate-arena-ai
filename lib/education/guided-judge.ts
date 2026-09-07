/**
 * GUIDED JUDGE — the curriculum-limited ballot for a lesson's guided round.
 *
 * NEVER SCORE UNTAUGHT SKILLS. A learner in the Refutation guided round has been taught Refutation
 * and Claim/Warrant/Impact. The full practice judge scores sixteen lexical categories, writes a
 * fairness report about weighing and dropped arguments, projects a rating change across six skills,
 * and recommends lessons across the whole curriculum. Every one of those would tell a beginner they
 * were weak at something nobody has taught them yet — which is the exact failure the coached model
 * exists to end.
 *
 * This module PROJECTS a full judge result onto a guided rubric:
 *   - only categories that map to an UNLOCKED competency survive; every other category is removed,
 *     not hidden, before persistence and before the response;
 *   - the overall score is recomputed from the surviving categories only, so a locked skill can
 *     neither raise nor lower the result;
 *   - the fairness report, the winner, the rating change and the readiness verdict are removed —
 *     a coached exercise is not an independent competitive performance;
 *   - prose that names a locked competency is dropped; recommendations are kept only when their
 *     canonical lesson teaches an unlocked competency;
 *   - a small guided feedback block replaces the full ballot: what went well on the current skill,
 *     one reinforcement note, one thing to fix, and whether to retry or continue.
 *
 * SERVER-VALIDATED. The rubric comes from `guidedRubricFor(lessonId)` — curriculum truth — never
 * from a client-supplied list of unlocked skills. A client can say WHICH lesson; it cannot say WHAT
 * that lesson unlocks. An unresolvable lesson is refused by the route (fail closed), never scored
 * against the full curriculum.
 *
 * PURE. No database, no session, no provider, no environment. Imported by the judge route and by
 * strict-safe tests, which exercise it against a fabricated full result.
 */
import {
  COMPETENCY_LABELS,
  COMPETENCY_LESSON,
  mentionsCompetency,
  type DebateCompetency,
  type GuidedRubric
} from "@/lib/education/coaching";

/**
 * Which curriculum competency each LEXICAL JUDGE CATEGORY measures. The keys are exactly those
 * emitted by `buildTranscriptBasedDebateJudge` in lib/debate-judge-analysis.ts.
 *
 * A category with no entry measures something that is not a curriculum competency at all — speech
 * hygiene (motion connection, side fidelity, empty jargon, rule compliance), delivery, evidence, or
 * a speech-strategy behaviour (collapse). In a guided round those are dropped too: the ballot may
 * contain EXACTLY the unlocked competencies, and "not a competency" is not "unlocked".
 *
 * `centralClashResponse` is mapped to CLASH, not refutation, on purpose: it measures whether the
 * learner engaged the round's central point of disagreement, which is the Clash lesson's skill.
 * Mapping it to refutation would let a locked skill leak into the pilot's score under another name.
 */
export const JUDGE_CATEGORY_COMPETENCY: Readonly<Record<string, DebateCompetency>> = {
  argument: "claim-warrant-impact",
  warrant: "claim-warrant-impact",
  mechanism: "claim-warrant-impact",
  impact: "claim-warrant-impact",
  refutation: "refutation",
  responsiveness: "refutation",
  centralClashResponse: "clash",
  clash: "weighing", // the lexical judge's "clash" category is LABELLED "Weighing" and scores weighing
  // `organization` was withdrawn from the ballot on 2026-09-06, so this maps nothing today. Kept as
  // the declared mapping for a future category that genuinely measures placement — a guided rubric
  // must never silently acquire one by an unmapped key appearing.
  organization: "signposting"
};

/** The category keys a guided round for `rubric` may keep. Everything else is removed. */
export function allowedJudgeCategories(rubric: GuidedRubric): readonly string[] {
  const unlocked = new Set<DebateCompetency>([rubric.primary, ...rubric.reinforcement]);
  return Object.entries(JUDGE_CATEGORY_COMPETENCY)
    .filter(([, competency]) => unlocked.has(competency))
    .map(([key]) => key);
}

/** The minimal shape this module needs to read. The route's and lib/ai's result types both satisfy it. */
export type FullJudgeResultLike = {
  overallScore: number;
  categoryScores: Array<{ key: string; label?: string; score: number; reason?: string }>;
  strengths: string[];
  weaknesses: string[];
  improvementAdvice?: string[];
  recommendedLessons?: Array<{ lessonSlug: string; reason: string; priority: "high" | "medium" | "low" }>;
  [key: string]: unknown;
};

/**
 * What the ROUND'S judge actually measures for each competency, stated exactly. The lexical judge
 * has no category that measures whether a learner can IDENTIFY the clash — `centralClashResponse`
 * scores whether they ENGAGED the central disagreement, which is adjacent to the skill and is not
 * it. Calling the two the same would tell a learner the round proved something it did not test.
 * Where the round's measure is adjacent, the DIRECT evidence is the lesson's constructed attempt,
 * which checks the identification move itself, and the ballot says so in those words.
 */
export type RoundMeasure = {
  /** Learner-facing name of what the round measured. */
  label: string;
  /** Does the round's category measure the lesson skill itself, or an adjacent application of it? */
  direct: boolean;
  /** Where the direct evidence lives when the round's measure is adjacent. */
  directEvidence?: string;
};

export const COMPETENCY_ROUND_MEASURE: Readonly<Record<DebateCompetency, RoundMeasure>> = {
  "claim-warrant-impact": { label: "building a claim with a warrant and an impact", direct: true },
  refutation: { label: "answering the other side's arguments directly", direct: true },
  clash: {
    label: "central-clash engagement",
    direct: false,
    directEvidence: "the constructed attempt in the lesson, which checks whether you can name the disputed question"
  },
  // WITHDRAWN 2026-09-06. This declared that a round measures signposting DIRECTLY. The only judge
  // category mapped to it was `organization`, a substring count that scored the lesson's own model
  // answer 57 and the label the lesson calls WRONG 73 — so the claim was false. That category no
  // longer exists, and nothing in a transcript measures signposting, so the honest declaration is
  // that a round shows none of it. No guided application may name signposting while this stands.
  signposting: { label: "signposting", direct: false, directEvidence: "the Signposting lesson's own level-and-label exercise, and the signposting drill" },
  "constructive-speech": { label: "constructive speech", direct: true },
  weighing: { label: "weighing", direct: true }
};

export type GuidedFeedback = {
  /** Exactly what the round measured for the current skill, and whether that IS the skill. */
  measure: RoundMeasure;
  /** What went well on the CURRENT lesson skill — or, when the round's measure is adjacent, on the
   *  round's application of it, named as such. */
  newSkill: string;
  /** One reinforcement note on a prior unlocked skill, when there is one to give. */
  priorSkill?: string;
  /** The single most useful correction, on the current skill. */
  oneThingToFix: string;
  /** Whether the current skill's move is materially incomplete and should be retried. */
  retryRequired: boolean;
  nextAction: "retry" | "continue";
};

export type GuidedJudgeResult = {
  /** The marker every consumer branches on. Its presence is the proof the ballot was projected. */
  guided: {
    lessonId: string;
    primary: DebateCompetency;
    reinforcement: readonly DebateCompetency[];
    locked: readonly DebateCompetency[];
  };
  overallScore: number;
  categoryScores: Array<{ key: string; label?: string; score: number; reason?: string }>;
  strengths: string[];
  weaknesses: string[];
  improvementAdvice: string[];
  recommendedLessons: Array<{ lessonSlug: string; reason: string; priority: "high" | "medium" | "low" }>;
  guidedFeedback: GuidedFeedback;
  /** Carried through so the UI can label the provider honestly; never a score. */
  aiProvider?: unknown;
  aiNotice?: unknown;
  fallbackNotice?: unknown;
  rubricSource?: unknown;
};

/** Below this, the current skill's move is treated as materially incomplete and a retry is asked for. */
export const GUIDED_RETRY_THRESHOLD = 60;

/** The one thing to fix when a round asks for a retry, in each lesson's own terms — never a rewrite. */
export const COMPETENCY_FIX: Readonly<Record<DebateCompetency, string>> = {
  "claim-warrant-impact": "Rebuild the argument: state the claim, give the reason it is true, say why it matters.",
  refutation: "Rebuild the refutation: name the step their argument rests on, give the reason it fails, say what changed.",
  clash: "Name the question both sides are answering before you answer it, and state it so that either side could still win it.",
  // Was "number the points and say which one you are on" — which instructs the learner to do the very
  // thing the Signposting lesson marks wrong ("on their second point" only lands if the judge numbered
  // their notes as you did). Signposting is locked in every guided rubric, so this string is unreachable
  // today; it is corrected rather than left as a trap for whoever unlocks it.
  signposting: "Name the argument each answer is aimed at, in words that identify it rather than its number or its speaker.",
  "constructive-speech": "Build your own case first: claim, reason, impact, in that order.",
  weighing: "Compare the impacts: say which matters more and why."
};

/** Advice lines the local judge writes as a model rewrite of the student's own sentence. A guided
 *  round coaches the learner's move and never writes it for them, so these never reach a guided ballot. */
const REWRITE_ADVICE = /^(better sentence to add|model rewrite)\b/i;

const normalize = (score: number) => Math.max(0, Math.min(100, Math.round(score <= 5 ? score * 20 : score)));

/** Does this prose name any LOCKED competency? Locked-skill prose is dropped, never trimmed. */
function namesLocked(text: string, locked: readonly DebateCompetency[]): boolean {
  return locked.some((competency) => mentionsCompetency(text, competency));
}

/** The competency a judge recommendation is about, resolved from the JUDGE slug's canonical lesson. */
const JUDGE_SLUG_LESSON: Readonly<Record<string, string>> = {
  "debate-refutation-lesson": "debate-refutation",
  "debate-clash-lesson": "debate-clash",
  "debate-signposting-lesson": "debate-signposting",
  "debate-claim-warrant-impact-lesson": "claim-warrant-impact",
  "debate-weighing-lesson": "debate-weighing",
  "debate-constructive-speeches-lesson": "debate-constructive-speeches"
};

function competencyForRecommendation(lessonSlug: string): DebateCompetency | null {
  const canonical = JUDGE_SLUG_LESSON[lessonSlug] ?? lessonSlug;
  const match = (Object.entries(COMPETENCY_LESSON) as Array<[DebateCompetency, string]>)
    .find(([, lesson]) => lesson === canonical);
  return match ? match[0] : null;
}

/**
 * Project a FULL judge result onto a guided rubric. The result of this function is what gets
 * persisted and returned; the full result never leaves the route in a guided round.
 */
export function projectGuidedJudgeResult(
  full: FullJudgeResultLike,
  rubric: GuidedRubric,
  lessonId: string
): GuidedJudgeResult {
  const allowed = new Set(allowedJudgeCategories(rubric));
  // A category's own `reason` is learner-facing prose and gets the same treatment as every other
  // line on the ballot: if it names a locked competency the reason is dropped and the score stays.
  const categoryScores = full.categoryScores
    .filter((category) => allowed.has(category.key))
    .map((category) => ({
      ...category,
      score: normalize(category.score),
      ...(category.reason && namesLocked(category.reason, rubric.locked) ? { reason: undefined } : {})
    }));
  const overallScore = categoryScores.length > 0
    ? Math.round(categoryScores.reduce((sum, category) => sum + category.score, 0) / categoryScores.length)
    : 0;

  const keepProse = (items: readonly string[] | undefined) =>
    (items ?? []).filter((text) => typeof text === "string" && text.trim().length > 0 && !namesLocked(text, rubric.locked));

  const unlocked = new Set<DebateCompetency>([rubric.primary, ...rubric.reinforcement]);
  const recommendedLessons = (full.recommendedLessons ?? []).filter((recommendation) => {
    const competency = competencyForRecommendation(recommendation.lessonSlug);
    return competency !== null && unlocked.has(competency) && !namesLocked(recommendation.reason, rubric.locked);
  });

  return {
    guided: { lessonId, primary: rubric.primary, reinforcement: rubric.reinforcement, locked: rubric.locked },
    overallScore,
    categoryScores,
    strengths: keepProse(full.strengths),
    weaknesses: keepProse(full.weaknesses),
    improvementAdvice: keepProse(full.improvementAdvice).filter((text) => !REWRITE_ADVICE.test(text.trim())),
    recommendedLessons,
    guidedFeedback: guidedFeedbackFrom(categoryScores, rubric),
    aiProvider: full.aiProvider,
    aiNotice: full.aiNotice,
    fallbackNotice: full.fallbackNotice,
    rubricSource: full.rubricSource
  };
}

/**
 * The small feedback structure a guided round returns instead of a full ballot. Built from the
 * surviving categories only, so it cannot mention what was never scored.
 */
export function guidedFeedbackFrom(
  categoryScores: ReadonlyArray<{ key: string; label?: string; score: number; reason?: string }>,
  rubric: GuidedRubric
): GuidedFeedback {
  const forCompetency = (competency: DebateCompetency) =>
    categoryScores.filter((category) => JUDGE_CATEGORY_COMPETENCY[category.key] === competency);
  const mean = (items: ReadonlyArray<{ score: number }>) =>
    items.length > 0 ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length) : null;

  const primaryCategories = forCompetency(rubric.primary);
  const primaryScore = mean(primaryCategories);
  const primaryLabel = COMPETENCY_LABELS[rubric.primary];
  const best = [...primaryCategories].sort((a, b) => b.score - a.score)[0];
  const worst = [...primaryCategories].sort((a, b) => a.score - b.score)[0];

  // When the primary skill has a single surviving category (or both of its categories carry the
  // same reason), "your new skill" and "one thing to fix" would be the same sentence under two
  // headings. In that case the new-skill line states the result and the reason is kept for the fix.
  const distinctReasons = Boolean(best?.reason) && best !== worst && best?.reason !== worst?.reason;
  const measure = COMPETENCY_ROUND_MEASURE[rubric.primary];
  // An adjacent measure is named by what it measured, never by the skill's name alone — "Clash: …"
  // under a "your new skill" heading would read as proof of identification.
  const measuredAs = measure.direct ? primaryLabel : `${primaryLabel} in the round (${measure.label})`;
  const newSkill = primaryScore === null
    ? `${measuredAs} could not be assessed from this round — nothing here counts against you.`
    : distinctReasons
      ? `${measuredAs}: ${best.reason}`
      : `${measuredAs} scored ${primaryScore} on this practice ballot.`;

  const retryRequired = primaryScore !== null && primaryScore < GUIDED_RETRY_THRESHOLD;
  // The lexical judge's category reasons are engagement-shaped ("name their best point and beat it"),
  // which is refutation advice. When the round asks for a retry, the fix line is the CURRENT skill's
  // own move, in that lesson's terms; otherwise the category reason stands as the diagnosis.
  const oneThingToFix = retryRequired
    ? COMPETENCY_FIX[rubric.primary]
    : worst?.reason ?? `Keep the ${primaryLabel.toLowerCase()} move complete every time you use it.`;

  const prior = rubric.reinforcement
    .map((competency) => ({ competency, score: mean(forCompetency(competency)), categories: forCompetency(competency) }))
    .find((entry) => entry.score !== null);
  const priorSkill = prior
    ? `${COMPETENCY_LABELS[prior.competency]}: ${prior.categories.find((c) => c.reason)?.reason ?? `scored ${prior.score} here — keep using it.`}`
    : undefined;

  return {
    measure,
    newSkill,
    priorSkill,
    oneThingToFix,
    retryRequired,
    nextAction: retryRequired ? "retry" : "continue"
  };
}

/**
 * The instruction added to the judge's PROSE prompt in a guided round, so the provider is asked to
 * write only about unlocked skills. The numeric categories are local and are projected regardless;
 * this limits the evaluation CONTRACT, not merely the display.
 */
export function guidedJudgeProseInstruction(rubric: GuidedRubric): string {
  const unlocked = [rubric.primary, ...rubric.reinforcement].map((c) => COMPETENCY_LABELS[c]).join(", ");
  const locked = rubric.locked.map((c) => COMPETENCY_LABELS[c]).join(", ");
  return [
    `GUIDED LESSON ROUND. The student is learning ${COMPETENCY_LABELS[rubric.primary]}.`,
    `Write ONLY about these skills: ${unlocked}.`,
    ...(COMPETENCY_ROUND_MEASURE[rubric.primary].direct ? [] : [
      `For ${COMPETENCY_LABELS[rubric.primary]}, this round shows ${COMPETENCY_ROUND_MEASURE[rubric.primary].label} only. Describe how the student engaged the disagreement; do not say the student can or cannot identify the clash — that was checked in the lesson, not here.`
    ]),
    `Do NOT evaluate, mention, or penalise: ${locked}. Do not comment on dropped arguments, weighing, signposting, speech structure, or time use.`,
    "Do not declare a winner or a loser. Do not rewrite the student's sentences. Coach the current skill; name one thing to fix."
  ].join(" ");
}
