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
import { execSync } from "node:child_process";
import { rubricLineNamesNoScoredBehaviour } from "../lib/rubrics";
import { DECA_SIMULATION_CORE_PREP, DECA_SIMULATION_ENTRY, DECA_SIMULATION_SKILL_PREP, decaCourseEndAction, decaSimulationPrep, decaSimulationPrepAll } from "../lib/education/deca-simulation-prep";
import { EDUCATION_LESSONS, educationLessonsForTrack, getEducationLesson } from "../lib/education/registry";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { roleplayCourseMap } from "../lib/education/course-map";
import { learnerVisibleLesson } from "../lib/education/diagnosis";
import { HELD_DECA_CATALOG_SLUGS } from "../lib/education/tracks/deca";
import { getRoleplayLesson } from "../lib/roleplay-lessons";
import { RoleplayCourseFooter } from "../components/lessons/roleplay-lesson-view";
// tsconfig jsx=preserve => classic React.createElement, so React must be global before a component
// renders under this harness (the same priming scripts/nav-a11y-smoke.ts does).
(globalThis as { React?: unknown }).React = React;
import { learnerPathForTrack } from "../lib/learner-path";
import {
  DECA_DRILL_AREAS,
  DECA_DRILL_BANK,
  DECA_DRILL_HELD_IDS,
  buildDecaDrillSession,
  isDecaDrillArea,
  type DecaDrillArea
} from "../lib/deca-drills";

const read = (p: string) => readFileSync(p, "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "")).join("\n");
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

  // ---- P1-D. LEARN <-> SIMULATE, WITHOUT INVENTING PROGRESS -----------------------------------
  check("D1. the simulation prep path resolves to exactly the published role-play lessons", () => {
    const { core, skills } = decaSimulationPrep();
    // AUTHORED, NOT JUST RESOLVED. The resolver drops anything it cannot vouch for, which is right at
    // runtime and blind in a test: a mutation that added the HELD professional-communication lesson,
    // and two that added exam-side lessons, all passed a check that only counted what came out. So
    // the authored lists are asserted directly, and then every authored id must survive resolution —
    // a dropped entry is now a failure instead of a silence.
    assert.equal(DECA_SIMULATION_CORE_PREP.length, 3, "D1-a. exactly three lessons are AUTHORED as core prep");
    assert.equal(DECA_SIMULATION_SKILL_PREP.length, 2, "D1-b. exactly two are AUTHORED as supporting skills");
    assert.equal(core.length, DECA_SIMULATION_CORE_PREP.length,
      `D1-c. every authored core lesson resolves — none silently dropped (${core.length} of ${DECA_SIMULATION_CORE_PREP.length})`);
    assert.equal(skills.length, DECA_SIMULATION_SKILL_PREP.length,
      `D1-d. every authored skill lesson resolves — none silently dropped (${skills.length} of ${DECA_SIMULATION_SKILL_PREP.length})`);
    for (const authored of [...DECA_SIMULATION_CORE_PREP, ...DECA_SIMULATION_SKILL_PREP]) {
      const entry = EDUCATION_LESSONS.find((e) => e.id === authored.lessonId);
      assert.ok(entry, `D1-e. authored prep id ${authored.lessonId} is registered at all`);
      assert.equal(entry!.visibility, "learner", `D1-f. authored prep id ${authored.lessonId} is not held`);
      assert.equal(entry!.courseId, "deca-roleplay-core", `D1-g. authored prep id ${authored.lessonId} is role-play course content`);
    }
    assert.equal(core.length, 3, `D1. three core prep lessons resolve (${core.map((c) => c.lessonId).join(", ")})`);
    assert.equal(skills.length, 2, `D1b. two supporting skill lessons resolve (${skills.map((c) => c.lessonId).join(", ")})`);
    assert.deepEqual(core.map((c) => c.lessonId),
      ["how-deca-roleplay-works", "deca-reading-scenarios", "deca-identifying-problem"],
      "D1c. and they are orientation, then reading the scenario, then identifying the problem");
    for (const step of [...core, ...skills]) {
      const entry = EDUCATION_LESSONS.find((e) => e.id === step.lessonId);
      assert.ok(entry, `D1d. ${step.lessonId} is registered`);
      assert.equal(entry!.visibility, "learner", `D1e. ${step.lessonId} is learner-visible — a held lesson can never be prep`);
      assert.equal(entry!.track, "DECA", `D1f. ${step.lessonId} is DECA — no other track's lesson is DECA prep`);
      assert.equal(entry!.courseId, "deca-roleplay-core", `D1g. ${step.lessonId} is role-play course content`);
      assert.equal(step.href, `/lessons/${step.lessonId}`, `D1h. ${step.lessonId} links to its exact lesson, not a course page`);
      assert.ok(step.title.trim().length > 0, `D1i. ${step.lessonId} carries a real title`);
    }
  });

  check("D2. held and exam-side content is never simulation preparation", () => {
    // Authored ids, not resolved ones — for the same reason as D1-a: a bad entry must fail, not vanish.
    const ids = [...DECA_SIMULATION_CORE_PREP, ...DECA_SIMULATION_SKILL_PREP].map((p) => p.lessonId);
    assert.deepEqual(decaSimulationPrepAll().map((s) => s.lessonId), ids,
      "D2-a. and what renders is exactly what is authored, in order");
    // The held lesson stays held AND stays out of the path. Both, because either alone is not enough:
    // listing it would render nothing (the resolver drops it), which hides the mistake rather than
    // failing on it.
    assert.ok(!ids.includes("deca-professional-communication"), "D2. the held professional-communication lesson is not prep");
    assert.deepEqual(EDUCATION_LESSONS.filter((e) => e.id === "deca-professional-communication"), [],
      "D2b. and it is still absent from the learner registry entirely");
    // Cluster knowledge is exam-side. It transfers to some scenarios; it is not universal prep.
    for (const examLesson of ["deca-handling-customer-situations", "deca-who-the-customer-is", "deca-why-they-choose-you",
                              "deca-how-you-are-understood", "deca-the-offering-and-its-price",
                              "deca-getting-it-to-the-customer", "deca-telling-them-about-it"]) {
      assert.ok(!ids.includes(examLesson), `D2c. ${examLesson} is exam-side content, not a simulation prerequisite`);
    }
    // Proven structurally too: every prep id is role-play course, and none is business-content.
    const courses = new Set(ids.map((id) => EDUCATION_LESSONS.find((e) => e.id === id)?.courseId));
    assert.deepEqual([...courses], ["deca-roleplay-core"], "D2d. every prep lesson is role-play course content");
  });

  check("D3. the prep path recommends and never gates", () => {
    // COMMENT-STRIPPED, for the reason PA7 was repaired in P1-C.1: a comment explaining that the copy
    // must not say "you are not ready" is not the copy saying it. Scan what renders.
    const panel = stripComments(read("components/training/deca-simulation-prep-panel.tsx"));
    const setup = stripComments(read("components/training/deca-roleplay-setup.tsx"));
    // No readiness vocabulary anywhere on the path. Readiness is not measured, so it is not claimed.
    for (const banned of [/you are not ready/i, /not yet ready/i, /competition[- ]ready/i, /must complete/i,
                          /required before/i, /unlock/i, /locked/i]) {
      assert.ok(!banned.test(panel), `D3. the prep panel makes no readiness or gating claim (${banned})`);
      assert.ok(!banned.test(setup), `D3b. nor does the setup surface (${banned})`);
    }
    assert.ok(/Recommended before you simulate/.test(panel), "D3c. the panel says recommended, in those words");
    // NO HARD LOCK: the entry button is never disabled by prep state, and the setup reads no lesson
    // progress at all — there is no completion state in this product to read.
    assert.ok(/<Button type="button" onClick={enterRoom}>/.test(setup),
      "D3d. the enter-the-room button carries no disabled condition");
    for (const progressish of ["completed", "isComplete", "progress", "checkmark", "masteryPercent"]) {
      assert.ok(!setup.includes(progressish), `D3e. the setup surface reads no completion state (${progressish})`);
      assert.ok(!panel.includes(progressish), `D3f. nor does the panel (${progressish})`);
    }
  });

  check("D4. the ballot routes back to preparation and forward to another round", () => {
    const room = read("components/rooms/roleplay-room.tsx");
    const ballotAt = room.indexOf("{/* Ballot / Feedback. */}");
    assert.ok(ballotAt > 0, "control: the ballot section exists");
    const ballot = stripComments(room.slice(ballotAt));
    assert.ok(/DecaSimulationPrepPanel variant="after"/.test(ballot),
      "D4. the ballot offers the preparation lessons as review");
    assert.ok(/Run another role-play/.test(ballot), "D4b. and an action to run another one");
    // RETRY TRUTH: the runtime cannot reproduce a scenario, so the copy must not promise the same
    // case again. It routes to setup, where a new one is configured.
    assert.ok(!/same (case|scenario) again|retry this scenario/i.test(ballot),
      "D4c. and never promises the same scenario back, which the runtime cannot do");
    assert.ok(/router\.push\(`\/training\/\$\{track\}\/practice`/.test(ballot),
      "D4d. the retry action goes to the setup surface that starts a new one");
    // The review list must not be dressed as a diagnosis of this round.
    const panel = read("components/training/deca-simulation-prep-panel.tsx");
    assert.ok(/Nothing here says you got any of them wrong/.test(panel),
      "D4e. and says outright that the list diagnoses nothing");
  });

  check("D5. a scenario that fails to generate is not a dead end", () => {
    const room = read("components/rooms/roleplay-room.tsx");
    assert.ok(/Try generating the scenario again/.test(room),
      "D5. a generation failure offers a retry rather than stranding the learner");
    assert.ok(/generatedRef\.current = true; void generateScenario\(config\)/.test(room),
      "D5b. and the retry actually re-runs generation");
  });

  check("D6. simulation writes nothing, and cannot reach mastery", () => {
    // The four routes the room calls. None writes; none imports a mastery, XP or review helper. This
    // is the property that keeps a semantic practice result from standing in for drill evidence.
    for (const route of ["app/api/ai/deca-scenario/route.ts", "app/api/ai/roleplay-turn/route.ts",
                         "app/api/ai/judge-deca/route.ts", "app/api/ai/deca-objections/route.ts"]) {
      const src = stripComments(read(route));
      for (const writer of ["prisma.", "recordDrillMastery", "recordPracticeOutcome", "masteryProgress",
                            "skillReviewSchedule", "awardXp", "XPLog", "readiness"]) {
        assert.ok(!src.includes(writer), `D6. ${route} does not reach ${writer}`);
      }
    }
    // And the room itself writes nothing.
    const room = stripComments(read("components/rooms/roleplay-room.tsx"));
    for (const writer of ["recordDrillMastery", "recordPracticeOutcome", "masteryProgress", "/api/deca/drills/submit"]) {
      assert.ok(!room.includes(writer), `D6b. the room does not reach ${writer}`);
    }
    // Specifically the exam-side skills: a role-play must never move cluster mastery.
    for (const examSkill of ["deca-customer-relations", "deca-marketing"]) {
      assert.ok(!room.includes(examSkill), `D6c. the room names no exam mastery skill (${examSkill})`);
      for (const route of ["app/api/ai/judge-deca/route.ts"]) {
        assert.ok(!stripComments(read(route)).includes(examSkill), `D6d. nor does the judge (${examSkill})`);
      }
    }
  });

  check("D7. the ballot stays practice feedback, never an official score", () => {
    const room = read("components/rooms/roleplay-room.tsx");
    const ballot = stripComments(room.slice(room.indexOf("{/* Ballot / Feedback. */}")));
    // The authored instrument is never labelled with official DECA authority.
    for (const banned of [/official DECA (score|rubric|ballot)/i, /judge'?s official/i, /competition score/i,
                          /you are ready/i, /competition[- ]ready/i, /mastered/i]) {
      assert.ok(!banned.test(ballot), `D7. the ballot makes no official or readiness claim (${banned})`);
    }
    // The provenance pill sits WITH the scores, so the numbers are never read without it.
    assert.ok(/officialPill/.test(ballot), "D7b. the provenance pill is rendered on the ballot itself");
    assert.ok(/generic practice — not official/.test(room),
      "D7c. and its unsourced state says so in the learner's own words");
    // The PI completeness gate is untouched: a rubric line that names no behaviour cannot enable
    // weighted official scoring. Asserted against the predicate itself, executed.
    assert.equal(rubricLineNamesNoScoredBehaviour("Performance Indicators"), true,
      "D7d. a bare performance-indicator line still names no scored behaviour");
    assert.equal(rubricLineNamesNoScoredBehaviour("Explains the nature of business ethics"), false,
      "D7e. control: a line that names a behaviour still passes the gate");
  });

  check("D8. the DECA course ends at the role-play, and only the DECA course does", () => {
    // Derived from the chain, so it moves with the terminus instead of pinning one lesson id.
    assert.equal(decaCourseEndAction("deca-justifying-your-recommendation")?.href, "/training/deca/practice",
      "D8. the role-play course's last lesson offers the role-play");
    for (const notTerminal of ["deca-reading-scenarios", "deca-identifying-problem", "deca-understanding-performance-indicators"]) {
      assert.equal(decaCourseEndAction(notTerminal), null, `D8b. ${notTerminal} is mid-chain and offers nothing`);
    }
    // Other courses are untouched: Debate's terminus and the exam course's termini render as before.
    for (const otherCourse of ["debate-weighing", "deca-telling-them-about-it", "deca-handling-customer-situations"]) {
      assert.equal(decaCourseEndAction(otherCourse), null, `D8c. ${otherCourse} is not given a DECA role-play action`);
    }
    assert.ok(!/official|assessment|final test|ready/i.test(DECA_SIMULATION_ENTRY.label + " " + DECA_SIMULATION_ENTRY.detail),
      "D8d. and the action's copy claims no assessment and no readiness");
    assert.ok(/nothing you do there is recorded/i.test(DECA_SIMULATION_ENTRY.detail),
      "D8e. it says plainly that the role-play records nothing, which is currently true");
  });

  // ---- D9/D10. NAVIGATION TRUTH (P1 freeze repair) ---------------------------------------------
  // The freeze audit's lesson: "the route resolves" is not enough. Every important edge needs three
  // things checked — what the LABEL promises, what the DESTINATION actually is, and whether the
  // CONTENT the label named is reachable there. Both defects below passed a link check.
  check("D9. no learner-facing DECA action promises a fixed practice duration", () => {
    const home = stripComments(read("app/(app)/home/page.tsx"));
    // `(?!-)` so a Tailwind class like "mt-3 min-h-11" is not read as "3 min" — the check is for a
    // duration a learner reads, not for every digit that happens to precede the letters m-i-n.
    for (const banned of [/Practice \d+ minutes?/i, /\d+-minute practice/i, /\b\d+\s*min(?:ute)?s?\b(?!-)/i]) {
      assert.ok(!banned.test(home), `D9. the home quick actions promise no fixed duration (${banned})`);
    }
    // The label must name the ACTIVITY, and it must differ by track because the three destinations
    // are three different things — a Debate drill, a DECA role-play, a HOSA preparation room.
    assert.ok(/Practice a role-play/.test(home), "D9b. DECA's practice action names the role-play");
    assert.ok(/Practice a skill drill/.test(home), "D9c. Debate's names its drill");
    assert.ok(/Practice your event/.test(home), "D9d. and HOSA's names its event preparation");
    assert.ok(/activeTrack\?\.id === "DECA"/.test(home), "D9e. the label is chosen from the active track, not hardcoded");
  });

  check("D10. every DECA navigation label reaches what it names", () => {
    const hub = stripComments(read("app/(app)/training/[track]/page.tsx"));
    // "Skill drills" pointed at /skills, whose DECA branch renders "Mastery paths" and a single tile
    // linking to the role-play setup — no drill on the page at all. The label was the promise; the
    // href was what was wrong.
    assert.ok(/track\.id === "DECA" \? `\/study-arcade\?track=\$\{track\.slug\}`/.test(hub),
      "D10. the Skill drills row sends a DECA learner to the surface that has the DECA drills");
    assert.ok(/`\/skills\?track=\$\{track\.slug\}`/.test(hub),
      "D10b. and every other track keeps its existing destination — Debate's /skills branch does carry its drill tile");
    // CONTENT REACHABLE: the destination really serves the four DECA drill areas.
    const arcade = stripComments(read("app/(app)/study-arcade/page.tsx"));
    assert.ok(/ConceptDrills/.test(arcade), "D10c. control: the destination renders the concept drills");
    // And the surface it no longer points at really has no drill for DECA, which is why it moved.
    const skillPath = stripComments(read("components/skills/skill-path.tsx"));
    const decaBranch = skillPath.slice(skillPath.indexOf('canonical === "DECA"'), skillPath.indexOf('canonical === "HOSA"'));
    assert.ok(decaBranch.length > 50, "control: the DECA branch was located");
    assert.ok(!/study-arcade\?track=deca/.test(decaBranch),
      "D10d. control: /skills' DECA branch still offers no drill, which is the reason for D10");
  });

  check("D11. the DECA Learn stage opens the DECA lesson catalog, not one lesson", () => {
    const deca = learnerPathForTrack("DECA");
    const learn = deca.find((stage: { id: string }) => stage.id === "learn");
    assert.equal(learn?.href, "/lessons?track=deca", "D11. Learn opens the catalog");
    assert.ok(!/^\/lessons\/[a-z]/.test(learn?.href ?? ""), "D11b. and not a single-lesson route");
    // CONTENT REACHABLE: every published DECA lesson is in what that catalog lists, and no held one is.
    const visible = educationLessonsForTrack("DECA").filter((e: { visibility: string }) => e.visibility === "learner");
    assert.equal(visible.length, 12, `D11c. the catalog exposes all twelve published DECA lessons (${visible.length})`);
    assert.ok(visible.some((e: { id: string }) => e.id === "how-deca-roleplay-works"),
      "D11d. including the lesson the stage used to open on its own");
    assert.ok(!visible.some((e: { id: string }) => e.id === "deca-professional-communication"),
      "D11e. and no held lesson is reached");
    // NON-REGRESSION: the other two tracks' Learn stages are untouched by this repair.
    assert.equal(learnerPathForTrack("GENERAL_DEBATE").find((s: { id: string }) => s.id === "learn")?.href,
      "/lessons?track=debate", "D11f. Debate's Learn stage is unchanged");
    assert.equal(learnerPathForTrack("HOSA").find((s: { id: string }) => s.id === "learn")?.href,
      "/lessons/how-hosa-scenario-interaction-works",
      "D11g. and HOSA's is unchanged — it has one published lesson, so the single-lesson form is still truthful there");
  });

  // ---- D12/D13. OWNER-QA REPAIR 1 ---------------------------------------------------------------
  // Found by using the product, not by reading it: a DECA-scoped page attributing another track's
  // recorded results to DECA, a continuation claim with no continuation state behind it, and an empty
  // review list pointing away from the only surface that could fill it.
  check("D12. the record tiles count only the active track, and claim no history they cannot prove", () => {
    const arcade = stripComments(read("app/(app)/study-arcade/page.tsx"));
    // TRACK TRUTH: the count is scoped through the Skill's own organization, not fetched globally.
    assert.ok(/skill: \{ organization: activeTrack\.organization \}/.test(arcade),
      "D12. the recorded-skill count is scoped by Skill.organization");
    assert.ok(!/masteryProgress\.count\(\{ where: \{ userId: session\.user\.id, lastPracticedAt: \{ not: null \} \} \}\)/.test(arcade),
      "D12b. and the unscoped global count is gone");
    // FAIL CLOSED: no resolved track means no count, matching the due-review contract.
    assert.ok(/if \(session\?\.user\?\.id && activeTrack\) \{/.test(arcade),
      "D12c. an unresolved track yields no count rather than every track's");
    // CONTINUATION TRUTH: nothing may claim prior activity, because nothing records it.
    for (const banned of [/Pick up where you left off/i, /where you left off/i, /Continue \$\{activeTrack\.label\}/]) {
      assert.ok(!banned.test(arcade), `D12d. no continuation claim without continuation state (${banned})`);
    }
    assert.ok(/Practise \$\{activeTrack\.label\}/.test(arcade), "D12e. the tile names the practice instead");
    assert.ok(/are available below/.test(arcade), "D12f. and describes what exists rather than what the learner did");
    // Non-vacuity: the tile still renders something, and still reads a real count.
    assert.ok(/practicedSkills > 0/.test(arcade), "D12g. control: the record tile still branches on a real count");
  });

  check("D13. an empty DECA review list points at the surface that holds DECA drills", () => {
    const review = stripComments(read("app/(app)/study-arcade/review/page.tsx"));
    // LABEL -> DESTINATION -> CONTENT, the standing learner-graph contract.
    assert.ok(/activeTrack\?\.id === "DECA"/.test(review), "D13. the empty-state destination is track-derived");
    assert.ok(/`\/study-arcade\?track=\$\{activeTrack\.slug\}`/.test(review),
      "D13b. DECA goes to the Study Arcade track surface, with the track preserved");
    assert.ok(/the DECA skill drills/.test(review), "D13c. and the label names drills, which is what is there");
    // The destination really renders them.
    assert.ok(/ConceptDrills/.test(stripComments(read("app/(app)/study-arcade/page.tsx"))),
      "D13d. control: that destination renders the concept drills");
    // The surface it no longer points DECA at genuinely has no DECA drill — the reason for the move.
    const skillPath = stripComments(read("components/skills/skill-path.tsx"));
    const decaBranch = skillPath.slice(skillPath.indexOf('canonical === "DECA"'), skillPath.indexOf('canonical === "HOSA"'));
    assert.ok(decaBranch.length > 50 && !/study-arcade/.test(decaBranch),
      "D13e. control: /skills' DECA branch still offers no drill");
    // Debate and HOSA keep their existing destination — Debate's /skills branch does carry its drill.
    assert.ok(/\{ href: "\/skills", label: "Skills" \}/.test(review),
      "D13f. every other track is unchanged");
    assert.ok(/debate-drills|study-arcade\?track=debate/.test(skillPath),
      "D13g. control: Debate's /skills branch really does carry a drill tile, which is why it is unchanged");
  });

  // ---- D14. PRACTICE-SOURCE TRUTH (owner QA #6 adjudication) --------------------------------------
  check("D14. the practice source is stated, not selected — a control must affect behaviour to exist", () => {
    // OWNER QA REPAIR 1A. The learner-graph rule now has a fourth leg: label promise -> destination
    // and content -> and, for interactive UI, the control actually changes behaviour. A three-way
    // source selector sat on the DECA hub whose value nothing read. Static truth replaced it.
    const controls = stripComments(read("components/training/track-controls.tsx"));
    // A. no interactive selector remains while only one source exists
    assert.ok(!/PRACTICE_SOURCES|setSource|useState<PracticeSource>|aria-pressed=\{source/.test(controls),
      "D14. no interactive practice-source selector remains");
    // C/D. no selectable Past Competition or Mixed mode
    for (const gone of [/Past Competition/, /\bMixed\b/, /AI Practice/]) {
      assert.ok(!gone.test(controls), `D14b. no selectable source mode remains (${gone})`);
    }
    // B. the one source that exists is named truthfully, as AI-generated CompeteReady practice
    assert.ok(/AI-generated CompeteReady practice/.test(controls), "D14c. the source is identified as AI-generated CompeteReady practice");
    assert.ok(/not official DECA prompts/.test(controls), "D14d. and explicitly not official DECA prompts");
    // E. no claim that verified past material exists — only that it does not yet
    assert.ok(/Verified past competition prompts are not available for this event yet/.test(controls),
      "D14e. the absence of verified past prompts is stated");
    for (const falseClaim of [/official DECA practice/i, /verified past competition prompts are available/i, /both verified past material/i, /mixed source/i]) {
      assert.ok(!falseClaim.test(controls), `D14f. no claim that past or official material is served (${falseClaim})`);
    }
    // The track switcher on the same row is a REAL control and stays.
    assert.ok(/Switch track/.test(controls) && /href=\{"\/training" as Route\}/.test(controls), "D14g. the Switch track control is untouched");
    // F. scenario generation reads no source: request schema and payload carry none.
    for (const f of ["app/api/ai/deca-scenario/route.ts", "components/rooms/roleplay-room.tsx", "components/rooms/roleplay-config.ts"]) {
      assert.ok(!/practiceSource|PracticeSource|"PAST"|"MIXED"/.test(stripComments(read(f))), `D14h. ${f} carries no practice-source input — generation is unchanged`);
    }
  });

  check("D15. the orientation's course state is the registry's, and it continues into the published course", () => {
    // OWNER QA REPAIR 3A. The orientation was authored as the only DECA lesson: a hand-written course
    // map badged every other lesson "Coming soon" and the page ended with no next step, long after the
    // role-play lessons it named were published. The map and the next step are now DERIVED from the
    // registry through the same fail-closed resolver the prep path uses, and rendered from that.
    const ORIENTATION = "how-deca-roleplay-works";
    const ROLEPLAY_COURSE = ["how-deca-roleplay-works", "deca-reading-scenarios", "deca-understanding-performance-indicators", "deca-identifying-problem", "deca-justifying-your-recommendation"];
    // A. the registry chain: orientation -> the published scenario lesson, same track, same course.
    const entry = getEducationLesson(ORIENTATION);
    assert.ok(entry && entry.visibility === "learner", "D15a. the orientation is registered and learner-visible");
    assert.equal(entry!.nextLessonId, "deca-reading-scenarios", "D15b. the orientation continues into Reading the Scenario");
    const next = getEducationLesson(entry!.nextLessonId!);
    assert.ok(next && next.visibility === "learner" && next.track === "DECA" && next.courseId === entry!.courseId,
      "D15c. the next lesson is published, DECA-owned and in the same role-play course");
    // B. the derived map is exactly the published role-play course, in canonical order, all resolving.
    const course = roleplayCourseMap(ORIENTATION);
    assert.ok(course, "D15d. the course map derives");
    assert.deepEqual(course!.lessons.map((l) => l.lessonId), ROLEPLAY_COURSE, "D15e. it lists exactly the published role-play lessons, in order");
    for (const item of course!.lessons) {
      assert.equal(item.href, `/lessons/${item.lessonId}`, `D15f. ${item.lessonId} links to its exact lesson`);
      assert.equal(EDUCATION_LESSONS.find((e) => e.id === item.lessonId)?.visibility, "learner", `D15g. ${item.lessonId} is learner-visible`);
      assert.equal(EDUCATION_LESSONS.find((e) => e.id === item.lessonId)?.track, "DECA", `D15g2. ${item.lessonId} is DECA`);
    }
    assert.equal(course!.currentId, ORIENTATION, "D15h. the orientation is marked current");
    assert.equal(course!.next?.lessonId, "deca-reading-scenarios", "D15i. next resolves to the published scenario lesson");
    assert.equal(course!.next?.href, "/lessons/deca-reading-scenarios", "D15i2. and links to that lesson — not a course page, a drill, a simulation or another track");
    // C. the held lesson cannot become published by any of this.
    assert.ok(HELD_DECA_CATALOG_SLUGS.includes("deca-professional-communication"), "D15j. professional communication is still held");
    assert.equal(getEducationLesson("deca-professional-communication"), undefined, "D15j2. and is not registered");
    assert.equal(learnerVisibleLesson("deca-professional-communication"), null, "D15j3. and never resolves as a learner-visible destination");
    assert.ok(!course!.lessons.some((l) => l.lessonId === "deca-professional-communication"), "D15j4. and is absent from the map");
    assert.equal(EDUCATION_LESSONS.filter((e) => e.track === "DECA" && e.visibility === "learner").length, 12, "D15k. DECA still publishes exactly twelve");
    // D. rendered truth: no false availability claim survives on the DECA orientation footer.
    const decaLesson = getRoleplayLesson(ORIENTATION)!;
    const html = renderToStaticMarkup(React.createElement(RoleplayCourseFooter, { lesson: decaLesson, course: course! } as never));
    assert.ok(html.includes("Continue to Reading the Scenario"), "D15l. the next action names the published next lesson");
    assert.ok(html.includes('href="/lessons/deca-reading-scenarios"'), "D15l2. and links to it");
    for (const id of ROLEPLAY_COURSE.slice(1)) assert.ok(html.includes(`href="/lessons/${id}"`), `D15m. ${id} is a real link on the map`);
    for (const stale of ["Coming soon", "being written", "pilot lesson", "on the way", "ready now", "being authored", "will appear here", "Reading and Decoding"]) {
      assert.ok(!html.includes(stale), `D15n. no stale or forward-looking availability claim remains: "${stale}"`);
    }
    // Numbering agrees with the header badge ("Performance Course · Lesson 0"): the map counts from 0.
    assert.ok(html.includes("0. How a DECA Role-Play Works"), "D15n2. the orientation is lesson 0 on the map, as on its badge");
    assert.ok(html.includes("1. Reading the Scenario"), "D15n3. and the next published lesson is 1");
    assert.ok(!html.includes("5. Justifying"), "D15n4. no 1-based numbering leaks in");
    assert.equal((html.match(/Available/g) ?? []).length, ROLEPLAY_COURSE.length - 1, "D15o. every other published lesson is marked Available");
    assert.equal((html.match(/You&#x27;re here|You're here/g) ?? []).length, 1, "D15o2. and exactly one is marked current");
    // Non-vacuity: the stale-claim detector really fires on the hand-written outline (HOSA, out of scope).
    const hosaLesson = getRoleplayLesson("how-hosa-scenario-interaction-works")!;
    const hosaHtml = renderToStaticMarkup(React.createElement(RoleplayCourseFooter, { lesson: hosaLesson } as never));
    assert.ok(hosaHtml.includes("Coming soon") && hosaHtml.includes("being written"), "D15-C. control: the legacy outline still renders its own copy where it is still used");
    // Fail closed, not open: if derivation ever returned null for DECA, the fallback must not resurrect
    // the stale copy over an empty outline — a lesson with no hand-written outline renders none of it.
    const fallbackHtml = renderToStaticMarkup(React.createElement(RoleplayCourseFooter, { lesson: decaLesson } as never));
    for (const stale of ["Coming soon", "being written", "pilot lesson", "on the way", "ready now"]) {
      assert.ok(!fallbackHtml.includes(stale), `D15-C2. the DECA fallback (no derived course) shows no stale copy either: "${stale}"`);
    }
    assert.ok(!fallbackHtml.includes('id="coursemap"'), "D15-C3. and no empty course map");
    // The next step is scoped to the course: a chain into another course or track yields no next step.
    const cm = stripComments(read("lib/education/course-map.ts"));
    assert.ok(/nextEntry\.track === entry\.track && nextEntry\.courseId === entry\.courseId/.test(cm), "D15u. next is accepted only from the same track AND the same course");
    assert.ok(/const next = nextInCourse \? learnerVisibleLesson\(nextEntry\.id\) : null;/.test(cm), "D15u2. anything else is no next step, never a guess");
    // The no-next branch's nav label equals its rendered heading (OnThisPage targets stay truthful).
    assert.ok(/End of this course so far<\/h2>/.test(stripComments(read("components/lessons/roleplay-lesson-view.tsx"))), "D15v. the end-of-course heading text");
    assert.ok(/course\.next \? course\.next\.title : "End of this course so far"/.test(stripComments(read("app/(app)/lessons/[slug]/page.tsx"))), "D15v2. equals the OnThisPage label for it");
    // E. the lesson data no longer carries a second map, and its next label is the registry's title.
    assert.equal(decaLesson.courseMap, undefined, "D15p. the DECA lesson carries no hand-written course map");
    assert.equal(decaLesson.nextLesson.label, learnerVisibleLesson("deca-reading-scenarios")?.title, "D15q. its next-lesson label is the published lesson's real title");
    // F. the route derives for DECA only, passes it down, and Back stays the DECA catalog.
    const route = stripComments(read("app/(app)/lessons/[slug]/page.tsx"));
    assert.ok(/const course = roleplay\.track === "deca" \? roleplayCourseMap\(roleplay\.slug\) \?\? undefined : undefined;/.test(route), "D15r. the route derives the course from the registry for DECA");
    assert.ok(/<RoleplayCourseFooter lesson=\{roleplay\} course=\{course\} \/>/.test(route), "D15r2. and hands it to the footer");
    assert.ok(/href=\{`\/lessons\?track=\$\{owner\.slug\}` as Route\}/.test(route), "D15s. Back still returns to the owner's catalog");
    const view = stripComments(read("components/lessons/roleplay-lesson-view.tsx"));
    assert.ok(!/from "@\/lib\/education/.test(view), "D15t. the renderer still imports nothing from lib/education");
  });

  console.log(
    `\nDECA P0 hardening smoke passed: ${checks} controls. Unknown areas are refused at the route and the ` +
      `builder fails fast instead of hanging; rubric provenance fails closed with an explicit unknown state and ` +
      `"official" is claimed only on positive proof; a DECA round without a rubric is refused before the provider ` +
      `call while provider failure still writes no ballot; the event label follows the chosen cluster; and the ` +
      `practice-test mean and single-score result band no longer claim mastery or readiness. P1-D connected ` +
      `Learn to Simulate in both directions: the three core prep lessons and two role-play skills resolve to ` +
      `their exact published lessons through the same fail-closed resolver the post-round diagnosis uses, the ` +
      `held professional-communication lesson and every exam-side cluster lesson are excluded structurally ` +
      `rather than by list, the path recommends without gating and reads no completion state because none ` +
      `exists, the ballot routes back to that preparation and forward to another round without promising a ` +
      `scenario the runtime cannot reproduce, a failed generation offers a retry instead of stranding the ` +
      `learner, and the four role-play routes still write nothing at all — so a semantic practice result ` +
      `cannot stand in for drill evidence, least of all for the two exam mastery areas.`
  );
}

main();
