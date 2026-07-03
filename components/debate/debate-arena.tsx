"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DebateFormat, DebateMode, DebateSide, DebateStatus, Level, MessageRole, Organization, PracticeMode } from "@prisma/client";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  CircleAlert,
  Copy,
  DoorOpen,
  Gavel,
  Loader2,
  MessageSquareText,
  Swords,
  Timer,
  Trophy,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/profile/user-avatar";
import { AccessibilityPanel } from "@/components/debate/accessibility/accessibility-panel";
import { useAccessibility } from "@/components/debate/accessibility/accessibility-context";
import { MessageContent } from "@/components/debate/accessibility/message-content";
import { SpeakButton } from "@/components/debate/accessibility/speak-button";
import { SpeechInput } from "@/components/debate/accessibility/speech-input";
import { accessibilityFrameClass, resolveSpeechParams } from "@/lib/accessibility";
import { getAiPersona, ratingLabel } from "@/lib/ai-personas";
import {
  countDebateSpeeches,
  getNextSpeech,
  getSideLabel,
  parseFormatConfig,
  type DebateFormatConfig,
  type DebateSpeech
} from "@/lib/debate-formats";
import { cn, titleCase } from "@/lib/utils";
import { calculateDebateRating } from "@/lib/xp";
import { assessStudentSpeech, SUBMIT_HELPER_TEXT } from "@/lib/speech-quality";

type ArenaDebate = {
  id: string;
  organization: Organization;
  eventType: string;
  practiceMode: PracticeMode;
  format: DebateFormat;
  mode: DebateMode;
  level: Level;
  topic: string;
  status: DebateStatus;
  roundsMinimum: number;
  studentSide: DebateSide;
  opponentSide: DebateSide;
  turnTimeSeconds: number;
  prepTimeSeconds: number;
  graceTimeSeconds: number;
  formatConfig: unknown;
  aiPersona: string | null;
  overallScore: number | null;
};

type DebateMessage = {
  id: string;
  authorId: string | null;
  role: MessageRole;
  round: number;
  content: string;
  createdAt: string;
};

type ParticipantProfile = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: Level;
  organization: Organization | null;
  xp?: number | null;
  wins?: number | null;
  judgedDebates?: number | null;
};

export type JudgeReport = {
  overallScore: number;
  categoryScores: Array<{
    key: string;
    label: string;
    score: number;
    reason: string;
  }>;
  sharedSpeaking?: Record<string, number | undefined>;
  speakerScores?: Array<{
    speaker: string;
    team: "GOVERNMENT" | "OPPOSITION";
    score: number;
    rank: number;
    descriptor: string;
    rationale: string;
  }>;
  teamWinner?: "GOVERNMENT" | "OPPOSITION";
  losingSide?: "GOVERNMENT" | "OPPOSITION";
  confidenceLevel?: "low" | "medium" | "high";
  shortReasonForDecision?: string;
  longReasonForDecision?: string;
  reasonForDecision?: string;
  sideFeedback?: {
    government?: {
      didWell?: string[];
      missed?: string[];
    };
    opposition?: {
      didWell?: string[];
      missed?: string[];
    };
  };
  sideAnalysis?: {
    government?: TranscriptSideAnalysis;
    opposition?: TranscriptSideAnalysis;
  };
  transcriptFeedback?: {
    studentSide?: "GOVERNMENT" | "OPPOSITION";
    strongestClaim?: string;
    weakestClaim?: string;
    bestRefutation?: string;
    biggestDroppedArgument?: string;
    mostMissingPiece?: string;
    betterSentence?: string;
    modelRewrite?: string;
    skillToPractice?: string;
  };
  internalScoringSummary?: {
    governmentScore?: number;
    oppositionScore?: number;
    reasonWinnerSelected?: string;
  };
  judgeFairnessReport?: {
    centralClash?: string;
    realArgumentQuality?: string;
    emptyPhraseWarning?: string | null;
    droppedArguments?: string;
    motionConnection?: string;
    mechanismCheck?: string;
    weighingCheck?: string;
    betterVersion?: string;
    fairWinnerLogic?: string;
    practiceSkill?: string;
    whyWinnerWon?: string;
    whyLoserLost?: string;
  };
  roundDecidingClash?: {
    governmentBestArgument?: string;
    oppositionBestAnswer?: string;
    whyItDecides?: string;
  };
  keyClash?: string;
  strongestArgument?: string;
  weakestArgument?: string;
  strengths: string[];
  weaknesses: string[];
  improvementAdvice?: string[];
  recommendedLessons?: Array<{ lessonSlug: string; reason: string; priority: "high" | "medium" | "low" }>;
  ratingChange?: {
    overall: number;
    argument: number;
    refutation: number;
    weighing: number;
    evidence: number;
    organization: number;
    deliveryStyle: number;
    recommendedBot?: string;
    reasons?: {
      overall?: string;
      argument?: string;
      refutation?: string;
      weighing?: string;
      evidence?: string;
      organization?: string;
      deliveryStyle?: string;
    };
  };
  readinessForNextLevel: {
    ready: boolean;
    rationale: string;
    nextMilestone: string;
  };
  fallbackNotice?: string;
  aiNotice?: string;
  aiProvider?: string;
};

type TranscriptSideAnalysis = {
  whatTheyClaimed?: string[];
  bestArgument?: string;
  weakestArgument?: string;
  failedToAnswer?: string[];
  dropped?: string[];
  neededMoreWarrant?: string;
  neededMoreImpact?: string;
  neededMoreWeighing?: string;
  vagueOrUnsupported?: string;
  persuasiveReframe?: string;
  hiddenAssumptionAttack?: string;
};

type DebateArenaProps = {
  initialDebate: ArenaDebate;
  studentProfile: ParticipantProfile | null;
  opponentProfile: ParticipantProfile | null;
  initialMessages: DebateMessage[];
  initialJudgeReport: unknown;
};

async function requestJson<T>(url: string, options: RequestInit): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    ...options,
    headers
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "We could not complete that request. Please try again.");
  }

  return payload;
}

function coerceJudgeReport(value: unknown): JudgeReport | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<JudgeReport>;
  if (typeof candidate.overallScore !== "number" || !Array.isArray(candidate.categoryScores)) {
    return null;
  }

  return candidate as JudgeReport;
}

function formatClock(seconds: number) {
  const bounded = Math.max(0, seconds);
  const minutes = Math.floor(bounded / 60);
  const remainder = bounded % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatDuration(seconds: number, graceSeconds = 0) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  const base = remainder === 0 ? `${minutes} min` : `${minutes}:${String(remainder).padStart(2, "0")}`;
  return graceSeconds ? `${base} + ${graceSeconds}s grace` : base;
}

function sideTone(side: DebateSide) {
  return side === "GOVERNMENT" || side === "FOR"
    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
    : "border-rose-400/30 bg-rose-500/10 text-rose-100";
}

function speechForMessage(config: DebateFormatConfig, message: DebateMessage, speechMessages: DebateMessage[]) {
  if (message.role !== "AFFIRMATIVE" && message.role !== "NEGATIVE") {
    return null;
  }

  const index = speechMessages.findIndex((item) => item.id === message.id);
  return config.speeches[index] ?? null;
}

function lessonTitle(slug: string) {
  return titleCase(slug.replaceAll("-", " ").replace(" lesson", ""));
}

function winnerLabel(report: JudgeReport) {
  if (!report.teamWinner) {
    return "Winner unavailable";
  }

  return report.teamWinner === "GOVERNMENT" ? "Government / Affirmative" : "Opposition / Negative";
}

function losingLabel(report: JudgeReport) {
  const losingSide = report.losingSide ?? (report.teamWinner === "GOVERNMENT" ? "OPPOSITION" : "GOVERNMENT");
  return losingSide === "GOVERNMENT" ? "Government / Affirmative" : "Opposition / Negative";
}

function debateSideLabel(side: "GOVERNMENT" | "OPPOSITION") {
  return side === "GOVERNMENT" ? "Government / Affirmative" : "Opposition / Negative";
}

function profileLabel(profile: ParticipantProfile | null, fallback: string) {
  return profile?.displayName ?? profile?.username ?? fallback;
}

function profileHandle(profile: ParticipantProfile | null, fallback: string) {
  return profile?.username ?? profile?.displayName ?? fallback;
}

// Accessibility settings come from the single sitewide AccessibilityProvider mounted in the root
// layout, so the debate-room panel, /settings, and every speak button stay synchronized.
export function DebateArena({ initialDebate, studentProfile, opponentProfile, initialMessages, initialJudgeReport }: DebateArenaProps) {
  const { settings: a11y } = useAccessibility();
  const spokenIdRef = useRef<string | null>(null);
  const [debate, setDebate] = useState(initialDebate);
  const [messages, setMessages] = useState(initialMessages);
  const [studentInput, setStudentInput] = useState("");
  const [judgeReport, setJudgeReport] = useState<JudgeReport | null>(coerceJudgeReport(initialJudgeReport));
  const [decisionOpen, setDecisionOpen] = useState(Boolean(coerceJudgeReport(initialJudgeReport)));
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [aiNotice, setAiNotice] = useState(
    coerceJudgeReport(initialJudgeReport)?.aiNotice ?? coerceJudgeReport(initialJudgeReport)?.fallbackNotice ?? null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpponentThinking, setIsOpponentThinking] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepRemaining, setPrepRemaining] = useState(initialDebate.prepTimeSeconds);
  const [turnRemaining, setTurnRemaining] = useState(initialDebate.turnTimeSeconds);

  const config = useMemo(
    () => parseFormatConfig(debate.formatConfig, debate.format, debate.turnTimeSeconds),
    [debate.format, debate.formatConfig, debate.turnTimeSeconds]
  );
  const speechMessages = useMemo(
    () => messages.filter((message) => message.role === "AFFIRMATIVE" || message.role === "NEGATIVE"),
    [messages]
  );
  const completedSpeechCount = countDebateSpeeches(messages);
  const currentSpeech = getNextSpeech(config, completedSpeechCount);
  const isStudentTurn = Boolean(currentSpeech && currentSpeech.side === debate.studentSide);
  const isOpponentTurn = Boolean(currentSpeech && currentSpeech.side === debate.opponentSide);
  const canJudge = Boolean(!judgeReport && completedSpeechCount >= config.speeches.length && debate.status !== "JUDGED");
  const prepActive = prepRemaining > 0 && completedSpeechCount === 0 && config.prepTimeSeconds > 0 && !judgeReport;
  const turnActive = Boolean(currentSpeech && !prepActive && !judgeReport);
  // Signal for the voice input: only timed student turns "expire". Untimed/disabled turns (<=0s) and
  // paused turns never hit zero, so voice input keeps listening until the student stops it manually.
  const turnLimitSeconds = currentSpeech?.timeSeconds ?? debate.turnTimeSeconds;
  const studentSpeechTimeUp = turnLimitSeconds > 0 && turnActive && isStudentTurn && turnRemaining === 0;
  // Non-substantive speech guardrail: don't let "n" / "phones bad" through to a real debate round.
  const speechAssessment = useMemo(() => assessStudentSpeech(studentInput, debate.level), [studentInput, debate.level]);
  const canSubmitSpeech = studentInput.trim().length > 0 && speechAssessment.ok;
  const progress = Math.round((Math.min(completedSpeechCount, config.speeches.length) / Math.max(config.speeches.length, 1)) * 100);
  const persona = getAiPersona(debate.aiPersona);
  const studentRating = calculateDebateRating({
    xp: studentProfile?.xp,
    wins: studentProfile?.wins,
    judgedDebates: studentProfile?.judgedDebates
  });
  const studentName = profileLabel(studentProfile, "Student");
  const studentHandle = profileHandle(studentProfile, "student");
  const aiName = opponentProfile ? profileLabel(opponentProfile, "Opponent") : persona.name;
  const aiHandle = opponentProfile ? profileHandle(opponentProfile, "opponent") : persona.id;
  const aiRating = opponentProfile
    ? calculateDebateRating({ xp: opponentProfile.xp, wins: opponentProfile.wins, judgedDebates: opponentProfile.judgedDebates })
    : persona.rating;

  useEffect(() => {
    setTurnRemaining(currentSpeech?.timeSeconds ?? debate.turnTimeSeconds);
  }, [currentSpeech?.key, currentSpeech?.timeSeconds, debate.turnTimeSeconds]);

  useEffect(() => {
    if (!prepActive) {
      return;
    }

    const timer = window.setInterval(() => {
      setPrepRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [prepActive]);

  useEffect(() => {
    if (!turnActive) {
      return;
    }

    const timer = window.setInterval(() => {
      setTurnRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [turnActive, currentSpeech?.key]);

  async function submitStudentSpeech() {
    if (!studentInput.trim() || !currentSpeech || !isStudentTurn || judgeReport || prepActive) {
      return;
    }

    const assessment = assessStudentSpeech(studentInput, debate.level);
    if (!assessment.ok) {
      setError(assessment.reason ?? "Write at least 2–3 sentences so the opponent has something real to answer.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const studentMessage = await requestJson<{ message: DebateMessage }>(`/api/debates/${debate.id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          role: currentSpeech.messageRole,
          round: currentSpeech.round,
          speechKey: currentSpeech.key,
          content: studentInput.trim()
        })
      });

      setMessages((current) => [...current, studentMessage.message]);
      setStudentInput("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to submit your speech.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function requestOpponentSpeech() {
    if (!currentSpeech || !isOpponentTurn || judgeReport || prepActive) {
      return;
    }

    setIsOpponentThinking(true);
    setError(null);

    try {
      const opponentMessage = await requestJson<{ message: DebateMessage; opponent?: { aiNotice?: string; fallbackNotice?: string } }>(`/api/debates/${debate.id}/opponent`, {
        method: "POST",
        body: JSON.stringify({
          side: currentSpeech.messageRole,
          round: currentSpeech.round,
          speechKey: currentSpeech.key
        })
      });

      setMessages((current) => [...current, opponentMessage.message]);
      setAiNotice(opponentMessage.opponent?.aiNotice ?? opponentMessage.opponent?.fallbackNotice ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to get the AI opponent response.");
    } finally {
      setIsOpponentThinking(false);
    }
  }

  async function judgeDebate() {
    setIsJudging(true);
    setError(null);

    try {
      const result = await requestJson<{ debate: ArenaDebate; judge: JudgeReport; xpEarned: number }>(`/api/debates/${debate.id}/judge`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setDebate((current) => ({ ...current, status: result.debate.status, overallScore: result.debate.overallScore }));
      setJudgeReport(result.judge);
      setDecisionOpen(true);
      setXpEarned(result.xpEarned);
      setAiNotice(result.judge.aiNotice ?? result.judge.fallbackNotice ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to judge this round.");
    } finally {
      setIsJudging(false);
    }
  }

  // Auto-play the newest AI speech when the student has enabled audio autoplay (each speech once).
  useEffect(() => {
    if (!a11y.audioAutoplay || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const last = messages[messages.length - 1];
    if (!last || last.authorId || (last.role !== "AFFIRMATIVE" && last.role !== "NEGATIVE")) {
      return;
    }
    if (spokenIdRef.current === last.id) {
      return;
    }
    spokenIdRef.current = last.id;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(last.content);
      const { rate, pitch } = resolveSpeechParams(a11y.voiceStyle, a11y.speechRate);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore autoplay failures — transcript is always visible
    }
  }, [messages, a11y.audioAutoplay, a11y.voiceStyle, a11y.speechRate]);

  // Cancel any speech when leaving the arena.
  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        // ignore
      }
    };
  }, []);

  function copyTranscript() {
    const text = messages
      .map((message) => {
        const speaker = message.authorId ? studentName : message.role === "MODERATOR" ? "Moderator" : aiName;
        return `${speaker}: ${message.content}`;
      })
      .join("\n\n");
    try {
      void navigator.clipboard?.writeText(text);
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <div className={cn("min-h-[calc(100vh-9rem)] overflow-hidden rounded-lg border border-white/10 bg-neutral-950 text-white shadow-2xl", accessibilityFrameClass(a11y))}>
      <div className="border-b border-white/10 bg-black/30 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/debate" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-neutral-300 hover:bg-white/10")}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            New debate
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/15 text-blue-300">
              <Swords className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-blue-200">DebateArena AI</p>
              <p className="text-xs text-neutral-400">Arena room {debate.id.slice(-6).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-white/15 bg-white/[0.03] text-neutral-200 hover:bg-white/10")}>
              <DoorOpen className="h-4 w-4" aria-hidden />
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[320px_1fr_340px]">
        <aside className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Matchup</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0 text-center">
                <UserAvatar username={studentHandle} displayName={studentName} avatarUrl={studentProfile?.avatarUrl} size="lg" className="mx-auto border-white/20" />
                <p className="mt-2 truncate text-sm font-bold">{studentName}</p>
                <p className="truncate text-xs text-neutral-400">@{studentHandle}</p>
                <p className="mt-1 text-xs font-semibold text-emerald-200">{studentRating} · {ratingLabel(studentRating)}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold text-neutral-300">VS</span>
              <div className="min-w-0 text-center">
                <UserAvatar username={aiHandle} displayName={aiName} avatarUrl={opponentProfile?.avatarUrl ?? null} size="lg" className="mx-auto border-white/20" />
                <p className="mt-2 truncate text-sm font-bold">{aiName}</p>
                <p className="truncate text-xs text-neutral-400">@{aiHandle}</p>
                <p className="mt-1 text-xs font-semibold text-rose-200">{aiRating} · {ratingLabel(aiRating)}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-xs font-semibold sm:grid-cols-2">
              <span className="rounded-md border border-white/10 bg-black/30 px-2 py-2 text-neutral-300">
                {aiNotice && /fallback/i.test(aiNotice) ? "Local AI opponent" : "AI opponent ready"}
              </span>
              <span className="rounded-md border border-white/10 bg-black/30 px-2 py-2 text-neutral-300">
                Strength: {opponentProfile ? "student" : persona.difficulty}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex flex-wrap gap-2">
              <Badge className="border border-blue-400/30 bg-blue-500/10 text-blue-100">{config.label}</Badge>
              <Badge className="border border-purple-400/30 bg-purple-500/10 text-purple-100">{titleCase(debate.level)}</Badge>
            </div>
            <h1 className="mt-4 text-xl font-bold leading-tight">{debate.topic}</h1>
            <p className="mt-3 text-sm leading-6 text-neutral-400">{config.description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className={cn("rounded-lg border p-4", sideTone(debate.studentSide))}>
              <div className="flex items-center gap-3">
                <UserAvatar username={studentHandle} displayName={studentName} avatarUrl={studentProfile?.avatarUrl} size="sm" />
                <p className="text-xs font-semibold uppercase opacity-75">{studentName}</p>
              </div>
              <p className="mt-2 font-semibold">{getSideLabel(debate.studentSide)}</p>
            </div>
            <div className={cn("rounded-lg border p-4", sideTone(debate.opponentSide))}>
              <div className="flex items-center gap-3">
                <UserAvatar username={aiHandle} displayName={aiName} avatarUrl={opponentProfile?.avatarUrl ?? null} size="sm" />
                <p className="text-xs font-semibold uppercase opacity-75">{opponentProfile ? aiName : "AI opponent"}</p>
              </div>
              <p className="mt-2 font-semibold">{getSideLabel(debate.opponentSide)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">Round progress</span>
              <span className="text-neutral-400">
                {completedSpeechCount}/{config.speeches.length}
              </span>
            </div>
            <Progress value={progress} className="bg-white/10" />
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-200">
              <Timer className="h-4 w-4 text-emerald-300" aria-hidden />
              {prepActive ? "Prep timer" : "Turn timer"}
            </div>
            <p className="mt-3 text-5xl font-bold tabular-nums">{prepActive ? formatClock(prepRemaining) : formatClock(turnRemaining)}</p>
            {prepActive ? (
              <Button type="button" variant="outline" className="mt-4 w-full border-white/15 bg-white/[0.03] text-white hover:bg-white/10" onClick={() => setPrepRemaining(0)}>
                Start speeches now
              </Button>
            ) : null}
          </div>
        </aside>

        <main className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-neutral-500">Current speaker</p>
                <h2 className="mt-1 text-2xl font-bold">{currentSpeech ? currentSpeech.label : "Ready for judge"}</h2>
                {currentSpeech ? <p className="mt-1 text-sm text-neutral-400">{currentSpeech.guidance}</p> : null}
              </div>
              {currentSpeech ? (
                <Badge className={cn("border", sideTone(currentSpeech.side))}>
                  {getSideLabel(currentSpeech.side)} · {formatDuration(currentSpeech.timeSeconds, currentSpeech.graceSeconds)}
                </Badge>
              ) : (
                <Badge className="border border-emerald-400/30 bg-emerald-500/10 text-emerald-100">Judge ready</Badge>
              )}
            </div>
            {currentSpeech?.isRebuttal ? (
              <div className="mt-4 rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-sm font-medium text-amber-100">
                Rebuttal rule: no new arguments. New examples may support arguments already in the round.
              </div>
            ) : null}
          </div>

          <AccessibilityPanel />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Transcript</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyTranscript}
              disabled={messages.length === 0}
              className="border-white/15 bg-white/[0.03] text-neutral-200 hover:bg-white/10"
            >
              <Copy className="h-4 w-4" aria-hidden />
              Copy transcript
            </Button>
          </div>

          <div className="max-h-[560px] space-y-3 overflow-y-auto rounded-lg border border-white/10 bg-black/25 p-3">
            {messages.length === 0 ? (
              <EmptyState icon={MessageSquareText} title="No speeches yet" description="Start with the first required speech to build the transcript." className="border-white/10 bg-white/[0.04] text-white" />
            ) : (
              messages.map((message) => {
                const speech = speechForMessage(config, message, speechMessages);
                const isStudent = Boolean(message.authorId);
                const tone =
                  message.role === "MODERATOR"
                    ? "border-blue-400/20 bg-blue-500/10"
                    : speech
                      ? sideTone(speech.side)
                      : "border-white/10 bg-white/[0.04] text-neutral-200";

                return (
                  <article key={message.id} className={cn("rounded-lg border p-4", tone)}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                      <span>{speech ? `${speech.shortLabel} · ${isStudent ? studentName : aiName}` : "Moderator"}</span>
                      <span>{speech ? `Speech ${speech.round}` : "Room"}</span>
                    </div>
                    <MessageContent content={message.content} isStudent={isStudent} />
                  </article>
                );
              })
            )}
            {isSubmitting || isOpponentThinking ? (
              <LoadingState
                title={isOpponentThinking ? "AI opponent is preparing a speech" : "Saving your speech"}
                description="Updating the transcript and turn order."
                className="border-white/10 bg-white/[0.04] text-white"
              />
            ) : null}
          </div>

          {error ? (
            <div className="flex gap-2 rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-100">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </div>
          ) : null}

          {aiNotice ? (
            <div className="flex gap-2 rounded-md border border-blue-400/25 bg-blue-500/10 p-3 text-sm font-medium text-blue-100">
              <Bot className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {aiNotice}
            </div>
          ) : null}

          {!judgeReport && currentSpeech ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              {isStudentTurn ? (
                <>
                  <div className="mb-2">
                    <SpeechInput
                      disabled={isSubmitting || prepActive}
                      timeUp={studentSpeechTimeUp}
                      turnKey={currentSpeech.key}
                      onAppend={(text) => setStudentInput((current) => (current.trim() ? `${current.trim()} ${text}` : text))}
                    />
                  </div>
                  <Textarea
                    value={studentInput}
                    onChange={(event) => setStudentInput(event.target.value)}
                    placeholder={`Write or speak your ${currentSpeech.shortLabel} speech...`}
                    className="min-h-32 border-white/15 bg-neutral-900 text-white placeholder:text-neutral-500 focus-visible:ring-emerald-400"
                    disabled={isSubmitting || prepActive}
                  />
                  {studentInput.trim().length > 0 && !speechAssessment.ok ? (
                    <p className="mt-2 text-sm font-medium text-amber-300">{speechAssessment.reason ?? SUBMIT_HELPER_TEXT}</p>
                  ) : (
                    <p className="mt-2 text-sm text-neutral-500">{SUBMIT_HELPER_TEXT}</p>
                  )}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Button type="button" onClick={submitStudentSpeech} disabled={isSubmitting || !canSubmitSpeech || prepActive} className="bg-emerald-500 text-white hover:bg-emerald-500/90">
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MessageSquareText className="h-4 w-4" aria-hidden />}
                      Submit speech
                    </Button>
                    <Button type="button" variant="secondary" onClick={judgeDebate} disabled={!canJudge || isJudging}>
                      {isJudging ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Gavel className="h-4 w-4" aria-hidden />}
                      Judge debate
                    </Button>
                  </div>
                </>
              ) : (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-semibold">AI opponent is up next</p>
                    <p className="mt-1 text-sm leading-6 text-neutral-400">{currentSpeech.guidance}</p>
                  </div>
                  <Button type="button" onClick={requestOpponentSpeech} disabled={isOpponentThinking || prepActive} className="bg-rose-500 text-white hover:bg-rose-500/90">
                    {isOpponentThinking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Bot className="h-4 w-4" aria-hidden />}
                    AI opponent responds
                  </Button>
                </div>
              )}
            </div>
          ) : null}

          {canJudge ? (
            <Button type="button" onClick={judgeDebate} disabled={isJudging} className="h-12 w-full bg-purple-500 text-white hover:bg-purple-500/90">
              {isJudging ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Gavel className="h-4 w-4" aria-hidden />}
              Judge debate
            </Button>
          ) : null}
        </main>

        <aside className="space-y-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="font-semibold">Turn order</p>
            <div className="mt-3 space-y-2">
              {config.speeches.map((speech, index) => {
                const complete = index < completedSpeechCount;
                const active = currentSpeech?.key === speech.key;
                return (
                  <div
                    key={speech.key}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm transition",
                      complete
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                        : active
                          ? "border-purple-400/40 bg-purple-500/10 text-purple-100"
                          : "border-white/10 bg-white/[0.03] text-neutral-400"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{speech.shortLabel}</span>
                      <span>{complete ? "Done" : active ? "Now" : formatDuration(speech.timeSeconds)}</span>
                    </div>
                    <p className="mt-1 text-xs opacity-80">{getSideLabel(speech.side)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-neutral-300">
              <p className="font-semibold text-white">Live students coming soon</p>
              <p className="mt-1 leading-6">Future rooms will show opponent username, avatar, level, organization, online status, and invite links.</p>
            </div>
            <Link href="/debate" className={cn(buttonVariants({ variant: "secondary" }), "bg-white text-neutral-950 hover:bg-neutral-200")}>
              New debate
            </Link>
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }), "border-white/15 bg-white/[0.03] text-neutral-200 hover:bg-white/10")}>
              End debate
            </Link>
          </div>
        </aside>
      </div>

      {judgeReport && decisionOpen ? (
        <JudgeDecisionModal report={judgeReport} xpEarned={xpEarned} overallScore={debate.overallScore} onClose={() => setDecisionOpen(false)} />
      ) : null}
    </div>
  );
}

function JudgeDecisionModal({
  report,
  xpEarned,
  overallScore,
  onClose
}: {
  report: JudgeReport;
  xpEarned: number | null;
  overallScore: number | null;
  onClose: () => void;
}) {
  const governmentFeedback = report.sideFeedback?.government;
  const oppositionFeedback = report.sideFeedback?.opposition;
  const reason = report.longReasonForDecision ?? report.reasonForDecision ?? "The judge returned a completed ballot for this round.";
  const [showFullRubric, setShowFullRubric] = useState(false);

  const fairness = report.judgeFairnessReport;
  const compactReason = report.shortReasonForDecision ?? report.reasonForDecision ?? "The winning side won the key comparison.";
  const whyBullets = [
    fairness?.whyWinnerWon ?? fairness?.realArgumentQuality ?? report.strengths?.[0],
    fairness?.whyLoserLost ?? report.weaknesses?.[0] ?? fairness?.mechanismCheck
  ].filter(
    (value): value is string => Boolean(value)
  );
  const biggestFix =
    report.transcriptFeedback?.mostMissingPiece ?? fairness?.mechanismCheck ?? "Add a clear warrant and a concrete impact to your main point.";
  const betterSentence = report.transcriptFeedback?.betterSentence ?? fairness?.betterVersion;
  const practiceNext = fairness?.practiceSkill ?? report.transcriptFeedback?.skillToPractice ?? report.recommendedLessons?.[0]?.reason;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-5xl rounded-lg border border-white/10 bg-neutral-950 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <Badge className="border border-emerald-400/30 bg-emerald-500/10 text-emerald-100">
              <Trophy className="mr-1 h-3.5 w-3.5" aria-hidden />
              Judge decision
            </Badge>
            <h2 className="mt-3 text-3xl font-bold">{winnerLabel(report)} wins</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Losing side: {losingLabel(report)}
              {report.confidenceLevel ? ` · ${titleCase(report.confidenceLevel)} confidence` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="focus-ring rounded-md p-2 text-neutral-400 hover:bg-white/10 hover:text-white" aria-label="Close decision">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {report.aiNotice ?? report.fallbackNotice ? (
            <div className="flex gap-2 rounded-md border border-blue-400/25 bg-blue-500/10 p-3 text-sm font-medium text-blue-100">
              <Bot className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {report.aiNotice ?? report.fallbackNotice}
            </div>
          ) : null}

          {/* Compact default view — the whole result in about 15 seconds. */}
          <div className="grid gap-3 md:grid-cols-[0.55fr_1.45fr]">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 text-center">
              <p className="text-sm font-semibold text-neutral-400">Overall score</p>
              <p className="mt-3 text-6xl font-bold">{overallScore ?? report.overallScore}</p>
              <p className="mt-3 text-sm text-neutral-400">+{xpEarned ?? 0} XP earned</p>
              {report.ratingChange ? (
                <p className="mt-2 text-sm font-semibold text-emerald-200">
                  {report.ratingChange.overall >= 0 ? "+" : ""}
                  {report.ratingChange.overall} Debate Rating
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Short reason</p>
                <SpeakButton
                  text={`${compactReason}. ${reason}`}
                  label="Read feedback aloud"
                  className="border-white/15 bg-white/[0.03] text-neutral-200 hover:bg-white/10"
                />
              </div>
              <p className="mt-2 text-lg font-semibold leading-7">{compactReason}</p>
            </div>
          </div>

          {fairness?.emptyPhraseWarning ? (
            <div className="rounded-md border border-amber-400/30 bg-amber-500/10 p-3">
              <p className="text-sm font-semibold text-amber-200">Empty phrase warning</p>
              <p className="mt-1 text-sm leading-6 text-amber-50/90">{fairness.emptyPhraseWarning}</p>
            </div>
          ) : null}

          {whyBullets.length > 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Why you won / lost</p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-300">
                {whyBullets.slice(0, 2).map((bullet, index) => (
                  <li key={index}>{bullet}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.roundDecidingClash ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Round-deciding clash</p>
              <div className="mt-2 space-y-2 text-sm leading-6 text-neutral-300">
                {report.roundDecidingClash.governmentBestArgument ? (
                  <p>
                    <span className="font-semibold text-neutral-100">Government&rsquo;s best argument:</span> {report.roundDecidingClash.governmentBestArgument}
                  </p>
                ) : null}
                {report.roundDecidingClash.oppositionBestAnswer ? (
                  <p>
                    <span className="font-semibold text-neutral-100">Opposition&rsquo;s best answer:</span> {report.roundDecidingClash.oppositionBestAnswer}
                  </p>
                ) : null}
                {report.roundDecidingClash.whyItDecides ? (
                  <p>
                    <span className="font-semibold text-neutral-100">Why it decides the round:</span> {report.roundDecidingClash.whyItDecides}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <InsightCard title="Biggest fix" value={biggestFix} />
            {betterSentence ? <InsightCard title="Better sentence" value={betterSentence} /> : null}
            {practiceNext ? <InsightCard title="Practice next" value={practiceNext} /> : null}
          </div>

          <button
            type="button"
            onClick={() => setShowFullRubric((value) => !value)}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/10"
            aria-expanded={showFullRubric}
          >
            {showFullRubric ? "Hide full rubric breakdown" : "Show full rubric breakdown"}
          </button>

          {showFullRubric ? (
            <div className="space-y-5 border-t border-white/10 pt-5">
          {report.judgeFairnessReport ? (
            <div className="rounded-lg border border-amber-400/20 bg-amber-500/[0.06] p-4">
              <p className="font-semibold text-amber-100">Real argument vs. debate jargon</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {report.judgeFairnessReport.centralClash ? (
                  <InsightCard title="Central clash" value={report.judgeFairnessReport.centralClash} />
                ) : null}
                {report.judgeFairnessReport.realArgumentQuality ? (
                  <InsightCard title="Real argument quality" value={report.judgeFairnessReport.realArgumentQuality} />
                ) : null}
                {report.judgeFairnessReport.motionConnection ? (
                  <InsightCard title="Motion connection" value={report.judgeFairnessReport.motionConnection} />
                ) : null}
                {report.judgeFairnessReport.mechanismCheck ? (
                  <InsightCard title="Mechanism check" value={report.judgeFairnessReport.mechanismCheck} />
                ) : null}
                {report.judgeFairnessReport.weighingCheck ? (
                  <InsightCard title="Weighing check" value={report.judgeFairnessReport.weighingCheck} />
                ) : null}
                {report.judgeFairnessReport.droppedArguments ? (
                  <InsightCard title="Dropped arguments" value={report.judgeFairnessReport.droppedArguments} />
                ) : null}
                {report.judgeFairnessReport.fairWinnerLogic ? (
                  <InsightCard title="Fair winner logic" value={report.judgeFairnessReport.fairWinnerLogic} />
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <InsightCard title="Key clash" value={report.keyClash ?? "The central clash was which side gave the judge the clearer impact comparison."} />
            <InsightCard title="Strongest argument" value={report.strongestArgument ?? report.strengths[0] ?? "The clearest extended argument carried the most weight."} />
            <InsightCard title="Weakest argument" value={report.weakestArgument ?? report.weaknesses[0] ?? "The weakest argument needed more support and comparison."} />
          </div>

          {report.transcriptFeedback ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">What you said</p>
                {report.transcriptFeedback.studentSide ? (
                  <Badge variant="outline" className="border-white/15 text-neutral-200">
                    Your side: {debateSideLabel(report.transcriptFeedback.studentSide)}
                  </Badge>
                ) : null}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <InsightCard title="Strongest claim" value={report.transcriptFeedback.strongestClaim ?? "No clear strongest claim was returned."} />
                <InsightCard title="Weakest claim" value={report.transcriptFeedback.weakestClaim ?? "No clear weakest claim was returned."} />
                <InsightCard title="Best refutation" value={report.transcriptFeedback.bestRefutation ?? "No direct refutation was identified."} />
                <InsightCard title="Biggest dropped argument" value={report.transcriptFeedback.biggestDroppedArgument ?? "No dropped argument was identified."} />
              </div>
              <div className="mt-3 rounded-md border border-white/10 bg-neutral-950 p-3">
                <p className="text-sm font-semibold text-rose-200">Most missing piece</p>
                <p className="mt-2 text-sm leading-6 text-neutral-300">{report.transcriptFeedback.mostMissingPiece ?? "Add more warrant, impact, and weighing."}</p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <SideFeedback title="Government / Affirmative" didWell={governmentFeedback?.didWell ?? report.strengths.slice(0, 2)} missed={governmentFeedback?.missed ?? report.weaknesses.slice(0, 2)} />
            <SideFeedback title="Opposition / Negative" didWell={oppositionFeedback?.didWell ?? report.strengths.slice(0, 2)} missed={oppositionFeedback?.missed ?? report.weaknesses.slice(0, 2)} />
          </div>

          {report.sideAnalysis ? (
            <div className="grid gap-3 md:grid-cols-2">
              <TranscriptAnalysisCard title="Government transcript analysis" analysis={report.sideAnalysis.government} />
              <TranscriptAnalysisCard title="Opposition transcript analysis" analysis={report.sideAnalysis.opposition} />
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {report.categoryScores.slice(0, 16).map((category) => (
              <div key={category.key} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold">{category.label}</span>
                  <span className="text-neutral-400">{category.score}</span>
                </div>
                <Progress value={category.score <= 5 ? category.score * 20 : category.score} className="bg-white/10" />
                {category.reason ? <p className="mt-2 text-xs leading-5 text-neutral-400">{category.reason}</p> : null}
              </div>
            ))}
          </div>

          {report.ratingChange ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">Rating movement</p>
                {report.ratingChange.recommendedBot ? (
                  <Badge className="border border-blue-400/30 bg-blue-500/10 text-blue-100">Next bot: {report.ratingChange.recommendedBot}</Badge>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Argument", report.ratingChange.argument, report.ratingChange.reasons?.argument],
                  ["Refutation", report.ratingChange.refutation, report.ratingChange.reasons?.refutation],
                  ["Weighing", report.ratingChange.weighing, report.ratingChange.reasons?.weighing],
                  ["Evidence", report.ratingChange.evidence, report.ratingChange.reasons?.evidence],
                  ["Organization", report.ratingChange.organization, report.ratingChange.reasons?.organization],
                  ["Delivery", report.ratingChange.deliveryStyle, report.ratingChange.reasons?.deliveryStyle]
                ].map(([label, value, reason]) => (
                  <div key={String(label)} className="rounded-md border border-white/10 bg-neutral-950 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{label}</span>
                      <span className={cn("font-bold", Number(value) >= 0 ? "text-emerald-200" : "text-rose-200")}>
                        {Number(value) >= 0 ? "+" : ""}
                        {String(value)}
                      </span>
                    </div>
                    {reason ? <p className="mt-2 text-xs leading-5 text-neutral-400">{String(reason)}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {report.transcriptFeedback ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="font-semibold">How to improve</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-white/10 bg-neutral-950 p-3">
                  <p className="text-sm font-semibold text-emerald-200">Better sentence</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">{report.transcriptFeedback.betterSentence}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-neutral-950 p-3">
                  <p className="text-sm font-semibold text-blue-200">Model rewrite</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">{report.transcriptFeedback.modelRewrite}</p>
                </div>
              </div>
            </div>
          ) : null}

          {report.speakerScores ? (
            <div className="grid gap-3 md:grid-cols-2">
              {report.speakerScores.map((speaker) => (
                <div key={`${speaker.team}-${speaker.rank}-${speaker.speaker}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{speaker.speaker}</p>
                    <Badge className="border border-purple-400/30 bg-purple-500/10 text-purple-100">Rank {speaker.rank}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-neutral-400">
                    {speaker.score} speaker points · {speaker.descriptor}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">{speaker.rationale}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <FeedbackList title="Strengths" items={report.strengths} />
            <FeedbackList title="Weaknesses" items={report.weaknesses} />
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="font-semibold">Recommended skills to practice next</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {(report.recommendedLessons ?? []).slice(0, 6).map((lesson) => (
                <Link
                  key={lesson.lessonSlug}
                  href={`/skills/${lesson.lessonSlug}` as Route}
                  className="rounded-md border border-white/10 bg-neutral-950 p-3 transition hover:border-emerald-400/40 hover:bg-emerald-500/10"
                >
                  <p className="font-semibold">{lessonTitle(lesson.lessonSlug)}</p>
                  <p className="mt-1 text-sm leading-6 text-neutral-400">{lesson.reason}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="font-semibold">
              Readiness: {report.readinessForNextLevel.ready ? "Ready for the next level" : "Keep training"}
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-300">{report.readinessForNextLevel.rationale}</p>
            <p className="mt-3 text-sm font-semibold">Next milestone: {report.readinessForNextLevel.nextMilestone}</p>
          </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Link href="/debate" className={cn(buttonVariants({ variant: "secondary" }), "bg-white text-neutral-950 hover:bg-neutral-200")}>
              New debate
            </Link>
            <Link href={(report.recommendedLessons?.[0] ? `/skills/${report.recommendedLessons[0].lessonSlug}/practice` : "/skills") as Route} className={cn(buttonVariants({ variant: "outline" }), "border-white/15 bg-white/[0.03] text-neutral-200 hover:bg-white/10")}>
              Practice weak skill
            </Link>
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }), "border-white/15 bg-white/[0.03] text-neutral-200 hover:bg-white/10")}>
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-300">{value}</p>
    </div>
  );
}

function SideFeedback({ title, didWell, missed }: { title: string; didWell: string[]; missed: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="font-semibold">{title}</p>
      <p className="mt-3 text-sm font-semibold text-emerald-200">Did well</p>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-neutral-300">
        {didWell.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-semibold text-rose-200">Missed</p>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-neutral-300">
        {missed.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function TranscriptAnalysisCard({ title, analysis }: { title: string; analysis?: TranscriptSideAnalysis }) {
  const claims = analysis?.whatTheyClaimed?.slice(0, 3) ?? [];

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="font-semibold">{title}</p>
      {claims.length > 0 ? (
        <div className="mt-3">
          <p className="text-sm font-semibold text-neutral-400">What they claimed</p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-neutral-300">
            {claims.map((claim) => (
              <li key={claim}>{claim}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-3 grid gap-2 text-sm leading-6 text-neutral-300">
        <p>
          <span className="font-semibold text-emerald-200">Best:</span> {analysis?.bestArgument ?? "No best argument returned."}
        </p>
        <p>
          <span className="font-semibold text-rose-200">Weakest:</span> {analysis?.weakestArgument ?? "No weakest argument returned."}
        </p>
        <p>
          <span className="font-semibold text-neutral-200">Warrant:</span> {analysis?.neededMoreWarrant ?? "No warrant note returned."}
        </p>
        <p>
          <span className="font-semibold text-neutral-200">Impact:</span> {analysis?.neededMoreImpact ?? "No impact note returned."}
        </p>
        <p>
          <span className="font-semibold text-neutral-200">Weighing:</span> {analysis?.neededMoreWeighing ?? "No weighing note returned."}
        </p>
        <p>
          <span className="font-semibold text-neutral-200">Unsupported/vague:</span> {analysis?.vagueOrUnsupported ?? "No unsupported claim note returned."}
        </p>
      </div>
    </div>
  );
}

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="font-semibold">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-300">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-neutral-400">No items returned yet.</p>
      )}
    </div>
  );
}
