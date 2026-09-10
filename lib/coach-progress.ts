import type { MasteryLevel, Organization } from "@prisma/client";
import { isCurrentScoringEra } from "@/lib/debate-scoring-era";
import { HttpError } from "@/lib/api";
import { INDEPENDENT_ROUND_WHERE } from "@/lib/guided-rounds";
import { prisma } from "@/lib/prisma";
import { debateMasteryHeld } from "@/lib/debate-drills";
import { coachMasteryFigure, coachRecommendations, resolveCoachOrganization } from "@/lib/coach-truth";

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function uniqueStrings(values: string[], limit: number) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit);
}

// HOSA H1. The mastery figure, the track a view belongs to and the next steps a coach may be shown all
// live in lib/coach-truth.ts now — pure, so each rule can be proved without the shared database. What
// used to be here was a local `buildRecommendations` with no idea which track it was speaking about:
// it read one blended pile of evidence and answered in General Debate's vocabulary, so a HOSA coach
// was told to "Run one AI debate round to get a judge ballot" for a track that has no round at all.

type CoachMasteryRow = {
  masteryPercent: number;
  masteryLevel: MasteryLevel;
  lastPracticedAt: Date | null;
  skill: { name: string; slug: string };
};

type CoachTestRow = {
  score: number | null;
  organization: Organization;
  eventType: string;
  weakAreas: string[];
  completedAt: Date | null;
};

// Returns a full progress summary for one student, but ONLY if the viewer is allowed to see it:
// the viewer must be an ADMIN, or a COACH who owns a team the student has joined. Otherwise throws
// a 403 — this is the server-side access control, not just UI hiding.
export async function getCoachStudentProgress(viewerUserId: string, studentId: string, viewerRole?: string | null) {
  const isAdmin = viewerRole === "ADMIN";

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      displayName: true,
      name: true,
      username: true,
      email: true,
      avatarUrl: true,
      image: true,
      role: true,
      level: true,
      xp: true,
      streak: true,
      wins: true,
      rank: true,
      // Read only as the fallback track context below, when an admin opens a student who is in no team.
      organization: true
    }
  });

  if (!student) {
    throw new HttpError("Student not found.", 404);
  }

  // Authorization + team context. The team also carries the ORGANIZATION this view belongs to: a coach
  // reaches a student through a team they own, and that team's stored organization is what makes this
  // "the HOSA view" or "the DECA view" rather than one blended pile of every track the student ever
  // touched. Nothing about the track is inferred — it is read from the row.
  let membership: { joinedAt: Date; team: { name: string; organization: Organization } } | null = null;
  if (isAdmin) {
    membership = await prisma.teamMember.findFirst({
      where: { userId: studentId },
      orderBy: { joinedAt: "asc" },
      select: { joinedAt: true, team: { select: { name: true, organization: true } } }
    });
  } else {
    const coach = await prisma.coach.findUnique({ where: { userId: viewerUserId }, select: { id: true } });
    if (!coach) {
      throw new HttpError("You do not have permission to view this student.", 403);
    }
    membership = await prisma.teamMember.findFirst({
      where: { userId: studentId, team: { coachId: coach.id } },
      orderBy: { joinedAt: "asc" },
      select: { joinedAt: true, team: { select: { name: true, organization: true } } }
    });
    if (!membership) {
      throw new HttpError("You do not have permission to view this student.", 403);
    }
  }

  // The one track this view speaks about. Null only when an admin opens a student with no team and no
  // signup organization; the aggregates below then stay empty rather than blending every track, and no
  // track-specific next step is offered (lib/coach-truth.ts).
  const organization = resolveCoachOrganization({
    teamOrganization: membership?.team.organization ?? null,
    studentOrganization: student.organization ?? null
  });

  // Debate performance (real rows only, INDEPENDENT rounds only). A guided lesson round is coached
  // practice on a curriculum-limited ballot: it has no whole-round score and its feedback names only
  // the taught skills, so it enters neither the judged-round count, the average, nor "latest judge
  // feedback" (lib/guided-rounds.ts). It still appears in the recent list below, labelled.
  const judgedDebates = await prisma.debate.findMany({
    where: { studentId, status: "JUDGED", ...INDEPENDENT_ROUND_WHERE },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      topic: true,
      overallScore: true,
      createdAt: true,
      completedAt: true,
      // Selected so a ballot from ANOTHER track cannot drive this view's next steps. The round list
      // and the judged-round count above stay account-wide (their queries are pinned by
      // coached-performance's guided-round controls); what this scopes is the advice.
      organization: true,
      strengths: true,
      weaknesses: true,
      recommendations: true,
      logicScore: true,
      evidenceScore: true,
      rebuttalScore: true,
      clarityScore: true,
      persuasionScore: true,
      communicationScore: true
    }
  });

  const recentDebates = await prisma.debate.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, topic: true, status: true, overallScore: true, practiceMode: true, createdAt: true }
  });

  const judgedRounds = judgedDebates.length;
  const wins = student.wins ?? 0;
  // M15 S1A A3a — the derived `losses` field is GONE. It was `judgedRounds - wins`, which was only
  // ever an inference, and A3a made it strictly false: the judge route was the sole writer of
  // `User.wins`, and it no longer increments it (a lexical/formative ballot may not mint a
  // competition win). So `wins` is now a frozen historical counter while `judgedRounds` keeps
  // climbing — the subtraction would have reported EVERY future judged round as a loss, showing a
  // coach "0 wins / 12 losses" for a student whose ballots mostly said they won. No `losses` column
  // and no `winner` column exist on Debate; that number corresponded to no recorded event, which is
  // fabricated progress in the negative direction.
  //
  // `wins` itself is still returned: it is a real stored value, it is untouched history, and no
  // UI reads it after this change. Relabelling the remaining historical "Wins" surfaces is A3b.
  // CURRENT SCORING ERA ONLY, and the SAME boundary the dashboard uses — one shared constant so the
  // coach and the student can never be shown averages over different populations. The transcript
  // judge withdrew a false weighing score on 2026-09-07 and renormalised the ballot, so rows either
  // side of it are not comparable; a mixed average would show a coach a decline the product created.
  // `judgedDebates` itself is NOT filtered: the round count, the latest round and the history list
  // still include every stored round. Only the average is scoped, and it stays null when the student
  // has no rounds yet under the current semantics rather than reporting 0.
  const averageDebateScore = average(
    judgedDebates
      .filter((d) => isCurrentScoringEra(d.completedAt))
      .map((d) => d.overallScore)
      .filter((s): s is number => typeof s === "number")
  );
  const latest = judgedDebates[0] ?? null;
  const latestFeedback = latest
    ? {
        strengths: latest.strengths ?? [],
        weaknesses: latest.weaknesses ?? [],
        recommendations: latest.recommendations ?? [],
        axisScores: {
          logic: latest.logicScore,
          evidence: latest.evidenceScore,
          rebuttal: latest.rebuttalScore,
          clarity: latest.clarityScore,
          persuasion: latest.persuasionScore,
          communication: latest.communicationScore
        }
      }
    : null;

  // Skill growth (MasteryProgress is the canonical skill table; empty => nothing recorded on this
  // track). Scoped through the skill's own organization — the same relationship the learner's record
  // reads (lib/learner-record.ts), so a coach and the student can never be looking at different
  // populations, and a DECA skill can never appear inside a HOSA view.
  const masteryRows: CoachMasteryRow[] = organization
    ? await prisma.masteryProgress.findMany({
        where: { userId: studentId, skill: { organization } },
        orderBy: [{ skill: { order: "asc" } }],
        select: { masteryPercent: true, masteryLevel: true, lastPracticedAt: true, skill: { select: { name: true, slug: true } } }
      })
    : [];
  // The row is kept exactly as recorded — nothing is deleted, hidden or recalculated. `updating` says
  // whether that number can still move: a skill whose durable record is suspended shows its real
  // history, and a coach can see that it is not currently growing rather than reading a stalled bar
  // as a student who stopped trying.
  const skills = masteryRows.map((row) => ({
    name: row.skill.name,
    masteryPercent: row.masteryPercent,
    masteryLevel: row.masteryLevel,
    lastPracticedAt: row.lastPracticedAt,
    updating: !debateMasteryHeld(row.skill.slug)
  }));

  // Tests — this track's only. A student may legitimately compete in more than one organization and
  // every row is kept; what changes here is that ONE view no longer averages them together. A DECA
  // score is not evidence about a HOSA student, and the weak categories below carry the same scope so
  // a HOSA coach cannot be shown "Marketing" as something their competitor needs to work on.
  const testRows: CoachTestRow[] = organization
    ? await prisma.practiceTest.findMany({
        where: { userId: studentId, organization },
        orderBy: { createdAt: "desc" },
        select: { score: true, organization: true, eventType: true, weakAreas: true, completedAt: true }
      })
    : [];
  const completedTests = testRows.filter((t) => t.completedAt !== null || typeof t.score === "number");
  const testAverage = average(completedTests.map((t) => t.score).filter((s): s is number => typeof s === "number"));
  const latestTest = completedTests[0] ?? null;
  const weakCategories = uniqueStrings(completedTests.flatMap((t) => t.weakAreas ?? []), 6);

  // Study / flashcards: there is no server-side flashcard progress model (study uses local-only
  // progress), so this is always an honest empty state rather than invented numbers.
  const study = { decksStudied: 0, cardsCompleted: 0, weakTerms: [] as string[] };

  // MASTERY IS EVIDENCE OR IT IS NOTHING (HOSA H1). This used to fall back to the practice-test
  // average whenever there were no mastery rows, and the page printed that number under the word
  // "Mastery". For a HOSA student it was ALWAYS that number: HOSA's only drill records a review
  // schedule and no mastery row at all. Null now means exactly what it says — nothing recorded on this
  // track — and a real recorded 0 still reports 0, because a measured zero is evidence and absence is
  // not (the same distinction lib/spaced-review.ts already draws).
  const masteryPercent = coachMasteryFigure(skills);

  // IN-TRACK EVIDENCE ONLY, for the advice. `latestFeedback` above is what the page SHOWS, and it is
  // account-wide because its query is pinned; feeding it to the recommendation engine would let a
  // General Debate ballot decide a DECA coach's next step — "Impact weighing lacked a clear value
  // comparison" contains "value", which is DECA's marketing signal. So the advice reads the newest
  // ballot from THIS track, and nothing when there is none.
  const inTrackJudged = organization ? judgedDebates.filter((round) => round.organization === organization) : [];
  const inTrackLatest = inTrackJudged[0] ?? null;

  // Activity, for the same reason, means activity ON THIS TRACK. Account-wide XP is not evidence that a
  // student has started the track a coach is looking at.
  const hasAnyActivity =
    inTrackJudged.length > 0 || skills.length > 0 || completedTests.length > 0;

  const recommendations = coachRecommendations({
    organization,
    hasAnyActivity,
    judgedRounds: inTrackJudged.length,
    completedTests: completedTests.length,
    weakSignals: [...(inTrackLatest?.weaknesses ?? []), ...weakCategories],
    // Only skills whose figure can still move. A frozen row stays visible in Skill growth with its
    // own note, but it must not drive a "next step" that cannot change it.
    lowMasterySkills: skills.filter((s) => s.updating && s.masteryPercent < 50).map((s) => s.name)
  });

  return {
    student: {
      id: student.id,
      displayName: student.displayName ?? student.name ?? student.username ?? "Student",
      username: student.username ?? "student",
      email: student.email ?? null,
      avatarUrl: student.avatarUrl ?? student.image ?? null,
      role: student.role,
      level: student.level,
      xp: student.xp ?? 0,
      streak: student.streak ?? 0,
      rank: student.rank ?? "BRONZE"
    },
    membership: { teamName: membership?.team.name ?? null, joinedAt: membership?.joinedAt ?? null },
    /** The track every aggregate below is scoped to. Null means unresolved — nothing is blended. */
    organization,
    masteryPercent,
    hasAnyActivity,
    debate: {
      judgedRounds,
      wins,
      averageScore: averageDebateScore,
      recent: recentDebates,
      latestFeedback
    },
    skills,
    tests: {
      completed: completedTests.length,
      averageScore: testAverage,
      latest: latestTest,
      weakCategories
    },
    study,
    recommendations
  };
}

// Last-activity timestamps for a set of users (one query), used to enrich the coach roster. Uses
// XPLog as the activity signal; users with no logged activity simply return null ("Not started").
export async function getLastActivityForUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, Date>();
  }
  const rows = await prisma.xPLog.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds } },
    _max: { createdAt: true }
  });
  const map = new Map<string, Date>();
  for (const row of rows) {
    if (row._max.createdAt) {
      map.set(row.userId, row._max.createdAt);
    }
  }
  return map;
}
