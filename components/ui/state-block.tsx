import * as React from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, Inbox, Lock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * StateBlock — the five outcomes a surface can have when it is not showing its normal content.
 *
 * These used to share one treatment: a locked coach page and an empty history page rendered the
 * same card, so "you don't have access" and "there's nothing here yet" looked identical. Each state
 * now has its own icon, its own border treatment and its own semantic token:
 *
 *   empty        dashed border, muted     — the surface works, there is simply nothing in it yet
 *   locked       solid border, --locked   — the surface exists and you may not open it
 *   unavailable  dashed border, --unavailable — it exists, it is switched off, it may come back
 *   error        solid border, --destructive — something failed just now
 *   success      solid border, --success  — something completed
 *
 * The state is always supplied by the caller. Nothing is inferred from data, and no action is
 * fabricated: the action slot renders only what a caller passes.
 */
export type StateBlockState = "empty" | "locked" | "unavailable" | "error" | "success";

const STATE_STYLES: Record<StateBlockState, { container: string; icon: string; defaultIcon: LucideIcon }> = {
  empty: {
    container: "border-dashed bg-card",
    icon: "bg-muted text-muted-foreground",
    defaultIcon: Inbox
  },
  locked: {
    // Solid edge: a locked surface is a real boundary, not an absence.
    container: "border-locked/50 bg-locked/[0.06]",
    icon: "bg-locked/15 text-locked",
    defaultIcon: Lock
  },
  unavailable: {
    // Dashed edge: switched off, and distinct from both locked and empty.
    container: "border-dashed border-unavailable/60 bg-unavailable/[0.06]",
    icon: "bg-unavailable/15 text-unavailable",
    defaultIcon: CircleDashed
  },
  error: {
    // --destructive is used for the edge and the aria-hidden icon only. It measures 4.09:1 as text
    // on its own tint, below the 4.5:1 floor, so the words here stay in --foreground.
    container: "border-destructive/50 bg-destructive/[0.06]",
    icon: "bg-destructive/15 text-destructive",
    defaultIcon: AlertTriangle
  },
  success: {
    container: "border-success/50 bg-success/[0.06]",
    icon: "bg-success/15 text-success",
    defaultIcon: CheckCircle2
  }
};

export interface StateBlockProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Which of the five outcomes this is. Caller-provided; never inferred. */
  state: StateBlockState;
  /** The headline, in words. The state is always readable without the colour or the icon. */
  title: string;
  /** One sentence of supporting text. */
  description?: string;
  /** Override the reinforcement icon. Always rendered aria-hidden. */
  icon?: LucideIcon;
  /**
   * Optional recovery action. Rendered exactly as given — this component never invents a
   * destination, and never renders a disabled-looking control that a caller did not pass.
   */
  action?: React.ReactNode;
}

export function StateBlock({
  state,
  title,
  description,
  icon,
  action,
  className,
  ...props
}: StateBlockProps) {
  const style = STATE_STYLES[state];
  const Icon = icon ?? style.defaultIcon;
  return (
    <div
      // `data-state` gives tests and later phases a non-visual hook for the distinction.
      data-state={state}
      className={cn(
        "flex min-h-44 flex-col items-center justify-center rounded-lg border p-6 text-center",
        style.container,
        className
      )}
      {...props}
    >
      <span className={cn("flex h-11 w-11 items-center justify-center rounded-md", style.icon)}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-4 font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}
