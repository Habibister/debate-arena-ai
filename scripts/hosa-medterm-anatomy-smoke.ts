/**
 * HOSA Medical Terminology anatomy — the course's second module, and what it may claim.
 *
 * Run with: npm run hosa-medterm-anatomy:smoke
 *
 * NO DATABASE, NO PROVIDER, NO ENV, NO WRITES. The practice route, the practice page and the room are
 * loaded only after lib/prisma, lib/api-auth, lib/rate-limit and lib/competition-specs are replaced by
 * in-memory stand-ins (the same harness as hosa-medterm-targeted-practice-smoke). Lessons are rendered
 * through `react-dom/server`. Nothing here fetches, writes, or reads a secret.
 *
 * WHAT IT PROTECTS. The Medical Terminology practice bank asks 30 anatomy questions. Four lessons now
 * teach them, derived from a census of those questions rather than from general anatomy knowledge.
 * The properties that make that honest are the ones a later edit could quietly break:
 *
 *   A. Registration: the anatomy module follows the word-part module in the same course, by
 *      reference, in one chain, with a provenance label that says the lessons are AI-generated, not
 *      official HOSA material, and not yet reviewed by a person.
 *   B. The census: every one of the bank's 30 anatomy questions is classified by the concept it needs
 *      and assigned a teaching owner, or listed as not taught yet. Nothing is left out.
 *   C. Alignment: for every question classified as taught, the fact it needs is stated in its owner
 *      lesson's teaching text (not only in a check), and the confusable wrong fact is never stated.
 *   D. The learner checks test the lessons, explain every answer, give no position or length tell,
 *      copy no bank question, save nothing and claim no mastery.
 *   E. No official HOSA claim, no invented number, no diagnosis or treatment, no other track.
 *   F. The learning graph: word parts -> anatomy -> anatomy practice, with the right link on the right
 *      lesson, and a practice choice that serves only anatomy questions and starts nothing by itself.
 *   G. Remediation: an anatomy weakness opens the anatomy lessons, every link checked, failing closed.
 *   H. The anatomy lessons teach no function and no disease. Physiology and pathophysiology, taught
 *      since by the next two modules, are scripts/hosa-medterm-physiology-smoke.ts's and
 *      scripts/hosa-medterm-pathophysiology-smoke.ts's; this suite checks only that the anatomy
 *      lessons themselves still teach none of it, and that neither area is served from anatomy.
 *   I. The question bank itself is unchanged: coverage was earned by teaching, not by editing items.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
type Row = Record<string, unknown>;
const db = { sessions: [] as Row[], items: [] as Row[], touches: [] as string[] };
const tx = {
  $queryRaw: async () => [{ id: "user_smoke" }],
  practiceSession: {
    findMany: async () => [],
    deleteMany: async () => ({ count: 0 }),
    findFirst: async () => null,
    create: async ({ data }: { data: Row }) => {
      const row = { id: `session-${db.sessions.length + 1}`, ...data };
      db.sessions.push(row);
      return row;
    },
    update: async ({ where, data }: { where: Row; data: Row }) => ({ ...where, ...data })
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
  requireUser: async () => ({ id: "user_smoke", role: "STUDENT", organization: "HOSA" }),
  clientIp: () => "203.0.113.9"
});
stub("lib/rate-limit", { enforceRateLimit: async () => undefined });
stub("lib/competition-specs", { getActiveSpec: async () => null });
stub("lib/prisma", { prisma: prismaStandIn });

// tsconfig jsx=preserve => classic React.createElement, so React must be global before the
// component modules are evaluated. Same harness as hosa-medterm-lessons-smoke.
(globalThis as { React?: unknown }).React = React;

import { LEARNING_SKILL_CATALOG } from "../lib/learning-content";
import { MEDTERM_AREAS, MEDTERM_BANK, type MedTermQuestion } from "../lib/hosa-medterm";
import { presentSourceFreshness } from "../lib/source-freshness";
import { learnerPathForTrack } from "../lib/learner-path";
import {
  EDUCATION_COURSES,
  EDUCATION_LESSONS,
  educationLessonsForTrack,
  getEducationLesson,
  getEducationModule
} from "../lib/education/registry";
import { isConceptEducationLessonEntry, type ConceptEducationLessonSource } from "../lib/education/types";
import {
  HOSA_PUBLISHED_LESSONS,
  PUBLISHED_HOSA_SLUGS,
  STABLE_TEACHING_HOSA_ANATOMY_PROVENANCE,
  STABLE_TEACHING_HOSA_PROVENANCE
} from "../lib/education/tracks/hosa";
import {
  HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY,
  HOSA_MEDTERM_ANATOMY_PRACTICE_RETURN,
  HOSA_MEDTERM_AREA_TEACHING_OWNERS,
  HOSA_MEDTERM_NO_LESSON_MESSAGE,
  HOSA_MEDTERM_PRACTICE_ENTRY,
  HOSA_MEDTERM_STUDY_COURSE,
  hosaCourseEndAction,
  hosaLessonPracticeLink,
  hosaLessonPracticeReturn,
  hosaMedTermRemediation
} from "../lib/education/hosa-medterm-practice";
import { decaCourseEndAction } from "../lib/education/deca-simulation-prep";
import {
  HOSA_MEDTERM_ANATOMY_AREAS,
  HOSA_MEDTERM_FOCUS_PARAM,
  HOSA_MEDTERM_PRACTICE_ROOM,
  HOSA_MEDTERM_TAUGHT_AREAS,
  HOSA_MEDTERM_WORD_PART_AREAS,
  MEDTERM_FOCUS_CHOICES,
  medTermContinuedForOtherChoice,
  medTermFocus,
  medTermFocusForAreas,
  medTermFocusFromParam,
  medTermFocusHref,
  medTermFocusRequestAreas
} from "../lib/hosa-medterm-focus";

const { ConceptEducationLessonView } = require("../components/lessons/concept-education-lesson-view");

// ---- the module under test ----------------------------------------------------------------------------
const ANATOMY_MODULE = "hosa-medterm-anatomy";
const WORD_PART_ORDER = [
  "hosa-medical-terminology-basics",
  "hosa-medical-word-roots",
  "hosa-medical-suffixes",
  "hosa-medical-prefixes"
] as const;
const ANATOMY_ORDER = [
  "hosa-anatomy-body-map",
  "hosa-anatomy-heart-and-lungs",
  "hosa-anatomy-digestive-and-urinary",
  "hosa-anatomy-bones-muscles-nerves-skin"
] as const;
type AnatomyLesson = (typeof ANATOMY_ORDER)[number];
// The physiology module now follows anatomy in the same course (scripts/hosa-medterm-physiology-smoke.ts
// owns those lessons), so the course's chain, order and end are asserted against it too.
const PHYSIOLOGY_ORDER = [
  "hosa-physiology-staying-in-balance",
  "hosa-physiology-heart-and-blood",
  "hosa-physiology-breathing-and-digestion",
  "hosa-physiology-nerves-and-muscles"
] as const;
// The fourth module, which scripts/hosa-medterm-pathophysiology-smoke.ts owns; named here only for the
// course's order and its end.
const PATHOPHYSIOLOGY_ORDER = [
  "hosa-pathophysiology-how-tissue-changes",
  "hosa-pathophysiology-blood-flow-and-oxygen",
  "hosa-pathophysiology-heart-and-pressure",
  "hosa-pathophysiology-defences",
  "hosa-pathophysiology-breathing-kidneys-glucose"
] as const;
const [BODY_MAP, HEART_LUNGS, FOOD_URINE, FRAME] = ANATOMY_ORDER;

// The bank as it stood when the anatomy lessons were written (3d1cd9f). The census below classifies
// THESE questions; a changed bank has to be re-censused, never quietly re-matched.
const BANK_SHA256 = "ab80e811fb740772418f41d8e4f0e6d1a9bad794c264a135d726beb53d908cc2";

// ---- B/C. the census ----------------------------------------------------------------------------------
// One row per concept the bank's anatomy questions need. Each question names its owner lesson and the
// facts that answer it. A FACT is a list of patterns that must all appear in ONE sentence of the owner
// lesson's affirmative teaching text (see `teachingSentences`), so a fact stated only in a check, only
// in a weak answer, or split across two unrelated sentences does not count. `never` lists sentences
// that would teach the tempting wrong answer; none may appear anywhere in the module's teaching.
type Fact = readonly RegExp[];
type Taught = { owner: AnatomyLesson; facts: readonly Fact[]; never?: readonly RegExp[] };
type Concept = { concept: string; skill: string; questions: Readonly<Record<string, Taught>> };

const CENSUS: readonly Concept[] = [
  {
    concept: "Direction terms and anatomical position",
    skill: "Give a direction term's meaning and its opposite",
    questions: {
      "an-10": { owner: BODY_MAP, facts: [[/\bsuperior means toward the head/i], [/\binferior means toward the feet/i]],
        never: [/\bsuperior means toward the (?:feet|front|back|midline)/i] },
      "an-11": { owner: BODY_MAP, facts: [[/\bproximal means nearer the trunk/i, /\bdistal means farther from it\b/i]],
        never: [/\bdistal means (?:nearer|closer)/i] },
      "an-12": { owner: BODY_MAP, facts: [[/\banterior means toward the front/i, /\bposterior toward the back/i]],
        never: [/\banterior means toward the back/i] },
      "an-13": { owner: BODY_MAP, facts: [[/\bmedial means toward the midline/i, /\blateral means away from it/i]],
        never: [/\bmedial means away/i] },
      "an-14": { owner: BODY_MAP, facts: [[/\bsuperficial means near the body surface/i, /\bdeep means farther inside/i]],
        never: [/\bsuperficial means (?:deep|farther inside)/i] }
    }
  },
  {
    concept: "Body planes",
    skill: "Say which parts a plane divides the body into",
    questions: {
      "an-18": { owner: BODY_MAP, facts: [[/\bsagittal plane divides the body into left and right/i],
        [/\bfrontal plane\b/i, /\bcoronal\b/i, /\bfront and back\b/i], [/\btransverse plane\b/i, /\bupper and lower\b/i]],
        never: [/\bsagittal plane divides the body into (?:front|upper)/i] }
    }
  },
  {
    concept: "Body cavities",
    skill: "Name the cavity that holds an organ, or the boundary between two",
    questions: {
      "an-15": { owner: BODY_MAP, facts: [[/\bcranial cavity\b/i, /\bskull\b/i, /\bholds the brain\b/i]] },
      "an-16": { owner: BODY_MAP, facts: [[/\bdiaphragm\b/i, /\bseparates the thoracic cavity above from the abdominal cavity below\b/i]] },
      "an-17": { owner: BODY_MAP, facts: [[/\bpelvic cavity\b[^.]*\bwhich holds organs including the urinary bladder\b/i]],
        never: [/\b(?:urinary )?bladder\b[^.]{0,20}\b(?:is|sits|lies) in the (?:thoracic|abdominal|cranial|spinal) cavity/i,
          /\b(?:thoracic|abdominal|cranial|spinal) cavity (?:holds|contains)[^.;]*\bbladder/i,
          /\b(?:urinary )?bladder\b[^.]{0,20}\bnot in the pelvic cavity/i] }
    }
  },
  {
    concept: "Heart chambers, septum and blood vessels",
    skill: "Name a heart chamber, the septum or a vessel from its place and direction",
    questions: {
      "an-01": { owner: HEART_LUNGS, facts: [[/\bleft ventricle pumps oxygen-rich blood into the aorta\b/i, /\bbody\b/i],
        [/\bright ventricle pumps blood to the lungs\b/i]],
        never: [/\bright ventricle pumps (?:oxygen-rich )?blood (?:in)?to the (?:aorta|body|rest of the body)/i] },
      "an-19": { owner: HEART_LUNGS, facts: [[/\bseptum\b/i, /\bseparates the right side of the heart from the left side\b/i]] },
      "an-25": { owner: HEART_LUNGS, facts: [[/\baorta\b/i, /\bleaves the left ventricle\b/i, /\bis the largest artery in the body\b/i]],
        never: [/\baorta\b[^.]{0,40}\blargest vein/i] },
      "an-26": { owner: HEART_LUNGS, facts: [[/\bcapillaries are the smallest blood vessels\b/i, /\bconnect the arterioles to the venules\b/i]],
        never: [/\b(?:arterioles|venules) are the smallest blood vessels/i] }
    }
  },
  {
    concept: "Airway and the muscle of breathing",
    skill: "Follow air from the throat to the alveoli; name the breathing muscle",
    questions: {
      "an-02": { owner: HEART_LUNGS, facts: [[/\bdiaphragm\b/i, /\bmain muscle of breathing\b/i]] },
      "an-08": { owner: HEART_LUNGS, facts: [[/\btrachea, the windpipe\b/i], [/\blarynx, the voice box\b/i], [/\besophagus is the food tube\b/i]],
        never: [/\btrachea\b[^.]{0,20}\bvoice box/i] },
      "an-09": { owner: HEART_LUNGS, facts: [[/\balveoli are where oxygen and carbon dioxide are exchanged with the blood\b/i]] }
    }
  },
  {
    concept: "Digestive tract",
    skill: "Put the food path in order and place an organ on it",
    questions: {
      "an-05": { owner: FOOD_URINE, facts: [[/\bsmall intestine\b/i, /\bwhere most nutrients are absorbed\b/i]],
        never: [/\blarge intestine[^.]{0,40}\bwhere most nutrients are absorbed/i] },
      "an-27": { owner: FOOD_URINE, facts: [[/\bpharynx\b/i, /\besophagus\b/i, /\bto the stomach\b/i]] },
      "an-28": { owner: FOOD_URINE, facts: [[/\bappendix\b/i, /\bcecum\b/i, /\bfirst part of the large intestine\b/i]],
        never: [/\bappendix\b[^.]{0,40}\battached to the small intestine/i] }
    }
  },
  {
    concept: "Urinary tract",
    skill: "Put the urine path in order; tell ureter from urethra",
    questions: {
      "an-06": { owner: FOOD_URINE, facts: [[/\bkidney\b/i, /\btiny filtering units called nephrons\b/i]] },
      "an-29": { owner: FOOD_URINE, facts: [[/\bureters\b/i, /\bone from each kidney down to the bladder\b/i],
        [/\burethra\b/i, /\bfrom the bladder out of the body\b/i]],
        never: [/\burethras?\b[^.]{0,30}\bfrom (?:each|the) kidneys?/i] }
    }
  },
  {
    concept: "Bones by region",
    skill: "Name a bone or bone group from its region",
    questions: {
      "an-07": { owner: FRAME, facts: [[/\brib cage\b/i, /\bprotects the heart and lungs\b/i]] },
      "an-20": { owner: FRAME, facts: [[/\bfemur, the thigh bone, is the longest and strongest bone in the body\b/i]] },
      "an-21": { owner: FRAME, facts: [[/\bvertebrae\b/i, /\bform the spinal column\b/i]] },
      "an-22": { owner: FRAME, facts: [[/\bcarpals are the small bones of the wrist\b/i], [/\btarsals are the bones of the ankle\b/i]],
        never: [/\bcarpals are (?:in )?the (?:small )?bones of the ankle|\bcarpals are in the ankle/i] }
    }
  },
  {
    concept: "Muscles, tendons and ligaments",
    skill: "Say what a tendon and a ligament join; name the largest muscle by mass",
    questions: {
      "an-03": { owner: FRAME, facts: [[/\btendons join muscles to bones\b/i], [/\bligaments join bones to other bones\b/i]],
        never: [/\bligaments? (?:join|joins|connect|connects|fix|fixes|attach|attaches)\s+(?:a |the )?muscles?/i,
          /\btendons? (?:join|joins|connect|connects)\s+(?:a |the )?bones? to/i] },
      "an-30": { owner: FRAME, facts: [[/\bby mass\b/i, /\blargest muscle\b/i, /\bgluteus maximus\b/i], [/\blongest muscle\b/i, /\bsartorius\b/i]],
        never: [/\bsartorius\b[^.]{0,40}\blargest/i] }
    }
  },
  {
    concept: "Nervous system organisation",
    skill: "Divide the CNS from the PNS; place the cerebellum with direction terms",
    questions: {
      "an-23": { owner: FRAME, facts: [[/\bcentral nervous system\b/i, /\bis the brain and the spinal cord\b/i],
        [/\bperipheral nervous system\b/i, /\bnerves outside them\b/i]],
        never: [/\bperipheral nervous system (?:\(PNS\) )?is the brain/i] },
      "an-24": { owner: FRAME, facts: [[/\bcerebellum is inferior and posterior to the cerebrum\b/i]] }
    }
  },
  {
    concept: "Skin as an organ",
    skill: "Name the skin as the largest organ and its system",
    questions: {
      "an-04": { owner: FRAME, facts: [[/\bskin\b/i, /\bthe largest organ of the body\b/i], [/\bintegumentary system\b/i, /\bhair and nails\b/i]],
        never: [/\bliver\b[^.]{0,30}\bis the largest organ of the body/i] }
    }
  }
];

/** Bank anatomy questions no anatomy lesson teaches yet, each with the reason. Empty: all 30 are taught. */
const NOT_YET_TAUGHT: Readonly<Record<string, string>> = {};

// ---- helpers ------------------------------------------------------------------------------------------
function sourceOf(id: string): ConceptEducationLessonSource {
  const entry = getEducationLesson(id);
  assert.ok(entry && isConceptEducationLessonEntry(entry), `${id} is a registered concept lesson`);
  return entry.source;
}

/** Every learner-facing string of one lesson, in no particular order. */
function lessonStrings(source: ConceptEducationLessonSource): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk({ name: source.name, description: source.description, lesson: source.lesson });
  return out;
}

/**
 * The lesson's AFFIRMATIVE teaching: what it states as true. Checks are excluded (a fact only in a
 * check is tested, not taught), and so is every deliberately wrong statement: the worked example's
 * weak answer, a more-examples weak answer, the misconception's wrong model and each common mistake
 * as stated. Scenario prompts and set-ups are excluded because they pose, not teach.
 */
function teachingStrings(source: ConceptEducationLessonSource): string[] {
  const c = source.lesson.content;
  return [
    c.objective, c.explanation, c.whyMatters, ...c.steps,
    c.workedExample.strongAnswer, c.workedExample.whyItWorks,
    ...(c.teachingSections ?? []).flatMap((s) => [s.heading, s.body]),
    ...(c.additionalExamples ?? []).flatMap((e) => [e.strong, e.explanation]),
    ...(c.misconception ? [c.misconception.whyItFails, c.misconception.betterModel] : []),
    ...(c.commonMistakes ?? []).flatMap((m) => [m.whyItFails, m.fix])
  ];
}
// Sentences end at . ! or ? before a space, or at a line break. Colons and semicolons stay inside, so
// "ureters: two tubes, one from each kidney down to the bladder." is one sentence.
const sentencesOf = (texts: readonly string[]) =>
  texts.flatMap((t) => t.split(/(?<=[.!?])\s+|\n+/)).map((s) => s.trim()).filter(Boolean);
const teachingSentences = (id: string) => sentencesOf(teachingStrings(sourceOf(id)));
const statesFact = (sentences: readonly string[], fact: Fact) => sentences.some((s) => fact.every((p) => p.test(s)));

const allQuestions = (source: ConceptEducationLessonSource) => {
  const c = source.lesson.content;
  return [c.guidedQuestion, ...c.practiceQuestions, ...c.masteryCheck];
};

const ANATOMY_BANK = (): MedTermQuestion[] => MEDTERM_BANK.filter((q) => q.area === "anatomy");
const taughtIndex = () => {
  const index = new Map<string, { concept: string; taught: Taught }>();
  for (const row of CENSUS) for (const [id, taught] of Object.entries(row.questions)) index.set(id, { concept: row.concept, taught });
  return index;
};

async function main() {
  console.log("\nhosa-medterm-anatomy:smoke\n");

  // ---- A. registration -----------------------------------------------------------------------------
  await check("A. the anatomy module follows the word parts in one course, one chain, by reference", () => {
    assert.deepEqual([...PUBLISHED_HOSA_SLUGS], [...WORD_PART_ORDER, ...ANATOMY_ORDER, ...PHYSIOLOGY_ORDER, ...PATHOPHYSIOLOGY_ORDER],
      "A1. the track file publishes word parts, then anatomy, then physiology, then pathophysiology");
    assert.deepEqual(HOSA_PUBLISHED_LESSONS.map((e) => e.id), [...WORD_PART_ORDER, ...ANATOMY_ORDER, ...PHYSIOLOGY_ORDER, ...PATHOPHYSIOLOGY_ORDER],
      "A1b. and registers them in that order");
    const course = EDUCATION_COURSES.find((c) => c.id === HOSA_MEDTERM_STUDY_COURSE);
    assert.ok(course && course.track === "HOSA", "A2. the Medical Terminology course exists on the HOSA track");
    assert.deepEqual(course.moduleIds, ["hosa-medterm-word-parts", ANATOMY_MODULE, "hosa-medterm-physiology", "hosa-medterm-pathophysiology"],
      "A2b. with the anatomy module after the word parts, then physiology, then pathophysiology");
    const anatomyModule = getEducationModule(ANATOMY_MODULE);
    assert.ok(anatomyModule && anatomyModule.courseId === HOSA_MEDTERM_STUDY_COURSE && anatomyModule.track === "HOSA", "A2c. the module belongs to that course");
    assert.equal(anatomyModule.label, "Anatomy", "A2d. its learner-facing label says what it is");
    assert.equal(anatomyModule.prerequisiteId, "hosa-medterm-word-parts", "A2e. and it builds on the word-part module");
    assert.ok(!/physiolog|disease|patholog/i.test(`${anatomyModule.label} ${anatomyModule.outcome}`), "A2f. its outcome claims no physiology or disease");
    assert.equal(getEducationLesson(WORD_PART_ORDER[3])?.nextLessonId, BODY_MAP, "A3. the last word-part lesson continues into anatomy");
    for (const [index, id] of ANATOMY_ORDER.entries()) {
      const entry = getEducationLesson(id);
      assert.ok(entry, `A4. ${id} is registered`);
      assert.equal(entry.track, "HOSA", `A4b. ${id} is HOSA`);
      assert.equal(entry.courseId, HOSA_MEDTERM_STUDY_COURSE, `A4c. ${id} is in the Medical Terminology course`);
      assert.equal(entry.moduleId, ANATOMY_MODULE, `A4d. ${id} is in the anatomy module`);
      assert.equal(entry.variant, "concept", `A4e. ${id} is a concept lesson`);
      assert.equal(entry.visibility, "learner", `A4f. ${id} is learner-visible`);
      assert.equal(entry.practiceState, "available", `A4g. ${id} has its own checks`);
      assert.equal(entry.nextLessonId, ANATOMY_ORDER[index + 1] ?? PHYSIOLOGY_ORDER[0],
        `A5. ${id} chains to the next anatomy lesson, the last into the physiology module`);
      assert.equal(entry.skillSlug, undefined, `A5b. ${id} claims no skill`);
      assert.equal(entry.practiceDrill, undefined, `A5c. ${id} names no drill`);
      const original = LEARNING_SKILL_CATALOG.find((c) => c.slug === id);
      assert.ok(original && entry.source === original, `A6. ${id} holds the ORIGINAL catalog object`);
      assert.ok(entry.provenance === STABLE_TEACHING_HOSA_ANATOMY_PROVENANCE, `A7. ${id} carries the anatomy provenance`);
      const shown = presentSourceFreshness(entry.provenance);
      assert.equal(shown.degraded, false, `A7b. ${id} provenance does not degrade`);
      assert.equal(shown.authority, "stable-teaching", `A7c. ${id} is presented as stable teaching`);
      assert.match(shown.authorityLabel, /not a current-rules source/, `A7d. ${id} says it is not a rules source`);
    }
    // Every HOSA chain in the registry is acyclic and the course has one end.
    const ends = educationLessonsForTrack("HOSA").filter((e) => e.courseId === HOSA_MEDTERM_STUDY_COURSE && e.nextLessonId === null);
    assert.deepEqual(ends.map((e) => e.id), [PATHOPHYSIOLOGY_ORDER[4]], "A8. the course has exactly one end, now after the pathophysiology module");
    assert.deepEqual(
      educationLessonsForTrack("HOSA").filter((e) => e.courseId === HOSA_MEDTERM_STUDY_COURSE).map((e) => e.id),
      [...WORD_PART_ORDER, ...ANATOMY_ORDER, ...PHYSIOLOGY_ORDER, ...PATHOPHYSIOLOGY_ORDER], "A8b. and the course lists its lessons in chain order");
  });

  await check("A9. the anatomy label says AI-generated, not official HOSA material, not yet reviewed by a person", () => {
    const label = STABLE_TEACHING_HOSA_ANATOMY_PROVENANCE.sourceLabel ?? "";
    assert.ok(Object.isFrozen(STABLE_TEACHING_HOSA_ANATOMY_PROVENANCE), "A9. the provenance object is frozen");
    assert.equal(STABLE_TEACHING_HOSA_ANATOMY_PROVENANCE.organization, "CompeteReady", "A9b. attributed to CompeteReady");
    assert.match(label, /^AI-generated CompeteReady lesson\b/, "A9c. AI-generated CompeteReady instruction");
    assert.match(label, /not an official HOSA lesson or test item/, "A9d. and not an official HOSA lesson or test item");
    assert.match(label, /not yet reviewed by a person/, "A9e. and not yet reviewed by a person");
    // The word-part label is its own constant, untouched by this module.
    assert.equal(STABLE_TEACHING_HOSA_PROVENANCE.sourceLabel, "AI-generated CompeteReady lesson, not an official HOSA lesson or test item — not yet reviewed by a person",
      "A9f. control: the word-part lessons keep their own constant, with the same wording");
    // The authoring record in the catalog says the same, and names the review gate.
    const catalog = read("lib/learning-content.ts");
    const record = catalog.slice(catalog.indexOf("---- HOSA MEDICAL TERMINOLOGY: ANATOMY"), catalog.indexOf(`slug: "${BODY_MAP}"`));
    assert.ok(record.length > 0, "A9g. control: the anatomy authoring record was located");
    assert.match(record, /AI-drafted/, "A9h. the record says the lessons were AI-drafted");
    assert.match(record, /have NOT yet\s+\/\/\s+had a human content review|have NOT yet had a human content review/,
      "A9i. and have not had a human content review");
    assert.match(record, /subject-accuracy review before release/, "A9j. and that a subject-accuracy review is required before release");
    assert.match(record, /before changing the label or pushing these lessons/, "A9k. before the label changes or the lessons are pushed");
  });

  // ---- B. the census --------------------------------------------------------------------------------
  await check("B. every one of the bank's anatomy questions is classified, with a teaching owner or a reason", () => {
    const bank = ANATOMY_BANK();
    assert.equal(bank.length, 30, "B1. the bank asks 30 anatomy questions");
    assert.deepEqual(bank.map((q) => q.id), Array.from({ length: 30 }, (_, i) => `an-${String(i + 1).padStart(2, "0")}`),
      "B1b. an-01 to an-30, in order");
    const index = taughtIndex();
    const censused = [...index.keys(), ...Object.keys(NOT_YET_TAUGHT)];
    assert.equal(new Set(censused).size, censused.length, "B2. no question is classified twice");
    assert.deepEqual([...censused].sort(), bank.map((q) => q.id).sort(), "B2b. and every bank question is classified, nothing else");
    for (const [id, reason] of Object.entries(NOT_YET_TAUGHT)) assert.ok(reason.trim(), `B2c. ${id} says why it is not taught`);
    for (const row of CENSUS) {
      assert.ok(row.concept.trim() && row.skill.trim(), `B3. "${row.concept}" names the skill it needs`);
      assert.ok(Object.keys(row.questions).length > 0, `B3b. "${row.concept}" is backed by at least one bank question`);
    }
    // Every lesson owns questions, so none is decoration, and each owns concepts no other lesson owns.
    const owners = new Map<string, Set<string>>();
    for (const row of CENSUS) for (const taught of Object.values(row.questions)) {
      owners.set(taught.owner, new Set([...(owners.get(taught.owner) ?? []), row.concept]));
    }
    for (const id of ANATOMY_ORDER) assert.ok((owners.get(id)?.size ?? 0) > 0, `B4. ${id} owns at least one tested concept`);
    for (const row of CENSUS) {
      const lessons = new Set(Object.values(row.questions).map((t) => t.owner));
      assert.equal(lessons.size, 1, `B4b. "${row.concept}" has one teaching owner, not several`);
    }
  });

  // ---- C. alignment ---------------------------------------------------------------------------------
  await check("C. each taught question's fact is stated in its owner lesson's teaching, and the wrong one never is", () => {
    const index = taughtIndex();
    const moduleSentences = ANATOMY_ORDER.flatMap((id) => teachingSentences(id));
    for (const q of ANATOMY_BANK()) {
      const row = index.get(q.id);
      if (!row) continue;
      const sentences = teachingSentences(row.taught.owner);
      assert.ok(row.taught.facts.length > 0, `C1. ${q.id} names the fact that answers it`);
      for (const fact of row.taught.facts) {
        assert.ok(statesFact(sentences, fact), `C2. ${q.id} (${q.correctAnswer}): ${row.taught.owner} teaches ${fact.map((p) => p.source).join(" + ")}`);
      }
      for (const wrong of row.taught.never ?? []) {
        assert.ok(!moduleSentences.some((s) => wrong.test(s)), `C3. ${q.id}: no anatomy lesson teaches ${wrong.source}`);
      }
    }
    // Controls. A fact present only in a check or a weak answer is not teaching, and a fact split
    // across two sentences is not one fact.
    const heart = sourceOf(HEART_LUNGS);
    const checkStrings = allQuestions(heart)
      .flatMap((q) => [q.prompt, q.hint, q.explanation, (q as { retryPrompt?: string }).retryPrompt, ...q.choices])
      .filter((s): s is string => typeof s === "string");
    assert.ok(checkStrings.length > 0 && checkStrings.every((s) => !teachingStrings(heart).includes(s)),
      "C4. control: no check text (prompt, hint, explanation, choice) is counted as teaching");
    // Every text field of every check carries its own sentinel, and the teaching text is searched as
    // one string, so a change that joined check text into a teaching string would be caught too.
    const SENTINEL = "SENTINEL-CHECK-ONLY.";
    const planted = JSON.parse(JSON.stringify(heart)) as ConceptEducationLessonSource;
    const sentinels: string[] = [];
    const mark = () => { const s = `SENTINEL-CHECK-ONLY-${sentinels.length}.`; sentinels.push(s); return s; };
    for (const q of allQuestions(planted)) {
      const m = q as unknown as { prompt: string; hint: string; explanation: string; retryPrompt?: string; choices: string[] };
      m.prompt = mark();
      m.hint = mark();
      m.explanation = mark();
      if (typeof m.retryPrompt === "string") m.retryPrompt = mark();
      m.choices = m.choices.map(() => mark());
    }
    const plantedTeaching = sentencesOf(teachingStrings(planted)).join("\n");
    assert.ok(sentinels.length >= 35 && sentinels.every((s) => !plantedTeaching.includes(s)),
      "C4a. control: nothing planted in a check's prompt, hint, explanation or choices is teaching");
    const plantedInTeaching = JSON.parse(JSON.stringify(heart)) as ConceptEducationLessonSource;
    (plantedInTeaching.lesson.content as { explanation: string }).explanation = SENTINEL;
    assert.ok(sentencesOf(teachingStrings(plantedInTeaching)).includes(SENTINEL), "C4a2. control: the same sentence in the explanation is");
    assert.ok(!teachingStrings(heart).includes(heart.lesson.content.workedExample.weakAnswer), "C4b. control: a weak answer is not teaching");
    assert.ok(!statesFact(["The septum is a wall.", "It separates the right side of the heart from the left side."],
      [/\bseptum\b/i, /\bseparates the right side of the heart from the left side\b/i]), "C4c. control: a fact split over two sentences does not count");
    assert.ok(statesFact(sentencesOf(["ureters: two tubes, one from each kidney down to the bladder."]),
      [/\bureters\b/i, /\bone from each kidney down to the bladder\b/i]), "C4d. control: a colon does not end a sentence");
  });

  await check("C5. alignment report: 30 anatomy questions, taught and not yet taught", () => {
    const taught = [...taughtIndex().keys()];
    const notTaught = Object.keys(NOT_YET_TAUGHT);
    assert.equal(taught.length + notTaught.length, 30, "C5. every question counted once");
    assert.equal(taught.length, 30, "C5b. all thirty are taught by the anatomy module");
    assert.equal(notTaught.length, 0, "C5c. none is left untaught");
    console.log("       ANATOMY QUESTIONS: 30");
    console.log(`       TAUGHT BY NEW MODULE: ${taught.length}`);
    console.log(`       NOT YET TAUGHT: ${notTaught.length}`);
    for (const row of CENSUS) {
      const ids = Object.keys(row.questions);
      const owner = getEducationLesson(Object.values(row.questions)[0].owner)!;
      const title = isConceptEducationLessonEntry(owner) ? owner.source.lesson.title : owner.id;
      console.log(`       ${row.concept} | ${ids.join(", ")} (${ids.length}) | ${row.skill} | ${title}`);
    }
  });

  // ---- D. the checks -----------------------------------------------------------------------------------
  await check("D. every check is complete, taught, original, explained, and not answerable from form alone", () => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9/ -]/g, " ").split(/\s+/).filter(Boolean);
    const overlap = (a: string[], b: string[]) => {
      const A = new Set(a);
      const B = new Set(b);
      let shared = 0;
      for (const token of A) if (B.has(token)) shared += 1;
      return shared / (A.size + B.size - shared);
    };
    const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "its", "are", "both", "one", "two", "each", "than",
      "it", "to", "of", "in", "an", "a", "is", "on"]);
    // A crude stemmer, applied to both sides alike: "encloses" and "enclose" both become "enclos".
    const stem = (w: string) => w.replace(/ies$/, "y").replace(/(?<=[a-z]{3})(?:es|s)$/, "").replace(/(?<=[a-z]{3})e$/, "");
    const contentWords = (s: string) => (s.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length >= 3 && !STOP.has(w)).map(stem);
    let total = 0;
    let keyIsLongest = 0;
    const positions = new Set<number>();
    const counts: number[] = [];
    for (const id of ANATOMY_ORDER) {
      const source = sourceOf(id);
      const questions = allQuestions(source);
      counts.push(questions.length);
      assert.ok(questions.length >= 5 && questions.length <= 7, `D1. ${id} has five to seven checks (${questions.length})`);
      assert.equal(source.lesson.content.masteryCheck.length, 1, `D1b. ${id} ends with one final check`);
      const taughtWords = new Set(teachingStrings(source).flatMap(contentWords));
      const lessonPositions = new Set<number>();
      for (const q of questions) {
        total += 1;
        const at = `"${q.prompt.slice(0, 50)}"`;
        assert.equal(q.choices.length, 4, `D2. ${at} offers four choices`);
        assert.equal(new Set(q.choices).size, q.choices.length, `D2b. ${at} has no duplicate choice`);
        const position = q.choices.indexOf(q.correctAnswer);
        assert.ok(position >= 0 && q.choices.lastIndexOf(q.correctAnswer) === position, `D2c. ${at} keys exactly one of its own choices`);
        assert.ok(q.hint.trim() && q.explanation.trim() && q.skillTag.trim(), `D2d. ${at} has hint, explanation and tag`);
        assert.ok(!q.hint.toLowerCase().includes(q.correctAnswer.toLowerCase()), `D2e. ${at}'s hint does not give the answer away`);
        assert.ok(q.explanation.length >= 80 && q.explanation !== q.correctAnswer, `D3. ${at} explains its answer rather than restating it`);
        assert.ok(!q.choices.some((c) => /all of the above|none of the above|not sure|it depends|any of these/i.test(c)),
          `D3b. ${at} has no catch-all choice`);
        // Tests the lesson: every content word of the key is taught in this lesson's teaching text.
        for (const word of contentWords(q.correctAnswer)) {
          assert.ok(taughtWords.has(word), `D3c. ${at}: the key's "${word}" is taught in ${id}, so the check tests the lesson`);
        }
        lessonPositions.add(position);
        positions.add(position);
        const lengths = q.choices.map((c) => c.length);
        const longest = Math.max(...lengths);
        if (q.correctAnswer.length === longest && lengths.filter((l) => l === longest).length === 1) keyIsLongest += 1;
        for (const item of MEDTERM_BANK) {
          assert.ok(overlap(norm(q.prompt), norm(item.question)) < 0.6, `D4. ${at} is not a copy of bank item ${item.id}`);
        }
      }
      assert.ok(lessonPositions.size >= 3, `D5. ${id} spreads its keys over at least three positions`);
    }
    assert.equal(total, counts.reduce((a, b) => a + b, 0), "D6. every check counted");
    assert.equal(total, 28, "D6a. twenty-eight checks across the module");
    assert.equal(positions.size, 4, "D6b. every answer position is used somewhere in the module");
    assert.ok(keyIsLongest <= total / 4, `D6c. the key is the uniquely longest choice in at most a quarter of checks (${keyIsLongest}/${total})`);
    assert.ok(MEDTERM_BANK.some((item) => overlap(norm("The largest artery in the whole body is the:"), norm(item.question)) >= 0.6),
      "D7. control: a one-word rewording of a bank question is caught by the originality measure");
  });

  await check("D8. each check's explanation argues for its own key", () => {
    // The word-part lessons' measure (hosa-medterm-lessons-smoke D8): for every wrong choice, the
    // explanation uses a word only the key has before it uses a word only that wrong choice has. A
    // check re-keyed to any wrong choice then fails, because its explanation still argues for the key.
    const STOP = new Set(["the", "and", "for", "with", "that", "this", "because", "from", "into", "only", "not", "its",
      "are", "was", "has", "have", "been", "than", "then", "them", "they", "what", "which", "when", "where", "who", "why",
      "how", "but", "you", "your", "all", "any", "each"]);
    const stem = (w: string) => w.replace(/ies$/, "y").replace(/(?<=[a-z]{3})(?:es|s)$/, "");
    const words = (s: string) => (s.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length >= 3 && !STOP.has(w)).map(stem);
    const units = (s: string) => {
      const w = words(s);
      return new Set([...w, ...w.slice(1).map((x, i) => `${w[i]} ${x}`)]);
    };
    const uses = (said: string, unit: string) => said === unit || (unit.length >= 4 && said.startsWith(unit));
    const firstUse = (said: string[], evidence: Set<string>) => {
      for (let i = 0; i < said.length; i += 1) {
        for (const unit of evidence) {
          const [a, b] = unit.split(" ");
          if (b === undefined ? uses(said[i], a) : i > 0 && uses(said[i - 1], a) && uses(said[i], b)) return i;
        }
      }
      return Infinity;
    };
    const arguesFor = (q: { prompt: string; choices: readonly string[]; explanation: string }, key: string) => {
      const prompt = units(q.prompt);
      const said = words(q.explanation);
      const forKey = units(key);
      return q.choices.filter((choice) => choice !== key).every((wrong) => {
        const forWrong = units(wrong);
        const keyOnly = new Set([...forKey].filter((u) => !forWrong.has(u) && !prompt.has(u)));
        const wrongOnly = new Set([...forWrong].filter((u) => !forKey.has(u) && !prompt.has(u)));
        return firstUse(said, keyOnly) < firstUse(said, wrongOnly);
      });
    };
    let rekeyed = 0;
    for (const id of ANATOMY_ORDER) {
      for (const q of allQuestions(sourceOf(id))) {
        assert.ok(arguesFor(q, q.correctAnswer), `D8. "${q.prompt.slice(0, 50)}" explains why its key is right before it names a wrong choice`);
        for (const wrong of q.choices.filter((choice) => choice !== q.correctAnswer)) {
          assert.ok(!arguesFor(q, wrong), `D8b. control: "${q.prompt.slice(0, 50)}" re-keyed to "${wrong}" is caught`);
          rekeyed += 1;
        }
      }
    }
    assert.equal(rekeyed, 84, "D8c. control: every wrong choice of all 28 checks was tried as a key");
  });

  await check("D9. the checks save nothing and claim no mastery; the last one is a Final check", () => {
    const practice = stripComments(read("components/lessons/concept-education-lesson-practice.tsx"));
    assert.match(practice, /final:\s*"Final check"/, "D9. the last check is labelled Final check");
    for (const banned of ["fetch(", "@/lib/prisma", "localStorage", "recordPracticeOutcome", "MasteryProgress"]) {
      assert.ok(!practice.includes(banned), `D9b. the lesson checks contain no ${banned}`);
    }
    for (const id of ANATOMY_ORDER) {
      const text = lessonStrings(sourceOf(id)).join("\n");
      assert.ok(!/master(?:y|ed|ing)?\b|mastery test|readiness|\bXP\b|streak/i.test(text), `D9c. ${id} claims no mastery, readiness or XP`);
    }
  });

  // ---- E. no official claim, no number, no clinical advice, no other track -------------------------
  await check("E. the lessons state no HOSA rule, invent no number, give no clinical advice, and carry no other track", () => {
    const CLAIMS: ReadonlyArray<readonly [label: string, pattern: RegExp, claim: string]> = [
      ["the organization's name", /\bHOSA\b/, "HOSA tests these structures every year."],
      ["points or scores", /\b\d+\s*points?\b|\bpoints? (?:each|per|for)\b|\bscor(?:e|es|ed|ing)\b|rating sheet/i, "Each correct answer scores 2 points."],
      ["any number", /\d/, "The adult skeleton has 206 bones."],
      ["rules, guidelines or exams", /\b(?:HOSA|event|official|competition)\s+rules?\b|guideline|\bexam\b|competition|test coverage|on the test/i,
        "This is on the test every year."],
      ["diagnosis or treatment", /\bdiagnos|\btreat(?:ment|ing|s|ed)?\b|\bmedication|\bdose\b|\bprescri|\bsymptom|\bcure\b|\bsee a doctor\b/i,
        "If your side hurts, treatment is rest."],
      ["another track", /\bDECA\b|debate|role-?play|performance indicator|\bjudge\b|rebuttal/i, "A judge would expect this."]
    ];
    for (const id of ANATOMY_ORDER) {
      const source = sourceOf(id);
      const text = lessonStrings(source).join("\n");
      assert.ok(source.lesson.content.workedExample.prompt.endsWith("(Our example, not an official test question.)"),
        `E1. ${id}'s worked example says it is ours, not an official question`);
      const officialUses = text.match(/official/gi) ?? [];
      const labelled = text.match(/not an official test question/g) ?? [];
      assert.equal(officialUses.length, labelled.length, `E2. ${id} uses "official" only to say its example is not one`);
      for (const [label, pattern] of CLAIMS) assert.ok(!pattern.test(text), `E3. ${id} mentions no ${label}`);
    }
    for (const [label, pattern, claim] of CLAIMS) assert.ok(pattern.test(claim), `E4. control: the ${label} scan catches "${claim}"`);
  });

  // ---- F. the learning graph and the practice destination -------------------------------------------
  await check("F1. the right practice link sits on the right lesson, and the anatomy end copy names what comes next", () => {
    // Exhaustive over the registry: the course-end action appears only at the course's end.
    for (const entry of EDUCATION_LESSONS) {
      const isEnd = entry.track === "HOSA" && entry.courseId === HOSA_MEDTERM_STUDY_COURSE && entry.visibility === "learner" && entry.nextLessonId === null;
      assert.equal(hosaCourseEndAction(entry.id) !== null, isEnd, `F1. ${entry.id}: course-end action only at the course's end`);
      assert.ok(!(hosaCourseEndAction(entry.id) && decaCourseEndAction(entry.id)), `F1b. ${entry.id}: at most one course-end action`);
    }
    assert.equal(hosaCourseEndAction(FRAME), null, "F2. the last anatomy lesson is no longer the course end");
    assert.equal(hosaLessonPracticeReturn(FRAME), HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY,
      "F2a. but it still ends the anatomy module in anatomy practice, beside the next lesson");
    assert.equal(hosaLessonPracticeReturn(WORD_PART_ORDER[3]), HOSA_MEDTERM_PRACTICE_ENTRY,
      "F2b. the last word-part lesson keeps its word-part practice link, beside the next lesson");
    assert.equal(hosaLessonPracticeReturn(BODY_MAP), HOSA_MEDTERM_ANATOMY_PRACTICE_RETURN, "F2c. the first anatomy lesson links back to anatomy practice");
    assert.equal(hosaLessonPracticeLink(HEART_LUNGS), null, "F2d. the middle anatomy lessons own no area and do not jump ahead");
    assert.equal(hosaLessonPracticeLink(FOOD_URINE), null, "F2e. nor does the third");
    const target = new URL(HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY.href, "http://localhost");
    assert.equal(target.pathname, HOSA_MEDTERM_PRACTICE_ROOM, "F3. the anatomy link leads to the event's practice room");
    assert.equal(medTermFocusFromParam(target.searchParams.get(HOSA_MEDTERM_FOCUS_PARAM) ?? undefined), "anatomy", "F3b. with anatomy preselected");
    assert.equal(HOSA_MEDTERM_ANATOMY_PRACTICE_RETURN.href, HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY.href, "F3c. both anatomy links open the same choice");
    for (const link of [HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY, HOSA_MEDTERM_ANATOMY_PRACTICE_RETURN, HOSA_MEDTERM_PRACTICE_ENTRY]) {
      assert.ok(Object.isFrozen(link), `F4. "${link.label}" is frozen`);
      const copy = `${link.label} ${link.detail}`;
      assert.ok(!/record|saved|\bsave|mastery|progress|nothing is|score|\bready\b/i.test(copy), `F4b. "${link.label}" makes no persistence or mastery claim`);
      assert.ok(!/disease has no lessons|no lessons on disease/i.test(copy), `F4c. "${link.label}" no longer says disease is untaught`);
    }
    // The anatomy links may say the lessons AFTER them teach function and disease; they must not say these lessons do.
    const claimsLater = /\b(?:these|the anatomy) lessons\b[^.]{0,40}\b(?:cover|teach|explain)\w*\b[^.]{0,20}\b(?:physiology|pathophysiology|disease|how the (?:healthy )?body works)\b/i;
    for (const link of [HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY, HOSA_MEDTERM_ANATOMY_PRACTICE_RETURN]) {
      assert.ok(!claimsLater.test(`${link.label} ${link.detail}`), `F4d. "${link.label}" claims no physiology or disease teaching for the anatomy lessons`);
    }
    assert.ok(claimsLater.test("These lessons also teach physiology."), "F4e. control: the scan catches a physiology claim for these lessons");
    assert.ok(!claimsLater.test("The lessons after this one are about physiology and then disease (pathophysiology)."), "F4f. control: and passes a true statement about the later lessons");
    assert.match(HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY.detail, /original questions, not official HOSA test items/, "F5. the end copy says the questions are original");
    assert.match(HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY.detail, /The lessons after this one are about physiology and then disease \(pathophysiology\)/,
      "F5b. and names what comes next");
    assert.match(HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY.detail, /nothing starts until you press start/, "F5c. and that nothing starts on arrival");
    assert.match(HOSA_MEDTERM_PRACTICE_ENTRY.detail, /The lessons after this one teach anatomy, physiology and disease \(pathophysiology\)/,
      "F5d. the word-part end copy no longer says any later area is untaught");
    assert.match(HOSA_MEDTERM_ANATOMY_PRACTICE_RETURN.detail, /a later lesson in this course teaches/, "F5e. the return copy says later lessons teach more");
  });

  await check("F6. each lesson renders its teaching, its label, and its own onward step", () => {
    const render = (id: string) => {
      const entry = getEducationLesson(id)!;
      const next = entry.nextLessonId ? { id: entry.nextLessonId, title: sourceOf(entry.nextLessonId).lesson.title } : null;
      return decode(renderToStaticMarkup(React.createElement(ConceptEducationLessonView, {
        source: sourceOf(id),
        provenance: entry.provenance,
        moduleLabel: getEducationModule(entry.moduleId)!.label,
        next,
        courseEndAction: decaCourseEndAction(id) ?? hosaCourseEndAction(id) ?? undefined,
        practiceReturn: hosaLessonPracticeReturn(id) ?? undefined
      })));
    };
    for (const id of ANATOMY_ORDER) {
      const html = render(id);
      const text = visible(html);
      const source = sourceOf(id);
      assert.ok(text.includes(source.lesson.title), `F6. ${id} renders its title`);
      assert.ok(text.includes("HOSA") && text.includes("Anatomy"), `F6b. ${id} is badged HOSA and Anatomy`);
      assert.ok(text.includes(STABLE_TEACHING_HOSA_ANATOMY_PROVENANCE.sourceLabel!), `F6c. ${id} shows the learner its label`);
      assert.ok(text.includes("not official competition material"), `F6d. ${id} keeps the teaching-lesson disclaimer`);
      const teachAt = html.indexOf(source.lesson.content.explanation.slice(0, 40));
      const checksAt = html.indexOf('id="practice"');
      assert.ok(teachAt >= 0 && checksAt > teachAt, `F6e. ${id} teaches before it checks`);
      assert.ok(text.includes("Final check"), `F6f. ${id} calls its last check a Final check`);
      assert.ok(!/master/i.test(visible(html.slice(0, checksAt))), `F6g. ${id}'s teaching claims no mastery`);
      // The checks' own honesty statement is the one place the page says the word, to deny it.
      const claims = text.replace(/no progress, no mastery, no XP/, "").replace(/not evidence that you have mastered the skill/, "");
      assert.ok(!/master/i.test(claims), `F6g2. ${id} mentions mastery only to say the checks are not it`);
      assert.ok(text.includes("Nothing here is saved"), `F6h. ${id} says its checks save nothing`);
      const entry = getEducationLesson(id)!;
      if (entry.nextLessonId) {
        const continueAt = html.indexOf(`href="/lessons/${entry.nextLessonId}"`);
        assert.ok(continueAt >= 0, `F6i. ${id} continues to ${entry.nextLessonId}`);
        const practiceAt = html.indexOf(`href="${HOSA_MEDTERM_PRACTICE_ROOM}`);
        if (id === BODY_MAP) assert.ok(practiceAt > continueAt, `F6j. ${id} offers anatomy practice after its next-lesson link`);
        else if (id === FRAME) {
          assert.ok(practiceAt > continueAt && html.includes(`href="${HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY.href}"`),
            `F6k. ${id} ends the anatomy module in anatomy practice, after its next-lesson link`);
          assert.ok(!text.includes("end of this course so far"), `F6l. ${id} no longer says the course ends here`);
        } else assert.equal(practiceAt, -1, `F6j. ${id} does not jump ahead to practice`);
      } else {
        assert.fail(`F6k2. ${id} is not the end of the course: the physiology module follows`);
      }
    }
    const prefixes = render(WORD_PART_ORDER[3]);
    const continueAt = prefixes.indexOf(`href="/lessons/${BODY_MAP}"`);
    assert.ok(continueAt >= 0, "F6m. the last word-part lesson continues into the first anatomy lesson");
    assert.ok(prefixes.indexOf(`href="${HOSA_MEDTERM_PRACTICE_ENTRY.href}"`) > continueAt, "F6n. and still offers word-part practice after that link");
    assert.ok(!visible(prefixes).includes("end of this course so far"), "F6o. and no longer says the course ends there");
  });

  await check("F7. HOSA Learn, Event HQ and the lessons index lead through word parts to anatomy", () => {
    const learn = learnerPathForTrack("HOSA").find((stage) => stage.id === "learn");
    assert.equal(learn?.href, "/lessons?track=hosa", "F7. Learn opens the HOSA lessons catalog");
    assert.match(learn?.note ?? "", /word parts, anatomy, physiology and pathophysiology/, "F7b. and names the anatomy lessons");
    assert.match(learn?.note ?? "", /reading-only communication lesson/, "F7c. while still saying the communication lesson is reading only");
    const hq = read("app/(app)/training/[track]/event/[eventSlug]/page.tsx");
    const hosaEntry = hq.slice(hq.indexOf('"hosa/medical-terminology"'), hq.indexOf('"deca/'));
    assert.ok(hosaEntry.length > 0, "F7d. control: the HOSA Event HQ entry was located");
    assert.match(hosaEntry, /label: "Lessons", detail: "[^"]*then the anatomy, physiology and pathophysiology the practice asks about[^"]*", href: "\/lessons\?track=hosa"/,
      "F7e. Event HQ's lessons row names the anatomy lessons");
    const index = stripComments(read("app/(app)/lessons/page.tsx"));
    assert.match(index, /The last lesson of each module in this course links there\./, "F7f. the index card says which lessons link to practice");
    assert.ok(!/hosa-anatomy-/.test(index), "F7g. and decides by course, never by a hardcoded lesson slug");
  });

  await check("F8. the anatomy choice is taught, serves only anatomy questions, and starts nothing", async () => {
    const anatomy = medTermFocus("anatomy");
    assert.deepEqual(MEDTERM_FOCUS_CHOICES.map((c) => c.id), ["word-parts", "anatomy", "physiology", "pathophysiology", "all"],
      "F8. five choices: word parts, anatomy, physiology and pathophysiology (the later modules'), all");
    assert.deepEqual(anatomy.areas, ["anatomy"], "F8b. the anatomy choice is exactly the anatomy area");
    assert.deepEqual(anatomy.areas, HOSA_MEDTERM_ANATOMY_AREAS, "F8c. through its named list");
    assert.equal(anatomy.taught, true, "F8d. it is marked taught");
    assert.equal(anatomy.moduleId, ANATOMY_MODULE, "F8e. and names the module that teaches it");
    assert.deepEqual(medTermFocus("word-parts").areas, HOSA_MEDTERM_WORD_PART_AREAS, "F8f. control: the word-parts choice still serves word parts only");
    assert.deepEqual(HOSA_MEDTERM_TAUGHT_AREAS, [...HOSA_MEDTERM_WORD_PART_AREAS, "anatomy", "physiology", "pathophysiology"],
      "F8g. taught areas: the word parts, anatomy, and physiology and pathophysiology from the later modules");
    assert.deepEqual(medTermFocusRequestAreas("anatomy"), ["anatomy"], "F8h. a request carries the anatomy area");
    assert.equal(medTermFocusForAreas(["anatomy"]), "anatomy", "F8i. a stored anatomy session is named as the anatomy choice");
    assert.equal(medTermContinuedForOtherChoice(true, ["anatomy"], "anatomy"), false, "F8j. so continuing one under that choice is not flagged");
    assert.equal(medTermContinuedForOtherChoice(true, ["anatomy"], "word-parts"), true, "F8k. but continuing one under another choice is");
    assert.equal(medTermFocusForAreas(["anatomy", "physiology"]), null, "F8l. control: anatomy plus another area is no choice");
    assert.equal(medTermFocusForAreas(["anatomy", "pathophysiology"]), null, "F8l2. control: nor is anatomy plus pathophysiology");
    assert.match(anatomy.disclosure, /physiology\) and disease are not in this choice/, "F8m. the choice says physiology and disease are not in it");
    assert.ok(!/record|saved|\bsave\b|mastery|progress|score|readiness|ready\b/i.test(`${anatomy.label} ${anatomy.summary} ${anatomy.coverage} ${anatomy.disclosure}`),
      "F8n. the choice makes no persistence or mastery claim");

    // The page hands the URL value to the room, which hands it to the engine with per-area counts.
    const { HosaEventPrep } = require("../components/training/hosa-event-prep");
    const engineModule = require("../components/training/hosa-medterm-engine");
    const { HosaMedTermEngine, medTermCountOptions, medTermPoolSize, medTermClampCount } = engineModule;
    const TrackPracticePage = require("../app/(app)/training/[track]/practice/page").default;
    const find = (node: unknown, type: unknown): React.ReactElement | null => {
      if (!node || typeof node !== "object") return null;
      if (Array.isArray(node)) { for (const child of node) { const hit = find(child, type); if (hit) return hit; } return null; }
      const el = node as React.ReactElement<{ children?: unknown }>;
      if (el.type === type) return el;
      return find(el.props?.children, type);
    };
    const page = await TrackPracticePage({ params: { track: "hosa" }, searchParams: { focus: "anatomy" } });
    assert.equal(find(page, HosaEventPrep)?.props.focus, "anatomy", "F9. the practice page hands the room the anatomy choice");
    const room = await HosaEventPrep({ focus: "anatomy" });
    const engine = find(room, HosaMedTermEngine);
    assert.equal(engine?.props.initialFocus, "anatomy", "F9b. the room preselects it");
    const catalog = engine!.props.areas as Array<{ id: string; label: string; questionCount?: number }>;
    for (const area of MEDTERM_AREAS) {
      assert.equal(catalog.find((a) => a.id === area.id)?.questionCount, MEDTERM_BANK.filter((q) => q.area === area.id).length,
        `F9c. the room tells the engine how many ${area.id} questions exist`);
    }
    assert.equal(medTermPoolSize(catalog, "anatomy"), 30, "F9d. an anatomy session draws from 30 different questions");
    assert.deepEqual(medTermCountOptions(30), [10, 20, 30], "F9e. so only lengths it can fill without repeats are offered");
    assert.deepEqual(medTermCountOptions(medTermPoolSize(catalog, "all")), [10, 20, 30, 50], "F9f. control: every length for the whole bank");
    assert.deepEqual(medTermCountOptions(null), [10, 20, 30, 50], "F9g. control: an unknown pool offers every length, as before");
    assert.equal(medTermClampCount(50, [10, 20, 30]), 30, "F9h. switching to anatomy from a 50-question setup keeps the longest length that fits");
    assert.equal(medTermClampCount(20, [10, 20, 30]), 20, "F9i. and keeps a length that still fits");
    // A click cannot be rendered here, so the wiring is read from source: picking a choice clamps the
    // length to that choice's options, and the select offers only those options.
    const engineSrc = stripComments(read("components/training/hosa-medterm-engine.tsx"));
    assert.equal((engineSrc.match(/const count = medTermClampCount\(preferredCount, countOptions\);/g) ?? []).length, 1,
      "F9j. the length shown and sent is the learner's chosen length clamped to what the current choice can fill");
    assert.ok(/const countOptions = medTermCountOptions\(poolSize\);/.test(engineSrc) && /const poolSize = medTermPoolSize\(catalog, focus\);/.test(engineSrc),
      "F9j2. from the current choice's pool");
    assert.ok(/onChange=\{\(\) => setFocus\(choice\.id\)\}/.test(engineSrc) && !/\bsetCount\b/.test(engineSrc),
      "F9j3. picking a choice never overwrites the chosen length, so switching back restores it");
    assert.equal((engineSrc.match(/\bpreferredCount\b/g) ?? []).length, 2,
      "F9j4. the chosen length is read only by the clamp, so what is shown and sent is always the clamped length");
    assert.equal((engineSrc.match(/\bsetPreferredCount\(/g) ?? []).length, 3,
      "F9j5. and only the learner's own length controls set it (the Timed button, the official-format card, the select)");
    assert.ok(/\{countOptions\.map\(\(c\) => \(/.test(engineSrc) && !/\[10, 20, 30, 50\]\.map/.test(engineSrc),
      "F9k. and the length select lists only the offered lengths");

    const html = decode(renderToStaticMarkup(React.createElement(HosaMedTermEngine, { official: true, areas: catalog, initialFocus: "anatomy" })));
    const text = visible(html);
    const radios = [...html.matchAll(/<input[^>]*type="radio"[^>]*>/g)].map((m) => m[0]);
    assert.equal(radios.length, 5, "F10. five choices as radio buttons");
    const checked = radios.filter((r) => /\bchecked\b/.test(r));
    assert.ok(checked.length === 1 && checked[0].includes('value="anatomy"'), "F10b. anatomy is the one selected");
    assert.ok(text.includes("The link you followed preselected Anatomy from the course"), "F10c. the learner is told what the link did");
    assert.ok(text.includes("Nothing starts until you press start"), "F10d. and that nothing has started");
    const options = [...html.matchAll(/<option[^>]*value="(\d+)"/g)].map((m) => Number(m[1]));
    assert.deepEqual(options, [10, 20, 30], "F10e. the setup screen offers 10, 20 or 30 questions for anatomy");
    assert.ok(text.includes("Anatomy from the course has 30 different questions"), "F10f. and says why longer sessions are not offered");
    assert.ok(!text.includes("Anatomy (not taught yet)"), "F10g. anatomy is no longer marked untaught");
    assert.ok(!text.includes("(not taught yet)"), "F10h. and no area is marked untaught any more");
    assert.ok(!html.includes("Question 1 of"), "F10i. no session is running: the setup screen is showing");
  });

  await check("F11. the route issues an anatomy session from anatomy questions only", async () => {
    const { POST } = require("../app/api/hosa/medterm/session/route") as { POST: (request: Request) => Promise<Response> };
    const byBankId = new Map(MEDTERM_BANK.map((q) => [q.id, q]));
    const response = await POST(new Request("http://localhost/api/hosa/medterm/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ count: 20, areas: medTermFocusRequestAreas("anatomy") })
    }));
    const json = (await response.json()) as { requestedAreas?: string[]; items?: Array<Record<string, unknown>>; order?: string[]; error?: string };
    assert.equal(response.status, 200, `F11. an anatomy request is served (${json.error ?? ""})`);
    assert.deepEqual(json.requestedAreas, ["anatomy"], "F11b. issued for anatomy");
    assert.deepEqual(db.sessions.at(-1)?.requestedAreas, ["anatomy"], "F11c. and stored that way");
    assert.equal(json.items?.length, 20, "F11d. twenty items");
    assert.equal(new Set(json.order).size, 20, "F11e. without repeats");
    assert.ok((json.items ?? []).every((item) => byBankId.get(String(item.bankQuestionId))?.area === "anatomy"), "F11f. every one an anatomy bank question");
    for (const item of json.items ?? []) {
      assert.ok(!("correctAnswer" in item) && !("explanation" in item), "F11g. and no answer key leaves the server");
    }
  });

  // ---- G. remediation ----------------------------------------------------------------------------------
  await check("G. an anatomy weakness opens the anatomy lessons, and every broken link closes it", () => {
    const action = hosaMedTermRemediation("anatomy", "Anatomy");
    assert.ok(action && action.kind === "lesson", "G1. anatomy resolves to a lesson");
    assert.equal(action.lessonId, BODY_MAP, "G1b. where the anatomy module starts");
    assert.equal(action.href, `/lessons/${BODY_MAP}?track=hosa`, "G1c. linked on the HOSA track");
    assert.equal(action.label, "Study anatomy in the Anatomy lessons, starting with “Body Map: Directions, Planes and Cavities”",
      "G1d. naming the module, not one lesson, because the module teaches it");
    assert.equal(HOSA_MEDTERM_AREA_TEACHING_OWNERS.anatomy, BODY_MAP, "G2. the declared owner is the module's first lesson");
    assert.equal(hosaLessonPracticeLink(BODY_MAP)?.href, medTermFocusHref("anatomy"), "G2b. which links back to anatomy practice");
    assert.ok(educationLessonsForTrack("HOSA").every((e) => !(e.nextLessonId === BODY_MAP && e.moduleId === ANATOMY_MODULE)),
      "G2c. and no anatomy lesson comes before it");
    // Word-part remediation is untouched.
    for (const [area, label, owner] of [["word-roots", "Word roots", "hosa-medical-word-roots"], ["prefixes", "Prefixes", "hosa-medical-prefixes"],
      ["suffixes", "Suffixes", "hosa-medical-suffixes"]] as const) {
      const wordPart = hosaMedTermRemediation(area, label);
      assert.ok(wordPart?.kind === "lesson" && wordPart.lessonId === owner, `G3. ${area} still opens its own lesson`);
      assert.match(wordPart.label, /^Study .+ in the lesson “/, `G3b. ${area} still names one lesson`);
      assert.equal(hosaLessonPracticeLink(owner)?.href, medTermFocusHref("word-parts"), `G3c. whose practice link is still word-part practice`);
    }

    // Fail closed. Each control breaks one link of the chain in the live objects, then restores it.
    const mutate = (fn: () => () => void, message: string) => {
      const restore = fn();
      try {
        assert.equal(hosaMedTermRemediation("anatomy", "Anatomy"), null, message);
      } finally {
        restore();
      }
      assert.equal(hosaMedTermRemediation("anatomy", "Anatomy")?.kind, "lesson", `${message} (restored)`);
    };
    const owners = HOSA_MEDTERM_AREA_TEACHING_OWNERS as Record<string, string>;
    const entry = getEducationLesson(BODY_MAP) as { visibility: string };
    mutate(() => { const v = entry.visibility; entry.visibility = "internal"; return () => { entry.visibility = v; }; },
      "G4. a hidden first lesson closes the action");
    const writable = entry as unknown as { moduleId: string; courseId: string };
    mutate(() => { const m = writable.moduleId; writable.moduleId = "some-other-module"; return () => { writable.moduleId = m; }; },
      "G5. an owner in a module with no practice choice closes the action");
    const heart = getEducationLesson(ANATOMY_ORDER[1]) as unknown as { nextLessonId: string | null };
    mutate(() => { const n = heart.nextLessonId; heart.nextLessonId = BODY_MAP; return () => { heart.nextLessonId = n; }; },
      "G5b. an owner that is not where its module starts closes the action");
    mutate(() => { const c = writable.courseId; writable.courseId = "some-other-course"; return () => { writable.courseId = c; }; },
      "G6. an owner outside this course closes the action");
    const frozenOwners = Object.isFrozen(owners);
    assert.ok(frozenOwners, "G7. the owner map is frozen, so a stray write cannot reassign anatomy");
  });

  // ---- H. the anatomy lessons teach no function and no disease -------------------------------------------
  await check("H. anatomy teaches no physiology or disease, and neither area is served from anatomy", () => {
    for (const area of ["physiology", "pathophysiology"] as const) {
      const owner = HOSA_MEDTERM_AREA_TEACHING_OWNERS[area];
      assert.ok(owner && !(ANATOMY_ORDER as readonly string[]).includes(owner), `H1. ${area} is owned by its own module, not an anatomy lesson`);
      assert.ok(!medTermFocus("anatomy").areas!.includes(area), `H1b. the anatomy choice does not serve ${area}`);
    }
    assert.match(medTermFocus("anatomy").disclosure, /physiology\) and disease are not in this choice/, "H2. and the anatomy choice says so");
    // The anatomy lessons teach structure. They name none of the mechanisms the physiology questions
    // test (the physiology module teaches those) and none of the conditions the pathophysiology
    // questions test.
    const FUNCTION_AND_DISEASE = /homeostasis|insulin|glucagon|systole|diastole|peristalsis|diffusion|reabsor|neurotransmitter|synap|troponin|cardiac output|stroke volume|\bSA node|\bAV node|antidiuretic|emulsif|platelet|plasma|feedback|hormone|infarct|ischemi|edema|benign|malignan|tumou?r|hypertension|anemia|diabetes|hypoxia|disease|disorder|infection|injur/i;
    for (const id of ANATOMY_ORDER) {
      const hits = lessonStrings(sourceOf(id)).join("\n").match(FUNCTION_AND_DISEASE);
      assert.equal(hits, null, `H3. ${id} teaches no physiology mechanism or disease (${hits?.[0] ?? ""})`);
    }
    assert.ok(FUNCTION_AND_DISEASE.test("Peristalsis moves food along."), "H3b. control: the scan catches a physiology mechanism");
    assert.ok(FUNCTION_AND_DISEASE.test("An infarction is tissue death."), "H3c. control: and a disease term");
  });

  // ---- I. the bank is unchanged ---------------------------------------------------------------------
  await check("I. the practice bank is byte-for-byte the bank the census classified", () => {
    assert.equal(MEDTERM_BANK.length, 180, "I1. 180 questions");
    assert.equal(createHash("sha256").update(JSON.stringify(MEDTERM_BANK)).digest("hex"), BANK_SHA256,
      "I2. unchanged: coverage was earned by teaching, not by editing questions");
  });

  await check("J. the suite is registered and never loaded the real database client", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    assert.equal(pkg.scripts["hosa-medterm-anatomy:smoke"], "tsx scripts/hosa-medterm-anatomy-smoke.ts", "J1. registered in package.json");
    const database = Object.keys(require.cache).filter((file) => /[\\/]lib[\\/]prisma\.ts$/.test(file) && require.cache[file]?.exports?.prisma !== prismaStandIn);
    assert.deepEqual(database, [], "J2. lib/prisma was only ever the in-memory stand-in");
    assert.ok(db.touches.every((t) => t === "$transaction"), "J3. and only its transaction was used");
  });

  console.log(`\nhosa-medterm-anatomy:smoke passed (${checks} checks). Four anatomy lessons teach all 30 anatomy questions; the physiology and pathophysiology modules follow them.\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
