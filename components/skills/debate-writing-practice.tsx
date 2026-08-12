"use client";

import { useEffect, useState } from "react";
import type { Level } from "@prisma/client";
import { ArrowRight, CheckCircle2, CircleAlert, Lightbulb, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { RecommendedVideos } from "@/components/resources/recommended-videos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { DebateSkillScenario, DebateWritingFeedback } from "@/lib/debate-skill-practice";

type DebateWritingPracticeProps = {
  slug: string;
  /**
   * Accepted for backward compatibility with the page that still renders this component, but NOT
   * authoritative: the scenario a learner is graded against is the one the server issues below.
   * The page may stop passing it once the writing surface is fully closed out.
   */
  initialScenario?: DebateSkillScenario;
};

/** The learner-safe scenario the session route returns. No rubric internals, no grader data. */
type IssuedScenario = {
  skillSlug: string;
  skillName: string;
  level: Level;
  motion: string;
  side: string;
  prompt: string;
  hint: string;
  modelExample: string;
  rubricFocus: string[];
};

function nextLevel(level: Level): Level {
  if (level === "BEGINNER") {
    return "INTERMEDIATE";
  }

  if (level === "INTERMEDIATE") {
    return "ELITE";
  }

  return "ELITE";
}

// Debate writing practice, on the server-issued session protocol (M13E2 C3b-ii).
//
// The SERVER chooses the scenario and freezes it into the session. This client no longer selects or
// rotates scenarios, and no longer sends `slug`, `level` or `scenarioIndex` with a submission — it
// sends the session id and the learner's prose, and the server grades against what it issued. Score,
// pass status, feedback and completion all come back from the server; nothing here estimates them.
export function DebateWritingPractice({ slug }: DebateWritingPracticeProps) {
  const [level, setLevel] = useState<Level>("BEGINNER");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<IssuedScenario | null>(null);
  const [response, setResponse] = useState("");
  const [feedback, setFeedback] = useState<DebateWritingFeedback | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSession(requestedLevel: Level) {
    setLoading(true);
    setError(null);
    setExpired(false);
    setFeedback(null);
    setAlreadyCompleted(false);
    setResponse("");
    setShowHint(false);
    setShowModel(false);
    try {
      const res = await fetch("/api/skills/debate-writing/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, level: requestedLevel })
      });
      const data = (await res.json().catch(() => ({}))) as {
        sessionId?: string;
        scenario?: IssuedScenario;
        error?: string;
      };
      if (!res.ok || !data.sessionId || !data.scenario) {
        throw new Error(data.error ?? "Could not start writing practice. Please try again.");
      }
      setSessionId(data.sessionId);
      setScenario(data.scenario);
      setLevel(data.scenario.level);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not start writing practice.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void startSession("BEGINNER");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function submit() {
    // One in-flight submission at a time, and never one without an issued session.
    if (!sessionId || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Session id and prose only. No slug, level, scenario, rubric, score, threshold, XP or rank.
      const res = await fetch("/api/skills/debate-writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, response })
      });
      const payload = (await res.json().catch(() => ({}))) as {
        scenario?: IssuedScenario;
        feedback?: DebateWritingFeedback;
        alreadyCompleted?: boolean;
        error?: string;
      };
      if (res.status === 410) {
        setExpired(true);
        return;
      }
      // A failed submission leaves the response editable and shows no completion.
      if (!res.ok || !payload.feedback || !payload.scenario) {
        throw new Error(payload.error ?? "We could not grade that practice response. Please try again.");
      }
      // The server result is authoritative — including when it replays an already-completed session,
      // which awards nothing a second time.
      setScenario(payload.scenario);
      setFeedback(payload.feedback);
      setAlreadyCompleted(payload.alreadyCompleted === true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not grade that practice response.");
    } finally {
      setIsSubmitting(false);
    }
  }

  /** A fresh scenario means a fresh server-issued session; the client never picks one. */
  function practiceSimilar(nextPracticeLevel: Level = level) {
    void startSession(nextPracticeLevel);
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading writing practice...
        </CardContent>
      </Card>
    );
  }

  if (expired) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Practice session expired</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="leading-7 text-muted-foreground">
            This practice session expired before it was submitted. Start a new session; your saved progress was not changed.
          </p>
          <Button type="button" onClick={() => practiceSimilar()}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Start a new scenario
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!scenario) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Writing practice unavailable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="leading-7 text-muted-foreground">
            That practice session is not available. Start a new session.
          </p>
          {error ? (
            <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </div>
          ) : null}
          <Button type="button" onClick={() => practiceSimilar()}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge variant="secondary">Formative writing practice</Badge>
              <CardTitle className="mt-3">{scenario.skillName}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Use this feedback to improve your response. This practice does not affect mastery or XP.
              </p>
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
            <Button type="button" onClick={submit} disabled={response.trim().length < 10 || isSubmitting || feedback !== null}>
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
                {/* M15 S1A A1: the number is a keyword/structure checklist result, not a mastery or
                    competition score, so it is labeled as checklist coverage and never celebrated
                    with an achievement variant. */}
                <Badge variant="secondary">Writing checklist: {feedback.score}%</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Formative feedback from a writing checklist — not a mastery, readiness, or competition score.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {alreadyCompleted ? (
                <p className="text-sm text-muted-foreground">You already finished this session. Here are your results.</p>
              ) : null}
              <Progress value={feedback.score} aria-label="Writing checklist coverage" />
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
            <Button type="button" size="lg" variant="outline" onClick={() => practiceSimilar()}>
              <RotateCcw className="h-5 w-5" aria-hidden />
              Try again
            </Button>
            <Button type="button" size="lg" variant="secondary" onClick={() => practiceSimilar()}>
              <Sparkles className="h-5 w-5" aria-hidden />
              Similar scenario
            </Button>
            <Button type="button" size="lg" onClick={() => practiceSimilar(nextLevel(level))}>
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
