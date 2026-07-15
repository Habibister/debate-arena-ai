// Single source of truth for training tracks. Tracks are a thin, typed layer over the existing
// Organization content tagging — no schema, no duplicated content. Persisted client-side only.
import type { Organization } from "@prisma/client";

export type TrainingTrack = "GENERAL_DEBATE" | "HOSA" | "DECA" | "MODEL_UN";

export type TrackInfo = {
  id: TrainingTrack;
  slug: string;
  label: string;
  short: string;
  description: string;
  organization: Organization;
  formats?: string[];
};

export const TRACKS: TrackInfo[] = [
  {
    id: "GENERAL_DEBATE",
    slug: "debate",
    label: "General Debate",
    short: "Debate",
    description: "Public Forum, Lincoln-Douglas, Policy, and Parliamentary — rebuttal and evidence practice.",
    organization: "DEBATE",
    formats: ["Public Forum", "Lincoln-Douglas", "Policy", "Parliamentary"]
  },
  {
    id: "HOSA",
    slug: "hosa",
    label: "HOSA",
    short: "HOSA",
    description: "Health-science competition prep: terminology, event practice, case studies, and testing.",
    organization: "HOSA"
  },
  {
    id: "DECA",
    slug: "deca",
    label: "DECA",
    short: "DECA",
    description: "Role plays, performance indicators, business scenarios, and cluster-exam practice.",
    organization: "DECA"
  },
  {
    id: "MODEL_UN",
    slug: "model-un",
    label: "Model UN",
    short: "Model UN",
    description: "Committees, country positions, speeches, caucuses, resolutions, and diplomacy.",
    organization: "MODEL_UN"
  }
];

// Soft-removed tracks: hidden from every user-facing selection surface but fully retained in code and
// data (components, /api/ai/mun/* routes, skills, specs, user history). Reversible — revival requires
// picking a real conference and sourcing it. Lookups by id/slug/organization still resolve so existing
// records (history, dashboards, coach views) keep honest labels.
export const RETIRED_TRACKS: TrainingTrack[] = ["MODEL_UN"];
export const ACTIVE_TRACKS: TrackInfo[] = TRACKS.filter((t) => !RETIRED_TRACKS.includes(t.id));
export function isTrackRetired(id: TrainingTrack): boolean {
  return RETIRED_TRACKS.includes(id);
}

export const DEFAULT_TRACK: TrainingTrack = "GENERAL_DEBATE";
export const TRACK_STORAGE_KEY = "debatearena_training_track";
// A non-auth preference cookie (slug value) written alongside localStorage so server components can
// resolve the selected track when the `?track=` query param is absent. Never in the JWT/session.
export const TRACK_COOKIE = "debatearena_track";

// Resolve the active track for a page: an explicit `?track=` on a track-specific route wins (URL
// override), otherwise fall back to the persisted selection (cookie). Returns undefined only when the
// user truly has no selected track, which is the only case where "browse all" is allowed.
export function resolveTrackFromSlugs(querySlug?: string | null, cookieSlug?: string | null): TrackInfo | undefined {
  // A retired track slug never resolves as the active selection: a stale retired URL falls back to the
  // cookie, and a stale retired cookie falls back to browse-all — never a soft-removed track's content.
  const activeOnly = (t: TrackInfo | undefined) => (t && !isTrackRetired(t.id) ? t : undefined);
  return activeOnly(trackBySlug(querySlug ?? undefined)) ?? activeOnly(trackBySlug(cookieSlug ?? undefined));
}

export function trackById(id: TrainingTrack): TrackInfo {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}

export function trackBySlug(slug: string | undefined): TrackInfo | undefined {
  return TRACKS.find((t) => t.slug === slug);
}

export function normalizeTrack(value: unknown): TrainingTrack {
  // Retired tracks (e.g. a stored MODEL_UN selection) fall back to the default instead of resolving,
  // so users whose saved track was soft-removed land on a working track, never a hidden/broken state.
  const match = TRACKS.some((t) => t.id === value) ? (value as TrainingTrack) : DEFAULT_TRACK;
  return isTrackRetired(match) ? DEFAULT_TRACK : match;
}

export function trackToOrganization(id: TrainingTrack): Organization {
  return trackById(id).organization;
}

// Direct-URL isolation: is `contentOrg` (a deck/resource organization) allowed for the active track?
// With no selected track the user is browsing broadly, so everything is allowed; otherwise the
// content must belong to the selected track's organization — knowing a URL never exposes another org.
export function trackAllowsOrganization(track: TrackInfo | null | undefined, contentOrg: string): boolean {
  return !track || track.organization === contentOrg;
}

// Reverse lookup so a team/assignment's existing Organization maps to a track label (no schema needed).
export function trackByOrganization(org: Organization | null | undefined): TrackInfo | undefined {
  return TRACKS.find((t) => t.organization === org);
}

// Maps the existing skill "org" labels to a track (or SHARED). "Public Speaking" foundation skills
// are genuinely universal and shown across every track, labeled "Shared foundation".
const SKILL_ORG_TRACK: Record<string, TrainingTrack | "SHARED"> = {
  Debate: "GENERAL_DEBATE",
  DECA: "DECA",
  HOSA: "HOSA",
  "Public Speaking": "SHARED"
};

export function skillVisibleForTrack(skillOrg: string, track: TrainingTrack): { visible: boolean; shared: boolean } {
  const mapped = SKILL_ORG_TRACK[skillOrg];
  const shared = mapped === "SHARED";
  return { visible: shared || mapped === track, shared };
}

// Honest content-source labels — never claim official/historical origin for unverified content.
export type ContentSourceType = "OFFICIAL_PAST" | "OFFICIAL_SAMPLE" | "ADAPTED_FROM_PAST" | "AI_GENERATED" | "UNVERIFIED_EXISTING_CONTENT";

export const CONTENT_SOURCE_LABEL: Record<ContentSourceType, string> = {
  OFFICIAL_PAST: "Official past prompt",
  OFFICIAL_SAMPLE: "Official sample material",
  ADAPTED_FROM_PAST: "Adapted practice",
  AI_GENERATED: "AI-generated practice",
  UNVERIFIED_EXISTING_CONTENT: "Unverified existing content"
};

// Practice source selector. "Past" only ever surfaces verified public material; we have none yet, so
// it shows an honest empty state rather than silently falling back to AI under an official label.
export type PracticeSource = "PAST" | "AI" | "MIXED";

export const PRACTICE_SOURCES: Array<{ id: PracticeSource; label: string; note: string }> = [
  { id: "PAST", label: "Past Competition", note: "Only verified public past or official sample material." },
  { id: "AI", label: "AI Practice", note: "Original AI-generated practice, clearly labeled." },
  { id: "MIXED", label: "Mixed", note: "Both verified past material and AI practice, each labeled." }
];

// The app ships original / AI-generated practice today (no verified official archives), so existing
// content is classified honestly as AI-generated.
export const DEFAULT_CONTENT_SOURCE: ContentSourceType = "AI_GENERATED";

export const TRACK_DISCLAIMER =
  "CompeteReady is an independent training platform and is not officially affiliated with these organizations.";

// Track-specific setup option lists (used by the dedicated practice setup). Original/AI framings —
// never presented as official past material.
export const HOSA_CATEGORIES = [
  "Medical terminology",
  "Health-science knowledge",
  "Case-study practice",
  "Prepared speaking",
  "Persuasive speaking",
  "Event procedure practice",
  "Timed presentation"
];
export const DECA_CLUSTERS = ["Marketing", "Finance", "Hospitality & Tourism", "Business Management", "Entrepreneurship", "Personal Financial Literacy"];
export const DECA_PARTICIPANT_ROLES = ["Customer", "Manager", "Executive", "Client", "Judge"];
export const MUN_COMMITTEES = ["General Assembly", "Security Council", "ECOSOC", "Human Rights Council", "Historical Committee"];
export const MUN_ACTIVITIES = ["Opening speech", "Moderated caucus", "Negotiation", "Resolution writing", "Amendment practice", "Position-paper practice"];

export type PracticeFields = {
  format?: string;
  category?: string;
  scenario?: string;
  role?: string;
  participantRole?: string;
  cluster?: string;
  performanceIndicators?: string;
  committee?: string;
  country?: string;
  agenda?: string;
  activity?: string;
};

// Composes track-specific setup fields into the values the existing AI/debate pipeline consumes:
// organization (drives the track rubric), eventType (the category/event/committee), a text topic
// (scenario incl. structured context the AI reads), and practiceMode. No schema change.
export function composePractice(
  track: TrainingTrack,
  f: PracticeFields
): { organization: Organization; eventType: string; topic: string; practiceMode: "DEBATE" | "ROLEPLAY"; sourceLabel: string } {
  const organization = trackToOrganization(track);
  const sourceLabel = `AI-generated ${trackById(track).label}-style practice`;
  const scenario = (f.scenario ?? "").trim();

  if (track === "DECA") {
    const cluster = f.cluster ?? DECA_CLUSTERS[0];
    const role = f.role || "sales associate";
    const participant = f.participantRole ?? DECA_PARTICIPANT_ROLES[0];
    const pis = f.performanceIndicators ? ` Performance indicators: ${f.performanceIndicators}.` : "";
    return {
      organization,
      eventType: `DECA ${cluster} Role Play`,
      practiceMode: "ROLEPLAY",
      sourceLabel,
      topic: `${sourceLabel} — ${cluster} role play (you: ${role}; AI: ${participant})${scenario ? `: ${scenario}` : ""}${pis}`
    };
  }

  if (track === "MODEL_UN") {
    const committee = f.committee ?? MUN_COMMITTEES[0];
    const country = f.country || "your assigned delegation";
    const agenda = f.agenda || "the committee agenda";
    const activity = f.activity ?? MUN_ACTIVITIES[0];
    return {
      organization,
      eventType: `Model UN — ${committee}`,
      practiceMode: "DEBATE",
      sourceLabel,
      topic: `${sourceLabel} — ${activity}. Committee: ${committee}. Country: ${country}. Agenda: ${agenda}.${scenario ? ` Focus: ${scenario}.` : ""}`
    };
  }

  if (track === "HOSA") {
    const category = f.category ?? HOSA_CATEGORIES[0];
    return {
      organization,
      eventType: `HOSA — ${category}`,
      practiceMode: "DEBATE",
      sourceLabel,
      topic: `${sourceLabel} — ${category} practice${scenario ? `: ${scenario}` : ""}`
    };
  }

  // General Debate (handled by the debate setup, but kept complete for tests).
  const format = f.format ?? "Public Forum";
  return {
    organization,
    eventType: format,
    practiceMode: "DEBATE",
    sourceLabel,
    topic: scenario || `${format} practice round.`
  };
}
