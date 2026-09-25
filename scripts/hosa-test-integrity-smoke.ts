/**
 * HOSA PRACTICE-TEST INTEGRITY SMOKE (phase H3). Run with: npm run hosa-test-integrity:smoke
 *
 * The practice-test system claimed more than it could do, in four separate ways, each measured on this
 * tree before the repair:
 *
 *   1. A ten-question HOSA set contained FOUR distinct stems; a fifty-question set contained sixteen.
 *   2. ONE trio of wrong answers was shared by all sixteen categories, and every correct answer began
 *      "Use " — so the set was answerable with no health-science knowledge at all.
 *   3. Retired and unassessed events were offered as current options: Model UN sat in the same enum the
 *      generator rendered, and HOSA's Prepared Speaking was offered for a written test its own
 *      `allowedModes` exclude. The API validated none of it.
 *   4. Under "Why your answer missed", the page asserted why the learner's chosen option was weaker
 *      using a fixed template that never read their choice.
 *
 * What replaced them is executed here, not described: Medical Terminology is served from the real
 * 180-item bank, everything without a question source fails closed, and the option rule is one function
 * that both the client and the API ask.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EVENT_OPTIONS } from "@/lib/rubrics";
import { HOSA_EVENT_CATEGORIES, DECA_EVENT_CLUSTERS } from "@/lib/testing";
import { MEDTERM_BANK } from "@/lib/hosa-medterm";
import { buildFallbackPracticeQuestions } from "@/lib/test-question-bank";
import { hosaMedTermPracticeQuestions, HOSA_MEDTERM_BANK_SIZE } from "@/lib/hosa-test-source";
import {
  HOSA_TESTABLE_CATEGORY,
  testSelectionIsServable,
  testUnavailableReason,
  testableCategories,
  testableEventTypes,
  untestableCategories
} from "@/lib/test-availability";
import { isTrackRetired, trackByOrganization } from "@/lib/training-tracks";

const read = (file: string) => readFileSync(file, "utf8");
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const results: string[] = [];
const ok = (message: string) => results.push(`  ok  ${message}`);

// ---- 1. NO RETIRED OR UNASSESSED EVENT IS A CURRENT OPTION -------------------------------------

for (const organization of ["DECA", "HOSA"] as const) {
  for (const option of testableEventTypes(organization)) {
    assert.ok(
      option.allowedModes.includes("TEST"),
      `O1. ${organization}/${option.value} is offered only because its own allowedModes include TEST`
    );
    const track = trackByOrganization(organization);
    assert.ok(track && !isTrackRetired(track.id), `O2. ${organization} is a track we still train`);
  }
}
// Model UN is retired: it must produce no current option anywhere in this rule.
for (const retired of ["MODEL_UN", "MOCK_TRIAL", "PUBLIC_SPEAKING"]) {
  assert.equal(
    testSelectionIsServable({ organization: retired, eventType: "COMMITTEE_SPEECH", eventCluster: "Marketing" }),
    false,
    `O3. ${retired} cannot be selected for a practice test`
  );
}
// …and it is not merely absent from a list — the enum still holds it, which is the point.
assert.ok(EVENT_OPTIONS.MODEL_UN && EVENT_OPTIONS.MODEL_UN.length > 0, "O4. control: Model UN still exists in the registry");
assert.equal(
  EVENT_OPTIONS.MODEL_UN.filter((option) => option.allowedModes.includes("TEST")).length,
  0,
  "O5. and none of its events was ever declared testable"
);
ok("options: only a trained organization's own TEST-declared events can be selected");

// ---- 1b. A RETIRED TRACK IS NOT A CURRENT ACTION ANYWHERE ---------------------------------------
//
// The practice-test system never could start a Model UN set — its schema is z.enum(["DECA","HOSA"])
// and the generator's own type is the same pair. The live door was somewhere else: the debate room
// read the URL through the RETIREMENT-BLIND lookup, so /debate?track=model-un resolved the retired
// track, set the organization on the round, and the create route refused only HOSA.
{
  const room = stripComments(read("components/debate/debate-room.tsx"));
  assert.ok(
    /const requestedTrack = trackBySlug\(track \?\? ""\);/.test(room),
    "M1. the room still looks the requested slug up"
  );
  assert.ok(
    /requestedTrack && !isTrackRetired\(requestedTrack\.id\) \? requestedTrack : trackById\(DEFAULT_TRACK\)/.test(room),
    "M2. but a retired track is treated as no selection, falling back to General Debate"
  );
  assert.ok(
    !/trackBySlug\(track \?\? ""\) \?\? trackById\(DEFAULT_TRACK\)/.test(room),
    "M3. and the retirement-blind form is gone"
  );

  const debates = stripComments(read("app/api/debates/route.ts"));
  assert.ok(
    /const requestedTrack = trackByOrganization\(input\.organization\);/.test(debates) &&
      /if \(requestedTrack && isTrackRetired\(requestedTrack\.id\)\) \{/.test(debates),
    "M4. and the create route refuses a retired organization server-side, so the client is not the only gate"
  );
  assert.ok(/410/.test(debates), "M5. with the same withdrawn contract the product already uses");
  // Reading history is untouched: the guard is in POST only.
  const getBlock = debates.slice(debates.indexOf("export async function GET"), debates.indexOf("export async function POST"));
  assert.ok(!/isTrackRetired/.test(getBlock), "M6. listing existing rounds is unaffected — history keeps its real labels");
}
// The registry still holds Model UN, which is what makes the guards necessary rather than moot.
{
  const modelUn = trackByOrganization("MODEL_UN");
  assert.ok(modelUn, "M7. control: the Model UN track record still exists");
  assert.equal(isTrackRetired(modelUn!.id), true, "M8. control: and it is retired, so the guards above have a live target");
}
ok("retired tracks: not startable in the room or the API, still readable in history");

// PREPARED_SPEAKING specifically — a prepared presentation, not a written exam.
{
  const prepared = EVENT_OPTIONS.HOSA.find((option) => option.value === "PREPARED_SPEAKING");
  assert.ok(prepared, "O6. control: HOSA still offers Prepared Speaking as an event");
  assert.ok(!prepared!.allowedModes.includes("TEST"), "O7. and its own configuration excludes TEST");
  assert.ok(
    !testableEventTypes("HOSA").some((option) => option.value === "PREPARED_SPEAKING"),
    "O8. so it is not a test option"
  );
  assert.equal(
    testSelectionIsServable({ organization: "HOSA", eventType: "PREPARED_SPEAKING", eventCluster: HOSA_TESTABLE_CATEGORY }),
    false,
    "O9. and the API refuses it even with a servable category beside it"
  );
}
// HOSA keeps exactly the one event type that is assessed by a written test.
assert.deepEqual(
  testableEventTypes("HOSA").map((option) => option.value),
  ["HEALTH_SCIENCE_EVENT"],
  "O10. HOSA's testable event list is exactly its written-test event"
);
// DECA is untouched by this phase.
assert.deepEqual(
  testableEventTypes("DECA").map((option) => option.value),
  ["ROLEPLAY", "CASE_STUDY"],
  "O11. DECA keeps both of its testable events"
);
assert.deepEqual(testableCategories("DECA"), [...DECA_EVENT_CLUSTERS], "O12. and every DECA cluster it always offered");
assert.deepEqual(untestableCategories("DECA"), [], "O13. so nothing was taken from DECA");
ok("options: Prepared Speaking is gone from TEST, DECA is unchanged");

// ---- 2. A CATEGORY IS OFFERED ONLY WHERE QUESTIONS EXIST ---------------------------------------

assert.deepEqual(testableCategories("HOSA"), [HOSA_TESTABLE_CATEGORY], "C1. HOSA can test the one category it has a bank for");
assert.equal(untestableCategories("HOSA").length, 15, "C2. and names the fifteen it cannot, rather than dropping them");
assert.ok(!untestableCategories("HOSA").includes(HOSA_TESTABLE_CATEGORY), "C3. control: the testable one is not in that list");
assert.equal(
  testableCategories("HOSA").length + untestableCategories("HOSA").length,
  HOSA_EVENT_CATEGORIES.length,
  "C4. every listed category is accounted for as testable or not"
);
for (const category of untestableCategories("HOSA")) {
  assert.equal(
    testSelectionIsServable({ organization: "HOSA", eventType: "HEALTH_SCIENCE_EVENT", eventCluster: category }),
    false,
    `C5. ${category} cannot be generated while nothing can answer for it`
  );
  assert.match(
    testUnavailableReason({ organization: "HOSA", eventType: "HEALTH_SCIENCE_EVENT", eventCluster: category }),
    new RegExp(`Practice tests are not available for ${category} yet`),
    `C6. and the refusal names the category rather than blaming the learner`
  );
}
assert.equal(
  testSelectionIsServable({ organization: "HOSA", eventType: "HEALTH_SCIENCE_EVENT", eventCluster: HOSA_TESTABLE_CATEGORY }),
  true,
  "C7. Medical Terminology is servable"
);
// ABSENCE IS NOT A SELECTION. `eventCluster` is optional in the creation schema, so a request with no
// category is reachable — and while this rule answered "servable" for it, a HOSA set could be built
// for no category at all, which is how the template generator kept reaching HOSA learners through the
// provider helper's own internal fallback. Both organizations are checked: neither may fail open.
for (const organization of ["HOSA", "DECA"] as const) {
  const eventType = testableEventTypes(organization)[0]!.value;
  assert.equal(
    testSelectionIsServable({ organization, eventType }),
    false,
    `C8. ${organization} with no category is refused, not treated as "any category"`
  );
  assert.equal(
    testSelectionIsServable({ organization, eventType, eventCluster: "" }),
    false,
    `C8a. ${organization} with an empty category is refused too`
  );
  assert.match(
    testUnavailableReason({ organization, eventType }),
    /Choose an event category/,
    `C8b. and the refusal asks for the missing choice`
  );
}
ok("categories: a missing or empty category is refused rather than standing in for all of them");
ok("categories: one HOSA category is testable, fifteen are refused by name");

// ---- 3. THE RETAINED HOSA PATH IS A REAL ASSESSMENT --------------------------------------------

assert.equal(HOSA_MEDTERM_BANK_SIZE, MEDTERM_BANK.length, "Q0. the source is the real bank, not a copy");
assert.equal(MEDTERM_BANK.length, 180, "Q0a. control: the bank still holds 180 items and was not rewritten here");

for (const count of [10, 25, 50, 100]) {
  const questions = hosaMedTermPracticeQuestions(count, deterministicRng(count));
  assert.equal(questions.length, count, `Q1. a ${count}-question set really holds ${count} questions`);

  const stems = questions.map((question) => question.question);
  assert.equal(new Set(stems).size, count, `Q2. all ${count} stems are distinct — no repeated-stem cycle`);

  // The defect being replaced was ONE trio of wrong answers shared by every item in every category, so
  // what matters is that no trio DOMINATES. Strict uniqueness would be a false alarm: two bank items
  // may legitimately share an option pool when they share a key — wr-25 ("the combining form 'enter/o'
  // refers specifically to the:") and an-05 ("where does most nutrient absorption occur?") both answer
  // "Small intestine" and both offer the neighbouring GI organs. That overlap is recorded as bank debt,
  // not repaired here.
  const tripleCounts = new Map<string, number>();
  for (const question of questions) {
    const triple = question.choices.filter((choice) => choice !== question.correctAnswer).sort().join("||");
    tripleCounts.set(triple, (tripleCounts.get(triple) ?? 0) + 1);
  }
  const mostCommon = Math.max(...tripleCounts.values());
  assert.ok(mostCommon <= 2, `Q3. no set of wrong answers dominates a ${count}-question set (worst repeat ${mostCommon})`);
  assert.ok(
    tripleCounts.size >= count - 1,
    `Q3a. and each item still brings its own wrong answers (${tripleCounts.size} distinct across ${count})`
  );

  for (const question of questions) {
    assert.equal(question.choices.length, 4, "Q4. each item offers four options");
    assert.equal(new Set(question.choices).size, 4, "Q5. with no duplicated option");
    assert.ok(question.choices.includes(question.correctAnswer), "Q6. and the key is among them");
    assert.ok(!/^Use /.test(question.correctAnswer), "Q7. the key is not the old 'Use …' template");
    assert.ok(question.explanation.trim().length > 0, "Q8. every item carries its authored explanation");
    assert.ok(question.skillTag.trim().length > 0, "Q9. and a topic tag");
  }
}
ok("Medical Terminology: distinct stems, per-item distractors, no answer-by-template");

// POSITIVE CONTROL. The measurements above only mean something if they would have FAILED on what they
// replaced. The template generator is still in the tree for DECA, so it can be measured directly: for
// HOSA it produced four distinct stems in ten, one trio of wrong answers, and a key that always began
// "Use ". If any of that ever became true of the bank path, the assertions above would fire.
{
  const legacy = buildFallbackPracticeQuestions({
    organization: "HOSA",
    eventType: "HEALTH_SCIENCE_EVENT",
    eventCluster: "Nutrition",
    difficulty: "BEGINNER",
    count: 10
  });
  const legacyStems = new Set(legacy.map((question) => question.question)).size;
  const legacyTriples = new Set(
    legacy.map((question) => question.choices.filter((choice) => choice !== question.correctAnswer).sort().join("||"))
  ).size;
  const legacyTemplateKeys = legacy.filter((question) => /^Use /.test(question.correctAnswer)).length;
  assert.ok(legacyStems <= 4, `P1. control: the template generator really does repeat stems (${legacyStems} distinct in 10)`);
  assert.equal(legacyTriples, 1, "P2. control: and really does share one trio of wrong answers");
  assert.equal(legacyTemplateKeys, 10, "P3. control: and really does key every item to the same phrasing");
  // The same generator, asked for a DECA cluster, still answers — it is DECA's live path, not dead
  // code, which is why this phase leaves it in place and records its quality as DECA debt.
  const deca = buildFallbackPracticeQuestions({
    organization: "DECA",
    eventType: "ROLEPLAY",
    eventCluster: DECA_EVENT_CLUSTERS[0],
    difficulty: "BEGINNER",
    count: 10
  });
  assert.equal(deca.length, 10, "P4. control: the generator still serves DECA, so it was not removed");
}
ok("positive control: the replaced generator still measures as the defect it was");

// The key must not sit at one position: the authored bank puts it first in most items, and serving
// them unshuffled would hand the answer to anyone who noticed.
{
  const large = hosaMedTermPracticeQuestions(100, deterministicRng(7));
  const atIndexZero = large.filter((question) => question.choices[0] === question.correctAnswer).length;
  assert.ok(atIndexZero < 45, `Q10. the key is not concentrated at the first option (${atIndexZero}/100)`);
  const authoredAtZero = MEDTERM_BANK.filter((item) => item.choices[0] === item.correctAnswer).length;
  assert.ok(
    authoredAtZero > 100,
    `Q10a. control: the authored bank really is index-0 heavy (${authoredAtZero}/180), so the shuffle is doing the work`
  );
}
ok("Medical Terminology: the authored position tell does not reach the learner");

// A served item is the bank's own item — so its explanation cannot describe a different concept than
// its stem. That is the strongest available guarantee of stem/rationale agreement: identity.
{
  const questions = hosaMedTermPracticeQuestions(50, deterministicRng(3));
  for (const question of questions) {
    const source = MEDTERM_BANK.find((item) => item.question === question.question);
    assert.ok(source, `R1. every served stem is a real bank item: ${question.question.slice(0, 40)}`);
    assert.equal(question.explanation, source!.explanation, "R2. served with that item's own explanation, not a template");
    assert.equal(question.correctAnswer, source!.correctAnswer, "R3. and that item's own answer");
    assert.deepEqual([...question.choices].sort(), [...source!.choices].sort(), "R4. and exactly its own options, reordered");
  }
}
ok("Medical Terminology: stem, options, key and rationale all come from one authored item");

// ---- 4. THE TEMPLATE GENERATOR NO LONGER REACHES A HOSA LEARNER --------------------------------

const route = stripComments(read("app/api/tests/route.ts"));
assert.ok(/if \(!testSelectionIsServable\(input\)\) \{/.test(route), "A1. the API refuses an unservable selection");
assert.ok(/throw new HttpError\(testUnavailableReason\(input\), 422\)/.test(route), "A2. with the reason the learner is shown");
assert.ok(
  /input\.organization === "HOSA" && input\.eventCluster === HOSA_TESTABLE_CATEGORY\s*\?\s*hosaMedTermPracticeQuestions\(input\.questionCount\)/.test(
    route
  ),
  "A3. Medical Terminology is built from the real bank"
);
// A4 USED TO BE A REGEX OVER THIS ROUTE, AND IT COULD NOT SEE THE SECOND DOOR. The provider helper
// never throws: on any failure it returns the SAME template generator's output as though a model had
// written it (lib/ai.ts wraps buildFallbackPracticeQuestions in fallbackPracticeQuestions). Removing
// the route-level fallback therefore proved nothing on its own. What must hold is that HOSA never
// reaches the provider at all — asserted here on both branches that decide it.
assert.ok(
  /const isHosa = input\.organization === "HOSA";/.test(route),
  "A4. the route decides HOSA once"
);
assert.ok(
  /bankQuestions \|\| isHosa\s*\?\s*\[\]/.test(route),
  "A4a. no HOSA request gets route-level template questions"
);
assert.ok(
  /if \(bankQuestions \|\| isHosa\) \{/.test(route),
  "A4b. and no HOSA request calls the provider, whose own fallback is that same generator"
);
{
  // Control: prove the provider helper really does return template questions on failure, so A4b is
  // guarding a live door rather than a hypothetical one.
  const ai = stripComments(read("lib/ai.ts"));
  assert.ok(
    /questions: buildFallbackPracticeQuestions\(input\)/.test(ai),
    "A4c. control: the provider helper's fallback is the template generator"
  );
  assert.ok(
    /\(\) => fallbackPracticeQuestions\(input\)/.test(ai),
    "A4d. control: and it is handed to the completion path as the failure result"
  );
}
assert.ok(
  /\[\.\.\.\(bankQuestions \?\? \[\]\), \.\.\.generatedQuestions, \.\.\.fallbackQuestions\]/.test(route),
  "A5. control: the bank is the first source the route assembles from"
);
// DECA still has its existing path — this phase does not change it.
assert.ok(/buildFallbackPracticeQuestions\(\{/.test(route), "A6. DECA's existing generation path is untouched");
ok("API: fails closed, serves the real bank, and never pads a HOSA set");

// The client asks the same question, so the UI cannot offer what the API would refuse.
const generator = stripComments(read("components/tests/practice-test-generator.tsx"));
assert.ok(/testableEventTypes\(organization\)/.test(generator), "A7. the generator lists only testable event types");
assert.ok(/testableCategories\(organization\)/.test(generator), "A8. and only testable categories");
assert.ok(!/EVENT_OPTIONS\[organization\]/.test(generator), "A9. not the raw registry list");
assert.ok(/const canGenerate = events\.length > 0 && clusters\.length > 0;/.test(generator), "A10. with nothing to offer, it offers nothing");
assert.ok(/untestableCategories\(organization\)/.test(generator), "A11. and the unavailable categories are named on screen");
ok("client and API ask the same question, and the client is the courtesy rather than the gate");

// ---- 4b. THE PAGE DESCRIBES THE SOURCE IT ACTUALLY USES ----------------------------------------
//
// Serving the authored bank inverted an existing claim: the page told a HOSA learner an AI was
// generating their questions while 180 human-written, human-reviewed items were being drawn from a
// fixed pool. Labeling authored content as generated is the same class of untruth as the reverse.
{
  const preview = stripComments(read("components/tests/test-builder-preview.tsx"));
  assert.ok(
    /organization === "HOSA" \? "Where the questions come from" : "AI generation"/.test(preview),
    "V1. HOSA's card is not headed 'AI generation'"
  );
  assert.ok(
    /authored question bank — written and reviewed by people, not generated/.test(preview),
    "V2. it says the questions are authored rather than generated"
  );
  assert.ok(
    /The pool is fixed, so sets will repeat questions as you take more of them\./.test(preview),
    "V3. and discloses that a fixed pool repeats, which a generator would not"
  );
  assert.ok(
    /The API route generates original \$\{organization \?\? "DECA and HOSA"\} questions\./.test(preview),
    "V4. while DECA, which really does generate, keeps its own line"
  );
  const generatorSource = stripComments(read("components/tests/practice-test-generator.tsx"));
  assert.ok(
    /Drawing questions from CompeteReady's authored Medical Terminology bank\./.test(generatorSource),
    "V5. and the progress copy describes drawing, not generating"
  );
}
// The Supported-tracks card lists what can be tested, not every event the organization runs — it
// advertised Prepared Speaking as a supported practice test while the generator and API refused it.
{
  const page = stripComments(read("app/(app)/tests/page.tsx"));
  assert.ok(
    /testableEventTypes\("HOSA"\)\.map\(\(event\) => event\.label\)\.join\(", "\)/.test(page),
    "V6. the supported-tracks card lists testable HOSA events only"
  );
  assert.ok(
    /testableEventTypes\("DECA"\)\.map\(\(event\) => event\.label\)\.join\(", "\)/.test(page),
    "V7. and the same rule for DECA"
  );
  assert.ok(!/EVENT_OPTIONS\.(HOSA|DECA)\.map/.test(page), "V8. and no longer the raw event list");
}
// A control that does nothing must not be offered: the bank carries no level, so HOSA has no choice.
{
  const generatorSource = stripComments(read("components/tests/practice-test-generator.tsx"));
  assert.ok(
    /const difficultyAffectsQuestions = organization !== "HOSA";/.test(generatorSource),
    "V9. the generator knows when difficulty changes nothing"
  );
  assert.ok(
    /there is no difficulty setting to choose here\./.test(generatorSource),
    "V10. and says so instead of offering three inert buttons"
  );
  const source = stripComments(read("lib/hosa-test-source.ts"));
  assert.ok(!/difficulty/i.test(source), "V11. control: the bank source really takes no difficulty at all");
}
ok("provenance and controls: the page names its real source, lists only testable events, and hides a setting that does nothing");

// ---- 5. FEEDBACK STATES WHAT IS KNOWN ----------------------------------------------------------

const resultsPage = stripComments(read("app/(app)/tests/[testId]/results/page.tsx"));
assert.ok(
  /You selected “\$\{selectedAnswer\}”\. The correct answer is “\$\{correctAnswer\}”\./.test(resultsPage),
  "F1. a wrong answer is reported as the two facts the product actually holds"
);
assert.ok(!/Your selected answer was weaker because/.test(resultsPage), "F2. the fabricated diagnosis is gone");
assert.ok(!/Why your answer missed/.test(resultsPage), "F3. and so is the heading that promised one");
for (const claim of ["gives a measurable or safe next step", "stays within the event expectations"]) {
  assert.ok(!resultsPage.includes(claim), `F4. no invented praise of the correct answer: ${claim}`);
}
assert.ok(
  /No answer was submitted, so this counts as a missed \$\{skillTag\} rep\./.test(resultsPage),
  "F5. an unanswered item is still described truthfully"
);
assert.ok(/\{question\.explanation\}/.test(resultsPage), "F6. and the item's own recorded explanation still carries the reasoning");
ok("feedback: the page states the selection and the key, and claims nothing about why they chose it");

// ---- 6. THE BANK ITSELF WAS NOT TOUCHED --------------------------------------------------------

assert.equal(MEDTERM_BANK.length, 180, "B1. 180 items");
assert.equal(new Set(MEDTERM_BANK.map((item) => item.id)).size, 180, "B2. with stable unique ids");
ok("bank: unchanged by this phase — its authored answer-position debt is recorded, not repaired here");

/** A deterministic generator so every measurement above is reproducible. */
function deterministicRng(seed: number): () => number {
  let state = seed * 7919 + 13;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

console.log(results.join("\n"));
console.log(
  "HOSA test-integrity smoke passed. EXECUTED: a Medical Terminology set of 10, 25, 50 or 100 questions is " +
    "drawn from the real 180-item bank with every stem distinct, every item carrying its own wrong answers, no " +
    "correct answer matching the old 'Use …' template, and the authored index-0 bias (over 100 of 180 items) " +
    "broken by a per-item shuffle so the key is not concentrated at the first option; each served item's stem, " +
    "options, key and explanation are the same authored item, so a rationale cannot describe a different concept " +
    "than its stem. Only an organization we train, only its own TEST-declared events and only categories with a " +
    "question source are servable: Model UN, Mock Trial and Public Speaking resolve to nothing, HOSA's Prepared " +
    "Speaking is refused even beside a servable category, HOSA offers exactly its written-test event and exactly " +
    "one category, and the fifteen it cannot test are named rather than dropped. DECA keeps both testable events, " +
    "every cluster and its existing generation path. ASSERTED FROM SOURCE: the API refuses an unservable selection " +
    "with the same reason the learner sees, builds Medical Terminology from the bank, and can never complete a HOSA " +
    "set with template questions; the client renders from the same rule and disables generation when nothing is " +
    "servable; and the results page reports the selected option and the correct one instead of asserting why the " +
    "learner's choice was weaker. NOT PROVEN HERE: anything requiring a database or a signed-in session."
);
