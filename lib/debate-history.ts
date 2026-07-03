import { HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// A student's own debates for history + unfinished recovery. Only official fields — no coaching.
export async function getStudentDebates(userId: string) {
  return prisma.debate.findMany({
    where: { studentId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      topic: true,
      organization: true,
      eventType: true,
      format: true,
      studentSide: true,
      status: true,
      overallScore: true,
      aiPersona: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export function isUnfinished(status: string) {
  return status === "SETUP" || status === "ACTIVE";
}

// Full official replay for one debate, with server-side access control:
// the owning student, an ADMIN, or a coach who owns a team the student belongs to. Otherwise 403/404.
// Returns ONLY official transcript messages + judge fields — private Side Coach messages are never
// persisted, so they can never appear here.
export async function getDebateReplay(viewerId: string, viewerRole: string | null | undefined, debateId: string) {
  const debate = await prisma.debate.findUnique({
    where: { id: debateId },
    select: {
      id: true,
      topic: true,
      organization: true,
      eventType: true,
      format: true,
      level: true,
      studentSide: true,
      opponentSide: true,
      status: true,
      overallScore: true,
      aiPersona: true,
      studentId: true,
      strengths: true,
      weaknesses: true,
      recommendations: true,
      createdAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, authorId: true, round: true, content: true, createdAt: true }
      }
    }
  });

  if (!debate) {
    throw new HttpError("Debate not found.", 404);
  }

  const isOwner = debate.studentId === viewerId;
  const isAdmin = viewerRole === "ADMIN";
  let allowed = isOwner || isAdmin;

  if (!allowed && debate.studentId) {
    // Coach may view replays for students in a team they own.
    const coach = await prisma.coach.findUnique({ where: { userId: viewerId }, select: { id: true } });
    if (coach) {
      const membership = await prisma.teamMember.findFirst({
        where: { userId: debate.studentId, team: { coachId: coach.id } },
        select: { id: true }
      });
      allowed = Boolean(membership);
    }
  }

  if (!allowed) {
    throw new HttpError("You do not have permission to view this debate.", 403);
  }

  return debate;
}

// Real prior attempts at the same motion (for honest score comparison — never fabricated).
export async function getAttemptsForMotion(userId: string, topic: string, excludeId: string) {
  return prisma.debate.findMany({
    where: { studentId: userId, topic, status: "JUDGED", id: { not: excludeId } },
    orderBy: { createdAt: "asc" },
    select: { id: true, overallScore: true, createdAt: true }
  });
}
