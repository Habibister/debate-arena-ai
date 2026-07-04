import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

const directAiRoutes = [
  "app/api/ai/health/route.ts",
  "app/api/ai/judge/route.ts",
  "app/api/ai/judge-deca/route.ts",
  "app/api/ai/judge-hosa/route.ts",
  "app/api/ai/lesson/route.ts",
  "app/api/ai/opponent/route.ts",
  "app/api/ai/practice-questions/route.ts",
  "app/api/ai/readiness/route.ts",
  "app/api/ai/recommendations/route.ts",
  "app/api/ai/side-coach/route.ts",
  "app/api/ai/topic/route.ts"
];

for (const routePath of directAiRoutes) {
  const source = read(routePath);
  assert.ok(source.includes('from "@/lib/api-auth"'), `${routePath} imports the shared API auth gate`);
  assert.ok(source.includes("requireUser("), `${routePath} requires authentication`);

  const authIndex = source.indexOf("requireUser(");
  const parseIndex = source.indexOf("parseJson(");
  if (parseIndex >= 0) {
    assert.ok(authIndex >= 0 && authIndex < parseIndex, `${routePath} authenticates before parsing/generation work`);
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

const testsRoute = read("app/api/tests/route.ts");
assert.ok(testsRoute.includes("getServerSession(authOptions)"), "practice test generation authenticates the session");
assert.ok(testsRoute.includes("userId: session.user.id"), "practice test generation persists to the authenticated user");
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

console.log("Security smoke tests passed: AI auth, ownership gates, request/transcript caps, provider caps, Gemini safety/header behavior, and hard-failure fallback bypasses are present.");
