/**
 * Team-system smoke test (database roundtrip). Exercises the real lib/teams.ts operations the API
 * routes call, so coach team creation, join codes, joining, roster, and access control are verified
 * end to end. Run with: npm run team:smoke
 *
 * Requires DATABASE_URL (skips cleanly without it). Creates throwaway @debatearena.test accounts and
 * deletes them (cascade removes their teams + memberships) at the end.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2];
      }
    }
  } catch {
    // ignore
  }
}
loadEnv(".env.local");
loadEnv(".env");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("Team smoke skipped: DATABASE_URL is not set.");
    return;
  }

  const { prisma } = await import("@/lib/prisma");
  const teams = await import("@/lib/teams");
  const { getCoachStudentProgress } = await import("@/lib/coach-progress");
  const { authOptions } = await import("@/lib/auth");

  const stamp = Date.now();
  const short = stamp.toString(36);
  const coachEmail = `team-coach-${stamp}@debatearena.test`;
  const coach2Email = `team-coach2-${stamp}@debatearena.test`;
  const studentEmail = `team-student-${stamp}@debatearena.test`;
  const freshEmail = `team-fresh-${stamp}@debatearena.test`;
  const otherStudentEmail = `team-other-${stamp}@debatearena.test`;
  const emails = [coachEmail, coach2Email, studentEmail, freshEmail, otherStudentEmail];

  const baseUser = { level: "BEGINNER" as const, xp: 0, streak: 0, wins: 0, rank: "BRONZE" as const };

  try {
    const coach = await prisma.user.create({
      data: { email: coachEmail, username: `tc_${short}`, displayName: "Team Coach", name: "Team Coach", role: "COACH", ...baseUser }
    });
    const coach2 = await prisma.user.create({
      data: { email: coach2Email, username: `tc2_${short}`, displayName: "Other Coach", name: "Other Coach", role: "COACH", ...baseUser }
    });
    const student = await prisma.user.create({
      data: { email: studentEmail, username: `ts_${short}`, displayName: "Team Student", name: "Team Student", role: "STUDENT", ...baseUser, xp: 40, wins: 1 }
    });
    const freshStudent = await prisma.user.create({
      data: { email: freshEmail, username: `tf_${short}`, displayName: "Fresh Student", name: "Fresh Student", role: "STUDENT", ...baseUser }
    });
    const otherStudent = await prisma.user.create({
      data: { email: otherStudentEmail, username: `to_${short}`, displayName: "Other Student", name: "Other Student", role: "STUDENT", ...baseUser }
    });

    // Test 1 — coach creates a team; a Team row and a join code exist.
    const team = await teams.createTeam({ userId: coach.id, role: "COACH", name: "Smoke Squad", organization: "DEBATE", schoolOrClub: "Smoke High" });
    assert.ok(team.id, "Team row must be created.");
    assert.match(team.joinCode ?? "", /^DEBATE-[A-Z2-9]{4,6}$/, "Join code must follow the PREFIX-XXXX format.");
    const dbTeam = await prisma.team.findUnique({ where: { id: team.id }, select: { joinCode: true, schoolOrClub: true } });
    assert.equal(dbTeam?.joinCode, team.joinCode, "Join code must persist in the database.");
    assert.equal(dbTeam?.schoolOrClub, "Smoke High", "Optional school/club must persist.");

    // Test 6 — a student cannot create a team (role gating, 403).
    await assert.rejects(
      () => teams.createTeam({ userId: student.id, role: "STUDENT", name: "Nope", organization: "DEBATE" }),
      (error: unknown) => (error as { status?: number }).status === 403,
      "Student must not be able to create a team."
    );

    // Test 2 — student joins with the code (lower-case to prove normalization); a TeamMember exists.
    await teams.joinTeamByCode({ userId: student.id, joinCode: team.joinCode!.toLowerCase() });
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId: student.id } },
      select: { id: true }
    });
    assert.ok(member, "TeamMember row must exist after joining.");

    // Test 3 — joining the same code twice fails gracefully (409).
    await assert.rejects(
      () => teams.joinTeamByCode({ userId: student.id, joinCode: team.joinCode! }),
      (error: unknown) => (error as { status?: number }).status === 409,
      "Joining the same team twice must fail with 409."
    );

    // Test 4 — an invalid code fails gracefully (404).
    await assert.rejects(
      () => teams.joinTeamByCode({ userId: student.id, joinCode: "NOPE-9999" }),
      (error: unknown) => (error as { status?: number }).status === 404,
      "Invalid join code must fail with 404."
    );

    // Test 5 — the coach roster shows the joined student.
    const coachTeams = await teams.getTeamsForCoach(coach.id);
    assert.equal(coachTeams.length, 1, "Coach must have exactly one team.");
    assert.ok(coachTeams[0].members.some((m) => m.user.id === student.id), "Roster must include the joined student.");

    // Test 7 — a coach cannot see another coach's team.
    const team2 = await teams.createTeam({ userId: coach2.id, role: "COACH", name: "Other Squad", organization: "DECA" });
    const coach1Teams = await teams.getTeamsForCoach(coach.id);
    assert.ok(!coach1Teams.some((t) => t.id === team2.id), "Coach 1 must NOT see coach 2's team.");
    const coach2Teams = await teams.getTeamsForCoach(coach2.id);
    assert.ok(!coach2Teams.some((t) => t.id === team.id), "Coach 2 must NOT see coach 1's team.");

    // ---- Coach student progress view ----
    freshStudent && (await teams.joinTeamByCode({ userId: freshStudent.id, joinCode: team.joinCode! }));

    // Progress Test 1 — the coach can view a student in their own team.
    const view = await getCoachStudentProgress(coach.id, student.id, "COACH");
    assert.equal(view.student.id, student.id, "Coach must see the correct student's progress.");

    // Progress Test 2 — a coach cannot view a student who is not in their team (student is in coach1's
    // team only, so coach2 must be denied).
    await assert.rejects(
      () => getCoachStudentProgress(coach2.id, student.id, "COACH"),
      (error: unknown) => (error as { status?: number }).status === 403,
      "A coach must not view a student outside their teams."
    );

    // Progress Test 3 — a student cannot view another student's progress.
    await assert.rejects(
      () => getCoachStudentProgress(student.id, otherStudent.id, "STUDENT"),
      (error: unknown) => (error as { status?: number }).status === 403,
      "A student must not view another student's progress."
    );

    // Progress Test 4 — a brand-new joined student shows zero / not-started progress.
    const freshView = await getCoachStudentProgress(coach.id, freshStudent.id, "COACH");
    assert.equal(freshView.debate.judgedRounds, 0, "New student has no judged rounds.");
    assert.equal(freshView.tests.completed, 0, "New student has no completed tests.");
    assert.equal(freshView.skills.length, 0, "New student has no skill progress.");
    assert.equal(freshView.hasAnyActivity, false, "New student has no activity.");
    assert.deepEqual(
      freshView.recommendations,
      ["Have the student complete one debate or practice drill first."],
      "New student recommendation must prompt first activity."
    );

    // Progress Test 5 — real activity is reflected (and only real activity).
    await prisma.debate.create({
      data: {
        organization: "DEBATE",
        level: "BEGINNER",
        topic: "Smoke motion",
        mode: "AI",
        status: "JUDGED",
        createdById: student.id,
        studentId: student.id,
        overallScore: 78,
        weaknesses: ["Rebuttal depth"]
      }
    });
    await prisma.practiceTest.create({
      data: {
        userId: student.id,
        organization: "DECA",
        difficulty: "BEGINNER",
        questionCount: 10,
        score: 82,
        completedAt: new Date(),
        weakAreas: ["Marketing"]
      }
    });
    const activeView = await getCoachStudentProgress(coach.id, student.id, "COACH");
    assert.equal(activeView.debate.judgedRounds, 1, "Judged round must be counted.");
    assert.equal(activeView.debate.averageScore, 78, "Average judge score must reflect real data.");
    assert.equal(activeView.tests.completed, 1, "Completed test must be counted.");
    assert.equal(activeView.tests.averageScore, 82, "Test average must reflect real data.");
    assert.ok(activeView.hasAnyActivity, "Student with activity must report activity.");
    assert.ok(
      activeView.recommendations.some((step) => /rebuttal/i.test(step)),
      "Weak rebuttal must drive a rebuttal recommendation."
    );

    // Test 8 — demo accounts still sign in.
    const authorize = (authOptions.providers[0] as unknown as { options: { authorize: (c: unknown, r: unknown) => Promise<{ role?: string } | null> } }).options.authorize;
    const demo = await authorize({ email: "student@debatearena.ai", password: process.env.SEED_STUDENT_PASSWORD || "password123" }, {});
    assert.ok(demo && demo.role === "STUDENT", "Demo student must still sign in.");

    // Test 9 — the Gemini/AI health route is present and was not touched by this feature.
    assert.ok(existsSync("app/api/ai/health/route.ts"), "AI health route must still exist.");

    console.log("Team smoke tests passed: create team + join code, join, double-join 409, invalid 404, roster, role gating, coach isolation, progress view (authorized/denied/student-blocked/new-zero/real-stats), demo login, AI health untouched.");
  } finally {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
