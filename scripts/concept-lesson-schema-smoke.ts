/**
 * M15 S3 — CONCEPT LESSON TEACHING-SCHEMA EXPANSION.
 *
 * Run with: npm run concept-lesson-schema:smoke
 *
 * NO DATABASE, NO PROVIDER, NO ENV. This suite imports the education types, the concept renderer and
 * the published Debate registry entries — none of which reach `@prisma/client` — and renders real
 * markup through `react-dom/server`. Nothing here writes, fetches, or reads a secret.
 *
 * WHAT IT PROTECTS. The concept lesson schema was an educational bottleneck: eight fields that could
 * express a concept and one weak/strong pair, and nothing else. A lesson needing to teach a wrong
 * mental model, a set of common failures, or how a weak answer becomes a strong one had exactly one
 * place to put that material — `explanation`, a single string printed as one paragraph. Depth could
 * only be bought as paragraph length. This suite proves the new capacity exists, renders, stays
 * optional, and — the part that actually matters educationally — renders BEFORE any check.
 *
 * THE FIXTURES ARE NOT LESSONS. Both live in this file. Neither is registered, neither is reachable
 * by any learner, and no published lesson is edited by this milestone. They exist so every new
 * structure is proven to render without a real lesson being half-rewritten to prove it.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// tsconfig jsx=preserve => classic React.createElement, so React must be global before the
// component modules are evaluated. Same harness as nav-a11y-smoke.
(globalThis as { React?: unknown }).React = React;
/* eslint-disable @typescript-eslint/no-var-requires */
const { ConceptEducationLessonView } = require("../components/lessons/concept-education-lesson-view");
const { DEBATE_MIGRATED_LESSONS, DEBATE_EVIDENCE_LESSON, DEBATE_TURN_MECHANICS_LESSON, MIGRATED_DEBATE_PROVENANCE } =
  require("../lib/education/tracks/debate");
const { isConceptEducationLessonEntry } = require("../lib/education/types");
const { EDUCATION_REGISTRY } = require("../lib/education/registry");
const { validateEducationRegistry } = require("../lib/education/validate");

import type {
  ConceptEducationLessonSource,
  ConceptEducationQuestion
} from "../lib/education/types";
import type { SourceFreshnessMetadata } from "../lib/source-freshness";

const read = (p: string) => readFileSync(p, "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
const decode = (h: string) =>
  h.replace(/&#x27;|&#39;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, "&");
const render = (el: unknown) => decode(renderToStaticMarkup(el as never));
/** Visible text with every tag — and therefore every styling class — removed. */
const visible = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
/**
 * Visible text with tags DELETED rather than replaced by a space.
 *
 * `visible()` substitutes a space for every tag, which silently supplies a separator the markup may
 * not have — so a label that renders as `Weak answer.</span>Text` reads as two words through
 * `visible()` and as one to anything that flattens the DOM without inserting whitespace. Anything
 * asserting that a LABEL is separated from its VALUE must use this stricter form.
 */
const flattened = (h: string) => h.replace(/<[^>]+>/g, "").replace(/[ \t]+/g, " ").trim();

let checks = 0;
function check(name: string, fn: () => void) {
  fn();
  checks += 1;
  console.log(`  ok  ${name}`);
}

/** `left` must appear in the markup, and before `right`, which must also appear. */
function assertOrder(html: string, left: string, right: string, label: string) {
  const l = html.indexOf(left);
  const r = html.indexOf(right);
  // Both anchors are proven present FIRST. `-1 < n` would otherwise hold for a deleted anchor and
  // turn the very ordering this asserts green by removing one side of it.
  assert.ok(l >= 0, `${label}: anchor missing — "${left}"`);
  assert.ok(r >= 0, `${label}: anchor missing — "${right}"`);
  assert.ok(l < r, `${label}: "${left}" must render before "${right}"`);
}

// ---- fixtures ------------------------------------------------------------------------------------

const q = (prompt: string, tag: string): ConceptEducationQuestion => ({
  prompt,
  choices: ["FIXTURE-CHOICE-A", "FIXTURE-CHOICE-B"],
  correctAnswer: "FIXTURE-CHOICE-A",
  hint: "FIXTURE-HINT",
  explanation: "FIXTURE-EXPLANATION",
  skillTag: tag
});

const PROVENANCE: SourceFreshnessMetadata = {
  authority: "stable-teaching",
  freshness: "stable",
  sourceLabel: "FIXTURE — not a lesson",
  organization: "CompeteReady"
};

/** Every optional structure populated. Strings are deliberately unmistakable, never lesson prose. */
const FULL: ConceptEducationLessonSource = {
  slug: "fixture-full",
  organization: "DEBATE",
  track: "DEBATE",
  name: "Fixture Full",
  description: "FIXTURE — every optional teaching structure populated.",
  category: "Fixture",
  lesson: {
    title: "FIXTURE-TITLE",
    slug: "fixture-full-lesson",
    summary: "FIXTURE-SUMMARY",
    estimatedMinutes: 1,
    content: {
      objective: "FIXTURE-OBJECTIVE",
      explanation: "FIXTURE-EXPLANATION-BODY",
      whyMatters: "FIXTURE-WHY-MATTERS",
      steps: ["FIXTURE-STEP-ONE", "FIXTURE-STEP-TWO"],
      teachingSections: [
        { heading: "FIXTURE-SECTION-HEADING-ONE", body: "FIXTURE-SECTION-BODY-ONE" },
        { heading: "FIXTURE-SECTION-HEADING-TWO", body: "FIXTURE-SECTION-BODY-TWO" }
      ],
      workedExample: {
        prompt: "FIXTURE-WORKED-PROMPT",
        weakAnswer: "FIXTURE-WORKED-WEAK",
        strongAnswer: "FIXTURE-WORKED-STRONG",
        whyItWorks: "FIXTURE-WORKED-WHY"
      },
      additionalExamples: [
        {
          setup: "FIXTURE-EXAMPLE-SETUP-ONE",
          weak: "FIXTURE-EXAMPLE-WEAK-ONE",
          strong: "FIXTURE-EXAMPLE-STRONG-ONE",
          explanation: "FIXTURE-EXAMPLE-WHY-ONE"
        },
        // No `weak` — the optional contrast really is optional, and this proves the renderer omits it
        // rather than printing an empty "Weak answer" label.
        {
          setup: "FIXTURE-EXAMPLE-SETUP-TWO",
          strong: "FIXTURE-EXAMPLE-STRONG-TWO",
          explanation: "FIXTURE-EXAMPLE-WHY-TWO"
        }
      ],
      revisionLadder: [
        { attempt: "FIXTURE-RUNG-ATTEMPT-ONE", diagnosis: "FIXTURE-RUNG-DIAGNOSIS-ONE", revision: "FIXTURE-RUNG-REVISION-ONE" },
        { attempt: "FIXTURE-RUNG-ATTEMPT-TWO", diagnosis: "FIXTURE-RUNG-DIAGNOSIS-TWO", revision: "FIXTURE-RUNG-REVISION-TWO" }
      ],
      misconception: {
        wrongModel: "FIXTURE-MISCONCEPTION-WRONG",
        whyItFails: "FIXTURE-MISCONCEPTION-WHY",
        betterModel: "FIXTURE-MISCONCEPTION-BETTER"
      },
      commonMistakes: [
        { mistake: "FIXTURE-MISTAKE-ONE", whyItFails: "FIXTURE-MISTAKE-WHY-ONE", fix: "FIXTURE-MISTAKE-FIX-ONE" },
        { mistake: "FIXTURE-MISTAKE-TWO", whyItFails: "FIXTURE-MISTAKE-WHY-TWO", fix: "FIXTURE-MISTAKE-FIX-TWO" }
      ],
      guidedQuestion: q("FIXTURE-CHECK-GUIDED", "fixture"),
      practiceQuestions: [q("FIXTURE-CHECK-INDEPENDENT", "fixture")],
      masteryCheck: [q("FIXTURE-CHECK-FINAL", "fixture")]
    }
  }
};

/** The pre-expansion shape: not one optional field present. */
const MINIMAL: ConceptEducationLessonSource = {
  ...FULL,
  slug: "fixture-minimal",
  name: "Fixture Minimal",
  lesson: {
    ...FULL.lesson,
    slug: "fixture-minimal-lesson",
    content: {
      objective: "FIXTURE-OBJECTIVE",
      explanation: "FIXTURE-EXPLANATION-BODY",
      whyMatters: "FIXTURE-WHY-MATTERS",
      steps: ["FIXTURE-STEP-ONE"],
      workedExample: FULL.lesson.content.workedExample,
      guidedQuestion: FULL.lesson.content.guidedQuestion,
      practiceQuestions: FULL.lesson.content.practiceQuestions,
      masteryCheck: FULL.lesson.content.masteryCheck
    }
  }
};

const view = (source: ConceptEducationLessonSource, withDrill: boolean) =>
  render(React.createElement(ConceptEducationLessonView, {
    source,
    provenance: PROVENANCE,
    moduleLabel: "FIXTURE-MODULE",
    next: { id: "fixture-next", title: "FIXTURE-NEXT-TITLE" },
    ...(withDrill ? { practiceDrill: { track: "debate", area: "clash" } } : {})
  } as never));

const FULL_HTML = view(FULL, true);
const MIN_HTML = view(MINIMAL, false);

/** A real registered concept entry, used as the carrier when testing content variants. */
const EDUCATION_MIGRATED_TARGET = () => {
  const target = EDUCATION_REGISTRY.lessons.find(
    (entry: { id: string }) => entry.id === DEBATE_EVIDENCE_LESSON.id);
  assert.ok(target, "control: the carrier entry is registered");
  return target as { id: string; source: ConceptEducationLessonSource };
};

// The single anchor for "the checks begin here". The Practice heading is what the learner reaches
// first in the checks region, and it carries a stable id.
const CHECKS_ANCHOR = 'id="practice"';

function main() {
  console.log("\nconcept-lesson-schema:smoke\n");

  // ---- A. every published concept lesson still parses under the widened type --------------------
  check("A. every published concept lesson still satisfies the schema, with no optional field required", () => {
    // DERIVED from the registry, never hand-listed. A hand-built array is a census of what its author
    // remembered; this milestone's "no lesson content changed" claim rests on A3 below, so the set it
    // sweeps has to be every published concept lesson, including any added after this was written.
    const published = EDUCATION_REGISTRY.lessons
      .filter((e: unknown) => isConceptEducationLessonEntry(e as never))
      .filter((e: { visibility: string }) => e.visibility === "learner");
    assert.equal(published.length, 9,
      `control: exactly nine published concept lessons — found ${published.length}. If a lesson was ` +
      `added or withdrawn, update this number deliberately rather than loosening it to a floor.`);
    for (const entry of published as Array<{ id: string; source: ConceptEducationLessonSource }>) {
      const c = entry.source.lesson.content;
      // The eight original fields are still REQUIRED, so widening did not turn the schema into a bag.
      for (const field of ["objective", "explanation", "whyMatters", "steps", "workedExample",
                           "guidedQuestion", "practiceQuestions", "masteryCheck"] as const) {
        assert.ok(c[field] !== undefined, `A: ${entry.id} still carries required field ${field}`);
      }
      assert.ok(typeof c.workedExample.whyItWorks === "string" && c.workedExample.whyItWorks.length > 0,
        `A2: ${entry.id} still carries its worked-example reasoning`);
    }
    // WHICH lessons author the new structures, named exactly. This asserted an EMPTY list while the
    // expansion milestone added capacity and no content; M15 S5 rebuilt `debate-refutation` as the
    // first real lesson to use it, so the list is now that one lesson. Kept as an exact set rather
    // than relaxed to "some": a second lesson adopting these fields is a content change that must be
    // reviewed and recorded here, not absorbed silently. Adding a slug to this list is the decision.
    const populated = (published as Array<{ id: string; source: ConceptEducationLessonSource }>)
      .filter((e) => {
        const c = e.source.lesson.content;
        return Boolean(c.teachingSections || c.additionalExamples || c.revisionLadder ||
          c.misconception || c.commonMistakes || c.languageFrames || c.scaffoldedTry);
      });
    // M15 S7 rebuilt `debate-clash` as the second — still an exact set.
    // Round Orientation repaired 2026-09-05 (audit-first: sections, misconception, mistakes, a small
    // tracking scenario; no frames, no ladder, no guided application) — still an exact set.
    // Evidence Evaluation repaired 2026-09-05 (audit-first: sections, misconception, mistakes, a small
    // evidence-bounding scenario; no frames, no ladder, no guided application) — still an exact set.
    // Answer Types repaired 2026-09-06 (perfection audit: sections, misconception, mistakes, a small
    // classification scenario; no frames, no ladder, no guided application) — still an exact set.
    // Turn Mechanics repaired 2026-09-06 (perfection audit: sections, misconception, mistakes, a small
    // classification scenario; no frames, no ladder, no guided application) — still an exact set.
    // Signposting repaired 2026-09-06 and is the FIRST entry here that authors ONLY a scaffoldedTry:
    // the audit found its teaching already strong, so the repair added a production surface and no
    // teaching structures. Sections were refused (the readability fix was paragraph breaks inside the
    // existing explanation) and frames were refused (a phrase bank would teach the lesson's own rule
    // backwards). If a later change gives it sections or frames, that is a decision to record here.
    assert.deepEqual(populated.map((e) => e.id).sort(), ["debate-answer-types", "debate-clash", "debate-evidence-evaluation", "debate-refutation", "debate-round-orientation", "debate-signposting", "debate-turn-mechanics"],
      "A3. exactly the reviewed lessons author the new teaching structures");
    // And the ones that do author WHOLE structures — the validator rejects a half-written one, so
    // this records what was actually reviewed rather than merely that something is present.
    const refutation = populated.find((e) => e.id === "debate-refutation")!.source.lesson.content;
    const clash = populated.find((e) => e.id === "debate-clash")!.source.lesson.content;
    assert.ok((clash.teachingSections ?? []).length >= 4 && clash.scaffoldedTry && (clash.languageFrames ?? []).length === 3, "A4b. Clash authors whole structures too");
    assert.ok((refutation.teachingSections ?? []).length >= 3, "A4. its teaching sections are real");
    assert.ok(refutation.misconception && refutation.misconception.betterModel.length > 0,
      "A5. its misconception names a replacement model");
    assert.ok((refutation.commonMistakes ?? []).length >= 3, "A6. it teaches several common mistakes");
    assert.ok((refutation.revisionLadder ?? []).length >= 2, "A7. its revision ladder has at least two rungs");
  });

  // ---- B. published lessons still render, and render exactly as before -------------------------
  const UNPOPULATED_EXEMPLAR = DEBATE_MIGRATED_LESSONS.find((e: { id: string }) => e.id === "debate-weighing") as {
    source: ConceptEducationLessonSource; practiceDrill?: unknown;
  };
  check("B. a real published lesson still renders through the widened renderer", () => {
    assert.ok(UNPOPULATED_EXEMPLAR, "B0. the exemplar exists");
    const ec = UNPOPULATED_EXEMPLAR.source.lesson.content as Record<string, unknown>;
    for (const field of ["teachingSections", "additionalExamples", "revisionLadder", "misconception",
                         "commonMistakes", "languageFrames", "scaffoldedTry"]) {
      assert.equal(ec[field], undefined, `B0b. the exemplar authors no ${field} — otherwise B3 below is vacuous`);
    }
    const real = render(React.createElement(ConceptEducationLessonView, {
      // The exemplar must be a lesson that authors NONE of the structures, and each repair moves the
      // goalposts: Evidence Evaluation held this role until 2026-09-05, Turn Mechanics until
      // 2026-09-06. Weighing is the current one, and it is asserted unpopulated below rather than
      // assumed, so this control cannot go vacuous when Weighing is repaired in its turn.
      source: UNPOPULATED_EXEMPLAR.source,
      provenance: MIGRATED_DEBATE_PROVENANCE,
      moduleLabel: "Round strategy",
      next: null,
      practiceDrill: UNPOPULATED_EXEMPLAR.practiceDrill
    } as never));
    const text = visible(real);
    assert.ok(text.includes(UNPOPULATED_EXEMPLAR.source.lesson.title), "B: its title renders");
    assert.ok(text.includes("What it is") && text.includes("Why it matters") && text.includes("How to do it"),
      "B2: its original teaching sections all render");
    // None of the new headings appear for a lesson that authored none of them. An empty section would
    // be the generic filler this renderer exists to avoid.
    for (const heading of ["More situations", "Turning a weak answer into a strong one",
                           "The mental model to fix", "Common mistakes"]) {
      assert.ok(!text.includes(heading), `B3: an unpopulated lesson renders no "${heading}" section`);
    }
  });

  // ---- C-G. every new structure renders, and renders BEFORE the checks -------------------------
  check("C. authored teaching sections render, with the lesson's own headings, before the checks", () => {
    for (const anchor of ["FIXTURE-SECTION-HEADING-ONE", "FIXTURE-SECTION-BODY-ONE",
                          "FIXTURE-SECTION-HEADING-TWO", "FIXTURE-SECTION-BODY-TWO"]) {
      assert.ok(FULL_HTML.includes(anchor), `C: ${anchor} renders`);
      assertOrder(FULL_HTML, anchor, CHECKS_ANCHOR, "C2");
    }
    // The heading is the LESSON'S, not one this renderer chose. A global heading set would force
    // every lesson into a shape its own material does not have.
    const src = stripComments(read("components/lessons/concept-education-lesson-view.tsx"));
    assert.ok(/\{section\.heading\}/.test(src), "C3. the heading is read from the lesson");
    // The renderer's own headings appear as JSX TEXT (>What it is<), never as quoted strings, so an
    // assertion written against the quoted form could never fail. Anchored to the real shape, and
    // proven non-vacuous by locating that shape first.
    assert.ok(/>What it is</.test(src), "C4a. control: the section heading really is JSX text");
    const teachingBlock = src.slice(src.indexOf("content.teachingSections"), src.indexOf("Why it matters"));
    assert.ok(teachingBlock.length > 0, "C4b. control: the teaching-section block is locatable");
    assert.ok(!/>(What it is|How to think about it|When it fails|How to do it)</.test(teachingBlock),
      "C4. and no global heading list is imposed on authored sections");
    // Sections sit inside the core teaching, between the explanation and why-it-matters.
    assertOrder(FULL_HTML, "FIXTURE-EXPLANATION-BODY", "FIXTURE-SECTION-HEADING-ONE", "C5");
    assertOrder(FULL_HTML, "FIXTURE-SECTION-BODY-TWO", "FIXTURE-WHY-MATTERS", "C6");
  });

  check("D. the misconception renders as learner-visible teaching, before the checks", () => {
    for (const anchor of ["FIXTURE-MISCONCEPTION-WRONG", "FIXTURE-MISCONCEPTION-WHY",
                          "FIXTURE-MISCONCEPTION-BETTER"]) {
      assert.ok(FULL_HTML.includes(anchor), `D: ${anchor} renders`);
      assertOrder(FULL_HTML, anchor, CHECKS_ANCHOR, "D2");
    }
    // Named, refuted, replaced — in that order.
    assertOrder(FULL_HTML, "FIXTURE-MISCONCEPTION-WRONG", "FIXTURE-MISCONCEPTION-WHY", "D3");
    assertOrder(FULL_HTML, "FIXTURE-MISCONCEPTION-WHY", "FIXTURE-MISCONCEPTION-BETTER", "D4");
    // It is TEACHING, so it must be readable with tags stripped — not hidden in an attribute.
    const text = visible(FULL_HTML);
    assert.ok(text.includes("FIXTURE-MISCONCEPTION-WRONG") && text.includes("FIXTURE-MISCONCEPTION-BETTER"),
      "D5. the misconception is visible prose, not markup metadata");
  });

  check("E. common mistakes render as mistake / why it fails / fix, before the checks", () => {
    for (const anchor of ["FIXTURE-MISTAKE-ONE", "FIXTURE-MISTAKE-WHY-ONE", "FIXTURE-MISTAKE-FIX-ONE",
                          "FIXTURE-MISTAKE-TWO", "FIXTURE-MISTAKE-WHY-TWO", "FIXTURE-MISTAKE-FIX-TWO"]) {
      assert.ok(FULL_HTML.includes(anchor), `E: ${anchor} renders`);
      assertOrder(FULL_HTML, anchor, CHECKS_ANCHOR, "E2");
    }
    assertOrder(FULL_HTML, "FIXTURE-MISTAKE-ONE", "FIXTURE-MISTAKE-WHY-ONE", "E3");
    assertOrder(FULL_HTML, "FIXTURE-MISTAKE-WHY-ONE", "FIXTURE-MISTAKE-FIX-ONE", "E4");
    const text = visible(FULL_HTML);
    assert.ok(text.includes("Why it fails.") && text.includes("The fix."),
      "E5. each mistake is diagnosed and repaired in words, not by colour");
  });

  check("F. the revision ladder renders attempt / diagnosis / revision, in order, before the checks", () => {
    for (const anchor of ["FIXTURE-RUNG-ATTEMPT-ONE", "FIXTURE-RUNG-DIAGNOSIS-ONE", "FIXTURE-RUNG-REVISION-ONE",
                          "FIXTURE-RUNG-ATTEMPT-TWO", "FIXTURE-RUNG-DIAGNOSIS-TWO", "FIXTURE-RUNG-REVISION-TWO"]) {
      assert.ok(FULL_HTML.includes(anchor), `F: ${anchor} renders`);
      assertOrder(FULL_HTML, anchor, CHECKS_ANCHOR, "F2");
    }
    assertOrder(FULL_HTML, "FIXTURE-RUNG-ATTEMPT-ONE", "FIXTURE-RUNG-DIAGNOSIS-ONE", "F3");
    assertOrder(FULL_HTML, "FIXTURE-RUNG-DIAGNOSIS-ONE", "FIXTURE-RUNG-REVISION-ONE", "F4");
    // Two rungs is a valid ladder — the schema fixes no number.
    assertOrder(FULL_HTML, "FIXTURE-RUNG-REVISION-ONE", "FIXTURE-RUNG-ATTEMPT-TWO", "F5");
    // Scoped to the ladder's own section. Unscoped, this matched from the "How to do it" steps <ol>
    // far earlier on the page, so the ladder could become a <div> and the control would still pass.
    const ladderStart = FULL_HTML.indexOf('id="revision"');
    assert.ok(ladderStart > 0, "F6a. control: the ladder section is locatable");
    const ladder = FULL_HTML.slice(ladderStart, FULL_HTML.indexOf("FIXTURE-MISCONCEPTION-WRONG"));
    assert.ok(/<ol[^>]*>[\s\S]*FIXTURE-RUNG-ATTEMPT-ONE/.test(ladder),
      "F6. the ladder is an ordered list — the sequence is part of the meaning");
  });

  check("G. additional examples render, before the checks, and the weak side stays optional", () => {
    for (const anchor of ["FIXTURE-EXAMPLE-SETUP-ONE", "FIXTURE-EXAMPLE-WEAK-ONE", "FIXTURE-EXAMPLE-STRONG-ONE",
                          "FIXTURE-EXAMPLE-WHY-ONE", "FIXTURE-EXAMPLE-SETUP-TWO", "FIXTURE-EXAMPLE-STRONG-TWO",
                          "FIXTURE-EXAMPLE-WHY-TWO"]) {
      assert.ok(FULL_HTML.includes(anchor), `G: ${anchor} renders`);
      assertOrder(FULL_HTML, anchor, CHECKS_ANCHOR, "G2");
    }
    // The second example authored no weak side, so exactly one "Weak answer." label may appear in the
    // examples region — an absent contrast must render nothing, never an empty labelled slot.
    // Both bounds proven present first: `indexOf` returning -1 would make `slice(start, -1)` widen the
    // region silently instead of failing, which is the opposite of what a bound is for.
    const from = FULL_HTML.indexOf("FIXTURE-EXAMPLE-SETUP-ONE");
    const to = FULL_HTML.indexOf("FIXTURE-RUNG-ATTEMPT-ONE");
    assert.ok(from > 0 && to > from, "G2b. control: the examples region has both bounds");
    const region = FULL_HTML.slice(from, to);
    assert.equal((region.match(/Weak answer\./g) ?? []).length, 1,
      "G3. one weak label for the one example that authored a weak side");
    assert.equal((region.match(/Strong answer\./g) ?? []).length, 2, "G4. both examples show their strong answer");
    // Weak and strong are distinguished by WORDS, not only colour — and the label must be SEPARATED
    // from the answer it labels. Measured with tags deleted rather than replaced by a space, because
    // the lenient form manufactures the separator and would report a pass the markup did not earn.
    const flat = flattened(FULL_HTML);
    assert.ok(flat.includes("Weak answer. FIXTURE-EXAMPLE-WEAK-ONE"),
      "G5. the weak label is separated from its answer with styling removed");
    assert.ok(flat.includes("Strong answer. FIXTURE-EXAMPLE-STRONG-ONE"),
      "G6. and so is the strong label");
  });

  // ---- H. optional really is optional ----------------------------------------------------------
  check("H. a lesson carrying none of the new fields renders, and renders no empty section", () => {
    assert.ok(MIN_HTML.includes("FIXTURE-EXPLANATION-BODY") && MIN_HTML.includes("FIXTURE-WHY-MATTERS"),
      "H: the minimal lesson still teaches");
    assert.ok(MIN_HTML.includes(CHECKS_ANCHOR), "H2: and still reaches its checks");
    for (const id of ['id="more-examples"', 'id="revision"', 'id="misconception"', 'id="common-mistakes"']) {
      assert.ok(!MIN_HTML.includes(id), `H3: no ${id} section is emitted for a lesson without it`);
    }
    // Non-vacuity: the FULL fixture proves those same ids CAN appear, so H3 is not passing on a
    // renderer that lost the ability to emit them at all.
    for (const id of ['id="more-examples"', 'id="revision"', 'id="misconception"', 'id="common-mistakes"']) {
      assert.ok(FULL_HTML.includes(id), `H4: control — ${id} does render when authored`);
    }
  });

  // ---- I-J. the teaching / checking / practice sequence ----------------------------------------
  check("I. every check renders after every piece of teaching", () => {
    const TEACHING = ["FIXTURE-OBJECTIVE", "FIXTURE-EXPLANATION-BODY", "FIXTURE-SECTION-BODY-TWO",
                      "FIXTURE-WHY-MATTERS", "FIXTURE-STEP-TWO", "FIXTURE-WORKED-WHY",
                      "FIXTURE-EXAMPLE-WHY-TWO", "FIXTURE-RUNG-REVISION-TWO",
                      "FIXTURE-MISCONCEPTION-BETTER", "FIXTURE-MISTAKE-FIX-TWO"];
    const CHECK_PROMPTS = ["FIXTURE-CHECK-GUIDED", "FIXTURE-CHECK-INDEPENDENT", "FIXTURE-CHECK-FINAL"];
    for (const prompt of CHECK_PROMPTS) {
      assert.ok(FULL_HTML.includes(prompt), `I: control — the check "${prompt}" really renders`);
      for (const taught of TEACHING) assertOrder(FULL_HTML, taught, prompt, "I2");
    }
    // The full teaching order, asserted as a chain rather than as a set.
    const ORDER = ["FIXTURE-OBJECTIVE", "FIXTURE-EXPLANATION-BODY", "FIXTURE-SECTION-HEADING-ONE",
                   "FIXTURE-WHY-MATTERS", "FIXTURE-STEP-ONE", "FIXTURE-WORKED-PROMPT",
                   "FIXTURE-EXAMPLE-SETUP-ONE", "FIXTURE-RUNG-ATTEMPT-ONE",
                   "FIXTURE-MISCONCEPTION-WRONG", "FIXTURE-MISTAKE-ONE", "FIXTURE-CHECK-GUIDED"];
    for (let i = 0; i < ORDER.length - 1; i += 1) assertOrder(FULL_HTML, ORDER[i], ORDER[i + 1], `I3.${i}`);
  });

  check("J. the targeted-practice call to action stays after the checks, and the next lesson after that", () => {
    assertOrder(FULL_HTML, "FIXTURE-CHECK-FINAL", 'id="practice-drill"', "J");
    assertOrder(FULL_HTML, 'id="practice-drill"', 'id="next"', "J2");
    // A lesson with no drill destination renders no call to action at all — unchanged behaviour.
    assert.ok(!MIN_HTML.includes('id="practice-drill"'), "J3. no drill CTA without a destination");
    assert.ok(MIN_HTML.includes('id="next"'), "J4. and the next-lesson section still closes the page");
  });

  // ---- K. no new durable semantics -------------------------------------------------------------
  check("K. the expansion introduces no mastery, progress, storage or network semantics", () => {
    const src = stripComments(read("components/lessons/concept-education-lesson-view.tsx"));
    for (const banned of ["@/lib/spaced-review", "recordDrillMastery", "recordPracticeOutcome",
                          "masteryProgress", "prisma", "fetch(", "localStorage", "sessionStorage",
                          "useState", "await "]) {
      assert.ok(!src.includes(banned), `K: the lesson view stays inert (${banned})`);
    }
    // The lesson's own checks still record nothing, and the view still says so.
    assert.ok(/records nothing/.test(src), "K2. and still tells the learner the check records nothing");
    // 30b's rule, restated here so this suite cannot be the one that breaks it: no rendered text may
    // use the word mastery. `masteryCheck` is a source FIELD NAME, and the learner sees "Final check".
    const renderedText = src.match(/>[^<>{}]{4,}</g) ?? [];
    assert.ok(renderedText.length >= 10,
      `K3a. control: rendered text really was found to scan — got ${renderedText.length} runs`);
    for (const rendered of renderedText) {
      assert.ok(!/mastery/i.test(rendered), `K3. no rendered text says mastery — found: ${rendered.trim()}`);
    }
    // Scoped to the TEACHING, which is what this milestone added. The checks component carries its
    // own honest disclaimer — "no mastery, no XP … not evidence that you have mastered the skill" —
    // and that sentence is the product telling the truth, so a blanket ban on the word would forbid
    // exactly the copy the no-fake-progress rule requires.
    const teachingHtml = FULL_HTML.slice(0, FULL_HTML.indexOf(CHECKS_ANCHOR));
    assert.ok(teachingHtml.length > 0, "K4: control — the teaching region is locatable");
    assert.ok(!/mastery/i.test(visible(teachingHtml)),
      "K4. and no teaching section the expansion added claims mastery");
  });

  // ---- L. blast radius -------------------------------------------------------------------------
  check("L. DECA and HOSA do not consume the concept lesson schema, so nothing there can move", () => {
    const CONSUMERS = ["lib/education/types.ts", "lib/education/tracks/debate.ts",
                       "components/lessons/concept-education-lesson-view.tsx"];
    for (const file of CONSUMERS) {
      assert.ok(/ConceptEducationLesson(Content|Source)/.test(read(file)), `L: control — ${file} really consumes it`);
    }
    // The DECA and HOSA lesson surfaces are the roleplay renderers and their own modules. None names
    // the concept types, so widening those types cannot reach them.
    for (const file of ["components/lessons/roleplay-lesson-view.tsx",
                        "components/lessons/roleplay-lesson-practice.tsx",
                        "lib/roleplay-lessons.ts",
                        "components/training/concept-drills.tsx"]) {
      const src = read(file);
      assert.ok(!/ConceptEducationLesson(Content|Source|WorkedExample)/.test(src),
        `L2: ${file} takes no dependency on the concept lesson schema`);
      // Stronger than name-absence, and the reason nothing there CAN move: the DECA/HOSA lesson
      // surfaces do not import the education module at all, so widening a type inside it has no path
      // to reach them. Name-absence alone would be the wrong test — `roleplay-lesson-view.tsx` has
      // carried its own unrelated `commonMistakes` field since long before this expansion.
      assert.ok(!/from "@\/lib\/education/.test(src) && !/require\(".*lib\/education/.test(src),
        `L3: ${file} imports nothing from lib/education, so the concept schema cannot reach it`);
    }
    // Non-vacuity: the roleplay renderer really does have its own common-mistake teaching, which is
    // exactly why L3 tests the import graph rather than the presence of a field name.
    assert.ok(/commonMistakes/.test(read("components/lessons/roleplay-lesson-view.tsx")),
      "L4. control: the roleplay renderer has its own independent common-mistakes concept");
  });

  // ---- M. the constructed-response door stays open ---------------------------------------------
  check("M. a future constructed-response check has one seam to be added at", () => {
    const src = stripComments(read("components/lessons/concept-education-lesson-view.tsx"));
    // Every check flows through ONE array. A second check kind is added there, not by unpicking the
    // render tree — which is what keeps a PRODUCTIVE objective evidenceable later without a rewrite.
    assert.ok(/const checks: ConceptCheck\[\] = \[/.test(src), "M: the checks are built as one typed array");
    assert.ok(/<ConceptEducationLessonPractice checks=\{checks\} \/>/.test(src),
      "M2. and the practice component consumes exactly that array");
    // The renderer must not read the three question fields anywhere else.
    for (const field of ["guidedQuestion", "practiceQuestions", "masteryCheck"]) {
      assert.equal((src.match(new RegExp(`content\\.${field}`, "g")) ?? []).length, 1,
        `M3. content.${field} is read exactly once, at that seam`);
    }
    const types = read("lib/education/types.ts");
    assert.ok(/MULTIPLE-CHOICE check kind, not "the check kind"/.test(types),
      "M4. and the type says plainly that multiple choice is one kind, not the only possible kind");
  });

  // ---- N. optional to HAVE, complete once you have it ------------------------------------------
  check("N. the validator ignores an absent structure and rejects a half-written one", () => {
    // Baseline: the real registry is clean, and no published lesson populates a new field, so the
    // widened validator cannot be passing merely because nothing exercises it.
    assert.deepEqual(validateEducationRegistry(EDUCATION_REGISTRY), [],
      "N: control — the real registry validates clean under the widened rules");

    // A concept entry carrying our FULL fixture content, swapped onto a real registered entry so the
    // rest of the registry stays valid and the only variable is the content under test.
    const target = EDUCATION_MIGRATED_TARGET();
    const withContent = (content: unknown) => ({
      ...EDUCATION_REGISTRY,
      lessons: EDUCATION_REGISTRY.lessons.map((entry: { id: string }) =>
        entry.id === target.id
          ? { ...target, source: { ...target.source, lesson: { ...target.source.lesson, content } } }
          : entry)
    });
    const gapsFor = (content: unknown) =>
      validateEducationRegistry(withContent(content) as never)
        .filter((i: { code: string }) => i.code === "CONCEPT_SOURCE_INCOMPLETE")
        .map((i: { message: string }) => i.message)
        .join(" | ");

    // 1. Every optional field populated and whole -> no gap.
    assert.equal(gapsFor(FULL.lesson.content), "", "N2. a fully authored lesson reports no gap");
    // 2. Every optional field absent -> no gap. This is the backward-compatibility case.
    assert.equal(gapsFor(MINIMAL.lesson.content), "", "N3. an absent structure is not a gap");
    // 3. A misconception that names a wrong model and replaces it with nothing -> gap.
    const brokenMisconception = {
      ...FULL.lesson.content,
      misconception: { wrongModel: "FIXTURE-MISCONCEPTION-WRONG", whyItFails: "FIXTURE", betterModel: "  " }
    };
    assert.ok(/misconception\.betterModel/.test(gapsFor(brokenMisconception)),
      "N4. a misconception with no replacement model is reported");
    // 4. A mistake diagnosed and never repaired -> gap.
    const brokenMistake = {
      ...FULL.lesson.content,
      commonMistakes: [{ mistake: "FIXTURE-MISTAKE-ONE", whyItFails: "FIXTURE", fix: "" }]
    };
    assert.ok(/commonMistakes\[0\]\.fix/.test(gapsFor(brokenMistake)),
      "N5. a mistake with no fix is reported");
    // 5. An empty array is a section the author started and did not write.
    assert.ok(/teachingSections/.test(gapsFor({ ...FULL.lesson.content, teachingSections: [] })),
      "N6. an empty teaching-section list is reported, not silently dropped");
    // 6. Two items sharing an identity string collide as React list keys and read as a repeat.
    assert.ok(/commonMistakes\[1\]\.mistake duplicates/.test(gapsFor({
      ...FULL.lesson.content,
      commonMistakes: [
        { mistake: "SAME", whyItFails: "A", fix: "A" },
        { mistake: "SAME", whyItFails: "B", fix: "B" }
      ]
    })), "N8. a duplicated item identity is reported — the renderer keys these lists by that string");
    assert.equal(gapsFor({
      ...FULL.lesson.content,
      commonMistakes: [
        { mistake: "ONE", whyItFails: "A", fix: "A" },
        { mistake: "TWO", whyItFails: "B", fix: "B" }
      ]
    }), "", "N9. control: two distinct mistakes are fine");
    // 7. The example's weak side stays genuinely optional — omitting it is not a gap.
    assert.equal(gapsFor({
      ...FULL.lesson.content,
      additionalExamples: [{ setup: "S", strong: "T", explanation: "E" }]
    }), "", "N7. an example with no weak side is complete — the contrast is optional by design");
  });

  // ---- O. one structure at a time, and every published lesson --------------------------------------
  check("O. each new structure renders on its own, and every published lesson still renders", () => {
    // The five guards are independent siblings today. Nothing proved that: a regression nesting one
    // inside another's guard would pass every all-present control, because FULL populates all five.
    const only = (field: string, value: unknown) => view({
      ...MINIMAL,
      lesson: { ...MINIMAL.lesson, content: { ...MINIMAL.lesson.content, [field]: value } }
    } as ConceptEducationLessonSource, false);

    const cases: Array<[string, unknown, string, string]> = [
      ["teachingSections", FULL.lesson.content.teachingSections, "FIXTURE-SECTION-HEADING-ONE", 'id="more-examples"'],
      ["additionalExamples", FULL.lesson.content.additionalExamples, 'id="more-examples"', 'id="revision"'],
      ["revisionLadder", FULL.lesson.content.revisionLadder, 'id="revision"', 'id="misconception"'],
      ["misconception", FULL.lesson.content.misconception, 'id="misconception"', 'id="common-mistakes"'],
      ["commonMistakes", FULL.lesson.content.commonMistakes, 'id="common-mistakes"', 'id="revision"']
    ];
    for (const [field, value, present, absent] of cases) {
      const html = only(field, value);
      assert.ok(html.includes(present), `O: ${field} alone still renders (${present})`);
      assert.ok(!html.includes(absent), `O2: ${field} alone renders no sibling section (${absent})`);
      // And it still precedes the checks when it is the ONLY optional structure on the page.
      assertOrder(html, present, CHECKS_ANCHOR, `O3.${field}`);
    }

    // Charter (B) on every published lesson, not one. Each renders through the widened renderer, and
    // none of them grows a section it did not author.
    const publishedAll = EDUCATION_REGISTRY.lessons
      .filter((e: unknown) => isConceptEducationLessonEntry(e as never))
      .filter((e: { visibility: string }) => e.visibility === "learner");
    for (const entry of publishedAll as Array<{ id: string; source: ConceptEducationLessonSource; practiceDrill?: unknown }>) {
      const html = render(React.createElement(ConceptEducationLessonView, {
        source: entry.source,
        provenance: MIGRATED_DEBATE_PROVENANCE,
        moduleLabel: "FIXTURE-MODULE",
        next: null,
        ...(entry.practiceDrill ? { practiceDrill: entry.practiceDrill } : {})
      } as never));
      assert.ok(html.includes(entry.source.lesson.title), `O4: ${entry.id} renders its title`);
      // IF AND ONLY IF. This asserted the sections were absent from every published lesson, which was
      // true while none authored them; the real invariant — and the one that still catches a renderer
      // inventing a section — is that a section appears exactly when its field does.
      const c = entry.source.lesson.content;
      const expected: Array<[string, boolean]> = [
        ['id="more-examples"', Boolean(c.additionalExamples?.length)],
        ['id="revision"', Boolean(c.revisionLadder?.length)],
        ['id="misconception"', Boolean(c.misconception)],
        ['id="common-mistakes"', Boolean(c.commonMistakes?.length)]
      ];
      for (const [id, authored] of expected) {
        assert.equal(html.includes(id), authored,
          `O5: ${entry.id} renders ${id} exactly when it authors it (authored=${authored})`);
      }
      // Teach-first holds for the real lessons too, not only the fixture.
      assertOrder(html, entry.source.lesson.content.explanation.slice(0, 40), CHECKS_ANCHOR, `O6.${entry.id}`);
    }
    assert.equal(publishedAll.length, 9, "O7. control: all nine published lessons were rendered");
  });

  console.log(`\nconcept-lesson-schema: ${checks} controls passed.`);
  console.log("  Teaching capacity added: sections, examples, revision ladder, misconception, mistakes.");
  console.log("  Every one optional. Reviewed lessons authoring them: debate-refutation.");
}

main();
