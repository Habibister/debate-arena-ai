// DECA — authored concept lessons (P1-B1).
//
// Registered the same way the Debate concept lessons are: this file imports `LEARNING_SKILL_CATALOG`,
// selects entries by slug, and hands the ORIGINAL objects to the canonical registry BY REFERENCE. It
// copies no learner-facing sentence, so `entry.source === LEARNING_SKILL_CATALOG.find(...)` is
// strictly true and each sentence lives in exactly one place. `lib/learning-content.ts` owns the text.
//
// WHY DECA GETS A CONCEPT TRACK AT ALL. The B5 architecture audit established that DECA's four drill
// areas and its three held lessons are ORTHOGONAL: every area writes real mastery to a real Skill
// row, and no published lesson taught any of the constructs those drills measure. P1-A made that
// state representable (`lib/education/deca-practice-map.ts`); P1-B1 closed `performance-indicators`,
// P1-B2 closed `business-reasoning`, and P1-B3 closes `customer-relations` — the first of the two
// CLUSTER-KNOWLEDGE areas the exam tests. The two role-play owners sit in the role-play course; the
// cluster owner deliberately does not, because that course teaches performing a round and names no
// content area. Only `marketing-fundamentals` is still ownerless, and it is not dressed up here.
//
// THREE DECA CATALOG ENTRIES STAY HELD and are deliberately absent below:
//
//   deca-reading-scenarios          teaches scenario decoding, not indicator handling. Publishing it
//                                   is P1-B's own slice and has not been audited or simplified.
//   deca-identifying-problem        same: a different construct, on the same unaudited footing.
//   deca-professional-communication owner has not yet ruled whether it is core or optional support.
//
// None of the three is a substitute owner for any drill area — B5 proved that directly — so none is
// promoted here to make a remediation target resolve.
//
// Pure: no React, no Prisma, no network, no filesystem, no environment, no browser API.

import { LEARNING_SKILL_CATALOG } from "@/lib/learning-content";
import type { SourceFreshnessMetadata } from "@/lib/source-freshness";
import type { ConceptEducationLessonSource, EducationRegistryEntry } from "@/lib/education/types";

/**
 * Provenance for CompeteReady-authored DECA teaching.
 *
 * `tier-2` / CompeteReady is the honest authority and is what keeps the entry out of
 * INVALID_LEARNER_PROVENANCE: the lesson states no official DECA rule, quotes no official indicator,
 * and cites no source, so claiming `official` would be a false official claim. Its example
 * indicators say inside the lesson text that CompeteReady wrote them.
 */
export const AUTHORED_DECA_PROVENANCE: SourceFreshnessMetadata = Object.freeze({
  authority: "tier-2",
  freshness: "stable",
  organization: "CompeteReady",
  sourceLabel: "CompeteReady authored lesson"
});

/**
 * Provenance for the DECA BUSINESS-CONTENT section.
 *
 * The approved curriculum (docs/curriculum/02-deca-course.md, BC-2) tags every lesson in that section
 * STABLE-TEACHING: the concepts are mainstream business-education definitions, and the tier is
 * explicitly "never a rules source". That is a truer description than the tier-2 authored-lesson
 * label the role-play lessons carry, and it survives the production decision layer undegraded.
 * Nothing in the section states a DECA rule, a scoring criterion, or a current-season fact.
 */
export const STABLE_TEACHING_DECA_PROVENANCE: SourceFreshnessMetadata = Object.freeze({
  authority: "stable-teaching",
  freshness: "stable",
  organization: "CompeteReady",
  sourceLabel: "CompeteReady authored lesson — mainstream business-education concepts"
});

/** The DECA catalog slugs this file publishes, in teaching order. */
const PUBLISHED_DECA_SLUGS = ["deca-understanding-performance-indicators", "deca-justifying-your-recommendation", "deca-handling-customer-situations"] as const;

/** The DECA catalog entries that exist but are NOT learner-visible. Exported so a suite can prove it. */
export const HELD_DECA_CATALOG_SLUGS: readonly string[] = [
  "deca-reading-scenarios",
  "deca-identifying-problem",
  "deca-professional-communication"
];

type PublishedDecaSlug = (typeof PUBLISHED_DECA_SLUGS)[number];

/**
 * Selects one catalog entry by slug and returns THE ORIGINAL OBJECT.
 *
 * Fails loudly rather than degrading, exactly like the Debate selector: a missing entry, a duplicated
 * slug, a foreign track, or a structurally incomplete lesson must stop the registry from loading at
 * all. A partial lesson would put an empty section in front of a learner.
 */
function selectDecaCatalogLesson(slug: PublishedDecaSlug): ConceptEducationLessonSource {
  const matches = LEARNING_SKILL_CATALOG.filter((entry) => entry.slug === slug);
  if (matches.length === 0) {
    throw new Error(`DECA education: no LEARNING_SKILL_CATALOG entry has slug "${slug}"`);
  }
  if (matches.length > 1) {
    throw new Error(`DECA education: slug "${slug}" appears ${matches.length} times in LEARNING_SKILL_CATALOG`);
  }
  const entry = matches[0];
  if (entry.organization !== "DECA" || entry.track !== "DECA") {
    throw new Error(`DECA education: "${slug}" is ${entry.organization}/${entry.track}, not DECA`);
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
    throw new Error(`DECA education: "${slug}" is missing ${missing.join(", ")}`);
  }
  // The ORIGINAL object. No spread, no Object.assign, no clone, no reconstruction.
  return entry;
}

const understandingPerformanceIndicators = selectDecaCatalogLesson("deca-understanding-performance-indicators");
const justifyingYourRecommendation = selectDecaCatalogLesson("deca-justifying-your-recommendation");
const handlingCustomerSituations = selectDecaCatalogLesson("deca-handling-customer-situations");

/** Exported for the smoke suite's strict-identity proof against the catalog. */
export const PUBLISHED_DECA_SOURCES = { understandingPerformanceIndicators, justifyingYourRecommendation, handlingCustomerSituations } as const;

/**
 * P1-B1 — the teaching owner for the `deca-performance-indicators` drill area.
 *
 * `skillSlug` names the EXISTING Skill row that `lib/deca-drills.ts` already writes mastery to. No
 * new skill row is declared anywhere by this milestone: the lesson's own id is deliberately
 * different from that slug, so `/skills/deca-performance-indicators` keeps resolving to its honest
 * DECA compatibility destination instead of becoming a canonical redirect that 404s the
 * `/skills/<slug>/practice` link a due review hands a learner.
 *
 * ASSOCIATION ONLY, exactly like the Debate concept entries: the lesson's own five checks stay
 * formative and save nothing. The 30-item server-graded performance-indicators drill is what writes
 * MasteryProgress and schedules review, and `practiceDrill` names that exact drill rather than a
 * drill front door.
 *
 * `nextLessonId` was null while this was the only DECA concept lesson. P1-B2 points it at the
 * business-reasoning owner, because leaving it null would make the page's own end-of-course line —
 * "This is the last lesson written for this course so far" — false the moment a second one shipped.
 * The lesson's authored bytes are untouched; only this metadata changed.
 */
export const DECA_PERFORMANCE_INDICATORS_LESSON: EducationRegistryEntry = {
  id: "deca-understanding-performance-indicators",
  track: "DECA",
  courseId: "deca-roleplay-core",
  moduleId: "deca-roleplay-skills",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: understandingPerformanceIndicators,
  sourceKind: "concept-education-lesson",
  skillSlug: "deca-performance-indicators",
  practiceDrill: { track: "deca", area: "performance-indicators" },
  legacySlugs: [],
  nextLessonId: "deca-justifying-your-recommendation",
  provenance: AUTHORED_DECA_PROVENANCE
};

/**
 * P1-B2 — the teaching owner for the `deca-business-reasoning` drill area.
 *
 * Same architecture as the PI entry and the same two hard rules. `skillSlug` names the EXISTING
 * Skill row the drill already writes to, so no new skill row is declared. The lesson id is
 * deliberately NOT that slug: `resolveSkillsSlug` rule 1 redirects any slug that is a registry
 * lesson id, which would 404 `/skills/deca-business-reasoning/practice` for a learner with a due
 * review and would silently change what `ACTIVATION_PENDING_SKILLS` resolves to.
 *
 * It shares module "deca-roleplay-skills" with the PI lesson. That is legal and intended: the
 * one-skill-claim-per-module rule fires only when the SAME skillSlug is claimed twice inside one
 * module, and these two claim different skills. Both are role-play skills, so a second module would
 * have split a single construct group for no reason.
 *
 * ASSOCIATION ONLY: the lesson's five checks stay formative and save nothing. The 30-item
 * server-graded business-reasoning drill is what writes MasteryProgress and schedules review.
 *
 * `nextLessonId` is null — it is the last DECA concept lesson written so far, and the only remaining
 * DECA entries are the three held ones.
 */
export const DECA_BUSINESS_REASONING_LESSON: EducationRegistryEntry = {
  id: "deca-justifying-your-recommendation",
  track: "DECA",
  courseId: "deca-roleplay-core",
  moduleId: "deca-roleplay-skills",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: justifyingYourRecommendation,
  sourceKind: "concept-education-lesson",
  skillSlug: "deca-business-reasoning",
  practiceDrill: { track: "deca", area: "business-reasoning" },
  legacySlugs: [],
  nextLessonId: null,
  provenance: AUTHORED_DECA_PROVENANCE
};

/**
 * P1-B3 — the teaching owner for the `deca-customer-relations` drill area, and the FIRST
 * cluster-knowledge lesson.
 *
 * IT DOES NOT LIVE IN THE ROLE-PLAY COURSE, and that is the point. `deca-roleplay-core`'s two module
 * outcomes are about knowing the event and answering the card; its published course map is eleven
 * performance steps naming no content area. Putting a customer-relations lesson there would make
 * both outcomes false. The approved curriculum says the same thing directly (BC-1): these are
 * "content areas the performance course never covers, so they are taught here, in their own
 * section". Hence a second DECA course, created no larger than this one lesson needs.
 *
 * Same two hard rules as the role-play owners: `skillSlug` names the EXISTING Skill row, and the
 * lesson id is deliberately not that slug, so `/skills/deca-customer-relations/practice` keeps
 * resolving to its honest DECA compatibility page instead of 404ing a learner with a due review.
 *
 * `nextLessonId` is null: it is the only lesson in its course so far, and the remaining DECA entries
 * are the three held ones.
 */
export const DECA_CUSTOMER_RELATIONS_LESSON: EducationRegistryEntry = {
  id: "deca-handling-customer-situations",
  track: "DECA",
  courseId: "deca-business-content",
  moduleId: "deca-customer-service",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: handlingCustomerSituations,
  sourceKind: "concept-education-lesson",
  skillSlug: "deca-customer-relations",
  practiceDrill: { track: "deca", area: "customer-relations" },
  legacySlugs: [],
  nextLessonId: null,
  provenance: STABLE_TEACHING_DECA_PROVENANCE
};

export const DECA_PUBLISHED_LESSONS: readonly EducationRegistryEntry[] = [
  DECA_PERFORMANCE_INDICATORS_LESSON,
  DECA_BUSINESS_REASONING_LESSON,
  DECA_CUSTOMER_RELATIONS_LESSON
];
