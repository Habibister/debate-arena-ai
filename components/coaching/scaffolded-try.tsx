"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, CircleHelp, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  evaluateScaffoldFor,
  guidedApplicationFor,
  starterCategoriesFor,
  contextualStarter,
  SLOT,
  SUPPORT_POLICY,
  type ScaffoldEvaluation,
  type SupportLevel
} from "@/lib/education/coaching";
import type { ConceptEducationLanguageFrame, ConceptEducationScaffoldedTry } from "@/lib/education/types";

/**
 * SCAFFOLDED TRY — the bridge between teaching and guided performance.
 *
 * The learner is given a situation and a frame with blanks, and writes the reasoning that fills each
 * blank. This is the first place in a lesson where a student PRODUCES the move rather than recognises
 * it. Feedback names the single most useful thing to fix and stops; it never writes the repaired
 * sentence. When the target move is materially incomplete the learner is asked to try the SAME move
 * again — the exercise does not advance on feedback alone. That required retry is the teaching model,
 * not a UI preference.
 *
 * NON-DURABLE, and deliberately inert beyond the page:
 *   - no fetch, no API route, no provider call — evaluation is the lesson's own tests, applied locally
 *   - no localStorage, no cookie, no server write
 *   - no mastery, no XP, no completion, no review scheduling
 * Nothing a learner does here is recorded anywhere, and the copy says so.
 *
 * STARTERS ARE SCAFFOLDS. "Need a starter?" offers only categories whose skill is unlocked for THIS
 * lesson, instantiates the frame in the learner's topic, and stops at the blank. Every starter is
 * re-checked by `contextualStarter` before it is shown, so a starter that would read as a finished
 * answer is never rendered.
 */

type SlotValues = Record<string, string>;

/** Slots are addressed by position; each lesson's evaluator reads them in the lesson's own order. */
function keyFor(index: number): string {
  return `slot-${index}`;
}

/** The only evaluation a lesson with no registered evaluator can receive: it cannot pass. Says
 *  nothing about a guided round: whether one exists is the lesson's, rendered below from `application`. */
const UNCHECKABLE: ScaffoldEvaluation = {
  complete: false,
  coach: "This exercise cannot be checked yet.",
  retryRequired: false
};

/** The learner's sentence, assembled from the frame and their own words, for display only. */
function assemble(frame: string, values: string[]): string {
  let i = 0;
  return frame.replace(new RegExp(SLOT, "g"), () => values[i++]?.trim() || SLOT);
}

export function ScaffoldedTry({
  lessonId,
  scaffoldedTry,
  languageFrames,
  supportLevel = "HIGH_SUPPORT",
  topic
}: {
  lessonId: string;
  scaffoldedTry: ConceptEducationScaffoldedTry;
  languageFrames?: readonly ConceptEducationLanguageFrame[];
  supportLevel?: SupportLevel;
  /** The round's motion, when the caller has one. The lesson view has none and passes nothing:
   *  a lesson exercise is set against an ARGUMENT (`scaffoldedTry.opponentClaim`), so its starters
   *  are argument-grounded. Never invented here. */
  topic?: string;
}) {
  const baseId = useId();
  const policy = SUPPORT_POLICY[supportLevel];
  const application = guidedApplicationFor(lessonId);
  // Only categories with a frame in THIS lesson: an unlocked category with no authored starter would
  // be a button that does nothing, and a learner asking for help must always get some.
  const categories = useMemo(
    () => starterCategoriesFor(lessonId).filter((category) => languageFrames?.some((frame) => frame.purpose === category.purpose)),
    [lessonId, languageFrames]
  );

  const [values, setValues] = useState<SlotValues>({});
  const [attempts, setAttempts] = useState(0);
  const [evaluation, setEvaluation] = useState<ScaffoldEvaluation | null>(null);
  const [starterOpen, setStarterOpen] = useState(policy.startersVisible);
  const [shownStarter, setShownStarter] = useState<{ label: string; text: string } | null>(null);

  const slotValues = scaffoldedTry.slots.map((_, i) => values[keyFor(i)] ?? "");
  const anyFilled = slotValues.some((v) => v.trim().length > 0);

  function submit() {
    // Fail closed: no evaluator for this lesson means no completion and no guided launch.
    const result = evaluateScaffoldFor(
      lessonId,
      scaffoldedTry.slots.map((_, i) => values[keyFor(i)] ?? ""),
      { motion: scaffoldedTry.motion }
    ) ?? UNCHECKABLE;
    setEvaluation(result);
    setAttempts((n) => n + 1);
  }

  function showStarter(categoryId: string) {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    const frame = languageFrames?.find((f) => f.purpose === category.purpose);
    const raw = frame?.starters[0];
    if (!raw) return;
    // LIVE CONTEXT PATH. Both kinds of context the caller has are passed: the motion when there is
    // one (`topic`, absent on the lesson page) and the argument being answered (the exercise's own
    // `opponentClaim`). The learner reads "They argue that <their actual claim>, but ___" rather
    // than a bare template. Re-checked after substitution: if it would read as a finished answer it
    // is not shown at all, and a blank is always left for the learner.
    const text = contextualStarter(raw, { topic, opponentClaim: scaffoldedTry.opponentClaim });
    if (text) setShownStarter({ label: category.label, text });
  }

  const complete = evaluation?.complete === true;
  const mustRetry = evaluation !== null && evaluation.retryRequired;

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-muted-foreground">
        Nothing you write here is saved, scored, or recorded. It is a place to try the move yourself
        before you use it in a round.
      </p>

      <div className="rounded-lg border bg-muted/20 p-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">The situation</p>
        <p className="mt-1 break-words leading-7 text-foreground">{scaffoldedTry.prompt}</p>
      </div>

      {/* The frame, as the learner will fill it. Words in the frame are structure; the blanks are theirs. */}
      <p className="break-words rounded-md border bg-card p-3 font-mono text-sm leading-7 text-foreground">
        {assemble(scaffoldedTry.frame, slotValues)}
      </p>

      <div className="grid gap-3">
        {scaffoldedTry.slots.map((slot, index) => {
          const key = keyFor(index);
          const issueHere = evaluation && !evaluation.complete && evaluation.slot === slot;
          const inputId = `${baseId}-${key}`;
          return (
            <div key={slot}>
              <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
                {index + 1}. {slot}
                {issueHere ? <span className="ml-2 text-xs font-normal text-warning">— fix this one</span> : null}
              </label>
              <textarea
                id={inputId}
                value={values[key] ?? ""}
                onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
                rows={2}
                className={cn(
                  "mt-1 w-full rounded-md border bg-background p-2 text-sm leading-6",
                  issueHere ? "border-warning" : "border-input"
                )}
                aria-describedby={issueHere ? `${baseId}-coach` : undefined}
              />
            </div>
          );
        })}
      </div>

      {/* NEED A STARTER? Categories come only from skills unlocked for this lesson. At HIGH support
          the control is open; at MEDIUM/LOW it is available on request; at INDEPENDENT it does not
          exist. A starter is opening words and a blank — never the answer. */}
      {policy.startersOnRequest && categories.length > 0 ? (
        <div className="rounded-lg border p-3">
          <button
            type="button"
            onClick={() => setStarterOpen((open) => !open)}
            aria-expanded={starterOpen}
            aria-controls={`${baseId}-starters`}
            className="focus-ring inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
          >
            <CircleHelp className="h-4 w-4" aria-hidden />
            Need a starter?
          </button>
          {starterOpen ? (
            <div id={`${baseId}-starters`} className="mt-2 flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button key={category.id} type="button" variant="outline" size="sm" className="h-auto min-h-11 min-w-11" onClick={() => showStarter(category.id)}>
                  {category.label}
                </Button>
              ))}
            </div>
          ) : null}
          {shownStarter ? (
            <p className="mt-3 rounded-md border bg-muted/30 p-3 text-sm leading-6">
              <span className="font-semibold">{shownStarter.label}. </span>
              <span className="font-mono">{shownStarter.text}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                The words are a start. What goes in the blank is yours.
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" className="h-auto min-h-11 min-w-11" onClick={submit} disabled={!anyFilled}>
          {attempts === 0 ? "Check my attempt" : "Check again"}
        </Button>
        {attempts > 0 ? (
          <span className="text-xs text-muted-foreground">
            Attempt {attempts}. Nothing here is recorded.
          </span>
        ) : null}
      </div>

      {/* FEEDBACK, then a REQUIRED RETRY. The coach names the one thing to fix in the one slot it lives
          in, and does not write the repaired sentence. The path forward stays closed until the move
          is complete — feedback is not the end of the exercise. */}
      {evaluation ? (
        <div
          id={`${baseId}-coach`}
          role="status"
          className={cn(
            "rounded-lg border p-4",
            complete ? "border-success/50 bg-success/[0.06]" : "border-warning/50 bg-warning/[0.06]"
          )}
        >
          {complete ? (
            <>
              <p className="font-semibold">Every blank is filled, and the shape holds.</p>
              {/* Honest about what this check IS: a shape check by the lesson's own evaluator (every
                  slot present, none of the lesson's named faults). It did not judge whether what was
                  written is true or whether the right point was chosen. Where the lesson has a guided
                  round, a coach with the whole round in view does that there; where it has none
                  (a conceptual or evaluative lesson), nothing here does, and the copy must not point
                  at a round that does not exist. */}
              {/* Where a lesson verified something EXACTLY — today only the answer-types label, drawn
                  from a closed four-term vocabulary — the evaluator says so in its own words, and that
                  sentence replaces the generic one. Everywhere else the field is absent and the copy is
                  unchanged. Neither version ever claims the learner's reasoning was read. */}
              {evaluation.exactCheck ? (
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{evaluation.exactCheck}</p>
              ) : (
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  This checked the shape of the move: every part is present and none of the named faults is
                  there. It did not judge whether what you wrote is true or whether you chose the point that
                  matters{application ? " — that is what the guided round is for." : ". Compare it with the worked example above."}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 font-semibold">
                <RotateCcw className="h-4 w-4 shrink-0 text-warning" aria-hidden />
                One thing to fix{evaluation.slot ? ` — the “${evaluation.slot}”` : ""}
              </p>
              <p className="mt-1 text-sm leading-6 text-foreground">{evaluation.coach}</p>
              {mustRetry ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Change that part and check again.{application ? " The next step opens once the move is complete." : ""}
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {/* GUIDED DEBATE, launched from Learn. Opens only after a complete attempt, so the learner
          arrives having produced the move at least once. The link carries the lesson so the round
          knows which skill is primary and which are reinforcement — nothing else is scored. */}
      {application ? (
        <div>
          {complete ? (
            <Link
              href={`/debate?track=debate&guided=${encodeURIComponent(lessonId)}` as Route}
              className={cn(buttonVariants({ size: "sm" }), "h-auto min-h-11 min-w-11 whitespace-normal px-4 text-center")}
            >
              Use it in a guided round
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              The guided round opens after a complete attempt here.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
