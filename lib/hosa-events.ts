// HOSA Event Navigator registry (M8A) — fail-closed by construction.
//
// This module is the SINGLE source of truth for every HOSA event fact the Navigator shows. No
// component may restate an official value as its own constant; it renders what lives here or it
// renders nothing.
//
// Pure: no React, no browser API, no network, no AI provider, no database, no storage, no mastery
// or progress import. Static data plus lookup helpers.
//
// ---------------------------------------------------------------------------------------------
// PROVENANCE — every value below traces to an approved local curriculum record. Nothing is written
// from memory, and nothing is inferred from a different event.
//
//   Medical Terminology, 50 questions / 60 minutes, verified 2026-07-05
//     docs/curriculum/00-principles-and-sources.md:130  ("Already sourced in the registry
//       (verified 2026-07-05, re-verify each season)" → "HOSA Medical Terminology: 50 questions /
//       60 minutes (changed this season from 100/90).")
//     docs/curriculum/03-hosa-course.md:21              ("Sourced today: Medical Terminology only
//       (50q/60min, verified 2026-07-05).")
//     docs/curriculum/07-videos-hosa.md:58              (Medical Terminology "is currently a
//       50-question timed" test)
//   Season 2025-26 is the current final official set
//     docs/curriculum/03-hosa-course.md:17-21, docs/curriculum/11-benchmark-hosa-event-navigator.md:12-14
//   September 1, 2026 revalidation gate
//     docs/curriculum/03-hosa-course.md:17-21, docs/curriculum/11-benchmark-hosa-event-navigator.md:12-14
//   Association dependence applies to every HOSA event
//     docs/curriculum/03-hosa-course.md:222-228 (§6, HR-2)
//   Event names + their CompeteReady branch
//     docs/curriculum/03-hosa-course.md:69-79 (§3 branching), :162 (Branch C), :173 (Branch D),
//     :181 (Branch E); docs/curriculum/11-benchmark-hosa-event-navigator.md:221-229 (footer table)
//
// NOT sourced, therefore NOT present anywhere below: official HOSA category names, room layout,
// who portrays a patient, team sizes, round counts, timings or question counts for any event other
// than Medical Terminology, equipment lists, tiebreakers, advancement rules, entry limits, results
// timing, and whether competitors receive rating sheets. Absent means absent — never defaulted,
// never borrowed from a sibling event.
//   docs/curriculum/00-principles-and-sources.md:137 ("non-MT HOSA categories (labeled generic
//     practice)" under "Known NOT sourced")
//   docs/curriculum/03-hosa-course.md:280-287 (open validation gates)

// TYPE-ONLY import: erased at compile time, so this module still pulls in nothing at runtime.
import type { SourceFreshnessMetadata } from "@/lib/source-freshness";

/**
 * CompeteReady's TRAINING grouping — deliberately NOT presented as HOSA's official category names.
 *
 * Doc 03 §2 requires official category names to come from the current guideline index and never to
 * be guessed; that index is not in the approved local record, so the Navigator does not claim one.
 * These are the branch families the approved course map already routes by
 * (03-hosa-course.md:69-79), labeled as ours, alongside an instruction to read the official
 * category from the learner's own current guideline.
 */
export type HosaTrainingFamily = "knowledge-test" | "clinical-skill" | "interview" | "presentation" | "team";

export type HosaSourceStatus =
  | "verified-current"
  | "verified-stable"
  | "partial"
  | "awaiting-season-revalidation";

export type HosaComponentType = "written-test" | "clinical-skill" | "interview" | "presentation" | "team" | "other";

export type HosaEventComponent = { type: HosaComponentType; label: string };

/**
 * Optional verified detail. EVERY field is optional and must stay absent unless an approved local
 * source supports it for THIS event. There are no defaults and no fallbacks.
 */
export type HosaVerifiedFacts = {
  questionCount?: number;
  timeMinutes?: number;
  rounds?: string[];
  teamSize?: string;
  ratingSheetAvailable?: boolean;
  prejudged?: boolean;
  onsite?: boolean;
  resultsTiming?: string;
  equipmentNote?: string;
  testPlanAvailable?: boolean;
};

export type HosaEventRecord = {
  id: string;
  name: string;
  family: HosaTrainingFamily;
  sourceStatus: HosaSourceStatus;
  season?: string;
  lastVerified?: string;
  sourceLabel?: string;
  components?: HosaEventComponent[];
  verifiedFacts?: HosaVerifiedFacts;
  associationVariation?: boolean;
  revalidationRequired?: boolean;
  routeTarget?: string;
};

// ---- season + gate wording (registry-owned; components never restate these) --------------------

/** The current final official set. */
export const HOSA_CURRENT_SEASON = "2025-26";

/**
 * The revalidation gate. Phrased as ONE dated expectation, never as a standing annual-release rule —
 * doc 03:17-20 states the official site expects the final 2026-27 guidelines on this date; it does
 * not establish that HOSA always publishes on September 1.
 */
export const HOSA_REVALIDATION_NOTE =
  "HOSA publishes annual competitive-event guidelines. The final 2026-27 guidelines are expected September 1, 2026 — after that release, every officially dependent detail here must be re-checked against it and any later update notices.";

/** Association dependence applies to every HOSA event (doc 03 §6). */
export const HOSA_ASSOCIATION_NOTE =
  "HOSA's guidelines are written for the International Leadership Conference. Your chartered association may run the event differently, and your association decides advancement — check with it or your advisor.";

/** What the Navigator can and cannot tell a learner. */
export const HOSA_NAVIGATOR_SCOPE_NOTE =
  "This Navigator is an orientation and routing tool, not a complete HOSA event database. Your event's current official guideline and rating sheet control every rule — read the date on the document itself.";

/** CompeteReady policy, always attributed to us (doc 03 §7, H5 — HOSA publishes no such rule). */
export const HOSA_SUPERVISION_POLICY_NOTE =
  "CompeteReady's own policy — not a HOSA rule — is that hands-on clinical skills should be practised with appropriate supervision and equipment.";

// ---- families ---------------------------------------------------------------------------------

export type HosaFamilyInfo = {
  id: HosaTrainingFamily;
  label: string;
  /** Plain-language description of the kind of event, and how training differs. */
  summary: string;
  /** The approved branch this family routes to (doc 03 §3). */
  branchLabel: string;
  /** Present only when that branch actually exists in the product today. */
  branchHref?: string;
  /** Extra scope text a learner must see before following the branch. */
  branchCaution?: string;
};

export const HOSA_FAMILIES: HosaFamilyInfo[] = [
  {
    id: "knowledge-test",
    label: "Knowledge test",
    summary: "A timed written exam. Trained with question banks, the official test plan, and spaced review — not with scenario conversations.",
    branchLabel: "Branch A — knowledge and test-plan study",
    branchHref: "/training/hosa/event/medical-terminology"
  },
  {
    id: "clinical-skill",
    label: "Clinical skill",
    summary: "A skill performed for evaluators against a rating sheet. CompeteReady trains only the knowledge, communication, and rating-sheet-reading layers.",
    branchLabel: "Branch B — clinical-skill communication",
    branchHref: "/lessons/how-hosa-scenario-interaction-works",
    branchCaution:
      "Communication is one layer inside a larger clinical skill event. This branch does not teach or score the physical skill, and completing it does not mean you are ready for the complete clinical event. CompeteReady never teaches, scores, or simulates hands-on clinical procedures, and app practice does not create clinical readiness. The hands-on skill needs in-person practice with your instructor."
  },
  {
    id: "interview",
    label: "Interview",
    summary: "A judge acts as interviewer and scores published interview rows. Trained by structuring answers against those rows.",
    branchLabel: "Branch C — interview structure"
  },
  {
    id: "presentation",
    label: "Presentation",
    summary: "A prepared presentation, poster, or portfolio. Trained through structure and delivery, grounded in the event's own guideline.",
    branchLabel: "Branch D — presentation structure and delivery"
  },
  {
    id: "team",
    label: "Team event",
    summary: "A team competition. CompeteReady offers round-structure orientation only.",
    branchLabel: "Branch E — round-structure orientation"
  }
];

export function hosaFamily(id: HosaTrainingFamily): HosaFamilyInfo | undefined {
  return HOSA_FAMILIES.find((f) => f.id === id);
}

// ---- the registry -----------------------------------------------------------------------------

/**
 * Every event whose IDENTITY and family routing is supported by the approved local record.
 *
 * Exactly one event carries verified structural facts. That is not an oversight — it is the whole
 * point of the fail-closed model: doc 00:137 lists non-MT HOSA categories as NOT sourced, so they
 * appear here as identity-only records and render as honest partial cards.
 */
export const HOSA_EVENTS: HosaEventRecord[] = [
  {
    id: "medical-terminology",
    name: "Medical Terminology",
    family: "knowledge-test",
    sourceStatus: "verified-current",
    season: HOSA_CURRENT_SEASON,
    lastVerified: "2026-07-05",
    sourceLabel: "HOSA 2025-26 competitive event guidelines",
    components: [{ type: "written-test", label: "Written test" }],
    // The ONLY sourced structural facts in this registry. See the provenance header.
    verifiedFacts: { questionCount: 50, timeMinutes: 60 },
    associationVariation: true,
    revalidationRequired: true,
    routeTarget: "/training/hosa/event/medical-terminology"
  },
  // --- identity-only records: name + family are sourced, structure is not ------------------------
  { id: "job-seeking-skills", name: "Job Seeking Skills", family: "interview", sourceStatus: "partial", associationVariation: true },
  { id: "interviewing-skills", name: "Interviewing Skills", family: "interview", sourceStatus: "partial", associationVariation: true },
  { id: "prepared-speaking", name: "Prepared Speaking", family: "presentation", sourceStatus: "partial", associationVariation: true },
  { id: "research-poster", name: "Research Poster", family: "presentation", sourceStatus: "partial", associationVariation: true },
  { id: "clinical-specialty", name: "Clinical Specialty", family: "presentation", sourceStatus: "partial", associationVariation: true },
  { id: "biomedical-debate", name: "Biomedical Debate", family: "team", sourceStatus: "partial", associationVariation: true },
  { id: "hosa-bowl", name: "HOSA Bowl", family: "team", sourceStatus: "partial", associationVariation: true }
];

// ---- lookup + validation ----------------------------------------------------------------------

// ---- shared source/freshness metadata (M9) ------------------------------------------------------

/**
 * Projects a record into the shared source model. It ADDS NOTHING: every value below already exists
 * on the record or in this module's constants. A record that is not displayable as verified yields
 * `partial`, so it can never acquire official framing by passing through here.
 */
export function hosaSourceMetadata(record: HosaEventRecord): SourceFreshnessMetadata {
  const verified = isDisplayableAsVerified(record);
  return {
    authority: verified ? "official" : "partial",
    // A partial record makes no currency claim at all — see lib/source-freshness.ts.
    freshness: verified ? (record.sourceStatus === "verified-stable" ? "stable" : "current") : undefined,
    organization: "HOSA",
    sourceLabel: verified ? record.sourceLabel : undefined,
    season: verified ? record.season : undefined,
    lastVerified: verified ? record.lastVerified : undefined,
    revalidation: record.revalidationRequired
      ? {
          required: true,
          // One dated expectation, never a standing annual rule.
          triggerLabel: "the expected September 1, 2026 release",
          note: HOSA_REVALIDATION_NOTE
        }
      : undefined,
    associationVariation: record.associationVariation === true
  };
}

/** Learner-facing status wording. A machine status code is never shown as the primary label. */
export function hosaStatusLabel(status: HosaSourceStatus): string {
  switch (status) {
    case "verified-current":
      return "Verified against the current official guidelines";
    case "verified-stable":
      return "Verified against a stable official source";
    case "awaiting-season-revalidation":
      return "Awaiting revalidation against the next release";
    case "partial":
    default:
      return "Structure not yet verified";
  }
}

/** True only for statuses that permit official structural detail to be displayed as verified. */
function isVerifiedStatus(status: HosaSourceStatus): boolean {
  return status === "verified-current" || status === "verified-stable";
}

function hasAnyFact(facts: HosaVerifiedFacts | undefined): boolean {
  if (!facts) return false;
  return Object.values(facts).some((v) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0));
}

/**
 * A record may be shown as VERIFIED only when it carries the provenance that makes the claim
 * checkable: a season, a last-verified date, a source label, and at least one actual fact.
 *
 * A record that claims verified status without them is malformed. It degrades to a partial card —
 * it is never rendered as verified, and it is never dropped silently.
 */
export function isDisplayableAsVerified(record: HosaEventRecord): boolean {
  if (!isVerifiedStatus(record.sourceStatus)) return false;
  if (!record.season?.trim() || !record.lastVerified?.trim() || !record.sourceLabel?.trim()) return false;
  return hasAnyFact(record.verifiedFacts);
}

export type HosaEventPresentation = {
  record: HosaEventRecord;
  /** Whether official structural detail may be shown for this event. */
  verified: boolean;
  /** The facts safe to display — empty unless `verified`. */
  facts: HosaVerifiedFacts;
  /** True when the record claimed verification it cannot support. */
  degraded: boolean;
};

/**
 * The one place a record becomes displayable. Components call this and render its output; they
 * never read `verifiedFacts` directly, so a malformed record cannot leak a fact through a
 * component that forgot to check.
 */
export function presentHosaEvent(record: HosaEventRecord): HosaEventPresentation {
  const verified = isDisplayableAsVerified(record);
  return {
    record,
    verified,
    facts: verified ? (record.verifiedFacts ?? {}) : {},
    degraded: isVerifiedStatus(record.sourceStatus) && !verified
  };
}

/**
 * Fail-closed lookup. An unknown, empty, or malformed identifier returns undefined — never the
 * first entry, never a fuzzy match, never Medical Terminology.
 */
export function hosaEventById(id: string | null | undefined): HosaEventRecord | undefined {
  if (typeof id !== "string") return undefined;
  const trimmed = id.trim().toLowerCase();
  if (!trimmed) return undefined;
  return HOSA_EVENTS.find((e) => e.id === trimmed);
}

/** Case-insensitive name/family search. An empty query returns the whole list, not an empty one. */
export function findHosaEvents(query: string | null | undefined): HosaEventRecord[] {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return HOSA_EVENTS;
  return HOSA_EVENTS.filter((e) => {
    const family = hosaFamily(e.family);
    return e.name.toLowerCase().includes(q) || (family?.label.toLowerCase().includes(q) ?? false);
  });
}

/** Events grouped by CompeteReady training family, in the declared family order. */
export function hosaEventsByFamily(events: HosaEventRecord[] = HOSA_EVENTS): Array<{ family: HosaFamilyInfo; events: HosaEventRecord[] }> {
  return HOSA_FAMILIES.map((family) => ({ family, events: events.filter((e) => e.family === family.id) })).filter(
    (group) => group.events.length > 0
  );
}
