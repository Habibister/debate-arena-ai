import { DECA_EVENT_CLUSTERS } from "@/lib/testing";
import { findDecaEventRecords, findDecaFamilies, type DecaEventRecord, type DecaFamilyRecord } from "@/lib/deca-events";

/**
 * DECA Navigator SEARCH (Final DECA cleanup).
 *
 * This lives outside `lib/deca-events.ts` on purpose. That registry is the single source of DECA
 * FACTS and is pinned pure — `scripts/deca-navigator-smoke.ts` asserts it has no runtime import at
 * all — so the composite search, which needs the practice-test cluster list from `lib/testing.ts`,
 * belongs here instead. The registry keeps owning the data; this module only decides what a typed
 * query can reach.
 *
 * Three kinds of answer, never merged: a FAMILY (what the record models), an EVENT we hold a page
 * for, and a practice-test CLUSTER (a CompeteReady capability, not DECA's taxonomy). Each is rendered
 * under its own heading so a match cannot be read as a kind of support it is not.
 */

/**
 * The practice-test clusters a learner can actually generate questions for. Searching "Marketing" or
 * "Finance" found nothing before, even though both name a cluster the product offers — so a learner
 * typing their cluster concluded the product had no path for it. This is a CompeteReady practice
 * capability, not DECA's taxonomy, and the surface that shows it says so.
 */
export function findDecaTestClusters(query: string | null | undefined): string[] {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return [];
  return DECA_EVENT_CLUSTERS.filter((cluster) => cluster.toLowerCase().includes(q));
}

export type DecaNavigatorSearch = {
  families: DecaFamilyRecord[];
  events: DecaEventRecord[];
  clusters: string[];
};

/**
 * One search over everything the DECA record can answer with: families (unchanged), the events we
 * hold a page for, and the practice-test clusters. Each group is rendered under its own heading, so
 * a match can never be mistaken for a different kind of support than it is.
 */
export function searchDecaNavigator(query: string | null | undefined): DecaNavigatorSearch {
  return {
    families: findDecaFamilies(query),
    events: findDecaEventRecords(query),
    clusters: findDecaTestClusters(query)
  };
}
