"use client";

import { useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { Level } from "@prisma/client";
import { CircleAlert, ClipboardList, Loader2, Sparkles, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { Progress } from "@/components/ui/progress";
import { LEVELS } from "@/lib/constants";
import { EVENT_OPTIONS } from "@/lib/rubrics";
import { testingClustersForOrganization } from "@/lib/testing";
import { cn } from "@/lib/utils";

type TestingOrganization = "DECA" | "HOSA";

export type OfficialTestFormatProps = {
  questionCount: number;
  minutes: number;
  eventName: string;
  season: string;
  verificationStatus: string;
};
type QuestionCount = 10 | 25 | 50 | 100;

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

  const payload = (await response.json().catch(() => ({}))) as CreatedTestResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "We could not generate that practice test. Please try again.");
  }

  return payload.test;
}

// `lockedOrganization` pins the generator to the selected track's organization (DECA or HOSA) so a
// HOSA user can never switch to DECA content, and vice versa. Omitted → the user may choose (used only
// on the no-track browse-all tests page).
export function PracticeTestGenerator({ lockedOrganization , officialFormat }: { lockedOrganization?: TestingOrganization ; officialFormat?: OfficialTestFormatProps | null }) {
  const router = useRouter();
  const initialOrg: TestingOrganization = lockedOrganization ?? "DECA";
  const [organization, setOrganization] = useState<TestingOrganization>(initialOrg);
  const [eventType, setEventType] = useState(EVENT_OPTIONS[initialOrg][0].value);
  const [eventCluster, setEventCluster] = useState(testingClustersForOrganization(initialOrg)[0]);
  const [difficulty, setDifficulty] = useState<Level>("BEGINNER");
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);
  const [useOfficial, setUseOfficial] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const events = EVENT_OPTIONS[organization];
  const clusters = useMemo(() => testingClustersForOrganization(organization), [organization]);
  const generationProgress = isLoading ? 66 : 0;

  function updateOrganization(nextOrganization: TestingOrganization) {
    if (lockedOrganization) {
      return; // organization is pinned to the selected track
    }
    setOrganization(nextOrganization);
    setEventType(EVENT_OPTIONS[nextOrganization][0].value);
    setEventCluster(testingClustersForOrganization(nextOrganization)[0]);
  }

  const officialAvailable = Boolean(officialFormat && [10, 25, 50, 100].includes(officialFormat.questionCount));
  const officialSelected = Boolean(officialAvailable && officialFormat && questionCount === officialFormat.questionCount && useOfficial);

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
      router.push((officialSelected && officialFormat ? `/tests/${test.id}?officialMinutes=${officialFormat.minutes}` : `/tests/${test.id}`) as Route);
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
          <div>
            <CardTitle>Generate Original Practice Test</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a track, focus area, and difficulty. Then jump into original practice inspired by public event guidance and classroom standards.
            </p>
          </div>
          <Badge variant="secondary">Original questions only</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <LoadingState title="Generating your practice set" description="Creating original questions, answer choices, explanations, and skill tags." />
        ) : null}

        {lockedOrganization ? (
          <div className="rounded-md border bg-background p-3 text-sm">
            <span className="font-semibold">Organization</span>
            <span className="ml-2 text-muted-foreground">{lockedOrganization} · matched to your selected track</span>
          </div>
        ) : (
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
                disabled={isLoading}
              >
                <span className="font-semibold">{item}</span>
                <span className={cn("mt-1 block text-sm", organization === item ? "text-primary-foreground/85" : "text-muted-foreground")}>
                  {item === "DECA" ? "Business roleplays, cases, and cluster exams." : "Health science, event knowledge, and scenario exams."}
                </span>
              </button>
            ))}
          </div>
        </div>
        )}

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
                disabled={isLoading}
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
                disabled={isLoading}
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
                  disabled={isLoading}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            {officialAvailable && officialFormat ? (
              <button
                type="button"
                onClick={() => {
                  setUseOfficial(true);
                  setQuestionCount(officialFormat.questionCount as QuestionCount);
                }}
                aria-pressed={officialSelected}
                className={cn(
                  "mb-3 block w-full rounded-md border p-3 text-left text-sm",
                  officialSelected ? "border-primary bg-primary/10" : "bg-background hover:bg-muted"
                )}
              >
                <span className="font-semibold">
                  Match official format: {officialFormat.questionCount} questions · {officialFormat.minutes}-minute timer
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Per the {officialFormat.eventName} {officialFormat.season} specification
                  {officialFormat.verificationStatus !== "VERIFIED" ? " (partially verified)" : ""}.
                </span>
              </button>
            ) : null}
            <p className="mb-3 text-sm font-semibold">Question count</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {([10, 25, 50, 100] as const).map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    setUseOfficial(false);
                    setQuestionCount(count);
                  }}
                  className={cn(
                    "focus-ring rounded-md border px-3 py-2 text-left text-sm font-semibold transition-colors",
                    questionCount === count ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                  )}
                  disabled={isLoading}
                >
                  {count === 100 ? "100-question mixed exam" : `${count} questions`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="font-semibold">Selected set</span>
            <span className="text-muted-foreground">
              {organization} · {eventCluster} · {questionCount} questions
            </span>
          </div>
          <Progress value={generationProgress} className="mt-3" />
          <div className="mt-3 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
            <Target className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            Results will map missed questions to weak skills, recommended lessons, flashcards, and next practice steps.
          </div>
        </div>

        {error ? (
          <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </div>
        ) : null}

        <Button type="button" size="lg" onClick={onGenerate} disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Sparkles className="h-5 w-5" aria-hidden />}
          Generate test
        </Button>

        <div className="flex gap-3 rounded-lg border bg-background p-4 text-sm leading-6 text-muted-foreground">
          <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          These are not official DECA or HOSA tests. Questions are original prompts by event cluster/category and difficulty, designed to practice public guideline-style skills without copying protected past exams.
        </div>
      </CardContent>
    </Card>
  );
}
