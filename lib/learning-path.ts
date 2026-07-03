// Pure, framework-free logic for the personalized diagnostic + learning path. No DB, no XP —
// the profile lives in localStorage (client). Reuses the existing TrainingTrack source of truth.
import { DEFAULT_TRACK, normalizeTrack, type TrainingTrack } from "@/lib/training-tracks";

export type ExperienceLevel = "NEW" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type SessionLength = "short" | "medium" | "long";
export type LearningMethod = "reading" | "listening" | "games" | "full-practice" | "guided-examples";
export type ConfidenceKey = "speaking" | "organizing" | "evidence" | "responding";
export type Confidence = 1 | 2 | 3 | 4 | 5;

export type LearningProfile = {
  track: TrainingTrack;
  experience: ExperienceLevel;
  formatOrEvent: string;
  goal: string;
  sessionLength: SessionLength;
  methods: LearningMethod[];
  confidence: Record<ConfidenceKey, Confidence>;
  timer: "off" | "on";
  completedAt: string | null;
};

export const LEARNING_PROFILE_KEY = "debatearena_learning_profile";

export const EXPERIENCE_OPTIONS: Array<{ id: ExperienceLevel; label: string }> = [
  { id: "NEW", label: "Completely new" },
  { id: "BEGINNER", label: "Beginner" },
  { id: "INTERMEDIATE", label: "Intermediate" },
  { id: "ADVANCED", label: "Advanced" }
];

export const CONFIDENCE_QUESTIONS: Array<{ key: ConfidenceKey; label: string }> = [
  { key: "speaking", label: "Speaking out loud" },
  { key: "organizing", label: "Organizing arguments" },
  { key: "evidence", label: "Using evidence" },
  { key: "responding", label: "Answering opponents" }
];

export const LEARNING_METHOD_OPTIONS: Array<{ id: LearningMethod; label: string }> = [
  { id: "reading", label: "Reading" },
  { id: "listening", label: "Listening" },
  { id: "games", label: "Games / repetition" },
  { id: "full-practice", label: "Full practice" },
  { id: "guided-examples", label: "Guided examples" }
];

export const DEFAULT_PROFILE: LearningProfile = {
  track: DEFAULT_TRACK,
  experience: "NEW",
  formatOrEvent: "",
  goal: "",
  sessionLength: "short",
  methods: [],
  confidence: { speaking: 3, organizing: 3, evidence: 3, responding: 3 },
  timer: "off",
  completedAt: null
};

const EXPERIENCES: ExperienceLevel[] = ["NEW", "BEGINNER", "INTERMEDIATE", "ADVANCED"];
const LENGTHS: SessionLength[] = ["short", "medium", "long"];

function clampConfidence(v: unknown): Confidence {
  const n = Number(v);
  return (n >= 1 && n <= 5 ? Math.round(n) : 3) as Confidence;
}

export function normalizeLearningProfile(raw: unknown): LearningProfile {
  const i = (raw ?? {}) as Partial<LearningProfile>;
  const c = (i.confidence ?? {}) as Partial<Record<ConfidenceKey, unknown>>;
  const validMethods = LEARNING_METHOD_OPTIONS.map((m) => m.id);
  return {
    track: normalizeTrack(i.track),
    experience: EXPERIENCES.includes(i.experience as ExperienceLevel) ? (i.experience as ExperienceLevel) : "NEW",
    formatOrEvent: typeof i.formatOrEvent === "string" ? i.formatOrEvent.slice(0, 80) : "",
    goal: typeof i.goal === "string" ? i.goal.slice(0, 160) : "",
    sessionLength: LENGTHS.includes(i.sessionLength as SessionLength) ? (i.sessionLength as SessionLength) : "short",
    methods: Array.isArray(i.methods) ? i.methods.filter((m): m is LearningMethod => validMethods.includes(m as LearningMethod)) : [],
    confidence: {
      speaking: clampConfidence(c.speaking),
      organizing: clampConfidence(c.organizing),
      evidence: clampConfidence(c.evidence),
      responding: clampConfidence(c.responding)
    },
    timer: i.timer === "on" ? "on" : "off",
    completedAt: typeof i.completedAt === "string" ? i.completedAt : null
  };
}

// Lowest-confidence area becomes the recommended starting skill (ties resolved by question order).
const CONFIDENCE_SKILL: Record<ConfidenceKey, string> = {
  speaking: "Clarity & delivery",
  organizing: "Argument structure",
  evidence: "Evidence & impact",
  responding: "Rebuttal & response"
};

export function scoreDiagnostic(profile: LearningProfile): { startingSkill: string; weakConfidence: ConfidenceKey[] } {
  const keys: ConfidenceKey[] = ["speaking", "organizing", "evidence", "responding"];
  const min = Math.min(...keys.map((k) => profile.confidence[k]));
  const weakConfidence = keys.filter((k) => profile.confidence[k] === min);
  const lowest = keys.find((k) => profile.confidence[k] === min) ?? "organizing";
  return { startingSkill: CONFIDENCE_SKILL[lowest], weakConfidence };
}

// Deterministic, track-specific week templates (no invented activity or scores).
const PATH_TEMPLATES: Record<TrainingTrack, string[]> = {
  GENERAL_DEBATE: ["Argument structure (claim, warrant, impact)", "Rebuttal & response", "Evidence & impact comparison", "Weighing", "Full practice round"],
  HOSA: ["Terminology", "Selected-event knowledge", "Case or speech practice", "Rubric practice", "Event simulation"],
  DECA: ["Performance indicators", "Instructional area", "Role-play organization", "Speaking practice", "Full role play"],
  MODEL_UN: ["Country research", "Opening speech", "Caucus procedure", "Negotiation", "Resolution writing"]
};

export function buildLearningPath(track: TrainingTrack): Array<{ week: number; focus: string }> {
  return PATH_TEMPLATES[track].map((focus, index) => ({ week: index + 1, focus }));
}

// Experience decides where the "current" week pointer starts (never past the last week).
export function currentPathWeek(profile: LearningProfile): number {
  const start: Record<ExperienceLevel, number> = { NEW: 1, BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3 };
  const path = buildLearningPath(profile.track);
  return Math.min(start[profile.experience], path.length);
}

// Prioritized next recommendation from real signals; never invents progress.
export function nextRecommendation(input: { hasActivity: boolean; weakAreas: string[]; pendingAssignment?: boolean; startingSkill: string; currentFocus: string }): string {
  if (input.pendingAssignment) {
    return "Finish your assigned coach work.";
  }
  if (!input.hasActivity) {
    return "Complete your first activity so recommendations can adapt.";
  }
  if (input.weakAreas.length > 0) {
    return `Practice your weak area: ${input.weakAreas[0]}.`;
  }
  return `Continue your path: ${input.currentFocus}.`;
}

// Plain-English beginner glossary (shown to NEW/BEGINNER).
export const BEGINNER_TERMS: Array<{ term: string; plain: string }> = [
  { term: "Warrant", plain: "Why your claim is true." },
  { term: "Impact", plain: "Why your argument matters." },
  { term: "Rebuttal", plain: "Your answer to the other side." },
  { term: "Weighing", plain: "Why your impact matters more." }
];
