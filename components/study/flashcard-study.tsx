"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, Shuffle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Flashcard } from "@/lib/study-content";

type FlashcardStudyProps = {
  cards: Flashcard[];
  deckName: string;
};

function shuffleCards(cards: Flashcard[]) {
  return [...cards].sort(() => Math.random() - 0.5);
}

export function FlashcardStudy({ cards, deckName }: FlashcardStudyProps) {
  const storageKey = `debatearena-flashcards-${cards[0]?.deckSlug ?? "deck"}`;
  const [orderedCards, setOrderedCards] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownIds, setKnownIds] = useState<string[]>([]);
  const [learningIds, setLearningIds] = useState<string[]>([]);
  const currentCard = orderedCards[index] ?? cards[0];
  const masteryPercent = Math.round((knownIds.length / Math.max(cards.length, 1)) * 100);
  const remainingCount = Math.max(cards.length - knownIds.length, 0);

  const summary = useMemo(() => {
    return {
      known: knownIds.length,
      learning: learningIds.length,
      remaining: remainingCount
    };
  }, [knownIds.length, learningIds.length, remainingCount]);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as { knownIds?: string[]; learningIds?: string[] };
      setKnownIds(parsed.knownIds ?? []);
      setLearningIds(parsed.learningIds ?? []);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ knownIds, learningIds }));
  }, [knownIds, learningIds, storageKey]);

  function moveNext() {
    setFlipped(false);
    setIndex((current) => (current + 1) % Math.max(orderedCards.length, 1));
  }

  function markKnown() {
    if (!currentCard) {
      return;
    }

    setKnownIds((current) => Array.from(new Set([...current, currentCard.id])));
    setLearningIds((current) => current.filter((id) => id !== currentCard.id));
    moveNext();
  }

  function markLearning() {
    if (!currentCard) {
      return;
    }

    setLearningIds((current) => Array.from(new Set([...current, currentCard.id])));
    setKnownIds((current) => current.filter((id) => id !== currentCard.id));
    moveNext();
  }

  function shuffleDeck() {
    setOrderedCards(shuffleCards(cards));
    setIndex(0);
    setFlipped(false);
  }

  function resetDeck() {
    setKnownIds([]);
    setLearningIds([]);
    setIndex(0);
    setFlipped(false);
  }

  if (!currentCard) {
    return null;
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge variant="secondary">{currentCard.organization}</Badge>
              <CardTitle className="mt-3">{deckName} flashcards</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={shuffleDeck}>
                <Shuffle className="h-4 w-4" aria-hidden />
                Shuffle
              </Button>
              <Button type="button" variant="ghost" onClick={resetDeck}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold text-muted-foreground">Known</p>
              <p className="mt-1 text-2xl font-bold">{summary.known}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold text-muted-foreground">Still learning</p>
              <p className="mt-1 text-2xl font-bold">{summary.learning}</p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold text-muted-foreground">Remaining</p>
              <p className="mt-1 text-2xl font-bold">{summary.remaining}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">Term mastery</span>
              <span className="text-muted-foreground">{masteryPercent}%</span>
            </div>
            <Progress value={masteryPercent} />
          </div>
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={() => setFlipped((current) => !current)}
        className="focus-ring w-full rounded-lg border bg-card p-6 text-left shadow-soft transition-colors hover:bg-muted/35"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="outline">
            Card {index + 1} of {orderedCards.length}
          </Badge>
          <span className="text-sm font-semibold text-muted-foreground">Tap to {flipped ? "review term" : "flip"}</span>
        </div>
        {!flipped ? (
          <div className="py-14 text-center">
            <p className="text-sm font-semibold uppercase text-muted-foreground">Term</p>
            <h2 className="mt-3 text-4xl font-bold capitalize">{currentCard.term}</h2>
          </div>
        ) : (
          <div className="space-y-5 py-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Definition</p>
              <p className="mt-2 text-lg leading-8">{currentCard.definition}</p>
            </div>
            <div className="rounded-lg border bg-primary/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Beginner-friendly explanation</p>
                <Badge variant="secondary">{currentCard.difficulty.toLowerCase()}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{currentCard.beginnerExplanation}</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold">Example</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{currentCard.example}</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold">Common mistake</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{currentCard.commonMistake}</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold">Quick check</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{currentCard.quickCheck}</p>
              <p className="mt-3 text-sm leading-6">{currentCard.quickCheckAnswer}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentCard.tags.slice(0, 5).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </button>

      <div className="grid gap-3 sm:grid-cols-3">
        <Button type="button" size="lg" variant="outline" onClick={markLearning}>
          Still learning
        </Button>
        <Button type="button" size="lg" onClick={markKnown}>
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          I know this
        </Button>
        <Button type="button" size="lg" variant="secondary" onClick={moveNext}>
          <Sparkles className="h-5 w-5" aria-hidden />
          Skip
        </Button>
      </div>
    </div>
  );
}
