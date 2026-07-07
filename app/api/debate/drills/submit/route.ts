import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { gradeDrillAnswers } from "@/lib/debate-drills";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordDrillMastery } from "@/lib/spaced-review";
import { debateDrillSubmitRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Grade a drill session server-side (authoritative, from the bank) and write real MasteryProgress +
// spaced review PER SKILL: each area in the session updates its own General Debate skill. Skills not
// yet seeded (e.g. debate-weighing before its seed) are skipped honestly — never faked.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, debateDrillSubmitRequestSchema);

    const result = gradeDrillAnswers(input.answers);

    const wroteSkills: string[] = [];
    for (const skill of result.perSkill) {
      if (!skill.skillSlug) continue;
      const wrote = await recordDrillMastery({
        userId: user.id,
        skillSlug: skill.skillSlug,
        scorePercent: skill.scorePercent,
        passed: skill.passed
      });
      if (wrote) wroteSkills.push(skill.skillSlug);
    }

    return NextResponse.json({ ...result, wroteSkills });
  } catch (error) {
    return apiError(error);
  }
}
