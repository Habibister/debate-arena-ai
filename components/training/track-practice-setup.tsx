"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { Level } from "@prisma/client";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  composePractice,
  DECA_CLUSTERS,
  DECA_PARTICIPANT_ROLES,
  HOSA_CATEGORIES,
  MUN_ACTIVITIES,
  MUN_COMMITTEES,
  PRACTICE_SOURCES,
  type PracticeFields,
  type PracticeSource,
  type TrackInfo
} from "@/lib/training-tracks";

const LEVELS: Level[] = ["BEGINNER", "INTERMEDIATE", "ELITE"];

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

export function TrackPracticeSetup({ track }: { track: TrackInfo }) {
  const router = useRouter();
  const [fields, setFields] = useState<PracticeFields>({
    category: HOSA_CATEGORIES[0],
    cluster: DECA_CLUSTERS[0],
    participantRole: DECA_PARTICIPANT_ROLES[0],
    committee: MUN_COMMITTEES[0],
    activity: MUN_ACTIVITIES[0]
  });
  const [level, setLevel] = useState<Level>("BEGINNER");
  const [source, setSource] = useState<PracticeSource>("AI");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<PracticeFields>) => setFields((c) => ({ ...c, ...patch }));
  const composed = composePractice(track.id, fields);
  const pastBlocked = source === "PAST";

  async function start() {
    if (pastBlocked) {
      return;
    }
    setIsStarting(true);
    setError(null);
    try {
      // Model UN is its own experience — the server keys its config off the MODEL_UN organization, so
      // send a neutral (non-parliamentary) carrier format and the delegate side. Other tracks keep the
      // existing parliamentary carrier used by the shared debate pipeline.
      const isModelUn = track.id === "MODEL_UN";
      const createRes = await fetch("/api/debates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization: composed.organization,
          eventType: composed.eventType,
          practiceMode: composed.practiceMode,
          format: isModelUn ? "PUBLIC_FORUM" : "PARLIAMENTARY",
          category: track.short,
          level,
          topic: composed.topic,
          aiGeneratedTopic: true,
          side: isModelUn ? "FOR" : "GOVERNMENT",
          mode: "AI"
        })
      });
      const created = (await createRes.json().catch(() => ({}))) as { debate?: { id: string }; error?: string };
      if (!createRes.ok || !created.debate) {
        throw new Error(created.error ?? "Could not start practice. Please try again.");
      }
      await fetch(`/api/debates/${created.debate.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "MODERATOR", round: 1, content: composed.topic })
      });
      router.push(`/debate/${created.debate.id}` as Route);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start practice. Please try again.");
      setIsStarting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
            {track.label} practice
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Training in: {track.label}</Badge>
            <Link href="/training" className="text-sm font-semibold text-primary hover:underline">
              Switch track
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {track.id === "HOSA" ? (
            <Select label="Practice category" value={fields.category ?? ""} options={HOSA_CATEGORIES} onChange={(v) => set({ category: v })} />
          ) : null}
          {track.id === "DECA" ? (
            <>
              <Select label="Career cluster" value={fields.cluster ?? ""} options={DECA_CLUSTERS} onChange={(v) => set({ cluster: v })} />
              <Select label="AI participant role" value={fields.participantRole ?? ""} options={DECA_PARTICIPANT_ROLES} onChange={(v) => set({ participantRole: v })} />
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Your role</span>
                <Input value={fields.role ?? ""} onChange={(e) => set({ role: e.target.value })} placeholder="e.g. marketing associate" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Performance indicators (optional)</span>
                <Input value={fields.performanceIndicators ?? ""} onChange={(e) => set({ performanceIndicators: e.target.value })} placeholder="e.g. explain the nature of pricing" />
              </label>
            </>
          ) : null}
          {track.id === "MODEL_UN" ? (
            <>
              <Select label="Committee" value={fields.committee ?? ""} options={MUN_COMMITTEES} onChange={(v) => set({ committee: v })} />
              <Select label="Activity" value={fields.activity ?? ""} options={MUN_ACTIVITIES} onChange={(v) => set({ activity: v })} />
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Country / delegation</span>
                <Input value={fields.country ?? ""} onChange={(e) => set({ country: e.target.value })} placeholder="e.g. Brazil" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Agenda / topic</span>
                <Input value={fields.agenda ?? ""} onChange={(e) => set({ agenda: e.target.value })} placeholder="e.g. climate financing" />
              </label>
            </>
          ) : null}
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Difficulty</span>
            <select value={level} onChange={(e) => setLevel(e.target.value as Level)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l.toLowerCase()}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold">Scenario / focus (optional)</span>
          <Textarea value={fields.scenario ?? ""} onChange={(e) => set({ scenario: e.target.value })} placeholder="Describe the situation or leave blank to let the AI generate one." className="min-h-20" />
        </label>

        {/* Practice source */}
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <p className="text-sm font-semibold">Practice source</p>
          <div className="flex flex-wrap gap-2">
            {PRACTICE_SOURCES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSource(s.id)}
                aria-pressed={source === s.id}
                className={cn("focus-ring rounded-md border px-3 py-1.5 text-sm font-semibold", source === s.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground")}
              >
                {s.label}
              </button>
            ))}
          </div>
          {source === "PAST" ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs font-medium text-amber-700">
              No verified public past material is available for this selection. Choose AI Practice or Mixed.
            </p>
          ) : source === "MIXED" ? (
            <p className="text-xs text-muted-foreground">No verified public past material was available, so this practice will be AI-generated.</p>
          ) : (
            <p className="text-xs text-muted-foreground">{composed.sourceLabel}.</p>
          )}
        </div>

        {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}

        <Button type="button" onClick={start} disabled={isStarting || pastBlocked}>
          {isStarting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
          {isStarting ? "Starting..." : `Start ${track.short} practice`}
        </Button>
      </CardContent>
    </Card>
  );
}
