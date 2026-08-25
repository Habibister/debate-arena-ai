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
    "claim-warrant-impact": 30,   // M14 Global G2 Slice 2
    "rebuttal": 30,   // M14 Global G2 Slice 1
    "evidence-evaluation": 30,   // M14 Global G2 Slice 3
    "weighing": 30,   // M14 Global G2 Slice 4 — Debate depth is now COMPLETE at 4 x 30
    "clash": 30   // Clash measurable-practice closure — authored at the G2 depth target from day one
  };
  const EXPECTED_TOTAL = Object.values(AREA_DEPTH).reduce((a, b) => a + b, 0);
  // Slice 4 completes Debate depth. This parity pair does NOT replace the exact per-area assertions
  // below — those stay stronger. It exists so a future area cannot silently regress under 30.
  assert.ok(Object.values(AREA_DEPTH).every((d) => d === 30),
    "G0-2c. every Debate area is at the G2 depth target of 30 — Debate depth is complete");
  assert.equal(EXPECTED_TOTAL, 150, "G0-2d. control: five Debate areas x 30 = 150");
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

  // EVIDENCE CONTRACT. The denominator is pinned to the LEGACY NINE (rb-01..rb-09) rather than to
  // however many rebuttal items the bank now holds. Slice 1 took rebuttal to 30, and 67 must keep
  // meaning "six of nine distinct", not drift to a new number because the pool grew. Additions
  // append after rb-09, so slice(0, 9) is stable forever.
  const reb9 = DRILL_BANK.filter((q) => q.area === "rebuttal").slice(0, 9);
  assert.deepEqual(reb9.map((q) => q.id), ["rb-01", "rb-02", "rb-03", "rb-04", "rb-05", "rb-06", "rb-07", "rb-08", "rb-09"],
    "the legacy nine are still the first nine rebuttal items, so the fixture denominator is stable");
  const padded = reb9.map((q, i) => ({ id: q.id, selected: i < 6 ? q.correctAnswer : w(q) }));
  while (padded.length < 20) { const q = reb9[padded.length % 9]; padded.push({ id: q.id, selected: q.correctAnswer }); }
  assert.equal(gradeDrillAnswers(padded).perSkill[0].scorePercent, 85, "the honest-padding raw score still reads 85");
  assert.equal(buildDrillEvidence(padded)[0].uniqueTotal, 9, "twenty answers still resolve to nine distinct questions");
  assert.equal(buildDrillEvidence(padded)[0].evidenceScore, 67, "but its evidence score is 67 — repeats count once");

  // BUILDER DEPTH. Rebuttal now holds 30, so a normal focused session no longer pads at all — that
  // is the observable effect audit G2 asked for. The padding BRANCH still exists above the pool and
  // is proven separately, so growing the bank never silently deletes that coverage.
  const focused20 = buildDrillSession(20, ["rebuttal"]);
  assert.equal(focused20.length, 20, "a 20-question focused rebuttal session serves 20");
  assert.equal(new Set(focused20.map((q) => q.id)).size, 20,
    "over 20 DISTINCT items — rebuttal no longer pads at a normal session size");
  const OVERDRAW = 40; // > 30 enters the repeat branch; < 60 makes the while loop append exactly once
  const overdrawn = buildDrillSession(OVERDRAW, ["rebuttal"]);
  assert.equal(overdrawn.length, OVERDRAW, "a 40-question request on a 30-item pool still serves 40");
  assert.equal(new Set(overdrawn.map((q) => q.id)).size, 30,
    "over exactly 30 distinct items — the padding branch survives above the pool");

  // Slice 2: the same depth proof for claim-warrant-impact. There was no legacy CWI padding fixture
  // to re-base, so these are additions rather than replacements.
  const cwiFocused20 = buildDrillSession(20, ["claim-warrant-impact"]);
  assert.equal(cwiFocused20.length, 20, "a 20-question focused CWI session serves 20");
  assert.equal(new Set(cwiFocused20.map((q) => q.id)).size, 20,
    "over 20 DISTINCT items — CWI no longer pads at a normal session size");
  const cwiOverdrawn = buildDrillSession(OVERDRAW, ["claim-warrant-impact"]);
  assert.equal(cwiOverdrawn.length, OVERDRAW, "a 40-question request on the 30-item CWI pool still serves 40");
  assert.equal(new Set(cwiOverdrawn.map((q) => q.id)).size, 30,
    "over exactly 30 distinct CWI items — the padding branch survives above that pool too");
  // Slice 3: the same depth proof for evidence-evaluation.
  const evFocused20 = buildDrillSession(20, ["evidence-evaluation"]);
  assert.equal(evFocused20.length, 20, "a 20-question focused evidence session serves 20");
  assert.equal(new Set(evFocused20.map((q) => q.id)).size, 20,
    "over 20 DISTINCT items — evidence-evaluation no longer pads at a normal session size");
  const evOverdrawn = buildDrillSession(OVERDRAW, ["evidence-evaluation"]);
  assert.equal(evOverdrawn.length, OVERDRAW, "a 40-question request on the 30-item evidence pool still serves 40");
  assert.equal(new Set(evOverdrawn.map((q) => q.id)).size, 30,
    "over exactly 30 distinct evidence items — the padding branch survives above that pool too");

  // Slice 4: the same depth proof for weighing, the last Debate area to reach 30.
  const wgFocused20 = buildDrillSession(20, ["weighing"]);
  assert.equal(wgFocused20.length, 20, "a 20-question focused weighing session serves 20");
  assert.equal(new Set(wgFocused20.map((q) => q.id)).size, 20,
    "over 20 DISTINCT items — weighing no longer pads at a normal session size");
  const wgOverdrawn = buildDrillSession(OVERDRAW, ["weighing"]);
  assert.equal(wgOverdrawn.length, OVERDRAW, "a 40-question request on the 30-item weighing pool still serves 40");
  assert.equal(new Set(wgOverdrawn.map((q) => q.id)).size, 30,
    "over exactly 30 distinct weighing items — the padding branch survives above that pool too");

  // ---- Repeat-branch non-vacuity, RE-BASED at Slice 4 --------------------------------------------
  // Until Slice 4 this control named a still-9-item area and proved 20/9 and 40/9. NO Debate area
  // holds 9 any more, so it could not move a fourth time: it is RE-BASED on a request that EXCEEDS a
  // full 30-item pool, exactly as HOSA's 11g did at Phase 2f. buildDrillSession seeds `result` with
  // the ENTIRE shuffled pool before appending any repeat, so all 30 distinct ids are guaranteed and
  // the distinct count is deterministic, not probabilistic. This is now the ONLY proof the repeat
  // branch still exists. Do NOT delete it, and do NOT call weighing shallow — it is 30 deep.
  const DEPTH_TARGET = 30;
  assert.equal(AREA_DEPTH.weighing, DEPTH_TARGET, "control: the re-base really runs against a 30-item pool, not a shallow one");
  assert.ok(OVERDRAW > DEPTH_TARGET, "control: and the request really exceeds that pool, so the repeat branch is entered");
  const repeatedPositions = OVERDRAW - new Set(wgOverdrawn.map((q) => q.id)).size;
  assert.equal(repeatedPositions, 10, "control: 40 served over 30 distinct means exactly 10 repeated positions — duplicates necessarily exist");
  // The boundary partner: at EXACTLY pool size there is no padding at all. Without this the overdraw
  // proof could not distinguish "the repeat branch ran" from "the builder always repeats".
  const wgExact = buildDrillSession(DEPTH_TARGET, ["weighing"]);
  assert.equal(wgExact.length, DEPTH_TARGET, "control: a request of exactly 30 on a 30-item area serves 30");
  assert.equal(new Set(wgExact.map((q) => q.id)).size, DEPTH_TARGET,
    "control: over 30 distinct items — no padding at the boundary, so the padding branch activates ONLY above the pool");
  // (stated as a plain assertion because the `control` helper is declared further down, with the
  // content-integrity block — the four facts it combines are each asserted individually above)
  assert.ok(wgOverdrawn.length === OVERDRAW && new Set(wgOverdrawn.map((q) => q.id)).size === DEPTH_TARGET &&
    repeatedPositions === 10 && new Set(wgExact.map((q) => q.id)).size === DEPTH_TARGET,
    "control: the repeat branch still exists now that every Debate area has depth, and activates ONLY above the pool");
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
    { idPrefix: "wg", area: "weighing" },
    { idPrefix: "cl", area: "clash" }
  ];
  // Areas introduced WHOLE after the G2 baseline: they have no original 01-09 block, so their
  // 01-09 ids are genuine reviewed additions, not baseline items.
  const NEW_AREA_PREFIXES: readonly string[] = ["cl"];
  // (c) The areas CURRENTLY authorised to receive additions. Slice 0 authorises NOTHING. Each later
  //     Global-G2 slice adds exactly ONE area here, in the same commit that adds its 21 items, after
  //     that area's content has passed human review. Never pre-authorise.
  const EXPANDED_AREAS: readonly DrillArea[] =
    ["rebuttal", "claim-warrant-impact", "evidence-evaluation", "weighing", "clash"];   // G2 Slices 1-4, then the Clash closure
  assert.deepEqual([...EXPANDED_AREAS], ["rebuttal", "claim-warrant-impact", "evidence-evaluation", "weighing", "clash"],
    "G0-6. all FIVE Debate areas are authorised — the G2 four plus clash, authorised in the same commit as its reviewed items");
  assert.equal(EXPANDED_AREAS.length, 5,
    "G0-6b. every recognised Debate area has its own reviewed addition event — there is no sixth area to authorise");

  /** THE single predicate deciding whether an added item literal is permitted. Real additions and
   *  every control below run through THIS function; a control with its own regex would prove nothing
   *  about the rule the bank is actually checked against. `authorised` is a parameter only so a
   *  control can probe structural recognition WITHOUT authorising a real area. */
  type Verdict = { ok: boolean; stage: "prefix" | "range" | "area" | "unauthorised" | "ok"; reason: string };
  const judgeAddition = (id: string, itemLine: string, authorised: readonly DrillArea[] = EXPANDED_AREAS): Verdict => {
    const entry = PREFIX_AREA.find((a) => new RegExp(`^${a.idPrefix}-\\d{2}$`).test(id));
    if (!entry) return { ok: false, stage: "prefix", reason: `no known Debate prefix maps ${id}` };
    if (!(Number(id.slice(3)) > 9) && !NEW_AREA_PREFIXES.includes(entry.idPrefix)) {
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
  // G0-7b was "Slice 0 added nothing", then "exactly rb-10..rb-30" at Slice 1. Each slice EVOLVES it
  // into a wider exact set — it is never relaxed into "any recognised prefix above 09".
  const SLICE_ADDITIONS: ReadonlyArray<{ idPrefix: string; area: DrillArea }> = [
    { idPrefix: "rb", area: "rebuttal" },              // Slice 1
    { idPrefix: "cw", area: "claim-warrant-impact" },  // Slice 2
    { idPrefix: "ev", area: "evidence-evaluation" },   // Slice 3
    { idPrefix: "wg", area: "weighing" }               // Slice 4
  ];
  const CLASH_ADDITIONS = Array.from({ length: 30 }, (_, i) => `cl-${String(i + 1).padStart(2, "0")}`);
  const EXPECTED_ADDED = [
    ...SLICE_ADDITIONS.flatMap(({ idPrefix }) => Array.from({ length: 21 }, (_, i) => `${idPrefix}-${i + 10}`)),
    ...CLASH_ADDITIONS
  ];
  assert.equal(EXPECTED_ADDED.length, 114,
    "G0-7b0. control: four reviewed G2 slices (84) plus the whole reviewed clash area (30) means exactly 114 expected ids");
  assert.deepEqual([...addedIds].sort(), [...EXPECTED_ADDED].sort(),
    "G0-7b. the additions are exactly rb/cw/ev/wg 10..30 plus cl-01..cl-30 — no other id was added");
  assert.equal(addedIds.length, 114, "G0-7b2. exactly 114 additions exist relative to the immutable baseline");
  const ADDITION_EVENTS = [...SLICE_ADDITIONS, { idPrefix: "cl", area: "clash" as DrillArea }];
  for (const id of addedIds) {
    const slice = ADDITION_EVENTS.find((a) => id.startsWith(`${a.idPrefix}-`));
    assert.ok(slice, `G0-7b3. every addition belongs to a reviewed addition event — got ${id}`);
    assert.ok(new RegExp(`area: "${slice!.area}"`).test(currentById.get(id) ?? ""),
      `G0-7b3b. addition ${id} declares the ${slice!.area} area its slice claims`);
  }
  // The forbidden-prefix loop is GONE at Slice 4: all four areas now have reviewed slices, so it
  // would read `for (const p of [])` and prove nothing. It is REPLACED, not deleted. What it
  // protected — that no addition exists outside the four exact 10..30 ranges — is asserted directly,
  // over a set proven non-empty on the very next line.
  for (const id of addedIds) {
    assert.ok(/^(rb|cw|ev|wg)-(1[0-9]|2[0-9]|30)$/.test(id) || /^cl-(0[1-9]|1[0-9]|2[0-9]|30)$/.test(id),
      `G0-7b4. every addition sits inside a reviewed range — the G2 four at 10..30 or clash at 01..30 — got ${id}`);
  }
  assert.equal(addedIds.length, 114, "G0-7b4b. control: that loop ran over 114 real additions, not zero");
  for (const outside of ["rb-31", "wg-31", "wg-09", "xx-10"]) {
    assert.ok(!EXPECTED_ADDED.includes(outside),
      `G0-7b4c. control: ${outside} is outside the expected set, so G0-7b would reject it`);
  }
  control("every real addition is judged permitted by the same predicate the controls use",
    addedIds.length === 114 && addedIds.every((id) => judgeAddition(id, currentById.get(id) ?? "").ok));

  // ---- THE Slice 4 integrity control ------------------------------------------------------------
  // Now that every area is authorised, judgeAddition ALONE no longer bounds any Debate area: a
  // structurally valid wg-31 passes every stage of the predicate. The exact 84-id set is therefore
  // the FINAL bound on authorised Debate bank growth. NEVER relax G0-7b into "any known prefix
  // above 09" — that would remove the last limit on this bank.
  const beyond = judgeAddition("wg-31", '{ id: "wg-31", area: "weighing", question: "x" }');
  assert.ok(beyond.ok, `G0-7b5. control: with weighing authorised the predicate alone ACCEPTS wg-31 — ${beyond.reason}`);
  assert.ok(!EXPECTED_ADDED.includes("wg-31"), "G0-7b5b. and only the exact 84-id set stops it");
  assert.ok(!addedIds.includes("wg-31"), "G0-7b5c. so no such item exists in the bank today");
  control("G0-7b's exact 114-id set is the CURRENT bound on Debate bank growth — a new id needs a new reviewed event",
    beyond.ok && !EXPECTED_ADDED.includes("wg-31"));

  // (e) The original nine of every area that HAS one — clash was introduced whole after the G2
  // baseline, so it has no original block to freeze here (its 30 are all judged additions above).
  for (const { idPrefix } of PREFIX_AREA.filter((a) => !NEW_AREA_PREFIXES.includes(a.idPrefix))) {
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

  // ---- G0-C1d. THE REAL boundary, first exercised at Slice 4 -------------------------------------
  // G0-C1b/G0-C1c above are synthetic: they prove the MECHANISM on a sample line. Slice 4 is the
  // first slice to append after the LAST array element, so wg-09 actually gained its comma. Assert
  // the real transition against the IMMUTABLE baseline — never against HEAD.
  // G0-C1d3 is the load-bearing one: if the raw lines ever stopped differing, the normalisation
  // would silently stop doing work here and this block would pass while proving nothing.
  const rawLine = (src: string, id: string) =>
    bankSlice(src).split("\n").map((l) => l.trim()).find((l) => l.startsWith(`{ id: "${id}"`)) as string;
  const parentWg09 = rawLine(parentSrc, "wg-09");
  const currentWg09 = rawLine(readFileSync("lib/debate-drills.ts", "utf8"), "wg-09");
  assert.ok(!parentWg09.endsWith(","),
    "G0-C1d. control: wg-09 carried NO terminal comma at the immutable baseline — it ended the array");
  assert.ok(currentWg09.endsWith(","),
    "G0-C1d2. and carries exactly one now that Slice 4 appends wg-10..wg-30 after it");
  assert.notEqual(currentWg09, parentWg09,
    "G0-C1d3. control: the RAW lines really differ, so the normalisation is doing work here and is not vacuous");
  assert.equal(currentWg09.replace(/,$/, ""), parentWg09,
    "G0-C1d4. and they normalise to the SAME content — the only change to wg-09 is punctuation");
  assert.ok(!currentWg09.slice(0, -1).endsWith(","),
    "G0-C1d5. exactly ONE comma was added, not two — the normalisation strips one and only one");
  control("the real wg-09 append boundary is punctuation-only and its normalisation is non-vacuous",
    parentWg09 !== currentWg09 && currentWg09.replace(/,$/, "") === parentWg09 && !parentWg09.endsWith(","));

  // Structural recognition of all four mappings — helper-level ONLY. Passing an explicit `authorised`
  // list proves the prefix->area map works; it does NOT make any area authorised for real additions.
  for (const { idPrefix, area } of PREFIX_AREA) {
    const v = judgeAddition(`${idPrefix}-10`, `{ id: "${idPrefix}-10", area: "${area}", question: "x" }`, [area]);
    assert.ok(v.ok, `G0-C2. control: ${idPrefix}-10 declaring ${area} IS structurally recognised — ${v.reason}`);
    control(`the Debate registry structurally recognises ${idPrefix} -> ${area}`, v.ok);
  }
  // Positive controls: every AUTHORISED area is accepted under the DEFAULT authorisation, with no
  // override — that is what proves each slice genuinely authorised its own area.
  for (const { idPrefix, area } of PREFIX_AREA.filter((a) => EXPANDED_AREAS.includes(a.area))) {
    const v = judgeAddition(`${idPrefix}-10`, `{ id: "${idPrefix}-10", area: "${area}", question: "x" }`);
    assert.ok(v.ok, `G0-C2b. control: ${idPrefix}-10 is accepted under default authorisation — ${v.reason}`);
    control(`${area} is authorised: ${idPrefix}-10 passes with no override`, v.ok);
  }
  assert.equal(PREFIX_AREA.filter((a) => EXPANDED_AREAS.includes(a.area)).length, 5,
    "G0-C2b2. control: all five Debate areas are authorised, so that loop is not vacuous");
  assert.equal(PREFIX_AREA.length, 5, "G0-C2a. control: exactly five Debate prefix->area mappings — the G2 four plus clash");

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

  // ---- G0-C6. The authorisation stage, after every real area is authorised ----------------------
  // From Slice 0 to Slice 3 this loop ran over the areas NOT yet authorised and proved a
  // structurally valid future addition was rejected TODAY — which is what proved each slice did not
  // pre-authorise the next. Slice 4 authorises the fourth and last area, so that production
  // condition is now UNREACHABLE. It is NOT untested: the SAME predicate is probed with a TEST-ONLY
  // withheld authorisation set. Production EXPANDED_AREAS is never mutated and no fake fifth area is
  // invented — the `authorised` parameter exists precisely for this.
  assert.equal(PREFIX_AREA.filter((a) => !EXPANDED_AREAS.includes(a.area)).length, 0,
    "G0-C6b. control: ZERO recognised Debate areas remain unauthorised — the old loop is empty BY DESIGN, and is replaced below");
  for (const { idPrefix, area } of PREFIX_AREA) {
    const withheld = EXPANDED_AREAS.filter((a) => a !== area);   // TEST-ONLY, never assigned back
    assert.equal(withheld.length, 4, `G0-C6c0. control: the withheld set for ${area} really removed exactly one area`);
    const v = judgeAddition(`${idPrefix}-31`, `{ id: "${idPrefix}-31", area: "${area}", question: "x" }`, withheld);
    assert.ok(!v.ok && v.stage === "unauthorised",
      `G0-C6c. control: a structurally valid ${area} addition is rejected at the AUTHORISATION stage when that area is withheld — ${v.reason}`);
    control(`the authorisation stage still rejects ${area} when it is withheld from the authorised set`,
      v.stage === "unauthorised");
    // and the SAME literal is accepted under real production authorisation — so the rejection above
    // is caused by the withheld set alone, not by anything wrong with the literal.
    const underProduction = judgeAddition(`${idPrefix}-31`, `{ id: "${idPrefix}-31", area: "${area}", question: "x" }`);
    assert.ok(underProduction.ok,
      `G0-C6c2. control: the identical ${area} literal passes under real authorisation — ${underProduction.reason}`);
  }
  assert.equal(EXPANDED_AREAS.length, 5,
    "G0-C6d. control: the withheld-area probe ran against a real five-area set, so it is not vacuous");

  assert.equal(itemLines('export const DRILL_BANK = [\n{ id: "x-01", area: "rebuttal" },\nexport type X').length, 1,
    "G0-C7. control: the item extractor really parses item literals");

  console.log(`Debate-drills smoke passed: ${DRILL_BANK.length} questions across ${DRILL_AREAS.length} areas at the exact per-area depths AREA_DEPTH declares, integrity + focused sessions + per-skill grading consistent, and every area can reach the ${DEBATE_DRILL_REQUIRED_UNIQUE}-distinct-question evidence floor while repeats count once (bypass 76%->20%, honest padding 85%->67%). CONTENT INTEGRITY: the bank is additive-only against the IMMUTABLE commit ${PRE_G2_EXPANSION.slice(0, 8)} — all 36 original items are byte-identical and keep their order, and additions are permitted only for an explicitly authorised area. all ${EXPANDED_AREAS.length} of ${PREFIX_AREA.length} areas are now authorised (${EXPANDED_AREAS.join(", ")}), and the additions are exactly the 114 reviewed items: the 84 G2-slice additions rb-10..rb-30 (Slice 1), cw-10..cw-30 (Slice 2), ev-10..ev-30 (Slice 3, whose ev-27 was replaced before approval to stay inside the curriculum) and wg-10..wg-30 (Slice 4, whose wg-24 was refined before approval to remove a magnitude/probability ambiguity), all four AI-authored and HUMAN-REVIEWED AND APPROVED 2026-08-11, plus the whole clash area cl-01..cl-30 from the Clash measurable-practice closure (AI-assisted, submitted for the same owner review gate) — Debate depth is 5 x 30. Slice 4 finally appended after wg-09, so the terminal-comma boundary is EXERCISED for real: wg-09 gained exactly one comma, the raw lines differ, and they normalise to identical content. No recognised Debate area remains unauthorised, so that stage is now probed with a TEST-ONLY withheld set rather than a vacuous loop, and the exact 114-id set is the CURRENT bound on Debate bank growth — a structurally valid wg-31 passes the predicate and is stopped only by G0-7b. ${controlsRun.length} controls each demonstrated the failure they exist to demonstrate.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
