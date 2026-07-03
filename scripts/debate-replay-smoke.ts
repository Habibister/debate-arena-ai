/**
 * Autosave + Debate Replay smoke test (pure logic + source-level wiring — no network, no DB).
 * Run with: npm run debate-replay:smoke
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { draftKey } from "../lib/debate-drafts";
import { isUnfinished } from "../lib/debate-history";

function read(path: string): string {
  assert.ok(existsSync(path), `expected file to exist: ${path}`);
  return readFileSync(path, "utf8");
}

function main() {
  // 1. Draft keys are per-debate and stable — drafts never leak across debates.
  assert.equal(draftKey("abc"), "debatearena_draft_abc", "draft key format");
  assert.notEqual(draftKey("a"), draftKey("b"), "different debates get different keys");
  assert.equal(draftKey("a"), draftKey("a"), "same debate key is stable");

  // 2. Unfinished detection: SETUP/ACTIVE recover; JUDGED/ARCHIVED do not.
  assert.ok(isUnfinished("SETUP") && isUnfinished("ACTIVE"), "SETUP/ACTIVE are unfinished");
  assert.ok(!isUnfinished("JUDGED") && !isUnfinished("ARCHIVED"), "JUDGED/ARCHIVED are finished");

  // 3. Arena autosave wiring: restore-on-mount, debounced save, clear-on-submit, beforeunload guard.
  const arena = read("components/debate/debate-arena.tsx");
  assert.ok(arena.includes("draftKey(debate.id)"), "arena uses per-debate draft key");
  assert.ok(/getItem\(draftKey\(debate\.id\)\)/.test(arena), "arena restores a saved draft on mount");
  assert.ok(/setTimeout\([\s\S]*setItem\(draftKey/.test(arena), "arena debounces the save");
  assert.ok(arena.includes("beforeunload"), "arena warns before leaving with an unsent draft");
  assert.ok(arena.includes("clearDraft();"), "arena clears the draft on successful submit");
  // Autosave must never auto-submit: clearDraft is called right after the manual submit clears input.
  assert.ok(/setStudentInput\(""\);\s*clearDraft\(\);/.test(arena), "draft cleared only after an explicit submit");

  // 4. History + replay routes exist.
  assert.ok(existsSync("app/(app)/debates/history/page.tsx"), "history route exists");
  assert.ok(existsSync("app/(app)/debates/[debateId]/replay/page.tsx"), "replay route exists");

  // 5. History uses real student debates and distinguishes continue vs replay.
  const history = read("app/(app)/debates/history/page.tsx");
  assert.ok(history.includes("getStudentDebates"), "history reads the student's real debates");
  assert.ok(history.includes("/debate/${debate.id}") && history.includes("/replay"), "history links continue and replay");

  // 6. Replay enforces access control and shows only the official transcript + separate judge feedback.
  const replay = read("app/(app)/debates/[debateId]/replay/page.tsx");
  assert.ok(replay.includes("getDebateReplay"), "replay uses the access-controlled loader");
  assert.ok(/403|permission/i.test(replay) && /404|not be found/i.test(replay), "replay handles denial and not-found honestly");
  assert.ok(replay.includes("Official transcript") && replay.includes("Judge feedback"), "transcript and judge feedback are separate sections");
  assert.ok(/never part of this transcript|not shown here/i.test(replay), "replay states private coaching is excluded");
  assert.ok(!/SideCoachPanel|api\/ai\/side-coach/.test(replay), "replay never mounts the Side Coach panel or its API");

  // 7. Replay loader returns only official fields — never persisted coach messages (which do not exist).
  const historyLib = read("lib/debate-history.ts");
  assert.ok(/permission to view this debate/.test(historyLib), "loader throws a 403 when not permitted");
  assert.ok(historyLib.includes("teamMember.findFirst"), "coach-owns-team access path present");
  assert.ok(!/from "@\/lib\/side-coach"|SideCoachPanel/.test(historyLib), "history loader has no Side Coach coupling");

  // 8. Retry starts a fresh attempt via the normal create flow (never copies transcript/scores).
  const retry = read("components/debate/retry-motion-button.tsx");
  assert.ok(retry.includes('fetch("/api/debates"'), "retry POSTs a new debate");
  assert.ok(retry.includes("/messages") && retry.includes("MODERATOR"), "retry seeds the opening moderator message");

  // 9. Attempt comparison uses only real judged scores.
  assert.ok(historyLib.includes("getAttemptsForMotion") && /status: "JUDGED"/.test(historyLib), "attempt compare uses real judged scores only");

  // 10. Dashboard offers recovery for unfinished debates.
  const dashboard = read("app/(app)/dashboard/page.tsx");
  assert.ok(dashboard.includes("ResumeDebatesCard") && dashboard.includes("isUnfinished"), "dashboard shows unfinished-debate recovery");

  console.log("debate-replay smoke: all assertions passed");
}

main();
