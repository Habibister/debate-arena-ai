/**
 * COACH TRUTH SMOKE (HOSA phase H1). Run with: npm run coach-truth:smoke
 *
 * Proves the three defects H1 closes, WITHOUT touching the database:
 *
 *   1. A practice-test average may never be displayed as "Mastery". Mastery is derived from mastery
 *      rows or it is null, and a real recorded 0 is still 0.
 *   2. A coach's student view is scoped to one organization — the team's — so practice-test scores,
 *      weak categories and mastery rows from another track cannot enter it.
 *   3. A recommendation names a capability the viewed track actually has. HOSA has no round, ballot or
 *      simulation, so no HOSA view may propose one; an unresolved track gets no recommendation at all.
 *
 * The behaviour lives in lib/coach-truth.ts, which is pure, so cases 1 and 3 are executed here rather
 * than inspected. Case 2 is a property of prisma WHERE clauses, so it is asserted against the source of
 * lib/coach-progress.ts — the one place those queries are written. That file cannot be executed here:
 * it opens the shared production database, and the only suite that does (scripts/team-smoke.ts) creates
 * and deletes real rows, which this phase is forbidden to do.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Organization } from "@prisma/client";
import {
  coachMasteryFigure,
  coachRecommendations,
  coachTrackedOrganizations,
  coachTrackIsTrained,
  coachTrackRecordsMastery,
  resolveCoachOrganization
} from "@/lib/coach-truth";
import { trackByOrganization, trackHasPracticeTests } from "@/lib/training-tracks";

const read = (file: string) => readFileSync(file, "utf8");
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const results: string[] = [];
function ok(message: string) {
  results.push(`  ok  ${message}`);
}

// ---- 1. MASTERY IS EVIDENCE, AND ABSENCE IS NOT ZERO ------------------------------------------

assert.equal(coachMasteryFigure([]), null, "M1. no mastery rows is NULL, not 0");
assert.equal(coachMasteryFigure([{ masteryPercent: 0 }]), 0, "M3. a recorded 0 stays 0 — a measured zero is evidence");
assert.equal(coachMasteryFigure([{ masteryPercent: 64 }]), 64, "M4. a single recorded percentage is preserved exactly");
assert.equal(coachMasteryFigure([{ masteryPercent: 40 }, { masteryPercent: 61 }]), 51, "M5. several rows average and round");
ok("mastery: absence is null, a recorded zero survives, real rows average");

// The signature itself is the guarantee: there is no argument through which a score, a test average or
// a default could reach this figure. Checked against the SOURCE, not against Function.length —
// `.length` ignores defaulted and rest parameters, so `(skills, fallback = null)` would have satisfied
// it while reintroducing exactly the defect this forbids.
{
  const signature = stripComments(read("lib/coach-truth.ts")).match(
    /export function coachMasteryFigure\(([^)]*)\)/
  );
  assert.ok(signature, "M6a. the mastery figure's signature is readable");
  assert.equal(
    signature![1].trim(),
    "skills: readonly CoachMasterySkill[]",
    "M6. the mastery figure takes exactly one parameter — the mastery rows — with no default or fallback"
  );
}
{
  // Both boundaries are REAL CODE, not comments: the stripper removes comments, so a comment marker
  // here would silently widen the slice to the rest of the file and the control would stop meaning
  // anything. The end marker is asserted to exist for the same reason.
  const source = stripComments(read("lib/coach-truth.ts"));
  const start = source.indexOf("export function coachMasteryFigure");
  const end = source.indexOf("export type CoachTrackContextInput");
  assert.ok(start >= 0 && end > start, "M7a. the mastery figure and the next declaration both bound a real slice");
  const body = source.slice(start, end);
  assert.ok(body.includes("skills.reduce"), "M7b. control: that slice really is the mastery figure's body");
  for (const forbidden of ["testAverage", "score", "completedTests", "hasAnyActivity", "?? 0"]) {
    assert.ok(!body.includes(forbidden), `M7. the mastery figure never consults ${forbidden}`);
  }
}
ok("mastery: no test score, completion count or default can reach the figure");

// ---- 2. WHICH TRACK A COACH VIEW BELONGS TO ---------------------------------------------------

assert.equal(
  resolveCoachOrganization({ teamOrganization: "HOSA", studentOrganization: "DECA" }),
  "HOSA",
  "T1. the team the coach is viewing through decides the track"
);
assert.equal(
  resolveCoachOrganization({ teamOrganization: null, studentOrganization: "DECA" }),
  "DECA",
  "T2. with no team, the student's own signup organization is used"
);
assert.equal(
  resolveCoachOrganization({ teamOrganization: null, studentOrganization: null }),
  null,
  "T3. with neither, the track is unresolved — it never defaults"
);
ok("track context: team first, student organization second, fail closed — never a default track");

// The precedence above is only real if the CALL SITE passes the two sources the right way round.
// Swapping them type-checks and leaves every test above green while scoping a HOSA team's view to the
// student's DECA signup organization, so the wiring is pinned too.
{
  const call = stripComments(read("lib/coach-progress.ts")).match(
    /resolveCoachOrganization\(\{([\s\S]*?)\}\)/
  );
  assert.ok(call, "T5a. the resolver call site is readable");
  const args = call![1].replace(/\s+/g, " ").trim();
  assert.equal(
    args,
    "teamOrganization: membership?.team.organization ?? null, studentOrganization: student.organization ?? null",
    "T5. the team's organization is passed as the team, and the student's as the student — not swapped"
  );
  assert.equal(
    (stripComments(read("lib/coach-progress.ts")).match(/resolveCoachOrganization\(/g) ?? []).length,
    1,
    "T6. and it is resolved in exactly one place"
  );
}
ok("track context: the call site passes the two sources in the right order, once");

// ---- 3. THE COACH'S AGGREGATES ARE SCOPED IN THE QUERY ----------------------------------------

const progress = stripComments(read("lib/coach-progress.ts"));

// Read each query's own WHERE clause and check what it contains, rather than pinning one exact spelling
// — key order and whitespace are not the contract, the presence of the scope is.
function whereClauseOf(model: string): string {
  const match = progress.match(new RegExp(`prisma\\.${model}\\.findMany\\(\\{\\s*where: (\\{[^}]*\\}[^,]*)`));
  assert.ok(match, `Q0. the ${model} query is readable`);
  return match![1].replace(/\s+/g, " ");
}
{
  const tests = whereClauseOf("practiceTest");
  assert.ok(/userId: studentId/.test(tests), "Q1a. the practice-test query is still per student");
  assert.ok(/\borganization\b/.test(tests), "Q1. and is scoped to the resolved organization");
  const mastery = whereClauseOf("masteryProgress");
  assert.ok(/userId: studentId/.test(mastery), "Q2a. the mastery query is still per student");
  assert.ok(
    /skill: \{ organization \}/.test(mastery),
    "Q2. and is scoped through the skill's organization — the same relationship the learner's record reads"
  );
}
assert.ok(
  !/prisma\.practiceTest\.findMany\(\{\s*where: \{ userId: studentId \}/.test(progress),
  "Q3. and neither query can fall back to the whole account"
);
assert.ok(
  !/prisma\.masteryProgress\.findMany\(\{\s*where: \{ userId: studentId \}/.test(progress),
  "Q4. (mastery half of the same rule)"
);
// Weak categories are derived from those same scoped rows, so scoping them is not a second mechanism.
assert.ok(
  /const weakCategories = uniqueStrings\(completedTests\.flatMap/.test(progress),
  "Q5. weak categories are derived from the scoped completed tests, so they carry the same scope"
);
assert.ok(
  /const completedTests = testRows\.filter/.test(progress),
  "Q6. control: completedTests really is the filtered view of those scoped rows"
);
ok("queries: practice tests and mastery are scoped to one organization, and weak areas inherit it");

// When the track cannot be resolved the aggregates stay EMPTY rather than unscoped. Proven from the
// shape of the code: each query is the true branch of a conditional on `organization`.
assert.ok(
  /const masteryRows: CoachMasteryRow\[\] = organization\s*\?\s*await prisma\.masteryProgress/.test(progress),
  "Q7. an unresolved track reads no mastery rows at all"
);
assert.ok(
  /const testRows: CoachTestRow\[\] = organization\s*\?\s*await prisma\.practiceTest/.test(progress),
  "Q8. and no practice-test rows at all — absence, not a blend"
);
ok("queries: an unresolved track reads nothing rather than everything");

// ---- 4. THE FAKE-MASTERY FALLBACK IS GONE -----------------------------------------------------

assert.ok(/const masteryPercent = coachMasteryFigure\(skills\);/.test(progress), "F1. the coach figure comes from the mastery rows");
assert.ok(!/testAverage \?\? 0/.test(progress), "F2. and the practice-test fallback is gone");
assert.ok(
  !/skills\.length > 0\s*\?\s*average\(skills/.test(progress),
  "F3. including the ternary that used to choose between them"
);
// F1 alone pins one line; it does not stop the RETURNED field being re-substituted further down
// (`masteryPercent: masteryPercent ?? testAverage`). The returned field must be the shorthand of the
// binding F1 pinned, so there is no expression between the figure and the caller.
assert.ok(
  /\n    masteryPercent,\n/.test(progress),
  "F1b. and the value returned to the page IS that binding, with nothing recomputed on the way out"
);
assert.ok(
  !/masteryPercent:\s/.test(progress.slice(progress.indexOf("  return {"))),
  "F1c. the return object never rebinds masteryPercent to another expression"
);
// The test average must not be able to reach the mastery figure through any local alias either.
assert.ok(
  !/(masteryPercent|masteryForDisplay|masteryValue)[^\n]*testAverage/.test(progress),
  "F1d. no local alias combines the mastery figure with the test average"
);
const page = stripComments(read("app/(app)/coach/students/[studentId]/page.tsx"));
assert.ok(
  /data\.masteryPercent === null \? "—" : `\$\{data\.masteryPercent\}%`/.test(page),
  "F4. the page prints a mastery percentage only when one exists"
);
// F4 pins how `masteryDisplay` is BUILT. On its own that leaves the render site free to ignore it and
// print something else under the same label, so the chip is pinned to the binding by name.
{
  const masteryChip = page.match(/<StatChip\s+label="Mastery"\s+value=\{([^}]*)\}\s*\/>/);
  assert.ok(masteryChip, "F4a. the Mastery chip is present and readable");
  assert.equal(
    masteryChip![1].trim(),
    "masteryDisplay",
    "F4b. and its value is exactly the checked binding — no other expression may be shown as Mastery"
  );
  assert.equal(
    (page.match(/label="Mastery"/g) ?? []).length,
    1,
    "F4c. there is exactly one chip called Mastery, so the pinned one is the one a coach reads"
  );
}
assert.ok(
  !/masteryPercent === 0 && !data\.hasAnyActivity/.test(page),
  "F5. and no longer reads a substituted 0 as 'Not started'"
);
assert.ok(/label="Mastery"/.test(page) && /No mastery recorded on this track yet/.test(page),
  "F6. an absent figure is explained rather than left as a bare dash");
ok("display: 'Mastery' is a recorded figure or a dash with a reason — never a test average");

// The practice-test average is NOT hidden: it stays on the page under its own name.
assert.ok(/label="Average score"/.test(page) && /tests\.averageScore !== null/.test(page),
  "F7. the practice-test average is still shown, under its own name, in the Practice tests card");
ok("display: the test average is kept, correctly named");

// ---- 5. HOSA CONTROL — tests present, mastery absent ------------------------------------------

const hosaView = coachRecommendations({
  organization: "HOSA",
  hasAnyActivity: true,
  judgedRounds: 0,
  completedTests: 2,
  weakSignals: ["Anatomy and physiology", "Body systems", "Structure and function"],
  lowMasterySkills: []
});
assert.ok(hosaView.length > 0, "H1. a HOSA coach with evidence still gets a next step");
for (const step of hosaView) {
  assert.ok(
    !/debate|role-?play|ballot|simulation|judge/i.test(step),
    `H2. no HOSA step proposes a round, ballot, role-play or simulation: ${step}`
  );
}
assert.ok(
  hosaView.some((step) => /Medical Terminology/.test(step)),
  "H3. and the step it does give names the one HOSA practice that exists"
);
ok("HOSA: weak areas route to Medical Terminology, and never to a round, ballot or simulation");

// Every HOSA case, not just the one above: no activity, no weak signals, no tests.
for (const [label, input] of [
  ["no activity", { hasAnyActivity: false, judgedRounds: 0, completedTests: 0, weakSignals: [], lowMasterySkills: [] }],
  ["no weak signals", { hasAnyActivity: true, judgedRounds: 0, completedTests: 3, weakSignals: [], lowMasterySkills: [] }],
  ["no tests yet", { hasAnyActivity: true, judgedRounds: 0, completedTests: 0, weakSignals: [], lowMasterySkills: [] }],
  ["debate-shaped weakness text", { hasAnyActivity: true, judgedRounds: 0, completedTests: 1, weakSignals: ["Rebuttal depth", "Communication"], lowMasterySkills: [] }]
] as const) {
  const steps = coachRecommendations({ organization: "HOSA", ...input });
  for (const step of steps) {
    assert.ok(
      !/debate|role-?play|ballot|simulation|judge/i.test(step),
      `H4. HOSA (${label}) never proposes a round or ballot: ${step}`
    );
  }
}
ok("HOSA: every input shape — including debate-shaped weakness text — stays inside HOSA's capabilities");

// ---- 6. REAL MASTERY AND THE OTHER TRACKS STILL WORK ------------------------------------------

assert.deepEqual(
  coachRecommendations({
    organization: "DEBATE",
    hasAnyActivity: false,
    judgedRounds: 0,
    completedTests: 0,
    weakSignals: [],
    lowMasterySkills: []
  }),
  ["Have the student complete one debate or practice drill first."],
  "D1. a new Debate student keeps the recorded first-step wording exactly"
);
const debateWeak = coachRecommendations({
  organization: "DEBATE",
  hasAnyActivity: true,
  judgedRounds: 2,
  completedTests: 0,
  weakSignals: ["Rebuttal depth"],
  lowMasterySkills: []
});
assert.ok(debateWeak.some((s) => /rebuttal/i.test(s)), "D2. a rebuttal weakness still drives a rebuttal drill");
assert.ok(
  !debateWeak.some((s) => /practice test/i.test(s)),
  "D3. and Debate is never told to assign a practice test — it has no test product"
);
const decaSteps = coachRecommendations({
  organization: "DECA",
  hasAnyActivity: true,
  judgedRounds: 0,
  completedTests: 0,
  weakSignals: ["Target market analysis"],
  lowMasterySkills: []
});
assert.ok(decaSteps.some((s) => /marketing-fundamentals/.test(s)), "D4. a DECA marketing weakness routes to the marketing drill");
assert.ok(decaSteps.some((s) => /DECA practice test/.test(s)), "D5. and DECA may be told to assign its practice test");
assert.ok(decaSteps.some((s) => /role-play/.test(s)), "D6. and its role-play round");
ok("Debate and DECA: existing behaviour preserved, minus the test step Debate never had");

// The test step and the canonical capability predicate cannot drift apart.
for (const organization of coachTrackedOrganizations()) {
  const steps = coachRecommendations({
    organization,
    hasAnyActivity: true,
    judgedRounds: 5,
    completedTests: 0,
    weakSignals: [],
    lowMasterySkills: []
  });
  const proposesTest = steps.some((s) => /practice test/i.test(s));
  const track = trackByOrganization(organization);
  assert.ok(track, `C1. ${organization} resolves to a track`);
  assert.equal(
    proposesTest,
    trackHasPracticeTests(track!.id),
    `C2. ${organization}'s test step agrees with trackHasPracticeTests — one source for what a track offers`
  );
}
ok("capabilities: the test step is decided by the same predicate every other surface reads");

// ---- 7. UNRESOLVED AND UNSUPPORTED TRACKS FAIL CLOSED -----------------------------------------

assert.deepEqual(
  coachRecommendations({
    organization: null,
    hasAnyActivity: true,
    judgedRounds: 0,
    completedTests: 0,
    weakSignals: ["Rebuttal depth"],
    lowMasterySkills: ["Refutation"]
  }),
  [],
  "U1. an unresolved track gets NO recommendation — not Debate's"
);
for (const organization of ["MODEL_UN", "MOCK_TRIAL", "PUBLIC_SPEAKING"] as Organization[]) {
  assert.deepEqual(
    coachRecommendations({
      organization,
      hasAnyActivity: true,
      judgedRounds: 0,
      completedTests: 0,
      weakSignals: ["Rebuttal depth"],
      lowMasterySkills: []
    }),
    [],
    `U2. ${organization} has no training product, so it is offered nothing rather than another track's steps`
  );
}
assert.deepEqual(coachTrackedOrganizations().sort(), ["DEBATE", "DECA", "HOSA"], "U3. exactly three organizations have a recommendation vocabulary");
assert.ok(
  /recommendations\.length === 0 \?/.test(page),
  "U4. and the page says nothing rather than rendering an empty list"
);
ok("unresolved and unsupported tracks: no recommendation, no default, no filler");

// ---- 7b. AN EMPTY RECORD SAYS WHY IT IS EMPTY -------------------------------------------------
//
// Scoping makes "nothing here" common, and it has three different causes. Reporting them with one
// sentence would blame a student for the product's shape — a Mock Trial team (selectable today in
// components/coach/create-team-form.tsx) would otherwise render a real competitor as "Not started yet".

assert.equal(coachTrackIsTrained("HOSA"), true, "E1. HOSA is a track CompeteReady trains");
assert.equal(coachTrackIsTrained("MOCK_TRIAL"), false, "E2. Mock Trial is not — and a coach can create such a team");
assert.equal(coachTrackIsTrained("PUBLIC_SPEAKING"), false, "E3. nor is Public Speaking");
assert.equal(coachTrackIsTrained("MODEL_UN"), false, "E4. nor Model UN, which is soft-removed");
assert.equal(coachTrackIsTrained(null), false, "E5. and an unresolved organization is not a trained track");
assert.equal(coachTrackRecordsMastery("DEBATE"), true, "E6. Debate drills write a durable mastery record");
assert.equal(coachTrackRecordsMastery("DECA"), true, "E7. so do DECA drills");
assert.equal(coachTrackRecordsMastery("HOSA"), false, "E8. HOSA practice writes a review schedule instead — permanently");
{
  // The two writers that justify E6-E8, asserted rather than assumed.
  const writers = ["app/api/debate/drills/submit/route.ts", "app/api/deca/drills/submit/route.ts"];
  for (const file of writers) {
    assert.ok(/recordDrillMasteryInTransaction/.test(read(file)), `E9. ${file} really writes mastery`);
  }
  assert.ok(
    !/recordDrillMastery/.test(read("app/api/hosa/medterm/submit/route.ts")),
    "E10. and the HOSA practice route really does not"
  );
}
ok("empty records: trained vs untrained, and mastery-recording vs review-only, are decided from the product");

for (const [marker, why] of [
  ["CompeteReady records no skills for", "E11. an untrained organization is not reported as an unstarted student"],
  ["practice does not record skill mastery", "E12. a review-only track says so instead of 'Not started yet'"],
  ["CompeteReady has no practice tests for", "E13. and an untrained organization's test card says why it is empty"],
  ["is not a track CompeteReady trains", "E14. and its next-step card does not claim the student has nowhere to go"]
] as const) {
  assert.ok(page.includes(marker), why);
}
assert.ok(
  /Skills and practice tests below are \{scopeLabel\} only\. Rounds, XP, rank and sessions are/.test(page),
  "E15. the page claims scope only over the figures that are actually scoped"
);
assert.ok(
  !/Showing \{scopeLabel\} training only/.test(page),
  "E16. and no longer claims the whole view is track-scoped, which the account-wide round card would make false"
);
ok("page copy: each empty state names its own cause, and the scope claim matches what is scoped");

// ---- 7c. THE ADVICE READS IN-TRACK EVIDENCE ONLY ----------------------------------------------

assert.ok(
  /const inTrackJudged = organization \? judgedDebates\.filter\(\(round\) => round\.organization === organization\) : \[\];/.test(progress),
  "A1. rounds are filtered to this track before they can influence advice"
);
assert.ok(
  /weakSignals: \[\.\.\.\(inTrackLatest\?\.weaknesses \?\? \[\]\), \.\.\.weakCategories\]/.test(progress),
  "A2. so a ballot from another track cannot supply a weak signal"
);
assert.ok(
  !/weakSignals: \[\.\.\.\(latestFeedback\?\.weaknesses/.test(progress),
  "A3. the account-wide latest ballot is no longer the advice's input"
);
assert.ok(
  /judgedRounds: inTrackJudged\.length,/.test(progress),
  "A4. and the round count the advice reasons about is this track's"
);
assert.ok(
  /const hasAnyActivity =\s*inTrackJudged\.length > 0 \|\| skills\.length > 0 \|\| completedTests\.length > 0;/.test(progress),
  "A5. activity means activity on this track — account-wide XP no longer counts as having started it"
);
// The concrete leak the reviewer demonstrated: a Debate ballot phrase that matches DECA's vocabulary.
{
  const decaFromDebateBallot = coachRecommendations({
    organization: "DECA",
    hasAnyActivity: true,
    judgedRounds: 1,
    completedTests: 1,
    weakSignals: [],
    lowMasterySkills: []
  });
  assert.ok(
    !decaFromDebateBallot.some((step) => /marketing-fundamentals/.test(step)),
    "A6. with no in-track weakness, a DECA coach is not handed a marketing drill by a Debate ballot's wording"
  );
}
ok("advice: only this track's ballots, tests and skills can shape it");

// ---- 8. THE OLD CROSS-TRACK STRINGS ARE GONE FROM THE SHARED PATH ------------------------------

for (const gone of [
  "Run one AI debate round to get a judge ballot.",
  "Complete one DECA/HOSA practice test.",
  "Keep the momentum: assign one debate and one practice test this week."
]) {
  assert.ok(!progress.includes(gone), `X1. lib/coach-progress.ts no longer owns a track-blind step: ${gone}`);
}
const truth = read("lib/coach-truth.ts");
assert.ok(
  !truth.includes("Complete one DECA/HOSA practice test."),
  "X2. and no step names two organizations at once"
);
ok("no track-blind recommendation strings remain");

console.log(results.join("\n"));
// WHAT THIS SUITE PROVES, and only that. The pure rules are EXECUTED; everything said about
// lib/coach-progress.ts and the coach page is a SOURCE assertion — it proves the code is written that
// way, not that it was run, because the only suite that executes getCoachStudentProgress
// (scripts/team-smoke.ts) creates and deletes rows in the shared production database.
console.log(
  "Coach-truth smoke passed. EXECUTED: coachMasteryFigure returns null for no rows, 0 for a recorded 0, and the mean " +
    "otherwise, and its source signature admits no second parameter through which a score or default could arrive; " +
    "resolveCoachOrganization prefers the team, falls back to the student's organization and returns null rather than a " +
    "default; coachRecommendations gives HOSA no round, ballot, role-play or simulation under any input shape tested here " +
    "(including debate-shaped weakness text), keeps Debate's recorded first step and rebuttal routing while never offering " +
    "it a practice test, keeps DECA's drills, role-play and exam, agrees with trackHasPracticeTests on every tracked " +
    "organization, and returns nothing at all for an unresolved, retired or untrained one; coachTrackIsTrained and " +
    "coachTrackRecordsMastery classify the six organizations, checked against the two routes that actually write mastery. " +
    "ASSERTED FROM SOURCE: the practice-test and mastery queries carry the resolved organization (weak categories derive " +
    "from those same rows); an unresolved track reads no rows rather than the whole account; the resolver is called once " +
    "with team and student in that order; the mastery figure reaches the page as the same binding, with no alias " +
    "recombining it with the test average; the chip labelled Mastery renders exactly that binding and prints a percentage " +
    "only when one exists; the practice-test average remains under its own name; the advice reads in-track rounds only; and " +
    "each empty state names its own cause rather than reporting the product's shape as a student who has not started. " +
    "NOT PROVEN HERE: any behaviour of the live query results — no database was touched."
);
