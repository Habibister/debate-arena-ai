"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { RefreshCw } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTrainingTrack } from "@/components/training/training-track-context";
import { PRACTICE_SOURCES, type PracticeSource, type TrainingTrack } from "@/lib/training-tracks";

// Persists the track from the URL (strongest source of truth), and offers the Past/AI/Mixed practice
// source selector with honest notes. Switch track returns to the selection page.
export function TrackControls({ trackId }: { trackId: TrainingTrack }) {
  const { setTrack } = useTrainingTrack();
  const [source, setSource] = useState<PracticeSource>("AI");

  useEffect(() => {
    setTrack(trackId);
  }, [trackId, setTrack]);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Practice source</p>
        <Link href={"/training" as Route} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Switch track
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {PRACTICE_SOURCES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSource(s.id)}
            aria-pressed={source === s.id}
            className={cn(
              "focus-ring rounded-md border px-3 py-1.5 text-sm font-semibold",
              source === s.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{PRACTICE_SOURCES.find((s) => s.id === source)?.note}</p>
      {source === "PAST" ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs font-medium text-amber-700">
          No verified public past prompts are available for this event yet. Try AI Practice or Mixed.
        </p>
      ) : null}
    </div>
  );
}
