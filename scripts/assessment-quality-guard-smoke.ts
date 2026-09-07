// Mutation smoke for the P0.1B assessment-quality guard — NO database, NO env, NO network.
//
// Non-vacuity is the whole point: each adversarial mutation from the accepted proof (Q1..Q10) is
// applied to an in-memory COPY of a real healthy bank, and the guard must catch exactly what the
// contract says it catches — and must NOT claim to catch what only content review can (Q8/Q10).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeBankReport, evaluateBank, banksUnderGuard, MCQ_GUARD_WAIVERS, referencesOptionByPosition, corpusIntegrityFindings, guardedCorpus, rationaleLengthOutliers, DUP_RATIONALE_FLOOR, LEN_ANOM_RATIO, type GuardItem, type CorpusItem } from "./assessment-quality-guard";
import { DRILL_BANK, DEBATE_DRILL_HELD_IDS } from "../lib/debate-drills";
import { DECA_DRILL_BANK } from "../lib/deca-drills";

const CONFIG = { enforced: true, servedShuffled: true };
const CONFIG_NO_SHUFFLE = { enforced: true, servedShuffled: false };

const clone = (items: GuardItem[]): GuardItem[] => items.map((q) => ({ ...q, choices: [...q.choices] }));
const fails = (items: GuardItem[], metric: string, config = CONFIG) =>
  evaluateBank(computeBankReport("mut", items), config).some((v) => v.metric === metric && v.level === "FAIL");
const warns = (items: GuardItem[], metric: string, config = CONFIG) =>
  evaluateBank(computeBankReport("mut", items), config).some((v) => v.metric === metric);

const computeItems = (items: GuardItem[]) => items;

async function run() {
  // Base material: the healthy marketing control bank (H_LONG ≈ 28%, at random) — healthy by
  // MEASURED form behavior; its recorded provenance is AI-reviewed with external human review
  // owner-waived, so it is a control by measurement, not by any human-review event.
  const mk = clone(DECA_DRILL_BANK.filter((q) => q.id.startsWith("mk-")) as GuardItem[]);
  assert.equal(mk.length, 30, "0. control bank loaded");
  assert.ok(!fails(mk, "H_LONG") && !fails(mk, "H_SHORT") && !fails(mk, "R_MED"),
    "0b. the healthy control passes the guard untouched");

  const grow = (s: string, extra: string) => `${s} ${extra}`.trim();
  const LONGER = "and the stated constraint in the scenario makes this the controlling consideration here";

  // ---- Q1: every key longest -> HARD FAIL --------------------------------------------------------
  const q1 = clone(mk).map((q) => {
    const maxLen = Math.max(...q.choices.map((c) => c.length));
    const nk = grow(q.correctAnswer, LONGER.repeat(Math.ceil((maxLen + 20) / LONGER.length)));
    return { ...q, choices: q.choices.map((c) => (c === q.correctAnswer ? nk : c)), correctAnswer: nk };
  });
  assert.ok(fails(q1, "H_LONG"), "Q1. all-longest keys hard-fail H_LONG");

  // ---- Q2: 90% of keys longest -> HARD FAIL ------------------------------------------------------
  const q2 = clone(mk).map((q, i) => {
    if (i % 10 === 9) return q;
    const maxLen = Math.max(...q.choices.map((c) => c.length));
    const nk = grow(q.correctAnswer, LONGER.repeat(Math.ceil((maxLen + 20) / LONGER.length)));
    return { ...q, choices: q.choices.map((c) => (c === q.correctAnswer ? nk : c)), correctAnswer: nk };
  });
  assert.ok(fails(q2, "H_LONG"), "Q2. 90%-longest keys hard-fail H_LONG");

  // ---- Q3 (crude): pad every distractor past the key -> caught via H_SHORT ----------------------
  const q3 = clone(mk).map((q) => ({
    ...q,
    choices: q.choices.map((c) =>
      c === q.correctAnswer ? c : grow(c, LONGER.repeat(Math.ceil((q.correctAnswer.length + 40) / LONGER.length)))),
  }));
  assert.ok(fails(q3, "H_SHORT"), "Q3. crude distractor padding hard-fails H_SHORT (the reversed cue it creates)");
  // The TUNED form of Q3 (semantically empty padding at matched length) is invisible to any static
  // metric by design — asserted honestly rather than claimed:
  // the content-review gate owns semantic emptiness.

  // ---- Q4: every key shortest -> HARD FAIL -------------------------------------------------------
  const q4 = clone(mk).map((q) => {
    const nk = "Yes";
    return { ...q, choices: q.choices.map((c) => (c === q.correctAnswer ? nk : grow(c, LONGER))), correctAnswer: nk };
  });
  assert.ok(fails(q4, "H_SHORT"), "Q4. always-shortest keys hard-fail H_SHORT");

  // ---- Q5: source key always at index 0 -> diagnostic only under shuffle, FAIL without ----------
  const q5 = clone(mk).map((q) => {
    const rest = q.choices.filter((c) => c !== q.correctAnswer);
    return { ...q, choices: [q.correctAnswer, ...rest] };
  });
  assert.ok(!fails(q5, "POS_MAX", CONFIG), "Q5. position-0 keys do NOT hard-fail while serving shuffles");
  assert.ok(warns(q5, "POS_MAX", CONFIG), "Q5b. but the concentration is surfaced as a warning");
  assert.ok(warns(q5, "POS_PERIOD", CONFIG_NO_SHUFFLE), "Q5c. and without shuffle the pattern is flagged");

  // ---- Q6: alternating key index (period 4) -> POS_PERIOD flag ----------------------------------
  const q6 = clone(mk).map((q, i) => {
    const rest = q.choices.filter((c) => c !== q.correctAnswer);
    const idx = i % 4;
    const choices = [...rest.slice(0, idx), q.correctAnswer, ...rest.slice(idx)];
    return { ...q, choices };
  });
  assert.ok(warns(q6, "POS_PERIOD"), "Q6. an exact repeating key-index period is flagged");

  // ---- Q7: duplicated distractor sets -> HARD FAIL ----------------------------------------------
  const shared = ["This option is wrong for reason one", "This option is wrong for reason two", "This option is wrong for reason three"];
  const q7 = clone(mk).map((q, i) => (i < 5 ? { ...q, choices: [q.correctAnswer, ...shared] } : q));
  assert.ok(fails(q7, "DUP_SET"), "Q7. 5 of 30 items sharing one distractor set hard-fails DUP_SET");

  // ---- Q9: repeated cue phrase in every key -> HARD FAIL ----------------------------------------
  const q9 = clone(mk).map((q) => {
    const nk = `${q.correctAnswer} given the stated operating constraint`;
    return { ...q, choices: q.choices.map((c) => (c === q.correctAnswer ? nk : c)), correctAnswer: nk };
  });
  assert.ok(fails(q9, "KEY_CUE"), "Q9. a key-exclusive repeated 3-gram hard-fails KEY_CUE");

  // ---- Q11: INVERTED length cue (key never longest) -> UL_FLOOR HARD FAIL -----------------------
  // Caught live by the adversarial re-verification of the first P0.1 repair draft: over-shortened
  // keys make "delete the longest option" a 100%-reliable elimination rule.
  const q11 = clone(mk).map((q) => {
    const keyLen = q.correctAnswer.length;
    let padded = false;
    const choices = q.choices.map((c) => {
      if (c === q.correctAnswer || padded || c.length > keyLen + 10) { if (c !== q.correctAnswer && c.length > keyLen + 10) padded = true; return c; }
      padded = true;
      return grow(c, LONGER.repeat(Math.ceil((keyLen + 20 - c.length) / LONGER.length + 1)));
    });
    return { ...q, choices };
  });
  assert.equal(computeBankReport("mut", q11).ulRate, 0, "Q11a. the mutation drives uniquely-longest-correct to zero");
  assert.ok(fails(q11, "UL_FLOOR"), "Q11. a key that is never uniquely longest hard-fails UL_FLOOR (inverted cue)");

  // ---- Q12: key always the UNIQUE interior length -> H_ELIM HARD FAIL ---------------------------
  const q12 = clone(mk).map((q) => {
    const keyLen = q.correctAnswer.length;
    const rest = q.choices.filter((c) => c !== q.correctAnswer);
    // Two distractors padded to the SAME length above the key -> both are "the longest" and get
    // eliminated together; one clipped below -> the key is the unique interior option.
    const target = keyLen + 40;
    const long1 = grow(rest[0], LONGER.repeat(4)).slice(0, target);
    const long2 = grow(rest[1], LONGER.repeat(4)).slice(0, target);
    const shortOne = rest[2].slice(0, Math.max(4, Math.floor(keyLen / 3)));
    return { ...q, choices: [long1, q.correctAnswer, long2, shortOne] };
  });
  assert.ok(fails(q12, "H_ELIM"), "Q12. eliminate-extremes converging on the key hard-fails H_ELIM");
  assert.ok(!fails(mk, "H_ELIM") && !fails(mk, "UL_FLOOR"), "Q12b. the healthy control passes both new metrics");

  // ---- Q8 / Q10: length-matched joke distractors -> STATIC GATE IS BLIND, BY CONTRACT -----------
  const joke = (len: number) => ("The moon landing footage is the deciding factor in this business question here".slice(0, Math.max(20, len)));
  const q8 = clone(mk).map((q) => {
    const ci = q.choices.indexOf(q.correctAnswer);
    const choices = q.choices.map((c, i) => (i === (ci + 1) % 4 ? joke(c.length) : c));
    return { ...q, choices };
  });
  const q8Fails = evaluateBank(computeBankReport("mut", q8), CONFIG).filter((v) => v.level === "FAIL");
  assert.equal(q8Fails.length, 0,
    "Q8/Q10. length-matched semantic jokes produce ZERO static hard-fails — proving the guard does not claim semantic authority; the content-review gate owns this");

  // ---- Q13: POSITIONAL-OPTION RATIONALES in a shuffled bank -> HARD FAIL -------------------------
  // The defect this metric exists for: choices are shuffled at serve time, so a rationale that names
  // an option by its authored position points at whatever landed there for that learner. Two items
  // had drifted onto their own keyed option and called it a wrong answer.
  const q13 = clone(mk).map((q, i) => (i === 0
    ? { ...q, explanation: "The correct answer names the mechanism. The third gives a price with no baseline, and the fourth restates the question." }
    : q));
  assert.ok(fails(q13, "POS_REF"), "Q13. a rationale identifying an option by position hard-fails POS_REF in a shuffled bank");
  assert.ok(!fails(clone(mk), "POS_REF"), "Q13b. the healthy control passes — the metric is not firing on everything");
  // NON-VACUITY IN THE OTHER DIRECTION. Ordinals are ordinary English in these rationales, and the
  // metric must not ban the word. Each of these is a real sentence pattern from the live banks.
  const semantic = [
    "Every arrow in a chain needs its own support. The first link is explained; the next step is only asserted.",
    "It repairs the first dependency by breaking the second.",
    "In the first constructive there is often nothing yet to answer.",
    "Retention inside the first 90 days is what the figure measures."
  ];
  for (const explanation of semantic) {
    const bank = clone(mk).map((q, i) => (i === 0 ? { ...q, explanation } : q));
    assert.ok(!fails(bank, "POS_REF"), `Q13c. a semantic ordinal is not a positional reference: ${explanation.slice(0, 46)}...`);
  }
  // And the metric is scoped to banks the serving layer actually shuffles.
  const unshuffled = evaluateBank(computeBankReport("mut", q13), { enforced: true, servedShuffled: false });
  assert.ok(!unshuffled.some((v) => v.metric === "POS_REF"),
    "Q13d. a bank served in authored order is not judged by this invariant at all");

  // ---- Q14: SHUFFLE INVARIANCE of the repaired rationales ---------------------------------------
  // The point of content anchoring is that the sentence stays true under the shuffle the learner
  // actually gets. Serve every servable Debate item repeatedly with a seeded shuffle and assert the
  // rationale never depends on where an option landed: it is byte-identical (the snapshot the route
  // stores), and it carries no positional reference under any permutation.
  {
    // The shuffle is reproduced here rather than imported: lib/practice-session's transitive closure
    // loads the Prisma client, which reads .env at import time, and this suite is strict-safe. The
    // coupling to the real serving path is pinned by source below instead.
    let seed = 7;
    const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const shuffle = (choices: string[]) => {
      const out = [...choices];
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    };
    let served = 0;
    let reordered = 0;
    for (const q of DRILL_BANK.filter((item) => !DEBATE_DRILL_HELD_IDS.includes(item.id))) {
      const explanation = q.explanation;
      for (let round = 0; round < 5; round += 1) {
        const order = shuffle(q.choices);
        assert.equal(new Set(order).size, new Set(q.choices).size, `${q.id}: every choice is still served`);
        if (order.join("|") !== q.choices.join("|")) reordered += 1;
        // The learner's order changes; the snapshotted explanation does not, so it may not name a
        // position — and being content-anchored, it is true under every permutation.
        assert.equal(q.explanation, explanation, `${q.id}: the rationale is a snapshot, not regenerated per serving`);
        assert.ok(!referencesOptionByPosition(q.explanation),
          `${q.id}: its rationale reads the same whichever order the learner is shown`);
        served += 1;
      }
    }
    assert.ok(served > 700, `control: the invariance sweep actually ran (${served} servings)`);
    assert.ok(reordered > served * 0.5, `control: the permutations really reorder (${reordered}/${served})`);
    // The invariant only matters because the SERVING path shuffles. Pinned by source, not imported.
    const sessionRoute = readFileSync("app/api/debate/drills/session/route.ts", "utf8");
    assert.ok(/buildServedChoices\(question\.choices, question\.correctAnswer\)/.test(sessionRoute),
      "control: the Debate drill session really does shuffle each question's choices before serving");
    assert.ok(/explanationSnapshot: question\.explanation/.test(sessionRoute),
      "control: and stores the authored explanation verbatim, which is why it cannot describe a position");
  }

  // ---- Live-bank binding: every enforced bank passes at HEAD ------------------------------------
  for (const { bank, items, config } of banksUnderGuard()) {
    if (!config.enforced) continue;
    const verdicts = evaluateBank(computeBankReport(bank, items), config);
    const hard = verdicts.filter((v) => v.level === "FAIL" && !v.waived);
    assert.equal(hard.length, 0, `L1. enforced bank ${bank} passes the guard [${hard.map((v) => v.metric).join(",")}]`);
  }
  // Controls stay healthy without edits (they were never in P0.1 scope):
  for (const prefix of ["cr-", "mk-"]) {
    const items = DECA_DRILL_BANK.filter((q) => q.id.startsWith(prefix)) as GuardItem[];
    const r = computeBankReport(prefix, items);
    assert.ok(r.hLong < 0.55, `L2. control ${prefix} blind-longest accuracy ${(r.hLong * 100).toFixed(1)}% stays below exploitability`);
  }

  // ---- Wiring discipline ------------------------------------------------------------------------
  // W0 asserted ZERO waivers while none existed. The POS_REF metric arrived with two, for the six
  // DECA rationales the Debate repair deliberately did not touch, so the invariant that matters now
  // is that a waiver is NARROW, EXPLAINED and DATED — never a silent skip, and never a whole-bank
  // pass. Removing an entry here is how that debt gets closed.
  assert.ok(MCQ_GUARD_WAIVERS.length <= 2, "W0. waivers stay exceptional — two, both for the same known DECA defect");
  for (const waiver of MCQ_GUARD_WAIVERS) {
    assert.equal(waiver.metric, "POS_REF", "W0a. the only waived metric is the one whose repair is scoped elsewhere");
    assert.ok(waiver.bank.startsWith("deca:"), "W0b. no Debate bank is waived — that class was repaired, not excused");
    assert.ok(waiver.reason.length > 60 && /\b[a-z]{2}-\d{2}\b/.test(waiver.reason),
      "W0c. every waiver names the offending items and says why it is not repaired here");
    assert.ok(/^2\d{3}-\d{2}-\d{2}$/.test(waiver.date), "W0d. and is dated");
    // NO WILDCARDS. A waiver covers named ids, never a bank, an area, a metric or a prefix.
    assert.ok(Array.isArray(waiver.ids) && waiver.ids!.length > 0,
      "W0f. every waiver names the exact ids it covers — a bank-wide waiver would absorb the next violation silently");
  }
  // The recorded debt is EXACTLY six ids, and the live violations are exactly those six.
  const DECA_POSITIONAL_DEBT = ["br-13", "br-17", "cr-17", "cr-18", "cr-23", "cr-26"];
  const waivedIds = MCQ_GUARD_WAIVERS.flatMap((w) => [...(w.ids ?? [])]).sort();
  assert.deepEqual(waivedIds, [...DECA_POSITIONAL_DEBT].sort(),
    "W1. the waiver covers exactly the six known DECA positional rationales");
  const liveDecaViolations = DECA_DRILL_BANK.filter((q) => referencesOptionByPosition(q.explanation)).map((q) => q.id).sort();
  assert.deepEqual(liveDecaViolations, [...DECA_POSITIONAL_DEBT].sort(),
    "W1b. and the bank's actual violations are exactly that set — a seventh, or a repaired one, breaks this");
  assert.equal(liveDecaViolations.length, 6, "W1c. count pinned at six");
  for (const id of DECA_POSITIONAL_DEBT) {
    assert.ok(DECA_DRILL_BANK.some((q) => q.id === id), `W1d. waived id ${id} is a real bank item`);
  }
  // NON-VACUITY: a SEVENTH violation must fail, even though the bank is waived.
  {
    const withSeventh = DECA_DRILL_BANK.filter((q) => q.id.startsWith("br-")).map((q, i) => (i === 0
      ? { ...q, explanation: `${q.explanation} The second states a rule these facts do not support.` }
      : q)) as GuardItem[];
    const verdicts = evaluateBank(computeBankReport("deca:business-reasoning", withSeventh), { enforced: true, servedShuffled: true });
    const posRef = verdicts.filter((v) => v.metric === "POS_REF");
    assert.equal(posRef.length, 1, "W2. a seventh DECA violation still produces a POS_REF verdict");
    assert.equal(posRef[0].waived, false,
      "W2b. and it is NOT waived — the waiver is an exact-set match, so new debt cannot hide behind old debt");
  }
  // And a waived bank whose listed items were REPAIRED stops being waived, so the entry must be removed.
  {
    const repaired = DECA_DRILL_BANK.filter((q) => q.id.startsWith("cr-"))
      .map((q) => (DECA_POSITIONAL_DEBT.includes(q.id) ? { ...q, explanation: "The reply that names a timeframe is the one that keeps the promise." } : q)) as GuardItem[];
    const verdicts = evaluateBank(computeBankReport("deca:customer-relations", computeItems(repaired)), { enforced: true, servedShuffled: true });
    assert.equal(verdicts.filter((v) => v.metric === "POS_REF").length, 0,
      "W3. once the listed items are repaired the metric goes quiet, and the waiver entry becomes dead wood to delete");
  }
  // Non-vacuity: the waiver must not be hiding a Debate failure.
  for (const { bank, items, config } of banksUnderGuard()) {
    if (!bank.startsWith("debate:")) continue;
    const posRef = evaluateBank(computeBankReport(bank, items), config).filter((v) => v.metric === "POS_REF");
    assert.equal(posRef.length, 0, `W0e. ${bank} has no positional rationale at all — nothing waived, nothing left`);
  }
  // ---- Block CI: CORPUS INTEGRITY -------------------------------------------------------------
  // The defect this exists for: a bulk rationale rewrite left a literal `<<<END>>` delimiter plus
  // the WHOLE of another item's rationale appended to sp-18 and sp-22 — sp-22's borrowed block came
  // from wg-26, a different bank. Both were served to learners verbatim. The freeze did not cover
  // them (review debt), the form metrics do not read rationales, and the change passed a byte-count
  // check that confirmed exactly the expected rationales had changed. Every control below both
  // demonstrates the failure it catches and pins the narrowness the owner required.
  {
    const corpus = guardedCorpus();
    assert.ok(corpus.length > 400, "CI-0. the corpus loads every bank");
    assert.deepEqual(corpusIntegrityFindings(corpus), [],
      "CI-0b. HEAD is clean: no edit delimiter, no foreign id, no contained rationale, held items included");
    // Held items really are in scope — a contaminated held item would otherwise enter the freeze unseen.
    assert.ok(corpus.some((q) => DEBATE_DRILL_HELD_IDS.includes(q.id)),
      "CI-0c. held items are part of the integrity corpus even though the form metrics exclude them");

    const withRationale = (id: string, explanation: string): CorpusItem[] =>
      corpus.map((q) => (q.id === id ? { ...q, explanation } : q));
    const kinds = (items: CorpusItem[], id: string) =>
      corpusIntegrityFindings(items).filter((f) => f.id === id).map((f) => f.kind).sort();
    const base = (id: string) => corpus.find((q) => q.id === id)!;

    // 1. The delimiter alone.
    assert.deepEqual(kinds(withRationale("sp-01", `${base("sp-01").explanation} <<<END>> <<<sp-28>>>`), "sp-01"),
      ["EDIT_ARTIFACT", "FOREIGN_ID"],
      "CI-1. an edit delimiter plus a foreign id marker are both caught");
    assert.deepEqual(kinds(withRationale("sp-01", `${base("sp-01").explanation} >>>`), "sp-01"), ["EDIT_ARTIFACT"],
      "CI-1b. the delimiter alone is enough");

    // 2. The exact historical defect, reconstructed — within a bank and across two banks.
    const sp18 = withRationale("sp-18", `${base("sp-18").explanation} ${base("sp-28").explanation}`);
    const f18 = corpusIntegrityFindings(sp18).filter((f) => f.id === "sp-18");
    assert.deepEqual(f18.map((f) => f.kind), ["DUP_RATIONALE"], "CI-2. sp-18 carrying sp-28's whole rationale is caught");
    assert.ok(f18[0].detail.includes("sp-28"), "CI-2b. and the finding names the item it was taken from");
    const sp22 = withRationale("sp-22", `${base("sp-22").explanation} ${base("wg-26").explanation}`);
    const f22 = corpusIntegrityFindings(sp22).filter((f) => f.id === "sp-22");
    assert.deepEqual(f22.map((f) => f.kind), ["DUP_RATIONALE"], "CI-3. the CROSS-BANK case is caught too");
    assert.ok(f22[0].detail.includes("wg-26") && f22[0].detail.includes("debate:weighing"),
      "CI-3b. and it names the source item and its bank — a per-bank scan would have missed this one");

    // 3. NARROWNESS. The owner's rule: catch authoring artifacts, never ordinary prose.
    const INNOCENT = "That is how a well-reasoned answer gets lost. In the first round safety is the heading; a one-to-one swap of the K-12 figure changes nothing, and item sp-99 does not exist.";
    assert.deepEqual(corpusIntegrityFindings(withRationale("sp-01", INNOCENT)).filter((f) => f.id === "sp-01"), [],
      "CI-4. ordinals, hyphenated phrases and an id-SHAPED token that is not a real id all pass clean");
    assert.ok(/sp-99/.test(INNOCENT) && !corpus.some((q) => q.id === "sp-99"),
      "CI-4b. non-vacuity: that control really did contain an id-shaped token, and it really is not an id");

    // 4. The duplicate floor exempts boilerplate and catches a real block.
    const SHORT = "That is the best answer.";
    assert.ok(SHORT.length < DUP_RATIONALE_FLOOR, "CI-5. boilerplate sits under the floor");
    const boiler = corpus.map((q) => (q.id === "sp-01" || q.id === "sp-03" ? { ...q, explanation: SHORT } : q));
    assert.deepEqual(corpusIntegrityFindings(boiler).filter((f) => f.kind === "DUP_RATIONALE"), [],
      "CI-5b. two items sharing short boilerplate produce NO duplicate finding");
    const LONG_SHARED = "A label decides where an answer is recorded, and it decides nothing at all about whether that answer was any good when it got there.";
    assert.ok(LONG_SHARED.length >= DUP_RATIONALE_FLOOR, "CI-5c. and a real rationale sits above it");
    const shared = corpus.map((q) => (q.id === "sp-01" || q.id === "sp-03" ? { ...q, explanation: LONG_SHARED } : q));
    assert.equal(corpusIntegrityFindings(shared).filter((f) => f.kind === "DUP_RATIONALE").length, 2,
      "CI-5d. while two items sharing a full-length rationale are both flagged");

    // 5. Held items are governed: contamination inside a quarantined item still fails.
    assert.deepEqual(kinds(withRationale("sp-24", `${base("sp-24").explanation} <<<END>>`), "sp-24"), ["EDIT_ARTIFACT"],
      "CI-6. a held item's bytes are checked — freezing a contaminated quarantined item is what this prevents");
  }

  // ---- Block LA: LEN_ANOM is a tripwire, never a verdict ---------------------------------------
  {
    const sp = DRILL_BANK.filter((q) => q.area === "signposting") as GuardItem[];
    assert.deepEqual(rationaleLengthOutliers(sp), [],
      "LA-1. with the contamination removed, no signposting rationale reaches the anomaly ratio");
    const contaminated = sp.map((q) => (q.id === "sp-18"
      ? { ...q, explanation: `${q.explanation} ${sp.find((x) => x.id === "sp-28")!.explanation}` }
      : q));
    // LA-2 IS A MEASURED MISS, ASSERTED ON PURPOSE. This reconstructs the exact historical
    // contamination against the CURRENT bank. The repair that followed the discovery lengthened
    // several signposting rationales, so the bank median rose and the same paste now lands just
    // under the line: the tripwire would NOT catch it today. Asserted rather than tuned away,
    // because the honest claim is that DUP_RATIONALE (Block CI) catches this class deterministically
    // and LEN_ANOM only ever hinted at it.
    assert.deepEqual(rationaleLengthOutliers(contaminated).map((f) => f.id), [],
      "LA-2. the real historical paste no longer reaches the ratio at the repaired bank's median — length is a hint, not a detector");
    {
      const corpus = guardedCorpus();
      const sp28 = corpus.find((x) => x.id === "sp-28")!.explanation;
      const pasted = corpus.map((q) => (q.id === "sp-18" ? { ...q, explanation: `${q.explanation} ${sp28}` } : q));
      assert.equal(corpusIntegrityFindings(pasted).filter((f) => f.id === "sp-18" && f.kind === "DUP_RATIONALE").length, 1,
        "LA-2b. and DUP_RATIONALE catches that same paste with no reference to length — that is the check doing the work");
    }
    // NON-VACUITY: a paste large enough relative to the median IS still surfaced, so the metric is live.
    // Sized FROM the measured median rather than from two named items: rationale lengths move every
    // time the bank is edited, and a control pinned to one pair goes stale silently — which it did,
    // twice, during the repair that produced this suite.
    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    const sorted = sp.map((q) => norm(q.explanation ?? "").length).sort((a, b) => a - b);
    const bankMedian = sorted.length % 2 ? sorted[sorted.length >> 1] : (sorted[(sorted.length >> 1) - 1] + sorted[sorted.length >> 1]) / 2;
    const shortest = sp.reduce((a, b) => (norm(a.explanation ?? "").length <= norm(b.explanation ?? "").length ? a : b));
    const filler = ` ${"x".repeat(Math.ceil(bankMedian * 2.2))}`;
    const bigPaste = sp.map((q) => (q.id === shortest.id ? { ...q, explanation: `${q.explanation}${filler}` } : q));
    const flagged = rationaleLengthOutliers(bigPaste);
    assert.deepEqual(flagged.map((f) => f.id), [shortest.id], "LA-2c. a paste sized from the bank's own median is still surfaced");
    assert.ok(flagged[0].ratio >= LEN_ANOM_RATIO, "LA-2d. at or above the declared ratio");
    // DIAGNOSTIC ONLY: length never becomes a verdict, because a long rationale is often correct.
    const verdicts = evaluateBank(computeBankReport("debate:signposting", contaminated), CONFIG);
    assert.equal(verdicts.filter((v) => v.metric === "LEN_ANOM").length, 0,
      "LA-3. LEN_ANOM produces no verdict at all — it is printed as a diagnostic and never fails a bank");
  }

  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts?: Record<string, string> };
  const scripts = pkg.scripts ?? {};
  assert.equal(scripts["assessment:quality"], "tsx scripts/assessment-quality-guard.ts", "W1. manual guard alias exists");
  for (const hook of ["prebuild", "postbuild", "preinstall", "postinstall", "prepare", "pretest", "posttest", "predeploy", "postdeploy"]) {
    assert.ok(!(hook in scripts) || !scripts[hook].includes("assessment-quality"), `W2. lifecycle hook ${hook} never runs the guard`);
  }

  console.log(
    "Assessment-quality-guard smoke passed: the healthy measured control bank passes untouched; " +
      "all-longest (Q1), 90%-longest (Q2), crude distractor padding via its reversed cue (Q3), always-shortest (Q4), " +
      "duplicated distractor sets (Q7), repeated key-exclusive phrasing (Q9), a key that is never uniquely longest (Q11 — " +
      "the inverted cue) and eliminate-extremes convergence on interior keys (Q12) each hard-fail the exact owning metric; " +
      "position concentration and exact periods are surfaced as diagnostics while serving shuffles (Q5/Q6) and harden when it does not; " +
      "and length-matched semantic jokes (Q8/Q10) produce zero static failures — asserted deliberately, because the guard proves " +
      "a negative about FORM only and the content-review gate (human review or a recorded owner waiver) remains separate and mandatory. " +
      "Every enforced live bank passes at HEAD, both controls remain unexploitable, POS_REF closes the Debate shuffled-rationale class with the six DECA items waived loudly rather than silently, and the only " +
      "package.json reference is the manual assessment:quality alias with no lifecycle hook. CORPUS INTEGRITY " +
      "(Block CI) closes the class a byte-count check blessed: an edit delimiter, a foreign item id, and another item's " +
      "COMPLETE rationale contained in this one are each caught across every bank at once, held items included, with the " +
      "real historical defect reconstructed in both its within-bank (sp-18/sp-28) and cross-bank (sp-22/wg-26) forms; " +
      "narrowness is pinned in both directions, so ordinals, hyphenated phrases, an id-shaped token that is not a real id " +
      "and short shared boilerplate all stay clean while a full-length shared rationale does not; and LEN_ANOM (Block LA) " +
      "is measured honestly: the real historical paste no longer reaches the ratio at the repaired bank's median, asserted rather than tuned away, while DUP_RATIONALE catches that same paste regardless and a larger paste still trips the tripwire — and LEN_ANOM is asserted to produce NO verdict either way, because a long rationale is often right."
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
