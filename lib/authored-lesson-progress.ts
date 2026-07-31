// Device-local resume for authored role-play lesson practice (M5, Phase A).
//
// SCOPE — deliberately small. This persists ONLY enough to restore what the learner typed and where
// they were, in THIS browser. It is not progress data:
//   * no completion fact, no mastery, no XP, no rating, no competition record
//   * no AI feedback and no Side Coach response — after a reload the learner resumes their own work
//     and must request fresh coaching again
//   * no server write of any kind, no cookie, no network request
//   * no learner name or email in the key
//
// Pure and framework-free (no React, no Node built-ins) so it can be unit-tested directly and is
// safe to import from a client component. Every storage touch is SSR-safe and try/catch-wrapped:
// a browser with storage disabled, full, or blocked must degrade to "not saving", never crash.

export const AUTHORED_LESSON_PROGRESS_VERSION = 1;

// Bound stored text to the existing response limit. The Side Coach request caps
// `latestStudentSpeech` at 8000 chars and carries BOTH responses in that one field, so 4000 per
// response keeps a restored pair inside the limit the practice already has to satisfy.
export const MAX_STORED_RESPONSE_CHARS = 4000;

export type AuthoredLessonPhase = "identify" | "respond";

export type AuthoredLessonProgress = {
  /** Schema version. A mismatch is discarded rather than migrated. */
  v: number;
  /** Lesson this entry belongs to; a mismatch is discarded (never applied to another lesson). */
  slug: string;
  phase: AuthoredLessonPhase;
  identifyIndex: number;
  writeText: string;
  followText: string;
  followUnlocked: boolean;
  /** Local display / stale-data handling only. Never shown as a competition or mastery timestamp. */
  updatedAt: number;
};

/**
 * Versioned, user- and lesson-scoped key.
 *
 * `userScope` is an opaque server-derived digest of the account id — never a name, email, or raw
 * database id — so two accounts sharing a browser cannot resume each other's writing.
 */
export function authoredLessonProgressKey(userScope: string, slug: string): string {
  return `compete-ready:authored-lesson-progress:v${AUTHORED_LESSON_PROGRESS_VERSION}:${userScope}:${slug}`;
}

/**
 * Clamps a restored identify index to the authored question count.
 *
 * A saved entry can outlive an edit to the lesson: if a question is removed, a stale index would
 * otherwise point past the end and read `undefined`. Pure and exported so the behaviour is testable
 * without mounting the component.
 */
export function resolveRestoredIdentifyIndex(savedIndex: number, questionCount: number): number {
  if (!Number.isInteger(savedIndex) || savedIndex < 0) return 0;
  if (questionCount <= 0) return 0;
  return Math.min(savedIndex, questionCount - 1);
}

// Single source of truth for the meaningful-response gate, shared by the practice UI and by resume
// normalization so a restored state can never satisfy one and violate the other.
export const MIN_MEANINGFUL_RESPONSE_WORDS = 8;

export function countResponseWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * The phases a resume may land in. These are AUTHORING phases only: each is fully reconstructible
 * from persisted authored state.
 *
 * Deliberately NOT resumable, now or in future: any loading, submitting, coaching-feedback, results,
 * or completion phase. Those depend on the Side Coach response, which is never persisted — restoring
 * one would reopen the lesson in a results state with no result behind it.
 */
const SAFE_RESUME_PHASES: readonly AuthoredLessonPhase[] = ["identify", "respond"];

export type NormalizedResume = {
  phase: AuthoredLessonPhase;
  identifyIndex: number;
  writeText: string;
  followText: string;
  followUnlocked: boolean;
  /** True when the stored phase could not be restored as-is and was mapped to a safe one. */
  normalizedPhase: boolean;
  /** True when a stored `followUnlocked: true` was withdrawn because it was not semantically earned. */
  withdrewFollowUnlock: boolean;
};

/**
 * Normalizes a stored entry into a state the lesson can honestly reopen in.
 *
 * Cross-field, not field-by-field: the responses decide which phase and which unlock are legitimate.
 *
 *  - `identify` / `respond`  -> restored directly (they need only authored state).
 *  - anything else           -> mapped to the latest safe AUTHORING phase the responses justify:
 *                               `respond` when the first response meets the meaningful-response gate,
 *                               otherwise `identify` (the earliest authoring phase).
 *  - `followUnlocked`        -> kept only in `respond` AND only when the first response actually
 *                               meets the gate that unlocks it in the UI. This closes a real hole:
 *                               a hand-edited entry could otherwise reveal the follow-up without a
 *                               first response.
 *
 * Never restores feedback, never marks completion/progress/mastery, and never triggers a request.
 * Both learner responses are always preserved verbatim — normalization changes navigation, not work.
 */
export function normalizeRestoredProgress(
  saved: { phase: unknown; identifyIndex: unknown; writeText: string; followText: string; followUnlocked: unknown },
  questionCount: number
): NormalizedResume {
  const writeText = saved.writeText;
  const followText = saved.followText;

  const firstResponseIsMeaningful = countResponseWords(writeText) >= MIN_MEANINGFUL_RESPONSE_WORDS;
  const storedPhaseIsSafe = SAFE_RESUME_PHASES.includes(saved.phase as AuthoredLessonPhase);

  // A non-authoring phase (loading / submitting / feedback / results / completion / anything
  // unrecognized) can never be reopened directly, because the data it depends on was not persisted.
  const phase: AuthoredLessonPhase = storedPhaseIsSafe
    ? (saved.phase as AuthoredLessonPhase)
    : firstResponseIsMeaningful
      ? "respond"
      : "identify";

  const rawIndex = typeof saved.identifyIndex === "number" ? saved.identifyIndex : 0;
  const identifyIndex = resolveRestoredIdentifyIndex(rawIndex, questionCount);

  // The follow-up is a protected UI state: it is only reachable in `respond`, and only after the
  // first response passes the gate. Storage cannot grant it.
  const storedUnlock = saved.followUnlocked === true;
  const followUnlocked = phase === "respond" && firstResponseIsMeaningful;

  return {
    phase,
    identifyIndex,
    writeText,
    followText,
    followUnlocked,
    normalizedPhase: !storedPhaseIsSafe,
    withdrewFollowUnlock: storedUnlock && !followUnlocked
  };
}

function isBoundedString(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_STORED_RESPONSE_CHARS;
}

/**
 * Runtime validator. Anything that fails — malformed JSON shape, wrong version, wrong lesson,
 * unknown phase, non-integer index, oversized text — is rejected outright. A rejected entry is
 * discarded; it is NEVER partially applied and never treated as completion.
 */
export function isAuthoredLessonProgress(value: unknown, slug: string): value is AuthoredLessonProgress {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.v !== AUTHORED_LESSON_PROGRESS_VERSION) return false;
  if (v.slug !== slug) return false;
  if (v.phase !== "identify" && v.phase !== "respond") return false;
  if (typeof v.identifyIndex !== "number" || !Number.isInteger(v.identifyIndex) || v.identifyIndex < 0) return false;
  if (!isBoundedString(v.writeText)) return false;
  if (!isBoundedString(v.followText)) return false;
  if (typeof v.followUnlocked !== "boolean") return false;
  if (typeof v.updatedAt !== "number" || !Number.isFinite(v.updatedAt)) return false;
  return true;
}

function storage(): Storage | null {
  // SSR-safe: `window` is absent on the server, and access can throw in privacy modes.
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Returns validated saved progress, or null when absent, unusable, or storage is unavailable. */
export function loadAuthoredLessonProgress(userScope: string, slug: string): AuthoredLessonProgress | null {
  const store = storage();
  if (!store) return null;
  const key = authoredLessonProgressKey(userScope, slug);

  let raw: string | null = null;
  try {
    raw = store.getItem(key);
  } catch {
    // Storage readable-but-throwing (privacy mode): treat as "nothing saved", never crash.
    return null;
  }
  if (!raw) return null;

  // Any unusable entry — unparseable, wrong version, wrong lesson, wrong shape, oversized — is
  // DISCARDED rather than returned or left in place, so a corrupt value cannot fail on every load
  // forever. It is never partially applied and never treated as completion.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    discard(store, key);
    return null;
  }
  if (!isAuthoredLessonProgress(parsed, slug)) {
    discard(store, key);
    return null;
  }
  return parsed;
}

function discard(store: Storage, key: string): void {
  try {
    store.removeItem(key);
  } catch {
    // Nothing more to do — the caller already falls back to the authored initial state.
  }
}

/**
 * Writes progress. Returns whether the write actually succeeded — the caller uses this to decide
 * whether it may honestly tell the learner their work is saved on this device.
 */
export function saveAuthoredLessonProgress(
  userScope: string,
  slug: string,
  state: Omit<AuthoredLessonProgress, "v" | "slug" | "updatedAt"> & { updatedAt?: number }
): boolean {
  const store = storage();
  if (!store) return false;
  // Refuse to store anything past the bound rather than silently truncating the learner's words.
  if (state.writeText.length > MAX_STORED_RESPONSE_CHARS) return false;
  if (state.followText.length > MAX_STORED_RESPONSE_CHARS) return false;
  const payload: AuthoredLessonProgress = {
    v: AUTHORED_LESSON_PROGRESS_VERSION,
    slug,
    phase: state.phase,
    identifyIndex: state.identifyIndex,
    writeText: state.writeText,
    followText: state.followText,
    followUnlocked: state.followUnlocked,
    updatedAt: state.updatedAt ?? Date.now()
  };
  try {
    store.setItem(authoredLessonProgressKey(userScope, slug), JSON.stringify(payload));
    return true;
  } catch {
    // Quota exceeded, storage disabled, private mode — the lesson keeps working, unsaved.
    return false;
  }
}

/** Clears ONLY this user's entry for THIS lesson. Never touches other lessons, tracks, or accounts. */
export function clearAuthoredLessonProgress(userScope: string, slug: string): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.removeItem(authoredLessonProgressKey(userScope, slug));
    return true;
  } catch {
    return false;
  }
}
