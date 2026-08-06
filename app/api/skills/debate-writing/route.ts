import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, parseJson, unauthorized } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { XP_REWARDS } from "@/lib/constants";
import { gradeDebateWritingResponse } from "@/lib/debate-skill-practice";
import {
  completedPurgeAfter,
  lockUserRow,
  parsePracticeSessionSnapshot,
  parseStoredResult,
  sessionExpired,
  sessionNotFound
} from "@/lib/practice-session";
import { prisma } from "@/lib/prisma";
import { recordPracticeOutcomeInTransaction, txMasteryMayDecrease } from "@/lib/spaced-review";
import { awardXpInTransaction } from "@/lib/xp";
import { writingSessionSubmitRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Grade one Debate-writing submission against a SERVER-ISSUED session (M13E2 Phase C2b).
//
// The request carries a session id and the learner's prose. It no longer carries a slug, a level or
// a `scenarioIndex`, so a client can no longer choose its own prompt, and the scenario graded is the
// one this learner was actually issued.
//
// ONE ISSUED SESSION AWARDS XP AT MOST ONCE. A completed session replays its stored result before
// the grader or any XP path runs, so a retry after a lost response costs nothing and is not an error.
// Requesting a NEW session and completing it still awards the current amount, exactly as before —
// broader XP-farming policy is deferred, not silently changed here.
//
// The grader, its threshold, the feedback shape and the XP amount are all unchanged.
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
    const userId = session.user.id;

    const input = await parseJson(request, writingSessionSubmitRequestSchema);
    // ONE server timestamp governs the whole submission.
    const now = new Date();

    const payload = await prisma.$transaction(async (tx) => {
      // FIRST statement: the loser of two concurrent submits waits here, then sees COMPLETED.
      await lockUserRow(tx, userId);

      const issued = await tx.practiceSession.findFirst({
        where: { id: input.sessionId, userId, kind: "DEBATE_WRITING" }
      });
      if (!issued) sessionNotFound();

      // Completed: replay the stored result BEFORE the grader and before any XP path.
      if (issued.status === "COMPLETED") {
        return { ...parseStoredResult(issued.resultJson), alreadyCompleted: true };
      }
      if (issued.expiresAt <= now) sessionExpired();

      const snapshot = parsePracticeSessionSnapshot(issued.scenarioJson, "WRITING");
      if (snapshot.kind !== "WRITING") sessionNotFound();
      const scenario = snapshot.scenario;
      // The index was frozen at issuance; it reproduces the ISSUED scenario for the existing grader
      // and never comes from the request.
      const scenarioIndex = (scenario as { scenarioIndex?: number }).scenarioIndex ?? 0;

      const feedback = gradeDebateWritingResponse({
        slug: scenario.skillSlug,
        level: scenario.level,
        response: input.response,
        scenarioIndex
      });

      const skill = await tx.skill.findFirst({
        where: {
          organization: "DEBATE",
          OR: [
            { slug: scenario.skillSlug },
            {
              lessons: {
                some: { slug: scenario.skillSlug }
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
        const passed = feedback.score >= 70;
        // Review FIRST; its result decides what mastery may do. No independent due check.
        const review = await recordPracticeOutcomeInTransaction(tx, {
          userId,
          skillId: skill.id,
          scorePercent: feedback.score,
          passed,
          now
        });

        const lesson = skill.lessons[0] ?? null;
        const existing = await tx.masteryProgress.findUnique({
          where: { userId_skillId: { userId, skillId: skill.id } }
        });
        // A failed DUE reassessment is the only branch that may lower mastery.
        const nextMastery = txMasteryMayDecrease(review)
          ? Math.min(existing?.masteryPercent ?? 0, feedback.score)
          : Math.min(100, Math.max(existing?.masteryPercent ?? 0, feedback.score));

        const attempt = await tx.practiceAttempt.create({
          data: {
            userId,
            skillId: skill.id,
            lessonId: lesson?.id,
            status: "COMPLETED",
            score: feedback.score,
            correctCount: feedback.score >= 70 ? 1 : 0,
            totalQuestions: 1,
            weakSkills: feedback.weakSkills,
            masteredConcepts: feedback.score >= 85 ? [scenario.skillName] : [],
            reviewConcepts: feedback.weakSkills,
            completedAt: now
          }
        });

        await tx.questionAttempt.create({
          data: {
            attemptId: attempt.id,
            userId,
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
              lastPracticedAt: now
            }
          });
        } else {
          await tx.masteryProgress.create({
            data: {
              userId,
              skillId: skill.id,
              masteryLevel: masteryLevel(nextMastery),
              masteryPercent: nextMastery,
              xpEarned: XP_REWARDS.lessonCompleted,
              correctCount: feedback.score >= 70 ? 1 : 0,
              incorrectCount: feedback.score >= 70 ? 0 : 1,
              weakSkillCount: feedback.weakSkills.length > 0 ? 1 : 0,
              recommendedLessonId: lesson?.id,
              lastPracticedAt: now
            }
          });
        }

        await tx.xPLog.create({
          data: {
            userId,
            amount: XP_REWARDS.lessonCompleted,
            reason: `Completed debate writing practice: ${scenario.skillName}`,
            sourceType: "LESSON",
            sourceId: attempt.id
          }
        });

        // Atomic increment, with rank derived from the value the increment RETURNED. A plain SELECT
        // never blocks under MVCC, so the old read-add-write could be erased by a concurrent writer.
        await awardXpInTransaction(tx, userId, XP_REWARDS.lessonCompleted);
      }

      const result = {
        scenario: {
          skillSlug: scenario.skillSlug,
          skillName: scenario.skillName,
          level: scenario.level,
          motion: scenario.motion,
          side: scenario.side,
          prompt: scenario.prompt,
          hint: scenario.hint,
          modelExample: scenario.modelExample,
          rubricFocus: scenario.rubricFocus
        },
        feedback,
        sessionId: issued.id,
        completedAtIso: now.toISOString()
      };

      await tx.practiceSession.update({
        where: { id: issued.id },
        data: {
          status: "COMPLETED",
          completedAt: now,
          purgeAfter: completedPurgeAfter(now),
          resultJson: result
        }
      });

      return { ...result, alreadyCompleted: false };
    });

    return NextResponse.json(payload);
  } catch (error) {
    return apiError(error);
  }
}
