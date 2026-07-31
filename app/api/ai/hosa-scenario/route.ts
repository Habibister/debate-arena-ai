import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// WITHDRAWN (M11R6). This route generated AI health-science role-play scenarios — patient
// interactions built from a free-text role pairing, for HOSA events CompeteReady has no sourced
// rubric for. Inventing a clinical scenario and presenting it as HOSA practice is exactly the kind
// of unsourced content this product must not ship, so the mode was withdrawn and this route now
// fails closed.
//
// The security gates stay in front of the refusal, in this order and unchanged: authenticate, then
// rate-limit. Nothing after them runs — the request body is never parsed, no provider is called, no
// scenario is produced, and nothing is written.
const UNAVAILABLE = { unavailable: true, error: "Generic HOSA role-play practice is unavailable." };

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    return NextResponse.json(UNAVAILABLE, { status: 410 });
  } catch (error) {
    return apiError(error);
  }
}
