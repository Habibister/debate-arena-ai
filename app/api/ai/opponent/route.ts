import { NextResponse } from "next/server";
import { apiError, parseJson, trackNotOffered } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { generateOpponentSpeech } from "@/lib/openai-debate";
import { opponentRequestSchema } from "@/lib/validators";
import { isRetiredOrganization } from "@/lib/training-tracks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "turn" });
    const input = await parseJson(request, opponentRequestSchema);
    if (isRetiredOrganization(input.organization)) {
      return trackNotOffered();
    }
    const response = await generateOpponentSpeech(input);
    return NextResponse.json(response);
  } catch (error) {
    return apiError(error);
  }
}
