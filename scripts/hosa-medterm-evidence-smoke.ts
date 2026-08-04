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
import { readFileSync } from "node:fs";
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
  assert.equal(MEDTERM_BANK.length, 54, "31. exactly 54 questions");
  assert.equal(new Set(MEDTERM_BANK.map((q) => q.id)).size, 54, "31b. 54 unique ids");
  assert.equal(MEDTERM_AREAS.length, 6, "31c. exactly six areas");
  for (const a of MEDTERM_AREAS) {
    assert.equal(byArea(a.id).length, 9, `31d. area ${a.id} holds exactly nine questions`);
  }
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

  // ---- 11. focused padding ------------------------------------------------------------------------------
  const padded = buildMedTermSession(20, ["word-roots"]);
  assert.equal(padded.length, 20, "11. a focused 20-question session serves 20");
  assert.equal(new Set(padded.map((q) => q.id)).size, 9, "11b. from only nine distinct questions");
  const paddedEv = buildMedTermEvidence(padded.map((q) => ({ id: q.id, selected: right(q) })));
  assert.equal(paddedEv.uniqueTotal, 9, "11c. so the evidence set holds nine");
  assert.equal(paddedEv.coveredAreaCount, 1, "11d. covering one area");
  assert.equal(paddedEv.evidenceStatus, "insufficient-evidence", "11e. insufficient on BOTH count and breadth");
  assert.equal(medTermPersistenceRequest(paddedEv), null, "11f. no review call from a focused session");
  control("a perfect focused session still records nothing",
    paddedEv.evidenceScore === 100 && medTermPersistenceRequest(paddedEv) === null);

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
  assert.ok(/const weighted = plan \? await getWeightedScoringRubric/.test(routeSrc),
    "16. the registry score is computed ONLY when the evidence qualifies");
  assert.ok(/pointsEarned: Math\.round\(\(evidence\.evidenceScore \/ 100\)/.test(routeSrc),
    "16b. and is derived from the EVIDENCE score, never the raw session score");
  assert.ok(!/result\.scorePercent \/ 100/.test(routeSrc), "16c. the duplicate-weighted derivation is gone");
  assert.ok(/weakAreas: evidence\.weakAreas/.test(routeSrc), "17. weak areas come from the evidence set");
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
  assert.equal((routeSrc.match(/recordPracticeOutcome\(/g) ?? []).length, 1, "28. exactly one review call site");
  assert.ok(routeSrc.indexOf("medTermPersistenceRequest(") < routeSrc.indexOf("recordPracticeOutcome("),
    "28b. the decision is made BEFORE the call");
  assert.ok(/if \(plan\) \{/.test(routeSrc), "28c. guarded by a non-null plan");
  assert.ok(/passed: plan\.passed/.test(routeSrc), "29. review receives the EVIDENCE-derived pass status");
  assert.ok(!/passed: result\.passed/.test(routeSrc), "29b. never the raw duplicate-weighted one");

  // ---- 30, 32-35. everything outside the boundary is byte-identical to HEAD -----------------------------------------
  for (const file of ["app/api/hosa/medterm/session/route.ts",                                  // 30 HOSA session
                      "lib/deca-drills.ts", "app/api/deca/drills/submit/route.ts",              // 32 DECA
                      "components/training/concept-drills.tsx",
                      "lib/debate-drills.ts", "app/api/debate/drills/submit/route.ts",          // 33 Debate
                      "components/training/debate-drills.tsx",
                      "lib/spaced-review.ts",                                                   // shared writer
                      "prisma/schema.prisma", "prisma/seed.ts",                                 // 34/35 schema + seed
                      "lib/roleplay-lessons.ts", "lib/hosa-events.ts"]) {
    assert.equal(nowSha(file), headSha(file), `30/32-35. ${file} is byte-identical to HEAD`);
  }

  // ---- 31f. the bank CONTENT is untouched — answers and explanations included --------------------------------------
  const bankAtParent = execSync(`git show ${PRE_M13E1F}:lib/hosa-medterm.ts`, { encoding: "utf8" });
  const bankSlice = (src: string) => src.slice(src.indexOf("export const MEDTERM_BANK"), src.indexOf("function shuffle"));
  assert.equal(bankSlice(read("lib/hosa-medterm.ts")), bankSlice(bankAtParent),
    "31f. the question bank — text, answers and explanations — is byte-identical to the parent commit");

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
    `HOSA-medterm-evidence smoke passed: Medical Terminology review eligibility is now scored from a duplicate-resistant evidence set — first answer per distinct valid question id, attributed to its own bank area — and needs ${HOSA_MEDTERM_REQUIRED_UNIQUE} distinct questions across ${HOSA_MEDTERM_REQUIRED_AREAS} areas before spaced review is touched at all. All three fabrication paths are closed: one correct question scored 100% and passed, and now records nothing; the duplicate bypass scored 76% and is now insufficient; a perfect focused 20-question session serving only 9 distinct items is refused on both count and breadth. A displayed 70 that is exactly 69.57% no longer passes. The registry's official-scale score is derived from the evidence score and withheld entirely when the evidence does not qualify. Weak areas come from the evidence set, so an uncovered area is never called clean. The unprovable reviewScheduled claim is gone and no learner copy says saved, recorded, scheduled or updated. The skill stays REVIEW-ONLY: no MasteryProgress, no mastery level, no XP anywhere in the path, proven against a stub that throws on any mastery write. The 54-question bank, its answers and its explanations are byte-identical to the parent commit. ${controlsRun.length} controls each demonstrated the failure they exist to demonstrate.`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
