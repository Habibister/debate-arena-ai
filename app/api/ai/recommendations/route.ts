import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recommendLessons } from "@/lib/ai";
import { recommendationRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, recommendationRequestSchema);
    const recommendations = await recommendLessons(input);
    return NextResponse.json(recommendations);
  } catch (error) {
    return apiError(error);
  }
}
