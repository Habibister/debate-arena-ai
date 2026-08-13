import { Medal, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RANK_THRESHOLDS } from "@/lib/constants";

type XpProgressCardProps = {
  xp: number;
  rank: string;
  streak: number;
};

function getNextRank(xp: number) {
  return RANK_THRESHOLDS.find((item) => item.minXp > xp) ?? null;
}

export function XpProgressCard({ xp, rank, streak }: XpProgressCardProps) {
  const nextRank = getNextRank(xp);
  const previousRank = [...RANK_THRESHOLDS].reverse().find((item) => item.minXp <= xp) ?? RANK_THRESHOLDS[0];
  const progress = nextRank
    ? Math.round(((xp - previousRank.minXp) / Math.max(nextRank.minXp - previousRank.minXp, 1)) * 100)
    : 100;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Current rank</p>
            <p className="mt-2 text-3xl font-bold">{rank.replace("_", " ")}</p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Medal className="h-5 w-5" aria-hidden />
          </span>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold">{xp} XP</span>
            <span className="text-muted-foreground">{nextRank ? `${nextRank.minXp - xp} to ${nextRank.rank}` : "Max rank"}</span>
          </div>
          <Progress value={progress} />
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-accent" aria-hidden />
          {/* M15 S1A A4b — this said "debates, tests, and lessons" and "Complete a debate, test, or
              lesson". Lessons contribute nothing: they award no XP and never touch this counter,
              whose only two writers are the Debate judge route and the PracticeTest grade route.
              Naming lessons here promised a learner that finishing one would move a number it cannot
              move. The `streak` prop keeps its legacy schema name but holds a LIFETIME count of
              completed practice sessions, not a streak — so the copy says sessions, never days. */}
          {streak > 0
            ? `${streak} practice ${streak === 1 ? "session" : "sessions"} completed — debates and graded tests.`
            : "Complete a debate or a practice test to start your record."}
        </div>
      </CardContent>
    </Card>
  );
}
