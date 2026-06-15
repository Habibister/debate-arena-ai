import assert from "node:assert/strict";
import { buildTranscriptBasedDebateJudge } from "../lib/debate-judge-analysis";

function judge(transcript: Array<{ role: "AFFIRMATIVE" | "NEGATIVE"; round: number; content: string }>, studentSide: "GOVERNMENT" | "OPPOSITION" = "GOVERNMENT") {
  return buildTranscriptBasedDebateJudge({
    organization: "DEBATE",
    eventType: "PARLIAMENTARY_DEBATE",
    level: "INTERMEDIATE",
    topic: "Schools should require financial literacy.",
    studentSide,
    transcript
  });
}

function category(result: ReturnType<typeof judge>, key: string) {
  const found = result.categoryScores.find((item) => item.key === key);

  assert.ok(found, `Missing category ${key}`);
  return found.score;
}

const vagueGovernmentSpecificOpposition = [
  {
    role: "AFFIRMATIVE" as const,
    round: 1,
    content: "We should do this because it is good. My opponent is wrong. Everyone knows students need things that help them."
  },
  {
    role: "NEGATIVE" as const,
    round: 2,
    content:
      "The government claims student voice solves fairness, but that does not answer enforcement because administrators still decide the final rule. A better safeguard is a clear appeal process with published standards. This outweighs symbolic input because it directly changes daily discipline and prevents uneven enforcement."
  }
];

const strongGovernmentGenericOpposition = [
  {
    role: "AFFIRMATIVE" as const,
    round: 1,
    content:
      "Schools should require financial literacy because students make budget, loan, and credit decisions before adulthood. For example, a student with a first credit card can avoid interest traps if they learn fees and repayment schedules. This benefit outweighs losing a small elective unit because debt can follow students for years."
  },
  {
    role: "NEGATIVE" as const,
    round: 2,
    content: "No, schools are already busy. My opponent is wrong and this is not a good idea."
  }
];

const directRefutationWithWeighing = [
  {
    role: "NEGATIVE" as const,
    round: 1,
    content:
      "Financial literacy wastes class time because schools already have too many graduation requirements, and adding one more course crowds out electives."
  },
  {
    role: "AFFIRMATIVE" as const,
    round: 2,
    content:
      "My opponent says class time is too limited, but that does not answer my mechanism because one semester can replace less practical electives. Financial literacy prevents debt; that outweighs small scheduling costs because the harm is long-term, more likely, and affects students after graduation."
  }
];

const oppositionWin = judge(vagueGovernmentSpecificOpposition);
assert.equal(oppositionWin.teamWinner, "OPPOSITION", "Opposition should beat vague Government with specific refutation and weighing.");

const governmentWin = judge(strongGovernmentGenericOpposition);
assert.equal(governmentWin.teamWinner, "GOVERNMENT", "Government should beat a generic Opposition response.");

const vagueStudent = judge([{ role: "AFFIRMATIVE", round: 1, content: "My opponent is wrong." }]);
assert.ok(category(vagueStudent, "warrant") < 55, "Bare assertion should receive a low warrant score.");
assert.ok(category(vagueStudent, "refutation") < 55, "Bare assertion should receive a low refutation score.");
assert.ok(category(vagueStudent, "clash") < 55, "Bare assertion should receive a low weighing/clash score.");

const specificStudent = judge(directRefutationWithWeighing, "GOVERNMENT");
assert.ok(category(specificStudent, "refutation") >= 65, "Specific answer should reward refutation.");
assert.ok(category(specificStudent, "clash") >= 65, "Specific comparison should reward weighing.");

const firstRun = judge(vagueGovernmentSpecificOpposition);
const secondRun = judge(vagueGovernmentSpecificOpposition);
assert.deepEqual(
  {
    winner: firstRun.teamWinner,
    governmentScore: firstRun.internalScoringSummary.governmentScore,
    oppositionScore: firstRun.internalScoringSummary.oppositionScore,
    rfd: firstRun.reasonForDecision
  },
  {
    winner: secondRun.teamWinner,
    governmentScore: secondRun.internalScoringSummary.governmentScore,
    oppositionScore: secondRun.internalScoringSummary.oppositionScore,
    rfd: secondRun.reasonForDecision
  },
  "Same debate should produce a consistent judge result."
);

assert.notEqual(
  oppositionWin.reasonForDecision,
  governmentWin.reasonForDecision,
  "Different transcripts should produce different ballot feedback."
);

console.log("Judge quality smoke tests passed.");
