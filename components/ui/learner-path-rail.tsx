import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/ui/status-chip";
import {
  isActionableStage,
  type LearnerPathStage,
  type LearnerPathStageId,
  type LearnerPathStageState
} from "@/lib/learner-path";

/**
 * LearnerPathRail — Learn → Practice → Apply → Compete, exactly as the caller describes it.
 *
 * A presentation component and nothing else. It infers no state, computes no completion, calculates
 * no percentage, picks no "recommended" stage, writes nothing and fetches nothing. Whatever the
 * caller hands it is what a learner sees.
 *
 * Two safety rules are enforced here rather than trusted to callers:
 *  - an `unavailable` or `coming-soon` stage is never a link, even if an href is supplied by mistake
 *  - `aria-current="step"` appears only when the caller names a current stage, so nothing implies
 *    progress the product cannot prove
 *
 * Every state is readable as words (via StatusChip) as well as colour, and the whole rail is an
 * ordered list that wraps instead of scrolling sideways.
 */

/** Learner-facing wording per state. Words first — colour only ever reinforces these. */
const STATE_LABEL: Record<LearnerPathStageState, string> = {
  available: "Available",
  "not-started": "Not started",
  "in-progress": "In progress",
  completed: "Completed",
  informational: "Reading only",
  unavailable: "Unavailable",
  "coming-soon": "Coming soon"
};

const STATE_CHIP: Record<LearnerPathStageState, React.ComponentProps<typeof StatusChip>["variant"]> = {
  available: "success",
  "not-started": "neutral",
  "in-progress": "info",
  completed: "success",
  informational: "info",
  unavailable: "unavailable",
  "coming-soon": "coming-soon"
};

export interface LearnerPathRailProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** The stages, already ordered by the caller. */
  stages: readonly LearnerPathStage[];
  /** Accessible name for the list — callers scope it to their track. */
  label: string;
  /**
   * The stage a learner is currently on. Supply this ONLY when a real record proves it; leaving it
   * undefined (the honest default) marks no step as current.
   */
  currentStageId?: LearnerPathStageId;
}

export function LearnerPathRail({ stages, label, currentStageId, className, ...props }: LearnerPathRailProps) {
  if (stages.length === 0) return null;
  return (
    <nav aria-label={label} className={cn("min-w-0", className)} {...props}>
      {/* An ordered list: the sequence is part of the meaning, and it wraps rather than scrolls. */}
      <ol className="grid gap-2 sm:grid-cols-2">
        {stages.map((stage, index) => {
          const actionable = isActionableStage(stage);
          const current = currentStageId === stage.id;
          const body = (
            <>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {index + 1}
                </span>
                <span className="font-semibold text-foreground">{stage.label}</span>
                <StatusChip variant={STATE_CHIP[stage.state]}>{STATE_LABEL[stage.state]}</StatusChip>
              </span>
              {stage.note ? (
                <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">{stage.note}</span>
              ) : null}
              {current ? <span className="sr-only">Current stage</span> : null}
            </>
          );
          const shared = cn(
            "flex min-h-11 flex-col justify-center rounded-md border px-3 py-2",
            current ? "border-selected-border bg-selected-surface" : "border-border"
          );
          return (
            <li key={stage.id} className="min-w-0">
              {actionable ? (
                <Link
                  href={stage.href as Route}
                  aria-current={current ? "step" : undefined}
                  className={cn(shared, "focus-ring transition-colors hover:bg-muted")}
                >
                  {body}
                </Link>
              ) : (
                // Not a link, not a disabled button — just a statement of where the product stands.
                <div aria-current={current ? "step" : undefined} className={cn(shared, "bg-muted/30")}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
