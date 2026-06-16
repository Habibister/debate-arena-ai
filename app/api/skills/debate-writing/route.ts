import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJson, unauthorized } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { XP_REWARDS } from "@/lib/constants";
import { gradeDebateWritingResponse, getDebateSkillScenario } from "@/lib/debate-skill-practice";
import { prisma } from "@/lib/prisma";
import { calculateRank } from "@/lib/xp";

export const runtime = "nodejs";

const debateWritingSchema = z.object({
  slug: z.string().min(2).max(120),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ELITE"]).default("BEGINNER"),
  response: z.string().min(10).max(8000),
  scenarioIndex: z.number().int().min(0).max(99).default(0)
});

function masteryLevel(score: number) {
  if (score >= 85) {
    return "MASTERED" as const;
  }

  if (score >= 70) {
    return "PRACTICING" as const;
  }

  return "LEARNING" as const;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const input = await parseJson(request, debateWritingSchema);
    const level = input.level ?? "BEGINNER";
    const scenarioIndex = input.scenarioIndex ?? 0;
    const scenario = getDebateSkillScenario(input.slug, level, scenarioIndex);
    const feedback = gradeDebateWritingResponse({
      slug: input.slug,
      level,
      response: input.response,
      scenarioIndex
    });
    const skill = await prisma.skill.findFirst({
      where: {
        organization: "DEBATE",
        OR: [
          { slug: input.slug },
          {
            lessons: {
              some: { slug: input.slug }
            }
          }
        ]
      },
      include: {
        lessons: {
          orderBy: { order: "asc" },
          take: 1
        }
      }
    });

    if (skill) {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUniqueOrThrow({
          where: { id: session.user.id },
          select: { xp: true }
        });
        const lesson = skill.lessons[0] ?? null;
        const existing = await tx.masteryProgress.findUnique({
          where: {
            userId_skillId: {
              userId: session.user.id,
              skillId: skill.id
            }
          }
        });
        const nextMastery = Math.min(100, Math.max(existing?.masteryPercent ?? 0, feedback.score));
        const attempt = await tx.practiceAttempt.create({
          data: {
            userId: session.user.id,
            skillId: skill.id,
            lessonId: lesson?.id,
            status: "COMPLETED",
            score: feedback.score,
            correctCount: feedback.score >= 70 ? 1 : 0,
            totalQuestions: 1,
            weakSkills: feedback.weakSkills,
            masteredConcepts: feedback.score >= 85 ? [scenario.skillName] : [],
            reviewConcepts: feedback.weakSkills,
            completedAt: new Date()
          }
        });

        await tx.questionAttempt.create({
          data: {
            attemptId: attempt.id,
            userId: session.user.id,
            skillId: skill.id,
            lessonId: lesson?.id,
            prompt: scenario.prompt,
            selectedAnswer: input.response,
            correctAnswer: feedback.improvedVersion,
            isCorrect: feedback.score >= 70,
            explanation: feedback.missing.join(" "),
            skillTag: scenario.skillName,
            retryPrompt: feedback.nextPrompt
          }
        });

        if (existing) {
          await tx.masteryProgress.update({
            where: { id: existing.id },
            data: {
              masteryLevel: masteryLevel(nextMastery),
              masteryPercent: nextMastery,
              xpEarned: { increment: XP_REWARDS.lessonCompleted },
              correctCount: { increment: feedback.score >= 70 ? 1 : 0 },
              incorrectCount: { increment: feedback.score >= 70 ? 0 : 1 },
              weakSkillCount: { increment: feedback.weakSkills.length > 0 ? 1 : 0 },
              recommendedLessonId: lesson?.id,
              lastPracticedAt: new Date()
            }
          });
        } else {
          await tx.masteryProgress.create({
            data: {
              userId: session.user.id,
              skillId: skill.id,
              masteryLevel: masteryLevel(nextMastery),
              masteryPercent: nextMastery,
              xpEarned: XP_REWARDS.lessonCompleted,
              correctCount: feedback.score >= 70 ? 1 : 0,
              incorrectCount: feedback.score >= 70 ? 0 : 1,
              weakSkillCount: feedback.weakSkills.length > 0 ? 1 : 0,
              recommendedLessonId: lesson?.id,
              lastPracticedAt: new Date()
            }
          });
        }

        await tx.xPLog.create({
          data: {
            userId: session.user.id,
            amount: XP_REWARDS.lessonCompleted,
            reason: `Completed debate writing practice: ${scenario.skillName}`,
            sourceType: "LESSON",
            sourceId: attempt.id
          }
        });

        const nextXp = user.xp + XP_REWARDS.lessonCompleted;
        await tx.user.update({
          where: { id: session.user.id },
          data: {
            xp: nextXp,
            rank: calculateRank(nextXp)
          }
        });
      });
    }

    return NextResponse.json({
      scenario,
      feedback
    });
  } catch (error) {
    return apiError(error);
  }
}
