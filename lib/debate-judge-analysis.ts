import type { Level, MessageRole, Organization } from "@prisma/client";

type DebateTranscriptMessage = {
  role: MessageRole;
  round: number;
  content: string;
};

type DebateSide = "GOVERNMENT" | "OPPOSITION";
type StudentSide = DebateSide | "FOR" | "AGAINST";

type CategoryScore = {
  key: string;
  label: string;
  score: number;
  reason: string;
};

type SharedSpeakingScores = {
  clarity: number;
  confidence: number;
  pacing: number;
  volume: number;
  organization: number;
  vocabulary: number;
  persuasion: number;
  professionalism: number;
};

type LessonRecommendation = {
  lessonSlug: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

type SideMetrics = {
  side: DebateSide;
  speeches: DebateTranscriptMessage[];
  combinedText: string;
  sentences: string[];
  claims: string[];
  bestClaim: string;
  weakestClaim: string;
  scores: {
    claimClarity: number;
    warrant: number;
    impact: number;
    refutation: number;
    weighing: number;
    evidence: number;
    organization: number;
    responsiveness: number;
    finalSpeech: number;
    ruleCompliance: number;
    style: number;
    overall: number;
  };
  counts: {
    words: number;
    warrant: number;
    impact: number;
    refutation: number;
    opponentReference: number;
    weighing: number;
    evidence: number;
    signpost: number;
    vague: number;
    finalNewArgument: number;
  };
  dropped: string[];
};

type TranscriptJudgeInput = {
  organization: Organization;
  eventType: string;
  level: Level;
  topic: string;
  transcript: DebateTranscriptMessage[];
  studentSide?: StudentSide;
};

const STOPWORDS = new Set([
  "about",
  "after",
  "against",
  "because",
  "before",
  "being",
  "between",
  "could",
  "every",
  "from",
  "have",
  "important",
  "into",
  "other",
  "people",
  "policy",
  "really",
  "should",
  "students",
  "their",
  "there",
  "thing",
  "this",
  "through",
  "under",
  "would"
]);

const WARRANT_MARKERS = [
  "because",
  "since",
  "therefore",
  "this means",
  "as a result",
  "leads to",
  "causes",
  "due to",
  "mechanism",
  "solves",
  "works",
  "if "
];

const IMPACT_MARKERS = [
  "harm",
  "benefit",
  "risk",
  "safety",
  "fairness",
  "rights",
  "cost",
  "trust",
  "learning",
  "health",
  "opportunity",
  "access",
  "equity",
  "future",
  "long-term",
  "enforcement",
  "daily",
  "directly"
];

const WEIGHING_MARKERS = [
  "outweigh",
  "more important",
  "compared",
  "even if",
  "bigger",
  "more likely",
  "probability",
  "magnitude",
  "timeframe",
  "irreversible",
  "reversibility",
  "net benefit",
  "tradeoff",
  "judge should",
  "matters more"
];

const EVIDENCE_MARKERS = [
  "for example",
  "such as",
  "data",
  "evidence",
  "research",
  "study",
  "studies",
  "statistic",
  "percent",
  "%",
  "when",
  "case",
  "pattern"
];

const REFUTATION_MARKERS = [
  "opponent",
  "they say",
  "they argue",
  "their argument",
  "opposition",
  "government",
  "affirmative",
  "negative",
  "however",
  "but",
  "does not",
  "doesn't",
  "fails",
  "ignores",
  "no link",
  "not solve",
  "turns"
];

const SIGNPOST_MARKERS = [
  "first",
  "second",
  "third",
  "contention",
  "voter",
  "my first",
  "next",
  "finally",
  "to start",
  "on the",
  "point",
  "argument"
];

const VAGUE_PATTERNS = [
  "my opponent is wrong",
  "they are wrong",
  "this is bad",
  "this is good",
  "obviously",
  "clearly",
  "everyone knows",
  "no one",
  "stuff",
  "things",
  "just because"
];

function clamp(score: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(score)));
}

function sideForRole(role: MessageRole): DebateSide | null {
  if (role === "AFFIRMATIVE") {
    return "GOVERNMENT";
  }

  if (role === "NEGATIVE") {
    return "OPPOSITION";
  }

  return null;
}

function normalizeStudentSide(side?: StudentSide): DebateSide {
  if (side === "OPPOSITION" || side === "AGAINST") {
    return "OPPOSITION";
  }

  return "GOVERNMENT";
}

function sentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function words(text: string) {
  return text.toLowerCase().match(/[a-z][a-z'-]*/g) ?? [];
}

function countMarkers(text: string, markers: string[]) {
  const lower = text.toLowerCase();
  return markers.reduce((total, marker) => total + (lower.includes(marker) ? 1 : 0), 0);
}

function excerpt(text: string, max = 170) {
  const clean = text.replace(/\s+/g, " ").trim();

  if (!clean) {
    return "No clear claim was made.";
  }

  return clean.length > max ? `${clean.slice(0, max - 3)}...` : clean;
}

function sentenceQuality(sentence: string) {
  const lower = sentence.toLowerCase();
  return (
    sentence.length / 24 +
    countMarkers(lower, WARRANT_MARKERS) * 4 +
    countMarkers(lower, IMPACT_MARKERS) * 3 +
    countMarkers(lower, REFUTATION_MARKERS) * 3 +
    countMarkers(lower, WEIGHING_MARKERS) * 5 +
    countMarkers(lower, EVIDENCE_MARKERS) * 2 -
    countMarkers(lower, VAGUE_PATTERNS) * 5
  );
}

function extractClaims(sideSentences: string[]) {
  const ranked = sideSentences
    .map((sentence) => ({ sentence, score: sentenceQuality(sentence) }))
    .filter((item) => item.sentence.length > 12)
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, 4).map((item) => item.sentence);
}

function weakestSentence(sideSentences: string[]) {
  const ranked = sideSentences
    .filter((sentence) => sentence.length > 8)
    .map((sentence) => ({ sentence, score: sentenceQuality(sentence) }))
    .sort((a, b) => a.score - b.score);

  return ranked[0]?.sentence ?? sideSentences[0] ?? "";
}

function keywords(text: string) {
  return Array.from(
    new Set(
      words(text)
        .filter((word) => word.length >= 6)
        .filter((word) => !STOPWORDS.has(word))
    )
  ).slice(0, 8);
}

function unansweredClaims(opponentClaims: string[], sideText: string, sideResponsiveness: number) {
  const lower = sideText.toLowerCase();

  return opponentClaims
    .filter((claim) => {
      const claimKeywords = keywords(claim);
      const overlap = claimKeywords.filter((word) => lower.includes(word)).length;
      return overlap < Math.min(2, claimKeywords.length) && sideResponsiveness < 68;
    })
    .slice(0, 2)
    .map((claim) => excerpt(claim));
}

function detectFinalNewArgument(speeches: DebateTranscriptMessage[]) {
  if (speeches.length < 2) {
    return 0;
  }

  const prior = speeches
    .slice(0, -1)
    .map((speech) => speech.content)
    .join(" ")
    .toLowerCase();
  const finalKeywords = keywords(speeches[speeches.length - 1].content);
  const newKeywords = finalKeywords.filter((word) => !prior.includes(word));

  return newKeywords.length >= 4 ? 1 : 0;
}

function analyzeSide(side: DebateSide, transcript: DebateTranscriptMessage[]): SideMetrics {
  const speeches = transcript.filter((message) => sideForRole(message.role) === side);
  const combinedText = speeches.map((speech) => speech.content).join("\n\n");
  const sideSentences = sentences(combinedText);
  const wordCount = words(combinedText).length;
  const warrant = countMarkers(combinedText, WARRANT_MARKERS);
  const impact = countMarkers(combinedText, IMPACT_MARKERS);
  const refutation = countMarkers(combinedText, REFUTATION_MARKERS);
  const opponentReference = countMarkers(combinedText, ["opponent", "they say", "they argue", "their", "opposition", "government", "affirmative", "negative"]);
  const weighing = countMarkers(combinedText, WEIGHING_MARKERS);
  const evidence = countMarkers(combinedText, EVIDENCE_MARKERS) + (/\d/.test(combinedText) ? 1 : 0);
  const signpost = countMarkers(combinedText, SIGNPOST_MARKERS);
  const vague = countMarkers(combinedText, VAGUE_PATTERNS);
  const finalNewArgument = detectFinalNewArgument(speeches);
  const claims = extractClaims(sideSentences);
  const lengthBonus = Math.min(16, wordCount / 14);
  const vaguePenalty = vague * 9 + (wordCount > 220 && warrant + impact + weighing + evidence < 4 ? 10 : 0);
  const finalSpeechText = speeches[speeches.length - 1]?.content ?? "";
  const finalSpeechScore = finalSpeechText
    ? clamp(
        42 +
          countMarkers(finalSpeechText, REFUTATION_MARKERS) * 9 +
          countMarkers(finalSpeechText, WEIGHING_MARKERS) * 14 +
          countMarkers(finalSpeechText, WARRANT_MARKERS) * 7 +
          countMarkers(finalSpeechText, IMPACT_MARKERS) * 5 -
          finalNewArgument * 14
      )
    : 45;

  const scores = {
    claimClarity: clamp(36 + lengthBonus + claims.length * 9 + signpost * 3 - vaguePenalty),
    warrant: clamp(30 + warrant * 15 + Math.min(10, wordCount / 30) - vague * 7),
    impact: clamp(30 + impact * 9 + warrant * 2 - vague * 5),
    refutation: clamp(26 + refutation * 10 + opponentReference * 7 - vague * 4),
    weighing: clamp(24 + weighing * 18 + (impact > 1 ? 5 : 0) - vague * 4),
    evidence: clamp(25 + evidence * 14 + Math.min(8, wordCount / 45) - vague * 5),
    organization: clamp(38 + signpost * 11 + Math.min(10, sideSentences.length * 2) - vague * 3),
    responsiveness: clamp(30 + opponentReference * 8 + refutation * 7 - vague * 4),
    finalSpeech: finalSpeechScore,
    ruleCompliance: clamp(88 - finalNewArgument * 22 - vague * 2),
    style: clamp(45 + Math.min(18, wordCount / 18) + signpost * 5 - vague * 5),
    overall: 0
  };

  scores.overall = clamp(
    scores.claimClarity * 0.12 +
      scores.warrant * 0.14 +
      scores.impact * 0.12 +
      scores.refutation * 0.13 +
      scores.weighing * 0.14 +
      scores.evidence * 0.1 +
      scores.organization * 0.08 +
      scores.responsiveness * 0.09 +
      scores.finalSpeech * 0.05 +
      scores.ruleCompliance * 0.03
  );

  return {
    side,
    speeches,
    combinedText,
    sentences: sideSentences,
    claims,
    bestClaim: claims[0] ?? excerpt(combinedText),
    weakestClaim: weakestSentence(sideSentences),
    scores,
    counts: {
      words: wordCount,
      warrant,
      impact,
      refutation,
      opponentReference,
      weighing,
      evidence,
      signpost,
      vague,
      finalNewArgument
    },
    dropped: []
  };
}

function sideLabel(side: DebateSide) {
  return side === "GOVERNMENT" ? "Government/Affirmative" : "Opposition/Negative";
}

function scoreReason(label: string, score: number, side: SideMetrics) {
  if (score >= 80) {
    return `${sideLabel(side.side)} earned a strong ${label} score because they used transcript-specific material such as "${excerpt(side.bestClaim, 120)}."`;
  }

  if (score >= 65) {
    return `${sideLabel(side.side)} had some ${label}, but the speech needed another warrant, example, or comparison beyond "${excerpt(side.bestClaim, 120)}."`;
  }

  return `${sideLabel(side.side)} was weak on ${label}: "${excerpt(side.weakestClaim, 120)}" did not give the judge enough warrant, impact, or direct comparison.`;
}

function sideFeedback(side: SideMetrics, opponent: SideMetrics) {
  const dropped = unansweredClaims(opponent.claims, side.combinedText, side.scores.responsiveness);
  side.dropped = dropped;
  const missed = [
    side.scores.warrant < 68 ? `Needed more warrant for: "${excerpt(side.bestClaim)}"` : null,
    side.scores.impact < 68 ? `Needed a clearer impact explaining why "${excerpt(side.bestClaim, 120)}" matters to the ballot.` : null,
    side.scores.weighing < 68 ? "Needed explicit weighing: magnitude, probability, timeframe, or why this issue matters more." : null,
    dropped[0] ? `Dropped or barely answered: "${dropped[0]}"` : null,
    side.counts.vague > 0 ? `Used vague language that sounded asserted rather than proven, especially around "${excerpt(side.weakestClaim, 120)}."` : null,
    side.counts.finalNewArgument > 0 ? "Final speech appeared to add new material instead of collapsing to existing arguments." : null
  ].filter((item): item is string => Boolean(item));

  return {
    didWell: [
      `Best claim: "${excerpt(side.bestClaim)}"`,
      side.scores.refutation >= 70
        ? `Created direct clash by answering opposing material in the speech.`
        : `Gave at least one position the judge could identify, but clash was limited.`,
      side.scores.weighing >= 70
        ? `Used comparative language that helped explain why their impact mattered.`
        : `Established a baseline position for the side.`
    ],
    missed: missed.length > 0 ? missed : ["No major collapse, but the side could still make the ballot story more explicit."]
  };
}

function recommendationForStudent(student: SideMetrics) {
  if (student.scores.refutation < 65) {
    return {
      lessonSlug: "debate-refutation-lesson",
      reason: "Practice answering the opponent's exact claim before adding new offense.",
      priority: "high" as const
    };
  }

  if (student.scores.weighing < 65) {
    return {
      lessonSlug: "debate-weighing-lesson",
      reason: "Practice explaining why your impact matters more than theirs.",
      priority: "high" as const
    };
  }

  if (student.scores.evidence < 65) {
    return {
      lessonSlug: "debate-claim-warrant-impact-lesson",
      reason: "Add examples or evidence that prove the warrant, not just the claim.",
      priority: "medium" as const
    };
  }

  return {
    lessonSlug: "debate-signposting-lesson",
    reason: "Make the judge's path through the speech easier to follow.",
    priority: "medium" as const
  };
}

function speakerPoint(score: number, offset: number) {
  return clamp(19 + (score - 45) / 5 - offset, 19, 30);
}

function descriptorForSpeaker(score: number) {
  if (score >= 30) return "exceptional";
  if (score >= 29) return "outstanding";
  if (score >= 27) return "excellent";
  if (score >= 24) return "good";
  if (score >= 22) return "competent";
  if (score >= 20) return "developing";
  return "poor";
}

function buildSpeakerScores(government: SideMetrics, opposition: SideMetrics) {
  const speakers = [
    {
      speaker: "Government 1",
      team: "GOVERNMENT" as const,
      score: speakerPoint(government.scores.overall, 0),
      rationale: scoreReason("speaker performance", government.scores.overall, government)
    },
    {
      speaker: "Government 2",
      team: "GOVERNMENT" as const,
      score: speakerPoint((government.scores.refutation + government.scores.weighing + government.scores.finalSpeech) / 3, 1),
      rationale: scoreReason("rebuttal and collapse", government.scores.finalSpeech, government)
    },
    {
      speaker: "Opposition 1",
      team: "OPPOSITION" as const,
      score: speakerPoint(opposition.scores.overall, 0),
      rationale: scoreReason("speaker performance", opposition.scores.overall, opposition)
    },
    {
      speaker: "Opposition 2",
      team: "OPPOSITION" as const,
      score: speakerPoint((opposition.scores.refutation + opposition.scores.weighing + opposition.scores.finalSpeech) / 3, 1),
      rationale: scoreReason("rebuttal and collapse", opposition.scores.finalSpeech, opposition)
    }
  ];
  const sorted = [...speakers].sort((a, b) => b.score - a.score);

  return speakers.map((speaker) => ({
    ...speaker,
    rank: (sorted.findIndex((item) => item.speaker === speaker.speaker) + 1) as 1 | 2 | 3 | 4,
    descriptor: descriptorForSpeaker(speaker.score)
  }));
}

function buildCategoryScores(student: SideMetrics): CategoryScore[] {
  return [
    { key: "argument", label: "Argument", score: student.scores.claimClarity, reason: scoreReason("claim clarity", student.scores.claimClarity, student) },
    { key: "warrant", label: "Warrant", score: student.scores.warrant, reason: scoreReason("warrant/reasoning", student.scores.warrant, student) },
    { key: "impact", label: "Impact", score: student.scores.impact, reason: scoreReason("impact", student.scores.impact, student) },
    { key: "refutation", label: "Refutation", score: student.scores.refutation, reason: scoreReason("refutation", student.scores.refutation, student) },
    { key: "clash", label: "Weighing", score: student.scores.weighing, reason: scoreReason("weighing", student.scores.weighing, student) },
    { key: "contentEvidence", label: "Evidence", score: student.scores.evidence, reason: scoreReason("evidence/examples", student.scores.evidence, student) },
    { key: "organization", label: "Organization", score: student.scores.organization, reason: scoreReason("organization", student.scores.organization, student) },
    { key: "delivery", label: "Style", score: student.scores.style, reason: scoreReason("style", student.scores.style, student) },
    { key: "responsiveness", label: "Responsiveness", score: student.scores.responsiveness, reason: scoreReason("responsiveness", student.scores.responsiveness, student) },
    {
      key: "ruleCompliance",
      label: "Rule compliance",
      score: student.scores.ruleCompliance,
      reason:
        student.counts.finalNewArgument > 0
          ? "The final speech appeared to introduce new material instead of weighing existing arguments."
          : "No obvious final-speech rule issue was detected from the transcript."
    }
  ];
}

function sharedSpeakingFor(student: SideMetrics): SharedSpeakingScores {
  return {
    clarity: student.scores.claimClarity,
    confidence: clamp((student.scores.style + student.scores.organization) / 2),
    pacing: clamp(70 + Math.min(12, student.counts.words / 35) - student.counts.vague * 4),
    volume: 75,
    organization: student.scores.organization,
    vocabulary: clamp(60 + Math.min(20, keywords(student.combinedText).length * 3)),
    persuasion: clamp((student.scores.impact + student.scores.weighing + student.scores.warrant) / 3),
    professionalism: clamp(82 - student.counts.vague * 3)
  };
}

function confidenceLevel(diff: number) {
  if (diff >= 12) {
    return "high";
  }

  if (diff >= 6) {
    return "medium";
  }

  return "low";
}

function betterSentenceFor(student: SideMetrics, opponent: SideMetrics) {
  const opponentClaim = opponent.bestClaim ? excerpt(opponent.bestClaim, 120) : "their main argument";

  if (student.scores.weighing < 68) {
    return `Even if ${sideLabel(opponent.side)} is right that "${opponentClaim}", my impact matters more because it affects students more directly and more often.`;
  }

  if (student.scores.refutation < 68) {
    return `${sideLabel(opponent.side)} says "${opponentClaim}", but that does not answer my mechanism because it assumes the policy works without proving enforcement.`;
  }

  return `My strongest point is not just that this sounds fair; it is that the mechanism changes who is protected, how often, and with what accountability.`;
}

export function buildTranscriptBasedDebateJudge(input: TranscriptJudgeInput) {
  const eventType = input.eventType ?? "PARLIAMENTARY_DEBATE";
  const government = analyzeSide("GOVERNMENT", input.transcript);
  const opposition = analyzeSide("OPPOSITION", input.transcript);
  government.dropped = unansweredClaims(opposition.claims, government.combinedText, government.scores.responsiveness);
  opposition.dropped = unansweredClaims(government.claims, opposition.combinedText, opposition.scores.responsiveness);
  const winner: DebateSide =
    government.scores.overall === opposition.scores.overall
      ? government.scores.weighing + government.scores.refutation >= opposition.scores.weighing + opposition.scores.refutation
        ? "GOVERNMENT"
        : "OPPOSITION"
      : government.scores.overall > opposition.scores.overall
        ? "GOVERNMENT"
        : "OPPOSITION";
  const loser: DebateSide = winner === "GOVERNMENT" ? "OPPOSITION" : "GOVERNMENT";
  const winnerMetrics = winner === "GOVERNMENT" ? government : opposition;
  const loserMetrics = loser === "GOVERNMENT" ? government : opposition;
  const studentSide = normalizeStudentSide(input.studentSide);
  const student = studentSide === "GOVERNMENT" ? government : opposition;
  const opponent = studentSide === "GOVERNMENT" ? opposition : government;
  const diff = Math.abs(government.scores.overall - opposition.scores.overall);
  const confidence = confidenceLevel(diff);
  const governmentFeedback = sideFeedback(government, opposition);
  const oppositionFeedback = sideFeedback(opposition, government);
  const studentRecommendation = recommendationForStudent(student);
  const betterSentence = betterSentenceFor(student, opponent);
  const keyClash = `Whether "${excerpt(government.bestClaim, 110)}" outweighed "${excerpt(opposition.bestClaim, 110)}." ${sideLabel(winner)} won that clash because ${winnerMetrics.scores.weighing >= loserMetrics.scores.weighing ? "it compared the ballot impact more clearly" : "it had the more developed warrant and answer to the other side"}.`;
  const reasonForDecision = `${sideLabel(winner)} wins on this transcript, not by default. ${sideLabel(winner)} scored ${winnerMetrics.scores.overall} to ${loserMetrics.scores.overall} because its best material, "${excerpt(winnerMetrics.bestClaim)}", had more usable warrant, clash, or comparison than the losing side's weakest material, "${excerpt(loserMetrics.weakestClaim)}." ${sideLabel(loser)} ${loserMetrics.dropped[0] ? `left this important point underanswered: "${loserMetrics.dropped[0]}."` : "answered some material, but did not turn those answers into a clearer ballot comparison."}`;

  return {
    overallScore: student.scores.overall,
    categoryScores: buildCategoryScores(student),
    sharedSpeaking: sharedSpeakingFor(student),
    speakerScores: buildSpeakerScores(government, opposition),
    teamWinner: winner,
    losingSide: loser,
    confidenceLevel: confidence,
    shortReasonForDecision: `${sideLabel(winner)} won ${confidence}-confidence because it won the more important comparison from the actual speeches.`,
    longReasonForDecision: reasonForDecision,
    reasonForDecision,
    sideFeedback: {
      government: governmentFeedback,
      opposition: oppositionFeedback
    },
    sideAnalysis: {
      government: {
        whatTheyClaimed: government.claims.map((claim) => excerpt(claim)),
        bestArgument: excerpt(government.bestClaim),
        weakestArgument: excerpt(government.weakestClaim),
        failedToAnswer: government.dropped,
        dropped: government.dropped,
        neededMoreWarrant: government.scores.warrant < 68 ? `Explain why "${excerpt(government.bestClaim, 120)}" is true, not just that it matters.` : "Warrants were present.",
        neededMoreImpact: government.scores.impact < 68 ? "Add a concrete harm or benefit and explain who experiences it." : "Impacts were present.",
        neededMoreWeighing: government.scores.weighing < 68 ? "Compare magnitude, probability, timeframe, or reversibility against the opposition." : "Some weighing was present.",
        vagueOrUnsupported: government.counts.vague > 0 || government.scores.evidence < 65 ? `Most unsupported piece: "${excerpt(government.weakestClaim, 130)}."` : "No major unsupported claim stood out.",
        persuasiveReframe: government.scores.weighing >= 76 ? "Created a usable ballot frame." : "Did not clearly reframe the round.",
        hiddenAssumptionAttack: government.scores.refutation >= 76 ? "Pressed an assumption in the opposing case." : "Needed to expose the opponent's hidden assumption more directly."
      },
      opposition: {
        whatTheyClaimed: opposition.claims.map((claim) => excerpt(claim)),
        bestArgument: excerpt(opposition.bestClaim),
        weakestArgument: excerpt(opposition.weakestClaim),
        failedToAnswer: opposition.dropped,
        dropped: opposition.dropped,
        neededMoreWarrant: opposition.scores.warrant < 68 ? `Explain why "${excerpt(opposition.bestClaim, 120)}" is true, not just that it matters.` : "Warrants were present.",
        neededMoreImpact: opposition.scores.impact < 68 ? "Add a concrete harm or benefit and explain who experiences it." : "Impacts were present.",
        neededMoreWeighing: opposition.scores.weighing < 68 ? "Compare magnitude, probability, timeframe, or reversibility against the government." : "Some weighing was present.",
        vagueOrUnsupported: opposition.counts.vague > 0 || opposition.scores.evidence < 65 ? `Most unsupported piece: "${excerpt(opposition.weakestClaim, 130)}."` : "No major unsupported claim stood out.",
        persuasiveReframe: opposition.scores.weighing >= 76 ? "Created a usable ballot frame." : "Did not clearly reframe the round.",
        hiddenAssumptionAttack: opposition.scores.refutation >= 76 ? "Pressed an assumption in the opposing case." : "Needed to expose the opponent's hidden assumption more directly."
      }
    },
    transcriptFeedback: {
      studentSide,
      strongestClaim: excerpt(student.bestClaim),
      weakestClaim: excerpt(student.weakestClaim),
      bestRefutation:
        student.scores.refutation >= 68
          ? `Your best refutation was the part where you answered opposing material around "${excerpt(opponent.bestClaim, 120)}."`
          : "You did not give a specific refutation; you mostly asserted your side without directly answering the opposing mechanism.",
      biggestDroppedArgument: student.dropped[0] ?? `You did not clearly compare against the opponent's best claim: "${excerpt(opponent.bestClaim, 120)}."`,
      mostMissingPiece:
        student.scores.warrant < 68
          ? "The missing piece was warrant: explain why your claim is true."
          : student.scores.weighing < 68
            ? "The missing piece was weighing: explain why your impact matters more."
            : "The biggest next step is collapsing your best point into a cleaner voter.",
      betterSentence,
      modelRewrite: `${excerpt(student.bestClaim, 110)}. This becomes stronger if you add: "${betterSentence}"`,
      skillToPractice: studentRecommendation.lessonSlug
    },
    keyClash,
    strongestArgument: `Best winning argument: "${excerpt(winnerMetrics.bestClaim)}."`,
    weakestArgument: `Weakest losing-side argument: "${excerpt(loserMetrics.weakestClaim)}."`,
    strengths: [
      `Your strongest claim was: "${excerpt(student.bestClaim)}."`,
      student.scores.organization >= 70 ? "Your structure gave the judge some signposts to follow." : "You had at least one identifiable position to evaluate.",
      student.scores.refutation >= 70 ? "You made at least one direct answer to the other side." : "You gave the judge a starting point for your side."
    ],
    weaknesses: [
      student.scores.warrant < 68 ? `Warrant gap: "${excerpt(student.weakestClaim, 130)}" needed a because sentence.` : "Warrants were present but could be sharper.",
      student.scores.impact < 68 ? "Impact gap: explain who is harmed or helped, how much, and why that matters." : "Impacts were present but need stronger comparison.",
      student.scores.weighing < 68 ? "Weighing gap: compare your impact against the opponent's best impact." : "Weighing was present but can be cleaner.",
      student.dropped[0] ? `Dropped argument: "${student.dropped[0]}."` : "No obvious full drop, but some answers were not extended enough."
    ],
    improvementAdvice: [
      `Better sentence to add: "${betterSentence}"`,
      `Model rewrite: ${excerpt(student.bestClaim, 110)}. ${betterSentence}`,
      `Next skill: ${studentRecommendation.reason}`
    ],
    recommendedLessons: [
      studentRecommendation,
      {
        lessonSlug: "debate-claim-warrant-impact-lesson",
        reason: "Strengthen every claim with a because sentence and a concrete impact.",
        priority: studentRecommendation.lessonSlug === "debate-claim-warrant-impact-lesson" ? "high" : "medium"
      },
      {
        lessonSlug: "debate-weighing-lesson",
        reason: "Practice comparing why your best impact should decide the round.",
        priority: studentRecommendation.lessonSlug === "debate-weighing-lesson" ? "high" : "medium"
      }
    ],
    internalScoringSummary: {
      governmentScore: government.scores.overall,
      oppositionScore: opposition.scores.overall,
      reasonWinnerSelected: `${sideLabel(winner)} had the stronger weighted total after claim clarity, warrant, impact, refutation, weighing, evidence, organization, responsiveness, final speech quality, and rule compliance were scored from the transcript.`
    },
    readinessForNextLevel: {
      ready: student.scores.overall >= 82 && student.scores.weighing >= 75 && student.scores.refutation >= 75,
      rationale:
        student.scores.overall >= 82
          ? "The transcript shows a strong foundation, but promotion depends on repeating this with direct clash and clean weighing."
          : "Keep training before the next level: the speech still needs more warrant, impact comparison, or direct clash.",
      nextMilestone: "Complete a judged round where your final speech answers the opponent's best argument and weighs your impact in one clear voter."
    },
    fallbackNotice: "Development-only local AI fallback is active because OpenAI is unavailable. Add a valid OPENAI_API_KEY to use live AI.",
    eventType,
    topic: input.topic,
    organization: input.organization,
    level: input.level
  };
}
