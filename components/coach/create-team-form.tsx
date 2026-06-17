"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Organization } from "@prisma/client";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const organizations: Array<{ value: Organization; label: string }> = [
  { value: "DEBATE", label: "Debate" },
  { value: "MODEL_UN", label: "Model UN" },
  { value: "DECA", label: "DECA" },
  { value: "HOSA", label: "HOSA" },
  { value: "MOCK_TRIAL", label: "Mock Trial" },
  { value: "PUBLIC_SPEAKING", label: "Public Speaking" }
];

export function CreateTeamForm({ triggerLabel = "Create a team" }: { triggerLabel?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [schoolOrClub, setSchoolOrClub] = useState("");
  const [organization, setOrganization] = useState<Organization>("DEBATE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, organization, schoolOrClub })
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not create your team. Please try again.");
      }

      setName("");
      setSchoolOrClub("");
      setOrganization("DEBATE");
      setOpen(false);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create your team. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        {triggerLabel}
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Create a team</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={isSubmitting}>
          <X className="h-4 w-4" aria-hidden />
          Cancel
        </Button>
      </div>

      <div>
        <label className="text-sm font-semibold" htmlFor="team-name">
          Team name
        </label>
        <Input id="team-name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} className="mt-2" placeholder="e.g. Northside Varsity Debate" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold" htmlFor="team-school">
            School or club <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Input id="team-school" value={schoolOrClub} onChange={(event) => setSchoolOrClub(event.target.value)} maxLength={120} className="mt-2" placeholder="Northside High School" />
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="team-org">
            Program
          </label>
          <select
            id="team-org"
            value={organization}
            onChange={(event) => setOrganization(event.target.value as Organization)}
            className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {organizations.map((org) => (
              <option key={org.value} value={org.value}>
                {org.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isSubmitting || name.trim().length < 2}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
        {isSubmitting ? "Creating team..." : "Create team"}
      </Button>
    </form>
  );
}
