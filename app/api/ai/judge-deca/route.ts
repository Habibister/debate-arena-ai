import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { judgeDecaRoleplay } from "@/lib/ai";
import { roleplayJudgeRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, roleplayJudgeRequestSchema);

    if (input.organization !== "DECA") {
      return NextResponse.json({ error: "DECA organization is required" }, { status: 400 });
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
