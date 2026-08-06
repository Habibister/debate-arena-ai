import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { DECA_DRILL_AREAS, DECA_DRILL_PASS_THRESHOLD, DECA_DRILL_REQUIRED_UNIQUE } from "@/lib/deca-drills";
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

// Finish a DECA concept-drill session (M13E2 Phase C2a). Concept drilling only — this does not touch
// the DECA role-play/judging system.
//
// The request carries a session id and NOTHING else. Answers were recorded server-side as they were
// given, so a client can no longer submit bank ids it was never served, cherry-pick a passing subset,
// or replay a stored payload.
//
// GRADED FROM THE SNAPSHOT: correctness comes from `PracticeSessionItem.isCorrect`, recorded at
// answer time, never from a fresh bank lookup — a question edited after issuance cannot change a
// grade already earned. Attribution is by the item's own STORED area, never by whatever area the
// session requested. Floor (5) and threshold (70) are unchanged, and no XP is written here.
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
        where: { id: input.sessionId, userId: user.id, kind: "DECA_DRILL" },
        include: { items: { orderBy: { displayOrder: "asc" } } }
      });
      if (!session) sessionNotFound();

      // Already finished: replay the stored result. Zero effects, and deliberately NOT a 409.
      if (session.status === "COMPLETED") {
        return { ...parseStoredResult(session.resultJson), alreadyCompleted: true };
      }
      if (session.expiresAt <= now) sessionExpired();

      const answered = requireEveryItemAnswered(session.items);
      const evidence = aggregateAreaEvidence(answered);

      const wroteSkills: string[] = [];
      const perSkill = [];
      for (const area of evidence) {
        const meta = DECA_DRILL_AREAS.find((a) => a.id === area.area);
        const qualifies = area.uniqueTotal >= DECA_DRILL_REQUIRED_UNIQUE;
        const passed = qualifies && area.evidenceScore >= DECA_DRILL_PASS_THRESHOLD;
        const evidenceStatus = !qualifies ? "insufficient-evidence" : passed ? "passing" : "below-threshold";

        let persistenceStatus: PersistenceStatus = "not-attempted";
        // Below the floor the persistence helpers are NOT CALLED at all — no mastery, no review, and
        // no due-review knock-down from a session too short to have earned one.
        if (qualifies && area.skillSlug) {
          const skill = await tx.skill.findUnique({ where: { slug: area.skillSlug }, select: { id: true } });
          if (!skill) {
            persistenceStatus = "skill-missing";
          } else {
            // Review FIRST, then mastery consumes its result — no independent due check.
            const review = await recordPracticeOutcomeInTransaction(tx, {
              userId: user.id,
              skillId: skill.id,
              scorePercent: area.evidenceScore,
              passed,
              now
            });
            const mastery = await recordDrillMasteryInTransaction(tx, {
              userId: user.id,
              skillSlug: area.skillSlug,
              scorePercent: area.evidenceScore,
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
          scorePercent: area.evidenceScore,
          uniqueTotal: area.uniqueTotal,
          uniqueCorrect: area.uniqueCorrect,
          requiredUnique: DECA_DRILL_REQUIRED_UNIQUE,
          evidenceScore: area.evidenceScore,
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
