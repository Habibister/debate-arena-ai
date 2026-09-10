import type { Organization } from "@prisma/client";
import { isTrackRetired, trackBySlug, trackByOrganization, type TrackInfo } from "@/lib/training-tracks";

// ---------------------------------------------------------------------------------------------
// The learner-facing "effective track" contract — PURE, importable by server AND client code.
// (Owner QA Repair 2.) One function decides which track a render is scoped to, and BOTH halves of
// the product consume it: server pages through `lib/track-server.ts`, the shell/nav/badge through
// `components/training/training-track-context.tsx`. Before this, the body read the session and the
// cookie while the shell read localStorage, so one screen could show a DECA page under a HOSA badge
// with Debate links — three answers to one question.
//
// Priority (first match wins):
//   1. explicit route/activity track — `/training/<slug>`, a `?track=` on a route that consumes it,
//      or the track a piece of content belongs to (a lesson's own track). Controls THIS render only
//      and never persists.
//   2. the learner's CURRENT SELECTION — the switcher cookie, and only when it was written for this
//      signed-in learner (owner-bound, see `parseTrackSelectionCookie`). Written by an intentional
//      act: entering a track hub, or the onboarding diagnostic.
//   3. the learner's SIGNUP ORGANIZATION — the fallback when no selection has been made.
//   4. unresolved → callers fail CLOSED (shared-only) — never "show every track".
//
// WHY THE SELECTION NOW SITS ABOVE THE ORGANIZATION. M14 Phase 1a put the organization above the
// cookie because the cookie's only writer at the time initialised itself to General Debate, so a DECA
// signup was silently switched to Debate. That hazard is closed differently here: a selection counts
// only when the cookie carries this learner's own scope, so a legacy value, a default-initialised
// value, or another account's selection on a shared browser is ignored — and the organization takes
// over. With that guard in place the documented "saved track" can actually win, which is the only
// way "Switch track" can mean what it says.
// ---------------------------------------------------------------------------------------------

export type TrackSource = "route" | "preference" | "organization";

export type TrackResolution =
  | { resolved: true; track: TrackInfo; source: TrackSource }
  | { resolved: false; track: undefined; source: "none" };

// Retired tracks (Model UN) never resolve as active — a stale slug/cookie is treated as absent.
export function activeTrackFromSlug(slug?: string | null): TrackInfo | undefined {
  const track = trackBySlug(slug ?? undefined);
  return track && !isTrackRetired(track.id) ? track : undefined;
}

// Only organizations that HAVE a live track resolve. PUBLIC_SPEAKING and MOCK_TRIAL have no track at
// all (trackByOrganization returns undefined); MODEL_UN has one but it is retired. Every other value —
// null, undefined, a stale enum member, or a string that is no longer an Organization — is treated as
// absent so it falls through rather than overriding anything.
export function activeTrackFromOrganization(organization?: Organization | null): TrackInfo | undefined {
  if (!organization) return undefined;
  const track = trackByOrganization(organization);
  return track && !isTrackRetired(track.id) ? track : undefined;
}

/**
 * The precedence rule itself, as a pure function of the three inputs. Kept separate from any request
 * or browser plumbing so the ordering can be tested directly and exhaustively, and so the server
 * resolver and the client shell cannot drift: they call THIS.
 *
 * `cookieSlug` is the learner's validated selection — the caller has already proven the cookie was
 * written for this learner (`parseTrackSelectionCookie`). An unvalidated value must never reach here.
 */
export function pickActiveTrack(input: {
  routeSlug?: string | null;
  organization?: Organization | null;
  cookieSlug?: string | null;
}): TrackResolution {
  // 1. explicit current-activity/route track — controls context, never persists the selection.
  const routeTrack = activeTrackFromSlug(input.routeSlug);
  if (routeTrack) return { resolved: true, track: routeTrack, source: "route" };

  // 2. the learner's own current selection (the switcher cookie, owner-bound).
  const cookieTrack = activeTrackFromSlug(input.cookieSlug);
  if (cookieTrack) return { resolved: true, track: cookieTrack, source: "preference" };

  // 3. the signed-in learner's persisted signup organization.
  const orgTrack = activeTrackFromOrganization(input.organization);
  if (orgTrack) return { resolved: true, track: orgTrack, source: "organization" };

  // 4. unresolved — the caller fails closed (shared-only) or routes to the track chooser.
  return { resolved: false, track: undefined, source: "none" };
}

// ---------------------------------------------------------------------------------------------
// Owner-bound selection cookie.
//
// Value shape: `<slug>.<scope>` where `scope` is an opaque, one-way digest of the learner's account id
// computed server-side (`selectionScopeForUser` in lib/track-server.ts) — the browser never stores a
// raw database identifier, the same rule the lesson resume namespace already follows. A value with no
// scope, or with someone else's scope, is NOT this learner's selection and is treated as absent.
// ---------------------------------------------------------------------------------------------

const SCOPE_PATTERN = /^[a-f0-9]{16}$/;

export function trackSelectionCookieValue(slug: string, scope: string): string {
  return `${slug}.${scope}`;
}

/**
 * The selection slug carried by a cookie value, or null when the value is not a selection this learner
 * made: malformed, legacy (no scope), or scoped to a different account. Never throws.
 */
export function parseTrackSelectionCookie(value: string | null | undefined, expectedScope: string | null | undefined): string | null {
  if (!value || !expectedScope || !SCOPE_PATTERN.test(expectedScope)) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const slug = value.slice(0, dot);
  const scope = value.slice(dot + 1);
  if (scope !== expectedScope) return null;
  return activeTrackFromSlug(slug) ? slug : null;
}
