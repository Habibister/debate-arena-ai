/**
 * Debate training UX — Learn / Practice / Tests boundary truth.
 *
 * This suite exists because the boundary it protects is learner-facing capability truth, and the
 * main compatibility suite that would otherwise carry it (`skills-compat:smoke`) is ENV-TAINTED: its
 * transitive closure loads the generated Prisma client, which reads `.env` at import time. A milestone
 * whose only proof lives in a suite that cannot be run under a no-env guard has no durable proof, so
 * the invariants live here instead.
 *
 * STRICT-SAFE BY CONSTRUCTION. Everything imported below is a pure module: no Prisma, no network, no
 * environment, no filesystem beyond reading source files in this repository, no React render. Keep it
 * that way — if this suite ever needs a database, the invariant belongs somewhere else, not here.
 *
 * Pure-function assertions are preferred throughout. Source assertions are used ONLY where the
 * property lives in a component or page with no exported boundary to call.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { trackHasPracticeTests } from "../lib/training-tracks";
import { learnerPathForTrack, isActionableStage } from "../lib/learner-path";
import { nextStepsForTrack } from "../lib/dashboard-actions";
import { trackById } from "../lib/training-tracks";
import { educationLessonsForTrack, getEducationLesson } from "../lib/education/registry";
import { HELD_DEBATE_CATALOG_SLUGS } from "../lib/education/tracks/debate";
import {
  debateWritingAllowed,
  debateWritingPracticeSupported,
  resolveSkillsSlug
} from "../lib/education/skills-compat";
import { DEBATE_WRITING_SCENARIO_SLUGS, hasDebateWritingScenario } from "../lib/debate-skill-practice";
import { LEARNING_SKILL_CATALOG } from "../lib/learning-content";

const ROOT = join(__dirname, "..");
const read = (relative: string) => readFileSync(join(ROOT, relative), "utf8");

/**
 * Source with comments removed, for assertions about LEARNER-VISIBLE copy.
 *
 * Needed because a comment that explains which wording was removed necessarily contains that wording.
 * Scanning raw source would make every such explanation a failure, which would push future authors
 * toward deleting the reasoning rather than the claim.
 */
const readCopy = (relative: string) =>
  read(relative).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

let checks = 0;
function check(label: string, run: () => void) {
  run();
  checks += 1;
  console.log(`  ok  ${label}`);
}

console.log("Debate training UX — capability and boundary truth\n");

// ---- A-C. the single capability statement -------------------------------------------------------
// Every surface that could route a learner to /tests asks this one question. A second copy of the
// answer is how the navigation and the page disagreed in the first place.
check("A. General Debate has no practice-test product", () => {
  assert.equal(trackHasPracticeTests("GENERAL_DEBATE"), false);
});
check("B. DECA keeps its practice tests", () => {
  assert.equal(trackHasPracticeTests("DECA"), true);
});
check("C. HOSA keeps its practice tests", () => {
  assert.equal(trackHasPracticeTests("HOSA"), true);
});
check("C2. an unresolved track still browses broadly, exactly as it did before", () => {
  assert.equal(trackHasPracticeTests(undefined), true);
  assert.equal(trackHasPracticeTests(null), true);
});

// ---- D-E. the learner path ----------------------------------------------------------------------
check("D. the Debate learner path exposes no /tests destination", () => {
  const debate = learnerPathForTrack("GENERAL_DEBATE");
  assert.ok(debate.length > 0, "control: the Debate path is not empty");
  assert.ok(debate.every((stage) => !(stage.href ?? "").startsWith("/tests")));
  const apply = debate.find((stage) => stage.id === "apply");
  assert.ok(apply, "control: the Debate path still has an Apply stage");
  // Not actionable, and not a link — a stage with no destination must never be clickable.
  assert.equal(apply!.href, undefined);
  assert.equal(isActionableStage(apply!), false);
  // The note describes NAVIGATION availability. Apply is not a synonym for practice tests, so the
  // wording must not define it as one.
  assert.ok(!/test/i.test(apply!.note ?? ""), `Apply note must not mention tests — got: ${apply!.note}`);
});
check("D2. Debate Practice points at the drill layer, never at the lesson index", () => {
  const practice = learnerPathForTrack("GENERAL_DEBATE").find((stage) => stage.id === "practice");
  assert.equal(practice?.href, "/study-arcade?track=debate");
});
check("E. DECA and HOSA keep their own paths and their test cards", () => {
  for (const track of ["DECA", "HOSA"] as const) {
    assert.ok(learnerPathForTrack(track).length > 0, `control: ${track} has a path`);
    assert.ok(
      nextStepsForTrack(trackById(track)).some((action) => action.key === "tests"),
      `${track} still offers a practice-test next step`
    );
  }
  const debate = nextStepsForTrack(trackById("GENERAL_DEBATE"));
  assert.ok(debate.length > 0, "control: Debate still has next steps");
  assert.ok(!debate.some((action) => action.key === "tests"));
  assert.ok(!debate.some((action) => action.href.startsWith("/tests")));
  // Browse-all is unchanged: with no selected track the learner sees the full generic set.
  assert.ok(nextStepsForTrack(null).some((action) => action.key === "tests"));
});

// ---- F. one filtered set feeds both navigation surfaces -----------------------------------------
// Structural, not visual: desktop and mobile cannot drift while mobile derives from the same array
// the desktop sidebar renders. Asserted on source because the shell is a client component with no
// exported boundary to call.
check("F. desktop and mobile Tests navigation derive from one filtered capability set", () => {
  const shell = read("components/app/app-shell.tsx");
  assert.ok(/capabilityAllows/.test(shell), "the shell gates navigation by capability at all");
  assert.ok(
    /trackHasPracticeTests\(/.test(shell),
    "and it asks the shared capability statement rather than testing a track id inline"
  );
  assert.ok(
    /const visibleMore = moreItems\.filter\([\s\S]{0,80}?roleAllows\([^)]*\) && capabilityAllows\(item\)/.test(shell),
    "the capability filter is applied where visibleMore is built"
  );
  assert.ok(
    /mobileMoreItems = \[[\s\S]{0,400}?\.\.\.visibleMore/.test(shell),
    "mobile More spreads that SAME filtered list — no desktop/mobile capability drift"
  );
  assert.ok(!/BOTTOM_BAR_HREFS[\s\S]{0,400}\/tests/.test(shell), "Tests is not in the mobile bottom bar");
});

// ---- G-I. Learn owns teaching, Practice owns repetition -----------------------------------------
check("G. Debate Practice does not render the published lesson catalog as practice", () => {
  const skillPath = read("components/skills/skill-path.tsx");
  // The defect: every learner-visible Debate lesson was tiled here with CTA "Open lesson", so the
  // Practice destination was a second copy of the Learn catalog under a drills promise.
  assert.ok(!/cta: "Open lesson"/.test(skillPath), "no tile opens a lesson as though it were practice");
  assert.ok(
    !/educationLessonsForTrack/.test(skillPath),
    "and the component no longer reads the lesson registry at all"
  );
  assert.ok(
    /study-arcade\?track=debate/.test(skillPath) && /study-arcade\/review/.test(skillPath),
    "it names the real drill and review destinations instead"
  );
});
check("H. lesson-local questions are Knowledge checks, never Practice", () => {
  const lessons = read("app/(app)/lessons/page.tsx");
  assert.ok(!/label: "Practice"/.test(lessons), '"Practice" is the drill system\'s name, not a lesson label');
  assert.equal(
    (lessons.match(/label: "Knowledge checks"/g) ?? []).length,
    2,
    "both lesson sources on this page use the same term"
  );
});
check("I. skill drills are stated as a separate destination from the lesson's own questions", () => {
  const lessons = read("app/(app)/lessons/page.tsx");
  assert.equal(
    (lessons.match(/label: "Skill drills"/g) ?? []).length,
    2,
    "both lesson sources still state the separate drill set"
  );
  assert.equal(
    (lessons.match(/value: "Available separately"/g) ?? []).length,
    2,
    "and state it as separately available, in words rather than by styling"
  );
  // The destination is named, not gestured at.
  assert.ok(/Study Arcade/.test(lessons), "the drill set names where it lives");
});

// ---- J. held lessons stay out of every learner-visible surface -----------------------------------
check("J. all four held Debate lessons are absent from the learner-visible registry", () => {
  assert.equal(HELD_DEBATE_CATALOG_SLUGS.length, 4, "control: four lessons are held");
  const visible = educationLessonsForTrack("GENERAL_DEBATE").filter((entry) => entry.visibility === "learner");
  assert.ok(visible.length > 0, "control: Debate does publish lessons");
  for (const slug of HELD_DEBATE_CATALOG_SLUGS) {
    assert.ok(!visible.some((entry) => entry.id === slug), `${slug} must not be learner-visible`);
    assert.equal(getEducationLesson(slug), undefined, `${slug} must not be in the registry at all`);
    // It is still AUTHORED — held is not deleted, and a future rebuild targets this same object.
    assert.ok(
      LEARNING_SKILL_CATALOG.some((entry) => entry.slug === slug && entry.track === "DEBATE"),
      `${slug} is still an authored Debate catalog entry`
    );
  }
});
check("J2. the lesson index and the lesson page both fail closed on visibility", () => {
  assert.ok(/visibility === "learner"/.test(read("app/(app)/lessons/page.tsx")));
  assert.ok(/entry\.visibility !== "learner"/.test(read("app/(app)/lessons/[slug]/page.tsx")));
});

// ---- K. the held writing-practice hazard, proved shut ---------------------------------------------
// Every held slug carries a writing scenario. Before the publication gate, the ONLY thing keeping
// `/skills/<held-slug>/practice` from serving one was that `resolveSkillsSlug` happened to return
// `unknown` for it — an accident that seeding a skill, adding an alias, or extending the redirect
// allowlist would each have quietly undone.
check("K. held lesson-backed writing scenarios exist, so the hazard is real and not hypothetical", () => {
  for (const slug of HELD_DEBATE_CATALOG_SLUGS) {
    assert.equal(hasDebateWritingScenario(slug), true, `${slug} really does carry a writing scenario`);
  }
});
check("K2. held slugs are unsupported TODAY", () => {
  for (const slug of HELD_DEBATE_CATALOG_SLUGS) {
    assert.equal(debateWritingPracticeSupported(slug), false, `${slug} must not serve writing practice`);
  }
});
check("K3. adversarial: they stay unsupported even if their compatibility resolution succeeds", () => {
  // `debateWritingAllowed` is the exact expression BOTH compatibility branches use. Calling it with
  // the track forced to "DEBATE" is the dangerous future — a held slug that now resolves — evaluated
  // without seeding anything, touching a database, or mutating state.
  for (const slug of HELD_DEBATE_CATALOG_SLUGS) {
    assert.equal(
      debateWritingAllowed("DEBATE", slug),
      false,
      `${slug} must remain unsupported even when resolution succeeds — publication is the gate`
    );
  }
  // Non-vacuity for the simulation itself: the same call returns true for a slug that is allowed,
  // so K3 is not passing merely because this function always says false.
  assert.equal(debateWritingAllowed("DEBATE", "debate-weighing-2"), true);
});
check("K4. the gate keys off publication, not off the held list being maintained", () => {
  const compat = read("lib/education/skills-compat.ts");
  assert.ok(/isUnpublishedAuthoredDebateLesson/.test(compat), "there is an explicit publication check");
  assert.ok(
    /visibility !== "learner"/.test(compat),
    "and it decides on learner-visibility, so an authored lesson nobody added to the held list is still covered"
  );
  assert.ok(
    !/debatePracticeSupported: \w+\.track === "DEBATE" && hasDebateWritingScenario/.test(compat),
    "neither compatibility branch decides support without the publication check"
  );
});

// ---- L. non-vacuity: legitimate writing practice still works --------------------------------------
// A guard that disables everything is not a pass.
check("L. skill-only writing practice is untouched by the publication gate", () => {
  const heldSet = new Set<string>(HELD_DEBATE_CATALOG_SLUGS);
  const catalogSlugs = new Set(
    LEARNING_SKILL_CATALOG.filter((entry) => entry.track === "DEBATE").map((entry) => entry.slug)
  );
  const supported = DEBATE_WRITING_SCENARIO_SLUGS.filter((slug) => debateWritingPracticeSupported(slug));
  assert.ok(supported.length > 0, "at least one Debate writing scenario is still served");
  for (const slug of supported) {
    // Anything still supported must be a skill-only slug: not held, and not an authored Debate lesson.
    assert.ok(!heldSet.has(slug), `${slug} is held and must not be supported`);
    assert.ok(!catalogSlugs.has(slug), `${slug} is an authored Debate lesson and must not be supported here`);
    assert.equal(resolveSkillsSlug(slug).kind, "compatibility", `${slug} resolves as a compatibility record`);
  }
  console.log(`      (${supported.length} skill-only writing scenarios still supported)`);
});

// ---- M. no generic copy promises a Debate learner a test -------------------------------------------
check("M. shared learner-facing copy does not promise generated practice tests", () => {
  const claims = [/generated practice tests/i, /graded tests/i];
  for (const file of [
    "app/(app)/dashboard/page.tsx",
    "components/app/xp-progress-card.tsx",
    "app/(app)/training/page.tsx"
  ]) {
    const source = readCopy(file);
    for (const claim of claims) {
      assert.ok(!claim.test(source), `${file} still carries ${claim} in track-agnostic copy`);
    }
  }
  // The track chooser must not enumerate a fixed tool list every track is assumed to have.
  assert.ok(!/decks, tests, and games/.test(readCopy("app/(app)/training/page.tsx")));
  // Event HQ's "Your common mistakes" fills from graded practice tests and nothing else, so on a
  // track without that product it is a card that can never fill, under a promise that it will.
  const eventHq = read("app/(app)/training/[track]/event/[eventSlug]/page.tsx");
  assert.ok(
    /const showWeakAreas = trackHasPracticeTests\(track\.id\)/.test(eventHq),
    "the weak-areas card is gated on the shared capability statement"
  );
  assert.ok(/\{showWeakAreas \? \(/.test(eventHq), "and that gate actually wraps the card");
  // Non-vacuity: the stripper must not be blanking the file it is asked to scan.
  assert.ok(/Earn XP from/.test(readCopy("app/(app)/dashboard/page.tsx")), "control: copy survives comment stripping");
  assert.ok(
    /generated practice tests/i.test(read("app/(app)/dashboard/page.tsx")),
    "control: the phrase IS still present in a comment, so this scan is really excluding comments"
  );
});

// ---- N. no Debate test product was introduced -------------------------------------------------------
check("N. no Debate test generator or product exists", () => {
  const testsPage = read("app/(app)/tests/page.tsx");
  // The generator is still locked to the two organizations that have one.
  assert.ok(
    /activeTrack\?\.id === "DECA" \? "DECA" : activeTrack\?\.id === "HOSA" \? "HOSA" : undefined/.test(testsPage),
    "the generator still locks to DECA or HOSA only"
  );
  // A track without a test product is routed to its own practice, never shown an empty Debate test.
  assert.ok(
    /if \(!isAssignment && activeTrack && !trackHasPracticeTests\(activeTrack\.id\)\) \{\s*redirect\(/.test(testsPage),
    "a track with no test product is redirected off /tests"
  );
  assert.ok(!/No practice tests for/.test(testsPage), "and is not shown an almost-a-feature empty state");
  // An assigned test must never be redirected away from.
  assert.ok(/const isAssignment = Boolean\(searchParams\.assignmentId\)/.test(testsPage));
  // Nothing anywhere builds a Debate test.
  const drills = read("lib/debate-drills.ts");
  assert.ok(!/practiceTest|PracticeTest/.test(drills), "the Debate drill bank is not wired to a test product");
});

console.log(`\ndebate-training-ux: ${checks} controls passed.`);
