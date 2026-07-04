import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { generateJudgeDecision } from "@/lib/openai-debate";
import { enforceRateLimit } from "@/lib/rate-limit";
import { judgeRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "heavy" });
    const input = await parseJson(request, judgeRequestSchema);
    const result = await generateJudgeDecision(input);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
