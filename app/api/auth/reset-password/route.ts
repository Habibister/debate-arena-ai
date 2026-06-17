import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { resetPassword } from "@/lib/password-reset";
import { resetPasswordSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, resetPasswordSchema);
    await resetPassword({ token: input.token, password: input.password, confirmPassword: input.confirmPassword });
    return NextResponse.json({ message: "Password reset successful. Please sign in." });
  } catch (error) {
    return apiError(error);
  }
}
