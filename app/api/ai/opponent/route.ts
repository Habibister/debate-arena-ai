import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/api-auth";
import { generateOpponentSpeech } from "@/lib/openai-debate";
import { opponentRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireUser();
    const input = await parseJson(request, opponentRequestSchema);
    const response = await generateOpponentSpeech(input);
    return NextResponse.json(response);
  } catch (error) {
    return apiError(error);
  }
}
