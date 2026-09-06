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
 * Lessons migrate one at a time after acceptance, and a held lesson can never appear here (asserted
 * by the smoke suite against the registry). Refutation was the pilot; Clash is the first lesson to
 * follow it, reinforcing BOTH earlier skills — the cumulative use the model calls for.
 */
export const GUIDED_APPLICATIONS: readonly GuidedApplication[] = [
  { lessonId: "debate-refutation", primary: "refutation", reinforcement: ["claim-warrant-impact"] },
  { lessonId: "debate-clash", primary: "clash", reinforcement: ["claim-warrant-impact", "refutation"] }
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
  { id: "disagreement", label: "Help me find the disagreement", competency: "clash", purpose: "Identify the disagreement" },
  { id: "neutral", label: "Help me state it neutrally", competency: "clash", purpose: "State the clash neutrally" },
  { id: "connect", label: "Help me connect the two sides", competency: "clash", purpose: "Connect the two sides" },
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
  /**
   * Present ONLY where something was verified exactly rather than by shape — today, the answer-types
   * label, which is drawn from a closed four-term vocabulary. The component renders this sentence
   * verbatim on completion so the learner is told what was and was not judged. Absent everywhere
   * else, which keeps every other lesson's completion copy unchanged.
   */
  exactCheck?: string;
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

/**
 * Evaluate a Clash scaffolded attempt WITHOUT a model, against only the current lesson skill.
 *
 * The three slots are the three moves the lesson teaches: what Side A is trying to prove, what Side B
 * is trying to prove, and the question both depend on. The checks are the lesson's own tests, applied
 * mechanically and conservatively:
 *   - every slot has to be filled;
 *   - the clash must not simply restate one side's position (content-word overlap with one side and
 *     almost none with the other) — a clash question is one BOTH sides are answering;
 *   - the clash must not carry a verdict: a word that presumes the answer ("obviously", "fails",
 *     "unfairly", "our side"), or a "why ..." that has already decided it;
 *   - the clash must not be the motion: an actor-should question ("the school should…") is the whole
 *     debate, not the disagreement; a narrow question that merely contains "should" is not refused.
 * The coaching names the issue and never writes the clash for the learner. When it cannot be sure,
 * it passes the attempt — the guided round's coach sees the whole context and does the real judging.
 */
/** Whitespace, case and punctuation removed, so "copied it out" is judged on the words themselves. */
const canonical = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

/** Is `text` the same sentence as `other`, allowing for a trailing or leading fragment? */
function essentiallyTheSame(text: string, other: string): boolean {
  const a = canonical(text);
  const b = canonical(other);
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return long.includes(short) && short.length >= long.length * 0.8;
}

/**
 * Evaluate a Clash scaffolded attempt WITHOUT a model, against only the current lesson skill.
 *
 * SHAPE ONLY, and the boundary is drawn deliberately narrowly. The three slots are the three moves
 * the lesson teaches: what Side A is trying to prove, what Side B is trying to prove, and the
 * question both depend on. What is checked here is what can be checked WITHOUT understanding the
 * argument:
 *   - every slot is filled;
 *   - the clash is not one of the two sides copied out — judged by near-identity of the text, not by
 *     word overlap;
 *   - the clash is not the MOTION restated — judged against the motion the lesson authored, not by
 *     guessing from sentence shape;
 *   - a clash that opens "why …" presupposes its own answer.
 *
 * WHAT IS DELIBERATELY NOT CHECKED, after four review rounds proved each attempt wrong in both
 * directions. A word-overlap test for "copied one side" refused correct answers (a good clash
 * question is short and built from the words both sides used) and, tuned the other way, went inert
 * whenever Side B was written as the negation of Side A. A sentence-shape test for "this is the
 * motion" refused principle-level clashes the lesson itself teaches, such as "whether a school
 * should be able to decide what its students wear". A word list for loaded phrasing refused the
 * disputed proposition itself in any fairness round, where "unfairly" is precisely what the two
 * sides disagree about. Those judgments need the argument, not the string, so they belong to the
 * guided round's coach, which has the whole round in view. A heuristic that blocks a learner who is
 * right is worse than one that lets a borderline attempt through to a coach who can read it.
 */
export function evaluateClashScaffold(
  slots: { sideA: string; sideB: string; clash: string },
  context: { motion?: string } = {}
): ScaffoldEvaluation {
  const filled = (s: string) => s.trim().split(/\s+/).filter(Boolean).length >= 3;
  const missing = (["sideA", "sideB", "clash"] as const).find((k) => !filled(slots[k]));
  if (missing) {
    const label = { sideA: "side a", sideB: "side b", clash: "the real clash" }[missing];
    return {
      complete: false,
      slot: label,
      coach: missing === "sideA"
        ? "Start by saying what Side A is trying to prove, in one sentence."
        : missing === "sideB"
          ? "Now say what Side B is trying to prove \u2014 their position, in their own terms."
          : "You have both positions. Now name the question they are both answering \u2014 the one thing that cannot go both ways.",
      retryRequired: true
    };
  }
  const clash = slots.clash.trim();
  // The motion is not the disagreement. Compared against the motion this exercise actually set, so a
  // narrow question that merely contains "should" is never mistaken for it.
  if (context.motion && essentiallyTheSame(clash, context.motion)) {
    return {
      complete: false,
      slot: "the real clash",
      coach: "That is the motion, not the disagreement \u2014 every argument in the round fits under it. Name the specific question the two arguments take opposite positions on.",
      retryRequired: true
    };
  }
  // A question that opens "why X" has already decided X.
  if (/^\s*(why|how come)\b/i.test(clash)) {
    return {
      complete: false,
      slot: "the real clash",
      coach: "A question that starts with \u201cwhy\u201d has already decided the answer. Phrase it so that either side could still win it.",
      retryRequired: true
    };
  }
  // One side copied out is not the question they are both answering.
  if (essentiallyTheSame(clash, slots.sideA) || essentiallyTheSame(clash, slots.sideB)) {
    return {
      complete: false,
      slot: "the real clash",
      coach: "That is one side's position copied out, not the question they are both answering. Name the thing they take opposite positions on, so that either side could still win it.",
      retryRequired: true
    };
  }
  return { complete: true, coach: "", retryRequired: false };
}

/**
 * Evaluate the Round Orientation tracking scenario WITHOUT a model. SHAPE ONLY, like the others:
 * three slots filled, and the three answers distinct from one another — a learner who writes the same
 * argument under "answered" and under "no response" has not yet separated the two questions the
 * lesson teaches. Whether the learner picked the RIGHT argument for each slot is not judged here:
 * that needs the exchange to be read, and a string cannot do it. No guided round follows this
 * lesson; the scenario is the application, and its feedback stays at the shape.
 */
export function evaluateRoundTrackingScaffold(slots: { answered: string; unresolved: string; noResponse: string }): ScaffoldEvaluation {
  const filled = (s: string) => s.trim().split(/\s+/).filter(Boolean).length >= 2;
  const missing = (["answered", "unresolved", "noResponse"] as const).find((k) => !filled(slots[k]));
  if (missing) {
    const label = { answered: "answered", unresolved: "still unresolved", noResponse: "no response" }[missing];
    return {
      complete: false,
      slot: label,
      coach: missing === "answered"
        ? "Start with the argument Side B replied to. Name it in a few words."
        : missing === "unresolved"
          ? "Now the issue the two sides are still disagreeing about after the defence — what do they still not agree on?"
          : "One of Side A's arguments was never touched. Name it.",
      retryRequired: true
    };
  }
  if (essentiallyTheSame(slots.answered, slots.noResponse)) {
    return {
      complete: false,
      slot: "no response",
      coach: "The argument that was answered and the argument that got no response cannot be the same one. Look again at which of Side A's two arguments Side B actually spoke about.",
      retryRequired: true
    };
  }
  return { complete: true, coach: "", retryRequired: false };
}

/**
 * Evaluate the Evidence Evaluation bounding scenario WITHOUT a model. SHAPE ONLY, and honestly so:
 * three slots filled, and "does not yet establish" distinct from "shows" — a learner who writes the
 * same thing in both has not yet separated what the evidence reaches from what it leaves. Whether
 * the learner bounded the evidence CORRECTLY is not judged here: that needs the claim and the
 * evidence read together, which a string cannot do. The scenario is direct constructed practice of
 * the lesson's productive objective; its evaluation is shape-only unless separately validated.
 */
export function evaluateEvidenceScaffold(slots: { shows: string; notYet: string; need: string }): ScaffoldEvaluation {
  const filled = (s: string) => s.trim().split(/\s+/).filter(Boolean).length >= 3;
  const missing = (["shows", "notYet", "need"] as const).find((k) => !filled(slots[k]));
  if (missing) {
    const label = { shows: "shows", notYet: "does not yet establish", need: "would need" }[missing];
    return {
      complete: false,
      slot: label,
      coach: missing === "shows"
        ? "Start with what was actually observed: what was measured, where, over what period, compared with what."
        : missing === "notYet"
          ? "Now the gap. Which part of the claim as stated does this evidence not reach?"
          : "Say what evidence would close that gap — what would have to be shown for the claim as stated.",
      retryRequired: true
    };
  }
  if (essentiallyTheSame(slots.shows, slots.notYet)) {
    return {
      complete: false,
      slot: "does not yet establish",
      coach: "What it shows and what it does not yet establish cannot be the same thing. The second is the part of the claim that is still only a claim.",
      retryRequired: true
    };
  }
  return { complete: true, coach: "", retryRequired: false };
}

/**
 * ANSWER TYPES. The lesson's own procedure, in the lesson's own order: say what is true in the round
 * if the answer succeeds, read the direction that outcome points, then name the type. The two
 * reasoning slots are checked for SHAPE ONLY — present, distinct, and not the label word standing in
 * for a thought. The third slot is different in kind: the taxonomy is a CLOSED four-term vocabulary,
 * so comparing it to the authored classification is an exact deterministic judgment, not a heuristic.
 * A matching label therefore proves the label and nothing about the reasoning that reached it, and
 * the learner-facing copy says exactly that (`exactCheck` below).
 */
export const ANSWER_TYPE_TERMS = ["defense", "indict", "turn", "offense"] as const;
export type AnswerTypeTerm = (typeof ANSWER_TYPE_TERMS)[number];

/** Every spelling and inflection that names one term. Two terms named is not a classification. */
const ANSWER_TYPE_BY_WORD: Readonly<Record<string, AnswerTypeTerm>> = {
  defense: "defense", defence: "defense", defensive: "defense", defensively: "defense",
  indict: "indict", indicts: "indict", indicted: "indict", indictment: "indict",
  turn: "turn", turns: "turn", turned: "turn", turning: "turn",
  offense: "offense", offence: "offense", offensive: "offense", offensively: "offense"
};

/** Which direction each named move points. Membership is absolute: an indict is always defense and a
 *  turn is always offense, so an evidence-aimed answer that reverses is a turn rather than an indict. */
const ANSWER_TYPE_DIRECTION: Readonly<Record<AnswerTypeTerm, "defense" | "offense">> = {
  defense: "defense", indict: "defense", turn: "offense", offense: "offense"
};

/** Which of the four terms `text` names, in no particular order. Exact word matching, never fuzzy. */
export function namedAnswerTypes(text: string): AnswerTypeTerm[] {
  const seen = new Set<AnswerTypeTerm>();
  for (const word of canonical(text).split(" ")) {
    const term = ANSWER_TYPE_BY_WORD[word];
    if (term) seen.add(term);
  }
  return [...seen];
}

/**
 * The label slot's input contract: ONE taxonomy term, not a sentence about one. The slot is
 * normalised (case, punctuation, surrounding space, a leading article) and must then BE one of the
 * four terms — not merely contain one. So "Turn", " turn " and "a turn" are the term; "this is a
 * turn", "turn blah blah", "turn offense" and "defense indict turn offense" are not classifications
 * and are refused. Enumerating the vocabulary in one box therefore cannot pass.
 */
export function soleAnswerTypeTerm(text: string): AnswerTypeTerm | null {
  const words = canonical(text).split(" ").filter(Boolean);
  if (words[0] === "a" || words[0] === "an" || words[0] === "the") words.shift();
  if (words.length !== 1) return null;
  return ANSWER_TYPE_BY_WORD[words[0]] ?? null;
}

export function evaluateAnswerTypesScaffold(
  slots: { ifItSucceeds: string; direction: string; type: string },
  expected: AnswerTypeTerm
): ScaffoldEvaluation {
  const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount(slots.ifItSucceeds) < 3) {
    return {
      complete: false,
      slot: "what is now true",
      coach: "Start with the outcome: suppose the answer works completely — what has changed about their argument, and what has changed for your side?",
      retryRequired: true
    };
  }
  // Not a semantic judgment: the four term words are dropped from the shared word list (which already
  // ignores anything four letters or shorter) and what is left is counted, so the NAME of the move
  // cannot stand in for the outcome it is supposed to describe — "it is a turn" leaves nothing.
  const withoutLabels = words(slots.ifItSucceeds).filter((w) => !ANSWER_TYPE_BY_WORD[w]);
  if (withoutLabels.length < 3) {
    return {
      complete: false,
      slot: "what is now true",
      // Two different failures share one length check, and they must not share one message: naming
      // the move instead of the outcome is a different mistake from writing too little.
      coach: namedAnswerTypes(slots.ifItSucceeds).length > 0
        ? "This blank is for what becomes true in the round, not for the name of the move. Say what happens to their argument and whether anything now counts for your side."
        : "Say a little more about what becomes true: what happens to their argument, and whether anything now counts for your side.",
      retryRequired: true
    };
  }
  if (wordCount(slots.direction) < 3) {
    return {
      complete: false,
      slot: "which direction that is",
      coach: "Read your own sentence back and say which of the two it describes: their argument only counts for less, or something now counts for your side.",
      retryRequired: true
    };
  }
  if (essentiallyTheSame(slots.ifItSucceeds, slots.direction)) {
    return {
      complete: false,
      slot: "which direction that is",
      coach: "The second blank is not a repeat of the first. The first says what became true; this one says which direction that outcome points.",
      retryRequired: true
    };
  }
  const named = soleAnswerTypeTerm(slots.type);
  if (named === null) {
    const mentioned = namedAnswerTypes(slots.type);
    return {
      complete: false,
      slot: "the answer type",
      coach: mentioned.length > 1
        ? "One term, not several. Decide which single name fits the outcome you wrote."
        : "This blank takes one word on its own: defense, indict, turn or offense.",
      retryRequired: true
    };
  }
  if (named !== expected) {
    // A learner who names the right direction but the wrong move inside it has not said something
    // false — a turn IS offense — so the coaching must not tell them it did. Two cases, split on the
    // closed vocabulary: wrong direction goes back to the outcome sentence; wrong move inside the
    // right direction goes to the question that discriminates the two. Neither names the answer.
    const sameDirection = ANSWER_TYPE_DIRECTION[named] === ANSWER_TYPE_DIRECTION[expected];
    return {
      complete: false,
      slot: "the answer type",
      coach: sameDirection
        ? (ANSWER_TYPE_DIRECTION[expected] === "offense"
            ? "The direction is right, but not the name. Did their own argument supply what now counts for your side, or is this a reason of your own standing beside it?"
            : "The direction is right, but not the name. Did the answer go after their evidence itself, or after the step they were using it for?")
        : "That is not the direction this answer points. Go back to your own first blank: if that is what becomes true, does their argument only count for less, or does something now count for your side?",
      retryRequired: true
    };
  }
  return {
    complete: true,
    coach: "",
    // The whole truth about what just happened, for the component to show.
    exactCheck: "The type is right: this answer is a " + expected + ". The two sentences above were checked only for being there and being different — nothing read whether your reasoning is correct.",
    retryRequired: false
  };
}

/**
 * The evaluator for each lesson's scaffolded try, keyed by lesson id and taking the slot values in
 * the lesson's own slot order. A lesson with a scaffolded try and no entry here cannot be checked and
 * therefore cannot open its guided round — fail closed, and asserted by the smoke suite.
 */
export type ScaffoldContext = { motion?: string };

/**
 * TURN MECHANICS. The lesson's four named moves, as the learner meets them. Multi-word terms, so the
 * label slot is normalised as a WHOLE ANSWER and must BE one of these — never merely contain one:
 * "link turn" passes, "Link Turn" passes, "turn" does not (two of the four are turns), and
 * "link turn impact turn" does not. Same contract as the answer-types label, one vocabulary wider.
 */
export const TURN_MOVE_TERMS = ["no-link", "link turn", "impact defense", "impact turn"] as const;
export type TurnMoveTerm = (typeof TURN_MOVE_TERMS)[number];

/** Accepted spellings, normalised. Hyphen and space are the same separator; British spelling passes. */
const TURN_MOVE_BY_PHRASE: Readonly<Record<string, TurnMoveTerm>> = {
  "no link": "no-link", "nolink": "no-link", "no link answer": "no-link",
  "link turn": "link turn", "link turns": "link turn",
  "impact defense": "impact defense", "impact defence": "impact defense",
  "impact turn": "impact turn", "impact turns": "impact turn"
};

/** The whole answer, normalised, or null when it is not exactly one of the four moves. */
export function soleTurnMoveTerm(text: string): TurnMoveTerm | null {
  const words = canonical(text.replace(/-/g, " ")).split(" ").filter(Boolean);
  if (words[0] === "a" || words[0] === "an" || words[0] === "the") words.shift();
  return TURN_MOVE_BY_PHRASE[words.join(" ")] ?? null;
}

/**
 * The learner reasons first and names the move second, in the lesson's own order: what changes in
 * their causal story, what becomes true if the answer succeeds, then the move. The two reasoning
 * slots are SHAPE-ONLY — present, distinct, and not the move name standing in for a thought. The
 * move slot is an exact whole-answer match against the authored classification, which is honest
 * because the vocabulary is closed. A correct label proves the label and nothing about the reasoning.
 */
export function evaluateTurnMechanicsScaffold(
  slots: { changes: string; becomesTrue: string; move: string },
  expected: TurnMoveTerm
): ScaffoldEvaluation {
  const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount(slots.changes) < 3) {
    return {
      complete: false,
      slot: "what changes in their story",
      coach: "Start inside their argument: which part is your answer working on, the connection between action and outcome, or the endpoint where the outcome is called bad?",
      retryRequired: true
    };
  }
  // Same closed-vocabulary guard as the answer-types scaffold, applied to BOTH reasoning slots: the
  // NAME of the move cannot stand in for the account of what happened. The move words are genuinely
  // removed before the length is counted — a length check, never a judgment about meaning.
  const namesMove = (text: string) => Object.keys(TURN_MOVE_BY_PHRASE)
    .some((phrase) => canonical(text.replace(/-/g, " ")).includes(phrase));
  const withoutMoves = (text: string) => {
    let stripped = canonical(text.replace(/-/g, " "));
    for (const phrase of Object.keys(TURN_MOVE_BY_PHRASE)) stripped = stripped.split(phrase).join(" ");
    return words(stripped);
  };
  const reasoningSlots = [
    { key: "changes" as const, label: "which part, and what it does to it",
      thin: "Say which part of their argument your answer works on, and what it does to that part." },
    { key: "becomesTrue" as const, label: "what becomes true",
      thin: "Suppose the answer works completely: what is then true about their outcome, and does anything now count for your side?" }
  ];
  for (const { key, label, thin } of reasoningSlots) {
    if (withoutMoves(slots[key]).length >= 3) continue;
    return {
      complete: false,
      slot: label,
      coach: namesMove(slots[key])
        ? "This blank is for what happens inside their argument, not for the name of the move. The name goes in the last blank."
        : thin,
      retryRequired: true
    };
  }
  if (essentiallyTheSame(slots.changes, slots.becomesTrue)) {
    return {
      complete: false,
      slot: "what becomes true",
      coach: "The second blank is not a repeat of the first. The first says what your answer does to their argument; this one says what is true in the round once it succeeds.",
      retryRequired: true
    };
  }
  const named = soleTurnMoveTerm(slots.move);
  if (named === null) {
    return {
      complete: false,
      slot: "the move, in the lesson's words",
      coach: "This blank takes one move name on its own: no-link, link turn, impact defense or impact turn. \u201cTurn\u201d by itself does not say which one.",
      retryRequired: true
    };
  }
  if (named !== expected) {
    // One message for every wrong move. Naming which axis was wrong would halve the four-term space
    // on the next guess, and the slot is the only graded element here; the coaching re-runs the
    // lesson's own two questions instead, which is true whichever move the learner named.
    return {
      complete: false,
      slot: "the move, in the lesson's words",
      coach: "That is not the move. Read your own second blank again and ask the lesson's two questions of it: does your answer change whether their outcome arrives, or what it is worth once it does — and does anything now count for your side?",
      retryRequired: true
    };
  }
  return {
    complete: true,
    coach: "",
    exactCheck: "The move is right: this answer is an " + expected + ". The two sentences above were checked only for being there and being different \u2014 nothing read whether your account of the reversal is correct.",
    retryRequired: false
  };
}

/**
 * The authored classification for the turn-mechanics exercise: the answer grants that the families
 * arrive and defends their arrival as what makes the street safer, so it reverses the endpoint.
 * `coached-performance:smoke` pins the authored response this was keyed against.
 */
const TURN_MECHANICS_EXPECTED: TurnMoveTerm = "impact turn";

/**
 * The authored classification for the answer-types exercise: the response in that lesson's prompt
 * reverses the opponent's own worry, so it is a turn. It lives here rather than in the lesson because
 * `scaffoldedTry` has no field for an expected answer and inventing one to hold a key would make a
 * content field lie. `coached-performance:smoke` pins the authored response text this was keyed
 * against, so prompt and key cannot drift apart silently.
 */
const ANSWER_TYPES_EXPECTED: AnswerTypeTerm = "turn";

export const SCAFFOLD_EVALUATORS: Readonly<Record<string, (values: readonly string[], context: ScaffoldContext) => ScaffoldEvaluation>> = {
  "debate-refutation": (v) => evaluateRefutationScaffold({ theySay: v[0] ?? "", but: v[1] ?? "", because: v[2] ?? "", therefore: v[3] ?? "" }),
  "debate-clash": (v, context) => evaluateClashScaffold({ sideA: v[0] ?? "", sideB: v[1] ?? "", clash: v[2] ?? "" }, context),
  "debate-round-orientation": (v) => evaluateRoundTrackingScaffold({ answered: v[0] ?? "", unresolved: v[1] ?? "", noResponse: v[2] ?? "" }),
  "debate-evidence-evaluation": (v) => evaluateEvidenceScaffold({ shows: v[0] ?? "", notYet: v[1] ?? "", need: v[2] ?? "" }),
  "debate-answer-types": (v) =>
    evaluateAnswerTypesScaffold({ ifItSucceeds: v[0] ?? "", direction: v[1] ?? "", type: v[2] ?? "" }, ANSWER_TYPES_EXPECTED),
  "debate-turn-mechanics": (v) =>
    evaluateTurnMechanicsScaffold({ changes: v[0] ?? "", becomesTrue: v[1] ?? "", move: v[2] ?? "" }, TURN_MECHANICS_EXPECTED)
};

export function evaluateScaffoldFor(lessonId: string, values: readonly string[], context: ScaffoldContext = {}): ScaffoldEvaluation | null {
  const evaluator = SCAFFOLD_EVALUATORS[lessonId];
  return evaluator ? evaluator(values, context) : null;
}
