import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Compass } from "lucide-react";
import { DecaEventNavigator } from "@/components/training/deca-event-navigator";
import { HosaEventNavigator } from "@/components/training/hosa-event-navigator";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { decaFamilyById, DECA_CURRENT_SEASON, DECA_NAVIGATOR_SCOPE_NOTE } from "@/lib/deca-events";
import { hosaEventById, HOSA_CURRENT_SEASON, HOSA_NAVIGATOR_SCOPE_NOTE, HOSA_REVALIDATION_NOTE } from "@/lib/hosa-events";
import { isTrackRetired, trackBySlug } from "@/lib/training-tracks";

// Event Navigator route. Static registry data rendered on the server — no API, no database, no
// schema, no persisted selection. The learner's choice lives in the URL or in component state.
//
// Each track gets its OWN registry, component and query parameter. There is deliberately no shared
// "event" abstraction across tracks: HOSA reads `?event=` from lib/hosa-events, DECA reads
// `?family=` from lib/deca-events, and neither can resolve the other's identifier. A track without
// a Navigator 404s exactly as it did before the route existed.

/** A repeated query param arrives as an array — treat anything but a single string as absent. */
function singleParam(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export default function EventNavigatorPage({
  params,
  searchParams
}: {
  params: { track: string };
  searchParams?: { event?: string | string[]; family?: string | string[] };
}) {
  const track = trackBySlug(params.track);
  if (!track) notFound();
  if (isTrackRetired(track.id)) redirect("/training");
  if (track.id !== "HOSA" && track.id !== "DECA") notFound();

  const isHosa = track.id === "HOSA";
  // Each track resolves ONLY its own parameter through its own fail-closed lookup. Present but
  // unresolvable yields an honest unknown state — never a silent redirect, never the first entry,
  // never another family's content.
  const requested = isHosa ? singleParam(searchParams?.event) : singleParam(searchParams?.family);
  const selected = isHosa ? hosaEventById(requested) : decaFamilyById(requested);
  const unknownId = requested && !selected ? requested : undefined;

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
          {isHosa ? "Find your HOSA event" : "Find your DECA event family"}
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          {isHosa
            ? "The mistake that costs HOSA competitors the most happens before practice begins: preparing for the wrong kind of event. Start here, identify your exact event, and train the parts it actually contains."
            : "DECA is not one format. Its families differ in timing, exam structure, Performance Indicators, and when a judge may ask questions — so start by identifying your family, and train what that family actually runs on."}
        </p>
        <p className="mt-3 max-w-3xl text-xs leading-6 text-muted-foreground">
          {isHosa ? HOSA_NAVIGATOR_SCOPE_NOTE : DECA_NAVIGATOR_SCOPE_NOTE}
        </p>
        <p className="mt-2 max-w-3xl text-xs leading-6 text-muted-foreground">
          {isHosa ? (
            <>
              Content reflects the {HOSA_CURRENT_SEASON} official set. {HOSA_REVALIDATION_NOTE}
            </>
          ) : (
            <>
              Content reflects the {DECA_CURRENT_SEASON} official set and must be re-checked against your family&apos;s
              current guideline — a source that is current today does not stay current.
            </>
          )}
        </p>
      </div>

      {isHosa ? (
        <HosaEventNavigator initialEventId={selected?.id ?? null} unknownEventId={unknownId ?? null} />
      ) : (
        <DecaEventNavigator initialFamilyId={selected?.id ?? null} unknownFamilyId={unknownId ?? null} />
      )}
    </div>
  );
}
