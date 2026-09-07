/**
 * CURRENT DEBATE SCORING ERA.
 *
 * On 2026-09-07 the transcript judge withdrew its `weighing` score — a count of WEIGHING_MARKERS
 * ("outweigh", "magnitude", "probability", "irreversible", ...) that carried 0.12 of the ballot.
 * Measured on matched transcripts, an honest speech gains about 3-4 points under the corrected
 * weights and a marker-stuffed one loses about 5: a spread of roughly nine points on the same
 * speech. That is a false input leaving the ballot, not anyone's debating changing.
 *
 * So `Debate.overallScore` values scored before and after that change are NOT COMPARABLE, and an
 * average mixing them reports a scoring correction as if it were student improvement or regression.
 * A coach reading a student's average would see a decline the product manufactured.
 *
 * THE BOUNDARY IS ACTIVATION, NOT AUTHORSHIP. It must be the instant the corrected code actually
 * starts scoring ballots, which is a deployment fact and is not knowable while this is unpushed
 * local work. Writing today's date here would be false: any round judged after that date but before
 * the corrected judge reaches production is still scored by the OLD semantics, and would be counted
 * as current — putting the incompatible scores straight back into the averages this exists to fix.
 *
 * So it is UNSET, and every consumer FAILS CLOSED: with no activation instant, no round can be
 * proven to be current-scoring, so the current-scoring averages are UNAVAILABLE and render "—"
 * rather than silently averaging an era they cannot identify. Unavailable, not wrong — the same rule
 * the withdrawn readiness and persuasion fields follow. Setting this is a deliberate pre-deployment
 * amendment: choose an instant at or before the deploy that activates the corrected judge.
 *
 * Matched on `completedAt`, which the judge route stamps in the same update that writes the scores,
 * so it is the time the BALLOT was produced. `createdAt` would be wrong: a debate can be created
 * under one scoring era and judged under another.
 *
 * Historical rows are untouched. They are still stored, still shown individually on the history and
 * replay pages, and still counted in "judged rounds". Only the AVERAGES scope to an era.
 */
export const CURRENT_DEBATE_SCORING_ERA_START: Date | null = null;

/**
 * A DISCRIMINATED UNION, deliberately, so the unavailable state cannot be spread away.
 *
 * The obvious shape — returning the fragment or `null` — has a silent failure mode: writing
 * `where: { ...currentScoringEraWhere() }` compiles, and spreading `null` yields `{}`, which is NO
 * FILTER. That turns the safety state into "average every era together", which is the exact bug this
 * module exists to prevent, and a comment is not a defence against it. There is nothing to spread
 * here: the caller has to read `.eligible` before it can reach a `where` fragment at all.
 */
export type ScoringEraScope =
  | { readonly eligible: false }
  | { readonly eligible: true; readonly where: { completedAt: { gte: Date } } };

export function currentScoringEraScope(): ScoringEraScope {
  if (CURRENT_DEBATE_SCORING_ERA_START === null) {
    return { eligible: false };
  }

  return { eligible: true, where: { completedAt: { gte: CURRENT_DEBATE_SCORING_ERA_START } } };
}

/** True only when the ballot is provably current-era. Unset boundary or unstamped row: false. */
export function isCurrentScoringEra(completedAt: Date | null | undefined): boolean {
  if (CURRENT_DEBATE_SCORING_ERA_START === null || !completedAt) {
    return false;
  }

  return completedAt.getTime() >= CURRENT_DEBATE_SCORING_ERA_START.getTime();
}
