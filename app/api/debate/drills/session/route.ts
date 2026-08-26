import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { buildDrillSession, siblingExclusionsFor, DRILL_AREAS, type DrillArea } from "@/lib/debate-drills";
import {
  buildServedChoices,
  cleanupExpiredSessions,
  expiryFor,
  findActiveSession,
  lockUserRow,
  parsePracticeSessionSnapshot,
  serializeStart, retainedExposureWhere } from "@/lib/practice-session";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { practiceSessionStartRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Start a General Debate concept-drill session (M13E2 Phase C2).
//
// The server now chooses the questions, shuffles each question's choices, mints an opaque id per
// served choice, and STORES all of it. The response no longer carries `correctAnswer` or
// `explanation` for a question the learner has not answered — the check route reveals those once,
// after the first answer has been recorded.
//
// PADDED ORDER. A focused pool holds nine questions but the learner may ask for twenty. The nine
// DISTINCT questions become item rows; the twenty-slot order is stored separately in the snapshot as
// repeated item ids. The learner still sees twenty slots, `@@unique([sessionId, bankQuestionId])`
// stays satisfied, and a repeated slot resolves to the same first-answer-final item.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, practiceSessionStartRequestSchema);
    const now = new Date();

    const payload = await prisma.$transaction(async (tx) => {
      // FIRST statement. Serializes this learner, so two concurrent starts cannot both create.
      await lockUserRow(tx, user.id);
      await cleanupExpiredSessions(tx, user.id, now);

      const active = await findActiveSession(tx, user.id, "DEBATE_DRILL", now);
      if (active) {
        const snapshot = parsePracticeSessionSnapshot(
          active.scenarioJson,
          "DRILL",
          new Set(active.items.map((item) => item.id))
        );
        return serializeStart(active, active.items, snapshot.kind === "DRILL" ? snapshot.order : [], true);
      }

      // RETAINED-EXPOSURE SIBLING EXCLUSION (owner ruling, 2026-08-25). Read-only lookup of the bank
      // ids this learner has already been ISSUED, over retained PracticeSessionItem rows. Deliberately
      // NOT filtered on answeredAt/selectedOptionId: contamination happens on EXPOSURE — a learner who
      // merely saw a measurement-dependent sibling's choices has already received its answer logic.
      // No schema change: userId+kind and sessionId are existing indexed columns.
      const exposedRows = await tx.practiceSessionItem.findMany({
        where: retainedExposureWhere(user.id, "DEBATE_DRILL"),
        select: { bankQuestionId: true }
      });
      const excludedIds = siblingExclusionsFor(exposedRows.map((row) => row.bankQuestionId));

      const served = buildDrillSession(input.count, input.areas as DrillArea[] | undefined, excludedIds);
      // Distinct questions become rows, in first-seen order; the repeats live only in the order.
      const distinct = [...new Map(served.map((q) => [q.id, q])).values()];
      const { expiresAt, purgeAfter } = expiryFor(now);

      const session = await tx.practiceSession.create({
        data: {
          userId: user.id,
          kind: "DEBATE_DRILL",
          track: "DEBATE",
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
              skillSlug: DRILL_AREAS.find((a) => a.id === question.area)?.skillSlug ?? ""
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

    // `areas` is setup-screen metadata only; it carries no grading information.
    return NextResponse.json({ ...payload, areas: DRILL_AREAS });
  } catch (error) {
    return apiError(error);
  }
}
