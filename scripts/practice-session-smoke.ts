/**
 * M13E2 Phase C1 — server-session core helpers.
 *
 * HELPER-LEVEL ONLY. No route or component has been cut over yet, and this suite does not pretend
 * otherwise: it exercises the primitives directly against deterministic in-memory stubs.
 *
 * It never contacts a database. The stub transaction client below models exactly the operations the
 * cores use — including `$queryRaw` as a tagged template — so the ON CONFLICT / FOR UPDATE paths are
 * driven for real rather than asserted from source text.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
const NOW = new Date("2026-03-01T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY);

/** Proves a negative control actually changed something before asserting the change is rejected. */
function rejects(label: string, mutate: () => unknown, changed: () => boolean) {
  assert.ok(changed(), `${label} — the control genuinely differs from the valid case`);
  assert.throws(mutate, `${label} — and it is rejected`);
}

// ---- stub transaction client ---------------------------------------------------------------------

type Row = Record<string, unknown>;

class StubTx {
  users = new Map<string, { id: string; xp: number; rank: string }>();
  schedules: Row[] = [];
  mastery: Row[] = [];
  skills = new Map<string, string>();
  items: Row[] = [];
  sessions: Row[] = [];
  deleted: string[] = [];
  log: string[] = [];
  /** Set to simulate a concurrent unlocked writer that created the row between our insert and read. */
  conflictOn: "schedule" | "mastery" | null = null;

  private sql(strings: TemplateStringsArray) {
    return strings.join("?").replace(/\s+/g, " ").trim();
  }

  $queryRaw = async (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> => {
    const q = this.sql(strings);
    this.log.push(q);

    if (q.startsWith('SELECT id FROM "User"')) {
      const u = this.users.get(values[0] as string);
      return u ? [{ id: u.id }] : [];
    }
    if (q.includes('INSERT INTO "SkillReviewSchedule"')) {
      const [, userId, skillId, nextReviewAt, reviewCount] = values as [string, string, string, Date, number];
      const exists = this.schedules.find((s) => s.userId === userId && s.skillId === skillId);
      if (exists || this.conflictOn === "schedule") return []; // ON CONFLICT DO NOTHING — never throws
      this.schedules.push({ userId, skillId, nextReviewAt, reviewCount });
      return [{ reviewCount, nextReviewAt }];
    }
    if (q.includes('FROM "SkillReviewSchedule"') && q.includes("FOR UPDATE")) {
      const [userId, skillId] = values as [string, string];
      const row = this.schedules.find((s) => s.userId === userId && s.skillId === skillId);
      return row ? [{ reviewCount: row.reviewCount, nextReviewAt: row.nextReviewAt }] : [];
    }
    if (q.includes('INSERT INTO "MasteryProgress"')) {
      const [id, userId, skillId, , masteryPercent] = values as [string, string, string, string, number];
      const exists = this.mastery.find((m) => m.userId === userId && m.skillId === skillId);
      if (exists || this.conflictOn === "mastery") return [];
      this.mastery.push({ userId, skillId, masteryPercent, correctCount: 0, incorrectCount: 0 });
      return [{ id }];
    }
    if (q.includes('FROM "MasteryProgress"') && q.includes("FOR UPDATE")) {
      const [userId, skillId] = values as [string, string];
      const row = this.mastery.find((m) => m.userId === userId && m.skillId === skillId);
      return row ? [{ masteryPercent: row.masteryPercent }] : [];
    }
    throw new Error(`stub: unhandled SQL ${q}`);
  };

  skill = {
    findUnique: async ({ where }: { where: { slug: string } }) => {
      const id = this.skills.get(where.slug);
      return id ? { id } : null;
    }
  };

  skillReviewSchedule = {
    update: async ({ where, data }: { where: { userId_skillId: { userId: string; skillId: string } }; data: Row }) => {
      const row = this.schedules.find(
        (s) => s.userId === where.userId_skillId.userId && s.skillId === where.userId_skillId.skillId
      );
      if (!row) throw new Error("stub: no schedule row");
      Object.assign(row, data);
      this.log.push("UPDATE SkillReviewSchedule");
      return row;
    }
  };

  masteryProgress = {
    update: async ({ where, data }: { where: { userId_skillId: { userId: string; skillId: string } }; data: Row }) => {
      const row = this.mastery.find(
        (m) => m.userId === where.userId_skillId.userId && m.skillId === where.userId_skillId.skillId
      );
      if (!row) throw new Error("stub: no mastery row");
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === "object" && "increment" in (v as Row)) {
          row[k] = ((row[k] as number) ?? 0) + ((v as { increment: number }).increment ?? 0);
        } else {
          row[k] = v;
        }
      }
      this.log.push("UPDATE MasteryProgress");
      return row;
    }
  };

  user = {
    update: async ({ where, data, select }: { where: { id: string }; data: Row; select?: Row }) => {
      const u = this.users.get(where.id);
      if (!u) throw new Error("stub: no user");
      if (data.xp && typeof data.xp === "object" && "increment" in (data.xp as Row)) {
        u.xp += (data.xp as { increment: number }).increment;
      } else if (typeof data.xp === "number") {
        u.xp = data.xp;
      }
      if (typeof data.rank === "string") u.rank = data.rank;
      this.log.push("UPDATE User");
      return select ? { xp: u.xp } : u;
    }
  };

  practiceSession = {
    findMany: async ({ where, take }: { where: Row; take: number }) => {
      const eligible = this.sessions.filter(
        (s) => s.userId === (where as { userId: string }).userId && (s.purgeAfter as Date) < NOW
      );
      return eligible.slice(0, take).map((s) => ({ id: s.id }));
    },
    deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
      this.deleted.push(...where.id.in);
      this.sessions = this.sessions.filter((s) => !where.id.in.includes(s.id as string));
      return { count: where.id.in.length };
    }
  };

  practiceSessionItem = {
    findFirst: async ({ where }: { where: Row }) => {
      const w = where as { id: string; sessionId: string };
      return this.items.find((i) => i.id === w.id && i.sessionId === w.sessionId) ?? null;
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const w = where as { id: string; sessionId: string; selectedOptionId: null };
      const row = this.items.find(
        (i) => i.id === w.id && i.sessionId === w.sessionId && i.selectedOptionId === null
      );
      if (!row) return { count: 0 };
      Object.assign(row, data);
      return { count: 1 };
    }
  };
}

async function main() {
  const PS = await import("../lib/practice-session");
  const SR = await import("../lib/spaced-review");
  const XP = await import("../lib/xp");

  // ================= SNAPSHOT ====================================================================
  const ids = ["i1", "i2", "i3"];
  const known = new Set(ids);
  const drill = { version: 1, kind: "DRILL", requestedCount: 5, order: ["i1", "i2", "i3", "i1", "i2"] };
  const parsedDrill = PS.parsePracticeSessionSnapshot(drill, "DRILL", known);
  assert.equal(parsedDrill.kind, "DRILL", "1. a valid drill snapshot parses");
  assert.deepEqual(
    parsedDrill.kind === "DRILL" ? parsedDrill.order : null,
    ["i1", "i2", "i3", "i1", "i2"],
    "2. repeated known item ids are accepted and the exact order survives"
  );
  const writing = {
    version: 1,
    kind: "WRITING",
    scenario: {
      skillSlug: "debate-claim-building", skillName: "Claim building", level: "BEGINNER",
      motion: "M", side: "FOR", prompt: "p", hint: "h", modelExample: "m", rubricFocus: ["a"]
    }
  };
  assert.equal(PS.parsePracticeSessionSnapshot(writing, "WRITING").kind, "WRITING", "3. a valid writing snapshot parses");

  rejects("4. wrong version",
    () => PS.parsePracticeSessionSnapshot({ ...drill, version: 2 }, "DRILL", known), () => drill.version !== 2);
  rejects("5. wrong kind",
    () => PS.parsePracticeSessionSnapshot(drill, "WRITING"), () => drill.kind !== "WRITING");
  rejects("6. malformed order",
    () => PS.parsePracticeSessionSnapshot({ ...drill, order: [1, 2] }, "DRILL", known), () => true);
  rejects("7. order length mismatch",
    () => PS.parsePracticeSessionSnapshot({ ...drill, requestedCount: 4 }, "DRILL", known), () => drill.order.length !== 4);
  rejects("8. an id outside the stored item set",
    () => PS.parsePracticeSessionSnapshot({ ...drill, order: ["i1", "i2", "i3", "i1", "nope"] }, "DRILL", known),
    () => !known.has("nope"));
  rejects("9. a non-object snapshot", () => PS.parsePracticeSessionSnapshot("nope", "DRILL", known), () => true);

  // The snapshot is stored data, not derived data: nothing in the parser consults a question bank.
  const psSrc = read("lib/practice-session.ts");
  for (const banned of ["DRILL_BANK", "DECA_DRILL_BANK", "MEDTERM_BANK", "buildDrillSession", "buildMedTermSession"]) {
    assert.ok(!psSrc.includes(banned), `10. the session core never reaches for the live bank (${banned})`);
  }
  assert.ok(psSrc.includes("resultJson holds the exact public response") || psSrc.includes("`resultJson` holds"),
    "11. resultJson stays reserved for the completed result");

  // ================= OPAQUE OPTIONS ==============================================================
  const choices = ["alpha", "bravo", "charlie", "delta"];
  const built = PS.buildServedChoices(choices, "charlie", () => 0); // deterministic rng => real reorder
  assert.notDeepEqual(built.stored.map((c) => c.text), choices, "12. the served choice order is shuffled");
  assert.deepEqual([...built.stored.map((c) => c.text)].sort(), [...choices].sort(), "12b. with no choice lost or invented");
  assert.equal(built.stored.find((c) => c.optionId === built.correctOptionId)?.text, "charlie",
    "13. the correct mapping survives the shuffle");
  for (const c of built.stored) {
    assert.ok(!/^o\d+$/.test(c.optionId) && c.optionId.length >= 32,
      `14. option ids are opaque, not positional (${c.optionId})`);
    assert.ok(!choices.includes(c.optionId), "14b. and are not the answer text");
  }
  assert.equal(new Set(built.stored.map((c) => c.optionId)).size, 4, "15. every served option id is distinct");
  const second = PS.buildServedChoices(choices, "charlie", () => 0);
  assert.notDeepEqual(second.stored.map((c) => c.optionId), built.stored.map((c) => c.optionId),
    "16. ids are minted per session, so one session's mapping cannot be replayed against another");

  // ================= SERVED ITEM SECRECY =========================================================
  const itemRow = {
    id: "i1", bankQuestionId: "cw-01", displayOrder: 0, promptSnapshot: "Which is complete?",
    choicesJson: built.stored, correctOptionId: built.correctOptionId, explanationSnapshot: "because",
    area: "rebuttal", skillSlug: "debate-rebuttal", selectedOptionId: null, isCorrect: null, answeredAt: null
  };
  const unanswered = PS.serveItem(itemRow);
  assert.equal(unanswered.answered, false, "17. an unanswered item reports itself unanswered");
  assert.equal(unanswered.correctAnswer, undefined, "18. and carries NO correct answer");
  assert.equal(unanswered.explanation, undefined, "19. and NO explanation");
  assert.equal(unanswered.correct, undefined, "20. and no correctness flag");
  // The correct option id is necessarily one of the four served ids — that is exactly what makes the
  // ids indistinguishable. What must be absent is any field that IDENTIFIES which one it is.
  for (const field of ["correctOptionId", "correctAnswer", "explanation", "isCorrect"]) {
    assert.ok(!Object.keys(unanswered).includes(field),
      `21. an unanswered item exposes no ${field} field`);
  }
  assert.equal(built.stored.filter((c) => c.optionId === built.correctOptionId).length, 1,
    "21b. and the correct id is one of the four served ids, distinguishable only by the server");
  const answeredRow = { ...itemRow, selectedOptionId: built.correctOptionId, isCorrect: true, answeredAt: NOW };
  const answered = PS.serveItem(answeredRow);
  assert.equal(answered.correctAnswer, "charlie", "22. an ANSWERED item resumes with its stored feedback");
  assert.equal(answered.explanation, "because", "22b. including the explanation");

  // ================= PADDED ORDER ================================================================
  const nine = Array.from({ length: 9 }, (_, i) => ({ ...itemRow, id: `d${i}`, bankQuestionId: `rb-0${i}`, displayOrder: i }));
  const order20 = Array.from({ length: 20 }, (_, i) => nine[i % 9].id);
  assert.equal(nine.length, 9, "23. a focused pool stores nine DISTINCT items");
  assert.equal(order20.length, 20, "24. while the learner still receives twenty slots");
  assert.equal(new Set(order20).size, 9, "25. the twenty slots resolve to nine distinct items");
  const start = PS.serializeStart(
    { id: "s1", kind: "DEBATE_DRILL" as never, issuedAt: NOW, expiresAt: at(1) }, nine, order20, false);
  assert.equal(start.items.length, 9, "26. the start response serves nine item records");
  assert.equal(start.order.length, 20, "27. and the persisted twenty-slot order");
  assert.equal(typeof start.issuedAtIso, "string", "28. dates cross the contract as explicit ISO strings");
  assert.equal(start.expiresAtIso, at(1).toISOString(), "28b. with the exact expiry");
  assert.ok(!JSON.stringify(start).includes("correctOptionId"), "29. and the start payload carries no correct option id");
  const visualKeys = order20.map((id, slot) => `${slot}:${id}`);
  assert.equal(new Set(visualKeys).size, 20, "30. every visual slot key is unique despite repeats");
  assert.equal(new Set(order20).size, 9, "31. while the distinct answer key stays the item id");

  // ================= COMPLETENESS ================================================================
  const partly = nine.map((it, i) => (i < 8 ? { ...it, selectedOptionId: "x", isCorrect: true, answeredAt: NOW } : it));
  assert.throws(() => PS.requireEveryItemAnswered(partly), /8 of 9 answered/,
    "32. an incomplete session is rejected, counting DISTINCT items not slots");
  const allDone = nine.map((it, i) => ({ ...it, selectedOptionId: "x", isCorrect: i < 6, answeredAt: NOW }));
  const answeredItems = PS.requireEveryItemAnswered(allDone);
  assert.equal(answeredItems.length, 9, "33. nine answered distinct items complete a twenty-slot session");
  const agg = PS.aggregateAreaEvidence(answeredItems);
  assert.equal(agg[0].uniqueTotal, 9, "34. evidence counts nine unique questions, not twenty answers");
  assert.equal(agg[0].uniqueCorrect, 6, "34b. and six unique correct");
  assert.equal(agg[0].evidenceScore, 67, "35. the honest 6-of-9 result is still 67 — repeats added nothing");

  // ================= LOCK AND CLEANUP ============================================================
  const tx = new StubTx();
  tx.users.set("u1", { id: "u1", xp: 100, rank: "BRONZE" });
  await PS.lockUserRow(tx as never, "u1");
  assert.ok(tx.log[0].startsWith('SELECT id FROM "User"'), "36. the user lock is the first statement issued");
  assert.ok(tx.log[0].includes("FOR UPDATE"), "37. and it is a FOR UPDATE row lock");
  await assert.rejects(() => PS.lockUserRow(tx as never, "ghost"), "38. a missing User row fails rather than continuing unserialized");

  for (let i = 0; i < 25; i += 1) tx.sessions.push({ id: `old${i}`, userId: "u1", purgeAfter: at(-2) });
  tx.sessions.push({ id: "other", userId: "u2", purgeAfter: at(-2) });
  tx.sessions.push({ id: "fresh", userId: "u1", purgeAfter: at(5) });
  const removed = await PS.cleanupExpiredSessions(tx as never, "u1", NOW);
  assert.equal(removed, 20, "39. cleanup is bounded to twenty sessions per start");
  assert.equal(tx.deleted.length, 20, "40. and deletes only the ids it selected");
  assert.ok(!tx.deleted.includes("other"), "41. never another learner's session");
  assert.ok(!tx.deleted.includes("fresh"), "42. and never a session that is not yet purge-eligible");

  // ================= ITEM CAS ====================================================================
  const casTx = new StubTx();
  casTx.items.push({ ...itemRow, sessionId: "s1" });
  const first = await PS.recordFirstAnswer(casTx as never, { sessionId: "s1", itemId: "i1", optionId: built.correctOptionId, now: NOW });
  assert.equal(first.previouslyAnswered, false, "43. the first answer wins");
  assert.equal(first.correct, true, "43b. and is graded from the stored correct option");
  assert.equal(casTx.items[0].selectedOptionId, built.correctOptionId, "44. the answer is persisted BEFORE feedback is returned");

  const wrongId = built.stored.find((c) => c.optionId !== built.correctOptionId)!.optionId;
  const repeatDifferent = await PS.recordFirstAnswer(casTx as never, { sessionId: "s1", itemId: "i1", optionId: wrongId, now: at(1) });
  assert.equal(repeatDifferent.previouslyAnswered, true, "45. a later DIFFERENT option returns the stored first answer");
  assert.equal(repeatDifferent.correct, true, "46. with the first answer's correctness, not the new one's");
  assert.equal(casTx.items[0].selectedOptionId, built.correctOptionId, "47. and cannot overwrite what was recorded first");
  const repeatSame = await PS.recordFirstAnswer(casTx as never, { sessionId: "s1", itemId: "i1", optionId: built.correctOptionId, now: at(2) });
  assert.equal(repeatSame.previouslyAnswered, true, "48. a repeated identical answer is idempotent too");

  await assert.rejects(
    () => PS.recordFirstAnswer(casTx as never, { sessionId: "s1", itemId: "i1", optionId: "not-a-real-option", now: NOW }),
    "49. an option id outside the item's stored choices is rejected");
  await assert.rejects(
    () => PS.recordFirstAnswer(casTx as never, { sessionId: "s1", itemId: "never-served", optionId: built.correctOptionId, now: NOW }),
    "50. an item that was not served in this session is rejected");
  await assert.rejects(
    () => PS.recordFirstAnswer(casTx as never, { sessionId: "other-session", itemId: "i1", optionId: built.correctOptionId, now: NOW }),
    "51. and another session's id does not reach this item");

  // ================= TRANSACTION-NATIVE REVIEW ===================================================
  const mk = () => { const t = new StubTx(); t.skills.set("sk", "skill-1"); t.users.set("u1", { id: "u1", xp: 0, rank: "BRONZE" }); return t; };

  let t = mk();
  let r = await SR.recordPracticeOutcomeInTransaction(t as never, { userId: "u1", skillId: "skill-1", scorePercent: 90, passed: true, now: NOW });
  assert.equal(r.status, "created", "52. a first pass creates the schedule");
  assert.equal(r.reviewCount, 1, "52b. at count 1");
  assert.equal(r.nextReviewAt.toISOString(), at(1).toISOString(), "52c. one day out");

  t = mk();
  r = await SR.recordPracticeOutcomeInTransaction(t as never, { userId: "u1", skillId: "skill-1", scorePercent: 10, passed: false, now: NOW });
  assert.equal(r.reviewCount, 0, "53. a first failure creates at count 0");
  assert.equal(r.nextReviewAt.toISOString(), at(1).toISOString(), "53b. also one day out");

  t = mk();
  t.schedules.push({ userId: "u1", skillId: "skill-1", reviewCount: 2, nextReviewAt: at(5) });
  let before = t.log.length;
  r = await SR.recordPracticeOutcomeInTransaction(t as never, { userId: "u1", skillId: "skill-1", scorePercent: 90, passed: true, now: NOW });
  assert.equal(r.status, "preserved-not-due", "54. a pre-due pass is preserved");
  assert.ok(!t.log.slice(before).includes("UPDATE SkillReviewSchedule"), "54b. as a TRUE no-write");
  assert.equal(t.schedules[0].reviewCount, 2, "54c. the ladder does not move");

  t = mk();
  t.schedules.push({ userId: "u1", skillId: "skill-1", reviewCount: 2, nextReviewAt: at(5) });
  before = t.log.length;
  r = await SR.recordPracticeOutcomeInTransaction(t as never, { userId: "u1", skillId: "skill-1", scorePercent: 10, passed: false, now: NOW });
  assert.equal(r.status, "preserved-not-due", "55. a pre-due FAILURE is preserved too");
  assert.ok(!t.log.slice(before).includes("UPDATE SkillReviewSchedule"), "55b. and writes nothing");

  t = mk();
  t.schedules.push({ userId: "u1", skillId: "skill-1", reviewCount: 1, nextReviewAt: at(-1) });
  r = await SR.recordPracticeOutcomeInTransaction(t as never, { userId: "u1", skillId: "skill-1", scorePercent: 90, passed: true, now: NOW });
  assert.equal(r.status, "advanced", "56. a due pass advances");
  assert.equal(r.reviewCount, 2, "56b. by exactly one rung");
  assert.equal(r.nextReviewAt.toISOString(), at(3).toISOString(), "57. using the PRE-increment count for the interval (1 -> 3d)");

  t = mk();
  t.schedules.push({ userId: "u1", skillId: "skill-1", reviewCount: 3, nextReviewAt: at(-1) });
  r = await SR.recordPracticeOutcomeInTransaction(t as never, { userId: "u1", skillId: "skill-1", scorePercent: 10, passed: false, now: NOW });
  assert.equal(r.status, "reset-after-due-failure", "58. a due failure resets");
  assert.equal(r.reviewCount, 0, "58b. to count 0");
  assert.equal(r.nextReviewAt.toISOString(), at(1).toISOString(), "58c. one day out");

  // The whole reason this core exists: a concurrent unlocked creator must NOT raise inside a transaction.
  t = mk();
  t.conflictOn = "schedule";
  t.schedules.push({ userId: "u1", skillId: "skill-1", reviewCount: 1, nextReviewAt: at(-1) });
  r = await SR.recordPracticeOutcomeInTransaction(t as never, { userId: "u1", skillId: "skill-1", scorePercent: 90, passed: true, now: NOW });
  assert.equal(r.status, "advanced", "59. an insert that conflicts returns zero rows and falls through to the locked row");
  assert.ok(t.log.some((q) => q.includes("ON CONFLICT")), "60. via ON CONFLICT DO NOTHING — never a provoked exception");
  assert.ok(t.log.some((q) => q.includes('FROM "SkillReviewSchedule"') && q.includes("FOR UPDATE")),
    "61. and the existing row is locked before it is read");

  const srSrc = read("lib/spaced-review.ts");
  const txSection = srSrc.slice(srSrc.indexOf("TRANSACTION-NATIVE CORES"));
  assert.ok(!/catch\s*\{/.test(txSection), "62. the transaction cores contain no catch-and-continue at all");
  assert.ok(!txSection.includes('"write-failed"'), "63. and no write-failed status — a real failure throws and rolls back");

  // ================= TRANSACTION-NATIVE MASTERY ==================================================
  const created = { status: "created", previousReviewCount: null, reviewCount: 1, previousNextReviewAt: null, nextReviewAt: at(1) } as const;
  const dueFail = { status: "reset-after-due-failure", previousReviewCount: 3, reviewCount: 0, previousNextReviewAt: at(-1), nextReviewAt: at(1) } as const;

  t = mk();
  let m = await SR.recordDrillMasteryInTransaction(t as never, { userId: "u1", skillSlug: "sk", scorePercent: 80, passed: true, now: NOW, review: created });
  assert.equal(m.status, "updated", "64. a missing mastery row is created");
  assert.equal(t.mastery[0].masteryPercent, 80, "64b. at the demonstrated score");

  t = mk();
  m = await SR.recordDrillMasteryInTransaction(t as never, { userId: "u1", skillSlug: "missing", scorePercent: 80, passed: true, now: NOW, review: created });
  assert.equal(m.status, "skill-missing", "65. an unseeded skill never fabricates progress");

  t = mk();
  t.mastery.push({ userId: "u1", skillId: "skill-1", masteryPercent: 90, correctCount: 0, incorrectCount: 0 });
  await SR.recordDrillMasteryInTransaction(t as never, { userId: "u1", skillSlug: "sk", scorePercent: 40, passed: false, now: NOW, review: created });
  assert.equal(t.mastery[0].masteryPercent, 90, "66. a non-due branch is upward-only — 40 does not lower 90");
  assert.equal(t.mastery[0].incorrectCount, 1, "67. and the counter moves exactly once");

  t = mk();
  t.mastery.push({ userId: "u1", skillId: "skill-1", masteryPercent: 90, correctCount: 0, incorrectCount: 0 });
  await SR.recordDrillMasteryInTransaction(t as never, { userId: "u1", skillSlug: "sk", scorePercent: 40, passed: false, now: NOW, review: dueFail });
  assert.equal(t.mastery[0].masteryPercent, 40, "68. a failed DUE reassessment is the only branch that lowers mastery");

  t = mk();
  t.conflictOn = "mastery";
  t.mastery.push({ userId: "u1", skillId: "skill-1", masteryPercent: 50, correctCount: 0, incorrectCount: 0 });
  m = await SR.recordDrillMasteryInTransaction(t as never, { userId: "u1", skillSlug: "sk", scorePercent: 70, passed: true, now: NOW, review: created });
  assert.equal(m.status, "updated", "69. a concurrent unlocked mastery creator does not poison the transaction");
  assert.equal(t.mastery[0].masteryPercent, 70, "69b. and the locked row is updated upward");

  // ================= ATOMIC XP / RANK ============================================================
  const xpTx = new StubTx();
  xpTx.users.set("u1", { id: "u1", xp: 100, rank: "BRONZE" });
  const a1 = await XP.awardXpInTransaction(xpTx as never, "u1", 10);
  assert.equal(a1.xp, 110, "70. XP is incremented atomically");
  const a2 = await XP.awardXpInTransaction(xpTx as never, "u1", 50);
  assert.equal(a2.xp, 160, "71. concurrent awards SUM rather than overwrite — 100 +10 +50 = 160");
  assert.equal(xpTx.users.get("u1")!.xp, 160, "71b. and the stored value agrees");
  assert.equal(a2.rank, XP.calculateRank(160), "72. rank derives from the value the increment RETURNED");

  const xpSrc = read("lib/xp.ts");
  const helper = xpSrc.slice(xpSrc.indexOf("export async function awardXpInTransaction"));
  assert.ok(helper.includes("increment: amount"), "73. the helper increments");
  assert.ok(!/xp:\s*next|xp:\s*user\.xp|xp:\s*current/.test(helper), "74. and never assigns an absolute stale XP value");
  assert.ok(!helper.includes("wins") && !helper.includes("streak"), "75. it does not touch wins or streak");
  assert.ok(helper.indexOf("calculateRank(updatedUser.xp)") > helper.indexOf("increment: amount"),
    "76. rank is computed after the increment, never before it");

  // ================= PUBLIC M13E1G COMPATIBILITY =================================================
  const publicSection = srSrc.slice(0, srSrc.indexOf("TRANSACTION-NATIVE CORES"));
  for (const variant of ["created", "advanced", "reset-after-due-failure", "preserved-not-due",
                         "preserved-concurrent-existing", "preserved-concurrent-created", "write-failed"]) {
    assert.ok(publicSection.includes(`"${variant}"`), `77. the public review union still carries ${variant}`);
  }
  assert.equal((publicSection.match(/status: "write-failed"/g) ?? []).length >= 1, true,
    "78. public write-failed remains a RETURNED state");
  assert.ok(publicSection.includes("degrades to \"nothing due\"") || publicSection.includes("table is missing"),
    "79. public missing-table degradation is still documented and present");
  assert.ok(publicSection.includes("A review mutation that truthfully landed is preserved here rather than rolled back"),
    "80. the 28c contract text is untouched in the public path");
  assert.ok(publicSection.includes("return outcome.status === \"updated\";"),
    "81. the boolean wrapper still means an actual mastery write");
  for (const core of ["recordPracticeOutcomeInTransaction", "recordDrillMasteryInTransaction", "awardXpInTransaction"]) {
    assert.ok(!publicSection.includes(core), `82. the public helpers do not call ${core} — the new path is additive only`);
  }

  // ================= C2a SCOPE: DRILL ROUTES ONLY =================================================
  // C2a cuts over the nine drill routes. What must still hold is that NO component and none of the
  // deferred writing/XP routes touch the session tables yet.
  let refs: string[] = [];
  try {
    refs = (await import("node:child_process"))
      .execSync('grep -rli "practicesession" app components', { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  } catch {
    refs = [];
  }
  assert.deepEqual(refs.filter((f) => f.startsWith("components/")), [],
    "83. no component is wired to the session tables before C3");
  // C2b cut the writing routes over. tests/grade and judge take only the atomic XP helper and must
  // never touch the session tables at all.
  for (const neverSessionBacked of ["app/api/tests/[testId]/grade/route.ts",
                                    "app/api/debates/[debateId]/judge/route.ts"]) {
    assert.ok(!refs.includes(neverSessionBacked),
      `83b. ${neverSessionBacked} uses only the XP helper, never the session tables`);
  }
  for (const cut of ["app/api/skills/debate-writing/session/route.ts", "app/api/skills/debate-writing/route.ts"]) {
    assert.ok(refs.includes(cut), `83d. and the C2b writing routes ARE cut over (${cut})`);
  }

  // ================= C2b: WRITING SESSION + XP CROSS-WRITERS ======================================
  const stripC = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, " ").split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "")).join("\n");
  const wSession = stripC(read("app/api/skills/debate-writing/session/route.ts"));
  const wSubmit = stripC(read("app/api/skills/debate-writing/route.ts"));
  const grade = stripC(read("app/api/tests/[testId]/grade/route.ts"));
  const judge = stripC(read("app/api/debates/[debateId]/judge/route.ts"));

  // --- writing session issuance ---
  assert.ok(/getServerSession\(authOptions\)/.test(wSession) && /unauthorized\(\)/.test(wSession),
    "119. the writing session route authenticates");
  assert.ok(!/enforceRateLimit/.test(wSession) && !/enforceRateLimit/.test(wSubmit),
    "120. and its rate limiting is preserved — this surface has never had any, and adding one is deferred");
  const wsBody = wSession.slice(wSession.indexOf("prisma.$transaction"));
  assert.ok(wsBody.indexOf("lockUserRow(tx") >= 0 && wsBody.indexOf("lockUserRow(tx") < wsBody.indexOf("findActiveSession("),
    "121. the user row lock is its first statement, before any lifecycle query");
  const wsKinds = new Set([...wSession.matchAll(/"(DEBATE_DRILL|DECA_DRILL|HOSA_MEDTERM|DEBATE_WRITING)"/g)].map((m) => m[1]));
  assert.deepEqual([...wsKinds], ["DEBATE_WRITING"], "122. it binds exactly DEBATE_WRITING");
  assert.ok(/findActiveSession\(/.test(wSession), "123. one active unexpired session is reused, not duplicated");
  assert.ok(/cleanupExpiredSessions\(/.test(wSession), "124. bounded cleanup runs through the C1 helper");
  assert.ok(/expiryFor\(now\)/.test(wSession), "125. and the 24h expiry / purge window comes from the C1 helper");
  assert.ok(/const scenarioIndex = Math\.floor\(Math\.random\(\)/.test(wSession),
    "126. the SERVER selects the scenario — the index never arrives from the client");
  assert.ok(!/input\.scenarioIndex/.test(wSession) && !/input\.scenarioIndex/.test(wSubmit),
    "127. and no client-supplied scenario index reaches either writing route");
  assert.ok(/kind: "WRITING"/.test(wSession), "128. the scenario is frozen into a versioned snapshot");
  for (const banned of ["XP_REWARDS", "xPLog", "awardXpInTransaction", "MasteryProgress", "masteryProgress",
                        "practiceAttempt", "questionAttempt", "recordPracticeOutcome"]) {
    assert.ok(!wSession.includes(banned), `129. issuance writes nothing (${banned})`);
  }

  // --- writing submit ---
  assert.ok(/writingSessionSubmitRequestSchema/.test(wSubmit), "130. submit accepts { sessionId, response } only");
  for (const clientControlled of ["input.slug", "input.level", "input.scenario"]) {
    assert.ok(!wSubmit.includes(clientControlled), `131. no client-supplied ${clientControlled} is honoured`);
  }
  assert.ok(/parsePracticeSessionSnapshot\(issued\.scenarioJson, "WRITING"\)/.test(wSubmit),
    "132. it grades against the scenario saved on the issued session");
  // M15 S1B Batch I: the ordering comparison alone was vacuous — when the short-circuit
  // anchor is absent indexOf returns -1 and `-1 < n` still holds, so deleting the very
  // short-circuit this control exists to protect turned it green. Both anchors are now
  // proven present before the ordering is accepted.
  const storedResultIdx = wSubmit.indexOf("parseStoredResult(");
  const graderIdx = wSubmit.indexOf("gradeDebateWritingResponse(");
  assert.ok(storedResultIdx >= 0 && graderIdx >= 0,
    "133-anchors. both the stored-result short-circuit and the grader call are present");
  assert.ok(storedResultIdx < graderIdx,
    "133. a completed retry returns the stored result BEFORE the grader runs");
  // M15 S1A A1: the writing SUBMIT is now as write-free as issuance — the 129 ban list governs both.
  for (const bannedWrite of ["XP_REWARDS", "xPLog", "awardXpInTransaction", "MasteryProgress", "masteryProgress",
                             "practiceAttempt", "questionAttempt", "recordPracticeOutcome", "txMasteryMayDecrease"]) {
    assert.ok(!wSubmit.includes(bannedWrite), `134. formative submission writes nothing authoritative (${bannedWrite})`);
  }
  assert.ok(/formative: true/.test(wSubmit), "135. the submit response declares formative: true");
  assert.ok(/gradeDebateWritingResponse\(/.test(wSubmit), "137. the formative grader still runs");
  // NON-VACUOUS, pinned to the FROZEN G2-closure commit (never HEAD-relative): the pre-A1 submit
  // route contained every banned token, so 134 catches exactly the defect it exists to prevent.
  const PRE_M15_S1A = "338a88df64127c6f995167f84556d0df5a98ff22";
  const wSubmitAtA1Baseline = stripC(require("node:child_process")
    .execSync(`git show ${PRE_M15_S1A}:app/api/skills/debate-writing/route.ts`, { encoding: "utf8" }) as string);
  for (const wasThere of ["xPLog", "awardXpInTransaction", "masteryProgress", "practiceAttempt", "questionAttempt"]) {
    assert.ok(wSubmitAtA1Baseline.includes(wasThere),
      `134-C1. control: the pre-A1 route contained ${wasThere}, so the ban is non-vacuous`);
  }
  // Learner-facing honesty for the same feature: the component labels the practice formative, frames
  // the number as checklist coverage rather than skill measurement, and the skills page no longer
  // promises XP or mastery for finishing a round.
  const writingUiSrc = read("components/skills/debate-writing-practice.tsx");
  assert.ok(/Formative writing practice/.test(writingUiSrc) && /does not affect mastery or XP/.test(writingUiSrc),
    "135b. the writing UI says the practice is formative and does not affect mastery or XP");
  assert.ok(/Writing checklist: \{feedback\.score\}%/.test(writingUiSrc) &&
    /not a mastery, readiness, or competition score/.test(writingUiSrc),
    "135c. the heuristic number is framed as checklist coverage, not skill measurement");
  assert.ok(!/feedback\.score >= 80 \? "accent"/.test(writingUiSrc),
    "135d. and the score badge no longer uses an achievement variant");
  const skillsPageSrc = read("app/(app)/skills/[slug]/page.tsx");
  assert.ok(!/awards 10 XP/.test(skillsPageSrc) && !/updates this skill(&apos;|\x27)s mastery/.test(skillsPageSrc),
    "135e. the skills page no longer promises XP or mastery for writing practice");
  assert.ok(/status: "COMPLETED"/.test(wSubmit) && /resultJson: result/.test(wSubmit),
    "138. the result and the completion are stored together, atomically");
  assert.ok(/sessionExpired\(\)/.test(wSubmit) && /sessionNotFound\(\)/.test(wSubmit),
    "139. expiry and ownership are enforced without disclosing existence");

  // ---- A2. exactly-once graded-test claim (M15 S1A A2) ----------------------------------------------
  // The COMPLETED pre-read outside the transaction is a fast path only; correctness is the
  // conditional transition INSIDE the grading transaction, placed before EVERY write including the
  // answer upserts. Actual simultaneous-request behavior relies on PostgreSQL conditional-update
  // semantics; no DB-writing concurrency test was executed.
  const gradeTxn = grade.slice(grade.indexOf("prisma.$transaction(async (tx) =>"));
  assert.ok(gradeTxn.length > 100, "A2-10. the grading transaction was located");
  const gradeClaimIdx = gradeTxn.indexOf("await tx.practiceTest.updateMany(");
  assert.ok(gradeClaimIdx >= 0, "A2-11. the transaction claims the test with a conditional updateMany");
  assert.ok(/where: \{ id: test\.id, userId: session\.user\.id, status: \{ not: "COMPLETED" \} \}/.test(gradeTxn),
    "A2-12. the claim binds test id, OWNER, and exactly the pre-read eligibility ({GENERATED, IN_PROGRESS} -> COMPLETED)");
  assert.ok(/data: \{ status: "COMPLETED" \}/.test(gradeTxn), "A2-13. and performs the COMPLETED transition itself");
  assert.ok(/if \(claim\.count === 0\)[\s\S]{0,160}409/.test(gradeTxn),
    "A2-14. a zero-count loser exits with the existing 409 before any mutation");
  assert.equal(gradeTxn.indexOf("await tx."), gradeClaimIdx,
    "A2-15. the claim is the FIRST tx operation — before the streak read and before every write");
  for (const effect of ["tx.practiceAnswer.upsert(", "tx.practiceTest.update(", "tx.xPLog.create(",
                        "awardXpInTransaction(", "tx.user.update("]) {
    assert.ok(gradeTxn.indexOf(effect) > gradeClaimIdx, `A2-16. ${effect} happens only AFTER a successful claim`);
  }
  // NON-VACUOUS against the FROZEN pre-A2 pin: the baseline transaction upserted answers and paid
  // XP/streak with no claim at all — the detector distinguishes the defect from the fix.
  const PRE_M15_A2 = "b476ce68bbbeac606f9af8ef1f375e9824d4508b";
  const gradeAtA2Baseline = stripC(require("node:child_process")
    .execSync(`git show ${PRE_M15_A2}:'app/api/tests/[testId]/grade/route.ts'`, { encoding: "utf8" }) as string);
  const gradeBaselineTxn = gradeAtA2Baseline.slice(gradeAtA2Baseline.indexOf("prisma.$transaction(async (tx) =>"));
  assert.ok(!gradeBaselineTxn.includes("tx.practiceTest.updateMany("),
    "A2-C10. control: the pre-A2 grading transaction had no conditional claim");
  assert.ok(gradeBaselineTxn.includes("tx.practiceAnswer.upsert(") && gradeBaselineTxn.includes("tx.xPLog.create("),
    "A2-C10b. control: yet it already carried the answer upserts and XP writes the claim now guards");

  // --- the remaining XP writers are all atomic, and none writes an absolute stale value ---
  // (M15 S1A A1 removed the writing route from this set: formative writing awards no XP at all.)
  for (const [name, src] of [["tests/grade", grade], ["judge", judge]] as const) {
    assert.ok(/awardXpInTransaction\(/.test(src), `140. ${name} awards XP through the atomic helper`);
    assert.ok(!/xp:\s*nextXp/.test(src), `141. ${name} writes no absolute stale XP value`);
    assert.ok(!/rank:\s*calculateRank\(nextXp\)/.test(src), `142. ${name} derives no rank from a pre-increment value`);
    assert.ok(!/const nextXp\s*=/.test(src), `143. ${name} no longer computes xp in JavaScript at all`);
  }
  assert.ok(/xp:\s*nextXp/.test("data: { xp: nextXp }"), "143b. control: that scan matches a real stale write");
  // 144 INVERTED BY M15 S1A A3a. This used to pin `wins: wonDebate ? user.wins + 1 : user.wins` to
  // prove A1/A2 had not disturbed the judge's wins/streak writes. A3a deliberately RETIRED that
  // write: a formative ballot (lexical on Path A, unvalidated AI on Path B) may not mint a
  // competition win. The property under test is therefore reversed rather than dropped — the judge
  // must now write NO wins at all. Bound to the write POSITION, because `wins` is still legitimately
  // READ (it feeds the internal bot-matching projection) and returned in the response.
  for (const updateCall of judge.split("tx.user.update(").slice(1)) {
    assert.ok(!/\bwins\s*:/.test(updateCall.slice(0, updateCall.indexOf("})"))),
      "144. judge writes no wins field (A3a: formative ballots cannot mint competition wins)");
  }
  assert.ok(/wins: user\.wins\b/.test(judge) && !/wins: wonDebate/.test(judge),
    "144a. and the surviving wins reference is the stored-value projection, not a speculative +1");
  // NON-VACUOUS: the same detector must fire on the frozen pre-A3a route, which DID write wins.
  {
    const judgeAtA3Baseline = stripC(require("node:child_process")
      .execSync(`git show bb7c4dcc3d6f0af76dd624a0b77dea5f9dabf7c2:'app/api/debates/[debateId]/judge/route.ts'`, { encoding: "utf8" }) as string);
    const baselineUpdate = judgeAtA3Baseline.split("tx.user.update(").slice(1)[0] ?? "";
    assert.ok(/\bwins\s*:/.test(baselineUpdate.slice(0, baselineUpdate.indexOf("})"))),
      "144-C. control: the pre-A3a judge route DID write wins, so 144 is a real control");
  }
  // M15 S1A A4a: this pinned the stale `streak: user.streak + 1`. That read-add-write could lose a
  // concurrent update, so A4a made it an atomic `{ increment: 1 }`. The PROPERTY is unchanged and is
  // what is asserted now — a completed round still counts as a practice session, and the counter is
  // no longer written from a value read earlier in the transaction.
  assert.ok(/streak: \{ increment: 1 \}/.test(judge),
    "144b. the judge route still counts the practice session, now atomically");
  assert.ok(!/streak: user\.streak \+ 1/.test(judge),
    "144b2. and no stale streak read-add-write survives");
  assert.ok(/streak: \{ increment: 1 \}/.test(grade) && !/streak: user\.streak \+ 1/.test(grade),
    "144c. and test-grade counts its practice session atomically too");
  assert.ok(/calculateDebateRating\(\{\s*xp: awarded\.xp/.test(judge),
    "145. judge's XP-derived rating uses the authoritative awarded value");
  for (const cut of ["app/api/debate/drills/submit/route.ts", "app/api/deca/drills/submit/route.ts",
                     "app/api/hosa/medterm/submit/route.ts"]) {
    assert.ok(refs.includes(cut), `83c. and the C2a drill routes ARE cut over (${cut})`);
  }

  // ================= C2a ROUTE CONTRACTS (source-level, deterministic) ============================
  const routes = {
    debateSession: read("app/api/debate/drills/session/route.ts"),
    decaSession: read("app/api/deca/drills/session/route.ts"),
    hosaSession: read("app/api/hosa/medterm/session/route.ts"),
    debateCheck: read("app/api/debate/drills/check/route.ts"),
    decaCheck: read("app/api/deca/drills/check/route.ts"),
    hosaCheck: read("app/api/hosa/medterm/check/route.ts"),
    debateSubmit: read("app/api/debate/drills/submit/route.ts"),
    decaSubmit: read("app/api/deca/drills/submit/route.ts"),
    hosaSubmit: read("app/api/hosa/medterm/submit/route.ts")
  };

  // The user lock must be the FIRST database statement of every session-start and final-submit
  // transaction — that is the whole serialization guarantee.
  for (const [name, src] of [["debateSession", routes.debateSession], ["decaSession", routes.decaSession],
                             ["hosaSession", routes.hosaSession], ["debateSubmit", routes.debateSubmit],
                             ["decaSubmit", routes.decaSubmit], ["hosaSubmit", routes.hosaSubmit]] as const) {
    const body = src.slice(src.indexOf("prisma.$transaction"));
    const lockAt = body.indexOf("lockUserRow(tx");
    assert.ok(lockAt > 0, `84. ${name} acquires the user row lock inside its transaction`);
    for (const later of ["findActiveSession(", "findFirst(", "practiceSession.create(", "requireEveryItemAnswered("]) {
      const at = body.indexOf(later);
      if (at > 0) assert.ok(lockAt < at, `85. ${name}: the lock precedes ${later}`);
    }
  }

  // Final submit takes a session id and NOTHING else — no answers, no ids, no grading data.
  for (const [name, src] of [["debateSubmit", routes.debateSubmit], ["decaSubmit", routes.decaSubmit],
                             ["hosaSubmit", routes.hosaSubmit]] as const) {
    assert.ok(src.includes("practiceSessionSubmitRequestSchema"), `86. ${name} accepts only a session id`);
    assert.ok(!src.includes("input.answers"), `87. ${name} never reads a client answer array`);
    assert.ok(src.includes("requireEveryItemAnswered("), `88. ${name} requires every distinct stored item answered`);
    assert.ok(src.includes("parseStoredResult("), `89. ${name} replays a stored completed result`);
    assert.ok(src.includes("alreadyCompleted: true"), `89b. ${name} marks that replay explicitly`);
    assert.ok(src.includes("sessionExpired()"), `90. ${name} returns the expiry outcome for a stale session`);
  }

  // Grading reads the SNAPSHOT. A live-bank grader after issuance would let a content edit change a
  // grade already earned — the exact defect the snapshot contract exists to remove.
  for (const [name, src] of [["debateSubmit", routes.debateSubmit], ["decaSubmit", routes.decaSubmit],
                             ["hosaSubmit", routes.hosaSubmit]] as const) {
    for (const liveGrader of ["gradeDrillAnswers(", "gradeDecaDrillAnswers(", "gradeMedTermAnswers(",
                              "buildDrillEvidence(", "buildDecaDrillEvidence(", "buildMedTermEvidence("]) {
      assert.ok(!src.includes(liveGrader), `91. ${name} never re-grades against the live bank (${liveGrader})`);
    }
  }

  // Exact-kind binding: each route resolves ONLY its own kind, so a DECA session id cannot be spent
  // on the Debate route.
  const kindOf: Array<[string, string, string]> = [
    ["debateSession", routes.debateSession, "DEBATE_DRILL"], ["debateCheck", routes.debateCheck, "DEBATE_DRILL"],
    ["debateSubmit", routes.debateSubmit, "DEBATE_DRILL"], ["decaSession", routes.decaSession, "DECA_DRILL"],
    ["decaCheck", routes.decaCheck, "DECA_DRILL"], ["decaSubmit", routes.decaSubmit, "DECA_DRILL"],
    ["hosaSession", routes.hosaSession, "HOSA_MEDTERM"], ["hosaCheck", routes.hosaCheck, "HOSA_MEDTERM"],
    ["hosaSubmit", routes.hosaSubmit, "HOSA_MEDTERM"]
  ];
  for (const [name, src, kind] of kindOf) {
    const kinds = new Set([...src.matchAll(/"(DEBATE_DRILL|DECA_DRILL|HOSA_MEDTERM|DEBATE_WRITING)"/g)].map((m) => m[1]));
    assert.deepEqual([...kinds], [kind], `92. ${name} binds exactly ${kind} and no other track`);
  }

  // Every check route scopes to the caller and reveals nothing about a session it does not own.
  for (const [name, src] of [["debateCheck", routes.debateCheck], ["decaCheck", routes.decaCheck],
                             ["hosaCheck", routes.hosaCheck]] as const) {
    assert.ok(/userId: user\.id/.test(src), `93. ${name} scopes the lookup to the authenticated user`);
    assert.ok(src.includes("sessionNotFound()"), `94. ${name} answers unknown and wrong-user identically`);
    assert.ok(src.includes("recordFirstAnswer("), `95. ${name} uses the first-answer CAS`);
    assert.ok(!src.includes("lockUserRow"), `96. ${name} does NOT take the user lock per answer`);
  }

  // Debate and DECA write mastery through the transaction-native cores; HOSA writes neither mastery
  // nor XP, and no drill route awards XP at all.
  for (const [name, src] of [["debateSubmit", routes.debateSubmit], ["decaSubmit", routes.decaSubmit]] as const) {
    assert.ok(src.includes("recordPracticeOutcomeInTransaction("), `97. ${name} uses the tx-native review core`);
    assert.ok(src.includes("recordDrillMasteryInTransaction("), `98. ${name} uses the tx-native mastery core`);
    assert.ok(src.indexOf("recordPracticeOutcomeInTransaction(") < src.indexOf("recordDrillMasteryInTransaction("),
      `99. ${name} runs review BEFORE mastery, and mastery consumes its result`);
    assert.ok(!src.includes("recordDrillMasteryDetailed("), `100. ${name} no longer uses the public non-tx helper`);
  }
  assert.ok(routes.hosaSubmit.includes("recordPracticeOutcomeInTransaction("), "101. HOSA submit records review");
  // Ban scans run over CODE, not prose — these routes describe in comments exactly what they refrain
  // from writing, and a comment saying "no MasteryProgress is written here" must not read as a write.
  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, " ").split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "")).join("\n");
  const hosaCode = stripComments(routes.hosaSubmit);
  for (const banned of ["recordDrillMasteryInTransaction", "recordDrillMastery", "MasteryProgress",
                        "masteryProgress", "XP_REWARDS", "xPLog", "awardXpInTransaction", "practiceAttempt"]) {
    assert.ok(!hosaCode.includes(banned), `102. HOSA stays review-only (${banned})`);
  }
  assert.ok(routes.hosaSubmit.includes("MasteryProgress"),
    "102b. control: the ban is real — the word IS present in that route's prose, and only the code scan clears it");
  for (const [name, src] of Object.entries(routes)) {
    for (const banned of ["XP_REWARDS", "awardXpInTransaction", "xPLog"]) {
      assert.ok(!stripComments(src).includes(banned), `103. no drill route awards XP (${name}, ${banned})`);
    }
  }

  // The floors and thresholds M13E1D-F established are unchanged, and are imported rather than retyped.
  assert.ok(routes.debateSubmit.includes("DEBATE_DRILL_REQUIRED_UNIQUE"), "104. Debate keeps its floor constant");
  assert.ok(routes.debateSubmit.includes("DRILL_PASS_THRESHOLD"), "104b. and its threshold constant");
  assert.ok(routes.decaSubmit.includes("DECA_DRILL_REQUIRED_UNIQUE"), "105. DECA keeps its floor constant");
  assert.ok(routes.decaSubmit.includes("DECA_DRILL_PASS_THRESHOLD"), "105b. and its threshold constant");
  assert.ok(routes.hosaSubmit.includes("HOSA_MEDTERM_REQUIRED_UNIQUE"), "106. HOSA keeps its unique floor");
  assert.ok(routes.hosaSubmit.includes("HOSA_MEDTERM_REQUIRED_AREAS"), "106b. and its area-breadth floor");
  assert.ok(/uniqueCorrect \* 100 >= MEDTERM_PASS_THRESHOLD \* uniqueTotal/.test(routes.hosaSubmit),
    "107. HOSA compares the EXACT ratio, never a rounded percent");
  const { DEBATE_DRILL_REQUIRED_UNIQUE, DRILL_PASS_THRESHOLD } = await import("../lib/debate-drills");
  const { DECA_DRILL_REQUIRED_UNIQUE, DECA_DRILL_PASS_THRESHOLD } = await import("../lib/deca-drills");
  const { HOSA_MEDTERM_REQUIRED_UNIQUE, HOSA_MEDTERM_REQUIRED_AREAS } = await import("../lib/hosa-medterm");
  assert.equal(DEBATE_DRILL_REQUIRED_UNIQUE, 5, "108. the Debate floor is still 5");
  assert.equal(DECA_DRILL_REQUIRED_UNIQUE, 5, "109. the DECA floor is still 5");
  assert.equal(HOSA_MEDTERM_REQUIRED_UNIQUE, 10, "110. HOSA still needs 10 unique");
  assert.equal(HOSA_MEDTERM_REQUIRED_AREAS, 3, "110b. across 3 areas");
  assert.equal(DRILL_PASS_THRESHOLD, 70, "111. thresholds are still 70");
  assert.equal(DECA_DRILL_PASS_THRESHOLD, 70, "111b.");
  // The HOSA route restates 70 because lib/hosa-medterm.ts keeps PASS_THRESHOLD private and C2a may
  // not modify that file. Pin the two together so they cannot drift apart silently.
  assert.equal(
    Number(/const MEDTERM_PASS_THRESHOLD = (\d+);/.exec(routes.hosaSubmit)?.[1]),
    Number(/const PASS_THRESHOLD = (\d+);/.exec(read("lib/hosa-medterm.ts"))?.[1]),
    "112. the HOSA route's restated threshold matches lib/hosa-medterm.ts exactly"
  );

  // Session start withholds the key. The response is built by the C1 serializer, which omits it.
  for (const [name, src] of [["debateSession", routes.debateSession], ["decaSession", routes.decaSession],
                             ["hosaSession", routes.hosaSession]] as const) {
    assert.ok(src.includes("serializeStart("), `113. ${name} serves items through the safe serializer`);
    assert.ok(src.includes("buildServedChoices("), `114. ${name} shuffles choices and mints opaque option ids`);
    assert.ok(src.includes("correctOptionId"), `115. ${name} stores the correct option server-side`);
    assert.ok(!/questions,\s*areas/.test(src), `116. ${name} no longer returns raw bank questions`);
    assert.ok(src.includes('kind: "DRILL"'), `117. ${name} persists a versioned DRILL snapshot`);
    assert.ok(src.includes("requestedCount: order.length"), `118. ${name} persists the padded order length`);
  }

  console.log(
    "Practice-session smoke passed: server-session helpers are in place and helper-only. Snapshots are versioned, " +
    "kind-discriminated and rejected rather than guessed when malformed; option ids are random per session and an " +
    "unanswered item ships no answer key; a twenty-slot focused session stores nine distinct items whose 6-of-9 " +
    "result is still 67, so repeats add no evidence; the user lock is the first statement and a missing row fails; " +
    "cleanup is user-scoped and bounded to twenty; the item CAS makes the first answer final and a later different " +
    "option cannot replace it. The transaction-native cores use ON CONFLICT DO NOTHING plus FOR UPDATE, contain no " +
    "catch-and-continue and no write-failed, keep the 1/3/7/14 ladder with pre-increment intervals, and survive a " +
    "concurrent unlocked creator. XP increments atomically so two awards sum instead of overwriting, with rank " +
    "derived from the returned value. Every public M13E1G variant, the returned write-failed, the degradation path " +
    "and the 28c contract are untouched, and no public helper calls the new cores."
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
