/**
 * DECA concept-drill bank integrity + grading consistency. Pure, no DB, no provider.
 * Run with: npm run deca-drills:smoke
 */
import assert from "node:assert/strict";
import { DECA_DRILL_AREAS, DECA_DRILL_BANK, buildDecaDrillSession, gradeDecaDrillAnswers, type DecaDrillArea } from "../lib/deca-drills";

async function main() {
  assert.ok(DECA_DRILL_BANK.length >= 32, `expected >=32 DECA drill questions, found ${DECA_DRILL_BANK.length}`);
  const ids = new Set<string>();
  const areaCounts = new Map<DecaDrillArea, number>();
  for (const q of DECA_DRILL_BANK) {
    assert.ok(!ids.has(q.id), `duplicate question id ${q.id}`);
    ids.add(q.id);
    assert.ok(q.choices.length >= 3, `${q.id} has too few choices`);
    assert.ok(new Set(q.choices).size === q.choices.length, `${q.id} has duplicate choices`);
    assert.ok(q.choices.includes(q.correctAnswer), `${q.id} correctAnswer is not one of its choices`);
    assert.ok(q.explanation.trim().length > 0, `${q.id} missing explanation`);
    areaCounts.set(q.area, (areaCounts.get(q.area) ?? 0) + 1);
  }

  for (const area of DECA_DRILL_AREAS) {
    assert.ok((areaCounts.get(area.id) ?? 0) >= 6, `area ${area.id} has too few questions`);
    assert.ok(area.skillSlug.startsWith("deca-"), `area ${area.id} must map to a DECA skill`);
  }

  const s = buildDecaDrillSession(10);
  assert.equal(new Set(s.map((q) => q.id)).size, 10, "10-question session has no repeats");
  const focused = buildDecaDrillSession(6, ["business-reasoning"]);
  assert.ok(focused.every((q) => q.area === "business-reasoning"), "focused session restricts to the chosen area");

  const allCorrect = DECA_DRILL_BANK.slice(0, 8).map((q) => ({ id: q.id, selected: q.correctAnswer }));
  const perfect = gradeDecaDrillAnswers(allCorrect);
  assert.equal(perfect.scorePercent, 100, "all-correct grades 100");
  assert.ok(perfect.perSkill.length >= 1 && perfect.perSkill.every((sk) => sk.scorePercent === 100), "per-skill all 100");

  const q0 = DECA_DRILL_BANK[0];
  const wrong = q0.choices.find((c) => c !== q0.correctAnswer)!;
  const mixed = gradeDecaDrillAnswers([{ id: q0.id, selected: wrong }, { id: DECA_DRILL_BANK[1].id, selected: DECA_DRILL_BANK[1].correctAnswer }]);
  const q0Skill = mixed.perSkill.find((sk) => sk.area === q0.area)!;
  assert.ok(q0Skill.scorePercent < 100, "a wrong answer lowers that skill's score");

  console.log(`Deca-drills smoke passed: ${DECA_DRILL_BANK.length} original questions across ${DECA_DRILL_AREAS.length} areas, integrity + focused sessions + per-skill grading consistent.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
