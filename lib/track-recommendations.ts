import type { Organization } from "@prisma/client";

// C5B1: a track's "Recommended next" weak areas come ONLY from that track's own graded tests. A
// weakness from another track (e.g. a prior HOSA Medical Terminology test) may live in global
// history/progress, but it must never become the ACTIVE track's recommendation.
//
// Fail closed: when the active track is unresolved (no organization), return nothing — an absent
// track never surfaces another track's weakness.
export function weakAreasForTrack(
  tests: Array<{ organization: Organization; weakAreas: string[] }>,
  activeOrg?: Organization | null,
  limit = 3
): string[] {
  if (!activeOrg) return [];
  // Most recent test (tests are passed newest-first) that belongs to THIS track and has weak areas.
  for (const test of tests) {
    if (test.organization !== activeOrg) continue;
    if (test.weakAreas.length > 0) return test.weakAreas.slice(0, limit);
  }
  return [];
}
