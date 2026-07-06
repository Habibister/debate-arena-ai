import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { judgeModelUn } from "@/lib/ai";
import { enforceRateLimit } from "@/lib/rate-limit";
import { munJudgeRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Rapporteur practice feedback on the four MUN dimensions. Not an official rubric (enforced in the
// lib disclaimer). Reuses the same jsonCompletion judge pipeline. Authed + rate-limited (turn tier).
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "turn" });
    const input = await parseJson(request, munJudgeRequestSchema);
    const result = await judgeModelUn(input);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
