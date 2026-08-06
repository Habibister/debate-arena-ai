import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/api-auth";
import { recordFirstAnswer, sessionExpired, sessionNotFound } from "@/lib/practice-session";
import { prisma } from "@/lib/prisma";
import { practiceCheckRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Record ONE answer to a served Medical Terminology question and return its feedback (M13E2 C2).
//
// This is what preserves immediate per-question feedback now that the session response no longer
// carries the answer key: the learner picks, the server records the pick, and only then does it say
// whether it was right. The first answer is final — a later different pick returns the stored one
// rather than replacing it, so a learner cannot try options until one is correct.
//
// Review-only track: nothing here writes mastery or XP, and neither does the submit route.
//
// DELIBERATELY NOT RATE-LIMITED. The existing `light` tier is 20 requests/minute, and a 50-question
// official-mode session legitimately needs one call per question plus a start and a submit — limiting
// it would break ordinary practice. The endpoint is safe without one: it requires authentication, is
// scoped to a session the caller owns, and each item accepts exactly one write, so the write surface
// is bounded by that session's own item count. Rate-limit redesign is deferred, as approved.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = await parseJson(request, practiceCheckRequestSchema);
    const now = new Date();

    const feedback = await prisma.$transaction(async (tx) => {
      // Scoped to the caller AND the expected kind. An unknown session, another learner's session and
      // a session of the wrong kind are one indistinguishable 404 — anything else confirms existence.
      const session = await tx.practiceSession.findFirst({
        where: { id: input.sessionId, userId: user.id, kind: "HOSA_MEDTERM" },
        select: { id: true, status: true, expiresAt: true }
      });
      if (!session || session.status !== "ISSUED") sessionNotFound();
      if (session.expiresAt <= now) sessionExpired();

      return recordFirstAnswer(tx, {
        sessionId: session.id,
        itemId: input.itemId,
        optionId: input.optionId,
        now
      });
    });

    return NextResponse.json(feedback);
  } catch (error) {
    return apiError(error);
  }
}
