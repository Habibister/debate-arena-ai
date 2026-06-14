import { Activity, Brain, Medal, MessageSquareText, Sparkles, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const scoreRows = [
  { label: "Logic", value: 88 },
  { label: "Evidence", value: 76 },
  { label: "Rebuttal", value: 82 }
];

export function HeroArena() {
  return (
    <div className="arena-grid relative overflow-hidden rounded-lg border bg-card shadow-soft">
      <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b bg-background/80 p-5 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="accent">Live AI Round</Badge>
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Timer className="h-3.5 w-3.5" aria-hidden />
              Round 2
            </span>
          </div>
          <h3 className="mt-5 text-xl font-bold">Resolved: AI tutors should be allowed in tournament preparation.</h3>
          <div className="mt-5 space-y-3">
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquareText className="h-4 w-4 text-primary" aria-hidden />
                Student
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Access expands practice quality, especially for schools without full coaching staffs.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Brain className="h-4 w-4 text-secondary" aria-hidden />
                AI Opponent
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Equity depends on transparent limits and source literacy, not unlimited automation.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">AI Judge Preview</p>
              <p className="text-3xl font-bold">84</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Medal className="h-6 w-6" aria-hidden />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {scoreRows.map((row) => (
              <div key={row.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold">{row.label}</span>
                  <span className="text-muted-foreground">{row.value}%</span>
                </div>
                <Progress value={row.value} />
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-background p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-accent" aria-hidden />
                Recommendation
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Drill evidence weighing before elite rounds.</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4 text-secondary" aria-hidden />
                Readiness
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Intermediate ready, elite in 3 milestones.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
