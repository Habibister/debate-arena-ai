/**
 * Rubric Engine stage 2: asserts registry-driven weighted scoring is internally consistent —
 * category scores x point weights = overall (within rounding). Pure math, no DB, no provider.
 * Run with: npm run rubric-scoring:smoke
 */
import assert from "node:assert/strict";
import { computeWeightedOverall } from "../lib/ai";

// A representative 6-category / 100-point rubric used to exercise the weighted-sum MATH. This is an
// arbitrary example (five 18-pt categories + one 10-pt), NOT a claim about any specific event's
// current sourced point split — it exists purely to verify computeWeightedOverall is consistent.
const EXAMPLE = [
  { name: "Category A", points: 18 },
  { name: "Category B", points: 18 },
  { name: "Category C", points: 18 },
  { name: "Category D", points: 18 },
  { name: "Category E", points: 18 },
  { name: "Category F", points: 10 }
];

function overallFor(scores: number[]): number {
  return computeWeightedOverall(EXAMPLE.map((c, i) => ({ score: scores[i], points: c.points })));
}

async function main() {
  // Point structure sanity: the sourced split totals 100.
  const total = EXAMPLE.reduce((s, c) => s + c.points, 0);
  assert.equal(total, 100, "example category points sum to 100");

  // Weighted-average identity: if every category scores the same S, the overall equals S.
  for (const s of [0, 55, 80, 100]) {
    assert.equal(overallFor(EXAMPLE.map(() => s)), s, `uniform ${s} -> overall ${s}`);
  }

  // Weighting matters: acing only PI1 (18 pts), zero elsewhere, yields exactly 18.
  assert.equal(overallFor([100, 0, 0, 0, 0, 0]), 18, "PI1 only (18/100 pts) -> 18");
  // Acing only the 10-pt Overall category yields exactly 10.
  assert.equal(overallFor([0, 0, 0, 0, 0, 100]), 10, "Overall only (10/100 pts) -> 10");

  // Monotonic + correct magnitude: raising one 18-pt category's score by 50 raises overall by
  // 50 * 18 / 100 = 9 points (within rounding).
  const base = overallFor([40, 40, 40, 40, 40, 40]);
  const raised = overallFor([90, 40, 40, 40, 40, 40]);
  assert.equal(base, 40, "uniform 40 baseline");
  assert.equal(raised - base, 9, "raising one 18-pt category by 50 raises overall by 9");

  // Explicit weighted-sum cross-check against a hand-computed value.
  const scores = [80, 60, 100, 50, 70, 90];
  const expected = Math.round((80 * 18 + 60 * 18 + 100 * 18 + 50 * 18 + 70 * 18 + 90 * 10) / 100);
  assert.equal(overallFor(scores), expected, `mixed scores -> hand-computed ${expected}`);

  // Clamping: out-of-range scores are pinned to 0-100 before weighting.
  assert.equal(computeWeightedOverall([{ score: 150, points: 50 }, { score: -20, points: 50 }]), 50, "clamps to 0-100");
  // Degenerate: no points -> 0, never NaN.
  assert.equal(computeWeightedOverall([]), 0, "no categories -> 0");

  console.log(
    `Rubric-scoring smoke passed: weighted-sum identity, per-category weighting (18/10 split), monotonic magnitude, hand-computed cross-check, clamping, and degenerate-safety — all internally consistent.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
