import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { ClipboardList, Compass, Gavel, PlayCircle, RotateCcw, Timer } from "lucide-react";
import { ResumeDebatesCard, type ResumeDebate } from "@/components/debate/resume-debates-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Fact } from "@/components/ui/fact";
import { PageHeader } from "@/components/ui/page-header";
import { authOptions } from "@/lib/auth";
import { getStudentDebates, isLegacyPracticeRecord, isUnfinished, practiceTypeLabel, showsOpponentMeta, sideLabel } from "@/lib/debate-history";
import { GUIDED_ROUND_LABEL, INDEPENDENT_ROUND_WHERE } from "@/lib/guided-rounds";
import { prisma } from "@/lib/prisma";
import { countDueReviews } from "@/lib/spaced-review";
import { getActiveTrack } from "@/lib/track-server";
import { recentCompletedTestsQuery, trackPracticeRecord, type TrackPracticeRecord } from "@/lib/learner-record";
import { flaggedTestForTrack, weakAreasForTrack } from "@/lib/track-recommendations";
import { decaDiagnosticRoutesForLearner } from "@/lib/education/deca-diagnostic-bridge";
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
  // Owner QA Repair 3B: the SAME window the Dashboard reads (lib/learner-record.ts), so the two
  // pages can never name different "latest" tests; the id travels with it so the recommendation can
  // link to the very test that flagged the area.
  const practiceTests =
    activeOrg && session?.user?.id
      ? await prisma.practiceTest.findMany({
          ...recentCompletedTestsQuery(session.user.id, activeOrg),
          where: { userId: session.user.id, status: "COMPLETED", organization: activeOrg, completedAt: { not: null } },
          select: { id: true, score: true, weakAreas: true, organization: true }
        })
      : [];
  // The track-scoped record — tests completed, recent average (null when none), skills with a
  // recorded drill result — read the same way the Dashboard reads it. Null when no track resolved.
  const trackRecord: TrackPracticeRecord | null =
    activeOrg && session?.user?.id ? await trackPracticeRecord(session.user.id, activeOrg) : null;

  // "Judged rounds" counts INDEPENDENT rounds only. A guided lesson round (practiceMode LESSON) is
  // stored and shown as learning history, but it is coached practice on a curriculum-limited ballot,
  // not an independent completed round, so it is counted separately (lib/guided-rounds.ts).
  const [judgedDebateCount, guidedExerciseCount, reviewsDue] = session?.user?.id
    ? await Promise.all([
        prisma.debate.count({ where: { studentId: session.user.id, status: "JUDGED", ...INDEPENDENT_ROUND_WHERE } }),
        prisma.debate.count({ where: { studentId: session.user.id, status: "JUDGED", practiceMode: "LESSON" } }),
        countDueReviews(session.user.id, activeTrack?.organization).catch(() => 0)
      ])
    : [0, 0, 0];

  // P0-4 (2026-09-09): this is the MEAN OF PRACTICE-TEST SCORES. It reads no MasteryProgress row and
  // does not survive spaced reassessment, so it may not be labelled "Mastery" — that would be fake
  // progress. Named for what it actually is; the real mastery model is untouched. Owner QA Repair 3B:
  // it is NULL when there is nothing to average — a learner with no completed test has no average,
  // and rendering 0% would claim a measured result that does not exist.
  const practiceAverage = trackRecord?.recentAverage ?? null;
  const weakAreas = weakAreasForTrack(practiceTests, activeOrg);
  // The graded test those areas came from — the evidence behind the personal claim below.
  const flagged = flaggedTestForTrack(practiceTests, activeOrg);
  // QA-R2 #6 + #8. A weak area is the test's own vocabulary; the bridge names the recorded skill it
  // belongs to and the lesson that teaches it, so Home speaks the same language as the Skills page and
  // the drills. DECA only — no other track has a bridge, and one is never invented.
  const diagnosticRoutes =
    activeOrg === "DECA"
      ? decaDiagnosticRoutesForLearner(weakAreas)
      : [];
  const suggestion = diagnosticRoutes[0] ?? null;
  // Personalised evidence exists only when a graded test flagged something. Everything below ranks off
  // this one value, so the page never shows two equally-weighted instructions that disagree.
  const hasPersonalNextStep = Boolean(flagged && weakAreas.length > 0);
  // `User.streak` is a LIFETIME count of scored activities across EVERY track (its two writers are
  // the Debate judge route and the PracticeTest grade route). It is shown only on the Debate tile,
  // where it is labelled account-wide; a DECA or HOSA tile shows that track's own record instead.
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
            // An unfinished guided round is named as what it is; Continue reopens it as guided because
            // the arena reads guided-ness from the stored round (lib/guided-rounds.ts).
            typeLabel: d.practiceMode === "LESSON" ? `${GUIDED_ROUND_LABEL} · ${practiceTypeLabel(d)}` : practiceTypeLabel(d),
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

  // Two actions, two destinations. For Debate these were BYTE-IDENTICAL: both resolved to
  // `/debate?track=...`, so "One focused rep in your track" opened a full judged round — a false
  // availability statement, and two differently-named buttons doing the same thing.
  //
  // Under Learn + Compete the split is the product's own: Debate Now is COMPETE, the full round. A
  // focused rep is LEARN-supporting practice, which for Debate is a scored skill drill. Non-Debate
  // tracks keep their own role-play setup, unchanged.
  const isDebateTrack = activeTrack?.id === "GENERAL_DEBATE";
  const isTestTrack = trackHasPracticeTests(activeTrack?.id) && Boolean(activeTrack);
  const practiceHref = isDebateTrack ? `/study-arcade?track=${trackSlug}` : `/training/${trackSlug}/practice`;
  // NO FIXED DURATION. This said "Practice 10 minutes" for every track. The destination does not run
  // for ten minutes and cannot promise to: a DECA role-play estimates 5 / 8 / 12 by difficulty
  // (roleplayEstimatedMinutes) and the room itself renders "~5 min" at the default level, so the
  // product contradicted its own label two clicks later. It was also the only unqualified duration
  // number on the surface — everything else already hedges — and for DECA it collided with a real
  // sourced quantity, the ten-minute Individual Series prep window, which means something else.
  //
  // Naming the ACTIVITY instead of a clock is truthful for all three destinations, which are three
  // different things: Debate lands on a scored skill drill, DECA on the role-play setup, HOSA on its
  // Event Preparation Room. One label could not have been true for all of them.
  const practiceLabel = isDebateTrack
    ? "Practice a skill drill"
    : activeTrack?.id === "DECA"
      ? "Practice a role-play"
      : "Practice your event";
  // Owner QA Repair 3B: the COMPETE action names what the track's own Compete page names. "Debate
  // Now — a full round with an AI opponent and judge" was shown on every track, and on DECA it
  // redirected to the role-play setup — a Debate label over a DECA destination, and a duplicate of
  // "Practice a role-play" beside it. Each track's card now mirrors its Compete card, word for word.
  const competeAction =
    activeTrack?.id === "DECA"
      ? { href: `/study-arcade?track=${trackSlug}&focus=simulation#full-simulation`, label: "Run the full DECA simulation", detail: "The timed end-to-end run: prep clock → pitch → objections → scored ballot. Results aren't saved yet.", icon: PlayCircle }
      : activeTrack?.id === "HOSA"
        ? { href: "/training/hosa/events", label: "Find your HOSA event", detail: "HOSA events differ too much for one arena. Start from your exact event and train what it actually contains.", icon: Compass }
        : { href: `/debate?track=${trackSlug}`, label: "Debate Now", detail: "A full round with an AI opponent and judge", icon: Gavel };
  const quickActions = [
    competeAction,
    {
      href: practiceHref,
      label: practiceLabel,
      detail: isDebateTrack ? "A short scored drill on one skill" : "One focused rep in your track",
      icon: Timer
    },
    // Offered only where a practice-test product exists. General Debate has none, so this quick
    // action is absent there rather than routing to another track's generator.
    ...(trackHasPracticeTests(activeTrack?.id)
      ? [{ href: `/tests?track=${trackSlug}`, label: "Take a test", detail: "An original practice set with explanations", icon: ClipboardList }]
      : []),
    // The count above is scoped to the effective track, so the destination must be too (Owner QA
    // Repair 2): a bare `/study-arcade/review` resolved the learner's default track and could list
    // a different track's reviews than the number it was reached from.
    { href: activeTrack ? `/study-arcade/review?track=${activeTrack.slug}` : "/study-arcade/review", label: "Review missed terms", detail: reviewsDue > 0 ? `${reviewsDue} ${reviewsDue === 1 ? "skill is" : "skills are"} due for review` : "Nothing due — reviews appear as skills record your practice", icon: RotateCcw }
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
            : hasPersonalNextStep && activeTrack
              ? `Your last ${activeTrack.label} test points at one skill — start there. Each activity tells you what it records.`
              : activeTrack
                ? `One focused ${activeTrack.label} rep is the best next step. Each activity tells you what it records.`
              : "Pick a track and start a focused rep — each activity tells you what it records."
        }
      />

      {/* 2. One strongest action. A returning learner gets the real resumable session; everyone else
             gets the single start CTA. Nothing here is inferred — `hasContinue` comes from actual
             unfinished records, and the resume card is unchanged.
             The heading is visually hidden because both branches already carry their own visible
             title; it exists so the outline reads h1 -> h2 -> h3 instead of jumping straight to the
             resume card's own h3, which is what it did before. */}
      <h2 className="sr-only">{hasContinue ? "Continue training" : "Start training"}</h2>
      {/* QA-R2 #8. ORDER IS THE PRIORITY. When a graded test has flagged something, that evidence-backed
             step is rendered first and the generic practice button follows it as the alternative; with
             no such evidence the generic action leads, exactly as before. The learner never sees two
             equally weighted instructions pointing different ways. */}
      {/* 3. Recommended next — real weak-area data from a graded test, or an honest empty state.
             Shown only on tracks that HAVE a practice-test product: the areas come from graded tests
             and nothing else, so a track without tests cannot ever fill this card.
             Owner QA Repair 3B: the action opens the graded test's own feedback — the exact evidence
             behind the claim — rather than a generic skills page that held no practice for the area
             named. The evidence sentence says which test: the latest one, or a recent one when the
             latest recorded no weak areas. */}
      {isTestTrack ? (
        <Card>
          <CardContent className="p-5">
            <p className="eyebrow">{hasPersonalNextStep ? "Suggested next step" : "Recommended next"}</p>
            {flagged && weakAreas.length > 0 ? (
              <div className="mt-3">
                {/* Proportional wording: this comes from ONE graded test, so it is offered as a
                    suggestion based on that test — never as the learner's biggest weakness. Where the
                    bridge covers the diagnostic, the recorded skill is named too, because that is the
                    word the Skills page and the drills use. */}
                <p className="text-lg font-bold">
                  {suggestion ? `Suggested: ${suggestion.areaLabel}` : `Suggested: ${weakAreas[0]}`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Based on {flagged.isLatest ? "your latest" : "a recent"} completed {activeTrack?.short} practice test, which flagged {weakAreas[0]}
                  {suggestion ? ` — part of ${suggestion.areaLabel.toLowerCase()}` : ""}
                  {weakAreas.length > 1 ? `. It also flagged ${weakAreas.slice(1).join(", ")}` : ""}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestion ? (
                    <>
                      <Link href={suggestion.lessonHref as Route} className={cn(buttonVariants({ size: "sm" }), "min-h-11")}>
                        Read the lesson
                      </Link>
                      <Link href={suggestion.drillHref as Route} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}>
                        Drill {suggestion.areaLabel.toLowerCase()}
                      </Link>
                    </>
                  ) : null}
                  <Link href={`/tests/${flagged.testId}/results` as Route} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}>
                    See that test&apos;s feedback
                  </Link>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No recommendations yet — complete a {activeTrack?.short} practice test and the areas you missed show up here. Nothing is ever invented.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {hasContinue ? (
        <ResumeDebatesCard debates={unfinished} isPractice={Boolean(activeTrack && activeTrack.id !== "GENERAL_DEBATE")} />
      ) : (
        // QA-R2 #8. This button and the recommendation card below it used to sit at the same weight,
        // giving a beginner two next steps that pointed in different directions with nothing to
        // choose between them. When a graded test has actually flagged something, that evidence leads
        // and this becomes the alternative; with no evidence, it stays the primary action it was.
        <Link
          href={(activeTrack ? `/training/${activeTrack.slug}/practice` : "/training") as Route}
          className={cn(
            buttonVariants({ size: "lg", variant: hasPersonalNextStep ? "outline" : "default" }),
            "min-h-11 w-full sm:w-fit"
          )}
        >
          {activeTrack
            ? hasPersonalNextStep
              ? `Or start ${activeTrack.short} practice`
              : `Start ${activeTrack.short} practice`
            : "Choose your track"}
        </Link>
      )}

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

      {/* 5. Supporting stats from real recorded activity — kept visible, including genuine zeros,
             but never another track's numbers. Owner QA Repair 3B: this tile showed the account-wide
             session counter, the judged-round count of EVERY track and a 0% for "no tests" under a
             "Training in: DECA" badge. Debate keeps its trio (the account-wide counter now says so);
             a DECA or HOSA learner sees that track's own record — tests completed, the recent
             average or an honest "—", and (where drills record) skills with a recorded result. */}
      <section aria-labelledby="home-record">
        <h2 id="home-record" className="section-title">Your record</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {isDebateTrack || !activeTrack ? (
            <>
              <Fact label="Practice sessions" value={sessions} description="Scored activities across all your tracks" />
              <Fact label="Judged rounds" value={judgedDebateCount} />
              {guidedExerciseCount > 0 ? <Fact label="Guided exercises" value={guidedExerciseCount} /> : null}
            </>
          ) : (
            <>
              <Fact
                label="Practice tests completed"
                value={trackRecord?.testsCompleted ?? 0}
                description={activeTrack.id === "HOSA" ? "HOSA practice tests you have finished — Medical Terminology practice isn't counted here" : `${activeTrack.short} practice tests you have finished`}
              />
              <Fact
                label="Practice average"
                value={practiceAverage === null ? "—" : `${practiceAverage}%`}
                description={practiceAverage === null ? `No completed ${activeTrack.short} practice tests yet` : `Mean of your recent ${activeTrack.short} practice tests`}
              />
              <Fact
                label="Skills with a recorded result"
                value={trackRecord?.recordedSkills ?? 0}
                description={activeTrack.id === "DECA" ? "From DECA drills that record — role-plays aren't saved yet" : "From Medical Terminology practice that records"}
              />
            </>
          )}
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
