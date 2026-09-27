// HOSA Medical Terminology — where the course hands a learner to practice, and back.
//
// THE GAP THIS CLOSES. The Medical Terminology practice room (/training/hosa/practice) drills 180
// original questions. The course teaches three parts of them: four lessons on word parts (word roots,
// prefixes, suffixes), then four on anatomy, then four on physiology. A concept lesson whose chain
// ends renders "You've reached the end of this course so far" and nothing else. This module names the
// honest onward steps: the event's own practice room, opened with what the lessons just taught already
// selected.
//
// THE SAME SEAM THE DECA ROLE-PLAY COURSE USES (lib/education/deca-simulation-prep.ts). They are
// course-end and module-end actions, not `practiceDrill`s: the practice room keeps HOSA's own
// review-only evidence model, and no lesson here claims to be where a record starts. The copy
// therefore makes no claim about what the room saves either way. It says only what is true of the
// questions.
//
// DERIVED FROM THE CHAIN AND THE MODULES, not hardcoded to lesson ids. Each practice choice names the
// course module whose lessons teach it (`moduleId` in lib/hosa-medterm-focus.ts). The last lesson of
// a module links to that module's choice: at the end of the course as the course-end action, and
// where the course continues into another module as a link beside "Next lesson". When the course
// grows, the links move to the new last lessons on their own.
//
// PRACTICE FEEDBACK -> LESSON -> PRACTICE. The practice room's results name the areas a learner
// missed questions in. For a taught area this module names the published lesson where its teaching
// starts, and the room links there; that lesson links back to practice on its own module. The areas
// no lesson teaches (pathophysiology) get a plain statement that no lesson exists yet,
// never a nearby lesson. Every link in that chain is checked here, and a broken one yields no action
// at all rather than a guess.
//
// Pure: no React, no Prisma, no network, no filesystem, no environment, no browser API.

import {
  HOSA_MEDTERM_TAUGHT_AREAS,
  MEDTERM_FOCUS_CHOICES,
  medTermFocus,
  medTermFocusHref,
  type MedTermFocus,
  type MedTermFocusId
} from "@/lib/hosa-medterm-focus";
import { educationLessonsForTrack, getEducationLesson, getEducationModule } from "@/lib/education/registry";
import { isConceptEducationLessonEntry, type EducationRegistryEntry } from "@/lib/education/types";

/** The course whose chain ends in the Medical Terminology practice room. */
export const HOSA_MEDTERM_STUDY_COURSE = "hosa-medterm-study";

/** What every practice link carries, whichever seam shows it. */
export type HosaPracticeLink = Readonly<{ href: string; label: string; detail: string }>;

/**
 * The onward step at the end of the word-part module, stated as what the questions are, never what
 * the room records. "Not official HOSA test items" is the bank's own provenance (lib/hosa-medterm.ts:
 * original, hand-authored items).
 *
 * THE LINK PRESELECTS THE TAUGHT MATERIAL. It opens the practice room with the "word parts from the
 * course" choice already selected (lib/hosa-medterm-focus.ts), so a learner who has just finished the
 * four word-part lessons lands on practice for what those lessons taught, can see the choice and
 * change it, and starts nothing until they press start. The copy then says what no lesson has taught
 * yet, so nothing there is a surprise: about a fifth of the word-part questions use parts the course
 * does not cover (for example -centesis, retro-, pseudo-). The room's every-area choice also adds
 * anatomy and physiology, which the lessons after this one teach, and disease, which no lesson does.
 *
 * It was the course-end action until the anatomy module followed the word-part lessons. It now shows
 * on the word-part module's last lesson beside "Next lesson".
 */
export const HOSA_MEDTERM_PRACTICE_ENTRY: HosaPracticeLink = Object.freeze({
  href: medTermFocusHref("word-parts"),
  label: "Practise the word parts from this course",
  detail:
    `The Medical Terminology practice uses original questions, not official HOSA test items. This link opens it with the word parts from this course already selected. Most of its word-root, prefix and suffix questions use what this course teaches, and some use word parts it has not taught yet. Switching there to "${medTermFocus("all").label}" adds questions on anatomy, physiology and disease. The lessons after this one are about anatomy and physiology, and disease has no lessons yet. Every answer is explained.`
});

/**
 * The way back to practice from a lesson that owns a practice area and is NOT the last of its module.
 *
 * The module's last lesson already carries the module-end link above, which opens the same practice,
 * so it gets no second link. The copy says what the practice mixes: these lessons come before the end
 * of the module, so the word-part practice also asks about parts a later lesson teaches.
 */
export const HOSA_MEDTERM_PRACTICE_RETURN: HosaPracticeLink = Object.freeze({
  href: medTermFocusHref("word-parts"),
  label: "Practise the word parts from this course",
  detail:
    "This opens Medical Terminology practice with the word parts from this course already selected. It mixes word-root, suffix and prefix questions, so it also asks about parts a later lesson in this course teaches, and some parts no lesson teaches yet. Every answer is explained, and nothing starts until you press start."
});

/**
 * The onward step at the end of the anatomy module. It opens the practice room with the anatomy choice
 * selected: the bank's 30 anatomy questions, every one of which the anatomy lessons teach
 * (scripts/hosa-medterm-anatomy-smoke.ts). It was the course-end action until the physiology module
 * followed the anatomy lessons, and now shows on the anatomy module's last lesson beside "Next
 * lesson". The copy says the lessons after this one teach physiology, and that disease is not taught,
 * because the every-area choice adds both.
 */
export const HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY: HosaPracticeLink = Object.freeze({
  href: medTermFocusHref("anatomy"),
  label: "Practise the anatomy from this course",
  detail:
    `The Medical Terminology practice uses original questions, not official HOSA test items. This link opens it with "${medTermFocus("anatomy").label}" already selected: questions on body directions, planes and cavities and on the structures these lessons name. Switching there to "${medTermFocus("all").label}" mixes in word parts, physiology and disease. The lessons after this one are about physiology, and disease has no lessons yet. Every answer is explained, and nothing starts until you press start.`
});

/**
 * The way back to anatomy practice from the lesson where anatomy teaching starts. Anatomy practice
 * mixes questions from every anatomy lesson, and the copy says so, because this lesson comes before
 * the others.
 */
export const HOSA_MEDTERM_ANATOMY_PRACTICE_RETURN: HosaPracticeLink = Object.freeze({
  href: medTermFocusHref("anatomy"),
  label: "Practise the anatomy from this course",
  detail:
    "This opens Medical Terminology practice with anatomy already selected. It mixes questions from every anatomy lesson, so most of its questions are about structures a later lesson in this course teaches. Every answer is explained, and nothing starts until you press start."
});

/**
 * The onward step at the end of the physiology module, which is also the end of the course written so
 * far. It opens the practice room with the physiology choice selected: the bank's 30 physiology
 * questions, every one of which the physiology lessons teach (scripts/hosa-medterm-physiology-smoke.ts).
 * Disease is named as not taught, because the every-area choice adds it.
 */
export const HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY: HosaPracticeLink = Object.freeze({
  href: medTermFocusHref("physiology"),
  label: "Practise the physiology from this course",
  detail:
    `The Medical Terminology practice uses original questions, not official HOSA test items. This link opens it with "${medTermFocus("physiology").label}" already selected: questions on how the healthy body works, which these lessons teach. Switching there to "${medTermFocus("all").label}" mixes in word parts, anatomy and disease, and disease has no lessons yet. Every answer is explained, and nothing starts until you press start.`
});

/**
 * The way back to physiology practice from the lesson where physiology teaching starts. Physiology
 * practice mixes questions from every physiology lesson, and the copy says so, because this lesson
 * comes before the others.
 */
export const HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_RETURN: HosaPracticeLink = Object.freeze({
  href: medTermFocusHref("physiology"),
  label: "Practise the physiology from this course",
  detail:
    "This opens Medical Terminology practice with physiology already selected. It mixes questions from every physiology lesson, so many of its questions are about topics a later lesson in this course teaches. Every answer is explained, and nothing starts until you press start."
});

/**
 * The two links of each practice choice a course module leads to: at the module's end, and back from
 * an owning lesson inside it. Keyed by the practice choice, and resolved to a module through that
 * choice's `moduleId`, so no lesson id appears here.
 */
const MODULE_PRACTICE_LINKS: Readonly<Partial<Record<MedTermFocusId, { end: HosaPracticeLink; back: HosaPracticeLink }>>> =
  Object.freeze({
    "word-parts": { end: HOSA_MEDTERM_PRACTICE_ENTRY, back: HOSA_MEDTERM_PRACTICE_RETURN },
    anatomy: { end: HOSA_MEDTERM_ANATOMY_PRACTICE_ENTRY, back: HOSA_MEDTERM_ANATOMY_PRACTICE_RETURN },
    physiology: { end: HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_ENTRY, back: HOSA_MEDTERM_PHYSIOLOGY_PRACTICE_RETURN }
  });

/** The targeted practice choice whose lessons are this module's, or null. Exactly one, or none. */
function moduleFocus(moduleId: string): MedTermFocus | null {
  const matches = MEDTERM_FOCUS_CHOICES.filter((choice) => choice.moduleId === moduleId && choice.areas !== null);
  return matches.length === 1 ? matches[0] : null;
}

/** A module's links, only when both open that module's own practice choice. */
function moduleLinks(moduleId: string): { focus: MedTermFocus; end: HosaPracticeLink; back: HosaPracticeLink } | null {
  const focus = moduleFocus(moduleId);
  if (!focus) return null;
  const links = MODULE_PRACTICE_LINKS[focus.id];
  if (!links) return null;
  const href = medTermFocusHref(focus.id);
  if (links.end.href !== href || links.back.href !== href) return null;
  return { focus, ...links };
}

/** A learner-visible lesson of this HOSA course, or null. */
function courseLesson(lessonId: string): EducationRegistryEntry | null {
  const entry = getEducationLesson(lessonId);
  if (!entry || entry.visibility !== "learner") return null;
  if (entry.track !== "HOSA" || entry.courseId !== HOSA_MEDTERM_STUDY_COURSE) return null;
  return entry;
}

export function hosaCourseEndAction(lessonId: string): HosaPracticeLink | null {
  const entry = courseLesson(lessonId);
  if (!entry) return null;
  if (entry.nextLessonId !== null) return null; // not the end of the chain
  return moduleLinks(entry.moduleId)?.end ?? null;
}

/**
 * Whether a course's lessons are backed by the event's practice room, for the lessons index. Keyed on
 * the course, never on a lesson slug, so the index hardcodes no lesson to decide what a card offers.
 */
export function hosaCourseHasEventPractice(courseId: string | null | undefined): boolean {
  return courseId === HOSA_MEDTERM_STUDY_COURSE;
}

// --- practice feedback -> the lesson that teaches the area -> back to practice ---------------------

/** A canonical Medical Terminology practice area, typed without importing the question bank. */
type MedTermAreaId = (typeof HOSA_MEDTERM_TAUGHT_AREAS)[number];

/**
 * The published lesson where the teaching of each Medical Terminology practice area starts.
 *
 * Declared by hand, one area at a time, from what each lesson actually teaches. Word Roots teaches
 * word roots, Suffixes teaches suffixes, Prefixes teaches prefixes:
 * `scripts/hosa-medterm-remediation-smoke.ts` re-derives those three from the lessons' text against
 * the part every bank question tests, so a wrong pairing fails there. Anatomy is taught across the
 * whole anatomy module, so its entry is the module's first lesson, and the remediation names the
 * module: `scripts/hosa-medterm-anatomy-smoke.ts` proves, question by question, that the module
 * teaches what every anatomy question needs. Physiology is the same across the physiology module:
 * its entry is that module's first lesson, and `scripts/hosa-medterm-physiology-smoke.ts` proves the
 * module teaches what every physiology question needs.
 *
 * DELIBERATELY ABSENT: pathophysiology. No lesson teaches it yet, so it has no owner, and the
 * practice results say so instead of pointing at another lesson. The course's first
 * lesson, "How Medical Words Are Built", names examples of all three part kinds but owns none of
 * them, so it is not an owner either.
 */
export const HOSA_MEDTERM_AREA_TEACHING_OWNERS: Readonly<Partial<Record<MedTermAreaId, string>>> = Object.freeze({
  "word-roots": "hosa-medical-word-roots",
  prefixes: "hosa-medical-prefixes",
  suffixes: "hosa-medical-suffixes",
  anatomy: "hosa-anatomy-body-map",
  physiology: "hosa-physiology-staying-in-balance"
});

/** What the practice results say for an area that no published lesson teaches. */
export const HOSA_MEDTERM_NO_LESSON_MESSAGE = "CompeteReady does not have a lesson for this area yet.";

/** A published, learner-visible concept lesson of this course, or null. The shared "may I link here" rule. */
function publishedCourseLesson(lessonId: string) {
  const entry = courseLesson(lessonId);
  if (!entry || !isConceptEducationLessonEntry(entry)) return null;
  const title = entry.source.lesson.title.trim();
  return title ? { entry, title } : null;
}

/**
 * The practice link beside "Next lesson", for a lesson of this course that has a next lesson.
 *
 * Where the next lesson starts another module, this lesson ends its own, so it carries its module's
 * end link. Inside a module, only a lesson that owns a practice area links back, with copy saying a
 * later lesson teaches more, which is true because the next lesson is in the same module. The course's
 * last lesson gets the course-end action instead.
 */
export function hosaLessonPracticeReturn(lessonId: string): HosaPracticeLink | null {
  const lesson = publishedCourseLesson(lessonId);
  if (!lesson) return null;
  if (lesson.entry.nextLessonId === null) return null; // the course-end action covers the last lesson
  // The copy points at what comes next, so the next lesson must really be there.
  const next = publishedCourseLesson(lesson.entry.nextLessonId);
  if (!next) return null;
  const links = moduleLinks(lesson.entry.moduleId);
  if (!links) return null;
  if (next.entry.moduleId !== lesson.entry.moduleId) return links.end; // the end of this module
  if (!Object.values(HOSA_MEDTERM_AREA_TEACHING_OWNERS).includes(lessonId)) return null; // owns no practice area
  return links.back;
}

/** The link a lesson offers to practice, whichever of the two seams provides it. */
export function hosaLessonPracticeLink(lessonId: string): HosaPracticeLink | null {
  return hosaCourseEndAction(lessonId) ?? hosaLessonPracticeReturn(lessonId);
}

/** True when no lesson of the same module leads into this one: the module's teaching starts here. */
function startsItsModule(entry: EducationRegistryEntry): boolean {
  return !educationLessonsForTrack("HOSA").some(
    (other) => other.nextLessonId === entry.id && other.moduleId === entry.moduleId
  );
}

export type HosaMedTermRemediation =
  /** A published lesson teaches this area, and that lesson links back to practice that includes it. */
  | { area: string; kind: "lesson"; lessonId: string; lessonTitle: string; href: string; label: string }
  /** No lesson teaches this area yet. Stated plainly; nothing is linked in its place. */
  | { area: string; kind: "no-lesson"; message: string };

/**
 * What the practice results offer for one weak area, or null when no honest action can be proven.
 *
 * The chain, every link checked, each failure closing the whole action:
 *   area has a declared teaching owner
 *   -> the owner is a published, learner-visible lesson of this HOSA course
 *   -> the owner's module leads to a practice choice that includes this area
 *   -> the owner links back to exactly that practice choice
 *   -> and the area is one the course teaches.
 * An area with no declared owner gets the no-lesson statement. An owner that fails any later check
 * gets null: the lesson exists on paper but cannot be linked, and saying "no lesson yet" would be
 * false, so the results show the weak area alone.
 *
 * ONE LESSON OR A WHOLE MODULE. A word-part area is taught by one lesson, which the action names. A
 * module whose practice choice is this one area alone (anatomy, physiology) teaches it across all its lessons, so
 * the action names the module and the lesson it starts with, and the owner must be that first lesson.
 *
 * `areaLabel` is the canonical area label from the practice room, so the action names the same area
 * the results line above it names.
 */
export function hosaMedTermRemediation(area: string, areaLabel: string): HosaMedTermRemediation | null {
  const label = areaLabel.trim();
  if (!area || !label) return null;
  const ownerId = Object.prototype.hasOwnProperty.call(HOSA_MEDTERM_AREA_TEACHING_OWNERS, area)
    ? HOSA_MEDTERM_AREA_TEACHING_OWNERS[area as MedTermAreaId]
    : undefined;
  if (!ownerId) return { area, kind: "no-lesson", message: HOSA_MEDTERM_NO_LESSON_MESSAGE };
  const lesson = publishedCourseLesson(ownerId);
  if (!lesson) return null;
  const focus = moduleFocus(lesson.entry.moduleId);
  if (!focus?.areas || !focus.areas.includes(area as MedTermAreaId)) return null;
  const back = hosaLessonPracticeLink(ownerId);
  if (!back || back.href !== medTermFocusHref(focus.id)) return null;
  if (!(HOSA_MEDTERM_TAUGHT_AREAS as readonly string[]).includes(area)) return null;
  let action = `Study ${label.toLowerCase()} in the lesson “${lesson.title}”`;
  if (focus.areas.length === 1) {
    const owningModule = getEducationModule(lesson.entry.moduleId);
    if (!owningModule?.label.trim() || !startsItsModule(lesson.entry)) return null;
    action = `Study ${label.toLowerCase()} in the ${owningModule.label.trim()} lessons, starting with “${lesson.title}”`;
  }
  return {
    area,
    kind: "lesson",
    lessonId: ownerId,
    lessonTitle: lesson.title,
    href: `/lessons/${ownerId}?track=hosa`,
    label: action
  };
}
