"use client";

import { useEffect, useMemo, useState } from "react";
import type { Level, Organization, PracticeMode } from "@prisma/client";
import {
  Bot,
  CheckCircle2,
  CircleAlert,
  Gavel,
  Loader2,
  MessageSquareText,
  Sparkles,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { LEVELS, ORGANIZATIONS } from "@/lib/constants";
import { EVENT_OPTIONS, PRACTICE_MODES } from "@/lib/rubrics";
import { cn, titleCase } from "@/lib/utils";

type DebateMode = "AI" | "REAL_STUDENT";
type MessageRole = "AFFIRMATIVE" | "NEGATIVE" | "MODERATOR" | "JUDGE" | "SYSTEM";

type DebateMessage = {
  id: string;
  authorId?: string | null;
  role: MessageRole;
  round: number;
  content: string;
  createdAt?: string;
};

type TopicPackage = {
  topic: string;
  background: string;
  affirmativePosition: string;
  negativePosition: string;
  suggestedEvidenceAngles: string[];
  fallbackNotice?: string;
};

type JudgeReport = {
  overallScore: number;
  categoryScores: Array<{
    key: string;
    label: string;
    score: number;
    reason: string;
  }>;
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
  speakerScores?: Array<{
    speaker: string;
    team: "GOVERNMENT" | "OPPOSITION";
    score: number;
    rank: number;
    descriptor: string;
    rationale: string;
  }>;
  teamWinner?: "GOVERNMENT" | "OPPOSITION";
  reasonForDecision?: string;
  strengths: string[];
  weaknesses: string[];
  improvementAdvice?: string[];
  recommendedLessons?: Array<{ lessonSlug: string; reason: string; priority: "high" | "medium" | "low" }>;
  readinessForNextLevel: {
    ready: boolean;
    rationale: string;
    nextMilestone: string;
  };
  fallbackNotice?: string;
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

export function DebateRoom() {
  const [organization, setOrganization] = useState<Organization>("DEBATE");
  const [eventType, setEventType] = useState("PARLIAMENTARY_DEBATE");
  const [level, setLevel] = useState<Level>("BEGINNER");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("DEBATE");
  const [mode, setMode] = useState<DebateMode>("AI");
  const [topicPackage, setTopicPackage] = useState<TopicPackage | null>(null);
  const [topicText, setTopicText] = useState("");
  const [debateId, setDebateId] = useState<string | null>(null);
  const [resolvedMode, setResolvedMode] = useState<DebateMode>("AI");
  const [matchNotice, setMatchNotice] = useState<string | null>(null);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [studentInput, setStudentInput] = useState("");
  const [judgeReport, setJudgeReport] = useState<JudgeReport | null>(null);
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const selectedOrg = ORGANIZATIONS.find((item) => item.value === organization);
  const eventOptions = EVENT_OPTIONS[organization];
  const selectedEvent = eventOptions.find((item) => item.value === eventType) ?? eventOptions[0];
  const allowedPracticeModes = PRACTICE_MODES.filter((item) => selectedEvent.allowedModes.includes(item.value));
  const selectedLevel = LEVELS.find((item) => item.value === level);
  const studentTurns = useMemo(() => messages.filter((message) => Boolean(message.authorId)), [messages]);
  const roundProgress = Math.min(Math.round((studentTurns.length / 3) * 100), 100);
  const canJudge = Boolean(debateId && studentTurns.length >= 3 && !judgeReport);
  const isInteractiveRound = practiceMode === "DEBATE" || practiceMode === "ROLEPLAY";
  const currentStudentSide: Extract<MessageRole, "AFFIRMATIVE" | "NEGATIVE"> =
    currentRound % 2 === 1 ? "AFFIRMATIVE" : "NEGATIVE";
  const currentOpponentSide: Extract<MessageRole, "AFFIRMATIVE" | "NEGATIVE"> =
    currentStudentSide === "AFFIRMATIVE" ? "NEGATIVE" : "AFFIRMATIVE";

  useEffect(() => {
    const nextEvent = EVENT_OPTIONS[organization][0];
    setEventType(nextEvent.value);
    setPracticeMode(nextEvent.allowedModes[0]);
  }, [organization]);

  useEffect(() => {
    if (!selectedEvent.allowedModes.includes(practiceMode)) {
      setPracticeMode(selectedEvent.allowedModes[0]);
    }
  }, [practiceMode, selectedEvent.allowedModes]);

  async function generateTopic() {
    setIsGeneratingTopic(true);
    setError(null);
    setAiNotice(null);

    try {
      const generated = await requestJson<TopicPackage>("/api/ai/topic", {
        method: "POST",
        body: JSON.stringify({ organization, eventType, practiceMode, level })
      });
      setTopicPackage(generated);
      setTopicText(generated.topic);
      setAiNotice(generated.fallbackNotice ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate topic.");
    } finally {
      setIsGeneratingTopic(false);
    }
  }

  async function startDebate() {
    if (!topicText.trim()) {
      setError("Generate or enter a topic before starting.");
      return;
    }

    setIsStarting(true);
    setError(null);
    setMatchNotice(null);
    setAiNotice(null);

    try {
      let nextMode = mode;
      let opponentUserId: string | undefined;

      if (mode === "REAL_STUDENT") {
        const match = await requestJson<{
          mode: DebateMode;
          opponent: { id: string; name: string | null } | null;
          reason: string;
        }>("/api/matchmaking", {
          method: "POST",
          body: JSON.stringify({ organization, level })
        });

        nextMode = match.mode;
        opponentUserId = match.opponent?.id;
        setMatchNotice(match.reason);
      }

      const created = await requestJson<{ debate: { id: string } }>("/api/debates", {
        method: "POST",
        body: JSON.stringify({
          organization,
          eventType,
          practiceMode,
          level,
          topic: topicText,
          mode: nextMode,
          opponentUserId
        })
      });

      const moderator = await requestJson<{ message: DebateMessage }>(`/api/debates/${created.debate.id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          role: "MODERATOR",
          round: 1,
          content: `${practiceMode === "ROLEPLAY" ? "Scenario" : "Topic"}: ${topicText}`
        })
      });

      setResolvedMode(nextMode);
      setDebateId(created.debate.id);
      setMessages([moderator.message]);
      setCurrentRound(1);
      setJudgeReport(null);
      setXpEarned(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to start debate.");
    } finally {
      setIsStarting(false);
    }
  }

  async function submitTurn() {
    if (!debateId || !studentInput.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const studentMessage = await requestJson<{ message: DebateMessage }>(`/api/debates/${debateId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          role: currentStudentSide,
          round: currentRound,
          content: studentInput.trim()
        })
      });

      setMessages((current) => [...current, studentMessage.message]);
      setStudentInput("");

      if (resolvedMode === "AI") {
        const opponentMessage = await requestJson<{ message: DebateMessage; opponent?: { fallbackNotice?: string } }>(`/api/debates/${debateId}/opponent`, {
          method: "POST",
          body: JSON.stringify({
            side: currentOpponentSide,
            round: currentRound
          })
        });

        setMessages((current) => [...current, opponentMessage.message]);
        setAiNotice(opponentMessage.opponent?.fallbackNotice ?? null);
      }

      setCurrentRound((round) => round + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to submit turn.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function judgeDebate() {
    if (!debateId) {
      return;
    }

    setIsJudging(true);
    setError(null);

    try {
      const result = await requestJson<{ judge: JudgeReport; xpEarned: number }>(`/api/debates/${debateId}/judge`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setJudgeReport(result.judge);
      setXpEarned(result.xpEarned);
      setAiNotice(result.judge.fallbackNotice ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to judge debate.");
    } finally {
      setIsJudging(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Round Setup</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">Choose the track, generate a prompt, then start your judged practice room.</p>
              </div>
              <Badge variant={debateId ? "accent" : "secondary"}>{debateId ? "Live" : "Ready"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-3 text-sm font-semibold">Organization</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {ORGANIZATIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setOrganization(item.value)}
                    className={cn(
                      "focus-ring rounded-md border p-3 text-left text-sm transition-colors",
                      organization === item.value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                    )}
                    disabled={Boolean(debateId)}
                  >
                    <span className="font-semibold">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold">Level</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {LEVELS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setLevel(item.value)}
                    className={cn(
                      "focus-ring rounded-md border p-3 text-left text-sm transition-colors",
                      level === item.value ? "border-secondary bg-secondary text-secondary-foreground" : "bg-background hover:bg-muted"
                    )}
                    disabled={Boolean(debateId)}
                  >
                    <span className="font-semibold">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold">Event type</p>
              <div className="grid gap-2">
                {eventOptions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setEventType(item.value)}
                    className={cn(
                      "focus-ring rounded-md border p-3 text-left text-sm transition-colors",
                      eventType === item.value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                    )}
                    disabled={Boolean(debateId)}
                  >
                    <span className="font-semibold">{item.label}</span>
                    <span className={cn("mt-1 block leading-5", eventType === item.value ? "text-primary-foreground/85" : "text-muted-foreground")}>
                      {item.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold">Practice mode</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {allowedPracticeModes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setPracticeMode(item.value)}
                    className={cn(
                      "focus-ring rounded-md border p-3 text-left text-sm transition-colors",
                      practiceMode === item.value ? "border-secondary bg-secondary text-secondary-foreground" : "bg-background hover:bg-muted"
                    )}
                    disabled={Boolean(debateId)}
                  >
                    <span className="font-semibold">{item.label}</span>
                    <span className={cn("mt-1 block leading-5", practiceMode === item.value ? "text-secondary-foreground/85" : "text-muted-foreground")}>
                      {item.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {isInteractiveRound ? (
              <div>
                <p className="mb-3 text-sm font-semibold">Opponent</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMode("AI")}
                    className={cn(
                      "focus-ring rounded-md border p-3 text-left transition-colors",
                      mode === "AI" ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                    )}
                    disabled={Boolean(debateId)}
                  >
                    <Bot className="mb-2 h-4 w-4" aria-hidden />
                    <span className="text-sm font-semibold">AI opponent</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("REAL_STUDENT")}
                    className={cn(
                      "focus-ring rounded-md border p-3 text-left transition-colors",
                      mode === "REAL_STUDENT" ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                    )}
                    disabled={Boolean(debateId)}
                  >
                    <Users className="mb-2 h-4 w-4" aria-hidden />
                    <span className="text-sm font-semibold">Student match</span>
                  </button>
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{selectedOrg?.label} {practiceMode === "ROLEPLAY" ? "Scenario" : "Prompt"}</p>
                  <p className="text-xs text-muted-foreground">{selectedEvent.label} · {selectedLevel?.label}</p>
                </div>
                <Button type="button" variant="secondary" onClick={generateTopic} disabled={isGeneratingTopic || Boolean(debateId)}>
                  {isGeneratingTopic ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
                  Generate
                </Button>
              </div>
              <Textarea
                value={topicText}
                onChange={(event) => setTopicText(event.target.value)}
                placeholder="Generate a prompt or write one manually."
                className="mt-4 min-h-24"
                disabled={Boolean(debateId)}
              />
              {isGeneratingTopic ? (
                <LoadingState className="mt-4" title="Building an original prompt" description="Creating context, sides, and evidence angles for your level." />
              ) : null}
              {topicPackage ? (
                <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>{topicPackage.background}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border bg-card p-3">
                      <span className="font-semibold text-foreground">Affirmative</span>
                      <p className="mt-1">{topicPackage.affirmativePosition}</p>
                    </div>
                    <div className="rounded-md border bg-card p-3">
                      <span className="font-semibold text-foreground">Negative</span>
                      <p className="mt-1">{topicPackage.negativePosition}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {matchNotice ? (
              <div className="flex gap-2 rounded-md border bg-muted p-3 text-sm text-muted-foreground">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {matchNotice}
              </div>
            ) : null}

            {aiNotice ? (
              <div className="flex gap-2 rounded-md border border-primary/25 bg-primary/10 p-3 text-sm font-medium text-primary">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {aiNotice}
              </div>
            ) : null}

            <Button type="button" className="w-full" size="lg" onClick={startDebate} disabled={isStarting || Boolean(debateId)}>
              {isStarting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <MessageSquareText className="h-5 w-5" aria-hidden />}
              {practiceMode === "ROLEPLAY" ? "Start roleplay" : practiceMode === "TEST" ? "Create test prompt" : practiceMode === "LESSON" ? "Create lesson prompt" : "Start debate"}
            </Button>

            {error ? (
              <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Live Debate Room</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Complete at least three turns before submitting to the organization-specific AI judge.
                </p>
              </div>
              <Badge variant={resolvedMode === "AI" ? "secondary" : "accent"}>
                {resolvedMode === "AI" ? "AI opponent" : "Student match"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold">Minimum round progress</span>
                <span className="text-muted-foreground">{studentTurns.length}/3 turns</span>
              </div>
              <Progress value={roundProgress} />
            </div>

            <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-lg border bg-background p-3">
              {messages.length === 0 ? (
                <EmptyState
                  icon={MessageSquareText}
                  title="No round started yet"
                  description="Generate a topic, start the debate, then submit your first argument."
                />
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "rounded-lg border p-4",
                      message.role === "AFFIRMATIVE"
                        ? "bg-primary text-primary-foreground"
                        : message.role === "NEGATIVE"
                          ? "bg-card"
                          : "bg-muted"
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                      <span>{message.role === "MODERATOR" ? "Moderator" : titleCase(message.role)}</span>
                      <span>Round {message.round}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                  </div>
                ))
              )}
              {isSubmitting ? (
                <LoadingState title={resolvedMode === "AI" ? "AI opponent is preparing a response" : "Saving your turn"} description="Keeping the round transcript and progress in sync." />
              ) : null}
            </div>

            {debateId && !judgeReport ? (
              <div className="rounded-lg border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Your turn</p>
                    <p className="text-sm text-muted-foreground">
                      Round {currentRound} {practiceMode === "ROLEPLAY" ? "student response" : `${titleCase(currentStudentSide)} argument`}
                    </p>
                  </div>
                  {studentTurns.length >= 3 ? <Badge variant="accent">Judge ready</Badge> : null}
                </div>
                <Textarea
                  value={studentInput}
                  onChange={(event) => setStudentInput(event.target.value)}
                  placeholder={practiceMode === "ROLEPLAY" ? "Write your roleplay response, proposed solution, or judge-question answer." : "Write your argument, rebuttal, weighing, or closing extension."}
                />
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <Button type="button" onClick={submitTurn} disabled={isSubmitting || !studentInput.trim()} className="sm:flex-1">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MessageSquareText className="h-4 w-4" aria-hidden />}
                    Submit turn
                  </Button>
                  <Button type="button" variant="secondary" onClick={judgeDebate} disabled={!canJudge || isJudging} className="sm:flex-1">
                    {isJudging ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Gavel className="h-4 w-4" aria-hidden />}
                    Judge debate
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {judgeReport ? (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>AI Judge Report</CardTitle>
                <Badge variant="accent">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                  +{xpEarned ?? 0} XP
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {judgeReport.fallbackNotice ? (
                <div className="flex gap-2 rounded-md border border-primary/25 bg-primary/10 p-3 text-sm font-medium text-primary">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {judgeReport.fallbackNotice}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-[0.6fr_1.4fr]">
                <div className="rounded-lg border bg-background p-5 text-center">
                  <p className="text-sm font-semibold text-muted-foreground">Overall score</p>
                  <p className="mt-3 text-5xl font-bold">{judgeReport.overallScore}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {judgeReport.categoryScores.slice(0, 8).map((category) => (
                    <div key={category.key} className="rounded-lg border bg-background p-3">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-semibold">{category.label}</span>
                        <span className="text-muted-foreground">{category.score}</span>
                      </div>
                      <Progress value={category.score <= 5 ? category.score * 20 : category.score} />
                    </div>
                  ))}
                </div>
              </div>

              {judgeReport.sharedSpeaking ? (
                <div className="rounded-lg border bg-background p-4">
                  <p className="font-semibold">Shared speaking skills</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(judgeReport.sharedSpeaking).map(([skill, value]) => (
                      <div key={skill}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-semibold">{titleCase(skill)}</span>
                          <span className="text-muted-foreground">{value ?? 0}%</span>
                        </div>
                        <Progress value={value ?? 0} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {judgeReport.teamWinner || judgeReport.reasonForDecision ? (
                <div className="rounded-lg border bg-background p-4">
                  {judgeReport.teamWinner ? <p className="font-semibold">Winner: {titleCase(judgeReport.teamWinner)}</p> : null}
                  {judgeReport.reasonForDecision ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{judgeReport.reasonForDecision}</p> : null}
                </div>
              ) : null}

              {judgeReport.speakerScores ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {judgeReport.speakerScores.map((speaker) => (
                    <div key={`${speaker.team}-${speaker.rank}`} className="rounded-lg border bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{speaker.speaker}</p>
                        <Badge variant="outline">Rank {speaker.rank}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {speaker.score} speaker points · {speaker.descriptor}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{speaker.rationale}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-3">
                <FeedbackList title="Strengths" items={judgeReport.strengths} />
                <FeedbackList title="Weaknesses" items={judgeReport.weaknesses} />
                <FeedbackList title="Recommendations" items={judgeReport.improvementAdvice ?? judgeReport.recommendedLessons?.map((lesson) => lesson.reason) ?? []} />
              </div>

              <div className="rounded-lg border bg-background p-4">
                <p className="font-semibold">
                  Readiness: {judgeReport.readinessForNextLevel.ready ? "Ready for the next level" : "Keep training"}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{judgeReport.readinessForNextLevel.rationale}</p>
                <p className="mt-3 text-sm font-semibold">Next milestone: {judgeReport.readinessForNextLevel.nextMilestone}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="font-semibold">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">No items returned yet.</p>
      )}
    </div>
  );
}
