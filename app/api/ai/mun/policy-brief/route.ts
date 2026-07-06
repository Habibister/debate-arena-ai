import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { generateCountryPolicyBrief } from "@/lib/ai";
import { enforceRateLimit } from "@/lib/rate-limit";
import { munPolicyBriefRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// AI-inferred country policy brief for Model UN PRACTICE. No sourced voting-record data exists, so
// the result is always labeled inference (enforced in the lib). Authed + rate-limited (light tier).
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, munPolicyBriefRequestSchema);
    const brief = await generateCountryPolicyBrief(input);
    return NextResponse.json(brief);
  } catch (error) {
    return apiError(error);
  }
}
