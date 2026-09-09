/**
 * DECA Phase B1 — P0 truth + runtime integrity regressions.
 *
 * STRICT-SAFE BY CONSTRUCTION. The only runtime module it imports is `lib/deca-drills`, which is
 * pure data plus pure functions (no prisma, no env, no network, no provider). Everything that lives
 * behind a prisma-importing module — the rubric provenance contract in `lib/competition-specs.ts`,
 * the judging gates in `lib/ai.ts`, and the learner-visible labels in the app surfaces — is asserted
 * against SOURCE TEXT rather than executed, so this suite can never read or write shared state.
 *
 * Run with: npx tsx scripts/deca-p0-hardening-smoke.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rubricLineNamesNoScoredBehaviour } from "../lib/rubrics";
import {
  DECA_DRILL_AREAS,
  DECA_DRILL_BANK,
  DECA_DRILL_HELD_IDS,
  buildDecaDrillSession,
  isDecaDrillArea,
  type DecaDrillArea
} from "../lib/deca-drills";

const read = (p: string) => readFileSync(p, "utf8");
let checks = 0;
function check(name: string, fn: () => void) {
  fn();
  checks += 1;
  console.log(`  ok  ${name}`);
}

function main() {
  // ============================================================================================
  // P0-1 — the reachable unknown-area / empty-pool hang. Defence in depth: route AND builder.
  // ============================================================================================
  check("A1. an unknown area string is not a DECA drill area", () => {
    assert.equal(isDecaDrillArea("performance-indicators"), true, "control: a real area narrows");
    for (const bogus of ["", "bogus", "rebuttal", "PERFORMANCE-INDICATORS", "performance indicators", "__proto__"]) {
      assert.equal(isDecaDrillArea(bogus), false, `unknown area rejected: ${JSON.stringify(bogus)}`);
    }
    for (const nonString of [null, undefined, 3, {}, []]) {
      assert.equal(isDecaDrillArea(nonString), false, "a non-string is never an area");
    }
    assert.deepEqual(
      DECA_DRILL_AREAS.map((a) => a.id).filter((id) => !isDecaDrillArea(id)),
      [],
      "control: every declared area narrows to itself"
    );
  });

  check("A2. the builder FAILS FAST on an empty pool instead of spinning forever", () => {
    // The padding loop pushes from `pool`; with an empty pool it can never advance `result.length`.
    // This must throw — synchronously and finitely — not hang.
    assert.throws(
      () => buildDecaDrillSession(5, ["not-an-area" as unknown as DecaDrillArea]),
      /pool is empty/i,
      "an unrecognised area throws rather than looping"
    );
    // Control: an EMPTY areas array means "no area filter" (existing semantics), so it serves the
    // whole pool and must NOT be mistaken for the empty-pool condition.
    assert.equal(buildDecaDrillSession(3, []).length, 3, "an empty areas array serves from the full pool");
    // Control: a real area still serves without throwing.
    assert.equal(buildDecaDrillSession(3, ["business-reasoning"]).length, 3, "a valid area serves normally");
  });

  check("A3. the route narrows requested areas and refuses unknown ones with an explicit status", () => {
    const route = read("app/api/deca/drills/session/route.ts");
    assert.ok(/isDecaDrillArea/.test(route), "the route narrows through the type guard");
    assert.ok(
      /throw new HttpError\("Unknown DECA drill area requested", 400\)/.test(route),
      "an unknown area is an explicit 400, not a silent drop"
    );
    assert.ok(
      !/buildDecaDrillSession\(input\.count, input\.areas as/.test(route),
      "the raw request value is no longer cast straight into the builder"
    );
    assert.ok(
      /buildDecaDrillSession\(input\.count, requestedAreas/.test(route),
      "the builder receives the NARROWED areas"
    );
  });

  check("A4. no held-item fallback and no scope broadening when an area is requested", () => {
    for (const area of DECA_DRILL_AREAS.map((a) => a.id)) {
      const served = buildDecaDrillSession(40, [area]);
      assert.ok(served.length > 0, `${area}: serves`);
      assert.deepEqual([...new Set(served.map((q) => q.area))], [area], `${area}: never broadens scope`);
      assert.deepEqual(
        served.filter((q) => DECA_DRILL_HELD_IDS.includes(q.id)).map((q) => q.id),
        [],
        `${area}: a held item is never used to fill the session`
      );
    }
    const all = buildDecaDrillSession(200);
    assert.deepEqual(
      all.filter((q) => DECA_DRILL_HELD_IDS.includes(q.id)).map((q) => q.id),
      [],
      "an overdrawn all-area session still never serves a held item"
    );
  });

  check("A5. control: the bank, its holds and pi-26 are untouched by this milestone", () => {
    assert.equal(DECA_DRILL_BANK.length, 120, "120 authored items");
    assert.deepEqual([...DECA_DRILL_HELD_IDS], ["pi-26"], "pi-26 remains the only DECA hold");
    assert.equal(
      DECA_DRILL_BANK.filter((q) => !DECA_DRILL_HELD_IDS.includes(q.id)).length,
      119,
      "119 servable"
    );
  });

  // ============================================================================================
  // P0-3 / P0-2 — rubric provenance fails CLOSED, and "official" is claimed only on positive proof.
  // ============================================================================================
  check("B1. provenance carries an explicit UNKNOWN state and never infers sourced", () => {
    const specs = read("lib/competition-specs.ts");
    assert.ok(
      /provenance: "sourced" \| "placeholder" \| "unknown";/.test(specs),
      "the breakdown type admits unknown provenance"
    );
    // The Json fallback has no provenance field at all, so it cannot prove sourced.
    assert.ok(
      /\/placeholder\/i\.test\(`\$\{category\.description \?\? ""\}`\) \? "placeholder" : "unknown"/.test(specs),
      "an empty or non-matching description is UNKNOWN, never sourced"
    );
    assert.ok(
      !/\? "placeholder" : "sourced"/.test(specs),
      "the fail-open default is gone"
    );
    // Structured rows: only the exact enum values are honoured.
    assert.ok(
      /row\.provenance === "sourced" \? "sourced" : row\.provenance === "placeholder" \? "placeholder" : "unknown"/.test(specs),
      "an unrecognised stored provenance value degrades to unknown"
    );
  });

  check("B2. weighted scoring requires a POSITIVE source on every category", () => {
    const specs = read("lib/competition-specs.ts");
    assert.ok(
      /const allPointed = breakdown\.categories\.every\(\(c\) => typeof c\.points === "number" && c\.points > 0 && c\.provenance === "sourced"\);/.test(specs),
      "every category must be positively sourced AND positively pointed"
    );
    assert.ok(/if \(!allPointed\) return null;/.test(specs), "otherwise no weighted rubric is produced");
  });

  check("B3. the judge claims an OFFICIAL rubric only when every category is sourced", () => {
    const ai = read("lib/ai.ts");
    assert.ok(
      /const allSourced = breakdown\.categories\.every\(\(category\) => category\.provenance === "sourced"\);\s*\n\s*if \(!allSourced\) return null;/.test(ai),
      "registryRubricForJudge refuses to attribute a non-sourced rubric"
    );
    // The claim itself still exists — it is the gate that changed, not the wording.
    assert.ok(/Official rubric categories from the \$\{spec\.eventName\}/.test(ai), "control: the official claim still exists for sourced rubrics");
  });

  check("B4. the scenario generator cannot stamp piSource registry from rubric data at all", () => {
    const ai = read("lib/ai.ts");
    // SUPERSEDED BY A STRONGER GUARANTEE (B4 milestone, 2026-09-09). This check originally required
    // the scenario's registry-PI path to be gated on positive sourcing, mirroring the judge. Once the
    // 2026-27 rubric was actually sourced, that gate would have PASSED and handed the learner twelve
    // rubric lines as their performance indicators. The path is now removed outright, which subsumes
    // the provenance gate: no rubric category can become a performance indicator under any provenance.
    assert.ok(/const hasRegistry = false;/.test(ai), "the registry-PI path is closed unconditionally");
    assert.ok(
      !/registryBreakdown\.categories\.every\(\(category\) => category\.provenance === "sourced"\)/.test(ai),
      "the weaker provenance-gated derivation is gone, not merely bypassed"
    );
  });

  check("B5. the rubric UI flags anything that is not positively sourced", () => {
    const ui = read("components/specs/rubric-breakdown.tsx");
    assert.ok(
      /category\.provenance !== "sourced" \?/.test(ui),
      "the caution badge is driven by absence of sourcing, not by the word placeholder"
    );
    assert.ok(!/category\.provenance === "placeholder" \?/.test(ui), "the old placeholder-only badge is gone");
  });

  // ============================================================================================
  // P0-6 / P0-7 — no ballot without a rubric; no event identity the learner did not choose.
  // ============================================================================================
  check("C1. a DECA round is refused before the provider call when no rubric covers it", () => {
    const ai = read("lib/ai.ts");
    const route = read("app/api/ai/judge-deca/route.ts");
    assert.ok(/export function decaJudgeRubricAvailable\(eventType: string\): boolean/.test(ai), "a pure predicate exists");
    assert.ok(/if \(!decaJudgeRubricAvailable\(input\.eventType\)\)/.test(route), "the route checks it");
    assert.ok(/503\);/.test(route), "and refuses with a truthful retryable status");
    assert.ok(
      route.indexOf("decaJudgeRubricAvailable") < route.indexOf("judgeDecaRoleplay("),
      "the refusal happens BEFORE the provider call, spending no budget"
    );
    assert.ok(
      /if \(rubric\.length === 0\) \{[\s\S]{0,400}throw new Error\(/.test(ai),
      "and the judge keeps an internal backstop for other callers"
    );
  });

  check("C2. provider failure and malformed output still produce NO ballot", () => {
    const ai = read("lib/ai.ts");
    assert.ok(/NO canned fallback for DECA judging/.test(ai), "the no-fallback decision is still recorded");
    assert.ok(
      /jsonCompletion<PerformanceJudgeResult>\([\s\S]{0,4000}?undefined,\s*\n\s*"DECA judge",/.test(ai),
      "judgeDecaRoleplay still passes NO fallback to jsonCompletion"
    );
  });

  check("C3. the event identity follows the chosen cluster, never a blanket HLM label", () => {
    const room = read("components/rooms/roleplay-room.tsx");
    assert.ok(/function decaEventNameForCluster\(cluster: string\): string/.test(room), "a cluster-derived label exists");
    assert.ok(
      /\/hospitality\|tourism\|lodging\|hotel\/i\.test\(cluster\) \? DECA_HOSPITALITY_EVENT_NAME : DECA_GENERIC_EVENT_NAME/.test(room),
      "only a hospitality cluster carries the seeded hospitality event name"
    );
    assert.ok(!/const DECA_EVENT_NAME =/.test(room), "the blanket constant is gone");
    assert.ok(
      !/eventType: DECA_EVENT_NAME/.test(room),
      "no call site sends one hardcoded event for every cluster"
    );
    assert.ok(
      /eventType: decaEventNameForCluster\(cfg\.cluster\)/.test(room),
      "scenario generation sends the cluster's own truthful label"
    );
    assert.ok(
      /coachEventType = isDeca \? decaEventNameForCluster\(/.test(room),
      "and so does the side coach"
    );
  });

  // ============================================================================================
  // P0-4 / P0-5 — a practice-test mean is not mastery; one score is not readiness.
  // ============================================================================================
  check("D1. the practice-test mean is no longer labelled Mastery", () => {
    for (const path of ["app/(app)/home/page.tsx", "app/(app)/dashboard/page.tsx"]) {
      const src = read(path);
      assert.ok(/Practice average/.test(src), `${path}: the metric is named for what it is`);
      assert.ok(!/label="Mastery"/.test(src), `${path}: no Mastery label on the test mean`);
      assert.ok(!/masteryFromTests/.test(src), `${path}: no mastery-shaped helper name`);
    }
    const dash = read("app/(app)/dashboard/page.tsx");
    assert.ok(/practiceAverageFromTests/.test(dash), "dashboard: helper renamed to the truth");
    assert.ok(!/detail="Based on recent training outcomes\."/.test(dash), "the vague detail line is replaced");
  });

  check("D2. a single practice-test score no longer asserts readiness", () => {
    const results = read("app/(app)/tests/[testId]/results/page.tsx");
    assert.ok(!/Ready to level up/.test(results), "the readiness claim is gone");
    assert.ok(!/Close to ready/.test(results), "and so is the near-readiness claim");
    assert.ok(!/readinessLabel/.test(results), "including the variable that carried it");
    assert.ok(/Strong practice result/.test(results) && /Solid practice result/.test(results), "the band describes the RESULT");
    assert.ok(/Focused review/.test(results), "control: the low band is unchanged");
  });

  // ============================================================================================
  // B4 — the sourced 2026-27 Individual Series rubric contract (source assertions only: the modules
  // that resolve a rubric import prisma, so they are never executed here).
  // ============================================================================================
  check("E1. the false 5x18+10 point split is corrected, not merely deleted", () => {
    const specs = read("lib/competition-specs.ts");
    assert.ok(
      !/DECA HLM \(5 PIs x 18 \+ Overall 10 = 100\) qualifies/.test(specs),
      "the false claim no longer stands as an assertion of fact"
    );
    assert.ok(/The point split lives in the DATABASE, never here\./.test(specs), "the authority is named as the data, not the comment");
    assert.ok(/traced to a 2014 California DECA/.test(specs), "the origin of the false claim is recorded so it cannot be reintroduced");
    assert.ok(
      /5 PIs x 10 \+ Solution 3 x 8 \+ Career Competencies 3 x 6 \+ Overall Impression 8 = 100/.test(specs),
      "the audited 2026-27 structure is recorded"
    );
    assert.ok(/Do not\s*\n\/\/ re-derive a point split from any comment, fixture or memory\./.test(specs), "and re-derivation is forbidden");
  });

  check("E2. a rubric line is never used as a performance indicator", () => {
    const ai = read("lib/ai.ts");
    assert.ok(/A RUBRIC LINE IS NOT A PERFORMANCE INDICATOR/.test(ai), "the distinction is recorded where it is enforced");
    assert.ok(
      !/const registryPis = registrySourced \? registryBreakdown\.categories\.map\(\(category\) => category\.name\) : \[\];/.test(ai),
      "scenario performance indicators are no longer derived from rubric CATEGORY NAMES"
    );
    assert.ok(/const registryPis: string\[\] = \[\];\s*\n\s*const hasRegistry = false;/.test(ai), "so the registry-PI path cannot fire");
    // The judge still consumes the rubric — that is the whole point of sourcing it.
    assert.ok(/const weightedCandidate = await getWeightedScoringRubric\("DECA", input\.eventType\);/.test(ai), "the JUDGE still resolves the weighted rubric (subject to the B4.1 semantic gate)");
    assert.ok(/result\.overallScore = computeWeightedOverall\(items\);/.test(ai), "and still computes the overall from the sourced point weights");
  });

  check("E3. control: the weighted-scoring gate itself is unchanged and still demands positive sourcing", () => {
    const specs = read("lib/competition-specs.ts");
    assert.ok(
      /const allPointed = breakdown\.categories\.every\(\(c\) => typeof c\.points === "number" && c\.points > 0 && c\.provenance === "sourced"\);/.test(specs),
      "B1's gate is intact — seeding data did not weaken it"
    );
  });

  // ============================================================================================
  // B4.1 — a sourced point split is not the same as a scoreable rubric. The five performance
  // indicator lines are point CONTAINERS; their text is scenario-specific and published separately.
  // ============================================================================================
  check("F1. a bare numbered performance-indicator slot is recognised as naming no scored behaviour", () => {
    for (const slot of ["Performance indicator 1", "Performance Indicator 5", "performance indicators", "Performance indicator", "  Performance Indicator 3  "]) {
      assert.equal(rubricLineNamesNoScoredBehaviour(slot), true, `point container: ${JSON.stringify(slot)}`);
    }
  });

  check("F2. real behaviour-naming rubric lines are NOT blocked — including HOSA's, so no cross-track regression", () => {
    for (const real of ["Test score", "Solution: Unique", "Solution: Practical", "Solution: Effective",
      "Career Competencies: Critical Thinking", "Career Competencies: Communication", "Career Competencies: Decision Making",
      "Overall Impression", "Use of Performance Indicators", "Performance indicators: handle guest concerns"]) {
      assert.equal(rubricLineNamesNoScoredBehaviour(real), false, `names a behaviour: ${JSON.stringify(real)}`);
    }
  });

  check("F3. the gate is applied at BOTH places that claim an official rubric", () => {
    const ai = read("lib/ai.ts");
    assert.ok(
      /if \(breakdown\.categories\.some\(\(category\) => rubricLineNamesNoScoredBehaviour\(category\.name\)\)\) return null;/.test(ai),
      "official attribution refuses a rubric with an unscoreable line"
    );
    assert.ok(
      /weightedCandidate && weightedCandidate\.categories\.every\(\(category\) => !rubricLineNamesNoScoredBehaviour\(category\.name\)\)/.test(ai),
      "weighted scoring refuses the same rubric"
    );
    // Scope the ordering check to the judge function: `const weighted =` also appears in the pure
    // weighting helper far earlier in the file.
    const judge = ai.slice(ai.indexOf("export async function judgeDecaRoleplay"));
    assert.ok(judge.indexOf("const weightedCandidate") < judge.indexOf("const weighted ="), "the candidate is gated before it becomes the weighted rubric");
    assert.ok(!/const weighted = await getWeightedScoringRubric/.test(judge), "the ungated assignment is gone");
  });

  check("F4. the judge request genuinely cannot carry performance-indicator text today", () => {
    const validators = read("lib/validators.ts");
    const schema = validators.slice(validators.indexOf("roleplayJudgeRequestSchema"), validators.indexOf("roleplayJudgeRequestSchema") + 400);
    assert.ok(!/performanceIndicator/i.test(schema), "the roleplay judge schema has no indicator field — the gap is structural, not a missed argument");
    const room = read("components/rooms/roleplay-room.tsx");
    const judgeCall = room.slice(room.indexOf("/api/ai/judge-deca"), room.indexOf("/api/ai/judge-deca") + 420);
    assert.ok(!/performanceIndicators/.test(judgeCall), "and the room does not send the indicators it renders to the learner");
  });

  console.log(
    `\nDECA P0 hardening smoke passed: ${checks} controls. Unknown areas are refused at the route and the ` +
      `builder fails fast instead of hanging; rubric provenance fails closed with an explicit unknown state and ` +
      `"official" is claimed only on positive proof; a DECA round without a rubric is refused before the provider ` +
      `call while provider failure still writes no ballot; the event label follows the chosen cluster; and the ` +
      `practice-test mean and single-score result band no longer claim mastery or readiness.`
  );
}

main();
