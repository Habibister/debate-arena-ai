"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Organization } from "@prisma/client";
import { Loader2, UserPlus } from "lucide-react";
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
      preferredOrganization: formData.get("preferredOrganization")?.toString() || null
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

      router.push(`/signin?created=1&email=${encodeURIComponent(payload.email)}`);
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
        <label className="text-sm font-semibold" htmlFor="avatarUrl">
          Avatar URL <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input id="avatarUrl" name="avatarUrl" type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." className="mt-2" />
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
