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
    ["streak update", "streak: user.streak + 1"]
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
    assert.ok(judgeRouteSrc.indexOf(effect) > judgeRouteSrc.indexOf("prisma.$transaction(async (tx) =>"),
      `A2-7b. and ${effect} exists nowhere outside the progression transaction`);
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

  // A3a-1. XP from judging is exactly the completion reward — no winner-conditional term.
  assert.ok(/const xpEarned = XP_REWARDS\.debateCompleted;/.test(judgeRouteSrc),
    "A3a-1. xpEarned is exactly XP_REWARDS.debateCompleted");
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
  assert.equal((judgeRouteSrc.match(/const xpEarned =/g) ?? []).length, 1,
    "A3a-5h. xpEarned has exactly one definition, so A3a-1 pins the only value in play");
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
  assert.ok(/streak: user\.streak \+ 1/.test(judgeTxn), "A3a-10b. the activity streak still increments");
  assert.ok(!/reason: wonDebate \?/.test(judgeTxn) && /reason: "Completed AI debate"/.test(judgeTxn),
    "A3a-10c. the ledger reason no longer branches on the winner");

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
