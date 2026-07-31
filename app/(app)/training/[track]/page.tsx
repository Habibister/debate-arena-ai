import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpenCheck, ClipboardList, Compass, Gamepad2, GraduationCap, Info, Layers3, MessageSquareText } from "lucide-react";
import { TrackControls } from "@/components/training/track-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { lessonsForTrack } from "@/lib/lessons";
import { roleplayLessonsForTrack } from "@/lib/roleplay-lessons";
import { deckSummaries } from "@/lib/study-content";
import { hosaEventById } from "@/lib/hosa-events";
import { CONTENT_SOURCE_LABEL, isTrackRetired, TRACK_DISCLAIMER, trackBySlug, type TrainingTrack } from "@/lib/training-tracks";

// Event HQ pages exist only for events with real registry data — no placeholder HQs.
const EVENT_HQ_SLUG: Partial<Record<TrainingTrack, string>> = {
  GENERAL_DEBATE: "public-forum",
  DECA: "hotel-lodging-management",
  HOSA: "medical-terminology"
};

// Tracks with a fail-closed Event Navigator. Each has its OWN registry and component; adding a
// track here without one would 404, not borrow another track's data.
const NAVIGATOR_TRACKS: TrainingTrack[] = ["HOSA", "DECA"];

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
  // Soft-removed tracks (Model UN) redirect to the track chooser instead of rendering a hidden page.
  if (isTrackRetired(track.id)) {
    redirect("/training");
  }

  // Reuse existing org-tagged content; only show this track's decks.
  const decks = deckSummaries().filter((d) => d.organization === track.organization);
  const hasTests = track.organization === "DECA" || track.organization === "HOSA";
  const isDebate = track.id === "GENERAL_DEBATE";
  // Guided lessons are authored per track; surface the entry when this track has any (Debate concept
  // lessons or the DECA/HOSA role-play course).
  const hasGuidedLessons = lessonsForTrack(track.slug).length > 0 || roleplayLessonsForTrack(track.slug).length > 0;
  // M11R5A: the HOSA hub sends learners through their event instead of a generic room. The lesson it
  // offers instead, and whether that lesson's own interactive scenario is withdrawn, are READ from
  // the lesson registry — never asserted here. The hub must not claim anything about the state of
  // /training/hosa/practice, which is a separate surface this page does not own.
  const hosaLesson = track.id === "HOSA" ? roleplayLessonsForTrack(track.slug)[0] : undefined;
  // The verified event's NAME is read from the registry — this page asserts no event facts of its own.
  const hosaEventHqName = track.id === "HOSA" ? hosaEventById(EVENT_HQ_SLUG.HOSA ?? "")?.name : undefined;

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
        {/* Navigator-first: HOSA spans written tests, clinical skills, interviews, presentations and
            team events, and DECA's families differ in timing, exams, PIs and judge questions — so the
            exact event or family must be identified before any training is recommended. */}
        {NAVIGATOR_TRACKS.includes(track.id) ? (
          <Link
            href={`/training/${track.slug}/events` as Route}
            className="flex items-start gap-3 rounded-lg border border-track/30 bg-track/5 p-4 transition-colors hover:bg-track/10"
          >
            <Compass className="mt-0.5 h-5 w-5 text-track" aria-hidden />
            <span>
              <span className="block font-semibold">Event Navigator</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Start here. Find your {track.id === "HOSA" ? "exact event" : "event family"}, see what we&apos;ve actually
                verified about it, and go to the right training.
              </span>
            </span>
          </Link>
        ) : null}
        {EVENT_HQ_SLUG[track.id] ? (
          <Link
            href={`/training/${track.slug}/event/${EVENT_HQ_SLUG[track.id]}` as Route}
            className="flex items-start gap-3 rounded-lg border border-track/30 bg-track/5 p-4 transition-colors hover:bg-track/10"
          >
            <Layers3 className="mt-0.5 h-5 w-5 text-track" aria-hidden />
            <span>
              <span className="block font-semibold">Event HQ</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Everything for your event in one place — rules, practice, drills, and simulations.
              </span>
            </span>
          </Link>
        ) : null}
        {/* M11R5/M11R5A: a generic "Start HOSA practice" CTA sent learners into one room for events
            that differ completely, so it is gone. What replaces it is a NON-INTERACTIVE statement of
            where to go instead — and deliberately NOT a claim that HOSA practice is unavailable,
            because /training/hosa/practice is still live and reachable from Event HQ. The only
            unavailability stated here is the lesson's own, read from the lesson's status.
            Debate and DECA are untouched. */}
        {track.id === "HOSA" ? (
          <div className="flex items-start gap-3 rounded-lg border border-dashed bg-card p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <span>
              <span className="block font-semibold">Start from your event, not a generic room</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                HOSA events differ enough that one generic practice room can&apos;t stand in for yours, so this hub
                routes you through your event instead.
                {hosaEventHqName ? <>{" "}{hosaEventHqName} practice is available from its Event HQ page.</> : null}
                {hosaLesson ? (
                  <>
                    {" "}
                    The communication lesson covers one layer inside applicable clinical-skill events
                    {hosaLesson.practiceStatus !== "available" ? " — its interactive scenario is temporarily unavailable, and it" : " — it"}
                    {" "}never teaches or scores hands-on procedures.
                  </>
                ) : null}
              </span>
              {/* M11R5A: these two are the only way out of this state on mobile, so they are real
                  targets — buttonVariants gives the project's focus ring, and min-h-11 (44px) with
                  h-auto lets the label wrap without dropping below the touch minimum. */}
              <span className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={"/training/hosa/events" as Route}
                  data-hosa-recovery="events"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-auto min-h-11 whitespace-normal px-4 py-2 text-center")}
                >
                  Find your HOSA event
                </Link>
                {hosaLesson ? (
                  <Link
                    href={`/lessons/${hosaLesson.slug}` as Route}
                    data-hosa-recovery="lesson"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-auto min-h-11 whitespace-normal px-4 py-2 text-center")}
                  >
                    Read the communication lesson
                  </Link>
                ) : null}
              </span>
            </span>
          </div>
        ) : (
          /* Start-a-round action launches directly: Debate -> /debate (no hub in between). Non-debate
             tracks open their own role-play setup. */
          <Link href={(isDebate ? "/debate" : `/training/${track.slug}/practice`) as Route} className="flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted">
            <MessageSquareText className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
            <span>
              <span className="block font-semibold">{PRACTICE_ACTION[track.id]}</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {isDebate ? "Choose a format and practice with an AI opponent and judge." : `A ${track.label}-specific setup — the AI uses ${track.label} criteria. AI-generated practice.`}
              </span>
            </span>
          </Link>
        )}
        {hasTests ? (
          <Link href={`/tests?track=${track.slug}` as Route} className="flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted">
            <ClipboardList className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
            <span>
              <span className="block font-semibold">Practice tests</span>
              <span className="mt-1 block text-sm text-muted-foreground">Generate a {track.short} practice set with explanations.</span>
            </span>
          </Link>
        ) : null}
        {hasGuidedLessons ? (
          <Link href={`/lessons?track=${track.slug}` as Route} className="flex items-start gap-3 rounded-lg border border-track/30 bg-track/5 p-4 transition-colors hover:bg-track/10">
            <GraduationCap className="mt-0.5 h-5 w-5 text-track" aria-hidden />
            <span>
              {/* M11R5C: HOSA's only lesson is informational and carries no worked examples and no
                  active practice, so the generic "weak-vs-strong examples, then practice it" promise
                  is false there. Debate and DECA keep it, where it remains accurate. */}
              <span className="block font-semibold">{track.id === "HOSA" ? "Guided information" : "Guided lessons"}</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {track.id === "HOSA"
                  ? "Learn the communication layer, then check your current event guideline for event-specific requirements."
                  : "Learn a skill with worked weak-vs-strong examples, then practice it."}
              </span>
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
