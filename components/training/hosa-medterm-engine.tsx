"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Clock, Loader2, RotateCcw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Area = { id: string; label: string; description: string };
type Question = { id: string; area: string; question: string; choices: string[]; correctAnswer: string; explanation: string };
type Confidence = "low" | "medium" | "high";
type GradedItem = { id: string; area: string; correct: boolean; correctAnswer: string; explanation: string };
type Result = {
  total: number;
  correctCount: number;
  scorePercent: number;
  passed: boolean;
  items: GradedItem[];
  weakAreas: Array<{ area: string; label: string; missed: number; total: number }>;
  reviewScheduled: boolean;
};

const OFFICIAL_COUNT = 50;
const OFFICIAL_MINUTES = 60;

export function HosaMedTermEngine({ official }: { official: boolean }) {
  const [mode, setMode] = useState<"timed" | "untimed">("timed");
  const [count, setCount] = useState(official ? OFFICIAL_COUNT : 10);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [sessionOfficial, setSessionOfficial] = useState(false);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [answers, setAnswers] = useState<Array<{ id: string; selected: string; confidence?: Confidence }>>([]);

  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const timed = mode === "timed";
  const timeLimit = timed ? (sessionOfficial && count === OFFICIAL_COUNT ? OFFICIAL_MINUTES : Math.ceil(count * 1.2)) * 60 : 0;

  useEffect(() => {
    if (!questions || result || !timed) return;
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [questions, result, timed]);

  const timeRemaining = timed ? Math.max(0, timeLimit - elapsed) : 0;
  const outOfTime = timed && timeRemaining === 0 && Boolean(questions) && !result;

  async function startSession() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/hosa/medterm/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start the session.");
      setQuestions(data.questions);
      setAreas(data.areas ?? []);
      setSessionOfficial(data.mode === "official");
      setIndex(0);
      setSelected(null);
      setRevealed(false);
      setConfidence(null);
      setAnswers([]);
      setElapsed(0);
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the session.");
    } finally {
      setBusy(false);
    }
  }

  const current = questions?.[index];

  function submitAnswer() {
    if (!current || selected === null || !confidence) return;
    setAnswers((a) => [...a, { id: current.id, selected, confidence }]);
    setRevealed(true);
  }

  function next() {
    setSelected(null);
    setRevealed(false);
    setConfidence(null);
    setIndex((i) => i + 1);
  }

  async function finish(allAnswers: Array<{ id: string; selected: string; confidence?: Confidence }>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/hosa/medterm/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: allAnswers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not score the session.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score the session.");
    } finally {
      setBusy(false);
    }
  }

  // Auto-submit when out of time (score whatever was answered).
  useEffect(() => {
    if (outOfTime && !busy && !result) {
      finish(answers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outOfTime]);

  const answeredCount = answers.length;
  const runningCorrect = useMemo(() => {
    if (!questions) return 0;
    const byId = new Map(questions.map((q) => [q.id, q]));
    return answers.filter((a) => byId.get(a.id)?.correctAnswer === a.selected).length;
  }, [answers, questions]);

  function clockLabel(seconds: number) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  // --- Setup screen ---
  if (!questions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Medical Terminology practice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("timed");
                if (official) setCount(OFFICIAL_COUNT);
              }}
              className={`focus-ring rounded-md border px-3 py-1.5 text-sm font-semibold ${timed ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              Timed
            </button>
            <button
              type="button"
              onClick={() => setMode("untimed")}
              className={`focus-ring rounded-md border px-3 py-1.5 text-sm font-semibold ${!timed ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              Untimed
            </button>
          </div>

          {official && timed ? (
            <button
              type="button"
              onClick={() => setCount(OFFICIAL_COUNT)}
              className={`block w-full rounded-md border p-3 text-left text-sm ${count === OFFICIAL_COUNT ? "border-primary bg-primary/10" : "bg-background hover:bg-muted"}`}
            >
              <span className="font-semibold">Match official format — {OFFICIAL_COUNT} questions · {OFFICIAL_MINUTES}-minute timer</span>
              <span className="mt-1 block text-xs text-muted-foreground">Mirrors the HOSA Medical Terminology Round One written test.</span>
            </button>
          ) : null}

          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Question count</span>
            <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {[10, 20, 30, 50].map((c) => (
                <option key={c} value={c}>{c} questions{official && c === OFFICIAL_COUNT ? " (official)" : ""}</option>
              ))}
            </select>
          </label>

          {error ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <CircleAlert className="h-4 w-4" aria-hidden />
              {error}
            </p>
          ) : null}

          <Button type="button" onClick={startSession} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {busy ? "Preparing..." : `Start ${timed ? "timed" : "untimed"} practice`}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- Results screen ---
  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold">{result.scorePercent}%</span>
            <span className="text-sm text-muted-foreground">{result.correctCount} / {result.total} correct</span>
            <Badge variant={result.passed ? "secondary" : "outline"}>{result.passed ? "Passed" : "Keep practicing"}</Badge>
          </div>

          {result.reviewScheduled ? (
            <p className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5 text-primary" aria-hidden />
              {result.passed
                ? "Nice — Medical Terminology moves further out on your spaced-review schedule."
                : "Medical Terminology is scheduled to come back for review tomorrow so the gaps don't stick."}
            </p>
          ) : null}

          {result.weakAreas.length > 0 ? (
            <div>
              <p className="text-sm font-semibold">Areas to review</p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {result.weakAreas.map((w) => (
                  <li key={w.area}>
                    {w.label}: missed {w.missed} of {w.total}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No weak areas — every topic was clean.</p>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setQuestions(null);
              setResult(null);
            }}
          >
            New session
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- Question screen ---
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            Question {index + 1} of {questions.length}
          </CardTitle>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{runningCorrect}/{answeredCount} correct</span>
            {timed ? (
              <span className={`flex items-center gap-1 font-mono font-bold tabular-nums ${timeRemaining <= 60 ? "text-destructive" : ""}`}>
                <Clock className="h-4 w-4" aria-hidden />
                {clockLabel(timeRemaining)}
              </span>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {current ? (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{areas.find((a) => a.id === current.area)?.label ?? current.area}</Badge>
            </div>
            <p className="text-sm font-medium">{current.question}</p>
            <div className="space-y-2">
              {current.choices.map((choice) => {
                const isSelected = selected === choice;
                const isCorrect = choice === current.correctAnswer;
                const showState = revealed && (isCorrect || isSelected);
                return (
                  <button
                    key={choice}
                    type="button"
                    disabled={revealed}
                    onClick={() => setSelected(choice)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                      showState
                        ? isCorrect
                          ? "border-primary bg-primary/10"
                          : "border-destructive bg-destructive/10"
                        : isSelected
                          ? "border-primary bg-primary/10"
                          : "bg-background hover:bg-muted"
                    }`}
                  >
                    {choice}
                    {showState ? (
                      isCorrect ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" aria-hidden />
                      )
                    ) : null}
                  </button>
                );
              })}
            </div>

            {!revealed ? (
              <>
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">How confident are you?</p>
                  <div className="flex gap-2">
                    {(["low", "medium", "high"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setConfidence(c)}
                        className={`focus-ring rounded-md border px-3 py-1 text-xs font-semibold capitalize ${confidence === c ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <Button type="button" onClick={submitAnswer} disabled={selected === null || !confidence}>
                  Submit answer
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md border bg-muted/40 p-3 text-xs">
                  <p className="font-semibold">
                    {selected === current.correctAnswer ? "Correct" : `Answer: ${current.correctAnswer}`}
                    {confidence ? <span className="ml-2 font-normal text-muted-foreground">(you felt {confidence} confidence)</span> : null}
                  </p>
                  <p className="mt-1 text-muted-foreground">{current.explanation}</p>
                </div>
                {index + 1 < questions.length ? (
                  <Button type="button" onClick={next}>Next question</Button>
                ) : (
                  <Button type="button" onClick={() => finish(answers)} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                    {busy ? "Scoring..." : "Finish and score"}
                  </Button>
                )}
              </div>
            )}

            {error ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <CircleAlert className="h-4 w-4" aria-hidden />
                {error}
              </p>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
