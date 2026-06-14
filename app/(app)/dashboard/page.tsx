import { Flame, Medal, Target, Trophy } from "lucide-react";
import { MasteryChart } from "@/components/analytics/mastery-chart";
import { StatCard } from "@/components/app/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary">Student dashboard</Badge>
          <h1 className="mt-3 text-3xl font-bold">Welcome back, Alex</h1>
          <p className="mt-2 text-muted-foreground">Your next milestone is Elite readiness in rebuttal and evidence weighing.</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 text-sm font-semibold">Silver Rank</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="XP" value="375" detail="125 XP until Gold readiness track." icon={Medal} />
        <StatCard label="Streak" value="8 days" detail="Complete one drill today to keep it alive." icon={Flame} />
        <StatCard label="Wins" value="12" detail="Win rate is trending up across beginner rounds." icon={Trophy} />
        <StatCard label="Mastery" value="71%" detail="Strong clarity, improving evidence depth." icon={Target} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <MasteryChart />
        <Card>
          <CardHeader>
            <CardTitle>Recommended Lessons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ["Evidence weighing", 68],
              ["Cross examination setup", 57],
              ["Rebuttal collapse", 72]
            ].map(([lesson, value]) => (
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
    </div>
  );
}
