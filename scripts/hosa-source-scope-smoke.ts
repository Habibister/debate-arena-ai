/**
 * HOSA SOURCE SCOPE SMOKE (phase H2). Run with: npm run hosa-source-scope:smoke
 *
 * Three claims, each of which the product made falsely before this phase:
 *
 *   1. An official specification describes ONE event. HOSA's only sourced record is Medical
 *      Terminology, and its source line, rubric, point total, question count and timer may appear
 *      only while that event is the learner's selection — not over the other fifteen categories.
 *   2. A verified record whose own stated re-check date has passed is not "current". It is verified,
 *      and a revalidation is due; the model already had the vocabulary for exactly that.
 *   3. Track copy names the learner's own organization. A HOSA learner is not told about DECA prompts
 *      or DECA lessons.
 *
 * The freshness rules are EXECUTED against the real registry metadata on both sides of the date, so
 * the boundary is proved rather than described. The render-site rules are asserted against source,
 * because the selection lives in a client component that this suite does not mount.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hosaEventById, hosaSourceMetadata, HOSA_REVALIDATION_DUE_ON, HOSA_EVENTS } from "@/lib/hosa-events";
import { presentSourceFreshness, revalidationIsDue } from "@/lib/source-freshness";
import { HOSA_EVENT_CATEGORIES } from "@/lib/testing";

const read = (file: string) => readFileSync(file, "utf8");
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const results: string[] = [];
const ok = (message: string) => results.push(`  ok  ${message}`);

const BEFORE = new Date("2026-08-31T23:59:59Z");
const AFTER = new Date("2026-09-01T00:00:00Z");

// ---- 1. THE REVALIDATION BOUNDARY IS A DATE ---------------------------------------------------

assert.equal(HOSA_REVALIDATION_DUE_ON, "2026-09-01", "R1. the stated trigger date is recorded in comparable form");
assert.equal(
  revalidationIsDue({ dueOn: HOSA_REVALIDATION_DUE_ON, lastVerifiedAt: "2026-07-05", now: BEFORE }),
  false,
  "R2. the day before the trigger, nothing is due"
);
assert.equal(
  revalidationIsDue({ dueOn: HOSA_REVALIDATION_DUE_ON, lastVerifiedAt: "2026-07-05", now: AFTER }),
  true,
  "R3. on the trigger date it is due"
);
// A record re-checked after its own trigger has answered it, and must not keep warning.
assert.equal(
  revalidationIsDue({ dueOn: HOSA_REVALIDATION_DUE_ON, lastVerifiedAt: "2026-09-02", now: AFTER }),
  false,
  "R4. a verification later than the trigger clears it — this is how the warning ends"
);
// Nothing is invented from missing or malformed data, in either direction.
for (const [label, input] of [
  ["no trigger", { dueOn: undefined, lastVerifiedAt: "2026-07-05" }],
  ["empty trigger", { dueOn: "", lastVerifiedAt: "2026-07-05" }],
  ["not a date", { dueOn: "September 2026", lastVerifiedAt: "2026-07-05" }],
  ["impossible day", { dueOn: "2026-13-45", lastVerifiedAt: "2026-07-05" }]
] as const) {
  assert.equal(
    revalidationIsDue({ ...input, now: AFTER }),
    false,
    `R5. ${label}: an unusable date raises no warning rather than a guessed one`
  );
}
assert.equal(
  revalidationIsDue({ dueOn: HOSA_REVALIDATION_DUE_ON, lastVerifiedAt: null, now: AFTER }),
  true,
  "R6. a record with no verification date at all is still due once the trigger passes"
);
ok("revalidation: decided by a real date on both sides, and never by a malformed one");

// ---- 2. WHAT THE LEARNER IS TOLD, BEFORE AND AFTER ---------------------------------------------

const mt = hosaEventById("medical-terminology");
assert.ok(mt, "S0. the Medical Terminology record exists");
const metadata = hosaSourceMetadata(mt!);
const before = presentSourceFreshness(metadata, BEFORE);
const after = presentSourceFreshness(metadata, AFTER);

assert.equal(before.freshnessLabel, "Current for 2025-26", "S1. before the trigger, the record is current for its season");
assert.equal(
  before.revalidationLabel,
  "Revalidation required after the expected September 1, 2026 release",
  "S2. and the gate is stated as still ahead"
);
assert.equal(
  after.freshnessLabel,
  "Awaiting revalidation against the next release",
  "S3. after the trigger it is no longer presented as current"
);
assert.ok(
  !/Current for/.test(after.freshnessLabel ?? ""),
  "S4. specifically: the season currency claim is gone, not merely reworded"
);
assert.equal(
  after.revalidationLabel,
  "Revalidation due — this was last verified before the expected September 1, 2026 release",
  "S5. and the line says a re-check is owed rather than scheduling one in the past"
);
// The verification itself is NOT withdrawn: it happened, and it still shows.
for (const [label, view] of [["before", before], ["after", after]] as const) {
  assert.equal(view.authorityLabel, "Official HOSA source", `S6. ${label}: the source is still official`);
  assert.equal(view.verifiedLabel, "Last verified July 5, 2026", `S7. ${label}: and the verification date still shows`);
}
// And nothing here claims a new season, a new document, or that the old one was superseded.
for (const view of [before, after]) {
  const rendered = [view.freshnessLabel, view.revalidationLabel, view.revalidationNote, view.authorityLabel].join(" ");
  for (const forbidden of ["2026-27 guidelines are now", "superseded", "out of date", "outdated", "no longer valid"]) {
    assert.ok(!rendered.includes(forbidden), `S8. no unsupported claim about the newer document: ${forbidden}`);
  }
}
ok("presentation: verified stays verified, currency lapses, and no new-season claim is invented");

// A record with no revalidation requirement is untouched by any of this.
const partner = HOSA_EVENTS.find((event) => event.revalidationRequired !== true);
assert.ok(partner, "S9. there is a record with no revalidation requirement to compare against");
const partnerView = presentSourceFreshness(hosaSourceMetadata(partner!), AFTER);
assert.equal(partnerView.revalidationLabel, null, "S10. and it gains no revalidation line from the passing date");
ok("presentation: only a record that states a date is affected by that date");

// ---- 3. THE NAVIGATOR SAYS THE SAME THING ------------------------------------------------------

const navigator = stripComments(read("components/training/hosa-event-navigator.tsx"));
assert.ok(
  /function presentedStatus\(record: HosaEventRecord, verified: boolean, now: Date\)/.test(navigator),
  "N1. the navigator decides the status it SHOWS from the date"
);
assert.ok(
  /return due \? "awaiting-season-revalidation" : record\.sourceStatus;/.test(navigator),
  "N2. and a due record borrows the registry's own awaiting wording"
);
assert.ok(
  /const status = presentedStatus\(record, verified, new Date\(\)\);/.test(navigator) &&
    /hosaStatusLabel\(status\)/.test(navigator),
  "N3. the rendered label is that presented status, not the stored one"
);
assert.ok(
  !/hosaStatusLabel\(verified \? record\.sourceStatus : "partial"\)/.test(navigator),
  "N4. and the old unconditional label is gone"
);
// The icon must agree with the words: a green check beside "awaiting revalidation" would assert with
// colour what the sentence denies, which is exactly what the status-in-words rule forbids.
assert.ok(
  /const Icon = status === "verified-current" \|\| status === "verified-stable" \? CheckCircle2 : HelpCircle;/.test(navigator),
  "N4a. the icon is chosen from the same presented status as the label"
);
assert.ok(
  !/const Icon = verified \? CheckCircle2 : HelpCircle;/.test(navigator),
  "N4b. and no longer from the stored verification alone"
);
// The shared indicator does the same: a due record loses the verified tone that paints it green.
assert.ok(
  /tone: authority === "official" && !degraded && verifiedLabel && !dueNow \? "verified" : "provisional"/.test(
    stripComments(read("lib/source-freshness.ts"))
  ),
  "N4c. and the shared freshness indicator drops its verified tone while a re-check is owed"
);
// The stored status is NOT rewritten — presentation only.
const registry = stripComments(read("lib/hosa-events.ts"));
assert.ok(/sourceStatus: "verified-current"/.test(registry), "N5. the record still records what it was verified as");
assert.ok(
  !/sourceStatus: "awaiting-season-revalidation"/.test(registry),
  "N6. nothing downgraded the stored status — that would be a research result, and no research happened"
);
assert.ok(/season: HOSA_CURRENT_SEASON/.test(registry) && /HOSA_CURRENT_SEASON = "2025-26"/.test(registry),
  "N7. and the season is untouched");
ok("navigator: the shown status follows the date; the stored status follows the evidence");

// ---- 4. AN OFFICIAL CLAIM IS SCOPED TO THE EVENT IT DESCRIBES ----------------------------------

const generator = stripComments(read("components/tests/practice-test-generator.tsx"));
assert.ok(
  /eventCluster === officialFormat\.eventName/.test(generator),
  "O1. the official claim is matched to the SELECTED category by the event's own name"
);
assert.ok(
  /const officialAppliesToSelection = Boolean\(/.test(generator),
  "O1a. through the one flag every official element is gated on"
);
assert.ok(
  /const officialAvailable = Boolean\(\s*officialFormat && officialAppliesToSelection/.test(generator),
  "O2. the official-format control cannot appear for a category the spec does not describe"
);
assert.ok(
  /\{officialClaims && officialAppliesToSelection \? <div className="space-y-3">\{officialClaims\}<\/div> : null\}/.test(generator),
  "O3. and neither can the source banner or the rubric"
);
assert.ok(
  /officialClaims && officialFormat && !officialAppliesToSelection/.test(generator),
  "O4a. the unsupported case is rendered on exactly the complement of the gate"
);
assert.ok(
  /No event-specific official specification/.test(generator) && /Original CompeteReady practice questions for \{eventCluster\}/.test(generator),
  "O4. and it names the selected category as CompeteReady practice rather than borrowing the specification"
);
// ONE RENDER SITE, AND IT IS THE GATED ONE. Asserting that the old block is absent is a snapshot of
// deleted code: any restyled copy defeats it, and a SECOND unguarded copy defeats it even unchanged.
// So the invariant is counted instead — the official components may appear on this page exactly once
// each, and only inside the prop handed to the generator.
const testsPage = stripComments(read("app/(app)/tests/page.tsx"));
for (const component of ["SpecBanner", "RubricBreakdown"]) {
  const mounts = testsPage.match(new RegExp(`<${component}\\b`, "g")) ?? [];
  assert.equal(mounts.length, 1, `O5. <${component}> is mounted exactly once on the tests page`);
}
{
  // …and that single mount is inside officialClaims: everything before the prop must contain neither.
  const beforeProp = testsPage.slice(0, testsPage.indexOf("officialClaims={"));
  assert.ok(beforeProp.length > 200, "O5a. control: the officialClaims prop was located");
  for (const component of ["SpecBanner", "RubricBreakdown"]) {
    assert.ok(
      !new RegExp(`<${component}\\b`).test(beforeProp),
      `O5b. no <${component}> renders above the generator, where the selection cannot reach it`
    );
  }
}
assert.ok(
  /officialClaims=\{/.test(testsPage) && /<SpecBanner organization=\{lockedOrganization\} \/>/.test(testsPage),
  "O6. the same components are handed to the generator instead, unchanged"
);
// The official-format CONTROL, not just the flag that decides it: the JSX must be gated too.
assert.ok(
  /\{officialAvailable && officialFormat \? \(/.test(generator),
  "O6a. the official-format control renders only under that flag"
);
assert.ok(
  /Match official format: \{officialFormat\.questionCount\} questions · \{officialFormat\.minutes\}-minute timer/.test(generator),
  "O6b. control: that is the control carrying the borrowed 50-question / 60-minute claim"
);
assert.equal(
  (generator.match(/Match official format/g) ?? []).length,
  1,
  "O6c. and it exists in exactly one place, so the gate cannot be bypassed by a second copy"
);
// BOTH selectors that name an event must agree before the claim speaks.
assert.ok(
  /\(officialEventTypes \?\? \[\]\)\.includes\(eventType\)/.test(generator),
  "O6d. the event TYPE must also be one the specification describes"
);
assert.ok(
  /officialEventTypes=\{/.test(testsPage) && /specEventTypesFor\(lockedOrganization, officialFormat\.eventName\)/.test(testsPage),
  "O6e. and that list comes from the same honest mapping findSpecForEvent uses"
);
// DECA's own arrangement is untouched.
assert.ok(
  /DECA&apos;s judged evaluation form scores a role-play/.test(testsPage),
  "O7. DECA keeps the explanation Repair 3C gave it"
);
ok("official claims: scoped to the selected event, with the unsupported case stating what it is");

// THE GATE COMPARES A SEEDED SPEC NAME TO A HARD-CODED UI LIST. If those two ever drift, the gate
// fails CLOSED and Medical Terminology silently loses the source, rubric and format it has really
// earned — a quieter defect than the one this phase fixed, and just as false. The seed is the origin
// of the database row, so the two are pinned against each other here.
{
  const seed = read("scripts/seed-competition-specs.ts");
  const hosaSection = seed.slice(seed.indexOf('organization: "HOSA"'));
  const eventName = /eventName: "([^"]+)"/.exec(hosaSection)?.[1];
  assert.ok(eventName, "O8a. the seeded HOSA spec names an event");
  assert.equal(eventName, "Medical Terminology", "O8b. and it is the one this gate expects");
  assert.ok(
    HOSA_EVENT_CATEGORIES.includes(eventName!),
    "O8. the seeded spec's event name is one of the selectable categories — otherwise the gate can never open"
  );
  assert.equal(
    HOSA_EVENT_CATEGORIES.filter((category) => category === eventName).length,
    1,
    "O9. exactly one category matches it, so exactly one category can carry the claim"
  );
}
ok("official claims: the gate's two sides are pinned to each other, so it cannot fail open or shut silently");

// ---- 5. TRACK COPY NAMES THE LEARNER'S OWN ORGANIZATION ----------------------------------------

const hub = stripComments(read("components/training/track-controls.tsx"));
assert.ok(
  /HOSA: "Original questions and scenarios written for practice and labelled as such — not official HOSA exam items/.test(hub),
  "C1. the HOSA hub describes HOSA practice"
);
assert.ok(
  /DECA: "Original scenarios written for practice and labelled as such — not official DECA prompts/.test(hub),
  "C2. DECA keeps its own truthful line"
);
assert.ok(/GENERAL_DEBATE:/.test(hub), "C3. and Debate has one of its own rather than borrowing");
assert.ok(
  /PRACTICE_SOURCE_NOTE\[trackId\] \?\? PRACTICE_SOURCE_NOTE_FALLBACK/.test(hub),
  "C4. the sentence is selected by the track being viewed, with a track-neutral fallback"
);
// The component must not be able to say DECA to a non-DECA learner again.
const hubRendered = hub.slice(hub.indexOf("export function TrackControls"));
assert.ok(!/DECA/.test(hubRendered), "C5. no organization is named in the rendered body — only through the table");

const resultsPage = stripComments(read("app/(app)/tests/[testId]/results/page.tsx"));
assert.ok(
  /test\.organization === "DECA"\s*\?\s*"Nothing here maps to a written DECA lesson yet\./.test(resultsPage),
  "C6. the DECA sentence is now reachable only by a DECA result"
);
assert.ok(
  /No written \$\{test\.organization\} lesson covers this result yet\./.test(resultsPage),
  "C7. and every other track is told about its own missing lesson"
);
// REACHABILITY, not existence. The charter's requirement is that a HOSA result can never show the
// DECA sentence, so the sentence must occur exactly once and that occurrence must sit on the DECA
// side of an organization test. Counting is what makes a second, ungated copy impossible.
{
  const occurrences = resultsPage.match(/Nothing here maps to a written DECA lesson yet\./g) ?? [];
  assert.equal(occurrences.length, 1, "C8. the DECA sentence exists exactly once");
  const index = resultsPage.indexOf("Nothing here maps to a written DECA lesson yet.");
  const preceding = resultsPage.slice(Math.max(0, index - 200), index);
  assert.ok(
    /test\.organization === "DECA"[\s\S]*\?[\s\S]*$/.test(preceding),
    "C8a. and it is the true branch of an organization test, so no other track can reach it"
  );
}
// The same for the generic branch: one copy, and it names the record's own organization.
assert.equal(
  (resultsPage.match(/No written \$\{test\.organization\} lesson covers this result yet\./g) ?? []).length,
  1,
  "C8b. every non-DECA track gets exactly one sentence, naming its own organization"
);
// The DECA diagnostic bridge itself is untouched.
assert.ok(
  /const diagnosticRoutes = test\.organization === "DECA" \? decaDiagnosticRoutesForLearner\(test\.weakAreas\) : \[\];/.test(resultsPage),
  "C9. a DECA result still resolves its real lessons through the bridge"
);
assert.ok(/Read the lesson/.test(resultsPage) && /Drill \{route\.areaLabel\.toLowerCase\(\)\}/.test(resultsPage),
  "C10. and still offers the lesson and the drill it names");
ok("track copy: each track is told about its own organization, and DECA's bridge is intact");

console.log(results.join("\n"));
console.log(
  "HOSA source-scope smoke passed. EXECUTED: the revalidation boundary is decided by a real calendar date — not due the " +
    "instant before the trigger, due on it, cleared again by a later verification, and never raised by a missing or " +
    "malformed date; the Medical Terminology record presents as 'Current for 2025-26' before that date and 'Awaiting " +
    "revalidation against the next release' after it, while keeping 'Official HOSA source' and 'Last verified July 5, " +
    "2026' in both cases and claiming nothing about what any newer document says; a record that states no revalidation " +
    "gains no warning from the same date. ASSERTED FROM SOURCE: the navigator shows a presented status while the registry " +
    "keeps the stored one, its season and status literals unchanged; the official source banner, rubric and format control " +
    "render only while the selected category is the event the specification names, with the other fifteen categories " +
    "stating their own CompeteReady provenance instead; the HOSA hub and HOSA test results name HOSA rather than DECA, " +
    "each track's practice note is chosen by the track being viewed, and the DECA diagnostic bridge still routes a DECA " +
    "result to its real lesson and drill. NOT PROVEN HERE: the rendered client behaviour of the selection itself — that " +
    "was verified in a running dev server and is recorded in the phase report."
);
