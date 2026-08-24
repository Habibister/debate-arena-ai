import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { explainNextAction } from "@/lib/ai";
import { coachActionExplanationTemplate, getEvidenceBackedNextAction } from "@/lib/coach-evidence";
import { coachNextActionRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

// M15 Learning Architecture Slice 3 — the AI Coach's one endpoint. SERVER CHOOSES, AI EXPLAINS.
//
// The request carries NO learning-state claims (the schema is a strict empty object, parsed only to
// reject smuggled ones); the action is derived entirely from the authenticated user's own durable
// record by lib/coach-evidence. The model contributes exactly one display string. NO_DUE_ACTION
// returns before any provider involvement: with no personalized evidence there is nothing for a
// model to explain, so no provider is called.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    await parseJson(request, coachNextActionRequestSchema);

    const action = await getEvidenceBackedNextAction(user.id);
    const template = coachActionExplanationTemplate(action);
    if (action.type === "NO_DUE_ACTION") {
      return NextResponse.json({ action, explanation: template });
    }

    const explained = await explainNextAction(
      {
        actionType: action.type,
        skillName: action.skill.name,
        belowPracticing: action.belowPracticing,
        dueSinceDate: action.dueSinceDate,
        lessonTitle: action.type === "REVIEW_LESSON_THEN_DRILL" ? action.lesson.title : undefined,
        drillLabel: action.type === "EXISTING_REVIEW_DESTINATION" ? undefined : action.drill.label,
        destinationLabel: action.type === "EXISTING_REVIEW_DESTINATION" ? action.destination.label : undefined
      },
      template
    );
    const tagged = explained as { explanation: string; aiProvider?: string; aiNotice?: string };
    return NextResponse.json({
      action,
      explanation: tagged.explanation,
      aiProvider: tagged.aiProvider,
      aiNotice: tagged.aiNotice
    });
  } catch (error) {
    return apiError(error);
  }
}
