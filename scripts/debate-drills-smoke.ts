/**
 * General Debate concept-drill bank integrity + grading consistency. Pure, no DB, no provider.
 * Run with: npm run debate-drills:smoke
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  DRILL_AREAS,
  DRILL_BANK,
  DEBATE_DRILL_HELD_IDS,
  DEBATE_DRILL_EXCLUSIVE_GROUPS,
  DEBATE_DRILL_REQUIRED_UNIQUE,
  collapseExclusiveGroups,
  buildDrillSessionFrom,
  siblingExclusionsFor,
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
  const OVERDRAW = 40; // > pool enters the repeat branch; < 2x pool makes the while loop append exactly once
  const overdrawn = buildDrillSession(OVERDRAW, ["rebuttal"]);
  assert.equal(overdrawn.length, OVERDRAW, "a 40-question request on the rebuttal pool still serves 40");
  // B2.1 EVOLUTION (2026-08-25): the rebuttal SERVED pool is 28 — rb-02/rb-13/rb-16/rb-30 were
  // released after the answer-types teaching shipped and each passed its reactivation gate;
  // rb-14 and rb-15 stay held until B2.2 teaches turn mechanics. Bank still holds 30.
  assert.equal(new Set(overdrawn.map((q) => q.id)).size, 28,
    "over exactly 28 distinct items — the served rebuttal pool excludes only the two still-held ids");

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
  assert.equal(wgOverdrawn.length, OVERDRAW, "a 40-question request on the weighing pool still serves 40");
  // B1 EVOLUTION (wg-08 hold, final acceptance gate): the weighing SERVED pool is 29, not 30.
  assert.equal(new Set(wgOverdrawn.map((q) => q.id)).size, 29,
    "over exactly 29 distinct weighing items — the served pool excludes held wg-08");

  // ---- Repeat-branch non-vacuity, RE-BASED at Slice 4 --------------------------------------------
  // Until Slice 4 this control named a still-9-item area and proved 20/9 and 40/9. NO Debate area
  // holds 9 any more, so it could not move a fourth time: it is RE-BASED on a request that EXCEEDS a
  // full 30-item pool, exactly as HOSA's 11g did at Phase 2f. buildDrillSession seeds `result` with
  // the ENTIRE shuffled pool before appending any repeat, so all 30 distinct ids are guaranteed and
  // the distinct count is deterministic, not probabilistic. This is now the ONLY proof the repeat
  // branch still exists. Do NOT delete it, and do NOT call weighing shallow — it is 30 deep.
  const DEPTH_TARGET = 30;
  // B1 EVOLUTION: bank depth stays 30 (AREA_DEPTH is the bank), but the SERVED weighing pool is 29
  // because wg-08 is held; the repeat-branch arithmetic runs against the served pool.
  const SERVED_WEIGHING = 29;
  assert.equal(AREA_DEPTH.weighing, DEPTH_TARGET, "control: the re-base really runs against a 30-item bank area, not a shallow one");
  assert.ok(OVERDRAW > SERVED_WEIGHING, "control: and the request really exceeds the served pool, so the repeat branch is entered");
  const repeatedPositions = OVERDRAW - new Set(wgOverdrawn.map((q) => q.id)).size;
  assert.equal(repeatedPositions, 11, "control: 40 served over 29 distinct means exactly 11 repeated positions — duplicates necessarily exist");
  // The boundary partner: at EXACTLY pool size there is no padding at all. Without this the overdraw
  // proof could not distinguish "the repeat branch ran" from "the builder always repeats".
  const wgExact = buildDrillSession(SERVED_WEIGHING, ["weighing"]);
  assert.equal(wgExact.length, SERVED_WEIGHING, "control: a request of exactly 29 on the 29-item served weighing pool serves 29");
  assert.equal(new Set(wgExact.map((q) => q.id)).size, SERVED_WEIGHING,
    "control: over 29 distinct items — no padding at the served-pool boundary, so the padding branch activates ONLY above the pool");
  // (stated as a plain assertion because the `control` helper is declared further down, with the
  // content-integrity block — the four facts it combines are each asserted individually above)
  assert.ok(wgOverdrawn.length === OVERDRAW && new Set(wgOverdrawn.map((q) => q.id)).size === SERVED_WEIGHING &&
    repeatedPositions === 11 && new Set(wgExact.map((q) => q.id)).size === SERVED_WEIGHING,
    "control: the repeat branch still exists now that every Debate area has depth, and activates ONLY above the served pool");
  assert.deepEqual(debateDrillPersistenceRequest(buildDrillEvidence(padded)[0]), { scorePercent: 67, passed: false },
    "so persistence receives 67 with passed:false, never a MASTERED-qualified result");


  // ---- CONTENT FREEZE (B2.2 mutation audit, 2026-08-25) ------------------------------------------
  // The mutation audit proved a one-word stem edit to a P0.1-repaired item survived all 32 safe
  // suites: repaired originals were only pinned as DIFFERENT from the immutable parent, and the
  // additions only by id/area/order/count — the CONTENT of the accepted P0.1/B1 bank had no freeze.
  // This snapshot is the same model as scripts/learning-content-baseline.json: a checked-in
  // canonical copy of the accepted educational fields, never HEAD-relative. Editing an item is
  // allowed ONLY as a deliberate two-file diff (source + baseline) that review can read.
  {
    const baseline = JSON.parse(readFileSync("scripts/debate-drill-bank-baseline.json", "utf8")) as Array<{
      id: string; area: string; question: string; choices: string[]; correctAnswer: string; explanation: string;
    }>;
    assert.equal(baseline.length, DRILL_BANK.length, "CF-1. the bank baseline covers every item");
    for (const [i, snap] of baseline.entries()) {
      const live = DRILL_BANK[i];
      assert.deepEqual(
        { id: live.id, area: live.area, question: live.question, choices: live.choices, correctAnswer: live.correctAnswer, explanation: live.explanation },
        snap,
        `CF-2. item ${snap.id} educational fields are byte-identical to the accepted baseline`);
    }
  }

  // ---- PC. MEASUREMENT-DEPENDENT PAIR CONTROL (owner ruling, 2026-08-25) -------------------------
  // rb-14 and rb-15 disclose each other's answer logic, through the post-answer explanation AND
  // through rendered choice text alone. Two executable layers protect the measurement: same-session
  // mutual exclusion (pool-level, inside the builder) and retained-exposure sibling exclusion
  // (derived at the issuing route from already-persisted PracticeSessionItem rows).
  //
  // NON-VACUITY IS THE WHOLE PROBLEM HERE. Both pair members are HELD today, so every assertion made
  // against the REAL pool is vacuously true and a deleted control would look identical to a passing
  // one. Every behavioural check below therefore drives the exported collapse with a SYNTHETIC pool.
  {
    assert.ok(existsSync("scripts/debate-pair-adjudications.json"),
      "PC-0. the independent pair-adjudication record exists — deleting it must fail by name, not by a bare ENOENT");
    const adjudications = JSON.parse(readFileSync("scripts/debate-pair-adjudications.json", "utf8")) as Array<{
      pair: string[]; finding: string; requiredControls: string[]; decision: string;
    }>;
    // TRUTH DIRECTION: the checked-in adjudication is EXPECTED, the runtime constant is ACTUAL.
    // The runtime policy must never be the source this expectation is derived from.
    assert.ok(adjudications.length >= 1, "PC-1. the pair-adjudication record exists and is non-empty");
    const rb = adjudications.find((a) => a.pair.includes("rb-14"));
    assert.ok(rb, "PC-1b. the rb-14/rb-15 measurement-dependence adjudication is recorded");
    assert.deepEqual([...rb!.pair].sort(), ["rb-14", "rb-15"], "PC-1c. with exactly that pair membership");
    assert.equal(rb!.decision, "ACCEPTED", "PC-1d. and the control decision is ACCEPTED");
    assert.deepEqual([...rb!.requiredControls].sort(),
      ["retained-exposure-sibling-exclusion", "same-session-mutual-exclusion"],
      "PC-1e. requiring BOTH executable controls, not just the same-session half");

    for (const adj of adjudications) {
      for (const id of adj.pair) {
        assert.ok(DRILL_BANK.some((q) => q.id === id), `PC-2. adjudicated id ${id} exists in the bank`);
      }
      // The runtime policy must satisfy every recorded adjudication.
      const group = DEBATE_DRILL_EXCLUSIVE_GROUPS.find((g) => adj.pair.every((id) => g.includes(id)));
      assert.ok(group, `PC-2b. runtime policy contains an exclusive group covering [${adj.pair.join(", ")}]`);
      assert.deepEqual([...group!].sort(), [...adj.pair].sort(),
        `PC-2c. and that group is exactly the adjudicated pair — no member quietly dropped`);
      // RELEASE COUPLING. Unconditional today because BOTH are held; it becomes the load-bearing
      // gate the moment either id leaves DEBATE_DRILL_HELD_IDS.
      const servable = adj.pair.filter((id) => !DEBATE_DRILL_HELD_IDS.includes(id));
      if (servable.length > 0) {
        assert.deepEqual([...group!].sort(), [...adj.pair].sort(),
          `PC-3. ${servable.join(", ")} is freshly servable, so the full pair MUST remain under the executable control`);
      }
    }
    assert.deepEqual(DEBATE_DRILL_EXCLUSIVE_GROUPS.map((g) => [...g].sort()), [["rb-14", "rb-15"]],
      "PC-3b. the runtime policy holds exactly the adjudicated groups and nothing invented");

    // --- same-session mutual exclusion, proven on a synthetic pool (never vacuous) ---
    const synth = () => DRILL_BANK.filter((q) => ["rb-14", "rb-15", "rb-01", "rb-03"].includes(q.id));
    assert.equal(synth().length, 4, "PC-4. control: the synthetic pool really contains both pair members");
    const keepers = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const collapsed = collapseExclusiveGroups(synth());
      const pairMembers = collapsed.filter((q) => q.id === "rb-14" || q.id === "rb-15");
      assert.equal(pairMembers.length, 1,
        "PC-4b. exactly ONE pair member survives the collapse — not two (contamination) and not zero (silent retirement)");
      assert.equal(collapsed.length, 3, "PC-4c. and only the surplus sibling is removed — no collateral loss");
      assert.ok(collapsed.some((q) => q.id === "rb-01") && collapsed.some((q) => q.id === "rb-03"),
        "PC-4d. non-pair items are untouched");
      keepers.add(pairMembers[0].id);
    }
    // NON-DEGENERACY. A "control" that always keeps rb-14 would silently retire rb-15 forever.
    // 200 uniform draws: P(all one side) = 2 * (1/2)^200, far below any flake threshold worth naming.
    assert.deepEqual([...keepers].sort(), ["rb-14", "rb-15"],
      "PC-5. across 200 builds BOTH members are sometimes the survivor — the control excludes, it does not retire");
    // A pool holding only one member is left alone.
    const single = DRILL_BANK.filter((q) => ["rb-14", "rb-01"].includes(q.id));
    assert.equal(collapseExclusiveGroups(single).length, 2, "PC-5b. a pool with one pair member is not collapsed");

    // --- INTEGRATION: the collapse must be WIRED INTO the builder, not merely exist ---
    // A mutation audit proved four mis-wirings survived the whole safe battery while both ids are
    // held, because the live pool can never contain both. These checks drive the injectable seam
    // with a TEST-ONLY hold list that releases the pair, so the pool really does contain both and
    // every mis-wiring fails: result-level enforcement, area-conditional enforcement (either
    // direction), and count-pressure reinsertion.
    const TEST_HOLDS = DEBATE_DRILL_HELD_IDS.filter((id) => id !== "rb-14" && id !== "rb-15");
    assert.ok(!TEST_HOLDS.includes("rb-14") && !TEST_HOLDS.includes("rb-15") && TEST_HOLDS.includes("wg-08"),
      "PC-11. control: the test-only hold list really releases the pair (and holds nothing else new)");
    const bothIn = (session: typeof DRILL_BANK) =>
      session.some((q) => q.id === "rb-14") && session.some((q) => q.id === "rb-15");
    const INTEGRATION_CASES: Array<{ label: string; count: number; areas?: DrillArea[] }> = [
      { label: "focused rebuttal, fast path", count: 20, areas: ["rebuttal"] },
      { label: "focused rebuttal, overdraw", count: 40, areas: ["rebuttal"] },
      { label: "focused rebuttal, exactly pool-sized", count: 29, areas: ["rebuttal"] },
      { label: "mixed session, fast path", count: 140 },
      { label: "mixed session, overdraw", count: 200 },
      { label: "small mixed session", count: 5 }
    ];
    for (const c of INTEGRATION_CASES) {
      for (let i = 0; i < 60; i += 1) {
        const session = buildDrillSessionFrom(DRILL_BANK, TEST_HOLDS, c.count, c.areas);
        assert.ok(!bothIn(session),
          `PC-12. ${c.label}: rb-14 and rb-15 are NEVER both served once released — the collapse is wired into the pool, not bolted onto the result`);
        assert.equal(session.length, c.count,
          `PC-12b. ${c.label}: the session is still exactly ${c.count} long — the control must not silently shorten a session to satisfy exclusion`);
      }
    }
    // Requested-count pressure must NOT reinstate the sibling: ask for more than the collapsed pool.
    for (let i = 0; i < 60; i += 1) {
      const pressed = buildDrillSessionFrom(DRILL_BANK, TEST_HOLDS, 40, ["rebuttal"]);
      assert.equal(new Set(pressed.map((q) => q.id)).size, 29,
        "PC-13. count pressure draws repeats from the collapsed pool (29 distinct), never by re-admitting the excluded sibling");
      assert.ok(!bothIn(pressed), "PC-13b. and the pair is still never both present under that pressure");
    }
    // Both members must remain individually servable once released — exclusion, not retirement.
    const releasedKeepers = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      for (const q of buildDrillSessionFrom(DRILL_BANK, TEST_HOLDS, 29, ["rebuttal"])) {
        if (q.id === "rb-14" || q.id === "rb-15") releasedKeepers.add(q.id);
      }
    }
    assert.deepEqual([...releasedKeepers].sort(), ["rb-14", "rb-15"],
      "PC-14. across 200 released-pair builds each member serves sometimes — both stay independently measurable");
    // Retained-exposure exclusions must compose with the pair control through the real builder.
    for (let i = 0; i < 60; i += 1) {
      const afterRb14 = buildDrillSessionFrom(DRILL_BANK, TEST_HOLDS, 29, ["rebuttal"], siblingExclusionsFor(["rb-14"]));
      assert.ok(!afterRb14.some((q) => q.id === "rb-15"),
        "PC-15. a learner with retained rb-14 exposure is never freshly served rb-15");
      const afterBoth = buildDrillSessionFrom(DRILL_BANK, TEST_HOLDS, 28, ["rebuttal"], siblingExclusionsFor(["rb-14", "rb-15"]));
      assert.ok(!afterBoth.some((q) => q.id === "rb-14" || q.id === "rb-15"),
        "PC-15b. a learner with retained exposure to BOTH is freshly served NEITHER while that history remains");
    }

    // --- retained-exposure sibling exclusion: the full mapping table ---
    assert.deepEqual(siblingExclusionsFor([]).sort(), [],
      "PC-6. no retained exposure -> no cross-session exclusion");
    assert.deepEqual(siblingExclusionsFor(["rb-14"]).sort(), ["rb-15"],
      "PC-6b. retained exposure to rb-14 excludes rb-15 from fresh serving");
    assert.deepEqual(siblingExclusionsFor(["rb-15"]).sort(), ["rb-14"],
      "PC-6c. retained exposure to rb-15 excludes rb-14 from fresh serving");
    assert.deepEqual(siblingExclusionsFor(["rb-14", "rb-15"]).sort(), ["rb-14", "rb-15"],
      "PC-6d. retained exposure to BOTH excludes BOTH — no uncontaminated measurement remains");
    assert.deepEqual(siblingExclusionsFor(["rb-01", "cl-05"]).sort(), [],
      "PC-6e. unrelated exposure excludes nothing");

    // --- the exclusion actually reaches the builder ---
    const excludedBuild = buildDrillSession(20, ["rebuttal"], ["rb-01"]);
    assert.ok(!excludedBuild.some((q) => q.id === "rb-01"),
      "PC-7. an excludedIds entry is honoured by the builder and never served");
    assert.equal(new Set(excludedBuild.map((q) => q.id)).size, 20,
      "PC-7b. and the session is still filled from the remaining eligible pool");

    // --- EXPOSURE MEANS ISSUED, NOT ANSWERED (load-bearing: choice text alone contaminates) ---
    const routeSrc = readFileSync("app/api/debate/drills/session/route.ts", "utf8");
    assert.ok(/practiceSessionItem\.findMany/.test(routeSrc),
      "PC-8. the issuing route reads retained exposure history");
    assert.ok(/siblingExclusionsFor\(/.test(routeSrc) && /buildDrillSession\([^)]*excludedIds/.test(routeSrc),
      "PC-8b. derives sibling exclusions from it and passes them to the builder");
    const exposureQuery = routeSrc.slice(routeSrc.indexOf("practiceSessionItem.findMany"), routeSrc.indexOf("siblingExclusionsFor("));
    for (const answeredOnly of ["answeredAt", "selectedOptionId", "isCorrect"]) {
      assert.ok(!exposureQuery.includes(answeredOnly),
        `PC-8c. the exposure query does NOT filter on ${answeredOnly} — seeing a sibling's choices is exposure, answering is not required`);
    }
    assert.ok(!/check\/route|submit\/route/.test(exposureQuery),
      "PC-8d. grading paths are not coupled to the exposure lookup");

    // --- FAIL CLOSED: exclusions that empty the pool must throw, never enter the padding loop ---
    assert.throws(() => buildDrillSession(5, ["no-such-area" as DrillArea]), /empty/i,
      "PC-9. an unrecognised area fails closed instead of spinning the synchronous padding loop");
    const allRebuttal = DRILL_BANK.filter((q) => q.area === "rebuttal").map((q) => q.id);
    assert.throws(() => buildDrillSession(5, ["rebuttal"], allRebuttal), /empty/i,
      "PC-9b. exclusions that remove every candidate fail closed too — no infinite loop, no zero-item session");

    // --- historical grading is untouched by any serving policy ---
    for (const id of ["rb-14", "rb-15"]) {
      const item = DRILL_BANK.find((q) => q.id === id)!;
      const wrong = item.choices.find((c) => c !== item.correctAnswer)!;
      assert.equal(gradeDrillAnswers([{ id, selected: item.correctAnswer }]).items[0].correct, true,
        `PC-10. a historical correct answer to ${id} still grades correct — exclusion controls selection, never truth`);
      assert.equal(gradeDrillAnswers([{ id, selected: wrong }]).items[0].correct, false,
        `PC-10b. and a historical wrong answer to ${id} still grades incorrect — grading is not rubber-stamped`);
    }
  }

  // ---- B1 SERVING HOLD (closed-corpus adjudication, 2026-08-25) ----------------------------------
  // VALID items whose tested concepts are untaught are withheld from serving until a reachable
  // lesson teaches them. The hold lives at the single pool-construction point in buildDrillSession;
  // these checks prove it two-sided — held ids never serve, non-held ids all still serve — and
  // prove the bank itself is untouched.
  // B2.1 RELEASE (2026-08-25): rb-02, rb-13, rb-16, rb-30 released after each passed the full
  // reactivation gate on the taught answer-types lesson (see the release record in the bank).
  assert.deepEqual([...DEBATE_DRILL_HELD_IDS], ["rb-14", "rb-15", "wg-08"],
    "B1-1. the held set is exactly rb-14, rb-15 (await B2.2 turn-mechanics teaching) and wg-08 (awaits B2.3)");
  for (const id of DEBATE_DRILL_HELD_IDS) {
    assert.ok(DRILL_BANK.some((q) => q.id === id),
      `B1-2. held item ${id} remains IN the bank — held means unserved, never deleted`);
  }
  const b1Full = buildDrillSession(300);
  assert.equal(new Set(b1Full.map((q) => q.id)).size, DRILL_BANK.length - DEBATE_DRILL_HELD_IDS.length,
    "B1-3. a full-bank overdraw serves exactly the 147 non-held items");
  assert.ok(b1Full.every((q) => !DEBATE_DRILL_HELD_IDS.includes(q.id)),
    "B1-4. no held id is ever served, even at full-bank overdraw");
  const b1Rb = buildDrillSession(60, ["rebuttal"]);
  const b1RbIds = new Set(b1Rb.map((q) => q.id));
  assert.equal(b1RbIds.size, 28, "B1-5. the served rebuttal pool is exactly 28 of 30 (four B2.1-taught items released)");
  for (const q of DRILL_BANK) {
    if (q.area === "rebuttal" && !DEBATE_DRILL_HELD_IDS.includes(q.id)) {
      assert.ok(b1RbIds.has(q.id), `B1-6. non-held rebuttal item ${q.id} still serves — the hold does not over-filter`);
    }
  }
  assert.ok(28 >= DEBATE_DRILL_REQUIRED_UNIQUE,
    "B1-7. the served rebuttal pool stays far above the unique-evidence floor, so mastery remains reachable");
  // Weighing hold (final acceptance gate): wg-08 excluded, wg-29 EXPLICITLY still serving — the
  // positive control matters as much as the exclusion, because wg-29's fair-transfer status was
  // independently upheld while wg-08's was overturned.
  const b1Wg = buildDrillSession(60, ["weighing"]);
  const b1WgIds = new Set(b1Wg.map((q) => q.id));
  assert.equal(b1WgIds.size, 29, "B1-10. the served weighing pool is exactly 29 of 30");
  assert.ok(!b1WgIds.has("wg-08"), "B1-11. held wg-08 never serves in focused weighing practice");
  assert.ok(b1WgIds.has("wg-29"), "B1-12. wg-29 (fair transfer — serving valid) still serves — the hold did not capture it");
  for (const q of DRILL_BANK) {
    if (q.area === "weighing" && !DEBATE_DRILL_HELD_IDS.includes(q.id)) {
      assert.ok(b1WgIds.has(q.id), `B1-13. non-held weighing item ${q.id} still serves — the hold does not over-filter`);
    }
  }
  assert.ok(29 >= DEBATE_DRILL_REQUIRED_UNIQUE,
    "B1-14. the served weighing pool stays far above the unique-evidence floor");
  const heldItem = DRILL_BANK.find((q) => q.id === "rb-14")!;
  assert.equal(gradeDrillAnswers([{ id: "rb-14", selected: heldItem.correctAnswer }]).items[0].correct, true,
    "B1-8. an in-flight answer to a held id still grades honestly — holding never falsifies accounting");
  assert.ok(b1RbIds.has("rb-02") && b1RbIds.has("rb-13") && b1RbIds.has("rb-16") && b1RbIds.has("rb-30"),
    "B1-8c. the four B2.1-released items positively serve again — release is real, not just list-shrink");
  const heldWg = DRILL_BANK.find((q) => q.id === "wg-08")!;
  assert.equal(gradeDrillAnswers([{ id: "wg-08", selected: heldWg.correctAnswer }]).items[0].correct, true,
    "B1-8b. an in-flight answer to held wg-08 also grades honestly");
  const sessionRouteSrc = readFileSync("app/api/debate/drills/session/route.ts", "utf8");
  assert.ok(sessionRouteSrc.includes("buildDrillSession(") && !sessionRouteSrc.includes("DRILL_BANK"),
    "B1-9. the only serving route goes through buildDrillSession and never reads the bank directly — learners cannot reach held ids");

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
  // P0.1 ASSESSMENT-INTEGRITY REPAIR: the adversarial proof showed the original items' answer-form
  // leakage let a stem-blind learner beat the 70% threshold, so the classified originals below were
  // deliberately repaired. The freeze is now TWO-SIDED: every listed id MUST differ from the
  // immutable parent (a silent revert is a failure), every unlisted original stays byte-identical,
  // and scripts/assessment-quality-guard.ts enforces the answer-form property the repair restored.
  // Repaired items are independently AI-reviewed with external human content review waived by the
  // project owner 2026-08-25 (see the in-bank waiver record; a waiver is not human review).
  const P01_REPAIRED_ORIGINALS = new Set(["cw-01","cw-04","cw-05","cw-07","cw-08","cw-09","rb-01","rb-02","rb-03","rb-04","rb-05","rb-07","rb-08","rb-09","ev-01","ev-02","ev-03","ev-04","ev-06","ev-07","ev-08","ev-09","wg-01","wg-02","wg-03","wg-04","wg-05","wg-06","wg-07","wg-08","wg-09"]);
  for (const parentLine of parentItems) {
    const id = idOf(parentLine);
    if (P01_REPAIRED_ORIGINALS.has(id)) {
      assert.ok(currentById.has(id), `G0-4r. repaired original ${id} still exists`);
      assert.notEqual(currentById.get(id), parentLine,
        `G0-4r2. repaired original ${id} DIFFERS from the immutable parent — a silent revert of the P0.1 repair must fail`);
      const areaOf = (line: string) => (line.match(/area: "([a-z-]+)"/) ?? [])[1];
      assert.equal(areaOf(currentById.get(id) as string), areaOf(parentLine),
        `G0-4r3. and ${id} still declares its original area`);
      continue;
    }
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
      if (P01_REPAIRED_ORIGINALS.has(id)) {
        assert.notEqual(currentById.get(id), parentItems.find((line) => idOf(line) === id),
          `G0-8r. ${id} was deliberately repaired by P0.1 and must differ from the parent`);
        continue;
      }
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
  // P0.1: wg-09 is one of the deliberately repaired originals, so its CONTENT now differs from the
  // parent as well — the punctuation-boundary story above stays historically true (the parent line
  // ended the array; the current one cannot), but content identity is now owned by the two-sided
  // repaired-originals freeze in G0-4r, not by this control.
  assert.ok(P01_REPAIRED_ORIGINALS.has("wg-09"),
    "G0-C1d4. wg-09's content divergence is the recorded P0.1 repair, not an unexplained drift");
  assert.ok(!currentWg09.slice(0, -1).endsWith(","),
    "G0-C1d5. wg-09 still carries exactly ONE terminal comma — the append boundary itself is intact");
  control("the wg-09 append boundary remains comma-terminated and its content change is the recorded P0.1 repair",
    parentWg09 !== currentWg09 && currentWg09.endsWith(",") && P01_REPAIRED_ORIGINALS.has("wg-09"));

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

  console.log(`Debate-drills smoke passed: ${DRILL_BANK.length} questions across ${DRILL_AREAS.length} areas at the exact per-area depths AREA_DEPTH declares, integrity + focused sessions + per-skill grading consistent, and every area can reach the ${DEBATE_DRILL_REQUIRED_UNIQUE}-distinct-question evidence floor while repeats count once (bypass 76%->20%, honest padding 85%->67%). CONTENT INTEGRITY: the bank is additive-only against the IMMUTABLE commit ${PRE_G2_EXPANSION.slice(0, 8)} — the P0.1 assessment-integrity repair deliberately edited ${P01_REPAIRED_ORIGINALS.size} of the 36 originals (each proven DIFFERENT from the parent, a silent revert fails), the other originals are byte-identical, order is preserved, and additions are permitted only for an explicitly authorised area. all ${EXPANDED_AREAS.length} of ${PREFIX_AREA.length} areas are now authorised (${EXPANDED_AREAS.join(", ")}), and the additions are exactly the 114 reviewed items: the 84 G2-slice additions rb-10..rb-30 (Slice 1), cw-10..cw-30 (Slice 2), ev-10..ev-30 (Slice 3, whose ev-27 was replaced before approval to stay inside the curriculum) and wg-10..wg-30 (Slice 4, whose wg-24 was refined before approval to remove a magnitude/probability ambiguity), all four AI-authored and HUMAN-REVIEWED AND APPROVED 2026-08-11 as originally shipped, plus the whole clash area cl-01..cl-30 (AI-assisted, submitted for the owner review gate) — Debate depth is 5 x 30. The P0.1 repair then edited 125 Debate items for answer-form leakage; every edited item is AI-repaired and independently AI-reviewed with external human content review waived by the project owner 2026-08-25 (a waiver is not human review), and scripts/assessment-quality-guard.ts now enforces the restored answer-form property. B1 (2026-08-25) then repaired three adjudicated clash defects (cl-08 rekeyed to direct clash; cl-10 and cl-30 lost their second-correct-answer distractors) and withheld seven valid but untaught items from serving — the rebuttal taxonomy six (rb-02, rb-13, rb-14, rb-15, rb-16, rb-30) and weighing-framework item wg-08, whose hold the final acceptance gate ordered after overturning an earlier fair-transfer ruling, while wg-29's fair-transfer status was independently upheld and it still serves. B2.1 (2026-08-25) then published the answer-types teaching and released rb-02, rb-13, rb-16 and rb-30 after each passed its closed-corpus reactivation gate on the final lesson bytes (AI-authored, independently AI-reviewed, owner content-review waiver 2026-08-25 — a waiver is not human review); the bank keeps all 150 items, 28 of 30 rebuttal and 29 of 30 weighing items serve, and the remaining held ids (rb-14, rb-15, wg-08) release as their teaching slices ship. Slice 4's append after wg-09 exercised the terminal-comma boundary for real in pre-P0.1 history (back then wg-09's raw line differed from the immutable original by exactly one comma and normalised to identical content); the P0.1 repair then deliberately rewrote wg-09's content, so its divergence from the immutable original is now the sanctioned, protected state — the two-sided freeze fails a silent revert. No recognised Debate area remains unauthorised, so that stage is now probed with a TEST-ONLY withheld set rather than a vacuous loop, and the exact 114-id set is the CURRENT bound on Debate bank growth — a structurally valid wg-31 passes the predicate and is stopped only by G0-7b. ${controlsRun.length} controls each demonstrated the failure they exist to demonstrate.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
