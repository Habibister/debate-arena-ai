import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/api-auth";
import { generatePracticeQuestions } from "@/lib/ai";
import { practiceQuestionRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireUser();
    const input = await parseJson(request, practiceQuestionRequestSchema);
    const questions = await generatePracticeQuestions(input);
    return NextResponse.json(questions);
  } catch (error) {
    return apiError(error);
  }
}
