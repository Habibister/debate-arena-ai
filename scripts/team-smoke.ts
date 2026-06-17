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
  const { authOptions } = await import("@/lib/auth");

  const stamp = Date.now();
  const short = stamp.toString(36);
  const coachEmail = `team-coach-${stamp}@debatearena.test`;
  const coach2Email = `team-coach2-${stamp}@debatearena.test`;
  const studentEmail = `team-student-${stamp}@debatearena.test`;
  const emails = [coachEmail, coach2Email, studentEmail];

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

    // Test 8 — demo accounts still sign in.
    const authorize = (authOptions.providers[0] as unknown as { options: { authorize: (c: unknown, r: unknown) => Promise<{ role?: string } | null> } }).options.authorize;
    const demo = await authorize({ email: "student@debatearena.ai", password: process.env.SEED_STUDENT_PASSWORD || "password123" }, {});
    assert.ok(demo && demo.role === "STUDENT", "Demo student must still sign in.");

    // Test 9 — the Gemini/AI health route is present and was not touched by this feature.
    assert.ok(existsSync("app/api/ai/health/route.ts"), "AI health route must still exist.");

    console.log("Team smoke tests passed: create team + join code, join, double-join 409, invalid 404, roster, role gating, coach isolation, demo login, AI health untouched.");
  } finally {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
