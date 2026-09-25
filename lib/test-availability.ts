import { EVENT_OPTIONS, type EventOption } from "@/lib/rubrics";
import { testingClustersForOrganization } from "@/lib/testing";

/**
 * WHAT MAY ACTUALLY BE TESTED (HOSA phase H3).
 *
 * The practice-test generator offered every event type in the registry and every category in the list,
 * and the API accepted any string at all. Three separate untruths came out of that:
 *
 *   • RETIRED TRACKS AS CURRENT ACTIONS. Model UN is soft-removed, yet its event types sat in the same
 *     enum the generator rendered from. Its stored history stays — a learner may reopen a Model UN
 *     record — but it is not something anyone may start today.
 *   • MODES THAT WERE DECLARED AND IGNORED. Every event option already carries `allowedModes`, and
 *     nothing read it. HOSA's Prepared Speaking excludes TEST because it is a prepared presentation,
 *     not a written exam, and it was offered for test generation anyway.
 *   • CATEGORIES WITH NOTHING BEHIND THEM. Fifteen of HOSA's sixteen categories have no question
 *     source. They were served by a template generator that substituted the category name into four
 *     recycled stems with one shared set of wrong answers — breadth with nothing inside it.
 *
 * One rule decides all three, and BOTH the client and the API ask it: an option is offered when its
 * organization is a track we train, its own `allowedModes` include TEST, and a real question source
 * exists for the category. Anything else fails closed. Narrow and true beats wide and hollow.
 *
 * Pure: no React, no prisma, no fetch, no provider.
 */

export type TestOrganization = "DECA" | "HOSA";

/**
 * The categories a real question source can serve today.
 *
 * DECA is unchanged: every cluster it has always offered stays offered, because this phase does not
 * touch DECA's product. HOSA narrows to the one category CompeteReady actually holds questions for —
 * the 180-item Medical Terminology bank (lib/hosa-medterm.ts). The remaining fifteen are not hidden
 * because they are unreal events; they are simply not testable here yet, and the surface says so.
 */
export const HOSA_TESTABLE_CATEGORY = "Medical Terminology";

/** Event types that may be used to generate a TEST, per the option's own declared modes. */
export function testableEventTypes(organization: TestOrganization): EventOption[] {
  return (EVENT_OPTIONS[organization] ?? []).filter((option) => option.allowedModes.includes("TEST"));
}

/** Categories with a question source behind them. */
export function testableCategories(organization: TestOrganization): string[] {
  const all = testingClustersForOrganization(organization);
  if (organization === "HOSA") {
    return all.filter((category) => category === HOSA_TESTABLE_CATEGORY);
  }
  return [...all];
}

/** Categories the organization lists but cannot test yet — named, so nothing disappears silently. */
export function untestableCategories(organization: TestOrganization): string[] {
  const testable = new Set(testableCategories(organization));
  return testingClustersForOrganization(organization).filter((category) => !testable.has(category));
}

/**
 * The one decision. The client renders from it; the API refuses anything it rejects, so hiding an
 * option in the UI is never the only thing standing between a learner and an unservable set.
 */
export function testSelectionIsServable(input: {
  organization: string;
  eventType: string;
  eventCluster?: string | null;
}): boolean {
  if (input.organization !== "DECA" && input.organization !== "HOSA") {
    return false;
  }
  const organization = input.organization as TestOrganization;
  if (!testableEventTypes(organization).some((option) => option.value === input.eventType)) {
    return false;
  }
  // A CATEGORY IS REQUIRED, NOT OPTIONAL. The creation schema marks `eventCluster` optional, so an
  // omitted category is a reachable request — and an earlier version of this rule answered "servable"
  // for it, which let a HOSA set be assembled for no category at all. Absence is not a selection.
  const categories = testableCategories(organization);
  if (!input.eventCluster) {
    return false;
  }
  return categories.includes(input.eventCluster);
}

/** Why a selection was refused, in words a learner can act on. Never blames them for our coverage. */
export function testUnavailableReason(input: {
  organization: string;
  eventType: string;
  eventCluster?: string | null;
}): string {
  if (input.organization !== "DECA" && input.organization !== "HOSA") {
    return "Practice tests are not available for this organization.";
  }
  const organization = input.organization as TestOrganization;
  if (!testableEventTypes(organization).some((option) => option.value === input.eventType)) {
    return "That event is not assessed with a written practice test.";
  }
  if (input.eventCluster && !testableCategories(organization).includes(input.eventCluster)) {
    return `Practice tests are not available for ${input.eventCluster} yet.`;
  }
  if (!input.eventCluster) {
    return "Choose an event category before generating a practice test.";
  }
  return "Practice tests are not available for this selection yet.";
}
