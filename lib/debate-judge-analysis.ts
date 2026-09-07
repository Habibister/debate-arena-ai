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
  /** ABSENT when nothing measured it. A missing value means NOT MEASURED, never a low score. */
  organization?: number;
  vocabulary: number;
  /** ABSENT since 2026-09-07: was (impact + weighing + warrant) / 3, and weighing was a marker count. */
  persuasion?: number;
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
    evidence: number;
    motionConnection: number;
    sideFidelity: number;
    centralClashResponse: number;
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

// RETAINED but UNREAD as of 2026-09-07, deliberately, the same way SIGNPOST_MARKERS was kept after
// its withdrawal: the list is the record of what the discredited proxy counted. Nothing may read it
// again without a measurement that survives the minimal-pair test in scripts/judge-quality-smoke.ts.
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

// WITHDRAWN 2026-09-06. These twelve substrings were counted and fed into claimClarity (+3 each),
// organization (+11) and style (+5). Measured against the Signposting lesson's own material, the
// count was INVERTED, not weak: the lesson's model answer scored 57 while the label the lesson calls
// WRONG scored 73, ordinal stuffing with no navigation at all scored 95, and appending marker words
// to unchanged substance moved a speech from 40 to 100. The count no longer reaches any score. The
// list is kept, unread, next to the finding — deleting it would delete the record of what was wrong.
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
  const vaguePenalty = vague * 9 + (wordCount > 220 && warrant + impact + evidence < 3 ? 10 : 0);
  const finalSpeechText = speeches[speeches.length - 1]?.content ?? "";
  const directAnswerBonus =
    !isMostlyJargon && opponentReference > 0 && refutation > 0
      ? (realWarrant > 0 ? 7 : 0) + (impact > 0 ? 4 : 0) + (evidence > 0 ? 3 : 0)
      : 0;
  const finalSpeechScore = finalSpeechText
    ? clamp(
        42 +
          (isMostlyJargon ? 0 : countMarkers(finalSpeechText, REFUTATION_MARKERS) * 9) +
          (isMostlyJargon ? 0 : countMarkers(finalSpeechText, REAL_WARRANT_MARKERS) * 7) +
          (isMostlyJargon ? 0 : countMarkers(finalSpeechText, IMPACT_MARKERS) * 5) -
          finalNewArgument * 14 -
          jargonPenalty
      )
    : 45;

  const scores = {
    claimClarity: clamp(36 + lengthBonus + claims.length * 9 - vaguePenalty - jargonPenalty),
    warrant: clamp(30 + warrant * 15 + Math.min(10, wordCount / 30) - vague * 7 - jargonPenalty),
    mechanism: clamp(28 + grounded * realWarrant * 16 + (grounded && impact > 0 ? 8 : 0) - vague * 5 - jargonPenalty),
    impact: clamp(30 + groundedValue * impact * 9 + groundedValue * warrant * 2 - vague * 5 - jargonPenalty),
    refutation: clamp(26 + grounded * (refutation * 10 + opponentReference * 7) + directAnswerBonus - vague * 4 - jargonPenalty),
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
    responsiveness: clamp(30 + grounded * (opponentReference * 8 + refutation * 7) + Math.round(directAnswerBonus / 2) - vague * 4 - jargonPenalty),
    finalSpeech: finalSpeechScore,
    ruleCompliance: clamp(88 - finalNewArgument * 22 - vague * 2),
    style: clamp(45 + Math.min(18, wordCount / 18) - vague * 5),
    overall: 0
  };

  // A nonsense / non-substantive speech earns no real argument credit, whatever stray markers it hit.
  if (nonSubstantive) {
    scores.claimClarity = Math.min(scores.claimClarity, 12);
    scores.warrant = Math.min(scores.warrant, 10);
    scores.mechanism = Math.min(scores.mechanism, 10);
    scores.impact = Math.min(scores.impact, 10);
    scores.refutation = Math.min(scores.refutation, 12);
    scores.evidence = Math.min(scores.evidence, 10);
    scores.motionConnection = Math.min(scores.motionConnection, 10);
    scores.centralClashResponse = Math.min(scores.centralClashResponse, 10);
    scores.sideFidelity = Math.min(scores.sideFidelity, 12);
  }

  // WEIGHTS. Organization carried 0.04 and has been withdrawn — it was a substring count, not a
  // measure — so its share is redistributed PROPORTIONALLY across the twelve legitimate categories
  // (each old weight / 0.96) rather than deleted or handed to a chosen favourite. The relative
  // importance of every surviving category is unchanged and the total is still exactly 1.00, so a
  // future ballot stays on the same scale instead of dropping about four points for everyone.
  //
  // 2026-09-07: weighing (0.12) is withdrawn for the same reason, leaving 0.84 of truthful weight, so
  // the divisor moves 0.96 -> 0.84 and every surviving weight is again scaled rather than reassigned.
  // Measured on matched transcripts: an honest speech gains about 3-4 points and a marker-stuffed one
  // loses about 5, which is the false input leaving the ballot rather than anyone's debating changing.
  scores.overall = clamp(
    scores.claimClarity * (0.1 / 0.84) +
      scores.warrant * (0.11 / 0.84) +
      scores.mechanism * (0.08 / 0.84) +
      scores.impact * (0.1 / 0.84) +
      scores.refutation * (0.12 / 0.84) +
      scores.evidence * (0.08 / 0.84) +
      scores.motionConnection * (0.06 / 0.84) +
      scores.centralClashResponse * (0.08 / 0.84) +
      scores.sideFidelity * (0.03 / 0.84) +
      scores.responsiveness * (0.04 / 0.84) +
      scores.finalSpeech * (0.04 / 0.84) -
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
      `Established a baseline position for the side.`
    ],
    missed: missed.length > 0 ? missed : ["No major collapse, but the side could still make the ballot story more explicit."]
  };
}

/**
 * M13E1C: these emit slugs that RESOLVE. They previously emitted `debate-*-lesson` names that
 * matched nothing — every post-round recommendation link 404'd. Reports already stored with the old
 * names keep working through the alias map in `lib/education/slug-map.ts`; this only stops new ones
 * from being written broken. `debate-weighing` is the seeded skill, because its authored lesson is
 * held, so it resolves to that skill's honest compatibility page rather than to nothing.
 */
function recommendationForStudent(student: SideMetrics) {
  if (student.scores.refutation < 65) {
    return {
      lessonSlug: "debate-refutation",
      reason: "Practice answering the opponent's exact claim before adding new offense.",
      priority: "high" as const
    };
  }

  if (student.scores.evidence < 65) {
    return {
      lessonSlug: "claim-warrant-impact",
      reason: "Add examples or evidence that prove the warrant, not just the claim.",
      priority: "medium" as const
    };
  }

  // This used to fall through to Signposting whenever refutation, weighing and evidence all cleared
  // 65 — a DEFAULT dressed as a diagnosis, and the only remaining place a signposting recommendation
  // could come from once the organization proxy was withdrawn. Nothing in this analyzer measures
  // signposting, so nothing here may recommend it. The weakest surviving category is named instead.
  return {
    lessonSlug: "claim-warrant-impact",
    reason: "Tighten the claim, the warrant behind it, and the impact it leads to.",
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

// M14 Phase 1d (audit G21): one card per REAL participant. A round in this product has exactly two
// participants — the student on one side and one opponent on the other (the Debate row stores
// studentSide/opponentSide, and the judge route requires every speech before judging) — yet this
// function used to fabricate FOUR ranked speakers ("Government 1/2", "Opposition 1/2") by splitting
// each side's aggregate metrics. Cards, names, ranks, scores and feedback are never invented for
// speakers who did not exist. Identity is SERVER-controlled: the labels below derive from the
// persisted sides, never from model output (the provider enhancement is prose-only and is merged by
// an explicit whitelist that cannot touch speakerScores). The card order follows the real round
// structure — Government/Affirmative first — regardless of which side the student took; the
// `role` field carries the learner-vs-opponent distinction without exposing any account data.
function buildSpeakerScores(government: SideMetrics, opposition: SideMetrics, studentSide: DebateSide) {
  const participants = [
    {
      speaker: sideLabel("GOVERNMENT"),
      team: "GOVERNMENT" as const,
      role: (studentSide === "GOVERNMENT" ? "student" : "opponent") as "student" | "opponent",
      score: speakerPoint(government.scores.overall, 0),
      rationale: scoreReason("speaker performance", government.scores.overall, government)
    },
    {
      speaker: sideLabel("OPPOSITION"),
      team: "OPPOSITION" as const,
      role: (studentSide === "OPPOSITION" ? "student" : "opponent") as "student" | "opponent",
      score: speakerPoint(opposition.scores.overall, 0),
      rationale: scoreReason("speaker performance", opposition.scores.overall, opposition)
    }
  ];

  // Rank the two real participants by speaker points; a tie keeps round order (Government first).
  const sorted = [...participants].sort((a, b) => b.score - a.score);
  return participants.map((participant) => ({
    ...participant,
    rank: (sorted.findIndex((item) => item.team === participant.team) + 1) as 1 | 2,
    descriptor: descriptorForSpeaker(participant.score)
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
    // WITHDRAWN 2026-09-07. This row was `scores.weighing`, a count of WEIGHING_MARKERS ("outweigh",
    // "magnitude", "probability", "irreversible", ...). Measured on matched transcripts it scored the
    // Weighing lesson's OWN model answer 24 — the floor, identical to attempting no weighing — and
    // scored lens words with no comparison 100. The lesson teaches the opposite in as many words:
    // "the skill is making the comparison clear, not saying the lens words". Nothing in a transcript
    // measures whether a comparison was actually made, so the ballot shows no Weighing row rather than
    // a number. Note the key was `clash` while the LABEL was "Weighing": the registry rubric and the
    // provider fallback both use `clash` to mean genuine Clash, and neither is affected.
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
    // Was the mean of style and organization. Organization is withdrawn, so this is the remaining
    // component rather than an average with a number that no longer exists — never a substitute value.
    confidence: clamp(student.scores.style),
    pacing: clamp(70 + Math.min(12, student.counts.words / 35) - student.counts.vague * 4),
    volume: 75,
    vocabulary: clamp(60 + Math.min(20, keywords(student.combinedText).length * 3)),
    // `persuasion` was (impact + weighing + warrant) / 3 and is WITHDRAWN 2026-09-07 rather than
    // recomputed: weighing was a marker count, and so are the two survivors, so an average of them
    // would be a different unsupported score rather than a repair. Omitted, never substituted.
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

  {
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
  const studentSide = normalizeStudentSide(input.studentSide);
  const student = studentSide === "GOVERNMENT" ? government : opposition;
  const opponent = studentSide === "GOVERNMENT" ? opposition : government;

  // SEMANTIC PERFORMANCE SCORING WITHDRAWN 2026-09-07.
  //
  // Everything this function used to return — a fourteen-category ballot, an overall, a winner, a
  // readiness verdict, speaker ranks, and every line of decision prose — was computed from marker
  // and length counts. Measured on length-matched fixtures:
  //
  //   * appending 29 words of grammatical nonsense containing marker words to a substantive speech
  //     moved 11 categories and raised the overall from 47 to 71 (warrant +47, mechanism +48);
  //   * 118 words of pure nonsense beat a 147-word genuinely strong speech 70 to 55, winning 11 of
  //     14 categories — only motionConnection preferred the real speech;
  //   * 50 words of nonsense flipped the decision, turning a side losing 42 to a strong opponent
  //     into a 75-point winner.
  //
  // The `nonSubstantive` guard did not stop any of it: it gates on `meaningfulWords < 6`, so it is
  // itself a length heuristic, and long nonsense passes straight through. That is the whole lesson —
  // a surface heuristic cannot certify a surface heuristic, so no further gate is added here.
  //
  // What remains is an OPERATIONAL RECORDER plus NON-SEMANTIC DIAGNOSTICS. There is no Debate
  // provider scorer to fall back to either: the provider is a prose layer over an already-scored
  // ballot and is told "Do NOT re-score and do NOT change the winner". So a round completes, the
  // transcript persists, and the ballot is UNAVAILABLE rather than invented.
  //
  // ABSENT IS NOT ZERO, NOT A LOSS, AND NOT A TIE. A missing judge is not a tied debate.
  //
  // `winnerFromTranscriptScores`, `buildCategoryScores`, `buildSpeakerScores`, `sharedSpeakingFor`
  // and the marker-driven `scores` block are retained but unread, in the same way SIGNPOST_MARKERS
  // and WEIGHING_MARKERS were kept after their withdrawals: the analysis still computes them for the
  // diagnostics below, and leaving the code in place makes a future revert a visible diff rather
  // than a silent re-addition.

  // The three diagnostics that survive, and exactly what each one measures. None of them is a
  // performance claim, none is weighted into anything, and they are deliberately NOT returned as
  // `categoryScores` — a three-row ballot would read as "these are the parts of debate that count".
  const diagnostics = {
    // Topic-stem overlap between the speech and the motion. The only measure that preferred the real
    // speech over nonsense in the fixtures above (82 to 50), because nonsense cannot fake the motion's
    // own vocabulary. It reports whether the speech engaged the motion's terms — not how well.
    motionEngaged: student.counts.topicEngagement >= 2,
    // A one-sided detector over EMPTY_JARGON_MARKERS: debate vocabulary used without a proven claim.
    // It can only ever count against, never for, so it cannot be farmed.
    emptyJargonDetected: student.isMostlyJargon || student.counts.jargon > 0,
    // Structural rule compliance: a genuinely new argument introduced in the final speech. Detected
    // from speech position, not from vocabulary.
    newArgumentInFinalSpeech: student.counts.finalNewArgument > 0,
    // Operational facts about what happened, not about how good it was.
    wordCount: student.counts.words,
    speechCount: input.transcript.filter((message) => message.role === "AFFIRMATIVE" || message.role === "NEGATIVE").length
  };

  return {
    // NO overallScore. NO categoryScores. NO teamWinner. NO losingSide. NO confidenceLevel.
    // NO sharedSpeaking. NO speakerScores. NO readinessForNextLevel. NO decision prose.
    // Each is omitted rather than defaulted, so every consumer reads NOT MEASURED.
    semanticScoring: "unavailable" as const,
    transcriptDiagnostics: diagnostics,
    // Static curriculum pointers. Identical on every transcript round, conditioned on no score, so
    // they are educational navigation rather than a diagnosis. The score-derived recommendation that
    // used to lead this list is gone with the scores it read.
    recommendedLessons: [
      {
        lessonSlug: "claim-warrant-impact",
        reason: "Strengthen every claim with a because sentence and a concrete impact.",
        priority: "medium" as const
      },
      {
        lessonSlug: "debate-weighing",
        reason: "Practice comparing why your best impact should decide the round.",
        priority: "medium" as const
      }
    ],
    strengths: [] as string[],
    weaknesses: [] as string[],
    improvementAdvice: [] as string[],
    fallbackNotice:
      "This round was recorded, and the transcript is saved. It was not scored: the practice judge cannot tell substantive argument from filler, so it does not say who won.",
    eventType,
    topic: input.topic,
    organization: input.organization,
    level: input.level,
    studentSide,
    opponentSide: opponent.side
  };
}
