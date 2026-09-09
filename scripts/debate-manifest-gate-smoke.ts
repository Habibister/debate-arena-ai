/**
 * DEBATE BEGINNER DOCTRINE MANIFESTS — the review gate that replaces the raw prose floors.
 *
 * WHAT THIS REPLACES, AND WHY IT IS NOT THE SAME KIND OF THING.
 *
 * Three lessons carried a raw minimum on their teaching prose — Round Orientation >= 600 words,
 * Evidence Evaluation >= 800, Answer Types >= 900 — plus two prose/quiz ratios. Those were
 * anti-thin-lesson proxies, added when the failure mode was a tiny lesson bolted to a large quiz
 * (Answer Types was 421 words). They encoded "more words = safer lesson", which is false, and they
 * blocked the beginner-simplification standard: Answer Types was pinned above 1,081 prose words
 * against a beginner target near 650.
 *
 * The replacement is NOT a cleverer string matcher. A script cannot tell whether two differently
 * worded sentences teach the same rule, and a guard that pretends otherwise is a worse proxy than
 * the word count it replaced — brittle instead of merely crude. So the semantic judgments stay with
 * human review, and this suite guards only what a machine can actually know:
 *
 *   - that a reviewed manifest EXISTS for every canonical Debate lesson,
 *   - that its reviewed shape cannot drift silently (marker + pinned totals),
 *   - that the structural carriers a rewrite must not delete are still present.
 *
 * WHAT THIS SUITE DELIBERATELY DOES NOT DO. It never compares manifest text against lesson text.
 * There is no assertion anywhere below of the form "RULE-04 appears in the explanation". Control M9
 * enforces that absence against this file's own source, so a future edit cannot quietly reintroduce
 * the fake-semantic-matcher design the owner rejected.
 *
 * WHO OWNS THE REST. Per-rewrite, a human reviewer owns and reports: REMOVE-QUESTIONS PASS,
 * QUESTION-ONLY TEACHING = 0, BEGINNER COMPREHENSION PASS, OBJECTIVE STILL TAUGHT, and MANIFEST
 * COVERAGE 100%. Prose mutation is separately forced through review by the full-snapshot baseline in
 * scripts/learning-content-baseline.json (learning-content-integrity-smoke), which produces a
 * readable old-vs-new diff rather than a hash.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { EDUCATION_REGISTRY } from "../lib/education/registry";
import { LEARNING_SKILL_CATALOG } from "../lib/learning-content";

const MANIFEST_PATH = "scripts/debate-beginner-manifests.json";

/**
 * REVIEW MARKER. Changing any manifest means changing this string in the same commit, so a manifest
 * edit cannot ride in unreviewed. This is a review signal, not a security boundary — a deliberate
 * developer changes both, and that is the point: the decision becomes explicit in one diff.
 */
const MANIFEST_MARKER = "DEBATE-BEGINNER-MANIFEST-V7";

/** Pinned outcomes of the accepted triage + adversarial challenge. Drift here is never incidental. */
const FULL_TRACK_A_RULES = 59;
const CENSUS_RULES_TRIAGED = 317;
const A_RULES_BY_LESSON: Readonly<Record<string, number>> = {
  "debate-round-orientation": 7, "claim-warrant-impact": 6, "debate-evidence-evaluation": 7,
  "debate-signposting": 5, "debate-clash": 4, "debate-refutation": 6, "debate-answer-types": 6,
  "debate-turn-mechanics": 6, "debate-constructive-speeches": 6, "debate-weighing": 6
};
/** The four whose manifests survived an independent adversarial reviewer. */
const CHALLENGED = ["debate-clash", "debate-evidence-evaluation", "debate-signposting", "debate-turn-mechanics"];
const B_DISPOSITIONS = ["B-LEARNER", "B-EXAMPLE", "B-GUARD-ONLY"] as const;

type ARule = { id: string; meaning: string; guarded: boolean };
type BEntry = { id: string; meaning: string; disposition: string };
type Manifest = {
  lesson: string; censusRules: number; adversariallyChallenged: boolean; estimatedRequiredWords: number;
  mustKnowNow: ARule[]; safetyBoundaries: BEntry[];
  demoted: Array<{ censusRule: string; klass: string; destination: string; why: string }>;
  criticalGuardedInvariants: string[];
};

let failures = 0;
function check(name: string, fn: () => void) {
  try { fn(); console.log(`  ok  ${name}`); }
  catch (e) { failures++; console.error(`  FAIL ${name}\n       ${(e as Error).message}`); }
}

console.log("debate-manifest-gate smoke\n");

const raw = readFileSync(MANIFEST_PATH, "utf8");
const artifact = JSON.parse(raw) as { marker: string; fullTrackARuleTotal: number; censusRulesTriaged: number; note: string; lessons: Manifest[] };
const byLesson = new Map(artifact.lessons.map((m) => [m.lesson, m]));

check("M1. the manifest artifact parses and carries its review marker", () => {
  assert.equal(artifact.marker, MANIFEST_MARKER,
    `${MANIFEST_PATH} marker must change in the same commit as any manifest edit`);
  assert.ok(artifact.note.includes("NOT learner content"),
    "the artifact states on its face that it is an internal review contract");
});

check("M2. exactly the ten canonical Debate lessons have a manifest — set equality, never subset", () => {
  // Derived from the registry, so publishing a Debate lesson without a manifest fails here rather
  // than being discovered when someone rewrites it.
  const canonical = EDUCATION_REGISTRY.lessons
    .filter((l: { track: string; visibility: string }) => l.track === "GENERAL_DEBATE" && l.visibility === "learner")
    .map((l: { id: string }) => l.id).sort();
  const manifested = artifact.lessons.map((m) => m.lesson).sort();
  assert.deepEqual(manifested, canonical,
    `manifested: ${manifested.join(",")}\n       canonical: ${canonical.join(",")}`);
  assert.equal(new Set(manifested).size, manifested.length, "no duplicate manifest entries");
});

check("M3. the accepted A-rule totals are pinned per lesson and full-track", () => {
  for (const [lesson, expected] of Object.entries(A_RULES_BY_LESSON)) {
    const m = byLesson.get(lesson);
    assert.ok(m, `${lesson} has a manifest`);
    assert.equal(m!.mustKnowNow.length, expected, `${lesson} A-rules`);
  }
  const total = artifact.lessons.reduce((a, m) => a + m.mustKnowNow.length, 0);
  assert.equal(total, FULL_TRACK_A_RULES, "full-track A-rule total");
  assert.equal(artifact.fullTrackARuleTotal, total, "the artifact's own total agrees with its contents");
});

check("M4. no lesson exceeds eight A-rules — the calibration that separates a manifest from a ledger", () => {
  for (const m of artifact.lessons) {
    assert.ok(m.mustKnowNow.length <= 8,
      `${m.lesson} carries ${m.mustKnowNow.length} A-rules; above eight it is a preservation ledger, not a beginner manifest`);
    assert.ok(m.mustKnowNow.length >= 3, `${m.lesson} carries only ${m.mustKnowNow.length} A-rules — suspiciously thin`);
  }
});

check("M5. every rule id is stable, unique and carries a meaning", () => {
  for (const m of artifact.lessons) {
    const ids = m.mustKnowNow.map((r) => r.id);
    assert.deepEqual(ids, [...new Set(ids)], `${m.lesson}: duplicate A-rule ids`);
    for (const r of m.mustKnowNow) {
      assert.match(r.id, /^RULE-\d{2}$/, `${m.lesson}: ${r.id} is not a stable id`);
      assert.ok(r.meaning.trim().length > 20, `${m.lesson}/${r.id} has no recorded meaning`);
      assert.equal(typeof r.guarded, "boolean",
        `${m.lesson}/${r.id}: 'guarded' is metadata and must be present — a smoke pin never decides the pedagogical class`);
    }
    const bIds = m.safetyBoundaries.map((b) => b.id);
    assert.deepEqual(bIds, [...new Set(bIds)], `${m.lesson}: duplicate B ids`);
    for (const b of m.safetyBoundaries)
      assert.ok((B_DISPOSITIONS as readonly string[]).includes(b.disposition),
        `${m.lesson}/${b.id}: '${b.disposition}' is not one of ${B_DISPOSITIONS.join("/")}`);
  }
});

check("M6. census coverage is recorded and totals the triaged corpus — nothing was silently dropped", () => {
  const total = artifact.lessons.reduce((a, m) => a + m.censusRules, 0);
  assert.equal(total, CENSUS_RULES_TRIAGED, "sum of per-lesson census rules");
  assert.equal(artifact.censusRulesTriaged, total, "the artifact's own census total agrees");
  for (const m of artifact.lessons)
    assert.ok(m.demoted.length > 0,
      `${m.lesson}: every lesson demoted something; an empty demotion list means the triage was not run`);
});

check("M7. the four adversarially challenged manifests are recorded as such", () => {
  const flagged = artifact.lessons.filter((m) => m.adversariallyChallenged).map((m) => m.lesson).sort();
  assert.deepEqual(flagged, [...CHALLENGED].sort(),
    "exactly the four largest manifests carry the independent-review flag");
});

check("M8. structural carriers a rewrite may not delete are still present in every catalog lesson", () => {
  // The manifest protects MEANING; these are the vessels the meaning has to arrive in. Nine catalog
  // lessons (claim-warrant-impact uses the AuthoredLesson shape and is covered elsewhere).
  const catalog = LEARNING_SKILL_CATALOG.filter((e) => byLesson.has(e.slug));
  assert.equal(catalog.length, 9, "control: nine Debate manifests map to catalog lessons");
  for (const e of catalog) {
    const c = e.lesson.content as Record<string, unknown>;
    assert.ok(typeof c.objective === "string" && (c.objective as string).length > 0, `${e.slug}: objective`);
    assert.ok(typeof c.explanation === "string" && (c.explanation as string).length > 0, `${e.slug}: explanation`);
    assert.ok(Array.isArray(c.steps) && (c.steps as unknown[]).length > 0, `${e.slug}: steps`);
    assert.ok(c.workedExample, `${e.slug}: worked example`);
    assert.ok(c.scaffoldedTry,
      `${e.slug}: scaffoldedTry — the productive try is what stops a short lesson becoming a thin one`);
  }
});

check("M9. this suite performs no semantic matching between manifest text and lesson prose", () => {
  // The control that keeps the replacement honest. If a future edit tries to assert that a rule's
  // wording appears in a lesson, it has rebuilt the rejected design and this fails.
  // Scan every check EXCEPT this one: the banned tokens are spelled out below, so including this
  // block would make the control match itself. The region scanned is where a real violation lands.
  const whole = readFileSync("scripts/debate-manifest-gate-smoke.ts", "utf8");
  const cut = whole.indexOf('check("M9.');
  assert.ok(cut > 0, "control: this check is locatable in its own source");
  const self = whole.slice(0, cut)
    .split("\n").filter((l) => !l.trim().startsWith("*") && !l.trim().startsWith("//") && !l.trim().startsWith("/*")).join("\n");
  for (const banned of [".meaning)", "includes(r.meaning", "includes(b.meaning", "test(r.meaning", "test(b.meaning", ".meaning.includes", ".meaning)"]) {
    assert.ok(!self.includes(banned),
      `manifest meanings must never be matched against lesson content ("${banned}")`);
  }
  // Mutation-checked: injecting `String(c.explanation).includes(mm.meaning)` into M8 fails this.
  // A count of lesson-field references was tried here and removed — M8 legitimately names a field
  // twice in one presence check, so the count pinned a formatting detail rather than the design.
});

console.log(
  failures === 0
    ? `\nDebate beginner manifests: ${FULL_TRACK_A_RULES} A-rules across ${artifact.lessons.length} lessons, ` +
      `triaged from ${CENSUS_RULES_TRIAGED} historical rules. Four independently challenged. ` +
      `Semantic judgment stays with review; this gate guards existence, shape and structure only.`
    : `\n${failures} failure(s)`
);
process.exit(failures === 0 ? 0 : 1);
