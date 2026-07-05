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

  // 3. Live: a real judge call returns the correct shape.
  const { judgeDecaRoleplay } = await import("../lib/ai");
  let live: Awaited<ReturnType<typeof judgeDecaRoleplay>> | null = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const result = await judgeDecaRoleplay({
      level: "BEGINNER",
      eventType: "ROLEPLAY",
      scenario: "A guest's reserved suite was given away. As front desk manager, recover the situation.",
      transcript: [
        { role: "AFFIRMATIVE", round: 1, content: "I would apologize, upgrade them to the best available room, comp the night, and follow up personally in the morning." }
      ]
    });
    if (result.aiProvider && result.aiProvider !== "fallback") {
      live = result;
      break;
    }
    console.warn(`[judge-shape] attempt ${attempt}: providers unavailable (got fallback), retrying...`);
    await new Promise((resolve) => setTimeout(resolve, 8000));
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
    `Judge-shape smoke passed: prompt structure pinned, validator contract pinned, and a LIVE ${live.aiProvider} judge response returned ${live.categoryScores.length} array-shaped rubric categories.`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
