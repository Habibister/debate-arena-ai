import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { validateAndCanonicalizeAuthoredRubricIds } from "@/lib/authored-rubric-feedback";
import { authoredDecaRubricIds, generateSideCoachResponse } from "@/lib/side-coach";
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
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "conversation" });
    const input = await parseJson(request, sideCoachRequestSchema);

    // M11R8: rubric ids opt a request into the structured authored contract and are interpolated
    // into a model instruction, so an id that is not exactly the authored set fails HERE — before
    // any provider call, and with a stable reason that never echoes the caller's string back.
    let rubricIds = input.rubricIds;
    if (rubricIds && rubricIds.length > 0) {
      const canonical = validateAndCanonicalizeAuthoredRubricIds(rubricIds, authoredDecaRubricIds());
      if (!canonical.ok) {
        return NextResponse.json({ error: canonical.reason }, { status: 400 });
      }
      rubricIds = canonical.ids;
    }

    // Actual coach use (this route is only called when the student invokes the coach) flags the debate.
    // Merely rendering the toggle never reaches here, so it never marks a debate assisted.
    if (input.debateId) {
      await markAssisted(input.debateId, user.id);
    }

    const response = await generateSideCoachResponse({
      ...input,
      rubricIds,
      transcript: input.transcript ?? [],
      requestType: input.requestType ?? "turn-feedback"
    });
    return NextResponse.json(response);
  } catch (error) {
    return apiError(error);
  }
}
