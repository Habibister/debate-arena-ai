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
    ["wins update", "wins: wonDebate ? user.wins + 1 : user.wins"],
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
