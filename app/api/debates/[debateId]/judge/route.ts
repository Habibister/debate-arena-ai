import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { generateJudgeDecision, judgeDecaRoleplay, judgeHosaPerformance } from "@/lib/openai-debate";
import { apiError, HttpError, unauthorized } from "@/lib/api";
import { clientIp } from "@/lib/api-auth";
import { authOptions } from "@/lib/auth";
import { nearestAiPersona } from "@/lib/ai-personas";
import { getNextSpeech, isSpeechComplete, parseFormatConfig } from "@/lib/debate-formats";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { calculateDebateRating, calculateRank } from "@/lib/xp";
import { XP_REWARDS } from "@/lib/constants";

export const runtime = "nodejs";

function normalizeScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

type CategoryScore = {
  key: string;
  label?: string;
  score: number;
  reason?: string;
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
  ratingChange?: {
    overall: number;
    argument: number;
    refutation: number;
    weighing: number;
    evidence: number;
    organization: number;
    deliveryStyle: number;
    recommendedBot: string;
    reasons?: {
      overall: string;
      argument: string;
      refutation: string;
      weighing: string;
      evidence: string;
      organization: string;
      deliveryStyle: string;
    };
  };
};

function findCategory(result: JudgeResult, keys: string[]) {
  return result.categoryScores.find((category) => keys.includes(category.key));
}

function categoryScore(result: JudgeResult, keys: string[]) {
  const found = findCategory(result, keys);
  if (!found) {
    return undefined;
  }

  return found.score <= 5 ? normalizeScore(found.score * 20) : normalizeScore(found.score);
}

function debateSkillRecommendations(result: JudgeResult) {
  const weakText = [
    ...result.weaknesses,
    ...result.categoryScores
      .filter((category) => (category.score <= 5 ? category.score <= 3 : category.score <= 65))
      .map((category) => category.label ?? category.key)
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

function skillDelta(score: number | undefined, fallbackScore: number) {
  const normalized = normalizeScore(score ?? fallbackScore);

  if (normalized >= 90) {
    return 14;
  }

  if (normalized >= 80) {
    return 9;
  }

  if (normalized >= 70) {
    return 4;
  }

  if (normalized >= 60) {
    return -3;
  }

  return -8;
}

function ratingReason(label: string, delta: number, category: CategoryScore | undefined, fallback: string) {
  const movement = delta > 0 ? "increased" : delta < 0 ? "decreased" : "stayed flat";
  const evidence = category?.reason ?? fallback;
  return `${label} ${movement} because ${evidence}`;
}

function overallRatingDelta(input: { wonDebate: boolean; overallScore: number; completedTurns: number; requiredTurns: number }) {
  const resultSwing = input.wonDebate ? 14 : -10;
  const qualitySwing = Math.round((input.overallScore - 75) / 3);
  const completionSwing = input.completedTurns >= input.requiredTurns ? 4 : -8;

  return Math.max(-24, Math.min(36, resultSwing + qualitySwing + completionSwing));
}

async function runOrganizationJudge(debate: {
  organization: "DEBATE" | "MODEL_UN" | "DECA" | "HOSA" | "MOCK_TRIAL" | "PUBLIC_SPEAKING";
  eventType: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ELITE";
  topic: string;
  messages: Array<{ role: "AFFIRMATIVE" | "NEGATIVE" | "MODERATOR" | "JUDGE" | "SYSTEM"; round: number; content: string }>;
  studentSide: "GOVERNMENT" | "OPPOSITION" | "FOR" | "AGAINST";
  opponentSide: "GOVERNMENT" | "OPPOSITION" | "FOR" | "AGAINST";
  format: string;
  aiPersona: string | null;
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

  return generateJudgeDecision({
    organization: debate.organization,
    level: debate.level,
    eventType: debate.eventType,
    topic: debate.topic,
    transcript,
    studentSide: debate.studentSide,
    opponentSide: debate.opponentSide,
    format: debate.format,
    aiPersona: debate.aiPersona
  });
}

export async function POST(request: Request, { params }: { params: { debateId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    await enforceRateLimit({ userId: session.user.id, ip: clientIp(request), workload: "heavy" });

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
    const completedSpeechCount = debate.messages.filter((message) => message.role === "AFFIRMATIVE" || message.role === "NEGATIVE").length;
    const argumentCategory = findCategory(result, ["argument"]);
    const refutationCategory = findCategory(result, ["refutation"]);
    const weighingCategory = findCategory(result, ["clash", "weighing", "solutionQuality"]);
    const evidenceCategory = findCategory(result, ["contentEvidence", "performanceIndicators", "medicalAccuracy"]);
    const organizationCategory = findCategory(result, ["organization", "signposting", "taskCompletion"]);
    const deliveryCategory = findCategory(result, ["delivery", "style", "professionalCommunication"]);
    const ratingDelta = overallRatingDelta({
      wonDebate,
      overallScore,
      completedTurns: completedSpeechCount,
      requiredTurns: formatConfig.speeches.length
    });
    let resultWithRating: JudgeResult = result;

    const [updatedDebate, updatedUser] = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { xp: true, wins: true, streak: true }
      });

      const nextXp = user.xp + xpEarned;
      const projectedRating = calculateDebateRating({
        xp: nextXp,
        wins: wonDebate ? user.wins + 1 : user.wins
      });
      const argumentDelta = skillDelta(scores.logic, overallScore);
      const refutationDelta = skillDelta(scores.rebuttal, overallScore);
      const weighingDelta = skillDelta(categoryScore(result, ["clash", "weighing", "solutionQuality"]), overallScore);
      const evidenceDelta = skillDelta(scores.evidence, overallScore);
      const organizationDelta = skillDelta(categoryScore(result, ["organization", "signposting", "taskCompletion"]), overallScore);
      const deliveryDelta = skillDelta(categoryScore(result, ["delivery", "style", "professionalCommunication"]), scores.communication ?? overallScore);

      resultWithRating = {
        ...result,
        ratingChange: {
          overall: ratingDelta,
          argument: argumentDelta,
          refutation: refutationDelta,
          weighing: weighingDelta,
          evidence: evidenceDelta,
          organization: organizationDelta,
          deliveryStyle: deliveryDelta,
          recommendedBot: nearestAiPersona(projectedRating).name,
          reasons: {
            overall: `${ratingDelta >= 0 ? "Overall rating increased" : "Overall rating decreased"} because the student ${wonDebate ? "won" : "lost"} this judged round with a ${overallScore} overall performance score.`,
            argument: ratingReason("Argument rating", argumentDelta, argumentCategory, "the judge's argument score came from the student's claim clarity."),
            refutation: ratingReason("Refutation rating", refutationDelta, refutationCategory, "the judge evaluated how specifically the student answered the opponent."),
            weighing: ratingReason("Weighing rating", weighingDelta, weighingCategory, "the judge evaluated impact comparison and ballot framing."),
            evidence: ratingReason("Evidence rating", evidenceDelta, evidenceCategory, "the judge evaluated examples, evidence, and support."),
            organization: ratingReason("Organization rating", organizationDelta, organizationCategory, "the judge evaluated structure and signposting."),
            deliveryStyle: ratingReason("Delivery/style rating", deliveryDelta, deliveryCategory, "the judge evaluated style, clarity, and communication.")
          }
        }
      };

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
          judgeReport: resultWithRating
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
      judge: resultWithRating
    });
  } catch (error) {
    return apiError(error);
  }
}
