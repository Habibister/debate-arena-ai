import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { gradeDecaDrillAnswers } from "@/lib/deca-drills";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordDrillMastery } from "@/lib/spaced-review";
import { decaDrillSubmitRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Grade a DECA concept-drill session server-side and write real MasteryProgress + spaced review PER
// SKILL via the shared recordDrillMastery helper. Skills not yet seeded are skipped honestly (never
// faked). This is concept drilling only — it does not touch the DECA role-play/judging system.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, decaDrillSubmitRequestSchema);

    const result = gradeDecaDrillAnswers(input.answers);

    const wroteSkills: string[] = [];
    for (const skill of result.perSkill) {
      if (!skill.skillSlug) continue;
      const wrote = await recordDrillMastery({ userId: user.id, skillSlug: skill.skillSlug, scorePercent: skill.scorePercent, passed: skill.passed });
      if (wrote) wroteSkills.push(skill.skillSlug);
    }

    return NextResponse.json({ ...result, wroteSkills });
  } catch (error) {
    return apiError(error);
  }
}
