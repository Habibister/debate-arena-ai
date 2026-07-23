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
import { SideCoachPanel, type OfficialMessage } from "@/components/debate/side-coach-panel";
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
type Turn = { speaker: "student" | "character"; content: string; character?: string };
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
const MAX_EXCHANGES = 4; // how many reactive character turns before the round wraps to the ballot

async function call<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(payload.error ?? "Something went wrong. Please try again.");
  return payload;
}

const clockLabel = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// Dedicated, full-viewport role-play room (debate-room parity). Runs a real multi-turn conversation:
// the AI character reacts to each student turn and the exchange continues until the cap or the student
// ends it, then a ballot. Reuses the debate room's accessibility components (read-aloud, speech input,
// panel). Client-state only — not persisted yet (labeled honestly). Honesty labels are unchanged:
// DECA attributes to the registry only when the scenario is registry-backed; HOSA stays generic.
export function RoleplayRoom({ track, officialPrep }: { track: "deca" | "hosa"; officialPrep: OfficialPrep }) {
  const router = useRouter();
  const [config, setConfig] = useState<RoleplayConfig | null>(null);
  const [ready, setReady] = useState(false);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [started, setStarted] = useState(false); // opening response submitted
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [busy, setBusy] = useState<null | "scenario" | "turn" | "judge">(null);
  const [error, setError] = useState<string | null>(null);

  const isDeca = track === "deca";
  const characterRole = config ? (isDeca ? (config as DecaRoomConfig).judgeRole : (config as HosaRoomConfig).characterRole) : "";
  const exchanges = turns.filter((t) => t.speaker === "character").length;
  const atCap = exchanges >= MAX_EXCHANGES;

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

  useEffect(() => {
    const cfg = readRoleplayConfig(track);
    if (!cfg) {
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
      const data =
        cfg.track === "deca"
          ? await call<Scenario>("/api/ai/deca-scenario", { level: cfg.level, eventType: DECA_EVENT_NAME, cluster: cfg.cluster, studentRole: cfg.studentRole, judgeRole: cfg.judgeRole })
          : await call<Scenario>("/api/ai/hosa-scenario", { level: cfg.level, category: cfg.category, studentRole: cfg.studentRole, characterRole: cfg.characterRole });
      setScenario(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate a scenario.");
    } finally {
      setBusy(null);
    }
  }

  // Build the running transcript for the turn engine / judge. First student turn = the pitch (round 1);
  // everything after is the objection round (round 2), preserving the DECA presentation/questioning split.
  function buildTranscript(list: Turn[]) {
    return [
      { role: "SYSTEM" as const, round: 1, content: `Scenario: ${scenario?.scenario ?? ""}` },
      ...list.map((t, i) => ({
        role: t.speaker === "student" ? ("AFFIRMATIVE" as const) : ("JUDGE" as const),
        round: i === 0 ? 1 : 2,
        content:
          t.speaker === "student"
            ? i === 0
              ? `Opening pitch: ${t.content}`
              : `Answer: ${t.content}`
            : `${characterRole} says: ${t.content}`
      }))
    ];
  }

  async function requestCharacterTurn(list: Turn[]) {
    if (!config || !scenario) return;
    setBusy("turn");
    setError(null);
    try {
      const turn = await call<{ line: string; character: string }>("/api/ai/roleplay-turn", {
        organization: isDeca ? "DECA" : "HOSA",
        level: config.level,
        scenario: scenario.scenario,
        characterRole,
        transcript: buildTranscript(list),
        exchangesSoFar: list.filter((t) => t.speaker === "character").length,
        maxExchanges: MAX_EXCHANGES
      });
      setTurns((cur) => [...cur, { speaker: "character", content: turn.line, character: turn.character }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The other person didn't respond. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function submitOpening() {
    if (draft.trim().length < 8) return;
    const next: Turn[] = [{ speaker: "student", content: draft.trim() }];
    setTurns(next);
    setDraft("");
    setStarted(true);
    await requestCharacterTurn(next);
  }

  async function sendReply() {
    if (draft.trim().length < 2) return;
    const next: Turn[] = [...turns, { speaker: "student", content: draft.trim() }];
    setTurns(next);
    setDraft("");
    if (next.filter((t) => t.speaker === "character").length < MAX_EXCHANGES) {
      await requestCharacterTurn(next);
    }
  }

  async function endAndJudge() {
    if (!scenario || !config) return;
    setBusy("judge");
    setError(null);
    try {
      const transcript = buildTranscript(turns);
      const data = isDeca
        ? await call<JudgeResult>("/api/ai/judge-deca", {
            organization: "DECA",
            level: config.level,
            eventType: scenario.piSource === "registry" ? "ROLEPLAY" : "DECA Role Play (generic practice)",
            scenario: scenario.scenario,
            transcript,
            hasObjectionRound: true
          })
        : await call<JudgeResult>("/api/ai/judge-hosa", {
            organization: "HOSA",
            level: config.level,
            eventType: (config as HosaRoomConfig).category,
            scenario: scenario.scenario,
            transcript
          });
      setResult(data);
      setPerformRunning(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score the round.");
    } finally {
      setBusy(null);
    }
  }

  if (!ready || !config) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Opening the room...
      </div>
    );
  }

  const stages = ["Brief", isDeca ? "Interrogation" : "Conversation", isDeca ? "Ballot" : "Feedback"];
  const stageIndex = result ? 2 : started ? 1 : 0;
  // Read-only copy of the conversation for the Side Coach. Coach output lives in the panel's own state
  // and is NEVER written back here — endAndJudge() only ever sends `turns`, so coaching cannot leak
  // into the judge transcript or count as the student's response.
  const coachMessages: OfficialMessage[] = turns.map((t, i) => ({
    id: `${t.speaker}-${i}`,
    role: t.speaker === "student" ? "AFFIRMATIVE" : "JUDGE",
    authorId: t.speaker === "student" ? "student" : null,
    content: t.content
  }));
  const coachEventType = isDeca ? DECA_EVENT_NAME : (config as HosaRoomConfig).category;

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Session room</p>
          <h1 className="page-title mt-1">{eventTitle}</h1>
        </div>
        <AccessibilityPanel />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Stage progress">
        {stages.map((s, i) => (
          <span
            key={s}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-semibold",
              i === stageIndex ? "border-track bg-track/15 text-track" : "border-border text-muted-foreground"
            )}
            aria-current={i === stageIndex ? "step" : undefined}
          >
            {i + 1}. {s}
            {i === 1 && started && !result ? ` · ${exchanges}/${MAX_EXCHANGES}` : ""}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">This session isn&apos;t saved yet — finish it in one sitting. (Saved history is coming.)</p>

      {error ? <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p> : null}

      {busy === "scenario" && !scenario ? (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Generating your scenario...</div>
      ) : null}

      {/* Brief. */}
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
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{scenario.performanceIndicators.map((pi) => <li key={pi}>{pi}</li>)}</ul>
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
      {isSim && prepDone && !result && performTotal > 0 ? (
        <section className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-track/30 bg-track/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-track" aria-hidden />Performance time with the judge</p>
          <p className="font-mono text-xl font-bold tabular-nums" aria-live="polite">{clockLabel(performLeft)}</p>
        </section>
      ) : null}

      {/* Conversation transcript (the real back-and-forth). */}
      {started ? (
        <section className="mt-4 space-y-3">
          {turns.map((t, i) => (
            <div key={i} className={cn("rounded-lg border p-3", t.speaker === "character" ? "bg-card" : "bg-muted/40")}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground">{t.speaker === "character" ? t.character ?? characterRole : "You"}</p>
                {t.speaker === "character" ? <SpeakButton text={t.content} label="Read" className="shrink-0" /> : null}
              </div>
              <p className="mt-1 text-sm leading-6">{t.content}</p>
            </div>
          ))}
          {busy === "turn" ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {characterRole} is responding...</p> : null}
        </section>
      ) : null}

      {/* Input area. */}
      {scenario && !result && pitchUnlocked ? (
        <section className="mt-4 rounded-lg border bg-card p-5">
          <p className="eyebrow">{!started ? (isDeca ? "Your opening pitch" : "Your response") : "Your reply"}</p>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={!started ? (isDeca ? "Respond as your role — analyze the problem and make your recommendation." : "Respond in role — use correct terminology and safe, professional reasoning.") : "Reply to what they just said."}
            className="mt-2 min-h-28"
            disabled={busy !== null}
          />
          <div className="mt-2">
            <SpeechInput onAppend={(t) => setDraft((p) => (p ? `${p} ${t}` : t))} disabled={busy !== null} turnKey={`turn-${turns.length}`} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!started ? (
              <Button type="button" onClick={submitOpening} disabled={busy !== null || draft.trim().length < 8}>
                {busy === "turn" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {isDeca ? "Submit pitch — face the judge" : "Submit — talk it through"}
              </Button>
            ) : (
              <>
                {!atCap ? (
                  <Button type="button" onClick={sendReply} disabled={busy !== null || draft.trim().length < 2}>
                    {busy === "turn" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                    Reply
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">You&apos;ve reached the end of the exchange.</span>
                )}
                <Button type="button" variant="outline" onClick={endAndJudge} disabled={busy !== null || exchanges < 1}>
                  {busy === "judge" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
                  {isDeca ? "End & get ballot" : "End & get feedback"}
                </Button>
              </>
            )}
          </div>
        </section>
      ) : null}

      {/* Side Coach — private in-room help while responding. Its text is never sent to the judge and
          never counts as the response (see coachMessages note above). */}
      {scenario && !result ? (
        <div className="mt-4">
          <SideCoachPanel organization={isDeca ? "DECA" : "HOSA"} eventType={coachEventType} level={config.level} messages={coachMessages} />
        </div>
      ) : null}

      {/* Ballot / Feedback. */}
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
