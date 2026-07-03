"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Repeat, X } from "lucide-react";
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
  pickCopy,
  recordDrillAnswer,
  type GameCard,
  type GameSettings,
  type Question
} from "@/lib/study-games";
import { playBeep } from "@/components/study/games/feedback";

type Props = {
  missedCards: GameCard[];
  allCards: GameCard[];
  settings: GameSettings;
  onExit: () => void;
  onRoundComplete: () => void;
};

export function MissedTermsDrill({ missedCards, allCards, settings, onExit, onRoundComplete }: Props) {
  const progress = useRef(new Map<string, number>());
  const ids = useRef(missedCards.map((c) => c.id));
  const cursor = useRef(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [, force] = useState(0);

  const nextCard = useCallback(() => {
    const remaining = missedCards.filter((c) => (progress.current.get(c.id) ?? 0) < DRILL_REQUIRED_CORRECT);
    if (remaining.length === 0) {
      setDone(true);
      onRoundComplete();
      return;
    }
    const card = remaining[cursor.current % remaining.length];
    cursor.current += 1;
    setQuestion(buildQuestion(card, allCards.length >= 4 ? allCards : missedCards, "term-to-def"));
    setSelected(null);
    setFeedback(null);
  }, [missedCards, allCards, onRoundComplete]);

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
    recordDrillAnswer(progress.current, question.card.id, isCorrect);
    playBeep(settings.sound, isCorrect ? "correct" : "incorrect");
    setFeedback(isCorrect ? pickCopy(COPY.correct) : COPY.drillEncourage);
    force((n) => n + 1);
  }

  const clearedCount = ids.current.filter((id) => (progress.current.get(id) ?? 0) >= DRILL_REQUIRED_CORRECT).length;
  const drillPercent = ids.current.length > 0 ? Math.round((clearedCount / ids.current.length) * 100) : 100;

  if (missedCards.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5">
          <Badge variant="secondary">Missed Terms Drill</Badge>
          <p className="text-sm text-muted-foreground">No missed terms yet — play a game first and the tricky ones will collect here.</p>
          <Button type="button" variant="ghost" onClick={onExit}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to games
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <CardContent className="space-y-4 p-5">
          <Badge variant="secondary">Missed Terms Drill</Badge>
          <h2 className="text-2xl font-bold">Those ones stuck.</h2>
          <p className="text-muted-foreground">You looped {ids.current.length} tricky term{ids.current.length === 1 ? "" : "s"} until they locked in.</p>
          <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">{COPY.breakSuggestion}</p>
          <Button type="button" variant="ghost" onClick={onExit}>
            Back to games
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isDrillComplete(progress.current, ids.current) && question === null) {
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
            <Repeat className="h-4 w-4" aria-hidden />
            {clearedCount} / {ids.current.length} locked in
          </span>
        </div>

        <div>
          <Badge variant="secondary">Missed Terms Drill</Badge>
          <p className="mt-2 text-sm text-muted-foreground">{COPY.drillIntro}</p>
        </div>

        <Progress value={drillPercent} />

        <div className="rounded-lg border bg-background p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Which definition matches this term?</p>
          <p className="mt-2 text-lg font-bold">{question?.prompt}</p>
        </div>

        <div className="grid gap-2">
          {question?.choices.map((choice, index) => {
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
            <p className="text-sm font-semibold">{feedback}</p>
            <Button type="button" onClick={nextCard}>
              Next
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
