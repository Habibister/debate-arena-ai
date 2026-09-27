// HOSA — authored concept lessons: Medical Terminology word parts, anatomy, physiology and
// pathophysiology (Branch A).
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
// word parts are the foundation every other Medical Terminology topic is read through. The anatomy
// module comes second: it teaches the room's anatomy questions, and its structure names are read
// through those word parts. The physiology module comes third: it teaches the room's physiology
// questions, how the healthy body works, on top of the structures the anatomy lessons named. The
// pathophysiology module comes fourth and last: it teaches the room's disease questions, how that
// normal function changes, reasoning from the anatomy and physiology before it.
//
// WHAT IT DELIBERATELY DOES NOT CLAIM. No entry carries a `skillSlug` or a `practiceDrill`. The
// practice room's evidence model is HOSA's own review-only ladder, not a drill area this registry can
// name, and the lessons' checks save nothing. The course's links to that room are course-end and
// module-end actions (lib/education/hosa-medterm-practice.ts), the same seam the DECA role-play
// course uses, so a lesson here never presents itself as the place a record starts.
//
// TWO HOSA CATALOG ENTRIES STAY HELD and are deliberately absent below:
//
//   hosa-patient-communication  held pending the M4 clinical/legal review gate
//                               (docs/M14_LEARNING_QUALITY_AUDIT.md), which covers its subject.
//   hosa-healthcare-ethics      not audited or rewritten by this change. It teaches no Medical
//                               Terminology, so it has no place in this course, and it stays held
//                               until it has had the same review these lessons will need.
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
 * be labeled as such. The lesson header renders `sourceLabel` verbatim, so it says both facts. It also
 * says the lessons are not official HOSA material, in the same words as the anatomy, physiology and
 * pathophysiology labels (added in the 2026-09-27 end-to-end QA): word parts are half of the practice
 * bank, so a learner could mistake these lessons for HOSA material just as easily. After a human
 * content review, or an explicit owner waiver, is recorded there, the label can change to the plain
 * "CompeteReady authored lesson" form the reviewed DECA and Debate lessons use.
 *
 * DECIDED 2026-09-27 for all four HOSA labels in this file: HUMAN SUBJECT-ACCURACY REVIEW: WAIVED BY
 * OWNER, after an AI-assisted owner review. A waiver is not a review and no person reviewed the
 * lessons, so every HOSA label stays as it is: AI-generated, not official HOSA material, not yet
 * reviewed by a person. Only a real human subject-accuracy review, recorded in the authoring record,
 * would let a label change.
 */
export const STABLE_TEACHING_HOSA_PROVENANCE: SourceFreshnessMetadata = Object.freeze({
  authority: "stable-teaching",
  freshness: "stable",
  organization: "CompeteReady",
  sourceLabel: "AI-generated CompeteReady lesson, not an official HOSA lesson or test item — not yet reviewed by a person"
});

/**
 * Provenance for the anatomy module: the same tier and the same honesty about who wrote it, with the
 * label also saying outright that this is not official HOSA material. The anatomy lessons teach the
 * subject matter of questions a HOSA test could ask, so a learner could otherwise mistake them for a
 * HOSA lesson or HOSA test items. The header renders this label verbatim.
 *
 * Like the word-part label, it changes only after a human subject-accuracy review, or an explicit
 * owner waiver, is recorded in the authoring record in lib/learning-content.ts. The owner waived the
 * review on 2026-09-27; a waiver is not a review, so this label stays (see the word-part label above).
 */
export const STABLE_TEACHING_HOSA_ANATOMY_PROVENANCE: SourceFreshnessMetadata = Object.freeze({
  authority: "stable-teaching",
  freshness: "stable",
  organization: "CompeteReady",
  sourceLabel: "AI-generated CompeteReady lesson, not an official HOSA lesson or test item — not yet reviewed by a person"
});

/**
 * Provenance for the physiology module: the same tier, the same label and the same gate as anatomy.
 * These lessons teach normal body function to the depth of the practice bank's physiology questions,
 * so the label says they are AI-generated, not official HOSA material, and not yet reviewed by a
 * person. A separate constant keeps the physiology module's review status independent: when a
 * qualified human subject-accuracy review is recorded for these lessons in the authoring record in
 * lib/learning-content.ts (the owner's 2026-09-27 plan: one such review of the whole Medical
 * Terminology curriculum before the stack is pushed), only this label changes. That plan was
 * superseded the same day: the owner waived the review, and a waiver is not a review, so this label
 * stays (see the word-part label above).
 */
export const STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE: SourceFreshnessMetadata = Object.freeze({
  authority: "stable-teaching",
  freshness: "stable",
  organization: "CompeteReady",
  sourceLabel: "AI-generated CompeteReady lesson, not an official HOSA lesson or test item — not yet reviewed by a person"
});

/**
 * Provenance for the pathophysiology module: the same tier, the same label and the same gate as
 * anatomy and physiology. These lessons teach what common disease terms mean and the basic mechanism
 * the practice bank's pathophysiology questions need, never diagnosis or treatment, so the label says
 * they are AI-generated, not official HOSA material, and not yet reviewed by a person. A separate
 * constant keeps this module's review status independent: when the qualified human subject-accuracy
 * review of the whole Medical Terminology curriculum (the owner's 2026-09-27 plan) is recorded for
 * these lessons in the authoring record in lib/learning-content.ts, only this label changes. That plan
 * was superseded the same day: the owner waived the review, and a waiver is not a review, so this
 * label stays (see the word-part label above).
 */
export const STABLE_TEACHING_HOSA_PATHOPHYSIOLOGY_PROVENANCE: SourceFreshnessMetadata = Object.freeze({
  authority: "stable-teaching",
  freshness: "stable",
  organization: "CompeteReady",
  sourceLabel: "AI-generated CompeteReady lesson, not an official HOSA lesson or test item — not yet reviewed by a person"
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
  "hosa-medical-prefixes",
  "hosa-anatomy-body-map",
  "hosa-anatomy-heart-and-lungs",
  "hosa-anatomy-digestive-and-urinary",
  "hosa-anatomy-bones-muscles-nerves-skin",
  "hosa-physiology-staying-in-balance",
  "hosa-physiology-heart-and-blood",
  "hosa-physiology-breathing-and-digestion",
  "hosa-physiology-nerves-and-muscles",
  "hosa-pathophysiology-how-tissue-changes",
  "hosa-pathophysiology-blood-flow-and-oxygen",
  "hosa-pathophysiology-heart-and-pressure",
  "hosa-pathophysiology-defences",
  "hosa-pathophysiology-breathing-kidneys-glucose"
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
const anatomyBodyMap = selectHosaCatalogLesson("hosa-anatomy-body-map");
const anatomyHeartAndLungs = selectHosaCatalogLesson("hosa-anatomy-heart-and-lungs");
const anatomyDigestiveAndUrinary = selectHosaCatalogLesson("hosa-anatomy-digestive-and-urinary");
const anatomyBonesMusclesNervesSkin = selectHosaCatalogLesson("hosa-anatomy-bones-muscles-nerves-skin");
const physiologyStayingInBalance = selectHosaCatalogLesson("hosa-physiology-staying-in-balance");
const physiologyHeartAndBlood = selectHosaCatalogLesson("hosa-physiology-heart-and-blood");
const physiologyBreathingAndDigestion = selectHosaCatalogLesson("hosa-physiology-breathing-and-digestion");
const physiologyNervesAndMuscles = selectHosaCatalogLesson("hosa-physiology-nerves-and-muscles");
const pathophysiologyHowTissueChanges = selectHosaCatalogLesson("hosa-pathophysiology-how-tissue-changes");
const pathophysiologyBloodFlowAndOxygen = selectHosaCatalogLesson("hosa-pathophysiology-blood-flow-and-oxygen");
const pathophysiologyHeartAndPressure = selectHosaCatalogLesson("hosa-pathophysiology-heart-and-pressure");
const pathophysiologyDefences = selectHosaCatalogLesson("hosa-pathophysiology-defences");
const pathophysiologyBreathingKidneysGlucose = selectHosaCatalogLesson("hosa-pathophysiology-breathing-kidneys-glucose");

/** Exported for the smoke suite's strict-identity proof against the catalog. */
export const PUBLISHED_HOSA_SOURCES = {
  medicalTerminologyBasics, medicalWordRoots, medicalSuffixes, medicalPrefixes,
  anatomyBodyMap, anatomyHeartAndLungs, anatomyDigestiveAndUrinary, anatomyBonesMusclesNervesSkin,
  physiologyStayingInBalance, physiologyHeartAndBlood, physiologyBreathingAndDigestion, physiologyNervesAndMuscles,
  pathophysiologyHowTissueChanges, pathophysiologyBloodFlowAndOxygen, pathophysiologyHeartAndPressure,
  pathophysiologyDefences, pathophysiologyBreathingKidneysGlucose
} as const;

/**
 * The course runs how a term is built -> roots -> suffixes -> prefixes. Structure comes first because
 * every later lesson leans on it: the combining vowel and "read the suffix first" are taught once,
 * there. Roots come next because they say what a term is about; suffixes before prefixes because the
 * suffix is where a term's meaning starts, and the prefix lesson closes by putting all three together.
 *
 * The anatomy module follows the prefixes lesson (below), so the word-part module ends at prefixes
 * and the course continues. Each module's last lesson links to the practice room with that module's
 * areas preselected (lib/education/hosa-medterm-practice.ts).
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
  nextLessonId: "hosa-anatomy-body-map",
  provenance: STABLE_TEACHING_HOSA_PROVENANCE
};

/**
 * The anatomy module, in the order a beginner needs it: the body map first (direction terms, planes
 * and cavities), because every later lesson places structures with it; then the heart and lungs, the
 * digestive and urinary tracts, and bones, muscles, nerves and skin. The four were derived from a
 * census of the practice bank's 30 anatomy questions, and each lesson owns the questions that census
 * assigned to it (scripts/hosa-medterm-anatomy-smoke.ts).
 *
 * The last anatomy lesson leads on to the physiology module (below), so the anatomy module ends at
 * bones, muscles, nerves and skin, and that lesson's module-end action hands the learner to anatomy
 * practice from there.
 */
export const HOSA_ANATOMY_BODY_MAP_LESSON: EducationRegistryEntry = {
  id: "hosa-anatomy-body-map",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-anatomy",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: anatomyBodyMap,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "hosa-anatomy-heart-and-lungs",
  provenance: STABLE_TEACHING_HOSA_ANATOMY_PROVENANCE
};

export const HOSA_ANATOMY_HEART_AND_LUNGS_LESSON: EducationRegistryEntry = {
  id: "hosa-anatomy-heart-and-lungs",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-anatomy",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: anatomyHeartAndLungs,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "hosa-anatomy-digestive-and-urinary",
  provenance: STABLE_TEACHING_HOSA_ANATOMY_PROVENANCE
};

export const HOSA_ANATOMY_DIGESTIVE_AND_URINARY_LESSON: EducationRegistryEntry = {
  id: "hosa-anatomy-digestive-and-urinary",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-anatomy",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: anatomyDigestiveAndUrinary,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "hosa-anatomy-bones-muscles-nerves-skin",
  provenance: STABLE_TEACHING_HOSA_ANATOMY_PROVENANCE
};

export const HOSA_ANATOMY_BONES_MUSCLES_NERVES_SKIN_LESSON: EducationRegistryEntry = {
  id: "hosa-anatomy-bones-muscles-nerves-skin",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-anatomy",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: anatomyBonesMusclesNervesSkin,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "hosa-physiology-staying-in-balance",
  provenance: STABLE_TEACHING_HOSA_ANATOMY_PROVENANCE
};

/**
 * The physiology module, in the order a beginner needs it: balance first (homeostasis, negative
 * feedback, hormones and the kidneys), because the later lessons lean on feedback and on hormones as
 * messengers; then the heart and blood, breathing and digestion, and nerves and muscles, which closes
 * by comparing nerve signals with hormones. The four were derived from a census of the practice
 * bank's 30 physiology questions, and each lesson owns the questions that census assigned to it
 * (scripts/hosa-medterm-physiology-smoke.ts).
 *
 * The last physiology lesson leads on to the pathophysiology module (below), so the physiology
 * module ends at nerves and muscles, and that lesson's module-end action hands the learner to
 * physiology practice from there.
 */
export const HOSA_PHYSIOLOGY_STAYING_IN_BALANCE_LESSON: EducationRegistryEntry = {
  id: "hosa-physiology-staying-in-balance",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-physiology",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: physiologyStayingInBalance,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "hosa-physiology-heart-and-blood",
  provenance: STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE
};

export const HOSA_PHYSIOLOGY_HEART_AND_BLOOD_LESSON: EducationRegistryEntry = {
  id: "hosa-physiology-heart-and-blood",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-physiology",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: physiologyHeartAndBlood,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "hosa-physiology-breathing-and-digestion",
  provenance: STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE
};

export const HOSA_PHYSIOLOGY_BREATHING_AND_DIGESTION_LESSON: EducationRegistryEntry = {
  id: "hosa-physiology-breathing-and-digestion",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-physiology",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: physiologyBreathingAndDigestion,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "hosa-physiology-nerves-and-muscles",
  provenance: STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE
};

export const HOSA_PHYSIOLOGY_NERVES_AND_MUSCLES_LESSON: EducationRegistryEntry = {
  id: "hosa-physiology-nerves-and-muscles",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-physiology",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: physiologyNervesAndMuscles,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "hosa-pathophysiology-how-tissue-changes",
  provenance: STABLE_TEACHING_HOSA_PHYSIOLOGY_PROVENANCE
};

/**
 * The pathophysiology module, the course's fourth and last planned module, in the order a beginner
 * needs it: the general words first (acute and chronic, cells that shrink, grow or die, benign and
 * malignant tumors), because the later lessons lean on necrosis and hypertrophy; then blood flow and
 * oxygen, the heart, pressure and fluid, the body's defences, and breathing, the kidneys and blood
 * glucose. The five were derived from a census of the practice bank's 30 pathophysiology questions,
 * and each lesson owns the questions that census assigned to it
 * (scripts/hosa-medterm-pathophysiology-smoke.ts).
 *
 * `nextLessonId` on the last lesson is null: it is the end of the course, and the course-end action
 * hands the learner to pathophysiology practice from there. The end of this course is not the end of
 * HOSA: it covers the Medical Terminology practice bank, not every HOSA event or healthcare topic.
 */
export const HOSA_PATHOPHYSIOLOGY_HOW_TISSUE_CHANGES_LESSON: EducationRegistryEntry = {
  id: "hosa-pathophysiology-how-tissue-changes",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-pathophysiology",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: pathophysiologyHowTissueChanges,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "hosa-pathophysiology-blood-flow-and-oxygen",
  provenance: STABLE_TEACHING_HOSA_PATHOPHYSIOLOGY_PROVENANCE
};

export const HOSA_PATHOPHYSIOLOGY_BLOOD_FLOW_AND_OXYGEN_LESSON: EducationRegistryEntry = {
  id: "hosa-pathophysiology-blood-flow-and-oxygen",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-pathophysiology",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: pathophysiologyBloodFlowAndOxygen,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "hosa-pathophysiology-heart-and-pressure",
  provenance: STABLE_TEACHING_HOSA_PATHOPHYSIOLOGY_PROVENANCE
};

export const HOSA_PATHOPHYSIOLOGY_HEART_AND_PRESSURE_LESSON: EducationRegistryEntry = {
  id: "hosa-pathophysiology-heart-and-pressure",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-pathophysiology",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: pathophysiologyHeartAndPressure,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "hosa-pathophysiology-defences",
  provenance: STABLE_TEACHING_HOSA_PATHOPHYSIOLOGY_PROVENANCE
};

export const HOSA_PATHOPHYSIOLOGY_DEFENCES_LESSON: EducationRegistryEntry = {
  id: "hosa-pathophysiology-defences",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-pathophysiology",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: pathophysiologyDefences,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "hosa-pathophysiology-breathing-kidneys-glucose",
  provenance: STABLE_TEACHING_HOSA_PATHOPHYSIOLOGY_PROVENANCE
};

export const HOSA_PATHOPHYSIOLOGY_BREATHING_KIDNEYS_GLUCOSE_LESSON: EducationRegistryEntry = {
  id: "hosa-pathophysiology-breathing-kidneys-glucose",
  track: "HOSA",
  courseId: "hosa-medterm-study",
  moduleId: "hosa-medterm-pathophysiology",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: pathophysiologyBreathingKidneysGlucose,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: null,
  provenance: STABLE_TEACHING_HOSA_PATHOPHYSIOLOGY_PROVENANCE
};

export const HOSA_PUBLISHED_LESSONS: readonly EducationRegistryEntry[] = [
  HOSA_MEDTERM_BASICS_LESSON,
  HOSA_MEDTERM_WORD_ROOTS_LESSON,
  HOSA_MEDTERM_SUFFIXES_LESSON,
  HOSA_MEDTERM_PREFIXES_LESSON,
  HOSA_ANATOMY_BODY_MAP_LESSON,
  HOSA_ANATOMY_HEART_AND_LUNGS_LESSON,
  HOSA_ANATOMY_DIGESTIVE_AND_URINARY_LESSON,
  HOSA_ANATOMY_BONES_MUSCLES_NERVES_SKIN_LESSON,
  HOSA_PHYSIOLOGY_STAYING_IN_BALANCE_LESSON,
  HOSA_PHYSIOLOGY_HEART_AND_BLOOD_LESSON,
  HOSA_PHYSIOLOGY_BREATHING_AND_DIGESTION_LESSON,
  HOSA_PHYSIOLOGY_NERVES_AND_MUSCLES_LESSON,
  HOSA_PATHOPHYSIOLOGY_HOW_TISSUE_CHANGES_LESSON,
  HOSA_PATHOPHYSIOLOGY_BLOOD_FLOW_AND_OXYGEN_LESSON,
  HOSA_PATHOPHYSIOLOGY_HEART_AND_PRESSURE_LESSON,
  HOSA_PATHOPHYSIOLOGY_DEFENCES_LESSON,
  HOSA_PATHOPHYSIOLOGY_BREATHING_KIDNEYS_GLUCOSE_LESSON
];
