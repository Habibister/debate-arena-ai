import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { generateOpponentResponse } from "@/lib/ai";
import { opponentRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, opponentRequestSchema);
    const response = await generateOpponentResponse(input);
    return NextResponse.json(response);
  } catch (error) {
    return apiError(error);
  }
}
