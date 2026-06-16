import { getServerSession } from "next-auth";
import { Lock, Users } from "lucide-react";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ratingLabel } from "@/lib/ai-personas";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDebateRating } from "@/lib/xp";

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

  // Read the coach's real teams + members. Select explicit columns (no joinCode) so this stays safe
  // before the join-code migration is deployed.
  const coach = session?.user?.id
    ? await prisma.coach.findUnique({
        where: { userId: session.user.id },
        select: {
          teams: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              name: true,
              organization: true,
              members: {
                orderBy: { joinedAt: "asc" },
                select: {
                  id: true,
                  user: {
                    select: {
                      id: true,
                      displayName: true,
                      name: true,
                      username: true,
                      avatarUrl: true,
                      image: true,
                      level: true,
                      xp: true,
                      wins: true
                    }
                  }
                }
              }
            }
          }
        }
      })
    : null;

  const teams = coach?.teams ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary">Coach Dashboard</Badge>
        <h1 className="mt-3 text-3xl font-bold">Manage teams and students</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Create teams, share a join code, and track the students who join. You only see students in your own teams.
        </p>
      </div>

      {teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="You do not have any teams yet."
          description="Create a team to get a join code your students can use. Team creation and join codes are rolling out in the next update."
          actionLabel="Create a team"
          actionHref="/coach"
        />
      ) : (
        teams.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>{team.name}</CardTitle>
                <Badge variant="outline">{team.organization.replace("_", " ")}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {team.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No students have joined this team yet. Share your join code to add students.
                </p>
              ) : (
                <div className="space-y-2">
                  {team.members.map((member) => {
                    const u = member.user;
                    const rating = calculateDebateRating({ xp: u.xp, wins: u.wins });
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3"
                      >
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            username={u.username}
                            displayName={u.displayName ?? u.name}
                            avatarUrl={u.avatarUrl ?? u.image}
                          />
                          <div>
                            <p className="font-semibold">{u.displayName ?? u.name ?? u.username ?? "Student"}</p>
                            <p className="text-xs text-muted-foreground">
                              @{u.username ?? "student"} · {(u.level ?? "BEGINNER").toLowerCase()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold">{rating}</p>
                          <p className="text-xs text-muted-foreground">{ratingLabel(rating)}</p>
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
