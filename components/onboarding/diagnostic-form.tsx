"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ACTIVE_TRACKS, type TrainingTrack } from "@/lib/training-tracks";
import { useTrainingTrack } from "@/components/training/training-track-context";
import {
  CONFIDENCE_QUESTIONS,
  DEFAULT_PROFILE,
  EXPERIENCE_OPTIONS,
  LEARNING_METHOD_OPTIONS,
  LEARNING_PROFILE_KEY,
  normalizeLearningProfile,
  type Confidence,
  type ConfidenceKey,
  type ExperienceLevel,
  type LearningMethod,
  type LearningProfile,
  type SessionLength
} from "@/lib/learning-path";

const SESSIONS: Array<{ id: SessionLength; label: string }> = [
  { id: "short", label: "Short (5–10 min)" },
  { id: "medium", label: "Medium (15–20 min)" },
  { id: "long", label: "Long (30+ min)" }
];

export function DiagnosticForm() {
  const router = useRouter();
  const { track, setTrack } = useTrainingTrack();
  const [profile, setProfile] = useState<LearningProfile>({ ...DEFAULT_PROFILE, track });
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<LearningProfile>) => setProfile((c) => ({ ...c, ...patch }));
  const setConfidence = (key: ConfidenceKey, value: Confidence) => setProfile((c) => ({ ...c, confidence: { ...c.confidence, [key]: value } }));
  const toggleMethod = (m: LearningMethod) =>
    setProfile((c) => ({ ...c, methods: c.methods.includes(m) ? c.methods.filter((x) => x !== m) : [...c.methods, m] }));

  function save() {
    setSaving(true);
    const finished = normalizeLearningProfile({ ...profile, completedAt: new Date().toISOString() });
    try {
      window.localStorage.setItem(LEARNING_PROFILE_KEY, JSON.stringify(finished)); // localStorage only — never JWT/cookies
    } catch {
      // ignore storage failure; still navigate
    }
    setTrack(finished.track); // keep the sitewide track in sync
    router.push("/dashboard");
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="track">Training track</label>
        <select
          id="track"
          value={profile.track}
          onChange={(e) => set({ track: e.target.value as TrainingTrack })}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          {ACTIVE_TRACKS.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold">Experience</p>
        <div className="flex flex-wrap gap-2">
          {EXPERIENCE_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => set({ experience: o.id as ExperienceLevel })}
              aria-pressed={profile.experience === o.id}
              className={cn("rounded-md border px-3 py-1.5 text-sm font-semibold", profile.experience === o.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground")}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Format / event (optional)</span>
          <Input value={profile.formatOrEvent} onChange={(e) => set({ formatOrEvent: e.target.value })} placeholder="e.g. Public Forum" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Main goal (optional)</span>
          <Input value={profile.goal} onChange={(e) => set({ goal: e.target.value })} placeholder="e.g. place at regionals" />
        </label>
      </div>

      <section className="space-y-2">
        <p className="text-sm font-semibold">How confident are you? (1 = low, 5 = high)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CONFIDENCE_QUESTIONS.map((q) => (
            <div key={q.key} className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
              <span className="text-sm">{q.label}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setConfidence(q.key, n as Confidence)}
                    aria-label={`${q.label}: ${n}`}
                    aria-pressed={profile.confidence[q.key] === n}
                    className={cn("h-7 w-7 rounded-md border text-xs font-semibold", profile.confidence[q.key] === n ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground")}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Preferred session length</span>
          <select value={profile.sessionLength} onChange={(e) => set({ sessionLength: e.target.value as SessionLength })} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
            {SESSIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        <div className="text-sm">
          <span className="mb-1 block font-semibold">Timer preference</span>
          <div className="flex gap-1">
            {(["off", "on"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set({ timer: t })}
                aria-pressed={profile.timer === t}
                className={cn("flex-1 rounded-md border px-3 py-1.5 text-sm font-semibold", profile.timer === t ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground")}
              >
                {t === "off" ? "No timer" : "Use a timer"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="space-y-2">
        <p className="text-sm font-semibold">How do you learn best? (pick any)</p>
        <div className="flex flex-wrap gap-2">
          {LEARNING_METHOD_OPTIONS.map((m) => {
            const active = profile.methods.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMethod(m.id)}
                aria-pressed={active}
                className={cn("flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-semibold", active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground")}
              >
                {active ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                {m.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Build my learning path
        </Button>
        <Link href="/dashboard" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          Skip for now
        </Link>
      </div>
    </div>
  );
}
