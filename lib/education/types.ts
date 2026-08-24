// Canonical education content model (M13E1A) — TYPES ONLY.
//
// This is the contract the future course system is built on. In E1A it describes the THREE lessons
// that already exist and nothing else: no lesson is authored, no lesson is migrated, and no learner
// sees anything that comes from here.
//
// Two deliberate shapes:
//
//   1. A registry entry is a METADATA WRAPPER. Its `source` property REFERENCES the original
//      exported lesson object from `lib/lessons.ts` or `lib/roleplay-lessons.ts`. No learner-facing
//      sentence is ever copied into this layer, so there is exactly one place any lesson's text
//      lives and this model can never drift from it.
//   2. Ordinary string ids, not branded types. Branded ids would force an unsafe cast at every
//      fixture and every future authoring site, which trades a real safety property for a cosmetic
//      one. Uniqueness and referential integrity are enforced deterministically in `validate.ts`
//      instead, where the failure is a named issue code rather than a compiler error nobody can act
//      on.
//
// Pure: no React, no Prisma, no network, no filesystem, no environment, no browser API.

import type { SourceFreshnessMetadata } from "@/lib/source-freshness";
import type { DrillArea } from "@/lib/debate-drills";


/**
 * The tracks the education system may address. Model UN is soft-removed (`RETIRED_TRACKS` in
 * `lib/training-tracks.ts`) and is deliberately absent, so a retired track cannot be given a course.
 */
export type EducationTrack = "GENERAL_DEBATE" | "DECA" | "HOSA";

export const EDUCATION_TRACKS: readonly EducationTrack[] = ["GENERAL_DEBATE", "DECA", "HOSA"] as const;

/**
 * How a lesson teaches.
 *
 * `concept` — the Claim/Warrant/Impact shape: explanation, worked contrast, drill-backed practice.
 * `performance` — the role-play shape: scenario, weak/strong transcript, authored rubric.
 *
 * `orientation` (Navigator / first-tournament / conference-literacy) is NOT declared here. No such
 * lesson exists yet, and a variant with no instance cannot be validated.
 */
export type EducationLessonVariant = "concept" | "performance";

/** `internal` content is registered but must never render. E1A registers nothing internal. */
export type EducationVisibility = "learner" | "internal";

/**
 * `temporarily-unavailable` is an editorial decision that the lesson data itself already records
 * (the HOSA `practiceStatus` discriminant). It is mirrored here so the registry can be validated
 * without reaching into a variant-specific shape.
 */
export type EducationPracticeState = "available" | "temporarily-unavailable" | "not-applicable";

/** The five fading rungs of the practice ladder (doc 04 §1.2). */
export type EducationRung = 1 | 2 | 3 | 4 | 5;

export type EducationCourse = {
  id: string;
  track: EducationTrack;
  /** Short internal label. Never learner-facing in E1A. */
  label: string;
  moduleIds: readonly string[];
  /**
   * The highest rung this course may ever reach. Present only where a documented exception caps it —
   * today that is the HOSA clinical-skill communication branch, whose Compete stage is deferred
   * pending advisor/judge validation with no hands-on simulation (doc 03 §3B, doc 04 §1.1).
   */
  maxRung?: EducationRung;
};

export type EducationModule = {
  id: string;
  courseId: string;
  track: EducationTrack;
  /** Short name for the module. Metadata, not teaching text. */
  label: string;
  /** One observable outcome. Internal metadata — not teaching text. */
  outcome: string;
  prerequisiteId: string | null;
};

export type EducationSourceKind = "authored-lesson" | "roleplay-lesson" | "concept-education-lesson";

// --- concept-education-lesson source --------------------------------------------------------------
//
// The STRUCTURAL shape of an entry already present in `LEARNING_SKILL_CATALOG`. It is written to
// describe those objects exactly — nothing is added for a future that has not arrived, and nothing
// the four selected entries do not carry appears here.
//
// A registry entry holds the ORIGINAL catalog object by reference; this type only lets the renderer
// read it without a cast. No learner-facing string is ever copied out of it.

/** One deterministic multiple-choice item. Every field below exists on every selected question. */
export type ConceptEducationQuestion = {
  prompt: string;
  choices: readonly string[];
  /** Exactly one stored answer, which the validator requires to appear among `choices`. */
  correctAnswer: string;
  hint: string;
  explanation: string;
  skillTag: string;
};

export type ConceptEducationWorkedExample = {
  prompt: string;
  weakAnswer: string;
  strongAnswer: string;
  whyItWorks: string;
};

export type ConceptEducationLessonContent = {
  objective: string;
  explanation: string;
  whyMatters: string;
  steps: readonly string[];
  workedExample: ConceptEducationWorkedExample;
  guidedQuestion: ConceptEducationQuestion;
  practiceQuestions: readonly ConceptEducationQuestion[];
  /**
   * The catalog's own field name, preserved for source compatibility. It is NOT proof of mastery and
   * the renderer must never present it as one — it is shown to the learner as a final check.
   */
  masteryCheck: readonly ConceptEducationQuestion[];
};

export type ConceptEducationLessonSource = {
  /** The catalog skill slug. The validator requires it to equal the registry entry's id. */
  slug: string;
  organization: string;
  track: string;
  name: string;
  description: string;
  category: string;
  lesson: {
    title: string;
    slug: string;
    summary: string;
    estimatedMinutes: number;
    content: ConceptEducationLessonContent;
  };
};

/**
 * A lesson's exact drill destination. `track` is the drill surface's own track slug and `area` is the
 * CANONICAL `DrillArea` from the drill module — imported as a type, so there is one compile-time
 * definition of a valid area and this layer cannot drift from the bank. Renaming or removing an area
 * now breaks the build here rather than silently leaving a dead deep link that falls back to "mixed".
 * `import type` is erased at compile time, so no runtime dependency on the drill bank is created.
 */
export type EducationPracticeDrill = {
  track: "debate";
  area: DrillArea;
};

/** Everything an entry carries regardless of which source shape it wraps. */
type EducationRegistryEntryBase = {
  /** The lesson's canonical id. Deliberately the slug the route already serves. */
  id: string;
  track: EducationTrack;
  courseId: string;
  moduleId: string;
  variant: EducationLessonVariant;
  visibility: EducationVisibility;
  practiceState: EducationPracticeState;
  /**
   * The seeded mastery skill this lesson is ABOUT. Association only — it does not authorise a write.
   * A migrated concept lesson names one so recommendations can find it later, and still writes
   * nothing, because its checks are not the graded drill bank.
   */
  skillSlug?: string;
  /** Previously published ids that must keep resolving. Empty today — nothing has been renamed. */
  legacySlugs: readonly string[];
  nextLessonId: string | null;
  /** REFERENCE to the source object's own provenance, or the shared authored-lesson constant. */
  provenance: SourceFreshnessMetadata;
  /** Caps this lesson's practice rung. Must not exceed its course's `maxRung`. */
  maximumRung?: EducationRung;
  /**
   * M15 Learning Architecture Slice 1 — the EXACT evidence-producing drill that measures what this
   * lesson teaches, so the learner is handed the right practice instead of a drill front door.
   *
   * Present only where a real matching drill area exists and has been checked by hand; absent is the
   * honest default, and an absent value renders no call to action rather than a guessed destination.
   * This is a routing pointer, not an evidence claim: the lesson's own checks still write nothing,
   * and mastery begins at the server-graded drill this points to.
   */
  practiceDrill?: EducationPracticeDrill;
};

/**
 * The two legacy source kinds keep `source: unknown` exactly as M13E1A defined them. That is not an
 * omission: this layer must not restate `AuthoredLesson` or `RoleplayLesson`, and must not acquire
 * the ability to read one of their learner-facing fields as if it owned it. The validator narrows
 * them with runtime guards, and their renderers receive them through the legacy lookups instead.
 */
type EducationLegacyEntry = EducationRegistryEntryBase & {
  sourceKind: "authored-lesson" | "roleplay-lesson";
  source: unknown;
};

/**
 * The canonical source kind. `source` is typed, because this layer IS the one that renders it — and
 * it is still the ORIGINAL `LEARNING_SKILL_CATALOG` object, held by reference, never a copy.
 */
type EducationConceptEntry = EducationRegistryEntryBase & {
  sourceKind: "concept-education-lesson";
  source: ConceptEducationLessonSource;
};

export type EducationRegistryEntry = EducationLegacyEntry | EducationConceptEntry;

/**
 * Narrows by the discriminant alone — never by probing for an optional property, which is how a
 * malformed legacy entry could otherwise impersonate a canonical one.
 */
export function isConceptEducationLessonEntry(entry: EducationRegistryEntry): entry is EducationConceptEntry {
  return entry.sourceKind === "concept-education-lesson";
}

// --- slug aliases -------------------------------------------------------------------------------

/**
 * `active`               — the target resolves inside the CANONICAL registry, so the alias leads to
 *                          real authored instruction.
 * `compatibility-active` — the target resolves only in the seeded compatibility manifest. The alias
 *                          leads to an honest "this record exists, its authored lesson does not yet"
 *                          page. Kept distinct from `active` on purpose: collapsing the two would
 *                          make "this alias works" stop meaning "there is instruction behind it".
 * `planned`              — the target is not currently resolvable at all.
 * `deprecated`           — retained for the record; must never be resolved.
 */
export type EducationAliasStatus = "active" | "compatibility-active" | "planned" | "deprecated";

export type EducationAliasTargetKind = "lesson" | "skill";

export type EducationSlugAlias = {
  legacySlug: string;
  target: string;
  targetKind: EducationAliasTargetKind;
  status: EducationAliasStatus;
  /** Why this alias exists. Internal. */
  note: string;
};

// --- validation ---------------------------------------------------------------------------------

export type EducationIssueSeverity = "error" | "warning";

/**
 * Stable machine codes. Tests assert on these, never on message wording, so a rephrased message can
 * never silently turn a control into a pass.
 */
export type EducationIssueCode =
  | "DUPLICATE_LESSON_ID"
  | "DUPLICATE_COURSE_ID"
  | "DUPLICATE_MODULE_ID"
  | "UNKNOWN_COURSE"
  | "UNKNOWN_MODULE"
  | "COURSE_TRACK_MISMATCH"
  | "MODULE_TRACK_MISMATCH"
  | "UNKNOWN_PREREQUISITE"
  | "PREREQUISITE_CYCLE"
  | "UNKNOWN_NEXT_LESSON"
  | "NEXT_LESSON_TRACK_MISMATCH"
  | "MISSING_PROVENANCE"
  | "INVALID_LEARNER_PROVENANCE"
  | "CONCEPT_WITHOUT_PRACTICE"
  | "AVAILABLE_WITHOUT_PRACTICE_EVIDENCE"
  | "UNAVAILABLE_WITH_INTERACTIVE_PRACTICE"
  | "MAX_RUNG_EXCEEDED"
  | "DUPLICATE_SKILL_SLUG"
  | "GENERIC_FILLER_TEXT"
  | "ALIAS_UNKNOWN_TARGET"
  | "ALIAS_COLLISION"
  | "EMPTY_METADATA"
  | "UNSUPPORTED_TRACK"
  | "MISSING_SOURCE"
  | "DUPLICATE_SOURCE_OBJECT"
  | "ALIAS_EMPTY_TARGET"
  | "ALIAS_SELF_CYCLE"
  | "ALIAS_CONFLICTING_TARGET"
  | "ALIAS_PLANNED_RESOLVABLE"
  // --- concept-education-lesson source integrity (M13E1B) ---------------------------------------
  | "CONCEPT_SOURCE_SLUG_MISMATCH"
  | "CONCEPT_SOURCE_INCOMPLETE"
  | "CONCEPT_QUESTION_INVALID"
  // --- compatibility-alias integrity (M13E1C) ----------------------------------------------------
  | "ALIAS_COMPAT_UNKNOWN_TARGET"
  | "ALIAS_COMPAT_SHADOWS_CANONICAL";

export type EducationValidationIssue = {
  code: EducationIssueCode;
  severity: EducationIssueSeverity;
  /** The id, slug, or field the issue is about. */
  subject: string;
  message: string;
};

export type EducationRegistryInput = {
  courses: readonly EducationCourse[];
  modules: readonly EducationModule[];
  lessons: readonly EducationRegistryEntry[];
  aliases: readonly EducationSlugAlias[];
  /**
   * Every slug the seeded compatibility manifest knows (M13E1C). Optional so the E1A fixtures stay
   * valid unchanged; a `compatibility-active` alias without it is reported, never silently accepted.
   */
  seededSlugs?: readonly string[];
};
