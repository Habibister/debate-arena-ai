/**
 * deca-source-truth:smoke — scoring, source and timing TRUTH on the DECA surfaces
 * (Owner QA Repair 3C: Round-2 findings #16 #18 #19 #20).
 *
 * Strict-safe: imports only pure modules and reads source files. No .env, no database, no network,
 * no provider. The two registries it compares (the Navigator's pure family record and the seeded
 * competition specification) are read as data and as source text respectively.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DECA_FAMILIES, DECA_PROVENANCE_NOTE, decaStatusLabel } from "../lib/deca-events";
import { decaClusterHasOfficialSpec, decaEventNameForCluster, DECA_GENERIC_EVENT_NAME, DECA_SPEC_EVENT_NAME } from "../lib/deca-spec-scope";
import { rubricLineNamesNoScoredBehaviour } from "../lib/rubrics";
import { DECA_CLUSTERS } from "../lib/training-tracks";

const results: string[] = [];
let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    results.push(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    results.push(`FAIL ${name}\n     ${error instanceof Error ? error.message : String(error)}`);
  }
}
const read = (p: string) => readFileSync(p, "utf8");
const stripComments = (src: string) =>
  src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

const TESTS = "app/(app)/tests/page.tsx";
const ROOM = "components/rooms/roleplay-room.tsx";
const SETUP = "components/training/deca-roleplay-setup.tsx";
const SCOPE = "lib/deca-spec-scope.ts";
const SEED = "scripts/seed-competition-specs.ts";

// ---------------------------------------------------------------------------------------------
check("S1. the tests page shows a rubric only where that rubric really is the test's scoring rule", () => {
  const tests = stripComments(read(TESTS));
  // DECA's only seeded spec is a ROLE-PLAY event, so its judged form is not mounted here.
  assert.match(tests, /\{lockedOrganization === "HOSA" \? \(/, "S1a the attribution is per organization, because the two specs are different kinds of document");
  assert.match(tests, /\{lockedOrganization === "HOSA" \? \([\s\S]{0,400}?<RubricBreakdown organization=\{lockedOrganization\} \/>/, "S1b HOSA keeps its rubric — one point per correct item IS this product's scoring rule");
  const decaBranch = tests.slice(tests.indexOf('lockedOrganization === "DECA"'), tests.indexOf("</div>", tests.indexOf('lockedOrganization === "DECA"')));
  assert.ok(decaBranch.length > 100, "S1-C the DECA branch was located");
  assert.ok(!/RubricBreakdown|SpecBanner/.test(decaBranch), "S1c DECA gets neither the role-play form nor an event attribution — nothing on this page derives from that spec");
  assert.match(decaBranch, /your result is the share you\s*\n?\s*answer correctly/, "S1d it states the scoring rule that actually applies");
  assert.match(decaBranch, /DECA&apos;s judged evaluation form scores a role-play, not a test like this one/, "S1e and says what the judged form is for");
  // HOSA's own rubric line really is the test rule, in the seed.
  const seedText = read(SEED);
  const mt = seedText.slice(seedText.indexOf('eventName: "Medical Terminology"'), seedText.indexOf('eventName: "Medical Terminology"') + 1400);
  assert.match(mt, /name: "Test score", points: 50, description: "One point per correct item/, "S1f control: HOSA's rubric is the written test's scoring rule");
  assert.match(mt, /Pure knowledge test — no judged presentation component\./, "S1g and its own notes say there is no judged presentation");
  // The grading route really is answer-key equality: no rubric, no spec, no points.
  const grade = stripComments(read("app/api/tests/[testId]/grade/route.ts"));
  assert.match(grade, /const score = Math\.round\(\(correctCount \/ Math\.max\(test\.questions\.length, 1\)\) \* 100\);/, "S1h the score is the proportion correct");
  for (const banned of ["competition-specs", "getSpecRubricBreakdown", "getWeightedScoringRubric", "findSpecForEvent", "rubric"]) {
    assert.ok(!grade.includes(banned), `S1i the grading route never reads rubric data (${banned})`);
  }
  // Control: the form still exists where it belongs — the event's own page.
  assert.match(stripComments(read("app/(app)/training/[track]/event/[eventSlug]/page.tsx")), /<RubricBreakdown organization=\{config\.organization\} eventType=\{config\.rubricEventType\} \/>/, "S1-C the role-play form is still shown on the event page, with its event named");
});

check("S2. an official test format is claimed only where the specification actually carries one", () => {
  const tests = stripComments(read(TESTS));
  assert.match(tests, /<SpecBanner organization=\{lockedOrganization\} \/>/, "S2a the specification banner survives for the organization whose spec IS the test");
  assert.match(tests, /getOfficialTestFormat\(lockedOrganization\)/, "S2b and that format is read from the same specification");
  // DECA's exam segment carries no duration, so no official format resolves for it — which is why the
  // DECA branch shows no attribution at all rather than crediting a role-play event for a test.
  const seedText = read(SEED);
  const hlmSeed = seedText.slice(seedText.indexOf('eventName: "Hotel and Lodging Management Series"'), seedText.indexOf('eventName: "Hotel and Lodging Management Series"') + 1400);
  assert.match(hlmSeed, /name: "Cluster Exam", speaker: "Individual participant", minutes: null/, "S2e DECA's exam segment carries no duration");
  const mtSeed = seedText.slice(seedText.indexOf('eventName: "Medical Terminology"'), seedText.indexOf('eventName: "Medical Terminology"') + 1400);
  assert.match(mtSeed, /minutes: 60, notes: "50 multiple-choice items/, "S2f HOSA's does, which is the format the generator offers");
  // getOfficialTestFormat reads the EXAM segment, never the rubric.
  const specs = stripComments(read("lib/competition-specs.ts"));
  const fnStart = specs.indexOf("export async function getOfficialTestFormat");
  const fn = specs.slice(fnStart, specs.indexOf("\nexport ", fnStart + 10));
  assert.ok(fn.length > 200, "S2-C the function was located");
  assert.match(fn, /multiple-choice/, "S2c it matches the multiple-choice exam segment");
  assert.ok(!/rubric|points/i.test(fn), "S2d and reads no rubric or point value");
});

// ---------------------------------------------------------------------------------------------
check("S3. one cluster-coverage rule decides every official DECA attribution", () => {
  const scope = stripComments(read(SCOPE));
  assert.match(scope, /export function decaClusterHasOfficialSpec\(cluster: string \| null \| undefined\): boolean/, "S3a the rule is one exported function");
  assert.match(scope, /\/hospitality\|tourism\|lodging\|hotel\/i\.test\(cluster\)/, "S3b with one regex");
  // Behaviour over the real cluster list: exactly the seeded event's cluster is covered.
  const covered = DECA_CLUSTERS.filter((cluster) => decaClusterHasOfficialSpec(cluster));
  assert.deepEqual(covered, ["Hospitality & Tourism"], `S3c exactly one of the ${DECA_CLUSTERS.length} clusters is covered (${covered.join(", ")})`);
  for (const cluster of DECA_CLUSTERS) {
    assert.equal(decaEventNameForCluster(cluster), decaClusterHasOfficialSpec(cluster) ? DECA_SPEC_EVENT_NAME : DECA_GENERIC_EVENT_NAME, `S3d ${cluster} is named honestly`);
  }
  assert.equal(decaClusterHasOfficialSpec(null), false, "S3e absent cluster is never covered");
  assert.equal(decaClusterHasOfficialSpec(""), false, "S3f empty cluster is never covered");
  // No consumer keeps its own copy — one place, or the two could drift.
  for (const file of [ROOM, "lib/ai.ts", SETUP]) {
    assert.ok(!/\/hospitality\|tourism\|lodging\|hotel\/i/.test(read(file)), `S3g ${file} does not re-implement the coverage rule`);
    assert.match(read(file), /deca-spec-scope/, `S3h ${file} asks the shared rule`);
  }
});

check("S4. the simulation clock is called OFFICIAL only for the cluster the specification covers", () => {
  const room = stripComments(read(ROOM));
  assert.match(room, /const officialTimingApplies = isSim && decaClusterHasOfficialSpec\(config\?\.track === "deca" \? config\.cluster : null\);/, "S4a the official claim is gated on the learner's own cluster");
  assert.match(room, /const prepClockLabel = officialTimingApplies\s*\n?\s*\? `Official prep — \$\{officialPrep\?\.prepMinutes\} min`\s*\n?\s*: `Practice timer — \$\{officialPrep\?\.prepMinutes\} min`;/, "S4b an uncovered cluster gets a practice timer, named as one — the round stays timed");
  assert.match(room, /const performClockLabel = officialTimingApplies \? "Performance time with the judge" : "Practice performance timer";/, "S4c and so does the performance clock");
  assert.ok(!/aria-hidden \/>Official prep — \{officialPrep\?\.prepMinutes\} min/.test(room), "S4d no ungated official label remains in the markup");
  assert.match(room, /aria-hidden \/>\{prepClockLabel\}/, "S4e the heading renders the gated label");
  assert.match(room, /aria-hidden \/>\{performClockLabel\}/, "S4f likewise the performance heading");
  // Where it IS official, the claim carries its attribution — event, season, and where it came from.
  assert.match(room, /minutes is the sourced preparation period for \$\{officialPrep\?\.eventName\} \(\$\{officialPrep\?\.season\}\)\$\{officialPrep\?\.verificationStatus !== "VERIFIED" \? " — partially verified" : ""\}/, "S4g an official clock names the event, the season AND the same verification qualifier every sibling surface carries");
  assert.match(room, /no official preparation period is sourced for this career cluster/i, "S4h and an unofficial one says so");
});

check("S5. a simulation with no resolved clock says it is untimed instead of promising one", () => {
  const room = stripComments(read(ROOM));
  assert.match(room, /const simulationRequested = config\?\.track === "deca" && config\.simulation === true;/, "S5a the room knows the learner asked for the timed round");
  assert.match(room, /const timingUnavailable = simulationRequested && !isSim;/, "S5b and knows the clock did not resolve");
  assert.match(room, /Running untimed/, "S5c which is stated");
  assert.match(room, /No preparation period is available for this round right now, so there is no clock/, "S5d in plain words");
  assert.match(room, /const performanceUntimed = isSim && performTotal === 0;/, "S5e a timed prep with no performance length is also named");
  assert.match(room, /Preparation was timed; the meeting itself is not/, "S5f rather than silently dropping the second clock");
  // The gate that makes the degradation possible is unchanged: no prep minutes, no simulation clocks.
  assert.match(room, /const isSim = config\?\.track === "deca" && config\.simulation && Boolean\(officialPrep\?\.prepMinutes\);/, "S5-C control: the clock still requires a resolved preparation period");
});

check("S6. the setup screen tells the learner which clock this run will use, before the room", () => {
  const setup = stripComments(read(SETUP));
  assert.match(setup, /const officialTiming = decaClusterHasOfficialSpec\(cluster\);/, "S6a the setup asks the same rule");
  assert.match(setup, /Hospitality & Tourism is the one cluster our sourced specification covers/, "S6b and names the covered cluster");
  assert.match(setup, /any clock in this run is CompeteReady's practice timer, not DECA's\. The room tells you which one you got\./, "S6c an uncovered cluster is told whose clock it is — and the setup never promises a clock the registry might not produce");
  assert.ok(!/the round is timed, but/.test(setup), "S6c2 the unconditional timing promise is gone");
  assert.match(setup, /where a preparation period is available this run uses that event's own/, "S6c3 even the covered claim is conditional on one resolving");
  assert.match(setup, /\{isSim \? \(/, "S6d shown only for the simulation, which is what claims a clock");
});

check("S7. the Event HQ simulation card no longer promises an official clock for a cluster chosen later", () => {
  const hq = stripComments(read("app/(app)/training/[track]/event/[eventSlug]/page.tsx"));
  assert.ok(!/The complete round on the official prep clock\./.test(hq), "S7a the unconditional official-clock promise is gone");
  assert.match(hq, /Pick Hospitality & Tourism to run it on this event's sourced preparation period where one is available; other clusters use a practice timer\./, "S7b the condition is stated where the learner chooses");
  assert.ok(!/"Full Simulation \(timed\)"/.test(hq), "S7c and the card no longer asserts a clock the registry might not produce");
});

// ---------------------------------------------------------------------------------------------
check("S8. the two provenance systems describe different scopes, and say so", () => {
  // The Navigator record is FAMILY-level and carries no season; the specification is one event's.
  const series = DECA_FAMILIES.find((family) => family.id === "individual-series");
  assert.ok(series, "S8-C the family record exists");
  assert.equal(series!.season, undefined, "S8a the family record carries no season");
  assert.equal(series!.sourceStatus, "partial", "S8b and no official-source claim");
  assert.equal(decaStatusLabel("partial"), "Official source and season not yet verified", "S8c whose label is unchanged");
  assert.match(DECA_PROVENANCE_NOTE, /This is a family-level record/, "S8d the note names its scope");
  assert.match(DECA_PROVENANCE_NOTE, /its Event HQ page shows them with that event's season and verification date, and for that event it is the more specific source/, "S8e and points at the more specific source rather than contradicting it");
  assert.match(DECA_PROVENANCE_NOTE, /one event being sourced does not verify the family, so it says nothing about yours/, "S8e2 while refusing to let one event's verification travel back to the family");
  assert.match(DECA_PROVENANCE_NOTE, /CompeteReady's approved research record/, "S8-C2 control: the existing attribution is intact");
  // The specification names its event and season on every surface that shows it.
  const banner = stripComments(read("components/specs/spec-banner.tsx"));
  assert.match(banner, /specAttribution\(spec\)/, "S8f the banner attributes the specification");
  assert.match(banner, /\$\{spec\.eventName\}/, "S8g and names the event it belongs to");
  assert.match(banner, /"partially verified" : "unverified draft"/, "S8h with its own verification status");
});

check("S9. neither store may silently drift from the other on the facts they share", () => {
  // Both carry the Individual Series round shape. They are separate, hand-maintained stores, so a
  // change to one must show up here rather than as two different numbers in front of a learner.
  const series = DECA_FAMILIES.find((family) => family.id === "individual-series")!;
  const seed = read(SEED);
  const hlm = seed.slice(seed.indexOf('eventName: "Hotel and Lodging Management Series"'), seed.indexOf('eventName: "Hotel and Lodging Management Series"') + 1400);
  assert.ok(hlm.length > 500, "S9-C the seeded specification was located");
  assert.equal(series.verifiedFacts?.preparationMinutes, 10, "S9a the family record's preparation period");
  assert.match(hlm, /perCompetitorMinutes: 10/, "S9b matches the specification's");
  assert.equal(series.verifiedFacts?.rolePlayMinutes, 10, "S9c the family record's meeting length");
  assert.match(hlm, /name: "Role-play with judge", speaker: "Participant \+ judge", minutes: 10/, "S9d matches the specification's");
  assert.equal(series.verifiedFacts?.examQuestionCount, 100, "S9e the family record's exam size");
  assert.match(hlm, /100-question multiple-choice/, "S9f matches the specification's");
  // And the name the product attributes must be the name the specification actually carries, or the
  // clock and the scenario would credit an event the registry has never seeded.
  assert.ok(hlm.includes(`eventName: "${DECA_SPEC_EVENT_NAME}"`), `S9g the attributed event name is the seeded one (${DECA_SPEC_EVENT_NAME})`);
  assert.ok(seed.includes(`eventName: "${DECA_SPEC_EVENT_NAME}"`), "S9h and appears exactly there in the seed");
});

// ---------------------------------------------------------------------------------------------
check("S10. the Career cluster and Difficulty controls both reach generation", () => {
  const setup = stripComments(read(SETUP));
  const room = stripComments(read(ROOM));
  const ai = stripComments(read("lib/ai.ts"));
  // Cluster: state -> config -> request -> prompt, and the deterministic fallback too.
  assert.match(setup, /writeRoleplayConfig\(\{ track: "deca", level, cluster, studentRole, judgeRole, simulation: isSim \}\)/, "S10a the setup persists both controls");
  assert.match(room, /"\/api\/ai\/deca-scenario", \{ level: cfg\.level, eventType: decaEventNameForCluster\(cfg\.cluster\), cluster: cfg\.cluster/, "S10b both are sent with the scenario request");
  assert.match(ai, /Career cluster: \$\{input\.cluster\}/, "S10c the cluster is in the generation prompt");
  assert.match(ai, /Create a \$\{input\.level\} DECA role-play\./, "S10d and so is the difficulty");
  assert.match(ai, /\$\{roleplayContentSpec\(input\.level\)\}/, "S10e which selects a real content specification");
  // Difficulty also changes the room and the scoring bar — not only the prompt.
  assert.match(room, /const maxExchanges = roleplayTurnCap\(config\?\.level \?\? "BEGINNER"\);/, "S10f difficulty sets the turn cap");
  assert.match(ai, /\$\{roleplayScoringBar\(input\.level\)\}/, "S10g and the scoring bar");
  const cfg = stripComments(read("components/rooms/roleplay-config.ts"));
  assert.match(cfg, /level === "BEGINNER" \? 4 : level === "ELITE" \? 8 : 6/, "S10h with three distinct turn caps");
});

check("S11. the setup's editable roles are not presented as a preview of the cluster", () => {
  const setup = stripComments(read(SETUP));
  assert.match(setup, /The career cluster and difficulty shape the scenario the room generates\./, "S11a the page says what the controls do");
  // SUPERSEDED by beginner QA R3 #12. 3C's repair was to SAY the roles do not follow the cluster,
  // because rewiring them was out of scope then. A beginner picking Finance still got a hotel front
  // desk and was asked to fix it themselves, so R3 rewired the defaults per cluster. The control keeps
  // its purpose — the fields must not read as a live preview of the cluster — and now pins the
  // behaviour that replaced the disclaimer.
  assert.match(setup, /they follow the cluster\s*\n?\s*until you type your own/, "S11b and says how the role fields relate to it");
  assert.match(setup, /function chooseCluster\(next: string\)/, "S11b-1 which is what the control does");
  assert.match(setup, /Custom roles\./, "S11b-2 with a named state once the learner takes them over");
  // Non-vacuity: the fields really are independent state with no cluster derivation.
  assert.ok(!/useEffect/.test(setup), "S11-C control: nothing recomputes them, which is why it is said rather than wired");
  assert.ok(!/placeholder="e\.g\. front desk manager"|placeholder="e\.g\. frustrated hotel guest"/.test(setup), "S11c the empty-field hints no longer model one cluster under every cluster");
});

// ---------------------------------------------------------------------------------------------
check("S12. the authored instrument is never announced as the official one", () => {
  const ai = stripComments(read("lib/ai.ts"));
  // The official attribution exists only behind the sourcing + semantic-completeness gates.
  assert.match(ai, /const allSourced = breakdown\.categories\.every\(\(category\) => category\.provenance === "sourced"\);\s*\n\s*if \(!allSourced\) return null;/, "S12a a non-sourced rubric is never announced as official");
  assert.match(ai, /if \(breakdown\.categories\.some\(\(category\) => rubricLineNamesNoScoredBehaviour\(category\.name\)\)\) return null;/, "S12b nor one whose lines name no scored behaviour (B4.1)");
  assert.match(ai, /const hasRegistry = false;/, "S12c and a rubric line can never become a performance indicator");
  // The gate really rejects the shape the seeded rubric has.
  assert.equal(rubricLineNamesNoScoredBehaviour("Performance indicator 1"), true, "S12d a bare indicator slot names no behaviour");
  assert.equal(rubricLineNamesNoScoredBehaviour("Solution: Unique"), false, "S12e a named criterion does");
  // The ballot's attribution line only renders when that tag survived the gates.
  const room = stripComments(read(ROOM));
  assert.match(room, /\{result\.rubricSource \? \(/, "S12f the ballot attributes a rubric only when one was tagged");
  assert.match(room, /Scored against \{result\.rubricSource\.eventName\} \{result\.rubricSource\.season\}/, "S12g naming the event and season");
  assert.ok(!/Official DECA (rubric|judge sheet|score)/i.test(room), "S12h and never calls the authored instrument official");
  assert.ok(!/Novice|Developing|Proficient|Exemplary/.test(ai.slice(ai.indexOf("judgeDecaRoleplay"), ai.indexOf("judgeDecaRoleplay") + 4000)), "S12i the official performance bands are still not claimed to the provider");
});

check("S13. the AI-generated scenario source attribution is untouched", () => {
  const controls = stripComments(read("components/training/track-controls.tsx"));
  assert.match(controls, /AI-generated CompeteReady practice/, "S13a the source is stated");
  assert.match(controls, /not official DECA prompts/, "S13b and distinguished from an official prompt");
  assert.ok(!/PRACTICE_SOURCES|setSource|useState<PracticeSource>/.test(controls), "S13c with no selector to imply another source exists");
});

console.log(results.join("\n"));
console.log(`\n${results.length - failures}/${results.length} DECA source-truth controls passed`);
if (failures > 0) process.exit(1);
