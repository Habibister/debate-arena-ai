import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RateLimitError, apiError } from "../lib/api";
import { clientIp, sessionUserId } from "../lib/api-auth";
import { enforceRateLimit, validateRateLimitConfig } from "../lib/rate-limit";

function read(path: string) {
  return readFileSync(path, "utf8");
}

async function expectControlledRateLimit(fn: () => Promise<void>) {
  try {
    await fn();
    assert.fail("expected a controlled rate-limit failure");
  } catch (error) {
    assert.ok(error instanceof RateLimitError, "preflight config failure returns RateLimitError");
    const response = apiError(error);
    assert.equal(response.status, 429, "apiError maps preflight config failure to controlled 429");
    assert.equal(response.headers.get("Retry-After") !== null, true, "controlled 429 includes Retry-After");
  }
}

async function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>) {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    previous[key] = process.env[key];
    if (vars[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = vars[key];
    }
  }

  try {
    await fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  }
}

async function main() {
  assert.equal(sessionUserId({ user: { id: "user_123" } }), "user_123", "authenticated session with user id is accepted");
  assert.equal(sessionUserId({ user: {} }), null, "authenticated session missing user id is rejected");
  assert.equal(sessionUserId(null), null, "missing session is rejected");

  assert.equal(clientIp(new Request("https://example.test")), "unknown", "missing forwarded IP does not throw");
  assert.equal(clientIp(new Request("https://example.test", { headers: { "x-forwarded-for": " , " } })), "unknown", "malformed forwarded IP does not throw");
  assert.equal(clientIp(new Request("https://example.test", { headers: { "x-forwarded-for": "203.0.113.4, 10.0.0.1" } })), "203.0.113.4", "first forwarded IP is used");

  assert.equal(validateRateLimitConfig({}), "missing", "missing limiter env is detected");
  assert.equal(validateRateLimitConfig({ url: "not-a-url", token: "token" }), "malformed", "malformed limiter URL is detected before Redis construction");
  assert.equal(validateRateLimitConfig({ url: "http://example.test", token: "token" }), "malformed", "non-https limiter URL is rejected");
  assert.equal(validateRateLimitConfig({ url: "https://example.upstash.io", token: "token" }), "valid", "valid limiter config is accepted");

  await withEnv(
    { NODE_ENV: "production", UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined },
    () => expectControlledRateLimit(() => enforceRateLimit({ userId: "user_123", ip: "unknown", workload: "heavy" }))
  );

  await withEnv(
    { NODE_ENV: "production", UPSTASH_REDIS_REST_URL: "not-a-url", UPSTASH_REDIS_REST_TOKEN: "token" },
    () => expectControlledRateLimit(() => enforceRateLimit({ userId: "user_123", ip: "unknown", workload: "heavy" }))
  );

  const testsRoute = read("app/api/tests/route.ts");
  const testsPost = testsRoute.slice(testsRoute.indexOf("export async function POST"));
  assert.ok(testsRoute.includes("sessionUserId(session)"), "/api/tests uses shared session id extraction");
  assert.ok(testsRoute.includes("enforceRateLimit"), "/api/tests uses shared production rate limiting");
  assert.ok(testsPost.indexOf("enforceRateLimit") < testsPost.indexOf("parseJson"), "/api/tests rate-limits before request parsing");
  assert.ok(testsPost.indexOf("parseJson") < testsPost.indexOf("generatePracticeQuestions"), "/api/tests parses before provider generation");
  assert.ok(testsRoute.includes('workload: "heavy"'), "/api/tests uses the heavy workload");

  const directAiRoutes: Record<string, "light" | "turn" | "heavy"> = {
    "app/api/ai/health/route.ts": "light",
    "app/api/ai/judge/route.ts": "heavy",
    "app/api/ai/judge-deca/route.ts": "heavy",
    "app/api/ai/judge-hosa/route.ts": "heavy",
    "app/api/ai/lesson/route.ts": "heavy",
    "app/api/ai/opponent/route.ts": "turn",
    "app/api/ai/practice-questions/route.ts": "heavy",
    "app/api/ai/readiness/route.ts": "light",
    "app/api/ai/recommendations/route.ts": "light",
    "app/api/ai/side-coach/route.ts": "turn",
    "app/api/ai/topic/route.ts": "light"
  };

  for (const [routePath, workload] of Object.entries(directAiRoutes)) {
    const source = read(routePath);
    assert.ok(source.includes("requireUser()"), `${routePath} requires authentication`);
    assert.ok(source.includes("enforceRateLimit"), `${routePath} rate-limits before generation`);
    assert.ok(source.includes(`workload: "${workload}"`), `${routePath} uses the ${workload} workload`);
  }

  const rateLimitSource = read("lib/rate-limit.ts");
  assert.ok(rateLimitSource.includes("validateRateLimitConfig"), "rate limiter validates config before constructing clients");
  assert.ok(rateLimitSource.indexOf("currentConfigStatus() !== \"valid\"") < rateLimitSource.indexOf("new Redis"), "invalid config is rejected before Redis construction");
  assert.ok(!rateLimitSource.includes("error.message"), "rate limiter does not log raw client errors");

  const envExample = read(".env.example");
  assert.ok(envExample.includes('UPSTASH_REDIS_REST_URL=""'), ".env.example documents Upstash URL name only");
  assert.ok(envExample.includes('UPSTASH_REDIS_REST_TOKEN=""'), ".env.example documents Upstash token name only");

  console.log("Security smoke tests passed: AI preflight auth, session-id handling, IP fallback, limiter config handling, controlled errors, and route ordering are covered.");
}

main();
