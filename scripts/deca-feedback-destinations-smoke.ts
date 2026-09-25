/**
 * deca-feedback-destinations:smoke — the feedback a DECA learner receives leads to learning that
 * addresses THAT feedback (final DECA beginner QA, findings A and B).
 *
 * Deterministic and offline: the real DECA bridge, lesson registry, question bank and flashcard decks,
 * through pure modules only. Home and the results page import Prisma, so they are pinned at the source
 * level (comment-stripped). No provider, no database, no network, and no real test is submitted — every
 * weak-area list is a fixture shaped like the grader's record, or taken from the question bank itself.
 *
 * A. Home's suggested next step names the diagnostic whose lesson and drill it links. A flagged area no
 *    DECA lesson covers is named as uncovered and never borrows another area's lesson; with nothing
 *    covered there is no lesson and no drill. The same missed questions give the same card in ANY
 *    recorded order — the grader stores weak areas in whatever order the database returned them.
 * B. The results page's flashcard card opens a deck only when a flagged area exactly IS that deck's name
 *    or the term on one of its cards. Otherwise it says so and opens Study Arcade's DECA deck list. It
 *    never falls back to Marketing and never links a deck by word similarity. HOSA's card is unchanged.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DECA_UNCOVERED_HEADING,
  buildDecaHomeSuggestion,
  decaBridgeOrder,
  decaHomeSuggestionForLearner,
  type DecaHomeSuggestion
} from "../lib/education/deca-home-suggestion";
import {
  DECA_DIAGNOSTIC_BRIDGE,
  decaAreaDrillHref,
  decaAreaLabel,
  decaBridgeForDiagnostic,
  decaBridgeLessonIsPublished,
  decaDiagnosticRoutesForLearner
} from "../lib/education/deca-diagnostic-bridge";
import { testResultRecommendationsForLearner, weakAreaExplanation } from "../lib/education/test-result-recommendations";
import { educationLessonsForTrack } from "../lib/education/registry";
import {
  deckSummaries,
  flashcardsForDeck,
  studyDeckForSkill,
  studyDeckForWeakAreas,
  weakTermsStudyStep,
  type StudyNextStep
} from "../lib/study-content";
import { buildFallbackPracticeQuestions } from "../lib/test-question-bank";
import { DECA_EVENT_CLUSTERS, HOSA_EVENT_CATEGORIES } from "../lib/testing";

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
const read = (path: string) => readFileSync(path, "utf8");
const stripComments = (src: string) =>
  src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
const exactKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const HOME = "app/(app)/home/page.tsx";
const RESULTS = "app/(app)/tests/[testId]/results/page.tsx";
const ARCADE = "app/(app)/study-arcade/page.tsx";
const BROWSE_HREF = "/study-arcade?track=deca#flashcard-decks";

// ---------------------------------------------------------------------------------------------
// Fixtures: the question bank's own tags, as a graded test records them.
// ---------------------------------------------------------------------------------------------

/** The weak-area tags a DECA test on this cluster can record — the bank's own, nothing invented. */
function bankTags(organization: "DECA" | "HOSA", focus: string): string[] {
  const questions = buildFallbackPracticeQuestions({ organization, eventType: "Practice test", eventCluster: focus, difficulty: "BEGINNER", count: 10 });
  return Array.from(new Set(questions.map((question) => question.skillTag)));
}
const DECA_TAGS_BY_CLUSTER = new Map(DECA_EVENT_CLUSTERS.map((cluster) => [cluster, bankTags("DECA", cluster)]));
const ALL_DECA_TAGS = Array.from(new Set([...DECA_TAGS_BY_CLUSTER.values()].flat()));
const BUSINESS_MANAGEMENT = DECA_TAGS_BY_CLUSTER.get("Business Management") ?? [];

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest])
  );
}
/** Every order for short lists; for longer ones every rotation, their reversals and seeded shuffles. */
function orders<T>(items: readonly T[]): T[][] {
  if (items.length <= 5) return permutations(items);
  const out: T[][] = [];
  for (let shift = 0; shift < items.length; shift += 1) {
    const rotated = [...items.slice(shift), ...items.slice(0, shift)];
    out.push(rotated, [...rotated].reverse());
  }
  let seed = 20250925;
  for (let round = 0; round < 60; round += 1) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      const swap = seed % (index + 1);
      [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
    }
    out.push(shuffled);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// A — Home: the invariant every suggestion must satisfy, checked against the bridge independently.
// ---------------------------------------------------------------------------------------------

const isCovered = (area: string) => decaDiagnosticRoutesForLearner([area]).length > 0;

/** "a, b and 2 more" -> ["a", "b"]. */
const namesIn = (list: string) =>
  list.replace(/ and \d+ more$/, "").split(/, /).map((name) => name.trim()).filter(Boolean);
/** "a", "a and b", "a, b and c" — how the card lists the areas it says are not linked. */
const andList = (items: readonly string[]) =>
  items.length <= 2 ? items.join(" and ") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/** The distinct areas a record holds, matched as the bridge matches (trimmed, any case). */
function distinctAreas(recorded: readonly string[]): string[] {
  const spellings = new Map<string, string>();
  for (const raw of recorded) {
    const area = raw.trim();
    const kept = spellings.get(area.toLowerCase());
    if (area && (kept === undefined || area < kept)) spellings.set(area.toLowerCase(), area);
  }
  return [...spellings.values()];
}

function assertHomeTruth(recorded: readonly string[], suggestion: DecaHomeSuggestion | null, label: string) {
  const flagged = distinctAreas(recorded);
  if (flagged.length === 0) {
    assert.equal(suggestion, null, `${label}: nothing flagged, no card`);
    return;
  }
  assert.ok(suggestion, `${label}: a flagged test gets a card`);
  // The card may say what the product links; it may never say what the curriculum lacks, because a
  // published lesson can teach an area the bridge has no row for (control C9).
  assert.ok(!/No DECA lesson|no lesson (covers|teaches)|not taught/i.test(suggestion.evidence), `${label}: no claim about what the curriculum teaches (${suggestion.evidence})`);
  const covered = flagged.filter(isCovered);

  if (covered.length === 0) {
    assert.equal(suggestion.route, null, `${label}: nothing covered -> no lesson, no drill`);
    assert.equal(suggestion.lead, null, `${label}: and no area is singled out`);
    assert.equal(suggestion.heading, DECA_UNCOVERED_HEADING, `${label}: the heading suggests the one action that exists`);
    assert.ok(!suggestion.evidence.includes(" — part of "), `${label}: no area is attached to a skill`);
    assert.ok(
      suggestion.evidence.endsWith(`${flagged.length === 1 ? "It isn't" : "None of them is"} linked to a DECA lesson yet, so that test's explanations are the place to start.`),
      `${label}: the limitation is said plainly (${suggestion.evidence})`
    );
    return;
  }

  // One lead: of the covered areas, the one the bridge lists first. Computed here from the bridge.
  const expectedLead = [...covered].sort((a, b) => decaBridgeOrder(a) - decaBridgeOrder(b) || a.localeCompare(b, "en"))[0];
  assert.equal(suggestion.lead, expectedLead, `${label}: the lead is the covered area the bridge lists first`);
  assert.ok(suggestion.route, `${label}: a covered lead has a route`);
  const row = decaBridgeForDiagnostic(expectedLead);
  assert.ok(row, `${label}: fixture — the lead has a bridge row`);

  // The destination is the lead's OWN canonical row — the lesson that teaches it and its area's drill.
  assert.equal(suggestion.route.diagnostic, expectedLead, `${label}: the route is the lead's`);
  assert.equal(suggestion.route.lessonId, row.lessonId, `${label}: the lesson teaches the lead`);
  assert.equal(suggestion.route.lessonHref, `/lessons/${row.lessonId}?track=deca`, `${label}: a full DECA lesson path`);
  assert.equal(suggestion.route.drillHref, decaAreaDrillHref(row.area), `${label}: the drill is the lead's own area`);
  assert.ok(decaBridgeLessonIsPublished(row.lessonId), `${label}: and the lesson is published`);

  // The label is the lead's own area, and the sentence attaches at most ONE area to a skill: the lead.
  // A lead that IS the skill's name ("Performance indicators") is named once, attached to nothing.
  assert.equal(suggestion.heading, `Suggested: ${decaAreaLabel(row.area)}`, `${label}: the heading names the lead's skill`);
  const attached = [...suggestion.evidence.matchAll(/(?:^|\. )([^.]+?) — part of ([^.]+)\./g)];
  if (expectedLead.toLowerCase() === decaAreaLabel(row.area).toLowerCase()) {
    assert.equal(attached.length, 0, `${label}: a lead that is the skill is not attached to itself (${suggestion.evidence})`);
    assert.ok(suggestion.evidence.startsWith(`${expectedLead}.`), `${label}: and is named first`);
  } else {
    assert.equal(attached.length, 1, `${label}: one area is attached to a skill (${suggestion.evidence})`);
    assert.equal(attached[0][1], expectedLead, `${label}: and it is the lead, not the first recorded area (${suggestion.evidence})`);
    assert.equal(attached[0][2], decaAreaLabel(row.area).toLowerCase(), `${label}: attached to its own skill`);
    assert.ok(suggestion.evidence.startsWith(`${expectedLead} — part of `), `${label}: and named first`);
  }

  // Every other area the card names is only "also flagged". Exactly the named ones with no route are
  // said to be not linked — every one of them, and nothing that does have a route.
  const also = /It also flagged ([^.]+)\./.exec(suggestion.evidence);
  const alsoNamed = also ? namesIn(also[1]) : [];
  for (const name of alsoNamed) {
    assert.ok(flagged.includes(name) && name !== expectedLead, `${label}: "${name}" was flagged and is not the lead`);
  }
  const notLinked = alsoNamed.filter((name) => !isCovered(name));
  const clause = /\. ([^.]+) (?:isn't|aren't) linked to a DECA lesson yet\./.exec(suggestion.evidence);
  if (notLinked.length === 0) assert.equal(clause, null, `${label}: nothing with a route is called not linked (${suggestion.evidence})`);
  else assert.equal(
    clause?.[0],
    `. ${andList(notLinked)} ${notLinked.length === 1 ? "isn't" : "aren't"} linked to a DECA lesson yet.`,
    `${label}: every named area without a route is said to be not linked, and only those (${suggestion.evidence})`
  );
  assert.equal(alsoNamed.length, Math.min(flagged.length - 1, 2), `${label}: the card names up to three areas`);
  const more = /and (\d+) more\./.exec(suggestion.evidence);
  assert.equal(more ? Number(more[1]) : 0, flagged.length - 1 - alsoNamed.length, `${label}: and counts the rest`);
}

function assertSameInEveryOrder<T>(recorded: readonly string[], build: (areas: string[]) => T, label: string): T {
  const first = build([...recorded]);
  for (const order of orders(recorded)) {
    assert.deepEqual(build(order), first, `${label}: the same missed questions give the same answer in order [${order.join(", ")}]`);
  }
  return first;
}

// ---------------------------------------------------------------------------------------------
// B — the flashcard card: the invariant every step must satisfy, checked against the decks directly.
// ---------------------------------------------------------------------------------------------

const DECA_DECKS = deckSummaries().filter((deck) => deck.organization === "DECA");
/** Brute force, independent of the resolver: does any DECA deck exactly name or carry this area? */
const deckMatchesArea = (deck: { deck: string; deckSlug: string }, area: string) =>
  exactKey(deck.deck) === exactKey(area) ||
  flashcardsForDeck(deck.deckSlug).some((card) => exactKey(card.term) === exactKey(area));

function assertDeckTruth(weakAreas: readonly string[], step: StudyNextStep, label: string) {
  const flagged = distinctAreas(weakAreas);
  const anyMatch = DECA_DECKS.some((deck) => flagged.some((area) => deckMatchesArea(deck, area)));
  if (step.href.startsWith("/study/")) {
    const deck = DECA_DECKS.find((candidate) => `/study/${candidate.deckSlug}` === step.href);
    assert.ok(deck, `${label}: a linked deck is a real DECA deck (${step.href})`);
    assert.equal(step.title, "Study weak terms", `${label}: a matched deck keeps the weak-terms label`);
    const said = /^The (.+) deck (covers|has a card on) (.+), which this test flagged\.$/.exec(step.description);
    assert.ok(said, `${label}: the card says which deck and which flagged area (${step.description})`);
    assert.equal(said[1], deck.deck, `${label}: naming the deck it opens`);
    const area = said[3];
    assert.ok(flagged.includes(area), `${label}: "${area}" is an area this test flagged`);
    if (said[2] === "covers") assert.equal(exactKey(area), exactKey(deck.deck), `${label}: "covers" means the deck IS that area`);
    else assert.ok(flashcardsForDeck(deck.deckSlug).some((card) => exactKey(card.term) === exactKey(area)), `${label}: "has a card on" means the deck has exactly that card`);
    return;
  }
  assert.equal(step.href, BROWSE_HREF, `${label}: otherwise the DECA deck list (${step.href})`);
  assert.equal(step.title, "Browse study decks", `${label}: labelled as the deck list, not as weak terms`);
  assert.ok(!anyMatch, `${label}: and only when no DECA deck exactly matches a flagged area`);
  assert.equal(
    step.description,
    flagged.length > 0
      ? "No flashcard deck matches the areas this test flagged. Study Arcade lists every DECA deck under Flashcard decks."
      : "This test flagged no weak areas. Study Arcade lists every DECA deck under Flashcard decks.",
    `${label}: and it says why`
  );
}

const decaStep = (weakAreas: readonly string[], eventCluster: string | null = null) =>
  weakTermsStudyStep({ organization: "DECA", weakAreas, eventCluster, eventType: "Practice test" });

/** The results page's card before this repair, for every organization: the exact expression it used. */
function legacyCard(input: { organization: string; weakAreas: string[]; eventCluster: string | null; eventType: string }): StudyNextStep {
  const organization = input.organization === "DECA" || input.organization === "HOSA" ? input.organization : undefined;
  const deck = organization ? studyDeckForSkill(input.weakAreas[0] ?? input.eventCluster ?? input.eventType, organization) : undefined;
  return {
    title: "Study weak terms",
    description: "Review flashcards tied to the terms and concepts you missed.",
    href: deck ? `/study/${deck.deckSlug}` : "/study"
  };
}

// =============================================================================================
// Direct controls
// =============================================================================================

check("C1. Operations planning never labels the Performance measurement recommendation", () => {
  assert.equal(decaBridgeForDiagnostic("Operations planning"), null, "fixture: the canonical bridge has no row for Operations planning");
  assert.equal(decaBridgeForDiagnostic("Performance measurement")?.area, "business-reasoning", "fixture: Performance measurement is business reasoning");
  assert.deepEqual(BUSINESS_MANAGEMENT, ["Operations planning", "Team communication", "Change management", "Performance measurement"], "fixture: the bank's Business Management tags");
  const card = assertSameInEveryOrder(BUSINESS_MANAGEMENT, decaHomeSuggestionForLearner, "C1");
  assertHomeTruth(BUSINESS_MANAGEMENT, card, "C1");
  assert.equal(card?.heading, "Suggested: Business reasoning");
  assert.equal(
    card?.evidence,
    "Performance measurement — part of business reasoning. It also flagged Change management, Operations planning and 1 more. " +
      "Change management and Operations planning aren't linked to a DECA lesson yet.",
    "C1a the sentence names the area the lesson teaches, and calls the others uncovered"
  );
  assert.equal(card?.route?.lessonHref, "/lessons/deca-justifying-your-recommendation?track=deca");
  assert.equal(card?.route?.drillHref, "/study-arcade?track=deca&area=business-reasoning");
  assert.ok(!card?.evidence.includes("Operations planning — part of"), "C1b Operations planning is never attached to business reasoning");
  // The recorded order the QA walkthrough met: Operations planning first. It no longer leads the card.
  const qaOrder = decaHomeSuggestionForLearner(["Operations planning", "Team communication", "Performance measurement"]);
  assert.ok(qaOrder?.evidence.startsWith("Performance measurement — part of business reasoning."), "C1c the QA reproduction is closed");
});

check("C2. an unsupported Operations planning never inherits another diagnostic's lesson", () => {
  const alone = decaHomeSuggestionForLearner(["Operations planning"]);
  assertHomeTruth(["Operations planning"], alone, "C2");
  assert.deepEqual(alone, {
    lead: null,
    route: null,
    heading: DECA_UNCOVERED_HEADING,
    evidence: "Operations planning. It isn't linked to a DECA lesson yet, so that test's explanations are the place to start."
  }, "C2a alone: no lesson, no drill, the limitation said plainly");
  const withCovered = decaHomeSuggestionForLearner(["Operations planning", "Performance measurement"]);
  assertHomeTruth(["Operations planning", "Performance measurement"], withCovered, "C2b");
  assert.match(withCovered?.evidence ?? "", /Operations planning isn't linked to a DECA lesson yet\./, "C2b beside a covered area it is still named as not linked");
});

check("C3. Service recovery never falls back to Marketing", () => {
  assert.equal(studyDeckForSkill("Service recovery", "DECA")?.deckSlug, "deca-marketing", "control: the legacy resolver is the one that sent it to Marketing");
  for (const cluster of [null, "Hospitality and Tourism", "Customer relations", "Marketing"]) {
    const step = decaStep(["Service recovery"], cluster);
    assertDeckTruth(["Service recovery"], step, `C3 (${cluster})`);
    assert.notEqual(step.href, "/study/deca-marketing", `C3 (${cluster}) not Marketing`);
  }
  assert.equal(decaStep(["Service recovery"], "Hospitality and Tourism").href, "/study/deca-hospitality-and-tourism", "C3a a Hospitality test opens its own deck, which carries the card");
  assert.equal(decaStep(["Service recovery"], "Customer relations").href, "/study/deca-customer-relations", "C3b a Customer relations test opens its own deck, which also carries it");
  assert.equal(decaStep(["Service recovery"]).href, "/study/deca-hospitality-and-tourism", "C3c with no cluster, the first deck in the list that carries it");
});

check("C4. a supported weak-area/deck match still opens its correct deck", () => {
  // Every deck by its own name, and every card term with its own deck as the test's cluster.
  for (const deck of DECA_DECKS) {
    const byName = decaStep([deck.deck]);
    assertDeckTruth([deck.deck], byName, `C4 ${deck.deck}`);
    assert.equal(byName.href, `/study/${deck.deckSlug}`, `C4a "${deck.deck}" opens the ${deck.deck} deck`);
    for (const card of flashcardsForDeck(deck.deckSlug)) {
      const step = decaStep([card.term], deck.deck);
      assertDeckTruth([card.term], step, `C4 ${deck.deck}/${card.term}`);
      const namedDecks = DECA_DECKS.filter((other) => exactKey(other.deck) === exactKey(card.term)).map((other) => `/study/${other.deckSlug}`);
      assert.ok([`/study/${deck.deckSlug}`, ...namedDecks].includes(step.href), `C4b "${card.term}" opens its own deck, or the deck named exactly that (${step.href})`);
    }
  }
  assert.deepEqual(decaStep(["Guest experience", "Revenue awareness"], "Hospitality and Tourism"), {
    title: "Study weak terms",
    description: "The Hospitality and Tourism deck has a card on Guest experience, which this test flagged.",
    href: "/study/deca-hospitality-and-tourism"
  }, "C4c the card says which area and which deck, so the claim can be checked");
  assert.equal(decaStep(["Financial analysis", "Budgeting"], "Finance").description, "The Financial analysis deck covers Financial analysis, which this test flagged.", "C4d a deck named by the area is said to cover it");
  assert.equal(decaStep(["market research"], "Marketing").href, "/study/deca-market-research", "C4e a deck that IS the area beats a deck with one card on it");
});

check("C5. an unsupported weak area gets a truthful fallback", () => {
  for (const tags of [["Revenue awareness"], ["Promotion strategy"], ["Budgeting", "Credit literacy"], ["Target market analysis"]]) {
    const step = decaStep(tags, "Marketing");
    assertDeckTruth(tags, step, `C5 [${tags.join(", ")}]`);
    assert.equal(step.href, BROWSE_HREF, `C5 [${tags.join(", ")}] opens the DECA deck list`);
  }
  assert.equal(decaStep(["Promotion strategy"]).href, BROWSE_HREF, "C5a no word similarity: Promotion strategy is not the Promotion deck");
  assert.equal(decaStep(["Target market analysis"]).href, BROWSE_HREF, "C5b nor is it the Marketing card 'target market'");
  assert.equal(decaStep(["Operations planning"]).href, BROWSE_HREF, "C5c nor Operations planning the Operations deck");
  // Home, for the same area: no lesson, no drill, and it says so.
  assertHomeTruth(["Revenue awareness"], decaHomeSuggestionForLearner(["Revenue awareness"]), "C5d");
});

check("C6. two areas with different owners are never combined into one recommendation", () => {
  const pairs: Array<[string, string]> = [];
  for (const a of DECA_DIAGNOSTIC_BRIDGE) for (const b of DECA_DIAGNOSTIC_BRIDGE) {
    if (a.diagnostic < b.diagnostic && a.lessonId !== b.lessonId) pairs.push([a.diagnostic, b.diagnostic]);
  }
  assert.ok(pairs.length > 20, "fixture: many cross-owner pairs");
  for (const pair of pairs) {
    const card = assertSameInEveryOrder(pair, decaHomeSuggestionForLearner, `C6 [${pair.join(", ")}]`);
    assertHomeTruth(pair, card, `C6 [${pair.join(", ")}]`);
  }
  const mixed = decaHomeSuggestionForLearner(["Promotion strategy", "Service recovery"]);
  assert.equal(mixed?.heading, "Suggested: Customer relations", "C6a one skill in the heading");
  assert.equal(mixed?.evidence, "Service recovery — part of customer relations. It also flagged Promotion strategy.", "C6b the other owner's area is only 'also flagged'");
  assert.equal(mixed?.route?.lessonHref, "/lessons/deca-handling-customer-situations?track=deca", "C6c and only the lead's lesson is linked");
  // The flashcard card, likewise: one deck, one area, both named.
  const deck = decaStep(["Service recovery", "Change management"]);
  assertDeckTruth(["Service recovery", "Change management"], deck, "C6d");
  assert.equal(deck.description, "The Business Management deck has a card on Change management, which this test flagged.", "C6d one deck, named with the one area it carries");
});

check("C7. DECA results still count each lesson once", () => {
  const weakAreas = ["Promotion strategy", "Target market analysis", "Customer behavior"];
  const stored = decaDiagnosticRoutesForLearner(weakAreas).map((route) => ({ lessonSlug: route.lessonId, title: route.areaLabel, reason: route.why }));
  const model = testResultRecommendationsForLearner({ organization: "DECA", weakAreas, stored: [...stored, ...stored] });
  const lessonIds = [...model.diagnosticRoutes.map((route) => route.lessonId), ...model.storedLessons.map((lesson) => lesson.lessonId)];
  assert.equal(new Set(lessonIds).size, lessonIds.length, "C7a no lesson renders twice");
  assert.equal(model.lessonCount, 2, "C7b the tile counts distinct lessons");
});

check("C8. HOSA result suggestions stay visible and carry no DECA copy", () => {
  const stored = [
    { lessonSlug: "hosa-medical-terminology-1", title: "Word roots", reason: "Targets Medical Terminology, which appeared in your missed-question pattern." },
    { lessonSlug: "hosa-medical-terminology-2", title: "Clinical abbreviations", reason: "Targets Medical Terminology, which appeared in your missed-question pattern." }
  ];
  const model = testResultRecommendationsForLearner({ organization: "HOSA", weakAreas: ["Medical terminology"], stored });
  assert.deepEqual(model.unwrittenTopics.map((topic) => topic.title), ["Word roots", "Clinical abbreviations"], "C8a the suggestions are kept");
  assert.deepEqual(model.diagnosticRoutes, [], "C8b and never go through the DECA bridge");
  assert.ok(!/DECA|recorded skill/.test(weakAreaExplanation("HOSA")), "C8c no DECA copy");
});

check("C9. an area a published lesson teaches, but the bridge does not route, is never called untaught", () => {
  // A cluster without its own tag list tags its questions with the cluster's name, and published
  // marketing and customer-relations lessons teach these — the bridge simply has no row for them.
  const published = new Set(educationLessonsForTrack("DECA").filter((lesson) => lesson.visibility === "learner").map((lesson) => lesson.id));
  for (const [tag, lessonId] of [
    ["Distribution", "deca-getting-it-to-the-customer"],
    ["Pricing", "deca-the-offering-and-its-price"],
    ["Promotion", "deca-telling-them-about-it"],
    ["Customer relations", "deca-handling-customer-situations"]
  ] as const) {
    assert.ok(published.has(lessonId), `fixture: ${lessonId} is a published DECA lesson`);
    assert.equal(decaBridgeForDiagnostic(tag), null, `fixture: the bridge has no row for ${tag}`);
    assert.ok((DECA_TAGS_BY_CLUSTER.get(tag) ?? []).includes(tag), `fixture: a ${tag} test can flag "${tag}"`);
    const card = decaHomeSuggestionForLearner([tag]);
    assertHomeTruth([tag], card, `C9 ${tag}`);
    assert.equal(card?.evidence, `${tag}. It isn't linked to a DECA lesson yet, so that test's explanations are the place to start.`, `C9 ${tag}: says what is linked, not what is taught`);
  }
});

// =============================================================================================
// Adversarial cases — and the order the grader happened to record them in never decides anything.
// =============================================================================================

check("X1. first weak area supported", () => {
  const recorded = ["Performance measurement", "Operations planning", "Team communication"];
  const card = assertSameInEveryOrder(recorded, decaHomeSuggestionForLearner, "X1");
  assertHomeTruth(recorded, card, "X1");
  assert.equal(card?.lead, "Performance measurement");
  assertDeckTruth(["Service recovery", "Revenue awareness"], assertSameInEveryOrder(["Service recovery", "Revenue awareness"], (areas) => decaStep(areas, "Hospitality and Tourism"), "X1 deck"), "X1 deck");
});

check("X2. first unsupported, second supported", () => {
  const card = decaHomeSuggestionForLearner(["Operations planning", "Performance measurement"]);
  assertHomeTruth(["Operations planning", "Performance measurement"], card, "X2");
  assert.equal(card?.lead, "Performance measurement", "X2a the second, supported area is not ignored");
  const step = decaStep(["Revenue awareness", "Service recovery"], "Hospitality and Tourism");
  assertDeckTruth(["Revenue awareness", "Service recovery"], step, "X2b");
  assert.equal(step.href, "/study/deca-hospitality-and-tourism", "X2b nor for the deck");
});

check("X3. several supported areas", () => {
  const recorded = ["Promotion strategy", "Service recovery", "Target market analysis"];
  const card = assertSameInEveryOrder(recorded, decaHomeSuggestionForLearner, "X3");
  assertHomeTruth(recorded, card, "X3");
  assert.equal(card?.lead, "Service recovery", "X3a the one the bridge lists first, in curriculum order");
  assert.equal(card?.evidence, "Service recovery — part of customer relations. It also flagged Target market analysis, Promotion strategy.", "X3b the others are named, not called uncovered");
  const deck = assertSameInEveryOrder(["Value proposition", "Service recovery"], (areas) => decaStep(areas, "Marketing"), "X3c");
  assert.equal(deck.href, "/study/deca-marketing", "X3c the test's own cluster deck first, when it carries a flagged card");
});

check("X4. every area unsupported", () => {
  const recorded = ["Operations planning", "Team communication", "Revenue awareness", "Feasibility"];
  const card = assertSameInEveryOrder(recorded, decaHomeSuggestionForLearner, "X4");
  assertHomeTruth(recorded, card, "X4");
  assert.equal(card?.evidence, "Feasibility, Operations planning, Revenue awareness and 1 more. None of them is linked to a DECA lesson yet, so that test's explanations are the place to start.");
  const deck = assertSameInEveryOrder(["Operations planning", "Team communication", "Performance measurement"], (areas) => decaStep(areas, "Business Management"), "X4 deck");
  assertDeckTruth(["Operations planning", "Team communication", "Performance measurement"], deck, "X4 deck");
});

check("X5. no weak areas", () => {
  assert.equal(decaHomeSuggestionForLearner([]), null, "X5a Home: no card");
  assert.equal(decaHomeSuggestionForLearner(["", "  "]), null, "X5b blanks are not areas");
  const step = decaStep([], "Marketing");
  assertDeckTruth([], step, "X5c");
  assert.equal(studyDeckForWeakAreas({ organization: "DECA", weakAreas: [], eventCluster: "Marketing" }), null, "X5d the resolver finds nothing, and falls back to nothing");
});

check("X6. every DECA cluster's bank tags, in every recorded order", () => {
  for (const [cluster, tags] of DECA_TAGS_BY_CLUSTER) {
    const card = assertSameInEveryOrder(tags, decaHomeSuggestionForLearner, `X6 ${cluster}`);
    assertHomeTruth(tags, card, `X6 ${cluster}`);
    const step = assertSameInEveryOrder(tags, (areas) => decaStep(areas, cluster), `X6 ${cluster} deck`);
    assertDeckTruth(tags, step, `X6 ${cluster} deck`);
    // A longer test mixes in other clusters' questions: the rule holds for a bigger record too.
    const mixed = Array.from(new Set([...tags, ...(DECA_TAGS_BY_CLUSTER.get("Marketing") ?? [])]));
    assertHomeTruth(mixed, assertSameInEveryOrder(mixed, decaHomeSuggestionForLearner, `X6 ${cluster} mixed`), `X6 ${cluster} mixed`);
    assertDeckTruth(mixed, assertSameInEveryOrder(mixed, (areas) => decaStep(areas, cluster), `X6 ${cluster} mixed deck`), `X6 ${cluster} mixed deck`);
  }
});

check("X7. every single bank tag: the lesson is its own or none, the deck exact or the deck list", () => {
  assert.equal(ALL_DECA_TAGS.length, 40, `fixture: the bank's forty DECA tags (${ALL_DECA_TAGS.length})`);
  let marketing = 0;
  for (const tag of ALL_DECA_TAGS) {
    assertHomeTruth([tag], decaHomeSuggestionForLearner([tag]), `X7 ${tag}`);
    for (const cluster of [null, ...DECA_EVENT_CLUSTERS]) {
      const step = decaStep([tag], cluster);
      assertDeckTruth([tag], step, `X7 ${tag} (${cluster})`);
      if (step.href === "/study/deca-marketing") marketing += 1;
    }
  }
  // Only "Value proposition" is a Marketing card; nothing else may reach that deck.
  assert.equal(marketing, 1 + DECA_EVENT_CLUSTERS.length, `X7a Marketing opens only for its own exact card (${marketing})`);
});

check("X8. repeats, blanks and a fourth-recorded covered area", () => {
  assertHomeTruth(["Performance measurement", "Performance measurement", " "], decaHomeSuggestionForLearner(["Performance measurement", "Performance measurement", " "]), "X8a");
  // Home used to read a three-area window; a covered area recorded fourth is no longer lost.
  const card = decaHomeSuggestionForLearner(["Operations planning", "Team communication", "Change management", "Performance measurement"]);
  assert.equal(card?.lead, "Performance measurement", "X8b the full record is read");
});

check("X9. the pure core decides only from the lookups it is given", () => {
  const route = (diagnostic: string) => ({
    diagnostic, area: "marketing-fundamentals" as const, areaLabel: "Marketing fundamentals", lessonId: "l", why: "w", lessonHref: "/lessons/l?track=deca", drillHref: "/d"
  });
  const deps = {
    routesFor: (areas: readonly string[]) => areas.filter((area) => area === "B").map(route),
    bridgeOrder: (area: string) => (area === "B" ? 0 : Number.POSITIVE_INFINITY)
  };
  const card = buildDecaHomeSuggestion(["A", "B"], deps);
  assert.equal(card?.lead, "B");
  assert.equal(card?.evidence, "B — part of marketing fundamentals. It also flagged A. A isn't linked to a DECA lesson yet.");
  assert.equal(buildDecaHomeSuggestion(["A"], deps)?.route, null);
});

check("X10. the same area in two spellings is one area, and the card does not depend on which came first", () => {
  const recorded = ["Service recovery", "service recovery", "SERVICE RECOVERY ", "Operations planning"];
  const card = assertSameInEveryOrder(recorded, decaHomeSuggestionForLearner, "X10");
  assertHomeTruth(recorded, card, "X10");
  assert.equal(card?.lead?.toLowerCase(), "service recovery");
  assert.ok(!/also flagged [^.]*service recovery/i.test(card?.evidence ?? ""), `X10a a repeat is not "also flagged" (${card?.evidence})`);
  const step = assertSameInEveryOrder(recorded, (areas) => decaStep(areas, "Hospitality and Tourism"), "X10b");
  assertDeckTruth(recorded, step, "X10b");
});

check("X11. an area that is the skill's own name is named once", () => {
  const card = decaHomeSuggestionForLearner(["Economics basics", "Performance indicators"]);
  assertHomeTruth(["Economics basics", "Performance indicators"], card, "X11");
  assert.equal(card?.heading, "Suggested: Performance indicators");
  assert.equal(card?.evidence, "Performance indicators. It also flagged Economics basics. Economics basics isn't linked to a DECA lesson yet.");
  assert.equal(DECA_UNCOVERED_HEADING, "Suggested: Review the questions you missed", "X11a and the no-link heading is the action the card links");
});

// =============================================================================================
// Non-regression: HOSA and every other organization keep the flashcard card they had.
// =============================================================================================

check("N1. HOSA's flashcard card is exactly the one it had", () => {
  for (const category of HOSA_EVENT_CATEGORIES) {
    const tags = bankTags("HOSA", category);
    for (const weakAreas of [tags, [...tags].reverse(), []]) {
      const input = { organization: "HOSA", weakAreas, eventCluster: null, eventType: category };
      assert.deepEqual(weakTermsStudyStep(input), legacyCard(input), `N1 HOSA ${category} [${weakAreas.join(", ")}]`);
    }
  }
  for (const organization of ["GENERAL_DEBATE", "MODEL_UN"]) {
    const input = { organization, weakAreas: ["Rebuttal"], eventCluster: null, eventType: "Practice test" };
    assert.deepEqual(weakTermsStudyStep(input), legacyCard(input), `N1 ${organization}`);
  }
});

check("N2. the DECA bridge's destinations are the ones it had", () => {
  assert.equal(DECA_DIAGNOSTIC_BRIDGE.length, 10, "N2a ten mapped diagnostics");
  for (const entry of DECA_DIAGNOSTIC_BRIDGE) {
    const [routeFor] = decaDiagnosticRoutesForLearner([entry.diagnostic]);
    assert.equal(routeFor?.lessonId, entry.lessonId, `N2b ${entry.diagnostic} still routes to ${entry.lessonId}`);
    assert.equal(decaHomeSuggestionForLearner([entry.diagnostic])?.route?.lessonId, entry.lessonId, `N2c and Home links that same lesson`);
  }
});

// =============================================================================================
// The pages render these answers and decide nothing themselves (source level; they import Prisma).
// =============================================================================================

check("P1. Home builds its heading, sentence, lesson and drill from one suggestion", () => {
  const home = stripComments(read(HOME));
  const educationImports = home.match(/from "@\/lib\/education\/[a-z-]+"/g) ?? [];
  assert.deepEqual(educationImports, ['from "@/lib/education/deca-home-suggestion"'], "P1a one education module");
  assert.match(home, /const flaggedAreas = flagged \? practiceTests\.find\(\(test\) => test\.id === flagged\.testId\)\?\.weakAreas \?\? flagged\.weakAreas : \[\];/, "P1b the flagged test's FULL record");
  assert.match(home, /activeOrg === "DECA" \? decaHomeSuggestionForLearner\(flaggedAreas\) : null/, "P1c DECA only, from that record");
  assert.match(home, /<p className="text-lg font-bold">\{suggestionCard\.heading\}<\/p>/, "P1d the heading");
  assert.match(home, /practice test, which flagged \{suggestionCard\.evidence\}/, "P1e the sentence");
  assert.match(home, /href=\{suggestionCard\.route\.lessonHref as Route\}/, "P1f the lesson");
  assert.match(home, /href=\{suggestionCard\.route\.drillHref as Route\}/, "P1g the drill");
  assert.match(home, /Drill \{suggestionCard\.route\.areaLabel\.toLowerCase\(\)\}/, "P1h the drill's label");
  assert.ok(!/diagnosticRoutes|decaDiagnosticRoutesForLearner|suggestion\.areaLabel/.test(home), "P1i nothing else on Home resolves a route");
  assert.match(
    home,
    /hasPersonalNextStep && activeTrack\s*\? decaSuggestion && !decaSuggestion\.route\s*\?\s*`Nothing that \$\{flagged\?\.isLatest \? "your latest" : "a recent"\} \$\{activeTrack\.label\} test flagged is linked to a lesson yet — start with its feedback\. Each activity tells you what it records\.`\s*: `Your last \$\{activeTrack\.label\} test points at one skill/,
    "P1k the header claims one skill only when the card names one"
  );
  const fallback = /const suggestionCard = decaSuggestion \?\? \{[\s\S]*?\n {2}\};/.exec(home);
  assert.ok(fallback, "control: the other-track card was located");
  assert.ok(!home.replace(fallback[0], "").includes("weakAreas[0]"), "P1j the first recorded area is named only on the other tracks' card");
});

check("P2. the results page renders the flashcard step it is given", () => {
  const page = stripComments(read(RESULTS));
  assert.match(page, /import \{ weakTermsStudyStep, type StudyOrganization \} from "@\/lib\/study-content";/, "P2a it imports the step");
  assert.match(page, /weakTermsStudyStep\(\{\s*organization: test\.organization,\s*weakAreas: test\.weakAreas,\s*eventCluster: test\.eventCluster,\s*eventType: test\.eventType\s*\}\)/, "P2b with the test's full record");
  assert.match(page, /title=\{studyStep\.title\}\s*description=\{studyStep\.description\}\s*href=\{studyStep\.href as Route\}/, "P2c label, sentence and link are the step's");
  assert.ok(!/studyDeckForSkill|Study weak terms|deca-marketing/.test(page), "P2d no deck, label or fallback is decided on the page");
  const card = stripComments(read("components/tests/result-recommendations.tsx"));
  assert.ok(!card.includes("No DECA lesson covers"), "P2e the results card names a gap as not linked, never as untaught");
  assert.match(card, /linked to a DECA lesson yet, so nothing above points there\./, "P2f and still names it");
});

check("P3. 'Browse study decks' lands on a list of every DECA deck", () => {
  const arcade = stripComments(read(ARCADE));
  assert.match(arcade, /<Card id="flashcard-decks"/, "P3a the anchor exists");
  assert.match(arcade, /const decks = activeTrack \? allDecks\.filter\(\(d\) => d\.organization === activeTrack\.organization\) : allDecks;/, "P3b the list is the track's own decks");
  assert.match(arcade, /\{decks\.map\(\(deck\) => \(/, "P3c rendered in full");
  assert.ok(!/decks\.slice\(/.test(arcade), "P3d and never cut short");
  assert.equal(DECA_DECKS.length, 18, "P3e eighteen DECA decks to list");
});

console.log(results.join("\n"));
console.log(`\n${results.length - failures}/${results.length} DECA feedback-destination controls passed`);
if (failures > 0) process.exit(1);
