"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type StudentTeam = {
  membershipId: string;
  teamId: string;
  teamName: string;
  organization: string;
  coachName: string;
};

export function JoinTeamCard({ teams }: { teams: StudentTeam[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function join(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsJoining(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: code })
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string; team?: { name?: string } };

      if (!response.ok) {
        throw new Error(result.error ?? "We could not join that team. Please try again.");
      }

      setSuccess(result.message ?? `You joined ${result.team?.name ?? "the team"}.`);
      setCode("");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not join that team. Please try again.");
    } finally {
      setIsJoining(false);
    }
  }

  async function leave(teamId: string) {
    setLeavingId(teamId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/teams/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId })
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error ?? "We could not leave that team. Please try again.");
      }
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not leave that team. Please try again.");
    } finally {
      setLeavingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" aria-hidden />
          Your teams
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {teams.length > 0 ? (
          <div className="space-y-2">
            {teams.map((team) => (
              <div key={team.membershipId} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{team.teamName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Coach {team.coachName} · {team.organization.replace("_", " ")}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" disabled={leavingId === team.teamId} onClick={() => leave(team.teamId)}>
                  {leavingId === team.teamId ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogOut className="h-4 w-4" aria-hidden />}
                  Leave
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You have not joined a team yet. Ask your coach for a join code to connect to their team.
          </p>
        )}

        <form onSubmit={join} className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="join-code">
            Join a team
          </label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="join-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="e.g. DEBATE-7KQ2"
              className="flex-1 uppercase"
              autoCapitalize="characters"
              maxLength={40}
            />
            <Button type="submit" disabled={isJoining || code.trim().length < 3}>
              {isJoining ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {isJoining ? "Joining..." : "Join"}
            </Button>
          </div>
          {success ? (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm font-semibold text-emerald-700">{success}</p>
          ) : null}
          {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
          {teams.length === 0 ? <Badge variant="outline" className="mt-1">Students join from here</Badge> : null}
        </form>
      </CardContent>
    </Card>
  );
}
