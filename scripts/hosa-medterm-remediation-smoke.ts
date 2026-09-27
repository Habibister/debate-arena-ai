/**
 * HOSA Medical Terminology remediation — practice feedback opens the lesson that teaches the weak
 * area, and that lesson leads back to practice.
 *
 * Run with: npm run hosa-medterm-remediation:smoke
 *
 * NO DATABASE CONNECTION, NO PROVIDER, NO WRITES, NO SECRET READ BY THIS SUITE. The submit route is
 * called for real with its auth, rate-limit, registry-spec, review-writer and database modules
 * replaced through the module cache before it loads; the database stand-in runs the route's
 * transaction against an in-memory session, so the weak areas the learner sees are the ones the
 * route computes from stored answers. Audit classification: an ENV CARRIER through lib/api (which
 * imports @prisma/client, whose module scope reads <repo>/.env where one exists); nothing here uses a
 * value from it, and no PrismaClient is constructed.
 *
 * THE CONTRACT (Melo's direct controls, 2026-09-26), for every remediation action:
 *   WEAK AREA -> ACTUAL EVIDENCE -> PUBLISHED TEACHING OWNER -> CORRECT LESSON -> TARGETED PRACTICE RETURN
 *   A. Which lesson teaches which area is read from the lessons, not from names: the word part every
 *      bank question tests is looked for in each lesson's text, and the owner is the one lesson that
 *      names most of that area's parts. The declared owners equal that reading. Anatomy's reading
 *      lands on the first anatomy lesson (the anatomy questions that quote a term quote direction
 *      words), which is where its module starts; scripts/hosa-medterm-anatomy-smoke.ts proves the
 *      module teaches every anatomy question. Physiology questions quote no term, so the reading
 *      cannot place them; their owner is where the physiology module starts, and
 *      scripts/hosa-medterm-physiology-smoke.ts proves that module teaches every physiology question.
 *      The pathophysiology questions that quote a term quote one or two per lesson across the whole
 *      pathophysiology module, so the reading names no single lesson; its owner is where that module
 *      starts, and scripts/hosa-medterm-pathophysiology-smoke.ts proves the module teaches every
 *      pathophysiology question. Every canonical area has an owner now.
 *   B. The resolver: word roots, prefixes and suffixes each resolve to their own lesson, and anatomy,
 *      physiology and pathophysiology to their modules' first lessons, with a label naming the same
 *      area and lesson; an area outside the bank's six gets the plain no-lesson statement at most,
 *      never a lesson; and a broken link anywhere in the chain (owner held, moved track, return
 *      withdrawn) closes the whole action rather than falling back to anything.
 *   C. ACTUAL EVIDENCE: a session is submitted through the real route; its weak areas render in the
 *      results with each area's own action, a no-lesson statement rendered plainly when the server
 *      resolves one (a planted control, since every real area has a lesson now), and no lesson for an
 *      area the server resolved nothing for.
 *   D. The return: each owner lesson links to the practice choice that includes its area (word-part,
 *      anatomy, physiology or pathophysiology practice), whose pool has that area's bank questions; the lesson page
 *      wires it; opening a lesson writes nothing and starts nothing.
 *   E. The old record /skills/hosa-medical-terminology-1 opens the Word Roots lesson instead of
 *      saying there is nothing to read; its untaught siblings keep their honest page.
 *   F. The HOSA hub's practice row opens the Medical Terminology Event HQ, whose page lists the
 *      practice room, instead of looping through /skills; DECA and Debate keep their rows.
 *   G. HOSA test results say "event category", never DECA's "cluster"; DECA's wording is unchanged.
 *   H. No new model, no mastery or readiness word, the client engine imports no curriculum module.
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

// ---- module stubs, installed BEFORE any route or page loads ------------------------------------------
function stub(relativePath: string, exports: Record<string, unknown>): void {
  const file = require.resolve(path.join(REPO, relativePath));
  const mod = new Module(file);
  mod.filename = file;
  mod.loaded = true;
  mod.exports = exports;
  require.cache[file] = mod;
}
type Row = Record<string, unknown>;
const calls: string[] = [];
const db = { updates: [] as Row[], touches: [] as string[] };
let storedSession: Row | null = null;
const tx = {
  $queryRaw: async () => [{ id: "user_smoke" }],
  practiceSession: {
    findFirst: async ({ where }: { where: Row }) =>
      storedSession && storedSession.id === where.id && storedSession.userId === where.userId && storedSession.kind === where.kind
        ? storedSession
        : null,
    update: async ({ where, data }: { where: Row; data: Row }) => {
      db.updates.push({ where, data });
      return { ...where, ...data };
    }
  },
  skill: { findUnique: async () => null }
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
stub("lib/competition-specs", {
  getActiveSpec: async () => null,
  getWeightedScoringRubric: async () => { calls.push("getWeightedScoringRubric"); return null; }
});
stub("lib/spaced-review", {
  recordPracticeOutcomeInTransaction: async () => { throw new Error("the review writer was called"); }
});
stub("lib/prisma", { prisma: prismaStandIn });

// tsconfig jsx=preserve => classic React.createElement, so React must be global before the
// component modules are evaluated. Same harness as the other HOSA suites.
(globalThis as { React?: unknown }).React = React;

import { buildMedTermSession, MEDTERM_AREAS, MEDTERM_BANK } from "../lib/hosa-medterm";
import {
  HOSA_MEDTERM_FOCUS_PARAM,
  HOSA_MEDTERM_TAUGHT_AREAS,
  MEDTERM_FOCUS_CHOICES,
  medTermFocus,
  medTermFocusFromParam,
  medTermFocusHref,
  medTermFocusRequestAreas
} from "../lib/hosa-medterm-focus";
import {
  HOSA_MEDTERM_AREA_TEACHING_OWNERS,
  HOSA_MEDTERM_NO_LESSON_MESSAGE,
  HOSA_MEDTERM_PRACTICE_ENTRY,
  HOSA_MEDTERM_PRACTICE_RETURN,
  HOSA_MEDTERM_STUDY_COURSE,
  hosaCourseEndAction,
  hosaLessonPracticeLink,
  hosaLessonPracticeReturn,
  hosaMedTermRemediation,
  type HosaMedTermRemediation
} from "../lib/education/hosa-medterm-practice";
import { EDUCATION_LESSONS, educationLessonsForTrack, getEducationLesson, getEducationModule } from "../lib/education/registry";
import { isConceptEducationLessonEntry, type EducationRegistryEntry } from "../lib/education/types";
import { CANONICAL_REDIRECTS, resolveSkillsSlug } from "../lib/education/skills-compat";
import {
  HOSA_SEEDED_TOPIC_LESSON,
  practiceWeakSkillsDescription,
  resultNoteForOrganization
} from "../lib/education/test-result-recommendations";

const AREA_IDS = MEDTERM_AREAS.map((a) => a.id);
const LABEL = new Map(MEDTERM_AREAS.map((a) => [a.id as string, a.label]));
const TAUGHT = new Set<string>(HOSA_MEDTERM_TAUGHT_AREAS);
const UNTAUGHT = AREA_IDS.filter((id) => !TAUGHT.has(id));
const EXPECTED_OWNER: Record<string, string> = {
  "word-roots": "hosa-medical-word-roots",
  prefixes: "hosa-medical-prefixes",
  suffixes: "hosa-medical-suffixes",
  // Where the anatomy module starts; the action names the module (hosa-medterm-anatomy-smoke G).
  anatomy: "hosa-anatomy-body-map",
  // Where the physiology module starts; the action names the module (hosa-medterm-physiology-smoke G).
  physiology: "hosa-physiology-staying-in-balance",
  // Where the pathophysiology module starts; the action names the module (hosa-medterm-pathophysiology-smoke G).
  pathophysiology: "hosa-pathophysiology-how-tissue-changes"
};
/** The practice choice that serves an area: word-part, anatomy or physiology practice. */
const choiceFor = (area: string) => {
  const found = MEDTERM_FOCUS_CHOICES.filter((c) => c.areas !== null && c.areas.includes(area as never));
  assert.equal(found.length, 1, `control: exactly one targeted choice serves ${area}`);
  return found[0];
};

// The part a bank question tests, read the way hosa-medterm-lessons-smoke and the targeted suite read
// it: the key of "Which root / prefix / suffix ...?", else the first part the question quotes.
const isWhich = (question: string) => /^Which (?:root|prefix|suffix)\b/i.test(question);
const testedPart = (item: (typeof MEDTERM_BANK)[number]) =>
  (isWhich(item.question) ? item.correctAnswer : item.question.match(/'([^']+)'/)?.[1] ?? "").toLowerCase().replace(/\/o$/, "");
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const partToken = (part: string) =>
  part.startsWith("-") ? new RegExp(`${escape(part)}\\b`, "i")
    : part.endsWith("-") ? new RegExp(`\\b${escape(part)}`, "i")
      : new RegExp(`\\b${escape(part)}(?:\\/o)?\\b`, "i");

function lessonText(entry: EducationRegistryEntry): string {
  const strings: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") strings.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(entry.source);
  return strings.join("\n");
}
const courseLessons = () =>
  educationLessonsForTrack("HOSA").filter((e) => e.courseId === HOSA_MEDTERM_STUDY_COURSE && e.visibility === "learner");

/** For each area: how many of its tested parts each course lesson names. */
function namingCounts(): Map<string, Map<string, number>> {
  const lessons = courseLessons().map((entry) => ({ id: entry.id, text: lessonText(entry) }));
  const out = new Map<string, Map<string, number>>();
  for (const area of AREA_IDS) {
    const parts = [...new Set(MEDTERM_BANK.filter((q) => q.area === area).map(testedPart).filter(Boolean))];
    const perLesson = new Map<string, number>();
    for (const lesson of lessons) perLesson.set(lesson.id, parts.filter((p) => partToken(p).test(lesson.text)).length);
    out.set(area, perLesson);
  }
  return out;
}

/** Temporarily change a registry entry, always restoring it. */
function withEntry(id: string, change: Partial<EducationRegistryEntry>, fn: () => void): void {
  const entry = getEducationLesson(id) as unknown as Record<string, unknown>;
  assert.ok(entry, `control fixture: ${id} is registered`);
  const saved: Record<string, unknown> = {};
  for (const key of Object.keys(change)) saved[key] = entry[key];
  try {
    Object.assign(entry, change);
    fn();
  } finally {
    Object.assign(entry, saved);
  }
}

async function main() {
  console.log("\nhosa-medterm-remediation:smoke\n");

  // ---- A. owners are read from the lessons ----------------------------------------------------------
  await check("A. each taught area's owner is the one lesson that names most of its tested parts; untaught areas have none", () => {
    const counts = namingCounts();
    const derived: Record<string, string> = {};
    for (const area of AREA_IDS) {
      if (area === "pathophysiology") continue; // spread across its module's lessons; placed below
      const perLesson = [...counts.get(area)!.entries()].sort((a, b) => b[1] - a[1]);
      const [best, runnerUp] = perLesson;
      if (best[1] === 0) continue; // no lesson names any of this area's tested terms
      assert.ok(best[1] > (runnerUp?.[1] ?? 0), `A1. ${area}: one lesson clearly names most of its parts (${JSON.stringify(perLesson)})`);
      derived[area] = best[0];
    }
    // Physiology questions quote no term (they ask how the body works), so the part reading cannot
    // place them. Like anatomy, the whole module teaches the area, question by question
    // (hosa-medterm-physiology-smoke C), so its owner is where the module serving it starts.
    assert.ok(!("physiology" in derived) && MEDTERM_BANK.filter((q) => q.area === "physiology").every((q) => !testedPart(q)),
      "A1b. no physiology question quotes a term, so the part reading gives it no owner");
    const physiologyModule = choiceFor("physiology").moduleId;
    const inModule = courseLessons().filter((e) => e.moduleId === physiologyModule);
    const starts = inModule.filter((e) => !inModule.some((other) => other.nextLessonId === e.id));
    assert.equal(starts.length, 1, "A1c. the physiology module has one first lesson");
    derived.physiology = starts[0].id;
    // The pathophysiology questions that quote a term quote disease terms taught one or two per lesson
    // across the pathophysiology module, so no single lesson names most of them. Every lesson that
    // names one is in that module, and, like physiology, the owner is where that module starts
    // (hosa-medterm-pathophysiology-smoke C proves the module teaches each question).
    const pathoModule = choiceFor("pathophysiology").moduleId;
    const pathoNamers = [...counts.get("pathophysiology")!.entries()].filter(([, n]) => n > 0).map(([id]) => id);
    assert.ok(pathoNamers.length > 1, `A1d. the quoted pathophysiology terms are named across several lessons (${pathoNamers.join(", ")})`);
    assert.ok(pathoNamers.every((id) => getEducationLesson(id)?.moduleId === pathoModule),
      "A1e. and only by lessons of the pathophysiology module");
    const pathoLessons = courseLessons().filter((e) => e.moduleId === pathoModule);
    const pathoStarts = pathoLessons.filter((e) => !pathoLessons.some((other) => other.nextLessonId === e.id));
    assert.equal(pathoStarts.length, 1, "A1f. the pathophysiology module has one first lesson");
    derived.pathophysiology = pathoStarts[0].id;
    assert.deepEqual(derived, EXPECTED_OWNER,
      "A2. the reading gives word roots, prefixes and suffixes each their own lesson, and anatomy, physiology and pathophysiology their modules' first lessons");
    assert.deepEqual({ ...HOSA_MEDTERM_AREA_TEACHING_OWNERS }, derived, "A3. the declared owners are exactly that reading");
    assert.deepEqual(UNTAUGHT, [], "A4a. every canonical area is taught now, so none is left without an owner");
    for (const area of UNTAUGHT) {
      assert.ok([...counts.get(area)!.values()].every((n) => n === 0), `A4. no lesson names a ${area} term the bank tests`);
      assert.ok(!(area in HOSA_MEDTERM_AREA_TEACHING_OWNERS), `A4b. so ${area} has no owner`);
    }
    assert.deepEqual(Object.keys(HOSA_MEDTERM_AREA_TEACHING_OWNERS).sort(), [...TAUGHT].sort(), "A5. every taught area has an owner, and only taught areas");
    const owners = Object.values(HOSA_MEDTERM_AREA_TEACHING_OWNERS);
    assert.equal(new Set(owners).size, owners.length, "A6. one lesson per area");
    assert.ok(!owners.includes("hosa-medical-terminology-basics"), "A7. the structure lesson, which names examples of every part, owns none");
    assert.ok(Object.isFrozen(HOSA_MEDTERM_AREA_TEACHING_OWNERS), "A8. frozen");
    // Controls: the reading really separates the lessons. A root weakness sent to the Prefixes lesson,
    // or a prefix weakness sent to Suffixes, would be a lesson that names fewer of those parts.
    const roots = counts.get("word-roots")!;
    const prefixes = counts.get("prefixes")!;
    assert.ok(roots.get("hosa-medical-word-roots")! > roots.get("hosa-medical-prefixes")!, "A9. control: Word Roots names more roots than Prefixes does");
    assert.ok(prefixes.get("hosa-medical-prefixes")! > prefixes.get("hosa-medical-suffixes")!, "A9b. control: Prefixes names more prefixes than Suffixes does");
  });

  // ---- B. the resolver -------------------------------------------------------------------------------
  await check("B. each taught area resolves to its own lesson, untaught areas to a plain statement, and a broken chain to nothing", () => {
    for (const area of TAUGHT) {
      const action = hosaMedTermRemediation(area, LABEL.get(area)!);
      assert.ok(action && action.kind === "lesson", `B1. ${area} has a lesson action`);
      if (action?.kind !== "lesson") continue;
      const owner = getEducationLesson(EXPECTED_OWNER[area])!;
      assert.ok(isConceptEducationLessonEntry(owner));
      const title = isConceptEducationLessonEntry(owner) ? owner.source.lesson.title : "";
      assert.equal(action.lessonId, EXPECTED_OWNER[area], `B1b. ${area} opens ${EXPECTED_OWNER[area]}`);
      assert.equal(action.href, `/lessons/${EXPECTED_OWNER[area]}?track=hosa`, `B1c. at its canonical HOSA URL`);
      assert.equal(action.lessonTitle, title, `B1d. named by the lesson's own title`);
      assert.ok(action.label.toLowerCase().includes(LABEL.get(area)!.toLowerCase()) && action.label.includes(title),
        `B1e. the label names the same area and the same lesson ("${action.label}")`);
      // Word-start stems, so "pathophysiology" is not read as naming physiology.
      const STEM: Record<string, RegExp> = { "word-roots": /\broot/i, prefixes: /\bprefix/i, suffixes: /\bsuffix/i, anatomy: /\banatom/i,
        physiology: /\bphysiolog/i, pathophysiology: /\bpathophysiolog/i };
      for (const other of [...TAUGHT].filter((a) => a !== area)) {
        assert.ok(!STEM[other].test(action.label), `B1f. the ${area} label does not name ${other}`);
      }
    }
    for (const area of UNTAUGHT) {
      const action = hosaMedTermRemediation(area, LABEL.get(area)!);
      assert.deepEqual(action, { area, kind: "no-lesson", message: HOSA_MEDTERM_NO_LESSON_MESSAGE }, `B2. ${area} gets the plain no-lesson statement and no link`);
    }
    // With every area taught, only an area outside the bank's six can reach the no-lesson statement.
    assert.deepEqual(hosaMedTermRemediation("not-an-area", "Not an area"),
      { area: "not-an-area", kind: "no-lesson", message: HOSA_MEDTERM_NO_LESSON_MESSAGE }, "B2a. an undeclared area gets the plain statement, never a lesson");
    assert.equal(HOSA_MEDTERM_NO_LESSON_MESSAGE, "CompeteReady does not have a lesson for this area yet.", "B2b. in Melo's words");
    for (const junk of ["not-an-area", "Word roots", "word-roots ", "__proto__", "constructor", "toString"]) {
      assert.notEqual(hosaMedTermRemediation(junk, "Anything")?.kind, "lesson", `B3. "${junk}" never inherits a lesson`);
    }
    assert.equal(hosaMedTermRemediation("word-roots", ""), null, "B3b. no label, no action");
    assert.equal(hosaMedTermRemediation("", "Word roots"), null, "B3c. no area, no action");

    // Fail closed, each link of the chain in turn. Each control changes the live registry entry and
    // restores it, so it is the resolver's own checks that are exercised.
    withEntry("hosa-medical-word-roots", { visibility: "internal" } as Partial<EducationRegistryEntry>, () => {
      assert.equal(hosaMedTermRemediation("word-roots", "Word roots"), null, "B4. owner held: no action, and no false 'no lesson' claim either");
    });
    withEntry("hosa-medical-suffixes", { track: "DECA" } as Partial<EducationRegistryEntry>, () => {
      assert.equal(hosaMedTermRemediation("suffixes", "Suffixes"), null, "B5. owner moved to another track: no action");
    });
    withEntry("hosa-medical-word-roots", { courseId: "some-other-course" } as Partial<EducationRegistryEntry>, () => {
      assert.equal(hosaMedTermRemediation("word-roots", "Word roots"), null, "B5b. owner moved out of the course: no action");
    });
    withEntry("hosa-medical-suffixes", { visibility: "internal" } as Partial<EducationRegistryEntry>, () => {
      // Word Roots' return promises "a later lesson in this course"; its next lesson is now held.
      assert.equal(hosaLessonPracticeReturn("hosa-medical-word-roots"), null, "B6. a return that would promise a missing later lesson is withdrawn");
      assert.equal(hosaMedTermRemediation("word-roots", "Word roots"), null, "B6b. and with no return to practice, no lesson action");
    });
    withEntry("hosa-medical-prefixes", { nextLessonId: null } as Partial<EducationRegistryEntry>, () => {
      // Were Prefixes the course's last lesson again, it would carry the course-end action instead of
      // the module-end link beside "Next lesson", and the chain would still hold.
      assert.equal(hosaCourseEndAction("hosa-medical-prefixes")?.href, medTermFocusHref("word-parts"), "B7. control: the course-end action follows the chain");
      assert.equal(hosaLessonPracticeLink("hosa-medical-prefixes")?.href, medTermFocusHref("word-parts"), "B7b. the owner still leads back to word-part practice");
      assert.equal(hosaMedTermRemediation("prefixes", "Prefixes")?.kind, "lesson", "B7c. so the action stands");
    });
    assert.equal(hosaCourseEndAction("hosa-medical-prefixes"), null, "B7d. restored: Prefixes continues into the anatomy module");
    withEntry("hosa-physiology-staying-in-balance", { visibility: "internal" } as Partial<EducationRegistryEntry>, () => {
      assert.equal(hosaMedTermRemediation("physiology", "Physiology"), null, "B7e. physiology owner held: no action, and no false 'no lesson' claim");
    });
    assert.equal(hosaMedTermRemediation("physiology", "Physiology")?.kind, "lesson", "B7f. restored");
    withEntry("hosa-pathophysiology-how-tissue-changes", { visibility: "internal" } as Partial<EducationRegistryEntry>, () => {
      assert.equal(hosaMedTermRemediation("pathophysiology", "Pathophysiology"), null, "B7g. pathophysiology owner held: no action, and no false 'no lesson' claim");
    });
    assert.equal(hosaMedTermRemediation("pathophysiology", "Pathophysiology")?.kind, "lesson", "B7h. restored");
    assert.ok(hosaMedTermRemediation("word-roots", "Word roots")?.kind === "lesson", "B8. every control restored the registry");
  });

  // ---- C. actual evidence -> the results the learner sees -------------------------------------------
  await check("C. weak areas from a real submit render each area's own action, and nothing else", async () => {
    const { POST } = require("../app/api/hosa/medterm/submit/route") as { POST: (r: Request) => Promise<Response> };
    const { HosaEventPrep } = require("../components/training/hosa-event-prep") as { HosaEventPrep: (p: { focus?: string | null }) => Promise<React.ReactElement> };
    const { HosaMedTermEngine, WeakAreasReview, weakAreaRemediation } = require("../components/training/hosa-medterm-engine") as {
      HosaMedTermEngine: unknown;
      WeakAreasReview: React.FunctionComponent<Record<string, unknown>>;
      weakAreaRemediation: (area: string, list: readonly HosaMedTermRemediation[]) => HosaMedTermRemediation | null;
    };

    // The room resolves the actions once, on the server, for every canonical area.
    const find = (node: unknown, type: unknown): React.ReactElement | null => {
      if (!node || typeof node !== "object") return null;
      const el = node as React.ReactElement<{ children?: unknown }>;
      if (el.type === type) return el;
      const kids = el.props?.children;
      for (const child of Array.isArray(kids) ? kids : [kids]) {
        const hit = find(child, type);
        if (hit) return hit;
      }
      return null;
    };
    const room = await HosaEventPrep({ focus: null });
    const engine = find(room, HosaMedTermEngine);
    assert.ok(engine, "C1. the room mounts the engine");
    const remediation = (engine!.props as { remediation: HosaMedTermRemediation[] }).remediation;
    assert.deepEqual(remediation.map((r) => r.area), AREA_IDS, "C1b. with one action for every canonical area, in canonical order");
    assert.deepEqual(remediation.map((r) => r.kind), AREA_IDS.map((a) => (TAUGHT.has(a) ? "lesson" : "no-lesson")),
      "C1c. a lesson for each taught area, the plain statement for each untaught one");

    // A stored session: word roots 2 of 4 wrong, anatomy 1 of 4 wrong, physiology 1 of 4 wrong,
    // pathophysiology 1 of 4 wrong, suffixes all right.
    const pick = (area: string, n: number) => MEDTERM_BANK.filter((q) => q.area === area).slice(0, n);
    const answered = [
      ...pick("word-roots", 4).map((q, i) => ({ q, correct: i >= 2 })),
      ...pick("anatomy", 4).map((q, i) => ({ q, correct: i !== 0 })),
      ...pick("physiology", 4).map((q, i) => ({ q, correct: i !== 1 })),
      ...pick("pathophysiology", 4).map((q, i) => ({ q, correct: i !== 2 })),
      ...pick("suffixes", 4).map((q) => ({ q, correct: true }))
    ];
    storedSession = {
      id: "session-remediation",
      userId: "user_smoke",
      kind: "HOSA_MEDTERM",
      status: "ISSUED",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      items: answered.map(({ q, correct }, i) => ({
        id: `item-${i}`, bankQuestionId: q.id, area: q.area, skillSlug: "hosa-medical-terminology",
        selectedOptionId: "opt", isCorrect: correct, answeredAt: new Date(), displayOrder: i
      }))
    };
    const res = await POST(new Request("http://localhost/api/hosa/medterm/submit", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: "session-remediation" })
    }));
    assert.equal(res.status, 200, "C2. the real submit route scores the session");
    const result = await res.json() as { weakAreas: Array<{ area: string; label: string; missed: number; total: number }>; evidenceStatus: string };
    assert.deepEqual(result.weakAreas.map((w) => [w.area, w.missed, w.total]), [["word-roots", 2, 4], ["anatomy", 1, 4], ["physiology", 1, 4], ["pathophysiology", 1, 4]],
      "C2b. its weak areas are the areas with misses, from the stored answers");
    assert.equal(result.evidenceStatus, "passing", "C2c. control: 20 questions across 5 areas qualify as evidence, and 15 of 20 is at least 70%");
    assert.ok(calls.includes("getWeightedScoringRubric"), "C2c2. so the route ran its evidence branch (and the review writer, which throws here, was not reached: no Skill row)");
    assert.equal(db.updates.length, 1, "C2d. the only write is the route's own completion of the session (the stand-in)");

    const html = decode(renderToStaticMarkup(React.createElement(WeakAreasReview, { result, remediation })));
    const items = [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
    assert.equal(items.length, 4, "C3. one entry per weak area");
    const [rootsItem, anatomyItem, physiologyItem, pathoItem] = items;
    assert.ok(visible(rootsItem).startsWith("Word roots: missed 2 of 4"), "C3b. the evidence line comes first");
    const rootsLinks = [...rootsItem.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    assert.equal(rootsLinks.length, 1, "C4. the word-roots weakness offers exactly one link");
    assert.equal(rootsLinks[0][1], "/lessons/hosa-medical-word-roots?track=hosa", "C4b. to the Word Roots lesson");
    assert.ok(/word roots/i.test(visible(rootsLinks[0][2])) && visible(rootsLinks[0][2]).includes("Word Roots: What the Term Is About"),
      "C4c. labelled with the same area and the same lesson");
    assert.ok(/aria-hidden="true"/.test(rootsLinks[0][2]) && /min-h-11/.test(rootsLinks[0][0]), "C4d. its icon is decorative and its target is at least 44px tall");
    const anatomyLinks = [...anatomyItem.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    assert.equal(anatomyLinks.length, 1, "C4e. the anatomy weakness offers exactly one link");
    assert.equal(anatomyLinks[0][1], "/lessons/hosa-anatomy-body-map?track=hosa", "C4f. to the lesson where the anatomy module starts");
    assert.ok(/anatomy/i.test(visible(anatomyLinks[0][2])) && visible(anatomyLinks[0][2]).includes("Body Map: Directions, Planes and Cavities"),
      "C4g. labelled with the same area and that lesson");
    const physiologyLinks = [...physiologyItem.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    assert.equal(physiologyLinks.length, 1, "C4h. the physiology weakness offers exactly one link");
    assert.equal(physiologyLinks[0][1], "/lessons/hosa-physiology-staying-in-balance?track=hosa", "C4i. to the lesson where the physiology module starts");
    assert.ok(/physiology/i.test(visible(physiologyLinks[0][2])) && visible(physiologyLinks[0][2]).includes("Staying in Balance: Feedback, Hormones and the Kidneys"),
      "C4j. labelled with the same area and that lesson");
    assert.ok(!physiologyItem.includes(HOSA_MEDTERM_NO_LESSON_MESSAGE), "C4k. and no longer says no lesson exists");
    const pathoLinks = [...pathoItem.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    assert.equal(pathoLinks.length, 1, "C4l. the pathophysiology weakness offers exactly one link");
    assert.equal(pathoLinks[0][1], "/lessons/hosa-pathophysiology-how-tissue-changes?track=hosa", "C4m. to the lesson where the pathophysiology module starts");
    assert.ok(/pathophysiology/i.test(visible(pathoLinks[0][2])) && visible(pathoLinks[0][2]).includes("How Tissue Changes: Words for What Goes Wrong"),
      "C4n. labelled with the same area and that lesson");
    assert.ok(!pathoItem.includes(HOSA_MEDTERM_NO_LESSON_MESSAGE), "C4o. and no longer says no lesson exists");
    // Every real area has a lesson now, so the no-lesson rendering is exercised with a planted
    // statement: the view must still show it plainly, with no link, if the server ever resolves one.
    const planted = remediation.map((r) => (r.area === "pathophysiology" ? { area: r.area, kind: "no-lesson" as const, message: HOSA_MEDTERM_NO_LESSON_MESSAGE } : r));
    const plantedHtml = decode(renderToStaticMarkup(React.createElement(WeakAreasReview, { result, remediation: planted })));
    const plantedPatho = [...plantedHtml.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1])[3];
    assert.ok(!/href=/.test(plantedPatho), "C5. control: a weakness the server resolves to no lesson links to nothing");
    assert.ok(visible(plantedPatho).includes(HOSA_MEDTERM_NO_LESSON_MESSAGE), "C5b. it says no lesson exists yet");
    assert.ok(visible(plantedPatho).includes(`keep practising it with ${medTermFocus("all").label}`), "C5c. and offers only the neutral way to keep practising");
    assert.ok(/aria-hidden="true"/.test(plantedPatho), "C5d. the statement pairs an icon with its text, never colour alone");
    assert.ok(visible(html).includes("A lesson opens on its own page, so these results close"), "C6. the learner is told a lesson replaces these results");

    // Fail closed in the view: a missing entry shows the area alone; a duplicate never picks one.
    const withoutRoots = remediation.filter((r) => r.area !== "word-roots");
    const bare = decode(renderToStaticMarkup(React.createElement(WeakAreasReview, { result, remediation: withoutRoots })));
    const bareRoots = [...bare.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)][0][1];
    assert.ok(!/href=/.test(bareRoots) && !bareRoots.includes(HOSA_MEDTERM_NO_LESSON_MESSAGE),
      "C7. with no action resolved for word roots, it shows neither another area's lesson nor a no-lesson claim");
    assert.equal(weakAreaRemediation("word-roots", [...remediation, remediation[0]]), null, "C7b. two entries for one area pick neither");
    assert.equal(weakAreaRemediation("pathophysiology", remediation.filter((r) => r.area !== "pathophysiology")), null,
      "C7c. an area with no resolved action never borrows another area's lesson");
    const onlyUntaught = decode(renderToStaticMarkup(React.createElement(WeakAreasReview, {
      result: { weakAreas: [{ area: "pathophysiology", label: "Pathophysiology", missed: 2, total: 3 }], evidenceStatus: "below-threshold" },
      remediation: planted
    })));
    assert.ok(!/href=/.test(onlyUntaught) && (onlyUntaught.match(new RegExp(escape(HOSA_MEDTERM_NO_LESSON_MESSAGE), "g")) ?? []).length === 1,
      "C8. control: a planted no-lesson area alone gets one plain statement, no link, no lesson note");
    assert.ok(!onlyUntaught.includes("A lesson opens on its own page"), "C8b. and no note about lessons that are not offered");

    // The learner sees these results only on the engine's results screen, so that screen must render
    // this same component with the room's actions (a render of the component alone cannot prove it).
    const engineSrc = stripComments(read("components/training/hosa-medterm-engine.tsx"));
    const resultsAt = engineSrc.indexOf("if (result) {");
    assert.ok(resultsAt > 0, "C9. control: the engine's results screen is found");
    const resultsScreen = engineSrc.slice(resultsAt, engineSrc.indexOf("New session", resultsAt));
    assert.equal((engineSrc.match(/<WeakAreasReview\b/g) ?? []).length, 1, "C9b. the engine renders the weak-area review exactly once");
    assert.ok(resultsScreen.includes("<WeakAreasReview result={result} remediation={remediation} />"),
      "C9c. on its results screen, with the session's result and the room's actions");
    assert.ok(/export function HosaMedTermEngine\(\{[^}]*\bremediation = \[\]\s*\}/.test(engineSrc),
      "C9d. and those actions are the engine's own prop, the one the room passes (C1)");
    const reviewFn = engineSrc.slice(engineSrc.indexOf("export function WeakAreasReview"), engineSrc.indexOf("export function HosaMedTermEngine"));
    assert.equal((engineSrc.match(/Areas to review/g) ?? []).length, 1, "C9e. the weak areas are listed in one place only");
    assert.ok(reviewFn.includes("Areas to review"), "C9f. and that place is the review rendered above");
  });

  // ---- D. the return to practice ---------------------------------------------------------------------
  await check("D. each owner lesson leads back to the practice choice that includes its area, and opening it starts nothing", () => {
    const { ConceptEducationLessonView } = require("../components/lessons/concept-education-lesson-view") as {
      ConceptEducationLessonView: React.FunctionComponent<Record<string, unknown>>;
    };
    for (const area of TAUGHT) {
      const lessonId = EXPECTED_OWNER[area];
      const link = hosaLessonPracticeLink(lessonId);
      const choice = choiceFor(area);
      assert.ok(link, `D1. ${lessonId} has a way back to practice`);
      assert.equal(link!.href, medTermFocusHref(choice.id), `D1b. it opens ${choice.label}`);
      const focus = medTermFocusFromParam(new URL(link!.href, "http://localhost").searchParams.get(HOSA_MEDTERM_FOCUS_PARAM) ?? undefined);
      assert.equal(focus, choice.id, `D1c. the URL resolves to the ${choice.id} choice`);
      const areas = medTermFocusRequestAreas(choice.id)!;
      assert.ok(areas.includes(area as (typeof areas)[number]), `D1d. which includes ${area}`);
      const session = buildMedTermSession(30, areas);
      assert.ok(session.some((q) => q.area === area), `D1e. and serves ${area} questions from the bank`);
      assert.ok(session.every((q) => areas.includes(q.area)), `D1f. and nothing outside ${choice.label}`);

      // Rendered with the lesson page's own props.
      const entry = getEducationLesson(lessonId)!;
      assert.ok(isConceptEducationLessonEntry(entry));
      const nextEntry = entry.nextLessonId ? getEducationLesson(entry.nextLessonId) : null;
      const next = nextEntry && isConceptEducationLessonEntry(nextEntry) ? { id: nextEntry.id, title: nextEntry.source.lesson.title } : null;
      const html = decode(renderToStaticMarkup(React.createElement(ConceptEducationLessonView, {
        source: isConceptEducationLessonEntry(entry) ? entry.source : null,
        provenance: entry.provenance,
        moduleLabel: getEducationModule(entry.moduleId)!.label,
        next,
        courseEndAction: hosaCourseEndAction(lessonId) ?? undefined,
        practiceReturn: hosaLessonPracticeReturn(lessonId) ?? undefined
      })));
      assert.equal((html.match(new RegExp(`href="${escape(link!.href)}"`, "g")) ?? []).length, 1, `D2. ${lessonId} renders that link exactly once`);
      assert.ok(visible(html).includes(link!.label), `D2b. labelled "${link!.label}"`);
      assert.ok(!/<form\b|method="post"/i.test(html), "D2c. nothing on the lesson submits anything");
    }
    assert.equal(hosaLessonPracticeReturn("hosa-medical-prefixes"), HOSA_MEDTERM_PRACTICE_ENTRY,
      "D3. the word-part module's last lesson carries the module's end link, not a second, mid-module return");
    assert.equal(hosaLessonPracticeReturn("hosa-anatomy-bones-muscles-nerves-skin")?.href, medTermFocusHref("anatomy"),
      "D3a. the anatomy module's last lesson, now followed by the physiology module, carries anatomy's module-end link");
    assert.equal(hosaLessonPracticeReturn("hosa-medical-terminology-basics"), null, "D3b. the structure lesson, which owns no area, gets none");
    assert.equal(hosaLessonPracticeReturn("hosa-physiology-nerves-and-muscles")?.href, medTermFocusHref("physiology"),
      "D3a2. the physiology module's last lesson, now followed by the pathophysiology module, carries physiology's module-end link");
    const MODULE_ENDS = ["hosa-anatomy-bones-muscles-nerves-skin", "hosa-physiology-nerves-and-muscles"];
    for (const entry of EDUCATION_LESSONS.filter((e) => !Object.values(EXPECTED_OWNER).includes(e.id) && !MODULE_ENDS.includes(e.id))) {
      assert.equal(hosaLessonPracticeReturn(entry.id), null, `D3c. ${entry.id} offers no practice return`);
    }
    assert.ok(HOSA_MEDTERM_PRACTICE_RETURN.detail.includes("nothing starts until you press start"), "D3d. the return says nothing starts by itself");
    assert.ok(Object.isFrozen(HOSA_MEDTERM_PRACTICE_RETURN), "D3e. frozen");

    const page = stripComments(read("app/(app)/lessons/[slug]/page.tsx"));
    assert.ok(page.includes("practiceReturn: hosaLessonPracticeReturn(entry.id)"), "D4. the lesson page resolves the return");
    assert.ok(page.includes("practiceReturn={concept.practiceReturn ?? undefined}"), "D4b. and hands it to the view");
    const view = stripComments(read("components/lessons/concept-education-lesson-view.tsx"));
    for (const [file, src] of [["lessons page", page], ["lesson view", view]] as const) {
      for (const banned of ["@/lib/prisma", "prisma.", "fetch(", "@/lib/spaced-review", "recordPracticeOutcome"]) {
        assert.ok(!src.includes(banned), `D5. the ${file} contains no ${banned}: opening a lesson writes nothing`);
      }
    }
  });

  // ---- E. the old record ------------------------------------------------------------------------------
  await check("E. the old Word roots record opens the Word Roots lesson; its untaught siblings keep their honest page", async () => {
    const r = resolveSkillsSlug("hosa-medical-terminology-1");
    assert.deepEqual(r, { kind: "canonical-redirect", lessonId: "hosa-medical-word-roots", via: "allowlist" }, "E1. the record redirects to the Word Roots lesson");
    assert.equal(CANONICAL_REDIRECTS["hosa-medical-terminology-1"], HOSA_SEEDED_TOPIC_LESSON.get("hosa-medical-terminology-1"),
      "E1b. the same audited pairing the test results page uses");
    const target = getEducationLesson("hosa-medical-word-roots")!;
    assert.ok(target.visibility === "learner" && target.track === "HOSA", "E1c. to a published HOSA lesson");
    const { default: SkillPage } = require("../app/(app)/skills/[slug]/page") as { default: (p: { params: { slug: string } }) => unknown };
    let digest = "";
    try {
      SkillPage({ params: { slug: "hosa-medical-terminology-1" } });
    } catch (error) {
      digest = String((error as { digest?: string }).digest ?? "");
    }
    assert.ok(digest.includes("/lessons/hosa-medical-word-roots"), `E2. the page itself sends the learner there (${digest})`);
    for (const sibling of ["hosa-medical-terminology-2", "hosa-medical-terminology-3"]) {
      assert.equal(resolveSkillsSlug(sibling).kind, "compatibility", `E3. ${sibling} keeps the compatibility state`);
      const html = decode(renderToStaticMarkup(SkillPage({ params: { slug: sibling } }) as React.ReactElement));
      assert.ok(visible(html).includes("No written lesson here yet"), `E3b. ${sibling} still says plainly there is no lesson`);
      assert.ok(!html.includes("/lessons/hosa-medical-word-roots"), `E3c. and is not pointed at the Word Roots lesson`);
    }
  });

  // ---- F. the hub row ----------------------------------------------------------------------------------
  await check("F. the HOSA hub's practice row opens the Medical Terminology Event HQ, not a loop through /skills", () => {
    const TrackHubPage = require("../app/(app)/training/[track]/page").default as React.FunctionComponent<{ params: { track: string } }>;
    const hub = (slug: string) => decode(renderToStaticMarkup(React.createElement(TrackHubPage, { params: { track: slug } })));
    const anchors = (html: string) => [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1], text: visible(m[2]) }));
    const hosa = hub("hosa");
    const hosaLinks = anchors(hosa);
    const row = hosaLinks.find((a) => a.text.startsWith("Medical Terminology practice"));
    assert.ok(row, "F1. the HOSA hub names its practice for what it is");
    assert.equal(row!.href, "/training/hosa/event/medical-terminology", "F1b. and opens the Medical Terminology Event HQ");
    assert.ok(row!.text.includes("every answer explained"), "F1c. saying what the practice is");
    assert.ok(!hosaLinks.some((a) => a.href.startsWith("/skills")), "F2. no HOSA hub link loops through /skills");
    assert.ok(!visible(hosa).includes("Skill drills"), "F2b. and no row promises drills HOSA does not have");
    assert.ok(!hosa.includes("/training/hosa/practice"), "F2c. the hub still never routes into the practice room itself");
    const eventHq = stripComments(read("app/(app)/training/[track]/event/[eventSlug]/page.tsx"));
    const hosaHq = eventHq.slice(eventHq.indexOf('"hosa/medical-terminology"'), eventHq.indexOf('"deca/hotel-lodging-management"'));
    assert.ok(hosaHq.includes('href: "/training/hosa/practice"'), "F3. the Event HQ it opens lists the practice room");
    const deca = anchors(hub("deca")).find((a) => a.text.startsWith("Skill drills"));
    assert.equal(deca?.href, "/study-arcade?track=deca", "F4. DECA keeps its Skill drills row, to its drills");
    const debate = anchors(hub("debate")).find((a) => a.text.startsWith("Skill drills"));
    assert.equal(debate?.href, "/skills?track=debate", "F4b. Debate keeps its Skill drills row, to its drill tile");
  });

  // ---- G. wording -----------------------------------------------------------------------------------
  await check("G. HOSA test results say event category, never DECA's cluster; DECA's wording is unchanged", () => {
    assert.equal(practiceWeakSkillsDescription("DECA"), "Start with the first recommended lesson, then retry the same cluster.", "G1. DECA's sentence is unchanged");
    for (const other of ["DEBATE", "MODEL_UN", ""]) {
      assert.equal(practiceWeakSkillsDescription(other), practiceWeakSkillsDescription("DECA"), `G1b. an older ${other || "unnamed"} test reads what it always read`);
    }
    const hosaSentence = practiceWeakSkillsDescription("HOSA");
    assert.ok(!/cluster/i.test(hosaSentence) && hosaSentence.includes("event category"), `G2. HOSA's says event category ("${hosaSentence}")`);
    const results = stripComments(read("app/(app)/tests/[testId]/results/page.tsx"));
    assert.ok(results.includes("description={practiceWeakSkillsDescription(test.organization)}"), "G3. the results page takes the sentence from the record's organization");
    // `eventCluster` is the stored column's name, never shown as a word; anything else would be copy.
    assert.ok(!/cluster/i.test(results.replace(/\beventCluster\b/g, "")), "G3b. and states no cluster wording of its own");
    assert.ok(results.includes("eventCluster"), "G3b2. control: the column name is really there to be excluded");
    assert.ok(results.includes("resultNoteForOrganization(recommendations.note, test.organization)"), "G3c. and shows the stored note through the same organization");
    // The grader's two notes, read from its source so this cannot drift from what is stored.
    const grader = read("app/api/tests/[testId]/grade/route.ts");
    const notes = [...grader.matchAll(/"((?:Work through|Strong performance)[^"\\]*(?:\\.[^"\\]*)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`) as string);
    assert.equal(notes.length, 2, "G4. control: both grader notes were found");
    assert.ok(notes.every((n) => /cluster/i.test(n)), "G4b. control: both are in DECA's word");
    for (const note of notes) {
      const forHosa = resultNoteForOrganization(note, "HOSA");
      assert.ok(!/cluster/i.test(forHosa) && /categor/.test(forHosa), `G5. a HOSA learner reads "${forHosa}"`);
      assert.equal(resultNoteForOrganization(note, "DECA"), note, "G5b. DECA reads the note exactly as stored");
    }
    // Tests graded before abe36bf (2026-09-10) stored the grader's older first sentence.
    const olderNote = "Review the recommended lessons, then regenerate a shorter test in the same event cluster.";
    assert.equal(resultNoteForOrganization(olderNote, "HOSA"), "Review the recommended lessons, then regenerate a shorter test in the same event category.",
      "G5c. an older stored note reads in HOSA's word too");
    assert.equal(resultNoteForOrganization(olderNote, "DECA"), olderNote, "G5d. and exactly as stored for DECA");
    for (const other of ["DEBATE", "MODEL_UN"]) {
      assert.equal(resultNoteForOrganization(notes[0], other), notes[0], `G5e. an older ${other} test reads its note exactly as stored`);
    }
    assert.equal(resultNoteForOrganization("A coach wrote this.", "HOSA"), "A coach wrote this.", "G6. any other note passes through untouched");
    const card = read("components/tests/result-recommendations.tsx");
    assert.ok(/isDeca[\s\S]{0,400}same cluster[\s\S]{0,400}same category/.test(card), "G7. control: the recommendations card already words each organization its own way");
  });

  // ---- H. no new model, no false claim, one-way dependencies ----------------------------------------
  await check("H. no new model or mastery word, and the client engine imports no curriculum module", () => {
    const changed = [
      "lib/education/hosa-medterm-practice.ts", "components/training/hosa-medterm-engine.tsx", "components/training/hosa-event-prep.tsx",
      "components/lessons/concept-education-lesson-view.tsx", "app/(app)/lessons/[slug]/page.tsx", "app/(app)/training/[track]/page.tsx",
      "lib/education/test-result-recommendations.ts", "lib/education/skills-compat.ts"
    ];
    for (const file of changed) {
      const src = stripComments(read(file));
      for (const banned of ["MasteryProgress", "masteryProgress", "recordDrillMastery", "xpReward", "awardXp", "competition-ready", "readiness score"]) {
        assert.ok(!src.includes(banned), `H1. ${file} contains no ${banned}`);
      }
    }
    const engine = stripComments(read("components/training/hosa-medterm-engine.tsx"));
    assert.ok(!engine.includes("lib/education"), "H2. the client engine imports nothing from lib/education");
    assert.ok(!engine.includes("hosa-medical-") && !engine.includes("hosa-anatomy-") && !engine.includes("hosa-physiology-") && !engine.includes("hosa-pathophysiology-"),
      "H2b. and names no lesson itself");
    const prep = stripComments(read("components/training/hosa-event-prep.tsx"));
    assert.deepEqual([...new Set(prep.match(/from "@\/lib\/education\/[a-z-]+"/g) ?? [])], ['from "@/lib/education/hosa-medterm-practice"'],
      "H3. the room reaches exactly one curriculum module");
    const resolverSrc = stripComments(read("lib/education/hosa-medterm-practice.ts"));
    assert.ok(!resolverSrc.includes('@/lib/hosa-medterm"'), "H4. the resolver never loads the question bank");
    // Every area has lessons now, so the scan keeps only whole-subject claims.
    const claim = /(?:covers?|teach(?:es)?)\s+(?:all|every|the whole)\s+(?:of\s+)?medical terminology|everything (?:HOSA|the test|Medical Terminology)/i;
    const copy = [HOSA_MEDTERM_PRACTICE_RETURN.detail, HOSA_MEDTERM_NO_LESSON_MESSAGE,
      ...AREA_IDS.map((a) => JSON.stringify(hosaMedTermRemediation(a, LABEL.get(a)!)))].join("\n");
    assert.ok(!claim.test(copy), "H5. no action claims the course covers everything");
    assert.ok(claim.test("The course teaches all of Medical Terminology."), "H5b. control: the scan catches such a claim");
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    assert.equal(pkg.scripts["hosa-medterm-remediation:smoke"], "tsx scripts/hosa-medterm-remediation-smoke.ts", "H6. this suite is registered");
    assert.ok(!db.touches.some((t) => t !== "$transaction"), `H7. the database stand-in saw only the route's transaction (${db.touches.join(", ")})`);
  });

  console.log(`\nhosa-medterm-remediation: ${checks} checks passed. Practice results offer, for each weak word-part area, the one published lesson that teaches it (read from the lessons' own text), and for anatomy, physiology and pathophysiology the lesson where each module starts, labelled with the same area and lesson, and that lesson leads back to the practice choice that includes the area; an area outside the bank's six gets at most the plain statement that no lesson exists and links to nothing; any broken link in the chain removes the action. The old Word roots record opens the Word Roots lesson, the HOSA hub's practice row opens the Medical Terminology Event HQ instead of looping through /skills, and HOSA test results say event category while DECA keeps cluster.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
