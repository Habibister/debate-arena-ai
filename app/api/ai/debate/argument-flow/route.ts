import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { analyzeArgumentFlow } from "@/lib/ai";
import { getDebateReplay } from "@/lib/debate-history";
import { enforceRateLimit } from "@/lib/rate-limit";
import { argumentFlowRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Argument-flow map for a completed debate. Loads the transcript through getDebateReplay (which
// enforces the same owner/coach/admin access control as the replay page), then reuses the AI judge
// pipeline via analyzeArgumentFlow. Authed + rate-limited (heavy tier — it's a full-transcript call).
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "heavy" });
    const input = await parseJson(request, argumentFlowRequestSchema);

    // getDebateReplay throws 403/404 if this user may not view the debate — reuse that gate.
    const debate = await getDebateReplay(user.id, user.role, input.debateId);
    const transcript = debate.messages.map((m) => ({
      role: m.role,
      round: m.round,
      content: m.content
    }));

    const flow = await analyzeArgumentFlow({
      topic: debate.topic,
      studentSide: debate.studentSide ?? undefined,
      transcript
    });

    return NextResponse.json(flow);
  } catch (error) {
    return apiError(error);
  }
}
