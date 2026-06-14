import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { judgeDebate, judgeDecaRoleplay, judgeHosaPerformance } from "@/lib/ai";
import { apiError, HttpError, unauthorized } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { getNextSpeech, isSpeechComplete, parseFormatConfig } from "@/lib/debate-formats";
import { prisma } from "@/lib/prisma";
import { calculateRank } from "@/lib/xp";
import { XP_REWARDS } from "@/lib/constants";

export const runtime = "nodejs";

function normalizeScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

type CategoryScore = {
  key: string;
  label?: string;
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
  teamWinner?: "GOVERNMENT" | "OPPOSITION";
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

function debateSkillRecommendations(result: JudgeResult) {
  const weakText = [
    ...result.weaknesses,
    ...result.categoryScores.filter((category) => category.score <= 3 || category.score <= 65).map((category) => category.label ?? category.key)
  ]
    .join(" ")
    .toLowerCase();

  const recommendations: Array<{ lessonSlug: string; reason: string; priority: "high" | "medium" | "low" }> = [];

  const add = (lessonSlug: string, reason: string, priority: "high" | "medium" | "low" = "medium") => {
    if (!recommendations.some((item) => item.lessonSlug === lessonSlug)) {
      recommendations.push({ lessonSlug, reason, priority });
    }
  };

  if (weakText.includes("refut") || weakText.includes("rebut")) {
    add("debate-refutation-lesson", "Build direct refutation so each answer clearly clashes with the opponent's claim.", "high");
  }

  if (weakText.includes("signpost") || weakText.includes("organization")) {
    add("debate-signposting-lesson", "Strengthen organization and signposting so the judge can follow the flow.", "high");
  }

  if (weakText.includes("evidence") || weakText.includes("support") || weakText.includes("content")) {
    add("debate-claim-warrant-impact-lesson", "Improve support by connecting claims, warrants, and impacts.", "medium");
  }

  if (weakText.includes("weigh") || weakText.includes("impact") || weakText.includes("clash")) {
    add("debate-weighing-lesson", "Practice comparing impacts and explaining why one argument should decide the round.", "medium");
  }

  if (weakText.includes("structure") || weakText.includes("speech")) {
    add("debate-constructive-speeches-lesson", "Build clearer speech structure for constructive and summary work.", "low");
  }

  return recommendations.slice(0, 5);
}

function didStudentWin(result: JudgeResult, studentSide: "GOVERNMENT" | "OPPOSITION" | "FOR" | "AGAINST", overallScore: number) {
  if (!result.teamWinner) {
    return overallScore >= 80;
  }

  if (result.teamWinner === "GOVERNMENT") {
    return studentSide === "GOVERNMENT" || studentSide === "FOR";
  }

  return studentSide === "OPPOSITION" || studentSide === "AGAINST";
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

    const formatConfig = parseFormatConfig(debate.formatConfig, debate.format, debate.turnTimeSeconds);

    if (!isSpeechComplete(debate.messages, formatConfig)) {
      const completedSpeechCount = debate.messages.filter((message) => message.role === "AFFIRMATIVE" || message.role === "NEGATIVE").length;
      const nextSpeech = getNextSpeech(formatConfig, completedSpeechCount);
      throw new HttpError(
        nextSpeech
          ? `Complete all required speeches before judging. Next up: ${nextSpeech.label}.`
          : "Complete all required speeches before judging.",
        409
      );
    }

    const result = (await runOrganizationJudge(debate)) as JudgeResult;
    const targetedRecommendations = debateSkillRecommendations(result);
    result.recommendedLessons = [
      ...targetedRecommendations,
      ...(result.recommendedLessons ?? []).filter(
        (lesson) => !targetedRecommendations.some((targeted) => targeted.lessonSlug === lesson.lessonSlug)
      )
    ].slice(0, 6);

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
    const wonDebate = didStudentWin(result, debate.studentSide, overallScore);
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
