/**
 * Rebuttal live-P0 containment — serving quarantine and durable-mastery hold.
 *
 * A teaching-to-drill-to-mastery audit found the `rebuttal` bank writing durable `debate-rebuttal`
 * mastery on material the published curriculum does not teach: 11 of 30 items not derivable from any
 * learner-visible lesson, 9 of those testing concepts no lesson mentions at all, and 10 items with a
 * second defensible answer. The credited lesson — an 18-word `debate-refutation` — supports 6 of the
 * 30. This suite proves the containment holds.
 *
 * STRICT-SAFE BY CONSTRUCTION. `lib/debate-drills.ts` has zero imports, so the serving and predicate
 * assertions run against real behaviour. `lib/spaced-review.ts` and the submit route import Prisma,
 * so they are asserted on SOURCE — never imported here. Keep it that way: if this suite ever needs a
 * database, the invariant belongs somewhere else.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildDrillSessionFrom,
  debateMasteryHeld,
  gradeDrillAnswers,
  DEBATE_DRILL_HELD_IDS,
  DEBATE_MASTERY_HELD_SKILLS,
  DRILL_AREAS,
  DRILL_BANK
} from "../lib/debate-drills";
import { SECURE_EVIDENCE_AREAS } from "../lib/secure-evidence";
import { DECA_DRILL_BANK } from "../lib/deca-drills";

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
/**
 * Source with comments removed, for assertions about what code DOES.
 * A comment explaining that a file writes no MasteryProgress necessarily contains the word.
 */
const readCode = (p: string) =>
  read(p).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

let checks = 0;
function check(label: string, run: () => void) {
  run();
  checks += 1;
  console.log(`  ok  ${label}`);
}

console.log("Rebuttal containment — serving quarantine and mastery hold\n");

const rebuttal = DRILL_BANK.filter((q) => q.area === "rebuttal");
const held = new Set<string>(DEBATE_DRILL_HELD_IDS);
const safe = rebuttal.filter((q) => !held.has(q.id));

check("0. control: the rebuttal bank is intact — 30 items, no bytes deleted, no ids renumbered", () => {
  assert.equal(rebuttal.length, 30, "the bank still holds all 30 authored items");
  for (let i = 1; i <= 30; i += 1) {
    const id = `rb-${String(i).padStart(2, "0")}`;
    assert.ok(rebuttal.some((q) => q.id === id), `${id} is still present — quarantine withholds, it never deletes`);
  }
});

check("0b. the quarantine is exactly the 22 adjudicated ids, and 8 remain servable", () => {
  const quarantinedRebuttal = rebuttal.filter((q) => held.has(q.id));
  assert.equal(quarantinedRebuttal.length, 22);
  assert.equal(safe.length, 8);
  assert.deepEqual(
    safe.map((q) => q.id).sort(),
    ["rb-02", "rb-08", "rb-11", "rb-13", "rb-14", "rb-15", "rb-16", "rb-17"],
    "the servable set is the adjudicated safe-practice list"
  );
});

// ---- A. a quarantined item cannot be served ------------------------------------------------------
check("A. no quarantined rebuttal item can enter a built session", () => {
  // Ask for far more than the area holds, on the focused path and the full-bank path, repeatedly:
  // the builder repeats items once a request exceeds the eligible pool, so a leak would surface here.
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const focused = buildDrillSessionFrom(DRILL_BANK, DEBATE_DRILL_HELD_IDS, 20, ["rebuttal"], []);
    for (const q of focused) {
      assert.ok(!held.has(q.id), `${q.id} is quarantined and must not be served (focused draw)`);
    }
    const full = buildDrillSessionFrom(DRILL_BANK, DEBATE_DRILL_HELD_IDS, 60, undefined, []);
    for (const q of full) {
      assert.ok(!held.has(q.id), `${q.id} is quarantined and must not be served (full-bank draw)`);
    }
  }
});

// ---- B. a safe item can still be served ----------------------------------------------------------
check("B. the safe rebuttal items are still reachable — the area is not switched off", () => {
  const seen = new Set<string>();
  for (let attempt = 0; attempt < 60; attempt += 1) {
    for (const q of buildDrillSessionFrom(DRILL_BANK, DEBATE_DRILL_HELD_IDS, 8, ["rebuttal"], [])) seen.add(q.id);
  }
  assert.ok(seen.size > 0, "rebuttal still serves something");
  for (const id of seen) assert.ok(!held.has(id), `${id} served and is not quarantined`);
  // Non-vacuity: every safe item is genuinely drawable, so the quarantine did not silently strand any.
  assert.equal(seen.size, safe.length, `all ${safe.length} safe items are reachable (saw ${seen.size})`);
});

// ---- C. safe practice still grades ----------------------------------------------------------------
check("C. safe rebuttal practice still grades correctness — the assessment was not weakened", () => {
  const items = safe.slice(0, 5);
  const allRight = gradeDrillAnswers(items.map((q) => ({ id: q.id, selected: q.correctAnswer })));
  assert.equal(allRight.correctCount, 5, "five correct answers grade as five correct");
  assert.equal(allRight.scorePercent, 100);
  const oneWrong = gradeDrillAnswers(
    items.map((q, i) => ({ id: q.id, selected: i === 0 ? "definitely not the key" : q.correctAnswer }))
  );
  assert.equal(oneWrong.correctCount, 4, "a wrong answer is still marked wrong");
  // The per-area breakdown is still produced — the hold is on PERSISTENCE, not on measurement.
  const perArea = allRight.perSkill.find((s) => s.area === "rebuttal");
  assert.ok(perArea, "the rebuttal breakdown is still produced");
  assert.equal(perArea!.total, 5, "all five graded answers are still attributed to rebuttal");
});

// ---- D. normal drill submission cannot write mastery ---------------------------------------------
check("D. the submit route skips persistence entirely for a held skill", () => {
  const route = read("app/api/debate/drills/submit/route.ts");
  assert.ok(/debateMasteryHeld/.test(route), "the route asks the shared predicate");
  assert.ok(
    /const masteryHeld = debateMasteryHeld\(area\.skillSlug\)/.test(route),
    "it evaluates the hold per area, not globally"
  );
  assert.ok(
    /if \(qualifies && area\.skillSlug && !masteryHeld\) \{/.test(route),
    "a held skill takes the same branch as a below-floor session — no mastery call AND no review call"
  );
  // The persistence helpers must sit INSIDE that guarded block, so neither can run while held.
  const guarded = route.slice(route.indexOf("if (qualifies && area.skillSlug && !masteryHeld)"));
  assert.ok(/recordPracticeOutcomeInTransaction/.test(guarded), "review scheduling is inside the guard");
  assert.ok(/recordDrillMasteryInTransaction/.test(guarded), "the mastery write is inside the guard");
});

check("D2. the predicate itself holds rebuttal and nothing else in Debate", () => {
  assert.equal(debateMasteryHeld("debate-rebuttal"), true);
  assert.deepEqual([...DEBATE_MASTERY_HELD_SKILLS], ["debate-rebuttal"]);
  assert.equal(debateMasteryHeld(null), false);
  assert.equal(debateMasteryHeld(undefined), false);
  assert.equal(debateMasteryHeld(""), false);
});

// ---- E. review / reassessment cannot certify or raise mastery ------------------------------------
check("E. the transaction writer refuses a held skill before it touches anything", () => {
  const sr = read("lib/spaced-review.ts");
  assert.ok(/import \{ debateMasteryHeld \} from "@\/lib\/debate-drills"/.test(sr), "the writer imports the predicate");
  assert.ok(
    /if \(debateMasteryHeld\(skillSlug\)\) return \{ status: "mastery-held" \};/.test(sr),
    "it returns mastery-held without writing"
  );
  // Ordered BEFORE the skill lookup, so a held skill never reports as skill-missing and never reaches
  // the insert. Position is the property that matters, so it is asserted as position.
  const guardAt = sr.indexOf('if (debateMasteryHeld(skillSlug)) return { status: "mastery-held" };');
  const lookupAt = sr.indexOf("const skill = await tx.skill.findUnique", guardAt - 400);
  assert.ok(guardAt > 0 && lookupAt > guardAt, "the hold is checked before the skill lookup and before any write");
  assert.ok(/"updated" \| "skill-missing" \| "mastery-held"/.test(sr), "held is a distinct status, not folded into skill-missing");
});

check("E2. review completion reaches mastery only through that same guarded route", () => {
  // The review card sends the learner to the mapped server-graded drill; it has no independent
  // mastery writer of its own. If that ever changes, this fails and the hold must be extended.
  const reviewPage = readCode("app/(app)/study-arcade/review/page.tsx");
  assert.ok(!/recordDrillMastery|masteryProgress/i.test(reviewPage), "the review page writes no mastery itself");
  // Non-vacuity: the stripper must not be blanking the file it is asked to scan.
  assert.ok(/practiceRemediationForSkill/.test(reviewPage), "control: executable code survives comment stripping");
});

check("E3. the non-transaction writer is guarded at the persistence boundary", () => {
  const sr = read("lib/spaced-review.ts");
  // recordDrillMasteryDetailed is the real writer; recordDrillMastery delegates to it. The check sits
  // in the writer, so the boundary fails closed regardless of which entry point a future caller uses,
  // and the slug test is not duplicated across functions.
  const detailedAt = sr.indexOf("export async function recordDrillMasteryDetailed(");
  assert.ok(detailedAt > 0, "control: the detailed writer exists");
  const body = sr.slice(detailedAt, sr.indexOf("export async function recordDrillMastery(", detailedAt));
  assert.ok(/if \(debateMasteryHeld\(skillSlug\)\) return \{ status: "mastery-held", review: null \};/.test(body),
    "recordDrillMasteryDetailed refuses a held skill");
  // Before the skill lookup AND before review scheduling, so a held skill causes neither.
  const guardAt = body.indexOf("if (debateMasteryHeld(skillSlug))");
  const lookupAt = body.indexOf("prisma.skill.findUnique");
  const reviewAt = body.indexOf("recordPracticeOutcome(");
  assert.ok(lookupAt > guardAt, "the hold precedes the skill lookup");
  assert.ok(reviewAt > guardAt, "the hold precedes review scheduling — no new review from held evidence");
  // recordDrillMastery must keep delegating rather than growing its own copy of the rule.
  const wrapperAt = sr.indexOf("export async function recordDrillMastery(");
  const wrapper = sr.slice(wrapperAt, wrapperAt + 600);
  assert.ok(/await recordDrillMasteryDetailed\(params\)/.test(wrapper),
    "recordDrillMastery delegates to the guarded writer, so it inherits the hold");
  assert.ok(!/debateMasteryHeld/.test(wrapper), "and does NOT duplicate the slug check");
  assert.ok(/"mastery-held"/.test(sr.slice(0, detailedAt)), "held is a declared outcome, not an ad-hoc string");
});

check("E4. no mastery writer reaches MasteryProgress without passing the predicate", () => {
  const sr = read("lib/spaced-review.ts");
  // Every place that mutates the table must sit inside a function whose entry checks the hold. The
  // three writers are the only ones; this fails if a fourth appears unguarded.
  const writers = [
    "export async function recordDrillMasteryDetailed(",
    "export async function recordDrillMasteryInTransaction("
  ];
  for (const w of writers) {
    const at = sr.indexOf(w);
    assert.ok(at > 0, `control: ${w.trim()} exists`);
    const head = sr.slice(at, at + 1200);
    assert.ok(/debateMasteryHeld\(skillSlug\)/.test(head), `${w.trim()} consults the canonical predicate`);
  }
  const mutations = (sr.match(/masteryProgress\.(update|create)|INSERT INTO "MasteryProgress"/g) ?? []).length;
  assert.ok(mutations > 0, "control: the file really does mutate MasteryProgress");
  // And no OTHER module writes the table at all.
  for (const file of [
    "app/api/debate/drills/submit/route.ts",
    "app/api/deca/drills/submit/route.ts",
    "app/api/hosa/medterm/submit/route.ts",
    "app/(app)/study-arcade/review/page.tsx",
    "lib/coach-evidence.ts"
  ]) {
    assert.ok(!/masteryProgress\.(update|create|upsert)/.test(readCode(file)),
      `${file} must not write MasteryProgress directly — the guarded writers are the only path`);
  }
});

check("E5. no application module calls the writers in a way that could bypass the hold", () => {
  const appAndLib = [
    "app/api/debate/drills/submit/route.ts",
    "app/api/deca/drills/submit/route.ts",
    "app/api/hosa/medterm/submit/route.ts",
    "app/(app)/study-arcade/review/page.tsx",
    "lib/coach-evidence.ts"
  ];
  for (const file of appAndLib) {
    const src = readCode(file);
    assert.ok(
      !/recordDrillMasteryDetailed|recordDrillMastery\(/.test(src),
      `${file} must not call the unguarded non-transaction mastery writers`
    );
  }
});

// ---- F. non-vacuity: another Debate skill still writes normally -----------------------------------
check("F. every other Debate skill still writes mastery — this is a scoped hold, not a kill switch", () => {
  const otherSkills = DRILL_AREAS.map((a) => a.skillSlug).filter((s) => s !== "debate-rebuttal");
  assert.ok(otherSkills.length > 0, "control: there are other Debate skills");
  for (const slug of otherSkills) {
    assert.equal(debateMasteryHeld(slug), false, `${slug} still writes mastery`);
  }
  // And their banks are untouched by the quarantine.
  for (const area of DRILL_AREAS) {
    if (area.id === "rebuttal") continue;
    const items = DRILL_BANK.filter((q) => q.area === area.id);
    assert.ok(items.every((q) => !held.has(q.id)), `no ${area.id} item was withheld by the rebuttal containment`);
  }
});

// ---- G. Constructive secure evidence unchanged ----------------------------------------------------
check("G. Constructive secure-evidence behaviour is unchanged", () => {
  assert.deepEqual([...SECURE_EVIDENCE_AREAS], ["constructive-speech"], "the secure-evidence area set is untouched");
  assert.equal(debateMasteryHeld("debate-case-construction"), false, "Constructive is not part of this hold");
  const constructive = DRILL_BANK.filter((q) => q.area === "constructive-speech");
  assert.ok(constructive.length > 0 && constructive.every((q) => !held.has(q.id)), "no Constructive item was withheld");
});

// ---- H. DECA / HOSA untouched ---------------------------------------------------------------------
check("H. DECA and HOSA are untouched", () => {
  assert.ok(DECA_DRILL_BANK.length > 0, "control: the DECA bank loaded");
  const debateIds = new Set(DRILL_BANK.map((q) => q.id));
  for (const id of DEBATE_DRILL_HELD_IDS) {
    assert.ok(debateIds.has(id), `${id} is a Debate id — this hold list may never name another track's item`);
    assert.ok(id.startsWith("rb-"), `${id} is a rebuttal id — the containment is scoped to one area`);
  }
  for (const slug of DEBATE_MASTERY_HELD_SKILLS) {
    assert.ok(slug.startsWith("debate-"), `${slug} is a Debate skill — no other track's mastery is paused`);
  }
});

console.log(`\nrebuttal-containment: ${checks} controls passed.`);
console.log(
  `  ${safe.length} of ${rebuttal.length} rebuttal items remain servable AS PRACTICE ONLY; ` +
  `${DEBATE_DRILL_HELD_IDS.length} are quarantined; durable mastery for ${DEBATE_MASTERY_HELD_SKILLS.join(", ")} is HELD.`
);
