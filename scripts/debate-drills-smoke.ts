/**
 * General Debate concept-drill bank integrity + grading consistency. Pure, no DB, no provider.
 * Run with: npm run debate-drills:smoke
 */
import assert from "node:assert/strict";
import {
  DRILL_AREAS,
  DRILL_BANK,
  DEBATE_DRILL_REQUIRED_UNIQUE,
  buildDrillEvidence,
  buildDrillSession,
  debateDrillPersistenceRequest,
  gradeDrillAnswers,
  type DrillArea
} from "../lib/debate-drills";

async function main() {
  // Bank integrity.
  assert.ok(DRILL_BANK.length >= 32, `expected >=32 drill questions, found ${DRILL_BANK.length}`);
  const ids = new Set<string>();
  const areaCounts = new Map<DrillArea, number>();
  for (const q of DRILL_BANK) {
    assert.ok(!ids.has(q.id), `duplicate question id ${q.id}`);
    ids.add(q.id);
    assert.ok(q.choices.length >= 3, `${q.id} has too few choices`);
    assert.ok(new Set(q.choices).size === q.choices.length, `${q.id} has duplicate choices`);
    assert.ok(q.choices.includes(q.correctAnswer), `${q.id} correctAnswer is not one of its choices`);
    assert.ok(q.explanation.trim().length > 0, `${q.id} missing explanation`);
    areaCounts.set(q.area, (areaCounts.get(q.area) ?? 0) + 1);
  }

  // Every area is represented and maps to a skill slug.
  for (const area of DRILL_AREAS) {
    assert.ok((areaCounts.get(area.id) ?? 0) >= 6, `area ${area.id} has too few questions`);
    assert.ok(area.skillSlug.startsWith("debate-"), `area ${area.id} must map to a debate skill`);
  }

  // Session builder: distinct within a session that fits the bank; focused filter works.
  const s = buildDrillSession(10);
  assert.equal(new Set(s.map((q) => q.id)).size, 10, "10-question session has no repeats");
  const focused = buildDrillSession(6, ["weighing"]);
  assert.ok(focused.every((q) => q.area === "weighing"), "focused session restricts to the chosen area");

  // Grading: all-correct = 100 with per-skill breakdown; a wrong answer lowers that skill only.
  const allCorrect = DRILL_BANK.slice(0, 8).map((q) => ({ id: q.id, selected: q.correctAnswer }));
  const perfect = gradeDrillAnswers(allCorrect);
  assert.equal(perfect.scorePercent, 100, "all-correct grades 100");
  assert.ok(perfect.perSkill.length >= 1 && perfect.perSkill.every((sk) => sk.scorePercent === 100), "per-skill all 100");

  const q0 = DRILL_BANK[0];
  const wrong = q0.choices.find((c) => c !== q0.correctAnswer)!;
  const mixed = gradeDrillAnswers([{ id: q0.id, selected: wrong }, { id: DRILL_BANK[1].id, selected: DRILL_BANK[1].correctAnswer }]);
  const q0Skill = mixed.perSkill.find((sk) => sk.area === q0.area)!;
  assert.ok(q0Skill.scorePercent < 100, "a wrong answer lowers that skill's score");

  // Every area's bank must be able to REACH the evidence floor, or that skill could never be recorded.
  for (const area of DRILL_AREAS) {
    const pool = DRILL_BANK.filter((q) => q.area === area.id);
    assert.ok(pool.length >= DEBATE_DRILL_REQUIRED_UNIQUE,
      `area ${area.id} has fewer than ${DEBATE_DRILL_REQUIRED_UNIQUE} distinct questions, so it could never qualify`);
    const ev = buildDrillEvidence(pool.slice(0, DEBATE_DRILL_REQUIRED_UNIQUE).map((q) => ({ id: q.id, selected: q.correctAnswer })));
    assert.equal(ev[0]?.evidenceStatus, "passing", `area ${area.id} reaches passing evidence at the floor`);
    assert.equal(ev[0]?.skillSlug, area.skillSlug, `area ${area.id} maps to ${area.skillSlug}`);
  }

  // REGRESSION: the two scores the pre-M13E1E contract conflated must stay separate.
  const w = (q: (typeof DRILL_BANK)[number]) => q.choices.find((c) => c !== q.correctAnswer)!;
  const cwi = DRILL_BANK.filter((q) => q.area === "claim-warrant-impact");
  const bypass = [
    ...cwi.slice(0, 5).map((q, i) => ({ id: q.id, selected: i < 1 ? q.correctAnswer : w(q) })),
    ...Array.from({ length: 12 }, () => ({ id: cwi[0].id, selected: cwi[0].correctAnswer }))
  ];
  assert.equal(gradeDrillAnswers(bypass).perSkill[0].scorePercent, 76, "the raw session score for the bypass is still 76");
  assert.equal(buildDrillEvidence(bypass)[0].evidenceScore, 20, "but its evidence score is 20 — duplicates count once");

  const reb = DRILL_BANK.filter((q) => q.area === "rebuttal");
  const padded = reb.map((q, i) => ({ id: q.id, selected: i < 6 ? q.correctAnswer : w(q) }));
  while (padded.length < 20) { const q = reb[padded.length % 9]; padded.push({ id: q.id, selected: q.correctAnswer }); }
  assert.equal(gradeDrillAnswers(padded).perSkill[0].scorePercent, 85, "the honest-padding raw score still reads 85");
  assert.equal(buildDrillEvidence(padded)[0].evidenceScore, 67, "but its evidence score is 67 — repeats count once");
  assert.deepEqual(debateDrillPersistenceRequest(buildDrillEvidence(padded)[0]), { scorePercent: 67, passed: false },
    "so persistence receives 67 with passed:false, never a MASTERED-qualified result");

  // The raw grader still counts every answer; the evidence set does not.
  const repeated = [cwi[0], cwi[0], cwi[0]].map((q) => ({ id: q.id, selected: q.correctAnswer }));
  assert.equal(gradeDrillAnswers(repeated).total, 3, "the session grader still counts every answer");
  assert.equal(buildDrillEvidence(repeated)[0].uniqueTotal, 1, "but the evidence set counts the question once");

  console.log(`Debate-drills smoke passed: ${DRILL_BANK.length} original questions across ${DRILL_AREAS.length} areas, integrity + focused sessions + per-skill grading consistent, and every area can reach the ${DEBATE_DRILL_REQUIRED_UNIQUE}-distinct-question evidence floor while repeats count once (bypass 76%->20%, honest padding 85%->67%).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
