import { cache } from "react";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import type { Organization } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { TRACK_COOKIE, type TrackInfo } from "@/lib/training-tracks";
import {
  activeTrackFromOrganization,
  activeTrackFromSlug,
  parseTrackSelectionCookie,
  pickActiveTrack,
  type TrackResolution
} from "@/lib/track-precedence";

// ---------------------------------------------------------------------------------------------
// Active-track resolution — the SERVER gatherer for the shared contract in `lib/track-precedence.ts`
// (C5B1 → M14 Phase 1a → Owner QA Repair 2). This file only collects the request inputs (route slug,
// session organization, the learner's own selection cookie) and hands them to `pickActiveTrack`; the
// precedence lives there, once, and the client shell consumes the same function with the same inputs
// (`getTrackContext` below is how the layout passes them down). Three things stay SEPARATE:
//   • current-activity context — the track a route/lesson/deck/drill/simulation is about,
//   • the learner's current SELECTION — the switcher cookie, owner-bound to this account, and
//   • the learner's signup organization — the fallback when nothing has been selected.
//
// Priority (first match wins): route/activity → selection → organization → unresolved (fail closed).
// See lib/track-precedence.ts for why the selection now outranks the organization.
//
// This resolver still NEVER writes: no cookie is set and no row is created while resolving. An
// explicit route track controls context for THIS render only. The selection changes solely through
// the client switcher (setTrack in components/training/training-track-context.tsx).
// ---------------------------------------------------------------------------------------------

export type { TrackResolution, TrackSource } from "@/lib/track-precedence";
export { activeTrackFromOrganization, pickActiveTrack } from "@/lib/track-precedence";

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

/**
 * Opaque, stable scope for the selection cookie. A one-way digest, truncated, so the browser never
 * stores a raw database identifier — the same rule the lesson resume namespace follows. It binds a
 * selection to the account that made it AND to the signup organization it was made under: when a
 * learner changes their organization on their profile, every earlier selection becomes foreign and
 * the new organization takes over until they enter a hub again. Nothing else is derived from it.
 */
export function selectionScopeForUser(userId: string, organization: Organization | null): string {
  return createHash("sha256").update(`track-selection:${userId}:${organization ?? "none"}`).digest("hex").slice(0, 16);
}

type TrackRequestInputs = {
  organization: Organization | null;
  // The learner's own validated selection slug — null when the cookie is absent, legacy, malformed,
  // or scoped to a different account.
  selection: string | null;
  // The scope the client must stamp on a new selection; null when signed out (no selection possible).
  selectionScope: string | null;
};

async function inputsForRequest(): Promise<TrackRequestInputs> {
  const session = await requestSession();
  const userId = session?.user?.id ?? null;
  const organization = session?.user?.organization ?? null;
  const selectionScope = userId ? selectionScopeForUser(userId, organization) : null;
  let rawCookie: string | null = null;
  try {
    rawCookie = cookies().get(TRACK_COOKIE)?.value ?? null;
  } catch {
    rawCookie = null;
  }
  return {
    organization,
    selection: parseTrackSelectionCookie(rawCookie, selectionScope),
    selectionScope
  };
}

export async function resolveActiveTrack(routeSlug?: string | null): Promise<TrackResolution> {
  // An explicit route track short-circuits BEFORE any session or cookie read, so a track-scoped URL
  // costs exactly what it did before Phase 1a.
  const routeTrack = activeTrackFromSlug(routeSlug);
  if (routeTrack) return { resolved: true, track: routeTrack, source: "route" };

  const inputs = await inputsForRequest();
  return pickActiveTrack({ organization: inputs.organization, cookieSlug: inputs.selection });
}

// Back-compat helper used across server components. Returns the resolved track or undefined; callers
// that scope content MUST fail closed on undefined (shared/GENERAL only), never "show everything".
export async function getActiveTrack(querySlug?: string | null): Promise<TrackInfo | undefined> {
  return (await resolveActiveTrack(querySlug)).track;
}

/**
 * The request-level inputs the CLIENT shell needs to compute the same effective track the pages do.
 * Read once by the (app) layout and passed to `TrainingTrackProvider`, so server HTML and the first
 * client render agree — no default-track flash, no localStorage-only shell.
 */
export async function getTrackContext(): Promise<TrackRequestInputs> {
  return inputsForRequest();
}
