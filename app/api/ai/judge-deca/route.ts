import { NextResponse } from "next/server";
import { apiError, HttpError, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/api-auth";
import { judgeDecaRoleplay } from "@/lib/ai";
import { roleplayJudgeRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireUser();
    const input = await parseJson(request, roleplayJudgeRequestSchema);

    if (input.organization !== "DECA") {
      throw new HttpError("DECA organization is required", 400);
    }

    const result = await judgeDecaRoleplay({
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
