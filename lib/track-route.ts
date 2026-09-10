import { isTrackRetired, trackById, trackBySlug, type TrainingTrack } from "@/lib/training-tracks";

/**
 * Which track does a PATHNAME unambiguously belong to? (M12C)
 *
 * This is the client-side half of the contract `lib/track-precedence.ts` documents and
 * `lib/track-server.ts` enforces on the server: *route context wins for this render; the saved
 * selection is owned solely by the explicit switcher*. The shell used to resolve its track identity
 * from stored preference alone, so opening `/training/deca` with a stored Debate preference painted
 * Debate chrome and a "Track: Debate" label on a DECA page. This resolver supplies the route half.
 *
 * It is deliberately tiny and total:
 *   • pure — no browser API, no React, no storage, no network, no mutation
 *   • no feature registry — only the stable track lookups it needs to name a supported track
 *   • fail-closed — anything it cannot prove belongs to a track returns `undefined`, and the caller
 *     falls back to the learner's selection / organization
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

/**
 * Routes whose page CONSUMES `?track=` — i.e. whose server component passes `searchParams.track` to
 * the resolver. (Owner QA Repair 2.) This list is the single statement of that fact, used in two
 * directions: the shell APPENDS the effective track to these hrefs, and it READS `?track=` from the
 * URL only on these routes — so the shell can never honour a parameter the page ignores, nor ignore
 * one the page honours. `scripts/track-context-smoke.ts` proves the list equals the set of pages that
 * actually read the parameter.
 *
 * `/dashboard`, `/resources`-less routes such as `/teams`, `/assignments`, `/settings`, `/profile`
 * and `/debates/history` are NOT here: they take no parameter, so they render the learner's
 * selection/organization track, which is also what the shell shows on them.
 */
export const TRACK_PARAM_ROUTES = [
  "/home",
  "/compete",
  "/study-arcade",
  "/study-arcade/review",
  "/tests",
  "/skills",
  "/lessons",
  "/resources",
  "/debate",
  "/study"
] as const;

// A lesson page carries the lesson's OWN track in `?track=` (the page redirects to add it when the
// URL disagrees with the content), so the shell reads the parameter on every `/lessons/<slug>` too.
const LESSON_ROUTE = /^\/lessons\/[^/]+$/;

/**
 * RECORD-OWNED routes (Owner QA Repair 3D). A finished record belongs to the organization stored on
 * the row, not to whatever track the learner currently has selected: a DECA learner opening their own
 * General Debate replay was shown "Track: DECA" over a Debate transcript. These two pages therefore
 * stamp the RECORD's track into `?track=` exactly the way a lesson page stamps its content's track,
 * and the shell reads it here.
 *
 * The pathname still proves nothing on its own — `resolveTrackFromPathname` above deliberately
 * refuses `/debates/<id>/replay`, because the id alone cannot tell you the track and the page must
 * load the row first. Only the value the page itself redirected to is honoured, and only after the
 * page has read the record's organization. Where a record's organization maps to no active track the
 * page adds nothing, so the learner's own track keeps the shell and the body still names the record.
 *
 * The live arena `/debate/<id>` is NOT here: it is an activity, not a record view, it already carries
 * its own record-owned breadcrumb and "Back to <track>", and rewriting its URL mid-round would change
 * operational behaviour.
 */
const RECORD_ROUTES = [/^\/debates\/[^/]+\/replay$/, /^\/tests\/[^/]+\/results$/];

function normalizePath(pathname: string): string {
  const path = (pathname.split("?")[0] ?? "").split("#")[0] ?? "";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function routeConsumesTrackParam(pathname: string): boolean {
  if (typeof pathname !== "string") return false;
  const path = normalizePath(pathname);
  return (
    (TRACK_PARAM_ROUTES as readonly string[]).includes(path) ||
    LESSON_ROUTE.test(path) ||
    RECORD_ROUTES.some((route) => route.test(path))
  );
}

/**
 * The explicit route slug for a LOCATION (pathname + its `track` query value), for the client half of
 * the precedence. A track-scoped pathname wins; otherwise the `?track=` value, but only where the page
 * consumes it. Returns the raw slug — `pickActiveTrack` validates it — or undefined.
 */
export function routeTrackSlugFor(pathname: string, trackParam: string | null | undefined): string | undefined {
  const fromPath = resolveTrackFromPathname(pathname);
  if (fromPath) return trackById(fromPath).slug;
  if (trackParam && routeConsumesTrackParam(pathname)) return trackParam;
  return undefined;
}
