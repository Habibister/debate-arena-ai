/**
 * JUDGE QUALITY — UNSCORED TRANSCRIPT JUDGE INVARIANTS
 *
 * This suite used to validate the deterministic Debate transcript judge as a semantic scorer: a
 * fourteen-category ballot, an overall, a winner, speaker ranks and readiness. That scorer was
 * withdrawn on 2026-09-07 because it could not tell substantive reasoning from grammatical
 * connective stuffing. The measurements that ended it, all length-matched:
 *
 *   * appending 29 words of nonsense containing marker words to a substantive speech moved 11
 *     categories and raised the overall 47 -> 71 (warrant +47, mechanism +48, refutation +30);
 *   * 118 words of pure nonsense beat a 147-word genuinely strong speech 70 to 55, winning 11 of
 *     14 categories — only motionConnection preferred the real speech;
 *   * 50 words of nonsense flipped the decision, turning a side losing 42 to a strong opponent
 *     into a 75-point winner.
 *
 * So the subject of this file changed. It no longer asks "is the score good"; it asserts that NO
 * semantic score is produced, that nothing downstream manufactures one, and that the specific
 * proxies which failed cannot come back. Every check here fails if a future change reintroduces
 * transcript-derived semantic performance scoring.
 *
 * Fixtures A-D are the adversarial pairs the withdrawal was decided on, kept executable so the
 * claim stays testable rather than historical.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildTranscriptBasedDebateJudge } from "@/lib/debate-judge-analysis";
import { COMPETENCY_ROUND_MEASURE } from "@/lib/education/guided-judge";

const read = (p: string) => readFileSync(p, "utf8");
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const BASE = {
  organization: "DEBATE" as const,
  eventType: "PARLIAMENTARY_DEBATE" as const,
  level: "INTERMEDIATE" as const,
  topic: "Schools should require AI literacy.",
  studentSide: "GOVERNMENT" as const
};
const OPPOSITION_SPEECH =
  "The AI literacy requirement takes class time from subjects that already have too little. Teachers in the district said the training displaced two weeks of the timetable, and schools already behind cannot absorb that.";

// A. A genuinely strong government case: claim, warrant with a mechanism, concrete impact, and a
//    direct answer to the opponent, written the way a good student actually speaks.
const A_STRONG =
  "Schools should require AI literacy. When a student is taught to check a machine answer against the source it cites, they stop treating the output as settled, and the district that ran this training last year logged fewer unattributed submissions in the term afterwards. That matters because a student who leaves school unable to check what a system tells them carries that gap into work no one re-checks for them. On the timetable, the district fitted the training inside existing lessons; the two weeks the other side describes came from a pilot that scheduled it as a separate block.";
// C. Grammatically shaped nonsense, dense in the exact markers the withdrawn formulas counted.
const NONSENSE =
  "This is because the school day. Therefore it leads to one year. The evidence shows the record. However they claim staff. But their argument families. The study found board. This is because the timetable. Therefore it leads to the district. The data shows the lesson. However they claim the week.";
// D. A real but weak speech: a position with no warrant, no mechanism and no impact.
const D_WEAK =
  "Schools should require AI literacy. It is important for students and it will help them in the future. We think this is a good policy.";

function judge(studentSpeech: string) {
  return buildTranscriptBasedDebateJudge({
    ...BASE,
    transcript: [
      { role: "AFFIRMATIVE", round: 1, content: studentSpeech },
      { role: "NEGATIVE", round: 1, content: OPPOSITION_SPEECH },
      { role: "AFFIRMATIVE", round: 2, content: studentSpeech },
      { role: "NEGATIVE", round: 2, content: OPPOSITION_SPEECH }
    ]
  }) as Record<string, unknown>;
}

function main() {
  // ---- 1. NO SEMANTIC BALLOT ON ANY FIXTURE ------------------------------------------------------
  const fixtures = {
    "A strong": judge(A_STRONG),
    "B strong + nonsense": judge(`${A_STRONG} ${NONSENSE}`),
    "C pure nonsense": judge(NONSENSE),
    "D weak but real": judge(D_WEAK)
  };

  for (const [name, ballot] of Object.entries(fixtures)) {
    assert.equal(ballot.semanticScoring, "unavailable", `1. ${name}: the producer declares semantic scoring unavailable`);
    // Each of these is OMITTED, not zeroed. A zero would read as a measured failure.
    for (const field of [
      "overallScore",
      "categoryScores",
      "teamWinner",
      "losingSide",
      "confidenceLevel",
      "sharedSpeaking",
      "speakerScores",
      "readinessForNextLevel",
      "ratingChange",
      "internalScoringSummary",
      "judgeFairnessReport",
      "transcriptFeedback",
      "sideAnalysis",
      "sideFeedback"
    ]) {
      assert.equal(ballot[field], undefined, `1b. ${name}: ${field} is absent, never 0 and never a default`);
    }
  }

  // ---- 2. THE ADVERSARIAL PAIRS THAT ENDED THE SCORER --------------------------------------------
  const a = fixtures["A strong"];
  const b = fixtures["B strong + nonsense"];
  const c = fixtures["C pure nonsense"];

  // B cannot gain semantic performance credit over A, because neither has any.
  assert.deepEqual(b.recommendedLessons, a.recommendedLessons, "2. nonsense changes no recommendation");
  assert.equal(b.overallScore, a.overallScore, "2b. and moves no overall — both are absent");
  // C cannot beat A, cannot win, cannot earn a delta.
  assert.equal(c.teamWinner, undefined, "2c. pure nonsense produces no winner");
  assert.equal(c.overallScore, undefined, "2d. and no overall to beat a real speech with");
  assert.deepEqual(c.recommendedLessons, a.recommendedLessons, "2e. and no recommendation of its own");

  // The one diagnostic that genuinely separated them is still honest, and it is not a score.
  const diag = (ballot: Record<string, unknown>) => ballot.transcriptDiagnostics as Record<string, unknown>;
  assert.equal(diag(a).motionEngaged, true, "2f. the real speech engaged the motion's terms");
  assert.equal(diag(c).motionEngaged, false, "2g. the nonsense did not — the diagnostic still discriminates");
  assert.equal(typeof diag(a).wordCount, "number", "2h. and operational facts are still recorded");

  // ---- 3. SOURCE CONTROLS: the withdrawn proxies cannot come back ---------------------------------
  const analysis = stripComments(read("lib/debate-judge-analysis.ts"));
  // The formulas may remain in the file (retained but unread, like SIGNPOST_MARKERS and
  // WEIGHING_MARKERS before them) — what must not return is the producer EMITTING them.
  for (const field of ["overallScore:", "categoryScores:", "teamWinner:", "sharedSpeaking:", "speakerScores:", "readinessForNextLevel:"]) {
    assert.ok(!new RegExp(`\\n    ${field.replace(":", ":")}`).test(analysis.slice(analysis.indexOf("  return {\n    // NO overallScore"))),
      `3. the transcript producer's return does not emit ${field}`);
  }
  assert.ok(/semanticScoring: "unavailable" as const/.test(analysis), "3b. and it declares the absence explicitly");

  const route = stripComments(read("app/api/debates/[debateId]/judge/route.ts"));
  assert.ok(/const overallScore = result\.overallScore === undefined \? undefined : normalizeScore/.test(route),
    "3c. the route never coerces an absent overall to a number");
  assert.ok(/result\.teamWinner === undefined && overallScore === undefined\s*\?\s*undefined/.test(route),
    "3d. and never manufactures a winner from an overall threshold");
  assert.ok(/overallScore: overallScore \?\? null/.test(route), "3e. an unscored round persists null, not 0");
  assert.ok(/scoredOverall === undefined \? undefined : skillDelta\(scores\.logic/.test(route),
    "3f. argumentDelta is omitted when the round was not scored");
  assert.ok(/scoredOverall === undefined \? undefined : skillDelta\(scores\.rebuttal/.test(route),
    "3g. refutationDelta likewise");
  assert.ok(/scoredOverall === undefined \? undefined : skillDelta\(scores\.evidence/.test(route),
    "3h. evidenceDelta likewise");
  assert.ok(/const ratingChange =\s*\n?\s*ratingDelta === undefined/.test(route),
    "3i. and the whole rating block is gated on a real score");
  assert.ok(/scoredBy:\s*\n?\s*overallScore === undefined\s*\n?\s*\? "transcript-diagnostics"/.test(route),
    "3j. an unscored round is labelled transcript-diagnostics, not local-lexical-rubric");

  // ---- 4. NO DEBATE COMPETENCY CLAIMS A DIRECT ROUND MEASURE --------------------------------------
  const direct = Object.entries(COMPETENCY_ROUND_MEASURE).filter(([, m]) => (m as { direct: boolean }).direct);
  assert.equal(direct.length, 0, `4. no Debate competency claims direct:true (found ${direct.map(([k]) => k).join(", ")})`);
  for (const key of ["claim-warrant-impact", "refutation", "clash", "signposting", "constructive-speech", "weighing"] as const) {
    const measure = COMPETENCY_ROUND_MEASURE[key] as { direct: boolean; directEvidence?: string };
    assert.equal(measure.direct, false, `4b. ${key} is not directly measured by a round`);
    assert.ok(measure.directEvidence && measure.directEvidence.length > 0,
      `4c. and ${key} names where its evidence actually lives`);
    assert.ok(!/transcript|ballot|round score/i.test(measure.directEvidence ?? ""),
      `4d. and ${key} does not name transcript scoring as its evidence`);
  }

  // ---- 5. THE PROVIDER PROSE LAYER IS NOT ASKED TO EXPLAIN A DECISION NOBODY MADE ------------------
  const ai = stripComments(read("lib/ai.ts"));
  assert.ok(/if \(base\.overallScore === undefined \|\| base\.teamWinner === undefined\) \{[\s\S]{0,120}?return base;/.test(ai),
    "5. judgeDebate skips the prose enhancement when there is no scored ballot");
  assert.ok(/Do NOT re-score and do NOT change the winner/.test(read("lib/ai.ts")),
    "5b. control: the prose contract still forbids the provider from scoring — it is not a scorer");

  // ---- 6. NO SUBSTANCE-GATE PATCH ----------------------------------------------------------------
  // The withdrawal must not be quietly reversed by a threshold that "proves" the score is valid
  // again. The existing nonSubstantive heuristic may stay for its own limited diagnostic role — it
  // failed precisely because it is a length gate — but it must not re-enable scoring.
  const returnBlock = analysis.slice(analysis.indexOf("  return {\n    // NO overallScore"));
  for (const banned of ["meaningfulWords", "markerCount", "countMarkers", "wordCount >", "sentenceCount"]) {
    assert.ok(!returnBlock.includes(banned),
      `6. the producer's return does not gate semantic output on ${banned}`);
  }

  console.log("  ok  unscored transcript judge: no ballot, no overall, no winner, no deltas, no direct claims");
  console.log("  ok  adversarial fixtures A-D: nonsense earns nothing, and the honest diagnostic still discriminates");
  console.log("judge-quality smoke passed.");
}

main();
