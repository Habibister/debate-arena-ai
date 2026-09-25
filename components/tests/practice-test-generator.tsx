"use client";

import { useMemo, useState, type ReactNode } from "react";
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
import { testableCategories, testableEventTypes, untestableCategories } from "@/lib/test-availability";
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
export function PracticeTestGenerator({
  lockedOrganization,
  officialFormat,
  officialClaims,
  officialEventTypes
}: {
  lockedOrganization?: TestingOrganization;
  officialFormat?: OfficialTestFormatProps | null;
  /** The source banner and rubric for `officialFormat`'s event, rendered only while it is selected. */
  officialClaims?: ReactNode;
  /** The practice event types that specification honestly describes. Empty means it describes none. */
  officialEventTypes?: readonly string[];
}) {
  const router = useRouter();
  const initialOrg: TestingOrganization = lockedOrganization ?? "DECA";
  const [organization, setOrganization] = useState<TestingOrganization>(initialOrg);
  // H3: the first SERVABLE option, not the first option in the registry. Model UN is retired, HOSA's
  // Prepared Speaking is not assessed by a written test, and fifteen HOSA categories have no question
  // source — none of them may be the state this form opens in.
  const [eventType, setEventType] = useState(testableEventTypes(initialOrg)[0]?.value ?? "");
  const [eventCluster, setEventCluster] = useState(testableCategories(initialOrg)[0] ?? "");
  const [difficulty, setDifficulty] = useState<Level>("BEGINNER");
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);
  const [useOfficial, setUseOfficial] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const events = useMemo(() => testableEventTypes(organization), [organization]);
  const clusters = useMemo(() => testableCategories(organization), [organization]);
  // Named rather than silently dropped: a learner who expected one of these should learn that we have
  // no questions for it yet, not that it stopped existing.
  const notYetTestable = useMemo(() => untestableCategories(organization), [organization]);
  const canGenerate = events.length > 0 && clusters.length > 0;
  // H3. Difficulty changes the questions only where something reads it. HOSA's Medical Terminology set
  // is drawn from one authored bank that carries no level, so offering three levels there would be a
  // control that alters nothing while its value is still stored on the row and read back as a property
  // of the attempt. It is stated instead of offered.
  const difficultyAffectsQuestions = organization !== "HOSA";
  const generationProgress = isLoading ? 66 : 0;

  function updateOrganization(nextOrganization: TestingOrganization) {
    if (lockedOrganization) {
      return; // organization is pinned to the selected track
    }
    setOrganization(nextOrganization);
    setEventType(testableEventTypes(nextOrganization)[0]?.value ?? "");
    setEventCluster(testableCategories(nextOrganization)[0] ?? "");
  }

  // HOSA H2 — AN OFFICIAL CLAIM BELONGS TO ONE EVENT.
  // `officialFormat` is the registry's spec for the organization, and for HOSA that spec describes
  // Medical Terminology and nothing else. It may only speak while the learner has that event
  // selected: the fifteen other categories have no official specification, so borrowing this one's
  // question count, timer, rubric or verification date would attribute a real document to material it
  // never described. The event name is matched against the selection rather than assumed.
  // BOTH selectors name an event, so both must agree. The category has to be the event the spec
  // describes, AND the event type has to be one the spec honestly maps from — HOSA's maps from
  // HEALTH_SCIENCE_EVENT alone, so a set labelled Prepared Speaking never inherits a 50-item written
  // format, its rubric or its verification date, whatever category is chosen beside it.
  const officialAppliesToSelection = Boolean(
    officialFormat &&
      eventCluster === officialFormat.eventName &&
      (officialEventTypes ?? []).includes(eventType)
  );
  const officialAvailable = Boolean(
    officialFormat && officialAppliesToSelection && [10, 25, 50, 100].includes(officialFormat.questionCount)
  );
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
            <CardTitle as="h2">Generate Original Practice Test</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a track, focus area, and difficulty. Then jump into original practice inspired by public event guidance and classroom standards.
            </p>
          </div>
          <Badge variant="secondary">Original questions only</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* H3: for HOSA nothing is being generated — the set is drawn from an authored bank — so the
            progress copy follows the source rather than describing a generation that is not happening. */}
        {isLoading ? (
          <LoadingState
            title={organization === "HOSA" ? "Building your practice set" : "Generating your practice set"}
            description={
              organization === "HOSA"
                ? "Drawing questions from CompeteReady's authored Medical Terminology bank."
                : "Creating original questions, answer choices, explanations, and skill tags."
            }
          />
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

        {/* The official source, rubric and point total for the one event they describe — on screen
            only while that event is the selection. Every other category shows what it actually is
            below: CompeteReady-authored practice with no official specification attached. Neither
            statement says the category is not a real event, or that unverified means wrong. */}
        {officialClaims && officialAppliesToSelection ? <div className="space-y-3">{officialClaims}</div> : null}
        {officialClaims && officialFormat && !officialAppliesToSelection ? (
          <p className="rounded-md border bg-background p-3 text-xs leading-6 text-muted-foreground">
            Original CompeteReady practice questions for {eventCluster}. No event-specific official specification
            is attached to this category in our record, so nothing here is presented as {organization}&apos;s
            official format or scoring. The {officialFormat.eventName} specification we do hold describes that
            event only, and appears when you select it.
          </p>
        ) : null}

        <div>
          <p className="mb-3 text-sm font-semibold">{organization === "DECA" ? "Event cluster" : "Event category"}</p>
          {notYetTestable.length > 0 ? (
            // H3. These categories used to be offered and served with template questions — four
            // recycled stems and one set of wrong answers shared by every category. They are named
            // here instead, so the gap is visible as ours rather than presented as coverage.
            <p className="mb-3 text-xs leading-6 text-muted-foreground">
              Practice tests are available for {clusters.join(", ")} only. We do not have questions written
              for {notYetTestable.join(", ")} yet, so they are not offered rather than filled with generic
              ones.
            </p>
          ) : null}
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
            {!difficultyAffectsQuestions ? (
              <p className="mb-3 text-xs leading-6 text-muted-foreground">
                Medical Terminology questions come from one authored bank that is not graded by level, so
                there is no difficulty setting to choose here.
              </p>
            ) : null}
            <div className={cn("grid gap-2 sm:grid-cols-3", !difficultyAffectsQuestions && "hidden")}>
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

        {/* H3. With no servable event type or category there is nothing to generate, and the button
            must not offer to. The API refuses the same selection, so this is the courtesy, not the gate. */}
        {!canGenerate ? (
          <p className="rounded-md border bg-background p-3 text-sm leading-6 text-muted-foreground">
            Practice tests are not available for this track yet.
          </p>
        ) : null}
        <Button type="button" size="lg" onClick={onGenerate} disabled={isLoading || !canGenerate} className="w-full">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Sparkles className="h-5 w-5" aria-hidden />}
          Generate test
        </Button>

        <div className="flex gap-3 rounded-lg border bg-background p-4 text-sm leading-6 text-muted-foreground">
          <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          {/* This follows `organization` — the generator's own state, which is what a Generate press
              actually posts — not the page's lock. So it names the test the learner is about to make,
              including on the unlocked path where they can still switch: the sentence changes with the
              selector. It is therefore always exactly one organization, never both. The claim itself
              (these are not official tests, questions are original) is unchanged. */}
          These are not official {organization} tests. Questions are original prompts by{" "}
          {organization === "HOSA" ? "event category" : "event cluster"} and difficulty, designed to practice public
          guideline-style skills without copying protected past exams.
        </div>
      </CardContent>
    </Card>
  );
}
