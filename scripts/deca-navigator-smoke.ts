import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// THE PRODUCTION REGISTRIES — the same modules the route and components import. No mirrored copy.
import {
  decaFamiliesByScope,
  decaFamilyById,
  decaScope,
  decaStatusLabel,
  findDecaFamilies,
  isDisplayableAsVerified,
  presentDecaFamily,
  DECA_ASSOCIATION_NOTE,
  DECA_CURRENT_SEASON,
  DECA_FAMILIES,
  DECA_LAST_VERIFIED,
  DECA_OUT_OF_SCOPE_NOTE,
  DECA_PI_RULE_NOTE,
  DECA_SCAFFOLD_NOTE,
  DECA_SCOPES,
  DECA_TDM_WEIGHTING_NOTE,
  DECA_WEIGHTING_NOTE,
  type DecaFamilyRecord
} from "../lib/deca-events";
import { hosaEventById, presentHosaEvent, HOSA_EVENTS } from "../lib/hosa-events";
import { getRoleplayLesson } from "../lib/roleplay-lessons";

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
  assert.equal(series.season, DECA_CURRENT_SEASON);
  assert.equal(series.lastVerified, DECA_LAST_VERIFIED);
  assert.equal(DECA_LAST_VERIFIED, "2026-07-05", "verification date matches the approved record (02-deca-course.md:6)");

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

  console.log(
    "DECA Navigator smoke passed: /training/deca/events renders its own registry and component, /training/hosa/events is unchanged, and every other track still 404s — HOSA reads ?event=, DECA reads ?family=, and neither identifier resolves in the other. Individual Series' 100q/10/10, five PIs, materials and visual-aid rules stay Series facts and reach no other family; PBA carries only its four Business Administration Core PIs and its eligibility wording, with 'recommended beginner pathway' labeled as CompeteReady's inference; TDM shows 30/15, both members speaking and averaged exams while displaying NO weighting and naming the unresolved Guide-versus-sample conflict; PSC's no-scripted-questions wording is exact and it is not routed into the role-play course while our record places it both ways. No one-third formula, no percentage weighting, no 'conversational questions', no universal interruption or question penalty, no instruction to say PI names aloud, no claim that woven delivery is superior, and no D-E-C-A framework. Prepared, written and online families carry no role-play facts and route to the DECA hub, never the lesson. Unknown, blank, repeated and malformed identifiers select nothing; a record claiming verification without full provenance degrades and leaks nothing. Association variation is stated for every family, status is words plus an icon, search is labeled and keyboard-operable, every fact renders from the registry, and nothing writes to a schema, API, storage, mastery, XP, rating or ballot. HOSA's single verified event, fail-closed lookups and withdrawn practice are all intact."
  );
}

main();
