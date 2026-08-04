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
import { readFileSync } from "node:fs";
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
  assert.equal((routeSrc.match(/recordDrillMastery\(/g) ?? []).length, 1, "13. exactly one persistence call site");
  assert.ok(routeSrc.indexOf("debateDrillPersistenceRequest(") < routeSrc.indexOf("recordDrillMastery("),
    "13b. and the decision is made BEFORE the call");
  assert.ok(/if \(plan && skill\.skillSlug\) \{/.test(routeSrc), "13c. the call is guarded by a non-null plan");
  assert.ok(/const wrote = await recordDrillMastery\(/.test(read("app/api/debate/drills/submit/route.ts")),
    "13d. and the existing boolean contract is kept by name");
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
      evidenceScore: 80, passed: evidenceStatus === "passing", evidenceStatus, persistenceStatus } as Parameters<typeof resultState>[0]);
  assert.equal(row("passing", "not-saved").badge, "Progress not saved", "17. a failed write reads 'Progress not saved'");
  assert.equal(row("below-threshold", "not-saved").badge, "Progress not saved", "17b. for below-threshold too");
  assert.ok(!/not.*(set up|seeded|available|tracked)/i.test(row("passing", "not-saved").explanation ?? ""),
    "17c. and is NEVER described as an unseeded or untracked skill");
  assert.ok(/Try again later/.test(row("passing", "not-saved").explanation ?? ""), "17d. it says the save failed");
  assert.equal(row("below-threshold", "updated").badge, "Keep practicing", "18. below threshold + updated reads 'Keep practicing'");
  assert.equal(row("passing", "updated").badge, "Progress saved", "19. passing + updated reads 'Progress saved'");
  assert.equal(row("insufficient-evidence", "not-attempted").badge, "Practice only", "19b. insufficient reads 'Practice only'");
  for (const [ev, pers] of [["insufficient-evidence", "not-attempted"], ["below-threshold", "updated"],
                            ["passing", "updated"], ["passing", "not-saved"]] as const) {
    assert.ok(row(ev, pers).badge.trim().length > 0, "19c. every state is conveyed by words, never colour alone");
  }
  control("persistence status alone changes the learner-facing result",
    new Set(["updated", "not-saved"].map((p) => row("passing", p).badge)).size === 2);

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
  for (const file of ["app/api/skills/debate-writing/route.ts", "lib/debate-skill-practice.ts",   // 27 Debate writing
                      "lib/deca-drills.ts", "app/api/deca/drills/submit/route.ts",                 // 28 DECA
                      "components/training/concept-drills.tsx",
                      "prisma/schema.prisma", "prisma/seed.ts",                                    // 30/31 schema + seed
                      "lib/spaced-review.ts", "app/api/debate/drills/session/route.ts",
                      "lib/education/registry.ts", "lib/assignments.ts"]) {
    assert.equal(nowSha(file), headSha(file), `27-31. ${file} is byte-identical to HEAD`);
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
  assert.ok(/recordPracticeOutcome\(/.test(hosaRoute), "29c. it still uses the review helper only");
  // (ii) No cross-track abstraction: HOSA uses its own helper, and the tracks do not import each other.
  assert.ok(/buildMedTermEvidence\(/.test(hosaRoute), "29d. HOSA uses its OWN evidence helper");
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
  assert.equal(nowSha("app/api/hosa/medterm/session/route.ts"), headSha("app/api/hosa/medterm/session/route.ts"),
    "29h. the HOSA session route is byte-identical to HEAD");
  const hosaBank = await import("../lib/hosa-medterm");
  assert.equal(hosaBank.MEDTERM_BANK.length, 54, "29i. the HOSA bank still holds 54 questions");
  assert.equal(new Set(hosaBank.MEDTERM_BANK.map((q) => q.id)).size, 54, "29j. with unique ids");
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
