import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { practiceTestGradeSchema } from "@/lib/validators";
import { XP_REWARDS } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { testId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input = await parseJson(request, practiceTestGradeSchema);
    const test = await prisma.practiceTest.findFirst({
      where: {
        id: params.testId,
        userId: session.user.id
      },
      include: {
        questions: true
      }
    });

    if (!test) {
      return NextResponse.json({ error: "Practice test not found" }, { status: 404 });
    }

    const answerMap = new Map(input.answers.map((answer) => [answer.questionId, answer.selectedAnswer]));
    const gradedQuestions = test.questions.map((question) => {
      const selectedAnswer = answerMap.get(question.id) ?? "";
      const isCorrect = selectedAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

      return {
        question,
        selectedAnswer,
        isCorrect
      };
    });

    const correctCount = gradedQuestions.filter((item) => item.isCorrect).length;
    const score = Math.round((correctCount / Math.max(test.questions.length, 1)) * 100);
    const weakAreas = Array.from(
      new Set(gradedQuestions.filter((item) => !item.isCorrect).map((item) => item.question.skillTag))
    );

    const lessons = await prisma.lesson.findMany({
      where: {
        skill: {
          organization: test.organization
        }
      },
      include: { skill: true },
      take: 20
    });

    const recommendedLessons = lessons
      .filter((lesson) =>
        weakAreas.some((area) => {
          const normalizedArea = area.toLowerCase();
          return (
            lesson.title.toLowerCase().includes(normalizedArea) ||
            lesson.skill.name.toLowerCase().includes(normalizedArea) ||
            normalizedArea.includes(lesson.skill.name.toLowerCase())
          );
        })
      )
      .slice(0, 5)
      .map((lesson) => ({
        lessonSlug: lesson.slug,
        title: lesson.title,
        reason: `Targets ${lesson.skill.name}, which appeared in your missed-question pattern.`
      }));

    await prisma.$transaction(async (tx) => {
      for (const item of gradedQuestions) {
        await tx.practiceAnswer.upsert({
          where: {
            questionId_userId: {
              questionId: item.question.id,
              userId: session.user.id
            }
          },
          update: {
            selectedAnswer: item.selectedAnswer,
            isCorrect: item.isCorrect,
            explanationShown: true
          },
          create: {
            testId: test.id,
            questionId: item.question.id,
            userId: session.user.id,
            selectedAnswer: item.selectedAnswer,
            isCorrect: item.isCorrect,
            explanationShown: true
          }
        });
      }

      await tx.practiceTest.update({
        where: { id: test.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          score,
          weakAreas,
          recommendations: {
            lessons: recommendedLessons,
            note:
              weakAreas.length > 0
                ? "Review the recommended lessons, then regenerate a shorter test in the same event cluster."
                : "Strong performance. Move up a difficulty level or switch event clusters."
          }
        }
      });

      await tx.xPLog.create({
        data: {
          userId: session.user.id,
          amount: XP_REWARDS.practiceTest,
          reason: `Completed ${test.organization} practice test`,
          sourceType: "PRACTICE_TEST",
          sourceId: test.id
        }
      });
    });

    return NextResponse.json({
      score,
      correctCount,
      total: test.questions.length,
      weakAreas,
      recommendedLessons,
      explanations: gradedQuestions.map((item) => ({
        questionId: item.question.id,
        selectedAnswer: item.selectedAnswer,
        correctAnswer: item.question.correctAnswer,
        isCorrect: item.isCorrect,
        explanation: item.question.explanation,
        skillTag: item.question.skillTag
      }))
    });
  } catch (error) {
    return apiError(error);
  }
}
