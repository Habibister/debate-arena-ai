import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { generateOpponentSpeech } from "@/lib/openai-debate";
import { enforceRateLimit } from "@/lib/rate-limit";
import { opponentRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "turn" });
    const input = await parseJson(request, opponentRequestSchema);
    const response = await generateOpponentSpeech(input);
    return NextResponse.json(response);
  } catch (error) {
    return apiError(error);
  }
}
