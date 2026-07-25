"use client";

import Link from "next/link";
import type { Route } from "next";
import { ChevronRight, Clock, DoorOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

// Shared orientation bar for any activity room (role-play now, debate in C3b). Sticky top bar with a
// breadcrumb (a clear way back), difficulty, stage progress, an estimated time, and an exit control.
// The exit label + handler are supplied by the room, so persisted rooms can say "Save & Exit" while
// client-state rooms say a plain, honest "Exit".
export function RoomChrome({
  crumbs,
  difficulty,
  stageProgress,
  estMinutes,
  exitLabel = "Exit",
  onExit
}: {
  crumbs: Crumb[];
  difficulty?: string;
  stageProgress?: string;
  estMinutes?: number;
  exitLabel?: string;
  onExit: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 ? <ChevronRight className="h-3 w-3 shrink-0" aria-hidden /> : null}
              {c.href ? (
                <Link href={c.href as Route} className="truncate hover:text-foreground">{c.label}</Link>
              ) : (
                <span className="truncate font-semibold text-foreground" aria-current="page">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {difficulty ? <span className="rounded-md border border-track/30 bg-track/10 px-2 py-1 font-semibold capitalize text-track">{difficulty.toLowerCase()}</span> : null}
          {stageProgress ? <span className="rounded-md border px-2 py-1 font-semibold text-muted-foreground tabular-nums">{stageProgress}</span> : null}
          {typeof estMinutes === "number" ? <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" aria-hidden />~{estMinutes} min</span> : null}
          <button type="button" onClick={onExit} className="focus-ring flex items-center gap-1 rounded-md border px-2.5 py-1 font-semibold hover:bg-muted">
            <DoorOpen className="h-3.5 w-3.5" aria-hidden />{exitLabel}
          </button>
        </div>
      </div>
    </header>
  );
}

// Shared stage chips (Brief / Interrogation / Ballot, etc.).
export function StageRail({ stages, activeIndex }: { stages: string[]; activeIndex: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Stage progress">
      {stages.map((s, i) => (
        <li
          key={s}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs font-semibold",
            i === activeIndex ? "border-track bg-track/15 text-track" : "border-border text-muted-foreground"
          )}
          aria-current={i === activeIndex ? "step" : undefined}
        >
          {i + 1}. {s}
        </li>
      ))}
    </ol>
  );
}
