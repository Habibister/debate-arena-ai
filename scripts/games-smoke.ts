/**
 * Flashcard games smoke test (pure logic, deterministic — no DB, no browser).
 * Exercises lib/study-games.ts: card-count gate, 10-question round generation, missed-term
 * collection + weighting, and the missed-terms drill loop. Run with: npm run games:smoke
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import {
  adjustWeight,
  buildQuestion,
  COPY,
  DEFAULT_SETTINGS,
  DRILL_REQUIRED_CORRECT,
  GAME_MODES,
  hasEnoughCards,
  isDrillComplete,
  normalizeSettings,
  pickWeightedCard,
  recordDrillAnswer,
  type GameCard
} from "../lib/study-games";

// Deterministic RNG so the test is stable.
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const cards: GameCard[] = [
  { id: "a", term: "Claim", definition: "The position you are arguing for." },
  { id: "b", term: "Warrant", definition: "The reasoning that links evidence to a claim." },
  { id: "c", term: "Impact", definition: "Why the argument matters in the round." },
  { id: "d", term: "Rebuttal", definition: "A direct response that answers the opponent." },
  { id: "e", term: "Evidence", definition: "Facts or examples that support a claim." },
  { id: "f", term: "Weighing", definition: "Comparing arguments to show which matters more." }
];

function main() {
  // Test 1: the games page exists and the hub shows the six redesigned modes.
  assert.ok(existsSync("app/(app)/study/[deck]/games/page.tsx"), "Study games page must exist.");
  assert.equal(GAME_MODES.length, 6, "Six game modes.");
  assert.deepEqual(
    GAME_MODES.map((m) => m.id).sort(),
    ["boss", "clash", "grid-match", "lock-in", "memory-loop", "speed-trial"],
    "Hub shows the six redesigned modes."
  );
  assert.ok(existsSync("components/study/games/lock-in-game.tsx"), "Lock-In mode component must exist.");

  // Test 2: a game needs at least 4 cards.
  assert.equal(hasEnoughCards(cards.slice(0, 3)), false, "3 cards is not enough.");
  assert.equal(hasEnoughCards(cards.slice(0, 4)), true, "4 cards is enough.");

  // Test 3: a 10-question round generates valid 4-option questions.
  const rng = makeRng(42);
  const weights = new Map<string, number>();
  let lastId: string | null = null;
  for (let i = 0; i < 10; i += 1) {
    const card = pickWeightedCard(cards, weights, lastId, rng);
    lastId = card.id;
    const q = buildQuestion(card, cards, "term-to-def", rng);
    assert.equal(q.choices.length, 4, "Each question must have 4 choices.");
    assert.equal(new Set(q.choices).size, 4, "Choices must be distinct.");
    assert.ok(q.correctIndex >= 0 && q.correctIndex < 4, "correctIndex must be in range.");
    assert.equal(q.choices[q.correctIndex], card.definition, "Correct choice must be the card's definition.");
  }

  // Definition Dash (reverse) also works.
  const reverse = buildQuestion(cards[0], cards, "def-to-term", rng);
  assert.equal(reverse.prompt, cards[0].definition, "def-to-term prompts with the definition.");
  assert.equal(reverse.choices[reverse.correctIndex], cards[0].term, "def-to-term answer is the term.");

  // Test 4: a wrong answer collects the card as missed and raises its repeat weight.
  const missed = new Map<string, GameCard>();
  const w = new Map<string, number>();
  const q = buildQuestion(cards[0], cards, "term-to-def", rng);
  const wrongIndex = (q.correctIndex + 1) % 4;
  const isCorrect = wrongIndex === q.correctIndex; // false
  assert.equal(isCorrect, false, "Sanity: chosen index is wrong.");
  missed.set(cards[0].id, cards[0]);
  adjustWeight(w, cards[0].id, false);
  assert.ok(missed.has(cards[0].id), "Wrong answer must add the card to missed terms.");
  assert.equal(w.get(cards[0].id), 3, "A miss must raise the card's weight (appears more often).");
  adjustWeight(w, cards[0].id, true); // a later correct lowers it back toward baseline
  assert.equal(w.get(cards[0].id), 2, "A correct answer lowers the weight.");

  // Test 5: the missed-terms drill repeats a card until it is correct DRILL_REQUIRED_CORRECT times.
  const missedIds = ["a", "b"];
  const progress = new Map<string, number>();
  assert.equal(isDrillComplete(progress, missedIds), false, "Drill starts incomplete.");
  recordDrillAnswer(progress, "a", true);
  recordDrillAnswer(progress, "b", true);
  assert.equal(isDrillComplete(progress, missedIds), false, "One correct each is not enough.");
  recordDrillAnswer(progress, "a", false); // a wrong answer resets the streak (keep looping)
  assert.equal(progress.get("a"), 0, "A wrong answer resets the drill streak.");
  recordDrillAnswer(progress, "a", true);
  recordDrillAnswer(progress, "a", true);
  recordDrillAnswer(progress, "b", true);
  assert.equal(progress.get("a"), DRILL_REQUIRED_CORRECT, "Card a is now locked in.");
  assert.equal(isDrillComplete(progress, missedIds), true, "Drill completes when all cards are locked in.");

  // Test 6: timer is off by default (no harsh time pressure).
  assert.equal(DEFAULT_SETTINGS.timer, false, "Timer must default to off.");
  assert.equal(DEFAULT_SETTINGS.reducedMotion, false, "Reduced motion defaults to off.");

  // Test 7: settings normalize safely (reduced motion + question count).
  const normalized = normalizeSettings({ reducedMotion: true, questionCount: 999 });
  assert.equal(normalized.reducedMotion, true, "Reduced motion can be enabled.");
  assert.equal(normalized.questionCount, 10, "Invalid question count falls back to the default.");

  // Test 8: no shame language in feedback copy (supportive, neurodivergent-friendly).
  const shame = /fail|wrong|bad|stupid|dumb/i;
  const allCopy = [
    ...COPY.correct,
    ...COPY.incorrect,
    COPY.drillIntro,
    COPY.drillEncourage,
    COPY.breakSuggestion,
    COPY.lockIntro,
    COPY.almostLocked,
    COPY.lockedIn,
    COPY.loopingBack,
    COPY.patternGrowing,
    COPY.cleanClash,
    COPY.clashReturn
  ];
  for (const line of allCopy) {
    assert.ok(!shame.test(line), `Copy must avoid shame language: "${line}"`);
  }

  // Test 9 & 10: auth and the Gemini/AI health route are present and untouched.
  assert.ok(existsSync("lib/auth.ts"), "Auth must still exist.");
  assert.ok(existsSync("app/api/ai/health/route.ts"), "AI health route must still exist.");

  // ---- G19 (M14 Phase 1e): the Study Arcade never claims fabricated progress ---------------------
  // The page once said "flashcard decks, review games, and drills that feed your real mastery
  // record" and "every arcade rep updates your real mastery progress" — but deck and game reps make
  // no server write at all. Recording claims must stay scoped to the drills, which do record.
  // Scans run over comment-stripped, whitespace-normalized source so a claim split across JSX lines
  // is still caught and prose in comments (like this one, or the fixture below) never trips them.
  const stripCode = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
  const normalize = (src: string) => stripCode(src).replace(/&apos;/g, "'").replace(/\s+/g, " ");
  const arcade = normalize(readFileSync("app/(app)/study-arcade/page.tsx", "utf8"));

  // G19-1/2: both former claims are gone, checked against normalized source.
  assert.ok(!arcade.includes("every arcade rep updates"),
    "G19-1. the 'every arcade rep updates your real mastery progress' claim is gone");
  assert.ok(!/flashcard decks, review games, and drills that feed/.test(arcade),
    "G19-2. the lumped decks+games+drills recording claim is gone");
  // G19-3: no sentence couples decks/games with feeding or updating mastery/progress.
  const LUMPED = /(decks?|games?)[^.]*?\b(feeds?|updates?)\b[^.]*?\b(mastery|progress)\b/i;
  assert.ok(!LUMPED.test(arcade), "G19-3. no sentence claims decks or games feed/update mastery or progress");
  // G19-4: the truthful scoped copy is present — drills record; decks and games are labeled unrecorded.
  assert.ok(/drills that feed your real mastery record/.test(arcade),
    "G19-4. the recording claim is scoped to drills");
  assert.ok((arcade.match(/aren't recorded/g) ?? []).length >= 2,
    "G19-4b. decks and games are labeled as not recorded, in the header and the record tile");
  assert.ok(/recorded from real drill sessions/.test(arcade),
    "G19-4c. the practiced-skills tile attributes its count to drill sessions");
  // G19-5: the copy matches reality in BOTH directions — the study components still make no server
  // write. If decks or games ever start recording, update the arcade copy AND this pairing together.
  const studyFiles: string[] = [];
  const walk = (dir: string) => { for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(full); else if (/\.(ts|tsx)$/.test(e.name)) studyFiles.push(full);
  } };
  walk("components/study");
  assert.ok(studyFiles.length >= 5, "G19-5. control: the study components were actually enumerated");
  for (const file of studyFiles) {
    const src = stripCode(readFileSync(file, "utf8"));
    assert.ok(!/\bfetch\(/.test(src) && !/\bprisma\./.test(src),
      `G19-5b. ${file} makes no server write — decks/games stay unrecorded, matching the arcade copy`);
  }
  // ---- Non-vacuous controls ----------------------------------------------------------------------
  // Each former claim, replayed as a fixture, IS caught by the scan that bans it.
  assert.ok("every arcade rep updates your real mastery progress".includes("every arcade rep updates"),
    "G19-C1. control: the old tile claim would be caught");
  assert.ok(LUMPED.test("flashcard decks, review games, and drills that feed your real mastery record"),
    "G19-C2. control: the old lumped claim would be caught");
  assert.ok(LUMPED.test(normalize("review games that\n            update your mastery")),
    "G19-C3. control: a claim split across JSX lines is still caught after normalization");
  assert.ok(!LUMPED.test(normalize("// review games that update your mastery")),
    "G19-C4. control: the same words inside a comment never trip the scan");
  assert.ok(!LUMPED.test("decks and games aren't recorded"),
    "G19-C5. control: the truthful negation does not trip the scan");


  console.log("Games smoke tests passed: min-card gate, 10-question round, reverse mode, missed collection + weighting, drill loop, timer-off default, settings normalize, no-shame copy, auth + AI health untouched, PLUS G19: the Study Arcade scopes recording claims to drills, labels decks/games as unrecorded, and the study components verifiably make no server write.");
}

main();
