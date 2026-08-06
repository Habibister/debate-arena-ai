import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Compass, Gavel, History, Inbox, MessageSquareText, PlayCircle, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { getActiveTrack } from "@/lib/track-server";
import { cn } from "@/lib/utils";
import type { TrackInfo } from "@/lib/training-tracks";

// Compete — the launcher for scored practice. Track-aware: each track shows ONLY its own scored
// activities. A "start scored activity" card launches directly (Debate -> /debate, never a hub in
// between). No cross-track actions — a DECA/HOSA learner never sees a debate round launcher.
type Destination = { label: string; detail: string; icon: LucideIcon; href?: string; comingSoon?: boolean };

function competeDestinations(track: TrackInfo): Destination[] {
  if (track.id === "GENERAL_DEBATE") {
    return [
      { label: "Full Debate Round", detail: "A full live round: AI opponent, real turn order, judged ballot — saved to your record.", icon: Gavel, href: `/debate?track=${track.slug}` },
      { label: "History", detail: "Every past round and ballot — nothing is deleted.", icon: History, href: "/debates/history" }
    ];
  }
  if (track.id === "DECA") {
    return [
      { label: "Guided DECA Role-Play", detail: "A coached run-through: scenario → pitch → the judge's objections → feedback. Retry freely.", icon: MessageSquareText, href: "/training/deca/practice" },
      { label: "Full DECA Simulation", detail: "The timed end-to-end run: prep clock → pitch → objections → scored ballot. Results aren't saved yet.", icon: PlayCircle, href: `/study-arcade?track=${track.slug}` },
      { label: "History", detail: "Your past debate/practice sessions and ballots.", icon: History, href: "/debates/history" }
    ];
  }
  if (track.id === "HOSA") {
    // M11R6: the generic "coached patient interaction" was withdrawn — it invented and scored patient
    // scenarios with no sourced rubric behind them. HOSA now enters through its Event Navigator, and
    // the verified event's own practice lives on that event's page rather than as a track-level CTA.
    return [
      { label: "Find your HOSA event", detail: "HOSA events differ too much for one arena. Start from your exact event and train what it actually contains.", icon: Compass, href: "/training/hosa/events" },
      { label: "Full HOSA Simulation", detail: "A timed, scored professional interaction. Not built yet — coming soon.", icon: PlayCircle, comingSoon: true },
      { label: "History", detail: "Your past sessions and feedback.", icon: History, href: "/debates/history" }
    ];
  }
  return [];
}

/**
 * One actionable destination. Local to this route: a single consumer, so a shared card abstraction
 * over three tracks would generalise ahead of any second caller.
 *
 * `emphasis` changes weight only — never the destination, the wording, or the number of actions.
 * Both variants are ONE link containing ONE heading, so no option is ever announced twice.
 */
function CompeteOption({ destination, emphasis = false }: { destination: Destination; emphasis?: boolean }) {
  const Icon = destination.icon;
  return (
    <li className={emphasis ? "sm:col-span-2" : undefined}>
      <Link
        href={destination.href as Route}
        className={cn(
          "focus-ring flex min-h-11 min-w-11 items-start gap-3 rounded-lg border transition-colors",
          emphasis
            ? "border-primary/40 bg-primary/[0.06] p-5 hover:bg-primary/10"
            : "bg-card p-4 hover:bg-muted"
        )}
      >
        <Icon className={cn("shrink-0 text-track", emphasis ? "mt-0.5 h-6 w-6" : "mt-0.5 h-5 w-5")} aria-hidden />
        <span className="min-w-0 flex-1">
          <h2 className={cn("break-words text-foreground", emphasis ? "section-title" : "font-semibold")}>
            {destination.label}
          </h2>
          <span className="mt-1 block break-words text-sm leading-6 text-muted-foreground">{destination.detail}</span>
        </span>
        {emphasis ? <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden /> : null}
      </Link>
    </li>
  );
}

/**
 * A competition experience the product does not offer yet.
 *
 * Deliberately NOT a disabled button and NOT `aria-disabled` on a non-interactive div — it is a
 * statement, so it carries no interactive semantics at all. The previous version dimmed the whole
 * block with `opacity-80`, which multiplied through to its text and measured 3.71:1 in light mode.
 * The state now reads through four independent signals — the dashed `unavailable` edge, a clock
 * icon, the words "Coming soon", and full-strength `--foreground` / `--muted-foreground` text — so
 * it survives with CSS removed and is never distinguished by colour alone.
 */
function ComingSoonOption({ destination }: { destination: Destination }) {
  const Icon = destination.icon;
  return (
    <li>
      <div className="flex min-h-11 items-start gap-3 rounded-lg border border-dashed border-unavailable/60 bg-unavailable/[0.06] p-4">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-unavailable" aria-hidden />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="break-words font-semibold text-foreground">{destination.label}</h2>
            <StatusChip variant="coming-soon">Coming soon</StatusChip>
          </div>
          <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{destination.detail}</p>
        </div>
      </div>
    </li>
  );
}

export default async function CompetePage({ searchParams }: { searchParams: { track?: string } }) {
  const activeTrack = await getActiveTrack(searchParams.track);
  // The first destination of every track IS its strongest real action (Debate: the round; DECA: the
  // guided role-play; HOSA: the Event Navigator). Splitting the existing array is what gives the page
  // its hierarchy — the data above is untouched, so every label, detail, href, order position and
  // comingSoon value is exactly what it was.
  const destinations = activeTrack ? competeDestinations(activeTrack) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compete"
        badges={activeTrack ? <Badge variant="outline">Training in: {activeTrack.label}</Badge> : null}
        heading={<h1 className="page-title">Compete</h1>}
        description={<p>Scored practice that mirrors the real event. Pick your arena.</p>}
      />

      {destinations.length === 0 ? (
        // Fail closed: without a resolved track we never guess an arena (or show another track's).
        // A neutral empty state — different icon, wording, structure and edge treatment from the
        // coming-soon block, so the two are never told apart by colour.
        <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed bg-card p-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Inbox className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-4 font-semibold text-foreground">Choose your track first</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Compete shows the scored activities for your event. Pick a track to see them.
          </p>
          <Link
            href={"/training" as Route}
            className={cn(buttonVariants({ size: "sm" }), "mt-4 h-auto min-h-11 min-w-11 px-4")}
          >
            Choose a track
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {destinations.map((destination, index) =>
            destination.comingSoon || !destination.href ? (
              <ComingSoonOption key={destination.label} destination={destination} />
            ) : (
              // index 0 is the track's own strongest experience — emphasis is weight, not a claim.
              <CompeteOption key={destination.label} destination={destination} emphasis={index === 0} />
            )
          )}
        </ul>
      )}
    </div>
  );
}
