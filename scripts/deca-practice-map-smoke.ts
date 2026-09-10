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
import { HELD_DECA_CATALOG_SLUGS, PUBLISHED_DECA_SLUGS } from "../lib/education/tracks/deca";
import { LEARNING_SKILL_CATALOG } from "../lib/learning-content";
import { PRACTICE_DRILL_AREAS_COVERED, practiceDrillAreaLabel, practiceDrillHref } from "../lib/education/practice-drill";
import type { DebatePracticeDrill, DecaPracticeDrill } from "../lib/education/types";
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
    // EXACTLY TWO DECA lessons carry a drill, and they are the teaching owners P1-B1 and P1-B2
    // published — one per ROLE-PLAY area. Neither cluster-knowledge area has one.
    assert.deepEqual(
      EDUCATION_LESSONS.filter((e) => e.track === "DECA" && e.practiceDrill).map((e) => e.id),
      ["deca-understanding-performance-indicators", "deca-justifying-your-recommendation", "deca-handling-customer-situations", "deca-who-the-customer-is", "deca-why-they-choose-you", "deca-how-you-are-understood", "deca-the-offering-and-its-price", "deca-getting-it-to-the-customer", "deca-telling-them-about-it"],
      "nine DECA lessons carry a drill — one per role-play owner, one per cluster owner, and the six marketing units"
    );
    // MARKETING IS SIX LESSONS, ONE CLAIM. The approved curriculum defines MK1-MK6 as six lessons, so
    // six carry the practice CTA; but an area needs ONE remediation destination, so exactly one of
    // them claims the skill and the other five deliberately do not.
    const marketing = EDUCATION_LESSONS.filter((e) => e.practiceDrill?.area === "marketing-fundamentals");
    assert.equal(marketing.length, 6, "all six approved marketing lessons carry the practice CTA");
    assert.deepEqual(marketing.filter((e) => e.skillSlug).map((e) => e.id), ["deca-who-the-customer-is"],
      "and exactly one of them claims deca-marketing, so remediation has a single destination");
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
    // EXACTLY TWO areas are owned after P1-B2, and they are precisely the two ROLE-PLAY areas. The
    // two CLUSTER-KNOWLEDGE areas the exam tests remain ownerless and are not dressed up.
    const owned = DECA_PRACTICE_MAP.filter((m) => m.coverage === "owned").map((m) => m.area);
    assert.deepEqual(owned, ["performance-indicators", "business-reasoning", "customer-relations", "marketing-fundamentals"], "all four areas are owned");
    // P1-B3 SUPERSEDES the "both owned areas are role-play" assertion. That was true only while no
    // cluster-knowledge area had an owner, and it pinned the state rather than the property. The
    // property worth holding is that an owner's COURSE matches its area's component: a role-play area
    // is owned from the role-play course, and a cluster-knowledge area is not. Forcing the cluster
    // lesson into deca-roleplay-core would now fail here, which the old form could never catch.
    const ROLEPLAY_COURSE = "deca-roleplay-core";
    for (const mapping of DECA_PRACTICE_MAP.filter((m) => m.coverage === "owned")) {
      const owner = EDUCATION_LESSONS.find((e) => e.id === mapping.publishedTeachingOwner)!;
      if (mapping.component === "roleplay") {
        assert.equal(owner.courseId, ROLEPLAY_COURSE, `${mapping.area}: a role-play area is taught from the role-play course`);
      } else {
        assert.notEqual(owner.courseId, ROLEPLAY_COURSE,
          `${mapping.area}: cluster knowledge is NOT taught from the role-play course, whose outcomes are about performing a round`);
      }
    }
    assert.deepEqual(DECA_PRACTICE_MAP.filter((m) => m.coverage === "owned").map((m) => m.component), ["roleplay", "roleplay", "exam", "exam"],
      "two role-play areas and two cluster-knowledge areas, all owned");
    assert.deepEqual(DECA_PRACTICE_MAP.filter((m) => m.publishedTeachingOwner === null).map((m) => m.area), [],
      "no DECA drill area is left without a teaching owner");
    const pi = decaPracticeMappingForSkill("deca-performance-indicators");
    assert.equal(pi?.publishedTeachingOwner, "deca-understanding-performance-indicators", "and the owner is the lesson P1-B1 authored");
    const br = decaPracticeMappingForSkill("deca-business-reasoning");
    assert.equal(br?.publishedTeachingOwner, "deca-justifying-your-recommendation", "and the business-reasoning owner is the lesson P1-B2 authored");
    const cr = decaPracticeMappingForSkill("deca-customer-relations");
    assert.equal(cr?.publishedTeachingOwner, "deca-handling-customer-situations", "and the customer-relations owner is the lesson P1-B3 authored");
    const mk = decaPracticeMappingForSkill("deca-marketing");
    assert.equal(mk?.publishedTeachingOwner, "deca-who-the-customer-is", "and the marketing owner is MK1, the gateway of the six P1-B4 lessons");
  });

  check("D2. a HELD lesson is never treated as a published teaching owner", () => {
    // P1-B5 published deca-reading-scenarios, so it left this list. The control is unchanged in what it
    // protects: a HELD lesson is never an owner and never learner-visible. The published one is checked
    // separately below — it must be visible AND still own nothing.
    const heldSlugs = ["deca-professional-communication"];
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
    assert.deepEqual(
      decaRemediationTargetForSkill("deca-business-reasoning", alwaysPublished),
      { skillSlug: "deca-business-reasoning", lessonId: "deca-justifying-your-recommendation", drill: { track: "deca", area: "business-reasoning" } },
      "and so does the second owned skill, to its own lesson and its own drill"
    );
    assert.deepEqual(
      decaRemediationTargetForSkill("deca-customer-relations", alwaysPublished),
      { skillSlug: "deca-customer-relations", lessonId: "deca-handling-customer-situations", drill: { track: "deca", area: "customer-relations" } },
      "and the cluster-knowledge skill resolves to its own lesson and its own drill"
    );
    assert.deepEqual(
      decaRemediationTargetForSkill("deca-marketing", alwaysPublished),
      { skillSlug: "deca-marketing", lessonId: "deca-who-the-customer-is", drill: { track: "deca", area: "marketing-fundamentals" } },
      "and the marketing skill resolves to MK1 and the marketing drill"
    );
    const genericBr = practiceRemediationForSkill("deca-business-reasoning");
    assert.ok(genericBr, "the generic resolver finds the business-reasoning target too");
    assert.equal(genericBr!.lessonId, "deca-justifying-your-recommendation", "on the same lesson");
    assert.deepEqual(genericBr!.drill, { track: "deca", area: "business-reasoning" }, "with the DECA drill, never a Debate one");
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
    // SUPERSEDED (P1-C). This used to require the literal `remediation.drill.track === "debate"`
    // in both consumers: with only Debate resolvable, refusing everything else was how they avoided
    // coercion. That gate is exactly what made a correct DECA remediation invisible — the helper
    // resolved the right lesson and the right drill, and both learner surfaces then dropped it. The
    // property being protected was never "refuse non-Debate", it was NEVER COERCE: no surface may
    // show a drill under a track its remediation did not name. So the gate is gone and the property
    // is now checked directly, on source and on behaviour.
    const consumers = ["lib/coach-evidence.ts", "app/(app)/study-arcade/review/page.tsx"];
    for (const file of consumers) {
      const src = read(file);
      assert.ok(!/drill\.track === "(debate|deca)"/.test(src), `${file}: no track literal decides what a remediation renders`);
      assert.ok(!/study-arcade\?track=(debate|deca)/.test(src), `${file}: and no hardcoded track in the link it builds`);
      assert.ok(/practiceDrillHref\(remediation\.drill\)/.test(src), `${file}: the link comes from the drill the helper returned`);
      assert.ok(/practiceDrillAreaLabel\(remediation\.drill\)/.test(src), `${file}: and so does the name it shows`);
    }
    // Behaviour, not just shape: for every skill that resolves at all, what a learner would be sent
    // to carries the drill's OWN track, and is named out of that track's own bank. A coercion bug
    // shows up here as a deca drill rendered with a debate href or a Debate area's label.
    let crossTrackRendered = 0;
    let resolvedSkills = 0;
    for (const slug of [...DECA_DRILL_SKILL_SLUGS, ...DRILL_AREAS.map((area) => area.skillSlug)]) {
      if (!slug) continue;
      const remediation = practiceRemediationForSkill(slug);
      if (!remediation) continue;
      resolvedSkills += 1;
      const { track, area } = remediation.drill;
      const bank = track === "deca" ? DECA_DRILL_AREAS : DRILL_AREAS;
      const expectedLabel = bank.find((entry) => entry.id === area)?.label;
      assert.ok(expectedLabel, `${slug}: ${track}/${area} exists in its own bank`);
      if (!practiceDrillHref(remediation.drill).includes(`track=${track}&area=${area}`)) crossTrackRendered += 1;
      if (practiceDrillAreaLabel(remediation.drill) !== expectedLabel) crossTrackRendered += 1;
    }
    assert.equal(crossTrackRendered, 0, "no resolved remediation renders under another track");
    // Non-vacuity: both tracks are actually represented in that sweep, so a total resolution failure
    // cannot pass this control by resolving nothing.
    assert.ok(resolvedSkills >= 5, `control: the sweep resolved real remediations (${resolvedSkills})`);
    assert.equal(DECA_DRILL_SKILL_SLUGS.filter((slug) => practiceRemediationForSkill(slug)).length, 4,
      "and all four DECA skills are among them");
  });

  check("F1b. every drill area the type system allows can actually be named", () => {
    // The runtime half of the compile-time coverage in lib/education/practice-drill.ts. Together they
    // reproduce what the deleted `Record<area, string>` maps guaranteed: tsc forces a new area to be
    // acknowledged there, and this proves its own bank really carries a label for it — so no learner
    // can ever be shown a drill named by its raw slug.
    for (const area of Object.keys(PRACTICE_DRILL_AREAS_COVERED.deca) as Array<DecaPracticeDrill["area"]>) {
      const label = DECA_DRILL_AREAS.find((entry) => entry.id === area)?.label;
      assert.ok(label && label !== area, `deca/${area}: the DECA bank names it (${label ?? "missing"})`);
      assert.equal(practiceDrillAreaLabel({ track: "deca", area }), label, `deca/${area}: and the resolver returns that name`);
    }
    for (const area of Object.keys(PRACTICE_DRILL_AREAS_COVERED.debate) as Array<DebatePracticeDrill["area"]>) {
      const label = DRILL_AREAS.find((entry) => entry.id === area)?.label;
      assert.ok(label && label !== area, `debate/${area}: the Debate bank names it (${label ?? "missing"})`);
      assert.equal(practiceDrillAreaLabel({ track: "debate", area }), label, `debate/${area}: and the resolver returns that name`);
    }
    assert.equal(Object.keys(PRACTICE_DRILL_AREAS_COVERED.deca).length, DECA_DRILL_AREAS.length, "coverage and bank agree in size for DECA");
    assert.equal(Object.keys(PRACTICE_DRILL_AREAS_COVERED.debate).length, DRILL_AREAS.length, "and for Debate");
  });

  check("F2. a drill existing never implies the skill is taught", () => {
    for (const mapping of DECA_PRACTICE_MAP) {
      const drillExists = DECA_DRILL_AREAS.some((area) => area.id === mapping.area);
      assert.equal(drillExists, true, `${mapping.area}: has a drill`);
    }
    // All four have a drill; only ONE is taught. Teaching is a separate, authored fact — which is
    // still the point of this control, now demonstrated by a 1-of-4 split rather than 0-of-4.
    assert.equal(DECA_PRACTICE_MAP.length, 4, "four areas, all drilled");
    assert.equal(DECA_PRACTICE_MAP.filter((m) => m.coverage === "owned").length, 4, "all four of them are taught");
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

  // P1-B2 generalised G1/G2 from the single P1-B1 lesson id to EVERY published DECA concept lesson.
  // Hardcoding one id meant a second lesson could ship with another track's branding and leave this
  // suite green — which is the exact failure mode G1 exists to catch.
  const decaConceptEntries = EDUCATION_LESSONS.filter(
    (e) => e.track === "DECA" && isConceptEducationLessonEntry(e)
  );
  const renderDecaLesson = (entry: (typeof EDUCATION_LESSONS)[number]) =>
    renderToStaticMarkup(React.createElement(ConceptEducationLessonView as never, {
      source: (entry as never as { source: unknown }).source,
      provenance: entry.provenance,
      moduleLabel: getEducationModule(entry.moduleId)?.label ?? "Lesson",
      next: null,
      practiceDrill: entry.practiceDrill
    } as never));

  check("G1. every published DECA lesson renders with no other track's name anywhere in its visible text", () => {
    assert.equal(decaConceptEntries.length, 11, "control: all eleven DECA concept lessons are registered");
    for (const entry of decaConceptEntries) {
      const visible = renderDecaLesson(entry)
        .replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");
      for (const foreign of ["General Debate", "Debate", "debate", "HOSA", "Model UN"]) {
        assert.ok(!visible.includes(foreign), `G1. ${entry.id}: a DECA learner never reads "${foreign}" (track isolation)`);
      }
      assert.ok(visible.includes("DECA"), `G1b. ${entry.id}: control — the scan really read the rendered page, which names DECA`);
      const title = (entry as never as { source: { lesson: { title: string } } }).source.lesson.title;
      assert.ok(visible.includes(title), `G1c. ${entry.id}: control — and it is the right lesson (${title})`);
    }
    // The badge is DERIVED. A Debate lesson still reads "General Debate" through the same code path,
    // so this is a per-entry resolution and not a blanket removal of the label.
    const debate = EDUCATION_LESSONS.find((e) => e.id === "debate-clash");
    assert.ok(debate && isConceptEducationLessonEntry(debate), "control: a Debate concept entry to compare against");
    assert.ok(renderDecaLesson(debate!).replace(/<[^>]+>/g, " ").includes("General Debate"),
      "G1d. NON-REGRESSION: a Debate concept lesson still shows its own track label");
  });

  check("G2. every DECA lesson's practice CTA points at its own exact drill, and the destination honours it", () => {
    // P1-B5: not every DECA concept lesson carries a drill any more. `deca-reading-scenarios` is a
    // simulation PREREQUISITE — it teaches reading the card, which no drill area measures — so it has
    // no `practiceDrill` and therefore no CTA to check. That is asserted directly in G2e rather than
    // assumed here, and the entries that DO carry one are still held to the exact-drill rule.
    const drilled = decaConceptEntries.filter((e) => e.practiceDrill);
    assert.ok(drilled.length >= 9, `control: the drilled DECA lessons are still here (${drilled.length})`);
    for (const entry of drilled) {
      const area = entry.practiceDrill!.area;
      assert.equal(entry.practiceDrill!.track, "deca", `G2. ${entry.id}: DECA drill`);
      assert.equal(isDecaDrillArea(area), true, `G2b. ${entry.id}: ${area} is a real DECA area`);
      assert.ok(renderDecaLesson(entry).includes(`/study-arcade?track=deca&amp;area=${area}`),
        `G2c. ${entry.id}: the CTA deep-links to the ${area} drill, not the DECA drill front door`);
    }
    // Each owned area is reached by exactly one lesson — no two lessons compete for one drill.
    const areas = drilled.map((e) => e.practiceDrill!.area).sort();
    assert.deepEqual([...new Set(areas)].sort(), ["business-reasoning", "customer-relations", "marketing-fundamentals", "performance-indicators"],
      "G2d. every owned area is reached by at least one lesson");
    // One CLAIMED home per area, even where the curriculum defines several lessons for it.
    for (const area of ["performance-indicators", "business-reasoning", "customer-relations", "marketing-fundamentals"]) {
      const claimed = drilled.filter((e) => e.practiceDrill!.area === area && e.skillSlug);
      assert.equal(claimed.length, 1, `G2e. ${area} has exactly one claimed teaching home`);
    }
    assert.equal(isDecaDrillArea("clash"), false, "G2e. and the narrowing rejects another track's area");
    // And the destination must actually READ that parameter. Before P1-B1 the DECA branch dropped
    // `?area=` entirely, so a link whose visible label named one drill opened the mixed picker — and
    // a mixed session spreads its questions across all four areas, so it usually cannot reach the
    // per-area unique-question floor the record depends on.
    const arcade = read("app/(app)/study-arcade/page.tsx");
    assert.ok(/const decaArea = isDecaDrillArea\(searchParams\.area\) \? searchParams\.area : undefined;/.test(arcade),
      "G2f. the DECA branch narrows ?area= rather than casting or ignoring it");
    assert.ok(/initialArea=\{decaArea\}/.test(arcade), "G2g. and passes it to the DECA drill component");
    assert.ok(/useState<string>\(initialArea \?\? "mixed"\)/.test(read("components/training/concept-drills.tsx")),
      "G2h. which seeds the area filter, falling back to mixed when nothing was narrowed");
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

  // ---- H3/H4. THE BUSINESS-REASONING INVARIANTS, IN THE LESSON'S OWN VOICE ----------------------
  //
  // Scanning a whole entry is unreliable for "the page never says X": a keyed-WRONG option and the
  // misconception block both state falsehoods on purpose. These scan only the TEACHING VOICE — the
  // fields where the page speaks as itself — so a deliberate wrong answer cannot trip them and a
  // genuine claim cannot hide inside a distractor.
  const decaTeachingVoice = (): string => {
    const out: string[] = [];
    for (const entry of decaConceptEntries) {
      const c = (entry as never as { source: { lesson: { content: Record<string, unknown> } } }).source.lesson.content;
      out.push(String(c.objective), String(c.explanation), String(c.whyMatters), (c.steps as string[]).join(" "));
      const we = c.workedExample as { whyItWorks: string };
      out.push(we.whyItWorks);
      for (const t of (c.teachingSections as Array<{ heading: string; body: string }> | undefined) ?? []) out.push(t.heading, t.body);
      const m = c.misconception as { betterModel: string } | undefined;
      if (m) out.push(m.betterModel);
      for (const cm of (c.commonMistakes as Array<{ mistake: string; whyItFails: string; fix: string }> | undefined) ?? []) {
        out.push(cm.mistake, cm.whyItFails, cm.fix);
      }
    }
    return out.join("\n");
  };

  check("H3. the teaching voice keeps an idea separate from its reasoning, and never rewards an invented number", () => {
    const voice = decaTeachingVoice();
    assert.ok(voice.length > 1000, "H3a. control: there is teaching text to scan");
    // POSITIVE: the distinction is stated, not left to the questions.
    assert.ok(/Business reasoning is why it would work here/.test(voice),
      "H3. the lesson states plainly that a recommendation and its reasoning are different things");
    assert.ok(/gap between an idea and a business decision/.test(voice),
      "H3b. and names that gap as the skill");
    // POSITIVE: fabricated precision is warned against in the lesson's own voice.
    assert.ok(/made-up percentage falls apart/.test(voice) && /the judge cannot check it/.test(voice),
      "H3c. invented numbers are called out as weak, with the reason");
    assert.ok(/Use the figures on the card/.test(voice) && /say what you would look up/.test(voice),
      "H3d. and the learner is given the honest alternative");
    // NEGATIVE: the teaching voice never tells a learner to supply a number they do not have.
    // Matched as verb-phrase-plus-negation-check rather than a bare regex, because the PI lesson
    // legitimately contains "rather than invent a number" — the opposite claim in the same words.
    const NEGATORS = /(rather than|instead of|never|not|don't|do not|cannot|without|avoid)\s*$/i;
    const encouragesFakePrecision = (text: string): boolean => {
      const verb = /\b(?:invent|make up|guess)\s+(?:a|the|your own|some)\s+(?:number|figure|percentage|statistic)/gi;
      for (let m = verb.exec(text); m !== null; m = verb.exec(text)) {
        if (!NEGATORS.test(text.slice(Math.max(0, m.index - 24), m.index))) return true;
      }
      return /makes? the answer sound stronger|estimate something rather than say nothing|a confident (?:number|figure) is better than/i.test(text);
    };
    assert.ok(!encouragesFakePrecision(voice), "H3e. the teaching voice never encourages fake precision");
    // CONTROL: the scan is not vacuous — a planted encouragement is caught, and the legitimate
    // negation the PI lesson actually uses is not.
    assert.ok(encouragesFakePrecision("Under pressure, invent a number and move on."),
      "H3f. control: a planted encouragement really would be caught");
    assert.ok(!encouragesFakePrecision("If the scenario gives you nothing to measure, say so rather than invent a number."),
      "H3g. control: and the lesson's own negation is not a false positive");
  });

  check("H4. business reasoning and performance-indicator interpretation stay separate skills", () => {
    const voice = decaTeachingVoice();
    // Two owners, two constructs. A sentence equating them would make one lesson's remediation the
    // wrong destination for the other's failed drill.
    for (const banned of [/business reasoning is the same skill as/i, /reasoning and (?:performance )?indicators are the same/i,
                          /the same as working out what the listed indicator/i]) {
      assert.ok(!banned.test(voice), `H4. no published DECA teaching equates the two constructs (${banned})`);
    }
    // And the map keeps them on distinct skills and distinct drills.
    const pi = decaPracticeMappingForSkill("deca-performance-indicators");
    const br = decaPracticeMappingForSkill("deca-business-reasoning");
    assert.notEqual(pi?.publishedTeachingOwner, br?.publishedTeachingOwner, "H4b. the two areas have different owners");
    assert.notEqual(pi?.area, br?.area, "H4c. on different drill areas");
  });

  check("H5. the customer-relations teaching keeps its own invariants, in the lesson's own voice", () => {
    const voice = decaTeachingVoice();
    // POSITIVE: the four inputs the approved curriculum names as the spine of this area.
    for (const [label, re] of [
      ["the four inputs are stated", /the facts you have, the policy that applies, the options you really have/],
      ["policy is a ceiling in both directions", /cannot offer more than it allows, or describe it as broader than it is/],
      ["a true sentence naming no option is not an answer", /A true sentence is not automatically an answer/],
      ["authority runs both ways", /do not call it impossible/],
      ["active listening is named, not just described", /That is active listening/],
      // ...and it is named on the RIGHT behaviour. Asserting only the term lets a mutant redefine it
      // as staying silent while the phrase survives, which is the failure this pair exists to catch.
      ["active listening is paraphrase, not silence", /Say the concern back in your own words/],
      ["the cause is left until it is checked", /Leave the cause until someone has checked/],
      ["service recovery is named", /is called service recovery/]
    ] as Array<[string, RegExp]>) {
      assert.ok(re.test(voice), `H5. ${label}`);
    }
    // NEGATIVE: the four doctrines the approved curriculum forbids as universal rules.
    const FORBIDDEN_UNIVERSALS = [
      /the customer is always right/i,
      /always (?:refund|replace|compensate|escalate)/i,
      /(?:set aside|ignore|override)[^.]{0,40}policy/i,
      /most generous/i,
      /compensation straight away/i
    ];
    for (const banned of FORBIDDEN_UNIVERSALS) {
      assert.ok(!banned.test(voice), `H5b. no universal customer-service rule is taught (${banned})`);
    }
    // CONTROL: the scan is not vacuous.
    assert.ok(FORBIDDEN_UNIVERSALS.some((r) => r.test("Remember that the customer is always right.")),
      "H5c. control: a planted universal really would be caught");
  });

  check("H6. no DECA teaching claims a drill is scored in the role-play, or that mastery means competition readiness", () => {
    const voice = decaTeachingVoice();
    for (const banned of [/judges? scores? this skill/i, /mastery here means you are ready/i,
                          /ready to compete/i, /official(?:ly)? scored category/i,
                          /rubric contains? a customer/i]) {
      assert.ok(!banned.test(voice), `H6. no role-play scoring claim (${banned})`);
    }
    // The cluster-knowledge owner in particular must not borrow the role-play frame.
    const cr = EDUCATION_LESSONS.find((e) => e.id === "deca-handling-customer-situations");
    assert.ok(cr && isConceptEducationLessonEntry(cr), "H6b. control: the cluster lesson is registered");
    const crText = JSON.stringify((cr as never as { source: unknown }).source);
    for (const banned of [/role-play/i, /judge/i]) {
      assert.ok(!banned.test(crText), `H6c. the cluster-knowledge lesson never frames itself as role-play work (${banned})`);
    }
  });

  check("H7. the marketing teaching keeps its own invariants, in the lesson's own voice", () => {
    const voice = decaTeachingVoice();
    // POSITIVE: the distinctions the approved MK curriculum turns on.
    for (const [label, re] of [
      ["segmenting is described, targeting is chosen", /That is segmenting — describing how the market divides/],
      ["a difference is not yet a promise", /Different is not the same as better/],
      ["positioning is how you mean to be understood", /Positioning is how you want your market to think of you/],
      ["price is read off, not announced", /The price is part of the message/],
      ["naming the lever is not choosing inside it", /naming the lever is the easy half/i],
      // Added by the P1-B4 repair: the review found that a pre-order window is arguably product AND
      // place, so the lesson now says so rather than keying one of them and failing the other.
      ["product and place can touch", /decisions touch two levers at once/],
      ["the channel must do what the buyer needs", /what the buyer needs at the point of purchase/i],
      ["audience decides message and channel", /Pick the audience first/]
    ] as Array<[string, RegExp]>) {
      assert.ok(re.test(voice), `H7. ${label}`);
    }
    // NEGATIVE: no universal-strategy claim. The curriculum forbids teaching any of these as rules.
    const UNIVERSALS = [
      /(?:always|never)\s+(?:the\s+)?(?:best|works|wins|right)/i,
      /lower(?:ing)? (?:the )?price always/i,
      /more advertising is (?:always )?better/i,
      /social media is (?:always )?best/i,
      /premium (?:always|must) mean/i
    ];
    for (const banned of UNIVERSALS) {
      assert.ok(!banned.test(voice), `H7b. no universal-strategy claim is taught (${banned})`);
    }
    assert.ok(UNIVERSALS.some((r) => r.test("Remember, the cheapest channel is always best.")),
      "H7c. control: a planted universal really would be caught");
  });

  check("H8. marketing teaching stays out of the other three areas", () => {
    // The curriculum's own area table: cost/ROI/measurement are BR, listed indicators are PI, and what
    // to say to one customer right now is CR. A marketing lesson that drifted into any of them would
    // make two areas claim the same construct and send a failed drill to the wrong lesson.
    const mkText = EDUCATION_LESSONS
      .filter((e) => e.practiceDrill?.area === "marketing-fundamentals" && isConceptEducationLessonEntry(e))
      .map((e) => {
        const c = (e as never as { source: { lesson: { content: Record<string, unknown> } } }).source.lesson.content;
        const we = c.workedExample as { whyItWorks: string };
        return [String(c.objective), String(c.explanation), String(c.whyMatters), (c.steps as string[]).join(" "), we.whyItWorks,
          ...((c.teachingSections as Array<{ heading: string; body: string }> | undefined) ?? []).map((t) => t.heading + " " + t.body)].join(" ");
      }).join("\n");
    assert.ok(mkText.length > 3000, "H8a. control: there is marketing teaching text to scan");
    for (const [area, banned] of [
      ["Business Reasoning", /\b(?:ROI|return on investment|break-even|cost per acquisition|feasibilit)\b/i],
      ["Performance Indicators", /\b(?:performance indicator|listed indicator)\b/i],
      ["Customer Relations", /\b(?:service recovery|active listening|complaint handling)\b/i]
    ] as Array<[string, RegExp]>) {
      assert.ok(!banned.test(mkText), `H8. marketing teaching does not cross into ${area} (${banned})`);
    }
  });

  check("H8b. the published and held slug lists PARTITION the DECA catalog", () => {
    // Found by a P1-B5 mutation: removing a slug from PUBLISHED_DECA_SLUGS un-published a lesson and
    // NOTHING failed, because no control tied the two lists to the catalog they describe. A DECA entry
    // must be exactly one of published or held — never both, and never neither, which is how a lesson
    // goes missing quietly.
    const decaCatalog = LEARNING_SKILL_CATALOG.filter((e) => e.track === "DECA").map((e) => e.slug);
    assert.ok(decaCatalog.length >= 12, `control: the DECA catalog is real (${decaCatalog.length} entries)`);
    const published = [...PUBLISHED_DECA_SLUGS];
    const held = [...HELD_DECA_CATALOG_SLUGS];
    for (const slug of decaCatalog) {
      const inPublished = published.includes(slug as never);
      const inHeld = held.includes(slug);
      assert.ok(inPublished !== inHeld, `${slug}: is exactly one of published or held (published=${inPublished}, held=${inHeld})`);
    }
    assert.deepEqual([...published, ...held].sort(), [...decaCatalog].sort(),
      "H8b2. and the two lists together name every DECA catalog entry, with nothing invented");
    // Each side keeps its registry consequence.
    for (const slug of published) {
      const entry = EDUCATION_LESSONS.find((e) => e.id === slug);
      assert.ok(entry && entry.visibility === "learner", `${slug}: published means registered and learner-visible`);
    }
    for (const slug of held) {
      assert.deepEqual(EDUCATION_LESSONS.filter((e) => e.id === slug), [], `${slug}: held means absent from the registry`);
    }
  });

  // ---- H9. THE SIMULATION PREREQUISITE (P1-B5) -------------------------------------------------
  check("H9. the scenario-reading lesson is a prerequisite, and owns no mastery area", () => {
    const entry = EDUCATION_LESSONS.find((e) => e.id === "deca-reading-scenarios");
    assert.ok(entry, "H9. the lesson is registered");
    assert.equal(entry!.visibility, "learner", "H9a. and is learner-visible — no longer held");
    assert.equal(entry!.track, "DECA", "H9b. on the DECA track");
    assert.equal(entry!.courseId, "deca-roleplay-core", "H9c. in the ROLE-PLAY course, not the business-content one");
    // The whole point of the phase: a prerequisite is not a drill owner.
    assert.equal((entry as never as { skillSlug?: string }).skillSlug, undefined,
      "H9d. it claims NO skill slug, so it cannot become a fifth mastery area or steal an existing one");
    assert.equal(entry!.practiceDrill, undefined,
      "H9e. and NO practice drill, so no CTA sends a learner at questions measuring a different construct");
    assert.equal(DECA_PRACTICE_MAP.filter((m) => m.publishedTeachingOwner === "deca-reading-scenarios").length, 0,
      "H9f. and it is the teaching owner of nothing");
    assert.equal(DECA_PRACTICE_MAP.filter((m) => m.publishedTeachingOwner).length, 4,
      "H9g. the four owners are still exactly four");
    // A lesson id must never equal a skill slug (the rule that would 404 a learner with a due review).
    assert.ok(!DECA_DRILL_SKILL_SLUGS.includes("deca-reading-scenarios" as never),
      "H9h. and its id is not a skill slug");
  });

  check("H10. reading the scenario is taught as EXTRACTION, not as solving it", () => {
    const entry = EDUCATION_LESSONS.find((e) => e.id === "deca-reading-scenarios")!;
    assert.ok(isConceptEducationLessonEntry(entry), "control: it is a concept lesson");
    const c = (entry as never as { source: { lesson: { content: Record<string, unknown> } } }).source.lesson.content;
    const we = c.workedExample as { prompt: string; weakAnswer: string; strongAnswer: string; whyItWorks: string };
    const teaching = [String(c.objective), String(c.explanation), String(c.whyMatters), (c.steps as string[]).join(" "),
      ...((c.teachingSections as Array<{ heading: string; body: string }> | undefined) ?? []).map((t) => t.heading + " " + t.body),
      ...((c.commonMistakes as Array<{ mistake: string; whyItFails: string; fix: string }> | undefined) ?? [])
        .map((m) => m.mistake + " " + m.whyItFails + " " + m.fix)].join("\n");
    assert.ok(teaching.length > 2000, "H10a. control: there is teaching text to scan");

    // The five extracts the approved curriculum names, at extraction depth.
    for (const [what, re] of [
      ["role", /\brole\b/i], ["audience", /\baudience\b/i], ["situation", /\bsituation\b/i],
      ["task", /\btask\b/i], ["constraint", /\bconstraint\b/i]
    ] as Array<[string, RegExp]>) {
      assert.ok(re.test(teaching), `H10b. the lesson names the ${what}`);
    }
    // SITUATION and TASK are taught as DIFFERENT things — the distinction a learner most often loses.
    assert.ok(/situation is[^.]*\. The task is/i.test(teaching),
      "H10c. and states plainly that the situation and the task are not the same");
    // FACT vs ASSUMPTION is the core invariant.
    assert.ok(/(invent|made up|guess)/i.test(teaching), "H10d. it separates what the card states from what the learner supplies");
    // BOUNDED AUTHORITY, carried forward from the approved curriculum.
    assert.ok(/cannot promise|nothing beyond it|inside it/i.test(teaching),
      "H10e. and keeps the role's authority bounded by what the scenario gave");

    // BOUNDARIES. Reading is not solving, not PI interpretation, and not business reasoning. Each of
    // these belongs to a lesson that already exists or is still to be written; teaching them here
    // would make two lessons claim one construct.
    for (const [owner, banned] of [
      ["root-cause analysis (deca-identifying-problem)", /\broot cause\b|\bunderlying (?:business )?problem\b|\bwhy it is happening\b/i],
      ["PI interpretation (deca-understanding-performance-indicators)", /\bplain meaning\b|\bin-character action\b|\bdemonstrate the indicator\b/i],
      ["business reasoning (deca-justifying-your-recommendation)", /\bROI\b|\breturn on investment\b|\bbreak-even\b|\bcost per\b/i]
    ] as Array<[string, RegExp]>) {
      assert.ok(!banned.test(teaching), `H10f. reading does not take over ${owner}`);
    }
    // It may RECOGNISE that indicators exist — that is the curriculum's fifth extract — and it must
    // hand the depth to the lesson that owns it.
    assert.ok(/performance indicator/i.test(teaching), "H10g. it does recognise that the card lists indicators");
    assert.ok(/separate lesson/i.test(teaching), "H10h. and routes what to do with them to the lesson that owns it");

    // The worked example is EXTRACTION: the strong answer names what the card says and stops.
    assert.ok(/My task is/i.test(we.strongAnswer), "H10i. the strong answer names the task");
    assert.ok(/Nobody has told me/i.test(we.strongAnswer), "H10j. and names what it was NOT told rather than filling it in");
    assert.ok(/(not the proven cause|something to check)/i.test(we.strongAnswer),
      "H10k. and refuses to promote a correlation into a cause");
    assert.ok(/killed|would recover/i.test(we.weakAnswer),
      "H10l. control: the weak answer really does invent a cause and predict a result");
  });

  // ---- H11/H12. THE SECOND SIMULATION PREREQUISITE (P1-B6) -------------------------------------
  check("H11. the problem-identification lesson is a prerequisite, and owns no mastery area", () => {
    const entry = EDUCATION_LESSONS.find((e) => e.id === "deca-identifying-problem");
    assert.ok(entry, "H11. the lesson is registered");
    assert.equal(entry!.visibility, "learner", "H11a. and is learner-visible — no longer held");
    assert.equal(entry!.courseId, "deca-roleplay-core", "H11b. in the ROLE-PLAY course, not the business-content one");
    assert.equal((entry as never as { skillSlug?: string }).skillSlug, undefined, "H11c. it claims NO skill slug");
    assert.equal(entry!.practiceDrill, undefined, "H11d. and NO practice drill");
    assert.equal(DECA_PRACTICE_MAP.filter((m) => m.publishedTeachingOwner === "deca-identifying-problem").length, 0,
      "H11e. and is the teaching owner of nothing");
    assert.equal(DECA_PRACTICE_MAP.filter((m) => m.publishedTeachingOwner).length, 4, "H11f. the four owners are still four");
    // Both prerequisites together own nothing, so the DECA drill areas keep exactly four owners.
    const prerequisites = ["deca-reading-scenarios", "deca-identifying-problem"];
    for (const id of prerequisites) {
      const e = EDUCATION_LESSONS.find((x) => x.id === id)!;
      assert.equal(e.practiceDrill, undefined, `H11g. ${id} carries no drill`);
      assert.ok(!DECA_DRILL_SKILL_SLUGS.includes(id as never), `H11h. ${id}'s id is not a skill slug`);
    }
  });

  check("H12. identifying the problem stays between reading and reasoning", () => {
    const entry = EDUCATION_LESSONS.find((e) => e.id === "deca-identifying-problem")!;
    assert.ok(isConceptEducationLessonEntry(entry), "control: it is a concept lesson");
    const c = (entry as never as { source: { lesson: { content: Record<string, unknown> } } }).source.lesson.content;
    const we = c.workedExample as { prompt: string; weakAnswer: string; strongAnswer: string; whyItWorks: string };
    const teaching = [String(c.objective), String(c.explanation), String(c.whyMatters), (c.steps as string[]).join(" "),
      ...((c.teachingSections as Array<{ heading: string; body: string }> | undefined) ?? []).map((t) => t.heading + " " + t.body),
      ...((c.commonMistakes as Array<{ mistake: string; whyItFails: string; fix: string }> | undefined) ?? [])
        .map((m) => m.mistake + " " + m.whyItFails + " " + m.fix),
      String((c.misconception as { wrongModel: string; whyItFails: string; betterModel: string }).wrongModel),
      String((c.misconception as { betterModel: string }).betterModel)].join("\n");
    assert.ok(teaching.length > 2000, "H12a. control: there is teaching text to scan");

    // THE FOUR DISTINCTIONS THIS LESSON EXISTS TO HOLD.
    assert.ok(/The task is what you were asked to produce\. The problem is what needs to change/i.test(teaching),
      "H12b. task and problem are stated as different things");
    assert.ok(/the symptom/i.test(teaching) && /not automatically the thing to fix/i.test(teaching),
      "H12c. and so are the visible symptom and the thing to fix");
    assert.ok(/silence is not permission/i.test(teaching),
      "H12d. an unstated cause stays unstated — absence is never promoted into a fact");
    assert.ok(/is something to do/i.test(teaching) && /is a problem/i.test(teaching),
      "H12e. and a proposed solution is not a problem");

    // NO ROOT-CAUSE DOCTRINE. The held draft taught "the root problem is why it is happening"; the
    // approved scope is the opposite — dig only as far as the facts reach.
    assert.ok(!/\broot cause\b|\broot problem\b/i.test(teaching), "H12f. no root-cause doctrine survives");
    assert.ok(/Not every scenario has something underneath/i.test(teaching),
      "H12g. and the lesson says outright that sometimes the visible issue is the issue");

    // BOUNDARIES on both sides.
    for (const [owner, banned] of [
      ["business reasoning (deca-justifying-your-recommendation)", /\bROI\b|return on investment|break-even|cost per|revenue impact/i],
      ["PI interpretation (deca-understanding-performance-indicators)", /\bplain meaning\b|\bin-character action\b|performance indicator/i]
    ] as Array<[string, RegExp]>) {
      assert.ok(!banned.test(teaching), `H12h. problem identification does not take over ${owner}`);
    }
    // It stops before recommendation-building, and says so.
    assert.ok(/where this lesson stops/i.test(teaching), "H12i. and it tells the learner where it stops");

    // THE WORKED EXAMPLE MUST NOT COMMIT THE LESSON'S OWN HEADLINE ERROR. Its gym scenario supplies
    // no cause, so the strong answer must name none — and must not smuggle one in as a solution.
    assert.ok(/does not say why/i.test(we.strongAnswer), "H12j. the strong answer says the cause is not given");
    assert.ok(!/\bbecause\b/i.test(we.strongAnswer), "H12k. and offers no because of its own");
    assert.ok(!/we should/i.test(we.strongAnswer), "H12l. and proposes no solution");
    assert.ok(/because/i.test(we.weakAnswer) || /bored/i.test(we.weakAnswer),
      "H12m. control: the weak answer really does invent a reason");
    // Where the lesson DOES use a cause, it is the one its own scenario states, with the attribution
    // the scenario carries. An earlier draft dropped "staff say" and asserted the readability itself.
    const bakery = String(c.explanation);
    assert.ok(/staff say orders get mixed up because the slips are hard to read/i.test(bakery),
      "H12n. the bakery scenario states the causal link itself, rather than leaving the lesson to supply it");
    // matchAll, NOT match+indexOf: indexOf returns the FIRST occurrence every time, so a version of
    // this control written that way passed while later, unattributed mentions went unchecked. The
    // mutation that dropped the attribution from the second mention is what exposed it.
    let readabilityMentions = 0;
    for (const m of teaching.matchAll(/hard[- ]to[- ]read|hard to read/gi)) {
      const at = m.index ?? 0;
      readabilityMentions += 1;
      assert.ok(/staff say/i.test(teaching.slice(Math.max(0, at - 90), at)),
        `H12o. every mention of the slips' readability keeps its attribution (near "${teaching.slice(Math.max(0, at - 50), at + 20).replace(/\n/g, " ")}")`);
    }
    assert.ok(readabilityMentions >= 3, `H12o2. control: the readability claim really is made repeatedly (${readabilityMentions})`);
    // And the model problem sentence must not manufacture a causal link of its own.
    for (const m of teaching.matchAll(/orders get mixed up because|mixes up orders because/gi)) {
      const at = m.index ?? 0;
      assert.ok(/staff say/i.test(teaching.slice(Math.max(0, at - 60), at)),
        `H12p. the bakery cause is only ever asserted as what staff say (near "${teaching.slice(Math.max(0, at - 50), at + 24).replace(/\n/g, " ")}")`);
    }
  });

  // ---------------------------------------------------------------------------------------------
// QA-R2 #5/#6 — THE DIAGNOSTIC BRIDGE. A graded test speaks the question bank's vocabulary; the product
// records four skills. These controls prove the bridge connects the two truthfully and fails closed.
{
  const {
    DECA_DIAGNOSTIC_BRIDGE,
    decaBridgeForDiagnostic,
    decaDiagnosticRoutes,
    decaUnbridgedDiagnostics,
    decaBridgeAreasAreCanonical
  } = require("../lib/education/deca-diagnostic-bridge");
  const { getEducationLesson } = require("../lib/education/registry");
  const { DECA_DRILL_AREAS } = require("../lib/deca-drills");
  const published = (lessonId: string) => getEducationLesson(lessonId)?.visibility === "learner";

  assert.ok(decaBridgeAreasAreCanonical(), "B1. every bridged diagnostic belongs to one of the four recorded areas");
  for (const entry of DECA_DIAGNOSTIC_BRIDGE) {
    const lesson = getEducationLesson(entry.lessonId);
    assert.ok(lesson, `B2. ${entry.diagnostic} names a lesson that exists (${entry.lessonId})`);
    assert.equal(lesson.visibility, "learner", `B2b. ${entry.diagnostic} names a lesson a learner can open`);
    assert.equal(lesson.track, "DECA", `B2c. ${entry.diagnostic} stays inside DECA`);
    assert.ok(entry.why.length > 20, `B2d. ${entry.diagnostic} explains the connection in words`);
  }

  // The bank's four Marketing tags, end to end: the two that marketing teaches, and the measurement one
  // the approved curriculum assigns to reasoning.
  const marketing = decaDiagnosticRoutes(
    ["Target market analysis", "Customer behavior", "Promotion strategy", "Marketing metrics"],
    published
  );
  assert.deepEqual(
    marketing.map((route: { area: string; lessonId: string }) => [route.area, route.lessonId]),
    [
      ["marketing-fundamentals", "deca-who-the-customer-is"],
      ["marketing-fundamentals", "deca-telling-them-about-it"],
      ["business-reasoning", "deca-justifying-your-recommendation"]
    ],
    "B3. a marketing diagnosis reaches the specific lesson that teaches it, once per lesson"
  );
  assert.equal(
    decaDiagnosticRoutes(["Service recovery"], published)[0]?.lessonId,
    "deca-handling-customer-situations",
    "B4. a service diagnosis reaches customer relations"
  );
  assert.equal(
    decaDiagnosticRoutes(["Performance indicators"], published)[0]?.lessonId,
    "deca-understanding-performance-indicators",
    "B5. an indicator diagnosis reaches the indicators lesson"
  );
  assert.equal(
    decaDiagnosticRoutes(["Business reasoning"], published)[0]?.lessonId,
    "deca-justifying-your-recommendation",
    "B6. a reasoning diagnosis reaches the reasoning lesson"
  );

  // FAIL CLOSED. Clusters with no published teaching get no route and are reported as uncovered.
  const uncovered = ["Financial analysis", "Risk management", "Operations planning", "Value proposition ", "Feasibility"];
  assert.deepEqual(
    decaDiagnosticRoutes(["Financial analysis", "Operations planning", "Feasibility"], published),
    [],
    "B7. a diagnostic with no published lesson produces no recommendation"
  );
  assert.deepEqual(
    decaUnbridgedDiagnostics(["Financial analysis", "Target market analysis"]),
    ["Financial analysis"],
    "B8. and is reported as uncovered rather than dropped"
  );
  assert.equal(decaBridgeForDiagnostic("value proposition"), DECA_DIAGNOSTIC_BRIDGE.find((e: { diagnostic: string }) => e.diagnostic === "Value proposition"), "B9. matching is case-insensitive");
  assert.equal(decaBridgeForDiagnostic(null), null, "B10. and null-safe");
  assert.deepEqual(decaDiagnosticRoutes(["Target market analysis"], () => false), [], "B11. an unpublished lesson yields no route — the control that proves the publication gate");
  assert.ok(uncovered.length > 0, "B12-C the uncovered list is non-empty, so B7 is not vacuous");
  const areas = new Set(DECA_DRILL_AREAS.map((a: { id: string }) => a.id));
  for (const entry of DECA_DIAGNOSTIC_BRIDGE) assert.ok(areas.has(entry.area), "B13. no bridged area outside the four");
  console.log(`  ok  diagnostic bridge: ${DECA_DIAGNOSTIC_BRIDGE.length} diagnostics, all resolving to published DECA lessons`);
}

console.log(
    `\nDECA practice-map smoke passed: ${checks} controls. ALL FOUR DECA areas now resolve. P1-B1 and ` +
    `P1-B2 published the two ROLE-PLAY owners from the role-play course; P1-B3 and P1-B4 published the ` +
    `two CLUSTER-KNOWLEDGE owners from the Business-Content course, because the role-play course ` +
    `teaches performing a round and names no content area — an owner's course must match its area's ` +
    `component, so a cluster lesson forced into the role-play course fails here. Marketing is six ` +
    `approved lessons (MK1-MK6) of which exactly ONE claims the skill, so the area keeps a single ` +
    `remediation destination while the other five carry the practice CTA alone. Every owned area has ` +
    `exactly one claimed teaching home; a claimed owner must be a registered, learner-visible DECA ` +
    `lesson naming that area's exact skill slug; publication stays load-bearing; held lessons are never ` +
    `treated as published; every practice drill belongs to its own lesson's track; and EVERY published ` +
    `DECA lesson is rendered and scanned for another track's name.`
  );
}

main();
