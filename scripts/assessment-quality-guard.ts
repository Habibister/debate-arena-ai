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
 * distractors passes every metric here. The human blind-answer content review remains a separate,
 * mandatory gate; this guard only proves a negative about surface form.
 *
 * THRESHOLDS are derived from the measured separation, not invented: the measured healthy control
 * banks span H_LONG lift 0.04–0.22 while leaky banks measured 0.78–1.00 — the warn line (0.40) and
 * fail line (0.60, i.e. 70% raw accuracy at four options: the exact pass threshold) sit inside a
 * gap no honestly-authored bank has ever occupied in this repository.
 *
 * Run manually or in CI:  npm run assessment:quality   (exit 1 on any hard fail in enforced banks)
 */

import { DRILL_BANK, DRILL_AREAS } from "../lib/debate-drills";
import { DECA_DRILL_BANK, DECA_DRILL_AREAS } from "../lib/deca-drills";
import { MEDTERM_BANK, MEDTERM_AREAS } from "../lib/hosa-medterm";

export type GuardItem = { id: string; question: string; choices: string[]; correctAnswer: string };

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
};

export type BankConfig = { enforced: boolean; servedShuffled: boolean };

/**
 * Committed, loud, per-bank per-metric waivers. NEVER a silent skip: every entry names its reason
 * and is printed on every run. Empty today — the repaired banks must stand on their own.
 */
export const MCQ_GUARD_WAIVERS: ReadonlyArray<{ bank: string; metric: string; reason: string; date: string }> = [];

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
  };
}

export type Verdict = { bank: string; metric: string; level: "FAIL" | "WARN"; detail: string; waived: boolean };

const RANDOM = 0.25;
const lift = (acc: number) => (acc - RANDOM) / (1 - RANDOM);

export function evaluateBank(report: BankReport, config: BankConfig): Verdict[] {
  const out: Verdict[] = [];
  const waived = (metric: string) => MCQ_GUARD_WAIVERS.some((w) => w.bank === report.bank && w.metric === metric);
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

  if (report.lenSpread < 0.12) add("LEN_SPREAD", "WARN", `choice-length spread ${report.lenSpread.toFixed(2)} < 0.12 — mechanical equal-length authoring suspected (blocks unless waived)`);
  else if (report.lenSpread < 0.2) add("LEN_SPREAD", "WARN", `choice-length spread ${report.lenSpread.toFixed(2)} < 0.20`);

  return out;
}

export function banksUnderGuard(): Array<{ bank: string; items: GuardItem[]; config: BankConfig }> {
  const out: Array<{ bank: string; items: GuardItem[]; config: BankConfig }> = [];
  for (const a of DRILL_AREAS) {
    out.push({ bank: `debate:${a.id}`, items: DRILL_BANK.filter((q) => q.area === a.id), config: { enforced: true, servedShuffled: true } });
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
  }
  if (hardFails > 0) {
    console.error(`\n${hardFails} hard failure(s) in enforced banks. This guard proves a negative about FORM only —`);
    console.error("passing it never substitutes for the human blind-answer content review.");
    return 1;
  }
  console.log("\nAll enforced banks pass the answer-form guard. (Semantic quality remains human-owned.)");
  return 0;
}

if (process.argv[1] && /assessment-quality-guard\.ts$/.test(process.argv[1])) {
  process.exit(main());
}
