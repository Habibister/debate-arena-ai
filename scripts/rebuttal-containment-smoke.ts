/**
 * Rebuttal live-P0 containment — serving quarantine and durable-mastery hold.
 *
 * A teaching-to-drill-to-mastery audit found the `rebuttal` bank writing durable `debate-rebuttal`
 * mastery on material the published curriculum does not teach: 11 of 30 items not derivable from any
 * learner-visible lesson, 9 of those testing concepts no lesson mentions at all, and 10 items with a
 * second defensible answer. At the time of that audit the credited lesson was an 18-word
 * `debate-refutation` supporting 6 of the 30. **That lesson was rebuilt in M15 S5** — structured
 * teaching, a repaired worked example, a misconception, common mistakes and three checks — so the
 * teaching side of the gap has narrowed. The containment did NOT change with it: the 22 quarantined
 * items are still quarantined, durable `debate-rebuttal` mastery is still held, and a rebuilt lesson
 * is not by itself evidence that any item is safe to serve for mastery again. Releasing an item is a
 * separate decision with its own acceptance gate. This suite proves the containment holds.
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
  DEBATE_DRILL_REQUIRED_UNIQUE,
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
  assert.ok(/import \{[^}]*\bdebateMasteryHeld\b[^}]*\} from "@\/lib\/debate-drills"/.test(sr),
    "the writer imports the predicate");
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
  // And no OTHER area's bank was touched. The Signposting containment (2026-09-06) is the second
  // deliberate use of the same mechanism and is adjudicated separately in P below, so it is named
  // here rather than allowed to widen this control into "holds may appear anywhere".
  const ADJUDICATED_AREAS = new Set(["rebuttal", "signposting"]);
  for (const area of DRILL_AREAS) {
    if (ADJUDICATED_AREAS.has(area.id)) continue;
    const items = DRILL_BANK.filter((q) => q.area === area.id);
    assert.ok(items.every((q) => !held.has(q.id)), `no ${area.id} item was withheld — holds stay inside adjudicated areas`);
  }
  assert.equal(DRILL_BANK.filter((q) => q.area === "signposting" && held.has(q.id)).length, 2,
    "and the Signposting hold is exactly its two adjudicated items, not an area-wide switch-off");
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
    // Was `startsWith("rb-")`, which encoded WHICH area had been adjudicated rather than the property
    // that matters for track isolation: a hold may only name an item of an adjudicated Debate area.
    const area = DRILL_BANK.find((q) => q.id === id)?.area;
    assert.ok(area === "rebuttal" || area === "signposting",
      `${id} sits in an adjudicated Debate area (${area}) — a hold never reaches an unaudited area or another track`);
  }
  for (const slug of DEBATE_MASTERY_HELD_SKILLS) {
    assert.ok(slug.startsWith("debate-"), `${slug} is a Debate skill — no other track's mastery is paused`);
  }
});

// ---- I. learner-facing copy may not promise a record a held skill does not keep --------------------
check("I. the lesson drill CTA claims a durable record only where the skill actually records", () => {
  const view = read("components/lessons/concept-education-lesson-view.tsx");
  // The claim and the neutral alternative both exist, and the claim is behind the flag.
  assert.ok(/that is where your\s+record of this skill starts/.test(view), "control: the recording claim still exists for skills that record");
  assert.ok(/drillKeepsARecord \? \(/.test(view), "the recording claim is conditional, not unconditional");
  assert.ok(/does not add to your record either right now/.test(view),
    "a held skill gets wording that states the drill does not record either — not a contrast implying it does");
  // Derived from the AREA's skill through the shared predicate — not a lesson allowlist, so a lesson
  // pointing at a held area cannot keep the claim by being forgotten.
  assert.ok(/DRILL_AREAS\.find\(\(area\) => area\.id === practiceDrill\.area\)\?\.skillSlug/.test(view),
    "the flag reads the drill area's own skill");
  assert.ok(/const drillKeepsARecord = !skillRecordSuspended\(drillSkillSlug\)/.test(view),
    "and passes it through the one canonical hold predicate");
  assert.ok(/debateMasteryHeld as skillRecordSuspended/.test(view),
    "the alias really is the shared predicate, not a second local rule — it is aliased only because a separate control keeps that vocabulary out of this view");
  // Ordering: the claim must sit in the TRUE branch and the neutral wording in the false branch.
  const claimAt = view.indexOf("that is where your");
  const branchAt = view.indexOf("drillKeepsARecord ? (");
  const elseAt = view.indexOf("does not add to your record either right now");
  assert.ok(branchAt > 0 && claimAt > branchAt && elseAt > claimAt,
    "the recording claim is the true branch and the practice-only wording is the false branch");
});

check("I2. every published lesson pointing at a held area loses the claim, and no other does", () => {
  // Real evaluation of the same expression the component computes, for every registered area.
  const recordingAreas = DRILL_AREAS.filter((a) => !debateMasteryHeld(a.skillSlug)).map((a) => a.id);
  const heldAreas = DRILL_AREAS.filter((a) => debateMasteryHeld(a.skillSlug)).map((a) => a.id);
  assert.deepEqual(heldAreas, ["rebuttal"], "rebuttal is the only area whose skill is held");
  assert.ok(recordingAreas.length >= 5, "control: most areas still record, so this is not a blanket removal");
  for (const id of ["clash", "weighing", "evidence-evaluation"] as const) {
    assert.ok(recordingAreas.includes(id), `${id} keeps the truthful recording copy`);
  }
});

// ---- J. a held skill is never an ACTIONABLE due review ------------------------------------------
check("J. due-review eligibility excludes a held skill, without touching its data", () => {
  const sr = readCode("lib/spaced-review.ts");
  assert.ok(/async function heldReviewSkillIds\(\)/.test(sr), "there is one place that resolves held skill ids");
  // FAIL CLOSED. `heldReviewSkillIds` returns null when it cannot resolve the held set, and both
  // readers must treat that as "prove nothing safe" rather than "nothing is held" — an empty array
  // there would apply NO filter and surface exactly the rows this exists to withhold.
  assert.ok(/Promise<string\[\] \| null>/.test(sr), "the held-set resolver can report failure distinctly from an empty hold");
  assert.ok(/catch \{[\s\S]{0,80}return null;/.test(sr), "and it returns null on failure, not an empty list");
  // ONE gate, shared. The count and the list previously filtered differently, so the learner could be
  // told "1 skill is due", click through, and be told "Nothing due" — the same dead end, one step on.
  assert.ok(/async function dueReviewRowsWithSkills\(/.test(sr), "there is a single shared due-row gate");
  const gateAt = sr.indexOf("async function dueReviewRowsWithSkills(");
  const gate = sr.slice(gateAt, sr.indexOf("export async function countDueReviews"));
  assert.ok(/heldReviewSkillIds\(\)/.test(gate), "the gate consults the held set");
  assert.ok(/if \(held === null(?: \|\| [A-Za-z]+ === null)* \) return null;|if \(held === null(?: \|\| [A-Za-z]+ === null)*\) return null;/.test(gate),
    "and propagates the fail-closed signal");
  // P1-C.2 changed the MECHANISM, not the property. The gate used to exclude held skills with
  // `skillId: { notIn: held }`; now that the query is also scoped to one track, the held ids are
  // subtracted from that track's eligible ids and the query filters `skillId: { in: eligibleIds }`.
  // What must stay true is that the exclusion happens IN THE QUERY — a held row must never be
  // fetched and then hidden — and that the subtraction really consults the held set.
  assert.ok(/skillId: \{ notIn: held \}/.test(gate) ||
            (/const eligibleIds = inTrack\.filter\(\(id\) => !heldInTrack\.has\(id\)\);/.test(gate) &&
             /skillId: \{ in: eligibleIds \}/.test(gate)),
    "the gate excludes held skills from the query itself, not after it");
  assert.ok(/new Set\(held\)/.test(gate) || /notIn: held/.test(gate),
    "and the exclusion is built from the canonical held set");
  for (const fn of ["countDueReviews", "getDueReviews"]) {
    const at = sr.indexOf(`export async function ${fn}`);
    assert.ok(at > 0, `control: ${fn} exists`);
    const body = sr.slice(at, at + 1400);
    assert.ok(/dueReviewRowsWithSkills\(/.test(body), `${fn} answers through the shared gate`);
    assert.ok(/=== null \? 0 : |if \(due === null\) return \[\];/.test(body), `${fn} fails closed when the gate cannot prove a row safe`);
    assert.ok(!/prisma\.skillReviewSchedule/.test(body), `${fn} does not re-query the schedule behind the gate`);
  }
  // Second gate by slug, applied inside the shared gate AND again in the list path, so a stale or
  // missing Skill row cannot let one through. `SkillReviewSchedule.skillId` has no foreign key.
  // P1-C.2 added a third condition to the same defensive filter (the row's Skill must belong to the
  // active track). The property is unchanged: whatever the cheap id-level query does, this pass drops
  // any row the list would refuse, so the count can never promise a card the list will not render.
  assert.ok(/return Boolean\(skill\) && .*!debateMasteryHeld\(skill!\.slug\);/.test(gate),
    "the shared gate drops any row whose Skill is missing or held, so the count sees what the list will show");
  assert.ok(/skill!\.organization === organization/.test(gate),
    "and drops any row whose Skill belongs to another track, compared on Skill.organization itself");
  assert.ok(/if \(debateMasteryHeld\(skill\.slug\)\) return \[\];/.test(sr),
    "the list path also drops a held skill after resolving its slug");
  // The READ path is a filter, not a mutation: withdrawing actionability must never edit the row.
  // Scoped to the two readers plus the helper — `recordPracticeOutcome` elsewhere in this module
  // legitimately updates schedules, and a whole-file ban would forbid that too.
  const readPathStart = sr.indexOf("async function heldReviewSkillIds()");
  const readPathEnd = sr.indexOf("export async function recordDrillMasteryDetailed");
  assert.ok(readPathStart > 0 && readPathEnd > readPathStart, "control: the due-review read path is locatable");
  const readPath = sr.slice(readPathStart, readPathEnd);
  for (const banned of ["skillReviewSchedule.delete", "skillReviewSchedule.update", "skillReviewSchedule.upsert",
                        "masteryProgress.update", "masteryProgress.delete"]) {
    assert.ok(!readPath.includes(banned), `the due-review read path never mutates data (${banned})`);
  }
  assert.ok(/skillReviewSchedule\.(count|findMany)/.test(readPath), "control: it does read the table, so this is not vacuous");
});

check("J2. every due-review consumer inherits the filter — no consumer queries the table itself", () => {
  for (const file of [
    "app/(app)/study-arcade/review/page.tsx",
    "app/(app)/study-arcade/page.tsx",
    "app/(app)/home/page.tsx",
    "lib/coach-evidence.ts"
  ]) {
    const src = readCode(file);
    assert.ok(/getDueReviews|countDueReviews/.test(src), `control: ${file} really is a due-review consumer`);
    assert.ok(!/skillReviewSchedule/.test(src),
      `${file} must read due reviews through the filtered helpers, never the table directly`);
  }
});

// ---- K. teaching before PROMOTED durable practice -------------------------------------------------
check("K. no lesson promotes mastery-writing practice above its own instruction", () => {
  const page = readCode("app/(app)/lessons/[slug]/page.tsx");
  // The legacy Claim/Warrant/Impact lesson is the only lesson practice that writes durable mastery.
  const cwiNav = page.match(/nav=\{<OnThisPage[^>]*sections=\{DEBATE_SECTIONS\}[^>]*\/>\}/);
  assert.ok(cwiNav, "control: the mastery-writing lesson still renders its section navigation");
  assert.ok(!/jump=/.test(cwiNav![0]),
    "it must not carry a promoted jump — that button sat above every teaching section and led to recorded assessment");
  // Navigation is not reduced: Practice is still reachable from the section list.
  assert.ok(/\{ id: "practice", label: "Practice" \}/.test(page),
    "K2. Practice is still a section entry, so the destination and keyboard access survive");
  // And the concept renderer, which is already teach-first, still has no jump of its own.
  assert.equal((read("components/lessons/concept-education-lesson-view.tsx").match(/OnThisPage/g) ?? []).length, 0,
    "K3. concept lessons still carry no skip affordance at all");
});

// ---- L. capability-aware copy: held surfaces promise nothing durable ------------------------------
check("L. learner-facing practice copy is derived from capability, not asserted", () => {
  const drills = read("components/training/debate-drills.tsx");
  assert.ok(/debateMasteryHeld/.test(drills), "the drill component consults the shared predicate");
  // Derived on BOTH axes: which area the learner picked, and whether that area's skill records.
  assert.ok(/const progressNote = areaFilter === "mixed"/.test(drills),
    "its progress note is derived, not a fixed sentence");
  // WIDENED by the progress-truth repair: a mixed draw can include an area that cannot record for
  // EITHER reason — its mastery is held, or no Skill row exists for its slug — and an unresolved
  // capability counts as cannot-record, so the copy fails closed.
  assert.ok(/const someAreaCannotRecord = progressTracking === undefined/.test(drills),
    "L1b. a MIXED session is judged by whether any drawable area cannot record — held or unseeded");
  assert.ok(/\.some\(\(entry\) => !entry\.available\)/.test(drills),
    "L1c. including every area the server resolved as untracked");
  assert.ok(/const focusedTracking = areaFilter === "mixed" \? undefined : trackingFor\(areaFilter\)/.test(drills),
    "L1d. and a focused session is judged by its own area's resolved capability");
  assert.ok(/focusedTracking\?\.reason === "mastery-held"/.test(drills),
    "L1e. which still names the practice-mode case separately from the untracked one");
  assert.ok(!/Focused skill sessions can update your progress\. A mixed session[\s\S]{0,40}<\/p>/.test(drills),
    "the unconditional claim is no longer rendered directly");
  // The result badge must not blame the count or the score for a hold-caused non-write.
  const badgeAt = drills.indexOf("export function resultState");
  const badge = drills.slice(badgeAt, badgeAt + 1600);
  assert.ok(/debateMasteryHeld\(skill\.skillSlug\)/.test(badge),
    "L2. the result badge asks the predicate before attributing a non-write to evidence");
  const heldAt = badge.indexOf("debateMasteryHeld(skill.skillSlug)");
  const belowAt = badge.indexOf('evidenceStatus === "below-threshold"');
  assert.ok(heldAt > 0 && belowAt > heldAt, "L3. and it does so BEFORE the score-based branch");
});

check("L4. the broad platform promises no longer assert that everything records", () => {
  const claims: Array<[string, RegExp]> = [
    ["app/(app)/study-arcade/page.tsx", /drills that feed your real mastery/],
    ["app/(app)/home/page.tsx", /counts toward your real record/],
    ["app/(app)/training/[track]/event/[eventSlug]/page.tsx", /real mastery \+ spaced review/],
    ["components/skills/skill-path.tsx", /Skills you have drilled come back/],
    // Repaired in the same milestone: every one of these told a learner that PRACTISING starts or
    // advances a record. For a held skill that is false — practice is scored and explained, and
    // nothing is written — so each now speaks of skills that record rather than of practice itself.
    ["app/(app)/study-arcade/page.tsx", /practiced \$\{skillsInProgress === 1/],
    ["app/(app)/study-arcade/page.tsx", /practice a skill to start your review schedule/],
    ["app/(app)/study-arcade/page.tsx", /that changes with your first drill/],
    ["app/(app)/study-arcade/review/page.tsx", /to start their review schedule, then come back/],
    ["app/(app)/home/page.tsx", /reviews appear as you practice/],
    ["components/skills/skill-path.tsx", /Empty until you have practised something/],
    ["lib/dashboard-actions.ts", /guided practice, and a mastery check/],
    ["lib/dashboard-actions.ts", /plus anything due for review/]
  ];
  for (const [file, claim] of claims) {
    assert.ok(!claim.test(readCode(file)), `${file} no longer makes an unconditional record promise`);
  }
  // Non-vacuity: those files still say something about practice, so this is not passing on empty files.
  assert.ok(/skill drills/i.test(readCode("app/(app)/study-arcade/page.tsx")), "L5. control: the copy still exists");
});

check("L6. the replacement copy conditions the record on the SKILL, not on the act of practising", () => {
  // Each repaired sentence must still say something useful, and must tie any record/review promise to
  // skills that actually record. A held skill can be practised all day and nothing is written.
  const surfaces: Array<[string, RegExp]> = [
    ["app/(app)/study-arcade/page.tsx", /practised skills that record come up for review/],
    ["app/(app)/study-arcade/page.tsx", /Practise a skill that records, and its review schedule starts from there/],
    ["app/(app)/study-arcade/page.tsx", /with a recorded result so far/],
    // OWNER QA #4 reworded this empty state: for DECA it now points at the DECA drill surface instead
    // of /skills, which holds no DECA drill. The PROPERTY the pin protects is unchanged and is what is
    // asserted — the empty state ties a due review to practice that RECORDS, so decks and games are
    // never implied to produce one. Either wording satisfies it.
    ["app/(app)/study-arcade/review/page.tsx", /record your practice[^.]*review|that record your practice; their review schedule starts from there/],
    ["app/(app)/home/page.tsx", /reviews appear as skills record your practice/],
    ["lib/dashboard-actions.ts", /a check on what you learned/],
    ["lib/dashboard-actions.ts", /anything currently due for review/]
  ];
  for (const [file, present] of surfaces) {
    assert.ok(present.test(readCode(file)), `${file} carries its capability-aware replacement`);
  }
  // The Skill Path card keeps the conditional half and drops the unconditional emptiness promise.
  const path = readCode("components/skills/skill-path.tsx");
  assert.ok(/Skills that record your practice come back later on a spacing schedule/.test(path),
    "the review card still explains what review IS, conditioned on recording");
  assert.ok(/never shows a number you did not earn/.test(path), "and keeps the no-fake-progress promise");
});

// ---- P. SIGNPOSTING CONTAINMENT (2026-09-06) -----------------------------------------------------
// The same mechanism, second use. The Signposting integration audit found two of that area's thirty
// items testing judgments the repaired lesson deliberately does not teach — sp-16 turns on coverage
// triage under uncertainty, sp-24 on a retroactive re-file that sp-11 keys AGAINST and on reading the
// judge's private flow. Held, not rewritten and not deleted, and the lesson was NOT expanded to
// legitimise them: teaching new curriculum to save a servable item is the failure this guards.
check("P. sp-16 and sp-24 are contained, and the other 28 Signposting items are untouched", () => {
  const signposting = DRILL_BANK.filter((q) => q.area === "signposting");
  assert.equal(signposting.length, 30, "P0. control: the area is intact — nothing deleted");
  const quarantined = signposting.filter((q) => held.has(q.id)).map((q) => q.id).sort();
  assert.deepEqual(quarantined, ["sp-16", "sp-24"], "P1. exactly the two adjudicated ids are held");
  assert.equal(signposting.filter((q) => !held.has(q.id)).length, 28, "P2. and 28 remain servable");
  // Serving: neither id can reach a focused OR a mixed session, at any draw size.
  for (const areas of [["signposting"] as const, undefined]) {
    const served = buildDrillSessionFrom(DRILL_BANK, DEBATE_DRILL_HELD_IDS, 120, areas as never, []);
    for (const id of ["sp-16", "sp-24"]) {
      assert.ok(!served.some((q) => q.id === id), `P3. ${id} never serves (${areas ? "focused" : "mixed"})`);
    }
  }
  // Evidence: a held id cannot contribute to durable mastery, because it cannot be answered.
  const servedIds = new Set(buildDrillSessionFrom(DRILL_BANK, DEBATE_DRILL_HELD_IDS, 120, ["signposting"], []).map((q) => q.id));
  assert.ok(!servedIds.has("sp-16") && !servedIds.has("sp-24"),
    "P4. so neither can enter evidence, review scheduling or a session completion count");
  // The area still works: 28 items is far above the evidence floor, so containment starves nothing.
  assert.ok(servedIds.size >= DEBATE_DRILL_REQUIRED_UNIQUE,
    "P5. and the area still supplies more than the unique-question floor a record needs");
});

check("P6. the containment did not touch the items themselves, or the rebuttal holds", () => {
  const byId = (id: string) => DRILL_BANK.find((q) => q.id === id)!;
  for (const id of ["sp-16", "sp-24"]) {
    const item = byId(id);
    assert.ok(item, `P6a. ${id} is still IN the bank — held means unserved, never deleted`);
    assert.equal(item.area, "signposting", `P6b. ${id} keeps its area, so it is re-homable rather than rewritten`);
    assert.ok(item.choices.includes(item.correctAnswer), `P6c. ${id} keeps a coherent key`);
  }
  assert.equal(DEBATE_DRILL_HELD_IDS.filter((id) => id.startsWith("rb-")).length, 22,
    "P6d. the 22 rebuttal holds are unchanged by this containment");
  assert.equal(DEBATE_DRILL_HELD_IDS.length, 24, "P6e. and the held set grew by exactly two");
});

console.log(`\nrebuttal-containment: ${checks} controls passed.`);
console.log(
  `  ${safe.length} of ${rebuttal.length} rebuttal items remain servable AS PRACTICE ONLY; ` +
  `${DEBATE_DRILL_HELD_IDS.length} are quarantined; durable mastery for ${DEBATE_MASTERY_HELD_SKILLS.join(", ")} is HELD.`
);
