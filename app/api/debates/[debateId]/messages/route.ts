import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { debateMessageCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";

async function getAccessibleDebate(debateId: string, userId: string) {
  return prisma.debate.findFirst({
    where: {
      id: debateId,
      OR: [{ createdById: userId }, { studentId: userId }, { opponentUserId: userId }]
    }
  });
}

export async function GET(_request: Request, { params }: { params: { debateId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const debate = await getAccessibleDebate(params.debateId, session.user.id);

  if (!debate) {
    return NextResponse.json({ error: "Debate not found" }, { status: 404 });
  }

  const messages = await prisma.debateMessage.findMany({
    where: { debateId: params.debateId },
    orderBy: [{ round: "asc" }, { createdAt: "asc" }]
  });

  return NextResponse.json({ messages });
}

export async function POST(request: Request, { params }: { params: { debateId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const debate = await getAccessibleDebate(params.debateId, session.user.id);

    if (!debate) {
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }

    if (debate.status === "JUDGED" || debate.status === "ARCHIVED") {
      return NextResponse.json({ error: "This debate is already complete" }, { status: 409 });
    }

    const input = await parseJson(request, debateMessageCreateSchema);
    const message = await prisma.debateMessage.create({
      data: {
        debateId: debate.id,
        authorId: input.role === "AFFIRMATIVE" || input.role === "NEGATIVE" ? session.user.id : null,
        role: input.role,
        round: input.round,
        content: input.content
      }
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
