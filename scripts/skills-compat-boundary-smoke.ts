/**
 * SKILLS-COMPATIBILITY CAPABILITY-BOUNDARY SMOKE — strict-safe.
 *
 * WHY THIS SUITE EXISTS SEPARATELY FROM `skills-compat:smoke`.
 * `scripts/skills-compat-smoke.ts` is classified env-tainted and must not run during strict no-env
 * validation. Its own closure reaches `node:child_process` and `node:fs`, so it can leave the
 * process. This suite proves the capability boundary WITHOUT that reach: it imports only
 * `lib/education/skills-compat` and `lib/debate-skill-practice`, whose combined transitive
 * value-import closure is nine local modules and ZERO bare packages — no `@prisma/client`, no
 * dotenv, no `@next/env`, no `lib/prisma`, no `lib/api`, no provider code, no filesystem, no child
 * process. That is what makes this the executable proof for the milestone.
 *
 * WHAT IT PROVES — three capabilities that are deliberately NOT equivalent:
 *   KNOWN / INTENDED-PERSISTED   — is this a skill the platform means to persist?
 *   SECURE-DRILL TARGET          — can drill evidence be attributed to it?
 *   WRITING-PRACTICE SUPPORTED   — does it have its own authored writing scenario?
 * Before the repair the gate read `skill.track === "DEBATE"` alone, so the first implied the third,
 * and `aliasFor` silently substituted the claim-building scenario for any slug lacking its own.
 * Eight slugs were served another skill's practice under their own skill's name.
 */
import assert from "node:assert/strict";
import {
  ACTIVATION_PENDING_SKILLS,
  INTENDED_SKILL_INVENTORY,
  INTENDED_SKILL_SLUGS,
  SEEDED_SKILLS,
  debateWritingPracticeSupported,
  resolveSkillsSlug
} from "../lib/education/skills-compat";
import { getDebateSkillScenario, hasDebateWritingScenario } from "../lib/debate-skill-practice";

const NEW_SECURE_SKILLS = ["debate-flow-signposting", "debate-case-construction"] as const;

// A. NEW SKILL RECOGNITION -------------------------------------------------------------------------
for (const slug of NEW_SECURE_SKILLS) {
  const r = resolveSkillsSlug(slug);
  assert.equal(r.kind, "compatibility",
    `A1. "${slug}" resolves as a recognized skill — not canonical-redirect, not unknown`);
  assert.ok(INTENDED_SKILL_SLUGS.includes(slug),
    `A2. "${slug}" is in the intended persisted-skill inventory — real skills are never hidden to suppress UI`);
  assert.ok(ACTIVATION_PENDING_SKILLS.some((s) => s.slug === slug),
    `A3. "${slug}" is activation-pending: prisma/seed.ts does not create it, so the row is owner work`);
}
// A4. Control proving A1 can distinguish outcomes: a lesson id shadows, an invented slug is unknown.
assert.equal(resolveSkillsSlug("debate-signposting").kind, "canonical-redirect",
  "A4. control: the LESSON id still shadows as canonical-redirect, which is why the skill slugs differ from it");
assert.equal(resolveSkillsSlug("debate-not-a-real-slug-xyz").kind, "unknown",
  "A5. control: an unknown slug resolves unknown, so A1's 'compatibility' is a real discrimination");

// B. WRITING SUPPORT IS EXPLICIT, NEVER IMPLIED BY TRACK --------------------------------------------
for (const slug of NEW_SECURE_SKILLS) {
  assert.ok(!hasDebateWritingScenario(slug), `B1. "${slug}" has no authored writing scenario`);
  assert.ok(!debateWritingPracticeSupported(slug),
    `B2. "${slug}" therefore advertises NO writing practice, even though it is a known DEBATE skill`);
}
// B3. THE INVARIANT ITSELF, over every intended skill: support is never claimed without a scenario.
for (const slug of INTENDED_SKILL_SLUGS) {
  if (!debateWritingPracticeSupported(slug)) continue;
  assert.ok(hasDebateWritingScenario(slug),
    `B3. "${slug}" claims writing practice, so it MUST have its own scenario — no fallback, ever`);
}
// B4. Same invariant across the seeded LESSON slugs, which resolve through a different branch.
for (const lessonSlug of SEEDED_SKILLS.flatMap((s) => s.lessonSlugs)) {
  if (!debateWritingPracticeSupported(lessonSlug)) continue;
  assert.ok(hasDebateWritingScenario(lessonSlug),
    `B4. lesson slug "${lessonSlug}" claims writing practice, so it MUST have its own scenario`);
}

// C + D. EVERY PREVIOUSLY MIS-SERVED SLUG NOW GETS ITS OWN SKILL ------------------------------------
// `skillName` names the scenario actually served. Pre-repair every row below answered
// "Claim, warrant, impact" via the silent fallback.
const OWN_SCENARIO: ReadonlyArray<readonly [string, string]> = [
  ["debate-evidence", "Evidence and support"],
  ["debate-evidence-1", "Evidence and support"],
  ["debate-evidence-2", "Evidence and support"],
  ["debate-evidence-3", "Evidence and support"],
  ["debate-rebuttal-2", "Refutation"],
  ["debate-rebuttal-3", "Refutation"],
  ["debate-weighing-1", "Weighing arguments"],
  ["debate-weighing-2", "Weighing arguments"],
  ["debate-weighing-3", "Weighing arguments"],
  ["debate-claim-building-2", "Claim, warrant, impact"],
  ["debate-claim-building-3", "Claim, warrant, impact"]
];
for (const [slug, skillName] of OWN_SCENARIO) {
  assert.ok(debateWritingPracticeSupported(slug), `D1. "${slug}" is writing-supported`);
  assert.equal(getDebateSkillScenario(slug).skillName, skillName,
    `D2. "${slug}" is served "${skillName}" — its OWN skill, not a stand-in`);
}
// D3. Exhaustiveness: no OTHER writing-supported slug is silently served claim-building. Any slug
//     answering "Claim, warrant, impact" must genuinely be a claim-building slug.
for (const slug of [...INTENDED_SKILL_SLUGS, ...SEEDED_SKILLS.flatMap((s) => s.lessonSlugs)]) {
  if (!debateWritingPracticeSupported(slug)) continue;
  if (getDebateSkillScenario(slug).skillName !== "Claim, warrant, impact") continue;
  assert.ok(slug.startsWith("debate-claim-"),
    `D3. "${slug}" is served the claim-building scenario but is not a claim-building slug — silent fallback`);
}

// E. FAIL CLOSED — no silent substitution ----------------------------------------------------------
assert.throws(() => getDebateSkillScenario("debate-flow-signposting"),
  /No Debate writing scenario is defined/,
  "E1. an unsupported slug throws a configuration error rather than borrowing another skill's scenario");
assert.throws(() => getDebateSkillScenario("debate-not-a-real-slug-xyz"),
  /No Debate writing scenario is defined/,
  "E2. and so does a wholly unknown slug");

// F. POSITIVE CONTROLS — real writing practice still works ------------------------------------------
assert.ok(debateWritingPracticeSupported("debate-evidence"),
  "F1. the Evidence skill still HAS writing practice — the repair fixed its scenario, it did not remove support");
assert.equal(getDebateSkillScenario("debate-claim-building-1").skillName, "Claim, warrant, impact",
  "F2. a genuine claim-building slug IS still claim-building, so D3 and the C/D rows are real checks");
assert.ok(getDebateSkillScenario("debate-evidence").prompt.length > 0,
  "F3. a supported slug builds a usable prompt");

// G. NEGATIVE CONTROLS — nothing else leaks into Debate writing practice ----------------------------
for (const slug of ["hosa-medical-terminology", "deca-marketing", "deca-roleplay-2",
                    "mun-diplomacy-1", "claim-warrant-impact", "debate-not-a-real-slug-xyz"]) {
  assert.ok(!debateWritingPracticeSupported(slug),
    `G1. "${slug}" must NOT receive Debate writing practice`);
}
assert.equal(INTENDED_SKILL_INVENTORY.length, SEEDED_SKILLS.length + ACTIVATION_PENDING_SKILLS.length,
  "G2. the inventory is exactly the seeded skills plus the activation-pending ones, with no overlap");

const supported = [...INTENDED_SKILL_SLUGS, ...SEEDED_SKILLS.flatMap((s) => s.lessonSlugs)]
  .filter((s) => debateWritingPracticeSupported(s));
console.log(
  `Skills-compat boundary smoke passed. Three capabilities stay distinct: ${INTENDED_SKILL_INVENTORY.length} intended ` +
  `persisted skills, of which ${supported.length} slugs have writing practice and every one of them has its OWN ` +
  `authored scenario — proven by name, not by absence. The two new secure-evidence skills ` +
  `(${NEW_SECURE_SKILLS.join(", ")}) are known and inventoried yet advertise NO writing practice, because being ` +
  `securely drillable is a different capability. An unsupported slug now throws instead of silently serving the ` +
  `claim-building scenario, which is what previously sent Evidence, Refutation and Weighing learners to ` +
  `claim-building practice under their own skill's name. Closure: nine local modules, zero bare packages — no ` +
  `Prisma, no dotenv, no filesystem, no child process.`
);
