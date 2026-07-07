import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { getWeightedScoringRubric } from "@/lib/competition-specs";
import { gradeMedTermAnswers, MEDTERM_SKILL_SLUG } from "@/lib/hosa-medterm";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordPracticeOutcome } from "@/lib/spaced-review";
import { medTermSubmitRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Grade a Medical Terminology session server-side (authoritative, from the bank) and wire the
// outcome into spaced reassessment on the existing Medical Terminology skill — exactly like skill
// practice: a passing session pushes the next review out, a miss brings the skill back tomorrow.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, medTermSubmitRequestSchema);

    const result = gradeMedTermAnswers(input.answers);

    // Normalize the score against the registry's sourced point structure (MT: a single 50-point
    // "Test score" category). The engine already scores 1 point per correct item, so this is a
    // consistency check that the practice score maps onto the official point scale — not a re-score.
    const weighted = await getWeightedScoringRubric("HOSA", "HEALTH_SCIENCE_EVENT");
    const registryScore =
      weighted && weighted.totalPoints > 0
        ? {
            pointsPossible: weighted.totalPoints,
            pointsEarned: Math.round((result.scorePercent / 100) * weighted.totalPoints),
            source: `${weighted.eventName} ${weighted.season} (${weighted.verificationStatus})`
          }
        : null;

    // Schedule spaced review on the Medical Terminology skill (if seeded). Missing questions ->
    // failed session -> review resurfaces tomorrow; a clean run advances the interval ladder.
    let reviewScheduled = false;
    try {
      const skill = await prisma.skill.findUnique({ where: { slug: MEDTERM_SKILL_SLUG }, select: { id: true } });
      if (skill) {
        await recordPracticeOutcome({ userId: user.id, skillId: skill.id, passed: result.passed });
        reviewScheduled = true;
      }
    } catch {
      // review wiring is best-effort — never block returning the graded result
    }

    return NextResponse.json({ ...result, reviewScheduled, registryScore });
  } catch (error) {
    return apiError(error);
  }
}
