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
      opponentSide: true,
      status: true,
      overallScore: true,
      aiPersona: true,
      assistedPractice: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export function isUnfinished(status: string) {
  return status === "SETUP" || status === "ACTIVE";
}

// Human-readable side label for the stored DebateSide enum (display only).
export function sideLabel(side: string): string {
  const map: Record<string, string> = {
    GOVERNMENT: "Government",
    OPPOSITION: "Opposition",
    FOR: "For",
    AGAINST: "Against"
  };
  return map[side] ?? side;
}

// ---- User-facing session metadata (item: hide internal carrier format data) ----
// Session/history/resume/replay UI must render the practice type from organization + stored eventType,
// never the internal carrier DebateFormat enum (e.g. PARLIAMENTARY) or the opponent persona for a
// non-debate practice.
const DEBATE_ORG = "DEBATE";
const PRACTICE_ORGS = ["MODEL_UN", "DECA", "HOSA"];
// eventType values that only ever belong to a real debate. If a track org carries one of these, the
// record predates the track configs (a legacy/inconsistent record) and is shown honestly, never as a
// valid active-track continuation.
const DEBATE_EVENT_TYPES = ["PARLIAMENTARY_DEBATE", "QUICK_1V1", "PUBLIC_FORUM", "PRACTICE_REBUTTAL"];
const DEBATE_EVENT_LABELS: Record<string, string> = {
  PARLIAMENTARY_DEBATE: "Parliamentary Debate",
  QUICK_1V1: "Quick 1v1",
  PUBLIC_FORUM: "Public Forum",
  PRACTICE_REBUTTAL: "Practice Rebuttal"
};
const PRACTICE_LABEL_BY_ORG: Record<string, string> = {
  MODEL_UN: "Model UN Committee Session",
  DECA: "DECA Role Play",
  HOSA: "HOSA Event Practice"
};

export function isPracticeOrganization(organization: string): boolean {
  return organization !== DEBATE_ORG;
}

// A track-org record whose stored eventType is a debate event type is legacy/inconsistent (its config
// is a parliamentary carrier). Never recommend it as an active-track continuation; label it honestly.
export function isLegacyPracticeRecord(record: { organization: string; eventType: string }): boolean {
  return PRACTICE_ORGS.includes(record.organization) && DEBATE_EVENT_TYPES.includes(record.eventType);
}

// The single user-facing "what is this session" label.
export function practiceTypeLabel(record: { organization: string; eventType: string }): string {
  if (isLegacyPracticeRecord(record)) {
    return "Legacy practice";
  }
  if (record.organization === DEBATE_ORG) {
    return DEBATE_EVENT_LABELS[record.eventType] ?? "Debate";
  }
  return PRACTICE_LABEL_BY_ORG[record.organization] ?? "Practice";
}

// Whether opponent/side metadata (vs persona, Government/Opposition) should be shown for a record.
// Only real debates have an opponent + sides; solo track practice does not.
export function showsOpponentMeta(record: { organization: string; eventType: string }): boolean {
  return record.organization === DEBATE_ORG && !isLegacyPracticeRecord(record);
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
      logicScore: true,
      evidenceScore: true,
      rebuttalScore: true,
      persuasionScore: true,
      clarityScore: true,
      communicationScore: true,
      aiPersona: true,
      assistedPractice: true,
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

// Real prior attempts at the same motion (for honest comparison — only stored values, never fabricated).
export async function getAttemptsForMotion(userId: string, topic: string, excludeId: string) {
  return prisma.debate.findMany({
    where: { studentId: userId, topic, status: "JUDGED", id: { not: excludeId } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      overallScore: true,
      logicScore: true,
      evidenceScore: true,
      rebuttalScore: true,
      persuasionScore: true,
      clarityScore: true,
      communicationScore: true,
      strengths: true,
      weaknesses: true,
      recommendations: true,
      studentSide: true,
      assistedPractice: true,
      createdAt: true
    }
  });
}
