import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { generateDecaRoleplayScenario } from "@/lib/ai";
import { enforceRateLimit } from "@/lib/rate-limit";
import { decaScenarioRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Generate a DECA role-play scenario. Performance indicators are pulled from the registry's rubric
// categories when a spec covers the event; otherwise the response is labeled generic (piSource).
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, decaScenarioRequestSchema);
    const scenario = await generateDecaRoleplayScenario(input);
    return NextResponse.json(scenario);
  } catch (error) {
    return apiError(error);
  }
}
