"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const email = new FormData(event.currentTarget).get("email")?.toString() ?? "";

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Please enter a valid email address.");
      }

      // Generic confirmation — never reveals whether the email exists.
      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700">
        If an account exists, a reset link has been sent.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-semibold" htmlFor="email">
          Email
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required className="mt-2" />
      </div>
      {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}
        {isLoading ? "Sending..." : "Send reset link"}
      </Button>
    </form>
  );
}
