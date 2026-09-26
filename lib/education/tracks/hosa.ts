// HOSA — authored concept lessons: Medical Terminology word parts (Branch A).
//
// Registered the same way the Debate and DECA concept lessons are: this file imports
// `LEARNING_SKILL_CATALOG`, selects entries by slug, and hands the ORIGINAL objects to the canonical
// registry BY REFERENCE. It copies no learner-facing sentence, so
// `entry.source === LEARNING_SKILL_CATALOG.find(...)` is strictly true and each sentence lives in
// exactly one place. `lib/learning-content.ts` owns the text.
//
// WHY THIS COURSE, AND WHY FIRST. Medical Terminology is the one HOSA event CompeteReady has a
// verified specification and a practice room for (lib/hosa-events.ts, /training/hosa/practice). That
// room drills 180 original questions, half of them on word roots, prefixes and suffixes, and until
// now no lesson taught any of it: a HOSA beginner met the questions before the teaching. The approved
// curriculum's Branch A (docs/curriculum/03-hosa-course.md §3A) covers knowledge-test events, and
// word parts are the foundation every other Medical Terminology topic is read through.
//
// WHAT IT DELIBERATELY DOES NOT CLAIM. No entry carries a `skillSlug` or a `practiceDrill`. The
// practice room's evidence model is HOSA's own review-only ladder, not a drill area this registry can
// name, and the lessons' checks save nothing. The course's link to that room is a course-end action
// (lib/education/hosa-medterm-practice.ts), the same seam the DECA role-play course uses, so a lesson
// here never presents itself as the place a record starts.
//
// TWO HOSA CATALOG ENTRIES STAY HELD and are deliberately absent below:
//
//   hosa-patient-communication  held pending the M4 clinical/legal review gate
//                               (docs/M14_LEARNING_QUALITY_AUDIT.md), which covers its subject.
//   hosa-healthcare-ethics      not audited or rewritten by this change. It teaches no Medical
//                               Terminology, so it has no place in this course, and it stays held
//                               until it has had the same review these four lessons will need.
//
// Pure: no React, no Prisma, no network, no filesystem, no environment, no browser API.

import { LEARNING_SKILL_CATALOG } from "@/lib/learning-content";
import type { SourceFreshnessMetadata } from "@/lib/source-freshness";
import type { ConceptEducationLessonSource, EducationRegistryEntry } from "@/lib/education/types";

/**
 * Provenance for CompeteReady-authored HOSA word-part teaching.
 *
 * `stable-teaching` / CompeteReady, exactly like the DECA business-content section: the meanings of
 * standard medical prefixes, roots and suffixes are durable teaching content, not tied to a season,
 * and the curriculum defines this tier as "never a rules source". The lessons state no HOSA rule,
 * test format, timing, weighting or score, so `official` would be a false claim.
 *
 * THE LABEL SAYS WHO WROTE THEM. The four lessons were AI-drafted and no person has reviewed them yet
 * (the authoring record in lib/learning-content.ts), and CLAUDE.md requires AI-generated material to
 * be labeled as such. The lesson header renders `sourceLabel` verbatim, so it says both facts. After a
 * human content review, or an explicit owner waiver, is recorded there, the label can change to the
 * plain "CompeteReady authored lesson" form the reviewed DECA and Debate lessons use.
 */
export const STABLE_TEACHING_HOSA_PROVENANCE: SourceFreshnessMetadata = Object.freeze({
  authority: "stable-teaching",
  freshness: "stable",
  organization: "CompeteReady",
  sourceLabel: "AI-generated CompeteReady lesson — not yet reviewed by a person"
});

/**
 * The HOSA catalog slugs this file publishes, in teaching order.
 *
 * Exported so a suite can prove that this list and `HELD_HOSA_CATALOG_SLUGS` PARTITION the HOSA
 * catalog: every authored HOSA entry is in exactly one of them.
 */
export const PUBLISHED_HOSA_SLUGS = [
  "hosa-medical-terminology-basics",
  "hosa-medical-word-roots",
  "hosa-medical-suffixes",
  "hosa-medical-prefixes"
] as const;

/** The HOSA catalog entries that exist but are NOT learner-visible. Exported so a suite can prove it. */
export const HELD_HOSA_CATALOG_SLUGS: readonly string[] = [
  "hosa-patient-communication",
  "hosa-healthcare-ethics"
];

type PublishedHosaSlug = (typeof PUBLISHED_HOSA_SLUGS)[number];

/**
 * Selects one catalog entry by slug and returns THE ORIGINAL OBJECT.
 *
 * Fails loudly rather than degrading, exactly like the Debate and DECA selectors: a missing entry, a
 * duplicated slug, a foreign track, or a structurally incomplete lesson must stop the registry from
 * loading at all. A partial lesson would put an empty section in front of a learner.
 */
function selectHosaCatalogLesson(slug: PublishedHosaSlug): ConceptEducationLessonSource {
  const matches = LEARNING_SKILL_CATALOG.filter((entry) => entry.slug === slug);
  if (matches.length === 0) {
    throw new Error(`HOSA education: no LEARNING_SKILL_CATALOG entry has slug "${slug}"`);
  }
  if (matches.length > 1) {
    throw new Error(`HOSA education: slug "${slug}" appears ${matches.length} times in LEARNING_SKILL_CATALOG`);
  }
  const entry = matches[0];
  if (entry.organization !== "HOSA" || entry.track !== "HOSA") {
    throw new Error(`HOSA education: "${slug}" is ${entry.organization}/${entry.track}, not HOSA`);
  }
  const content = entry.lesson.content;
  const missing: string[] = [];
  if (!entry.lesson.title.trim()) missing.push("lesson.title");
  if (!content.objective.trim()) missing.push("objective");
  if (!content.explanation.trim()) missing.push("explanation");
  if (!content.whyMatters.trim()) missing.push("whyMatters");
  if (content.steps.length === 0) missing.push("steps");
  if (!content.workedExample.prompt.trim()) missing.push("workedExample.prompt");
  if (!content.workedExample.weakAnswer.trim()) missing.push("workedExample.weakAnswer");
  if (!content.workedExample.strongAnswer.trim()) missing.push("workedExample.strongAnswer");
  if (!content.workedExample.whyItWorks.trim()) missing.push("workedExample.whyItWorks");
  if (content.practiceQuestions.length === 0) missing.push("practiceQuestions");
  if (content.masteryCheck.length === 0) missing.push("masteryCheck");
  if (missing.length > 0) {
    throw new Error(`HOSA education: "${slug}" is missing ${missing.join(", ")}`);
  }
  // The ORIGINAL object. No spread, no Object.assign, no clone, no reconstruction.
  return entry;
}

const medicalTerminologyBasics = selectHosaCatalogLesson("hosa-medical-terminology-basics");
const medicalWordRoots = selectHosaCatalogLesson("hosa-medical-word-roots");
const medicalSuffixes = selectHosaCatalogLesson("hosa-medical-suffixes");
const medicalPrefixes = selectHosaCatalogLesson("hosa-medical-prefixes");

/** Exported for the smoke suite's strict-identity proof against the catalog. */
export const PUBLISHED_HOSA_SOURCES = {
  medicalTerminologyBasics, medicalWordRoots, medicalSuffixes, medicalPrefixes
} as const;

/**
 * The course runs how a term is built -> roots -> suffixes -> prefixes. Structure comes first because
 * every later lesson leans on it: the combining vowel and "read the suffix first" are taught once,
 * there. Roots come next because they say what a term is about; suffixes before prefixes because the
 * suffix is where a term's meaning starts, and the prefix lesson closes by putting all three together.
 *
 * `nextLessonId` on the last lesson is null: it is the end of the course written so far, and the
 * course-end action hands the learner to the event's practice room from there.
 */
export const HOSA_MEDTERM_BASICS_LESSON: EducationRegistryEntry = {
  id: "hosa-medical-terminology-basics",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-word-parts",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: medicalTerminologyBasics,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "hosa-medical-word-roots",
  provenance: STABLE_TEACHING_HOSA_PROVENANCE
};

export const HOSA_MEDTERM_WORD_ROOTS_LESSON: EducationRegistryEntry = {
  id: "hosa-medical-word-roots",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-word-parts",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: medicalWordRoots,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "hosa-medical-suffixes",
  provenance: STABLE_TEACHING_HOSA_PROVENANCE
};

export const HOSA_MEDTERM_SUFFIXES_LESSON: EducationRegistryEntry = {
  id: "hosa-medical-suffixes",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-word-parts",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: medicalSuffixes,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "hosa-medical-prefixes",
  provenance: STABLE_TEACHING_HOSA_PROVENANCE
};

export const HOSA_MEDTERM_PREFIXES_LESSON: EducationRegistryEntry = {
  id: "hosa-medical-prefixes",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-word-parts",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: medicalPrefixes,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: null,
  provenance: STABLE_TEACHING_HOSA_PROVENANCE
};

export const HOSA_PUBLISHED_LESSONS: readonly EducationRegistryEntry[] = [
  HOSA_MEDTERM_BASICS_LESSON,
  HOSA_MEDTERM_WORD_ROOTS_LESSON,
  HOSA_MEDTERM_SUFFIXES_LESSON,
  HOSA_MEDTERM_PREFIXES_LESSON
];
