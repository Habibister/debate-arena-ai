/**
 * HOSA Medical Terminology pathophysiology — the course's fourth module, and what it may claim.
 *
 * Run with: npm run hosa-medterm-pathophysiology:smoke
 *
 * NO DATABASE, NO PROVIDER, NO ENV, NO WRITES. The practice route, the practice page and the room are
 * loaded only after lib/prisma, lib/api-auth, lib/rate-limit and lib/competition-specs are replaced by
 * in-memory stand-ins (the same harness as hosa-medterm-physiology-smoke). Lessons are rendered through
 * `react-dom/server`. Nothing here fetches, writes, or reads a secret.
 *
 * WHAT IT PROTECTS. The Medical Terminology practice bank asks 30 pathophysiology questions. Five
 * lessons now teach them, derived from a census of those questions rather than from general pathology
 * knowledge. The properties that make that honest and safe are the ones a later edit could quietly
 * break:
 *
 *   A. Registration: the pathophysiology module follows the physiology module in the same course, by
 *      reference, in one chain, with a label that says the lessons are AI-generated, not official HOSA
 *      material, and not yet reviewed by a person, and a line in every lesson saying it is knowledge
 *      for a test, not a way to judge anyone's health.
 *   B. The census: every one of the bank's 30 pathophysiology questions is classified by the concept it
 *      needs and assigned a teaching owner, or listed as not taught yet. Nothing is left out.
 *   C. Alignment: for every question classified as taught, the fact it needs is stated in its owner
 *      lesson's teaching text (not only in a check), and none of the listed wrong-fact patterns
 *      (FALSE_FACT) appears in what the module presents as true.
 *   D. The learner checks test the lessons, explain every answer, give no position or length tell,
 *      copy no bank question, save nothing and claim no mastery.
 *   E. No official HOSA claim, no number but the name "type 1 diabetes", no diagnosis, treatment,
 *      medicine or care advice, no self-diagnosis framing, no other track; and the false-fact controls
 *      (E6) prove that each listed kind of false fact has planted examples the scan catches (the
 *      wordings tested, not every possible wording).
 *   F. The learning graph: word parts -> anatomy -> physiology -> pathophysiology -> pathophysiology
 *      practice, with the right link on the right lesson, and a practice choice that serves only
 *      pathophysiology questions and starts nothing by itself. Physiology keeps its own practice link
 *      at the end of its module.
 *   G. Remediation: a pathophysiology weakness opens the pathophysiology lessons, every one of the six
 *      areas resolves to its own module or fails closed, every link checked.
 *   H. "All Medical Terminology" is truthful now that every area has lessons: it claims coverage of
 *      CompeteReady's own practice bank only, says some word parts are still untaught, and never claims
 *      official HOSA coverage or completion.
 *   I. The question bank itself is unchanged: coverage was earned by teaching, not by editing items.
 *
 * KNOWN LIMITS (also printed at the end of a run). This guard is not a subject-accuracy review:
 *   1. A census fact proves that a sentence with those words is in the owner lesson's teaching. It
 *      does not prove the sentence is medically correct.
 *   2. A FALSE_FACT pattern catches only the wrong statements someone wrote down. A new wrong claim in
 *      other words, including a one-word reversal of a sentence no pattern anticipates, passes.
 *   3. Facts the lessons add beyond the bank's own explanations (listed in the module's report) are not
 *      checked against any source.
 *   4. The treatment, clinical and self-diagnosis scans are word lists. A paraphrase can pass them.
 *   5. It does not judge whether a distractor is plausible, a hint helpful, or a lesson clear.
 *   6. It renders on the server only. Nothing here is a browser check.
 * The owner's release gate is one qualified human subject-accuracy review of the whole curriculum.
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
  STABLE_TEACHING_HOSA_PATHOPHYSIOLOGY_PROVENANCE,
  STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE,
  STABLE_TEACHING_HOSA_PROVENANCE
} from "../lib/education/tracks/hosa";
import {
  HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY,
  HOSA_MEDTERM_ANATOMY_PRACTICE_RETURN,
  HOSA_MEDTERM_AREA_TEACHING_OWNERS,
  HOSA_MEDTERM_NO_LESSON_MESSAGE,
  HOSA_MEDTERM_PATHOPHYSIOLOGY_PRACTICE_ENTRY,
  HOSA_MEDTERM_PATHOPHYSIOLOGY_PRACTICE_RETURN,
  HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY,
  HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_RETURN,
  HOSA_MEDTERM_PRACTICE_ENTRY,
  HOSA_MEDTERM_PRACTICE_RETURN,
  HOSA_MEDTERM_STUDY_COURSE,
  hosaCourseEndAction,
  hosaLessonPracticeLink,
  hosaLessonPracticeReturn,
  hosaMedTermRemediation
} from "../lib/education/hosa-medterm-practice";
import { decaCourseEndAction } from "../lib/education/deca-simulation-prep";
import {
  HOSA_MEDTERM_ANATOMY_AREAS,
  HOSA_MEDTERM_FOCUS_ATTRIBUTION,
  HOSA_MEDTERM_FOCUS_PARAM,
  HOSA_MEDTERM_PATHOPHYSIOLOGY_AREAS,
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
const PATHOPHYSIOLOGY_MODULE = "hosa-medterm-pathophysiology";
const PHYSIOLOGY_MODULE = "hosa-medterm-physiology";
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
const PATHOPHYSIOLOGY_ORDER = [
  "hosa-pathophysiology-how-tissue-changes",
  "hosa-pathophysiology-blood-flow-and-oxygen",
  "hosa-pathophysiology-heart-and-pressure",
  "hosa-pathophysiology-defences",
  "hosa-pathophysiology-breathing-kidneys-glucose"
] as const;
type PathophysiologyLesson = (typeof PATHOPHYSIOLOGY_ORDER)[number];
const [TISSUE, FLOW, HEART, DEFENCES, SYSTEMS] = PATHOPHYSIOLOGY_ORDER;
const [BALANCE, , , NERVE_MUSCLE] = PHYSIOLOGY_ORDER;
const [BODY_MAP] = ANATOMY_ORDER;

// The bank as it stood when the pathophysiology lessons were written (908853d, unchanged since
// 3d1cd9f). The census below classifies THESE questions; a changed bank has to be re-censused, never
// quietly re-matched.
const BANK_SHA256 = "ab80e811fb740772418f41d8e4f0e6d1a9bad794c264a135d726beb53d908cc2";

// The line every pathophysiology lesson ends its "why it matters" with.
const SAFETY_LINE = "This is knowledge for a test, not a way to judge anyone’s health.";

// ---- B/C. the census ----------------------------------------------------------------------------------
// One row per concept the bank's pathophysiology questions need. Each question names its owner lesson
// and the facts that answer it. A FACT is a list of patterns that must all appear in ONE sentence of
// the owner lesson's affirmative teaching text (see `teachingSentences`), so a fact stated only in a
// check, only in a weak answer, or split across two unrelated sentences does not count. FALSE_FACT
// lists wrong statements that would teach a tempting wrong answer; none may appear anywhere the module
// means to be true, its check hints and feedback included (see `affirmativeStrings`). Each pattern is
// tagged with the kind of error it guards against, and E6 plants at least one example of every kind.
type Fact = readonly RegExp[];
type Taught = { owner: PathophysiologyLesson; facts: readonly Fact[] };
type Concept = { concept: string; skill: string; questions: Readonly<Record<string, Taught>> };

/** The kinds of false fact the prompt for this module named, each with the patterns that catch it. */
const FALSE_FACT = {
  acuteChronic: [
    /\bacute (?:means|describes|is)\b[^.;]{0,40}\b(?:long-lasting|lasts? a long time|develops? slowly|over (?:many )?years|keeps coming back)\b/i,
    /\bchronic (?:means|describes|is)\b[^.;]{0,40}\b(?:suddenly|short-lived|over quickly|comes on quickly)\b/i,
    /\bacute (?:means|is|describes) (?:how )?(?:severe|serious|dangerous)\b/i,
    /\bchronic (?:conditions? )?(?:starts?|begins?|comes? on|appears?) (?:suddenly|quickly)\b/i,
    /\bacute and chronic (?:tell|show|measure|compare) (?:you )?how (?:severe|serious)\b/i,
    /\b(?:sudden\w*|short(?:-lived)?|over quickly)\b[^.;]{0,50}\b(?:is|describes) (?:an? )?chronic\b/i,
    /\bchronic\b[^.;]{0,10}\b(?:came|comes) on suddenly\b/i
  ],
  benignMalignant: [
    /\bbenign (?:tumou?rs? )?(?:invades?|spreads?|metastasi[sz]es?)\b/i,
    /\bbenign\b(?![^.;]{0,50}\b(?:not|never|no|without|neither)\b)[^.;]{0,50}\b(?:invades?|spreads?|metastasi[sz]es?)\b/i,
    /\bbenign (?:tumou?rs? )?(?:is|are) (?:always )?(?:fatal|deadly)\b/i,
    /\bmalignant (?:tumou?rs? )?(?:does|do|can) ?not (?:invade|spread)\b/i,
    /\bmalignant (?:tumou?rs? )?(?:stays?|remains?) (?:where|in place|put)\b/i,
    /\bmalignant (?:tumou?rs? )?(?:is|are) (?:always |simply |just )?(?:bigger|larger|faster)\b/i,
    /\bsize (?:or growth rate )?(?:alone )?(?:tells|shows|decides)\b[^.;]{0,30}\b(?:benign|malignant)\b/i,
    /\bmalignant (?:tumou?r|one)\b(?:(?!\bbenign\b)[^.;]){0,40}\b(?:does not invade|stays where|stays in place)\b/i,
    /\bspread of a benign\b/i
  ],
  inflammationInfection: [
    /\binflammation (?:is|means) (?:an? |the same (?:thing )?as (?:an? )?)?infection\b/i,
    /-?itis means infection\b/i,
    /\binfection (?:is|means) (?:the same (?:thing )?as )?inflammation\b/i,
    /\binflammation (?:is )?always (?:caused by|comes from|means) (?:an? )?infection\b/i,
    /\binflammation is (?:always )?(?:harmful|a disease)\b/i,
    /\binfection (?:is|means) (?:simply |just |any )?(?:the )?presence of\b/i,
    /\bany (?:bacteria|organisms?)\b[^.;]{0,30}\b(?:is|are|means) (?:an )?infection\b/i,
    /\bcoloni[sz]ation (?:is|means) when organisms? invade\b/i,
    /\bcoloni[sz]ation\b[^.;]{0,40}\b(?:invades?|damages?) (?:the |its )?tissue\b/i,
    /\ban infection (?:always )?(?:makes|leaves) (?:a person|someone|people) (?:feel )?(?:ill|sick)\b/i,
    /-itis as infection\b/i,
    /\b(?:inflammation|coloni[sz]ation) (?:is|means) (?:when )?(?:organisms? )?invad\w*/i,
    /\bwithout invading\b[^.;]{0,40}\b(?:is|that is) (?:an? )?infection\b/i,
    /\binfection is the body’s (?:local )?response\b/i
  ],
  reversedMechanism: [
    /\b(?:retained|trapped|uncleared|build-?up of|extra|rising) carbon dioxide\b[^.;]{0,80}\b(?:raises? (?:the )?(?:blood )?pH|makes? (?:the )?(?:blood )?pH (?:rise|go up|increase)|pH (?:rises|goes up|increases)|alkalosis|less acidic)\b/i,
    /\brespiratory acidosis\b[^.;]{0,40}\bpH (?:rises|goes up|increases)\b/i,
    /\bcarbon dioxide (?:that is |is )?not (?:being )?cleared\b[^.;]{0,60}\bpH (?:rises?|goes up|increases)\b/i,
    /\bset point has been lowered\b/i,
    /\bfever (?:is|means)\b[^.;]{0,30}\blowered set point\b/i,
    /\b(?:as|is) a lowered set point\b/i,
    /\bstroke volume (?:can )?(?:rises?|increases?|goes up)\b/i,
    /\bbreathing in is (?:usually )?(?:the )?hardest\b/i,
    /(?<!\bno )\btrouble (?:is )?getting (?:air )?in\b/i,
    /(?<!\bnot (?:that )?)\bair (?:that )?cannot get out\b/i,
    /\b(?:too much|excess) insulin\b[^.;]{0,40}\btype 1 diabetes\b/i,
    /\bmore acid means a higher pH\b/i,
    /\bfever\b[^.;]{0,60}\b(?:lowers?|reduces?) (?:the |its )?(?:body’s |body's )?(?:thermoregulatory )?set point\b/i,
    /\bset point (?:falls|drops|is lowered)\b/i,
    /\b(?:in a )?fever\b[^.;]{0,60}\b(?:cannot|can’t|can no longer|fails? to|unable to) (?:sweat|cool)\b/i,
    /\bventricles (?:have|get|gain) (?:more|extra|longer) time to fill\b/i,
    /\ba faster (?:heart|rate) always (?:pumps|means) (?:more|less)\b/i,
    /\bbreathing in suffers most\b/i,
    /\bharder to (?:breathe|move air) in than (?:out|to breathe out)\b/i,
    /\bobstructive\b[^.;]{0,60}\bhard(?:est|er)? to (?:breathe in|move air in)\b/i,
    /\bdehydration\b[^.;]{0,60}\b(?:raises|increases) (?:the )?(?:circulating )?(?:blood )?volume\b/i,
    /\bglucose (?:pushes|draws|pulls) water (?:out of|from) the (?:urine|filtrate)\b/i,
    /\btype 1 diabetes\b[^.;]{0,80}\bblood glucose (?:falls|stays low|drops)\b/i,
    /\batrophy (?:is|means) (?:an? )?(?:increase|growth|enlargement)\b/i,
    /\bin atrophy\b[^.;]{0,40}\b(?:fibers|cells) (?:grow|enlarge|increase in (?:size|number)|divide|multiply)\b/i,
    /\bhypertrophy (?:is|means) (?:an? )?increase in (?:the )?number\b/i,
    /\bhypertrophy (?:is|means)\b(?![^.;,]{0,20}\b(?:not|rather than)\b)[^.;,]{0,20}\b(?:more cells|number of cells)\b/i,
    /\bhyperplasia (?:is|means) (?:an? )?increase in (?:the )?size\b/i,
    /\bnecrosis (?:is|means) (?:an? )?(?:regulated|programmed|tidy|orderly)\b/i,
    /\bapoptosis (?:is|means) (?:an? )?(?:uncontrolled|messy|injury)\b/i,
    /\bapoptosis\b(?:(?!\b(?:without|not|no|never)\b)[^.;])*?\b(?:provok\w*|trigger\w*|set(?:s|ting)? off|caus\w*) inflammation\b/i,
    /\bhypertrophy\b(?:(?!\bhyperplasia\b)[^.;]){0,40}\bincrease in (?:the )?number of cells\b/i,
    /\b(?:spilled contents|inflammation)\b[^.;]{0,20}\bpoints? to apoptosis\b/i,
    /\b(?:tidy|regulated)\b[^.;]{0,30}\bpoints? to necrosis\b/i,
    /\binfarction is apoptosis\b/i,
    /\ban embolus (?:is a clot that )?(?:stays|remains)\b/i,
    /\ba thrombus (?:is|means)\b[^.;]{0,40}\b(?:travels|lodges (?:away|elsewhere|somewhere else))\b/i,
    /\ba thrombus (?:usually |normally |always )?(?:travels|moves away|breaks free and lodges)\b/i,
    /\bstayed put is an embolus\b/i,
    /\btraveled and lodged is a thrombus\b/i,
    /\bischemia (?:is|means) (?:an? )?(?:excess|too much|increased|extra)\b/i,
    /\bischemia (?:is|means) (?:tissue )?death\b/i,
    /\binfarction (?:is|means) (?:reduced|inadequate) (?:blood )?flow\b/i,
    /\bhypoxia (?:is|means) (?:an? )?(?:abnormally )?(?:high|excess|enlarge|stopping)\b/i,
    /\ban(?:a)?emia (?:is|means) (?:too many|an excess)\b/i,
    /\bhypertension (?:is|means) (?:a )?(?:low|lowered)\b/i,
    /\bheart failure (?:is|means) (?:that )?the heart (?:has )?stop(?:s|ped)\b/i,
    /\bin heart failure,? the heart (?:has )?stop(?:s|ped)\b/i,
    /\bin shock,? (?:the )?(?:poor |inadequate |low )?(?:perfusion|blood flow) is (?:localized|confined|limited)\b/i,
    /\bimmunodeficien\w* (?:is|means) (?:an? )?(?:overactive|exaggerated|excessive)\b/i,
    /\bimmunodeficien\w*\b[^.;]{0,60}\b(?:too strong|overreact\w*|exaggerated|attacks? the body’s own)\b/i,
    /\bautoimmun\w* (?:is|means|targets|attacks|reacts to) (?:an? )?(?:\w+ )?(?:harmless|outside|foreign)\b/i,
    /\ballerg(?:y|ies|ic reactions?) (?:is|are|means|targets|attacks) (?:an? )?(?:\w+ )?(?:the body’s own|self-tissue|its own)\b/i,
    /\ban allergy is an immune response that is (?:too weak|directed at the body)\b/i,
    /\bwastes? (?:build up|accumulate) in the urine\b/i,
    /\bwastes? (?:are )?(?:cleared|removed) faster\b/i,
    // One-word reversals of taught keys in the lessons' own sentence frames.
    /\bhypertension is blood pressure that stays (?:persistently )?low\b/i,
    /\bhypoxia is (?:too much|excess) oxygen\b/i,
    /\ban(?:a)?emia (?:is|means)\b[^.;]{0,50}\btoo much hemoglobin\b/i,
    /\binsulin\b[^.;]{0,30}\braises? (?:the )?blood glucose\b/i,
    /\bwithout enough insulin\b[^.;]{0,20}\bblood glucose (?:stays low|falls|drops)\b/i,
    /\bfalling pH means\b[^.;]{0,30}\bless acid/i,
    /\brising pH means\b[^.;]{0,30}\bmore acid/i,
    /\bhigh blood glucose (?:decreases|lowers|reduces) urine output\b/i,
    /\b(?:very fast|irregular) rhythm can raise\b/i,
    /\blosing body water (?:raises|increases)\b/i,
    /\bshock as too much blood\b/i
  ],
  wrongOrganOrSystem: [
    /\b(?:thyroid|liver|kidneys?|spleen)\b[^.;]{0,30}\b(?:makes?|releases?|produces?) insulin\b/i,
    /\btype 1 diabetes\b[^.;]{0,80}\b(?:too much insulin|not enough glucagon|glucagon is lost|cortisol|bile)\b/i,
    /\ban(?:a)?emia\b[^.;]{0,60}\b(?:clotting|bone density|nerve conduction)\b/i,
    /\bischemia\b[^.;]{0,30}\b(?:white blood cells|bone|calcium)\b/i,
    /\bhypertension\b[^.;]{0,40}\b(?:low blood sugar|rapid breathing|low red (?:blood )?cell)/i,
    /\bedema (?:is|means) (?:a )?(?:rapid|fast) heart/i,
    /\bedema (?:is|means)\b[^.;]{0,30}\b(?:muscle wasting|sweating|extra blood)\b/i,
    /\bplaque\b[^.;]{0,40}\b(?:outside|on the outside of) the (?:vessel|artery)\b/i,
    /\bembol(?:us|i) (?:can )?only (?:arise|form|come) (?:inside|in) the heart\b/i,
    /\bheart failure\b[^.;]{0,40}\b(?:too many red blood cells|fills with air|loses all electrical)\b/i,
    /\bobstructive\b[^.;]{0,60}\b(?:diaphragm is (?:completely )?paralyzed|no hemoglobin|rigid bone)\b/i,
    /\bkidney (?:filtration )?(?:fails|failure|is (?:severely )?impaired)\b[^.;]{0,60}\b(?:clot|bile|gas exchange)\b/i,
    /\bimmunodeficien\w*\b[^.;]{0,40}\btoo many red blood cells\b/i,
    /\b(?:liver|kidney|thyroid)(?:’s|'s)? insulin-(?:making|producing)\b/i,
    /\bplaque builds up outside\b/i
  ],
  wrongCauseOrEffect: [
    /\binfarction\b[^.;]{0,60}\b(?:overhydration|nerve overstimulation|excess oxygen|too much oxygen)\b/i,
    /\batherosclerosis (?:makes|leaves) (?:the )?(?:artery |arterial |vessel )?walls? more elastic\b/i,
    /\batherosclerosis\b[^.;]{0,60}\b(?:increases?|raises?) (?:the )?(?:\w+ )?(?:wall )?elasticity\b/i,
    /\batherosclerosis (?:is|means) (?:a )?(?:clot|fluid)\b/i,
    /\bembol(?:us|i)\b[^.;]{0,40}\bdissolves? on (?:its|their) own\b/i,
    /\bglucose\b(?![^.;]{0,20}\b(?:does|do) not\b)[^.;]{0,60}\b(?:damages?|irritates?|blocks?) the (?:bladder|ureters?|urinary tract)\b/i,
    /\bglucose\b[^.;]{0,40}\bstops? (?:the )?(?:body from making|kidneys from filtering)\b/i,
    /\bfluid\b[^.;]{0,60}\b(?:raises|increases|improves) (?:the )?(?:oxygen|gas exchange)\b/i,
    /\bfluid (?:in|filling) the alveoli\b[^.;]{0,60}\b(?:strengthens|speeds)\b/i,
    /\bpressure overload\b[^.;]{0,80}\b(?:more|extra) (?:muscle )?cells\b/i,
    /\bwall thickens because (?:there are )?more cells\b/i,
    /\batrophy\b[^.;]{0,60}\breplaced by (?:fluid|bone|fat)\b/i,
    /\b(?:any|every) (?:rise|increase) in heart rate\b[^.;]{0,40}\b(?:lowers|reduces|decreases) (?:the )?cardiac output\b/i,
    /\bany (?:brief |short )?rise in blood pressure (?:is|counts as) hypertension\b/i,
    /\bshock (?:is|means) (?:a )?(?:sudden )?(?:fright|scare)\b/i,
    /\bshock is (?:always )?caused (?:only )?by bleeding\b/i,
    /\ba fever raises the (?:body’s |body's )?(?:thermoregulatory )?set point\b/i
  ]
} as const;
const ALL_NEVER: readonly RegExp[] = Object.values(FALSE_FACT).flat();

const CENSUS: readonly Concept[] = [
  {
    concept: "Acute and chronic",
    skill: "Say what acute and chronic describe: how quickly a condition starts and how long it lasts",
    questions: {
      "pp-09": { owner: TISSUE, facts: [[/\bacute means a condition comes on suddenly and is short-lived\b/i, /\bchronic means it lasts a long time or keeps coming back\b/i]] }
    }
  },
  {
    concept: "Cells that shrink or grow",
    skill: "Tell atrophy, hypertrophy and hyperplasia apart",
    questions: {
      "pp-27": { owner: TISSUE, facts: [[/\bin atrophy from disuse\b/i, /\bthe existing muscle fibers decrease in size as their protein content falls\b/i]] },
      "pp-28": { owner: TISSUE, facts: [[/\bhypertrophy is an increase in the size of existing cells\b/i],
        [/\bchronic pressure overload\b/i, /\bits existing muscle cells increase in size\b/i, /\bheart wall thickens\b/i]] }
    }
  },
  {
    concept: "Two ways cells die",
    skill: "Tell necrosis from apoptosis",
    questions: {
      "pp-26": { owner: TISSUE, facts: [[/\bnecrosis is uncontrolled cell death that follows injury, and it often provokes inflammation\b/i],
        [/\bapoptosis is programmed cell death: a regulated process\b/i]] }
    }
  },
  {
    concept: "Benign and malignant tumors",
    skill: "Say how benign and malignant tumors behave",
    questions: {
      "pp-06": { owner: TISSUE, facts: [[/\ba benign tumor does not invade nearby tissue and does not spread to distant parts of the body\b/i]] },
      "pp-25": { owner: TISSUE, facts: [[/\ba malignant tumor invades nearby tissue and can spread to distant sites\b/i],
        [/\bsize or growth rate alone does not tell benign and malignant apart\b/i]] }
    }
  },
  {
    concept: "Ischemia and infarction",
    skill: "Place reduced flow and tissue death on one chain",
    questions: {
      "pp-07": { owner: FLOW, facts: [[/\bischemia means inadequate blood flow to a tissue\b/i]] },
      "pp-04": { owner: FLOW, facts: [[/\ban infarction is an area of tissue death caused by loss of blood supply\b/i]] }
    }
  },
  {
    concept: "Hypoxia and anemia",
    skill: "Say what low oxygen and low oxygen-carrying capacity are called, and read hypoxia's word parts",
    questions: {
      "pp-08": { owner: FLOW, facts: [[/\bhypoxia means an abnormally low level of oxygen\b/i, /\bhypo- \(below normal\), ox \(oxygen\)/i]] },
      "pp-02": { owner: FLOW, facts: [[/\banemia means too few healthy red blood cells or too little hemoglobin, so the blood’s oxygen-carrying capacity is reduced\b/i]] }
    }
  },
  {
    concept: "What narrows or blocks a vessel",
    skill: "Explain atherosclerosis, and tell a thrombus from an embolus",
    questions: {
      "pp-15": { owner: FLOW, facts: [[/\bin atherosclerosis, fatty plaque builds up within the artery wall and narrows the lumen\b/i]] },
      "pp-16": { owner: FLOW, facts: [[/\ba thrombus is a clot that forms inside a blood vessel and stays at the place it formed\b/i],
        [/\ban embolus is material that travels through the circulation and lodges away from where it came from\b/i]] }
    }
  },
  {
    concept: "Pressure and fluid",
    skill: "Define hypertension and edema",
    questions: {
      "pp-01": { owner: HEART, facts: [[/\bhypertension is blood pressure that stays persistently high over time, not a brief rise\b/i]] },
      "pp-05": { owner: HEART, facts: [[/\bedema is swelling caused by a buildup of excess fluid trapped in the tissues\b/i]] }
    }
  },
  {
    concept: "The pump: rhythm and heart failure",
    skill: "Explain why a very fast rhythm can lower output, and what heart failure means",
    questions: {
      "pp-17": { owner: HEART, facts: [[/\ba very fast or irregular rhythm can leave the ventricles too little time to fill between beats, so stroke volume can fall\b/i],
        [/\bcardiac output falls only if the drop in stroke volume outweighs the faster rate\b/i]] },
      "pp-18": { owner: HEART, facts: [[/\bheart failure means the heart cannot fill or pump effectively enough to maintain adequate circulation\b/i],
        [/\bthe heart has not stopped\b/i]] }
    }
  },
  {
    concept: "Low blood volume and shock",
    skill: "Explain why low volume lowers pressure, and how shock differs from local ischemia",
    questions: {
      "pp-23": { owner: HEART, facts: [[/\bsevere dehydration can lower blood pressure, mainly because circulating blood volume falls\b/i]] },
      "pp-29": { owner: HEART, facts: [[/\bin shock, inadequate perfusion is body-wide, so many tissues are underperfused at once\b/i]] }
    }
  },
  {
    concept: "Inflammation and fever",
    skill: "Explain how inflammation can harm healthy tissue, and why a fever is a raised set point",
    questions: {
      "pp-10": { owner: DEFENCES, facts: [[/\bwhen inflammation becomes excessive or goes on too long, the activated immune cells and the chemical signals they release, called inflammatory mediators, can also injure nearby healthy cells\b/i],
        [/\binflammation is normally protective\b/i]] },
      "pp-11": { owner: DEFENCES, facts: [[/\bin a fever, substances called pyrogens raise the body’s thermoregulatory set point\b/i],
        [/\bthe set point has been raised, so the body warms itself toward a higher target\b/i]] }
    }
  },
  {
    concept: "Immune responses aimed wrongly or too weak",
    skill: "Tell autoimmunity, allergy and immunodeficiency apart by target and strength",
    questions: {
      "pp-12": { owner: DEFENCES, facts: [[/\bin an autoimmune disorder, the immune system attacks the body’s own healthy tissue\b/i]] },
      "pp-13": { owner: DEFENCES, facts: [[/\ban allergy is an immune response that is exaggerated toward a normally harmless substance\b/i]] },
      "pp-14": { owner: DEFENCES, facts: [[/\bin immunodeficiency, the body cannot mount an adequate immune response, so infections can be more frequent\b/i]] }
    }
  },
  {
    concept: "Infection and colonization",
    skill: "Say what separates infection from harmless colonization",
    questions: {
      "pp-30": { owner: DEFENCES, facts: [[/\binfection is when organisms invade and multiply in the host’s tissue and provoke a response from the host\b/i],
        [/\bcolonization is when organisms live on or in the body\b/i, /\bwithout invading or damaging its tissue\b/i]] }
    }
  },
  {
    concept: "Airways, carbon dioxide and gas exchange",
    skill: "Explain obstructive airways, respiratory acidosis and blocked gas exchange",
    questions: {
      "pp-19": { owner: SYSTEMS, facts: [[/\bin an obstructive airway disease, narrowed airways raise the resistance to airflow, which makes it hard to move air out\b/i],
        [/\bbreathing out suffers most\b/i]] },
      "pp-20": { owner: SYSTEMS, facts: [[/\bthe retained carbon dioxide combines with water to form carbonic acid, so hydrogen ions build up and blood pH falls\b/i],
        [/\bit is called respiratory acidosis\b/i]] },
      "pp-21": { owner: SYSTEMS, facts: [[/\bwhen fluid or mucus fills the alveoli, it blocks gas exchange across the alveolar wall\b/i]] }
    }
  },
  {
    concept: "Kidneys and blood glucose",
    skill: "Say what failing filtration, type 1 diabetes and high blood glucose each change",
    questions: {
      "pp-22": { owner: SYSTEMS, facts: [[/\bwhen kidney filtration is severely impaired, waste products accumulate in the blood\b/i]] },
      "pp-03": { owner: SYSTEMS, facts: [[/\bin type 1 diabetes, the insulin-producing beta cells of the pancreas are lost, so the body cannot produce enough insulin and blood glucose stays high\b/i]] },
      "pp-24": { owner: SYSTEMS, facts: [[/\bmore glucose is filtered than the kidney tubules can reabsorb, so glucose stays in the filtrate and pulls water into the urine\b/i]] }
    }
  }
];

/** Bank pathophysiology questions no lesson teaches yet, each with the reason. Empty: all 30 are taught. */
const NOT_YET_TAUGHT: Readonly<Record<string, string>> = {};

// ---- E. what the lessons must never say ---------------------------------------------------------------
/** Diagnosis, treatment, medicine, clinical care and prognosis. None of it belongs in these lessons. */
const TREATMENT =
  /\bdiagnos|\btreat(?:ment|ing|s|ed|able)?\b|\bmedication|\bdoses?\b|\bdosage|\bprescri|\bsymptom|\bcure[sd]?\b|\bdoctors?\b|\bnurses?\b|\bclinic|\bpatients?\b|\binject|\btherap|\bmedicine|\bdrugs?\b|\bpills?\b|\btablets?\b|\bantibiotic|\bvaccin|\bhospital|\bsurg(?:ery|eon|ical)|\boperation\b|transplant|dialysis|inhaler|pacemaker|\bstent|\bbypass\b|\bchemo|\bradiation\b|\bprevent|\bdiet\b|\blifestyle\b|\brisk factor|\bprognos|\bsurviv|\bfatal|\bmortality|\bemergency|\b(?:911|999|112)\b|\bfirst aid\b|\bcase stud/i;
/** Anything that points a condition at the reader, or tells the reader what to look for or do. */
const SELF_DIAGNOSIS =
  /\byou (?:may|might|could|probably|likely) (?:have|be|get)\b|\bif you (?:have|feel|notice|get|experience|think|are)\b|\byour (?:own )?(?:body|heart|blood|lungs?|airways?|breathing|kidneys?|arter\w*|vessels?|immune|tissues?|cells?|muscles?|skin|glucose|sugar|pressure|temperature|urine|health|condition)\b|\bcheck (?:yourself|your)\b|\bwarning signs?\b|\bsigns? (?:of|include|to)\b|\bwatch (?:out )?for\b|\bseek\b|\bsee (?:a|your)\b|\bcall (?:a|an|your)\b|\bget (?:help|checked|tested)\b|\bself-diagnos|\bat home\b|\bmeans you\b|\byou(?:’re| are) (?:sick|ill)\b/i;

// A measured quantity written in words: a number word followed by a unit.
const NUMBER_WORD = "(?:one hundred|one thousand|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine|hundred|thousand))?";
const SPELLED_QUANTITY = new RegExp(
  `\\b${NUMBER_WORD}(?:\\s+(?:to|or|and)\\s+${NUMBER_WORD})?\\s+(?:percent|per cent|degrees?|beats?|breaths?|lit(?:re|er)s?|millilit|mm\\b|mmhg|seconds?|minutes?|hours?|days?|weeks?|months?|years?|times (?:a|per)|kilo|grams?|calories|micro|(?:a|per|each) (?:minute|second|hour|day)|on the \\w+ scale|in (?:ten|a hundred|every))|\\b(?:celsius|fahrenheit)\\b`,
  "i");

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
 * else's claim ("A student says ...") or quotes it, because posing a wrong claim for the learner to
 * judge is the point of those prompts. Left out are only the texts that are wrong on purpose: check
 * choices, the worked example's weak answer, the more-examples weak answers, the misconception's wrong
 * model and each common mistake as stated.
 */
const ATTRIBUTED = /\b(?:says?|said|thinks?|thought|writes?|wrote|claims?|answers?|labels?|believes?|concludes?)\b|“/i;
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
// Sentences end at . ! or ? before a space, or at a line break. Colons and semicolons stay inside.
const sentencesOf = (texts: readonly string[]) =>
  texts.flatMap((t) => t.split(/(?<=[.!?])\s+|\n+/)).map((s) => s.trim()).filter(Boolean);
const teachingSentences = (id: string) => sentencesOf(teachingStrings(sourceOf(id)));
const statesFact = (sentences: readonly string[], fact: Fact) => sentences.some((s) => fact.every((p) => p.test(s)));

const allQuestions = (source: ConceptEducationLessonSource) => {
  const c = source.lesson.content;
  return [c.guidedQuestion, ...c.practiceQuestions, ...c.masteryCheck];
};

const PATHOPHYSIOLOGY_BANK = (): MedTermQuestion[] => MEDTERM_BANK.filter((q) => q.area === "pathophysiology");
const taughtIndex = () => {
  const index = new Map<string, { concept: string; taught: Taught }>();
  for (const row of CENSUS) for (const [id, taught] of Object.entries(row.questions)) index.set(id, { concept: row.concept, taught });
  return index;
};
const moduleAffirmativeSentences = () => PATHOPHYSIOLOGY_ORDER.flatMap((id) => sentencesOf(affirmativeStrings(sourceOf(id))));

async function main() {
  console.log("\nhosa-medterm-pathophysiology:smoke\n");

  // ---- A. registration -----------------------------------------------------------------------------
  await check("A. the pathophysiology module follows physiology in one course, one chain, by reference", () => {
    const order = [...WORD_PART_ORDER, ...ANATOMY_ORDER, ...PHYSIOLOGY_ORDER, ...PATHOPHYSIOLOGY_ORDER];
    assert.deepEqual([...PUBLISHED_HOSA_SLUGS], order, "A1. the track file publishes word parts, anatomy, physiology, then pathophysiology");
    assert.deepEqual(HOSA_PUBLISHED_LESSONS.map((e) => e.id), order, "A1b. and registers them in that order");
    const course = EDUCATION_COURSES.find((c) => c.id === HOSA_MEDTERM_STUDY_COURSE);
    assert.ok(course && course.track === "HOSA", "A2. the Medical Terminology course exists on the HOSA track");
    assert.deepEqual(course.moduleIds, ["hosa-medterm-word-parts", "hosa-medterm-anatomy", PHYSIOLOGY_MODULE, PATHOPHYSIOLOGY_MODULE],
      "A2b. with the pathophysiology module last, after physiology");
    const pathoModule = getEducationModule(PATHOPHYSIOLOGY_MODULE);
    assert.ok(pathoModule && pathoModule.courseId === HOSA_MEDTERM_STUDY_COURSE && pathoModule.track === "HOSA",
      "A2c. the module belongs to that course");
    assert.equal(pathoModule.label, "Pathophysiology", "A2d. its learner-facing label says what it is");
    assert.equal(pathoModule.prerequisiteId, PHYSIOLOGY_MODULE, "A2e. and it builds on the physiology module");
    assert.match(pathoModule.outcome, /reasoning from normal structure and function to what changes/, "A2f. its outcome is reasoning from normal to changed");
    assert.match(pathoModule.outcome, /without diagnosing or treating anyone/, "A2g. and says it diagnoses and treats no one");
    assert.ok(!/HOSA|official|every|complete|master|ready/i.test(`${pathoModule.label} ${pathoModule.outcome}`),
      "A2h. and claims no official coverage, completion or readiness");
    assert.equal(getEducationModule(PHYSIOLOGY_MODULE)?.prerequisiteId, "hosa-medterm-anatomy", "A2i. control: physiology still builds on anatomy");
    assert.equal(getEducationLesson(NERVE_MUSCLE)?.nextLessonId, TISSUE, "A3. the last physiology lesson continues into pathophysiology");
    assert.equal(getEducationLesson(ANATOMY_ORDER[3])?.nextLessonId, BALANCE, "A3b. control: the last anatomy lesson still continues into physiology");
    for (const [index, id] of PATHOPHYSIOLOGY_ORDER.entries()) {
      const entry = getEducationLesson(id);
      assert.ok(entry, `A4. ${id} is registered`);
      assert.equal(entry.track, "HOSA", `A4b. ${id} is HOSA`);
      assert.equal(entry.courseId, HOSA_MEDTERM_STUDY_COURSE, `A4c. ${id} is in the Medical Terminology course`);
      assert.equal(entry.moduleId, PATHOPHYSIOLOGY_MODULE, `A4d. ${id} is in the pathophysiology module`);
      assert.equal(entry.variant, "concept", `A4e. ${id} is a concept lesson`);
      assert.equal(entry.visibility, "learner", `A4f. ${id} is learner-visible`);
      assert.equal(entry.practiceState, "available", `A4g. ${id} has its own checks`);
      assert.equal(entry.nextLessonId, PATHOPHYSIOLOGY_ORDER[index + 1] ?? null, `A5. ${id} chains to the next pathophysiology lesson, the last to nothing`);
      assert.equal(entry.skillSlug, undefined, `A5b. ${id} claims no skill`);
      assert.equal(entry.practiceDrill, undefined, `A5c. ${id} names no drill`);
      const original = LEARNING_SKILL_CATALOG.find((c) => c.slug === id);
      assert.ok(original && entry.source === original, `A6. ${id} holds the ORIGINAL catalog object`);
      assert.ok(entry.provenance === STABLE_TEACHING_HOSA_PATHOPHYSIOLOGY_PROVENANCE, `A7. ${id} carries the pathophysiology provenance`);
      const shown = presentSourceFreshness(entry.provenance);
      assert.equal(shown.degraded, false, `A7b. ${id} provenance does not degrade`);
      assert.equal(shown.authority, "stable-teaching", `A7c. ${id} is presented as stable teaching`);
      assert.match(shown.authorityLabel, /not a current-rules source/, `A7d. ${id} says it is not a rules source`);
    }
    for (const id of PHYSIOLOGY_ORDER) {
      assert.ok(getEducationLesson(id)?.provenance === STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE, `A7e. control: ${id} keeps the physiology provenance`);
      assert.equal(getEducationLesson(id)?.moduleId, PHYSIOLOGY_MODULE, `A7f. control: ${id} stays in the physiology module`);
    }
    const ends = educationLessonsForTrack("HOSA").filter((e) => e.courseId === HOSA_MEDTERM_STUDY_COURSE && e.nextLessonId === null);
    assert.deepEqual(ends.map((e) => e.id), [SYSTEMS], "A8. the course has exactly one end, the last pathophysiology lesson");
    assert.deepEqual(
      educationLessonsForTrack("HOSA").filter((e) => e.courseId === HOSA_MEDTERM_STUDY_COURSE).map((e) => e.id),
      order, "A8b. and the course lists its lessons in chain order");
  });

  await check("A9. the pathophysiology label says AI-generated, not official HOSA material, not yet reviewed by a person", () => {
    const label = STABLE_TEACHING_HOSA_PATHOPHYSIOLOGY_PROVENANCE.sourceLabel ?? "";
    assert.ok(Object.isFrozen(STABLE_TEACHING_HOSA_PATHOPHYSIOLOGY_PROVENANCE), "A9. the provenance object is frozen");
    assert.ok(STABLE_TEACHING_HOSA_PATHOPHYSIOLOGY_PROVENANCE !== STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE
      && STABLE_TEACHING_HOSA_PATHOPHYSIOLOGY_PROVENANCE !== STABLE_TEACHING_HOSA_ANATOMY_PROVENANCE,
    "A9a. its own object, so the pathophysiology review can change it without touching the other modules");
    assert.equal(STABLE_TEACHING_HOSA_PATHOPHYSIOLOGY_PROVENANCE.organization, "CompeteReady", "A9b. attributed to CompeteReady");
    assert.equal(STABLE_TEACHING_HOSA_PATHOPHYSIOLOGY_PROVENANCE.authority, "stable-teaching", "A9b2. on the stable-teaching tier, never official");
    assert.match(label, /^AI-generated CompeteReady lesson\b/, "A9c. AI-generated CompeteReady instruction");
    assert.match(label, /not an official HOSA lesson or test item/, "A9d. and not an official HOSA lesson or test item");
    assert.match(label, /not yet reviewed by a person/, "A9e. and not yet reviewed by a person");
    assert.equal(STABLE_TEACHING_HOSA_PROVENANCE.sourceLabel, "AI-generated CompeteReady lesson, not an official HOSA lesson or test item — not yet reviewed by a person",
      "A9f. control: the word-part lessons keep their own constant, with the same wording");
    assert.match(STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE.sourceLabel ?? "", /not yet reviewed by a person/, "A9f2. control: and physiology keeps its own");
    const catalog = read("lib/learning-content.ts");
    const at = catalog.indexOf("---- HOSA MEDICAL TERMINOLOGY: PATHOPHYSIOLOGY");
    const record = catalog.slice(at, catalog.indexOf(`slug: "${TISSUE}"`));
    assert.ok(at >= 0 && record.length > 0, "A9g. control: the pathophysiology authoring record was located");
    assert.match(record, /AI-drafted/, "A9h. the record says the lessons were AI-drafted");
    assert.match(record, /have NOT yet\s+\/\/\s+had a human content review|have NOT yet had a human content review/,
      "A9i. and have not had a human content review");
    assert.match(record, /subject-accuracy review before release/, "A9j. and that a subject-accuracy review is required before release");
    assert.match(record, /before changing the label or pushing these lessons/, "A9k. before the label changes or the lessons are pushed");
    assert.match(record, /not a human review and does not replace one/, "A9l. and that AI review is not that review");
    assert.match(record, /not medical advice/, "A9m. and that the lessons are not medical advice");
  });

  await check("A10. every pathophysiology lesson says it is knowledge for a test, not a way to judge anyone's health", () => {
    for (const id of PATHOPHYSIOLOGY_ORDER) {
      const why = sourceOf(id).lesson.content.whyMatters;
      assert.ok(why.endsWith(` ${SAFETY_LINE}`), `A10. ${id} ends "why it matters" with the safety line`);
    }
    assert.ok(HOSA_MEDTERM_PATHOPHYSIOLOGY_PRACTICE_ENTRY.detail.includes(SAFETY_LINE), "A10b. and so does the course-end practice link");
    assert.ok(medTermFocus("pathophysiology").disclosure.includes(SAFETY_LINE), "A10c. and the pathophysiology practice choice");
  });

  // ---- B. the census --------------------------------------------------------------------------------
  await check("B. every one of the bank's pathophysiology questions is classified, with a teaching owner or a reason", () => {
    const bank = PATHOPHYSIOLOGY_BANK();
    assert.equal(bank.length, 30, "B1. the bank asks 30 pathophysiology questions");
    assert.deepEqual(bank.map((q) => q.id), Array.from({ length: 30 }, (_, i) => `pp-${String(i + 1).padStart(2, "0")}`),
      "B1b. pp-01 to pp-30, in order");
    const index = taughtIndex();
    const censused = [...index.keys(), ...Object.keys(NOT_YET_TAUGHT)];
    assert.equal(new Set(censused).size, censused.length, "B2. no question is classified twice");
    assert.deepEqual([...censused].sort(), bank.map((q) => q.id).sort(), "B2b. and every bank question is classified, nothing else");
    for (const [id, reason] of Object.entries(NOT_YET_TAUGHT)) assert.ok(reason.trim(), `B2c. ${id} says why it is not taught`);
    for (const row of CENSUS) {
      assert.ok(row.concept.trim() && row.skill.trim(), `B3. "${row.concept}" names the skill it needs`);
      assert.ok(Object.keys(row.questions).length > 0, `B3b. "${row.concept}" is backed by at least one bank question`);
    }
    const owned = new Map<string, number>();
    for (const row of CENSUS) for (const taught of Object.values(row.questions)) owned.set(taught.owner, (owned.get(taught.owner) ?? 0) + 1);
    for (const id of PATHOPHYSIOLOGY_ORDER) assert.equal(owned.get(id), 6, `B4. ${id} owns six of the bank's questions`);
    for (const row of CENSUS) {
      const lessons = new Set(Object.values(row.questions).map((t) => t.owner));
      assert.equal(lessons.size, 1, `B4b. "${row.concept}" has one teaching owner, not several`);
    }
  });

  // ---- C. alignment ---------------------------------------------------------------------------------
  await check("C. each taught question's fact is stated in its owner lesson's teaching, and no listed wrong-fact pattern appears in what the module presents as true", () => {
    const index = taughtIndex();
    const moduleSentences = moduleAffirmativeSentences();
    for (const q of PATHOPHYSIOLOGY_BANK()) {
      const row = index.get(q.id);
      if (!row) continue;
      const sentences = teachingSentences(row.taught.owner);
      assert.ok(row.taught.facts.length > 0, `C1. ${q.id} names the fact that answers it`);
      for (const fact of row.taught.facts) {
        assert.ok(statesFact(sentences, fact), `C2. ${q.id} (${q.correctAnswer}): ${row.taught.owner} teaches ${fact.map((p) => p.source).join(" + ")}`);
      }
    }
    for (const wrong of ALL_NEVER) {
      const said = moduleSentences.find((s) => wrong.test(s));
      assert.equal(said, undefined, `C3. no pathophysiology lesson states ${wrong.source} (in "${said ?? ""}")`);
    }
    // Each fact is also the bank's own answer: the key's distinctive words appear in the taught fact.
    const keyWords: Readonly<Record<string, RegExp>> = {
      "pp-01": /persistently high/i, "pp-02": /oxygen-carrying capacity/i, "pp-03": /insulin/i, "pp-04": /loss of blood supply/i,
      "pp-06": /does not invade/i, "pp-07": /inadequate blood flow/i, "pp-09": /short-lived/i, "pp-11": /set point/i,
      "pp-12": /own healthy tissue/i, "pp-13": /normally harmless substance/i, "pp-14": /cannot mount an adequate immune response/i,
      "pp-15": /narrow/i, "pp-20": /acid/i, "pp-21": /blocks gas exchange across the alveolar wall/i,
      "pp-22": /accumulate in the blood/i, "pp-23": /circulating blood volume falls/i, "pp-24": /pulls water into the urine/i,
      "pp-25": /invades nearby tissue and can spread to distant sites/i, "pp-29": /body-wide/i,
      "pp-05": /swelling/i, "pp-08": /hypoxia/i, "pp-10": /injure nearby healthy cells/i,
      "pp-16": /travels through the circulation and lodges away/i, "pp-17": /too little time to fill between beats/i,
      "pp-18": /fill or pump effectively enough to maintain adequate circulation/i, "pp-19": /hard to move air out/i,
      "pp-26": /often provokes inflammation/i, "pp-27": /decrease in size as their protein content falls/i,
      "pp-28": /existing muscle cells increase in size/i, "pp-30": /invades? and multipl/i
    };
    assert.deepEqual(Object.keys(keyWords).sort(), PATHOPHYSIOLOGY_BANK().map((q) => q.id).sort(), "C3d. every pathophysiology question's key is pinned to its census fact");
    for (const [id, word] of Object.entries(keyWords)) {
      const q = PATHOPHYSIOLOGY_BANK().find((item) => item.id === id)!;
      assert.match(`${q.correctAnswer} ${q.explanation}`, new RegExp(word.source.replace(/does not invade/, "(?:does not|do not) invade"), "i"),
        `C3b. control: ${id}'s key or explanation says "${word.source}"`);
      assert.ok(index.get(id)!.taught.facts.some((fact) => fact.some((p) => word.test(p.source.replace(/\\b/g, "").replace(/\\\(/g, "(").replace(/\\\)/g, ")")))),
        `C3c. ${id}'s census fact names its key`);
    }
    // Controls. A fact present only in a check or a weak answer is not teaching, and a fact split
    // across two sentences is not one fact.
    const tissue = sourceOf(TISSUE);
    const checkStrings = allQuestions(tissue)
      .flatMap((q) => [q.prompt, q.hint, q.explanation, (q as { retryPrompt?: string }).retryPrompt, ...q.choices])
      .filter((s): s is string => typeof s === "string");
    assert.ok(checkStrings.length > 0 && checkStrings.every((s) => !teachingStrings(tissue).includes(s)),
      "C4. control: no check text (prompt, hint, explanation, choice) is counted as teaching");
    const affirmative = affirmativeStrings(tissue);
    const feedback = allQuestions(tissue).flatMap((q) => [q.hint, q.explanation]);
    assert.ok(feedback.length > 0 && feedback.every((text) => affirmative.includes(text)),
      "C4a. control: every check's hint and explanation is in the wrong-fact scan");
    assert.ok(affirmative.includes(tissue.lesson.summary) && affirmative.includes(tissue.description),
      "C4b. control: and so are the summary and the description");
    assert.ok(!affirmative.includes(tissue.lesson.content.workedExample.weakAnswer)
      && !affirmative.includes(tissue.lesson.content.misconception!.wrongModel),
    "C4c. control: the weak answer and the wrong model, which are wrong on purpose, are not");
    assert.ok(affirmativeStrings(sourceOf(FLOW)).some((text) => /^A tissue is getting too little blood\b/.test(text)),
      "C4d. control: a check prompt's plain statements are scanned");
    assert.ok(!affirmativeStrings(sourceOf(HEART)).some((text) => /Heart failure means the heart has stopped beating/.test(text)),
      "C4e. control: a claim the worked example quotes, posed to be judged, is not");
    const planted = JSON.parse(JSON.stringify(tissue)) as ConceptEducationLessonSource;
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
      "C4f. control: nothing planted in a check's prompt, hint, explanation or choices is teaching");
    assert.ok(!statesFact(["Hypertension is a condition.", "It is blood pressure that stays persistently high over time, not a brief rise."],
      [/\bhypertension is blood pressure that stays persistently high over time, not a brief rise\b/i]), "C4g. control: a fact split over two sentences does not count");
  });

  await check("C5. alignment report: 30 pathophysiology questions, taught and not yet taught", () => {
    const taught = [...taughtIndex().keys()];
    const notTaught = Object.keys(NOT_YET_TAUGHT);
    const bankTotal = PATHOPHYSIOLOGY_BANK().length;
    assert.equal(bankTotal, 30, "C5. the bank holds thirty pathophysiology questions");
    assert.deepEqual([...taught, ...notTaught].sort(), PATHOPHYSIOLOGY_BANK().map((q) => q.id).sort(), "C5a. every bank question is counted exactly once");
    assert.equal(taught.length, 30, "C5b. all thirty are taught by the pathophysiology module");
    assert.equal(notTaught.length, 0, "C5c. none is left untaught");
    console.log(`       PATHOPHYSIOLOGY QUESTIONS: ${bankTotal}`);
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
    const stem = (w: string) => w.replace(/ies$/, "y").replace(/(?<=[a-z]{3})(?:es|s)$/, "").replace(/(?<=[a-z]{3})e$/, "");
    const contentWords = (s: string) => (s.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length >= 3 && !STOP.has(w)).map(stem);
    let total = 0;
    let keyIsLongest = 0;
    const positionCounts = [0, 0, 0, 0];
    for (const id of PATHOPHYSIOLOGY_ORDER) {
      const source = sourceOf(id);
      const questions = allQuestions(source);
      assert.ok(questions.length >= 5 && questions.length <= 7, `D1. ${id} has five to seven checks (${questions.length})`);
      assert.equal(source.lesson.content.masteryCheck.length, 1, `D1b. ${id} ends with one final check`);
      const taughtWords = new Set(teachingStrings(source).flatMap(contentWords));
      const lessonPositions: number[] = [];
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
        for (const word of contentWords(q.correctAnswer)) {
          assert.ok(taughtWords.has(word), `D3c. ${at}: the key's "${word}" is taught in ${id}, so the check tests the lesson`);
        }
        lessonPositions.push(position);
        positionCounts[position] += 1;
        const lengths = q.choices.map((c) => c.length);
        const longest = Math.max(...lengths);
        if (q.correctAnswer.length === longest && lengths.filter((l) => l === longest).length === 1) keyIsLongest += 1;
        for (const item of MEDTERM_BANK) {
          assert.ok(overlap(norm(q.prompt), norm(item.question)) < 0.6, `D4. ${at} is not a copy of bank item ${item.id}`);
        }
      }
      assert.ok(new Set(lessonPositions).size >= 3, `D5. ${id} spreads its keys over at least three positions`);
      for (let i = 2; i < lessonPositions.length; i += 1) {
        assert.ok(!(lessonPositions[i] === lessonPositions[i - 1] && lessonPositions[i] === lessonPositions[i - 2]),
          `D5b. ${id} never keys the same position three checks in a row`);
      }
    }
    assert.equal(total, 35, "D6. thirty-five checks across the module");
    // Across lessons: no one position keys more than two of the five Final checks or the same check slot
    // in more than three lessons, and no two lessons share a whole key-position sequence.
    const positionRuleFailures = (sequences: readonly (readonly number[])[]) => {
      const failures: string[] = [];
      const finals = sequences.map((seq) => seq[seq.length - 1]);
      if (![0, 1, 2, 3].every((pos) => finals.filter((f) => f === pos).length <= 2)) failures.push(`D6d. no answer position keys more than two of the five Final checks (${finals.join("/")})`);
      for (let slot = 0; slot < Math.max(...sequences.map((seq) => seq.length)); slot += 1) {
        const atSlot = sequences.map((seq) => seq[slot]).filter((pos): pos is number => pos !== undefined);
        if (![0, 1, 2, 3].every((pos) => atSlot.filter((p) => p === pos).length <= 3)) failures.push(`D6e. check ${slot + 1} keys no one position in more than three lessons (${atSlot.join("/")})`);
      }
      if (new Set(sequences.map((seq) => seq.join(""))).size !== sequences.length) failures.push("D6f. no two lessons share a key-position sequence");
      return failures;
    };
    const sequences = PATHOPHYSIOLOGY_ORDER.map((id) => allQuestions(sourceOf(id)).map((q) => q.choices.indexOf(q.correctAnswer)));
    assert.deepEqual(positionRuleFailures(sequences), [], "D6d-f. the answer positions pass the cross-lesson rules");
    const sameFinals = sequences.map((seq, i) => [...seq.slice(0, -1), [0, 0, 0, 0, 3][i]]);
    assert.ok(positionRuleFailures(sameFinals).some((f) => f.startsWith("D6d.")), "D6g. control: four Final checks keyed at one position are caught");
    assert.ok(positionRuleFailures([sequences[0], ...sequences.slice(0, -1)]).some((f) => f.startsWith("D6f.")), "D6h. control: two lessons sharing a sequence are caught");
    assert.ok(positionCounts.every((n) => n >= 6 && n <= 14), `D6b. every answer position is used, none more than 40% (${positionCounts.join("/")})`);
    assert.ok(keyIsLongest <= total / 4, `D6c. the key is the uniquely longest choice in at most a quarter of checks (${keyIsLongest}/${total})`);
    assert.ok(MEDTERM_BANK.some((item) => overlap(norm("An acute condition is one that:"), norm(item.question)) >= 0.6),
      "D7. control: a bank question copied word for word is caught by the originality measure");
  });

  await check("D8. each check's explanation argues for its own key", () => {
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
    for (const id of PATHOPHYSIOLOGY_ORDER) {
      for (const q of allQuestions(sourceOf(id))) {
        assert.ok(arguesFor(q, q.correctAnswer), `D8. "${q.prompt.slice(0, 50)}" explains why its key is right before it names a wrong choice`);
        for (const wrong of q.choices.filter((choice) => choice !== q.correctAnswer)) {
          assert.ok(!arguesFor(q, wrong), `D8b. control: "${q.prompt.slice(0, 50)}" re-keyed to "${wrong}" is caught`);
          rekeyed += 1;
        }
      }
    }
    assert.equal(rekeyed, 105, "D8c. control: every wrong choice of all 35 checks was tried as a key");
  });

  await check("D9. the checks save nothing and claim no mastery; the last one is a Final check", () => {
    const practice = stripComments(read("components/lessons/concept-education-lesson-practice.tsx"));
    assert.match(practice, /final:\s*"Final check"/, "D9. the last check is labelled Final check");
    for (const banned of ["fetch(", "@/lib/prisma", "localStorage", "recordPracticeOutcome", "MasteryProgress"]) {
      assert.ok(!practice.includes(banned), `D9b. the lesson checks contain no ${banned}`);
    }
    for (const id of PATHOPHYSIOLOGY_ORDER) {
      const text = lessonStrings(sourceOf(id)).join("\n");
      assert.ok(!/master(?:y|ed|ing)?\b|mastery test|readiness|\bXP\b|streak|certif|credential|course complete|completed the course/i.test(text),
        `D9c. ${id} claims no mastery, readiness, XP or completion`);
    }
  });

  // ---- E. no official claim, no number, no clinical advice, no self-diagnosis, no other track --------
  await check("E. the lessons state no HOSA rule, no number, no diagnosis or treatment, nothing aimed at the reader, and no other track", () => {
    const CLAIMS: ReadonlyArray<readonly [label: string, pattern: RegExp, claim: string]> = [
      ["the organization's name", /\bHOSA\b/, "HOSA tests these conditions every year."],
      ["points or scores", /\b\d+\s*points?\b|\bpoints? (?:each|per|for)\b|\bscor(?:e|es|ed|ing)\b|rating sheet/i, "Each correct answer scores 2 points."],
      ["rules, guidelines or exams", /\b(?:HOSA|event|official|competition)\s+rules?\b|guideline|\bexam\b|competition|test coverage|on the test/i,
        "This is on the test every year."],
      ["diagnosis, treatment, medicine or clinical care", TREATMENT, "People with type 1 diabetes inject insulin every day."],
      ["self-diagnosis framing or care advice", SELF_DIAGNOSIS, "If you feel short of breath, you may have asthma."],
      ["other track", /\bDECA\b|debate|role-?play|performance indicator|\bjudges?\b(?! anyone’s health)|rebuttal/i, "A judge would expect this."]
    ];
    const numbered: string[] = [];
    for (const id of PATHOPHYSIOLOGY_ORDER) {
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
      for (const sentence of sentencesOf(lessonStrings(source))) {
        if (/\d/.test(sentence)) numbered.push(sentence);
        assert.ok(!/\d/.test(sentence.replace(/\btype 1 diabetes\b/gi, "")), `E5. ${id}: the only digit is in the name "type 1 diabetes" ("${sentence.slice(0, 60)}")`);
        const spelled = sentence.match(SPELLED_QUANTITY);
        assert.equal(spelled, null, `E5b. ${id} states no measured quantity in words (${spelled?.[0] ?? ""})`);
      }
    }
    assert.ok(numbered.length > 0 && numbered.every((s) => /\btype 1 diabetes\b/i.test(s)), "E5c. control: the name was found, and it is the only digit");
    for (const [label, pattern, claim] of CLAIMS) assert.ok(pattern.test(claim), `E4. control: the ${label} scan catches "${claim}"`);
    for (const claim of ["Anyone with these signs should see a doctor.", "The treatment is rest and fluids.", "Take a pill to lower blood pressure.",
      "A diet low in salt helps.", "Surgery can remove the tumor.", "This is a medical emergency, so call 911."]) {
      assert.ok(TREATMENT.test(claim) || SELF_DIAGNOSIS.test(claim), `E4b. control: care advice "${claim}" is caught`);
    }
    for (const claim of ["If your heart races, you may have an arrhythmia.", "Watch for swelling in your legs.", "Check your blood pressure at home.",
      "Warning signs include chest pain."]) {
      assert.ok(SELF_DIAGNOSIS.test(claim) || TREATMENT.test(claim), `E4c. control: self-diagnosis framing "${claim}" is caught`);
    }
    for (const claim of ["The disease lasted for three weeks.", "About ten percent of people carry it.", "It develops over twenty years."]) {
      assert.ok(SPELLED_QUANTITY.test(claim), `E4d. control: a quantity written in words is caught ("${claim}")`);
    }
    assert.ok(!TREATMENT.test(SAFETY_LINE) && !SELF_DIAGNOSIS.test(SAFETY_LINE), "E4e. control: the safety line itself passes both scans");
    assert.ok(!SELF_DIAGNOSIS.test("If you can say whether cells shrank, you can reason out the term."),
      "E4f. control: telling the reader how to reason is not self-diagnosis framing");
  });

  await check("E6. the wrong-fact scan catches a planted example of each kind of false fact it lists (reversed mechanism, wrong organ, inflammation and infection, benign and malignant, acute and chronic, cause and effect); wordings it has no pattern for are not caught", () => {
    const PLANTED: ReadonlyArray<readonly [kind: keyof typeof FALSE_FACT, sentence: string]> = [
      ["acuteChronic", "Acute means a condition lasts a long time or keeps coming back."],
      ["acuteChronic", "Chronic means a condition comes on suddenly and is short-lived."],
      ["acuteChronic", "Acute means severe."],
      ["acuteChronic", "A chronic condition comes on suddenly."],
      ["acuteChronic", "Acute and chronic tell you how severe a condition is."],
      ["acuteChronic", "Sudden and short is chronic; long-lasting or returning is acute."],
      ["acuteChronic", "Chronic: it came on suddenly and was short-lived."],
      ["acuteChronic", "Starting suddenly and being over quickly describes a chronic condition."],
      ["benignMalignant", "A benign tumor invades nearby tissue and spreads to distant sites."],
      ["benignMalignant", "A benign tumor can grow into the tissue around it and spread."],
      ["benignMalignant", "A malignant tumor does not invade nearby tissue."],
      ["benignMalignant", "A malignant tumor is simply bigger than a benign one."],
      ["benignMalignant", "A malignant tumor usually stays where it started."],
      ["benignMalignant", "Metastasis is the spread of a benign tumor."],
      ["inflammationInfection", "Inflammation is an infection of the tissue."],
      ["inflammationInfection", "The suffix -itis means infection."],
      ["inflammationInfection", "Infection is simply the presence of bacteria on the skin."],
      ["inflammationInfection", "Colonization is when organisms invade and multiply in the host’s tissue."],
      ["inflammationInfection", "Read -itis as infection, then ask what caused it."],
      ["inflammationInfection", "Inflammation is organisms invading and multiplying in tissue."],
      ["inflammationInfection", "Colonization is organisms invading and multiplying in tissue."],
      ["inflammationInfection", "Many bacteria live on the skin without invading tissue, and that is infection."],
      ["inflammationInfection", "Infection is the body’s response."],
      ["reversedMechanism", "The retained carbon dioxide combines with water, so blood pH rises."],
      ["reversedMechanism", "In a fever, pyrogens lower the body’s thermoregulatory set point."],
      ["reversedMechanism", "When carbon dioxide is not being cleared well, the blood pH rises."],
      ["reversedMechanism", "In a fever the set point has been lowered, so the body warms itself."],
      ["reversedMechanism", "Describe a fever as a lowered set point, not a failure to cool."],
      ["reversedMechanism", "There is too little time between beats for the ventricles to fill, so each beat has less blood to pump out and stroke volume rises."],
      ["reversedMechanism", "Hypertrophy is different: it is an increase in the number of cells."],
      ["reversedMechanism", "Severe injury, spilled contents and inflammation point to apoptosis; tidy, regulated removal points to necrosis."],
      ["reversedMechanism", "The tissue death in an infarction is apoptosis."],
      ["reversedMechanism", "Immunodeficiency is the opposite problem: a response that is too strong."],
      ["reversedMechanism", "Apoptosis triggers inflammation, not necrosis."],
      ["reversedMechanism", "Apoptosis is programmed cell death: a regulated process in which a cell takes itself apart tidily, and the pieces are cleared away while setting off inflammation."],
      ["reversedMechanism", "Hypertension is blood pressure that stays persistently low over time, not a brief rise."],
      ["reversedMechanism", "Hypoxia is too much oxygen, whatever the cause."],
      ["reversedMechanism", "Anemia means too few healthy red blood cells or too much hemoglobin."],
      ["reversedMechanism", "Insulin is the hormone that raises blood glucose."],
      ["reversedMechanism", "Without enough insulin, blood glucose stays low."],
      ["reversedMechanism", "A falling pH means the blood is becoming less acidic."],
      ["reversedMechanism", "Explain why high blood glucose decreases urine output."],
      ["reversedMechanism", "A very fast or irregular rhythm can raise cardiac output."],
      ["reversedMechanism", "Losing body water raises plasma volume."],
      ["reversedMechanism", "Think of shock as too much blood reaching many tissues at once."],
      ["reversedMechanism", "In an obstructive airway disease, breathing in is usually hardest."],
      ["reversedMechanism", "In an obstructive airway disease, the main trouble is getting air in."],
      ["reversedMechanism", "In an obstructive airway disease, air cannot get out at all."],
      ["reversedMechanism", "Too much insulin is what goes wrong in type 1 diabetes."],
      ["reversedMechanism", "Hypertrophy means there are more cells in the organ."],
      ["reversedMechanism", "Apoptosis is tidy, but it triggers inflammation in the tissue around it."],
      ["reversedMechanism", "A thrombus usually travels to a smaller vessel."],
      ["reversedMechanism", "A clot that stayed put is an embolus."],
      ["reversedMechanism", "Material that traveled and lodged is a thrombus."],
      ["reversedMechanism", "A very fast rhythm means the ventricles have more time to fill between beats."],
      ["reversedMechanism", "In an obstructive airway disease, breathing in suffers most."],
      ["reversedMechanism", "In type 1 diabetes, blood glucose stays low."],
      ["reversedMechanism", "Hypertrophy is an increase in the number of cells."],
      ["reversedMechanism", "Necrosis is a regulated, programmed process."],
      ["reversedMechanism", "An embolus stays at the place it formed."],
      ["reversedMechanism", "In heart failure, the heart has stopped beating."],
      ["reversedMechanism", "Immunodeficiency is an exaggerated immune response."],
      ["reversedMechanism", "An allergy targets the body’s own healthy tissue."],
      ["wrongOrganOrSystem", "The liver releases insulin to lower blood glucose."],
      ["wrongOrganOrSystem", "Anemia most directly reduces clotting."],
      ["wrongOrganOrSystem", "Edema is a rapid heartbeat."],
      ["wrongOrganOrSystem", "When kidney filtration fails, the blood can no longer clot."],
      ["wrongOrganOrSystem", "In type 1 diabetes, the liver’s insulin-making beta cells are lost."],
      ["wrongOrganOrSystem", "In atherosclerosis, fatty plaque builds up outside an artery wall."],
      ["wrongCauseOrEffect", "An infarction is tissue death caused by excess oxygen."],
      ["wrongCauseOrEffect", "Atherosclerosis makes the artery wall more elastic."],
      ["wrongCauseOrEffect", "High glucose damages the bladder, so more urine is made."],
      ["wrongCauseOrEffect", "Fluid in the alveoli improves gas exchange."],
      ["wrongCauseOrEffect", "Shock is always caused by bleeding."],
      ["wrongCauseOrEffect", "A fever raises the set point, so the body warms itself."]
    ];
    const kinds = new Set<string>();
    for (const [kind, sentence] of PLANTED) {
      assert.ok(FALSE_FACT[kind].some((p) => p.test(sentence)), `E6. the ${kind} scan catches "${sentence}"`);
      kinds.add(kind);
    }
    assert.deepEqual([...kinds].sort(), Object.keys(FALSE_FACT).sort(), "E6b. every kind of false fact has a planted control");
    for (const correct of ["A benign tumor does not invade nearby tissue and does not spread to distant parts of the body.",
      "The suffix -itis means inflammation, not infection.", "Glucose does not irritate or block the urinary tract.",
      "Atherosclerosis makes the artery wall stiffer.",
      "So a fever is not temperature control breaking down, and it is not the body failing to cool.",
      "Immunodeficiency is the opposite problem: a response that is too weak.",
      "Apoptosis clears cells away tidily, without provoking inflammation.",
      "Apoptosis does not trigger inflammation.",
      "Hypertrophy means larger cells, not more cells.",
      "Hypertrophy is not more cells but bigger cells.",
      "Malignant is the opposite: a malignant tumor invades nearby tissue and can spread.",
      "Unlike a malignant tumor, a benign tumor stays where it started.",
      "In an obstructive airway disease it is not that air cannot get out; air is hard to get out.",
      "The main trouble is getting air out, not getting air in.",
      "Hypertension is blood pressure that stays persistently high over time, not a brief rise.",
      "Insulin lowers blood glucose.",
      "In an obstructive airway disease, the main trouble is getting air out.",
      "Ask whether it moved: a clot that stayed put is a thrombus, and material that traveled and lodged is an embolus.",
      "In a fever, substances called pyrogens raise the body’s thermoregulatory set point."]) {
      assert.equal(ALL_NEVER.find((p) => p.test(correct)), undefined, `E6c. control: the correct statement "${correct}" is not flagged`);
    }
    // The scan runs over what the lessons mean to be true, and a planted wrong fact in a hint is caught.
    const planted = JSON.parse(JSON.stringify(sourceOf(SYSTEMS))) as ConceptEducationLessonSource;
    (planted.lesson.content.guidedQuestion as { hint: string }).hint = "Remember that retained carbon dioxide makes the blood pH rise.";
    assert.ok(sentencesOf(affirmativeStrings(planted)).some((s) => ALL_NEVER.some((p) => p.test(s))),
      "E6d. control: a reversed fact planted in a check's hint is caught by the module scan");
  });

  // ---- F. the learning graph and the practice destination -------------------------------------------
  await check("F1. the right practice link sits on the right lesson, and the course end claims no completion", () => {
    for (const entry of EDUCATION_LESSONS) {
      const isEnd = entry.track === "HOSA" && entry.courseId === HOSA_MEDTERM_STUDY_COURSE && entry.visibility === "learner" && entry.nextLessonId === null;
      assert.equal(hosaCourseEndAction(entry.id) !== null, isEnd, `F1. ${entry.id}: course-end action only at the course's end`);
      assert.ok(!(hosaCourseEndAction(entry.id) && decaCourseEndAction(entry.id)), `F1b. ${entry.id}: at most one course-end action`);
    }
    assert.equal(hosaCourseEndAction(SYSTEMS), HOSA_MEDTERM_PATHOPHYSIOLOGY_PRACTICE_ENTRY, "F2. the last pathophysiology lesson ends in pathophysiology practice");
    assert.equal(hosaCourseEndAction(NERVE_MUSCLE), null, "F2a. the last physiology lesson is no longer the course end");
    assert.equal(hosaLessonPracticeReturn(NERVE_MUSCLE), HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY,
      "F2b. it keeps its physiology practice link, now beside the next lesson");
    assert.equal(hosaLessonPracticeReturn(ANATOMY_ORDER[3]), HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY, "F2b2. control: the last anatomy lesson keeps its link");
    assert.equal(hosaLessonPracticeReturn(BALANCE), HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_RETURN, "F2b3. control: the first physiology lesson keeps its return");
    assert.equal(hosaLessonPracticeReturn(TISSUE), HOSA_MEDTERM_PATHOPHYSIOLOGY_PRACTICE_RETURN, "F2c. the first pathophysiology lesson links back to pathophysiology practice");
    for (const id of [FLOW, HEART, DEFENCES]) assert.equal(hosaLessonPracticeLink(id), null, `F2d. ${id} owns no area and does not jump ahead`);
    const target = new URL(HOSA_MEDTERM_PATHOPHYSIOLOGY_PRACTICE_ENTRY.href, "http://localhost");
    assert.equal(target.pathname, HOSA_MEDTERM_PRACTICE_ROOM, "F3. the pathophysiology link leads to the event's practice room");
    assert.equal(medTermFocusFromParam(target.searchParams.get(HOSA_MEDTERM_FOCUS_PARAM) ?? undefined), "pathophysiology", "F3b. with pathophysiology preselected");
    assert.equal(HOSA_MEDTERM_PATHOPHYSIOLOGY_PRACTICE_RETURN.href, HOSA_MEDTERM_PATHOPHYSIOLOGY_PRACTICE_ENTRY.href, "F3c. both pathophysiology links open the same choice");
    assert.equal(new URL(HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY.href, "http://localhost").searchParams.get(HOSA_MEDTERM_FOCUS_PARAM), "physiology",
      "F3d. control: the physiology link still preselects physiology");
    const links = [HOSA_MEDTERM_PATHOPHYSIOLOGY_PRACTICE_ENTRY, HOSA_MEDTERM_PATHOPHYSIOLOGY_PRACTICE_RETURN, HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY,
      HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_RETURN, HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY, HOSA_MEDTERM_ANATOMY_PRACTICE_RETURN, HOSA_MEDTERM_PRACTICE_ENTRY,
      HOSA_MEDTERM_PRACTICE_RETURN];
    for (const link of links) {
      assert.ok(Object.isFrozen(link), `F4. "${link.label}" is frozen`);
      const copy = `${link.label} ${link.detail}`;
      assert.ok(!/record|saved|\bsave|mastery|progress|nothing is|score|\bready\b|complete|certif/i.test(copy), `F4b. "${link.label}" makes no persistence, mastery or completion claim`);
      assert.ok(!/has no lessons yet|no lessons on disease|disease has no lessons|(?:disease|pathophysiology)[^.]{0,40}not (?:taught|covered) yet|Pathophysiology \(not taught yet\)/i.test(copy), `F4c. "${link.label}" no longer says disease is untaught`);
    }
    const end = HOSA_MEDTERM_PATHOPHYSIOLOGY_PRACTICE_ENTRY.detail;
    assert.match(end, /original questions, not official HOSA test items/, "F5. the end copy says the questions are original");
    assert.match(end, /nothing starts until you press start/, "F5b. and that nothing starts on arrival");
    assert.match(end, /which the earlier lessons of this course teach, though a few word-part questions use word parts no lesson has taught yet/,
      "F5c. and that the every-area choice adds what earlier lessons taught, with the word-part caveat");
    assert.match(HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY.detail, /The lessons after this one are about disease \(pathophysiology\)/,
      "F5d. the physiology end copy says disease comes next");
    assert.match(HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY.detail, /The lessons after this one are about physiology and then disease \(pathophysiology\)/,
      "F5e. and so does the anatomy end copy");
    assert.match(HOSA_MEDTERM_PRACTICE_ENTRY.detail, /The lessons after this one teach anatomy, physiology and disease \(pathophysiology\)/,
      "F5f. and the word-part end copy");
    assert.match(HOSA_MEDTERM_PATHOPHYSIOLOGY_PRACTICE_RETURN.detail, /a later lesson in this course teaches/, "F5g. the return copy says later lessons teach more");
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
    for (const id of PATHOPHYSIOLOGY_ORDER) {
      const html = render(id);
      const text = visible(html);
      const source = sourceOf(id);
      assert.ok(text.includes(source.lesson.title), `F6. ${id} renders its title`);
      assert.ok(text.includes("HOSA") && text.includes("Pathophysiology"), `F6b. ${id} is badged HOSA and Pathophysiology`);
      assert.ok(text.includes(STABLE_TEACHING_HOSA_PATHOPHYSIOLOGY_PROVENANCE.sourceLabel!), `F6c. ${id} shows the learner its label`);
      assert.ok(text.includes("not official competition material"), `F6d. ${id} keeps the teaching-lesson disclaimer`);
      assert.ok(text.includes(SAFETY_LINE), `F6d2. ${id} shows the safety line`);
      const teachAt = html.indexOf(source.lesson.content.explanation.slice(0, 40));
      const checksAt = html.indexOf('id="practice"');
      assert.ok(teachAt >= 0 && checksAt > teachAt, `F6e. ${id} teaches before it checks`);
      assert.ok(text.includes("Final check"), `F6f. ${id} calls its last check a Final check`);
      const claims = text.replace(/no progress, no mastery, no XP/, "").replace(/not evidence that you have mastered the skill/, "");
      assert.ok(!/master/i.test(claims), `F6g. ${id} mentions mastery only to say the checks are not it`);
      assert.ok(!/course complete|completed (?:the|this) course|certificate|credential/i.test(text), `F6g2. ${id} awards no completion credential`);
      assert.ok(text.includes("Nothing here is saved"), `F6h. ${id} says its checks save nothing`);
      const entry = getEducationLesson(id)!;
      if (entry.nextLessonId) {
        const continueAt = html.indexOf(`href="/lessons/${entry.nextLessonId}"`);
        assert.ok(continueAt >= 0, `F6i. ${id} continues to ${entry.nextLessonId}`);
        const practiceAt = html.indexOf(`href="${HOSA_MEDTERM_PRACTICE_ROOM}`);
        if (id === TISSUE) assert.ok(practiceAt > continueAt, `F6j. ${id} offers pathophysiology practice after its next-lesson link`);
        else assert.equal(practiceAt, -1, `F6j. ${id} does not jump ahead to practice`);
        assert.ok(!text.includes("end of this course so far"), `F6j2. ${id} does not say the course ends here`);
      } else {
        assert.ok(html.includes(`href="${HOSA_MEDTERM_PATHOPHYSIOLOGY_PRACTICE_ENTRY.href}"`), `F6k. ${id} ends in pathophysiology practice`);
        assert.ok(text.includes("end of this course so far"), `F6l. ${id} says the course ends here, not that anything is complete`);
      }
    }
    const nerves = render(NERVE_MUSCLE);
    const continueAt = nerves.indexOf(`href="/lessons/${TISSUE}"`);
    assert.ok(continueAt >= 0, "F6m. the last physiology lesson continues into the first pathophysiology lesson");
    assert.ok(nerves.indexOf(`href="${HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY.href}"`) > continueAt, "F6n. and still offers physiology practice after that link");
    assert.ok(!nerves.includes(`href="${HOSA_MEDTERM_PATHOPHYSIOLOGY_PRACTICE_ENTRY.href}"`), "F6n2. not pathophysiology practice, which it does not teach");
    assert.ok(!visible(nerves).includes("end of this course so far"), "F6o. and no longer says the course ends there");
  });

  await check("F7. HOSA Learn, Event HQ and the lessons index lead through physiology to pathophysiology", () => {
    const learn = learnerPathForTrack("HOSA").find((stage) => stage.id === "learn");
    assert.equal(learn?.href, "/lessons?track=hosa", "F7. Learn opens the HOSA lessons catalog");
    assert.match(learn?.note ?? "", /word parts, anatomy, physiology and pathophysiology/, "F7b. and names the pathophysiology lessons");
    assert.match(learn?.note ?? "", /reading-only communication lesson/, "F7c. while still saying the communication lesson is reading only");
    const hq = read("app/(app)/training/[track]/event/[eventSlug]/page.tsx");
    const hosaEntry = hq.slice(hq.indexOf('"hosa/medical-terminology"'), hq.indexOf('"deca/'));
    assert.ok(hosaEntry.length > 0, "F7d. control: the HOSA Event HQ entry was located");
    assert.match(hosaEntry, /label: "Lessons", detail: "[^"]*then the anatomy, physiology and pathophysiology the practice asks about[^"]*", href: "\/lessons\?track=hosa"/,
      "F7e. Event HQ's lessons row names the pathophysiology lessons");
    const index = stripComments(read("app/(app)/lessons/page.tsx"));
    assert.match(index, /The last lesson of each module in this course links there\./, "F7f. the index card says which lessons link to practice");
    assert.ok(!/hosa-pathophysiology-|hosa-physiology-|hosa-anatomy-/.test(index), "F7g. and decides by course, never by a hardcoded lesson slug");
  });

  await check("F8. the pathophysiology choice is taught, serves only pathophysiology questions, and starts nothing", async () => {
    const patho = medTermFocus("pathophysiology");
    assert.deepEqual(MEDTERM_FOCUS_CHOICES.map((c) => c.id), ["word-parts", "anatomy", "physiology", "pathophysiology", "all"],
      "F8. five choices: word parts, anatomy, physiology, pathophysiology, all");
    assert.deepEqual(patho.areas, ["pathophysiology"], "F8b. the pathophysiology choice is exactly the canonical pathophysiology area");
    assert.deepEqual(patho.areas, HOSA_MEDTERM_PATHOPHYSIOLOGY_AREAS, "F8c. through its named list");
    assert.equal(patho.label, "Pathophysiology from the course", "F8c2. named as the course's own grouping");
    assert.equal(patho.taught, true, "F8d. it is marked taught");
    assert.equal(patho.moduleId, PATHOPHYSIOLOGY_MODULE, "F8e. and names the module that teaches it");
    for (const [id, areas] of [["word-parts", HOSA_MEDTERM_WORD_PART_AREAS], ["anatomy", HOSA_MEDTERM_ANATOMY_AREAS], ["physiology", HOSA_MEDTERM_PHYSIOLOGY_AREAS]] as const) {
      assert.deepEqual(medTermFocus(id).areas, areas, `F8f. control: the ${id} choice still serves ${id} only`);
      assert.equal(medTermFocus(id).taught, true, `F8f2. control: and is still taught`);
    }
    assert.deepEqual(HOSA_MEDTERM_TAUGHT_AREAS, [...HOSA_MEDTERM_WORD_PART_AREAS, "anatomy", "physiology", "pathophysiology"],
      "F8g. taught areas: word parts, anatomy, physiology, pathophysiology");
    assert.deepEqual([...HOSA_MEDTERM_TAUGHT_AREAS].sort(), MEDTERM_AREAS.map((a) => a.id).sort(), "F8g2. which is every canonical area of the bank");
    assert.deepEqual(medTermFocusRequestAreas("pathophysiology"), ["pathophysiology"], "F8h. a request carries the pathophysiology area");
    assert.equal(medTermFocusForAreas(["pathophysiology"]), "pathophysiology", "F8i. a stored pathophysiology session is named as the pathophysiology choice");
    assert.equal(medTermContinuedForOtherChoice(true, ["pathophysiology"], "pathophysiology"), false, "F8j. so continuing one under that choice is not flagged");
    assert.equal(medTermContinuedForOtherChoice(true, ["pathophysiology"], "physiology"), true, "F8k. but continuing one under another choice is");
    assert.equal(medTermFocusForAreas(["physiology", "pathophysiology"]), null, "F8l. control: physiology plus pathophysiology is no single choice");
    assert.match(patho.disclosure, /The pathophysiology lessons teach all of them/, "F8m. the choice says the lessons teach every question in it");
    assert.match(patho.disclosure, /word parts, on where structures are \(anatomy\) and on how the healthy body works \(physiology\) are not in this choice/,
      "F8m2. and what is not in it");
    assert.ok(!/record|saved|\bsave\b|mastery|progress|score|readiness|ready\b/i.test(`${patho.label} ${patho.summary} ${patho.coverage} ${patho.disclosure}`),
      "F8n. the choice makes no persistence or mastery claim");
    assert.ok(!TREATMENT.test(`${patho.label} ${patho.summary} ${patho.coverage} ${patho.disclosure}`)
      && !SELF_DIAGNOSIS.test(`${patho.summary} ${patho.disclosure}`), "F8o. and no diagnosis, treatment or self-diagnosis wording");
    assert.match(HOSA_MEDTERM_FOCUS_ATTRIBUTION, /not an official HOSA category/, "F8p. control: the room still says its choices are not official categories");

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
    const page = await TrackPracticePage({ params: { track: "hosa" }, searchParams: { focus: "pathophysiology" } });
    assert.equal(find(page, HosaEventPrep)?.props.focus, "pathophysiology", "F9. the practice page hands the room the pathophysiology choice");
    const room = await HosaEventPrep({ focus: "pathophysiology" });
    const engine = find(room, HosaMedTermEngine);
    assert.equal(engine?.props.initialFocus, "pathophysiology", "F9b. the room preselects it");
    const catalog = engine!.props.areas as Array<{ id: string; label: string; questionCount?: number }>;
    for (const area of MEDTERM_AREAS) {
      assert.equal(catalog.find((a) => a.id === area.id)?.questionCount, MEDTERM_BANK.filter((q) => q.area === area.id).length,
        `F9c. the room tells the engine how many ${area.id} questions exist`);
    }
    assert.equal(medTermPoolSize(catalog, "pathophysiology"), 30, "F9d. a pathophysiology session draws from 30 different questions");
    assert.deepEqual(medTermCountOptions(30), [10, 20, 30], "F9e. so only lengths it can fill without repeats are offered");

    const html = decode(renderToStaticMarkup(React.createElement(HosaMedTermEngine, { official: true, areas: catalog, initialFocus: "pathophysiology" })));
    const text = visible(html);
    const radios = [...html.matchAll(/<input[^>]*type="radio"[^>]*>/g)].map((m) => m[0]);
    assert.equal(radios.length, 5, "F10. five choices as radio buttons");
    const checked = radios.filter((r) => /\bchecked\b/.test(r));
    assert.ok(checked.length === 1 && checked[0].includes('value="pathophysiology"'), "F10b. pathophysiology is the one selected");
    assert.ok(text.includes("The link you followed preselected Pathophysiology from the course"), "F10c. the learner is told what the link did");
    assert.ok(text.includes("Nothing starts until you press start"), "F10d. and that nothing has started");
    const options = [...html.matchAll(/<option[^>]*value="(\d+)"/g)].map((m) => Number(m[1]));
    assert.deepEqual(options, [10, 20, 30], "F10e. the setup screen offers 10, 20 or 30 questions for pathophysiology");
    assert.ok(text.includes("Pathophysiology from the course has 30 different questions"), "F10f. and says why longer sessions are not offered");
    assert.ok(!text.includes("(not taught yet)"), "F10g. no area is marked untaught any more");
    assert.ok(!html.includes("Question 1 of"), "F10h. no session is running: the setup screen is showing");
    const plain = decode(renderToStaticMarkup(React.createElement(HosaMedTermEngine, { official: true, areas: catalog })));
    assert.ok(/<input[^>]*value="all"[^>]*checked|<input[^>]*checked[^>]*value="all"/.test(plain), "F10i. control: with nothing preselected, every area stays the default");
    assert.ok(!visible(plain).includes("(not taught yet)"), "F10j. and the every-area choice marks nothing untaught");
  });

  await check("F11. the route issues a pathophysiology session from pathophysiology questions only", async () => {
    const { POST } = require("../app/api/hosa/medterm/session/route") as { POST: (request: Request) => Promise<Response> };
    const byBankId = new Map(MEDTERM_BANK.map((q) => [q.id, q]));
    const response = await POST(new Request("http://localhost/api/hosa/medterm/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ count: 20, areas: medTermFocusRequestAreas("pathophysiology") })
    }));
    const json = (await response.json()) as { requestedAreas?: string[]; items?: Array<Record<string, unknown>>; order?: string[]; error?: string };
    assert.equal(response.status, 200, `F11. a pathophysiology request is served (${json.error ?? ""})`);
    assert.deepEqual(json.requestedAreas, ["pathophysiology"], "F11b. issued for pathophysiology");
    assert.deepEqual(db.sessions.at(-1)?.requestedAreas, ["pathophysiology"], "F11c. and stored that way");
    assert.equal(json.items?.length, 20, "F11d. twenty items");
    assert.equal(new Set(json.order).size, 20, "F11e. without repeats");
    assert.ok((json.items ?? []).every((item) => byBankId.get(String(item.bankQuestionId))?.area === "pathophysiology"), "F11f. every one a pathophysiology bank question");
    for (const item of json.items ?? []) {
      assert.ok(!("correctAnswer" in item) && !("explanation" in item), "F11g. and no answer key leaves the server");
    }
  });

  // ---- G. remediation ----------------------------------------------------------------------------------
  await check("G. a pathophysiology weakness opens the pathophysiology lessons, every area resolves to its own module, every broken link closes it", () => {
    const action = hosaMedTermRemediation("pathophysiology", "Pathophysiology");
    assert.ok(action && action.kind === "lesson", "G1. pathophysiology resolves to a lesson");
    assert.equal(action.lessonId, TISSUE, "G1b. where the pathophysiology module starts");
    assert.equal(action.href, `/lessons/${TISSUE}?track=hosa`, "G1c. linked on the HOSA track");
    assert.equal(action.label, "Study pathophysiology in the Pathophysiology lessons, starting with “How Tissue Changes: Words for What Goes Wrong”",
      "G1d. naming the module, not one lesson, because the module teaches it");
    assert.equal(HOSA_MEDTERM_AREA_TEACHING_OWNERS.pathophysiology, TISSUE, "G2. the declared owner is the module's first lesson");
    assert.equal(hosaLessonPracticeLink(TISSUE)?.href, medTermFocusHref("pathophysiology"), "G2b. which links back to pathophysiology practice");
    assert.ok(educationLessonsForTrack("HOSA").every((e) => !(e.nextLessonId === TISSUE && e.moduleId === PATHOPHYSIOLOGY_MODULE)),
      "G2c. and no pathophysiology lesson comes before it");
    // Every canonical area resolves to a lesson whose module's practice choice includes that area.
    const expected: Readonly<Record<string, string>> = {
      "word-roots": "hosa-medical-word-roots", prefixes: "hosa-medical-prefixes", suffixes: "hosa-medical-suffixes",
      anatomy: BODY_MAP, physiology: BALANCE, pathophysiology: TISSUE
    };
    assert.deepEqual(MEDTERM_AREAS.map((a) => a.id).sort(), Object.keys(expected).sort(), "G3. control: the bank has exactly these six areas");
    for (const area of MEDTERM_AREAS) {
      const resolved = hosaMedTermRemediation(area.id, area.label);
      assert.ok(resolved?.kind === "lesson" && resolved.lessonId === expected[area.id], `G3b. ${area.id} resolves to ${expected[area.id]}`);
      const owner = getEducationLesson(resolved.lessonId)!;
      const choice = MEDTERM_FOCUS_CHOICES.find((c) => c.moduleId === owner.moduleId && c.areas !== null);
      assert.ok(choice?.areas?.includes(area.id), `G3c. ${area.id}'s owner is in the module whose practice choice includes it`);
      assert.equal(hosaLessonPracticeLink(resolved.lessonId)?.href, medTermFocusHref(choice!.id), `G3d. and that owner links back to exactly that choice`);
      assert.ok(!/does not have a lesson/.test(resolved.label), `G3e. ${area.id} is not told there is no lesson`);
    }
    for (const bogus of ["cardiology", "", "__proto__", "constructor"]) {
      const result = hosaMedTermRemediation(bogus, "Cardiology");
      assert.ok(result === null || result.kind === "no-lesson", `G3f. a non-canonical area "${bogus}" never opens a lesson`);
    }

    // Fail closed. Each control breaks one link of the chain in the live objects, then restores it.
    const mutate = (fn: () => () => void, message: string) => {
      const restore = fn();
      try {
        assert.equal(hosaMedTermRemediation("pathophysiology", "Pathophysiology"), null, message);
      } finally {
        restore();
      }
      assert.equal(hosaMedTermRemediation("pathophysiology", "Pathophysiology")?.kind, "lesson", `${message} (restored)`);
    };
    const entry = getEducationLesson(TISSUE) as { visibility: string };
    mutate(() => { const v = entry.visibility; entry.visibility = "internal"; return () => { entry.visibility = v; }; },
      "G4. a hidden first lesson closes the action");
    const writable = entry as unknown as { moduleId: string; courseId: string };
    mutate(() => { const m = writable.moduleId; writable.moduleId = "some-other-module"; return () => { writable.moduleId = m; }; },
      "G5. an owner in a module with no practice choice closes the action");
    const flow = getEducationLesson(FLOW) as unknown as { nextLessonId: string | null };
    mutate(() => { const n = flow.nextLessonId; flow.nextLessonId = TISSUE; return () => { flow.nextLessonId = n; }; },
      "G5b. an owner that is not where its module starts closes the action");
    mutate(() => { const c = writable.courseId; writable.courseId = "some-other-course"; return () => { writable.courseId = c; }; },
      "G6. an owner outside this course closes the action");
    assert.ok(Object.isFrozen(HOSA_MEDTERM_AREA_TEACHING_OWNERS), "G7. the owner map is frozen, so a stray write cannot reassign pathophysiology");
    assert.equal(HOSA_MEDTERM_NO_LESSON_MESSAGE, "CompeteReady does not have a lesson for this area yet.", "G8. control: the no-lesson statement is unchanged for an area with no owner");
  });

  // ---- H. "All Medical Terminology" is truthful ---------------------------------------------------------
  await check("H. every area now has lessons, and the every-area choice claims that about the practice bank only", () => {
    const all = medTermFocus("all");
    assert.equal(all.taught, true, "H1. the every-area choice is marked taught: every area in it has a published lesson");
    assert.equal(all.areas, null, "H1b. it still serves every area by omitting areas from the request");
    assert.equal(all.coverage, "Every area of this practice has lessons in the current course", "H1c. its marker says every area has lessons, not that everything is taught");
    assert.match(all.disclosure, /Each of the six areas in this practice has lessons in the course/, "H2. it says each area of this practice has lessons");
    assert.match(all.disclosure, /A few word-part questions still use word parts the lessons have not taught/, "H2b. and that some word parts are still untaught");
    assert.match(all.disclosure, /not official HOSA test items, so this does not describe what a HOSA test covers/,
      "H2c. and separates practice-bank coverage from official HOSA coverage");
    assert.match(medTermFocus("word-parts").disclosure, /Some use word parts the lessons have not taught yet/, "H2d. control: the word-part choice still says so too");
    const OVERCLAIM = /everything (?:HOSA|the test|a HOSA test|Medical Terminology|the event)\b|\b(?:all|every) (?:of )?HOSA\b|\bevery HOSA (?:event|topic)|fully (?:taught|covered|prepared)|\b100 ?%|complete(?:s|d)? (?:HOSA|the event|the curriculum|the course)|ready for (?:HOSA|competition|the test)|all you need/i;
    const copy = [
      ...MEDTERM_FOCUS_CHOICES.flatMap((c) => [c.label, c.summary, c.coverage, c.disclosure]),
      HOSA_MEDTERM_FOCUS_ATTRIBUTION,
      ...[HOSA_MEDTERM_PATHOPHYSIOLOGY_PRACTICE_ENTRY, HOSA_MEDTERM_PATHOPHYSIOLOGY_PRACTICE_RETURN, HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY,
        HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY, HOSA_MEDTERM_PRACTICE_ENTRY].flatMap((l) => [l.label, l.detail]),
      getEducationModule(PATHOPHYSIOLOGY_MODULE)!.outcome,
      learnerPathForTrack("HOSA").find((stage) => stage.id === "learn")?.note ?? "",
      ...PATHOPHYSIOLOGY_ORDER.flatMap((id) => lessonStrings(sourceOf(id)))
    ];
    for (const text of copy) {
      const hit = text.match(OVERCLAIM);
      assert.equal(hit, null, `H3. no learner-facing copy overclaims coverage (${hit?.[0] ?? ""} in "${text.slice(0, 60)}")`);
    }
    for (const claim of ["Everything HOSA Medical Terminology tests is taught.", "You are ready for HOSA.", "This course covers all of HOSA.",
      "The curriculum is fully taught."]) {
      assert.ok(OVERCLAIM.test(claim), `H3b. control: the overclaim "${claim}" is caught`);
    }
    assert.ok(!MEDTERM_FOCUS_CHOICES.some((c) => /^not taught yet|(?:anatomy|physiology|pathophysiology|disease)[^.]{0,40}(?:not taught yet|no lessons)|includes topics not taught/i.test(`${c.coverage} ${c.disclosure}`)),
      "H4. no choice still says a whole area is untaught");
    assert.ok(/(?:anatomy|physiology|pathophysiology|disease)[^.]{0,40}(?:not taught yet|no lessons)/i.test("Questions on disease are not taught yet."),
      "H4b. control: an area-level untaught claim is caught");
  });

  // ---- I. the bank is unchanged ---------------------------------------------------------------------
  await check("I. the practice bank is byte-for-byte the bank the census classified", () => {
    assert.equal(MEDTERM_BANK.length, 180, "I1. 180 questions");
    assert.equal(createHash("sha256").update(JSON.stringify(MEDTERM_BANK)).digest("hex"), BANK_SHA256,
      "I2. unchanged: coverage was earned by teaching, not by editing questions");
  });

  await check("J. the suite is registered and never loaded the real database client", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    assert.equal(pkg.scripts["hosa-medterm-pathophysiology:smoke"], "tsx scripts/hosa-medterm-pathophysiology-smoke.ts", "J1. registered in package.json");
    const database = Object.keys(require.cache).filter((file) => /[\\/]lib[\\/]prisma\.ts$/.test(file) && require.cache[file]?.exports?.prisma !== prismaStandIn);
    assert.deepEqual(database, [], "J2. lib/prisma was only ever the in-memory stand-in");
    assert.ok(db.touches.every((t) => t === "$transaction"), "J3. and only its transaction was used");
  });

  console.log("\n       KNOWN LIMITS: this guard is not a subject-accuracy review. It proves each fact is worded in the owner");
  console.log("       lesson's teaching, not that the fact is medically correct; it catches only the wrong statements it lists;");
  console.log("       it checks no fact the lessons add beyond the bank; its treatment and self-diagnosis scans are word lists;");
  console.log("       it does not judge distractors, hints or clarity; it renders on the server only. Human review is required.");
  console.log(`\nhosa-medterm-pathophysiology:smoke passed (${checks} checks). Five pathophysiology lessons teach all 30 pathophysiology questions.\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
