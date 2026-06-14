import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { recommendLessons } from "@/lib/ai";
import { recommendationRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, recommendationRequestSchema);
    const recommendations = await recommendLessons(input);
    return NextResponse.json(recommendations);
  } catch (error) {
    return apiError(error);
  }
}
