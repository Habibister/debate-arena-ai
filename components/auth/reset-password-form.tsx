"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-destructive">That reset link is invalid or has expired.</p>
        <Link href={"/forgot-password" as Route} className="text-sm font-semibold text-primary hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password")?.toString() ?? "";
    const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword })
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "That reset link is invalid or has expired.");
      }

      setDone(true);
      // Brief pause so the success message is visible, then send them to sign in.
      window.setTimeout(() => router.push("/signin?reset=1"), 1200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700">
        Password reset successful. Please sign in.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-semibold" htmlFor="password">
          New password
        </label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="mt-2" />
      </div>
      <div>
        <label className="text-sm font-semibold" htmlFor="confirmPassword">
          Confirm password
        </label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required className="mt-2" />
      </div>
      {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
        {isLoading ? "Resetting..." : "Reset password"}
      </Button>
    </form>
  );
}
