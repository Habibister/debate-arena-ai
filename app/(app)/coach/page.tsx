import { getServerSession } from "next-auth";
import { Lock, Users } from "lucide-react";
import { CopyButton } from "@/components/coach/copy-button";
import { CreateTeamForm } from "@/components/coach/create-team-form";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ratingLabel } from "@/lib/ai-personas";
import { authOptions } from "@/lib/auth";
import { getTeamsForCoach } from "@/lib/teams";
import { calculateDebateRating } from "@/lib/xp";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  // Only coaches (and admins) may see the coach dashboard — never a fake roster for students.
  if (role !== "COACH" && role !== "ADMIN") {
    return (
      <div className="space-y-6">
        <div>
          <Badge variant="secondary">Coach Dashboard</Badge>
          <h1 className="mt-3 text-3xl font-bold">Coach tools</h1>
        </div>
        <EmptyState
          icon={Lock}
          title="You need a coach account to access this page."
          description="Coach tools are only available to coach accounts. If you are a student, ask your coach for a join code to connect to their team."
          actionLabel="Back to dashboard"
          actionHref="/dashboard"
        />
      </div>
    );
  }

  const teams = session?.user?.id ? await getTeamsForCoach(session.user.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="secondary">Coach Dashboard</Badge>
          <h1 className="mt-3 text-3xl font-bold">Manage teams and students</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Create a team, share its join code, and track the students who join. You only see students in your own teams.
          </p>
        </div>
        {teams.length > 0 ? <CreateTeamForm triggerLabel="Create another team" /> : null}
      </div>

      {teams.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon={Users}
            title="You do not have any teams yet."
            description="Create your first team to get a join code. Students can join from their dashboard using that code."
          />
          <div className="flex justify-center">
            <CreateTeamForm triggerLabel="Create your first team" />
          </div>
        </div>
      ) : (
        teams.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{team.name}</CardTitle>
                  {team.schoolOrClub ? <p className="mt-1 text-sm text-muted-foreground">{team.schoolOrClub}</p> : null}
                </div>
                <Badge variant="outline">{team.organization.replace("_", " ")}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Join code</p>
                  <p className="mt-1 font-mono text-lg font-bold tracking-wide">{team.joinCode ?? "—"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Share this join code with students. They join from their dashboard using this code.</p>
                </div>
                {team.joinCode ? <CopyButton value={team.joinCode} /> : null}
              </div>

              {team.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students have joined this team yet.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{team.members.length} student{team.members.length === 1 ? "" : "s"}</p>
                  {team.members.map((member) => {
                    const u = member.user;
                    const rating = calculateDebateRating({ xp: u.xp, wins: u.wins });
                    const mastery = u.xp > 0 || u.wins > 0 ? ratingLabel(rating) : "Not started";
                    return (
                      <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar username={u.username} displayName={u.displayName ?? u.name} avatarUrl={u.avatarUrl ?? u.image} />
                          <div>
                            <p className="font-semibold">{u.displayName ?? u.name ?? u.username ?? "Student"}</p>
                            <p className="text-xs text-muted-foreground">
                              @{u.username ?? "student"} · joined {new Date(member.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold">{rating} · {u.xp} XP</p>
                          <p className="text-xs text-muted-foreground">{mastery}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
