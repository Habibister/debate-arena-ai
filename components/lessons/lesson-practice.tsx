"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Dumbbell, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Question = { id: string; question: string; choices: string[]; correctAnswer: string; explanation: string };
type PerSkill = { skillSlug: string; label: string; scorePercent: number; passed: boolean };
type SubmitResult = { total: number; correctCount: number; scorePercent: number; perSkill: PerSkill[]; wroteSkills: string[] };

// Practice for a lesson. It does NOT own any scoring: it pulls questions from the existing drill
// session endpoint and posts to the existing submit endpoint, which grades server-side and records
// real MasteryProgress + spaced review via recordDrillMastery. Mastery status is reported honestly
// from `wroteSkills` — we never claim a save the server didn't confirm.
export function LessonPractice({
  drillArea,
  skillSlug,
  skillLabel,
  questionCount,
  intro
}: {
  drillArea: string;
  skillSlug: string;
  skillLabel: string;
  questionCount: number;
  intro: string;
}) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Array<{ id: string; selected: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const current = questions ? questions[index] : null;
  const answeredCount = answers.length;
  const runningCorrect = useMemo(
    () => (questions ? answers.filter((a) => questions.find((q) => q.id === a.id)?.correctAnswer === a.selected).length : 0),
    [answers, questions]
  );

  async function start() {
    setBusy(true);
    setError(null);
    setResult(null);
    setAnswers([]);
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    try {
      const res = await fetch("/api/debate/drills/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: questionCount, areas: [drillArea] })
      });
      if (!res.ok) throw new Error("Could not load practice. Please try again.");
      const data = (await res.json()) as { questions: Question[] };
      setQuestions(data.questions);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load practice.");
    } finally {
      setBusy(false);
    }
  }

  function checkAnswer() {
    if (!current || selected === null) return;
    setAnswers((a) => (a.find((x) => x.id === current.id) ? a : [...a, { id: current.id, selected }]));
    setRevealed(true);
  }

  async function next() {
    if (!questions) return;
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      setSelected(null);
      setRevealed(false);
      return;
    }
    // Finish: grade + record through the existing pipeline.
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/debate/drills/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers })
      });
      if (!res.ok) throw new Error("Could not score your practice. Please try again.");
      const data = (await res.json()) as SubmitResult;
      setResult(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not score your practice.");
    } finally {
      setBusy(false);
    }
  }

  // Result screen ------------------------------------------------------------------------------
  if (result) {
    const mine = result.perSkill.find((s) => s.skillSlug === skillSlug);
    const recorded = result.wroteSkills.includes(skillSlug);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" aria-hidden />
            Practice results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            You scored <span className="font-bold">{mine ? mine.scorePercent : result.scorePercent}%</span>{" "}
            ({result.correctCount} of {result.total} correct).
          </p>
          {recorded ? (
            <p className="flex items-start gap-2 rounded-md border border-success/50 bg-success/[0.06] p-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              <span>
                Your <span className="font-semibold">{skillLabel}</span> mastery was updated
                {mine ? <> — {mine.passed ? "you passed this round" : "keep practicing to pass (70%+)"}</> : null}. It counts toward spaced review.
              </span>
            </p>
          ) : (
            <p className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>This attempt was not recorded to your mastery (you may be signed out, or this skill isn’t available yet). Your answers above still stand.</span>
            </p>
          )}
          <Button type="button" variant="outline" onClick={start} disabled={busy} className="h-auto min-h-11 min-w-11">
            <RefreshCw className="h-4 w-4" aria-hidden />
            Practice again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Not started -------------------------------------------------------------------------------
  if (!questions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" aria-hidden />
            Practice: {skillLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="leading-7 text-muted-foreground">{intro}</p>
          {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
          <Button type="button" onClick={start} disabled={busy} className="h-auto min-h-11 min-w-11">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Dumbbell className="h-4 w-4" aria-hidden />}
            Start practice ({questionCount} questions)
          </Button>
        </CardContent>
      </Card>
    );
  }

  // In progress -------------------------------------------------------------------------------
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Question {index + 1} of {questions.length}</CardTitle>
          <span className="text-sm text-muted-foreground">{runningCorrect}/{answeredCount} correct</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {current ? (
          <>
            <p className="text-sm font-medium">{current.question}</p>
            <div className="space-y-2" role="group" aria-label="Answer choices">
              {current.choices.map((choice) => {
                const isSel = selected === choice;
                const isCorrect = choice === current.correctAnswer;
                const showState = revealed && (isCorrect || isSel);
                return (
                  <button
                    key={choice}
                    type="button"
                    disabled={revealed}
                    aria-pressed={isSel}
                    onClick={() => setSelected(choice)}
                    className={`focus-ring flex min-h-11 w-full min-w-11 items-start gap-2 rounded-md border p-3 text-left text-sm ${
                      showState
                        ? isCorrect
                          ? "border-success/60 bg-success/10"
                          : "border-destructive/60 bg-destructive/10"
                        : isSel
                          ? "border-primary bg-primary/10"
                          : "bg-background hover:bg-muted"
                    }`}
                  >
                    {revealed ? (
                      isCorrect ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                      ) : isSel ? (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                      ) : (
                        <span className="h-4 w-4 shrink-0" />
                      )
                    ) : (
                      <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border" />
                    )}
                    <span>{choice}</span>
                  </button>
                );
              })}
            </div>
            {revealed ? (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-semibold">{selected === current.correctAnswer ? "Correct" : "Not quite"}</p>
                <p className="mt-1 leading-6 text-muted-foreground">{current.explanation}</p>
              </div>
            ) : null}
            {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
            {!revealed ? (
              <Button type="button" size="sm" onClick={checkAnswer} disabled={selected === null} className="h-auto min-h-11 min-w-11">
                Check answer
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={next} disabled={busy} className="h-auto min-h-11 min-w-11">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {index + 1 < questions.length ? "Next question" : "Finish & record mastery"}
              </Button>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
