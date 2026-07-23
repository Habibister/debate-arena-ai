import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { generateRoleplayTurn } from "@/lib/ai";
import { enforceRateLimit } from "@/lib/rate-limit";
import { roleplayTurnRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// One reactive in-character turn in a multi-turn role-play (DECA judge/client interrogation, or HOSA
// patient conversation). Higher-frequency than a graded generation, so it uses the conversation tier.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "conversation" });
    const input = await parseJson(request, roleplayTurnRequestSchema);
    const turn = await generateRoleplayTurn({
      organization: input.organization,
      level: input.level,
      scenario: input.scenario,
      characterRole: input.characterRole,
      transcript: input.transcript,
      exchangesSoFar: input.exchangesSoFar,
      maxExchanges: input.maxExchanges
    });
    return NextResponse.json(turn);
  } catch (error) {
    return apiError(error);
  }
}
