// ---------------------------------------------------------------------------------------------
// Which DECA career clusters does the seeded competition spec actually cover? (Owner QA Repair 3C)
//
// Exactly ONE DECA specification is seeded: the Hotel and Lodging Management Series, whose sourced
// round structure is the Hospitality & Tourism cluster's. Everything that attributes an OFFICIAL
// fact to a learner's session — the prep/performance clock, a scenario's event name, a rubric —
// must first ask whether that spec covers the cluster the learner actually chose. A Finance
// role-play has no seeded spec, so it may run a CompeteReady practice timer but must never be told
// it is on an official clock.
//
// Pure and client-safe: no imports, no database, no React. One regex, one place, so the room, the
// setup screen and the scenario generator cannot drift apart about who is covered.
// ---------------------------------------------------------------------------------------------

/** The event whose 2026-2027 round structure is seeded and sourced. */
export const DECA_SPEC_EVENT_NAME = "Hotel and Lodging Management Series";

/** The label used when no seeded specification covers the learner's cluster. */
export const DECA_GENERIC_EVENT_NAME = "DECA role-play";

/** True only for the cluster the seeded specification actually covers. */
export function decaClusterHasOfficialSpec(cluster: string | null | undefined): boolean {
  return typeof cluster === "string" && /hospitality|tourism|lodging|hotel/i.test(cluster);
}

/** The event name to attribute for a cluster — the specific event only where it is covered. */
export function decaEventNameForCluster(cluster: string): string {
  return decaClusterHasOfficialSpec(cluster) ? DECA_SPEC_EVENT_NAME : DECA_GENERIC_EVENT_NAME;
}
