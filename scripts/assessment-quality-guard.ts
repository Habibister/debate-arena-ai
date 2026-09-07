/**
 * P0.1B — Static assessment-bank quality guard (architecture class 2: a NEW verification
 * capability; no runtime behavior changes anywhere).
 *
 * WHY THIS EXISTS. The P0.1 adversarial proof measured that a learner who reads ZERO stems and
 * simply picks the longest option scored 91.7–100% on every Debate drill area and 98.3%/83.3% on
 * DECA performance-indicators/business-reasoning — against a 25% random baseline and the 70%
 * durable pass threshold. Mastery, spaced review, remediation and the Coach all trust those
 * scores, so an answer-form cue silently manufactures false durable evidence. The two healthy
 * control banks (DECA customer-relations 41.7%, marketing 28.3% — low leakage by MEASURED form
 * behavior; customer-relations additionally carries an externally human-reviewed slice, while
 * marketing's recorded provenance is AI-reviewed with external human review owner-waived)
 * proved the defect is an authoring artifact, not a property of MCQs.
 *
 * WHAT THIS GUARD IS — AND IS NOT. It detects suspicious answer-form DISTRIBUTIONS with
 * deterministic, DB-free, provider-free, learner-data-free metrics. It deliberately does NOT
 * encode "the correct answer must never be longest" (that would just reverse the exploit — see
 * H_SHORT). And it CANNOT judge semantic quality: a bank with perfect length parity and joke
 * distractors passes every metric here. A separate content-review gate remains mandatory — human
 * review, or an explicitly recorded owner waiver of it (recorded 2026-08-25 for these banks); this
 * guard only proves a negative about surface form.
 *
 * THRESHOLDS are derived from the measured separation, not invented: the measured healthy control
 * banks span H_LONG lift 0.04–0.22 while leaky banks measured 0.78–1.00 — the warn line (0.40) and
 * fail line (0.60, i.e. 70% raw accuracy at four options: the exact pass threshold) sit inside a
 * gap no honestly-authored bank has ever occupied in this repository.
 *
 * Run manually or in CI:  npm run assessment:quality   (exit 1 on any hard fail in enforced banks)
 */

import { DRILL_BANK, DRILL_AREAS, DEBATE_DRILL_HELD_IDS } from "../lib/debate-drills";
import { DECA_DRILL_BANK, DECA_DRILL_AREAS } from "../lib/deca-drills";
import { MEDTERM_BANK, MEDTERM_AREAS } from "../lib/hosa-medterm";

export type GuardItem = { id: string; question: string; choices: string[]; correctAnswer: string; explanation?: string };

/**
 * POSITIONAL-OPTION REFERENCE. Every drill session shuffles a question's choices before serving them
 * (`buildServedChoices`, lib/practice-session.ts), and the authored explanation is snapshotted and
 * shown after the answer. So a rationale that identifies an option by its AUTHORED position — "the
 * third labels by position and by speaker" — names something the learner never saw: their third
 * option is whatever the shuffle put there. Two Signposting items had drifted further still and
 * described their own KEYED option as a wrong answer.
 *
 * Detection is deliberately narrow, because ordinals are also ordinary English in this corpus. What
 * is flagged is an ordinal STANDING IN for an option: followed by a verb (the option does something)
 * or by an option noun. What is NOT flagged is a semantic ordinal followed by its own noun — "the
 * first link", "the second contention", "the first 90 days", "it repairs the first dependency" — all
 * of which appear in this bank and are correct. "answer" is deliberately NOT an option noun: in a
 * Debate rationale "the first answer" is usually the speaker's own first answer, not an option. Validated against the whole Debate corpus: it flags
 * every known positional rationale and none of the semantic ones.
 */
const POSITIONAL_VERB = /\b[Tt]he (?:first|second|third|fourth)(?: and (?:second|third|fourth))?\s+(?:also |only |then |simply |actively |correctly |merely |still |never |already )?(?:names|gives|states|labels|treats|invents|lets|overstates|overcorrects|promises|asks|describes|questions|sets|adds|keeps|leaves|points|fails|reaches|makes|does|is|was|are|were|takes|puts|reads|answers|offers|picks|hands|swaps|assumes|predicts|accepts|walks|withdraws|concedes|shifts|blames|trails|announces|summarises|summarizes|numbers|identifies|matches|rescues|breaks|stays|sounds|works|wins|loses|comes|goes|turns|moves|counts|covers|repeats|restates|spends|saves|drops|would|will|can|could|might|may)\b/;
const POSITIONAL_NOUN = /\b[Tt]he (?:first|second|third|fourth)(?: and (?:second|third|fourth))?\s+(?:option|options|choice|choices|reply|replies|response|responses)\b/;

export function referencesOptionByPosition(explanation: string | undefined): boolean {
  if (!explanation) return false;
  return POSITIONAL_VERB.test(explanation) || POSITIONAL_NOUN.test(explanation);
}

/**
 * CORPUS INTEGRITY — authoring-artifact contamination, checked ACROSS banks.
 *
 * WHY THIS EXISTS. The Signposting integration repair rewrote 23 rationales in one bulk edit, and
 * its splitter failed to cut two block boundaries. sp-18 shipped carrying a literal `<<<END>>`
 * delimiter plus the WHOLE of sp-28's rationale; sp-22 carried the whole of wg-26's — a frozen
 * WEIGHING item, so the damage crossed banks. Both were learner-facing: the drill session route
 * snapshots `question.explanation` verbatim (app/api/debate/drills/session/route.ts) and serves it
 * back after the answer, so a learner answering sp-18 was handed sp-28's key by content, and the
 * two items co-serve in roughly one focused session in seven.
 *
 * NOTHING CAUGHT IT. The content freeze covers only baselined ids and both were review debt. The
 * per-bank form metrics measure choices, not rationales. And the change was verified by counting
 * that exactly the expected rationales had changed — which was true, and useless: a byte count
 * cannot read. Hence three checks that a machine CAN do, over every bank at once.
 *
 *   EDIT_ARTIFACT   a delimiter only an editing tool writes (`<<<`, `>>>`)
 *   FOREIGN_ID      the literal id of another item in this corpus, inside a rationale
 *   DUP_RATIONALE   another item's COMPLETE rationale contained inside this one
 *
 * Deliberately narrow, per the authoring standard. FOREIGN_ID matches only ids that ACTUALLY EXIST
 * in the loaded corpus, so it cannot fire on an ordinary hyphenated phrase or an ordinal.
 * DUP_RATIONALE carries a length floor so it cannot fire on short shared boilerplate; containment
 * rather than equality is the rule, because what actually happened was a whole block APPENDED to a
 * legitimate rationale. Measured at the floor below: 0 findings across all 487 items, 28 of which
 * sit under the floor and are exempt.
 *
 * HELD items are INCLUDED here, unlike the per-bank form metrics. A held rationale never renders,
 * so it cannot mislead a learner — but its bytes are still governed, and a contaminated held item
 * would otherwise enter the content freeze unseen and be released later carrying the artifact.
 */
const EDIT_ARTIFACT = /<<<|>>>/;
const ID_TOKEN = /\b[a-z]{2,3}-\d{1,3}\b/g;
/** Below this, a shared rationale is boilerplate, not a pasted block. */
export const DUP_RATIONALE_FLOOR = 80;

export type CorpusItem = GuardItem & { bank: string };
export type CorpusFinding = { kind: "EDIT_ARTIFACT" | "FOREIGN_ID" | "DUP_RATIONALE"; bank: string; id: string; detail: string };

export function corpusIntegrityFindings(items: ReadonlyArray<CorpusItem>): CorpusFinding[] {
  const out: CorpusFinding[] = [];
  const ids = new Set(items.map((q) => q.id));
  const normalized = items.map((q) => ({ item: q, text: norm(q.explanation ?? "") }));
  for (const { item, text } of normalized) {
    if (!text) continue;
    if (EDIT_ARTIFACT.test(text)) {
      out.push({ kind: "EDIT_ARTIFACT", bank: item.bank, id: item.id, detail: "rationale contains an edit-block delimiter (<<< or >>>)" });
    }
    for (const token of text.match(ID_TOKEN) ?? []) {
      if (ids.has(token) && token !== item.id) {
        out.push({ kind: "FOREIGN_ID", bank: item.bank, id: item.id, detail: `rationale names another item's id (${token})` });
      }
    }
    for (const other of normalized) {
      if (other.item.id === item.id) continue;
      if (other.text.length >= DUP_RATIONALE_FLOOR && text.includes(other.text)) {
        out.push({ kind: "DUP_RATIONALE", bank: item.bank, id: item.id, detail: `rationale contains the complete rationale of ${other.item.id} (${other.item.bank})` });
      }
    }
  }
  return out;
}

/**
 * LEN_ANOM — a cheap tripwire, DIAGNOSTIC ONLY, never a correctness verdict, and WEAK. Read this
 * before trusting it.
 *
 * It exists for the variant DUP_RATIONALE cannot see: a paste of a FRAGMENT rather than a whole
 * rationale. At the moment of the contamination the two damaged items were their bank's only
 * rationales at 2.0x the bank median. But the repair that followed lengthened several signposting
 * rationales, the bank median moved 567 -> 628 characters, and the SAME historical paste now
 * measures 1.95x — under the line. A ratio against a moving median is not a detector; it is a hint
 * whose sensitivity depends on the bank it is measured in. The check that actually catches this
 * class deterministically is DUP_RATIONALE, and the guard smoke asserts both facts, including the
 * miss, so nobody later mistakes this line for coverage.
 *
 * The threshold is deliberately NOT lowered to make the historical case trip: tuning a heuristic
 * until it passes its own motivating example is how a metric stops measuring anything. A long
 * rationale is often legitimate — at the time of writing this flags rb-07, ev-19, wg-26, cl-08,
 * cl-10, cl-11, pi-28, pi-30, br-16 and ph-20, every one of which is long and correct. Do not
 * repair an item because it appears here; read it.
 */
export const LEN_ANOM_RATIO = 2;

export function rationaleLengthOutliers(items: ReadonlyArray<GuardItem>): Array<{ id: string; ratio: number }> {
  const lens = items.map((q) => norm(q.explanation ?? "").length).filter((l) => l > 0);
  if (lens.length < 5) return [];
  const m = median(lens);
  if (m <= 0) return [];
  return items
    .map((q) => ({ id: q.id, ratio: norm(q.explanation ?? "").length / m }))
    .filter((r) => r.ratio >= LEN_ANOM_RATIO)
    .sort((a, b) => b.ratio - a.ratio);
}

export type BankReport = {
  bank: string;
  n: number;
  hLong: number;      // blind "pick longest normalized option, split ties" accuracy, 0..1
  hShort: number;     // symmetric shortest-option heuristic
  hWords: number;     // greatest word count heuristic
  ulRate: number;     // share of items whose key is STRICTLY longest (normalized)
  rMed: number;       // median of key-length / longest-distractor-length
  posMax: number;     // share of items whose key sits at the most-used source index
  posPeriod: number;  // smallest exact repeating period 1..6 across >=12 consecutive keys, else 0
  dupSet: number;     // largest share of items sharing one normalized distractor set
  keyCue: number;     // share of keys carrying a key-exclusive repeated word 3-gram
  lenSpread: number;  // median of (max-min)/mean choice length — anti-padding floor
  hElim: number;      // blind strategy: eliminate longest+shortest, pick randomly among the rest
  posRef: number;     // count of items whose rationale identifies an option by its authored position
  posRefIds: string[];// and exactly which — a waiver is granted per id, never per bank
};

export type BankConfig = { enforced: boolean; servedShuffled: boolean };

/**
 * Committed, loud, per-bank per-metric waivers. NEVER a silent skip: every entry names its reason
 * and is printed on every run. Empty today — the repaired banks must stand on their own.
 */
export const MCQ_GUARD_WAIVERS: ReadonlyArray<{ bank: string; metric: string; reason: string; date: string; ids?: readonly string[] }> = [
  // POS_REF landed with the Signposting integration repair, which closed the whole DEBATE class:
  // 23 servable Debate rationales were re-anchored to option content in the same commit. The census
  // that produced the metric also found six DECA rationales with the same defect (br-13, br-17,
  // cr-17, cr-18, cr-23, cr-26). They are NOT repaired here: DECA is a different curriculum whose
  // items this milestone did not audit, and rewriting them blind is the kind of expansion the owner
  // asked to be reported rather than absorbed. Waived LOUDLY — every run prints these — so the debt
  // is visible and quantified instead of being rediscovered by the next audit.
  //
  // Each entry names the EXACT ids and is honoured only on an exact-set match, so a seventh
  // violation, a repaired one, or a listed id leaving the bank all break it and the verdict stops
  // being waived. These are TEMPORARY REVIEW DEBT, not an accepted exception to the authoring
  // standard: DECA cannot be called end-to-end complete while any entry stands, and closing them
  // belongs at the front of the DECA audit.
  { bank: "deca:business-reasoning", metric: "POS_REF", ids: ["br-13", "br-17"], reason: "2 rationales name an option by authored position (br-13, br-17); DECA rationale repair is a separate, unaudited scope", date: "2026-09-06" },
  { bank: "deca:customer-relations", metric: "POS_REF", ids: ["cr-17", "cr-18", "cr-23", "cr-26"], reason: "4 rationales name an option by authored position (cr-17, cr-18, cr-23, cr-26); same scope", date: "2026-09-06" }
];

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const words = (s: string) => norm(s).toLowerCase().split(" ").filter(Boolean);

function tieSplitAccuracy(items: GuardItem[], score: (choice: string) => number, pickMax: boolean): number {
  let acc = 0;
  for (const q of items) {
    const scores = q.choices.map(score);
    const target = pickMax ? Math.max(...scores) : Math.min(...scores);
    const picked = q.choices.filter((_, i) => scores[i] === target);
    if (picked.includes(q.correctAnswer)) acc += 1 / picked.length;
  }
  return acc / items.length;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function computeBankReport(bank: string, items: GuardItem[]): BankReport {
  const n = items.length;
  const keyIdx = items.map((q) => q.choices.indexOf(q.correctAnswer));

  let ul = 0;
  const ratios: number[] = [];
  const spreads: number[] = [];
  for (const q of items) {
    const lens = q.choices.map((c) => norm(c).length);
    const ci = q.choices.indexOf(q.correctAnswer);
    const dLens = lens.filter((_, i) => i !== ci);
    if (lens[ci] > Math.max(...dLens)) ul += 1;
    ratios.push(lens[ci] / Math.max(...dLens));
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    spreads.push((Math.max(...lens) - Math.min(...lens)) / mean);
  }

  // POS_MAX / POS_PERIOD over the SOURCE key index (serving shuffles; these stay diagnostic).
  const counts = new Map<number, number>();
  for (const i of keyIdx) counts.set(i, (counts.get(i) ?? 0) + 1);
  const posMax = Math.max(...counts.values()) / n;
  let posPeriod = 0;
  for (let p = 1; p <= 6 && posPeriod === 0; p += 1) {
    if (n >= 12 && p < n && keyIdx.every((v, i) => i < p || v === keyIdx[i - p])) posPeriod = p;
  }

  // DUP_SET: largest share of items sharing one normalized, sorted distractor tuple.
  const setCounts = new Map<string, number>();
  for (const q of items) {
    const ci = q.choices.indexOf(q.correctAnswer);
    const key = q.choices.filter((_, i) => i !== ci).map((c) => norm(c).toLowerCase()).sort().join(" || ");
    setCounts.set(key, (setCounts.get(key) ?? 0) + 1);
  }
  const dupSet = Math.max(...setCounts.values()) / n;

  // KEY_CUE: word 3-grams appearing in >=3 keys and zero distractors; share of keys carrying one.
  const keyGrams = new Map<string, number>();
  const distractorGrams = new Set<string>();
  const gramsOf = (s: string) => {
    const w = words(s);
    const out: string[] = [];
    for (let i = 0; i + 3 <= w.length; i += 1) out.push(w.slice(i, i + 3).join(" "));
    return out;
  };
  for (const q of items) {
    for (const g of new Set(gramsOf(q.correctAnswer))) keyGrams.set(g, (keyGrams.get(g) ?? 0) + 1);
    for (const c of q.choices) if (c !== q.correctAnswer) for (const g of gramsOf(c)) distractorGrams.add(g);
  }
  const cues = new Set([...keyGrams.entries()].filter(([g, k]) => k >= 3 && !distractorGrams.has(g)).map(([g]) => g));
  const keyCue = items.filter((q) => gramsOf(q.correctAnswer).some((g) => cues.has(g))).length / n;

  // H_ELIM: the inverted-cue strategy — discard the longest and the shortest option, then guess
  // among the interior. A bank whose keys are NEVER longest is as exploitable as one where they
  // always are; the adversarial re-verification of the first P0.1 repair draft caught exactly this.
  let hElim = 0;
  for (const q of items) {
    const lens = q.choices.map((c) => norm(c).length);
    const mx = Math.max(...lens), mn = Math.min(...lens);
    const interior = q.choices.filter((_, i) => lens[i] !== mx && lens[i] !== mn);
    const pool = interior.length > 0 ? interior : q.choices;
    if (pool.includes(q.correctAnswer)) hElim += 1 / pool.length;
  }
  hElim /= items.length;

  return {
    bank, n, hElim,
    hLong: tieSplitAccuracy(items, (c) => norm(c).length, true),
    hShort: tieSplitAccuracy(items, (c) => norm(c).length, false),
    hWords: tieSplitAccuracy(items, (c) => words(c).length, true),
    ulRate: ul / n,
    rMed: median(ratios),
    posMax, posPeriod, dupSet, keyCue,
    lenSpread: median(spreads),
    posRef: items.filter((q) => referencesOptionByPosition(q.explanation)).length,
    posRefIds: items.filter((q) => referencesOptionByPosition(q.explanation)).map((q) => q.id).sort(),
  };
}

export type Verdict = { bank: string; metric: string; level: "FAIL" | "WARN"; detail: string; waived: boolean };

const RANDOM = 0.25;
const lift = (acc: number) => (acc - RANDOM) / (1 - RANDOM);

export function evaluateBank(report: BankReport, config: BankConfig): Verdict[] {
  const out: Verdict[] = [];
  // A waiver naming ids is honoured ONLY when the bank's violating set is exactly that set. A seventh
  // violation, a listed id that stopped violating, or a listed id that left the bank all break the
  // equality and the verdict stops being waived — so the debt cannot silently grow behind the waiver,
  // and cannot silently persist after it is repaired. A waiver with no ids stays bank-scoped.
  const waived = (metric: string) => MCQ_GUARD_WAIVERS.some((w) => {
    if (w.bank !== report.bank || w.metric !== metric) return false;
    if (!w.ids) return true;
    const actual = metric === "POS_REF" ? report.posRefIds : [];
    const recorded = [...w.ids].sort();
    return actual.length === recorded.length && actual.every((id, i) => id === recorded[i]);
  });
  const add = (metric: string, level: "FAIL" | "WARN", detail: string) =>
    out.push({ bank: report.bank, metric, level, detail, waived: waived(metric) });

  // Small banks get warnings only — binomial noise makes hard-failing them unfair.
  const hardEligible = report.n >= 20;
  const hard = (m: string, d: string) => add(m, hardEligible ? "FAIL" : "WARN", d);

  const lLong = lift(report.hLong);
  if (lLong >= 0.6) hard("H_LONG", `blind longest-option accuracy ${(report.hLong * 100).toFixed(1)}% (lift ${lLong.toFixed(2)}) — a non-reader beats the 70% pass threshold`);
  else if (lLong >= 0.4) add("H_LONG", "WARN", `blind longest-option accuracy ${(report.hLong * 100).toFixed(1)}% (lift ${lLong.toFixed(2)})`);

  const lShort = lift(report.hShort);
  if (lShort >= 0.6) hard("H_SHORT", `blind SHORTEST-option accuracy ${(report.hShort * 100).toFixed(1)}% — the reversed exploit`);
  else if (lShort >= 0.4) add("H_SHORT", "WARN", `blind shortest-option accuracy ${(report.hShort * 100).toFixed(1)}%`);

  if (report.rMed < 0.65 || report.rMed > 1.4) hard("R_MED", `median key/longest-distractor ratio ${report.rMed.toFixed(2)} outside [0.65, 1.40]`);
  else if (report.rMed < 0.8 || report.rMed > 1.25) add("R_MED", "WARN", `median ratio ${report.rMed.toFixed(2)} outside [0.80, 1.25]`);

  if (report.ulRate >= 0.55) add("UL_RATE", "WARN", `uniquely-longest-correct rate ${(report.ulRate * 100).toFixed(1)}% (diagnostic — H_LONG is the blocking metric)`);
  // TWO-SIDED: a key that is essentially NEVER uniquely longest is the inverted rule ("delete the
  // longest option") and equally exploitable. Honest authoring lands well inside both bounds.
  if (report.n >= 20 && report.ulRate < 0.05) hard("UL_FLOOR", `uniquely-longest-correct rate ${(report.ulRate * 100).toFixed(1)}% — 'the longest option is never the key' has become a reliable elimination rule`);
  const lElim = lift(report.hElim);
  if (lElim >= 0.6) hard("H_ELIM", `eliminate-extremes blind accuracy ${(report.hElim * 100).toFixed(1)}% — interior-key concentration is exploitable`);
  else if (lElim >= 0.4) add("H_ELIM", "WARN", `eliminate-extremes blind accuracy ${(report.hElim * 100).toFixed(1)}%`);

  if (report.posMax >= 0.95 && !config.servedShuffled) hard("POS_MAX", `key index concentration ${(report.posMax * 100).toFixed(0)}% with NO serving shuffle`);
  else if (report.posMax >= 0.85) add("POS_MAX", "WARN", `source key index concentration ${(report.posMax * 100).toFixed(0)}% (serving shuffles, diagnostic only)`);
  if (report.posPeriod !== 0) add("POS_PERIOD", config.servedShuffled ? "WARN" : "FAIL", `exact repeating key-index period ${report.posPeriod}`);

  if (report.dupSet >= 0.1) hard("DUP_SET", `${(report.dupSet * 100).toFixed(1)}% of items share one distractor set`);
  else if (report.dupSet >= 0.067) add("DUP_SET", "WARN", `${(report.dupSet * 100).toFixed(1)}% duplicate distractor sets`);

  if (report.keyCue >= 0.5) hard("KEY_CUE", `${(report.keyCue * 100).toFixed(1)}% of keys carry a key-exclusive repeated 3-gram`);
  else if (report.keyCue >= 0.3) add("KEY_CUE", "WARN", `${(report.keyCue * 100).toFixed(1)}% key-exclusive 3-gram share`);

  // POS_REF. A shuffled bank may not identify an option by its authored position: the learner sees a
  // different order, so the sentence points at whatever landed there. Hard-failing regardless of bank
  // size, because this is not a statistical signal — it is a sentence that is wrong on sight, and the
  // small-bank noise argument does not apply. Only enforced where the config says the serving layer
  // shuffles; a bank served in authored order is unaffected.
  if (report.posRef > 0 && config.servedShuffled) {
    add("POS_REF", config.enforced ? "FAIL" : "WARN",
      `${report.posRef} rationale(s) identify an option by its authored position, but choices are shuffled at serve time`);
  }
  if (report.lenSpread < 0.12) add("LEN_SPREAD", "WARN", `choice-length spread ${report.lenSpread.toFixed(2)} < 0.12 — mechanical equal-length authoring suspected (blocks unless waived)`);
  else if (report.lenSpread < 0.2) add("LEN_SPREAD", "WARN", `choice-length spread ${report.lenSpread.toFixed(2)} < 0.20`);

  return out;
}

export function banksUnderGuard(): Array<{ bank: string; items: GuardItem[]; config: BankConfig }> {
  const out: Array<{ bank: string; items: GuardItem[]; config: BankConfig }> = [];
  for (const a of DRILL_AREAS) {
    // Held items are excluded: a rationale that never renders cannot mislead a learner, and the
    // containment record is where a held item's defects belong. This measures what SERVES.
    out.push({
      bank: `debate:${a.id}`,
      items: DRILL_BANK.filter((q) => q.area === a.id && !DEBATE_DRILL_HELD_IDS.includes(q.id)),
      config: { enforced: true, servedShuffled: true }
    });
  }
  for (const a of DECA_DRILL_AREAS) {
    out.push({ bank: `deca:${a.id}`, items: DECA_DRILL_BANK.filter((q) => q.area === a.id), config: { enforced: true, servedShuffled: true } });
  }
  // HOSA MedTerm is measured in DIAGNOSTIC (report-only) mode: its repair is a separate,
  // not-yet-scoped slice, and silently hard-failing out-of-scope banks would misstate what P0.1
  // repaired. The numbers still print on every run so the debt stays visible.
  for (const a of MEDTERM_AREAS) {
    out.push({ bank: `hosa:${a.id}`, items: MEDTERM_BANK.filter((q) => q.area === a.id), config: { enforced: false, servedShuffled: true } });
  }
  return out;
}

/**
 * Every item in every bank, HELD ITEMS INCLUDED, labelled with its bank. This is the input to the
 * corpus-integrity checks: contamination crosses bank boundaries (sp-22 carried a WEIGHING item's
 * rationale), so a per-bank scan would have missed half of the defect that motivated it.
 */
export function guardedCorpus(): CorpusItem[] {
  const out: CorpusItem[] = [];
  for (const a of DRILL_AREAS) for (const q of DRILL_BANK.filter((x) => x.area === a.id)) out.push({ ...q, bank: `debate:${a.id}` });
  for (const a of DECA_DRILL_AREAS) for (const q of DECA_DRILL_BANK.filter((x) => x.area === a.id)) out.push({ ...q, bank: `deca:${a.id}` });
  for (const a of MEDTERM_AREAS) for (const q of MEDTERM_BANK.filter((x) => x.area === a.id)) out.push({ ...q, bank: `hosa:${a.id}` });
  return out;
}

export function main(): number {
  let hardFails = 0;
  console.log("Assessment-bank quality guard — deterministic answer-form audit (no DB, no env, no provider)");
  if (MCQ_GUARD_WAIVERS.length > 0) {
    console.log("ACTIVE WAIVERS (loud by design):");
    for (const w of MCQ_GUARD_WAIVERS) console.log(`  ${w.bank} / ${w.metric} — ${w.reason} (${w.date})`);
  }
  for (const { bank, items, config } of banksUnderGuard()) {
    const report = computeBankReport(bank, items);
    const verdicts = evaluateBank(report, config);
    const fails = verdicts.filter((v) => v.level === "FAIL" && !v.waived);
    const tag = config.enforced ? (fails.length ? "FAIL" : "pass") : "diagnostic";
    console.log(
      `  ${bank.padEnd(28)} n=${report.n}  H_LONG ${(report.hLong * 100).toFixed(1).padStart(5)}%  H_SHORT ${(report.hShort * 100).toFixed(1).padStart(5)}%  ` +
      `H_ELIM ${(report.hElim * 100).toFixed(1).padStart(5)}%  UL ${(report.ulRate * 100).toFixed(0).padStart(3)}%  R_MED ${report.rMed.toFixed(2)}  spread ${report.lenSpread.toFixed(2)}  [${tag}]`
    );
    for (const v of verdicts) {
      console.log(`      ${v.level}${v.waived ? " (waived)" : ""} ${v.metric}: ${v.detail}`);
      if (v.level === "FAIL" && !v.waived && config.enforced) hardFails += 1;
    }
    const outliers = rationaleLengthOutliers(items);
    if (outliers.length > 0) {
      console.log(`      DIAGNOSTIC LEN_ANOM: ${outliers.map((o) => `${o.id} ${o.ratio.toFixed(2)}x`).join(", ")} (long is not wrong — read them, do not repair on this signal)`);
    }
  }

  // CORPUS INTEGRITY — authoring artifacts, across every bank at once, held items included.
  const findings = corpusIntegrityFindings(guardedCorpus());
  if (findings.length === 0) {
    console.log("\n  corpus integrity: no edit-block delimiter, no foreign item id, and no item's rationale contained in another (all banks, held items included)");
  } else {
    console.error("\n  CORPUS INTEGRITY FAILURES — an authoring artifact reached learner-facing content:");
    for (const f of findings) console.error(`      FAIL ${f.kind} ${f.bank} / ${f.id}: ${f.detail}`);
    hardFails += findings.length;
  }
  if (hardFails > 0) {
    console.error(`\n${hardFails} hard failure(s) in enforced banks. This guard proves a negative about FORM only —`);
    console.error("passing it never substitutes for the content-review gate (human review or a recorded owner waiver).");
    return 1;
  }
  console.log("\nAll enforced banks pass the answer-form guard. (Semantic quality remains human-owned.)");
  return 0;
}

if (process.argv[1] && /assessment-quality-guard\.ts$/.test(process.argv[1])) {
  process.exit(main());
}
