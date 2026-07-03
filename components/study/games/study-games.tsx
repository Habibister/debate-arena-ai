"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Coffee, Gamepad2, Settings2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BOSSES,
  COPY,
  DEFAULT_SETTINGS,
  GAME_MODES,
  normalizeSettings,
  ROUNDS_BEFORE_BREAK,
  type GameCard,
  type GameMode,
  type GameSettings
} from "@/lib/study-games";
import { LockInGame } from "@/components/study/games/lock-in-game";
import { MissedTermsDrill } from "@/components/study/games/missed-terms-drill";
import { MultipleChoiceGame } from "@/components/study/games/multiple-choice-game";
import { TileMatchGame } from "@/components/study/games/tile-match-game";

const SETTINGS_KEY = "debatearena-game-settings";

type View = "hub" | GameMode;

export function StudyGames({ deckName, cards }: { deckName: string; cards: GameCard[] }) {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState<View>("hub");
  const [missedCards, setMissedCards] = useState<GameCard[]>([]);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [bossName, setBossName] = useState(BOSSES[0]);

  // Load + persist settings so the experience is predictable across sessions.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        setSettings(normalizeSettings(JSON.parse(stored)));
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  function updateSettings(patch: Partial<GameSettings>) {
    setSettings((current) => {
      const next = normalizeSettings({ ...current, ...patch });
      try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }

  const exitToHub = () => setView("hub");
  const reviewMissed = (missed: GameCard[]) => {
    setMissedCards(missed);
    setView("memory-loop");
  };
  const completeRound = () => setRoundsPlayed((n) => n + 1);

  function launch(mode: GameMode) {
    if (mode === "boss") {
      setBossName(BOSSES[Math.floor(Math.random() * BOSSES.length)] ?? BOSSES[0]);
    }
    setView(mode);
  }

  const frameClass = cn(settings.highContrast && "contrast-125", settings.calmMode && "saturate-50");

  const activeGame = useMemo(() => {
    switch (view) {
      case "lock-in":
        return (
          <LockInGame cards={cards} settings={settings} onExit={exitToHub} onReviewMissed={reviewMissed} onRoundComplete={completeRound} />
        );
      case "clash":
        return (
          <MultipleChoiceGame
            title="Clash Mode"
            cards={cards}
            settings={settings}
            mode="term-to-def"
            variant="standard"
            onExit={exitToHub}
            onReviewMissed={reviewMissed}
            onRoundComplete={completeRound}
          />
        );
      case "boss":
        return (
          <MultipleChoiceGame
            title="Boss Mode"
            cards={cards}
            settings={settings}
            mode="term-to-def"
            variant="boss"
            bossName={bossName}
            onExit={exitToHub}
            onReviewMissed={reviewMissed}
            onRoundComplete={completeRound}
          />
        );
      case "grid-match":
        return (
          <TileMatchGame cards={cards} settings={settings} onExit={exitToHub} onReviewMissed={reviewMissed} onRoundComplete={completeRound} />
        );
      case "speed-trial":
        return (
          <MultipleChoiceGame
            title="Speed Trial"
            cards={cards}
            settings={settings}
            mode="term-to-def"
            variant="standard"
            onExit={exitToHub}
            onReviewMissed={reviewMissed}
            onRoundComplete={completeRound}
          />
        );
      case "memory-loop":
        return (
          <MissedTermsDrill missedCards={missedCards} allCards={cards} settings={settings} onExit={exitToHub} onRoundComplete={completeRound} />
        );
      default:
        return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, cards, settings, missedCards, bossName]);

  if (view !== "hub") {
    return <div className={frameClass}>{activeGame}</div>;
  }

  return (
    <div className={cn("space-y-4", frameClass)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="secondary">Review games</Badge>
          <h2 className="mt-2 text-2xl font-bold">{deckName} — practice modes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Low-pressure, repeat-friendly practice using terms from this deck.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setSettingsOpen((open) => !open)}>
          <Settings2 className="h-4 w-4" aria-hidden />
          Settings
        </Button>
      </div>

      {settingsOpen ? <SettingsPanel settings={settings} onChange={updateSettings} /> : null}

      {roundsPlayed >= ROUNDS_BEFORE_BREAK ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
          <span className="flex items-center gap-2 font-semibold text-emerald-700">
            <Coffee className="h-4 w-4" aria-hidden />
            {COPY.breakSuggestion}
          </span>
          <Link href="/debate" className="font-semibold text-primary hover:underline">
            Try a debate round
          </Link>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {GAME_MODES.map((mode) => {
          const isLoop = mode.id === "memory-loop";
          const loopDisabled = isLoop && missedCards.length === 0;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => (isLoop ? setView("memory-loop") : launch(mode.id))}
              disabled={loopDisabled}
              className={cn(
                "flex flex-col rounded-lg border bg-background p-4 text-left",
                !settings.reducedMotion && "transition-colors",
                loopDisabled ? "cursor-not-allowed opacity-60" : "hover:border-primary/60 hover:bg-muted/50"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold">
                  {isLoop ? <Sparkles className="h-4 w-4 text-accent" aria-hidden /> : <Gamepad2 className="h-4 w-4 text-primary" aria-hidden />}
                  {mode.name}
                </span>
                <Badge variant="outline">{mode.tagline}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{mode.description}</p>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="rounded-full border px-2 py-0.5">{mode.pace === "timed" ? "Timed (optional)" : "Calm"}</span>
                  <span>{mode.length}</span>
                </span>
                <span className="text-primary">{loopDisabled ? "Play a mode first" : "Start →"}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
      <span className="text-sm font-semibold">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={value}
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-semibold",
          value ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
        )}
      >
        {value ? "On" : "Off"}
      </button>
    </div>
  );
}

function SettingsPanel({ settings, onChange }: { settings: GameSettings; onChange: (patch: Partial<GameSettings>) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Game settings</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        <Toggle label="Timer" value={settings.timer} onToggle={() => onChange({ timer: !settings.timer })} />
        <Toggle label="Sound" value={settings.sound} onToggle={() => onChange({ sound: !settings.sound })} />
        <Toggle label="Reduced motion" value={settings.reducedMotion} onToggle={() => onChange({ reducedMotion: !settings.reducedMotion })} />
        <Toggle label="Repeat missed cards" value={settings.repeatMissed} onToggle={() => onChange({ repeatMissed: !settings.repeatMissed })} />
        <Toggle label="High contrast" value={settings.highContrast} onToggle={() => onChange({ highContrast: !settings.highContrast })} />
        <Toggle label="Calm mode" value={settings.calmMode} onToggle={() => onChange({ calmMode: !settings.calmMode })} />
        <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 sm:col-span-2">
          <span className="text-sm font-semibold">Questions per round</span>
          <div className="flex gap-1">
            {[5, 10, 20].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => onChange({ questionCount: count as GameSettings["questionCount"] })}
                aria-pressed={settings.questionCount === count}
                className={cn(
                  "rounded-md border px-3 py-1 text-xs font-semibold",
                  settings.questionCount === count ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
