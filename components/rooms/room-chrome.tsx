"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, ChevronRight, Clock, DoorOpen } from "lucide-react";
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

// Additive orientation strip for rooms that keep their own header (the debate arena). It only adds a
// way to get your bearings — a breadcrumb plus an explicit "Back to track" — without touching the
// room's internals or palette. `tone="arena"` matches the debate arena's dark panel.
export function RoomOrientation({
  crumbs,
  backHref,
  backLabel,
  tone = "arena"
}: {
  crumbs: Crumb[];
  backHref: string;
  backLabel: string;
  tone?: "app" | "arena";
}) {
  const arena = tone === "arena";
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2 sm:px-6",
        arena ? "border-white/10 bg-black/40" : "border-border bg-muted/40"
      )}
    >
      <nav aria-label="Breadcrumb" className={cn("flex min-w-0 flex-wrap items-center gap-1 text-xs", arena ? "text-neutral-400" : "text-muted-foreground")}>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="h-3 w-3 shrink-0" aria-hidden /> : null}
            {c.href ? (
              <Link href={c.href as Route} className={cn("truncate", arena ? "hover:text-white" : "hover:text-foreground")}>{c.label}</Link>
            ) : (
              <span className={cn("truncate font-semibold", arena ? "text-white" : "text-foreground")} aria-current="page">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <Link
        href={backHref as Route}
        className={cn(
          "focus-ring flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold",
          arena ? "border-white/15 bg-white/[0.03] text-neutral-200 hover:bg-white/10" : "hover:bg-muted"
        )}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />{backLabel}
      </Link>
    </div>
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
