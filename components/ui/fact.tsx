import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Fact — one sourced label/value pair, in the instrument-like treatment the Event Navigators
 * already use (`QUESTIONS / 50`, `TIME / 60 minutes`).
 *
 * This is a DISPLAY primitive and nothing more. It renders the value it is handed. It does not
 * format, default, round, infer or annotate one, and it carries no notion of whether a value is
 * verified — provenance stays with the registry and with SourceFreshnessNote, exactly where the
 * M8–M11 work put it. A caller with no value should render no Fact.
 *
 * Both label and value are visible text, so nothing depends on a tooltip or on hover, and both wrap
 * rather than truncate: a long value must stay readable at 375px.
 */
export interface FactProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What this value is. Visible, never a tooltip. */
  label: string;
  /** The value itself, already resolved by the caller. */
  value: React.ReactNode;
  /** Optional one-line qualifier shown under the value. */
  description?: string;
}

export function Fact({ label, value, description, className, ...props }: FactProps) {
  return (
    <div className={cn("rounded-md border bg-background p-3", className)} {...props}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {/* break-words, not truncate: a value that does not fit must wrap, never disappear. */}
      <p className="mt-1 break-words font-medium text-foreground">{value}</p>
      {description ? (
        <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

/** Responsive container for a set of Facts. Single column on small screens, two from `sm`. */
export function FactGrid({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-2 sm:grid-cols-2", className)} {...props} />;
}
