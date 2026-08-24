// General Debate — migrated concept lessons (M13E1B).
//
// These four lessons were already authored, in `lib/learning-content.ts`, and had never been
// reachable: nothing imported that module. This file does NOT copy them. It imports the catalog,
// selects the four entries by slug, and hands the ORIGINAL objects to the canonical registry by
// reference — so `entry.source === LEARNING_SKILL_CATALOG.find(...)` is strictly true and there is
// exactly one copy of every sentence in the repository. `lib/learning-content.ts` is unchanged.
//
// Four of the nine Debate catalog entries are deliberately absent:
//
//   debate-claim-warrant-impact   duplicates the richer shipped `claim-warrant-impact` lesson.
//   debate-weighing               states magnitude/probability/timeframe as required speech
//                                 vocabulary; the curriculum teaches them as analytic categories.
//   debate-rebuttal-speeches      states "no new arguments in rebuttal" as a universal norm; the
//                                 curriculum requires it be stated as a dated ballot instruction.
//   debate-parliamentary-roles    parliamentary is not NSDA-governed and has no approved source.
//   debate-case-topic-definitions its worked example is a parliamentary motion form.
//
// Correcting the middle two is content authoring, not migration, so they are held rather than
// shipped with a claim the curriculum already corrected.
//
// Pure: no React, no Prisma, no network, no filesystem, no environment, no browser API.

import { LEARNING_SKILL_CATALOG } from "@/lib/learning-content";
import type { SourceFreshnessMetadata } from "@/lib/source-freshness";
import type { ConceptEducationLessonSource, EducationRegistryEntry } from "@/lib/education/types";

/**
 * One shared, frozen provenance object for every migrated lesson.
 *
 * All four are CompeteReady-authored instructional scaffolds. None states an official NSDA rule,
 * cites a source, or describes an official judging requirement, so `tier-2` is the honest authority
 * and no URL is invented. Shared rather than duplicated because the semantics are identical.
 */
export const MIGRATED_DEBATE_PROVENANCE: SourceFreshnessMetadata = Object.freeze({
  authority: "tier-2",
  freshness: "stable",
  organization: "CompeteReady",
  sourceLabel: "CompeteReady authored lesson"
});

/** The catalog slugs this file migrates, in teaching order. */
const MIGRATED_SLUGS = ["debate-signposting", "debate-clash", "debate-refutation", "debate-constructive-speeches"] as const;

type MigratedSlug = (typeof MIGRATED_SLUGS)[number];

/**
 * Selects one catalog entry by slug and returns THE ORIGINAL OBJECT.
 *
 * Fails loudly rather than degrading: a missing entry, a duplicated slug, a foreign track, or a
 * structurally incomplete lesson must stop the registry from loading at all. Returning a partial
 * lesson would put an empty section in front of a learner, which is the exact failure this whole
 * milestone exists to remove.
 */
function selectCatalogLesson(slug: MigratedSlug): ConceptEducationLessonSource {
  const matches = LEARNING_SKILL_CATALOG.filter((entry) => entry.slug === slug);
  if (matches.length === 0) {
    throw new Error(`Debate migration: no LEARNING_SKILL_CATALOG entry has slug "${slug}"`);
  }
  if (matches.length > 1) {
    throw new Error(`Debate migration: slug "${slug}" appears ${matches.length} times in LEARNING_SKILL_CATALOG`);
  }
  const entry = matches[0];
  if (entry.organization !== "DEBATE" || entry.track !== "DEBATE") {
    throw new Error(`Debate migration: "${slug}" is ${entry.organization}/${entry.track}, not DEBATE`);
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
    throw new Error(`Debate migration: "${slug}" is missing ${missing.join(", ")}`);
  }
  // The ORIGINAL object. No spread, no Object.assign, no clone, no reconstruction.
  return entry;
}

const signposting = selectCatalogLesson("debate-signposting");
const clash = selectCatalogLesson("debate-clash");
const refutation = selectCatalogLesson("debate-refutation");
const constructiveSpeeches = selectCatalogLesson("debate-constructive-speeches");

/** Exported for the migration smoke suite's strict-identity proof against the catalog. */
export const MIGRATED_DEBATE_SOURCES = { signposting, clash, refutation, constructiveSpeeches } as const;

export const DEBATE_MIGRATED_LESSONS: readonly EducationRegistryEntry[] = [
  {
    id: "debate-signposting",
    track: "GENERAL_DEBATE",
    courseId: "debate-performance",
    moduleId: "debate-round-strategy",
    variant: "concept",
    visibility: "learner",
    practiceState: "available",
    source: signposting,
    sourceKind: "concept-education-lesson",
    legacySlugs: [],
    nextLessonId: "debate-clash",
    provenance: MIGRATED_DEBATE_PROVENANCE
  },
  {
    id: "debate-clash",
    track: "GENERAL_DEBATE",
    courseId: "debate-performance",
    moduleId: "debate-round-strategy",
    variant: "concept",
    visibility: "learner",
    practiceState: "available",
    source: clash,
    sourceKind: "concept-education-lesson",
    legacySlugs: [],
    nextLessonId: "debate-refutation",
    provenance: MIGRATED_DEBATE_PROVENANCE
  },
  {
    id: "debate-refutation",
    track: "GENERAL_DEBATE",
    courseId: "debate-performance",
    moduleId: "debate-round-strategy",
    variant: "concept",
    visibility: "learner",
    practiceState: "available",
    source: refutation,
    sourceKind: "concept-education-lesson",
    // ASSOCIATION ONLY. This lesson is about the seeded `debate-rebuttal` skill, but its checks are
    // the lesson's own authored questions — not the graded drill bank — so nothing here writes
    // mastery, and the practice component imports no mastery code at all.
    skillSlug: "debate-rebuttal",
    // The one authored Debate lesson whose concept has a REAL matching drill area today: `rebuttal`
    // carries skillSlug `debate-rebuttal` and 30 banked items, and its submit path is what actually
    // writes mastery and schedules review. The other three authored lessons have no such area, so
    // they carry no destination and show no practice call to action.
    practiceDrill: { track: "debate", area: "rebuttal" },
    legacySlugs: [],
    nextLessonId: "debate-constructive-speeches",
    provenance: MIGRATED_DEBATE_PROVENANCE
  },
  {
    id: "debate-constructive-speeches",
    track: "GENERAL_DEBATE",
    courseId: "debate-performance",
    moduleId: "debate-speech-structure",
    variant: "concept",
    visibility: "learner",
    practiceState: "available",
    source: constructiveSpeeches,
    sourceKind: "concept-education-lesson",
    legacySlugs: [],
    // The last migrated lesson. Null rather than a pointer at a lesson that does not exist yet.
    nextLessonId: null,
    provenance: MIGRATED_DEBATE_PROVENANCE
  }
] as const;

/** Slugs held back from this slice, asserted absent from the learner-visible registry. */
export const HELD_DEBATE_CATALOG_SLUGS: readonly string[] = [
  "debate-claim-warrant-impact",
  "debate-weighing",
  "debate-rebuttal-speeches",
  "debate-parliamentary-roles",
  "debate-case-topic-definitions"
] as const;
