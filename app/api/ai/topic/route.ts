import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/api-auth";
import { generateTopic } from "@/lib/ai";
import { topicRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireUser();
    const input = await parseJson(request, topicRequestSchema);
    const topic = await generateTopic(input);
    return NextResponse.json(topic);
  } catch (error) {
    return apiError(error);
  }
}
