"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import { RefreshCw } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTrainingTrack } from "@/components/training/training-track-context";
import type { TrainingTrack } from "@/lib/training-tracks";

// Persists the track from the URL (strongest source of truth), and offers the Past/AI/Mixed practice
// source selector with honest notes. Switch track returns to the selection page.
export function TrackControls({ trackId }: { trackId: TrainingTrack }) {
  const { setTrack } = useTrainingTrack();

  useEffect(() => {
    setTrack(trackId);
  }, [trackId, setTrack]);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Practice source</p>
        {/* M12D2, class-only: `h-auto min-h-11 min-w-11` overrides the compact size's `h-9` so the
            control clears 44px in both dimensions. Destination, label and behaviour are unchanged. */}
        <Link href={"/training" as Route} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-auto min-h-11 min-w-11 px-4")}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Switch track
        </Link>
      </div>
      {/* OWNER QA REPAIR 1A: this was a three-way selector — Past Competition / AI Practice / Mixed —
          whose value nothing read: local state, never persisted, never sent to the scenario request,
          never seen by the server. Every choice produced the same AI-generated practice. A truthful
          warning under an inert control does not make the control truthful, so the choice is gone and
          the one source that exists is stated. No source system is built here; when verified past
          prompts exist, a real selector can return with behaviour behind it. */}
      <p className="text-sm font-semibold">AI-generated CompeteReady practice</p>
      <p className="text-xs text-muted-foreground">
        Original scenarios written for practice and labelled as such — not official DECA prompts.
        Verified past competition prompts are not available for this event yet.
      </p>
    </div>
  );
}
