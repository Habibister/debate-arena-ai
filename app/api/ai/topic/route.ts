import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { generateTopic } from "@/lib/ai";
import { enforceRateLimit } from "@/lib/rate-limit";
import { topicRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const input = await parseJson(request, topicRequestSchema);
    const topic = await generateTopic(input);
    const selectedProvider =
      topic && typeof topic === "object" && "aiProvider" in topic ? String((topic as Record<string, unknown>).aiProvider) : "unknown";
    console.info(`[ai-diagnostics] label=topic generator stage=provider_selected selectedAfterward=${selectedProvider}`);
    return NextResponse.json(topic);
  } catch (error) {
    return apiError(error);
  }
}
