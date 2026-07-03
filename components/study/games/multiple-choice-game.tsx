"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, RotateCcw, Swords, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  adjustWeight,
  buildQuestion,
  COPY,
  pickCopy,
  pickWeightedCard,
  type GameCard,
  type GameSettings,
  type Question,
  type QuestionMode
} from "@/lib/study-games";
import { playBeep } from "@/components/study/games/feedback";

const QUESTION_SECONDS = 15;

type Props = {
  title: string;
  cards: GameCard[];
  settings: GameSettings;
  mode: QuestionMode;
  variant: "standard" | "boss";
  bossName?: string;
  onExit: () => void;
  onReviewMissed: (missed: GameCard[]) => void;
  onRoundComplete: () => void;
};

export function MultipleChoiceGame({
  title,
  cards,
  settings,
  mode,
  variant,
  bossName,
  onExit,
  onReviewMissed,
  onRoundComplete
}: Props) {
  // Cards can repeat within a round (missed ones weighted to appear more), so the round length is
  // simply the chosen question count.
  const total = settings.questionCount;
  const weights = useRef(new Map<string, number>());
  const lastId = useRef<string | null>(null);
  const missed = useRef(new Map<string, GameCard>());

  const [questionNumber, setQuestionNumber] = useState(1);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [seconds, setSeconds] = useState(QUESTION_SECONDS);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const nextQuestion = useCallback(() => {
    const card = pickWeightedCard(cards, weights.current, lastId.current);
    lastId.current = card.id;
    setQuestion(buildQuestion(card, cards, mode));
    setSelected(null);
    setFeedback(null);
    setSeconds(QUESTION_SECONDS);
  }, [cards, mode]);

  // First question.
  useEffect(() => {
    nextQuestion();
  }, [nextQuestion]);

  const answered = selected !== null;
  const bossMax = total;
  const bossRemaining = Math.max(0, bossMax - correctCount);
  const bossPercent = Math.round((bossRemaining / bossMax) * 100);

  const recordResult = useCallback(
    (isCorrect: boolean) => {
      if (!question) {
        return;
      }
      // Honor the "Repeat missed cards" setting: when off, a miss does not raise the card's weight.
      if (isCorrect || settings.repeatMissed) {
        adjustWeight(weights.current, question.card.id, isCorrect);
      }
      if (isCorrect) {
        setCorrectCount((count) => count + 1);
        missed.current.delete(question.card.id);
      } else {
        missed.current.set(question.card.id, question.card);
      }
      playBeep(settings.sound, isCorrect ? "correct" : "incorrect");
      setFeedback(isCorrect ? pickCopy(COPY.correct) : pickCopy(COPY.incorrect));
    },
    [question, settings.sound, settings.repeatMissed]
  );

  function choose(index: number) {
    if (answered || !question) {
      return;
    }
    setSelected(index);
    recordResult(index === question.correctIndex);
  }

  function advance() {
    if (questionNumber >= total) {
      setFinished(true);
      onRoundComplete();
      return;
    }
    setQuestionNumber((n) => n + 1);
    nextQuestion();
  }

  // Optional gentle per-question timer (off by default). On expiry, reveal the answer as "needs
  // another look" — never a harsh fail.
  useEffect(() => {
    if (!settings.timer || answered || finished || !question) {
      return;
    }
    if (seconds <= 0) {
      setSelected(-1); // reveals correct answer without marking a wrong choice
      missed.current.set(question.card.id, question.card);
      adjustWeight(weights.current, question.card.id, false);
      setFeedback(pickCopy(COPY.incorrect));
      return;
    }
    const timer = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [settings.timer, seconds, answered, finished, question]);

  if (finished) {
    const missedList = Array.from(missed.current.values());
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const bossDefeated = variant === "boss" && bossRemaining <= 0;
    return (
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <Badge variant="secondary">{title}</Badge>
            <h2 className="mt-3 text-2xl font-bold">
              {variant === "boss" ? (bossDefeated ? `${bossName} reviewed!` : `Great effort against ${bossName}.`) : "Practice complete."}
            </h2>
            <p className="mt-1 text-muted-foreground">You practiced {total} terms.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Session score" value={`${correctCount}/${total}`} />
            <Stat label="Accuracy" value={`${accuracy}%`} />
            <Stat label="Need another loop" value={`${missedList.length}`} />
          </div>

          {missedList.length > 0 ? (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-semibold">{missedList.length} term{missedList.length === 1 ? "" : "s"} need another loop</p>
              <p className="mt-1 text-sm text-muted-foreground">{missedList.map((card) => card.term).join(", ")}</p>
            </div>
          ) : (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700">
              Every term stuck this round. Nice work.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {missedList.length > 0 ? (
              <Button type="button" onClick={() => onReviewMissed(missedList)}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                Review missed terms
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                weights.current = new Map();
                missed.current = new Map();
                lastId.current = null;
                setCorrectCount(0);
                setQuestionNumber(1);
                setFinished(false);
                nextQuestion();
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

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onExit}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Games
          </Button>
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            {settings.timer ? <span aria-live="off">{seconds}s</span> : null}
            <span>
              {questionNumber} / {total}
            </span>
          </div>
        </div>

        {variant === "boss" ? (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-primary" aria-hidden />
                {bossName}
              </span>
              <span className="text-muted-foreground">Energy {bossPercent}%</span>
            </div>
            <Progress value={bossPercent} />
          </div>
        ) : (
          <Progress value={Math.round(((questionNumber - 1) / total) * 100)} />
        )}

        <div className="rounded-lg border bg-background p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {mode === "term-to-def" ? "Which definition matches this term?" : "Which term matches this definition?"}
          </p>
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
                  answered && isChosen && !isCorrect && "border-destructive/50 bg-destructive/10"
                )}
              >
                <span>{choice}</span>
                {showState && isCorrect ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : null}
                {answered && isChosen && !isCorrect ? <X className="h-4 w-4 text-destructive" aria-hidden /> : null}
              </button>
            );
          })}
        </div>

        {answered ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold">{feedback}</p>
            <Button type="button" onClick={advance}>
              {questionNumber >= total ? "See results" : "Next"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3 text-center">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
