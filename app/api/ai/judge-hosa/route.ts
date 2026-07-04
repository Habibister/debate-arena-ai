import { NextResponse } from "next/server";
import { apiError, HttpError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { judgeHosaPerformance } from "@/lib/ai";
import { enforceRateLimit } from "@/lib/rate-limit";
import { roleplayJudgeRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "heavy" });
    const input = await parseJson(request, roleplayJudgeRequestSchema);

    if (input.organization !== "HOSA") {
      throw new HttpError("HOSA organization is required", 400);
    }

    const result = await judgeHosaPerformance({
      level: input.level,
      eventType: input.eventType,
      scenario: input.scenario,
      transcript: input.transcript
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
