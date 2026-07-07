"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, Target, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DrillArea } from "@/lib/debate-drills";

type Question = { id: string; area: DrillArea; question: string; choices: string[]; correctAnswer: string; explanation: string };
type AreaMeta = { id: DrillArea; label: string; skillSlug: string; description: string };
type PerSkill = { area: DrillArea; label: string; skillSlug: string; total: number; correct: number; scorePercent: number; passed: boolean };
type Result = { total: number; correctCount: number; scorePercent: number; items: Array<{ id: string; area: DrillArea; correct: boolean; correctAnswer: string; explanation: string }>; perSkill: PerSkill[]; wroteSkills: string[] };

// General Debate concept drills: original multiple-choice items across argument construction,
// rebuttal, evidence evaluation, and weighing. Immediate explanation per answer; on finish, real
// per-skill scores are written to MasteryProgress + spaced review.
export function DebateDrills() {
  const [areaFilter, setAreaFilter] = useState<DrillArea | "mixed">("mixed");
  const [count, setCount] = useState(8);
  const [areasMeta, setAreasMeta] = useState<AreaMeta[]>([]);
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
      const res = await fetch("/api/debate/drills/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, areas: areaFilter === "mixed" ? undefined : [areaFilter] })
      });
      const data = (await res.json().catch(() => ({}))) as { questions?: Question[]; areas?: AreaMeta[]; error?: string };
      if (!res.ok || !data.questions) throw new Error(data.error ?? "Could not start the drill.");
      setQuestions(data.questions);
      setAreasMeta(data.areas ?? []);
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
    // finish → submit for server-authoritative grading + mastery/review writes
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/debate/drills/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: [...answers, ...(selected && current && !answers.find((a) => a.id === current.id) ? [{ id: current.id, selected }] : [])] })
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

  // --- Results ---
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

  // --- Setup ---
  if (!questions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" aria-hidden />
            General Debate skill drills
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Original multiple-choice reps on the core debate skills. Every answer gets an explanation, and your
            real scores feed mastery + spaced review.
          </p>
          <div>
            <p className="mb-2 text-sm font-semibold">Focus</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setAreaFilter("mixed")} aria-pressed={areaFilter === "mixed"} className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${areaFilter === "mixed" ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                Mixed (all skills)
              </button>
              {(["claim-warrant-impact", "rebuttal", "evidence-evaluation", "weighing"] as DrillArea[]).map((a) => (
                <button key={a} type="button" onClick={() => setAreaFilter(a)} aria-pressed={areaFilter === a} className={`rounded-md border px-3 py-1.5 text-sm font-semibold capitalize ${areaFilter === a ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                  {a.replace(/-/g, " ")}
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

  // --- Question ---
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
