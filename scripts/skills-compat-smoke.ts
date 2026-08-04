import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
// THE PRODUCTION MODULES — never a mirrored copy of their logic.
import {
  ACTIVATION_PENDING_SKILLS,
  CANONICAL_REDIRECTS,
  COMPAT_TRACK_DESTINATION,
  INTENDED_SKILL_INVENTORY,
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

// ---- M13E2 Phase A: additive practice-session schema control ----------------------------------------
// prisma/schema.prisma was byte-pinned to a MOVING `HEAD` here until M13E2 Phase A. A HEAD-relative pin
// turns green the moment the schema commit lands, so it proved nothing at the only time it mattered:
// before the commit. It is replaced by an immutable control at the pre-M13E2 commit plus structural
// assertions -- every historical model and enum survives byte-for-byte, `User` gains exactly one virtual
// back-relation, and the two new models arrive with exactly the approved fields, constraints and indexes.
const PRE_M13E2 = "95fdd4c812328728766de2f518b38da618bab3cb";
const M13E2_NEW_BLOCKS = ["model PracticeSession", "model PracticeSessionItem",
                          "enum PracticeSessionKind", "enum PracticeSessionStatus"];
const M13E2_USER_FIELD = "practiceSessions PracticeSession[]";
// name -> normalized body lines (comments stripped, runs of whitespace collapsed) so a rename, retype,
// nullability flip, default change or attribute change all surface as a body mismatch.
const schemaBlocks = (src: string) => {
  const out = new Map<string, string[]>();
  for (const m of src.matchAll(/^(model|enum)[ \t]+(\w+)[ \t]*\{([\s\S]*?)^\}/gm)) {
    out.set(`${m[1]} ${m[2]}`,
      m[3].split("\n").map((l) => l.replace(/\/\/.*$/, "").replace(/\s+/g, " ").trim()).filter(Boolean));
  }
  return out;
};
// THROWS on any non-additive change. It never returns a boolean, so the same function backs both the
// real check and the in-memory failing controls below -- a silent `false` would be a vacuous assertion.
function assertAdditiveSchema(now: string, parent: string) {
  const was = schemaBlocks(parent);
  const is = schemaBlocks(now);
  for (const name of M13E2_NEW_BLOCKS) {
    if (was.has(name)) throw new Error(`the parent schema already defined ${name}`);
    if (!is.has(name)) throw new Error(`the working schema is missing ${name}`);
  }
  if (parent.includes(M13E2_USER_FIELD)) throw new Error("the parent schema already had the User back-relation");
  for (const [name, body] of was) {
    const next = is.get(name);
    if (!next) throw new Error(`${name} was removed`);
    if (name === "model User") {
      const gained = next.filter((l) => !body.includes(l));
      const lost = body.filter((l) => !next.includes(l));
      if (lost.length > 0) throw new Error(`User lost ${lost.join(" | ")}`);
      if (gained.length !== 1 || gained[0] !== M13E2_USER_FIELD) {
        throw new Error(`User gained ${gained.join(" | ") || "nothing"} instead of exactly the back-relation`);
      }
    } else if (next.join("\n") !== body.join("\n")) {
      throw new Error(`${name} is not structurally identical to the parent`);
    }
  }
  const session = is.get("model PracticeSession")!.join("\n");
  const item = is.get("model PracticeSessionItem")!.join("\n");
  for (const required of ["userId String", "kind PracticeSessionKind", "track SkillTrack", "skillSlug String?",
                          "status PracticeSessionStatus @default(ISSUED)", "issuedAt DateTime @default(now())",
                          "expiresAt DateTime", "completedAt DateTime?", "purgeAfter DateTime",
                          "resultJson Json?", "scenarioJson Json?", "requestedAreas String[] @default([])",
                          "updatedAt DateTime @updatedAt", "items PracticeSessionItem[]",
                          "user User @relation(fields: [userId], references: [id], onDelete: Cascade)",
                          "@@index([userId, kind, status, expiresAt])", "@@index([userId, purgeAfter])"]) {
    if (!session.includes(required)) throw new Error(`PracticeSession is missing ${required}`);
  }
  for (const required of ["sessionId String", "bankQuestionId String", "displayOrder Int",
                          "promptSnapshot String @db.Text", "choicesJson Json", "correctOptionId String",
                          "explanationSnapshot String @db.Text", "area String", "skillSlug String",
                          "selectedOptionId String?", "isCorrect Boolean?", "answeredAt DateTime?",
                          "updatedAt DateTime @updatedAt",
                          "session PracticeSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)",
                          "@@unique([sessionId, bankQuestionId])", "@@unique([sessionId, displayOrder])"]) {
    if (!item.includes(required)) throw new Error(`PracticeSessionItem is missing ${required}`);
  }
  const added = [session, item, is.get("enum PracticeSessionKind")!.join("\n"),
                 is.get("enum PracticeSessionStatus")!.join("\n")].join("\n");
  for (const banned of ["PROCESSING", "FAILED", "ABANDONED", "claimedAt", "activeKey", "token", "nonce",
                        "@@index([status, expiresAt])", "@@index([sessionId])"]) {
    if (added.includes(banned)) throw new Error(`the new definitions carry an unapproved ${banned}`);
  }
  if (is.get("enum PracticeSessionStatus")!.join(",") !== "ISSUED,COMPLETED") {
    throw new Error("PracticeSessionStatus is not exactly ISSUED,COMPLETED");
  }
  if (is.get("enum PracticeSessionKind")!.join(",") !== "DEBATE_DRILL,DECA_DRILL,HOSA_MEDTERM,DEBATE_WRITING") {
    throw new Error("PracticeSessionKind is not exactly the four approved kinds");
  }
}

const read = (p: string) => readFileSync(p, "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "")).join("\n");
const headSha = (p: string) => execSync(`git show HEAD:'${p}' | shasum -a 256`, { encoding: "utf8" }).split(" ")[0];
const nowSha = (p: string) => execSync(`shasum -a 256 '${p}'`, { encoding: "utf8" }).split(" ")[0];

/** M13E1C's parent — the last commit that still contained the fictional `/skills` mastery framing. */
const PRE_M13E1C = "5bf3077dd83d1598b42d2dba227b99defb9df1ad";

// A stub Prisma client, installed BEFORE `lib/prisma` is ever loaded (that module reads
// `globalThis.prisma` before constructing a client, so no client is built and no connection opens).
// Used only to prove the BOOLEAN contract of `recordDrillMastery` is still backward-compatible.
const stub = { mode: "found" as "found" | "missing" | "write-throws" };
const stubPrisma = {
  skill: { findUnique: async () => (stub.mode === "missing" ? null : { id: "stub-skill-id" }) },
  masteryProgress: {
    findUnique: async () => null,
    create: async () => { if (stub.mode === "write-throws") throw new Error("simulated write failure"); return {}; },
    update: async () => { if (stub.mode === "write-throws") throw new Error("simulated write failure"); return {}; }
  },
  skillReviewSchedule: {
    findUnique: async () => null, create: async () => ({}), update: async () => ({}),
    count: async () => 0, findMany: async () => []
  }
};
(globalThis as unknown as { prisma?: unknown }).prisma = stubPrisma;

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

async function main() {
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
  //
  // PINNED TO THE PRE-M13E1C COMMIT, NOT `HEAD`. These read `git show HEAD:` until M13E1D, which was
  // a mistake: `HEAD` moves, and once M13E1C (the commit that DELETED this copy) became `HEAD`, the
  // control could never hold again. A control that proves history existed must name that history.
  const beforeDetail = execSync(`git show ${PRE_M13E1C}:'app/(app)/skills/[slug]/page.tsx'`, { encoding: "utf8" });
  assert.ok(/Mastery Path/.test(stripComments(beforeDetail)),
    `14b. control: the scan finds the old fake mastery at ${PRE_M13E1C.slice(0, 8)}`);
  const beforeIndex = execSync(`git show ${PRE_M13E1C}:components/skills/skill-path.tsx`, { encoding: "utf8" });
  assert.ok(/Mastery Map/.test(stripComments(beforeIndex)), "14c. control: and the old index framing too");
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
                      "lib/assignments.ts", "lib/assignment-types.ts",
                      // lib/spaced-review.ts is deliberately absent — see 27b. M13E1D adds a detailed
                      // persistence result there on purpose, so a blanket hash would forbid an
                      // approved change instead of protecting the compatibility contract.
                      // app/api/skills/debate-writing/route.ts is deliberately absent from M13E1G
                      // onward — see 27i. Its review/mastery ORDER changed; its contract did not.
                      "prisma/seed.ts"]) {
    assert.equal(nowSha(file), headSha(file), `27. ${file} is byte-identical to HEAD`);
  }

  // ---- PA1-PA16. M13E2 Phase A: prisma/schema.prisma changed only by ADDING -----------------------------
  const schemaAtM13E2Parent = execSync(`git show ${PRE_M13E2}:prisma/schema.prisma`, { encoding: "utf8" });
  const schemaNow = readFileSync("prisma/schema.prisma", "utf8");
  for (const name of M13E2_NEW_BLOCKS) {
    assert.ok(!schemaAtM13E2Parent.includes(`${name} {`), `PA1. at ${PRE_M13E2.slice(0, 8)} the schema had no ${name}`);
    assert.ok(schemaNow.includes(`${name} {`), `PA2. the working schema defines ${name}`);
  }
  assert.ok(!schemaAtM13E2Parent.includes(M13E2_USER_FIELD), "PA3. and no User.practiceSessions back-relation");
  assertAdditiveSchema(schemaNow, schemaAtM13E2Parent); // PA4. additive practice-session definitions only
  assert.equal(schemaBlocks(schemaNow).size, schemaBlocks(schemaAtM13E2Parent).size + 4,
    "PA5. exactly four new schema blocks (2 models + 2 enums) and nothing else");
  assert.ok(!existsSync("prisma/migrations"), "PA6. Phase A introduces no migration directory");
  assert.ok(existsSync("prisma/schema.prisma"), "PA6b. control: existsSync does report a path that exists");
  // M13E2 C1 adds approved shared helpers under lib/. They are wired to NO route yet, so this check
  // narrows from "nothing references the new models" to "only these four helpers may". The property
  // that actually matters before the C2 cutover is unchanged and now asserted directly: no route and
  // no component touches the practice-session tables.
  const M13E2_C1_ALLOWED = ["lib/practice-session.ts", "lib/spaced-review.ts", "lib/xp.ts", "lib/validators.ts"];
  let m13e2RuntimeRefs: string[] = [];
  try {
    m13e2RuntimeRefs = execSync('grep -rli "practicesession" app lib components', { encoding: "utf8" })
      .trim().split("\n").filter(Boolean);
  } catch {
    m13e2RuntimeRefs = []; // grep exits non-zero when nothing matches, which is also a passing case
  }
  assert.deepEqual(m13e2RuntimeRefs.filter((f) => !M13E2_C1_ALLOWED.includes(f)), [],
    "PA7. only the approved C1 helpers reference the new models");
  for (const f of m13e2RuntimeRefs) {
    assert.ok(!f.startsWith("app/") && !f.startsWith("components/"),
      `PA7a. no route or component references them before the C2 cutover (${f})`);
  }
  assert.ok(/practicesession/i.test("await prisma.practiceSession.findFirst()"),
    "PA7b. control: that scan does match a real runtime usage");
  assert.deepEqual(
    ["app/api/deca/drills/submit/route.ts", "components/training/concept-drills.tsx", "lib/practice-session.ts"]
      .filter((f) => !M13E2_C1_ALLOWED.includes(f)),
    ["app/api/deca/drills/submit/route.ts", "components/training/concept-drills.tsx"],
    "PA7c. control: the allowlist rejects a route and a component while permitting an approved helper");
  const m13e2Sha = (p: string) => execSync(`shasum -a 256 '${p}'`, { encoding: "utf8" }).split(" ")[0];
  assert.notEqual(m13e2Sha("prisma/seed.ts"), m13e2Sha("prisma/schema.prisma"),
    "PA8. control: the surviving seed byte pin's hash does vary with file content");

  // Non-vacuous controls: every one mutates the schema IN MEMORY and proves the checker rejects it.
  const m13e2Rejects = (label: string, mutate: (s: string) => string) => {
    const mutated = mutate(schemaNow);
    assert.notEqual(mutated, schemaNow, `PA. the ${label} control actually changed the schema text`);
    assert.throws(() => assertAdditiveSchema(mutated, schemaAtM13E2Parent), `PA. the check rejects ${label}`);
  };
  m13e2Rejects("a changed existing field type", (s) => s.replace(/reviewCount(\s+)Int/, "reviewCount$1String"));
  m13e2Rejects("a removed existing field", (s) => s.replace(/\n[ \t]+lastOutcome[^\n]*/, ""));
  m13e2Rejects("an unapproved field on an existing model",
    (s) => s.replace("model SkillReviewSchedule {", "model SkillReviewSchedule {\n  sneaky String?"));
  m13e2Rejects("a removed User back-relation", (s) => s.replace(/\n[ \t]+practiceSessions[ \t]+PracticeSession\[\]/, ""));
  m13e2Rejects("an extra unapproved User field",
    (s) => s.replace(/([ \t]+practiceSessions[ \t]+PracticeSession\[\])/, "$1\n  sneaky String?"));
  m13e2Rejects("an omitted [userId, kind, status, expiresAt] index",
    (s) => s.replace("@@index([userId, kind, status, expiresAt])", ""));
  m13e2Rejects("an omitted [userId, purgeAfter] index", (s) => s.replace("@@index([userId, purgeAfter])", ""));
  m13e2Rejects("an unapproved global [status, expiresAt] index",
    (s) => s.replace("@@index([userId, purgeAfter])", "@@index([userId, purgeAfter])\n  @@index([status, expiresAt])"));
  m13e2Rejects("a redundant standalone [sessionId] index",
    (s) => s.replace("@@unique([sessionId, displayOrder])", "@@unique([sessionId, displayOrder])\n  @@index([sessionId])"));
  m13e2Rejects("a removed unique constraint", (s) => s.replace("@@unique([sessionId, bankQuestionId])", ""));
  m13e2Rejects("a PROCESSING status", (s) => s.replace(/(enum PracticeSessionStatus \{\n[ \t]+ISSUED)/, "$1\n  PROCESSING"));
  m13e2Rejects("a claimedAt column", (s) => s.replace(/([ \t]+purgeAfter[ \t]+DateTime\n)/, "$1  claimedAt DateTime?\n"));

  // ---- 27b. what the lib/spaced-review hash was protecting, asserted exactly --------------------------
  // The compatibility layer must never become a writer, and the mastery contract every existing
  // caller depends on must remain the same shape.
  const spacedReview = read("lib/spaced-review.ts");
  assert.ok(/export async function recordDrillMastery\(/.test(spacedReview),
    "27b. the boolean recordDrillMastery export is still available under its original name");
  assert.ok(/Promise<boolean>/.test(spacedReview), "27b2. and still returns a boolean");
  assert.ok(/export async function recordDrillMasteryDetailed\(/.test(spacedReview),
    "27b3. the detailed result is added beside it, never replacing it");
  // Backward compatibility, run for real against the stub: true ONLY for `updated`.
  const { recordDrillMastery, recordDrillMasteryDetailed } = await import("../lib/spaced-review");
  assert.equal((globalThis as unknown as { prisma?: unknown }).prisma, stubPrisma,
    "27c. control: the stub is the module's client — no PrismaClient was constructed, no database touched");
  stub.mode = "found";
  assert.equal((await recordDrillMasteryDetailed({ userId: "u", skillSlug: "s", scorePercent: 80, passed: true })).status,
    "updated", "27d. a successful write is `updated`");
  assert.equal(await recordDrillMastery({ userId: "u", skillSlug: "s", scorePercent: 80, passed: true }), true,
    "27d2. and the boolean form is true only for it");
  stub.mode = "missing";
  assert.equal((await recordDrillMasteryDetailed({ userId: "u", skillSlug: "s", scorePercent: 80, passed: true })).status,
    "skill-missing", "27e. an absent row is `skill-missing`");
  assert.equal(await recordDrillMastery({ userId: "u", skillSlug: "s", scorePercent: 80, passed: true }), false,
    "27e2. and the boolean form is false");
  stub.mode = "write-throws";
  assert.equal((await recordDrillMasteryDetailed({ userId: "u", skillSlug: "s", scorePercent: 80, passed: true })).status,
    "write-failed", "27f. a failed write is `write-failed`");
  assert.equal(await recordDrillMastery({ userId: "u", skillSlug: "s", scorePercent: 80, passed: true }), false,
    "27f2. and the boolean form is false — the two failure modes are indistinguishable to it, as before");
  stub.mode = "found";
  // No /skills route gains database-writing behaviour (the compatibility surface stays read-only).
  for (const file of ["app/(app)/skills/page.tsx", "app/(app)/skills/[slug]/page.tsx",
                      "app/(app)/skills/[slug]/practice/page.tsx", "components/skills/skill-path.tsx",
                      "lib/education/skills-compat.ts"]) {
    const code = stripComments(read(file));
    for (const banned of ["@/lib/spaced-review", "recordDrillMastery", "recordDrillMasteryDetailed",
                          "@/lib/prisma", "prisma.", "masteryProgress"]) {
      assert.ok(!code.includes(banned), `27g. ${file} gains no database-writing behaviour (${banned})`);
    }
  }

  // ---- 27i. what the debate-writing byte-pin was protecting, asserted exactly ------------------------
  const writingRoute = stripComments(read("app/api/skills/debate-writing/route.ts"));
  assert.ok(/gradeDebateWritingResponse\(/.test(writingRoute), "27i. grading is unchanged");
  assert.ok(/feedback\.score >= 70/.test(writingRoute), "27i2. and so is the threshold");
  assert.ok(/NextResponse\.json\(\{\s*scenario,\s*feedback\s*\}\)/.test(writingRoute.replace(/\s+/g, " ").replace(/NextResponse\.json\(\{ /, "NextResponse.json({\n        ")) ||
            /scenario,[\s\S]{0,40}feedback/.test(writingRoute.slice(writingRoute.indexOf("NextResponse.json"))),
    "27i3. the response shape is still { scenario, feedback } — no review field was added");
  assert.ok(!/review:/.test(writingRoute.slice(writingRoute.indexOf("NextResponse.json"))),
    "27i4. and no review result leaks into it");
  assert.ok(/XP_REWARDS\.lessonCompleted/.test(writingRoute) && /xPLog\.create/.test(writingRoute),
    "27i5. XP behaviour is unchanged");
  assert.ok(writingRoute.indexOf("recordPracticeOutcome(") < writingRoute.indexOf("prisma.$transaction"),
    "27i6. review is resolved BEFORE the mastery/XP transaction, so one due window has one winner");
  for (const banned of ["enforceRateLimit", "REQUIRED_UNIQUE", "sessionId", "reviewToken"]) {
    assert.ok(!writingRoute.includes(banned), `27i7. no ${banned} was added by this milestone`);
  }

  // ---- 27h. the three activation-pending DECA skills --------------------------------------------------
  // They resolve as DECA-safe destinations BEFORE the activation script has been run, and they are
  // kept separately identified from the seeded ten so the seed mirror above stays exact.
  assert.deepEqual(ACTIVATION_PENDING_SKILLS.map((s) => s.slug),
    ["deca-performance-indicators", "deca-business-reasoning", "deca-customer-relations"],
    "27h. exactly the three activation-pending skills");
  assert.equal(INTENDED_SKILL_INVENTORY.length, SEEDED_SKILLS.length + ACTIVATION_PENDING_SKILLS.length,
    "27h2. the intended inventory is the seeded ten plus those three, with no overlap");
  for (const skill of ACTIVATION_PENDING_SKILLS) {
    assert.ok(!SEEDED_SKILL_SLUGS.includes(skill.slug),
      `27h3. "${skill.slug}" is NOT claimed as seeded — prisma/seed.ts does not create it`);
    assert.equal(compatTrackForSlug(skill.slug), "DECA", `27h4. "${skill.slug}" resolves as DECA`);
    const r = resolveSkillsSlug(skill.slug);
    assert.equal(r.kind === "compatibility" ? r.destination.href : null, "/training/deca/practice",
      `27h5. "${skill.slug}" is sent to DECA practice`);
    assert.ok(!debateWritingPracticeSupported(skill.slug),
      `27h6. and no DECA skill resolves into Debate writing practice`);
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
    `Skills-compat smoke passed: all 44 legacy identifiers resolve — 30 seeded lesson slugs, 10 seeded skill slugs and 4 historical judge slugs — with 6 permanent redirects to real authored lessons and 38 honest compatibility pages, and zero 404s. The static manifest is proven equal to prisma/seed.ts by parsing that file, so no database is touched. Only the three hand-audited slugs redirect: debate-claim-building, debate-claim-building-1 and debate-rebuttal; debate-claim-building-2/-3 and all three debate-rebuttal-* are different subjects and render the compatibility state rather than silently becoming another lesson. All four aliases now have real behaviour — CWI, refutation and signposting redirect canonically (signposting's targetKind corrected from skill to lesson), and weighing is compatibility-active because its authored lesson is held. The judge producer emits only resolvable ids, the four broken AI fallbacks are empty rather than renamed onto retired-track content, the seed-content rendering path and every generic substitute are gone, no percentage or mastery claim survives on either surface, XP appears exactly once and only beside the Debate practice that awards it, and no DECA, HOSA, retired Model UN or unknown slug can reach a Debate motion — including from the Study Arcade review card, which now names its own track's destination. The two historical controls are pinned to ${PRE_M13E1C.slice(0, 8)} rather than a moving HEAD, so they prove the fiction existed instead of silently expiring the moment it was removed. lib/spaced-review.ts is no longer blanket-hashed: recordDrillMastery keeps its boolean export and returns true only for 'updated', false for both 'skill-missing' and 'write-failed', proven against a stub client with no database contact, and the three activation-pending DECA drill skills resolve to /training/deca/practice while staying out of the seed mirror until the activation script is run. ${controlsRun.length} alias controls each produced their exact issue code.`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
