import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpenCheck, ClipboardList, Compass, Gamepad2, GraduationCap, Info, Layers3, MessageSquareText, type LucideIcon } from "lucide-react";
import { TrackControls } from "@/components/training/track-controls";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { LearnerPathRail } from "@/components/ui/learner-path-rail";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { learnerPathForTrack } from "@/lib/learner-path";
import { lessonsForTrack } from "@/lib/lessons";
import { roleplayLessonsForTrack } from "@/lib/roleplay-lessons";
import { deckSummaries } from "@/lib/study-content";
import { hosaEventById } from "@/lib/hosa-events";
import { CONTENT_SOURCE_LABEL, isTrackRetired, TRACK_DISCLAIMER, trackBySlug, trackHasPracticeTests, type TrainingTrack } from "@/lib/training-tracks";

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

/**
 * One compact destination row.
 *
 * Deliberately local to this hub: it has exactly one consumer, so promoting it to a shared
 * `components/ui` primitive would be an abstraction over a single call site. Every row is a native
 * link, clears 44px in both dimensions, carries the project focus utility, and puts its label in
 * `--foreground` — the track accent only ever reaches the (aria-hidden) icon.
 */
function DestinationRow({ href, icon: Icon, label, detail }: {
  href: Route;
  icon: LucideIcon;
  label: string;
  detail: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="focus-ring flex min-h-11 min-w-11 items-start gap-3 rounded-md border bg-card px-3 py-2.5 transition-colors hover:bg-muted"
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-track" aria-hidden />
        <span className="min-w-0">
          <span className="block font-semibold text-foreground">{label}</span>
          <span className="mt-0.5 block break-words text-xs leading-5 text-muted-foreground">{detail}</span>
        </span>
      </Link>
    </li>
  );
}

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
  // Same capability statement every other surface reads, instead of a fourth local copy of it.
  const hasTests = trackHasPracticeTests(track.id);
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

  // M12D2: exactly one strongest action per track, and it is a ROUTE RULE, never a recommendation.
  // HOSA and DECA are Navigator-first because the event or family decides what training even applies
  // (1 of 8 HOSA events is routed today, and half of DECA's families sit outside the role-play
  // course). Debate has no Navigator, so its authored start is the round itself.
  const hasNavigator = NAVIGATOR_TRACKS.includes(track.id);
  // Start-a-round action launches directly: Debate -> /debate (no hub in between). Non-debate tracks
  // open their own role-play setup. HOSA never renders this — its branch is the recovery block.
  const startPracticeHref = (isDebate ? "/debate" : `/training/${track.slug}/practice`) as Route;
  const hasPracticeSetup = track.id !== "HOSA";
  const primaryHref = hasNavigator ? (`/training/${track.slug}/events` as Route) : startPracticeHref;
  const PrimaryIcon = hasNavigator ? Compass : MessageSquareText;

  // Static availability for this track — never a claim about the learner. `currentStageId` is
  // deliberately never supplied: no server record proves where anyone is.
  const stages = learnerPathForTrack(track.id);

  return (
    <div className="space-y-6">
      {/* 1. Page header — the only h1 on the page, with the back action beside it. */}
      <div className="space-y-4">
        <Link
          href={"/training" as Route}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-auto min-h-11 min-w-11 px-3")}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Tracks
        </Link>
        <PageHeader
          eyebrow="Training"
          badges={<Badge variant="secondary">Training in: {track.label}</Badge>}
          heading={<h1 className="page-title">{track.label}</h1>}
          description={
            <>
              <p>{track.description}</p>
              {track.formats ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {track.formats.map((f) => (
                    <Badge key={f} variant="outline">{f}</Badge>
                  ))}
                </div>
              ) : null}
            </>
          }
        />
      </div>

      {/* 2. Primary action. One authored start, no "recommended for you", no inferred next step. */}
      <div className="space-y-3">
        <Link
          href={primaryHref}
          className={cn(buttonVariants({ size: "lg" }), "h-auto min-h-11 min-w-11 w-full whitespace-normal px-5 text-center sm:w-fit")}
        >
          <PrimaryIcon className="h-4 w-4 shrink-0" aria-hidden />
          {hasNavigator ? "Open the Event Navigator" : PRACTICE_ACTION[track.id]}
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {hasNavigator ? (
            <>
              Start here. Find your {track.id === "HOSA" ? "exact event" : "event family"}, see what we&apos;ve actually
              verified about it, and go to the right training.
            </>
          ) : (
            "Choose a format and practice with an AI opponent and judge."
          )}
        </p>

        {/* 3. M11R5/M11R5A: a generic "Start HOSA practice" CTA sent learners into one room for events
               that differ completely, so it is gone. What replaces it is a NON-INTERACTIVE statement of
               where to go instead — and deliberately NOT a claim that HOSA practice is unavailable,
               because /training/hosa/practice is still live and reachable from Event HQ. The only
               unavailability stated here is the lesson's own, read from the lesson's status.
               Debate and DECA are untouched. M12D2 moved this block out of the destination grid (it
               was 4x the height of its row neighbours on a tablet) but changed nothing inside it. */}
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
        ) : null}
      </div>

      {/* 4. Training path — the deployed static availability map. No current stage, no completion,
             no percentage, no readiness. Every stage, href, state and note is M12D1's, unchanged. */}
      {stages.length > 0 ? (
        <section aria-labelledby="hub-path">
          <h2 id="hub-path" className="section-title">Training path</h2>
          <LearnerPathRail stages={stages} label={`${track.label} learner path`} className="mt-3" />
        </section>
      ) : null}

      {/* 5. Where to train — the same destinations the six equal-weight cards carried, as one
             compact grouped list. Nothing was removed; only the weight and the duplicate
             "lessons"-vs-"lessons" labelling changed. */}
      <section aria-labelledby="hub-destinations">
        <h2 id="hub-destinations" className="section-title">Where to train</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {hasNavigator && hasPracticeSetup ? (
            <DestinationRow
              href={startPracticeHref}
              icon={MessageSquareText}
              label={PRACTICE_ACTION[track.id]}
              detail={`A ${track.label}-specific setup — the AI uses ${track.label} criteria. AI-generated practice.`}
            />
          ) : null}
          {EVENT_HQ_SLUG[track.id] ? (
            <DestinationRow
              href={`/training/${track.slug}/event/${EVENT_HQ_SLUG[track.id]}` as Route}
              icon={Layers3}
              label="Event HQ"
              detail="Everything for your event in one place — rules, practice, drills, and simulations."
            />
          ) : null}
          {hasTests ? (
            <DestinationRow
              href={`/tests?track=${track.slug}` as Route}
              icon={ClipboardList}
              label="Practice tests"
              detail={`Generate a ${track.short} practice set with explanations.`}
            />
          ) : null}
          {hasGuidedLessons ? (
            // M11R5C: HOSA's only lesson is informational and carries no worked examples and no
            // active practice, so the generic "weak-vs-strong examples, then practice it" promise
            // is false there. Debate and DECA keep it, where it remains accurate.
            <DestinationRow
              href={`/lessons?track=${track.slug}` as Route}
              icon={GraduationCap}
              label={track.id === "HOSA" ? "Guided information" : "Guided lessons"}
              detail={
                track.id === "HOSA"
                  ? "Learn the communication layer, then check your current event guideline for event-specific requirements."
                  : "Learn a skill with worked weak-vs-strong examples, then practice it."
              }
            />
          ) : null}
          <DestinationRow
            href={`/skills?track=${track.slug}` as Route}
            icon={BookOpenCheck}
            label="Skill drills"
            // The old detail described a five-stage mastery path that does not exist. Debate states
            // what its drill layer really is, and the boundary against lesson questions; the other
            // tracks keep the general wording.
            detail={
              isDebate
                ? "Drill one skill at a time and review it later — separate from the questions inside a lesson."
                : "Work through the skills this track trains."
            }
          />
        </ul>
      </section>

      {/* 6. Flashcard decks (filtered by track). One list instead of a wall of cards: every deck
             name, term count, AI-generated label and both destinations are unchanged. A track with
             no decks renders no section at all rather than an empty shell. */}
      {decks.length > 0 ? (
        <section aria-labelledby="hub-decks">
          <h2 id="hub-decks" className="section-title">Flashcard decks</h2>
          <ul className="mt-3 divide-y divide-border rounded-md border bg-card px-4">
            {decks.map((deck) => (
              <li key={deck.deckSlug} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
                {/* Name and metadata share one baseline row so a deck costs one text line, not two.
                    A long name still wraps — it is never truncated. */}
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <h3 className="break-words font-semibold text-foreground">{deck.deck}</h3>
                  <span className="break-words text-xs text-muted-foreground">
                    {deck.count} terms
                    <span aria-hidden> · </span>
                    {/* Per-deck, never hoisted to a section note: a sourced deck added later must not
                        inherit an AI label, and an AI deck must never lose one. */}
                    {CONTENT_SOURCE_LABEL.AI_GENERATED}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/study/${deck.deckSlug}` as Route}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-auto min-h-11 min-w-11 px-4")}
                  >
                    Study
                  </Link>
                  <Link
                    href={`/study/${deck.deckSlug}/games` as Route}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-auto min-h-11 min-w-11 px-4")}
                  >
                    <Gamepad2 className="h-4 w-4" aria-hidden />
                    Review games
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 7. Track settings — the preference control now sits AFTER the learner's own actions instead
             of ahead of them. Its behaviour is untouched. */}
      <section aria-labelledby="hub-settings">
        <h2 id="hub-settings" className="section-title">Track settings</h2>
        <div className="mt-3 space-y-3">
          <TrackControls trackId={track.id} />
          <p className="text-xs text-muted-foreground">{TRACK_DISCLAIMER}</p>
        </div>
      </section>
    </div>
  );
}
