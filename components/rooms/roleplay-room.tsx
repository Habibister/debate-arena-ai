"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Clock, Loader2, PlayCircle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AccessibilityPanel } from "@/components/debate/accessibility/accessibility-panel";
import { SpeakButton } from "@/components/debate/accessibility/speak-button";
import { SpeechInput } from "@/components/debate/accessibility/speech-input";
import { cn } from "@/lib/utils";
import { readRoleplayConfig, type DecaRoomConfig, type HosaRoomConfig, type RoleplayConfig } from "./roleplay-config";

type OfficialPrep = { prepMinutes: number; performMinutes: number | null; eventName: string; season: string; verificationStatus: string } | null;

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
  accuracyFlags?: string[];
  aiNotice?: string;
  rubricSource?: { eventName: string; season: string; verificationStatus: string };
};

const DECA_EVENT_NAME = "Hotel and Lodging Management Series";

async function call<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(payload.error ?? "Something went wrong. Please try again.");
  return payload;
}

const clockLabel = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// Dedicated, full-viewport role-play room (debate-room parity). The shell renders this under focus
// mode. Config arrives from the setup form via sessionStorage; the scenario is generated here as the
// opening stage. Reuses the debate room's accessibility components (read-aloud, speech input, panel).
// Client-state only — not persisted yet (labeled honestly).
export function RoleplayRoom({ track, officialPrep }: { track: "deca" | "hosa"; officialPrep: OfficialPrep }) {
  const router = useRouter();
  const [config, setConfig] = useState<RoleplayConfig | null>(null);
  const [ready, setReady] = useState(false);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [pitch, setPitch] = useState("");
  const [objections, setObjections] = useState<Objections | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [busy, setBusy] = useState<null | "scenario" | "objections" | "judge">(null);
  const [error, setError] = useState<string | null>(null);

  // Clocks (DECA simulation only).
  const isSim = config?.track === "deca" && config.simulation && Boolean(officialPrep?.prepMinutes);
  const prepTotal = (officialPrep?.prepMinutes ?? 0) * 60;
  const performTotal = (officialPrep?.performMinutes ?? 0) * 60;
  const [prepLeft, setPrepLeft] = useState(0);
  const [prepRunning, setPrepRunning] = useState(false);
  const [prepDone, setPrepDone] = useState(false);
  const [performLeft, setPerformLeft] = useState(0);
  const [performRunning, setPerformRunning] = useState(false);
  const pitchUnlocked = !isSim || prepDone;

  const generatedRef = useRef(false);

  // Load config (client-only) and generate the opening scenario once.
  useEffect(() => {
    const cfg = readRoleplayConfig(track);
    if (!cfg) {
      // Cold visit with no setup — send the user back to configure it.
      router.replace(`/training/${track}/practice` as Route);
      return;
    }
    setConfig(cfg);
    setReady(true);
  }, [track, router]);

  useEffect(() => {
    if (!config || generatedRef.current) return;
    generatedRef.current = true;
    void generateScenario(config);
    if (isSim) {
      setPrepLeft(prepTotal);
      setPerformLeft(performTotal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  useEffect(() => {
    if (!prepRunning || prepLeft <= 0) return;
    const t = window.setInterval(() => setPrepLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [prepRunning, prepLeft]);
  useEffect(() => {
    if (!(isSim && prepRunning && prepLeft === 0)) return;
    setPrepRunning(false);
    setPrepDone(true);
    if (performTotal > 0) setPerformRunning(true);
  }, [isSim, prepRunning, prepLeft, performTotal]);
  useEffect(() => {
    if (!performRunning || performLeft <= 0) return;
    const t = window.setInterval(() => setPerformLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [performRunning, performLeft]);

  function beginPerformance() {
    setPrepRunning(false);
    setPrepDone(true);
    if (performTotal > 0) setPerformRunning(true);
  }

  async function generateScenario(cfg: RoleplayConfig) {
    setBusy("scenario");
    setError(null);
    try {
      if (cfg.track === "deca") {
        const data = await call<Scenario>("/api/ai/deca-scenario", {
          level: cfg.level,
          eventType: DECA_EVENT_NAME,
          cluster: cfg.cluster,
          studentRole: cfg.studentRole,
          judgeRole: cfg.judgeRole
        });
        setScenario(data);
      } else {
        const data = await call<Scenario>("/api/ai/hosa-scenario", {
          level: cfg.level,
          category: cfg.category,
          studentRole: cfg.studentRole,
          characterRole: cfg.characterRole
        });
        setScenario(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate a scenario.");
    } finally {
      setBusy(null);
    }
  }

  async function askObjections() {
    const cfg = config as DecaRoomConfig;
    if (!scenario || pitch.trim().length < 8) return;
    setBusy("objections");
    setError(null);
    try {
      const data = await call<Objections>("/api/ai/deca-objections", {
        level: cfg.level,
        eventType: DECA_EVENT_NAME,
        scenario: scenario.scenario,
        judgeRole: cfg.judgeRole,
        studentPitch: pitch
      });
      setObjections(data);
      setAnswers(new Array(data.objections.length).fill(""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not get the judge's questions.");
    } finally {
      setBusy(null);
    }
  }

  async function submitDeca() {
    const cfg = config as DecaRoomConfig;
    if (!scenario || !objections) return;
    setBusy("judge");
    setError(null);
    try {
      const transcript = [
        { role: "SYSTEM" as const, round: 1, content: `Scenario: ${scenario.scenario}` },
        { role: "AFFIRMATIVE" as const, round: 1, content: `Opening pitch: ${pitch}` },
        ...objections.objections.flatMap((q, i) => [
          { role: "JUDGE" as const, round: 2, content: `${cfg.judgeRole} asks: ${q}` },
          { role: "AFFIRMATIVE" as const, round: 2, content: `Answer: ${answers[i] ?? "(no answer)"}` }
        ])
      ];
      const judgeEventType = scenario.piSource === "registry" ? "ROLEPLAY" : "DECA Role Play (generic practice)";
      const data = await call<JudgeResult>("/api/ai/judge-deca", {
        organization: "DECA",
        level: cfg.level,
        eventType: judgeEventType,
        scenario: scenario.scenario,
        transcript,
        hasObjectionRound: true
      });
      setResult(data);
      setPerformRunning(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score the round.");
    } finally {
      setBusy(null);
    }
  }

  async function submitHosa() {
    const cfg = config as HosaRoomConfig;
    if (!scenario || pitch.trim().length < 8) return;
    setBusy("judge");
    setError(null);
    try {
      const transcript = [
        { role: "SYSTEM" as const, round: 1, content: `Scenario: ${scenario.scenario}` },
        { role: "AFFIRMATIVE" as const, round: 1, content: `Student response: ${pitch}` }
      ];
      const data = await call<JudgeResult>("/api/ai/judge-hosa", {
        organization: "HOSA",
        level: cfg.level,
        eventType: cfg.category,
        scenario: scenario.scenario,
        transcript
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score the response.");
    } finally {
      setBusy(null);
    }
  }

  if (!ready || !config) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Opening the room...
      </div>
    );
  }

  // Stage progression for the chip rail.
  const isDeca = config.track === "deca";
  const stages = isDeca ? ["Brief", "Pitch", "Judge Q&A", "Ballot"] : ["Brief", "Response", "Feedback"];
  let stageIndex = 0;
  if (result) stageIndex = stages.length - 1;
  else if (isDeca && objections) stageIndex = 2;
  else if (scenario && (isDeca ? pitchUnlocked : true)) stageIndex = 1;
  else stageIndex = 0;

  const eventTitle = isDeca ? "DECA Role-Play" : "HOSA Health-Science Role-Play";
  const officialPill =
    scenario?.piSource === "registry" ? (
      <Badge variant="outline" className="border-track/40 text-track">
        {scenario.eventName} {scenario.season}
        {scenario.verificationStatus && scenario.verificationStatus !== "VERIFIED" ? " · partially verified" : ""}
      </Badge>
    ) : (
      <Badge variant="outline" className="border-amber-500/40 text-amber-500">generic practice — not official</Badge>
    );

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6">
      {/* Header: event + honest not-saved note + accessibility panel. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Session room</p>
          <h1 className="page-title mt-1">{eventTitle}</h1>
        </div>
        <AccessibilityPanel />
      </div>

      {/* Stage rail. */}
      <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Stage progress">
        {stages.map((s, i) => (
          <span
            key={s}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-semibold",
              i === stageIndex ? "border-track bg-track/15 text-track" : i < stageIndex ? "border-border text-muted-foreground" : "border-border text-muted-foreground/60"
            )}
            aria-current={i === stageIndex ? "step" : undefined}
          >
            {i + 1}. {s}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">This session isn&apos;t saved yet — finish it in one sitting. (Saved history is coming.)</p>

      {error ? <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p> : null}

      {busy === "scenario" && !scenario ? (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Generating your scenario...
        </div>
      ) : null}

      {/* STAGE 1 — Brief. */}
      {scenario ? (
        <section className="mt-6 rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow">The brief</p>
            <div className="flex items-center gap-2">
              {officialPill}
              <SpeakButton text={`${scenario.scenario}. In character: ${scenario.judgeCharacter}`} label="Read aloud" />
            </div>
          </div>
          <p className="mt-3 text-base leading-7">{scenario.scenario}</p>
          <p className="mt-2 text-sm text-muted-foreground"><span className="font-semibold">In character:</span> {scenario.judgeCharacter}</p>
          <div className="mt-3 rounded-md border bg-background p-3">
            <p className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="h-3.5 w-3.5 text-track" aria-hidden />Evaluated on</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {scenario.performanceIndicators.map((pi) => <li key={pi}>{pi}</li>)}
            </ul>
            {scenario.fallbackNotice ? <p className="mt-2 text-xs text-amber-500">{scenario.fallbackNotice}</p> : null}
          </div>
        </section>
      ) : null}

      {/* DECA prep clock. */}
      {isSim && scenario && !prepDone && !result ? (
        <section className="mt-4 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-track" aria-hidden />Official prep — {officialPrep?.prepMinutes} min</p>
            <p className="font-mono text-xl font-bold tabular-nums" aria-live="polite">{clockLabel(prepLeft)}</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Plan your pitch. It unlocks when prep runs out — or start early.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setPrepRunning((r) => !r)} className={cn("focus-ring rounded-md border px-3 py-1.5 text-sm font-semibold", prepRunning ? "border-track bg-track/10 text-track" : "text-muted-foreground")}>
              {prepRunning ? "Pause prep" : prepLeft === prepTotal ? "Start prep" : "Resume prep"}
            </button>
            <Button type="button" variant="outline" onClick={beginPerformance}><PlayCircle className="h-4 w-4" aria-hidden />Begin pitch now</Button>
          </div>
        </section>
      ) : null}

      {/* DECA performance clock. */}
      {isSim && prepDone && !result && performTotal > 0 ? (
        <section className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-track/30 bg-track/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-track" aria-hidden />Performance time with the judge</p>
          <p className="font-mono text-xl font-bold tabular-nums" aria-live="polite">{clockLabel(performLeft)}</p>
        </section>
      ) : null}

      {/* STAGE 2 — Pitch (DECA) / Response (HOSA). */}
      {scenario && !result && pitchUnlocked ? (
        <section className="mt-4 rounded-lg border bg-card p-5">
          <p className="eyebrow">{isDeca ? "Your opening pitch" : "Your response"}</p>
          <Textarea
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder={isDeca ? "Respond as your role — analyze the problem and make your recommendation." : "Respond in role — use correct terminology and safe, professional reasoning."}
            className="mt-2 min-h-32"
            disabled={Boolean(objections)}
          />
          <div className="mt-2">
            <SpeechInput onAppend={(t) => setPitch((p) => (p ? `${p} ${t}` : t))} disabled={Boolean(objections)} turnKey="pitch" />
          </div>
          {isDeca ? (
            !objections ? (
              <Button type="button" className="mt-3" onClick={askObjections} disabled={busy !== null || pitch.trim().length < 8}>
                {busy === "objections" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {busy === "objections" ? "The judge is thinking..." : "Submit pitch — face the judge's questions"}
              </Button>
            ) : null
          ) : (
            <Button type="button" className="mt-3" onClick={submitHosa} disabled={busy !== null || pitch.trim().length < 8}>
              {busy === "judge" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
              {busy === "judge" ? "Scoring..." : "Submit for feedback"}
            </Button>
          )}
        </section>
      ) : null}

      {/* STAGE 3 — Objection round (DECA only). */}
      {isDeca && objections ? (
        <section className="mt-4 rounded-lg border bg-card p-5">
          <p className="eyebrow">{objections.judgeCharacter}</p>
          {objections.fallbackNotice ? <p className="mt-1 text-xs text-amber-500">{objections.fallbackNotice}</p> : null}
          <div className="mt-3 space-y-4">
            {objections.objections.map((q, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">“{q}”</p>
                  <SpeakButton text={q} label="Read" className="shrink-0" />
                </div>
                <Textarea
                  value={answers[i] ?? ""}
                  onChange={(e) => setAnswers((a) => a.map((v, idx) => (idx === i ? e.target.value : v)))}
                  placeholder="Answer the judge directly."
                  className="min-h-16"
                  disabled={Boolean(result)}
                />
                {!result ? <SpeechInput onAppend={(t) => setAnswers((a) => a.map((v, idx) => (idx === i ? (v ? `${v} ${t}` : t) : v)))} turnKey={`ans-${i}`} /> : null}
              </div>
            ))}
          </div>
          {!result ? (
            <Button type="button" className="mt-3" onClick={submitDeca} disabled={busy !== null || answers.some((a) => a.trim().length === 0)}>
              {busy === "judge" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
              {busy === "judge" ? "Scoring..." : "Submit answers for scoring"}
            </Button>
          ) : null}
        </section>
      ) : null}

      {/* FINAL — Ballot / Feedback. */}
      {result ? (
        <section className="mt-4 rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display text-4xl font-bold">{result.overallScore}</span>
            <span className="text-sm text-muted-foreground">overall</span>
            {typeof result.presentationScore === "number" ? <Badge variant="outline">Prepared pitch: {result.presentationScore}</Badge> : null}
            {typeof result.questioningScore === "number" ? <Badge variant="outline">Unscripted Q&amp;A: {result.questioningScore}</Badge> : null}
            <span className="ml-auto">{officialPill}</span>
          </div>
          {result.rubricSource ? (
            <p className="mt-2 text-xs text-muted-foreground">Scored against {result.rubricSource.eventName} {result.rubricSource.season}{result.rubricSource.verificationStatus !== "VERIFIED" ? " (partially verified)" : ""}.</p>
          ) : null}
          {result.aiNotice ? <p className="mt-1 text-xs text-amber-500">{result.aiNotice}</p> : null}
          {result.accuracyFlags && result.accuracyFlags.length > 0 ? (
            <div className="mt-3"><p className="text-xs font-semibold text-amber-500">Accuracy check</p><ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-amber-500">{result.accuracyFlags.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
          ) : null}
          {result.strengths.length > 0 ? (
            <div className="mt-3"><p className="text-xs font-semibold">Strengths</p><ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{result.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
          ) : null}
          {result.improvementAdvice.length > 0 ? (
            <div className="mt-3"><p className="text-xs font-semibold">Do next</p><ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{result.improvementAdvice.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => router.push(`/training/${track}/practice` as Route)}>Back to setup</Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
