// Email abstraction for transactional mail (currently just password reset). Uses Resend when
// configured; in local development it logs the link so the flow is testable without a provider; in
// production with no provider it reports a clean status (never throws, never prints secrets).
type SendResult = { status: "sent" | "dev-logged" | "not-configured" };

export async function sendPasswordResetEmail({ to, resetUrl }: { to: string; resetUrl: string }): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (apiKey && from) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from,
        to,
        subject: "Reset your CompeteReady password",
        text: `We received a request to reset your CompeteReady password.\n\nReset it here (link expires in 45 minutes):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
        html: `<p>We received a request to reset your CompeteReady password.</p>
<p><a href="${resetUrl}">Reset your password</a> (link expires in 45 minutes).</p>
<p>If you did not request this, you can safely ignore this email.</p>`
      });
      return { status: "sent" };
    } catch (error) {
      // Don't expose provider errors to callers. Log server-side (no secrets) and, in dev, still
      // surface the link so local testing is unblocked.
      console.error("[email] Failed to send password reset email.", error instanceof Error ? error.message : "send error");
      if (process.env.NODE_ENV !== "production") {
        console.log(`[dev] Password reset link for ${to}: ${resetUrl}`);
        return { status: "dev-logged" };
      }
      return { status: "not-configured" };
    }
  }

  if (process.env.NODE_ENV !== "production") {
    // Local development fallback: print the link so developers can complete the flow without Resend.
    console.log(`[dev] Password reset link for ${to}: ${resetUrl}`);
    return { status: "dev-logged" };
  }

  // Production with no provider configured: clean status, no secrets leaked.
  console.error("[email] No email provider configured (set RESEND_API_KEY and EMAIL_FROM).");
  return { status: "not-configured" };
}
