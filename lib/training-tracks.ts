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

export const DEFAULT_TRACK: TrainingTrack = "GENERAL_DEBATE";
export const TRACK_STORAGE_KEY = "debatearena_training_track";

export function trackById(id: TrainingTrack): TrackInfo {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}

export function trackBySlug(slug: string | undefined): TrackInfo | undefined {
  return TRACKS.find((t) => t.slug === slug);
}

export function normalizeTrack(value: unknown): TrainingTrack {
  return TRACKS.some((t) => t.id === value) ? (value as TrainingTrack) : DEFAULT_TRACK;
}

export function trackToOrganization(id: TrainingTrack): Organization {
  return trackById(id).organization;
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
