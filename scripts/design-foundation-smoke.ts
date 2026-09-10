/**
 * design-foundation:smoke — DESIGN F1, the accessible semantic foundation.
 *
 * Deterministic and offline: reads source, parses the stylesheet's token blocks, and renders the
 * primitives with react-dom/server. No provider, no database, no network.
 *
 * What it protects:
 *   1. every accessibility mode that re-tints the card surface or the page text also owns the card text
 *   2. CardTitle can render the heading level a page's outline needs, and defaults to what it always was
 *   3. the lesson catalog keeps course groups above their lessons in the outline
 *   4. the Select primitive keeps a real, associated label and the Input's 44px target
 *   5. the profile username chip stands on an opaque surface, not on the gradient
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// tsconfig jsx=preserve => classic React.createElement; the global must exist before components load.
(globalThis as { React?: unknown }).React = React;
/* eslint-disable @typescript-eslint/no-var-requires */
const { Card, CardHeader, CardTitle } = require("../components/ui/card");
const { Select, SelectField } = require("../components/ui/select");

const read = (path: string) => readFileSync(path, "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const render = (el: unknown) => renderToStaticMarkup(el as never);

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

/** The declarations inside one `selector { ... }` block of the stylesheet, as a name -> value map. */
function tokenBlock(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  assert.ok(start >= 0, `stylesheet has a ${selector} block`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const body = css.slice(open + 1, close);
  const out: Record<string, string> = {};
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*(--[a-z-]+):\s*([^;]+);/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
check("F1-1. every mode that re-tints the card or the page text owns the card text too", () => {
  const css = stripComments(read("app/globals.css"));
  const modes: Array<[string, string]> = [
    ["eye comfort (dark)", "html[data-eye-comfort] {"],
    ["eye comfort (light, explicit)", 'html[data-theme="light"][data-eye-comfort] {'],
    ["eye comfort (light, system)", "html:not([data-theme])[data-eye-comfort] {"],
    ["high contrast (dark)", "html[data-high-contrast] {"],
    ["high contrast (light, explicit)", 'html[data-theme="light"][data-high-contrast] {'],
    ["high contrast (light, system)", "html:not([data-theme])[data-high-contrast] {"]
  ];
  for (const [label, selector] of modes) {
    const block = tokenBlock(css, selector);
    assert.ok(block["--foreground"], `F1-1a ${label} sets the page foreground`);
    assert.ok(block["--card-foreground"], `F1-1b ${label} sets the card foreground as well`);
    // The deliberate rule: the card text is the mode's own page text, so the two never diverge.
    assert.equal(block["--card-foreground"], block["--foreground"], `F1-1c ${label} card text equals the mode's page text`);
  }
  // Control: the defaults still define both, so the token really exists to override.
  const root = tokenBlock(css, ":root {");
  assert.ok(root["--card-foreground"] && root["--card"], "F1-1d the default card tokens are intact");
  // And the Card primitive really applies it — otherwise the token would be decoration.
  assert.match(stripComments(read("components/ui/card.tsx")), /"rounded-lg border bg-card text-card-foreground"/, "F1-1e the Card primitive uses the card foreground token");
});

check("F1-2. CardTitle renders the level the outline needs, and defaults to h3", () => {
  const html3 = render(React.createElement(CardTitle, null, "Title"));
  assert.match(html3, /^<h3 class="text-lg font-semibold leading-none">Title<\/h3>$/, "F1-2a the default is the h3 every existing caller had");
  const html2 = render(React.createElement(CardTitle, { as: "h2" }, "Section"));
  assert.match(html2, /^<h2 class="text-lg font-semibold leading-none">Section<\/h2>$/, "F1-2b as=\"h2\" renders a real h2 with the same appearance");
  const html4 = render(React.createElement(CardTitle, { as: "h4", className: "extra" }, "Item"));
  assert.match(html4, /^<h4 class="text-lg font-semibold leading-none extra">Item<\/h4>$/, "F1-2c as=\"h4\" renders an h4 and keeps className");
  // Type-level: the union is the whole contract, and nothing infers a level from depth.
  const src = stripComments(read("components/ui/card.tsx"));
  assert.match(src, /export type CardTitleLevel = "h2" \| "h3" \| "h4";/, "F1-2d the allowed levels are a closed union");
  assert.match(src, /as: Level = "h3"/, "F1-2e the default is stated once, in the component");
  assert.ok(!/useContext|depth|nesting/.test(src), "F1-2f no level is inferred from nesting");
  // Composition still works inside a Card.
  const composed = render(
    React.createElement(Card, null, React.createElement(CardHeader, null, React.createElement(CardTitle, { as: "h2" }, "Composed")))
  );
  assert.match(composed, /<div class="rounded-lg border bg-card text-card-foreground shadow-sm">/, "F1-2g Card is unchanged");
  assert.match(composed, /<h2 class="text-lg font-semibold leading-none">Composed<\/h2>/, "F1-2h and carries the chosen level");
});

check("F1-3. the lesson catalog keeps course groups above their lessons", () => {
  const catalog = stripComments(read("app/(app)/lessons/page.tsx"));
  assert.match(catalog, /<h2 id=\{`course-\$\{group\.key\}`\} className="text-lg font-bold">/, "F1-3a a course group is an h2");
  assert.match(catalog, /<h3 className="mt-3 text-xl font-bold">\{card\.title\}<\/h3>/, "F1-3b and each lesson inside it is an h3");
  assert.ok(!/<h2 className="mt-3 text-xl font-bold">\{card\.title\}<\/h2>/.test(catalog), "F1-3c the group/member collision is gone");
  assert.match(catalog, /<h1 className="page-title">/, "F1-3d under the page's single h1");
});

check("F1-4. the Select primitive is a labelled, 44px native control in the Input's vocabulary", () => {
  const field = render(
    React.createElement(
      SelectField,
      { id: "cluster", label: "Career cluster", help: "Shapes the scenario." },
      React.createElement("option", { value: "a" }, "A")
    )
  );
  assert.match(field, /<label class="block text-sm font-medium text-foreground mb-1" for="cluster">Career cluster<\/label>/, "F1-4a a visible label points at the control by id");
  const selectTag = (field.match(/<select[^>]*>/) ?? [""])[0];
  assert.ok(/\bid="cluster"/.test(selectTag) && /aria-describedby="cluster-help"/.test(selectTag), "F1-4b and help text is announced through aria-describedby");
  assert.match(field, /<p id="cluster-help"/, "F1-4c which really exists");
  assert.match(field, /focus-ring flex h-11 w-full appearance-none rounded-md border border-input bg-surface-interactive/, "F1-4d the control wears the Input's height, ring, border and fill");
  const errored = render(React.createElement(SelectField, { id: "d", label: "Difficulty", error: "Pick one." }));
  assert.match(errored, /aria-invalid="true"/, "F1-4e an error marks the control invalid in attributes");
  assert.match(errored, /<p id="d-error"[^>]*>Pick one\.<\/p>/, "F1-4f and in words");
  const bare = render(React.createElement(Select, { "aria-label": "Bare" }, React.createElement("option", null, "x")));
  assert.ok(/<select[^>]*aria-label="Bare"/.test(bare), "F1-4g the bare Select passes native attributes through");
  assert.match(bare, /aria-hidden="true"/, "F1-4h the chevron is decorative");
  // The Input it must match, by its own class string.
  assert.match(stripComments(read("components/ui/input.tsx")), /"focus-ring flex h-11 w-full rounded-md border border-input bg-surface-interactive/, "F1-4i control: the Input vocabulary this copies is unchanged");
});

check("F1-5. the profile username chip stands on an opaque surface, not on the gradient", () => {
  const profile = stripComments(read("app/(app)/profile/page.tsx"));
  assert.match(profile, /<Badge variant="outline" className="bg-card text-foreground">\s*@\{username\}/, "F1-5a the chip has its own card surface and the page foreground");
  assert.ok(!/<Badge variant="secondary">@\{username\}<\/Badge>/.test(profile), "F1-5b the tinted-on-gradient variant is gone");
  assert.match(profile, /bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500/, "F1-5c control: the banner itself is untouched");
});

check("F1-6. standard app pages wear the one page-title class; heroes and content titles are the named exceptions", () => {
  // The named type scale existed but lost to raw utilities about fifty to one. Standard pages — a page
  // that names a PLACE — now use `page-title`. A page whose h1 is a piece of CONTENT (a lesson title, a
  // debate motion, a learner's name) or a display hero keeps its own treatment, and that list is stated
  // here so the exception is a decision, not a leftover.
  const standard = [
    "app/(app)/dashboard/page.tsx", "app/(app)/debate/page.tsx", "app/(app)/debates/history/page.tsx",
    "app/(app)/onboarding/diagnostic/page.tsx", "app/(app)/resources/page.tsx", "app/(app)/settings/page.tsx",
    "app/(app)/skills/page.tsx", "app/(app)/study-arcade/page.tsx", "app/(app)/study-arcade/review/page.tsx",
    "app/(app)/teams/page.tsx", "app/(app)/tests/[testId]/page.tsx", "app/(app)/tests/[testId]/results/page.tsx",
    "app/(app)/tests/page.tsx", "app/(app)/training/[track]/practice/page.tsx", "app/(app)/assignments/page.tsx",
    "app/(app)/compete/page.tsx", "app/(app)/lessons/page.tsx", "app/(app)/training/[track]/page.tsx",
    "app/(app)/training/page.tsx", "app/(app)/training/[track]/events/page.tsx", "app/(app)/training/[track]/event/[eventSlug]/page.tsx"
  ];
  for (const file of standard) {
    const src = stripComments(read(file));
    const h1s = src.match(/<h1 className="[^"]*"/g) ?? [];
    assert.ok(h1s.length > 0, `F1-6a ${file} renders an h1`);
    for (const h1 of h1s) assert.match(h1, /className="page-title/, `F1-6b ${file} h1 uses page-title: ${h1}`);
    assert.ok(!/<h1 className="[^"]*text-3xl font-bold/.test(src), `F1-6c ${file} carries no raw 3xl h1`);
  }
  // Justified exceptions, by name.
  assert.match(stripComments(read("app/(app)/home/page.tsx")), /<h1 className="display-title">/, "F1-6d Home is the one display hero inside the shell");
  assert.match(stripComments(read("app/page.tsx")), /<h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">/, "F1-6e the marketing hero keeps its own treatment");
  for (const [file, why] of [
    ["app/(app)/profile/page.tsx", "a learner's display name"],
    ["components/lessons/concept-education-lesson-view.tsx", "a lesson title"],
    ["components/lessons/lesson-view.tsx", "a lesson title"],
    ["app/(app)/debates/[debateId]/replay/page.tsx", "a debate motion"]
  ] as const) {
    const src = stripComments(read(file));
    assert.ok(/<h1 className="[^"]*font-bold/.test(src) && !/<h1 className="page-title/.test(src), `F1-6f ${file} keeps a content title (${why}) in the reading face, not uppercase display`);
  }
});

console.log(results.join("\n"));
console.log(`\n${results.length - failures}/${results.length} design-foundation controls passed`);
if (failures > 0) process.exit(1);
