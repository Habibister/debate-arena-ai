import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { debateCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input = await parseJson(request, debateCreateSchema);
    const debate = await prisma.debate.create({
      data: {
        organization: input.organization,
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
