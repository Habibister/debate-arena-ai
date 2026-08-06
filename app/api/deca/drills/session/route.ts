import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { buildDecaDrillSession, DECA_DRILL_AREAS, type DecaDrillArea } from "@/lib/deca-drills";
import {
  buildServedChoices,
  cleanupExpiredSessions,
  expiryFor,
  findActiveSession,
  lockUserRow,
  parsePracticeSessionSnapshot,
  serializeStart
} from "@/lib/practice-session";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { practiceSessionStartRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Start a DECA concept-drill session (M13E2 Phase C2). Concept drilling only — unrelated to the
// role-play judging system.
//
// Server-authoritative: it picks the questions, shuffles the choices, mints opaque option ids and
// stores the answer key server-side. An unanswered question ships its prompt and choices and nothing
// else. Requested counts are preserved through a stored padded order of repeated item ids, so nine
// distinct questions can still fill a twenty-slot session.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, practiceSessionStartRequestSchema);
    const now = new Date();

    const payload = await prisma.$transaction(async (tx) => {
      await lockUserRow(tx, user.id);
      await cleanupExpiredSessions(tx, user.id, now);

      const active = await findActiveSession(tx, user.id, "DECA_DRILL", now);
      if (active) {
        const snapshot = parsePracticeSessionSnapshot(
          active.scenarioJson,
          "DRILL",
          new Set(active.items.map((item) => item.id))
        );
        return serializeStart(active, active.items, snapshot.kind === "DRILL" ? snapshot.order : [], true);
      }

      const served = buildDecaDrillSession(input.count, input.areas as DecaDrillArea[] | undefined);
      const distinct = [...new Map(served.map((q) => [q.id, q])).values()];
      const { expiresAt, purgeAfter } = expiryFor(now);

      const session = await tx.practiceSession.create({
        data: {
          userId: user.id,
          kind: "DECA_DRILL",
          track: "DECA",
          status: "ISSUED",
          issuedAt: now,
          expiresAt,
          purgeAfter,
          requestedAreas: input.areas ?? []
        }
      });

      const items = [];
      for (const [index, question] of distinct.entries()) {
        const { stored, correctOptionId } = buildServedChoices(question.choices, question.correctAnswer);
        items.push(
          await tx.practiceSessionItem.create({
            data: {
              sessionId: session.id,
              bankQuestionId: question.id,
              displayOrder: index,
              promptSnapshot: question.question,
              choicesJson: stored,
              correctOptionId,
              explanationSnapshot: question.explanation,
              area: question.area,
              skillSlug: DECA_DRILL_AREAS.find((a) => a.id === question.area)?.skillSlug ?? ""
            }
          })
        );
      }

      const byBankId = new Map(items.map((item) => [item.bankQuestionId, item.id]));
      const order = served.map((q) => byBankId.get(q.id) as string);
      await tx.practiceSession.update({
        where: { id: session.id },
        data: { scenarioJson: { version: 1, kind: "DRILL", requestedCount: order.length, order } }
      });

      return serializeStart(session, items, order, false);
    });

    return NextResponse.json({ ...payload, areas: DECA_DRILL_AREAS });
  } catch (error) {
    return apiError(error);
  }
}
