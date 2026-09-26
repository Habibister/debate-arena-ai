"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { BookOpen, CheckCircle2, CircleAlert, Clock, Loader2, RotateCcw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_MEDTERM_FOCUS,
  HOSA_MEDTERM_FOCUS_ATTRIBUTION,
  HOSA_MEDTERM_TAUGHT_AREAS,
  MEDTERM_FOCUS_CHOICES,
  medTermContinuedForOtherChoice,
  medTermCoverageLabel,
  medTermFocus,
  medTermFocusForAreas,
  medTermFocusRequestAreas,
  type MedTermFocusId
} from "@/lib/hosa-medterm-focus";

type Area = { id: string; label: string; description: string };
/**
 * What the results offer for one area, resolved on the server from the course registry
 * (lib/education/hosa-medterm-practice.ts) and handed down as plain data: the published lesson that
 * teaches the area, or the plain statement that none does yet. An area with no entry gets neither.
 */
type Remediation =
  | { area: string; kind: "lesson"; lessonId: string; lessonTitle: string; href: string; label: string }
  | { area: string; kind: "no-lesson"; message: string };
type ServedChoice = { optionId: string; text: string };
// Server-issued item. No correct answer and no explanation until the learner has answered.
type Question = {
  itemId: string;
  area: string;
  prompt: string;
  choices: ServedChoice[];
  answered: boolean;
  selectedOptionId?: string;
  correct?: boolean;
  correctAnswer?: string;
  explanation?: string;
};
type AnswerState = { optionId: string; correct: boolean; correctAnswer: string; explanation: string; confidence?: Confidence };
type Confidence = "low" | "medium" | "high";
type EvidenceStatus = "insufficient-evidence" | "below-threshold" | "passing";
type PersistenceStatus = "not-attempted" | "review-attempted";
type Result = {
  /** The SESSION result: every answer, counted every time it was submitted. */
  total: number;
  correctCount: number;
  scorePercent: number;
  /** The EVIDENCE result: each distinct question counted once, first answer only. */
  uniqueTotal: number;
  uniqueCorrect: number;
  coveredAreas: string[];
  coveredAreaCount: number;
  requiredUnique: number;
  requiredAreas: number;
  evidenceScore: number;
  evidenceStatus: EvidenceStatus;
  persistenceStatus: PersistenceStatus;
  /** Weak areas derived from the evidence set — only covered areas can appear. */
  weakAreas: Array<{ area: string; label: string; missed: number; total: number }>;
  passed: boolean;
};

const OFFICIAL_COUNT = 50;
const OFFICIAL_MINUTES = 60;

/**
 * Review-evidence requirements, mirroring `HOSA_MEDTERM_REQUIRED_UNIQUE` and
 * `HOSA_MEDTERM_REQUIRED_AREAS`, which this client component cannot import from the server bank
 * module. `scripts/hosa-medterm-evidence-smoke.ts` asserts the constants match so they cannot drift.
 */
const REQUIRED_UNIQUE_FOR_REVIEW = 10;
const REQUIRED_AREAS_FOR_REVIEW = 3;

/** Guidance shown before starting and again on results, so the requirement is never a surprise. */
const EVIDENCE_GUIDANCE =
  `Mixed sessions can count toward review practice when they include at least ${REQUIRED_UNIQUE_FOR_REVIEW} ` +
  `different questions across ${REQUIRED_AREAS_FOR_REVIEW} areas. Focused area sessions are practice only.`;

/**
 * What the results row says, from the EVIDENCE status alone.
 *
 * Deliberately makes no persistence claim. `recordPracticeOutcome` swallows its own failures, so the
 * route cannot prove a review row was written — and this component will not say it was saved,
 * recorded, scheduled or updated. It also never says mastered, event-ready or clinically proficient:
 * this is a recognition drill on one aggregate event skill, and it is review-only by design.
 */
export function evidenceState(result: Result): { badge: string; tone: "success" | "info" | "outline"; explanation: string } {
  if (result.evidenceStatus === "insufficient-evidence") {
    return {
      badge: "Practice only",
      tone: "outline",
      explanation:
        `Answer at least ${result.requiredUnique} different questions across ${result.requiredAreas} areas ` +
        `in one session before this result can count toward review practice. Nothing was recorded.`
    };
  }
  if (result.evidenceStatus === "below-threshold") {
    return {
      badge: "Keep practicing",
      tone: "info",
      explanation: "You answered enough different questions across enough areas, but scored below 70%."
    };
  }
  return {
    badge: "Practice complete",
    tone: "success",
    explanation: "You answered enough different questions across enough areas and scored at least 70%."
  };
}

/**
 * `areas` is the canonical area list, handed down by the server component so this client module never
 * imports the bank. `initialFocus` is the practice choice a link preselected (the word-part course's
 * last lesson links here with "word parts from the course"), or null when the learner arrived with
 * nothing preselected; either way nothing starts until the learner presses start.
 */
/**
 * The time limit of an issued session, in seconds. The official 60 minutes apply only to an official,
 * every-area session of the official length; anything else gets 1.2 minutes a question. Computed from
 * the ISSUED session's length, never from the setup screen's count, so a continued unfinished session
 * (which may be longer or shorter than the count now selected) keeps the time its own length earns.
 */
export function sessionTimeLimitSeconds({ timed, official, everyArea, issuedCount }: { timed: boolean; official: boolean; everyArea: boolean; issuedCount: number }): number {
  if (!timed) return 0;
  if (!Number.isFinite(issuedCount) || issuedCount < 1) return 0;
  const minutes = official && everyArea && issuedCount === OFFICIAL_COUNT ? OFFICIAL_MINUTES : Math.ceil(issuedCount * 1.2);
  return minutes * 60;
}

/**
 * The note shown above the choices when a link preselected one, or null when nothing was preselected
 * or the learner has since chosen something else (the note would then describe a choice no longer
 * selected). It names the choice and says nothing has started, so a learner arriving from the course
 * knows what the link did and that they still decide.
 */
export function preselectionNote(initialFocus: MedTermFocusId | null, focus: MedTermFocusId): string | null {
  if (!initialFocus || focus !== initialFocus) return null;
  return `The link you followed preselected ${medTermFocus(initialFocus).label}. Change it below if you want something else. Nothing starts until you press start.`;
}

/**
 * The action the results show for one weak area: the entry for EXACTLY that area, or null.
 *
 * Never a neighbour and never a default. A weak area the server resolved nothing for shows the area
 * alone, so a missing entry can never turn into a lesson for some other area, or into a claim that no
 * lesson exists when one might.
 */
export function weakAreaRemediation(area: string, remediation: readonly Remediation[]): Remediation | null {
  const matches = remediation.filter((entry) => entry.area === area);
  return matches.length === 1 ? matches[0] : null;
}

/**
 * The results screen's weak-area list, with what each area offers next.
 *
 * Exported so a suite can render it from a real submit response: it is the one place the practice
 * results turn into a lesson link. Each area shows its own line, then EXACTLY its own action: the
 * lesson that teaches it, the plain statement that no lesson does yet, or nothing when the server
 * could not prove either.
 */
export function WeakAreasReview({
  result,
  remediation
}: {
  result: Pick<Result, "weakAreas" | "evidenceStatus">;
  remediation: readonly Remediation[];
}) {
  return (
    <>
      {result.weakAreas.length > 0 ? (
        <div>
          <p className="text-sm font-semibold">Areas to review</p>
          <ul className="mt-1 space-y-3 text-xs text-muted-foreground">
            {result.weakAreas.map((w) => {
              const next = weakAreaRemediation(w.area, remediation);
              return (
                <li key={w.area} className="space-y-1">
                  <p>
                    {w.label}: missed {w.missed} of {w.total}
                  </p>
                  {next?.kind === "lesson" ? (
                    <Link
                      href={next.href as Route}
                      className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
                      {next.label}
                    </Link>
                  ) : next?.kind === "no-lesson" ? (
                    <p className="flex items-start gap-1.5">
                      <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>
                        {next.message} You can keep practising it with {medTermFocus("all").label}, where every answer is
                        explained.
                      </span>
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {result.weakAreas.some((w) => weakAreaRemediation(w.area, remediation)?.kind === "lesson") ? (
            <p className="mt-2 text-xs text-muted-foreground">
              A lesson opens on its own page, so these results close. Each of these lessons links back to word-part
              practice.
            </p>
          ) : null}
        </div>
      ) : result.evidenceStatus !== "insufficient-evidence" ? (
        // Scoped to what was actually covered — a session that never touched physiology cannot
        // report physiology as clean.
        <p className="text-sm text-muted-foreground">No weak areas were detected in the areas covered by this session.</p>
      ) : null}
    </>
  );
}

export function HosaMedTermEngine({
  official,
  areas: catalog = [],
  initialFocus = null,
  remediation = []
}: {
  official: boolean;
  areas?: Area[];
  initialFocus?: MedTermFocusId | null;
  remediation?: readonly Remediation[];
}) {
  const [mode, setMode] = useState<"timed" | "untimed">("timed");
  // What to practise: the taught word parts, or every area. Sent to the server as the canonical area
  // ids of the choice (or omitted for every area), where the same validated contract applies.
  const [focus, setFocus] = useState<MedTermFocusId>(initialFocus ?? DEFAULT_MEDTERM_FOCUS);
  // The official format (50 questions, 60 minutes) is a whole-event test, so matching it is offered,
  // labelled and timed only for the every-area choice; a targeted session is practice on its areas.
  const officialFormat = official && focus === "all";
  const [count, setCount] = useState(official && (initialFocus ?? DEFAULT_MEDTERM_FOCUS) === "all" ? OFFICIAL_COUNT : 10);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [checking, setChecking] = useState(false);
  const [areas, setAreas] = useState<Area[]>(catalog);
  // The areas the issued session really covers (empty = every area), from the server, so a resumed
  // session is labelled by what it is rather than by what was just chosen.
  const [sessionAreas, setSessionAreas] = useState<string[]>([]);
  const [resumedElsewhere, setResumedElsewhere] = useState(false);
  const [sessionOfficial, setSessionOfficial] = useState(false);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  // Keyed by DISTINCT itemId: a repeated visual slot shows the same recorded answer.
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});

  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const timed = mode === "timed";
  const areaLabel = (id: string) => areas.find((a) => a.id === id)?.label ?? id;
  // What the issued session covers, named by the choice it matches, or by its areas when it matches none.
  const sessionFocus = medTermFocusForAreas(sessionAreas);
  const sessionCoverageLabel = medTermCoverageLabel(sessionAreas, areaLabel);
  // Before a session is issued there is nothing to time; `order` is the issued session's real length.
  const timeLimit = sessionTimeLimitSeconds({ timed, official: sessionOfficial, everyArea: sessionFocus === "all", issuedCount: order.length || count });

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
      // A targeted choice sends exactly its canonical areas; "all" sends none, which is the route's
      // existing every-area behaviour. The server validates the areas again before it draws anything.
      const requestAreas = medTermFocusRequestAreas(focus);
      const res = await fetch("/api/hosa/medterm/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestAreas ? { count, areas: requestAreas } : { count })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start the session.");
      if (!data.sessionId || !data.items || !data.order) throw new Error(data.error ?? "Could not start the session.");
      const issuedAreas: string[] = Array.isArray(data.requestedAreas) ? data.requestedAreas.filter((a: unknown) => typeof a === "string") : [];
      setQuestions(data.items);
      setOrder(data.order);
      setSessionId(data.sessionId);
      setAreas(data.areas ?? catalog);
      setSessionAreas(issuedAreas);
      // An unfinished session from earlier is continued rather than replaced. If it was issued for a
      // different choice, the learner is told so on the question screen.
      setResumedElsewhere(medTermContinuedForOtherChoice(Boolean(data.resumed), issuedAreas, focus));
      setSessionOfficial(data.mode === "official");
      setIndex(0);
      setSelected(null);
      setConfidence(null);
      setExpired(false);
      // A resumed session restores what was already answered.
      const restored: Record<string, AnswerState> = {};
      for (const item of data.items as Question[]) {
        if (item.answered && item.selectedOptionId) {
          restored[item.itemId] = { optionId: item.selectedOptionId, correct: item.correct ?? false,
            correctAnswer: item.correctAnswer ?? "", explanation: item.explanation ?? "" };
        }
      }
      setAnswers(restored);
      setElapsed(0);
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the session.");
    } finally {
      setBusy(false);
    }
  }

  const currentItemId = order[index] ?? null;
  const byItemId = useMemo(() => new Map((questions ?? []).map((q) => [q.itemId, q])), [questions]);
  const current = currentItemId ? byItemId.get(currentItemId) ?? null : null;
  const currentAnswer = currentItemId ? answers[currentItemId] ?? null : null;
  const revealed = currentAnswer !== null;

  async function submitAnswer() {
    // One in-flight check, and never a second for an item already recorded.
    if (!sessionId || !current || selected === null || !confidence || checking || answers[current.itemId]) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/hosa/medterm/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, itemId: current.itemId, optionId: selected })
      });
      const data = await res.json();
      if (res.status === 410) { setExpired(true); return; }
      if (!res.ok) throw new Error(data.error ?? "That answer could not be saved. Try again.");
      setAnswers((a) => ({ ...a, [data.itemId]: { optionId: selected, correct: data.correct,
        correctAnswer: data.correctAnswer, explanation: data.explanation, confidence } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "That answer could not be saved. Try again.");
    } finally {
      setChecking(false);
    }
  }

  function next() {
    setSelected(null);
    setConfidence(null);
    setIndex((i) => i + 1);
  }

  async function finish() {
    if (!sessionId || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Only the session id — score and pass come from the server, never from these slots.
      const res = await fetch("/api/hosa/medterm/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (res.status === 410) { setExpired(true); return; }
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
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outOfTime]);

  // Progress counts DISTINCT items, never visual slots.
  const distinctTotal = questions?.length ?? 0;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = distinctTotal > 0 && answeredCount === distinctTotal;
  const runningCorrect = useMemo(() => Object.values(answers).filter((a) => a.correct).length, [answers]);

  function clockLabel(seconds: number) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  const taughtAreaIds: readonly string[] = HOSA_MEDTERM_TAUGHT_AREAS;
  const preselection = preselectionNote(initialFocus, focus);

  // --- Setup screen ---
  if (!questions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle as="h2">Medical Terminology practice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {preselection ? <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">{preselection}</p> : null}

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">What do you want to practise?</legend>
            {MEDTERM_FOCUS_CHOICES.map((choice) => {
              const chosen = focus === choice.id;
              const included = choice.areas ? catalog.filter((a) => (choice.areas as readonly string[]).includes(a.id)) : catalog;
              return (
                <label
                  key={choice.id}
                  className={`block cursor-pointer rounded-md border p-3 ${chosen ? "border-primary bg-primary/10" : "bg-background hover:bg-muted"}`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="medterm-practice-choice"
                      value={choice.id}
                      checked={chosen}
                      onChange={() => setFocus(choice.id)}
                      aria-labelledby={`medterm-choice-${choice.id}-name`}
                      aria-describedby={`medterm-choice-${choice.id}-summary medterm-choice-${choice.id}-coverage medterm-choice-${choice.id}-disclosure`}
                      className="focus-ring mt-1 h-4 w-4 shrink-0"
                    />
                    <span className="min-w-0">
                      <span id={`medterm-choice-${choice.id}-name`} className="block text-sm font-semibold">{choice.label}</span>
                      <span id={`medterm-choice-${choice.id}-summary`} className="mt-1 block text-xs text-muted-foreground">{choice.summary}</span>
                      <span id={`medterm-choice-${choice.id}-coverage`} className="mt-2 flex items-center gap-1 text-xs font-semibold">
                        {choice.taught ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
                        ) : (
                          <CircleAlert className="h-3.5 w-3.5 text-amber-600" aria-hidden />
                        )}
                        {choice.coverage}
                      </span>
                      <span id={`medterm-choice-${choice.id}-disclosure`} className="mt-1 block text-xs text-muted-foreground">{choice.disclosure}</span>
                      {included.length > 0 ? (
                        <span className="mt-2 block text-xs text-muted-foreground">
                          You will see: {included.map((a) => `${a.label}${taughtAreaIds.includes(a.id) ? "" : " (not taught yet)"}`).join(", ")}.
                        </span>
                      ) : null}
                    </span>
                  </span>
                </label>
              );
            })}
            <p className="text-xs text-muted-foreground">{HOSA_MEDTERM_FOCUS_ATTRIBUTION}</p>
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("timed");
                if (officialFormat) setCount(OFFICIAL_COUNT);
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

          {/* The official format draws on every area, so matching it is offered only for the
              every-area choice; a targeted session is practice on the chosen areas, not the format. */}
          {officialFormat && timed ? (
            <button
              type="button"
              onClick={() => setCount(OFFICIAL_COUNT)}
              className={`block w-full rounded-md border p-3 text-left text-sm ${count === OFFICIAL_COUNT ? "border-primary bg-primary/10" : "bg-background hover:bg-muted"}`}
            >
              <span className="font-semibold">Match official format — {OFFICIAL_COUNT} questions · {OFFICIAL_MINUTES}-minute timer</span>
              <span className="mt-1 block text-xs text-muted-foreground">Mirrors the HOSA Medical Terminology Round One written test.</span>
            </button>
          ) : null}
          {official && timed && !officialFormat ? (
            <p className="text-xs text-muted-foreground">
              Matching the official format ({OFFICIAL_COUNT} questions, {OFFICIAL_MINUTES}-minute timer) is offered for All Medical
              Terminology only.
            </p>
          ) : null}

          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Question count</span>
            <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {[10, 20, 30, 50].map((c) => (
                <option key={c} value={c}>{c} questions{officialFormat && c === OFFICIAL_COUNT ? " (official)" : ""}</option>
              ))}
            </select>
            <span className="mt-2 block text-xs font-normal text-muted-foreground">{EVIDENCE_GUIDANCE}</span>
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
    const state = evidenceState(result);
    // Only worth explaining when the two numbers actually disagree — i.e. a question was answered
    // more than once, or an unknown id was submitted.
    const repeated = result.evidenceScore !== result.scorePercent;
    return (
      <Card>
        <CardHeader>
          <CardTitle as="h2">Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold">{result.scorePercent}%</span>
            <span className="text-sm text-muted-foreground">{result.correctCount} / {result.total} correct</span>
            <Badge variant={state.tone}>{state.badge}</Badge>
          </div>

          <div className="space-y-1 rounded-md border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">{state.explanation}</p>
            {repeated ? (
              <p className="text-xs text-muted-foreground">
                Repeated questions count once toward review evidence — {result.uniqueCorrect} of {result.uniqueTotal} different questions correct.
              </p>
            ) : null}
            {result.coveredAreaCount === 1 ? (
              <p className="text-xs text-muted-foreground">
                Focused area sessions are practice only because they cover one area. Use a mixed session to build
                review-qualified evidence.
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">{EVIDENCE_GUIDANCE}</p>
          </div>

          <WeakAreasReview result={result} remediation={remediation} />

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
          <CardTitle as="h2" className="text-base">
            Question {index + 1} of {order.length}
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
            {resumedElsewhere ? (
              <p className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  This continues a session you started earlier and did not finish, covering {sessionCoverageLabel}. Your choice,{" "}
                  {medTermFocus(focus).label}, applies to the next session after this one.
                </span>
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{areaLabel(current.area)}</Badge>
              <Badge variant="secondary">{sessionCoverageLabel}</Badge>
            </div>
            <p className="text-sm font-medium">{current.prompt}</p>
            <div className="space-y-2">
              {current.choices.map((choice) => {
                const isSelected = revealed ? currentAnswer?.optionId === choice.optionId : selected === choice.optionId;
                // Correctness is known only after the server has recorded the answer.
                const isCorrect = revealed && currentAnswer?.correctAnswer === choice.text;
                const showState = revealed && (isCorrect || isSelected);
                return (
                  <button
                    key={`${index}:${current.itemId}:${choice.optionId}`}
                    type="button"
                    disabled={revealed || checking}
                    onClick={() => setSelected(choice.optionId)}
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
                    {choice.text}
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
                    {currentAnswer?.correct ? "Correct" : `Answer: ${currentAnswer?.correctAnswer ?? ""}`}
                    {confidence ? <span className="ml-2 font-normal text-muted-foreground">(you felt {confidence} confidence)</span> : null}
                  </p>
                  <p className="mt-1 text-muted-foreground">{currentAnswer?.explanation}</p>
                </div>
                {index + 1 < order.length ? (
                  <Button type="button" onClick={next}>Next question</Button>
                ) : (
                  <Button type="button" onClick={finish} disabled={busy || !allAnswered}>
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
