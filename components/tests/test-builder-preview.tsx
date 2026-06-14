import { ClipboardCheck, FileQuestion, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TestBuilderPreview() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Practice Exam Generator</CardTitle>
          <Badge variant="secondary">Original questions only</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {["10 Questions", "25 Questions", "50 Questions"].map((count) => (
            <div key={count} className="rounded-lg border bg-background p-4">
              <FileQuestion className="h-5 w-5 text-primary" aria-hidden />
              <h3 className="mt-3 font-semibold">{count}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Beginner, Intermediate, or Elite mode.</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2 font-semibold">
              <ClipboardCheck className="h-5 w-5 text-accent" aria-hidden />
              After test
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Score, explanations, weak areas, and recommended lessons are stored for analytics.
            </p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-5 w-5 text-secondary" aria-hidden />
              AI generation
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The API route uses OpenAI to generate original DECA and HOSA questions.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
