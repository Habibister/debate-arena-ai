import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { evaluateReadiness } from "@/lib/ai";
import { readinessRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, readinessRequestSchema);
    const readiness = await evaluateReadiness({
      ...input,
      weaknessSummary: input.weaknessSummary ?? []
    });
    return NextResponse.json(readiness);
  } catch (error) {
    return apiError(error);
  }
}
