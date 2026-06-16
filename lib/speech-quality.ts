/**
 * Non-substantive speech guardrail (shared by client UI, opponent generation, and the judge).
 *
 * A debate breaks down when a student submits nonsense or an ultra-short speech ("n", "phones bad")
 * and the AI answers it as if it were a real argument. These helpers decide whether a speech is
 * substantive enough to debate, with a lower bar for beginners (who still must make one real claim).
 */
export type SpeechLevel = "BEGINNER" | "INTERMEDIATE" | "ELITE";

// Words that signal an actual claim/argument (a position plus, ideally, a reason).
const CLAIM_CUES = [
  "should",
  "shouldn't",
  "must",
  "because",
  "since",
  "therefore",
  "helps",
  "reduce",
  "reduces",
  "increase",
  "increases",
  "cause",
  "causes",
  "benefit",
  "benefits",
  "harm",
  "harms",
  "need",
  "needs",
  "matters",
  "leads",
  "means",
  "unfair",
  "better",
  "worse",
  "prevent",
  "protect",
  "improve",
  "allow",
  "ban",
  "require",
  "support",
  "oppose"
];

const LINKING_VERBS = ["is", "are", "was", "were", "do", "does", "can", "could", "would", "has", "have", "will"];

// A reason connective — the "because" half of a claim+reason mini-argument.
const REASON_CUES = [
  "because",
  "since",
  "so that",
  "in order to",
  "leads to",
  "leads",
  "causes",
  "cause",
  "results in",
  "means that",
  "reduce",
  "reduces",
  "prevent",
  "prevents",
  "helps",
  "improve",
  "improves",
  "protect",
  "protects"
];

// Hard floor: below this, the speech is nonsense/too short no matter what ("n", "phones bad").
const MIN_WORDS_FLOOR: Record<SpeechLevel, number> = {
  BEGINNER: 5,
  INTERMEDIATE: 6,
  ELITE: 6
};

// At or above this, a clear claim is enough. Between the floor and this, the speech must be a real
// claim+reason mini-argument — so a tight 13-19 word argument is allowed, but rambling filler is not.
const MIN_WORDS_FULL: Record<SpeechLevel, number> = {
  BEGINNER: 8,
  INTERMEDIATE: 20,
  ELITE: 20
};

function hasReason(text: string): boolean {
  const lower = (text ?? "").toLowerCase();
  return REASON_CUES.some((cue) => new RegExp(`\\b${cue}\\b`).test(lower));
}

export const SUBMIT_HELPER_TEXT = "Add a claim + because reason.";

export function countMeaningfulWords(text: string): number {
  const words = (text ?? "").toLowerCase().match(/[a-z][a-z'-]*/g) ?? [];
  return words.filter((word) => word.length >= 2).length;
}

export function hasClaim(text: string): boolean {
  const lower = (text ?? "").toLowerCase();

  if (CLAIM_CUES.some((cue) => new RegExp(`\\b${cue}\\b`).test(lower))) {
    return true;
  }

  // Fall back to a basic subject+verb sentence with enough content.
  return countMeaningfulWords(text) >= 6 && LINKING_VERBS.some((verb) => new RegExp(`\\b${verb}\\b`).test(lower));
}

export type SpeechAssessment = {
  ok: boolean;
  meaningfulWords: number;
  hasClaim: boolean;
  reason?: string;
};

export function assessStudentSpeech(text: string, level: SpeechLevel = "INTERMEDIATE"): SpeechAssessment {
  const meaningfulWords = countMeaningfulWords(text);
  const claim = hasClaim(text);
  const floor = MIN_WORDS_FLOOR[level] ?? MIN_WORDS_FLOOR.INTERMEDIATE;
  const full = MIN_WORDS_FULL[level] ?? MIN_WORDS_FULL.INTERMEDIATE;
  const tooShort = {
    ok: false as const,
    meaningfulWords,
    hasClaim: claim,
    reason:
      level === "BEGINNER"
        ? "Write at least one full sentence with a claim so the opponent has something real to answer."
        : "Write at least 2–3 sentences so the opponent has something real to answer."
  };

  // Nonsense / ultra-short: always blocked.
  if (meaningfulWords < floor) {
    return tooShort;
  }

  // Long enough to be a speech on its own — just needs a clear claim.
  if (meaningfulWords >= full) {
    if (!claim) {
      return { ok: false, meaningfulWords, hasClaim: claim, reason: SUBMIT_HELPER_TEXT };
    }
    return { ok: true, meaningfulWords, hasClaim: claim };
  }

  // Mid-length: allow only a genuine claim + reason mini-argument (e.g. "X should happen because Y").
  if (claim && hasReason(text)) {
    return { ok: true, meaningfulWords, hasClaim: claim };
  }

  return tooShort;
}

// The coaching reply the opponent gives instead of a real speech when handed nonsense.
export const OPPONENT_COACHING_RESPONSE =
  "I need a real argument to respond to. Try writing one clear claim and one reason. For example: “Dress codes should be implemented because they reduce distractions and set clear expectations, but they must be enforced fairly.”";
