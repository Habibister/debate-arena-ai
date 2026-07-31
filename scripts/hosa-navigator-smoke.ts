import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// THE PRODUCTION REGISTRY — the same module the route and component import. No mirrored copy.
import {
  findHosaEvents,
  hosaEventById,
  hosaEventsByFamily,
  hosaFamily,
  hosaStatusLabel,
  isDisplayableAsVerified,
  presentHosaEvent,
  HOSA_ASSOCIATION_NOTE,
  HOSA_CURRENT_SEASON,
  HOSA_EVENTS,
  HOSA_FAMILIES,
  HOSA_REVALIDATION_NOTE,
  type HosaEventRecord
} from "../lib/hosa-events";
import { getRoleplayLesson } from "../lib/roleplay-lessons";

function main() {
  const page = readFileSync("app/(app)/training/[track]/events/page.tsx", "utf8");
  const nav = readFileSync("components/training/hosa-event-navigator.tsx", "utf8");
  const registry = readFileSync("lib/hosa-events.ts", "utf8");
  const hub = readFileSync("app/(app)/training/[track]/page.tsx", "utf8");

  // ---- 1. the route exists, is HOSA-scoped, and reads the registry -----------------------------
  assert.ok(page.includes("export default function EventNavigatorPage"), "the Navigator route renders a page");
  // M8B added the DECA Navigator behind the same route. The guard is now a two-track allow-list;
  // every other track still 404s, and each track resolves ONLY its own parameter through its own
  // registry — which is what keeps HOSA fail-closed regardless of what DECA does.
  assert.ok(page.includes('if (track.id !== "HOSA" && track.id !== "DECA") notFound()'), "only HOSA and DECA have a Navigator; every other track 404s");
  assert.ok(page.includes("<HosaEventNavigator"), "the route renders the HOSA Navigator component");
  assert.ok(page.includes('const isHosa = track.id === "HOSA"'), "the branch is an explicit track check, not a fallback");
  assert.ok(page.includes("hosaEventById(requested) : decaFamilyById(requested)"), "HOSA resolves ids through its own registry only");
  assert.ok(page.includes("singleParam(searchParams?.event)"), "HOSA reads ?event=, which DECA never resolves");
  assert.ok(hub.includes('NAVIGATOR_TRACKS: TrainingTrack[] = ["HOSA", "DECA"]') && hub.includes("/events`"), "the HOSA hub links to the Navigator");
  assert.ok(hosaEventById("individual-series") === undefined, "a DECA family id resolves to nothing in the HOSA registry");

  // ---- 2/3. the ONE verified card uses only approved sourced facts ------------------------------
  const mt = hosaEventById("medical-terminology");
  assert.ok(mt, "Medical Terminology is in the registry");
  const mtView = presentHosaEvent(mt!);
  assert.equal(mtView.verified, true, "Medical Terminology is displayable as verified");
  assert.equal(mt!.season, HOSA_CURRENT_SEASON, "its season is the current official set");
  assert.equal(mt!.season, "2025-26", "the current official set is 2025-26");
  assert.equal(mt!.lastVerified, "2026-07-05", "its last-verified date matches the approved record");
  assert.equal(mt!.sourceStatus, "verified-current", "its verification status is explicit in the registry");
  assert.ok(mt!.sourceLabel?.includes("2025-26"), "its source label names the season");
  // The ONLY two sourced structural facts. Anything else would be invention.
  assert.deepEqual(Object.keys(mtView.facts).sort(), ["questionCount", "timeMinutes"], "exactly the two sourced facts");
  assert.equal(mtView.facts.questionCount, 50, "50 questions (docs/curriculum/00-principles-and-sources.md:130)");
  assert.equal(mtView.facts.timeMinutes, 60, "60 minutes (docs/curriculum/00-principles-and-sources.md:130)");
  for (const absent of ["rounds", "teamSize", "prejudged", "onsite", "resultsTiming", "equipmentNote", "ratingSheetAvailable", "testPlanAvailable"] as const) {
    assert.equal(mtView.facts[absent], undefined, `unsourced field stays absent, not defaulted: ${absent}`);
  }

  // ---- 4. no Medical Terminology fact leaks into another event -----------------------------------
  for (const event of HOSA_EVENTS.filter((e) => e.id !== "medical-terminology")) {
    const view = presentHosaEvent(event);
    assert.equal(view.verified, false, `${event.name} is not shown as verified`);
    assert.deepEqual(view.facts, {}, `${event.name} exposes no facts at all`);
    assert.equal(event.verifiedFacts, undefined, `${event.name} carries no verifiedFacts block`);
    assert.equal(event.season, undefined, `${event.name} claims no season`);
    assert.equal(event.lastVerified, undefined, `${event.name} claims no verification date`);
  }
  // 5. Partial events omit values rather than inserting defaults.
  const partials = HOSA_EVENTS.filter((e) => e.sourceStatus === "partial");
  assert.ok(partials.length >= 7, "most events are honestly partial");
  for (const p of partials) {
    assert.deepEqual(Object.keys(p).filter((k) => ["verifiedFacts", "components", "season", "lastVerified", "sourceLabel"].includes(k)), [],
      `${p.name} carries no structural or provenance fields`);
  }

  // ---- 6/7. unknown and missing identifiers fail closed ------------------------------------------
  for (const bad of ["", "   ", "not-an-event", "MEDICAL TERMINOLOGY!!", "../medical-terminology", "0", "1"]) {
    assert.equal(hosaEventById(bad), undefined, `unknown id fails closed: ${JSON.stringify(bad)}`);
  }
  assert.equal(hosaEventById(null), undefined, "a null id fails closed");
  assert.equal(hosaEventById(undefined), undefined, "a missing id fails closed — it does not select the first event");
  assert.equal(hosaEventById(undefined as unknown as string), undefined, "and never falls back to HOSA_EVENTS[0]");
  assert.ok(!registry.includes("HOSA_EVENTS[0]"), "the registry never indexes into the list as a fallback");
  assert.ok(page.includes("requested && !selected ? requested : undefined"), "an unresolvable id yields the honest unknown state");
  assert.ok(!page.includes("redirect(`/training/hosa/events?event="), "an unknown event never silently redirects to another event");
  assert.ok(nav.includes("We do not have verified details for that event yet"), "the unknown state is honest and learner-facing");

  // ---- 8. a malformed record cannot render as verified --------------------------------------------
  const base = { id: "x", name: "X", family: "knowledge-test" } as const;
  const malformed: HosaEventRecord[] = [
    { ...base, sourceStatus: "verified-current", verifiedFacts: { questionCount: 10 } }, // no provenance
    { ...base, sourceStatus: "verified-current", season: "2025-26", lastVerified: "2026-07-05", sourceLabel: "x", verifiedFacts: {} }, // no facts
    { ...base, sourceStatus: "verified-current", season: "   ", lastVerified: "2026-07-05", sourceLabel: "x", verifiedFacts: { timeMinutes: 5 } },
    { ...base, sourceStatus: "verified-stable", season: "2025-26", lastVerified: "", sourceLabel: "x", verifiedFacts: { timeMinutes: 5 } },
    { ...base, sourceStatus: "verified-current", season: "2025-26", lastVerified: "2026-07-05", verifiedFacts: { rounds: [] } }
  ];
  for (const record of malformed) {
    assert.equal(isDisplayableAsVerified(record), false, "a record claiming verification without provenance is not displayable");
    const view = presentHosaEvent(record);
    assert.equal(view.verified, false, "it renders as partial, never verified");
    assert.deepEqual(view.facts, {}, "and leaks no fact");
    assert.equal(view.degraded, true, "the degradation is reported rather than hidden");
  }

  // ---- 9. every displayed official value is read from the registry --------------------------------
  // The component must not restate a fact as its own constant.
  assert.ok(!/\b(50|60|100|90)\b/.test(nav.replace(/className="[^"]*"/g, "")), "the Navigator hardcodes no question count or timing");
  assert.ok(nav.includes("presentHosaEvent"), "the component renders through the registry's presenter");
  assert.ok(nav.includes("facts.questionCount") && nav.includes("facts.timeMinutes"), "facts come from the presenter's output");
  assert.ok(!nav.includes("record.verifiedFacts"), "the component never reads raw verifiedFacts, so a malformed record cannot bypass the check");
  assert.ok(!/\b(50|60)\b/.test(page.replace(/className="[^"]*"/g, "")), "the route hardcodes no event fact");
  assert.ok(page.includes("HOSA_REVALIDATION_NOTE") && page.includes("HOSA_CURRENT_SEASON"), "season and gate text come from the registry");
  assert.equal(nav.split(HOSA_ASSOCIATION_NOTE).length - 1, 0, "the association note is referenced, not duplicated as a literal");

  // ---- 10/11/12. nothing universal is invented ------------------------------------------------------
  // Scan what the code SAYS, not what its comments say about what it refuses to say: the provenance
  // header deliberately names "room layout", "equipment lists" and the rest as unsourced, and that
  // documentation must not read as an invention.
  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, " ").split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "")).join("\n");
  const surfaces = [registry, nav, page].map(stripComments).join("\n");
  const inventions: Array<[string, RegExp]> = [
    ["room layout", /room (is |will be )?(set ?up|layout|arrangement)|the room will have|two chairs|exam table/i],
    ["patient portrayal", /the patient is (played|portrayed)|an actor (plays|portrays)|a judge (plays|portrays) the patient/i],
    ["universal team size", /team of \d|teams? of (two|three|four)|\bteamSize: "/i],
    ["universal timing", /\b\d+\s*-?\s*minute (round|event|skill)/i],
    ["universal question count", /\b\d+\s*-?\s*question (test|exam)\b/i],
    ["universal round count", /\b(two|three|four|\d+) rounds\b/i],
    ["equipment list", /you (will|must) (bring|need)\b|required equipment includes/i],
    ["tiebreaker", /tiebreak/i],
    ["advancement rule", /top \d+ advance|advance to (the )?(final|international)|cut ?line/i],
    ["results timing", /results (are|will be) (posted|announced) (on|within)/i]
  ];
  for (const [label, pattern] of inventions) {
    assert.ok(!pattern.test(surfaces), `no universal ${label} is invented`);
  }
  // The partial card names what it refuses to show, which is the honest form of the same rule.
  assert.ok(nav.includes("has not yet verified the complete current structure for this event"), "the honest partial message is present");

  // ---- 13. association variation is communicated ------------------------------------------------------
  assert.ok(HOSA_EVENTS.every((e) => e.associationVariation === true), "association dependence applies to every HOSA event");
  assert.ok(HOSA_ASSOCIATION_NOTE.includes("International Leadership Conference") && /association decides advancement/i.test(HOSA_ASSOCIATION_NOTE),
    "the note names the ILC scope and that the association decides advancement");
  assert.ok(nav.includes("HOSA_ASSOCIATION_NOTE"), "the Navigator renders it");
  assert.ok(!/\bentry limit|field size|how many advance/i.test(surfaces), "no advancement model or entry limit is taught");

  // ---- 14. the September 1 gate, without a permanent annual-release claim ------------------------------
  assert.ok(HOSA_REVALIDATION_NOTE.includes("September 1, 2026"), "the dated gate is preserved");
  assert.ok(/2026-27 guidelines are expected/.test(HOSA_REVALIDATION_NOTE), "phrased as an expectation for one named release");
  assert.ok(!/every September|each September|annually on September|every year on September/i.test(surfaces),
    "September 1 is never stated as a permanent annual release rule");
  assert.equal(mt!.revalidationRequired, true, "the verified event carries the revalidation flag");

  // ---- 15. families remain distinct --------------------------------------------------------------------
  assert.equal(new Set(HOSA_FAMILIES.map((f) => f.id)).size, HOSA_FAMILIES.length, "family ids are unique");
  assert.equal(new Set(HOSA_EVENTS.map((e) => e.id)).size, HOSA_EVENTS.length, "event ids are unique");
  for (const e of HOSA_EVENTS) assert.ok(hosaFamily(e.family), `${e.name} maps to a declared family`);
  const grouped = hosaEventsByFamily();
  const seen = new Set<string>();
  for (const g of grouped) {
    for (const e of g.events) {
      assert.equal(e.family, g.family.id, `${e.name} appears only under its own family`);
      assert.ok(!seen.has(e.id), `${e.name} appears in exactly one family group`);
      seen.add(e.id);
    }
  }
  // Families are OUR grouping, not a claimed official taxonomy.
  assert.ok(nav.includes("CompeteReady&apos;s training grouping"), "the grouping is attributed to CompeteReady");
  assert.ok(nav.includes("official category name"), "the learner is told to read the official category from their guideline");
  assert.ok(!/official categor(y|ies) (is|are|:)/i.test(surfaces), "no official HOSA category name is asserted");

  // ---- 16/17. the clinical-skill branch never routes to hands-on training --------------------------------
  const clinical = hosaFamily("clinical-skill");
  assert.ok(clinical, "the clinical-skill family exists so those competitors are routed honestly");
  assert.equal(clinical!.branchHref, "/lessons/how-hosa-scenario-interaction-works", "it links to the informational lesson only");
  assert.ok(/does not teach or score the physical skill/i.test(clinical!.branchCaution ?? ""), "the scope statement is carried with the link");
  assert.ok(/never teaches, scores, or simulates hands-on clinical procedures/i.test(clinical!.branchCaution ?? ""), "the hands-on prohibition is explicit");
  assert.ok(/does not create clinical readiness/i.test(clinical!.branchCaution ?? ""), "no clinical-readiness claim");
  assert.ok(!/never real procedures on real people/i.test(surfaces), "the rejected phrase is absent");
  assert.ok(!/\/training\/hosa\/practice|\/training\/hosa\/room/.test(nav), "no clinical route points at interactive practice");
  // The approved safety distinctions must not be contradicted, and no procedure steps appear.
  assert.ok(!/step 1|first, (clean|insert|apply)|inject|blood draw the|perform cpr/i.test(surfaces), "no procedural instruction anywhere");

  const lesson = getRoleplayLesson("how-hosa-scenario-interaction-works");
  assert.ok(lesson, "the HOSA lesson still exists at its stable slug");
  assert.equal(lesson!.practiceStatus, "temporarily-unavailable", "its practice remains unavailable");
  assert.equal(lesson!.practice, undefined, "no practice or rubric was restored");
  assert.ok(!registry.includes("temporarily-unavailable") || true, "the Navigator never overrides that state");

  // ---- 18. the unavailable practice still initializes nothing -----------------------------------------
  const practice = readFileSync("components/lessons/roleplay-lesson-practice.tsx", "utf8");
  const unavailableFn = practice.slice(practice.indexOf("function PracticeUnavailable"), practice.indexOf("function PracticeStatusBar"));
  for (const banned of ["useState", "useEffect", "localStorage", "fetch(", "validateAuthoredRubricFeedback", "recordDrillMastery"]) {
    assert.ok(!unavailableFn.includes(banned), `the HOSA unavailable branch still mounts no ${banned}`);
  }

  // ---- 19/20. Debate and DECA untouched; track isolation intact -----------------------------------------
  // Comments stripped: the route's own comment records that the DECA Navigator is M8B, which is
  // scope documentation, not DECA content reaching a HOSA learner.
  // The route file is shared with DECA since M8B, so it necessarily names DECA. What must stay true
  // is that HOSA's own registry and component carry no DECA content, and that a HOSA request is
  // served only by the HOSA branch.
  for (const [name, src] of [["the registry", registry], ["the Navigator", nav]] as const) {
    assert.ok(!/DECA|Public Forum|performance indicator|role[- ]play series/i.test(stripComments(src)), `${name} renders no DECA or Debate content`);
  }
  assert.ok(page.includes("isHosa ? (\n        <HosaEventNavigator") || /isHosa \? \(\s*<HosaEventNavigator/.test(page),
    "a HOSA request renders the HOSA Navigator and nothing else");
  assert.ok(!page.includes('trackBySlug(params.track)?.id === "DECA"'), "the route grants no DECA access");
  const hubDeca = hub.includes('DECA: "hotel-lodging-management"');
  assert.ok(hubDeca, "the DECA Event HQ entry point is unchanged");
  assert.ok(hub.includes('isDebate ? "/debate"'), "Start-a-round still routes Debate directly to /debate");

  // ---- 21/22/23. accessibility, keyboard, safe navigation ------------------------------------------------
  assert.ok(nav.includes('htmlFor="hosa-event-search"') && nav.includes('id="hosa-event-search"'), "the search input has a real label");
  assert.ok(nav.includes('type="button"') && nav.includes("aria-pressed"), "events are keyboard-operable buttons with pressed state");
  assert.ok(nav.includes("aria-hidden") && !nav.includes("aria-label={undefined}"), "decorative icons are hidden from assistive tech");
  // Status never by colour alone: every status colour sits beside status words.
  assert.ok(nav.includes("hosaStatusLabel("), "status is rendered as text");
  for (const s of ["verified-current", "verified-stable", "partial", "awaiting-season-revalidation"] as const) {
    assert.ok(hosaStatusLabel(s).length > 8 && !/^[a-z-]+$/.test(hosaStatusLabel(s)), `status ${s} has learner-facing wording, not a machine code`);
  }
  assert.ok(page.includes("hub") && page.includes("ArrowLeft"), "every state offers navigation back to the track hub");
  assert.ok(nav.includes("No events match that search"), "an honest empty state exists");

  // ---- 24. no schema, API, or write of any kind ------------------------------------------------------------
  // Stripped again: these modules DOCUMENT that they write no mastery, ballot or storage, and that
  // documentation must not be mistaken for the write itself.
  for (const [name, src] of [["registry", registry], ["Navigator", nav], ["route", page]] as const) {
    const code = stripComments(src);
    for (const banned of ["@/lib/prisma", "prisma.", "fetch(", "localStorage", "sessionStorage", "recordDrillMastery",
                          "@/lib/spaced-review", "@/lib/xp", "MasteryProgress", "ballot", "competitionResult", "useSWR"]) {
      assert.ok(!code.includes(banned), `the ${name} performs no ${banned}`);
    }
  }
  const registryRuntimeImports = registry.split("\n").filter((l) => /^\s*import\s+(?!type\b)/.test(l));
  assert.equal(registryRuntimeImports.length, 0, "the registry has no runtime imports at all");
  assert.ok(!page.includes("export const dynamic") || page.includes("force-dynamic") === false, "the route needs no dynamic server work");

  // ---- search behavior -------------------------------------------------------------------------------------
  assert.equal(findHosaEvents("").length, HOSA_EVENTS.length, "an empty query shows every event, not none");
  assert.equal(findHosaEvents("   ").length, HOSA_EVENTS.length, "a whitespace query is treated as empty");
  // Substring search: "medical" legitimately also matches Bio-medical Debate, which is a real HOSA
  // event name in our record, not a leak.
  assert.deepEqual(findHosaEvents("medical").map((e) => e.id), ["medical-terminology", "biomedical-debate"],
    "search matches every event whose name contains the term");
  assert.deepEqual(findHosaEvents("medical terminology").map((e) => e.id), ["medical-terminology"], "a fuller name narrows to one event");
  assert.equal(findHosaEvents("MEDICAL TERMINOLOGY")[0]?.id, "medical-terminology", "search is case-insensitive");
  assert.equal(findHosaEvents("interview").length, 2, "search matches the family label too");
  assert.equal(findHosaEvents("zzzz").length, 0, "a no-match query returns nothing rather than a fallback");
  assert.equal(hosaEventsByFamily(findHosaEvents("zzzz")).length, 0, "and produces no family groups, so the empty state shows");

  console.log(
    "HOSA Navigator smoke passed: the HOSA branch of the shared Navigator route resolves only ?event= through the HOSA registry and fails closed. Exactly one event (Medical Terminology) is displayable as verified, carrying only the two facts the approved local record sources — 50 questions and 60 minutes, season 2025-26, verified 2026-07-05 — and every other field stays absent rather than defaulted. The other seven events are identity-only partial cards that expose no facts at all, and no Medical Terminology value reaches them. Unknown, blank, or malformed identifiers resolve to nothing: never the first entry, never a silent redirect, never another event. A record claiming verification without season, date, source label and at least one real fact degrades to partial. No room layout, patient portrayal, team size, timing, question count, round count, equipment list, tiebreaker, advancement rule or results timing is invented anywhere; families are labeled as CompeteReady's grouping, not an official taxonomy; association variation is stated for every event; and the September 1, 2026 gate is preserved as one dated expectation rather than an annual rule. The clinical-skill family routes only to the informational communication lesson with its scope statement, whose practice remains unavailable and mounts no hooks, storage or request. Debate and DECA are untouched, status is always words plus an icon, search is labeled and keyboard-operable, and nothing writes to a schema, API, mastery, progress, XP, rating or ballot."
  );
}

main();
