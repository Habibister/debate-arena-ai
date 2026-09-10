import type { Organization } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { summarizePracticeTests } from "@/lib/track-recommendations";

// ---------------------------------------------------------------------------------------------
// Owner QA Repair 3B — the learner's TRACK-SCOPED practice record, read once and read the same way
// by Home and the Dashboard, so the two never contradict each other and never hand a DECA or HOSA
// learner a number that belongs to another track (or to the whole account).
//
// Every figure here is scoped through the row's own organization — a practice test's `organization`,
// a mastery row's `skill.organization` (the same relationship the Study Arcade's record tile and the
// review queue use). Nothing is inferred and nothing is invented: an average with nothing to average
// is NULL, never 0%.
// ---------------------------------------------------------------------------------------------

export type TrackPracticeRecord = {
  /** Completed practice tests on this track, all time — rows graded with a completion time, the same population the recent window reads. */
  testsCompleted: number;
  /** Mean score of the most recent completed tests on this track (up to five) — null when none. */
  recentAverage: number | null;
  /** Skills on this track with a recorded drill result (MasteryProgress with a practice timestamp). */
  recordedSkills: number;
};

export const RECENT_TEST_WINDOW = 5;

/**
 * The most recent completed tests on a track — the one window both Home and the Dashboard read.
 * "Recent" is only knowable for a row that carries a completion time: a COMPLETED row without one
 * (a hand-made or seeded fixture — the grade route always stamps it) cannot be placed in time, so it
 * is left out of this window rather than sorting first (PostgreSQL puts NULLs first under DESC) and
 * being called "your latest" — and, for the same reason, it is not counted in `testsCompleted`
 * either: one population, so "N completed" and "no completed tests yet" can never sit side by side.
 */
export function recentCompletedTestsQuery(userId: string, organization: Organization) {
  return {
    where: { userId, status: "COMPLETED" as const, organization, completedAt: { not: null } },
    orderBy: { completedAt: "desc" as const },
    take: RECENT_TEST_WINDOW
  };
}

export async function trackPracticeRecord(userId: string, organization: Organization): Promise<TrackPracticeRecord> {
  const [testsCompleted, recent, recordedSkills] = await Promise.all([
    prisma.practiceTest.count({ where: { userId, status: "COMPLETED", organization, completedAt: { not: null } } }),
    prisma.practiceTest.findMany({ ...recentCompletedTestsQuery(userId, organization), select: { score: true } }),
    prisma.masteryProgress.count({ where: { userId, lastPracticedAt: { not: null }, skill: { organization } } })
  ]);
  return { testsCompleted, recentAverage: summarizePracticeTests(recent).average, recordedSkills };
}
