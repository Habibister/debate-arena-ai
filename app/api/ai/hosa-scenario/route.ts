import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { generateHosaScenario } from "@/lib/ai";
import { enforceRateLimit } from "@/lib/rate-limit";
import { hosaScenarioRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Generate a HOSA health-science practice role-play scenario. HOSA has no verified spec for these
// interactive events (only Medical Terminology, a written exam), so the scenario is ALWAYS generic
// practice and labeled as such — never presented as official.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, hosaScenarioRequestSchema);
    const scenario = await generateHosaScenario(input);
    return NextResponse.json(scenario);
  } catch (error) {
    return apiError(error);
  }
}
