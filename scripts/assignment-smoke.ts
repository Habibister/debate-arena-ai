/**
 * Assignment-system smoke test (database roundtrip).
 *
 * Run with: npm run assignment:smoke
 * Requires DATABASE_URL and the additive assignment schema to be applied with npm run db:push.
 * Creates throwaway @debatearena.test accounts and deletes them at the end.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

async function offlineSchemaChecks() {
  // Regression: the coach form sends a browser `datetime-local` value ("2026-07-10T14:30" — no
  // seconds/timezone). The old schema only accepted full ISO / date strings and rejected this as
  // "Invalid request body". These checks run without a database so the fix is always verified.
  const { assignmentCreateSchema } = await import("@/lib/validators");
  const base = {
    teamId: "team_1",
    type: "DEBATE_ROUND" as const,
    title: "Due-date drill",
    instructions: "Complete the assigned round.",
    targetAllTeam: true,
    studentIds: [],
    targetId: null,
    points: null
  };

  const withDueDate = assignmentCreateSchema.parse({ ...base, dueDate: "2026-07-10T14:30" });
  assert.ok(withDueDate.dueDate instanceof Date && !Number.isNaN(withDueDate.dueDate.getTime()), "datetime-local due date must parse to a valid Date (no 'Invalid request body').");
  assert.equal(assignmentCreateSchema.parse({ ...base, dueDate: "" }).dueDate, null, "empty due date -> no due date");
  assert.equal(assignmentCreateSchema.parse({ ...base, dueDate: null }).dueDate, null, "null due date -> no due date");
  assert.ok(assignmentCreateSchema.parse({ ...base, dueDate: "2026-07-10" }).dueDate instanceof Date, "plain date string still accepted");
  assert.throws(() => assignmentCreateSchema.parse({ ...base, dueDate: "not-a-date" }), /valid due date/i, "invalid due date gives a specific error, not a generic rejection");

  console.log("Assignment offline checks passed: datetime-local + date + empty due dates accepted; invalid due date gives a clear field error.");
}

async function main() {
  await offlineSchemaChecks();

  if (!process.env.DATABASE_URL) {
    console.log("Assignment smoke (database) skipped: DATABASE_URL is not set.");
    return;
  }

  const { prisma } = await import("@/lib/prisma");
  const teams = await import("@/lib/teams");
  const assignments = await import("@/lib/assignments");
  const { completionStats } = await import("@/lib/assignment-types");
  const { deckSummaries } = await import("@/lib/study-content");

  const stamp = Date.now();
  const short = stamp.toString(36);
  const coachEmail = `assign-coach-${stamp}@debatearena.test`;
  const coach2Email = `assign-coach2-${stamp}@debatearena.test`;
  const studentEmail = `assign-student-${stamp}@debatearena.test`;
  const teammateEmail = `assign-teammate-${stamp}@debatearena.test`;
  const outsideEmail = `assign-outside-${stamp}@debatearena.test`;
  const emails = [coachEmail, coach2Email, studentEmail, teammateEmail, outsideEmail];
  const baseUser = { level: "BEGINNER" as const, xp: 0, streak: 0, wins: 0, rank: "BRONZE" as const };

  try {
    const coach = await prisma.user.create({
      data: { email: coachEmail, username: `ac_${short}`, displayName: "Assignment Coach", name: "Assignment Coach", role: "COACH", ...baseUser }
    });
    const coach2 = await prisma.user.create({
      data: { email: coach2Email, username: `ac2_${short}`, displayName: "Other Coach", name: "Other Coach", role: "COACH", ...baseUser }
    });
    const student = await prisma.user.create({
      data: { email: studentEmail, username: `as_${short}`, displayName: "Assigned Student", name: "Assigned Student", role: "STUDENT", ...baseUser }
    });
    const teammate = await prisma.user.create({
      data: { email: teammateEmail, username: `at_${short}`, displayName: "Assigned Teammate", name: "Assigned Teammate", role: "STUDENT", ...baseUser }
    });
    const outside = await prisma.user.create({
      data: { email: outsideEmail, username: `ao_${short}`, displayName: "Outside Student", name: "Outside Student", role: "STUDENT", ...baseUser }
    });

    const team = await teams.createTeam({ userId: coach.id, role: "COACH", name: "Assignment Squad", organization: "DEBATE" });
    await teams.joinTeamByCode({ userId: student.id, joinCode: team.joinCode! });
    await teams.joinTeamByCode({ userId: teammate.id, joinCode: team.joinCode! });

    // A DECA team for track-specific content (decks/tests) — track compatibility is enforced by team org.
    const decaTeam = await teams.createTeam({ userId: coach.id, role: "COACH", name: "DECA Squad", organization: "DECA" });
    await teams.joinTeamByCode({ userId: student.id, joinCode: decaTeam.joinCode! });
    await teams.joinTeamByCode({ userId: teammate.id, joinCode: decaTeam.joinCode! });

    // 1. Coach creates an assignment for a team.
    const debateAssignment = await assignments.createAssignment({
      coachUserId: coach.id,
      role: "COACH",
      input: {
        teamId: team.id,
        type: "DEBATE_ROUND",
        title: "Complete one judged round",
        instructions: "Finish a judged debate and submit the debate.",
        dueDate: null,
        targetAllTeam: true,
        studentIds: [],
        targetId: null,
        points: null
      }
    });
    assert.ok(debateAssignment.id, "Assignment must be created.");

    // 1b. Coach creates a DUE-DATED assignment through the REAL validation schema (browser
    // datetime-local value). This is the end-to-end regression check for the "Invalid request body"
    // bug: it must create, persist a due date, and be visible to the student.
    const { assignmentCreateSchema } = await import("@/lib/validators");
    const dueInput = assignmentCreateSchema.parse({
      teamId: team.id,
      type: "DEBATE_ROUND",
      title: "Due Friday round",
      instructions: "Finish a judged debate before the due date.",
      dueDate: "2026-07-10T14:30",
      targetAllTeam: true,
      studentIds: [],
      targetId: null,
      points: null
    });
    const dueAssignment = await assignments.createAssignment({ coachUserId: coach.id, role: "COACH", input: dueInput });
    assert.ok(dueAssignment.id, "Due-dated assignment must be created (not rejected as invalid).");
    const dueVisible = await assignments.getStudentAssignments(student.id);
    const seenDue = dueVisible.find((assignment) => assignment.id === dueAssignment.id);
    assert.ok(seenDue, "Student must see the due-dated assignment.");
    assert.ok(seenDue?.dueDate instanceof Date, "Persisted assignment retains its due date.");

    // 2. Student in the team sees the assignment.
    const visibleToStudent = await assignments.getStudentAssignments(student.id);
    assert.ok(visibleToStudent.some((assignment) => assignment.id === debateAssignment.id), "Team student must see team assignment.");

    // 3. Student outside the team does not see the assignment.
    const visibleToOutside = await assignments.getStudentAssignments(outside.id);
    assert.ok(!visibleToOutside.some((assignment) => assignment.id === debateAssignment.id), "Outside student must not see team assignment.");

    // 4/5. Individually selected student sees the assignment; non-selected teammate does not.
    const selectedAssignment = await assignments.createAssignment({
      coachUserId: coach.id,
      role: "COACH",
      input: {
        teamId: decaTeam.id,
        type: "PRACTICE_TEST",
        title: "Selected test drill",
        instructions: "Complete one practice test.",
        dueDate: null,
        targetAllTeam: false,
        studentIds: [student.id],
        targetId: null,
        points: null
      }
    });
    const selectedVisible = await assignments.getStudentAssignments(student.id);
    const teammateVisible = await assignments.getStudentAssignments(teammate.id);
    assert.ok(selectedVisible.some((assignment) => assignment.id === selectedAssignment.id), "Selected student must see selected assignment.");
    assert.ok(!teammateVisible.some((assignment) => assignment.id === selectedAssignment.id), "Non-selected teammate must not see selected assignment.");

    // 6/7. Coach can view progress; other coach cannot.
    const coachDetail = await assignments.getCoachAssignmentDetail({ assignmentId: debateAssignment.id, userId: coach.id, role: "COACH" });
    assert.equal(coachDetail.id, debateAssignment.id, "Coach must view own assignment detail.");
    await assert.rejects(
      () => assignments.getCoachAssignmentDetail({ assignmentId: debateAssignment.id, userId: coach2.id, role: "COACH" }),
      (error: unknown) => (error as { status?: number }).status === 404,
      "Other coach must not view this assignment."
    );

    // 8/11. Student can start only their own assignment; start does not mark complete.
    const started = await assignments.startAssignment({ assignmentId: debateAssignment.id, userId: student.id });
    assert.equal(started.submission.status, "IN_PROGRESS", "Starting assignment must set IN_PROGRESS.");
    await assert.rejects(
      () => assignments.startAssignment({ assignmentId: debateAssignment.id, userId: outside.id }),
      (error: unknown) => (error as { status?: number }).status === 404,
      "Outside student must not start assignment."
    );

    // 12. Completion is not recorded without valid evidence.
    await assert.rejects(
      () => assignments.completeAssignment({ assignmentId: debateAssignment.id, userId: student.id, input: { evidenceId: "", evidenceType: undefined, notes: undefined } }),
      (error: unknown) => (error as { status?: number }).status === 400,
      "Completion without evidence must fail."
    );

    const otherStudentDebate = await prisma.debate.create({
      data: {
        organization: "DEBATE",
        level: "BEGINNER",
        topic: "Evidence ownership smoke",
        mode: "AI",
        status: "JUDGED",
        createdById: teammate.id,
        studentId: teammate.id,
        overallScore: 80
      }
    });

    // 9/10/18. Student cannot submit another student's evidence.
    await assert.rejects(
      () =>
        assignments.completeAssignment({
          assignmentId: debateAssignment.id,
          userId: student.id,
          input: { evidenceId: otherStudentDebate.id, evidenceType: "DEBATE", notes: undefined }
        }),
      (error: unknown) => (error as { status?: number }).status === 403,
      "Student must not submit another student's evidence."
    );

    const ownDebate = await prisma.debate.create({
      data: {
        organization: "DEBATE",
        level: "BEGINNER",
        topic: "Valid evidence smoke",
        mode: "AI",
        status: "JUDGED",
        createdById: student.id,
        studentId: student.id,
        overallScore: 84
      }
    });
    const completed = await assignments.completeAssignment({
      assignmentId: debateAssignment.id,
      userId: student.id,
      input: { evidenceId: ownDebate.id, evidenceType: "DEBATE", notes: "Completed the required judged debate." }
    });
    assert.equal(completed.status, "COMPLETED", "Valid owned evidence must complete the assignment.");

    // 13. Completion rate is calculated from the assigned student roster.
    const updatedDetail = await assignments.getCoachAssignmentDetail({ assignmentId: debateAssignment.id, userId: coach.id, role: "COACH" });
    const assignedIds = assignments.getAssignedStudentIds(updatedDetail);
    const statusByStudent = new Map(updatedDetail.submissions.map((submission) => [submission.studentId, submission.status]));
    const stats = completionStats(assignedIds.map((id) => statusByStudent.get(id) ?? "NOT_STARTED"));
    assert.equal(stats.total, 2, "Full-team denominator must include assigned team students only.");
    assert.equal(stats.completed, 1, "One of two assigned students has completed.");
    assert.equal(stats.completionRate, 50, "Completion rate must be based on assigned roster.");

    // Reflection-only activities can complete with a meaningful manual note.
    const deckAssignment = await assignments.createAssignment({
      coachUserId: coach.id,
      role: "COACH",
      input: {
        teamId: decaTeam.id,
        type: "FLASHCARD_DECK",
        title: "Study vocabulary",
        instructions: "Review the deck and submit a reflection.",
        dueDate: null,
        targetAllTeam: false,
        studentIds: [student.id],
        targetId: "deca-marketing",
        points: null
      }
    });
    const reflected = await assignments.completeAssignment({
      assignmentId: deckAssignment.id,
      userId: student.id,
      input: { evidenceType: "MANUAL_REFLECTION", evidenceId: deckAssignment.id, notes: "I reviewed the deck and still need more practice with pricing terms." }
    });
    assert.equal(reflected.status, "COMPLETED", "Manual reflection should complete supported study assignments.");

    // ---- Assignment track compatibility (server enforcement) ----
    // The team's org — not the coach's preference — decides validity. A DEBATE team cannot be assigned
    // a DECA/HOSA-only type, and a DECA team cannot be assigned HOSA content. Both are field-specific 400s.
    await assert.rejects(
      () =>
        assignments.createAssignment({
          coachUserId: coach.id,
          role: "COACH",
          input: { teamId: team.id, type: "FLASHCARD_DECK", title: "Bad type", instructions: "should be rejected", dueDate: null, targetAllTeam: true, studentIds: [], targetId: "deca-marketing", points: null }
        }),
      (error: unknown) => (error as { status?: number }).status === 400 && /type:/i.test((error as Error).message),
      "A DEBATE team must not accept a DECA-only FLASHCARD_DECK assignment (field-specific 400)."
    );

    const hosaDeckSlug = deckSummaries().find((deck) => deck.organization === "HOSA")?.deckSlug;
    if (hosaDeckSlug) {
      await assert.rejects(
        () =>
          assignments.createAssignment({
            coachUserId: coach.id,
            role: "COACH",
            input: { teamId: decaTeam.id, type: "FLASHCARD_DECK", title: "Cross-track", instructions: "should be rejected", dueDate: null, targetAllTeam: true, studentIds: [], targetId: hosaDeckSlug, points: null }
          }),
        (error: unknown) => (error as { status?: number }).status === 400 && /targetId:/i.test((error as Error).message),
        "A DECA team must not accept a HOSA deck (field-specific 400 on targetId)."
      );
    }

    // ---- Due date (item 6): overdue uses the stored value ----
    const overdue = await assignments.createAssignment({
      coachUserId: coach.id,
      role: "COACH",
      input: { teamId: team.id, type: "DEBATE_ROUND", title: "Overdue round", instructions: "This round is past due.", dueDate: new Date("2020-01-01T09:00:00"), targetAllTeam: true, studentIds: [], targetId: null, points: null }
    });
    const overdueSeen = (await assignments.getStudentAssignments(student.id)).find((assignment) => assignment.id === overdue.id);
    assert.ok(overdueSeen?.dueDate && overdueSeen.dueDate.getTime() < Date.now(), "Overdue is computed from the stored past due date.");

    console.log(
      "Assignment smoke tests passed: creation, visibility, selected targets, coach isolation, start vs complete, evidence ownership, no-evidence rejection, roster denominator, and reflection completion."
    );
  } finally {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
