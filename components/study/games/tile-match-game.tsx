"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { COPY, type GameCard, type GameSettings } from "@/lib/study-games";

const MAX_PAIRS = 6;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Props = {
  cards: GameCard[];
  settings: GameSettings;
  onExit: () => void;
  onReviewMissed: (missed: GameCard[]) => void;
  onRoundComplete: () => void;
};

export function TileMatchGame({ cards, settings, onExit, onReviewMissed, onRoundComplete }: Props) {
  const pairs = useMemo(() => shuffle(cards).slice(0, Math.min(MAX_PAIRS, cards.length)), [cards]);
  const termTiles = useMemo(() => shuffle(pairs), [pairs]);
  const defTiles = useMemo(() => shuffle(pairs), [pairs]);

  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongId, setWrongId] = useState<string | null>(null);
  const missed = useRef(new Map<string, GameCard>());
  const [, force] = useState(0);

  const allMatched = matched.size === pairs.length;

  function selectTerm(id: string) {
    if (matched.has(id)) {
      return;
    }
    setWrongId(null);
    setSelectedTerm(id);
  }

  function selectDefinition(id: string) {
    if (matched.has(id) || !selectedTerm) {
      return;
    }
    if (id === selectedTerm) {
      const next = new Set(matched);
      next.add(id);
      setMatched(next);
      setSelectedTerm(null);
      if (next.size === pairs.length) {
        onRoundComplete();
      }
    } else {
      // Gentle "try again" — record the confused term, no harsh failure.
      const card = pairs.find((p) => p.id === selectedTerm);
      if (card) {
        missed.current.set(card.id, card);
        force((n) => n + 1);
      }
      setWrongId(id);
      window.setTimeout(() => setWrongId(null), settings.reducedMotion ? 0 : 450);
    }
  }

  const missedList = Array.from(missed.current.values());

  if (allMatched) {
    return (
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <Badge variant="secondary">Tile Match</Badge>
            <h2 className="mt-3 text-2xl font-bold">All pairs matched.</h2>
            <p className="mt-1 text-muted-foreground">You matched {pairs.length} pairs.</p>
          </div>
          {missedList.length > 0 ? (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-semibold">{missedList.length} term{missedList.length === 1 ? "" : "s"} were tricky</p>
              <p className="mt-1 text-sm text-muted-foreground">{missedList.map((c) => c.term).join(", ")}</p>
            </div>
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
                missed.current = new Map();
                setMatched(new Set());
                setSelectedTerm(null);
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
          <span className="text-sm font-semibold text-muted-foreground">
            {matched.size} / {pairs.length} matched
          </span>
        </div>

        <p className="text-sm text-muted-foreground">Pick a term, then its definition. {COPY.drillEncourage}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Terms</p>
            {termTiles.map((tile) => {
              const isMatched = matched.has(tile.id);
              const isSelected = selectedTerm === tile.id;
              return (
                <button
                  key={`term-${tile.id}`}
                  type="button"
                  onClick={() => selectTerm(tile.id)}
                  disabled={isMatched}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg border bg-background p-3 text-left text-sm",
                    !settings.reducedMotion && "transition-colors",
                    isMatched && "border-emerald-500/50 bg-emerald-500/10 text-muted-foreground",
                    isSelected && "border-primary bg-primary/10"
                  )}
                >
                  <span>{tile.term}</span>
                  {isMatched ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : null}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Definitions</p>
            {defTiles.map((tile) => {
              const isMatched = matched.has(tile.id);
              const isWrong = wrongId === tile.id;
              return (
                <button
                  key={`def-${tile.id}`}
                  type="button"
                  onClick={() => selectDefinition(tile.id)}
                  disabled={isMatched}
                  className={cn(
                    "w-full rounded-lg border bg-background p-3 text-left text-sm",
                    !settings.reducedMotion && "transition-colors",
                    isMatched && "border-emerald-500/50 bg-emerald-500/10 text-muted-foreground",
                    isWrong && "border-amber-500/60 bg-amber-500/10",
                    isWrong && !settings.reducedMotion && "animate-pulse"
                  )}
                >
                  {tile.definition}
                  {isWrong ? <span className="mt-1 block text-xs font-semibold text-amber-600">Try again</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
