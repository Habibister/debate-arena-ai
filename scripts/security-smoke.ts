import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { HttpError, apiError } from "../lib/api";
import { clientIp, sessionUserId } from "../lib/api-auth";

// Offline security smoke tests. No dev server or database needed — run with `npm run security:smoke`.

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

  // --- static check: every AI route requires auth, before reading the request body ---
  const aiRoutesDir = join(process.cwd(), "app", "api", "ai");
  const routeDirs = readdirSync(aiRoutesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assert.ok(routeDirs.length >= 10, `expected at least 10 AI routes, found ${routeDirs.length}`);

  for (const dir of routeDirs) {
    const source = readFileSync(join(aiRoutesDir, dir, "route.ts"), "utf8");
    assert.ok(source.includes("await requireUser();"), `app/api/ai/${dir} requires a signed-in user`);
    const authIndex = source.indexOf("await requireUser();");
    const parseIndex = source.indexOf("parseJson(");
    if (parseIndex !== -1) {
      assert.ok(authIndex < parseIndex, `app/api/ai/${dir} checks auth BEFORE parsing the request body`);
    }
  }

  console.log(
    `Security smoke tests passed: session-id handling, IP fallback, 401 mapping regression pin, provider-outage mapping, and requireUser coverage across ${routeDirs.length} AI routes.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
