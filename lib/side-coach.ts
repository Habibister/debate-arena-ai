// Beginner Side Coach — a SEPARATE AI role from the opponent and judge. It privately helps the
// student. It has its own system prompt (never the opponent's), receives only the public transcript
// + the student's latest speech, and never sees judge scoring or future opponent speeches.
//
// On any failure it returns an explicit `unavailable` result carrying NO learner-specific feedback,
// so an outage is never rendered as coaching about the learner's own work. Callers show an honest
// unavailable state and offer a retry.
import type { Organization } from "@prisma/client";
import { runProviderCompletion, extractJson } from "@/lib/ai-providers";
import { validateAndCanonicalizeAuthoredRubricIds } from "@/lib/authored-rubric-feedback";
import { getRoleplayLesson } from "@/lib/roleplay-lessons";

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
  // Present only for authored-lesson requests — see lib/validators.ts.
  rubricIds?: string[];
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
  // Per-rubric-item verdicts, present only for authored-lesson requests (those that send rubricIds).
  // Deliberately OPAQUE here: the server cannot judge this payload, because validity depends on the
  // authored rubric AND on the learner's actual submitted text, neither of which it holds. It is
  // passed through untouched and validated in exactly one place —
  // `validateAuthoredRubricFeedback` in lib/authored-rubric-feedback.ts. Keeping a second partial
  // check here would be a mirror that can drift.
  rubricFeedback?: unknown;
  // Proof that BOTH learner responses were examined: one verified excerpt and one honest note each.
  // Separate from rubricFeedback because a response can be reviewed carefully and still demonstrate
  // no criterion — see the M7B note in lib/authored-rubric-feedback.ts. Opaque here for the same
  // reason as rubricFeedback: only the caller holds the learner's text to check it against.
  responseReview?: unknown;
  // `true` means NO evaluation happened. When set, this response carries NO learner-specific
  // feedback whatsoever — the caller must render an honest unavailable state, never a coaching card.
  unavailable?: boolean;
  // Short, non-sensitive machine-readable cause, for logs and tests. Never learner-facing prose.
  reason?: SideCoachUnavailableReason;
};

export type SideCoachUnavailableReason =
  | "provider-error"
  | "empty-response"
  | "incomplete-turn-feedback";

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

/**
 * The canonical authored-DECA rubric ids, read from the authored lesson itself (M11R8) — the SAME
 * data the practice component renders, so there is one source of truth and no second hand-maintained
 * allowlist that could drift from the lesson.
 */
export function authoredDecaRubricIds(): readonly string[] {
  const lesson = getRoleplayLesson("how-deca-roleplay-works");
  if (!lesson || lesson.practiceStatus !== "available") return [];
  return lesson.practice.write.rubric.map((item: { id: string }) => item.id);
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
    // Structured, evidence-anchored verdicts — authored-lesson requests ONLY. Gated on rubricIds so
    // Debate (no goals) and the role-play rooms (scenario goals, no IDs) keep their existing contract.
    // M11R8: the ids that reach this prompt are CANONICAL, never the caller's strings. An id is
    // untrusted input on its way into a model instruction, so anything that is not exactly the
    // authored set drops the structured block entirely rather than being interpolated.
    const canonicalRubricIds =
      input.rubricIds && input.rubricIds.length > 0
        ? validateAndCanonicalizeAuthoredRubricIds(input.rubricIds, authoredDecaRubricIds())
        : null;
    if (canonicalRubricIds?.ok) {
      // Proof-of-review, kept SEPARATE from criterion evidence (M7B). Asking for a per-response
      // excerpt here is what lets every rubric item be honestly `missing` without inventing a quote.
      parts.push(
        [
          "RESPONSE REVIEW: Return a `responseReview` array with EXACTLY TWO entries — one for the initial response and one for the follow-up response.",
          'Each entry is {"response": "initial"|"follow-up", "excerpt": string, "note": string}.',
          "`excerpt` must be a SHORT, EXACT quotation copied from the response named in `response` — never paraphrased, never taken from the other response, never your own wording.",
          "Quote a short but SPECIFIC phrase — at least a few words. A single word or a generic fragment is not evidence; the quotation must make clear which part of the response supports your note.",
          "`note` says honestly what that response contributed or failed to demonstrate. It may be critical. Do not tie it to one criterion, and do not claim anything the response did not do.",
          "Include both entries even when the response demonstrates nothing — that is exactly what the note is for."
        ].join(" ")
      );
      parts.push(
        [
          "PER-ITEM VERDICTS: Also return a `rubricFeedback` array with exactly one entry per rubric criterion.",
          `Use these EXACT rubricId values, once each, no others: ${canonicalRubricIds.ids.join(", ")}.`,
          'Each entry is {"rubricId": string, "status": "met"|"partial"|"missing", "evidence": [{"response": "initial"|"follow-up", "excerpt": string}], "comment": string}.',
          "Evaluate BOTH labeled learner responses. For \"met\" or \"partial\" you MUST include at least one evidence entry whose `excerpt` is a SHORT, EXACT quotation copied from the learner response named in `response` — do not paraphrase, do not reword, and never quote from the other response.",
          "That quotation must be SPECIFIC: a few words at minimum. A single word or a generic fragment will be rejected, because it does not show what supports the criterion.",
          'For "missing", leave `evidence` empty and say plainly in `comment` what was not demonstrated. Never invent a quotation to justify a verdict.',
          "Criterion evidence may come from one response only, or from neither, if that is the honest result — `responseReview` already shows you read both. NEVER attach an irrelevant quotation to a criterion just to cover a response.",
          "Keep any model rewrite in `example` only — it is your wording, never the learner\'s, and never evidence or review.",
          "Never include a score, point value, or weight."
        ].join(" ")
      );
    }
  }
  return parts.join("\n\n");
}

/**
 * The ONLY result returned when evaluation did not happen.
 *
 * M6: this used to be a "deterministic, track-aware fallback" that manufactured a strength, an
 * improvement and a next move so the debate could continue. That was the standing defect — a
 * provider outage rendered as green coaching praise attributed to the learner's own speech.
 *
 * It now carries NO learner-specific content of any kind: no message, no strength, no improvement,
 * no next move, no example. The caller renders an honest unavailable state and offers a retry.
 * A provider outage is never encoded as a successful evaluation.
 */
export function sideCoachUnavailable(reason: SideCoachUnavailableReason): SideCoachResponse {
  return { message: "", unavailable: true, reason };
}

/**
 * Accepts a provider payload only when it can actually be rendered as evaluation.
 *
 * `turn-feedback` drives a coaching card built from strength / improvement / nextMove / example, so a
 * payload with none of those is incomplete — previously it could produce an empty card. `ask` drives
 * a prose answer, so it requires a non-empty message. Anything else is unavailable, not partial.
 */
function normalize(parsed: Partial<SideCoachResponse> | null | undefined, input: SideCoachInput): SideCoachResponse {
  if (!parsed || typeof parsed !== "object") {
    return sideCoachUnavailable("empty-response");
  }
  const message = typeof parsed.message === "string" ? parsed.message : "";

  if (input.requestType === "ask") {
    if (!message.trim()) return sideCoachUnavailable("empty-response");
    return { message };
  }

  const hasFeedbackField = Boolean(parsed.strength || parsed.improvement || parsed.nextMove || parsed.example);
  if (!hasFeedbackField) {
    return sideCoachUnavailable("incomplete-turn-feedback");
  }
  // Passed through untouched — never trimmed, repaired, or partially accepted. The authored-lesson
  // caller validates both against the rubric and the learner's own text, and refuses anything else.
  const rubricFeedback = parsed.rubricFeedback;
  const responseReview = parsed.responseReview;
  return {
    message,
    strength: parsed.strength,
    improvement: parsed.improvement,
    nextMove: parsed.nextMove,
    example: parsed.example,
    ...(rubricFeedback !== undefined ? { rubricFeedback } : {}),
    ...(responseReview !== undefined ? { responseReview } : {})
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
    // Provider quota, auth/config failure, network error, timeout, or unparseable output — all of
    // them mean the learner was NOT evaluated, and all of them say so.
    return sideCoachUnavailable("provider-error");
  }
}
