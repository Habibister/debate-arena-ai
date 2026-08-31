/**
 * General Debate drill mastery evidence + persistence contract (M13E1E).
 *
 * Run with: npm run debate-mastery:smoke
 *
 * NO DATABASE. The persistence tests drive the REAL `recordDrillMastery` against a stub client
 * installed on `globalThis.prisma` before `lib/prisma` is first imported (that module reads
 * `globalThis.prisma` before constructing a `PrismaClient`, so no client is ever built and no
 * connection is ever opened). Nothing here mirrors production logic: every assertion runs the
 * shipped function.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
// THE PRODUCTION MODULES — never a mirrored copy of their logic.
import {
  DRILL_AREAS,
  DRILL_BANK,
  DRILL_PASS_THRESHOLD,
  DEBATE_DRILL_REQUIRED_UNIQUE,
  buildDrillEvidence,
  debateDrillPersistenceRequest,
  buildDrillSession,
  gradeDrillAnswers,
  type DrillAnswer,
  type DrillArea
} from "../lib/debate-drills";
import { INTENDED_SKILL_SLUGS, SEEDED_SKILL_SLUGS, compatTrackForSlug, resolveSkillsSlug } from "../lib/education/skills-compat";

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

/** M13E1E's parent — the last commit with the fake-mastery Debate drill contract. */
const PRE_M13E1E = "75b2dd6a8a658fd0168fb1184488f9435f4d5916";

/** Every control asserts the invariant would actually FAIL under the rejected alternative. */
const controlsRun: string[] = [];
function control(label: string, holds: boolean) {
  assert.ok(holds, `control "${label}" did not demonstrate the failure it exists to demonstrate`);
  controlsRun.push(label);
}

// --- fixtures ------------------------------------------------------------------------------------

const byArea = (area: DrillArea) => DRILL_BANK.filter((q) => q.area === area);

/** Per-area Debate depth, which audit G2 asks the mastery smokes to assert. SINGLE SOURCE OF TRUTH:
 *  a Global-G2 slice raises exactly ONE entry 9 -> 30, so one area can evolve without weakening the
 *  assertion on any other. Both the precondition block (24) and the G2 depth block (29k) read it. */
const DEBATE_AREA_DEPTH: Record<DrillArea, number> = {
  "claim-warrant-impact": 30,   // M14 Global G2 Slice 2
  "rebuttal": 30,   // M14 Global G2 Slice 1
  "evidence-evaluation": 30,   // M14 Global G2 Slice 3
  "weighing": 30   // M14 Global G2 Slice 4 — Debate depth is now COMPLETE at 4 x 30
, "clash": 30
, "signposting": 30
, "constructive-speech": 30 };
const right = (q: { correctAnswer: string }) => q.correctAnswer;
const wrongFor = (q: { choices: string[]; correctAnswer: string }) => {
  const other = q.choices.find((c) => c !== q.correctAnswer);
  if (!other) throw new Error("bank question has no incorrect choice");
  return other;
};
const CWI = byArea("claim-warrant-impact");
const REB = byArea("rebuttal");

/** N distinct claim-warrant-impact answers, the first `correct` of them right. */
function distinct(n: number, correct: number): DrillAnswer[] {
  return CWI.slice(0, n).map((q, i) => ({ id: q.id, selected: i < correct ? right(q) : wrongFor(q) }));
}
function evidenceFor(answers: DrillAnswer[], area: DrillArea = "claim-warrant-impact") {
  const found = buildDrillEvidence(answers).find((e) => e.area === area);
  if (!found) throw new Error(`expected ${area} evidence`);
  return found;
}

// --- stub client (installed BEFORE lib/prisma is ever loaded) ------------------------------------

const stub = { mode: "found" as "found" | "missing" | "write-throws", calls: [] as Array<{ op: string; data: Record<string, unknown> }> };
function resetStub(mode: "found" | "missing" | "write-throws" = "found") {
  stub.mode = mode;
  stub.calls = [];
}
const stubPrisma = {
  skill: { findUnique: async () => (stub.mode === "missing" ? null : { id: "stub-skill-id" }) },
  masteryProgress: {
    findUnique: async () => null,
    create: async (args: { data: Record<string, unknown> }) => {
      if (stub.mode === "write-throws") throw new Error("simulated write failure");
      stub.calls.push({ op: "masteryProgress.create", data: args.data });
      return {};
    },
    update: async (args: { data: Record<string, unknown> }) => {
      if (stub.mode === "write-throws") throw new Error("simulated write failure");
      stub.calls.push({ op: "masteryProgress.update", data: args.data });
      return {};
    }
  },
  skillReviewSchedule: {
    findUnique: async () => null,
    create: async (args: { data: Record<string, unknown> }) => { stub.calls.push({ op: "review.create", data: args.data }); return {}; },
    update: async (args: { data: Record<string, unknown> }) => { stub.calls.push({ op: "review.update", data: args.data }); return {}; },
    count: async () => 0,
    findMany: async () => []
  }
};
(globalThis as unknown as { prisma?: unknown }).prisma = stubPrisma;

async function main() {
  const { recordDrillMastery } = await import("../lib/spaced-review");
  assert.equal((globalThis as unknown as { prisma?: unknown }).prisma, stubPrisma,
    "32. no real PrismaClient was constructed — the stub is still the module's client");

  // ---- bank + floor preconditions ------------------------------------------------------------------
  assert.equal(DRILL_AREAS.length, 5, "exactly five Debate concept-drill areas");
  assert.equal(DEBATE_DRILL_REQUIRED_UNIQUE, 5, "the evidence floor is five distinct questions");
  assert.equal(DRILL_PASS_THRESHOLD, 70, "the threshold is unchanged at 70%");
  for (const area of DRILL_AREAS) {
    const pool = DRILL_BANK.filter((q) => q.area === area.id);
    assert.equal(pool.length, DEBATE_AREA_DEPTH[area.id],
      `24. area ${area.id} has exactly ${DEBATE_AREA_DEPTH[area.id]} distinct questions`);
    assert.ok(pool.length >= DEBATE_DRILL_REQUIRED_UNIQUE, `24b. and can therefore reach the floor`);
    assert.ok(INTENDED_SKILL_SLUGS.includes(area.skillSlug),
      `24c. "${area.skillSlug}" is seeded or activation-pending, so writes land once its row exists`);
    if (area.id === "clash") {
      assert.ok(!SEEDED_SKILL_SLUGS.includes(area.skillSlug),
        "24c2. debate-clash is NOT claimed as seeded — its row comes from the deliberate activation script");
    }
    // Four of the five now resolve as canonical redirects to authored Debate lessons — CWI and
    // rebuttal via the M13E1C allowlist, weighing because Wave 1B published the corrected lesson
    // under the same id as its seeded skill, and clash because the canonical lesson id shadows the
    // activation-pending skill slug the same way. Either way, the invariant that matters is the
    // same: no Debate drill skill may ever resolve into DECA or HOSA territory.
    const resolution = resolveSkillsSlug(area.skillSlug);
    const track = compatTrackForSlug(area.skillSlug);
    assert.ok(track === "DEBATE" || track === null, `25. "${area.skillSlug}" never resolves to DECA or HOSA (got ${track})`);
    assert.notEqual(track, "DECA", `25b. "${area.skillSlug}" is not DECA`);
    assert.notEqual(track, "HOSA", `25c. "${area.skillSlug}" is not HOSA`);
    if (resolution.kind === "canonical-redirect") {
      assert.ok(["claim-warrant-impact", "debate-refutation", "debate-weighing", "debate-clash"].includes(resolution.lessonId),
        `25d. "${area.skillSlug}" redirects only to an authored DEBATE lesson (${resolution.lessonId})`);
    } else {
      assert.equal(track, "DEBATE", `25e. "${area.skillSlug}" resolves as DEBATE`);
    }
  }

  // ---- 1-3. below the floor -------------------------------------------------------------------------
  const one = evidenceFor([{ id: CWI[0].id, selected: right(CWI[0]) }]);
  assert.equal(gradeDrillAnswers([{ id: CWI[0].id, selected: right(CWI[0]) }]).perSkill[0].scorePercent, 100,
    "1. one correct question still SHOWS a raw 100% session score");
  assert.equal(one.uniqueTotal, 1, "1b. but is one unique question");
  assert.equal(one.evidenceStatus, "insufficient-evidence", "1c. which is insufficient evidence");
  assert.equal(debateDrillPersistenceRequest(one), null, "1d. so no mastery call is made at all");

  const fiveCopies = evidenceFor(Array.from({ length: 5 }, () => ({ id: CWI[0].id, selected: right(CWI[0]) })));
  assert.equal(fiveCopies.uniqueTotal, 1, "2. five copies of one id are still ONE unique question");
  assert.equal(fiveCopies.evidenceStatus, "insufficient-evidence", "2b. still insufficient evidence");
  assert.equal(debateDrillPersistenceRequest(fiveCopies), null, "2c. repeating an id cannot buy a write");

  const fourPerfect = evidenceFor(distinct(4, 4));
  assert.equal(fourPerfect.evidenceScore, 100, "3. four distinct all-correct scores 100 on evidence");
  assert.equal(fourPerfect.evidenceStatus, "insufficient-evidence", "3b. and is STILL insufficient");
  assert.equal(debateDrillPersistenceRequest(fourPerfect), null, "3c. so a perfect four-question run writes nothing");

  // ---- 4-7. the evidence score ----------------------------------------------------------------------
  for (const [correct, score, status] of [
    [1, 20, "below-threshold"], [3, 60, "below-threshold"], [4, 80, "passing"], [5, 100, "passing"]
  ] as const) {
    const ev = evidenceFor(distinct(5, correct));
    assert.equal(ev.uniqueTotal, 5, `4-7. five distinct with ${correct} correct -> 5 unique`);
    assert.equal(ev.uniqueCorrect, correct, `4-7b. ${correct} correct`);
    assert.equal(ev.evidenceScore, score, `4-7c. evidence score ${score}`);
    assert.equal(ev.evidenceStatus, status, `4-7d. status ${status}`);
    assert.equal(ev.passed, status === "passing", "4-7e. passed reflects the evidence, not the raw tally");
  }
  assert.deepEqual(debateDrillPersistenceRequest(evidenceFor(distinct(5, 1))), { scorePercent: 20, passed: false },
    "4b. a 20% evidence run reaches persistence as 20/false");

  // ---- 8. THE DUPLICATE-INFLATION BYPASS -------------------------------------------------------------
  const bypass: DrillAnswer[] = [...distinct(5, 1), ...Array.from({ length: 12 }, () => ({ id: CWI[0].id, selected: right(CWI[0]) }))];
  const bypassRaw = gradeDrillAnswers(bypass).perSkill.find((s) => s.area === "claim-warrant-impact");
  const bypassEv = evidenceFor(bypass);
  assert.equal(bypassEv.uniqueTotal, 5, "8. five distinct questions");
  assert.equal(bypassEv.uniqueCorrect, 1, "8b. one genuinely correct");
  assert.equal(bypassEv.evidenceScore, 20, "8c. evidence stays 20%, not 76%");
  assert.equal(bypassEv.passed, false, "8d. and never passes");
  // CONTROL: the raw duplicate-weighted number really would have written a pass.
  control(`duplicate-weighted scoring would have written a pass (${bypassRaw?.scorePercent}% >= ${DRILL_PASS_THRESHOLD}%)`,
    bypassRaw !== undefined && bypassRaw.scorePercent === 76 && bypassRaw.passed === true);

  // ---- 9. THE HONEST-PADDING CASE -------------------------------------------------------------------
  // No bad intent: the drill itself serves repeats above the nine-item pool, and the learner has
  // already been shown the answer, so they get the repeats right.
  // The denominator is pinned to the LEGACY NINE, not to the rebuttal pool. Slice 1 took rebuttal to
  // 30; 67 must keep meaning "six of nine distinct", not drift because the bank grew. Additions
  // append after rb-09, so slice(0, 9) is stable.
  const NINE = REB.slice(0, 9);
  assert.deepEqual(NINE.map((q) => q.id),
    ["rb-01", "rb-02", "rb-03", "rb-04", "rb-05", "rb-06", "rb-07", "rb-08", "rb-09"],
    "9-pre. the legacy nine are still the first nine rebuttal items");
  const padded: DrillAnswer[] = NINE.map((q, i) => ({ id: q.id, selected: i < 6 ? right(q) : wrongFor(q) }));
  while (padded.length < 20) { const q = NINE[padded.length % 9]; padded.push({ id: q.id, selected: right(q) }); }
  const paddedRaw = gradeDrillAnswers(padded).perSkill.find((s) => s.area === "rebuttal");
  const paddedEv = evidenceFor(padded, "rebuttal");
  assert.equal(paddedEv.uniqueTotal, 9, "9. nine distinct rebuttal questions were seen");
  assert.equal(paddedEv.uniqueCorrect, 6, "9b. six were genuinely correct on first exposure");
  assert.equal(paddedEv.evidenceScore, 67, "9c. evidence score is 67, never above");
  assert.ok(paddedEv.evidenceScore <= 67, "9c2. and is capped at 67 exactly as required");
  assert.equal(paddedEv.evidenceStatus, "below-threshold", "9d. which is below threshold");
  assert.equal(paddedEv.passed, false, "9e. so it does not pass");
  assert.deepEqual(debateDrillPersistenceRequest(paddedEv), { scorePercent: 67, passed: false },
    "9f. persistence receives 67 with passed:false");
  assert.ok(67 < 85, "9g. 67 is below the MASTERED threshold, so no MASTERED-qualified result exists");
  // CONTROL: the raw path really did reach MASTERED for the same honest learner.
  control(`the raw padded score reached ${paddedRaw?.scorePercent}% (>=85 = MASTERED) for a true 6-of-9`,
    paddedRaw !== undefined && paddedRaw.scorePercent === 85 && paddedRaw.passed === true);
  // CONTROL: later correct repeats genuinely cannot move the evidence score.
  // Repeats of the SAME legacy nine — not of the wider pool, which would add new distinct ids and
  // legitimately change the score. The invariant under test is "repeats cannot move evidence".
  const morePadding = [...padded, ...NINE.map((q) => ({ id: q.id, selected: right(q) }))];
  const moreEv = evidenceFor(morePadding, "rebuttal");
  control("adding nine more correct repeats leaves the evidence score at 67",
    moreEv.evidenceScore === 67 && moreEv.uniqueTotal === 9);

  // ---- 10. conflicting duplicate: FIRST occurrence controls -------------------------------------------
  const rightThenWrong = evidenceFor([
    { id: CWI[0].id, selected: right(CWI[0]) }, { id: CWI[0].id, selected: wrongFor(CWI[0]) }, ...distinct(5, 0).slice(1)
  ]);
  assert.equal(rightThenWrong.uniqueTotal, 5, "10. the repeated id is counted once");
  assert.equal(rightThenWrong.uniqueCorrect, 1, "10b. and its FIRST answer (correct) counted");
  const wrongThenRight = evidenceFor([
    { id: CWI[0].id, selected: wrongFor(CWI[0]) }, { id: CWI[0].id, selected: right(CWI[0]) }, ...distinct(5, 0).slice(1)
  ]);
  assert.equal(wrongThenRight.uniqueCorrect, 0, "10c. answering wrong first cannot be corrected by a resubmit");
  control("last-occurrence would flip both conflicting-duplicate fixtures",
    rightThenWrong.uniqueCorrect === 1 && wrongThenRight.uniqueCorrect === 0);

  // ---- 11. unknown ids --------------------------------------------------------------------------------
  const withUnknown = evidenceFor([...distinct(5, 4), { id: "not-a-real-id", selected: "x" }, { id: "", selected: "y" }]);
  const withoutUnknown = evidenceFor(distinct(5, 4));
  assert.deepEqual([withUnknown.uniqueTotal, withUnknown.uniqueCorrect, withUnknown.evidenceScore],
    [withoutUnknown.uniqueTotal, withoutUnknown.uniqueCorrect, withoutUnknown.evidenceScore],
    "11. unknown ids change neither the count nor the score");
  assert.equal(buildDrillEvidence([{ id: "not-a-real-id", selected: "x" }]).length, 0,
    "11b. an unknown id alone produces no evidence at all");
  control("a real id in the same position does change the count",
    evidenceFor([...distinct(5, 4), { id: CWI[5].id, selected: right(CWI[5]) }]).uniqueTotal === 6);

  // ---- 12. cross-area attribution ---------------------------------------------------------------------
  const mixedAreas = buildDrillEvidence([
    ...CWI.slice(0, 3).map((q) => ({ id: q.id, selected: right(q) })),
    ...REB.slice(0, 2).map((q) => ({ id: q.id, selected: right(q) }))
  ]);
  assert.equal(mixedAreas.find((e) => e.area === "claim-warrant-impact")?.uniqueTotal, 3, "12. CWI ids land in CWI");
  assert.equal(mixedAreas.find((e) => e.area === "rebuttal")?.uniqueTotal, 2, "12b. rebuttal ids land in rebuttal");
  assert.ok(mixedAreas.every((e) => e.evidenceStatus === "insufficient-evidence"),
    "12c. and neither reaches the floor, so a mixed session records nothing");

  // ---- 13-14. below the floor the helper is never called ----------------------------------------------
  const routeSrc = stripComments(read("app/api/debate/drills/submit/route.ts"));
  // M13E1G: this route now consumes the DETAILED outcome. The boolean helper could not distinguish a
  // deliberate concurrency no-op from a write failure, so it reported "Progress not saved" when
  // nothing had failed. The boolean export itself is unchanged and still asserted at 32c-32e.
  // M13E2 C2a moved this route onto server-issued sessions, so the persistence SHAPE changed: the
  // transaction-native cores replace the public helper, and the floor gate is an explicit predicate
  // rather than a nullable plan. The invariants those assertions protected are re-asserted here.
  assert.equal((routeSrc.match(/recordPracticeOutcomeInTransaction\(/g) ?? []).length, 1,
    "13. exactly one review call site");
  assert.equal((routeSrc.match(/recordDrillMasteryInTransaction\(/g) ?? []).length, 1,
    "13a. and exactly one mastery call site");
  assert.ok(!/(?<!Detailed)(?<!InTransaction)\brecordDrillMastery\(/.test(routeSrc),
    "13a2. and it is not the boolean form");
  // M15 S1B Batch II: the ordering comparison alone was vacuous — with the evidence
  // anchor absent indexOf returns -1 and `-1 < n` still holds, so deleting the evidence
  // write this control exists to sequence turned it green. Both anchors are now proven
  // present before the ordering is accepted.
  const reviewIdx = routeSrc.indexOf("recordPracticeOutcomeInTransaction(");
  const masteryIdx = routeSrc.indexOf("recordDrillMasteryInTransaction(");
  assert.ok(reviewIdx >= 0 && masteryIdx >= 0,
    "13b-anchors. both the review (evidence) writer and the mastery writer are present");
  assert.ok(reviewIdx < masteryIdx,
    "13b. review runs BEFORE mastery, and mastery consumes its result");
  assert.ok(/if \(qualifies && area\.skillSlug\) \{/.test(routeSrc),
    "13c. the call is guarded by the evidence floor — below it, persistence is not attempted at all");
  assert.ok(/if \(mastery\.status === "updated"\) wroteSkills\.push/.test(routeSrc),
    "13d. and only an actual mastery update enters wroteSkills — never a no-op");
  assert.ok(/requireEveryItemAnswered\(/.test(routeSrc), "13e. every distinct served item must be answered");
  assert.ok(!/gradeDrillAnswers\(|buildDrillEvidence\(/.test(routeSrc),
    "13e2. and grading reads the stored snapshot, never the live bank");
  assert.ok(/const now = new Date\(\);/.test(routeSrc), "13f. one server timestamp governs the submission");
  for (let n = 1; n < DEBATE_DRILL_REQUIRED_UNIQUE; n += 1) {
    assert.equal(debateDrillPersistenceRequest(evidenceFor(distinct(n, n))), null,
      `14. ${n} unique all-correct questions produce NO call — no write, no review, no due-review knock-down`);
  }
  control("four distinct all-correct score 100% and are STILL refused",
    evidenceFor(distinct(4, 4)).evidenceScore === 100 && debateDrillPersistenceRequest(evidenceFor(distinct(4, 4))) === null);
  control("the fifth distinct question flips the same fixture to a real call",
    debateDrillPersistenceRequest(evidenceFor(distinct(5, 5))) !== null);

  // ---- 15-16. what is handed to persistence -------------------------------------------------------------
  assert.deepEqual(debateDrillPersistenceRequest(evidenceFor(distinct(5, 3))), { scorePercent: 60, passed: false },
    "15. qualifying below-threshold persists the EVIDENCE score with passed:false");
  assert.deepEqual(debateDrillPersistenceRequest(evidenceFor(distinct(5, 4))), { scorePercent: 80, passed: true },
    "16. qualifying passing persists the evidence score with passed:true");

  // ---- 17-19. persistence status and learner copy --------------------------------------------------------
  const { resultState } = await import("../components/training/debate-drills");
  const row = (evidenceStatus: string, persistenceStatus: string) =>
    resultState({ area: "claim-warrant-impact", label: "Claim / Warrant / Impact", skillSlug: "debate-claim-building",
      total: 5, correct: 4, scorePercent: 80, uniqueTotal: 5, uniqueCorrect: 4, requiredUnique: DEBATE_DRILL_REQUIRED_UNIQUE,
      evidenceScore: 80, passed: evidenceStatus === "passing", evidenceStatus,
      persistenceStatus } as Parameters<typeof resultState>[0]);
  // C3a-i: the client state model now mirrors the C2a result exactly. `preserved-concurrent` and
  // `not-saved` are gone because the server can no longer produce them — a submission runs in one
  // transaction that commits or rolls back, and the session claim means a second concurrent submit
  // replays the stored result instead of reaching mastery. `review` is gone because the completed
  // result carries no review outcome, and inventing one would be a fabrication.
  assert.ok(!("review" in (row("passing", "updated") as object)),
    "16a. the client no longer takes a review input it cannot honestly render");
  assert.equal(row("below-threshold", "updated").badge, "Keep practicing",
    "16b. a below-threshold result stays 'Keep practicing' even when the write landed");
  // The surviving matrix, and the fail-closed case. `passing` + `not-attempted` cannot currently be
  // produced by the route; it must NEVER read as a save.
  const neutral = row("passing", "not-attempted");
  assert.equal(neutral.badge, "Practice only", "16c. a qualifying result with no write attempt fails closed");
  assert.ok(!/Progress saved|could not be saved/.test(`${neutral.badge} ${neutral.explanation ?? ""}`),
    "16d. and claims neither save success nor save failure");
  assert.equal(row("passing", "skill-missing").badge, "Not tracked yet", "16e. a missing skill is distinct");
  assert.equal(row("passing", "updated").badge, "Progress saved", "17. a real write reads 'Progress saved'");
  assert.equal(new Set(["Progress saved", "Practice only", "Not tracked yet", "Keep practicing"]).size, 4,
    "17c. and the four surviving badges remain distinct from one another");
  assert.equal(row("below-threshold", "skill-missing").badge, "Not tracked yet",
    "17b. an unseeded skill is reported as such regardless of score");
  // `not-saved` no longer exists: the submission runs in one transaction that commits or rolls back,
  // so there is no "graded but not saved" outcome to describe. What still matters is that the two
  // remaining non-save states stay distinguishable and neither is dressed up as a save.
  assert.ok(!/not.*(set up|seeded|available)/i.test(row("passing", "not-attempted").explanation ?? ""),
    "17d. the fail-closed state is NEVER described as an unseeded or unavailable skill");
  assert.notEqual(row("passing", "not-attempted").explanation, row("passing", "skill-missing").explanation,
    "17e. and it stays distinguishable from an unseeded skill");
  for (const st of ["not-attempted", "skill-missing"] as const) {
    assert.ok(!/Progress saved/.test(`${row("passing", st).badge} ${row("passing", st).explanation ?? ""}`),
      `17f. neither non-save state claims a save (${st})`);
  }
  assert.equal(row("below-threshold", "updated").badge, "Keep practicing", "18. below threshold + updated reads 'Keep practicing'");
  assert.equal(row("passing", "updated").badge, "Progress saved", "19. passing + updated reads 'Progress saved'");
  assert.equal(row("insufficient-evidence", "not-attempted").badge, "Practice only", "19b. insufficient reads 'Practice only'");
  for (const [ev, pers] of [["insufficient-evidence", "not-attempted"], ["below-threshold", "updated"],
                            ["passing", "updated"], ["passing", "not-attempted"],
                            ["passing", "skill-missing"], ["below-threshold", "skill-missing"]] as const) {
    assert.ok(row(ev, pers).badge.trim().length > 0, "19c. every state is conveyed by words, never colour alone");
  }
  control("a save, an unseeded skill and a fail-closed non-write are three DIFFERENT learner results",
    new Set(["updated", "skill-missing", "not-attempted"].map((p) => row("passing", p).badge)).size === 3);

  // ---- 20-23. the component's claims ----------------------------------------------------------------------
  const ui = stripComments(read("components/training/debate-drills.tsx"));
  // JSX wraps prose across lines, so copy assertions run against a whitespace-normalised view.
  const uiText = ui.replace(/\s+/g, " ");
  for (const banned of ["mastery + review updated", "not yet tracked", "Scores are real",
                        "updates your mastery and spaced-review schedule", "feed mastery + spaced review"]) {
    assert.ok(!uiText.includes(banned), `20-21. the false claim "${banned}" is gone`);
  }
  assert.ok(!/review (was |is )?(definitely )?scheduled/i.test(uiText), "20b. and nothing claims a review was scheduled");
  assert.ok(!ui.includes("reviewScheduled"), "20c. there is no reviewScheduled field to imply one");
  assert.ok(!routeSrc.includes("reviewScheduled"), "20d. and the route does not send one");
  assert.ok(uiText.includes("A mixed session is practice and only records a skill when you answer at least"),
    "22. the mixed-session guidance appears");
  assert.ok((uiText.match(/Focused skill sessions can update your progress/g) ?? []).length >= 2,
    "22b. before starting AND on results");
  assert.ok(/const repeated = s\.evidenceScore !== s\.scorePercent;/.test(ui),
    "23. the repeat explanation renders only when raw and evidence scores differ");
  assert.ok(uiText.includes("Repeated questions count once toward progress"), "23b. with the exact wording");
  const declared = ui.match(/const REQUIRED_UNIQUE_FOR_PROGRESS = (\d+);/);
  assert.equal(Number(declared?.[1]), DEBATE_DRILL_REQUIRED_UNIQUE,
    "23c. the client's stated floor equals the server's DEBATE_DRILL_REQUIRED_UNIQUE");

  // ---- 26. XP is absent ------------------------------------------------------------------------------------
  for (const file of ["lib/debate-drills.ts", "app/api/debate/drills/submit/route.ts", "components/training/debate-drills.tsx"]) {
    const code = stripComments(read(file));
    for (const banned of ["xpReward", "XPLog", "xpLog", "awardXp", "xpAwarded", "XP_REWARDS"]) {
      assert.ok(!code.includes(banned), `26. ${file} contains no ${banned}`);
    }
  }

  // ---- 27-31. everything outside the boundary is byte-identical to HEAD -------------------------------------
  // The Debate-writing route, the DECA route/component and lib/spaced-review.ts were byte-pinned here
  // until M13E1G, which deliberately due-gates the shared ladder and makes the review result elect the
  // due-window winner for BOTH mastery writers. A blanket hash would forbid that approved change
  // rather than protect Debate drills, so it is replaced at 27b-27f by assertions on what matters.
  // M15 S1B-1 — lib/debate-skill-practice.ts is deliberately absent from here onward. Its byte hash
  // was HEAD-RELATIVE and therefore could never notice what a commit changed, and it sat beside a
  // control that is strictly stronger: 27b-C2 below IMPORTS the module and asserts its runtime
  // scoring behaviour — the keyword-salad exploit still returns exactly 96 with a 7-row rubric and a
  // complete formative payload (27b-C2b). That control executes the grader, so it fails on any real
  // change to the scoring logic; the hash only failed on uncommitted bytes. Retiring it removes a
  // duplicate, not a property.
  for (const file of [// lib/deca-drills.ts is deliberately absent from M14 Global G2 Slice 0 onward:
                      // that hash was HEAD-relative, so it passed the moment any DECA expansion
                      // committed. DECA's real IMMUTABLE-based protection lives in
                      // scripts/deca-drills-smoke.ts and is asserted at 28G below.
                      "prisma/seed.ts",                                                             // 31 seed
                      // app/api/debate/drills/session/route.ts is deliberately absent from M13E2 C2a
                      // onward: it now issues a server-authoritative session. A blanket hash would
                      // forbid that approved change rather than protect anything, so what it was
                      // guarding is asserted directly at 27s below.
                      // lib/assignments.ts is deliberately absent from M15 S1A A3b-3 onward — the same
                      // HEAD-RELATIVE flaw already called out for lib/deca-drills.ts above: the hash
                      // failed only while a change was uncommitted and passed again the moment HEAD
                      // advanced onto that same change. A3b-3 relabels the Debate evidence PICKER.
                      // The Debate qualification contract it was standing in for is asserted at 27A.
                      // lib/education/registry.ts is deliberately absent from M15 S1B-1 onward, for
                      // the same reason. What this suite needs from the registry is that the DEBATE
                      // slice is intact; that is retained EXECUTABLY by education-registry-smoke 10a,
                      // which deepEquals the Debate lesson ids in teaching order, alongside 1 and 2b
                      // (exactly seven lessons, exact id set). A registry edit that dropped, renamed
                      // or reordered a Debate lesson fails there; the byte hash would have passed the
                      // moment that edit was committed.
                      ]) {
    assert.equal(nowSha(file), headSha(file), `27-31. ${file} is byte-identical to HEAD`);
  }

  // ---- 27A. what the retired lib/assignments.ts pin protected FOR DEBATE ---------------------------
  // This is the suite that owns Debate evidence, so it carries the full qualification contract: a
  // DEBATE_ROUND / REBUTTAL_PRACTICE submission must still be a JUDGED debate the learner owns, and a
  // rebuttal assignment must still additionally require the PRACTICE_REBUTTAL format. A3b-3 changed
  // only the picker's LABEL, so every one of these must survive it unchanged.
  //
  // These are scoped to EACH FUNCTION, not to the file. `validateEvidence` (which accepts a
  // submission) and `getStudentEvidenceOptions` (which lists selectable rounds) contain the same
  // three gate lines, so a file-wide search passes while one copy is missing — an early draft of
  // these controls did exactly that, and a mutation probe removing the JUDGED gate from the
  // ACCEPTING path survived it. Each block is extracted and asserted separately.
  const assignSrcDeb = read("lib/assignments.ts");
  const debBlock = (fnMarker: string) => {
    const from = assignSrcDeb.indexOf(fnMarker);
    assert.ok(from >= 0, `27A-0. control: located ${fnMarker}`);
    const rest = assignSrcDeb.slice(from);
    const end = rest.indexOf("\nexport async function", 1);
    return end > 0 ? rest.slice(0, end) : rest;
  };
  const validateBlock = debBlock("async function validateEvidence(");
  const pickerBlock = debBlock("export async function getStudentEvidenceOptions(");

  assert.ok(/if \(assignment\.type === "DEBATE_ROUND" \|\| assignment\.type === "REBUTTAL_PRACTICE"\)/.test(validateBlock),
    "27A. Debate evidence is still accepted only through the DEBATE_ROUND / REBUTTAL_PRACTICE branch");
  for (const [where, block, typeVar] of [
    ["accepts a submission", validateBlock, "assignment.type"],
    ["lists selectable rounds", pickerBlock, "assignmentType"]
  ] as const) {
    assert.ok(/status: "JUDGED",/.test(block),
      `27A2. the path that ${where} still requires the debate to be JUDGED`);
    assert.ok(/OR: \[\{ createdById: userId \}, \{ studentId: userId \}, \{ opponentUserId: userId \}\]/.test(block),
      `27A3. the path that ${where} still requires the learner to own or have taken part in it`);
    assert.ok(new RegExp(`${typeVar.replace(".", "\\.")} === "REBUTTAL_PRACTICE" \\? \\{ format: "PRACTICE_REBUTTAL" \\} : \\{\\}`).test(block),
      `27A4. the path that ${where} still additionally requires PRACTICE_REBUTTAL for a rebuttal assignment`);
  }
  assert.ok(/evidenceType: "DEBATE"/.test(validateBlock),
    "27A5. and accepted evidence is recorded as DEBATE evidence");
  // No score has ever gated Debate evidence — A3b-3 must not have introduced one alongside the label.
  assert.ok(!/overallScore: \{/.test(assignSrcDeb) && !/overallScore: \{ gte/.test(assignSrcDeb),
    "27A7. and no ballot-score threshold gates Debate evidence");

  // ---- 28G. what the DECA-bank hash was protecting, asserted durably ---------------------------
  const decaSuite = read("scripts/deca-drills-smoke.ts");
  assert.ok(/PRE_G2_EXPANSION = "26149a3127c0bc7f3108c303f57d41a8dd9088c0"/.test(decaSuite),
    "28G. the DECA bank is protected against an IMMUTABLE commit, not against HEAD");
  assert.ok(/is not yet authorised for expansion/.test(decaSuite),
    "28G2. and its additions are gated on an explicitly authorised area");
  assert.ok(!stripComments(read("lib/deca-drills.ts")).includes("debate-drills"),
    "28G3. and the DECA bank still does not reach into Debate");

  // ---- 27s. what the Debate session-route hash was protecting, asserted exactly -----------------
  const debateSession = stripComments(read("app/api/debate/drills/session/route.ts"));
  assert.ok(/requireUser\(\)/.test(debateSession), "27s. the session route still authenticates");
  assert.ok(/enforceRateLimit\(/.test(debateSession), "27s2. and is still rate-limited");
  assert.ok(/prisma\.\$transaction\(/.test(debateSession), "27s3. issuance happens in one transaction");
  const dsBody = debateSession.slice(debateSession.indexOf("prisma.$transaction"));
  assert.ok(dsBody.indexOf("lockUserRow(tx") >= 0 && dsBody.indexOf("lockUserRow(tx") < dsBody.indexOf("findActiveSession("),
    "27s4. whose FIRST statement is the user row lock, before any session lookup");
  assert.ok(/findActiveSession\(/.test(debateSession), "27s5. an unexpired ISSUED session is reused, not duplicated");
  assert.ok(/buildServedChoices\(/.test(debateSession), "27s6. choices are shuffled and given opaque option ids");
  assert.ok(/correctOptionId/.test(debateSession), "27s7. the correct option is stored server-side");
  assert.ok(/kind: "DRILL"/.test(debateSession) && /requestedCount: order\.length/.test(debateSession),
    "27s8. the padded order is persisted in a versioned snapshot");
  assert.ok(/serializeStart\(/.test(debateSession),
    "27s9. and the response is built by the serializer that withholds the key for unanswered items");
  const dkinds = new Set([...debateSession.matchAll(/"(DEBATE_DRILL|DECA_DRILL|HOSA_MEDTERM|DEBATE_WRITING)"/g)].map((m) => m[1]));
  assert.deepEqual([...dkinds], ["DEBATE_DRILL"], "27s10. it binds exactly DEBATE_DRILL");
  for (const banned of ["XP_REWARDS", "xPLog", "MasteryProgress", "masteryProgress",
                        "recordDrillMastery", "recordPracticeOutcome"]) {
    assert.ok(!debateSession.includes(banned), `27s11. issuance writes no progress at all (${banned})`);
  }
  // The route DOES read the bank's correct answer — it has to, in order to store it. What must never
  // happen is returning it: the only response builder is the serializer that withholds it, and the
  // raw bank question objects are never spread into the payload.
  assert.equal((debateSession.match(/question\.correctAnswer/g) ?? []).length, 1,
    "27s12. the correct answer is read exactly once, to be stored");
  assert.ok(/buildServedChoices\(question\.choices, question\.correctAnswer\)/.test(debateSession),
    "27s13. and that single read feeds the option-id minting, nothing else");
  const dsResponse = debateSession.slice(debateSession.indexOf("NextResponse.json"));
  for (const leak of ["correctAnswer", "correctOptionId", "explanationSnapshot"]) {
    assert.ok(!dsResponse.includes(leak), `27s14. and the response literal carries no ${leak}`);
  }

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
  // 27b. Debate WRITING is FORMATIVE (M15 S1A A1). The keyword-checklist grader still returns full
  // coaching feedback, but the route writes NO authoritative learner evidence: no mastery, no XP, no
  // review-ladder movement, and no PracticeAttempt/QuestionAttempt rows — a COMPLETED attempt with a
  // lessonId is valid LESSON assignment evidence, which formative writing must never mint.
  const writingRoute = stripComments(read("app/api/skills/debate-writing/route.ts"));
  assert.ok(/gradeDebateWritingResponse\(/.test(writingRoute), "27b. Debate writing grading still runs");
  for (const bannedWrite of ["masteryProgress", "MasteryProgress", "xPLog", "XP_REWARDS", "awardXpInTransaction",
                             "recordPracticeOutcome", "txMasteryMayDecrease", "practiceAttempt", "questionAttempt"]) {
    assert.ok(!writingRoute.includes(bannedWrite),
      `27b2. formative writing writes no authoritative evidence (${bannedWrite})`);
  }
  assert.ok(/formative: true/.test(writingRoute), "27b3. and the response declares itself formative");
  // NON-VACUOUS, pinned to the FROZEN G2-closure commit (never HEAD-relative): the pre-A1 route DID
  // write mastery, XP and attempt evidence, so the bans above catch exactly the defect they prevent.
  const PRE_M15_S1A = "338a88df64127c6f995167f84556d0df5a98ff22";
  const writingAtA1Baseline = stripComments(
    execSync(`git show ${PRE_M15_S1A}:app/api/skills/debate-writing/route.ts`, { encoding: "utf8" }));
  assert.ok(/masteryProgress/.test(writingAtA1Baseline) && /xPLog\.create/.test(writingAtA1Baseline) &&
    /awardXpInTransaction\(/.test(writingAtA1Baseline) && /practiceAttempt\.create/.test(writingAtA1Baseline),
    "27b-C1. control: the pre-A1 route really wrote mastery, XP and attempt evidence");
  // 27b-C2. the keyword exploit still maxes the CHECKLIST — coaching value is preserved — but with
  // every persistence token banned above, a 96 now has no write path to mastery, XP or evidence.
  const { gradeDebateWritingResponse: gradeWritingHeuristic } = await import("../lib/debate-skill-practice");
  const keywordSalad =
    "First, we should because since therefore students schools data for example our contention voter judge prefer outweigh matters benefit harm more likely community study impact.";
  const saladFeedback = gradeWritingHeuristic({ slug: "debate-claim-building", level: "BEGINNER", response: keywordSalad });
  assert.equal(saladFeedback.score, 96, "27b-C2. control: the keyword salad still maxes the checklist at 96");
  assert.ok(saladFeedback.rubric.length === 7 && saladFeedback.strengths.length > 0 && saladFeedback.missing.length > 0,
    "27b-C2b. and the formative feedback payload remains complete");
  assert.ok(!/isReviewDue\(/.test(writingRoute), "27c2. and no independent due-check reappeared");
  // M15 S1B Batch I: the ordering comparison alone was vacuous — when the short-circuit
  // anchor is absent indexOf returns -1 and `-1 < n` still holds, so deleting the very
  // short-circuit this control exists to protect turned it green. Both anchors are now
  // proven present before the ordering is accepted.
  const writingStoredIdx = writingRoute.indexOf("parseStoredResult(");
  const writingGraderIdx = writingRoute.indexOf("gradeDebateWritingResponse(");
  assert.ok(writingStoredIdx >= 0 && writingGraderIdx >= 0,
    "27c3-anchors. both the stored-result short-circuit and the grader call are present");
  assert.ok(writingStoredIdx < writingGraderIdx,
    "27c3. a completed session returns its stored result BEFORE the grader — no second mastery write");
  assert.ok(/status: "COMPLETED"/.test(writingRoute) && /resultJson: result/.test(writingRoute),
    "27c4. and completion is stored with the result in the same transaction");
  // C2b: `sessionId` is now REQUIRED on this route — binding the submission to a server-issued
  // session is the milestone. The other bans stand: rate-limit redesign, an evidence floor and a
  // bearer-token scheme all remain out of scope and must not appear.
  for (const banned of ["enforceRateLimit", "REQUIRED_UNIQUE", "reviewToken"]) {
    assert.ok(!writingRoute.includes(banned), `27c4. and no ${banned} was added`);
  }
  assert.ok(/writingSessionSubmitRequestSchema/.test(writingRoute),
    "27c4b. and the request is bound to a server-issued session");
  // 27d. DECA's own evidence contract and floor are untouched by the ladder work.
  const { DECA_DRILL_REQUIRED_UNIQUE } = await import("../lib/deca-drills");
  assert.equal(DECA_DRILL_REQUIRED_UNIQUE, 5, "27d. the DECA evidence floor is still 5");
  const decaRoute = stripComments(read("app/api/deca/drills/submit/route.ts"));
  assert.ok(!decaRoute.includes("reviewScheduled"), "27e. and DECA's unprovable reviewScheduled is gone");
  assert.ok(/recordPracticeOutcomeInTransaction\(/.test(decaRoute) && /recordDrillMasteryInTransaction\(/.test(decaRoute),
    "27e2. DECA persists through the transaction-native cores");
  // 27f. Neither track reaches into the other's evidence helpers.
  for (const [file, foreign] of [["lib/debate-drills.ts", "deca-drills"], ["lib/deca-drills.ts", "debate-drills"]] as const) {
    assert.ok(!stripComments(read(file)).includes(foreign), `27f. ${file} does not import ${foreign}`);
  }


  // ---- 29. what the HOSA byte-pin was protecting, asserted exactly ----------------------------------
  // The HOSA MedTerm submit route was byte-pinned here until M13E1F, which deliberately gives it the
  // same duplicate-resistant evidence gate. A blanket hash would forbid that approved change rather
  // than protect Debate, so it is replaced by assertions on what actually matters.
  const hosaRoute = stripComments(read("app/api/hosa/medterm/submit/route.ts"));
  const hosaLib = stripComments(read("lib/hosa-medterm.ts"));
  // (i) HOSA stays REVIEW-ONLY — no mastery helper, no mastery model, no XP.
  for (const banned of ["recordDrillMastery", "recordDrillMasteryDetailed", "MasteryProgress",
                        "masteryProgress", "masteryLevelFor", "MASTERED",
                        "xpReward", "XPLog", "xpLog", "awardXp", "XP_REWARDS"]) {
    assert.ok(!hosaRoute.includes(banned), `29. the HOSA route stays review-only (no {banned})`);
    assert.ok(!hosaLib.includes(banned), `29b. and so does lib/hosa-medterm.ts (no {banned})`);
  }
  assert.ok(/recordPracticeOutcomeInTransaction\(/.test(hosaRoute),
    "29c. it still uses the review core only");
  for (const masteryPath of ["recordDrillMasteryInTransaction", "recordDrillMasteryDetailed",
                             "recordDrillMastery(", "masteryProgress", "MasteryProgress"]) {
    assert.ok(!hosaRoute.includes(masteryPath), `29c2. and no mastery path at all (${masteryPath})`);
  }
  for (const xp of ["XP_REWARDS", "xPLog", "awardXpInTransaction"]) {
    assert.ok(!hosaRoute.includes(xp), `29c3. and no XP path (${xp})`);
  }
  // M15 S1B Batch I: the ordering comparison alone was vacuous — when the short-circuit
  // anchor is absent indexOf returns -1 and `-1 < n` still holds, so deleting the very
  // short-circuit this control exists to protect turned it green. Both anchors are now
  // proven present before the ordering is accepted.
  const hosaStoredIdx = hosaRoute.indexOf("parseStoredResult(");
  const hosaReviewIdx = hosaRoute.indexOf("recordPracticeOutcomeInTransaction(");
  assert.ok(hosaStoredIdx >= 0 && hosaReviewIdx >= 0,
    "29c4-anchors. both the stored-result short-circuit and the review effect are present");
  assert.ok(hosaStoredIdx < hosaReviewIdx,
    "29c4. a completed retry returns the stored result BEFORE any review effect");
  assert.ok(/recordDrillMasteryInTransaction/.test("await recordDrillMasteryInTransaction(tx, {})"),
    "29c5. control: that mastery scan matches a real call");
  // (ii) No cross-track abstraction: HOSA uses its own helper, and the tracks do not import each other.
  // C2a: HOSA grades from its own persisted session items rather than the live-bank helper. Same
  // shape as deca-mastery:26d — the property that mattered is that no track shares another's
  // abstraction, and that the HOSA ratio semantics survive.
  assert.ok(/HOSA_MEDTERM_REQUIRED_UNIQUE/.test(hosaRoute) && /HOSA_MEDTERM_REQUIRED_AREAS/.test(hosaRoute),
    "29d. HOSA uses its OWN floors");
  for (const foreign of ["debate-drills", "deca-drills", "DRILL_AREAS", "DECA_DRILL_AREAS",
                         "buildDrillEvidence", "buildDecaDrillEvidence"]) {
    assert.ok(!hosaRoute.includes(foreign), `29d2. and reaches into no other track (${foreign})`);
  }
  assert.ok(/const uniqueTotal = answered\.length;/.test(hosaRoute),
    "29d3. its score counts persisted distinct answered items");
  assert.ok(/item\.isCorrect/.test(hosaRoute), "29d4. using their STORED correctness");
  assert.ok(/uniqueCorrect \* 100 >= MEDTERM_PASS_THRESHOLD \* uniqueTotal/.test(hosaRoute),
    "29d5. and the exact-ratio HOSA semantics are preserved");
  assert.ok(/scorePercent: evidenceScore/.test(hosaRoute) && /passed,\n/.test(hosaRoute),
    "29d6. review receives the evidence-derived score and pass result");
  for (const foreign of ["@/lib/deca-drills", "@/lib/debate-drills", "buildDecaDrillEvidence", "buildDrillEvidence"]) {
    assert.ok(!hosaRoute.includes(foreign), `29e. the HOSA route imports no {foreign}`);
    assert.ok(!hosaLib.includes(foreign), `29e2. nor does lib/hosa-medterm.ts`);
  }
  for (const [file, foreign] of [["lib/deca-drills.ts", "hosa-medterm"], ["lib/debate-drills.ts", "hosa-medterm"]] as const) {
    assert.ok(!stripComments(read(file)).includes(foreign), `29f. ${file} does not import HOSA evidence helpers`);
  }
  // (iii) The unprovable review claim is gone, and no mastery system was introduced.
  assert.ok(!hosaRoute.includes("reviewScheduled"), "29g. the HOSA route no longer claims reviewScheduled");
  // (iv) The HOSA session route and the question bank itself are untouched.
  // C2a: the HOSA session route now issues a server-authoritative session, so a blanket hash would
  // forbid an approved change rather than protect anything. Replaced by what it was guarding.
  const hosaSession = stripComments(read("app/api/hosa/medterm/session/route.ts"));
  assert.ok(/requireUser\(\)/.test(hosaSession), "29h. the HOSA session route still authenticates");
  assert.ok(/enforceRateLimit\(/.test(hosaSession), "29h2. and its rate limiting is preserved");
  const hs = hosaSession.slice(hosaSession.indexOf("prisma.$transaction"));
  assert.ok(hs.indexOf("lockUserRow(tx") >= 0 && hs.indexOf("lockUserRow(tx") < hs.indexOf("findActiveSession("),
    "29h3. the user row lock is its first statement, before any lifecycle query");
  const hk = new Set([...hosaSession.matchAll(/"(DEBATE_DRILL|DECA_DRILL|HOSA_MEDTERM|DEBATE_WRITING)"/g)].map((m) => m[1]));
  assert.deepEqual([...hk], ["HOSA_MEDTERM"], "29h4. it binds exactly HOSA_MEDTERM");
  assert.ok(/findActiveSession\(/.test(hosaSession), "29h5. an unexpired ISSUED session is reused");
  assert.ok(/buildServedChoices\(/.test(hosaSession) && /correctOptionId/.test(hosaSession),
    "29h6. choices are shuffled with opaque ids and the correct option is stored server-side");
  assert.ok(/requestedCount: order\.length/.test(hosaSession), "29h7. the padded order is persisted");
  assert.ok(/mode: spec \? "official" : "generic"/.test(hosaSession), "29h8. official/generic labelling is preserved");
  const hsResp = hosaSession.slice(hosaSession.indexOf("NextResponse.json"));
  for (const leak of ["correctAnswer", "correctOptionId", "explanationSnapshot"]) {
    assert.ok(!hsResp.includes(leak), `29h9. the response literal reveals no ${leak}`);
  }
  for (const banned of ["XP_REWARDS", "xPLog", "MasteryProgress", "recordDrillMastery", "recordPracticeOutcome"]) {
    assert.ok(!hosaSession.includes(banned), `29h10. issuance writes no mastery and no XP (${banned})`);
  }
  assert.ok('{ correctAnswer: q.correctAnswer }'.includes("correctAnswer"),
    "29h11. control: the leak scan matches an answer-key field in a response literal");
  const hosaBank = await import("../lib/hosa-medterm");
  assert.equal(hosaBank.MEDTERM_BANK.length, 180, "29i. the HOSA bank holds 180 questions (M14 Phase 2a-2f took all six HOSA areas to 30 each; Debate and DECA banks are untouched and still 9 per area)");
  assert.equal(new Set(hosaBank.MEDTERM_BANK.map((q) => q.id)).size, 180, "29j. with unique ids");

  // ---- 29k. PER-AREA DEPTH, which audit G2 explicitly asks the mastery smokes to assert ----------
  // Reads the module-scope DEBATE_AREA_DEPTH declared above, so the precondition block (24) and this
  // block cannot disagree about how deep an area is.
  for (const [area, depth] of Object.entries(DEBATE_AREA_DEPTH)) {
    assert.equal(DRILL_BANK.filter((q) => q.area === area).length, depth,
      `29k. Debate area ${area} holds exactly ${depth} questions`);
  }
  assert.equal(DRILL_BANK.length, Object.values(DEBATE_AREA_DEPTH).reduce((a, b) => a + b, 0),
    "29k2. and the Debate bank total is exactly the sum of its declared per-area depths");
  assert.equal(new Set(DRILL_BANK.map((q) => q.id)).size, DRILL_BANK.length, "29k3. with unique ids");
  // Non-vacuous: the per-area assertion really discriminates — no two areas share a pool.
  control("every Debate question belongs to exactly one declared area",
    DRILL_BANK.every((q) => q.area in DEBATE_AREA_DEPTH));
  assert.equal(hosaBank.MEDTERM_AREAS.length, 6, "29k. across six areas");

  // ---- 32. no database contact ------------------------------------------------------------------------------
  for (const file of ["lib/debate-drills.ts", "components/training/debate-drills.tsx"]) {
    const code = stripComments(read(file));
    for (const banned of ["@/lib/prisma", "PrismaClient", "prisma."]) {
      assert.ok(!code.includes(banned), `32b. ${file} performs no ${banned}`);
    }
  }
  // The boolean contract, run for real against the stub.
  resetStub("found");
  assert.equal(await recordDrillMastery({ userId: "u", skillSlug: "debate-rebuttal", scorePercent: 80, passed: true }), true,
    "32c. a successful write returns true");
  assert.equal(stub.calls.find((c) => c.op === "masteryProgress.create")?.data.masteryPercent, 80,
    "32d. and the EVIDENCE score is what was written");
  resetStub("write-throws");
  assert.equal(await recordDrillMastery({ userId: "u", skillSlug: "debate-rebuttal", scorePercent: 80, passed: true }), false,
    "32e. a failed write returns false -> not-saved");
  // 32f. The boolean export still exists and is still boolean — that is the guarantee the route's
  // switch to the detailed form must not cost any other caller.
  const spacedReviewSrc = stripComments(read("lib/spaced-review.ts"));
  assert.ok(/export async function recordDrillMastery\(/.test(spacedReviewSrc), "32f. the boolean export survives");
  assert.ok(/Promise<boolean>/.test(spacedReviewSrc), "32f2. and still returns a boolean");
  assert.ok(/outcome\.status === "updated"/.test(spacedReviewSrc),
    "32f3. true ONLY for an actual mastery write — a deliberate no-op returns false");
  resetStub("found");

  // ---- 33. the pre-fix defect, proven from the EXPLICIT parent commit ----------------------------------------
  // PINNED, never `HEAD`: once this milestone commits, HEAD is the commit that REMOVED the defect.
  const before = execSync(`git show ${PRE_M13E1E}:app/api/debate/drills/submit/route.ts`, { encoding: "utf8" });
  assert.ok(/scorePercent: skill\.scorePercent/.test(before) && /passed: skill\.passed/.test(before),
    `33. at ${PRE_M13E1E.slice(0, 8)} the route passed the RAW duplicate-weighted score straight to persistence`);
  assert.ok(!/buildDrillEvidence|REQUIRED_UNIQUE/.test(before),
    "33b. and had no evidence set or floor of any kind");
  const beforeUi = execSync(`git show ${PRE_M13E1E}:components/training/debate-drills.tsx`, { encoding: "utf8" });
  assert.ok(/Scores are real: each skill above updates your mastery/.test(beforeUi),
    "33c. and the UI asserted every score updated mastery");
  // The defect itself, reproduced against the CURRENT grader (the raw path is deliberately unchanged).
  const oneRaw = gradeDrillAnswers([{ id: CWI[0].id, selected: right(CWI[0]) }]).perSkill[0];
  control(`the pre-fix contract wrote ${oneRaw.scorePercent}% (>=85 = MASTERED) from ONE correct question`,
    oneRaw.scorePercent === 100 && oneRaw.passed === true);

  // BUILDER DEPTH, split from the evidence contract above. Slice 1 took rebuttal to 30, so the UI's
  // own 20-question focused session no longer pads — that is exactly the effect audit G2 asked for.
  // The padding BRANCH is proven separately above the pool, so this coverage was re-based, not lost.
  const focused20 = buildDrillSession(20, ["rebuttal"]);
  control("the UI's own 20-question focused rebuttal session now serves 20 DISTINCT items — no padding",
    focused20.length === 20 && new Set(focused20.map((q) => q.id)).size === 20);
  const OVERDRAW = 40; // > pool enters the repeat branch; < 2x pool makes the while loop append exactly once
  const overdrawn = buildDrillSession(OVERDRAW, ["rebuttal"]);
  // B2.2 RE-BASE (2026-08-26): 28 -> 29. This control measures ONE CONSTRUCTED SESSION, so it pins
  // session capacity, not eligibility. All 30 rebuttal items are individually servable after the
  // B2.2 release — nothing is held in this area — but rb-14 and rb-15 are measurement-dependent and
  // never co-serve, so any single session tops out at 29 distinct. Do not "correct" this to 30: that
  // would require co-serving the pair and would break the contamination control. (This file
  // deliberately imports neither the hold list nor the exclusive groups, so the number is stated
  // literally here; the derived two-number proof lives in scripts/debate-drills-smoke.ts B1-3/B1-5.)
  control("and the padding branch still exists above the pool: 40 served over exactly 29 distinct (one measurement-dependent sibling is excluded per session)",
    overdrawn.length === OVERDRAW && new Set(overdrawn.map((q) => q.id)).size === 29);
  // Slice 2: the same G2 depth proof for claim-warrant-impact, kept in the mastery smoke because the
  // audit's Verification line names these suites. Builder-level and read-only — no mastery record is
  // created or altered, and no evidenceScore fixture is fabricated for CWI.
  const cwiFocused20 = buildDrillSession(20, ["claim-warrant-impact"]);
  control("a 20-question focused CWI session now serves 20 DISTINCT items — no padding",
    cwiFocused20.length === 20 && new Set(cwiFocused20.map((q) => q.id)).size === 20);
  const cwiOverdrawn = buildDrillSession(OVERDRAW, ["claim-warrant-impact"]);
  control("and CWI still pads above its pool: 40 served over exactly 30 distinct",
    cwiOverdrawn.length === OVERDRAW && new Set(cwiOverdrawn.map((q) => q.id)).size === 30);
  // Slice 3: the same G2 depth proof for evidence-evaluation. Builder-level and read-only — no
  // mastery record is created or altered, and no evidenceScore fixture is fabricated for evidence.
  const evFocused20 = buildDrillSession(20, ["evidence-evaluation"]);
  control("a 20-question focused evidence session now serves 20 DISTINCT items — no padding",
    evFocused20.length === 20 && new Set(evFocused20.map((q) => q.id)).size === 20);
  const evOverdrawn = buildDrillSession(OVERDRAW, ["evidence-evaluation"]);
  control("and evidence-evaluation still pads above its pool: 40 served over exactly 30 distinct",
    evOverdrawn.length === OVERDRAW && new Set(evOverdrawn.map((q) => q.id)).size === 30);
  // Slice 4: the same G2 depth proof for weighing, the last Debate area to reach 30. Builder-level
  // and read-only — no mastery record is created or altered, and no evidenceScore fixture is
  // fabricated for weighing (none ever depended on its 9-item pool).
  const wgFocused20 = buildDrillSession(20, ["weighing"]);
  control("a 20-question focused weighing session now serves 20 DISTINCT items — no padding",
    wgFocused20.length === 20 && new Set(wgFocused20.map((q) => q.id)).size === 20);
  const wgOverdrawn = buildDrillSession(OVERDRAW, ["weighing"]);
  // B2.3 RELEASE: wg-08 was released after the debate-weighing lesson taught the weighing-standard
  // mechanism it measures, so the weighing SERVED pool is the full 30 and equals the bank depth.
  control("and weighing still pads above its pool: 40 served over exactly 30 distinct (nothing in weighing is held)",
    wgOverdrawn.length === OVERDRAW && new Set(wgOverdrawn.map((q) => q.id)).size === 30);

  // ---- Repeat-branch non-vacuity, RE-BASED at Slice 4 -------------------------------------------
  // This control used to name a still-9-item area and prove 20/9 and 40/9. NO Debate area holds 9
  // any more, so it could not move a fourth time: it is RE-BASED onto a request that EXCEEDS a full
  // 30-item pool, exactly as HOSA's 11g did at Phase 2f. buildDrillSession seeds `result` with the
  // ENTIRE shuffled pool before appending any repeat, so the distinct count is deterministic rather
  // than probabilistic. This is now the ONLY proof the repeat branch survives. Do NOT delete it, and
  // do NOT describe weighing as shallow or still-9-item — it is 30 deep.
  // B2.3 RELEASE: the served weighing pool is the full 30 now that wg-08 is released, so served
  // depth and bank depth coincide again; the repeat-branch arithmetic runs against the served pool.
  const WG_DEPTH = DEBATE_AREA_DEPTH.weighing;
  const WG_SERVED = 30;
  control("the re-base runs against a real 30-item bank area and a request that genuinely exceeds the 30-item served pool",
    WG_DEPTH === 30 && OVERDRAW > WG_SERVED);
  // Derived, never a magic number: the repeat count is whatever the OVERDRAW request exceeds the
  // served pool by. WG_SERVED comes from the bank depth and the (now empty) hold set, and the left
  // side is measured from the ACTUAL generated result, so the two sides are independent. Pinning a
  // literal here is what went stale when wg-08 was held, and again when it was released.
  const measuredRepeatedPositions = OVERDRAW - new Set(wgOverdrawn.map((q) => q.id)).size;
  control(`40 served over exactly ${WG_SERVED} distinct means exactly ${OVERDRAW - WG_SERVED} repeated positions — duplicates necessarily exist`,
    measuredRepeatedPositions === OVERDRAW - WG_SERVED);
  // Boundary partner: at EXACTLY served-pool size there is no padding, so the overdraw proof
  // distinguishes "the repeat branch ran" from "the builder always repeats".
  const wgExact = buildDrillSession(WG_SERVED, ["weighing"]);
  control(`and a request of exactly ${WG_SERVED} serves ${WG_SERVED} over ${WG_SERVED} distinct — the padding branch activates ONLY above the served pool`,
    wgExact.length === WG_SERVED && new Set(wgExact.map((q) => q.id)).size === WG_SERVED);

  console.log(
    `Debate-mastery smoke passed: General Debate drill progress is now scored from a duplicate-resistant evidence set — first answer per distinct valid question id, attributed to the question's own bank area — and needs ${DEBATE_DRILL_REQUIRED_UNIQUE} distinct questions before anything is written. All three live fake-mastery paths are closed: one correct question scored 100%/MASTERED and now records nothing; the duplicate bypass scored 76% and now scores 20%; and the honest six-of-nine learner whom the drill's OWN padding pushed to 85%/MASTERED now scores exactly 67 and does not pass (that fixture is pinned to the legacy nine rb-01..rb-09, so it survives the bank growing). Four distinct all-correct questions still record nothing. Repeats, conflicting resubmits and unknown ids cannot raise evidence, and below the floor the persistence helper is not called at all, so no mastery, no review and no due-review knock-down can follow. The boolean recordDrillMastery contract is unchanged and lib/spaced-review.ts is untouched; a false result renders as "Progress not saved", never as an unseeded skill, and nothing claims a review was scheduled. ${controlsRun.length} controls each demonstrated the failure they exist to demonstrate.`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
