/**
 * THE ROLE-PLAY ROUND LIFECYCLE (beginner QA R3, findings #1, #2, #3, #5).
 *
 * The room's evaluation flow lived entirely inside a 1000-line client component, and its failure path
 * did one thing: set a shared error string. Nothing marked the round finished, so a learner whose ballot
 * request failed was left in the middle of the round with a judge waiting and no way to end — while the
 * error text, borrowed from another channel, told them their practice had not been recorded at all.
 *
 * The transitions that decide those outcomes now live here, pure and testable without a provider:
 *
 *   • ENDING AND SCORING ARE DIFFERENT EVENTS. A round can finish with no ballot. `evaluationFailed`
 *     moves the round to a terminal state that says the practice happened and the evaluation did not.
 *   • NOTHING IS INVENTED. There is no state in which a failed evaluation produces a score, a band, or
 *     feedback. The only way to hold a ballot is `evaluationSucceeded`, which requires a real result.
 *   • ONE ATTEMPT AT A TIME. `requestEvaluation` refuses to start a second evaluation while one is in
 *     flight and refuses to re-score a round that already has a ballot, so a double click, a fast retry
 *     and a stuck button cannot produce two ballots.
 *   • ONE CURRENT FAILURE. The failure is a value, not a list: a second failure replaces the first
 *     rather than stacking another copy of the same news.
 *
 * Pure: no React, no fetch, no provider, no storage.
 */

export type RoleplayTurn = {
  speaker: "student" | "character";
  content: string;
  character?: string;
};

export type EvaluationStatus =
  /** No evaluation requested yet — the round is still being played. */
  | "idle"
  /** A request is in flight. No second one may start. */
  | "in-flight"
  /** A real ballot came back. Terminal, and the only state that may show a score. */
  | "evaluated"
  /** The round is over and could not be evaluated. Terminal, and never shows a score. */
  | "failed";

export type EvaluationState = {
  status: EvaluationStatus;
  /** The current failure, replacing any earlier one. Null unless `status` is "failed". */
  message: string | null;
  /** How many evaluation attempts this round has made, including the current one. */
  attempts: number;
};

export const initialEvaluation: EvaluationState = { status: "idle", message: null, attempts: 0 };

/**
 * Ask to evaluate. `start` is false when the caller must NOT fire a request: one is already running, or
 * the round already holds a ballot. A failed round may try again — the transcript is unchanged, so the
 * retry evaluates exactly the same round.
 */
export function requestEvaluation(state: EvaluationState): { state: EvaluationState; start: boolean } {
  if (state.status === "in-flight" || state.status === "evaluated") {
    return { state, start: false };
  }
  return { state: { status: "in-flight", message: null, attempts: state.attempts + 1 }, start: true };
}

/** A real ballot arrived. Terminal: no further attempt may start, so no second ballot can exist. */
export function evaluationSucceeded(state: EvaluationState): EvaluationState {
  return { status: "evaluated", message: null, attempts: state.attempts };
}

/**
 * The evaluation failed. The ROUND is over — the learner performed it — and the ballot is not available.
 * The message replaces any previous one so repeated failures never stack.
 */
export function evaluationFailed(state: EvaluationState, message: string): EvaluationState {
  return { status: "failed", message: message.trim() || "Evaluation is unavailable right now.", attempts: state.attempts };
}

/** Both terminal states: the learner is done performing, whether or not a ballot exists. */
export function roundHasEnded(state: EvaluationState): boolean {
  return state.status === "evaluated" || state.status === "failed";
}

/** The round ended WITHOUT a ballot — the state the terminal "evaluation unavailable" card renders for. */
export function endedWithoutBallot(state: EvaluationState): boolean {
  return state.status === "failed";
}

/** Whether a retry action should be offered. Only a failed round may be retried, and never mid-flight. */
export function canRetryEvaluation(state: EvaluationState): boolean {
  return state.status === "failed";
}

/**
 * Append the learner's own words. ALWAYS applied, before any provider request: the learner said it, so
 * it is part of the round whether or not the judge answers. Finding #3 is exactly this ordering — a
 * reply that only survives a successful request looks to the learner like it was never sent.
 */
export function appendStudentTurn(turns: readonly RoleplayTurn[], content: string): RoleplayTurn[] {
  const trimmed = content.trim();
  if (!trimmed) return [...turns];
  return [...turns, { speaker: "student", content: trimmed }];
}

/** Append what the other person said. Only ever called with a real provider line. */
export function appendCharacterTurn(
  turns: readonly RoleplayTurn[],
  content: string,
  character?: string
): RoleplayTurn[] {
  const trimmed = content.trim();
  if (!trimmed) return [...turns];
  return [...turns, { speaker: "character", content: trimmed, character }];
}

/**
 * True when the judge's newest line repeats its own previous line word for word — which is what a
 * learner sees as "it asked me the same question again". Reported, never silently rewritten: this
 * module does not invent a replacement question.
 */
export function repeatsPreviousCharacterLine(turns: readonly RoleplayTurn[]): boolean {
  const characterLines = turns.filter((turn) => turn.speaker === "character").map((turn) => turn.content.trim());
  if (characterLines.length < 2) return false;
  return characterLines[characterLines.length - 1] === characterLines[characterLines.length - 2];
}

/** Control helper: the learner's latest words must reach the next request. */
export function latestStudentTurn(turns: readonly RoleplayTurn[]): RoleplayTurn | null {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (turn.speaker === "student") return turn;
  }
  return null;
}
