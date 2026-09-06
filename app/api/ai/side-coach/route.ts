import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { validateAndCanonicalizeAuthoredRubricIds } from "@/lib/authored-rubric-feedback";
import { defaultSupportLevel, guidedRubricFor } from "@/lib/education/coaching";
import { guidedLessonIdOf } from "@/lib/guided-rounds";
import { authoredDecaRubricIds, generateSideCoachResponse, sideCoachUnavailable } from "@/lib/side-coach";
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

/**
 * What the STORED round says about guided-ness — the only source of that truth this route accepts.
 *
 * Three outcomes, and they are not interchangeable:
 *   - `guided`      the row is a Debate lesson round whose lesson the curriculum still recognises;
 *   - `ordinary`    the row exists, belongs to this student, and is not a lesson round;
 *   - `unavailable` the row could not be established: not found, not this student's, or the read
 *                   failed. NOTHING is inferred from the request in this case. An earlier version
 *                   fell back to the caller's own claim here, which meant a database hiccup handed
 *                   the caller the power to decide whether a round was guided — the exact thing row
 *                   authority exists to prevent. The caller may CONFIRM server truth; it cannot
 *                   create it, and it cannot substitute for it when the server cannot read it.
 */
type RowGuidedTruth =
  | { kind: "guided"; lessonId: string; organization: "DEBATE" }
  | { kind: "ordinary" }
  | { kind: "unavailable" };

async function guidedTruthFromRow(debateId: string, userId: string): Promise<RowGuidedTruth> {
  try {
    const debate = await prisma.debate.findFirst({
      where: { id: debateId, studentId: userId },
      select: { organization: true, practiceMode: true, formatConfig: true }
    });
    if (!debate) return { kind: "unavailable" };
    if (debate.organization !== "DEBATE") return { kind: "ordinary" };
    const lessonId = guidedLessonIdOf(debate);
    if (!lessonId) return { kind: "ordinary" };
    // A LESSON row whose lesson the curriculum no longer recognises is not "ordinary": coaching it
    // without its constraint would coach skills the lesson never taught. It is unresolvable.
    if (!guidedRubricFor(lessonId)) return { kind: "unavailable" };
    return { kind: "guided", lessonId, organization: "DEBATE" };
  } catch {
    return { kind: "unavailable" };
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

    // THE ROW DECIDES, AND ONLY THE ROW. Exact behaviour by outcome:
    //   - no `debateId`: there is no round, so there is no guided semantics to claim (the schema
    //     already refuses a `guided` block without one); ordinary coaching on the request as sent;
    //   - row `guided`: coached under that lesson's constraint whatever the request said, with the
    //     ORGANIZATION taken from the row as well (the rubric resolves only for Debate, so a caller
    //     sending `organization: "DECA"` would otherwise drop the constraint through the side door)
    //     and the SUPPORT LEVEL taken from the caller when sent, because the row's default is the
    //     most permissive and this override must never hand out more help than the page decided;
    //   - row `ordinary`: any `guided` block in the request is DISCARDED — the client may confirm
    //     server truth, never create it;
    //   - row `unavailable`: the request is REFUSED with an honest unavailable response, never
    //     coached. Nothing about guided-ness is inferred from the caller after the server has failed
    //     to establish it, and no provider call is made.
    const truth: RowGuidedTruth = input.debateId ? await guidedTruthFromRow(input.debateId, user.id) : { kind: "ordinary" };
    if (truth.kind === "unavailable") {
      return NextResponse.json(sideCoachUnavailable("round-unverified"));
    }
    const guided = truth.kind === "guided"
      ? { lessonId: truth.lessonId, supportLevel: input.guided?.supportLevel ?? defaultSupportLevel("guided") }
      : undefined;
    const organization = truth.kind === "guided" ? truth.organization : input.organization;

    const response = await generateSideCoachResponse({
      ...input,
      organization,
      guided,
      rubricIds,
      transcript: input.transcript ?? [],
      requestType: input.requestType ?? "turn-feedback"
    });
    return NextResponse.json(response);
  } catch (error) {
    return apiError(error);
  }
}
