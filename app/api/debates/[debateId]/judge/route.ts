import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { generateJudgeDecision, judgeDecaRoleplay } from "@/lib/openai-debate";
import { apiError, hosaWithdrawn, HttpError, unauthorized } from "@/lib/api";
import { clientIp } from "@/lib/api-auth";
import { authOptions } from "@/lib/auth";
import { nearestAiPersona } from "@/lib/ai-personas";
import { getNextSpeech, isSpeechComplete, parseFormatConfig } from "@/lib/debate-formats";
import { lockUserRow } from "@/lib/practice-session";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { awardXpInTransaction, calculateDebateRating, rewardAmountForCompletion, utcDayBounds } from "@/lib/xp";

export const runtime = "nodejs";

function normalizeScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

type CategoryScore = {
  key: string;
  label?: string;
  score: number;
  reason?: string;
};

type JudgeResult = {
  overallScore: number;
  categoryScores: CategoryScore[];
  sharedSpeaking?: {
    clarity?: number;
    confidence?: number;
    pacing?: number;
    volume?: number;
    organization?: number;
    vocabulary?: number;
    persuasion?: number;
    professionalism?: number;
  };
  strengths: string[];
  weaknesses: string[];
  improvementAdvice?: string[];
  recommendedLessons?: Array<{ lessonSlug: string; reason: string; priority: "high" | "medium" | "low" }>;
  teamWinner?: "GOVERNMENT" | "OPPOSITION";
  readinessForNextLevel: {
    ready: boolean;
    rationale: string;
    nextMilestone: string;
  };
  // M15 S1A A3a — judging-basis metadata, persisted into the existing `Debate.judgeReport` Json
  // column. No schema migration. These record WHO SCORED THE ROUND separately from WHAT WAS ALLOWED
  // TO MOVE AUTHORITATIVE PROGRESSION — the two are not the same question and must never be
  // collapsed into one field. Rows judged before A3a simply lack these keys; absent must be read as
  // UNKNOWN basis, never as a trusted one.
  // Set by judgeDecaRoleplay only: "registry-weighted" when a FULLY SOURCED per-category point split
  // exists for the event, "seed" otherwise. Read here so `scoredBy` reports what actually happened
  // instead of what the organization implies.
  scoringMode?: "registry-weighted" | "seed";
  scoredBy?: "local-lexical-rubric" | "ai-seed-rubric" | "ai-registry-weighted";
  // Always "completion-only" while this route exists in its A3a form. Both scoring paths produce
  // FORMATIVE numbers: Path A is demonstrably gameable, and Path B, though semantically stronger and
  // registry-grounded, has never been validated against human judge ballots. So no ballot NUMBER and
  // no winner has authority here — only the server-verified fact that the round was completed.
  // "scored" is deliberately not a permitted value: writing it for DECA would claim an authority
  // that A3a does not grant.
  progressionBasis?: "completion-only";
  // Whether Side Coach was used during this round, read from the stored `Debate.assistedPractice`
  // flag the side-coach route already sets. An assisted round is still real completed activity; it
  // just must not be mistaken later for unassisted skill evidence.
  assisted?: boolean;
  ratingChange?: {
    overall: number;
    argument: number;
    refutation: number;
    weighing: number;
    evidence: number;
    organization: number;
    deliveryStyle: number;
    recommendedBot: string;
    reasons?: {
      overall: string;
      argument: string;
      refutation: string;
      weighing: string;
      evidence: string;
      organization: string;
      deliveryStyle: string;
    };
  };
};

function findCategory(result: JudgeResult, keys: string[]) {
  return result.categoryScores.find((category) => keys.includes(category.key));
}

function categoryScore(result: JudgeResult, keys: string[]) {
  const found = findCategory(result, keys);
  if (!found) {
    return undefined;
  }

  return found.score <= 5 ? normalizeScore(found.score * 20) : normalizeScore(found.score);
}

function debateSkillRecommendations(result: JudgeResult) {
  const weakText = [
    ...result.weaknesses,
    ...result.categoryScores
      .filter((category) => (category.score <= 5 ? category.score <= 3 : category.score <= 65))
      .map((category) => category.label ?? category.key)
  ]
    .join(" ")
    .toLowerCase();

  const recommendations: Array<{ lessonSlug: string; reason: string; priority: "high" | "medium" | "low" }> = [];

  const add = (lessonSlug: string, reason: string, priority: "high" | "medium" | "low" = "medium") => {
    if (!recommendations.some((item) => item.lessonSlug === lessonSlug)) {
      recommendations.push({ lessonSlug, reason, priority });
    }
  };

  if (weakText.includes("refut") || weakText.includes("rebut")) {
    add("debate-refutation-lesson", "Build direct refutation so each answer clearly clashes with the opponent's claim.", "high");
  }

  if (weakText.includes("signpost") || weakText.includes("organization")) {
    add("debate-signposting-lesson", "Strengthen organization and signposting so the judge can follow the flow.", "high");
  }

  if (weakText.includes("evidence") || weakText.includes("support") || weakText.includes("content")) {
    add("debate-claim-warrant-impact-lesson", "Improve support by connecting claims, warrants, and impacts.", "medium");
  }

  if (weakText.includes("weigh") || weakText.includes("impact") || weakText.includes("clash")) {
    add("debate-weighing-lesson", "Practice comparing impacts and explaining why one argument should decide the round.", "medium");
  }

  if (weakText.includes("structure") || weakText.includes("speech")) {
    add("debate-constructive-speeches-lesson", "Build clearer speech structure for constructive and summary work.", "low");
  }

  return recommendations.slice(0, 5);
}

function didStudentWin(result: JudgeResult, studentSide: "GOVERNMENT" | "OPPOSITION" | "FOR" | "AGAINST", overallScore: number) {
  if (!result.teamWinner) {
    return overallScore >= 80;
  }

  if (result.teamWinner === "GOVERNMENT") {
    return studentSide === "GOVERNMENT" || studentSide === "FOR";
  }

  return studentSide === "OPPOSITION" || studentSide === "AGAINST";
}

function skillDelta(score: number | undefined, fallbackScore: number) {
  const normalized = normalizeScore(score ?? fallbackScore);

  if (normalized >= 90) {
    return 14;
  }

  if (normalized >= 80) {
    return 9;
  }

  if (normalized >= 70) {
    return 4;
  }

  if (normalized >= 60) {
    return -3;
  }

  return -8;
}

// M15 S1A A3b-1 — WORDING ONLY. This used to emit "Argument rating increased because …", which
// claimed a measured rating change that never happened: `delta` is a band lookup over a formative
// practice-ballot score, not movement of any stored rating. The band still selects the sentence, so
// no number, threshold or scoring input changes here — only what the learner reads. `focusLabel`
// below turns the same band into the visible word.
function focusReason(area: string, delta: number, category: CategoryScore | undefined, fallback: string) {
  const evidence = category?.reason ?? fallback;
  if (delta >= 9) {
    return `The practice judge scored ${area} highly because ${evidence}`;
  }
  if (delta >= 0) {
    return `${area} is developing because ${evidence}`;
  }
  return `${area} is a focus area because ${evidence}`;
}

// The band is deliberately NOT converted to a word here. The visible label is derived in the ballot
// component instead, so ballots judged before A3b-1 — which stored these deltas as bare numbers and
// carry no label field — render the same honest wording on replay as new ones. Keeping the stored
// shape unchanged also means A3b-1 rewrites no history.

function overallRatingDelta(input: { wonDebate: boolean; overallScore: number; completedTurns: number; requiredTurns: number }) {
  const resultSwing = input.wonDebate ? 14 : -10;
  const qualitySwing = Math.round((input.overallScore - 75) / 3);
  const completionSwing = input.completedTurns >= input.requiredTurns ? 4 : -8;

  return Math.max(-24, Math.min(36, resultSwing + qualitySwing + completionSwing));
}

async function runOrganizationJudge(debate: {
  organization: "DEBATE" | "MODEL_UN" | "DECA" | "HOSA" | "MOCK_TRIAL" | "PUBLIC_SPEAKING";
  eventType: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ELITE";
  topic: string;
  messages: Array<{ role: "AFFIRMATIVE" | "NEGATIVE" | "MODERATOR" | "JUDGE" | "SYSTEM"; round: number; content: string }>;
  studentSide: "GOVERNMENT" | "OPPOSITION" | "FOR" | "AGAINST";
  opponentSide: "GOVERNMENT" | "OPPOSITION" | "FOR" | "AGAINST";
  format: string;
  aiPersona: string | null;
}) {
  const transcript = debate.messages.map((message) => ({
    role: message.role,
    round: message.round,
    content: message.content
  }));

  if (debate.organization === "DECA") {
    return judgeDecaRoleplay({
      level: debate.level,
      eventType: debate.eventType,
      scenario: debate.topic,
      transcript
    });
  }

  // No HOSA branch: M11R6 withdrew clinical judging, and the POST handler below returns 410 for any
  // HOSA row before this function can run — judgeHosaPerformance is not even imported here anymore.

  return generateJudgeDecision({
    organization: debate.organization,
    level: debate.level,
    eventType: debate.eventType,
    topic: debate.topic,
    transcript,
    studentSide: debate.studentSide,
    opponentSide: debate.opponentSide,
    format: debate.format,
    aiPersona: debate.aiPersona
  });
}

export async function POST(request: Request, { params }: { params: { debateId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    await enforceRateLimit({ userId: session.user.id, ip: clientIp(request), workload: "heavy" });

    const debate = await prisma.debate.findFirst({
      where: {
        id: params.debateId,
        OR: [{ createdById: session.user.id }, { studentId: session.user.id }, { opponentUserId: session.user.id }]
      },
      include: {
        messages: {
          orderBy: [{ round: "asc" }, { createdAt: "asc" }]
        }
      }
    });

    if (!debate) {
      throw new HttpError("Debate not found", 404);
    }

    // M14 Phase 1b (audit G23): the dedicated /api/ai/judge-hosa endpoint fails closed with 410
    // because clinical judging cannot be grounded in a sourced rating sheet — but this generic route
    // still dispatched organization "HOSA" to judgeHosaPerformance and then persisted the ballot,
    // awarded XP and bumped wins/streak. Existing HOSA rows are kept, not migrated; they are simply
    // impossible to judge here. This return sits after auth, rate limiting and the ownership fetch
    // (their order unchanged) and BEFORE every judging effect: no AI call, no fallback ballot, no
    // registry attribution, no XP, rank, wins, streak or completion write.
    if (debate.organization === "HOSA") {
      return hosaWithdrawn();
    }

    if (debate.status === "JUDGED" || debate.status === "ARCHIVED") {
      throw new HttpError("This debate has already been judged", 409);
    }

    const formatConfig = parseFormatConfig(debate.formatConfig, debate.format, debate.turnTimeSeconds);

    if (!isSpeechComplete(debate.messages, formatConfig)) {
      const completedSpeechCount = debate.messages.filter((message) => message.role === "AFFIRMATIVE" || message.role === "NEGATIVE").length;
      const nextSpeech = getNextSpeech(formatConfig, completedSpeechCount);
      throw new HttpError(
        nextSpeech
          ? `Complete all required speeches before judging. Next up: ${nextSpeech.label}.`
          : "Complete all required speeches before judging.",
        409
      );
    }

    const result = (await runOrganizationJudge(debate)) as JudgeResult;
    const targetedRecommendations = debateSkillRecommendations(result);
    result.recommendedLessons = [
      ...targetedRecommendations,
      ...(result.recommendedLessons ?? []).filter(
        (lesson) => !targetedRecommendations.some((targeted) => targeted.lessonSlug === lesson.lessonSlug)
      )
    ].slice(0, 6);

    const scores = {
      logic: categoryScore(result, ["argument", "businessReasoning", "healthScienceKnowledge"]),
      evidence: categoryScore(result, ["contentEvidence", "performanceIndicators", "medicalAccuracy"]),
      rebuttal: categoryScore(result, ["refutation", "judgeQuestions", "scenarioResponse"]),
      persuasion: categoryScore(result, ["clash", "solutionQuality", "taskCompletion"]),
      clarity: result.sharedSpeaking?.clarity ? normalizeScore(result.sharedSpeaking.clarity) : undefined,
      communication: result.sharedSpeaking?.professionalism
        ? normalizeScore(result.sharedSpeaking.professionalism)
        : result.sharedSpeaking?.confidence
          ? normalizeScore(result.sharedSpeaking.confidence)
          : undefined
    };
    const overallScore = normalizeScore(result.overallScore);
    // M15 S1A A3a — the winner is still COMPUTED and still shown, because it is useful coaching. It
    // simply has no progression authority any more. Every use of `wonDebate` below is confined to
    // the formative ballot payload (rating-movement prose, decision copy); it reaches no write.
    const wonDebate = didStudentWin(result, debate.studentSide, overallScore);
    // A3a: completion-only. The bonus is gone because the winner that would have earned it is not
    // trustworthy on EITHER scoring path. Path A (Debate/MT/PS/MUN) derives the winner from lexical
    // marker counts, and a marker-stuffed circular speech was measured beating genuine reasoning
    // 98-65 from either seat. Path B (DECA) never has an opponent at all, so `didStudentWin`'s
    // `overallScore >= 80` fallback calls a solo role-play a "win". `XP_REWARDS.debateWon` is
    // deliberately LEFT IN lib/constants.ts: M16's validated semantic judge may legitimately earn it
    // back behind a trust gate. Removing the constant would make that restoration a rewrite.
    // A4a: the AMOUNT is no longer fixed here — it is decided inside the transaction, after the user
    // row lock, from how many positive Debate awards this learner already has today. Declared here so
    // the response payload below can report what was actually granted.
    let xpEarned = 0;
    let rewardLimitReached = false;
    const completedSpeechCount = debate.messages.filter((message) => message.role === "AFFIRMATIVE" || message.role === "NEGATIVE").length;
    const argumentCategory = findCategory(result, ["argument"]);
    const refutationCategory = findCategory(result, ["refutation"]);
    const weighingCategory = findCategory(result, ["clash", "weighing", "solutionQuality"]);
    const evidenceCategory = findCategory(result, ["contentEvidence", "performanceIndicators", "medicalAccuracy"]);
    const organizationCategory = findCategory(result, ["organization", "signposting", "taskCompletion"]);
    const deliveryCategory = findCategory(result, ["delivery", "style", "professionalCommunication"]);
    const ratingDelta = overallRatingDelta({
      wonDebate,
      overallScore,
      completedTurns: completedSpeechCount,
      requiredTurns: formatConfig.speeches.length
    });
    let resultWithRating: JudgeResult = result;

    const [updatedDebate, updatedUser] = await prisma.$transaction(async (tx) => {
      // M15 S1A A2 — EXACTLY-ONCE CLAIM, the first operation in this transaction. The pre-read 409
      // above is a fast path, not the correctness mechanism: two racing requests can both pass it
      // and both finish the judge work. This conditional transition is authoritative — under
      // Postgres READ COMMITTED the losing transaction's updateMany blocks on the row lock,
      // re-evaluates its predicate against the committed row (status now JUDGED), matches zero
      // rows and exits before ANY progression write. If a later statement in the winning
      // transaction fails, the claim rolls back with it and the debate stays retryable.
      // Eligibility is exactly the pre-read's set ({SETUP, ACTIVE} -> JUDGED). Actual
      // simultaneous-request behavior relies on PostgreSQL conditional-update semantics; no
      // DB-writing concurrency test was executed.
      const claim = await tx.debate.updateMany({
        where: { id: debate.id, status: { notIn: ["JUDGED", "ARCHIVED"] } },
        data: { status: "JUDGED" }
      });
      if (claim.count === 0) {
        throw new HttpError("This debate has already been judged", 409);
      }

      // M15 S1A A4a — SECOND: serialize this learner's reward path. The A2 claim above already made
      // THIS debate exactly-once; the lock is what makes the DAILY QUOTA exact across DISTINCT
      // debates. Without it two concurrent judgements of two different rounds could both read
      // "2 awards today" and both award a third. Reuses the existing `FOR UPDATE` primitive rather
      // than a second copy of it, with an error that describes what actually failed here.
      await lockUserRow(tx, session.user.id, () => {
        throw new HttpError("Your account could not be loaded, so this round was not scored. Try again.", 409);
      });

      // THIRD: one server timestamp, captured AFTER the lock. Taking it before would be wrong — the
      // lock can block behind another transaction, so a request that started at 23:59:58 UTC could
      // acquire the lock after midnight and then be judged against the previous day's quota.
      const now = new Date();
      const { start: dayStart, end: dayEnd } = utcDayBounds(now);

      // FOURTH: count only POSITIVE Debate awards in this UTC day. `amount: { gt: 0 }` matters —
      // post-quota completions still write a zero-amount row (it keeps the coach's "active" date
      // truthful), and those must not consume the quota. PRACTICE_TEST rows are a separate quota and
      // are excluded by sourceType.
      const positiveAwardsToday = await tx.xPLog.count({
        where: {
          userId: session.user.id,
          sourceType: "DEBATE",
          amount: { gt: 0 },
          createdAt: { gte: dayStart, lt: dayEnd }
        }
      });
      xpEarned = rewardAmountForCompletion("DEBATE", positiveAwardsToday);
      rewardLimitReached = xpEarned === 0;

      const user = await tx.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { wins: true }
      });

      // Award atomically when eligible. Past the quota `awardXpInTransaction` is NOT called at all:
      // calling it with 0 would perform two pointless writes and re-derive rank from an unchanged
      // value. XP and rank are simply left alone.
      const awarded =
        xpEarned > 0
          ? await awardXpInTransaction(tx, session.user.id, xpEarned)
          : await tx.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { xp: true, rank: true } });
      // A3a: `user.wins` is read but NEVER incremented. It feeds only this projection, which selects
      // the recommended sparring bot — an internal difficulty heuristic, not a displayed rating. The
      // old `wonDebate ? user.wins + 1 : user.wins` speculatively counted a win this route no longer
      // records, so the projection now uses the stored value as it actually stands.
      const projectedRating = calculateDebateRating({
        xp: awarded.xp,
        wins: user.wins
      });
      const argumentDelta = skillDelta(scores.logic, overallScore);
      const refutationDelta = skillDelta(scores.rebuttal, overallScore);
      const weighingDelta = skillDelta(categoryScore(result, ["clash", "weighing", "solutionQuality"]), overallScore);
      const evidenceDelta = skillDelta(scores.evidence, overallScore);
      const organizationDelta = skillDelta(categoryScore(result, ["organization", "signposting", "taskCompletion"]), overallScore);
      const deliveryDelta = skillDelta(categoryScore(result, ["delivery", "style", "professionalCommunication"]), scores.communication ?? overallScore);

      resultWithRating = {
        ...result,
        ratingChange: {
          overall: ratingDelta,
          argument: argumentDelta,
          refutation: refutationDelta,
          weighing: weighingDelta,
          evidence: evidenceDelta,
          organization: organizationDelta,
          deliveryStyle: deliveryDelta,
          recommendedBot: nearestAiPersona(projectedRating).name,
          reasons: {
            overall: `The practice judge gave ${wonDebate ? "this round" : "the other side"} the decision on a ${overallScore} practice ballot score.`,
            argument: focusReason("argument", argumentDelta, argumentCategory, "of how clearly the student stated their claim."),
            refutation: focusReason("refutation", refutationDelta, refutationCategory, "of how specifically the student answered the opponent."),
            weighing: focusReason("weighing", weighingDelta, weighingCategory, "of how impacts were compared and framed for the ballot."),
            evidence: focusReason("evidence", evidenceDelta, evidenceCategory, "of the examples, evidence, and support given."),
            organization: focusReason("organization", organizationDelta, organizationCategory, "of the speech structure and signposting."),
            deliveryStyle: focusReason("delivery and style", deliveryDelta, deliveryCategory, "of the style, clarity, and communication shown.")
          }
        },
        // A3a basis metadata — written into `judgeReport` on every judged round from here on.
        //
        // `scoredBy` reports what ACTUALLY scored the round, never what the organization implies.
        // Deriving it from `debate.organization` alone would have been false today: DECA's
        // per-category point split is still unsourced (the seeded categories carry `points: null`
        // and PLACEHOLDER descriptions, so `getWeightedScoringRubric` returns null and
        // `judgeDecaRoleplay` sets scoringMode "seed"). Labelling those rounds "registry-weighted"
        // would have written a fabricated provenance claim into the database — the exact failure
        // this batch exists to prevent. Reading the real `scoringMode` also makes the label
        // self-correcting: it upgrades on its own the day a genuine sourced split lands.
        //
        // Note the naming trap on Path A: the local rubric is reached through a function called
        // `fallbackDebateJudge`, but it is the PRIMARY and only scorer in both provider-up and
        // provider-down states — the provider is asked for prose alone and cannot alter a number or
        // the winner. So no `degradedJudge` flag is written: there is no degraded numeric state to
        // describe, and inventing one would imply the live path scores when it does not.
        scoredBy:
          debate.organization !== "DECA"
            ? "local-lexical-rubric"
            : result.scoringMode === "registry-weighted"
              ? "ai-registry-weighted"
              : "ai-seed-rubric",
        progressionBasis: "completion-only",
        assisted: debate.assistedPractice
      };

      const savedDebate = await tx.debate.update({
        where: { id: debate.id },
        data: {
          status: "JUDGED",
          completedAt: new Date(),
          logicScore: scores.logic,
          evidenceScore: scores.evidence,
          rebuttalScore: scores.rebuttal,
          persuasionScore: scores.persuasion,
          clarityScore: scores.clarity,
          communicationScore: scores.communication,
          overallScore,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          recommendations: [
            ...(result.improvementAdvice ?? []),
            ...(result.recommendedLessons ?? []).map((lesson) => lesson.reason)
          ],
          readiness: result.readinessForNextLevel,
          judgeReport: resultWithRating
        }
      });

      // A3a: `wins` is GONE from this update — a formative ballot may not mint a competition win.
      // Historical values are left exactly as they stand: no reset, no backfill, no migration.
      //
      // A4a: `User.streak` is a badly named LIFETIME COUNT of completed practice activities, not a
      // consecutive-day streak — there is no date field and no reset anywhere in the codebase. It is
      // deliberately NOT converted here: capping only future increments while grandfathering the
      // stored value would make one column mean "sessions" below some row and "days" above it. So it
      // increments on EVERY completed round, including past the XP quota, because the learner really
      // did complete another practice session. `{ increment: 1 }` replaces a stale read-add-write
      // that could silently lose a concurrent update.
      const savedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          streak: { increment: 1 }
        }
      });

      // A4a — Z1: ONE ledger row per completed source, always, even when it earned nothing.
      // `amount: 0` past the quota is deliberate. XPLog's only reader is `getLastActivityForUsers`,
      // which takes max(createdAt) to show a coach when a student was last active; omitting the row
      // would make a student who practised three more rounds today look inactive since yesterday.
      // Nothing sums XPLog into `User.xp` and nothing filters on amount, so a zero row is harmless
      // to every existing consumer — and the quota query above excludes it explicitly.
      await tx.xPLog.create({
        data: {
          userId: session.user.id,
          amount: xpEarned,
          // The award is completion-only, so the ledger entry may not say "won". A reason string
          // branching on `wonDebate` would put the untrustworthy winner back into a progression
          // write through the back door.
          reason: xpEarned > 0 ? "Completed AI debate" : "Completed AI debate (daily XP limit reached)",
          sourceType: "DEBATE",
          sourceId: debate.id,
          createdAt: now
        }
      });

      // A3a: NO SpeakingSkillSnapshot is written, on any path. `result.sharedSpeaking` still exists
      // and still feeds the visible ballot — only the persisted row is gone.
      //
      // Path A projects those eight dimensions out of the same lexical counts, and two of them
      // ("pacing", "volume") describe audio this route never receives. Path B's values come from an
      // AI reading a real transcript against a sourced rubric — genuinely stronger, but still not
      // validated against human judge ballots, so still formative. No path currently clears the bar
      // for a row that a future learner model would read as measured skill.
      //
      // The table has zero readers today, so nothing observable regresses; the model, its schema and
      // every historical row are retained untouched, and M16 may resume writing behind a validated
      // trust gate.

      return [savedDebate, savedUser] as const;
    });

    return NextResponse.json({
      debate: updatedDebate,
      user: {
        xp: updatedUser.xp,
        streak: updatedUser.streak,
        wins: updatedUser.wins,
        rank: updatedUser.rank
      },
      xpEarned,
      // A4a: lets the arena distinguish "0 XP because today's limit is reached" from any other zero.
      // Without it the UI could only render a bare "+0 XP" — true, but unexplained and deflating.
      rewardLimitReached,
      judge: resultWithRating
    });
  } catch (error) {
    return apiError(error);
  }
}
