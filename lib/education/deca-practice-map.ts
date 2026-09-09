import type { DecaDrillArea } from "@/lib/deca-drills";
import { DECA_DRILL_AREAS } from "@/lib/deca-drills";
import type { DecaPracticeDrill } from "@/lib/education/types";

/**
 * THE CANONICAL DECA PRACTICE MAP (P1-A, 2026-09-09).
 *
 * DECA's four drill areas each write real mastery to a real Skill row, but the B5 architecture audit
 * established that NONE of them has a lesson that teaches its construct: the three held DECA lessons
 * (scenario reading, problem identification, professional communication) are orthogonal to all four
 * drilled constructs. This module records that truth explicitly instead of leaving it to be inferred
 * from string matching, and it is the single place a later phase attaches real teaching owners.
 *
 * It also records a distinction the product had not modelled. The official event is a cluster exam
 * plus role-plays, and the four areas split cleanly across those two components: performance
 * indicators and business reasoning are ROLE-PLAY skills, while customer relations and marketing
 * fundamentals are CLUSTER KNOWLEDGE that the exam tests. Practice can group by this without a new
 * top-level surface.
 *
 * P1-A invented no teaching owner: every `publishedTeachingOwner` was null, and remediation resolved
 * to nothing for every DECA skill. P1-B1 closed the first by publishing
 * `deca-understanding-performance-indicators`; P1-B2 closed the second with
 * `deca-justifying-your-recommendation`. Both ROLE-PLAY areas are now owned and resolve. The two
 * CLUSTER-KNOWLEDGE areas the exam tests are untouched and still ownerless — a map with two real
 * owners and two honest nulls, never four plausible-looking ones.
 */

/** Which half of the DECA competition a drill area serves. */
export type DecaCompetitionComponent = "roleplay" | "exam";

/** What teaching actually exists for a construct today. Only "owned" may back remediation. */
export type DecaTeachingCoverage =
  /** A published, learner-visible lesson owns this construct end to end. */
  | "owned"
  /** A published lesson touches it at orientation depth but does not own it. Not a remediation target. */
  | "orientation-only"
  /** No published lesson addresses it at all. */
  | "none";

export type DecaPracticeMapping = {
  area: DecaDrillArea;
  /** The exact existing Skill row slug this area's mastery writes to. Never invented here. */
  skillSlug: string;
  component: DecaCompetitionComponent;
  /** The published lesson id that OWNS teaching this construct, or null while none exists. */
  publishedTeachingOwner: string | null;
  coverage: DecaTeachingCoverage;
  /** Why the owner is what it is, so a later phase does not have to re-derive the judgement. */
  note: string;
};

export const DECA_PRACTICE_MAP: readonly DecaPracticeMapping[] = [
  {
    area: "performance-indicators",
    skillSlug: "deca-performance-indicators",
    component: "roleplay",
    publishedTeachingOwner: "deca-understanding-performance-indicators",
    coverage: "owned",
    note:
      "P1-B1 published the teaching owner. It owns decoding an indicator into a plain question, reading " +
      "its subject and full predicate, letting the verb set the job, explaining the idea and using it on " +
      "the scenario, covering every listed indicator, and checking the result the indicator names. " +
      "STILL DRILL-ONLY, recorded so the gap is not mistaken for coverage: the instructional-area rules " +
      "(pi-09, pi-24), how far an assigned role's authority extends (pi-17), and separating the scored " +
      "list from problem, constraint and roles on the card (pi-20). pi-26 stays HELD regardless — its " +
      "weighting claim needs a primary official source that does not exist yet. how-deca-roleplay-works " +
      "remains the ORIENTATION owner and is not the remediation destination."
  },
  {
    area: "business-reasoning",
    skillSlug: "deca-business-reasoning",
    component: "roleplay",
    publishedTeachingOwner: "deca-justifying-your-recommendation",
    coverage: "owned",
    note:
      "P1-B2 published the teaching owner. Orientation's scaffold names a business-reason step; this " +
      "lesson teaches how to fill it — feasibility against every stated limit, what counts as a material " +
      "cost, building the reason from facts the scenario supplies rather than a rule true of any " +
      "business, measurement as metric plus comparison plus target, picking the measure the stated " +
      "problem names, checking the business can collect it, pairing a cost with the return, and a " +
      "tradeoff that names both sides. STILL DRILL-ONLY, recorded so the gap is not mistaken for " +
      "coverage: ROI and break-even as formal definitions (br-02, br-06 — the DECA Finance deck defines " +
      "both; this lesson gives one plain-language clause and no formula), arithmetic on stem numbers " +
      "(br-11, br-18, br-30), sequencing and multi-constraint scheduling (br-16, br-19 — the bank " +
      "deliberately names no sequencing method), settlement and cash flow (br-24), impact/effort " +
      "prioritisation (br-09), and exposure larger than a headline percentage (br-21)."
  },
  {
    area: "customer-relations",
    skillSlug: "deca-customer-relations",
    component: "exam",
    publishedTeachingOwner: null,
    coverage: "none",
    note: "Cluster knowledge the exam tests. No published lesson addresses it."
  },
  {
    area: "marketing-fundamentals",
    skillSlug: "deca-marketing",
    component: "exam",
    publishedTeachingOwner: null,
    coverage: "none",
    note: "Cluster knowledge the exam tests. No published lesson addresses it."
  }
];

export function decaPracticeMappingForArea(area: string): DecaPracticeMapping | undefined {
  return DECA_PRACTICE_MAP.find((mapping) => mapping.area === area);
}

export function decaPracticeMappingForSkill(skillSlug: string): DecaPracticeMapping | undefined {
  return DECA_PRACTICE_MAP.find((mapping) => mapping.skillSlug === skillSlug);
}

/** The two Practice groupings, derived from the map rather than hardcoded in a view. */
export function decaPracticeAreasByComponent(component: DecaCompetitionComponent): DecaPracticeMapping[] {
  return DECA_PRACTICE_MAP.filter((mapping) => mapping.component === component);
}

export type DecaRemediationTarget = {
  skillSlug: string;
  lessonId: string;
  drill: DecaPracticeDrill;
};

/**
 * The DECA remediation destination for a skill, or null when there is no truthful one.
 *
 * Returns null unless the mapping names a published teaching owner AND that owner is currently
 * learner-visible. Coverage of "orientation-only" is NOT enough: sending a learner who failed the
 * indicator drill to a lesson that merely mentions indicators would be the kind of plausible-looking
 * destination this architecture exists to prevent. Today every mapping yields null, by data rather
 * than by structure — the resolution mechanism is exercised by passing a map with a real owner.
 *
 * `isPublishedLesson` is injected so the mechanism can be proved without publishing anything.
 */
export function decaRemediationTargetForSkill(
  skillSlug: string,
  isPublishedLesson: (lessonId: string) => boolean,
  map: readonly DecaPracticeMapping[] = DECA_PRACTICE_MAP
): DecaRemediationTarget | null {
  const mapping = map.find((entry) => entry.skillSlug === skillSlug);
  if (!mapping) return null;
  if (mapping.coverage !== "owned") return null;
  const owner = mapping.publishedTeachingOwner;
  if (!owner || !isPublishedLesson(owner)) return null;
  return { skillSlug: mapping.skillSlug, lessonId: owner, drill: { track: "deca", area: mapping.area } };
}

/** Control: the map must cover every declared DECA drill area exactly once, with no invented area. */
export function decaPracticeMapCoversEveryArea(): boolean {
  const declared = DECA_DRILL_AREAS.map((area) => area.id).sort();
  const mapped = DECA_PRACTICE_MAP.map((mapping) => mapping.area).sort();
  return declared.length === mapped.length && declared.every((id, i) => id === mapped[i]);
}
