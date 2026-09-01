// SECURE MASTERY EVIDENCE — structural evidence identity for opted-in drill areas.
//
// THE PROBLEM THIS EXISTS TO FIX. Until now the only uniqueness the evidence path knew was
// `bankQuestionId`: five different question ids counted as five independent mastery measurements.
// Two separate failures followed from that one fact. Five questions can all measure the SAME taught
// proposition, and five questions can all be generic reinforcement that demonstrates careful reading
// rather than anything the lesson taught. Neither was visible to `aggregateAreaEvidence`, which sees
// only `area` and `isCorrect`.
//
// THE MODEL. A question id is not an evidence identity. A question may be excellent practice without
// being a new mastery measurement. Every bank item in an opted-in area is assigned a structural ROLE,
// and every mastery-grade item additionally carries a stable EVIDENCE KEY naming the distinct
// judgement it measures. Several questions may share one evidence key; together they are still one
// measurement.
//
// WHAT RUNTIME DELIBERATELY DOES NOT KNOW. There is no specificity score here, no HIGH/MEDIUM/LOW,
// and no reviewer confidence. Those are review findings and they stay provenance. Runtime knows only
// the structural outcome of that review — practice, direct or integration — and the evidence identity
// it was assigned. A reviewer adjective must never become executable mastery truth.
//
// FAIL CLOSED, ALWAYS. Anything this module cannot resolve or verify collapses that area's secure
// evidence to zero, which the caller reports as insufficient-evidence and which stops the persistence
// helpers from being called at all. Unknown id, area disagreement, missing key, malformed integration
// — every one of them withholds evidence rather than falling back to counting the item like a normal
// one. A session that cannot be understood cannot award mastery.

/**
 * Structural review outcome for one bank item. Not a quality score.
 *
 * THE ACCEPTANCE CONTRACT. Assigning a role is itself a review event, and these are the conditions.
 *
 * DIRECT requires ALL of:
 *   1. a named learner-visible taught proposition the key turns on;
 *   2. a website-only fairness PASS (a reviewer with the lesson and nothing else keys it);
 *   3. DOMAIN / SLOT DEPENDENCE — moving the same prose into a comparable non-debate context (an
 *      ordinary persuasive essay, say) makes a different option reasonable or correct;
 *   4. NO PORTABLE NON-DOMAIN SOLVE ROUTE — no generic writing, logic or test-craft rule determines
 *      the key while IGNORING the debate/constructive slot conditions the stem states;
 *   5. exact accepted item bytes.
 *
 * ON (4), WHICH IS EASY TO MISREAD. A content-free reviewer reaching the key does NOT by itself
 * disqualify DIRECT. A capable reader can infer a domain rule from domain facts the stem states —
 * "this is the first constructive", "the other side has not spoken", "no case against has been put" —
 * and reasoning from those is reasoning about the domain, not around it. What disqualifies DIRECT is a
 * PORTABLE rule that survives the context change: "pick the missing explanation", "put prerequisites
 * first", "avoid repetition", "choose the most detailed option". The operational test is condition 3:
 * if the key flips when the slot changes, no portable rule was doing the work.
 *
 * INTEGRATION requires, in addition: at least two independently taught propositions, both materially
 * load-bearing, neither alone determining the key.
 *
 * PRACTICE is curriculum-valid and useful to answer, and does not meet the above. It is not a failure
 * grade — most of a healthy bank is practice.
 */
export type EvidenceRole = "practice" | "direct" | "integration";

export type EvidenceEntry = {
  /** The area this id belongs to. Compared against the STORED session row; a mismatch fails closed. */
  area: string;
  role: EvidenceRole;
  /**
   * Stable identity of the judgement measured. Required for `direct` and `integration`, and MUST be
   * absent for `practice`. Several ids may share one key — that is the point of the model.
   */
  evidenceKey?: string;
  /** Controlled identifiers for the taught propositions involved. Governance and coverage, never a mastery requirement by themselves. */
  competencyTags: readonly string[];
};

/**
 * Controlled competency vocabulary. Free-text reviewer prose must never reach this file; a tag is
 * added only alongside the audited curriculum proposition it names.
 */
export const DEBATE_COMPETENCY_TAGS = [
  "constructive-dependency-ordering",
  "constructive-slot-function",
  "constructive-preemption-cost",
  "constructive-honest-close"
] as const;

/**
 * Areas that have opted into secure-evidence semantics. An area absent from this set keeps the
 * legacy behaviour byte-for-byte: `bankQuestionId` uniqueness, unchanged. Adding an area here is a
 * deliberate governance event; REMOVING one is forbidden, because it would silently loosen an
 * area that had already tightened.
 */
export const SECURE_EVIDENCE_AREAS: ReadonlySet<string> = new Set<string>(["constructive-speech"]);

/**
 * ACCEPTED EVIDENCE BLOCKS — append-only, individually frozen.
 *
 * WHY BLOCKS RATHER THAN ONE MANIFEST. A single whole-manifest digest detects accidental edits, but
 * every legitimate new entry forces that digest to change — so one update could append a new item AND
 * mutate an old mapping, and the new digest would bless both. Splitting the metadata into per-
 * acceptance blocks, each with its OWN frozen digest, removes that hole: adding a family adds a new
 * block and a new digest, and never requires recomputing an earlier one. If an accepted block changes,
 * that block's own freeze fails on its own line.
 *
 * WHAT THIS DOES AND DOES NOT CLAIM. This is repo-governed append-only evidence semantics with
 * individually frozen accepted blocks, enforced by review and by a checked-in test. It is NOT
 * cryptographic immutability against a malicious source edit — anyone who can edit this file can also
 * edit the digest. The guarantee is that such an edit cannot be silent.
 *
 * THE RULE. Once an id ships inside an accepted block, its role, evidenceKey and competencyTags are
 * fixed. Evidence semantics change by MINTING A NEW QUESTION ID in a NEW block, never by editing a row
 * here — a session issued under one deploy is resolved by whichever deploy receives the submission.
 */
export type EvidenceBlock = {
  /** Stable block identity, used by the per-block freeze assertions. */
  id: string;
  /** Every entry in the block must declare this area; a mismatch is a union error. */
  area: string;
  entries: Readonly<Record<string, EvidenceEntry>>;
};

/**
 * Family B — dependency ordering. PRACTICE: curriculum-valid and worth answering, but review found the
 * underlying rule recoverable without the lesson, and one taught rule measured three ways is one
 * measurement in any case. No evidence keys.
 */
export const CONSTRUCTIVE_EVIDENCE_FAMILY_B: EvidenceBlock = {
  id: "constructive-family-b",
  area: "constructive-speech",
  entries: {
    "cs-01": { area: "constructive-speech", role: "practice", competencyTags: ["constructive-dependency-ordering"] },
    "cs-02": { area: "constructive-speech", role: "practice", competencyTags: ["constructive-dependency-ordering"] },
    "cs-03": { area: "constructive-speech", role: "practice", competencyTags: ["constructive-dependency-ordering"] }
  }
};

/**
 * Family A — establish vs respond. DIRECT, two different keys: review found both slot-dependent, in
 * that moving the same prose into an ordinary persuasive essay makes a different option reasonable.
 */
export const CONSTRUCTIVE_EVIDENCE_FAMILY_A: EvidenceBlock = {
  id: "constructive-family-a",
  area: "constructive-speech",
  entries: {
    "cs-04": {
      area: "constructive-speech",
      role: "direct",
      evidenceKey: "debate.constructive.slot-belongs-establish-not-respond",
      competencyTags: ["constructive-slot-function"]
    },
    "cs-05": {
      area: "constructive-speech",
      role: "direct",
      evidenceKey: "debate.constructive.preemption-hands-over-their-case",
      competencyTags: ["constructive-preemption-cost"]
    }
  }
};

/**
 * Family E — honest close. DIRECT. cs-07 measures which repair a learner reaches for when a close
 * claims a comparison the round has not supplied: hedge it, defer it, justify it, or cut it and say
 * what the case establishes. Both reviewers found the key slot-dependent — move the same prose into an
 * essay answering an available literature and the key FLIPS to "keep the comparison and give its
 * reason", which is ordinary good essay practice. Its companion cs-06 was cut, so no id from it exists.
 */
export const CONSTRUCTIVE_EVIDENCE_FAMILY_E: EvidenceBlock = {
  id: "constructive-family-e",
  area: "constructive-speech",
  entries: {
    "cs-07": {
      area: "constructive-speech",
      role: "direct",
      evidenceKey: "debate.constructive.close-on-what-the-case-establishes",
      competencyTags: ["constructive-honest-close"]
    }
  }
};

/**
 * Integration A — establish/respond AND dependency ordering, both independently load-bearing. cs-08
 * gives a draft carrying one fault of each kind; the key cuts the pre-emptive stretch AND reorders what
 * remains. An independent reviewer ran both single-rule simulations: a learner holding only the slot
 * rule cuts and keeps the draft order, a learner holding only the ordering rule reorders and keeps the
 * pre-emption, and each lands on a DIFFERENT distractor. The slot half stays load-bearing — move the
 * responsive material into a speech where answering is appropriate and the correct action collapses to
 * the reorder alone. This is the first accepted key whose second rule is case organisation rather than
 * speech function, so it is the one that widens the breadth ledger.
 */
export const CONSTRUCTIVE_EVIDENCE_INTEGRATION_A: EvidenceBlock = {
  id: "constructive-integration-a",
  area: "constructive-speech",
  entries: {
    "cs-08": {
      area: "constructive-speech",
      role: "integration",
      evidenceKey: "debate.constructive.cut-preemption-then-order-what-remains",
      competencyTags: ["constructive-slot-function", "constructive-dependency-ordering"]
    }
  }
};

/** Every accepted block, in acceptance order. Append only. */
export const DEBATE_EVIDENCE_BLOCKS: ReadonlyArray<EvidenceBlock> = [
  CONSTRUCTIVE_EVIDENCE_FAMILY_B,
  CONSTRUCTIVE_EVIDENCE_FAMILY_A,
  CONSTRUCTIVE_EVIDENCE_FAMILY_E,
  CONSTRUCTIVE_EVIDENCE_INTEGRATION_A
];

/**
 * Validate and union the accepted blocks. Every listed invariant is an ERROR, never a preference:
 * there is no first-block-wins or last-block-wins, because either would let a later edit quietly
 * reinterpret an earlier accepted id. Any error at all yields an EMPTY manifest, which makes every id
 * unresolvable, which fails every opted-in area closed. A metadata set that does not validate cannot
 * award mastery.
 *
 * `knownBankIds` is optional because this module deliberately does not import the bank — the content
 * module must not become a dependency of the evidence module. When supplied (the smoke supplies it)
 * the union also proves every mapped id exists in its declared area. At runtime the equivalent defence
 * is per-row: `aggregateSecureEvidence` compares each stored row's area against the manifest and
 * fails closed on an unknown id.
 */
export function buildEvidenceManifest(
  blocks: ReadonlyArray<EvidenceBlock> = DEBATE_EVIDENCE_BLOCKS,
  knownBankIds?: ReadonlyMap<string, string>
): { manifest: Readonly<Record<string, EvidenceEntry>>; errors: string[] } {
  const manifest: Record<string, EvidenceEntry> = {};
  const errors: string[] = [];
  const seen = new Map<string, string>(); // id -> block id that claimed it

  for (const block of blocks) {
    for (const [id, entry] of Object.entries(block.entries)) {
      const priorBlock = seen.get(id);
      if (priorBlock !== undefined) {
        const prior = manifest[id];
        const conflicting =
          prior === undefined ||
          prior.role !== entry.role ||
          prior.evidenceKey !== entry.evidenceKey ||
          prior.area !== entry.area ||
          prior.competencyTags.length !== entry.competencyTags.length ||
          prior.competencyTags.some((tag, i) => tag !== entry.competencyTags[i]);
        errors.push(
          conflicting
            ? `${id} appears in blocks ${priorBlock} and ${block.id} with CONFLICTING metadata`
            : `${id} appears in blocks ${priorBlock} and ${block.id}`
        );
        continue;
      }
      seen.set(id, block.id);
      if (entry.area !== block.area) {
        errors.push(`${id} declares area ${entry.area} inside block ${block.id} (area ${block.area})`);
        continue;
      }
      if (entry.role !== "practice" && entry.role !== "direct" && entry.role !== "integration") {
        errors.push(`${id} has an unrecognised role`);
        continue;
      }
      if (entry.role === "practice" && entry.evidenceKey !== undefined) {
        errors.push(`practice item ${id} carries an evidenceKey`);
        continue;
      }
      if (entry.role !== "practice" && (typeof entry.evidenceKey !== "string" || entry.evidenceKey.length === 0)) {
        errors.push(`${entry.role} item ${id} has no evidenceKey`);
        continue;
      }
      if (entry.role === "integration" && entry.competencyTags.length < 2) {
        errors.push(`integration item ${id} names fewer than two competencies`);
        continue;
      }
      const unknownTag = entry.competencyTags.find((tag) => !(DEBATE_COMPETENCY_TAGS as readonly string[]).includes(tag));
      if (unknownTag !== undefined) {
        errors.push(`${id} uses uncontrolled competency tag "${unknownTag}"`);
        continue;
      }
      if (knownBankIds) {
        const bankArea = knownBankIds.get(id);
        if (bankArea === undefined) errors.push(`${id} is mapped but absent from the bank`);
        else if (bankArea !== entry.area) errors.push(`${id} is a ${bankArea} item mapped as ${entry.area}`);
      }
      manifest[id] = entry;
    }
  }
  // Fail closed as a whole: a partially valid metadata set is not a usable one.
  return { manifest: errors.length > 0 ? {} : manifest, errors };
}

const UNION = buildEvidenceManifest();

/** Errors found unioning the accepted blocks. MUST be empty; the smoke asserts it. */
export const DEBATE_EVIDENCE_UNION_ERRORS: ReadonlyArray<string> = UNION.errors;

/** The validated union. Empty — so every area fails closed — if any block invariant is broken. */
export const DEBATE_EVIDENCE_MANIFEST: Readonly<Record<string, EvidenceEntry>> = UNION.manifest;

/** One answered, stored item. Mirrors the fields `PracticeSessionItem` already persists. */
export type AnsweredEvidenceItem = {
  bankQuestionId: string;
  area: string;
  isCorrect: boolean;
};

export type SecureAreaEvidence = {
  area: string;
  /** Distinct evidence keys answered. PRACTICE items contribute nothing here, by design. */
  secureUniqueTotal: number;
  /** Keys every one of whose answered items was correct. */
  secureUniqueCorrect: number;
  secureEvidenceScore: number;
  /** True when something could not be resolved or verified; totals are then forced to zero. */
  failedClosed: boolean;
  /** Why, for the operator. Never shown as learner-facing progress. */
  failClosedReasons: readonly string[];
};

/**
 * SAME-KEY REPEATS: ALL MUST AGREE. Two answered items sharing one evidence key are one measurement,
 * and that measurement counts as correct only if EVERY item carrying the key was answered correctly.
 *
 * Why not first-occurrence: `AnsweredEvidenceItem[]` carries no ordering guarantee, so first-occurrence
 * would make the result depend on argument order — a submission could differ from itself. Why not
 * latest-occurrence: same problem, plus it lets a later lucky attempt overwrite an earlier miss. Why
 * not any-correct: that is precisely the "repeated easy attempts inflate evidence" route. All-must-agree
 * is order-independent, deterministic, and strictly the least generous reading of the same evidence.
 */
export function aggregateSecureEvidence(
  answered: ReadonlyArray<AnsweredEvidenceItem>,
  manifest: Readonly<Record<string, EvidenceEntry>> = DEBATE_EVIDENCE_MANIFEST,
  policyAreas: ReadonlySet<string> = SECURE_EVIDENCE_AREAS
): Map<string, SecureAreaEvidence> {
  const out = new Map<string, SecureAreaEvidence>();
  const perArea = new Map<string, { keys: Map<string, boolean>; reasons: string[] }>();

  for (const item of answered) {
    if (!policyAreas.has(item.area)) continue; // legacy area: this module is not involved at all
    const bucket = perArea.get(item.area) ?? { keys: new Map<string, boolean>(), reasons: [] };
    perArea.set(item.area, bucket);

    const entry = manifest[item.bankQuestionId];
    if (!entry) {
      // A released id in an opted-in area with no mapping. Could be a retired item, a bank edit, or a
      // session issued before the manifest existed. All of them mean the same thing: this submission
      // cannot be understood, so it earns nothing.
      bucket.reasons.push(`unresolved id ${item.bankQuestionId}`);
      continue;
    }
    if (entry.area !== item.area) {
      bucket.reasons.push(`area mismatch for ${item.bankQuestionId}: stored ${item.area}, manifest ${entry.area}`);
      continue;
    }
    if (entry.role === "practice") {
      if (entry.evidenceKey !== undefined) {
        bucket.reasons.push(`practice item ${item.bankQuestionId} carries an evidenceKey`);
      }
      continue; // curriculum-valid, answerable, and worth zero secure evidence
    }
    if (entry.role !== "direct" && entry.role !== "integration") {
      bucket.reasons.push(`unrecognised role for ${item.bankQuestionId}`);
      continue;
    }
    if (typeof entry.evidenceKey !== "string" || entry.evidenceKey.length === 0) {
      bucket.reasons.push(`${entry.role} item ${item.bankQuestionId} has no evidenceKey`);
      continue;
    }
    if (entry.role === "integration" && entry.competencyTags.length < 2) {
      // An integration key must name a genuine integration: at least two independently taught
      // propositions. One tag means it was mislabelled, and a mislabelled key would mint evidence.
      bucket.reasons.push(`integration item ${item.bankQuestionId} names fewer than two competencies`);
      continue;
    }
    const prior = bucket.keys.get(entry.evidenceKey);
    bucket.keys.set(entry.evidenceKey, prior === undefined ? item.isCorrect : prior && item.isCorrect);
  }

  for (const [area, bucket] of perArea) {
    const failedClosed = bucket.reasons.length > 0;
    const secureUniqueTotal = failedClosed ? 0 : bucket.keys.size;
    const secureUniqueCorrect = failedClosed ? 0 : Array.from(bucket.keys.values()).filter(Boolean).length;
    out.set(area, {
      area,
      secureUniqueTotal,
      secureUniqueCorrect,
      secureEvidenceScore:
        secureUniqueTotal > 0 ? Math.round((secureUniqueCorrect / secureUniqueTotal) * 100) : 0,
      failedClosed,
      failClosedReasons: bucket.reasons
    });
  }
  return out;
}

/** Distinct evidence keys a pool of ids can supply — the ceiling on an area's securable evidence. */
export function evidenceKeysFor(
  bankQuestionIds: ReadonlyArray<string>,
  manifest: Readonly<Record<string, EvidenceEntry>> = DEBATE_EVIDENCE_MANIFEST
): Set<string> {
  const keys = new Set<string>();
  for (const id of bankQuestionIds) {
    const entry = manifest[id];
    if (!entry) continue;
    if (entry.role === "practice") continue;
    if (typeof entry.evidenceKey === "string" && entry.evidenceKey.length > 0) keys.add(entry.evidenceKey);
  }
  return keys;
}

/**
 * EVIDENCE-CAPABLE SERVING. Aggregation alone is not enough: if mastery-grade items are sampled at
 * random from a bank that is mostly practice, a learner can be handed session after session that
 * cannot qualify however well they answer. This orders a pool so that distinct evidence keys come
 * first — at most one item per key, since a second would add nothing — and practice fills the rest.
 * Practice variety is preserved: nothing is removed, only reordered, and the caller still shuffles
 * and truncates as before.
 *
 * Deterministic given `pick`, which selects one id from the candidates sharing a key.
 */
export function orderPoolForEvidence(
  bankQuestionIds: ReadonlyArray<string>,
  manifest: Readonly<Record<string, EvidenceEntry>> = DEBATE_EVIDENCE_MANIFEST,
  pick: (candidates: ReadonlyArray<string>) => string = (c) => c[0]
): string[] {
  const byKey = new Map<string, string[]>();
  const rest: string[] = [];
  for (const id of bankQuestionIds) {
    const entry = manifest[id];
    const key = entry && entry.role !== "practice" ? entry.evidenceKey : undefined;
    if (typeof key === "string" && key.length > 0) {
      const list = byKey.get(key) ?? [];
      list.push(id);
      byKey.set(key, list);
    } else {
      rest.push(id);
    }
  }
  const lead: string[] = [];
  for (const [, candidates] of byKey) {
    const chosen = pick(candidates);
    lead.push(chosen);
    for (const id of candidates) if (id !== chosen) rest.push(id);
  }
  return [...lead, ...rest];
}
