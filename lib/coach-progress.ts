import { HttpError } from "@/lib/api";
import { ratingLabel } from "@/lib/ai-personas";
import { prisma } from "@/lib/prisma";
import { calculateDebateRating } from "@/lib/xp";

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function uniqueStrings(values: string[], limit: number) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit);
}

function buildRecommendations(input: {
  hasAnyActivity: boolean;
  judgedRounds: number;
  completedTests: number;
  weakSignals: string[];
  lowMasterySkills: string[];
}) {
  if (!input.hasAnyActivity) {
    return ["Have the student complete one debate or practice drill first."];
  }

  const haystack = [...input.weakSignals, ...input.lowMasterySkills].join(" ").toLowerCase();
  const steps: string[] = [];

  if (/rebut|refut/.test(haystack)) {
    steps.push("Assign a rebuttal drill.");
  }
  if (/eviden|weigh|impact/.test(haystack)) {
    steps.push("Practice evidence weighing.");
  }
  if (/clar|deliver|communicat/.test(haystack)) {
    steps.push("Run a clarity-focused speaking rep.");
  }
  if (input.completedTests === 0) {
    steps.push("Complete one DECA/HOSA practice test.");
  }
  if (input.judgedRounds === 0) {
    steps.push("Run one AI debate round to get a judge ballot.");
  }

  if (steps.length === 0) {
    steps.push("Keep the momentum: assign one debate and one practice test this week.");
  }

  return uniqueStrings(steps, 5);
}

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
      rank: true
    }
  });

  if (!student) {
    throw new HttpError("Student not found.", 404);
  }

  // Authorization + team context.
  let membership: { joinedAt: Date; team: { name: string } } | null = null;
  if (isAdmin) {
    membership = await prisma.teamMember.findFirst({
      where: { userId: studentId },
      orderBy: { joinedAt: "asc" },
      select: { joinedAt: true, team: { select: { name: true } } }
    });
  } else {
    const coach = await prisma.coach.findUnique({ where: { userId: viewerUserId }, select: { id: true } });
    if (!coach) {
      throw new HttpError("You do not have permission to view this student.", 403);
    }
    membership = await prisma.teamMember.findFirst({
      where: { userId: studentId, team: { coachId: coach.id } },
      orderBy: { joinedAt: "asc" },
      select: { joinedAt: true, team: { select: { name: true } } }
    });
    if (!membership) {
      throw new HttpError("You do not have permission to view this student.", 403);
    }
  }

  // Debate performance (real rows only).
  const judgedDebates = await prisma.debate.findMany({
    where: { studentId, status: "JUDGED" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      topic: true,
      overallScore: true,
      createdAt: true,
      completedAt: true,
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
    select: { id: true, topic: true, status: true, overallScore: true, createdAt: true }
  });

  const judgedRounds = judgedDebates.length;
  const wins = student.wins ?? 0;
  const losses = Math.max(0, judgedRounds - wins);
  const averageDebateScore = average(judgedDebates.map((d) => d.overallScore).filter((s): s is number => typeof s === "number"));
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

  // Skill growth (MasteryProgress is the canonical skill table; empty => "Not started yet").
  const masteryRows = await prisma.masteryProgress.findMany({
    where: { userId: studentId },
    orderBy: [{ skill: { order: "asc" } }],
    select: { masteryPercent: true, masteryLevel: true, lastPracticedAt: true, skill: { select: { name: true } } }
  });
  const skills = masteryRows.map((row) => ({
    name: row.skill.name,
    masteryPercent: row.masteryPercent,
    masteryLevel: row.masteryLevel,
    lastPracticedAt: row.lastPracticedAt
  }));

  // Tests.
  const testRows = await prisma.practiceTest.findMany({
    where: { userId: studentId },
    orderBy: { createdAt: "desc" },
    select: { score: true, organization: true, eventType: true, weakAreas: true, completedAt: true }
  });
  const completedTests = testRows.filter((t) => t.completedAt !== null || typeof t.score === "number");
  const testAverage = average(completedTests.map((t) => t.score).filter((s): s is number => typeof s === "number"));
  const latestTest = completedTests[0] ?? null;
  const weakCategories = uniqueStrings(completedTests.flatMap((t) => t.weakAreas ?? []), 6);

  // Study / flashcards: there is no server-side flashcard progress model (study uses local-only
  // progress), so this is always an honest empty state rather than invented numbers.
  const study = { decksStudied: 0, cardsCompleted: 0, weakTerms: [] as string[] };

  const masteryPercent =
    skills.length > 0
      ? average(skills.map((s) => s.masteryPercent)) ?? 0
      : testAverage ?? 0;

  const rating = calculateDebateRating({ xp: student.xp, wins: student.wins, judgedDebates: judgedRounds });

  const hasAnyActivity =
    judgedRounds > 0 || recentDebates.length > 0 || skills.length > 0 || completedTests.length > 0 || (student.xp ?? 0) > 0;

  const recommendations = buildRecommendations({
    hasAnyActivity,
    judgedRounds,
    completedTests: completedTests.length,
    weakSignals: [...(latestFeedback?.weaknesses ?? []), ...weakCategories],
    lowMasterySkills: skills.filter((s) => s.masteryPercent < 50).map((s) => s.name)
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
    rating,
    ratingLabel: ratingLabel(rating),
    masteryPercent,
    hasAnyActivity,
    debate: {
      judgedRounds,
      wins,
      losses,
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
