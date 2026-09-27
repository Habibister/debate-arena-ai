import { NextResponse } from "next/server";
import { apiError, parseJson, trackNotOffered } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { generateLessonContent } from "@/lib/ai";
import { lessonContentRequestSchema } from "@/lib/validators";
import { isRetiredOrganization } from "@/lib/training-tracks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "heavy" });
    const input = await parseJson(request, lessonContentRequestSchema);
    if (isRetiredOrganization(input.organization)) {
      return trackNotOffered();
    }
    const lesson = await generateLessonContent(input);
    return NextResponse.json(lesson);
  } catch (error) {
    return apiError(error);
  }
}
