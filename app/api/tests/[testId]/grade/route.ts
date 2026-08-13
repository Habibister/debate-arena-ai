import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, HttpError, parseJson, unauthorized } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lockUserRow } from "@/lib/practice-session";
import { practiceTestGradeSchema } from "@/lib/validators";
import { awardXpInTransaction, rewardAmountForCompletion, utcDayBounds } from "@/lib/xp";

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

      // M15 S1A A4a — SECOND: serialize this learner's reward path. The A2 claim above already made
      // THIS test exactly-once; the lock is what makes the DAILY QUOTA exact across DISTINCT tests.
      // Without it two concurrent grades of two different tests could both read "2 awards today" and
      // both award a third. Reuses the existing `FOR UPDATE` primitive rather than a second copy.
      await lockUserRow(tx, session.user.id, () => {
        throw new HttpError("Your account could not be loaded, so this test was not graded. Try again.", 409);
      });

      // THIRD: one server timestamp, captured AFTER the lock — the lock can block behind another
      // transaction, so a request that began at 23:59:58 UTC could otherwise be judged against the
      // previous day's quota.
      const now = new Date();
      const { start: dayStart, end: dayEnd } = utcDayBounds(now);

      // FOURTH: count only POSITIVE PracticeTest awards today. Zero-amount rows record post-quota
      // completions (keeping the coach's "active" date truthful) and must not consume quota. DEBATE
      // rows are a separate quota, excluded by sourceType.
      const positiveAwardsToday = await tx.xPLog.count({
        where: {
          userId: session.user.id,
          sourceType: "PRACTICE_TEST",
          amount: { gt: 0 },
          createdAt: { gte: dayStart, lt: dayEnd }
        }
      });
      // Note what is NOT consulted: `score`. A legitimately completed test earns its reward on the
      // completion fact alone. Gating XP on the result would penalise exactly the learner who most
      // needs to keep practising.
      const xpEarned = rewardAmountForCompletion("PRACTICE_TEST", positiveAwardsToday);

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

      // A4a — Z1: ONE ledger row per completed source, always, even when it earned nothing. This row
      // is also the ONLY persisted record of what this test paid: the results page is a separate
      // server component reached by navigation, and the grade response is discarded by the client,
      // so `amount` here is what that page reads back. Omitting it past the quota would both hide
      // real activity from the coach's "active" date and leave the results page with nothing true
      // to show.
      await tx.xPLog.create({
        data: {
          userId: session.user.id,
          amount: xpEarned,
          reason:
            xpEarned > 0
              ? `Completed ${test.organization} practice test`
              : `Completed ${test.organization} practice test (daily XP limit reached)`,
          sourceType: "PRACTICE_TEST",
          sourceId: test.id,
          createdAt: now
        }
      });

      // Award atomically when eligible. Past the quota `awardXpInTransaction` is NOT called with 0 —
      // that would be two pointless writes and a rank re-derivation from an unchanged value.
      if (xpEarned > 0) {
        await awardXpInTransaction(tx, session.user.id, xpEarned);
      }
      // A4a: `User.streak` is a LIFETIME count of completed practice activities, not a
      // consecutive-day streak — no date field or reset exists anywhere. It increments on every
      // completed test, including past the XP quota, because the learner really did complete another
      // practice session. `{ increment: 1 }` replaces a stale read-add-write that could lose a
      // concurrent update.
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          streak: { increment: 1 }
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
