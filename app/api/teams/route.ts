import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, forbidden, parseJson, unauthorized } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { teamCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
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
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    if (session.user.role !== "COACH") {
      return forbidden("Coach access required");
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
