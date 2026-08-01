import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Stat — one number or short metric, in the display face with tabular figures.
 *
 * It renders what the caller already computed from recorded activity. It computes nothing: no
 * percentage, no readiness, no score, no streak, no delta, no "up 12% this week". If a caller has
 * no real number, it should render no Stat rather than a zero dressed up as a result.
 *
 * `status` is likewise the caller's own words — a phrase they already hold, shown verbatim. There is
 * no trend arrow, because an arrow would be a claim this component is in no position to make.
 */
export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What is being counted. Visible text, always present. */
  label: string;
  /** The value, already derived by the caller. */
  value: React.ReactNode;
  /** Optional caller-supplied qualifier, e.g. "recorded rounds only". Shown verbatim. */
  status?: React.ReactNode;
  /** Optional decorative icon. Always rendered aria-hidden. */
  icon?: LucideIcon;
}

export function Stat({ label, value, status, icon: Icon, className, ...props }: StatProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)} {...props}>
      <p className="eyebrow flex items-center gap-2">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
        {label}
      </p>
      {/* .metric = display face + tabular-nums, so digits do not jitter as a value changes. */}
      <p className="metric mt-2 text-foreground">{value}</p>
      {status ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{status}</p> : null}
    </div>
  );
}
