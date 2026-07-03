import { DiagnosticForm } from "@/components/onboarding/diagnostic-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Quick diagnostic" };

export default function DiagnosticPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Badge variant="secondary">Get started</Badge>
        <h1 className="mt-3 text-3xl font-bold">Quick diagnostic</h1>
        <p className="mt-2 text-muted-foreground">
          A 2-minute check so we can suggest a personalized training path. This asks about your goals and learning
          preferences — not any medical or learning condition. You can skip it and return anytime.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tell us about your training</CardTitle>
        </CardHeader>
        <CardContent>
          <DiagnosticForm />
        </CardContent>
      </Card>
    </div>
  );
}
