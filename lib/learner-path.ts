import type { TrainingTrack } from "@/lib/training-tracks";

/**
 * The Learn → Practice → Apply → Compete path, as CompeteReady can honestly describe it today.
 *
 * This module is a static description of what the product currently offers. It reads nothing — no
 * session, no database, no storage, no cookie, no query string — and it derives nothing: no
 * completion, no readiness, no mastery, no recommendation, no "next" stage, no percentage.
 *
 * That is deliberate rather than incidental. There is no server record anywhere in the schema for
 * "this learner finished this authored lesson" — authored-lesson resume is device-local only — so a
 * server-rendered path CANNOT truthfully mark Learn complete. Every state below is therefore an
 * AVAILABILITY statement about the product, never a claim about a person. `completed`,
 * `not-started` and `in-progress` exist in the type so a caller with a real record can supply them;
 * no definition in this file uses them.
 *
 * Every href was verified against the routes that exist today.
 */
export type LearnerPathStageState =
  | "available"
  | "not-started"
  | "in-progress"
  | "completed"
  | "informational"
  | "unavailable"
  | "coming-soon";

export type LearnerPathStageId = "learn" | "practice" | "apply" | "compete";

export type LearnerPathStage = {
  id: LearnerPathStageId;
  label: "Learn" | "Practice" | "Apply" | "Compete";
  state: LearnerPathStageState;
  /** Omitted when the stage is not actionable. The rail never links a non-actionable stage. */
  href?: string;
  /** A short qualifier the learner can read. Never a tooltip, never hidden behind hover. */
  note?: string;
};

/** The canonical order. Callers render stages in this sequence. */
export const LEARNER_PATH_STAGE_ORDER: readonly LearnerPathStageId[] = ["learn", "practice", "apply", "compete"] as const;

// ---------------------------------------------------------------------------------------------
// Per-track definitions. Only the three ACTIVE tracks appear — Model UN is soft-removed and has no
// entry, so it cannot leak into any surface that renders this map.
// ---------------------------------------------------------------------------------------------
const DEBATE_PATH: readonly LearnerPathStage[] = [
  { id: "learn", label: "Learn", state: "available", href: "/lessons/claim-warrant-impact" },
  { id: "practice", label: "Practice", state: "available", href: "/skills?track=debate" },
  { id: "apply", label: "Apply", state: "available", href: "/tests?track=debate" },
  { id: "compete", label: "Compete", state: "available", href: "/debate?track=debate" }
] as const;

const DECA_PATH: readonly LearnerPathStage[] = [
  { id: "learn", label: "Learn", state: "available", href: "/lessons/how-deca-roleplay-works" },
  { id: "practice", label: "Practice", state: "available", href: "/training/deca/practice" },
  { id: "apply", label: "Apply", state: "available", href: "/training/deca/events" },
  {
    id: "compete",
    label: "Compete",
    state: "available",
    href: "/study-arcade?track=deca",
    // The simulation runs; nothing about it is kept. Saying so here is the whole point of the note.
    note: "Simulation available — results are not saved yet."
  }
] as const;

const HOSA_PATH: readonly LearnerPathStage[] = [
  {
    id: "learn",
    label: "Learn",
    state: "informational",
    href: "/lessons/how-hosa-scenario-interaction-works",
    // The lesson is readable; its interactive scenario was withdrawn in M11R6 and stays withdrawn.
    note: "Lesson only — the interactive scenario is unavailable."
  },
  {
    id: "practice",
    label: "Practice",
    state: "available",
    // Routed through the event's own page, the way the HOSA hub has directed learners since M11R5 —
    // never a generic HOSA practice room standing in for every event.
    href: "/training/hosa/event/medical-terminology",
    note: "Medical Terminology only."
  },
  { id: "apply", label: "Apply", state: "available", href: "/training/hosa/events" },
  {
    id: "compete",
    label: "Compete",
    state: "coming-soon",
    // Deliberately no href: a stage that does not exist must not be clickable.
    note: "Full HOSA simulation is not currently available."
  }
] as const;

const LEARNER_PATHS: Readonly<Partial<Record<TrainingTrack, readonly LearnerPathStage[]>>> = {
  GENERAL_DEBATE: DEBATE_PATH,
  DECA: DECA_PATH,
  HOSA: HOSA_PATH
};

/**
 * The four stages for an active track, or an empty list for a track we do not describe (including
 * the soft-removed Model UN). Callers render nothing rather than guessing.
 */
export function learnerPathForTrack(track: TrainingTrack): readonly LearnerPathStage[] {
  return LEARNER_PATHS[track] ?? [];
}

/** A stage is actionable only when it has a destination AND its state permits opening one. */
export function isActionableStage(stage: LearnerPathStage): boolean {
  if (stage.state === "unavailable" || stage.state === "coming-soon") return false;
  return typeof stage.href === "string" && stage.href.length > 0;
}
