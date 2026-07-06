"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, Gavel, Loader2, Plus, Sparkles, UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  COMMITTEE_TYPES,
  MOTIONS,
  MUN_DIMENSIONS,
  MUN_PRACTICE_DISCLAIMER,
  RULES_PROFILES,
  type CommitteeType,
  type CountryPolicyBrief,
  type MotionKind,
  type MunJudgeResult,
  type RulesProfile,
  type SpeakerEntry
} from "@/lib/model-un";

type TranscriptLine = { role: "AFFIRMATIVE" | "MODERATOR"; round: number; content: string };

// Model UN practice sandbox: honest procedural mechanics (speakers list, caucus timer, motions)
// plus AI-inferred country brief and rapporteur feedback — everything labeled as practice, nothing
// claimed as official (we have no sourced conference spec yet).
export function MunConference() {
  const [committee, setCommittee] = useState<CommitteeType>("general-assembly");
  const [rules, setRules] = useState<RulesProfile>("un-style");
  const [country, setCountry] = useState("");
  const [topic, setTopic] = useState("");

  const [brief, setBrief] = useState<CountryPolicyBrief | null>(null);
  const [briefBusy, setBriefBusy] = useState(false);

  // Speakers list
  const [speakers, setSpeakers] = useState<SpeakerEntry[]>([]);
  const [newDelegation, setNewDelegation] = useState("");
  const [currentSpeaker, setCurrentSpeaker] = useState(0);

  // Caucus timer
  const [motion, setMotion] = useState<MotionKind>("open-speakers-list");
  const [caucusTopic, setCaucusTopic] = useState("");
  const [caucusMinutes, setCaucusMinutes] = useState(5);
  const [caucusSecondsLeft, setCaucusSecondsLeft] = useState(0);
  const [caucusRunning, setCaucusRunning] = useState(false);

  // Speech log (feeds the rapporteur) + judge result
  const [speech, setSpeech] = useState("");
  const [log, setLog] = useState<TranscriptLine[]>([]);
  const [judge, setJudge] = useState<MunJudgeResult | null>(null);
  const [judgeBusy, setJudgeBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMotion = useMemo(() => MOTIONS.find((m) => m.id === motion), [motion]);
  const committeeLabel = COMMITTEE_TYPES.find((c) => c.id === committee)?.label ?? "Committee";

  const caucusExpired = caucusSecondsLeft <= 0;
  useEffect(() => {
    if (!caucusRunning || caucusExpired) return;
    const t = window.setInterval(() => setCaucusSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [caucusRunning, caucusExpired]);

  async function fetchBrief() {
    if (!country.trim() || !topic.trim()) {
      setError("Enter your assigned country and the committee topic first.");
      return;
    }
    setBriefBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/mun/policy-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: country.trim(), topic: topic.trim(), committee: committeeLabel, level: "BEGINNER" })
      });
      const data = (await res.json().catch(() => ({}))) as CountryPolicyBrief & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not generate the brief.");
      setBrief(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the brief.");
    } finally {
      setBriefBusy(false);
    }
  }

  function addSpeaker() {
    const name = newDelegation.trim();
    if (!name) return;
    setSpeakers((s) => [...s, { id: `${Date.now()}-${name}`, delegation: name }]);
    setNewDelegation("");
  }

  function startCaucus() {
    setCaucusSecondsLeft(caucusMinutes * 60);
    setCaucusRunning(true);
  }

  function logSpeech() {
    const content = speech.trim();
    if (!content) return;
    setLog((l) => [...l, { role: "AFFIRMATIVE", round: l.length + 1, content }]);
    setSpeech("");
  }

  async function requestFeedback() {
    if (log.length === 0) {
      setError("Log at least one speech before requesting rapporteur feedback.");
      return;
    }
    setJudgeBusy(true);
    setError(null);
    try {
      const transcript = [
        { role: "MODERATOR" as const, round: 1, content: `${committeeLabel} — topic: ${topic || "(unset)"} — delegate represents ${country || "(unset)"}` },
        ...log.map((line, i) => ({ role: line.role, round: i + 2, content: line.content }))
      ];
      const res = await fetch("/api/ai/mun/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: "BEGINNER", committee: committeeLabel, country: country || "Delegate", topic: topic || "the agenda", transcript })
      });
      const data = (await res.json().catch(() => ({}))) as MunJudgeResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not generate feedback.");
      setJudge(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate feedback.");
    } finally {
      setJudgeBusy(false);
    }
  }

  const clock = `${String(Math.floor(caucusSecondsLeft / 60)).padStart(2, "0")}:${String(caucusSecondsLeft % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-5">
      {/* Prominent, unmissable honesty banner */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-amber-700">Practice sandbox — not an official simulator</p>
          <p className="mt-1 text-xs text-amber-700/90">{MUN_PRACTICE_DISCLAIMER}</p>
        </div>
      </div>

      {/* Conference profile selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gavel className="h-4 w-4 text-primary" aria-hidden />
            Conference profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold">Committee type</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {COMMITTEE_TYPES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCommittee(c.id)}
                  aria-pressed={committee === c.id}
                  className={`rounded-md border p-2 text-left text-sm ${committee === c.id ? "border-primary bg-primary/10" : "bg-background hover:bg-muted"}`}
                >
                  <span className="font-semibold">{c.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{c.blurb}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Rules profile</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {RULES_PROFILES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRules(r.id)}
                  aria-pressed={rules === r.id}
                  className={`rounded-md border p-2 text-left text-sm ${rules === r.id ? "border-primary bg-primary/10" : "bg-background hover:bg-muted"}`}
                >
                  <span className="font-semibold">{r.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{r.blurb}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Assigned country</span>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Brazil" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Committee topic</span>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. climate financing" />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Country policy brief (AI-inferred) */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              Country policy brief
            </CardTitle>
            <Button type="button" size="sm" onClick={fetchBrief} disabled={briefBusy}>
              {briefBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {briefBusy ? "Generating..." : brief ? "Regenerate" : "Generate brief"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {brief ? (
            <div className="space-y-3 text-sm">
              <p className="rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700">{brief.disclaimer}</p>
              <BriefList title="Inferred documented position (inference, verify)" items={brief.inferredPosition} />
              <BriefList title="Realistic negotiation stances" items={brief.negotiationStances} />
              <div className="grid gap-3 sm:grid-cols-2">
                <BriefList title="Likely allies" items={brief.likelyAllies} />
                <BriefList title="Likely opposition" items={brief.likelyOpposition} />
              </div>
              <BriefList title="Talking points" items={brief.talkingPoints} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Set your country and topic above, then generate a practice brief. Every line is AI-inferred, not verified — a
              starting point to confirm against real sources.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Committee simulator shell: speakers list + caucus timer + motions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-primary" aria-hidden />
              Speakers list
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newDelegation}
                onChange={(e) => setNewDelegation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSpeaker()}
                placeholder="Add a delegation"
              />
              <Button type="button" size="sm" variant="outline" onClick={addSpeaker}>
                <Plus className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            {speakers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No delegations yet. Add speakers to build the list.</p>
            ) : (
              <ol className="space-y-1">
                {speakers.map((s, i) => (
                  <li
                    key={s.id}
                    className={`flex items-center justify-between rounded-md border px-2 py-1 text-sm ${i === currentSpeaker ? "border-primary bg-primary/10 font-semibold" : "bg-background"}`}
                  >
                    <span>
                      {i + 1}. {s.delegation} {i === currentSpeaker ? <Badge variant="secondary" className="ml-1">speaking</Badge> : null}
                    </span>
                    <button type="button" onClick={() => setSpeakers((list) => list.filter((x) => x.id !== s.id))} aria-label={`Remove ${s.delegation}`}>
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" aria-hidden />
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {speakers.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setCurrentSpeaker((c) => (c + 1) % speakers.length)}
              >
                Next speaker
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" aria-hidden />
              Motions & caucus timer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Motion</span>
              <select
                value={motion}
                onChange={(e) => setMotion(e.target.value as MotionKind)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {MOTIONS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </label>
            {selectedMotion?.needsTopic ? (
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Caucus topic</span>
                <Input value={caucusTopic} onChange={(e) => setCaucusTopic(e.target.value)} placeholder="e.g. adaptation funding" />
              </label>
            ) : null}
            {selectedMotion?.needsDuration ? (
              <div className="flex items-end gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold">Total minutes</span>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={caucusMinutes}
                    onChange={(e) => setCaucusMinutes(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                    className="w-24"
                  />
                </label>
                <p className="font-mono text-2xl font-bold tabular-nums">{clock}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This motion has no timed caucus.</p>
            )}
            {selectedMotion?.needsDuration ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => (caucusRunning ? setCaucusRunning(false) : caucusSecondsLeft > 0 ? setCaucusRunning(true) : startCaucus())}>
                  {caucusRunning ? "Pause" : caucusSecondsLeft > 0 ? "Resume" : "Start caucus"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setCaucusRunning(false); setCaucusSecondsLeft(0); }}>
                  Reset
                </Button>
                {caucusExpired && caucusMinutes > 0 && !caucusRunning && caucusSecondsLeft === 0 ? (
                  <span className="self-center text-sm font-semibold text-destructive">Time up.</span>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Speech log + rapporteur feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delegate speeches & rapporteur feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={speech} onChange={(e) => setSpeech(e.target.value)} onKeyDown={(e) => e.key === "Enter" && logSpeech()} placeholder="Type your delegate speech, then log it" />
            <Button type="button" size="sm" variant="outline" onClick={logSpeech}>Log speech</Button>
          </div>
          {log.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {log.map((l, i) => (
                <li key={i} className="rounded-md border bg-background px-2 py-1">{l.content}</li>
              ))}
            </ul>
          ) : null}
          <Button type="button" size="sm" onClick={requestFeedback} disabled={judgeBusy}>
            {judgeBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {judgeBusy ? "Scoring..." : "Get rapporteur feedback"}
          </Button>

          {judge ? (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700">{judge.disclaimer}</p>
              <p className="font-semibold">Overall practice score: {judge.overallScore}/100</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {judge.dimensionScores.map((d) => (
                  <div key={d.key} className="rounded-md border bg-background p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{MUN_DIMENSIONS.find((x) => x.key === d.key)?.label ?? d.label}</span>
                      <span className="font-bold text-primary">{d.score}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{d.reason}</p>
                  </div>
                ))}
              </div>
              <BriefList title="Strengths" items={judge.strengths} />
              <BriefList title="To improve" items={judge.improvementAdvice} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
    </div>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
