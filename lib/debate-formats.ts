import type { DebateFormat, DebateSide, MessageRole } from "@prisma/client";
import { DEBATE_CATEGORY_OPTIONS } from "@/lib/debate-topics";

export type DebateSideChoice = DebateSide | "RANDOM";

export type DebateSpeech = {
  key: string;
  label: string;
  shortLabel: string;
  side: DebateSide;
  messageRole: Extract<MessageRole, "AFFIRMATIVE" | "NEGATIVE">;
  round: number;
  timeSeconds: number;
  graceSeconds: number;
  isRebuttal?: boolean;
  guidance: string;
};

export type DebateFormatConfig = {
  format: DebateFormat;
  label: string;
  eventType: string;
  description: string;
  prepTimeSeconds: number;
  turnTimeSeconds: number;
  graceTimeSeconds: number;
  sides: {
    affirmative: DebateSide;
    negative: DebateSide;
    affirmativeLabel: string;
    negativeLabel: string;
  };
  speeches: DebateSpeech[];
};

export const DEBATE_CATEGORIES = DEBATE_CATEGORY_OPTIONS;

export const QUICK_TURN_OPTIONS = [60, 90, 120, 240] as const;

const QUICK_DEFAULT_SECONDS = 120;
const GRACE_SECONDS = 30;
const PARLIAMENTARY_PREP_SECONDS = 300;

export const FORMAT_CARDS: Array<{
  format: DebateFormat;
  label: string;
  summary: string;
  detail: string;
  disabled?: boolean;
}> = [
  {
    format: "PARLIAMENTARY",
    label: "Parliamentary Debate",
    summary: "6 speeches plus prep",
    detail: "Government and Opposition debate a motion using official parliamentary roles."
  },
  {
    format: "QUICK_1V1",
    label: "Quick 1v1",
    summary: "Fast For/Against reps",
    detail: "A short back-and-forth round for practicing claims, rebuttals, and weighing."
  },
  {
    format: "PUBLIC_FORUM",
    label: "Public Forum",
    summary: "Constructive and summary flow",
    detail: "A simplified public-facing format focused on clear evidence and comparison."
  },
  {
    format: "PRACTICE_REBUTTAL",
    label: "Practice Rebuttal",
    summary: "Target one clash",
    detail: "A short drill built around answering an opponent's strongest point."
  },
  {
    format: "CUSTOM",
    label: "Custom format",
    summary: "Coming soon",
    detail: "Build your own speech order and timers.",
    disabled: true
  }
];

function speech(
  key: string,
  label: string,
  shortLabel: string,
  side: DebateSide,
  round: number,
  timeSeconds: number,
  guidance: string,
  isRebuttal = false
): DebateSpeech {
  return {
    key,
    label,
    shortLabel,
    side,
    messageRole: side === "GOVERNMENT" || side === "FOR" ? "AFFIRMATIVE" : "NEGATIVE",
    round,
    timeSeconds,
    graceSeconds: GRACE_SECONDS,
    isRebuttal,
    guidance
  };
}

export function buildDebateFormatConfig(format: DebateFormat, turnTimeSeconds = QUICK_DEFAULT_SECONDS): DebateFormatConfig {
  if (format === "QUICK_1V1") {
    const seconds = QUICK_TURN_OPTIONS.includes(turnTimeSeconds as (typeof QUICK_TURN_OPTIONS)[number])
      ? turnTimeSeconds
      : QUICK_DEFAULT_SECONDS;

    return {
      format,
      label: "Quick 1v1",
      eventType: "QUICK_1V1",
      description: "A fast For/Against debate with opening claims, rebuttal, and final weighing.",
      prepTimeSeconds: 0,
      turnTimeSeconds: seconds,
      graceTimeSeconds: 0,
      sides: {
        affirmative: "FOR",
        negative: "AGAINST",
        affirmativeLabel: "For",
        negativeLabel: "Against"
      },
      speeches: [
        speech("for-opening", "For opening", "For", "FOR", 1, seconds, "State your main claim, warrant, and impact."),
        speech("against-opening", "Against opening", "Against", "AGAINST", 2, seconds, "Answer the claim and introduce your best counterpoint."),
        speech("for-rebuttal", "For rebuttal", "For rebuttal", "FOR", 3, seconds, "Refute the strongest answer and weigh your impact."),
        speech("against-rebuttal", "Against rebuttal", "Against rebuttal", "AGAINST", 4, seconds, "Collapse to the most important clash and explain why Against wins.")
      ]
    };
  }

  if (format === "PUBLIC_FORUM") {
    return {
      format,
      label: "Public Forum",
      eventType: "PUBLIC_FORUM",
      description: "A simplified public-forum practice flow for evidence clarity and judge persuasion.",
      prepTimeSeconds: 0,
      turnTimeSeconds: 240,
      graceTimeSeconds: GRACE_SECONDS,
      sides: {
        affirmative: "FOR",
        negative: "AGAINST",
        affirmativeLabel: "For",
        negativeLabel: "Against"
      },
      speeches: [
        speech("for-constructive", "For constructive", "For", "FOR", 1, 240, "Present a clear case with evidence and impacts."),
        speech("against-constructive", "Against constructive", "Against", "AGAINST", 2, 240, "Present a counter-case and pressure the For side's evidence."),
        speech("for-summary", "For summary", "For summary", "FOR", 3, 120, "Extend the cleanest offense and answer the most important response."),
        speech("against-summary", "Against summary", "Against summary", "AGAINST", 4, 120, "Collapse to the winning comparison and explain the ballot.")
      ]
    };
  }

  if (format === "PRACTICE_REBUTTAL") {
    return {
      format,
      label: "Practice Rebuttal",
      eventType: "PRACTICE_REBUTTAL",
      description: "A focused drill for answering a claim, naming clash, and weighing the response.",
      prepTimeSeconds: 0,
      turnTimeSeconds: 120,
      graceTimeSeconds: 0,
      sides: {
        affirmative: "FOR",
        negative: "AGAINST",
        affirmativeLabel: "For",
        negativeLabel: "Against"
      },
      speeches: [
        speech("for-claim", "For claim", "For", "FOR", 1, 90, "Make one complete argument the opponent can answer."),
        speech("against-rebuttal", "Against rebuttal", "Against", "AGAINST", 2, 120, "Directly refute the claim, then explain the better weighing."),
        speech("for-final-weighing", "For final weighing", "For final", "FOR", 3, 90, "Defend the original claim and compare impacts.")
      ]
    };
  }

  return {
    format: "PARLIAMENTARY",
    label: "Parliamentary Debate",
    eventType: "PARLIAMENTARY_DEBATE",
    description: "A full parliamentary round with prep, Government case construction, Opposition response, and closing rebuttals.",
    prepTimeSeconds: PARLIAMENTARY_PREP_SECONDS,
    turnTimeSeconds: 420,
    graceTimeSeconds: GRACE_SECONDS,
    sides: {
      affirmative: "GOVERNMENT",
      negative: "OPPOSITION",
      affirmativeLabel: "Government / Affirmative",
      negativeLabel: "Opposition / Negative"
    },
    speeches: [
      speech("pm-constructive", "Prime Minister constructive", "PM", "GOVERNMENT", 1, 420, "Define the motion, set the case topic, and build clear contentions."),
      speech("lo-constructive", "Leader of Opposition constructive", "LO", "OPPOSITION", 2, 480, "Challenge definitions if needed, answer the case, and build Opposition pressure."),
      speech("mg-constructive", "Member of Government constructive", "MG", "GOVERNMENT", 3, 480, "Rebuild Government offense and answer Opposition's strongest attacks."),
      speech("mo-constructive", "Member of Opposition constructive", "MO", "OPPOSITION", 4, 480, "Deepen clash, extend Opposition offense, and compare against the case."),
      speech("lo-rebuttal", "Leader of Opposition rebuttal", "LO Rebuttal", "OPPOSITION", 5, 240, "No new arguments. Collapse to the key voters and explain why Opposition wins.", true),
      speech("pm-rebuttal", "Prime Minister rebuttal", "PM Rebuttal", "GOVERNMENT", 6, 300, "No new arguments. Finalize the Government ballot story and weigh impacts.", true)
    ]
  };
}

export function parseFormatConfig(value: unknown, format: DebateFormat, turnTimeSeconds?: number): DebateFormatConfig {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidate = value as Partial<DebateFormatConfig>;
    if (candidate.format && Array.isArray(candidate.speeches) && candidate.speeches.length > 0) {
      return candidate as DebateFormatConfig;
    }
  }

  return buildDebateFormatConfig(format, turnTimeSeconds);
}

export function resolveDebateSide(format: DebateFormat, choice: DebateSideChoice): DebateSide {
  const config = buildDebateFormatConfig(format);

  if (choice === "RANDOM") {
    return Math.random() >= 0.5 ? config.sides.affirmative : config.sides.negative;
  }

  if (choice === "GOVERNMENT" || choice === "FOR") {
    return config.sides.affirmative;
  }

  return config.sides.negative;
}

export function getOpponentSide(format: DebateFormat, studentSide: DebateSide): DebateSide {
  const config = buildDebateFormatConfig(format);
  return studentSide === config.sides.affirmative ? config.sides.negative : config.sides.affirmative;
}

export function sideToMessageRole(side: DebateSide): Extract<MessageRole, "AFFIRMATIVE" | "NEGATIVE"> {
  return side === "GOVERNMENT" || side === "FOR" ? "AFFIRMATIVE" : "NEGATIVE";
}

export function getSideLabel(side: DebateSide) {
  if (side === "GOVERNMENT") {
    return "Government / Affirmative";
  }

  if (side === "OPPOSITION") {
    return "Opposition / Negative";
  }

  return side === "FOR" ? "For" : "Against";
}

export function getNextSpeech(config: DebateFormatConfig, completedSpeechCount: number) {
  return config.speeches[completedSpeechCount] ?? null;
}

export function countDebateSpeeches(messages: Array<{ role: MessageRole }>) {
  return messages.filter((message) => message.role === "AFFIRMATIVE" || message.role === "NEGATIVE").length;
}

export function isSpeechComplete(messages: Array<{ role: MessageRole }>, config: DebateFormatConfig) {
  return countDebateSpeeches(messages) >= config.speeches.length;
}
