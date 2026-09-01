import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { debateMasteryHeld, DEBATE_DRILL_REQUIRED_UNIQUE, DRILL_AREAS, DRILL_PASS_THRESHOLD } from "@/lib/debate-drills";
import {
  aggregateAreaEvidence,
  completedPurgeAfter,
  lockUserRow,
  parseStoredResult,
  requireEveryItemAnswered,
  sessionExpired,
  sessionNotFound
} from "@/lib/practice-session";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordDrillMasteryInTransaction, recordPracticeOutcomeInTransaction } from "@/lib/spaced-review";
import { practiceSessionSubmitRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Finish a General Debate concept-drill session (M13E2 Phase C2).
//
// The request carries a session id and NOTHING else. Answers were recorded server-side as they were
// given, so a client can no longer submit bank ids it was never served, cherry-pick a passing subset,
// or replay a stored payload.
//
// GRADED FROM THE SNAPSHOT. Correctness comes from `PracticeSessionItem.isCorrect`, recorded at
// answer time, never from a fresh bank lookup. Editing a question after issuance therefore cannot
// change a grade already earned — which also removes the path where a content edit silently demoted
// a learner's mastery on a due review.
//
// The two-number split from M13E1E is now structural rather than computed: item rows are one per
// DISTINCT question, so first-occurrence de-duplication is inherent and a padded twenty-slot session
// contributes exactly its nine unique questions. Floor (5) and threshold (70) are unchanged, and a
// repeated slot still adds no evidence.
type PersistenceStatus = "not-attempted" | "updated" | "skill-missing";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, practiceSessionSubmitRequestSchema);

    // ONE server timestamp governs this whole submission.
    const now = new Date();

    const payload = await prisma.$transaction(async (tx) => {
      // FIRST statement: the loser of two concurrent submits waits here, then sees COMPLETED.
      await lockUserRow(tx, user.id);

      const session = await tx.practiceSession.findFirst({
        where: { id: input.sessionId, userId: user.id, kind: "DEBATE_DRILL" },
        include: { items: { orderBy: { displayOrder: "asc" } } }
      });
      if (!session) sessionNotFound();

      // Already finished: replay the stored result. Zero effects, and deliberately NOT a 409 — a
      // learner retrying after a lost response has done nothing wrong.
      if (session.status === "COMPLETED") {
        return { ...parseStoredResult(session.resultJson), alreadyCompleted: true };
      }
      if (session.expiresAt <= now) sessionExpired();

      const answered = requireEveryItemAnswered(session.items);
      const evidence = aggregateAreaEvidence(answered);

      const wroteSkills: string[] = [];
      const perSkill = [];
      for (const area of evidence) {
        const meta = DRILL_AREAS.find((a) => a.id === area.area);
        // SECURE-EVIDENCE AREAS use distinct evidence KEYS, not distinct question ids, and practice
        // items contribute nothing. The floor and the threshold are unchanged — only what counts as a
        // unit changed. Legacy areas (no `secure` block) keep the original two lines exactly.
        const secure = area.secure;
        const evidenceTotal = secure ? secure.secureUniqueTotal : area.uniqueTotal;
        const evidenceCorrect = secure ? secure.secureUniqueCorrect : area.uniqueCorrect;
        const scoreForEvidence = secure ? secure.secureEvidenceScore : area.evidenceScore;
        const qualifies = evidenceTotal >= DEBATE_DRILL_REQUIRED_UNIQUE;
        const passed = qualifies && scoreForEvidence >= DRILL_PASS_THRESHOLD;
        const evidenceStatus = !qualifies ? "insufficient-evidence" : passed ? "passing" : "below-threshold";

        let persistenceStatus: PersistenceStatus = "not-attempted";
        // MASTERY HOLD. A skill whose evidence model is under revalidation takes the same branch a
        // below-floor session takes: the persistence helpers are NOT CALLED, so there is no mastery
        // advance and no new review scheduling. Grading above is untouched — the learner still gets
        // correctness and feedback, and the score still returns. The floor and the threshold are not
        // altered; what pauses is the claim, not the assessment.
        const masteryHeld = debateMasteryHeld(area.skillSlug);
        // Below the floor the persistence helpers are NOT CALLED at all — no mastery, no review, and
        // no due-review knock-down from a session too short to have earned one.
        if (qualifies && area.skillSlug && !masteryHeld) {
          const skill = await tx.skill.findUnique({ where: { slug: area.skillSlug }, select: { id: true } });
          if (!skill) {
            persistenceStatus = "skill-missing";
          } else {
            // Review FIRST, then mastery consumes its result — no independent due check.
            const review = await recordPracticeOutcomeInTransaction(tx, {
              userId: user.id,
              skillId: skill.id,
              scorePercent: scoreForEvidence,
              passed,
              now
            });
            const mastery = await recordDrillMasteryInTransaction(tx, {
              userId: user.id,
              skillSlug: area.skillSlug,
              scorePercent: scoreForEvidence,
              passed,
              now,
              review
            });
            persistenceStatus = mastery.status === "updated" ? "updated" : "skill-missing";
            // Only an actual mastery write earns the slug.
            if (mastery.status === "updated") wroteSkills.push(area.skillSlug);
          }
        }

        perSkill.push({
          area: area.area,
          skillSlug: area.skillSlug,
          label: meta?.label ?? area.area,
          total: area.uniqueTotal,
          correct: area.uniqueCorrect,
          scorePercent: scoreForEvidence,
          uniqueTotal: evidenceTotal,
          uniqueCorrect: evidenceCorrect,
          requiredUnique: DEBATE_DRILL_REQUIRED_UNIQUE,
          evidenceScore: scoreForEvidence,
          evidenceStatus,
          persistenceStatus,
          passed
        });
      }

      const total = answered.length;
      const correctCount = answered.filter((item) => item.isCorrect).length;
      const result = {
        total,
        correctCount,
        scorePercent: total > 0 ? Math.round((correctCount / total) * 100) : 0,
        perSkill,
        wroteSkills,
        sessionId: session.id,
        completedAtIso: now.toISOString()
      };

      await tx.practiceSession.update({
        where: { id: session.id },
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
