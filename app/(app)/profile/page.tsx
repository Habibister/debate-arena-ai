import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Edit3, Flame, Medal, School, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn, titleCase } from "@/lib/utils";

function organizationLabel(value?: string | null) {
  return value ? titleCase(value.replaceAll("_", " ")) : "No preference yet";
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/profile");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      role: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      image: true,
      bio: true,
      schoolOrClub: true,
      preferredOrganization: true,
      organization: true,
      level: true,
      xp: true,
      streak: true,
      wins: true,
      rank: true,
      practiceTests: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, organization: true, eventCluster: true, score: true, createdAt: true }
      },
      studentDebates: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, topic: true, status: true, overallScore: true, createdAt: true }
      }
    }
  });

  if (!user) {
    redirect("/signin?callbackUrl=/profile");
  }

  const displayName = user.displayName ?? user.name ?? "Student";
  const username = user.username ?? "new_student";
  const avatarUrl = user.avatarUrl ?? user.image;
  const xpProgress = Math.min(100, Math.round(((user.xp ?? 0) % 500) / 5));

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500" />
        <CardContent className="-mt-12 flex flex-col gap-5 pt-0 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <UserAvatar username={username} displayName={displayName} avatarUrl={avatarUrl} size="xl" className="border-4 border-card" />
            <div className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold">{displayName}</h1>
                <Badge variant="secondary">@{username}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Link href="/profile/edit" className={cn(buttonVariants(), "mb-2")}>
            <Edit3 className="h-4 w-4" aria-hidden />
            Edit profile
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                <span>{titleCase(user.role.toLowerCase())}</span>
              </div>
              <div className="flex items-center gap-3">
                <School className="h-4 w-4 text-primary" aria-hidden />
                <span>{user.schoolOrClub ?? "Add a school or club"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                <span>{organizationLabel(user.preferredOrganization ?? user.organization)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Medal className="h-4 w-4 text-primary" aria-hidden />
                <span>{titleCase(user.level.toLowerCase())} level</span>
              </div>
              <p className="rounded-md border bg-muted/30 p-3 leading-6 text-muted-foreground">{user.bio ?? "Add a short bio so coaches and future opponents know what you are training for."}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">{user.rank} rank</span>
                <span className="text-muted-foreground">{user.xp} XP</span>
              </div>
              <Progress value={xpProgress} />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border bg-background p-3">
                  <Flame className="mb-2 h-4 w-4 text-accent" aria-hidden />
                  <p className="font-bold">{user.streak} practice sessions</p>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <Trophy className="mb-2 h-4 w-4 text-accent" aria-hidden />
                  <p className="font-bold">{user.wins} wins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent debates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.studentDebates.length > 0 ? (
                user.studentDebates.map((debate) => (
                  <Link key={debate.id} href={`/debate/${debate.id}`} className="block rounded-md border bg-background p-4 transition hover:bg-muted">
                    <p className="font-semibold">{debate.topic}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {titleCase(debate.status.toLowerCase())} {typeof debate.overallScore === "number" ? `· ${debate.overallScore}% judge score` : ""}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">No debates yet. Start an AI round to create your first profile result.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.practiceTests.length > 0 ? (
                user.practiceTests.map((test) => (
                  <Link key={test.id} href={`/tests/${test.id}/results`} className="block rounded-md border bg-background p-4 transition hover:bg-muted">
                    <p className="font-semibold">
                      {test.organization} {test.eventCluster ?? "practice"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{typeof test.score === "number" ? `${test.score}% score` : "In progress"}</p>
                  </Link>
                ))
              ) : (
                <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">No practice tests yet. Generate a DECA or HOSA set to fill this in.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
