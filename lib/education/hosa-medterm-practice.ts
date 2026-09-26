// HOSA Medical Terminology — where the word-part course hands a learner to practice.
//
// THE GAP THIS CLOSES. The Medical Terminology practice room (/training/hosa/practice) drills 180
// original questions, and before this course no lesson taught any of them. Now four lessons teach the
// word-part half, and a concept lesson whose chain ends renders "You've reached the end of this course
// so far" and nothing else. This module names the one honest onward step: the event's own practice
// room, where most word-root, prefix and suffix questions use what the course taught.
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
// Pure: no React, no Prisma, no network, no filesystem, no environment, no browser API.

import { getEducationLesson } from "@/lib/education/registry";

/** The course whose chain ends in the Medical Terminology practice room. */
export const HOSA_MEDTERM_STUDY_COURSE = "hosa-medterm-study";

/**
 * The onward step, stated as what the questions are, never what the room records. "Not official HOSA
 * test items" is the bank's own provenance (lib/hosa-medterm.ts: original, hand-authored items), and
 * the second sentence is there so a learner who finished four word-part lessons is not surprised by
 * what no lesson has taught yet: about a fifth of the word-part questions use parts the course does
 * not cover (for example -centesis, retro-, pseudo-), and the anatomy, physiology and disease
 * questions are not taught at all.
 */
export const HOSA_MEDTERM_PRACTICE_ENTRY = Object.freeze({
  href: "/training/hosa/practice",
  label: "Practice Medical Terminology questions",
  detail:
    "The Medical Terminology practice uses original questions, not official HOSA test items. Most of its word-root, prefix and suffix questions use what this course teaches, and some use word parts it has not taught yet; it also asks about anatomy, physiology and disease, which these lessons do not cover yet. Every answer is explained."
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
