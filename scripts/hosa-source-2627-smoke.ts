/**
 * HOSA 2026-27 MEDICAL TERMINOLOGY SOURCE SMOKE (phase H4-B).
 * Run with: npm run hosa-source-2627:smoke
 *
 * One event has been re-verified against a primary document, and this suite holds that record to what
 * the document actually says — no more, and for no other event.
 *
 *   • THE FACTS. Season 2026-27, guideline dated September 2026, 50 questions in 60 minutes, ten
 *     tiebreaker questions in two sets of five, and a written test plan of twelve rows totalling 100.
 *   • THE BOUNDARY. Medical Terminology alone. Verifying one event's guideline says nothing about
 *     Prepared Speaking, HOSA Bowl or any other event, and none of them may present as 2026-27
 *     verified because this one does.
 *   • THE TWO LISTS. The guideline's EVENT SUMMARY names the subjects the event covers; the WRITTEN
 *     TEST PLAN weights twelve rows, its second half organised by body system. They are different
 *     axes, and CompeteReady's six practice tags are neither of them.
 *   • THE GOVERNANCE. An approved synthesis document prohibits HOSA 2026-27 claims. That prohibition
 *     is superseded for Medical Terminology only, and both failure modes are controlled: a blanket
 *     ban that would forbid a verified fact, and a blanket lift that would authorise unverified ones.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  hosaEventById,
  hosaSourceMetadata,
  HOSA_CURRENT_SEASON,
  HOSA_EVENTS,
  HOSA_MEDTERM_EVENT_SUBJECTS,
  HOSA_MEDTERM_TEST_PLAN,
  HOSA_MEDTERM_TIEBREAKER,
  HOSA_MEDTERM_TIME_ANNOUNCEMENTS,
  HOSA_REVALIDATION_DUE_ON,
  HOSA_REVALIDATION_NOTE
} from "@/lib/hosa-events";
import { MEDTERM_AREAS, MEDTERM_BANK } from "@/lib/hosa-medterm";
import { presentSourceFreshness } from "@/lib/source-freshness";

const read = (file: string) => readFileSync(file, "utf8");
const results: string[] = [];
const ok = (message: string) => results.push(`  ok  ${message}`);

// ---- 1. THE RECORDED FACTS MATCH THE DOCUMENT --------------------------------------------------

assert.equal(HOSA_CURRENT_SEASON, "2026-27", "F1. the season in force is 2026-27");

const mt = hosaEventById("medical-terminology");
assert.ok(mt, "F2. the Medical Terminology record exists");
assert.equal(mt!.lastVerified, "2026-09-10", "F3. carrying the date its guideline was read");
assert.equal(
  mt!.sourceLabel,
  "HOSA 2026-27 Medical Terminology ILC Guidelines (September 2026)",
  "F4. and naming that exact document — the guideline, not a note about it"
);
assert.equal(mt!.season, HOSA_CURRENT_SEASON, "F5. its season is the one in force");
assert.equal(mt!.verifiedFacts?.questionCount, 50, "F6. 50 questions — unchanged this season");
assert.equal(mt!.verifiedFacts?.timeMinutes, 60, "F7. in a maximum of 60 minutes — unchanged");
assert.equal(mt!.verifiedFacts?.testPlanAvailable, true, "F8. and the guideline publishes a test plan");
ok("record: season, verification date, source document, and the facts that did not change");

// The tiebreaker, which DID change this season.
assert.equal(HOSA_MEDTERM_TIEBREAKER.totalQuestions, 10, "T1. ten tiebreaker questions");
assert.equal(HOSA_MEDTERM_TIEBREAKER.sets, 2, "T2. administered as two sets");
assert.equal(HOSA_MEDTERM_TIEBREAKER.questionsPerSet, 5, "T3. of five questions each");
assert.equal(HOSA_MEDTERM_TIEBREAKER.sets * HOSA_MEDTERM_TIEBREAKER.questionsPerSet, HOSA_MEDTERM_TIEBREAKER.totalQuestions,
  "T4. and the arithmetic agrees — two fives make the ten");
assert.equal(HOSA_MEDTERM_TIEBREAKER.format, "fill-in-the-blank", "T5. fill-in-the-blank, not multiple choice");
assert.equal(HOSA_MEDTERM_TIEBREAKER.spellingRequired, true, "T6. with correct spelling required");
assert.match(HOSA_MEDTERM_TIEBREAKER.resolution, /successive sets of five/i, "T7. resolved in successive sets of five");
// The old record stated the resolution but not the cap; both facts must now be present.
assert.ok(
  /Ten tiebreaker questions/.test(read("scripts/seed-competition-specs.ts")),
  "T8. and the seeded spec states the cap too, not only the resolution procedure"
);
ok("tiebreaker: ten questions, two sets of five, spelling required — the cap and the procedure both stated");

assert.match(HOSA_MEDTERM_TIME_ANNOUNCEMENTS, /No verbal time-remaining announcements/, "A1. the test-day timing rule is recorded");
ok("test-day: competitors monitor their own time, recorded as source truth");

// ---- 2. THE TEST PLAN, AS DATA ------------------------------------------------------------------

assert.equal(HOSA_MEDTERM_TEST_PLAN.length, 12, "P1. twelve rows");
assert.equal(
  HOSA_MEDTERM_TEST_PLAN.reduce((total, row) => total + row.weight, 0),
  100,
  "P2. totalling 100 — a plan that does not sum is a transcription error, not a blueprint"
);
{
  const wordParts = HOSA_MEDTERM_TEST_PLAN.find((row) => row.id === "word-parts");
  assert.ok(wordParts, "P3. the word-building row exists");
  assert.equal(wordParts!.weight, 45, "P4. weighted 45 — nearly half the test");
  assert.equal(wordParts!.label, "Roots, Prefixes, Suffixes, and Combining Forms", "P5. labelled as the guideline lists it");
  const fives = HOSA_MEDTERM_TEST_PLAN.filter((row) => row.id !== "word-parts");
  assert.equal(fives.length, 11, "P6. and eleven further rows");
  for (const row of fives) {
    assert.equal(row.weight, 5, `P7. each weighted 5: ${row.label}`);
  }
}
// Every row the document lists, by label — an omitted row is a silently under-taught blueprint.
for (const label of [
  "Overview of Body", "Skeletal", "Muscular", "Respiratory", "Digestive", "Cardiovascular & Lymphatic",
  "Nervous/Special Senses", "Endocrine", "Reproductive", "Integumentary", "Urinary"
]) {
  assert.ok(HOSA_MEDTERM_TEST_PLAN.some((row) => row.label === label), `P8. the plan includes ${label}`);
}
assert.equal(new Set(HOSA_MEDTERM_TEST_PLAN.map((row) => row.id)).size, 12, "P9. row ids are unique, so evidence can be mapped to one");
ok("test plan: twelve rows, 45 + eleven fives, summing to 100, every row present and uniquely addressable");

// ---- 3. THE TEST PLAN IS NOT THE BANK TAXONOMY --------------------------------------------------
//
// The likeliest future untruth is relabelling: six practice tags presented as the official blueprint.

assert.equal(MEDTERM_AREAS.length, 6, "X1. the bank still has its six practice areas");
assert.equal(MEDTERM_BANK.length, 180, "X2. and its 180 items — H4-B changes no question");
{
  const planIds = new Set(HOSA_MEDTERM_TEST_PLAN.map((row) => row.id));
  const areaIds = MEDTERM_AREAS.map((area) => area.id);
  const overlap = areaIds.filter((id) => planIds.has(id));
  assert.deepEqual(overlap, [], "X3. no bank area id doubles as an official row id — they are different axes");
  for (const area of MEDTERM_AREAS) {
    assert.ok(
      !HOSA_MEDTERM_TEST_PLAN.some((row) => row.label.toLowerCase() === area.label.toLowerCase()),
      `X4. no bank area is labelled as an official row: ${area.label}`
    );
  }
}
// The event summary's subject list is a THIRD thing, and is what the bank header actually cites.
assert.equal(HOSA_MEDTERM_EVENT_SUBJECTS.length, 7, "X5. the event summary names seven subjects");
for (const subject of ["prefixes", "suffixes", "word roots", "anatomy", "physiology", "pathophysiology"]) {
  assert.ok(HOSA_MEDTERM_EVENT_SUBJECTS.includes(subject), `X6. including ${subject}`);
}
assert.ok(
  HOSA_MEDTERM_EVENT_SUBJECTS.some((subject) => /occupations/.test(subject)),
  "X7. and occupations related to the health field — which the bank names but never tests"
);
assert.notEqual(HOSA_MEDTERM_EVENT_SUBJECTS.length, HOSA_MEDTERM_TEST_PLAN.length, "X8. the two lists are not the same list");
{
  const registry = read("lib/hosa-events.ts");
  assert.ok(/A subject list is not a blueprint/.test(registry), "X9. and the registry says so where both are defined");
}
ok("axes: the official plan, the event-summary subjects and our six practice tags are three different lists");

// ---- 4. ONE EVENT, NOT THE TRACK ----------------------------------------------------------------

for (const event of HOSA_EVENTS) {
  if (event.id === "medical-terminology") continue;
  assert.notEqual(event.lastVerified, "2026-09-10", `B1. ${event.id} did not inherit the verification date`);
  assert.ok(
    !event.sourceLabel?.includes("September 2026"),
    `B2. ${event.id} does not claim the Medical Terminology document`
  );
  assert.equal(event.sourceStatus, "partial", `B3. ${event.id} is still an identity-only partial record`);
  assert.equal(event.verifiedFacts, undefined, `B4. ${event.id} still exposes no verified facts`);
}
assert.equal(HOSA_EVENTS.filter((event) => event.sourceStatus !== "partial").length, 1, "B5. exactly one event is more than partial");
{
  // A partial record's presentation must still make no currency claim, on the new season as before.
  const partial = HOSA_EVENTS.find((event) => event.id !== "medical-terminology")!;
  const view = presentSourceFreshness(hosaSourceMetadata(partial), new Date("2026-09-10T00:00:00Z"));
  assert.equal(view.freshnessLabel, null, "B6. and claims no currency for 2026-27 or any season");
  assert.ok(!/2026-27/.test([view.authorityLabel, view.sourceLabel, view.verifiedLabel].join(" ")), "B7. nor names the season at all");
}
ok("boundary: seven events stay partial — one guideline read is evidence about one event");

// ---- 5. THE GATE NOW NAMES THE NEXT RELEASE -----------------------------------------------------

assert.equal(HOSA_REVALIDATION_DUE_ON, undefined, "G1. no date is claimed for a release HOSA has not announced");
assert.ok(/2027-28/.test(HOSA_REVALIDATION_NOTE), "G2. the note names the next release");
assert.ok(!/September 1, 2026/.test(HOSA_REVALIDATION_NOTE), "G3. and not the one already read");
assert.equal(mt!.revalidationRequired, true, "G4. the record still expects to be re-checked");
{
  const view = presentSourceFreshness(hosaSourceMetadata(mt!), new Date("2026-09-10T00:00:00Z"));
  assert.equal(view.freshnessLabel, "Current for 2026-27", "G5. so the learner reads a current record");
  assert.ok(!/Revalidation due/.test(view.revalidationLabel ?? ""), "G6. owing nothing");
  assert.equal(view.tone, "verified", "G7. with the verified tone restored");
}
ok("gate: answered, re-expressed to the next release, and undated because that date is not published");

// ---- 6. GOVERNANCE: SUPERSEDED FOR ONE EVENT, INTACT FOR THE REST -------------------------------

{
  const synthesis = read("docs/curriculum/14-final-synthesis.md");
  // The document is prose wrapped at ~100 columns and quoted with "> ", so a name can straddle a line.
  // Compare against a whitespace-flattened copy; the assertions are about content, not line breaks.
  const flat = synthesis.replace(/\n>\s*/g, " ").replace(/\s+/g, " ");
  assert.ok(
    /SUPERSEDED FOR MEDICAL TERMINOLOGY ONLY/.test(flat),
    "V1. the supersession is recorded in the approved document that carries the prohibition"
  );
  // Failure mode A: the blanket ban survives and forbids a verified fact.
  assert.ok(
    /except Medical Terminology/.test(flat),
    "V2. the prohibition itself points at the exception, so the ban cannot be read as absolute"
  );
  // Failure mode B: the ban is lifted for everything.
  assert.ok(
    /Still prohibited, unchanged/.test(flat),
    "V3. and the supersession restates what stays prohibited"
  );
  for (const event of ["Prepared Speaking", "Job Seeking Skills", "Research Poster", "HOSA Bowl"]) {
    assert.ok(flat.includes(event), `V4. naming ${event} as still unread`);
  }
  assert.ok(/any HOSA 2026-27 claim/.test(flat), "V5. the original prohibition text is still present, not deleted");
  assert.ok(/within the scope actually read/.test(flat), "V6. and the permission is bounded to what was actually read");
}
// The curriculum doc's own stale counts are corrected, and its architecture is not rewritten.
{
  const course = read("docs/curriculum/03-hosa-course.md").replace(/\s+/g, " ");
  assert.ok(/\*\*180\*\* authored questions/.test(course), "V7. the doc states the real bank size");
  assert.ok(!/MT bank \(54 authored questions\)/.test(course), "V8. and no longer the 54 it was written with");
  assert.ok(/GATE SATISFIED for Medical Terminology/.test(course), "V9. its September-1 gate is marked satisfied for MT");
  assert.ok(/gate still stands for every other named event/.test(course), "V10. and still standing for the rest");
  assert.ok(/Weighted study planning/.test(course), "V11. control: the teaching architecture it already had is untouched");
}
ok("governance: MT authorised within what was read, every other HOSA 2026-27 claim still refused");

console.log(results.join("\n"));
console.log(
  "HOSA 2026-27 source smoke passed. Medical Terminology is recorded from the primary document — season " +
    "2026-27, read 2026-09-10, naming the September 2026 guideline — with 50 questions in 60 minutes unchanged, " +
    "ten tiebreaker questions in two sets of five with correct spelling required (the cap the old record omitted), " +
    "the no-verbal-announcements rule, and the written test plan as data: twelve uniquely addressable rows, 45 for " +
    "roots/prefixes/suffixes/combining forms and eleven body-system rows at 5, summing to 100. Three lists are kept " +
    "apart — that plan, the event summary's seven subjects, and CompeteReady's six practice tags, which share no id " +
    "and no label with the official rows and which no longer have a 54-question count anywhere. The other seven HOSA " +
    "events remain identity-only partials that claim no season, no facts and no verification date. The revalidation " +
    "gate has been answered and re-expressed to the 2027-28 release without inventing its date, so the generic " +
    "presenter reads the record as current with the verified tone restored. And the approved prohibition on HOSA " +
    "2026-27 claims stands for every event except this one, where it is superseded only within the scope actually read."
);
