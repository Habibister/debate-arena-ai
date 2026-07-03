"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RetryConfig = {
  organization: string;
  eventType: string;
  format: string;
  level: string;
  topic: string;
  studentSide: string;
  aiPersona: string | null;
};

type SideChoice = "SAME" | "OPPOSITE" | "RANDOM";

// The opposite of the stored side within the same format family. Used only to pick the retry side —
// the create API re-resolves it for the chosen format.
function oppositeSide(side: string): string {
  const map: Record<string, string> = {
    GOVERNMENT: "OPPOSITION",
    OPPOSITION: "GOVERNMENT",
    FOR: "AGAINST",
    AGAINST: "FOR"
  };
  return map[side] ?? side;
}

// "Practice this motion again" — creates a brand-new debate on the same motion, track, format/event, and
// opponent difficulty via the normal create flow (POST /api/debates + opening MODERATOR message), then
// opens its arena. It never copies the old transcript, scores, judge feedback, or private coaching.
// The student picks same / opposite / random side before starting.
export function RetryMotionButton({ config }: { config: RetryConfig }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState<SideChoice>("SAME");
  const [error, setError] = useState<string | null>(null);

  function resolveSide(): string {
    if (choice === "OPPOSITE") return oppositeSide(config.studentSide);
    if (choice === "RANDOM") return "RANDOM";
    return config.studentSide;
  }

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      const createResponse = await fetch("/api/debates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization: config.organization,
          eventType: config.eventType,
          practiceMode: "DEBATE",
          format: config.format,
          level: config.level,
          topic: config.topic,
          side: resolveSide(),
          mode: "AI",
          aiPersona: config.aiPersona ?? undefined
        })
      });
      if (!createResponse.ok) {
        throw new Error("create failed");
      }
      const created = (await createResponse.json()) as { debate: { id: string } };
      await fetch(`/api/debates/${created.debate.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "MODERATOR", round: 1, content: `Motion: ${config.topic}` })
      });
      router.push(`/debate/${created.debate.id}` as Route);
    } catch {
      setError("Could not start a new attempt right now. Please try again.");
      setBusy(false);
    }
  }

  const options: Array<{ value: SideChoice; label: string }> = [
    { value: "SAME", label: "Same side" },
    { value: "OPPOSITE", label: "Opposite side" },
    { value: "RANDOM", label: "Random side" }
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Practice this motion again</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Side for the new attempt">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant="outline"
            size="sm"
            role="radio"
            aria-checked={choice === option.value}
            onClick={() => setChoice(option.value)}
            className={cn(choice === option.value && "border-primary bg-primary/10 text-foreground")}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <Button type="button" onClick={retry} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="mr-2 h-4 w-4" aria-hidden />}
        Start new attempt
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
