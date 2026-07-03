import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenCheck, ClipboardList, Gamepad2, Layers3, MessageSquareText } from "lucide-react";
import { TrackControls } from "@/components/training/track-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deckSummaries } from "@/lib/study-content";
import { CONTENT_SOURCE_LABEL, TRACK_DISCLAIMER, trackBySlug, type TrainingTrack } from "@/lib/training-tracks";

const PRACTICE_ACTION: Record<TrainingTrack, string> = {
  GENERAL_DEBATE: "Start a debate practice",
  HOSA: "Start HOSA practice",
  DECA: "Start a DECA role play",
  MODEL_UN: "Start Model UN practice"
};

export default function TrackHubPage({ params }: { params: { track: string } }) {
  const track = trackBySlug(params.track);
  if (!track) {
    notFound();
  }

  // Reuse existing org-tagged content; only show this track's decks.
  const decks = deckSummaries().filter((d) => d.organization === track.organization);
  const hasTests = track.organization === "DECA" || track.organization === "HOSA";
  const isDebate = track.id === "GENERAL_DEBATE";

  return (
    <div className="space-y-6">
      <Link href={"/training" as Route} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Tracks
      </Link>

      <div>
        <Badge variant="secondary">Training in: {track.label}</Badge>
        <h1 className="mt-3 text-3xl font-bold">{track.label}</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">{track.description}</p>
        {track.formats ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {track.formats.map((f) => (
              <Badge key={f} variant="outline">{f}</Badge>
            ))}
          </div>
        ) : null}
      </div>

      <TrackControls trackId={track.id} />

      {/* Practice */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href={`/training/${track.slug}/practice` as Route} className="flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted">
          <MessageSquareText className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
          <span>
            <span className="block font-semibold">{PRACTICE_ACTION[track.id]}</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {isDebate ? "Choose a format and practice with an AI opponent and judge." : `A ${track.label}-specific setup — the AI uses ${track.label} criteria. AI-generated practice.`}
            </span>
          </span>
        </Link>
        {hasTests ? (
          <Link href={`/tests?track=${track.slug}` as Route} className="flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted">
            <ClipboardList className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
            <span>
              <span className="block font-semibold">Practice tests</span>
              <span className="mt-1 block text-sm text-muted-foreground">Generate a {track.short} practice set with explanations.</span>
            </span>
          </Link>
        ) : null}
        <Link href={`/skills?track=${track.slug}` as Route} className="flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted">
          <BookOpenCheck className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
          <span>
            <span className="block font-semibold">Lessons & skill drills</span>
            <span className="mt-1 block text-sm text-muted-foreground">Work through examples, guided practice, and mastery checks.</span>
          </span>
        </Link>
      </div>

      {/* Flashcard decks (filtered by track) */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-primary" aria-hidden />
              Flashcard decks
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {decks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No {track.label} flashcard decks are available yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {decks.map((deck) => (
                <div key={deck.deckSlug} className="rounded-lg border bg-background p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{deck.deck}</h3>
                    <Badge variant="outline">{CONTENT_SOURCE_LABEL.AI_GENERATED}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{deck.count} terms</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/study/${deck.deckSlug}` as Route} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                      Study
                    </Link>
                    <Link href={`/study/${deck.deckSlug}/games` as Route} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                      <Gamepad2 className="h-4 w-4" aria-hidden />
                      Review games
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{TRACK_DISCLAIMER}</p>
    </div>
  );
}
