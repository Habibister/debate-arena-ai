/**
 * roleplay-round:smoke — the DECA role-play round's failure and truth contracts (beginner QA R3).
 *
 * Deterministic by construction: this suite drives the round's pure lifecycle and reads source. It
 * makes NO provider call, opens no socket, reads no database, and does not depend on an AI being up —
 * which is the point, because the defects it covers were found while the provider was down.
 *
 * The five cases the owner named:
 *   A HEALTHY            pitch → judge → reply → end → ballot
 *   B BALLOT FAILURE     round ends truthfully, no score, retry offered, nothing recorded
 *   C JUDGE FAILURE      the learner's words survive and the failure is not the coach's
 *   D PARTIAL COVERAGE   timing, indicators and scoring stated per dimension
 *   E CLUSTER / ROLES    changing cluster keeps the setup coherent with no manual repair
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  appendCharacterTurn,
  appendStudentTurn,
  canRetryEvaluation,
  endedWithoutBallot,
  evaluationFailed,
  evaluationSucceeded,
  initialEvaluation,
  latestStudentTurn,
  repeatsPreviousCharacterLine,
  requestEvaluation,
  roundHasEnded
} from "../lib/rooms/roleplay-round";
import { DECA_CLUSTER_ROLE_PAIRS, decaDefaultRolePairForCluster, decaRolePairsForCluster } from "../components/rooms/roleplay-config";
import { DECA_CLUSTERS } from "../lib/training-tracks";

const read = (path: string) => readFileSync(path, "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const ROOM = stripComments(read("components/rooms/roleplay-room.tsx"));
const SETUP = stripComments(read("components/training/deca-roleplay-setup.tsx"));
const PANEL = stripComments(read("components/debate/side-coach-panel.tsx"));

const results: string[] = [];
let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    results.push(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    results.push(`FAIL ${name}\n     ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ---------------------------------------------------------------------------------------------
check("CASE A — a healthy round reaches exactly one ballot", () => {
  let turns = appendStudentTurn([], "Here is my recommendation and why.");
  turns = appendCharacterTurn(turns, "What does it cost me?", "the guest");
  turns = appendStudentTurn(turns, "Nothing tonight — here is the breakdown.");
  turns = appendCharacterTurn(turns, "And how will I know it worked?", "the guest");
  assert.equal(turns.length, 4, "A1 every turn is kept, in order");

  let evaluation = initialEvaluation;
  const first = requestEvaluation(evaluation);
  evaluation = first.state;
  assert.equal(first.start, true, "A2 the first evaluation may start");
  evaluation = evaluationSucceeded(evaluation);
  assert.equal(evaluation.status, "evaluated", "A3 a real result ends the round scored");
  assert.equal(roundHasEnded(evaluation), true, "A4 and the round is over");
  assert.equal(endedWithoutBallot(evaluation), false, "A5 with a ballot, so no unscored card");
  assert.equal(requestEvaluation(evaluation).start, false, "A6 and no second evaluation may start — one ballot, ever");
  assert.equal(canRetryEvaluation(evaluation), false, "A7 nothing to retry once scored");
});

check("CASE B — a failed evaluation ends the round without inventing anything", () => {
  let evaluation = requestEvaluation(initialEvaluation).state;
  evaluation = evaluationFailed(evaluation, "AI is temporarily unavailable.");
  assert.equal(evaluation.status, "failed", "B1 the failure is its own terminal state");
  assert.equal(roundHasEnded(evaluation), true, "B2 THE ROUND ENDS — finishing and scoring are different events");
  assert.equal(endedWithoutBallot(evaluation), true, "B3 and it ended without a ballot");
  assert.equal(canRetryEvaluation(evaluation), true, "B4 the same transcript may be evaluated again");
  assert.ok(!("score" in evaluation) && !("result" in evaluation), "B5 the failure state has no place to hold a score");
  assert.equal(evaluation.message, "AI is temporarily unavailable.", "B6 the reason is carried, once");

  // One causal failure, one message: a second failure REPLACES the first rather than stacking.
  const again = requestEvaluation(evaluation);
  assert.equal(again.start, true, "B7 a retry may start");
  const second = evaluationFailed(again.state, "Still unavailable.");
  assert.equal(second.message, "Still unavailable.", "B8 the current failure replaces the previous one");
  // Directly: replacing a state that STILL HOLDS a message must not concatenate.
  const overwritten = evaluationFailed({ status: "failed", message: "first failure", attempts: 1 }, "second failure");
  assert.equal(overwritten.message, "second failure", "B8b one causal failure, one message — never appended");
  assert.equal(second.attempts, 2, "B9 attempts are counted, not accumulated as cards");

  // Recovery after failure produces exactly one ballot.
  const recovered = evaluationSucceeded(requestEvaluation(second).state);
  assert.equal(recovered.status, "evaluated", "B10 a later success still scores the round");
  assert.equal(requestEvaluation(recovered).start, false, "B11 and closes it to further attempts");

  // Double-click: two calls in the same tick cannot both start.
  const gate1 = requestEvaluation(initialEvaluation);
  const gate2 = requestEvaluation(gate1.state);
  assert.equal(gate1.start && !gate2.start, true, "B12 a double end starts exactly one evaluation");

  // The room must render the terminal state and must never fabricate a ballot on this path.
  assert.match(ROOM, /endedWithoutBallot\(evaluation\) \? \(/, "B13 the room renders a terminal unscored card");
  assert.match(ROOM, /Round complete\. Evaluation is unavailable right now\./, "B14 which says the round finished and the evaluation did not");
  assert.match(ROOM, /no score, no\s*\n?\s*feedback and no progress from this attempt/, "B15 and states what is absent");
  assert.match(ROOM, /Try evaluating this round again/, "B16 with a retry on the same transcript");
  assert.match(ROOM, /const roundOver = result !== null \|\| endedWithoutBallot\(evaluation\);/, "B17 the round's surfaces close on either terminal state");
  assert.ok(!/setResult\(\{/.test(ROOM), "B18 no code path builds a result object locally");
  const catchBlock = ROOM.slice(ROOM.indexOf("} catch (e) {", ROOM.indexOf("async function endAndJudge")), ROOM.indexOf("} finally {", ROOM.indexOf("async function endAndJudge")));
  assert.ok(!/setResult/.test(catchBlock), "B19 the failure path never sets a result");
  // The catch may say "could not score the round" — that is the reason. What it must never do is
  // produce one: no ballot fields, no numbers, no bands.
  for (const fabricated of ["overallScore", "presentationScore", "questioningScore", "strengths", "improvementAdvice"]) {
    assert.ok(!catchBlock.includes(fabricated), `B20 the failure path writes no ${fabricated}`);
  }
  assert.ok(!/\b\d{1,3}\b/.test(catchBlock), "B20b and no number of any kind");
  assert.match(catchBlock, /setPerformRunning\(false\)/, "B21 and stops the performance clock, which used to keep running");
});

check("CASE C — a judge failure keeps the learner's words and stays out of the coach's channel", () => {
  let turns = appendStudentTurn([], "My opening pitch.");
  turns = appendCharacterTurn(turns, "Why should I believe that?", "the guest");
  const beforeReply = turns.length;
  turns = appendStudentTurn(turns, "Because of these three facts.");
  assert.equal(turns.length, beforeReply + 1, "C1 the reply is appended before any request");
  assert.equal(latestStudentTurn(turns)?.content, "Because of these three facts.", "C2 and it is what the next request carries");

  // The room appends the student turn first, then requests — that ORDER is the fix for finding #3.
  const sendReply = ROOM.slice(ROOM.indexOf("async function sendReply"), ROOM.indexOf("async function endAndJudge"));
  assert.ok(
    sendReply.indexOf("appendStudentTurn") < sendReply.indexOf("requestCharacterTurn"),
    "C3 the room appends the learner's words before it asks the other person to respond"
  );
  assert.match(sendReply, /const next = appendStudentTurn\(turns, draft\)/, "C4 through the shared pure helper");

  // An exact repeat is reported, never rewritten.
  let repeated = appendCharacterTurn(turns, "Why should I believe that?", "the guest");
  assert.equal(repeatsPreviousCharacterLine(repeated), true, "C5 an identical repeat is detected");
  repeated = appendCharacterTurn(appendStudentTurn(repeated, "Here is the evidence."), "What will it cost?", "the guest");
  assert.equal(repeatsPreviousCharacterLine(repeated), false, "C6 and a different line is not");
  assert.match(ROOM, /The other person just repeated their previous line word for word/, "C7 the room says so plainly");
  assert.ok(!/regenerate|retryTurn|substitute/i.test(ROOM.slice(ROOM.indexOf("judgeRepeatedItself"))), "C8 and invents no replacement question");

  // Error ownership: the coach owns only the coach.
  assert.match(PANEL, /Side Coach could not answer just now\./, "C9 the coach failure names the coach");
  assert.ok(!PANEL.includes("No score, feedback, or progress was recorded."), "C10 and no longer passes verdict on the round");
  assert.match(PANEL, /const AUTO_FEEDBACK_FAILURE_ID = "coach-auto-unavailable"/, "C11 automatic failures share one card");
  assert.match(ROOM, /const \[evaluation, setEvaluation\] = useState<EvaluationState>\(initialEvaluation\);/, "C12 evaluation has its own channel");
  assert.match(ROOM, /setError\(e instanceof Error \? e\.message : "The other person didn't respond\. Try again\."\)/, "C13 a judge failure stays in the round's channel");
});

check("CASE D — coverage is stated per dimension, and timing never implies scoring", () => {
  assert.match(ROOM, /const coverageLines = isDeca && scenario/, "D1 the room states coverage per dimension");
  const block = ROOM.slice(ROOM.indexOf("const coverageLines"), ROOM.indexOf("const eventTitle"));
  for (const dimension of ["Timing", "Performance indicators", "Ballot"]) {
    assert.ok(block.includes(`label: "${dimension}"`), `D2 ${dimension} has its own line`);
  }
  assert.match(block, /officialTimingApplies/, "D3 timing follows the cluster-coverage rule");
  assert.match(block, /scenario\.piSource === "registry"/, "D4 indicators follow the scenario's own source");
  assert.match(block, /official DECA weighted scoring is not available/, "D5 and scoring says what it is not");
  // The dimensions are independent: nothing derives the scoring line from the timing flag.
  const ballotLine = block.slice(block.indexOf('label: "Ballot"'));
  assert.ok(!/officialTimingApplies/.test(ballotLine), "D6 the scoring line never reads the timing flag");

  const ai = stripComments(read("lib/ai.ts"));
  assert.ok(!/No competition specification was found for this event/.test(ai), "D7 the notice no longer denies coverage wholesale");
  assert.match(ai, /The performance indicators in this brief are CompeteReady practice, not official DECA indicators\./, "D8 it speaks for the indicators only");
  assert.match(ai, /Any timing shown for this round is sourced separately\./, "D9 and points at the other dimension rather than contradicting it");
});

check("CASE E — changing cluster leaves a coherent setup with no manual repair", () => {
  for (const cluster of DECA_CLUSTERS) {
    const pairs = decaRolePairsForCluster(cluster);
    assert.ok(pairs.length >= 3, `E1 ${cluster} has authored practice pairings`);
    const pair = decaDefaultRolePairForCluster(cluster);
    assert.ok(pair.student.length > 3 && pair.judge.length > 3, `E2 ${cluster} opens on a usable pairing`);
    assert.ok(Object.prototype.hasOwnProperty.call(DECA_CLUSTER_ROLE_PAIRS, cluster), `E3 ${cluster} is covered by name`);
  }
  // The defect itself: a non-hospitality cluster must not open on the hotel pairing.
  const hospitality = decaDefaultRolePairForCluster("Hospitality & Tourism");
  for (const cluster of DECA_CLUSTERS.filter((c) => c !== "Hospitality & Tourism")) {
    const pair = decaDefaultRolePairForCluster(cluster);
    assert.notDeepEqual(pair, hospitality, `E4 ${cluster} does not inherit the hotel front desk`);
  }
  assert.deepEqual(decaDefaultRolePairForCluster("Not a cluster"), hospitality, "E5 an unknown cluster falls back, it does not crash");

  assert.match(SETUP, /function chooseCluster\(next: string\)/, "E6 the cluster control updates the roles");
  assert.match(SETUP, /onChange=\{\(e\) => chooseCluster\(e\.target\.value\)\}/, "E6b and the select really calls it");
  assert.match(SETUP, /if \(rolesAreCustom\) return;/, "E7 unless the learner typed their own");
  assert.match(SETUP, /Use \{cluster\} defaults/, "E8 which they can undo deliberately");
  assert.match(SETUP, /decaRolePairsForCluster\(cluster\)/, "E9 and a surprise stays inside the chosen cluster");
  assert.ok(!SETUP.includes("they do not change when you pick a cluster"), "E10 the copy no longer asks a beginner to repair the defaults");
  assert.match(SETUP, /CompeteReady\s*\n?\s*practice pairings for the cluster you picked/, "E11 and names the roles as ours");
});

check("F — the simulation link lands on the simulation", () => {
  const arcade = stripComments(read("app/(app)/study-arcade/page.tsx"));
  assert.match(arcade, /id="full-simulation"/, "F1 the setup card is an anchor target");
  // An anchor alone did not deliver the learner: measured live, the card still sat ~3,700px below the
  // fold after the click. The link asks the page to LEAD with the simulation instead — same route, same
  // component, only the order changes.
  assert.match(arcade, /const focusSimulation = searchParams\.focus === "simulation";/, "F2 the page understands a simulation-focused arrival");
  assert.match(arcade, /\{showDeca && focusSimulation \? \(/, "F3 which renders the simulation first");
  assert.match(arcade, /\{showDeca && !focusSimulation \? \(/, "F4 and keeps its usual place otherwise");
  for (const [file, label] of [
    ["app/(app)/compete/page.tsx", "Compete"],
    ["app/(app)/home/page.tsx", "Home"]
  ] as const) {
    const src = stripComments(read(file));
    assert.ok(src.includes("focus=simulation#full-simulation"), `F5 ${label}'s simulation action asks for that arrival`);
  }
  const compete = stripComments(read("app/(app)/compete/page.tsx"));
  assert.ok(!/study-arcade\?track=\$\{track\.slug\}`/.test(compete), "F6 no bare arcade link remains on Compete");
});

console.log(results.join("\n"));
console.log(`\n${results.length - failures}/${results.length} role-play round controls passed`);
if (failures > 0) process.exit(1);
