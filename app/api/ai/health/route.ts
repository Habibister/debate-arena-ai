import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { clientIp, requireUser } from "@/lib/api-auth";
import { extractJson, getCostMode, getProviderOrder, providerModel, runProviderCompletion } from "@/lib/ai-providers";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Safe AI health check. Reports which provider is selected and whether a Gemini key is present —
 * never the key itself or any secret. Add ?test=1 to run a tiny live Gemini request and report
 * whether it succeeded (this uses one small provider call).
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit({ userId: user.id, ip: clientIp(request), workload: "light" });
    const order = getProviderOrder();
    const selected = order[0] ?? "fallback";
    const runLiveTest = new URL(request.url).searchParams.get("test") === "1";

    const body: Record<string, unknown> = {
      providerSelected: selected,
      providerOrder: order,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY?.trim()),
      geminiModel: providerModel("gemini"),
      costMode: getCostMode()
    };

    if (runLiveTest) {
      try {
        const { content, provider } = await runProviderCompletion(
          { system: 'Reply with JSON only: {"ok": true}.', prompt: "Health check. Return the JSON.", temperature: 0 },
          "health check"
        );
        extractJson(content);
        body.lastTest = { ok: true, provider };
      } catch {
        body.lastTest = { ok: false, reason: "provider unavailable" };
      }
    }

    return NextResponse.json(body);
  } catch (error) {
    return apiError(error);
  }
}
