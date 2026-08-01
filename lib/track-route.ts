import { isTrackRetired, trackBySlug, type TrainingTrack } from "@/lib/training-tracks";

/**
 * Which track does a PATHNAME unambiguously belong to? (M12C)
 *
 * This is the client-side half of the contract `lib/track-server.ts` already documents and enforces
 * on the server: *route context wins for this render; the saved preference is owned solely by the
 * explicit switcher*. The shell used to resolve its track identity from stored preference alone, so
 * opening `/training/deca` with a stored Debate preference painted Debate chrome and a "Track:
 * Debate" label on a DECA page. This resolver supplies the missing route half.
 *
 * It is deliberately tiny and total:
 *   • pure — no browser API, no React, no storage, no network, no mutation
 *   • no feature registry — only the stable track lookups it needs to name a supported track
 *   • fail-closed — anything it cannot prove belongs to a track returns `undefined`, and the caller
 *     falls back to the stored preference (today's behaviour)
 *
 * What it must NOT claim:
 *   • `/debate/<id>` — the arena loads a Debate record by id with no organization filter, and Home
 *     links unfinished DECA/HOSA role-play sessions there. The URL cannot tell you the track.
 *   • `/debates/history`, `/debates/<id>/replay` — history holds every track's sessions; both the
 *     DECA and HOSA Compete pages link to it.
 *   • `/training/model-un/*` — a soft-removed track never receives a visual identity.
 */
export function resolveTrackFromPathname(pathname: string): TrainingTrack | undefined {
  if (typeof pathname !== "string" || pathname.length === 0) return undefined;

  // `usePathname()` never carries a query or hash, but a caller or fixture may. Strip both, drop any
  // trailing slash, and require an absolute path — a relative or malformed input resolves to nothing.
  const path = (pathname.split("?")[0] ?? "").split("#")[0] ?? "";
  if (!path.startsWith("/")) return undefined;
  const segments = path.split("/").filter(Boolean);

  // `/debate` EXACTLY is the General Debate room set-up; the route itself redirects any other track
  // away, so if it renders, the track is Debate. `/debate/<id>` is the ambiguous arena — excluded by
  // the length check, never by a prefix match.
  if (segments.length === 1 && segments[0] === "debate") return activeTrackIdForSlug("debate");

  // `/training/<slug>` and every descendant. `/training` alone is the chooser — neutral, not a track.
  if (segments.length >= 2 && segments[0] === "training") return activeTrackIdForSlug(segments[1]);

  return undefined;
}

/** The track id for a slug, but only when that track is real and still active. */
function activeTrackIdForSlug(slug: string): TrainingTrack | undefined {
  const info = trackBySlug(slug);
  if (!info || isTrackRetired(info.id)) return undefined;
  return info.id;
}
