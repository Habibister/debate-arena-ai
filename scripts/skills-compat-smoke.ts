import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
// THE PRODUCTION MODULES — never a mirrored copy of their logic.
import {
  CANONICAL_REDIRECTS,
  COMPAT_TRACK_DESTINATION,
  SEEDED_LESSON_SLUGS,
  SEEDED_SKILL_SLUGS,
  SEEDED_SKILLS,
  compatTrackForSlug,
  debateWritingPracticeSupported,
  resolveSkillsSlug
} from "../lib/education/skills-compat";
import { EDUCATION_REGISTRY, EDUCATION_LESSONS, educationLessonsForTrack, getEducationLesson } from "../lib/education/registry";
import { EDUCATION_SLUG_ALIASES } from "../lib/education/slug-map";
import { EDUCATION_GENERIC_FILLER_SIGNATURES, validateEducationRegistry } from "../lib/education/validate";
import type { EducationRegistryInput, EducationSlugAlias } from "../lib/education/types";

const read = (p: string) => readFileSync(p, "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "")).join("\n");
const headSha = (p: string) => execSync(`git show HEAD:'${p}' | shasum -a 256`, { encoding: "utf8" }).split(" ")[0];
const nowSha = (p: string) => execSync(`shasum -a 256 '${p}'`, { encoding: "utf8" }).split(" ")[0];

const MANIFEST = [...SEEDED_LESSON_SLUGS, ...SEEDED_SKILL_SLUGS];
const withManifest: EducationRegistryInput = { ...EDUCATION_REGISTRY, seededSlugs: MANIFEST };

/** Every control asserts its EXACT code, after proving its base fixture starts clean. */
const controlsRun: string[] = [];
function control(label: string, expected: string, aliases: readonly EducationSlugAlias[]) {
  const base = validateEducationRegistry(withManifest);
  assert.deepEqual(base, [], `control "${label}": the real registry must start valid`);
  const issues = validateEducationRegistry({ ...withManifest, aliases });
  assert.ok(
    issues.some((i) => i.code === expected),
    `control "${label}" must produce ${expected}; got [${issues.map((i) => i.code).join(", ") || "none"}]`
  );
  controlsRun.push(`${label} -> ${expected}`);
}

function main() {
  const detail = read("app/(app)/skills/[slug]/page.tsx");
  const practice = read("app/(app)/skills/[slug]/practice/page.tsx");
  const index = read("components/skills/skill-path.tsx");
  const review = read("app/(app)/study-arcade/review/page.tsx");
  const judge = read("lib/debate-judge-analysis.ts");
  const ai = read("lib/ai.ts");

  // ---- 1-2. the static manifest IS what prisma/seed.ts creates ----------------------------------
  const seed = read("prisma/seed.ts");
  const cat = seed.slice(seed.indexOf("const skillCatalog"), seed.indexOf("function demoAvatarUrl"));
  const seedSkills: string[] = [];
  for (const m of cat.matchAll(/\n\s+slug:\s*"([^"]+)",/g)) seedSkills.push(m[1]);
  const seedLessons: string[] = [];
  for (const m of cat.matchAll(/slug:\s*"([^"]+)",[\s\S]*?lessons:\s*\[([^\]]*)\]/g)) {
    const count = [...m[2].matchAll(/"([^"]+)"/g)].length;
    for (let i = 1; i <= count; i += 1) seedLessons.push(`${m[1]}-${i}`);
  }
  assert.deepEqual([...SEEDED_SKILL_SLUGS].sort(), [...new Set(seedSkills)].sort(),
    "1. the manifest's skill slugs are exactly prisma/seed.ts's");
  assert.deepEqual([...SEEDED_LESSON_SLUGS].sort(), [...new Set(seedLessons)].sort(),
    "2. the manifest's lesson slugs are exactly prisma/seed.ts's");
  assert.equal(SEEDED_SKILL_SLUGS.length, 10, "1b. exactly ten seeded skills");
  assert.equal(SEEDED_LESSON_SLUGS.length, 30, "2b. exactly thirty seeded lessons");
  // Non-vacuity: the parse really read the seed.
  assert.ok(seedSkills.includes("hosa-patient-communication") && seedLessons.includes("mun-diplomacy-3"),
    "2c. control: the seed parse found real slugs");

  // ---- 3-4. every legacy slug resolves ----------------------------------------------------------
  const legacyAliases = EDUCATION_SLUG_ALIASES.map((a) => a.legacySlug);
  let redirects = 0;
  let compat = 0;
  for (const slug of [...SEEDED_LESSON_SLUGS, ...SEEDED_SKILL_SLUGS, ...legacyAliases]) {
    const r = resolveSkillsSlug(slug);
    assert.notEqual(r.kind, "unknown", `3. legacy slug "${slug}" must resolve, never 404`);
    if (r.kind === "canonical-redirect") {
      redirects += 1;
      assert.ok(getEducationLesson(r.lessonId), `3b. "${slug}" redirects to a REGISTERED lesson (${r.lessonId})`);
      assert.equal(getEducationLesson(r.lessonId)?.visibility, "learner", `3c. "${slug}" never redirects to internal content`);
    } else if (r.kind === "compatibility") {
      compat += 1;
    }
  }
  assert.equal(redirects + compat, 44, "4. all 30 lessons + 10 skills + 4 aliases are accounted for");
  assert.equal(redirects, 6, "4b. exactly six redirect (3 allowlisted + 3 active aliases)");
  assert.equal(compat, 38, "4c. and the remaining 38 render the honest compatibility state");

  // ---- 5. the allowlist is exactly the audited three -------------------------------------------
  assert.deepEqual(Object.keys(CANONICAL_REDIRECTS).sort(),
    ["debate-claim-building", "debate-claim-building-1", "debate-rebuttal"],
    "5. only the three hand-audited slugs redirect");
  for (const notRedirected of ["debate-claim-building-2", "debate-claim-building-3", "debate-rebuttal-1", "debate-rebuttal-2", "debate-rebuttal-3"]) {
    assert.equal(resolveSkillsSlug(notRedirected).kind, "compatibility",
      `5b. "${notRedirected}" is a DIFFERENT subject and must not be silently redirected`);
  }

  // ---- 6-9. alias contract ----------------------------------------------------------------------
  assert.equal(EDUCATION_SLUG_ALIASES.length, 4, "6. exactly four aliases");
  const byLegacy = new Map(EDUCATION_SLUG_ALIASES.map((a) => [a.legacySlug, a]));
  assert.equal(byLegacy.get("debate-claim-warrant-impact-lesson")?.status, "active", "7a. CWI alias active");
  assert.equal(byLegacy.get("debate-refutation-lesson")?.status, "active", "7b. refutation alias active");
  assert.equal(byLegacy.get("debate-signposting-lesson")?.status, "active", "7c. signposting alias active");
  assert.equal(byLegacy.get("debate-signposting-lesson")?.targetKind, "lesson",
    "7d. and its targetKind is corrected to lesson — debate-signposting is a lesson id, not a skill");
  assert.equal(byLegacy.get("debate-weighing-lesson")?.status, "compatibility-active", "8. weighing is compatibility-active");
  assert.equal(resolveSkillsSlug("debate-weighing-lesson").kind, "compatibility",
    "8b. and resolves to a compatibility page, never to the HELD authored weighing lesson");
  for (const [slug, lessonId] of [["debate-claim-warrant-impact-lesson", "claim-warrant-impact"],
                                  ["debate-refutation-lesson", "debate-refutation"],
                                  ["debate-signposting-lesson", "debate-signposting"]] as const) {
    const r = resolveSkillsSlug(slug);
    assert.equal(r.kind === "canonical-redirect" ? r.lessonId : null, lessonId, `9. "${slug}" -> /lessons/${lessonId}`);
  }
  assert.equal(EDUCATION_SLUG_ALIASES.filter((a) => a.status === "planned").length, 0,
    "9b. no alias is left pretending; every one now has real behaviour");

  // ---- 10. the judge producer emits resolvable ids ----------------------------------------------
  const emitted = [...stripComments(judge).matchAll(/lessonSlug:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(emitted.length >= 4, "10a. control: the producer really was scanned");
  for (const slug of new Set(emitted)) {
    assert.notEqual(resolveSkillsSlug(slug).kind, "unknown", `10. new judge reports emit resolvable "${slug}"`);
    assert.ok(!slug.endsWith("-lesson"), `10b. and no deprecated "${slug}" is emitted any more`);
  }

  // ---- 11. AI fallbacks emit nothing broken ------------------------------------------------------
  // Comment-stripped: the comment explaining the removal necessarily names the removed slugs.
  const aiCode = stripComments(ai);
  const block = aiCode.slice(aiCode.indexOf("const defaults: Record<Organization, string[]>"));
  const defaultsBlock = block.slice(0, block.indexOf("};"));
  for (const slug of [...defaultsBlock.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1])) {
    assert.notEqual(resolveSkillsSlug(slug).kind, "unknown", `11. AI fallback "${slug}" resolves`);
  }
  for (const gone of ["model-un-resolution-writing-1", "model-un-diplomacy-1", "mock-trial-case-theory-1", "public-speaking-delivery-1"]) {
    assert.ok(!defaultsBlock.includes(gone), `11b. the broken fallback "${gone}" is gone`);
  }
  assert.ok(/MODEL_UN: \[\]/.test(defaultsBlock) && /MOCK_TRIAL: \[\]/.test(defaultsBlock) && /PUBLIC_SPEAKING: \[\]/.test(defaultsBlock),
    "11c. and they are empty rather than renamed onto retired-track content");

  // ---- 12-13. no filler, no missing-field fallback prose -----------------------------------------
  for (const signature of EDUCATION_GENERIC_FILLER_SIGNATURES) {
    assert.ok(!stripComments(detail).includes(signature), `12. the detail page no longer contains "${signature.slice(0, 36)}…"`);
  }
  assert.ok(!stripComments(detail).includes("prisma"), "13. and it no longer reads Lesson.content from the database at all");
  assert.ok(!/guidedPractice|independentPractice|masteryQuiz|parseLessonContent/.test(stripComments(detail)),
    "13b. the seed-content rendering path is gone");

  // ---- 14-16. no fake mastery, no unearnable XP --------------------------------------------------
  // Comment-stripped: the doc comments explaining WHAT WAS REMOVED necessarily quote the old
  // framings ("Mastery Path", the demo percentages), so a raw scan would match the explanation.
  for (const [label, src] of [["detail", stripComments(detail)], ["index", stripComments(index)]] as const) {
    assert.ok(!/Mastery Path|Mastery Map/.test(src), `14. "${label}" no longer claims mastery`);
    assert.ok(!/masteryProgress|<Progress/.test(src), `15. "${label}" has no position-derived progress bar`);
    assert.ok(!/\d+\s*%/.test(src), `15b. "${label}" shows no percentage`);
  }
  // Control: the pre-change files really did carry what the scan looks for.
  const headDetail = execSync("git show HEAD:'app/(app)/skills/[slug]/page.tsx'", { encoding: "utf8" });
  assert.ok(/Mastery Path/.test(stripComments(headDetail)), "14b. control: the scan finds the old fake mastery at HEAD");
  const headIndex = execSync("git show HEAD:components/skills/skill-path.tsx", { encoding: "utf8" });
  assert.ok(/Mastery Map/.test(stripComments(headIndex)), "14c. control: and the old index framing too");
  assert.ok(!stripComments(index).includes("mastery:"), "15c. the hardcoded demo mastery literals are gone");
  assert.ok(detail.includes("Step {resolution.step.index} of {resolution.step.total}"),
    "14b. truthful seeded ordering is retained as a position, not a percentage");
  // XP appears exactly once, inside the Debate-practice-supported branch.
  const xpMentions = (stripComments(detail).match(/XP/g) ?? []).length;
  assert.equal(xpMentions, 1, `16. XP is mentioned exactly once on the detail page (found ${xpMentions})`);
  const detailCode = stripComments(detail);
  assert.ok(detailCode.indexOf("practiceSupported ?") < detailCode.indexOf("XP"), "16b. and only inside the supported-practice branch");
  assert.ok(!detailCode.includes("xpReward"), "16c. the unearnable seeded xpReward badge is gone");

  // ---- 17-21. practice gating --------------------------------------------------------------------
  assert.ok(debateWritingPracticeSupported("debate-evidence-1"), "17. a Debate seeded lesson keeps writing practice");
  assert.ok(debateWritingPracticeSupported("debate-weighing"), "17b. and a Debate seeded skill does too");
  for (const slug of ["deca-marketing", "deca-roleplay-2", "hosa-medical-terminology", "hosa-patient-communication-3",
                      "mun-diplomacy-1", "mun-resolution-writing", "totally-unknown-slug", "claim-warrant-impact"]) {
    assert.ok(!debateWritingPracticeSupported(slug), `18-21. "${slug}" must NOT receive Debate writing practice`);
  }
  assert.ok(practice.includes("resolveSkillsSlug") && practice.includes("debatePracticeSupported"),
    "21b. the practice route gates on the resolved track");
  // Compare the CALL SITES, not the import lines (imports are alphabetical and prove nothing).
  const practiceBody = stripComments(practice).slice(stripComments(practice).indexOf("export default"));
  assert.ok(practiceBody.indexOf("resolveSkillsSlug(params.slug)") < practiceBody.indexOf("getDebateSkillScenario(params.slug"),
    "21c. and gates BEFORE building a debate scenario");
  assert.ok(practiceBody.indexOf("debatePracticeSupported") < practiceBody.indexOf("getDebateSkillScenario(params.slug"),
    "21c2. the unsupported branch returns before any scenario is built");
  assert.ok(practice.includes("notFound()"), "21d. unknown fails closed");

  // ---- 22. Study Arcade source is track-safe ------------------------------------------------------
  assert.ok(review.includes("debateWritingPracticeSupported"), "22. the review card decides its own destination by track");
  assert.ok(/reassessable \? `\/skills\/\$\{review\.skillSlug\}\/practice` : fallback\.href/.test(review),
    "22b. unsupported reviews link to the track's own tool");
  assert.ok(/reassessable \? "Reassess now" : fallback\.label/.test(review),
    "22c. and never say \"Reassess now\" when no reassessment exists");

  // ---- 23. track-aware destinations --------------------------------------------------------------
  assert.equal(COMPAT_TRACK_DESTINATION.DEBATE.href, "/lessons?track=debate", "23a. Debate destination");
  assert.equal(COMPAT_TRACK_DESTINATION.DECA.href, "/training/deca/practice", "23b. DECA destination");
  assert.equal(COMPAT_TRACK_DESTINATION.HOSA.href, "/training/hosa/events", "23c. HOSA destination");
  assert.equal(COMPAT_TRACK_DESTINATION.MODEL_UN.href, "/training", "23d. retired MUN destination");
  assert.ok(!/href="\/debate"/.test(stripComments(detail)), "23e. the unconditional /debate final action is gone");
  for (const [slug, track] of [["deca-marketing-1", "DECA"], ["hosa-medical-terminology-2", "HOSA"],
                               ["mun-diplomacy-3", "MODEL_UN"], ["debate-evidence-2", "DEBATE"]] as const) {
    assert.equal(compatTrackForSlug(slug), track, `23f. "${slug}" resolves to ${track}`);
  }
  assert.ok(!/simulation/i.test(stripComments(detail) + stripComments(practice)), "23g. no HOSA simulation is introduced");

  // ---- 24-26. the index is truthful ---------------------------------------------------------------
  assert.ok(index.includes("Skills in this track"), "24. the index heading is truthful");
  for (const gone of ["deca-reading-scenarios", "hosa-medical-terminology-basics", "public-speaking-delivery-1",
                      "Not started", "Adaptive lessons", "Complete the earlier lessons to unlock"]) {
    assert.ok(!stripComments(index).includes(gone), `25. the fictional index entry/label "${gone}" is gone`);
  }
  assert.ok(!stripComments(index).includes("status: \"locked\""), "25b. and the permanently locked row is gone");
  // Every Debate tile points at a registered learner-visible lesson.
  const debateIds = educationLessonsForTrack("GENERAL_DEBATE").map((e) => e.id);
  assert.deepEqual(debateIds,
    ["claim-warrant-impact", "debate-signposting", "debate-clash", "debate-refutation", "debate-constructive-speeches"],
    "26. the index lists the five real Debate lessons in teaching order");

  // ---- 27-29. M13E1B education is untouched --------------------------------------------------------
  for (const file of ["lib/learning-content.ts", "lib/lessons.ts", "lib/roleplay-lessons.ts",
                      "lib/education/registry.ts", "lib/education/tracks/debate.ts",
                      "components/lessons/concept-education-lesson-view.tsx",
                      "components/lessons/concept-education-lesson-practice.tsx",
                      "components/lessons/lesson-view.tsx", "components/lessons/lesson-practice.tsx",
                      "app/(app)/lessons/page.tsx", "app/(app)/lessons/[slug]/page.tsx",
                      "lib/assignments.ts", "lib/assignment-types.ts", "lib/spaced-review.ts",
                      "prisma/schema.prisma", "prisma/seed.ts", "app/api/skills/debate-writing/route.ts"]) {
    assert.equal(nowSha(file), headSha(file), `27. ${file} is byte-identical to HEAD`);
  }
  assert.equal(EDUCATION_LESSONS.length, 7, "28. still exactly seven canonical lessons");
  for (const held of ["debate-weighing", "debate-rebuttal-speeches", "debate-parliamentary-roles",
                      "debate-case-topic-definitions", "debate-claim-warrant-impact"]) {
    assert.ok(!EDUCATION_LESSONS.some((e) => e.id === held), `29. held lesson "${held}" is still not registered`);
  }

  // ---- 30. validation is clean, with the manifest supplied -----------------------------------------
  assert.deepEqual(validateEducationRegistry(withManifest), [],
    `30. the real registry validates cleanly; got ${JSON.stringify(validateEducationRegistry(withManifest))}`);

  // ---- NON-VACUOUS CONTROLS -----------------------------------------------------------------------
  const weighing = EDUCATION_SLUG_ALIASES.find((a) => a.legacySlug === "debate-weighing-lesson");
  assert.ok(weighing, "controls: the weighing alias exists");
  control("compatibility alias targeting an unseeded slug", "ALIAS_COMPAT_UNKNOWN_TARGET",
    EDUCATION_SLUG_ALIASES.map((a) => (a === weighing ? { ...a, target: "not-a-seeded-slug" } : a)));
  control("compatibility alias whose target is canonical", "ALIAS_COMPAT_SHADOWS_CANONICAL",
    EDUCATION_SLUG_ALIASES.map((a) => (a === weighing ? { ...a, target: "debate-rebuttal" } : a)));
  control("active alias targeting an unregistered skill", "ALIAS_UNKNOWN_TARGET",
    EDUCATION_SLUG_ALIASES.map((a) =>
      a.legacySlug === "debate-refutation-lesson" ? { ...a, target: "no-such-skill" } : a));
  assert.equal(controlsRun.length, 3, "3 alias controls ran");
  // A compatibility alias with NO manifest supplied must also be reported, never silently accepted.
  const noManifest = validateEducationRegistry({ ...EDUCATION_REGISTRY });
  assert.ok(noManifest.some((i) => i.code === "ALIAS_COMPAT_UNKNOWN_TARGET"),
    "control: omitting the manifest reports the compatibility alias rather than passing it");

  // ---- database safety ------------------------------------------------------------------------------
  for (const file of ["lib/education/skills-compat.ts", "components/skills/skill-path.tsx",
                      "app/(app)/skills/[slug]/page.tsx", "app/(app)/skills/[slug]/practice/page.tsx"]) {
    const code = stripComments(read(file));
    for (const banned of ["@/lib/prisma", "prisma.", "PrismaClient", "recordDrillMastery", "db push"]) {
      assert.ok(!code.includes(banned), `31. ${file} performs no ${banned}`);
    }
  }

  console.log(
    `Skills-compat smoke passed: all 44 legacy identifiers resolve — 30 seeded lesson slugs, 10 seeded skill slugs and 4 historical judge slugs — with 6 permanent redirects to real authored lessons and 38 honest compatibility pages, and zero 404s. The static manifest is proven equal to prisma/seed.ts by parsing that file, so no database is touched. Only the three hand-audited slugs redirect: debate-claim-building, debate-claim-building-1 and debate-rebuttal; debate-claim-building-2/-3 and all three debate-rebuttal-* are different subjects and render the compatibility state rather than silently becoming another lesson. All four aliases now have real behaviour — CWI, refutation and signposting redirect canonically (signposting's targetKind corrected from skill to lesson), and weighing is compatibility-active because its authored lesson is held. The judge producer emits only resolvable ids, the four broken AI fallbacks are empty rather than renamed onto retired-track content, the seed-content rendering path and every generic substitute are gone, no percentage or mastery claim survives on either surface, XP appears exactly once and only beside the Debate practice that awards it, and no DECA, HOSA, retired Model UN or unknown slug can reach a Debate motion — including from the Study Arcade review card, which now names its own track's destination. ${controlsRun.length} alias controls each produced their exact issue code.`
  );
}

main();
