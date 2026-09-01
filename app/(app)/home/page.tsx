import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { ClipboardList, Gavel, RotateCcw, Timer } from "lucide-react";
import { ResumeDebatesCard, type ResumeDebate } from "@/components/debate/resume-debates-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Fact } from "@/components/ui/fact";
import { PageHeader } from "@/components/ui/page-header";
import { authOptions } from "@/lib/auth";
import { getStudentDebates, isLegacyPracticeRecord, isUnfinished, practiceTypeLabel, showsOpponentMeta, sideLabel } from "@/lib/debate-history";
import { prisma } from "@/lib/prisma";
import { countDueReviews } from "@/lib/spaced-review";
import { getActiveTrack } from "@/lib/track-server";
import { weakAreasForTrack } from "@/lib/track-recommendations";
import { trackAllowsOrganization, trackByOrganization, trackHasPracticeTests } from "@/lib/training-tracks";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Home — the post-login landing. One obvious next action (continue a real unfinished session, or
// start practicing), one honest recommendation, quick actions, and the audited-honest stat trio.
// Every number derives from recorded activity; empty states say so instead of faking content.
export default async function HomePage({ searchParams }: { searchParams: { track?: string } }) {
  const session = await getServerSession(authOptions);
  const activeTrack = await getActiveTrack(searchParams.track);
  const activeOrg = activeTrack?.organization;
  const trackSlug = activeTrack?.slug ?? "debate";

  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { displayName: true, name: true, streak: true, wins: true }
      })
    : null;

  // C5B1: the "Recommended next" weak area comes ONLY from the resolved track's own graded tests.
  // No resolved track -> none (fail closed), so a prior HOSA test can never surface on Debate Home.
  const practiceTests =
    activeOrg && session?.user?.id
      ? await prisma.practiceTest.findMany({
          where: { userId: session.user.id, status: "COMPLETED", organization: activeOrg },
          orderBy: { completedAt: "desc" },
          take: 5,
          select: { score: true, weakAreas: true, organization: true }
        })
      : [];

  const [judgedDebateCount, reviewsDue] = session?.user?.id
    ? await Promise.all([
        prisma.debate.count({ where: { studentId: session.user.id, status: "JUDGED" } }),
        countDueReviews(session.user.id).catch(() => 0)
      ])
    : [0, 0];

  const completedScores = practiceTests.map((t) => t.score).filter((s): s is number => typeof s === "number");
  const mastery = completedScores.length > 0 ? Math.round(completedScores.reduce((a, b) => a + b, 0) / completedScores.length) : 0;
  const weakAreas = weakAreasForTrack(practiceTests, activeOrg);
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

  // Debate start-actions launch straight into /debate (no General Debate hub in between); non-debate
  // tracks open their own role-play setup.
  const practiceHref = activeTrack?.id === "GENERAL_DEBATE" ? `/debate?track=${trackSlug}` : `/training/${trackSlug}/practice`;
  const quickActions = [
    { href: `/debate?track=${trackSlug}`, label: "Debate Now", detail: "A full round with an AI opponent and judge", icon: Gavel },
    { href: practiceHref, label: "Practice 10 minutes", detail: "One focused rep in your track", icon: Timer },
    // Offered only where a practice-test product exists. General Debate has none, so this quick
    // action is absent there rather than routing to another track's generator.
    ...(trackHasPracticeTests(activeTrack?.id)
      ? [{ href: `/tests?track=${trackSlug}`, label: "Take a test", detail: "An original practice set with explanations", icon: ClipboardList }]
      : []),
    { href: "/study-arcade/review", label: "Review missed terms", detail: reviewsDue > 0 ? `${reviewsDue} ${reviewsDue === 1 ? "skill is" : "skills are"} due for review` : "Nothing due — reviews appear as you practice", icon: RotateCcw }
  ];

  return (
    <div className="space-y-8">
      {/* 1. Context. The heading and lead still say exactly what the data supports. */}
      <PageHeader
        eyebrow="Home"
        badges={activeTrack ? <Badge variant="outline">Training in: {activeTrack.label}</Badge> : null}
        heading={
          <h1 className="display-title">
            {hasContinue ? "Pick up where you left off" : `Ready to train, ${firstName}?`}
          </h1>
        }
        description={
          hasContinue
            ? "You have an unfinished session — continuing it is the fastest way back into form."
            : activeTrack
              ? `One focused ${activeTrack.label} rep is the best next step. Everything here counts toward your real record.`
              : "Pick a track and start a focused rep — everything here counts toward your real record."
        }
      />

      {/* 2. One strongest action. A returning learner gets the real resumable session; everyone else
             gets the single start CTA. Nothing here is inferred — `hasContinue` comes from actual
             unfinished records, and the resume card is unchanged.
             The heading is visually hidden because both branches already carry their own visible
             title; it exists so the outline reads h1 -> h2 -> h3 instead of jumping straight to the
             resume card's own h3, which is what it did before. */}
      <h2 className="sr-only">Continue training</h2>
      {hasContinue ? (
        <ResumeDebatesCard debates={unfinished} isPractice={Boolean(activeTrack && activeTrack.id !== "GENERAL_DEBATE")} />
      ) : (
        <Link
          href={(activeTrack ? `/training/${activeTrack.slug}/practice` : "/training") as Route}
          className={cn(buttonVariants({ size: "lg" }), "min-h-11 w-full sm:w-fit")}
        >
          {activeTrack ? `Start ${activeTrack.short} practice` : "Choose your track"}
        </Link>
      )}

      {/* 3. Recommended next — real weak-skill data or an honest empty state. */}
      <Card>
        <CardContent className="p-5">
          <p className="eyebrow">Recommended next</p>
          {weakAreas.length > 0 ? (
            <div className="mt-3">
              <p className="text-lg font-bold">Work on: {weakAreas[0]}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Flagged by the grader on your latest completed test{weakAreas.length > 1 ? ` — also worth a look: ${weakAreas.slice(1).join(", ")}` : ""}.
              </p>
              <Link href={`/skills?track=${trackSlug}` as Route} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 min-h-11")}>
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

      {/* 4. Quick actions — same labels, same destinations, now a compact list instead of four
             oversized cards competing with the primary action above. */}
      <section aria-labelledby="home-quick-actions">
        <h2 id="home-quick-actions" className="section-title">Quick actions</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <li key={action.label}>
                <Link
                  href={action.href as Route}
                  className="focus-ring flex min-h-11 items-start gap-3 rounded-md border bg-card px-3 py-2.5 transition-colors hover:bg-muted"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-track" aria-hidden />
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground">{action.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{action.detail}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 5. Supporting stats. Same three audited values from real recorded activity — kept visible,
             including their zeros, but no longer the loudest thing on an empty account. */}
      <section aria-labelledby="home-record">
        <h2 id="home-record" className="section-title">Your record</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Fact label="Practice sessions" value={sessions} />
          <Fact label="Judged rounds" value={judgedDebateCount} />
          <Fact label="Mastery" value={`${mastery}%`} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Full stats and history live in{" "}
          <Link
            href={"/dashboard" as Route}
            className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 font-semibold text-primary hover:underline"
          >
            Progress
          </Link>
        </p>
      </section>
    </div>
  );
}
