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
// PROVENANCE — every value below traces to either the official guideline itself or an approved local
// curriculum record, and each is named. Nothing is written from memory, and nothing is inferred from
// a different event.
//
//   MEDICAL TERMINOLOGY IS NOW SOURCED FROM THE PRIMARY DOCUMENT (H4-B, verified 2026-09-10).
//     Every Medical Terminology fact below was read directly from
//     "Medical Terminology ILC Guidelines (September 2026)", the 2026-27 guideline published at
//     https://hosa.org/wp-content/uploads/2026/08/MT-26-27.pdf — not from a curriculum note about it.
//     50 questions / 60 minutes (unchanged this season); tiebreakers reduced to ten, administered as
//     two sets of five; the written test plan below; no verbal time-remaining announcements.
//     The earlier record cited local curriculum notes for 2025-26 (50q/60min, verified 2026-07-05)
//     and waited on a September 1, 2026 release. That release arrived and has now been read.
//   Season 2026-27 is the current final official set
//     the same guideline; hosa.org/guidelines states the 2026-27 guidelines are posted.
//   THIS APPLIES TO MEDICAL TERMINOLOGY ONLY. No other HOSA event has been re-verified against a
//     2026-27 document, and none may be presented as though it had — see the partial records below.
//   Association dependence applies to every HOSA event
//     docs/curriculum/03-hosa-course.md:222-228 (§6, HR-2)
//   Event names + their CompeteReady branch
//     docs/curriculum/03-hosa-course.md:69-79 (§3 branching), :162 (Branch C), :173 (Branch D),
//     :181 (Branch E); docs/curriculum/11-benchmark-hosa-event-navigator.md:221-229 (footer table)
//
// NOT sourced, therefore NOT present anywhere below: official HOSA category names, room layout,
// who portrays a patient, team sizes, round counts, timings or question counts for any event other
// than Medical Terminology, equipment lists, advancement rules, entry limits, results timing, and
// whether competitors receive rating sheets. Absent means absent — never defaulted, never borrowed
// from a sibling event.
//   TIEBREAKERS moved OFF this list for Medical Terminology only (H4-B): the September 2026 guideline
//   states them, so they are recorded for that event. No other event's tiebreakers are sourced, and
//   Medical Terminology's may not be lent to one.
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
export const HOSA_CURRENT_SEASON = "2026-27";

// ---- the official written test plan (Medical Terminology only) ---------------------------------
//
// TWO DIFFERENT LISTS LIVE IN THE SAME GUIDELINE, AND THEY ARE NOT THE SAME THING.
//
//   • The EVENT SUMMARY names the subjects the event covers — prefixes, suffixes, word roots,
//     anatomy, physiology, pathophysiology, and occupations related to the health field. That is the
//     sentence lib/hosa-medterm.ts cites for its six practice areas, and it is accurately cited.
//   • The WRITTEN TEST PLAN below is a different axis: twelve weighted rows saying how much of the
//     50-item test each area is worth. Its second half is organised BY BODY SYSTEM, which the six
//     practice areas are not.
//
// A subject list is not a blueprint. Only the rows below may be described as the test plan, and the
// six practice tags may never be relabelled as it — they are CompeteReady's own grouping.
//
// This is recorded as data rather than prose so a later phase can map bank items and lessons to a row
// id. Recording it makes no claim that our practice matches these weights; it does not yet.

export type HosaTestPlanRow = {
  /** Stable id for mapping evidence to this row later. Ours, not HOSA's. */
  id: string;
  /** The row exactly as the guideline lists it. */
  label: string;
  /** Percentage of the written test, as published. */
  weight: number;
};

/**
 * The 2026-27 Medical Terminology written test plan, transcribed from the official guideline.
 * Twelve rows totalling 100.
 */
export const HOSA_MEDTERM_TEST_PLAN: readonly HosaTestPlanRow[] = [
  { id: "word-parts", label: "Roots, Prefixes, Suffixes, and Combining Forms", weight: 45 },
  { id: "overview-of-body", label: "Overview of Body", weight: 5 },
  { id: "skeletal", label: "Skeletal", weight: 5 },
  { id: "muscular", label: "Muscular", weight: 5 },
  { id: "respiratory", label: "Respiratory", weight: 5 },
  { id: "digestive", label: "Digestive", weight: 5 },
  { id: "cardiovascular-lymphatic", label: "Cardiovascular & Lymphatic", weight: 5 },
  { id: "nervous-special-senses", label: "Nervous/Special Senses", weight: 5 },
  { id: "endocrine", label: "Endocrine", weight: 5 },
  { id: "reproductive", label: "Reproductive", weight: 5 },
  { id: "integumentary", label: "Integumentary", weight: 5 },
  { id: "urinary", label: "Urinary", weight: 5 }
];

/** The subjects the event summary names. NOT the test plan — see the note above. */
export const HOSA_MEDTERM_EVENT_SUBJECTS: readonly string[] = [
  "prefixes",
  "suffixes",
  "word roots",
  "anatomy",
  "physiology",
  "pathophysiology",
  "occupations related to the health field"
];

/**
 * The tiebreaker, as the 2026-27 guideline states it. The repository previously recorded only the
 * resolution procedure ("successive sets of five until resolved"), which was true but silent on how
 * many exist: the 2026-27 release reduced them to ten, administered as two sets of five with the
 * test. Both facts are kept because both are stated.
 */
export const HOSA_MEDTERM_TIEBREAKER = {
  totalQuestions: 10,
  sets: 2,
  questionsPerSet: 5,
  format: "fill-in-the-blank",
  spellingRequired: true,
  resolution: "Successive sets of five tiebreaker questions are judged until a winner is determined."
} as const;

/**
 * Test-day format fact, recorded as source truth. Not yet surfaced to learners everywhere — a later
 * competition-prep phase decides where it belongs.
 */
export const HOSA_MEDTERM_TIME_ANNOUNCEMENTS =
  "No verbal time-remaining announcements are given; competitors monitor their own time.";

/**
 * The revalidation gate, re-expressed after the 2026-27 release (H4-B).
 *
 * The previous wording named one dated expectation — September 1, 2026 — because that was the release
 * we were waiting for. It arrived: the Medical Terminology guideline dated September 2026 has been
 * read against this record. Continuing to name that date would schedule a re-check in the past, so the
 * gate now names the NEXT release instead. It is deliberately undated: HOSA publishes annually, but
 * nothing in the source establishes the 2027-28 date, and inventing one would be the same fabrication
 * the original wording was careful to avoid.
 */
export const HOSA_REVALIDATION_NOTE =
  "HOSA publishes annual competitive-event guidelines. The 2026-27 guidelines are the set in force here — after HOSA publishes the 2027-28 guidelines, every officially dependent detail must be re-checked against them and against any later update notices.";

/**
 * No structured due date, deliberately (H4-B).
 *
 * H2 added this so the freshness model could notice a stated date had passed, and it did its job. The
 * next trigger has no published date, and `revalidationIsDue` treats an absent one as "no warning" —
 * which is correct here: a warning must come from a real date, not from a guess about when HOSA will
 * publish next. The machinery is untouched and starts working again the moment a dated expectation is
 * recorded. Until then the record carries its verification date, and that is the honest signal.
 */
export const HOSA_REVALIDATION_DUE_ON: string | undefined = undefined;

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
    branchLabel: "Branch A — knowledge and test-plan study"
    // M11R5: no `branchHref`. This family's destination is DERIVED from registry membership by
    // `resolveHosaFamilyDestination`. It used to hardcode Medical Terminology's slug, which is
    // correct only while that is the family's sole listed event — the moment a second knowledge-test
    // event is listed, every one of those competitors would have landed on another event's page.
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

/**
 * Where a family's "where to train" link should go.
 *
 * `event` names the single listed event it resolves to; `events-hub` is the fail-closed landing when
 * the registry cannot identify one; `branch` is a family whose destination is a fixed CompeteReady
 * surface rather than an event (clinical-skill communication).
 */
export type HosaFamilyDestination =
  | { kind: "event"; href: string; eventName: string }
  | { kind: "branch"; href: string }
  | { kind: "none"; reason: "no-listed-events" | "multiple-listed-events" };

/**
 * An event is a candidate destination only if it carries its own route. A record without one is
 * either not yet built out or malformed, and either way it must never become a link target.
 */
function listedEventsForFamily(family: HosaTrainingFamily, events: HosaEventRecord[]): HosaEventRecord[] {
  return events.filter((e) => e.family === family && typeof e.routeTarget === "string" && e.routeTarget.trim().length > 0);
}

/**
 * Resolves a family's destination from ACTUAL registry membership (M11R5).
 *
 * Pure, order-independent and non-mutating. The multi-member case deliberately does NOT pick a
 * winner: with two listed events there is no honest basis for choosing one. Reversing the registry
 * order cannot change that.
 *
 * M11R5A: the unresolved variant carries NO href. It previously pointed at the events hub, which is
 * the very page the family list renders on — a self-link dressed up as recovery. Having no href at
 * all makes that structurally impossible instead of merely unrendered; the caller must supply its
 * own honest recovery for the surface it is on.
 */
export function resolveHosaFamilyDestination(
  familyId: HosaTrainingFamily,
  events: HosaEventRecord[] = HOSA_EVENTS
): HosaFamilyDestination {
  const info = hosaFamily(familyId);
  // A family pointing at a fixed CompeteReady surface (the communication lesson) is not event-derived.
  if (info?.branchHref) return { kind: "branch", href: info.branchHref };
  const listed = listedEventsForFamily(familyId, events);
  if (listed.length === 1) {
    const only = listed[0];
    return { kind: "event", href: only.routeTarget as string, eventName: only.name };
  }
  return { kind: "none", reason: listed.length === 0 ? "no-listed-events" : "multiple-listed-events" };
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
    // Re-verified against the 2026-27 guideline dated September 2026 (H4-B).
    lastVerified: "2026-09-10",
    sourceLabel: "HOSA 2026-27 Medical Terminology ILC Guidelines (September 2026)",
    components: [{ type: "written-test", label: "Written test" }],
    // The ONLY sourced structural facts in this registry. See the provenance header.
    // Unchanged by the 2026-27 release: still 50 items in a maximum of 60 minutes. `testPlanAvailable`
    // now says what HOSA_MEDTERM_TEST_PLAN records — the published weighting exists for this event.
    verifiedFacts: { questionCount: 50, timeMinutes: 60, testPlanAvailable: true },
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
          // The NEXT release, undated (H4-B). The September 1, 2026 expectation this used to name has
          // been met and read; naming it now would schedule a re-check in the past. HOSA publishes
          // annually, but the 2027-28 date is not published, so the trigger stays undated rather than
          // guessed — and `dueOn` is absent for the same reason.
          triggerLabel: "the 2027-28 guidelines release",
          dueOn: HOSA_REVALIDATION_DUE_ON,
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
