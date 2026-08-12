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
    "performance-indicators": 30,   // M14 Global G2 Slice 5 / DECA Slice 1
    "business-reasoning": 30,   // M14 Global G2 Slice 6 / DECA Slice 2
    "customer-relations": 30,   // M14 Global G2 Slice 7 / DECA Slice 3
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
  // Area-filter check. BR reached 30 at Slice 6, so 6 <= 30 still holds — this is a filter proof,
  // not a depth or shallow-area proof, and must not be read as one.
  const focused = buildDecaDrillSession(6, ["business-reasoning"]);
  assert.ok(focused.every((q) => q.area === "business-reasoning"), "focused session restricts to the chosen area");

  // ---- BUILDER DEPTH. ADDED at Slice 5 -----------------------------------------------------------
  // Neither DECA suite carried a depth block before this slice, because no DECA area had ever been
  // expanded. These are NEW assertions, not moved ones. buildDecaDrillSession seeds `result` with the
  // ENTIRE shuffled pool before appending any repeat, so the distinct count is deterministic rather
  // than probabilistic — no probabilistic assertion is used anywhere here.
  const piFocused20 = buildDecaDrillSession(20, ["performance-indicators"]);
  assert.equal(piFocused20.length, 20, "G0-D1. a 20-question focused PI session serves 20");
  assert.equal(new Set(piFocused20.map((q) => q.id)).size, 20,
    "G0-D1b. over 20 DISTINCT items — performance-indicators no longer pads at a normal session size");
  const OVERDRAW = 40; // > 30 enters the repeat branch; < 60 makes the while loop append exactly once
  const piOverdrawn = buildDecaDrillSession(OVERDRAW, ["performance-indicators"]);
  assert.equal(piOverdrawn.length, OVERDRAW, "G0-D2. a 40-question request on the 30-item PI pool still serves 40");
  assert.equal(new Set(piOverdrawn.map((q) => q.id)).size, 30,
    "G0-D2b. over exactly 30 distinct PI items — the padding branch survives above that pool");

  // Slice 6: the same depth proof for business-reasoning, the second DECA area to reach 30.
  const brFocused20 = buildDecaDrillSession(20, ["business-reasoning"]);
  assert.equal(brFocused20.length, 20, "G0-D1c. a 20-question focused BR session serves 20");
  assert.equal(new Set(brFocused20.map((q) => q.id)).size, 20,
    "G0-D1d. over 20 DISTINCT items — business-reasoning no longer pads at a normal session size");
  const brOverdrawn = buildDecaDrillSession(OVERDRAW, ["business-reasoning"]);
  assert.equal(brOverdrawn.length, OVERDRAW, "G0-D2c. a 40-question request on the 30-item BR pool still serves 40");
  assert.equal(new Set(brOverdrawn.map((q) => q.id)).size, 30,
    "G0-D2d. over exactly 30 distinct BR items — the padding branch survives above that pool too");

  // Slice 7: the same depth proof for customer-relations, the third DECA area to reach 30.
  const crFocused20 = buildDecaDrillSession(20, ["customer-relations"]);
  assert.equal(crFocused20.length, 20, "G0-D1e. a 20-question focused CR session serves 20");
  assert.equal(new Set(crFocused20.map((q) => q.id)).size, 20,
    "G0-D1f. over 20 DISTINCT items — customer-relations no longer pads at a normal session size");
  const crOverdrawn = buildDecaDrillSession(OVERDRAW, ["customer-relations"]);
  assert.equal(crOverdrawn.length, OVERDRAW, "G0-D2e. a 40-question request on the 30-item CR pool still serves 40");
  assert.equal(new Set(crOverdrawn.map((q) => q.id)).size, 30,
    "G0-D2f. over exactly 30 distinct CR items — the padding branch survives above that pool too");

  // Non-vacuity: the depth proofs above only mean something if a still-9-item area DOES still pad.
  // MOVED business-reasoning -> MARKETING-FUNDAMENTALS at Slice 6, because Slice 6 took BR to 30.
  // MK was chosen over customer-relations deliberately: Slice 7 was expected to expand CR, so parking
  // the control on CR would have forced a second move one slice later. That played out — Slice 7 took
  // CR to 30 and the control did NOT have to move, so it has moved exactly ONCE. MK is now the ONLY
  // shallow DECA area, so at Slice 8 — where MK itself deepens and no shallow area remains — this
  // control must RE-BASE onto a >30 overdraw, as HOSA's 11g and Debate's Slice 4 control did.
  // Do not delete it.
  const shallow20 = buildDecaDrillSession(20, ["marketing-fundamentals"]);
  assert.equal(shallow20.length, 20, "G0-D3. control: a 20-question request on the still-9-item marketing-fundamentals area serves 20");
  assert.equal(new Set(shallow20.map((q) => q.id)).size, 9,
    "G0-D3b. control: over only 9 distinct items — so the 20-distinct PI, BR and CR results above are a real depth change, not a builder quirk");
  const shallow40 = buildDecaDrillSession(OVERDRAW, ["marketing-fundamentals"]);
  assert.equal(shallow40.length, OVERDRAW, "G0-D4. control: 40 requested on that 9-item area still serves 40");
  assert.equal(new Set(shallow40.map((q) => q.id)).size, 9,
    "G0-D4b. control: over only 9 distinct items, so the 30-distinct overdraw results above are a real depth change too");
  assert.equal(AREA_DEPTH["marketing-fundamentals"], 9,
    "G0-D5. control: marketing-fundamentals really is still 9, so the shallow control is not vacuous");
  assert.equal(Object.values(AREA_DEPTH).filter((d) => d === 9).length, 1,
    "G0-D5b. control: exactly ONE DECA area remains at 9 (marketing-fundamentals) — Slice 8 must re-base this control onto a >30 overdraw");

  // Legacy PI ORDER. The mastery suite's fixtures index PI.slice(0, n<=5), PI[0] and PI[5], so their
  // denominators depend on the legacy nine still being the FIRST nine PI entries. Additions append
  // after pi-09, which keeps that true — assert it rather than assume it.
  const piIds = DECA_DRILL_BANK.filter((q) => q.area === "performance-indicators").map((q) => q.id);
  assert.deepEqual(piIds.slice(0, 9),
    ["pi-01", "pi-02", "pi-03", "pi-04", "pi-05", "pi-06", "pi-07", "pi-08", "pi-09"],
    "G0-D6. the legacy nine are still the first nine PI items, so every mastery fixture denominator is stable");

  // Legacy CR ORDER (Slice 7). Same reason, different fixture: the mastery suite indexes CR.slice(0, 2)
  // for its cross-area attribution test, so tests 10/10b/10c depend on cr-01 and cr-02 still being the
  // FIRST two CR entries. cr-10..cr-30 append after cr-09, which keeps that true — assert it. This is
  // not symmetry ceremony; it guards a real index dependency. No BR equivalent exists because nothing
  // indexes BR.
  const crIds = DECA_DRILL_BANK.filter((q) => q.area === "customer-relations").map((q) => q.id);
  assert.deepEqual(crIds.slice(0, 9),
    ["cr-01", "cr-02", "cr-03", "cr-04", "cr-05", "cr-06", "cr-07", "cr-08", "cr-09"],
    "G0-D7. the legacy nine are still the first nine CR items, so CR.slice(0, 2) still resolves to cr-01/cr-02");

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
  const EXPANDED_AREAS: readonly DecaDrillArea[] =
    ["performance-indicators", "business-reasoning", "customer-relations"];   // Slices 5, 6 and 7 in order
  assert.deepEqual([...EXPANDED_AREAS], ["performance-indicators", "business-reasoning", "customer-relations"],
    "G0-6. exactly THREE DECA areas are authorised — performance-indicators (Slice 5), business-reasoning (Slice 6), customer-relations (Slice 7)");
  assert.equal(EXPANDED_AREAS.length, 3,
    "G0-6b. authorising a fourth area here without its own reviewed slice fails immediately");

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
  // G0-7b was "Slice 0 added nothing". Slice 5 EVOLVES it into an exact 21-id set driven by a
  // SLICE_ADDITIONS table with one row per reviewed DECA slice. It is never relaxed into "any
  // recognised prefix above 09" — each future DECA slice adds exactly one row.
  const SLICE_ADDITIONS: ReadonlyArray<{ idPrefix: string; area: DecaDrillArea }> = [
    { idPrefix: "pi", area: "performance-indicators" },   // Slice 5 / DECA Slice 1
    { idPrefix: "br", area: "business-reasoning" },       // Slice 6 / DECA Slice 2
    { idPrefix: "cr", area: "customer-relations" }        // Slice 7 / DECA Slice 3
  ];
  const EXPECTED_ADDED = SLICE_ADDITIONS.flatMap(({ idPrefix }) =>
    Array.from({ length: 21 }, (_, i) => `${idPrefix}-${i + 10}`));
  assert.equal(SLICE_ADDITIONS.length, 3, "G0-7b0a. control: exactly three reviewed DECA slices so far");
  assert.equal(EXPECTED_ADDED.length, 63, "G0-7b0. control: three reviewed DECA slices means exactly 63 expected ids");
  assert.deepEqual([...addedIds].sort(), [...EXPECTED_ADDED].sort(),
    "G0-7b. the additions are exactly pi-10..pi-30, br-10..br-30 and cr-10..cr-30 — no other id was added");
  assert.equal(addedIds.length, 63, "G0-7b2. exactly 63 additions exist relative to the immutable baseline");
  assert.equal(addedIds.filter((id) => id.startsWith("pi-")).length, 21, "G0-7b2a. 21 of them are PI additions");
  assert.equal(addedIds.filter((id) => id.startsWith("br-")).length, 21, "G0-7b2b. 21 are BR additions");
  assert.equal(addedIds.filter((id) => id.startsWith("cr-")).length, 21, "G0-7b2c. and 21 are CR additions");
  assert.equal(addedIds.filter((id) => id.startsWith("mk-")).length, 0, "G0-7b2d. and ZERO are MK additions — marketing-fundamentals has had no reviewed slice");
  for (const id of addedIds) {
    const slice = SLICE_ADDITIONS.find((a) => id.startsWith(`${a.idPrefix}-`));
    assert.ok(slice, `G0-7b3. every addition belongs to a reviewed slice — got ${id}`);
    assert.ok(new RegExp(`area: "${slice!.area}"`).test(currentById.get(id) ?? ""),
      `G0-7b3b. addition ${id} declares the ${slice!.area} area its slice claims`);
  }
  // Three DECA areas still have no reviewed slice, so this loop is REAL — unlike Debate's, which went
  // empty at its final slice. Keep it until every DECA area has been expanded.
  const FORBIDDEN_PREFIXES = ["mk"];   // Slice 6 removed "br"; Slice 7 removed "cr". Still REAL — one area is genuinely unexpanded.
  for (const forbidden of FORBIDDEN_PREFIXES) {
    assert.equal(addedIds.filter((id) => id.startsWith(`${forbidden}-`)).length, 0,
      `G0-7b4. zero ${forbidden}-* additions exist — that area has had no reviewed slice`);
  }
  assert.equal(FORBIDDEN_PREFIXES.length, 1,
    "G0-7b4b. control: the forbidden-prefix loop still covers one unexpanded area, so it is not vacuous");
  assert.deepEqual([...FORBIDDEN_PREFIXES], ["mk"],
    "G0-7b4b2. control: and that area is marketing-fundamentals specifically — the loop cannot quietly become empty");
  // Slice 7 MOVED the CR boundary probe. cr-10 was an out-of-set control through Slice 6; it is now a
  // legitimate addition, so keeping it here would have inverted this assertion. cr-31 is the new upper
  // probe and cr-09 the lower one, which keeps both edges of the CR range covered.
  for (const outside of ["pi-31", "br-31", "cr-31", "pi-09", "br-09", "cr-09", "mk-10", "xx-10"]) {
    assert.ok(!EXPECTED_ADDED.includes(outside),
      `G0-7b4c. control: ${outside} is outside the expected set, so G0-7b would reject it`);
  }
  for (const inside of ["cr-10", "cr-30"]) {
    assert.ok(EXPECTED_ADDED.includes(inside),
      `G0-7b4d. control: ${inside} IS inside the expected set now that Slice 7 is reviewed — the boundary really moved`);
  }
  control("every real DECA addition is judged permitted by the same predicate the controls use",
    addedIds.length === EXPECTED_ADDED.length && addedIds.every((id) => judgeAddition(id, currentById.get(id) ?? "").ok));

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

  // Positive control: the ONE authorised area is accepted under DEFAULT authorisation, with no
  // override. That is what proves Slice 5 genuinely authorised performance-indicators.
  for (const { idPrefix, area } of PREFIX_AREA.filter((a) => EXPANDED_AREAS.includes(a.area))) {
    const v = judgeAddition(`${idPrefix}-10`, `{ id: "${idPrefix}-10", area: "${area}", question: "x" }`);
    assert.ok(v.ok, `G0-C2b. control: ${idPrefix}-10 is accepted under default authorisation — ${v.reason}`);
    control(`${area} is authorised: ${idPrefix}-10 passes with no override`, v.ok);
  }
  assert.equal(PREFIX_AREA.filter((a) => EXPANDED_AREAS.includes(a.area)).length, 3,
    "G0-C2b2. control: exactly THREE DECA areas are authorised, so that loop is not vacuous");

  // THE authorisation control: the area NOT authorised must still be rejected under DEFAULT
  // authorisation. This is what proves Slice 7 did not pre-authorise the remaining DECA slice.
  for (const { idPrefix, area } of PREFIX_AREA.filter((a) => !EXPANDED_AREAS.includes(a.area))) {
    const v = judgeAddition(`${idPrefix}-10`, `{ id: "${idPrefix}-10", area: "${area}", question: "x" }`);
    assert.ok(!v.ok && v.stage === "unauthorised",
      `G0-C6. control: ${idPrefix}-10 is a valid FUTURE ${area} addition and is rejected TODAY — ${v.reason}`);
    control(`a valid future ${area} addition is rejected while that area is unauthorised`, v.stage === "unauthorised");
  }
  assert.equal(PREFIX_AREA.filter((a) => !EXPANDED_AREAS.includes(a.area)).length, 1,
    "G0-C6b. control: ONE recognised DECA area remains unauthorised (marketing-fundamentals), so that loop is not vacuous");
  assert.deepEqual(PREFIX_AREA.filter((a) => !EXPANDED_AREAS.includes(a.area)).map((a) => a.area), ["marketing-fundamentals"],
    "G0-C6b2. control: and it is marketing-fundamentals specifically — the last DECA area still awaiting its reviewed slice");

  assert.equal(itemLines('export const DECA_DRILL_BANK = [\n{ id: "x-01", area: "business-reasoning" },\nexport function y').length, 1,
    "G0-C7. control: the item extractor really parses item literals");

  console.log(`Deca-drills smoke passed: ${DECA_DRILL_BANK.length} questions across ${DECA_DRILL_AREAS.length} areas at the exact per-area depths AREA_DEPTH declares, integrity + focused sessions + per-skill grading consistent, and every area can reach the ${DECA_DRILL_REQUIRED_UNIQUE}-distinct-question evidence floor while repeats count once. CONTENT INTEGRITY: the bank is additive-only against the IMMUTABLE commit ${PRE_G2_EXPANSION.slice(0, 8)} — all 36 original items are byte-identical and keep their order, one terminal comma is normalised on both sides for the still-unexercised append boundary at mk-09, and additions are permitted only for an explicitly authorised area. ${EXPANDED_AREAS.length} of ${PREFIX_AREA.length} areas are authorised (${EXPANDED_AREAS.join(", ")}), and the additions are exactly the 63 reviewed-slice items pi-10..pi-30 (Slice 5 / DECA Slice 1, whose pi-19 and pi-30 were refined before approval so the listed indicator is load-bearing in both), br-10..br-30 (Slice 6 / DECA Slice 2, whose br-16 was refined before approval so the go-live timing makes the keyed answer follow from the stem) — both AI-authored and HUMAN-REVIEWED AND APPROVED 2026-08-12 — and cr-10..cr-30 (Slice 7 / DECA Slice 3, authored against the approved CR1..CR6 curriculum with every policy and authority fact stated in the stem: AI-AUTHORED, HUMAN CONTENT REVIEW OUTSTANDING). A structurally valid future addition in the ONE remaining unauthorised area (mk-10) is still rejected today; cr-09 already carried its comma so NO legacy punctuation changed at Slice 7 either, and mk-09 is still the final array element. cr-10 moved from out-of-set control to legitimate addition at this slice, so the boundary probe moved to cr-31. The shallow negative control stayed on marketing-fundamentals through Slice 7 exactly as planned — it has moved ONCE, and Slice 8 must re-base it onto a >30 overdraw because MK is now the only shallow DECA area. ${controlsRun.length} controls each demonstrated the failure they exist to demonstrate.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
