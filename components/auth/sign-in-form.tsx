"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2, LogIn, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEMO_EMAIL = "student@debatearena.ai";
const DEMO_PASSWORD = "password123";

type SignInFormProps = {
  showDemoLogin?: boolean;
};

function safeCallbackUrl(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export function SignInForm({ showDemoLogin = false }: SignInFormProps) {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const created = searchParams.get("created") === "1";
  const createdEmail = searchParams.get("email") ?? "";
  const initialEmail = createdEmail || (showDemoLogin ? DEMO_EMAIL : "");
  const initialPassword = createdEmail ? "" : showDemoLogin ? DEMO_PASSWORD : "";

  async function signInWithCredentials(email: string, password: string) {
    setIsLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      callbackUrl,
      redirect: false
    });

    if (result?.error) {
      setError(created ? "That email and password did not match. Use the password you chose when creating this account." : "Invalid email or password.");
      setIsLoading(false);
      setIsDemoLoading(false);
      return;
    }

    window.location.href = result?.url ?? callbackUrl;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";

    await signInWithCredentials(email, password);
  }

  async function continueAsDemoStudent() {
    setIsDemoLoading(true);
    await signInWithCredentials(DEMO_EMAIL, DEMO_PASSWORD);
  }

  const isBusy = isLoading || isDemoLoading;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {created ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700">
          Account created. Sign in{createdEmail ? ` as ${createdEmail}` : ""} to open your dashboard.
        </p>
      ) : null}
      <div>
        <label className="text-sm font-semibold" htmlFor="email">
          Email
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={initialEmail} required className="mt-2" />
      </div>
      <div>
        <label className="text-sm font-semibold" htmlFor="password">
          Password
        </label>
        <Input id="password" name="password" type="password" autoComplete="current-password" defaultValue={initialPassword} required className="mt-2" />
      </div>
      {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={isBusy}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}
        Sign in
      </Button>
      {showDemoLogin ? (
        <div className="space-y-3 rounded-md border border-dashed bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Development only. This demo fallback is disabled automatically outside local development.
          </p>
          <Button type="button" variant="secondary" className="w-full" disabled={isBusy} onClick={continueAsDemoStudent}>
            {isDemoLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserRound className="h-4 w-4" aria-hidden />}
            Continue as demo student
          </Button>
        </div>
      ) : null}
    </form>
  );
}
