import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, parseJson, unauthorized } from "@/lib/api";
import { authOptions } from "@/lib/auth";
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
import { writingSessionSubmitRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Grade one Debate-writing submission against a SERVER-ISSUED session (M13E2 Phase C2b).
//
// The request carries a session id and the learner's prose. It no longer carries a slug, a level or
// a `scenarioIndex`, so a client can no longer choose its own prompt, and the scenario graded is the
// one this learner was actually issued.
//
// FORMATIVE ONLY (M15 S1A A1). The grader is a keyword/structure checklist, not a semantic
// assessment: a keyword-stuffed non-argument can max it out. Coaching value and progression
// authority are therefore separated — this route returns the full heuristic feedback (score,
// checklist rubric, strengths, missing elements, suggestions, stronger version) and stores the
// completed result on the issued session for replay, but it writes NO authoritative learner
// evidence: no MasteryProgress, no mastery level, no XP, no XPLog, no rank movement, no
// review-ladder advancement, and no PracticeAttempt/QuestionAttempt rows (a COMPLETED
// PracticeAttempt with a lessonId is valid LESSON assignment evidence, which formative writing
// practice must never mint). The response carries `formative: true` so clients can label it
// truthfully. Restoring any progression here requires a trustworthy grading basis first.
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

      // Completed: replay the stored result BEFORE the grader runs. Older stored results predate the
      // formative flag, so it is asserted on the way out rather than trusted from storage.
      if (issued.status === "COMPLETED") {
        return { ...parseStoredResult(issued.resultJson), formative: true, alreadyCompleted: true };
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
        formative: true,
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
