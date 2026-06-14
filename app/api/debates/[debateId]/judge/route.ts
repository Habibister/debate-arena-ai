import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { judgeDebate } from "@/lib/ai";
import { apiError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateRank } from "@/lib/xp";
import { XP_REWARDS } from "@/lib/constants";

export const runtime = "nodejs";

function normalizeScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function POST(_request: Request, { params }: { params: { debateId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }

    const studentTurns = debate.messages.filter((message) => message.authorId === session.user.id);

    if (studentTurns.length < debate.roundsMinimum) {
      return NextResponse.json(
        { error: `Complete at least ${debate.roundsMinimum} student turns before judging.` },
        { status: 409 }
      );
    }

    const result = await judgeDebate({
      organization: debate.organization,
      level: debate.level,
      topic: debate.topic,
      transcript: debate.messages.map((message) => ({
        role: message.role,
        round: message.round,
        content: message.content
      }))
    });

    const scores = {
      logic: normalizeScore(result.scores.logic),
      evidence: normalizeScore(result.scores.evidence),
      rebuttal: normalizeScore(result.scores.rebuttal),
      persuasion: normalizeScore(result.scores.persuasion),
      clarity: normalizeScore(result.scores.clarity),
      communication: normalizeScore(result.scores.communication)
    };
    const overallScore = normalizeScore(result.overallScore);
    const wonDebate = overallScore >= 80;
    const xpEarned = XP_REWARDS.debateCompleted + (wonDebate ? XP_REWARDS.debateWon : 0);

    const [updatedDebate, updatedUser] = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { xp: true, wins: true, streak: true }
      });

      const nextXp = user.xp + xpEarned;

      const savedDebate = await tx.debate.update({
        where: { id: debate.id },
        data: {
          status: "JUDGED",
          completedAt: new Date(),
          logicScore: scores.logic,
          evidenceScore: scores.evidence,
          rebuttalScore: scores.rebuttal,
          persuasionScore: scores.persuasion,
          clarityScore: scores.clarity,
          communicationScore: scores.communication,
          overallScore,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          recommendations: result.recommendations,
          readiness: result.readinessForNextLevel,
          judgeReport: result
        }
      });

      const savedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          xp: nextXp,
          wins: wonDebate ? user.wins + 1 : user.wins,
          streak: user.streak + 1,
          rank: calculateRank(nextXp)
        }
      });

      await tx.xPLog.create({
        data: {
          userId: session.user.id,
          amount: xpEarned,
          reason: wonDebate ? "Completed and won AI debate" : "Completed AI debate",
          sourceType: "DEBATE",
          sourceId: debate.id
        }
      });

      return [savedDebate, savedUser] as const;
    });

    return NextResponse.json({
      debate: updatedDebate,
      user: {
        xp: updatedUser.xp,
        streak: updatedUser.streak,
        wins: updatedUser.wins,
        rank: updatedUser.rank
      },
      xpEarned,
      judge: result
    });
  } catch (error) {
    return apiError(error);
  }
}
