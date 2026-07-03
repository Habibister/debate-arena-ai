"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type RetryConfig = {
  organization: string;
  eventType: string;
  format: string;
  level: string;
  topic: string;
  studentSide: string;
  aiPersona: string | null;
};

// "Practice this motion again" — creates a brand-new debate on the same motion via the normal create
// flow (POST /api/debates + opening MODERATOR message), then opens its arena. It never copies the old
// transcript or scores; it is a fresh attempt.
export function RetryMotionButton({ config }: { config: RetryConfig }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          side: config.studentSide,
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

  return (
    <div className="space-y-1">
      <Button type="button" onClick={retry} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="mr-2 h-4 w-4" aria-hidden />}
        Practice this motion again
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
