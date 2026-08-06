"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Dumbbell, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Server-issued item. There is deliberately no correct answer and no explanation here: the session
// route withholds both until the learner has actually answered, and this component cannot grade.
type ServedChoice = { optionId: string; text: string };
type ServedItem = {
  itemId: string;
  prompt: string;
  choices: ServedChoice[];
  answered: boolean;
  // Present ONLY for an item already answered, so a resumed session can restore what was shown.
  selectedOptionId?: string;
  correct?: boolean;
  correctAnswer?: string;
  explanation?: string;
};
type SessionStart = {
  sessionId: string;
  items: ServedItem[];
  /** Visual slots. A focused pool can be smaller than the requested count, so ids repeat here. */
  order: string[];
  resumed: boolean;
  error?: string;
};
type CheckResponse = {
  itemId: string;
  correct: boolean;
  correctAnswer: string;
  explanation: string;
  previouslyAnswered: boolean;
  answeredAtIso: string;
  error?: string;
};
type PerSkill = { skillSlug: string; label: string; scorePercent: number; passed: boolean };
type SubmitResult = {
  total: number;
  correctCount: number;
  scorePercent: number;
  perSkill: PerSkill[];
  wroteSkills: string[];
  alreadyCompleted: boolean;
  error?: string;
};
type AnswerState = { optionId: string; correct: boolean; correctAnswer: string; explanation: string };

// Practice for a lesson. It owns no scoring and no answer key: the Debate drill session route issues
// the questions and keeps the key, each answer is recorded server-side before its feedback comes
// back, and the first answer to a question is final. Mastery status is still reported honestly from
// `wroteSkills` — we never claim a save the server didn't confirm.
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
  const [session, setSession] = useState<SessionStart | null>(null);
  const [slot, setSlot] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  // Keyed by DISTINCT itemId, never by slot: a repeated slot shows the same recorded answer.
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const itemsById = useMemo(
    () => new Map((session?.items ?? []).map((item) => [item.itemId, item])),
    [session]
  );
  const currentItemId = session?.order[slot] ?? null;
  const current = currentItemId ? itemsById.get(currentItemId) ?? null : null;
  const currentAnswer = currentItemId ? answers[currentItemId] ?? null : null;
  const revealed = currentAnswer !== null;

  // Progress counts DISTINCT items, never visual slots.
  const distinctTotal = session?.items.length ?? 0;
  const answeredCount = Object.keys(answers).length;
  const runningCorrect = useMemo(() => Object.values(answers).filter((a) => a.correct).length, [answers]);
  const allAnswered = distinctTotal > 0 && answeredCount === distinctTotal;

  async function start() {
    setBusy(true);
    setError(null);
    setResult(null);
    setExpired(false);
    setAnswers({});
    setSlot(0);
    setSelected(null);
    try {
      const res = await fetch("/api/debate/drills/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: questionCount, areas: [drillArea] })
      });
      const data = (await res.json().catch(() => ({}))) as SessionStart;
      if (!res.ok || !data.sessionId || !data.items || !data.order) {
        throw new Error(data.error ?? "Could not load practice. Please try again.");
      }
      setSession(data);
      // A resumed session restores what was already answered, so a refresh does not lose work.
      const restored: Record<string, AnswerState> = {};
      for (const item of data.items) {
        if (item.answered && item.selectedOptionId) {
          restored[item.itemId] = {
            optionId: item.selectedOptionId,
            correct: item.correct ?? false,
            correctAnswer: item.correctAnswer ?? "",
            explanation: item.explanation ?? ""
          };
        }
      }
      setAnswers(restored);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load practice.");
    } finally {
      setBusy(false);
    }
  }

  async function checkAnswer() {
    // One in-flight check at a time, and never a second check for a question already recorded.
    if (!session || !current || selected === null || checking || answers[current.itemId]) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/debate/drills/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, itemId: current.itemId, optionId: selected })
      });
      const data = (await res.json().catch(() => ({}))) as CheckResponse;
      if (res.status === 410) {
        setExpired(true);
        return;
      }
      // A failed check records nothing locally, so the question stays answerable.
      if (!res.ok) throw new Error(data.error ?? "That answer could not be saved. Please try again.");
      setAnswers((a) => ({
        ...a,
        [data.itemId]: {
          optionId: data.previouslyAnswered ? a[data.itemId]?.optionId ?? selected : selected,
          correct: data.correct,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation
        }
      }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "That answer could not be saved.");
    } finally {
      setChecking(false);
    }
  }

  async function next() {
    if (!session) return;
    if (slot + 1 < session.order.length) {
      setSlot((s) => s + 1);
      setSelected(null);
      return;
    }
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // Only the session id. The answers were recorded server-side as they were given.
      const res = await fetch("/api/debate/drills/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId })
      });
      const data = (await res.json().catch(() => ({}))) as SubmitResult;
      if (res.status === 410) {
        setExpired(true);
        return;
      }
      // A failed submit shows the error, never a completion screen.
      if (!res.ok) throw new Error(data.error ?? "Could not score your practice. Please try again.");
      setResult(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not score your practice.");
    } finally {
      setBusy(false);
    }
  }

  // Expired ------------------------------------------------------------------------------------
  if (expired) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" aria-hidden />
            Practice session expired
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="leading-7 text-muted-foreground">
            This practice session expired before it was submitted. Start a new session; your saved progress was not changed.
          </p>
          <Button type="button" onClick={() => { setSession(null); setExpired(false); }} className="h-auto min-h-11 min-w-11">
            <RefreshCw className="h-4 w-4" aria-hidden />
            Start again
          </Button>
        </CardContent>
      </Card>
    );
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
          {result.alreadyCompleted ? (
            <p className="text-sm text-muted-foreground">You already finished this session. Here are your results.</p>
          ) : null}
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
  if (!session) {
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
          <CardTitle className="text-base">Question {slot + 1} of {session.order.length}</CardTitle>
          <span className="text-sm text-muted-foreground">{runningCorrect}/{answeredCount} correct</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {current ? (
          <>
            <p className="text-sm font-medium">{current.prompt}</p>
            <div className="space-y-2" role="group" aria-label="Answer choices">
              {current.choices.map((choice) => {
                const isSel = revealed ? currentAnswer?.optionId === choice.optionId : selected === choice.optionId;
                // Correctness is known only after the server has recorded the answer.
                const isCorrect = revealed && currentAnswer?.correctAnswer === choice.text;
                const showState = revealed && (isCorrect || isSel);
                return (
                  <button
                    key={`${slot}:${current.itemId}:${choice.optionId}`}
                    type="button"
                    disabled={revealed || checking}
                    aria-pressed={isSel}
                    onClick={() => setSelected(choice.optionId)}
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
                    <span>{choice.text}</span>
                  </button>
                );
              })}
            </div>
            {revealed && currentAnswer ? (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-semibold">{currentAnswer.correct ? "Correct" : "Not quite"}</p>
                <p className="mt-1 leading-6 text-muted-foreground">{currentAnswer.explanation}</p>
                <p className="mt-1 text-xs text-muted-foreground">Your first answer for this question is the one that counts.</p>
              </div>
            ) : null}
            {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
            {!revealed ? (
              <Button type="button" size="sm" onClick={checkAnswer} disabled={selected === null || checking} className="h-auto min-h-11 min-w-11">
                {checking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {checking ? "Saving..." : "Check answer"}
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={next} disabled={busy || (slot + 1 >= session.order.length && !allAnswered)} className="h-auto min-h-11 min-w-11">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {slot + 1 < session.order.length ? "Next question" : "Finish & record mastery"}
              </Button>
            )}
            {slot + 1 >= session.order.length && !allAnswered ? (
              <p className="text-xs text-muted-foreground">
                Answer every question before finishing. {answeredCount} of {distinctTotal} answered.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">That practice session is not available. Start a new session.</p>
        )}
      </CardContent>
    </Card>
  );
}
