"use client";

import { useState } from "react";
import { Accessibility, X } from "lucide-react";
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

// Rendered as a fixed floating control + slide-in drawer (overlay), NOT an inline block. This keeps
// the transcript and response area at full width — larger/dyslexia-friendly text never squeezes the
// central response box because these controls occupy no layout space in the room.
export function AccessibilityPanel() {
  const { settings, update } = useAccessibility();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-emerald-400/40 bg-neutral-900/95 px-4 py-2.5 text-sm font-semibold text-emerald-100 shadow-2xl backdrop-blur hover:bg-neutral-800"
      >
        <Accessibility className="h-4 w-4" aria-hidden />
        Audio &amp; accessibility
      </button>

      {open ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Audio and accessibility settings">
          <button
            type="button"
            aria-label="Close accessibility settings"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/60"
          />
          <div className="absolute right-0 top-0 flex h-full w-[22rem] max-w-[92vw] flex-col overflow-y-auto border-l border-white/10 bg-neutral-950 text-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Accessibility className="h-4 w-4 text-emerald-300" aria-hidden />
                Audio &amp; accessibility
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-white/15 p-1.5 text-neutral-300 hover:bg-white/10"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Audio</p>
                <div className="grid gap-2">
                  <Toggle label="Auto-play AI speeches" value={settings.audioAutoplay} onToggle={() => update({ audioAutoplay: !settings.audioAutoplay })} />
                  <Toggle label="Read AI response aloud" value={settings.readAiAloud} onToggle={() => update({ readAiAloud: !settings.readAiAloud })} />
                  <Toggle label="Read my transcript aloud" value={settings.readStudentAloud} onToggle={() => update({ readStudentAloud: !settings.readStudentAloud })} />
                </div>
                <div className="mt-3 grid gap-3">
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
                <div className="grid gap-2">
                  <Toggle label="Dyslexia-friendly text" value={settings.dyslexiaFont} onToggle={() => update({ dyslexiaFont: !settings.dyslexiaFont })} />
                  <Toggle label="Larger text" value={settings.largerText} onToggle={() => update({ largerText: !settings.largerText })} />
                  <Toggle label="Increased line spacing" value={settings.lineSpacing} onToggle={() => update({ lineSpacing: !settings.lineSpacing })} />
                  <Toggle label="Reduced motion" value={settings.reducedMotion} onToggle={() => update({ reducedMotion: !settings.reducedMotion })} />
                  <Toggle label="High contrast" value={settings.highContrast} onToggle={() => update({ highContrast: !settings.highContrast })} />
                  <Toggle label="Color-blind friendly" value={settings.colorBlind} onToggle={() => update({ colorBlind: !settings.colorBlind })} />
                  <Toggle label="Eye comfort" value={settings.eyeComfort} onToggle={() => update({ eyeComfort: !settings.eyeComfort })} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
