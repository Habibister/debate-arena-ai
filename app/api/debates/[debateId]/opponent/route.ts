import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, HttpError, parseJson, unauthorized } from "@/lib/api";
import { generateOpponentResponse } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { opponentTurnRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { debateId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const input = await parseJson(request, opponentTurnRequestSchema);
    const debate = await prisma.debate.findFirst({
      where: {
        id: params.debateId,
        OR: [{ createdById: session.user.id }, { studentId: session.user.id }, { opponentUserId: session.user.id }]
      },
      include: {
        messages: {
          orderBy: [{ round: "asc" }, { createdAt: "asc" }]
        }
      }
    });

    if (!debate) {
      throw new HttpError("Debate not found", 404);
    }

    if (debate.mode !== "AI") {
      throw new HttpError("AI opponent is only available for AI debates", 409);
    }

    const opponent = await generateOpponentResponse({
      organization: debate.organization,
      level: debate.level,
      eventType: debate.eventType,
      practiceMode: debate.practiceMode,
      topic: debate.topic,
      side: input.side,
      round: input.round,
      transcript: debate.messages.map((message) => ({
        role: message.role,
        round: message.round,
        content: message.content
      }))
    });

    const message = await prisma.debateMessage.create({
      data: {
        debateId: debate.id,
        role: input.side,
        round: input.round,
        content: opponent.response
      }
    });

    return NextResponse.json({ message, opponent });
  } catch (error) {
    return apiError(error);
  }
}
