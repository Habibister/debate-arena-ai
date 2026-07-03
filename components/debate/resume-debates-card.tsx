"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { History, PlayCircle, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { draftKey } from "@/lib/debate-drafts";

export type ResumeDebate = {
  id: string;
  topic: string;
  trackLabel: string;
  formatLabel: string;
  sideLabel: string;
  opponentLabel: string;
  statusLabel: string;
  updatedLabel: string;
};

// Dashboard recovery prompt for debates that were left mid-session (SETUP/ACTIVE). Continue reopens the
// real arena; Discard draft clears only that debate's local draft (after confirm) and hides the prompt —
// it never deletes the debate, which stays available under History. No completion or score is implied.
export function ResumeDebatesCard({ debates }: { debates: ResumeDebate[] }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const visible = debates.filter((debate) => !hidden.includes(debate.id));

  if (visible.length === 0) {
    return null;
  }

  function dismiss(id: string) {
    if (!window.confirm("Discard your unsent draft for this debate? The debate itself stays in History and nothing is submitted.")) {
      return;
    }
    try {
      window.localStorage.removeItem(draftKey(id));
    } catch {
      // ignore
    }
    setHidden((current) => [...current, id]);
  }

  return (
    <Card className="border-amber-400/40 bg-amber-500/[0.06]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PlayCircle className="h-4 w-4 text-amber-500" aria-hidden />
          Continue an unfinished debate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          These debates were interrupted before judging. Pick up where you left off — nothing was submitted or scored.
        </p>
        {visible.map((debate) => (
          <div key={debate.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{debate.topic}</p>
              <p className="text-xs text-muted-foreground">
                {debate.trackLabel} · {debate.formatLabel} · {debate.sideLabel} · vs {debate.opponentLabel}
              </p>
              <p className="text-xs text-muted-foreground">
                {debate.statusLabel} · Last active {debate.updatedLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/debate/${debate.id}` as Route} className={buttonVariants({ size: "sm" })}>
                Continue
              </Link>
              <Button type="button" variant="ghost" size="sm" onClick={() => dismiss(debate.id)}>
                <X className="mr-1 h-4 w-4" aria-hidden />
                Discard draft
              </Button>
            </div>
          </div>
        ))}
        <Link href={"/debates/history" as Route} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <History className="h-3.5 w-3.5" aria-hidden />
          View all debate history
        </Link>
      </CardContent>
    </Card>
  );
}
