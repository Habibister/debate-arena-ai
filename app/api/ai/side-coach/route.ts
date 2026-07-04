import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateSideCoachResponse } from "@/lib/side-coach";
import { sideCoachRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Marks a debate as assisted-practice the first time real coaching is requested for it. Scoped to the
// owning student (never another user), never stores coaching content, and never blocks the coach reply.
async function markAssisted(debateId: string, userId: string) {
  try {
    await prisma.debate.updateMany({
      where: { id: debateId, studentId: userId, assistedPractice: false },
      data: { assistedPractice: true }
    });
  } catch {
    // best-effort — assisted flagging must never break coaching
  }
}

// Separate role/path from the opponent and judge. Only ever returns private coaching text; the
// caller keeps these messages out of the official transcript. generateSideCoachResponse never
// throws (it falls back), so coaching failure cannot break the debate.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = await parseJson(request, sideCoachRequestSchema);

    // Actual coach use (this route is only called when the student invokes the coach) flags the debate.
    // Merely rendering the toggle never reaches here, so it never marks a debate assisted.
    if (input.debateId) {
      await markAssisted(input.debateId, user.id);
    }

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
