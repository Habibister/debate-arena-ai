import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Compass } from "lucide-react";
import { HosaEventNavigator } from "@/components/training/hosa-event-navigator";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { hosaEventById, HOSA_CURRENT_SEASON, HOSA_NAVIGATOR_SCOPE_NOTE, HOSA_REVALIDATION_NOTE } from "@/lib/hosa-events";
import { isTrackRetired, trackBySlug } from "@/lib/training-tracks";

// HOSA Event Navigator route (M8A). Static registry data rendered on the server — no API, no
// database, no schema, no persisted selection. The learner's chosen event lives in the URL
// (`?event=`) or in component state, and nowhere else.
//
// M8A is HOSA only. Any other track 404s here exactly as it did before this route existed; the DECA
// Navigator is M8B and has not started.
export default function EventNavigatorPage({
  params,
  searchParams
}: {
  params: { track: string };
  searchParams?: { event?: string | string[] };
}) {
  const track = trackBySlug(params.track);
  if (!track) notFound();
  if (isTrackRetired(track.id)) redirect("/training");
  if (track.id !== "HOSA") notFound();

  // A repeated query param arrives as an array — treat anything that is not a single string as
  // absent rather than guessing which value was meant.
  const raw = typeof searchParams?.event === "string" ? searchParams.event : undefined;
  const requested = raw?.trim() ? raw.trim() : undefined;
  const selected = hosaEventById(requested);
  // Present but unresolvable: an honest unknown state. Never a silent redirect, never the first
  // entry, never another event's content.
  const unknownEventId = requested && !selected ? requested : undefined;

  return (
    <div className="space-y-6">
      <Link href={`/training/${track.slug}` as Route} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {track.label} hub
      </Link>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{track.label}</Badge>
          <Badge variant="outline">Event Navigator</Badge>
        </div>
        <h1 className="page-title mt-3 flex items-center gap-2">
          <Compass className="h-6 w-6 text-track" aria-hidden />
          Find your HOSA event
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          The mistake that costs HOSA competitors the most happens before practice begins: preparing for the wrong kind of
          event. Start here, identify your exact event, and train the parts it actually contains.
        </p>
        <p className="mt-3 max-w-3xl text-xs leading-6 text-muted-foreground">{HOSA_NAVIGATOR_SCOPE_NOTE}</p>
        <p className="mt-2 max-w-3xl text-xs leading-6 text-muted-foreground">
          Content reflects the {HOSA_CURRENT_SEASON} official set. {HOSA_REVALIDATION_NOTE}
        </p>
      </div>

      <HosaEventNavigator initialEventId={selected?.id ?? null} unknownEventId={unknownEventId ?? null} />
    </div>
  );
}
