import { randomInt } from "node:crypto";
import type { Organization } from "@prisma/client";
import { HttpError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { canAccessCoachTools } from "@/lib/roles";

// Unambiguous alphabet (no 0/O/1/I/L) so join codes are easy to read aloud and type.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const ORG_PREFIX: Record<string, string> = {
  DEBATE: "DEBATE",
  MODEL_UN: "MUN",
  DECA: "DECA",
  HOSA: "HOSA",
  MOCK_TRIAL: "TRIAL",
  PUBLIC_SPEAKING: "SPEAK"
};

const ROSTER_USER_SELECT = {
  id: true,
  displayName: true,
  name: true,
  username: true,
  avatarUrl: true,
  image: true,
  level: true,
  xp: true,
  wins: true,
  rank: true
} as const;

function randomSegment(length: number) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

function codePrefix(organization?: string | null) {
  return (organization && ORG_PREFIX[organization]) || "TEAM";
}

// Generate a human-friendly code like DEBATE-7KQ2, retrying on the (rare) collision.
async function generateUniqueJoinCode(organization?: string | null) {
  const prefix = codePrefix(organization);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `${prefix}-${randomSegment(attempt < 5 ? 4 : 6)}`;
    const existing = await prisma.team.findUnique({ where: { joinCode: code }, select: { id: true } });
    if (!existing) {
      return code;
    }
  }
  throw new HttpError("Could not generate a unique join code. Please try again.", 500);
}

function assertCoach(role?: string | null) {
  if (!canAccessCoachTools(role)) {
    throw new HttpError("You need a coach account to manage teams.", 403);
  }
}

export function normalizeJoinCode(code: string) {
  return code.trim().toUpperCase();
}

export async function createTeam(params: {
  userId: string;
  role?: string | null;
  name: string;
  organization: Organization;
  schoolOrClub?: string | null;
}) {
  assertCoach(params.role);

  // A coach owns teams through their Coach profile; create it on first use.
  const coach = await prisma.coach.upsert({
    where: { userId: params.userId },
    update: {},
    create: { userId: params.userId }
  });

  const joinCode = await generateUniqueJoinCode(params.organization);

  return prisma.team.create({
    data: {
      coachId: coach.id,
      name: params.name.trim(),
      organization: params.organization,
      schoolOrClub: params.schoolOrClub?.trim() || null,
      joinCode
    },
    select: { id: true, name: true, joinCode: true, schoolOrClub: true, organization: true, createdAt: true }
  });
}

export async function getTeamsForCoach(userId: string) {
  const coach = await prisma.coach.findUnique({
    where: { userId },
    select: {
      teams: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          joinCode: true,
          schoolOrClub: true,
          organization: true,
          createdAt: true,
          members: {
            orderBy: { joinedAt: "asc" },
            select: { id: true, joinedAt: true, user: { select: ROSTER_USER_SELECT } }
          }
        }
      }
    }
  });

  return coach?.teams ?? [];
}

export async function joinTeamByCode(params: { userId: string; joinCode: string }) {
  const code = normalizeJoinCode(params.joinCode);

  const team = await prisma.team.findUnique({ where: { joinCode: code }, select: { id: true, name: true } });
  if (!team) {
    throw new HttpError("That join code was not found.", 404);
  }

  const existing = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: params.userId } },
    select: { id: true }
  });
  if (existing) {
    throw new HttpError("You are already in this team.", 409);
  }

  await prisma.teamMember.create({ data: { teamId: team.id, userId: params.userId, role: "STUDENT" } });
  return { team };
}

export async function leaveTeam(params: { userId: string; teamId: string }) {
  // deleteMany so leaving a team you are not in is a no-op rather than a thrown 404.
  await prisma.teamMember.deleteMany({ where: { teamId: params.teamId, userId: params.userId } });
}

export async function getStudentTeams(userId: string) {
  return prisma.teamMember.findMany({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    select: {
      id: true,
      joinedAt: true,
      team: {
        select: {
          id: true,
          name: true,
          joinCode: true,
          organization: true,
          coach: { select: { user: { select: { displayName: true, name: true, username: true } } } }
        }
      }
    }
  });
}
