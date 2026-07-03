"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Lock, Repeat, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  buildQuestion,
  COPY,
  DRILL_REQUIRED_CORRECT,
  isDrillComplete,
  type GameCard,
  type GameSettings,
  type Question,
  recordDrillAnswer
} from "@/lib/study-games";
import { playBeep } from "@/components/study/games/feedback";

type Props = {
  cards: GameCard[];
  settings: GameSettings;
  onExit: () => void;
  onReviewMissed: (missed: GameCard[]) => void;
  onRoundComplete: () => void;
};

// Lock-In: every term starts unlocked; answer it correctly twice to lock it. A wrong answer resets
// that term's lock progress to 0/2 (same rule as Memory Loop) and loops it back. Reuses the shared
// drill helpers. Session-only progress — no permanent mastery claim.
export function LockInGame({ cards, settings, onExit, onReviewMissed, onRoundComplete }: Props) {
  const progress = useRef(new Map<string, number>());
  const missed = useRef(new Map<string, GameCard>());
  const ids = useRef(cards.map((c) => c.id));
  const cursor = useRef(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [, force] = useState(0);

  const nextCard = useCallback(() => {
    const remaining = cards.filter((c) => (progress.current.get(c.id) ?? 0) < DRILL_REQUIRED_CORRECT);
    if (remaining.length === 0) {
      setDone(true);
      onRoundComplete();
      return;
    }
    const card = remaining[cursor.current % remaining.length];
    cursor.current += 1;
    setQuestion(buildQuestion(card, cards, "term-to-def"));
    setSelected(null);
    setFeedback(null);
  }, [cards, onRoundComplete]);

  useEffect(() => {
    nextCard();
  }, [nextCard]);

  const answered = selected !== null;

  function choose(index: number) {
    if (answered || !question) {
      return;
    }
    const isCorrect = index === question.correctIndex;
    setSelected(index);
    recordDrillAnswer(progress.current, question.card.id, isCorrect); // wrong -> resets to 0/2
    if (!isCorrect) {
      missed.current.set(question.card.id, question.card);
    }
    playBeep(settings.sound, isCorrect ? "correct" : "incorrect");
    const locked = (progress.current.get(question.card.id) ?? 0) >= DRILL_REQUIRED_CORRECT;
    setFeedback(isCorrect ? (locked ? COPY.lockedIn : COPY.almostLocked) : COPY.loopingBack);
    force((n) => n + 1);
  }

  const lockedCount = ids.current.filter((id) => (progress.current.get(id) ?? 0) >= DRILL_REQUIRED_CORRECT).length;
  const percent = ids.current.length > 0 ? Math.round((lockedCount / ids.current.length) * 100) : 0;
  const missedList = Array.from(missed.current.values());
  const currentCount = question ? progress.current.get(question.card.id) ?? 0 : 0;

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-4 p-5">
          <Badge variant="secondary">Lock-In Mode</Badge>
          <h2 className="text-2xl font-bold">Session complete — {ids.current.length} term{ids.current.length === 1 ? "" : "s"} locked in.</h2>
          <p className="text-muted-foreground">{COPY.patternGrowing} These results are for this session only.</p>
          {missedList.length > 0 ? (
            <p className="text-sm text-muted-foreground">Terms that needed extra loops: {missedList.map((c) => c.term).join(", ")}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {missedList.length > 0 ? (
              <Button type="button" onClick={() => onReviewMissed(missedList)}>
                Review missed terms
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                progress.current = new Map();
                missed.current = new Map();
                cursor.current = 0;
                setDone(false);
                nextCard();
              }}
            >
              Play again
            </Button>
            <Button type="button" variant="ghost" onClick={onExit}>
              Back to games
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (question === null) {
    return null;
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onExit}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Games
          </Button>
          <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Lock className="h-4 w-4" aria-hidden />
            {lockedCount} / {ids.current.length} locked
          </span>
        </div>

        <div>
          <Badge variant="secondary">Lock-In Mode</Badge>
          <p className="mt-2 text-sm text-muted-foreground">{COPY.lockIntro} Answer each term correctly twice to lock it.</p>
        </div>

        <Progress value={percent} />

        <div className="rounded-lg border bg-background p-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Which definition matches this term?</p>
            {/* Per-term lock progress: e.g. "1/2 locked" */}
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden />
              {currentCount}/{DRILL_REQUIRED_CORRECT} locked
            </span>
          </div>
          <p className="mt-1 text-lg font-bold">{question.prompt}</p>
        </div>

        <div className="grid gap-2">
          {question.choices.map((choice, index) => {
            const isCorrect = index === question.correctIndex;
            const isChosen = index === selected;
            const showState = answered && (isCorrect || isChosen);
            return (
              <button
                key={choice}
                type="button"
                onClick={() => choose(index)}
                disabled={answered}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border bg-background p-3 text-left text-sm",
                  !settings.reducedMotion && "transition-colors",
                  !answered && "hover:border-primary/60 hover:bg-muted/50",
                  showState && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                  answered && isChosen && !isCorrect && "border-amber-500/60 bg-amber-500/10"
                )}
              >
                <span>{choice}</span>
                {showState && isCorrect ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : null}
                {answered && isChosen && !isCorrect ? <X className="h-4 w-4 text-amber-600" aria-hidden /> : null}
              </button>
            );
          })}
        </div>

        {answered ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1 text-sm font-semibold">
              {feedback === COPY.loopingBack ? <Repeat className="h-4 w-4 text-amber-600" aria-hidden /> : <Lock className="h-4 w-4 text-emerald-600" aria-hidden />}
              {feedback}
            </p>
            <Button type="button" onClick={nextCard}>
              Next
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
