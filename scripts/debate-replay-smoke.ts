/**
 * Autosave + Debate Replay smoke test (pure logic + source-level wiring — no network, no DB).
 * Run with: npm run debate-replay:smoke
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { draftKey } from "../lib/debate-drafts";
import { isUnfinished, sideLabel } from "../lib/debate-history";

function read(path: string): string {
  assert.ok(existsSync(path), `expected file to exist: ${path}`);
  return readFileSync(path, "utf8");
}

function main() {
  // --- Pure logic ---
  assert.equal(draftKey("abc"), "debatearena_draft_abc", "draft key format");
  assert.notEqual(draftKey("a"), draftKey("b"), "different debates get different keys");
  assert.equal(draftKey("a"), draftKey("a"), "same debate key is stable");
  assert.ok(isUnfinished("SETUP") && isUnfinished("ACTIVE"), "SETUP/ACTIVE are unfinished");
  assert.ok(!isUnfinished("JUDGED") && !isUnfinished("ARCHIVED"), "JUDGED/ARCHIVED are finished");
  assert.equal(sideLabel("GOVERNMENT"), "Government", "side label maps enum to readable");
  assert.equal(sideLabel("AGAINST"), "Against", "side label maps enum to readable");

  // --- Arena autosave (unchanged foundation) ---
  const arena = read("components/debate/debate-arena.tsx");
  assert.ok(/getItem\(draftKey\(debate\.id\)\)/.test(arena), "arena restores a saved draft on mount");
  assert.ok(/setTimeout\([\s\S]*setItem\(draftKey/.test(arena), "arena debounces the save");
  assert.ok(arena.includes("beforeunload"), "arena warns before leaving with an unsent draft");
  assert.ok(/setStudentInput\(""\);\s*clearDraft\(\);/.test(arena), "draft cleared only after an explicit submit");

  // Routes exist.
  assert.ok(existsSync("app/(app)/debates/history/page.tsx"), "history route exists");
  assert.ok(existsSync("app/(app)/debates/[debateId]/replay/page.tsx"), "replay route exists");

  const historyLib = read("lib/debate-history.ts");
  const history = read("app/(app)/debates/history/page.tsx");
  const replay = read("app/(app)/debates/[debateId]/replay/page.tsx");
  const retry = read("components/debate/retry-motion-button.tsx");
  const card = read("components/debate/resume-debates-card.tsx");
  const coachRoute = read("app/api/ai/side-coach/route.ts");
  const panel = read("components/debate/side-coach-panel.tsx");
  const room = read("components/debate/debate-room.tsx");

  // 1. Side Coach use marks the correct debate assisted (scoped to the owning student).
  assert.ok(panel.includes("debateId"), "panel sends debateId to the coach route");
  assert.ok(/updateMany\(\{[\s\S]*studentId: userId[\s\S]*assistedPractice: true/.test(coachRoute), "coach route marks the owner's debate assisted");

  // 2. Merely enabling the toggle (no coach call) never marks assisted.
  assert.ok(!/api\/ai\/side-coach/.test(room), "the toggle component never calls the coach API");
  assert.ok(/if \(input\.debateId\)/.test(coachRoute), "marking only happens on an actual coach request");

  // 3. Assisted label appears in history and replay.
  assert.ok(history.includes("Assisted Practice"), "history shows the assisted label");
  assert.ok(replay.includes("Assisted Practice"), "replay shows the assisted label");

  // 4. Coach content stays out of the official transcript.
  assert.ok(!/SideCoachPanel|api\/ai\/side-coach/.test(replay), "replay never mounts the Side Coach panel or its API");
  assert.ok(!/from "@\/lib\/side-coach"|SideCoachPanel/.test(historyLib), "history loader has no Side Coach coupling");

  // 5. Replay reuses the existing audio control for each speech.
  assert.ok(replay.includes("SpeakButton") && /accessibility\/speak-button/.test(replay), "replay reuses the existing SpeakButton");
  assert.ok(/messages\.map[\s\S]*SpeakButton text=\{message\.content\}/.test(replay), "each official speech has a read-aloud control");

  // 6. Judge feedback has a read-aloud control.
  assert.ok(replay.includes("judgeSpeech") && /SpeakButton text=\{judgeSpeech\}/.test(replay), "judge feedback has a read-aloud control");

  // 7. Retry offers same / opposite / random side.
  assert.ok(/Same side/.test(retry) && /Opposite side/.test(retry) && /Random side/.test(retry), "retry offers same/opposite/random side");
  assert.ok(retry.includes('"RANDOM"') && retry.includes("oppositeSide"), "retry resolves random and opposite sides");

  // 8. Retry preserves motion, track/organization, format/event, and difficulty (persona).
  for (const field of ["organization: config.organization", "eventType: config.eventType", "format: config.format", "level: config.level", "topic: config.topic", "aiPersona: config.aiPersona"]) {
    assert.ok(retry.includes(field), `retry preserves ${field}`);
  }

  // 9. Retry creates a fresh debate and copies no transcript/score/judge feedback.
  assert.ok(retry.includes('fetch("/api/debates"'), "retry POSTs a new debate via the normal API");
  assert.ok(retry.includes("MODERATOR") && retry.includes("Motion:"), "retry seeds only the opening moderator message");
  assert.ok(!/overallScore|strengths|weaknesses|judgeReport/.test(retry), "retry copies no score or judge feedback");

  // 10. Comparison uses real category scores when available.
  assert.ok(replay.includes("categoryRows") && /logicScore/.test(replay), "comparison uses real stored category scores");
  assert.ok(historyLib.includes("logicScore: true") && historyLib.includes("communicationScore: true"), "attempt loader selects real category scores");

  // 11. Comparison falls back to real qualitative feedback when scores are unavailable.
  assert.ok(/hasQualitative/.test(replay) && /Comparison data is unavailable/.test(replay), "comparison degrades to qualitative feedback then honest empty state");

  // 12. Comparison never invents improvement.
  assert.ok(/No improvement is calculated/.test(replay), "comparison explicitly avoids fabricated improvement");
  assert.ok(!/improved by|% better|delta/i.test(replay), "comparison shows no invented deltas");

  // 13. Recovery shows side, opponent, track/format, and last-active date.
  for (const token of ["sideLabel", "opponentLabel", "trackLabel", "formatLabel", "Last active"]) {
    assert.ok(card.includes(token), `recovery card shows ${token}`);
  }

  // 14. Discard draft clears only the selected debate's draft (with confirm) and keeps the debate.
  assert.ok(card.includes("Discard draft"), "recovery uses the clear 'Discard draft' label");
  assert.ok(/window\.confirm/.test(card) && /removeItem\(draftKey\(id\)\)/.test(card), "discard confirms and clears only that draft");

  // 15. Student history is owner-only.
  assert.ok(/where: \{ studentId: userId \}/.test(historyLib), "history is scoped to the current student");

  // 16 & 17. Replay authorization: owner/admin/team-coach allowed; everyone else 403.
  assert.ok(historyLib.includes("teamMember.findFirst"), "authorized team coach can view a student's replay");
  assert.ok(/permission to view this debate/.test(historyLib), "unauthorized viewers get a 403");

  console.log("debate-replay smoke: all assertions passed");
}

main();
