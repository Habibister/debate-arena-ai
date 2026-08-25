"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, Target, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DrillArea } from "@/lib/debate-drills";

// Server-issued item. There is deliberately no correct answer and no explanation here: the session
// route withholds both until the learner has actually answered, and this client has no way to grade.
type ServedChoice = { optionId: string; text: string };
type ServedItem = {
  itemId: string;
  bankQuestionId: string;
  prompt: string;
  choices: ServedChoice[];
  area: DrillArea;
  displayOrder: number;
  answered: boolean;
  // Present ONLY for an item already answered, so a resumed session can restore what was shown.
  selectedOptionId?: string;
  correct?: boolean;
  correctAnswer?: string;
  explanation?: string;
};
type AreaMeta = { id: DrillArea; label: string; skillSlug: string; description: string };

type SessionStart = {
  sessionId: string;
  items: ServedItem[];
  /** Visual slots. A focused pool of nine can fill a twenty-slot session, so ids repeat here. */
  order: string[];
  expiresAtIso: string;
  resumed: boolean;
  areas?: AreaMeta[];
  error?: string;
};

/** What the check route returns once — and only once — the first answer has been recorded. */
type CheckResponse = {
  itemId: string;
  correct: boolean;
  correctAnswer: string;
  explanation: string;
  previouslyAnswered: boolean;
  answeredAtIso: string;
  error?: string;
};

type EvidenceStatus = "insufficient-evidence" | "below-threshold" | "passing";
// The server's persistence outcome. `not-saved` and `preserved-concurrent` are gone: a submission
// now runs in one transaction that either commits or rolls back, and the session claim means a
// second concurrent submit never reaches mastery — it replays the stored result instead.
type PersistenceStatus = "not-attempted" | "updated" | "skill-missing";

type PerSkill = {
  area: DrillArea;
  label: string;
  skillSlug: string;
  total: number;
  correct: number;
  scorePercent: number;
  /** Item rows are one per DISTINCT question, so these count unique questions by construction. */
  uniqueTotal: number;
  uniqueCorrect: number;
  requiredUnique: number;
  evidenceScore: number;
  evidenceStatus: EvidenceStatus;
  persistenceStatus: PersistenceStatus;
  passed: boolean;
};
type Result = {
  total: number;
  correctCount: number;
  scorePercent: number;
  perSkill: PerSkill[];
  wroteSkills: string[];
  sessionId: string;
  completedAtIso: string;
  alreadyCompleted: boolean;
};

/**
 * Distinct questions per skill required before anything is recorded.
 *
 * Mirrors `DEBATE_DRILL_REQUIRED_UNIQUE`, which this client component cannot import from the server
 * bank module. `scripts/debate-mastery-smoke.ts` asserts the two constants are equal so they cannot
 * drift.
 */
const REQUIRED_UNIQUE_FOR_PROGRESS = 5;

/**
 * What each result row says, from BOTH status fields.
 *
 * Never from one alone: a skill can qualify on evidence and still not be recorded if the skill is
 * not seeded, and those are different things to tell someone. Nothing here is inferred from the fact
 * that a request succeeded — every state below comes from a field the server actually returned.
 *
 * The old `not-saved` and `preserved-concurrent` states are gone because the server can no longer
 * produce them, and nothing invents a review date: the completed result carries no review outcome,
 * so claiming one would be a fabrication.
 */
export function resultState(skill: PerSkill): { badge: string; tone: "success" | "info" | "outline" | "unavailable" | "warning"; explanation: string | null } {
  if (skill.persistenceStatus === "skill-missing") {
    return {
      badge: "Not tracked yet",
      tone: "unavailable",
      explanation: "Progress tracking is not available for this skill yet."
    };
  }
  if (skill.evidenceStatus === "insufficient-evidence") {
    return {
      badge: "Practice only",
      tone: "outline",
      explanation: `Fewer than ${skill.requiredUnique} different questions were answered for this skill, so no progress was recorded.`
    };
  }
  if (skill.evidenceStatus === "below-threshold") {
    return {
      badge: "Keep practicing",
      tone: "info",
      explanation: "You answered enough different questions, but scored below 70%."
    };
  }
  // Qualified on evidence AND the server says it wrote.
  if (skill.persistenceStatus === "updated") {
    return {
      badge: "Progress saved",
      tone: "success",
      explanation: "You answered enough different questions and scored at least 70%."
    };
  }
  // Qualified but the server reports no write attempt. The routes cannot currently produce this, so
  // it fails CLOSED: report the practice honestly rather than claim a save that was never confirmed.
  return {
    badge: "Practice only",
    tone: "outline",
    explanation: "You answered enough different questions, but no progress was recorded for this skill."
  };
}

type AnswerState = { optionId: string; correct: boolean; correctAnswer: string; explanation: string };

// General Debate concept drills: original multiple-choice items across argument construction,
// rebuttal, evidence evaluation, and weighing. The server issues the questions, shuffles the choices
// and keeps the answer key; each answer is recorded server-side before its feedback comes back, and
// the first answer to a question is final. On finish, the per-skill EVIDENCE score — each distinct
// question counted once — is what may be recorded.
/**
 * `initialArea` sets ONLY the first render's filter, so a lesson can hand the learner the exact drill
 * that measures the concept it just taught. It is not a controlled prop: the learner can still switch
 * areas freely afterwards, and callers that pass nothing keep today's "mixed" behaviour exactly.
 * The caller is responsible for narrowing untrusted input with `drillAreaFromQuery` first.
 */
export function DebateDrills({ initialArea }: { initialArea?: DrillArea } = {}) {
  const [areaFilter, setAreaFilter] = useState<DrillArea | "mixed">(initialArea ?? "mixed");
  const [count, setCount] = useState(8);
  const [areasMeta, setAreasMeta] = useState<AreaMeta[]>([]);
  const [session, setSession] = useState<SessionStart | null>(null);
  const [slot, setSlot] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  // Keyed by DISTINCT itemId, never by slot: a repeated slot shows the same recorded answer.
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const itemsById = useMemo(
    () => new Map((session?.items ?? []).map((item) => [item.itemId, item])),
    [session]
  );
  const currentItemId = session?.order[slot] ?? null;
  const current = currentItemId ? itemsById.get(currentItemId) ?? null : null;
  const currentAnswer = currentItemId ? answers[currentItemId] ?? null : null;
  const revealed = currentAnswer !== null;

  // Progress counts DISTINCT items, never visual slots — a padded twenty-slot session over nine
  // questions is complete after those nine.
  const distinctTotal = session?.items.length ?? 0;
  const answeredCount = Object.keys(answers).length;
  const runningCorrect = useMemo(() => Object.values(answers).filter((a) => a.correct).length, [answers]);
  const allAnswered = distinctTotal > 0 && answeredCount === distinctTotal;

  function resetRun() {
    setSlot(0);
    setSelected(null);
    setAnswers({});
    setResult(null);
    setExpired(false);
  }

  async function start() {
    setBusy(true);
    setError(null);
    setExpired(false);
    try {
      const res = await fetch("/api/debate/drills/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, areas: areaFilter === "mixed" ? undefined : [areaFilter] })
      });
      const data = (await res.json().catch(() => ({}))) as SessionStart;
      if (!res.ok || !data.sessionId || !data.items || !data.order) {
        throw new Error(data.error ?? "Could not start the drill.");
      }
      setSession(data);
      setAreasMeta(data.areas ?? []);
      resetRun();
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the drill.");
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
      if (!res.ok) throw new Error(data.error ?? "That answer could not be saved. Try again.");
      // The server's recorded answer is authoritative — including when it reports that an earlier
      // answer already stands.
      setAnswers((a) => ({
        ...a,
        [data.itemId]: {
          optionId: data.previouslyAnswered ? a[data.itemId]?.optionId ?? selected : selected,
          correct: data.correct,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation
        }
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "That answer could not be saved. Try again.");
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
      const data = (await res.json().catch(() => ({}))) as Result & { error?: string };
      if (res.status === 410) {
        setExpired(true);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Could not score the drill.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score the drill.");
    } finally {
      setBusy(false);
    }
  }

  // --- Expired ---
  if (expired) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Practice session expired</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This practice session expired before it was submitted. Start a new session; your saved progress was not changed.
          </p>
          <Button type="button" size="sm" onClick={() => { setSession(null); resetRun(); }}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            New drill
          </Button>
        </CardContent>
      </Card>
    );
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
          {result.alreadyCompleted ? (
            <p className="text-xs text-muted-foreground">You already finished this session. Here are your results.</p>
          ) : null}
          <div className="space-y-2">
            {result.perSkill.map((s) => {
              const state = resultState(s);
              // Repeated slots are answered once, so the two numbers now agree by construction. Kept
              // as a guard: if they ever diverge, the learner is told why rather than left guessing.
              const repeated = s.evidenceScore !== s.scorePercent;
              return (
                <div key={s.area} className="space-y-1 rounded-md border bg-background p-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{s.label}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{s.correct}/{s.total} ({s.scorePercent}%)</span>
                      <Badge variant={state.tone}>{state.badge}</Badge>
                    </span>
                  </div>
                  {repeated ? (
                    <p className="text-xs text-muted-foreground">
                      Repeated questions count once toward progress — {s.uniqueCorrect} of {s.uniqueTotal} different questions correct.
                    </p>
                  ) : null}
                  {state.explanation ? <p className="text-xs text-muted-foreground">{state.explanation}</p> : null}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Focused skill sessions can update your progress. A mixed session is practice and only records a
            skill when you answer at least {REQUIRED_UNIQUE_FOR_PROGRESS} different questions from it.
          </p>
          <Button type="button" size="sm" onClick={() => { setSession(null); resetRun(); }}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            New drill
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- Setup ---
  if (!session) {
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
            Original multiple-choice reps on the core debate skills. Every answer gets an explanation.
          </p>
          <div>
            <p className="mb-2 text-sm font-semibold">Focus</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setAreaFilter("mixed")} aria-pressed={areaFilter === "mixed"} className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${areaFilter === "mixed" ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                Mixed (all skills)
              </button>
              {(["claim-warrant-impact", "rebuttal", "evidence-evaluation", "weighing", "clash"] as DrillArea[]).map((a) => (
                <button key={a} type="button" onClick={() => setAreaFilter(a)} aria-pressed={areaFilter === a} className={`rounded-md border px-3 py-1.5 text-sm font-semibold capitalize ${areaFilter === a ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                  {a.replace(/-/g, " ")}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Focused skill sessions can update your progress. A mixed session is practice and only records a
              skill when you answer at least {REQUIRED_UNIQUE_FOR_PROGRESS} different questions from it.
            </p>
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
          <CardTitle className="text-base">Question {slot + 1} of {session.order.length}</CardTitle>
          <span className="text-sm text-muted-foreground">{runningCorrect}/{answeredCount} correct</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {current ? (
          <>
            <p className="text-sm font-medium">{current.prompt}</p>
            <div className="space-y-2">
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
                    onClick={() => setSelected(choice.optionId)}
                    className={`flex w-full items-start gap-2 rounded-md border p-2 text-left text-sm ${
                      showState ? (isCorrect ? "border-emerald-500/50 bg-emerald-500/10" : "border-red-500/50 bg-red-500/10") : isSel ? "border-primary bg-primary/10" : "bg-background hover:bg-muted"
                    }`}
                  >
                    {revealed ? (isCorrect ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden /> : isSel ? <XCircle className="mt-0.5 h-4 w-4 text-red-600" aria-hidden /> : <span className="h-4 w-4" />) : <span className="h-4 w-4 shrink-0 rounded-full border" />}
                    <span>{choice.text}</span>
                  </button>
                );
              })}
            </div>
            {revealed && currentAnswer ? (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-semibold">{currentAnswer.correct ? "Correct" : "Not quite"}</p>
                <p className="mt-1 text-muted-foreground">{currentAnswer.explanation}</p>
                {current.answered && answeredCount > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">Your first answer for this question is the one that counts.</p>
                ) : null}
              </div>
            ) : null}
            {!revealed ? (
              <Button type="button" size="sm" onClick={checkAnswer} disabled={selected === null || checking}>
                {checking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {checking ? "Saving..." : "Check answer"}
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={next} disabled={busy || (slot + 1 >= session.order.length && !allAnswered)}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {slot + 1 < session.order.length ? "Next question" : "Finish & score"}
              </Button>
            )}
            {slot + 1 >= session.order.length && !allAnswered ? (
              <p className="text-xs text-muted-foreground">
                Answer every question before finishing. {answeredCount} of {distinctTotal} answered.
              </p>
            ) : null}
            {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">That practice session is not available. Start a new session.</p>
        )}
      </CardContent>
    </Card>
  );
}
