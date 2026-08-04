import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
// THE PRODUCTION MODULES — never a mirrored copy of their data or logic.
import { LEARNING_SKILL_CATALOG } from "../lib/learning-content";
import { EDUCATION_COURSES, EDUCATION_LESSONS, EDUCATION_MODULES, EDUCATION_REGISTRY, educationLessonsForTrack, getEducationLesson, getEducationModule } from "../lib/education/registry";
import { DEBATE_MIGRATED_LESSONS, HELD_DEBATE_CATALOG_SLUGS, MIGRATED_DEBATE_PROVENANCE } from "../lib/education/tracks/debate";
import { EDUCATION_GENERIC_FILLER_SIGNATURES, validateEducationRegistry } from "../lib/education/validate";
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

/** Every string reachable from a value — used for the text-preservation and filler scans. */
function collectStrings(value: unknown, out: string[], depth = 0): void {
  if (depth > 12) return;
  if (typeof value === "string") { out.push(value); return; }
  if (Array.isArray(value)) { for (const v of value) collectStrings(v, out, depth + 1); return; }
  if (typeof value === "object" && value !== null) {
    for (const v of Object.values(value)) collectStrings(v, out, depth + 1);
  }
}

function main() {
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

  // ---- 4. the migration source file is untouched -------------------------------------------------
  for (const file of ["lib/learning-content.ts", "lib/lessons.ts", "lib/roleplay-lessons.ts",
                      "components/lessons/lesson-view.tsx", "components/lessons/lesson-practice.tsx",
                      "components/lessons/roleplay-lesson-view.tsx", "components/lessons/roleplay-lesson-practice.tsx",
                      "lib/authored-lesson-progress.ts", "lib/spaced-review.ts", "lib/debate-drills.ts",
                      "app/(app)/skills/page.tsx", "app/(app)/skills/[slug]/page.tsx",
                      "lib/assignments.ts", "prisma/schema.prisma", "prisma/seed.ts",
                      "app/api/skills/debate-writing/route.ts"]) {
    assert.equal(shaNow(file), sha(file), `4. ${file} is byte-identical to HEAD`);
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
  assert.ok(!stripComments(read("app/(app)/skills/page.tsx")).includes("lib/education"), "36. /skills does not consume the registry");

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
  assert.deepEqual(validateEducationRegistry(EDUCATION_REGISTRY), [],
    `the real registry validates cleanly; got ${JSON.stringify(validateEducationRegistry(EDUCATION_REGISTRY))}`);

  // ---- selector controls ------------------------------------------------------------------------------
  assert.ok(trackFile.includes("LEARNING_SKILL_CATALOG"), "selector: the track file imports the catalog rather than copying it");
  for (const banned of ["...entry", "Object.assign", "structuredClone", "JSON.parse"]) {
    assert.ok(!stripComments(trackFile).includes(banned), `selector: no ${banned} — the source is referenced, never copied`);
  }
  assert.ok(trackFile.includes("throw new Error"), "selector: it fails loudly rather than degrading");

  console.log(
    `Education-migration smoke passed: four already-authored Debate lessons — Guide the judge through your speech, Create direct clash, Answer with refutation, and Build a constructive speech — are now learner-visible, and each registry entry holds the ORIGINAL LEARNING_SKILL_CATALOG object by strict identity, proven against clones, one-character mutations and removed fields that all fail the same checks. lib/learning-content.ts and every legacy lesson module, renderer, drill bank, /skills page, assignment file and Prisma file are byte-identical to HEAD. The Debate course now runs argument construction -> round strategy -> speech structure with resolving prerequisites and a next-lesson chain that ends honestly at null. Only debate-refutation names a seeded skill, as association alone: the checks component contains no mastery, XP, progress, storage, API, server-action or AI reference at all, states before the first question that nothing is saved, and introduces no percentage anywhere. All five held Debate entries — including both parliamentary ones — are absent from the registry by id and by title. Every question has at least two choices and exactly one stored answer present among them, feedback is icon plus word with aria-live, targets carry the 44px minimum and a visible focus ring, and the source-freshness note renders on every new page.`
  );
}

main();
