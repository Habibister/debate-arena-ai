/**
 * TEST PLAN MODEL SMOKE (phase H4-C1). Run with: npm run test-plan-model:smoke
 *
 * An official written test plan now has a real home. This suite protects the one distinction that
 * home exists to make:
 *
 *   A TEST PLAN SAYS WHAT THE TEST IS ABOUT. A RUBRIC SAYS HOW A PERFORMANCE IS SCORED.
 *
 * HOSA Medical Terminology publishes both, and they carry different numbers: a rubric of one row
 * worth 50 points, and a plan of twelve rows totalling 100 percent. Every collapse of the two tells
 * a learner something false and labels it official — "45 points" for a 45% content area, or a
 * 50-question test worth 100 points. The rules below are the ones that keep them apart, plus the
 * rules that stop a partly-transcribed plan from being stored as if it were the whole blueprint.
 *
 * The pure rules are EXECUTED. The schema and the seed are asserted from source: this suite must
 * never construct a Prisma client, because that reads .env and connects nothing here needs.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HOSA_MEDTERM_TEST_PLAN } from "@/lib/hosa-events";
import { testPlanIsUsable, testPlanProblems, testPlanRows, testPlanTotalWeight, type TestPlanRow } from "@/lib/test-plan";

const read = (file: string) => readFileSync(file, "utf8");
const flat = (source: string) => source.replace(/\s+/g, " ");

const results: string[] = [];
const ok = (message: string) => results.push(`  ok  ${message}`);

// ---- 1. THE PUBLISHED PLAN IS TRANSCRIBED WHOLE -----------------------------------------------

const MT = testPlanRows(HOSA_MEDTERM_TEST_PLAN);
assert.equal(MT.length, 12, "P1. the 2026-27 Medical Terminology plan has twelve rows");
assert.equal(testPlanTotalWeight(MT), 100, "P2. and they total 100 percent");
assert.deepEqual(testPlanProblems(MT), [], "P3. so the real plan is storable as official");
assert.equal(MT[0].key, "word-parts", "P4. word parts lead the published plan");
assert.equal(MT[0].weightPercent, 45, "P5. carrying 45 percent of the test");
assert.equal(MT.filter((row) => row.weightPercent === 5).length, 11, "P6. with eleven body-system rows at 5 percent");
assert.equal(new Set(MT.map((row) => row.key)).size, 12, "P7. and twelve distinct stable keys");
ok("the published plan: twelve rows, 45 + eleven fives = 100, all keys distinct");

// Published order is the guideline's order. Sorting by weight would silently rewrite the document.
const ASCENDING = [
  { id: "small", label: "Small", weight: 40 },
  { id: "large", label: "Large", weight: 60 }
];
assert.deepEqual(
  testPlanRows(ASCENDING).map((row) => row.key),
  ["small", "large"],
  "P8. rows keep the order the source published, even when the heaviest is last"
);
ok("published order is preserved rather than re-sorted");

// ---- 2. A PARTIAL TRANSCRIPTION IS NOT AN OFFICIAL PLAN ---------------------------------------

// The failure this prevents: someone reads nine of twelve rows, stores them, and the product shows a
// blueprint that is missing a quarter of the test while claiming to be the official one.
const problemCases: Array<[string, TestPlanRow[], RegExp]> = [
  ["weights short of 100", [{ key: "a", label: "A", order: 1, weightPercent: 90 }], /total 90, expected 100/],
  ["weights over 100", [{ key: "a", label: "A", order: 1, weightPercent: 140 }], /total 140, expected 100/],
  [
    "a duplicated key",
    [
      { key: "a", label: "A", order: 1, weightPercent: 50 },
      { key: "a", label: "Also A", order: 2, weightPercent: 50 }
    ],
    /duplicate key/
  ],
  ["a missing key", [{ key: "  ", label: "A", order: 1, weightPercent: 100 }], /missing key/],
  ["a missing label", [{ key: "a", label: "", order: 1, weightPercent: 100 }], /missing label/],
  [
    "a fractional weight",
    [
      { key: "a", label: "A", order: 1, weightPercent: 33.3 },
      { key: "b", label: "B", order: 2, weightPercent: 66.7 }
    ],
    /positive whole percent/
  ],
  [
    "a zero weight",
    [
      { key: "a", label: "A", order: 1, weightPercent: 0 },
      { key: "b", label: "B", order: 2, weightPercent: 100 }
    ],
    /positive whole percent/
  ],
  [
    "orders out of sequence",
    [
      { key: "a", label: "A", order: 2, weightPercent: 50 },
      { key: "b", label: "B", order: 3, weightPercent: 50 }
    ],
    /orders must be 1\.\.2/
  ]
];
for (const [label, rows, expected] of problemCases) {
  const problems = testPlanProblems(rows);
  assert.ok(problems.some((problem) => expected.test(problem)), `V. ${label} is reported: got ${JSON.stringify(problems)}`);
  assert.equal(testPlanIsUsable(rows), false, `V. ${label} is not storable as official`);
}
assert.deepEqual(testPlanProblems([]), ["plan has no rows"], "V9. an empty plan is empty, not complete");
assert.equal(testPlanIsUsable([]), false, "V10. and an empty plan is never usable");
assert.equal(testPlanIsUsable(MT), true, "V11. while the real plan passes every one of these rules");
ok("validation: short, over-long, duplicated, unlabelled, fractional, zero, misordered and empty plans all refused");

// ---- 3. THE SCHEMA GIVES THE PLAN ITS OWN TABLE -----------------------------------------------

const schema = read("prisma/schema.prisma");
const planModel = schema.match(/model SpecTestPlanRow \{[\s\S]*?\n\}/)?.[0] ?? "";
assert.ok(planModel, "S1. SpecTestPlanRow exists");
for (const [field, pattern] of [
  ["specId", /specId\s+String/],
  ["key", /key\s+String/],
  ["label", /label\s+String/],
  ["order", /order\s+Int/],
  ["weightPercent", /weightPercent\s+Int/]
] as const) {
  assert.ok(pattern.test(planModel), `S2. a plan row carries ${field}`);
}
assert.ok(/@@unique\(\[specId, key\]\)/.test(planModel), "S3. a key is stable within its spec");
assert.ok(/@@index\(\[specId, order\]\)/.test(planModel), "S4. and a spec's rows are read in published order");
assert.ok(
  /spec\s+CompetitionSpec @relation\(fields: \[specId\], references: \[id\], onDelete: Cascade\)/.test(planModel),
  "S5. rows belong to their spec and do not outlive it"
);
assert.ok(/testPlanRows\s+SpecTestPlanRow\[\]/.test(schema.match(/model CompetitionSpec \{[\s\S]*?\n\}/)?.[0] ?? ""),
  "S6. and the spec owns them");

// The separation, in the schema itself: a plan row has no points, and a rubric row has no percentage.
const rubricModel = schema.match(/model SpecRubricCategory \{[\s\S]*?\n\}/)?.[0] ?? "";
assert.ok(rubricModel, "S7. SpecRubricCategory still exists and is untouched");
assert.ok(!/\bpoints\b/.test(planModel), "S8. a test plan row has no points — it is not a score sheet");
assert.ok(!/weightPercent|\bweight\b/.test(rubricModel), "S9. a rubric row has no weight percent — it is not a blueprint");
assert.ok(/points\s+Int\?/.test(rubricModel), "S10. the rubric keeps its own nullable points");
ok("schema: the plan has its own cascading table, keyed and ordered, with no points on it and no percentages on the rubric");

// ---- 4. THE SEED WRITES THE PLAN AS A PLAN ----------------------------------------------------

const seed = read("scripts/seed-competition-specs.ts");
const seedFlat = flat(seed);

assert.ok(
  /testPlan: testPlanRows\(HOSA_MEDTERM_TEST_PLAN\)/.test(seed),
  "D1. the seeded plan is derived from the transcribed registry, not re-typed here"
);
assert.ok(
  /const \{ testPlan, \.\.\.columns \} = spec;/.test(seed) && /create: columns,\s*update: columns/.test(seed),
  "D2. the plan is not passed to the spec row as if it were a column"
);
assert.ok(
  /where: \{ specId_key: \{ specId: result\.id, key: row\.key \} \}/.test(seedFlat),
  "D3. plan rows are matched on their stable key, so a re-seed does not renumber them"
);
// Delete+recreate would break anything that later points at a row. Only rows the plan dropped may go.
const planDeletes = seedFlat.match(/specTestPlanRow\.deleteMany\(\{[^}]*\}[^)]*\)/g) ?? [];
assert.equal(planDeletes.length, 1, "D4. exactly one plan delete exists");
assert.ok(/key: \{ notIn:/.test(planDeletes[0]), "D5. and it removes only rows the published plan no longer lists");

// Nothing may be written until every plan has been checked.
const validateAt = seed.indexOf("testPlanProblems(spec.testPlan ?? [])");
const firstWriteAt = seed.indexOf("prisma.competitionSpec.upsert");
assert.ok(validateAt > -1 && firstWriteAt > -1 && validateAt < firstWriteAt,
  "D6. every plan is validated before the first write, so a bad plan cannot half-seed the registry");
assert.ok(/throw new Error\(`\[specs\] \$\{spec\.organization\}/.test(seed),
  "D7. and a bad plan stops the seed instead of being written");

// One active spec per event. Two active rows means the registry holds two answers to "what is current".
assert.ok(
  /organization: result\.organization, eventName: result\.eventName, isActive: true, id: \{ not: result\.id \} \}, data: \{ isActive: false \}/.test(seedFlat),
  "D8. upserting a spec retires any other active spec for the same event"
);
assert.ok(/deactivated \$\{superseded\.count\}/.test(seed),
  "D9. and says so, because it is the one write that touches rows the seed did not create");

// The HOSA rubric is still one 50-point row: the plan did not leak into it.
const hosaSpec = seed.slice(seed.indexOf('organization: "HOSA"'), seed.indexOf('organization: "MODEL_UN"'));
assert.ok(/totalPoints: 50/.test(hosaSpec), "D10. Medical Terminology is still scored out of 50 points");
assert.ok(
  (flat(hosaSpec).match(/\{ name: "Test score", points: 50/g) ?? []).length === 1,
  "D11. by exactly one rubric row — the twelve plan rows did not become rubric rows"
);
assert.notEqual(testPlanTotalWeight(MT), 50, "D12. and the plan's 100 percent is not the rubric's 50 points");
ok("seed: the plan is derived, keyed, validated before any write, and never becomes rubric points");

// ---- 5. THE SYNC IS DESIGNED, NOT DONE --------------------------------------------------------

const runbook = flat(read("docs/MEDTERM_SPEC_SYNC.md"));
assert.ok(/NOT executed/.test(runbook), "R1. the runbook states nothing has been applied");
assert.ok(/CREATE TABLE "SpecTestPlanRow"/.test(runbook), "R2. and carries the exact generated DDL");
assert.ok(/P3005/.test(runbook), "R3. recording why no prisma/migrations directory was created");
assert.ok(/deactivate|Deactivate/.test(runbook), "R4. and disclosing the one write that touches pre-existing rows");
ok("sync: designed, exact, and honest that it has not been run");

console.log(results.join("\n"));
console.log(
  "Test plan model smoke passed. EXECUTED: the 2026-27 Medical Terminology plan transcribes as twelve rows totalling " +
    "100 percent with twelve distinct keys, 45 percent on word parts and eleven body systems at 5; published order " +
    "survives transcription rather than being re-sorted by weight; and a plan is refused as official when its weights " +
    "fall short of or exceed 100, a key repeats or is blank, a label is blank, a weight is fractional or zero, orders " +
    "are out of sequence, or there are no rows at all. ASSERTED FROM SOURCE: SpecTestPlanRow is its own table, keyed " +
    "uniquely per spec, ordered, cascading from CompetitionSpec, carrying no points column, while SpecRubricCategory " +
    "keeps its nullable points and gains no percentage; the seed derives the plan from the transcribed registry, keeps " +
    "it out of the spec's own columns, matches rows on their stable key, deletes only rows the plan dropped, validates " +
    "every plan before its first write, aborts on a bad one, retires any other active spec for the same event and logs " +
    "that it did, and leaves Medical Terminology scored by exactly one 50-point rubric row; the sync runbook holds the " +
    "exact DDL and states it has not been applied. NOT PROVEN HERE: anything about the shared database — no client was " +
    "constructed and no connection was made. The table does not exist there yet."
);
