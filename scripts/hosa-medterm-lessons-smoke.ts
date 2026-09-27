/**
 * HOSA Medical Terminology word-part lessons — the first HOSA concept course.
 *
 * Run with: npm run hosa-medterm-lessons:smoke
 *
 * NO DATABASE, NO PROVIDER, NO ENV, NO WRITES. This suite imports the lesson catalog, the education
 * registry, the Medical Terminology question bank and two components, and renders markup through
 * `react-dom/server`. The lessons index is checked from its source instead of rendered: it resolves
 * its track through lib/track-server, which reaches @prisma/client, and loading that client reads
 * <repo>/.env at module scope wherever one exists. Check F5 proves the database client never loaded.
 * Nothing here fetches, writes, or reads a secret.
 *
 * WHAT IT PROTECTS. Four lessons (how a term is built, roots, suffixes, prefixes) teach the half of the
 * Medical Terminology practice room that is word parts. The properties that make them worth shipping
 * are the ones a later edit could quietly break, so each is asserted here:
 *
 *   A. They are registered the way every concept lesson is: by reference, in one chain, in their own
 *      course, with honest stable-teaching provenance, and with no mastery or drill claim.
 *   B. The course ends in the event's practice room, and only the course's last lesson says so.
 *   C. Every word part the practice bank tests is either taught here with the meaning the bank keys,
 *      or named below as not taught yet. Each part is defined only in the words listed for it, and
 *      every example term agrees with the prefix and suffix it is built from.
 *   D. Their checks are original teaching items, not copies of bank questions, not answerable from
 *      position or length alone, and each explanation argues for its own key.
 *   E. They make no official HOSA claim and carry no other track's vocabulary.
 *   F. Every learner surface that should lead to them does, and the HOSA ones still overclaim nothing.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// tsconfig jsx=preserve => classic React.createElement, so React must be global before the
// component modules are evaluated. Same harness as concept-lesson-schema-smoke.
(globalThis as { React?: unknown }).React = React;
const { ConceptEducationLessonView } = require("../components/lessons/concept-education-lesson-view");
const TrackHubPage = require("../app/(app)/training/[track]/page").default;

import { LEARNING_SKILL_CATALOG } from "../lib/learning-content";
import { MEDTERM_BANK } from "../lib/hosa-medterm";
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
  HELD_HOSA_CATALOG_SLUGS,
  HOSA_PUBLISHED_LESSONS,
  PUBLISHED_HOSA_SLUGS,
  STABLE_TEACHING_HOSA_PROVENANCE
} from "../lib/education/tracks/hosa";
import {
  HOSA_MEDTERM_PRACTICE_ENTRY,
  HOSA_MEDTERM_PRACTICE_RETURN,
  HOSA_MEDTERM_STUDY_COURSE,
  hosaCourseEndAction,
  hosaCourseHasEventPractice,
  hosaLessonPracticeReturn
} from "../lib/education/hosa-medterm-practice";
import { decaCourseEndAction } from "../lib/education/deca-simulation-prep";
import { HOSA_MEDTERM_FOCUS_PARAM, HOSA_MEDTERM_PRACTICE_ROOM, medTermFocusFromParam } from "../lib/hosa-medterm-focus";

const read = (p: string) => readFileSync(p, "utf8");
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

// The word-part module, which this suite owns. The course continues into an anatomy module after it,
// a physiology module after that and a pathophysiology module last (scripts/hosa-medterm-anatomy-smoke.ts,
// scripts/hosa-medterm-physiology-smoke.ts and scripts/hosa-medterm-pathophysiology-smoke.ts own those
// lessons), so the course's own chain and end are asserted against all four lists.
const COURSE_ORDER = [
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

// Never splits inside a parenthesis: "(hypertension, high blood pressure; hypoglycemia, low blood sugar)".
const sentences = (text: string) => text.split(/(?<=[.!?:;])\s+(?![^()]*\))|\n+/).map((s) => s.trim()).filter(Boolean);

// ---- word parts (C) ---------------------------------------------------------------------------------
// Each row is [name, token, gloss, definedAs]. The token finds the part in text. The gloss is its meaning
// as the practice bank keys it. definedAs lists, word for word, every way the lessons define the part
// (compared by `phrasing`), so a definition in any other words fails C5 until it is reviewed and added.
//   GLOSSES      parts the lessons teach AND the practice bank tests, with the meaning the bank keys, so
//                a learner is never taught one meaning here and marked wrong for it there.
//   LESSON_ONLY  parts the lessons teach that the bank never tests. Their meanings are guarded too.
//   MENTIONED    parts a lesson names without teaching a meaning: a root named in passing, the "-tomy" a
//                weak answer misreads, the letters two prefixes share. They have no gloss.
// NOT_TAUGHT lists the parts the bank tests that no lesson teaches yet. C2 reads the part every bank
// word-part question tests and requires it in GLOSSES or NOT_TAUGHT, so a new bank question, a lesson
// that starts teaching one of these parts, or a stale row fails here by name.
type WordPart = [name: string, token: RegExp, gloss: RegExp, definedAs: readonly string[]];
const GLOSSES: WordPart[] = [
  ["-itis", /-itis\b/i, /inflammation/i, ["inflammation"]],
  ["-ectomy", /-ectomy\b/i, /removal/i, ["removal", "surgical removal"]],
  ["-otomy", /-otomy\b/i, /cutting into|cuts into|incision/i, ["incision", "cutting into", "cuts into a structure without removing it"]],
  ["-ostomy", /-ostomy\b/i, /opening/i, ["surgically creating an opening", "surgical creation of an opening", "creates an opening"]],
  ["-plasty", /-plasty\b/i, /repair|reshaping/i, ["surgical repair or reshaping"]],
  ["-scopy", /-scopy\b/i, /visual examination|looking inside with a scope/i,
    ["visual examination", "visual examination with a scope", "looking inside with a scope"]],
  ["-graphy", /-graphy\b/i, /process of recording/i, ["process of recording"]],
  ["-gram", /-gram\b/i, /record or image|record itself|the record/i, ["record or image it produces", "record or image produced"]],
  ["-megaly", /-megaly\b/i, /enlargement/i, ["enlargement"]],
  ["-algia", /-algia\b/i, /pain/i, ["pain"]],
  ["-pathy", /-pathy\b/i, /disease/i, ["disease"]],
  ["-osis", /-osis\b/i, /abnormal condition/i, ["abnormal condition"]],
  ["-emia", /-emia\b/i, /blood/i, ["blood condition"]],
  ["-oma", /-oma\b/i, /tumor|mass/i, ["tumor or mass"]],
  ["-malacia", /-malacia\b/i, /softening/i, ["softening"]],
  ["-sclerosis", /-sclerosis\b/i, /hardening/i, ["hardening"]],
  ["-ology", /-o?logy\b/i, /study of/i, ["study of a subject", "study of something"]],
  ["-logist", /-logist\b/i, /specialist|speciali[sz]es/i, ["person who specializes in a field", "specialist", "specialist in it"]],
  ["-uria", /-uria\b/i, /urine/i, ["urine condition"]],
  ["brady-", /\bbrady-/i, /slow/i, ["slow"]],
  ["tachy-", /\btachy-/i, /fast|rapid/i, ["fast"]],
  ["hyper-", /\bhyper-/i, /above/i, ["above normal", "above normal or excessive"]],
  ["hypo-", /\bhypo-/i, /below normal/i, ["below normal", "below normal or deficient"]],
  ["intra-", /\bintra-/i, /within/i, ["within"]],
  ["inter-", /\binter-/i, /between/i, ["between"]],
  ["peri-", /\bperi-/i, /around/i, ["around"]],
  ["sub-", /\bsub-/i, /under|below/i, ["under or below"]],
  ["epi-", /\bepi-/i, /upon/i, ["upon", "upon or over"]],
  ["trans-", /\btrans-/i, /across|through/i, ["across or through"]],
  ["extra-", /\bextra-/i, /outside/i, ["outside"]],
  ["pre-", /\bpre-/i, /before/i, ["before"]],
  ["post-", /\bpost-/i, /after/i, ["after"]],
  ["mono-", /\bmono-/i, /one/i, ["one"]],
  ["bi-", /\bbi-/i, /two/i, ["two"]],
  ["tri-", /\btri-/i, /three/i, ["three"]],
  ["poly-", /\bpoly-/i, /many/i, ["many", "many or much"]],
  ["hemi-", /\bhemi-/i, /half/i, ["half"]],
  ["a-/an-", /\ban?-/i, /without/i, ["without"]],
  ["dys-", /\bdys-/i, /difficult/i, ["difficult or painful"]],
  ["mal-", /\bmal-/i, /bad or abnormal/i, ["bad or abnormal"]],
  ["ad-", /\bad-/i, /toward/i, ["toward"]],
  ["ab-", /\bab-/i, /away from/i, ["away from"]],
  ["nephr", /\bnephr(?:\/o)?\b/i, /kidney/i, ["kidney"]],
  ["hepat", /\bhepat(?:\/o)?\b/i, /liver/i, ["liver"]],
  ["cardi", /\bcardi(?:\/o)?\b/i, /heart/i, ["heart", "combining form for heart"]],
  ["gastr", /\bgastr(?:\/o)?\b/i, /stomach/i, ["stomach"]],
  ["enter", /\benter(?:\/o)?\b/i, /small intestine/i, ["small intestine", "small intestine specifically"]],
  ["col", /\bcol(?:\/o)?\b/i, /large intestine|colon/i, ["large intestine", "large intestine, the colon"]],
  ["oste", /\boste(?:\/o)?\b/i, /bone/i, ["bone", "bone in general"]],
  ["arthr", /\barthr(?:\/o)?\b/i, /joint/i, ["joint"]],
  ["my", /\bmy(?:\/o)?\b(?!el)/i, /muscle/i, ["muscle"]],
  ["myel", /\bmyel(?:\/o)?\b/i, /spinal cord or (?:the )?bone marrow/i,
    ["spinal cord or bone marrow", "separate root meaning the spinal cord or the bone marrow"]],
  ["cost", /\bcost(?:\/o)?\b/i, /rib/i, ["rib"]],
  ["crani", /\bcrani(?:\/o)?\b/i, /skull/i, ["skull"]],
  ["neur", /\bneur(?:\/o)?\b/i, /nerve/i, ["nerve"]],
  ["derm", /\bderm(?:at)?(?:\/o)?\b/i, /skin/i, ["skin"]],
  ["hist", /\bhist(?:\/o)?\b/i, /tissue/i, ["tissue"]],
  ["hyster", /\bhyster(?:\/o)?\b/i, /uterus/i, ["uterus"]],
  ["cyst", /\bcyst(?:\/o)?\b/i, /bladder/i, ["bladder or sac", "bladder or a sac", "bladder or a fluid-filled sac"]],
  ["aden", /\baden(?:\/o)?\b/i, /gland/i, ["gland"]],
  ["lip", /\blip(?:\/o)?\b/i, /fat/i, ["fat"]],
  ["hydr", /\bhydr(?:\/o)?\b/i, /water/i, ["water"]],
  ["pulmon", /\bpulmon(?:\/o)?\b/i, /lung/i, ["lung", "lungs"]],
  ["pneum", /\bpneum(?:\/o)?\b/i, /lung|air/i, ["lungs", "lung or air", "air"]],
  ["rhin", /\brhin(?:\/o)?\b/i, /nose/i, ["nose"]],
  ["ophthalm", /\bophthalm(?:\/o)?\b/i, /eye/i, ["eye"]],
  ["ot", /\bot(?:\/o)?\b(?!-)/i, /ear/i, ["ear"]],
  ["phleb", /\bphleb(?:\/o)?\b/i, /vein/i, ["vein"]],
  ["angi", /\bangi(?:\/o)?\b/i, /vessel/i, ["vessel"]],
  ["hem", /\bhem(?:at)?(?:\/o)?\b/i, /blood/i, ["blood"]],
  ["cerebr", /\bcerebr(?:\/o)?\b/i, /cerebrum/i, ["cerebrum, the largest part of the brain"]]
];
const LESSON_ONLY: WordPart[] = [
  ["cyt", /\bcyt(?:\/o)?\b/i, /\bcell/i, ["cell"]],
  ["cutane", /\bcutane(?:\/o)?\b/i, /skin/i, ["skin"]],
  ["-ia", /-ia\b/i, /condition/i, ["condition"]],
  ["-pnea", /-pnea\b/i, /breathing/i, ["breathing"]],
  ["-al, -ar, -ary, -ic, -ous", /-(?:al|ar|ary|ic|ous)\b/i, /pertaining to/i, ["pertaining to"]]
];
// How C5 compares a definition with definedAs: lower case, no quotation marks, no leading article.
const phrasing = (text: string) => text.toLowerCase().replace(/["\u201c\u201d]/g, "").replace(/\s+/g, " ").trim().replace(/^(?:an?|the) /, "");
const MENTIONED: Array<[name: string, token: RegExp]> = [
  ["labi", /\blabi(?:\/o)?\b/i],
  ["arteri", /\barteri(?:\/o)?\b/i],
  ["-tomy", /-tomy\b/i],
  ["int-", /\bint-/i]
];
const NOT_TAUGHT = [
  "dent", "re-", "retro-", "macro-", "micro-", "neo-", "anti-", "pseudo-", "-rrhea", "-phobia", "-plegia",
  "-genesis", "-centesis", "-pexy", "-tripsy", "-asthenia", "-metry", "-penia", "-lysis"
];
// What an example term's gloss must carry for the part it starts or ends with (C8). Looser than definedAs
// on purpose: an example says "an enlarged heart", not "enlargement". a-/an-, ad- and ab- have none,
// because too many ordinary words start with those letters, and neither do -ia and the describing-word
// endings, because a gloss does not repeat them ("intravenous, within a vein").
const EXAMPLE_MEANING: ReadonlyArray<readonly [part: string, meaning: RegExp]> = [
  ["-itis", /inflam/i], ["-ectomy", /remov/i], ["-otomy", /cut|incision/i], ["-ostomy", /opening/i],
  ["-plasty", /repair|reshap/i], ["-scopy", /look|examin|view/i], ["-graphy", /record/i], ["-gram", /record|image/i],
  ["-megaly", /enlarg/i], ["-algia", /pain/i], ["-pathy", /disease/i], ["-osis", /condition/i], ["-emia", /blood/i],
  ["-oma", /tumor|mass/i], ["-malacia", /soft/i], ["-sclerosis", /hard/i], ["-ology", /study/i],
  ["-logist", /speciali/i], ["-uria", /urine|urinat/i], ["-pnea", /breath/i],
  ["brady-", /slow/i], ["tachy-", /fast|rapid/i], ["hyper-", /above|high|excess|elevat|raised/i], ["hypo-", /below|low|deficien|reduced/i],
  ["intra-", /within|inside/i], ["inter-", /between/i], ["peri-", /around/i], ["sub-", /under|below|beneath/i],
  ["epi-", /upon|over|outer/i], ["trans-", /across|through/i], ["extra-", /outside/i], ["pre-", /before/i],
  ["post-", /after/i], ["mono-", /\bone\b|single/i], ["bi-", /\btwo\b|both/i], ["tri-", /three/i],
  ["poly-", /many|much|large/i], ["hemi-", /half|one side/i], ["dys-", /difficult|painful|bad/i], ["mal-", /bad|abnormal/i]
];
const NO_EXAMPLE_MEANING = ["a-/an-", "ad-", "ab-", "-ia", "-al, -ar, -ary, -ic, -ous"];
// Words whose letters only look like a prefix or suffix: "stoma" is not st + -oma, and "prefix" names a
// kind of part ("Which prefix means outside?").
const NOT_BUILT_FROM_PART = new Set(["stoma", "prefix", "prefixes"]);
const wholePart = (token: RegExp) => new RegExp(`^(?:${token.source})$`, "i");

// Anything written as a word part: "-itis", "peri-", "cardi/o". Bare roots ("cardi") come from the rows.
const PART_ANY = String.raw`(?:(?<![a-z])-[a-z]{2,}|\b[a-z]{1,8}-(?![a-z])|\b[a-z]{2,9}\/o\b)`;
const KNOWN = `(?:${[...GLOSSES, ...LESSON_ONLY, ...MENTIONED].map(([, token]) => token.source).join("|")}|${PART_ANY})`;
// The verbs a definition is given with. "cuts into" and "creates" carry the meaning themselves, so they
// stay in the definition's text: "-ostomy creates an opening".
const VERB = String.raw`(?:(?:means|all mean|would mean|can also mean|would make it|both refer to|refers to|is|names)\b\s*|(?=(?:cuts into|creates)\b))`;
// A verb that gives a meaning the parser would not read. C5 fails on it, so no definition escapes.
const UNREAD_VERB = new RegExp(String.raw`(${KNOWN})\s+(?:signals|indicates|denotes|stands for|describes|implies|conveys|marks|suggests|represents|tells you|shows)\b`, "i");
// A bare word given a meaning ("Nephr means kidney", "cutane refers to the skin", "intercostal means
// between the ribs") is a root in the tables, a term built from a prefix or suffix in them, or one of
// these ordinary words. Any other ("Splen means kidney") is a root the tables do not know. An adverb
// ("most directly refers to") is not a subject.
const BARE_SUBJECT = /(?<![a-z\/-])([a-z]+)(?<!ly)\s+(?:means|all mean|refers? to)\b/gi;
const ORDINARY_SUBJECTS = new Set(["it", "that", "this", "which", "what", "each", "one", "both", "pair", "part", "parts", "term",
  "terms", "word", "words", "prefix", "prefixes", "suffix", "suffixes", "root", "roots", "ending", "endings", "form", "forms"]);
// A clause that CLASSIFIES or CONTRASTS a part ("Brady- is the opposite of tachy-", "Sub- is a position
// prefix", "-graphy is making it; -gram is what you get", "the ending is -itis") says nothing about its
// meaning. The list is closed on purpose: a new phrasing is a definition until someone adds it here.
const NOT_A_DEFINITION = /^(?:the opposite of\b.*|an? \w+ prefix|the process|the result|making it|what you get|the person|the field|one specific part of the intestine|two different things|(?:the|its|this) (?:ending|suffix|prefix|root|part|combining form))$/i;
// A parenthesis after a part that names an example term, not a meaning: "an- (anuria)". Each term is
// tied to its own prefix, so "an- (dysuria)" is read as a definition of an- and fails C5.
const EXAMPLE_TERMS: ReadonlyMap<string, RegExp> = new Map([["anuria", /^an-$/i], ["dysuria", /^dys-$/i]]);

type Definition = { part: string; text: string };
/**
 * Every meaning one sentence gives a word part, in the four shapes the lessons use:
 *   "-itis means inflammation", "gastr is the stomach"   a clause that opens with the part, or with
 *                                                        "the suffix -itis", "the root gastr"
 *   "cardi/o (heart)"                                    a parenthesis right after the part
 *   "The liver is hepat/o", "Pain would be -algia"       a clause that ends with the part
 *   "mono- means one, bi- two", "…, removal -ectomy"     a list that continues either clause
 * Etymology ("the ec in -ectomy means out") opens with something else, so it is not read as one.
 */
function parseDefinitions(sentence: string): Definition[] {
  const found: Definition[] = [];
  for (const m of sentence.matchAll(new RegExp(String.raw`(${KNOWN})\s*\(([^)]+)\)`, "gi"))) {
    const term = EXAMPLE_TERMS.get(m[2].trim().toLowerCase());
    if (!term?.test(m[1])) found.push({ part: m[1], text: m[2].trim() });
  }
  const forward = new RegExp(String.raw`^(?:the (?:root|prefix|suffix|ending|combining form)\s+)?(${KNOWN})(?:\s+or\s+(${KNOWN}))?\s+${VERB}(.+)$`, "i");
  const reverse = new RegExp(String.raw`^((?:(?:an?|the)\s+)?[a-z]+(?:\s+[a-z]+)?)\s+(?:is|are|would be)\s+(${KNOWN})(?:\s+or\s+(${KNOWN}))?$`, "i");
  const listForward = new RegExp(String.raw`^(${KNOWN})\s+([a-z]+(?:\s+or\s+[a-z]+)?)$`, "i");
  const listReverse = new RegExp(String.raw`^((?:(?:an?|the)\s+)?[a-z]+(?:\s+[a-z]+)?)\s+(${KNOWN})$`, "i");
  let list: "forward" | "reverse" | null = null;
  const clauses = sentence.replace(/\([^)]*\)/g, " ").split(/\s*,\s*|\s+and\s+/i)
    .map((c) => c.trim().replace(/^(?:and|but|so|or)\s+/i, "").replace(/[.!?;:]+$/, "").trim())
    .filter(Boolean);
  for (const clause of clauses) {
    let m: RegExpMatchArray | null;
    if ((m = clause.match(forward))) {
      list = "forward";
      for (const part of [m[1], m[2]]) if (part) found.push({ part, text: m[3].trim() });
    } else if ((m = clause.match(reverse))) {
      list = "reverse";
      for (const part of [m[2], m[3]]) if (part) found.push({ part, text: m[1].trim() });
    } else if (list === "forward" && (m = clause.match(listForward))) {
      found.push({ part: m[1], text: m[2].trim() });
    } else if (list === "reverse" && (m = clause.match(listReverse))) {
      found.push({ part: m[2], text: m[1].trim() });
    } else {
      list = null;
    }
  }
  return found.filter((d) => !NOT_A_DEFINITION.test(d.text));
}

type ExampleClaim = { term: string; gloss: string };
const TERM = String.raw`(?<![a-z/-])[a-z]{5,}(?![a-z/-])`;
const GLOSS_END = String.raw`(?=\s+and\s+[a-z]+\s+(?:is|means)\b|[,.;:?()]|$)`;
// A gloss that classifies, negates, or talks about the term's parts says nothing about its meaning:
// "an illness", "not just a stomach problem", "the ending is -itis", "tachy- + cardi + -ia".
const NOT_A_GLOSS = new RegExp(String.raw`^(?:not\b|an? (?:procedure|operation|illness|condition|examination)$|the field$)|\+|\bplus\b|\b(?:prefix|suffix|root|ending|combining|vowel)(?:es|s)?\b|${KNOWN}`, "i");
/**
 * Every gloss one lesson string gives an example term, in the four forms the lessons use:
 *   "(bilateral, affecting both sides; polyuria, producing too much urine)"   pairs in a parenthesis
 *   "intravenous (within a vein)"                                              a parenthesis after the term
 *   "and you get bradycardia, a slow heart rate"                               a phrase after a comma
 *   "so hypertension is high blood pressure and hypotension is low …"          a clause
 * A parenthesis of bare terms, "(preoperative, postoperative)", glosses nothing.
 */
function exampleClaims(text: string): ExampleClaim[] {
  const claims: ExampleClaim[] = [];
  for (const [, inside] of text.matchAll(/\(([^)]+)\)/g)) {
    for (const pair of inside.split(/;\s*/)) {
      const m = pair.match(new RegExp(String.raw`^(${TERM}), (\S+\s.+)$`, "i"));
      if (m) claims.push({ term: m[1], gloss: m[2] });
    }
  }
  for (const m of text.matchAll(new RegExp(String.raw`(${TERM})\s*\(([^),;]+\s[^),;]+)\)`, "gi"))) claims.push({ term: m[1], gloss: m[2] });
  const prose = text.replace(/\([^)]*\)/g, " ");
  for (const m of prose.matchAll(new RegExp(String.raw`(${TERM}), (?:an?|the) ([^,.;:?()]+?)${GLOSS_END}`, "gi"))) claims.push({ term: m[1], gloss: m[2] });
  for (const m of prose.matchAll(new RegExp(String.raw`(${TERM})\s+(?:is|means)\s+([^,.;:?()]+?)${GLOSS_END}`, "gi"))) claims.push({ term: m[1], gloss: m[2] });
  return claims.map((c) => ({ term: c.term.toLowerCase(), gloss: c.gloss.trim() })).filter((c) => !NOT_A_GLOSS.test(c.gloss));
}
/** The prefix and suffix an example term is built from, with the meaning its gloss must carry. */
function exampleParts(term: string): Array<readonly [part: string, meaning: RegExp]> {
  if (NOT_BUILT_FROM_PART.has(term)) return [];
  const longest = (rows: ReadonlyArray<readonly [string, RegExp]>) => [...rows].sort((a, b) => b[0].length - a[0].length).slice(0, 1);
  return [
    ...longest(EXAMPLE_MEANING.filter(([part]) => part.endsWith("-") && term.startsWith(part.slice(0, -1)))),
    ...longest(EXAMPLE_MEANING.filter(([part]) => part.startsWith("-") && term.endsWith(part.slice(1))))
  ];
}
/** A gloss carries a part's meaning, or names another term built from the same prefix ("the pericardium"). */
const carries = (part: string, meaning: RegExp, gloss: string) =>
  meaning.test(gloss) || (part.endsWith("-") && new RegExp(String.raw`\b${part.slice(0, -1)}[a-z]{3,}`, "i").test(gloss));

async function main() {
  console.log("\nhosa-medterm-lessons:smoke\n");

  // ---- A. registration --------------------------------------------------------------------------
  await check("A. the four lessons are registered in one chain, in their own course, by reference", () => {
    assert.deepEqual([...PUBLISHED_HOSA_SLUGS], [...COURSE_ORDER, ...ANATOMY_ORDER, ...PHYSIOLOGY_ORDER, ...PATHOPHYSIOLOGY_ORDER],
      "A1. the track file publishes the four first, in teaching order, then the anatomy module's four, the physiology module's four and the pathophysiology module's five");
    assert.deepEqual(HOSA_PUBLISHED_LESSONS.map((e) => e.id), [...COURSE_ORDER, ...ANATOMY_ORDER, ...PHYSIOLOGY_ORDER, ...PATHOPHYSIOLOGY_ORDER], "A1b. and registers them in that order");
    const hosa = educationLessonsForTrack("HOSA").map((e) => e.id);
    assert.deepEqual(hosa.slice(0, 4), [...COURSE_ORDER], "A2. they lead the HOSA registry order");
    for (const [index, id] of COURSE_ORDER.entries()) {
      const entry = getEducationLesson(id);
      assert.ok(entry, `A3. ${id} is registered`);
      assert.equal(entry.track, "HOSA", `A3b. ${id} is HOSA`);
      assert.equal(entry.courseId, HOSA_MEDTERM_STUDY_COURSE, `A3c. ${id} is in the Medical Terminology course`);
      assert.equal(entry.moduleId, "hosa-medterm-word-parts", `A3d. ${id} is in the word-parts module`);
      assert.equal(entry.variant, "concept", `A3e. ${id} is a concept lesson`);
      assert.equal(entry.visibility, "learner", `A3f. ${id} is learner-visible`);
      assert.equal(entry.practiceState, "available", `A3g. ${id} has its own checks`);
      // The last word-part lesson continues into the anatomy module, the next module of the same course.
      assert.equal(entry.nextLessonId, COURSE_ORDER[index + 1] ?? ANATOMY_ORDER[0], `A4. ${id} chains to the next lesson in order`);
      // No claim to be where a record starts: the practice room keeps its own review-only model.
      assert.equal(entry.skillSlug, undefined, `A5. ${id} claims no skill`);
      assert.equal(entry.practiceDrill, undefined, `A5b. ${id} names no drill`);
      // By reference, never a copy.
      const original = LEARNING_SKILL_CATALOG.find((c) => c.slug === id);
      assert.ok(original && entry.source === original, `A6. ${id} holds the ORIGINAL catalog object`);
      // Honest provenance: stable teaching, never a rules source, and it survives the decision layer.
      assert.ok(entry.provenance === STABLE_TEACHING_HOSA_PROVENANCE, `A7. ${id} carries the shared stable-teaching provenance`);
      const shown = presentSourceFreshness(entry.provenance);
      assert.equal(shown.degraded, false, `A7b. ${id} provenance does not degrade`);
      assert.equal(shown.authority, "stable-teaching", `A7c. ${id} is presented as stable teaching`);
      assert.match(shown.authorityLabel, /not a current-rules source/, `A7d. ${id} says it is not a rules source`);
    }
    assert.ok(Object.isFrozen(STABLE_TEACHING_HOSA_PROVENANCE), "A7e. the provenance object is frozen");
    // The lessons were AI-drafted and no person has reviewed them yet (the authoring record in
    // lib/learning-content.ts), so the label a learner reads says both. Change this check together with
    // the label, and only after a human review or an owner waiver is recorded there.
    assert.match(STABLE_TEACHING_HOSA_PROVENANCE.sourceLabel ?? "", /^AI-generated\b/, "A7f. the label says the lessons are AI-generated");
    assert.match(STABLE_TEACHING_HOSA_PROVENANCE.sourceLabel ?? "", /not yet reviewed by a person/, "A7g. and that no person has reviewed them yet");
    assert.match(STABLE_TEACHING_HOSA_PROVENANCE.sourceLabel ?? "", /not an official HOSA lesson or test item/,
      "A7g2. and that they are not official HOSA lessons or test items");
    assert.match(read("lib/learning-content.ts"), /have NOT yet had a human content review/,
      "A7h. which is what the authoring record still says");
    const course = EDUCATION_COURSES.find((c) => c.id === HOSA_MEDTERM_STUDY_COURSE);
    assert.ok(course && course.track === "HOSA", "A8. the course exists on the HOSA track");
    assert.deepEqual(course.moduleIds, ["hosa-medterm-word-parts", "hosa-medterm-anatomy", "hosa-medterm-physiology", "hosa-medterm-pathophysiology"],
      "A8b. word parts first, then anatomy, then physiology, then pathophysiology");
    assert.equal(getEducationModule("hosa-medterm-word-parts")?.label, "Medical word parts", "A8c. whose learner label names the skill");
  });

  await check("A9. published and held HOSA catalog entries partition the HOSA catalog", () => {
    const catalogHosa = LEARNING_SKILL_CATALOG.filter((c) => c.organization === "HOSA" || c.track === "HOSA").map((c) => c.slug).sort();
    const partition = [...PUBLISHED_HOSA_SLUGS, ...HELD_HOSA_CATALOG_SLUGS].sort();
    assert.deepEqual(partition, catalogHosa, "A9. every HOSA catalog entry is published or held, and nothing else");
    assert.equal(new Set(partition).size, partition.length, "A9b. and none is both");
    for (const held of HELD_HOSA_CATALOG_SLUGS) {
      assert.equal(getEducationLesson(held), undefined, `A9c. held "${held}" is not registered`);
    }
  });

  // ---- B. course end -----------------------------------------------------------------------------
  await check("B. the course-end action sits only on the course's last lesson; the word-part module ends in word-part practice", () => {
    // Exhaustive over the real registry: the action appears exactly where a HOSA Medical Terminology
    // chain ends, and nowhere else, so it cannot strand itself on a lesson that is no longer last.
    for (const entry of EDUCATION_LESSONS) {
      const expected = entry.track === "HOSA" && entry.courseId === HOSA_MEDTERM_STUDY_COURSE &&
        entry.visibility === "learner" && entry.nextLessonId === null;
      assert.equal(hosaCourseEndAction(entry.id) !== null, expected, `B1. ${entry.id}: course-end action only at the chain's end`);
      // The two course-end helpers never both answer, so the lesson page's "??" can never hide one.
      assert.ok(!(hosaCourseEndAction(entry.id) && decaCourseEndAction(entry.id)), `B1b. ${entry.id}: at most one course-end action`);
    }
    assert.deepEqual(EDUCATION_LESSONS.filter((entry) => hosaCourseEndAction(entry.id) !== null).map((entry) => entry.id),
      [PATHOPHYSIOLOGY_ORDER[PATHOPHYSIOLOGY_ORDER.length - 1]], "B1c. and the one lesson that has it is the course's last, which ends the pathophysiology module");
    // Prefixes ends the word-part module, so it carries the word-part practice link beside "Next lesson".
    assert.equal(hosaLessonPracticeReturn("hosa-medical-prefixes"), HOSA_MEDTERM_PRACTICE_ENTRY,
      "B1d. Prefixes, the word-part module's last lesson, still hands the learner to word-part practice");
    for (const unknown of ["", "no-such-lesson", "hosa-patient-communication", "hosa-healthcare-ethics"]) {
      assert.equal(hosaCourseEndAction(unknown), null, `B2. "${unknown}" fails closed`);
    }
    // The link opens the practice room with the taught word parts preselected (targeted practice,
    // lib/hosa-medterm-focus.ts); the value is read through the same resolver the page uses.
    const target = new URL(HOSA_MEDTERM_PRACTICE_ENTRY.href, "http://localhost");
    assert.equal(target.pathname, HOSA_MEDTERM_PRACTICE_ROOM, "B3. it leads to the event's practice room");
    assert.equal(HOSA_MEDTERM_PRACTICE_ROOM, "/training/hosa/practice", "B3a. which is the room the hub and Event HQ know");
    assert.equal(medTermFocusFromParam(target.searchParams.get(HOSA_MEDTERM_FOCUS_PARAM) ?? undefined), "word-parts",
      "B3c. with the word parts the course teaches preselected, never anything untaught-only");
    assert.ok(Object.isFrozen(HOSA_MEDTERM_PRACTICE_ENTRY), "B3b. and the entry is frozen");
    const copy = `${HOSA_MEDTERM_PRACTICE_ENTRY.label} ${HOSA_MEDTERM_PRACTICE_ENTRY.detail}`;
    // What the room saves is its own business; this copy claims nothing about it in either direction.
    assert.ok(!/record|saved|\bsave|mastery|progress|nothing is|score/i.test(copy), "B4. the copy makes no persistence claim");
    assert.match(copy, /original questions, not official HOSA test items/, "B5. it says the questions are original, not official");
    assert.match(copy, /adds questions on anatomy, physiology and disease\. The lessons after this one teach anatomy, physiology and disease \(pathophysiology\)/,
      "B6. and it names what the room's other choice adds, and that later lessons of the course teach it");
    // Some of the bank's word-part questions test parts no lesson teaches yet (NOT_TAUGHT, which C2
    // derives from the bank), so the copy may not claim the course covers that half of the room. Once
    // the course teaches them all, the clause is no longer true and has to go.
    assert.equal(
      /Most of its word-root, prefix and suffix questions use what this course teaches, and some use word parts it has not taught yet/.test(copy),
      NOT_TAUGHT.length > 0,
      "B6b. the copy says some word-part questions use parts the course has not taught, exactly while some do");
    const page = stripComments(read("app/(app)/lessons/[slug]/page.tsx"));
    assert.match(page, /courseEndAction: decaCourseEndAction\(entry\.id\) \?\? hosaCourseEndAction\(entry\.id\)/,
      "B7. the lesson page offers the HOSA course-end action beside DECA's");
  });

  // ---- C. consistent with the practice bank --------------------------------------------------------
  const lessonSentences = COURSE_ORDER.flatMap((id) => lessonStrings(sourceOf(id))).flatMap(sentences);
  const lessonDefinitions = lessonSentences.flatMap(parseDefinitions);
  const definitionsOf = (token: RegExp) => lessonDefinitions.filter((d) => wholePart(token).test(d.part));
  const WORD_PART_AREAS = new Set(["word-roots", "prefixes", "suffixes"]);
  const bankWordParts = MEDTERM_BANK.filter((item) => WORD_PART_AREAS.has(item.area));
  // The part a bank question tests: the key of "Which root / prefix / suffix …?", else the first part it quotes.
  const isWhich = (question: string) => /^Which (?:root|prefix|suffix)\b/i.test(question);
  const testedPart = (item: (typeof MEDTERM_BANK)[number]) =>
    (isWhich(item.question) ? item.correctAnswer : item.question.match(/'([^']+)'/)?.[1] ?? "").toLowerCase().replace(/\/o$/, "");
  let taughtQuestions = 0;

  await check("C. every word part the lessons define keeps one meaning, in words listed for it, and it is the practice bank's", () => {
    assert.ok(lessonSentences.length > 200 && lessonDefinitions.length >= 150,
      `C0. control: the lessons were really read (${lessonSentences.length} sentences, ${lessonDefinitions.length} definitions)`);
    for (const [part, token, gloss, definedAs] of [...GLOSSES, ...LESSON_ONLY]) {
      const found = definitionsOf(token);
      // C1. Each part is defined somewhere, not merely named.
      assert.ok(found.length > 0, `C1. the lessons define ${part}`);
      // C5. And every definition of it, anywhere in the four lessons, is one of the phrasings listed for
      // it, word for word. So a rewrite that teaches a different meaning, in a list, a parenthesis or an
      // example's contrast, fails here by name, and so does a meaning that only shares a word with the
      // right one ("bone marrow" for oste/o). A new correct phrasing is added to definedAs on purpose.
      for (const d of found) {
        assert.ok(definedAs.includes(phrasing(d.text)),
          `C5. the lessons define ${part} only as ${JSON.stringify(definedAs)} (found "${d.part}" = "${d.text}")`);
      }
      // Each listed phrasing carries the bank's meaning and is still in use, so the list stays the lessons' own.
      for (const accepted of definedAs) {
        assert.ok(gloss.test(accepted), `C5f. "${accepted}" carries ${part}'s meaning, ${gloss.source}`);
        assert.ok(found.some((d) => phrasing(d.text) === accepted), `C5g. "${accepted}" is still how a lesson defines ${part}`);
      }
    }
    for (const [part, token] of MENTIONED) {
      assert.deepEqual(definitionsOf(token), [], `C5b. ${part} is only mentioned: a lesson that defines it gives it a row with a meaning`);
    }
    // C5h. A meaning given with a verb the parser does not read ("-megaly signals softening") would escape C5.
    for (const s of lessonSentences) {
      assert.ok(!UNREAD_VERB.test(s), `C5h. "${s.slice(0, 60)}" gives a word part a meaning with a verb C5 does not read`);
    }
    // C5i. A bare root the tables do not know ("Splen means kidney") would escape C5 and C7.
    const knownRoot = (word: string) => [...GLOSSES, ...LESSON_ONLY, ...MENTIONED].some(([, token]) => wholePart(token).test(word));
    // "Cutaneous" and "pulmonary" are a known root plus a describing-word ending.
    const knownBare = (word: string) => knownRoot(word) || knownRoot(word.replace(/(?:al|ar|ary|ic|ous)$/, "")) ||
      exampleParts(word).length > 0 || ORDINARY_SUBJECTS.has(word);
    let bareSubjects = 0;
    for (const s of lessonSentences) {
      for (const [, word] of s.matchAll(BARE_SUBJECT)) {
        bareSubjects += 1;
        assert.ok(knownBare(word.toLowerCase()), `C5i. "${word}" is given a meaning in "${s.slice(0, 60)}" but is not a known part or term`);
      }
    }
    assert.ok(bareSubjects >= 15, `C5i2. control: the bare subjects were found (${bareSubjects})`);
    assert.ok(!knownBare("splen") && !knownBare("splenic") && knownBare("nephr") && knownBare("intercostal") && knownBare("cutaneous"),
      "C5i3. control: an unknown root is told from a known one, with or without a describing-word ending");
    // Non-vacuity: each shape the parser reads really yields a definition a wrong meaning cannot pass.
    const rowOf = (written: string) => [...GLOSSES, ...LESSON_ONLY].find(([, token]) => wholePart(token).test(written))!;
    for (const [shape, sentence, part, text] of [
      ["opening clause", "-ostomy is surgical removal.", "-ostomy", "surgical removal"],
      ["opening clause after the part's kind", "The suffix -megaly means softening (cardiomegaly).", "-megaly", "softening"],
      ["meaning verb", "-otomy creates an opening.", "-otomy", "creates an opening"],
      ["parenthesis", "Bones: oste/o (bone), cost/o (skull).", "cost/o", "skull"],
      ["example term after the wrong prefix", "No urine at all would take an- (dysuria).", "an-", "dysuria"],
      ["closing clause", "The skull is cost/o.", "cost/o", "The skull"],
      ["list", "crani/o means skull, cost/o spine.", "cost/o", "spine"]
    ] as const) {
      const d = parseDefinitions(sentence).find((x) => x.part === part);
      assert.equal(d?.text, text, `C5c. control: a contradicting ${shape} is read as a definition`);
      assert.ok(!rowOf(part)[3].includes(phrasing(text)), `C5d. control: and "${text}" is not a listed phrasing of ${part}`);
    }
    const [, , osteGloss, osteDefinedAs] = rowOf("oste/o");
    assert.ok(osteGloss.test("bone marrow") && !osteDefinedAs.includes("bone marrow"),
      "C5d2. control: a meaning that shares a word with the right one passes the pattern but not the list");
    assert.ok(UNREAD_VERB.test("-megaly signals softening (cardiomegaly)."), "C5h2. control: an unread verb is caught");
    assert.deepEqual(parseDefinitions("the ec in -ectomy means out, so the part comes out."), [],
      "C5e. control: etymology is not read as a definition");
    assert.deepEqual(parseDefinitions("In arthritis, the ending is -itis."), [],
      "C5e2. control: naming a part's kind is not read as a definition");
    // The worked contrasts the lessons lean on are the bank's own confusable pairs.
    for (const [a, b] of [["cyst/o", "cyt/o"], ["my/o", "myel/o"], ["intra-", "inter-"], ["-ectomy", "-ostomy"]]) {
      assert.ok(lessonSentences.some((s) => s.includes(a)) && lessonSentences.some((s) => s.includes(b)),
        `C4. the lessons teach ${a} beside ${b}`);
    }
  });

  await check("C2. every word part the practice bank tests is taught with the bank's meaning, or named as not taught", () => {
    assert.ok(bankWordParts.length >= 90, `C2. control: the bank's word-part questions were read (${bankWordParts.length})`);
    const taughtRows = new Set<string>();
    const notTaughtHit = new Set<string>();
    for (const item of bankWordParts) {
      const tested = testedPart(item);
      const rows = [...GLOSSES, ...LESSON_ONLY].filter(([, token]) => wholePart(token).test(tested));
      const notTaught = NOT_TAUGHT.includes(tested);
      assert.equal(rows.length + (notTaught ? 1 : 0), 1,
        `C2a. ${item.id} tests "${tested}", which is exactly one taught or not-taught part (${rows.map(([p]) => p).join(", ")})`);
      if (notTaught) {
        notTaughtHit.add(tested);
        continue;
      }
      const [part, token, gloss] = rows[0];
      assert.ok(GLOSSES.includes(rows[0]), `C2b. ${item.id} tests ${part}, so it belongs in GLOSSES, not LESSON_ONLY`);
      taughtRows.add(part);
      taughtQuestions += 1;
      assert.ok(gloss.test(isWhich(item.question) ? item.question : item.correctAnswer), `C2c. ${item.id} keys ${part} as ${gloss.source}`);
      assert.ok(sentences(item.explanation).some((s) => token.test(s) && gloss.test(s)),
        `C2d. ${item.id}'s explanation gives ${part} that meaning`);
    }
    assert.deepEqual([...taughtRows].sort(), GLOSSES.map(([p]) => p).sort(),
      "C2e. every GLOSSES part is tested by the bank, so none of them is really lesson-only");
    // C6. The parts the bank tests and the course does not teach yet: really tested, and really untaught.
    assert.deepEqual([...notTaughtHit].sort(), [...NOT_TAUGHT].sort(), "C6. every NOT_TAUGHT part is tested by the bank");
    for (const part of NOT_TAUGHT) {
      const token = part.startsWith("-") ? new RegExp(`${part}\\b`, "i")
        : part.endsWith("-") ? new RegExp(`\\b${part}`, "i") : new RegExp(`\\b${part}(?:\\/o)?\\b`, "i");
      assert.ok(!lessonSentences.some((s) => token.test(s)), `C6b. no lesson teaches or names ${part} yet`);
    }
  });

  await check("C7. every word part a lesson writes is a known part, and every example agrees with its parts", () => {
    // C7. Anything written as a word part ("-itis", "peri-", "cardi/o") is exactly one row above, so a
    // part a lesson starts using cannot escape the meaning checks by being missing from the tables. A
    // check's wrong choices are left out: "car- + di/o + -megaly" cuts a term into pieces that are not
    // parts on purpose.
    const wrongChoices = new Set(COURSE_ORDER.flatMap((id) => {
      const content = sourceOf(id).lesson.content;
      return [content.guidedQuestion, ...content.practiceQuestions, ...content.masteryCheck]
        .flatMap((q) => q.choices.filter((choice) => choice !== q.correctAnswer));
    }));
    const written = COURSE_ORDER.flatMap((id) => lessonStrings(sourceOf(id))).filter((s) => !wrongChoices.has(s));
    const mentions = new Set(written.flatMap((s) => (s.match(new RegExp(PART_ANY, "gi")) ?? []).map((m) => m.toLowerCase())));
    assert.ok(mentions.size >= 80, `C7. control: the lessons' written parts were found (${mentions.size})`);
    for (const mention of mentions) {
      const rows = [...GLOSSES, ...LESSON_ONLY, ...MENTIONED].filter(([, token]) => wholePart(token).test(mention));
      assert.equal(rows.length, 1, `C7. "${mention}" is exactly one known part (${rows.map(([p]) => p).join(", ") || "none"})`);
    }
    // C8. A worked example glosses its term: "(myalgia, muscle pain)", "intravenous (within a vein)",
    // "bradycardia, a slow heart rate", "hypertension is high blood pressure". When the term starts with a
    // prefix or ends in a suffix the lessons define, the gloss carries that part's meaning, so an example
    // cannot quietly contradict the definition it illustrates. Text that is wrong on purpose is left out:
    // a check's wrong choices, the weak answers, the misconception's wrong model and each mistake as stated.
    const wrongOnPurpose = new Set([...wrongChoices, ...COURSE_ORDER.flatMap((id) => {
      const content = sourceOf(id).lesson.content;
      return [content.workedExample.weakAnswer, content.misconception?.wrongModel,
        ...(content.additionalExamples ?? []).map((example) => example.weak), ...(content.commonMistakes ?? []).map((m) => m.mistake)];
    })]);
    const claimed = COURSE_ORDER.flatMap((id) => lessonStrings(sourceOf(id))).filter((s) => !wrongOnPurpose.has(s));
    const verdicts = (text: string) => exampleClaims(text).flatMap(({ term, gloss }) =>
      exampleParts(term).map(([part, meaning]) => ({ term, gloss, part, meaning, ok: carries(part, meaning, gloss) })));
    const checkedParts = new Set<string>();
    let examples = 0;
    for (const s of claimed) {
      for (const v of verdicts(s)) {
        examples += 1;
        checkedParts.add(v.part);
        assert.ok(v.ok, `C8. the example "${v.term}" = "${v.gloss}" carries the meaning of ${v.part}, ${v.meaning.source}`);
      }
    }
    assert.ok(examples >= 40 && checkedParts.size >= 25,
      `C8b. control: the examples were found (${examples}, for ${checkedParts.size} prefixes and suffixes)`);
    // Non-vacuity: a contradicting example is caught in each form, and ordinary sentences are not read as glosses.
    for (const [form, text] of [
      ["pairs in a parenthesis", "sub- means under or below (subcutaneous, above the skin)."],
      ["a parenthesis after the term", "as in intravenous (between the veins)."],
      ["a phrase after a comma", "and you get bradycardia, a fast heart rate."],
      ["a clause", "so hypertension is low blood pressure and hypotension is high blood pressure."],
      ["a suffix example", "-algia means pain (myalgia, muscle inflammation)."]
    ] as const) {
      const found = verdicts(text);
      assert.ok(found.length > 0 && found.every((v) => !v.ok), `C8c. control: a contradicting example in ${form} is caught`);
    }
    for (const text of ["In arthritis, the ending is -itis.", "pre- means before and post- means after (preoperative, postoperative).",
                        "Gastritis is an illness and gastrectomy is an operation.", "-ostomy comes from stoma, an opening."]) {
      assert.deepEqual(verdicts(text), [], `C8d. control: "${text}" glosses no example`);
    }
    // C8e. Every prefix and suffix the lessons define has an example meaning, unless it is listed as having
    // none, and that meaning accepts the part's own definitions.
    const affixes = [...GLOSSES, ...LESSON_ONLY].filter(([part]) => part.startsWith("-") || part.endsWith("-"));
    assert.deepEqual([...EXAMPLE_MEANING.map(([part]) => part), ...NO_EXAMPLE_MEANING].sort(), affixes.map(([part]) => part).sort(),
      "C8e. every prefix and suffix has an example meaning or is listed as having none");
    for (const [part, meaning] of EXAMPLE_MEANING) {
      const [, , , definedAs] = affixes.find(([name]) => name === part)!;
      assert.ok(definedAs.every((accepted) => meaning.test(accepted)), `C8f. ${part}'s example meaning ${meaning.source} accepts its definitions`);
    }
  });

  // ---- D. the checks -------------------------------------------------------------------------------
  await check("D. every check is complete, original, and not answerable from form alone", () => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9/ -]/g, " ").split(/\s+/).filter(Boolean);
    const overlap = (a: string[], b: string[]) => {
      const A = new Set(a);
      const B = new Set(b);
      let shared = 0;
      for (const token of A) if (B.has(token)) shared += 1;
      return shared / (A.size + B.size - shared);
    };
    let total = 0;
    let keyIsLongest = 0;
    const positions = new Set<number>();
    for (const id of COURSE_ORDER) {
      const content = sourceOf(id).lesson.content;
      const questions = [content.guidedQuestion, ...content.practiceQuestions, ...content.masteryCheck];
      assert.equal(questions.length, 6, `D1. ${id} has a guided question, four practice checks and a final check`);
      const lessonPositions = new Set<number>();
      for (const q of questions) {
        total += 1;
        assert.equal(q.choices.length, 4, `D2. "${q.prompt.slice(0, 50)}" offers four choices`);
        assert.equal(new Set(q.choices).size, q.choices.length, `D2b. "${q.prompt.slice(0, 50)}" has no duplicate choice`);
        const position = q.choices.indexOf(q.correctAnswer);
        assert.ok(position >= 0, `D2c. "${q.prompt.slice(0, 50)}" keys one of its own choices`);
        assert.ok(q.hint.trim() && q.explanation.trim() && q.skillTag.trim(), `D2d. "${q.prompt.slice(0, 50)}" has hint, explanation and tag`);
        // Explanatory feedback: the explanation says why, it does not just restate the key.
        assert.ok(q.explanation.length >= 80 && q.explanation !== q.correctAnswer,
          `D3. "${q.prompt.slice(0, 50)}" explains its answer rather than restating it`);
        lessonPositions.add(position);
        positions.add(position);
        const lengths = q.choices.map((c) => c.length);
        const longest = Math.max(...lengths);
        if (q.correctAnswer.length === longest && lengths.filter((l) => l === longest).length === 1) keyIsLongest += 1;
        // Original teaching items: no check is a copy or near-copy of a bank question.
        for (const item of MEDTERM_BANK) {
          assert.ok(overlap(norm(q.prompt), norm(item.question)) < 0.6,
            `D4. "${q.prompt.slice(0, 50)}" is not a copy of bank item ${item.id}`);
        }
      }
      assert.ok(lessonPositions.size >= 3, `D5. ${id} spreads its keys over at least three positions`);
    }
    assert.equal(total, 24, "D6. twenty-four checks across the course");
    assert.equal(positions.size, 4, "D6b. every answer position is used somewhere in the course");
    assert.ok(keyIsLongest <= total / 4, `D6c. the key is the uniquely longest choice in at most a quarter of checks (${keyIsLongest}/${total})`);
    // Control: a bank question with one word changed is caught by the same measure D4 applies.
    assert.ok(MEDTERM_BANK.some((item) => overlap(norm("The prefix 'brady-' indicates:"), norm(item.question)) >= 0.6),
      "D7. control: a one-word rewording of a bank question is caught by the originality measure");
  });

  await check("D8. each check's explanation argues for its own key", () => {
    // For every wrong choice, the explanation uses a word only the key has before it uses a word only
    // that wrong choice has. Choices that reuse the same words in another order ("softening of bone;
    // hardening of the arteries") are told apart by adjacent word pairs. Words the prompt already uses
    // are not evidence. So an explanation that argues for a wrong choice fails here, and so does a
    // check re-keyed to any wrong choice: its explanation still argues for the old key.
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
    for (const id of COURSE_ORDER) {
      const content = sourceOf(id).lesson.content;
      for (const q of [content.guidedQuestion, ...content.practiceQuestions, ...content.masteryCheck]) {
        assert.ok(arguesFor(q, q.correctAnswer), `D8. "${q.prompt.slice(0, 50)}" explains why its key is right before it names a wrong choice`);
        for (const wrong of q.choices.filter((choice) => choice !== q.correctAnswer)) {
          assert.ok(!arguesFor(q, wrong), `D8b. control: "${q.prompt.slice(0, 50)}" re-keyed to "${wrong}" is caught`);
          rekeyed += 1;
        }
      }
    }
    assert.equal(rekeyed, 72, "D8c. control: every wrong choice of all 24 checks was tried as a key");
  });

  // ---- E. no official claim, no other track ---------------------------------------------------------
  await check("E. the lessons state no HOSA rule and carry no other track's vocabulary", () => {
    // Each scan, with a sentence that makes exactly the claim it looks for.
    const CLAIMS: ReadonlyArray<readonly [label: string, pattern: RegExp, claim: string]> = [
      ["the organization's name", /\bHOSA\b/, "HOSA tests these terms every year."],
      // "points to the sac" and "the combining-vowel rule" are teaching language, not claims, so the
      // scan targets what a claim looks like: a number of points, scoring, or an event's rules.
      ["points or scores", /\b\d+\s*points?\b|\bpoints? (?:each|per|for)\b|\bscor(?:e|es|ed|ing)\b|rating sheet/i,
        "Each correct answer scores 2 points."],
      ["test numbers", /\b\d+\s*(?:%|percent|questions?|minutes?|items?)\b/i, "The test has 100 questions."],
      ["rules or guidelines", /\b(?:HOSA|event|official|competition)\s+rules?\b|guideline|\bexam\b|competition/i,
        "Check the event rules first."],
      ["another track", /\bDECA\b|debate|role-?play|performance indicator|\bjudge\b|rebuttal/i, "A judge would expect this."]
    ];
    for (const id of COURSE_ORDER) {
      const source = sourceOf(id);
      const text = lessonStrings(source).join("\n");
      assert.ok(source.lesson.content.workedExample.prompt.includes("(Our example, not an official test question.)"),
        `E1. ${id}'s worked example says it is ours, not an official question`);
      const officialUses = text.match(/official/gi) ?? [];
      const labelled = text.match(/not an official test question/g) ?? [];
      assert.equal(officialUses.length, labelled.length, `E2. ${id} uses "official" only to say its example is not one`);
      for (const [label, pattern] of CLAIMS) {
        assert.ok(!pattern.test(text), `E3. ${id} mentions no ${label}`);
      }
    }
    // Non-vacuity: every scan flags its own claim.
    for (const [label, pattern, claim] of CLAIMS) {
      assert.ok(pattern.test(claim), `E4. control: the ${label} scan catches "${claim}"`);
    }
  });

  // ---- F. learner surfaces --------------------------------------------------------------------------
  await check("F1. each lesson renders its teaching before its checks, and its own onward step", () => {
    for (const id of COURSE_ORDER) {
      const entry = getEducationLesson(id)!;
      const source = sourceOf(id);
      const next = entry.nextLessonId ? { id: entry.nextLessonId, title: sourceOf(entry.nextLessonId).lesson.title } : null;
      const html = decode(renderToStaticMarkup(React.createElement(ConceptEducationLessonView, {
        source,
        provenance: entry.provenance,
        moduleLabel: getEducationModule(entry.moduleId)!.label,
        next,
        courseEndAction: decaCourseEndAction(id) ?? hosaCourseEndAction(id) ?? undefined,
        // The lesson page's own wiring (hosa-medterm-remediation-smoke pins that the page passes it).
        practiceReturn: hosaLessonPracticeReturn(id) ?? undefined
      })));
      const text = visible(html);
      assert.ok(text.includes(source.lesson.title), `F1a. ${id} renders its title`);
      assert.ok(text.includes("HOSA") && text.includes("Medical word parts"), `F1b. ${id} is badged HOSA and with its module`);
      assert.ok(text.includes("not a current-rules source"), `F1c. ${id} renders its provenance`);
      assert.ok(text.includes(STABLE_TEACHING_HOSA_PROVENANCE.sourceLabel ?? "\u0000"), `F1c2. ${id} shows the learner its AI-generated label`);
      assert.ok(text.includes("not official competition material"), `F1d. ${id} keeps the teaching-lesson disclaimer`);
      const teachAt = html.indexOf(source.lesson.content.explanation.slice(0, 40));
      const checksAt = html.indexOf('id="practice"');
      assert.ok(teachAt >= 0 && checksAt > teachAt, `F1e. ${id} teaches before it checks`);
      assert.ok(!/mastery/i.test(visible(html.slice(0, checksAt))), `F1f. ${id}'s teaching claims no mastery`);
      // Every word-part lesson has a next lesson: the last of them continues into the anatomy module.
      assert.ok(next, `F1g. ${id} continues to a next lesson`);
      assert.ok(html.includes(`href="/lessons/${next.id}"`), `F1g2. ${id} continues to ${next.id}`);
      const continueAt = html.indexOf(`href="/lessons/${next.id}"`);
      if (id === "hosa-medical-word-roots" || id === "hosa-medical-suffixes") {
        // A lesson that teaches a practice area (word roots, suffixes) also offers the way back to
        // word-part practice that the practice results send learners here from, AFTER the next-lesson
        // link, so the course order stays the first path.
        const returnAt = html.indexOf(`href="${HOSA_MEDTERM_PRACTICE_RETURN.href}"`);
        assert.ok(returnAt > continueAt, `F1h. ${id} offers word-part practice, after its next-lesson link`);
        assert.ok(text.includes(HOSA_MEDTERM_PRACTICE_RETURN.label) && text.includes("a later lesson in this course teaches"),
          `F1h2. ${id} labels that step and says the practice also asks about later lessons' parts`);
      } else if (id === "hosa-medical-prefixes") {
        // The word-part module's last lesson: the next lesson starts the anatomy module, and word-part
        // practice follows the next-lesson link, so the course order stays the first path.
        const entryAt = html.indexOf(`href="${HOSA_MEDTERM_PRACTICE_ENTRY.href}"`);
        assert.ok(entryAt > continueAt, `F1i. ${id} ends the word-part module in word-part practice, after its next-lesson link`);
        assert.ok(text.includes(HOSA_MEDTERM_PRACTICE_ENTRY.label), `F1j. ${id} labels that step`);
        assert.ok(!text.includes("end of this course so far"), `F1j2. ${id} no longer says the course ends here`);
      } else {
        // The first lesson teaches no single area and still does not jump ahead to practice.
        assert.ok(!html.includes(`href="${HOSA_MEDTERM_PRACTICE_ROOM}`), `F1h. ${id} does not jump ahead to practice`);
      }
    }
  });

  // Checked from source and registry data, not rendered: see the header. education-migration-smoke
  // checks this page's track resolution the same way.
  await check("F2. the HOSA lessons index leads with the course and states what it offers", () => {
    const indexSrc = stripComments(read("app/(app)/lessons/page.tsx"));
    assert.match(indexSrc, /"hosa-medterm-study":\s*"Medical Terminology course"/, "F2a. the course has a learner-facing heading");
    assert.match(indexSrc, /"hosa-clinical-skill-communication":\s*"Clinical-skill communication course"/,
      "F2b. and so does the communication course, so no internal course label reaches a HOSA learner");
    assert.match(indexSrc, /EDUCATION_COURSES\.filter\(\(course\) => course\.track === canonicalTrack\)/,
      "F2c. the index groups its cards by course, in registry order");
    assert.deepEqual(EDUCATION_COURSES.filter((course) => course.track === "HOSA").map((course) => course.id),
      [HOSA_MEDTERM_STUDY_COURSE, "hosa-clinical-skill-communication"], "F2c2. so the Medical Terminology course is listed first");
    assert.deepEqual(
      educationLessonsForTrack("HOSA").filter((entry) => entry.courseId === HOSA_MEDTERM_STUDY_COURSE).map((entry) => entry.id),
      [...COURSE_ORDER, ...ANATOMY_ORDER, ...PHYSIOLOGY_ORDER, ...PATHOPHYSIOLOGY_ORDER], "F2d. with its lessons in course order, word parts, anatomy, physiology, then pathophysiology");
    // A concept card's third row: other tracks keep their Study Arcade drill set, a HOSA card names
    // the event's question practice only when its course has one, and any other HOSA card claims
    // nothing more. Study Arcade has no HOSA drills.
    const thirdRow = new RegExp(
      'entry\\.track !== "HOSA"\\s*\\?\\s*\\[\\{\\s*label: "Skill drills"[^\\]]*\\]\\s*:\\s*' +
      'hosaCourseHasEventPractice\\(entry\\.courseId\\)\\s*\\?\\s*' +
      '\\[\\{\\s*label: "Question practice",\\s*value: "Available on the event page"[^\\]]*\\]\\s*:\\s*\\[\\]');
    assert.match(indexSrc, thirdRow,
      "F2e. the drill row sits behind the non-HOSA guard, and the question-practice row behind the course check");
    const questionRow = indexSrc.slice(indexSrc.indexOf('label: "Question practice"'));
    assert.ok(!/Study Arcade|drill/i.test(questionRow.slice(0, questionRow.indexOf("}"))),
      "F2f. and the HOSA row promises no drill set");
    assert.equal((indexSrc.match(/label: "Question practice"/g) ?? []).length, 1, "F2g. and nothing else in the index offers it");
    assert.ok(!/hosa-medical-/.test(indexSrc), "F2h. the index decides by course, never by a hardcoded lesson slug");
    assert.equal(hosaCourseHasEventPractice(HOSA_MEDTERM_STUDY_COURSE), true, "F2i. the MT course has event practice");
    assert.equal(hosaCourseHasEventPractice("hosa-clinical-skill-communication"), false, "F2j. the communication course does not");
    assert.ok(educationLessonsForTrack("DECA").every((entry) => entry.track === "DECA" && !entry.id.startsWith("hosa-")),
      "F2k. control: the DECA list the index draws from holds no HOSA lesson");
    // Control: the pattern above must reject the same source with the HOSA guard removed.
    const unguarded = indexSrc.replace('entry.track !== "HOSA"', "true");
    assert.ok(!thirdRow.test(unguarded), "F2l. control: an unguarded drill row is caught");
  });

  await check("F3. HOSA's Learn stage, Event HQ and hub lead to the lessons without overclaiming", () => {
    const learn = learnerPathForTrack("HOSA").find((stage) => stage.id === "learn");
    assert.equal(learn?.href, "/lessons?track=hosa", "F3a. Learn opens the HOSA lessons catalog");
    assert.equal(learn?.state, "available", "F3b. and is available now that it holds checked lessons");
    assert.match(learn?.note ?? "", /reading-only communication lesson/, "F3c. while still saying the communication lesson is reading only");

    const hq = read("app/(app)/training/[track]/event/[eventSlug]/page.tsx").replace(/^\s*\/\/.*$/gm, "");
    const hosaEntry = hq.slice(hq.indexOf('"hosa/medical-terminology"'), hq.indexOf('"deca/'));
    assert.ok(hosaEntry.length > 0, "F3d. control: the HOSA Event HQ entry was located");
    const labels = [...hosaEntry.matchAll(/label: "([^"]+)"/g)].map((m) => m[1]);
    assert.equal(labels[0], "Lessons", "F3e. Event HQ leads with the lessons");
    assert.ok(hosaEntry.includes('href: "/lessons?track=hosa"'), "F3f. which open the HOSA catalog");
    assert.ok(!hosaEntry.includes("/skills?track=hosa"), "F3g. and no longer loop through /skills");
    assert.ok(hosaEntry.includes('href: "/training/hosa/practice"'), "F3h. the practice room is still listed");
    assert.ok(!/mastery/i.test(hosaEntry), "F3i. the review-only entry still makes no mastery claim");

    const hub = renderToStaticMarkup(React.createElement(TrackHubPage, { params: { track: "hosa" } }));
    const hubText = visible(hub);
    assert.ok(hubText.includes("Start with medical word parts"), "F3j. the HOSA hub names the word-part lessons");
    assert.ok(/check your current event guideline for event-specific requirements/.test(hubText),
      "F3k. and still defers to the learner's own guideline");
    assert.ok(!hub.includes("/training/hosa/practice"), "F3l. and still never routes into the practice room itself");
    // hosa-practice-scope 38b pins the same rule but never runs past its baseline failure 10c, which
    // is how a DECA sentence in the shared practice-source note reached the HOSA hub unnoticed.
    assert.ok(!hubText.includes("DECA"), "F3m. the HOSA hub names no DECA material");
    assert.ok(hubText.includes("Original questions written for practice, not official HOSA test items."),
      "F3n. and states HOSA's own practice source");
    const decaHubText = visible(renderToStaticMarkup(React.createElement(TrackHubPage, { params: { track: "deca" } })));
    assert.ok(decaHubText.includes("not official DECA prompts") && !decaHubText.includes("HOSA test items"),
      "F3o. control: the DECA hub keeps its own practice-source sentence");
  });

  await check("F4. the new modules stay pure", () => {
    for (const file of ["lib/education/tracks/hosa.ts", "lib/education/hosa-medterm-practice.ts"]) {
      const code = stripComments(read(file));
      for (const banned of ["@/lib/prisma", "prisma.", "fetch(", "process.env", "@/lib/spaced-review",
                            "recordPracticeOutcome", "MasteryProgress", "localStorage", "@/lib/hosa-medterm\""]) {
        assert.ok(!code.includes(banned), `F4. ${file} contains no ${banned}`);
      }
    }
  });

  await check("F5. this suite never loaded the database client", () => {
    const cached = Object.keys(require.cache);
    assert.ok(cached.some((file) => /concept-education-lesson-view\.tsx$/.test(file)),
      "F5a. control: the module cache is the live registry for this run");
    const database = cached.filter((file) => /[\\/]lib[\\/]prisma\.ts$|[\\/]@prisma[\\/]client[\\/]|[\\/]\.prisma[\\/]client[\\/]/.test(file));
    assert.deepEqual(database, [], "F5b. neither lib/prisma nor @prisma/client was loaded");
  });

  console.log(`\nhosa-medterm-lessons: ${checks} checks passed. Four HOSA Medical Terminology word-part lessons, ` +
    "labeled AI-generated and not yet reviewed by a person, are registered by reference in their own course and chain, " +
    `claim no skill or drill, and carry stable-teaching provenance. ${taughtQuestions} of the practice bank's ` +
    `${bankWordParts.length} word-part questions test a part the lessons teach with the bank's own meaning; the other ` +
    `${bankWordParts.length - taughtQuestions} test parts listed here as not taught yet. The 24 original checks each explain ` +
    "why their key is right, the lessons state no HOSA rule, and the word-part module ends in the event's practice room, " +
    "with the word parts preselected, before the course continues into anatomy. The practice room is what the " +
    "lessons index, the Learn stage, Event HQ and the HOSA hub all lead to without claiming what that room records.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
