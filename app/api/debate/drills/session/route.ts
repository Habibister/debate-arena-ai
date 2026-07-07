import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { buildDrillSession, DRILL_AREAS } from "@/lib/debate-drills";
import { enforceRateLimit } from "@/lib/rate-limit";
import { debateDrillSessionRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Start a General Debate concept-drill session. Returns original questions (with answers, since this
// is immediate-feedback practice). Authed + rate-limited (light tier).
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, debateDrillSessionRequestSchema);
    const questions = buildDrillSession(input.count, input.areas);
    return NextResponse.json({ questions, areas: DRILL_AREAS });
  } catch (error) {
    return apiError(error);
  }
}
