import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { HttpError } from "@/lib/api";
import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 45 * 60 * 1000; // 45 minutes (within the 30–60 minute window)

// Store only the SHA-256 of the token; the raw token lives only in the emailed URL.
function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken.trim()).digest("hex");
}

export function appUrl() {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

// Generates a reset token for a user, persists ONLY its hash + expiry, and returns the raw token so a
// reset URL can be built. The raw token is never stored and never logged (except the dev email log).
export async function createPasswordResetToken(userId: string) {
  const rawToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);
  await prisma.user.update({
    where: { id: userId },
    data: { resetPasswordTokenHash: hashToken(rawToken), resetPasswordExpires: expires }
  });
  return { rawToken, expires };
}

// Always behaves the same whether or not the email exists — no account enumeration. Never throws for
// a missing account; the caller returns a generic success either way.
export async function requestPasswordReset(email: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
    select: { id: true, email: true }
  });

  if (user?.id) {
    const { rawToken } = await createPasswordResetToken(user.id);
    const resetUrl = `${appUrl()}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail({ to: user.email ?? normalized, resetUrl });
  }
}

// Validates the token + passwords, sets the new bcrypt hash, and clears the reset fields so the link
// cannot be reused. Throws HttpError(400) for any invalid/expired/mismatch case.
export async function resetPassword(params: { token: string; password: string; confirmPassword: string }) {
  if (params.password !== params.confirmPassword) {
    throw new HttpError("Passwords do not match.", 400);
  }
  if (params.password.length < 8) {
    throw new HttpError("Password must be at least 8 characters.", 400);
  }

  const user = await prisma.user.findFirst({
    where: { resetPasswordTokenHash: hashToken(params.token), resetPasswordExpires: { gt: new Date() } },
    select: { id: true }
  });

  if (!user) {
    throw new HttpError("That reset link is invalid or has expired. Request a new one.", 400);
  }

  const passwordHash = await bcrypt.hash(params.password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetPasswordTokenHash: null, resetPasswordExpires: null }
  });
}
