/**
 * M15 S4 — DEBATE LEARN + COMPETE ARCHITECTURE.
 *
 * Run with: npm run learn-compete:smoke
 *
 * NO DATABASE, NO PROVIDER, NO ENV. Pure modules and `react-dom/server` only.
 *
 * WHAT IT PROTECTS. Debate's learner journey is now exactly two stages: Learn, then Compete. Practice
 * and Apply are gone as CATEGORIES — not as capabilities. Every drill, every due review, every
 * remediation link and the writing-practice route all still work and are all still reachable; what a
 * learner no longer has to do is understand "Practice" as a product area sitting between learning a
 * skill and using it, or read a stage called "Apply" whose own note said it had no destination.
 *
 * The suite therefore asserts two things that pull against each other, because both must hold:
 *   - the CATEGORIES are gone from every surface that describes the Debate journey, and
 *   - the CAPABILITIES underneath them are still reachable from Learn.
 * A change that deleted the drill surface would pass the first and fail the second.
 *
 * It also guards the COMPETE -> LEARN return, which was broken: the post-round action built
 * `/skills/<judge slug>/practice`, a route that serves only a legacy compatibility slug, so every
 * canonical judge recommendation answered 404 for exactly the learner the diagnosis was written for.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as { React?: unknown }).React = React;
/* eslint-disable @typescript-eslint/no-var-requires */
const { learnerPathForTrack, isActionableStage } = require("../lib/learner-path");
const { RETIRED_TRACKS } = require("../lib/training-tracks");
const { LearnerPathRail } = require("../components/ui/learner-path-rail");
const { debateDiagnosisLesson } = require("../lib/education/diagnosis");
const { EDUCATION_REGISTRY } = require("../lib/education/registry");
const { validateEducationRegistry } = require("../lib/education/validate");

const read = (p: string) => readFileSync(p, "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
const decode = (h: string) =>
  h.replace(/&#x27;|&#39;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, "&");
const render = (el: unknown) => decode(renderToStaticMarkup(el as never));
const visible = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

let checks = 0;
function check(name: string, fn: () => void) {
  fn();
  checks += 1;
  console.log(`  ok  ${name}`);
}

/** Every lesson slug `recommendationForStudent` can emit, read from the judge route itself. */
function judgeEmittedSlugs(): string[] {
  const src = stripComments(read("app/api/debates/[debateId]/judge/route.ts"));
  const start = src.indexOf("const recommendations:");
  assert.ok(start > 0, "control: the recommendation builder is locatable");
  const body = src.slice(start, src.indexOf("return recommendations"));
  const slugs = [...body.matchAll(/add\("([^"]+)"/g)].map((m) => m[1]);
  assert.ok(slugs.length >= 5, `control: the judge really emits recommendations — found ${slugs.length}`);
  return [...new Set(slugs)];
}

function main() {
  console.log("\nlearn-compete:smoke\n");

  const debate = learnerPathForTrack("GENERAL_DEBATE");

  // ---- A-B. the Debate journey is exactly Learn then Compete ------------------------------------
  check("A. Debate's primary journey is Learn then Compete, in that order", () => {
    assert.deepEqual(debate.map((s: { id: string }) => s.id), ["learn", "compete"]);
    assert.deepEqual(debate.map((s: { label: string }) => s.label), ["Learn", "Compete"]);
    assert.equal(debate.length, 2, "A2. two stages, not four");
    for (const stage of debate) assert.ok(isActionableStage(stage), `A3. ${stage.id} is a real destination`);
  });

  check("B. Debate declares no Practice, Apply or Tests stage, and no placeholder survives", () => {
    for (const gone of ["practice", "apply"]) {
      assert.equal(debate.find((s: { id: string }) => s.id === gone), undefined, `B. no ${gone} stage`);
    }
    assert.ok(debate.every((s: { href?: string }) => !(s.href ?? "").startsWith("/tests")), "B2. no /tests destination");
    // The Apply stage is REMOVED, not reworded. A stage whose own note says it has no destination is
    // the product admitting the category has no purpose; "Coming soon" would be the same admission.
    const src = read("lib/learner-path.ts");
    const debateBlock = src.slice(src.indexOf("const DEBATE_PATH"), src.indexOf("const DECA_PATH"));
    assert.ok(!/id: "apply"/.test(debateBlock) && !/id: "practice"/.test(debateBlock),
      "B3. the Debate literal declares neither stage");
    for (const placeholder of ["No dedicated Apply destination", "Coming soon", "Apply later", "Unavailable"]) {
      assert.ok(!debateBlock.includes(placeholder), `B4. no Debate placeholder copy (${placeholder})`);
    }
    // Non-vacuity: DECA and HOSA still declare both, so B is not passing on an empty module.
    assert.ok(/id: "apply"/.test(src.slice(src.indexOf("const DECA_PATH"))), "B5. control: Apply still exists for other tracks");
  });

  // ---- C. DECA and HOSA are untouched -----------------------------------------------------------
  check("C. DECA and HOSA keep their own four-stage journeys, unchanged", () => {
    for (const track of ["DECA", "HOSA"] as const) {
      const path = learnerPathForTrack(track);
      assert.deepEqual(path.map((s: { id: string }) => s.id), ["learn", "practice", "apply", "compete"],
        `C. ${track} still declares four stages in order`);
    }
    assert.equal(learnerPathForTrack("DECA").find((s: { id: string }) => s.id === "practice")?.href,
      "/training/deca/practice", "C2. DECA Practice destination unchanged");
    assert.equal(learnerPathForTrack("DECA").find((s: { id: string }) => s.id === "apply")?.href,
      "/training/deca/events", "C3. DECA Apply destination unchanged");
    assert.equal(learnerPathForTrack("HOSA").find((s: { id: string }) => s.id === "apply")?.href,
      "/training/hosa/events", "C4. HOSA Apply destination unchanged");
    assert.equal(learnerPathForTrack("HOSA").find((s: { id: string }) => s.id === "compete")?.href, undefined,
      "C5. HOSA Compete is still honestly unavailable");
    // Model UN stays soft-removed: an unknown track returns nothing rather than a guess.
    assert.deepEqual(learnerPathForTrack("MODEL_UN"), [], "C6. Model UN still has no path");
  });

  // ---- D. the rail numbers by position within the track's own journey ---------------------------
  check("D. the rail renders 1 Learn / 2 Compete for Debate and 1-4 for DECA and HOSA", () => {
    const railFor = (track: string) =>
      visible(render(React.createElement(LearnerPathRail,
        { stages: learnerPathForTrack(track), label: `${track} learner path` } as never)));

    const debateRail = railFor("GENERAL_DEBATE");
    assert.ok(/1 Learn/.test(debateRail), "D. Learn is step 1");
    assert.ok(/2 Compete/.test(debateRail), "D2. Compete is step 2");
    assert.ok(!/4 Compete/.test(debateRail), "D3. and never a phantom 4 — that would read as missing steps");
    assert.ok(!/Practice/.test(debateRail) && !/Apply/.test(debateRail), "D4. neither removed stage is rendered");

    // NON-VACUITY, and the whole reason the shared component was left alone: the other two tracks
    // still number 1-4 from the same code path, on the same /training page.
    for (const track of ["DECA", "HOSA"] as const) {
      const rail = railFor(track);
      for (const [n, label] of [[1, "Learn"], [2, "Practice"], [3, "Apply"], [4, "Compete"]] as const) {
        assert.ok(new RegExp(`${n} ${label}`).test(rail), `D5. ${track} still renders ${n} ${label}`);
      }
    }
  });

  // ---- E. Learn opens the catalog, and the catalog shows only published lessons -----------------
  check("E. Learn opens the Debate lesson catalog, never one hardcoded lesson", () => {
    const learn = debate.find((s: { id: string }) => s.id === "learn");
    assert.equal(learn?.href, "/lessons?track=debate");
    assert.ok(!/^\/lessons\/[a-z]/.test(learn?.href ?? ""), "E2. not a single-lesson route");
    // The catalog it opens filters to learner-visible entries, so a held lesson has no way in.
    const index = stripComments(read("app/(app)/lessons/page.tsx"));
    assert.ok(/visibility === "learner"/.test(index), "E3. the catalog lists only learner-visible entries");
  });

  check("F. every held Debate lesson stays out of the Learn catalog", () => {
    const HELD = ["debate-claim-warrant-impact", "debate-rebuttal-speeches",
                  "debate-parliamentary-roles", "debate-case-topic-definitions"];
    const visibleIds = EDUCATION_REGISTRY.lessons
      .filter((e: { visibility: string }) => e.visibility === "learner")
      .map((e: { id: string }) => e.id);
    for (const held of HELD) {
      assert.ok(!visibleIds.includes(held), `F. ${held} is not learner-visible`);
      assert.equal(debateDiagnosisLesson(held), null, `F2. and no diagnosis can route to ${held}`);
    }
    // Non-vacuity: the published set is real and non-trivial.
    assert.ok(visibleIds.filter((id: string) => id.startsWith("debate-") || id === "claim-warrant-impact").length >= 9,
      "F3. control: the Debate catalog really has published lessons in it");
  });

  // ---- G-H. the capabilities under the removed categories are still reachable -------------------
  check("G. targeted drills and due reviews are still reachable, from Learn-side surfaces", () => {
    // The drill deep link survives in the places a learner actually meets it, none of which is a stage.
    const drillBuilders: Array<[string, RegExp]> = [
      ["components/lessons/concept-education-lesson-view.tsx", /\/study-arcade\?track=\$\{practiceDrill\.track\}&area=\$\{practiceDrill\.area\}/],
      ["app/(app)/study-arcade/review/page.tsx", /\/study-arcade\?track=/],
      ["lib/coach-evidence.ts", /\/study-arcade\?track=/],
      ["components/skills/skill-path.tsx", /\/study-arcade\?track=/]
    ];
    for (const [file, pattern] of drillBuilders) {
      assert.ok(pattern.test(stripComments(read(file))), `G. ${file} still reaches the drill surface`);
    }
    // Review keeps its own direct route from three independent surfaces.
    for (const file of ["app/(app)/home/page.tsx", "app/(app)/study-arcade/page.tsx", "components/skills/skill-path.tsx"]) {
      assert.ok(/\/study-arcade\/review/.test(stripComments(read(file))), `G2. ${file} still reaches review`);
    }
    // And the drill surface itself was not deleted along with the category.
    assert.ok(read("app/(app)/study-arcade/page.tsx").length > 0, "G3. Study Arcade still exists");
    assert.ok(/href: "\/study-arcade"/.test(read("components/app/app-shell.tsx")), "G4. and keeps its own shell entry");
  });

  check("H. Compete is preserved, and Learn now has a navigation home of its own", () => {
    assert.equal(debate.find((s: { id: string }) => s.id === "compete")?.href, "/debate?track=debate");
    const shell = read("components/app/app-shell.tsx");
    assert.ok(/href: "\/compete", label: "Compete"/.test(shell), "H2. Compete stays in primary navigation");
    // The nav inversion: the lesson catalog had no entry at all while the drill index had one.
    assert.ok(/href: "\/lessons", label: "Lessons"/.test(shell), "H3. Lessons has a navigation entry");
    assert.ok(/if \(item\.href === "\/lessons"\) return visualTrack === "GENERAL_DEBATE";/.test(shell),
      "H4. and it is Debate-gated, so DECA and HOSA navigation is unchanged");
    assert.ok(/"\/lessons"\]/.test(shell) || /"\/lessons",/.test(shell), "H5. the entry is track-aware");
  });

  // ---- I-J. COMPETE -> LEARN ---------------------------------------------------------------------
  check("I. the post-round action never builds an unsupported /skills/<slug>/practice URL", () => {
    const arena = stripComments(read("components/debate/debate-arena.tsx"));
    assert.ok(!/\/skills\/\$\{[^}]*lessonSlug[^}]*\}\/practice/.test(arena),
      "I. no writing-practice URL is built from a judge slug");
    assert.ok(!/\/skills\/\$\{[^}]*lessonSlug/.test(arena),
      "I2. and no /skills destination is built from one at all");
    assert.ok(/debateDiagnosisLesson\(/.test(arena), "I3. destinations come from the shared resolver");
    // The resolver is the only thing that decides, and it is pure — no session, no database.
    const resolver = stripComments(read("lib/education/diagnosis.ts"));
    for (const banned of ["prisma", "@prisma/client", "fetch(", "getServerSession", "process.env"]) {
      assert.ok(!resolver.includes(banned), `I4. the resolver stays pure (${banned})`);
    }
  });

  check("J. every slug the judge can emit resolves to a published lesson", () => {
    const emitted = judgeEmittedSlugs();
    const rows = emitted.map((slug) => ({ slug, destination: debateDiagnosisLesson(slug) }));
    for (const { slug, destination } of rows) {
      assert.ok(destination, `J. "${slug}" resolves to a canonical lesson`);
      const entry = EDUCATION_REGISTRY.lessons.find((e: { id: string }) => e.id === destination!.lessonId);
      assert.ok(entry, `J2. "${slug}" -> ${destination!.lessonId} is registered`);
      assert.equal(entry.visibility, "learner", `J3. and learner-visible`);
      assert.equal(destination!.href, `/lessons/${destination!.lessonId}`, "J4. as a /lessons route");
    }
    assert.equal(rows.filter((r) => r.destination === null).length, 0, "J5. zero unresolvable diagnoses");
    // FAIL CLOSED: a slug with no proven destination must resolve to nothing, never to a guess.
    for (const bad of ["", "   ", "not-a-slug", "debate-rebuttal-speeches"]) {
      assert.equal(debateDiagnosisLesson(bad), null, `J6. "${bad}" resolves to nothing`);
    }
    // The registry the resolver reads is itself valid, including the alias this milestone added.
    assert.deepEqual(validateEducationRegistry(EDUCATION_REGISTRY), [], "J7. the registry validates clean");
  });

  // ---- K. no duplicate Home action ---------------------------------------------------------------
  check("K. Home's focused-practice action and Debate Now do not share a destination", () => {
    const home = stripComments(read("app/(app)/home/page.tsx"));
    assert.ok(/const practiceHref = isDebateTrack \? `\/study-arcade\?track=\$\{trackSlug\}`/.test(home),
      "K. the Debate focused rep is a scored drill, which is what it claims to be");
    assert.ok(!/const practiceHref = activeTrack\?\.id === "GENERAL_DEBATE" \? `\/debate/.test(home),
      "K2. and no longer resolves to the full round");
    // The two actions are declared with different destinations.
    const debateNow = /href: `\/debate\?track=\$\{trackSlug\}`, label: "Debate Now"/.test(home);
    assert.ok(debateNow, "K3. control: Debate Now still opens the round");
    assert.ok(/href: practiceHref/.test(home), "K4. and the practice action uses its own href");
    // Non-Debate tracks keep their own setup route.
    assert.ok(/`\/training\/\$\{trackSlug\}\/practice`/.test(home), "K5. other tracks are unchanged");
  });

  // ---- L-M. no stale category survives on any Debate journey surface ------------------------------
  check("L. no Debate journey surface still presents Practice or Apply as a category", () => {
    // The learner-visible strings, not identifiers. `practiceDrill`, `practiceHref` and the DECA/HOSA
    // stages are all legitimate; a Debate STAGE LABEL is not.
    const railText = visible(render(React.createElement(LearnerPathRail,
      { stages: debate, label: "Debate learner path" } as never)));
    assert.ok(!/\bApply\b/.test(railText), "L. the Debate rail names no Apply stage");
    assert.ok(!/\bPractice\b/.test(railText), "L2. and no Practice stage");
    // The shared practice route no longer renders a Debate surface calling itself practice.
    const practiceRoute = read("app/(app)/training/[track]/practice/page.tsx");
    assert.ok(/if \(track\.id === "GENERAL_DEBATE"\) \{\s*redirect\("\/debate\?track=debate"\);/.test(practiceRoute),
      "L3. the Debate branch of the shared practice route redirects to Compete");
    assert.ok(!/Debate practice/.test(stripComments(practiceRoute)), "L4. and renders no 'Debate practice' heading");
    // Non-vacuity, and the actual reason the route survives: DECA and HOSA still render there.
    for (const kept of ["DecaRoleplaySetup", "HosaEventPrep"]) {
      assert.ok(practiceRoute.includes(kept), `L5. control: ${kept} still renders on the shared route`);
    }
    // MODEL UN IS RESIDUE, NOT SUPPORT. It is retired, and the retirement redirect fires before every
    // branch below it, so its `MunConference` branch cannot be reached. Asserted as residue on
    // purpose: an earlier draft of this control listed it beside DECA and HOSA as a surface that
    // "still renders", which would have made a retired track evidence for keeping a route alive.
    assert.ok(RETIRED_TRACKS.includes("MODEL_UN"), "L6. Model UN is a retired track");
    // Anchored to the BRANCH, not to the import. `MunConference` is imported at the top of the file,
    // above everything, so an indexOf on the identifier compares against the wrong line and reports a
    // failure that is not real — which is exactly what it did on the first run of this control.
    const retireAt = practiceRoute.indexOf("isTrackRetired(track.id)");
    const munBranchAt = practiceRoute.indexOf('track.id === "MODEL_UN"');
    assert.ok(retireAt > 0 && munBranchAt > 0, "L7a. control: both anchors are present");
    assert.ok(munBranchAt > retireAt,
      "L7. and the retirement redirect precedes its branch, so that branch is unreachable residue");
    assert.deepEqual(learnerPathForTrack("MODEL_UN"), [], "L8. Model UN has no learner journey at all");
  });

  check("M. Event HQ leads with Learn, and the Debate skills page is named as an action", () => {
    const hq = read("app/(app)/training/[track]/event/[eventSlug]/page.tsx");
    const debateBlock = hq.slice(hq.indexOf('specEvent: "Public Forum Debate"'), hq.indexOf("const SECTION_ICONS"));
    const order = ["Lessons", "Skill drills", "Full rounds"].map((label) => debateBlock.indexOf(`label: "${label}"`));
    for (const i of order) assert.ok(i > 0, "M. control: all three Debate sections are present");
    assert.ok(order[0] < order[1] && order[1] < order[2],
      "M2. Learn leads, drills support it, the round comes last");
    // The drill index is named as something a learner DOES, not as a product stage.
    const skills = read("app/(app)/skills/page.tsx");
    assert.ok(!/isDebate \? "Practice a debate skill"/.test(skills), "M3. no 'Practice a debate skill' heading");
    assert.ok(/isDebate \? "Drill a debate skill"/.test(skills), "M4. it is an action");
    assert.ok(!/isDebate \? "Practice" :/.test(skills), "M5. and the Debate badge is not the category name");
  });

  // ---- N. the Learn page keeps lessons primary and practice secondary --------------------------
  check("N. Learn leads with lessons; drills and review are secondary and come last", () => {
    const index = read("app/(app)/lessons/page.tsx");
    const lessonAction = index.indexOf("Start lesson");
    const supportBlock = index.indexOf("After a lesson");
    assert.ok(lessonAction > 0, "N. control: the lesson action exists");
    assert.ok(supportBlock > lessonAction,
      "N2. the practice block is authored AFTER the lesson list, not above it");
    // Learn must REACH the capabilities that used to be their own stage.
    assert.ok(/\/study-arcade\?track=debate/.test(index), "N3. Learn reaches targeted drills");
    assert.ok(/\/study-arcade\/review/.test(index), "N4. Learn reaches due reviews");
    // But it must not become a drill catalog. One support block, Debate-gated, and no drill cards.
    assert.equal((index.match(/After a lesson/g) ?? []).length, 1, "N5. exactly one support block");
    assert.ok(/activeTrack\?\.id === "GENERAL_DEBATE" && cards\.length > 0/.test(index),
      "N6. it is Debate-scoped and never replaces an empty catalog");
    assert.ok(!/DebateDrills|ConceptDrills|DRILL_AREAS/.test(index),
      "N7. the Learn page renders no drill runner — it links, it does not become Study Arcade");
    // And it stays honest about what it cannot know: no count, no due badge, no persistence import.
    const code = stripComments(index);
    for (const banned of ["@/lib/spaced-review", "countDueReviews", "getDueReviews", "@/lib/prisma", "getServerSession"]) {
      assert.ok(!code.includes(banned), `N8. the Learn catalog reads no learner state (${banned})`);
    }
  });

  console.log(`\nlearn-compete: ${checks} controls passed.`);
  console.log("  Debate journey: 1 Learn -> 2 Compete. Practice and Apply removed as categories;");
  console.log("  drills, review, remediation and the writing route all still reachable underneath Learn.");
  const rows = judgeEmittedSlugs().map((s) => `${s} -> ${debateDiagnosisLesson(s)?.lessonId ?? "UNRESOLVED"}`);
  console.log(`  Judge diagnoses (${rows.length}/${rows.length} resolve): ${rows.join("; ")}`);
}

main();
