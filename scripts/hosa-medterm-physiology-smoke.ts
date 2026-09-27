/**
 * HOSA Medical Terminology physiology — the course's third module, and what it may claim.
 *
 * Run with: npm run hosa-medterm-physiology:smoke
 *
 * NO DATABASE, NO PROVIDER, NO ENV, NO WRITES. The practice route, the practice page and the room are
 * loaded only after lib/prisma, lib/api-auth, lib/rate-limit and lib/competition-specs are replaced by
 * in-memory stand-ins (the same harness as hosa-medterm-anatomy-smoke). Lessons are rendered through
 * `react-dom/server`. Nothing here fetches, writes, or reads a secret.
 *
 * WHAT IT PROTECTS. The Medical Terminology practice bank asks 30 physiology questions. Four lessons
 * now teach them, derived from a census of those questions rather than from general physiology
 * knowledge. The properties that make that honest are the ones a later edit could quietly break:
 *
 *   A. Registration: the physiology module follows the anatomy module in the same course, by
 *      reference, in one chain, with a provenance label that says the lessons are AI-generated, not
 *      official HOSA material, and not yet reviewed by a person.
 *   B. The census: every one of the bank's 30 physiology questions is classified by the concept it
 *      needs and assigned a teaching owner, or listed as not taught yet. Nothing is left out.
 *   C. Alignment: for every question classified as taught, the fact it needs is stated in its owner
 *      lesson's teaching text (not only in a check), and the confusable wrong fact is never stated.
 *   D. The learner checks test the lessons, explain every answer, give no position or length tell,
 *      copy no bank question, save nothing and claim no mastery.
 *   E. No official HOSA claim, one sourced number only, no diagnosis or treatment, no other track.
 *   F. The learning graph: word parts -> anatomy -> physiology -> pathophysiology, with physiology
 *      practice at the end of its module, the right link on the right lesson, and a practice choice
 *      that serves only physiology questions and starts nothing by itself. Anatomy keeps its own
 *      practice link at the end of its module.
 *   G. Remediation: a physiology weakness opens the physiology lessons, anatomy still opens anatomy,
 *      every link checked, failing closed.
 *   H. No disease is named in these lessons: pathophysiology belongs to its own module, which
 *      scripts/hosa-medterm-pathophysiology-smoke.ts owns.
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
  STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE,
  STABLE_TEACHING_HOSA_PROVENANCE
} from "../lib/education/tracks/hosa";
import {
  HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY,
  HOSA_MEDTERM_ANATOMY_PRACTICE_RETURN,
  HOSA_MEDTERM_AREA_TEACHING_OWNERS,
  HOSA_MEDTERM_NO_LESSON_MESSAGE,
  HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY,
  HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_RETURN,
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
  HOSA_MEDTERM_PHYSIOLOGY_AREAS,
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
const PHYSIOLOGY_MODULE = "hosa-medterm-physiology";
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
const PHYSIOLOGY_ORDER = [
  "hosa-physiology-staying-in-balance",
  "hosa-physiology-heart-and-blood",
  "hosa-physiology-breathing-and-digestion",
  "hosa-physiology-nerves-and-muscles"
] as const;
// The module after this one, which scripts/hosa-medterm-pathophysiology-smoke.ts owns. Named here only
// for the order of the course and where the last physiology lesson leads.
const PATHOPHYSIOLOGY_ORDER = [
  "hosa-pathophysiology-how-tissue-changes",
  "hosa-pathophysiology-blood-flow-and-oxygen",
  "hosa-pathophysiology-heart-and-pressure",
  "hosa-pathophysiology-defences",
  "hosa-pathophysiology-breathing-kidneys-glucose"
] as const;
const PATHOPHYSIOLOGY_MODULE = "hosa-medterm-pathophysiology";
type PhysiologyLesson = (typeof PHYSIOLOGY_ORDER)[number];
const [BALANCE, HEART_BLOOD, BREATH_FOOD, NERVE_MUSCLE] = PHYSIOLOGY_ORDER;
const [BODY_MAP, , , FRAME] = ANATOMY_ORDER;

// The bank as it stood when the physiology lessons were written (6fb7887, unchanged since 3d1cd9f).
// The census below classifies THESE questions; a changed bank has to be re-censused, never quietly
// re-matched.
const BANK_SHA256 = "ab80e811fb740772418f41d8e4f0e6d1a9bad794c264a135d726beb53d908cc2";

// ---- B/C. the census ----------------------------------------------------------------------------------
// One row per concept the bank's physiology questions need. Each question names its owner lesson and
// the facts that answer it. A FACT is a list of patterns that must all appear in ONE sentence of the
// owner lesson's affirmative teaching text (see `teachingSentences`), so a fact stated only in a check,
// only in a weak answer, or split across two unrelated sentences does not count. `never` lists
// sentences that would teach the tempting wrong answer; none may appear anywhere the module means to
// be true, its check hints and feedback included (see `affirmativeStrings`).
type Fact = readonly RegExp[];
type Taught = { owner: PhysiologyLesson; facts: readonly Fact[]; never?: readonly RegExp[] };
type Concept = { concept: string; skill: string; questions: Readonly<Record<string, Taught>> };

const CENSUS: readonly Concept[] = [
  {
    concept: "Homeostasis and negative feedback",
    skill: "Define homeostasis; recognise negative feedback in temperature control",
    questions: {
      "ph-01": { owner: BALANCE, facts: [[/\bhomeostasis is the body’s ability to maintain a stable internal environment\b/i]],
        never: [/\bhomeostasis (?:is|means) (?:the body’s ability to )?(?:grow|store|fight)/i] },
      "ph-09": { owner: BALANCE, facts: [[/\bbody temperature control is an example of negative feedback\b/i, /\bset point\b/i]],
        never: [/\btemperature\b[^.]{0,60}\bpositive feedback/i, /\bpositive feedback\b[^.]{0,60}\btemperature/i] }
    }
  },
  {
    concept: "Hormones that regulate blood glucose and metabolic rate",
    skill: "Name the hormone and gland for a change in blood glucose or metabolic rate",
    questions: {
      "ph-02": { owner: BALANCE, facts: [[/\binsulin lowers blood glucose\b/i], [/\bglucagon raises blood glucose\b/i]],
        never: [/\binsulin raises blood glucose/i, /\bglucagon lowers blood glucose/i, /\binsulin\b(?![^.]{0,40}\b(?:do|does|can) ?not (?:raise|increase))[^.]{0,40}\b(?:raises|increases)\b[^.]{0,20}\bglucose\b/i,
          /\bglucagon\b(?![^.]{0,40}\b(?:do|does|can) ?not (?:lower|decrease|reduce))[^.]{0,40}\b(?:lowers|decreases|reduces)\b[^.]{0,20}\bglucose\b/i] },
      "ph-08": { owner: BALANCE, facts: [[/^the pancreas\b(?:,[^,.]*,)?\s*regulates blood glucose by releasing two hormones\b/i, /\binsulin and glucagon\b/i]],
        never: [/\b(?:liver|spleen|thyroid)\b[^.]{0,30}\breleases? (?:insulin|glucagon)\b/i,
          /\b(?:liver|spleen|thyroid(?: gland)?)\b(?:,[^,.]*,)?\s*(?:releases|makes|regulates blood glucose by releasing)\b[^.]{0,60}\b(?:insulin|glucagon)\b/i] },
      "ph-27": { owner: BALANCE, facts: [[/\bthyroid hormone regulates the body’s metabolic rate\b/i]],
        never: [/\bthyroid hormone regulates\b[^.]{0,30}\b(?:clotting|urine|antibod)/i] }
    }
  },
  {
    concept: "Kidney function and ADH",
    skill: "Order filtration and reabsorption; say what ADH and the kidneys keep in balance",
    questions: {
      "ph-20": { owner: BALANCE, facts: [[/\bfiltration is followed by reabsorption\b/i],
        [/\bwater and the substances the body needs\b/i, /\bare reabsorbed back into the blood\b/i]],
        never: [/\beverything (?:that was |that is |they )?filter(?:ed)?\b[^.]{0,30}\b(?:leaves|is excreted|becomes urine)/i] },
      "ph-21": { owner: BALANCE, facts: [[/\bmore ADH is released\b/, /\bincrease water reabsorption\b/i, /\bless urine\b/i, /\bmore concentrated\b/i]],
        never: [/\bADH\b[^.]{0,40}\bincreases? water loss/i, /\bmore ADH\b[^.]{0,80}\bmore urine/i, /\bADH\b[^.]{0,40}\bmore dilute/i] },
      "ph-22": { owner: BALANCE, facts: [[/\bkidneys help maintain the body’s fluid, electrolyte and pH balance\b/i]],
        never: [/\bkidneys?\b[^.]{0,60}\b(?:sets?|controls?) (?:the )?(?:core )?(?:body )?temperature\b/i, /\bkidneys?\b[^.]{0,40}\bstores? bile\b/i] }
    }
  },
  {
    concept: "Parts of the blood",
    skill: "Say what plasma, red cells, white cells and platelets each do",
    questions: {
      "ph-03": { owner: HEART_BLOOD, facts: [[/\bred blood cells carry oxygen from the lungs\b/i], [/\bhemoglobin\b/i, /\bholds on to the oxygen\b/i]],
        never: [/\b(?:white blood cells|platelets|plasma) carr(?:y|ies) (?:most of )?(?:the )?oxygen/i] },
      "ph-05": { owner: HEART_BLOOD, facts: [[/\bimmune system is the body system that produces antibodies\b/i], [/\bB cells\b/, /\bantibodies\b/i]],
        never: [/\b(?:endocrine|respiratory|muscular) system\b[^.]{0,30}\bproduces? antibodies/i] },
      "ph-29": { owner: HEART_BLOOD, facts: [[/\bsmall blood vessel is cut\b/i, /\bplatelets clump at the injury site to form a plug\b/i]],
        never: [/\bplatelets\b(?![^.]{0,30}\b(?:do|does|can) ?not (?:carry|dissolve))[^.]{0,30}\b(?:carry|carries|dissolve)/i] },
      "ph-30": { owner: HEART_BLOOD, facts: [[/\bplasma\b[^.]{0,60}\bits job is to carry cells, nutrients, hormones and wastes in fluid\b/i]],
        never: [/\bplasma\b[^.]{0,30}\bcarries (?:most of )?(?:the )?oxygen/i] }
    }
  },
  {
    concept: "The heartbeat and the valves",
    skill: "Put the conduction path in order; name systole; say what the valves do",
    questions: {
      "ph-10": { owner: HEART_BLOOD, facts: [[/\bventricular systole\b/i, /\bthe ventricles contract and eject blood into the aorta\b/i, /\bpulmonary artery\b/i]],
        never: [/\bventricular systole\b[^.]{0,40}\brelax/i] },
      "ph-11": { owner: HEART_BLOOD, facts: [[/\beach heartbeat starts with an electrical signal from the SA node\b/i],
        [/\bafter spreading across the atria, the signal next reaches the AV node\b/i]],
        never: [/\bnext reaches the (?:Purkinje|bundle|left bundle)/i] },
      "ph-12": { owner: HEART_BLOOD, facts: [[/\bthe valves’ job is to keep blood moving in one direction\b/i]],
        never: [/\bvalves? (?:pump|pumps|push|pushes|generate|generates)\b/i] }
    }
  },
  {
    concept: "Heart rate and cardiac output",
    skill: "Give the typical resting adult heart rate; reason about cardiac output",
    questions: {
      "ph-04": { owner: HEART_BLOOD, facts: [[/\bfor an adult at rest\b/i, /\babout 60 to 100 beats per minute\b/i]],
        never: [/\bheart rate\b[^.]{0,40}\b(?:20|40|120|160|180|220)\b/i] },
      "ph-13": { owner: HEART_BLOOD, facts: [[/\bcardiac output\b/i, /\bequals heart rate multiplied by stroke volume\b/i],
        [/\bif heart rate rises while stroke volume stays the same, cardiac output increases\b/i]],
        never: [/\bheart rate rises\b[^.]{0,40}\bcardiac output (?:decreases|falls|stays the same)/i] }
    }
  },
  {
    concept: "Breathing and gas exchange",
    skill: "Say what the respiratory system and diaphragm do, how gases cross, and what drives breathing",
    questions: {
      "ph-06": { owner: BREATH_FOOD, facts: [[/\brespiratory system’s main job is to exchange oxygen and carbon dioxide\b/i]],
        never: [/\brespiratory system’s main job is to (?:filter|digest|produce)/i] },
      "ph-14": { owner: BREATH_FOOD, facts: [[/\bbreathe in\b/i, /\bdiaphragm contracts and flattens downward\b/i, /\bchest cavity bigger\b/i],
        [/\bbreathing in is inhalation\b/i]],
        never: [/\bbreathe in\b[^.]{0,30}\bdiaphragm relaxes/i, /\bdiaphragm relaxes\b[^.]{0,40}\bbreathe in/i] },
      "ph-15": { owner: BREATH_FOOD, facts: [[/\boxygen moves into the blood by diffusion down a partial-pressure gradient\b/i]],
        never: [/\boxygen\b[^.]{0,40}\bactive transport\b/i, /\boxygen is pumped\b/i] },
      "ph-16": { owner: BREATH_FOOD, facts: [[/\bhealthy person at rest\b/i, /\bmain chemical signal to breathe more is a rise in carbon dioxide\b/i],
        [/\bmoving air in and out of the lungs is called ventilation\b/i], [/\bcarbon dioxide rises\b/i, /\bincreases ventilation\b/i]],
        never: [/\bmain (?:chemical )?signal to breathe more is a (?:fall|drop) in oxygen/i] }
    }
  },
  {
    concept: "Digestion along the tract",
    skill: "Say what peristalsis, the small intestine, bile and the large intestine each do",
    questions: {
      "ph-07": { owner: BREATH_FOOD, facts: [[/\bperistalsis moves food through the digestive tract\b/i]],
        never: [/\bperistalsis\b[^.]{0,60}\b(?:filters? (?:the )?blood|contracts the heart|cools the body)\b/i] },
      "ph-17": { owner: BREATH_FOOD, facts: [[/\bsmall intestine’s main job is to complete most digestion and absorb most nutrients\b/i]],
        never: [/\blarge intestine\b[^.]{0,40}\babsorbs? most (?:of the )?nutrients/i] },
      "ph-18": { owner: BREATH_FOOD, facts: [[/\bbile is not an enzyme\b/i, /\bemulsify fats\b/i, /\bso that enzymes can break them down\b/i]],
        never: [/\bbile is an enzyme\b/i, /\bbile\b[^.]{0,20}\bbreaks? (?:proteins|fats) into (?:amino acids|fatty acids)/i] },
      "ph-19": { owner: BREATH_FOOD, facts: [[/\blarge intestine reabsorbs water and electrolytes\b/i]],
        never: [/\blarge intestine\b[^.]{0,30}\babsorbs? most of the (?:protein|fat)/i] }
    }
  },
  {
    concept: "Nerve signals, reflexes and the two autonomic branches",
    skill: "Say how a synapse passes a signal, where a reflex turns back, what the sympathetic branch does",
    questions: {
      "ph-23": { owner: NERVE_MUSCLE, facts: [[/\bprotective movement happens through the spinal cord, before the brain processes the sensation\b/i]],
        never: [/\bonly after the brain\b/i, /\bbrain (?:decides|has decided) (?:first|before)/i] },
      "ph-24": { owner: NERVE_MUSCLE, facts: [[/\bneuron releases a neurotransmitter into the synaptic cleft\b/i]],
        never: [/\bsignal (?:jumps|crosses)\b[^.]{0,20}\bas (?:electricity|an electrical current)\b/i] },
      "ph-25": { owner: NERVE_MUSCLE, facts: [[/\bsympathetic activity prepares the body\b/i, /\braising heart rate and shifting blood toward skeletal muscle\b/i]],
        never: [/\bsympathetic\b[^.]{0,40}\bslows? the heart/i, /\bparasympathetic\b[^.]{0,40}\braising heart rate/i] },
      "ph-28": { owner: NERVE_MUSCLE, facts: [[/\bhormones travel in the bloodstream and act more slowly but for longer\b/i]],
        never: [/\bhormones?\b[^.]{0,40}\btravel along (?:the )?axons?\b/i, /\bhormones?\b[^.]{0,40}\bwithin milliseconds\b/i, /\bhormones? act only on the gland\b/i] }
    }
  },
  {
    concept: "Muscle contraction",
    skill: "Name the event that lets actin and myosin cycle",
    questions: {
      "ph-26": { owner: NERVE_MUSCLE, facts: [[/\bcalcium binds to troponin\b/i, /\bexposes the binding sites on actin\b/i],
        [/\bcalcium is released\b/i, /\bsarcoplasmic reticulum\b/i]],
        never: [/\bbone shortens\b/i, /\blactic acid\b/i] }
    }
  }
];

/** Bank physiology questions no physiology lesson teaches yet, each with the reason. Empty: all 30 are taught. */
const NOT_YET_TAUGHT: Readonly<Record<string, string>> = {};

// The names the bank's pathophysiology questions (and ph-04's explanation) use, and the words those
// questions use to describe the body going wrong without naming a condition ("impaired", "chronic",
// "too little", "high blood glucose"), plus common condition names and the phrasing of the bank's
// pathophysiology answers ("plaque", "swelling", "invades"). None may appear in a physiology lesson:
// the module teaches normal function, and it must not look like disease coverage. H3d proves the scan
// recognises every one of the bank's 30 pathophysiology questions by its wording (question and key
// together; some keys alone, such as "Insulin", are normal physiology words and cannot be banned).
const DISEASE = /hypertens|hypotens|an(?:a)?emi|diabet|infarct|o?edema\b|tumou?r|cancer|malignan|benign|ischemi|hypoxi|inflamm|fever|autoimmun|allerg|immunodeficien|atheroscler|thromb|embol|heart failure|acidosis|alkalosis|dehydrat|necros|apoptos|atroph|hypertroph|\bshock\b|coloniz|bradycard|tachycard|arrhythm|infect|disease|disorder|illness|\bsick|patholog|asthma|\bstroke\b(?! volume)|seizure|paralys|cramp|hyperglyc|hypoglyc|hypertherm|hypotherm|deficien|\bfail(?:s|ed|ure|ing)?\b|damag|abnormal|impair|overload|\bacute\b|\bchronic\b|irregular|\btoo (?:little|much|high|low)\b|high blood glucose|accumulate in the blood|pneumonia|arthritis|hepatitis|\b[a-z]+itis\b|ulcer|emphysema|osteoporo|\bobes|\bseps|septic|leuk(?:a)?emi|heart attack|plaque|swelling|persistently|inadequate|underperfus|\binvad|\blodges?\b|mucus (?:fills|blocks|plugs)|blocks? gas exchange|blood volume falls|narrow(?:s|ed|ing)?\b[^.]{0,20}\b(?:artery|arteries|vessels?|airways?)/i;

// A measured quantity written in words: a number word followed by a unit ("thirty-seven degrees",
// "five litres", "twelve breaths"). "one" is left out because "in one minute" and "in one beat" define
// cardiac output and stroke volume rather than state a value.
const NUMBER_WORD = "(?:one hundred|one thousand|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine|hundred|thousand))?";
const SPELLED_QUANTITY = new RegExp(
  `\\b${NUMBER_WORD}(?:\\s+(?:to|or|and)\\s+${NUMBER_WORD})?\\s+(?:percent|per cent|degrees?|beats?|breaths?|lit(?:re|er)s?|millilit|mm\\b|mmhg|seconds?|minutes?|hours?|days?|times (?:a|per)|kilo|grams?|calories|micro|(?:a|per|each) (?:minute|second|hour|day)|on the \\w+ scale)|\\b(?:celsius|fahrenheit)\\b`,
  "i");

// The one number the module states, in the one sentence allowed to state it.
const HEART_RATE_SENTENCE = /\bfor an adult at rest, a typical heart rate is about 60 to 100 beats per minute\b/i;

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
/**
 * Every learner-visible string that is meant to be TRUE: the teaching above, plus each check's hint
 * and explanation, the summary, the description, the title and the more-examples set-ups. Check
 * prompts and the worked example's prompt are scanned too, except a sentence that reports someone
 * else's claim ("A student says bile is an enzyme") or quotes it, because posing a wrong claim for
 * the learner to judge is the point of those prompts. (A check's retry prompt is the same text as its
 * prompt.) Left out are only the texts that are wrong on purpose: check choices, the worked example's
 * weak answer, the more-examples weak answers, the misconception's wrong model and each common mistake
 * as stated. The `never` patterns run over all of it, so a reversed fact in a check's feedback is
 * caught as surely as one in the teaching.
 */
const ATTRIBUTED = /\b(?:says?|said|thinks?|thought|writes?|wrote|claims?|answers?|labels?|believes?)\b|“/i;
function affirmativeStrings(source: ConceptEducationLessonSource): string[] {
  const c = source.lesson.content;
  const posed = [...allQuestions(source).map((q) => q.prompt), c.workedExample.prompt];
  const deliberate = new Set<string>([
    ...posed,
    ...allQuestions(source).flatMap((q) => q.choices),
    c.workedExample.weakAnswer,
    ...(c.additionalExamples ?? []).map((e) => e.weak ?? ""),
    ...(c.misconception ? [c.misconception.wrongModel] : []),
    ...(c.commonMistakes ?? []).map((m) => m.mistake)
  ]);
  const posedAsFact = sentencesOf(posed).filter((sentence) => !ATTRIBUTED.test(sentence));
  return [...lessonStrings(source).filter((text) => !deliberate.has(text)), ...posedAsFact];
}
// Sentences end at . ! or ? before a space, or at a line break. Colons and semicolons stay inside, so
// "Bile is not an enzyme: its job is to emulsify fats" is one sentence.
const sentencesOf = (texts: readonly string[]) =>
  texts.flatMap((t) => t.split(/(?<=[.!?])\s+|\n+/)).map((s) => s.trim()).filter(Boolean);
const teachingSentences = (id: string) => sentencesOf(teachingStrings(sourceOf(id)));
const statesFact = (sentences: readonly string[], fact: Fact) => sentences.some((s) => fact.every((p) => p.test(s)));

const allQuestions = (source: ConceptEducationLessonSource) => {
  const c = source.lesson.content;
  return [c.guidedQuestion, ...c.practiceQuestions, ...c.masteryCheck];
};

const PHYSIOLOGY_BANK = (): MedTermQuestion[] => MEDTERM_BANK.filter((q) => q.area === "physiology");
const taughtIndex = () => {
  const index = new Map<string, { concept: string; taught: Taught }>();
  for (const row of CENSUS) for (const [id, taught] of Object.entries(row.questions)) index.set(id, { concept: row.concept, taught });
  return index;
};

async function main() {
  console.log("\nhosa-medterm-physiology:smoke\n");

  // ---- A. registration -----------------------------------------------------------------------------
  await check("A. the physiology module follows anatomy in one course, one chain, by reference", () => {
    const order = [...WORD_PART_ORDER, ...ANATOMY_ORDER, ...PHYSIOLOGY_ORDER, ...PATHOPHYSIOLOGY_ORDER];
    assert.deepEqual([...PUBLISHED_HOSA_SLUGS], order, "A1. the track file publishes word parts, anatomy, physiology, then pathophysiology");
    assert.deepEqual(HOSA_PUBLISHED_LESSONS.map((e) => e.id), order, "A1b. and registers them in that order");
    const course = EDUCATION_COURSES.find((c) => c.id === HOSA_MEDTERM_STUDY_COURSE);
    assert.ok(course && course.track === "HOSA", "A2. the Medical Terminology course exists on the HOSA track");
    assert.deepEqual(course.moduleIds, ["hosa-medterm-word-parts", ANATOMY_MODULE, PHYSIOLOGY_MODULE, PATHOPHYSIOLOGY_MODULE],
      "A2b. with the physiology module after anatomy, and pathophysiology after it");
    const physiologyModule = getEducationModule(PHYSIOLOGY_MODULE);
    assert.ok(physiologyModule && physiologyModule.courseId === HOSA_MEDTERM_STUDY_COURSE && physiologyModule.track === "HOSA",
      "A2c. the module belongs to that course");
    assert.equal(physiologyModule.label, "Physiology", "A2d. its learner-facing label says what it is");
    assert.equal(physiologyModule.prerequisiteId, ANATOMY_MODULE, "A2e. and it builds on the anatomy module");
    assert.ok(!/disease|patholog|illness|disorder/i.test(`${physiologyModule.label} ${physiologyModule.outcome}`),
      "A2f. its outcome claims no disease coverage");
    assert.match(physiologyModule.outcome, /healthy body/, "A2g. and says it is about the healthy body");
    assert.equal(getEducationModule(ANATOMY_MODULE)?.prerequisiteId, "hosa-medterm-word-parts", "A2h. control: anatomy still builds on the word parts");
    assert.equal(getEducationLesson(FRAME)?.nextLessonId, BALANCE, "A3. the last anatomy lesson continues into physiology");
    assert.equal(getEducationLesson(WORD_PART_ORDER[3])?.nextLessonId, BODY_MAP, "A3b. control: the last word-part lesson still continues into anatomy");
    for (const [index, id] of PHYSIOLOGY_ORDER.entries()) {
      const entry = getEducationLesson(id);
      assert.ok(entry, `A4. ${id} is registered`);
      assert.equal(entry.track, "HOSA", `A4b. ${id} is HOSA`);
      assert.equal(entry.courseId, HOSA_MEDTERM_STUDY_COURSE, `A4c. ${id} is in the Medical Terminology course`);
      assert.equal(entry.moduleId, PHYSIOLOGY_MODULE, `A4d. ${id} is in the physiology module`);
      assert.equal(entry.variant, "concept", `A4e. ${id} is a concept lesson`);
      assert.equal(entry.visibility, "learner", `A4f. ${id} is learner-visible`);
      assert.equal(entry.practiceState, "available", `A4g. ${id} has its own checks`);
      assert.equal(entry.nextLessonId, PHYSIOLOGY_ORDER[index + 1] ?? PATHOPHYSIOLOGY_ORDER[0],
        `A5. ${id} chains to the next physiology lesson, the last into the pathophysiology module`);
      assert.equal(entry.skillSlug, undefined, `A5b. ${id} claims no skill`);
      assert.equal(entry.practiceDrill, undefined, `A5c. ${id} names no drill`);
      const original = LEARNING_SKILL_CATALOG.find((c) => c.slug === id);
      assert.ok(original && entry.source === original, `A6. ${id} holds the ORIGINAL catalog object`);
      assert.ok(entry.provenance === STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE, `A7. ${id} carries the physiology provenance`);
      const shown = presentSourceFreshness(entry.provenance);
      assert.equal(shown.degraded, false, `A7b. ${id} provenance does not degrade`);
      assert.equal(shown.authority, "stable-teaching", `A7c. ${id} is presented as stable teaching`);
      assert.match(shown.authorityLabel, /not a current-rules source/, `A7d. ${id} says it is not a rules source`);
    }
    for (const id of ANATOMY_ORDER) {
      assert.ok(getEducationLesson(id)?.provenance === STABLE_TEACHING_HOSA_ANATOMY_PROVENANCE, `A7e. control: ${id} keeps the anatomy provenance`);
      assert.equal(getEducationLesson(id)?.moduleId, ANATOMY_MODULE, `A7f. control: ${id} stays in the anatomy module`);
    }
    const ends = educationLessonsForTrack("HOSA").filter((e) => e.courseId === HOSA_MEDTERM_STUDY_COURSE && e.nextLessonId === null);
    assert.deepEqual(ends.map((e) => e.id), [PATHOPHYSIOLOGY_ORDER[PATHOPHYSIOLOGY_ORDER.length - 1]],
      "A8. the course has exactly one end, the last pathophysiology lesson, not a physiology one");
    assert.deepEqual(
      educationLessonsForTrack("HOSA").filter((e) => e.courseId === HOSA_MEDTERM_STUDY_COURSE).map((e) => e.id),
      order, "A8b. and the course lists its lessons in chain order");
  });

  await check("A9. the physiology label says AI-generated, not official HOSA material, not yet reviewed by a person", () => {
    const label = STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE.sourceLabel ?? "";
    assert.ok(Object.isFrozen(STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE), "A9. the provenance object is frozen");
    assert.ok(STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE !== STABLE_TEACHING_HOSA_ANATOMY_PROVENANCE,
      "A9a. its own object, so the physiology review can change it without touching anatomy");
    assert.equal(STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE.organization, "CompeteReady", "A9b. attributed to CompeteReady");
    assert.equal(STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE.authority, "stable-teaching", "A9b2. on the stable-teaching tier, never official");
    assert.match(label, /^AI-generated CompeteReady lesson\b/, "A9c. AI-generated CompeteReady instruction");
    assert.match(label, /not an official HOSA lesson or test item/, "A9d. and not an official HOSA lesson or test item");
    assert.match(label, /not yet reviewed by a person/, "A9e. and not yet reviewed by a person");
    assert.equal(STABLE_TEACHING_HOSA_PROVENANCE.sourceLabel, "AI-generated CompeteReady lesson, not an official HOSA lesson or test item — not yet reviewed by a person",
      "A9f. control: the word-part lessons keep their own constant, with the same wording");
    assert.match(STABLE_TEACHING_HOSA_ANATOMY_PROVENANCE.sourceLabel ?? "", /not yet reviewed by a person/, "A9f2. control: and anatomy keeps its own");
    const catalog = read("lib/learning-content.ts");
    const record = catalog.slice(catalog.indexOf("---- HOSA MEDICAL TERMINOLOGY: PHYSIOLOGY"), catalog.indexOf(`slug: "${BALANCE}"`));
    assert.ok(record.length > 0 && catalog.indexOf("---- HOSA MEDICAL TERMINOLOGY: PHYSIOLOGY") >= 0, "A9g. control: the physiology authoring record was located");
    assert.match(record, /AI-drafted/, "A9h. the record says the lessons were AI-drafted");
    assert.match(record, /have NOT yet\s+\/\/\s+had a human content review|have NOT yet had a human content review/,
      "A9i. and have not had a human content review");
    assert.match(record, /subject-accuracy review before release/, "A9j. and that a subject-accuracy review is required before release");
    assert.match(record, /before changing the label or pushing these lessons/, "A9k. before the label changes or the lessons are pushed");
    assert.match(record, /ONE NUMBER/, "A9l. and it records the one number the lessons state");
  });

  // ---- B. the census --------------------------------------------------------------------------------
  await check("B. every one of the bank's physiology questions is classified, with a teaching owner or a reason", () => {
    const bank = PHYSIOLOGY_BANK();
    assert.equal(bank.length, 30, "B1. the bank asks 30 physiology questions");
    assert.deepEqual(bank.map((q) => q.id), Array.from({ length: 30 }, (_, i) => `ph-${String(i + 1).padStart(2, "0")}`),
      "B1b. ph-01 to ph-30, in order");
    const index = taughtIndex();
    const censused = [...index.keys(), ...Object.keys(NOT_YET_TAUGHT)];
    assert.equal(new Set(censused).size, censused.length, "B2. no question is classified twice");
    assert.deepEqual([...censused].sort(), bank.map((q) => q.id).sort(), "B2b. and every bank question is classified, nothing else");
    for (const [id, reason] of Object.entries(NOT_YET_TAUGHT)) assert.ok(reason.trim(), `B2c. ${id} says why it is not taught`);
    for (const row of CENSUS) {
      assert.ok(row.concept.trim() && row.skill.trim(), `B3. "${row.concept}" names the skill it needs`);
      assert.ok(Object.keys(row.questions).length > 0, `B3b. "${row.concept}" is backed by at least one bank question`);
    }
    const owners = new Map<string, Set<string>>();
    for (const row of CENSUS) for (const taught of Object.values(row.questions)) {
      owners.set(taught.owner, new Set([...(owners.get(taught.owner) ?? []), row.concept]));
    }
    for (const id of PHYSIOLOGY_ORDER) assert.ok((owners.get(id)?.size ?? 0) > 0, `B4. ${id} owns at least one tested concept`);
    for (const row of CENSUS) {
      const lessons = new Set(Object.values(row.questions).map((t) => t.owner));
      assert.equal(lessons.size, 1, `B4b. "${row.concept}" has one teaching owner, not several`);
    }
  });

  // ---- C. alignment ---------------------------------------------------------------------------------
  await check("C. each taught question's fact is stated in its owner lesson's teaching, and the wrong one never is", () => {
    const index = taughtIndex();
    const moduleSentences = PHYSIOLOGY_ORDER.flatMap((id) => sentencesOf(affirmativeStrings(sourceOf(id))));
    for (const q of PHYSIOLOGY_BANK()) {
      const row = index.get(q.id);
      if (!row) continue;
      const sentences = teachingSentences(row.taught.owner);
      assert.ok(row.taught.facts.length > 0, `C1. ${q.id} names the fact that answers it`);
      for (const fact of row.taught.facts) {
        assert.ok(statesFact(sentences, fact), `C2. ${q.id} (${q.correctAnswer}): ${row.taught.owner} teaches ${fact.map((p) => p.source).join(" + ")}`);
      }
      for (const wrong of row.taught.never ?? []) {
        const said = moduleSentences.find((s) => wrong.test(s));
        assert.equal(said, undefined, `C3. ${q.id}: no physiology lesson states ${wrong.source}, in its teaching or its feedback`);
      }
    }
    // Each fact is also the bank's own answer: the key's distinctive words appear in the taught fact.
    const keyWords: Readonly<Record<string, RegExp>> = {
      "ph-02": /insulin/i, "ph-03": /oxygen/i, "ph-05": /immune/i, "ph-08": /pancreas/i, "ph-09": /negative feedback/i,
      "ph-11": /AV node/, "ph-13": /increases/i, "ph-16": /carbon dioxide/i, "ph-27": /metabolic rate/i
    };
    for (const [id, word] of Object.entries(keyWords)) {
      const q = PHYSIOLOGY_BANK().find((item) => item.id === id)!;
      assert.match(q.correctAnswer, word, `C3b. control: ${id}'s key is "${q.correctAnswer}"`);
      assert.ok(index.get(id)!.taught.facts.some((fact) => fact.some((p) => word.test(p.source.replace(/\\b/g, "")))),
        `C3c. ${id}'s census fact names its key`);
    }
    // Controls. A fact present only in a check or a weak answer is not teaching, and a fact split
    // across two sentences is not one fact.
    const heart = sourceOf(HEART_BLOOD);
    const checkStrings = allQuestions(heart)
      .flatMap((q) => [q.prompt, q.hint, q.explanation, (q as { retryPrompt?: string }).retryPrompt, ...q.choices])
      .filter((s): s is string => typeof s === "string");
    assert.ok(checkStrings.length > 0 && checkStrings.every((s) => !teachingStrings(heart).includes(s)),
      "C4. control: no check text (prompt, hint, explanation, choice) is counted as teaching");
    // The wrong-fact scan reaches the feedback a learner reads after answering, not only the teaching.
    const balance = sourceOf(BALANCE);
    const affirmative = affirmativeStrings(balance);
    const feedback = allQuestions(balance).flatMap((q) => [q.hint, q.explanation]);
    assert.ok(feedback.length > 0 && feedback.every((text) => affirmative.includes(text)),
      "C3d. control: every check's hint and explanation is in the wrong-fact scan");
    assert.ok(affirmative.includes(balance.lesson.summary) && affirmative.includes(balance.description),
      "C3e. control: and so are the summary and the description");
    assert.ok(allQuestions(balance).every((q) => q.choices.every((choice) => !affirmative.includes(choice) || teachingStrings(balance).includes(choice)))
      && !affirmative.includes(balance.lesson.content.workedExample.weakAnswer),
      "C3f. control: wrong choices and the weak answer, which are wrong on purpose, are not");
    const ph02 = taughtIndex().get("ph-02")!.taught.never ?? [];
    assert.ok(sentencesOf(["Insulin does the opposite and raises blood glucose, for example after a meal."]).some((sentence) => ph02.some((p) => p.test(sentence))),
      "C3g. control: a reversed fact in a check's feedback would be caught");
    const ph08 = taughtIndex().get("ph-08")!.taught;
    const liverSentence = "The liver, which sits near the pancreas, regulates blood glucose by releasing two hormones with opposite jobs, insulin and glucagon.";
    assert.ok(!statesFact([liverSentence], ph08.facts[0]) && (ph08.never ?? []).some((p) => p.test(liverSentence)),
      "C3h. control: naming the liver as the organ that releases insulin and glucagon neither teaches ph-08 nor passes its wrong-fact scan");
    assert.ok((ph08.never ?? []).some((p) => p.test("The liver cells release insulin and glucagon.")),
      "C3i. control: and the plain wording is caught too");
    const neverOf = (id: string) => taughtIndex().get(id)!.taught.never ?? [];
    for (const [id, sentence] of [["ph-02", "Insulin, not glucagon, raises blood glucose."], ["ph-29", "Platelets, not red blood cells, carry oxygen."]] as const) {
      assert.ok(neverOf(id).some((p) => p.test(sentence)), `C3j. control: the swapped-fact wording "${sentence}" is caught`);
    }
    assert.ok(!neverOf("ph-29").some((p) => p.test("Platelets do not carry oxygen.")), "C3k. control: a correct negation is not");
    assert.ok(affirmativeStrings(balance).some((text) => /^A thermostat switches the heating on\b/.test(text)),
      "C3l. control: a check prompt's plain statements are scanned");
    assert.ok(!affirmativeStrings(sourceOf(BREATH_FOOD)).some((text) => /student says bile is an enzyme/i.test(text)),
      "C3m. control: a claim the prompt attributes to a student, posed to be judged, is not");
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
    assert.ok(!teachingStrings(heart).includes(heart.lesson.content.misconception!.wrongModel), "C4b2. control: nor is a misconception's wrong model");
    assert.ok(!statesFact(["Insulin is a hormone.", "It lowers blood glucose."], [/\binsulin lowers blood glucose\b/i]),
      "C4c. control: a fact split over two sentences does not count");
    assert.ok(statesFact(sentencesOf(["Bile is not an enzyme: its job is to emulsify fats, so that enzymes can break them down."]),
      [/\bbile is not an enzyme\b/i, /\bemulsify fats\b/i, /\bso that enzymes can break them down\b/i]), "C4d. control: a colon does not end a sentence");
  });

  await check("C5. alignment report: 30 physiology questions, taught and not yet taught", () => {
    const taught = [...taughtIndex().keys()];
    const notTaught = Object.keys(NOT_YET_TAUGHT);
    assert.equal(taught.length + notTaught.length, 30, "C5. every question counted once");
    assert.equal(taught.length, 30, "C5b. all thirty are taught by the physiology module");
    assert.equal(notTaught.length, 0, "C5c. none is left untaught");
    console.log("       PHYSIOLOGY QUESTIONS: 30");
    console.log(`       TAUGHT: ${taught.length}`);
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
    for (const id of PHYSIOLOGY_ORDER) {
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
    assert.ok(MEDTERM_BANK.some((item) => overlap(norm("Which hormone lowers the blood glucose?"), norm(item.question)) >= 0.6),
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
    for (const id of PHYSIOLOGY_ORDER) {
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
    for (const id of PHYSIOLOGY_ORDER) {
      const text = lessonStrings(sourceOf(id)).join("\n");
      assert.ok(!/master(?:y|ed|ing)?\b|mastery test|readiness|\bXP\b|streak/i.test(text), `D9c. ${id} claims no mastery, readiness or XP`);
    }
  });

  // ---- E. no official claim, one sourced number, no clinical advice, no disease, no other track ------
  await check("E. the lessons state no HOSA rule, one sourced number only, no clinical advice, no disease, and no other track", () => {
    const CLAIMS: ReadonlyArray<readonly [label: string, pattern: RegExp, claim: string]> = [
      ["the organization's name", /\bHOSA\b/, "HOSA tests these systems every year."],
      ["points or scores", /\b\d+\s*points?\b|\bpoints? (?:each|per|for)\b|\bscor(?:e|es|ed|ing)\b|rating sheet/i, "Each correct answer scores 2 points."],
      ["rules, guidelines or exams", /\b(?:HOSA|event|official|competition)\s+rules?\b|guideline|\bexam\b|competition|test coverage|on the test/i,
        "This is on the test every year."],
      ["diagnosis or treatment",
        /\bdiagnos|\btreat(?:ment|ing|s|ed)?\b|\bmedication|\bdose\b|\bprescri|\bsymptom|\bcure\b|\bdoctors?\b|\binject|\btherap|\bmedicine|\bdrugs?\b|\bpills?\b|hospital|\bsurg(?:ery|eon|ical)|transplant|dialysis|inhaler|artificial pacemaker|pacemaker implant/i,
        "People whose pancreas makes no insulin inject insulin every day to keep their blood glucose steady."],
      ["another track", /\bDECA\b|debate|role-?play|performance indicator|\bjudge\b|rebuttal/i, "A judge would expect this."],
      ["a disease or condition", DISEASE, "A heart rate above that range is tachycardia."]
    ];
    const numbered: string[] = [];
    for (const id of PHYSIOLOGY_ORDER) {
      const source = sourceOf(id);
      const text = lessonStrings(source).join("\n");
      assert.ok(source.lesson.content.workedExample.prompt.endsWith("(Our example, not an official test question.)"),
        `E1. ${id}'s worked example says it is ours, not an official question`);
      const officialUses = text.match(/official/gi) ?? [];
      const labelled = text.match(/not an official test question/g) ?? [];
      assert.equal(officialUses.length, labelled.length, `E2. ${id} uses "official" only to say its example is not one`);
      for (const [label, pattern] of CLAIMS) {
        const hit = text.match(pattern);
        assert.equal(hit, null, `E3. ${id} mentions no ${label} (${hit?.[0] ?? ""})`);
      }
      // Any digit at all is allowed only in the one heart-rate sentence, and no sentence states a
      // quantity in words either ("thirty-seven degrees"). Plain counts ("two hormones", "four valves")
      // are not measurements and stay allowed.
      for (const sentence of sentencesOf(lessonStrings(source))) {
        if (/\d/.test(sentence)) numbered.push(`${id}: ${sentence}`);
        const spelled = sentence.match(SPELLED_QUANTITY);
        assert.equal(spelled, null, `E5g. ${id} states no measured quantity in words (${spelled?.[0] ?? ""})`);
      }
    }
    assert.equal(numbered.length, 1, `E5. exactly one sentence in the module contains a digit (${numbered.length})`);
    for (const claim of ["Normal body temperature is about thirty-seven degrees Celsius.", "Normal body temperature stays near thirty-seven on the Celsius scale.",
      "A resting breathing rate is about twelve to twenty a minute."]) {
      assert.ok(SPELLED_QUANTITY.test(claim), `E5h. control: a measured quantity written in words is caught ("${claim}")`);
    }
    assert.ok(!SPELLED_QUANTITY.test("The pancreas releases two hormones, and the heart has four valves."),
      "E5i. control: a plain count is not");
    assert.ok(numbered[0].startsWith(`${HEART_BLOOD}: `) && HEART_RATE_SENTENCE.test(numbered[0]),
      "E5b. and it is the resting adult heart-rate range, in the heart and blood lesson");
    assert.deepEqual(numbered[0].match(/\d+/g), ["60", "100"], "E5c. which states only the two ends of that range");
    assert.ok(teachingSentences(HEART_BLOOD).some((s) => HEART_RATE_SENTENCE.test(s)), "E5d. as teaching, not only in a check");
    assert.ok(teachingSentences(HEART_BLOOD).some((s) => /\bgeneral range for adults at rest, not a way to tell whether a particular person’s heart is healthy\b/.test(s)),
      "E5e. followed by the caveat that it is a general range, not a way to judge anyone's heart");
    const bank04 = PHYSIOLOGY_BANK().find((q) => q.id === "ph-04")!;
    assert.match(bank04.explanation, /60-100 beats per minute/, "E5f. control: the same range the bank's reviewed explanation gives");
    for (const [label, pattern, claim] of CLAIMS) assert.ok(pattern.test(claim), `E4. control: the ${label} scan catches "${claim}"`);
    for (const claim of ["If your heart races, see a doctor.", "If your heart races, treatment is rest."]) {
      assert.ok(CLAIMS.find(([label]) => label === "diagnosis or treatment")![1].test(claim), `E4c. control: and "${claim}"`);
    }
    assert.ok(!CLAIMS.find(([label]) => label === "diagnosis or treatment")![1].test("The SA node is the heart’s natural pacemaker."),
      "E4d. control: the SA node's name as the natural pacemaker is not treatment");
    assert.ok(!DISEASE.test("Stroke volume is the blood one ventricle pushes out in one beat."), "E4b. control: stroke volume is not a disease");
  });

  // ---- F. the learning graph and the practice destination -------------------------------------------
  await check("F1. the right practice link sits on the right lesson, and the course end names what is untaught", () => {
    // Exhaustive over the registry: the course-end action appears only at the course's end.
    for (const entry of EDUCATION_LESSONS) {
      const isEnd = entry.track === "HOSA" && entry.courseId === HOSA_MEDTERM_STUDY_COURSE && entry.visibility === "learner" && entry.nextLessonId === null;
      assert.equal(hosaCourseEndAction(entry.id) !== null, isEnd, `F1. ${entry.id}: course-end action only at the course's end`);
      assert.ok(!(hosaCourseEndAction(entry.id) && decaCourseEndAction(entry.id)), `F1b. ${entry.id}: at most one course-end action`);
    }
    assert.equal(getEducationLesson(NERVE_MUSCLE)?.nextLessonId, PATHOPHYSIOLOGY_ORDER[0], "F2. the last physiology lesson continues into pathophysiology");
    assert.equal(hosaCourseEndAction(NERVE_MUSCLE), null, "F2a0. so it is no longer the course end");
    assert.equal(hosaLessonPracticeReturn(NERVE_MUSCLE), HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY,
      "F2a1. and it keeps its physiology practice link, now beside the next lesson");
    assert.equal(hosaCourseEndAction(FRAME), null, "F2a. the last anatomy lesson is no longer the course end");
    assert.equal(hosaLessonPracticeReturn(FRAME), HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY,
      "F2b. it keeps its anatomy practice link, now beside the next lesson");
    assert.equal(hosaLessonPracticeReturn(WORD_PART_ORDER[3]), HOSA_MEDTERM_PRACTICE_ENTRY, "F2b2. control: the last word-part lesson keeps its link");
    assert.equal(hosaLessonPracticeReturn(BODY_MAP), HOSA_MEDTERM_ANATOMY_PRACTICE_RETURN, "F2b3. control: the first anatomy lesson keeps its return");
    assert.equal(hosaLessonPracticeReturn(BALANCE), HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_RETURN, "F2c. the first physiology lesson links back to physiology practice");
    assert.equal(hosaLessonPracticeLink(HEART_BLOOD), null, "F2d. the middle physiology lessons own no area and do not jump ahead");
    assert.equal(hosaLessonPracticeLink(BREATH_FOOD), null, "F2e. nor does the third");
    const target = new URL(HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY.href, "http://localhost");
    assert.equal(target.pathname, HOSA_MEDTERM_PRACTICE_ROOM, "F3. the physiology link leads to the event's practice room");
    assert.equal(medTermFocusFromParam(target.searchParams.get(HOSA_MEDTERM_FOCUS_PARAM) ?? undefined), "physiology", "F3b. with physiology preselected");
    assert.equal(HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_RETURN.href, HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY.href, "F3c. both physiology links open the same choice");
    assert.equal(new URL(HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY.href, "http://localhost").searchParams.get(HOSA_MEDTERM_FOCUS_PARAM), "anatomy",
      "F3d. control: the anatomy link still preselects anatomy");
    for (const link of [HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY, HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_RETURN, HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY, HOSA_MEDTERM_PRACTICE_ENTRY]) {
      assert.ok(Object.isFrozen(link), `F4. "${link.label}" is frozen`);
      const copy = `${link.label} ${link.detail}`;
      assert.ok(!/record|saved|\bsave|mastery|progress|nothing is|score|\bready\b/i.test(copy), `F4b. "${link.label}" makes no persistence or mastery claim`);
      assert.ok(!/disease has no lessons|no lessons on disease/i.test(copy), `F4c. "${link.label}" no longer says disease is untaught`);
      assert.ok(!/physiology and disease have no lessons|no lessons? on physiology/i.test(copy), `F4d. "${link.label}" no longer says physiology is untaught`);
    }
    // The physiology links may say the lessons AFTER them teach disease; they must not say these lessons do.
    const claimsDisease = /\b(?:these|the physiology) lessons\b[^.]{0,40}\b(?:cover|teach|explain)\w*\b[^.]{0,20}\b(?:pathophysiology|disease)\b/i;
    for (const link of [HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY, HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_RETURN]) {
      assert.ok(!claimsDisease.test(`${link.label} ${link.detail}`), `F4e. "${link.label}" claims no disease teaching for the physiology lessons`);
    }
    assert.ok(claimsDisease.test("These lessons also teach disease."), "F4f. control: the scan catches a disease claim for these lessons");
    assert.ok(!claimsDisease.test("The lessons after this one are about disease (pathophysiology)."), "F4g. control: and passes a true statement about the later lessons");
    assert.match(HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY.detail, /original questions, not official HOSA test items/, "F5. the end copy says the questions are original");
    assert.match(HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY.detail, /The lessons after this one are about disease \(pathophysiology\)/, "F5b. and says disease comes next");
    assert.match(HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY.detail, /nothing starts until you press start/, "F5c. and that nothing starts on arrival");
    assert.match(HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY.detail, /The lessons after this one are about physiology and then disease \(pathophysiology\)/,
      "F5d. the anatomy end copy says physiology and then disease come next");
    assert.match(HOSA_MEDTERM_PRACTICE_ENTRY.detail, /The lessons after this one teach anatomy, physiology and disease \(pathophysiology\)/,
      "F5d2. and the word-part end copy names all three later modules");
    assert.match(HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_RETURN.detail, /a later lesson in this course teaches/, "F5e. the return copy says later lessons teach more");
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
    for (const id of PHYSIOLOGY_ORDER) {
      const html = render(id);
      const text = visible(html);
      const source = sourceOf(id);
      assert.ok(text.includes(source.lesson.title), `F6. ${id} renders its title`);
      assert.ok(text.includes("HOSA") && text.includes("Physiology"), `F6b. ${id} is badged HOSA and Physiology`);
      assert.ok(text.includes(STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE.sourceLabel!), `F6c. ${id} shows the learner its label`);
      assert.ok(text.includes("not official competition material"), `F6d. ${id} keeps the teaching-lesson disclaimer`);
      const teachAt = html.indexOf(source.lesson.content.explanation.slice(0, 40));
      const checksAt = html.indexOf('id="practice"');
      assert.ok(teachAt >= 0 && checksAt > teachAt, `F6e. ${id} teaches before it checks`);
      assert.ok(text.includes("Final check"), `F6f. ${id} calls its last check a Final check`);
      assert.ok(!/master/i.test(visible(html.slice(0, checksAt))), `F6g. ${id}'s teaching claims no mastery`);
      const claims = text.replace(/no progress, no mastery, no XP/, "").replace(/not evidence that you have mastered the skill/, "");
      assert.ok(!/master/i.test(claims), `F6g2. ${id} mentions mastery only to say the checks are not it`);
      assert.ok(text.includes("Nothing here is saved"), `F6h. ${id} says its checks save nothing`);
      const entry = getEducationLesson(id)!;
      if (entry.nextLessonId) {
        const continueAt = html.indexOf(`href="/lessons/${entry.nextLessonId}"`);
        assert.ok(continueAt >= 0, `F6i. ${id} continues to ${entry.nextLessonId}`);
        const practiceAt = html.indexOf(`href="${HOSA_MEDTERM_PRACTICE_ROOM}`);
        if (id === BALANCE || id === NERVE_MUSCLE) assert.ok(practiceAt > continueAt, `F6j. ${id} offers physiology practice after its next-lesson link`);
        else assert.equal(practiceAt, -1, `F6j. ${id} does not jump ahead to practice`);
        assert.ok(!text.includes("end of this course so far"), `F6j2. ${id} does not say the course ends here`);
      } else {
        assert.ok(html.includes(`href="${HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY.href}"`), `F6k. ${id} ends in physiology practice`);
        assert.ok(text.includes("end of this course so far"), `F6l. ${id} says the course so far ends here, not that the curriculum is complete`);
      }
    }
    const frame = render(FRAME);
    const continueAt = frame.indexOf(`href="/lessons/${BALANCE}"`);
    assert.ok(continueAt >= 0, "F6m. the last anatomy lesson continues into the first physiology lesson");
    assert.ok(frame.indexOf(`href="${HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY.href}"`) > continueAt, "F6n. and still offers anatomy practice after that link");
    assert.ok(!frame.includes(`href="${HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY.href}"`), "F6n2. not physiology practice, which it does not teach");
    assert.ok(!visible(frame).includes("end of this course so far"), "F6o. and no longer says the course ends there");
    const last = render(NERVE_MUSCLE);
    const onward = last.indexOf(`href="/lessons/${PATHOPHYSIOLOGY_ORDER[0]}"`);
    assert.ok(onward >= 0, "F6p. the last physiology lesson continues into the first pathophysiology lesson");
    assert.ok(last.indexOf(`href="${HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY.href}"`) > onward, "F6q. and offers physiology practice after that link");
    assert.ok(!visible(last).includes("end of this course so far"), "F6r. and no longer says the course ends there");
  });

  await check("F7. HOSA Learn, Event HQ and the lessons index lead through anatomy to physiology", () => {
    const learn = learnerPathForTrack("HOSA").find((stage) => stage.id === "learn");
    assert.equal(learn?.href, "/lessons?track=hosa", "F7. Learn opens the HOSA lessons catalog");
    assert.match(learn?.note ?? "", /word parts, anatomy, physiology and pathophysiology/, "F7b. and names the physiology lessons");
    assert.match(learn?.note ?? "", /reading-only communication lesson/, "F7c. while still saying the communication lesson is reading only");
    const hq = read("app/(app)/training/[track]/event/[eventSlug]/page.tsx");
    const hosaEntry = hq.slice(hq.indexOf('"hosa/medical-terminology"'), hq.indexOf('"deca/'));
    assert.ok(hosaEntry.length > 0, "F7d. control: the HOSA Event HQ entry was located");
    assert.match(hosaEntry, /label: "Lessons", detail: "[^"]*then the anatomy, physiology and pathophysiology the practice asks about[^"]*", href: "\/lessons\?track=hosa"/,
      "F7e. Event HQ's lessons row names the physiology lessons");
    const index = stripComments(read("app/(app)/lessons/page.tsx"));
    assert.match(index, /The last lesson of each module in this course links there\./, "F7f. the index card says which lessons link to practice");
    assert.ok(!/hosa-physiology-|hosa-anatomy-/.test(index), "F7g. and decides by course, never by a hardcoded lesson slug");
  });

  await check("F8. the physiology choice is taught, serves only physiology questions, and starts nothing", async () => {
    const physiology = medTermFocus("physiology");
    assert.deepEqual(MEDTERM_FOCUS_CHOICES.map((c) => c.id), ["word-parts", "anatomy", "physiology", "pathophysiology", "all"],
      "F8. five choices: word parts, anatomy, physiology, pathophysiology, all");
    assert.deepEqual(physiology.areas, ["physiology"], "F8b. the physiology choice is exactly the physiology area");
    assert.deepEqual(physiology.areas, HOSA_MEDTERM_PHYSIOLOGY_AREAS, "F8c. through its named list");
    assert.equal(physiology.taught, true, "F8d. it is marked taught");
    assert.equal(physiology.moduleId, PHYSIOLOGY_MODULE, "F8e. and names the module that teaches it");
    assert.deepEqual(medTermFocus("word-parts").areas, HOSA_MEDTERM_WORD_PART_AREAS, "F8f. control: the word-parts choice still serves word parts only");
    assert.deepEqual(medTermFocus("anatomy").areas, HOSA_MEDTERM_ANATOMY_AREAS, "F8f2. control: and the anatomy choice anatomy only");
    assert.equal(medTermFocus("anatomy").moduleId, ANATOMY_MODULE, "F8f3. control: taught by the anatomy module");
    assert.match(medTermFocus("anatomy").disclosure, /physiology\) and disease are not in this choice/, "F8f4. control: whose disclosure is still true");
    assert.deepEqual(HOSA_MEDTERM_TAUGHT_AREAS, [...HOSA_MEDTERM_WORD_PART_AREAS, "anatomy", "physiology", "pathophysiology"],
      "F8g. taught areas: word parts, anatomy, physiology, pathophysiology");
    assert.deepEqual(medTermFocusRequestAreas("physiology"), ["physiology"], "F8h. a request carries the physiology area");
    assert.equal(medTermFocusForAreas(["physiology"]), "physiology", "F8i. a stored physiology session is named as the physiology choice");
    assert.equal(medTermContinuedForOtherChoice(true, ["physiology"], "physiology"), false, "F8j. so continuing one under that choice is not flagged");
    assert.equal(medTermContinuedForOtherChoice(true, ["physiology"], "anatomy"), true, "F8k. but continuing one under another choice is");
    assert.equal(medTermFocusForAreas(["anatomy", "physiology"]), null, "F8l. control: anatomy plus physiology is no single choice");
    assert.equal(medTermFocusForAreas(["physiology", "pathophysiology"]), null, "F8l2. control: physiology plus pathophysiology is no single choice");
    assert.match(physiology.disclosure, /The physiology lessons teach all of them/, "F8m. the choice says the lessons teach every question in it");
    assert.match(physiology.disclosure, /\(anatomy\) and on disease are not in this choice/, "F8m2. and that anatomy and disease are not in it");
    assert.ok(!/record|saved|\bsave\b|mastery|progress|score|readiness|ready\b/i.test(`${physiology.label} ${physiology.summary} ${physiology.coverage} ${physiology.disclosure}`),
      "F8n. the choice makes no persistence or mastery claim");
    assert.ok(!DISEASE.test(`${physiology.label} ${physiology.summary} ${physiology.disclosure}`.replace(/on disease/, "")),
      "F8o. and names no disease topic as part of it");

    // The page hands the URL value to the room, which hands it to the engine with per-area counts.
    const { HosaEventPrep } = require("../components/training/hosa-event-prep");
    const engineModule = require("../components/training/hosa-medterm-engine");
    const { HosaMedTermEngine, medTermCountOptions, medTermPoolSize } = engineModule;
    const TrackPracticePage = require("../app/(app)/training/[track]/practice/page").default;
    const find = (node: unknown, type: unknown): React.ReactElement | null => {
      if (!node || typeof node !== "object") return null;
      if (Array.isArray(node)) { for (const child of node) { const hit = find(child, type); if (hit) return hit; } return null; }
      const el = node as React.ReactElement<{ children?: unknown }>;
      if (el.type === type) return el;
      return find(el.props?.children, type);
    };
    const page = await TrackPracticePage({ params: { track: "hosa" }, searchParams: { focus: "physiology" } });
    assert.equal(find(page, HosaEventPrep)?.props.focus, "physiology", "F9. the practice page hands the room the physiology choice");
    const room = await HosaEventPrep({ focus: "physiology" });
    const engine = find(room, HosaMedTermEngine);
    assert.equal(engine?.props.initialFocus, "physiology", "F9b. the room preselects it");
    const catalog = engine!.props.areas as Array<{ id: string; label: string; questionCount?: number }>;
    for (const area of MEDTERM_AREAS) {
      assert.equal(catalog.find((a) => a.id === area.id)?.questionCount, MEDTERM_BANK.filter((q) => q.area === area.id).length,
        `F9c. the room tells the engine how many ${area.id} questions exist`);
    }
    assert.equal(medTermPoolSize(catalog, "physiology"), 30, "F9d. a physiology session draws from 30 different questions");
    assert.deepEqual(medTermCountOptions(30), [10, 20, 30], "F9e. so only lengths it can fill without repeats are offered");

    const html = decode(renderToStaticMarkup(React.createElement(HosaMedTermEngine, { official: true, areas: catalog, initialFocus: "physiology" })));
    const text = visible(html);
    const radios = [...html.matchAll(/<input[^>]*type="radio"[^>]*>/g)].map((m) => m[0]);
    assert.equal(radios.length, 5, "F10. five choices as radio buttons");
    const checked = radios.filter((r) => /\bchecked\b/.test(r));
    assert.ok(checked.length === 1 && checked[0].includes('value="physiology"'), "F10b. physiology is the one selected");
    assert.ok(text.includes("The link you followed preselected Physiology from the course"), "F10c. the learner is told what the link did");
    assert.ok(text.includes("Nothing starts until you press start"), "F10d. and that nothing has started");
    const options = [...html.matchAll(/<option[^>]*value="(\d+)"/g)].map((m) => Number(m[1]));
    assert.deepEqual(options, [10, 20, 30], "F10e. the setup screen offers 10, 20 or 30 questions for physiology");
    assert.ok(text.includes("Physiology from the course has 30 different questions"), "F10f. and says why longer sessions are not offered");
    assert.ok(!text.includes("Physiology (not taught yet)") && !text.includes("Anatomy (not taught yet)"),
      "F10g. physiology and anatomy are no longer marked untaught");
    assert.ok(!text.includes("(not taught yet)"), "F10h. and no area is marked untaught any more");
    assert.ok(!html.includes("Question 1 of"), "F10i. no session is running: the setup screen is showing");
    const plain = decode(renderToStaticMarkup(React.createElement(HosaMedTermEngine, { official: true, areas: catalog })));
    assert.ok(/<input[^>]*value="all"[^>]*checked|<input[^>]*checked[^>]*value="all"/.test(plain), "F10j. control: with nothing preselected, every area stays the default");
  });

  await check("F11. the route issues a physiology session from physiology questions only", async () => {
    const { POST } = require("../app/api/hosa/medterm/session/route") as { POST: (request: Request) => Promise<Response> };
    const byBankId = new Map(MEDTERM_BANK.map((q) => [q.id, q]));
    const response = await POST(new Request("http://localhost/api/hosa/medterm/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ count: 20, areas: medTermFocusRequestAreas("physiology") })
    }));
    const json = (await response.json()) as { requestedAreas?: string[]; items?: Array<Record<string, unknown>>; order?: string[]; error?: string };
    assert.equal(response.status, 200, `F11. a physiology request is served (${json.error ?? ""})`);
    assert.deepEqual(json.requestedAreas, ["physiology"], "F11b. issued for physiology");
    assert.deepEqual(db.sessions.at(-1)?.requestedAreas, ["physiology"], "F11c. and stored that way");
    assert.equal(json.items?.length, 20, "F11d. twenty items");
    assert.equal(new Set(json.order).size, 20, "F11e. without repeats");
    assert.ok((json.items ?? []).every((item) => byBankId.get(String(item.bankQuestionId))?.area === "physiology"), "F11f. every one a physiology bank question");
    for (const item of json.items ?? []) {
      assert.ok(!("correctAnswer" in item) && !("explanation" in item), "F11g. and no answer key leaves the server");
    }
  });

  // ---- G. remediation ----------------------------------------------------------------------------------
  await check("G. a physiology weakness opens the physiology lessons, anatomy still opens anatomy, every broken link closes it", () => {
    const action = hosaMedTermRemediation("physiology", "Physiology");
    assert.ok(action && action.kind === "lesson", "G1. physiology resolves to a lesson");
    assert.equal(action.lessonId, BALANCE, "G1b. where the physiology module starts");
    assert.equal(action.href, `/lessons/${BALANCE}?track=hosa`, "G1c. linked on the HOSA track");
    assert.equal(action.label, "Study physiology in the Physiology lessons, starting with “Staying in Balance: Feedback, Hormones and the Kidneys”",
      "G1d. naming the module, not one lesson, because the module teaches it");
    assert.equal(HOSA_MEDTERM_AREA_TEACHING_OWNERS.physiology, BALANCE, "G2. the declared owner is the module's first lesson");
    assert.equal(hosaLessonPracticeLink(BALANCE)?.href, medTermFocusHref("physiology"), "G2b. which links back to physiology practice");
    assert.ok(educationLessonsForTrack("HOSA").every((e) => !(e.nextLessonId === BALANCE && e.moduleId === PHYSIOLOGY_MODULE)),
      "G2c. and no physiology lesson comes before it");
    // Anatomy remediation is unchanged, although the anatomy module no longer ends the course.
    const anatomy = hosaMedTermRemediation("anatomy", "Anatomy");
    assert.ok(anatomy?.kind === "lesson" && anatomy.lessonId === BODY_MAP, "G3. anatomy still opens the anatomy lessons");
    assert.equal(anatomy.label, "Study anatomy in the Anatomy lessons, starting with “Body Map: Directions, Planes and Cavities”",
      "G3a. with the same wording");
    assert.equal(hosaLessonPracticeLink(BODY_MAP)?.href, medTermFocusHref("anatomy"), "G3a2. whose practice link is still anatomy practice");
    for (const [area, label, owner] of [["word-roots", "Word roots", "hosa-medical-word-roots"], ["prefixes", "Prefixes", "hosa-medical-prefixes"],
      ["suffixes", "Suffixes", "hosa-medical-suffixes"]] as const) {
      const wordPart = hosaMedTermRemediation(area, label);
      assert.ok(wordPart?.kind === "lesson" && wordPart.lessonId === owner, `G3b. ${area} still opens its own lesson`);
      assert.match(wordPart.label, /^Study .+ in the lesson “/, `G3c. ${area} still names one lesson`);
      assert.equal(hosaLessonPracticeLink(owner)?.href, medTermFocusHref("word-parts"), `G3d. whose practice link is still word-part practice`);
    }

    // Fail closed. Each control breaks one link of the chain in the live objects, then restores it.
    const mutate = (fn: () => () => void, message: string) => {
      const restore = fn();
      try {
        assert.equal(hosaMedTermRemediation("physiology", "Physiology"), null, message);
      } finally {
        restore();
      }
      assert.equal(hosaMedTermRemediation("physiology", "Physiology")?.kind, "lesson", `${message} (restored)`);
    };
    const entry = getEducationLesson(BALANCE) as { visibility: string };
    mutate(() => { const v = entry.visibility; entry.visibility = "internal"; return () => { entry.visibility = v; }; },
      "G4. a hidden first lesson closes the action");
    const writable = entry as unknown as { moduleId: string; courseId: string };
    mutate(() => { const m = writable.moduleId; writable.moduleId = "some-other-module"; return () => { writable.moduleId = m; }; },
      "G5. an owner in a module with no practice choice closes the action");
    const heart = getEducationLesson(HEART_BLOOD) as unknown as { nextLessonId: string | null };
    mutate(() => { const n = heart.nextLessonId; heart.nextLessonId = BALANCE; return () => { heart.nextLessonId = n; }; },
      "G5b. an owner that is not where its module starts closes the action");
    mutate(() => { const c = writable.courseId; writable.courseId = "some-other-course"; return () => { writable.courseId = c; }; },
      "G6. an owner outside this course closes the action");
    assert.ok(Object.isFrozen(HOSA_MEDTERM_AREA_TEACHING_OWNERS), "G7. the owner map is frozen, so a stray write cannot reassign physiology");
  });

  // ---- H. no disease in these lessons -----------------------------------------------------------------
  // Pathophysiology now has its own module after this one, and scripts/hosa-medterm-pathophysiology-smoke.ts
  // owns its census, choice and remediation. What this suite still owns is that the PHYSIOLOGY lessons
  // teach normal function only, so none of the disease teaching leaks back into them.
  await check("H. the physiology lessons name no disease, and pathophysiology belongs to its own module", () => {
    const pathoOwner = HOSA_MEDTERM_AREA_TEACHING_OWNERS.pathophysiology;
    assert.equal(pathoOwner, PATHOPHYSIOLOGY_ORDER[0], "H1. pathophysiology is owned by the first lesson of its own module");
    assert.ok(!(PHYSIOLOGY_ORDER as readonly string[]).includes(pathoOwner ?? ""), "H1a. not by a physiology lesson");
    assert.equal(getEducationLesson(pathoOwner ?? "")?.moduleId, PATHOPHYSIOLOGY_MODULE, "H1b. and that lesson sits in the pathophysiology module");
    const patho = hosaMedTermRemediation("pathophysiology", "Pathophysiology");
    assert.ok(patho?.kind === "lesson" && patho.lessonId === pathoOwner, "H1c. so a pathophysiology weakness opens that module, not physiology");
    assert.ok(MEDTERM_FOCUS_CHOICES.filter((c) => c.areas?.includes("pathophysiology")).every((c) => c.id === "pathophysiology"),
      "H1d. only the pathophysiology choice serves it among the targeted choices");
    assert.ok(!/no lessons on (?:physiology|disease)/.test(medTermFocus("all").disclosure), "H2. the every-area choice says neither area is untaught");
    assert.deepEqual(hosaMedTermRemediation("not-an-area", "Not an area"), { area: "not-an-area", kind: "no-lesson", message: HOSA_MEDTERM_NO_LESSON_MESSAGE },
      "H2a. control: an undeclared area still gets the plain no-lesson statement");
    // The physiology lessons teach normal function. They name none of the conditions the
    // pathophysiology questions test, so nothing here reads as disease coverage.
    for (const id of PHYSIOLOGY_ORDER) {
      const hits = lessonStrings(sourceOf(id)).join("\n").match(DISEASE);
      assert.equal(hits, null, `H3. ${id} names no disease or condition (${hits?.[0] ?? ""})`);
    }
    const PATHO_KEYS = MEDTERM_BANK.filter((q) => q.area === "pathophysiology").map((q) => q.correctAnswer);
    assert.equal(PATHO_KEYS.length, 30, "H3a. control: the bank asks 30 pathophysiology questions");
    for (const term of ["hypertension", "anemia", "infarction", "edema", "ischemia", "atherosclerosis", "embolus", "necrosis", "hypertrophy"]) {
      assert.ok(DISEASE.test(term), `H3b. control: the scan catches "${term}"`);
    }
    assert.ok(DISEASE.test("A slow heart rate is bradycardia."), "H3c. control: and the rate terms the bank's ph-04 explanation uses");
    for (const q of MEDTERM_BANK.filter((item) => item.area === "pathophysiology")) {
      assert.ok(DISEASE.test(`${q.question} ${q.correctAnswer}`), `H3d. control: the scan recognises pathophysiology question ${q.id}`);
    }
    assert.ok(DISEASE.test("When the pancreas makes too little insulin, blood glucose stays high, called hyperglycemia."),
      "H3e. control: a sentence that teaches how glucose control goes wrong is caught even without a disease name");
    for (const sentence of [
      "In pneumonia, fluid in the alveoli blocks this exchange.",
      "When fluid fills the alveoli, it blocks gas exchange across the alveolar wall.",
      "Fatty buildup that narrows an artery restricts blood flow to the tissue.",
      "After heavy bleeding, circulating blood volume falls and blood pressure drops.",
      "A blocked coronary artery causes a heart attack."
    ]) assert.ok(DISEASE.test(sentence), `H3g. control: the scan catches "${sentence}"`);
    for (const sentence of ["White blood cells are also called leukocytes.", "Each lung is divided into lobes.",
      "Mucus lining the airways traps dust before it reaches the lungs."]) {
      assert.ok(!DISEASE.test(sentence), `H3h. control: normal-function wording "${sentence}" is not mistaken for disease`);
    }
    assert.ok(!DISEASE.test("Reflexes are fast, and a hormone in the blood would be far too slow."),
      "H3f. control: plain speed words in normal-function teaching are not mistaken for disease");
  });

  // ---- I. the bank is unchanged ---------------------------------------------------------------------
  await check("I. the practice bank is byte-for-byte the bank the census classified", () => {
    assert.equal(MEDTERM_BANK.length, 180, "I1. 180 questions");
    assert.equal(createHash("sha256").update(JSON.stringify(MEDTERM_BANK)).digest("hex"), BANK_SHA256,
      "I2. unchanged: coverage was earned by teaching, not by editing questions");
  });

  await check("J. the suite is registered and never loaded the real database client", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    assert.equal(pkg.scripts["hosa-medterm-physiology:smoke"], "tsx scripts/hosa-medterm-physiology-smoke.ts", "J1. registered in package.json");
    const database = Object.keys(require.cache).filter((file) => /[\\/]lib[\\/]prisma\.ts$/.test(file) && require.cache[file]?.exports?.prisma !== prismaStandIn);
    assert.deepEqual(database, [], "J2. lib/prisma was only ever the in-memory stand-in");
    assert.ok(db.touches.every((t) => t === "$transaction"), "J3. and only its transaction was used");
  });

  console.log(`\nhosa-medterm-physiology:smoke passed (${checks} checks). Four physiology lessons teach all 30 physiology questions and name no disease; pathophysiology has its own module.\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
