import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, parseJson, unauthorized } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { getDebateSkillScenario } from "@/lib/debate-skill-practice";
import {
  cleanupExpiredSessions,
  expiryFor,
  findActiveSession,
  lockUserRow,
  parsePracticeSessionSnapshot
} from "@/lib/practice-session";
import { prisma } from "@/lib/prisma";
import { writingSessionStartRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Issue a Debate-writing practice session (M13E2 Phase C2b).
//
// THE SERVER CHOOSES THE SCENARIO. Until now the client sent a `scenarioIndex` and the route graded
// whatever that produced, so a learner could pick their prompt and re-submit the same one for XP
// indefinitely. The scenario is now selected here, frozen into the session snapshot, and the submit
// route grades only what this route issued.
//
// Rate limiting is deliberately unchanged: this route family has never been rate-limited, and
// rate-limit redesign is explicitly deferred. Adding one here would also break three existing suites
// that assert its absence on the writing surface.
//
// Issuance writes NOTHING: no XP, no mastery, no review, no PracticeAttempt, no QuestionAttempt.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();
    const userId = session.user.id;

    const input = await parseJson(request, writingSessionStartRequestSchema);
    const now = new Date();

    const payload = await prisma.$transaction(async (tx) => {
      // FIRST statement. Serializes this learner so two concurrent starts cannot both issue.
      await lockUserRow(tx, userId);
      await cleanupExpiredSessions(tx, userId, now);

      const active = await findActiveSession(tx, userId, "DEBATE_WRITING", now);
      if (active) {
        const snapshot = parsePracticeSessionSnapshot(active.scenarioJson, "WRITING");
        return {
          sessionId: active.id,
          issuedAtIso: active.issuedAt.toISOString(),
          expiresAtIso: active.expiresAt.toISOString(),
          scenario: snapshot.kind === "WRITING" ? snapshot.scenario : null,
          resumed: true
        };
      }

      // Server-selected. The index never reaches this route from the client; it is chosen here and
      // frozen, so the scenario a learner is graded against is the one they were actually issued.
      const scenarioIndex = Math.floor(Math.random() * 10);
      const scenario = getDebateSkillScenario(input.slug, input.level, scenarioIndex);
      const { expiresAt, purgeAfter } = expiryFor(now);

      const created = await tx.practiceSession.create({
        data: {
          userId,
          kind: "DEBATE_WRITING",
          track: "DEBATE",
          skillSlug: input.slug,
          status: "ISSUED",
          issuedAt: now,
          expiresAt,
          purgeAfter,
          // Writing sessions carry ZERO item rows; the scenario is the whole served set.
          scenarioJson: {
            version: 1,
            kind: "WRITING",
            scenario: {
              skillSlug: scenario.skillSlug,
              skillName: scenario.skillName,
              level: scenario.level,
              motion: scenario.motion,
              side: scenario.side,
              prompt: scenario.prompt,
              hint: scenario.hint,
              modelExample: scenario.modelExample,
              rubricFocus: scenario.rubricFocus,
              // Retained so the submit route can reproduce the issued scenario for the existing
              // grader without ever consulting a client-supplied index.
              scenarioIndex
            }
          }
        }
      });

      return {
        sessionId: created.id,
        issuedAtIso: created.issuedAt.toISOString(),
        expiresAtIso: created.expiresAt.toISOString(),
        scenario: {
          skillSlug: scenario.skillSlug,
          skillName: scenario.skillName,
          level: scenario.level,
          motion: scenario.motion,
          side: scenario.side,
          prompt: scenario.prompt,
          hint: scenario.hint,
          modelExample: scenario.modelExample,
          rubricFocus: scenario.rubricFocus
        },
        resumed: false
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    return apiError(error);
  }
}
