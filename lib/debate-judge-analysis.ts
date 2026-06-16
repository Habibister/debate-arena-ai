import type { Level, MessageRole, Organization } from "@prisma/client";
import { countMeaningfulWords, hasClaim } from "@/lib/speech-quality";

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
    mechanism: number;
    impact: number;
    refutation: number;
    weighing: number;
    evidence: number;
    motionConnection: number;
    sideFidelity: number;
    centralClashResponse: number;
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
    jargon: number;
    topicEngagement: number;
    realWarrant: number;
  };
  isMostlyJargon: boolean;
  nonSubstantive: boolean;
  jargonPhrase: string | null;
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
  "safe",
  "danger",
  "emergency",
  "protect",
  "fairness",
  "rights",
  "cost",
  "trust",
  "learning",
  "health",
  "mental",
  "stress",
  "anxiety",
  "distract",
  "focus",
  "attention",
  "privacy",
  "afford",
  "poverty",
  "crime",
  "violence",
  "bully",
  "addiction",
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

// Stance signals used for SIDE-FIDELITY: does a speech argue FOR the motion or AGAINST it? Government
// must support the motion; Opposition must oppose it. A clear mismatch is a side inversion.
const SUPPORT_MARKERS = [
  "should be implemented",
  "should be adopted",
  "should happen",
  "should require",
  "should teach",
  "should ban",
  "we should",
  "support the motion",
  "in favor",
  "i support",
  "i am defending",
  "i'm defending",
  "i will defend",
  "defend the motion",
  "this policy works",
  "the benefits outweigh",
  "it should happen",
  "is the right call",
  "i would implement"
];
const OPPOSE_MARKERS = [
  "should not be implemented",
  "should not be adopted",
  "should not happen",
  "should not require",
  "should not ban",
  "we should not",
  "shouldn't",
  "oppose the motion",
  "i oppose",
  "against the motion",
  "do not support",
  "reject the motion",
  "scrap",
  "abolish",
  "bad idea",
  "won't work",
  "will not work",
  "do more harm than good",
  "not be implemented",
  "a narrower fix",
  "a smaller, testable version"
];

// Empty debate jargon: phrases that SOUND like weighing/comparison/clash but carry no argument on
// their own. They earn nothing unless the speech also proves the underlying claim with warrant and
// impact, and a speech built only out of them is penalized rather than rewarded.
const EMPTY_JARGON_MARKERS = [
  "clearer causation",
  "lower risk",
  "impact comparison",
  "stronger impact",
  "more defensible impact",
  "judge should prefer",
  "prefer our side",
  "prefer us",
  "we outweigh",
  "direct clash",
  "independent offense",
  "clearer warrant",
  "stronger warrant",
  "ballot story",
  "on the ballot",
  "key voter",
  "main voter",
  "first voter",
  "solvency"
];

// Terms that are legitimate debate concepts but mean nothing on their own. They never trigger a
// penalty by themselves; they simply earn no credit unless the speech also shows real substance
// (a genuine warrant, a concrete impact, evidence, or real engagement with the motion).
const CONDITIONAL_JARGON_MARKERS = [
  "weighing",
  "magnitude",
  "probability",
  "timeframe",
  "reversibility",
  "no link",
  "the link",
  "turn it",
  "clash",
  "voter",
  "ballot"
];

// Lightweight stem so motion keywords match across plural/verb forms ("rankings" ~ "rank",
// "schools" ~ "school"). Avoids labelling an on-topic speech as disconnected on a plural mismatch.
function stem(word: string) {
  return word.replace(/(ings|ies|ing|ed|es|s)$/, "");
}

// A genuine warrant connective. Excludes the bare "if " used by WARRANT_MARKERS, because "even if"
// (a weighing phrase) would otherwise register as a real warrant and let jargon pass the substance gate.
const REAL_WARRANT_MARKERS = [
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
  "works"
];

function firstMarkerMatch(text: string, markers: string[]) {
  const lower = text.toLowerCase();
  return markers.find((marker) => lower.includes(marker)) ?? null;
}

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

const CLAIM_HEDGE_PREFIXES = [
  "i am not exactly sure what the opposition is referring to",
  "i am not exactly sure what the opposition is refering to",
  "i am not exactly sure",
  "i'm not exactly sure",
  "i am not entirely sure",
  "i am not sure",
  "i'm not sure",
  "i still stand on my points",
  "i still stand on my point",
  "what i'm trying to say is",
  "what i am trying to say is",
  "to be honest",
  "honestly",
  "i think that",
  "i think",
  "i believe that",
  "i believe",
  "i guess",
  "i mean",
  "basically",
  "well",
  "um",
  "uh"
];

// Turn a possibly messy transcript fragment into a clean, readable paraphrase of the idea, rather
// than quoting rambling text verbatim. Picks the most substantive clause, strips filler hedges,
// trims at a word boundary, and keeps acronyms ("AI") intact.
function cleanClaim(raw: string, max = 150) {
  let text = (raw || "").replace(/\s+/g, " ").trim();

  if (!text) {
    return "your main point";
  }

  const clauses = text
    .split(/(?<=[.!?;])\s+|;|\b(?:however|but|although|though)\b/i)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 14);

  if (clauses.length > 0) {
    text = clauses.reduce((best, clause) => (sentenceQuality(clause) > sentenceQuality(best) ? clause : best));
  }

  let lower = text.toLowerCase();
  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const hedge of CLAIM_HEDGE_PREFIXES) {
      if (lower.startsWith(hedge)) {
        text = text.slice(hedge.length).replace(/^[\s,.;:]+/, "");
        lower = text.toLowerCase();
        stripped = true;
      }
    }
  }

  text = text.replace(/[.!?]+$/, "").trim();

  if (!text) {
    return "your main point";
  }

  if (text.length > max) {
    let cut = text.slice(0, max);
    const boundary = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf("; "));
    cut = boundary > max * 0.5 ? cut.slice(0, boundary) : cut.replace(/\s+\S*$/, "");
    text = cut.trim();
  }

  // Drop a dangling connective left at the end of a trim so the paraphrase reads as a complete thought.
  text = text.replace(/[\s,;:]+$/, "").replace(/\s+(?:because|that|and|but|so|the|a|an|to|of|with|for|which|when|where|while|since)$/i, "");

  return /^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
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

function analyzeSide(side: DebateSide, transcript: DebateTranscriptMessage[], topicKeywords: string[]): SideMetrics {
  const speeches = transcript.filter((message) => sideForRole(message.role) === side);
  const combinedText = speeches.map((speech) => speech.content).join("\n\n");
  const lowerText = combinedText.toLowerCase();
  const sideSentences = sentences(combinedText);
  const wordCount = words(combinedText).length;
  const warrant = countMarkers(combinedText, WARRANT_MARKERS);
  const realWarrant = countMarkers(combinedText, REAL_WARRANT_MARKERS);
  const impact = countMarkers(combinedText, IMPACT_MARKERS);
  const refutation = countMarkers(combinedText, REFUTATION_MARKERS);
  const opponentReference = countMarkers(combinedText, ["opponent", "they say", "they argue", "their", "opposition", "government", "affirmative", "negative"]);
  const weighing = countMarkers(combinedText, WEIGHING_MARKERS);
  const evidence = countMarkers(combinedText, EVIDENCE_MARKERS) + (/\d/.test(combinedText) ? 1 : 0);
  const signpost = countMarkers(combinedText, SIGNPOST_MARKERS);
  const vague = countMarkers(combinedText, VAGUE_PATTERNS);
  const hardJargon = countMarkers(combinedText, EMPTY_JARGON_MARKERS);
  const conditionalJargon = countMarkers(combinedText, CONDITIONAL_JARGON_MARKERS);
  const jargon = hardJargon + conditionalJargon;
  const jargonPhrase = firstMarkerMatch(combinedText, EMPTY_JARGON_MARKERS) ?? firstMarkerMatch(combinedText, CONDITIONAL_JARGON_MARKERS);
  const topicStems = topicKeywords.map(stem).filter((value) => value.length >= 4);
  const topicEngagement = topicStems.filter((keyword) => lowerText.includes(keyword)).length;
  const finalNewArgument = detectFinalNewArgument(speeches);
  const claims = extractClaims(sideSentences);

  // Nonsense / non-substantive text ("n", "phones bad") cannot earn real argument scores.
  const meaningfulWords = countMeaningfulWords(combinedText);
  const nonSubstantive = speeches.length > 0 && (meaningfulWords < 6 || (!hasClaim(combinedText) && meaningfulWords < 12));

  // SIDE FIDELITY: Government must support the motion, Opposition must oppose it. A clear margin of
  // wrong-side language (>= 2) is a real inversion. A single stray hit — often just the motion quoted
  // back while attacking it — is not, so genuine speeches that echo the motion are not falsely flagged.
  const supportSignal = countMarkers(combinedText, SUPPORT_MARKERS);
  const opposeSignal = countMarkers(combinedText, OPPOSE_MARKERS);
  const sideInverted =
    side === "GOVERNMENT" ? opposeSignal - supportSignal >= 2 : supportSignal - opposeSignal >= 2;

  // Substance gate: a speech only earns weighing/refutation/impact credit if it shows REAL content —
  // a genuine warrant, a concrete impact, evidence, or real engagement with the motion. A speech that
  // is only ballot jargon (e.g. "judge should prefer us for clearer causation and lower risk") with no
  // proven claim is treated as empty and penalized instead of rewarded.
  const substanceSignals = realWarrant + topicEngagement + (impact > 0 ? 1 : 0) + (evidence > 0 ? 1 : 0);
  const hasSubstance = substanceSignals >= 2;
  // A speech is "mostly jargon" when it leans on empty ballot phrases but never engages the motion's
  // own terms. Stacking two or more empty phrases while saying nothing topic-specific is the tell —
  // a stray "because" or "benefit" glued to jargon ("because we have clearer causation") does not
  // count as real substance. A genuinely on-topic speech (topicEngagement > 0) is never flagged.
  const isMostlyJargon =
    topicEngagement === 0 &&
    ((hardJargon >= 1 && realWarrant === 0 && substanceSignals <= 1) || hardJargon >= 2);
  const grounded = isMostlyJargon ? 0 : 1;
  // Jargon only costs points when it is NOT backed by substance: a speech full of real argument may
  // freely use the word "weighing" or "clash"; a speech that is only those words is penalized.
  const jargonPenalty = isMostlyJargon ? hardJargon * 6 + 22 : hasSubstance ? 0 : jargon * 4;
  // "Abstract" = polished/moral language that never engages the motion and never explains anything
  // (no topic terms, no real warrant). Words like "fairness" or "harm" should NOT earn impact credit
  // on their own — e.g. "fairness has two sides" must not out-score concrete safety reasoning.
  const abstract = !isMostlyJargon && topicEngagement === 0 && realWarrant === 0;
  const groundedValue = isMostlyJargon ? 0 : abstract ? 0.35 : 1;

  const lengthBonus = Math.min(16, wordCount / 14);
  const vaguePenalty = vague * 9 + (wordCount > 220 && warrant + impact + weighing + evidence < 4 ? 10 : 0);
  const finalSpeechText = speeches[speeches.length - 1]?.content ?? "";
  const directAnswerBonus =
    !isMostlyJargon && opponentReference > 0 && refutation > 0
      ? (realWarrant > 0 ? 7 : 0) + (impact > 0 ? 4 : 0) + (weighing > 0 ? 6 : 0) + (evidence > 0 ? 3 : 0)
      : 0;
  const finalSpeechScore = finalSpeechText
    ? clamp(
        42 +
          (isMostlyJargon ? 0 : countMarkers(finalSpeechText, REFUTATION_MARKERS) * 9) +
          (isMostlyJargon ? 0 : countMarkers(finalSpeechText, WEIGHING_MARKERS) * 14) +
          (isMostlyJargon ? 0 : countMarkers(finalSpeechText, REAL_WARRANT_MARKERS) * 7) +
          (isMostlyJargon ? 0 : countMarkers(finalSpeechText, IMPACT_MARKERS) * 5) -
          finalNewArgument * 14 -
          jargonPenalty
      )
    : 45;

  const scores = {
    claimClarity: clamp(36 + lengthBonus + claims.length * 9 + signpost * 3 - vaguePenalty - jargonPenalty),
    warrant: clamp(30 + warrant * 15 + Math.min(10, wordCount / 30) - vague * 7 - jargonPenalty),
    mechanism: clamp(28 + grounded * realWarrant * 16 + (grounded && impact > 0 ? 8 : 0) - vague * 5 - jargonPenalty),
    impact: clamp(30 + groundedValue * impact * 9 + groundedValue * warrant * 2 - vague * 5 - jargonPenalty),
    refutation: clamp(26 + grounded * (refutation * 10 + opponentReference * 7) + directAnswerBonus - vague * 4 - jargonPenalty),
    weighing: clamp(24 + groundedValue * weighing * 18 + (!isMostlyJargon && !abstract && impact > 1 ? 5 : 0) - vague * 4 - jargonPenalty),
    evidence: clamp(25 + evidence * 14 + Math.min(8, wordCount / 45) - vague * 5 - jargonPenalty),
    motionConnection: clamp(34 + topicEngagement * 16 + (topicEngagement === 0 ? -16 : 0)),
    // Did the side actually argue its own side with real positions, instead of conceding, drifting, or
    // arguing the WRONG side? A clear side inversion tanks this; jargon and vagueness lower it.
    sideFidelity: sideInverted
      ? clamp(12 - vague * 2)
      : clamp(46 + claims.length * 10 + (realWarrant > 0 ? 10 : 0) - vague * 6 - (isMostlyJargon ? 28 : 0)),
    // Did the side directly answer the other side's strongest material — the central clash — rather
    // than sounding polished while never engaging it? Polished-but-vague speeches score low here.
    centralClashResponse: clamp(22 + grounded * (opponentReference * 9 + refutation * 7 + directAnswerBonus) - vague * 5 - jargonPenalty),
    organization: clamp(38 + signpost * 11 + Math.min(10, sideSentences.length * 2) - vague * 3),
    responsiveness: clamp(30 + grounded * (opponentReference * 8 + refutation * 7) + Math.round(directAnswerBonus / 2) - vague * 4 - jargonPenalty),
    finalSpeech: finalSpeechScore,
    ruleCompliance: clamp(88 - finalNewArgument * 22 - vague * 2),
    style: clamp(45 + Math.min(18, wordCount / 18) + signpost * 5 - vague * 5),
    overall: 0
  };

  // A nonsense / non-substantive speech earns no real argument credit, whatever stray markers it hit.
  if (nonSubstantive) {
    scores.claimClarity = Math.min(scores.claimClarity, 12);
    scores.warrant = Math.min(scores.warrant, 10);
    scores.mechanism = Math.min(scores.mechanism, 10);
    scores.impact = Math.min(scores.impact, 10);
    scores.refutation = Math.min(scores.refutation, 12);
    scores.weighing = Math.min(scores.weighing, 10);
    scores.evidence = Math.min(scores.evidence, 10);
    scores.motionConnection = Math.min(scores.motionConnection, 10);
    scores.centralClashResponse = Math.min(scores.centralClashResponse, 10);
    scores.sideFidelity = Math.min(scores.sideFidelity, 12);
  }

  scores.overall = clamp(
    scores.claimClarity * 0.1 +
      scores.warrant * 0.11 +
      scores.mechanism * 0.08 +
      scores.impact * 0.1 +
      scores.refutation * 0.12 +
      scores.weighing * 0.12 +
      scores.evidence * 0.08 +
      scores.motionConnection * 0.06 +
      scores.centralClashResponse * 0.08 +
      scores.sideFidelity * 0.03 +
      scores.organization * 0.04 +
      scores.responsiveness * 0.04 +
      scores.finalSpeech * 0.04 -
      (isMostlyJargon ? 10 : 0) -
      (sideInverted ? 18 : 0)
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
      finalNewArgument,
      jargon,
      topicEngagement,
      realWarrant
    },
    isMostlyJargon,
    nonSubstantive,
    jargonPhrase,
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
      `Best idea: ${cleanClaim(side.bestClaim)}`,
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

// Names the real debate skill to drill next, ordered by the weakest part of the argument chain.
function practiceSkillFor(student: SideMetrics): string {
  if (student.scores.claimClarity < 60 || student.scores.warrant < 60) {
    return "claim-warrant-impact: build each point as a clear claim, a 'because' warrant, and a concrete impact";
  }

  if (student.scores.mechanism < 60) {
    return "mechanism analysis: explain HOW your argument actually produces its effect, step by step";
  }

  if (student.scores.refutation < 60) {
    return "rebuttal: name the opponent's exact claim, attack its weakest link, then compare to your side";
  }

  if (student.scores.evidence < 60) {
    return "evidence comparison: support the warrant with a concrete example, not just assertion";
  }

  if (student.scores.weighing < 65) {
    return "impact calculus / weighing: compare magnitude, probability, timeframe, scope, and reversibility";
  }

  if (student.scores.motionConnection < 60) {
    return "motion framing: tie every argument back to the specific thing the motion changes";
  }

  return "collapse: spend your final speech on the one issue that decides the round";
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
    {
      key: "argument",
      label: "Claim",
      score: student.scores.claimClarity,
      reason: student.nonSubstantive
        ? "This speech was too short or unclear to count as an argument. Make one clear claim about the motion and give a reason for it."
        : scoreReason("claim clarity", student.scores.claimClarity, student)
    },
    { key: "warrant", label: "Warrant", score: student.scores.warrant, reason: scoreReason("warrant/reasoning", student.scores.warrant, student) },
    { key: "mechanism", label: "Mechanism", score: student.scores.mechanism, reason: scoreReason("mechanism", student.scores.mechanism, student) },
    { key: "impact", label: "Impact", score: student.scores.impact, reason: scoreReason("impact", student.scores.impact, student) },
    { key: "refutation", label: "Refutation", score: student.scores.refutation, reason: scoreReason("refutation", student.scores.refutation, student) },
    { key: "clash", label: "Weighing", score: student.scores.weighing, reason: scoreReason("weighing", student.scores.weighing, student) },
    { key: "contentEvidence", label: "Evidence", score: student.scores.evidence, reason: scoreReason("evidence/examples", student.scores.evidence, student) },
    {
      key: "collapse",
      label: "Collapse / strategy",
      score: student.scores.finalSpeech,
      reason:
        student.scores.finalSpeech >= 65
          ? "The closing focused on the issues that actually decide the round rather than re-listing everything."
          : "The closing did not collapse to the one or two issues that win the round."
    },
    {
      key: "motionConnection",
      label: "Motion connection",
      score: student.scores.motionConnection,
      reason:
        student.counts.topicEngagement > 0
          ? `The argument engaged the actual terms of the motion, which is what keeps it on-topic.`
          : `This did not clearly connect to the motion. Argue about the specific thing the motion changes, not the subject in general.`
    },
    {
      key: "sideFidelity",
      label: "Side fidelity",
      score: student.scores.sideFidelity,
      reason:
        student.scores.sideFidelity >= 65
          ? "Argued its own side with clear positions instead of conceding or drifting."
          : "Did not firmly hold its side — too much agreement, vagueness, or drift away from a clear position."
    },
    {
      key: "centralClashResponse",
      label: "Central clash response",
      score: student.scores.centralClashResponse,
      reason:
        student.scores.centralClashResponse >= 65
          ? "Directly engaged the other side's strongest argument — the central clash — not just its own case."
          : "Sounded polished but did not directly answer the other side's strongest argument. Name their best point and beat it."
    },
    {
      key: "emptyJargon",
      label: "Empty jargon penalty",
      score: clamp(100 - student.counts.jargon * 9 - (student.isMostlyJargon ? 45 : 0)),
      reason:
        student.counts.jargon === 0
          ? "No empty debate vocabulary — points stood on real substance."
          : `Leaned on debate vocabulary${student.jargonPhrase ? ` like "${student.jargonPhrase}"` : ""}; such words only count when a proven claim sits behind them.`
    },
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

function winnerFromTranscriptScores(government: SideMetrics, opposition: SideMetrics): DebateSide {
  const governmentTieBreak =
    government.scores.refutation * 1.3 +
    government.scores.weighing * 1.35 +
    government.scores.warrant +
    government.scores.impact +
    government.scores.evidence * 0.8 +
    government.scores.finalSpeech * 0.7 -
    government.dropped.length * 5 -
    government.counts.vague * 4 -
    government.counts.finalNewArgument * 4 -
    government.counts.jargon * 6 -
    (government.isMostlyJargon ? 30 : 0);
  const oppositionTieBreak =
    opposition.scores.refutation * 1.3 +
    opposition.scores.weighing * 1.35 +
    opposition.scores.warrant +
    opposition.scores.impact +
    opposition.scores.evidence * 0.8 +
    opposition.scores.finalSpeech * 0.7 -
    opposition.dropped.length * 5 -
    opposition.counts.vague * 4 -
    opposition.counts.finalNewArgument * 4 -
    opposition.counts.jargon * 6 -
    (opposition.isMostlyJargon ? 30 : 0);

  if (government.scores.overall !== opposition.scores.overall) {
    return government.scores.overall > opposition.scores.overall ? "GOVERNMENT" : "OPPOSITION";
  }

  if (governmentTieBreak !== oppositionTieBreak) {
    return governmentTieBreak > oppositionTieBreak ? "GOVERNMENT" : "OPPOSITION";
  }

  if (government.counts.words !== opposition.counts.words) {
    return government.counts.words > opposition.counts.words ? "GOVERNMENT" : "OPPOSITION";
  }

  return government.combinedText.localeCompare(opposition.combinedText) > 0 ? "GOVERNMENT" : "OPPOSITION";
}

function winnerSelectionReason(winner: SideMetrics, loser: SideMetrics) {
  const winnerAdvantages = [
    winner.scores.refutation > loser.scores.refutation ? "more direct refutation" : null,
    winner.scores.weighing > loser.scores.weighing ? "better impact comparison" : null,
    winner.scores.warrant > loser.scores.warrant ? "clearer warrants" : null,
    winner.scores.evidence > loser.scores.evidence ? "more concrete examples or support" : null,
    winner.dropped.length < loser.dropped.length ? "fewer dropped claims" : null,
    winner.counts.vague < loser.counts.vague ? "less vague assertion" : null
  ].filter((item): item is string => Boolean(item));

  return winnerAdvantages.length > 0
    ? `${sideLabel(winner.side)} won because it had ${winnerAdvantages.slice(0, 3).join(", ")} in the transcript.`
    : `${sideLabel(winner.side)} won the close tie-break on the stronger final comparative position in the transcript.`;
}

function betterSentenceFor(student: SideMetrics, opponent: SideMetrics) {
  const opponentClaim = opponent.bestClaim ? cleanClaim(opponent.bestClaim, 120) : "their main argument";

  if (student.scores.weighing < 68) {
    return `Even if it's true that ${opponentClaim}, my side matters more because the harm I'm describing hits more people, more often, and is harder to undo.`;
  }

  if (student.scores.refutation < 68) {
    return `It's claimed that ${opponentClaim}, but that doesn't actually answer my point — it assumes the policy works without showing how.`;
  }

  return `My argument isn't just that this sounds fair; it's that the specific change I'm proposing alters who is affected, how often, and with what result.`;
}

function motionLabel(topic: string) {
  const cleaned = topic
    .replace(/^\s*this house (would|believes that|believes|supports|opposes|that)?\s*/i, "")
    .replace(/\s+/g, " ")
    .replace(/[.\s]+$/, "")
    .trim();

  return cleaned.length > 4 ? cleaned : topic.replace(/[.\s]+$/, "").trim();
}

export function buildTranscriptBasedDebateJudge(input: TranscriptJudgeInput) {
  const eventType = input.eventType ?? "PARLIAMENTARY_DEBATE";
  const topicKeywords = keywords(input.topic);
  const motion = motionLabel(input.topic);
  const government = analyzeSide("GOVERNMENT", input.transcript, topicKeywords);
  const opposition = analyzeSide("OPPOSITION", input.transcript, topicKeywords);
  government.dropped = unansweredClaims(opposition.claims, government.combinedText, government.scores.responsiveness);
  opposition.dropped = unansweredClaims(government.claims, opposition.combinedText, opposition.scores.responsiveness);
  const winner = winnerFromTranscriptScores(government, opposition);
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
  const winnerReason = winnerSelectionReason(winnerMetrics, loserMetrics);
  const keyClash = `The debate really turned on whether ${cleanClaim(government.bestClaim, 110)} outweighed ${cleanClaim(opposition.bestClaim, 110)}. ${sideLabel(winner)} won that clash because ${
    winnerMetrics.scores.weighing > loserMetrics.scores.weighing
      ? "it made the more substantive comparison between the impacts"
      : "its reasoning was more complete than the answer it got back"
  }.`;
  const reasonForDecision = `${sideLabel(winner)} wins on this transcript, not by default, scoring ${winnerMetrics.scores.overall} to ${loserMetrics.scores.overall}. ${winnerReason} Its strongest idea was that ${cleanClaim(winnerMetrics.bestClaim)}. ${sideLabel(loser)} ${loserMetrics.dropped[0] ? `left an important point unanswered: ${cleanClaim(loserMetrics.dropped[0])}.` : `had a weakest point — ${cleanClaim(loserMetrics.weakestClaim)} — that still lacked the warrant, impact, or comparison needed to overtake the winning argument.`}`;

  const jargonySide = government.isMostlyJargon ? government : opposition.isMostlyJargon ? opposition : null;
  const emptyPhraseWarning = jargonySide
    ? `${sideLabel(jargonySide.side)} leaned on debate-sounding language${jargonySide.jargonPhrase ? ` like "${jargonySide.jargonPhrase}"` : ""} without proving the underlying argument. That is not enough on its own: it has to explain what causes what, why the link is true, and how it applies to "${motion}". It did not win on that language.`
    : student.counts.jargon > 0
      ? `Watch the weighing words${student.jargonPhrase ? ` like "${student.jargonPhrase}"` : ""}: they only count when you have already proven the claim, the warrant, and the impact behind them.`
      : null;

  const motionConnection =
    student.counts.topicEngagement >= 2
      ? `Your argument stayed connected to the motion "${motion}" by engaging its actual terms, which is what a judge needs to see.`
      : `This was weak because it did not clearly tie back to the motion "${motion}". Name the specific thing the motion changes and argue about that, not the topic in general.`;

  const mechanismCheck =
    student.counts.realWarrant > 0 && student.scores.warrant >= 60
      ? `You explained at least one cause-and-effect ("because"/"leads to") rather than only asserting it, which is the right move. Tighten it so every claim has that link.`
      : `You needed to explain the mechanism: HOW does your claim actually produce the result you want on "${motion}"? Right now the cause-and-effect is asserted, not shown.`;

  const betterVersion = `Instead of a bare label, write a full argument: ${betterSentence}`;

  const fairWinnerLogic = `${sideLabel(winner)} won on real argument quality, not on debate vocabulary. ${winnerReason}${
    loserMetrics.isMostlyJargon
      ? ` ${sideLabel(loser)} mostly used ballot phrases without a proven claim, so that language earned no credit.`
      : ""
  }`;

  const realArgumentQuality = winnerMetrics.isMostlyJargon
    ? `Neither side proved much, but ${sideLabel(winner)} edged it. Both still need a real claim-warrant-impact chain tied to "${motion}".`
    : `${sideLabel(winner)} proved the more complete argument on "${motion}" — a claim with a warrant and an impact the judge could actually weigh${
        loserMetrics.isMostlyJargon ? `, while ${sideLabel(loser)} mostly asserted debate vocabulary.` : "."
      }`;

  const weighingCheck =
    student.scores.weighing >= 70 && !student.isMostlyJargon
      ? `You compared impacts with real substance (why yours matters more), which is what weighing means.`
      : `Weighing was missing or only verbal. Don't just say you "outweigh" — compare on magnitude, probability, timeframe, scope, or reversibility and explain why your impact wins.`;

  const droppedArguments = student.dropped[0]
    ? `You did not answer the opponent's point that ${cleanClaim(student.dropped[0])}. An unanswered argument is treated as conceded.`
    : `No major argument was fully dropped, but extend your answers — a one-line mention is not the same as engaging the point.`;

  const practiceSkill = practiceSkillFor(student);
  const whyWinnerWon = `${sideLabel(winner)} won because it proved the more complete argument: ${cleanClaim(winnerMetrics.bestClaim, 120)}.`;
  const whyLoserLost = loserMetrics.isMostlyJargon
    ? `${sideLabel(loser)} leaned on debate vocabulary without proving a real claim.`
    : `${sideLabel(loser)} fell short because its key point — ${cleanClaim(loserMetrics.weakestClaim, 120)} — lacked enough warrant, impact, or direct clash.`;

  // Proof the judge read the whole transcript: name each side's best material (clean paraphrase) and
  // explain, in plain English, why that clash decided the round.
  const roundDecidingClash = {
    governmentBestArgument: cleanClaim(government.bestClaim),
    oppositionBestAnswer: cleanClaim(opposition.bestClaim),
    whyItDecides: `${sideLabel(winner)} takes the round-deciding clash: ${
      loserMetrics.isMostlyJargon
        ? `${sideLabel(loser)} leaned on debate vocabulary without proving its case`
        : loserMetrics.dropped[0]
          ? `${sideLabel(loser)} left "${cleanClaim(loserMetrics.dropped[0], 90)}" unanswered`
          : `${sideLabel(loser)} had the weaker warrant and impact on the central question`
    }, while ${sideLabel(winner)} ${
      winnerMetrics.scores.weighing > loserMetrics.scores.weighing
        ? "made the clearer impact comparison"
        : winnerMetrics.scores.motionConnection > loserMetrics.scores.motionConnection
          ? "stayed more tightly connected to the motion"
          : "gave the more complete reasoning"
    }.`
  };

  return {
    overallScore: student.scores.overall,
    categoryScores: buildCategoryScores(student),
    sharedSpeaking: sharedSpeakingFor(student),
    speakerScores: buildSpeakerScores(government, opposition),
    teamWinner: winner,
    losingSide: loser,
    confidenceLevel: confidence,
    shortReasonForDecision: `${sideLabel(winner)} wins, ${confidence === "high" ? "fairly clearly" : confidence === "medium" ? "but not by a lot" : "but only just"}. The clearer topic-specific argument was that ${cleanClaim(winnerMetrics.bestClaim, 120)}. ${
      loserMetrics.isMostlyJargon
        ? `${sideLabel(loser)} mostly leaned on debate vocabulary without proving the claim behind it.`
        : `${sideLabel(loser)} needed more ${loserMetrics.scores.warrant < 60 ? "warrant" : loserMetrics.scores.weighing < 60 ? "comparison" : "concrete impact"} to overtake it.`
    }`,
    longReasonForDecision: reasonForDecision,
    reasonForDecision,
    sideFeedback: {
      government: governmentFeedback,
      opposition: oppositionFeedback
    },
    sideAnalysis: {
      government: {
        whatTheyClaimed: government.claims.map((claim) => cleanClaim(claim)),
        bestArgument: cleanClaim(government.bestClaim),
        weakestArgument: cleanClaim(government.weakestClaim),
        failedToAnswer: government.dropped,
        dropped: government.dropped,
        neededMoreWarrant: government.scores.warrant < 68 ? `Explain why ${cleanClaim(government.bestClaim, 120)} is true, not just that it matters.` : "Warrants were present.",
        neededMoreImpact: government.scores.impact < 68 ? "Add a concrete harm or benefit and explain who experiences it." : "Impacts were present.",
        neededMoreWeighing: government.scores.weighing < 68 ? "Compare magnitude, probability, timeframe, or reversibility against the opposition." : "Some weighing was present.",
        vagueOrUnsupported: government.counts.vague > 0 || government.scores.evidence < 65 ? `Most unsupported part: ${cleanClaim(government.weakestClaim, 130)}.` : "No major unsupported claim stood out.",
        persuasiveReframe: government.scores.weighing >= 76 ? "Created a usable ballot frame." : "Did not clearly reframe the round.",
        hiddenAssumptionAttack: government.scores.refutation >= 76 ? "Pressed an assumption in the opposing case." : "Needed to expose the opponent's hidden assumption more directly."
      },
      opposition: {
        whatTheyClaimed: opposition.claims.map((claim) => cleanClaim(claim)),
        bestArgument: cleanClaim(opposition.bestClaim),
        weakestArgument: cleanClaim(opposition.weakestClaim),
        failedToAnswer: opposition.dropped,
        dropped: opposition.dropped,
        neededMoreWarrant: opposition.scores.warrant < 68 ? `Explain why ${cleanClaim(opposition.bestClaim, 120)} is true, not just that it matters.` : "Warrants were present.",
        neededMoreImpact: opposition.scores.impact < 68 ? "Add a concrete harm or benefit and explain who experiences it." : "Impacts were present.",
        neededMoreWeighing: opposition.scores.weighing < 68 ? "Compare magnitude, probability, timeframe, or reversibility against the government." : "Some weighing was present.",
        vagueOrUnsupported: opposition.counts.vague > 0 || opposition.scores.evidence < 65 ? `Most unsupported part: ${cleanClaim(opposition.weakestClaim, 130)}.` : "No major unsupported claim stood out.",
        persuasiveReframe: opposition.scores.weighing >= 76 ? "Created a usable ballot frame." : "Did not clearly reframe the round.",
        hiddenAssumptionAttack: opposition.scores.refutation >= 76 ? "Pressed an assumption in the opposing case." : "Needed to expose the opponent's hidden assumption more directly."
      }
    },
    transcriptFeedback: {
      studentSide,
      strongestClaim: `You argued that ${cleanClaim(student.bestClaim)}.`,
      weakestClaim: `Your weakest moment was the idea that ${cleanClaim(student.weakestClaim)}.`,
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
      modelRewrite: `Your idea — ${cleanClaim(student.bestClaim, 110)} — gets stronger like this: "${betterSentence}"`,
      skillToPractice: studentRecommendation.lessonSlug
    },
    keyClash,
    strongestArgument: `Best winning argument: "${excerpt(winnerMetrics.bestClaim)}."`,
    weakestArgument: `Weakest losing-side argument: "${excerpt(loserMetrics.weakestClaim)}."`,
    strengths: [
      `Your strongest idea: ${cleanClaim(student.bestClaim)}.`,
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
      reasonWinnerSelected: winnerReason
    },
    judgeFairnessReport: {
      centralClash: keyClash,
      realArgumentQuality,
      emptyPhraseWarning,
      droppedArguments,
      motionConnection,
      mechanismCheck,
      weighingCheck,
      betterVersion,
      fairWinnerLogic,
      practiceSkill,
      whyWinnerWon,
      whyLoserLost
    },
    roundDecidingClash,
    readinessForNextLevel: {
      ready: student.scores.overall >= 82 && student.scores.weighing >= 75 && student.scores.refutation >= 75,
      rationale:
        student.scores.overall >= 82
          ? "The transcript shows a strong foundation, but promotion depends on repeating this with direct clash and clean weighing."
          : "Keep training before the next level: the speech still needs more warrant, impact comparison, or direct clash.",
      nextMilestone: "Complete a judged round where your final speech answers the opponent's best argument and weighs your impact in one clear voter."
    },
    fallbackNotice: "AI is temporarily unavailable, so we used a backup response.",
    eventType,
    topic: input.topic,
    organization: input.organization,
    level: input.level
  };
}
