"use client";

import { useState } from "react";
import type { Level } from "@prisma/client";
import { CircleAlert, Dices, HeartPulse, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HOSA_CATEGORIES } from "@/lib/training-tracks";

const LEVELS: Level[] = ["BEGINNER", "INTERMEDIATE", "ELITE"];

// Non-exam HOSA categories: Medical Terminology is the verified written exam (its own flagship room),
// so it is intentionally excluded here — this component is the generic interactive role-play.
const ROLEPLAY_CATEGORIES = HOSA_CATEGORIES.filter((c) => !/medical terminology/i.test(c));

// "Surprise me" role pairs — varied matchups so repeat sessions don't anchor on one plot.
const ROLE_PAIRS: Array<{ student: string; character: string }> = [
  { student: "health science student", character: "patient who is anxious about a new diagnosis" },
  { student: "clinic volunteer", character: "parent worried about a child's fever" },
  { student: "pharmacy technician trainee", character: "senior confused about a dosing schedule" },
  { student: "nursing assistant student", character: "post-op patient afraid to start walking" },
  { student: "EMT trainee", character: "shaken bystander at a minor accident" },
  { student: "school health aide", character: "teen embarrassed to describe symptoms" },
  { student: "community-health presenter", character: "audience member citing online misinformation" },
  { student: "dental assistant student", character: "patient with severe dental anxiety" },
  { student: "physical-therapy aide", character: "athlete pushing to return too soon" },
  { student: "telehealth support trainee", character: "caller unsure whether symptoms are urgent" }
];

type Scenario = {
  scenario: string;
  judgeCharacter: string;
  performanceIndicators: string[];
  piSource: "registry" | "generic";
  fallbackNotice?: string;
};

type JudgeResult = {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  improvementAdvice: string[];
  accuracyFlags?: string[];
  aiNotice?: string;
};

export function HosaRoleplay() {
  const [level, setLevel] = useState<Level>("BEGINNER");
  const [category, setCategory] = useState(ROLEPLAY_CATEGORIES[0]);
  const [studentRole, setStudentRole] = useState("health science student");
  const [characterRole, setCharacterRole] = useState("patient who is anxious about a new diagnosis");

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [response, setResponse] = useState("");
  const [result, setResult] = useState<JudgeResult | null>(null);

  const [busy, setBusy] = useState<null | "scenario" | "judge">(null);
  const [error, setError] = useState<string | null>(null);

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
    setResult(null);
    setResponse("");
    try {
      const data = await call<Scenario>("/api/ai/hosa-scenario", { level, category, studentRole, characterRole });
      setScenario(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate a scenario.");
    } finally {
      setBusy(null);
    }
  }

  async function submitForFeedback() {
    if (!scenario || response.trim().length < 8) return;
    setBusy("judge");
    setError(null);
    try {
      const transcript = [
        { role: "SYSTEM" as const, round: 1, content: `Scenario: ${scenario.scenario}` },
        { role: "AFFIRMATIVE" as const, round: 1, content: `Student response: ${response}` }
      ];
      const data = await call<JudgeResult>("/api/ai/judge-hosa", {
        organization: "HOSA",
        level,
        // A HOSA practice category never maps to a verified spec, so the judge degrades to generic —
        // scenario and scoring agree on provenance (both unofficial).
        eventType: category,
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-primary" aria-hidden />
            Guided health-science role-play
          </CardTitle>
          <Badge variant="secondary">HOSA</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Interactive practice for non-exam HOSA categories: read a scenario, respond in role, and get
          feedback. HOSA&apos;s official spec covers Medical Terminology (the written exam above), so these
          interactive scenarios are AI-generated generic practice — never scored as official.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Practice category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {ROLEPLAY_CATEGORIES.map((c) => (
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
            <span className="mb-1 block font-semibold">Your role <span className="font-normal text-muted-foreground">(editable — type any role)</span></span>
            <Input value={studentRole} onChange={(e) => setStudentRole(e.target.value)} placeholder="e.g. health science student" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">AI plays <span className="font-normal text-muted-foreground">(editable — type any character)</span></span>
            <Input value={characterRole} onChange={(e) => setCharacterRole(e.target.value)} placeholder="e.g. anxious patient" />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={generateScenario} disabled={busy !== null}>
            {busy === "scenario" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {busy === "scenario" ? "Generating..." : "Generate scenario"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={() => {
              const options = ROLE_PAIRS.filter((p) => p.student !== studentRole || p.character !== characterRole);
              const pick = options[Math.floor(Math.random() * options.length)] ?? ROLE_PAIRS[0];
              setStudentRole(pick.student);
              setCharacterRole(pick.character);
            }}
          >
            <Dices className="h-4 w-4" aria-hidden />
            Surprise me
          </Button>
        </div>

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
                Practice focus
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-600">generic practice — not official</span>
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

        {scenario && !result ? (
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Your response</span>
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Respond to the situation as your role — use correct terminology and safe, professional reasoning."
              className="min-h-24"
            />
          </label>
        ) : null}

        {scenario && !result ? (
          <Button type="button" variant="outline" onClick={submitForFeedback} disabled={busy !== null || response.trim().length < 8}>
            {busy === "judge" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
            {busy === "judge" ? "Scoring..." : "Submit for feedback"}
          </Button>
        ) : null}

        {result ? (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl font-bold">{result.overallScore}</span>
              <span className="text-sm text-muted-foreground">overall</span>
              <Badge variant="outline">generic practice — not official</Badge>
            </div>
            {result.aiNotice ? <p className="text-xs text-amber-600">{result.aiNotice}</p> : null}
            {result.accuracyFlags && result.accuracyFlags.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-amber-600">Accuracy check</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-amber-600">
                  {result.accuracyFlags.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
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
