import { cookies } from "next/headers";
import { isTrackRetired, trackBySlug, TRACK_COOKIE, type TrackInfo } from "@/lib/training-tracks";

// ---------------------------------------------------------------------------------------------
// Active-track resolution contract (C5B1). This is the SINGLE source of truth for "which track is
// this render scoped to". Two things are deliberately SEPARATE:
//   • current-activity context — the track a route/lesson/deck/drill/simulation is about, and
//   • saved preference — the user's persistent track (the switcher cookie).
//
// Priority (first match wins):
//   1. explicit route/activity track (e.g. `?track=` or the entity's own track)
//   2. saved user preference (the switcher cookie)
//   3. unresolved  → the caller must fail CLOSED (show shared-only) or route to onboarding.
//                    An unresolved track NEVER means "show every track".
//
// An explicit route track controls context for THIS render only; it does NOT write the preference
// cookie. The saved preference changes solely through the persistent switcher (setTrack), so opening
// a DECA deep link while HOSA is saved renders DECA without overwriting the saved HOSA preference.
// ---------------------------------------------------------------------------------------------

export type TrackResolution =
  | { resolved: true; track: TrackInfo; source: "route" | "preference" }
  | { resolved: false; track: undefined; source: "none" };

// Retired tracks (Model UN) never resolve as active — a stale slug/cookie is treated as absent.
function activeTrackFromSlug(slug?: string | null): TrackInfo | undefined {
  const track = trackBySlug(slug ?? undefined);
  return track && !isTrackRetired(track.id) ? track : undefined;
}

export function resolveActiveTrack(routeSlug?: string | null): TrackResolution {
  // 1. explicit current-activity/route track — controls context, never persists the preference.
  const routeTrack = activeTrackFromSlug(routeSlug);
  if (routeTrack) return { resolved: true, track: routeTrack, source: "route" };

  // 2. saved user preference (the switcher cookie).
  const cookieTrack = activeTrackFromSlug(cookies().get(TRACK_COOKIE)?.value);
  if (cookieTrack) return { resolved: true, track: cookieTrack, source: "preference" };

  // 3. unresolved — caller decides: fail-closed shared-only, or redirect to onboarding (C5B2).
  return { resolved: false, track: undefined, source: "none" };
}

// Back-compat helper used across server components. Returns the resolved track or undefined; callers
// that scope content MUST fail closed on undefined (shared/GENERAL only), never "show everything".
export function getActiveTrack(querySlug?: string | null): TrackInfo | undefined {
  return resolveActiveTrack(querySlug).track;
}
