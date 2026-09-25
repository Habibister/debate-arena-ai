import { ClipboardCheck, FileQuestion, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * `organization` is the SAME locked organization that locks the generator above this card. It only
 * narrows the copy: this component renders no control and posts nothing.
 */
export function TestBuilderPreview({ organization }: { organization?: "DECA" | "HOSA" }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle as="h2">Practice Exam Generator</CardTitle>
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
              {organization === "HOSA" ? "Where the questions come from" : "AI generation"}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {/* Track-scoped like the header above it. The provider is deliberately not named here:
                  this line claimed OpenAI, which is not what the generation chain runs, and a page
                  cannot state a provider it does not select.
                  H3: HOSA no longer generates anything. Its one testable category is drawn from
                  CompeteReady's authored Medical Terminology bank, so calling that "AI generation"
                  would invert the truth — the questions are written and reviewed by people, and the
                  pool is fixed rather than composed fresh for each set. */}
              {organization === "HOSA"
                ? "Medical Terminology sets are drawn from CompeteReady's own authored question bank — written and reviewed by people, not generated. The pool is fixed, so sets will repeat questions as you take more of them."
                : `The API route generates original ${organization ?? "DECA and HOSA"} questions.`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
