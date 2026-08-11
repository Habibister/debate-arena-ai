/**
 * General Debate concept-drill bank integrity + grading consistency. Pure, no DB, no provider.
 * Run with: npm run debate-drills:smoke
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
  // EXACT composition, not a `>= 32` floor. A floor cannot notice a bank that was rewritten in
  // place, and audit G2 asks for real per-area depth assertions. AREA_DEPTH is the single source of
  // truth: a Global-G2 slice raises exactly ONE entry 9 -> 30 and every assertion below follows.
  const AREA_DEPTH: Record<DrillArea, number> = {
    "claim-warrant-impact": 9,
    "rebuttal": 9,
    "evidence-evaluation": 9,
    "weighing": 9
  };
  const EXPECTED_TOTAL = Object.values(AREA_DEPTH).reduce((a, b) => a + b, 0);
  assert.equal(DRILL_BANK.length, EXPECTED_TOTAL, `G0-1. the Debate bank holds exactly ${EXPECTED_TOTAL} questions`);
  assert.equal(new Set(DRILL_BANK.map((q) => q.id)).size, EXPECTED_TOTAL, "G0-1b. with unique ids");
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
    assert.equal(areaCounts.get(area.id) ?? 0, AREA_DEPTH[area.id],
      `G0-2. area ${area.id} holds exactly ${AREA_DEPTH[area.id]} questions`);
    assert.ok(area.skillSlug.startsWith("debate-"), `area ${area.id} must map to a debate skill`);
  }
  assert.equal(DRILL_AREAS.length, Object.keys(AREA_DEPTH).length,
    "G0-2b. AREA_DEPTH covers every declared area — it cannot drift from the bank");

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

  // ================= ADDITIVE-INTEGRITY MODEL — M14 Global G2 Slice 0 =============================
  // Before this slice the Debate bank had NO content protection: a `>= 32` length floor and a
  // per-area `>= 6` floor, both of which a full in-place rewrite would satisfy. Three suites also
  // carried `git show HEAD:` byte hashes over lib/debate-drills.ts. A HEAD-relative hash fails while
  // an authorised change is uncommitted and passes the instant it commits — it is a "nothing is
  // uncommitted" check, not content protection, and it can never notice what a commit changed.
  // Replaced here by the model proven on the HOSA bank (31f*): diff against an IMMUTABLE commit and
  // permit only explicitly authorised additions.
  //
  // NEVER make this HEAD-relative, and never re-anchor it. It names the deployed pre-expansion bank.
  const PRE_G2_EXPANSION = "26149a3127c0bc7f3108c303f57d41a8dd9088c0";

  const controlsRun: string[] = [];
  const control = (name: string, held: boolean) => {
    assert.ok(held, `CONTROL FAILED (would be vacuous): ${name}`);
    controlsRun.push(name);
  };

  const bankSlice = (src: string) => {
    const start = src.indexOf("export const DRILL_BANK");
    return src.slice(start, src.indexOf("\nexport ", start + 10));
  };
  /** One trimmed source line per item literal, in file order. ONE terminal comma is normalised away
   *  on BOTH sides: `wg-09` currently ends the array and carries no comma, so the first Global-G2
   *  addition necessarily gives it one. That is punctuation, not content — control G0-C1c proves the
   *  same normalisation still leaves a one-word content edit different. Nothing else is normalised:
   *  no whitespace, no general punctuation, no property reordering, no string rewriting. */
  const itemLines = (src: string) =>
    bankSlice(src)
      .split("\n")
      .map((line) => line.trim().replace(/,$/, ""))
      .filter((line) => line.startsWith("{ id:"));
  const idOf = (line: string) => (line.match(/^\{ id: "([^"]+)"/) ?? [])[1] ?? "";

  const parentSrc = execSync(`git show ${PRE_G2_EXPANSION}:lib/debate-drills.ts`, { encoding: "utf8" });
  const parentItems = itemLines(parentSrc);
  const currentItems = itemLines(readFileSync("lib/debate-drills.ts", "utf8"));
  assert.equal(parentItems.length, 36, "G0-3. control: the immutable commit really held 36 Debate item literals");
  assert.ok(currentItems.length >= parentItems.length, "G0-3b. the bank never shrank");

  // (a) Every original item survives byte-identical, in its original relative order.
  const currentById = new Map(currentItems.map((line) => [idOf(line), line]));
  for (const parentLine of parentItems) {
    const id = idOf(parentLine);
    assert.equal(currentById.get(id), parentLine,
      `G0-4. original item ${id} is byte-identical to ${PRE_G2_EXPANSION.slice(0, 8)} (id, area, question, choices, answer, explanation)`);
  }
  const parentOrder = parentItems.map(idOf);
  assert.deepEqual(currentItems.map(idOf).filter((id) => parentOrder.includes(id)), parentOrder,
    "G0-5. and the original items keep their original order");

  // (b) The IMMUTABLE prefix -> area registry. These four mappings are facts about the original bank
  //     and never change. Being listed here does NOT authorise additions.
  const PREFIX_AREA: ReadonlyArray<{ idPrefix: string; area: DrillArea }> = [
    { idPrefix: "cw", area: "claim-warrant-impact" },
    { idPrefix: "rb", area: "rebuttal" },
    { idPrefix: "ev", area: "evidence-evaluation" },
    { idPrefix: "wg", area: "weighing" }
  ];
  // (c) The areas CURRENTLY authorised to receive additions. Slice 0 authorises NOTHING. Each later
  //     Global-G2 slice adds exactly ONE area here, in the same commit that adds its 21 items, after
  //     that area's content has passed human review. Never pre-authorise.
  const EXPANDED_AREAS: readonly DrillArea[] = [];
  assert.equal(EXPANDED_AREAS.length, 0,
    "G0-6. Slice 0 authorises NO Debate area for expansion — later slices add exactly one each");

  /** THE single predicate deciding whether an added item literal is permitted. Real additions and
   *  every control below run through THIS function; a control with its own regex would prove nothing
   *  about the rule the bank is actually checked against. `authorised` is a parameter only so a
   *  control can probe structural recognition WITHOUT authorising a real area. */
  type Verdict = { ok: boolean; stage: "prefix" | "range" | "area" | "unauthorised" | "ok"; reason: string };
  const judgeAddition = (id: string, itemLine: string, authorised: readonly DrillArea[] = EXPANDED_AREAS): Verdict => {
    const entry = PREFIX_AREA.find((a) => new RegExp(`^${a.idPrefix}-\\d{2}$`).test(id));
    if (!entry) return { ok: false, stage: "prefix", reason: `no known Debate prefix maps ${id}` };
    if (!(Number(id.slice(3)) > 9)) {
      return { ok: false, stage: "range", reason: `${id} is inside the original 01-09 range, not an addition` };
    }
    if (!new RegExp(`area: "${entry.area}"`).test(itemLine)) {
      return { ok: false, stage: "area", reason: `${id} does not declare the ${entry.area} area its prefix claims` };
    }
    if (!authorised.includes(entry.area)) {
      return { ok: false, stage: "unauthorised", reason: `${entry.area} is not yet authorised for expansion` };
    }
    return { ok: true, stage: "ok", reason: `${id} is an authorised ${entry.area} addition after 09` };
  };

  // (d) Real additions, judged by that predicate. Slice 0 adds none, by design.
  const addedIds = currentItems.map(idOf).filter((id) => !parentOrder.includes(id));
  for (const id of addedIds) {
    const v = judgeAddition(id, currentById.get(id) ?? "");
    assert.ok(v.ok, `G0-7. every added Debate item must be an authorised addition — ${v.reason}`);
  }
  assert.equal(addedIds.length, 0, "G0-7b. Slice 0 added no Debate question content at all");

  // (e) The original nine of every area, called out because later slices append beside them.
  for (const { idPrefix } of PREFIX_AREA) {
    for (let n = 1; n <= 9; n += 1) {
      const id = `${idPrefix}-0${n}`;
      assert.equal(currentById.get(id), parentItems.find((line) => idOf(line) === id), `G0-8. ${id} is unchanged`);
    }
  }

  // ---- Non-vacuous controls. Each rejects the mutation it exists to reject, via judgeAddition. ----
  const sampleParent = parentItems.find((line) => idOf(line) === "rb-01") as string;
  assert.notEqual(sampleParent.replace("rebuttal", "weighing"), sampleParent,
    "G0-C1. control: a one-word edit produces a different line, so G0-4 would catch it");
  // Terminal-comma normalisation must NOT be able to hide a content change.
  const commaOnly = `${sampleParent},`.trim().replace(/,$/, "");
  assert.equal(commaOnly, sampleParent,
    "G0-C1b. control: a literal differing ONLY by one terminal comma normalises back to identical");
  const wordEdit = `${sampleParent.replace("rebuttal", "weighing")},`.trim().replace(/,$/, "");
  assert.notEqual(wordEdit, sampleParent,
    "G0-C1c. control: the SAME normalisation still leaves a one-word content edit different, so it cannot mask one");
  control("terminal-comma normalisation cannot mask a Debate content edit",
    commaOnly === sampleParent && wordEdit !== sampleParent);

  // Structural recognition of all four mappings — helper-level ONLY. Passing an explicit `authorised`
  // list proves the prefix->area map works; it does NOT make any area authorised for real additions.
  for (const { idPrefix, area } of PREFIX_AREA) {
    const v = judgeAddition(`${idPrefix}-10`, `{ id: "${idPrefix}-10", area: "${area}", question: "x" }`, [area]);
    assert.ok(v.ok, `G0-C2. control: ${idPrefix}-10 declaring ${area} IS structurally recognised — ${v.reason}`);
    control(`the Debate registry structurally recognises ${idPrefix} -> ${area}`, v.ok);
  }
  assert.equal(PREFIX_AREA.length, 4, "G0-C2a. control: exactly four immutable Debate prefix->area mappings");

  // Unknown / near-miss prefixes are rejected.
  for (const unknown of ["xx-10", "zz-10", "rbb-10", "r-10", "drill-10"]) {
    const v = judgeAddition(unknown, `{ id: "${unknown}", area: "rebuttal", question: "x" }`, ["rebuttal"]);
    assert.ok(!v.ok && v.stage === "prefix", `G0-C3. control: ${unknown} is rejected — ${v.reason}`);
    control(`the Debate predicate rejects the unknown id ${unknown}`, !v.ok && v.stage === "prefix");
  }

  // Prefix/area mismatch is rejected, in both directions, through the same predicate.
  const mismatchA = judgeAddition("rb-10", '{ id: "rb-10", area: "weighing", question: "x" }', ["rebuttal", "weighing"]);
  assert.ok(!mismatchA.ok && mismatchA.stage === "area",
    `G0-C4. control: rb-10 declaring weighing is rejected — ${mismatchA.reason}`);
  const mismatchB = judgeAddition("wg-10", '{ id: "wg-10", area: "rebuttal", question: "x" }', ["rebuttal", "weighing"]);
  assert.ok(!mismatchB.ok && mismatchB.stage === "area",
    `G0-C4b. control: wg-10 declaring rebuttal is rejected — ${mismatchB.reason}`);
  control("a Debate prefix/area mismatch is rejected in both directions",
    mismatchA.stage === "area" && mismatchB.stage === "area");

  // Original-range ids are never additions, for every prefix.
  for (const original of ["rb-09", "cw-09", "ev-01", "wg-09"]) {
    const v = judgeAddition(original, `{ id: "${original}", area: "rebuttal", question: "x" }`, ["rebuttal"]);
    assert.ok(!v.ok && v.stage === "range", `G0-C5. control: ${original} cannot be treated as an addition — ${v.reason}`);
  }
  control("an original-range Debate id is never accepted as an addition", true);

  // THE Slice 0 control: a structurally VALID future addition is still rejected, because its area has
  // not been authorised. This is what proves Slice 0 did not pre-authorise the later content slices.
  for (const { idPrefix, area } of PREFIX_AREA) {
    const v = judgeAddition(`${idPrefix}-10`, `{ id: "${idPrefix}-10", area: "${area}", question: "x" }`);
    assert.ok(!v.ok && v.stage === "unauthorised",
      `G0-C6. control: ${idPrefix}-10 is a valid FUTURE ${area} addition and is rejected TODAY — ${v.reason}`);
    control(`a valid future ${area} addition is rejected while that area is unauthorised`, v.stage === "unauthorised");
  }

  assert.equal(itemLines('export const DRILL_BANK = [\n{ id: "x-01", area: "rebuttal" },\nexport type X').length, 1,
    "G0-C7. control: the item extractor really parses item literals");

  console.log(`Debate-drills smoke passed: ${DRILL_BANK.length} questions across ${DRILL_AREAS.length} areas at the exact per-area depths AREA_DEPTH declares, integrity + focused sessions + per-skill grading consistent, and every area can reach the ${DEBATE_DRILL_REQUIRED_UNIQUE}-distinct-question evidence floor while repeats count once (bypass 76%->20%, honest padding 85%->67%). CONTENT INTEGRITY (M14 Global G2 Slice 0): the bank is additive-only against the IMMUTABLE commit ${PRE_G2_EXPANSION.slice(0, 8)} — all 36 original items are byte-identical and keep their order, one terminal comma is normalised on both sides for the coming append boundary at wg-09, and additions are permitted only for an area that has been explicitly authorised. ${EXPANDED_AREAS.length} of ${PREFIX_AREA.length} areas are authorised, so a structurally valid future addition such as rb-10 is rejected today. ${controlsRun.length} controls each demonstrated the failure they exist to demonstrate.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
