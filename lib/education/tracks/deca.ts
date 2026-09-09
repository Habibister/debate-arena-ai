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
// ONE DECA CATALOG ENTRY STAYS HELD and is deliberately absent below:
//
//   deca-professional-communication owner has ruled it OPTIONAL support, and it does not gate
//                                   simulation entry, so it stays held until it is audited on its own.
//
// P1-B5 published `deca-reading-scenarios` and P1-B6 published `deca-identifying-problem`. Both are
// SIMULATION PREREQUISITES, not drill owners: neither carries a `skillSlug` or a `practiceDrill`, so
// neither claims a mastery area nor is a substitute owner for one. The held entry is not a substitute
// owner either — B5 proved that directly — so it is not promoted here to make a target resolve.
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

/**
 * The DECA catalog slugs this file publishes, in teaching order.
 *
 * Exported so a suite can prove that this list and `HELD_DECA_CATALOG_SLUGS` PARTITION the DECA
 * catalog: every authored DECA entry is in exactly one of them. Without that, dropping a slug from
 * here silently un-publishes a lesson while every other control keeps passing — which is exactly
 * what a P1-B5 mutation found.
 */
export const PUBLISHED_DECA_SLUGS = ["deca-reading-scenarios", "deca-understanding-performance-indicators", "deca-identifying-problem", "deca-justifying-your-recommendation",
  "deca-handling-customer-situations", "deca-who-the-customer-is", "deca-why-they-choose-you", "deca-how-you-are-understood", "deca-the-offering-and-its-price", "deca-getting-it-to-the-customer", "deca-telling-them-about-it"] as const;

/** The DECA catalog entries that exist but are NOT learner-visible. Exported so a suite can prove it. */
export const HELD_DECA_CATALOG_SLUGS: readonly string[] = [
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

const readingScenarios = selectDecaCatalogLesson("deca-reading-scenarios");
const identifyingProblem = selectDecaCatalogLesson("deca-identifying-problem");
const understandingPerformanceIndicators = selectDecaCatalogLesson("deca-understanding-performance-indicators");
const justifyingYourRecommendation = selectDecaCatalogLesson("deca-justifying-your-recommendation");
const handlingCustomerSituations = selectDecaCatalogLesson("deca-handling-customer-situations");
const whoTheCustomerIs = selectDecaCatalogLesson("deca-who-the-customer-is");
const whyTheyChooseYou = selectDecaCatalogLesson("deca-why-they-choose-you");
const howYouAreUnderstood = selectDecaCatalogLesson("deca-how-you-are-understood");
const theOfferingAndItsPrice = selectDecaCatalogLesson("deca-the-offering-and-its-price");
const gettingItToTheCustomer = selectDecaCatalogLesson("deca-getting-it-to-the-customer");
const tellingThemAboutIt = selectDecaCatalogLesson("deca-telling-them-about-it");

/** Exported for the smoke suite's strict-identity proof against the catalog. */
export const PUBLISHED_DECA_SOURCES = {
  understandingPerformanceIndicators, justifyingYourRecommendation, handlingCustomerSituations,
  whoTheCustomerIs, whyTheyChooseYou, howYouAreUnderstood, theOfferingAndItsPrice, gettingItToTheCustomer, tellingThemAboutIt
} as const;

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
/**
 * P1-B5 — READING AND DECODING THE SCENARIO. A simulation PREREQUISITE, not a drill owner.
 *
 * WHY IT CARRIES NO `skillSlug` AND NO `practiceDrill`. The four DECA mastery areas each have exactly
 * one teaching owner already, and this lesson teaches none of them: it teaches what the card SAYS,
 * which is the step before deciding what the problem is or what to recommend. Giving it a skill slug
 * would either invent a fifth mastery area or steal an existing one's single remediation destination.
 * Giving it a `practiceDrill` would point a learner at questions that measure a different construct.
 * So it has neither, and `deca-practice-map` still reports 4/4 owners rather than 5.
 *
 * COURSE AND MODULE. The approved curriculum (docs/curriculum/02-deca-course.md) puts "Reading and
 * Decoding the Scenario" in Module 1 — Reading the Situation, inside the role-play performance
 * course. `deca-roleplay-core` is that course. It shares `deca-roleplay-skills` with the
 * performance-indicators lesson, which the same curriculum module also contains.
 *
 * ORDER. The curriculum runs role → scenario → indicators → prep, so this lesson comes BEFORE the
 * PI owner and `nextLessonId` points at it. The PI entry's own chain is unchanged.
 */
export const DECA_READING_SCENARIOS_LESSON: EducationRegistryEntry = {
  id: "deca-reading-scenarios",
  track: "DECA",
  courseId: "deca-roleplay-core",
  moduleId: "deca-roleplay-skills",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: readingScenarios,
  sourceKind: "concept-education-lesson",
  legacySlugs: [],
  nextLessonId: "deca-understanding-performance-indicators",
  provenance: AUTHORED_DECA_PROVENANCE
};

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
  nextLessonId: "deca-identifying-problem",
  provenance: AUTHORED_DECA_PROVENANCE
};

/**
 * P1-B6 — IDENTIFYING THE PROBLEM. The second and final simulation prerequisite, and a prerequisite
 * for the same reason the scenario-reading lesson is one: no `skillSlug`, no `practiceDrill`.
 *
 * WHERE IT SITS. The approved curriculum places "Identifying the Business Problem" in Module 2 —
 * Performing the Meeting, one step before Building Specific Recommendations and two before Business
 * Reasoning. So the chain runs scenario -> indicators -> problem -> business reasoning, which is the
 * order the curriculum itself teaches and the order the work actually happens in: read the card,
 * know what is being scored, work out what needs changing, then say why your answer makes sense.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It stops before recommendation-building. The held draft did not:
 * it asked which solution "fits retention" and told the learner the root problem is "why it is
 * happening", which is both a different lesson's job and a doctrine the scenario often cannot
 * support. Neither survives.
 */
export const DECA_IDENTIFYING_PROBLEM_LESSON: EducationRegistryEntry = {
  id: "deca-identifying-problem",
  track: "DECA",
  courseId: "deca-roleplay-core",
  moduleId: "deca-roleplay-skills",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: identifyingProblem,
  sourceKind: "concept-education-lesson",
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

/**
 * P1-B4 — the MARKETING FUNDAMENTALS units, MK1 to MK6.
 *
 * SIX LESSONS, ONE CLAIM. The approved curriculum defines MK1-MK6 as six lessons written to stand
 * alone, and the 30-item drill spreads across all six, so one page could not teach the area without
 * overclaiming. But an area needs exactly ONE remediation destination, so only MK1 carries
 * `skillSlug` and MK2-MK6 carry the practice CTA alone — the same shape the Debate answer-types and
 * turn-mechanics lessons use, and the shape the review-ladder controls already validate.
 *
 * They chain MK1 -> MK2 -> ... -> MK6, so a learner who starts at the gateway is walked through the
 * area in the curriculum's own order rather than left to find five more lessons on an index.
 */

export const DECA_MK1_LESSON: EducationRegistryEntry = {
  id: "deca-who-the-customer-is",
  track: "DECA",
  courseId: "deca-business-content",
  moduleId: "deca-marketing-basics",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: whoTheCustomerIs,
  sourceKind: "concept-education-lesson",
  // MK1 is the gateway: the ONE marketing entry that claims the skill, so remediation for a
  // failed marketing drill has a single destination.
  skillSlug: "deca-marketing",
  practiceDrill: { track: "deca", area: "marketing-fundamentals" },
  legacySlugs: [],
  nextLessonId: "deca-why-they-choose-you",
  provenance: STABLE_TEACHING_DECA_PROVENANCE
};

export const DECA_MK2_LESSON: EducationRegistryEntry = {
  id: "deca-why-they-choose-you",
  track: "DECA",
  courseId: "deca-business-content",
  moduleId: "deca-marketing-basics",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: whyTheyChooseYou,
  sourceKind: "concept-education-lesson",
  // CTA-only: practice destination without a skill claim, so MK1 stays the single claimed
  // teaching home for `deca-marketing` and reverse remediation cannot split.
  practiceDrill: { track: "deca", area: "marketing-fundamentals" },
  legacySlugs: [],
  nextLessonId: "deca-how-you-are-understood",
  provenance: STABLE_TEACHING_DECA_PROVENANCE
};

export const DECA_MK3_LESSON: EducationRegistryEntry = {
  id: "deca-how-you-are-understood",
  track: "DECA",
  courseId: "deca-business-content",
  moduleId: "deca-marketing-basics",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: howYouAreUnderstood,
  sourceKind: "concept-education-lesson",
  // CTA-only: practice destination without a skill claim, so MK1 stays the single claimed
  // teaching home for `deca-marketing` and reverse remediation cannot split.
  practiceDrill: { track: "deca", area: "marketing-fundamentals" },
  legacySlugs: [],
  nextLessonId: "deca-the-offering-and-its-price",
  provenance: STABLE_TEACHING_DECA_PROVENANCE
};

export const DECA_MK4_LESSON: EducationRegistryEntry = {
  id: "deca-the-offering-and-its-price",
  track: "DECA",
  courseId: "deca-business-content",
  moduleId: "deca-marketing-basics",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: theOfferingAndItsPrice,
  sourceKind: "concept-education-lesson",
  // CTA-only: practice destination without a skill claim, so MK1 stays the single claimed
  // teaching home for `deca-marketing` and reverse remediation cannot split.
  practiceDrill: { track: "deca", area: "marketing-fundamentals" },
  legacySlugs: [],
  nextLessonId: "deca-getting-it-to-the-customer",
  provenance: STABLE_TEACHING_DECA_PROVENANCE
};

export const DECA_MK5_LESSON: EducationRegistryEntry = {
  id: "deca-getting-it-to-the-customer",
  track: "DECA",
  courseId: "deca-business-content",
  moduleId: "deca-marketing-basics",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: gettingItToTheCustomer,
  sourceKind: "concept-education-lesson",
  // CTA-only: practice destination without a skill claim, so MK1 stays the single claimed
  // teaching home for `deca-marketing` and reverse remediation cannot split.
  practiceDrill: { track: "deca", area: "marketing-fundamentals" },
  legacySlugs: [],
  nextLessonId: "deca-telling-them-about-it",
  provenance: STABLE_TEACHING_DECA_PROVENANCE
};

export const DECA_MK6_LESSON: EducationRegistryEntry = {
  id: "deca-telling-them-about-it",
  track: "DECA",
  courseId: "deca-business-content",
  moduleId: "deca-marketing-basics",
  variant: "concept",
  visibility: "learner",
  practiceState: "available",
  source: tellingThemAboutIt,
  sourceKind: "concept-education-lesson",
  // CTA-only: practice destination without a skill claim, so MK1 stays the single claimed
  // teaching home for `deca-marketing` and reverse remediation cannot split.
  practiceDrill: { track: "deca", area: "marketing-fundamentals" },
  legacySlugs: [],
  nextLessonId: null,
  provenance: STABLE_TEACHING_DECA_PROVENANCE
};

export const DECA_PUBLISHED_LESSONS: readonly EducationRegistryEntry[] = [
  DECA_READING_SCENARIOS_LESSON,
  DECA_PERFORMANCE_INDICATORS_LESSON,
  DECA_IDENTIFYING_PROBLEM_LESSON,
  DECA_BUSINESS_REASONING_LESSON,
  DECA_CUSTOMER_RELATIONS_LESSON,
  DECA_MK1_LESSON,
  DECA_MK2_LESSON,
  DECA_MK3_LESSON,
  DECA_MK4_LESSON,
  DECA_MK5_LESSON,
  DECA_MK6_LESSON
];
