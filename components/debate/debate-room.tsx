"use client";

import { useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { DebateFormat, Level } from "@prisma/client";
import { Bot, Check, CircleAlert, Clock3, Loader2, MessageSquareText, RefreshCw, Sparkles, Swords, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { normalizeAccessibility } from "@/lib/accessibility";
import { LEARNING_PROFILE_KEY, normalizeLearningProfile } from "@/lib/learning-path";
import { DEFAULT_TRACK, trackById, trackBySlug } from "@/lib/training-tracks";
import { AI_DEBATE_PERSONAS } from "@/lib/ai-personas";
import {
  DEBATE_CATEGORIES,
  FORMAT_CARDS,
  QUICK_TURN_OPTIONS,
  buildDebateFormatConfig,
  getSideLabel,
  type DebateSideChoice
} from "@/lib/debate-formats";
import { LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type TopicPackage = {
  topic: string;
  background: string;
  affirmativePosition: string;
  negativePosition: string;
  suggestedEvidenceAngles: string[];
  fallbackNotice?: string;
  aiNotice?: string;
};

async function requestJson<T>(url: string, options: RequestInit, fallbackMessage = "That request did not go through. Please try again."): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    ...options,
    headers
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    // Prefer the server's specific message; otherwise use the caller's action-specific fallback.
    throw new Error(payload.error ?? fallbackMessage);
  }

  return payload;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes} min` : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function DebateRoom({ track }: { track?: string }) {
  // The selected training track (from the hub link ?track=slug) decides the organization the AI
  // opponent/judge use. Falls back to General Debate. URL is the strongest source of truth.
  const trackInfo = trackBySlug(track ?? "") ?? trackById(DEFAULT_TRACK);
  const trackOrganization = trackInfo.organization;
  const router = useRouter();
  const [format, setFormat] = useState<DebateFormat>("PARLIAMENTARY");
  const [category, setCategory] = useState<(typeof DEBATE_CATEGORIES)[number]>("Global");
  const [level, setLevel] = useState<Level>("BEGINNER");
  const [turnTimeSeconds, setTurnTimeSeconds] = useState<number>(120);
  const [sideChoice, setSideChoice] = useState<DebateSideChoice>("GOVERNMENT");
  const [aiGeneratedTopic, setAiGeneratedTopic] = useState(true);
  const [topicText, setTopicText] = useState("This house believes that schools should teach practical AI literacy.");
  const [topicPackage, setTopicPackage] = useState<TopicPackage | null>(null);
  const [generatedTopics, setGeneratedTopics] = useState<string[]>([]);
  const [aiPersona, setAiPersona] = useState("socratic-questioner");
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [audioMode, setAudioMode] = useState(false);
  const [beginnerCoach, setBeginnerCoach] = useState(false);

  // Default beginner coaching ON for new/beginner students (from the learning profile), and persist
  // the choice so the arena can read it. Recommended-on, but the student can turn it off before start.
  useEffect(() => {
    let recommended = false;
    try {
      const stored = window.localStorage.getItem(LEARNING_PROFILE_KEY);
      if (stored) {
        const exp = normalizeLearningProfile(JSON.parse(stored)).experience;
        recommended = exp === "NEW" || exp === "BEGINNER";
      }
    } catch {
      // ignore
    }
    setBeginnerCoach(recommended);
    try {
      window.localStorage.setItem("debatearena_side_coach", recommended ? "on" : "off");
    } catch {
      // ignore
    }
  }, []);

  function toggleBeginnerCoach() {
    setBeginnerCoach((current) => {
      const next = !current;
      try {
        window.localStorage.setItem("debatearena_side_coach", next ? "on" : "off");
      } catch {
        // ignore
      }
      return next;
    });
  }

  // Audio mode is a client-side presentation preference (no schema change): selecting it enables the
  // arena's audio autoplay + read-aloud via the shared accessibility localStorage key.
  function selectDebateMode(audio: boolean) {
    setAudioMode(audio);
    if (audio && typeof window !== "undefined") {
      try {
        const key = "debatearena-accessibility";
        const existing = window.localStorage.getItem(key);
        const merged = normalizeAccessibility({
          ...(existing ? JSON.parse(existing) : {}),
          audioAutoplay: true,
          readAiAloud: true
        });
        window.localStorage.setItem(key, JSON.stringify(merged));
      } catch {
        // ignore storage failures — text debate still works
      }
    }
  }

  const config = useMemo(() => buildDebateFormatConfig(format, turnTimeSeconds), [format, turnTimeSeconds]);
  const selectedFormat = FORMAT_CARDS.find((item) => item.format === format) ?? FORMAT_CARDS[0];
  const sideOptions: Array<{ value: DebateSideChoice; label: string; detail: string }> = [
    {
      value: config.sides.affirmative,
      label: getSideLabel(config.sides.affirmative),
      detail: "You speak for the motion or proposal."
    },
    {
      value: config.sides.negative,
      label: getSideLabel(config.sides.negative),
      detail: "You challenge the motion or proposal."
    },
    {
      value: "RANDOM",
      label: "Random",
      detail: "Let the room assign your side."
    }
  ];

  async function generateTopic() {
    setIsGeneratingTopic(true);
    setError(null);
    setAiNotice(null);

    try {
      const generated = await requestJson<TopicPackage>("/api/ai/topic", {
        method: "POST",
        body: JSON.stringify({
          organization: trackOrganization,
          eventType: config.eventType,
          practiceMode: "DEBATE",
          level,
          focusArea: category,
          previousTopics: generatedTopics
        })
      }, "Could not generate a motion right now. Please try again.");
      setTopicPackage(generated);
      setTopicText(generated.topic);
      setGeneratedTopics((current) => [...current, generated.topic].slice(-25));
      setAiGeneratedTopic(true);
      setAiNotice(generated.aiNotice ?? generated.fallbackNotice ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate a motion right now.");
    } finally {
      setIsGeneratingTopic(false);
    }
  }

  async function startDebate() {
    if (!topicText.trim()) {
      setError("Add a motion or generate one before creating the room.");
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const created = await requestJson<{ debate: { id: string } }>("/api/debates", {
        method: "POST",
        body: JSON.stringify({
          organization: trackOrganization,
          eventType: config.eventType,
          practiceMode: "DEBATE",
          format,
          category,
          level,
          topic: topicText.trim(),
          aiGeneratedTopic,
          turnTimeSeconds: format === "QUICK_1V1" ? turnTimeSeconds : config.turnTimeSeconds,
          prepTimeSeconds: config.prepTimeSeconds,
          side: sideChoice,
          mode: "AI",
          aiPersona
        })
      }, "Could not create your debate room. Please try again.");

      await requestJson<{ message: { id: string } }>(`/api/debates/${created.debate.id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          role: "MODERATOR",
          round: 1,
          content: `Motion: ${topicText.trim()}`
        })
      }, "Could not create your debate room. Please try again.");

      router.push(`/debate/${created.debate.id}` as Route);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create the debate room.");
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-neutral-950 text-white shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2 text-sm sm:px-6">
        <span className="font-semibold text-neutral-200">Training in: {trackInfo.label}</span>
        <Link href="/training" className="font-semibold text-emerald-300 hover:underline">
          Switch track
        </Link>
      </div>
      <div className="border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/15 text-blue-300">
              <Swords className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-blue-200">DebateArena AI</p>
              <h2 className="text-xl font-bold">Create Debate Room</h2>
            </div>
          </div>
          <Badge className="border border-purple-400/30 bg-purple-500/10 text-purple-100">AI opponent ready</Badge>
        </div>
      </div>

      <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-[1fr_0.72fr]">
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Motion</p>
                <p className="mt-1 text-sm text-neutral-400">Write your own motion or let the local/AI generator create one.</p>
              </div>
              <button
                type="button"
                onClick={() => setAiGeneratedTopic((current) => !current)}
                className={cn(
                  "focus-ring inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition",
                  aiGeneratedTopic ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100" : "border-white/15 bg-white/5 text-neutral-300"
                )}
              >
                <span className={cn("h-3 w-3 rounded-full", aiGeneratedTopic ? "bg-emerald-300" : "bg-neutral-500")} />
                AI-generated topic
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <Textarea
                value={topicText}
                onChange={(event) => {
                  setTopicText(event.target.value);
                  setAiGeneratedTopic(false);
                }}
                className="min-h-28 border-emerald-500/30 bg-neutral-900 text-base text-white placeholder:text-neutral-500 focus-visible:ring-emerald-400"
                placeholder="Enter a motion..."
                disabled={isStarting}
              />
              <div className="space-y-3">
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as (typeof DEBATE_CATEGORIES)[number])}
                  className="focus-ring h-11 w-full rounded-md border border-white/15 bg-neutral-900 px-3 text-sm font-semibold text-white"
                  disabled={isStarting}
                >
                  {DEBATE_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full bg-emerald-500 text-white hover:bg-emerald-500/90"
                  onClick={generateTopic}
                  disabled={isGeneratingTopic || isStarting}
                >
                  {isGeneratingTopic ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
                  Generate motion
                </Button>
              </div>
            </div>

            {topicPackage ? (
              <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-neutral-300 md:grid-cols-2">
                <p className="md:col-span-2">{topicPackage.background}</p>
                <div className="rounded-md border border-emerald-400/20 bg-emerald-500/10 p-3">
                  <p className="font-semibold text-emerald-100">{config.sides.affirmativeLabel}</p>
                  <p className="mt-1">{topicPackage.affirmativePosition}</p>
                </div>
                <div className="rounded-md border border-rose-400/20 bg-rose-500/10 p-3">
                  <p className="font-semibold text-rose-100">{config.sides.negativeLabel}</p>
                  <p className="mt-1">{topicPackage.negativePosition}</p>
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-3 border-t border-white/10 pt-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Debate format</p>
            <div className="grid gap-3 md:grid-cols-2">
              {FORMAT_CARDS.map((item) => {
                const selected = item.format === format;
                return (
                  <button
                    key={item.format}
                    type="button"
                    onClick={() => {
                      if (!item.disabled) {
                        setFormat(item.format);
                        setSideChoice(item.format === "PARLIAMENTARY" ? "GOVERNMENT" : "FOR");
                      }
                    }}
                    className={cn(
                      "focus-ring min-h-28 rounded-lg border p-4 text-left transition",
                      selected ? "border-emerald-400 bg-emerald-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]",
                      item.disabled ? "cursor-not-allowed opacity-55" : ""
                    )}
                    disabled={isStarting || item.disabled}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{item.label}</p>
                      {selected ? <Check className="h-4 w-4 text-emerald-300" aria-hidden /> : null}
                    </div>
                    <p className="mt-2 text-sm text-neutral-400">{item.summary}</p>
                    <p className="mt-3 text-sm leading-6 text-neutral-300">{item.detail}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="grid gap-6 border-t border-white/10 pt-6 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Turn time</p>
              {format === "QUICK_1V1" ? (
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_TURN_OPTIONS.map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      onClick={() => setTurnTimeSeconds(seconds)}
                      className={cn(
                        "focus-ring rounded-md border px-3 py-3 text-sm font-semibold transition",
                        turnTimeSeconds === seconds ? "border-emerald-400 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.03] text-neutral-300"
                      )}
                      disabled={isStarting}
                    >
                      {formatTime(seconds)}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                    <Clock3 className="h-4 w-4" aria-hidden />
                    Official timing
                  </div>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">
                    {format === "PARLIAMENTARY"
                      ? "5 min prep, then PM 7, LO 8, MG 8, MO 8, LO rebuttal 4, PM rebuttal 5 with 30 sec grace."
                      : `${config.label} uses fixed speech times for this MVP.`}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Debate mode</p>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => selectDebateMode(false)}
                  aria-pressed={!audioMode}
                  className={cn(
                    "focus-ring flex items-center justify-between rounded-md border px-3 py-3 text-sm font-semibold",
                    !audioMode ? "border-emerald-400 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.03] text-neutral-300"
                  )}
                >
                  <span>
                    <MessageSquareText className="mr-2 inline h-4 w-4" aria-hidden />
                    Text debate
                  </span>
                  {!audioMode ? (
                    <span className="flex items-center gap-1 text-xs">
                      <Check className="h-4 w-4" aria-hidden />
                      Selected
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => selectDebateMode(true)}
                  aria-pressed={audioMode}
                  className={cn(
                    "focus-ring flex items-center justify-between rounded-md border px-3 py-3 text-sm font-semibold",
                    audioMode ? "border-emerald-400 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.03] text-neutral-300"
                  )}
                >
                  <span>
                    <Volume2 className="mr-2 inline h-4 w-4" aria-hidden />
                    Audio debate
                  </span>
                  {audioMode ? (
                    <span className="flex items-center gap-1 text-xs">
                      <Check className="h-4 w-4" aria-hidden />
                      Selected
                    </span>
                  ) : null}
                </button>
              </div>
              {audioMode ? (
                <p className="text-xs text-neutral-400">
                  Audio mode reads AI speeches aloud and adds voice input. Fine-tune voice, speed, and dyslexia-friendly text in the debate room.
                </p>
              ) : null}
            </div>

            <div className="space-y-2 border-t border-white/10 pt-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Beginner coaching</p>
              <button
                type="button"
                onClick={toggleBeginnerCoach}
                aria-pressed={beginnerCoach}
                className={cn(
                  "focus-ring flex w-full items-center justify-between rounded-md border px-3 py-3 text-sm font-semibold",
                  beginnerCoach ? "border-emerald-400 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.03] text-neutral-300"
                )}
              >
                <span>Side Coach {beginnerCoach ? "on" : "off"}</span>
                {beginnerCoach ? (
                  <span className="flex items-center gap-1 text-xs">
                    <Check className="h-4 w-4" aria-hidden />
                    On
                  </span>
                ) : null}
              </button>
              <p className="text-xs text-neutral-400">
                Get private suggestions from a Side Coach while you debate. The opponent and judge cannot see these
                suggestions, and they never count as your speech.
              </p>
            </div>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Choose your side</p>
            <div className="grid gap-2 md:grid-cols-3">
              {sideOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSideChoice(item.value)}
                  className={cn(
                    "focus-ring min-h-24 rounded-lg border p-4 text-left transition",
                    sideChoice === item.value ? "border-emerald-400 bg-emerald-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"
                  )}
                  disabled={isStarting}
                >
                  <p className="font-semibold">{item.label}</p>
                  <p className="mt-2 text-sm leading-5 text-neutral-400">{item.detail}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-neutral-400">AI opponent</p>
                <p className="mt-1 text-sm text-neutral-400">Pick a sparring style and rating target for this room.</p>
              </div>
              <Badge className="border border-blue-400/30 bg-blue-500/10 text-blue-100">Bot ladder</Badge>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {AI_DEBATE_PERSONAS.map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => setAiPersona(persona.id)}
                  className={cn(
                    "focus-ring min-h-28 rounded-lg border p-4 text-left transition",
                    aiPersona === persona.id ? "border-blue-400 bg-blue-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"
                  )}
                  disabled={isStarting}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{persona.name}</p>
                    <span className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs font-bold">{persona.rating}</span>
                  </div>
                  <p className="mt-2 text-sm text-neutral-400">{persona.style}</p>
                  <p className="mt-2 text-sm leading-5 text-neutral-300">{persona.bestFor}</p>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <Badge className="border border-blue-400/30 bg-blue-500/10 text-blue-100">Room preview</Badge>
            <h3 className="mt-4 text-2xl font-bold">{selectedFormat.label}</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-300">{config.description}</p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-md border border-white/10 bg-neutral-950 p-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Level</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                  {LEVELS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setLevel(item.value)}
                      className={cn(
                        "focus-ring rounded-md border px-3 py-2 text-left text-sm font-semibold",
                        level === item.value ? "border-purple-400 bg-purple-500/10 text-purple-100" : "border-white/10 bg-white/[0.03] text-neutral-300"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-md border border-emerald-400/20 bg-emerald-500/10 p-3">
                  <p className="text-xs font-semibold uppercase text-emerald-200">You</p>
                  <p className="mt-1 font-semibold">{sideChoice === "RANDOM" ? "Random side" : getSideLabel(sideChoice)}</p>
                </div>
                <div className="rounded-md border border-rose-400/20 bg-rose-500/10 p-3">
                  <p className="text-xs font-semibold uppercase text-rose-200">AI opponent</p>
                  <p className="mt-1 font-semibold">{AI_DEBATE_PERSONAS.find((persona) => persona.id === aiPersona)?.name ?? "Socratic Questioner"}</p>
                  <p className="mt-1 text-xs text-rose-100/80">{sideChoice === "RANDOM" ? "Opposite side" : "Automatically assigned"}</p>
                </div>
              </div>
              <div className="rounded-md border border-white/10 bg-neutral-950 p-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Speech order</p>
                <div className="mt-3 space-y-2">
                  {config.speeches.map((speech, index) => (
                    <div key={speech.key} className="flex items-center justify-between gap-3 rounded-md bg-white/[0.03] px-3 py-2 text-sm">
                      <span>
                        {index + 1}. {speech.shortLabel}
                      </span>
                      <span className="text-neutral-400">
                        {formatTime(speech.timeSeconds)}
                        {speech.graceSeconds ? ` + ${speech.graceSeconds}s` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {aiNotice ? (
            <div className="flex gap-2 rounded-md border border-blue-400/25 bg-blue-500/10 p-3 text-sm font-medium text-blue-100">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {aiNotice}
            </div>
          ) : null}

          {error ? (
            <div className="flex gap-2 rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-100">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </div>
          ) : null}

          <Button
            type="button"
            className="h-14 w-full bg-emerald-500 text-base text-white hover:bg-emerald-500/90"
            onClick={startDebate}
            disabled={isStarting || !topicText.trim()}
          >
            {isStarting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Bot className="h-5 w-5" aria-hidden />}
            Create room
          </Button>
        </aside>
      </div>
    </div>
  );
}
