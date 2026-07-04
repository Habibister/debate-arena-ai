import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { generateJudgeDecision } from "@/lib/openai-debate";
import { judgeRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, judgeRequestSchema);
    const result = await generateJudgeDecision(input);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
