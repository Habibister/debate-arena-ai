import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import {
  buildDecaDrillEvidence,
  decaDrillPersistenceRequest,
  gradeDecaDrillAnswers,
  DECA_DRILL_REQUIRED_UNIQUE,
  type DecaDrillEvidenceStatus
} from "@/lib/deca-drills";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordDrillMasteryDetailed, serializeReviewResult, type ReviewResultDTO } from "@/lib/spaced-review";
import { decaDrillSubmitRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Grade a DECA concept-drill session server-side and write real MasteryProgress + spaced review PER
// SKILL. This is concept drilling only — it does not touch the DECA role-play/judging system.
//
// TWO SEPARATE NUMBERS, deliberately (M13E1D):
//
//   the SESSION result   — every graded answer, counted every time it was submitted. Shown to the
//                          learner, because it is what they just did.
//   the EVIDENCE result  — at most one entry per valid question id, first answer only. The ONLY
//                          thing persistence is allowed to see, because `answers` is composed by
//                          the client and repeating one correct id used to inflate a 20% run into
//                          a 76% "pass".
//
// The response therefore carries two orthogonal statuses per skill. `evidenceStatus` says whether
// the work qualifies; `persistenceStatus` says what the database actually did about it. Collapsing
// them loses the difference between "we did not try", "there is no row yet", and "the write broke"
// — and the learner-facing copy for those three is not interchangeable.
//
// M13E1G adds `preserved-concurrent` (another submission won the due review window, so this one
// deliberately wrote nothing) and replaces the unprovable `reviewScheduled` boolean with the exact
// serialized review outcome. A no-op is neither a save nor a failure and must not be shown as either.
type PersistenceStatus = "not-attempted" | "updated" | "preserved-concurrent" | "skill-missing" | "write-failed";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, decaDrillSubmitRequestSchema);

    // ONE server timestamp governs this whole submission: due determination, the CAS predicate, the
    // next-review date and the mastery decision derived from it.
    const now = new Date();
    const result = gradeDecaDrillAnswers(input.answers);
    const evidenceByArea = new Map(buildDecaDrillEvidence(input.answers).map((e) => [e.area, e]));

    const wroteSkills: string[] = [];
    const perSkill = [];

    for (const skill of result.perSkill) {
      const evidence = evidenceByArea.get(skill.area);
      // Both sets are derived from the same bank-filtered answers, so this is always present; the
      // fallback exists so a future divergence fails CLOSED (no evidence => no write) rather than open.
      const uniqueTotal = evidence?.uniqueTotal ?? 0;
      const uniqueCorrect = evidence?.uniqueCorrect ?? 0;
      const evidenceScore = evidence?.evidenceScore ?? 0;
      const evidenceStatus: DecaDrillEvidenceStatus = evidence?.evidenceStatus ?? "insufficient-evidence";
      const passed = evidence?.passed ?? false;

      // `null` means the persistence helper is NOT CALLED — no mastery, no review, and critically
      // no due-review knock-down from a submission too short to have earned one.
      const plan = evidence ? decaDrillPersistenceRequest(evidence) : null;

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
        persistenceStatus = outcome.status;
        review = outcome.review ? serializeReviewResult(outcome.review) : null;
        // Only an actual mastery write earns the slug — never a concurrency no-op.
        if (outcome.status === "updated") wroteSkills.push(skill.skillSlug);
      }

      perSkill.push({
        ...skill,
        uniqueTotal,
        uniqueCorrect,
        requiredUnique: DECA_DRILL_REQUIRED_UNIQUE,
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
