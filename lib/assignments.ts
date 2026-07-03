import type { AssignmentType, Role } from "@prisma/client";
import { HttpError } from "@/lib/api";
import { ASSIGNMENT_TYPE_META, assignmentLaunchPath } from "@/lib/assignment-types";
import { prisma } from "@/lib/prisma";
import { deckSummaries } from "@/lib/study-content";
import { canAccessCoachTools, isAdmin } from "@/lib/roles";
import type { assignmentCreateSchema, assignmentSubmitSchema } from "@/lib/validators";
import type { z } from "zod";

type CreateInput = z.infer<typeof assignmentCreateSchema>;
type SubmitInput = z.infer<typeof assignmentSubmitSchema>;

function canManageAll(role?: Role | string | null) {
  return isAdmin(role);
}

function isCoachRole(role?: Role | string | null) {
  return canAccessCoachTools(role);
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

async function getTeamForAssignment(params: { teamId: string; coachUserId: string; role?: Role | string | null }) {
  if (!isCoachRole(params.role)) {
    throw new HttpError("You need a coach account to manage assignments.", 403);
  }

  const team = await prisma.team.findFirst({
    where: {
      id: params.teamId,
      ...(canManageAll(params.role)
        ? {}
        : {
            coach: { userId: params.coachUserId }
          })
    },
    include: {
      coach: { select: { userId: true } },
      members: { select: { userId: true, role: true } }
    }
  });

  if (!team) {
    throw new HttpError("Team not found or you do not have access to it.", 404);
  }

  return team;
}

async function resolveAssignmentTarget(type: AssignmentType, targetId?: string | null) {
  if (!ASSIGNMENT_TYPE_META[type]) {
    throw new HttpError("Invalid assignment type.", 400);
  }

  if (ASSIGNMENT_TYPE_META[type].requiresTarget && !targetId) {
    throw new HttpError("Choose existing content for this assignment type.", 400);
  }

  if (type === "FLASHCARD_DECK" || type === "REVIEW_GAME") {
    const deck = deckSummaries().find((item) => item.deckSlug === targetId);
    if (!deck) {
      throw new HttpError("Flashcard deck not found.", 404);
    }
    return {
      targetType: "FLASHCARD_DECK",
      targetId: deck.deckSlug,
      targetLabel: deck.deck,
      targetHref: type === "REVIEW_GAME" ? `/study/${deck.deckSlug}/games` : `/study/${deck.deckSlug}`
    };
  }

  if (type === "LESSON") {
    const lesson = await prisma.lesson.findUnique({
      where: { slug: targetId ?? "" },
      select: { slug: true, title: true }
    });
    if (!lesson) {
      throw new HttpError("Lesson not found.", 404);
    }
    return {
      targetType: "LESSON",
      targetId: lesson.slug,
      targetLabel: lesson.title,
      targetHref: `/skills/${lesson.slug}`
    };
  }

  return {
    targetType: null,
    targetId: null,
    targetLabel: null,
    targetHref: null
  };
}

export async function listAssignmentContentOptions() {
  const [lessons] = await Promise.all([
    prisma.lesson.findMany({
      orderBy: [{ skill: { order: "asc" } }, { order: "asc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        skill: { select: { name: true, organization: true } }
      },
      take: 100
    })
  ]);

  return {
    decks: deckSummaries().map((deck) => ({
      id: deck.deckSlug,
      label: deck.deck,
      description: `${deck.organization} · ${deck.count} cards`
    })),
    lessons: lessons.map((lesson) => ({
      id: lesson.slug,
      label: lesson.title,
      description: `${lesson.skill.organization.replace("_", " ")} · ${lesson.skill.name}`
    }))
  };
}

export async function createAssignment(params: { coachUserId: string; role?: Role | string | null; input: CreateInput }) {
  const team = await getTeamForAssignment({
    teamId: params.input.teamId,
    coachUserId: params.coachUserId,
    role: params.role
  });
  const memberIds = new Set(team.members.filter((member) => member.role === "STUDENT").map((member) => member.userId));
  const selectedStudentIds = uniqueIds(params.input.studentIds);

  if (!params.input.targetAllTeam) {
    const invalid = selectedStudentIds.filter((studentId) => !memberIds.has(studentId));
    if (invalid.length > 0) {
      throw new HttpError("Selected students must already belong to the selected team.", 403);
    }
  }

  const target = await resolveAssignmentTarget(params.input.type, params.input.targetId);
  const assignment = await prisma.assignment.create({
    data: {
      coachId: params.coachUserId,
      teamId: params.input.teamId,
      title: params.input.title,
      instructions: params.input.instructions,
      type: params.input.type,
      dueDate: params.input.dueDate,
      targetAllTeam: params.input.targetAllTeam,
      targetType: target.targetType,
      targetId: target.targetId,
      targetLabel: target.targetLabel,
      targetHref: target.targetHref,
      points: params.input.points ?? null,
      assignees: params.input.targetAllTeam
        ? undefined
        : {
            create: selectedStudentIds.map((studentId) => ({ studentId }))
          }
    },
    select: { id: true }
  });

  return assignment;
}

function assignmentAccessWhereForCoach(userId: string, role?: Role | string | null) {
  return canManageAll(role) ? {} : { coachId: userId };
}

export async function getCoachAssignments(userId: string, role?: Role | string | null) {
  if (!isCoachRole(role)) {
    throw new HttpError("You need a coach account to view assignments.", 403);
  }

  return prisma.assignment.findMany({
    where: assignmentAccessWhereForCoach(userId, role),
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      team: {
        include: {
          members: { select: { userId: true, role: true } }
        }
      },
      assignees: { select: { studentId: true } },
      submissions: { select: { studentId: true, status: true } }
    }
  });
}

export async function getCoachAssignmentDetail(params: { assignmentId: string; userId: string; role?: Role | string | null }) {
  if (!isCoachRole(params.role)) {
    throw new HttpError("You need a coach account to view assignments.", 403);
  }

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: params.assignmentId,
      ...assignmentAccessWhereForCoach(params.userId, params.role)
    },
    include: {
      team: {
        include: {
          members: {
            orderBy: { joinedAt: "asc" },
            select: {
              userId: true,
              role: true,
              joinedAt: true,
              user: {
                select: {
                  id: true,
                  displayName: true,
                  name: true,
                  username: true,
                  avatarUrl: true,
                  image: true,
                  xp: true,
                  wins: true
                }
              }
            }
          }
        }
      },
      assignees: { select: { studentId: true } },
      submissions: {
        include: {
          student: {
            select: { id: true, displayName: true, name: true, username: true, avatarUrl: true, image: true }
          }
        }
      }
    }
  });

  if (!assignment) {
    throw new HttpError("Assignment not found.", 404);
  }

  return assignment;
}

export function getAssignedStudentIds(assignment: {
  targetAllTeam: boolean;
  assignees: Array<{ studentId: string }>;
  team: { members: Array<{ userId: string; role: Role }> };
}) {
  if (!assignment.targetAllTeam) {
    return assignment.assignees.map((item) => item.studentId);
  }

  return assignment.team.members.filter((member) => member.role === "STUDENT").map((member) => member.userId);
}

export async function getStudentAssignments(userId: string) {
  return prisma.assignment.findMany({
    where: {
      isArchived: false,
      team: { members: { some: { userId } } },
      OR: [{ targetAllTeam: true }, { assignees: { some: { studentId: userId } } }]
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      team: {
        select: {
          id: true,
          name: true,
          organization: true,
          coach: { select: { user: { select: { displayName: true, name: true, username: true } } } }
        }
      },
      submissions: { where: { studentId: userId }, take: 1 }
    }
  });
}

export async function getStudentAssignmentDetail(params: { assignmentId: string; userId: string }) {
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: params.assignmentId,
      isArchived: false,
      team: { members: { some: { userId: params.userId } } },
      OR: [{ targetAllTeam: true }, { assignees: { some: { studentId: params.userId } } }]
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          organization: true,
          coach: { select: { user: { select: { displayName: true, name: true, username: true } } } }
        }
      },
      submissions: { where: { studentId: params.userId }, take: 1 }
    }
  });

  if (!assignment) {
    throw new HttpError("Assignment not found.", 404);
  }

  return assignment;
}

export async function startAssignment(params: { assignmentId: string; userId: string }) {
  const assignment = await getStudentAssignmentDetail(params);
  const existing = assignment.submissions[0];

  if (existing?.status === "COMPLETED") {
    return { assignment, submission: existing, launchPath: assignmentLaunchPath(assignment) };
  }

  const submission = await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId: params.assignmentId, studentId: params.userId } },
    update: {
      status: "IN_PROGRESS",
      startedAt: existing?.startedAt ?? new Date()
    },
    create: {
      assignmentId: params.assignmentId,
      studentId: params.userId,
      status: "IN_PROGRESS",
      startedAt: new Date()
    }
  });

  return { assignment, submission, launchPath: assignmentLaunchPath(assignment) };
}

async function validateEvidence(params: { assignment: Awaited<ReturnType<typeof getStudentAssignmentDetail>>; userId: string; input: SubmitInput }) {
  const { assignment, userId, input } = params;

  if (assignment.type === "FLASHCARD_DECK" || assignment.type === "REVIEW_GAME") {
    if (!input.notes || input.notes.length < 20) {
      throw new HttpError("Add a short reflection note so your coach can verify what you completed.", 400);
    }

    return {
      evidenceType: "MANUAL_REFLECTION",
      evidenceId: assignment.targetId ?? assignment.id,
      notes: input.notes
    };
  }

  if (!input.evidenceId) {
    throw new HttpError("Choose completed work to submit as evidence.", 400);
  }

  if (assignment.type === "DEBATE_ROUND" || assignment.type === "REBUTTAL_PRACTICE") {
    const debate = await prisma.debate.findFirst({
      where: {
        id: input.evidenceId,
        status: "JUDGED",
        OR: [{ createdById: userId }, { studentId: userId }, { opponentUserId: userId }],
        ...(assignment.type === "REBUTTAL_PRACTICE" ? { format: "PRACTICE_REBUTTAL" } : {})
      },
      select: { id: true }
    });

    if (!debate) {
      throw new HttpError("Choose a completed judged debate that belongs to you and matches this assignment.", 403);
    }

    return {
      evidenceType: "DEBATE",
      evidenceId: debate.id,
      notes: input.notes ?? null
    };
  }

  if (assignment.type === "PRACTICE_TEST") {
    const test = await prisma.practiceTest.findFirst({
      where: { id: input.evidenceId, userId, status: "COMPLETED" },
      select: { id: true }
    });

    if (!test) {
      throw new HttpError("Choose a completed practice test that belongs to you.", 403);
    }

    return {
      evidenceType: "PRACTICE_TEST",
      evidenceId: test.id,
      notes: input.notes ?? null
    };
  }

  const attempt = await prisma.practiceAttempt.findFirst({
    where: {
      id: input.evidenceId,
      userId,
      status: "COMPLETED",
      ...(assignment.targetId
        ? {
            lesson: { slug: assignment.targetId }
          }
        : {})
    },
    select: { id: true }
  });

  if (!attempt) {
    throw new HttpError("Choose a completed lesson practice attempt that belongs to you.", 403);
  }

  return {
    evidenceType: "LESSON_ATTEMPT",
    evidenceId: attempt.id,
    notes: input.notes ?? null
  };
}

export async function completeAssignment(params: { assignmentId: string; userId: string; input: SubmitInput }) {
  const assignment = await getStudentAssignmentDetail(params);
  const evidence = await validateEvidence({ assignment, userId: params.userId, input: params.input });

  return prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId: params.assignmentId, studentId: params.userId } },
    update: {
      status: "COMPLETED",
      completedAt: new Date(),
      evidenceType: evidence.evidenceType,
      evidenceId: evidence.evidenceId,
      notes: evidence.notes
    },
    create: {
      assignmentId: params.assignmentId,
      studentId: params.userId,
      status: "COMPLETED",
      startedAt: new Date(),
      completedAt: new Date(),
      evidenceType: evidence.evidenceType,
      evidenceId: evidence.evidenceId,
      notes: evidence.notes
    }
  });
}

export async function getStudentEvidenceOptions(userId: string, assignmentType: AssignmentType, targetId?: string | null) {
  if (assignmentType === "DEBATE_ROUND" || assignmentType === "REBUTTAL_PRACTICE") {
    const debates = await prisma.debate.findMany({
      where: {
        status: "JUDGED",
        OR: [{ createdById: userId }, { studentId: userId }, { opponentUserId: userId }],
        ...(assignmentType === "REBUTTAL_PRACTICE" ? { format: "PRACTICE_REBUTTAL" } : {})
      },
      orderBy: { completedAt: "desc" },
      take: 20,
      select: { id: true, topic: true, completedAt: true, overallScore: true }
    });
    return debates.map((debate) => ({
      id: debate.id,
      label: `${debate.topic} ${typeof debate.overallScore === "number" ? `(${debate.overallScore})` : ""}`,
      detail: debate.completedAt ? `Completed ${debate.completedAt.toLocaleDateString()}` : "Judged debate"
    }));
  }

  if (assignmentType === "PRACTICE_TEST") {
    const tests = await prisma.practiceTest.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 20,
      select: { id: true, organization: true, eventType: true, eventCluster: true, score: true, completedAt: true }
    });
    return tests.map((test) => ({
      id: test.id,
      label: `${test.organization} ${test.eventCluster ?? test.eventType} ${typeof test.score === "number" ? `(${test.score}%)` : ""}`,
      detail: test.completedAt ? `Completed ${test.completedAt.toLocaleDateString()}` : "Completed test"
    }));
  }

  if (assignmentType === "LESSON") {
    const attempts = await prisma.practiceAttempt.findMany({
      where: {
        userId,
        status: "COMPLETED",
        ...(targetId ? { lesson: { slug: targetId } } : {})
      },
      orderBy: { completedAt: "desc" },
      take: 20,
      select: {
        id: true,
        score: true,
        completedAt: true,
        lesson: { select: { title: true } },
        skill: { select: { name: true } }
      }
    });
    return attempts.map((attempt) => ({
      id: attempt.id,
      label: `${attempt.lesson?.title ?? attempt.skill.name} ${typeof attempt.score === "number" ? `(${attempt.score})` : ""}`,
      detail: attempt.completedAt ? `Completed ${attempt.completedAt.toLocaleDateString()}` : "Completed lesson practice"
    }));
  }

  return [];
}
