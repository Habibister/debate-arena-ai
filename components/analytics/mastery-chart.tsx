import { Target, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import type { MasteryPoint } from "@/types/domain";

const fallbackData: MasteryPoint[] = [
  { skill: "Logic", mastery: 84, trend: "up" },
  { skill: "Evidence", mastery: 68, trend: "up" },
  { skill: "Rebuttal", mastery: 72, trend: "flat" },
  { skill: "Clarity", mastery: 91, trend: "up" },
  { skill: "Cross Exam", mastery: 57, trend: "down" }
];

export function MasteryChart({ data = fallbackData }: { data?: MasteryPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Skill Growth</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <EmptyState icon={Target} title="No mastery data yet" description="Complete a debate, lesson, or practice test to start charting growth." className="min-h-40" />
        ) : null}
        {data.map((point) => (
          <div key={point.skill}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">{point.skill}</span>
              <span className="flex items-center gap-1 text-muted-foreground">
                {point.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-accent" aria-hidden />
                ) : point.trend === "down" ? (
                  <TrendingDown className="h-4 w-4 text-destructive" aria-hidden />
                ) : null}
                {point.mastery}%
              </span>
            </div>
            <Progress value={point.mastery} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
