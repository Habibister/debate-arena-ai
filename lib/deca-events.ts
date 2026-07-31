// DECA Event Navigator registry (M8B) — family-first and fail-closed.
//
// SINGLE source of truth for every DECA fact the Navigator shows. No component may restate an
// official value as its own constant; it renders what lives here or it renders nothing.
//
// Pure: no React, no browser API, no network, no AI provider, no database, no storage, no mastery
// or progress import. Static data plus lookup helpers.
//
// FAMILY-FIRST, deliberately. The approved local record supports DECA at the level of event
// FAMILIES, not a complete event roster — so this registry models families and never pretends to
// enumerate every DECA event. Individual Series is one family among several and is NEVER the
// default: its 100/10/10 structure, five PIs and scripted questions are Series facts only.
//
// ---------------------------------------------------------------------------------------------
// PROVENANCE — every value below traces to an approved local curriculum record.
//
//   Season / verification date — "Sourced facts (registry, verified 2026-07-05)"
//     docs/curriculum/02-deca-course.md:6
//   Individual Series: 100-question cluster exam + 10-min prep + up-to-10-min meeting; five PIs per
//   role-play; exam contributes to preliminary standing
//     docs/curriculum/02-deca-course.md:6-7, :114-115; 00-principles-and-sources.md:135; 14-final-synthesis.md:29
//   PBA: officially an eligibility-restricted entry event (first-year eligibility rules apply),
//   Business Administration Core PIs, four PIs; "recommended beginner pathway" is OUR inference
//     docs/curriculum/02-deca-course.md:116-119
//   PFL: its own PI structure and scripted-question flow
//     docs/curriculum/02-deca-course.md:120
//   TDM: case-study format, 30-minute team preparation, 15-minute shared presentation, both members
//   must speak, averaged exams, no-interruption rule, clarification questions; weighting NOT taught
//     docs/curriculum/02-deca-course.md:121-125; 14-final-synthesis.md:29, :237
//   Judge-question flow by family (uninterrupted presentation, then questions)
//     docs/curriculum/02-deca-course.md:91-98; 10-benchmark-deca-lesson0-v2.md:73, :78-86;
//     06-videos-deca.md:49-55
//   Preparation materials are event-provided; prep notes usable in the role-play
//     docs/curriculum/02-deca-course.md:67-68; 10-benchmark-deca-lesson0-v2.md:159-161
//   Role-play families prohibit bringing visual aids; only materials created during preparation
//     docs/curriculum/02-deca-course.md:83-85; 10-benchmark-deca-lesson0-v2.md:161
//   Prepared / written / online families are out of this course's scope; their rules differ
//   materially; not all chartered associations offer all events
//     docs/curriculum/02-deca-course.md:17-23
//   Dress by level; no universal blazer rule; nothing universal about devices, cut lines,
//   normalization, advancement or entry limits
//     docs/curriculum/02-deca-course.md:228-232
//   The five-part scaffold is CompeteReady's, not DECA's; D-E-C-A mnemonics are optional glossary
//   context only and never assessed
//     docs/curriculum/02-deca-course.md:176-180 (B-3), :219-232 (D7)
//   PI rule: demonstrate, never recite; PIs are not announced in advance; explicit-vs-woven is an
//   UNRESOLVED judgment call; behavior-type PI evidence is thin
//     docs/curriculum/02-deca-course.md:52-63, :207-213
//
// NOT sourced, therefore ABSENT: any numeric exam weighting for any family (including the rejected
// universal one-third formula), TDM weighting in any form, per-family cut lines, advancement models,
// entry limits, qualification rules, device deductions, question penalties, score thresholds or
// guarantees, timing for PBA / PFL / PSC, exam question counts outside Individual Series, and any
// per-event roster detail. Absent means absent — never defaulted, never borrowed from a sibling.

import type { SourceFreshnessMetadata } from "@/lib/source-freshness";

export type DecaFamilyScope = "role-play" | "prepared" | "written" | "online" | "other";

export type DecaSourceStatus = "verified-current" | "verified-stable" | "partial" | "unresolved";

export type DecaComponentType =
  | "exam"
  | "preparation"
  | "role-play"
  | "presentation"
  | "written-entry"
  | "online-component"
  | "team-component"
  | "other";

export type DecaComponent = { type: DecaComponentType; label: string };

/**
 * Optional verified detail. EVERY field is optional and must stay absent unless an approved local
 * source supports it for THIS family. No defaults, no "typical" values, no borrowing.
 */
export type DecaVerifiedFacts = {
  examQuestionCount?: number;
  preparationMinutes?: number;
  presentationMinutes?: number;
  rolePlayMinutes?: number;
  participantStructure?: string;
  bothMembersMustSpeak?: boolean;
  examCombinationNote?: string;
  judgeQuestionFlow?: string;
  performanceIndicatorNote?: string;
  preparationMaterialsNote?: string;
  visualAidNote?: string;
  /** Qualitative only. A numeric weighting is never stored — see the provenance header. */
  examWeightingNote?: string;
  eligibilityNote?: string;
};

export type DecaFamilyRecord = {
  id: string;
  name: string;
  /** Short form used in the approved record, e.g. "TDM". Absent when the record uses none. */
  abbreviation?: string;
  scope: DecaFamilyScope;
  sourceStatus: DecaSourceStatus;
  season?: string;
  lastVerified?: string;
  sourceLabel?: string;
  components?: DecaComponent[];
  verifiedFacts?: DecaVerifiedFacts;
  associationVariation?: boolean;
  /** Named, learner-facing gaps this family carries. Rendered as text, never silently dropped. */
  unresolvedFields?: string[];
  routeTarget?: string;
};

// ---- registry-owned wording (components never restate these) -----------------------------------

export const DECA_CURRENT_SEASON = "2025-26";
export const DECA_LAST_VERIFIED = "2026-07-05";
export const DECA_SOURCE_LABEL = "DECA competitive event guidelines";

export const DECA_NAVIGATOR_SCOPE_NOTE =
  "This Navigator identifies your event family and routes you — it is not a full DECA event list and it does not replace your event's current official guidelines. CompeteReady's course teaches the role-play and case-study families only.";

/** Association and level variation (doc 02:17-23, :228-232). */
export const DECA_ASSOCIATION_NOTE =
  "Not all chartered associations offer all events. Entry limits, advancement, qualification, and how the event is administered locally can differ — confirm your association's current instructions.";

/** Weighting refusal (doc 02:123-125; 14:237). Applies wherever a figure is missing. */
export const DECA_WEIGHTING_NOTE =
  "We do not show an exam weighting figure. Our approved record does not support a single verified value for it, and we will not guess one — check your family's current official guideline and your association's instructions.";

/** TDM's specific, named conflict (doc 02:123-125). */
export const DECA_TDM_WEIGHTING_NOTE =
  "Team Decision Making weighting is deliberately not shown. DECA's Guide and its published sample conflict, and that conflict is unresolved — no weighting figure may be stated until DECA resolves it.";

/** The PI rule and the genuinely open question (doc 02:52-63, :207-213). */
export const DECA_PI_RULE_NOTE =
  "Performance Indicators are behaviors to demonstrate, not lines to recite, and they are not announced in advance. Whether to say a PI's title aloud or weave it into the conversation is a genuine judgment call with tradeoffs both ways — the official rule says demonstrate and is silent on style, so we do not tell you to do either.";

/** CompeteReady's scaffold, always attributed to us (doc 02:219-232, D7). */
export const DECA_SCAFFOLD_NOTE =
  "CompeteReady's five-part recommendation scaffold — problem, recommendation, business reason, implementation, measurement — is our teaching scaffold, not official DECA terminology. It is designed to map onto the official evaluation-form categories.";

/** Dress, by level only (doc 02:228-232). Kept secondary to family selection. */
export const DECA_DRESS_NOTE =
  "Dress is decided by level, never universally: the blazer requirement is documented at ICDC, business attire applies for briefing and testing under the current Guide, and chartered associations may enforce differently. There is no universal blazer rule.";

/** What the approved record says about the out-of-scope families, collectively (doc 02:17-23). */
export const DECA_OUT_OF_SCOPE_NOTE =
  "This event family is outside CompeteReady's current role-play course. Its rules differ materially from the role-play families — statements of assurance, penalty points, page and slide limits, different weighting, and visual aids that are permitted where role-play families prohibit them. Prepared, written, and online events need their own family-specific instruction, which we have not built.";

/**
 * The families the approved record names collectively for prepared/written/online. It does NOT
 * assign each one to a specific scope, so neither do we.
 */
export const DECA_OUT_OF_SCOPE_EXAMPLES =
  "Our record names these collectively, without saying which is prepared, which is written, and which is online: business operations research, project management, integrated marketing, entrepreneurship, professional selling, and stock-market and virtual-business challenges.";

// ---- scope presentation -------------------------------------------------------------------------

export type DecaScopeInfo = { id: DecaFamilyScope; label: string; summary: string };

export const DECA_SCOPES: DecaScopeInfo[] = [
  {
    id: "role-play",
    label: "Role-play and case-study families",
    summary: "You receive a scenario, prepare, and meet a judge in character. This is what CompeteReady's DECA course teaches."
  },
  {
    id: "prepared",
    label: "Prepared events",
    summary: "Built in advance and presented. Outside our current course."
  },
  {
    id: "written",
    label: "Written events",
    summary: "Judged substantially on a written entry. Outside our current course."
  },
  {
    id: "online",
    label: "Online events",
    summary: "Run through an online platform or simulation. Outside our current course."
  },
  {
    id: "other",
    label: "Families our record does not place cleanly",
    summary: "Our approved record describes these inconsistently, so we route you to your own guideline rather than guess."
  }
];

export function decaScope(id: DecaFamilyScope): DecaScopeInfo | undefined {
  return DECA_SCOPES.find((s) => s.id === id);
}

// ---- the registry ---------------------------------------------------------------------------------

const SOURCED = { season: DECA_CURRENT_SEASON, lastVerified: DECA_LAST_VERIFIED, sourceLabel: DECA_SOURCE_LABEL };
const ROLE_PLAY_LESSON = "/lessons/how-deca-roleplay-works";
const DECA_HUB = "/training/deca";

export const DECA_FAMILIES: DecaFamilyRecord[] = [
  {
    id: "individual-series",
    name: "Individual Series",
    scope: "role-play",
    sourceStatus: "verified-current",
    ...SOURCED,
    components: [
      { type: "exam", label: "Cluster exam" },
      { type: "preparation", label: "Preparation period" },
      { type: "role-play", label: "Role-play meeting with the judge" }
    ],
    verifiedFacts: {
      examQuestionCount: 100,
      preparationMinutes: 10,
      rolePlayMinutes: 10,
      performanceIndicatorNote: "Five Performance Indicators per role-play.",
      judgeQuestionFlow:
        "You present uninterrupted. Afterwards the judge asks scripted standard questions — the same ones every competitor in your event gets — followed by any clarifications.",
      // Qualitative only: the approved record states the exam's role, never a percentage.
      examWeightingNote: "The exam contributes to preliminary standing.",
      preparationMaterialsNote:
        "Materials are provided at the event, and the notes you make during preparation are yours to use during the meeting.",
      visualAidNote: "Role-play families do not let you bring visual aids in — only what you create during preparation."
    },
    associationVariation: true,
    unresolvedFields: ["Exam weighting as a figure"],
    routeTarget: ROLE_PLAY_LESSON
  },
  {
    id: "principles-of-business-administration",
    name: "Principles of Business Administration",
    abbreviation: "PBA",
    scope: "role-play",
    sourceStatus: "verified-current",
    ...SOURCED,
    components: [
      { type: "preparation", label: "Preparation period" },
      { type: "role-play", label: "Role-play meeting with the judge" }
    ],
    verifiedFacts: {
      // Deliberately NO timing and NO exam question count: Individual Series' figures are Series
      // facts and our record does not extend them to this family.
      performanceIndicatorNote: "Business Administration Core Performance Indicators — four per role-play.",
      eligibilityNote:
        "Officially an eligibility-restricted entry event; first-year eligibility rules apply. Calling it a recommended beginner pathway is CompeteReady's inference, not an official recommendation.",
      judgeQuestionFlow:
        "You present uninterrupted. Afterwards the judge asks scripted standard questions — the same ones every competitor in your event gets — followed by any clarifications."
    },
    associationVariation: true,
    unresolvedFields: ["Preparation and role-play timing", "Exam structure and weighting"],
    routeTarget: ROLE_PLAY_LESSON
  },
  {
    id: "personal-financial-literacy",
    name: "Personal Financial Literacy",
    abbreviation: "PFL",
    scope: "role-play",
    sourceStatus: "partial",
    ...SOURCED,
    components: [{ type: "role-play", label: "Role-play meeting with the judge" }],
    verifiedFacts: {
      performanceIndicatorNote: "This family has its own Performance Indicator structure.",
      judgeQuestionFlow:
        "You present uninterrupted. Afterwards the judge asks scripted standard questions — the same ones every competitor in your event gets — followed by any clarifications."
    },
    associationVariation: true,
    unresolvedFields: ["Preparation and role-play timing", "Exam structure and weighting", "Performance Indicator count"],
    routeTarget: ROLE_PLAY_LESSON
  },
  {
    id: "team-decision-making",
    name: "Team Decision Making",
    abbreviation: "TDM",
    scope: "role-play",
    sourceStatus: "verified-current",
    ...SOURCED,
    components: [
      { type: "exam", label: "Cluster exam (per team member)" },
      { type: "preparation", label: "Team preparation period" },
      { type: "team-component", label: "Shared presentation to the judge" }
    ],
    verifiedFacts: {
      preparationMinutes: 30,
      presentationMinutes: 15,
      participantStructure: "Two members, working as a team on a case study.",
      bothMembersMustSpeak: true,
      examCombinationNote: "Team members' exams are averaged.",
      judgeQuestionFlow:
        "You present uninterrupted. Afterwards there is conditional questioning, plus clarifications."
    },
    associationVariation: true,
    // Named, not hidden: the weighting conflict is surfaced as learner-facing text.
    unresolvedFields: ["Exam weighting — DECA's Guide and its published sample conflict"],
    routeTarget: ROLE_PLAY_LESSON
  },
  {
    id: "professional-selling-and-consulting",
    name: "Professional Selling and Consulting",
    abbreviation: "PSC",
    // Our approved record is genuinely inconsistent here: it documents PSC's role-play judge-question
    // flow, and it also lists professional selling among the prepared/written/online families that
    // are out of the course's scope. We do not resolve that on DECA's behalf, so this family carries
    // only the fact that IS unambiguous and routes to the hub rather than into the role-play course.
    scope: "other",
    sourceStatus: "unresolved",
    ...SOURCED,
    verifiedFacts: {
      judgeQuestionFlow:
        "There are no scripted standard questions. The judge may ask appropriate questions if time remains — so do not assume a question round will happen."
    },
    associationVariation: true,
    unresolvedFields: [
      "Whether this family sits inside CompeteReady's role-play course — our record places it both ways",
      "Timing, exam structure, Performance Indicator count and weighting"
    ],
    routeTarget: DECA_HUB
  },
  // --- out-of-scope scopes. Named as families, never as an invented event roster. -------------------
  {
    id: "prepared-events",
    name: "Prepared events",
    scope: "prepared",
    sourceStatus: "partial",
    associationVariation: true,
    unresolvedFields: ["Everything event-specific — we have built no prepared-event instruction"],
    routeTarget: DECA_HUB
  },
  {
    id: "written-events",
    name: "Written events",
    scope: "written",
    sourceStatus: "partial",
    associationVariation: true,
    unresolvedFields: ["Everything event-specific — we have built no written-event instruction"],
    routeTarget: DECA_HUB
  },
  {
    id: "online-events",
    name: "Online events",
    scope: "online",
    sourceStatus: "partial",
    associationVariation: true,
    unresolvedFields: ["Everything event-specific — we have built no online-event instruction"],
    routeTarget: DECA_HUB
  }
];

// ---- lookup + validation ----------------------------------------------------------------------------

// ---- shared source/freshness metadata (M9) --------------------------------------------------------

/**
 * Projects a family into the shared source model. It ADDS NOTHING — no publication calendar, no
 * season rollover, no weighting update date. A family that is not displayable as verified yields
 * `partial`, so an unresolved family (TDM's weighting, PSC's scope) can never acquire official
 * framing by passing through here.
 */
export function decaSourceMetadata(record: DecaFamilyRecord): SourceFreshnessMetadata {
  const verified = isDisplayableAsVerified(record);
  return {
    authority: verified ? "official" : "partial",
    freshness: verified ? (record.sourceStatus === "verified-stable" ? "stable" : "current") : undefined,
    organization: "DECA",
    sourceLabel: verified ? record.sourceLabel : undefined,
    season: verified ? record.season : undefined,
    lastVerified: verified ? record.lastVerified : undefined,
    // DECA has no approved release date in our record, so no revalidation trigger is ever supplied.
    associationVariation: record.associationVariation === true,
    // Dress and conference requirements are level-specific (doc 02:228-232).
    competitionLevelVariation: true
  };
}

/** Learner-facing status wording. A machine status code is never shown as the primary label. */
export function decaStatusLabel(status: DecaSourceStatus): string {
  switch (status) {
    case "verified-current":
      return "Verified against the current official guidelines";
    case "verified-stable":
      return "Verified against a stable official source";
    case "unresolved":
      return "Our record is unresolved for this family";
    case "partial":
    default:
      return "Structure not yet verified";
  }
}

function isVerifiedStatus(status: DecaSourceStatus): boolean {
  return status === "verified-current" || status === "verified-stable";
}

function hasAnyFact(facts: DecaVerifiedFacts | undefined): boolean {
  if (!facts) return false;
  return Object.values(facts).some((v) => v !== undefined && v !== null && v !== "");
}

/**
 * A record may show official structure only when it carries the provenance that makes the claim
 * checkable: season, last-verified date, source label, and at least one real fact.
 *
 * A record that claims verified status without them is malformed. It degrades — never rendered as
 * verified, never silently dropped.
 */
export function isDisplayableAsVerified(record: DecaFamilyRecord): boolean {
  if (!isVerifiedStatus(record.sourceStatus)) return false;
  if (!record.season?.trim() || !record.lastVerified?.trim() || !record.sourceLabel?.trim()) return false;
  return hasAnyFact(record.verifiedFacts);
}

export type DecaFamilyPresentation = {
  record: DecaFamilyRecord;
  /** Whether official structural detail may be shown as verified for this family. */
  verified: boolean;
  /** Facts safe to display. A non-verified family may still show facts it genuinely sourced. */
  facts: DecaVerifiedFacts;
  /** True when the record claimed verification it cannot support. */
  degraded: boolean;
  /** True when this family is outside the role-play course and must not route into the lesson. */
  outOfScope: boolean;
};

/**
 * The one place a record becomes displayable. Components render this output and never read
 * `verifiedFacts` directly, so a component that forgets a check cannot leak a fact.
 *
 * A `partial`/`unresolved` family may still carry a genuinely sourced fact (PSC's question flow,
 * PFL's question flow). Those are shown, with the status saying plainly that the family's overall
 * structure is not verified — that is honest, and it is not the same as claiming verification.
 * A DEGRADED record shows nothing: its provenance is broken, so none of its facts can be trusted.
 */
export function presentDecaFamily(record: DecaFamilyRecord): DecaFamilyPresentation {
  const verified = isDisplayableAsVerified(record);
  const degraded = isVerifiedStatus(record.sourceStatus) && !verified;
  return {
    record,
    verified,
    facts: degraded ? {} : (record.verifiedFacts ?? {}),
    degraded,
    outOfScope: record.scope !== "role-play"
  };
}

/**
 * Fail-closed lookup. An unknown, empty, or malformed identifier returns undefined — never the
 * first entry, never a fuzzy match, never Individual Series.
 */
export function decaFamilyById(id: string | null | undefined): DecaFamilyRecord | undefined {
  if (typeof id !== "string") return undefined;
  const trimmed = id.trim().toLowerCase();
  if (!trimmed) return undefined;
  return DECA_FAMILIES.find((f) => f.id === trimmed);
}

/** Case-insensitive name/abbreviation/scope search. An empty query returns the whole list. */
export function findDecaFamilies(query: string | null | undefined): DecaFamilyRecord[] {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return DECA_FAMILIES;
  return DECA_FAMILIES.filter((f) => {
    const scope = decaScope(f.scope);
    return (
      f.name.toLowerCase().includes(q) ||
      (f.abbreviation?.toLowerCase().includes(q) ?? false) ||
      (scope?.label.toLowerCase().includes(q) ?? false)
    );
  });
}

/** Families grouped by scope, in the declared scope order. */
export function decaFamiliesByScope(families: DecaFamilyRecord[] = DECA_FAMILIES): Array<{ scope: DecaScopeInfo; families: DecaFamilyRecord[] }> {
  return DECA_SCOPES.map((scope) => ({ scope, families: families.filter((f) => f.scope === scope.id) })).filter(
    (group) => group.families.length > 0
  );
}
