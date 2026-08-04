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
import { readFileSync } from "node:fs";
// THE PRODUCTION MODULES — never a mirrored copy of their logic.
import {
  DECA_DRILL_AREAS,
  DECA_DRILL_BANK,
  DECA_DRILL_PASS_THRESHOLD,
  DECA_DRILL_REQUIRED_UNIQUE,
  buildDecaDrillEvidence,
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
    findUnique: async () => (stub.reviewDueAt === null ? null : { id: "stub-review-id", nextReviewAt: stub.reviewDueAt, reviewCount: 3 }),
    create: async (args: { data: Record<string, unknown> }) => { stub.calls.push({ op: "review.create", data: args.data }); return {}; },
    update: async (args: { data: Record<string, unknown> }) => { stub.calls.push({ op: "review.update", data: args.data }); return {}; },
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
  assert.equal((routeSrc.match(/recordDrillMasteryDetailed\(/g) ?? []).length, 1,
    "11. the route calls the persistence helper in exactly one place");
  assert.ok(!/recordDrillMastery\(/.test(routeSrc), "11b. and never the undifferentiated boolean form");
  assert.ok(routeSrc.indexOf("decaDrillPersistenceRequest(") < routeSrc.indexOf("recordDrillMasteryDetailed("),
    "11c. and decides whether to call BEFORE calling");
  assert.ok(/if \(plan && skill\.skillSlug\) \{/.test(routeSrc), "11d. the call is guarded by a non-null plan");
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
  assert.deepEqual(await recordDrillMasteryDetailed({ userId: "u1", skillSlug: "deca-performance-indicators", scorePercent: 80, passed: true }),
    { status: "updated" }, "15. a successful write reports updated");
  const wrote = stub.calls.find((c) => c.op === "masteryProgress.create");
  assert.equal(wrote?.data.masteryPercent, 80, "15a. and the EVIDENCE score is what was written");
  assert.equal(wrote?.data.masteryLevel, "PRACTICING", "15a2. at the level that score earns");
  assert.ok(stub.calls.some((c) => c.op === "review.create"), "15a3. and a review was scheduled");

  resetStub("missing");
  assert.deepEqual(await recordDrillMasteryDetailed({ userId: "u1", skillSlug: "deca-business-reasoning", scorePercent: 80, passed: true }),
    { status: "skill-missing" }, "15b. an absent row reports skill-missing");
  assert.equal(stub.calls.length, 0, "15b2. and writes nothing");

  resetStub("write-throws");
  assert.deepEqual(await recordDrillMasteryDetailed({ userId: "u1", skillSlug: "deca-customer-relations", scorePercent: 80, passed: true }),
    { status: "write-failed" }, "15c. a failing write reports write-failed");

  resetStub("lookup-throws");
  assert.deepEqual(await recordDrillMasteryDetailed({ userId: "u1", skillSlug: "deca-customer-relations", scorePercent: 80, passed: true }),
    { status: "write-failed" }, "15d. a failing LOOKUP is write-failed, never skill-missing");
  // CONTROL: 15d is the whole point of the split — a query that could not run has not proven absence.
  control("a thrown lookup is not reported as a missing skill",
    (await recordDrillMasteryDetailed({ userId: "u1", skillSlug: "x", scorePercent: 1, passed: false })).status !== "skill-missing");

  // A properly evidenced FAILED DUE review still knocks mastery down — the behaviour the floor protects.
  resetStub("found");
  stub.existingMastery = 90;
  stub.reviewDueAt = new Date(Date.now() - 60_000);
  assert.deepEqual(await recordDrillMasteryDetailed({ userId: "u1", skillSlug: "deca-performance-indicators", scorePercent: 60, passed: false }),
    { status: "updated" }, "15e. a qualifying failed due review is still recorded");
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
  const perSkillLoop = routeSrc.slice(routeSrc.indexOf("for (const skill of result.perSkill)"));
  assert.ok(perSkillLoop.includes("recordDrillMasteryDetailed("), "17. persistence is decided inside the per-skill loop");
  assert.ok(/persistenceStatus = outcome\.status/.test(perSkillLoop), "17b. each skill reports its OWN outcome");
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
                      "app/api/hosa/medterm/submit/route.ts",                                // 26 HOSA
                      "prisma/schema.prisma",                                                // 27 schema
                      "prisma/seed.ts",                                                      // 28 seed
                      "lib/education/registry.ts", "lib/education/tracks/debate.ts",
                      "components/lessons/lesson-practice.tsx", "app/(app)/skills/[slug]/page.tsx"]) {
    assert.equal(nowSha(file), headSha(file), `24-28. ${file} is byte-identical to HEAD`);
  }
  // ---- 25b-25f. what the Debate byte-pins were protecting, asserted exactly ---------------------------
  const debateRoute = read("app/api/debate/drills/submit/route.ts");
  // (i) The Debate route still consumes the BOOLEAN wrapper — the whole reason recordDrillMastery must
  //     stay backward-compatible. If Debate ever switched to the detailed form, that guarantee is moot.
  assert.ok(/const wrote = await recordDrillMastery\(/.test(debateRoute),
    "25b. the Debate caller still uses the boolean contract, by name");
  assert.ok(!debateRoute.includes("recordDrillMasteryDetailed"),
    "25b2. and never the detailed form reserved for DECA");
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
  for (const copy of ["Practice only", "Keep practicing", "Progress and review updated", "Not tracked yet",
                      "Progress not saved", "Repeated questions count once toward progress",
                      "Focused skill sessions can update your progress"]) {
    assert.ok(componentCode.includes(copy), `29d. the result contract renders "${copy}"`);
  }
  assert.ok(!/mastery \+ review updated|not yet tracked</.test(componentCode), "29e. the old two-state copy is gone");

  // Every combination the UI can actually reach, run through the REAL branch function. A state must
  // never be conveyed by colour: each returns a badge whose WORDS carry the meaning.
  const { resultState } = await import("../components/training/concept-drills");
  const row = (evidenceStatus: string, persistenceStatus: string, extra: Record<string, number> = {}) =>
    resultState({ area: "performance-indicators", label: "Performance indicators", skillSlug: "deca-performance-indicators",
      total: 5, correct: 4, scorePercent: 80, uniqueTotal: 5, uniqueCorrect: 4, requiredUnique: DECA_DRILL_REQUIRED_UNIQUE,
      evidenceScore: 80, reviewScheduled: persistenceStatus === "updated", passed: evidenceStatus === "passing",
      ...extra, evidenceStatus, persistenceStatus } as Parameters<typeof resultState>[0]);
  const combos: Array<[string, string, string]> = [
    ["insufficient-evidence", "not-attempted", "Practice only"],
    ["below-threshold", "updated", "Keep practicing"],
    ["passing", "updated", "Progress and review updated"],
    ["below-threshold", "skill-missing", "Not tracked yet"],
    ["passing", "skill-missing", "Not tracked yet"],
    ["below-threshold", "write-failed", "Progress not saved"],
    ["passing", "write-failed", "Progress not saved"],
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
  assert.ok(/if \(plan && skill\.skillSlug\)/.test(routeSrc) && /let persistenceStatus: PersistenceStatus = "not-attempted"/.test(routeSrc),
    "29f2. persistence status starts at not-attempted and only the guarded branch changes it");
  for (let n = 1; n < DECA_DRILL_REQUIRED_UNIQUE; n += 1) {
    const ev = piEvidence(distinctPi(n, n));
    assert.equal(ev.evidenceStatus, "insufficient-evidence", `29f3. ${n} unique is insufficient`);
    assert.equal(decaDrillPersistenceRequest(ev), null, `29f4. so its plan is null and persistence stays not-attempted`);
  }

  // A write failure must never be described as an unseeded skill, and vice versa.
  assert.ok(!/not.*(set up|available)/i.test(row("passing", "write-failed").explanation ?? ""),
    "29h. a failed write is not reported as a missing skill");
  assert.ok(/Try again later/.test(row("passing", "write-failed").explanation ?? ""),
    "29h2. it tells the learner their graded work simply was not saved");
  assert.ok(/not available for this skill yet/.test(row("passing", "skill-missing").explanation ?? ""),
    "29i. and a missing row says exactly that");
  // CONTROL: the branch function really discriminates — the same evidence with different
  // persistence produces different copy, so the second status field is load-bearing.
  control("persistence status alone changes the learner-facing result",
    new Set(["updated", "skill-missing", "write-failed"].map((p) => row("passing", p).badge)).size === 3);
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
