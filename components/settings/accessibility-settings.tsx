"use client";

import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AccessibilitySettings as A11ySettings } from "@/lib/accessibility";
import { useAccessibility } from "@/components/debate/accessibility/accessibility-context";

// Reuses the single sitewide accessibility context — changes here apply instantly everywhere
// (dashboard, debate room, games) and persist in localStorage. No JWT/cookie storage.
const OPTIONS: Array<{ key: keyof A11ySettings; label: string; description: string }> = [
  { key: "colorBlind", label: "Color-blind friendly mode", description: "Adds icons and text labels to status so meaning never depends on color alone, and strengthens borders and focus." },
  { key: "eyeComfort", label: "Eye comfort mode", description: "Uses warmer, softer interface colors for visual comfort while keeping text readable." },
  { key: "reducedMotion", label: "Reduced motion", description: "Minimizes animations and transitions. Loading indicators and timers still work." },
  { key: "largerText", label: "Larger text", description: "Increases the base text size a little across the app while preserving layout." },
  { key: "lineSpacing", label: "Increased spacing", description: "Adds more line height and breathing room, which helps long transcripts and dense text." },
  { key: "highContrast", label: "High contrast", description: "Strengthens text, borders, and focus outlines for clearer separation." },
  { key: "dyslexiaFont", label: "Dyslexia-friendly text", description: "Adds letter and word spacing and left-aligns long text. Uses safe system fonts — no download." }
];

function ToggleRow({ label, description, value, onToggle }: { label: string; description: string; value: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border bg-background p-4">
      <div className="min-w-0">
        <p className="font-semibold">{label}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={onToggle}
        className={cn(
          "focus-ring inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold",
          value ? "border-primary bg-primary/10 text-primary" : "bg-card text-muted-foreground"
        )}
      >
        {value ? <Check className="h-4 w-4" aria-hidden /> : null}
        {/* State shown as text, not color alone. */}
        {value ? "On" : "Off"}
      </button>
    </div>
  );
}

export function AccessibilitySettings() {
  const { settings, update } = useAccessibility();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accessibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {OPTIONS.map((option) => (
          <ToggleRow
            key={option.key}
            label={option.label}
            description={option.description}
            value={Boolean(settings[option.key])}
            onToggle={() => update({ [option.key]: !settings[option.key] } as Partial<A11ySettings>)}
          />
        ))}
        <p className="pt-1 text-xs text-muted-foreground">Preferences save on this device and apply immediately across the app.</p>
      </CardContent>
    </Card>
  );
}
