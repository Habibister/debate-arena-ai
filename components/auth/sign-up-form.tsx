"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Organization } from "@prisma/client";
import { Loader2, UserPlus } from "lucide-react";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const organizations: Array<{ value: Organization; label: string }> = [
  { value: "DEBATE", label: "Debate" },
  { value: "DECA", label: "DECA" },
  { value: "HOSA", label: "HOSA" },
  { value: "MODEL_UN", label: "Model UN" },
  { value: "PUBLIC_SPEAKING", label: "Public Speaking" }
];

function usernameFromDisplayName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24);
}

export function SignUpForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [accountType, setAccountType] = useState<"STUDENT" | "COACH">("STUDENT");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: formData.get("email")?.toString() ?? "",
      password: formData.get("password")?.toString() ?? "",
      confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
      username,
      displayName,
      avatarUrl,
      schoolOrClub: formData.get("schoolOrClub")?.toString() ?? "",
      preferredOrganization: formData.get("preferredOrganization")?.toString() || null,
      accountType
    };

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "We could not create your account. Please try again.");
      }

      const callbackUrl = accountType === "COACH" ? "/coach" : "/dashboard";
      router.push(`/signin?created=1&email=${encodeURIComponent(payload.email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not create your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
        <UserAvatar username={username || undefined} displayName={displayName || undefined} avatarUrl={avatarUrl || null} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{displayName || "Your display name"}</p>
          <p className="truncate text-xs text-muted-foreground">@{username || "username"}</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">Account type</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(
            [
              { value: "STUDENT", title: "Student", detail: "Train with AI debates, tests, and lessons." },
              { value: "COACH", title: "Coach", detail: "Create teams and track your students." }
            ] as const
          ).map((option) => {
            const active = accountType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setAccountType(option.value)}
                aria-pressed={active}
                className={`rounded-lg border p-3 text-left transition ${
                  active ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-background hover:border-primary/50"
                }`}
              >
                <p className="text-sm font-semibold">{option.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{option.detail}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold" htmlFor="displayName">
            Display name
          </label>
          <Input
            id="displayName"
            name="displayName"
            value={displayName}
            onChange={(event) => {
              const value = event.target.value;
              setDisplayName(value);
              if (!username) {
                setUsername(usernameFromDisplayName(value));
              }
            }}
            required
            className="mt-2"
          />
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="username">
            Username
          </label>
          <Input id="username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} required className="mt-2" />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold" htmlFor="email">
          Email
        </label>
        <Input id="email" name="email" type="email" required className="mt-2" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold" htmlFor="password">
            Password
          </label>
          <Input id="password" name="password" type="password" minLength={8} required className="mt-2" />
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="confirmPassword">
            Confirm password
          </label>
          <Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required className="mt-2" />
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">
          Profile picture <span className="font-normal text-muted-foreground">(optional)</span>
        </p>
        <div className="mt-2">
          <AvatarUploader
            value={avatarUrl || null}
            onChange={(url) => setAvatarUrl(url ?? "")}
            displayName={displayName}
            username={username}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold" htmlFor="schoolOrClub">
            School or club <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Input id="schoolOrClub" name="schoolOrClub" className="mt-2" />
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="preferredOrganization">
            Preferred track <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <select id="preferredOrganization" name="preferredOrganization" className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">Choose later</option>
            {organizations.map((organization) => (
              <option key={organization.value} value={organization.value}>
                {organization.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
        Create account
      </Button>
    </form>
  );
}
