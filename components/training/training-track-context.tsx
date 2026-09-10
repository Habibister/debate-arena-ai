"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Organization } from "@prisma/client";
import { DEFAULT_TRACK, normalizeTrack, TRACK_COOKIE, trackById, type TrainingTrack } from "@/lib/training-tracks";
import { parseTrackSelectionCookie, pickActiveTrack, trackSelectionCookieValue, type TrackSource } from "@/lib/track-precedence";
import { routeTrackSlugFor } from "@/lib/track-route";

// ---------------------------------------------------------------------------------------------
// The CLIENT half of the effective-track contract (Owner QA Repair 2).
//
// The provider is initialised by the (app) layout with the same request inputs the server resolver
// reads — the learner's signup organization and their own validated selection — and adds the route
// half on the client (pathname + `?track=` where the page consumes it). It then calls the SAME pure
// `pickActiveTrack` the pages call, so the shell badge, every nav href and the page body agree for
// every render, including the very first server-rendered HTML. Nothing is read from localStorage any
// more: the only persisted selection is the owner-bound cookie the server also reads.
//
// Writers: `setTrack` is the ONLY writer, and it is called only by an intentional act — entering a
// track hub (TrackControls) or finishing the onboarding diagnostic. Following a `?track=` link never
// writes: that is viewing, not selecting.
// ---------------------------------------------------------------------------------------------

export type TrackContextInputs = {
  organization: Organization | null;
  selection: string | null;
  selectionScope: string | null;
};

// Mirror an intentional selection into the owner-bound cookie the server reads. Client-only, never in
// the JWT/session. Without a scope (signed out) there is no learner to bind it to, so nothing is written.
function writeTrackCookie(track: TrainingTrack, scope: string | null) {
  if (!scope) return;
  try {
    const slug = trackById(track).slug;
    // 1 year, root path, Lax so it rides normal navigations.
    document.cookie = `${TRACK_COOKIE}=${trackSelectionCookieValue(slug, scope)}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // document unavailable or blocked — the selection simply does not persist.
  }
}

// The live value of the selection cookie in this browser — the same bytes the server will read on
// the next request. Null during SSR or when unreadable.
function readSelectionCookie(): string | null {
  try {
    if (typeof document === "undefined") return null;
    const hit = document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${TRACK_COOKIE}=`));
    return hit ? hit.slice(TRACK_COOKIE.length + 1) : null;
  } catch {
    return null;
  }
}

type TrainingTrackContextValue = {
  // The effective track for this render, or the default when nothing resolves. Kept for consumers
  // that need SOME track to build a path (learning path, diagnostic seed); the shell uses
  // `effectiveTrack` so an unresolved learner is never silently painted as Debate.
  track: TrainingTrack;
  effectiveTrack: TrainingTrack | undefined;
  source: TrackSource | "none";
  // The learner's OWN track — selection, else organization — ignoring any route/activity context.
  // What the learner returns to when a route-scoped view ends.
  ownTrack: TrainingTrack | undefined;
  // The learner's own persisted selection, if any — what entering a hub changes.
  selectedTrack: TrainingTrack | undefined;
  setTrack: (track: TrainingTrack) => void;
};

const TrainingTrackContext = createContext<TrainingTrackContextValue | null>(null);

const NO_INPUTS: TrackContextInputs = { organization: null, selection: null, selectionScope: null };

export function TrainingTrackProvider({ inputs = NO_INPUTS, children }: { inputs?: TrackContextInputs; children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The selection is server-validated on load; after an intentional switch it is updated here so the
  // shell reflects the new selection immediately, and the cookie carries it to the next request.
  const [selection, setSelection] = useState<string | null>(inputs.selection);

  // RE-SYNC, never seed. The server validated the selection for the first render; on every client
  // navigation afterwards the cookie is re-read and re-validated with the same scope, so a hub
  // entered in ANOTHER tab (or a cleared cookie) is reflected here the way the server already sees
  // it. It updates state only when the value actually changed, so the common path never re-renders.
  useEffect(() => {
    const live = parseTrackSelectionCookie(readSelectionCookie(), inputs.selectionScope);
    setSelection((current) => (current === live ? current : live));
  }, [pathname, searchParams, inputs.selectionScope]);

  const value = useMemo<TrainingTrackContextValue>(() => {
    // A repeated `?track=a&track=b` is not a track. The server sees an array and treats it as absent
    // (a string compare against the slug table fails); the client must agree, so only exactly one
    // value counts.
    const values = searchParams?.getAll("track") ?? [];
    const trackParam = values.length === 1 ? values[0] : null;
    const routeSlug = routeTrackSlugFor(pathname ?? "", trackParam);
    const resolution = pickActiveTrack({ routeSlug, organization: inputs.organization, cookieSlug: selection });
    const own = pickActiveTrack({ organization: inputs.organization, cookieSlug: selection }).track?.id;
    const selected = selection ? pickActiveTrack({ cookieSlug: selection }).track?.id : undefined;
    return {
      track: resolution.track?.id ?? DEFAULT_TRACK,
      effectiveTrack: resolution.track?.id,
      source: resolution.source,
      ownTrack: own,
      selectedTrack: selected,
      setTrack: (next) => {
        const normalized = normalizeTrack(next);
        setSelection(trackById(normalized).slug);
        writeTrackCookie(normalized, inputs.selectionScope);
      }
    };
  }, [pathname, searchParams, inputs.organization, inputs.selectionScope, selection]);

  return <TrainingTrackContext.Provider value={value}>{children}</TrainingTrackContext.Provider>;
}

export function useTrainingTrack() {
  return (
    useContext(TrainingTrackContext) ?? {
      track: DEFAULT_TRACK,
      effectiveTrack: undefined,
      source: "none" as const,
      ownTrack: undefined,
      selectedTrack: undefined,
      setTrack: () => {}
    }
  );
}
