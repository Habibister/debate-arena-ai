import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, parseJson, unauthorized } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { debateCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const debates = await prisma.debate.findMany({
      where: {
        OR: [
          { createdById: session.user.id },
          { studentId: session.user.id },
          { opponentUserId: session.user.id }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        messages: {
          orderBy: [{ round: "asc" }, { createdAt: "asc" }]
        }
      }
    });

    return NextResponse.json({ debates });
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

    const input = await parseJson(request, debateCreateSchema);
    const rubric = await prisma.rubric.findFirst({
      where: {
        organization: input.organization,
        eventType: input.eventType,
        isActive: true
      },
      orderBy: { version: "desc" }
    });

    const debate = await prisma.debate.create({
      data: {
        organization: input.organization,
        eventType: input.eventType,
        practiceMode: input.practiceMode,
        rubricId: rubric?.id,
        level: input.level,
        topic: input.topic,
        mode: input.mode,
        status: "ACTIVE",
        startedAt: new Date(),
        createdById: session.user.id,
        studentId: session.user.id,
        opponentUserId: input.opponentUserId,
        aiPersona: input.mode === "AI" ? `${input.level} ${input.organization} sparring opponent` : null
      }
    });

    return NextResponse.json({ debate }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
