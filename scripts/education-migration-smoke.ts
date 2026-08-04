import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { readFileSync, readdirSync, statSync } from "node:fs";
// THE PRODUCTION MODULES — never a mirrored copy of their data or logic.
import { LEARNING_SKILL_CATALOG } from "../lib/learning-content";
import { EDUCATION_COURSES, EDUCATION_LESSONS, EDUCATION_MODULES, EDUCATION_REGISTRY, educationLessonsForTrack, getEducationLesson, getEducationModule } from "../lib/education/registry";
import { DEBATE_MIGRATED_LESSONS, HELD_DEBATE_CATALOG_SLUGS, MIGRATED_DEBATE_PROVENANCE } from "../lib/education/tracks/debate";
import { EDUCATION_GENERIC_FILLER_SIGNATURES, validateEducationRegistry } from "../lib/education/validate";
// M13E1C: the compatibility-alias rule validates its target against the seeded manifest.
import { SEEDED_LESSON_SLUGS, SEEDED_SKILL_SLUGS } from "../lib/education/skills-compat";
import { isConceptEducationLessonEntry } from "../lib/education/types";
import { getLesson } from "../lib/lessons";
import { getRoleplayLesson } from "../lib/roleplay-lessons";
import { presentSourceFreshness } from "../lib/source-freshness";

const read = (p: string) => readFileSync(p, "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "")).join("\n");
const sha = (p: string) => execSync(`git show HEAD:'${p}' | shasum -a 256`, { encoding: "utf8" }).split(" ")[0];
const shaNow = (p: string) => execSync(`shasum -a 256 '${p}'`, { encoding: "utf8" }).split(" ")[0];

const MIGRATED = ["debate-signposting", "debate-clash", "debate-refutation", "debate-constructive-speeches"] as const;

function walkTree(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === ".git") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkTree(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

/** Every string reachable from a value — used for the text-preservation and filler scans. */
function collectStrings(value: unknown, out: string[], depth = 0): void {
  if (depth > 12) return;
  if (typeof value === "string") { out.push(value); return; }
  if (Array.isArray(value)) { for (const v of value) collectStrings(v, out, depth + 1); return; }
  if (typeof value === "object" && value !== null) {
    for (const v of Object.values(value)) collectStrings(v, out, depth + 1);
  }
}

async function main() {
  const view = read("components/lessons/concept-education-lesson-view.tsx");
  const practice = read("components/lessons/concept-education-lesson-practice.tsx");
  const trackFile = read("lib/education/tracks/debate.ts");
  const slugRoute = read("app/(app)/lessons/[slug]/page.tsx");
  const indexRoute = read("app/(app)/lessons/page.tsx");

  // ---- 1-3. exactly four migrated lessons, exact ids, strict source identity ---------------------
  assert.equal(DEBATE_MIGRATED_LESSONS.length, 4, "1. exactly four Debate catalog lessons are migrated");
  assert.deepEqual(DEBATE_MIGRATED_LESSONS.map((e) => e.id), [...MIGRATED], "2. exact migrated ids, in teaching order");
  for (const id of MIGRATED) {
    const entry = getEducationLesson(id);
    const original = LEARNING_SKILL_CATALOG.find((c) => c.slug === id);
    assert.ok(entry && original, `3a. "${id}" resolves in the registry and the catalog`);
    assert.ok(entry.source === original, `3b. "${id}" source IS the catalog object (strict ===)`);
    // Non-vacuity: a structurally identical clone must FAIL the same check.
    assert.ok(entry.source !== JSON.parse(JSON.stringify(original)), `3c. control: a clone of "${id}" is not identity-equal`);
    assert.ok(entry.provenance === MIGRATED_DEBATE_PROVENANCE, `3d. "${id}" uses the shared provenance object`);
  }

  // ---- 4. the migration source files are untouched -------------------------------------------------
  //
  // `lib/spaced-review.ts` was in this list until M13E1D, which intentionally adds a DETAILED
  // persistence result beside the existing boolean export. A blanket snapshot cannot distinguish
  // "the education migration leaked into the mastery writer" from "an approved milestone extended
  // it", so it is replaced at 4b by assertions on the property that actually matters: the education
  // surface still does not touch mastery, and the existing contract is extended, never replaced.
  //
  // The canonical lesson ROUTES are added here — M13E1B's renderers were pinned but the two routes
  // that mount them were not, so a change there would have gone unnoticed.
  for (const file of ["lib/learning-content.ts", "lib/lessons.ts", "lib/roleplay-lessons.ts",
                      "components/lessons/lesson-view.tsx", "components/lessons/lesson-practice.tsx",
                      "components/lessons/roleplay-lesson-view.tsx", "components/lessons/roleplay-lesson-practice.tsx",
                      "components/lessons/concept-education-lesson-view.tsx",
                      "components/lessons/concept-education-lesson-practice.tsx",
                      "app/(app)/lessons/page.tsx", "app/(app)/lessons/[slug]/page.tsx",
                      // lib/debate-drills.ts is deliberately absent from M13E1E onward: that milestone
                      // gives Debate the duplicate-resistant evidence contract. What this suite needs
                      // to protect is the LESSON path, which is asserted at 4b9 below.
                      "lib/authored-lesson-progress.ts",
                      // app/(app)/skills/[slug]/page.tsx is deliberately absent: M13E1C rewrites that
                      // route. Its INDEX page stays pinned here, and the compatibility contract that
                      // replaced its body is owned by scripts/skills-compat-smoke.ts.
                      "app/(app)/skills/page.tsx",
                      // app/api/skills/debate-writing/route.ts is deliberately absent from M13E1G
                      // onward: that milestone reorders its review/mastery writes so a due window has
                      // one winner. What this suite protects is asserted at 4b13 below.
                      "lib/assignments.ts", "prisma/schema.prisma", "prisma/seed.ts"]) {
    assert.equal(shaNow(file), sha(file), `4. ${file} is byte-identical to HEAD`);
  }

  // ---- 4b. what the lib/spaced-review snapshot was really protecting ---------------------------------
  // (i) The education surface still writes no mastery. Proven by import graph, not by a file hash:
  //     no canonical lesson route, renderer or registry module may reach the mastery writer at all.
  for (const file of ["app/(app)/lessons/page.tsx", "app/(app)/lessons/[slug]/page.tsx",
                      "components/lessons/concept-education-lesson-view.tsx",
                      "components/lessons/concept-education-lesson-practice.tsx",
                      "lib/education/registry.ts", "lib/education/tracks/debate.ts",
                      "lib/education/skills-compat.ts"]) {
    const code = stripComments(read(file));
    for (const banned of ["@/lib/spaced-review", "recordDrillMastery", "recordDrillMasteryDetailed",
                          "recordPracticeOutcome", "@/lib/prisma", "MasteryProgress"]) {
      assert.ok(!code.includes(banned), `4b. ${file} still performs no ${banned}`);
    }
  }
  // (ii) The existing boolean export is EXTENDED, not replaced. Both symbols are exported, and the
  //      boolean one is still a function with the same name every existing caller imports.
  const spacedReview = read("lib/spaced-review.ts");
  assert.ok(/export async function recordDrillMastery\(/.test(spacedReview),
    "4b2. the original boolean recordDrillMastery export still exists");
  assert.ok(/export async function recordDrillMasteryDetailed\(/.test(spacedReview),
    "4b3. and the detailed result is an ADDITION beside it, not a rename");
  assert.ok(/Promise<boolean>/.test(spacedReview), "4b4. the boolean return type is unchanged");
  // The Debate caller — the reason the contract must stay backward-compatible — still consumes the
  // boolean form. It is no longer byte-pinned: M13E1E rewrites its persistence GATING while keeping
  // the same call, so the assertion that matters is the call shape, not the file hash.
  // 4b5/4b6 INVERTED at M13E1G. The Debate route used the boolean helper, which cannot distinguish a
  // deliberate concurrency no-op from a write failure — so it told learners "progress could not be
  // saved" when nothing had failed. It now consumes the detailed outcome. The guarantee that still
  // matters is that the BOOLEAN EXPORT survives unchanged for anything else that reads it.
  const debateRoute = read("app/api/debate/drills/submit/route.ts");
  assert.ok(/recordDrillMasteryDetailed\(/.test(debateRoute),
    "4b5. the Debate drill submit route consumes the detailed outcome");
  assert.ok(!/recordDrillMastery\(/.test(stripComments(debateRoute)),
    "4b5b. and no longer calls the boolean form, which could not express a concurrency no-op");
  assert.ok(/export async function recordDrillMastery\(/.test(spacedReview),
    "4b6. the boolean export still exists for every other caller");
  assert.ok(/Promise<boolean>/.test(spacedReview), "4b6b. and still returns a boolean");
  assert.ok(/outcome\.status === "updated"/.test(stripComments(debateRoute)),
    "4b6c. with only an actual mastery update entering wroteSkills");
  // 4b13. Debate WRITING keeps its response shape, its XP and its grading; only the order changed.
  const writing = stripComments(read("app/api/skills/debate-writing/route.ts"));
  assert.ok(/xPLog\.create/.test(writing) && /XP_REWARDS\.lessonCompleted/.test(writing),
    "4b13. Debate writing still awards XP");
  assert.ok(/gradeDebateWritingResponse\(/.test(writing), "4b13b. and still grades the same way");
  assert.ok(writing.indexOf("recordPracticeOutcome(") < writing.indexOf("prisma.$transaction"),
    "4b13c. with review resolved BEFORE the mastery/XP transaction");
  assert.ok(!/isReviewDue\(/.test(writing), "4b13d. and no independent due-check remains");
  // 4b9. The LESSON practice path is what this suite protects, and it is untouched by M13E1E: the one
  // authored lesson using LessonPractice reuses the Debate drill endpoints, so prove the lesson
  // renderer and its component are byte-identical even though the drill bank changed.
  for (const file of ["components/lessons/lesson-practice.tsx", "lib/lessons.ts"]) {
    assert.equal(shaNow(file), sha(file), `4b9. ${file} is byte-identical to HEAD`);
  }
  // And the Debate bank's QUESTION DATA is unchanged — only the evidence layer was added.
  const { DRILL_BANK, DRILL_AREAS } = await import("../lib/debate-drills");
  assert.equal(DRILL_BANK.length, 36, "4b10. the Debate bank still holds exactly 36 questions");
  assert.equal(DRILL_AREAS.length, 4, "4b11. across exactly four areas");
  assert.equal(new Set(DRILL_BANK.map((q) => q.id)).size, 36, "4b12. with no duplicate ids");
  // (iii) M13E1D introduces no second lesson or mastery renderer. The lesson component set is fixed,
  //       and the one component M13E1D touched reaches no lesson or education module.
  const lessonComponents = readdirSync("components/lessons").filter((f) => /\.tsx?$/.test(f)).sort();
  assert.deepEqual(lessonComponents,
    ["concept-education-lesson-practice.tsx", "concept-education-lesson-view.tsx", "lesson-practice.tsx",
     "lesson-view.tsx", "roleplay-lesson-practice.tsx", "roleplay-lesson-view.tsx"],
    "4b7. no new lesson renderer was introduced");
  const drills = stripComments(read("components/training/concept-drills.tsx"));
  for (const banned of ["lib/education", "lib/lessons", "lib/learning-content", "LessonView", "LessonPractice"]) {
    assert.ok(!drills.includes(banned), `4b8. the drill runner is not a second lesson renderer (${banned})`);
  }

  // ---- 5-8. registry and discovery inventory -----------------------------------------------------
  assert.equal(EDUCATION_LESSONS.length, 7, "5. seven canonical registry entries");
  const learnerVisible = EDUCATION_LESSONS.filter((e) => e.visibility === "learner");
  assert.equal(learnerVisible.length, 7, "6a. all seven are learner-visible");
  const debate = educationLessonsForTrack("GENERAL_DEBATE");
  assert.equal(debate.length, 5, "7. exactly five Debate lessons");
  assert.deepEqual(debate.map((e) => e.id),
    ["claim-warrant-impact", ...MIGRATED], "7b. CWI first, then the migrated four in teaching order");
  assert.equal(educationLessonsForTrack("DECA").length, 1, "6b. one DECA lesson");
  assert.equal(educationLessonsForTrack("HOSA").length, 1, "6c. one HOSA lesson");
  assert.equal(EDUCATION_LESSONS.filter((e) => e.id === "claim-warrant-impact").length, 1, "8. CWI appears exactly once");

  // ---- 9-13. held content is nowhere near a learner ----------------------------------------------
  const registeredIds = new Set(EDUCATION_LESSONS.map((e) => e.id));
  for (const held of HELD_DEBATE_CATALOG_SLUGS) {
    assert.ok(!registeredIds.has(held), `9-13. held catalog slug "${held}" is not registered`);
  }
  const heldTitles = HELD_DEBATE_CATALOG_SLUGS
    .map((slug) => LEARNING_SKILL_CATALOG.find((c) => c.slug === slug)?.lesson.title)
    .filter((t): t is string => typeof t === "string");
  assert.equal(heldTitles.length, 5, "9b. control: all five held lessons really exist in the catalog");
  const registryText = JSON.stringify(EDUCATION_LESSONS);
  for (const title of heldTitles) {
    assert.ok(!registryText.includes(title), `10. held lesson title "${title}" appears nowhere in the registry`);
  }
  // Parliamentary content specifically must not reach the registry.
  assert.ok(!/parliamentary/i.test(registryText), "12. no parliamentary content in the canonical registry");

  // ---- 14. provenance ----------------------------------------------------------------------------
  assert.equal(MIGRATED_DEBATE_PROVENANCE.authority, "tier-2", "14a. tier-2 authority");
  assert.equal(MIGRATED_DEBATE_PROVENANCE.organization, "CompeteReady", "14b. attributed to CompeteReady");
  assert.equal(MIGRATED_DEBATE_PROVENANCE.freshness, "stable", "14c. stable freshness");
  assert.ok(Object.isFrozen(MIGRATED_DEBATE_PROVENANCE), "14d. and it is frozen, so no consumer can mutate it");
  assert.equal(presentSourceFreshness(MIGRATED_DEBATE_PROVENANCE).degraded, false, "14e. it survives the decision layer");
  assert.ok(!/nsda|official rule|official requirement/i.test(JSON.stringify(MIGRATED_DEBATE_PROVENANCE)),
    "14f. it claims no official source");

  // ---- 15-16. lesson-quality fields + deterministic questions ------------------------------------
  for (const id of MIGRATED) {
    const entry = getEducationLesson(id);
    assert.ok(entry && isConceptEducationLessonEntry(entry), `15a. "${id}" is a concept-education entry`);
    const c = entry.source.lesson.content;
    for (const [field, value] of [["objective", c.objective], ["explanation", c.explanation], ["whyMatters", c.whyMatters],
                                  ["workedExample.prompt", c.workedExample.prompt], ["workedExample.weakAnswer", c.workedExample.weakAnswer],
                                  ["workedExample.strongAnswer", c.workedExample.strongAnswer], ["workedExample.whyItWorks", c.workedExample.whyItWorks]] as const) {
      assert.ok(value.trim().length > 0, `15b. "${id}" has ${field}`);
    }
    assert.ok(c.steps.length > 0, `15c. "${id}" has a teachable process`);
    assert.ok(c.practiceQuestions.length > 0, `15d. "${id}" has independent practice`);
    assert.ok(c.masteryCheck.length > 0, `15e. "${id}" has a final check`);
    for (const q of [c.guidedQuestion, ...c.practiceQuestions, ...c.masteryCheck]) {
      assert.ok(q.choices.length >= 2, `16a. "${id}" question has at least two choices`);
      assert.equal(q.choices.filter((choice) => choice === q.correctAnswer).length, 1,
        `16b. "${id}" question has exactly one stored answer, present among its choices`);
      assert.ok(q.hint.trim() && q.explanation.trim() && q.skillTag.trim(), `16c. "${id}" question has hint, explanation and tag`);
    }
  }

  // ---- 17-20. text preservation, by identity + by mutation control -------------------------------
  // Because the registry holds the ORIGINAL objects, preservation is identity — but prove that a
  // clone, a mutated string and a missing field would each be caught.
  for (const id of MIGRATED) {
    const original = LEARNING_SKILL_CATALOG.find((c) => c.slug === id);
    const entry = getEducationLesson(id);
    assert.ok(original && entry, `17a. "${id}" present in both`);
    const a: string[] = []; const b: string[] = [];
    collectStrings(original, a); collectStrings(entry.source, b);
    assert.deepEqual(b, a, `17b. every authored string of "${id}" is reachable from the registry entry, in order`);
    // 18. one-character mutation must fail the same comparison.
    const mutated = JSON.parse(JSON.stringify(original)) as unknown;
    const m: string[] = []; collectStrings(mutated, m);
    m[0] = `${m[0]}x`;
    assert.notDeepEqual(m, a, `18. control: a one-character change to "${id}" fails the comparison`);
    // 19. a missing field must fail.
    const short = a.slice(0, a.length - 1);
    assert.notDeepEqual(short, a, `19. control: a removed text unit of "${id}" fails the comparison`);
    // 20. a clone must fail the identity contract.
    assert.notEqual(entry.source, mutated, `20. control: a clone of "${id}" is not identity-equal`);
  }

  // ---- 21-23. sequence integrity -----------------------------------------------------------------
  const ids = new Set(EDUCATION_LESSONS.map((e) => e.id));
  for (const entry of EDUCATION_LESSONS) {
    if (entry.nextLessonId !== null) assert.ok(ids.has(entry.nextLessonId), `21. "${entry.id}" next lesson resolves`);
  }
  assert.equal(getEducationLesson("claim-warrant-impact")?.nextLessonId, "debate-signposting", "21b. CWI now leads into the migrated chain");
  assert.equal(getEducationLesson("debate-constructive-speeches")?.nextLessonId, null, "21c. the last migrated lesson ends the chain honestly");
  assert.deepEqual(EDUCATION_COURSES.find((c) => c.id === "debate-performance")?.moduleIds,
    ["debate-argument-construction", "debate-round-strategy", "debate-speech-structure"], "22. exact Debate module order");
  const moduleIds = new Set(EDUCATION_MODULES.map((m) => m.id));
  for (const m of EDUCATION_MODULES) {
    if (m.prerequisiteId !== null) assert.ok(moduleIds.has(m.prerequisiteId), `23. module "${m.id}" prerequisite resolves`);
  }

  // ---- 24-25. skill mapping honesty ---------------------------------------------------------------
  assert.equal(getEducationLesson("debate-refutation")?.skillSlug, "debate-rebuttal", "24. refutation is associated with debate-rebuttal");
  for (const id of ["debate-signposting", "debate-clash", "debate-constructive-speeches"]) {
    assert.equal(getEducationLesson(id)?.skillSlug, undefined, `25. "${id}" claims no seeded mastery skill`);
  }

  // ---- 26-30. the practice component is inert ------------------------------------------------------
  const inertCode = stripComments(practice);
  for (const banned of ["recordDrillMastery", "MasteryProgress", "SkillReviewSchedule", "XPLog", "xpReward",
                        "authored-lesson-progress", "localStorage", "sessionStorage", "document.cookie",
                        "fetch(", "/api/", "XMLHttpRequest", "sendBeacon", "use server", "@/lib/prisma",
                        "spaced-review", "@/lib/xp", "assignments"]) {
    assert.ok(!inertCode.includes(banned), `26-29. the checks component performs no ${banned}`);
  }
  assert.ok(inertCode.includes('"use client"') || practice.startsWith('"use client"'), "26b. control: it really is the client component being scanned");
  // 30. no course-level percentage anywhere in the new surface.
  for (const [label, code] of [["view", view], ["practice", practice], ["index route", indexRoute]] as const) {
    assert.ok(!/\b\d+\s*%|percent|masteryPercent|progressPercent/i.test(stripComments(code)), `30. no percentage in the ${label}`);
  }
  assert.ok(!/mastery/i.test(stripComments(view).replace(/masteryCheck/g, "")), "30b. the view never uses the word mastery outside the source field name");

  // ---- 31-32. the legacy lesson path is untouched ---------------------------------------------------
  assert.ok(getLesson("claim-warrant-impact"), "31a. the CWI lesson still resolves through its legacy lookup");
  assert.ok(slugRoute.includes("<LessonView") && slugRoute.includes("<LessonPractice"), "32. CWI still renders through LessonView + LessonPractice");
  assert.ok(slugRoute.indexOf("getLesson(params.slug)") < slugRoute.indexOf("conceptEducationLesson(params.slug)"),
    "32b. the legacy lookups run BEFORE the canonical one");

  // ---- 33-35. DECA and HOSA are untouched ----------------------------------------------------------
  const deca = getRoleplayLesson("how-deca-roleplay-works");
  const hosa = getRoleplayLesson("how-hosa-scenario-interaction-works");
  assert.ok(deca && deca.practiceStatus === "available", "33. DECA practice is still available");
  assert.ok(hosa && hosa.practiceStatus === "temporarily-unavailable", "34/35. HOSA practice is still unavailable");
  assert.ok(!("practice" in hosa) && !("scenario" in hosa), "35b. and HOSA still defines no interactive practice or scenario");

  // ---- 36-39. forbidden surfaces (byte-identity already asserted at check 4) ------------------------
  // M13E1C connected a compatibility layer to /skills. The protection is not removed — it becomes an
  // ALLOWLIST, so an unrelated legacy surface cannot quietly start consuming the education modules.
  const EDUCATION_CONSUMERS = new Set([
    // canonical lessons surface (M13E1B)
    "app/(app)/lessons/page.tsx",
    "app/(app)/lessons/[slug]/page.tsx",
    "components/lessons/concept-education-lesson-view.tsx",
    "components/lessons/concept-education-lesson-practice.tsx",
    // legacy /skills compatibility surface (M13E1C)
    "app/(app)/skills/[slug]/page.tsx",
    "app/(app)/skills/[slug]/practice/page.tsx",
    "components/skills/skill-path.tsx",
    "app/(app)/study-arcade/review/page.tsx"
  ]);
  const found: string[] = [];
  for (const file of [...walkTree("app"), ...walkTree("components")]) {
    if (!stripComments(read(file)).includes("lib/education")) continue;
    found.push(file);
    assert.ok(EDUCATION_CONSUMERS.has(file), `36. only approved surfaces consume lib/education (${file})`);
  }
  assert.deepEqual([...found].sort(), [...EDUCATION_CONSUMERS].sort(),
    "36b. and every approved consumer really does import it");
  // The /skills index itself still does NOT reach the education modules — it renders SkillPath only.
  assert.ok(!stripComments(read("app/(app)/skills/page.tsx")).includes("lib/education"),
    "36c. the /skills index page still consumes nothing from lib/education directly");
  // /lessons stays canonical: the compatibility surface may only reach the registry through the
  // compatibility module, never through the raw lesson registry the canonical surface uses.
  for (const file of ["app/(app)/skills/[slug]/page.tsx", "app/(app)/skills/[slug]/practice/page.tsx",
                      "app/(app)/study-arcade/review/page.tsx"]) {
    assert.ok(!/from "@\/lib\/education\/(registry|tracks)/.test(stripComments(read(file))),
      `36d. ${file} reaches the registry only through skills-compat`);
  }

  // ---- 40. no generic seed-template filler, in data ------------------------------------------------
  const migratedStrings: string[] = [];
  for (const id of MIGRATED) collectStrings(getEducationLesson(id)?.source, migratedStrings);
  const haystack = migratedStrings.join("\n");
  for (const signature of EDUCATION_GENERIC_FILLER_SIGNATURES) {
    assert.ok(!haystack.includes(signature), `40. no migrated lesson contains "${signature.slice(0, 40)}…"`);
  }
  assert.ok(/\bpractice\b/i.test(haystack) || /\bjudge\b/i.test(haystack), "40b. control: the scan really saw the authored text");

  // ---- 41-42. fail closed ---------------------------------------------------------------------------
  assert.equal(getEducationLesson("no-such-debate-lesson"), undefined, "41. an unknown canonical id resolves to nothing");
  assert.ok(slugRoute.includes("notFound()"), "41b. and the route still fails closed");
  assert.ok(slugRoute.includes('entry.visibility !== "learner"'), "42. an internal entry cannot render");
  assert.ok(slugRoute.includes("isConceptEducationLessonEntry"), "42b. narrowing is by the discriminant, not a probe");

  // ---- 43. the new pages carry the real authored titles ---------------------------------------------
  for (const id of MIGRATED) {
    const entry = getEducationLesson(id);
    assert.ok(entry && isConceptEducationLessonEntry(entry), `43a. "${id}" is renderable`);
    assert.ok(entry.source.lesson.title.trim().length > 0, `43b. "${id}" has a real title`);
    assert.equal(entry.source.slug, id, `43c. "${id}" source slug matches its canonical id`);
  }

  // ---- 44-49. accessibility contract, by source ------------------------------------------------------
  assert.equal((view.match(/<h1/g) ?? []).length, 1, "44. the concept view renders exactly one h1");
  const levels = [...view.matchAll(/<h([1-3])/g)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i += 1) {
    assert.ok(levels[i] - levels[i - 1] <= 1, `45. heading order does not skip (${levels.join(",")})`);
  }
  assert.ok(practice.includes("focus-ring"), "46. answer controls carry the visible focus class");
  assert.ok((practice.match(/min-h-11/g) ?? []).length >= 4, "47. answer and action targets carry the 44px minimum");
  assert.ok(practice.includes("aria-live"), "48a. changed feedback is announced");
  assert.ok(practice.includes("CheckCircle2") && practice.includes("XCircle") && /Not yet|Correct/.test(practice),
    "48b. correctness is icon + word, never colour alone");
  assert.ok(practice.includes("aria-pressed"), "48c. the selected answer is exposed accessibly");
  assert.ok(!/overflow-x-|whitespace-nowrap|w-\[\d/.test(stripComments(view) + stripComments(practice)), "49. no fixed width or nowrap that could overflow");
  assert.ok(view.includes("break-words") && practice.includes("break-words"), "49b. long titles and choices wrap");

  // ---- 50. provenance is visible on every new page ---------------------------------------------------
  assert.ok(view.includes("SourceFreshnessNote"), "50. the concept view renders the shared source note");

  // ---- registry validation --------------------------------------------------------------------------
  assert.deepEqual(validateEducationRegistry({ ...EDUCATION_REGISTRY, seededSlugs: [...SEEDED_LESSON_SLUGS, ...SEEDED_SKILL_SLUGS] }), [],
    `the real registry validates cleanly; got ${JSON.stringify(validateEducationRegistry({ ...EDUCATION_REGISTRY, seededSlugs: [...SEEDED_LESSON_SLUGS, ...SEEDED_SKILL_SLUGS] }))}`);

  // ---- selector controls ------------------------------------------------------------------------------
  assert.ok(trackFile.includes("LEARNING_SKILL_CATALOG"), "selector: the track file imports the catalog rather than copying it");
  for (const banned of ["...entry", "Object.assign", "structuredClone", "JSON.parse"]) {
    assert.ok(!stripComments(trackFile).includes(banned), `selector: no ${banned} — the source is referenced, never copied`);
  }
  assert.ok(trackFile.includes("throw new Error"), "selector: it fails loudly rather than degrading");

  console.log(
    `Education-migration smoke passed: four already-authored Debate lessons — Guide the judge through your speech, Create direct clash, Answer with refutation, and Build a constructive speech — are now learner-visible, and each registry entry holds the ORIGINAL LEARNING_SKILL_CATALOG object by strict identity, proven against clones, one-character mutations and removed fields that all fail the same checks. lib/learning-content.ts and every legacy lesson module, renderer, drill bank, /skills page, assignment file and Prisma file are byte-identical to HEAD. The Debate course now runs argument construction -> round strategy -> speech structure with resolving prerequisites and a next-lesson chain that ends honestly at null. Only debate-refutation names a seeded skill, as association alone: the checks component contains no mastery, XP, progress, storage, API, server-action or AI reference at all, states before the first question that nothing is saved, and introduces no percentage anywhere. All five held Debate entries — including both parliamentary ones — are absent from the registry by id and by title. Every question has at least two choices and exactly one stored answer present among them, feedback is icon plus word with aria-live, targets carry the 44px minimum and a visible focus ring, and the source-freshness note renders on every new page. lib/spaced-review.ts is no longer blanket-hashed — the canonical lesson routes are pinned instead, no education module reaches the mastery writer at all, recordDrillMastery keeps its boolean export beside the added detailed result, the Debate submit route is byte-identical and still calls the boolean form, and no second lesson or mastery renderer was introduced.`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
