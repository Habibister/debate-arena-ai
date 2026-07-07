import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { HttpError, RateLimitError, apiError } from "../lib/api";
import { clientIp, sessionUserId } from "../lib/api-auth";
import { enforceRateLimit, validateRateLimitConfig } from "../lib/rate-limit";

// Offline security smoke tests. No dev server or database needed — run with `npm run security:smoke`.

async function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>) {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    previous[key] = process.env[key];
    if (vars[key] === undefined) {
      delete process.env[key];
    } else {
      (process.env as Record<string, string | undefined>)[key] = vars[key];
    }
  }

  try {
    await fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (previous[key] === undefined) {
        delete (process.env as Record<string, string | undefined>)[key];
      } else {
        (process.env as Record<string, string | undefined>)[key] = previous[key];
      }
    }
  }
}

async function main() {
  // --- session-id extraction (requireUser's core decision) ---
  assert.equal(sessionUserId({ user: { id: "user_123" } }), "user_123", "authenticated session with user id is accepted");
  assert.equal(sessionUserId({ user: {} }), null, "session missing user id is rejected");
  assert.equal(sessionUserId({ user: { id: "   " } }), null, "blank user id is rejected");
  assert.equal(sessionUserId(null), null, "missing session is rejected");

  // --- client IP extraction never throws ---
  assert.equal(clientIp(new Request("https://example.test")), "unknown", "missing forwarded IP does not throw");
  assert.equal(clientIp(new Request("https://example.test", { headers: { "x-forwarded-for": " , " } })), "unknown", "malformed forwarded IP does not throw");
  assert.equal(
    clientIp(new Request("https://example.test", { headers: { "x-forwarded-for": "203.0.113.4, 10.0.0.1" } })),
    "203.0.113.4",
    "first forwarded IP is used"
  );

  // --- REGRESSION PIN: our own 401 must reach the client as a 401 ---
  // apiError once classified any error carrying status 401/403/429 as a provider outage (503),
  // which swallowed requireUser's HttpError(401) and made a working auth check look like an AI
  // outage. HttpError must win over the provider-outage sniffing.
  const authFailure = apiError(new HttpError("You must be signed in to do that.", 401));
  assert.equal(authFailure.status, 401, "requireUser's HttpError(401) maps to a real 401, not a 503 provider outage");
  const authBody = (await authFailure.json()) as { error?: string };
  assert.equal(authBody.error, "You must be signed in to do that.", "401 body carries the sign-in message");

  // Provider outage mapping still works for non-HttpError errors that merely carry a status code
  // (e.g. OpenAI SDK errors) — reordering must not have broken it.
  const providerOutage = apiError({ status: 401, message: "invalid_api_key" });
  assert.equal(providerOutage.status, 503, "provider-style errors with status 401 still map to 503");

  // --- rate limiter config validation ---
  assert.equal(validateRateLimitConfig({}), "missing", "missing limiter env is detected");
  assert.equal(validateRateLimitConfig({ url: "not-a-url", token: "token" }), "malformed", "malformed limiter URL is detected before Redis construction");
  assert.equal(validateRateLimitConfig({ url: "http://example.test", token: "token" }), "malformed", "non-https limiter URL is rejected");
  assert.equal(validateRateLimitConfig({ url: "https://example.upstash.io", token: "token" }), "valid", "valid limiter config is accepted");

  // --- FAIL-CLOSED PROOF: production without a reachable/configured limiter returns a controlled
  // 429 with Retry-After, never an unhandled crash and never a silent allow ---
  await withEnv(
    { NODE_ENV: "production", UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined },
    async () => {
      try {
        await enforceRateLimit({ userId: "user_smoke", ip: "203.0.113.9", workload: "light" });
        assert.fail("expected a controlled rate-limit failure in production without limiter config");
      } catch (error) {
        assert.ok(error instanceof RateLimitError, "production limiter-config failure throws RateLimitError, not a crash");
        const response = apiError(error);
        assert.equal(response.status, 429, "apiError maps limiter-config failure to a controlled 429");
        assert.ok(response.headers.get("Retry-After"), "controlled 429 carries a Retry-After header");
      }
    }
  );

  // Development without limiter config stays fail-open (warn once, allow) so local dev never needs Upstash.
  await withEnv(
    { NODE_ENV: "development", UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined },
    async () => {
      await enforceRateLimit({ userId: "user_smoke", ip: "203.0.113.9", workload: "light" });
    }
  );

  // --- static check: every AI route requires auth, before reading the request body ---
  // Walk recursively — AI routes are nested at varying depths (e.g. app/api/ai/mun/judge/route.ts
  // and app/api/ai/debate/argument-flow/route.ts), so a one-level scan would miss them.
  const aiRoutesDir = join(process.cwd(), "app", "api", "ai");
  function findRouteFiles(dir: string): string[] {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findRouteFiles(full));
      } else if (entry.name === "route.ts") {
        files.push(full);
      }
    }
    return files;
  }
  const routeFiles = findRouteFiles(aiRoutesDir);
  assert.ok(routeFiles.length >= 12, `expected at least 12 AI routes, found ${routeFiles.length}`);

  for (const file of routeFiles) {
    const rel = file.slice(aiRoutesDir.length + 1);
    const source = readFileSync(file, "utf8");
    assert.ok(source.includes("await requireUser();"), `app/api/ai/${rel} requires a signed-in user`);
    assert.ok(source.includes("await enforceRateLimit("), `app/api/ai/${rel} enforces the rate limit`);
    const authIndex = source.indexOf("await requireUser();");
    const limitIndex = source.indexOf("await enforceRateLimit(");
    const parseIndex = source.indexOf("parseJson(");
    assert.ok(authIndex < limitIndex, `app/api/ai/${rel} authenticates BEFORE rate limiting (limits are per-user)`);
    if (parseIndex !== -1) {
      assert.ok(limitIndex < parseIndex, `app/api/ai/${rel} rate-limits BEFORE parsing the request body`);
    }
  }

  console.log(
    `Security smoke tests passed: session-id handling, IP fallback, 401 mapping regression pin, provider-outage mapping, limiter config validation, production fail-closed 429, dev fail-open, and auth + rate-limit coverage across ${routeFiles.length} AI routes (recursive).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
