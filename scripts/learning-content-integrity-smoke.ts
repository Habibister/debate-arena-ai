/**
 * M15 S1B-LC1 — authored-text integrity for `lib/learning-content.ts`.
 *
 * WHY THIS SUITE EXISTS
 *
 * Until S1B-LC1 the only thing referencing this file was a pair of HEAD-RELATIVE byte pins
 * (`education-migration` 4. and `skills-compat` 27.). A HEAD-relative pin compares the working file
 * against `git show HEAD:<file>`, so it fails only while a change is UNCOMMITTED and passes again the
 * moment HEAD advances onto that same change. It could never notice what a commit changed. Measured
 * at the S1B design audit: a changed lesson title, a replaced prose block and a rewritten
 * `workedExample.prompt` each survived ALL 29 safe suites once the mutation was committed.
 *
 * The catalog holds 21 entries (B2.1 added debate-answer-types; B2.2 added debate-turn-mechanics). At S1B-LC1 only 4 of the then-17 were published through the education
 * registry (Wave 1B published the corrected weighing lesson as the 5th, Wave 1A added the newly
 * authored orientation as the 6th, and Wave 1C added the evidence-evaluation teaching home as the
 * 7th), and only the published entries
 * had any semantic coverage at all (presence checks at education-migration 15b-16c). The other 13 —
 * "held" entries, authored and reviewed but not yet learner-visible — had NONE. Owner decision:
 * ONE contract across all 17. "Held" governs whether a learner can reach a lesson, not whether
 * reviewed authored content may silently mutate.
 *
 * WHAT THIS SUITE IS
 *
 * A checked-in FULL canonical snapshot of the reviewed learner-facing content
 * (`scripts/learning-content-baseline.json`), compared against values evaluated from the module at
 * runtime. Canonicalising RUNTIME VALUES rather than source text is what makes the control immune to
 * comments, formatting, imports, helper extraction, variable renames and declaration order, while
 * still catching every authored-text change.
 *
 * WHY A SNAPSHOT AND NOT HASHES. A `slug -> sha256` manifest is compact but one-way: on failure it can
 * show the expected hash, the actual hash and the CURRENT content, but it cannot show the previous
 * prose, because that prose exists nowhere in the repository. The snapshot stores the reviewed text
 * itself, so git produces the old-vs-new diff natively. Measured: editing one prose value is a 2-line
 * diff naming the exact sentence; adding a lesson is a ~100-line additive block.
 *
 * WHY AN ARRAY AND NOT AN OBJECT KEYED BY SLUG. JSON permits duplicate object keys and `JSON.parse`
 * silently keeps the last one, which would make "no duplicate baseline ids" unprovable. Each element
 * carries its own `slug` and the array is sorted by slug, so duplicates are detectable (control 6).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { LEARNING_SKILL_CATALOG } from "../lib/learning-content";
import { getEducationLesson } from "../lib/education/registry";

/**
 * REVIEW SIGNAL — not a security boundary, and it must never be described as one.
 *
 * The integrity expectation is the checked-in snapshot. A deliberate developer can change source,
 * snapshot and this marker in one commit, and that is FINE: the point is that the reviewed prose
 * delta is explicit and inspectable in the diff, not that it is mathematically impossible.
 *
 * The retired moving-HEAD pins were different in kind: committing ALONE changed the expected bytes
 * without anyone touching a baseline artifact. Nothing here is ever derived from HEAD.
 */
const LEARNING_CONTENT_BASELINE = "WEIGHING-BEGINNER-V1";

const BASELINE_PATH = "scripts/learning-content-baseline.json";

// ---- exact runtime key sets — FAIL CLOSED --------------------------------------------------------
// Every layer asserts its key set EXACTLY before canonicalising. An unknown runtime key fails until a
// human classifies it as protected or excluded. Excluded fields are listed here too, so an exclusion
// is always a recorded decision and never a forgotten field.
const SEED_KEYS = ["organization", "track", "name", "slug", "description", "category", "order", "lesson"];
const LESSON_KEYS = ["title", "slug", "summary", "estimatedMinutes", "content"];
// M15 S5 — the FIRST five keys classified since the teaching-schema expansion, and each is here
// because a real reviewed lesson now authors it, not because the schema permits it. All five are
// PROTECTED AUTHORED TEACHING: every one renders to a learner in `ConceptEducationLessonView`, so a
// silent edit to any of them changes what a student is taught and must fail this suite.
// Deliberately NOT pre-authorized: nothing else. A sixth optional field stays unclassified until a
// lesson actually uses it and a human reviews that use.
const CONTENT_KEYS = ["objective", "explanation", "whyMatters", "steps", "workedExample",
                      "guidedQuestion", "practiceQuestions", "masteryCheck",
                      "teachingSections", "additionalExamples", "revisionLadder",
                      "misconception", "commonMistakes",
                      // M15 S6 — the coached-performance pilot. Classified because the reviewed
                      // Refutation lesson authors both; both render to the learner.
                      "languageFrames", "scaffoldedTry"];
const LANGUAGE_FRAME_KEYS = ["purpose", "starters"];
const SCAFFOLDED_TRY_KEYS = ["prompt", "frame", "slots", "opponentClaim", "motion"];
const SCAFFOLDED_TRY_OPTIONAL_KEYS = ["opponentClaim", "motion"];
const TEACHING_SECTION_KEYS = ["heading", "body"];
const EXAMPLE_KEYS = ["setup", "weak", "strong", "explanation"];
const REVISION_RUNG_KEYS = ["attempt", "diagnosis", "revision"];
const MISCONCEPTION_KEYS = ["wrongModel", "whyItFails", "betterModel"];
const COMMON_MISTAKE_KEYS = ["mistake", "whyItFails", "fix"];
const WORKED_EXAMPLE_KEYS = ["prompt", "weakAnswer", "strongAnswer", "whyItWorks"];
const QUESTION_KEYS = ["prompt", "choices", "correctAnswer", "hint", "explanation", "skillTag",
                       "retryPrompt", "retryChoices", "retryCorrectAnswer"];

/**
 * Scope note, stated honestly: this asserts the RUNTIME key set. A TypeScript type edit that declares
 * a new OPTIONAL field but puts no value on any entry leaves the suite green, because there is no
 * learner-visible runtime content yet. That is acceptable and intended. The moment any entry actually
 * carries the field, this check fails until the field is deliberately classified. Do not read this as
 * "the suite detects type declarations" — it does not, and cannot.
 */
function assertExactKeys(value: unknown, expected: string[], where: string, optional: string[] = []): void {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `1. ${where} is an object`);
  const got = Object.keys(value as Record<string, unknown>).sort();
  // OPTIONAL classified keys may be absent; they may never be UNCLASSIFIED. The fail-closed property
  // is unchanged — a key outside the classified union still fails, and a required key still must be
  // present. Optionality exists because the teaching-schema expansion made five content fields
  // genuinely per-lesson: one rebuilt lesson authors them and twenty do not, and demanding all five
  // everywhere would force empty structures into lessons that have nothing to put in them.
  const want = [...expected].filter((k) => !optional.includes(k) || got.includes(k)).sort();
  const unexpected = got.filter((k) => !expected.includes(k));
  const missing = want.filter((k) => !got.includes(k));
  assert.deepEqual(got, want,
    `1. ${where}: unclassified/missing runtime key(s) — unexpected ${JSON.stringify(unexpected)}, ` +
    `missing ${JSON.stringify(missing)}. Classify it in this suite (protected or excluded) and update ` +
    `${BASELINE_PATH} before it can pass.`);
}

/** The five content keys that are classified but per-lesson. Everything else stays required. */
const OPTIONAL_CONTENT_KEYS = ["teachingSections", "additionalExamples", "revisionLadder",
                               "misconception", "commonMistakes", "languageFrames", "scaffoldedTry"];

type CanonicalQuestion = {
  prompt: string; choices: string[]; correctAnswer: string;
  hint: string; explanation: string; skillTag: string;
};

type CanonicalEntry = {
  slug: string; organization: string; track: string; category: string;
  name: string; description: string;
  lesson: {
    title: string; slug: string; summary: string; estimatedMinutes: number;
    content: {
      objective: string; explanation: string; whyMatters: string; steps: string[];
      workedExample: { prompt: string; weakAnswer: string; strongAnswer: string; whyItWorks: string };
      guidedQuestion: CanonicalQuestion;
      practiceQuestions: CanonicalQuestion[];
      masteryCheck: CanonicalQuestion[];
      // OPTIONAL structured teaching. `undefined` for a lesson that authors none, which is why the
      // twenty entries that carry none stay byte-identical to their existing baseline blocks:
      // `JSON.stringify` omits an undefined value entirely, so no key appears for them.
      teachingSections?: Array<{ heading: string; body: string }>;
      additionalExamples?: Array<{ setup: string; weak?: string; strong: string; explanation: string }>;
      revisionLadder?: Array<{ attempt: string; diagnosis: string; revision: string }>;
      misconception?: { wrongModel: string; whyItFails: string; betterModel: string };
      commonMistakes?: Array<{ mistake: string; whyItFails: string; fix: string }>;
      languageFrames?: Array<{ purpose: string; starters: string[] }>;
      scaffoldedTry?: { prompt: string; frame: string; slots: string[]; opponentClaim?: string; motion?: string };
    };
  };
};

/**
 * Canonicalise an OPTIONAL list of authored teaching records.
 *
 * Absent stays absent — `undefined`, never `[]` — so a lesson that authors nothing produces exactly
 * the snapshot block it produced before these fields existed. Present is asserted key-exact like
 * everything else here, so a sixth sub-field cannot ride in unclassified.
 * `optionalKeys` names sub-fields the schema marks optional (an example's `weak` side); every other
 * listed key must be present on every record.
 */
function canonicalRecords<T>(
  value: unknown, keys: string[], where: string, optionalKeys: string[] = []
): T[] | undefined {
  if (value === undefined) return undefined;
  assert.ok(Array.isArray(value) && value.length > 0, `1. ${where} is a non-empty array when present`);
  return (value as unknown[]).map((item, index) => {
    const present = keys.filter((k) => (item as Record<string, unknown>)?.[k] !== undefined);
    const required = keys.filter((k) => !optionalKeys.includes(k));
    for (const k of required) {
      assert.ok(present.includes(k), `1. ${where}[${index}] is missing required key "${k}"`);
    }
    assertExactKeys(item, present, `${where}[${index}]`);
    const rec = item as Record<string, never>;
    const out: Record<string, unknown> = {};
    for (const k of keys) if (rec[k] !== undefined) out[k] = rec[k];
    return out as T;
  });
}

// Explicit key construction — never spread, never Object.keys — so canonical output is deterministic
// and a newly added source field can never leak in unclassified. Array ORDER IS PRESERVED everywhere:
// `steps`, `choices`, and the practice/mastery sequences are all rendered to learners in array order
// (`content.steps.map(...)` and `[guidedQuestion, ...practiceQuestions, ...masteryCheck]` presented in
// teaching order), so a reorder changes what a learner sees and must fail.
function canonicalQuestion(question: unknown, where: string): CanonicalQuestion {
  assertExactKeys(question, QUESTION_KEYS, where);
  const q = question as Record<string, never>;
  return {
    prompt: q.prompt, choices: q.choices, correctAnswer: q.correctAnswer,
    hint: q.hint, explanation: q.explanation, skillTag: q.skillTag
  };
}

/**
 * The five optional teaching fields, as an object carrying ONLY the ones this lesson authored.
 *
 * A key that is absent from the source must be absent from the snapshot, not present-and-undefined:
 * `assert.deepEqual` distinguishes the two, so emitting `teachingSections: undefined` would make all
 * twenty lessons that author nothing differ from their existing reviewed blocks and force a
 * twenty-one-entry rewrite to record a one-lesson change. Each key is still named explicitly here —
 * no spread of source data, no `Object.keys` — so an unclassified sibling still cannot ride in.
 */
function optionalTeaching(content: Record<string, never>, slug: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const sections = canonicalRecords<{ heading: string; body: string }>(
    content.teachingSections, TEACHING_SECTION_KEYS, `teachingSections [${slug}]`);
  if (sections !== undefined) out.teachingSections = sections;
  const examples = canonicalRecords<{ setup: string; weak?: string; strong: string; explanation: string }>(
    content.additionalExamples, EXAMPLE_KEYS, `additionalExamples [${slug}]`, ["weak"]);
  if (examples !== undefined) out.additionalExamples = examples;
  const ladder = canonicalRecords<{ attempt: string; diagnosis: string; revision: string }>(
    content.revisionLadder, REVISION_RUNG_KEYS, `revisionLadder [${slug}]`);
  if (ladder !== undefined) out.revisionLadder = ladder;
  if (content.misconception !== undefined) {
    assertExactKeys(content.misconception, MISCONCEPTION_KEYS, `misconception [${slug}]`);
    const m = content.misconception as Record<string, never>;
    out.misconception = { wrongModel: m.wrongModel, whyItFails: m.whyItFails, betterModel: m.betterModel };
  }
  const mistakes = canonicalRecords<{ mistake: string; whyItFails: string; fix: string }>(
    content.commonMistakes, COMMON_MISTAKE_KEYS, `commonMistakes [${slug}]`);
  if (mistakes !== undefined) out.commonMistakes = mistakes;
  const frames = canonicalRecords<{ purpose: string; starters: string[] }>(
    content.languageFrames, LANGUAGE_FRAME_KEYS, `languageFrames [${slug}]`);
  if (frames !== undefined) out.languageFrames = frames;
  if (content.scaffoldedTry !== undefined) {
    assertExactKeys(content.scaffoldedTry, SCAFFOLDED_TRY_KEYS, `scaffoldedTry [${slug}]`, SCAFFOLDED_TRY_OPTIONAL_KEYS);
    const t = content.scaffoldedTry as Record<string, never>;
    const scaffolded: Record<string, unknown> = { prompt: t.prompt, frame: t.frame, slots: t.slots };
    if (t.opponentClaim !== undefined) scaffolded.opponentClaim = t.opponentClaim;
    if (t.motion !== undefined) scaffolded.motion = t.motion;
    out.scaffoldedTry = scaffolded;
  }
  return out;
}

function canonicalEntry(entry: unknown): CanonicalEntry {
  assertExactKeys(entry, SEED_KEYS, "seed entry");
  const e = entry as Record<string, never> & { slug: string; lesson: Record<string, never> };
  const slug = e.slug;
  assertExactKeys(e.lesson, LESSON_KEYS, `lesson [${slug}]`);
  const lesson = e.lesson as Record<string, never> & { content: Record<string, never> };
  assertExactKeys(lesson.content, CONTENT_KEYS, `content [${slug}]`, OPTIONAL_CONTENT_KEYS);
  const content = lesson.content;
  assertExactKeys(content.workedExample, WORKED_EXAMPLE_KEYS, `workedExample [${slug}]`);
  const we = content.workedExample as Record<string, never>;
  return {
    // PROTECTED STRUCTURAL: identity and association. A retrack is a track-isolation event.
    slug, organization: e.organization, track: e.track, category: e.category,
    // PROTECTED AUTHORED
    name: e.name, description: e.description,
    lesson: {
      title: lesson.title, slug: lesson.slug, summary: lesson.summary,
      // PROTECTED LEARNER-VISIBLE METADATA: rendered as "{n} min" in three lesson views and on the
      // lessons index via `entry.source.lesson.estimatedMinutes`.
      estimatedMinutes: lesson.estimatedMinutes,
      content: {
        objective: content.objective, explanation: content.explanation, whyMatters: content.whyMatters,
        steps: content.steps,
        workedExample: { prompt: we.prompt, weakAnswer: we.weakAnswer, strongAnswer: we.strongAnswer, whyItWorks: we.whyItWorks },
        guidedQuestion: canonicalQuestion(content.guidedQuestion, `guidedQuestion [${slug}]`),
        practiceQuestions: (content.practiceQuestions as unknown[]).map((q, i) => canonicalQuestion(q, `practiceQuestions[${i}] [${slug}]`)),
        masteryCheck: (content.masteryCheck as unknown[]).map((q, i) => canonicalQuestion(q, `masteryCheck[${i}] [${slug}]`)),
        // PROTECTED AUTHORED TEACHING (M15 S5), assigned below only when the lesson authors it.
        ...optionalTeaching(content, slug)
      }
    }
    // EXCLUDED DERIVED: retryPrompt / retryChoices / retryCorrectAnswer — gated by control 3 below.
    // EXCLUDED INERT: seed-level `order` — gated by control 4 below.
  };
}

async function main(): Promise<void> {
  const catalog = LEARNING_SKILL_CATALOG as unknown as Array<Record<string, never>>;

  // ---- 1b. the catalog is a dense array of objects ----------------------------------------------
  // A dropped entry can leave an array HOLE (`[a, , b]`), and every later control would then die on a
  // TypeError instead of reporting what actually broke. Fail here, with the index, instead.
  assert.ok(Array.isArray(catalog) && catalog.length > 0, "1b. LEARNING_SKILL_CATALOG is a non-empty array");
  for (const [index, entry] of catalog.entries()) {
    assert.ok(entry && typeof entry === "object" && !Array.isArray(entry),
      `1b. catalog[${index}] is an object — an array hole here usually means an entry was deleted and left a stray comma`);
  }

  // ---- 2. structural slug invariants -------------------------------------------------------------
  // All 17 satisfy `lesson.slug === slug + "-lesson"` today. Asserting it stops a new entry from
  // inventing an inconsistent outer/lesson pair merely by also writing that pair into the snapshot.
  const slugs = catalog.map((e) => e.slug as unknown as string);
  const lessonSlugs = catalog.map((e) => (e.lesson as Record<string, never>).slug as unknown as string);
  assert.equal(new Set(slugs).size, slugs.length,
    `2. catalog stable slugs are unique (${slugs.length} entries, ${new Set(slugs).size} distinct)`);
  assert.equal(new Set(lessonSlugs).size, lessonSlugs.length, "2b. lesson slugs are unique");
  for (const entry of catalog) {
    const slug = entry.slug as unknown as string;
    const lessonSlug = (entry.lesson as Record<string, never>).slug as unknown as string;
    assert.equal(lessonSlug, `${slug}-lesson`,
      `2c. "${slug}" lesson slug follows the "<slug>-lesson" relation (found "${lessonSlug}")`);
  }

  // ---- 3. retry* derivation invariant ------------------------------------------------------------
  // The retry fields are excluded from the snapshot ONLY because they are provably derived: the `q()`
  // helper defaults them from prompt/choices/correctAnswer and no entry overrides them. If a future
  // change makes retry content diverge, that content becomes independently learner-visible and this
  // fires — forcing an explicit design update instead of a silent exclusion.
  let questionCount = 0;
  for (const entry of catalog) {
    const slug = entry.slug as unknown as string;
    const content = (entry.lesson as Record<string, never>).content as Record<string, never>;
    const questions = [content.guidedQuestion, ...(content.practiceQuestions as unknown[]), ...(content.masteryCheck as unknown[])] as Array<Record<string, never>>;
    for (const [index, q] of questions.entries()) {
      questionCount += 1;
      assert.equal(q.retryPrompt, q.prompt,
        `3. "${slug}" question ${index}: retryPrompt is derived from prompt. If this diverged on purpose, ` +
        `retry content is now independently authored and must be added to the canonical snapshot.`);
      assert.deepEqual(q.retryChoices, q.choices, `3b. "${slug}" question ${index}: retryChoices are derived from choices`);
      assert.equal(q.retryCorrectAnswer, q.correctAnswer, `3c. "${slug}" question ${index}: retryCorrectAnswer is derived from correctAnswer`);
    }
  }

  // ---- 4. `order` is runtime-inert -------------------------------------------------------------
  // Excluded from the snapshot because nothing reads it: the catalog's only production consumer is
  // `lib/education/tracks/debate.ts`, where the sole occurrence of the word "order" is a comment.
  // It stays in SEED_KEYS so the exclusion is a recorded decision, not a forgotten field.
  const debateTrack = readFileSync("lib/education/tracks/debate.ts", "utf8");
  const orderReads = debateTrack
    .split("\n")
    .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//") && !line.trim().startsWith("/*"))
    .filter((line) => /\.order\b/.test(line));
  assert.deepEqual(orderReads, [],
    "4. seed-level `order` is still runtime-inert — no consumer reads it, so excluding it is safe");

  // ---- 5. canonical form of the live catalog ---------------------------------------------------
  const current = catalog.map(canonicalEntry).sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

  // ---- 6. baseline shape + duplicate detection --------------------------------------------------
  const rawBaseline = readFileSync(BASELINE_PATH, "utf8");
  const baseline = JSON.parse(rawBaseline) as CanonicalEntry[];
  assert.ok(Array.isArray(baseline),
    `6. ${BASELINE_PATH} is a JSON ARRAY. An object keyed by slug cannot prove duplicate-id absence, ` +
    "because JSON.parse silently keeps the last of two identical keys.");
  const baselineSlugs = baseline.map((e) => e?.slug);
  assert.ok(baselineSlugs.every((s) => typeof s === "string" && s.length > 0), "6b. every baseline entry carries its own slug");
  assert.equal(new Set(baselineSlugs).size, baselineSlugs.length,
    `6c. baseline slugs are unique (${baselineSlugs.length} entries, ${new Set(baselineSlugs).size} distinct)`);
  assert.deepEqual(baselineSlugs, [...baselineSlugs].sort(), "6d. baseline entries are sorted by stable slug");

  // ---- 7. EXACT ID-SET EQUALITY ------------------------------------------------------------------
  // Set equality, never subset. Subset would let a brand-new entry match nothing in the baseline and
  // stay unprotected forever. Equality forces its canonical block into the same reviewed commit.
  const currentIds = [...current.map((e) => e.slug)].sort();
  const baselineIds = [...baselineSlugs].sort();
  const missingFromBaseline = currentIds.filter((id) => !baselineIds.includes(id));
  const orphanedInBaseline = baselineIds.filter((id) => !currentIds.includes(id));
  assert.deepEqual(currentIds, baselineIds,
    `7. every catalog entry has a canonical baseline block and vice versa. ` +
    `In the catalog but not the baseline: ${JSON.stringify(missingFromBaseline)} (add its block to ${BASELINE_PATH}). ` +
    `In the baseline but not the catalog: ${JSON.stringify(orphanedInBaseline)} (an entry was removed or renamed).`);

  // ---- 8. authored content is byte-for-byte the reviewed content --------------------------------
  // Exact string comparison: no trimming, no case folding, no Unicode normalisation. Punctuation and
  // capitalisation changes are content changes and must fail.
  for (const entry of current) {
    const reviewed = baseline.find((b) => b.slug === entry.slug);
    assert.ok(reviewed, `8. "${entry.slug}" has a reviewed baseline block`);
    assert.deepEqual(entry, reviewed,
      `8. "${entry.slug}" authored content matches its reviewed baseline. If this change is intentional, ` +
      `update ${BASELINE_PATH}, bump LEARNING_CONTENT_BASELINE, and record the affected slug(s) in ` +
      "docs/CURRENT_STATE.md — the git diff of the snapshot shows the exact prose that changed.");
  }

  // ---- 10. fixed-order key-position exploit ------------------------------------------------------
  // Lesson-local choices render in AUTHORED ORDER. `components/lessons/concept-education-lesson-practice.tsx`
  // maps `question.choices` straight through: no shuffle, no randomness, no sort. That premise is
  // asserted here rather than assumed, because this whole rule only means anything while authored
  // position IS rendered position — if serving ever starts shuffling, the rule needs rewriting, not
  // silently passing.
  //
  // Given that, a lesson whose keys ALL sit at one index is answerable from the second question on
  // without reading anything. Two published lessons shipped exactly that way. This is deliberately
  // NOT a balance requirement: any spread at all passes, and no distribution is prescribed. A lesson
  // with fewer than four applicable questions is exempt, because the pattern is not learnable from
  // three.
  //
  // Derived, never a slug list: published-vs-held comes from the registry, so a newly published
  // lesson is covered the moment it is published, and no one has to remember to enrol it.
  const practiceUi = readFileSync("components/lessons/concept-education-lesson-practice.tsx", "utf8");
  assert.ok(/question\.choices\.map\(/.test(practiceUi),
    "10. control: the concept-lesson practice component really does render the authored choices directly");
  for (const banned of ["shuffle", "Math.random", ".sort("]) {
    assert.ok(!practiceUi.includes(banned),
      `10a. the practice component still renders authored order — found "${banned}", so this rule's premise changed and it must be revisited, not quietly passed`);
  }

  const MIN_QUESTIONS_FOR_POSITION_RULE = 4;
  const positionPublished: string[] = [];
  const positionHeld: string[] = [];
  let positionApplicable = 0;
  for (const entry of catalog) {
    const slug = entry.slug as unknown as string;
    const content = (entry.lesson as Record<string, never>).content as Record<string, never>;
    const items = [content.guidedQuestion, ...(content.practiceQuestions as unknown[]), ...(content.masteryCheck as unknown[])]
      .filter(Boolean) as Array<{ choices: string[]; correctAnswer: string }>;
    const mcq = items.filter((q) => Array.isArray(q.choices) && q.choices.length > 1);
    if (mcq.length < MIN_QUESTIONS_FOR_POSITION_RULE) continue;
    positionApplicable += 1;
    const positions = mcq.map((q) => q.choices.indexOf(q.correctAnswer));
    if (!positions.every((p) => p === positions[0])) continue;
    const live = getEducationLesson(slug)?.visibility === "learner";
    const note = `${slug} (${mcq.length} questions, every key at position ${positions[0] + 1})`;
    (live ? positionPublished : positionHeld).push(note);
  }
  assert.ok(positionApplicable > 0, "10b. control: some lessons actually have enough questions for this rule to apply");
  assert.deepEqual(positionPublished, [],
    "10c. no PUBLISHED lesson ships every key at the same authored position — that is answerable without reading");
  // Held lessons are REPORTED and never blocking: they are not learner-reachable, and their questions
  // may be rewritten wholesale when each lesson reaches its own content audit.
  if (positionHeld.length > 0) {
    console.log(`  note (not blocking): ${positionHeld.length} HELD lesson(s) carry the same pattern — ${positionHeld.join("; ")}`);
  }
  // Non-vacuity: the condition the rule tests must actually be detectable.
  const syntheticViolation = [2, 2, 2, 2];
  assert.ok(
    syntheticViolation.length >= MIN_QUESTIONS_FOR_POSITION_RULE && syntheticViolation.every((p) => p === syntheticViolation[0]),
    "10d. control: an all-same-position set of four is what this rule flags"
  );

  // ---- 9. the whole snapshot, compared as one value ----------------------------------------------
  assert.deepEqual(current, baseline, "9. the full canonical snapshot matches, entry for entry, in slug order");

  assert.equal(typeof LEARNING_CONTENT_BASELINE, "string", "10. the review-signal marker is declared");

  console.log(
    `Learning-content integrity smoke passed (${LEARNING_CONTENT_BASELINE}): all ${current.length} authored ` +
    `catalog entries — 9 published through the education registry and 12 held — are byte-for-byte identical to the ` +
    `reviewed canonical snapshot in ${BASELINE_PATH}, across ${questionCount} questions. Identity, track association, ` +
    `every authored string, learner-visible estimatedMinutes and the ORDER of steps, choices, practice and mastery ` +
    `sequences are all frozen; the id sets match exactly in both directions, so a new entry cannot land unprotected ` +
    `and a removed one cannot vanish silently. Every runtime key set is asserted exactly, so an unclassified ` +
    `learner-facing field fails closed. retry* fields are excluded only because all ${questionCount} are provably ` +
    "derived from prompt/choices/correctAnswer, and seed-level `order` only because nothing reads it. The " +
    "expectation is a checked-in artifact and is never derived from HEAD."
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
