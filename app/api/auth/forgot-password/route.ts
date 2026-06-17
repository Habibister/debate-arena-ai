import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requestPasswordReset } from "@/lib/password-reset";
import { forgotPasswordSchema } from "@/lib/validators";

export const runtime = "nodejs";

// Always returns the same generic response so an attacker cannot tell whether an email is registered.
const GENERIC = { message: "If an account exists, a reset link has been sent." };

export async function POST(request: Request) {
  let email: string;
  try {
    const body = await request.json();
    email = forgotPasswordSchema.parse(body).email;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Enter a valid email address." }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    await requestPasswordReset(email);
  } catch (error) {
    // Never let an internal failure reveal whether the account exists — log and still return generic.
    console.error("[forgot-password]", error instanceof Error ? error.message : "request error");
  }

  return NextResponse.json(GENERIC);
}
