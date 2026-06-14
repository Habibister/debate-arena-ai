import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "DebateArena AI",
    checks: {
      databaseUrl: Boolean(process.env.DATABASE_URL),
      nextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
      nextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
      openAiKey: Boolean(process.env.OPENAI_API_KEY),
      openAiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini"
    }
  });
}
