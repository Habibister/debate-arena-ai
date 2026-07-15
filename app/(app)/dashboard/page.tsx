import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { BookOpenCheck, ClipboardList, Flame, Layers3, Medal, MessageSquareText, Target, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MasteryChart } from "@/components/analytics/mastery-chart";
import { NextStepCard } from "@/components/app/next-step-card";
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
import { nearestAiPersona, ratingLabel } from "@/lib/ai-personas";
import { assignmentStatusLabel, assignmentTypeLabel, statusForSubmission } from "@/lib/assignment-types";
import { getStudentAssignments } from "@/lib/assignments";
import { getStudentDebates, isLegacyPracticeRecord, isUnfinished, practiceTypeLabel, showsOpponentMeta, sideLabel } from "@/lib/debate-history";
import { trackAllowsOrganization, trackByOrganization } from "@/lib/training-tracks";
import { getActiveTrack } from "@/lib/track-server";
import { nextStepsForTrack, resourceOrgForTrack, type DashboardAction } from "@/lib/dashboard-actions";
import { authOptions } from "@/lib/auth";
import { isDemoUser } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { getStudentTeams } from "@/lib/teams";
import { calculateDebateRating, debateRatingProgress } from "@/lib/xp";

// Icon/tone per track-aware dashboard action (data comes from nextStepsForTrack).
const ACTION_ICON: Record<DashboardAction["key"], LucideIcon> = {
  practice: MessageSquareText,
  tests: ClipboardList,
  skills: BookOpenCheck,
  study: Layers3
};
const ACTION_TONE: Record<DashboardAction["key"], "primary" | "secondary" | "accent"> = {
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

function masteryFromTests(tests: Array<{ score: number | null }>) {
  const completedScores = tests.map((test) => test.score).filter((score): score is number => typeof score === "number");

  if (completedScores.length === 0) {
    // A brand-new user has no real mastery yet — never fake it.
    return 0;
  }

  return Math.round(completedScores.reduce((total, score) => total + score, 0) / completedScores.length);
}

function latestWeakAreas(tests: Array<{ weakAreas: string[] }>) {
  return Array.from(new Set(tests.flatMap((test) => test.weakAreas))).slice(0, 3);
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  // The main dashboard is the student experience. A COACH gets the intentional Coach dashboard instead
  // of a page labeled "Student dashboard". ADMIN behavior is intentionally unchanged.
  if (session?.user?.role === "COACH") {
    redirect("/coach");
  }
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          practiceTests: {
            orderBy: { createdAt: "desc" },
            take: 5
          }
        }
      })
    : null;
  const judgedDebateCount = session?.user?.id
    ? await prisma.debate.count({
        where: {
          studentId: session.user.id,
          status: "JUDGED"
        }
      })
    : 0;

  const demo = isDemoUser(user?.email ?? session?.user?.email);
  const fullDisplayName = user?.displayName ?? user?.name ?? session?.user?.displayName ?? "Debater";
  const displayName = (user?.name ?? user?.displayName)?.split(" ")[0] ?? "there";
  const username = user?.username ?? session?.user?.username ?? "debater";
  const avatarUrl = user?.avatarUrl ?? user?.image ?? session?.user?.avatarUrl ?? null;
  // Real values from the DB (a new account is 0 / BRONZE). Never substitute sample numbers for real users.
  const xp = user?.xp ?? 0;
  const streak = user?.streak ?? 0;
  const wins = user?.wins ?? 0;
  const rank = user?.rank ?? "BRONZE";
  const recentTests = user?.practiceTests ?? [];
  const mastery = masteryFromTests(recentTests);
  const weakAreas = latestWeakAreas(recentTests);
  const masteryData: MasteryPoint[] = demo ? demoSampleMastery : [];
  const recommendedRows = weakAreas.length > 0 ? weakAreas.map((area, index) => [area, Math.max(45, 76 - index * 9)] as const) : demo ? demoSampleLessons : [];
  const debateRating = calculateDebateRating({ xp, wins, judgedDebates: judgedDebateCount });
  const debateProgress = debateRatingProgress(debateRating);
  const recommendedBot = nearestAiPersona(debateRating);

  // Track-aware quick actions + resources: honor the selected track (preference cookie) so Model UN /
  // General Debate never see DECA/HOSA exam actions or another org's resource shelf.
  const activeTrack = getActiveTrack();
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
              typeLabel: practiceTypeLabel(debate),
              showOpponent,
              sideLabel: showOpponent ? sideLabel(debate.studentSide) : "",
              opponentLabel: showOpponent ? debate.aiPersona ?? "AI opponent" : "",
              statusLabel: debate.status === "ACTIVE" ? "In progress" : "Not started",
              updatedIso: debate.updatedAt.toISOString()
            };
          })
      : [];
  // Real signals for the learning path (no fabricated progress).
  const hasActivity = (xp ?? 0) > 0 || recentTests.length > 0 || judgedDebateCount > 0;
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
              <h1 className="text-3xl font-bold sm:text-4xl">Welcome back, {displayName}</h1>
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
              <p className="mt-1 font-semibold">{weakAreas[0] ?? "Not started yet"}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-semibold text-muted-foreground">Recommended bot</p>
              <p className="mt-1 font-semibold">{recommendedBot.name}</p>
            </div>
          </div>
        </div>
        <XpProgressCard xp={xp} rank={rank} streak={streak} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Debate rating"
          value={String(debateRating)}
          detail={`${ratingLabel(debateRating)} · ${debateProgress.pointsToNext} points to next band.`}
          icon={Trophy}
        />
        <StatCard label="XP" value={String(xp)} detail="Earn XP from debates, lessons, and generated practice tests." icon={Medal} />
        <StatCard label="Streak" value={`${streak} days`} detail="Complete one drill today to keep it alive." icon={Flame} />
        <StatCard label="Mastery" value={`${mastery}%`} detail="Based on recent tests and training outcomes." icon={Target} />
      </div>

      <LearningPath weakAreas={weakAreas} hasActivity={hasActivity} pendingAssignment={pendingAssignment} />

      {role === "STUDENT" ? <JoinTeamCard teams={studentTeams} /> : null}

      {role === "STUDENT" ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Assigned Work</CardTitle>
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

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline">Competitive ladder</Badge>
              <h2 className="mt-3 text-xl font-bold">{ratingLabel(debateRating)}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                CompeteReady rating is derived from judged debates, wins, and XP. Quality ballots matter more than long vague speeches.
              </p>
            </div>
            <div className="rounded-md border bg-background px-3 py-2 text-sm font-semibold">
              {wins} wins · {judgedDebateCount} judged rounds
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">{debateProgress.currentLabel}</span>
              <span className="text-muted-foreground">
                Next: {debateProgress.nextLabel} ({debateProgress.pointsToNext} pts)
              </span>
            </div>
            <Progress value={debateProgress.percent} />
          </div>
        </CardContent>
      </Card>

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

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <MasteryChart data={masteryData} />
        <Card>
          <CardHeader>
            <CardTitle>Recommended Lessons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendedRows.length > 0 ? (
              recommendedRows.map(([lesson, value]) => (
                <div key={lesson.toString()} className="rounded-lg border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="font-semibold">{lesson}</span>
                    <span className="text-muted-foreground">{value}%</span>
                  </div>
                  <Progress value={Number(value)} />
                </div>
              ))
            ) : (
              <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Start here</p>
                <p className="mt-1">Complete a debate, lesson, or practice test and your recommended lessons will appear with real progress.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RecommendedVideos
        organization={resourceOrgForTrack(activeTrack)}
        skillTags={weakAreas.length > 0 ? weakAreas : ["Refutation", "Finance", "Medical Terminology"]}
        title="Recommended video resources"
      />

      {recentTests.length === 0 && (!activeTrack || activeTrack.id === "DECA" || activeTrack.id === "HOSA") ? (
        <EmptyState
          icon={ClipboardList}
          title="No completed practice tests yet"
          description="Generate a DECA or HOSA test to unlock score history, weak-skill detection, and recommended lessons."
          actionLabel="Create first test"
          actionHref="/tests"
        />
      ) : null}
    </div>
  );
}
