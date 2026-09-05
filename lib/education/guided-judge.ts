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

export type GuidedFeedback = {
  /** What went well on the CURRENT lesson skill. */
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

const normalize = (score: number) => Math.max(0, Math.min(100, Math.round(score <= 5 ? score * 20 : score)));

/** Does this prose name any LOCKED competency? Locked-skill prose is dropped, never trimmed. */
function namesLocked(text: string, locked: readonly DebateCompetency[]): boolean {
  return locked.some((competency) => mentionsCompetency(text, competency));
}

/** The competency a judge recommendation is about, resolved from the JUDGE slug's canonical lesson. */
const JUDGE_SLUG_LESSON: Readonly<Record<string, string>> = {
  "debate-refutation-lesson": "debate-refutation",
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
  const categoryScores = full.categoryScores
    .filter((category) => allowed.has(category.key))
    .map((category) => ({ ...category, score: normalize(category.score) }));
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
    improvementAdvice: keepProse(full.improvementAdvice),
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
  const newSkill = primaryScore === null
    ? `${primaryLabel} could not be assessed from this round — nothing here counts against you.`
    : distinctReasons
      ? `${primaryLabel}: ${best.reason}`
      : `${primaryLabel} scored ${primaryScore} on this practice ballot.`;

  const retryRequired = primaryScore !== null && primaryScore < GUIDED_RETRY_THRESHOLD;
  const oneThingToFix = worst?.reason
    ? worst.reason
    : retryRequired
      ? `Rebuild the ${primaryLabel.toLowerCase()} move: name the step, give the reason it fails, say what changed.`
      : `Keep the ${primaryLabel.toLowerCase()} move complete every time you use it.`;

  const prior = rubric.reinforcement
    .map((competency) => ({ competency, score: mean(forCompetency(competency)), categories: forCompetency(competency) }))
    .find((entry) => entry.score !== null);
  const priorSkill = prior
    ? `${COMPETENCY_LABELS[prior.competency]}: ${prior.categories.find((c) => c.reason)?.reason ?? `scored ${prior.score} here — keep using it.`}`
    : undefined;

  return {
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
    `Do NOT evaluate, mention, or penalise: ${locked}. Do not comment on dropped arguments, weighing, signposting, speech structure, or time use.`,
    "Do not declare a winner or a loser. Do not rewrite the student's sentences. Coach the current skill; name one thing to fix."
  ].join(" ");
}
