import { currentScoringEraScope } from "@/lib/debate-scoring-era";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { BookOpenCheck, ClipboardList, Compass, Flame, Layers3, Medal, MessageSquareText, Target, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MasteryChart } from "@/components/analytics/mastery-chart";
import { NextStepCard } from "@/components/app/next-step-card";
import { CoachNextActionCard } from "@/components/app/coach-next-action-card";
import { StatCard } from "@/components/app/stat-card";
import { XpProgressCard } from "@/components/app/xp-progress-card";
import { UserAvatar } from "@/components/profile/user-avatar";
import { RecommendedVideos } from "@/components/resources/recommended-videos";
import { JoinTeamCard, type StudentTeam } from "@/components/teams/join-team-card";
import { LearningPath } from "@/components/onboarding/learning-path";
import { ResumeDebatesCard, type ResumeDebate } from "@/components/debate/resume-debates-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import type { MasteryPoint } from "@/types/domain";
import { nearestAiPersona } from "@/lib/ai-personas";
import { assignmentStatusLabel, assignmentTypeLabel, statusForSubmission } from "@/lib/assignment-types";
import { getStudentAssignments } from "@/lib/assignments";
import { getStudentDebates, isLegacyPracticeRecord, isUnfinished, practiceTypeLabel, showsOpponentMeta, sideLabel } from "@/lib/debate-history";
import { trackAllowsOrganization, trackByOrganization, trackHasPracticeTests } from "@/lib/training-tracks";
import { getActiveTrack } from "@/lib/track-server";
import { weakAreasForTrack } from "@/lib/track-recommendations";
import { recentCompletedTestsQuery, trackPracticeRecord, type TrackPracticeRecord } from "@/lib/learner-record";
import { nextStepsForTrack, resourceOrgForTrack, type DashboardAction } from "@/lib/dashboard-actions";
import { authOptions } from "@/lib/auth";
import { isDemoUser } from "@/lib/demo";
import { GUIDED_ROUND_LABEL, INDEPENDENT_ROUND_WHERE } from "@/lib/guided-rounds";
import { prisma } from "@/lib/prisma";
import { getStudentTeams } from "@/lib/teams";
import { calculateDebateRating } from "@/lib/xp";

// Icon/tone per track-aware dashboard action (data comes from nextStepsForTrack).
const ACTION_ICON: Record<DashboardAction["key"], LucideIcon> = {
  orientation: Compass,
  practice: MessageSquareText,
  tests: ClipboardList,
  skills: BookOpenCheck,
  study: Layers3
};
const ACTION_TONE: Record<DashboardAction["key"], "primary" | "secondary" | "accent"> = {
  orientation: "primary",
  practice: "primary",
  tests: "secondary",
  skills: "accent",
  study: "secondary"
};

// Sample rows shown ONLY for demo accounts. Real users see their real data (zero until they train).
const demoSampleLessons = [
  ["Evidence weighing", 68],
  ["Cross examination setup", 57],
  ["Rebuttal collapse", 72]
] as const;

const demoSampleMastery: MasteryPoint[] = [
  { skill: "Logic", mastery: 84, trend: "up" },
  { skill: "Evidence", mastery: 68, trend: "up" },
  { skill: "Rebuttal", mastery: 72, trend: "flat" },
  { skill: "Clarity", mastery: 91, trend: "up" }
];

// P0-4 (2026-09-09): the MEAN OF PRACTICE-TEST SCORES. It reads no MasteryProgress row and does not
// survive spaced reassessment, so it is not mastery and is no longer labelled as such.
function practiceAverageFromTests(tests: Array<{ score: number | null }>): number | null {
  const completedScores = tests.map((test) => test.score).filter((score): score is number => typeof score === "number");

  if (completedScores.length === 0) {
    // A brand-new user has no practice results yet — never fake a number. Owner QA Repair 3B: that
    // means NULL, rendered as "—"; a 0% would claim a measured result that does not exist.
    return null;
  }

  return Math.round(completedScores.reduce((total, score) => total + score, 0) / completedScores.length);
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  // The main dashboard is the student experience. A COACH gets the intentional Coach dashboard instead
  // of a page labeled "Student dashboard". ADMIN behavior is intentionally unchanged.
  if (session?.user?.role === "COACH") {
    redirect("/coach");
  }
  // C5B1: resolve the active track BEFORE reading tests so weak-area recommendations are track-scoped.
  const activeTrack = await getActiveTrack();
  const activeOrg = activeTrack?.organization;
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  // Only this track's own graded tests inform the "weak area" recommendation. No resolved track ->
  // none (fail closed), so a prior HOSA test never becomes a Debate/DECA recommendation.
  // Owner QA Repair 3B: the SAME window Home reads (lib/learner-record.ts) — ordered by completion,
  // not creation — so "weak skill" and the average cannot differ between the two pages.
  const recentTests =
    activeOrg && session?.user?.id
      ? await prisma.practiceTest.findMany({
          ...recentCompletedTestsQuery(session.user.id, activeOrg),
          where: { userId: session.user.id, status: "COMPLETED", organization: activeOrg, completedAt: { not: null } },
          select: { score: true, weakAreas: true, organization: true }
        })
      : [];
  const trackRecord: TrackPracticeRecord | null =
    activeOrg && session?.user?.id ? await trackPracticeRecord(session.user.id, activeOrg) : null;
  const isDebateTrack = activeTrack?.id === "GENERAL_DEBATE";
  // Debate-only concepts (judged rounds, ballot averages, the bot heuristic, the Debate record card)
  // are rendered only under Debate. They are still computed — the queries are account-wide and other
  // surfaces pin their shape — but a DECA or HOSA page never presents them as that track's record.
  const showDebateRecord = isDebateTrack || !activeTrack;
  // INDEPENDENT rounds only: a guided lesson round (practiceMode LESSON) is coached practice on a
  // curriculum-limited ballot and is counted on its own line, never as a judged round
  // (lib/guided-rounds.ts). It still counts as ACTIVITY below — the learner really did practise.
  const judgedDebateCount = session?.user?.id
    ? await prisma.debate.count({
        where: {
          studentId: session.user.id,
          status: "JUDGED",
          ...INDEPENDENT_ROUND_WHERE
        }
      })
    : 0;
  const guidedExerciseCount = session?.user?.id
    ? await prisma.debate.count({ where: { studentId: session.user.id, status: "JUDGED", practiceMode: "LESSON" } })
    : 0;
  // Real evidence for the dashboard: the average judge score across this student's judged rounds.
  // Null (shown as "—") until at least one round has actually been judged — never a synthetic number.
  //
  // CURRENT SCORING ERA ONLY. The transcript judge withdrew a false weighing score on 2026-09-07 and
  // renormalised the ballot, so rows either side of that boundary do not mean the same thing;
  // averaging them together would show a scoring correction as if it were the student changing.
  // Older rounds are untouched and still appear individually — only this average is scoped, and it
  // reads null rather than 0 when the student has no rounds yet under the current semantics.
  // FAILS CLOSED: a null fragment means no activation instant is set yet, so no round can be proven
  // current-era and the average is UNAVAILABLE — it renders "—" rather than averaging mixed eras.
  const scoringEra = currentScoringEraScope();
  const avgJudgeScoreRaw = session?.user?.id && scoringEra.eligible
    ? (
        await prisma.debate.aggregate({
          _avg: { overallScore: true },
          where: {
            studentId: session.user.id,
            status: "JUDGED",
            overallScore: { not: null },
            ...INDEPENDENT_ROUND_WHERE,
            ...scoringEra.where
          }
        })
      )._avg.overallScore
    : null;
  const avgJudgeScore = typeof avgJudgeScoreRaw === "number" ? Math.round(avgJudgeScoreRaw) : null;

  const demo = isDemoUser(user?.email ?? session?.user?.email);
  // Name fallbacks fire only for an account with no name at all; "Debater" is a Debate word.
  const fullDisplayName = user?.displayName ?? user?.name ?? session?.user?.displayName ?? (showDebateRecord ? "Debater" : "Student");
  const displayName = (user?.name ?? user?.displayName)?.split(" ")[0] ?? "there";
  const username = user?.username ?? session?.user?.username ?? (showDebateRecord ? "debater" : "student");
  const avatarUrl = user?.avatarUrl ?? user?.image ?? session?.user?.avatarUrl ?? null;
  // Real values from the DB (a new account is 0 / BRONZE). Never substitute sample numbers for real users.
  const xp = user?.xp ?? 0;
  const streak = user?.streak ?? 0;
  const wins = user?.wins ?? 0;
  const rank = user?.rank ?? "BRONZE";
  const practiceAverage = practiceAverageFromTests(recentTests);
  const weakAreas = weakAreasForTrack(recentTests, activeOrg);
  // Demo sample mastery points are Debate skill names; a seeded demo account sees them under Debate only.
  const masteryData: MasteryPoint[] = demo && showDebateRecord ? demoSampleMastery : [];
  // Weak areas are real (from graded tests); we show their NAMES only — no invented percentages.
  // Demo accounts may show sample numbers (allowed for seeded demo data only).
  // Demo sample rows are Debate skill names; they are shown to a seeded demo account under Debate only.
  const recommendedRows: ReadonlyArray<readonly [string, number | null]> =
    weakAreas.length > 0 ? weakAreas.map((area) => [area, null] as const) : demo && showDebateRecord ? demoSampleLessons : [];
  // Internal difficulty heuristic ONLY (bot matching). Never displayed as a rating or progress claim.
  const recommendedBot = nearestAiPersona(calculateDebateRating({ xp, wins, judgedDebates: judgedDebateCount }));

  // Track-aware quick actions + resources: honor the selected track (preference cookie) so Model UN /
  // General Debate never see DECA/HOSA exam actions or another org's resource shelf. (activeTrack was
  // resolved above so weak-area recommendations are track-scoped.)
  const nextSteps = nextStepsForTrack(activeTrack);

  // Students join/leave coach teams from the dashboard. Coaches/admins manage teams on /coach.
  const role = session?.user?.role;
  const studentTeamRows = role === "STUDENT" && session?.user?.id ? await getStudentTeams(session.user.id) : [];
  const assignments = role === "STUDENT" && session?.user?.id ? await getStudentAssignments(session.user.id) : [];
  // Recovery: debates the student left mid-session (never submitted or scored).
  // Only surface unfinished sessions that match the selected track — never invite the user to resume
  // an unrelated track's session. Legacy/inconsistent records (a track org carrying a parliamentary
  // config) are NOT recommended as valid continuations; they remain visible under /debates/history.
  // All sessions stay intact in history. Card metadata is user-facing (org + eventType), never the
  // carrier DebateFormat enum or an opponent persona for solo practice.
  const unfinishedDebates: ResumeDebate[] =
    role === "STUDENT" && session?.user?.id
      ? (await getStudentDebates(session.user.id))
          .filter((debate) => isUnfinished(debate.status))
          .filter((debate) => trackAllowsOrganization(activeTrack, debate.organization))
          .filter((debate) => !isLegacyPracticeRecord(debate))
          .slice(0, 4)
          .map((debate) => {
            const showOpponent = showsOpponentMeta(debate);
            return {
              id: debate.id,
              topic: debate.topic,
              trackLabel: trackByOrganization(debate.organization)?.label ?? debate.organization,
              // An unfinished guided round is named as what it is; Continue reopens it as guided because
            // the arena reads guided-ness from the stored round (lib/guided-rounds.ts).
            typeLabel: debate.practiceMode === "LESSON" ? `${GUIDED_ROUND_LABEL} · ${practiceTypeLabel(debate)}` : practiceTypeLabel(debate),
              showOpponent,
              sideLabel: showOpponent ? sideLabel(debate.studentSide) : "",
              opponentLabel: showOpponent ? debate.aiPersona ?? "AI opponent" : "",
              statusLabel: debate.status === "ACTIVE" ? "In progress" : "Not started",
              updatedIso: debate.updatedAt.toISOString()
            };
          })
      : [];
  // Real signals for the learning path (no fabricated progress).
  // Under DECA/HOSA the learning-path state is decided by THAT track's activity only; XP and the
  // judged/guided counts are account-wide and would call a learner "active" on Debate rounds.
  const hasActivity = showDebateRecord
    ? (xp ?? 0) > 0 || recentTests.length > 0 || judgedDebateCount > 0 || guidedExerciseCount > 0
    : recentTests.length > 0 || (trackRecord?.recordedSkills ?? 0) > 0;
  const pendingAssignment = assignments.some((assignment) => statusForSubmission(assignment.submissions[0]) !== "COMPLETED");
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
      {unfinishedDebates.length > 0 ? (
        <ResumeDebatesCard debates={unfinishedDebates} isPractice={Boolean(activeTrack && activeTrack.id !== "GENERAL_DEBATE")} />
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Student dashboard</Badge>
            <Badge variant="outline">{rank.replace("_", " ")} rank</Badge>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <UserAvatar username={username} displayName={fullDisplayName} avatarUrl={avatarUrl} size="lg" />
            <div>
              <h1 className="page-title">Welcome back, {displayName}</h1>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">@{username}</p>
            </div>
          </div>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Your training loop is ready: one speaking rep, one test set, and one targeted lesson will move the week forward.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-semibold text-muted-foreground">Today</p>
              <p className="mt-1 font-semibold">Finish one focused rep</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-semibold text-muted-foreground">Weak skill</p>
              <p className="mt-1 font-semibold">
                {weakAreas[0] ?? (trackHasPracticeTests(activeTrack?.id) && activeTrack ? (trackRecord && trackRecord.testsCompleted > 0 ? "None flagged in recent tests" : "No test taken yet") : "Not started yet")}
              </p>
            </div>
            {showDebateRecord ? (
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground">Recommended bot</p>
                <p className="mt-1 font-semibold">{recommendedBot.name}</p>
              </div>
            ) : (
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground">Practice room</p>
                <p className="mt-1 font-semibold">{activeTrack?.id === "DECA" ? "DECA role-play setup" : `${activeTrack?.label} event practice`}</p>
              </div>
            )}
          </div>
        </div>
        <XpProgressCard xp={xp} rank={rank} streak={streak} trackId={activeTrack?.id} />
      </div>

      {/* M15 S1A A3b-2: the historical wins counter is no longer shown on this card. A3a stopped the
          judge route incrementing it, so it is frozen for every account from here on. The average is
          real — it aggregates stored ballot scores — but formative, so it is named as a practice
          ballot score, matching the ballot itself. User.wins is untouched in the database. */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {showDebateRecord ? (
          <StatCard
            label="Judged rounds"
            value={String(judgedDebateCount)}
            detail={`Avg practice ballot score (current scoring) ${avgJudgeScore ?? "—"}.${
              guidedExerciseCount > 0 ? ` ${guidedExerciseCount} guided ${guidedExerciseCount === 1 ? "exercise" : "exercises"} completed, not counted here.` : ""
            }`}
            icon={Trophy}
          />
        ) : (
          <StatCard
            label="Practice tests completed"
            value={String(trackRecord?.testsCompleted ?? 0)}
            detail={`${activeTrack?.short} practice tests you have finished, all time.`}
            icon={ClipboardList}
          />
        )}
        {/* Capability-neutral, and true for every track. These named "generated practice tests" and
            "graded tests" to a learner of any track, including one whose track has no test product,
            and the XP line also named lessons — which award no XP at all (the only writers of this
            counter are the Debate judge route and the PracticeTest grade route). "Scored" is the
            honest umbrella: it covers a judged round and a graded set, and promises neither. */}
        <StatCard label="XP" value={String(xp)} detail={showDebateRecord ? "Earn XP from scored training in your track." : "Earn XP from scored training — counted across all your tracks."} icon={Medal} />
        <StatCard label="Practice sessions" value={String(streak)} detail={showDebateRecord ? "Scored training in your track, counted as it happens." : "Scored activities across all your tracks, counted as they happen — not only this track."} icon={Flame} />
        {trackHasPracticeTests(activeTrack?.id) && activeTrack ? (
          <StatCard
            label="Practice average"
            value={practiceAverage === null ? "—" : `${practiceAverage}%`}
            detail={practiceAverage === null ? `No completed ${activeTrack.short} practice tests yet — nothing to average.` : `Mean score across your recent ${activeTrack.short} practice tests.`}
            icon={Target}
          />
        ) : null}
      </div>

      <LearningPath weakAreas={weakAreas} hasActivity={hasActivity} pendingAssignment={pendingAssignment} />

      {role === "STUDENT" ? <JoinTeamCard teams={studentTeams} /> : null}

      {role === "STUDENT" ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle as="h2">Assigned Work</CardTitle>
              <Link href={"/assignments" as Route} className={buttonVariants({ variant: "outline", size: "sm" })}>
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignments.length > 0 ? (
              assignments.slice(0, 3).map((assignment) => {
                const status = statusForSubmission(assignment.submissions[0]);
                return (
                  <Link
                    key={assignment.id}
                    href={`/assignments/${assignment.id}` as Route}
                    className="flex flex-col gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      <span className="font-semibold">{assignment.title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {assignmentTypeLabel(assignment.type)} · {assignment.team.name}
                      </span>
                    </span>
                    <Badge variant={status === "COMPLETED" ? "secondary" : status === "IN_PROGRESS" ? "accent" : "outline"}>
                      {assignmentStatusLabel(status)}
                    </Badge>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">No assignments yet.</p>
                <p className="mt-1">When a coach assigns work to one of your teams, it will show up here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {showDebateRecord ? (
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline">Debate record</Badge>
              <h2 className="mt-3 text-xl font-bold">
                {judgedDebateCount > 0 ? `${judgedDebateCount} judged ${judgedDebateCount === 1 ? "round" : "rounds"}` : "No judged rounds yet"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {judgedDebateCount > 0
                  ? "Every number here comes from real judged rounds — quality ballots matter more than long vague speeches."
                  : "Finish a debate and get it judged — your record starts with the first real ballot."}
              </p>
            </div>
            <div className="rounded-md border bg-background px-3 py-2 text-sm font-semibold">
              {judgedDebateCount} judged {judgedDebateCount === 1 ? "round" : "rounds"} · avg practice ballot score (current scoring){" "}
              {avgJudgeScore ?? "—"}
            </div>
          </div>
        </CardContent>
      </Card>
      ) : activeTrack ? (
      <Card>
        <CardContent className="p-5">
          <Badge variant="outline">{activeTrack.label} record</Badge>
          <h2 className="mt-3 text-xl font-bold">
            {trackRecord && trackRecord.testsCompleted > 0
              ? `${trackRecord.testsCompleted} ${activeTrack.short} practice ${trackRecord.testsCompleted === 1 ? "test" : "tests"} completed`
              : `No ${activeTrack.short} practice tests completed yet`}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {activeTrack.id === "DECA"
              ? `Every number here comes from your own DECA practice tests${trackRecord && trackRecord.recordedSkills > 0 ? ` and ${trackRecord.recordedSkills} ${trackRecord.recordedSkills === 1 ? "skill" : "skills"} with a recorded drill result` : ""}. DECA role-plays aren't saved yet, so they are not counted anywhere.`
              : `Every number here comes from your own ${activeTrack.short} practice tests. Medical Terminology practice isn't listed here yet.`}
          </p>
        </CardContent>
      </Card>
      ) : null}

      <div className={`grid gap-4 ${nextSteps.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {nextSteps.map((action) => (
          <NextStepCard
            key={action.key}
            title={action.title}
            description={action.description}
            href={action.href as Route}
            icon={ACTION_ICON[action.key]}
            tone={ACTION_TONE[action.key]}
          />
        ))}
      </div>

      <CoachNextActionCard />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <MasteryChart
          data={masteryData}
          emptyDescription={showDebateRecord ? undefined : `Complete a ${activeTrack?.short} practice test or a drill that records to start charting growth.`}
        />
        <Card>
          <CardHeader>
            <CardTitle as="h2">{showDebateRecord ? "Recommended Lessons" : `Weak areas from your ${activeTrack?.short} tests`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendedRows.length > 0 ? (
              recommendedRows.map(([lesson, value]) => (
                <div key={lesson.toString()} className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{lesson}</span>
                    {/* A number renders only for seeded demo data; real weak areas show the NAME only —
                        no invented percentages. */}
                    {typeof value === "number" ? <span className="text-muted-foreground">{value}%</span> : null}
                  </div>
                  {typeof value === "number" ? <Progress value={value} className="mt-3" /> : null}
                </div>
              ))
            ) : (
              <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Start here</p>
                <p className="mt-1">
                  {showDebateRecord
                    ? "Complete a debate, lesson, or practice test and your recommended lessons will appear with real progress."
                    : `The areas the grader flags on your recent ${activeTrack?.short} practice tests appear here — named, never scored.`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* C5B1: no cross-track fallback tags. Scope strictly to the resolved track (fail-closed when
          unresolved); only the learner's real weak areas refine it. */}
      <RecommendedVideos
        organization={resourceOrgForTrack(activeTrack)}
        skillTags={weakAreas.length > 0 ? weakAreas : undefined}
        title="Recommended video resources"
      />

      {recentTests.length === 0 && trackHasPracticeTests(activeTrack?.id) ? (
        <EmptyState
          icon={ClipboardList}
          title="No completed practice tests yet"
          description={activeTrack ? `Generate a ${activeTrack.short} test to unlock score history, weak-area detection, and recommended lessons.` : "Generate a DECA or HOSA test to unlock score history, weak-skill detection, and recommended lessons."}
          actionLabel="Create first test"
          actionHref={activeTrack ? `/tests?track=${activeTrack.slug}` : "/tests"}
        />
      ) : null}
    </div>
  );
}
