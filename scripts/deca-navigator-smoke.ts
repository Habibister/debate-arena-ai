import assert from "node:assert/strict";
import { DecaEventNavigator } from "../components/training/deca-event-navigator";
import { readFileSync } from "node:fs";
// THE PRODUCTION REGISTRIES — the same modules the route and components import. No mirrored copy.
import {
  decaFamiliesByScope,
  decaFamilyById,
  decaScope,
  decaSourceMetadata,
  decaStatusLabel,
  findDecaFamilies,
  isDisplayableAsVerified,
  presentDecaFamily,
  DECA_ASSOCIATION_NOTE,
  DECA_FAMILIES,
  DECA_PROVENANCE_NOTE,
  DECA_RESEARCH_RECORD_LAST_CHECKED,
  DECA_OUT_OF_SCOPE_NOTE,
  DECA_UNRESOLVED_SCOPE_NOTE,
  DECA_PI_RULE_NOTE,
  DECA_SCAFFOLD_NOTE,
  DECA_SCOPES,
  DECA_TDM_WEIGHTING_NOTE,
  DECA_WEIGHTING_NOTE,
  type DecaFamilyRecord
} from "../lib/deca-events";
import { hosaEventById, presentHosaEvent, HOSA_EVENTS } from "../lib/hosa-events";
import { formatVerifiedDate, presentSourceFreshness } from "../lib/source-freshness";
import { getRoleplayLesson } from "../lib/roleplay-lessons";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Renders the REAL route so the absence contract is checked against learner-facing output, not only
// against data. jsx=preserve emits classic createElement, so React must be global first.
(globalThis as { React?: unknown }).React = React;
const DecaRoutePage = require("../app/(app)/training/[track]/events/page").default;
const renderDecaRoute = (searchParams?: Record<string, unknown>) =>
  renderToStaticMarkup(React.createElement(DecaRoutePage, { params: { track: "deca" }, searchParams } as never) as never);

/** Scan what the code SAYS, not what its comments say about what it refuses to say. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "")).join("\n");

function main() {
  const page = readFileSync("app/(app)/training/[track]/events/page.tsx", "utf8");
  const nav = readFileSync("components/training/deca-event-navigator.tsx", "utf8");
  const registry = readFileSync("lib/deca-events.ts", "utf8");
  const hosaNav = readFileSync("components/training/hosa-event-navigator.tsx", "utf8");
  const hosaRegistry = readFileSync("lib/hosa-events.ts", "utf8");
  const hub = readFileSync("app/(app)/training/[track]/page.tsx", "utf8");
  const surfaces = [registry, nav, page].map(stripComments).join("\n");

  // ---- 1/2/3. route renders for DECA, HOSA unchanged, everything else fails closed --------------
  assert.ok(page.includes("<DecaEventNavigator"), "the route renders the DECA Navigator");
  assert.ok(page.includes("<HosaEventNavigator"), "the route still renders the HOSA Navigator");
  assert.ok(page.includes('if (track.id !== "HOSA" && track.id !== "DECA") notFound()'),
    "every track except HOSA and DECA still 404s");
  assert.ok(page.includes('const isHosa = track.id === "HOSA"'), "the branch is an explicit track check, not a fallback");
  assert.ok(hub.includes('NAVIGATOR_TRACKS: TrainingTrack[] = ["HOSA", "DECA"]'), "both hubs link to their own Navigator");
  // Each track resolves ONLY its own parameter through its own registry.
  assert.ok(page.includes("hosaEventById(requested) : decaFamilyById(requested)"), "each track uses its own fail-closed lookup");
  assert.ok(page.includes("singleParam(searchParams?.event)") && page.includes("singleParam(searchParams?.family)"),
    "HOSA reads ?event=, DECA reads ?family= — the identifiers never cross");

  // ---- 4. every verified displayed DECA fact traces to an approved local locator ------------------
  const series = decaFamilyById("individual-series")!;
  const pba = decaFamilyById("principles-of-business-administration")!;
  const pfl = decaFamilyById("personal-financial-literacy")!;
  const tdm = decaFamilyById("team-decision-making")!;
  const psc = decaFamilyById("professional-selling-and-consulting")!;
  assert.ok(series && pba && pfl && tdm && psc, "the four approved role-play families plus PSC exist");

  const sf = presentDecaFamily(series).facts;
  assert.equal(sf.examQuestionCount, 100, "Series 100-question exam (02-deca-course.md:6-7, :114)");
  assert.equal(sf.preparationMinutes, 10, "Series 10-minute preparation (02-deca-course.md:6-7, :114)");
  assert.equal(sf.rolePlayMinutes, 10, "Series up-to-10-minute meeting (02-deca-course.md:6-7, :114)");
  assert.ok(/[Ff]ive Performance Indicators/.test(sf.performanceIndicatorNote ?? ""), "Series five PIs (02-deca-course.md:114-115)");
  assert.ok(/preliminary standing/.test(sf.examWeightingNote ?? ""), "Series exam contributes to preliminary standing (02-deca-course.md:115)");
  assert.ok(/uninterrupted/.test(sf.judgeQuestionFlow ?? "") && /scripted standard questions/.test(sf.judgeQuestionFlow ?? ""),
    "Series uninterrupted-then-scripted flow (02-deca-course.md:91-94)");
  assert.ok(/provided at the event/.test(sf.preparationMaterialsNote ?? ""), "materials provided at the event (10-benchmark:159-161)");
  assert.ok(/do not let you bring visual aids in/.test(sf.visualAidNote ?? ""), "role-play visual-aid prohibition (02:83-85)");
  // M11R1 — the assertions here used to be `series.season === DECA_CURRENT_SEASON`: the registry
  // constant checked against itself. That is why a fabricated season passed green for two milestones.
  // Replaced with the ABSENCE contract the approved record actually supports. These compare production
  // data against literals and rendered text, never against the module's own exports.
  assert.equal(series.season, undefined, "no DECA family carries a season — the record supplies none");
  assert.equal(series.sourceLabel, undefined, "no DECA family carries a source label — the record supplies none");
  assert.ok(!("documentVersion" in series), "the DECA record shape carries no document version at all");
  for (const f of DECA_FAMILIES) {
    assert.equal(f.season, undefined, `${f.name} claims no season`);
    assert.equal(f.sourceLabel, undefined, `${f.name} claims no source label`);
    const meta = decaSourceMetadata(f);
    assert.equal(meta.authority, "partial", `${f.name} projects partial provenance, never official`);
    assert.equal(meta.freshness, undefined, `${f.name} makes no currency claim`);
    assert.equal(meta.season, undefined, `${f.name} projects no season`);
    assert.equal(meta.sourceLabel, undefined, `${f.name} projects no source label`);
    assert.equal(meta.lastVerified, undefined, `${f.name} projects no verification date`);
    const view = presentSourceFreshness(meta);
    assert.equal(view.tone, "provisional", `${f.name} never earns verified tone`);
    assert.ok(!/Official/.test(view.authorityLabel), `${f.name} never renders an official label`);
    assert.equal(view.freshnessLabel, null, `${f.name} renders no currency line`);
    assert.equal(view.verifiedLabel, null, `${f.name} renders no verification date`);
  }
  // The invented strings must not reappear anywhere in the DECA registry, route or component.
  for (const [name, file] of [["registry", "lib/deca-events.ts"], ["route", "app/(app)/training/[track]/events/page.tsx"],
                              ["Navigator", "components/training/deca-event-navigator.tsx"]] as const) {
    const code = stripComments(readFileSync(file, "utf8"));
    assert.ok(!/DECA_CURRENT_SEASON|DECA_SOURCE_LABEL/.test(code), `${name} no longer references the removed constants`);
    assert.ok(!/competitive event guidelines/i.test(code), `${name} no longer carries the invented source label`);
    assert.ok(!/2025-26/.test(code), `${name} no longer carries the unsupported DECA season`);
  }
  // ---- M11R1A: the retained date is narrowly scoped, and the wording separates the three claims ----
  assert.equal(DECA_RESEARCH_RECORD_LAST_CHECKED, "2026-07-05", "the retained date is our research-record check date");
  // It must read as OUR check of OUR record — never as a DECA publication or season verification.
  const formattedCheck = formatVerifiedDate(DECA_RESEARCH_RECORD_LAST_CHECKED);
  assert.equal(formattedCheck, "July 5, 2026", "the date formats for the learner without drift");
  assert.ok(DECA_PROVENANCE_NOTE.includes(formattedCheck!), "the note carries that exact date, so the two cannot drift apart");
  assert.ok(/CompeteReady's approved research record/.test(DECA_PROVENANCE_NOTE), "the note attributes the details to OUR record");
  assert.ok(/last checked/i.test(DECA_PROVENANCE_NOTE), "the date is described as when WE last checked");
  assert.ok(/have not verified which official DECA document or competition season/.test(DECA_PROVENANCE_NOTE),
    "and the note names exactly what is unverified: the official document and the season");
  for (const banned of ["Current official structure", "Officially verified structure", "Current DECA guidelines",
                        "Current for 2025-26", "Official DECA source", "Last verified"]) {
    assert.ok(!DECA_PROVENANCE_NOTE.includes(banned), `the note must not claim ${JSON.stringify(banned)}`);
  }
  // The status label must not blame the details themselves.
  assert.equal(decaStatusLabel("partial"), "Official source and season not yet verified", "the gap is provenance, not the details");
  assert.ok(!/Structure not yet verified/.test(decaStatusLabel("partial")), "the old misleading wording is gone");
  const anyDecaRender = renderDecaRoute({ family: "individual-series" });
  assert.ok(!anyDecaRender.includes("Structure not yet verified"), "no rendered DECA state says the structure is unverified");
  assert.ok(anyDecaRender.includes("Official source and season not yet verified"), "it says the source and season are unverified");
  assert.ok(anyDecaRender.includes("last checked July 5, 2026"), "and the card carries the research-record note");

  // And they must not reach a learner in any rendered DECA state.
  for (const sp of [undefined, { family: "individual-series" }, { family: "team-decision-making" },
                    { family: "principles-of-business-administration" }, { family: "prepared-events" }]) {
    const html = renderDecaRoute(sp);
    for (const banned of ["Official DECA source", "Current for 2025-26", "DECA competitive event guidelines",
                          "Last verified", "2025-26"]) {
      assert.ok(!html.includes(banned), `rendered DECA state must not contain ${JSON.stringify(banned)}`);
    }
  }

  const pf = presentDecaFamily(pba).facts;
  assert.ok(/four per role-play/.test(pf.performanceIndicatorNote ?? ""), "PBA four PIs (02-deca-course.md:116-119)");
  assert.ok(/Business Administration Core/.test(pf.performanceIndicatorNote ?? ""), "PBA Business Administration Core PIs");
  assert.ok(/eligibility-restricted entry event/.test(pf.eligibilityNote ?? ""), "PBA eligibility wording (02:116-117)");
  assert.ok(/CompeteReady's inference, not an official recommendation/.test(pf.eligibilityNote ?? ""),
    "'recommended beginner pathway' is labeled as OUR inference (02:118-119)");

  const tf = presentDecaFamily(tdm).facts;
  assert.equal(tf.preparationMinutes, 30, "TDM 30-minute preparation (02-deca-course.md:121-122)");
  assert.equal(tf.presentationMinutes, 15, "TDM 15-minute shared presentation (02-deca-course.md:121-122)");
  assert.equal(tf.bothMembersMustSpeak, true, "TDM both members must speak (02-deca-course.md:122)");
  assert.ok(/averaged/.test(tf.examCombinationNote ?? ""), "TDM averaged exams (02-deca-course.md:122)");
  assert.ok(/conditional questioning/.test(tf.judgeQuestionFlow ?? ""), "TDM conditional questioning (02-deca-course.md:95)");

  // ---- 5. Individual Series lends nothing to any other family ---------------------------------------
  const SERIES_ONLY = ["examQuestionCount", "rolePlayMinutes", "preparationMaterialsNote", "visualAidNote", "examWeightingNote"] as const;
  for (const other of DECA_FAMILIES.filter((f) => f.id !== "individual-series")) {
    const facts = presentDecaFamily(other).facts;
    for (const key of SERIES_ONLY) {
      assert.equal(facts[key], undefined, `${other.name} does not inherit Series' ${key}`);
    }
    assert.notEqual(facts.preparationMinutes, 10, `${other.name} does not inherit Series' 10-minute prep`);
  }
  // And nothing at all reaches the out-of-scope families.
  for (const oos of DECA_FAMILIES.filter((f) => ["prepared-events", "written-events", "online-events"].includes(f.id))) {
    assert.deepEqual(presentDecaFamily(oos).facts, {}, `${oos.name} carries no role-play facts whatsoever`);
    assert.equal(oos.components, undefined, `${oos.name} claims no components`);
  }

  // ---- 6/7/8. TDM weighting omitted and honestly explained; no universal one-third ---------------------
  assert.equal(tf.examWeightingNote, undefined, "TDM displays NO weighting value");
  assert.ok(!("examWeighting" in (tdm.verifiedFacts ?? {})), "TDM stores no weighting field at all");
  assert.ok(tdm.unresolvedFields?.some((f) => /weighting/i.test(f) && /conflict/i.test(f)),
    "TDM names the unresolved Guide-versus-sample weighting conflict");
  assert.ok(/Guide and its published sample conflict/.test(DECA_TDM_WEIGHTING_NOTE) && /unresolved/.test(DECA_TDM_WEIGHTING_NOTE),
    "the TDM weighting note is honest about why nothing is shown");
  assert.ok(nav.includes("DECA_TDM_WEIGHTING_NOTE"), "the Navigator renders it");
  assert.ok(!/one[- ]third|33%|33\.3|\b1\/3\b/i.test(surfaces), "no universal one-third exam formula appears anywhere");
  assert.ok(!/\b\d{1,3}\s*%/.test(surfaces), "no percentage weighting figure appears anywhere");
  assert.ok(/does not support a single verified value/.test(DECA_WEIGHTING_NOTE), "the general weighting refusal explains itself");

  // ---- 9/10. PSC question wording is exact in substance ------------------------------------------------
  const pscFlow = presentDecaFamily(psc).facts.judgeQuestionFlow ?? "";
  assert.ok(/no scripted standard questions/i.test(pscFlow), "PSC: no scripted standard questions (02:96-98)");
  assert.ok(/may ask appropriate questions if time remains/i.test(pscFlow), "PSC: judge may ask if time remains");
  assert.ok(/do not assume a question round will happen/i.test(pscFlow), "PSC: not every interaction includes questions");
  assert.ok(!/conversational question/i.test(surfaces), '"conversational questions" is never used as a sourced category');
  assert.ok(!/the judge will interrupt|judge interrupts|may interrupt/i.test(surfaces), "no universal interruption rule");
  assert.ok(!/penalt(y|ies) for (a )?question|lose points for asking/i.test(surfaces), "no universal question penalty");

  // ---- 11/12. Performance Indicators ---------------------------------------------------------------------
  assert.ok(/not lines to recite/.test(DECA_PI_RULE_NOTE) && /not announced in advance/.test(DECA_PI_RULE_NOTE),
    "the PI rule preserves demonstrate-not-recite and not-announced-in-advance");
  assert.ok(/genuine judgment call with tradeoffs both ways/.test(DECA_PI_RULE_NOTE), "explicit-vs-woven stays unresolved");
  assert.ok(/we do not tell you to do either/.test(DECA_PI_RULE_NOTE), "the Navigator prescribes neither style");
  assert.ok(!/say (the )?(PI|performance indicator)('s)? (title |name )?aloud|announce the performance indicator|state the PI name/i
    .test(surfaces.replace(DECA_PI_RULE_NOTE, "")), "no family tells learners to say PI names aloud");
  assert.ok(!/woven (delivery )?is (better|superior|preferred)|always weave/i.test(surfaces), "woven delivery is never called superior");
  assert.ok(!/behavior-type/i.test(surfaces), "thin behavior-type PI evidence is not elevated into a Navigator rule");

  // ---- 13/14. CompeteReady's scaffold, and no D-E-C-A framework -------------------------------------------
  for (const part of ["problem", "recommendation", "business reason", "implementation", "measurement"]) {
    assert.ok(DECA_SCAFFOLD_NOTE.toLowerCase().includes(part), `the scaffold names ${part}`);
  }
  assert.ok(/our teaching scaffold, not official DECA terminology/.test(DECA_SCAFFOLD_NOTE), "the scaffold is labeled as ours");
  assert.ok(nav.includes("DECA_SCAFFOLD_NOTE"), "the Navigator renders the scaffold label beside the lesson link");
  assert.ok(!/d-e-c-a/i.test(surfaces), "the D-E-C-A mnemonic is not used as a Navigator framework");

  // ---- 15. out-of-scope families never route into the role-play lesson ------------------------------------
  const LESSON = "/lessons/how-deca-roleplay-works";
  for (const f of DECA_FAMILIES) {
    const { outOfScope } = presentDecaFamily(f);
    if (outOfScope) {
      assert.notEqual(f.routeTarget, LESSON, `${f.name} does not route into the role-play lesson`);
      assert.equal(f.routeTarget, "/training/deca", `${f.name} routes to the DECA hub instead`);
    } else {
      assert.equal(f.routeTarget, LESSON, `${f.name} is a role-play family and routes to the lesson`);
    }
  }
  assert.equal(presentDecaFamily(psc).outOfScope, true, "PSC is not routed into the role-play course while our record is unresolved");

  // ---- M11R3: PSC gets its OWN unresolved card and borrows nothing from other families ------------
  assert.equal(psc.scope, "other", "PSC stays scope 'other'");
  assert.equal(psc.sourceStatus, "unresolved", "PSC stays unresolved");
  assert.equal(presentDecaFamily(psc).unresolvedScope, true, "PSC is flagged as unresolved, not merely out of scope");
  // Positive control: the families that DO own the out-of-scope explanation still get it.
  for (const id of ["prepared-events", "written-events", "online-events"]) {
    const v = presentDecaFamily(decaFamilyById(id)!);
    assert.equal(v.outOfScope, true, `${id} is still out of scope`);
    assert.equal(v.unresolvedScope, false, `${id} is NOT unresolved — its placement is known`);
  }
  // PSC carries only its sourced question-flow fact.
  assert.deepEqual(Object.keys(presentDecaFamily(psc).facts), ["judgeQuestionFlow"], "PSC carries only its question flow");
  const pscFlowText = presentDecaFamily(psc).facts.judgeQuestionFlow ?? "";
  assert.ok(/no scripted standard questions/i.test(pscFlowText), "PSC keeps: no scripted standard questions");
  assert.ok(/may ask appropriate questions if time remains/i.test(pscFlowText), "PSC keeps: judge may ask if time remains");
  assert.ok(/do not assume a question round will happen/i.test(pscFlowText), "PSC keeps: questions are not guaranteed");
  assert.ok(!/penal|deduct|lose points/i.test(pscFlowText), "PSC claims no universal scoring consequence");
  // The unresolved note states the conflict and borrows nothing.
  assert.ok(/has not resolved which current course branch applies/i.test(DECA_UNRESOLVED_SCOPE_NOTE), "the unresolved note says so plainly");
  assert.ok(/both inside and outside/i.test(DECA_UNRESOLVED_SCOPE_NOTE), "and names the conflict without resolving it");
  for (const borrowed of ["statements of assurance", "penalty points", "page and slide limits", "visual aids",
                          "prejudged", "upload", "written entry", "exam weighting", "advance"]) {
    assert.ok(!DECA_UNRESOLVED_SCOPE_NOTE.toLowerCase().includes(borrowed.toLowerCase()),
      `the unresolved note borrows no prepared/written/online rule: ${borrowed}`);
  }
  // Rendered: PSC must not show the out-of-scope banner or any borrowed rule; other families still do.
  const pscHtml = renderDecaRoute({ family: "professional-selling-and-consulting" });
  assert.ok(pscHtml.includes("has not resolved which current course branch applies"), "the PSC card renders the unresolved wording");
  for (const borrowed of ["statements of assurance", "penalty points", "page and slide limits"]) {
    assert.ok(!pscHtml.includes(borrowed), `the PSC card must not render ${JSON.stringify(borrowed)}`);
  }
  assert.ok(!pscHtml.includes("/lessons/how-deca-roleplay-works"), "the PSC card never links into role-play instruction");
  assert.ok(pscHtml.includes('href="/training/deca"'), "and offers the DECA hub instead");
  // Negative control: the prepared card DOES still carry the sourced out-of-scope explanation.
  const preparedHtml = renderDecaRoute({ family: "prepared-events" });
  assert.ok(preparedHtml.includes("statements of assurance"), "positive control: prepared events keep their own sourced explanation");
  assert.ok(!preparedHtml.includes("has not resolved which current course branch applies"), "and do not get the unresolved wording");
  assert.ok(/outside CompeteReady's current role-play course/.test(DECA_OUT_OF_SCOPE_NOTE), "the out-of-scope wording is explicit");
  assert.ok(/statements of assurance, penalty points, page and slide limits/.test(DECA_OUT_OF_SCOPE_NOTE),
    "it names the sourced material differences (02-deca-course.md:20-21)");
  assert.ok(nav.includes("DECA_OUT_OF_SCOPE_NOTE"), "the Navigator renders it");

  // ---- 16/17/18. unknown, missing, repeated and malformed identifiers fail closed ---------------------------
  for (const bad of ["", "   ", "not-a-family", "medical-terminology", "individual series", "0", "1", "../individual-series"]) {
    assert.equal(decaFamilyById(bad), undefined, `fails closed on ${JSON.stringify(bad)}`);
  }
  assert.equal(decaFamilyById(null), undefined, "a null id selects nothing");
  assert.equal(decaFamilyById(undefined), undefined, "a missing id does not select the first family");
  assert.notEqual(decaFamilyById("not-a-family"), DECA_FAMILIES[0], "no first-record fallback");
  assert.ok(!registry.includes("DECA_FAMILIES[0]"), "the registry never indexes into the list as a fallback");
  assert.ok(page.includes('if (typeof value !== "string") return undefined'), "a repeated (array) parameter is treated as absent");
  assert.ok(nav.includes("We do not have verified details for that event family yet"), "the unknown state is honest");
  // A HOSA identifier must never resolve inside DECA, and vice versa.
  assert.equal(decaFamilyById("medical-terminology"), undefined, "a HOSA event id resolves to nothing in DECA");
  assert.equal(hosaEventById("individual-series"), undefined, "a DECA family id resolves to nothing in HOSA");

  // ---- 19/20. malformed verified record degrades; optional fields stay absent --------------------------------
  const base = { id: "x", name: "X", scope: "role-play" } as const;
  const malformed: DecaFamilyRecord[] = [
    { ...base, sourceStatus: "verified-current", verifiedFacts: { examQuestionCount: 999 } },
    { ...base, sourceStatus: "verified-current", season: "2025-26", lastVerified: "2026-07-05", sourceLabel: "x", verifiedFacts: {} },
    { ...base, sourceStatus: "verified-stable", season: "   ", lastVerified: "2026-07-05", sourceLabel: "x", verifiedFacts: { preparationMinutes: 5 } },
    { ...base, sourceStatus: "verified-current", season: "2025-26", lastVerified: "", sourceLabel: "x", verifiedFacts: { preparationMinutes: 5 } }
  ];
  for (const record of malformed) {
    assert.equal(isDisplayableAsVerified(record), false, "a verified claim without full provenance is not displayable");
    const view = presentDecaFamily(record);
    assert.equal(view.verified, false, "it never renders as verified");
    assert.deepEqual(view.facts, {}, "and a degraded record leaks no fact");
    assert.equal(view.degraded, true, "the degradation is reported rather than hidden");
  }
  // Absent stays absent — no key is defaulted into existence.
  for (const f of DECA_FAMILIES) {
    for (const [k, v] of Object.entries(f.verifiedFacts ?? {})) {
      assert.notEqual(v, undefined, `${f.name}.${k} is present or absent, never an explicit undefined`);
      assert.notEqual(v, "", `${f.name}.${k} is never an empty placeholder`);
    }
  }

  // ---- 21. nothing universal is invented -----------------------------------------------------------------------
  const inventions: Array<[string, RegExp]> = [
    ["cut line", /cut ?line|top \d+ advance|advance to (the )?(state|international)/i],
    ["advancement model", /(will|automatically) (advance|qualify)/i],
    ["entry limit", /entry limit is|limited to \d+ entries/i],
    ["device deduction", /device deduction|points deducted for (a )?(phone|device)/i],
    ["score guarantee", /guarantee|will score|higher score|score threshold/i],
    ["universal blazer rule", /you must wear a blazer|blazer is required at all/i],
    ["invented team size", /teams? of (three|four|\d)/i],
    ["invented visual-aid permission", /you may bring (a )?(poster|slides|visual aid)/i],
    ["upload requirement", /upload (your|the) (entry|paper) by/i],
    ["prejudged claim", /is prejudged|judged in advance/i]
  ];
  for (const [label, pattern] of inventions) {
    assert.ok(!pattern.test(surfaces), `no universal ${label} is invented`);
  }
  // Dress stays level-specific and secondary.
  const dress = registry.match(/DECA_DRESS_NOTE =\s*\n?\s*"([^"]+)"/)?.[1] ?? "";
  assert.ok(/documented at ICDC/.test(dress) && /chartered associations may enforce differently/.test(dress)
    && /no universal blazer rule/i.test(dress), "dress wording is level-specific with no universal rule");

  // ---- 22/23/24/25. association, status text, keyboard, registry-rendered ----------------------------------------
  assert.ok(DECA_FAMILIES.every((f) => f.associationVariation === true), "association variation applies to every family");
  assert.ok(/Not all chartered associations offer all events/.test(DECA_ASSOCIATION_NOTE), "the association note is exact in substance");
  assert.ok(nav.includes("DECA_ASSOCIATION_NOTE"), "the Navigator renders it");
  for (const s of ["verified-current", "verified-stable", "partial", "unresolved"] as const) {
    assert.ok(decaStatusLabel(s).length > 8 && !/^[a-z-]+$/.test(decaStatusLabel(s)), `status ${s} is learner-facing wording, not a code`);
  }
  assert.ok(nav.includes("decaStatusLabel("), "status is rendered as text, never colour alone");
  assert.ok(nav.includes('htmlFor="deca-family-search"') && nav.includes('id="deca-family-search"'), "the search input has a real label");
  assert.ok(nav.includes('type="button"') && nav.includes("aria-pressed"), "families are keyboard-operable buttons with pressed state");
  assert.ok(nav.includes("presentDecaFamily"), "the component renders through the registry's presenter");
  assert.ok(!nav.includes("record.verifiedFacts"), "the component never reads raw facts, so a degraded record cannot bypass the check");
  assert.ok(!/\b(100|30|15|10)\b/.test(stripComments(nav).replace(/className="[^"]*"/g, "")), "no structural fact is duplicated as a component constant");
  assert.ok(!/\b(100|30|15)\b/.test(stripComments(page).replace(/className="[^"]*"/g, "")), "the route duplicates no fact either");

  // ---- 26. no database, API, schema or write ---------------------------------------------------------------------
  for (const [name, src] of [["registry", registry], ["Navigator", nav], ["route", page]] as const) {
    const code = stripComments(src);
    for (const banned of ["@/lib/prisma", "prisma.", "fetch(", "localStorage", "sessionStorage", "recordDrillMastery",
                          "@/lib/spaced-review", "@/lib/xp", "MasteryProgress", "ballot", "competitionResult", "NextResponse"]) {
      assert.ok(!code.includes(banned), `the ${name} performs no ${banned}`);
    }
  }
  const runtimeImports = registry.split("\n").filter((l) => /^\s*import\s+(?!type\b)/.test(l));
  assert.equal(runtimeImports.length, 0, "the DECA registry has no runtime imports at all");

  // ---- 27. track isolation --------------------------------------------------------------------------------------
  assert.ok(!/HOSA|Medical Terminology|clinical|patient/i.test(stripComments(registry) + stripComments(nav)),
    "no HOSA content appears in the DECA registry or Navigator");
  assert.ok(!/DECA|Performance Indicator|role-play famil/i.test(stripComments(hosaRegistry) + stripComments(hosaNav)),
    "no DECA content appears in the HOSA registry or Navigator");
  for (const f of DECA_FAMILIES) {
    assert.ok(!f.routeTarget || /^\/(training\/deca|lessons\/how-deca)/.test(f.routeTarget), `${f.name} links stay inside DECA`);
  }

  // ---- 28/32. M8A HOSA behavior is unchanged ---------------------------------------------------------------------
  const verifiedHosa = HOSA_EVENTS.filter((e) => presentHosaEvent(e).verified);
  assert.deepEqual(verifiedHosa.map((e) => e.id), ["medical-terminology"], "Medical Terminology is still the only verified HOSA event");
  assert.equal(hosaEventById("not-an-event"), undefined, "HOSA unknown states remain fail-closed");
  const hosa = getRoleplayLesson("how-hosa-scenario-interaction-works");
  assert.equal(hosa?.practiceStatus, "temporarily-unavailable", "HOSA practice remains withdrawn");
  assert.equal(hosa?.practice, undefined, "no HOSA practice or rubric was restored");
  const practice = readFileSync("components/lessons/roleplay-lesson-practice.tsx", "utf8");
  const unavailableFn = practice.slice(practice.indexOf("function PracticeUnavailable"), practice.indexOf("function PracticeStatusBar"));
  for (const banned of ["useState", "useEffect", "localStorage", "fetch(", "recordDrillMastery"]) {
    assert.ok(!unavailableFn.includes(banned), `the HOSA unavailable branch still mounts no ${banned}`);
  }
  // The shipped DECA role-play lesson is untouched by this milestone.
  const deca = getRoleplayLesson("how-deca-roleplay-works");
  assert.equal(deca?.practiceStatus, "available", "the DECA role-play lesson is still available");
  assert.equal(deca?.slug, "how-deca-roleplay-works", "its stable slug is unchanged");

  // ---- search + grouping behavior ---------------------------------------------------------------------------------
  assert.equal(findDecaFamilies("").length, DECA_FAMILIES.length, "an empty query shows every family");
  assert.equal(findDecaFamilies("   ").length, DECA_FAMILIES.length, "a whitespace query is treated as empty");
  assert.equal(findDecaFamilies("tdm")[0]?.id, "team-decision-making", "search matches the abbreviation");
  assert.equal(findDecaFamilies("PFL")[0]?.id, "personal-financial-literacy", "search is case-insensitive");
  assert.equal(findDecaFamilies("zzzz").length, 0, "a no-match query returns nothing rather than a fallback");
  assert.equal(decaFamiliesByScope(findDecaFamilies("zzzz")).length, 0, "and produces no groups, so the empty state shows");
  assert.equal(new Set(DECA_FAMILIES.map((f) => f.id)).size, DECA_FAMILIES.length, "family ids are unique");
  const seen = new Set<string>();
  for (const g of decaFamiliesByScope()) {
    for (const f of g.families) {
      assert.equal(f.scope, g.scope.id, `${f.name} appears only under its own scope`);
      assert.ok(!seen.has(f.id), `${f.name} appears in exactly one scope group`);
      seen.add(f.id);
    }
  }
  for (const f of DECA_FAMILIES) assert.ok(decaScope(f.scope), `${f.name} maps to a declared scope`);
  assert.equal(DECA_SCOPES.length, 5, "all five scopes are declared");

  // ============ M11R7: the grouping shown while browsing is OURS, and says so there ============
  {
    (globalThis as { React?: unknown }).React = React;
    const html = renderToStaticMarkup(createElement(DecaEventNavigator as never, {} as never) as never);
    const text = html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");
    assert.ok(text.includes("CompeteReady training groups"),
      "the browsing surface names its grouping as CompeteReady's");
    assert.ok(/current official event guideline controls/.test(text),
      "and says the learner's own guideline controls classification and requirements");
    assert.ok(/not by DECA(&#x27;|')?s own classification/.test(text.replace(/&#x27;/g, "'")),
      "and disclaims DECA's own taxonomy");
    for (const officialLabel of ["Official category", "Official family", "DECA category"]) {
      assert.ok(!text.includes(officialLabel), `the grouping is never called "${officialLabel}"`);
    }
    // It must sit WITH the groups it describes, as rendered text — not metadata, not a tooltip.
    const qualifierAt = html.indexOf("CompeteReady training groups");
    const groupAt = html.indexOf("Role-play");
    assert.ok(qualifierAt !== -1 && groupAt !== -1, "both the qualifier and its first group render");
    assert.ok(qualifierAt < groupAt, "the qualifier renders immediately before the group list");
    assert.ok(/>[^<]*CompeteReady training groups/.test(html), "and is visible text content");
    // Non-vacuous control: the same scan rejects a fixture without the qualifier, and one that
    // calls the grouping official.
    assert.ok(!"Grouped for you".includes("CompeteReady training groups"), "control: a fixture missing the qualifier is rejected");
    assert.ok("Official category — Role-play".includes("Official category"), "control: an official-category label is detected");
  }

  // ============ M11R10: an exam-weighting section only where an exam is established ============
  {
    // The flag is DERIVED from each family's own sourced facts — the component owns no rule.
    for (const family of DECA_FAMILIES) {
      const present = presentDecaFamily(family);
      const sourcedExamFacts = Object.keys(present.facts).filter((k) => k.startsWith("exam"));
      assert.equal(present.hasExamComponent, sourcedExamFacts.length > 0,
        `${family.id}: exam applicability follows its own sourced facts`);
      // An unresolved entry must NEVER license the section.
      const unresolvedExam = (family.unresolvedFields ?? []).filter((f) => /exam/i.test(f));
      if (sourcedExamFacts.length === 0 && unresolvedExam.length > 0) {
        assert.equal(present.hasExamComponent, false,
          `${family.id}: an unresolved exam entry does not establish an exam`);
      }
    }
    // Exactly the two families our record establishes an exam for.
    const withExam = DECA_FAMILIES.filter((f) => presentDecaFamily(f).hasExamComponent).map((f) => f.id);
    assert.deepEqual(withExam, ["individual-series", "team-decision-making"],
      "only Individual Series and Team Decision Making have a sourced exam component");

    // RENDERED: the section appears for those two and nobody else, and no figure appears anywhere.
    for (const family of DECA_FAMILIES) {
      const html = renderToStaticMarkup(
        createElement(DecaEventNavigator as never, { initialFamilyId: family.id } as never) as never
      );
      const text = html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");
      const expected = presentDecaFamily(family).hasExamComponent;
      assert.equal(text.includes("Exam weighting"), expected,
        `${family.id}: the exam-weighting section renders only where an exam is established`);
      assert.equal(/\b\d{1,3}\s*%/.test(text), false, `${family.id}: no numeric weighting figure renders`);
      for (const filler of ["Exam weighting N/A", "Exam weighting 0%", "Unknown%"]) {
        assert.ok(!text.includes(filler), `${family.id}: missing weighting is omitted, not filled in ("${filler}")`);
      }
      // Supported non-weight facts survive the change.
      if (family.id === "individual-series") {
        assert.ok(text.includes("Five Performance Indicators per role-play"), "Individual Series keeps its PI fact");
        assert.ok(text.includes("The exam contributes to preliminary standing."), "and its qualitative exam note");
      }
      if (family.id === "team-decision-making") {
        assert.ok(text.includes("Guide and its published sample conflict"), "TDM still states its unresolved conflict");
        assert.ok(!/\bexam weighting is\s*\d/i.test(text), "and asserts no figure");
      }
      // Whatever the record leaves unresolved is still named.
      if ((family.unresolvedFields ?? []).length > 0) {
        assert.ok(text.includes("Not shown, and why"), `${family.id}: unresolved fields are still surfaced`);
      }
    }

    // ---- Non-vacuous controls: fixtures only, production untouched ----
    const examLess = { ...decaFamilyById("prepared-events")!, verifiedFacts: { judgeQuestionFlow: "x" } };
    assert.equal(presentDecaFamily(examLess).hasExamComponent, false,
      "control: a fixture family with no exam fact is rejected");
    const unresolvedOnly = { ...decaFamilyById("personal-financial-literacy")!,
      unresolvedFields: ["Exam structure and weighting"] };
    assert.equal(presentDecaFamily(unresolvedOnly).hasExamComponent, false,
      "control: an unresolved-only fixture is rejected");
    // Built from a family that IS displayable as verified, so the only variable is the exam fact.
    const displayable = decaFamilyById("individual-series")!;
    assert.equal(presentDecaFamily(displayable).degraded, false, "control setup: this family is displayable");
    const sourced = { ...displayable, verifiedFacts: { examQuestionCount: 100 } };
    assert.equal(presentDecaFamily(sourced).hasExamComponent, true,
      "control: a genuinely sourced exam fact IS accepted");
    const stripped = { ...displayable, verifiedFacts: { judgeQuestionFlow: "x" } };
    assert.equal(presentDecaFamily(stripped).hasExamComponent, false,
      "control: the SAME displayable family without an exam fact is rejected");
    // Removing the section from a rendered fixture makes the exam-less check pass.
    assert.ok(!"Prepared events — no exam section here".includes("Exam weighting"),
      "control: a rendered fixture without the section passes the exam-less check");
    assert.deepEqual(DECA_FAMILIES.map((f) => f.id).length, 8, "control: the production registry was not mutated");
  }

  console.log(
    "DECA Navigator smoke passed: /training/deca/events renders its own registry and component, /training/hosa/events is unchanged, and every other track still 404s — HOSA reads ?event=, DECA reads ?family=, and neither identifier resolves in the other. Individual Series' 100q/10/10, five PIs, materials and visual-aid rules stay Series facts and reach no other family; PBA carries only its four Business Administration Core PIs and its eligibility wording, with 'recommended beginner pathway' labeled as CompeteReady's inference; TDM shows 30/15, both members speaking and averaged exams while displaying NO weighting and naming the unresolved Guide-versus-sample conflict; PSC's no-scripted-questions wording is exact and it is not routed into the role-play course while our record places it both ways. No one-third formula, no percentage weighting, no 'conversational questions', no universal interruption or question penalty, no instruction to say PI names aloud, no claim that woven delivery is superior, and no D-E-C-A framework. Prepared, written and online families carry no role-play facts and route to the DECA hub, never the lesson. Unknown, blank, repeated and malformed identifiers select nothing; a record claiming verification without full provenance degrades and leaks nothing. Association variation is stated for every family, status is words plus an icon, search is labeled and keyboard-operable, every fact renders from the registry, and nothing writes to a schema, API, storage, mastery, XP, rating or ballot. HOSA's single verified event, fail-closed lookups and withdrawn practice are all intact."
  );
}

main();
