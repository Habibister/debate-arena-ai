"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, Target, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Question = { id: string; area: string; question: string; choices: string[]; correctAnswer: string; explanation: string };
type AreaMeta = { id: string; label: string };
type PerSkill = { area: string; label: string; skillSlug: string; total: number; correct: number; scorePercent: number; passed: boolean };
type Result = { total: number; correctCount: number; scorePercent: number; perSkill: PerSkill[]; wroteSkills: string[] };

// Generic concept-drill runner: original multiple-choice items with immediate explanations; on
// finish, real per-skill scores are written to MasteryProgress + spaced review by the submit route.
// Parameterized by endpoints + area filters so a track can mount it without new UI code.
export function ConceptDrills({
  sessionEndpoint,
  submitEndpoint,
  areas,
  title,
  blurb
}: {
  sessionEndpoint: string;
  submitEndpoint: string;
  areas: AreaMeta[];
  title: string;
  blurb: string;
}) {
  const [areaFilter, setAreaFilter] = useState<string>("mixed");
  const [count, setCount] = useState(8);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Array<{ id: string; selected: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const current = questions?.[index];
  const answeredCount = answers.length;
  const runningCorrect = useMemo(() => (questions ? answers.filter((a) => questions.find((q) => q.id === a.id)?.correctAnswer === a.selected).length : 0), [answers, questions]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(sessionEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, areas: areaFilter === "mixed" ? undefined : [areaFilter] })
      });
      const data = (await res.json().catch(() => ({}))) as { questions?: Question[]; error?: string };
      if (!res.ok || !data.questions) throw new Error(data.error ?? "Could not start the drill.");
      setQuestions(data.questions);
      setIndex(0);
      setSelected(null);
      setRevealed(false);
      setAnswers([]);
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the drill.");
    } finally {
      setBusy(false);
    }
  }

  function submitAnswer() {
    if (!current || selected === null) return;
    setAnswers((a) => [...a, { id: current.id, selected }]);
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
    setBusy(true);
    setError(null);
    try {
      const finalAnswers = [...answers, ...(selected && current && !answers.find((a) => a.id === current.id) ? [{ id: current.id, selected }] : [])];
      const res = await fetch(submitEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers })
      });
      const data = (await res.json().catch(() => ({}))) as Result & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not score the drill.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score the drill.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" aria-hidden />
            Drill results — {result.scorePercent}% ({result.correctCount}/{result.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {result.perSkill.map((s) => (
              <div key={s.area} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-2 text-sm">
                <span className="font-semibold">{s.label}</span>
                <span className="flex items-center gap-2">
                  <span>{s.correct}/{s.total} ({s.scorePercent}%)</span>
                  {result.wroteSkills.includes(s.skillSlug) ? (
                    <Badge variant="secondary">mastery + review updated</Badge>
                  ) : (
                    <Badge variant="outline">not yet tracked</Badge>
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Scores are real: each skill above updates your mastery and spaced-review schedule. Skills marked
            &quot;not yet tracked&quot; aren&apos;t seeded yet, so no progress is recorded for them (never faked).
          </p>
          <Button type="button" size="sm" onClick={() => setResult(null)}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            New drill
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!questions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" aria-hidden />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{blurb}</p>
          <div>
            <p className="mb-2 text-sm font-semibold">Focus</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setAreaFilter("mixed")} aria-pressed={areaFilter === "mixed"} className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${areaFilter === "mixed" ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                Mixed (all skills)
              </button>
              {areas.map((a) => (
                <button key={a.id} type="button" onClick={() => setAreaFilter(a.id)} aria-pressed={areaFilter === a.id} className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${areaFilter === a.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Questions</span>
            <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-10 w-full max-w-[10rem] rounded-md border bg-background px-3 text-sm">
              {[5, 8, 12, 20].map((c) => (
                <option key={c} value={c}>{c} questions</option>
              ))}
            </select>
          </label>
          <Button type="button" onClick={start} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {busy ? "Starting..." : "Start drill"}
          </Button>
          {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

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
            <div className="space-y-2">
              {current.choices.map((choice) => {
                const isSel = selected === choice;
                const isCorrect = choice === current.correctAnswer;
                const showState = revealed && (isCorrect || isSel);
                return (
                  <button
                    key={choice}
                    type="button"
                    disabled={revealed}
                    onClick={() => setSelected(choice)}
                    className={`flex w-full items-start gap-2 rounded-md border p-2 text-left text-sm ${
                      showState ? (isCorrect ? "border-emerald-500/50 bg-emerald-500/10" : "border-red-500/50 bg-red-500/10") : isSel ? "border-primary bg-primary/10" : "bg-background hover:bg-muted"
                    }`}
                  >
                    {revealed ? (isCorrect ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden /> : isSel ? <XCircle className="mt-0.5 h-4 w-4 text-red-600" aria-hidden /> : <span className="h-4 w-4" />) : <span className="h-4 w-4 shrink-0 rounded-full border" />}
                    <span>{choice}</span>
                  </button>
                );
              })}
            </div>
            {revealed ? (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-semibold">{selected === current.correctAnswer ? "Correct" : "Not quite"}</p>
                <p className="mt-1 text-muted-foreground">{current.explanation}</p>
              </div>
            ) : null}
            {!revealed ? (
              <Button type="button" size="sm" onClick={submitAnswer} disabled={selected === null}>Check answer</Button>
            ) : (
              <Button type="button" size="sm" onClick={next} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {index + 1 < questions.length ? "Next question" : "Finish & score"}
              </Button>
            )}
            {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
