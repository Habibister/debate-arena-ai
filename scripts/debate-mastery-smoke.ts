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
import { SEEDED_SKILL_SLUGS, compatTrackForSlug, resolveSkillsSlug } from "../lib/education/skills-compat";

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
  assert.equal(DRILL_AREAS.length, 4, "exactly four Debate concept-drill areas");
  assert.equal(DEBATE_DRILL_REQUIRED_UNIQUE, 5, "the evidence floor is five distinct questions");
  assert.equal(DRILL_PASS_THRESHOLD, 70, "the threshold is unchanged at 70%");
  for (const area of DRILL_AREAS) {
    const pool = DRILL_BANK.filter((q) => q.area === area.id);
    assert.equal(pool.length, 9, `24. area ${area.id} has exactly nine distinct questions`);
    assert.ok(pool.length >= DEBATE_DRILL_REQUIRED_UNIQUE, `24b. and can therefore reach the floor`);
    assert.ok(SEEDED_SKILL_SLUGS.includes(area.skillSlug), `24c. "${area.skillSlug}" is seeded, so writes land`);
    // Two of the four are allowlisted canonical redirects to authored Debate lessons (M13E1C), so
    // they resolve to a lesson rather than a compatibility page. Either way, the invariant that
    // matters is the same: no Debate drill skill may ever resolve into DECA or HOSA territory.
    const resolution = resolveSkillsSlug(area.skillSlug);
    const track = compatTrackForSlug(area.skillSlug);
    assert.ok(track === "DEBATE" || track === null, `25. "${area.skillSlug}" never resolves to DECA or HOSA (got ${track})`);
    assert.notEqual(track, "DECA", `25b. "${area.skillSlug}" is not DECA`);
    assert.notEqual(track, "HOSA", `25c. "${area.skillSlug}" is not HOSA`);
    if (resolution.kind === "canonical-redirect") {
      assert.ok(["claim-warrant-impact", "debate-refutation"].includes(resolution.lessonId),
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
  const padded: DrillAnswer[] = REB.map((q, i) => ({ id: q.id, selected: i < 6 ? right(q) : wrongFor(q) }));
  while (padded.length < 20) { const q = REB[padded.length % 9]; padded.push({ id: q.id, selected: right(q) }); }
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
  const morePadding = [...padded, ...REB.map((q) => ({ id: q.id, selected: right(q) }))];
  control("adding nine more correct repeats leaves the evidence score at 67",
    evidenceFor(morePadding, "rebuttal").evidenceScore === 67);

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
  assert.ok(routeSrc.indexOf("recordPracticeOutcomeInTransaction(") < routeSrc.indexOf("recordDrillMasteryInTransaction("),
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
  for (const file of ["lib/debate-skill-practice.ts",                                              // 27 Debate writing grading
                      // lib/deca-drills.ts is deliberately absent from M14 Global G2 Slice 0 onward:
                      // that hash was HEAD-relative, so it passed the moment any DECA expansion
                      // committed. DECA's real IMMUTABLE-based protection lives in
                      // scripts/deca-drills-smoke.ts and is asserted at 28G below.
                      "prisma/seed.ts",                                                             // 31 seed
                      // app/api/debate/drills/session/route.ts is deliberately absent from M13E2 C2a
                      // onward: it now issues a server-authoritative session. A blanket hash would
                      // forbid that approved change rather than protect anything, so what it was
                      // guarding is asserted directly at 27s below.
                      "lib/education/registry.ts", "lib/assignments.ts"]) {
    assert.equal(nowSha(file), headSha(file), `27-31. ${file} is byte-identical to HEAD`);
  }

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
  // 27b. Debate WRITING keeps its grading, threshold, response shape and XP; only the ORDER changed.
  const writingRoute = stripComments(read("app/api/skills/debate-writing/route.ts"));
  assert.ok(/gradeDebateWritingResponse\(/.test(writingRoute), "27b. Debate writing grading is unchanged");
  assert.ok(/feedback\.score >= 70/.test(writingRoute), "27b2. and its threshold");
  assert.ok(/XP_REWARDS\.lessonCompleted/.test(writingRoute) && /xPLog\.create/.test(writingRoute),
    "27b3. XP is still awarded exactly as before");
  // C2b: writing is session-backed, so review, mastery and XP all run inside ONE transaction whose
  // first statement is the user row lock. That subsumes the M13E1G winner-only construct with a
  // stronger guarantee — a second concurrent submission cannot reach mastery at all, because it
  // blocks on the lock and then finds the session COMPLETED.
  assert.ok(writingRoute.indexOf("lockUserRow(tx") < writingRoute.indexOf("recordPracticeOutcomeInTransaction("),
    "27c. with the user row locked BEFORE any review/mastery/XP work, so one due window has one winner");
  assert.ok(!/isReviewDue\(/.test(writingRoute), "27c2. and the stale independent due-check is gone");
  assert.ok(writingRoute.indexOf("parseStoredResult(") < writingRoute.indexOf("gradeDebateWritingResponse("),
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
  assert.ok(hosaRoute.indexOf("parseStoredResult(") < hosaRoute.indexOf("recordPracticeOutcomeInTransaction("),
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
  // AREA_DEPTH is the single source of truth. Each Global-G2 slice raises exactly ONE entry 9 -> 30,
  // so one area can evolve without weakening the assertion on any other.
  const DEBATE_AREA_DEPTH: Record<string, number> = {
    "claim-warrant-impact": 9,
    "rebuttal": 9,
    "evidence-evaluation": 9,
    "weighing": 9
  };
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

  // Padding is real and unchanged — the session builder still serves repeats above the pool.
  const padded20 = buildDrillSession(20, ["rebuttal"]);
  control("the UI's own 20-question focused session still serves 11 repeats of a 9-item pool",
    padded20.length === 20 && new Set(padded20.map((q) => q.id)).size === 9);

  console.log(
    `Debate-mastery smoke passed: General Debate drill progress is now scored from a duplicate-resistant evidence set — first answer per distinct valid question id, attributed to the question's own bank area — and needs ${DEBATE_DRILL_REQUIRED_UNIQUE} distinct questions before anything is written. All three live fake-mastery paths are closed: one correct question scored 100%/MASTERED and now records nothing; the duplicate bypass scored 76% and now scores 20%; and the honest six-of-nine learner whom the drill's OWN padding pushed to 85%/MASTERED now scores exactly 67 and does not pass. Four distinct all-correct questions still record nothing. Repeats, conflicting resubmits and unknown ids cannot raise evidence, and below the floor the persistence helper is not called at all, so no mastery, no review and no due-review knock-down can follow. The boolean recordDrillMastery contract is unchanged and lib/spaced-review.ts is untouched; a false result renders as "Progress not saved", never as an unseeded skill, and nothing claims a review was scheduled. ${controlsRun.length} controls each demonstrated the failure they exist to demonstrate.`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
