// Beginner Side Coach — a SEPARATE AI role from the opponent and judge. It privately helps the
// student. It has its own system prompt (never the opponent's), receives only the public transcript
// + the student's latest speech, and never sees judge scoring or future opponent speeches. On any
// failure it returns a deterministic, track-aware fallback so the debate never breaks.
import type { Organization } from "@prisma/client";
import { runProviderCompletion, extractJson } from "@/lib/ai-providers";

export type SideCoachTranscriptLine = { role: string; content: string };

export type SideCoachInput = {
  organization: Organization;
  eventType?: string;
  studentSide?: "AFFIRMATIVE" | "NEGATIVE";
  stage?: string;
  level?: "BEGINNER" | "INTERMEDIATE" | "ELITE";
  // The actual scenario the student is working (role-play rooms) + their goals — so coaching is
  // specific to THIS situation, not generic advice.
  scenario?: string;
  goals?: string[];
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
  // One concrete example/model sentence (an improved version of the learner's wording, an opener, or
  // a short sample response). Kept separate so the UI can label it as an example, not the submission.
  example?: string;
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
    "ALWAYS ground your help in THIS specific scenario and the student's actual words — quote or closely paraphrase what they wrote. Reference the concrete situation, their stated goals, and unanswered questions. NEVER give generic advice like 'be clear and professional' or 'stay confident'.",
    'Respond ONLY as compact JSON. For turn feedback use {"strength": string, "improvement": string, "nextMove": string, "example": string} where example is ONE improved version of their weakest sentence. For a question use {"message": string, "example": string} where example is optional (an opener or short model line). Keep each field to 1-2 sentences.'
  ].join(" ");
}

export function buildSideCoachUserPrompt(input: SideCoachInput): string {
  const transcript = input.transcript.map((l) => `${l.role}: ${l.content}`).join("\n").slice(0, 6000);
  const scenario = input.scenario ? input.scenario.slice(0, 2000) : "";
  const goals = input.goals && input.goals.length > 0 ? input.goals.map((g, i) => `${i + 1}. ${g}`).join("\n") : "";
  const parts = [
    `Event/format: ${input.eventType ?? "general"}. Student side: ${input.studentSide ?? "unknown"}. Stage: ${input.stage ?? "in progress"}. Level: ${input.level ?? "BEGINNER"}.`,
    scenario ? `THE SCENARIO the student is handling:\n${scenario}` : "",
    goals ? `The student's goals:\n${goals}` : "",
    `Conversation so far:\n${transcript || "(the student hasn't responded yet)"}`
  ].filter(Boolean);

  if (input.requestType === "ask") {
    const kind = (input.askKind ?? "").toLowerCase();
    if (/start|begin/.test(kind)) {
      parts.push("The student wants help STARTING. In one or two sentences, summarize what they need to accomplish in THIS scenario, then suggest one concrete opening approach. Put a single example opening line in `example`.");
    } else if (/missing|what am i/.test(kind)) {
      parts.push("Name ONE specific requirement, goal, or question from this scenario that the student has NOT yet addressed. Be concrete — point at the exact gap, not a general reminder.");
    } else if (/simplif/.test(kind)) {
      parts.push("Re-explain THIS scenario in plain, simpler language (as if to a younger student): who wants what, and the one main thing to handle. Do not add new facts.");
    } else if (/sample|example response|show a sample/.test(kind)) {
      parts.push("Provide ONE short model response to the character's latest message (2-4 sentences) that a strong student might give in THIS scenario. Put it in `example`, and in `message` say one sentence about why it works. Make clear this is an example to learn from, not their submission.");
    } else {
      parts.push("Give the student one specific hint for the current stage of THIS scenario — reference the actual situation and their goals, not generic advice.");
    }
  } else {
    parts.push(`The student's latest response was:\n"${input.latestStudentSpeech ?? ""}"\nGive: one specific strength that QUOTES their words; one specific weakness that quotes the exact wording that's weak; a recommended next move; and in \`example\`, an improved rewrite of their weakest sentence.`);
    // C5C1b feedback-quality contract (applies to ALL turn feedback, incl. debate — these are
    // general honesty/completeness rules, consistent with the system prompt's "never fake praise").
    parts.push('HONESTY RULE: A strength must be a genuine, rubric-aligned quality demonstrated by the content itself. If the learner’s responses demonstrate no genuine rubric-aligned strength—for example, filler, word salad, unrelated language, or empty effort—set strength to exactly: "No rubric-aligned strength is demonstrated yet." Never praise effort, attempting, participation, or merely typing something.');
    parts.push("RUBRIC COMPLETENESS RULE: Evaluate the learner’s initial response and follow-up response against every supplied rubric item. Explicitly name every missing or insufficient rubric item in the improvement or nextMove feedback. The revision example must improve the complete exchange and address all identified missing rubric items, not only the final response.");
    parts.push("COMBINED-EVIDENCE RULE: Judge the initial response and follow-up as one complete attempt. A rubric item is satisfied if it is genuinely demonstrated in either response; do not mark an item missing merely because it is absent from the follow-up. Distinguish between fully demonstrated, partially demonstrated, and missing items. In `improvement` or `nextMove`, state the status of EVERY supplied rubric item by name — fully demonstrated, partially demonstrated, or missing — including any tone or in-character item.");
    parts.push('When two learner responses are supplied, the `example` must contain a revised initial response AND a revised follow-up response, clearly labeled, so the full exchange is improved. Label them exactly "INITIAL RESPONSE:" and "FOLLOW-UP RESPONSE:".');
    parts.push("CALIBRATION: The no-strength line is reserved for responses where NO rubric item is genuinely met. If at least one rubric item IS genuinely demonstrated (for example a real recommendation or a real reason), name that item as the strength and quote the learner's words — do not use the no-strength line.");
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
  const has = parsed && (parsed.message || parsed.strength || parsed.improvement || parsed.nextMove || parsed.example);
  if (!has) {
    return sideCoachFallback(input);
  }
  return {
    message: parsed.message ?? "",
    strength: parsed.strength,
    improvement: parsed.improvement,
    nextMove: parsed.nextMove,
    example: parsed.example
  };
}

export async function generateSideCoachResponse(input: SideCoachInput): Promise<SideCoachResponse> {
  try {
    const { content } = await runProviderCompletion(
      { system: buildSideCoachSystemPrompt(input), prompt: buildSideCoachUserPrompt(input), temperature: 0.5 },
      "side-coach"
    );
    return normalize(extractJson<Partial<SideCoachResponse>>(content), input);
  } catch {
    return sideCoachFallback(input);
  }
}
