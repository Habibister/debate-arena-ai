"use client";

import { useId, useState } from "react";
import { CheckCircle2, CircleHelp, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ConceptEducationQuestion } from "@/lib/education/types";

/**
 * Deterministic knowledge checks for a migrated concept lesson (M13E1B).
 *
 * A client component ONLY because selecting an answer is ephemeral interaction state. It is
 * deliberately inert in every other respect:
 *
 *   - no mastery, no XP, no rating, no completion, no percentage, no streak
 *   - no localStorage, no sessionStorage, no cookie
 *   - no fetch, no server action, no API route, no AI
 *
 * Nothing here is saved, and the UI says so. The last question is the catalog's `masteryCheck`
 * field; it is shown to the learner as a FINAL CHECK, never as mastery, because answering one
 * multiple-choice item is not evidence that a skill survived anything.
 */

export type ConceptCheckGroup = "guided" | "independent" | "final";

export type ConceptCheck = { group: ConceptCheckGroup; question: ConceptEducationQuestion };

const GROUP_LABEL: Record<ConceptCheckGroup, string> = {
  guided: "Guided check",
  independent: "Independent check",
  final: "Final check"
};

function CheckItem({ check, index }: { check: ConceptCheck; index: number }) {
  const { question } = check;
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const baseId = useId();
  const feedbackId = `${baseId}-feedback`;
  const hintId = `${baseId}-hint`;
  const isCorrect = submitted && selected === question.correctAnswer;

  return (
    <li className="rounded-lg border bg-card p-4">
      <p className="eyebrow">{GROUP_LABEL[check.group]} {index}</p>
      <p className="mt-2 font-semibold text-foreground">{question.prompt}</p>

      <div className="mt-3 space-y-2" role="group" aria-label={`${GROUP_LABEL[check.group]} ${index} answer choices`}>
        {question.choices.map((choice) => {
          const chosen = selected === choice;
          const correctChoice = choice === question.correctAnswer;
          // After submitting, the learner's own choice and the correct one are both marked. The
          // mark is an ICON plus a word in the feedback line below — never colour on its own.
          const revealed = submitted && (chosen || correctChoice);
          return (
            <button
              key={choice}
              type="button"
              aria-pressed={chosen}
              onClick={() => {
                if (submitted) return;
                setSelected(choice);
              }}
              disabled={submitted}
              className={cn(
                "focus-ring flex min-h-11 w-full min-w-11 items-start gap-2 rounded-md border p-3 text-left text-sm",
                revealed
                  ? correctChoice
                    ? "border-success/60 bg-success/10"
                    : "border-destructive/60 bg-destructive/10"
                  : chosen
                    ? "border-primary bg-primary/10"
                    : "bg-background hover:bg-muted",
                // Disabled state carries a real cursor change and a border, not opacity alone.
                submitted && !revealed ? "cursor-default border-dashed" : null
              )}
            >
              {submitted ? (
                correctChoice ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                ) : chosen ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                ) : (
                  <span className="mt-0.5 h-4 w-4 shrink-0" />
                )
              ) : (
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border" />
              )}
              <span className="min-w-0 break-words">{choice}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!submitted ? (
          <Button
            type="button"
            size="sm"
            disabled={selected === null}
            onClick={() => setSubmitted(true)}
            className="h-auto min-h-11 min-w-11"
          >
            Check my answer
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setSubmitted(false);
              setSelected(null);
              setHintOpen(false);
            }}
            className="h-auto min-h-11 min-w-11"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Try this one again
          </Button>
        )}
        {/* The hint is the lesson's OWN authored hint. It nudges; it never reveals the answer. */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-expanded={hintOpen}
          aria-controls={hintId}
          onClick={() => setHintOpen((open) => !open)}
          className="h-auto min-h-11 min-w-11"
        >
          <CircleHelp className="h-4 w-4" aria-hidden />
          {hintOpen ? "Hide hint" : "Show hint"}
        </Button>
      </div>

      {hintOpen ? (
        <p id={hintId} className="mt-3 rounded-md border border-dashed bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
          <span className="font-semibold text-foreground">Hint. </span>
          {question.hint}
        </p>
      ) : null}

      {/* Announced when it appears, so a screen-reader user is not left to discover it. */}
      <div id={feedbackId} aria-live="polite">
        {submitted ? (
          <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              {isCorrect ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
              )}
              {isCorrect ? "Correct" : "Not yet"}
            </p>
            <p className="mt-1 leading-6 text-muted-foreground">{question.explanation}</p>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function ConceptEducationLessonPractice({ checks }: { checks: readonly ConceptCheck[] }) {
  let guided = 0;
  let independent = 0;
  let final = 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Check your understanding</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* The honesty statement, stated before the first question rather than after the last. */}
        <p className="text-sm leading-6 text-muted-foreground">
          These checks are for you. Nothing here is saved, scored, or recorded — no progress, no
          mastery, no XP — and answering them is not evidence that you have mastered the skill.
          Retry any of them as often as you like.
        </p>
        <ul className="space-y-3">
          {checks.map((check) => {
            const index =
              check.group === "guided" ? ++guided : check.group === "independent" ? ++independent : ++final;
            return <CheckItem key={`${check.group}-${index}-${check.question.prompt}`} check={check} index={index} />;
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
