import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, hosaWithdrawn, HttpError, parseJson, unauthorized } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { buildDebateFormatConfig, getOpponentSide, resolveDebateSide, trackPracticeConfigForOrganization } from "@/lib/debate-formats";
import { guidedRubricFor } from "@/lib/education/coaching";
import { prisma } from "@/lib/prisma";
import { isTrackRetired, trackByOrganization } from "@/lib/training-tracks";
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

    // M14 Phase 1b (audit G23): generic HOSA clinical role-play and its AI judging were withdrawn in
    // M11R6, but this route still accepted organization "HOSA" and would mint a Debate row the judge
    // route could then score. Refuse BEFORE any database read or write, with the same 410 contract
    // the dedicated /api/ai/hosa-scenario and /api/ai/judge-hosa endpoints use. HOSA is never
    // silently mapped to another organization; every other organization is unchanged.
    if (input.organization === "HOSA") {
      return hosaWithdrawn();
    }

    // A RETIRED TRACK CANNOT START A NEW ROUND (H3). Model UN is soft-removed: its code, its stored
    // rounds and its honest historical labels all stay, but it is not something anyone begins today.
    // The client used the retirement-blind lookup, so `/debate?track=model-un` reached here and this
    // route — which refuses only HOSA — would mint the row. Refusing at creation is what makes the
    // client fix a courtesy rather than the only gate. Reading existing rounds is untouched.
    const requestedTrack = trackByOrganization(input.organization);
    if (requestedTrack && isTrackRetired(requestedTrack.id)) {
      throw new HttpError(`${requestedTrack.label} is no longer available for new practice rounds.`, 410);
    }

    // GUIDED LESSON ROUND — decided HERE, at creation, and persisted on the row (see
    // lib/guided-rounds.ts). The client may name a lesson; it may not decide what a lesson unlocks
    // and it may not mint a LESSON row without one. Fail closed on both: an unresolvable lesson
    // creates nothing, and a bare practiceMode LESSON is refused, so every LESSON row that exists
    // names a lesson the curriculum recognises.
    let guidedLessonId: string | null = null;
    if (input.guided) {
      if (input.organization !== "DEBATE") {
        throw new HttpError("Guided rounds are a Debate lesson feature.", 400);
      }
      if (!guidedRubricFor(input.guided.lessonId)) {
        throw new HttpError("That guided lesson is not recognised, so no round was created.", 400);
      }
      guidedLessonId = input.guided.lessonId;
    } else if (input.practiceMode === "LESSON") {
      throw new HttpError("A lesson round must name the lesson it belongs to.", 400);
    }

    const format = input.format ?? "PARLIAMENTARY";
    const side = input.side ?? "GOVERNMENT";
    const category = input.category ?? "Global";

    if (format === "CUSTOM") {
      throw new HttpError("Custom debate formats are coming soon. Choose one of the available formats for now.", 400);
    }

    // Organization-based tracks (DECA role play, HOSA event practice, Model UN committee) are NOT
    // parliamentary debate: their config (labels, stages, framing) is keyed off the organization, never
    // the parliamentary format enum. Only General Debate uses the real debate formats.
    const trackConfig = trackPracticeConfigForOrganization(input.organization, input.turnTimeSeconds);
    const formatConfig = trackConfig ?? buildDebateFormatConfig(format, input.turnTimeSeconds);
    const studentSide = trackConfig ? trackConfig.sides.affirmative : resolveDebateSide(format, side);
    const opponentSide = trackConfig ? trackConfig.sides.negative : getOpponentSide(format, studentSide);
    const rubric = await prisma.rubric.findFirst({
      where: {
        organization: input.organization,
        eventType: formatConfig.eventType,
        isActive: true
      },
      orderBy: { version: "desc" }
    });

    const debate = await prisma.debate.create({
      data: {
        organization: input.organization,
        eventType: formatConfig.eventType,
        // A guided round is a LESSON round whatever the client sent for practiceMode.
        practiceMode: guidedLessonId ? "LESSON" : input.practiceMode,
        format,
        rubricId: rubric?.id,
        level: input.level,
        topic: input.topic,
        mode: input.mode,
        status: "ACTIVE",
        roundsMinimum: formatConfig.speeches.length,
        studentSide,
        opponentSide,
        turnTimeSeconds: formatConfig.turnTimeSeconds,
        prepTimeSeconds: input.prepTimeSeconds ?? formatConfig.prepTimeSeconds,
        graceTimeSeconds: formatConfig.graceTimeSeconds,
        formatConfig: {
          ...formatConfig,
          category,
          aiGeneratedTopic: input.aiGeneratedTopic,
          // The lesson, on the row. `parseFormatConfig` returns a stored config as-is when it has a
          // format and speeches, so this key survives every read of the config.
          ...(guidedLessonId ? { guidedLessonId } : {})
        },
        startedAt: new Date(),
        createdById: session.user.id,
        studentId: session.user.id,
        opponentUserId: input.opponentUserId,
        aiPersona: input.mode === "AI" ? input.aiPersona ?? "socratic-questioner" : null
      }
    });

    return NextResponse.json({ debate }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
