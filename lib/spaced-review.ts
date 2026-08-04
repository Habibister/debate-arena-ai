import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Spaced Reassessment v1 (Study Arcade review loop). Deliberately simple and honest:
// - passing practice advances an expanding-interval ladder (1d -> 3d -> 7d -> 14d, then stays 14d)
// - failing resets the ladder to 1 day
// - a skill only KEEPS its mastery if it survives reviews; the practice route knocks mastery down
//   when a due review is failed
// Every read/write is defensive: if the SkillReviewSchedule table is missing (fresh environment
// before db push), the review system degrades to "nothing due" instead of breaking pages.

export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14] as const;
const DAY_MS = 24 * 60 * 60 * 1000;
/** How far two engine-written timestamps on one row may sit apart and still be the same write. */
const SAME_WRITE_TOLERANCE_MS = 1000;

export function intervalDaysFor(reviewCount: number): number {
  return REVIEW_INTERVALS_DAYS[Math.min(Math.max(reviewCount, 0), REVIEW_INTERVALS_DAYS.length - 1)];
}

function daysFrom(now: Date, days: number): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

// True when this skill's review was due at practice time.
//
// Still exported for read-only callers, but `recordPracticeOutcome` no longer uses it: due-ness and
// the write must be decided from ONE read against ONE timestamp, or an attempt can cross the due
// boundary between the check and the mutation.
export async function isReviewDue(userId: string, skillId: string, now: Date = new Date()): Promise<boolean> {
  try {
    const row = await prisma.skillReviewSchedule.findUnique({
      where: { userId_skillId: { userId, skillId } },
      select: { nextReviewAt: true }
    });
    return Boolean(row && row.nextReviewAt <= now);
  } catch {
    return false;
  }
}

// --- The due-gated review ladder (M13E1G) -----------------------------------------------------------
//
// WHAT WAS WRONG. The previous implementation incremented `reviewCount` BEFORE indexing the interval
// table, so index 0 was unreachable on a pass and the very first success scheduled +3 days rather
// than the documented +1. It never consulted due-ness at all, so four submissions seconds apart
// walked 3d -> 7d -> 14d -> 14d: "survived spaced reassessment" could be manufactured in under a
// minute. And a failure reset the ladder from ANY state, so ordinary practice a week before a review
// was due still punished the learner. Finally it returned `void` from inside a bare catch, so no
// caller could ever know whether a row had been written — which is how three learner-facing surfaces
// came to claim a review was scheduled when nothing had been.
//
// THE CONTRACT NOW. Exactly one submission may mutate a given due window:
//
//   no row            -> create a 1-day first schedule (count 1 on a pass, 0 on a fail)
//   row, not due      -> NO WRITE. The schedule is preserved exactly as it stands.
//   row, due/overdue  -> compare-and-set against the exact snapshot that was read. A pass advances
//                        one rung using the PRE-increment count; a failure resets to count 0 / 1 day.
//
// The CAS predicate matches `reviewCount` AND `nextReviewAt` exactly, not merely `nextReviewAt <= now`,
// so a row another writer has already moved — in either direction — is never overwritten. The loser
// of a race performs no write and says so; it is a deliberate no-op, not a failure.
//
// NOT replay-resistant: nothing binds a submission to a served session, and this milestone does not
// claim otherwise.

export type ReviewPracticeResult =
  | { status: "created"; dueState: "no-schedule"; previousReviewCount: null; reviewCount: number;
      previousNextReviewAt: null; nextReviewAt: Date; scheduleChanged: true }
  | { status: "advanced"; dueState: "due"; previousReviewCount: number; reviewCount: number;
      previousNextReviewAt: Date; nextReviewAt: Date; scheduleChanged: true }
  | { status: "reset-after-due-failure"; dueState: "due"; previousReviewCount: number; reviewCount: 0;
      previousNextReviewAt: Date; nextReviewAt: Date; scheduleChanged: true }
  | { status: "preserved-not-due"; dueState: "not-due"; previousReviewCount: number; reviewCount: number;
      previousNextReviewAt: Date; nextReviewAt: Date; scheduleChanged: false }
  | { status: "preserved-concurrent-existing"; dueState: "due"; previousReviewCount: number; reviewCount: number;
      previousNextReviewAt: Date; nextReviewAt: Date; scheduleChanged: false }
  // A create race has no previous row and no due determination, so both are null rather than invented.
  | { status: "preserved-concurrent-created"; dueState: "no-schedule"; previousReviewCount: null; reviewCount: number;
      previousNextReviewAt: null; nextReviewAt: Date; scheduleChanged: false }
  | { status: "write-failed"; dueState: "unknown"; scheduleChanged: false };

/** JSON-safe view for API responses. Every Date becomes an explicit ISO string — never implicit. */
export type ReviewResultDTO = {
  status: ReviewPracticeResult["status"];
  dueState: "due" | "not-due" | "no-schedule" | "unknown";
  previousReviewCount: number | null;
  reviewCount: number | null;
  previousNextReviewAt: string | null;
  nextReviewAt: string | null;
  scheduleChanged: boolean;
};

export function serializeReviewResult(result: ReviewPracticeResult): ReviewResultDTO {
  if (result.status === "write-failed") {
    return {
      status: result.status,
      dueState: result.dueState,
      previousReviewCount: null,
      reviewCount: null,
      previousNextReviewAt: null,
      nextReviewAt: null,
      scheduleChanged: false
    };
  }
  return {
    status: result.status,
    dueState: result.dueState,
    previousReviewCount: result.previousReviewCount,
    reviewCount: result.reviewCount,
    previousNextReviewAt: result.previousNextReviewAt ? result.previousNextReviewAt.toISOString() : null,
    nextReviewAt: result.nextReviewAt.toISOString(),
    scheduleChanged: result.scheduleChanged
  };
}

type ScheduleRow = {
  id: string;
  reviewCount: number;
  nextReviewAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Is a refetched row the untouched first schedule another submission just created?
 *
 * Compares the row's own timestamps to EACH OTHER, never to this request's clock: two concurrent
 * requests generate their own `now` milliseconds apart, so an equality test against our `now` would
 * reject every genuine race. `createdAt` and `updatedAt` are both engine-written, and only
 * `updatedAt` moves on a later write — so an untouched row has them together, and a first schedule
 * sits exactly one day after its own creation. The nearest thing this could be confused with is a
 * 3-day advance, two days away.
 */
function isUntouchedFirstSchedule(row: ScheduleRow, now: Date): boolean {
  if (row.reviewCount !== 0 && row.reviewCount !== 1) return false;
  if (row.nextReviewAt <= now) return false; // already due — not a fresh first schedule
  const untouched = Math.abs(row.updatedAt.getTime() - row.createdAt.getTime()) <= SAME_WRITE_TOLERANCE_MS;
  const firstShape = Math.abs(row.nextReviewAt.getTime() - row.createdAt.getTime() - DAY_MS) <= SAME_WRITE_TOLERANCE_MS;
  return untouched && firstShape;
}

const SCHEDULE_FIELDS = { id: true, reviewCount: true, nextReviewAt: true, createdAt: true, updatedAt: true } as const;

/**
 * Record one graded practice against the spaced-review ladder.
 *
 * Returns the exact mutation (or non-mutation) so callers can tell a learner the truth. Existing
 * callers may keep ignoring the return value — the previous signature was `Promise<void>` and every
 * call site discarded it.
 */
export async function recordPracticeOutcome(params: {
  userId: string;
  skillId: string;
  passed: boolean;
  /** Server-only. One timestamp governs the whole submission; no client input reaches this. */
  now?: Date;
}): Promise<ReviewPracticeResult> {
  const { userId, skillId, passed } = params;
  const now = params.now ?? new Date();
  const lastOutcome = passed ? "passed" : "failed";

  try {
    const existing = (await prisma.skillReviewSchedule.findUnique({
      where: { userId_skillId: { userId, skillId } },
      select: SCHEDULE_FIELDS
    })) as ScheduleRow | null;

    // ---- no row: create the first schedule, always one day out -------------------------------------
    if (!existing) {
      const reviewCount = passed ? 1 : 0;
      const nextReviewAt = daysFrom(now, 1);
      try {
        await prisma.skillReviewSchedule.create({ data: { userId, skillId, reviewCount, nextReviewAt, lastOutcome } });
        return { status: "created", dueState: "no-schedule", previousReviewCount: null, reviewCount,
                 previousNextReviewAt: null, nextReviewAt, scheduleChanged: true };
      } catch {
        // Only a unique-key conflict can legitimately land here: another submission created the row
        // between our read and our write. Refetch and accept it ONLY if it is that untouched row.
        const raced = (await prisma.skillReviewSchedule.findUnique({
          where: { userId_skillId: { userId, skillId } },
          select: SCHEDULE_FIELDS
        })) as ScheduleRow | null;
        if (raced && isUntouchedFirstSchedule(raced, now)) {
          return { status: "preserved-concurrent-created", dueState: "no-schedule", previousReviewCount: null,
                   reviewCount: raced.reviewCount, previousNextReviewAt: null, nextReviewAt: raced.nextReviewAt,
                   scheduleChanged: false };
        }
        return { status: "write-failed", dueState: "unknown", scheduleChanged: false };
      }
    }

    // ---- row exists but the review is not due yet: preserve it untouched ---------------------------
    if (existing.nextReviewAt > now) {
      return { status: "preserved-not-due", dueState: "not-due", previousReviewCount: existing.reviewCount,
               reviewCount: existing.reviewCount, previousNextReviewAt: existing.nextReviewAt,
               nextReviewAt: existing.nextReviewAt, scheduleChanged: false };
    }

    // ---- due or overdue: compare-and-set against the exact snapshot we read -------------------------
    const priorCount = existing.reviewCount;
    const priorNext = existing.nextReviewAt;
    const reviewCount = passed ? priorCount + 1 : 0;
    // Pre-increment indexing: the first pass takes index 0 (1 day), which the old code could never reach.
    const nextReviewAt = daysFrom(now, passed ? intervalDaysFor(priorCount) : intervalDaysFor(0));

    const { count } = await prisma.skillReviewSchedule.updateMany({
      where: { userId, skillId, reviewCount: priorCount, nextReviewAt: priorNext },
      data: { reviewCount, nextReviewAt, lastOutcome }
    });

    if (count === 1) {
      return passed
        ? { status: "advanced", dueState: "due", previousReviewCount: priorCount, reviewCount,
            previousNextReviewAt: priorNext, nextReviewAt, scheduleChanged: true }
        : { status: "reset-after-due-failure", dueState: "due", previousReviewCount: priorCount, reviewCount: 0,
            previousNextReviewAt: priorNext, nextReviewAt, scheduleChanged: true };
    }

    // CAS matched nothing: another submission mutated this row first. Report what actually stands.
    const current = (await prisma.skillReviewSchedule.findUnique({
      where: { userId_skillId: { userId, skillId } },
      select: SCHEDULE_FIELDS
    })) as ScheduleRow | null;
    if (!current) return { status: "write-failed", dueState: "unknown", scheduleChanged: false };
    return { status: "preserved-concurrent-existing", dueState: "due", previousReviewCount: priorCount,
             reviewCount: current.reviewCount, previousNextReviewAt: priorNext,
             nextReviewAt: current.nextReviewAt, scheduleChanged: false };
  } catch {
    // table not pushed yet, or the write broke — reported, never silently swallowed
    return { status: "write-failed", dueState: "unknown", scheduleChanged: false };
  }
}

export async function countDueReviews(userId: string): Promise<number> {
  try {
    return await prisma.skillReviewSchedule.count({ where: { userId, nextReviewAt: { lte: new Date() } } });
  } catch {
    return 0;
  }
}

export type DueReview = {
  skillId: string;
  skillName: string;
  skillSlug: string;
  organization: string;
  nextReviewAt: Date;
  reviewCount: number;
  masteryPercent: number;
  masteryLevel: string;
};

// Due reviews joined with skill + current mastery, for the review session page.
export async function getDueReviews(userId: string): Promise<DueReview[]> {
  try {
    const rows = await prisma.skillReviewSchedule.findMany({
      where: { userId, nextReviewAt: { lte: new Date() } },
      orderBy: { nextReviewAt: "asc" },
      take: 50
    });
    if (rows.length === 0) return [];

    const skillIds = rows.map((row) => row.skillId);
    const [skills, mastery] = await Promise.all([
      prisma.skill.findMany({ where: { id: { in: skillIds } }, select: { id: true, name: true, slug: true, organization: true } }),
      prisma.masteryProgress.findMany({
        where: { userId, skillId: { in: skillIds } },
        select: { skillId: true, masteryPercent: true, masteryLevel: true }
      })
    ]);
    const skillById = new Map(skills.map((skill) => [skill.id, skill]));
    const masteryBySkill = new Map(mastery.map((m) => [m.skillId, m]));

    return rows.flatMap((row) => {
      const skill = skillById.get(row.skillId);
      if (!skill) return [];
      const progress = masteryBySkill.get(row.skillId);
      return [
        {
          skillId: row.skillId,
          skillName: skill.name,
          skillSlug: skill.slug,
          organization: skill.organization,
          nextReviewAt: row.nextReviewAt,
          reviewCount: row.reviewCount,
          masteryPercent: progress?.masteryPercent ?? 0,
          masteryLevel: progress?.masteryLevel ?? "NOT_STARTED"
        }
      ];
    });
  } catch {
    return [];
  }
}

// --- Drill mastery write (shared by concept-drill submit routes) ------------------------------
// Writes real MasteryProgress AND spaced review for one skill, consistently and honestly:
// - masteryPercent rises toward the demonstrated score, but a FAILED due review knocks it DOWN to
//   what was actually shown (mastery must survive review — no ratcheting past a failed reassessment)
// - resolves the skill by slug and no-ops gracefully if the skill isn't seeded yet (never fakes it)
// Returns whether it actually wrote (skill existed), so callers can report honestly.

function masteryLevelFor(score: number): "MASTERED" | "PRACTICING" | "LEARNING" {
  if (score >= 85) return "MASTERED";
  if (score >= 70) return "PRACTICING";
  return "LEARNING";
}

/**
 * Why the boolean is not enough (M13E1D), and why review comes first (M13E1G).
 *
 * `false` originally conflated "this skill has no row yet" with "the write threw". A learner told
 * "this skill isn't set up for progress tracking yet" after a transient database error has been told
 * something false. Note that an exception raised BY THE LOOKUP ITSELF is `write-failed`, never
 * `skill-missing`: a query that could not run has not established that the row is absent.
 *
 * M13E1G adds the fourth outcome and inverts the order. Mastery used to run its OWN `isReviewDue`
 * check and then call the review helper afterwards, so two concurrent due submissions could pick
 * different winners: the review CAS would let a passing attempt advance the ladder while the losing
 * failing attempt independently knocked mastery down. Review now runs FIRST and its result decides
 * what mastery may do — so a due window has exactly one winner in both tables.
 *
 * `preserved-concurrent` is the deliberate no-op: another submission won the window, this one wrote
 * nothing. It is neither a success nor a failure, and it must never be reported as either.
 */
export type DrillMasteryOutcome =
  | { status: "updated"; review: ReviewPracticeResult }
  | { status: "preserved-concurrent";
      review: Extract<ReviewPracticeResult, { status: "preserved-concurrent-existing" }>
            | Extract<ReviewPracticeResult, { status: "preserved-concurrent-created" }> }
  | { status: "skill-missing"; review: null }
  | { status: "write-failed"; review: ReviewPracticeResult | null };

/** True only when the review result licenses lowering an existing mastery percentage. */
export function masteryMayDecrease(review: ReviewPracticeResult): boolean {
  return review.status === "reset-after-due-failure";
}

export async function recordDrillMasteryDetailed(params: {
  userId: string;
  skillSlug: string;
  scorePercent: number;
  passed: boolean;
  /** Server-only. One timestamp governs the whole submission; no client input reaches this. */
  now?: Date;
}): Promise<DrillMasteryOutcome> {
  const { userId, skillSlug, scorePercent, passed } = params;
  const now = params.now ?? new Date();
  let review: ReviewPracticeResult | null = null;
  try {
    const skill = await prisma.skill.findUnique({ where: { slug: skillSlug }, select: { id: true } });
    if (!skill) return { status: "skill-missing", review: null }; // not seeded — never fabricate progress

    // REVIEW FIRST: its result elects the due-window winner and decides what mastery may do. There is
    // deliberately no independent due-check here any more.
    review = await recordPracticeOutcome({ userId, skillId: skill.id, passed, now });

    // The loser of a race writes nothing at all — not a zero, not a counter, not a ratchet.
    if (review.status === "preserved-concurrent-existing" || review.status === "preserved-concurrent-created") {
      return { status: "preserved-concurrent", review };
    }

    const existing = await prisma.masteryProgress.findUnique({
      where: { userId_skillId: { userId, skillId: skill.id } },
      select: { id: true, masteryPercent: true }
    });
    // A failed DUE reassessment is the ONLY branch that may lower mastery. Everything else — an
    // initial schedule, an advance, a pre-due practice, even a failed review write — is upward-only.
    const nextMastery =
      masteryMayDecrease(review)
        ? Math.min(existing?.masteryPercent ?? 0, scorePercent)
        : Math.min(100, Math.max(existing?.masteryPercent ?? 0, scorePercent));

    if (existing) {
      await prisma.masteryProgress.update({
        where: { id: existing.id },
        data: {
          masteryLevel: masteryLevelFor(nextMastery),
          masteryPercent: nextMastery,
          correctCount: { increment: passed ? 1 : 0 },
          incorrectCount: { increment: passed ? 0 : 1 },
          lastPracticedAt: new Date()
        }
      });
    } else {
      await prisma.masteryProgress.create({
        data: {
          userId,
          skillId: skill.id,
          masteryLevel: masteryLevelFor(nextMastery),
          masteryPercent: nextMastery,
          correctCount: passed ? 1 : 0,
          incorrectCount: passed ? 0 : 1,
          lastPracticedAt: new Date()
        }
      });
    }

    return { status: "updated", review };
  } catch {
    // A review mutation that truthfully landed is preserved here rather than rolled back: the
    // schedule really did move, and the learner is entitled to be told so even though mastery failed.
    return { status: "write-failed", review };
  }
}

/**
 * The original boolean contract, unchanged for every existing caller: `true` ONLY when mastery was
 * actually written. A deliberate concurrency no-op returns `false` — it wrote nothing, so claiming
 * otherwise would put a slug into `wroteSkills` that no mastery row backs.
 */
export async function recordDrillMastery(params: {
  userId: string;
  skillSlug: string;
  scorePercent: number;
  passed: boolean;
  /** Server-only, optional. Callers that omit it keep the previous behaviour exactly. */
  now?: Date;
}): Promise<boolean> {
  const outcome = await recordDrillMasteryDetailed(params);
  return outcome.status === "updated";
}

// ==================================================================================================
// TRANSACTION-NATIVE CORES (M13E2 Phase C1)
//
// ADDITIVE ONLY. Everything above this line is the public M13E1G surface and is unchanged: the
// seven-variant result, the returned `write-failed`, the missing-table degradation, the create-race
// classification, and the guarantee that a review mutation which truthfully landed is preserved even
// when a later mastery write fails. Nothing below is called by those helpers, and they are NOT
// rewritten to call it.
//
// Why a separate path exists at all: inside a PostgreSQL interactive transaction a failed statement
// aborts the whole transaction, so the public helpers' pattern — provoke a unique violation, catch
// it, then issue another query to classify the race — cannot work there. The recovery query would
// fail with 25P02 and so would every later write in the enclosing transaction. These cores therefore
// never provoke a constraint violation: `ON CONFLICT DO NOTHING` returns zero rows instead of
// raising, and the existing row is then locked. A genuine database error throws and rolls the caller
// back; there is deliberately NO `write-failed` status here, because returning one would mean
// continuing to issue queries on a transaction that is already dead.
//
// The caller MUST already hold the user row lock (see `lockUserRow` in lib/practice-session.ts).
// No route calls these yet — the C2 cutover wires them up.

export type TxReviewOutcome =
  | { status: "created"; previousReviewCount: null; reviewCount: number; previousNextReviewAt: null; nextReviewAt: Date }
  | { status: "advanced"; previousReviewCount: number; reviewCount: number; previousNextReviewAt: Date; nextReviewAt: Date }
  | { status: "reset-after-due-failure"; previousReviewCount: number; reviewCount: 0; previousNextReviewAt: Date; nextReviewAt: Date }
  | { status: "preserved-not-due"; previousReviewCount: number; reviewCount: number; previousNextReviewAt: Date; nextReviewAt: Date };

/** Transactional twin of `masteryMayDecrease`: a failed DUE reassessment stays the only branch
 *  permitted to lower mastery. */
export function txMasteryMayDecrease(review: TxReviewOutcome): boolean {
  return review.status === "reset-after-due-failure";
}

export async function recordPracticeOutcomeInTransaction(
  tx: Prisma.TransactionClient,
  params: { userId: string; skillId: string; scorePercent: number; passed: boolean; now: Date }
): Promise<TxReviewOutcome> {
  const { userId, skillId, passed, now } = params;
  const lastOutcome = passed ? "passed" : "failed";

  // ---- no row yet: a non-throwing insert. Zero rows back means someone else already created it. ---
  const inserted = await tx.$queryRaw<Array<{ reviewCount: number; nextReviewAt: Date }>>`
    INSERT INTO "SkillReviewSchedule" ("id", "userId", "skillId", "nextReviewAt", "reviewCount", "lastOutcome", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${userId}, ${skillId}, ${daysFrom(now, 1)}, ${passed ? 1 : 0}, ${lastOutcome}, ${now}, ${now})
    ON CONFLICT ("userId", "skillId") DO NOTHING
    RETURNING "reviewCount", "nextReviewAt"`;
  if (inserted.length === 1) {
    return {
      status: "created",
      previousReviewCount: null,
      reviewCount: inserted[0].reviewCount,
      previousNextReviewAt: null,
      nextReviewAt: inserted[0].nextReviewAt
    };
  }

  // ---- a row exists: lock it, so a concurrent writer is serialized rather than raced -------------
  const locked = await tx.$queryRaw<Array<{ reviewCount: number; nextReviewAt: Date }>>`
    SELECT "reviewCount", "nextReviewAt" FROM "SkillReviewSchedule"
    WHERE "userId" = ${userId} AND "skillId" = ${skillId}
    FOR UPDATE`;
  if (locked.length !== 1) throw new Error("SkillReviewSchedule row vanished between insert and lock");
  const priorCount = locked[0].reviewCount;
  const priorNext = locked[0].nextReviewAt;

  // Not due: a TRUE no-write. The row is not touched, so `updatedAt` does not move either.
  if (priorNext > now) {
    return {
      status: "preserved-not-due",
      previousReviewCount: priorCount,
      reviewCount: priorCount,
      previousNextReviewAt: priorNext,
      nextReviewAt: priorNext
    };
  }

  // Due or overdue. The interval comes from the PRE-increment count, then the count moves.
  if (passed) {
    const nextReviewAt = daysFrom(now, intervalDaysFor(priorCount));
    await tx.skillReviewSchedule.update({
      where: { userId_skillId: { userId, skillId } },
      data: { reviewCount: priorCount + 1, nextReviewAt, lastOutcome }
    });
    return { status: "advanced", previousReviewCount: priorCount, reviewCount: priorCount + 1, previousNextReviewAt: priorNext, nextReviewAt };
  }

  const nextReviewAt = daysFrom(now, 1);
  await tx.skillReviewSchedule.update({
    where: { userId_skillId: { userId, skillId } },
    data: { reviewCount: 0, nextReviewAt, lastOutcome }
  });
  return { status: "reset-after-due-failure", previousReviewCount: priorCount, reviewCount: 0, previousNextReviewAt: priorNext, nextReviewAt };
}

export async function recordDrillMasteryInTransaction(
  tx: Prisma.TransactionClient,
  params: { userId: string; skillSlug: string; scorePercent: number; passed: boolean; now: Date; review: TxReviewOutcome }
): Promise<{ status: "updated" | "skill-missing" }> {
  const { userId, skillSlug, scorePercent, passed, now, review } = params;
  const skill = await tx.skill.findUnique({ where: { slug: skillSlug }, select: { id: true } });
  if (!skill) return { status: "skill-missing" }; // not seeded — never fabricate progress

  // Non-throwing insert first, so a concurrent unlocked creator cannot poison this transaction.
  const inserted = await tx.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "MasteryProgress" ("id", "userId", "skillId", "masteryLevel", "masteryPercent", "correctCount", "incorrectCount", "lastPracticedAt", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${userId}, ${skill.id}, ${masteryLevelFor(scorePercent)}::"MasteryLevel", ${scorePercent}, ${passed ? 1 : 0}, ${passed ? 0 : 1}, ${now}, ${now}, ${now})
    ON CONFLICT ("userId", "skillId") DO NOTHING
    RETURNING "id"`;
  if (inserted.length === 1) return { status: "updated" };

  const locked = await tx.$queryRaw<Array<{ masteryPercent: number }>>`
    SELECT "masteryPercent" FROM "MasteryProgress"
    WHERE "userId" = ${userId} AND "skillId" = ${skill.id}
    FOR UPDATE`;
  if (locked.length !== 1) throw new Error("MasteryProgress row vanished between insert and lock");

  // A failed DUE reassessment is the ONLY branch that may lower mastery — identical to the public path.
  const nextMastery = txMasteryMayDecrease(review)
    ? Math.min(locked[0].masteryPercent, scorePercent)
    : Math.min(100, Math.max(locked[0].masteryPercent, scorePercent));

  await tx.masteryProgress.update({
    where: { userId_skillId: { userId, skillId: skill.id } },
    data: {
      masteryLevel: masteryLevelFor(nextMastery),
      masteryPercent: nextMastery,
      correctCount: { increment: passed ? 1 : 0 },
      incorrectCount: { increment: passed ? 0 : 1 },
      lastPracticedAt: now
    }
  });
  return { status: "updated" };
}
