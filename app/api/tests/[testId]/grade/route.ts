import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, HttpError, parseJson, unauthorized } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { practiceTestGradeSchema } from "@/lib/validators";
import { XP_REWARDS } from "@/lib/constants";
import { awardXpInTransaction } from "@/lib/xp";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { testId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
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
      throw new HttpError("Practice test not found", 404);
    }

    if (test.status === "COMPLETED") {
      throw new HttpError("Practice test has already been graded", 409);
    }

    const questionIds = new Set(test.questions.map((question) => question.id));
    const submittedQuestionIds = new Set(input.answers.map((answer) => answer.questionId));

    if (
      submittedQuestionIds.size !== test.questions.length ||
      input.answers.length !== test.questions.length ||
      input.answers.some((answer) => !questionIds.has(answer.questionId))
    ) {
      throw new HttpError("Submit one answer for every question in this practice test", 400);
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

    let recommendedLessons = lessons
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

    if (recommendedLessons.length === 0 && weakAreas.length > 0) {
      recommendedLessons = lessons.slice(0, 3).map((lesson) => ({
        lessonSlug: lesson.slug,
        title: lesson.title,
        reason: `Builds foundational ${lesson.skill.name} skills that support ${weakAreas[0]}.`
      }));
    }

    await prisma.$transaction(async (tx) => {
      // M15 S1A A2 — EXACTLY-ONCE CLAIM, before ANY write in this transaction (including the
      // answer upserts below). The COMPLETED pre-read above is a fast path only; this conditional
      // transition is the correctness mechanism: the losing concurrent grade blocks on the row
      // lock, re-evaluates against the committed row, matches zero rows and exits with 409 having
      // written nothing. A later failure rolls the claim back with the transaction, so an
      // ungraded test stays gradable. Eligibility is exactly the pre-read's set
      // ({GENERATED, IN_PROGRESS} -> COMPLETED); the full result update below keeps writing
      // score/weakAreas/recommendations as before. Actual simultaneous-request behavior relies on
      // PostgreSQL conditional-update semantics; no DB-writing concurrency test was executed.
      const claim = await tx.practiceTest.updateMany({
        where: { id: test.id, userId: session.user.id, status: { not: "COMPLETED" } },
        data: { status: "COMPLETED" }
      });
      if (claim.count === 0) {
        throw new HttpError("Practice test has already been graded", 409);
      }

      // XP is no longer read here. A plain SELECT never blocks under MVCC, so reading xp, adding in
      // JavaScript and writing the sum back could be erased by a concurrent writer that committed in
      // between — a row lock orders that write but cannot repair a value already stale when read.
      // `awardXpInTransaction` increments atomically instead. Streak keeps its existing behaviour
      // exactly, including its own pre-read staleness, which remains carried work.
      const user = await tx.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { streak: true }
      });

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

      // Same amount, same eligibility, same response contract — only the write is made safe.
      await awardXpInTransaction(tx, session.user.id, XP_REWARDS.practiceTest);
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          streak: user.streak + 1
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
