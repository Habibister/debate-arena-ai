import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { ClipboardList, Flame, Gavel, RotateCcw, Target, Timer, Trophy } from "lucide-react";
import { ResumeDebatesCard, type ResumeDebate } from "@/components/debate/resume-debates-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getStudentDebates, isLegacyPracticeRecord, isUnfinished, practiceTypeLabel, showsOpponentMeta, sideLabel } from "@/lib/debate-history";
import { prisma } from "@/lib/prisma";
import { countDueReviews } from "@/lib/spaced-review";
import { getActiveTrack } from "@/lib/track-server";
import { trackAllowsOrganization, trackByOrganization } from "@/lib/training-tracks";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Latest weak areas from real graded tests (same honest source the dashboard uses).
function latestWeakAreas(tests: Array<{ weakAreas: string[] }>): string[] {
  for (const test of tests) {
    if (test.weakAreas.length > 0) return test.weakAreas.slice(0, 3);
  }
  return [];
}

// Home — the post-login landing. One obvious next action (continue a real unfinished session, or
// start practicing), one honest recommendation, quick actions, and the audited-honest stat trio.
// Every number derives from recorded activity; empty states say so instead of faking content.
export default async function HomePage({ searchParams }: { searchParams: { track?: string } }) {
  const session = await getServerSession(authOptions);
  const activeTrack = getActiveTrack(searchParams.track);
  const trackSlug = activeTrack?.slug ?? "debate";

  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          displayName: true,
          name: true,
          streak: true,
          wins: true,
          practiceTests: {
            where: { status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
            take: 5,
            select: { score: true, weakAreas: true }
          }
        }
      })
    : null;

  const [judgedDebateCount, reviewsDue] = session?.user?.id
    ? await Promise.all([
        prisma.debate.count({ where: { studentId: session.user.id, status: "JUDGED" } }),
        countDueReviews(session.user.id).catch(() => 0)
      ])
    : [0, 0];

  const completedScores = (user?.practiceTests ?? []).map((t) => t.score).filter((s): s is number => typeof s === "number");
  const mastery = completedScores.length > 0 ? Math.round(completedScores.reduce((a, b) => a + b, 0) / completedScores.length) : 0;
  const weakAreas = latestWeakAreas(user?.practiceTests ?? []);
  const sessions = user?.streak ?? 0;

  // Real unfinished sessions for the selected track — the same honest filters the dashboard uses.
  const unfinished: ResumeDebate[] = session?.user?.id
    ? (await getStudentDebates(session.user.id))
        .filter((d) => isUnfinished(d.status))
        .filter((d) => trackAllowsOrganization(activeTrack, d.organization))
        .filter((d) => !isLegacyPracticeRecord(d))
        .slice(0, 2)
        .map((d) => {
          const showOpponent = showsOpponentMeta(d);
          return {
            id: d.id,
            topic: d.topic,
            trackLabel: trackByOrganization(d.organization)?.label ?? d.organization,
            typeLabel: practiceTypeLabel(d),
            showOpponent,
            sideLabel: showOpponent ? sideLabel(d.studentSide) : "",
            opponentLabel: showOpponent ? d.aiPersona ?? "AI opponent" : "",
            statusLabel: d.status === "ACTIVE" ? "In progress" : "Not started",
            updatedIso: d.updatedAt.toISOString()
          };
        })
    : [];

  const firstName = (user?.name ?? user?.displayName)?.split(" ")[0] ?? "there";
  const hasContinue = unfinished.length > 0;

  const quickActions = [
    { href: `/debate?track=${trackSlug}`, label: "Debate Now", detail: "A full round with an AI opponent and judge", icon: Gavel },
    { href: `/training/${trackSlug}/practice`, label: "Practice 10 minutes", detail: "One focused rep in your track", icon: Timer },
    { href: `/tests?track=${trackSlug}`, label: "Take a test", detail: "An original practice set with explanations", icon: ClipboardList },
    { href: "/study-arcade/review", label: "Review missed terms", detail: reviewsDue > 0 ? `${reviewsDue} ${reviewsDue === 1 ? "skill is" : "skills are"} due for review` : "Nothing due — reviews appear as you practice", icon: RotateCcw }
  ] as const;

  return (
    <div className="space-y-6">
      {/* Hero: one obvious next action. */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Home</Badge>
          {activeTrack ? <Badge variant="outline">Training in: {activeTrack.label}</Badge> : null}
        </div>
        <h1 className="display-title mt-4">
          {hasContinue ? "Pick up where you left off" : `Ready to train, ${firstName}?`}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {hasContinue
            ? "You have an unfinished session — continuing it is the fastest way back into form."
            : activeTrack
              ? `One focused ${activeTrack.label} rep is the best next step. Everything here counts toward your real record.`
              : "Pick a track and start a focused rep — everything here counts toward your real record."}
        </p>
        {!hasContinue ? (
          <Link
            href={(activeTrack ? `/training/${activeTrack.slug}/practice` : "/training") as Route}
            className={cn(buttonVariants({ size: "lg" }), "mt-5")}
          >
            {activeTrack ? `Start ${activeTrack.short} practice` : "Choose your track"}
          </Link>
        ) : null}
      </div>

      {hasContinue ? <ResumeDebatesCard debates={unfinished} isPractice={Boolean(activeTrack && activeTrack.id !== "GENERAL_DEBATE")} /> : null}

      {/* Recommended next — real weak-skill data or an honest empty state. */}
      <Card>
        <CardContent className="p-5">
          <p className="eyebrow">Recommended next</p>
          {weakAreas.length > 0 ? (
            <div className="mt-3">
              <p className="text-lg font-bold">Work on: {weakAreas[0]}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Flagged by the grader on your latest completed test{weakAreas.length > 1 ? ` — also worth a look: ${weakAreas.slice(1).join(", ")}` : ""}.
              </p>
              <Link href={`/skills?track=${trackSlug}` as Route} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}>
                Open skill practice
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No recommendations yet — complete a practice test or drill and your weak areas show up here. Nothing is ever invented.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick actions. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href as Route} className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted">
              <Icon className="h-5 w-5 text-track" aria-hidden />
              <p className="mt-2 font-semibold">{action.label}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{action.detail}</p>
            </Link>
          );
        })}
      </div>

      {/* Honest stat trio (audited: real recorded activity only). */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="eyebrow flex items-center gap-2"><Flame className="h-3.5 w-3.5 text-track" aria-hidden />Practice sessions</p>
          <p className="mt-2 text-2xl font-bold">{sessions}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="eyebrow flex items-center gap-2"><Trophy className="h-3.5 w-3.5 text-track" aria-hidden />Judged rounds</p>
          <p className="mt-2 text-2xl font-bold">{judgedDebateCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="eyebrow flex items-center gap-2"><Target className="h-3.5 w-3.5 text-track" aria-hidden />Mastery</p>
          <p className="mt-2 text-2xl font-bold">{mastery}%</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Full stats and history live in <Link href={"/dashboard" as Route} className="font-semibold text-primary hover:underline">Progress</Link>.
      </p>
    </div>
  );
}
