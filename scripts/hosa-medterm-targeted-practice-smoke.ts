/**
 * HOSA Medical Terminology targeted practice — a beginner can practise the word parts the course
 * taught, the room says what is not taught yet, and the word-part module's last lesson lands there.
 *
 * The course's anatomy module added a third choice, "Anatomy from the course", and its physiology
 * module a fourth, "Physiology from the course". This suite keeps owning the word-part choice and the
 * shape every choice shares; scripts/hosa-medterm-anatomy-smoke.ts and
 * scripts/hosa-medterm-physiology-smoke.ts own the other two and prove, question by question, that
 * their lessons teach them.
 *
 * Run with: npm run hosa-medterm-targeted-practice:smoke
 *
 * NO DATABASE CONNECTION, NO PROVIDER, NO WRITES, NO SECRET READ BY THIS SUITE. Deterministic: no
 * assertion depends on the shuffle. The session route is called for real with its auth, rate-limit,
 * registry-spec and database modules replaced through the module cache before it loads; the database
 * stand-in runs the route's transaction callback against in-memory rows, so what the route would
 * create for a targeted request is read back here without a connection. Audit classification: an
 * ENV CARRIER through lib/api (which imports @prisma/client, whose module scope reads <repo>/.env
 * where one exists); nothing here uses a value from it, and no PrismaClient is constructed.
 *
 * WHAT IT PROTECTS (Melo's direct controls, 2026-09-26).
 *   A. The practice choices are names for subsets of the six canonical areas, nothing more: every
 *      area a choice carries is canonical, "all" carries none (the route's every-area path), the
 *      URL value resolves only to a known choice, and a stored selection maps back to the choice it
 *      really is.
 *   B. Which areas the course teaches is read from the lessons, not from area names: the word part
 *      every bank question tests is looked for in the four word-part lessons' text. The word-part
 *      areas are the areas whose parts those lessons name; anatomy and physiology are taught by
 *      their own modules (their own suites); and no lesson of the course names a disease term the
 *      bank tests, so an untaught area cannot be added to the taught list quietly.
 *   C. Module CTA -> targeted word-part practice -> eligible questions from the existing bank: the
 *      word-part module's last lesson links to the word-parts choice, whose areas give the builder a
 *      pool of exactly the word-part areas' questions, and nothing else.
 *   D. The practice page hands the URL value to the room and the room to the engine, which renders
 *      the choices with "taught in the current course" against "not taught yet", preselects the
 *      link's choice, offers the official format only for every area, and starts nothing by itself.
 *   E. The route, called for real: a targeted request creates a session whose stored areas are the
 *      selection and whose items are all bank questions from the selected areas; a one-area request
 *      never includes another area; an omitted selection still draws from more than the taught
 *      areas; an unsupported area is refused before the database is touched; and an unfinished
 *      earlier session is continued with its own areas reported, not the new request's.
 *   F. No new stored model, no mastery or readiness word, and no copy claiming the course covers the
 *      whole bank: the choice module is pure and never loads the bank into the client.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import Module from "node:module";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const REPO = path.resolve(__dirname, "..");
const read = (p: string) => readFileSync(path.join(REPO, p), "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
const decode = (h: string) =>
  h.replace(/&#x27;|&#39;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, "&");
const visible = (h: string) => decode(h).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

let checks = 0;
function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn()).then(() => {
    checks += 1;
    console.log(`  ok  ${name}`);
  });
}

// ---- module stubs, installed BEFORE the route or the page loads -------------------------------------
function stub(relativePath: string, exports: Record<string, unknown>): string {
  const file = require.resolve(path.join(REPO, relativePath));
  const mod = new Module(file);
  mod.filename = file;
  mod.loaded = true;
  mod.exports = exports;
  require.cache[file] = mod;
  return file;
}
const calls: string[] = [];
type Row = Record<string, unknown>;
const db = { sessions: [] as Row[], items: [] as Row[], updates: [] as Row[], touches: [] as string[] };
// An unfinished earlier session the stand-in reports as active, when a check sets one.
let activeSession: Row | null = null;
const tx = {
  $queryRaw: async () => [{ id: "user_smoke" }],
  practiceSession: {
    findMany: async () => [],
    deleteMany: async () => ({ count: 0 }),
    findFirst: async () => activeSession,
    create: async ({ data }: { data: Row }) => {
      const row = { id: `session-${db.sessions.length + 1}`, ...data };
      db.sessions.push(row);
      return row;
    },
    update: async ({ where, data }: { where: Row; data: Row }) => {
      db.updates.push({ where, data });
      return { ...where, ...data };
    }
  },
  practiceSessionItem: {
    create: async ({ data }: { data: Row }) => {
      const row = { id: `item-${db.items.length + 1}`, ...data, selectedOptionId: null, isCorrect: null, answeredAt: null };
      db.items.push(row);
      return row;
    }
  }
};
const prismaStandIn = new Proxy({ $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx) } as Record<string, unknown>, {
  get(target, property) {
    db.touches.push(String(property));
    if (property in target) return target[String(property)];
    throw new Error(`the database client was touched (${String(property)})`);
  }
});
stub("lib/api-auth", {
  requireUser: async () => { calls.push("requireUser"); return { id: "user_smoke", role: "STUDENT", organization: "HOSA" }; },
  clientIp: () => "203.0.113.9"
});
stub("lib/rate-limit", { enforceRateLimit: async () => { calls.push("enforceRateLimit"); } });
stub("lib/competition-specs", { getActiveSpec: async () => { calls.push("getActiveSpec"); return null; } });
stub("lib/prisma", { prisma: prismaStandIn });

// tsconfig jsx=preserve => classic React.createElement, so React must be global before the
// component modules are evaluated. Same harness as hosa-medterm-lessons-smoke.
(globalThis as { React?: unknown }).React = React;

import { buildMedTermSession, isMedTermArea, MEDTERM_AREAS, MEDTERM_BANK } from "../lib/hosa-medterm";
import {
  DEFAULT_MEDTERM_FOCUS,
  HOSA_MEDTERM_FOCUS_ATTRIBUTION,
  HOSA_MEDTERM_FOCUS_PARAM,
  HOSA_MEDTERM_PRACTICE_ROOM,
  HOSA_MEDTERM_ANATOMY_AREAS,
  HOSA_MEDTERM_TAUGHT_AREAS,
  HOSA_MEDTERM_WORD_PART_AREAS,
  MEDTERM_FOCUS_CHOICES,
  isMedTermFocusId,
  medTermContinuedForOtherChoice,
  medTermCoverageLabel,
  medTermFocus,
  medTermFocusForAreas,
  medTermFocusFromParam,
  medTermFocusHref,
  medTermFocusRequestAreas
} from "../lib/hosa-medterm-focus";
import { HOSA_MEDTERM_PRACTICE_ENTRY, hosaCourseEndAction, hosaLessonPracticeLink } from "../lib/education/hosa-medterm-practice";
import { educationLessonsForTrack, getEducationLesson } from "../lib/education/registry";
import { isConceptEducationLessonEntry } from "../lib/education/types";

const AREA_IDS = MEDTERM_AREAS.map((a) => a.id);
const TAUGHT = new Set<string>(HOSA_MEDTERM_TAUGHT_AREAS);
// The areas the word-part module teaches: the word-parts choice's areas, and what section B reads.
const WORD_PARTS = new Set<string>(HOSA_MEDTERM_WORD_PART_AREAS);
const WORD_PART_LESSONS = ["hosa-medical-terminology-basics", "hosa-medical-word-roots", "hosa-medical-suffixes", "hosa-medical-prefixes"];
const byBankId = new Map(MEDTERM_BANK.map((q) => [q.id, q]));
const catalog = MEDTERM_AREAS.map(({ id, label, description }) => ({ id, label, description }));

// The part a bank question tests, read the way hosa-medterm-lessons-smoke reads it: the key of
// "Which root / prefix / suffix ...?", else the first part the question quotes.
const isWhich = (question: string) => /^Which (?:root|prefix|suffix)\b/i.test(question);
const testedPart = (item: (typeof MEDTERM_BANK)[number]) =>
  (isWhich(item.question) ? item.correctAnswer : item.question.match(/'([^']+)'/)?.[1] ?? "").toLowerCase().replace(/\/o$/, "");
const partToken = (part: string) =>
  part.startsWith("-") ? new RegExp(`${part}\\b`, "i")
    : part.endsWith("-") ? new RegExp(`\\b${part}`, "i")
      : new RegExp(`\\b${part}(?:\\/o)?\\b`, "i");

/**
 * Every learner-facing string of the course's lessons, from the registry's own source objects: all of
 * them (`text`), and the word-part module's alone (`wordPartText`).
 */
function courseText(): { text: string; wordPartText: string; lessonIds: string[]; wordPartLessonIds: string[] } {
  const collect = (entries: ReturnType<typeof educationLessonsForTrack>) => {
    const strings: string[] = [];
    const walk = (value: unknown) => {
      if (typeof value === "string") strings.push(value);
      else if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") Object.values(value).forEach(walk);
    };
    for (const entry of entries) {
      assert.ok(isConceptEducationLessonEntry(entry), `${entry.id} is a concept lesson`);
      walk(entry.source);
    }
    return strings.join("\n");
  };
  const lessons = educationLessonsForTrack("HOSA").filter((entry) => entry.courseId === "hosa-medterm-study" && entry.visibility === "learner");
  const wordPartLessons = lessons.filter((entry) => entry.moduleId === medTermFocus("word-parts").moduleId);
  return {
    text: collect(lessons),
    wordPartText: collect(wordPartLessons),
    lessonIds: lessons.map((entry) => entry.id),
    wordPartLessonIds: wordPartLessons.map((entry) => entry.id)
  };
}

async function main() {
  console.log("\nhosa-medterm-targeted-practice:smoke\n");

  // ---- A. the choices are names for canonical areas ------------------------------------------------
  await check("A. the practice choices carry only canonical areas, and the URL value resolves only to a known choice", () => {
    assert.deepEqual(MEDTERM_FOCUS_CHOICES.map((c) => c.id), ["word-parts", "anatomy", "physiology", "all"],
      "A1. exactly four choices: the taught word parts, the taught anatomy, the taught physiology, and everything");
    assert.ok(Object.isFrozen(MEDTERM_FOCUS_CHOICES) && MEDTERM_FOCUS_CHOICES.every((c) => Object.isFrozen(c)), "A1b. frozen");
    for (const area of HOSA_MEDTERM_TAUGHT_AREAS) assert.ok(isMedTermArea(area), `A2. taught area "${area}" is a canonical area`);
    assert.equal(new Set(HOSA_MEDTERM_TAUGHT_AREAS).size, HOSA_MEDTERM_TAUGHT_AREAS.length, "A2b. listed once each");
    assert.ok(HOSA_MEDTERM_TAUGHT_AREAS.length > 0 && HOSA_MEDTERM_TAUGHT_AREAS.length < AREA_IDS.length,
      "A2c. a proper, non-empty subset of the six, so the targeted choices and every area really differ");
    const wordParts = medTermFocus("word-parts");
    const all = medTermFocus("all");
    assert.deepEqual(wordParts.areas, HOSA_MEDTERM_WORD_PART_AREAS, "A3. the word-parts choice is exactly the word-part areas");
    assert.equal(wordParts.taught, true, "A3b. and is marked taught");
    assert.deepEqual(medTermFocus("anatomy").areas, HOSA_MEDTERM_ANATOMY_AREAS, "A3c. the anatomy choice is exactly the anatomy area");
    // Every targeted choice is taught, and together they are the taught areas, each once.
    const targeted = MEDTERM_FOCUS_CHOICES.filter((c) => c.areas !== null);
    assert.ok(targeted.every((c) => c.taught && c.areas!.every((area) => TAUGHT.has(area))), "A3d. every targeted choice is taught, and serves only taught areas");
    assert.deepEqual(targeted.flatMap((c) => c.areas!).sort(), [...TAUGHT].sort(), "A3e. and together they cover each taught area exactly once");
    assert.equal(all.areas, null, "A4. the every-area choice names no areas");
    assert.equal(all.taught, false, "A4b. and is not marked taught");
    assert.deepEqual(medTermFocusRequestAreas("word-parts"), [...HOSA_MEDTERM_WORD_PART_AREAS], "A5. a word-part request carries the word-part areas");
    assert.notEqual(medTermFocusRequestAreas("word-parts"), HOSA_MEDTERM_WORD_PART_AREAS, "A5b. as a copy, never the frozen list itself");
    assert.equal(medTermFocusRequestAreas("all"), undefined, "A5c. and the every-area request omits areas, the route's existing path");
    assert.equal(DEFAULT_MEDTERM_FOCUS, "all", "A6. with nothing preselected the room offers every area, as before");
    // The URL value: only a known id, exactly spelt, as a single value.
    assert.equal(medTermFocusFromParam("word-parts"), "word-parts", "A7. the course's value preselects the word parts");
    assert.equal(medTermFocusFromParam("all"), "all", "A7b. and the every-area value resolves");
    for (const bogus of ["Word-Parts", "word-parts ", "", "Anatomy", "Physiology", "pathophysiology", "prefixes", "hosa-medical-terminology", undefined, null, ["word-parts"], ["word-parts", "all"]]) {
      assert.equal(medTermFocusFromParam(bogus as string), null, `A8. ${JSON.stringify(bogus)} preselects nothing`);
      assert.equal(isMedTermFocusId(bogus), false, `A8b. and is not a choice`);
    }
    assert.equal(isMedTermFocusId(42), false, "A8c. a non-string is never a choice");
    assert.throws(() => medTermFocus("pathophysiology" as never), /unknown Medical Terminology practice choice/, "A8d. an unknown id fails closed");
    // A stored selection maps back to the choice it really is, in any order, and to none otherwise.
    assert.equal(medTermFocusForAreas([]), "all", "A9. no stored areas is the every-area session");
    assert.equal(medTermFocusForAreas([...HOSA_MEDTERM_WORD_PART_AREAS].reverse()), "word-parts", "A9b. the word-part set, in any order, is the word-parts choice");
    assert.equal(medTermFocusForAreas(["word-roots"]), null, "A9c. one word-part area alone is not the word-parts choice");
    assert.equal(medTermFocusForAreas([...HOSA_MEDTERM_WORD_PART_AREAS, "pathophysiology"]), null, "A9d. the word-part set plus an untaught area is not it either");
    assert.equal(medTermFocusForAreas([...HOSA_MEDTERM_WORD_PART_AREAS, "physiology"]), null, "A9d1. nor plus another taught area");
    assert.equal(medTermFocusForAreas([...HOSA_MEDTERM_TAUGHT_AREAS]), null, "A9d2. nor is every taught area together, which no choice offers");
    assert.equal(medTermFocusForAreas(["anatomy"]), "anatomy", "A9d3. the anatomy area alone is the anatomy choice");
    assert.equal(medTermFocusForAreas(["physiology"]), "physiology", "A9d4. the physiology area alone is the physiology choice");
    assert.equal(medTermFocusForAreas(["anatomy", "physiology", "pathophysiology"]), null, "A9e. nor is the non-word-part half");
    assert.equal(medTermFocusHref("word-parts"), `${HOSA_MEDTERM_PRACTICE_ROOM}?${HOSA_MEDTERM_FOCUS_PARAM}=word-parts`, "A10. the preselecting link is the room plus the value");
    // What an issued session is called, and when a continued session must be flagged: decided here, not in the engine.
    const labelOf = (id: string) => catalog.find((a) => a.id === id)?.label ?? id;
    assert.equal(medTermCoverageLabel([], labelOf), "All Medical Terminology", "A11. an every-area session is named by its choice");
    assert.equal(medTermCoverageLabel([...HOSA_MEDTERM_WORD_PART_AREAS].reverse(), labelOf), "Word parts from the course", "A11b. and so is a word-part session, in any order");
    assert.equal(medTermCoverageLabel(["anatomy"], labelOf), "Anatomy from the course", "A11b2. and an anatomy session");
    assert.equal(medTermCoverageLabel(["physiology"], labelOf), "Physiology from the course", "A11b3. and a physiology session");
    assert.equal(medTermCoverageLabel(["pathophysiology"], labelOf), "Pathophysiology", "A11c. one other area is named by its label");
    assert.equal(medTermCoverageLabel(["anatomy", "physiology", "anatomy"], labelOf), "Anatomy and Physiology", "A11d. several are listed once each, in words");
    assert.equal(medTermContinuedForOtherChoice(true, [], "word-parts"), true, "A12. an every-area session continued under the word-parts choice is flagged");
    assert.equal(medTermContinuedForOtherChoice(true, [...HOSA_MEDTERM_WORD_PART_AREAS], "word-parts"), false, "A12b. a word-part session continued under the same choice is not");
    assert.equal(medTermContinuedForOtherChoice(true, ["anatomy"], "word-parts"), true, "A12b2. an anatomy session continued under the word-parts choice is flagged");
    assert.equal(medTermContinuedForOtherChoice(true, [], "all"), false, "A12c. nor an every-area session under the every-area choice");
    assert.equal(medTermContinuedForOtherChoice(false, [], "word-parts"), false, "A12d. and a new session is never flagged");
  });

  // ---- B. which areas the course teaches, read from the lessons -----------------------------------
  const course = courseText();
  const taughtShare = new Map<string, { mentioned: number; quoted: number; total: number }>();
  let taughtWordPartQuestions = 0;
  await check("B. the word-part areas are the areas whose tested word parts the four word-part lessons name; no lesson names a physiology or disease term", () => {
    assert.deepEqual(course.wordPartLessonIds, WORD_PART_LESSONS, "B0. control: the four published word-part lessons were read");
    assert.deepEqual(course.lessonIds.slice(0, 4), WORD_PART_LESSONS, "B0a. and they open the course, before the anatomy module's lessons");
    assert.ok(course.lessonIds.length > WORD_PART_LESSONS.length, "B0a2. control: the anatomy lessons were read too, for B3");
    assert.ok(course.wordPartText.length > 20_000 && course.text.length > course.wordPartText.length,
      `B0b. control: their text was really collected (${course.wordPartText.length} and ${course.text.length} characters)`);
    for (const area of AREA_IDS) {
      const questions = MEDTERM_BANK.filter((q) => q.area === area);
      assert.equal(questions.length, 30, `B1. control: ${area} has 30 bank questions`);
      let mentioned = 0;
      let quoted = 0;
      for (const q of questions) {
        const part = testedPart(q);
        if (!part) continue;
        quoted += 1;
        // Word-part areas are read against the word-part lessons; every other area against the whole course.
        if (partToken(part).test(WORD_PARTS.has(area) ? course.wordPartText : course.text)) mentioned += 1;
      }
      taughtShare.set(area, { mentioned, quoted, total: questions.length });
      if (WORD_PARTS.has(area)) {
        assert.equal(quoted, questions.length, `B2. every ${area} question tests a quoted word part`);
        assert.ok(mentioned >= questions.length / 2,
          `B2b. the lessons name most of the parts ${area} tests (${mentioned} of ${questions.length}), so it is taught`);
        taughtWordPartQuestions += mentioned;
      } else if (TAUGHT.has(area)) {
        // Anatomy and physiology questions ask about structures and functions, not quoted word parts,
        // so a part scan cannot read them. scripts/hosa-medterm-anatomy-smoke.ts and
        // scripts/hosa-medterm-physiology-smoke.ts prove, question by question, that their modules teach each one.
        assert.ok(area === "anatomy" || area === "physiology", `B2c. the only taught areas outside the word parts are anatomy and physiology (${area})`);
        assert.equal(medTermFocus(area).moduleId, `hosa-medterm-${area}`, `B2d. and the ${area} choice names the module that teaches it`);
      } else {
        assert.equal(mentioned, 0,
          `B3. no lesson of the course names a term ${area} tests (${mentioned} of ${quoted} quoted), so it is NOT taught yet`);
      }
    }
    // The bank's word-part questions that use a part the lessons name: the lessons suite derives the
    // same 71 by meaning (its GLOSSES against NOT_TAUGHT), so the two readings agree. Melo's
    // non-regression list pins 71 taught/tested aligned word parts.
    assert.equal(taughtWordPartQuestions, 71, `B4. 71 word-part questions use a part the lessons name (found ${taughtWordPartQuestions})`);
    const untaughtWordPartQuestions = [...WORD_PARTS].reduce((sum, area) => sum + (30 - taughtShare.get(area)!.mentioned), 0);
    assert.equal(untaughtWordPartQuestions, 19, `B4b. and 19 use a part no lesson names yet (found ${untaughtWordPartQuestions})`);
    // Non-vacuity: the scan sees a part when a lesson names it, and not when it merely shares letters.
    assert.ok(partToken("nephr").test("'Nephr' means kidney") && !partToken("nephr").test("nephrology"), "B5. control: a root is matched whole");
    assert.ok(partToken("-itis").test("the suffix -itis (inflammation)") && !partToken("-itis").test("arthritis"), "B5b. control: a suffix is matched as a part");
    assert.ok(partToken("peri-").test("peri- means around") && !partToken("peri-").test("pericardium"), "B5c. control: a prefix is matched as a part");
    assert.equal(partToken("-centesis").test(course.wordPartText), false, "B5d. control: a part the lessons do not teach is really absent (-centesis)");
    assert.equal(partToken("cardi").test(course.wordPartText), true, "B5e. control: a part they do teach is really present (cardi)");
    assert.ok(MEDTERM_BANK.filter((q) => q.area === "physiology" || q.area === "pathophysiology").some((q) => testedPart(q)),
      "B5f. control: some physiology or disease questions quote a term, so B3 reads something");
  });

  // ---- C. module CTA -> targeted word-part practice -> eligible questions from the bank ------------
  await check("C. the word-part module's last lesson links to practice of the taught word parts, whose pool is exactly their bank questions", () => {
    const action = hosaLessonPracticeLink("hosa-medical-prefixes");
    assert.ok(action, "C1. the word-part module's last lesson has the onward step");
    assert.equal(action!.href, HOSA_MEDTERM_PRACTICE_ENTRY.href, "C1b. which is the word-part practice entry");
    assert.equal(hosaCourseEndAction("hosa-medical-prefixes"), null, "C1b2. beside its next lesson, not as the course's end, which is now later in the course");
    assert.equal(hosaCourseEndAction("hosa-medical-word-roots"), null, "C1c. and an earlier lesson has no course-end action");
    const target = new URL(action!.href, "http://localhost");
    assert.equal(target.pathname, HOSA_MEDTERM_PRACTICE_ROOM, "C2. the link opens the practice room");
    const focus = medTermFocusFromParam(target.searchParams.get(HOSA_MEDTERM_FOCUS_PARAM) ?? undefined);
    assert.equal(focus, "word-parts", "C2b. with the word parts from the course preselected");
    assert.equal(medTermFocus(focus!).taught, true, "C2c. which is a taught choice, never untaught-only practice");
    const areas = medTermFocusRequestAreas(focus!);
    assert.ok(areas && areas.length > 0, "C3. the choice gives the request its areas");
    assert.ok(areas!.every((area) => WORD_PARTS.has(area)), "C3b. all of them word-part areas");
    // The eligible pool, through the same builder the route calls.
    const pool = buildMedTermSession(90, areas);
    assert.equal(new Set(pool.map((q) => q.id)).size, 90, "C4. the eligible pool is the 90 word-part questions");
    assert.ok(pool.every((q) => WORD_PARTS.has(q.area) && byBankId.get(q.id)?.area === q.area), "C4b. every one a bank question from a word-part area");
    assert.deepEqual([...new Set(pool.map((q) => q.area))].sort(), [...WORD_PARTS].sort(), "C4c. and every word-part area is reachable");
    const session = buildMedTermSession(20, areas);
    assert.equal(session.length, 20, "C5. a 20-question targeted session serves 20");
    assert.equal(new Set(session.map((q) => q.id)).size, 20, "C5b. distinct");
    assert.ok(session.every((q) => WORD_PARTS.has(q.area)), "C5c. and none from an area the choice did not select");
    for (const area of AREA_IDS.filter((id) => !WORD_PARTS.has(id))) {
      assert.ok(!pool.some((q) => q.area === area), `C6. the word-part pool holds no ${area} question`);
    }
    assert.equal(new Set(buildMedTermSession(180).map((q) => q.id)).size, 180, "C7. control: with no selection the pool is the whole bank of 180");
  });

  // ---- D. the page, the room and the engine ---------------------------------------------------------
  await check("D. the practice page hands the choice to the engine, which shows taught against not taught and starts nothing", async () => {
    const { HosaEventPrep } = require("../components/training/hosa-event-prep") as { HosaEventPrep: (props: { focus?: string | null }) => Promise<React.ReactElement> };
    const { HosaMedTermEngine, sessionTimeLimitSeconds, preselectionNote } = require("../components/training/hosa-medterm-engine") as {
      HosaMedTermEngine: React.FunctionComponent<Record<string, unknown>>;
      sessionTimeLimitSeconds: (input: { timed: boolean; official: boolean; everyArea: boolean; issuedCount: number }) => number;
      preselectionNote: (initialFocus: string | null, focus: string) => string | null;
    };
    const TrackPracticePage = require("../app/(app)/training/[track]/practice/page").default as
      (props: { params: { track: string }; searchParams?: Record<string, string | string[] | undefined> }) => Promise<React.ReactElement>;
    // Walks a React element tree (without rendering) for the first element of a type.
    const find = (node: unknown, type: unknown): React.ReactElement | null => {
      if (!node || typeof node !== "object") return null;
      if (Array.isArray(node)) { for (const child of node) { const hit = find(child, type); if (hit) return hit; } return null; }
      const el = node as React.ReactElement<{ children?: unknown }>;
      if (el.type === type) return el;
      return find(el.props?.children, type);
    };
    // D1. the page reads the URL value and hands it to the room; an unknown value hands nothing.
    for (const [param, expected] of [["word-parts", "word-parts"], ["anatomy", "anatomy"], ["physiology", "physiology"], ["all", "all"], ["pathophysiology", null], [undefined, null], [["word-parts", "all"], null]] as const) {
      const page = await TrackPracticePage({ params: { track: "hosa" }, searchParams: { focus: param as string } });
      const room = find(page, HosaEventPrep);
      assert.ok(room, `D1. the HOSA practice page mounts the room (focus=${JSON.stringify(param)})`);
      assert.equal(room!.props.focus, expected, `D1b. and hands it ${JSON.stringify(expected)} for focus=${JSON.stringify(param)}`);
    }
    // D2. the room hands the engine the canonical areas from the server, and the choice, and starts nothing.
    const room = await HosaEventPrep({ focus: "word-parts" });
    const engine = find(room, HosaMedTermEngine);
    assert.ok(engine, "D2. the room mounts the engine");
    assert.equal(engine!.props.initialFocus, "word-parts", "D2b. with the link's choice preselected");
    assert.deepEqual(engine!.props.areas, catalog.map((area) => ({ ...area, questionCount: 30 })),
      "D2c. and the six canonical areas, labels, descriptions and question counts, from the server");
    assert.equal(engine!.props.official, false, "D2d. control: with no registry spec the room is generic practice");
    assert.deepEqual(calls.filter((c) => c === "getActiveSpec"), ["getActiveSpec"], "D2e. control: the room read the (stubbed) spec once");
    calls.length = 0;
    // D3. the engine's setup screen, rendered as the learner arriving from the course sees it.
    const fromCourse = decode(renderToStaticMarkup(React.createElement(HosaMedTermEngine, { official: true, areas: catalog, initialFocus: "word-parts" })));
    const text = visible(fromCourse);
    const radios = [...fromCourse.matchAll(/<input[^>]*type="radio"[^>]*>/g)].map((m) => m[0]);
    assert.equal(radios.length, 4, "D3. four choices, as radio buttons in one group");
    assert.ok(radios.every((r) => r.includes('name="medterm-practice-choice"')), "D3b. in one group");
    const checked = radios.filter((r) => /\bchecked\b/.test(r));
    assert.equal(checked.length, 1, "D3c. exactly one is selected");
    assert.ok(checked[0].includes('value="word-parts"'), "D3d. the word parts from the course, as the link asked");
    assert.ok(text.includes("What do you want to practise?"), "D4. the question a beginner is asked");
    assert.ok(text.includes("Word parts from the course") && text.includes("Anatomy from the course") && text.includes("Physiology from the course") &&
      text.includes("All Medical Terminology"), "D4b. all four choices by name");
    assert.ok(text.includes("Taught in the current course"), "D4c. the taught marker");
    assert.ok(text.includes("Includes topics not taught yet"), "D4d. and the not-taught marker");
    for (const area of catalog) {
      const expected = TAUGHT.has(area.id) ? area.label : `${area.label} (not taught yet)`;
      assert.ok(text.includes(expected), `D4e. "${expected}" is listed as what the learner will see`);
    }
    assert.ok(text.includes(`You will see: ${catalog.filter((a) => WORD_PARTS.has(a.id)).map((a) => a.label).join(", ")}.`),
      "D4f. the word-parts choice lists exactly the word-part areas");
    assert.ok(text.includes("no lessons on disease (pathophysiology) yet"), "D4g. the every-area choice says what is not taught yet, before the learner starts");
    assert.ok(!text.includes("no lessons on anatomy") && !text.includes("no lessons on physiology"), "D4g2. and no longer says anatomy or physiology is untaught");
    assert.ok(text.includes("Some use word parts the lessons have not taught yet"), "D4h. and the word-parts choice says some parts are not taught yet");
    assert.ok(text.includes(HOSA_MEDTERM_FOCUS_ATTRIBUTION) && /not an official HOSA category/.test(text), "D4i. the grouping is attributed to CompeteReady, not to HOSA");
    assert.ok(text.includes("The link you followed preselected Word parts from the course"), "D5. the learner is told the link preselected it");
    for (const r of radios) {
      const id = r.match(/aria-labelledby="([^"]+)"/)?.[1] ?? "";
      assert.ok(id && fromCourse.includes(`id="${id}"`), "D5c. each radio is named by the choice's own name element");
      for (const described of (r.match(/aria-describedby="([^"]+)"/)?.[1] ?? "").split(" ")) {
        assert.ok(described && fromCourse.includes(`id="${described}"`), `D5d. and described by an element that exists (${described})`);
      }
    }
    assert.ok(!/role="status"/.test(fromCourse), "D5e. no static note claims to be a live status region");
    assert.ok(!/50 questions \(official\)/.test(text) && / 10 questions/.test(text), "D5f. a targeted arrival defaults to 10 questions and labels none of them official");
    assert.ok(text.includes("Nothing starts until you press start"), "D5b. and that nothing has started");
    // The note follows the CURRENT choice: once the learner picks something else it goes, so it never describes a choice no longer selected.
    assert.ok((preselectionNote("word-parts", "word-parts") ?? "").includes("preselected Word parts from the course"), "D5g. the note names the preselected choice while it is still selected");
    assert.equal(preselectionNote("word-parts", "all"), null, "D5g2. and goes once the learner has chosen something else");
    assert.equal(preselectionNote("all", "all"), "The link you followed preselected All Medical Terminology. Change it below if you want something else. Nothing starts until you press start.", "D5g3. a link preselecting every area is named the same way");
    assert.equal(preselectionNote(null, "all"), null, "D5g4. with nothing preselected there is no note");
    assert.equal(preselectionNote(null, "word-parts"), null, "D5g5. whatever the learner then chooses");
    assert.ok(!text.includes("Match official format"), "D6. the official format is not offered for a targeted session");
    assert.ok(text.includes("is offered for All Medical Terminology only"), "D6b. and the learner is told so, as what CompeteReady offers, not as a claim about the test's content");
    assert.ok(!/official (?:written )?test covers/i.test(text), "D6c. nothing states what the official test covers");
    assert.ok(/Start timed practice/.test(text), "D7. the start button is there to press");
    assert.ok(!/Question 1 of/.test(text), "D7b. and no question is on screen: nothing started");
    // D8. arriving with nothing preselected: the room's default, every area, and the official format offered.
    const plain = visible(renderToStaticMarkup(React.createElement(HosaMedTermEngine, { official: true, areas: catalog, initialFocus: null })));
    const plainHtml = renderToStaticMarkup(React.createElement(HosaMedTermEngine, { official: true, areas: catalog }));
    const plainChecked = [...plainHtml.matchAll(/<input[^>]*type="radio"[^>]*>/g)].map((m) => m[0]).filter((r) => /\bchecked\b/.test(r));
    assert.ok(plainChecked.length === 1 && plainChecked[0].includes('value="all"'), "D8. with nothing preselected, every area is selected, as the room always offered");
    // The note's own words, taken from the helper so this pin follows the copy; D5 proves the same words ARE shown on the from-course arrival.
    const notePrefix = (preselectionNote("all", "all") ?? "").split(" All Medical Terminology")[0];
    assert.ok(notePrefix === "The link you followed preselected" && text.includes(notePrefix), "D8b0. the note's words are known and shown when a link preselected a choice");
    assert.ok(!plain.includes(notePrefix) && !/preselected/i.test(plain), "D8b. and no link note is shown when nothing was preselected");
    assert.ok(plain.includes("Match official format") && plain.includes("50 questions (official)"), "D8c. the official format is offered and labelled for every area");
    assert.ok(plain.includes("Includes topics not taught yet") && plain.includes("Pathophysiology (not taught yet)"), "D8d. and the not-taught disclosure is still there");
    assert.ok(!plain.includes("Anatomy (not taught yet)") && !plain.includes("Physiology (not taught yet)"), "D8d2. and marks anatomy and physiology taught now");
    const generic = visible(renderToStaticMarkup(React.createElement(HosaMedTermEngine, { official: false, areas: catalog, initialFocus: "all" })));
    assert.ok(!generic.includes("Match official format") && !generic.includes("is offered for All Medical Terminology only"), "D8e. control: generic practice offers no official format either way");
    // D9. the engine never starts a session on its own and never hand-lists an area.
    const engineSrc = stripComments(read("components/training/hosa-medterm-engine.tsx"));
    assert.equal((engineSrc.match(/\bstartSession\(\)/g) ?? []).length, 1, "D9. startSession is declared once and called from nowhere but the button");
    assert.ok(engineSrc.includes("onClick={startSession}"), "D9b. the start button is that call");
    // Every effect body (from `useEffect(` to its dependency list) is free of the start call and of the
    // start endpoint, and the endpoint is named once, inside startSession, which only the button calls.
    const effects = [...engineSrc.matchAll(/useEffect\(/g)].map((m) => {
      const end = engineSrc.indexOf("}, [", m.index ?? 0);
      return engineSrc.slice(m.index ?? 0, end < 0 ? undefined : end);
    });
    assert.ok(effects.length >= 2, `D9c. control: the engine's effects were found (${effects.length})`);
    for (const body of effects) assert.ok(!/startSession|\/api\/hosa\/medterm\/session/.test(body), "D9c2. no effect starts a session or posts to the start endpoint");
    const fnAt = engineSrc.indexOf("async function startSession()");
    assert.ok(fnAt >= 0, "D9c3. control: startSession is declared");
    let depth = 0;
    let fnEnd = -1;
    for (let i = engineSrc.indexOf("{", fnAt); i < engineSrc.length; i += 1) {
      if (engineSrc[i] === "{") depth += 1;
      else if (engineSrc[i] === "}") { depth -= 1; if (depth === 0) { fnEnd = i; break; } }
    }
    const fnBody = engineSrc.slice(fnAt, fnEnd + 1);
    assert.equal((engineSrc.match(/\/api\/hosa\/medterm\/session"/g) ?? []).length, 1, "D9c4. the start endpoint is named exactly once in the engine");
    assert.ok(fnBody.includes('"/api/hosa/medterm/session"'), "D9c5. inside startSession");
    // Non-vacuity: the effect scan sees an ordinary auto-start.
    assert.ok(/startSession|\/api\/hosa\/medterm\/session/.test("useEffect(() => { startSession(); }, [])".slice(0, "useEffect(() => { startSession(); }, [])".indexOf("}, ["))),
      "D9c6. control: an auto-start effect would be caught");
    assert.ok(!/areas:\s*\[\s*"/.test(engineSrc) && !engineSrc.includes('"word-roots"'), "D9d. the engine hand-lists no area id: the choice module and the server own the list");
    assert.ok(engineSrc.includes("setResumedElsewhere(medTermContinuedForOtherChoice(Boolean(data.resumed), issuedAreas, focus))"),
      "D9e. a continued session issued for another choice is flagged by the decision A12 proves");
    assert.ok(engineSrc.includes("const sessionCoverageLabel = medTermCoverageLabel(sessionAreas, areaLabel);") &&
      engineSrc.includes("<Badge variant=\"secondary\">{sessionCoverageLabel}</Badge>"),
      "D9e2. and the question screen names the issued session by the label A11 proves");
    assert.ok(engineSrc.includes("This continues a session you started earlier and did not finish, covering {sessionCoverageLabel}"), "D9f. in the learner's words");
    assert.ok(engineSrc.includes('const officialFormat = official && focus === "all";'), "D9g. the official format is offered only for the every-area choice");
    assert.ok(engineSrc.includes("const preselection = preselectionNote(initialFocus, focus);") &&
      engineSrc.includes("{preselection ? <p className=\"rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground\">{preselection}</p> : null}"),
      "D9g2. the setup screen shows exactly the note D5g proves, from the current choice");
    // The timer: from the issued session's length, official minutes only for an official every-area session of the official length.
    assert.equal(sessionTimeLimitSeconds({ timed: true, official: true, everyArea: true, issuedCount: 50 }), 60 * 60, "D9h. an official every-area 50-question session gets the official 60 minutes");
    assert.equal(sessionTimeLimitSeconds({ timed: true, official: true, everyArea: false, issuedCount: 50 }), 60 * 60, "D9h2. a targeted 50-question session gets 60 minutes from the per-question rate, not as the official format");
    assert.equal(sessionTimeLimitSeconds({ timed: true, official: true, everyArea: true, issuedCount: 10 }), 12 * 60, "D9h3. ten questions get twelve minutes");
    assert.equal(sessionTimeLimitSeconds({ timed: true, official: false, everyArea: true, issuedCount: 50 }), 60 * 60, "D9h4. generic practice never claims the official timer, and 50 questions still get 60 minutes");
    assert.equal(sessionTimeLimitSeconds({ timed: false, official: true, everyArea: true, issuedCount: 50 }), 0, "D9h5. untimed practice has no limit");
    assert.equal(sessionTimeLimitSeconds({ timed: true, official: true, everyArea: true, issuedCount: 0 }), 0, "D9h6. and nothing is timed before a session is issued");
    assert.ok(engineSrc.includes("issuedCount: order.length || count"), "D9h7. the engine times the ISSUED session's length, so a continued session keeps its own time");
    const pageSrc = stripComments(read("app/(app)/training/[track]/practice/page.tsx"));
    assert.ok(pageSrc.includes("medTermFocusFromParam(searchParams?.[HOSA_MEDTERM_FOCUS_PARAM])"), "D10. the page resolves the URL value through the choice module");
    const prepSrc = stripComments(read("components/training/hosa-event-prep.tsx"));
    assert.ok(/MEDTERM_AREAS\.map\(\(\{ id, label, description \}\) => \(\{\s*id,\s*label,\s*description,\s*questionCount: MEDTERM_BANK\.filter\(\(question\) => question\.area === id\)\.length\s*\}\)\)/.test(prepSrc),
      "D10b. the room hands the engine only id, label, description and question count of each area, never a question");
  });

  // ---- E. the route, for real -----------------------------------------------------------------------
  await check("E. the route issues a targeted session from the selected areas only, keeps the every-area path, refuses an unsupported area, and reports a continued session's own areas", async () => {
    const { POST } = require("../app/api/hosa/medterm/session/route") as { POST: (request: Request) => Promise<Response> };
    type Started = { sessionId?: string; resumed?: boolean; requestedAreas?: string[]; items?: Array<Record<string, unknown>>; order?: string[]; error?: string };
    const post = async (body: unknown) => {
      calls.length = 0;
      db.touches.length = 0;
      const response = await POST(new Request("http://localhost/api/hosa/medterm/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      }));
      return { status: response.status, json: (await response.json()) as Started };
    };
    const itemAreas = (json: Started) => (json.items ?? []).map((item) => byBankId.get(String(item.bankQuestionId))?.area ?? "NOT-IN-BANK");

    // E1. the request the course's link leads to.
    const targeted = await post({ count: 20, areas: medTermFocusRequestAreas("word-parts") });
    assert.equal(targeted.status, 200, `E1. a targeted request is served (${targeted.json.error ?? ""})`);
    assert.deepEqual(calls, ["requireUser", "enforceRateLimit", "getActiveSpec"], "E1b. after auth, rate limiting and the spec read");
    assert.deepEqual(db.touches, ["$transaction"], "E1c. inside one transaction");
    assert.equal(targeted.json.resumed, false, "E1d. as a new session");
    assert.deepEqual(targeted.json.requestedAreas, [...HOSA_MEDTERM_WORD_PART_AREAS], "E2. the response names the areas it was issued for");
    assert.deepEqual(db.sessions.at(-1)?.requestedAreas, [...HOSA_MEDTERM_WORD_PART_AREAS], "E2b. and so does the stored session");
    assert.equal(targeted.json.items?.length, 20, "E3. twenty items");
    assert.equal(new Set(targeted.json.order).size, 20, "E3b. in a twenty-long order without repeats");
    assert.ok(itemAreas(targeted.json).every((area) => WORD_PARTS.has(area)), "E3c. every one a bank question from a selected area, none from an unselected one");
    assert.ok(db.items.slice(-20).every((item) => WORD_PARTS.has(String(item.area)) && byBankId.has(String(item.bankQuestionId))), "E3d. as stored");
    for (const item of targeted.json.items ?? []) {
      assert.ok(!("correctAnswer" in item) && !("explanation" in item) && !("correctOptionId" in item), "E3e. and no answer key leaves the server for an unanswered item");
    }
    // E4. a one-area request never includes another area.
    const single = await post({ count: 10, areas: ["word-roots"] });
    assert.equal(single.status, 200, "E4. a one-area request is served");
    assert.deepEqual(single.json.requestedAreas, ["word-roots"], "E4b. for that area");
    assert.ok(itemAreas(single.json).every((area) => area === "word-roots") && single.json.items?.length === 10, "E4c. and every item is from it");
    // E5. an omitted selection is still the every-area path, and it draws from more than the taught areas.
    const every = await post({ count: 100 });
    assert.equal(every.status, 200, "E5. an omitted selection is served");
    assert.deepEqual(every.json.requestedAreas, [], "E5b. stored and reported as no selection: every area");
    assert.equal(new Set(every.json.order).size, 100, "E5c. 100 distinct questions, more than the 90 word-part questions, so the pool is wider than the taught areas");
    assert.ok(itemAreas(every.json).every((area) => AREA_IDS.includes(area as never)), "E5d. all from the bank");
    // E6. an unsupported area is refused before the database is touched.
    const before = db.sessions.length;
    for (const [label, body] of [
      ["an untaught area beside an unsupported one", { count: 10, areas: ["pathophysiology", "not-an-area"] }],
      ["a choice id used as an area", { count: 10, areas: ["word-parts"] }],
      ["an empty selection", { count: 10, areas: [] }]
    ] as const) {
      const refused = await post(body);
      assert.equal(refused.status, 400, `E6. ${label} is refused with HTTP 400`);
      assert.deepEqual(db.touches, [], `E6b. ${label}: the database was never touched`);
      assert.deepEqual(calls, ["requireUser", "enforceRateLimit"], `E6c. ${label}: after auth and rate limiting, before the spec read`);
    }
    assert.equal(db.sessions.length, before, "E6d. and no session was created by any of them");
    // E7. an unfinished earlier session is continued, and reported with ITS areas, not the request's.
    const oldItems = MEDTERM_BANK.filter((q) => q.area === "pathophysiology").slice(0, 2).map((q, index) => ({
      id: `old-item-${index + 1}`, bankQuestionId: q.id, displayOrder: index, promptSnapshot: q.question,
      choicesJson: q.choices.map((text, i) => ({ optionId: `old-option-${index}-${i}`, text })),
      correctOptionId: `old-option-${index}-${q.choices.indexOf(q.correctAnswer)}`, explanationSnapshot: q.explanation,
      area: q.area, skillSlug: "hosa-medical-terminology", selectedOptionId: null, isCorrect: null, answeredAt: null
    }));
    activeSession = {
      id: "session-old", kind: "HOSA_MEDTERM", issuedAt: new Date("2026-09-26T10:00:00Z"), expiresAt: new Date("2026-09-27T10:00:00Z"),
      requestedAreas: [], scenarioJson: { version: 1, kind: "DRILL", requestedCount: 2, order: oldItems.map((i) => i.id) }, items: oldItems
    };
    try {
      const continued = await post({ count: 20, areas: medTermFocusRequestAreas("word-parts") });
      assert.equal(continued.status, 200, "E7. the earlier session is continued");
      assert.equal(continued.json.resumed, true, "E7b. and says so");
      assert.equal(continued.json.sessionId, "session-old", "E7c. it is the earlier session");
      assert.deepEqual(continued.json.requestedAreas, [], "E7d. reported with its own areas (every area), not the word parts just asked for");
      assert.equal(medTermFocusForAreas(continued.json.requestedAreas ?? []), "all", "E7e. which the engine names as All Medical Terminology");
      assert.equal(db.sessions.length, before, "E7f. and no new session was created");
      assert.deepEqual(itemAreas(continued.json), ["pathophysiology", "pathophysiology"], "E7g. control: its items are the earlier session's, from an untaught area");
    } finally {
      activeSession = null;
    }
    // E8. the response is built from the stored row, in source.
    const routeSrc = stripComments(read("app/api/hosa/medterm/session/route.ts"));
    assert.ok(routeSrc.includes("requestedAreas: session.requestedAreas") && routeSrc.includes("requestedAreas: active.requestedAreas"),
      "E8. both the new and the continued session report the areas from their own row");
    assert.ok(routeSrc.includes("buildMedTermSession(input.count, requestedAreas)"), "E8b. and the builder is given the validated selection");
  });

  // ---- F. no new model, no false claim, pure ---------------------------------------------------------
  await check("F. no stored model or mastery word was added, the course claims no coverage it lacks, and the choice module never loads the bank", () => {
    const focusSrc = stripComments(read("lib/hosa-medterm-focus.ts"));
    for (const banned of ["@/lib/prisma", "prisma.", "fetch(", "process.env", "localStorage", "MasteryProgress", "recordPracticeOutcome",
                          "readiness", "Readiness", "competition-ready", "@/lib/spaced-review"]) {
      assert.ok(!focusSrc.includes(banned), `F1. the choice module contains no ${banned}`);
    }
    assert.ok(!/\bXP\b|xpReward|awardXp|XPLog|xpLog/.test(focusSrc), "F1a. and no XP semantics");
    assert.match(focusSrc, /^import type \{ MedTermArea \} from "@\/lib\/hosa-medterm";$/m, "F1b. its only import is the area TYPE");
    assert.equal((focusSrc.match(/^import /gm) ?? []).length, 1, "F1c. and nothing else");
    // Proved, not inferred: requiring the module in a fresh process loads neither the bank nor a database client.
    const probe = `
      require(${JSON.stringify(path.join(REPO, "lib/hosa-medterm-focus.ts"))});
      const loaded = Object.keys(require.cache).filter((f) => /[\\\\/]lib[\\\\/]hosa-medterm\\.ts$|[\\\\/]lib[\\\\/]prisma\\.ts$|@prisma[\\\\/]client|\\.prisma[\\\\/]client/.test(f));
      process.stdout.write(JSON.stringify(loaded));`;
    const loaded = execFileSync(path.join(REPO, "node_modules", ".bin", "tsx"), ["-e", probe], { cwd: REPO, encoding: "utf8", timeout: 60_000 });
    assert.deepEqual(JSON.parse(loaded), [], "F2. in a fresh process the choice module loads neither the question bank nor a database client");
    for (const file of ["components/training/hosa-medterm-engine.tsx", "components/training/hosa-event-prep.tsx", "app/(app)/training/[track]/practice/page.tsx"]) {
      const src = stripComments(read(file));
      for (const banned of ["MasteryProgress", "masteryProgress", "recordDrillMastery", "readiness", "competition-ready", "xpReward", "awardXp", "@/lib/hosa-medterm\"", "MEDTERM_BANK"]) {
        if (file === "components/training/hosa-event-prep.tsx" && banned === "@/lib/hosa-medterm\"") continue; // the SERVER room reads the area list
        if (file === "components/training/hosa-event-prep.tsx" && banned === "MEDTERM_BANK") {
          // The SERVER room counts each area's questions for the engine's length options (D10b pins
          // the expression); it names the bank only in its import and that count, and hands down no question.
          assert.equal((src.match(/\bMEDTERM_BANK\b/g) ?? []).length, 2, `F3. ${file} names MEDTERM_BANK only to import it and count an area's questions`);
          continue;
        }
        assert.ok(!src.includes(banned), `F3. ${file} contains no ${banned}`);
      }
    }
    // The course never claims to cover what it does not.
    // Anatomy and physiology are taught now (their own suites prove it), so only disease stays in the scan.
    const claim = /(?:covers?|teach(?:es)?|includes?)\s+(?:all|every|the whole)\s+(?:of\s+)?(?:medical terminology|(?:the\s+)?(?:practice|question) bank)|(?:covers?|teach(?:es)?)\s+(?:pathophysiology|disease)/i;
    assert.ok(!claim.test(course.text), "F4. no lesson claims to cover all of Medical Terminology, or disease");
    assert.ok(!claim.test(`${HOSA_MEDTERM_PRACTICE_ENTRY.label} ${HOSA_MEDTERM_PRACTICE_ENTRY.detail}`), "F4b. nor does the course's onward step");
    assert.ok(!claim.test(MEDTERM_FOCUS_CHOICES.map((c) => `${c.label} ${c.summary} ${c.coverage} ${c.disclosure}`).join(" ")), "F4c. nor does any choice");
    for (const text of ["This course covers disease.", "The lessons teach all of Medical Terminology.", "It includes the whole question bank."]) {
      assert.ok(claim.test(text), `F4d. control: the scan catches "${text}"`);
    }
    const all = medTermFocus("all");
    assert.match(`${all.coverage} ${all.disclosure}`, /not taught yet/, "F5. the every-area choice says its extra topics are not taught yet");
    assert.match(HOSA_MEDTERM_PRACTICE_ENTRY.detail, /disease has no lessons yet/, "F5b. and the onward step says the same before the learner leaves the lesson");
    const wordParts = medTermFocus("word-parts");
    assert.equal(/have not taught yet/.test(wordParts.disclosure), [...WORD_PARTS].some((area) => taughtShare.get(area)!.mentioned < 30),
      "F5c. the word-parts choice says some parts are untaught exactly while some are");
    for (const choice of MEDTERM_FOCUS_CHOICES) {
      const copy = `${choice.label} ${choice.summary} ${choice.coverage} ${choice.disclosure}`;
      assert.ok(!/record|saved|\bsave\b|mastery|progress|score|readiness|\bready\b/i.test(copy), `F6. the "${choice.id}" copy makes no persistence, mastery or readiness claim`);
      assert.ok(!/word-roots|hosa-medterm|focus=|\bid\b/i.test(copy), `F6b. and shows no implementation identifier`);
    }
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    assert.equal(pkg.scripts["hosa-medterm-targeted-practice:smoke"], "tsx scripts/hosa-medterm-targeted-practice-smoke.ts", "F7. this suite is registered");
  });

  console.log(`\nhosa-medterm-targeted-practice: ${checks} checks passed. A HOSA beginner can practise the word parts the ` +
    "course taught, the anatomy or physiology it taught, or all Medical Terminology, is told what is not taught yet before starting, " +
    "reaches the word-part choice from the word-part module's last lesson, and the route serves a targeted session from " +
    "the selected canonical areas only.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
