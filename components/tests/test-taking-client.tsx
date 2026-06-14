"use client";

import { useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type TestQuestion = {
  id: string;
  question: string;
  choices: unknown;
  skillTag: string;
};

type TestTakingClientProps = {
  test: {
    id: string;
    organization: string;
    eventType: string;
    eventCluster: string | null;
    difficulty: string;
    questions: TestQuestion[];
  };
};

function normalizeChoices(choices: unknown): string[] {
  if (Array.isArray(choices)) {
    return choices.map((choice) => String(choice));
  }

  return [];
}

export function TestTakingClient({ test }: TestTakingClientProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / Math.max(test.questions.length, 1)) * 100);
  const canSubmit = answeredCount === test.questions.length;

  const groupedSkills = useMemo(() => {
    return Array.from(new Set(test.questions.map((question) => question.skillTag)));
  }, [test.questions]);

  async function submitTest() {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/tests/${test.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, selectedAnswer]) => ({
            questionId,
            selectedAnswer
          }))
        })
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to grade test.");
      }

      router.push(`/tests/${test.id}/results` as Route);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to grade test.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{test.organization} Practice Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold text-muted-foreground">Event</p>
              <p className="mt-1 font-semibold">{test.eventType.replace(/_/g, " ")}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold text-muted-foreground">Focus</p>
              <p className="mt-1 font-semibold">{test.eventCluster ?? "General"}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold text-muted-foreground">Difficulty</p>
              <p className="mt-1 font-semibold">{test.difficulty.toLowerCase()}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold text-muted-foreground">Skills</p>
              <p className="mt-1 font-semibold">{groupedSkills.length}</p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">Progress</span>
              <span className="text-muted-foreground">
                {answeredCount}/{test.questions.length}
              </span>
            </div>
            <Progress value={progress} />
          </div>
        </CardContent>
      </Card>

      {test.questions.map((question, index) => {
        const choices = normalizeChoices(question.choices);
        return (
          <Card key={question.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">Question {index + 1}</CardTitle>
                <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{question.skillTag}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-7">{question.question}</p>
              <div className="mt-5 grid gap-2">
                {choices.map((choice) => {
                  const selected = answers[question.id] === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setAnswers((current) => ({ ...current, [question.id]: choice }))}
                      className={cn(
                        "focus-ring flex items-start gap-3 rounded-md border p-4 text-left text-sm transition-colors",
                        selected ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                      )}
                    >
                      <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-30")} aria-hidden />
                      <span>{choice}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p> : null}

      <div className="sticky bottom-4 z-10 rounded-lg border bg-card p-3 shadow-soft">
        <Button type="button" size="lg" className="w-full" onClick={submitTest} disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <CheckCircle2 className="h-5 w-5" aria-hidden />}
          Submit and grade
        </Button>
      </div>
    </div>
  );
}
