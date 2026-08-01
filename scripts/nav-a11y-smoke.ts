/**
 * Navigation, mobile-structure and accessibility regression (M10).
 *
 * Renders the REAL route and components through react-dom/server and asserts on the produced markup.
 * This is server-side render proof plus markup inspection — NOT a browser viewport measurement. Real
 * layout, focus order, screen-reader output and touch behaviour remain unverified here and are
 * called out as such in the summary.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// tsconfig jsx=preserve => classic React.createElement, so React must be global before the
// component modules are evaluated.
(globalThis as { React?: unknown }).React = React;
/* eslint-disable @typescript-eslint/no-var-requires */
const EventNavigatorPage = require("../app/(app)/training/[track]/events/page").default;
const TrackHubPage = require("../app/(app)/training/[track]/page").default;
const { LessonView } = require("../components/lessons/lesson-view");
const { RoleplayLessonView } = require("../components/lessons/roleplay-lesson-view");
const { RoleplayLessonPractice } = require("../components/lessons/roleplay-lesson-practice");
const { getLesson } = require("../lib/lessons");
const { getRoleplayLesson } = require("../lib/roleplay-lessons");

const decode = (h: string) =>
  h.replace(/&#x27;|&#39;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, "&");
const render = (el: unknown) => decode(renderToStaticMarkup(el as never));
/** Visible text with every tag — and therefore every styling class — removed. */
const visible = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const route = (track: string, searchParams?: Record<string, unknown>) =>
  render(React.createElement(EventNavigatorPage, { params: { track }, searchParams } as never));
const hub = (track: string) => render(React.createElement(TrackHubPage, { params: { track } } as never));

function main() {
  const results: string[] = [];
  const ok = (m: string) => results.push(`  ok  ${m}`);
  const MACHINE = ["verified-current", "verified-stable", "awaiting-season-revalidation", "tier-2",
                   "stable-teaching", "sourceStatus", "possibly-outdated", "role-play\"", "knowledge-test"];

  // ================= hubs and canonical navigation =================
  const debateHub = hub("debate");
  assert.ok(debateHub.includes('href="/debate"'), "Start Debate links to /debate");
  assert.ok(!debateHub.includes("/training/debate/events"), "the Debate hub offers no Event Navigator");
  assert.ok(debateHub.includes("/training/debate/event/public-forum"), "the Debate Event HQ link is unchanged");
  const decaHub = hub("deca");
  assert.ok(decaHub.includes('href="/training/deca/events"'), "the DECA hub links to its Navigator");
  assert.ok(decaHub.includes("/training/deca/event/hotel-lodging-management"), "the DECA Event HQ link is unchanged");
  assert.ok(!/\/training\/hosa|Medical Terminology/.test(decaHub), "the DECA hub shows no HOSA content");
  const hosaHub = hub("hosa");
  assert.ok(hosaHub.includes('href="/training/hosa/events"'), "the HOSA hub links to its Navigator");
  assert.ok(hosaHub.includes("/training/hosa/event/medical-terminology"), "the HOSA Event HQ link is unchanged");
  assert.ok(!/\/training\/deca|Performance Indicator/.test(hosaHub), "the HOSA hub shows no DECA content");
  ok("all three canonical hubs render with correct, track-local navigation");

  // Debate's Navigator route stays closed.
  let debateClosed = false;
  try { route("debate"); } catch { debateClosed = true; }
  assert.ok(debateClosed, "/training/debate/events fails closed");
  ok("/training/debate/events fails closed");

  // ================= Navigator states, both tracks =================
  const cases = [
    { track: "hosa", param: "event", valid: "medical-terminology", foreign: "individual-series", label: "HOSA" },
    { track: "deca", param: "family", valid: "individual-series", foreign: "medical-terminology", label: "DECA" }
  ] as const;

  for (const c of cases) {
    const listAnchor = c.track === "hosa" ? "Find your event" : "Find your event family";
    const initial = route(c.track);
    assert.ok(initial.includes(listAnchor), `${c.label} Navigator initial state renders its list`);
    assert.ok(!initial.includes("We do not have verified details"), `${c.label} missing parameter selects no record`);
    const head = (h: string) => h.slice(0, h.indexOf(listAnchor));
    assert.equal(visible(head(initial)).includes("Where to train"), false, `${c.label} missing parameter renders no detail card`);

    // Valid selection (positive control).
    const valid = route(c.track, { [c.param]: c.valid });
    assert.ok(visible(head(valid)).length > 0 && head(valid).includes("Where to train"), `${c.label} resolves its own valid identifier`);

    // The other track's identifier, and the other track's parameter name, both select nothing.
    for (const [desc, sp] of [
      ["a foreign identifier", { [c.param]: c.foreign }],
      ["the other track's parameter", { [c.param === "event" ? "family" : "event"]: c.valid }],
      ["a repeated parameter", { [c.param]: [c.valid, c.foreign] }]
    ] as const) {
      const html = route(c.track, sp as Record<string, unknown>);
      const detail = head(html);
      assert.ok(html.includes(listAnchor), `${c.label} keeps the list after ${desc}`);
      assert.ok(!detail.includes("Where to train"), `${c.label} selects no record for ${desc}`);
      if (desc === "a foreign identifier") {
        assert.ok(detail.includes("We do not have verified details"), `${c.label} shows the honest unknown state for ${desc}`);
      } else {
        assert.ok(!detail.includes("We do not have verified details"), `${c.label} treats ${desc} as absent, not unknown`);
      }
    }

    // Malformed identifiers -> honest unknown state with recovery, never a silent redirect.
    for (const bad of ["not-a-record", "   ", "../medical-terminology", "0"]) {
      const html = route(c.track, { [c.param]: bad });
      const detail = head(html);
      assert.ok(!detail.includes("Where to train"), `${c.label} selects nothing for ${JSON.stringify(bad)}`);
      assert.ok(html.includes(listAnchor), `${c.label} offers list recovery for ${JSON.stringify(bad)}`);
      assert.ok(html.includes(`href="/training/${c.track}"`), `${c.label} offers hub recovery for ${JSON.stringify(bad)}`);
    }
    ok(`${c.label} Navigator: valid resolves, foreign/repeated/malformed all fail closed with recovery`);

    // ---- accessibility of the search + selection controls -------------------------------------
    const inputId = c.track === "hosa" ? "hosa-event-search" : "deca-family-search";
    assert.ok(initial.includes(`for="${inputId}"`) && initial.includes(`id="${inputId}"`), `${c.label} search input has a real label`);
    assert.equal((initial.match(new RegExp(`id="${inputId}"`, "g")) ?? []).length, 1, `${c.label} search input id is unique`);
    assert.ok(/<button type="button"[^>]*aria-pressed=/.test(initial), `${c.label} selection uses real buttons with pressed state`);
    assert.ok(!/<div[^>]*onClick/.test(initial), `${c.label} has no click-handling non-button`);
    assert.ok(/<ul/.test(initial) && /<li/.test(initial), `${c.label} lists use semantic list markup`);
    // Navigation is links; selection is buttons.
    assert.ok(/<a [^>]*href="\/training\//.test(initial) || /<a [^>]*href="\/lessons\//.test(valid), `${c.label} navigation uses links`);

    // ---- duplicate ids across rendered states ---------------------------------------------------
    for (const html of [initial, valid]) {
      const ids = Array.from(html.matchAll(/\sid="([^"]+)"/g)).map((m) => m[1]);
      assert.equal(new Set(ids).size, ids.length, `${c.label} renders no duplicate element id`);
    }

    // ---- mobile-safe structure -------------------------------------------------------------------
    for (const html of [initial, valid]) {
      assert.ok(!/whitespace-nowrap/.test(html), `${c.label} uses no whitespace-nowrap on essential text`);
      assert.ok(!/\bw-\[\d{3,}px\]|\bmin-w-\[\d{3,}px\]/.test(html), `${c.label} sets no fixed pixel width`);
      assert.ok(!/overflow-x-scroll/.test(html), `${c.label} needs no horizontal scroll`);
      assert.ok(!/hover:block|group-hover:(block|flex)/.test(html), `${c.label} hides no essential content behind hover`);
      assert.ok(!/\stitle="/.test(html), `${c.label} puts no essential information in a tooltip only`);
      assert.ok(!/aria-live|role="alert"/.test(html), `${c.label} introduces no unnecessary live region`);
    }
    ok(`${c.label} Navigator markup is labeled, semantic, unique-id and mobile-safe`);

    // ---- status is words, not colour ---------------------------------------------------------------
    const strippedInitial = visible(initial);
    const strippedValid = visible(valid);
    assert.notEqual(strippedInitial, strippedValid, `${c.label} verified and initial states differ in TEXT`);
    for (const code of MACHINE) {
      assert.ok(!strippedValid.includes(code), `${c.label} shows no machine code (${code}) as learner text`);
    }
    assert.ok(/not yet verified|Verified against/i.test(strippedInitial), `${c.label} status wording survives with all styling removed`);
    ok(`${c.label} status is conveyed by visible words with styling stripped`);
  }

  // ================= track-specific detail regressions =================
  const mt = route("hosa", { event: "medical-terminology" });
  assert.ok(mt.includes("Official HOSA source") && mt.includes("Current for 2025-26") && mt.includes("Last verified July 5, 2026"),
    "Medical Terminology keeps its approved provenance");
  const partial = route("hosa", { event: "hosa-bowl" });
  assert.ok(!partial.includes("Official HOSA source") && !partial.includes("Last verified"), "a partial HOSA event inherits no provenance");
  assert.ok(visible(partial).includes("Complete current details not yet verified"), "and says so in words");
  // M11R9: this was `"Don't see your event?".replace("'", "'")` — a transform whose output equals
  // its input — OR'd with `mt.includes("Don")`, which almost any HOSA markup satisfies. Both halves
  // are gone: the rendered markup is DECODED once and the real section title is required.
  assert.ok(decode(mt).includes("Don't see your event?"), "the family-level routing section is present");
  assert.ok(!/Both responses reviewed/.test(mt), "no DECA rubric surface leaks into HOSA");
  const tdm = route("deca", { family: "team-decision-making" });
  assert.ok(!/\d{1,3}\s*%/.test(visible(tdm)) && tdm.includes("Guide and its published sample conflict"),
    "TDM shows no weighting figure and states the unresolved conflict");
  const psc = route("deca", { family: "professional-selling-and-consulting" });
  assert.ok(psc.includes('href="/training/deca"') && !psc.includes('href="/lessons/how-deca-roleplay-works"'),
    "PSC routes to the DECA hub, never the role-play lesson");
  for (const id of ["prepared-events", "written-events", "online-events"]) {
    const html = route("deca", { family: id });
    assert.ok(!html.includes('href="/lessons/how-deca-roleplay-works"'), `${id} never links into role-play practice`);
    assert.ok(visible(html).includes("outside CompeteReady's current role-play course"), `${id} says it is out of scope`);
  }
  ok("verified, partial, unresolved and out-of-scope details all behave correctly");

  // ================= lessons and the withdrawn HOSA practice =================
  const debateLesson = getLesson("debate-claim-warrant-impact") ?? getLesson("claim-warrant-impact");
  const debateHtml = render(React.createElement(LessonView, { lesson: debateLesson } as never));
  assert.ok(visible(debateHtml).includes("NSDA Debate Training Guide"), "the Debate lesson shows its specific source");
  assert.ok(!/Medical Terminology|Performance Indicator/.test(debateHtml), "the Debate lesson leaks no other track's content");
  const hosaLesson = getRoleplayLesson("how-hosa-scenario-interaction-works");
  assert.equal(hosaLesson.practiceStatus, "temporarily-unavailable", "HOSA practice remains temporarily unavailable");
  const practiceHtml = render(React.createElement(RoleplayLessonPractice, { lesson: hosaLesson, userScope: null } as never));
  assert.ok(!practiceHtml.includes("<textarea") && !practiceHtml.includes("<button"), "the unavailable practice renders no input or action control");
  assert.ok(visible(practiceHtml).includes(hosaLesson.practiceUnavailable.title), "and explains itself in visible text");
  const rpHtml = render(React.createElement(RoleplayLessonView, { lesson: hosaLesson } as never));
  assert.ok(visible(rpHtml).includes("does not create clinical readiness"), "the HOSA lesson keeps its clinical boundary in visible text");
  ok("lesson provenance renders per track and the withdrawn HOSA practice stays inert");

  // ================= app shell: desktop AND mobile reachability =================
  const shell = readFileSync("components/app/app-shell.tsx", "utf8");
  assert.ok(shell.includes('BOTTOM_BAR_HREFS = ["/home", "/training", "/compete", "/teams"]'), "a mobile bottom bar exists and includes /training");
  assert.ok(/grid-cols-4[^"]*lg:hidden|lg:hidden[^"]*grid-cols-4/.test(shell), "the bottom bar is a mobile-only region");
  assert.ok(shell.includes('{ href: "/training"'), "desktop navigation also reaches /training");
  assert.ok(!/onMouseEnter|onMouseOver|hover:block|group-hover:(block|flex)/.test(shell), "no navigation depends on hover");
  ok("both desktop and mobile navigation reach /training, the only path to either Navigator");

  console.log(results.join("\n"));
  // ============ M11R9: button content semantics and heading outline ============
  // Both checks run on RENDERED markup and are proven on fixtures, so neither can silently pass.
  const paragraphInButton = (html: string): number =>
    (html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []).filter((b) => /<p\b/.test(b)).length;
  const nestedInteractive = (html: string): number =>
    (html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [])
      .filter((b) => /<(?:a|button|input|select|textarea)\b/.test(b.replace(/^<button\b[^>]*>/, ""))).length;
  const headingLevels = (html: string): number[] =>
    (html.match(/<h([1-6])\b[^>]*>/g) ?? []).map((h) => Number(/<h([1-6])/.exec(h)![1]));
  const skipsALevel = (levels: number[]): boolean => {
    let prev = 0;
    for (const lvl of levels) {
      if (prev && lvl > prev + 1) return true;
      prev = lvl;
    }
    return false;
  };

  // CONTROLS FIRST — a check that cannot fail is worth nothing.
  assert.equal(paragraphInButton("<button><p>Invalid text</p></button>"), 1,
    "control: the button check rejects a paragraph inside a button");
  assert.equal(paragraphInButton('<button><span class="block">Valid text</span></button>'), 0,
    "control: and accepts a phrasing-content button");
  assert.equal(nestedInteractive('<button><a href="/x">go</a></button>'), 1,
    "control: the nesting check rejects an anchor inside a button");
  assert.equal(nestedInteractive('<button><span>go</span></button>'), 0, "control: and accepts a plain button");
  assert.ok(skipsALevel(headingLevels("<h1>Page</h1><h3>Skipped section</h3>")),
    "control: the outline check rejects h1 -> h3");
  assert.ok(!skipsALevel(headingLevels("<h1>Page</h1><h2>Section</h2><h3>Sub</h3>")),
    "control: and accepts h1 -> h2 -> h3");
  assert.ok(!skipsALevel(headingLevels("<h1>Page</h1><h2>Section</h2>")), "control: and accepts h1 -> h2");
  // Tailwind class digits must never be read as heading levels.
  assert.deepEqual(headingLevels('<div class="h-3 gap-2"><h2 class="text-h1">x</h2></div>'), [2],
    "control: class names are not mistaken for heading levels");

  // PRODUCTION — every rendered navigator state.
  const m11r9States: Array<[string, string]> = [
    ["DECA default", route("deca")],
    ["DECA selected family", route("deca", { family: "team-decision-making" })],
    ["DECA unresolved PSC", route("deca", { family: "professional-selling-and-consulting" })],
    ["DECA unknown family", route("deca", { family: "not-a-family" })],
    ["HOSA default", route("hosa")],
    ["HOSA selected Medical Terminology", route("hosa", { event: "medical-terminology" })],
    ["HOSA partial event", route("hosa", { event: "hosa-bowl" })],
    ["HOSA unknown event", route("hosa", { event: "not-an-event" })]
  ];
  for (const [label, html] of m11r9States) {
    assert.ok(html.includes("<button"), `${label}: really rendered interactive controls (the scans below mean something)`);
    assert.equal(paragraphInButton(html), 0, `${label}: no button contains a paragraph`);
    assert.equal(nestedInteractive(html), 0, `${label}: no button contains another interactive element`);
    const levels = headingLevels(html);
    assert.equal(levels.filter((l) => l === 1).length, 1, `${label}: exactly one h1`);
    assert.ok(!skipsALevel(levels), `${label}: the heading outline skips no level (${levels.map((l) => `h${l}`).join(" ")})`);
    assert.ok(levels.length >= 3, `${label}: the page really has a section outline`);
    // Every result button keeps a useful accessible name from its own visible text.
    for (const button of html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []) {
      const name = visible(decode(button));
      assert.ok(name.length > 0 || /aria-label="[^"]+"/.test(button), `${label}: every button has an accessible name`);
    }
  }

  // ============ M11R11: the project focus-visible utility on every result button ============
  {
    // The utility is the project's own, defined once in globals.css and already used by the shared
    // Button/Input/Textarea primitives — not a second focus system invented here.
    const css = readFileSync("app/globals.css", "utf8");
    assert.ok(/\.focus-ring\s*\{[^}]*focus-visible:ring-2/.test(css),
      "the project focus utility exists and is keyboard-scoped (:focus-visible)");
    assert.ok(readFileSync("components/ui/button.tsx", "utf8").includes("focus-ring"),
      "and it is the same utility the shared Button primitive uses");
    // Colorblind mode adds an outline on top rather than removing the ring.
    assert.ok(/html\[data-colorblind\][^{]*:focus-visible\s*\{[^}]*outline:/.test(css),
      "colorblind mode reinforces focus with an outline instead of suppressing it");

    for (const [label, html, selectedParam] of [
      ["DECA", route("deca"), route("deca", { family: "team-decision-making" })],
      ["HOSA", route("hosa"), route("hosa", { event: "medical-terminology" })]
    ] as const) {
      const resultButtons = (markup: string) =>
        (markup.match(/<button\b[^>]*aria-pressed=[^>]*>/g) ?? []);
      const buttons = resultButtons(html);
      assert.ok(buttons.length > 0, `${label}: result buttons render (the scan means something)`);
      for (const button of buttons) {
        assert.ok(/class="[^"]*focus-ring/.test(button), `${label}: every result button carries the focus utility`);
        assert.ok(/aria-pressed="(true|false)"/.test(button), `${label}: and keeps its pressed state`);
        assert.ok(/type="button"/.test(button), `${label}: and stays a native button`);
      }
      // The SELECTED button keeps the utility too — selection styling must not replace focus styling.
      const selected = resultButtons(selectedParam).filter((b) => /aria-pressed="true"/.test(b));
      assert.equal(selected.length, 1, `${label}: exactly one selected result button`);
      assert.ok(/class="[^"]*focus-ring/.test(selected[0]),
        `${label}: the selected button still carries the focus utility`);
      assert.ok(/border-primary/.test(selected[0]), `${label}: alongside its selected styling`);
    }

    // ---- Non-vacuous controls ----
    const withUtility = '<button type="button" aria-pressed="false" class="focus-ring w-full rounded-lg border">x</button>';
    const withoutUtility = '<button type="button" aria-pressed="false" class="w-full rounded-lg border">x</button>';
    assert.ok(/class="[^"]*focus-ring/.test(withUtility), "control: a button WITH the utility passes");
    assert.ok(!/class="[^"]*focus-ring/.test(withoutUtility), "control: a button WITHOUT it is rejected");
    const selectedFixture = '<button type="button" aria-pressed="true" class="focus-ring border-primary">x</button>';
    assert.ok(/class="[^"]*focus-ring/.test(selectedFixture) && /aria-pressed="true"/.test(selectedFixture),
      "control: a selected button still exposes the utility");
  }

  console.log(
    "\nNav/a11y smoke passed: all three hubs render track-local navigation with Start Debate on /debate and both Event HQ links unchanged; /training/debate/events fails closed. Each Navigator resolves only its own identifier through its own parameter — a foreign id shows the honest unknown state, while the other track's parameter and a repeated parameter are treated as absent, and malformed input always keeps list + hub recovery without a silent redirect. Search inputs carry real labels with unique ids, selection uses real buttons with aria-pressed, navigation uses links, lists are semantic, and no state renders a duplicate id, a tooltip-only fact, a hover-only control, a fixed pixel width, whitespace-nowrap, or an unnecessary live region. Status wording survives with every styling class stripped, and no machine code reaches learner text. Medical Terminology keeps its provenance while partial events inherit none; TDM shows no weighting; PSC and the prepared/written/online families never link into role-play practice; the withdrawn HOSA practice renders no control at all. NOTE: this is SSR + markup proof only — real viewport layout, focus order and screen-reader output are NOT verified here."
  );
}

main();
