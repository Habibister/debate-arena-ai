/**
 * DECA P1-A — track-aware practice mapping.
 *
 * STRICT-SAFE BY CONSTRUCTION: every module it imports is pure (no prisma, no env, no network, no
 * provider). It proves two things that must stay separate — that DECA practice is REPRESENTABLE, and
 * that it is not currently RESOLVABLE because no published lesson teaches any drilled construct yet.
 *
 * Run with: npx tsx scripts/deca-practice-map-smoke.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DECA_DRILL_AREAS, DECA_DRILL_SKILL_SLUGS } from "../lib/deca-drills";
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
import { EDUCATION_LESSONS } from "../lib/education/registry";

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

  check("A2. DEBATE NON-REGRESSION: every registry practice drill is still a debate drill on a real debate area", () => {
    const drilled = EDUCATION_LESSONS.filter((entry) => entry.practiceDrill);
    assert.ok(drilled.length > 0, "control: some lessons still carry a drill");
    const debateAreas = DRILL_AREAS.map((area) => area.id);
    for (const entry of drilled) {
      assert.equal(entry.practiceDrill!.track, "debate", `${entry.id}: still a debate drill`);
      assert.ok(debateAreas.includes(entry.practiceDrill!.area as (typeof debateAreas)[number]), `${entry.id}: area is a real debate area`);
      assert.equal(entry.track, "GENERAL_DEBATE", `${entry.id}: owned by a Debate lesson`);
    }
    // No DECA lesson gained a drill in this task.
    assert.deepEqual(EDUCATION_LESSONS.filter((e) => e.track === "DECA" && e.practiceDrill).map((e) => e.id), [], "no DECA lesson carries a drill yet");
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

  check("D1. the map does not claim a teaching owner that does not exist", () => {
    for (const mapping of DECA_PRACTICE_MAP) {
      assert.equal(mapping.publishedTeachingOwner, null, `${mapping.area}: no published owner is claimed`);
      assert.ok(mapping.coverage === "none" || mapping.coverage === "orientation-only", `${mapping.area}: coverage is honest`);
      assert.ok(mapping.note.length > 20, `${mapping.area}: the judgement is recorded, not implied`);
    }
    // The one area with partial teaching says so, and still owns nothing.
    const pi = decaPracticeMappingForSkill("deca-performance-indicators");
    assert.equal(pi?.coverage, "orientation-only", "performance indicators are touched at orientation depth only");
    assert.notEqual(pi?.coverage, "owned", "which is explicitly not ownership");
  });

  check("D2. a HELD lesson is never treated as a published teaching owner", () => {
    const heldSlugs = ["deca-reading-scenarios", "deca-identifying-problem", "deca-professional-communication"];
    const owners = DECA_PRACTICE_MAP.map((m) => m.publishedTeachingOwner).filter((o): o is string => o !== null);
    for (const held of heldSlugs) {
      assert.ok(!owners.includes(held), `${held}: not used as an owner`);
      assert.deepEqual(EDUCATION_LESSONS.filter((e) => e.id === held), [], `${held}: still absent from the learner registry`);
    }
  });

  check("E1. REPRESENTABLE but not RESOLVABLE: every DECA skill truthfully has no remediation target today", () => {
    const alwaysPublished = () => true;
    for (const mapping of DECA_PRACTICE_MAP) {
      assert.equal(decaRemediationTargetForSkill(mapping.skillSlug, alwaysPublished), null, `${mapping.skillSlug}: no target`);
      // And the generic resolver agrees, without reaching for another track.
      assert.equal(practiceRemediationForSkill(mapping.skillSlug), null, `${mapping.skillSlug}: generic resolver returns nothing`);
    }
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
      const taught = mapping.coverage === "owned";
      assert.equal(taught, false, `${mapping.area}: drill availability does not make it taught`);
    }
  });

  console.log(
    `\nDECA practice-map smoke passed: ${checks} controls. DECA practice is now REPRESENTABLE — the ` +
      `drill type admits a DECA track with its own area union, all four areas map to their exact existing ` +
      `skill slugs, and the role-play/cluster-knowledge split is explicit. It is deliberately not yet ` +
      `RESOLVABLE: no published lesson owns any drilled construct, so every remediation target is null ` +
      `for want of curriculum rather than for want of architecture, held lessons are never treated as ` +
      `published, and remediation can never cross tracks.`
  );
}

main();
