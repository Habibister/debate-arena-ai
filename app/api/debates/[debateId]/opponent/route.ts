import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, HttpError, parseJson, unauthorized } from "@/lib/api";
import { generateOpponentSpeech } from "@/lib/openai-debate";
import { authOptions } from "@/lib/auth";
import { countDebateSpeeches, getNextSpeech, getSideLabel, parseFormatConfig } from "@/lib/debate-formats";
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

    const opponentSide = input.side ?? "NEGATIVE";
    const config = parseFormatConfig(debate.formatConfig, debate.format, debate.turnTimeSeconds);
    const nextSpeech = getNextSpeech(config, countDebateSpeeches(debate.messages));

    if (!nextSpeech) {
      throw new HttpError("All required speeches are complete. Send the debate to the judge when you are ready.", 409);
    }

    if (nextSpeech.side !== debate.opponentSide) {
      throw new HttpError(`${getSideLabel(nextSpeech.side)} is up next. Submit the student speech before asking the AI opponent to respond.`, 409);
    }

    if (opponentSide !== nextSpeech.messageRole || input.round !== nextSpeech.round || (input.speechKey && input.speechKey !== nextSpeech.key)) {
      throw new HttpError(`The AI opponent must give the next required speech: ${nextSpeech.label}.`, 400);
    }

    const opponent = await generateOpponentSpeech({
      organization: debate.organization,
      level: debate.level,
      eventType: debate.eventType,
      practiceMode: debate.practiceMode,
      topic: debate.topic,
      side: opponentSide,
      round: input.round,
      personaId: debate.aiPersona,
      format: debate.format,
      phase: nextSpeech.label,
      transcript: debate.messages.map((message) => ({
        role: message.role,
        round: message.round,
        content: message.content
      }))
    });

    const message = await prisma.debateMessage.create({
      data: {
        debateId: debate.id,
        role: nextSpeech.messageRole,
        round: nextSpeech.round,
        content: opponent.response
      }
    });

    return NextResponse.json({ message, opponent });
  } catch (error) {
    return apiError(error);
  }
}
