import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { generatePracticeQuestions } from "@/lib/ai";
import { practiceQuestionRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "heavy" });
    const input = await parseJson(request, practiceQuestionRequestSchema);
    const questions = await generatePracticeQuestions(input);
    return NextResponse.json(questions);
  } catch (error) {
    return apiError(error);
  }
}
