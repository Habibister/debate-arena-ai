import { cache } from "react";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import type { Organization } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { isTrackRetired, trackBySlug, trackByOrganization, TRACK_COOKIE, type TrackInfo } from "@/lib/training-tracks";

// ---------------------------------------------------------------------------------------------
// Active-track resolution contract (C5B1, extended M14 Phase 1a). This is the SINGLE source of truth
// for "which track is this render scoped to". Three things are deliberately SEPARATE:
//   • current-activity context — the track a route/lesson/deck/drill/simulation is about,
//   • the learner's signup organization — what they told us they compete in, and
//   • saved preference — the user's persistent track (the switcher cookie).
//
// Priority (first match wins):
//   1. explicit route/activity track (e.g. `?track=` or the entity's own track)
//   2. the signed-in learner's persisted organization (M14 Phase 1a)
//   3. saved user preference (the switcher cookie)
//   4. unresolved  → the caller must fail CLOSED (show shared-only) or route to onboarding.
//                    An unresolved track NEVER means "show every track".
//
// WHY THE ORGANIZATION SITS ABOVE THE COOKIE. Before Phase 1a nothing read the organization a learner
// chose at signup, so the only writer of the track cookie was the client switcher — which initialises
// to DEFAULT_TRACK (General Debate). A student who signed up for DECA or HOSA therefore landed in
// General Debate and never saw their own track's content. Placing the organization at priority 2 is
// the approved M14 Phase 1a precedence.
//
// This resolver still NEVER writes: no cookie is set and no row is created while resolving. An
// explicit route track controls context for THIS render only. The saved preference changes solely
// through the persistent switcher (setTrack).
// ---------------------------------------------------------------------------------------------

export type TrackResolution =
  | { resolved: true; track: TrackInfo; source: "route" | "organization" | "preference" }
  | { resolved: false; track: undefined; source: "none" };

// Retired tracks (Model UN) never resolve as active — a stale slug/cookie is treated as absent.
function activeTrackFromSlug(slug?: string | null): TrackInfo | undefined {
  const track = trackBySlug(slug ?? undefined);
  return track && !isTrackRetired(track.id) ? track : undefined;
}

// Only organizations that HAVE a live track resolve. PUBLIC_SPEAKING and MOCK_TRIAL have no track at
// all (trackByOrganization returns undefined); MODEL_UN has one but it is retired. Every other value —
// null, undefined, a stale enum member, or a string that is no longer an Organization — is treated as
// absent so it falls through to the cookie rather than overriding it.
export function activeTrackFromOrganization(organization?: Organization | null): TrackInfo | undefined {
  if (!organization) return undefined;
  const track = trackByOrganization(organization);
  return track && !isTrackRetired(track.id) ? track : undefined;
}

/**
 * The precedence rule itself, as a pure function of the three inputs. Kept separate from the request
 * plumbing (cookies/session) so the ordering can be tested directly and exhaustively without a Next
 * request context — `resolveActiveTrack` below is only the gatherer.
 */
export function pickActiveTrack(input: {
  routeSlug?: string | null;
  organization?: Organization | null;
  cookieSlug?: string | null;
}): TrackResolution {
  // 1. explicit current-activity/route track — controls context, never persists the preference.
  const routeTrack = activeTrackFromSlug(input.routeSlug);
  if (routeTrack) return { resolved: true, track: routeTrack, source: "route" };

  // 2. the signed-in learner's persisted signup organization.
  const orgTrack = activeTrackFromOrganization(input.organization);
  if (orgTrack) return { resolved: true, track: orgTrack, source: "organization" };

  // 3. saved user preference (the switcher cookie).
  const cookieTrack = activeTrackFromSlug(input.cookieSlug);
  if (cookieTrack) return { resolved: true, track: cookieTrack, source: "preference" };

  // 4. unresolved — caller decides: fail-closed shared-only, or redirect to onboarding (C5B2).
  return { resolved: false, track: undefined, source: "none" };
}

async function readSession() {
  try {
    return await getServerSession(authOptions);
  } catch {
    // No request context (SSR harnesses, static analysis) — treat as signed out rather than throwing.
    return null;
  }
}

// One session read per request, shared by every caller of the resolver in that render. Without the
// cache() wrapper a page that already calls getServerSession would pay a second user lookup, because
// the NextAuth session callback re-reads the user row on every call.
//
// `cache` is feature-detected rather than imported unconditionally: Next's server build provides it,
// but React 18.3's plain CJS export does not, and the smoke suites import this module directly under
// tsx. Where it is absent the fallback is an uncached read — correct, just not deduped — and in that
// context there is no request and therefore no session to read anyway.
const requestSession: () => Promise<Awaited<ReturnType<typeof readSession>>> =
  typeof cache === "function" ? cache(readSession) : readSession;

async function organizationForRequest(): Promise<Organization | null> {
  const session = await requestSession();
  return session?.user?.organization ?? null;
}

function cookieSlugForRequest(): string | null {
  try {
    return cookies().get(TRACK_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export async function resolveActiveTrack(routeSlug?: string | null): Promise<TrackResolution> {
  // An explicit route track short-circuits BEFORE any session or cookie read, so a track-scoped URL
  // costs exactly what it did before Phase 1a.
  const routeTrack = activeTrackFromSlug(routeSlug);
  if (routeTrack) return { resolved: true, track: routeTrack, source: "route" };

  return pickActiveTrack({
    organization: await organizationForRequest(),
    cookieSlug: cookieSlugForRequest()
  });
}

// Back-compat helper used across server components. Returns the resolved track or undefined; callers
// that scope content MUST fail closed on undefined (shared/GENERAL only), never "show everything".
export async function getActiveTrack(querySlug?: string | null): Promise<TrackInfo | undefined> {
  return (await resolveActiveTrack(querySlug)).track;
}
