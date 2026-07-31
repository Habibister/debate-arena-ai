import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sideCoachUnavailable, type SideCoachResponse } from "../lib/side-coach";

// M6 — Debate Side Coach honest unavailable/failure handling.
//
// Closes the standing defect from the C5C1 audit (item S1): a provider outage returned HTTP 200 with
// a manufactured strength/improvement/nextMove, and the Debate panel rendered it in green success
// styling as coaching about the learner's own speech.
//
// The server contract is exercised directly. Panel behaviour is asserted against component source,
// matching this repo's convention for client components.

const PANEL = readFileSync("components/debate/side-coach-panel.tsx", "utf8");
const COACH = readFileSync("lib/side-coach.ts", "utf8");
const ROUTE = readFileSync("app/api/ai/side-coach/route.ts", "utf8");

// Mirrors the panel's own renderability rule so the two cannot drift apart silently.
function isRenderableCoaching(data: Partial<SideCoachResponse>, requestType: "turn-feedback" | "ask"): boolean {
  if (data.unavailable === true) return false;
  if (requestType === "ask") return Boolean(data.message && data.message.trim());
  return Boolean(data.strength || data.improvement || data.nextMove || data.example);
}

function main() {
  // ---- 1. a valid response renders as genuine feedback ----------------------------------------
  const validTurn: Partial<SideCoachResponse> = {
    message: "Here is a read on your rebuttal.",
    strength: 'You quoted their "buses cost millions" claim before answering it.',
    improvement: "You never said why the cost matters less than the learning impact.",
    nextMove: "Weigh the impacts explicitly before your summary."
  };
  assert.equal(isRenderableCoaching(validTurn, "turn-feedback"), true, "a complete turn-feedback payload renders as coaching");
  assert.equal(isRenderableCoaching({ message: "Answer their strongest point first." }, "ask"), true, "a non-empty ask answer renders");

  // ---- 2. an unavailable result carries no learner feedback ------------------------------------
  const un = sideCoachUnavailable("provider-error");
  assert.equal(un.unavailable, true, "unavailable is explicitly flagged");
  assert.equal(un.message, "", "unavailable carries no learner-facing prose");
  for (const field of ["strength", "improvement", "nextMove", "example"] as const) {
    assert.equal(un[field], undefined, `unavailable invents no ${field}`);
  }
  assert.equal(isRenderableCoaching(un, "turn-feedback"), false, "an unavailable result is never renderable as coaching");
  assert.equal(isRenderableCoaching(un, "ask"), false, "an unavailable result is never renderable as an answer");
  const unText = Object.values(un).filter((v) => typeof v === "string").join(" ");
  assert.ok(!/good start|clear point|nice work|great|well done/i.test(unText), "unavailable contains no canned praise");
  assert.ok(!/rubric|score|\b\d+\s*\/\s*\d+\b/i.test(unText), "unavailable contains no rubric or score placeholder");

  // ---- 3/4/5. every failure mode maps to unavailable, never to partial feedback ----------------
  for (const reason of ["provider-error", "empty-response", "incomplete-turn-feedback"] as const) {
    const r = sideCoachUnavailable(reason);
    assert.equal(r.unavailable, true, `${reason} is flagged unavailable`);
    assert.equal(isRenderableCoaching(r, "turn-feedback"), false, `${reason} never renders as feedback`);
  }
  // Invalid JSON / empty provider output cannot become feedback: the normalizer requires a usable field.
  for (const malformed of [{}, { message: "" }, { message: "   " }, { unavailable: true }]) {
    assert.equal(isRenderableCoaching(malformed, "turn-feedback"), false, `malformed turn payload ${JSON.stringify(malformed)} is not renderable`);
    assert.equal(isRenderableCoaching(malformed, "ask"), false, `malformed ask payload ${JSON.stringify(malformed)} is not renderable`);
  }
  // A turn-feedback payload carrying ONLY a message would have produced an empty card before M6.
  assert.equal(isRenderableCoaching({ message: "Nice." }, "turn-feedback"), false, "a message-only turn payload is incomplete, not partial feedback");
  // The server normalizer enforces the same split.
  assert.ok(COACH.includes('return sideCoachUnavailable("incomplete-turn-feedback")'), "server rejects turn-feedback with no renderable field");
  assert.ok(COACH.includes('return sideCoachUnavailable("empty-response")'), "server rejects an empty provider response");
  assert.ok(COACH.includes('return sideCoachUnavailable("provider-error")'), "server maps provider exceptions to unavailable");

  // ---- panel: unavailable is detected and never rendered as coaching ---------------------------
  assert.ok(PANEL.includes("if (!isRenderableCoaching(data, requestType))"), "the panel validates every payload before rendering it");
  assert.ok(PANEL.includes("data.unavailable === true"), "the panel treats unavailable: true as a failure");
  assert.ok(PANEL.includes('kind: "unavailable"'), "the panel has an explicit unavailable entry kind");
  assert.ok(PANEL.includes("Side Coach is temporarily unavailable."), "honest unavailable wording present");
  assert.ok(PANEL.includes("was not evaluated."), "the panel states the work was not evaluated");
  assert.ok(PANEL.includes("No score, feedback, or progress was recorded."), "the panel states nothing was recorded");
  // Failure is conveyed by icon + text, never by colour alone.
  assert.ok(PANEL.includes("<AlertTriangle"), "failure carries a non-colour icon cue");
  // No success affordances on the unavailable path.
  const unavailableBlock = PANEL.slice(PANEL.indexOf('entry.kind === "unavailable" ? ('), PANEL.indexOf("{entry.strength ?"));
  for (const banned of ["Worked:", "Improve:", "Next move:", "Example:", "emerald-500/[0.06]"]) {
    assert.ok(!unavailableBlock.includes(banned), `the unavailable block shows no ${banned}`);
  }

  // ---- 6/7/8. retry is explicit, reuses the transcript, and stays honest on repeat failure -----
  assert.ok(PANEL.includes("retry?: CoachRequest"), "an unavailable entry carries the request needed to retry it");
  assert.ok(PANEL.includes("Try again"), "an explicit retry control exists");
  assert.ok(PANEL.includes("onClick={() =>") && PANEL.includes("entry.retry!.requestType"), "retry fires only from an explicit learner action");
  // Retry replaces the failed entry in place rather than stacking duplicates.
  assert.ok(PANEL.includes("replaceEntryId?: string") && PANEL.includes("const localId = replaceEntryId ??"), "retry replaces the unavailable entry in place");
  assert.ok(PANEL.includes("current.some((e) => e.id === entry.id) ? current.map"), "upsert replaces rather than appends on retry");
  // A repeat failure produces another unavailable entry with a retry payload — still honest, still retryable.
  assert.ok(PANEL.includes('upsert({ id: localId, kind: "unavailable", label: options?.askKind, retry: request });'), "a failed retry remains unavailable and retryable");
  // The auto-request fires at most once per student speech and is not re-armed by failure.
  assert.ok(PANEL.includes("coachedIdRef.current = latestStudent.id;"), "the auto request is guarded by a per-speech ref");
  const autoBlock = PANEL.slice(PANEL.indexOf("// Auto turn-feedback once per new student speech."), PANEL.indexOf("return ("));
  assert.ok(!autoBlock.includes("setTimeout") && !autoBlock.includes("setInterval"), "no timer re-fires the coach automatically");
  // The official transcript is a read-only prop; the coach never mutates it.
  assert.ok(!PANEL.includes("setMessages") && !PANEL.includes("messages.push"), "the coach never mutates the official transcript");

  // ---- 9. no write of any kind happens on the coaching path -------------------------------------
  for (const banned of ["recordDrillMastery", "@/lib/spaced-review", "completedAt", "xpAwarded", "ballot", "MasteryProgress"]) {
    assert.ok(!PANEL.includes(banned), `the panel performs no ${banned} write`);
    assert.ok(!COACH.includes(banned), `the coach module performs no ${banned} write`);
  }
  assert.ok(!COACH.includes("@/lib/prisma") && !COACH.includes('from "./prisma"'), "the coach module never touches the database");
  // The panel's ONLY network call is the coach route.
  const fetchCalls = PANEL.split("fetch(").length - 1;
  assert.equal(fetchCalls, 1, "the panel makes exactly one kind of network request");
  assert.ok(PANEL.includes('fetch("/api/ai/side-coach"'), "and it is the Side Coach route");
  // The route writes only the assisted-practice honesty flag — never progress, score or completion.
  const routeWrites = ROUTE.split("prisma.").length - 1;
  assert.equal(routeWrites, 1, "the route performs exactly one database statement");
  assert.ok(ROUTE.includes("prisma.debate.updateMany") && ROUTE.includes("assistedPractice: true"), "that statement is the assisted-practice flag only");
  for (const banned of ["score", "completedAt", "xp", "rating", "mastery", "ballot"]) {
    assert.ok(!ROUTE.includes(`${banned}:`), `the route writes no ${banned} field`);
  }
  // Existing security posture preserved: auth before rate-limit before body parse.
  const authIdx = ROUTE.indexOf("requireUser()");
  const limitIdx = ROUTE.indexOf("enforceRateLimit({");
  const parseIdx = ROUTE.indexOf("parseJson(");
  assert.ok(authIdx > 0 && authIdx < limitIdx && limitIdx < parseIdx, "auth -> rate limit -> parse ordering preserved");

  // ---- 10. no production failure path contains a canned feedback object -------------------------
  assert.ok(!COACH.includes("sideCoachFallback"), "the manufactured-feedback fallback is gone");
  for (const canned of ["You put a clear point on the table", "good start", "Here's a quick read on your last point", "Add the reasoning and why it matters"]) {
    assert.ok(!COACH.includes(canned), `canned string removed from the coach module: "${canned}"`);
    assert.ok(!PANEL.includes(canned), `canned string absent from the panel: "${canned}"`);
  }

  // ---- 12. track isolation -----------------------------------------------------------------------
  // The unavailable copy adapts wording by practice vs debate but leaks no other track's vocabulary.
  assert.ok(!/performance indicator|rating sheet|patient/i.test(unavailableBlock), "the Debate unavailable state uses no DECA/HOSA vocabulary");

  console.log(
    "Debate side-coach smoke passed: valid payloads still render; provider errors, empty responses, malformed JSON and incomplete turn-feedback all return an explicit unavailable result with NO strength/improvement/nextMove/example/praise/rubric; the panel refuses to render any of them as coaching; the unavailable state names that the work was not evaluated and that nothing was recorded, with an icon cue and an explicit retry that reuses the transcript, replaces in place, and never auto-loops; the coach module touches no database and the route writes only the assisted-practice flag with auth->rate-limit->parse ordering intact."
  );
}

main();
