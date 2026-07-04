import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/api-auth";
import { generateLessonContent } from "@/lib/ai";
import { lessonContentRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireUser();
    const input = await parseJson(request, lessonContentRequestSchema);
    const lesson = await generateLessonContent(input);
    return NextResponse.json(lesson);
  } catch (error) {
    return apiError(error);
  }
}
