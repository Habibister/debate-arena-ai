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
  /** One observable outcome. Internal metadata — not teaching text. */
  outcome: string;
  prerequisiteId: string | null;
};

export type EducationSourceKind = "authored-lesson" | "roleplay-lesson";

export type EducationRegistryEntry = {
  /** The lesson's canonical id. In E1A this is deliberately the slug the route already serves. */
  id: string;
  track: EducationTrack;
  courseId: string;
  moduleId: string;
  variant: EducationLessonVariant;
  visibility: EducationVisibility;
  practiceState: EducationPracticeState;
  /**
   * REFERENCE to the original exported lesson object. Typed `unknown` on purpose: this layer must
   * not restate `AuthoredLesson` or `RoleplayLesson`, and must not acquire the ability to read a
   * learner-facing field as if it owned it. The validator narrows it with runtime guards.
   */
  source: unknown;
  sourceKind: EducationSourceKind;
  /** The seeded mastery skill this lesson's practice writes to, when it writes at all. */
  skillSlug?: string;
  /** Previously published ids that must keep resolving. Empty today — nothing has been renamed. */
  legacySlugs: readonly string[];
  nextLessonId: string | null;
  /** REFERENCE to the source object's own provenance. Never a rewritten copy. */
  provenance: SourceFreshnessMetadata;
  /** Caps this lesson's practice rung. Must not exceed its course's `maxRung`. */
  maximumRung?: EducationRung;
};

// --- slug aliases -------------------------------------------------------------------------------

/**
 * `active`     — the target resolves inside the canonical registry today.
 * `planned`    — the target does not exist yet. Recorded so the gap is visible; resolves nothing.
 * `deprecated` — retained for the record; must never be resolved.
 *
 * An alias is DATA in E1A. Nothing consumes it, no redirect exists, and no historical link is
 * claimed fixed by its presence here.
 */
export type EducationAliasStatus = "active" | "planned" | "deprecated";

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
  | "ALIAS_PLANNED_RESOLVABLE";

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
};
