import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { evaluateReadiness } from "@/lib/ai";
import { enforceRateLimit } from "@/lib/rate-limit";
import { readinessRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, readinessRequestSchema);
    const readiness = await evaluateReadiness({
      ...input,
      weaknessSummary: input.weaknessSummary ?? []
    });
    return NextResponse.json(readiness);
  } catch (error) {
    return apiError(error);
  }
}
