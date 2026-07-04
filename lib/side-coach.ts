// Beginner Side Coach — a SEPARATE AI role from the opponent and judge. It privately helps the
// student. It has its own system prompt (never the opponent's), receives only the public transcript
// + the student's latest speech, and never sees judge scoring or future opponent speeches. Ordinary
// provider outages return a deterministic fallback; safety/rate-limit hard failures are surfaced.
import type { Organization } from "@prisma/client";
import { shouldBypassAiFallback } from "@/lib/api";
import { runProviderCompletion, extractJson } from "@/lib/ai-providers";

export type SideCoachTranscriptLine = { role: string; content: string };

export type SideCoachInput = {
  organization: Organization;
  eventType?: string;
  studentSide?: "AFFIRMATIVE" | "NEGATIVE";
  stage?: string;
  level?: "BEGINNER" | "INTERMEDIATE" | "ELITE";
  transcript: SideCoachTranscriptLine[];
  latestStudentSpeech?: string;
  requestType: "turn-feedback" | "ask";
  askKind?: string;
  guidanceLevel?: 1 | 2 | 3;
};

export type SideCoachResponse = {
  message: string;
  strength?: string;
  improvement?: string;
  nextMove?: string;
  unavailable?: boolean;
};

// Track-specific framing so coaching matches the event, not a generic debate.
function trackFraming(org: Organization): string {
  switch (org) {
    case "HOSA":
      return "This is HOSA health-science practice. Use correct, plain health-science terminology and stay within a student's safe role.";
    case "DECA":
      return "This is DECA role-play practice. Coach business reasoning, the recommendation, and relevant performance indicators.";
    case "MODEL_UN":
      return "This is Model UN practice. Coach country-policy consistency, diplomacy, procedure, and negotiation.";
    default:
      return "This is competitive debate. Coach claim, warrant, evidence, rebuttal, impact, and weighing.";
  }
}

function guidanceRule(level: number | undefined): string {
  if (level === 3) {
    return "You may give ONE short example sentence or opening, but never write the student's full speech.";
  }
  if (level === 1) {
    return "Give a short directional nudge only — one or two sentences. Do not write content for them.";
  }
  return "Offer a small framework or structure they can fill in (e.g. 'They argue ___; however ___; this matters because ___'). Do not write the full speech.";
}

export function buildSideCoachSystemPrompt(input: SideCoachInput): string {
  return [
    "You are a private Side Coach for a beginner competitor. You are NOT the opponent and NOT the judge.",
    "You help ONLY the student. Never argue against them, never role-play the opponent, and never reveal or invent judge scores or the opponent's future speeches.",
    trackFraming(input.organization),
    "Be encouraging, direct, specific, patient, and honest. Never insulting, never fake praise, never shaming.",
    "Explain debate terms in plain words when you use them (warrant = why your claim is true; impact = why it matters; weighing = why your impact matters more).",
    "Teach; do not do the whole task for them. " + guidanceRule(input.guidanceLevel),
    'Respond ONLY as compact JSON. For turn feedback use {"strength": string, "improvement": string, "nextMove": string}. For a question use {"message": string}. Keep each field to 1-2 sentences.'
  ].join(" ");
}

export function buildSideCoachUserPrompt(input: SideCoachInput): string {
  const transcript = input.transcript.map((l) => `${l.role}: ${l.content}`).join("\n").slice(0, 6000);
  const parts = [
    `Event/format: ${input.eventType ?? "general"}. Student side: ${input.studentSide ?? "unknown"}. Stage: ${input.stage ?? "in progress"}. Level: ${input.level ?? "BEGINNER"}.`,
    `Public transcript so far (official debate only):\n${transcript || "(no speeches yet)"}`
  ];
  if (input.requestType === "ask") {
    parts.push(`The student asked for help: "${input.askKind ?? "What should I do next?"}". Guide them without writing a finished speech.`);
  } else {
    parts.push(`The student's latest speech was:\n"${input.latestStudentSpeech ?? ""}"\nGive one specific strength (quote or closely reference their words), one specific improvement, and one recommended next move.`);
  }
  return parts.join("\n\n");
}

// Deterministic, track-aware fallback — used when the AI is unavailable so the debate continues.
export function sideCoachFallback(input: SideCoachInput): SideCoachResponse {
  const org = input.organization;
  const nextMove =
    org === "DECA"
      ? "State your recommendation clearly, then back it with a reason and a number."
      : org === "MODEL_UN"
        ? "Restate your country's position, then propose one concrete next step."
        : org === "HOSA"
          ? "Define the key term in plain words, then choose the safe, role-appropriate action."
          : "Answer their strongest point first, then add a clear impact (why it matters).";
  if (input.requestType === "ask") {
    return { message: `Start with your main claim, then add one reason and why it matters. ${nextMove}`, unavailable: true };
  }
  return {
    message: "Here's a quick read on your last point.",
    strength: "You put a clear point on the table — good start.",
    improvement: "Add the reasoning and why it matters, so it's not just a claim.",
    nextMove,
    unavailable: true
  };
}

function normalize(parsed: Partial<SideCoachResponse>, input: SideCoachInput): SideCoachResponse {
  const has = parsed && (parsed.message || parsed.strength || parsed.improvement || parsed.nextMove);
  if (!has) {
    return sideCoachFallback(input);
  }
  return {
    message: parsed.message ?? "",
    strength: parsed.strength,
    improvement: parsed.improvement,
    nextMove: parsed.nextMove
  };
}

export async function generateSideCoachResponse(input: SideCoachInput): Promise<SideCoachResponse> {
  try {
    const { content } = await runProviderCompletion(
      { system: buildSideCoachSystemPrompt(input), prompt: buildSideCoachUserPrompt(input), temperature: 0.5, maxOutputTokens: 700 },
      "side-coach"
    );
    return normalize(extractJson<Partial<SideCoachResponse>>(content), input);
  } catch (error) {
    if (shouldBypassAiFallback(error)) {
      throw error;
    }
    return sideCoachFallback(input);
  }
}
