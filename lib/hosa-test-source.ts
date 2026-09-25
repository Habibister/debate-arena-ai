import { buildMedTermSession, MEDTERM_AREAS, MEDTERM_BANK, type MedTermArea } from "@/lib/hosa-medterm";

/**
 * HOSA'S REAL PRACTICE-TEST QUESTIONS (phase H3).
 *
 * A HOSA practice test used to be assembled by a template generator. Measured on this tree, a
 * ten-question set contained four distinct stems, every correct answer began "Use ", and one single
 * trio of wrong answers — "Give a definitive diagnosis without enough information", "Use technical
 * language only and move quickly to the next task", "Ignore the concern if the planned action is
 * routine" — was shared by all sixteen categories. A learner could score without knowing any health
 * science: pick the sentence that starts with "Use".
 *
 * CompeteReady already owns 180 real, hand-authored Medical Terminology items with explanations, and
 * they were only reachable from the event's own engine. This module lends them to the practice-test
 * flow so that the one HOSA category we can honestly assess is assessed with real questions.
 *
 * Two properties matter and are enforced here rather than hoped for:
 *   • DISTINCT. A set never repeats a stem while the bank still has unused items, so a ten-question
 *     test is ten questions.
 *   • NO POSITION TELL. The authored bank puts the key first in 142 of 180 items — harmless where it
 *     is never served in authored order, fatal if it were. Choices are shuffled per item at build
 *     time. The bank itself is not rewritten: that is separate, recorded debt.
 *
 * Pure: no React, no prisma, no fetch, no provider. `rng` is injectable so both properties can be
 * proved deterministically.
 */

export type HosaPracticeQuestion = {
  question: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
  skillTag: string;
};

/** The bank's own area labels, so a stored skillTag reads as a topic rather than a slug. */
function areaLabel(area: MedTermArea): string {
  return MEDTERM_AREAS.find((candidate) => candidate.id === area)?.label ?? area;
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/** How many distinct questions this source can serve. Callers must not ask for more. */
export const HOSA_MEDTERM_BANK_SIZE = MEDTERM_BANK.length;

/**
 * Build a Medical Terminology practice set from the real bank.
 *
 * Returns fewer than `count` only when the bank itself holds fewer — the caller then fails closed
 * rather than padding, because padding is exactly what this replaces.
 */
export function hosaMedTermPracticeQuestions(count: number, rng: () => number = Math.random): HosaPracticeQuestion[] {
  const wanted = Math.max(0, Math.min(count, MEDTERM_BANK.length));
  if (wanted === 0) {
    return [];
  }
  // buildMedTermSession spreads across areas and only repeats when asked for more than the bank
  // holds; capping at the bank size above means this set is always distinct.
  const drawn = buildMedTermSession(wanted).slice(0, wanted);
  return drawn.map((item) => {
    const choices = shuffled(item.choices, rng);
    return {
      question: item.question,
      choices,
      correctAnswer: item.correctAnswer,
      explanation: item.explanation,
      skillTag: areaLabel(item.area)
    };
  });
}
