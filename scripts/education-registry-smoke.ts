import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
// THE PRODUCTION MODULES — never a mirrored copy of their logic.
import {
  EDUCATION_COURSES,
  EDUCATION_LESSONS,
  EDUCATION_MODULES,
  EDUCATION_REGISTRY,
  educationLessonsForTrack,
  getEducationCourse,
  getEducationLesson,
  getEducationModule
} from "../lib/education/registry";
import { EDUCATION_SLUG_ALIASES } from "../lib/education/slug-map";
// M13E1C: the compatibility-alias rule needs the seeded manifest to validate its target.
import { SEEDED_LESSON_SLUGS, SEEDED_SKILL_SLUGS } from "../lib/education/skills-compat";
import {
  EDUCATION_GENERIC_FILLER_SIGNATURES,
  assertEducationRegistryValid,
  validateEducationRegistry
} from "../lib/education/validate";
import type {
  EducationIssueCode,
  EducationRegistryEntry,
  EducationRegistryInput,
  EducationValidationIssue
} from "../lib/education/types";

import { LEARNING_SKILL_CATALOG } from "../lib/learning-content";
import { getLesson } from "../lib/lessons";
import { getRoleplayLesson } from "../lib/roleplay-lessons";
import { presentSourceFreshness } from "../lib/source-freshness";

/**
 * The legacy half of the entry union. Fixtures are built from this concrete member rather than the
 * union, so a spread keeps a narrow `sourceKind` and stays assignable — and so a control that means
 * to break ONE field cannot accidentally change which union member it is.
 */
type LegacyFixtureEntry = Extract<EducationRegistryEntry, { sourceKind: "authored-lesson" | "roleplay-lesson" }>;

// ---- helpers ------------------------------------------------------------------------------------

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "")).join("\n");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === ".git") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

function codes(issues: EducationValidationIssue[]): EducationIssueCode[] {
  return issues.map((issue) => issue.code);
}

/**
 * Builds a deliberately MALFORMED fixture.
 *
 * The validator's whole purpose is to survive registry data that does not satisfy the type — a
 * hand-edited entry, a future authored file, anything that reaches it after a refactor. Two of the
 * controls below can only express that (an absent `authority`, a track outside the union), so this
 * single documented assertion is the one place the fixture leaves the type. It is never used on the
 * real registry.
 */
function malformed(base: LegacyFixtureEntry, patch: Record<string, unknown>): EducationRegistryEntry {
  return { ...base, ...patch } as EducationRegistryEntry;
}

/** The narrow base entry, so controls never have to re-narrow `input.lessons[0]`. */
function baseEntry(input: EducationRegistryInput): LegacyFixtureEntry {
  const entry = input.lessons[0];
  if (entry.sourceKind === "concept-education-lesson") throw new Error("base fixture must be a legacy entry");
  return entry;
}

/** A minimal registry that MUST validate cleanly, so every control's failure is attributable. */
function baseFixture(): EducationRegistryInput {
  const entry: LegacyFixtureEntry = {
    id: "l1",
    track: "GENERAL_DEBATE",
    courseId: "c1",
    moduleId: "m1",
    variant: "concept",
    visibility: "learner",
    practiceState: "available",
    source: { practice: { intro: "authored", questionCount: 6 } },
    sourceKind: "authored-lesson",
    skillSlug: "s1",
    legacySlugs: [],
    nextLessonId: null,
    provenance: { authority: "tier-2", freshness: "stable", organization: "CompeteReady", sourceLabel: "Fixture" },
    maximumRung: 4
  };
  return {
    courses: [{ id: "c1", track: "GENERAL_DEBATE", label: "C1", moduleIds: ["m1"], maxRung: 4 }],
    modules: [{ id: "m1", courseId: "c1", track: "GENERAL_DEBATE", label: "M1", outcome: "Outcome.", prerequisiteId: null }],
    lessons: [entry],
    aliases: []
  };
}

/** Every control runs through here, so a control can never "pass" by throwing something unrelated. */
const controlsRun: string[] = [];
function control(label: string, expected: EducationIssueCode, build: (base: EducationRegistryInput) => EducationRegistryInput) {
  const base = baseFixture();
  assert.deepEqual(validateEducationRegistry(base), [], `control "${label}": the base fixture must start valid`);
  const broken = build(base);
  const issues = validateEducationRegistry(broken);
  assert.ok(
    codes(issues).includes(expected),
    `control "${label}" must produce ${expected}; got [${codes(issues).join(", ") || "none"}]`
  );
  controlsRun.push(`${label} -> ${expected}`);
}

function main() {
  // ================================================================================================
  // PART A — the real registry
  // ================================================================================================

  // ---- 1-2. exact lesson inventory, each id present exactly once --------------------------------
  // B2.1 raised this 10 -> 11; B2.2 (2026-08-25) raised it 11 -> 12: the newly authored
  // debate-turn-mechanics lesson.
  // P1-B1 raised this 12 -> 13 (Understanding Performance Indicators); P1-B2 raised it 13 -> 14
  // (Justifying Your Recommendation, the business-reasoning owner).
  // P1-B3 raised it 14 -> 15: the first DECA cluster-knowledge lesson.
  // P1-B4 raised it 15 -> 21: the six approved Marketing Fundamentals lessons, MK1-MK6.
  assert.equal(EDUCATION_LESSONS.length, 23, "1. the registry contains exactly twenty-three lessons");
  const expectedIds = ["claim-warrant-impact", "how-deca-roleplay-works", "how-hosa-scenario-interaction-works",
                       "debate-signposting", "debate-clash", "debate-refutation", "debate-constructive-speeches",
                       "debate-weighing", "debate-round-orientation", "debate-evidence-evaluation",
                       "debate-answer-types", "debate-turn-mechanics",
                       "deca-reading-scenarios", "deca-identifying-problem",
                       "deca-understanding-performance-indicators", "deca-justifying-your-recommendation",
                       "deca-handling-customer-situations",
                       "deca-who-the-customer-is", "deca-why-they-choose-you", "deca-how-you-are-understood", "deca-the-offering-and-its-price", "deca-getting-it-to-the-customer", "deca-telling-them-about-it"];
  for (const id of expectedIds) {
    assert.equal(EDUCATION_LESSONS.filter((entry) => entry.id === id).length, 1, `2. "${id}" is registered exactly once`);
  }
  assert.deepEqual([...EDUCATION_LESSONS].map((entry) => entry.id).sort(), [...expectedIds].sort(), "2b. and no other lesson is registered");

  // ---- 2c. visibility tripwire (B2.1): every registered lesson is learner-visible ---------------
  // The learner surfaces gate on visibility === "learner" (lessons index, [slug] page, skill path).
  // Without this assertion a visibility flip to "internal" silently removed a lesson from every
  // learner path while all suites stayed green — proven by a B2.1 mutation test. Every entry in the
  // canonical registry is learner-facing by design; a future genuinely-internal entry must evolve
  // this assertion deliberately rather than slip through.
  for (const entry of EDUCATION_LESSONS) {
    assert.equal(entry.visibility, "learner", `2c. "${entry.id}" is learner-visible`);
  }

  // ---- 3. STRICT source-object identity (===), not a JSON comparison ----------------------------
  const cwi = getLesson("claim-warrant-impact");
  const deca = getRoleplayLesson("how-deca-roleplay-works");
  const hosa = getRoleplayLesson("how-hosa-scenario-interaction-works");
  assert.ok(cwi && deca && hosa, "3a. all three legacy lookups still resolve");
  const debateEntry = getEducationLesson("claim-warrant-impact");
  const decaEntry = getEducationLesson("how-deca-roleplay-works");
  const hosaEntry = getEducationLesson("how-hosa-scenario-interaction-works");
  assert.ok(debateEntry && decaEntry && hosaEntry, "3b. all three registry lookups resolve");
  assert.ok(debateEntry.source === cwi, "3c. the Debate entry's source IS the exported CWI object (strict identity)");
  assert.ok(decaEntry.source === deca, "3d. the DECA entry's source IS the exported DECA object (strict identity)");
  assert.ok(hosaEntry.source === hosa, "3e. the HOSA entry's source IS the exported HOSA object (strict identity)");
  // Non-vacuity: a structurally identical clone must FAIL the same check, so `===` is really tested.
  assert.ok(debateEntry.source !== JSON.parse(JSON.stringify(cwi)), "3f. control: a deep clone is not identity-equal");
  // Provenance is the same object too — never a rewritten copy.
  assert.ok(debateEntry.provenance === cwi.provenance, "3g. Debate provenance is the source object's own");
  assert.ok(decaEntry.provenance === deca.provenance, "3h. DECA provenance is the source object's own");
  assert.ok(hosaEntry.provenance === hosa.provenance, "3i. HOSA provenance is the source object's own");
  // M13E1B — the four migrated entries hold the ORIGINAL catalog objects, not copies.
  for (const [key, id] of [["signposting", "debate-signposting"], ["clash", "debate-clash"],
                           ["refutation", "debate-refutation"], ["constructiveSpeeches", "debate-constructive-speeches"],
                           ["weighing", "debate-weighing"],
                           ["orientation", "debate-round-orientation"],
                           ["evidenceEvaluation", "debate-evidence-evaluation"]] as const) {
    const entry = getEducationLesson(id);
    const original = LEARNING_SKILL_CATALOG.find((c) => c.slug === id);
    assert.ok(entry && original, `3j. "${id}" resolves in both the registry and the catalog`);
    assert.ok(entry.source === original, `3k. "${id}" source IS the catalog object (strict identity, via ${key})`);
    assert.ok(entry.source !== JSON.parse(JSON.stringify(original)), `3l. control: a clone of "${id}" is not identity-equal`);
  }

  // ---- 4. the Debate mastery skill slug is unchanged --------------------------------------------
  assert.equal(cwi.skillSlug, "debate-claim-building", "4a. the shipped lesson still names debate-claim-building");
  assert.equal(debateEntry.skillSlug, "debate-claim-building", "4b. and the registry entry carries the same slug");
  assert.equal(debateEntry.track, "GENERAL_DEBATE", "4c. on the General Debate track");
  assert.equal(debateEntry.variant, "concept", "4d. as a concept lesson");

  // ---- 5-6. DECA stays practice-available, and still records nothing ----------------------------
  assert.equal(decaEntry.practiceState, "available", "5a. DECA practice is available");
  assert.equal(deca.practiceStatus, "available", "5b. and the source object agrees");
  assert.equal(decaEntry.track, "DECA", "5c. on the DECA track");
  assert.ok(deca.practiceStatus === "available" && "practice" in deca, "5d. the DECA source carries its practice definition");
  assert.ok(
    deca.practiceStatus === "available" && deca.practice.intro.includes("nothing here is recorded"),
    "6. the DECA lesson still tells the learner nothing is recorded"
  );

  // ---- 7-8. HOSA stays withdrawn, with no interactive practice ----------------------------------
  assert.equal(hosaEntry.practiceState, "temporarily-unavailable", "7a. HOSA practice is temporarily unavailable");
  assert.equal(hosa.practiceStatus, "temporarily-unavailable", "7b. and the source object agrees");
  assert.equal(hosaEntry.track, "HOSA", "7c. on the HOSA track");
  assert.ok(!("practice" in hosa) || hosa.practice === undefined, "8a. the HOSA source defines no interactive practice");
  assert.ok(!("scenario" in hosa) || hosa.scenario === undefined, "8b. and no scenario");
  assert.ok(
    hosa.practiceStatus === "temporarily-unavailable" && typeof hosa.practiceUnavailable.message === "string",
    "8c. it carries an honest unavailable notice instead"
  );
  assert.equal(hosaEntry.maximumRung, 4, "8d. HOSA Branch B is capped below the Compete rung");
  assert.equal(getEducationCourse("hosa-clinical-skill-communication")?.maxRung, 4, "8e. and its course caps at the same rung");

  // ---- 9. provenance survives the production decision layer for all three -----------------------
  for (const entry of EDUCATION_LESSONS) {
    const presented = presentSourceFreshness(entry.provenance);
    assert.equal(presented.degraded, false, `9. "${entry.id}" provenance does not degrade`);
    assert.ok(presented.sourceLabel, `9b. "${entry.id}" names its source`);
  }

  // ---- 10. track filtering returns only the selected track --------------------------------------
  assert.deepEqual(educationLessonsForTrack("GENERAL_DEBATE").map((e) => e.id),
    ["debate-round-orientation", "claim-warrant-impact", "debate-evidence-evaluation", "debate-answer-types",
     "debate-turn-mechanics", "debate-signposting", "debate-clash", "debate-refutation",
     "debate-constructive-speeches", "debate-weighing"],
    "10a. Debate filter, in teaching order (B2.1 added answer-types; B2.2 added turn-mechanics)");
  // P1-B1: DECA now has an orientation lesson AND its first concept lesson, in registry order.
  assert.deepEqual(educationLessonsForTrack("DECA").map((e) => e.id),
    ["how-deca-roleplay-works", "deca-reading-scenarios", "deca-understanding-performance-indicators", "deca-identifying-problem", "deca-justifying-your-recommendation", "deca-handling-customer-situations",
     "deca-who-the-customer-is", "deca-why-they-choose-you", "deca-how-you-are-understood", "deca-the-offering-and-its-price", "deca-getting-it-to-the-customer", "deca-telling-them-about-it"], "10b. DECA filter");
  assert.deepEqual(educationLessonsForTrack("HOSA").map((e) => e.id), ["how-hosa-scenario-interaction-works"], "10c. HOSA filter");

  // ---- 11. unknown lookups fail closed ----------------------------------------------------------
  assert.equal(getEducationLesson("no-such-lesson"), undefined, "11a. unknown lesson id returns undefined");
  assert.equal(getEducationCourse("no-such-course"), undefined, "11b. unknown course id returns undefined");
  assert.equal(getEducationModule("no-such-module"), undefined, "11c. unknown module id returns undefined");
  assert.equal(getEducationLesson(""), undefined, "11d. an empty id resolves to nothing");

  // ---- 12. courses and modules resolve ----------------------------------------------------------
  // P1-B3 SUPERSEDES "one course per active track". DECA now has TWO courses, deliberately: the
  // role-play course teaches performing a round and its module outcomes say so, while cluster
  // knowledge is what the exam half tests. Forcing the customer-relations lesson into the role-play
  // course would have made that course's own outcomes false. The invariant that still matters is that
  // every course belongs to an active track and every track that has lessons has a course.
  assert.equal(EDUCATION_COURSES.length, 4, "12a. four courses — Debate, DECA role-play, DECA business content, HOSA");
  assert.deepEqual(EDUCATION_COURSES.filter((c) => c.track === "DECA").map((c) => c.id),
    ["deca-roleplay-core", "deca-business-content"], "12a2. and DECA's two are the performance and content courses");
  // P1-B1 added "deca-roleplay-skills": event orientation and skill teaching are different claims,
  // and folding the new lesson into the orientation module would have labelled its card that way.
  assert.equal(EDUCATION_MODULES.length, 8, "12b. eight modules (Debate three, DECA four, HOSA one)");
  for (const entry of EDUCATION_LESSONS) {
    const course = getEducationCourse(entry.courseId);
    const moduleEntry = getEducationModule(entry.moduleId);
    assert.ok(course, `12c. "${entry.id}" resolves its course`);
    assert.ok(moduleEntry, `12d. "${entry.id}" resolves its module`);
    assert.equal(course.track, entry.track, `12e. "${entry.id}" course track matches`);
    assert.equal(moduleEntry.track, entry.track, `12f. "${entry.id}" module track matches`);
    assert.ok(course.moduleIds.includes(entry.moduleId), `12g. "${entry.id}" module is listed by its course`);
  }

  // ---- 13-14. no prerequisite cycle, no unknown next lesson -------------------------------------
  const moduleIds = new Set(EDUCATION_MODULES.map((m) => m.id));
  for (const moduleEntry of EDUCATION_MODULES) {
    if (moduleEntry.prerequisiteId !== null) {
      assert.ok(moduleIds.has(moduleEntry.prerequisiteId), `13. module "${moduleEntry.id}" prerequisite resolves`);
    }
  }
  const lessonIds = new Set(EDUCATION_LESSONS.map((e) => e.id));
  for (const entry of EDUCATION_LESSONS) {
    if (entry.nextLessonId !== null) {
      assert.ok(lessonIds.has(entry.nextLessonId), `14. lesson "${entry.id}" next lesson resolves`);
    }
  }
  // P1-B1 raised this 3 -> 4. P1-B2 keeps it at 4 by CHAINING: the performance-indicators lesson now
  // points at the business-reasoning lesson, which terminates. Leaving PI terminal would have made
  // its own end-of-course line ("This is the last lesson written for this course so far") false the
  // moment a second DECA concept lesson shipped, which is the kind of quiet untruth these controls
  // exist to stop. The chain still ends honestly rather than pointing at a HELD lesson.
  // P1-B3 raised it 4 -> 5. The cluster-knowledge lesson is the only one in its own course, so it
  // terminates: chaining it to a role-play lesson would cross two courses that teach different things.
  // P1-B4 keeps it at 5: MK1-MK6 are a chain, so only its last link terminates.
  // Owner QA Repair 3A drops it to 5: the DECA orientation no longer ends a chain — it opens into the
  // published "Reading the Scenario", the same order the approved curriculum and the prep path use.
  assert.equal(EDUCATION_LESSONS.filter((e) => e.nextLessonId === null).length, 5,
    "14b. exactly five lessons end a chain");
  assert.deepEqual(EDUCATION_LESSONS.filter((e) => e.nextLessonId === null).map((e) => e.id).sort(),
    ["debate-weighing", "deca-handling-customer-situations", "deca-justifying-your-recommendation", "deca-telling-them-about-it", "how-hosa-scenario-interaction-works"],
    "14c. and they are exactly those five");
  assert.equal(EDUCATION_LESSONS.find((e) => e.id === "how-deca-roleplay-works")?.nextLessonId, "deca-reading-scenarios",
    "14c2. the DECA orientation continues into the published scenario lesson");
  // The marketing chain runs MK1 -> MK2 -> ... -> MK6 in the curriculum's own order.
  assert.deepEqual(["deca-who-the-customer-is", "deca-why-they-choose-you", "deca-how-you-are-understood", "deca-the-offering-and-its-price", "deca-getting-it-to-the-customer", "deca-telling-them-about-it"].map((id) => EDUCATION_LESSONS.find((e) => e.id === id)?.nextLessonId),
    ["deca-why-they-choose-you", "deca-how-you-are-understood", "deca-the-offering-and-its-price", "deca-getting-it-to-the-customer", "deca-telling-them-about-it", null], "14e. and the marketing lessons chain in order");
  // 14d. The DECA role-play chain, in the approved curriculum's own teaching order: read the card,
  // know what is being scored, work out what needs changing, then attach the reason. P1-B5 and P1-B6
  // inserted the two prerequisites; the business-reasoning owner still terminates the chain.
  assert.deepEqual(
    ["deca-reading-scenarios", "deca-understanding-performance-indicators", "deca-identifying-problem", "deca-justifying-your-recommendation"]
      .map((id) => EDUCATION_LESSONS.find((e) => e.id === id)?.nextLessonId),
    ["deca-understanding-performance-indicators", "deca-identifying-problem", "deca-justifying-your-recommendation", null],
    "14d. the DECA role-play chain runs scenario -> indicators -> problem -> business reasoning");

  // ---- 15. no generic seed-template filler anywhere in the registry ------------------------------
  const registryText = JSON.stringify(EDUCATION_LESSONS);
  for (const signature of EDUCATION_GENERIC_FILLER_SIGNATURES) {
    assert.ok(!registryText.includes(signature), `15. no registry lesson contains "${signature.slice(0, 40)}…"`);
  }
  // Non-vacuity: the real lessons DO use the words the blocklist must not be keyed on.
  assert.ok(/\bpractice\b/i.test(registryText) && /\bperformance\b/i.test(registryText),
    "15b. control: real authored text contains 'practice' and 'performance' and is still clean");

  // ---- 16-17. dependency direction is one-way ---------------------------------------------------
  const appFiles = walk("app");
  const componentFiles = walk("components");
  // M13E1B connected the canonical registry to the lessons surface, and to NOTHING else. The
  // allowlist is the contract: any other route or component importing it is a boundary breach.
  // M13E1C added the legacy /skills compatibility surface, which resolves through the registry.
  const ALLOWED_CONSUMERS = new Set([
    "app/(app)/lessons/page.tsx",
    "app/(app)/lessons/[slug]/page.tsx",
    "components/lessons/concept-education-lesson-view.tsx",
    "components/lessons/concept-education-lesson-practice.tsx",
    "app/(app)/skills/[slug]/page.tsx",
    "app/(app)/skills/[slug]/practice/page.tsx",
    "components/skills/skill-path.tsx",
    "app/(app)/study-arcade/review/page.tsx",
    // M15 S4 (Learn + Compete): the post-round DEBATE ARENA resolves a judge diagnosis to the canonical
    // lesson that teaches the weak concept. It is a deliberate addition to this allowlist, not drift.
    // The arena built `/skills/<judge slug>/practice`, a route that serves only a legacy compatibility
    // slug, so every canonical recommendation answered 404 at the exact moment a learner had been told
    // what to fix — the Compete-to-Learn return failing at its only step. It consumes the registry
    // through ONE pure resolver (`lib/education/diagnosis.ts`): read-only, no session, no database, and
    // fail-closed, so a slug with no published lesson behind it yields no destination at all.
    "components/debate/debate-arena.tsx",
    // M15 S6 (Coached performance): the SCAFFOLDED TRY component and the /debate setup page both read
    // the curriculum's guided declarations from lib/education/coaching — which lesson unlocks which
    // skills, and which starter categories may be shown. Pure data, read-only, recorded here on purpose.
    "components/coaching/scaffolded-try.tsx",
    "app/(app)/debate/page.tsx",
    // The arena page resolves `?guided=` against the same declarations, server-side and fail-closed.
    "app/(app)/debate/[debateId]/page.tsx",
    // M15 S6b (Guided judge): the JUDGE ROUTE resolves a guided lesson id to its rubric from the same
    // curriculum declarations (server-side, fail-closed — an unresolvable id is a 400, never a full
    // ballot) and projects the full judge result through lib/education/guided-judge, which is pure.
    // This is the write boundary of the coached model: a guided round may store only a curriculum-
    // limited ballot, and this consumer is where that limit is enforced. Recorded here on purpose.
    "app/api/debates/[debateId]/judge/route.ts",
    // The CREATE route validates a guided lesson id against the same declarations at creation and
    // marks the row (practiceMode LESSON + formatConfig.guidedLessonId, lib/guided-rounds.ts), so
    // guided-ness is a property of the stored round, decided server-side, never a later claim.
    "app/api/debates/route.ts",
    // The SIDE-COACH route resolves the same row marker against the same declarations, so a lesson
    // round is coached under its lesson's constraint even if the request does not say it is one.
    // P1-D (DECA simulation integration): the Learn -> Simulate connection. All three consume ONLY
    // lib/education/deca-simulation-prep, which is pure registry data resolved through the same
    // fail-closed helper the post-round diagnosis uses — a held or unregistered lesson is dropped,
    // never rendered as a link. None of them writes anything, and none reads mastery or progress:
    // the simulator's own state-write surface is unchanged by this phase.
    // ONE consumer, not three: the setup surface and the ballot render this panel rather than
    // importing the registry themselves, so the dependency stays a single edge.
    "components/training/deca-simulation-prep-panel.tsx",
    "app/api/ai/side-coach/route.ts",
    // QA-R2 #5/#6: the three surfaces that turn a graded test into learning. Each imports ONE pure
    // module — the grader the DECA bridge, home the DECA home-suggestion module (which reads the
    // bridge), the results page the per-track results module (lib/education/test-result-recommendations)
    // — and none reads mastery or writes progress.
    "app/(app)/tests/[testId]/results/page.tsx",
    "app/(app)/home/page.tsx",
    "app/api/tests/[testId]/grade/route.ts",
  ]);
  // The boundary that keeps that concession narrow: each may reach exactly ONE education module.
  // The grader reaches the DECA bridge. Home reaches the DECA home-suggestion module, which picks one
  // flagged diagnostic and takes its heading, sentence, lesson and drill from that diagnostic's bridge
  // route (final DECA QA, finding A: Home named one area and linked another's lesson). The results
  // page reaches the per-track results module instead, which is the only place a HOSA result is kept
  // out of the DECA bridge — a results page importing the bridge directly is how DECA copy and DECA
  // filtering reached HOSA results.
  const SINGLE_MODULE_CONSUMERS: Array<[string, string]> = [
    ["app/(app)/tests/[testId]/results/page.tsx", "test-result-recommendations"],
    ["app/(app)/home/page.tsx", "deca-home-suggestion"],
    ["app/api/tests/[testId]/grade/route.ts", "deca-diagnostic-bridge"]
  ];
  for (const [file, onlyModule] of SINGLE_MODULE_CONSUMERS) {
    const src = stripComments(readFileSync(file, "utf8"));
    const educationImports = (src.match(/from "@\/lib\/education\/[a-z-]+"/g) ?? []).map((hit) => hit.trim());
    assert.deepEqual(
      [...new Set(educationImports)],
      [`from "@/lib/education/${onlyModule}"`],
      `16b. ${file} consumes only lib/education/${onlyModule}`
    );
  }
  const consumers: string[] = [];
  for (const file of [...appFiles, ...componentFiles]) {
    const src = stripComments(readFileSync(file, "utf8"));
    if (!src.includes("lib/education")) continue;
    consumers.push(file);
    assert.ok(ALLOWED_CONSUMERS.has(file), `16. only the lessons surface may import the new registry (${file})`);
  }
  assert.deepEqual([...consumers].sort(), [...ALLOWED_CONSUMERS].sort(), "16a. and every allowed consumer really does import it");
  assert.ok(appFiles.length > 20 && componentFiles.length > 20, "16b. control: the scan really walked the route and component trees");
  // /skills consumes it only through the compatibility layer — never the raw lesson registry helpers
  // that the canonical lessons surface uses.
  for (const file of appFiles.filter((f) => f.includes("app/(app)/skills/"))) {
    const code = stripComments(readFileSync(file, "utf8"));
    assert.ok(!/from "@\/lib\/education\/(registry|tracks)/.test(code),
      `16c. /skills reaches the registry only through skills-compat (${file})`);
  }
  for (const legacy of ["lib/lessons.ts", "lib/roleplay-lessons.ts", "lib/learning-content.ts", "lib/source-freshness.ts"]) {
    assert.ok(!readFileSync(legacy, "utf8").includes("lib/education"), `17. ${legacy} does not import the new registry`);
  }
  // The new modules DO import the legacy ones — that is the permitted direction.
  assert.ok(readFileSync("lib/education/registry.ts", "utf8").includes('from "@/lib/lessons"'), "17b. the registry imports the legacy lesson module");
  assert.ok(readFileSync("lib/education/registry.ts", "utf8").includes('from "@/lib/roleplay-lessons"'), "17c. and the legacy role-play module");
  // No new `any`, no suppressions, no unsafe double cast in the four production files.
  // `diagnosis.ts` joins the list in M15 S4: it is imported by a CLIENT component (the debate arena),
  // so its purity is not a preference — a database or session reference there would ship to the browser.
  for (const file of ["lib/education/types.ts", "lib/education/slug-map.ts", "lib/education/registry.ts",
                      "lib/education/validate.ts", "lib/education/diagnosis.ts"]) {
    const src = stripComments(readFileSync(file, "utf8"));
    for (const banned of [": any", "<any>", "as any", "as unknown as", "@ts-ignore", "@ts-expect-error", "react", "next/", "@/lib/prisma", "process.env", "fetch("]) {
      assert.ok(!src.includes(banned), `17d. ${file} does not use ${banned}`);
    }
  }

  // ---- 18-20. slug map --------------------------------------------------------------------------
  // FIVE from M15 S4, not four. `debate-constructive-speeches-lesson` is emitted by the post-round
  // judge exactly like the other four and had no alias, so it resolved nowhere — a dead end in the
  // Compete-to-Learn return. Its canonical lesson is published and learner-visible, so the alias
  // redirects there. Recorded here deliberately: this list is the approval, and a sixth entry must
  // be argued for the same way rather than appearing.
  const approved = [
    "debate-claim-warrant-impact-lesson",
    "debate-refutation-lesson",
    "debate-weighing-lesson",
    "debate-signposting-lesson",
    "debate-constructive-speeches-lesson"
  ];
  assert.deepEqual([...EDUCATION_SLUG_ALIASES].map((a) => a.legacySlug).sort(), [...approved].sort(),
    "18. the slug map contains exactly the five approved historical slugs");
  const byLegacy = new Map(EDUCATION_SLUG_ALIASES.map((a) => [a.legacySlug, a]));
  const registeredSkills = new Set(EDUCATION_LESSONS.flatMap((e) => (e.skillSlug ? [e.skillSlug] : [])));
  const registeredIds = new Set(EDUCATION_LESSONS.map((e) => e.id));
  const resolves = (alias: { target: string; targetKind: string }) =>
    alias.targetKind === "skill" ? registeredSkills.has(alias.target) : registeredIds.has(alias.target);
  // The INVARIANT rather than a hardcoded list: an alias is active exactly when its target is
  // carried by a registered lesson. That keeps the map honest as lessons land, instead of freezing
  // a status that quietly stops being true.
  for (const alias of EDUCATION_SLUG_ALIASES) {
    if (alias.status === "active") {
      assert.ok(resolves(alias), `20a. active alias "${alias.legacySlug}" targets a registered ${alias.targetKind}`);
    } else if (alias.status === "planned") {
      assert.ok(!resolves(alias), `19a. planned alias "${alias.legacySlug}" resolves nothing yet — promote it when its target lands`);
    } else if (alias.status === "compatibility-active") {
      // Must NOT resolve canonically — that is what separates it from `active`. Its seeded target is
      // proven by scripts/skills-compat-smoke.ts, which owns the manifest.
      assert.ok(!resolves(alias), `19f. compatibility alias "${alias.legacySlug}" must not resolve canonically`);
    }
  }
  assert.equal(byLegacy.get("debate-claim-warrant-impact-lesson")?.target, "debate-claim-building", "20b. CWI alias targets the registered skill");
  // M13E1C: signposting's targetKind was corrected from `skill` to `lesson` — the M13E1A entry
  // guessed at a skill that never existed, and M13E1B published a LESSON with that id.
  assert.equal(byLegacy.get("debate-signposting-lesson")?.target, "debate-signposting", "19b. signposting targets the published lesson");
  assert.equal(byLegacy.get("debate-signposting-lesson")?.targetKind, "lesson", "19c. by lesson id, not a skill slug");
  assert.equal(byLegacy.get("debate-signposting-lesson")?.status, "active", "19d. and is therefore active");
  // Wave 1B published the corrected weighing lesson (id `debate-weighing`), so the last
  // compatibility-active alias flipped to active — the validator's ALIAS_COMPAT_SHADOWS_CANONICAL
  // rule forbids a compatibility status once the target resolves canonically.
  assert.equal(byLegacy.get("debate-weighing-lesson")?.status, "active",
    "19e. weighing is active — its corrected authored lesson is published");
  assert.ok(registeredSkills.has("debate-weighing"),
    "19e2. control: the weighing alias's target really is registered now");
  assert.ok(registeredSkills.has("debate-claim-building"), "20c. control: the CWI alias's target really is registered");
  // Non-vacuity: the invariant must reject a planned alias whose target is registered.
  assert.ok(resolves({ target: "debate-claim-building", targetKind: "skill" }), "20d. control: `resolves` really resolves a registered skill");
  assert.ok(!resolves({ target: "no-such-skill", targetKind: "skill" }), "20e. control: and really rejects an unregistered one");

  // ---- 21. the real registry validates cleanly --------------------------------------------------
  const realIssues = validateEducationRegistry({ ...EDUCATION_REGISTRY, seededSlugs: [...SEEDED_LESSON_SLUGS, ...SEEDED_SKILL_SLUGS] });
  assert.deepEqual(realIssues, [], `21. the real registry produces zero issues; got ${JSON.stringify(realIssues)}`);
  assertEducationRegistryValid({ ...EDUCATION_REGISTRY, seededSlugs: [...SEEDED_LESSON_SLUGS, ...SEEDED_SKILL_SLUGS] });

  // ================================================================================================
  // PART B — non-vacuous controls: every issue code has a fixture that provokes it
  // ================================================================================================

  control("duplicate lesson id", "DUPLICATE_LESSON_ID", (b) => ({
    ...b,
    lessons: [...b.lessons, { ...baseEntry(b), source: { practice: {} } }]
  }));
  control("duplicate course id", "DUPLICATE_COURSE_ID", (b) => ({ ...b, courses: [...b.courses, { ...b.courses[0] }] }));
  control("duplicate module id", "DUPLICATE_MODULE_ID", (b) => ({ ...b, modules: [...b.modules, { ...b.modules[0] }] }));
  control("unknown course", "UNKNOWN_COURSE", (b) => ({ ...b, lessons: [{ ...baseEntry(b), courseId: "ghost" }] }));
  control("unknown module", "UNKNOWN_MODULE", (b) => ({ ...b, lessons: [{ ...baseEntry(b), moduleId: "ghost" }] }));
  control("course/lesson track mismatch", "COURSE_TRACK_MISMATCH", (b) => ({ ...b, lessons: [{ ...baseEntry(b), track: "DECA" }] }));
  control("module/course track mismatch", "MODULE_TRACK_MISMATCH", (b) => ({ ...b, modules: [{ ...b.modules[0], track: "HOSA" }] }));
  control("unknown prerequisite", "UNKNOWN_PREREQUISITE", (b) => ({ ...b, modules: [{ ...b.modules[0], prerequisiteId: "ghost" }] }));
  control("prerequisite cycle", "PREREQUISITE_CYCLE", (b) => ({ ...b, modules: [{ ...b.modules[0], prerequisiteId: "m1" }] }));
  control("unknown next lesson", "UNKNOWN_NEXT_LESSON", (b) => ({ ...b, lessons: [{ ...baseEntry(b), nextLessonId: "ghost" }] }));
  control("next-lesson track mismatch", "NEXT_LESSON_TRACK_MISMATCH", (b) => ({
    ...b,
    courses: [...b.courses, { id: "c2", track: "DECA", label: "C2", moduleIds: ["m2"] }],
    modules: [...b.modules, { id: "m2", courseId: "c2", track: "DECA", label: "M2", outcome: "O2.", prerequisiteId: null }],
    lessons: [
      { ...baseEntry(b), nextLessonId: "l2" },
      { ...baseEntry(b), id: "l2", track: "DECA", courseId: "c2", moduleId: "m2", skillSlug: "s2", source: { practice: {} } }
    ]
  }));
  control("missing provenance", "MISSING_PROVENANCE", (b) => ({
    ...b,
    lessons: [malformed(baseEntry(b), { provenance: {} })]
  }));
  control("invalid learner-visible provenance", "INVALID_LEARNER_PROVENANCE", (b) => ({
    ...b,
    // "official" with no source label and no organization must degrade to unverified.
    lessons: [{ ...baseEntry(b), provenance: { authority: "official" } }]
  }));
  control("concept lesson without practice", "CONCEPT_WITHOUT_PRACTICE", (b) => ({
    ...b,
    lessons: [{ ...baseEntry(b), source: { intro: "no practice here" } }]
  }));
  control("available performance lesson without practice evidence", "AVAILABLE_WITHOUT_PRACTICE_EVIDENCE", (b) => ({
    ...b,
    lessons: [{ ...baseEntry(b), variant: "performance", source: { practiceStatus: "temporarily-unavailable" } }]
  }));
  control("unavailable lesson with interactive practice", "UNAVAILABLE_WITH_INTERACTIVE_PRACTICE", (b) => ({
    ...b,
    lessons: [{ ...baseEntry(b), variant: "performance", practiceState: "temporarily-unavailable", source: { practice: {} } }]
  }));
  control("rung above the course maximum", "MAX_RUNG_EXCEEDED", (b) => ({ ...b, lessons: [{ ...baseEntry(b), maximumRung: 5 }] }));
  control("duplicate skill slug in one module", "DUPLICATE_SKILL_SLUG", (b) => ({
    ...b,
    lessons: [baseEntry(b), { ...baseEntry(b), id: "l2", source: { practice: {} } }]
  }));
  control("generic seed-template filler", "GENERIC_FILLER_TEXT", (b) => ({
    ...b,
    lessons: [{
      ...baseEntry(b),
      source: { practice: {}, explanation: `Use signposting to strengthen debate ${EDUCATION_GENERIC_FILLER_SIGNATURES[0]}.` }
    }]
  }));
  control("unknown active alias target", "ALIAS_UNKNOWN_TARGET", (b) => ({
    ...b,
    aliases: [{ legacySlug: "old-slug", target: "ghost-skill", targetKind: "skill", status: "active", note: "fixture" }]
  }));
  control("alias registered twice", "ALIAS_COLLISION", (b) => ({
    ...b,
    aliases: [
      { legacySlug: "old-slug", target: "s1", targetKind: "skill", status: "active", note: "fixture" },
      { legacySlug: "old-slug", target: "s1", targetKind: "skill", status: "active", note: "fixture" }
    ]
  }));
  control("alias shadowing a canonical lesson id", "ALIAS_COLLISION", (b) => ({
    ...b,
    aliases: [{ legacySlug: "l1", target: "s1", targetKind: "skill", status: "active", note: "fixture" }]
  }));
  control("alias with conflicting targets", "ALIAS_CONFLICTING_TARGET", (b) => ({
    ...b,
    aliases: [
      { legacySlug: "old-slug", target: "s1", targetKind: "skill", status: "active", note: "fixture" },
      { legacySlug: "old-slug", target: "l1", targetKind: "lesson", status: "active", note: "fixture" }
    ]
  }));
  control("alias with an empty target", "ALIAS_EMPTY_TARGET", (b) => ({
    ...b,
    aliases: [{ legacySlug: "old-slug", target: "   ", targetKind: "skill", status: "active", note: "fixture" }]
  }));
  control("alias pointing at itself", "ALIAS_SELF_CYCLE", (b) => ({
    ...b,
    aliases: [{ legacySlug: "s1", target: "s1", targetKind: "skill", status: "active", note: "fixture" }]
  }));
  control("planned alias whose target now resolves", "ALIAS_PLANNED_RESOLVABLE", (b) => ({
    ...b,
    aliases: [{ legacySlug: "old-slug", target: "s1", targetKind: "skill", status: "planned", note: "fixture" }]
  }));
  control("empty module outcome", "EMPTY_METADATA", (b) => ({ ...b, modules: [{ ...b.modules[0], outcome: "   " }] }));
  control("empty course label", "EMPTY_METADATA", (b) => ({ ...b, courses: [{ ...b.courses[0], label: "" }] }));
  control("missing source object", "MISSING_SOURCE", (b) => ({ ...b, lessons: [{ ...baseEntry(b), source: null }] }));
  control("duplicate source-object registration", "DUPLICATE_SOURCE_OBJECT", (b) => {
    const shared = { practice: {} };
    return {
      ...b,
      lessons: [
        { ...baseEntry(b), source: shared },
        { ...baseEntry(b), id: "l2", skillSlug: "s2", source: shared }
      ]
    };
  });
  control("unsupported track", "UNSUPPORTED_TRACK", (b) => ({
    ...b,
    lessons: [malformed(baseEntry(b), { track: "MODEL_UN" })]
  }));

  // ---- M13E1B: controls for the migrated concept source kind ------------------------------------
  const goodQuestion = {
    prompt: "Q?", choices: ["a", "b"], correctAnswer: "a",
    hint: "h", explanation: "e", skillTag: "t"
  };
  function conceptSource(overrides: Record<string, unknown> = {}) {
    return {
      slug: "l1", organization: "DEBATE", track: "DEBATE", name: "N", description: "D", category: "C",
      lesson: {
        title: "T", slug: "l1-lesson", summary: "S", estimatedMinutes: 6,
        content: {
          objective: "O", explanation: "E", whyMatters: "W", steps: ["s1"],
          workedExample: { prompt: "p", weakAnswer: "w", strongAnswer: "st", whyItWorks: "y" },
          guidedQuestion: goodQuestion, practiceQuestions: [goodQuestion], masteryCheck: [goodQuestion],
          ...overrides
        }
      }
    };
  }
  function conceptFixture(base: EducationRegistryInput, source: unknown, patch: Record<string, unknown> = {}) {
    return { ...base, lessons: [malformed(baseEntry(base), { sourceKind: "concept-education-lesson", source, ...patch })] };
  }
  // The concept fixture itself must start VALID, so each control below is attributable.
  assert.deepEqual(validateEducationRegistry(conceptFixture(baseFixture(), conceptSource())), [],
    "M13E1B: the concept base fixture starts valid");

  control("concept source slug does not match the entry id", "CONCEPT_SOURCE_SLUG_MISMATCH", (b) => {
    const src = conceptSource();
    src.slug = "some-other-slug";
    return conceptFixture(b, src);
  });
  control("concept source missing its objective", "CONCEPT_SOURCE_INCOMPLETE", (b) =>
    conceptFixture(b, conceptSource({ objective: "   " })));
  control("concept source missing its steps", "CONCEPT_SOURCE_INCOMPLETE", (b) =>
    conceptFixture(b, conceptSource({ steps: [] })));
  control("concept question whose answer is not among its choices", "CONCEPT_QUESTION_INVALID", (b) =>
    conceptFixture(b, conceptSource({
      practiceQuestions: [{ ...goodQuestion, correctAnswer: "not-a-choice" }]
    })));
  control("concept question with only one choice", "CONCEPT_QUESTION_INVALID", (b) =>
    conceptFixture(b, conceptSource({ guidedQuestion: { ...goodQuestion, choices: ["only"] } })));
  control("concept question with no hint", "CONCEPT_QUESTION_INVALID", (b) =>
    conceptFixture(b, conceptSource({ masteryCheck: [{ ...goodQuestion, hint: "" }] })));
  control("concept lesson with no questions at all", "CONCEPT_WITHOUT_PRACTICE", (b) =>
    conceptFixture(b, conceptSource({ guidedQuestion: undefined, practiceQuestions: [], masteryCheck: [] })));

  // Every declared issue code has at least one control.
  const declaredCodes: EducationIssueCode[] = [
    "DUPLICATE_LESSON_ID", "DUPLICATE_COURSE_ID", "DUPLICATE_MODULE_ID", "UNKNOWN_COURSE", "UNKNOWN_MODULE",
    "COURSE_TRACK_MISMATCH", "MODULE_TRACK_MISMATCH", "UNKNOWN_PREREQUISITE", "PREREQUISITE_CYCLE",
    "UNKNOWN_NEXT_LESSON", "NEXT_LESSON_TRACK_MISMATCH", "MISSING_PROVENANCE", "INVALID_LEARNER_PROVENANCE",
    "CONCEPT_WITHOUT_PRACTICE", "AVAILABLE_WITHOUT_PRACTICE_EVIDENCE", "UNAVAILABLE_WITH_INTERACTIVE_PRACTICE",
    "MAX_RUNG_EXCEEDED", "DUPLICATE_SKILL_SLUG", "GENERIC_FILLER_TEXT", "ALIAS_UNKNOWN_TARGET", "ALIAS_COLLISION",
    "EMPTY_METADATA", "UNSUPPORTED_TRACK", "MISSING_SOURCE", "DUPLICATE_SOURCE_OBJECT", "ALIAS_EMPTY_TARGET",
    "ALIAS_SELF_CYCLE", "ALIAS_CONFLICTING_TARGET", "ALIAS_PLANNED_RESOLVABLE",
    "CONCEPT_SOURCE_SLUG_MISMATCH", "CONCEPT_SOURCE_INCOMPLETE", "CONCEPT_QUESTION_INVALID",
    // M13E1C codes are controlled in scripts/skills-compat-smoke.ts, which owns the seeded manifest.
    "ALIAS_COMPAT_UNKNOWN_TARGET", "ALIAS_COMPAT_SHADOWS_CANONICAL"
  ];
  const OWNED_ELSEWHERE = new Set(["ALIAS_COMPAT_UNKNOWN_TARGET", "ALIAS_COMPAT_SHADOWS_CANONICAL"]);
  for (const code of declaredCodes.filter((c) => !OWNED_ELSEWHERE.has(c))) {
    assert.ok(controlsRun.some((entry) => entry.endsWith(`-> ${code}`)), `every issue code needs a control: ${code} has none`);
  }
  assert.equal(controlsRun.length, 38, "38 controls ran");

  // The base fixture is still valid after all of that — no control mutated shared state.
  assert.deepEqual(validateEducationRegistry(baseFixture()), [], "the base fixture is unchanged and still valid");
  // And the REAL registry is still clean after every fixture ran.
  assert.deepEqual(validateEducationRegistry({ ...EDUCATION_REGISTRY, seededSlugs: [...SEEDED_LESSON_SLUGS, ...SEEDED_SKILL_SLUGS] }), [], "the real registry is untouched by the controls");

  // ---------------------------------------------------------------------------------------------
// QA-R2 #15 — ONE COURSE MODEL, TWO COURSES. The catalog listed all twelve DECA lessons under one badge
// reading "Performance Course" while a lesson's own map showed five steps, so a beginner could not say
// how many things they were meant to complete.
{
  const decaCourses = EDUCATION_COURSES.filter((course) => course.track === "DECA");
  assert.equal(decaCourses.length, 2, "C1. DECA really has two courses");
  const catalog = stripComments(readFileSync("app/(app)/lessons/page.tsx", "utf8"));
  assert.match(catalog, /const courseGroups = EDUCATION_COURSES\.filter\(/, "C2. the catalog groups by the registry's own courses");
  assert.match(catalog, /card\.courseId === course\.id/, "C3. a card joins the course it belongs to");
  assert.match(catalog, /courseId: getEducationLesson\(l\.slug\)\?\.courseId \?\? null/, "C4. including the role-play card, whose course comes from the registry too");
  assert.match(catalog, /courseGroups\.length > 1 \? `\$\{courseGroups\.length\} courses`/, "C5. the badge counts courses instead of naming one");
  assert.ok(!/<Badge variant="secondary">Performance Course<\/Badge>/.test(catalog), "C6. the single hardcoded course badge is gone");
  assert.match(catalog, /\{group\.cards\.length\} \{group\.cards\.length === 1 \? "lesson" : "lessons"\} published in this course/, "C7. each course states its own size");

  const roleplayView = stripComments(readFileSync("components/lessons/roleplay-lesson-view.tsx", "utf8"));
  assert.ok(!/Performance Course/.test(roleplayView), "C8. the in-lesson map no longer calls itself the performance course");
  assert.match(roleplayView, /Your \{lesson\.organization\} role-play course/, "C9. it names the course it actually lists");
  assert.match(roleplayView, /Role-play course · Lesson \{lesson\.courseMapCurrentIndex \?\? 0\}/, "C10. and so does the lesson badge");
  const lessonRoute = stripComments(readFileSync("app/(app)/lessons/[slug]/page.tsx", "utf8"));
  assert.match(lessonRoute, /label: `Your \$\{roleplay\.organization\} role-play course`/, "C11. the on-this-page link agrees with the heading it jumps to");
  console.log("  ok  DECA course model: two named courses, catalog and lesson map in agreement");
}

console.log(
    `Education-registry smoke passed: the canonical registry holds exactly twenty-three lessons — the P1-B6 DECA Identifying the Problem lesson (DECA, concept, the second SIMULATION PREREQUISITE, likewise carrying NO skillSlug and NO practiceDrill; it sits between the indicators lesson and business reasoning because the approved curriculum identifies the problem before attaching the reason), the P1-B5 DECA Reading the Scenario lesson (DECA, concept, in the role-play course's skills module, a SIMULATION PREREQUISITE that deliberately carries NO skillSlug and NO practiceDrill, so it owns no mastery area and the four owners stay four; it chains into the performance-indicators lesson because the approved curriculum reads role, then scenario, then indicators), the six P1-B4 Marketing Fundamentals lessons (MK1-MK6 from the approved curriculum, in the DECA Business-Content course, chained in order, with only MK1 claiming the deca-marketing skill so the area keeps one remediation destination while the other five carry the practice CTA alone), the P1-B3 DECA Handling Customer Situations lesson (DECA, concept, the teaching owner for deca-customer-relations, and the first CLUSTER-KNOWLEDGE lesson: it sits in its own DECA Business-Content course rather than the role-play course, whose module outcomes are about performing a round, and it carries stable-teaching provenance per the approved curriculum), the P1-B2 DECA Justifying Your Recommendation lesson (DECA, concept, the teaching owner for the deca-business-reasoning skill, sharing module deca-roleplay-skills with the indicators lesson because the single-claim rule is per skill and these claim different ones, and terminating the DECA concept chain), the P1-B1 DECA Understanding Performance Indicators lesson (DECA, concept, the teaching owner for the deca-performance-indicators skill: skillSlug plus the exact DECA performance-indicators drill mapping, its own checks still formative, chain-terminating because the only DECA lessons left are held), the B2.2 Turn Mechanics lesson (newly authored chain-anatomy teaching chained after answer-types: practice CTA to the rebuttal drill but deliberately NO skillSlug, same single-claim rule), the B2.1 Answer Types lesson (newly authored taxonomy teaching chained after refutation: practice CTA to the rebuttal drill but deliberately NO skillSlug, so refutation stays the module's single claimed debate-rebuttal teaching home), the Wave 1A Debate Round Orientation (Taught-only, formative checks, deliberately no skillSlug and no practiceDrill), the Wave 1C Evidence Evaluation teaching home (skillSlug debate-evidence, exact evidence-evaluation drill mapping), Claim/Warrant/Impact (General Debate, concept, practice available, mastery skill debate-claim-building), How a DECA Role-Play Works (DECA, performance, practice available and still telling the learner nothing is recorded), and Patient Communication in HOSA Clinical Skill Events (HOSA, performance, practice temporarily unavailable with no interactive scenario and a rung cap of 4). Each entry's source is the ORIGINAL exported lesson object by strict identity, proven against a deep clone that fails the same check, and each provenance object is the source's own and survives the production decision layer undegraded. Dependency flow is one-way: every file under app/ or components/ that imports lib/education is on the recorded allowlist — the lessons surface, the legacy /skills compatibility surface, and, from M15 S4, the post-round debate arena, which resolves a judge diagnosis to the canonical lesson through one pure fail-closed resolver. lib/lessons.ts, lib/roleplay-lessons.ts, lib/learning-content.ts and lib/source-freshness.ts import nothing from it, while the registry imports both legacy lesson modules. The slug map carries exactly the five historical judge-recommendation slugs, all five active — Wave 1B published the corrected weighing lesson, and M15 S4 added the constructive-speeches alias that previously resolved nowhere. The validator reports zero issues for the real registry, and all ${controlsRun.length} controls each produced their expected issue code — including a control proving that authored text containing "practice" and "performance" is not mistaken for seed-template filler.`
  );
}

main();
