// Canonical education registry — READ-ONLY AGGREGATE over lessons that already exist.
//
// It authors nothing and copies no learner-facing sentence. Every entry's `source` is the ORIGINAL
// exported object, held by reference, so `entry.source === getLesson(...)` and
// `entry.source === LEARNING_SKILL_CATALOG.find(...)` are strictly true and each sentence lives in
// exactly one place in the repository.
//
// SEVEN entries: the three lessons that shipped before M13E1A, plus the four Debate concept lessons
// M13E1B migrated out of `lib/learning-content.ts` — which is itself unchanged.
//
// DEPENDENCY DIRECTION IS ONE-WAY, and the smoke suite proves it:
//
//     types.ts -> slug-map.ts -> tracks/debate.ts -> registry.ts -> lib/lessons.ts
//                                                                -> lib/roleplay-lessons.ts
//                                                                -> lib/learning-content.ts
//
// None of those three legacy modules imports anything from `lib/education/`, so there is no cycle,
// and none of them was modified to make this work.
//
// `app/(app)/lessons/**` consumes the helpers below for MIGRATED lessons only (M13E1B). The three
// pre-existing lessons still resolve through `getLesson` / `getRoleplayLesson`, ahead of this
// registry, and render through their own untouched views.
//
// Pure: no React, no Prisma, no network, no filesystem, no environment, no browser API.

import { getLesson, type AuthoredLesson } from "@/lib/lessons";
import { getRoleplayLesson, type RoleplayLesson } from "@/lib/roleplay-lessons";
import { EDUCATION_SLUG_ALIASES } from "@/lib/education/slug-map";
import { DEBATE_MIGRATED_LESSONS } from "@/lib/education/tracks/debate";
import type {
  EducationCourse,
  EducationModule,
  EducationRegistryEntry,
  EducationRegistryInput,
  EducationTrack
} from "@/lib/education/types";

// --- source lookup ------------------------------------------------------------------------------
//
// Deliberately NOT a non-null assertion. If a lesson this registry names ever stops existing, the
// registry must fail loudly and by name rather than register `undefined` and let a downstream check
// invent an explanation for it.

function requireAuthoredLesson(slug: string): AuthoredLesson {
  const lesson = getLesson(slug);
  if (!lesson) {
    throw new Error(`Education registry: authored lesson "${slug}" is not exported by lib/lessons.ts`);
  }
  return lesson;
}

function requireRoleplayLesson(slug: string): RoleplayLesson {
  const lesson = getRoleplayLesson(slug);
  if (!lesson) {
    throw new Error(`Education registry: role-play lesson "${slug}" is not exported by lib/roleplay-lessons.ts`);
  }
  return lesson;
}

const claimWarrantImpact = requireAuthoredLesson("claim-warrant-impact");
const decaRoleplay = requireRoleplayLesson("how-deca-roleplay-works");
const hosaCommunication = requireRoleplayLesson("how-hosa-scenario-interaction-works");

// --- courses ------------------------------------------------------------------------------------
//
// Only enough structure to place the three existing lessons honestly. This is NOT the 87-lesson
// curriculum registry; labels and outcomes are internal metadata, never teaching text, and nothing
// here is exposed to a learner.

export const EDUCATION_COURSES: readonly EducationCourse[] = [
  {
    id: "debate-performance",
    track: "GENERAL_DEBATE",
    label: "Debate Performance Course",
    // Teaching order. Build an argument, then run it in a round, then structure a whole case.
    moduleIds: ["debate-argument-construction", "debate-round-strategy", "debate-speech-structure"]
  },
  {
    id: "deca-roleplay-core",
    track: "DECA",
    label: "DECA Role-Play Core",
    moduleIds: ["deca-event-orientation"]
  },
  {
    id: "hosa-clinical-skill-communication",
    track: "HOSA",
    label: "HOSA Clinical-Skill Communication (Branch B)",
    moduleIds: ["hosa-communication-layer"],
    // Branch B's Compete stage is deferred pending advisor/judge validation, with no hands-on
    // simulation — the one documented exception to Learn -> Practice -> Apply -> Compete.
    maxRung: 4
  }
] as const;

// --- modules ------------------------------------------------------------------------------------

export const EDUCATION_MODULES: readonly EducationModule[] = [
  {
    id: "debate-argument-construction",
    courseId: "debate-performance",
    track: "GENERAL_DEBATE",
    label: "Argument construction",
    outcome: "Build a contention whose warrant is a mechanism rather than a restatement.",
    prerequisiteId: null
  },
  {
    id: "debate-round-strategy",
    courseId: "debate-performance",
    track: "GENERAL_DEBATE",
    label: "Round strategy",
    outcome: "Label an argument, meet the opposing claim directly, and answer it in a repeatable shape.",
    prerequisiteId: "debate-argument-construction"
  },
  {
    id: "debate-speech-structure",
    courseId: "debate-performance",
    track: "GENERAL_DEBATE",
    label: "Speech structure",
    outcome: "Assemble definitions, contentions and impacts into one coherent constructive speech.",
    prerequisiteId: "debate-round-strategy"
  },
  {
    id: "deca-event-orientation",
    courseId: "deca-roleplay-core",
    track: "DECA",
    label: "Event orientation",
    outcome: "Know the role-play event end to end before training any single part of it.",
    prerequisiteId: null
  },
  {
    id: "hosa-communication-layer",
    courseId: "hosa-clinical-skill-communication",
    track: "HOSA",
    label: "Communication layer",
    outcome: "Perform the communication layer a clinical-skill rating sheet scores — never the skill itself.",
    prerequisiteId: null
  }
] as const;

// --- lessons ------------------------------------------------------------------------------------

export const EDUCATION_LESSONS: readonly EducationRegistryEntry[] = [
  {
    id: "claim-warrant-impact",
    track: "GENERAL_DEBATE",
    courseId: "debate-performance",
    moduleId: "debate-argument-construction",
    variant: "concept",
    visibility: "learner",
    practiceState: "available",
    source: claimWarrantImpact,
    sourceKind: "authored-lesson",
    // Unchanged: this is the seeded skill its drill-backed practice already writes to.
    skillSlug: claimWarrantImpact.skillSlug,
    legacySlugs: [],
    // M13E1B: the migrated Debate lessons now follow it. Metadata only — the lesson object itself is
    // untouched and still renders through its own legacy view.
    nextLessonId: "debate-signposting",
    provenance: claimWarrantImpact.provenance
  },
  {
    id: "how-deca-roleplay-works",
    track: "DECA",
    courseId: "deca-roleplay-core",
    moduleId: "deca-event-orientation",
    variant: "performance",
    visibility: "learner",
    // Its guided practice runs and records NOTHING — no mastery, no rating, no competition result.
    // `available` describes the interaction, never a saved outcome.
    practiceState: "available",
    source: decaRoleplay,
    sourceKind: "roleplay-lesson",
    legacySlugs: [],
    nextLessonId: null,
    provenance: decaRoleplay.provenance
  },
  {
    id: "how-hosa-scenario-interaction-works",
    track: "HOSA",
    courseId: "hosa-clinical-skill-communication",
    moduleId: "hosa-communication-layer",
    variant: "performance",
    visibility: "learner",
    // The interactive scenario was withdrawn pending clinical and legal review and stays withdrawn.
    // The lesson body is still readable; no HOSA practice is reintroduced here.
    practiceState: "temporarily-unavailable",
    source: hosaCommunication,
    sourceKind: "roleplay-lesson",
    legacySlugs: [],
    nextLessonId: null,
    provenance: hosaCommunication.provenance,
    maximumRung: 4
  },
  // M13E1B — four already-authored Debate concept lessons, held by reference from the catalog.
  ...DEBATE_MIGRATED_LESSONS
] as const;

export const EDUCATION_REGISTRY: EducationRegistryInput = {
  courses: EDUCATION_COURSES,
  modules: EDUCATION_MODULES,
  lessons: EDUCATION_LESSONS,
  aliases: EDUCATION_SLUG_ALIASES
};

// --- helpers (validation and future migration only — no route consumes these in E1A) -------------

/** Fails closed: an unknown id returns `undefined`, never a substitute lesson. */
export function getEducationLesson(id: string): EducationRegistryEntry | undefined {
  return EDUCATION_LESSONS.find((entry) => entry.id === id);
}

export function educationLessonsForTrack(track: EducationTrack): EducationRegistryEntry[] {
  return EDUCATION_LESSONS.filter((entry) => entry.track === track);
}

/**
 * M15 Learning Architecture Slice 2 — the reverse of `practiceDrill`: which lessons teach the
 * skill `skillSlug`, AND carry a server-graded drill that can record evidence for it?
 *
 * Keyed off the registry entry itself (`skillSlug` + `practiceDrill`) rather than off
 * `DRILL_AREAS`, so the registry gains no RUNTIME dependency on the drill bank — the only link
 * to lib/debate-drills stays the type-only import in ./types. That is only sound while every
 * mapped entry keeps `skillSlug` aligned with the canonical skill of its `practiceDrill.area`;
 * review-ladder:smoke validates that agreement across mapped entries, so an entry can never
 * route a learner to a drill scored against a different skill than the one they are being
 * remediated on.
 *
 * Fails closed: a skill with no mapped lesson returns [], never a substitute lesson. Requiring
 * `practiceDrill` is deliberate — a lesson with no drill has nowhere to record the result, and
 * recommending it would end the loop in teaching rather than in evidence.
 */
export function educationLessonsForPracticeSkill(skillSlug: string): EducationRegistryEntry[] {
  if (!skillSlug) return [];
  return EDUCATION_LESSONS.filter((entry) => entry.skillSlug === skillSlug && entry.practiceDrill);
}

export function getEducationCourse(id: string): EducationCourse | undefined {
  return EDUCATION_COURSES.find((course) => course.id === id);
}

export function getEducationModule(id: string): EducationModule | undefined {
  return EDUCATION_MODULES.find((module) => module.id === id);
}
