"use client";

import { useEffect, useState } from "react";
import type { Level } from "@prisma/client";
import { CircleAlert, Clock, Loader2, MessageSquareQuote, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DECA_CLUSTERS } from "@/lib/training-tracks";
import type { OfficialPrepProps } from "./track-practice-setup";

const LEVELS: Level[] = ["BEGINNER", "INTERMEDIATE", "ELITE"];

type Scenario = {
  scenario: string;
  judgeCharacter: string;
  performanceIndicators: string[];
  piSource: "registry" | "generic";
  eventName?: string;
  season?: string;
  verificationStatus?: string;
  fallbackNotice?: string;
};

type Objections = { objections: string[]; judgeCharacter: string; fallbackNotice?: string };

type JudgeResult = {
  overallScore: number;
  presentationScore?: number;
  questioningScore?: number;
  strengths: string[];
  weaknesses: string[];
  improvementAdvice: string[];
  aiProvider?: string;
  aiNotice?: string;
  rubricSource?: { eventName: string; season: string; verificationStatus: string };
};

const EVENT_NAME = "Hotel and Lodging Management Series";

export function DecaRoleplay({ mode = "practice", officialPrep }: { mode?: "practice" | "simulation"; officialPrep?: OfficialPrepProps | null }) {
  const [level, setLevel] = useState<Level>("BEGINNER");
  const [cluster, setCluster] = useState("Hospitality & Tourism");
  const [studentRole, setStudentRole] = useState("front desk manager");
  const [judgeRole, setJudgeRole] = useState("hotel guest whose reserved suite was given away");

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [pitch, setPitch] = useState("");
  const [objections, setObjections] = useState<Objections | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<JudgeResult | null>(null);

  const [busy, setBusy] = useState<null | "scenario" | "objections" | "judge">(null);
  const [error, setError] = useState<string | null>(null);

  // Full Simulation mode chains the same three AI calls into one timed round: official prep clock →
  // pitch → objections → ballot. Both clocks are registry-driven (officialPrep comes from the HLM spec).
  // When the registry has no prep data we degrade to an untimed flow rather than inventing a fake clock.
  const isSim = mode === "simulation";
  const prepTotal = (officialPrep?.prepMinutes ?? 0) * 60;
  const performTotal = (officialPrep?.performMinutes ?? 0) * 60;
  const hasPrepClock = isSim && prepTotal > 0;
  const [prepSecondsLeft, setPrepSecondsLeft] = useState(prepTotal);
  const [prepRunning, setPrepRunning] = useState(false);
  const [prepDone, setPrepDone] = useState(false);
  const [performSecondsLeft, setPerformSecondsLeft] = useState(performTotal);
  const [performRunning, setPerformRunning] = useState(false);

  const pitchUnlocked = !hasPrepClock || prepDone;
  const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  function beginPerformance() {
    setPrepRunning(false);
    setPrepDone(true);
    if (performTotal > 0) setPerformRunning(true);
  }

  function resetClocks() {
    setPrepSecondsLeft(prepTotal);
    setPrepRunning(false);
    setPrepDone(false);
    setPerformSecondsLeft(performTotal);
    setPerformRunning(false);
  }

  useEffect(() => {
    if (!prepRunning || prepSecondsLeft <= 0) return;
    const timer = window.setInterval(() => setPrepSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [prepRunning, prepSecondsLeft]);

  // Prep hitting zero auto-advances into the performance phase (unlocks the pitch), mirroring a real round.
  useEffect(() => {
    if (!(hasPrepClock && prepRunning && prepSecondsLeft === 0)) return;
    setPrepRunning(false);
    setPrepDone(true);
    if (performTotal > 0) setPerformRunning(true);
  }, [hasPrepClock, prepRunning, prepSecondsLeft, performTotal]);

  useEffect(() => {
    if (!performRunning || performSecondsLeft <= 0) return;
    const timer = window.setInterval(() => setPerformSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [performRunning, performSecondsLeft]);

  async function call<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new Error(payload.error ?? "Something went wrong. Please try again.");
    return payload;
  }

  async function generateScenario() {
    setBusy("scenario");
    setError(null);
    setScenario(null);
    setObjections(null);
    setResult(null);
    setPitch("");
    resetClocks();
    try {
      const data = await call<Scenario>("/api/ai/deca-scenario", {
        level,
        eventType: EVENT_NAME,
        cluster,
        studentRole,
        judgeRole
      });
      setScenario(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate a scenario.");
    } finally {
      setBusy(null);
    }
  }

  async function askObjections() {
    if (!scenario || pitch.trim().length < 8) return;
    setBusy("objections");
    setError(null);
    try {
      const data = await call<Objections>("/api/ai/deca-objections", {
        level,
        eventType: EVENT_NAME,
        scenario: scenario.scenario,
        judgeRole,
        studentPitch: pitch
      });
      setObjections(data);
      setAnswers(new Array(data.objections.length).fill(""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not get objections.");
    } finally {
      setBusy(null);
    }
  }

  async function submitForScoring() {
    if (!scenario || !objections) return;
    setBusy("judge");
    setError(null);
    try {
      const transcript = [
        { role: "SYSTEM" as const, round: 1, content: `Scenario: ${scenario.scenario}` },
        { role: "AFFIRMATIVE" as const, round: 1, content: `Opening pitch: ${pitch}` },
        ...objections.objections.flatMap((question, index) => [
          { role: "JUDGE" as const, round: 2, content: `${judgeRole} asks: ${question}` },
          { role: "AFFIRMATIVE" as const, round: 2, content: `Answer: ${answers[index] ?? "(no answer)"}` }
        ])
      ];
      // Attribute scoring to the registry ONLY when the scenario itself was registry-backed. The
      // judge maps registry rubric on the "ROLEPLAY" key; a generic scenario sends a non-mapping
      // event label so the judge degrades too — scenario and scoring never disagree on provenance.
      const judgeEventType = scenario.piSource === "registry" ? "ROLEPLAY" : "DECA Role Play (generic practice)";
      const data = await call<JudgeResult>("/api/ai/judge-deca", {
        organization: "DECA",
        level,
        eventType: judgeEventType,
        scenario: scenario.scenario,
        transcript,
        hasObjectionRound: true
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score the role-play.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            {isSim ? (
              <PlayCircle className="h-5 w-5 text-primary" aria-hidden />
            ) : (
              <MessageSquareQuote className="h-5 w-5 text-primary" aria-hidden />
            )}
            {isSim ? "DECA Full Simulation — timed round" : "Guided role-play with objection round"}
          </CardTitle>
          <Badge variant="secondary">{isSim ? "Full Simulation" : "DECA"}</Badge>
        </div>
        {isSim ? (
          <p className="mt-1 text-sm text-muted-foreground">
            One continuous timed round: official prep clock → opening pitch → the judge&apos;s objection round → scored
            ballot. It chains the same registry-backed scenario, questions, and rubric as guided practice — no separate
            AI path.
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Career cluster</span>
            <select value={cluster} onChange={(e) => setCluster(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {DECA_CLUSTERS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Difficulty</span>
            <select value={level} onChange={(e) => setLevel(e.target.value as Level)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l.toLowerCase()}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Your role</span>
            <Input value={studentRole} onChange={(e) => setStudentRole(e.target.value)} placeholder="e.g. front desk manager" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">AI plays (in character)</span>
            <Input value={judgeRole} onChange={(e) => setJudgeRole(e.target.value)} placeholder="e.g. frustrated hotel guest" />
          </label>
        </div>

        <Button type="button" onClick={generateScenario} disabled={busy !== null}>
          {busy === "scenario" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          {busy === "scenario" ? "Generating..." : "Generate scenario"}
        </Button>

        {error ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <CircleAlert className="h-4 w-4" aria-hidden />
            {error}
          </p>
        ) : null}

        {scenario ? (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm">{scenario.scenario}</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">In character:</span> {scenario.judgeCharacter}
            </p>
            <div className="rounded-md border bg-background p-3">
              <p className="flex items-center gap-2 text-xs font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
                Evaluated on
                {scenario.piSource === "registry" ? (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                    {scenario.eventName} {scenario.season}
                    {scenario.verificationStatus && scenario.verificationStatus !== "VERIFIED" ? " · partially verified" : ""}
                  </span>
                ) : (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-600">generic practice — not official</span>
                )}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {scenario.performanceIndicators.map((pi) => (
                  <li key={pi}>{pi}</li>
                ))}
              </ul>
              {scenario.fallbackNotice ? <p className="mt-2 text-xs text-amber-600">{scenario.fallbackNotice}</p> : null}
            </div>
          </div>
        ) : null}

        {hasPrepClock && scenario && !prepDone && !result ? (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4 text-primary" aria-hidden />
                Official prep — {officialPrep?.prepMinutes} min
              </p>
              <p className="font-mono text-lg font-bold tabular-nums" aria-live="polite">{clock(prepSecondsLeft)}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Plan your pitch. It unlocks when prep runs out — or start early when you&apos;re ready.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPrepRunning((r) => !r)}
                className={cn(
                  "focus-ring rounded-md border px-3 py-1.5 text-sm font-semibold",
                  prepRunning ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                {prepRunning ? "Pause prep" : prepSecondsLeft === prepTotal ? "Start prep" : "Resume prep"}
              </button>
              <Button type="button" variant="outline" onClick={beginPerformance}>
                <PlayCircle className="h-4 w-4" aria-hidden />
                Begin pitch now
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Per the {officialPrep?.eventName} {officialPrep?.season} specification
              {officialPrep?.verificationStatus !== "VERIFIED" ? " (partially verified)" : ""}.
            </p>
          </div>
        ) : null}

        {isSim && prepDone && !result && performTotal > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-primary" aria-hidden />
              Performance time with the judge
            </p>
            <p className="font-mono text-lg font-bold tabular-nums" aria-live="polite">{clock(performSecondsLeft)}</p>
          </div>
        ) : null}

        {scenario && !result && pitchUnlocked ? (
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Your opening pitch</span>
            <Textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="Respond to the situation as your role — analyze the problem and make your recommendation."
              className="min-h-24"
              disabled={Boolean(objections)}
            />
          </label>
        ) : null}

        {scenario && !objections && !result && pitchUnlocked ? (
          <Button type="button" variant="outline" onClick={askObjections} disabled={busy !== null || pitch.trim().length < 8}>
            {busy === "objections" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MessageSquareQuote className="h-4 w-4" aria-hidden />}
            {busy === "objections" ? "The judge is thinking..." : "Submit pitch — face the judge's questions"}
          </Button>
        ) : null}

        {objections ? (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-xs font-semibold text-muted-foreground">{objections.judgeCharacter}</p>
            {objections.fallbackNotice ? <p className="text-xs text-amber-600">{objections.fallbackNotice}</p> : null}
            {objections.objections.map((question, index) => (
              <div key={index} className="space-y-1">
                <p className="text-sm font-medium">
                  <span className="text-primary">“</span>
                  {question}
                  <span className="text-primary">”</span>
                </p>
                <Textarea
                  value={answers[index] ?? ""}
                  onChange={(e) => setAnswers((a) => a.map((v, i) => (i === index ? e.target.value : v)))}
                  placeholder="Answer the judge directly."
                  className="min-h-16"
                  disabled={Boolean(result)}
                />
              </div>
            ))}
            {!result ? (
              <Button type="button" onClick={submitForScoring} disabled={busy !== null || answers.some((a) => a.trim().length === 0)}>
                {busy === "judge" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
                {busy === "judge" ? "Scoring..." : "Submit answers for scoring"}
              </Button>
            ) : null}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl font-bold">{result.overallScore}</span>
              <span className="text-sm text-muted-foreground">overall</span>
              {typeof result.presentationScore === "number" ? (
                <Badge variant="outline">Prepared pitch: {result.presentationScore}</Badge>
              ) : null}
              {typeof result.questioningScore === "number" ? (
                <Badge variant="outline">Unscripted Q&amp;A: {result.questioningScore}</Badge>
              ) : null}
            </div>
            {result.rubricSource ? (
              <p className="text-xs text-muted-foreground">
                Scored against {result.rubricSource.eventName} {result.rubricSource.season}
                {result.rubricSource.verificationStatus !== "VERIFIED" ? " (partially verified)" : ""}.
              </p>
            ) : null}
            {result.aiNotice ? <p className="text-xs text-amber-600">{result.aiNotice}</p> : null}
            {result.strengths.length > 0 ? (
              <div>
                <p className="text-xs font-semibold">Strengths</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {result.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.improvementAdvice.length > 0 ? (
              <div>
                <p className="text-xs font-semibold">Do next</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {result.improvementAdvice.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
