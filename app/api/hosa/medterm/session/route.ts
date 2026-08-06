import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { getActiveSpec } from "@/lib/competition-specs";
import { buildMedTermSession, MEDTERM_AREAS, MEDTERM_SKILL_SLUG, type MedTermArea } from "@/lib/hosa-medterm";
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
import { medTermSessionStartRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Start a Medical Terminology practice session (M13E2 Phase C2).
//
// Server-authoritative from here: the answer key is stored, not served. The route still reports
// whether an official registry spec backs the session so the client can label official vs. generic
// honestly — that labelling is unchanged. REVIEW-ONLY remains the rule for this track: no mastery
// and no XP are written at any point in the flow.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, medTermSessionStartRequestSchema);
    const now = new Date();

    const spec = await getActiveSpec("HOSA", "Medical Terminology");

    const payload = await prisma.$transaction(async (tx) => {
      await lockUserRow(tx, user.id);
      await cleanupExpiredSessions(tx, user.id, now);

      const active = await findActiveSession(tx, user.id, "HOSA_MEDTERM", now);
      if (active) {
        const snapshot = parsePracticeSessionSnapshot(
          active.scenarioJson,
          "DRILL",
          new Set(active.items.map((item) => item.id))
        );
        return serializeStart(active, active.items, snapshot.kind === "DRILL" ? snapshot.order : [], true);
      }

      const served = buildMedTermSession(input.count, input.areas as MedTermArea[] | undefined);
      const distinct = [...new Map(served.map((q) => [q.id, q])).values()];
      const { expiresAt, purgeAfter } = expiryFor(now);

      const session = await tx.practiceSession.create({
        data: {
          userId: user.id,
          kind: "HOSA_MEDTERM",
          track: "HOSA",
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
              // One aggregate skill for the whole event; AREA is what evidence breadth counts.
              skillSlug: MEDTERM_SKILL_SLUG
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

    return NextResponse.json({
      ...payload,
      areas: MEDTERM_AREAS,
      mode: spec ? "official" : "generic",
      spec: spec
        ? { eventName: spec.eventName, season: spec.season, verificationStatus: spec.verificationStatus }
        : null
    });
  } catch (error) {
    return apiError(error);
  }
}
