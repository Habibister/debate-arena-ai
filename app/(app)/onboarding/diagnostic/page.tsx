import { DiagnosticForm } from "@/components/onboarding/diagnostic-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Quick diagnostic" };

export default function DiagnosticPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        badges={<Badge variant="secondary">Get started</Badge>}
        heading={<h1 className="page-title">Quick diagnostic</h1>}
        description={
          <p>
            A 2-minute check so we can suggest a personalized training path. This asks about your goals and learning
            preferences — not any medical or learning condition. You can skip it and return anytime.
          </p>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle as="h2">Tell us about your training</CardTitle>
        </CardHeader>
        <CardContent>
          <DiagnosticForm />
        </CardContent>
      </Card>
    </div>
  );
}
