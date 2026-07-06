import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { getActiveSpec } from "@/lib/competition-specs";
import { buildMedTermSession, MEDTERM_AREAS } from "@/lib/hosa-medterm";
import { enforceRateLimit } from "@/lib/rate-limit";
import { medTermSessionRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Start a Medical Terminology practice session. Returns original questions (with answers, since this
// is immediate-feedback practice, not a secured exam). Reports whether an official registry spec
// backs the session so the client can label official vs. generic honestly.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, medTermSessionRequestSchema);

    const spec = await getActiveSpec("HOSA", "Medical Terminology");
    const questions = buildMedTermSession(input.count, input.areas);

    return NextResponse.json({
      questions,
      areas: MEDTERM_AREAS,
      mode: spec ? "official" : "generic",
      spec: spec
        ? { eventName: spec.eventName, season: spec.season, verificationStatus: spec.verificationStatus }
        : null
    });
  } catch (error) {
    return apiError(error);
  }
}
