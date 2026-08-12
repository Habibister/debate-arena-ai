/**
 * DECA drill mastery evidence + persistence contract (M13E1D).
 *
 * Run with: npm run deca-mastery:smoke
 *
 * NO DATABASE. The persistence tests drive the REAL `recordDrillMasteryDetailed` against a stub
 * client installed on `globalThis.prisma` before `lib/prisma` is first imported (that module reads
 * `globalThis.prisma` before constructing a `PrismaClient`, so no client is ever built and no
 * connection is ever opened). Nothing here mirrors production logic: every assertion runs the
 * shipped function.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
// THE PRODUCTION MODULES — never a mirrored copy of their logic.
import {
  DECA_DRILL_AREAS,
  DECA_DRILL_BANK,
  DECA_DRILL_PASS_THRESHOLD,
  DECA_DRILL_REQUIRED_UNIQUE,
  buildDecaDrillEvidence,
  buildDecaDrillSession,
  decaDrillPersistenceRequest,
  gradeDecaDrillAnswers,
  type DecaDrillAnswer,
  type DecaDrillArea
} from "../lib/deca-drills";
import {
  ACTIVATION_PENDING_SKILLS,
  INTENDED_SKILL_INVENTORY,
  SEEDED_SKILL_SLUGS,
  compatTrackForSlug,
  debateWritingPracticeSupported,
  resolveSkillsSlug
} from "../lib/education/skills-compat";

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
const headSha = (p: string) => execSync(`git show HEAD:'${p}' | shasum -a 256`, { encoding: "utf8" }).split(" ")[0];
const nowSha = (p: string) => execSync(`shasum -a 256 '${p}'`, { encoding: "utf8" }).split(" ")[0];

/** M13E1D's parent — the last commit with the old two-state drill-result copy. */
const PRE_M13E1D = "a8cbe3453c462a75a9a4cf652cc9d2116893e535";

/** Every control asserts the invariant would actually FAIL under the rejected alternative. */
const controlsRun: string[] = [];
function control(label: string, holds: boolean) {
  assert.ok(holds, `control "${label}" did not demonstrate the failure it exists to demonstrate`);
  controlsRun.push(label);
}

// --- fixtures ------------------------------------------------------------------------------------

const byArea = (area: DecaDrillArea) => DECA_DRILL_BANK.filter((q) => q.area === area);
const right = (q: { correctAnswer: string }) => q.correctAnswer;
const wrongFor = (q: { choices: string[]; correctAnswer: string }) => {
  const other = q.choices.find((c) => c !== q.correctAnswer);
  if (!other) throw new Error("bank question has no incorrect choice");
  return other;
};
const PI = byArea("performance-indicators");
const CR = byArea("customer-relations");

/** N distinct performance-indicator answers, the first `correct` of them right. */
function distinctPi(n: number, correct: number): DecaDrillAnswer[] {
  return PI.slice(0, n).map((q, i) => ({ id: q.id, selected: i < correct ? right(q) : wrongFor(q) }));
}
function piEvidence(answers: DecaDrillAnswer[]) {
  const found = buildDecaDrillEvidence(answers).find((e) => e.area === "performance-indicators");
  if (!found) throw new Error("expected performance-indicators evidence");
  return found;
}

// --- stub client (installed BEFORE lib/prisma is ever loaded) ------------------------------------

type StubMode = "found" | "missing" | "lookup-throws" | "write-throws";
const stub = {
  mode: "found" as StubMode,
  existingMastery: null as number | null,
  reviewDueAt: null as Date | null,
  calls: [] as Array<{ op: string; data: Record<string, unknown> }>
};
function resetStub(mode: StubMode = "found") {
  stub.mode = mode;
  stub.existingMastery = null;
  stub.reviewDueAt = null;
  stub.calls = [];
}
const fail = (why: string) => { throw new Error(why); };
const stubPrisma = {
  skill: {
    findUnique: async () => {
      if (stub.mode === "lookup-throws") fail("simulated lookup failure");
      return stub.mode === "missing" ? null : { id: "stub-skill-id" };
    }
  },
  masteryProgress: {
    findUnique: async () =>
      stub.existingMastery === null ? null : { id: "stub-mastery-id", masteryPercent: stub.existingMastery },
    create: async (args: { data: Record<string, unknown> }) => {
      if (stub.mode === "write-throws") fail("simulated write failure");
      stub.calls.push({ op: "masteryProgress.create", data: args.data });
      return {};
    },
    update: async (args: { data: Record<string, unknown> }) => {
      if (stub.mode === "write-throws") fail("simulated write failure");
      stub.calls.push({ op: "masteryProgress.update", data: args.data });
      return {};
    }
  },
  skillReviewSchedule: {
    // M13E1G: the row now carries createdAt/updatedAt, and a DUE row is mutated by a compare-and-set.
    findUnique: async () =>
      stub.reviewDueAt === null
        ? null
        : { id: "stub-review-id", nextReviewAt: stub.reviewDueAt, reviewCount: 3,
            createdAt: new Date(stub.reviewDueAt.getTime() - 7 * 86_400_000),
            updatedAt: new Date(stub.reviewDueAt.getTime() - 7 * 86_400_000) },
    create: async (args: { data: Record<string, unknown> }) => { stub.calls.push({ op: "review.create", data: args.data }); return {}; },
    update: async (args: { data: Record<string, unknown> }) => { stub.calls.push({ op: "review.update", data: args.data }); return {}; },
    updateMany: async (args: { data: Record<string, unknown> }) => {
      stub.calls.push({ op: "review.updateMany", data: args.data });
      return { count: 1 };
    },
    count: async () => 0,
    findMany: async () => []
  }
};
(globalThis as unknown as { prisma?: unknown }).prisma = stubPrisma;

async function main() {
  // The dynamic import is what makes the stub load-order guarantee real: `lib/prisma` is not
  // touched until after the assignment above.
  const { recordDrillMastery, recordDrillMasteryDetailed } = await import("../lib/spaced-review");
  assert.equal((globalThis as unknown as { prisma?: unknown }).prisma, stubPrisma,
    "29. no real PrismaClient was constructed — the stub is still the module's client");

  // ---- 1-2. below the floor ---------------------------------------------------------------------
  const one = piEvidence([{ id: PI[0].id, selected: right(PI[0]) }]);
  assert.equal(one.uniqueTotal, 1, "1. a single question is one unique question");
  assert.equal(one.evidenceStatus, "insufficient-evidence", "1b. and is insufficient evidence");
  assert.equal(decaDrillPersistenceRequest(one), null, "1c. so persistence is not attempted at all");

  const fiveCopies = piEvidence(Array.from({ length: 5 }, () => ({ id: PI[0].id, selected: right(PI[0]) })));
  assert.equal(fiveCopies.uniqueTotal, 1, "2. five copies of one id are still ONE unique question");
  assert.equal(fiveCopies.evidenceStatus, "insufficient-evidence", "2b. and remain insufficient evidence");
  assert.equal(decaDrillPersistenceRequest(fiveCopies), null, "2c. repeating an id cannot buy a write");

  // ---- 3-6. the evidence score ------------------------------------------------------------------
  for (const [correct, score, status] of [
    [1, 20, "below-threshold"], [3, 60, "below-threshold"], [4, 80, "passing"], [5, 100, "passing"]
  ] as const) {
    const ev = piEvidence(distinctPi(5, correct));
    assert.equal(ev.uniqueTotal, 5, `3-6. five distinct ids with ${correct} correct -> 5 unique`);
    assert.equal(ev.uniqueCorrect, correct, `3-6b. ${correct} of them correct`);
    assert.equal(ev.evidenceScore, score, `3-6c. evidence score is ${score}`);
    assert.equal(ev.evidenceStatus, status, `3-6d. status is ${status}`);
    assert.equal(ev.passed, status === "passing", `3-6e. passed reflects the evidence, not the raw tally`);
  }

  // ---- 7. THE BYPASS: five distinct, one genuinely correct, that one repeated twelve times -------
  const bypass: DecaDrillAnswer[] = [...distinctPi(5, 1), ...Array.from({ length: 12 }, () => ({ id: PI[0].id, selected: right(PI[0]) }))];
  const bypassRaw = gradeDecaDrillAnswers(bypass).perSkill.find((s) => s.area === "performance-indicators");
  const bypassEv = piEvidence(bypass);
  assert.equal(bypassEv.uniqueTotal, 5, "7. the evidence set is five distinct questions");
  assert.equal(bypassEv.uniqueCorrect, 1, "7b. exactly one of which was genuinely correct");
  assert.equal(bypassEv.evidenceScore, 20, "7c. evidence score stays 20%, not 76%");
  assert.equal(bypassEv.evidenceStatus, "below-threshold", "7d. and is never passing");
  assert.equal(bypassEv.passed, false, "7e. so no mastery can be earned from it");
  const plan7 = decaDrillPersistenceRequest(bypassEv);
  assert.deepEqual(plan7, { scorePercent: 20, passed: false }, "7f. and 20/false is what reaches persistence");
  // CONTROL: the duplicate-weighted number really would have passed. Without this the test proves nothing.
  control(
    `duplicate-weighted scoring would have written a pass (${bypassRaw?.scorePercent}% >= ${DECA_DRILL_PASS_THRESHOLD}%)`,
    bypassRaw !== undefined && bypassRaw.scorePercent >= DECA_DRILL_PASS_THRESHOLD && bypassRaw.scorePercent === 76
  );

  // ---- 8. conflicting duplicate: FIRST occurrence controls --------------------------------------
  const rightThenWrong = piEvidence([
    { id: PI[0].id, selected: right(PI[0]) },
    { id: PI[0].id, selected: wrongFor(PI[0]) },
    ...distinctPi(5, 0).slice(1)
  ]);
  assert.equal(rightThenWrong.uniqueTotal, 5, "8. the repeated id is counted once");
  assert.equal(rightThenWrong.uniqueCorrect, 1, "8b. and its FIRST answer (correct) is what counted");
  const wrongThenRight = piEvidence([
    { id: PI[0].id, selected: wrongFor(PI[0]) },
    { id: PI[0].id, selected: right(PI[0]) },
    ...distinctPi(5, 0).slice(1)
  ]);
  assert.equal(wrongThenRight.uniqueCorrect, 0, "8c. answering wrong first cannot be corrected by a resubmit");
  // CONTROL: a last-occurrence policy would have produced the opposite answers on both fixtures.
  control("last-occurrence would flip both conflicting-duplicate fixtures",
    rightThenWrong.uniqueCorrect === 1 && wrongThenRight.uniqueCorrect === 0);

  // ---- 9. unknown ids ----------------------------------------------------------------------------
  const withUnknown = piEvidence([...distinctPi(5, 4), { id: "not-a-real-id", selected: "whatever" }, { id: "", selected: "x" }]);
  const withoutUnknown = piEvidence(distinctPi(5, 4));
  assert.deepEqual(
    [withUnknown.uniqueTotal, withUnknown.uniqueCorrect, withUnknown.evidenceScore],
    [withoutUnknown.uniqueTotal, withoutUnknown.uniqueCorrect, withoutUnknown.evidenceScore],
    "9. unknown ids change neither the count nor the score");
  assert.equal(buildDecaDrillEvidence([{ id: "not-a-real-id", selected: "x" }]).length, 0,
    "9b. an unknown id alone produces no evidence at all");
  // CONTROL: the scan is live — a REAL id in the same position does move the count.
  control("a real id in the same position does change the count",
    piEvidence([...distinctPi(5, 4), { id: PI[5].id, selected: right(PI[5]) }]).uniqueTotal === 6);

  // ---- 10. cross-area attribution ----------------------------------------------------------------
  const mixedAreas = buildDecaDrillEvidence([
    ...PI.slice(0, 3).map((q) => ({ id: q.id, selected: right(q) })),
    ...CR.slice(0, 2).map((q) => ({ id: q.id, selected: right(q) }))
  ]);
  assert.equal(mixedAreas.find((e) => e.area === "performance-indicators")?.uniqueTotal, 3,
    "10. PI ids are attributed to performance-indicators");
  assert.equal(mixedAreas.find((e) => e.area === "customer-relations")?.uniqueTotal, 2,
    "10b. CR ids are attributed to customer-relations, by their OWN bank area");
  assert.ok(mixedAreas.every((e) => e.evidenceStatus === "insufficient-evidence"),
    "10c. and neither reaches the floor, so a mixed session records nothing");

  // ---- 11-12. below the floor, the helper is never called ---------------------------------------
  const routeSrc = stripComments(read("app/api/deca/drills/submit/route.ts"));
  // C2a: session-backed shape. Same invariants, re-asserted against the transaction-native cores.
  assert.equal((routeSrc.match(/recordPracticeOutcomeInTransaction\(/g) ?? []).length, 1,
    "11. the route calls the review core in exactly one place");
  assert.equal((routeSrc.match(/recordDrillMasteryInTransaction\(/g) ?? []).length, 1,
    "11a. and the mastery core in exactly one place");
  assert.ok(!/(?<!InTransaction)\brecordDrillMastery\(/.test(routeSrc),
    "11b. and never the undifferentiated boolean form");
  assert.ok(routeSrc.indexOf("recordPracticeOutcomeInTransaction(") < routeSrc.indexOf("recordDrillMasteryInTransaction("),
    "11c. review decides the window BEFORE mastery is touched");
  assert.ok(/if \(qualifies && area\.skillSlug\) \{/.test(routeSrc),
    "11d. the call is guarded by the evidence floor");
  assert.ok(!/gradeDecaDrillAnswers\(|buildDecaDrillEvidence\(/.test(routeSrc),
    "11e. and grading reads the stored snapshot, never the live bank");
  // The guard's own decision function, run for real at every size from 0 to the floor.
  for (let n = 0; n < DECA_DRILL_REQUIRED_UNIQUE; n += 1) {
    if (n === 0) continue;
    assert.equal(decaDrillPersistenceRequest(piEvidence(distinctPi(n, n))), null,
      `12. ${n} unique all-correct questions still produce NO persistence call (no write, no review, no knock-down)`);
  }
  // CONTROL: the floor is load-bearing — four perfect answers score 100% and are still refused.
  control("four distinct all-correct answers score 100% and are STILL refused",
    piEvidence(distinctPi(4, 4)).evidenceScore === 100 && decaDrillPersistenceRequest(piEvidence(distinctPi(4, 4))) === null);
  // CONTROL: and one more question flips it, so the refusal is the floor and not a broken helper.
  control("the fifth distinct question flips the same fixture to a real call",
    decaDrillPersistenceRequest(piEvidence(distinctPi(5, 5))) !== null);

  // ---- 13-14. what is handed to persistence ------------------------------------------------------
  assert.deepEqual(decaDrillPersistenceRequest(piEvidence(distinctPi(5, 3))), { scorePercent: 60, passed: false },
    "13. a qualifying below-threshold run persists the EVIDENCE score with passed:false");
  assert.deepEqual(decaDrillPersistenceRequest(piEvidence(distinctPi(5, 4))), { scorePercent: 80, passed: true },
    "14. a qualifying passing run persists the evidence score with passed:true");

  // ---- 15. the detailed persistence result -------------------------------------------------------
  resetStub("found");
  assert.equal((await recordDrillMasteryDetailed({ userId: "u1", skillSlug: "deca-performance-indicators", scorePercent: 80, passed: true })).status,
    "updated", "15. a successful write reports updated");
  const wrote = stub.calls.find((c) => c.op === "masteryProgress.create");
  assert.equal(wrote?.data.masteryPercent, 80, "15a. and the EVIDENCE score is what was written");
  assert.equal(wrote?.data.masteryLevel, "PRACTICING", "15a2. at the level that score earns");
  assert.ok(stub.calls.some((c) => c.op === "review.create"), "15a3. and a review was scheduled");

  resetStub("missing");
  assert.equal((await recordDrillMasteryDetailed({ userId: "u1", skillSlug: "deca-business-reasoning", scorePercent: 80, passed: true })).status,
    "skill-missing", "15b. an absent row reports skill-missing");
  assert.equal(stub.calls.length, 0, "15b2. and writes nothing");

  resetStub("write-throws");
  assert.equal((await recordDrillMasteryDetailed({ userId: "u1", skillSlug: "deca-customer-relations", scorePercent: 80, passed: true })).status,
    "write-failed", "15c. a failing write reports write-failed");

  resetStub("lookup-throws");
  assert.equal((await recordDrillMasteryDetailed({ userId: "u1", skillSlug: "deca-customer-relations", scorePercent: 80, passed: true })).status,
    "write-failed", "15d. a failing LOOKUP is write-failed, never skill-missing");
  // CONTROL: 15d is the whole point of the split — a query that could not run has not proven absence.
  control("a thrown lookup is not reported as a missing skill",
    (await recordDrillMasteryDetailed({ userId: "u1", skillSlug: "x", scorePercent: 1, passed: false })).status !== "skill-missing");

  // A properly evidenced FAILED DUE review still knocks mastery down — the behaviour the floor protects.
  resetStub("found");
  stub.existingMastery = 90;
  stub.reviewDueAt = new Date(Date.now() - 60_000);
  assert.equal((await recordDrillMasteryDetailed({ userId: "u1", skillSlug: "deca-performance-indicators", scorePercent: 60, passed: false })).status,
    "updated", "15e. a qualifying failed due review is still recorded");
  assert.equal(stub.calls.find((c) => c.op === "masteryProgress.update")?.data.masteryPercent, 60,
    "15e2. and knocks mastery down from 90 to the demonstrated 60");

  // ---- 16. the boolean wrapper is unchanged for existing callers ---------------------------------
  resetStub("found");
  assert.equal(await recordDrillMastery({ userId: "u1", skillSlug: "s", scorePercent: 80, passed: true }), true, "16. true for updated");
  resetStub("missing");
  assert.equal(await recordDrillMastery({ userId: "u1", skillSlug: "s", scorePercent: 80, passed: true }), false, "16b. false for skill-missing");
  resetStub("write-throws");
  assert.equal(await recordDrillMastery({ userId: "u1", skillSlug: "s", scorePercent: 80, passed: true }), false, "16c. false for write-failed");
  resetStub("found");

  // ---- 17. partial activation reports per skill ---------------------------------------------------
  // Each skill is resolved independently, so a half-activated database tells the truth per row.
  const perSkillLoop = routeSrc.slice(routeSrc.indexOf("for (const area of evidence)"));
  assert.ok(perSkillLoop.includes("recordDrillMasteryInTransaction("), "17. persistence is decided inside the per-area loop");
  assert.ok(/persistenceStatus = mastery\.status/.test(perSkillLoop), "17b. each skill reports its OWN outcome");
  assert.ok(!/return NextResponse\.json\(\{[^}]*allWrote|broadly|everything/.test(routeSrc), "17c. there is no aggregate success claim");
  resetStub("missing");
  const missingOutcome = await recordDrillMasteryDetailed({ userId: "u1", skillSlug: "deca-performance-indicators", scorePercent: 80, passed: true });
  resetStub("found");
  const foundOutcome = await recordDrillMasteryDetailed({ userId: "u1", skillSlug: "deca-marketing", scorePercent: 80, passed: true });
  assert.notDeepEqual(missingOutcome, foundOutcome, "17d. an absent row and a present row do not report the same thing");

  // ---- 18-20. the three-skill inventory and its DECA identity -------------------------------------
  assert.deepEqual(ACTIVATION_PENDING_SKILLS.map((s) => s.slug),
    ["deca-performance-indicators", "deca-business-reasoning", "deca-customer-relations"],
    "18. exactly the three approved skills");
  assert.deepEqual(ACTIVATION_PENDING_SKILLS.map((s) => s.name),
    ["Performance Indicators", "Business Reasoning", "Customer Relations"], "18b. with their exact names");
  assert.ok(ACTIVATION_PENDING_SKILLS.every((s) => s.track === "DECA"), "18c. all DECA");
  assert.ok(ACTIVATION_PENDING_SKILLS.every((s) => s.lessonSlugs.length === 0), "18d. and none invents lessons");
  assert.equal(SEEDED_SKILL_SLUGS.length, 10, "18e. the seed mirror is still exactly the ten seeded skills");
  assert.equal(INTENDED_SKILL_INVENTORY.length, 13, "18f. the intended inventory is ten plus three");
  for (const slug of ["deca-roleplay", "deca-marketing"]) {
    assert.ok(!ACTIVATION_PENDING_SKILLS.some((s) => s.slug === slug), `18g. "${slug}" is NOT one of the three`);
  }
  for (const area of DECA_DRILL_AREAS) {
    const r = resolveSkillsSlug(area.skillSlug);
    assert.equal(r.kind, "compatibility", `19. drill skill "${area.skillSlug}" resolves`);
    assert.equal(compatTrackForSlug(area.skillSlug), "DECA", `19b. "${area.skillSlug}" is DECA`);
    assert.equal(r.kind === "compatibility" ? r.destination.href : null, "/training/deca/practice",
      `19c. and is sent to DECA practice`);
    assert.ok(!debateWritingPracticeSupported(area.skillSlug), `20. "${area.skillSlug}" never reaches Debate writing practice`);
  }
  // CONTROL: the resolution really is live — an invented DECA-looking slug is still unknown.
  control("an invented drill slug is still unknown", resolveSkillsSlug("deca-not-a-real-drill-skill").kind === "unknown");

  // ---- 21. the activation script ------------------------------------------------------------------
  const scriptSrc = read("scripts/seed-deca-drill-skills.ts");
  const scriptCode = stripComments(scriptSrc);
  const scriptSlugs = [...scriptCode.matchAll(/slug:\s*"([^"]+)",/g)].map((m) => m[1]);
  assert.deepEqual(scriptSlugs, ["deca-performance-indicators", "deca-business-reasoning", "deca-customer-relations"],
    "21. the script contains exactly the three approved rows");
  assert.deepEqual(scriptSlugs, ACTIVATION_PENDING_SKILLS.map((s) => s.slug), "21b. matching the manifest exactly");
  for (const model of ["prisma.lesson", "prisma.user", "prisma.masteryProgress", "prisma.xPLog", "prisma.xpLog",
                       "prisma.achievement", "prisma.assignment", "prisma.rubric", "prisma.competitionResult",
                       "prisma.skillReviewSchedule", "prisma.debate", "prisma.test"]) {
    assert.ok(!scriptCode.includes(model), `21c. the script never touches ${model}`);
  }
  for (const verb of ["deleteMany", "delete(", "updateMany", "createMany", "$executeRaw", "$queryRaw",
                      "$transaction", "$connect", "skill.update", "skill.upsert"]) {
    assert.ok(!scriptCode.includes(verb), `21d. the script performs no ${verb}`);
  }
  assert.ok(!/from "\.\.\/prisma\/seed"|require\(".*prisma\/seed/.test(scriptCode), "21e. it never imports prisma/seed.ts");
  assert.ok(/argv\.includes\("--apply"\)/.test(scriptCode), "21f. --apply is required to write");
  assert.ok(/process\.exitCode = 1/.test(scriptCode), "21j. and it exits non-zero on failure");
  for (const secret of ["DATABASE_URL", "process.env.DATABASE", "connectionString"]) {
    assert.ok(!scriptCode.includes(secret), `21k. it never prints ${secret}`);
  }
  // CONTROL: the slug scan is live.
  control("the activation-script scan really parsed its rows", scriptSlugs.length === 3);

  // ---- 21m. exact three-row inventory, field by field ------------------------------------------------
  const { ACTIVATION_SKILLS, classifyActivationRow, buildDryRunReport, main: activationMain } =
    await import("../scripts/seed-deca-drill-skills");
  assert.equal(ACTIVATION_SKILLS.length, 3, "21m. exactly three activation rows");
  assert.deepEqual(ACTIVATION_SKILLS.map((s) => [s.slug, s.name, s.organization, s.track, s.order]), [
    ["deca-performance-indicators", "Performance Indicators", "DECA", "DECA", 20],
    ["deca-business-reasoning", "Business Reasoning", "DECA", "DECA", 21],
    ["deca-customer-relations", "Customer Relations", "DECA", "DECA", 22]
  ], "21m2. with exactly the approved slug/name/organization/track/order");
  assert.ok(ACTIVATION_SKILLS.every((s) => s.description.trim().length > 0), "21m3. each carries its approved description");
  for (const area of DECA_DRILL_AREAS) {
    const owned = ACTIVATION_SKILLS.some((s) => s.slug === area.skillSlug);
    assert.equal(owned, area.skillSlug !== "deca-marketing",
      `21m4. the script owns "${area.skillSlug}" iff it is not the already-seeded deca-marketing`);
  }

  // ---- 21n. the dry run is structurally incapable of reaching a database ------------------------------
  // No TOP-LEVEL database import of any form. The only one permitted is dynamic, inside apply.
  const topLevel = scriptCode.slice(0, scriptCode.indexOf("async function applyActivation"));
  for (const imp of ["@prisma/client", "@/lib/prisma", "../lib/prisma", "lib/prisma", "PrismaClient"]) {
    assert.ok(!topLevel.includes(imp), `21n. no top-level ${imp} import or reference`);
  }
  assert.ok(!/^import .*(prisma|Prisma)/m.test(scriptCode), "21n2. no static prisma import statement anywhere");
  assert.ok(/await import\("@prisma\/client"\)/.test(scriptCode), "21n3. the client is imported DYNAMICALLY");
  // REACHABILITY, not text position: `applyActivation` is a function declaration, so where it sits
  // in the file is irrelevant. What matters is that EVERY database operation lives inside its body,
  // and that the only call to it in `main` is after the dry-run has already returned.
  const applyStart = scriptCode.indexOf("async function applyActivation");
  const mainStart = scriptCode.indexOf("export async function main");
  assert.ok(applyStart > 0 && mainStart > applyStart, "21n4. control: both functions were located");
  const applyBody = scriptCode.slice(applyStart, mainStart);
  const mainBody = scriptCode.slice(mainStart);
  for (const op of ['await import("@prisma/client")', "new PrismaClient(", "prisma.skill.findUnique",
                    "prisma.skill.create", "prisma.$disconnect"]) {
    assert.equal((scriptCode.match(new RegExp(op.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length,
      (applyBody.match(new RegExp(op.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length,
      `21n5. every occurrence of "${op}" is inside applyActivation()`);
    assert.ok(!mainBody.includes(op), `21n5b. and "${op}" never appears in main() or below it`);
  }
  // In main(), the dry-run return comes before the only call into the database path.
  const dryRunReturn = mainBody.indexOf("if (!apply) {");
  const applyCall = mainBody.indexOf("return applyActivation()");
  assert.ok(dryRunReturn > 0 && applyCall > 0, "21n6a. control: both branch points were located in main()");
  assert.ok(dryRunReturn < applyCall,
    `21n6. main() returns the dry-run report BEFORE it can call applyActivation() (${dryRunReturn} < ${applyCall})`);
  assert.equal((mainBody.match(/applyActivation\(\)/g) ?? []).length, 1,
    "21n6b. and there is exactly one call site, guarded by that return");
  for (const forbidden of ["prisma.skill.findFirst", "prisma.skill.upsert", "prisma.skill.update", "$transaction", "$connect"]) {
    assert.ok(!scriptCode.includes(forbidden), `21n7. the script contains no ${forbidden} at all`);
  }
  // Behavioural proof: build the dry-run report with a stub that THROWS on any access, and assert
  // the stub was never touched. This runs the real function, not a description of it.
  let stubTouched = 0;
  const tripwire = new Proxy({}, { get() { stubTouched += 1; throw new Error("dry run touched a database client"); } });
  const previousGlobal = (globalThis as unknown as { prisma?: unknown }).prisma;
  (globalThis as unknown as { prisma?: unknown }).prisma = tripwire;
  const dryLines = buildDryRunReport();
  const dryText = dryLines.join("\n");
  assert.equal(stubTouched, 0, "21n7. no database stub method was invoked while producing the dry-run report");
  const wouldCreate = dryLines.filter((l) => l.includes("would create"));
  assert.equal(wouldCreate.length, 3, "21n8. the dry run reports exactly three rows");
  for (const s of ACTIVATION_SKILLS) {
    assert.ok(wouldCreate.some((l) => l.includes(s.slug)), `21n9. "${s.slug}" is reported as would create`);
  }
  assert.ok(!/\bcreated\b/.test(dryText.replace(/would create/g, "")), "21n10. the dry run never says created");
  assert.ok(!dryText.includes("already present"), "21n11. and never says already present — it did not look");
  // The real entry point in dry-run mode also returns 0 without touching the tripwire.
  const realLog = console.log;
  const captured: string[] = [];
  console.log = (...args: unknown[]) => { captured.push(args.join(" ")); };
  const dryCode = await activationMain([]);
  console.log = realLog;
  assert.equal(dryCode, 0, "21n12. main([]) returns exit code 0");
  assert.equal(captured.filter((l) => l.includes("would create")).length, 3,
    "21n12b. and printed exactly the three would-create rows");
  assert.ok(!captured.some((l) => l.includes("already present")), "21n12c. with no already-present claim");
  assert.equal(stubTouched, 0, "21n13. and still touched no database client");
  (globalThis as unknown as { prisma?: unknown }).prisma = previousGlobal;
  // CONTROL: an identical tripwire really does fire when touched, so 21n7/21n13 are not vacuous.
  const probe = { touched: 0 };
  const probeWire = new Proxy({}, { get() { probe.touched += 1; throw new Error("touched"); } });
  let tripped = false;
  try { void (probeWire as { anything?: unknown }).anything; } catch { tripped = true; }
  control("the database tripwire fires when touched", tripped && probe.touched === 1);

  // ---- 21p. apply fails closed on every conflicting field --------------------------------------------
  const approved = ACTIVATION_SKILLS[0];
  const exactRow = {
    slug: approved.slug, name: approved.name, description: approved.description,
    organization: approved.organization, track: approved.track, order: approved.order
  };
  assert.deepEqual(classifyActivationRow(approved, null), { action: "create" },
    "21p. a missing row is created");
  assert.deepEqual(classifyActivationRow(approved, { ...exactRow }), { action: "already-present" },
    "21p2. an exact row is already present — and no write branch exists for it");
  for (const [field, mutated] of [
    ["name", { ...exactRow, name: "Performance Indicators " }],
    ["description", { ...exactRow, description: "something else" }],
    ["organization", { ...exactRow, organization: "DEBATE" }],
    ["track", { ...exactRow, track: "HOSA" }],
    ["order", { ...exactRow, order: 99 }],
    ["slug", { ...exactRow, slug: "deca-something-else" }]
  ] as const) {
    const verdict = classifyActivationRow(approved, mutated);
    assert.equal(verdict.action, "conflict", `21p3. a conflicting ${field} is a CONFLICT, never an update`);
    assert.ok(verdict.action === "conflict" && verdict.fields.includes(field),
      `21p4. and the conflict names ${field}`);
  }
  // The conflict path must exit non-zero and must not write.
  assert.ok(/conflicts \+= 1/.test(scriptCode) && /return 1;/.test(scriptCode),
    "21p5. a conflict increments the counter and returns a non-zero exit code");
  assert.ok(!/action === "conflict"[\s\S]{0,200}prisma\.skill\./.test(scriptCode),
    "21p6. no database call follows the conflict branch");
  // A race is accepted ONLY when the refetched row matches exactly — the same rule, re-applied.
  assert.ok(/const raceVerdict = classifyActivationRow\(approved, refetched\)/.test(scriptCode),
    "21p7. a unique-slug race re-applies the SAME comparison to the refetched row");
  assert.ok(/raceVerdict\.action === "already-present"/.test(scriptCode),
    "21p8. and accepts it only on an exact match");
  // CONTROL: the comparison is load-bearing — a single trailing space is enough to fail closed.
  control("one trailing space in a name is a conflict, not an update",
    classifyActivationRow(approved, { ...exactRow, name: `${approved.name} ` }).action === "conflict");

  // ---- 21q. the registered package command -----------------------------------------------------------
  const pkgScripts = (JSON.parse(read("package.json")) as { scripts: Record<string, string> }).scripts;
  assert.equal(pkgScripts["deca:skills:activate"], "tsx scripts/seed-deca-drill-skills.ts",
    "21q. the activation command is registered exactly");
  assert.ok(!pkgScripts["deca:skills:activate"].includes("--apply"),
    "21q2. and does NOT default to apply mode");
  for (const [name, cmd] of Object.entries(pkgScripts)) {
    if (cmd.includes("seed-deca-drill-skills")) {
      assert.equal(name, "deca:skills:activate", `21q3. only one command invokes the activation script (found ${name})`);
    }
  }

  // ---- 22. Study Arcade is DECA-safe ---------------------------------------------------------------
  const review = read("app/(app)/study-arcade/review/page.tsx");
  assert.ok(review.includes("debateWritingPracticeSupported"), "22. the review card still gates by track");
  for (const s of ACTIVATION_PENDING_SKILLS) {
    assert.equal(compatTrackForSlug(s.slug), "DECA", `22b. a due review for "${s.slug}" is DECA`);
    assert.ok(!debateWritingPracticeSupported(s.slug), `22c. and is never offered a debate motion`);
  }

  // ---- 23. XP is absent ------------------------------------------------------------------------------
  for (const file of ["lib/deca-drills.ts", "app/api/deca/drills/submit/route.ts",
                      "components/training/concept-drills.tsx", "scripts/seed-deca-drill-skills.ts"]) {
    const code = stripComments(read(file));
    for (const banned of ["xpReward", "XPLog", "xpLog", "awardXp", "xpAwarded"]) {
      assert.ok(!code.includes(banned), `23. ${file} contains no ${banned}`);
    }
  }

  // ---- 24-28. everything outside the boundary is byte-identical to HEAD -------------------------------
  //
  // The three Debate concept-drill files were byte-pinned here until M13E1E, which deliberately gives
  // Debate the same duplicate-resistant evidence contract this suite proves for DECA. A blanket hash
  // would forbid that approved change rather than protect DECA, so the pins are replaced at 25b-25f by
  // assertions on what actually matters: DECA is untouched, and Debate did not drag DECA along with it.
  for (const file of ["lib/assignments.ts", "lib/assignment-types.ts",                       // 24 assignments
                      "prisma/seed.ts",                                                      // 28 seed
                      "lib/education/registry.ts", "lib/education/tracks/debate.ts",
                      "app/(app)/skills/[slug]/page.tsx"]) {
    assert.equal(nowSha(file), headSha(file), `24-28. ${file} is byte-identical to HEAD`);
  }

  // ---- 24L. what the lesson-practice hash was protecting, asserted exactly -----------------------
  // C3b-i converts this component to the server-issued session protocol, so a blanket hash would
  // forbid an approved change rather than protect anything.
  const lessonUi = stripComments(read("components/lessons/lesson-practice.tsx"));
  assert.ok(/fetch\("\/api\/debate\/drills\/session"/.test(lessonUi), "24L. it still starts a Debate drill session");
  assert.ok(/areas: \[drillArea\]/.test(lessonUi), "24L2. scoped to the lesson's own drill area — track isolation intact");
  assert.ok(/fetch\("\/api\/debate\/drills\/check"/.test(lessonUi), "24L3. answers go through the Debate check route");
  assert.ok(/JSON\.stringify\(\{ sessionId: session\.sessionId \}\)/.test(lessonUi),
    "24L4. and the final submit carries only the session id");
  assert.ok(!/JSON\.stringify\(\{ answers/.test(lessonUi), "24L5. the legacy answers body is gone");
  for (const banned of ["correctOptionId", "DRILL_BANK", "buildDrillSession", "gradeDrillAnswers"]) {
    assert.ok(!lessonUi.includes(banned), `24L6. no client answer authority or live-bank grading ({banned})`);
  }
  assert.ok(/answers\[current\.itemId\]/.test(lessonUi), "24L7. answer state is keyed by distinct item id");
  assert.ok(/\$\{slot\}:\$\{current\.itemId\}/.test(lessonUi), "24L8. and rendered slots are keyed by slot AND item");
  assert.ok(/checking \|\| answers\[current\.itemId\]/.test(lessonUi),
    "24L9. a repeated slot cannot send a second check, and neither can a duplicate in-flight one");
  assert.ok(/answeredCount === distinctTotal/.test(lessonUi), "24L10. completion counts DISTINCT items, not slots");
  assert.ok(/wroteSkills\.includes\(skillSlug\)/.test(lessonUi),
    "24L11. and mastery is still claimed only when the server confirms the write");
  assert.ok(/setExpired\(true\)/.test(lessonUi) && /is not available/.test(lessonUi),
    "24L12. expired and unavailable sessions have their own states");
  assert.ok(/aria-pressed=\{isSel\}/.test(lessonUi) && /min-h-11/.test(lessonUi),
    "24L13. accessibility and touch-target behaviour are preserved");

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

  // ---- 26. what the HOSA byte-pin was protecting, asserted exactly ----------------------------------
  // The HOSA MedTerm submit route was byte-pinned here until M13E1F, which deliberately gives it the
  // same duplicate-resistant evidence gate. A blanket hash would forbid that approved change rather
  // than protect DECA, so it is replaced by assertions on what actually matters.
  const hosaRoute = stripComments(read("app/api/hosa/medterm/submit/route.ts"));
  const hosaLib = stripComments(read("lib/hosa-medterm.ts"));
  // (i) HOSA stays REVIEW-ONLY — no mastery helper, no mastery model, no XP.
  for (const banned of ["recordDrillMastery", "recordDrillMasteryDetailed", "MasteryProgress",
                        "masteryProgress", "masteryLevelFor", "MASTERED",
                        "xpReward", "XPLog", "xpLog", "awardXp", "XP_REWARDS"]) {
    assert.ok(!hosaRoute.includes(banned), `26. the HOSA route stays review-only (no {banned})`);
    assert.ok(!hosaLib.includes(banned), `26b. and so does lib/hosa-medterm.ts (no {banned})`);
  }
  assert.ok(/recordPracticeOutcomeInTransaction\(/.test(hosaRoute),
    "26c. it still uses the review core only");
  for (const masteryPath of ["recordDrillMasteryInTransaction", "recordDrillMasteryDetailed", "recordDrillMastery("]) {
    assert.ok(!hosaRoute.includes(masteryPath), `26c2. and no mastery path at all (${masteryPath})`);
  }
  assert.ok(hosaRoute.indexOf("parseStoredResult(") < hosaRoute.indexOf("recordPracticeOutcomeInTransaction("),
    "26c3. a completed retry returns before any review effect");
  // Non-vacuous: the scan does detect an injected mastery write.
  assert.ok(/recordDrillMasteryInTransaction/.test("await recordDrillMasteryInTransaction(tx, {})"),
    "26c4. control: that scan matches a real mastery call");
  // (ii) No cross-track abstraction: HOSA uses its own helper, and the tracks do not import each other.
  // C2a: HOSA grades from its own session snapshot rather than the live-bank helper. The property
  // that mattered — no cross-track abstraction — is asserted directly.
  assert.ok(/HOSA_MEDTERM_REQUIRED_UNIQUE/.test(hosaRoute) && /HOSA_MEDTERM_REQUIRED_AREAS/.test(hosaRoute),
    "26d. HOSA uses its OWN floors");
  for (const foreign of ["debate-drills", "deca-drills", "DRILL_AREAS", "DECA_DRILL_AREAS",
                         "buildDrillEvidence", "buildDecaDrillEvidence"]) {
    assert.ok(!hosaRoute.includes(foreign), `26d2. and reaches into no other track (${foreign})`);
  }
  for (const foreign of ["@/lib/deca-drills", "@/lib/debate-drills", "buildDecaDrillEvidence", "buildDrillEvidence"]) {
    assert.ok(!hosaRoute.includes(foreign), `26e. the HOSA route imports no {foreign}`);
    assert.ok(!hosaLib.includes(foreign), `26e2. nor does lib/hosa-medterm.ts`);
  }
  for (const [file, foreign] of [["lib/deca-drills.ts", "hosa-medterm"], ["lib/debate-drills.ts", "hosa-medterm"]] as const) {
    assert.ok(!stripComments(read(file)).includes(foreign), `26f. ${file} does not import HOSA evidence helpers`);
  }
  // (iii) The unprovable review claim is gone, and no mastery system was introduced.
  assert.ok(!hosaRoute.includes("reviewScheduled"), "26g. the HOSA route no longer claims reviewScheduled");
  // (iv) The HOSA session route and the question bank itself are untouched.
  // C2a: the HOSA session route now issues a server-authoritative session, so a blanket hash would
  // forbid an approved change rather than protect anything. Replaced by what it was guarding.
  // ---- 26h. what the HOSA session-route hash was protecting, asserted exactly ----------------
  const hosaSession = stripComments(read("app/api/hosa/medterm/session/route.ts"));
  assert.ok(/requireUser\(\)/.test(hosaSession), "26h. the HOSA session route still authenticates");
  assert.ok(/enforceRateLimit\(/.test(hosaSession), "26h2. and its rate limiting is preserved");
  assert.ok(/prisma\.\$transaction\(/.test(hosaSession), "26h3. issuance happens in one transaction");
  const hsSess = hosaSession.slice(hosaSession.indexOf("prisma.$transaction"));
  assert.ok(hsSess.indexOf("lockUserRow(tx") >= 0 && hsSess.indexOf("lockUserRow(tx") < hsSess.indexOf("findActiveSession("),
    "26h4. whose FIRST statement is the user row lock, before any lifecycle query");
  const hsKinds = new Set([...hosaSession.matchAll(/"(DEBATE_DRILL|DECA_DRILL|HOSA_MEDTERM|DEBATE_WRITING)"/g)].map((m) => m[1]));
  assert.deepEqual([...hsKinds], ["HOSA_MEDTERM"], "26h5. it binds exactly HOSA_MEDTERM");
  assert.ok(/findActiveSession\(/.test(hosaSession), "26h6. an unexpired ISSUED session is reused, not duplicated");
  assert.ok(/buildMedTermSession\(/.test(hosaSession), "26h7. the SERVER selects the questions");
  assert.ok(/buildServedChoices\(/.test(hosaSession), "26h8. choices are shuffled and given opaque option ids");
  assert.ok(/correctOptionId/.test(hosaSession), "26h9. the correct option is persisted server-side");
  assert.ok(/kind: "DRILL"/.test(hosaSession) && /requestedCount: order\.length/.test(hosaSession),
    "26h10. the padded order is persisted in the immutable snapshot");
  assert.ok(/serializeStart\(/.test(hosaSession),
    "26h11. and the response is built by the serializer that withholds the key for unanswered items");
  assert.ok(/MEDTERM_AREAS/.test(hosaSession) && /mode: spec \? "official" : "generic"/.test(hosaSession),
    "26h12. HOSA area and official/generic spec labelling is preserved");
  // Reading the bank's correct answer at issuance is REQUIRED — it is what gets stored. What must
  // never happen is revealing which served option it is.
  const hsResponse = hosaSession.slice(hosaSession.indexOf("NextResponse.json"));
  for (const leak of ["correctAnswer", "correctOptionId", "explanationSnapshot", "explanation:"]) {
    assert.ok(!hsResponse.includes(leak), `26h13. the response literal reveals no ${leak}`);
  }
  for (const banned of ["XP_REWARDS", "xPLog", "MasteryProgress", "masteryProgress",
                        "recordDrillMastery", "recordPracticeOutcome"]) {
    assert.ok(!hosaSession.includes(banned), `26h14. issuance writes no mastery and no XP (${banned})`);
  }
  // Non-vacuous controls: both scans detect a real violation when one is present.
  assert.ok(/"DECA_DRILL"/.test('const k = "DECA_DRILL";'), "26h15. control: the kind scan matches a wrong-kind binding");
  assert.ok('{ correctAnswer: q.correctAnswer }'.includes("correctAnswer"),
    "26h16. control: the leak scan matches an answer-key field in a response literal");

  const hosaBank = await import("../lib/hosa-medterm");
  assert.equal(hosaBank.MEDTERM_BANK.length, 180, "26i. the HOSA bank holds 180 questions (M14 Phase 2a-2f took all six HOSA areas to 30 each; Debate and DECA banks are untouched and still 9 per area)");
  assert.equal(new Set(hosaBank.MEDTERM_BANK.map((q) => q.id)).size, 180, "26j. with unique ids");

  // ---- 26k. PER-AREA DEPTH, which audit G2 explicitly asks the mastery smokes to assert ----------
  // AREA_DEPTH is the single source of truth. Each Global-G2 slice raises exactly ONE entry 9 -> 30.
  const DECA_AREA_DEPTH: Record<string, number> = {
    "performance-indicators": 30,   // M14 Global G2 Slice 5 / DECA Slice 1
    "business-reasoning": 9,
    "customer-relations": 9,
    "marketing-fundamentals": 9
  };
  for (const [area, depth] of Object.entries(DECA_AREA_DEPTH)) {
    assert.equal(DECA_DRILL_BANK.filter((q) => q.area === area).length, depth,
      `26k. DECA area ${area} holds exactly ${depth} questions`);
  }
  assert.equal(DECA_DRILL_BANK.length, Object.values(DECA_AREA_DEPTH).reduce((a, b) => a + b, 0),
    "26k2. and the DECA bank total is exactly the sum of its declared per-area depths");
  assert.equal(new Set(DECA_DRILL_BANK.map((q) => q.id)).size, DECA_DRILL_BANK.length, "26k3. with unique ids");
  control("every DECA question belongs to exactly one declared area",
    DECA_DRILL_BANK.every((q) => q.area in DECA_AREA_DEPTH));

  // ---- 26m. BUILDER DEPTH for the expanded area. ADDED at Slice 5 -------------------------------
  // This suite carried NO builder depth block before Slice 5, because no DECA area had ever been
  // expanded — these are NEW assertions, not moved ones. Builder-level and read-only: no mastery
  // record is created or altered, and no PI evidenceScore fixture is fabricated. buildDecaDrillSession
  // seeds `result` with the ENTIRE shuffled pool before appending repeats, so the distinct counts are
  // deterministic, never probabilistic.
  const OVERDRAW = 40; // > 30 enters the repeat branch; < 60 makes the while loop append exactly once
  const piFocused20 = buildDecaDrillSession(20, ["performance-indicators"]);
  control("a 20-question focused performance-indicators session now serves 20 DISTINCT items — no padding",
    piFocused20.length === 20 && new Set(piFocused20.map((q) => q.id)).size === 20);
  const piOverdrawn = buildDecaDrillSession(OVERDRAW, ["performance-indicators"]);
  control("and performance-indicators still pads above its pool: 40 served over exactly 30 distinct",
    piOverdrawn.length === OVERDRAW && new Set(piOverdrawn.map((q) => q.id)).size === 30);
  // Non-vacuous: a still-9-item area DOES still pad, so the results above are a real depth change
  // rather than a property of the builder. BUSINESS-REASONING is the current shallow control. Three
  // DECA areas remain at 9, so this control may move to customer-relations or marketing-fundamentals
  // in a later slice; only when none remains shallow must it re-base onto a >30 overdraw.
  const shallow20 = buildDecaDrillSession(20, ["business-reasoning"]);
  control("control: the still-9-item business-reasoning area serves 20 over only 9 distinct",
    shallow20.length === 20 && new Set(shallow20.map((q) => q.id)).size === 9);
  const shallow40 = buildDecaDrillSession(OVERDRAW, ["business-reasoning"]);
  control("control: and 40 requested on that 9-item area still yields only 9 distinct",
    shallow40.length === OVERDRAW && new Set(shallow40.map((q) => q.id)).size === 9);
  control("control: three DECA areas remain at 9, so the shallow control need not re-base onto >30 logic yet",
    Object.values(DECA_AREA_DEPTH).filter((d) => d === 9).length === 3);
  // The PI fixtures above index PI.slice(0, n<=5), PI[0] and PI[5]. Additions append after pi-09, so
  // the legacy nine are still the first nine — assert that rather than assume it.
  assert.deepEqual(DECA_DRILL_BANK.filter((q) => q.area === "performance-indicators").map((q) => q.id).slice(0, 9),
    ["pi-01", "pi-02", "pi-03", "pi-04", "pi-05", "pi-06", "pi-07", "pi-08", "pi-09"],
    "26m. the legacy nine are still the first nine PI items, so every fixture denominator in this file is stable");

  assert.equal(hosaBank.MEDTERM_AREAS.length, 6, "26k. across six areas");

  // ---- 25b-25f. what the Debate byte-pins were protecting, asserted exactly ---------------------------
  const debateRoute = read("app/api/debate/drills/submit/route.ts");
  // (i) The Debate route still consumes the BOOLEAN wrapper — the whole reason recordDrillMastery must
  //     stay backward-compatible. If Debate ever switched to the detailed form, that guarantee is moot.
  // 25b INVERTED at M13E1G. The Debate route used the boolean helper, which cannot distinguish a
  // deliberate concurrency no-op from a write failure — so it told learners "progress could not be
  // saved" when nothing had failed. Both drill routes now consume the detailed outcome. The guarantee
  // that still matters is that the BOOLEAN EXPORT survives, truthful, for anything else reading it.
  assert.ok(/recordDrillMasteryInTransaction\(/.test(debateRoute),
    "25b. the Debate caller persists through the transaction-native mastery core");
  assert.ok(!/(?<!Detailed)\brecordDrillMastery\(/.test(stripComments(debateRoute)),
    "25b2. and no longer the boolean form, which could not express a no-op");
  const spacedReviewSrc = stripComments(read("lib/spaced-review.ts"));
  assert.ok(/export async function recordDrillMastery\(/.test(spacedReviewSrc), "25b3. the boolean export survives");
  assert.ok(/Promise<boolean>/.test(spacedReviewSrc), "25b4. and still returns a boolean");
  assert.ok(/outcome\.status === "updated"/.test(spacedReviewSrc),
    "25b5. true ONLY for an actual mastery write — a deliberate no-op returns false");
  // (ii) DECA's own modules are untouched by the Debate change — no shared abstraction was introduced.
  const debateLib = stripComments(read("lib/debate-drills.ts"));
  for (const decaSymbol of ["@/lib/deca-drills", "../lib/deca-drills", "DECA_DRILL_BANK",
                            "buildDecaDrillEvidence", "DECA_DRILL_REQUIRED_UNIQUE"]) {
    assert.ok(!debateLib.includes(decaSymbol), `25c. lib/debate-drills.ts does not reach into DECA (${decaSymbol})`);
  }
  const decaLib = stripComments(read("lib/deca-drills.ts"));
  for (const debateSymbol of ["@/lib/debate-drills", "../lib/debate-drills",
                              "buildDrillEvidence", "DEBATE_DRILL_REQUIRED_UNIQUE"]) {
    assert.ok(!decaLib.includes(debateSymbol), `25d. lib/deca-drills.ts does not reach into Debate (${debateSymbol})`);
  }
  // Word-boundary check: `DECA_DRILL_BANK` legitimately CONTAINS the Debate symbol's text, so a plain
  // substring scan would fire on DECA's own constant.
  assert.ok(!/(?<![A-Z_])DRILL_BANK\b/.test(decaLib), "25d2. and never references the bare Debate DRILL_BANK");
  control("the bare-symbol scan is live — DECA's own DECA_DRILL_BANK is present and correctly ignored",
    /\bDECA_DRILL_BANK\b/.test(decaLib) && !/(?<![A-Z_])DRILL_BANK\b/.test(decaLib));
  // (iii) The two tracks keep separate floors and separate helpers — isolation, not a merged engine.
  const { DEBATE_DRILL_REQUIRED_UNIQUE, buildDrillEvidence } = await import("../lib/debate-drills");
  assert.equal(DEBATE_DRILL_REQUIRED_UNIQUE, DECA_DRILL_REQUIRED_UNIQUE,
    "25e. both tracks use a five-distinct-question floor");
  assert.notEqual(buildDrillEvidence, buildDecaDrillEvidence,
    "25e2. but through separate per-track helpers, not one shared function");
  // (iv) DECA's own evidence behaviour is unchanged by the Debate work — re-proven, not assumed.
  assert.equal(piEvidence(distinctPi(5, 1)).evidenceScore, 20, "25f. DECA still scores 5-distinct/1-correct as 20");
  assert.equal(buildDrillEvidence([]).length, 0, "25f2. and the Debate helper is independent of it");

  // ---- 29. no database, and no drift between the client constant and the server floor ----------------
  for (const file of ["lib/deca-drills.ts", "components/training/concept-drills.tsx"]) {
    const code = stripComments(read(file));
    for (const banned of ["@/lib/prisma", "PrismaClient", "prisma."]) {
      assert.ok(!code.includes(banned), `29b. ${file} performs no ${banned}`);
    }
  }
  const componentCode = stripComments(read("components/training/concept-drills.tsx"));
  const declared = componentCode.match(/const REQUIRED_UNIQUE_FOR_PROGRESS = (\d+);/);
  assert.equal(Number(declared?.[1]), DECA_DRILL_REQUIRED_UNIQUE,
    "29c. the client's stated floor equals the server's DECA_DRILL_REQUIRED_UNIQUE");
  // Every learner-facing state string is present and states its meaning in WORDS.
  // C3a-ii: the no-op and failed-write states are gone because the server can no longer produce
  // them. The surviving matrix, the repeat explanation and the focused-session copy all remain.
  for (const copy of ["Practice only", "Keep practicing", "Progress saved", "Not tracked yet",
                      "Repeated questions count once toward progress",
                      "Focused skill sessions can update your progress"]) {
    assert.ok(componentCode.includes(copy), `29d. the result contract renders "${copy}"`);
  }
  for (const gone of ["Another submission already handled this review", "Progress not saved"]) {
    assert.ok(!componentCode.includes(gone),
      `29d2. and no longer renders "${gone}" — the server cannot produce that state`);
  }
  assert.ok(componentCode.includes("Your first answer for this question is the one that counts."),
    "29d3. replaced by first-answer-final copy, which the new protocol does produce");
  assert.ok(!/mastery \+ review updated|not yet tracked</.test(componentCode), "29e. the old two-state copy is gone");
  // M13E1G: the unprovable reviewScheduled boolean is gone from both route and component.
  assert.ok(!componentCode.includes("reviewScheduled"), "29e2. and reviewScheduled is gone from the component");
  assert.ok(!routeSrc.includes("reviewScheduled"), "29e3. and from the route");
  assert.ok(/recordPracticeOutcomeInTransaction\(/.test(routeSrc),
    "29e4. replaced by the transaction-native review core, whose outcome is not guessed at");
  assert.ok(/const now = new Date\(\);/.test(routeSrc), "29e5. under one server timestamp");

  // Every combination the UI can actually reach, run through the REAL branch function. A state must
  // never be conveyed by colour: each returns a badge whose WORDS carry the meaning.
  const { resultState } = await import("../components/training/concept-drills");
  const row = (evidenceStatus: string, persistenceStatus: string, extra: Record<string, number> = {}) =>
    resultState({ area: "performance-indicators", label: "Performance indicators", skillSlug: "deca-performance-indicators",
      total: 5, correct: 4, scorePercent: 80, uniqueTotal: 5, uniqueCorrect: 4, requiredUnique: DECA_DRILL_REQUIRED_UNIQUE,
      evidenceScore: 80, review: null, passed: evidenceStatus === "passing",
      ...extra, evidenceStatus, persistenceStatus } as Parameters<typeof resultState>[0]);
  const combos: Array<[string, string, string]> = [
    ["insufficient-evidence", "not-attempted", "Practice only"],
    ["below-threshold", "updated", "Keep practicing"],
    ["passing", "updated", "Progress saved"],
    ["below-threshold", "skill-missing", "Not tracked yet"],
    ["passing", "skill-missing", "Not tracked yet"],
    ["passing", "not-attempted", "Practice only"],
    ["insufficient-evidence", "skill-missing", "Not tracked yet"]
  ];
  for (const [ev, pers, badge] of combos) {
    const state = row(ev, pers);
    assert.equal(state.badge, badge, `29f. ${ev} + ${pers} reads "${badge}"`);
    assert.ok(state.badge.trim().length > 0, "29g. every state is conveyed by words, never colour alone");
  }
  // The last row above is DEFENSIVE ONLY — the route cannot produce it. Prove that: persistence is
  // attempted exactly when the plan is non-null, and the plan is null for every sub-floor evidence
  // set, so "insufficient evidence" always carries "not-attempted" and can never be mislabelled.
  // C2a shape: the guard is the evidence floor and the statuses come from the transaction-native
  // outcomes. Nothing may claim success before those calls return.
  assert.ok(/let persistenceStatus: PersistenceStatus = "not-attempted"/.test(routeSrc),
    "29f2. persistence status starts at not-attempted");
  assert.ok(/if \(qualifies && area\.skillSlug\) \{/.test(routeSrc),
    "29f2b. and only the floor-guarded branch changes it");
  assert.ok(/persistenceStatus = mastery\.status === "updated" \? "updated" : "skill-missing"/.test(routeSrc),
    "29f2c. the status is derived ONLY from the transaction-native mastery outcome");
  assert.ok(/const review = await recordPracticeOutcomeInTransaction\(/.test(routeSrc),
    "29f2d. and the review outcome comes only from the transaction-native review core");
  assert.ok(/if \(mastery\.status === "updated"\) wroteSkills\.push/.test(routeSrc),
    "29f2e. wroteSkills changes only for an actual mastery update");
  assert.ok(/persistenceStatus = "skill-missing"/.test(routeSrc),
    "29f2f. an unseeded skill is reported as skill-missing, never as success");
  assert.ok(routeSrc.indexOf("parseStoredResult(") < routeSrc.indexOf("recordPracticeOutcomeInTransaction("),
    "29f2g. a completed retry returns BEFORE any persistence effect");
  assert.ok(!/let persistenceStatus: PersistenceStatus = "updated"/.test(routeSrc),
    "29f2h. there is no unconditional success initializer");
  // Non-vacuous: a pre-set success initializer WOULD be caught.
  assert.ok(/let persistenceStatus: PersistenceStatus = "updated"/.test(
    'let persistenceStatus: PersistenceStatus = "updated";'),
    "29f2i. control: that scan matches a pre-set success status");
  for (let n = 1; n < DECA_DRILL_REQUIRED_UNIQUE; n += 1) {
    const ev = piEvidence(distinctPi(n, n));
    assert.equal(ev.evidenceStatus, "insufficient-evidence", `29f3. ${n} unique is insufficient`);
    assert.equal(decaDrillPersistenceRequest(ev), null, `29f4. so its plan is null and persistence stays not-attempted`);
  }

  // A write failure must never be described as an unseeded skill, and vice versa.
  // A deliberate concurrency no-op is neither a save nor a failure.
  // C3a-ii: the no-op and failed-write states are gone with the server states that produced them.
  // What remains must still be mutually distinguishable, and neither may claim a save.
  const failClosed = `${row("passing", "not-attempted").badge} ${row("passing", "not-attempted").explanation ?? ""}`;
  assert.ok(!/not.*(set up|available)/i.test(failClosed),
    "29h. the fail-closed state is not reported as a missing skill");
  assert.ok(!/Progress saved|could not be saved/.test(failClosed),
    "29h2. and claims neither a save nor a save failure");
  assert.ok(/not available for this skill yet/.test(row("passing", "skill-missing").explanation ?? ""),
    "29i. and a missing row says exactly that");
  // CONTROL: the branch function really discriminates — the same evidence with different
  // persistence produces different copy, so the second status field is load-bearing.
  control("persistence status alone changes the learner-facing result",
    new Set(["updated", "skill-missing", "not-attempted"].map((p) => row("passing", p).badge)).size === 3);
  // CONTROL: the old copy really existed, so 29e is not matching an already-absent string.
  //
  // PINNED, NOT `HEAD`. This control read `git show HEAD:` when it was written, which was correct
  // only until M13E1D itself was committed — at which point HEAD became the commit that DELETED the
  // string and the control could never hold again. Same defect this milestone fixed in three other
  // suites; it was in this file too. A historical control must name the history it means.
  control("the pre-M13E1D commit really carried the old two-state copy",
    /mastery \+ review updated/.test(
      execSync(`git show ${PRE_M13E1D}:components/training/concept-drills.tsx`, { encoding: "utf8" })));

  console.log(
    `Deca-mastery smoke passed: DECA drill mastery is now scored from a duplicate-resistant evidence set — first answer per distinct valid question id, attributed to the question's own bank area — and needs ${DECA_DRILL_REQUIRED_UNIQUE} distinct questions before anything is written. The exact reported bypass (five distinct performance-indicator questions, one genuinely correct, that one repeated twelve times) scored 76% and would have written a pass; it now scores 20% and never qualifies. Repeats, conflicting resubmits and unknown ids cannot raise evidence, and below the floor the persistence helper is not called at all, so no mastery, no review and no due-review knock-down can follow. Persistence reports updated / skill-missing / write-failed separately from the evidence status, a thrown lookup is never reported as a missing skill, and the existing boolean wrapper is true only for updated so the Debate caller is unchanged. The three DECA drill skills resolve as DECA to /training/deca/practice, never to Debate writing practice; the activation script holds exactly those three rows and is dry-run by default — the dry run imports no database client at all (proven against a tripwire that throws on any access), and apply creates a missing row, verifies an exact one, and fails closed with a non-zero exit on any conflicting slug, name, description, organization, track or order rather than overwriting it. ${controlsRun.length} controls each demonstrated the failure they exist to demonstrate.`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
