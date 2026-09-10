import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
// Trophy dropped with the wins chip in M15 S1A A3b-2 — it had no other consumer on this page.
import { Edit3, Flame, Medal, School, ShieldCheck, Sparkles } from "lucide-react";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GUIDED_ROUND_LABEL } from "@/lib/guided-rounds";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActiveTrack } from "@/lib/track-server";
import { trackByOrganization } from "@/lib/training-tracks";
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
        // `status` and the answer count are selected because "In progress" used to be printed for ANY
        // ungraded row — including a set the learner generated and never opened. A row is only
        // "in progress" once an answer exists.
        select: {
          id: true,
          organization: true,
          eventCluster: true,
          score: true,
          status: true,
          createdAt: true,
          questions: { select: { _count: { select: { answers: true } } } }
        }
      },
      studentDebates: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, topic: true, status: true, overallScore: true, practiceMode: true, createdAt: true }
      }
    }
  });

  if (!user) {
    redirect("/signin?callbackUrl=/profile");
  }


  // The SAME resolver every other surface uses — no second source of track truth on this page.
  const activeTrack = (await resolveActiveTrack()).track;
  const signupOrganization = user.preferredOrganization ?? user.organization;
  const signupTrack = trackByOrganization(signupOrganization);
  // Shown only when it says something the line above does not.
  const signupOrganizationLabel =
    signupOrganization && signupTrack?.id !== activeTrack?.id ? organizationLabel(signupOrganization) : null;

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
                {/* DESIGN F1. The username chip overlaps the gradient banner, and its tinted variant put
                    violet text on violet-to-cyan ground — the census measured it well under AA. The
                    banner is untouched; the chip simply stands on an opaque card surface so its text
                    has a known ground, the same treatment the avatar's border already uses. */}
                <Badge variant="outline" className="bg-card text-foreground">
                  @{username}
                </Badge>
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
              <CardTitle as="h2">Identity</CardTitle>
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
              {/* QA-R1 #13. This row printed the learner's SIGNUP organization as their identity, so a
                  learner training DECA read "Debate" as who they are. The track they are actually
                  training comes from the one canonical resolver (route/selection/organization); the
                  signup organization is still shown when it differs, named as what it is rather than
                  presented as the learner's training identity. */}
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                <span>{activeTrack ? `Training in: ${activeTrack.label}` : "No track chosen yet"}</span>
              </div>
              {signupOrganizationLabel ? (
                <div className="flex items-center gap-3">
                  <School className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="text-muted-foreground">Signed up under {signupOrganizationLabel}</span>
                </div>
              ) : null}
              <div className="flex items-center gap-3">
                <Medal className="h-4 w-4 text-primary" aria-hidden />
                <span>{titleCase(user.level.toLowerCase())} level</span>
              </div>
              <p className="rounded-md border bg-muted/30 p-3 leading-6 text-muted-foreground">{user.bio ?? "Add a short bio so coaches and future opponents know what you are training for."}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">{user.rank} rank</span>
                <span className="text-muted-foreground">{user.xp} XP</span>
              </div>
              <Progress value={xpProgress} />
              {/* M15 S1A A3b-2: the "{n} wins" chip is gone. A3a stopped the judge route
                  incrementing User.wins, so the counter is frozen — celebrating it on a profile
                  would promote a statistic that can no longer move and was never a competition
                  record. It is NOT relabelled ("Legacy wins" / "Practice wins" would keep a dead
                  number prominent) and NOT deleted: the stored value is untouched. The grid drops to
                  one column so the surviving chip does not sit beside an empty cell. */}
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="rounded-md border bg-background p-3">
                  <Flame className="mb-2 h-4 w-4 text-accent" aria-hidden />
                  <p className="font-bold">{user.streak} practice sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Recent debates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.studentDebates.length > 0 ? (
                user.studentDebates.map((debate) => (
                  <Link key={debate.id} href={`/debate/${debate.id}`} className="block rounded-md border bg-background p-4 transition hover:bg-muted">
                    <p className="font-semibold">{debate.topic}</p>
                    {/* A3b-2: was "· {n}% judge score". The percent sign made a formative practice
                        number read like a graded mastery percentage, and "judge score" implied a
                        verified result. Same value, honest name, no percent. */}
                    <p className="mt-1 text-sm text-muted-foreground">
                      {debate.practiceMode === "LESSON" ? `${GUIDED_ROUND_LABEL} · ` : ""}
                      {titleCase(debate.status.toLowerCase())}{" "}
                      {typeof debate.overallScore === "number" ? `· practice ballot score ${debate.overallScore}` : ""}
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
              <CardTitle as="h2">Recent tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.practiceTests.length > 0 ? (
                user.practiceTests.map((test) => {
                  // QA-R1 #14. "In progress" was printed for every ungraded row, so a set the learner
                  // generated and never opened was reported back to them as work they had started. The
                  // row now states which of the three real states it is in, and opens the matching
                  // destination: a graded set opens its results, an unanswered one opens the test.
                  const answered = test.questions.reduce((total, question) => total + question._count.answers, 0);
                  const graded = typeof test.score === "number" && test.status === "COMPLETED";
                  const state = graded ? `${test.score}% score` : answered > 0 ? `In progress — ${answered} answered` : "Not started";
                  return (
                    <Link
                      key={test.id}
                      href={(graded ? `/tests/${test.id}/results` : `/tests/${test.id}`) as Route}
                      className="block rounded-md border bg-background p-4 transition hover:bg-muted"
                    >
                      <p className="font-semibold">
                        {test.organization} {test.eventCluster ?? "practice"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{state}</p>
                    </Link>
                  );
                })
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
