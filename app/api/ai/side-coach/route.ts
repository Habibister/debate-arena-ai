import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { generateSideCoachResponse } from "@/lib/side-coach";
import { sideCoachRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Separate role/path from the opponent and judge. Only ever returns private coaching text; the
// caller keeps these messages out of the official transcript. generateSideCoachResponse never
// throws (it falls back), so coaching failure cannot break the debate.
export async function POST(request: Request) {
  try {
    const input = await parseJson(request, sideCoachRequestSchema);
    const response = await generateSideCoachResponse({
      ...input,
      transcript: input.transcript ?? [],
      requestType: input.requestType ?? "turn-feedback"
    });
    return NextResponse.json(response);
  } catch (error) {
    return apiError(error);
  }
}
