/**
 * GUIDED ROUND ROW MARKER — the one place that says how a stored Debate row declares itself a
 * guided lesson round, and the one predicate every independent-performance consumer uses.
 *
 * WHY A ROW MARKER. A guided round is a coached teaching exercise: its ballot is curriculum-limited
 * and it moves no part of the learner's record. Before this module, guided-ness lived only in the
 * URL (`?guided=`) and in the judge request body, so a stored JUDGED + completedAt row was
 * indistinguishable from an independent competitive round to every counter, average, history list
 * and coach view. The marker is decided SERVER-SIDE AT CREATION (app/api/debates/route.ts validates
 * the lesson against curriculum truth) and persisted with NO schema change:
 *   - `practiceMode = "LESSON"` — a value the Prisma enum has carried since the schema was written
 *     and that no creator ever set, so no existing row means anything else by it;
 *   - `formatConfig.guidedLessonId` — the lesson, on the row, so the judge and the arena read the
 *     rubric from the ROW and never from a later client claim.
 *
 * PURE. No Prisma import, no lib/education import, so any page or lib module may use it.
 */

/** Prisma `where` fragment: rounds that count as INDEPENDENT performance. Guided lesson rounds are
 *  excluded; every other practice mode (DEBATE, ROLEPLAY, TEST) is unchanged. */
export const INDEPENDENT_ROUND_WHERE = { practiceMode: { not: "LESSON" } } as const;

/** In-memory twin of `INDEPENDENT_ROUND_WHERE`, for consumers that filter a fetched list. */
export function isIndependentRound(row: { practiceMode: string }): boolean {
  return row.practiceMode !== "LESSON";
}

/** A guided lesson round, as the ROW declares it. Both halves must agree: the mode says LESSON and
 *  the format config names the lesson. Anything else is not a guided round (fail closed). */
export function guidedLessonIdOf(row: { practiceMode: string; formatConfig: unknown }): string | null {
  if (row.practiceMode !== "LESSON") return null;
  const config = row.formatConfig;
  if (!config || typeof config !== "object" || Array.isArray(config)) return null;
  const id = (config as { guidedLessonId?: unknown }).guidedLessonId;
  return typeof id === "string" && id.trim().length > 0 ? id : null;
}

/** The learner-facing name of a guided lesson round wherever rounds are listed. */
export const GUIDED_ROUND_LABEL = "Guided exercise";
