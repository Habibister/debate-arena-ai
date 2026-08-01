"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, CheckCircle2, Info, Loader2, MessageSquare, RefreshCw, RotateCcw, XCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { AvailableRoleplayLesson, RoleplayLesson } from "@/lib/roleplay-lessons";
import {
  orderByAuthoredRubric,
  responseReviewLabel,
  rubricStatusLabel,
  validateAuthoredRubricFeedback,
  type ResponseReviewEntry,
  type RubricItemFeedback
} from "@/lib/authored-rubric-feedback";
import {
  clearAuthoredLessonProgress,
  countResponseWords,
  loadAuthoredLessonProgress,
  MAX_STORED_RESPONSE_CHARS,
  MIN_MEANINGFUL_RESPONSE_WORDS,
  normalizeRestoredProgress,
  saveAuthoredLessonProgress
} from "@/lib/authored-lesson-progress";

type Feedback = {
  strength?: string;
  improvement?: string;
  example?: string;
  rubricFeedback?: unknown;
  responseReview?: unknown;
  unavailable?: boolean;
};

// Lightweight meaningful-response gate: blocks blank/obvious-nonsense submissions while still
// allowing genuinely weak answers (which are exactly what coaching is for).
// Shared with resume normalization so a restored state can never satisfy one gate and violate the
// other (lib/authored-lesson-progress.ts is the single source of truth).
const MIN_RESPONSE_WORDS = MIN_MEANINGFUL_RESPONSE_WORDS;
const SHORT_RESPONSE_HINT = "Write at least one complete sentence so the coach has something meaningful to evaluate.";
const wordCount = countResponseWords;

// Appended to the authored rubric in `goals` so the coach evaluates the WHOLE exchange against
// every rubric item — and never invents praise for empty-quality responses. (≤300 chars, schema cap.)
const COACH_NOTE =
  "Evaluate BOTH responses against every rubric item above; name any item the learner missed explicitly; give ONE revised example that improves the whole exchange; if no item is genuinely met, say exactly: No rubric-aligned strength is demonstrated yet. Typing alone is not a strength.";

// Interactive practice for a role-play lesson. The lesson is authored & deterministic: it owns the
// scenario, roles, rubric, and the in-character follow-up. The AI (existing Side Coach route) is used
// ONLY to give short feedback on the learner's own words, validated against the authored rubric
// (passed as `goals`). It never invents the lesson or scores anything — no rating, record, or mastery.
// Entry point. Branches on the explicit `practiceStatus` discriminant — never on missing data — so a
// deliberately withdrawn lesson and an accidentally malformed one can never be confused: the latter
// fails type checking at the data layer instead of reaching here.
export function RoleplayLessonPractice({ lesson, userScope }: { lesson: RoleplayLesson; userScope?: string | null }) {
  if (lesson.practiceStatus !== "available") {
    // An unavailable lesson never mounts the active practice, so it initializes NO practice state,
    // runs NO persistence hooks, and performs NO localStorage read or write.
    return <PracticeUnavailable notice={lesson.practiceUnavailable} />;
  }
  return <ActiveRoleplayPractice lesson={lesson} userScope={userScope ?? null} />;
}

// Honest learner-facing state for a lesson whose interactive practice has been withdrawn. Renders no
// question, no textarea and no submit control; makes no Side Coach request; records no progress,
// completion or mastery; and claims no completion of any kind. It holds no hooks and no state, so
// there is nothing here that could produce or persist a result.
function PracticeUnavailable({ notice }: { notice: { title: string; message: string } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-5 w-5 text-muted-foreground" aria-hidden />
          {notice.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">{notice.message}</p>
        <p className="text-xs text-muted-foreground">
          Nothing is recorded for this lesson, and no part of it counts as completed.
        </p>
        <Link href={"/lessons" as Route} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to lessons
        </Link>
      </CardContent>
    </Card>
  );
}

// Honest persistence status + the local reset control. Status is conveyed by TEXT (never colour
// alone) and only changes when the persistence state materially changes — not on every keystroke.
function PracticeStatusBar({
  saveState,
  confirmingReset,
  onAskReset,
  onCancelReset,
  onConfirmReset
}: {
  saveState: "unknown" | "saved" | "unavailable";
  confirmingReset: boolean;
  onAskReset: () => void;
  onCancelReset: () => void;
  onConfirmReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-t pt-3">
      <div role="status" aria-live="polite" className="text-xs text-muted-foreground">
        {saveState === "saved" ? (
          <>
            <span className="font-semibold text-foreground">Saved on this device</span>
            <span className="block">
              Your answers stay in this browser only — they are not synced to your account or another
              device, and this is not a score, a competition result, or mastery.
            </span>
          </>
        ) : saveState === "unavailable" ? (
          <>
            <span className="font-semibold text-foreground">Progress is not being saved on this device</span>
            <span className="block">
              You can keep working normally — just avoid reloading, because your answers won&apos;t come back.
            </span>
          </>
        ) : (
          <span>Checking whether this browser can save your progress…</span>
        )}
      </div>
      {confirmingReset ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Clear your answers for this lesson?</span>
          <Button type="button" size="sm" variant="outline" onClick={onConfirmReset}>Yes, start over</Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancelReset}>Cancel</Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="ghost" onClick={onAskReset}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Start this practice over
        </Button>
      )}
    </div>
  );
}

// The live practice. Typed to the AVAILABLE variant, so scenario/practice/rubric are guaranteed
// present at compile time — no runtime fallbacks, no optional chaining, no way to reach the Side
// Coach without the authored scenario the request depends on.
function ActiveRoleplayPractice({ lesson, userScope }: { lesson: AvailableRoleplayLesson; userScope: string | null }) {
  const p = lesson.practice;
  const scenario = lesson.scenario;
  const [phase, setPhase] = useState<"identify" | "respond">("identify");
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  // M11R2 — ephemeral, NEVER written to storage. `scoreAvailable` is true only while the number on
  // screen was earned during THIS mounted session. A resumed `respond` phase had an earlier quick
  // check whose score we deliberately never stored, so no number may stand in for it.
  const [scoreAvailable, setScoreAvailable] = useState(true);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);

  const [writeText, setWriteText] = useState("");
  const [followText, setFollowText] = useState("");
  // The follow-up unlocks only after the main written response is submitted — no skipping it.
  const [followUnlocked, setFollowUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  // Only ever set from the shared production validator — never assembled or patched here.
  const [rubricVerdicts, setRubricVerdicts] = useState<RubricItemFeedback[] | null>(null);
  // Proof that both submissions were examined. Same rule: validator output only, already ordered
  // initial-then-follow-up, never reassembled here.
  const [responseReview, setResponseReview] = useState<ResponseReviewEntry[] | null>(null);

  // ---- Device-local resume (M5 Phase A) ------------------------------------------------------
  // Persist ONLY the learner's own work and their position. Never feedback, never correctness
  // totals, never completion. Nothing leaves the browser.
  //
  // `hydrated` is the gate that stops the initial empty React state from overwriting saved work:
  // no save effect may run until a load attempt has finished. Without it, the first render's empty
  // strings would race the restore and wipe the entry.
  const canPersist = Boolean(userScope);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"unknown" | "saved" | "unavailable">("unknown");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userScope) {
      // No stable per-account namespace: do not persist at all rather than risk one account
      // resuming another account's writing on a shared browser.
      setHydrated(true);
      setSaveState("unavailable");
      return;
    }
    const restored = loadAuthoredLessonProgress(userScope, lesson.slug);
    if (restored) {
      // Normalize before applying: a stored phase that depends on non-persisted data (coaching
      // feedback, results, submission) is mapped to the latest safe AUTHORING phase, the identify
      // index is clamped to the current question count, and a follow-up unlock is honoured only when
      // the first response actually earns it. Both learner responses always survive verbatim.
      const safe = normalizeRestoredProgress(restored, p.identify.length);
      setPhase(safe.phase);
      setIdx(safe.identifyIndex);
      setWriteText(safe.writeText);
      setFollowText(safe.followText);
      setFollowUnlocked(safe.followUnlocked);
      // A restored `respond` phase carries a quick-check score we never stored, so the live counter
      // must not present itself as that score. A restarted identify phase is genuinely fresh from
      // question zero, so its counter is honest again.
      setScoreAvailable(safe.phase !== "respond");
      const restoredWriting = safe.writeText.trim().length > 0 || safe.followText.trim().length > 0;
      setResumeNotice(
        safe.identifyRestartedForScore
          ? restoredWriting
            ? "Your written responses were restored. The quick check restarted from the first question because answer scoring isn't saved on this device."
            : "The quick check restarted from the first question because answer scoring isn't saved on this device."
          : safe.phase === "respond" && restoredWriting
            ? "Your written responses were restored. Your earlier quick-check score isn't saved on this device."
            : null
      );
      // Feedback is deliberately NOT restored — the learner asks for fresh coaching after a reload,
      // and nothing here issues that request automatically.
    }
    setHydrated(true);
  }, [userScope, lesson.slug, p.identify.length]);

  useEffect(() => {
    if (!hydrated || !userScope) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    // Light debounce so typing never blocks on a write; no network, no server request.
    saveTimer.current = setTimeout(() => {
      const ok = saveAuthoredLessonProgress(userScope, lesson.slug, {
        phase,
        identifyIndex: idx,
        writeText,
        followText,
        followUnlocked
      });
      setSaveState(ok ? "saved" : "unavailable");
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [hydrated, userScope, lesson.slug, phase, idx, writeText, followText, followUnlocked]);

  const resetPractice = useCallback(() => {
    if (userScope) clearAuthoredLessonProgress(userScope, lesson.slug);
    setPhase("identify");
    setIdx(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setScoreAvailable(true);
    setResumeNotice(null);
    setWriteText("");
    setFollowText("");
    setFollowUnlocked(false);
    setFeedback(null);
    setRubricVerdicts(null);
    setResponseReview(null);
    setError(null);
    setConfirmingReset(false);
  }, [userScope, lesson.slug]);

  const current = p.identify[idx];

  const checkIdentify = () => {
    if (selected === null) return;
    if (selected === current.correct) setCorrectCount((c) => c + 1);
    setRevealed(true);
  }
  const nextIdentify = () => {
    if (idx + 1 < p.identify.length) {
      setIdx((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      setPhase("respond");
    }
  }

  const getFeedback = async () => {
    setBusy(true);
    setError(null);
    // Clear any previous result before asking again: if this attempt fails, the learner must see the
    // honest unavailable state alone — never a stale coaching card sitting next to an error.
    setFeedback(null);
    setRubricVerdicts(null);
    setResponseReview(null);
    try {
      const res = await fetch("/api/ai/side-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization: lesson.organization,
          eventType: lesson.eventType,
          level: "BEGINNER",
          // Authored scenario + rubric drive the feedback; the AI validates the learner against these.
          // The coach analyzes the learner's work (it never role-plays the character). BOTH responses
          // travel in latestStudentSpeech — the field the coach is explicitly instructed to evaluate —
          // so feedback covers the initial answer AND the follow-up, not just the last thing typed
          // (C5C1a). The COACH_NOTE rides with the rubric to require every category + honest
          // no-strength handling.
          scenario: scenario.text,
          goals: [...p.write.rubric.map((r) => `${r.id} — ${r.label}`), COACH_NOTE],
          // Stable machine IDs. Only the authored lesson sends these, so the structured-rubric
          // contract applies to this surface alone — Debate and the role-play rooms are untouched.
          rubricIds: p.write.rubric.map((r) => r.id),
          stage: "Guided lesson practice — evaluate the learner's initial response AND follow-up against every lesson-rubric item.",
          transcript: [
            { role: "MODERATOR", content: `Scenario: ${scenario.title}` },
            { role: "AFFIRMATIVE", content: writeText.trim() },
            { role: "MODERATOR", content: `${p.followUp.speaker}: ${p.followUp.question}` }
          ],
          latestStudentSpeech: `INITIAL RESPONSE:\n${writeText.trim()}\n\nRESPONSE TO FOLLOW-UP:\n${followText.trim()}`,
          requestType: "turn-feedback"
        })
      });
      if (!res.ok) throw new Error("The coach is unavailable right now.");
      const data = (await res.json()) as Feedback;
      // Integrity guardrails: a provider-outage fallback arrives as HTTP 200 with `unavailable: true`
      // and canned text — never show that as feedback on the learner's words. Same for an empty
      // payload. Both surface the honest unavailable state + Retry; the learner's responses stay put.
      if (data.unavailable) throw new Error("The coach is unavailable right now.");
      if (!data.strength && !data.improvement && !data.example) throw new Error("No feedback came back.");
      // Rubric-complete AND evidence-anchored, or nothing. Category coverage alone would let four
      // generic comments through, so every met/partial verdict must quote the learner's actual
      // words from the response it names. Proof that BOTH submissions were read comes from
      // `responseReview`, not from criterion evidence — a response that genuinely demonstrates
      // nothing is entitled to produce no evidence (M7B). The whole payload goes in, so the
      // coach's own `example` can never be mistaken for the learner's words.
      const verdict = validateAuthoredRubricFeedback(data, {
        rubric: p.write.rubric,
        initialResponse: writeText.trim(),
        followUpResponse: followText.trim()
      });
      if (!verdict.ok) {
        throw new Error("The coach's feedback didn't check out against what you wrote.");
      }
      setResponseReview(verdict.review);
      setRubricVerdicts(verdict.items);
      setFeedback(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // ---- Identify phase (deterministic multiple choice) ----------------------------------------
  if (phase === "identify") {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Read the situation — question {idx + 1} of {p.identify.length}</CardTitle>
            {/* Shown ONLY when this session earned it. Never a reconstructed or placeholder number. */}
            {scoreAvailable ? (
              <span className="text-sm text-muted-foreground">{correctCount}/{idx + (revealed ? 1 : 0)} correct</span>
            ) : (
              <span className="text-sm text-muted-foreground">Quick-check score isn&apos;t saved on this device</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
        {/* M11R2: why the quick check restarted, or why no earlier score is shown. Visible text with
            an icon — never colour alone — and it never claims work was lost or blames the learner. */}
        {resumeNotice ? (
          <p className="flex items-start gap-1.5 rounded-md border bg-muted/40 p-3 text-xs leading-6 text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{resumeNotice}</span>
          </p>
        ) : null}
          <p className="text-sm font-medium">{current.prompt}</p>
          <div className="space-y-2" role="group" aria-label="Answer choices">
            {current.choices.map((choice) => {
              const isSel = selected === choice;
              const isCorrect = choice === current.correct;
              const showState = revealed && (isCorrect || isSel);
              return (
                <button
                  key={choice}
                  type="button"
                  disabled={revealed}
                  aria-pressed={isSel}
                  onClick={() => setSelected(choice)}
                  className={`flex w-full items-start gap-2 rounded-md border p-2 text-left text-sm ${
                    showState ? (isCorrect ? "border-success/60 bg-success/10" : "border-destructive/60 bg-destructive/10") : isSel ? "border-primary bg-primary/10" : "bg-background hover:bg-muted"
                  }`}
                >
                  {revealed ? (
                    isCorrect ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> : isSel ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden /> : <span className="h-4 w-4 shrink-0" />
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
              <p className="font-semibold">{selected === current.correct ? "Correct" : "Not quite"}</p>
              <p className="mt-1 leading-6 text-muted-foreground">{current.explanation}</p>
            </div>
          ) : null}
          {!revealed ? (
            <Button type="button" size="sm" onClick={checkIdentify} disabled={selected === null}>Check answer</Button>
          ) : (
            <Button type="button" size="sm" onClick={nextIdentify}>{idx + 1 < p.identify.length ? "Next" : "Now try it in your own words"}</Button>
          )}
          <PracticeStatusBar
            saveState={saveState}
            confirmingReset={confirmingReset}
            onAskReset={() => setConfirmingReset(true)}
            onCancelReset={() => setConfirmingReset(false)}
            onConfirmReset={resetPractice}
          />
        </CardContent>
      </Card>
    );
  }

  // ---- Respond phase (learner's own words + one AI feedback exchange) --------------------------
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
          Your turn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
      {/* M11R2: why the quick check restarted, or why no earlier score is shown. Visible text with
          an icon — never colour alone — and it never claims work was lost or blames the learner. */}
      {resumeNotice ? (
        <p className="flex items-start gap-1.5 rounded-md border bg-muted/40 p-3 text-xs leading-6 text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{resumeNotice}</span>
        </p>
      ) : null}
        <div>
          <p className="text-sm font-semibold">{p.write.instruction}</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {p.write.rubric.map((r) => (
              <li key={r.id} className="flex gap-2"><span aria-hidden className="text-primary">•</span><span>{r.label}</span></li>
            ))}
          </ul>
          <Textarea
            value={writeText}
            onChange={(e) => setWriteText(e.target.value)}
            placeholder={p.write.placeholder}
            className="mt-2 min-h-24"
            maxLength={MAX_STORED_RESPONSE_CHARS}
            disabled={busy}
          />
          {wordCount(writeText) < MIN_RESPONSE_WORDS ? (
            <p className="mt-2 text-xs text-muted-foreground">{SHORT_RESPONSE_HINT}</p>
          ) : null}
          {!followUnlocked ? (
            <Button
              type="button"
              size="sm"
              className="mt-2"
              onClick={() => setFollowUnlocked(true)}
              disabled={wordCount(writeText) < MIN_RESPONSE_WORDS}
            >
              Continue to the follow-up
            </Button>
          ) : null}
        </div>

        {followUnlocked ? (
        <div className="rounded-md border border-warning/50 bg-warning/[0.06] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warning">{p.followUp.speaker}</p>
          <p className="mt-1 leading-7 text-foreground">{p.followUp.question}</p>
          <p className="mt-1 text-xs text-muted-foreground">{p.followUp.note}</p>
          <Textarea
            value={followText}
            onChange={(e) => setFollowText(e.target.value)}
            placeholder="Your response…"
            className="mt-2 min-h-20"
            maxLength={MAX_STORED_RESPONSE_CHARS}
            disabled={busy}
          />
          {wordCount(followText) < MIN_RESPONSE_WORDS ? (
            <p className="mt-2 text-xs text-muted-foreground">{SHORT_RESPONSE_HINT}</p>
          ) : null}
        </div>
        ) : null}

        {feedback ? (
          <div className="rounded-md border border-success/50 bg-success/[0.06] p-3 text-sm">
            <p className="font-semibold text-success">Feedback on your response</p>
            {feedback.strength ? <p className="mt-2"><span className="font-semibold">Worked:</span> {feedback.strength}</p> : null}
            {feedback.improvement ? <p className="mt-1"><span className="font-semibold">Improve:</span> {feedback.improvement}</p> : null}

            {/* Proof that BOTH submissions were read, shown separately from the rubric so a learner
                never reads a review excerpt as evidence that some criterion was met. Already ordered
                initial-then-follow-up by the validator. */}
            {responseReview ? (
              <div className="mt-3 border-t border-success/30 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Both responses reviewed</p>
                <ul className="mt-2 space-y-2">
                  {responseReview.map((r) => (
                    <li key={r.response}>
                      <p className="font-medium leading-6">{responseReviewLabel(r.response)}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">You wrote:</span>{" "}
                        <span className="italic">&ldquo;{r.excerpt}&rdquo;</span>
                      </p>
                      <p className="leading-6">{r.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Every authored rubric item, exactly once, in the authored order. Status is carried by
                a word — never by colour alone — and carries no score or point value. */}
            {rubricVerdicts ? (
              <ul className="mt-3 space-y-3 border-t border-success/30 pt-3">
                {orderByAuthoredRubric(rubricVerdicts, p.write.rubric).map(({ item, feedback: v }) => (
                  <li key={item.id}>
                    {/* Learner-facing label first; the machine ID is never shown as the label. */}
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {rubricStatusLabel(v.status)}
                    </p>
                    <p className="font-medium leading-6">{item.label}</p>
                    {v.evidence?.length ? (
                      <ul className="mt-1 space-y-1">
                        {v.evidence.map((e, i) => (
                          <li key={i} className="text-xs text-muted-foreground">
                            <span className="font-semibold">
                              {e.response === "initial" ? "From your first response:" : "From your follow-up:"}
                            </span>{" "}
                            <span className="italic">&ldquo;{e.excerpt}&rdquo;</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="mt-1 leading-6">{v.comment}</p>
                  </li>
                ))}
              </ul>
            ) : null}

            {feedback.example ? (
              <p className="mt-2 rounded border border-success/30 bg-success/10 p-2">
                <span className="font-semibold">Example revision</span>{" "}
                <span className="text-xs text-muted-foreground">(written by the coach — not your words)</span>
                <span className="mt-1 block italic">{feedback.example}</span>
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">Guided practice — this feedback isn&apos;t a score, and nothing here is recorded.</p>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">
            <span className="text-warning">{error} Your responses are saved — try again.</span>
            <Button type="button" size="sm" variant="outline" onClick={getFeedback} disabled={busy}>
              <RefreshCw className="h-4 w-4" aria-hidden /> Retry
            </Button>
          </div>
        ) : null}

        {followUnlocked ? (
        <Button type="button" onClick={getFeedback} disabled={busy || wordCount(writeText) < MIN_RESPONSE_WORDS || wordCount(followText) < MIN_RESPONSE_WORDS}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MessageSquare className="h-4 w-4" aria-hidden />}
          {feedback ? "Revise and get feedback again" : "Get coaching feedback"}
        </Button>
        ) : null}

        {feedback ? (
          <p className="text-xs text-muted-foreground">
            Now revise your answers above using that feedback, then get feedback again — the revision
            is the part that builds the skill. Feedback itself isn&apos;t saved, so after a reload
            you&apos;ll have your own writing back but will need to ask for coaching again.
          </p>
        ) : null}

        <PracticeStatusBar
          saveState={saveState}
          confirmingReset={confirmingReset}
          onAskReset={() => setConfirmingReset(true)}
          onCancelReset={() => setConfirmingReset(false)}
          onConfirmReset={resetPractice}
        />
      </CardContent>
    </Card>
  );
}
