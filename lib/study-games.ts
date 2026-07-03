// Pure, framework-free logic for the flashcard review games. Kept separate from the React UI so the
// question generation, repetition weighting, and missed-terms drill can be unit-tested headlessly.
// No database, no XP, no fake mastery — games are client-side practice over existing flashcards.

export type GameCard = { id: string; term: string; definition: string };

export const MIN_CARDS = 4;
export const DRILL_REQUIRED_CORRECT = 2; // a missed term must be answered correctly this many times
export const ROUNDS_BEFORE_BREAK = 5; // gently suggest a break after this many rounds in a session

export type GameMode = "lock-in" | "clash" | "boss" | "grid-match" | "speed-trial" | "memory-loop";

export const GAME_MODES: Array<{ id: GameMode; name: string; tagline: string; description: string; pace: "calm" | "timed"; length: string }> = [
  { id: "lock-in", name: "Lock-In Mode", tagline: "Answer twice to lock", description: "Lock each term by getting it right twice. Calm, repetition-friendly.", pace: "calm", length: "~5 min" },
  { id: "clash", name: "Clash Mode", tagline: "Fast multiple choice", description: "See a term, pick the definition fast. Build a streak; misses loop back.", pace: "calm", length: "~3 min" },
  { id: "boss", name: "Boss Mode", tagline: "Beat the boss", description: "Correct answers lower the boss's energy bar. School-safe, no rewards.", pace: "calm", length: "~5 min" },
  { id: "grid-match", name: "Grid Match", tagline: "Match the pairs", description: "Pair each term with its definition on a grid. No time pressure.", pace: "calm", length: "~4 min" },
  { id: "speed-trial", name: "Speed Trial", tagline: "5 / 10 / 20 questions", description: "A short set. Timer is off by default — turn it on if you want a challenge.", pace: "timed", length: "~2–6 min" },
  { id: "memory-loop", name: "Memory Loop", tagline: "Loop the tricky ones", description: "Repeat only the terms you missed until each one sticks for this session.", pace: "calm", length: "varies" }
];

// Original, school-safe boss names (not based on any branded game).
export const BOSSES = ["Logic Goblin", "Evidence Dragon", "Fallacy Phantom", "Rebuttal Beast", "Final Exam Boss"];

export function hasEnoughCards(cards: GameCard[]) {
  return cards.length >= MIN_CARDS;
}

export type GameSettings = {
  timer: boolean;
  sound: boolean;
  reducedMotion: boolean;
  questionCount: 5 | 10 | 20;
  repeatMissed: boolean;
  highContrast: boolean;
  calmMode: boolean;
};

// Calm, low-pressure defaults: no timer, no sound, normal motion, repetition on.
export const DEFAULT_SETTINGS: GameSettings = {
  timer: false,
  sound: false,
  reducedMotion: false,
  questionCount: 10,
  repeatMissed: true,
  highContrast: false,
  calmMode: false
};

export function normalizeSettings(raw: unknown): GameSettings {
  const input = (raw ?? {}) as Partial<GameSettings>;
  const count = input.questionCount;
  return {
    timer: Boolean(input.timer ?? DEFAULT_SETTINGS.timer),
    sound: Boolean(input.sound ?? DEFAULT_SETTINGS.sound),
    reducedMotion: Boolean(input.reducedMotion ?? DEFAULT_SETTINGS.reducedMotion),
    questionCount: count === 5 || count === 10 || count === 20 ? count : DEFAULT_SETTINGS.questionCount,
    repeatMissed: Boolean(input.repeatMissed ?? DEFAULT_SETTINGS.repeatMissed),
    highContrast: Boolean(input.highContrast ?? DEFAULT_SETTINGS.highContrast),
    calmMode: Boolean(input.calmMode ?? DEFAULT_SETTINGS.calmMode)
  };
}

type Rng = () => number;

function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Pick up to `count` distinct strings from `pool` (already excluding the correct answer).
function sampleDistinct(pool: string[], count: number, rng: Rng): string[] {
  const unique = Array.from(new Set(pool));
  return shuffle(unique, rng).slice(0, count);
}

export type QuestionMode = "term-to-def" | "def-to-term";

export type Question = {
  card: GameCard;
  prompt: string;
  choices: string[];
  correctIndex: number;
  mode: QuestionMode;
};

// Builds a 4-option multiple-choice question. term-to-def shows the term and asks for the definition;
// def-to-term is the reverse (so students don't only learn the term in one direction).
export function buildQuestion(card: GameCard, allCards: GameCard[], mode: QuestionMode, rng: Rng = Math.random): Question {
  const correct = mode === "term-to-def" ? card.definition : card.term;
  const prompt = mode === "term-to-def" ? card.term : card.definition;
  const otherText = allCards
    .filter((c) => c.id !== card.id)
    .map((c) => (mode === "term-to-def" ? c.definition : c.term))
    .filter((text) => text !== correct);

  const distractors = sampleDistinct(otherText, 3, rng);
  const choices = shuffle([correct, ...distractors], rng);
  return { card, prompt, choices, correctIndex: choices.indexOf(correct), mode };
}

// Repetition weighting: missed cards get a higher weight (appear more often); correct cards drift
// back toward the baseline (appear less often). Avoids repeating the same card twice in a row.
export function pickWeightedCard(cards: GameCard[], weights: Map<string, number>, lastId: string | null, rng: Rng = Math.random): GameCard {
  const pool = cards.length > 1 && lastId ? cards.filter((c) => c.id !== lastId) : cards;
  const total = pool.reduce((sum, c) => sum + (weights.get(c.id) ?? 1), 0);
  let target = rng() * total;
  for (const card of pool) {
    target -= weights.get(card.id) ?? 1;
    if (target <= 0) {
      return card;
    }
  }
  return pool[pool.length - 1];
}

export function adjustWeight(weights: Map<string, number>, id: string, correct: boolean) {
  const current = weights.get(id) ?? 1;
  weights.set(id, correct ? Math.max(1, current - 1) : current + 2);
}

// Missed-terms drill: a card clears once answered correctly DRILL_REQUIRED_CORRECT times in a row; a
// wrong answer resets its streak so it keeps looping until it sticks (no shame, just repetition).
export function recordDrillAnswer(progress: Map<string, number>, id: string, correct: boolean) {
  const current = progress.get(id) ?? 0;
  progress.set(id, correct ? current + 1 : 0);
}

export function isDrillComplete(progress: Map<string, number>, missedIds: string[]) {
  return missedIds.every((id) => (progress.get(id) ?? 0) >= DRILL_REQUIRED_CORRECT);
}

// Supportive, no-shame copy. Never "failed/bad/wrong".
export const COPY = {
  correct: ["Nice — that one stuck.", "Yes — that stuck.", "Locked in."],
  incorrect: ["Not yet. Let's see it again soon.", "Almost there — repetition builds memory.", "Close. We'll loop this one."],
  drillIntro: "These are the terms your brain is still locking in.",
  drillEncourage: "Almost there — repetition builds memory.",
  breakSuggestion: "Great work. Take a short break or try a debate round.",
  // Lock-In / Memory Loop
  lockIntro: "Let's loop the tricky ones.",
  almostLocked: "Almost locked.",
  lockedIn: "Locked in.",
  loopingBack: "Looping this one back.",
  patternGrowing: "Your brain is building the pattern.",
  // Clash
  cleanClash: "Clean clash.",
  clashReturn: "This one comes back soon."
};

export function pickCopy(list: string[], rng: Rng = Math.random): string {
  return list[Math.floor(rng() * list.length)] ?? list[0];
}
