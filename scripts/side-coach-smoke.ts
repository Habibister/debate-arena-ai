/**
 * Beginner Side Coach smoke test (pure logic + role/transcript-isolation wiring — no network).
 * Run with: npm run side-coach:smoke
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { buildSideCoachSystemPrompt, buildSideCoachUserPrompt, sideCoachFallback, type SideCoachInput } from "../lib/side-coach";
import { sideCoachRequestSchema } from "../lib/validators";

const base: SideCoachInput = {
  organization: "DEBATE",
  eventType: "Public Forum",
  studentSide: "AFFIRMATIVE",
  level: "BEGINNER",
  transcript: [
    { role: "MODERATOR", content: "Motion: schools should teach AI literacy." },
    { role: "AFFIRMATIVE", content: "Financial literacy prevents future debt." }
  ],
  latestStudentSpeech: "Financial literacy prevents future debt.",
  requestType: "turn-feedback"
};

function main() {
  // Role separation is baked into the coach's own system prompt (not the opponent's).
  const sys = buildSideCoachSystemPrompt(base);
  assert.ok(/NOT the opponent/.test(sys) && /NOT the judge/.test(sys), "coach declares it is not the opponent or judge");
  assert.ok(/never reveal or invent judge scores/i.test(sys), "coach must not reveal judge scoring");
  assert.ok(/help ONLY the student/i.test(sys), "coach helps only the student");

  // Track-specific framing.
  assert.ok(/health-science/i.test(buildSideCoachSystemPrompt({ ...base, organization: "HOSA" })), "HOSA framing");
  assert.ok(/role-play/i.test(buildSideCoachSystemPrompt({ ...base, organization: "DECA" })), "DECA framing");
  assert.ok(/diplomacy/i.test(buildSideCoachSystemPrompt({ ...base, organization: "MODEL_UN" })), "Model UN framing");

  // User prompt carries ONLY the public transcript + latest speech (no judge scoring is ever passed).
  const user = buildSideCoachUserPrompt(base);
  assert.ok(/official debate only/i.test(user), "user prompt is scoped to the public transcript");
  assert.ok(user.includes("Financial literacy prevents future debt."), "references the student's actual latest speech");
  assert.ok(!/score|ballot|verdict/i.test(user), "no judge scoring leaks into the coach prompt");

  // Deterministic, track-aware fallback so coaching failure never blocks the debate.
  const fb = sideCoachFallback(base);
  assert.ok(fb.unavailable === true && fb.nextMove, "fallback returns usable guidance");
  assert.ok(/recommendation/i.test(sideCoachFallback({ ...base, organization: "DECA" }).nextMove ?? ""), "DECA fallback is business-flavored");
  assert.ok(/country/i.test(sideCoachFallback({ ...base, organization: "MODEL_UN" }).nextMove ?? ""), "Model UN fallback is diplomacy-flavored");
  // No shaming language in coach fallback.
  const text = Object.values(sideCoachFallback(base)).join(" ");
  assert.ok(!/fail|terrible|stupid|dumb/i.test(text), "coach copy is never shaming");

  // Schema: public transcript only; validates ask + turn-feedback.
  const parsed = sideCoachRequestSchema.parse({ organization: "DECA", requestType: "ask", askKind: "What should I answer?", transcript: [] });
  assert.equal(parsed.requestType, "ask");
  assert.throws(() => sideCoachRequestSchema.parse({ organization: "NOPE", transcript: [] }), "invalid org rejected");

  // Separate role + path (not the opponent/judge route).
  assert.ok(existsSync("app/api/ai/side-coach/route.ts"), "side-coach has its own API route");
  const route = readFileSync("app/api/ai/side-coach/route.ts", "utf8");
  assert.ok(route.includes("generateSideCoachResponse") && !route.includes("generateOpponentSpeech"), "route uses the coach role, not the opponent");
  const lib = readFileSync("lib/side-coach.ts", "utf8");
  assert.ok(!/openai-debate/.test(lib), "coach does not reuse the opponent prompt module");

  // Transcript isolation: the panel receives the official transcript read-only and keeps its own
  // state; it never mutates the transcript or the judge input.
  const panel = readFileSync("components/debate/side-coach-panel.tsx", "utf8");
  assert.ok(panel.includes("messages: OfficialMessage[]"), "panel takes the official transcript as read-only input");
  assert.ok(!/setMessages/.test(panel), "panel never writes to the official transcript");
  assert.ok(panel.includes("/api/ai/side-coach"), "panel calls only the side-coach path");
  const arena = readFileSync("components/debate/debate-arena.tsx", "utf8");
  assert.ok(arena.includes("<SideCoachPanel") && arena.includes("messages={messages}"), "arena passes the transcript to the coach panel (read-only)");
  // The judge still receives only official messages — coach entries live in the panel, never in `messages`.
  assert.ok(!/messages.*coach|coachMessages/.test(arena), "coach messages are not merged into the arena transcript state");

  console.log("Side-coach smoke tests passed: role separation (coach ≠ opponent ≠ judge), no judge-score leakage, track framing + fallback, no-shame copy, schema, separate route, transcript isolation (read-only, own state).");
}

main();
