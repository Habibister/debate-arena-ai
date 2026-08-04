import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import {
  buildDrillEvidence,
  debateDrillPersistenceRequest,
  gradeDrillAnswers,
  DEBATE_DRILL_REQUIRED_UNIQUE,
  type DrillEvidenceStatus
} from "@/lib/debate-drills";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordDrillMasteryDetailed, serializeReviewResult, type ReviewResultDTO } from "@/lib/spaced-review";
import { debateDrillSubmitRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Grade a General Debate concept-drill session server-side (authoritative, from the bank) and write
// real MasteryProgress + spaced review PER SKILL: each area in the session updates its own skill.
//
// TWO SEPARATE NUMBERS, deliberately (M13E1E):
//
//   the SESSION result   — every graded answer, counted every time it was submitted. Shown to the
//                          learner, because it is what they just did.
//   the EVIDENCE result  — at most one entry per valid question id, first answer only. The ONLY
//                          thing persistence is allowed to see.
//
// All four Debate skills are seeded, so before this change every one of these landed for real: one
// correct answer wrote 100/MASTERED; repeating a correct id turned a 20% run into a 76% "pass"; and
// the UI's own padding turned a genuine 6-of-9 into 85%/MASTERED with no bad intent at all.
//
// `persistenceStatus` is reported separately from `evidenceStatus` because "we did not try" and "the
// write did not land" are different things to tell a learner.
//
// M13E1G: this route used the BOOLEAN helper, so every `false` became `not-saved` and the learner was
// told "progress could not be saved". Under winner-only mastery a concurrency no-op also returns
// false — nothing failed, another submission simply won the due review window — so the boolean form
// can no longer express the truth here. The detailed outcome is consumed instead, and the exact
// review mutation is serialized rather than asserted. `not-saved` keeps its existing spelling and
// meaning: a mastery persistence exception, nothing else.
type PersistenceStatus = "not-attempted" | "updated" | "preserved-concurrent" | "skill-missing" | "not-saved";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, debateDrillSubmitRequestSchema);

    // ONE server timestamp governs this whole submission.
    const now = new Date();
    const result = gradeDrillAnswers(input.answers);
    const evidenceByArea = new Map(buildDrillEvidence(input.answers).map((e) => [e.area, e]));

    const wroteSkills: string[] = [];
    const perSkill = [];

    for (const skill of result.perSkill) {
      const evidence = evidenceByArea.get(skill.area);
      // Both sets derive from the same bank-filtered answers, so this is always present; the fallback
      // exists so a future divergence fails CLOSED (no evidence => no write) rather than open.
      const uniqueTotal = evidence?.uniqueTotal ?? 0;
      const uniqueCorrect = evidence?.uniqueCorrect ?? 0;
      const evidenceScore = evidence?.evidenceScore ?? 0;
      const evidenceStatus: DrillEvidenceStatus = evidence?.evidenceStatus ?? "insufficient-evidence";
      const passed = evidence?.passed ?? false;

      // `null` means the persistence helper is NOT CALLED — no mastery, no review, and critically no
      // due-review knock-down from a submission too short to have earned one.
      const plan = evidence ? debateDrillPersistenceRequest(evidence) : null;

      let persistenceStatus: PersistenceStatus = "not-attempted";
      let review: ReviewResultDTO | null = null;
      if (plan && skill.skillSlug) {
        const outcome = await recordDrillMasteryDetailed({
          userId: user.id,
          skillSlug: skill.skillSlug,
          scorePercent: plan.scorePercent,
          passed: plan.passed,
          now
        });
        // `write-failed` keeps this route's existing public spelling, `not-saved`.
        persistenceStatus = outcome.status === "write-failed" ? "not-saved" : outcome.status;
        review = outcome.review ? serializeReviewResult(outcome.review) : null;
        // Only an actual mastery write earns the slug — never a concurrency no-op.
        if (outcome.status === "updated") wroteSkills.push(skill.skillSlug);
      }

      perSkill.push({
        ...skill,
        uniqueTotal,
        uniqueCorrect,
        requiredUnique: DEBATE_DRILL_REQUIRED_UNIQUE,
        evidenceScore,
        evidenceStatus,
        persistenceStatus,
        review,
        // Overrides the raw grader's duplicate-weighted `passed`. This is the last key on purpose.
        passed
      });
    }

    return NextResponse.json({ ...result, perSkill, wroteSkills });
  } catch (error) {
    return apiError(error);
  }
}
