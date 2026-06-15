"use client";

import { useState } from "react";
import type { Level } from "@prisma/client";
import { ArrowRight, CheckCircle2, CircleAlert, Lightbulb, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { RecommendedVideos } from "@/components/resources/recommended-videos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { getDebateSkillScenario, type DebateSkillScenario, type DebateWritingFeedback } from "@/lib/debate-skill-practice";

type DebateWritingPracticeProps = {
  slug: string;
  initialScenario: DebateSkillScenario;
};

async function gradeResponse(input: { slug: string; level: Level; response: string; scenarioIndex: number }) {
  const response = await fetch("/api/skills/debate-writing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const payload = (await response.json().catch(() => ({}))) as {
    scenario?: DebateSkillScenario;
    feedback?: DebateWritingFeedback;
    error?: string;
  };

  if (!response.ok || !payload.feedback || !payload.scenario) {
    throw new Error(payload.error ?? "We could not grade that practice response. Please try again.");
  }

  return payload;
}

function nextLevel(level: Level): Level {
  if (level === "BEGINNER") {
    return "INTERMEDIATE";
  }

  if (level === "INTERMEDIATE") {
    return "ELITE";
  }

  return "ELITE";
}

export function DebateWritingPractice({ slug, initialScenario }: DebateWritingPracticeProps) {
  const [level, setLevel] = useState<Level>(initialScenario.level);
  const [scenario, setScenario] = useState(initialScenario);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [feedback, setFeedback] = useState<DebateWritingFeedback | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const graded = await gradeResponse({
        slug,
        level,
        response,
        scenarioIndex
      });
      const gradedScenario = graded.scenario;
      const gradedFeedback = graded.feedback;
      if (!gradedScenario || !gradedFeedback) {
        throw new Error("We could not grade that practice response. Please try again.");
      }
      setScenario(gradedScenario);
      setFeedback(gradedFeedback);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not grade that practice response.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function tryAgain() {
    setFeedback(null);
    setResponse("");
    setShowHint(false);
    setShowModel(false);
  }

  function practiceSimilar(nextScenarioIndex = scenarioIndex + 1, nextPracticeLevel = level) {
    setScenarioIndex(nextScenarioIndex);
    setLevel(nextPracticeLevel);
    setFeedback(null);
    setResponse("");
    setShowHint(false);
    setShowModel(false);
    setScenario(getDebateSkillScenario(slug, nextPracticeLevel, nextScenarioIndex));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge variant="secondary">Debate writing practice</Badge>
              <CardTitle className="mt-3">{scenario.skillName}</CardTitle>
            </div>
            <Badge variant="outline">{level.toLowerCase()}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Motion</p>
            <p className="mt-2 text-lg font-semibold">{scenario.motion}</p>
          </div>
          <div className="rounded-lg border bg-primary/5 p-4">
            <p className="text-sm font-semibold">Scenario</p>
            <p className="mt-2 leading-7 text-muted-foreground">{scenario.prompt}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {scenario.rubricFocus.map((focus) => (
              <div key={focus} className="rounded-md border bg-background px-3 py-2 text-sm font-semibold">
                {focus}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your response</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            placeholder="Write your argument, refutation, weighing, or signposted response here..."
            className="min-h-44 text-base leading-7"
            disabled={isSubmitting}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setShowHint((current) => !current)}>
              <Lightbulb className="h-4 w-4" aria-hidden />
              Show hint
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowModel((current) => !current)}>
              Show stronger example
            </Button>
            <Button type="button" onClick={submit} disabled={response.trim().length < 10 || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
              Check answer
            </Button>
          </div>
          {showHint ? <p className="rounded-md border bg-background p-3 text-sm leading-6 text-muted-foreground">{scenario.hint}</p> : null}
          {showModel ? <p className="rounded-md border bg-background p-3 text-sm leading-6 text-muted-foreground">{scenario.modelExample}</p> : null}
          {error ? (
            <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {feedback ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Feedback</CardTitle>
                <Badge variant={feedback.score >= 80 ? "accent" : "secondary"}>{feedback.score}%</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <Progress value={feedback.score} />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border bg-background p-4">
                  <p className="font-semibold">Strong</p>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                    {feedback.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <p className="font-semibold">Missing</p>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                    {feedback.missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border bg-background p-4">
                  <p className="font-semibold">Sentence-level suggestions</p>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                    {feedback.sentenceSuggestions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <p className="font-semibold">Stronger version</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feedback.improvedVersion}</p>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {feedback.rubric.map((item) => (
                  <div key={item.label} className="rounded-md border bg-background p-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-semibold">{item.label}</span>
                      <span>{item.score}/4</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.note}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Button type="button" size="lg" variant="outline" onClick={tryAgain}>
              <RotateCcw className="h-5 w-5" aria-hidden />
              Try again
            </Button>
            <Button type="button" size="lg" variant="secondary" onClick={() => practiceSimilar()}>
              <Sparkles className="h-5 w-5" aria-hidden />
              Similar scenario
            </Button>
            <Button type="button" size="lg" onClick={() => practiceSimilar(scenarioIndex + 1, nextLevel(level))}>
              Move harder
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={() => setShowModel(true)}>
              Show model
            </Button>
          </div>

          <RecommendedVideos organization="DEBATE" skillTags={[scenario.skillName, ...feedback.weakSkills]} />
        </div>
      ) : null}
    </div>
  );
}
