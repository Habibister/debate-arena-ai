import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ACTIVE_TRACKS, PUBLIC_TRACKS_PHRASE } from "@/lib/training-tracks";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------------------------
// The neutral two-track state (owner decision, 2026-09-27: CompeteReady publicly supports Debate and
// DECA only). A page renders this INSTEAD of its track content when no public track resolves: a new
// learner who has not chosen yet, or a learner whose saved selection or signup organization names a
// dormant track (HOSA, Model UN). It never guesses a track, shows no other track's progress, and
// writes nothing: the choices are links to the public hubs, and entering a hub is the one intentional
// act that records a selection (TrackControls). The options come from ACTIVE_TRACKS, so the wording and
// the buttons can never name a track the product does not offer.
// ---------------------------------------------------------------------------------------------

export function ChooseTrackState({ context, headingLevel = "h2", className }: {
  /** One short sentence about what this page shows once a track is chosen. */
  context?: string;
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  const Heading = headingLevel;
  return (
    <section
      aria-labelledby="choose-track-heading"
      className={cn("flex flex-col items-center rounded-lg border border-dashed bg-card p-6 text-center", className)}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Compass className="h-5 w-5" aria-hidden />
      </span>
      <Heading id="choose-track-heading" className="mt-4 font-semibold">
        Choose {PUBLIC_TRACKS_PHRASE}
      </Heading>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {context ?? "Your lessons, practice and progress follow the track you choose."} You can switch tracks anytime.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {ACTIVE_TRACKS.map((track) => (
          <Link
            key={track.id}
            href={`/training/${track.slug}` as Route}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-auto min-h-11")}
          >
            {track.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
}
