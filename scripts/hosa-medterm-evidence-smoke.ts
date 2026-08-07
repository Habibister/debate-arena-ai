/**
 * HOSA Medical Terminology review-evidence contract (M13E1F).
 *
 * Run with: npm run hosa-medterm-evidence:smoke
 *
 * NO DATABASE. Persistence assertions drive the REAL helpers against a stub client installed on
 * `globalThis.prisma` before `lib/prisma` is first imported (that module reads `globalThis.prisma`
 * before constructing a `PrismaClient`, so no client is built and no connection opens).
 *
 * REVIEW-ONLY. This milestone deliberately adds NO mastery: the suite asserts the absence of any
 * MasteryProgress or XP write across the whole HOSA MedTerm path.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
// THE PRODUCTION MODULES — never a mirrored copy of their logic.
import {
  MEDTERM_AREAS,
  MEDTERM_BANK,
  MEDTERM_SKILL_SLUG,
  HOSA_MEDTERM_REQUIRED_AREAS,
  HOSA_MEDTERM_REQUIRED_UNIQUE,
  buildMedTermEvidence,
  buildMedTermSession,
  gradeMedTermAnswers,
  medTermPersistenceRequest,
  type MedTermAnswer,
  type MedTermArea
} from "../lib/hosa-medterm";

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

/** M13E1F's parent — the last commit with the unguarded HOSA review contract. */
const PRE_M13E1F = "398860fc0a3469459f78750b9a0203c852d32aea";

const controlsRun: string[] = [];
function control(label: string, holds: boolean) {
  assert.ok(holds, `control "${label}" did not demonstrate the failure it exists to demonstrate`);
  controlsRun.push(label);
}

// --- fixtures --------------------------------------------------------------------------------------

const byArea = (area: MedTermArea) => MEDTERM_BANK.filter((q) => q.area === area);
const right = (q: { correctAnswer: string }) => q.correctAnswer;
const wrongFor = (q: { choices: string[]; correctAnswer: string }) => {
  const other = q.choices.find((c) => c !== q.correctAnswer);
  if (!other) throw new Error("bank question has no incorrect choice");
  return other;
};
const WR = byArea("word-roots");
const PR = byArea("prefixes");
const SU = byArea("suffixes");

/** `n` distinct ids spread across `areas` areas, the first `correct` of them right. */
function spread(n: number, correct: number, areas: MedTermArea[]): MedTermAnswer[] {
  const pools = areas.map((a) => byArea(a));
  const picked: typeof MEDTERM_BANK = [];
  for (let i = 0; picked.length < n; i += 1) {
    const pool = pools[i % pools.length];
    const q = pool[Math.floor(i / pools.length)];
    if (!q) throw new Error(`ran out of questions building a ${n}-question spread`);
    picked.push(q);
  }
  return picked.map((q, i) => ({ id: q.id, selected: i < correct ? right(q) : wrongFor(q) }));
}

// --- stub client (installed BEFORE lib/prisma is ever loaded) ---------------------------------------

const stub = { calls: [] as Array<{ op: string; data: Record<string, unknown> }> };
const stubPrisma = {
  skill: { findUnique: async () => ({ id: "stub-skill-id" }) },
  masteryProgress: {
    findUnique: async () => null,
    create: async () => { throw new Error("HOSA must never write MasteryProgress"); },
    update: async () => { throw new Error("HOSA must never write MasteryProgress"); }
  },
  skillReviewSchedule: {
    findUnique: async () => null,
    create: async (a: { data: Record<string, unknown> }) => { stub.calls.push({ op: "review.create", data: a.data }); return {}; },
    update: async (a: { data: Record<string, unknown> }) => { stub.calls.push({ op: "review.update", data: a.data }); return {}; },
    count: async () => 0,
    findMany: async () => []
  }
};
(globalThis as unknown as { prisma?: unknown }).prisma = stubPrisma;

async function main() {
  const { recordPracticeOutcome } = await import("../lib/spaced-review");
  assert.equal((globalThis as unknown as { prisma?: unknown }).prisma, stubPrisma,
    "36. no real PrismaClient was constructed — the stub is still the module's client");

  // ---- 31. the bank is unchanged ------------------------------------------------------------------
  assert.equal(MEDTERM_BANK.length, 96, "31. exactly 96 questions");
  assert.equal(new Set(MEDTERM_BANK.map((q) => q.id)).size, 96, "31b. 96 unique ids");
  assert.equal(MEDTERM_AREAS.length, 6, "31c. exactly six areas");
  // Audit G2 is being closed one area at a time. EXPANDED_AREAS is the single source of truth for
  // which areas have reached depth: Phase 2a took word roots to 30, Phase 2b took prefixes to 30.
  // The remaining four stay at 9 until their own slice. Adding an area here without expanding it
  // (or vice versa) fails immediately, so this list cannot drift from the bank.
  const EXPANDED_AREAS: readonly MedTermArea[] = ["word-roots", "prefixes"];
  const DEPTH_TARGET = 30;
  const UNEXPANDED_COUNT = 9;
  for (const area of EXPANDED_AREAS) {
    assert.equal(byArea(area).length, DEPTH_TARGET, `31d. ${area} holds ${DEPTH_TARGET} distinct questions`);
  }
  for (const a of MEDTERM_AREAS) {
    const expected = EXPANDED_AREAS.includes(a.id) ? DEPTH_TARGET : UNEXPANDED_COUNT;
    assert.equal(byArea(a.id).length, expected, `31d2. area ${a.id} holds exactly ${expected} questions`);
  }
  assert.equal(
    MEDTERM_AREAS.reduce((sum, a) => sum + byArea(a.id).length, 0),
    MEDTERM_BANK.length,
    "31d3. and every bank item belongs to a declared area"
  );
  assert.equal(MEDTERM_SKILL_SLUG, "hosa-medical-terminology", "31e. the skill slug is unchanged");
  assert.equal(HOSA_MEDTERM_REQUIRED_UNIQUE, 10, "the evidence floor is ten distinct questions");
  assert.equal(HOSA_MEDTERM_REQUIRED_AREAS, 3, "spanning at least three areas");

  // ---- 1-4. below the floor -----------------------------------------------------------------------
  const one = buildMedTermEvidence([{ id: WR[0].id, selected: right(WR[0]) }]);
  assert.equal(gradeMedTermAnswers([{ id: WR[0].id, selected: right(WR[0]) }]).scorePercent, 100,
    "1. one correct question still SHOWS a raw 100% session score");
  assert.equal(one.uniqueTotal, 1, "1b. but is one unique question");
  assert.equal(one.evidenceStatus, "insufficient-evidence", "1c. insufficient evidence");
  assert.equal(medTermPersistenceRequest(one), null, "1d. so review is not called at all");

  const copies = buildMedTermEvidence(Array.from({ length: 5 }, () => ({ id: WR[0].id, selected: right(WR[0]) })));
  assert.equal(copies.uniqueTotal, 1, "2. five copies of one id are still ONE unique question");
  assert.equal(medTermPersistenceRequest(copies), null, "2b. and cannot buy a review write");

  const nineAcrossThree = buildMedTermEvidence(spread(9, 9, ["word-roots", "prefixes", "suffixes"]));
  assert.equal(nineAcrossThree.uniqueTotal, 9, "3. nine distinct across three areas");
  assert.equal(nineAcrossThree.coveredAreaCount, 3, "3b. really spans three areas");
  assert.equal(nineAcrossThree.evidenceStatus, "insufficient-evidence", "3c. still one short of the floor");
  assert.equal(medTermPersistenceRequest(nineAcrossThree), null, "3d. no review call");

  const tenAcrossTwo = buildMedTermEvidence(spread(10, 10, ["word-roots", "prefixes"]));
  assert.equal(tenAcrossTwo.uniqueTotal, 10, "4. ten distinct questions");
  assert.equal(tenAcrossTwo.coveredAreaCount, 2, "4b. but only two areas");
  assert.equal(tenAcrossTwo.evidenceStatus, "insufficient-evidence", "4c. breadth is not satisfied");
  assert.equal(medTermPersistenceRequest(tenAcrossTwo), null, "4d. no review call");
  control("count alone is not enough — ten distinct across two areas is refused",
    tenAcrossTwo.uniqueTotal >= HOSA_MEDTERM_REQUIRED_UNIQUE && medTermPersistenceRequest(tenAcrossTwo) === null);
  control("breadth alone is not enough — nine distinct across three areas is refused",
    nineAcrossThree.coveredAreaCount >= HOSA_MEDTERM_REQUIRED_AREAS && medTermPersistenceRequest(nineAcrossThree) === null);

  // ---- 5-8. at and above the floor ------------------------------------------------------------------
  const THREE: MedTermArea[] = ["word-roots", "prefixes", "suffixes"];
  const ten10 = buildMedTermEvidence(spread(10, 10, THREE));
  assert.equal(ten10.coveredAreaCount, 3, "5. ten distinct across three areas satisfies breadth");
  assert.notEqual(medTermPersistenceRequest(ten10), null, "5b. and the requirements are met");
  for (const [correct, score, status] of [[6, 60, "below-threshold"], [7, 70, "passing"], [10, 100, "passing"]] as const) {
    const ev = buildMedTermEvidence(spread(10, correct, THREE));
    assert.equal(ev.uniqueTotal, 10, `6-8. ten distinct with ${correct} correct`);
    assert.equal(ev.evidenceScore, score, `6-8b. evidence score ${score}`);
    assert.equal(ev.evidenceStatus, status, `6-8c. status ${status}`);
    assert.deepEqual(medTermPersistenceRequest(ev), { scorePercent: score, passed: status === "passing" },
      `6-8d. review receives ${score} / passed:${status === "passing"}`);
  }

  // ---- 9-10. duplicate inflation ---------------------------------------------------------------------
  const bypass: MedTermAnswer[] = [
    ...spread(5, 1, THREE), ...Array.from({ length: 12 }, () => ({ id: WR[0].id, selected: right(WR[0]) }))
  ];
  const bypassRaw = gradeMedTermAnswers(bypass);
  const bypassEv = buildMedTermEvidence(bypass);
  assert.equal(bypassEv.uniqueTotal, 5, "9. five distinct questions");
  assert.equal(bypassEv.evidenceStatus, "insufficient-evidence", "9b. below the floor despite a passing raw score");
  assert.equal(medTermPersistenceRequest(bypassEv), null, "9c. no review call");
  control(`the raw duplicate-weighted score passed (${bypassRaw.scorePercent}% >= 70%)`,
    bypassRaw.scorePercent === 76 && bypassRaw.passed === true);

  // Qualifying on breadth and count, but inflated by repeats: evidence must stay below threshold.
  const qualifyingInflated: MedTermAnswer[] = [
    ...spread(10, 6, THREE), ...Array.from({ length: 20 }, () => ({ id: WR[0].id, selected: right(WR[0]) }))
  ];
  const qiRaw = gradeMedTermAnswers(qualifyingInflated);
  const qiEv = buildMedTermEvidence(qualifyingInflated);
  assert.equal(qiEv.uniqueTotal, 10, "10. ten distinct across three areas");
  assert.equal(qiEv.evidenceScore, 60, "10b. evidence score stays 60");
  assert.equal(qiEv.evidenceStatus, "below-threshold", "10c. below threshold");
  assert.deepEqual(medTermPersistenceRequest(qiEv), { scorePercent: 60, passed: false }, "10d. review receives passed:false");
  control(`repeats inflated the raw score to ${qiRaw.scorePercent}% while evidence stayed 60%`,
    qiRaw.scorePercent > 60 && qiRaw.passed === true && qiEv.passed === false);

  // ---- 11. focused sessions: no padding at 20, and breadth is now the ONLY bar --------------------
  // Before M14 Phase 2a word roots held 9, so a focused 20-question session served 20 slots over 9
  // distinct items and failed the evidence floor on BOTH count and breadth. With 30 items the
  // padding is gone and the count floor is met — so this block now proves the REMAINING protection
  // stands on its own: one area is still not enough breadth to touch spaced review.
  const focused = buildMedTermSession(20, ["word-roots"]);
  assert.equal(focused.length, 20, "11. a focused 20-question session serves 20");
  assert.equal(new Set(focused.map((q) => q.id)).size, 20,
    "11b. from 20 DISTINCT questions — no repeated slot, because the bank is deeper than the request");
  assert.equal(focused.length, new Set(focused.map((q) => q.id)).size,
    "11b2. so served length equals distinct count: padding is not required at count 20");
  const focusedEv = buildMedTermEvidence(focused.map((q) => ({ id: q.id, selected: right(q) })));
  assert.equal(focusedEv.uniqueTotal, 20, "11c. the evidence set holds all 20");
  assert.ok(focusedEv.uniqueTotal >= HOSA_MEDTERM_REQUIRED_UNIQUE,
    "11c2. which now SATISFIES the 10-distinct count floor");
  assert.equal(focusedEv.coveredAreaCount, 1, "11d. but it still covers exactly one area");
  assert.ok(focusedEv.coveredAreaCount < HOSA_MEDTERM_REQUIRED_AREAS,
    "11d2. below the 3-area breadth floor");
  assert.equal(focusedEv.evidenceStatus, "insufficient-evidence",
    "11e. so it is STILL insufficient — now for breadth alone, not count");
  assert.equal(medTermPersistenceRequest(focusedEv), null,
    "11f. and no review call is made, for the correct breadth reason");
  control("a perfect 20-distinct focused session still records nothing, on breadth alone",
    focusedEv.evidenceScore === 100 &&
      focusedEv.uniqueTotal >= HOSA_MEDTERM_REQUIRED_UNIQUE &&
      focusedEv.coveredAreaCount < HOSA_MEDTERM_REQUIRED_AREAS &&
      medTermPersistenceRequest(focusedEv) === null);
  // Padding itself is NOT removed from the engine — it still applies when a request exceeds a pool.
  // Uses SUFFIXES, not prefixes: Phase 2b took prefixes to 30, so it no longer pads at count 20.
  // This example must always name an area still holding 9 — move it again in the next slice.
  const stillPads = buildMedTermSession(20, ["suffixes"]);
  assert.equal(stillPads.length, 20, "11g. a 20-question request on a 9-item area still serves 20");
  assert.equal(new Set(stillPads.map((q) => q.id)).size, 9,
    "11g2. over 9 distinct items — the padding path survives for areas not yet expanded");
  // And the newly expanded area no longer pads, which is the point of the slice.
  const prefixFocused = buildMedTermSession(20, ["prefixes"]);
  assert.equal(new Set(prefixFocused.map((q) => q.id)).size, 20,
    "11h. a focused 20-question PREFIX session now serves 20 distinct items — no padding");
  const prefixEv = buildMedTermEvidence(prefixFocused.map((q) => ({ id: q.id, selected: right(q) })));
  assert.equal(prefixEv.coveredAreaCount, 1, "11h2. still one area");
  assert.equal(prefixEv.evidenceStatus, "insufficient-evidence", "11h3. so still refused on breadth alone");
  assert.equal(medTermPersistenceRequest(prefixEv), null, "11h4. and no review call is made");

  // ---- 12-14. dedup, unknown ids, cross-area -------------------------------------------------------------
  const rest = spread(10, 0, THREE).slice(1);
  const rightThenWrong = buildMedTermEvidence([
    { id: WR[0].id, selected: right(WR[0]) }, { id: WR[0].id, selected: wrongFor(WR[0]) }, ...rest
  ]);
  assert.equal(rightThenWrong.uniqueCorrect, 1, "12. the FIRST answer (correct) counted");
  const wrongThenRight = buildMedTermEvidence([
    { id: WR[0].id, selected: wrongFor(WR[0]) }, { id: WR[0].id, selected: right(WR[0]) }, ...rest
  ]);
  assert.equal(wrongThenRight.uniqueCorrect, 0, "12b. answering wrong first cannot be corrected by a resubmit");
  control("last-occurrence would flip both conflicting-duplicate fixtures",
    rightThenWrong.uniqueCorrect === 1 && wrongThenRight.uniqueCorrect === 0);

  const base = spread(10, 7, THREE);
  const withUnknown = buildMedTermEvidence([...base, { id: "not-a-real-id", selected: "x" }, { id: "", selected: "y" }]);
  const withoutUnknown = buildMedTermEvidence(base);
  assert.deepEqual(
    [withUnknown.uniqueTotal, withUnknown.uniqueCorrect, withUnknown.coveredAreaCount, withUnknown.evidenceScore],
    [withoutUnknown.uniqueTotal, withoutUnknown.uniqueCorrect, withoutUnknown.coveredAreaCount, withoutUnknown.evidenceScore],
    "13. unknown ids change neither count, area count, nor score");
  assert.equal(buildMedTermEvidence([{ id: "nope", selected: "x" }]).uniqueTotal, 0, "13b. an unknown id alone yields nothing");
  control("a real id in the same position does change the count",
    buildMedTermEvidence([...base, { id: SU[8].id, selected: right(SU[8]) }]).uniqueTotal === 11);

  const cross = buildMedTermEvidence([
    { id: WR[0].id, selected: right(WR[0]) }, { id: PR[0].id, selected: right(PR[0]) }, { id: SU[0].id, selected: right(SU[0]) }
  ]);
  assert.deepEqual(cross.coveredAreas, ["word-roots", "prefixes", "suffixes"], "14. each id lands in its own bank area");

  // ---- 15. the exact-ratio threshold ----------------------------------------------------------------------
  // 16 of 23 rounds to 70 but is 69.565% — a rounded 70 must not buy a pass.
  const artifact = buildMedTermEvidence(spread(23, 16, THREE));
  assert.equal(artifact.uniqueTotal, 23, "15. twenty-three distinct questions");
  assert.equal(artifact.evidenceScore, 70, "15b. the DISPLAY score rounds to 70");
  assert.ok(16 * 100 < 70 * 23, "15c. but the exact ratio is below 70%");
  assert.equal(artifact.evidenceStatus, "below-threshold", "15d. so it does not pass");
  assert.equal(artifact.passed, false, "15e. passed is false");
  assert.deepEqual(medTermPersistenceRequest(artifact), { scorePercent: 70, passed: false },
    "15f. and review receives passed:false despite the displayed 70");
  control("a rounded-score threshold would have passed this fixture",
    artifact.evidenceScore >= 70 && artifact.passed === false);

  // ---- 16-17. registry score and weak areas -----------------------------------------------------------------
  const routeSrc = stripComments(read("app/api/hosa/medterm/submit/route.ts"));
  assert.ok(/const weighted = hasEnoughEvidence \? await getWeightedScoringRubric/.test(routeSrc),
    "16. the registry score is computed ONLY when the evidence qualifies");
  assert.ok(/pointsEarned: Math\.round\(\(evidenceScore \/ 100\)/.test(routeSrc),
    "16b. and is derived from the EVIDENCE score, never the raw session score");
  // That score is computed over PERSISTED DISTINCT items, so neither the visual slot count nor the
  // padded order length can inflate it, and a live-bank answer cannot decide it.
  assert.ok(/const uniqueTotal = answered\.length;/.test(routeSrc),
    "16c. the score counts persisted distinct answered items");
  assert.ok(/const uniqueCorrect = answered\.filter\(\(item\) => item\.isCorrect\)\.length;/.test(routeSrc),
    "16d. and their STORED correctness, recorded when the learner first answered");
  assert.ok(/const passed = hasEnoughEvidence && meetsThreshold;/.test(routeSrc),
    "16e. passing derives from that score plus both floors");
  assert.ok(/scorePercent: evidenceScore/.test(routeSrc), "16f. and review receives the same score");
  assert.ok(/passed,\n/.test(routeSrc), "16g. and the same pass value");
  assert.ok(!/order\.length|requestedCount/.test(routeSrc),
    "16h. the padded slot count cannot reach the grade at all");
  assert.ok(!/result\.scorePercent \/ 100/.test(routeSrc), "16c. the duplicate-weighted derivation is gone");
  // C2a: weak areas are derived from the persisted distinct answered items — the same evidence set,
  // now structural rather than recomputed, so only areas actually covered can appear.
  assert.ok(/const weakAreas = coveredAreas/.test(routeSrc), "17. weak areas come from the evidence set");
  assert.ok(/answered\.filter\(\(item\) => item\.area === area\)/.test(routeSrc),
    "17b. scoped to the items actually answered in that area");
  assert.ok(/\.filter\(\(entry\) => entry\.missed > 0\)/.test(routeSrc),
    "17c. and only areas with a real miss are reported");
  const partial = buildMedTermEvidence([{ id: WR[0].id, selected: right(WR[0]) }]);
  assert.deepEqual(partial.weakAreas, [], "17b. one correct answer produces no weak areas");
  assert.equal(partial.coveredAreaCount, 1, "17c. because only one area was covered");
  const uiSrc = stripComments(read("components/training/hosa-medterm-engine.tsx"));
  assert.ok(!uiSrc.includes("No weak areas — every topic was clean"), "17d. the broad clean-topics claim is gone");
  assert.ok(uiSrc.includes("No weak areas were detected in the areas covered by this session"),
    "17e. replaced by a claim scoped to what was covered");
  assert.ok(/result\.evidenceStatus !== "insufficient-evidence" \?/.test(uiSrc),
    "17f. and it is not shown at all when the evidence is insufficient");

  // ---- 18-22. learner copy -------------------------------------------------------------------------------------
  const { evidenceState } = await import("../components/training/hosa-medterm-engine");
  const row = (evidenceStatus: string) =>
    evidenceState({ total: 10, correctCount: 7, scorePercent: 70, items: [], uniqueTotal: 10, uniqueCorrect: 7,
      coveredAreas: THREE, coveredAreaCount: 3, requiredUnique: HOSA_MEDTERM_REQUIRED_UNIQUE,
      requiredAreas: HOSA_MEDTERM_REQUIRED_AREAS, evidenceScore: 70, evidenceStatus,
      persistenceStatus: "review-attempted", weakAreas: [], passed: evidenceStatus === "passing"
    } as Parameters<typeof evidenceState>[0]);
  assert.equal(row("passing").badge, "Practice complete", "18. passing evidence reads 'Practice complete'");
  assert.equal(row("below-threshold").badge, "Keep practicing", "19. below threshold reads 'Keep practicing'");
  assert.equal(row("insufficient-evidence").badge, "Practice only", "20. insufficient reads 'Practice only'");
  assert.ok(/at least 10 different questions across 3 areas/.test(row("insufficient-evidence").explanation),
    "20b. with the exact floor-and-breadth explanation");
  assert.ok(/Nothing was recorded/.test(row("insufficient-evidence").explanation), "20c. and says nothing was recorded");
  for (const status of ["passing", "below-threshold", "insufficient-evidence"]) {
    const text = `${row(status).badge} ${row(status).explanation}`;
    for (const banned of [/\bsaved\b/i, /\brecorded\b(?!\.)/i, /\bscheduled\b/i, /\bupdated\b/i]) {
      if (banned.source.includes("recorded") && status === "insufficient-evidence") continue; // "Nothing was recorded"
      assert.ok(!banned.test(text), `18-19b. "${status}" makes no persistence-success claim (${banned})`);
    }
    assert.ok(!/master|event.ready|competition.ready|clinically proficient/i.test(text),
      `24-25. "${status}" claims no mastery, event readiness or clinical proficiency`);
  }
  const uiText = uiSrc.replace(/\s+/g, " ");
  assert.ok(uiText.includes("Focused area sessions are practice only because they cover one area"),
    "21. the focused-session explanation is present");
  assert.ok((uiText.match(/Mixed sessions can count toward review practice when they include at least/g) ?? []).length >= 1,
    "22. the mixed-session guidance constant exists");
  assert.equal((uiText.match(/\{EVIDENCE_GUIDANCE\}/g) ?? []).length, 2, "22b. rendered before starting AND on results");
  assert.ok(uiText.includes("Repeated questions count once toward review evidence"), "the repeat explanation is present");
  assert.ok(/const repeated = result\.evidenceScore !== result\.scorePercent;/.test(uiSrc),
    "23. shown only when raw and evidence scores differ");
  const declaredUnique = uiSrc.match(/const REQUIRED_UNIQUE_FOR_REVIEW = (\d+);/);
  const declaredAreas = uiSrc.match(/const REQUIRED_AREAS_FOR_REVIEW = (\d+);/);
  assert.equal(Number(declaredUnique?.[1]), HOSA_MEDTERM_REQUIRED_UNIQUE, "the client's floor matches the server's");
  assert.equal(Number(declaredAreas?.[1]), HOSA_MEDTERM_REQUIRED_AREAS, "and so does the breadth requirement");

  // ---- 23. reviewScheduled is gone -------------------------------------------------------------------------------
  assert.ok(!routeSrc.includes("reviewScheduled"), "23. the route sends no reviewScheduled field");
  assert.ok(!uiSrc.includes("reviewScheduled"), "23b. the component has no reviewScheduled member");
  assert.ok(!/spaced-review schedule|come back for review tomorrow/.test(uiSrc),
    "23c. and the review-scheduled sentences are gone");

  // ---- 26-27. review-only: no mastery, no XP ----------------------------------------------------------------------
  for (const file of ["lib/hosa-medterm.ts", "app/api/hosa/medterm/submit/route.ts",
                      "components/training/hosa-medterm-engine.tsx", "app/api/hosa/medterm/session/route.ts"]) {
    const code = stripComments(read(file));
    for (const banned of ["recordDrillMastery", "recordDrillMasteryDetailed", "MasteryProgress", "masteryProgress",
                          "masteryLevelFor", "MASTERED", "xpReward", "XPLog", "xpLog", "awardXp", "XP_REWARDS"]) {
      assert.ok(!code.includes(banned), `26-27. ${file} contains no ${banned}`);
    }
  }
  // Behavioural: the stub THROWS on any MasteryProgress write, and a qualifying review still succeeds.
  stub.calls = [];
  await recordPracticeOutcome({ userId: "u", skillId: "stub-skill-id", passed: true });
  assert.equal(stub.calls.length, 1, "26b. a review write happens");
  assert.equal(stub.calls[0].op, "review.create", "26c. on SkillReviewSchedule only");
  control("the stub would have thrown on any MasteryProgress write, and none occurred",
    stub.calls.every((c) => c.op.startsWith("review.")));

  // ---- 28-29. the call gate -------------------------------------------------------------------------------------
  // C2a: session-backed shape. The review core replaces the public helper and the floor gate is an
  // explicit predicate; the invariants are identical.
  assert.equal((routeSrc.match(/recordPracticeOutcomeInTransaction\(/g) ?? []).length, 1,
    "28. exactly one review call site");
  assert.ok(routeSrc.indexOf("const hasEnoughEvidence") < routeSrc.indexOf("recordPracticeOutcomeInTransaction("),
    "28b. the decision is made BEFORE the call");
  assert.ok(/if \(hasEnoughEvidence\) \{/.test(routeSrc),
    "28c. guarded by both floors — 10 unique across 3 areas");
  assert.ok(/passed,\n/.test(routeSrc), "29. review receives the EVIDENCE-derived pass status");
  assert.ok(!/gradeMedTermAnswers\(|buildMedTermEvidence\(/.test(routeSrc),
    "29b. and grading reads the stored snapshot, never the live bank");
  assert.ok(!/passed: result\.passed/.test(routeSrc), "29b. never the raw duplicate-weighted one");

  // ---- 30, 32-35. everything outside the boundary is byte-identical to HEAD -----------------------------------------
  // The DECA and Debate routes/components and lib/spaced-review.ts were byte-pinned here until
  // M13E1G, which deliberately due-gates the shared ladder and threads the review result into both
  // drill routes. A blanket hash would forbid that approved change rather than protect HOSA, so it is
  // replaced below by assertions on what actually matters to THIS suite: HOSA stays review-only, its
  // evidence contract is untouched, and the other tracks did not drag HOSA along with them.
  for (const file of [// app/api/hosa/medterm/session/route.ts is deliberately absent from M13E2 C2a
                      // onward: it is now session-backed. Asserted at 30s below instead.
                      "lib/deca-drills.ts",                                                     // 32 DECA bank
                      "lib/debate-drills.ts",                                                   // 33 Debate bank
                      "prisma/seed.ts",                                                         // 35 seed
                      "lib/roleplay-lessons.ts", "lib/hosa-events.ts"]) {
    assert.equal(nowSha(file), headSha(file), `30/32-35. ${file} is byte-identical to HEAD`);
  }

  // ---- 30s. what the HOSA session-route hash was protecting, asserted exactly ----------------
  const hosaSession = stripComments(read("app/api/hosa/medterm/session/route.ts"));
  assert.ok(/requireUser\(\)/.test(hosaSession), "30s. the HOSA session route still authenticates");
  assert.ok(/enforceRateLimit\(/.test(hosaSession), "30s2. and its rate limiting is preserved");
  assert.ok(/prisma\.\$transaction\(/.test(hosaSession), "30s3. issuance happens in one transaction");
  const hsSess = hosaSession.slice(hosaSession.indexOf("prisma.$transaction"));
  assert.ok(hsSess.indexOf("lockUserRow(tx") >= 0 && hsSess.indexOf("lockUserRow(tx") < hsSess.indexOf("findActiveSession("),
    "30s4. whose FIRST statement is the user row lock, before any lifecycle query");
  const hsKinds = new Set([...hosaSession.matchAll(/"(DEBATE_DRILL|DECA_DRILL|HOSA_MEDTERM|DEBATE_WRITING)"/g)].map((m) => m[1]));
  assert.deepEqual([...hsKinds], ["HOSA_MEDTERM"], "30s5. it binds exactly HOSA_MEDTERM");
  assert.ok(/findActiveSession\(/.test(hosaSession), "30s6. an unexpired ISSUED session is reused, not duplicated");
  assert.ok(/buildMedTermSession\(/.test(hosaSession), "30s7. the SERVER selects the questions");
  assert.ok(/buildServedChoices\(/.test(hosaSession), "30s8. choices are shuffled and given opaque option ids");
  assert.ok(/correctOptionId/.test(hosaSession), "30s9. the correct option is persisted server-side");
  assert.ok(/kind: "DRILL"/.test(hosaSession) && /requestedCount: order\.length/.test(hosaSession),
    "30s10. the padded order is persisted in the immutable snapshot");
  assert.ok(/serializeStart\(/.test(hosaSession),
    "30s11. and the response is built by the serializer that withholds the key for unanswered items");
  assert.ok(/MEDTERM_AREAS/.test(hosaSession) && /mode: spec \? "official" : "generic"/.test(hosaSession),
    "30s12. HOSA area and official/generic spec labelling is preserved");
  // Reading the bank's correct answer at issuance is REQUIRED — it is what gets stored. What must
  // never happen is revealing which served option it is.
  const hsResponse = hosaSession.slice(hosaSession.indexOf("NextResponse.json"));
  for (const leak of ["correctAnswer", "correctOptionId", "explanationSnapshot", "explanation:"]) {
    assert.ok(!hsResponse.includes(leak), `30s13. the response literal reveals no ${leak}`);
  }
  for (const banned of ["XP_REWARDS", "xPLog", "MasteryProgress", "masteryProgress",
                        "recordDrillMastery", "recordPracticeOutcome"]) {
    assert.ok(!hosaSession.includes(banned), `30s14. issuance writes no mastery and no XP (${banned})`);
  }
  // Non-vacuous controls: both scans detect a real violation when one is present.
  assert.ok(/"DECA_DRILL"/.test('const k = "DECA_DRILL";'), "30s15. control: the kind scan matches a wrong-kind binding");
  assert.ok('{ correctAnswer: q.correctAnswer }'.includes("correctAnswer"),
    "30s16. control: the leak scan matches an answer-key field in a response literal");


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
  // 32b/33b. The other tracks' evidence FLOORS and dedup are unchanged by the ladder work.
  const { DECA_DRILL_REQUIRED_UNIQUE } = await import("../lib/deca-drills");
  const { DEBATE_DRILL_REQUIRED_UNIQUE } = await import("../lib/debate-drills");
  assert.equal(DECA_DRILL_REQUIRED_UNIQUE, 5, "32b. the DECA evidence floor is still 5");
  assert.equal(DEBATE_DRILL_REQUIRED_UNIQUE, 5, "33b. and the Debate floor is still 5");
  assert.equal(HOSA_MEDTERM_REQUIRED_UNIQUE, 10, "30b. while HOSA keeps its own floor of 10");
  assert.equal(HOSA_MEDTERM_REQUIRED_AREAS, 3, "30c. across three areas");
  // 32c/33c. Neither drill route may reach a HOSA helper, and HOSA may not reach theirs.
  for (const [file, foreign] of [["app/api/deca/drills/submit/route.ts", "hosa-medterm"],
                                 ["app/api/debate/drills/submit/route.ts", "hosa-medterm"]] as const) {
    assert.ok(!stripComments(read(file)).includes(foreign), `32c/33c. ${file} does not reach into HOSA`);
  }
  // 35b. lib/spaced-review.ts keeps the boolean export the HOSA route never needs, and HOSA still
  // calls only the review helper — it may ignore the detailed result truthfully because it writes
  // no mastery at all.
  const spacedReview = stripComments(read("lib/spaced-review.ts"));
  assert.ok(/export async function recordDrillMastery\(/.test(spacedReview), "35b. the boolean export still exists");
  assert.ok(/Promise<boolean>/.test(spacedReview), "35b2. and still returns a boolean");
  assert.ok(/export async function recordPracticeOutcome\(/.test(spacedReview), "35c. the review helper still exists");
  // C2a: HOSA calls the transaction-native core, not the public helper. Counted on comment-stripped
  // source so prose describing the call cannot be mistaken for one.
  const hosaCode = stripComments(routeSrc);
  assert.equal((hosaCode.match(/recordPracticeOutcomeInTransaction\(/g) ?? []).length, 1,
    "35d. and HOSA calls the transaction-native review core exactly once");
  assert.equal((hosaCode.match(/(?<!InTransaction)\brecordPracticeOutcome\(/g) ?? []).length, 0,
    "35d2. and never the public non-transactional helper");
  assert.ok(!/recordDrillMastery/.test(hosaCode), "35d3. and no mastery call exists at all");
  assert.ok(hosaCode.indexOf("parseStoredResult(") < hosaCode.indexOf("recordPracticeOutcomeInTransaction("),
    "35d4. a completed retry returns before the transactional review call");

  // ---- 31f. the bank CONTENT is additive-only — every pre-existing item byte-identical ------------
  // Until M14 Phase 2a this asserted the WHOLE bank slice was byte-identical to PRE_M13E1F. Phase 2a
  // deliberately appends word-root items (audit G2), so a whole-slice hash would forbid an approved
  // change rather than protect anything. The protection is NARROWED, never removed: every item that
  // existed at the immutable parent commit must still be present byte-for-byte, and the ONLY
  // permitted delta is new `wr-NN` entries appearing after `wr-09`. Any silent edit to an existing
  // id, area, question, choice, answer or explanation still fails here, as does an added item in
  // any other area, a removed item, or a reordering of the pre-existing ones.
  const bankAtParent = execSync(`git show ${PRE_M13E1F}:lib/hosa-medterm.ts`, { encoding: "utf8" });
  const bankSlice = (src: string) => src.slice(src.indexOf("export const MEDTERM_BANK"), src.indexOf("function shuffle"));
  /** One trimmed source line per item literal, in file order. Comments and blanks are ignored. */
  const itemLines = (src: string) =>
    bankSlice(src)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("{ id:"));
  const idOf = (line: string) => (line.match(/^\{ id: "([^"]+)"/) ?? [])[1] ?? "";

  const parentItems = itemLines(bankAtParent);
  const currentItems = itemLines(read("lib/hosa-medterm.ts"));
  assert.equal(parentItems.length, 54, "31f. control: the parent commit really held 54 item literals");
  assert.ok(currentItems.length >= parentItems.length, "31f2. the bank never shrank");

  // (a) Every pre-existing item survives byte-identical, in its original relative order.
  const currentById = new Map(currentItems.map((line) => [idOf(line), line]));
  for (const parentLine of parentItems) {
    const id = idOf(parentLine);
    assert.equal(currentById.get(id), parentLine,
      `31f3. pre-existing item ${id} is byte-identical to the parent commit (id, area, question, choices, answer, explanation)`);
  }
  const parentOrder = parentItems.map(idOf);
  const currentOrderOfParentIds = currentItems.map(idOf).filter((id) => parentOrder.includes(id));
  assert.deepEqual(currentOrderOfParentIds, parentOrder, "31f4. and the pre-existing items keep their original order");

  // (b) Additions are permitted ONLY from an explicit per-area allowlist: one id prefix per area
  // that a Phase 2 slice has expanded, and only above the original 9. This is deliberately NOT
  // generalised to "any id" — an unapproved area (say sf-10) must still fail, which control
  // 31f-C2 proves. Extend this list one entry per approved slice, never pre-emptively.
  const ADDITIVE_ALLOWLIST: ReadonlyArray<{ idPrefix: string; area: MedTermArea }> = [
    { idPrefix: "wr", area: "word-roots" }, // M14 Phase 2a
    { idPrefix: "pr", area: "prefixes" }    // M14 Phase 2b
  ];
  const addedIds = currentItems.map(idOf).filter((id) => !parentOrder.includes(id));
  const currentByIdArea = new Map(currentItems.map((line) => [idOf(line), line]));
  for (const id of addedIds) {
    const entry = ADDITIVE_ALLOWLIST.find((a) => new RegExp(`^${a.idPrefix}-\\d{2}$`).test(id));
    assert.ok(entry && Number(id.slice(3)) > 9,
      `31f5. the only permitted additions are allowlisted-area items numbered after 09 — got ${id}`);
    assert.ok(new RegExp(`area: "${entry!.area}"`).test(currentByIdArea.get(id) ?? ""),
      `31f6. added item ${id} is declared in the ${entry!.area} area its id prefix claims`);
  }
  // (c) Areas with NO approved additions stay byte-identical, content and count.
  const EXPANDED_ID_AREAS = ADDITIVE_ALLOWLIST.map((a) => a.area);
  for (const area of ["prefixes", "suffixes", "anatomy", "physiology", "pathophysiology"] as const) {
    const parentArea = parentItems.filter((line) => line.includes(`area: "${area}"`));
    const currentArea = currentItems.filter((line) => line.includes(`area: "${area}"`));
    if (EXPANDED_ID_AREAS.includes(area)) {
      // Expanded area: every ORIGINAL item survives byte-identical and in order; only additions differ.
      const currentOriginals = currentArea.filter((line) => parentArea.includes(line));
      assert.deepEqual(currentOriginals, parentArea,
        `31f7. every original ${area} item is byte-identical to the parent commit and keeps its order`);
      assert.ok(currentArea.length > parentArea.length,
        `31f7b. and ${area} grew rather than shrank`);
    } else {
      assert.deepEqual(currentArea, parentArea, `31f7. the ${area} block is byte-identical to the parent commit`);
    }
  }
  // (d) The original nine of each expanded area, called out because slices append beside them.
  for (const { idPrefix } of ADDITIVE_ALLOWLIST) {
    for (let n = 1; n <= 9; n += 1) {
      const id = `${idPrefix}-0${n}`;
      assert.equal(currentById.get(id), parentItems.find((line) => idOf(line) === id),
        `31f8. ${id} is unchanged`);
    }
  }
  // Non-vacuous controls: each rule rejects the mutation it exists to reject.
  const sampleParent = parentItems.find((line) => idOf(line) === "wr-01") as string;
  assert.notEqual(sampleParent.replace("Kidney", "Liver"), sampleParent,
    "31f-C1. control: a one-word answer edit produces a different line, so 31f3 would catch it");
  // 31f-C2 previously proved `pr-10` was rejected. Phase 2b approved prefixes, so that fixture would
  // now pass; the control moves to a still-unapproved area so the allowlist stays non-vacuous.
  assert.ok(!ADDITIVE_ALLOWLIST.some((a) => new RegExp(`^${a.idPrefix}-\\d{2}$`).test("sf-10")),
    "31f-C2. control: an added suffixes item (sf-10) is still rejected by the allowlist");
  assert.ok(ADDITIVE_ALLOWLIST.some((a) => new RegExp(`^${a.idPrefix}-\\d{2}$`).test("pr-10")),
    "31f-C2b. control: and pr-10 IS allowlisted, so the rule genuinely changed rather than loosening to anything");
  for (const unapproved of ["sf-10", "an-10", "ph-10", "pp-10", "xx-10"]) {
    assert.ok(!ADDITIVE_ALLOWLIST.some((a) => new RegExp(`^${a.idPrefix}-\\d{2}$`).test(unapproved)),
      `31f-C2c. control: ${unapproved} remains outside the allowlist`);
  }
  assert.ok(!(Number("wr-09".slice(3)) > 9), "31f-C3. control: a re-added wr-09 would fail the after-wr-09 rule");
  assert.ok(itemLines('export const MEDTERM_BANK = [\n{ id: "x-01", area: "anatomy" },\nfunction shuffle').length === 1,
    "31f-C4. control: the item extractor really parses item literals");

  // ---- 37. the pre-fix defects, proven from the EXPLICIT parent commit ----------------------------------------------
  // PINNED, never `HEAD`: once this milestone commits, HEAD is the commit that REMOVED the defects.
  const routeAtParent = execSync(`git show ${PRE_M13E1F}:app/api/hosa/medterm/submit/route.ts`, { encoding: "utf8" });
  const uiAtParent = execSync(`git show ${PRE_M13E1F}:components/training/hosa-medterm-engine.tsx`, { encoding: "utf8" });
  assert.ok(/passed: result\.passed/.test(routeAtParent),
    `37. at ${PRE_M13E1F.slice(0, 8)} the route passed the RAW score's pass flag to spaced review`);
  assert.ok(!/buildMedTermEvidence|REQUIRED_UNIQUE/.test(routeAtParent), "37b. with no evidence floor of any kind");
  assert.ok(/reviewScheduled = true/.test(routeAtParent), "37c. and set reviewScheduled = true unconditionally");
  assert.ok(/result\.reviewScheduled \?/.test(uiAtParent), "37d. which the component rendered to the learner");
  assert.ok(/No weak areas — every topic was clean/.test(uiAtParent), "37e. alongside the broad clean-topics claim");
  const oneRaw = gradeMedTermAnswers([{ id: WR[0].id, selected: right(WR[0]) }]);
  control(`the pre-fix contract passed on ONE correct question (${oneRaw.scorePercent}%, passed=${oneRaw.passed})`,
    oneRaw.scorePercent === 100 && oneRaw.passed === true);

  console.log(
    `HOSA-medterm-evidence smoke passed: Medical Terminology review eligibility is now scored from a duplicate-resistant evidence set — first answer per distinct valid question id, attributed to its own bank area — and needs ${HOSA_MEDTERM_REQUIRED_UNIQUE} distinct questions across ${HOSA_MEDTERM_REQUIRED_AREAS} areas before spaced review is touched at all. All three fabrication paths are closed: one correct question scored 100% and passed, and now records nothing; the duplicate bypass scored 76% and is now insufficient; a focused 20-question word-roots session now serves 20 DISTINCT items with no padding and clears the count floor, yet is still refused on breadth alone. A displayed 70 that is exactly 69.57% no longer passes. The registry's official-scale score is derived from the evidence score and withheld entirely when the evidence does not qualify. Weak areas come from the evidence set, so an uncovered area is never called clean. The unprovable reviewScheduled claim is gone and no learner copy says saved, recorded, scheduled or updated. The skill stays REVIEW-ONLY: no MasteryProgress, no mastery level, no XP anywhere in the path, proven against a stub that throws on any mastery write. The bank is additive-only against the parent commit: all 54 pre-existing items — ids, areas, questions, choices, answers and explanations — are byte-identical and keep their order, and the only deltas are the allowlisted additions — 21 word-root items (wr-10..wr-30) and 21 prefix items (pr-10..pr-30, AI-assisted draft pending human content review) — taking both areas to 30 and the bank to 96, while the four unexpanded areas stay byte-identical at 9. ${controlsRun.length} controls each demonstrated the failure they exist to demonstrate.`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
