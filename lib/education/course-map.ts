import { educationLessonsForTrack, getEducationLesson } from "@/lib/education/registry";
import { learnerVisibleLesson, type DiagnosisDestination } from "@/lib/education/diagnosis";

/**
 * The learner-visible course a lesson belongs to, in canonical order, straight from the registry.
 * (Owner QA Repair 3A.)
 *
 * The DECA orientation used to carry a hand-written course map that still said every other lesson
 * was "Coming soon" long after the role-play lessons it named had been published. Nothing hand-written
 * can stay true on its own, so the map is now DERIVED: the lessons the registry actually publishes in
 * the same course, resolved through the same fail-closed resolver the diagnosis and prep paths use.
 * A held or unregistered lesson never appears; an unknown next lesson yields null, never a guess.
 */
export type CourseMapEntry = DiagnosisDestination;

export type RoleplayCourseMap = {
  lessons: CourseMapEntry[];
  currentId: string;
  next: CourseMapEntry | null;
};

export function roleplayCourseMap(lessonId: string): RoleplayCourseMap | null {
  const entry = getEducationLesson(lessonId);
  if (!entry || entry.visibility !== "learner") return null;
  const lessons = educationLessonsForTrack(entry.track)
    .filter((sibling) => sibling.courseId === entry.courseId)
    .map((sibling) => learnerVisibleLesson(sibling.id))
    .filter((lesson): lesson is CourseMapEntry => lesson !== null);
  if (!lessons.some((lesson) => lesson.lessonId === entry.id)) return null;
  // The next step must belong to THIS course on THIS track, or there is no next step: a chain that
  // crossed courses would render "Continue to X" under a map that never lists X.
  const nextEntry = entry.nextLessonId ? getEducationLesson(entry.nextLessonId) : undefined;
  const nextInCourse = nextEntry && nextEntry.track === entry.track && nextEntry.courseId === entry.courseId;
  const next = nextInCourse ? learnerVisibleLesson(nextEntry.id) : null;
  return { lessons, currentId: entry.id, next };
}
