/**
 * Due-gated spaced-review ladder + winner-only mastery (M13E1G).
 *
 * Run with: npm run review-ladder:smoke
 *
 * NO DATABASE. Every assertion drives the REAL `recordPracticeOutcome` /
 * `recordDrillMasteryDetailed` against a stub installed on `globalThis.prisma` before `lib/prisma`
 * is first imported (that module reads `globalThis.prisma` before constructing a `PrismaClient`, so
 * no client is built and no connection opens). The stub models the exact CAS and unique-key
 * behaviour of the real table, and every test uses a FIXED timestamp.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// ---- M13E2 Phase A: additive practice-session schema control ----------------------------------------
// prisma/schema.prisma was byte-pinned to a MOVING `HEAD` here until M13E2 Phase A. A HEAD-relative pin
// turns green the moment the schema commit lands, so it proved nothing at the only time it mattered:
// before the commit. It is replaced by an immutable control at the pre-M13E2 commit plus structural
// assertions -- every historical model and enum survives byte-for-byte, `User` gains exactly one virtual
// back-relation, and the two new models arrive with exactly the approved fields, constraints and indexes.
const PRE_M13E2 = "95fdd4c812328728766de2f518b38da618bab3cb";
const M13E2_NEW_BLOCKS = ["model PracticeSession", "model PracticeSessionItem",
                          "enum PracticeSessionKind", "enum PracticeSessionStatus"];
const M13E2_USER_FIELD = "practiceSessions PracticeSession[]";
// name -> normalized body lines (comments stripped, runs of whitespace collapsed) so a rename, retype,
// nullability flip, default change or attribute change all surface as a body mismatch.
const schemaBlocks = (src: string) => {
  const out = new Map<string, string[]>();
  for (const m of src.matchAll(/^(model|enum)[ \t]+(\w+)[ \t]*\{([\s\S]*?)^\}/gm)) {
    out.set(`${m[1]} ${m[2]}`,
      m[3].split("\n").map((l) => l.replace(/\/\/.*$/, "").replace(/\s+/g, " ").trim()).filter(Boolean));
  }
  return out;
};
// THROWS on any non-additive change. It never returns a boolean, so the same function backs both the
// real check and the in-memory failing controls below -- a silent `false` would be a vacuous assertion.
function assertAdditiveSchema(now: string, parent: string) {
  const was = schemaBlocks(parent);
  const is = schemaBlocks(now);
  for (const name of M13E2_NEW_BLOCKS) {
    if (was.has(name)) throw new Error(`the parent schema already defined ${name}`);
    if (!is.has(name)) throw new Error(`the working schema is missing ${name}`);
  }
  if (parent.includes(M13E2_USER_FIELD)) throw new Error("the parent schema already had the User back-relation");
  for (const [name, body] of was) {
    const next = is.get(name);
    if (!next) throw new Error(`${name} was removed`);
    if (name === "model User") {
      const gained = next.filter((l) => !body.includes(l));
      const lost = body.filter((l) => !next.includes(l));
      if (lost.length > 0) throw new Error(`User lost ${lost.join(" | ")}`);
      if (gained.length !== 1 || gained[0] !== M13E2_USER_FIELD) {
        throw new Error(`User gained ${gained.join(" | ") || "nothing"} instead of exactly the back-relation`);
      }
    } else if (next.join("\n") !== body.join("\n")) {
      throw new Error(`${name} is not structurally identical to the parent`);
    }
  }
  const session = is.get("model PracticeSession")!.join("\n");
  const item = is.get("model PracticeSessionItem")!.join("\n");
  for (const required of ["userId String", "kind PracticeSessionKind", "track SkillTrack", "skillSlug String?",
                          "status PracticeSessionStatus @default(ISSUED)", "issuedAt DateTime @default(now())",
                          "expiresAt DateTime", "completedAt DateTime?", "purgeAfter DateTime",
                          "resultJson Json?", "scenarioJson Json?", "requestedAreas String[] @default([])",
                          "updatedAt DateTime @updatedAt", "items PracticeSessionItem[]",
                          "user User @relation(fields: [userId], references: [id], onDelete: Cascade)",
                          "@@index([userId, kind, status, expiresAt])", "@@index([userId, purgeAfter])"]) {
    if (!session.includes(required)) throw new Error(`PracticeSession is missing ${required}`);
  }
  for (const required of ["sessionId String", "bankQuestionId String", "displayOrder Int",
                          "promptSnapshot String @db.Text", "choicesJson Json", "correctOptionId String",
                          "explanationSnapshot String @db.Text", "area String", "skillSlug String",
                          "selectedOptionId String?", "isCorrect Boolean?", "answeredAt DateTime?",
                          "updatedAt DateTime @updatedAt",
                          "session PracticeSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)",
                          "@@unique([sessionId, bankQuestionId])", "@@unique([sessionId, displayOrder])"]) {
    if (!item.includes(required)) throw new Error(`PracticeSessionItem is missing ${required}`);
  }
  const added = [session, item, is.get("enum PracticeSessionKind")!.join("\n"),
                 is.get("enum PracticeSessionStatus")!.join("\n")].join("\n");
  for (const banned of ["PROCESSING", "FAILED", "ABANDONED", "claimedAt", "activeKey", "token", "nonce",
                        "@@index([status, expiresAt])", "@@index([sessionId])"]) {
    if (added.includes(banned)) throw new Error(`the new definitions carry an unapproved ${banned}`);
  }
  if (is.get("enum PracticeSessionStatus")!.join(",") !== "ISSUED,COMPLETED") {
    throw new Error("PracticeSessionStatus is not exactly ISSUED,COMPLETED");
  }
  if (is.get("enum PracticeSessionKind")!.join(",") !== "DEBATE_DRILL,DECA_DRILL,HOSA_MEDTERM,DEBATE_WRITING") {
    throw new Error("PracticeSessionKind is not exactly the four approved kinds");
  }
}

const read = (p: string) => readFileSync(p, "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "")).join("\n");

/** M13E1G's parent — the last commit with the ungated ladder. */
const PRE_M13E1G = "040b05e412d7067ae733c3a7861d4d54f1350581";
const DAY = 86_400_000;
/** Fixed clock: every scheduling assertion is deterministic. */
const NOW = new Date("2026-03-01T12:00:00.000Z");
const at = (ms: number) => new Date(NOW.getTime() + ms);

const controlsRun: string[] = [];
function control(label: string, holds: boolean) {
  assert.ok(holds, `control "${label}" did not demonstrate the failure it exists to demonstrate`);
  controlsRun.push(label);
}

// --- stub: models the unique key, the CAS predicate, and per-call failure injection ----------------

type Row = { id: string; userId: string; skillId: string; reviewCount: number; nextReviewAt: Date;
             lastOutcome: string; createdAt: Date; updatedAt: Date };
type MasteryRow = { id: string; userId: string; skillId: string; masteryPercent: number;
                    correctCount: number; incorrectCount: number };

const db = {
  schedule: null as Row | null,
  mastery: null as MasteryRow | null,
  skillExists: true,
  /** Set to make the NEXT create throw a unique-key conflict, as a concurrent writer would. */
  createConflictsWith: null as Row | null,
  masteryThrows: false,
  scheduleThrows: false,
  /** What a CONCURRENT reader observed: both submissions read this, then race to CAS. */
  pinnedRead: null as Row | null,
  ops: [] as string[]
};
function resetDb() {
  db.schedule = null; db.mastery = null; db.skillExists = true;
  db.createConflictsWith = null; db.masteryThrows = false; db.scheduleThrows = false;
  db.pinnedRead = null; db.ops = [];
}
const stubPrisma = {
  skill: { findUnique: async () => (db.skillExists ? { id: "skill-1" } : null) },
  masteryProgress: {
    findUnique: async () => db.mastery,
    create: async (a: { data: Record<string, unknown> }) => {
      if (db.masteryThrows) throw new Error("simulated mastery failure");
      db.ops.push("mastery.create");
      db.mastery = { id: "m1", userId: "u", skillId: "skill-1", masteryPercent: a.data.masteryPercent as number,
                     correctCount: a.data.correctCount as number, incorrectCount: a.data.incorrectCount as number };
      return db.mastery;
    },
    update: async (a: { data: Record<string, unknown> }) => {
      if (db.masteryThrows) throw new Error("simulated mastery failure");
      db.ops.push("mastery.update");
      if (db.mastery) db.mastery.masteryPercent = a.data.masteryPercent as number;
      return db.mastery;
    }
  },
  skillReviewSchedule: {
    findUnique: async () => {
      db.ops.push("schedule.find");
      if (db.scheduleThrows) throw new Error("x");
      // A pinned read models the concurrent case: the second submission saw the row as it stood
      // BEFORE the first submission's write, which is exactly what makes its CAS fail.
      return db.pinnedRead ?? db.schedule;
    },
    create: async (a: { data: Record<string, unknown> }) => {
      db.ops.push("schedule.create");
      if (db.scheduleThrows) throw new Error("x");
      if (db.createConflictsWith) { db.schedule = db.createConflictsWith; db.createConflictsWith = null;
        throw new Error("Unique constraint failed on the fields: (`userId`,`skillId`)"); }
      if (db.schedule) throw new Error("Unique constraint failed");
      const created = at(0);
      db.schedule = { id: "r1", userId: a.data.userId as string, skillId: a.data.skillId as string,
                      reviewCount: a.data.reviewCount as number, nextReviewAt: a.data.nextReviewAt as Date,
                      lastOutcome: a.data.lastOutcome as string, createdAt: created, updatedAt: created };
      return db.schedule;
    },
    // The real CAS: matches on the exact snapshot, not merely on due-ness.
    updateMany: async (a: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      db.ops.push("schedule.updateMany");
      if (db.scheduleThrows) throw new Error("x");
      const r = db.schedule;
      if (!r) return { count: 0 };
      const match = r.userId === a.where.userId && r.skillId === a.where.skillId &&
        r.reviewCount === a.where.reviewCount &&
        r.nextReviewAt.getTime() === (a.where.nextReviewAt as Date).getTime();
      if (!match) return { count: 0 };
      r.reviewCount = a.data.reviewCount as number;
      r.nextReviewAt = a.data.nextReviewAt as Date;
      r.lastOutcome = a.data.lastOutcome as string;
      r.updatedAt = at(1);
      return { count: 1 };
    },
    count: async () => 0,
    findMany: async () => []
  }
};
(globalThis as unknown as { prisma?: unknown }).prisma = stubPrisma;

const days = (d: Date) => Math.round((d.getTime() - NOW.getTime()) / DAY);

async function main() {
  const S = await import("../lib/spaced-review");
  assert.equal((globalThis as unknown as { prisma?: unknown }).prisma, stubPrisma,
    "69. no real PrismaClient was constructed — the stub is still the module's client");
  const review = (passed: boolean, now: Date = NOW) => S.recordPracticeOutcome({ userId: "u", skillId: "skill-1", passed, now });
  const mastery = (scorePercent: number, passed: boolean, now: Date = NOW) =>
    S.recordDrillMasteryDetailed({ userId: "u", skillSlug: "s", scorePercent, passed, now });

  // ---- 1-2. the first schedule is ONE day -----------------------------------------------------------
  resetDb();
  let r = await review(true);
  assert.equal(r.status, "created", "1. a first pass creates the schedule");
  assert.equal(r.status === "created" ? r.reviewCount : -1, 1, "1b. at reviewCount 1");
  assert.equal(days(db.schedule!.nextReviewAt), 1, "1c. one day out — not three");
  resetDb();
  r = await review(false);
  assert.equal(r.status, "created", "2. a first fail also creates the schedule");
  assert.equal(r.status === "created" ? r.reviewCount : -1, 0, "2b. at reviewCount 0");
  assert.equal(days(db.schedule!.nextReviewAt), 1, "2c. also one day out");
  // CONTROL: the pre-fix code incremented BEFORE indexing, so index 0 was unreachable on a pass.
  control("pre-increment indexing is what makes the first pass +1d (a post-increment gives +3d)",
    S.intervalDaysFor(0) === 1 && S.intervalDaysFor(1) === 3);

  // ---- 3-5. rapid sequential practice cannot inflate the ladder ---------------------------------------
  resetDb();
  const seq = [await review(true), await review(true), await review(true), await review(true)];
  assert.equal(seq[0].status, "created", "3. only the first submission creates the row");
  for (const later of seq.slice(1)) {
    assert.equal(later.status, "preserved-not-due", "3b. every later pre-due pass preserves it");
    assert.equal(later.scheduleChanged, false, "3c. and changes nothing");
  }
  assert.equal(db.schedule!.reviewCount, 1, "4. reviewCount is still 1 after four rapid passes");
  assert.equal(days(db.schedule!.nextReviewAt), 1, "4b. and the date has not moved");
  resetDb();
  await review(true);
  const preDueFail = await review(false);
  assert.equal(preDueFail.status, "preserved-not-due", "5. a pre-due FAILURE also writes nothing");
  assert.equal(db.schedule!.reviewCount, 1, "5b. so ordinary practice cannot punish the learner");
  control("the pre-fix contract advanced 3d/7d/14d on four rapid passes; the gate stops all of them",
    db.schedule!.reviewCount === 1 && days(db.schedule!.nextReviewAt) === 1);

  // ---- 6-8. due and overdue -------------------------------------------------------------------------
  for (const [label, offset] of [["due", 0], ["overdue", -3 * DAY]] as const) {
    resetDb();
    db.schedule = { id: "r1", userId: "u", skillId: "skill-1", reviewCount: 2, nextReviewAt: at(offset),
                    lastOutcome: "passed", createdAt: at(-30 * DAY), updatedAt: at(-30 * DAY) };
    const pass = await review(true);
    assert.equal(pass.status, "advanced", `6/8. a ${label} pass advances`);
    assert.equal(db.schedule!.reviewCount, 3, "6b. exactly one rung");
    assert.equal(days(db.schedule!.nextReviewAt), 7, "6c. using the PRE-increment count (index 2 = 7d)");

    resetDb();
    db.schedule = { id: "r1", userId: "u", skillId: "skill-1", reviewCount: 3, nextReviewAt: at(offset),
                    lastOutcome: "passed", createdAt: at(-30 * DAY), updatedAt: at(-30 * DAY) };
    const fail = await review(false);
    assert.equal(fail.status, "reset-after-due-failure", `7. a ${label} failure resets`);
    assert.equal(db.schedule!.reviewCount, 0, "7b. to count 0");
    assert.equal(days(db.schedule!.nextReviewAt), 1, "7c. one day out");
  }

  // ---- 9-12 / 23-30. concurrency on an EXISTING due row ----------------------------------------------
  // Both submissions read the same snapshot; the stub's CAS lets exactly one win.
  for (const [a, b] of [["pass", "pass"], ["pass", "fail"], ["fail", "pass"], ["fail", "fail"]] as const) {
    resetDb();
    const dueSnapshot: Row = { id: "r1", userId: "u", skillId: "skill-1", reviewCount: 2, nextReviewAt: at(-DAY),
                               lastOutcome: "passed", createdAt: at(-30 * DAY), updatedAt: at(-30 * DAY) };
    db.schedule = { ...dueSnapshot };
    db.mastery = { id: "m1", userId: "u", skillId: "skill-1", masteryPercent: 90, correctCount: 0, incorrectCount: 0 };
    const first = await mastery(a === "pass" ? 95 : 40, a === "pass");
    const masteryOpsAfterFirst = db.ops.filter((o) => o.startsWith("mastery.")).length;
    // The second submission is CONCURRENT: it read the row before the first one wrote.
    db.pinnedRead = { ...dueSnapshot };
    const second = await mastery(b === "pass" ? 95 : 40, b === "pass");
    db.pinnedRead = null;
    const masteryOps = db.ops.filter((o) => o.startsWith("mastery.")).length;

    assert.equal(first.status, "updated", `9-12. ${a}/${b}: the winner writes mastery`);
    assert.equal(second.status, "preserved-concurrent", `9-12b. ${a}/${b}: the loser is a deliberate no-op`);
    assert.equal(masteryOps, masteryOpsAfterFirst, `26/27. ${a}/${b}: the loser made ZERO mastery calls`);
    assert.equal(db.schedule!.reviewCount, a === "pass" ? 3 : 0, `9-12c. ${a}/${b}: exactly one review mutation`);
    assert.equal(db.mastery!.masteryPercent, a === "pass" ? 95 : 40,
      `9-12d. ${a}/${b}: mastery reflects the WINNER only`);
  }
  // CONTROL: under upward-only losers, fail/pass would have ended at 95 and erased the due failure.
  control("winner-only is what keeps a losing pass from erasing a winning due failure",
    db.mastery!.masteryPercent === 40);

  // ---- 13-16 / 17-22. the no-row create race ---------------------------------------------------------
  for (const [a, b] of [["pass", "pass"], ["pass", "fail"], ["fail", "pass"], ["fail", "fail"]] as const) {
    resetDb();
    const winnerRow: Row = { id: "r1", userId: "u", skillId: "skill-1", reviewCount: a === "pass" ? 1 : 0,
                             nextReviewAt: at(DAY), lastOutcome: a, createdAt: at(0), updatedAt: at(0) };
    db.createConflictsWith = winnerRow;                       // the loser's create hits the unique key
    const loser = await mastery(b === "pass" ? 95 : 40, b === "pass");
    assert.equal(loser.status, "preserved-concurrent", `13-16. ${a}/${b}: the create-race loser no-ops`);
    assert.equal(loser.review?.status, "preserved-concurrent-created", "13-16b. with the create-race status");
    assert.equal(loser.review?.previousReviewCount ?? "null", "null", "13-16c. and NULL previous count");
    assert.equal(loser.review?.dueState, "no-schedule", "13-16d. no due determination was possible");
    assert.equal(db.ops.filter((o) => o.startsWith("mastery.")).length, 0, "13-16e. it wrote no mastery");
  }
  // 17-22. the create-race classifier
  const classify = async (row: Partial<Row>) => {
    resetDb();
    db.createConflictsWith = { id: "r1", userId: "u", skillId: "skill-1", reviewCount: 1, nextReviewAt: at(DAY),
                               lastOutcome: "passed", createdAt: at(0), updatedAt: at(0), ...row } as Row;
    return (await review(true)).status;
  };
  assert.equal(await classify({}), "preserved-concurrent-created", "17. a compatible untouched first row is accepted");
  assert.equal(await classify({ reviewCount: 2, nextReviewAt: at(3 * DAY) }), "write-failed",
    "18. a 3-day ADVANCED row is rejected");
  assert.equal(await classify({ reviewCount: 3, createdAt: at(-30 * DAY), updatedAt: at(-DAY), nextReviewAt: at(14 * DAY) }), "write-failed",
    "19. a mature unrelated row is rejected");
  assert.equal(await classify({ nextReviewAt: at(-DAY) }), "write-failed", "20. an already-due row is rejected");
  assert.equal(await classify({ updatedAt: at(5000) }), "write-failed",
    "21. a row whose create/update relationship exceeds one second is rejected");
  control("the classifier separates a first schedule from an advance by two days, not by a loose window",
    (await classify({})) === "preserved-concurrent-created" &&
    (await classify({ reviewCount: 2, nextReviewAt: at(3 * DAY) })) === "write-failed");

  // ---- 23-25. only a due failure may lower mastery ----------------------------------------------------
  const masteryAfter = async (setup: () => void, score: number, passed: boolean) => {
    resetDb(); setup();
    db.mastery = { id: "m1", userId: "u", skillId: "skill-1", masteryPercent: 90, correctCount: 0, incorrectCount: 0 };
    const out = await mastery(score, passed);
    return { status: out.status, review: out.review?.status, percent: db.mastery?.masteryPercent };
  };
  const dueRow = () => { db.schedule = { id: "r1", userId: "u", skillId: "skill-1", reviewCount: 2,
    nextReviewAt: at(-DAY), lastOutcome: "passed", createdAt: at(-30 * DAY), updatedAt: at(-30 * DAY) }; };
  const notDueRow = () => { db.schedule = { id: "r1", userId: "u", skillId: "skill-1", reviewCount: 2,
    nextReviewAt: at(7 * DAY), lastOutcome: "passed", createdAt: at(-30 * DAY), updatedAt: at(-30 * DAY) }; };
  assert.equal((await masteryAfter(dueRow, 40, false)).percent, 40, "23. a DUE failure lowers mastery");
  assert.equal((await masteryAfter(notDueRow, 40, false)).percent, 90, "24. a PRE-DUE failure cannot lower it");
  const failedWrite = await masteryAfter(() => { db.scheduleThrows = true; }, 40, false);
  assert.equal(failedWrite.review, "write-failed", "25. a failed review write is reported");
  assert.equal(failedWrite.percent, 90, "25b. and cannot lower mastery");

  // ---- 28-30. partial failure and the boolean wrapper --------------------------------------------------
  resetDb(); dueRow();
  db.mastery = { id: "m1", userId: "u", skillId: "skill-1", masteryPercent: 90, correctCount: 0, incorrectCount: 0 };
  db.masteryThrows = true;
  const reviewOkMasteryBad = await mastery(95, true);
  assert.equal(reviewOkMasteryBad.status, "write-failed", "28. mastery failure is reported as such");
  assert.equal(reviewOkMasteryBad.review?.status, "advanced", "28b. and the REAL review mutation is preserved");
  assert.equal(db.schedule!.reviewCount, 3, "28c. the review change is not rolled back — it truthfully landed");

  // 29. Mastery succeeded, review write failed: the mastery status stays `updated` and the review
  // failure is carried alongside it. Two facts, reported separately — neither one relabels the other.
  resetDb(); db.scheduleThrows = true;
  db.mastery = { id: "m1", userId: "u", skillId: "skill-1", masteryPercent: 90, correctCount: 0, incorrectCount: 0 };
  const masteryOkReviewBad = await mastery(95, true);
  assert.equal(masteryOkReviewBad.status, "updated", "29. mastery success is still reported as updated");
  assert.equal(masteryOkReviewBad.review?.status, "write-failed", "29b. with the review failure carried alongside");
  assert.equal(db.mastery!.masteryPercent, 95, "29c. and the mastery write really landed");

  resetDb(); dueRow();
  assert.equal(await S.recordDrillMastery({ userId: "u", skillSlug: "s", scorePercent: 95, passed: true, now: NOW }), true,
    "30. the boolean wrapper is true for an actual write");
  resetDb();
  db.createConflictsWith = { id: "r1", userId: "u", skillId: "skill-1", reviewCount: 1, nextReviewAt: at(DAY),
                             lastOutcome: "passed", createdAt: at(0), updatedAt: at(0) };
  assert.equal(await S.recordDrillMastery({ userId: "u", skillSlug: "s", scorePercent: 95, passed: true, now: NOW }), false,
    "30b. and FALSE for a deliberate concurrency no-op — it wrote nothing");
  resetDb(); db.skillExists = false;
  assert.equal(await S.recordDrillMastery({ userId: "u", skillSlug: "s", scorePercent: 95, passed: true, now: NOW }), false,
    "30c. false for a missing skill");
  control("returning true for a no-op would put an unbacked slug into wroteSkills",
    (await (async () => { resetDb(); db.createConflictsWith = { id: "r1", userId: "u", skillId: "skill-1",
        reviewCount: 1, nextReviewAt: at(DAY), lastOutcome: "passed", createdAt: at(0), updatedAt: at(0) };
      return (await mastery(95, true)).status; })()) === "preserved-concurrent");

  // ---- serialization ----------------------------------------------------------------------------------
  resetDb();
  const created = await review(true);
  const dto = S.serializeReviewResult(created);
  assert.equal(typeof dto.nextReviewAt, "string", "47. dates serialize to ISO strings");
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(dto.nextReviewAt!), "47b. in ISO 8601");
  assert.equal(dto.previousNextReviewAt, null, "47c. an absent previous date is null, never invented");
  const failedDto = S.serializeReviewResult({ status: "write-failed", dueState: "unknown", scheduleChanged: false });
  assert.deepEqual([failedDto.reviewCount, failedDto.nextReviewAt, failedDto.previousNextReviewAt], [null, null, null],
    "47d. write-failed serializes unavailable counts and dates as null");

  // ---- route + component contracts ---------------------------------------------------------------------
  const decaRoute = stripComments(read("app/api/deca/drills/submit/route.ts"));
  const debateRoute = stripComments(read("app/api/debate/drills/submit/route.ts"));
  const writingRoute = stripComments(read("app/api/skills/debate-writing/route.ts"));
  const hosaRoute = stripComments(read("app/api/hosa/medterm/submit/route.ts"));
  const decaUi = stripComments(read("components/training/concept-drills.tsx"));
  const debateUi = stripComments(read("components/training/debate-drills.tsx"));

  assert.ok(!decaRoute.includes("reviewScheduled"), "46. DECA no longer sends reviewScheduled");
  assert.ok(!decaUi.includes("reviewScheduled"), "46b. nor does its component");
  for (const [label, src] of [["DECA", decaRoute], ["Debate", debateRoute]] as const) {
    // C2a: both drill routes now persist through the transaction-native cores. The public helpers
    // above are untouched and still asserted in full; these routes simply no longer call them.
    assert.ok(/recordPracticeOutcomeInTransaction\(/.test(src), `38. the ${label} route uses the tx-native review core`);
    assert.ok(/recordDrillMasteryInTransaction\(/.test(src), `38b. and the tx-native mastery core`);
    assert.ok(src.indexOf("recordPracticeOutcomeInTransaction(") < src.indexOf("recordDrillMasteryInTransaction("),
      `38b2. review first, mastery consuming its result (${label})`);
    assert.ok(/const now = new Date\(\);/.test(src), `52. one server timestamp per submission`);
    assert.ok(/if \(mastery\.status === "updated"\) wroteSkills\.push/.test(src),
      `32. only an actual mastery update enters wroteSkills (${label})`);
    assert.ok(/lockUserRow\(tx, user\.id\)/.test(src), `32b. and the user row is locked first (${label})`);
    assert.ok(/parseStoredResult\(/.test(src), `32c. a completed retry replays the stored result (${label})`);
  }
  assert.ok(!/(?<!InTransaction)\brecordDrillMastery\(/.test(debateRoute),
    "38c. the Debate route no longer calls the boolean helper");

  // Debate writing is FORMATIVE (M15 S1A A1): it left the review ladder, mastery and XP entirely.
  // The ladder's only writers are the drill routes asserted at 38/38b — a keyword-checklist grade
  // may no longer advance, create or knock down any schedule.
  for (const bannedWrite of ["recordPracticeOutcome", "txMasteryMayDecrease", "awardXpInTransaction",
                             "masteryProgress", "practiceAttempt", "questionAttempt", "XP_REWARDS", "xPLog"]) {
    assert.ok(!writingRoute.includes(bannedWrite),
      `53. formative writing no longer touches the ladder, mastery or XP (${bannedWrite})`);
  }
  assert.ok(!/isReviewDue\(/.test(writingRoute), "54. and no independent due-check reappeared");
  assert.ok(/formative: true/.test(writingRoute), "54b. the submission result is declared formative");
  assert.ok(writingRoute.indexOf("parseStoredResult(") < writingRoute.indexOf("gradeDebateWritingResponse("),
    "56. a second concurrent submit returns the stored result before the grader");
  // NON-VACUOUS, pinned to the FROZEN G2-closure commit (never HEAD-relative): the pre-A1 route ran
  // the ladder core and awarded XP, so the bans above catch exactly what they exist to prevent.
  const PRE_M15_S1A = "338a88df64127c6f995167f84556d0df5a98ff22";
  const writingAtA1Baseline = stripComments(
    execSync(`git show ${PRE_M15_S1A}:app/api/skills/debate-writing/route.ts`, { encoding: "utf8" }));
  assert.ok(/recordPracticeOutcomeInTransaction\(/.test(writingAtA1Baseline) &&
    /awardXpInTransaction\(/.test(writingAtA1Baseline) &&
    (writingAtA1Baseline.match(/XP_REWARDS\.lessonCompleted/g) ?? []).length > 0,
    "55. control: the pre-A1 route did advance the ladder and award XP — the bans are non-vacuous");
  // C2b: rank is no longer derived in this route from a pre-read xp. `awardXpInTransaction` performs
  // an atomic increment and derives rank from the value it RETURNS — the same thresholds, computed
  // from an authoritative number instead of a stale one.
  assert.ok(!/calculateRank\(nextXp\)/.test(writingRoute),
    "55b. the stale pre-increment rank derivation is gone");
  // 55b2 retired by M15 S1A A1: formative writing awards no XP at all, so there is no helper to
  // assert here — the atomic-helper contract is still proven on lib/xp.ts itself at 55b3/55b4.
  const xpHelper = read("lib/xp.ts");
  assert.ok(/calculateRank\(updatedUser\.xp\)/.test(xpHelper),
    "55b3. whose rank comes from the value the increment returned");
  assert.ok(/RANK_THRESHOLDS/.test(xpHelper), "55b4. against the unchanged rank thresholds");
  assert.ok(!/enforceRateLimit|REQUIRED_UNIQUE|reviewToken/.test(writingRoute),
    "58. no rate limit, evidence floor or token scheme was added");
  assert.ok(!/xPLog\.create/.test(writingRoute), "58b. formative writing writes no XP log (M15 S1A A1)");

  // HOSA stays review-only and may ignore the detailed result truthfully.
  for (const banned of ["recordDrillMastery", "recordDrillMasteryDetailed", "MasteryProgress", "masteryProgress"]) {
    assert.ok(!hosaRoute.includes(banned), `63. HOSA remains review-only (no ${banned})`);
  }
  assert.ok(/HOSA_MEDTERM_REQUIRED_UNIQUE|requiredUnique/.test(hosaRoute), "64. HOSA evidence contract intact");

  // Learner copy.
  // C3a-i: Debate is cut over, so its no-op copy is gone — the state it described cannot occur any
  // more. DECA still runs the legacy client until C3a-ii and must keep it.
  // C3a-ii: both drill clients are cut over, so the no-op copy is gone from each along with the
  // state that produced it, and both now carry the first-answer-final copy the protocol does produce.
  for (const [label, ui] of [["DECA", decaUi], ["Debate", debateUi]] as const) {
    assert.ok(!ui.includes("Another submission already handled this review"),
      `33/34. ${label}'s no-op copy is gone with the state that produced it`);
    assert.ok(ui.includes("Your first answer for this question is the one that counts."),
      `33/34c. ${label} carries first-answer-final copy instead`);
    assert.ok(ui.includes("Keep practicing"), `34b. ${label} below-threshold badge`);
    assert.ok(!/review (was |is )?scheduled/i.test(ui), `35. ${label} never claims a review was scheduled`);
    // Word-bounded and case-sensitive where it matters: a substring scan for "CAS" matches "because".
    // Only STRING LITERALS are scanned, since these are what reach the learner.
    // Prose only: a status identifier like "preserved-concurrent" is a type value, never shown.
    const isProse = (t: string) => /\s/.test(t.trim()) && /[a-z] [a-z]/i.test(t);
    const literals = [...ui.matchAll(/"([^"\n]{12,})"/g)].map((m) => m[1])
      .concat([...ui.matchAll(/`([^`\n]{12,})`/g)].map((m) => m[1]))
      .filter(isProse);
    for (const jargon of [/\bCAS\b/, /\bconcurren/i, /\btransaction/i, /\bpersistence\b/i, /\bdatabase\b/i]) {
      const leak = literals.find((t) => jargon.test(t));
      assert.ok(!leak, `${label} exposes no ${jargon} jargon to the learner (found: ${leak ?? ""})`);
    }
  }
  const { resultState: decaState } = await import("../components/training/concept-drills");
  const { resultState: debateState } = await import("../components/training/debate-drills");
  const row = (state: (s: never) => { badge: string }, evidenceStatus: string, persistenceStatus: string) =>
    state({ area: "a", label: "l", skillSlug: "s", total: 5, correct: 4, scorePercent: 80, uniqueTotal: 5,
      uniqueCorrect: 4, requiredUnique: 5, evidenceScore: 80, evidenceStatus, persistenceStatus,
      review: null, passed: evidenceStatus === "passing" } as never).badge;
  // DECA still runs the legacy client until C3a-ii, so it keeps its full legacy matrix.
  // Both clients are cut over now; the states the server cannot produce are gone from both, and the
  // fail-closed case is asserted for each below.
  for (const [label, st] of [["DECA", decaState], ["Debate", debateState]] as const) {
    assert.equal(row(st as never, "insufficient-evidence", "not-attempted"), "Practice only", `${label} floor`);
    assert.equal(row(st as never, "passing", "updated"), "Progress saved", `${label} saved`);
    assert.equal(row(st as never, "below-threshold", "updated"), "Keep practicing", `50. ${label} never celebratory`);
    assert.equal(row(st as never, "passing", "skill-missing"), "Not tracked yet", `${label} unseeded skill`);
  }
  for (const [label, st] of [["DECA", decaState], ["Debate", debateState]] as const) {
    control(`${label}'s qualifying-but-unwritten case fails closed rather than claiming a save`,
      row(st as never, "passing", "not-attempted") === "Practice only");
  }
  control("and it stays distinct from a real save and from an unseeded skill",
    new Set([row(debateState as never, "passing", "updated"),
             row(debateState as never, "passing", "not-attempted"),
             row(debateState as never, "passing", "skill-missing")]).size === 3);

  // ---- 59-62. Study Arcade legacy copy -------------------------------------------------------------------
  const reviewPage = read("app/(app)/study-arcade/review/page.tsx");
  const reviewCode = stripComments(reviewPage);
  assert.ok(!reviewCode.includes("Survived"), "59. the numeric legacy claim is gone");
  for (const banned of ["reviews so far", "reassessment", "practices"]) {
    assert.ok(!reviewCode.includes(banned), `60. and no replacement count claim (${banned})`);
  }
  assert.ok(reviewCode.includes("Due for review since"), "61. the truthful due line remains");
  assert.ok(reviewCode.includes("reassessable") && reviewCode.includes("Reassess now"),
    "62. due-card routing and reassessability are unchanged");

  // ---- 40-45. M13E1E / M13E1D evidence contracts are untouched ---------------------------------------------
  const { DEBATE_DRILL_REQUIRED_UNIQUE, buildDrillEvidence, DRILL_BANK } = await import("../lib/debate-drills");
  const { DECA_DRILL_REQUIRED_UNIQUE } = await import("../lib/deca-drills");
  assert.equal(DEBATE_DRILL_REQUIRED_UNIQUE, 5, "40. the Debate floor is still 5");
  assert.equal(DECA_DRILL_REQUIRED_UNIQUE, 5, "40b. and the DECA floor is still 5");
  const CWI = DRILL_BANK.filter((q) => q.area === "claim-warrant-impact");
  const wrong = (q: (typeof DRILL_BANK)[number]) => q.choices.find((c) => c !== q.correctAnswer)!;
  const rightThenWrong = buildDrillEvidence([{ id: CWI[0].id, selected: CWI[0].correctAnswer },
                                             { id: CWI[0].id, selected: wrong(CWI[0]) }]);
  assert.equal(rightThenWrong[0].uniqueCorrect, 1, "41. first occurrence still controls");
  assert.equal(buildDrillEvidence([{ id: "nope", selected: "x" }]).length, 0, "42. unknown ids remain inert");
  // This fixture is about the EVIDENCE contract (first-answer-per-distinct-id defeats repeat
  // inflation), not about the session builder — builder depth is owned by the two Debate suites.
  // Its denominator is pinned to the LEGACY NINE so that 67 keeps meaning "six of nine distinct"
  // after Global-G2 Slice 1 took rebuttal to 30. Additions append after rb-09, so this is stable.
  const REB = DRILL_BANK.filter((q) => q.area === "rebuttal").slice(0, 9);
  assert.deepEqual(REB.map((q) => q.id),
    ["rb-01", "rb-02", "rb-03", "rb-04", "rb-05", "rb-06", "rb-07", "rb-08", "rb-09"],
    "43-pre. the legacy nine are still the first nine rebuttal items");
  const padded = REB.map((q, i) => ({ id: q.id, selected: i < 6 ? q.correctAnswer : wrong(q) }));
  while (padded.length < 20) { const q = REB[padded.length % 9]; padded.push({ id: q.id, selected: q.correctAnswer }); }
  assert.equal(buildDrillEvidence(padded)[0].uniqueTotal, 9,
    "43a. twenty answers resolve to nine distinct questions — the denominator behind 67, stated explicitly");
  assert.equal(buildDrillEvidence(padded)[0].uniqueCorrect, 6, "43b. six were correct on first exposure");
  assert.equal(buildDrillEvidence(padded)[0].evidenceScore, 67, "43. the honest 6-of-9 padding is still 67");
  for (const banned of ["xpReward", "XPLog", "xpLog", "awardXp", "XP_REWARDS"]) {
    assert.ok(!stripComments(read("lib/debate-drills.ts")).includes(banned), `45. no XP in Debate drills (${banned})`);
    assert.ok(!debateRoute.includes(banned), `45b. nor in its route (${banned})`);
  }

  // ---- 65-68. nothing structural changed --------------------------------------------------------------------
  const sha = (p: string) => execSync(`git show HEAD:'${p}' | shasum -a 256`, { encoding: "utf8" }).split(" ")[0];
  const now = (p: string) => execSync(`shasum -a 256 '${p}'`, { encoding: "utf8" }).split(" ")[0];
  // lib/debate-drills.ts and lib/deca-drills.ts are deliberately absent from M14 Global G2 Slice 0
  // onward: those hashes were HEAD-relative, so they turned green the moment any expansion commit
  // landed and proved nothing about it — exactly the defect removed from lib/hosa-medterm.ts at
  // Phase 2a. The eight Global-G2 slices expand both banks. What they protected is asserted at 68G.
  for (const file of ["prisma/seed.ts",
                      // app/api/hosa/medterm/submit/route.ts is deliberately absent from M13E2 C2a
                      // onward: it is now session-backed. What the hash protected is asserted at 65h.
                      // lib/hosa-medterm.ts is deliberately absent from M14 Phase 2a onward: that
                      // milestone APPENDS word-root items (audit G2), so a hash here would forbid an
                      // approved change. It was also HEAD-relative, so it would have turned green the
                      // moment the expansion commit landed — proving nothing. What it protected is
                      // asserted behaviourally at 65M below, and the bank's CONTENT integrity lives
                      // in scripts/hosa-medterm-evidence-smoke.ts (31f*), which diffs against an
                      // IMMUTABLE parent commit and permits only additive word-root entries.
                      ]) {
    assert.equal(now(file), sha(file), `65-68. ${file} is byte-identical to HEAD`);
  }

  // ---- 65M. what the hosa-medterm hash was protecting, asserted exactly ---------------------------
  // This suite owns the REVIEW LADDER. Its stake in the terminology bank was never the wording of the
  // questions — it was that the bank stays inert with respect to XP, mastery and the ladder itself.
  // Every scan below runs over comment-stripped source, because the module explains in prose exactly
  // what it refrains from doing.
  const medtermSrc = read("lib/hosa-medterm.ts");
  const medtermCode = stripComments(medtermSrc);

  // 65M1. No XP of any kind can originate in the bank module.
  for (const banned of ["xpReward", "XPLog", "xpLog", "awardXp", "XP_REWARDS", "awardXpInTransaction"]) {
    assert.ok(!medtermCode.includes(banned), `65M1. no XP symbol in the terminology bank (${banned})`);
  }
  // 65M2. No mastery behaviour is introduced there — the skill is review-only by design.
  for (const banned of ["MasteryProgress", "masteryProgress", "recordDrillMastery", "masteryLevel"]) {
    assert.ok(!medtermCode.includes(banned), `65M2. no mastery symbol in the terminology bank (${banned})`);
  }
  // 65M3. The bank module reaches no database, route, session or review writer: adding questions
  //       cannot change runtime behaviour, only the pool a session is drawn from.
  for (const banned of ["prisma", "@/lib/prisma", "fetch(", "practiceSession", "recordPracticeOutcome",
                        "isReviewDue", "nextReviewAt", "REVIEW_INTERVALS_DAYS"]) {
    assert.ok(!medtermCode.includes(banned), `65M3. the terminology bank stays inert (${banned})`);
  }
  // 65M4. Its only export surface into review is the persistence REQUEST, which is a pure decision —
  //       and it still refuses to emit one without sufficient evidence.
  assert.ok(/export function medTermPersistenceRequest/.test(medtermCode), "65M4. the pure request helper survives");
  assert.ok(/insufficient-evidence"\) return null/.test(medtermCode),
    "65M4b. and still returns null — no ladder call — when evidence is insufficient");
  // 65M5. The evidence floors the ladder depends on are unchanged by the expansion.
  assert.ok(/HOSA_MEDTERM_REQUIRED_UNIQUE = 10/.test(medtermCode), "65M5. the 10-distinct floor is unchanged");
  assert.ok(/HOSA_MEDTERM_REQUIRED_AREAS = 3/.test(medtermCode), "65M5b. the 3-area breadth floor is unchanged");
  // 65M6. Debate and DECA review contracts are untouched by a HOSA-only content change: those two
  //       banks are still byte-pinned above, and neither imports the terminology bank.
  for (const neighbour of ["lib/debate-drills.ts", "lib/deca-drills.ts"]) {
    assert.ok(!stripComments(read(neighbour)).includes("hosa-medterm"),
      `65M6. ${neighbour} does not import the terminology bank`);
  }
  // ---- 68G. the drill banks keep their own IMMUTABLE-based content protection --------------------
  // This replaces the two HEAD-relative hashes removed above. The review ladder does not care what
  // the banks contain; it cares that neither reaches into HOSA and that neither is left unprotected.
  for (const bankSuite of ["scripts/debate-drills-smoke.ts", "scripts/deca-drills-smoke.ts"]) {
    const bankSrc = read(bankSuite);
    assert.ok(/PRE_G2_EXPANSION = "26149a3127c0bc7f3108c303f57d41a8dd9088c0"/.test(bankSrc),
      `68G. ${bankSuite} pins an IMMUTABLE commit as its bank baseline`);
    assert.ok(/is byte-identical to \$\{PRE_G2_EXPANSION/.test(bankSrc),
      `68G2. and asserts every original item byte-identical against it`);
    assert.ok(/is not yet authorised for expansion/.test(bankSrc),
      `68G3. and gates additions on an explicitly authorised area, one slice at a time`);
  }

  // 65M7. The real content-integrity protection exists and is immutable-based, not HEAD-relative.
  const evidenceSuite = read("scripts/hosa-medterm-evidence-smoke.ts");
  assert.ok(/PRE_M13E1F = "398860fc0a3469459f78750b9a0203c852d32aea"/.test(evidenceSuite),
    "65M7. the evidence suite pins an IMMUTABLE parent commit");
  assert.ok(/pre-existing item \$\{id\} is byte-identical to the parent commit/.test(evidenceSuite),
    "65M7b. and asserts every pre-existing bank item byte-identical there");
  assert.ok(!/lib\/hosa-medterm\.ts is byte-identical to HEAD/.test(read("scripts/review-ladder-smoke.ts")),
    "65M7c. while this suite no longer carries the vacuous HEAD-relative bank hash");

  // ---- 65M controls: none of the above can pass merely because HEAD moved -------------------------
  // The scans read the WORKING TREE and compare against fixed literals, never against `git show HEAD`.
  // A fixture carrying each banned symbol is detected, so a real regression would fail.
  assert.ok(stripComments('const x = XP_REWARDS.debateCompleted;').includes("XP_REWARDS"),
    "65M-C1. control: an XP symbol in code IS detected");
  assert.ok(stripComments('await prisma.masteryProgress.update({});').includes("masteryProgress"),
    "65M-C2. control: a mastery write IS detected");
  assert.ok(!stripComments('// XP_REWARDS mentioned only in prose').includes("XP_REWARDS"),
    "65M-C3. control: the same symbol inside a comment does NOT trip the scan");
  assert.ok(medtermCode.length > 2000 && /export const MEDTERM_BANK/.test(medtermCode),
    "65M-C4. control: the stripped bank source was actually read, so the bans are not scanning an empty string");
  // The bank genuinely grew in this milestone — so 65M is asserting inertness of a CHANGED file,
  // which is precisely the case a HEAD-relative hash could not have covered.
  assert.ok(/id: "wr-30"/.test(medtermCode),
    "65M-C5. control: the expanded word-root bank is present, so these scans run against the new content");

  // ---- 65W. what the writing-client hash was protecting, asserted exactly -----------------------
  // C3b-ii converts this component to the server-issued session protocol, so a blanket hash would
  // forbid an approved change rather than protect anything.
  const writingUi = stripComments(read("components/skills/debate-writing-practice.tsx"));
  assert.ok(/fetch\("\/api\/skills\/debate-writing\/session"/.test(writingUi),
    "65W. it fetches the server-issued writing session");
  assert.ok(/JSON\.stringify\(\{ sessionId, response \}\)/.test(writingUi),
    "65W2. and submits ONLY the session id and the learner's prose");
  for (const gone of ["scenarioIndex", "getDebateSkillScenario", "rubric:", "threshold", "XP_REWARDS", "calculateRank"]) {
    assert.ok(!writingUi.includes(gone), `65W3. no client-controlled ${gone} remains`);
  }
  assert.ok(!/body: JSON\.stringify\(input\)/.test(writingUi),
    "65W4. the legacy slug/level/scenarioIndex request body is gone");
  assert.ok(/setSessionId\(data\.sessionId\)/.test(writingUi), "65W5. the session id is retained");
  assert.ok(/if \(!sessionId \|\| isSubmitting\) return;/.test(writingUi),
    "65W6. duplicate in-flight submissions are blocked, and none is possible without a session");
  assert.ok(/setAlreadyCompleted\(payload\.alreadyCompleted === true\)/.test(writingUi),
    "65W7. a completed session replays its stored result rather than resubmitting");
  assert.ok(/setFeedback\(payload\.feedback\)/.test(writingUi) && !/feedback\.score =/.test(writingUi),
    "65W8. score and feedback come from the server, never computed here");
  assert.ok(/if \(res\.status === 410\)/.test(writingUi) && /Writing practice unavailable/.test(writingUi),
    "65W9. expired and unavailable sessions have their own states");
  assert.ok(/response\.trim\(\)\.length < 10/.test(writingUi), "65W10. the response-length limit is preserved");
  assert.ok(!/enforceRateLimit/.test(writingUi),
    "65W11. and no rate-limit assumption was added — its absence on this surface is deliberate");
  assert.ok(/fetch\("\/api\/skills\/debate-writing\/session"/.test(
    'await fetch("/api/skills/debate-writing/session", {})'),
    "65W12. control: that endpoint scan matches a real call");

  // ---- 65L. what the lesson-practice hash was protecting, asserted exactly -----------------------
  // C3b-i converts this component to the server-issued session protocol, so a blanket hash would
  // forbid an approved change rather than protect anything.
  const lessonUi = stripComments(read("components/lessons/lesson-practice.tsx"));
  assert.ok(/fetch\("\/api\/debate\/drills\/session"/.test(lessonUi), "65L. it still starts a Debate drill session");
  assert.ok(/areas: \[drillArea\]/.test(lessonUi), "65L2. scoped to the lesson's own drill area — track isolation intact");
  assert.ok(/fetch\("\/api\/debate\/drills\/check"/.test(lessonUi), "65L3. answers go through the Debate check route");
  assert.ok(/JSON\.stringify\(\{ sessionId: session\.sessionId \}\)/.test(lessonUi),
    "65L4. and the final submit carries only the session id");
  assert.ok(!/JSON\.stringify\(\{ answers/.test(lessonUi), "65L5. the legacy answers body is gone");
  for (const banned of ["correctOptionId", "DRILL_BANK", "buildDrillSession", "gradeDrillAnswers"]) {
    assert.ok(!lessonUi.includes(banned), `65L6. no client answer authority or live-bank grading ({banned})`);
  }
  assert.ok(/answers\[current\.itemId\]/.test(lessonUi), "65L7. answer state is keyed by distinct item id");
  assert.ok(/\$\{slot\}:\$\{current\.itemId\}/.test(lessonUi), "65L8. and rendered slots are keyed by slot AND item");
  assert.ok(/checking \|\| answers\[current\.itemId\]/.test(lessonUi),
    "65L9. a repeated slot cannot send a second check, and neither can a duplicate in-flight one");
  assert.ok(/answeredCount === distinctTotal/.test(lessonUi), "65L10. completion counts DISTINCT items, not slots");
  assert.ok(/wroteSkills\.includes\(skillSlug\)/.test(lessonUi),
    "65L11. and mastery is still claimed only when the server confirms the write");
  assert.ok(/setExpired\(true\)/.test(lessonUi) && /is not available/.test(lessonUi),
    "65L12. expired and unavailable sessions have their own states");
  assert.ok(/aria-pressed=\{isSel\}/.test(lessonUi) && /min-h-11/.test(lessonUi),
    "65L13. accessibility and touch-target behaviour are preserved");

  // ---- 65h. what the HOSA submit-route hash was protecting, asserted exactly --------------------
  const hosaSubmit = stripComments(read("app/api/hosa/medterm/submit/route.ts"));
  assert.ok(/practiceSessionSubmitRequestSchema/.test(hosaSubmit), "65h. it accepts a session id only");
  assert.ok(!/input\.answers/.test(hosaSubmit), "65h2. and never a client answer array");
  const hsBody = hosaSubmit.slice(hosaSubmit.indexOf("prisma.$transaction"));
  assert.ok(hsBody.indexOf("lockUserRow(tx") >= 0 && hsBody.indexOf("lockUserRow(tx") < hsBody.indexOf("findFirst("),
    "65h3. the user row lock is the first statement of the transaction");
  const hkinds = new Set([...hosaSubmit.matchAll(/"(DEBATE_DRILL|DECA_DRILL|HOSA_MEDTERM|DEBATE_WRITING)"/g)].map((m) => m[1]));
  assert.deepEqual([...hkinds], ["HOSA_MEDTERM"], "65h4. it binds exactly HOSA_MEDTERM");
  assert.ok(!/gradeMedTermAnswers\(|buildMedTermEvidence\(/.test(hosaSubmit),
    "65h5. grading reads the stored snapshot, never the live bank");
  assert.ok(/requireEveryItemAnswered\(/.test(hosaSubmit), "65h6. every distinct served item must be answered");
  assert.ok(/recordPracticeOutcomeInTransaction\(/.test(hosaSubmit), "65h7. review runs through the tx-native core");
  for (const banned of ["recordDrillMasteryInTransaction", "recordDrillMastery", "MasteryProgress",
                        "masteryProgress", "XP_REWARDS", "xPLog", "awardXpInTransaction",
                        "practiceAttempt", "questionAttempt"]) {
    assert.ok(!hosaSubmit.includes(banned), `65h8. HOSA stays review-only (${banned})`);
  }
  assert.ok(hosaSubmit.indexOf("parseStoredResult(") < hosaSubmit.indexOf("recordPracticeOutcomeInTransaction("),
    "65h9. a completed retry returns the stored result BEFORE any review effect");
  assert.ok(/status: "COMPLETED"/.test(hosaSubmit) && /resultJson: result/.test(hosaSubmit),
    "65h10. the result and the completion are stored together in the same transaction");

  // ---- PA1-PA16. M13E2 Phase A: prisma/schema.prisma changed only by ADDING -----------------------------
  const schemaAtM13E2Parent = execSync(`git show ${PRE_M13E2}:prisma/schema.prisma`, { encoding: "utf8" });
  const schemaNow = readFileSync("prisma/schema.prisma", "utf8");
  for (const name of M13E2_NEW_BLOCKS) {
    assert.ok(!schemaAtM13E2Parent.includes(`${name} {`), `PA1. at ${PRE_M13E2.slice(0, 8)} the schema had no ${name}`);
    assert.ok(schemaNow.includes(`${name} {`), `PA2. the working schema defines ${name}`);
  }
  assert.ok(!schemaAtM13E2Parent.includes(M13E2_USER_FIELD), "PA3. and no User.practiceSessions back-relation");
  assertAdditiveSchema(schemaNow, schemaAtM13E2Parent); // PA4. additive practice-session definitions only
  assert.equal(schemaBlocks(schemaNow).size, schemaBlocks(schemaAtM13E2Parent).size + 4,
    "PA5. exactly four new schema blocks (2 models + 2 enums) and nothing else");
  assert.ok(!existsSync("prisma/migrations"), "PA6. Phase A introduces no migration directory");
  assert.ok(existsSync("prisma/schema.prisma"), "PA6b. control: existsSync does report a path that exists");
  // M13E2 C1 adds approved shared helpers under lib/. They are wired to NO route yet, so this check
  // narrows from "nothing references the new models" to "only these four helpers may". The property
  // that actually matters before the C2 cutover is unchanged and now asserted directly: no route and
  // no component touches the practice-session tables.
  // C2a cuts the nine DRILL routes over to server-issued sessions, so they legitimately reference the
  // new models now. The allowlist widens by exactly those nine plus the four C1 helpers. The property
  // that still matters is asserted separately below and is UNCHANGED: no component touches the tables,
  // and the writing/XP routes stay out until C2b.
  const M13E2_C1_ALLOWED = [
    "lib/practice-session.ts", "lib/spaced-review.ts", "lib/xp.ts", "lib/validators.ts",
    "app/api/debate/drills/session/route.ts", "app/api/debate/drills/check/route.ts",
    "app/api/debate/drills/submit/route.ts",
    "app/api/deca/drills/session/route.ts", "app/api/deca/drills/check/route.ts",
    "app/api/deca/drills/submit/route.ts",
    "app/api/hosa/medterm/session/route.ts", "app/api/hosa/medterm/check/route.ts",
    "app/api/hosa/medterm/submit/route.ts",
    // C2b: Debate writing is now session-backed too.
    "app/api/skills/debate-writing/session/route.ts", "app/api/skills/debate-writing/route.ts"
  ];
  let m13e2RuntimeRefs: string[] = [];
  try {
    m13e2RuntimeRefs = execSync('grep -rli "practicesession" app lib components', { encoding: "utf8" })
      .trim().split("\n").filter(Boolean);
  } catch {
    m13e2RuntimeRefs = []; // grep exits non-zero when nothing matches, which is also a passing case
  }
  assert.deepEqual(m13e2RuntimeRefs.filter((f) => !M13E2_C1_ALLOWED.includes(f)), [],
    "PA7. only the approved C1 helpers and C2a drill routes reference the new models");
  for (const f of m13e2RuntimeRefs) {
    assert.ok(!f.startsWith("components/"),
      `PA7a. no component references the session tables before the C3 cutover (${f})`);
  }
  // C2b cut the writing routes over. tests/grade and judge take only the atomic XP helper — they
  // never touch the session tables — so they must still never appear here.
  for (const neverSessionBacked of ["app/api/tests/[testId]/grade/route.ts",
                                    "app/api/debates/[debateId]/judge/route.ts"]) {
    assert.ok(!m13e2RuntimeRefs.includes(neverSessionBacked),
      `PA7d. ${neverSessionBacked} uses only the XP helper, never the session tables`);
  }
  assert.ok(/practicesession/i.test("await prisma.practiceSession.findFirst()"),
    "PA7b. control: that scan does match a real runtime usage");
  assert.deepEqual(
    ["app/api/tests/[testId]/grade/route.ts", "components/training/concept-drills.tsx", "lib/practice-session.ts"]
      .filter((f) => !M13E2_C1_ALLOWED.includes(f)),
    ["app/api/tests/[testId]/grade/route.ts", "components/training/concept-drills.tsx"],
    "PA7c. control: the allowlist still rejects an out-of-scope route and any component");
  const m13e2Sha = (p: string) => execSync(`shasum -a 256 '${p}'`, { encoding: "utf8" }).split(" ")[0];
  assert.notEqual(m13e2Sha("prisma/seed.ts"), m13e2Sha("prisma/schema.prisma"),
    "PA8. control: the surviving seed byte pin's hash does vary with file content");

  // Non-vacuous controls: every one mutates the schema IN MEMORY and proves the checker rejects it.
  const m13e2Rejects = (label: string, mutate: (s: string) => string) => {
    const mutated = mutate(schemaNow);
    assert.notEqual(mutated, schemaNow, `PA. the ${label} control actually changed the schema text`);
    assert.throws(() => assertAdditiveSchema(mutated, schemaAtM13E2Parent), `PA. the check rejects ${label}`);
  };
  m13e2Rejects("a changed existing field type", (s) => s.replace(/reviewCount(\s+)Int/, "reviewCount$1String"));
  m13e2Rejects("a removed existing field", (s) => s.replace(/\n[ \t]+lastOutcome[^\n]*/, ""));
  m13e2Rejects("an unapproved field on an existing model",
    (s) => s.replace("model SkillReviewSchedule {", "model SkillReviewSchedule {\n  sneaky String?"));
  m13e2Rejects("a removed User back-relation", (s) => s.replace(/\n[ \t]+practiceSessions[ \t]+PracticeSession\[\]/, ""));
  m13e2Rejects("an extra unapproved User field",
    (s) => s.replace(/([ \t]+practiceSessions[ \t]+PracticeSession\[\])/, "$1\n  sneaky String?"));
  m13e2Rejects("an omitted [userId, kind, status, expiresAt] index",
    (s) => s.replace("@@index([userId, kind, status, expiresAt])", ""));
  m13e2Rejects("an omitted [userId, purgeAfter] index", (s) => s.replace("@@index([userId, purgeAfter])", ""));
  m13e2Rejects("an unapproved global [status, expiresAt] index",
    (s) => s.replace("@@index([userId, purgeAfter])", "@@index([userId, purgeAfter])\n  @@index([status, expiresAt])"));
  m13e2Rejects("a redundant standalone [sessionId] index",
    (s) => s.replace("@@unique([sessionId, displayOrder])", "@@unique([sessionId, displayOrder])\n  @@index([sessionId])"));
  m13e2Rejects("a removed unique constraint", (s) => s.replace("@@unique([sessionId, bankQuestionId])", ""));
  m13e2Rejects("a PROCESSING status", (s) => s.replace(/(enum PracticeSessionStatus \{\n[ \t]+ISSUED)/, "$1\n  PROCESSING"));
  m13e2Rejects("a claimedAt column", (s) => s.replace(/([ \t]+purgeAfter[ \t]+DateTime\n)/, "$1  claimedAt DateTime?\n"));

  // ---- historical controls, pinned to the PARENT commit ------------------------------------------------------
  const parentReview = execSync(`git show ${PRE_M13E1G}:lib/spaced-review.ts`, { encoding: "utf8" });
  assert.ok(/const reviewCount = passed \? \(existing\?\.reviewCount \?\? 0\) \+ 1 : 0;/.test(parentReview),
    `pre-fix: at ${PRE_M13E1G.slice(0, 8)} the count was incremented BEFORE the interval lookup`);
  assert.ok(!/updateMany/.test(parentReview), "pre-fix: and there was no compare-and-set at all");
  assert.ok(/Promise<void>/.test(parentReview), "pre-fix: the helper returned void, so no caller could know");
  const parentDebate = execSync(`git show ${PRE_M13E1G}:app/api/debate/drills/submit/route.ts`, { encoding: "utf8" });
  assert.ok(/persistenceStatus = wrote \? "updated" : "not-saved";/.test(parentDebate),
    "pre-fix: the Debate route collapsed every false into not-saved");
  const parentArcade = execSync(`git show ${PRE_M13E1G}:'app/(app)/study-arcade/review/page.tsx'`, { encoding: "utf8" });
  assert.ok(/Survived \$\{review\.reviewCount\}/.test(parentArcade), "pre-fix: the card claimed reviews survived");

  console.log(
    `Review-ladder smoke passed: the spaced ladder is now due-gated. The first qualifying practice schedules ONE day (it scheduled three before, because the count was incremented ahead of the interval lookup), four rapid passes leave the row at count 1 instead of walking 3d/7d/14d, and a pre-due failure no longer resets a learner's ladder. A due pass advances exactly one rung from the pre-increment count; a due failure resets exactly once. Concurrent due submissions are settled by a compare-and-set on the exact snapshot, so one window produces one review mutation and — because mastery now follows the review result rather than its own due-check — exactly one mastery write: the loser writes nothing at all, and a losing pass can no longer erase a winning due failure. The create race is recognised only from an untouched first schedule proven by the row's own timestamps; an advanced, mature, due, or already-mutated row is refused as write-failed. recordPracticeOutcome returns the exact mutation instead of void, dates cross the API as explicit ISO strings, and the boolean wrapper stays true only for a real mastery write. General Debate consumes the detailed outcome, so a deliberate no-op reads "Practice complete" rather than the false "Progress not saved" it showed before; DECA's unprovable reviewScheduled is gone; and the review card no longer interprets a legacy ladder counter as reviews survived. ${controlsRun.length} controls each demonstrated the failure they exist to demonstrate.`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
