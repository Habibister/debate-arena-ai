/**
 * COACHED PERFORMANCE — the typed contract behind Debate's guided application layer.
 *
 * The canonical learning model for a productive Debate skill is:
 *   EXPLAIN → MODEL → SCAFFOLDED TRY → GUIDED DEBATE → FEEDBACK → REQUIRED RETRY
 *   → ADD NEXT SKILL → CUMULATIVE GUIDED DEBATE → FADE SUPPORT → INDEPENDENT COMPETE
 * This module holds everything in that chain that can be stated as data or as a pure rule: which
 * skills a lesson unlocks, which of them are scored and coached, what a starter is allowed to be,
 * what the coach is allowed to say, and what a completed scaffolded attempt looks like.
 *
 * PURE. No database, no session, no provider, no environment. It is imported by a client component
 * and by strict-safe tests, so a Prisma or network reference here would ship to the browser and
 * break the tests in the same stroke. The ONE thing this module does not do is call a model; the
 * adapter that does takes its prompt from here and its post-filter from here, and is injectable so
 * the contract is proven against a fake.
 *
 * THREE HARD RULES, each enforced below rather than hoped for:
 *   1. NEVER TEST BEFORE TEACHING. A guided experience may score, coach, prompt or expect only skills
 *      the learner has been taught. Anything not provably unlocked is not scored, not coached, and
 *      its absence is not penalised. Fail closed.
 *   2. STARTERS ARE SCAFFOLDS, NOT ANSWERS. A starter supplies opening words and the shape of a move
 *      and stops at a blank. The substantive reasoning is the learner's.
 *   3. NOTHING HERE IS DURABLE. Guided performance writes no mastery, schedules no review, and
 *      changes no readiness. It coaches a session; it certifies nothing.
 */

// --- competencies -----------------------------------------------------------------------------------

/**
 * The productive Debate competencies the coached model can name. This is the CURRICULUM's vocabulary
 * for what a learner has been taught, and it is deliberately narrower than the drill bank's area list:
 * a competency appears here only when a published lesson teaches it, because the whole point of the
 * unlock model is that "taught" is provable.
 */
export type DebateCompetency =
  | "claim-warrant-impact"
  | "refutation"
  | "clash"
  | "signposting"
  | "constructive-speech"
  | "weighing";

export const DEBATE_COMPETENCIES: readonly DebateCompetency[] = [
  "claim-warrant-impact", "refutation", "clash", "signposting", "constructive-speech", "weighing"
] as const;

/** Learner-facing names. Words a student would use, never internal identifiers. */
export const COMPETENCY_LABELS: Readonly<Record<DebateCompetency, string>> = {
  "claim-warrant-impact": "Claim, warrant and impact",
  refutation: "Refutation",
  clash: "Clash",
  signposting: "Signposting",
  "constructive-speech": "Constructive speech",
  weighing: "Weighing"
};

/**
 * Word STEMS that name each competency in coaching prose. The post-filter refuses feedback that names a
 * locked competency, and it has to catch the verb and the noun alike — "signpost", "signposting",
 * "weigh", "weighing", "clash". Deliberately distinctive: "claim" and "impact" are ordinary English
 * and would refuse honest sentences, so claim/warrant/impact is recognised by "warrant" and by the
 * full phrase rather than by its common words.
 */
export const COMPETENCY_STEMS: Readonly<Record<DebateCompetency, readonly string[]>> = {
  "claim-warrant-impact": ["warrant", "claim, warrant", "claim-warrant-impact"],
  refutation: ["refut"],
  clash: ["clash", "engage their argument directly", "point of disagreement"],
  signposting: ["signpost", "roadmap", "road map", "number your points", "tell the judge where you are"],
  "constructive-speech": ["constructive", "build your own case", "your own case first"],
  // "weigh" is matched ANYWHERE in a word so "outweigh"/"outweighs" are caught, plus the moves a
  // coach uses to name weighing without the word: comparing impacts, magnitude, probability.
  weighing: ["weigh", "compare the impacts", "compare the two impacts", "which impact matters more",
             "magnitude", "probability", "bigger harm"]
};

/**
 * Does `text` name `competency`, in any inflection? A stem of a single word matches at any position
 * inside a word (so "outweigh" names weighing); a multi-word phrase matches as a phrase. This is a
 * conservative net, not a classifier: coaching that names a locked skill by a route not listed here
 * still gets through, which is why the PROMPT forbids it first and this filter is the second line.
 */
export function mentionsCompetency(text: string, competency: DebateCompetency): boolean {
  const escape = (s: string) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  return COMPETENCY_STEMS[competency].some((stem) =>
    stem.includes(" ")
      ? new RegExp(escape(stem), "i").test(text)
      : new RegExp(escape(stem), "i").test(text));
}

/** The published lesson that TEACHES each competency. Unlocking a competency means finishing this. */
export const COMPETENCY_LESSON: Readonly<Record<DebateCompetency, string>> = {
  "claim-warrant-impact": "claim-warrant-impact",
  refutation: "debate-refutation",
  clash: "debate-clash",
  signposting: "debate-signposting",
  "constructive-speech": "debate-constructive-speeches",
  weighing: "debate-weighing"
};

// --- support levels ---------------------------------------------------------------------------------

/**
 * How much help the coach volunteers. The model FADES: first use of a skill is HIGH_SUPPORT, later
 * reuse is MEDIUM then LOW, and full Compete is INDEPENDENT — no unsolicited coaching, no automatic
 * starters, nothing the learner did not ask for.
 */
export type SupportLevel = "HIGH_SUPPORT" | "MEDIUM_SUPPORT" | "LOW_SUPPORT" | "INDEPENDENT";

export const SUPPORT_LEVELS: readonly SupportLevel[] = ["HIGH_SUPPORT", "MEDIUM_SUPPORT", "LOW_SUPPORT", "INDEPENDENT"] as const;

/** What each level permits the coach to do WITHOUT being asked. */
export type SupportPolicy = {
  /** Starters are shown without the learner asking. */
  startersVisible: boolean;
  /** Starters can be requested through the help control. */
  startersOnRequest: boolean;
  /** The coach may volunteer a reminder mid-performance. */
  unsolicitedCoaching: boolean;
  /** The coach may require a retry when the target move is incomplete. */
  retryRequired: boolean;
};

export const SUPPORT_POLICY: Readonly<Record<SupportLevel, SupportPolicy>> = {
  HIGH_SUPPORT: { startersVisible: true, startersOnRequest: true, unsolicitedCoaching: true, retryRequired: true },
  MEDIUM_SUPPORT: { startersVisible: false, startersOnRequest: true, unsolicitedCoaching: true, retryRequired: true },
  LOW_SUPPORT: { startersVisible: false, startersOnRequest: true, unsolicitedCoaching: false, retryRequired: true },
  // Full Compete. Nothing volunteered, nothing automatic. The learner is being measured, not taught.
  INDEPENDENT: { startersVisible: false, startersOnRequest: false, unsolicitedCoaching: false, retryRequired: false }
};

/**
 * The support level a surface starts at. DETERMINISTIC for the pilot: guided application on a lesson
 * is HIGH_SUPPORT, full Compete is INDEPENDENT. Adaptive fading — dropping to MEDIUM and LOW as a
 * learner reuses a skill — needs a per-learner record of prior guided uses, which the product does
 * not keep (see `unlockedCompetenciesFor`). The `priorGuidedUses` argument is the seam for it: when
 * a truthful count exists, pass it and fading is a table lookup. Until then callers pass nothing and
 * get the fixed pilot level, and NOTHING pretends otherwise.
 */
export function defaultSupportLevel(surface: "guided" | "compete", priorGuidedUses?: number): SupportLevel {
  if (surface === "compete") return "INDEPENDENT";
  if (priorGuidedUses === undefined) return "HIGH_SUPPORT";
  if (priorGuidedUses <= 0) return "HIGH_SUPPORT";
  if (priorGuidedUses === 1) return "MEDIUM_SUPPORT";
  return "LOW_SUPPORT";
}

// --- guided applications: what a lesson unlocks and what its guided round may use -------------------

/**
 * A lesson's guided application. `primary` is the skill the lesson teaches and the round is FOR;
 * `reinforcement` lists previously taught skills the learner is expected to keep using. Everything
 * else is LOCKED for this round: not scored, not coached, its absence never penalised.
 */
export type GuidedApplication = {
  lessonId: string;
  primary: DebateCompetency;
  reinforcement: readonly DebateCompetency[];
};

/**
 * CURRICULUM-LEVEL unlock declarations — the pilot's unlock source, and its honest limitation.
 *
 * There is no per-learner completion record for authored lessons anywhere in the schema (lesson
 * resume is device-local and stores no completion fact — see lib/authored-lesson-progress.ts). So the
 * product cannot truthfully say "this learner has finished Claim/Warrant/Impact". What it CAN say is
 * what the curriculum ORDERS: Refutation is taught after Claim/Warrant/Impact, so a learner on the
 * Refutation lesson is expected to have that skill, and the guided round may reinforce it.
 *
 * That is a statement about the curriculum, never about the person, and every consumer treats it that
 * way: nothing here says "you have completed", only "this lesson builds on". When a per-learner unlock
 * record exists, `unlockedCompetenciesFor` gains a learner argument and this table becomes the
 * fallback — the shape of every consumer is unchanged.
 *
 * ONE ENTRY: the Refutation pilot. Lessons migrate one at a time after acceptance, and a held lesson
 * can never appear here (asserted by the smoke suite against the registry).
 */
export const GUIDED_APPLICATIONS: readonly GuidedApplication[] = [
  { lessonId: "debate-refutation", primary: "refutation", reinforcement: ["claim-warrant-impact"] }
] as const;

export function guidedApplicationFor(lessonId: string): GuidedApplication | null {
  return GUIDED_APPLICATIONS.find((application) => application.lessonId === lessonId) ?? null;
}

/**
 * The competencies a learner working THIS lesson has been taught: the lesson's own skill plus its
 * declared prerequisites. Curriculum-level (see `GUIDED_APPLICATIONS`). Returns an empty list for a
 * lesson with no guided application — nothing is unlocked by a lesson that declares nothing.
 */
export function unlockedCompetenciesFor(lessonId: string): readonly DebateCompetency[] {
  const application = guidedApplicationFor(lessonId);
  if (!application) return [];
  return [application.primary, ...application.reinforcement];
}

/** The rubric a guided round may use: what is scored, what is reinforced, and what is locked. */
export type GuidedRubric = {
  primary: DebateCompetency;
  reinforcement: readonly DebateCompetency[];
  /** Never scored, never coached, absence never penalised. */
  locked: readonly DebateCompetency[];
};

export function guidedRubricFor(lessonId: string): GuidedRubric | null {
  const application = guidedApplicationFor(lessonId);
  if (!application) return null;
  const unlocked = new Set<DebateCompetency>([application.primary, ...application.reinforcement]);
  return {
    primary: application.primary,
    reinforcement: application.reinforcement,
    locked: DEBATE_COMPETENCIES.filter((competency) => !unlocked.has(competency))
  };
}

export function isUnlocked(lessonId: string, competency: DebateCompetency): boolean {
  return unlockedCompetenciesFor(lessonId).includes(competency);
}

// --- starters: the help control and its scaffold rule -----------------------------------------------

/** One "Need a starter?" category. Shown only when its competency is unlocked for the lesson. */
export type StarterCategory = {
  id: string;
  label: string;
  competency: DebateCompetency;
  /** The frame purpose this category draws its starters from (matches `languageFrames[].purpose`). */
  purpose: string;
};

export const STARTER_CATEGORIES: readonly StarterCategory[] = [
  { id: "claim", label: "Start my claim", competency: "claim-warrant-impact", purpose: "State the claim" },
  { id: "reason", label: "Help me give a reason", competency: "claim-warrant-impact", purpose: "Give the reason" },
  { id: "impact", label: "Help me explain the impact", competency: "claim-warrant-impact", purpose: "Say why it matters" },
  { id: "refute", label: "Help me refute", competency: "refutation", purpose: "Answer their argument" },
  { id: "consequence", label: "Help me say what changed", competency: "refutation", purpose: "Say what changed" },
  { id: "transition", label: "Help me transition", competency: "signposting", purpose: "Move to the next point" },
  { id: "weigh", label: "Help me weigh", competency: "weighing", purpose: "Weigh the impacts" }
] as const;

/** The help categories a lesson may show. Derived from unlocked skills — a future skill never appears. */
export function starterCategoriesFor(lessonId: string): readonly StarterCategory[] {
  const unlocked = new Set(unlockedCompetenciesFor(lessonId));
  return STARTER_CATEGORIES.filter((category) => unlocked.has(category.competency));
}

/** The blank a learner fills. Three underscores, the same token the lesson frames use. */
export const SLOT = "___";

/**
 * Is `text` a SCAFFOLD rather than an answer? The mechanical half of the rule, applied to every
 * starter before it is shown and to every model-produced starter before it is returned:
 *   - it must leave at least one slot open, or end on an open connective ("but", "because", "...");
 *   - it must be short — a starter is a phrase, and forty words is already a sentence with an
 *     argument in it;
 *   - it must not contain the connectives that would carry a finished chain of reasoning.
 * A starter that fails any of these is not shown. The authoring half — that the words before the
 * blank do not smuggle in the substance — is a review judgement the smoke suite reads each starter
 * against, and no heuristic here claims to replace it.
 */
export function isIncompleteScaffold(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  const words = trimmed.split(/\s+/).length;
  if (words > 40) return false;
  const endsOpen = /(\.\.\.|…|\b(but|because|since|so|therefore|that|which)[,:]?)$/i.test(trimmed);
  const hasSlot = trimmed.includes(SLOT);
  if (!hasSlot && !endsOpen) return false;
  // A chain that reaches a conclusion has been completed. "___, but ___ because ___. Therefore ___."
  // is a frame; "X, but Y because Z, so their argument fails" is an answer.
  const completedChain = /\bbecause\b[^_]{12,}\b(so|therefore|which means)\b[^_]{8,}/i.test(trimmed);
  return !completedChain;
}

/**
 * Instantiate a starter in the learner's topic WITHOUT completing it. The topic and the opponent's
 * claim may be substituted in; every slot stays a slot. Returns null when the starter would not
 * survive the scaffold rule after substitution, so a caller can never show a completed answer.
 */
/**
 * CONTEXTUAL STARTER. Instantiates a starter in the learner's situation from whatever context the
 * caller actually has: the round's motion (`{topic}`) and/or the argument being answered
 * (`{their claim}`). Named for what it does — a caller with no motion (a lesson exercise that is
 * set against an argument, not a motion) gets an argument-grounded starter, never a fake topic.
 * Re-checked after substitution: the result must still stop at a blank or it is not returned.
 */
export function contextualStarter(
  starter: string,
  context: { topic?: string; opponentClaim?: string }
): string | null {
  let text = starter;
  if (context.opponentClaim) text = text.replace(/\{their claim\}/g, context.opponentClaim.trim());
  if (context.topic) text = text.replace(/\{topic\}/g, context.topic.trim());
  // An unsubstituted placeholder becomes a plain slot rather than leaking a template token.
  text = text.replace(/\{their claim\}|\{topic\}/g, SLOT);
  return isIncompleteScaffold(text) ? text : null;
}

// --- the coach contract ---------------------------------------------------------------------------------

export type GuidedTaskType = "STARTER" | "COACH" | "EVALUATE" | "RETRY";

export type GuidedCoachRequest = {
  taskType: GuidedTaskType;
  lessonId: string;
  topic: string;
  /** The opponent's current argument, when there is one. */
  opponentContext?: string;
  targetCompetency: DebateCompetency;
  unlockedCompetencies: readonly DebateCompetency[];
  supportLevel: SupportLevel;
  learnerAttempt?: string;
  /** For STARTER: which help category was asked for. */
  starterCategoryId?: string;
  /** For RETRY: the single issue the previous EVALUATE named, so the retry stays focused. */
  focusIssue?: string;
};

export type GuidedCoachResponse =
  | { taskType: "STARTER"; starter: string }
  | { taskType: "COACH"; reminder: string }
  | {
      taskType: "EVALUATE" | "RETRY";
      /** What went well on the CURRENT lesson skill. */
      newSkill: string;
      /** One reinforcement note on a prior unlocked skill, when relevant. */
      priorSkill?: string;
      /** The single most useful correction. */
      oneThingToFix: string;
      /** Whether the target move is materially incomplete and must be retried. */
      retryRequired: boolean;
      nextAction: "retry" | "continue";
    }
  | { taskType: GuidedTaskType; unavailable: true; reason: string };

/**
 * Validate a request against the hard rules BEFORE any prompt is built. A request that names a
 * locked competency as its target, or that lists a competency the lesson does not unlock, is refused
 * here. This is the "never test before teaching" gate, and it sits in front of the model, not behind it.
 */
export function validateGuidedRequest(request: GuidedCoachRequest): { ok: true } | { ok: false; reason: string } {
  const unlocked = unlockedCompetenciesFor(request.lessonId);
  if (unlocked.length === 0) return { ok: false, reason: "no-guided-application" };
  if (!unlocked.includes(request.targetCompetency)) return { ok: false, reason: "target-not-unlocked" };
  for (const competency of request.unlockedCompetencies) {
    if (!unlocked.includes(competency)) return { ok: false, reason: "claims-locked-competency" };
  }
  if (request.taskType === "STARTER") {
    if (!request.starterCategoryId) return { ok: false, reason: "starter-category-required" };
    const category = starterCategoriesFor(request.lessonId).find((c) => c.id === request.starterCategoryId);
    if (!category) return { ok: false, reason: "starter-category-locked" };
    if (!SUPPORT_POLICY[request.supportLevel].startersOnRequest) return { ok: false, reason: "starters-disabled-at-level" };
  }
  if ((request.taskType === "EVALUATE" || request.taskType === "RETRY") && !request.learnerAttempt?.trim()) {
    return { ok: false, reason: "attempt-required" };
  }
  if (request.taskType === "COACH" && !SUPPORT_POLICY[request.supportLevel].unsolicitedCoaching) {
    return { ok: false, reason: "coaching-disabled-at-level" };
  }
  return { ok: true };
}

/**
 * The prompt safety block. Every guided prompt carries it verbatim, so a test can assert its presence
 * on the built prompt rather than trusting that a builder remembered it.
 */
export const GUIDED_COACH_SAFETY_RULES: readonly string[] = [
  "Do not complete the learner's substantive debate argument.",
  "Do not invent the learner's reasoning or write it for them.",
  "Do not provide a full speech, a complete rebuttal, or a finished comparison.",
  "When asked for a starter, give opening words and a blank — never a complete answer.",
  "Do not coach, score, or mention any skill outside the UNLOCKED list. Do not penalise its absence.",
  "Coach the CURRENT skill first; mention a prior unlocked skill only as brief reinforcement."
] as const;

export function buildGuidedCoachPrompt(request: GuidedCoachRequest): { system: string; user: string } {
  const unlocked = request.unlockedCompetencies.map((c) => COMPETENCY_LABELS[c]).join(", ");
  const target = COMPETENCY_LABELS[request.targetCompetency];
  const system = [
    "You are a private coach for a beginner debater working inside a lesson. You are not the opponent and not the judge.",
    `CURRENT SKILL (primary): ${target}.`,
    `UNLOCKED SKILLS (the only skills you may coach or evaluate): ${unlocked}.`,
    `SUPPORT LEVEL: ${request.supportLevel}.`,
    "HARD RULES:",
    ...GUIDED_COACH_SAFETY_RULES.map((rule) => `- ${rule}`),
    request.taskType === "STARTER"
      ? 'Respond ONLY as JSON {"starter": string}. The starter is at most one short sentence, ends at a blank written as ___ or at an open connective, and contains none of the learner\'s substantive reasoning.'
      : request.taskType === "COACH"
        ? 'Respond ONLY as JSON {"reminder": string}. One sentence, one actionable reminder about the current skill. No answer, no example argument.'
        : 'Respond ONLY as JSON {"newSkill": string, "priorSkill": string | null, "oneThingToFix": string, "retryRequired": boolean}. Describe what the learner did on the current skill; name ONE thing to fix; set retryRequired true when the current skill\'s move is materially incomplete. Never rewrite their answer.'
  ].join("\n");
  const user = [
    `Topic: ${request.topic.trim()}`,
    request.opponentContext ? `Opponent's argument: ${request.opponentContext.trim()}` : "",
    request.learnerAttempt ? `Learner's attempt: ${request.learnerAttempt.trim()}` : "",
    request.focusIssue ? `This is a RETRY. The issue to check for is: ${request.focusIssue.trim()}` : "",
    request.starterCategoryId ? `Starter requested: ${request.starterCategoryId}` : ""
  ].filter(Boolean).join("\n");
  return { system, user };
}

/**
 * FAIL-CLOSED post-filter over whatever a model returned. The prompt asks; this checks. A STARTER that
 * is not a scaffold is refused. Feedback that names a locked competency is refused rather than
 * trimmed, because a trimmed sentence can still carry the judgement. The caller renders `unavailable`
 * as exactly that — never as coaching.
 */
export function constrainGuidedResponse(
  request: GuidedCoachRequest,
  raw: Record<string, unknown> | null
): GuidedCoachResponse {
  const refuse = (reason: string): GuidedCoachResponse => ({ taskType: request.taskType, unavailable: true, reason });
  if (!raw || typeof raw !== "object") return refuse("no-response");
  const locked = DEBATE_COMPETENCIES.filter((c) => !request.unlockedCompetencies.includes(c));
  const mentionsLocked = (text: string) => locked.some((c) => mentionsCompetency(text, c));

  if (request.taskType === "STARTER") {
    const starter = typeof raw.starter === "string" ? raw.starter.trim() : "";
    if (!starter) return refuse("empty-starter");
    if (!isIncompleteScaffold(starter)) return refuse("starter-is-not-a-scaffold");
    return { taskType: "STARTER", starter };
  }
  if (request.taskType === "COACH") {
    const reminder = typeof raw.reminder === "string" ? raw.reminder.trim() : "";
    if (!reminder) return refuse("empty-reminder");
    if (mentionsLocked(reminder)) return refuse("reminder-names-locked-skill");
    if (reminder.split(/\s+/).length > 40) return refuse("reminder-too-long");
    return { taskType: "COACH", reminder };
  }
  const newSkill = typeof raw.newSkill === "string" ? raw.newSkill.trim() : "";
  const oneThingToFix = typeof raw.oneThingToFix === "string" ? raw.oneThingToFix.trim() : "";
  const priorSkill = typeof raw.priorSkill === "string" && raw.priorSkill.trim() ? raw.priorSkill.trim() : undefined;
  if (!newSkill || !oneThingToFix) return refuse("incomplete-evaluation");
  for (const text of [newSkill, oneThingToFix, priorSkill ?? ""]) {
    if (mentionsLocked(text)) return refuse("feedback-names-locked-skill");
  }
  const retryRequired = raw.retryRequired === true;
  return {
    taskType: request.taskType,
    newSkill,
    priorSkill,
    oneThingToFix,
    retryRequired,
    nextAction: retryRequired ? "retry" : "continue"
  };
}

// --- the scaffolded try: a deterministic evaluator for the Refutation frame -------------------------

export type ScaffoldEvaluation = {
  /** Every slot filled and no named issue. */
  complete: boolean;
  /** The single most useful thing to fix, in words a learner can act on. Empty when complete. */
  coach: string;
  /** Which slot the issue lives in, when it is slot-specific. */
  slot?: string;
  /** Whether the learner must try the same move again before moving on. */
  retryRequired: boolean;
};

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s']/g, " ").split(/\s+/).filter((w) => w.length > 3);
const STOP = new Set(["that", "this", "they", "their", "them", "with", "from", "have", "will", "would", "does", "not",
  "argument", "because", "therefore", "which", "what", "about", "just", "really", "actually", "there"]);
const content = (s: string) => new Set(words(s).filter((w) => !STOP.has(w)));
/** Share of the smaller set's content words that also appear in the larger set. */
function overlap(a: string, b: string): number {
  const A = content(a);
  const B = content(b);
  if (A.size === 0 || B.size === 0) return 0;
  const [small, large] = A.size <= B.size ? [A, B] : [B, A];
  let shared = 0;
  for (const w of small) if (large.has(w)) shared += 1;
  return shared / small.size;
}

/**
 * Evaluate a Refutation scaffolded attempt WITHOUT a model, against only the current lesson skill.
 *
 * The four slots are the four moves the lesson teaches: they say / but / because / therefore. The
 * checks are the lesson's own tests, applied mechanically and conservatively:
 *   - every slot has to be filled;
 *   - the BECAUSE must not restate the BUT (the delete test, approximated as content-word overlap —
 *     "the risk is overstated, because it is not as big as they claim" shares almost every word);
 *   - the THEREFORE must stay inside their argument rather than restarting the learner's own case.
 * The coaching names the issue and never supplies the repaired sentence. When it cannot be sure, it
 * passes the attempt: a heuristic that fails a learner it cannot read is worse than one that lets a
 * borderline attempt through to the guided round, where a coach with the whole context sees it.
 */
export function evaluateRefutationScaffold(slots: {
  theySay: string; but: string; because: string; therefore: string;
}): ScaffoldEvaluation {
  const filled = (s: string) => s.trim().split(/\s+/).filter(Boolean).length >= 3;
  const missing = (["theySay", "but", "because", "therefore"] as const).find((k) => !filled(slots[k]));
  if (missing) {
    const label = { theySay: "they say", but: "but", because: "because", therefore: "therefore" }[missing];
    return {
      complete: false,
      slot: label,
      coach: missing === "because"
        ? "You stated the objection. Now give the reason it is true — the because is where a refutation is won or lost."
        : missing === "therefore"
          ? "You gave a reason. Now say what that does to their argument — what is no longer established?"
          : missing === "but"
            ? "Say what you are denying, in one sentence, before you explain why."
            : "Start by restating the part of their argument you are answering.",
      retryRequired: true
    };
  }
  // The delete test: a because that mostly repeats the but explained nothing.
  if (overlap(slots.but, slots.because) >= 0.6 && content(slots.because).size <= 6) {
    return {
      complete: false,
      slot: "because",
      coach: "Your because repeats the objection in different words. Cover the words after “because” — if the answer means the same thing, the clause explained nothing. Name what actually goes wrong.",
      retryRequired: true
    };
  }
  // Drifting home: the last move talks about the learner's own side instead of theirs.
  const own = /\b(our|we|us)\b.*\b(case|plan|side|proposal|better|stronger|should win|prefer)\b/i;
  const theirs = /\b(their|they|the opponent'?s?|this argument)\b/i;
  if (own.test(slots.therefore) && !theirs.test(slots.therefore)) {
    return {
      complete: false,
      slot: "therefore",
      coach: "Your last move turned to your own case. Keep it pointed at their argument: what is now unproven, weaker, or no longer following?",
      retryRequired: true
    };
  }
  return { complete: true, coach: "", retryRequired: false };
}
