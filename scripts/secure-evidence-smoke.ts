/**
 * SECURE EVIDENCE SMOKE — proof that a question id is not a mastery-evidence identity.
 *
 * STRICT-SAFE BY CONSTRUCTION. Imports are `node:assert/strict`, `node:crypto`, `lib/secure-evidence`
 * and `lib/debate-drills`. The two lib modules import NOTHING at all, so this suite reaches no
 * `@prisma/client`, no `lib/api`, no dotenv, and touches no database. That is why it may run under the
 * no-env controls that forbid `debate-drills:smoke`.
 *
 * WHAT IT PROVES. The evidence path used to count distinct `bankQuestionId`s, so five questions
 * measuring one taught rule counted as five measurements, and five generic reinforcement questions
 * counted the same as five domain-specific ones. Both are checked here, in the exact shape the live
 * Constructive bank can produce today.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { DRILL_BANK, DEBATE_DRILL_REQUIRED_UNIQUE, DRILL_PASS_THRESHOLD } from "../lib/debate-drills";
import {
  CONSTRUCTIVE_EVIDENCE_FAMILY_A,
  CONSTRUCTIVE_EVIDENCE_FAMILY_B,
  CONSTRUCTIVE_EVIDENCE_FAMILY_E,
  CONSTRUCTIVE_EVIDENCE_INTEGRATION_A,
  DEBATE_COMPETENCY_TAGS,
  DEBATE_EVIDENCE_BLOCKS,
  DEBATE_EVIDENCE_MANIFEST,
  DEBATE_EVIDENCE_UNION_ERRORS,
  SECURE_EVIDENCE_AREAS,
  aggregateSecureEvidence,
  buildEvidenceManifest,
  evidenceKeysFor,
  orderPoolForEvidence,
  type AnsweredEvidenceItem,
  type EvidenceBlock,
  type EvidenceEntry
} from "../lib/secure-evidence";

/** Canonical, key-order-independent digest of one accepted evidence block. */
const blockDigest = (block: EvidenceBlock): string =>
  createHash("sha256")
    .update(JSON.stringify({
      id: block.id,
      area: block.area,
      entries: Object.keys(block.entries).sort().map((id) => [id, block.entries[id]])
    }))
    .digest("hex");

const controlsRun: string[] = [];
function control(label: string, holds: boolean): void {
  assert.ok(holds, `control "${label}" did not demonstrate the failure it exists to demonstrate`);
  controlsRun.push(label);
}

const CS = "constructive-speech";
const ans = (bankQuestionId: string, isCorrect: boolean, area = CS): AnsweredEvidenceItem => ({
  bankQuestionId,
  area,
  isCorrect
});
const secureFor = (
  items: AnsweredEvidenceItem[],
  manifest: Readonly<Record<string, EvidenceEntry>> = DEBATE_EVIDENCE_MANIFEST,
  areas: ReadonlySet<string> = SECURE_EVIDENCE_AREAS
) => aggregateSecureEvidence(items, manifest, areas).get(CS);

function main(): void {
  // ---- 0. PER-BLOCK FREEZE. Each accepted block carries its OWN digest, so appending a family adds
  // a new line here and never requires recomputing an earlier one. That is the point: a single whole-
  // manifest digest could not distinguish "appended a new entry" from "appended a new entry AND mutated
  // an old mapping", because both change it. Update a digest below ONLY together with explicit
  // re-review of that block — and prefer minting a new question id in a NEW block instead.
  const FROZEN_BLOCKS: ReadonlyArray<{ block: EvidenceBlock; digest: string }> = [
    { block: CONSTRUCTIVE_EVIDENCE_FAMILY_B, digest: "e1544ce89a633c448c6748538a039fa5547c84fedc372057bc6617d581d8f2f7" },
    { block: CONSTRUCTIVE_EVIDENCE_FAMILY_A, digest: "612b85fd6d609961c07d02a95559589ee9b4c3b8c9b91bae8b93bee095bb58a4" },
    { block: CONSTRUCTIVE_EVIDENCE_FAMILY_E, digest: "9279783a865b82a1670dc8e558e2dd186704375282dbcd60e5fc669e15f4866d" },
    { block: CONSTRUCTIVE_EVIDENCE_INTEGRATION_A, digest: "6a0e92131ec46519eb3c20a8281e56f6bb5182486d9ee20b80b16f2a54c6f563" }
  ];
  for (const { block, digest } of FROZEN_BLOCKS) {
    const actual = blockDigest(block);
    assert.equal(actual, digest,
      `0. accepted evidence block "${block.id}" is frozen. Its digest is ${actual}. A released id's role, evidenceKey or competencyTags may NOT change — mint a new question id in a NEW block instead.`);
  }
  assert.equal(FROZEN_BLOCKS.length, DEBATE_EVIDENCE_BLOCKS.length,
    "0b. every accepted block is frozen — a new block must arrive with its own digest, never unlisted");
  for (const block of DEBATE_EVIDENCE_BLOCKS) {
    assert.ok(FROZEN_BLOCKS.some((f) => f.block.id === block.id), `0c. block ${block.id} has a freeze entry`);
  }

  // ---- 0d. SECURE-POLICY FREEZE. Removing an opted-in area would silently loosen mastery semantics
  // for an area that had already tightened. Adding another area later is a separate reviewed migration.
  assert.deepEqual([...SECURE_EVIDENCE_AREAS].sort(), ["constructive-speech"],
    "0d. the secure-evidence policy set is exactly {constructive-speech} — removing an area is a governance-breaking change, adding one is a separate migration");

  // ---- 0e. The union validates today, and the bank contract holds.
  assert.deepEqual([...DEBATE_EVIDENCE_UNION_ERRORS], [],
    `0e. the accepted blocks union cleanly — errors: ${DEBATE_EVIDENCE_UNION_ERRORS.join("; ")}`);
  const bankIds = new Map(DRILL_BANK.map((q) => [q.id, q.area as string]));
  assert.deepEqual(buildEvidenceManifest(DEBATE_EVIDENCE_BLOCKS, bankIds).errors, [],
    "0f. and every mapped id exists in the bank, in the area its entry declares");

  // ---- 1. Manifest shape. Practice carries no key; direct/integration must.
  for (const [id, entry] of Object.entries(DEBATE_EVIDENCE_MANIFEST)) {
    assert.ok(DRILL_BANK.some((q) => q.id === id), `1. manifest id ${id} exists in the bank`);
    const bankArea = DRILL_BANK.find((q) => q.id === id)!.area;
    assert.equal(entry.area, bankArea, `1b. manifest area for ${id} matches the bank`);
    if (entry.role === "practice") {
      assert.equal(entry.evidenceKey, undefined, `1c. practice item ${id} carries no evidenceKey`);
    } else {
      assert.ok(typeof entry.evidenceKey === "string" && entry.evidenceKey.length > 0,
        `1d. ${entry.role} item ${id} carries an evidenceKey`);
    }
    if (entry.role === "integration") {
      assert.ok(entry.competencyTags.length >= 2, `1e. integration item ${id} names at least two competencies`);
    }
    for (const tag of entry.competencyTags) {
      assert.ok((DEBATE_COMPETENCY_TAGS as readonly string[]).includes(tag),
        `1f. ${id} uses only controlled competency tags — got "${tag}"`);
    }
  }
  // Every item of an opted-in area must be mapped, or the area cannot be reasoned about at all.
  for (const q of DRILL_BANK) {
    if (!SECURE_EVIDENCE_AREAS.has(q.area)) continue;
    assert.ok(DEBATE_EVIDENCE_MANIFEST[q.id], `1g. every item of an opted-in area is mapped — ${q.id} is not`);
  }

  // ---- H. THE REGRESSION PROOF. The exact current Constructive counterexample. -------------------
  // Old behaviour: 5 distinct ids, 4 correct, 80%, a passing persistence request built from three
  // generic-practice answers and ONE domain answer.
  const counterexample = [ans("cs-01", true), ans("cs-02", true), ans("cs-03", true), ans("cs-04", true), ans("cs-05", false)];
  const h = secureFor(counterexample)!;
  assert.equal(h.secureUniqueTotal, 2, "H. only the two DIRECT items are secure evidence — the three practice answers contribute nothing");
  assert.equal(h.secureUniqueCorrect, 1, "H2. and only one of those two was answered correctly");
  assert.ok(h.secureUniqueTotal < DEBATE_DRILL_REQUIRED_UNIQUE,
    "H3. two secure keys is below the five-key floor, so the area cannot qualify");
  assert.equal(h.failedClosed, false, "H4. and this is an ordinary shortfall, not a fail-closed error");
  control("the pre-architecture counterexample no longer qualifies", h.secureUniqueTotal === 2);

  // ---- A. PRACTICE-only can never satisfy secure evidence, at any length or accuracy. ------------
  const practiceOnly = [ans("cs-01", true), ans("cs-02", true), ans("cs-03", true)];
  const a = secureFor(practiceOnly)!;
  assert.equal(a.secureUniqueTotal, 0, "A. three correct practice answers are zero secure evidence");
  assert.equal(a.secureEvidenceScore, 0, "A2. and score zero, so they cannot rescue anything");
  control("practice items contribute nothing to secure evidence", a.secureUniqueTotal === 0);

  // ---- B/C. Five DISTINCT question ids sharing ONE evidence key are ONE measurement. -------------
  const oneKey = "debate.constructive.shared";
  const sharedManifest: Record<string, EvidenceEntry> = {};
  const sharedIds = ["x-01", "x-02", "x-03", "x-04", "x-05"];
  for (const id of sharedIds) sharedManifest[id] = { area: CS, role: "direct", evidenceKey: oneKey, competencyTags: ["constructive-slot-function"] };
  const c = secureFor(sharedIds.map((id) => ans(id, true)), sharedManifest)!;
  assert.equal(c.secureUniqueTotal, 1, "C. five distinct ids sharing one evidenceKey are ONE unique measurement");
  assert.equal(c.secureUniqueCorrect, 1, "C2. correct, because every item carrying the key was correct");
  control("evidence identity is the key, not the question id", c.secureUniqueTotal === 1);
  // B. A duplicate key cannot inflate the total, and ALL-MUST-AGREE means one miss sinks the key.
  const b = secureFor([...sharedIds.map((id) => ans(id, true)), ans("x-06", false)],
    { ...sharedManifest, "x-06": { area: CS, role: "direct", evidenceKey: oneKey, competencyTags: ["constructive-slot-function"] } })!;
  assert.equal(b.secureUniqueTotal, 1, "B. a sixth item on the same key still adds no unique measurement");
  assert.equal(b.secureUniqueCorrect, 0, "B2. and ALL-MUST-AGREE: one wrong answer on the key makes the measurement wrong");
  control("repeated attempts on one key cannot inflate evidence", b.secureUniqueCorrect === 0);

  // ---- D/E. Five distinct keys CAN qualify, and the 70% threshold applies to secure units. -------
  const fiveKeys: Record<string, EvidenceEntry> = {};
  const fiveIds = ["k-01", "k-02", "k-03", "k-04", "k-05"];
  fiveIds.forEach((id, i) => {
    fiveKeys[id] = { area: CS, role: "direct", evidenceKey: `debate.constructive.k${i}`, competencyTags: ["constructive-slot-function"] };
  });
  const d = secureFor(fiveIds.map((id) => ans(id, true)), fiveKeys)!;
  assert.equal(d.secureUniqueTotal, DEBATE_DRILL_REQUIRED_UNIQUE, "D. five distinct evidence keys reach the floor");
  assert.equal(d.secureEvidenceScore, 100, "D2. all correct scores 100");
  // E. Four of five correct is 80% (>= 70, passes); three of five is 60% (< 70, fails). Practice
  // answers added alongside change NEITHER number — that is the whole point.
  const e4 = secureFor([...fiveIds.map((id, i) => ans(id, i < 4)), ans("cs-01", true), ans("cs-02", true)],
    { ...fiveKeys, ...DEBATE_EVIDENCE_MANIFEST })!;
  assert.equal(e4.secureUniqueTotal, DEBATE_DRILL_REQUIRED_UNIQUE, "E. practice answers do not raise the secure total");
  assert.equal(e4.secureEvidenceScore, 80, "E2. the score is four of five secure units, not six of seven answers");
  assert.ok(e4.secureEvidenceScore >= DRILL_PASS_THRESHOLD, "E3. and 80% clears the unchanged 70% threshold");
  const e3 = secureFor([...fiveIds.map((id, i) => ans(id, i < 3)), ans("cs-01", true), ans("cs-02", true), ans("cs-03", true)],
    { ...fiveKeys, ...DEBATE_EVIDENCE_MANIFEST })!;
  assert.equal(e3.secureEvidenceScore, 60, "E4. three of five secure units is 60%");
  assert.ok(e3.secureEvidenceScore < DRILL_PASS_THRESHOLD,
    "E5. and three correct practice answers cannot rescue it — the threshold applies to secure units only");
  control("practice answers cannot rescue a failing secure score", e3.secureEvidenceScore === 60);

  // ---- F/G. Fail-closed. Unknown metadata, area mismatch, malformed integration. -----------------
  const f = secureFor([...fiveIds.map((id) => ans(id, true)), ans("unmapped-99", true)], fiveKeys)!;
  assert.equal(f.failedClosed, true, "F. an id with no manifest entry fails the whole area closed");
  assert.equal(f.secureUniqueTotal, 0, "F2. and zeroes the secure total rather than counting the rest");
  assert.ok(f.failClosedReasons.some((r) => r.includes("unresolved id")), "F3. with the reason recorded");
  control("an unresolvable id withholds evidence instead of being counted like a normal item", f.secureUniqueTotal === 0);

  const g = secureFor([...fiveIds.map((id) => ans(id, true))],
    { ...fiveKeys, "k-03": { ...fiveKeys["k-03"], area: "rebuttal" } })!;
  assert.equal(g.failedClosed, true, "G. a manifest area that disagrees with the stored row fails closed");
  assert.equal(g.secureUniqueTotal, 0, "G2. and zeroes the total");
  control("a wrong-area mapping withholds evidence", g.secureUniqueTotal === 0);

  const malformed = secureFor([...fiveIds.map((id) => ans(id, true))],
    { ...fiveKeys, "k-02": { area: CS, role: "integration", evidenceKey: "debate.constructive.int", competencyTags: ["constructive-slot-function"] } })!;
  assert.equal(malformed.failedClosed, true, "G3. an integration naming fewer than two competencies fails closed");
  const keyless = secureFor([...fiveIds.map((id) => ans(id, true))],
    { ...fiveKeys, "k-04": { area: CS, role: "direct", competencyTags: ["constructive-slot-function"] } })!;
  assert.equal(keyless.failedClosed, true, "G4. a direct item with no evidenceKey fails closed");
  const badRole = secureFor([...fiveIds.map((id) => ans(id, true))],
    { ...fiveKeys, "k-05": { area: CS, role: "wat" as unknown as EvidenceEntry["role"], competencyTags: [] } })!;
  assert.equal(badRole.failedClosed, true, "G5. an unrecognised role fails closed");
  control("every malformed mapping fails closed rather than defaulting to countable", malformed.failedClosed && keyless.failedClosed && badRole.failedClosed);

  // ---- I. LEGACY AREAS ARE NOT TOUCHED. ----------------------------------------------------------
  // An area outside the policy set produces no secure block at all, which is what the route reads to
  // decide it must use the original uniqueTotal/evidenceScore path.
  const legacy = aggregateSecureEvidence([
    { bankQuestionId: "rb-01", area: "rebuttal", isCorrect: true },
    { bankQuestionId: "wg-01", area: "weighing", isCorrect: false }
  ]);
  assert.equal(legacy.size, 0, "I. legacy areas produce no secure evidence block, so their behaviour is unchanged");
  // Non-vacuous: the same call DOES produce a block for the opted-in area.
  assert.equal(aggregateSecureEvidence([ans("cs-04", true)]).size, 1,
    "I2. control: the opted-in area does produce one, so I is not passing because the function is inert");
  control("an opted-in area is treated differently from a legacy one", legacy.size === 0);

  // ---- J. EVIDENCE-CAPABLE SERVING. --------------------------------------------------------------
  // Aggregation alone is not enough: a mostly-practice bank sampled at random can hand a learner
  // sessions that cannot qualify however well they answer. Ordering puts one item per distinct key
  // first, so a session of at least `floor` items carries every key the pool can supply.
  const csIds = DRILL_BANK.filter((q) => q.area === CS).map((q) => q.id);
  const availableKeys = evidenceKeysFor(csIds);
  assert.equal(availableKeys.size, 4, "J. the current Constructive pool supplies exactly four evidence keys");
  const ordered = orderPoolForEvidence(csIds);
  assert.deepEqual([...ordered].sort(), [...csIds].sort(), "J2. ordering is a permutation — nothing is dropped, so practice variety survives");
  assert.equal(evidenceKeysFor(ordered.slice(0, availableKeys.size)).size, availableKeys.size,
    "J3. every distinct key the pool can supply appears in the first slots");
  // With a synthetic pool that DOES have enough keys, a floor-sized draw is evidence-capable.
  const bigIds = ["p-01", "p-02", "p-03", "p-04", "p-05", "p-06", "p-07"];
  const bigManifest: Record<string, EvidenceEntry> = {};
  bigIds.forEach((id, i) => {
    bigManifest[id] = i < 5
      ? { area: CS, role: "direct", evidenceKey: `debate.constructive.b${i}`, competencyTags: ["constructive-slot-function"] }
      : { area: CS, role: "practice", competencyTags: ["constructive-dependency-ordering"] };
  });
  const bigOrdered = orderPoolForEvidence(bigIds, bigManifest);
  assert.equal(evidenceKeysFor(bigOrdered.slice(0, DEBATE_DRILL_REQUIRED_UNIQUE), bigManifest).size, DEBATE_DRILL_REQUIRED_UNIQUE,
    "J4. a floor-sized draw from an evidence-ordered pool carries five distinct keys, so qualification is possible");
  // Control: the UNORDERED pool can fail to do that, which is the problem J exists to fix.
  const worst = ["p-06", "p-07", "p-01", "p-02", "p-03"];
  control("an unordered draw really can be evidence-incapable",
    evidenceKeysFor(worst, bigManifest).size < DEBATE_DRILL_REQUIRED_UNIQUE);

  // ---- Constructive today. -----------------------------------------------------------------------
  assert.equal(availableKeys.size, 4, "K. Constructive currently has four secure evidence keys");
  assert.ok(availableKeys.size < DEBATE_DRILL_REQUIRED_UNIQUE,
    "K2. which is below the five-key floor, so Constructive CANNOT qualify for mastery even if the Skill row existed");

  // ---- K. Duplicate id across blocks fails closed. -----------------------------------------------
  const dupBlock: EvidenceBlock = {
    id: "synthetic-duplicate",
    area: CS,
    entries: { "cs-04": { area: CS, role: "practice", competencyTags: ["constructive-dependency-ordering"] } }
  };
  const dup = buildEvidenceManifest([...DEBATE_EVIDENCE_BLOCKS, dupBlock]);
  assert.ok(dup.errors.some((e) => e.includes("cs-04") && e.includes("CONFLICTING")),
    "K. an id claimed by two blocks with different metadata is reported as a conflict");
  assert.deepEqual(dup.manifest, {}, "K2. and the whole union collapses to an empty manifest");
  assert.equal(secureFor([ans("cs-04", true)], dup.manifest)!.secureUniqueTotal, 0,
    "K3. so the area resolves nothing and fails closed — no first-block-wins, no last-block-wins");
  control("a duplicate id across blocks empties the manifest instead of picking a winner", Object.keys(dup.manifest).length === 0);

  // ---- L. Same id, same block set, conflicting metadata. -----------------------------------------
  const conflicting = buildEvidenceManifest([
    CONSTRUCTIVE_EVIDENCE_FAMILY_A,
    { id: "synthetic-conflict", area: CS, entries: { "cs-05": { area: CS, role: "direct", evidenceKey: "debate.constructive.other", competencyTags: ["constructive-slot-function"] } } }
  ]);
  assert.ok(conflicting.errors.some((e) => e.includes("cs-05") && e.includes("CONFLICTING")),
    "L. a second mapping that changes an accepted id's evidenceKey is a conflict, not an override");
  assert.deepEqual(conflicting.manifest, {}, "L2. and fails the union closed");
  control("an accepted id's evidence semantics cannot be reinterpreted by a later block", Object.keys(conflicting.manifest).length === 0);

  // ---- M. Appending a block does not disturb earlier block digests. ------------------------------
  const newBlock: EvidenceBlock = {
    id: "synthetic-family-x",
    area: CS,
    entries: { "cs-99": { area: CS, role: "direct", evidenceKey: "debate.constructive.future", competencyTags: ["constructive-slot-function"] } }
  };
  const beforeB = blockDigest(CONSTRUCTIVE_EVIDENCE_FAMILY_B);
  const beforeA = blockDigest(CONSTRUCTIVE_EVIDENCE_FAMILY_A);
  buildEvidenceManifest([...DEBATE_EVIDENCE_BLOCKS, newBlock]);
  assert.equal(blockDigest(CONSTRUCTIVE_EVIDENCE_FAMILY_B), beforeB, "M. appending a block leaves Family B's digest untouched");
  assert.equal(blockDigest(CONSTRUCTIVE_EVIDENCE_FAMILY_A), beforeA, "M2. and Family A's");
  control("a new accepted family never forces an earlier freeze to be recomputed",
    blockDigest(CONSTRUCTIVE_EVIDENCE_FAMILY_B) === beforeB);

  // ---- N. Mutating an accepted block changes THAT block's digest, so its own freeze fails. -------
  const mutatedA: EvidenceBlock = {
    ...CONSTRUCTIVE_EVIDENCE_FAMILY_A,
    entries: {
      ...CONSTRUCTIVE_EVIDENCE_FAMILY_A.entries,
      "cs-04": { area: CS, role: "practice", competencyTags: ["constructive-slot-function"] }
    }
  };
  assert.notEqual(blockDigest(mutatedA), blockDigest(CONSTRUCTIVE_EVIDENCE_FAMILY_A),
    "N. demoting an accepted DIRECT id to practice changes its own block digest — assertion 0 would fail");
  control("an edit to an accepted block is detected by that block's own freeze",
    blockDigest(mutatedA) !== blockDigest(CONSTRUCTIVE_EVIDENCE_FAMILY_A));

  // ---- O. Removing the opted-in area is detected. ------------------------------------------------
  const loosened = aggregateSecureEvidence([ans("cs-04", true)], DEBATE_EVIDENCE_MANIFEST, new Set<string>());
  assert.equal(loosened.size, 0,
    "O. with constructive-speech removed from the policy set the area produces no secure block at all — which is exactly why assertion 0d freezes that set");
  control("dropping the policy area would silently restore legacy semantics, and 0d prevents it", loosened.size === 0);

  console.log(
    `Secure evidence smoke passed: evidence identity is the evidenceKey, not the bankQuestionId. ` +
    `Each accepted evidence block is frozen separately, so appending a family never recomputes an earlier digest. PRACTICE items contribute zero secure evidence; ` +
    `several ids sharing one key are ONE measurement and count correct only if every one of them was correct; ` +
    `unknown ids, area mismatches, keyless direct items, under-tagged integrations and unrecognised roles all ` +
    `fail the area closed to zero rather than counting through the legacy path. Legacy areas produce no secure ` +
    `block and are untouched. The pre-architecture Constructive counterexample (three practice answers plus one ` +
    `of two domain answers) moves from 5 unique / 80% / passing to 2 secure keys / below the ${DEBATE_DRILL_REQUIRED_UNIQUE}-key floor / ` +
    `insufficient-evidence. Constructive holds ${availableKeys.size} secure keys today and cannot qualify. ` +
    `${controlsRun.length} controls each demonstrated the failure they exist to demonstrate.`
  );
}

main();
