"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTrainingTrack } from "@/components/training/training-track-context";
import type { TrainingTrack } from "@/lib/training-tracks";

/**
 * What this track's practice is, and what it is not — in that track's own terms.
 *
 * Each line makes the same two statements the original made for DECA: the material is original and
 * labelled as such, and we hold no verified past competition material for it. What changes per track
 * is WHICH organization is named and what kind of material it produces, because a learner can only
 * check a claim about the thing they are actually practising.
 */
const PRACTICE_SOURCE_NOTE: Partial<Record<TrainingTrack, string>> = {
  DECA: "Original scenarios written for practice and labelled as such — not official DECA prompts. Verified past competition prompts are not available for this event yet.",
  HOSA: "Original questions and scenarios written for practice and labelled as such — not official HOSA exam items. Verified past competition items are not available for this event yet.",
  GENERAL_DEBATE:
    "Original motions and practice material written for practice and labelled as such — not official tournament materials. Verified past competition materials are not available for this event yet."
};

const PRACTICE_SOURCE_NOTE_FALLBACK =
  "Original material written for practice and labelled as such — not official competition material. Verified past competition material is not available for this event yet.";

// ENTERING A HUB IS THE SWITCH (Owner QA Repair 2). Mounting on `/training/<slug>` records that track
// as the learner's current selection — the owner-bound cookie the server resolver reads — so every
// page they open afterwards is scoped to it until they enter another hub. Viewing a page through a
// `?track=` link does not do this; only the hub does. "Switch track" returns to the chooser.
export function TrackControls({ trackId }: { trackId: TrainingTrack }) {
  // The switch itself lives in a child that mounts only after hydration: it needs the App Router
  // (to refresh), which exists in the browser but not in a static server render — and selecting is a
  // browser-side act anyway. Server HTML for the hub is therefore router-free and byte-stable.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      {hydrated ? <HubSelection trackId={trackId} /> : null}
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
      {/* HOSA H2 — this sentence was written during a DECA repair and hard-coded "not official DECA
          prompts", but the component renders on EVERY track hub. A HOSA learner was told their
          health-science practice was not official DECA material, and a Debate learner the same. The
          disclaimer has to name the learner's own organization, and the kind of material that track
          actually practises, or it is not a disclaimer about their practice at all. */}
      <p className="text-xs text-muted-foreground">{PRACTICE_SOURCE_NOTE[trackId] ?? PRACTICE_SOURCE_NOTE_FALLBACK}</p>
    </div>
  );
}

// Renders nothing. Entering this hub records its track as the learner's selection (once), then drops
// the client router cache so a page visited moments ago is re-rendered under the new track rather
// than replayed from the cached payload — a refresh, never a navigation: the hub stays the hub.
function HubSelection({ trackId }: { trackId: TrainingTrack }) {
  const { selectedTrack, setTrack } = useTrainingTrack();
  const router = useRouter();

  useEffect(() => {
    if (selectedTrack !== trackId) {
      setTrack(trackId);
      router.refresh();
    }
  }, [trackId, selectedTrack, setTrack, router]);

  return null;
}
