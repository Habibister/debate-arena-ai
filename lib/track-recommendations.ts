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

// ---------------------------------------------------------------------------------------------
// Owner QA Repair 3B — learner-record truth helpers. Pure, so Home, the Dashboard and the Study
// Arcade can summarise the SAME rows the same way and never contradict each other.
// ---------------------------------------------------------------------------------------------

export type PracticeTestSummary = {
  /** Completed tests in the window handed in (already track-scoped by the caller's query). */
  completed: number;
  /** Mean score across them — NULL when there is nothing to average. Absence is not zero. */
  average: number | null;
};

/**
 * The mean of the practice-test scores handed in, or null when none carries a score. A learner with
 * no completed test has NO average — rendering 0% would claim a measured result that does not exist.
 */
export function summarizePracticeTests(tests: Array<{ score: number | null }>): PracticeTestSummary {
  const scores = tests.map((test) => test.score).filter((score): score is number => typeof score === "number");
  if (scores.length === 0) return { completed: tests.length, average: null };
  return { completed: tests.length, average: Math.round(scores.reduce((total, score) => total + score, 0) / scores.length) };
}

export type FlaggedTest = {
  /** The graded test whose weak areas are being shown — the evidence for the personal claim. */
  testId: string;
  weakAreas: string[];
  /** True only when that test is the learner's most recent completed test on this track. */
  isLatest: boolean;
};

/**
 * The most recent completed test on the ACTIVE track that recorded weak areas, with its id, so a
 * recommendation can say exactly which graded test flagged it and link to that test's own feedback.
 * Same selection rule as `weakAreasForTrack`; fails closed the same way (no track -> nothing).
 */
export function flaggedTestForTrack(
  tests: Array<{ id: string; organization: Organization; weakAreas: string[] }>,
  activeOrg?: Organization | null,
  limit = 3
): FlaggedTest | null {
  if (!activeOrg) return null;
  const onTrack = tests.filter((test) => test.organization === activeOrg);
  for (let index = 0; index < onTrack.length; index += 1) {
    const test = onTrack[index];
    if (test.weakAreas.length > 0) return { testId: test.id, weakAreas: test.weakAreas.slice(0, limit), isLatest: index === 0 };
  }
  return null;
}
