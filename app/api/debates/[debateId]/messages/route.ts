import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, HttpError, parseJson, unauthorized } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { countDebateSpeeches, getNextSpeech, getSideLabel, parseFormatConfig } from "@/lib/debate-formats";
import { prisma } from "@/lib/prisma";
import { assessStudentSpeech } from "@/lib/speech-quality";
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
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

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

    const messages = await prisma.debateMessage.findMany({
      where: { debateId: params.debateId },
      orderBy: [{ round: "asc" }, { createdAt: "asc" }]
    });

    return NextResponse.json({ messages });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: { params: { debateId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

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

    if (debate.status === "JUDGED" || debate.status === "ARCHIVED") {
      throw new HttpError("This debate is already complete", 409);
    }

    const input = await parseJson(request, debateMessageCreateSchema);
    const isSpeech = input.role === "AFFIRMATIVE" || input.role === "NEGATIVE";

    if (isSpeech) {
      const config = parseFormatConfig(debate.formatConfig, debate.format, debate.turnTimeSeconds);
      const nextSpeech = getNextSpeech(config, countDebateSpeeches(debate.messages));

      if (!nextSpeech) {
        throw new HttpError("All required speeches are complete. You can send this round to the judge.", 409);
      }

      const participantSide = debate.opponentUserId === session.user.id ? debate.opponentSide : debate.studentSide;

      if (nextSpeech.side !== participantSide) {
        throw new HttpError(`${getSideLabel(nextSpeech.side)} is up next. Use the AI response button or wait for the opponent.`, 409);
      }

      if (input.role !== nextSpeech.messageRole || input.round !== nextSpeech.round || (input.speechKey && input.speechKey !== nextSpeech.key)) {
        throw new HttpError(`Submit the next required speech: ${nextSpeech.label}.`, 400);
      }

      // Non-substantive speech guardrail: reject nonsense / ultra-short speeches so they never create
      // a fake debate round (mirrors the client check; the client should block these first).
      const assessment = assessStudentSpeech(input.content, debate.level);
      if (!assessment.ok) {
        throw new HttpError(assessment.reason ?? "Write at least 2–3 sentences so the opponent has something real to answer.", 422);
      }
    }

    const message = await prisma.debateMessage.create({
      data: {
        debateId: debate.id,
        authorId: isSpeech ? session.user.id : null,
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
