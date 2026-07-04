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

console.log("Security smoke tests passed: direct AI auth guards, scoped debate ownership gates, and test ownership are present.");
