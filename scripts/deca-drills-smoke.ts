/**
 * DECA concept-drill bank integrity + grading consistency. Pure, no DB, no provider.
 * Run with: npm run deca-drills:smoke
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  DECA_DRILL_AREAS,
  DECA_DRILL_BANK,
  DECA_DRILL_REQUIRED_UNIQUE,
  buildDecaDrillEvidence,
  buildDecaDrillSession,
  gradeDecaDrillAnswers,
  type DecaDrillArea
} from "../lib/deca-drills";

async function main() {
  // EXACT composition, not a `>= 32` floor. A floor cannot notice a bank rewritten in place, and
  // audit G2 asks for real per-area depth assertions. AREA_DEPTH is the single source of truth: a
  // Global-G2 slice raises exactly ONE entry 9 -> 30 and every assertion below follows.
  const AREA_DEPTH: Record<DecaDrillArea, number> = {
    "performance-indicators": 9,
    "business-reasoning": 9,
    "customer-relations": 9,
    "marketing-fundamentals": 9
  };
  const EXPECTED_TOTAL = Object.values(AREA_DEPTH).reduce((a, b) => a + b, 0);
  assert.equal(DECA_DRILL_BANK.length, EXPECTED_TOTAL, `G0-1. the DECA bank holds exactly ${EXPECTED_TOTAL} questions`);
  assert.equal(new Set(DECA_DRILL_BANK.map((q) => q.id)).size, EXPECTED_TOTAL, "G0-1b. with unique ids");
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
    assert.equal(areaCounts.get(area.id) ?? 0, AREA_DEPTH[area.id],
      `G0-2. area ${area.id} holds exactly ${AREA_DEPTH[area.id]} questions`);
    assert.ok(area.skillSlug.startsWith("deca-"), `area ${area.id} must map to a DECA skill`);
  }
  assert.equal(DECA_DRILL_AREAS.length, Object.keys(AREA_DEPTH).length,
    "G0-2b. AREA_DEPTH covers every declared area — it cannot drift from the bank");

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

  // Every area's bank must be able to REACH the evidence floor, or that skill could never be
  // recorded at all — including marketing-fundamentals, the one area already seeded.
  for (const area of DECA_DRILL_AREAS) {
    const pool = DECA_DRILL_BANK.filter((q) => q.area === area.id);
    assert.ok(pool.length >= DECA_DRILL_REQUIRED_UNIQUE,
      `area ${area.id} has fewer than ${DECA_DRILL_REQUIRED_UNIQUE} distinct questions, so it could never qualify`);
    const evidence = buildDecaDrillEvidence(pool.slice(0, DECA_DRILL_REQUIRED_UNIQUE).map((q) => ({ id: q.id, selected: q.correctAnswer })));
    assert.equal(evidence[0]?.evidenceStatus, "passing", `area ${area.id} reaches passing evidence at the floor`);
    assert.equal(evidence[0]?.skillSlug, area.skillSlug, `area ${area.id} maps to ${area.skillSlug}`);
  }

  // The raw session grader keeps reporting the LEARNER'S session; the evidence set does not.
  const repeated = [q0, q0, q0].map((q) => ({ id: q.id, selected: q.correctAnswer }));
  assert.equal(gradeDecaDrillAnswers(repeated).total, 3, "the session grader still counts every answer");
  assert.equal(buildDecaDrillEvidence(repeated)[0].uniqueTotal, 1, "but the evidence set counts the question once");

  // ================= ADDITIVE-INTEGRITY MODEL — M14 Global G2 Slice 0 =============================
  // Before this slice the DECA bank had NO content protection: a `>= 32` length floor and a per-area
  // `>= 6` floor, both satisfied by a full in-place rewrite. Two suites also carried `git show HEAD:`
  // byte hashes over lib/deca-drills.ts. A HEAD-relative hash fails while an authorised change is
  // uncommitted and passes the instant it commits — a "nothing is uncommitted" check, not content
  // protection. Replaced here by the model proven on the HOSA bank (31f*).
  //
  // NEVER make this HEAD-relative, and never re-anchor it. It names the deployed pre-expansion bank.
  const PRE_G2_EXPANSION = "26149a3127c0bc7f3108c303f57d41a8dd9088c0";

  const controlsRun: string[] = [];
  const control = (name: string, held: boolean) => {
    assert.ok(held, `CONTROL FAILED (would be vacuous): ${name}`);
    controlsRun.push(name);
  };

  const bankSlice = (src: string) => {
    const start = src.indexOf("export const DECA_DRILL_BANK");
    return src.slice(start, src.indexOf("\nexport ", start + 10));
  };
  /** One trimmed source line per item literal, in file order. ONE terminal comma is normalised away
   *  on BOTH sides: `mk-09` currently ends the array and carries no comma, so the first Global-G2
   *  addition necessarily gives it one. That is punctuation, not content — control G0-C1c proves the
   *  same normalisation still leaves a one-word content edit different. Nothing else is normalised. */
  const itemLines = (src: string) =>
    bankSlice(src)
      .split("\n")
      .map((line) => line.trim().replace(/,$/, ""))
      .filter((line) => line.startsWith("{ id:"));
  const idOf = (line: string) => (line.match(/^\{ id: "([^"]+)"/) ?? [])[1] ?? "";

  const parentSrc = execSync(`git show ${PRE_G2_EXPANSION}:lib/deca-drills.ts`, { encoding: "utf8" });
  const parentItems = itemLines(parentSrc);
  const currentItems = itemLines(readFileSync("lib/deca-drills.ts", "utf8"));
  assert.equal(parentItems.length, 36, "G0-3. control: the immutable commit really held 36 DECA item literals");
  assert.ok(currentItems.length >= parentItems.length, "G0-3b. the bank never shrank");

  const currentById = new Map(currentItems.map((line) => [idOf(line), line]));
  for (const parentLine of parentItems) {
    const id = idOf(parentLine);
    assert.equal(currentById.get(id), parentLine,
      `G0-4. original item ${id} is byte-identical to ${PRE_G2_EXPANSION.slice(0, 8)} (id, area, question, choices, answer, explanation)`);
  }
  const parentOrder = parentItems.map(idOf);
  assert.deepEqual(currentItems.map(idOf).filter((id) => parentOrder.includes(id)), parentOrder,
    "G0-5. and the original items keep their original order");

  // The IMMUTABLE prefix -> area registry. Listing does NOT authorise additions.
  const PREFIX_AREA: ReadonlyArray<{ idPrefix: string; area: DecaDrillArea }> = [
    { idPrefix: "pi", area: "performance-indicators" },
    { idPrefix: "br", area: "business-reasoning" },
    { idPrefix: "cr", area: "customer-relations" },
    { idPrefix: "mk", area: "marketing-fundamentals" }
  ];
  // Areas CURRENTLY authorised to receive additions. Slice 0 authorises NOTHING. Each later slice
  // adds exactly ONE area here, in the commit that adds its 21 items, after human content review.
  const EXPANDED_AREAS: readonly DecaDrillArea[] = [];
  assert.equal(EXPANDED_AREAS.length, 0,
    "G0-6. Slice 0 authorises NO DECA area for expansion — later slices add exactly one each");

  /** THE single predicate. Real additions and every control run through it. `authorised` is a
   *  parameter only so a control can probe structural recognition WITHOUT authorising a real area. */
  type Verdict = { ok: boolean; stage: "prefix" | "range" | "area" | "unauthorised" | "ok"; reason: string };
  const judgeAddition = (id: string, itemLine: string, authorised: readonly DecaDrillArea[] = EXPANDED_AREAS): Verdict => {
    const entry = PREFIX_AREA.find((a) => new RegExp(`^${a.idPrefix}-\\d{2}$`).test(id));
    if (!entry) return { ok: false, stage: "prefix", reason: `no known DECA prefix maps ${id}` };
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

  const addedIds = currentItems.map(idOf).filter((id) => !parentOrder.includes(id));
  for (const id of addedIds) {
    const v = judgeAddition(id, currentById.get(id) ?? "");
    assert.ok(v.ok, `G0-7. every added DECA item must be an authorised addition — ${v.reason}`);
  }
  assert.equal(addedIds.length, 0, "G0-7b. Slice 0 added no DECA question content at all");

  for (const { idPrefix } of PREFIX_AREA) {
    for (let n = 1; n <= 9; n += 1) {
      const id = `${idPrefix}-0${n}`;
      assert.equal(currentById.get(id), parentItems.find((line) => idOf(line) === id), `G0-8. ${id} is unchanged`);
    }
  }

  // ---- Non-vacuous controls, all through judgeAddition ----
  const sampleParent = parentItems.find((line) => idOf(line) === "pi-01") as string;
  assert.notEqual(sampleParent.replace("performance", "marketing"), sampleParent,
    "G0-C1. control: a one-word edit produces a different line, so G0-4 would catch it");
  const commaOnly = `${sampleParent},`.trim().replace(/,$/, "");
  assert.equal(commaOnly, sampleParent,
    "G0-C1b. control: a literal differing ONLY by one terminal comma normalises back to identical");
  const wordEdit = `${sampleParent.replace("performance", "marketing")},`.trim().replace(/,$/, "");
  assert.notEqual(wordEdit, sampleParent,
    "G0-C1c. control: the SAME normalisation still leaves a one-word content edit different, so it cannot mask one");
  control("terminal-comma normalisation cannot mask a DECA content edit",
    commaOnly === sampleParent && wordEdit !== sampleParent);

  for (const { idPrefix, area } of PREFIX_AREA) {
    const v = judgeAddition(`${idPrefix}-10`, `{ id: "${idPrefix}-10", area: "${area}", question: "x" }`, [area]);
    assert.ok(v.ok, `G0-C2. control: ${idPrefix}-10 declaring ${area} IS structurally recognised — ${v.reason}`);
    control(`the DECA registry structurally recognises ${idPrefix} -> ${area}`, v.ok);
  }
  assert.equal(PREFIX_AREA.length, 4, "G0-C2a. control: exactly four immutable DECA prefix->area mappings");

  for (const unknown of ["xx-10", "zz-10", "mkk-10", "m-10", "drill-10"]) {
    const v = judgeAddition(unknown, `{ id: "${unknown}", area: "marketing-fundamentals", question: "x" }`, ["marketing-fundamentals"]);
    assert.ok(!v.ok && v.stage === "prefix", `G0-C3. control: ${unknown} is rejected — ${v.reason}`);
    control(`the DECA predicate rejects the unknown id ${unknown}`, !v.ok && v.stage === "prefix");
  }

  const mismatchA = judgeAddition("pi-10", '{ id: "pi-10", area: "customer-relations", question: "x" }', ["performance-indicators", "customer-relations"]);
  assert.ok(!mismatchA.ok && mismatchA.stage === "area",
    `G0-C4. control: pi-10 declaring customer-relations is rejected — ${mismatchA.reason}`);
  const mismatchB = judgeAddition("cr-10", '{ id: "cr-10", area: "performance-indicators", question: "x" }', ["performance-indicators", "customer-relations"]);
  assert.ok(!mismatchB.ok && mismatchB.stage === "area",
    `G0-C4b. control: cr-10 declaring performance-indicators is rejected — ${mismatchB.reason}`);
  control("a DECA prefix/area mismatch is rejected in both directions",
    mismatchA.stage === "area" && mismatchB.stage === "area");

  for (const original of ["pi-09", "br-09", "cr-01", "mk-09"]) {
    const v = judgeAddition(original, `{ id: "${original}", area: "performance-indicators", question: "x" }`, ["performance-indicators"]);
    assert.ok(!v.ok && v.stage === "range", `G0-C5. control: ${original} cannot be treated as an addition — ${v.reason}`);
  }
  control("an original-range DECA id is never accepted as an addition", true);

  // THE Slice 0 control: a structurally VALID future addition is rejected because its area is not authorised.
  for (const { idPrefix, area } of PREFIX_AREA) {
    const v = judgeAddition(`${idPrefix}-10`, `{ id: "${idPrefix}-10", area: "${area}", question: "x" }`);
    assert.ok(!v.ok && v.stage === "unauthorised",
      `G0-C6. control: ${idPrefix}-10 is a valid FUTURE ${area} addition and is rejected TODAY — ${v.reason}`);
    control(`a valid future ${area} addition is rejected while that area is unauthorised`, v.stage === "unauthorised");
  }

  assert.equal(itemLines('export const DECA_DRILL_BANK = [\n{ id: "x-01", area: "business-reasoning" },\nexport function y').length, 1,
    "G0-C7. control: the item extractor really parses item literals");

  console.log(`Deca-drills smoke passed: ${DECA_DRILL_BANK.length} questions across ${DECA_DRILL_AREAS.length} areas at the exact per-area depths AREA_DEPTH declares, integrity + focused sessions + per-skill grading consistent, and every area can reach the ${DECA_DRILL_REQUIRED_UNIQUE}-distinct-question evidence floor while repeats count once. CONTENT INTEGRITY (M14 Global G2 Slice 0): the bank is additive-only against the IMMUTABLE commit ${PRE_G2_EXPANSION.slice(0, 8)} — all 36 original items are byte-identical and keep their order, one terminal comma is normalised on both sides for the coming append boundary at mk-09, and additions are permitted only for an explicitly authorised area. ${EXPANDED_AREAS.length} of ${PREFIX_AREA.length} areas are authorised, so a structurally valid future addition such as pi-10 is rejected today. ${controlsRun.length} controls each demonstrated the failure they exist to demonstrate.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
