"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MessageSquare, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { RoleplayLesson } from "@/lib/roleplay-lessons";

type Feedback = { strength?: string; improvement?: string; example?: string; unavailable?: boolean };

// Lightweight meaningful-response gate: blocks blank/obvious-nonsense submissions while still
// allowing genuinely weak answers (which are exactly what coaching is for).
const MIN_RESPONSE_WORDS = 8;
const SHORT_RESPONSE_HINT = "Write at least one complete sentence so the coach has something meaningful to evaluate.";
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Appended to the authored rubric in `goals` so the coach evaluates the WHOLE exchange against
// every rubric item — and never invents praise for empty-quality responses. (≤300 chars, schema cap.)
const COACH_NOTE =
  "Evaluate BOTH responses against every rubric item above; name any item the learner missed explicitly; give ONE revised example that improves the whole exchange; if no item is genuinely met, say exactly: No rubric-aligned strength is demonstrated yet. Typing alone is not a strength.";

// Interactive practice for a role-play lesson. The lesson is authored & deterministic: it owns the
// scenario, roles, rubric, and the in-character follow-up. The AI (existing Side Coach route) is used
// ONLY to give short feedback on the learner's own words, validated against the authored rubric
// (passed as `goals`). It never invents the lesson or scores anything — no rating, record, or mastery.
export function RoleplayLessonPractice({ lesson }: { lesson: RoleplayLesson }) {
  const p = lesson.practice;
  const [phase, setPhase] = useState<"identify" | "respond">("identify");
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const [writeText, setWriteText] = useState("");
  const [followText, setFollowText] = useState("");
  // The follow-up unlocks only after the main written response is submitted — no skipping it.
  const [followUnlocked, setFollowUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const current = p.identify[idx];

  function checkIdentify() {
    if (selected === null) return;
    if (selected === current.correct) setCorrectCount((c) => c + 1);
    setRevealed(true);
  }
  function nextIdentify() {
    if (idx + 1 < p.identify.length) {
      setIdx((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      setPhase("respond");
    }
  }

  async function getFeedback() {
    setBusy(true);
    setError(null);
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
          scenario: lesson.scenario.text,
          goals: [...p.write.rubric, COACH_NOTE],
          stage: "Guided lesson practice — evaluate the learner's initial response AND follow-up against every lesson-rubric item.",
          transcript: [
            { role: "MODERATOR", content: `Scenario: ${lesson.scenario.title}` },
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
            <span className="text-sm text-muted-foreground">{correctCount}/{idx + (revealed ? 1 : 0)} correct</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
                    showState ? (isCorrect ? "border-emerald-500/50 bg-emerald-500/10" : "border-red-500/50 bg-red-500/10") : isSel ? "border-primary bg-primary/10" : "bg-background hover:bg-muted"
                  }`}
                >
                  {revealed ? (
                    isCorrect ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden /> : isSel ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden /> : <span className="h-4 w-4 shrink-0" />
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
        <div>
          <p className="text-sm font-semibold">{p.write.instruction}</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {p.write.rubric.map((r) => (
              <li key={r} className="flex gap-2"><span aria-hidden className="text-primary">•</span><span>{r}</span></li>
            ))}
          </ul>
          <Textarea
            value={writeText}
            onChange={(e) => setWriteText(e.target.value)}
            placeholder={p.write.placeholder}
            className="mt-2 min-h-24"
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
        <div className="rounded-md border border-amber-500/40 bg-amber-500/[0.06] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">{p.followUp.speaker}</p>
          <p className="mt-1 leading-7 text-foreground">{p.followUp.question}</p>
          <p className="mt-1 text-xs text-muted-foreground">{p.followUp.note}</p>
          <Textarea
            value={followText}
            onChange={(e) => setFollowText(e.target.value)}
            placeholder="Your response…"
            className="mt-2 min-h-20"
            disabled={busy}
          />
          {wordCount(followText) < MIN_RESPONSE_WORDS ? (
            <p className="mt-2 text-xs text-muted-foreground">{SHORT_RESPONSE_HINT}</p>
          ) : null}
        </div>
        ) : null}

        {feedback ? (
          <div className="rounded-md border border-emerald-400/30 bg-emerald-500/[0.06] p-3 text-sm">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">Feedback on your response</p>
            {feedback.strength ? <p className="mt-2"><span className="font-semibold">Worked:</span> {feedback.strength}</p> : null}
            {feedback.improvement ? <p className="mt-1"><span className="font-semibold">Improve:</span> {feedback.improvement}</p> : null}
            {feedback.example ? <p className="mt-2 rounded border border-emerald-400/20 bg-emerald-500/10 p-2 italic">Example: {feedback.example}</p> : null}
            <p className="mt-2 text-xs text-muted-foreground">Guided practice — this feedback isn&apos;t a score, and nothing here is recorded.</p>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <span className="text-amber-800 dark:text-amber-200">{error} Your responses are saved — try again.</span>
            <Button type="button" size="sm" variant="outline" onClick={getFeedback} disabled={busy}>
              <RefreshCw className="h-4 w-4" aria-hidden /> Retry
            </Button>
          </div>
        ) : null}

        {followUnlocked ? (
        <Button type="button" onClick={getFeedback} disabled={busy || wordCount(writeText) < MIN_RESPONSE_WORDS || wordCount(followText) < MIN_RESPONSE_WORDS}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MessageSquare className="h-4 w-4" aria-hidden />}
          {feedback ? "Get coaching feedback again" : "Get coaching feedback"}
        </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
