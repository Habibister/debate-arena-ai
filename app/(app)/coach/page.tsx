import { TeamTable } from "@/components/coach/team-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CoachPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary">Coach Dashboard</Badge>
        <h1 className="mt-3 text-3xl font-bold">Manage teams and assignments</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Coaches can create teams, track students, assign lessons, review debates, and inspect growth analytics.
        </p>
      </div>

      <TeamTable />

      <Card>
        <CardHeader>
          <CardTitle>Coach analytics model</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          {["Skill growth", "Debate history", "Practice tests", "Readiness"].map((item) => (
            <div key={item} className="rounded-lg border bg-background p-4 font-semibold">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
