"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Level, Organization } from "@prisma/client";
import { Loader2, Save } from "lucide-react";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProfileFormUser = {
  username: string | null;
  displayName: string | null;
  name: string | null;
  avatarUrl: string | null;
  image: string | null;
  bio: string | null;
  schoolOrClub: string | null;
  preferredOrganization: Organization | null;
  organization: Organization | null;
  level: Level;
};

const organizations: Array<{ value: Organization; label: string }> = [
  { value: "DEBATE", label: "Debate" },
  { value: "MODEL_UN", label: "Model UN" },
  { value: "DECA", label: "DECA" },
  { value: "HOSA", label: "HOSA" },
  { value: "MOCK_TRIAL", label: "Mock Trial" },
  { value: "PUBLIC_SPEAKING", label: "Public Speaking" }
];

const levels: Array<{ value: Level; label: string }> = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ELITE", label: "Elite" }
];

function handleFromUser(user: ProfileFormUser) {
  if (user.username) {
    return user.username;
  }

  const source = user.displayName ?? user.name ?? "student";
  return source.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24) || "student";
}

export function ProfileEditForm({ user }: { user: ProfileFormUser }) {
  const router = useRouter();
  const [username, setUsername] = useState(handleFromUser(user));
  const [displayName, setDisplayName] = useState(user.displayName ?? user.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? user.image ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [schoolOrClub, setSchoolOrClub] = useState(user.schoolOrClub ?? "");
  const [preferredOrganization, setPreferredOrganization] = useState<Organization | "">(user.preferredOrganization ?? user.organization ?? "");
  const [level, setLevel] = useState<Level>(user.level);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const previewAvatar = useMemo(() => avatarUrl.trim() || null, [avatarUrl]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          displayName,
          avatarUrl,
          bio,
          schoolOrClub,
          preferredOrganization: preferredOrganization || null,
          level
        })
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "We could not save your profile. Please try again.");
      }

      router.refresh();
      router.push("/profile");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not save your profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 p-4">
        <UserAvatar username={username} displayName={displayName} avatarUrl={previewAvatar} size="lg" />
        <div>
          <p className="font-semibold">{displayName || "Display name"}</p>
          <p className="text-sm text-muted-foreground">@{username || "username"}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold" htmlFor="username">
            Username
          </label>
          <Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2" />
          <p className="mt-1 text-xs text-muted-foreground">Letters, numbers, and underscores only.</p>
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="displayName">
            Display name
          </label>
          <Input id="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-2" />
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">Profile picture</p>
        <div className="mt-2">
          <AvatarUploader
            value={previewAvatar}
            onChange={(url) => setAvatarUrl(url ?? "")}
            displayName={displayName}
            username={username}
            disabled={isSaving}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Remove the photo to use a generated initials avatar.</p>
      </div>

      <div>
        <label className="text-sm font-semibold" htmlFor="bio">
          Bio
        </label>
        <Textarea id="bio" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} className="mt-2 min-h-28" />
        <p className="mt-1 text-xs text-muted-foreground">{bio.length}/280 characters</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-sm font-semibold" htmlFor="schoolOrClub">
            School or club
          </label>
          <Input id="schoolOrClub" value={schoolOrClub} onChange={(event) => setSchoolOrClub(event.target.value)} className="mt-2" />
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="preferredOrganization">
            Preferred organization
          </label>
          <select
            id="preferredOrganization"
            value={preferredOrganization}
            onChange={(event) => setPreferredOrganization(event.target.value as Organization | "")}
            className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">No preference</option>
            {organizations.map((organization) => (
              <option key={organization.value} value={organization.value}>
                {organization.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="level">
            Level
          </label>
          <select id="level" value={level} onChange={(event) => setLevel(event.target.value as Level)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm">
            {levels.map((levelOption) => (
              <option key={levelOption.value} value={levelOption.value}>
                {levelOption.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
        Save profile
      </Button>
    </form>
  );
}
