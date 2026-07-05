import { cookies } from "next/headers";
import { resolveTrackFromSlugs, TRACK_COOKIE, type TrackInfo } from "@/lib/training-tracks";

// Server-side active-track resolver for server components (dashboard, study, tests, skills). The
// URL `?track=` wins on track-specific routes; otherwise we read the preference cookie so the
// selected track survives navigation without relying only on the query param. Returns undefined only
// when the user has no selection at all (the sole "browse all" case).
export function getActiveTrack(querySlug?: string | null): TrackInfo | undefined {
  const cookieSlug = cookies().get(TRACK_COOKIE)?.value;
  return resolveTrackFromSlugs(querySlug, cookieSlug);
}
