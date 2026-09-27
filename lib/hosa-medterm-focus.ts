// HOSA Medical Terminology — what a beginner can choose to practise, stated against what the course
// has taught.
//
// THE GAP THIS CLOSES. The practice room (/training/hosa/practice) drills one bank of 180 original
// questions across the six canonical areas in lib/hosa-medterm.ts. The course teaches the word-part
// half of it (word roots, prefixes, suffixes) in its first module and the anatomy area in its second,
// and nothing yet of physiology or pathophysiology. Until the targeted choices existed the room could
// only serve the whole bank, so a learner who had just finished a module met questions on topics no
// lesson had taught, with no way to say "only what I have learned". This module is the one list the
// practice page, the engine and the course's module-end lessons read for that choice.
//
// NOT A SECOND TAXONOMY. The areas stay the six canonical ones. A choice here is a NAME for a subset
// of them (or for all of them), typed against `MedTermArea` so an id that is not a canonical area does
// not compile, and the request the engine sends carries those canonical ids through the same validated
// contract the session route already enforces (`isMedTermArea`, `medTermSessionStartRequestSchema`).
// A choice never adds an area the learner did not pick, and "all" is expressed by OMITTING areas from
// the request, which is the route's existing every-area behaviour.
//
// WHICH AREAS THE COURSE TEACHES is a fact about the lessons, not about the bank, and it is asserted
// from the lessons: scripts/hosa-medterm-targeted-practice-smoke.ts reads the word part every bank
// question tests and checks that the word-part lessons name it, and scripts/hosa-medterm-anatomy-smoke.ts
// checks, question by question, that the anatomy lessons teach what each anatomy question needs. No
// lesson names a physiology or disease topic, so `HOSA_MEDTERM_TAUGHT_AREAS` cannot silently gain an
// area no lesson covers. When the course grows a module on one of the other areas, those suites say so
// by name and these lists are what change.
//
// THIS IS COMPETEREADY'S TEACHING ORGANISATION. The groupings "word parts from the course", "anatomy
// from the course" and "all Medical Terminology" are how CompeteReady organises practice around its
// own lessons. They are not official HOSA categories, and the copy says so.
//
// NO PROGRESS MODEL. A choice changes which questions a session draws from and nothing else: no new
// stored skill, no mastery, no readiness, no XP semantics. What the room records is unchanged.
//
// Pure, and safe for the client bundle: the only import is a TYPE, erased at compile time, so
// importing this module never loads the question bank (and its answer key) into the browser.

import type { MedTermArea } from "@/lib/hosa-medterm";

/** The practice room the course hands a learner to. */
export const HOSA_MEDTERM_PRACTICE_ROOM = "/training/hosa/practice";

/** The query parameter that preselects a choice on the practice room. Never starts a session. */
export const HOSA_MEDTERM_FOCUS_PARAM = "focus";

/** The three choices a beginner can make. The ids are URL values, never shown as such to the learner. */
export type MedTermFocusId = "word-parts" | "anatomy" | "all";

/**
 * The canonical areas the course's word-part module teaches. Typed against the bank's own union, so a
 * misspelt or foreign id is a compile error; proved against the lesson text by the targeted-practice
 * suite.
 */
export const HOSA_MEDTERM_WORD_PART_AREAS: readonly MedTermArea[] = Object.freeze(["word-roots", "prefixes", "suffixes"]);

/** The canonical area the course's anatomy module teaches, proved question by question by the anatomy suite. */
export const HOSA_MEDTERM_ANATOMY_AREAS: readonly MedTermArea[] = Object.freeze(["anatomy"]);

/**
 * Every canonical area a published lesson of the course teaches: the word-part areas and anatomy.
 * Physiology and pathophysiology are absent because no lesson teaches them yet, so the practice room
 * still marks them "not taught yet".
 */
export const HOSA_MEDTERM_TAUGHT_AREAS: readonly MedTermArea[] = Object.freeze([...HOSA_MEDTERM_WORD_PART_AREAS, ...HOSA_MEDTERM_ANATOMY_AREAS]);

export type MedTermFocus = Readonly<{
  id: MedTermFocusId;
  /** What the learner picks. */
  label: string;
  /** What is in it, in a beginner's words. */
  summary: string;
  /** True only when every area in the choice has a published lesson in the current course. */
  taught: boolean;
  /**
   * The course module whose lessons teach this choice, or null for the every-area choice. The module's
   * last lesson links here with this choice preselected (lib/education/hosa-medterm-practice.ts).
   */
  moduleId: string | null;
  /** The marker shown beside the choice, as text (paired with an icon, never colour alone). */
  coverage: string;
  /** What the learner is told before starting: what is taught, and what is not taught yet. */
  disclosure: string;
  /** The canonical areas the request carries, or null for every area (the request then omits areas). */
  areas: readonly MedTermArea[] | null;
}>;

export const MEDTERM_FOCUS_CHOICES: readonly MedTermFocus[] = Object.freeze([
  Object.freeze({
    id: "word-parts" as const,
    label: "Word parts from the course",
    summary: "Word roots, prefixes and suffixes: the three kinds of word part the Medical Terminology course teaches.",
    taught: true,
    moduleId: "hosa-medterm-word-parts",
    coverage: "Taught in the current course",
    disclosure:
      "Most of these questions use word parts the lessons teach. Some use word parts the lessons have not taught yet, and every answer is explained.",
    areas: HOSA_MEDTERM_WORD_PART_AREAS
  }),
  Object.freeze({
    id: "anatomy" as const,
    label: "Anatomy from the course",
    summary: "Body directions, planes and cavities, and the main structures of the heart, lungs, digestive and urinary tracts, bones, muscles, nerves and skin.",
    taught: true,
    moduleId: "hosa-medterm-anatomy",
    coverage: "Taught in the current course",
    disclosure:
      "These questions ask what the body’s main structures are and where they are, plus a few plain facts about what a structure does, such as which muscle you breathe with. The anatomy lessons teach all of them. Other questions on how the body works (physiology) and disease are not in this choice. Every answer is explained.",
    areas: HOSA_MEDTERM_ANATOMY_AREAS
  }),
  Object.freeze({
    id: "all" as const,
    label: "All Medical Terminology",
    summary: "Word parts, anatomy, physiology and disease (pathophysiology), all mixed together.",
    taught: false,
    moduleId: null,
    coverage: "Includes topics not taught yet",
    disclosure:
      "The course has no lessons on physiology or disease (pathophysiology) yet, so expect questions on topics you have not studied here. Every answer is explained.",
    areas: null
  })
]);

/** What the room offers when nothing preselects a choice: every area, the room's behaviour so far. */
export const DEFAULT_MEDTERM_FOCUS: MedTermFocusId = "all";

/** Where these groupings come from, said to the learner. */
export const HOSA_MEDTERM_FOCUS_ATTRIBUTION =
  "This choice is how CompeteReady organises practice around what its course has taught so far. It is not an official HOSA category.";

export function isMedTermFocusId(value: unknown): value is MedTermFocusId {
  return typeof value === "string" && MEDTERM_FOCUS_CHOICES.some((choice) => choice.id === value);
}

/**
 * Reads the preselection from a page's search params. Anything that is not exactly a known id, a
 * repeated param included, preselects nothing: the room then shows its default and the learner chooses.
 */
export function medTermFocusFromParam(value: string | string[] | undefined | null): MedTermFocusId | null {
  return isMedTermFocusId(value) ? value : null;
}

export function medTermFocus(id: MedTermFocusId): MedTermFocus {
  const choice = MEDTERM_FOCUS_CHOICES.find((candidate) => candidate.id === id);
  if (!choice) throw new Error(`unknown Medical Terminology practice choice: ${String(id)}`);
  return choice;
}

/**
 * The `areas` the engine sends for a choice: a fresh copy of the choice's canonical ids, or undefined
 * so the request omits the field and the route serves every area exactly as it did before.
 */
export function medTermFocusRequestAreas(id: MedTermFocusId): MedTermArea[] | undefined {
  const { areas } = medTermFocus(id);
  return areas ? [...areas] : undefined;
}

/**
 * Names the choice a session's stored areas correspond to, so a resumed session is labelled by what
 * it really covers rather than by what was just asked for. An empty list is the route's every-area
 * session. A set equal to a targeted choice's areas, in any order, is that choice. Anything else is a
 * selection this UI never makes, and it is named by its areas instead.
 */
export function medTermFocusForAreas(requested: readonly string[]): MedTermFocusId | null {
  const set = new Set(requested);
  if (set.size === 0) return "all";
  for (const choice of MEDTERM_FOCUS_CHOICES) {
    if (!choice.areas) continue;
    const areas = new Set<string>(choice.areas);
    if (set.size === areas.size && [...set].every((area) => areas.has(area))) return choice.id;
  }
  return null;
}

/**
 * Names what an issued session covers, in the learner's words: the choice its stored areas match, or
 * else its areas by label ("Anatomy and Physiology"). An empty list is the every-area session.
 */
export function medTermCoverageLabel(issuedAreas: readonly string[], labelOf: (id: string) => string): string {
  const focus = medTermFocusForAreas(issuedAreas);
  if (focus) return medTermFocus(focus).label;
  const labels = [...new Set(issuedAreas)].map(labelOf);
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}` : labels[0] ?? "";
}

/**
 * True when the server continued an unfinished earlier session that was issued for a different choice
 * than the one the learner just made, so the learner must be told what they are really practising.
 */
export function medTermContinuedForOtherChoice(resumed: boolean, issuedAreas: readonly string[], focus: MedTermFocusId): boolean {
  return resumed && medTermFocusForAreas(issuedAreas) !== focus;
}

/** The practice room with a choice preselected. Opening it starts nothing. */
export function medTermFocusHref(id: MedTermFocusId): string {
  return `${HOSA_MEDTERM_PRACTICE_ROOM}?${HOSA_MEDTERM_FOCUS_PARAM}=${medTermFocus(id).id}`;
}
