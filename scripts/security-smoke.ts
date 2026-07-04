import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

const directAiRoutes = {
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
} as const;

for (const [routePath, workload] of Object.entries(directAiRoutes)) {
  const source = read(routePath);
  assert.ok(source.includes('from "@/lib/api-auth"'), `${routePath} imports the shared API auth gate`);
  assert.ok(source.includes("requireUser("), `${routePath} requires authentication`);
  assert.ok(source.includes('from "@/lib/rate-limit"'), `${routePath} imports the shared rate limiter`);
  assert.ok(source.includes(`workload: "${workload}"`), `${routePath} uses the ${workload} workload`);

  const authIndex = source.indexOf("requireUser(");
  const rateLimitIndex = source.indexOf("enforceRateLimit(");
  assert.ok(authIndex >= 0 && authIndex < rateLimitIndex, `${routePath} authenticates before rate limiting`);

  const parseIndex = source.indexOf("parseJson(");
  if (parseIndex >= 0) {
    assert.ok(rateLimitIndex >= 0 && rateLimitIndex < parseIndex, `${routePath} rate limits before parsing/generation work`);
  }
}

const scopedDebateRoutes = [
  "app/api/debates/[debateId]/opponent/route.ts",
  "app/api/debates/[debateId]/judge/route.ts",
  "app/api/debates/[debateId]/messages/route.ts"
];

for (const routePath of scopedDebateRoutes) {
  const source = read(routePath);
  assert.ok(source.includes("getServerSession(authOptions)"), `${routePath} authenticates the session`);
  assert.ok(source.includes("createdById: session.user.id"), `${routePath} keeps created-by ownership`);
  assert.ok(source.includes("studentId: session.user.id"), `${routePath} keeps student ownership`);
  assert.ok(source.includes("opponentUserId: session.user.id"), `${routePath} keeps opponent ownership`);
}

assert.ok(read("app/api/debates/[debateId]/opponent/route.ts").includes('workload: "turn"'), "persisted AI opponent turns use the turn rate limit");
assert.ok(read("app/api/debates/[debateId]/judge/route.ts").includes('workload: "heavy"'), "persisted AI judging uses the heavy rate limit");

const testsRoute = read("app/api/tests/route.ts");
assert.ok(testsRoute.includes("getServerSession(authOptions)"), "practice test generation authenticates the session");
assert.ok(testsRoute.includes("userId: session.user.id"), "practice test generation persists to the authenticated user");
assert.ok(testsRoute.includes('workload: "heavy"'), "practice test generation uses the heavy rate limit");
assert.ok(testsRoute.includes("shouldBypassAiFallback(generationError)"), "practice test generation does not fall back after hard failures");

const apiSource = read("lib/api.ts");
assert.ok(apiSource.includes("MAX_REQUEST_BODY_BYTES = 100_000"), "request bodies are capped at 100KB by default");
assert.ok(apiSource.includes("shouldBypassAiFallback"), "hard AI failures are centrally classified");
const apiErrorBody = apiSource.slice(apiSource.indexOf("export function apiError"));
assert.ok(apiErrorBody.indexOf("error instanceof RateLimitError") < apiErrorBody.indexOf("isLikelyOpenAIUnavailableError"), "rate limits keep 429 handling before generic provider errors");

const validators = read("lib/validators.ts");
assert.ok(validators.includes("MAX_TRANSCRIPT_MESSAGES = 40"), "AI transcripts have a message-count cap");
assert.ok(validators.includes("MAX_TRANSCRIPT_CONTENT_CHARS = 8_000"), "AI transcript entries have a per-message cap");
assert.ok(validators.includes("MAX_TRANSCRIPT_TOTAL_CHARS = 48_000"), "AI transcripts have a total character cap");
assert.ok(validators.includes("MAX_TOPIC_CHARS = 1_000"), "AI topics are capped");
assert.ok(validators.includes("MAX_SCENARIO_CHARS = 4_000"), "AI scenarios are capped");

const providers = read("lib/ai-providers.ts");
assert.ok(providers.includes('"x-goog-api-key"'), "Gemini API key is sent in a header");
assert.ok(!providers.includes(":generateContent?key="), "Gemini API key is not sent in the URL");
assert.ok(providers.includes("safetySettings: GEMINI_SAFETY_SETTINGS"), "Gemini safety settings are explicit");
assert.ok(providers.includes("maxOutputTokens: outputTokenCap(req)"), "Gemini output tokens are capped");
assert.ok(providers.includes("max_tokens: outputTokenCap(req)"), "OpenAI-compatible output tokens are capped");
assert.ok(providers.includes("MAX_OUTPUT_TOKENS_HARD_CAP = 4096"), "provider output caps have a hard ceiling");
assert.ok(!/body\.slice|await res\.text\(\)\)\.replace/.test(providers), "provider HTTP response bodies are not logged");

const ai = read("lib/ai.ts");
assert.ok(ai.includes("shouldBypassAiFallback(error)"), "AI fallbacks bypass safety/rate-limit hard failures");
assert.ok(ai.includes("OUTPUT_TOKEN_CAPS"), "generators use documented server-side output caps");

const sideCoach = read("lib/side-coach.ts");
assert.ok(sideCoach.includes("shouldBypassAiFallback(error)"), "side coach does not fall back after hard failures");

const rateLimit = read("lib/rate-limit.ts");
assert.ok(rateLimit.includes('light: { limit: 20, window: "60 s" }'), "light AI limit is 20/user/minute");
assert.ok(rateLimit.includes('turn: { limit: 10, window: "60 s" }'), "turn AI limit is 10/user/minute");
assert.ok(rateLimit.includes('heavy: { limit: 5, window: "60 s" }'), "heavy AI limit is 5/user/minute");
assert.ok(rateLimit.includes('IP_RULE = { limit: 60, window: "60 s"'), "IP AI limit is 60/IP/minute");
assert.ok(rateLimit.includes("UPSTASH_REDIS_REST_URL") && rateLimit.includes("UPSTASH_REDIS_REST_TOKEN"), "rate limiter uses Upstash REST env vars");
assert.ok(rateLimit.includes("isProduction") && rateLimit.includes("NOT production protection"), "local-dev limiter fallback is explicitly not production protection");
assert.ok(rateLimit.includes("isProduction || workload === \"heavy\""), "production and heavy limiter failures fail closed");
assert.ok(!rateLimit.includes("error.message"), "rate limiter does not log raw client error messages");

const envExample = read(".env.example");
assert.ok(envExample.includes("UPSTASH_REDIS_REST_URL=\"\""), ".env.example documents Upstash REST URL name only");
assert.ok(envExample.includes("UPSTASH_REDIS_REST_TOKEN=\"\""), ".env.example documents Upstash REST token name only");

console.log("Security smoke tests passed: AI auth, ownership gates, request/transcript caps, provider caps, Gemini safety/header behavior, and hard-failure fallback bypasses are present.");
