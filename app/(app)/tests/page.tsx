import { TestBuilderPreview } from "@/components/tests/test-builder-preview";
import { PracticeTestGenerator } from "@/components/tests/practice-test-generator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EVENT_OPTIONS } from "@/lib/rubrics";

export default function TestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary">DECA and HOSA</Badge>
        <h1 className="mt-3 text-3xl font-bold">Practice tests</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Generate original questions by DECA event cluster or HOSA event category, score attempts, explain mistakes, and route weak areas back into lessons.
        </p>
      </div>

      <PracticeTestGenerator />

      <TestBuilderPreview />

      <Card>
        <CardHeader>
          <CardTitle>Supported test tracks</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm font-semibold text-muted-foreground">DECA</p>
            <p className="mt-2 font-semibold">{EVENT_OPTIONS.DECA.map((event) => event.label).join(", ")}</p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm font-semibold text-muted-foreground">HOSA</p>
            <p className="mt-2 font-semibold">{EVENT_OPTIONS.HOSA.map((event) => event.label).join(", ")}</p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm font-semibold text-muted-foreground">After grading</p>
            <p className="mt-2 font-semibold">Score, explanations, weak areas, recommended lessons</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
