// Shared source, provenance and freshness model (M9) — fail-closed by construction.
//
// ONE place decides what a learner may be told about where a fact came from and how current it is.
// Registries and lessons supply metadata; this module decides what that metadata is allowed to
// claim; the shared indicator component renders the decision. No component invents a label, a
// season, a date, or a gate.
//
// Pure: no React, no browser API, no network, no AI provider, no database, no storage, no mastery
// or progress import. Metadata in, verdict out.
//
// It NEVER repairs metadata. An incomplete official claim degrades — it is not back-filled from the
// calendar, from a file timestamp, from a URL path, or from another organization's schedule.

export type SourceAuthority = "official" | "stable-teaching" | "tier-2" | "partial" | "unverified";

export type FreshnessStatus = "current" | "stable" | "awaiting-revalidation" | "possibly-outdated";

export type SourceOrganization = "NSDA" | "DECA" | "HOSA" | "CompeteReady";

export type SourceRevalidation = {
  required: boolean;
  /** What the learner must re-check against, e.g. "the expected September 1, 2026 release". */
  triggerLabel?: string;
  note?: string;
};

export type SourceFreshnessMetadata = {
  authority: SourceAuthority;
  /**
   * Absent when the record has no currency claim to make. A partial record genuinely does not know
   * whether it is current, and "absent" is the honest representation of that — not a default.
   */
  freshness?: FreshnessStatus;
  sourceLabel?: string;
  organization?: SourceOrganization;
  season?: string;
  documentVersion?: string;
  /** ISO yyyy-mm-dd. Anything else is treated as absent rather than guessed at. */
  lastVerified?: string;
  revalidation?: SourceRevalidation;
  associationVariation?: boolean;
  competitionLevelVariation?: boolean;
};

/**
 * What the learner may actually be shown. Every field is either supported text or null — there is
 * no "unknown" placeholder to render, because a placeholder that looks like a value is the failure
 * this module exists to prevent.
 */
export type SourceFreshnessPresentation = {
  /** The authority actually granted, which may be lower than the one claimed. */
  authority: SourceAuthority;
  authorityLabel: string;
  freshnessLabel: string | null;
  verifiedLabel: string | null;
  revalidationLabel: string | null;
  revalidationNote: string | null;
  variationLabels: string[];
  sourceLabel: string | null;
  /** True when a claim was reduced because its supporting metadata was missing or malformed. */
  degraded: boolean;
  /** Presentation tone. "verified" is reserved for claims that survived every check. */
  tone: "verified" | "provisional";
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Formats an ISO yyyy-mm-dd date for a learner, or returns null.
 *
 * Deliberately parsed by hand: `new Date("2026-07-05")` is UTC-midnight and renders as the previous
 * day in western timezones, which would show a verification date that never happened.
 */
export function formatVerifiedDate(iso: string | undefined): string | null {
  if (typeof iso !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Reject impossible calendar days (2026-02-31) rather than displaying them.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

/** Learner-facing authority wording. Machine values are never shown. */
function authorityLabel(authority: SourceAuthority, organization?: SourceOrganization): string {
  switch (authority) {
    case "official":
      return organization && organization !== "CompeteReady" ? `Official ${organization} source` : "Official source";
    case "stable-teaching":
      return organization && organization !== "CompeteReady"
        ? `${organization} teaching material — not a current-rules source`
        : "Stable teaching material — not a current-rules source";
    case "tier-2":
      return "CompeteReady instruction — not official competition rules";
    case "partial":
      return "Complete current details not yet verified";
    case "unverified":
    default:
      return "Not yet verified";
  }
}

function freshnessLabel(freshness: FreshnessStatus, season?: string, documentVersion?: string): string | null {
  switch (freshness) {
    case "current":
      // Requires something concrete to be current *for*. Handled by the caller; unreachable without.
      if (season) return `Current for ${season}`;
      if (documentVersion) return `Current — ${documentVersion}`;
      return null;
    case "stable":
      return "Durable guidance, not tied to one season";
    case "awaiting-revalidation":
      return "Awaiting revalidation against the next release";
    case "possibly-outdated":
      return "May be out of date — check the current document";
    default:
      return null;
  }
}

/**
 * Decides what this metadata is allowed to claim.
 *
 * Fail-closed rules, each one a thing we would otherwise show without support:
 *  - "official" needs a source label AND an organization. A bare "Official source" naming nothing
 *    is unfalsifiable, so it degrades to unverified.
 *  - "current" needs a season or a document version. Current *as of what* is the whole claim.
 *  - a last-verified date must be a real ISO calendar date, or it is omitted entirely.
 *  - revalidation with no trigger says only that revalidation is required — it never invents a date.
 *  - partial and unverified never render with verified tone or official wording.
 */
export function presentSourceFreshness(metadata: SourceFreshnessMetadata): SourceFreshnessPresentation {
  const sourceLabel = metadata.sourceLabel?.trim() || null;
  const organization = metadata.organization;
  let degraded = false;

  // --- authority -------------------------------------------------------------------------------
  let authority = metadata.authority;
  if (authority === "official" && (!sourceLabel || !organization)) {
    authority = "unverified";
    degraded = true;
  }
  if (authority === "stable-teaching" && !sourceLabel) {
    authority = "unverified";
    degraded = true;
  }

  // --- freshness -------------------------------------------------------------------------------
  const season = metadata.season?.trim() || undefined;
  const documentVersion = metadata.documentVersion?.trim() || undefined;
  let freshness: FreshnessStatus | null = metadata.freshness ?? null;
  if (freshness === "current" && !season && !documentVersion) {
    // No claim at all rather than an unanchored "Current".
    freshness = null;
    degraded = true;
  }
  // An unverified or partial record cannot make a currency claim at all. The one exception is an
  // explicit staleness warning, which only ever reduces what the learner trusts.
  if ((authority === "unverified" || authority === "partial") && freshness && freshness !== "possibly-outdated") {
    if (freshness === "current") degraded = true;
    freshness = null;
  }

  // --- verification date -------------------------------------------------------------------------
  const formatted = formatVerifiedDate(metadata.lastVerified);
  if (metadata.lastVerified && !formatted) degraded = true;
  // A date only means something next to a source. Without one it is decoration, so it is dropped.
  const verifiedLabel = formatted && sourceLabel ? `Last verified ${formatted}` : null;

  // --- revalidation ------------------------------------------------------------------------------
  let revalidationLabel: string | null = null;
  const trigger = metadata.revalidation?.triggerLabel?.trim();
  if (metadata.revalidation?.required) {
    revalidationLabel = trigger ? `Revalidation required after ${trigger}` : "Revalidation required before relying on this";
  }
  const revalidationNote = metadata.revalidation?.note?.trim() || null;

  // --- variation ----------------------------------------------------------------------------------
  const variationLabels: string[] = [];
  if (metadata.associationVariation) variationLabels.push("Association rules may vary");
  if (metadata.competitionLevelVariation) variationLabels.push("Rules may differ by competition level");

  return {
    authority,
    authorityLabel: authorityLabel(authority, organization),
    freshnessLabel: freshness ? freshnessLabel(freshness, season, documentVersion) : null,
    verifiedLabel,
    revalidationLabel,
    revalidationNote,
    variationLabels,
    sourceLabel,
    degraded,
    // "verified" tone is reserved for an official claim that survived every check with a date.
    tone: authority === "official" && !degraded && verifiedLabel ? "verified" : "provisional"
  };
}
