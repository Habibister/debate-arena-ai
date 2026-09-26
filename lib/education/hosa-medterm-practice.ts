// HOSA Medical Terminology — where the word-part course hands a learner to practice.
//
// THE GAP THIS CLOSES. The Medical Terminology practice room (/training/hosa/practice) drills 180
// original questions, and before this course no lesson taught any of them. Now four lessons teach the
// word-part half, and a concept lesson whose chain ends renders "You've reached the end of this course
// so far" and nothing else. This module names the one honest onward step: the event's own practice
// room, opened with the word parts the course taught already selected, where most word-root, prefix
// and suffix questions use what the course taught.
//
// THE SAME SEAM THE DECA ROLE-PLAY COURSE USES (lib/education/deca-simulation-prep.ts). It is a
// course-end action, not a `practiceDrill`: the practice room keeps HOSA's own review-only evidence
// model, and no lesson here claims to be where a record starts. The copy therefore makes no claim
// about what the room saves either way. It says only what is true of the questions.
//
// DERIVED FROM THE CHAIN, not hardcoded to one lesson id. It answers only for a learner-visible
// lesson of this course whose chain actually terminates, so when the course grows the action moves to
// the new last lesson on its own.
//
// PRACTICE FEEDBACK -> LESSON -> PRACTICE. The practice room's results name the areas a learner
// missed questions in. For a word-part area this module names the ONE published lesson that teaches
// it and the room links there; each of those lessons links back to word-part practice. The areas no
// lesson teaches (anatomy, physiology, pathophysiology) get a plain statement that no lesson exists
// yet, never a nearby lesson. Every link in that chain is checked here, and a broken one yields no
// action at all rather than a guess.
//
// Pure: no React, no Prisma, no network, no filesystem, no environment, no browser API.

import { HOSA_MEDTERM_TAUGHT_AREAS, medTermFocus, medTermFocusHref } from "@/lib/hosa-medterm-focus";
import { getEducationLesson } from "@/lib/education/registry";
import { isConceptEducationLessonEntry } from "@/lib/education/types";

/** The course whose chain ends in the Medical Terminology practice room. */
export const HOSA_MEDTERM_STUDY_COURSE = "hosa-medterm-study";

/**
 * The onward step, stated as what the questions are, never what the room records. "Not official HOSA
 * test items" is the bank's own provenance (lib/hosa-medterm.ts: original, hand-authored items).
 *
 * THE LINK PRESELECTS THE TAUGHT MATERIAL. It opens the practice room with the "word parts from the
 * course" choice already selected (lib/hosa-medterm-focus.ts), so a learner who has just
 * finished four word-part lessons lands on practice for what those lessons taught, can see the choice
 * and change it, and starts nothing until they press start. The copy then says what no lesson has
 * taught yet, so nothing there is a surprise: about a fifth of the word-part questions use parts the
 * course does not cover (for example -centesis, retro-, pseudo-), and the anatomy, physiology and
 * disease questions, which the room's other choice adds, are not taught at all.
 */
export const HOSA_MEDTERM_PRACTICE_ENTRY = Object.freeze({
  href: medTermFocusHref("word-parts"),
  label: "Practise the word parts from this course",
  detail:
    `The Medical Terminology practice uses original questions, not official HOSA test items. This link opens it with the word parts from this course already selected. Most of its word-root, prefix and suffix questions use what this course teaches, and some use word parts it has not taught yet. Switching there to "${medTermFocus("all").label}" adds questions on anatomy, physiology and disease, which these lessons do not cover yet. Every answer is explained.`
});

export function hosaCourseEndAction(lessonId: string): typeof HOSA_MEDTERM_PRACTICE_ENTRY | null {
  const entry = getEducationLesson(lessonId);
  if (!entry || entry.visibility !== "learner") return null;
  if (entry.track !== "HOSA" || entry.courseId !== HOSA_MEDTERM_STUDY_COURSE) return null;
  if (entry.nextLessonId !== null) return null; // not the end of the chain
  return HOSA_MEDTERM_PRACTICE_ENTRY;
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
 * The published lesson that TEACHES each Medical Terminology practice area.
 *
 * Declared by hand, one area at a time, from what each lesson actually teaches (its title, objective
 * and teaching sections): Word Roots teaches word roots, Suffixes teaches suffixes, Prefixes teaches
 * prefixes. `scripts/hosa-medterm-remediation-smoke.ts` re-derives it from the lessons' text against
 * the part every bank question tests, so a wrong pairing fails there.
 *
 * DELIBERATELY ABSENT: anatomy, physiology and pathophysiology. No lesson teaches them yet, so they
 * have no owner, and the practice results say so instead of pointing at a word-part lesson. The
 * course's first lesson, "How Medical Words Are Built", names examples of all three part kinds but
 * owns none of them, so it is not an owner either.
 */
export const HOSA_MEDTERM_AREA_TEACHING_OWNERS: Readonly<Partial<Record<MedTermAreaId, string>>> = Object.freeze({
  "word-roots": "hosa-medical-word-roots",
  prefixes: "hosa-medical-prefixes",
  suffixes: "hosa-medical-suffixes"
});

/** What the practice results say for an area that no published lesson teaches. */
export const HOSA_MEDTERM_NO_LESSON_MESSAGE = "CompeteReady does not have a lesson for this area yet.";

/** A published, learner-visible lesson of this course, or null. The shared "may I link here" rule. */
function publishedCourseLesson(lessonId: string) {
  const entry = getEducationLesson(lessonId);
  if (!entry || entry.visibility !== "learner") return null;
  if (entry.track !== "HOSA" || entry.courseId !== HOSA_MEDTERM_STUDY_COURSE) return null;
  if (!isConceptEducationLessonEntry(entry)) return null;
  const title = entry.source.lesson.title.trim();
  return title ? { entry, title } : null;
}

/**
 * The way back to practice from a lesson that teaches a practice area and is NOT the course's last.
 *
 * The last lesson already ends in the course-end action above, which opens the same practice, so it
 * gets no second link. The copy says what the practice mixes: these lessons come before the end of
 * the course, so the word-part practice also asks about parts a later lesson teaches.
 */
export const HOSA_MEDTERM_PRACTICE_RETURN = Object.freeze({
  href: medTermFocusHref("word-parts"),
  label: "Practise the word parts from this course",
  detail:
    "This opens Medical Terminology practice with the word parts from this course already selected. It mixes word-root, suffix and prefix questions, so it also asks about parts a later lesson in this course teaches, and some parts no lesson teaches yet. Every answer is explained, and nothing starts until you press start."
});

export function hosaLessonPracticeReturn(lessonId: string): typeof HOSA_MEDTERM_PRACTICE_RETURN | null {
  const lesson = publishedCourseLesson(lessonId);
  if (!lesson) return null;
  if (lesson.entry.nextLessonId === null) return null; // the course-end action covers the last lesson
  // The copy says a later lesson teaches the other parts, so that later lesson must really be there.
  if (!publishedCourseLesson(lesson.entry.nextLessonId)) return null;
  if (!Object.values(HOSA_MEDTERM_AREA_TEACHING_OWNERS).includes(lessonId)) return null; // owns no practice area
  return HOSA_MEDTERM_PRACTICE_RETURN;
}

/** The link a lesson offers back to word-part practice, whichever of the two seams provides it. */
export function hosaLessonPracticeLink(lessonId: string): { href: string; label: string; detail: string } | null {
  return hosaCourseEndAction(lessonId) ?? hosaLessonPracticeReturn(lessonId);
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
 *   -> that lesson links back to word-part practice
 *   -> and word-part practice includes this area.
 * An area with no declared owner gets the no-lesson statement. An owner that fails any later check
 * gets null: the lesson exists on paper but cannot be linked, and saying "no lesson yet" would be
 * false, so the results show the weak area alone.
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
  const back = hosaLessonPracticeLink(ownerId);
  if (!back || back.href !== medTermFocusHref("word-parts")) return null;
  if (!(HOSA_MEDTERM_TAUGHT_AREAS as readonly string[]).includes(area)) return null;
  return {
    area,
    kind: "lesson",
    lessonId: ownerId,
    lessonTitle: lesson.title,
    href: `/lessons/${ownerId}?track=hosa`,
    label: `Study ${label.toLowerCase()} in the lesson “${lesson.title}”`
  };
}

