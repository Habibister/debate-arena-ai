import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { Users } from "lucide-react";
import { JoinTeamCard, type StudentTeam } from "@/components/teams/join-team-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { canAccessCoachTools } from "@/lib/roles";
import { getStudentTeams } from "@/lib/teams";

// Teams landing — a student's memberships and the join-by-code flow in one place (previously only
// surfaced on the dashboard). Coaches are pointed to their team management tools.
export default async function TeamsPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? "STUDENT";
  const isCoach = canAccessCoachTools(role);

  const studentTeamRows = !isCoach && session?.user?.id ? await getStudentTeams(session.user.id) : [];
  const studentTeams: StudentTeam[] = studentTeamRows.map((row) => ({
    membershipId: row.id,
    teamId: row.team.id,
    teamName: row.team.name,
    organization: row.team.organization,
    coachName:
      row.team.coach?.user?.displayName ?? row.team.coach?.user?.name ?? row.team.coach?.user?.username ?? "your coach"
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Teams</Badge>
        </div>
        <h1 className="mt-3 flex items-center gap-2 text-3xl font-bold sm:text-4xl">
          <Users className="h-7 w-7 text-primary" aria-hidden />
          Teams
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          {isCoach
            ? "Create teams, share join codes, and follow your students' progress from the coach dashboard."
            : "Join your coach's team with a join code to receive assignments and share your progress."}
        </p>
      </div>

      {isCoach ? (
        <Card>
          <CardHeader>
            <CardTitle>Coach tools</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Team creation, join codes, rosters, and student progress live in the coach dashboard.
            </p>
            <Link href={"/coach" as Route} className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
              Open coach dashboard
            </Link>
          </CardContent>
        </Card>
      ) : (
        <JoinTeamCard teams={studentTeams} />
      )}
    </div>
  );
}
