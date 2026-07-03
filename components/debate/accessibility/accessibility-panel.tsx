"use client";

import { useState } from "react";
import { Accessibility, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { VOICE_STYLES, type SpeechRate } from "@/lib/accessibility";
import { useAccessibility } from "@/components/debate/accessibility/accessibility-context";

const RATES: Array<{ id: SpeechRate; label: string }> = [
  { id: "slow", label: "Slow" },
  { id: "normal", label: "Normal" },
  { id: "fast", label: "Fast" }
];

function Toggle({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={value}
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm",
        value ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100" : "border-white/15 bg-white/[0.03] text-neutral-200"
      )}
    >
      <span className="font-semibold">{label}</span>
      {/* Not color alone: explicit On/Off label communicates state. */}
      <span className="text-xs font-semibold">{value ? "On" : "Off"}</span>
    </button>
  );
}

export function AccessibilityPanel() {
  const { settings, update } = useAccessibility();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-neutral-100"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Accessibility className="h-4 w-4 text-emerald-300" aria-hidden />
          Audio &amp; accessibility
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-white/10 p-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Audio</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle label="Auto-play AI speeches" value={settings.audioAutoplay} onToggle={() => update({ audioAutoplay: !settings.audioAutoplay })} />
              <Toggle label="Read AI response aloud" value={settings.readAiAloud} onToggle={() => update({ readAiAloud: !settings.readAiAloud })} />
              <Toggle label="Read my transcript aloud" value={settings.readStudentAloud} onToggle={() => update({ readStudentAloud: !settings.readStudentAloud })} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Voice style</span>
                <select
                  value={settings.voiceStyle}
                  onChange={(event) => update({ voiceStyle: event.target.value as typeof settings.voiceStyle })}
                  className="h-9 w-full rounded-md border border-white/15 bg-neutral-900 px-2 text-sm text-neutral-100"
                >
                  {VOICE_STYLES.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Speech rate</span>
                <div className="flex gap-1">
                  {RATES.map((rate) => (
                    <button
                      key={rate.id}
                      type="button"
                      onClick={() => update({ speechRate: rate.id })}
                      aria-pressed={settings.speechRate === rate.id}
                      className={cn(
                        "flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold",
                        settings.speechRate === rate.id ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100" : "border-white/15 text-neutral-300"
                      )}
                    >
                      {rate.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Reading comfort</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle label="Dyslexia-friendly text" value={settings.dyslexiaFont} onToggle={() => update({ dyslexiaFont: !settings.dyslexiaFont })} />
              <Toggle label="Larger text" value={settings.largerText} onToggle={() => update({ largerText: !settings.largerText })} />
              <Toggle label="Increased line spacing" value={settings.lineSpacing} onToggle={() => update({ lineSpacing: !settings.lineSpacing })} />
              <Toggle label="Reduced motion" value={settings.reducedMotion} onToggle={() => update({ reducedMotion: !settings.reducedMotion })} />
              <Toggle label="High contrast" value={settings.highContrast} onToggle={() => update({ highContrast: !settings.highContrast })} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
