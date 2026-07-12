import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { buildDecaDrillSession, DECA_DRILL_AREAS } from "@/lib/deca-drills";
import { enforceRateLimit } from "@/lib/rate-limit";
import { decaDrillSessionRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Start a DECA concept-drill session. Original multiple-choice questions with immediate feedback.
// Authed + rate-limited (light tier). Unrelated to the role-play judging system.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, decaDrillSessionRequestSchema);
    const questions = buildDecaDrillSession(input.count, input.areas);
    return NextResponse.json({ questions, areas: DECA_DRILL_AREAS });
  } catch (error) {
    return apiError(error);
  }
}
