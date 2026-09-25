/**
 * test-result-recommendations:smoke — what a graded practice test recommends, per track.
 *
 * Deterministic and offline: the real registry and DECA bridge, the pure results module, and the
 * "What to work on" card rendered with react-dom/server. No provider, no database, no network, and no
 * real test is submitted — every graded result here is a fixture shaped like the grader's output.
 *
 * What it protects:
 *   1. a HOSA result never renders DECA copy and never goes through the DECA bridge
 *   2. HOSA's stored suggestions stay visible — named, not linked, not counted — when no lesson exists
 *   3. a DECA lesson renders once, however many sources name it, and the tile counts distinct lessons
 *   4. nothing held, unregistered or cross-track is ever recommended
 *   5. supported DECA diagnoses still reach the same published lesson and drill; unsupported ones stay
 *      named as uncovered
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// tsconfig jsx=preserve => classic React.createElement; the global must exist before components load.
(globalThis as { React?: unknown }).React = React;
/* eslint-disable @typescript-eslint/no-var-requires */
const {
  buildTestResultRecommendations,
  publishedLesson,
  testResultRecommendationsForLearner,
  weakAreaExplanation
} = require("../lib/education/test-result-recommendations");
const { decaDiagnosticRoutesForLearner } = require("../lib/education/deca-diagnostic-bridge");
const { ResultRecommendationsCard } = require("../components/tests/result-recommendations");

type Stored = { lessonSlug: string; title?: string; reason: string };
type Route = { lessonId: string; lessonHref: string; drillHref: string; areaLabel: string; why: string; diagnostic: string };

const read = (path: string) => readFileSync(path, "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const render = (model: unknown, trackLabel: string) =>
  renderToStaticMarkup(React.createElement(ResultRecommendationsCard, { recommendations: model, trackLabel }));
const lessonLinks = (html: string) => [...html.matchAll(/href="(\/lessons\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));

/** What the grader stores for a DECA test today: the bridge routes, re-shaped (grade/route.ts). */
const gradedDecaStore = (weakAreas: string[]): Stored[] =>
  (decaDiagnosticRoutesForLearner(weakAreas) as Route[]).map((route) => ({
    lessonSlug: route.lessonId,
    title: route.areaLabel,
    reason: route.why
  }));

/** What the grader stores for a HOSA test: seeded legacy lesson rows (grade/route.ts, legacy branch). */
const HOSA_MT_STORE: Stored[] = [
  { lessonSlug: "hosa-medical-terminology-1", title: "Word roots", reason: "Targets Medical Terminology, which appeared in your missed-question pattern." },
  { lessonSlug: "hosa-medical-terminology-2", title: "Clinical abbreviations", reason: "Targets Medical Terminology, which appeared in your missed-question pattern." },
  { lessonSlug: "hosa-medical-terminology-3", title: "Terminology in patient scenarios", reason: "Targets Medical Terminology, which appeared in your missed-question pattern." }
];

const results: string[] = [];
let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    results.push(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    results.push(`FAIL ${name}\n     ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ---------------------------------------------------------------------------------------------
check("TR-1. DECA supported diagnosis: one card per lesson, the bridge's destinations, counted once", () => {
  const weakAreas = ["Promotion strategy", "Target market analysis"];
  const bridge = decaDiagnosticRoutesForLearner(weakAreas) as Route[];
  assert.equal(bridge.length, 2, "fixture: the bridge routes these two diagnoses to two lessons");
  const model = testResultRecommendationsForLearner({ organization: "DECA", weakAreas, stored: gradedDecaStore(weakAreas) });
  assert.deepEqual(model.diagnosticRoutes, bridge, "TR-1a the DECA destinations are exactly the bridge's, unchanged");
  assert.deepEqual(model.diagnosticRoutes.map((r: Route) => [r.lessonId, r.lessonHref, r.drillHref]), [
    ["deca-telling-them-about-it", "/lessons/deca-telling-them-about-it?track=deca", "/study-arcade?track=deca&area=marketing-fundamentals"],
    ["deca-who-the-customer-is", "/lessons/deca-who-the-customer-is?track=deca", "/study-arcade?track=deca&area=marketing-fundamentals"]
  ], "TR-1b promotion -> MK6 and target market -> MK1, each with the marketing drill");
  assert.equal(model.storedLessons.length, 0, "TR-1c the grader's stored copy of the same routes is not listed again");
  assert.equal(model.lessonCount, 2, "TR-1d two distinct lessons count as two, not four");
  const html = render(model, "DECA");
  const links = lessonLinks(html);
  assert.equal(links.length, new Set(links).size, "TR-1e no lesson link renders twice");
  assert.equal(new Set(links).size, model.lessonCount, "TR-1f the tile's number equals the distinct lessons on the card");
  assert.ok(!html.includes("Also recommended"), "TR-1g no duplicate 'Also recommended' block");
  assert.equal(model.firstLessonHref, "/lessons/deca-telling-them-about-it?track=deca", "TR-1h the next-step link is a full path");
});

check("TR-2. DECA unsupported diagnosis stays named as uncovered, with no invented destination", () => {
  const model = testResultRecommendationsForLearner({ organization: "DECA", weakAreas: ["Financial analysis", "Budgeting"], stored: [] });
  assert.equal(model.diagnosticRoutes.length, 0);
  assert.deepEqual(model.uncoveredDiagnostics, ["Financial analysis", "Budgeting"]);
  assert.equal(model.lessonCount, 0);
  assert.equal(model.firstLessonHref, null);
  const html = render(model, "DECA");
  // Final DECA QA: the gap is named as what is LINKED. "No DECA lesson covers X" was false for areas a
  // published lesson teaches but the bridge has no row for (a Distribution test flags "Distribution").
  assert.match(html, /Financial analysis and Budgeting aren(?:'|&#x27;)t linked to a DECA lesson yet/, "TR-2a the gap is named");
  assert.ok(!html.includes("No DECA lesson covers"), "TR-2a1 and never as a claim about what the curriculum teaches");
  assert.ok(html.includes("Nothing here maps to a written DECA lesson yet"), "TR-2b and the DECA empty state stays DECA's");
  assert.equal(lessonLinks(html).length, 0, "TR-2c no lesson link");
});

check("TR-3. a distinct, legitimate stored DECA lesson is kept once; held, retired and cross-track ones never link", () => {
  const model = testResultRecommendationsForLearner({
    organization: "DECA",
    weakAreas: ["Promotion strategy"],
    stored: [
      { lessonSlug: "deca-telling-them-about-it", title: "Marketing fundamentals", reason: "route copy" },
      { lessonSlug: "deca-reading-scenarios", reason: "distinct and published" },
      { lessonSlug: "deca-reading-scenarios", reason: "named twice" },
      { lessonSlug: "deca-professional-communication", reason: "held" },
      { lessonSlug: "deca-marketing-1", title: "Segmentation basics", reason: "retired pre-bridge row" },
      { lessonSlug: "claim-warrant-impact", reason: "a Debate lesson" },
      { lessonSlug: "how-hosa-scenario-interaction-works", reason: "a HOSA lesson" }
    ]
  });
  assert.deepEqual(model.storedLessons.map((l: { lessonId: string }) => l.lessonId), ["deca-reading-scenarios"], "TR-3a only the distinct DECA lesson is listed");
  assert.equal(model.storedLessons[0].href, "/lessons/deca-reading-scenarios?track=deca");
  assert.equal(model.lessonCount, 2, "TR-3b route + one distinct stored lesson");
  assert.equal(model.olderRecordCount, 4, "TR-3c held, retired and both cross-track rows are disclosed as a count only");
  const links = lessonLinks(render(model, "DECA"));
  for (const forbidden of ["deca-professional-communication", "deca-marketing-1", "claim-warrant-impact", "how-hosa-scenario-interaction-works"]) {
    assert.ok(!links.some((href) => href.includes(forbidden)), `TR-3d ${forbidden} is never linked`);
  }
  assert.equal(links.length, model.lessonCount, "TR-3e links equal the count");
});

check("TR-4. HOSA with the grader's existing suggestions: visible, truthful, no DECA anything", () => {
  const model = testResultRecommendationsForLearner({ organization: "HOSA", weakAreas: ["Medical terminology"], stored: HOSA_MT_STORE });
  assert.equal(model.organization, "HOSA");
  assert.deepEqual(model.diagnosticRoutes, [], "TR-4a no DECA route");
  assert.deepEqual(model.uncoveredDiagnostics, [], "TR-4b no DECA gap list");
  assert.deepEqual(model.unwrittenTopics.map((t: { title: string }) => t.title), ["Word roots", "Clinical abbreviations", "Terminology in patient scenarios"], "TR-4c all three suggestions stay visible");
  assert.equal(model.olderRecordCount, 0, "TR-4d none is hidden as an older record");
  assert.equal(model.lessonCount, 0, "TR-4e none counts as a lesson: none has a written lesson");
  const html = render(model, "HOSA");
  assert.ok(!html.includes("DECA"), "TR-4f the HOSA card contains no DECA text at all");
  for (const title of ["Word roots", "Clinical abbreviations", "Terminology in patient scenarios"]) assert.ok(html.includes(title), `TR-4g ${title} is shown`);
  assert.ok(html.includes("There is no written HOSA lesson for these topics yet"), "TR-4h the limitation is stated");
  assert.equal(lessonLinks(html).length, 0, "TR-4i and nothing unpublished is linked as a lesson");
  assert.ok(!/href="\/skills\//.test(html), "TR-4j nor sent to the older-record page as if it were a lesson");
});

check("TR-5. HOSA with no suggestion and no teaching owner says so in HOSA's words", () => {
  const model = testResultRecommendationsForLearner({ organization: "HOSA", weakAreas: ["Healthcare ethics"], stored: [] });
  const html = render(model, "HOSA");
  assert.ok(html.includes("Nothing here maps to a written HOSA lesson yet"), "TR-5a truthful HOSA limitation");
  assert.ok(!html.includes("DECA"), "TR-5b no DECA text");
  assert.equal(model.lessonCount, 0);
});

check("TR-6. HOSA never reaches the DECA bridge, even with DECA-shaped diagnoses", () => {
  let bridgeCalls = 0;
  const spy = {
    decaRoutes: () => { bridgeCalls += 1; return [{ lessonId: "deca-telling-them-about-it" }]; },
    decaUncovered: () => { bridgeCalls += 1; return ["Promotion strategy"]; },
    publishedLesson
  };
  const model = buildTestResultRecommendations({ organization: "HOSA", weakAreas: ["Promotion strategy"], stored: [] }, spy);
  assert.equal(bridgeCalls, 0, "TR-6a the bridge is not called for HOSA");
  assert.deepEqual(model.diagnosticRoutes, []);
  const deca = buildTestResultRecommendations({ organization: "DECA", weakAreas: ["Promotion strategy"], stored: [] }, spy);
  assert.equal(bridgeCalls, 2, "TR-6b control: the same spy IS called for DECA");
  assert.equal(deca.diagnosticRoutes.length, 1);
});

check("TR-7. a published HOSA lesson is linked on HOSA's track; a DECA lesson stored on a HOSA test is not shown at all", () => {
  const model = testResultRecommendationsForLearner({
    organization: "HOSA",
    weakAreas: [],
    stored: [
      { lessonSlug: "how-hosa-scenario-interaction-works", reason: "published HOSA" },
      { lessonSlug: "deca-telling-them-about-it", title: "Telling them about it", reason: "cross-track" }
    ]
  });
  assert.deepEqual(model.storedLessons.map((l: { href: string }) => l.href), ["/lessons/how-hosa-scenario-interaction-works?track=hosa"]);
  assert.equal(model.unwrittenTopics.length, 0, "TR-7a the DECA lesson is not renamed into a HOSA topic");
  assert.equal(model.olderRecordCount, 1);
  const html = render(model, "HOSA");
  assert.ok(!html.includes("DECA") && !html.includes("Telling them about it"), "TR-7b no DECA lesson or text on a HOSA card");
});

check("TR-8. an organization with no track links nothing and names nothing", () => {
  const model = testResultRecommendationsForLearner({ organization: "MODEL_UN", weakAreas: ["Bloc leadership"], stored: [{ lessonSlug: "mun-caucus-1", reason: "x" }] });
  assert.equal(model.organization, "OTHER");
  assert.equal(model.lessonCount + model.unwrittenTopics.length + model.diagnosticRoutes.length, 0);
  assert.equal(model.olderRecordCount, 1);
  assert.ok(!render(model, "Model UN").includes("DECA"));
});

check("TR-9. the weak-area sentence promises a skill mapping only where one exists", () => {
  assert.match(weakAreaExplanation("DECA"), /recorded skill/);
  assert.ok(!/recorded skill|DECA/.test(weakAreaExplanation("HOSA")), "TR-9a HOSA's sentence names no mapping and no DECA");
});

check("TR-10. the results page renders the module's answer and decides nothing itself", () => {
  const page = stripComments(read("app/(app)/tests/[testId]/results/page.tsx"));
  assert.ok(!page.includes("deca-diagnostic-bridge"), "TR-10a the page does not import the DECA bridge");
  assert.ok(!/DECA lesson|recorded skill each one/.test(page), "TR-10b no DECA copy is hardcoded on the shared page");
  assert.match(page, /\{workOn\.lessonCount\}/, "TR-10c the Lessons tile shows the deduplicated count");
  assert.match(page, /href=\{\(workOn\.firstLessonHref \?\? "\/skills"\) as Route\}/, "TR-10d the next step uses a full lesson path");
  assert.match(page, /<ResultRecommendationsCard recommendations=\{workOn\}/, "TR-10e the card renders the module's result");
  assert.match(page, /weakAreaExplanation\(test\.organization\)/, "TR-10f the weak-area sentence is chosen per organization");
  const card = stripComments(read("components/tests/result-recommendations.tsx"));
  assert.ok(!card.includes("lib/education"), "TR-10g the card imports nothing from the education registry");
});

console.log(results.join("\n"));
console.log(`\n${results.length - failures}/${results.length} test-result-recommendation controls passed`);
if (failures > 0) process.exit(1);
