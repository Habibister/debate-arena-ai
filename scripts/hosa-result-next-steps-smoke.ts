/**
 * HOSA test-result next steps — every card on a graded HOSA practice test either links a HOSA
 * destination that does what its label says, or states plainly that nothing exists yet.
 *
 * Run with: npm run hosa-result-next-steps:smoke
 *
 * NO DATABASE CONNECTION, NO PROVIDER, NO WRITES, NO SECRET READ BY THIS SUITE. The real results page
 * is rendered with its session, auth, track-resolution and database modules replaced through the
 * module cache before it loads; the database stand-in answers the page's two reads (the test and its
 * XP ledger row) from in-memory records built from the question bank the test generator itself falls
 * back to, graded by the grader's own weak-area rule. No real test is generated or submitted.
 *
 * THE DEFECTS (1f3f4e1 report, confirmed by the 2026-09-26 census):
 *   1. "Practice weak skills" fell back to a bare "/skills" whenever no lesson was linked. That page
 *      holds no HOSA practice, and for a learner whose selected track is DECA or Debate it is theirs.
 *   2. The flashcard card linked HOSA's first deck (Medical Terminology) for any weak area no deck name
 *      contained, so a Clinical Skills miss opened Medical Terminology flashcards.
 *   3. "Practice speaking" opened "/debate" — General Debate, or HOSA's multiple-choice room — for every
 *      HOSA result. HOSA has no speaking or role-play practice.
 *   Also found: "Generate a retake" opened a bare "/tests", i.e. the generator of whatever track the
 *   learner has selected now.
 *
 * THE CONTRACT, for every HOSA next-step card: LABEL -> EVIDENCE -> DESTINATION -> REACHABLE HOSA
 * CONTENT -> THE ACTION DOES WHAT IT CLAIMS, with no cross-track fallback:
 *   A. The resolver: a linked HOSA lesson first; else Medical Terminology practice, only for a test
 *      whose own event category is Medical Terminology; else a statement with no link. Speaking is
 *      always a statement; the retake opens HOSA's generator. Each link in that chain fails closed.
 *   B. Flashcards: a deck only when a flagged area IS that deck's name or one of its cards' terms, in
 *      any recorded order; otherwise HOSA's own deck list. Never another deck.
 *   C. The rendered page, for HOSA records built from the bank: every link on it is a HOSA
 *      destination (or an external resource), each card says what its link opens, and the statements
 *      link nothing. A learner whose selected track is DECA gets the same links. KNOWN LIMIT, recorded
 *      rather than hidden: a HOSA deck page (/study/hosa-*) follows the viewer's selected track, so
 *      that learner is sent to their own Study Arcade from it (the deck route is not changed here).
 *   D. DECA and every other organization keep exactly the cards they had.
 *   E. The Medical Terminology loop from 1f3f4e1 is unchanged, and the destinations are real.
 *   F. No new model, no scoring or mastery change, one module decides.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module from "node:module";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const REPO = path.resolve(__dirname, "..");
const read = (p: string) => readFileSync(path.join(REPO, p), "utf8");
const stripComments = (src: string) =>
  src.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1 ");
const decode = (h: string) =>
  h.replace(/&#x27;|&#39;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const visible = (h: string) => decode(h).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const exactKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

let checks = 0;
function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn()).then(() => {
    checks += 1;
    console.log(`  ok  ${name}`);
  });
}

// ---- module stubs, installed BEFORE the page loads ----------------------------------------------------
function stubFile(file: string, exports: Record<string, unknown>): void {
  const mod = new Module(file);
  mod.filename = file;
  mod.loaded = true;
  mod.exports = exports;
  require.cache[file] = mod;
}
const stub = (relativePath: string, exports: Record<string, unknown>) => stubFile(require.resolve(path.join(REPO, relativePath)), exports);

type Row = Record<string, unknown>;
const db = { touches: [] as string[] };
let currentTest: Row | null = null;
const prismaStandIn = new Proxy(
  {
    practiceTest: {
      findFirst: async ({ where }: { where: Row }) =>
        currentTest && currentTest.id === where.id && currentTest.userId === where.userId ? currentTest : null
    },
    xPLog: { findFirst: async () => null }
  } as Record<string, unknown>,
  {
    get(target, property) {
      db.touches.push(String(property));
      if (property in target) return target[String(property)];
      throw new Error(`the database client was touched (${String(property)})`);
    }
  }
);
// The viewer: who is signed in and which track they have selected (cookie) — independent of the record.
const viewer: { organization: string | null; cookie: string | null } = { organization: "HOSA", cookie: null };

stubFile(require.resolve("next-auth", { paths: [REPO] }), { getServerSession: async () => ({ user: { id: "user_smoke" } }) });
stub("lib/auth", { authOptions: {} });
stub("lib/prisma", { prisma: prismaStandIn });

// tsconfig jsx=preserve => classic React.createElement, so React must be global before the
// component modules are evaluated. Same harness as the other HOSA suites.
(globalThis as { React?: unknown }).React = React;

import { pickActiveTrack } from "../lib/track-precedence";
stub("lib/track-server", {
  resolveActiveTrack: async (routeSlug?: string | null) =>
    pickActiveTrack({ routeSlug, organization: viewer.organization as never, cookieSlug: viewer.cookie }),
  getActiveTrack: async (routeSlug?: string | null) =>
    pickActiveTrack({ routeSlug, organization: viewer.organization as never, cookieSlug: viewer.cookie }).track
});

import { buildFallbackPracticeQuestions } from "../lib/test-question-bank";
import { HOSA_EVENT_CATEGORIES, DECA_EVENT_CLUSTERS } from "../lib/testing";
import { deckSummaries, flashcardsForDeck, studyDeckForSkill, weakTermsStudyStep } from "../lib/study-content";
import { HOSA_EVENTS, hosaEventById } from "../lib/hosa-events";
import { MEDTERM_AREAS, buildMedTermSession } from "../lib/hosa-medterm";
import { medTermFocus, medTermFocusFromParam, medTermFocusRequestAreas, HOSA_MEDTERM_FOCUS_PARAM } from "../lib/hosa-medterm-focus";
import {
  hosaResultNextSteps,
  practiceWeakSkillsDescription,
  testResultRecommendationsForLearner,
  HOSA_SEEDED_TOPIC_LESSON,
  type HosaResultNextSteps
} from "../lib/education/test-result-recommendations";
import { hosaMedTermRemediation, hosaLessonPracticeLink } from "../lib/education/hosa-medterm-practice";
import { resolveSkillsSlug } from "../lib/education/skills-compat";
import { getEducationLesson } from "../lib/education/registry";

// ---- fixtures: the seed's HOSA suggestion rows and the grader's rule, both read back from source ------
const SEED_ROWS = [
  { skill: "Medical Terminology", slug: "hosa-medical-terminology", lessons: ["Word roots", "Clinical abbreviations", "Terminology in patient scenarios"] },
  { skill: "Patient Communication", slug: "hosa-patient-communication", lessons: ["Plain-language explanations", "Active listening", "Ethical patient conversations"] }
].flatMap((s) => s.lessons.map((title, i) => ({ skillName: s.skill, slug: `${s.slug}-${i + 1}`, title })));

/** The grader's legacy-row rule for a non-DECA test (app/api/tests/[testId]/grade/route.ts), restated. */
function storedFor(weakAreas: readonly string[]) {
  const matches = SEED_ROWS.filter((row) =>
    weakAreas.some((area) => {
      const a = area.toLowerCase();
      return row.title.toLowerCase().includes(a) || row.skillName.toLowerCase().includes(a) || a.includes(row.skillName.toLowerCase());
    })
  );
  return matches.slice(0, 5).map((row) => ({ lessonSlug: row.slug, title: row.title, reason: "Recommended from this test's weak areas." }));
}

type Scenario = {
  name: string;
  organization: "HOSA" | "DECA";
  eventType: string;
  category: string;
  count: 10 | 25 | 50 | 100;
  /** Tags answered wrong; every question with one of these tags is missed. */
  wrong: string[];
};

function buildRecord(s: Scenario) {
  const bank = buildFallbackPracticeQuestions({ organization: s.organization, eventType: s.eventType, eventCluster: s.category, difficulty: "BEGINNER", count: s.count });
  const wrong = new Set(s.wrong.map(exactKey));
  const questions = bank.map((q, i) => {
    const miss = wrong.has(exactKey(q.skillTag));
    const selected = miss ? q.choices.find((c) => c !== q.correctAnswer) ?? "No answer" : q.correctAnswer;
    return {
      id: `q${i}`,
      question: q.question,
      choices: q.choices,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      skillTag: q.skillTag,
      answers: [{ selectedAnswer: selected, isCorrect: !miss }]
    };
  });
  // The grader's weak-area rule: the distinct tags of the wrongly answered questions.
  const weakAreas = Array.from(new Set(questions.filter((q) => !q.answers[0].isCorrect).map((q) => q.skillTag)));
  const correct = questions.filter((q) => q.answers[0].isCorrect).length;
  return {
    id: `test_${s.name.replace(/\W+/g, "_")}`,
    userId: "user_smoke",
    status: "COMPLETED",
    organization: s.organization,
    eventType: s.eventType,
    eventCluster: s.category,
    difficulty: "BEGINNER",
    questionCount: questions.length,
    score: Math.round((correct / questions.length) * 100),
    weakAreas,
    recommendations: {
      lessons: s.organization === "HOSA" ? storedFor(weakAreas) : [],
      note: weakAreas.length ? "Work through what the results page lists under \"What to work on\", then regenerate a shorter test in the same event cluster." : "Strong performance. Move up a difficulty level or switch event clusters."
    },
    questions
  };
}

type Anchor = { href: string; text: string; html: string };
const anchorsOf = (html: string): Anchor[] =>
  [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
    href: decode(/href="([^"]*)"/.exec(m[1])?.[1] ?? ""),
    text: visible(m[2]),
    html: m[0]
  }));

async function renderResults(record: Row, trackParam?: string): Promise<{ html: string; redirectedTo: string | null }> {
  currentTest = record;
  db.touches.length = 0;
  const { default: Page } = require("../app/(app)/tests/[testId]/results/page") as {
    default: (p: { params: { testId: string }; searchParams?: { track?: string } }) => Promise<React.ReactElement>;
  };
  try {
    const element = await Page({ params: { testId: String(record.id) }, searchParams: trackParam ? { track: trackParam } : {} });
    return { html: decode(renderToStaticMarkup(element)), redirectedTo: null };
  } catch (error) {
    const digest = String((error as { digest?: string }).digest ?? "");
    if (digest.startsWith("NEXT_REDIRECT")) return { html: "", redirectedTo: digest.split(";")[2] ?? digest };
    throw error;
  }
}

/** A link a HOSA result may carry: a HOSA destination, scoped by its path or `?track=hosa`, or external. */
function hosaDestination(href: string): string | null {
  if (/^https:\/\//.test(href)) return "external";
  if (href === "/tests?track=hosa") return "hosa-generator";
  const lesson = /^\/lessons\/([a-z0-9-]+)\?track=hosa$/.exec(href);
  if (lesson) return getEducationLesson(lesson[1])?.track === "HOSA" && getEducationLesson(lesson[1])?.visibility === "learner" ? "hosa-lesson" : null;
  if (/^\/training\/hosa(\/|$)/.test(href)) return "hosa-training";
  const deck = /^\/study\/([a-z0-9-]+)$/.exec(href);
  if (deck) return flashcardsForDeck(deck[1]).length > 0 && flashcardsForDeck(deck[1]).every((c) => c.organization === "HOSA") ? "hosa-deck" : null;
  if (href === "/study-arcade?track=hosa#flashcard-decks") return "hosa-deck-list";
  return null;
}

/** The next-step card whose visible text starts with `title`: its anchor, or the statement with no anchor. */
function card(html: string, title: string): { href: string | null; text: string } {
  const a = anchorsOf(html).find((x) => x.text.startsWith(title));
  if (a) return { href: a.href, text: a.text };
  const at = html.indexOf(`>${title}<`);
  assert.ok(at > 0, `fixture: the "${title}" card is on the page`);
  const block = html.slice(html.lastIndexOf("<div", at), html.indexOf("</div></div>", at) + 12);
  return { href: null, text: visible(block) };
}

const HOSA_SCENARIOS: Scenario[] = [
  { name: "mt-missed-medical-terminology", organization: "HOSA", eventType: "HEALTH_SCIENCE_EVENT", category: "Medical Terminology", count: 10, wrong: ["Medical terminology"] },
  { name: "mt-missed-word-parts", organization: "HOSA", eventType: "HEALTH_SCIENCE_EVENT", category: "Medical Terminology", count: 10, wrong: ["Word parts", "Clinical vocabulary"] },
  { name: "clinical-skills-missed-safety", organization: "HOSA", eventType: "HEALTH_SCIENCE_EVENT", category: "Clinical Skills", count: 10, wrong: ["Safety protocol", "Infection control"] },
  { name: "infection-control-perfect", organization: "HOSA", eventType: "HEALTH_SCIENCE_EVENT", category: "Infection Control", count: 10, wrong: [] },
  { name: "prepared-speaking-patient-communication", organization: "HOSA", eventType: "PREPARED_SPEAKING", category: "Patient Communication", count: 10, wrong: ["Patient communication", "Empathy"] },
  { name: "mt-perfect", organization: "HOSA", eventType: "HEALTH_SCIENCE_EVENT", category: "Medical Terminology", count: 10, wrong: [] }
];

async function main() {
  console.log("\nhosa-result-next-steps:smoke\n");

  // ---- A. the resolver -----------------------------------------------------------------------------------
  await check("A. HOSA's next steps: a real lesson, else Medical Terminology practice for a Medical Terminology test, else a statement", () => {
    const steps = (org: string, firstLessonHref: string | null, eventCluster: string | null, weakAreas: string[]) =>
      hosaResultNextSteps({ recommendations: { organization: org === "DECA" || org === "HOSA" ? org : "OTHER", firstLessonHref }, eventCluster, weakAreas });
    for (const org of ["DECA", "GENERAL_DEBATE", "MODEL_UN", ""]) {
      assert.equal(steps(org, null, "Medical Terminology", ["x"]), null, `A1. a ${org || "blank"} test gets no HOSA step`);
    }
    // 1. A linked HOSA lesson wins.
    const lesson = steps("HOSA", "/lessons/hosa-medical-word-roots?track=hosa", "Medical Terminology", ["Medical terminology"])!;
    assert.deepEqual(lesson.practice, {
      kind: "link", title: "Practice weak skills", description: practiceWeakSkillsDescription("HOSA"), href: "/lessons/hosa-medical-word-roots?track=hosa"
    }, "A2. a linked HOSA lesson is the step, under the sentence that promises a lesson");
    for (const foreign of ["/lessons/deca-marketing-basics?track=deca", "/skills", "/lessons/hosa-medical-word-roots", "/debate"]) {
      const s = steps("HOSA", foreign, "Clinical Skills", ["Safety protocol"])!;
      assert.equal(s.practice.kind, "note", `A2b. a first-lesson link that is not a HOSA lesson path (${foreign}) is never followed`);
    }
    // 2. Medical Terminology practice, for a Medical Terminology test only.
    for (const cluster of ["Medical Terminology", " medical  terminology "]) {
      const mt = steps("HOSA", null, cluster, ["Word parts"])!;
      assert.equal(mt.practice.kind, "link", `A3. a "${cluster}" test with no lesson gets Medical Terminology practice`);
      if (mt.practice.kind === "link") {
        assert.equal(mt.practice.href, "/training/hosa/practice?focus=all", "A3b. the room itself, every area selected");
        assert.equal(mt.practice.title, "Practise Medical Terminology", "A3c. and the title names what it opens");
        assert.match(mt.practice.description, /This test was in the Medical Terminology event category, and no lesson is linked to its weak areas yet\./, "A3d. it says why this is offered");
        assert.ok(mt.practice.description.includes(`“${medTermFocus("all").label}”`), "A3e. it names the choice the room opens with");
      }
    }
    const mtPerfect = steps("HOSA", null, "Medical Terminology", [])!;
    assert.ok(mtPerfect.practice.kind === "link" && mtPerfect.practice.description.startsWith("This test flagged no weak areas."), "A3f. a perfect Medical Terminology test is not told it has weak areas");
    // 3. Anything else: a statement, no link.
    for (const cluster of [...HOSA_EVENT_CATEGORIES.filter((c) => c !== "Medical Terminology"), "Medical Terminology II", "", null]) {
      const s = steps("HOSA", null, cluster, ["Anatomy"])!;
      assert.deepEqual(s.practice, {
        kind: "note", title: "No practice linked yet",
        description: "No HOSA lesson or practice is linked to this test's weak areas yet. The explanations below cover each question you missed."
      }, `A4. a ${cluster ?? "null"} test with no lesson gets a statement, never /skills`);
    }
    assert.deepEqual(steps("HOSA", null, "Nutrition", ["  "]), steps("HOSA", null, "Nutrition", []), "A4b. blank weak areas count as none");
    assert.equal(steps("HOSA", null, "Nutrition", [])!.practice.title, "No weak skills flagged", "A4c. and say so");
    // Speaking and retake, whatever the test.
    for (const s of [lesson, steps("HOSA", null, "Patient Communication", ["Empathy"])!, mtPerfect]) {
      assert.deepEqual(s.speaking, { kind: "note", title: "No speaking practice yet", description: "CompeteReady does not have HOSA speaking or role-play practice yet." }, "A5. speaking is a statement, never a link");
      assert.ok(s.retake.kind === "link" && s.retake.href === "/tests?track=hosa", "A6. the retake opens HOSA's generator, route-scoped");
      assert.equal(s.retake.title, "Generate a retake", "A6b. under the title it had");
      assert.ok(!/shorter|cluster/i.test(s.retake.description), "A6c. promising no shorter test and no preset the generator does not apply");
    }
    // The generator opens on its own defaults, so the card names the category to choose, in the
    // generator's own spelling, only when the stored value is one of its categories.
    assert.equal(steps("HOSA", null, " clinical  skills ", [])!.retake.description,
      "Opens the HOSA test generator. To retake this event category, choose “Clinical Skills” there.", "A6d. a generator category is named as the generator spells it");
    for (const cluster of ["Clinical Skills II", "", null]) {
      assert.equal(steps("HOSA", null, cluster, [])!.retake.description,
        "Opens the HOSA test generator, where you choose an event category and a number of questions.", `A6e. a ${cluster ?? "null"} category is never named`);
    }
    // Fail closed: each fact the Medical Terminology step depends on, removed in turn.
    const event = hosaEventById("medical-terminology")!;
    const savedName = event.name;
    try {
      event.name = "Medical Terminology (renamed)";
      assert.equal(steps("HOSA", null, "Medical Terminology", ["x"])!.practice.kind, "note", "A7. an event the registry no longer names that way offers no practice");
    } finally {
      event.name = savedName;
    }
    const at = HOSA_EVENTS.indexOf(event);
    HOSA_EVENTS.splice(at, 1);
    try {
      assert.equal(steps("HOSA", null, "Medical Terminology", ["x"])!.practice.kind, "note", "A7b. an event missing from the registry offers no practice");
    } finally {
      HOSA_EVENTS.splice(at, 0, event);
    }
    const catAt = HOSA_EVENT_CATEGORIES.indexOf("Medical Terminology");
    HOSA_EVENT_CATEGORIES.splice(catAt, 1);
    try {
      assert.equal(steps("HOSA", null, "Medical Terminology", ["x"])!.practice.kind, "note", "A7c. a category the generator no longer offers offers no practice");
    } finally {
      HOSA_EVENT_CATEGORIES.splice(catAt, 0, "Medical Terminology");
    }
    assert.equal(steps("HOSA", null, "Medical Terminology", ["x"])!.practice.kind, "link", "A7d. control: restored, the step is back");
  });

  // ---- B. flashcards -----------------------------------------------------------------------------------
  await check("B. a HOSA flashcard link opens only a deck a flagged area names exactly; otherwise HOSA's deck list", () => {
    const hosaDecks = deckSummaries().filter((d) => d.organization === "HOSA");
    assert.equal(hosaDecks.length, 16, "B-control. sixteen HOSA decks");
    let decks = 0, lists = 0, legacyUnrelated = 0;
    for (const category of HOSA_EVENT_CATEGORIES) {
      for (const count of [10, 25, 50, 100] as const) {
        const tags = Array.from(new Set(buildFallbackPracticeQuestions({ organization: "HOSA", eventType: "HEALTH_SCIENCE_EVENT", eventCluster: category, difficulty: "BEGINNER", count }).map((q) => q.skillTag)));
        const subsets = [tags, [...tags].reverse(), ...tags.map((t) => [t]), tags.slice(1), []];
        for (const weakAreas of subsets) {
          const input = { organization: "HOSA", weakAreas, eventCluster: category, eventType: "HEALTH_SCIENCE_EVENT" };
          const step = weakTermsStudyStep(input);
          const reversed = weakTermsStudyStep({ ...input, weakAreas: [...weakAreas].reverse() });
          assert.deepEqual(step, reversed, `B1. ${category} [${weakAreas.join(", ")}]: the order the grader stored them in decides nothing`);
          const flagged = new Set(weakAreas.map(exactKey));
          const slug = /^\/study\/([a-z0-9-]+)$/.exec(step.href)?.[1];
          if (slug) {
            decks += 1;
            const cards = flashcardsForDeck(slug);
            assert.ok(cards.length > 0 && cards.every((c) => c.organization === "HOSA"), `B2. ${slug} is a HOSA deck`);
            const byDeck = [...flagged].find((f) => f === exactKey(cards[0].deck));
            const byTerm = cards.find((c) => flagged.has(exactKey(c.term)));
            assert.ok(byDeck || byTerm, `B3. ${category} [${weakAreas.join(", ")}]: ${slug} is named by a flagged area`);
            assert.equal(step.title, "Study weak terms", "B3b. and is offered as the weak terms");
            assert.ok(step.description.includes(cards[0].deck), "B3c. naming the deck it opens");
          } else {
            lists += 1;
            assert.equal(step.href, "/study-arcade?track=hosa#flashcard-decks", `B4. ${category} [${weakAreas.join(", ")}]: otherwise HOSA's own deck list`);
            assert.equal(step.title, "Browse study decks", "B4b. named as a list");
            assert.ok(step.description.endsWith("Study Arcade lists every HOSA deck under Flashcard decks."), "B4c. of HOSA decks");
            assert.ok(!/DECA/.test(step.description), "B4d. with no DECA word");
            assert.ok(weakAreas.length ? step.description.startsWith("No flashcard deck matches") : step.description.startsWith("This test flagged no weak areas."), "B4e. saying why");
          }
          // The card this replaced, for the control count.
          const legacy = studyDeckForSkill(weakAreas[0] ?? category, "HOSA");
          const legacyCards = legacy ? flashcardsForDeck(legacy.deckSlug) : [];
          if (legacyCards.length && !flagged.has(exactKey(legacyCards[0].deck)) && !legacyCards.some((c) => flagged.has(exactKey(c.term))) && weakAreas.length) legacyUnrelated += 1;
        }
      }
    }
    assert.ok(decks > 0 && lists > 0, `B5. control: both outcomes occur (${decks} decks, ${lists} lists)`);
    assert.ok(legacyUnrelated > 0, `B5b. control: the old card opened an unrelated deck for ${legacyUnrelated} of these`);
    const clinical = weakTermsStudyStep({ organization: "HOSA", weakAreas: ["Safety protocol", "Infection control"], eventCluster: "Clinical Skills", eventType: "HEALTH_SCIENCE_EVENT" });
    assert.equal(clinical.href, "/study/hosa-infection-control", "B6. a Clinical Skills test that missed infection control opens Infection Control, in either order");
    assert.equal(studyDeckForSkill("Safety protocol", "HOSA")?.deckSlug, "hosa-medical-terminology", "B6b. control: the old rule sent it to Medical Terminology");
    for (const fuzzy of ["Care", "Health", "Word roots", "Pulse", "HEALTH_SCIENCE_EVENT"]) {
      const s = weakTermsStudyStep({ organization: "HOSA", weakAreas: [fuzzy], eventCluster: "Healthcare Careers", eventType: "HEALTH_SCIENCE_EVENT" });
      const slug = /^\/study\/([a-z0-9-]+)$/.exec(s.href)?.[1];
      if (slug) assert.ok(flashcardsForDeck(slug).some((c) => exactKey(c.term) === exactKey(fuzzy)) || exactKey(flashcardsForDeck(slug)[0].deck) === exactKey(fuzzy), `B7. "${fuzzy}" opens a deck only by exact name or term`);
    }
  });

  // ---- C. the rendered page ------------------------------------------------------------------------------
  const rendered = new Map<string, string>();
  await check("C. rendered HOSA results link only HOSA destinations, each card does what it says, statements link nothing", async () => {
    for (const s of HOSA_SCENARIOS) {
      const record = buildRecord(s);
      viewer.organization = "HOSA";
      viewer.cookie = null;
      const { html, redirectedTo } = await renderResults(record);
      assert.equal(redirectedTo, null, `C0. ${s.name}: a HOSA learner's own result renders in place`);
      rendered.set(s.name, html);
      assert.deepEqual([...new Set(db.touches)].sort(), ["practiceTest", "xPLog"], `C0b. ${s.name}: the page reads the test and its ledger row, nothing else`);
      for (const a of anchorsOf(html)) {
        assert.ok(hosaDestination(a.href), `C1. ${s.name}: "${a.text}" -> ${a.href} is a HOSA destination`);
      }
      for (const banned of ["/skills", "/debate", "/tests", "/study"]) {
        assert.ok(!anchorsOf(html).some((a) => a.href === banned || a.href.startsWith(`${banned}?`) && !a.href.includes("track=hosa")), `C1b. ${s.name}: nothing opens ${banned}`);
      }
      const weak = record.weakAreas;
      const practice = card(html, weak.length && storedFor(weak).some((r) => HOSA_SEEDED_TOPIC_LESSON.has(r.lessonSlug)) ? "Practice weak skills"
        : s.category === "Medical Terminology" ? "Practise Medical Terminology" : weak.length ? "No practice linked yet" : "No weak skills flagged");
      const speaking = card(html, "No speaking practice yet");
      const retake = card(html, "Generate a retake");
      const study = anchorsOf(html).find((a) => a.text.startsWith("Study weak terms") || a.text.startsWith("Browse study decks"));
      assert.ok(study, `C2. ${s.name}: the flashcard card is a link`);
      assert.equal(speaking.href, null, `C3. ${s.name}: speaking is a statement with no link`);
      assert.ok(speaking.text.includes("CompeteReady does not have HOSA speaking or role-play practice yet."), `C3b. ${s.name}: saying none exists`);
      assert.ok(!/Practice speaking|judged roleplay|debate response/i.test(visible(html)), `C3c. ${s.name}: no speaking or debate promise anywhere`);
      assert.equal(retake.href, "/tests?track=hosa", `C4. ${s.name}: the retake opens HOSA's generator`);
      assert.ok(retake.text.includes(`choose “${s.category}” there`) && !/shorter/.test(retake.text), `C4b. ${s.name}: and says which category to choose there`);
      switch (s.name) {
        case "mt-missed-medical-terminology":
          assert.equal(practice.href, "/lessons/hosa-medical-word-roots?track=hosa", "C5. a stored Word roots suggestion still reaches its real lesson");
          assert.equal(study!.href, "/study/hosa-medical-terminology", "C5b. and the Medical Terminology deck, which the flagged area names");
          break;
        case "mt-missed-word-parts":
          assert.equal(practice.href, "/training/hosa/practice?focus=all", "C6. a Medical Terminology test with no linked lesson opens Medical Terminology practice");
          assert.ok(practice.text.includes("This test was in the Medical Terminology event category"), "C6b. saying why");
          break;
        case "clinical-skills-missed-safety":
          assert.equal(practice.href, null, "C7. a Clinical Skills miss has no practice to open, so the card links nothing");
          assert.ok(practice.text.includes("No HOSA lesson or practice is linked to this test's weak areas yet."), "C7b. and says so");
          assert.equal(study!.href, "/study/hosa-infection-control", "C7c. its flashcards are the deck a flagged area names, not Medical Terminology");
          break;
        case "infection-control-perfect":
          assert.equal(practice.href, null, "C8. a perfect score has nothing to practise");
          assert.equal(study!.href, "/study-arcade?track=hosa#flashcard-decks", "C8b. and its flashcard card opens HOSA's deck list");
          assert.ok(study!.text.includes("This test flagged no weak areas."), "C8c. without claiming missed terms");
          break;
        case "prepared-speaking-patient-communication":
          assert.equal(practice.href, null, "C9. unwritten Patient Communication suggestions invent no destination");
          assert.equal(study!.href, "/study/hosa-patient-communication", "C9b. its flashcards are the deck the flagged area names");
          break;
        case "mt-perfect":
          assert.equal(practice.href, "/training/hosa/practice?focus=all", "C10. a perfect Medical Terminology test may still practise the event");
          assert.ok(practice.text.includes("This test flagged no weak areas."), "C10b. without claiming weak areas");
          break;
      }
      // A statement is not a link and never looks like one.
      for (const title of ["No speaking practice yet", "No practice linked yet", "No weak skills flagged"]) {
        assert.ok(!anchorsOf(html).some((a) => a.text.startsWith(title)), `C11. ${s.name}: "${title}" is never inside a link`);
      }
    }
    // The page's own "What to work on" and back links stay HOSA's too (checked above for every anchor).
  });

  await check("C'. the same HOSA result, opened by a learner whose selected track is DECA, carries the same HOSA-scoped links; a deck page still follows that learner's track (known limit)", async () => {
    const record = buildRecord(HOSA_SCENARIOS[2]);
    viewer.organization = "DECA";
    viewer.cookie = "deca";
    const first = await renderResults(record);
    assert.equal(first.redirectedTo, `/tests/${record.id}/results?track=hosa`, "C'1. control: the page stamps the record's track first");
    const { html, redirectedTo } = await renderResults(record, "hosa");
    assert.equal(redirectedTo, null, "C'2. then renders");
    assert.deepEqual(anchorsOf(html).map((a) => a.href), anchorsOf(rendered.get(HOSA_SCENARIOS[2].name)!).map((a) => a.href), "C'3. every link is the one a HOSA learner gets");
    // Every one of those links is scoped by its path or `?track=hosa`, except a deck page: the deck
    // route follows the viewer's selected track (its own isolation guard, the same for DECA decks, not
    // changed here). Recorded, so this guard claims only what it checks and notices if that changes.
    const deckLinks = anchorsOf(html).filter((a) => /^\/study\/hosa-/.test(a.href));
    assert.equal(deckLinks.length, 1, "C'4. control: the result links one matched HOSA deck");
    const { default: DeckPage } = require("../app/(app)/study/[deck]/page") as {
      default: (p: { params: { deck: string }; searchParams: { assignmentId?: string } }) => Promise<unknown>;
    };
    const deckSlug = deckLinks[0].href.slice("/study/".length);
    let deckRedirect = "";
    try {
      await DeckPage({ params: { deck: deckSlug }, searchParams: {} });
    } catch (error) {
      deckRedirect = String((error as { digest?: string }).digest ?? "");
    }
    assert.ok(deckRedirect.includes(";/study;"), `C'4b. KNOWN LIMIT: for this learner the deck page sends them to /study (${deckRedirect || "rendered"})`);
    viewer.organization = "HOSA";
    viewer.cookie = null;
    let hosaViewerRedirect = "";
    try {
      await DeckPage({ params: { deck: deckSlug }, searchParams: {} });
    } catch (error) {
      hosaViewerRedirect = String((error as { digest?: string }).digest ?? "");
    }
    assert.equal(hosaViewerRedirect, "", "C'4c. while a HOSA learner, who takes HOSA tests, opens it");
  });

  // ---- D. DECA and the others keep what they had --------------------------------------------------------
  await check("D. DECA results keep exactly their cards; every other organization gets no HOSA step", async () => {
    const decaScenario: Scenario = { name: "deca-marketing", organization: "DECA", eventType: "Practice test", category: DECA_EVENT_CLUSTERS[0], count: 10, wrong: [] };
    const bankTags = Array.from(new Set(buildFallbackPracticeQuestions({ organization: "DECA", eventType: "Practice test", eventCluster: decaScenario.category, difficulty: "BEGINNER", count: 10 }).map((q) => q.skillTag)));
    decaScenario.wrong = bankTags.slice(0, 2);
    const record = buildRecord(decaScenario);
    viewer.organization = "DECA";
    viewer.cookie = null;
    const { html, redirectedTo } = await renderResults(record);
    assert.equal(redirectedTo, null, "D0. a DECA learner's DECA result renders in place");
    const workOn = testResultRecommendationsForLearner({ organization: "DECA", weakAreas: record.weakAreas, stored: [] });
    const practice = anchorsOf(html).find((a) => a.text.startsWith("Practice weak skills"));
    assert.equal(practice?.href, workOn.firstLessonHref ?? "/skills", "D1. Practice weak skills: its first lesson, else /skills, as before");
    assert.ok(practice?.text.includes(practiceWeakSkillsDescription("DECA")) && practice.text.includes("retry the same cluster"), "D1b. with DECA's sentence");
    const study = weakTermsStudyStep({ organization: "DECA", weakAreas: record.weakAreas, eventCluster: record.eventCluster, eventType: record.eventType });
    assert.ok(anchorsOf(html).some((a) => a.href === study.href && a.text.startsWith(study.title)), "D2. the flashcard card is DECA's step, unchanged");
    assert.equal(anchorsOf(html).find((a) => a.text.startsWith("Generate a retake"))?.href, "/tests", "D3. the retake is the /tests it was");
    const speaking = anchorsOf(html).find((a) => a.text.startsWith("Practice speaking"));
    assert.equal(speaking?.href, "/debate", "D4. and DECA's speaking card is the one it had");
    assert.ok(speaking?.text.includes("Turn the same weak skill into a judged roleplay or debate response."), "D4b. word for word");
    assert.ok(!/No practice linked yet|No speaking practice yet|No weak skills flagged|Practise Medical Terminology|HOSA test generator/.test(visible(html)), "D5. no HOSA statement appears on a DECA result");
    assert.ok(anchorsOf(html).find((a) => a.text.startsWith("Generate a retake"))?.text.includes("Create a shorter test in the same category after reviewing explanations."), "D3b. with the sentence it had");
    // DECA flashcards: the exact DECA copy and list, unchanged by sharing the rule with HOSA.
    const none = weakTermsStudyStep({ organization: "DECA", weakAreas: ["zz unknown"], eventCluster: null, eventType: "Practice test" });
    assert.deepEqual(none, {
      title: "Browse study decks",
      description: "No flashcard deck matches the areas this test flagged. Study Arcade lists every DECA deck under Flashcard decks.",
      href: "/study-arcade?track=deca#flashcard-decks"
    }, "D6. DECA's no-match card is word for word what it was");
    assert.deepEqual(weakTermsStudyStep({ organization: "DECA", weakAreas: [], eventCluster: null, eventType: "Practice test" }).description,
      "This test flagged no weak areas. Study Arcade lists every DECA deck under Flashcard decks.", "D6b. and its no-weak-area sentence");
    for (const organization of ["GENERAL_DEBATE", "MODEL_UN", "PUBLIC_SPEAKING"]) {
      assert.deepEqual(weakTermsStudyStep({ organization, weakAreas: ["Rebuttal"], eventCluster: null, eventType: "Practice test" }),
        { title: "Study weak terms", description: "Review flashcards tied to the terms and concepts you missed.", href: "/study" }, `D7. ${organization} keeps its card`);
    }
    // The page keeps DECA's exact expressions in the non-HOSA branch.
    const page = stripComments(read("app/(app)/tests/[testId]/results/page.tsx"));
    assert.match(page, /href=\{\(workOn\.firstLessonHref \?\? "\/skills"\) as Route\}/, "D8. the non-HOSA practice card is the expression it was");
    assert.match(page, /title="Practice speaking"\s*description="Turn the same weak skill into a judged roleplay or debate response\."\s*href="\/debate"/, "D8b. and so is the non-HOSA speaking card");
    assert.match(page, /title="Generate a retake"\s*description="Create a shorter test in the same category after reviewing explanations\."\s*href="\/tests"/, "D8c. and so is the non-HOSA retake card");
    viewer.organization = "HOSA";
  });

  // ---- E. the Medical Terminology loop and the destinations are real -----------------------------------
  await check("E. the Medical Terminology loop is unchanged and every destination offered is real", () => {
    assert.equal(hosaMedTermRemediation("word-roots", "Word roots")?.kind, "lesson", "E1. word roots still resolve to their lesson");
    assert.equal(hosaMedTermRemediation("prefixes", "Prefixes")?.kind, "lesson", "E1b. prefixes");
    assert.equal(hosaMedTermRemediation("suffixes", "Suffixes")?.kind, "lesson", "E1c. suffixes");
    // Anatomy and physiology gained their lessons after this suite was written (the anatomy and
    // physiology modules), so they now open them; scripts/hosa-medterm-anatomy-smoke.ts and
    // scripts/hosa-medterm-physiology-smoke.ts own those loops. Pathophysiology still has none.
    const anatomy = hosaMedTermRemediation("anatomy", "Anatomy");
    assert.ok(anatomy?.kind === "lesson" && anatomy.lessonId === "hosa-anatomy-body-map", "E1d. anatomy opens the anatomy lessons");
    const physiology = hosaMedTermRemediation("physiology", "Physiology");
    assert.ok(physiology?.kind === "lesson" && physiology.lessonId === "hosa-physiology-staying-in-balance", "E1d1. physiology opens the physiology lessons");
    for (const [id, label] of [["pathophysiology", "Pathophysiology"]]) {
      assert.equal(hosaMedTermRemediation(id, label)?.kind, "no-lesson", `E1d2. ${id} still has no lesson`);
    }
    assert.equal(hosaLessonPracticeLink("hosa-medical-word-roots")?.href, "/training/hosa/practice?focus=word-parts", "E2. a lesson still returns to word-part practice");
    assert.deepEqual(resolveSkillsSlug("hosa-medical-terminology-1"), { kind: "canonical-redirect", lessonId: "hosa-medical-word-roots", via: "allowlist" },
      "E3. the old Word roots record still opens its lesson");
    const hub = stripComments(read("app/(app)/training/[track]/page.tsx"));
    assert.match(hub, /label=\{`\$\{hosaEventHqName\} practice`\}/, "E4. the hub's Medical Terminology practice row is still there");
    // The practice step's room: the HOSA route that renders the Medical Terminology room, all areas.
    const href = "/training/hosa/practice?focus=all";
    const url = new URL(href, "http://localhost");
    assert.equal(medTermFocusFromParam(url.searchParams.get(HOSA_MEDTERM_FOCUS_PARAM) ?? undefined), "all", "E5. the practice link selects every area");
    assert.equal(medTermFocusRequestAreas("all"), undefined, "E5b. which asks the route for every area");
    const session = buildMedTermSession(60);
    assert.deepEqual([...new Set(session.map((q) => q.area))].sort(), MEDTERM_AREAS.map((a) => a.id).sort(),
      "E5c. so it asks about word parts, anatomy, physiology and disease, as the card says");
    const practicePage = stripComments(read("app/(app)/training/[track]/practice/page.tsx"));
    assert.match(practicePage, /track\.id === "HOSA" \? <HosaEventPrep/, "E5d. the route renders the HOSA room for the HOSA track");
    // The speaking statement is true: HOSA has no speaking practice to link.
    for (const route of ["app/api/ai/hosa-scenario/route.ts", "app/api/ai/judge-hosa/route.ts"]) {
      assert.match(read(route), /status: 410/, `E6. ${route} is withdrawn`);
    }
    const speakingEvents = HOSA_EVENTS.filter((e) => e.family === "presentation" || e.family === "interview");
    assert.ok(speakingEvents.length > 0 && speakingEvents.every((e) => !e.routeTarget), "E6b. no HOSA speaking or interview event has a page");
    assert.match(read("app/(app)/debate/page.tsx"), /redirect\(`\/training\/\$\{activeTrack\.slug\}\/practice` as Route\)/,
      "E6c. control: /debate sent a HOSA learner to the multiple-choice room, under a speaking label");
    // The deck list is route-scoped and lists the track's own decks.
    const arcade = stripComments(read("app/(app)/study-arcade/page.tsx"));
    assert.match(arcade, /<Card id="flashcard-decks"/, "E7. the deck list anchor exists");
    assert.match(arcade, /const decks = activeTrack \? allDecks\.filter\(\(d\) => d\.organization === activeTrack\.organization\) : allDecks;/, "E7b. and lists the track's own decks");
  });

  // ---- F. one module decides; no model, scoring or mastery change ---------------------------------------
  await check("F. one module decides, the page renders it, and nothing is scored, stored or mastered differently", () => {
    const page = stripComments(read("app/(app)/tests/[testId]/results/page.tsx"));
    assert.match(page, /const hosaNext = hosaResultNextSteps\(\{ recommendations: workOn, eventCluster: test\.eventCluster, weakAreas: test\.weakAreas \}\);/, "F1. the page asks the results module, with the test's own record");
    assert.match(page, /hosaNext \? \(\s*<ResultNextStepCard step=\{hosaNext\.practice\}/, "F1b. and renders its practice step");
    assert.match(page, /hosaNext \? \(\s*<ResultNextStepCard step=\{hosaNext\.speaking\}/, "F1c. and its speaking step");
    assert.ok(!/\/training\/hosa|Medical Terminology|hosa-/.test(page), "F1d. the page names no HOSA destination itself");
    const educationImports = page.match(/from "@\/lib\/education\/[a-z-]+"/g) ?? [];
    assert.deepEqual(educationImports, ['from "@/lib/education/test-result-recommendations"'], "F2. one education module");
    const moduleSrc = stripComments(read("lib/education/test-result-recommendations.ts"));
    const hosaPart = moduleSrc.slice(moduleSrc.indexOf("export type ResultNextStep"));
    assert.ok(hosaPart.length > 500, "F2b. control: the HOSA part of the module was found");
    assert.ok(!/mastery|readiness|\bXP\b|competition-ready|prisma|fetch\(/i.test(hosaPart), "F3. no mastery, readiness, XP, database or network in the new step");
    const grader = read("app/api/tests/[testId]/grade/route.ts");
    assert.match(grader, /lesson\.title\.toLowerCase\(\)\.includes\(normalizedArea\) \|\|\s*lesson\.skill\.name\.toLowerCase\(\)\.includes\(normalizedArea\) \|\|\s*normalizedArea\.includes\(lesson\.skill\.name\.toLowerCase\(\)\)[\s\S]{0,120}\.slice\(0, 5\)/,
      "F4. control: the suggestion rule this suite restates is the grader's");
    assert.match(read("prisma/seed.ts"), /lessons: \["Word roots", "Clinical abbreviations", "Terminology in patient scenarios"\]/, "F4b. control: and the seed rows it reads");
    assert.match(read("prisma/seed.ts"), /lessons: \["Plain-language explanations", "Active listening", "Ethical patient conversations"\]/, "F4c. control: both skills");
    const card = stripComments(read("components/app/next-step-card.tsx"));
    const note = card.slice(card.indexOf("export function NextStepNote"));
    assert.ok(note.length > 100 && !/<Link|href|ArrowRight|onClick|hover:/.test(note), "F5. a statement card has no link, arrow, handler or hover");
    assert.match(note, /<Icon className="h-5 w-5" aria-hidden \/>/, "F5b. its icon is decorative; the words carry the meaning");
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    assert.equal(pkg.scripts["hosa-result-next-steps:smoke"], "tsx scripts/hosa-result-next-steps-smoke.ts", "F6. this guard is registered");
  });

  console.log(
    `\nhosa-result-next-steps: ${checks} checks passed. On a graded HOSA test, "Practice weak skills" opens the HOSA lesson the grader's suggestion links, else Medical Terminology practice for a Medical Terminology test, else says nothing is linked yet and links nothing; the flashcard card opens only a deck a flagged area names exactly, else HOSA's own deck list; the speaking card says HOSA has no speaking practice instead of opening /debate; and the retake opens HOSA's generator. Every link on a rendered HOSA result is HOSA-scoped, and a learner whose selected track is DECA gets the same links; known limit, recorded in C': a HOSA deck page itself still follows that learner's selected track. DECA's cards are unchanged.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
