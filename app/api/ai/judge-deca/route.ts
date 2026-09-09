import { NextResponse } from "next/server";
import { apiError, HttpError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { decaJudgeRubricAvailable, judgeDecaRoleplay } from "@/lib/ai";
import { roleplayJudgeRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "heavy" });
    const input = await parseJson(request, roleplayJudgeRequestSchema);

    if (input.organization !== "DECA") {
      throw new HttpError("DECA organization is required", 400);
    }

    // P0-6 (2026-09-09): refuse BEFORE the provider call when no rubric covers this event. A judged
    // round must rest on a real rubric contract; the generic practice path previously scored a
    // 0-100 ballot against an empty rubric. Truthful, retryable, and it spends no provider budget.
    if (!decaJudgeRubricAvailable(input.eventType)) {
      throw new HttpError("No scoring rubric is available for this DECA event, so this round cannot be judged.", 503);
    }

    const result = await judgeDecaRoleplay({
      level: input.level,
      eventType: input.eventType,
      scenario: input.scenario,
      transcript: input.transcript,
      hasObjectionRound: input.hasObjectionRound
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
