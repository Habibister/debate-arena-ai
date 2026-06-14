import { TestBuilderPreview } from "@/components/tests/test-builder-preview";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary">DECA and HOSA</Badge>
        <h1 className="mt-3 text-3xl font-bold">Practice tests</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Generate original questions inspired by competition standards, score attempts, explain answers, and route weak areas back into lessons.
        </p>
      </div>

      <TestBuilderPreview />

      <Card>
        <CardHeader>
          <CardTitle>Performance summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm font-semibold text-muted-foreground">Last score</p>
            <p className="mt-2 text-3xl font-bold">80%</p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm font-semibold text-muted-foreground">Weak areas</p>
            <p className="mt-2 font-semibold">Pricing strategy, promotion metrics</p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm font-semibold text-muted-foreground">Recommended lesson</p>
            <p className="mt-2 font-semibold">Marketing metrics</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
