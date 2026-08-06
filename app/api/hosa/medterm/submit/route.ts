import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { getWeightedScoringRubric } from "@/lib/competition-specs";
import {
  HOSA_MEDTERM_REQUIRED_AREAS,
  HOSA_MEDTERM_REQUIRED_UNIQUE,
  MEDTERM_AREAS,
  MEDTERM_SKILL_SLUG
} from "@/lib/hosa-medterm";
import {
  completedPurgeAfter,
  lockUserRow,
  parseStoredResult,
  requireEveryItemAnswered,
  sessionExpired,
  sessionNotFound
} from "@/lib/practice-session";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordPracticeOutcomeInTransaction } from "@/lib/spaced-review";
import { practiceSessionSubmitRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Finish a Medical Terminology session (M13E2 Phase C2a).
//
// REVIEW-ONLY, unchanged from M13E1F. No MasteryProgress, no XP, no PracticeAttempt is written here.
// The slug names an entire HOSA event; a 4-option recognition drill over a 54-item bank cannot
// establish mastery of it.
//
// The request carries a session id and NOTHING else, and grading reads the stored snapshot rather
// than the live bank, so a question edited after issuance cannot change a grade already earned.
//
// Item rows are one per DISTINCT question, so the unique-question evidence rule from M13E1F is
// structural here: a padded 50-slot session contributes exactly its distinct questions, and both
// floors — 10 unique across 3 areas — are applied to that set.
//
// EXACT-RATIO THRESHOLD, deliberately: `uniqueCorrect * 100 >= 70 * uniqueTotal`, never a rounded
// percent. 16 of 23 rounds to 70 but is 69.57%, and rounding it up would manufacture a pass.
//
// NOTE: `PASS_THRESHOLD` is module-private in lib/hosa-medterm.ts, which this phase may not modify,
// so the value is restated here. practice-session:smoke pins the two to each other so they cannot
// drift apart silently.
const MEDTERM_PASS_THRESHOLD = 70;

type PersistenceStatus = "not-attempted" | "review-attempted";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, practiceSessionSubmitRequestSchema);

    const now = new Date();

    const payload = await prisma.$transaction(async (tx) => {
      // FIRST statement: the loser of two concurrent submits waits here, then sees COMPLETED.
      await lockUserRow(tx, user.id);

      const session = await tx.practiceSession.findFirst({
        where: { id: input.sessionId, userId: user.id, kind: "HOSA_MEDTERM" },
        include: { items: { orderBy: { displayOrder: "asc" } } }
      });
      if (!session) sessionNotFound();

      if (session.status === "COMPLETED") {
        return { ...parseStoredResult(session.resultJson), alreadyCompleted: true };
      }
      if (session.expiresAt <= now) sessionExpired();

      const answered = requireEveryItemAnswered(session.items);

      const uniqueTotal = answered.length;
      const uniqueCorrect = answered.filter((item) => item.isCorrect).length;
      const coveredAreas = MEDTERM_AREAS.map((a) => a.id).filter((id) =>
        answered.some((item) => item.area === id)
      );
      const coveredAreaCount = coveredAreas.length;

      const evidenceScore = uniqueTotal > 0 ? Math.round((uniqueCorrect / uniqueTotal) * 100) : 0;
      const hasEnoughEvidence =
        uniqueTotal >= HOSA_MEDTERM_REQUIRED_UNIQUE && coveredAreaCount >= HOSA_MEDTERM_REQUIRED_AREAS;
      const meetsThreshold = uniqueTotal > 0 && uniqueCorrect * 100 >= MEDTERM_PASS_THRESHOLD * uniqueTotal;
      const passed = hasEnoughEvidence && meetsThreshold;
      const evidenceStatus = !hasEnoughEvidence
        ? "insufficient-evidence"
        : meetsThreshold
          ? "passing"
          : "below-threshold";

      // Weak areas come from the EVIDENCE set, so only areas actually covered can appear.
      const weakAreas = coveredAreas
        .map((area) => {
          const inArea = answered.filter((item) => item.area === area);
          const meta = MEDTERM_AREAS.find((a) => a.id === area);
          return {
            area,
            label: meta?.label ?? area,
            missed: inArea.filter((item) => !item.isCorrect).length,
            total: inArea.length
          };
        })
        .filter((entry) => entry.missed > 0);

      // Below the floors `recordPracticeOutcomeInTransaction` is NOT CALLED — no ladder advance, no
      // reset, and no change to a due review from a session too short or too narrow to have earned one.
      let persistenceStatus: PersistenceStatus = "not-attempted";
      if (hasEnoughEvidence) {
        const skill = await tx.skill.findUnique({ where: { slug: MEDTERM_SKILL_SLUG }, select: { id: true } });
        if (skill) {
          await recordPracticeOutcomeInTransaction(tx, {
            userId: user.id,
            skillId: skill.id,
            scorePercent: evidenceScore,
            passed,
            now
          });
          persistenceStatus = "review-attempted";
        }
      }

      // Normalize the EVIDENCE score against the registry's sourced point structure, and withhold it
      // entirely when the evidence does not qualify — an official-scale number built on too little
      // evidence is exactly the fabrication M13E1F removed.
      const weighted = hasEnoughEvidence ? await getWeightedScoringRubric("HOSA", "HEALTH_SCIENCE_EVENT") : null;
      const registryScore =
        weighted && weighted.totalPoints > 0
          ? {
              pointsPossible: weighted.totalPoints,
              pointsEarned: Math.round((evidenceScore / 100) * weighted.totalPoints),
              source: `${weighted.eventName} ${weighted.season} (${weighted.verificationStatus})`
            }
          : null;

      const result = {
        total: uniqueTotal,
        correctCount: uniqueCorrect,
        scorePercent: evidenceScore,
        uniqueTotal,
        uniqueCorrect,
        coveredAreas,
        coveredAreaCount,
        requiredUnique: HOSA_MEDTERM_REQUIRED_UNIQUE,
        requiredAreas: HOSA_MEDTERM_REQUIRED_AREAS,
        evidenceScore,
        evidenceStatus,
        persistenceStatus,
        weakAreas,
        passed,
        registryScore,
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
