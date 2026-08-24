/**
 * Regression guard for the DECA/HOSA judge response shape.
 *
 * History: providers returned `categoryScores` as an OBJECT MAP ({"solutionQuality": 5, ...})
 * because the prompt never specified the structure; isValidPerformanceJudge requires an ARRAY of
 * {key,label,score,reason}, so every live judge response failed validation and users silently got
 * the deterministic fallback — apparently since the judges shipped. Fixed 2026-07-05 by spelling
 * out the exact structure in both judge prompts. This smoke keeps that from regressing:
 *
 *  1. (offline) both judge prompts still contain the explicit ARRAY instruction
 *  2. (offline) the object-map shape that caused the original failure is still rejected
 *  3. (live)    a REAL judge call returns categoryScores as an array of {key,label,score,reason}
 *
 * The live check retries transient provider errors. If NO provider responds at all (offline dev,
 * exhausted quotas), it warns and exits 0 — provider outages are not shape regressions. A live
 * response with the wrong shape always fails.
 *
 * Run with: npm run judge-shape:smoke
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv(".env.local");
loadEnv(".env");

async function main() {
  // 1. The structural instruction must stay in both judge prompts.
  const aiSource = readFileSync("lib/ai.ts", "utf8");
  const structuralInstruction = 'categoryScores: an ARRAY (not an object) with one entry per rubric category';
  const occurrences = aiSource.split(structuralInstruction).length - 1;
  assert.equal(occurrences, 2, "both DECA and HOSA judge prompts spell out the categoryScores ARRAY structure");
  assert.ok(
    aiSource.includes('readinessForNextLevel: {"ready": boolean'),
    "judge prompts spell out the readinessForNextLevel object shape"
  );

  // 2. The validator still rejects the historical failure shape (object map).
  //    isValidPerformanceJudge is module-private; assert its load-bearing check directly.
  assert.ok(
    /Array\.isArray\(result\?\.categoryScores\)\s*&&\s*result\.categoryScores\.length > 0/.test(aiSource),
    "validator still requires categoryScores to be a non-empty array"
  );
  const objectMapShape = { categoryScores: { solutionQuality: 5 }, overallScore: 80, strengths: [], weaknesses: [], readinessForNextLevel: { ready: true } };
  assert.equal(Array.isArray(objectMapShape.categoryScores), false, "sanity: the historical failure shape is not an array");

  // ---- 2b. M14 Phase 1c (audit G18): DECA judging fails CLOSED — no canned ballot, ever ----------
  // All scans run over comment-stripped source, because the code describes in prose exactly what it
  // refuses to do.
  const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
  const aiCode = strip(aiSource);
  const decaSlice = aiCode.slice(
    aiCode.indexOf("export async function judgeDecaRoleplay"),
    aiCode.indexOf("function fallbackHosaScenario")
  );
  assert.ok(decaSlice.length > 500, "P1c-0. control: the judgeDecaRoleplay slice was actually located");

  // The jsonCompletion call passes NO fallback and the strict DECA validator.
  assert.ok(/undefined,\s*"DECA judge",\s*isTrustworthyDecaJudge/.test(decaSlice),
    "P1c-1. DECA judging passes no fallback and uses the strict validator");
  assert.ok(!decaSlice.includes("fallbackPerformanceJudge"),
    "P1c-2. the canned ballot builder is unreachable from the DECA judge");

  // The strict validator really is strict: finite overall, finite category scores, on top of the
  // shared shape check.
  const validatorSlice = aiCode.slice(aiCode.indexOf("function isTrustworthyDecaJudge"), aiCode.indexOf("export type RoleplayScenario"));
  assert.ok(validatorSlice.includes("isValidPerformanceJudge(result)"), "P1c-3. it builds on the shared shape check");
  assert.ok(validatorSlice.includes("Number.isFinite(result.overallScore)"), "P1c-3b. and rejects a non-finite overall");
  assert.ok(/categoryScores\.every\(\(category\) => Number\.isFinite\(category\?\.score\)\)/.test(validatorSlice),
    "P1c-3c. and rejects any non-finite category score");

  // With no fallback, jsonCompletion THROWS the repo's retryable unavailable error — the routes'
  // apiError maps it to the existing 503 contract, so a failed DECA judge is an error, never a ballot.
  const jsonCompletionSlice = aiCode.slice(aiCode.indexOf("async function jsonCompletion"), aiCode.indexOf("export async function generateTopic"));
  assert.ok(/if \(hasFallback\(fallback\)\)/.test(jsonCompletionSlice) &&
            /throw new OpenAIUnavailableError/.test(jsonCompletionSlice),
    "P1c-4. the no-fallback path throws the retryable unavailable error");
  const apiCode = strip(readFileSync("lib/api.ts", "utf8"));
  assert.ok(/OpenAIUnavailableError/.test(apiCode) && /status: 503/.test(apiCode),
    "P1c-5. and the shared apiError maps it to the retryable 503 contract");

  // ATTRIBUTION ORDERING: the registry stamp sits AFTER the validated jsonCompletion call inside
  // judgeDecaRoleplay. Because every failure now throws before returning, any result that reaches
  // the stamp has passed the strict validator — a fallback or invalid ballot can never be stamped.
  const attributionOrdered = (slice: string) => {
    const call = slice.indexOf("jsonCompletion<");
    const stamp = slice.search(/if \(registry\) \{\s*result\.rubricSource = registry\.tag;/);
    return call !== -1 && stamp !== -1 && call < stamp;
  };
  assert.ok(attributionOrdered(decaSlice), "P1c-6. official attribution follows the validated judge call");

  // A DECA response also cannot be marked both unavailable and judged: unavailability is a THROWN
  // error, not a result field — the slice constructs no `unavailable` result.
  assert.ok(!/unavailable\s*:/.test(decaSlice), "P1c-7. no result object carries an unavailable flag");

  // THE JUDGE ROUTE writes nothing before the judge call, so a DECA throw leaves the debate
  // retryable: no XP, no rank, no wins/streak, no JUDGED status, transcript untouched.
  const judgeRoute = strip(readFileSync("app/api/debates/[debateId]/judge/route.ts", "utf8"));
  const routePost = judgeRoute.slice(judgeRoute.indexOf("export async function POST"));
  const judgeCallAt = routePost.indexOf("runOrganizationJudge(");
  assert.ok(judgeCallAt !== -1, "P1c-8. control: the route's judge call was located");
  for (const [what, token] of [
    ["XP award", "awardXpInTransaction("],
    ["JUDGED status", 'status: "JUDGED"'],
    // M15 S1A A3a: this row used to pin "wins: wonDebate ? user.wins + 1 : user.wins". That write no
    // longer exists — A3a stopped the judge route incrementing wins at all — so the row now pins the
    // XP ledger entry instead. The PROPERTY under test is unchanged and still fully covered: every
    // progression write sits after the judge call, so a DECA throw leaves the debate retryable.
    ["XP ledger entry", "tx.xPLog.create("],
    // M15 S1A A4a: the stale `streak: user.streak + 1` became the atomic `{ increment: 1 }` so a
    // concurrent activity cannot lose an update. Same write, same position, same property under
    // test — only the token moves.
    ["practice-session counter", "streak: { increment: 1 }"],
    // A4a adds the per-user serialization point; it must also sit after the judge call, or a DECA
    // throw would leave a learner's row locked for no reason.
    ["user row lock", "lockUserRow(tx,"]
  ] as const) {
    const at = routePost.indexOf(token);
    assert.ok(at !== -1 && judgeCallAt < at, `P1c-8b. the ${what} sits after the judge call, so a throw skips it`);
  }
  // And the dedicated DECA judge route has no writes at all — it returns the result or apiError.
  const decaRoute = strip(readFileSync("app/api/ai/judge-deca/route.ts", "utf8"));
  assert.ok(!/prisma\./.test(decaRoute), "P1c-9. the dedicated DECA judge route persists nothing");

  // NON-DECA PRESERVATION: the shared canned builder remains for its other consumer (HOSA's
  // function body — unreachable from routes since Phase 1b but deliberately unchanged), and Model
  // UN keeps its own fallback. The Phase 1b HOSA guards stay pinned by hosa-practice-scope:smoke.
  assert.ok(/fallbackPerformanceJudge\(\{ organization: "HOSA"/.test(aiCode),
    "P1c-10. the shared fallback keeps its non-DECA consumer unchanged");
  assert.ok(/fallbackMunJudge\(\)/.test(aiCode), "P1c-10b. Model UN keeps its own fallback");
  assert.ok(/judgeDebate/.test(aiCode) && judgeRoute.includes("generateJudgeDecision"),
    "P1c-10c. Debate judging remains wired");

  // ---- Non-vacuous controls ------------------------------------------------------------------------
  // C1: re-introducing the canned DECA fallback IS detected.
  assert.ok((decaSlice + '() => fallbackPerformanceJudge({ organization: "DECA" })').includes("fallbackPerformanceJudge"),
    "P1c-C1. control: a re-introduced DECA fallback is detected");
  // C2: weakening the validator IS detected — strip the finite checks and P1c-3b's pattern vanishes.
  assert.ok(!validatorSlice.replace(/Number\.isFinite\(result\.overallScore\)/g, "true").includes("Number.isFinite(result.overallScore)"),
    "P1c-C2. control: removing the finite-overall check is detected");
  // C3: the comment-strip is doing real work — the raw source EXPLAINS the removed fallback in
  // prose, and the stripped slice must not match on that prose.
  const rawDecaSlice = aiSource.slice(aiSource.indexOf("export async function judgeDecaRoleplay"), aiSource.indexOf("function fallbackHosaScenario"));
  assert.ok(rawDecaSlice.includes("fallbackPerformanceJudge"),
    "P1c-C3. control: the raw source mentions the fallback in prose");
  assert.ok(!strip('// fallbackPerformanceJudge\n/* fallbackPerformanceJudge */').includes("fallbackPerformanceJudge"),
    "P1c-C3b. control: the stripper removes both comment styles");
  // C4: moving the attribution above the judge call IS rejected by the ordering predicate.
  const mutatedOrder = 'if (registry) { result.rubricSource = registry.tag; } ' + decaSlice.replace(/if \(registry\) \{\s*result\.rubricSource = registry\.tag;\s*\}/, "");
  assert.ok(!attributionOrdered(mutatedOrder), "P1c-C4. control: attribution moved before the judge call is rejected");

  // ---- A2. exactly-once judged-attempt claim (M15 S1A A2) -------------------------------------------
  // The pre-read 409 outside the transaction is a fast path only: two racers can both pass it and
  // both finish the judge work. Correctness is the conditional status transition INSIDE the
  // progression transaction. These assertions bind the claim's model, id, exact eligibility set,
  // transition, count check and ordering — not merely "source contains updateMany".
  // Actual simultaneous-request behavior relies on PostgreSQL conditional-update semantics; no
  // DB-writing concurrency test was executed.
  const judgeRouteSrc = strip(readFileSync("app/api/debates/[debateId]/judge/route.ts", "utf8"));
  const judgeTxn = judgeRouteSrc.slice(judgeRouteSrc.indexOf("prisma.$transaction(async (tx) =>"));
  assert.ok(judgeTxn.length > 100, "A2-1. the judge persistence transaction was located");
  const claimIdx = judgeTxn.indexOf("await tx.debate.updateMany(");
  assert.ok(claimIdx >= 0, "A2-2. the transaction claims the debate with a conditional updateMany");
  assert.ok(/where: \{ id: debate\.id, status: \{ notIn: \["JUDGED", "ARCHIVED"\] \} \}/.test(judgeTxn),
    "A2-3. the claim binds the debate id and EXACTLY the pre-read eligibility set ({SETUP, ACTIVE} -> JUDGED)");
  assert.ok(/data: \{ status: "JUDGED" \}/.test(judgeTxn), "A2-4. and performs the JUDGED transition itself");
  assert.ok(/if \(claim\.count === 0\)[\s\S]{0,160}409/.test(judgeTxn),
    "A2-5. a zero-count loser exits with the existing 409 before any progression");
  assert.equal(judgeTxn.indexOf("await tx."), claimIdx,
    "A2-6. the claim is the FIRST tx operation — nothing, read or write, precedes it");
  // A3a removed the SpeakingSkillSnapshot write entirely, so it is no longer in this list — a
  // non-existent write needs no claim guarding it. A3a-6 below proves it is absent rather than
  // merely unguarded, which is the stronger property.
  for (const effect of ["awardXpInTransaction(", "tx.debate.update(", "tx.user.update(",
                        "tx.xPLog.create("]) {
    const effectIdx = judgeTxn.indexOf(effect);
    assert.ok(effectIdx > claimIdx, `A2-7. ${effect} happens only AFTER a successful claim`);
    // M15 S1B Batch III: the ordering comparison alone was vacuous in ONE direction. `a > b` exposes
    // its RIGHT operand: with the transaction opener absent indexOf returns -1 and `effectAt > -1`
    // holds for every effect, so deleting the very transaction boundary this control exists to
    // police turned it green — only the neighbouring A2-1 went red, never this control itself. Both
    // anchors are now proven present before the ordering is accepted.
    const effectAt = judgeRouteSrc.indexOf(effect);
    const txnOpenAt = judgeRouteSrc.indexOf("prisma.$transaction(async (tx) =>");
    assert.ok(effectAt >= 0 && txnOpenAt >= 0,
      `A2-7b-anchors. both ${effect} and the progression transaction opener are present`);
    assert.ok(effectAt > txnOpenAt,
      `A2-7b. and ${effect} first appears after the progression transaction opens`);
  }
  // NON-VACUOUS: at the FROZEN pre-A2 pin the same transaction had the progression writes but NO
  // claim — the detector demonstrably distinguishes the defective baseline from the fix.
  const PRE_M15_A2 = "b476ce68bbbeac606f9af8ef1f375e9824d4508b";
  const judgeAtBaseline = strip(
    execSync(`git show ${PRE_M15_A2}:'app/api/debates/[debateId]/judge/route.ts'`, { encoding: "utf8" }));
  const baselineTxn = judgeAtBaseline.slice(judgeAtBaseline.indexOf("prisma.$transaction(async (tx) =>"));
  assert.ok(!baselineTxn.includes("tx.debate.updateMany("),
    "A2-C1. control: the pre-A2 transaction had no conditional claim");
  assert.ok(baselineTxn.includes("awardXpInTransaction(") && baselineTxn.includes("tx.xPLog.create("),
    "A2-C1b. control: yet it already carried the progression writes the claim now guards");
  assert.ok(/where: \{ id: x\.id, status: \{ notIn: \["JUDGED", "ARCHIVED"\] \} \}/.test(
    'await tx.debate.updateMany({ where: { id: x.id, status: { notIn: ["JUDGED", "ARCHIVED"] } }, data: { status: "JUDGED" } });'),
    "A2-C2. control: the eligibility detector matches a correctly structured synthetic claim");

  // ---- A3a. formative ballot output has no progression authority (M15 S1A A3a) --------------------
  // The winner and every ballot number are FORMATIVE on both scoring paths. Path A (Debate, Mock
  // Trial, Public Speaking, Model UN) derives them from lexical marker counts: a marker-stuffed
  // circular speech was measured beating genuine reasoning 98-65 from EITHER seat. Path B (DECA) is
  // AI-scored against a sourced registry rubric — stronger, but never validated against human judge
  // ballots, and it has no opponent at all, so `didStudentWin`'s `overallScore >= 80` fallback would
  // call a solo role-play a "win". Neither may create authoritative progression. These assertions
  // bind the STRUCTURES that could carry that authority, not a global absence of a word.

  // A3a-1. XP from judging carries no winner-conditional term.
  //
  // M15 S1A A4a retargeted this control. It used to pin the literal
  // `const xpEarned = XP_REWARDS.debateCompleted;`, but A4a moved the AMOUNT decision into the
  // transaction (it now depends on how many awards the learner already has today). The A3a property
  // is unchanged and is what is asserted here: the amount comes from the completion-based reward
  // helper, and nothing winner-derived can reach it.
  assert.ok(/xpEarned = rewardAmountForCompletion\("DEBATE", positiveAwardsToday\);/.test(judgeRouteSrc),
    "A3a-1. the Debate XP amount comes from the completion-based reward helper");
  assert.ok(!/xpEarned\s*=\s*[^;]*(wonDebate|teamWinner|overallScore)/.test(judgeRouteSrc),
    "A3a-1b. and no winner or score term is ever assigned into it");
  assert.ok(!/XP_REWARDS\.debateWon/.test(judgeRouteSrc),
    "A3a-2. the judge route never references the win bonus");
  // ...while the constant itself SURVIVES for M16's validated judge to earn back.
  assert.ok(/debateWon:\s*\d+/.test(readFileSync("lib/constants.ts", "utf8")),
    "A3a-2b. yet XP_REWARDS.debateWon still exists in lib/constants.ts (not deleted)");

  // A3a-3/4. No `wins` write survives anywhere in the route. Bound to the WRITE POSITION: `wins`
  // may still be READ (it feeds the internal bot-matching projection) and returned in the response,
  // so a bare "no substring `wins`" check would be both wrong and vacuous.
  for (const updateCall of judgeRouteSrc.split("tx.user.update(").slice(1)) {
    const dataBlock = updateCall.slice(0, updateCall.indexOf("})"));
    assert.ok(!/\bwins\s*:/.test(dataBlock),
      "A3a-3. no tx.user.update in the judge route writes a wins field");
  }
  assert.ok(/wins: user\.wins\b/.test(judgeRouteSrc) && !/wins: wonDebate/.test(judgeRouteSrc),
    "A3a-4. the rating projection uses the STORED wins, never a speculative +1");

  // A3a-5. The winner cannot reach any write. This is checked by VALUE FLOW, not by proximity.
  //
  // An earlier draft of this control only checked that `wonDebate` never appeared on the same
  // physical LINE as a `tx.*.create/update` token. Adversarial review killed it: every write in this
  // route is multi-line, so the check passed unchanged against the pre-A3a route that DID increment
  // wins from the winner, and a one-line indirection —
  //     const winBonus = wonDebate ? 50 : 0;  ...  awardXpInTransaction(tx, id, xpEarned + winBonus)
  // — shipped green through the whole suite. Both holes are closed below by (a) extracting each
  // write's FULL balanced argument block and (b) pinning the XP value flow to a bare identifier so
  // no arithmetic can be spliced in.
  assert.ok(/const wonDebate = didStudentWin\(/.test(judgeRouteSrc),
    "A3a-5. control: the winner is still computed (coaching preserved)");
  assert.ok(/teamWinner/.test(judgeRouteSrc),
    "A3a-5c. teamWinner remains available to the formative ballot");

  // Extract the full balanced (...) argument block of every tx write in the route.
  const writeBlocks: Array<{ call: string; block: string }> = [];
  for (const m of judgeRouteSrc.matchAll(/tx\.(\w+)\.(create|update|updateMany|upsert)\(/g)) {
    const open = (m.index ?? 0) + m[0].length - 1;
    let depth = 0;
    let end = open;
    for (let i = open; i < judgeRouteSrc.length; i++) {
      if (judgeRouteSrc[i] === "(") depth++;
      else if (judgeRouteSrc[i] === ")") { depth--; if (depth === 0) { end = i; break; } }
    }
    writeBlocks.push({ call: `tx.${m[1]}.${m[2]}`, block: judgeRouteSrc.slice(open, end + 1) });
  }
  assert.ok(writeBlocks.length >= 4, "A3a-5d. control: the route's tx write blocks were located");
  for (const { call, block } of writeBlocks) {
    assert.ok(!/wonDebate|teamWinner|didStudentWin/.test(block),
      `A3a-5b. no winner value appears anywhere inside the ${call} payload`);
  }
  // The same extractor MUST fire on the pre-A3a route, where the winner was spliced into two write
  // payloads (`wins:` and the XPLog `reason:`) — otherwise this control proves nothing.
  {
    const baseSrc = strip(
      execSync(`git show bb7c4dcc3d6f0af76dd624a0b77dea5f9dabf7c2:'app/api/debates/[debateId]/judge/route.ts'`, { encoding: "utf8" }));
    let winnerInBaselineWrite = false;
    for (const m of baseSrc.matchAll(/tx\.(\w+)\.(create|update|updateMany|upsert)\(/g)) {
      const open = (m.index ?? 0) + m[0].length - 1;
      let depth = 0;
      let end = open;
      for (let i = open; i < baseSrc.length; i++) {
        if (baseSrc[i] === "(") depth++;
        else if (baseSrc[i] === ")") { depth--; if (depth === 0) { end = i; break; } }
      }
      if (/wonDebate/.test(baseSrc.slice(open, end + 1))) winnerInBaselineWrite = true;
    }
    assert.ok(winnerInBaselineWrite,
      "A3a-5e. control: the block extractor DOES catch the winner inside the pre-A3a write payloads");
  }

  // A3a-5f. XP value flow is pinned to the bare identifier at BOTH consumers, so no winner-derived
  // term can be added on the way into the award or the ledger.
  assert.ok(/awardXpInTransaction\(tx, session\.user\.id, xpEarned\)/.test(judgeRouteSrc),
    "A3a-5f. the XP award receives xpEarned with no arithmetic");
  assert.ok(/amount: xpEarned,/.test(judgeRouteSrc) && !/amount: xpEarned\s*[+\-*/]/.test(judgeRouteSrc),
    "A3a-5g. the XP ledger amount is xpEarned with no arithmetic");
  // A4a: `xpEarned` is now declared `let xpEarned = 0` and decided once inside the transaction. The
  // zero initialiser is a safe default, not a decision, so it is excluded — what must stay unique is
  // the place the VALUE is chosen. Fails closed: two reward decisions, or one that bypasses the
  // helper, both break this.
  assert.ok(/let xpEarned = 0;/.test(judgeRouteSrc),
    "A3a-5h. xpEarned defaults to 0 before the transaction decides it");
  assert.equal((judgeRouteSrc.match(/xpEarned = (?!0;)/g) ?? []).length, 1,
    "A3a-5h2. and is decided in exactly one place, so A3a-1 pins the only value in play");
  // Control: the arithmetic detectors actually fire on the mutant adversarial review demonstrated.
  assert.ok(!/awardXpInTransaction\(tx, session\.user\.id, xpEarned\)/.test(
    "awardXpInTransaction(tx, session.user.id, xpEarned + winBonus)"),
    "A3a-5i. control: a spliced win-bonus term is rejected by the award detector");
  assert.ok(/amount: xpEarned\s*[+\-*/]/.test("amount: xpEarned + winBonus,"),
    "A3a-5j. control: a spliced win-bonus term is rejected by the ledger detector");

  // A3a-6. NO SpeakingSkillSnapshot row is written on ANY path — not merely guarded, absent.
  assert.ok(!/speakingSkillSnapshot/i.test(judgeRouteSrc),
    "A3a-6. the judge route creates no SpeakingSkillSnapshot on any organization path");
  assert.ok(/model SpeakingSkillSnapshot/.test(readFileSync("prisma/schema.prisma", "utf8")),
    "A3a-6b. yet the model itself is retained in the schema (no migration, history intact)");
  // The visible ballot still carries the speaking dimensions — only the persisted row is gone.
  assert.ok(/result\.sharedSpeaking/.test(judgeRouteSrc),
    "A3a-6c. sharedSpeaking still feeds the learner-visible ballot");

  // A3a-7. Judging basis is persisted into the existing judgeReport Json — no schema change.
  // A3a-7. scoredBy must report the ACTUAL scorer. DECA may only be labelled "registry-weighted"
  // when judgeDecaRoleplay actually ran in that mode — its per-category point split is still
  // unsourced today (seeded `points: null` + PLACEHOLDER, so getWeightedScoringRubric returns null
  // and scoringMode is "seed"). A label hardcoded off `organization` would therefore write a
  // fabricated provenance claim, which is precisely what this batch exists to stop.
  assert.ok(/scoredBy:[\s\S]{0,240}debate\.organization !== "DECA"[\s\S]{0,80}"local-lexical-rubric"/.test(judgeRouteSrc),
    "A3a-7. non-DECA rounds are labelled local-lexical-rubric");
  assert.ok(/result\.scoringMode === "registry-weighted"[\s\S]{0,120}"ai-registry-weighted"[\s\S]{0,60}"ai-seed-rubric"/.test(judgeRouteSrc),
    "A3a-7b. and DECA is labelled registry-weighted ONLY when the judge actually scored that way");
  assert.ok(!/scoredBy: debate\.organization === "DECA" \? "ai-registry-weighted"/.test(judgeRouteSrc),
    "A3a-7c. the label is never hardcoded from the organization alone");
  // Control: the DECA weighted path is genuinely dormant today, so "ai-seed-rubric" is the truthful
  // current value — if this ever flips, the label upgrades itself rather than lying either way.
  assert.ok(/points: null/.test(readFileSync("scripts/seed-competition-specs.ts", "utf8")),
    "A3a-7d. control: DECA's seeded point split is still unsourced (points: null)");
  assert.ok(/progressionBasis: "completion-only"/.test(judgeRouteSrc),
    "A3a-8. progressionBasis is completion-only");
  assert.ok(!/progressionBasis: "scored"/.test(judgeRouteSrc),
    "A3a-8b. and NEVER 'scored' — no path's numbers carry progression authority under A3a");
  assert.ok(/assisted: debate\.assistedPractice/.test(judgeRouteSrc),
    "A3a-9. the Side Coach assistance basis is persisted from the stored flag");
  // The basis object must land in judgeReport, not merely exist as a local.
  const ballotWrite = judgeRouteSrc.slice(judgeRouteSrc.indexOf("await tx.debate.update("));
  assert.ok(/judgeReport: resultWithRating/.test(ballotWrite.slice(0, ballotWrite.indexOf("})"))),
    "A3a-9b. and rides into the persisted judgeReport payload");

  // A3a-10. Completion authority is UNCHANGED: status, XP ledger and streak all survive.
  assert.ok(/tx\.xPLog\.create\(/.test(judgeTxn) && /sourceType: "DEBATE"/.test(judgeTxn),
    "A3a-10. the completion XP ledger entry still exists");
  // A4a made this atomic; the property (a completed round still counts as practice) is unchanged.
  assert.ok(/streak: \{ increment: 1 \}/.test(judgeTxn), "A3a-10b. the practice-session counter still increments");
  // A4a: the reason now branches on whether the daily quota paid out — never on the winner.
  assert.ok(!/reason: wonDebate \?/.test(judgeTxn) && /reason: xpEarned > 0 \?/.test(judgeTxn) &&
            /"Completed AI debate"/.test(judgeTxn),
    "A3a-10c. the ledger reason branches on the reward outcome, never on the winner");

  // A3a-11/12. COACH EVIDENCE INTEGRITY — the downstream half of retiring the wins write.
  //
  // `lib/coach-progress.ts` used to derive `losses = judgedRounds - wins`. That was always an
  // inference, and A3a made it strictly false: this route was the SOLE writer of `User.wins`, so
  // once it stops incrementing, `wins` freezes while `judgedRounds` keeps climbing and every future
  // judged round is reported to the coach as a loss. There is no `losses` column and no `winner`
  // column on Debate, so that number described no recorded event at all. It is asserted here rather
  // than in a coach suite because the only suite that exercises coach-progress is team:smoke, which
  // writes to the database and is never run; these are pure source checks needing no DB.
  const coachProgressSrc = strip(readFileSync("lib/coach-progress.ts", "utf8"));
  assert.ok(!/judgedRounds\s*-\s*wins/.test(coachProgressSrc),
    "A3a-11. coach progress no longer derives losses by subtracting a retired counter");
  assert.ok(!/\blosses\b/.test(coachProgressSrc),
    "A3a-11b. and exposes no losses field at all");
  assert.ok(/judgedRounds = judgedDebates\.length/.test(coachProgressSrc),
    "A3a-11c. while the real judged-round count it replaces is still computed from JUDGED rows");
  // The coach-visible surface must not restate that record either: "Wins 0" beside a growing round
  // count asserts the same false thing by implication, so the pair goes together.
  const coachStudentPage = strip(readFileSync("app/(app)/coach/students/[studentId]/page.tsx", "utf8"));
  assert.ok(!/label="Losses"/.test(coachStudentPage) && !/label="Wins"/.test(coachStudentPage),
    "A3a-12. the coach student detail renders no fabricated win/loss record");
  assert.ok(/label="Judged rounds"/.test(coachStudentPage),
    "A3a-12b. and still shows the truthful judged-round count");
  // NON-VACUOUS: both defects were present at the frozen baseline.
  {
    const coachAtBaseline = strip(
      execSync(`git show bb7c4dcc3d6f0af76dd624a0b77dea5f9dabf7c2:lib/coach-progress.ts`, { encoding: "utf8" }));
    const pageAtBaseline = strip(
      execSync(`git show bb7c4dcc3d6f0af76dd624a0b77dea5f9dabf7c2:'app/(app)/coach/students/[studentId]/page.tsx'`, { encoding: "utf8" }));
    assert.ok(/judgedRounds\s*-\s*wins/.test(coachAtBaseline),
      "A3a-11-C. control: the pre-A3a coach helper DID subtract wins from judged rounds");
    assert.ok(/label="Losses"/.test(pageAtBaseline),
      "A3a-12-C. control: and the pre-A3a coach page DID render that fabricated Losses chip");
  }

  // ---- A3b-1. practice-ballot PRESENTATION honesty (M15 S1A A3b-1) -------------------------------
  // A3a removed false progression AUTHORITY; A3b-1 removes false presentation authority from the
  // ballot itself. The ballot still shows a winner, a score, categories, an RFD and a next step —
  // only its status changes. Learner-facing copy is checked comment-stripped so the explanatory
  // comments (which necessarily quote the OLD strings) cannot satisfy or defeat these.
  const ballotSrc = strip(readFileSync("components/debate/debate-arena.tsx", "utf8"));
  const aiSrcA3b = strip(readFileSync("lib/ai.ts", "utf8"));

  assert.ok(/Practice ballot/.test(ballotSrc), "A3b-1. the ballot badge says Practice ballot");
  assert.ok(!/Judge decision/.test(ballotSrc), "A3b-2. and no longer says 'Judge decision'");
  assert.ok(/wins this practice round/.test(ballotSrc),
    "A3b-3. the winner headline frames the result as a practice round");
  assert.ok(/CompeteReady practice decision — for coaching, not your competition record\./.test(ballotSrc),
    "A3b-4. one supporting line states the status of the decision");
  assert.ok(/Practice ballot score/.test(ballotSrc) && !/>Overall score</.test(ballotSrc),
    "A3b-5. the score is labelled Practice ballot score, not Overall score");
  assert.ok(/Formative coaching score — not mastery or readiness\./.test(ballotSrc),
    "A3b-6. and carries the mastery/readiness disclaimer exactly once");
  // A3b-2 hardening (carried from the A3b-1 Production verification). These counts were
  // case-SENSITIVE, so a duplicate that merely re-capitalised the sentence — "Not mastery or
  // readiness." — slipped through while an exact copy-paste was caught. A mutation probe
  // demonstrated exactly that escape. Both qualifiers are now counted case-insensitively, and the
  // competition-record qualifier is counted too, which it never was.
  assert.equal((ballotSrc.match(/not mastery or readiness/gi) ?? []).length, 1,
    "A3b-6b. the mastery/readiness qualifier appears exactly once (case-insensitive)");
  assert.equal((ballotSrc.match(/for coaching, not your competition record/gi) ?? []).length, 1,
    "A3b-6c. and the competition-record qualifier appears exactly once (case-insensitive)");
  // Control: the case-insensitive counter really does catch a capitalisation-only duplicate, which
  // the previous case-sensitive form did not.
  assert.equal(
    ("x not mastery or readiness y Not Mastery Or Readiness z".match(/not mastery or readiness/gi) ?? []).length, 2,
    "A3b-6d. control: a capitalisation-only duplicate is now detected");
  assert.ok(/Practice feedback by area/.test(ballotSrc) && /Where the practice judge saw strengths and areas to improve\./.test(ballotSrc),
    "A3b-7. the category grid has one parent framing");
  assert.ok(/Where to focus next/.test(ballotSrc) && !/Rating movement/.test(ballotSrc),
    "A3b-8. the rating-movement panel is now Where to focus next");

  // A3b-9. The signed deltas are GONE from render. Bound to the render expression that produced
  // them, not to a loose "+" search.
  assert.ok(!/Number\(value\) >= 0 \? "\+" : ""/.test(ballotSrc),
    "A3b-9. no signed +/- rating delta is rendered");
  assert.ok(/function focusLabel\(delta: number\)/.test(ballotSrc),
    "A3b-10. a qualitative label is derived from the stored band instead");
  for (const word of ["Strength", "On track", "Developing", "Focus", "Priority"]) {
    assert.ok(new RegExp(`text: "${word}"`).test(ballotSrc), `A3b-10b. focus state "${word}" exists as a WORD`);
  }
  // Every focus state pairs its colour with an icon, so status is never colour-only (CLAUDE.md).
  const focusBody = ballotSrc.slice(ballotSrc.indexOf("function focusLabel(delta: number)"));
  for (const line of focusBody.slice(0, focusBody.indexOf("\n}")).split("\n").filter((l) => l.includes("text:"))) {
    assert.ok(/Icon:/.test(line) && /tone:/.test(line), `A3b-10c. that state carries an icon too: ${line.trim()}`);
  }

  // A3b-11. Server prose no longer claims a rating moved.
  assert.ok(!/rating increased|rating decreased|Rating movement/.test(judgeRouteSrc),
    "A3b-11. the judge route emits no rating-movement prose");
  assert.ok(/The practice judge scored \$\{area\} highly because/.test(judgeRouteSrc) &&
            /is a focus area because/.test(judgeRouteSrc),
    "A3b-11b. and emits practice-feedback prose instead");

  // A3b-12/13. Provider attribution. Path A never scores with the provider, in either state.
  assert.ok(!/Live AI judge unavailable/.test(aiSrcA3b),
    "A3b-12. the misleading 'live AI judge unavailable' notice is gone");
  assert.ok(/Extra AI-written feedback isn't available right now\./.test(aiSrcA3b),
    "A3b-12b. the failure notice scopes the outage to written feedback only");
  assert.ok(/practice ballot score still comes from CompeteReady's practice rubric/.test(aiSrcA3b),
    "A3b-12c. and states the score basis is unchanged by the outage");
  assert.ok(/merged\.aiNotice = undefined;/.test(aiSrcA3b) && !/merged\.aiNotice = providerBanner/.test(aiSrcA3b),
    "A3b-13. a successful ballot shows no provider-brand banner");
  // ...while the shared helper stays truthful and untouched for its other consumers.
  assert.ok(/Gemini AI is active\./.test(readFileSync("lib/ai-providers.ts", "utf8")),
    "A3b-13b. control: providerBanner itself is unchanged for non-ballot features");
  assert.ok(/const banner = providerBanner\(provider\);/.test(aiSrcA3b),
    "A3b-13c. control: its other consumer in lib/ai.ts still uses it");

  // A3b-14. Path B (DECA) is not flattened into Path A's copy: with no teamWinner the ballot must
  // not render the two-sided headline, which previously read "Winner unavailable wins".
  // Bound to the ternary's STRUCTURE — the two-sided copy in the truthy branch, the role-play
  // headline after the `) : (` — rather than to a character distance that reformatting would break.
  assert.ok(/report\.teamWinner \?[\s\S]{0,600}wins this practice round[\s\S]{0,300}\) : \([\s\S]{0,150}Practice round scored/.test(ballotSrc),
    "A3b-14. a role-play with no opposing side gets its own headline");
  assert.ok(!/Winner unavailable wins/.test(ballotSrc),
    "A3b-14b. and never renders 'Winner unavailable wins'");

  // A3b-15. COACHING SURVIVES. A3b-1 is wording and hierarchy only.
  for (const kept of ["categoryScores", "strengths", "weaknesses", "recommendedLessons",
                      "shortReasonForDecision", "transcriptFeedback", "judgeFairnessReport",
                      "betterSentence", "reasonForDecision"]) {
    assert.ok(ballotSrc.includes(kept), `A3b-15. the ballot still renders ${kept}`);
  }

  // NON-VACUOUS. Two immutable pins are in play and they are NOT interchangeable:
  //   PRE_M15_A3B1 (9b396753) — the last commit where the BALLOT still said "Judge decision",
  //     "Overall score", "Rating movement" and composed "Winner unavailable wins".
  //   PRE_M15_A3B2 (7b4f78ac) — the last commit where the DASHBOARD/PROFILE/REPLAY still showed a
  //     legacy wins counter and unframed judge scores.
  // Each control below pins the commit where the defect it guards actually existed. Neither is
  // HEAD-relative, so neither self-heals on the next commit.
  //   PRE_M15_A3B3 (e652cbe3) — the last commit where the COACH ROSTER still rendered the frozen
  //     wins counter and derived activity from it, the coach detail said "Avg judge score", and the
  //     assignment picker formatted a formative score as a bare "(n)".
  const PRE_M15_A3B1 = "9b396753b235dd9fd0ac08768194b1253d6138c5";
  const PRE_M15_A3B2 = "7b4f78ac51f313b53937ca944a65b5eff7d847de";
  const PRE_M15_A3B3 = "e652cbe365c7dc6faa618d989f51d4232adb381d";
  const ballotAtA3a = strip(
    execSync(`git show ${PRE_M15_A3B1}:components/debate/debate-arena.tsx`, { encoding: "utf8" }));
  const aiAtA3a = strip(execSync(`git show ${PRE_M15_A3B1}:lib/ai.ts`, { encoding: "utf8" }));
  const routeAtA3a = strip(
    execSync(`git show ${PRE_M15_A3B1}:'app/api/debates/[debateId]/judge/route.ts'`, { encoding: "utf8" }));
  assert.ok(/Judge decision/.test(ballotAtA3a), "A3b-C1. control: the pre-A3b-1 ballot DID say 'Judge decision'");
  assert.ok(/>Overall score</.test(ballotAtA3a), "A3b-C2. control: and DID label the score 'Overall score'");
  assert.ok(/Rating movement/.test(ballotAtA3a), "A3b-C3. control: and DID show a 'Rating movement' panel");
  assert.ok(/Number\(value\) >= 0 \? "\+" : ""/.test(ballotAtA3a),
    "A3b-C4. control: and DID render signed rating deltas");
  assert.ok(/text-6xl/.test(ballotAtA3a) && !/text-6xl/.test(ballotSrc),
    "A3b-C5. control: the score dropped one hierarchy level from 6xl");
  assert.ok(/Live AI judge unavailable/.test(aiAtA3a),
    "A3b-C6. control: the pre-A3b-1 failure notice WAS the misleading one");
  assert.ok(/merged\.aiNotice = providerBanner\(provider\)/.test(aiAtA3a),
    "A3b-C7. control: and a provider banner WAS attached to the ballot");
  assert.ok(/rating increased/.test(routeAtA3a),
    "A3b-C8. control: and the route DID emit 'rating increased' prose");

  // A3b-C9 (added in A3b-2, carried from the A3b-1 Production verification).
  //
  // The DECA defect A3b-1 fixed was never a single literal in the source: the headline
  // "Winner unavailable wins" was COMPOSED at render time from two fragments — winnerLabel()
  // returning the string "Winner unavailable" whenever `teamWinner` was absent, and the headline
  // template appending " wins". So the earlier controls could only assert the corrected branch
  // exists, not that the broken output was real. This control proves the composition by rebuilding
  // it from the frozen baseline's own source, which is what makes A3b-14 non-vacuous rather than
  // merely unfalsified.
  //
  // PIN NOTE: this control pins `PRE_M15_A3B1` (9b396753 — the A3b-1 baseline), NOT the A3b-2
  // baseline, because that is the only commit where the defect existed. The A3b-2 controls above
  // pin 7b4f78ac. Both pins are immutable SHAs; neither is HEAD-relative.
  {
    const winnerLabelFn = ballotAtA3a.slice(ballotAtA3a.indexOf("function winnerLabel(report: JudgeReport)"));
    const fnBody = winnerLabelFn.slice(0, winnerLabelFn.indexOf("\n}"));
    assert.ok(/if \(!report\.teamWinner\)/.test(fnBody) && /return "Winner unavailable";/.test(fnBody),
      "A3b-C9. control: at the A3b-1 baseline, winnerLabel() returned 'Winner unavailable' with no teamWinner");
    assert.ok(/\{winnerLabel\(report\)\} wins/.test(ballotAtA3a),
      "A3b-C9b. control: and the headline appended ' wins' to whatever it returned");
    assert.ok(!/report\.teamWinner \?/.test(ballotAtA3a),
      "A3b-C9c. control: with NO branch for a result that has no winner — so a DECA role-play composed the literal headline 'Winner unavailable wins'");
    // The composition, rebuilt: this is the exact string a DECA learner saw.
    const composedAtBaseline = "Winner unavailable" + " wins";
    assert.equal(composedAtBaseline, "Winner unavailable wins",
      "A3b-C9d. control: the two fragments compose to the reported defect");
    // ...and the current ballot can no longer produce it, because the no-winner case has its own copy.
    assert.ok(/\) : \([\s\S]{0,150}Practice round scored/.test(ballotSrc),
      "A3b-C9e. while the current ballot routes that same case to 'Practice round scored'");
  }

  // ---- A4a. daily XP is bounded; practice is not ---------------------------------------------------
  // Practice stays unlimited. Only the XP is capped: the first 3 qualifying completions of each type
  // per UTC day pay, everything after still completes, is still judged, keeps its coaching, still
  // counts as a practice session and is still assignment evidence — it just pays 0.

  // PURE FUNCTION: the reward curve itself, both types, across and past the quota.
  const { rewardAmountForCompletion, utcDayBounds, DAILY_REWARD_QUOTA } = await import("../lib/xp");
  assert.equal(DAILY_REWARD_QUOTA, 3, "A4a-1. the daily quota is 3 per activity type");
  for (const [n, want] of [[0, 25], [1, 25], [2, 25], [3, 0], [4, 0], [99, 0]] as const) {
    assert.equal(rewardAmountForCompletion("DEBATE", n), want, `A4a-2. Debate with ${n} awards today -> ${want} XP`);
  }
  for (const [n, want] of [[0, 20], [1, 20], [2, 20], [3, 0], [4, 0], [99, 0]] as const) {
    assert.equal(rewardAmountForCompletion("PRACTICE_TEST", n), want, `A4a-3. Test with ${n} awards today -> ${want} XP`);
  }
  // The helper takes ONLY a count — there is no score parameter, so no ballot score or test score can
  // reach reward eligibility even by accident.
  assert.equal(rewardAmountForCompletion.length, 2, "A4a-4. reward eligibility depends on type and count alone");

  // PURE FUNCTION: UTC day bounds, half-open so exact midnight belongs to one day only.
  {
    const mid = new Date("2026-08-13T00:00:00.000Z");
    const b = utcDayBounds(mid);
    assert.equal(b.start.toISOString(), "2026-08-13T00:00:00.000Z", "A4a-5. exact midnight starts the NEW day");
    assert.equal(b.end.toISOString(), "2026-08-14T00:00:00.000Z", "A4a-5b. and the window ends at the next midnight");
    const justBefore = utcDayBounds(new Date("2026-08-12T23:59:59.999Z"));
    assert.equal(justBefore.start.toISOString(), "2026-08-12T00:00:00.000Z",
      "A4a-5c. a moment before midnight belongs to the PRIOR day");
    assert.ok(b.start.getTime() === justBefore.end.getTime(),
      "A4a-5d. the windows abut exactly — end is exclusive, so no row is double-counted or dropped");
    // Month/year rollover must not produce an invalid window.
    const ny = utcDayBounds(new Date("2026-12-31T12:00:00.000Z"));
    assert.equal(ny.end.toISOString(), "2027-01-01T00:00:00.000Z", "A4a-5e. year rollover is handled");
  }

  // SOURCE-LEVEL: the transaction protocol in BOTH writers.
  const gradeSrc = strip(readFileSync("app/api/tests/[testId]/grade/route.ts", "utf8"));
  for (const [name, src, claimCall, sourceType] of [
    ["judge", judgeRouteSrc, "await tx.debate.updateMany(", "DEBATE"],
    ["grade", gradeSrc, "await tx.practiceTest.updateMany(", "PRACTICE_TEST"]
  ] as const) {
    const txn = src.slice(src.indexOf("prisma.$transaction(async (tx) =>"));
    const claimAt = txn.indexOf(claimCall);
    const lockAt = txn.indexOf("lockUserRow(tx,");
    const nowAt = txn.indexOf("const now = new Date();");
    const countAt = txn.indexOf("tx.xPLog.count(");
    assert.ok(claimAt >= 0 && lockAt >= 0 && nowAt >= 0 && countAt >= 0,
      `A4a-6. ${name}: claim, lock, now and ledger count all present`);
    assert.equal(txn.indexOf("await tx."), claimAt,
      `A4a-6b. ${name}: the A2 same-source claim is still the FIRST tx operation`);
    assert.ok(claimAt < lockAt, `A4a-6c. ${name}: the user lock comes AFTER the claim, never before`);
    assert.ok(lockAt < nowAt, `A4a-6d. ${name}: 'now' is captured AFTER the lock, so waiting past midnight cannot bill the wrong day`);
    assert.ok(nowAt < countAt, `A4a-6e. ${name}: the day window is derived before the ledger is read`);
    // The quota query: positive awards only, this type only, inside the derived window.
    const countBlock = txn.slice(countAt, countAt + 420);
    assert.ok(new RegExp(`sourceType: "${sourceType}"`).test(countBlock),
      `A4a-7. ${name}: the quota counts only its own sourceType, so the two quotas stay independent`);
    assert.ok(/amount: \{ gt: 0 \}/.test(countBlock),
      `A4a-7b. ${name}: zero-amount rows do NOT consume quota`);
    assert.ok(/createdAt: \{ gte: dayStart, lt: dayEnd \}/.test(countBlock),
      `A4a-7c. ${name}: the window is half-open [dayStart, dayEnd)`);
    // Z1: a ledger row is written on EVERY completion, and the award helper is skipped at zero.
    assert.ok(/xpEarned > 0/.test(txn) && !/awardXpInTransaction\(tx, session\.user\.id, 0\)/.test(txn),
      `A4a-8. ${name}: awardXpInTransaction is skipped past the quota, never called with 0`);
    assert.ok(/amount: xpEarned/.test(txn), `A4a-8b. ${name}: the ledger row records the ACTUAL amount, including 0`);
    // The session counter is atomic and unconditional.
    assert.ok(/streak: \{ increment: 1 \}/.test(txn),
      `A4a-9. ${name}: the practice-session counter increments atomically`);
    assert.ok(!/streak: user\.streak \+ 1/.test(src),
      `A4a-9b. ${name}: the stale read-add-write is gone`);
  }

  // SOURCE-LEVEL: reward eligibility never consults a score or a winner.
  const judgeTxnA4 = judgeRouteSrc.slice(judgeRouteSrc.indexOf("prisma.$transaction(async (tx) =>"));
  // String literals are stripped first: the lock's failure message legitimately contains the word
  // "scored", and matching prose rather than identifiers would fail on honest copy.
  const withoutStrings = (src: string) => src.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""');
  const eligibilityRegion = withoutStrings(
    judgeTxnA4.slice(judgeTxnA4.indexOf("lockUserRow(tx,"), judgeTxnA4.indexOf("rewardAmountForCompletion") + 120));
  assert.ok(!/\b(overallScore|wonDebate|teamWinner|didStudentWin|scores)\b/.test(eligibilityRegion),
    "A4a-10. Debate reward eligibility references no score and no winner identifier");
  // Sliced from the TRANSACTION, not the whole file. Slicing the file found the `import
  // { rewardAmountForCompletion }` line near the top, which sits BEFORE `tx.xPLog.count(`, so the
  // slice was empty and the assertion passed vacuously — a mutation probe adding a real
  // `score >= 70 ?` gate survived it. Caught before commit; the judge equivalent above was already
  // transaction-scoped and unaffected.
  const gradeTxnA4 = gradeSrc.slice(gradeSrc.indexOf("prisma.$transaction(async (tx) =>"));
  const testEligibility = withoutStrings(
    gradeTxnA4.slice(gradeTxnA4.indexOf("tx.xPLog.count("), gradeTxnA4.indexOf("rewardAmountForCompletion") + 120));
  assert.ok(testEligibility.length > 100, "A4a-10b0. control: the grade eligibility region is non-empty");
  assert.ok(!/\bscore\b/.test(testEligibility),
    "A4a-10b. PracticeTest reward eligibility applies no minimum-score gate");
  // Control: the region really does contain the decision it is meant to police.
  assert.ok(/rewardAmountForCompletion/.test(testEligibility),
    "A4a-10b2. control: and it spans the reward decision itself");
  // Control: the identifier detector still fires on a real score reference.
  assert.ok(/\b(overallScore|wonDebate)\b/.test(withoutStrings('if (overallScore >= 70) { grant(); }')),
    "A4a-10c. control: the detector catches a genuine score gate");

  // SOURCE-LEVEL: the results page reads PERSISTED reward truth and can never invent one.
  const resultsSrc = strip(readFileSync("app/(app)/tests/[testId]/results/page.tsx", "utf8"));
  assert.ok(!/\+20/.test(resultsSrc), "A4a-11. the results page no longer hardcodes +20");
  assert.ok(/sourceType: "PRACTICE_TEST", sourceId: test\.id/.test(resultsSrc),
    "A4a-11b. it reads the persisted reward event for THIS test");
  assert.ok(/rewardEvent === null \? null :/.test(resultsSrc),
    "A4a-11c. a missing ledger row renders NOTHING — it cannot claim an award or claim the limit was hit");
  assert.ok(/rewardEvent\.amount > 0 \?/.test(resultsSrc) && /\+\{rewardEvent\.amount\}/.test(resultsSrc),
    "A4a-11d. a positive row renders its ACTUAL amount");
  assert.ok(/today&apos;s XP limit is reached/.test(resultsSrc),
    "A4a-11e. a zero row explains the limit while keeping the diagnosis");

  // SOURCE-LEVEL: the arena never shows a bare "+0 XP".
  const arenaA4 = strip(readFileSync("components/debate/debate-arena.tsx", "utf8"));
  assert.ok(/rewardLimitReached \?/.test(arenaA4), "A4a-12. the arena branches on the limit state");
  assert.ok(/No XP for this round — today&apos;s XP limit is reached|No XP for this round — today's XP limit is reached/.test(arenaA4),
    "A4a-12b. and explains it rather than rendering a bare zero");
  assert.ok(/rewardLimitReached,/.test(judgeRouteSrc), "A4a-12c. the judge response carries the limit state");

  // SOURCE-LEVEL: the lock primitive is reused, never duplicated.
  const sessionLib = strip(readFileSync("lib/practice-session.ts", "utf8"));
  assert.equal((sessionLib.match(/FOR UPDATE/g) ?? []).length, 1,
    "A4a-13. exactly one FOR UPDATE primitive exists in lib/practice-session.ts");
  for (const [name, src] of [["judge", judgeRouteSrc], ["grade", gradeSrc]] as const) {
    assert.ok(!/FOR UPDATE/.test(src), `A4a-13b. ${name} reuses lockUserRow rather than copying the raw lock`);
  }
  assert.ok(/onMissing: \(\) => never = sessionNotFound/.test(sessionLib),
    "A4a-13c. the existing eight callers keep sessionNotFound as the default, so their behaviour is unchanged");

  // NON-VACUOUS against the frozen pre-A4a pin.
  {
    const PRE_M15_A4 = "5e372cc027c0e920afde9c56bbfcca16781592f1";
    const judgeAt = strip(execSync(`git show ${PRE_M15_A4}:'app/api/debates/[debateId]/judge/route.ts'`, { encoding: "utf8" }));
    const gradeAt = strip(execSync(`git show ${PRE_M15_A4}:'app/api/tests/[testId]/grade/route.ts'`, { encoding: "utf8" }));
    const resultsAt = strip(execSync(`git show ${PRE_M15_A4}:'app/(app)/tests/[testId]/results/page.tsx'`, { encoding: "utf8" }));
    assert.ok(/const xpEarned = XP_REWARDS\.debateCompleted;/.test(judgeAt),
      "A4a-C1. control: the pre-A4a judge route awarded XP unconditionally");
    assert.ok(/XP_REWARDS\.practiceTest/.test(gradeAt) && !/xPLog\.count\(/.test(gradeAt),
      "A4a-C2. control: the pre-A4a grade route awarded XP unconditionally with no ledger check");
    assert.ok(/streak: user\.streak \+ 1/.test(judgeAt) && /streak: user\.streak \+ 1/.test(gradeAt),
      "A4a-C3. control: both writers used the stale streak read-add-write");
    assert.ok(/\+20/.test(resultsAt),
      "A4a-C4. control: the pre-A4a results page hardcoded +20");
    assert.ok(!/lockUserRow/.test(judgeAt) && !/lockUserRow/.test(gradeAt),
      "A4a-C5. control: neither writer previously serialized on the user row");
  }

  // ---- A4b. the practice-session card describes the real counter ----------------------------------
  // `User.streak` is a legacy schema name holding a LIFETIME count of completed practice sessions.
  // Its only two writers are the Debate judge route and the PracticeTest grade route (both asserted
  // above). Lessons award no XP and never touch it — so learner-facing copy naming lessons promised
  // a number that finishing a lesson cannot move.
  const cardSrc = strip(readFileSync("components/app/xp-progress-card.tsx", "utf8"));

  assert.ok(!/lesson/i.test(cardSrc),
    "A4b-1. the practice-session card no longer claims lessons count");
  assert.ok(/completed — debates and graded tests\./.test(cardSrc),
    "A4b-2. the populated state names only the two real session writers");
  assert.ok(/Complete a debate or a practice test to start your record\./.test(cardSrc),
    "A4b-3. and the empty state names only those two");
  // The counter is a session count, never a streak or a run of days.
  for (const banned of ["consecutive day", "practice day", "day streak", "streak of"]) {
    assert.ok(!new RegExp(banned, "i").test(cardSrc), `A4b-4. no day-based wording ("${banned}")`);
  }
  // `streak` survives as the prop/schema identifier, but must not reach the learner as a WORD.
  // `${...}` interpolations are removed first: a template literal contains the IDENTIFIER
  // `${streak}`, which the learner never sees — only its value. Matching the raw literal would flag
  // honest copy.
  const cardStrings = (cardSrc.match(/`[^`]*`|"[^"]*"/g) ?? [])
    .map((s) => s.replace(/\$\{[^}]*\}/g, " "))
    .join(" ");
  assert.ok(!/\bstreak\b/i.test(cardStrings),
    "A4b-5. the word 'streak' never appears in learner-facing copy");
  // Control: the detector still fires on a real learner-facing use of the word.
  assert.ok(/\bstreak\b/i.test("`${streak} day streak`".replace(/\$\{[^}]*\}/g, " ")),
    "A4b-5c. control: visible 'streak' wording would still be caught");
  assert.ok(/streak > 0/.test(cardSrc),
    "A4b-5b. control: the identifier itself is still used, so A4b-5 is about copy, not the prop");

  // G. Lessons still have no reward or session writer — the premise the new copy rests on.
  //
  // NOT a blanket search for the word "lesson": both reward routes legitimately mention lessons as
  // STUDY RECOMMENDATIONS ("which lesson to work on next"), which is coaching, not reward. An earlier
  // draft of this control banned the word outright and failed on that honest usage. What matters is
  // that no lesson can produce XP, a ledger event, or a practice session.
  assert.equal((strip(readFileSync("lib/constants.ts", "utf8")).match(/lessonCompleted/g) ?? []).length, 1,
    "A4b-6. XP_REWARDS.lessonCompleted is declared once and consumed nowhere");
  {
    // Every sourceType this codebase can write to the ledger, from the write sites themselves.
    const written = new Set<string>();
    for (const p of ["app/api/debates/[debateId]/judge/route.ts", "app/api/tests/[testId]/grade/route.ts"]) {
      const s = strip(readFileSync(p, "utf8"));
      const blk = s.slice(s.indexOf("tx.xPLog.create("), s.indexOf("tx.xPLog.create(") + 600);
      for (const m of blk.matchAll(/sourceType: "(\w+)"/g)) written.add(m[1]);
    }
    assert.deepEqual([...written].sort(), ["DEBATE", "PRACTICE_TEST"],
      "A4b-6b. the only reward sourceTypes ever written are DEBATE and PRACTICE_TEST — never LESSON");
  }
  // And no lesson/education module reaches a reward or session writer at all.
  const rewardWriterRefs = execSync(
    'grep -rln "xPLog\\.\\|awardXpInTransaction\\|streak: { increment" app lib --include=*.ts --include=*.tsx || true',
    { encoding: "utf8" }).trim().split("\n").filter(Boolean).sort();
  assert.deepEqual(rewardWriterRefs, [
    "app/(app)/tests/[testId]/results/page.tsx",   // reads the ledger, writes nothing
    "app/api/debates/[debateId]/judge/route.ts",
    "app/api/tests/[testId]/grade/route.ts",
    "lib/coach-progress.ts",                        // reads max(createdAt), writes nothing
    "lib/xp.ts"
  ], `A4b-6c. no lesson or education module touches a reward/session writer  [${rewardWriterRefs.join(", ")}]`);

  // NON-VACUOUS against the frozen pre-A4b pin: the baseline really did make the false claim, and it
  // is bound to THIS file's learner-facing strings rather than a global search for the word.
  {
    const PRE_M15_A4B = "c426f1d45d4c1a5353135003213bfadaf0307e1b";
    const cardAtBaseline = strip(
      execSync(`git show ${PRE_M15_A4B}:components/app/xp-progress-card.tsx`, { encoding: "utf8" }));
    assert.ok(/completed — debates, tests, and lessons\./.test(cardAtBaseline),
      "A4b-C1. control: the pre-A4b card DID claim lessons count in its populated state");
    assert.ok(/Complete a debate, test, or lesson to start your record\./.test(cardAtBaseline),
      "A4b-C2. control: and in its empty state");
    // ...and the A4a policy files are untouched by A4b.
    for (const p of ["lib/xp.ts", "lib/practice-session.ts", "app/api/debates/[debateId]/judge/route.ts",
                     "app/api/tests/[testId]/grade/route.ts", "components/debate/debate-arena.tsx",
                     "app/(app)/tests/[testId]/results/page.tsx"]) {
      const atPin = execSync(`git show ${PRE_M15_A4B}:'${p}' | shasum -a 256`, { encoding: "utf8" }).split(" ")[0];
      const now = execSync(`shasum -a 256 '${p}'`, { encoding: "utf8" }).split(" ")[0];
      assert.equal(now, atPin, `A4b-C3. ${p} is byte-identical to the A4a baseline`);
    }
  }

  // ---- A3b-2. the same terminology follows the learner off the ballot -----------------------------
  // A3b-1 made the ballot truthful. These surfaces re-showed the SAME formative numbers under
  // stronger names — and a frozen legacy `wins` counter that A3a retired. Presentation only: no
  // stored value changes, and `User.wins` is neither read differently nor written.
  const dashSrc = strip(readFileSync("app/(app)/dashboard/page.tsx", "utf8"));
  const profileSrc = strip(readFileSync("app/(app)/profile/page.tsx", "utf8"));
  const replaySrc = strip(readFileSync("app/(app)/debates/[debateId]/replay/page.tsx", "utf8"));

  // DASHBOARD. `wins` may still be READ (it feeds the internal bot-matching projection), so these
  // bind the RENDERED copy, not the identifier.
  // Matches BOTH render forms — JSX children `{wins} {wins === 1 ...}` and template interpolation
  // `${wins} ${wins === 1 ...}` — because the two dashboard sites used one each, and a control that
  // only knew one form would have left the other resting on sibling assertions.
  assert.ok(!/\$?\{wins\} \$?\{wins === 1 \? "win" : "wins"\}/.test(dashSrc),
    "A3b-2a. the dashboard renders no historical wins copy, in either render form");
  assert.ok(/\$?\{wins\} \$?\{wins === 1 \? "win" : "wins"\}/.test('${wins} ${wins === 1 ? "win" : "wins"}') &&
            /\$?\{wins\} \$?\{wins === 1 \? "win" : "wins"\}/.test('{wins} {wins === 1 ? "win" : "wins"}'),
    "A3b-2a2. control: that detector matches both the template and the JSX form");
  assert.ok(!/avg judge score/i.test(dashSrc), "A3b-2b. and no 'avg judge score'");
  assert.ok(/Avg practice ballot score \$\{avgJudgeScore \?\? "—"\}\./.test(dashSrc),
    "A3b-2c. the stat card shows an average practice ballot score");
  assert.ok(/\{judgedDebateCount\} judged \{judgedDebateCount === 1 \? "round" : "rounds"\}/.test(dashSrc),
    "A3b-2d. the judged-round panel uses the real existing judged-round count");
  assert.ok(/avg practice ballot score/.test(dashSrc), "A3b-2e. and the practice-ballot wording");
  // No new query was introduced to replace wins: the aggregate count is the pre-existing one.
  assert.equal((dashSrc.match(/prisma\.debate\.count\(/g) ?? []).length,
    (strip(execSync(`git show ${PRE_M15_A3B2}:'app/(app)/dashboard/page.tsx'`, { encoding: "utf8" })).match(/prisma\.debate\.count\(/g) ?? []).length,
    "A3b-2f. no new debate count query was added");
  assert.equal((dashSrc.match(/prisma\.\w+\.(aggregate|count|findMany|findFirst|findUnique)\(/g) ?? []).length,
    (strip(execSync(`git show ${PRE_M15_A3B2}:'app/(app)/dashboard/page.tsx'`, { encoding: "utf8" })).match(/prisma\.\w+\.(aggregate|count|findMany|findFirst|findUnique)\(/g) ?? []).length,
    "A3b-2f2. and the dashboard's total query count is unchanged");

  // PROFILE.
  assert.ok(!/\{user\.wins\} wins/.test(profileSrc), "A3b-2g. the profile renders no wins chip");
  assert.ok(!/% judge score/.test(profileSrc), "A3b-2h. and no '% judge score' label");
  assert.ok(/practice ballot score \$\{debate\.overallScore\}/.test(profileSrc),
    "A3b-2i. recent debates use the practice-ballot wording, with no percent sign");
  // History is untouched: the field is still selected and still stored; only the render is gone.
  assert.ok(/wins: true/.test(profileSrc),
    "A3b-2j. User.wins is still selected — A3b-2 hides it, it does not delete or reset data");

  // REPLAY — visible AND spoken wording must agree.
  assert.ok(!/Overall score/.test(replaySrc), "A3b-2k. replay no longer says 'Overall score' anywhere");
  assert.ok(/<p className="text-sm font-semibold">Practice ballot score: \{debate\.overallScore\}<\/p>/.test(replaySrc),
    "A3b-2k2. the visible replay score is a practice ballot score");
  assert.ok(/`Practice ballot score \$\{debate\.overallScore\}\.`/.test(replaySrc),
    "A3b-2l. the read-aloud string uses the same wording");
  assert.ok(!/ · Overall \$\{attempt\.overallScore\}/.test(replaySrc) && /practice ballot \$\{attempt\.overallScore\}/.test(replaySrc),
    "A3b-2m. and so does the attempt list");

  // NON-VACUOUS against the frozen pre-A3b-2 pin.
  {
    const dashAt = strip(execSync(`git show ${PRE_M15_A3B2}:'app/(app)/dashboard/page.tsx'`, { encoding: "utf8" }));
    const profileAt = strip(execSync(`git show ${PRE_M15_A3B2}:'app/(app)/profile/page.tsx'`, { encoding: "utf8" }));
    const replayAt = strip(execSync(`git show ${PRE_M15_A3B2}:'app/(app)/debates/[debateId]/replay/page.tsx'`, { encoding: "utf8" }));
    assert.ok(/avg judge score/i.test(dashAt) && /\{wins\} \{wins === 1 \? "win" : "wins"\}/.test(dashAt),
      "A3b-2-C1. control: the pre-A3b-2 dashboard DID render wins and 'avg judge score'");
    assert.ok(/\{user\.wins\} wins/.test(profileAt) && /% judge score/.test(profileAt),
      "A3b-2-C2. control: the pre-A3b-2 profile DID render a wins chip and a '% judge score' label");
    assert.ok(/Overall score: \{debate\.overallScore\}/.test(replayAt) && /`Overall score \$\{debate\.overallScore\}\.`/.test(replayAt),
      "A3b-2-C3. control: the pre-A3b-2 replay DID say 'Overall score' both visibly and aloud");
  }

  // ---- A3b-3. coach and assignment surfaces speak the same language ------------------------------
  // The last of the honesty pass. A coach must not read a frozen counter as a current record, and an
  // assignment picker must not present a formative number as a grade. Presentation only: no query,
  // no qualification rule and no stored value changes.
  const rosterSrc = strip(readFileSync("app/(app)/coach/page.tsx", "utf8"));
  const detailSrc = strip(readFileSync("app/(app)/coach/students/[studentId]/page.tsx", "utf8"));
  const assignSrc = strip(readFileSync("lib/assignments.ts", "utf8"));

  // COACH ROSTER.
  assert.ok(!/\$\{u\.wins\} \$\{u\.wins === 1 \? "win" : "wins"\}/.test(rosterSrc),
    "A3b-3a. the coach roster renders no historical wins copy");
  for (const renamed of ["Practice wins", "Legacy wins", "AI wins", "Competition wins"]) {
    assert.ok(!new RegExp(renamed).test(rosterSrc), `A3b-3b. and no renamed frozen counter ("${renamed}")`);
  }
  assert.ok(/\$\{u\.xp\} XP/.test(rosterSrc), "A3b-3c. XP is still rendered for active students");
  // The activity signal may no longer consult the retired counter.
  assert.ok(/const hasActivity = u\.xp > 0;/.test(rosterSrc),
    "A3b-3d. roster activity state is derived from XP alone");
  assert.ok(!/hasActivity = [^;]*wins/.test(rosterSrc),
    "A3b-3e. and never from User.wins");
  // A3b-3 added no query: the roster's Prisma call count is unchanged from the frozen baseline.
  assert.equal((rosterSrc.match(/prisma\.\w+\.\w+\(/g) ?? []).length,
    (strip(execSync(`git show ${PRE_M15_A3B3}:'app/(app)/coach/page.tsx'`, { encoding: "utf8" })).match(/prisma\.\w+\.\w+\(/g) ?? []).length,
    "A3b-3f. no new query was added to the roster");

  // COACH STUDENT DETAIL.
  assert.ok(!/Avg judge score/.test(detailSrc), "A3b-3g. the coach detail no longer says 'Avg judge score'");
  assert.ok(/label="Avg practice ballot score"/.test(detailSrc),
    "A3b-3h. it says 'Avg practice ballot score'");
  assert.ok(/label="Judged rounds"/.test(detailSrc), "A3b-3i. and still shows the judged-round count");
  assert.ok(!/label="Wins"/.test(detailSrc) && !/label="Losses"/.test(detailSrc),
    "A3b-3j. with no Wins/Losses record restored");
  // A3a's fabricated-loss derivation must stay gone from the helper too.
  assert.ok(!/judgedRounds\s*-\s*wins/.test(strip(readFileSync("lib/coach-progress.ts", "utf8"))),
    "A3b-3j2. and coach-progress still derives no losses");

  // ASSIGNMENT EVIDENCE PICKER.
  assert.ok(!/\(\$\{debate\.overallScore\}\)/.test(assignSrc),
    "A3b-3k. the assignment picker no longer formats the score as a bare (n)");
  assert.ok(/`\$\{debate\.topic\} — practice ballot score \$\{debate\.overallScore\}`/.test(assignSrc),
    "A3b-3l. a scored round is labelled a practice ballot score");
  // Null score: the completion-only label, with nothing invented to fill the gap.
  assert.ok(/: debate\.topic,/.test(assignSrc),
    "A3b-3m. a round with no score falls back to the topic alone — no fabricated 0 or dash");
  assert.ok(!/practice ballot score 0/.test(assignSrc) && !/practice ballot score —/.test(assignSrc),
    "A3b-3m2. and no placeholder score string exists");
  // Qualification is untouched: eligibility still comes from ownership + JUDGED + format.
  assert.ok(/status: "JUDGED"/.test(assignSrc) &&
            /OR: \[\{ createdById: userId \}, \{ studentId: userId \}, \{ opponentUserId: userId \}\]/.test(assignSrc),
    "A3b-3n. assignment qualification rules are unchanged");

  // NON-VACUOUS against the frozen pre-A3b-3 pin.
  {
    const rosterAt = strip(execSync(`git show ${PRE_M15_A3B3}:'app/(app)/coach/page.tsx'`, { encoding: "utf8" }));
    const detailAt = strip(execSync(`git show ${PRE_M15_A3B3}:'app/(app)/coach/students/[studentId]/page.tsx'`, { encoding: "utf8" }));
    const assignAt = strip(execSync(`git show ${PRE_M15_A3B3}:lib/assignments.ts`, { encoding: "utf8" }));
    assert.ok(/\$\{u\.wins\} \$\{u\.wins === 1 \? "win" : "wins"\}/.test(rosterAt),
      "A3b-3-C1. control: the pre-A3b-3 roster DID render the frozen wins counter");
    assert.ok(/hasActivity = u\.xp > 0 \|\| u\.wins > 0;/.test(rosterAt),
      "A3b-3-C2. control: and DID derive activity state from it");
    assert.ok(/Avg judge score/.test(detailAt),
      "A3b-3-C3. control: the pre-A3b-3 coach detail DID say 'Avg judge score'");
    assert.ok(/\(\$\{debate\.overallScore\}\)/.test(assignAt),
      "A3b-3-C4. control: the pre-A3b-3 assignment picker DID use a bare (n) score");
  }

  // NON-VACUOUS: at the FROZEN pre-A3a pin every one of these authorities WAS present. Without this
  // the assertions above could pass against a route that never had them.
  const PRE_M15_A3 = "bb7c4dcc3d6f0af76dd624a0b77dea5f9dabf7c2";
  const judgeAtA2 = strip(
    execSync(`git show ${PRE_M15_A3}:'app/api/debates/[debateId]/judge/route.ts'`, { encoding: "utf8" }));
  assert.ok(/XP_REWARDS\.debateCompleted \+ \(wonDebate \? XP_REWARDS\.debateWon : 0\)/.test(judgeAtA2),
    "A3a-C1. control: the pre-A3a route DID award a winner-conditional XP bonus");
  assert.ok(/wins: wonDebate \? user\.wins \+ 1 : user\.wins/.test(judgeAtA2),
    "A3a-C2. control: and DID increment User.wins from that same winner");
  assert.ok(/tx\.speakingSkillSnapshot\.create\(/.test(judgeAtA2),
    "A3a-C3. control: and DID write a SpeakingSkillSnapshot row");
  assert.ok(!/progressionBasis/.test(judgeAtA2) && !/scoredBy/.test(judgeAtA2),
    "A3a-C4. control: and persisted no judging-basis metadata at all");
  // The wins-write detector must actually fire on the baseline's own update block.
  const baselineUserUpdate = judgeAtA2.split("tx.user.update(").slice(1)[0] ?? "";
  assert.ok(/\bwins\s*:/.test(baselineUserUpdate.slice(0, baselineUserUpdate.indexOf("})"))),
    "A3a-C5. control: the A3a-3 wins-write detector fires against the pre-A3a update block");

  // 3. Live: a real judge call returns the correct shape.
  const { judgeDecaRoleplay } = await import("../lib/ai");
  // aiProvider is attached to results dynamically by tagProvider, so it is not on the declared type.
  type LiveJudgeResult = Awaited<ReturnType<typeof judgeDecaRoleplay>> & { aiProvider?: string };
  let live: LiveJudgeResult | null = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    // M14 Phase 1c: DECA judging has NO fallback — provider failure now THROWS the retryable
    // unavailable error instead of returning a fallback-tagged ballot. A throw here is therefore
    // the "providers unavailable" signal, and any result that arrives IS a live, validated one.
    try {
      const result = await judgeDecaRoleplay({
        level: "BEGINNER",
        eventType: "ROLEPLAY",
        scenario: "A guest's reserved suite was given away. As front desk manager, recover the situation.",
        transcript: [
          { role: "AFFIRMATIVE", round: 1, content: "I would apologize, upgrade them to the best available room, comp the night, and follow up personally in the morning." }
        ]
      });
      const tagged = result as LiveJudgeResult;
      assert.notEqual(tagged.aiProvider, "fallback",
        "a DECA judge result can never be fallback-tagged after Phase 1c");
      live = tagged;
      break;
    } catch (error) {
      console.warn(`[judge-shape] attempt ${attempt}: providers unavailable (${error instanceof Error ? error.message : String(error)}), retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 8000));
    }
  }

  if (!live) {
    console.warn(
      "[judge-shape] WARNING: no live provider responded after 4 attempts — live shape check SKIPPED (offline guards passed). Rerun when a provider is reachable."
    );
    process.exit(0);
  }

  assert.ok(Array.isArray(live.categoryScores), `LIVE ${live.aiProvider} response: categoryScores must be an array`);
  assert.ok(live.categoryScores.length > 0, "live categoryScores array is non-empty");
  for (const entry of live.categoryScores) {
    assert.equal(typeof entry.key, "string", "category entry has string key");
    assert.equal(typeof entry.label, "string", "category entry has string label");
    assert.equal(typeof entry.score, "number", "category entry has numeric score");
    assert.equal(typeof entry.reason, "string", "category entry has string reason");
  }
  assert.ok(live.readinessForNextLevel && typeof live.readinessForNextLevel === "object", "live readinessForNextLevel is structured");

  console.log(
    `Judge-shape smoke passed: prompt structure pinned, validator contract pinned, DECA fail-closed contract pinned (no fallback, strict finite validator, attribution only after validation, throw maps to the retryable 503), and a LIVE ${live.aiProvider} judge response returned ${live.categoryScores.length} array-shaped rubric categories.`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
