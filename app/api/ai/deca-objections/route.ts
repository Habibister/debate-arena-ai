import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { generateDecaJudgeObjections } from "@/lib/ai";
import { enforceRateLimit } from "@/lib/rate-limit";
import { decaObjectionsRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// In-character judge objection round: after the student's opening pitch, the AI (staying fully in
// its business character) raises 2-3 realistic follow-up questions before final scoring. Same
// provider pipeline as the DECA judge — this is the "judge questions" phase, not a new AI path.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "turn" });
    const input = await parseJson(request, decaObjectionsRequestSchema);
    const objections = await generateDecaJudgeObjections(input);
    return NextResponse.json(objections);
  } catch (error) {
    return apiError(error);
  }
}
