import * as React from "react";
import { cn } from "@/lib/utils";

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value: number;
};

export function Progress({ value, className, ...props }: ProgressProps) {
  // The same clamp that already drove the width now also drives the exposed value, so assistive
  // technology hears exactly the number that is drawn. Nothing is inferred, defaulted or completed
  // on the caller's behalf — an unknown value is the caller's to withhold, not ours to invent.
  const clamped = Math.max(0, Math.min(value, 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${clamped}%` }} />
    </div>
  );
}
