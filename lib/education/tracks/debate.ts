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
//   debate-rebuttal-speeches      states "no new arguments in rebuttal" as a universal norm; the
//                                 curriculum requires it be stated as a dated ballot instruction.
//   debate-parliamentary-roles    parliamentary is not NSDA-governed and has no approved source.
//   debate-case-topic-definitions its worked example is a parliamentary motion form.
//
// debate-weighing was held here for stating magnitude/probability/timeframe as required speech
// vocabulary. Wave 1B applied that recorded correction — the lenses are now taught as names for
// comparison moves, with application questions — so it is published below with the exact drill
// mapping its measurable skill already had. Correcting rebuttal-speeches is still content
// authoring, so it stays held rather than shipped with a claim the curriculum already corrected.
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
const MIGRATED_SLUGS = ["debate-signposting", "debate-clash", "debate-refutation", "debate-constructive-speeches", "debate-weighing"] as const;

/**
 * Wave 1A: the beginner orientation is NEW authored content, published through the same
 * catalog-by-reference mechanism as the migrated lessons but kept out of MIGRATED_SLUGS — it was
 * never a held migration, and the migration suite's historical claims stay scoped to the five.
 */
const AUTHORED_CATALOG_SLUGS = [...MIGRATED_SLUGS, "debate-round-orientation", "debate-evidence-evaluation", "debate-answer-types"] as const;

type MigratedSlug = (typeof AUTHORED_CATALOG_SLUGS)[number];

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
const weighing = selectCatalogLesson("debate-weighing");
const orientation = selectCatalogLesson("debate-round-orientation");
const evidenceEvaluation = selectCatalogLesson("debate-evidence-evaluation");
const answerTypes = selectCatalogLesson("debate-answer-types");

/** Exported for the migration smoke suite's strict-identity proof against the catalog. */
export const MIGRATED_DEBATE_SOURCES = { signposting, clash, refutation, constructiveSpeeches, weighing } as const;

/**
 * Wave 1A — the beginner front door. TAUGHT with FORMATIVE checks only, deliberately: orientation
 * has NO skillSlug and NO practiceDrill, because "knows what debate is" must never become a fake
 * durable MasteryProgress record. It is registered FIRST in the learner-visible Debate order (the
 * registry inserts it ahead of Claim/Warrant/Impact) and chains into CWI.
 */
/**
 * Wave 1C — the Evidence Evaluation teaching home. The `debate-evidence` skill has carried a
 * 30-question server-graded drill and durable evidence since the drill system shipped; this entry
 * closes its missing half exactly the way Refutation and Weighing are closed: skillSlug +
 * practiceDrill metadata, and the shipped remediation/Coach architecture activates itself.
 */
export const DEBATE_EVIDENCE_LESSON: EducationRegistryEntry = {
  id: "debate-evidence-evaluation",
  track: "GENERAL_DEBATE",
  courseId: "debate-performance",
  moduleId: "debate-argument-construction",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: evidenceEvaluation,
  sourceKind: "concept-education-lesson",
  // ASSOCIATION ONLY, exactly like refutation and weighing: the lesson's own checks stay formative;
  // the graded evidence-evaluation drill is what writes mastery and schedules review.
  skillSlug: "debate-evidence",
  practiceDrill: { track: "debate", area: "evidence-evaluation" },
  legacySlugs: [],
  nextLessonId: "debate-signposting",
  provenance: MIGRATED_DEBATE_PROVENANCE
};

/** B2.1 (2026-08-25): newly AUTHORED answer-types lesson — teaches WHAT KIND of answer a response
 *  is (defense, indict, turn, offense) as the taxonomy foundation the held rebuttal drill items
 *  test. Registered via the same catalog-by-reference mechanism as the Wave 1A additions and kept
 *  OUT of MIGRATED_SLUGS: it was authored in B2.1, not migrated, and historical migration claims
 *  stay scoped to the five. Teaching shipped first — the four related drill items (rb-02, rb-13,
 *  rb-16, rb-30) stayed HELD until each independently passed the closed-corpus reactivation gate;
 *  all four passed and were released in the strictly-later reactivation commit (2026-08-25). */
export const DEBATE_ANSWER_TYPES_LESSON: EducationRegistryEntry = {
  id: "debate-answer-types",
  track: "GENERAL_DEBATE",
  courseId: "debate-performance",
  moduleId: "debate-round-strategy",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: answerTypes,
  sourceKind: "concept-education-lesson",
  // Practice CTA ONLY — deliberately NO skillSlug: refutation remains the module's single claimed
  // teaching home for `debate-rebuttal` (the reverse-remediation mapping for due reviews must not
  // split), and the registry validator enforces one skill claim per module. The lesson's own checks
  // stay formative; the graded rebuttal drill is what writes mastery and schedules review.
  practiceDrill: { track: "debate", area: "rebuttal" },
  legacySlugs: [],
  nextLessonId: "debate-constructive-speeches",
  provenance: MIGRATED_DEBATE_PROVENANCE
};

export const DEBATE_ORIENTATION_LESSON: EducationRegistryEntry = {
  id: "debate-round-orientation",
  track: "GENERAL_DEBATE",
  courseId: "debate-performance",
  moduleId: "debate-argument-construction",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: orientation,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "claim-warrant-impact",
  provenance: MIGRATED_DEBATE_PROVENANCE
};

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
    // ASSOCIATION ONLY, like refutation below: the lesson's own checks are formative; the graded
    // clash drill is where durable evidence is written. The skill row is created by the deliberate
    // operational script (scripts/seed-debate-clash-skill.ts), never by prisma/seed.ts.
    skillSlug: "debate-clash",
    practiceDrill: { track: "debate", area: "clash" },
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
    // `rebuttal` carries skillSlug `debate-rebuttal` and 30 banked items, and its submit path is
    // what actually writes mastery and schedules review. Of the migrated five, refutation, clash
    // and weighing now name real drill areas; signposting and constructive-speeches have none, so
    // they carry no destination and show no practice call to action.
    practiceDrill: { track: "debate", area: "rebuttal" },
    legacySlugs: [],
    // B2.1: the answer-types lesson now follows refutation in the chain — first HOW to state an
    // answer (this lesson), then WHAT KIND of answer it is (answer types), then speeches.
    nextLessonId: "debate-answer-types",
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
    nextLessonId: "debate-weighing",
    provenance: MIGRATED_DEBATE_PROVENANCE
  },
  {
    id: "debate-weighing",
    track: "GENERAL_DEBATE",
    courseId: "debate-performance",
    moduleId: "debate-round-strategy",
    variant: "concept",
    visibility: "learner",
    practiceState: "available",
    source: weighing,
    sourceKind: "concept-education-lesson",
    // ASSOCIATION ONLY, exactly like debate-refutation: the lesson is ABOUT the seeded
    // `debate-weighing` skill, its own checks stay formative, and the graded `weighing` drill is
    // what actually writes mastery and schedules review. Wave 1B published this held lesson after
    // its recorded content correction, closing the second lesson -> exact-drill -> durable-evidence
    // loop of the deep-linked kind.
    skillSlug: "debate-weighing",
    practiceDrill: { track: "debate", area: "weighing" },
    legacySlugs: [],
    // The last lesson in the chain. Null rather than a pointer at a lesson that does not exist yet.
    nextLessonId: null,
    provenance: MIGRATED_DEBATE_PROVENANCE
  }
] as const;

/** Slugs held back from this slice, asserted absent from the learner-visible registry. */
export const HELD_DEBATE_CATALOG_SLUGS: readonly string[] = [
  "debate-claim-warrant-impact",
  "debate-rebuttal-speeches",
  "debate-parliamentary-roles",
  "debate-case-topic-definitions"
] as const;
