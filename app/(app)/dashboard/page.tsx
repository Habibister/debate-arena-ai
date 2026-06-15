import { getServerSession } from "next-auth";
import { BookOpenCheck, ClipboardList, Flame, Layers3, Medal, MessageSquareText, Target, Trophy } from "lucide-react";
import { MasteryChart } from "@/components/analytics/mastery-chart";
import { NextStepCard } from "@/components/app/next-step-card";
import { StatCard } from "@/components/app/stat-card";
import { XpProgressCard } from "@/components/app/xp-progress-card";
import { UserAvatar } from "@/components/profile/user-avatar";
import { RecommendedVideos } from "@/components/resources/recommended-videos";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const fallbackLessons = [
  ["Evidence weighing", 68],
  ["Cross examination setup", 57],
  ["Rebuttal collapse", 72]
] as const;

function masteryFromTests(tests: Array<{ score: number | null }>) {
  const completedScores = tests.map((test) => test.score).filter((score): score is number => typeof score === "number");

  if (completedScores.length === 0) {
    return 71;
  }

  return Math.round(completedScores.reduce((total, score) => total + score, 0) / completedScores.length);
}

function latestWeakAreas(tests: Array<{ weakAreas: string[] }>) {
  return Array.from(new Set(tests.flatMap((test) => test.weakAreas))).slice(0, 3);
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
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

  const displayName = user?.name?.split(" ")[0] ?? "Alex";
  const fullDisplayName = user?.displayName ?? user?.name ?? "Alex Rivera";
  const username = user?.username ?? session?.user?.username ?? "alex_rivera";
  const avatarUrl = user?.avatarUrl ?? user?.image ?? session?.user?.avatarUrl ?? null;
  const xp = user?.xp ?? 375;
  const streak = user?.streak ?? 8;
  const wins = user?.wins ?? 12;
  const rank = user?.rank ?? "SILVER";
  const recentTests = user?.practiceTests ?? [];
  const mastery = masteryFromTests(recentTests);
  const weakAreas = latestWeakAreas(recentTests);

  return (
    <div className="space-y-6">
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
              <p className="mt-1 font-semibold">{weakAreas[0] ?? "Evidence depth"}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-semibold text-muted-foreground">Next reward</p>
              <p className="mt-1 font-semibold">+20 XP test set</p>
            </div>
          </div>
        </div>
        <XpProgressCard xp={xp} rank={rank} streak={streak} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="XP" value={String(xp)} detail="Earn XP from debates, lessons, and generated practice tests." icon={Medal} />
        <StatCard label="Streak" value={`${streak} days`} detail="Complete one drill today to keep it alive." icon={Flame} />
        <StatCard label="Wins" value={String(wins)} detail="Win rate improves as judged rounds turn into targeted lessons." icon={Trophy} />
        <StatCard label="Mastery" value={`${mastery}%`} detail="Based on recent tests and training outcomes." icon={Target} />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <NextStepCard
          title="Start an AI round"
          description="Get a topic, speak through three turns, and receive judge feedback."
          href="/debate"
          icon={MessageSquareText}
        />
        <NextStepCard
          title="Generate a practice test"
          description="Train DECA or HOSA with original questions and explanations."
          href="/tests"
          icon={ClipboardList}
          tone="secondary"
        />
        <NextStepCard
          title="Open mastery lessons"
          description="Work through examples, guided practice, and a mastery check."
          href="/skills"
          icon={BookOpenCheck}
          tone="accent"
        />
        <NextStepCard
          title="Study weak terms"
          description="Use flashcards and video resources before your next test."
          href="/study"
          icon={Layers3}
          tone="secondary"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <MasteryChart />
        <Card>
          <CardHeader>
            <CardTitle>Recommended Lessons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(weakAreas.length > 0 ? weakAreas.map((area, index) => [area, Math.max(45, 76 - index * 9)] as const) : fallbackLessons).map(([lesson, value]) => (
              <div key={lesson.toString()} className="rounded-lg border bg-background p-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-semibold">{lesson}</span>
                  <span className="text-muted-foreground">{value}%</span>
                </div>
                <Progress value={Number(value)} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <RecommendedVideos skillTags={weakAreas.length > 0 ? weakAreas : ["Refutation", "Finance", "Medical Terminology"]} title="Recommended video resources" />

      {recentTests.length === 0 ? (
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
