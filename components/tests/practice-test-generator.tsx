"use client";

import { useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { Level } from "@prisma/client";
import { ClipboardList, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEVELS } from "@/lib/constants";
import { EVENT_OPTIONS } from "@/lib/rubrics";
import { testingClustersForOrganization } from "@/lib/testing";
import { cn } from "@/lib/utils";

type TestingOrganization = "DECA" | "HOSA";
type QuestionCount = 10 | 25 | 50;

type CreatedTestResponse = {
  test: {
    id: string;
  };
};

async function createPracticeTest(input: {
  organization: TestingOrganization;
  eventType: string;
  eventCluster: string;
  difficulty: Level;
  questionCount: QuestionCount;
}) {
  const response = await fetch("/api/tests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  const payload = (await response.json()) as CreatedTestResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to generate practice test.");
  }

  return payload.test;
}

export function PracticeTestGenerator() {
  const router = useRouter();
  const [organization, setOrganization] = useState<TestingOrganization>("DECA");
  const [eventType, setEventType] = useState(EVENT_OPTIONS.DECA[0].value);
  const [eventCluster, setEventCluster] = useState(testingClustersForOrganization("DECA")[0]);
  const [difficulty, setDifficulty] = useState<Level>("BEGINNER");
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const events = EVENT_OPTIONS[organization];
  const clusters = useMemo(() => testingClustersForOrganization(organization), [organization]);

  function updateOrganization(nextOrganization: TestingOrganization) {
    setOrganization(nextOrganization);
    setEventType(EVENT_OPTIONS[nextOrganization][0].value);
    setEventCluster(testingClustersForOrganization(nextOrganization)[0]);
  }

  async function onGenerate() {
    setIsLoading(true);
    setError(null);

    try {
      const test = await createPracticeTest({
        organization,
        eventType,
        eventCluster,
        difficulty,
        questionCount
      });
      router.push(`/tests/${test.id}` as Route);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate practice test.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Generate Original Practice Test</CardTitle>
          <Badge variant="secondary">AI-generated questions only</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-3 text-sm font-semibold">Organization</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["DECA", "HOSA"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => updateOrganization(item)}
                className={cn(
                  "focus-ring rounded-md border p-4 text-left transition-colors",
                  organization === item ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                )}
              >
                <span className="font-semibold">{item}</span>
                <span className={cn("mt-1 block text-sm", organization === item ? "text-primary-foreground/85" : "text-muted-foreground")}>
                  {item === "DECA" ? "Business roleplays, cases, and cluster exams." : "Health science, event knowledge, and scenario exams."}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold">Event type</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {events.map((event) => (
              <button
                key={event.value}
                type="button"
                onClick={() => setEventType(event.value)}
                className={cn(
                  "focus-ring rounded-md border p-4 text-left transition-colors",
                  eventType === event.value ? "border-secondary bg-secondary text-secondary-foreground" : "bg-background hover:bg-muted"
                )}
              >
                <span className="font-semibold">{event.label}</span>
                <span className={cn("mt-1 block text-sm", eventType === event.value ? "text-secondary-foreground/85" : "text-muted-foreground")}>
                  {event.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold">{organization === "DECA" ? "Event cluster" : "Event category"}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {clusters.map((cluster) => (
              <button
                key={cluster}
                type="button"
                onClick={() => setEventCluster(cluster)}
                className={cn(
                  "focus-ring rounded-md border px-3 py-2 text-left text-sm font-semibold transition-colors",
                  eventCluster === cluster ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                )}
              >
                {cluster}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold">Difficulty</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setDifficulty(level.value)}
                  className={cn(
                    "focus-ring rounded-md border px-3 py-2 text-left text-sm font-semibold transition-colors",
                    difficulty === level.value ? "border-secondary bg-secondary text-secondary-foreground" : "bg-background hover:bg-muted"
                  )}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold">Question count</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {([10, 25, 50] as const).map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setQuestionCount(count)}
                  className={cn(
                    "focus-ring rounded-md border px-3 py-2 text-left text-sm font-semibold transition-colors",
                    questionCount === count ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                  )}
                >
                  {count} questions
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p> : null}

        <Button type="button" size="lg" onClick={onGenerate} disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Sparkles className="h-5 w-5" aria-hidden />}
          Generate test
        </Button>

        <div className="flex gap-3 rounded-lg border bg-background p-4 text-sm leading-6 text-muted-foreground">
          <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          Questions are generated from original prompts by event cluster/category and difficulty. The app does not copy protected past exams.
        </div>
      </CardContent>
    </Card>
  );
}
