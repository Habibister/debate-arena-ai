import assert from "node:assert/strict";

// Force the deterministic development fallback so we can test opponent generation without a live key.
Object.assign(process.env, { NODE_ENV: "development" });
delete process.env.OPENAI_API_KEY;

import { buildTranscriptBasedDebateJudge } from "../lib/debate-judge-analysis";
import { generateOpponentResponse } from "../lib/ai";
import { getAiPersona } from "../lib/ai-personas";
import { assessStudentSpeech, OPPONENT_COACHING_RESPONSE } from "../lib/speech-quality";
import { getProviderOrder } from "../lib/ai-providers";

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
assert.ok(
  category(oppositionJargonOnly, "clash") < 55,
  "Unsupported weighing language must score low, not high."
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
assert.ok(category(impactNoWeighing, "clash") < 60, "An impact with no comparison should score low on weighing.");

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
  "clash",
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

    // Advanced/elite personas argue longer (180-260); normal personas are tighter (100-180). Allow
    // a little slack around the fallback's deterministic length.
    const advanced = persona.difficulty === "elite";
    const [min, max] = advanced ? [170, 280] : [90, 190];
    const count = wordCount(response.response);
    assert.ok(count >= min && count <= max, `AI opponent (${personaId}, ${advanced ? "advanced" : "normal"}) should be ${min}-${max} words (was ${count}).`);
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

opponentSoundsHuman()
  .then(() => sideFidelityTests())
  .then(() => guardrailTests())
  .then(() => {
    console.log("Judge quality smoke tests passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
