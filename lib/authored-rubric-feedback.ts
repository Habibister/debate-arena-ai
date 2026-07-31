// Validation for evidence-anchored authored-lesson feedback (M7A, aligned in M7B).
//
// This is THE production validator. The practice component imports it, and the smoke script imports
// the same function — there is deliberately no mirrored copy anywhere, because a mirror can drift
// while its tests keep passing.
//
// Pure by construction: no React, no browser API, no network, no AI provider, no database, no
// storage, no mastery or progress import. It takes data in and returns a verdict.
//
// It NEVER synthesizes, repairs, or back-fills anything. Its only outputs are "this payload is a
// complete, evidence-anchored evaluation" or "it is not, and here is why".
//
// M7B — TWO-RESPONSE CONTRACT ALIGNMENT. Proof that both learner responses were examined used to be
// inferred from rubric evidence: at least one excerpt had to be credited to each response. That was
// wrong. A response can be read carefully and honestly demonstrate no rubric criterion at all — and
// the item contract rightly lets a `missing` verdict carry no evidence. The old rule therefore
// rejected honest feedback, and its only escape hatch was to attach an irrelevant learner quotation
// to some criterion just to prove the response had been read. That is exactly the fabrication this
// module exists to prevent.
//
// So proof-of-review now lives in its own field. `responseReview` carries one verified excerpt and
// one honest note per learner response; rubric evidence is judged purely on its own merits.

// TYPE-ONLY import: erased at compile time, so this module still pulls in nothing at runtime.
import type { AuthoredRubricItem } from "@/lib/roleplay-lessons";

export type RubricStatus = "met" | "partial" | "missing";
export type EvidenceSource = "initial" | "follow-up";

export type RubricEvidence = {
  response: EvidenceSource;
  /** A short excerpt the provider claims to have taken from that learner response. */
  excerpt: string;
};

export type RubricItemFeedback = {
  /** Stable machine ID — never the learner-facing sentence. */
  rubricId: string;
  status: RubricStatus;
  evidence?: RubricEvidence[];
  comment: string;
};

/**
 * Proof that one learner response was actually examined. Deliberately NOT tied to any criterion:
 * its note describes what the response contributed or failed to demonstrate, so it stays honest
 * even when every rubric item is missing.
 */
export type ResponseReviewEntry = {
  response: EvidenceSource;
  /** A short excerpt the provider claims to have taken from that learner response. */
  excerpt: string;
  /** What that response contributed, or failed to demonstrate. */
  note: string;
};

export type AuthoredFeedbackValidationFailure =
  // Envelope
  | "not-an-object"
  | "unavailable-result"
  // Response review — proof that both submissions were examined
  | "review-not-an-array"
  | "malformed-review"
  | "unknown-review-response"
  | "duplicate-review-response"
  | "missing-review-response"
  | "empty-review-excerpt"
  | "empty-review-note"
  | "uninformative-review-note"
  | "review-fabricated-excerpt"
  | "review-wrong-response-attribution"
  // Rubric feedback — per-criterion verdicts
  | "rubric-not-an-array"
  | "wrong-item-count"
  | "unknown-rubric-id"
  | "duplicate-rubric-id"
  | "missing-rubric-id"
  | "invalid-status"
  | "empty-comment"
  | "missing-evidence"
  | "malformed-evidence"
  | "fabricated-excerpt"
  | "wrong-response-attribution";

export type AuthoredFeedbackValidationResult =
  | {
      ok: true;
      /** Always normalized to initial-then-follow-up, whatever order the provider sent. */
      review: ResponseReviewEntry[];
      items: RubricItemFeedback[];
    }
  | { ok: false; reason: AuthoredFeedbackValidationFailure };

const STATUSES: readonly RubricStatus[] = ["met", "partial", "missing"];
const SOURCES: readonly EvidenceSource[] = ["initial", "follow-up"];

/**
 * A note shorter than this cannot describe what a response contributed. This is a floor on effort,
 * NOT a judgement of quality: no string check can verify that a note is honest or genuinely
 * criterion-neutral, and this module does not pretend otherwise.
 */
const MIN_REVIEW_NOTE_CHARS = 10;

/** Whitespace- and case-insensitive containment, so ordinary reformatting is not treated as fabrication. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function excerptAppearsIn(excerpt: string, source: string): boolean {
  const needle = normalize(excerpt);
  if (!needle) return false;
  return normalize(source).includes(needle);
}

/**
 * Validates ONE claimed excerpt against the learner response it was attributed to.
 * Returns null when it checks out, or the reason it does not.
 *
 * Distinguishes "invented outright" from "real, but credited to the wrong response" — the second is
 * a subtler failure and worth naming separately. Note that the only sources are the learner's two
 * submissions: the coach's own `example` is never one, so a model revision can never be passed off
 * as either criterion evidence or proof of review.
 */
function checkExcerpt(
  excerpt: string,
  response: EvidenceSource,
  initialResponse: string,
  followUpResponse: string
): "fabricated" | "misattributed" | null {
  const attributed = response === "initial" ? initialResponse : followUpResponse;
  if (excerptAppearsIn(excerpt, attributed)) return null;
  const other = response === "initial" ? followUpResponse : initialResponse;
  return excerptAppearsIn(excerpt, other) ? "misattributed" : "fabricated";
}

/** Validates `responseReview`: exactly one verified entry per learner response, in either order. */
function validateResponseReview(
  raw: unknown,
  context: { rubric: AuthoredRubricItem[]; initialResponse: string; followUpResponse: string }
): { ok: true; review: ResponseReviewEntry[] } | { ok: false; reason: AuthoredFeedbackValidationFailure } {
  if (!Array.isArray(raw)) return { ok: false, reason: "review-not-an-array" };

  const seen = new Map<EvidenceSource, ResponseReviewEntry>();
  // A note that merely echoes a criterion is not a review of the response.
  const criterionStrings = new Set(context.rubric.flatMap((r) => [normalize(r.id), normalize(r.label)]));

  for (const item of raw) {
    if (!item || typeof item !== "object") return { ok: false, reason: "malformed-review" };
    const entry = item as Record<string, unknown>;

    const response = entry.response as EvidenceSource;
    if (!SOURCES.includes(response)) return { ok: false, reason: "unknown-review-response" };
    if (seen.has(response)) return { ok: false, reason: "duplicate-review-response" };

    const excerpt = typeof entry.excerpt === "string" ? entry.excerpt : "";
    if (!excerpt.trim()) return { ok: false, reason: "empty-review-excerpt" };

    const note = typeof entry.note === "string" ? entry.note.trim() : "";
    if (!note) return { ok: false, reason: "empty-review-note" };
    if (note.length < MIN_REVIEW_NOTE_CHARS || criterionStrings.has(normalize(note))) {
      return { ok: false, reason: "uninformative-review-note" };
    }

    const problem = checkExcerpt(excerpt, response, context.initialResponse, context.followUpResponse);
    if (problem === "misattributed") return { ok: false, reason: "review-wrong-response-attribution" };
    if (problem === "fabricated") return { ok: false, reason: "review-fabricated-excerpt" };

    seen.set(response, { response, excerpt, note });
  }

  // Both submissions must be represented. THIS is the structural proof of review — never inferred
  // from rubric evidence, which a genuinely unsuccessful response is entitled not to produce.
  const initial = seen.get("initial");
  const followUp = seen.get("follow-up");
  if (!initial || !followUp) return { ok: false, reason: "missing-review-response" };

  // Normalized for display, whatever order the provider sent.
  return { ok: true, review: [initial, followUp] };
}

/** Validates `rubricFeedback`: every authored criterion, exactly once, with evidence where claimed. */
function validateRubricFeedback(
  raw: unknown,
  context: { rubric: AuthoredRubricItem[]; initialResponse: string; followUpResponse: string }
): { ok: true; items: RubricItemFeedback[] } | { ok: false; reason: AuthoredFeedbackValidationFailure } {
  const { rubric, initialResponse, followUpResponse } = context;

  if (!Array.isArray(raw)) return { ok: false, reason: "rubric-not-an-array" };
  if (raw.length !== rubric.length) return { ok: false, reason: "wrong-item-count" };

  const knownIds = new Set(rubric.map((r) => r.id));
  const seen = new Set<string>();
  const items: RubricItemFeedback[] = [];

  for (const rawItem of raw) {
    if (!rawItem || typeof rawItem !== "object") return { ok: false, reason: "malformed-evidence" };
    const entry = rawItem as Record<string, unknown>;

    const rubricId = typeof entry.rubricId === "string" ? entry.rubricId : "";
    if (!knownIds.has(rubricId)) return { ok: false, reason: "unknown-rubric-id" };
    if (seen.has(rubricId)) return { ok: false, reason: "duplicate-rubric-id" };
    seen.add(rubricId);

    const status = entry.status as RubricStatus;
    if (!STATUSES.includes(status)) return { ok: false, reason: "invalid-status" };

    const comment = typeof entry.comment === "string" ? entry.comment.trim() : "";
    if (!comment) return { ok: false, reason: "empty-comment" };

    // Evidence is optional ONLY for a `missing` verdict — a criterion the learner did not
    // demonstrate has nothing to quote, and demanding a quote would invite a fabricated one.
    const rawEvidence = entry.evidence;
    if (rawEvidence !== undefined && !Array.isArray(rawEvidence)) return { ok: false, reason: "malformed-evidence" };
    const evidence = (rawEvidence ?? []) as unknown[];

    if (status !== "missing" && evidence.length === 0) return { ok: false, reason: "missing-evidence" };

    const cleaned: RubricEvidence[] = [];
    for (const rawEv of evidence) {
      if (!rawEv || typeof rawEv !== "object") return { ok: false, reason: "malformed-evidence" };
      const ev = rawEv as Record<string, unknown>;
      const response = ev.response as EvidenceSource;
      const excerpt = typeof ev.excerpt === "string" ? ev.excerpt : "";
      if (!SOURCES.includes(response)) return { ok: false, reason: "malformed-evidence" };
      if (!excerpt.trim()) return { ok: false, reason: "malformed-evidence" };

      const problem = checkExcerpt(excerpt, response, initialResponse, followUpResponse);
      if (problem === "misattributed") return { ok: false, reason: "wrong-response-attribution" };
      if (problem === "fabricated") return { ok: false, reason: "fabricated-excerpt" };

      cleaned.push({ response, excerpt });
    }

    items.push({ rubricId, status, comment, ...(cleaned.length ? { evidence: cleaned } : {}) });
  }

  if (seen.size !== rubric.length) return { ok: false, reason: "missing-rubric-id" };

  // Deliberately NO cross-item "both responses cited" rule here — see the M7B note at the top.
  // Whether both responses were examined is settled by `responseReview`, not by rubric evidence.
  return { ok: true, items };
}

/**
 * Validates a complete authored-lesson structured feedback payload against the learner's ACTUAL
 * submissions. The payload is the whole coach response; only `responseReview` and `rubricFeedback`
 * are read, so the coach's `example` can never serve as a source for either.
 *
 * Category completeness alone is not enough: four generic comments unrelated to anything the learner
 * wrote would satisfy a coverage-only check. So every `met`/`partial` verdict must quote the learner,
 * every quote must really appear in the response it is attributed to, and `responseReview` must
 * separately show that BOTH submissions were examined — including when neither demonstrated anything.
 */
export function validateAuthoredRubricFeedback(
  payload: unknown,
  context: { rubric: AuthoredRubricItem[]; initialResponse: string; followUpResponse: string }
): AuthoredFeedbackValidationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, reason: "not-an-object" };
  }
  const envelope = payload as Record<string, unknown>;

  // Defensive: an unavailable result carries no evaluation at all and must never be validated into
  // one. The caller rejects it first; this makes that impossible to bypass.
  if (envelope.unavailable === true) return { ok: false, reason: "unavailable-result" };

  const review = validateResponseReview(envelope.responseReview, context);
  if (!review.ok) return review;

  const rubric = validateRubricFeedback(envelope.rubricFeedback, context);
  if (!rubric.ok) return rubric;

  return { ok: true, review: review.review, items: rubric.items };
}

/** Orders validated feedback by the AUTHORED rubric, so a reordered payload cannot reorder the learner's view. */
export function orderByAuthoredRubric(items: RubricItemFeedback[], rubric: AuthoredRubricItem[]): Array<{ item: AuthoredRubricItem; feedback: RubricItemFeedback }> {
  const byId = new Map(items.map((i) => [i.rubricId, i]));
  const ordered: Array<{ item: AuthoredRubricItem; feedback: RubricItemFeedback }> = [];
  for (const item of rubric) {
    const feedback = byId.get(item.id);
    if (feedback) ordered.push({ item, feedback });
  }
  return ordered;
}

/** Learner-facing status wording. Machine IDs are never shown as the primary label. */
export function rubricStatusLabel(status: RubricStatus): string {
  return status === "met" ? "Covered" : status === "partial" ? "Partly covered" : "Not covered yet";
}

/** Learner-facing name for a reviewed response. */
export function responseReviewLabel(response: EvidenceSource): string {
  return response === "initial" ? "First response" : "Follow-up response";
}
