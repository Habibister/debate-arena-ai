// Canonical education registry (M13E1A) — READ-ONLY AGGREGATE over what already exists.
//
// It registers the THREE authored lessons that ship today and nothing else. It authors nothing,
// migrates nothing, and copies no learner-facing sentence: every entry's `source` is the ORIGINAL
// exported object, held by reference, so `entry.source === getLesson(...)` is strictly true.
//
// DEPENDENCY DIRECTION IS ONE-WAY, and the smoke suite proves it:
//
//     lib/education/types.ts -> slug-map.ts -> registry.ts -> lib/lessons.ts
//                                                          -> lib/roleplay-lessons.ts
//
// `lib/lessons.ts` and `lib/roleplay-lessons.ts` import nothing from `lib/education/`, so there is
// no cycle. Neither legacy module was modified to make this work.
//
// NO ROUTE AND NO COMPONENT MAY IMPORT THIS FILE IN E1A. The three routes keep using
// `getLesson` / `getRoleplayLesson` exactly as before; the helpers below exist for validation and
// for the migration slices that follow.
//
// Pure: no React, no Prisma, no network, no filesystem, no environment, no browser API.

import { getLesson, type AuthoredLesson } from "@/lib/lessons";
import { getRoleplayLesson, type RoleplayLesson } from "@/lib/roleplay-lessons";
import { EDUCATION_SLUG_ALIASES } from "@/lib/education/slug-map";
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
    moduleIds: ["debate-argument-construction"]
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
    outcome: "Build a contention whose warrant is a mechanism rather than a restatement.",
    prerequisiteId: null
  },
  {
    id: "deca-event-orientation",
    courseId: "deca-roleplay-core",
    track: "DECA",
    outcome: "Know the role-play event end to end before training any single part of it.",
    prerequisiteId: null
  },
  {
    id: "hosa-communication-layer",
    courseId: "hosa-clinical-skill-communication",
    track: "HOSA",
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
    nextLessonId: null,
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
  }
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

export function getEducationCourse(id: string): EducationCourse | undefined {
  return EDUCATION_COURSES.find((course) => course.id === id);
}

export function getEducationModule(id: string): EducationModule | undefined {
  return EDUCATION_MODULES.find((module) => module.id === id);
}
