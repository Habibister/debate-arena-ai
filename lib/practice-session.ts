import { randomUUID } from "node:crypto";
import type { Prisma, PracticeSessionKind } from "@prisma/client";
import { HttpError } from "@/lib/api";
import { SECURE_EVIDENCE_AREAS, aggregateSecureEvidence, type SecureAreaEvidence } from "@/lib/secure-evidence";

// Server-authoritative practice sessions (M13E2 Phase C).
//
// The server chooses the questions, shuffles each question's choices, mints an opaque id per served
// choice, and stores all of it. A submission carries a session id and nothing else, so a client can
// no longer answer bank ids it was never shown, cherry-pick a subset, or replay a stored payload.
//
// THE SNAPSHOT IS THE GRADE. Correctness comes from `PracticeSessionItem.isCorrect`, recorded when
// the learner first answered, never from a fresh bank lookup — so editing a question between issue
// and submit cannot change a grade that was already earned, and cannot silently demote mastery.
//
// PADDED ORDER. A focused pool holds nine questions but a learner may ask for twenty. We store the
// nine DISTINCT questions as item rows and store the twenty-slot order separately, so the learner
// still sees twenty slots while `@@unique([sessionId, bankQuestionId])` stays satisfied. A repeated
// slot resolves to the same item: it shows the stored first answer and is not new evidence.

export const SESSION_TTL_HOURS = 24;
export const COMPLETED_RETENTION_DAYS = 7;
export const MAX_CLEANUP_PER_START = 20;

export const SESSION_EXPIRED_MESSAGE =
  "This practice session expired before it was submitted. Start a new session; your saved progress was not changed.";
export const SESSION_UNAVAILABLE_MESSAGE = "That practice session is not available. Start a new session.";
export const SESSION_START_FAILED_MESSAGE = "Could not start a practice session. Try again in a moment.";

/** Unknown session, another learner's session, and the wrong kind are ONE response. Distinguishing
 *  them would confirm that a session id exists, which is exactly what an id-guesser wants. */
export function sessionNotFound(): never {
  throw new HttpError(SESSION_UNAVAILABLE_MESSAGE, 404);
}

export function sessionExpired(): never {
  throw new HttpError(SESSION_EXPIRED_MESSAGE, 410);
}

// ---- snapshot ------------------------------------------------------------------------------------

export type WritingScenarioSnapshot = {
  skillSlug: string;
  skillName: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ELITE";
  motion: string;
  side: string;
  prompt: string;
  hint: string;
  modelExample: string;
  rubricFocus: string[];
};

/** Written ONCE at creation into the existing `scenarioJson` column and never mutated. `resultJson`
 *  stays reserved for the completed public result, so a reader never has to guess which one it holds. */
export type PracticeSessionSnapshot =
  | { version: 1; kind: "DRILL"; requestedCount: number; order: string[] }
  | { version: 1; kind: "WRITING"; scenario: WritingScenarioSnapshot };

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.length > 0);

/**
 * Strict parser. A malformed snapshot is never guessed at or reconstructed — the padded order cannot
 * be regenerated (the count is not stored anywhere else and the draw used an unseeded shuffle), so a
 * session whose snapshot does not validate is unusable rather than silently different.
 *
 * `knownItemIds` is required for drills: every ordered id must belong to this session's stored items.
 */
export function parsePracticeSessionSnapshot(
  raw: unknown,
  expected: "DRILL" | "WRITING",
  knownItemIds?: ReadonlySet<string>
): PracticeSessionSnapshot {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) sessionNotFound();
  const value = raw as Record<string, unknown>;
  if (value.version !== 1) sessionNotFound();
  if (value.kind !== expected) sessionNotFound();

  if (expected === "WRITING") {
    const scenario = value.scenario;
    if (typeof scenario !== "object" || scenario === null) sessionNotFound();
    const s = scenario as Record<string, unknown>;
    for (const key of ["skillSlug", "skillName", "level", "motion", "side", "prompt", "hint", "modelExample"]) {
      if (typeof s[key] !== "string" || (s[key] as string).length === 0) sessionNotFound();
    }
    if (!isStringArray(s.rubricFocus)) sessionNotFound();
    return { version: 1, kind: "WRITING", scenario: scenario as WritingScenarioSnapshot };
  }

  const { requestedCount, order } = value;
  if (typeof requestedCount !== "number" || !Number.isInteger(requestedCount) || requestedCount < 1) sessionNotFound();
  if (!isStringArray(order) || order.length === 0) sessionNotFound();
  if (order.length !== requestedCount) sessionNotFound();
  if (knownItemIds) {
    for (const id of order) if (!knownItemIds.has(id)) sessionNotFound();
  }
  return { version: 1, kind: "DRILL", requestedCount, order };
}

// ---- opaque options ------------------------------------------------------------------------------

export type StoredChoice = { optionId: string; text: string };

export function parseStoredChoices(raw: unknown): StoredChoice[] {
  if (!Array.isArray(raw)) sessionNotFound();
  const choices = raw.map((entry) => {
    if (typeof entry !== "object" || entry === null) sessionNotFound();
    const c = entry as Record<string, unknown>;
    if (typeof c.optionId !== "string" || typeof c.text !== "string") sessionNotFound();
    return { optionId: c.optionId, text: c.text };
  });
  if (choices.length === 0) sessionNotFound();
  return choices;
}

/**
 * Shuffle the choices and mint a fresh random id for each. The ids carry no information: they are
 * not the bank index, not a letter, and not a stable `o0..o3`, so a client cannot infer the answer
 * from the identifier or replay one session's mapping against another. No secret is involved.
 */
export function buildServedChoices(
  choices: string[],
  correctAnswer: string,
  // Injectable only so tests can assert the shuffle actually reorders; production always uses Math.random.
  rng: () => number = Math.random
): {
  stored: StoredChoice[];
  correctOptionId: string;
} {
  const shuffled = [...choices];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const stored = shuffled.map((text) => ({ optionId: randomUUID(), text }));
  const correct = stored.find((choice) => choice.text === correctAnswer);
  // A bank item whose correct answer is not among its own choices is a content bug, not a learner
  // action; fail closed rather than issue a session that can never be answered correctly.
  if (!correct) throw new HttpError(SESSION_START_FAILED_MESSAGE, 503);
  return { stored, correctOptionId: correct.optionId };
}

// ---- transaction helpers -------------------------------------------------------------------------

/**
 * The serialization point for ONE learner. For a practice session it must be the first database
 * statement of the start/submit transaction: it makes two concurrent starts produce one active
 * session, and it makes the loser of two concurrent submits wait and then observe the winner's
 * committed COMPLETED row instead of grading a second time.
 *
 * M15 S1A A4a — the reward writers reuse this exact primitive rather than duplicating the raw
 * `FOR UPDATE`, because a second copy of a security-critical lock is the kind of thing that drifts.
 * They call it as the SECOND statement, immediately after their own A2 same-source claim, which is
 * what serializes the daily XP quota across DISTINCT sources.
 *
 * `onMissing` exists only so those callers can report an accurate error. The default is unchanged,
 * so all eight practice-session callers keep byte-identical behaviour: a vanished user row still
 * produces `sessionNotFound()`. A judge or grade route has no session, and answering
 * "this practice session is no longer available" there would be a false statement about what failed.
 */
export async function lockUserRow(
  tx: Prisma.TransactionClient,
  userId: string,
  onMissing: () => never = sessionNotFound
): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
  // No row means the authenticated user no longer exists. Fail rather than continue unserialized:
  // every guarantee below this line assumes this lock is held.
  if (!Array.isArray(rows) || rows.length !== 1) onMissing();
}

/**
 * Bounded, active-user-scoped cleanup. Select at most N ids, then delete exactly those — Prisma's
 * `deleteMany` has no portable LIMIT, and an unbounded delete on a learner request is not acceptable
 * on a shared production database. Item rows go with the session by cascade.
 */
export async function cleanupExpiredSessions(
  tx: Prisma.TransactionClient,
  userId: string,
  now: Date
): Promise<number> {
  const stale = await tx.practiceSession.findMany({
    where: { userId, purgeAfter: { lt: now } },
    select: { id: true },
    take: MAX_CLEANUP_PER_START
  });
  if (stale.length === 0) return 0;
  const { count } = await tx.practiceSession.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  return count;
}

/**
 * The ONLY where-clause used to read a learner's retained EXPOSURE history for measurement-validity
 * exclusions. Exported so its SHAPE can be asserted structurally: an earlier text-based check was
 * bypassable by hoisting a forbidden filter out of the grepped window, which silently degraded the
 * rule to answered-only. The assertion now follows the code wherever it is written.
 *
 * Exposure means ISSUED. There is deliberately NO predicate on answeredAt, selectedOptionId or
 * isCorrect: a learner who merely saw a measurement-dependent sibling's choices has already received
 * its answer logic, whether or not they answered.
 */
export function retainedExposureWhere(userId: string, kind: PracticeSessionKind) {
  return { session: { userId, kind } };
}

export function expiryFor(now: Date): { expiresAt: Date; purgeAfter: Date } {
  const expiresAt = new Date(now.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000);
  return { expiresAt, purgeAfter: new Date(expiresAt.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000) };
}

export function completedPurgeAfter(now: Date): Date {
  return new Date(now.getTime() + COMPLETED_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/** The newest unexpired ISSUED session for this kind, or null. Called under the user lock, so a
 *  concurrent start blocks and then sees whatever this transaction committed. */
export async function findActiveSession(
  tx: Prisma.TransactionClient,
  userId: string,
  kind: PracticeSessionKind,
  now: Date
) {
  return tx.practiceSession.findFirst({
    where: { userId, kind, status: "ISSUED", expiresAt: { gt: now } },
    orderBy: { issuedAt: "desc" },
    include: { items: { orderBy: { displayOrder: "asc" } } }
  });
}

// ---- start-response serialization ----------------------------------------------------------------

export type ServedChoice = { optionId: string; text: string };

export type ServedItem = {
  itemId: string;
  bankQuestionId: string;
  prompt: string;
  choices: ServedChoice[];
  area: string;
  displayOrder: number;
  answered: boolean;
  selectedOptionId?: string;
  correct?: boolean;
  correctAnswer?: string;
  explanation?: string;
};

export type SessionStartResponse = {
  sessionId: string;
  kind: PracticeSessionKind;
  issuedAtIso: string;
  expiresAtIso: string;
  items: ServedItem[];
  order: string[];
  resumed: boolean;
};

type ItemRow = {
  id: string;
  bankQuestionId: string;
  displayOrder: number;
  promptSnapshot: string;
  choicesJson: Prisma.JsonValue;
  correctOptionId: string;
  explanationSnapshot: string;
  area: string;
  skillSlug: string;
  selectedOptionId: string | null;
  isCorrect: boolean | null;
  answeredAt: Date | null;
};

/**
 * The answer key is revealed ONLY for items the learner has already answered — that is the state
 * needed to restore the screen after a refresh. An unanswered item ships its prompt and its shuffled
 * choices and nothing else: no correct answer, no correct option id, no explanation.
 */
export function serveItem(item: ItemRow): ServedItem {
  const choices = parseStoredChoices(item.choicesJson);
  const base: ServedItem = {
    itemId: item.id,
    bankQuestionId: item.bankQuestionId,
    prompt: item.promptSnapshot,
    choices: choices.map((c) => ({ optionId: c.optionId, text: c.text })),
    area: item.area,
    displayOrder: item.displayOrder,
    answered: item.selectedOptionId !== null
  };
  if (item.selectedOptionId === null) return base;
  return {
    ...base,
    selectedOptionId: item.selectedOptionId,
    correct: item.isCorrect ?? false,
    correctAnswer: choices.find((c) => c.optionId === item.correctOptionId)?.text ?? "",
    explanation: item.explanationSnapshot
  };
}

export function serializeStart(
  session: { id: string; kind: PracticeSessionKind; issuedAt: Date; expiresAt: Date },
  items: ItemRow[],
  order: string[],
  resumed: boolean
): SessionStartResponse {
  return {
    sessionId: session.id,
    kind: session.kind,
    issuedAtIso: session.issuedAt.toISOString(),
    expiresAtIso: session.expiresAt.toISOString(),
    items: items.map(serveItem),
    order,
    resumed
  };
}

// ---- per-answer CAS ------------------------------------------------------------------------------

export type CheckResponse = {
  itemId: string;
  correct: boolean;
  correctAnswer: string;
  explanation: string;
  previouslyAnswered: boolean;
  answeredAtIso: string;
};

/**
 * First answer wins, atomically. The conditional update is the whole mechanism: `selectedOptionId IS
 * NULL` is matched and cleared in one statement, so two racing answers cannot both be recorded and a
 * later different option cannot replace the first. A zero-row update is NOT an error — it means this
 * question was already answered, so we return the stored answer and say so.
 */
export async function recordFirstAnswer(
  tx: Prisma.TransactionClient,
  params: { sessionId: string; itemId: string; optionId: string; now: Date }
): Promise<CheckResponse> {
  const item = await tx.practiceSessionItem.findFirst({
    where: { id: params.itemId, sessionId: params.sessionId }
  });
  if (!item) sessionNotFound();

  const choices = parseStoredChoices(item.choicesJson);
  if (!choices.some((choice) => choice.optionId === params.optionId)) {
    throw new HttpError("That answer choice is not part of this question.", 422);
  }

  const isCorrect = params.optionId === item.correctOptionId;
  const { count } = await tx.practiceSessionItem.updateMany({
    where: { id: params.itemId, sessionId: params.sessionId, selectedOptionId: null },
    data: { selectedOptionId: params.optionId, isCorrect, answeredAt: params.now }
  });

  const correctAnswer = choices.find((c) => c.optionId === item.correctOptionId)?.text ?? "";
  if (count === 1) {
    return {
      itemId: item.id,
      correct: isCorrect,
      correctAnswer,
      explanation: item.explanationSnapshot,
      previouslyAnswered: false,
      answeredAtIso: params.now.toISOString()
    };
  }

  const stored = await tx.practiceSessionItem.findFirst({
    where: { id: params.itemId, sessionId: params.sessionId }
  });
  if (!stored || stored.selectedOptionId === null || stored.answeredAt === null) sessionNotFound();
  return {
    itemId: stored.id,
    correct: stored.isCorrect ?? false,
    correctAnswer,
    explanation: stored.explanationSnapshot,
    previouslyAnswered: true,
    answeredAtIso: stored.answeredAt.toISOString()
  };
}

// ---- completeness and evidence -------------------------------------------------------------------

export type AnsweredItem = {
  bankQuestionId: string;
  area: string;
  skillSlug: string;
  isCorrect: boolean;
};

/**
 * Completeness is measured over DISTINCT stored items, never over visual slots. A padded twenty-slot
 * session stores nine items; answering those nine is a complete session.
 */
export function requireEveryItemAnswered(items: ItemRow[]): AnsweredItem[] {
  const answered = items.filter(
    (item) => item.selectedOptionId !== null && item.isCorrect !== null && item.answeredAt !== null
  );
  if (answered.length !== items.length) {
    throw new HttpError(
      `Answer every question before finishing. ${answered.length} of ${items.length} answered.`,
      422,
      { answered: answered.length, total: items.length }
    );
  }
  return answered.map((item) => ({
    bankQuestionId: item.bankQuestionId,
    area: item.area,
    skillSlug: item.skillSlug,
    isCorrect: item.isCorrect === true
  }));
}

export type AreaEvidence = {
  area: string;
  skillSlug: string;
  uniqueTotal: number;
  uniqueCorrect: number;
  evidenceScore: number;
  /**
   * Present ONLY for areas that have opted into secure-evidence semantics (lib/secure-evidence.ts).
   * When present it is the figure that governs qualification, and the three legacy fields above become
   * display-only for that area. An area absent from the policy set has no secure block at all and its
   * behaviour is unchanged in every respect.
   */
  secure?: SecureAreaEvidence;
};

/**
 * Aggregate per area from the STORED answers. Item rows are already one-per-distinct-question, so
 * first-occurrence de-duplication is structural here rather than a filtering step — and attribution
 * is by the item's own stored area, never by whatever area the session requested.
 */
export function aggregateAreaEvidence(answered: AnsweredItem[]): AreaEvidence[] {
  const tally = new Map<string, { skillSlug: string; uniqueTotal: number; uniqueCorrect: number }>();
  for (const item of answered) {
    const bucket = tally.get(item.area) ?? { skillSlug: item.skillSlug, uniqueTotal: 0, uniqueCorrect: 0 };
    bucket.uniqueTotal += 1;
    if (item.isCorrect) bucket.uniqueCorrect += 1;
    tally.set(item.area, bucket);
  }
  // Secure evidence is computed from the SAME stored rows, independently of the tally above, and only
  // for opted-in areas. The aggregator re-verifies every mapping itself rather than trusting whatever
  // issuance believed: role, evidence key, area agreement and integration shape are all checked again.
  const secureByArea = aggregateSecureEvidence(
    answered.map((item) => ({ bankQuestionId: item.bankQuestionId, area: item.area, isCorrect: item.isCorrect }))
  );
  return Array.from(tally.entries()).map(([area, bucket]) => ({
    area,
    skillSlug: bucket.skillSlug,
    uniqueTotal: bucket.uniqueTotal,
    uniqueCorrect: bucket.uniqueCorrect,
    evidenceScore: bucket.uniqueTotal > 0 ? Math.round((bucket.uniqueCorrect / bucket.uniqueTotal) * 100) : 0,
    // A policy area with no resolvable secure rows still gets a zeroed block, never `undefined` — the
    // absence of the block is what means "legacy area", and the two must not be confused.
    secure: SECURE_EVIDENCE_AREAS.has(area)
      ? secureByArea.get(area) ?? {
          area,
          secureUniqueTotal: 0,
          secureUniqueCorrect: 0,
          secureEvidenceScore: 0,
          failedClosed: false,
          failClosedReasons: []
        }
      : undefined
  }));
}

// ---- stored completed result ---------------------------------------------------------------------

/** `resultJson` holds the exact public response of the winning completion and nothing else, so a
 *  retry replays a byte-identical result rather than recomputing one. */
export function parseStoredResult(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    // The session says COMPLETED but its result is unreadable. Do NOT rerun the effects and do NOT
    // overwrite the completion — that would award a second time. Report and stop.
    throw new HttpError("Your results could not be loaded. Try again later.", 503);
  }
  return raw as Record<string, unknown>;
}
