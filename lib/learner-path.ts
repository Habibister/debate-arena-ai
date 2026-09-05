import type { TrainingTrack } from "@/lib/training-tracks";

/**
 * The learner path for each active track, as CompeteReady can honestly describe it today.
 *
 * The stage VOCABULARY is shared; the JOURNEY is per track. DECA and HOSA describe four stages.
 * DEBATE describes two — Learn, then Compete — because that is what Debate actually is: teaching,
 * then the round. Practice and Apply were removed from Debate as PRODUCT CATEGORIES, not as
 * capabilities: drills, spaced review, remediation and writing practice all still exist and are all
 * still reachable, as supporting actions inside Learn rather than as stages a learner must first
 * understand. Numbering is positional within a track, so Debate reads "1 Learn, 2 Compete" — a
 * phantom "4" for Compete would tell a Debate learner that steps 2 and 3 are missing.
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

/**
 * NOTE ON THE STAGE UNION. `practice` and `apply` remain in the type because DECA and HOSA still use
 * them, and their definitions below are unchanged. Debate simply no longer declares those stages.
 */

export type LearnerPathStage = {
  id: LearnerPathStageId;
  label: "Learn" | "Practice" | "Apply" | "Compete";
  state: LearnerPathStageState;
  /** Omitted when the stage is not actionable. The rail never links a non-actionable stage. */
  href?: string;
  /** A short qualifier the learner can read. Never a tooltip, never hidden behind hover. */
  note?: string;
};

/**
 * The order stage ids are DECLARED in, for a track that uses all four.
 *
 * Not a rendering contract and never was: every caller renders the array `learnerPathForTrack`
 * returns, in that array's own order, and numbers each stage by its position there. A track that
 * declares two stages therefore numbers them 1 and 2. Kept as the documented declaration order for
 * the four-stage tracks; do not reintroduce it as a global numbering source.
 */
export const LEARNER_PATH_STAGE_ORDER: readonly LearnerPathStageId[] = ["learn", "practice", "apply", "compete"] as const;

// ---------------------------------------------------------------------------------------------
// Per-track definitions. Only the three ACTIVE tracks appear — Model UN is soft-removed and has no
// entry, so it cannot leak into any surface that renders this map.
// ---------------------------------------------------------------------------------------------
// DEBATE: two stages. Learn, then Compete.
//
// PRACTICE was a stage pointing at `/study-arcade?track=debate`. It is gone as a stage and the drill
// surface is untouched: the lesson call to action, the review queue, remediation and the Coach all
// still deep-link into it, and it keeps its own entry in the app shell. What a learner no longer has
// to do is understand "Practice" as a product area standing between learning a skill and using it.
//
// APPLY was a stage with no destination, carrying the note "No dedicated Apply destination yet."
// That sentence was the product admitting the category had no purpose for Debate. It is removed
// rather than reworded — there is no Debate Apply stage, so there is nothing to say about one.
// DECA and HOSA keep their Apply stages, which do have destinations.
//
// LEARN now opens the lesson CATALOG, not one lesson. It pointed at `/lessons/claim-warrant-impact`,
// which made a single lesson behave like the whole Learn product: a learner who had already read it
// had nowhere to go, and the other eight published lessons were reachable only by knowing they
// existed. `claim-warrant-impact` remains a published lesson in that catalog.
const DEBATE_PATH: readonly LearnerPathStage[] = [
  { id: "learn", label: "Learn", state: "available", href: "/lessons?track=debate" },
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
 * The stages for an active track, in that track's own order, or an empty list for a track we do not
 * describe (including the soft-removed Model UN). Callers render nothing rather than guessing.
 *
 * The LENGTH is per track and is part of the answer: DECA and HOSA return four stages, Debate returns
 * two. Never assume four.
 */
export function learnerPathForTrack(track: TrainingTrack): readonly LearnerPathStage[] {
  return LEARNER_PATHS[track] ?? [];
}

/** A stage is actionable only when it has a destination AND its state permits opening one. */
export function isActionableStage(stage: LearnerPathStage): boolean {
  if (stage.state === "unavailable" || stage.state === "coming-soon") return false;
  return typeof stage.href === "string" && stage.href.length > 0;
}
