import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Force the deterministic development fallback so we can test opponent generation without a live key.
Object.assign(process.env, { NODE_ENV: "development" });
delete process.env.OPENAI_API_KEY;

import { buildTranscriptBasedDebateJudge } from "../lib/debate-judge-analysis";
import { generateOpponentResponse } from "../lib/ai";
import { getAiPersona } from "../lib/ai-personas";
import { assessStudentSpeech, OPPONENT_COACHING_RESPONSE } from "../lib/speech-quality";
import { getProviderOrder, extractJson } from "../lib/ai-providers";
import { judgeDebate, mergeJudgeEnhancement } from "../lib/ai";
import { FLASHCARDS } from "../lib/study-content";

// Flashcard content quality (clear, beginner-friendly definitions; no mixed definition+strategy).
for (const card of FLASHCARDS) {
  // Test 2: no card starts with / leans on "Applying [term] means...".
  assert.ok(!/applying/i.test(card.definition), `Flashcard "${card.term}" definition must not use "Applying...": ${card.definition}`);
  // Test 4: the definition is a plain definition with no scenario language baked in.
  assert.ok(!/in a (hosa|deca) (scenario|roleplay)/i.test(card.definition), `Flashcard "${card.term}" definition must not contain scenario language.`);
  // Test 5: the quick check tests the actual term, and its answer is the definition.
  assert.equal(card.quickCheck, `What does ${card.term} mean?`, `Flashcard "${card.term}" quick check must test the term.`);
  assert.equal(card.quickCheckAnswer, card.definition, `Flashcard "${card.term}" answer must be its definition.`);
  assert.ok(card.beginnerExplanation.length > 0, `Flashcard "${card.term}" needs a beginner explanation.`);
}
// Test 1: every medical (HOSA) card starts with a real definition, not a generic template.
for (const card of FLASHCARDS.filter((c) => c.organization === "HOSA")) {
  assert.ok(!/is a key .* term every competitor/i.test(card.definition), `HOSA card "${card.term}" must have a real definition.`);
}
// Spot-check the spec's worked example.
const tachycardia = FLASHCARDS.find((c) => c.term === "tachycardia");
assert.equal(tachycardia?.definition, "An abnormally fast heart rate.", "Tachycardia must have the correct plain definition.");

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

const specificStudent = judge(directRefutationWithWeighing, "GOVERNMENT");
assert.ok(category(specificStudent, "refutation") >= 65, "Specific answer should reward refutation.");

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

// Class-rank fairness cases: empty debate jargon must not beat real argumentation.
function judgeClassRank(
  transcript: Array<{ role: "AFFIRMATIVE" | "NEGATIVE"; round: number; content: string }>,
  studentSide: "GOVERNMENT" | "OPPOSITION"
) {
  return buildTranscriptBasedDebateJudge({
    organization: "DEBATE",
    eventType: "PARLIAMENTARY_DEBATE",
    level: "INTERMEDIATE",
    topic: "This House believes schools should end class rankings.",
    studentSide,
    transcript
  });
}

const classRankGovernment = {
  role: "AFFIRMATIVE" as const,
  round: 1,
  content: "Class ranks are unfair because they increase anxiety and stress, and colleges usually do not care about class rank."
};

// Test 1: Opposition answers only with weighing buzzwords and must NOT win automatically.
const oppositionJargonOnly = judgeClassRank(
  [
    classRankGovernment,
    {
      role: "NEGATIVE",
      round: 2,
      content: "Even if the other side wins a small benefit, the judge should prefer clearer causation, lower risk, and stronger impact comparison."
    }
  ],
  "GOVERNMENT"
);
assert.equal(
  oppositionJargonOnly.teamWinner,
  "GOVERNMENT",
  "Empty debate jargon ('clearer causation, lower risk, impact comparison') must not beat a real (if imperfect) argument."
);
assert.ok(
  oppositionJargonOnly.judgeFairnessReport.emptyPhraseWarning,
  "Judge must flag the side that leaned on empty weighing language."
);

// Test 2: Opposition gives a real argument about optional/private rank and can win.
const oppositionRealArgument = judgeClassRank(
  [
    classRankGovernment,
    {
      role: "NEGATIVE",
      round: 2,
      content:
        "Class rank can create stress, but removing it completely also removes context for students who perform strongly in under-resourced schools. A better policy is optional or private rank reporting, so students are not publicly compared but can still use rank when it helps scholarships. This targets the harm because the real problem is public comparison, not the ranking itself."
    }
  ],
  "OPPOSITION"
);
assert.equal(
  oppositionRealArgument.teamWinner,
  "OPPOSITION",
  "A real opposition argument (optional/private rank reporting with a mechanism) can win."
);

// Test 4: "my opponent is wrong" must score very low on refutation.
const bareDenial = judgeClassRank([{ role: "AFFIRMATIVE", round: 1, content: "My opponent is wrong." }], "GOVERNMENT");
assert.ok(category(bareDenial, "refutation") < 50, "A bare denial must score very low on refutation.");

// Test 5: a clear claim with no warrant should be identifiable but underdeveloped.
const claimNoWarrant = judgeClassRank(
  [
    {
      role: "AFFIRMATIVE",
      round: 1,
      content: "Public class rank increases student stress and anxiety. It turns school into a constant comparison between classmates."
    }
  ],
  "GOVERNMENT"
);
assert.ok(category(claimNoWarrant, "argument") >= 50, "A clear claim should be identifiable.");
assert.ok(category(claimNoWarrant, "warrant") < 60, "A claim with no 'because'/mechanism should score low on warrant.");

// Test 6: an impact with no comparison should score the impact but flag missing weighing.
const impactNoWeighing = judgeClassRank(
  [
    {
      role: "AFFIRMATIVE",
      round: 1,
      content:
        "Public class rank harms students because it increases stress, which hurts their mental health, motivation, and long-term opportunity to enjoy learning."
    }
  ],
  "GOVERNMENT"
);
assert.ok(category(impactNoWeighing, "impact") >= 55, "A developed impact should score on impact.");

// Test 6 (paraphrase): a messy student speech must be paraphrased cleanly, not quoted verbatim.
const messySpeech = judgeClassRank(
  [
    {
      role: "AFFIRMATIVE",
      round: 1,
      content:
        "I am not exactly sure what the opposition is refering to however I still stand on my points AI helps with both mental and physical health adjusting a fitness training and study habits for students"
    }
  ],
  "GOVERNMENT"
);
assert.ok(
  !(messySpeech.transcriptFeedback?.strongestClaim ?? "").toLowerCase().includes("i am not exactly sure"),
  "Judge must paraphrase the student's idea, not quote the rambling hedge verbatim."
);
assert.ok(
  (messySpeech.transcriptFeedback?.strongestClaim ?? "").toLowerCase().includes("you argued that"),
  "Judge should frame the student's idea as a clean paraphrase."
);

// Rubric preservation (Test 6 of spec): all twelve rubric dimensions still calculate.
const rubricKeys = messySpeech.categoryScores.map((entry) => entry.key);
for (const key of [
  "argument",
  "warrant",
  "mechanism",
  "impact",
  "refutation",
  "contentEvidence",
  // "clash" (labelled "Weighing") was WITHDRAWN 2026-09-07 and must NOT come back: it was a marker
  // count that scored the Weighing lesson's own model answer at the floor and marker stuffing at the
  // ceiling. Its absence is asserted as a regression control in the W-block below.
  "collapse",
  "motionConnection",
  "emptyJargon",
  "sideFidelity",
  "centralClashResponse"
]) {
  assert.ok(rubricKeys.includes(key), `Rubric dimension "${key}" must still be scored.`);
}

// Central clash (spec's key judge logic): a polished-but-vague speech that never answers the other
// side's strongest argument must not win on polish.
const phoneBan = buildTranscriptBasedDebateJudge({
  organization: "DEBATE",
  eventType: "PARLIAMENTARY_DEBATE",
  level: "INTERMEDIATE",
  topic: "This House believes schools should ban phone use during instructional time.",
  studentSide: "GOVERNMENT",
  transcript: [
    {
      role: "NEGATIVE",
      round: 1,
      content:
        "Phones during instruction keep students safe: they can contact family in an emergency, record dangerous behavior, and reach help quickly when something goes wrong at school."
    },
    {
      role: "AFFIRMATIVE",
      round: 2,
      content: "Fairness has two sides. A principle that helps one group by harming another is not truly fair."
    }
  ]
});
assert.equal(
  phoneBan.teamWinner,
  "OPPOSITION",
  "A polished-but-vague Government that never answers the safety/emergency clash must not beat the side that engaged it."
);
assert.ok(
  category(phoneBan, "centralClashResponse") < 60,
  "The side that dodged the central clash should score low on central clash response."
);

// Test 1 + 3: the AI opponent must sound human and motion-specific, never a template.
const BANNED_OPPONENT_PHRASES = [
  "Negative speech",
  "Affirmative speech",
  "The key is direct clash",
  "First, direct clash",
  "Second, independent offense",
  "Finally, weighing",
  "independent offense",
  "Take your best point",
  "I'll grant it",
  "I'll even grant it",
  "The trouble is the link",
  "That's the step I need you to win",
  "Judge should prefer us",
  "This is my ballot story"
];

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function opponentSoundsHuman() {
  for (const personaId of ["evidence-specialist", "policy-analyst", "devils-advocate", "socratic-questioner", "starter-coach", "tournament-judge"]) {
    const persona = getAiPersona(personaId);
    const response = await generateOpponentResponse({
      organization: "DEBATE",
      level: "INTERMEDIATE",
      topic: "This House believes schools should teach practical AI literacy.",
      side: "NEGATIVE",
      round: 2,
      personaId,
      transcript: [
        {
          role: "AFFIRMATIVE",
          round: 1,
          content: "Schools should teach AI literacy because students are going to use AI anyway and need to use it responsibly."
        }
      ]
    });

    for (const phrase of BANNED_OPPONENT_PHRASES) {
      assert.ok(
        !response.response.toLowerCase().includes(phrase.toLowerCase()),
        `AI opponent (${personaId}) must not use template phrase "${phrase}".`
      );
    }

    // Length scales with strength tier (tested precisely in difficultyScales); here just require a
    // real, developed response within a sane range.
    const count = wordCount(response.response);
    assert.ok(count >= 30 && count <= 220, `AI opponent (${personaId}) should be a real developed response (was ${count} words).`);
    assert.ok(
      response.response.toLowerCase().includes("ai") || response.response.toLowerCase().includes("literacy"),
      `AI opponent (${personaId}) should engage the actual motion.`
    );
  }
}

// Provider priority + cost mode (offline: only reads env, never calls the network).
function providerOrderWith(env: Record<string, string | undefined>): string[] {
  const keys = ["GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_KEY", "AI_COST_MODE", "AI_PROVIDER"];
  const saved: Record<string, string | undefined> = {};
  for (const key of keys) {
    saved[key] = process.env[key];
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  try {
    return getProviderOrder();
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

// Test 1/2: Gemini is preferred when present; priority is Gemini -> Groq -> OpenRouter.
assert.deepEqual(providerOrderWith({ GEMINI_API_KEY: "gemini-live" }), ["gemini"], "Gemini key alone -> gemini.");
assert.deepEqual(
  providerOrderWith({ GEMINI_API_KEY: "gemini-live", GROQ_API_KEY: "groq-live", OPENROUTER_API_KEY: "or-live", OPENAI_API_KEY: "oai-live" }),
  ["gemini", "groq", "openrouter"],
  "free_only default: priority Gemini -> Groq -> OpenRouter, and paid OpenAI excluded."
);
// Test 3: free_only must never call paid OpenAI, even if it is the only key.
assert.deepEqual(providerOrderWith({ OPENAI_API_KEY: "oai-live" }), [], "free_only with only OpenAI -> no provider (fallback).");
assert.deepEqual(providerOrderWith({ OPENAI_API_KEY: "oai-live", AI_COST_MODE: "allow_paid" }), ["openai"], "allow_paid lets OpenAI run.");
assert.deepEqual(
  providerOrderWith({ GEMINI_API_KEY: "gemini-live", OPENAI_API_KEY: "oai-live", AI_COST_MODE: "allow_paid" }),
  ["gemini", "openai"],
  "allow_paid keeps free-first priority, then OpenAI."
);
// AI_PROVIDER pins to a single provider.
assert.deepEqual(
  providerOrderWith({ GEMINI_API_KEY: "gemini-live", GROQ_API_KEY: "groq-live", AI_PROVIDER: "groq" }),
  ["groq"],
  "AI_PROVIDER=groq pins to Groq."
);
// A placeholder key is treated as unconfigured.
assert.deepEqual(providerOrderWith({ GEMINI_API_KEY: "your-gemini-key" }), [], "Placeholder Gemini key is ignored.");

// Round-deciding clash (Tests 1 & 4): the judge proves it read the full transcript.
const sugarJudge = buildTranscriptBasedDebateJudge({
  organization: "DEBATE",
  eventType: "PARLIAMENTARY_DEBATE",
  level: "INTERMEDIATE",
  topic: "This house believes the government should reduce sugar consumption.",
  studentSide: "GOVERNMENT",
  transcript: [
    {
      role: "AFFIRMATIVE",
      round: 1,
      content:
        "The government should reduce sugar because education alone is not enough; social media and food marketing overpower individual choices, so sugar consumption and diabetes keep rising."
    },
    {
      role: "NEGATIVE",
      round: 2,
      content:
        "Broad government mandates may backfire, restrict choice, and create black markets; targeted subsidies for healthy food plus clear labeling and education solve the same problem with far less risk because they change incentives without banning anything."
    }
  ]
});
assert.equal(sugarJudge.teamWinner, "OPPOSITION", "Opposition wins the sugar debate with the clearer less-restrictive alternative.");
const sugarClash = sugarJudge.roundDecidingClash;
assert.ok(sugarClash?.governmentBestArgument && sugarClash.governmentBestArgument.length > 10, "Round-deciding clash cites Government's best argument.");
assert.ok(sugarClash?.oppositionBestAnswer && sugarClash.oppositionBestAnswer.length > 10, "Round-deciding clash cites Opposition's best answer.");
assert.ok(sugarClash?.whyItDecides && /opposition/i.test(sugarClash.whyItDecides), "Round-deciding clash explains why Opposition wins.");

// Test 5 (paraphrase): a messy Government speech is paraphrased cleanly in the clash, not quoted raw.
const messyClash = buildTranscriptBasedDebateJudge({
  organization: "DEBATE",
  eventType: "PARLIAMENTARY_DEBATE",
  level: "INTERMEDIATE",
  topic: "This house believes the government should reduce sugar consumption.",
  studentSide: "GOVERNMENT",
  transcript: [
    { role: "AFFIRMATIVE", round: 1, content: "i am not exactly sure what the opposition is saying however sugar is bad and the government should reduce it because diabetes" },
    { role: "NEGATIVE", round: 2, content: "Targeted subsidies and labeling reduce sugar with less risk than a broad mandate, because they change incentives without banning choice." }
  ]
});
assert.ok(
  !(messyClash.roundDecidingClash?.governmentBestArgument ?? "").toLowerCase().includes("i am not exactly sure"),
  "The round-deciding clash paraphrases messy text cleanly."
);

// Crash-proof judge: robust JSON extraction.
// Test 1: valid JSON parses.
assert.deepEqual(extractJson<{ shortReason: string }>('{"shortReason":"Gov wins."}'), { shortReason: "Gov wins." }, "Valid JSON parses.");
// Test 2: markdown/code-fence-wrapped JSON parses.
assert.deepEqual(extractJson<{ a: number }>("```json\n{\"a\":1}\n```"), { a: 1 }, "Fenced JSON parses.");
// JSON embedded in prose is recovered.
assert.deepEqual(extractJson<{ a: number }>('Here is the ballot: {"a":1} — hope it helps!'), { a: 1 }, "JSON embedded in prose is recovered.");
// Test 3: pure prose / malformed throws (the judge then falls back to the local rubric).
assert.throws(() => extractJson("Gov clearly won, no JSON here."), "Prose without JSON throws so the judge can fall back.");

// Test 5: a provider enhancement with MISSING fields fills the rest from the local rubric ballot.
const judgeBase = buildTranscriptBasedDebateJudge({
  organization: "DEBATE",
  eventType: "PARLIAMENTARY_DEBATE",
  level: "INTERMEDIATE",
  topic: "This house believes dress codes should be implemented in schools.",
  studentSide: "GOVERNMENT",
  transcript: [
    { role: "AFFIRMATIVE", round: 1, content: "Dress codes should be implemented because clear standards reduce daily distraction and conflict over clothing." },
    { role: "NEGATIVE", round: 2, content: "Dress codes are unevenly enforced and police students instead of improving learning, so we should not adopt them." }
  ]
}) as Parameters<typeof mergeJudgeEnhancement>[0];

const mergedPartial = mergeJudgeEnhancement(judgeBase, { shortReason: "Government edged it on clearer benefits." }, "gemini");
assert.ok(mergedPartial, "Partial enhancement with one usable field still merges.");
assert.equal(mergedPartial!.shortReasonForDecision, "Government edged it on clearer benefits.", "Provided field overrides the local one.");
assert.equal(mergedPartial!.teamWinner, judgeBase.teamWinner, "Winner stays from the local rubric ballot.");
assert.ok(Array.isArray(mergedPartial!.categoryScores) && mergedPartial!.categoryScores.length >= 12, "Full rubric category scores are preserved through the merge.");
assert.ok(mergedPartial!.judgeFairnessReport?.motionConnection, "Missing enhancement fields are filled from the local ballot.");
// An enhancement with no usable fields returns null so the caller keeps the local ballot.
assert.equal(mergeJudgeEnhancement(judgeBase, {}, "gemini"), null, "Empty enhancement -> keep local ballot.");

// Tests 6/7: with no provider configured, the judge still returns a complete ballot (never a 500),
// with the full 12-dimension rubric intact.
async function judgeIsCrashProof() {
  const ballot = await judgeDebate({
    organization: "DEBATE",
    level: "INTERMEDIATE",
    topic: "This house believes dress codes should be implemented in schools.",
    studentSide: "GOVERNMENT",
    transcript: [
      { role: "AFFIRMATIVE", round: 1, content: "Dress codes should be implemented because clear standards reduce daily distraction and conflict over clothing." },
      { role: "NEGATIVE", round: 2, content: "Dress codes are unevenly enforced and police students instead of improving learning, so we should not adopt them." }
    ]
  });
  assert.ok(ballot.teamWinner === "GOVERNMENT" || ballot.teamWinner === "OPPOSITION", "Judge always returns a winner.");
  assert.ok(typeof ballot.shortReasonForDecision === "string" && ballot.shortReasonForDecision.length > 0, "Judge always returns a short reason.");
  const keys = ballot.categoryScores.map((entry) => entry.key);
  for (const key of [
    "argument",
    "warrant",
    "mechanism",
    "impact",
    "refutation",
    "contentEvidence",
    // "clash"/"Weighing" withdrawn 2026-09-07 — see the W-block regression controls.
    "collapse",
    "motionConnection",
    "emptyJargon",
    "sideFidelity",
    "centralClashResponse"
  ]) {
    assert.ok(keys.includes(key), `Full rubric dimension "${key}" survives the crash-proof judge.`);
  }
}

function judgeSpeech(topic: string, role: "AFFIRMATIVE" | "NEGATIVE", content: string) {
  return buildTranscriptBasedDebateJudge({
    organization: "DEBATE",
    eventType: "PARLIAMENTARY_DEBATE",
    level: "INTERMEDIATE",
    topic,
    studentSide: role === "AFFIRMATIVE" ? "GOVERNMENT" : "OPPOSITION",
    transcript: [{ role, round: 1, content }]
  });
}

// Test 5: the judge must penalize a side whose speech argues the WRONG side.
const invertedGovernment = judgeSpeech(
  "This house believes dress codes should be implemented in schools.",
  "AFFIRMATIVE",
  "Dress codes should not be implemented because they are unfair, unevenly enforced, and focus on controlling students instead of improving learning."
);
assert.ok(
  category(invertedGovernment, "sideFidelity") < 30,
  "A Government speech that opposes the motion must score very low on side fidelity."
);

// Tests 1-4: the AI opponent must argue its assigned side (Government defends, Opposition opposes).
const SUPPORT_DEFEND = /i'?ll defend|i will defend|i am defending|happy to defend/i;
const OPPOSE_TELLS = /should not be implemented|a narrower fix|smaller, testable version|what'?s the actual evidence/i;

async function sideFidelityTests() {
  const cases: Array<{ motion: string; side: "AFFIRMATIVE" | "NEGATIVE" }> = [
    { motion: "This house believes dress codes should be implemented in schools.", side: "AFFIRMATIVE" },
    { motion: "This house believes dress codes should be implemented in schools.", side: "NEGATIVE" },
    { motion: "This house believes schools should ban phone use during instructional time.", side: "AFFIRMATIVE" },
    { motion: "This house believes schools should ban phone use during instructional time.", side: "NEGATIVE" }
  ];

  for (const testCase of cases) {
    const speech = await generateOpponentResponse({
      organization: "DEBATE",
      level: "INTERMEDIATE",
      topic: testCase.motion,
      side: testCase.side,
      round: 1,
      personaId: "evidence-specialist",
      transcript: []
    });
    const judged = judgeSpeech(testCase.motion, testCase.side, speech.response);

    assert.ok(
      category(judged, "sideFidelity") >= 50,
      `AI ${testCase.side} speech must argue its assigned side (side fidelity was ${category(judged, "sideFidelity")}).`
    );

    if (testCase.side === "AFFIRMATIVE") {
      assert.ok(SUPPORT_DEFEND.test(speech.response), "A Government/Affirmative speech must defend the motion.");
      assert.ok(!OPPOSE_TELLS.test(speech.response), "A Government/Affirmative speech must not argue the Opposition's case.");
    } else {
      assert.ok(!SUPPORT_DEFEND.test(speech.response), "An Opposition/Negative speech must not defend the motion.");
    }
  }
}

// Non-substantive speech guardrail.
// Test 1: "n" is not a submittable speech.
assert.ok(!assessStudentSpeech("n").ok, '"n" must be blocked as non-substantive.');
// Test 2: "phones bad" is not a submittable speech.
assert.ok(!assessStudentSpeech("phones bad").ok, '"phones bad" must be blocked as non-substantive.');
// Test 3: a real 2-3 sentence argument is allowed.
assert.ok(
  assessStudentSpeech(
    "Dress codes should be implemented because they reduce distractions and set clear expectations for students. They must be enforced fairly so the policy helps rather than targets anyone."
  ).ok,
  "A real 2-3 sentence argument must be allowed."
);
// Beginner mode allows shorter speeches but still requires a claim.
assert.ok(assessStudentSpeech("Phones should be banned because they distract students", "BEGINNER").ok, "Beginner: a short real claim is allowed.");
assert.ok(!assessStudentSpeech("phones bad", "BEGINNER").ok, "Beginner: nonsense is still blocked.");

// Test 5: the judge scores a nonsense speech very low and explains why.
const nonsenseJudged = buildTranscriptBasedDebateJudge({
  organization: "DEBATE",
  eventType: "PARLIAMENTARY_DEBATE",
  level: "INTERMEDIATE",
  topic: "This house believes dress codes should be implemented in schools.",
  studentSide: "GOVERNMENT",
  transcript: [
    { role: "AFFIRMATIVE", round: 1, content: "n" },
    {
      role: "NEGATIVE",
      round: 2,
      content: "Dress codes should not be implemented because they are unevenly enforced and focus on controlling students rather than improving learning."
    }
  ]
});
assert.ok(category(nonsenseJudged, "argument") < 20, "A nonsense speech must score very low on claim.");
assert.ok(category(nonsenseJudged, "warrant") < 20, "A nonsense speech must score very low on warrant.");
const nonsenseArgReason = nonsenseJudged.categoryScores.find((entry) => entry.key === "argument")?.reason ?? "";
assert.ok(/too short or unclear/i.test(nonsenseArgReason), "The judge must explain that the speech was too short or unclear.");

// Test 4: if the backend is handed a nonsense student speech, the opponent coaches instead of debating.
async function guardrailTests() {
  const coaching = await generateOpponentResponse({
    organization: "DEBATE",
    level: "INTERMEDIATE",
    topic: "This house believes dress codes should be implemented in schools.",
    side: "NEGATIVE",
    round: 2,
    personaId: "evidence-specialist",
    transcript: [{ role: "AFFIRMATIVE", round: 1, content: "n" }]
  });
  assert.equal(coaching.response, OPPONENT_COACHING_RESPONSE, "A nonsense student speech must get a coaching response, not a full opponent speech.");
}

// Test 3: same strength, different persona -> meaningfully different debating shapes.
async function personaStylesAreDistinct() {
  const topic = "This house believes the government should reduce sugar consumption.";
  const transcript = [
    { role: "AFFIRMATIVE" as const, round: 1, content: "The government should reduce sugar because it causes diabetes and shortens lifespan for many people." }
  ];
  async function opp(personaId: string) {
    const r = await generateOpponentResponse({ organization: "DEBATE", level: "INTERMEDIATE", topic, side: "NEGATIVE", round: 1, personaId, transcript });
    return r.response;
  }

  const socratic = await opp("socratic-questioner");
  const evidence = await opp("evidence-specialist");
  const policy = await opp("policy-analyst");
  const devils = await opp("devils-advocate");
  const friendly = await opp("friendly-practice");

  assert.ok(socratic.includes("?"), "Socratic Questioner asks questions.");
  assert.ok(/evidence|proof|data|study/i.test(evidence), "Evidence Specialist demands proof.");
  assert.ok(/mechanism|tax|subsid|regulat|enforce|implement|policy memo/i.test(policy), "Policy Analyst talks implementation.");
  assert.ok(/assum/i.test(devils), "Devil's Advocate attacks assumptions.");
  assert.ok(/instinct|gently/i.test(friendly), "Friendly Practice is supportive.");
  assert.equal(new Set([socratic, evidence, policy, devils, friendly]).size, 5, "All five personas produce distinct responses.");
}

// Test 2: same persona, different strength -> obviously different depth/length.
async function difficultyScales() {
  const topic = "This house believes the government should reduce sugar consumption.";
  const transcript = [
    { role: "AFFIRMATIVE" as const, round: 1, content: "The government should reduce sugar because it causes diabetes and shortens lifespan." }
  ];
  const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const beginner = await generateOpponentResponse({ organization: "DEBATE", level: "BEGINNER", topic, side: "NEGATIVE", round: 1, personaId: "policy-analyst", transcript });
  const elite = await generateOpponentResponse({ organization: "DEBATE", level: "ELITE", topic, side: "NEGATIVE", round: 1, personaId: "policy-analyst", transcript });
  const beginnerWords = words(beginner.response);
  const eliteWords = words(elite.response);
  assert.ok(beginnerWords < eliteWords, `Beginner (${beginnerWords}w) should be shorter than Elite (${eliteWords}w).`);
  assert.ok(eliteWords >= beginnerWords * 1.8, `Elite (${eliteWords}w) should be substantially deeper than Beginner (${beginnerWords}w).`);
}


// ---- M14 Phase 1d (audit G21): speaker cards name only REAL participants ------------------------
// A round has exactly two participants — the student and one opponent. The old builder fabricated
// four ranked speakers ("Government 1/2", "Opposition 1/2") from two sides' aggregate metrics.
// These tests run the REAL deterministic judge, not a mock.
async function speakerCardTests() {
  const { readFileSync } = await import("node:fs");
  const speech = (role: "AFFIRMATIVE" | "NEGATIVE", round: number, content: string) => ({ role, round, content });
  const twoSided = [
    speech("AFFIRMATIVE", 1, "Schools should require financial literacy because students graduate into debt decisions they were never taught to make, so mandatory classes reduce lifelong financial harm."),
    speech("NEGATIVE", 1, "Requiring financial literacy crowds out electives that keep students engaged, because timetables are fixed, so the requirement harms the students it means to help."),
    speech("AFFIRMATIVE", 2, "The harm outweighs electives: a missed elective lasts a term, while an unmanaged loan compounds for decades, so the requirement wins on scale and permanence."),
    speech("NEGATIVE", 2, "Engagement is the mechanism for all learning; disengaged students learn no finance anyway, so protecting electives better serves the same goal.")
  ];

  // P1d-1. A two-participant round produces EXACTLY two cards, one per side, each side once.
  const ballot = judge(twoSided);
  const cards = ballot.speakerScores;
  assert.equal(cards.length, 2, "P1d-1. a two-participant round yields exactly two speaker cards");
  assert.deepEqual(cards.map((c) => c.team), ["GOVERNMENT", "OPPOSITION"],
    "P1d-1b. cards follow the real round order — Government/Affirmative first — one card per side");

  // P1d-2. Identity is server-derived: the labels are the shared side labels, nothing invented.
  assert.equal(cards[0].speaker, "Government/Affirmative", "P1d-2. the Government card carries the server label");
  assert.equal(cards[1].speaker, "Opposition/Negative", "P1d-2b. the Opposition card carries the server label");
  const BANNED = /\b(Government|Opposition)\s*[1-4]\b|\bSpeaker\s*\d\b/;
  for (const card of cards) {
    assert.ok(!BANNED.test(card.speaker), `P1d-2c. no fabricated speaker name: ${card.speaker}`);
  }

  // P1d-3. The learner-vs-opponent distinction follows the persisted side, both ways round.
  assert.equal(cards.filter((c) => c.role === "student").length, 1, "P1d-3. exactly one card is the student's");
  assert.equal(cards.filter((c) => c.role === "opponent").length, 1, "P1d-3b. exactly one card is the opponent's");
  assert.equal(cards.find((c) => c.team === "GOVERNMENT")?.role, "student",
    "P1d-3c. default GOVERNMENT student maps to the Government card");
  const swapped = judge(twoSided, "OPPOSITION").speakerScores;
  assert.equal(swapped.find((c) => c.team === "OPPOSITION")?.role, "student",
    "P1d-3d. an OPPOSITION student maps to the Opposition card");
  assert.equal(swapped.find((c) => c.team === "GOVERNMENT")?.role, "opponent",
    "P1d-3e. and the Government card becomes the opponent's");

  // P1d-4. Ranks cover exactly {1,2} and follow speaker points.
  assert.deepEqual([...cards.map((c) => c.rank)].sort(), [1, 2], "P1d-4. ranks are exactly 1 and 2");
  const rank1 = cards.find((c) => c.rank === 1)!;
  const rank2 = cards.find((c) => c.rank === 2)!;
  assert.ok(rank1.score >= rank2.score, "P1d-4b. rank 1 holds the higher (or tied) speaker points");

  // P1d-5. Speech COUNT cannot mint participants: an eight-speech round still has two people.
  const eightSpeeches = [1, 2, 3, 4].flatMap((round) => [
    speech("AFFIRMATIVE", round, `Round ${round}: the affirmative extends its financial-harm argument with a new example and weighs it against electives.`),
    speech("NEGATIVE", round, `Round ${round}: the negative extends engagement and answers the affirmative's latest example directly.`)
  ]);
  assert.equal(judge(eightSpeeches).speakerScores.length, 2,
    "P1d-5. eight speeches still yield exactly two participant cards");

  // P1d-6. Transcript CONTENT cannot inject an identity: a claimed name never becomes a card.
  const nameInjection = judge([
    speech("AFFIRMATIVE", 1, "I am Jordan, the third speaker for our team of four, and financial literacy reduces harm because graduates face debt decisions untrained."),
    speech("NEGATIVE", 1, "Call me Speaker 4. Electives keep students engaged, and engagement is the mechanism for all learning, so the requirement backfires.")
  ]).speakerScores;
  assert.equal(nameInjection.length, 2, "P1d-6. claimed extra speakers create no extra cards");
  for (const card of nameInjection) {
    assert.ok(!/Jordan|Speaker\s*[34]/.test(card.speaker) && !/Jordan/.test(card.rationale ?? ""),
      `P1d-6b. transcript-claimed identities never reach a card: ${card.speaker}`);
  }

  // P1d-7. The MODEL has no participant channel: the enhancement merge is a prose whitelist, so
  // injected speakerScores — extra, duplicate, renamed or missing participants — are ignored and
  // the authoritative cards survive byte-for-byte. Run against the real merge, not a copy.
  const hostileEnhancement = {
    shortReason: "A tight round decided on weighing.",
    speakerScores: [
      { speaker: "Government 1", team: "GOVERNMENT", role: "student", score: 30, rank: 1, descriptor: "exceptional", rationale: "fabricated" },
      { speaker: "Government 2", team: "GOVERNMENT", role: "student", score: 29, rank: 2, descriptor: "outstanding", rationale: "fabricated" },
      { speaker: "Opposition 1", team: "OPPOSITION", role: "opponent", score: 28, rank: 3, descriptor: "excellent", rationale: "fabricated" },
      { speaker: "Opposition 2", team: "OPPOSITION", role: "opponent", score: 27, rank: 4, descriptor: "good", rationale: "fabricated" }
    ],
    teamWinner: "OPPOSITION"
  };
  const merged = mergeJudgeEnhancement(ballot as never, hostileEnhancement as never, "gemini" as never);
  assert.ok(merged, "P1d-7. the merge accepted the usable prose field");
  assert.deepEqual(merged!.speakerScores, ballot.speakerScores,
    "P1d-7b. injected model speaker cards are ignored — the authoritative cards survive unchanged");
  assert.equal(merged!.teamWinner, ballot.teamWinner,
    "P1d-7c. the model cannot flip the winner either");
  assert.equal(merged!.speakerScores.length, 2, "P1d-7d. still exactly two cards after the merge");

  // P1d-8. And a prose-free enhancement is rejected outright (null), which the judge flow treats as
  // the labeled local-fallback path — never a fabricated success.
  assert.equal(mergeJudgeEnhancement(ballot as never, { speakerScores: hostileEnhancement.speakerScores } as never, "gemini" as never), null,
    "P1d-8. an enhancement with no usable prose merges to null");

  // ---- Non-vacuous controls ----------------------------------------------------------------------
  // C1: a fabricated four-card roster IS caught by the exact checks above.
  const fabricatedFour = [
    ...cards,
    { ...cards[0], speaker: "Government 2" },
    { ...cards[1], speaker: "Opposition 2" }
  ];
  assert.notEqual(fabricatedFour.length, 2, "P1d-C1. control: the padded roster fails the two-card check");
  assert.ok(fabricatedFour.some((c) => BANNED.test(c.speaker)),
    "P1d-C1b. control: the banned-name scan catches a fabricated card");
  // C2: duplicating one participant to fill a template IS caught by the one-card-per-side check.
  const duplicated = [cards[0], { ...cards[0] }];
  assert.notDeepEqual(duplicated.map((c) => c.team), ["GOVERNMENT", "OPPOSITION"],
    "P1d-C2. control: a duplicated participant fails the per-side check");
  // C3: the SOURCE scan strips comments — the builder's comment explains the old fabrication in
  // prose, so the raw source mentions the banned names while the stripped code does not.
  const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
  const analysisRaw = readFileSync("lib/debate-judge-analysis.ts", "utf8");
  assert.ok(/Government 1\/2/.test(analysisRaw), "P1d-C3. control: the raw source mentions the old names in prose");
  const analysisCode = strip(analysisRaw);
  assert.ok(!/"Government [1-4]"|"Opposition [1-4]"|"Speaker \d"/.test(analysisCode),
    "P1d-C3b. no fabricated speaker-name literal survives in code");
  assert.ok(!/rank[^)]{0,40}as 1 \| 2 \| 3 \| 4/.test(analysisCode),
    "P1d-C3c. the fixed four-rank cast is gone");
  assert.ok(!strip('// "Government 1"\n/* "Speaker 3" */').includes("Government 1"),
    "P1d-C3d. control: the stripper removes both comment styles");
}

// ==================================================================================================
// SIGNPOSTING MEASURE WITHDRAWAL (2026-09-06). The judge scored "organization" as
// clamp(38 + markers*11 + ...) over twelve substrings, and the same count also fed claimClarity (+3)
// and style (+5). Measured against the Signposting lesson's own material it was INVERTED, not weak:
// the lesson's model answer scored 57, the label the lesson calls WRONG scored 73, ordinal stuffing
// with no navigation scored 95, and appending marker words to unchanged substance moved a speech
// from 40 to 100. The measure is withdrawn rather than tuned. These fixtures are the acceptance gate
// and they are COMPONENT-WISE: an overall score that happens to match is not proof, because two
// compensating changes could leave overall equal while an intermediate score is still contaminated.
// ==================================================================================================
function markerStuffingBuysNothing() {
  const SUBSTANCE = "The reserves they cite are already committed elsewhere, so the money is not available for this programme, and the district would have to cut something already running to find it. That is the trade they have not costed.";
  // MINIMAL PAIR. The two tails are the same length, the same word count and the same punctuation
  // shape; only one is built from the twelve substrings the withdrawn proxy counted. Any difference
  // between these two ballots is attributable to the MARKERS and to nothing else — appending plain
  // text also moves the length and claim-count terms, which legitimately read what a speaker said.
  const MARKER_TAIL = " First, second, third, on the point, my first contention, the voter, finally, to start.";
  const NEUTRAL_TAIL = " Alpha, bravo, charlie, in a place, our early section, the ballot, lastly, to begin.";
  assert.equal(MARKER_TAIL.split(/\s+/).length, NEUTRAL_TAIL.split(/\s+/).length,
    "J-0. control: the minimal pair differs in wording only, not in length");
  const speech = (content: string) => [
    { role: "AFFIRMATIVE" as const, round: 1, content },
    { role: "NEGATIVE" as const, round: 1, content: "The reserves are uncommitted and the programme pays for itself within two years, because the maintenance line already funds it." }
  ];
  const marked = judge(speech(SUBSTANCE + MARKER_TAIL));
  const neutral = judge(speech(SUBSTANCE + NEUTRAL_TAIL));
  const gov = (r: ReturnType<typeof judge>) => r.speakerScores.find((x) => x.team === "GOVERNMENT" && x.role === "student")!;

  // 1. The withdrawn category is ABSENT from the ballot — not zero, not renormalised, not renamed.
  for (const [label, result] of [["marker", marked], ["neutral", neutral]] as const) {
    assert.equal(result.categoryScores.find((c) => c.key === "organization"), undefined,
      `J-1 ${label}. the organization category is absent from the ballot — withdrawn, never a substitute number`);
    assert.equal(result.categoryScores.find((c) => c.key === "signposting"), undefined,
      `J-1b ${label}. and no replacement signposting category appeared`);
    assert.equal(result.sharedSpeaking.organization, undefined,
      `J-1c ${label}. sharedSpeaking carries no organization value either`);
  }

  // 2. COMPONENT-WISE. Marker words buy nothing anywhere, not merely nothing on the total.
  const cat = (r: ReturnType<typeof judge>, key: string) => r.categoryScores.find((c) => c.key === key)!.score;
  assert.equal(cat(marked, "argument"), cat(neutral, "argument"),
    `J-2. claim clarity is identical with and without the markers (${cat(neutral, "argument")})`);
  assert.equal(cat(marked, "delivery"), cat(neutral, "delivery"),
    `J-3. style is identical (${cat(neutral, "delivery")})`);
  assert.equal(marked.sharedSpeaking.clarity, neutral.sharedSpeaking.clarity, "J-4. sharedSpeaking.clarity is identical");
  assert.equal(marked.sharedSpeaking.confidence, neutral.sharedSpeaking.confidence,
    "J-5. sharedSpeaking.confidence is identical — it used to average the withdrawn score in");
  assert.equal(gov(marked).score, gov(neutral).score, `J-6. speaker points are identical (${gov(neutral).score})`);
  assert.equal(marked.overallScore, neutral.overallScore, `J-7. the overall score is identical (${neutral.overallScore})`);
  assert.equal(marked.teamWinner, neutral.teamWinner, "J-8. and the winner is unchanged");
  assert.deepEqual(marked.categoryScores.map((c) => [c.key, c.score]), neutral.categoryScores.map((c) => [c.key, c.score]),
    "J-8b. EVERY emitted category is identical — no intermediate score is still contaminated");

  // 3. The inversion is gone: the label the lesson calls WRONG can no longer outscore the one it
  //    calls RIGHT on any emitted category, because neither is read any more.
  const RIGHT = "On their cost argument, the plan is cheaper than they claim, because the maintenance line already funds it.";
  const WRONG = "On their second point, the plan is cheaper than they claim, because the maintenance line already funds it.";
  const right = judge(speech(RIGHT));
  const wrong = judge(speech(WRONG));
  for (const c of right.categoryScores) {
    const other = wrong.categoryScores.find((x) => x.key === c.key);
    assert.ok(other && other.score <= c.score,
      `J-9. ${c.key}: the label the lesson calls wrong (${other?.score}) does not beat the one it calls right (${c.score})`);
  }
  assert.ok(wrong.overallScore <= right.overallScore, "J-9b. and not on the overall either");

  // 4. NOT MEASURED is not MEASURED POORLY: nothing may read a low score, a retry or a readiness
  //    penalty out of the category's absence.
  // Readiness was WITHDRAWN with the weighing measure it depended on (see the W-block). It is absent
  // on every transcript ballot now, so markers cannot move it — there is nothing left to move.
  const readinessOf = (r: unknown) => (r as { readinessForNextLevel?: unknown }).readinessForNextLevel;
  assert.equal(readinessOf(neutral), undefined, "J-10. readiness is absent, not false");
  assert.equal(readinessOf(marked), undefined, "J-10b. and absent for the marked pair too");

  // 5. WEIGHTS still sum to 1.00 after BOTH redistributions — organization (0.04, 2026-09-06) and
  //    weighing (0.12, 2026-09-07) — asserted on the source rather than on a rendered number.
  const src = readFileSync("lib/debate-judge-analysis.ts", "utf8");
  const weights = [...src.matchAll(/scores\.\w+ \* \((0\.\d+) \/ 0\.84\)/g)].map((m) => Number(m[1]));
  assert.equal(weights.length, 11, "J-11. eleven categories carry the overall weight");
  const total = weights.reduce((a, b) => a + b, 0) / 0.84;
  assert.ok(Math.abs(total - 1) < 1e-9, `J-11b. and they sum to exactly 1.00 (${total})`);
  assert.ok(!/scores\.organization/.test(src), "J-11c. no formula reads the withdrawn score");
  assert.ok(!/signpost \* \d/.test(src), "J-12. and the marker count reaches no formula at all");

  // 6. SHARED PATH. Model UN, Mock Trial and Public Speaking fall through to this same judge.
  for (const organization of ["MODEL_UN", "MOCK_TRIAL", "PUBLIC_SPEAKING"] as const) {
    const base = { eventType: "PARLIAMENTARY_DEBATE" as const, level: "INTERMEDIATE" as const,
      topic: "Schools should require financial literacy.", studentSide: "GOVERNMENT" as const };
    const sharedMarked = buildTranscriptBasedDebateJudge({ ...base, organization, transcript: speech(SUBSTANCE + MARKER_TAIL) });
    const sharedNeutral = buildTranscriptBasedDebateJudge({ ...base, organization, transcript: speech(SUBSTANCE + NEUTRAL_TAIL) });
    assert.equal(sharedMarked.categoryScores.find((c) => c.key === "organization"), undefined,
      `J-13 ${organization}. the category is absent on the shared path too`);
    assert.equal(sharedMarked.overallScore, sharedNeutral.overallScore,
      `J-13b ${organization}. and markers buy nothing there either`);
  }
  console.log("  ok  signposting measure withdrawal: absent, uncontaminated, component-wise");
}

/**
 * W. WEIGHING MEASURE WITHDRAWAL (2026-09-07). The transcript judge scored `weighing` as
 * `24 + markerCount * 18` over WEIGHING_MARKERS. Measured on matched transcripts it gave the
 * Weighing lesson's OWN model answer 24 — the floor, identical to attempting no weighing at all —
 * and gave lens words with no comparison 100. The lesson teaches the opposite in as many words:
 * "the skill is making the comparison clear, not saying the lens words".
 *
 * Unlike the signposting proxy this one was load-bearing: 0.12 of the overall, a 1.35 winner
 * tiebreak term, a third of sharedSpeaking.persuasion, one of three readiness gates, a persisted
 * rating delta, a second persisted identity as Debate.persuasionScore, and a lesson recommendation.
 * These controls are REGRESSION controls: each one fails if a piece of that proxy returns.
 */
{
  const base = { organization: "DEBATE" as const, eventType: "PARLIAMENTARY_DEBATE" as const,
    level: "INTERMEDIATE" as const, topic: "Schools should require AI literacy.", studentSide: "GOVERNMENT" as const };
  const BODY = "The AI literacy requirement teaches students in schools to check what a machine tells them. The district that ran the training last year reported fewer unattributed submissions afterwards, because students who know what the tool does stop hiding that they used it. Teachers report the lessons fit inside the existing school timetable, so the requirement costs the class time the other side is worried about only once.";
  const OPP = "The AI literacy requirement in schools takes class time from subjects that already have too little. Teachers in the district said the training displaced two weeks of the timetable, and schools already behind cannot absorb that.";
  // The lesson's own worked example: a weighing standard, argued for, applied to both sides. It
  // contains almost none of WEIGHING_MARKERS, which is exactly why the proxy scored it at the floor.
  const REAL = " Decide this on what cannot be undone, because a mistake an institution can repair later is a smaller thing than one a person carries out the door. Lost class time is recoverable while a student who leaves school unable to check what a system tells them carries that gap into work they do not get to redo. Under that rule, preparedness decides.";
  // Same length and topic, lens words throughout, no comparison actually made.
  // A TRUE minimal pair. The first draft of this fixture also added refutation and opponent-reference
  // vocabulary ("even if", "compared with theirs"), so it moved refutation and responsiveness and
  // proved nothing about weighing. These two tails have identical clause shapes and word counts, and
  // differ ONLY in nouns exclusive to the withdrawn WEIGHING_MARKERS list.
  const NEUTRAL_TAIL = " The programme runs in the school day. The cost sits with the district. The change lands in one year. The record is written down.";
  const STUFFED = " The magnitude runs in the school day. The probability sits with the district. The timeframe lands in one year. The reversibility is written down.";
  const run = (tail: string) => buildTranscriptBasedDebateJudge({ ...base, transcript: [
    { role: "AFFIRMATIVE" as const, round: 1, content: BODY + tail },
    { role: "NEGATIVE" as const, round: 1, content: OPP },
    { role: "AFFIRMATIVE" as const, round: 2, content: BODY + tail },
    { role: "NEGATIVE" as const, round: 2, content: OPP }
  ] });
  const none = run(NEUTRAL_TAIL), real = run(REAL), stuffed = run(STUFFED);
  assert.equal(NEUTRAL_TAIL.trim().split(/\s+/).length, STUFFED.trim().split(/\s+/).length,
    "W-0. the pair is length-matched, so any difference is the vocabulary and nothing else");

  // 1. BALLOT. No weighing row on any of the three, under either the old key or an honest one.
  for (const [name, r] of [["none", none], ["real", real], ["stuffed", stuffed]] as const) {
    assert.equal(r.categoryScores.find((c) => c.key === "clash"), undefined, `W-1 ${name}. no clash-keyed row`);
    assert.equal(r.categoryScores.find((c) => c.key === "weighing"), undefined, `W-1b ${name}. and none under the honest key`);
    assert.equal(r.categoryScores.find((c) => c.label === "Weighing"), undefined, `W-1c ${name}. and none under the label`);
  }

  // 2. OVERALL and 3. WINNER. Marker words buy nothing on either.
  assert.equal(stuffed.overallScore, none.overallScore, "W-2. marker stuffing does not move the overall");
  // No category may IMPROVE on the withdrawn vocabulary. One legitimately falls: `emptyJargon` reads
  // CONDITIONAL_JARGON_MARKERS, a separate and still-valid list that contains "magnitude",
  // "probability", "timeframe" and "reversibility" precisely because contentless lens words are
  // jargon. A penalty for saying them without arguing anything is the honest behaviour; what was
  // withdrawn is the REWARD. So the gate is one-sided by design.
  const stuffedCats = new Map(stuffed.categoryScores.map((c) => [c.key, c.score]));
  for (const c of none.categoryScores) {
    const after = stuffedCats.get(c.key) as number;
    assert.ok(after <= c.score,
      `W-2b. ${c.key} must not improve on the withdrawn vocabulary (${c.score} -> ${after})`);
    if (c.key !== "emptyJargon") {
      assert.equal(after, c.score,
        `W-2c. ${c.key} does not move at all — only the jargon penalty may react to contentless lens words`);
    }
  }
  assert.ok(stuffed.overallScore <= none.overallScore,
    `W-2d. and the overall cannot rise on vocabulary alone (${none.overallScore} -> ${stuffed.overallScore})`);
  assert.equal(stuffed.teamWinner, none.teamWinner, "W-3. and it cannot flip the winner");

  // 4/5. The two derived fields that depended on it are ABSENT, never zero and never narrowed.
  for (const [name, r] of [["none", none], ["stuffed", stuffed]] as const) {
    assert.equal((r as { sharedSpeaking?: { persuasion?: number } }).sharedSpeaking?.persuasion, undefined,
      `W-4 ${name}. sharedSpeaking.persuasion is absent, not recomputed from the two marker-driven survivors`);
    assert.equal((r as { readinessForNextLevel?: unknown }).readinessForNextLevel, undefined,
      `W-5 ${name}. readiness is absent — never false, and never narrowed to the two surviving gates`);
  }

  // 6. SOURCE-LEVEL REGRESSION CONTROLS. Each fails if a piece of the proxy comes back.
  const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const judgeSrc = stripComments(readFileSync("lib/debate-judge-analysis.ts", "utf8"));
  assert.ok(!/scores\.weighing/.test(judgeSrc), "W-6. no formula reads a weighing score");
  assert.ok(!/weighing: clamp\(/.test(judgeSrc), "W-6b. and none produces one");
  assert.ok(!/weighing \* 1\.35/.test(judgeSrc), "W-6c. the winner tiebreak term is gone");
  assert.ok(!/warrant \+ impact \+ weighing/.test(judgeSrc), "W-6d. and the marker count reaches vaguePenalty no more");
  assert.ok(!/label: "Weighing"/.test(judgeSrc), "W-6e. and no category is labelled Weighing");
  const guidedSrc = readFileSync("lib/education/guided-judge.ts", "utf8"); // comments kept: W-7b reads the declaration
  assert.ok(!/clash: "weighing"/.test(guidedSrc), "W-7. the clash -> weighing competency mapping is gone");
  assert.ok(/weighing: \{[\s\S]*?direct: false/.test(guidedSrc), "W-7b. and the direct claim is withdrawn");
  const routeSrc = stripComments(readFileSync("app/api/debates/[debateId]/judge/route.ts", "utf8"));
  assert.ok(!/\["clash", "weighing", "solutionQuality"\]/.test(routeSrc), "W-8. clash is no longer a weighing alias");
  assert.ok(!/categoryScore\(result, \["clash", "solutionQuality", "taskCompletion"\]\)/.test(routeSrc),
    "W-8b. and no longer sources the persisted persuasionScore");
  assert.ok(/weighingDelta === undefined \? \{\}/.test(routeSrc), "W-9. an absent weighing category writes no rating delta");
  assert.ok(!/weakText\.includes\("weigh"\)/.test(routeSrc), "W-10. and triggers no weighing remediation");
  // The ballot still carries a STATIC curriculum pointer to the weighing lesson, alongside the same
  // static claim-warrant-impact pointer. That is generic advice, not a diagnosis: it is identical on
  // every ballot and conditioned on no score, so it survives the withdrawal by the same rule that
  // kept the score-free coaching prose. What must not come back is a recommendation that VARIES with
  // the withdrawn measure — so the control is that the marked and neutral pair recommend identically.
  assert.deepEqual(stuffed.recommendedLessons, none.recommendedLessons,
    "W-10b. the withdrawn vocabulary changes no recommendation — the weighing pointer is static, not diagnosed");
  const priorities = new Set([none, real, stuffed].map((r) =>
    r.recommendedLessons?.find((l: { lessonSlug: string }) => l.lessonSlug === "debate-weighing")?.priority));
  assert.equal(priorities.size, 1, "W-10c. and its priority never escalates off a weighing score");
  console.log("  ok  weighing measure withdrawal: absent, no marker advantage on overall/winner/persuasion/readiness/delta/remediation");
}

/**
 * VP. vaguePenalty BOUNDARY. The withdrawn marker count also gated a "did this speech say anything
 * substantive" test: `warrant + impact + weighing + evidence < 4` cost 10 points on a long speech.
 * Leaving it there would have let lens words alone dodge that penalty, which is a marker-derived
 * advantage even though no category was named "weighing". The term is gone and the threshold moved
 * 4 -> 3 with it. These controls prove the new 3 preserves the intended non-weighing test rather
 * than merely fitting the fixtures: at 3 signals and at 2, the vocabulary changes nothing at all.
 */
{
  const base = { organization: "DEBATE" as const, eventType: "PARLIAMENTARY_DEBATE" as const,
    level: "INTERMEDIATE" as const, topic: "Schools should require AI literacy.", studentSide: "GOVERNMENT" as const };
  const OPP = "The requirement takes class time from subjects that already have too little.";
  // Pushes the speech past the >220-word length gate the penalty applies to.
  const PAD = " The school day is already timetabled and the district publishes the calendar each term. Staff plan the year in advance and families receive it before the term starts. ".repeat(3);
  const THREE = "Students learn to check machine output because the tool misstates sources. The harm is a student who cannot tell. A district study found fewer unattributed submissions.";
  const TWO = "Students learn to check machine output because the tool misstates sources. The harm is a student who cannot tell.";
  const NONE_ = "The programme exists and the school runs it.";
  // Clause-matched tails differing only in the withdrawn vocabulary.
  const NEUT = " The programme is noted. The schedule is noted. The calendar is noted. The record is noted.";
  const STUFF = " The magnitude is noted. The probability is noted. The timeframe is noted. The reversibility is noted.";
  const run = (text: string) => buildTranscriptBasedDebateJudge({ ...base, transcript: [
    { role: "AFFIRMATIVE" as const, round: 1, content: text }, { role: "NEGATIVE" as const, round: 1, content: OPP }] });
  const scored = ["argument", "warrant", "mechanism", "impact", "refutation", "contentEvidence"] as const;

  for (const [name, body] of [["A three signals", THREE], ["B two signals", TWO]] as const) {
    const neutral = run(body + PAD + NEUT);
    const stuffed = run(body + PAD + STUFF);
    const map = new Map(stuffed.categoryScores.map((c) => [c.key, c.score]));
    for (const key of scored) {
      const before = neutral.categoryScores.find((c) => c.key === key)?.score;
      assert.equal(map.get(key), before, `VP-1 ${name}: ${key} is unmoved by the withdrawn vocabulary`);
    }
    assert.equal(stuffed.overallScore, neutral.overallScore, `VP-1b ${name}: and the overall is identical`);
  }

  // C. The vocabulary ALONE cannot buy its way past the substantive-content test. It does not merely
  //    fail to help — it trips the jargon detector, which is the honest reading of a speech that is
  //    only lens words. Asserted as "no better", so the control survives future jargon tuning.
  const bareNeutral = run(NONE_ + PAD + NEUT);
  const bareStuffed = run(NONE_ + PAD + STUFF);
  assert.ok(bareStuffed.overallScore <= bareNeutral.overallScore,
    `VP-2. lens words alone cannot cross the content threshold (${bareNeutral.overallScore} -> ${bareStuffed.overallScore})`);
  const src = readFileSync("lib/debate-judge-analysis.ts", "utf8");
  assert.ok(/warrant \+ impact \+ evidence < 3/.test(src), "VP-3. the penalty gate counts three surviving signal families, not four");
  console.log("  ok  vaguePenalty boundary: withdrawn vocabulary moves nothing at 3 or 2 signals, and buys nothing alone");
}

markerStuffingBuysNothing();

opponentSoundsHuman()
  .then(() => sideFidelityTests())
  .then(() => guardrailTests())
  .then(() => judgeIsCrashProof())
  .then(() => personaStylesAreDistinct())
  .then(() => difficultyScales())
  .then(() => {
    console.log("Judge quality smoke tests passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
