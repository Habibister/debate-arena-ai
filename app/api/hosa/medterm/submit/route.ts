import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { getWeightedScoringRubric } from "@/lib/competition-specs";
import {
  buildMedTermEvidence,
  gradeMedTermAnswers,
  medTermPersistenceRequest,
  HOSA_MEDTERM_REQUIRED_AREAS,
  HOSA_MEDTERM_REQUIRED_UNIQUE,
  MEDTERM_SKILL_SLUG
} from "@/lib/hosa-medterm";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordPracticeOutcome } from "@/lib/spaced-review";
import { medTermSubmitRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Grade a Medical Terminology session server-side (authoritative, from the bank) and wire the outcome
// into spaced reassessment on the existing Medical Terminology skill.
//
// TWO SEPARATE NUMBERS, deliberately (M13E1F):
//
//   the SESSION result  — every graded answer, counted every time it was submitted. Shown to the
//                         learner, because it is what they just did.
//   the EVIDENCE result — at most one entry per valid question id, first answer only, and it must
//                         span at least three bank areas. The ONLY thing review eligibility sees.
//
// REVIEW-ONLY, on purpose. No MasteryProgress and no XP are written here. The slug names an entire
// HOSA event; a 4-option recognition drill over a 54-item bank cannot establish mastery of it, and a
// 50-question session consumes nearly the whole bank, so "survived spaced reassessment" could only
// mean "re-recognised items already seen".
//
// There is deliberately NO `reviewScheduled` field. `recordPracticeOutcome` swallows its own
// failures, so this route cannot prove a SkillReviewSchedule row exists and will not imply one. It
// reports only that a review write was ATTEMPTED.
type PersistenceStatus = "not-attempted" | "review-attempted";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, medTermSubmitRequestSchema);

    const result = gradeMedTermAnswers(input.answers);
    const evidence = buildMedTermEvidence(input.answers);

    // `null` means spaced review is NOT CALLED — no ladder advance, no reset, and no change to a due
    // review from a submission too short or too narrow to have earned one.
    const plan = medTermPersistenceRequest(evidence);

    let persistenceStatus: PersistenceStatus = "not-attempted";
    if (plan) {
      try {
        const skill = await prisma.skill.findUnique({ where: { slug: MEDTERM_SKILL_SLUG }, select: { id: true } });
        if (skill) {
          await recordPracticeOutcome({ userId: user.id, skillId: skill.id, passed: plan.passed });
          persistenceStatus = "review-attempted";
        }
      } catch {
        // review wiring is best-effort — never block returning the graded result
      }
    }

    // Normalize the EVIDENCE score against the registry's sourced point structure (MT: a single
    // 50-point "Test score" category). Derived from the evidence score, never the duplicate-weighted
    // session score, and withheld entirely when the evidence does not qualify — an official-scale
    // number built on one repeated question is exactly the fabrication this milestone removes.
    const weighted = plan ? await getWeightedScoringRubric("HOSA", "HEALTH_SCIENCE_EVENT") : null;
    const registryScore =
      weighted && weighted.totalPoints > 0
        ? {
            pointsPossible: weighted.totalPoints,
            pointsEarned: Math.round((evidence.evidenceScore / 100) * weighted.totalPoints),
            source: `${weighted.eventName} ${weighted.season} (${weighted.verificationStatus})`
          }
        : null;

    return NextResponse.json({
      ...result,
      uniqueTotal: evidence.uniqueTotal,
      uniqueCorrect: evidence.uniqueCorrect,
      coveredAreas: evidence.coveredAreas,
      coveredAreaCount: evidence.coveredAreaCount,
      requiredUnique: HOSA_MEDTERM_REQUIRED_UNIQUE,
      requiredAreas: HOSA_MEDTERM_REQUIRED_AREAS,
      evidenceScore: evidence.evidenceScore,
      evidenceStatus: evidence.evidenceStatus,
      persistenceStatus,
      // Weak areas come from the EVIDENCE set, so only areas actually covered can appear.
      weakAreas: evidence.weakAreas,
      // Overrides the raw grader's duplicate-weighted `passed`. Last key on purpose.
      passed: evidence.passed,
      registryScore
    });
  } catch (error) {
    return apiError(error);
  }
}
