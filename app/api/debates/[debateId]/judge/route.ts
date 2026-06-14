import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { judgeDebate, judgeDecaRoleplay, judgeHosaPerformance } from "@/lib/ai";
import { apiError, HttpError, unauthorized } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateRank } from "@/lib/xp";
import { XP_REWARDS } from "@/lib/constants";

export const runtime = "nodejs";

function normalizeScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

type CategoryScore = {
  key: string;
  score: number;
};

type JudgeResult = {
  overallScore: number;
  categoryScores: CategoryScore[];
  sharedSpeaking?: {
    clarity?: number;
    confidence?: number;
    pacing?: number;
    volume?: number;
    organization?: number;
    vocabulary?: number;
    persuasion?: number;
    professionalism?: number;
  };
  strengths: string[];
  weaknesses: string[];
  improvementAdvice?: string[];
  recommendedLessons?: Array<{ lessonSlug: string; reason: string; priority: "high" | "medium" | "low" }>;
  readinessForNextLevel: {
    ready: boolean;
    rationale: string;
    nextMilestone: string;
  };
};

function categoryScore(result: JudgeResult, keys: string[]) {
  const found = result.categoryScores.find((category) => keys.includes(category.key));
  if (!found) {
    return undefined;
  }

  return found.score <= 5 ? normalizeScore(found.score * 20) : normalizeScore(found.score);
}

async function runOrganizationJudge(debate: {
  organization: "DEBATE" | "MODEL_UN" | "DECA" | "HOSA" | "MOCK_TRIAL" | "PUBLIC_SPEAKING";
  eventType: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ELITE";
  topic: string;
  messages: Array<{ role: "AFFIRMATIVE" | "NEGATIVE" | "MODERATOR" | "JUDGE" | "SYSTEM"; round: number; content: string }>;
}) {
  const transcript = debate.messages.map((message) => ({
    role: message.role,
    round: message.round,
    content: message.content
  }));

  if (debate.organization === "DECA") {
    return judgeDecaRoleplay({
      level: debate.level,
      eventType: debate.eventType,
      scenario: debate.topic,
      transcript
    });
  }

  if (debate.organization === "HOSA") {
    return judgeHosaPerformance({
      level: debate.level,
      eventType: debate.eventType,
      scenario: debate.topic,
      transcript
    });
  }

  return judgeDebate({
    organization: debate.organization,
    level: debate.level,
    eventType: debate.eventType,
    topic: debate.topic,
    transcript
  });
}

export async function POST(_request: Request, { params }: { params: { debateId: string } }) {
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
      throw new HttpError("This debate has already been judged", 409);
    }

    const studentTurns = debate.messages.filter((message) => message.authorId === session.user.id);

    if (studentTurns.length < debate.roundsMinimum) {
      throw new HttpError(`Complete at least ${debate.roundsMinimum} student turns before judging.`, 409);
    }

    const result = (await runOrganizationJudge(debate)) as JudgeResult;

    const scores = {
      logic: categoryScore(result, ["argument", "businessReasoning", "healthScienceKnowledge"]),
      evidence: categoryScore(result, ["contentEvidence", "performanceIndicators", "medicalAccuracy"]),
      rebuttal: categoryScore(result, ["refutation", "judgeQuestions", "scenarioResponse"]),
      persuasion: categoryScore(result, ["clash", "solutionQuality", "taskCompletion"]),
      clarity: result.sharedSpeaking?.clarity ? normalizeScore(result.sharedSpeaking.clarity) : undefined,
      communication: result.sharedSpeaking?.professionalism
        ? normalizeScore(result.sharedSpeaking.professionalism)
        : result.sharedSpeaking?.confidence
          ? normalizeScore(result.sharedSpeaking.confidence)
          : undefined
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
          recommendations: [
            ...(result.improvementAdvice ?? []),
            ...(result.recommendedLessons ?? []).map((lesson) => lesson.reason)
          ],
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

      if (result.sharedSpeaking) {
        await tx.speakingSkillSnapshot.create({
          data: {
            userId: session.user.id,
            organization: debate.organization,
            eventType: debate.eventType,
            sourceType: debate.practiceMode,
            sourceId: debate.id,
            clarity: result.sharedSpeaking.clarity,
            confidence: result.sharedSpeaking.confidence,
            pacing: result.sharedSpeaking.pacing,
            volume: result.sharedSpeaking.volume,
            organizationScore: result.sharedSpeaking.organization,
            vocabulary: result.sharedSpeaking.vocabulary,
            persuasion: result.sharedSpeaking.persuasion,
            professionalism: result.sharedSpeaking.professionalism
          }
        });
      }

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
