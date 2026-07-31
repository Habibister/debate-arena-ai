import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// WITHDRAWN (M11R6). This route scored AI-generated HOSA patient interactions, returning an
// overallScore plus presentation/questioning sub-scores against no sourced rubric. Scoring a
// clinical interaction we cannot ground in an official rating sheet is not something CompeteReady
// should do at all, so the mode was withdrawn and this route now fails closed.
//
// Security gates stay in front of the refusal, in this order and unchanged: authenticate, then
// rate-limit. Nothing after them runs — no transcript is parsed, no provider is called, no score of
// any kind is produced, and nothing is written.
const UNAVAILABLE = { unavailable: true, error: "Generic HOSA role-play practice is unavailable." };

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "heavy" });
    return NextResponse.json(UNAVAILABLE, { status: 410 });
  } catch (error) {
    return apiError(error);
  }
}
