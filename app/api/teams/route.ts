import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { teamCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coach = await prisma.coach.findUnique({
    where: { userId: session.user.id },
    include: {
      teams: {
        include: {
          members: {
            include: { user: true }
          }
        }
      }
    }
  });

  return NextResponse.json({ teams: coach?.teams ?? [] });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "COACH") {
      return NextResponse.json({ error: "Coach access required" }, { status: 403 });
    }

    const input = await parseJson(request, teamCreateSchema);
    const coach = await prisma.coach.upsert({
      where: { userId: session.user.id },
      update: {},
      create: { userId: session.user.id }
    });

    const team = await prisma.team.create({
      data: {
        coachId: coach.id,
        name: input.name,
        organization: input.organization
      }
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
