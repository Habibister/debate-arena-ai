/**
 * DECA P1-A / P1-B1 — track-aware practice mapping, and the published teaching owner.
 *
 * STRICT-SAFE BY CONSTRUCTION: every module it imports is pure (no prisma, no env, no network, no
 * provider). It proves two things that must stay separate — that DECA practice is REPRESENTABLE, and
 * that it is not currently RESOLVABLE because no published lesson teaches any drilled construct yet.
 *
 * Run with: npx tsx scripts/deca-practice-map-smoke.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
// tsconfig jsx=preserve => classic React.createElement, so React must be global before the
// component module is evaluated.
(globalThis as { React?: unknown }).React = React;
import { DECA_DRILL_AREAS, DECA_DRILL_HELD_IDS, DECA_DRILL_SKILL_SLUGS } from "../lib/deca-drills";
import { DRILL_AREAS } from "../lib/debate-drills";
import {
  DECA_PRACTICE_MAP,
  decaPracticeAreasByComponent,
  decaPracticeMapCoversEveryArea,
  decaPracticeMappingForSkill,
  decaRemediationTargetForSkill,
  type DecaPracticeMapping
} from "../lib/education/deca-practice-map";
import { practiceRemediationForSkill } from "../lib/education/skills-compat";
import { EDUCATION_LESSONS, getEducationModule } from "../lib/education/registry";
import { isConceptEducationLessonEntry } from "../lib/education/types";
import { isDecaDrillArea } from "../lib/deca-drills";
import { ConceptEducationLessonView } from "../components/lessons/concept-education-lesson-view";

const read = (p: string) => readFileSync(p, "utf8");
let checks = 0;
function check(name: string, fn: () => void) {
  fn();
  checks += 1;
  console.log(`  ok  ${name}`);
}

function main() {
  check("A1. the practice-drill type admits DECA as well as Debate, each with its own area union", () => {
    const types = read("lib/education/types.ts");
    assert.ok(/export type DebatePracticeDrill = \{\s*\n\s*track: "debate";\s*\n\s*area: DrillArea;/.test(types), "the Debate shape survives unchanged");
    assert.ok(/export type DecaPracticeDrill = \{\s*\n\s*track: "deca";\s*\n\s*area: DecaDrillArea;/.test(types), "a DECA shape now exists");
    assert.ok(/export type EducationPracticeDrill = DebatePracticeDrill \| DecaPracticeDrill;/.test(types), "and the union is what lessons carry");
    // Each track keeps its OWN area union, so an area cannot be written under the wrong track.
    assert.ok(!/track: "debate";\s*\n\s*area: DecaDrillArea/.test(types), "a DECA area can never sit under the debate track");
    assert.ok(!/track: "deca";\s*\n\s*area: DrillArea;/.test(types), "and a Debate area can never sit under the deca track");
  });

  // P1-B1 SUPERSEDES the original A2. That control asserted every drilled entry was a DEBATE entry on
  // a Debate area, which was true only while Debate was the only track with a drilled lesson — it
  // pinned an accident of the data, not the property worth protecting. The real invariant, and the
  // one this rewrite asserts, is that a lesson's drill belongs to the lesson's OWN track and names a
  // real area in that track's own bank. That is strictly stronger: it still fails on a Debate entry
  // pointed at a DECA drill, and it now also fails on the reverse, which the old form allowed.
  check("A2. NON-REGRESSION: every registry practice drill belongs to its own lesson's track, on a real area of that track's bank", () => {
    const drilled = EDUCATION_LESSONS.filter((entry) => entry.practiceDrill);
    assert.ok(drilled.length > 0, "control: some lessons still carry a drill");
    const debateAreas = DRILL_AREAS.map((area) => area.id) as string[];
    const decaAreas = DECA_DRILL_AREAS.map((area) => area.id) as string[];
    for (const entry of drilled) {
      const expected = entry.track === "GENERAL_DEBATE" ? "debate" : entry.track === "DECA" ? "deca" : null;
      assert.ok(expected !== null, `${entry.id}: ${entry.track} may not carry a practice drill at all`);
      assert.equal(entry.practiceDrill!.track, expected, `${entry.id}: drill track matches the lesson's track`);
      const bank = expected === "deca" ? decaAreas : debateAreas;
      assert.ok(bank.includes(entry.practiceDrill!.area), `${entry.id}: area is a real ${expected} area`);
    }
    // Debate's own set is unchanged by P1-B1: every Debate drilled entry is still a Debate drill.
    for (const entry of drilled.filter((e) => e.track === "GENERAL_DEBATE")) {
      assert.equal(entry.practiceDrill!.track, "debate", `${entry.id}: Debate drill mapping untouched`);
    }
    // EXACTLY ONE DECA lesson carries a drill, and it is the teaching owner P1-B1 published.
    assert.deepEqual(
      EDUCATION_LESSONS.filter((e) => e.track === "DECA" && e.practiceDrill).map((e) => e.id),
      ["deca-understanding-performance-indicators"],
      "exactly one DECA lesson carries a drill — the performance-indicators teaching owner"
    );
  });

  check("B1. the map covers all four DECA areas exactly, with their exact existing skill slugs", () => {
    assert.equal(DECA_PRACTICE_MAP.length, 4);
    assert.ok(decaPracticeMapCoversEveryArea(), "every declared DECA drill area is mapped exactly once");
    assert.deepEqual(
      DECA_PRACTICE_MAP.map((m) => m.area).sort(),
      ["business-reasoning", "customer-relations", "marketing-fundamentals", "performance-indicators"]
    );
    // Slugs are the bank's own, never invented here.
    for (const mapping of DECA_PRACTICE_MAP) {
      const area = DECA_DRILL_AREAS.find((a) => a.id === mapping.area);
      assert.ok(area, `${mapping.area}: is a declared area`);
      assert.equal(mapping.skillSlug, area!.skillSlug, `${mapping.area}: skill slug matches the bank`);
      assert.ok(DECA_DRILL_SKILL_SLUGS.includes(mapping.skillSlug), `${mapping.skillSlug}: is a real DECA skill slug`);
    }
    assert.equal(new Set(DECA_PRACTICE_MAP.map((m) => m.area)).size, 4, "no duplicate area mapping");
    assert.equal(new Set(DECA_PRACTICE_MAP.map((m) => m.skillSlug)).size, 4, "no duplicate skill mapping");
  });

  check("B2. no Debate or HOSA skill leaks into the DECA map", () => {
    const debateSlugs = DRILL_AREAS.map((area) => area.skillSlug);
    for (const mapping of DECA_PRACTICE_MAP) {
      assert.ok(!debateSlugs.includes(mapping.skillSlug), `${mapping.skillSlug}: not a Debate skill`);
      assert.ok(mapping.skillSlug.startsWith("deca-"), `${mapping.skillSlug}: is a DECA slug`);
      assert.ok(!/hosa/i.test(mapping.skillSlug), `${mapping.skillSlug}: not a HOSA skill`);
    }
  });

  check("C1. the competition-component split is explicit: two role-play skills, two cluster-knowledge areas", () => {
    assert.deepEqual(decaPracticeAreasByComponent("roleplay").map((m) => m.area).sort(), ["business-reasoning", "performance-indicators"]);
    assert.deepEqual(decaPracticeAreasByComponent("exam").map((m) => m.area).sort(), ["customer-relations", "marketing-fundamentals"]);
    assert.equal(decaPracticeAreasByComponent("roleplay").length + decaPracticeAreasByComponent("exam").length, DECA_PRACTICE_MAP.length, "every area is classified");
  });

  check("C2. PRACTICE grouping is derivable from the map without a new top-level surface", () => {
    // Enough metadata for a later view to render two groups inside Practice. No UI is built here.
    const groups = { "Role-Play Skills": decaPracticeAreasByComponent("roleplay"), "Cluster Knowledge / Exam Prep": decaPracticeAreasByComponent("exam") };
    assert.equal(Object.values(groups).flat().length, 4);
    assert.ok(Object.values(groups).every((g) => g.length === 2), "both groups are populated");
  });

  // P1-B1 SUPERSEDES the original D1, which asserted that EVERY publishedTeachingOwner was null. That
  // was the true state under P1-A and is no longer: performance-indicators has a real owner. The
  // property that must survive is the one D1 existed for — a claimed owner is never a lesson that
  // does not exist or that a learner cannot reach — so it is now checked against the registry
  // instead of being satisfied by the absence of any claim at all.
  check("D1. every claimed teaching owner is a real, learner-visible lesson; the rest claim nothing", () => {
    for (const mapping of DECA_PRACTICE_MAP) {
      assert.ok(mapping.note.length > 20, `${mapping.area}: the judgement is recorded, not implied`);
      if (mapping.publishedTeachingOwner === null) {
        assert.ok(mapping.coverage === "none" || mapping.coverage === "orientation-only", `${mapping.area}: an ownerless area never claims "owned"`);
        continue;
      }
      assert.equal(mapping.coverage, "owned", `${mapping.area}: an owner and its coverage agree`);
      const entry = EDUCATION_LESSONS.find((e) => e.id === mapping.publishedTeachingOwner);
      assert.ok(entry, `${mapping.area}: the claimed owner "${mapping.publishedTeachingOwner}" is a registered lesson`);
      assert.equal(entry!.visibility, "learner", `${mapping.area}: the claimed owner is learner-visible`);
      assert.equal(entry!.track, "DECA", `${mapping.area}: the claimed owner is a DECA lesson`);
      assert.equal(entry!.skillSlug, mapping.skillSlug, `${mapping.area}: the owner claims this area's exact existing skill slug`);
    }
    // EXACTLY ONE area is owned after P1-B1. Three remain ownerless, and are not dressed up.
    const owned = DECA_PRACTICE_MAP.filter((m) => m.coverage === "owned").map((m) => m.area);
    assert.deepEqual(owned, ["performance-indicators"], "one of four areas is owned");
    const ownerless = DECA_PRACTICE_MAP.filter((m) => m.publishedTeachingOwner === null).map((m) => m.area);
    assert.deepEqual(ownerless.sort(), ["business-reasoning", "customer-relations", "marketing-fundamentals"], "the other three still have no owner");
    const pi = decaPracticeMappingForSkill("deca-performance-indicators");
    assert.equal(pi?.publishedTeachingOwner, "deca-understanding-performance-indicators", "and the owner is the lesson P1-B1 authored");
  });

  check("D2. a HELD lesson is never treated as a published teaching owner", () => {
    const heldSlugs = ["deca-reading-scenarios", "deca-identifying-problem", "deca-professional-communication"];
    const owners = DECA_PRACTICE_MAP.map((m) => m.publishedTeachingOwner).filter((o): o is string => o !== null);
    for (const held of heldSlugs) {
      assert.ok(!owners.includes(held), `${held}: not used as an owner`);
      assert.deepEqual(EDUCATION_LESSONS.filter((e) => e.id === held), [], `${held}: still absent from the learner registry`);
    }
  });

  // P1-B1 SUPERSEDES the original E1, which asserted NO DECA skill resolved. That was P1-A's whole
  // point and is exactly what P1-B1 was authorised to change for one skill. What must not change is
  // that resolution is earned: an unowned skill still resolves to nothing, and an owned one resolves
  // only to its OWN lesson and its OWN drill — never to Debate, never to a held lesson.
  check("E1. resolution is earned: the one owned skill resolves to its own lesson and drill; the other three resolve to nothing", () => {
    const alwaysPublished = () => true;
    for (const mapping of DECA_PRACTICE_MAP.filter((m) => m.coverage !== "owned")) {
      assert.equal(decaRemediationTargetForSkill(mapping.skillSlug, alwaysPublished), null, `${mapping.skillSlug}: no target`);
      assert.equal(practiceRemediationForSkill(mapping.skillSlug), null, `${mapping.skillSlug}: generic resolver returns nothing`);
    }
    assert.deepEqual(
      decaRemediationTargetForSkill("deca-performance-indicators", alwaysPublished),
      { skillSlug: "deca-performance-indicators", lessonId: "deca-understanding-performance-indicators", drill: { track: "deca", area: "performance-indicators" } },
      "the owned skill resolves to the lesson that owns it"
    );
    // The generic resolver reaches the same destination WITHOUT being told the owner — it reads the
    // registry — so the map and the registry cannot disagree about where a learner is sent.
    const generic = practiceRemediationForSkill("deca-performance-indicators");
    assert.ok(generic, "the generic resolver now finds the DECA target");
    assert.equal(generic!.lessonId, "deca-understanding-performance-indicators", "and lands on the same lesson");
    assert.deepEqual(generic!.drill, { track: "deca", area: "performance-indicators" }, "with the DECA drill, never a Debate one");
    // Publication is still load-bearing: an unpublished owner resolves to nothing.
    assert.equal(decaRemediationTargetForSkill("deca-performance-indicators", () => false), null, "an unpublished owner still resolves to nothing");
  });

  check("E2. the MECHANISM works — a synthetic mapping with a real published owner resolves", () => {
    const synthetic: DecaPracticeMapping[] = [{
      area: "performance-indicators",
      skillSlug: "deca-performance-indicators",
      component: "roleplay",
      publishedTeachingOwner: "deca-some-future-lesson",
      coverage: "owned",
      note: "synthetic fixture"
    }];
    const resolved = decaRemediationTargetForSkill("deca-performance-indicators", (id) => id === "deca-some-future-lesson", synthetic);
    assert.deepEqual(resolved, {
      skillSlug: "deca-performance-indicators",
      lessonId: "deca-some-future-lesson",
      drill: { track: "deca", area: "performance-indicators" }
    }, "so the architecture is proved without publishing anything");
    // ...and it still refuses when that owner is not actually published.
    assert.equal(decaRemediationTargetForSkill("deca-performance-indicators", () => false, synthetic), null, "an unpublished owner resolves to nothing");
    // ...and orientation-depth coverage is never enough.
    const orientationOnly: DecaPracticeMapping[] = [{ ...synthetic[0], coverage: "orientation-only" }];
    assert.equal(decaRemediationTargetForSkill("deca-performance-indicators", () => true, orientationOnly), null, "orientation-only never backs remediation");
  });

  check("F1. remediation can never cross tracks", () => {
    const compat = read("lib/education/skills-compat.ts");
    assert.ok(/CROSS-TRACK GUARD/.test(compat), "the guard is present and explained");
    assert.ok(
      /entry\.track === "GENERAL_DEBATE" \? "debate" : entry\.track === "DECA" \? "deca" : null;/.test(compat),
      "the expected drill track is derived from the owning lesson's track"
    );
    assert.ok(/if \(expectedDrillTrack === null \|\| entry\.practiceDrill\.track !== expectedDrillTrack\) return null;/.test(compat), "a mismatch yields no target at all");
    // The two Debate-only consumers narrow rather than coerce.
    assert.ok(/remediation && remediation\.drill\.track === "debate"/.test(read("lib/coach-evidence.ts")), "the coach card refuses a non-Debate remediation rather than coercing it");
    assert.ok(/remediation && remediation\.drill\.track === "debate"/.test(read("app/(app)/study-arcade/review/page.tsx")), "and so does the review card");
  });

  check("F2. a drill existing never implies the skill is taught", () => {
    for (const mapping of DECA_PRACTICE_MAP) {
      const drillExists = DECA_DRILL_AREAS.some((area) => area.id === mapping.area);
      assert.equal(drillExists, true, `${mapping.area}: has a drill`);
    }
    // All four have a drill; only ONE is taught. Teaching is a separate, authored fact — which is
    // still the point of this control, now demonstrated by a 1-of-4 split rather than 0-of-4.
    assert.equal(DECA_PRACTICE_MAP.length, 4, "four areas, all drilled");
    assert.equal(DECA_PRACTICE_MAP.filter((m) => m.coverage === "owned").length, 1, "exactly one of them is taught");
    for (const mapping of DECA_PRACTICE_MAP.filter((m) => m.coverage !== "owned")) {
      assert.ok(DECA_DRILL_AREAS.some((area) => area.id === mapping.area), `${mapping.area}: drilled`);
      assert.equal(mapping.publishedTeachingOwner, null, `${mapping.area}: drilled and still untaught`);
    }
  });

  // ---- G. THE PUBLISHED LESSON, AS A LEARNER ACTUALLY SEES IT ---------------------------------
  //
  // These controls exist because the P1-B1 audit found that NOTHING rendered a concept lesson page
  // for a non-Debate track. tracks:smoke renders only the lessons INDEX, so a DECA lesson shipping a
  // hardcoded "General Debate" badge and a "this is the last Debate lesson" footer left every suite
  // green. Track isolation is a product rule, so it is asserted against rendered output here.

  check("G1. the published DECA lesson renders with no other track's name anywhere in its visible text", () => {
    const entry = EDUCATION_LESSONS.find((e) => e.id === "deca-understanding-performance-indicators");
    assert.ok(entry && isConceptEducationLessonEntry(entry), "control: the DECA concept entry is registered");
    const html = renderToStaticMarkup(React.createElement(ConceptEducationLessonView as never, {
      source: entry!.source,
      provenance: entry!.provenance,
      moduleLabel: getEducationModule(entry!.moduleId)?.label ?? "Lesson",
      next: null,
      practiceDrill: entry!.practiceDrill
    } as never));
    const visible = html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");
    for (const foreign of ["General Debate", "Debate", "debate", "HOSA", "Model UN"]) {
      assert.ok(!visible.includes(foreign), `G1. a DECA learner never reads "${foreign}" (track isolation)`);
    }
    assert.ok(visible.includes("DECA"), "G1b. control: the scan really read the rendered page, which does name DECA");
    assert.ok(visible.includes("Understanding Performance Indicators"), "G1c. control: and it is the right lesson");
    // The badge is DERIVED. A Debate lesson still reads "General Debate" through the same code path,
    // so this is a per-entry resolution and not a blanket removal of the label.
    const debate = EDUCATION_LESSONS.find((e) => e.id === "debate-clash");
    assert.ok(debate && isConceptEducationLessonEntry(debate), "control: a Debate concept entry to compare against");
    const debateHtml = renderToStaticMarkup(React.createElement(ConceptEducationLessonView as never, {
      source: debate!.source, provenance: debate!.provenance,
      moduleLabel: getEducationModule(debate!.moduleId)?.label ?? "Lesson",
      next: null, practiceDrill: debate!.practiceDrill
    } as never));
    assert.ok(debateHtml.replace(/<[^>]+>/g, " ").includes("General Debate"),
      "G1d. NON-REGRESSION: a Debate concept lesson still shows its own track label");
  });

  check("G2. the practice call to action points at the exact DECA drill, and the destination honours it", () => {
    const entry = EDUCATION_LESSONS.find((e) => e.id === "deca-understanding-performance-indicators")!;
    const html = renderToStaticMarkup(React.createElement(ConceptEducationLessonView as never, {
      source: (entry as never as { source: unknown }).source,
      provenance: entry.provenance,
      moduleLabel: getEducationModule(entry.moduleId)?.label ?? "Lesson",
      next: null, practiceDrill: entry.practiceDrill
    } as never));
    assert.ok(html.includes("/study-arcade?track=deca&amp;area=performance-indicators"),
      "G2. the CTA deep-links to the performance-indicators drill, not the DECA drill front door");
    // And the destination must actually READ that parameter. Before P1-B1 the DECA branch dropped
    // `?area=` entirely, so a link whose visible label named one drill opened the mixed picker — and
    // a mixed session spreads its questions across all four areas, so it usually cannot reach the
    // per-area unique-question floor the record depends on.
    assert.equal(isDecaDrillArea("performance-indicators"), true, "G2b. the narrowing accepts the real area");
    assert.equal(isDecaDrillArea("clash"), false, "G2c. and rejects another track's area");
    const arcade = read("app/(app)/study-arcade/page.tsx");
    assert.ok(/const decaArea = isDecaDrillArea\(searchParams\.area\) \? searchParams\.area : undefined;/.test(arcade),
      "G2d. the DECA branch narrows ?area= rather than casting or ignoring it");
    assert.ok(/initialArea=\{decaArea\}/.test(arcade), "G2e. and passes it to the DECA drill component");
    assert.ok(/useState<string>\(initialArea \?\? "mixed"\)/.test(read("components/training/concept-drills.tsx")),
      "G2f. which seeds the area filter, falling back to mixed when nothing was narrowed");
  });

  check("G3. the record claim is derived from DECA's own hold list, not from a Debate lookup that cannot see DECA", () => {
    const view = read("components/lessons/concept-education-lesson-view.tsx");
    assert.ok(/practiceDrill && practiceDrill\.track === "deca"/.test(view),
      "G3. the DECA skill slug is resolved on the DECA branch");
    assert.ok(/DECA_DRILL_AREAS\.find\(\(area\) => area\.id === practiceDrill\.area\)\?\.skillSlug/.test(view),
      "G3b. against the DECA bank");
    assert.ok(/decaMasteryHeld as decaRecordSuspended/.test(view), "G3c. through a named DECA predicate");
    assert.ok(/!skillRecordSuspended\(drillSkillSlug\) && !decaRecordSuspended\(decaDrillSkillSlug\)/.test(view),
      "G3d. and both tracks' predicates gate the claim");
    // The Debate lookup must no longer swallow DECA areas: an unknown slug reads as "not held", which
    // is how the strongest record claim on the page came out true by accident.
    assert.ok(/practiceDrill && practiceDrill\.track === "debate"/.test(view),
      "G3e. the Debate lookup is scoped to Debate drills");
  });

  // ---- H. WHAT THE PUBLISHED DECA TEACHING MAY NOT SAY -----------------------------------------
  //
  // Two claims are forbidden, and neither is protected by the content snapshot in any useful way: a
  // snapshot fails on ANY edit, so it cannot tell a repair from the introduction of a false claim.
  // These scan the rendered learner text for the claims themselves.

  check("H1. no published DECA lesson teaches the HELD instructional-area weighting rule", () => {
    // pi-26 is the only held DECA drill item. Its keyed fact — that published exam weighting attaches
    // to instructional areas rather than to individual indicators — is INTERNALLY GROUNDED only, and
    // the owner gate requires a primary official source before it may be taught or the item released.
    // Teaching it here would silently satisfy the release precondition without the source existing.
    assert.deepEqual([...DECA_DRILL_HELD_IDS], ["pi-26"], "H1a. control: pi-26 is still the held item");
    const decaText = EDUCATION_LESSONS
      .filter((e) => e.track === "DECA" && isConceptEducationLessonEntry(e))
      .map((e) => JSON.stringify((e as never as { source: unknown }).source))
      .join(" ");
    assert.ok(decaText.length > 500, "H1b. control: there is published DECA concept text to scan");
    for (const banned of [/instructional area/i, /published weighting/i, /exam weight/i, /worth more (?:points|marks)/i, /weighted more heavily/i]) {
      assert.ok(!banned.test(decaText), `H1. published DECA teaching does not reach the held weighting rule (${banned})`);
    }
  });

  check("H2. no published DECA lesson claims CompeteReady officially scores performance indicators", () => {
    // B4.1 established that a sourced point split is not a scoreable rubric, and that the scenario's
    // actual indicators never reach the judge. A lesson promising per-indicator official scoring would
    // contradict a boundary the product enforces in code.
    const decaText = EDUCATION_LESSONS
      .filter((e) => e.track === "DECA" && isConceptEducationLessonEntry(e))
      .map((e) => JSON.stringify((e as never as { source: unknown }).source))
      .join(" ");
    for (const banned of [/officially scores?/i, /official(?:ly)? scored/i, /we (?:will )?score each/i, /official performance indicators?/i, /official DECA (?:indicator|performance)/i]) {
      assert.ok(!banned.test(decaText), `H2. published DECA teaching makes no official-scoring claim (${banned})`);
    }
    // And it says positively that its own example indicators are authored, not official.
    assert.ok(/examples we wrote/i.test(decaText), "H2b. the lesson states its example indicators are CompeteReady's own");
  });

  console.log(
    `\nDECA practice-map smoke passed: ${checks} controls. DECA practice is REPRESENTABLE and now ` +
    `PARTLY RESOLVABLE. The drill type admits a DECA track with its own area union, all four areas map ` +
    `to their exact existing skill slugs, and the role-play/cluster-knowledge split is explicit. P1-B1 ` +
    `published ONE teaching owner — deca-understanding-performance-indicators — so that skill now ` +
    `resolves to its own lesson and its own DECA drill, proven through the generic resolver as well as ` +
    `the map. The other three areas are drilled and still ownerless, and resolve to nothing: a 1-of-4 ` +
    `split, not four plausible destinations. A claimed owner must be a registered, learner-visible DECA ` +
    `lesson naming that area's exact skill slug; publication stays load-bearing; held lessons are never ` +
    `treated as published; and every practice drill belongs to its own lesson's track, which now fails ` +
    `on a cross-track mapping in either direction rather than only on a non-Debate one.`
  );
}

main();
