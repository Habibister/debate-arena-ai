import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  HelpCircle,
  Info,
  Lock,
  ShieldCheck,
  Sparkles,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * StatusChip — one small, readable statement of a state.
 *
 * The state is ALWAYS the caller's to declare. This component infers nothing: it does not look at a
 * registry, a date, a score or a source to decide whether something is verified, and it never
 * upgrades `partial` to `verified` on its own.
 *
 * Accessibility contract:
 *  - the label is visible text, never a colour and never a tooltip
 *  - the icon is decorative reinforcement and is always aria-hidden
 *  - `unavailable` and `coming-soon` additionally differ in BORDER STYLE (dashed), so the two
 *    states remain distinguishable without hue
 *  - nothing here is interactive, so it can sit safely inside a button or a link
 */
const chipVariants = cva(
  "inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold leading-5",
  {
    variants: {
      variant: {
        neutral: "border border-border text-muted-foreground",
        // Track-scoped: accent on the fill, label in --foreground (the preserved Debate gold
        // measures 2.65:1 as text on the light ground, so it is never used as text).
        track: "border border-border bg-track/10 text-foreground",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        info: "bg-info/10 text-info",
        locked: "bg-locked/10 text-locked",
        unavailable: "border border-dashed border-unavailable/60 bg-unavailable/10 text-unavailable",
        "coming-soon": "border border-dashed border-border text-muted-foreground",
        verified: "bg-success/10 text-success",
        partial: "bg-warning/10 text-warning",
        unverified: "border border-dashed border-warning/60 bg-warning/10 text-warning",
        "ai-generated": "border border-info/40 bg-info/10 text-info"
      }
    },
    defaultVariants: { variant: "neutral" }
  }
);

/** Default reinforcement icon per state. A caller may override it, or drop it with `icon={null}`. */
const DEFAULT_ICON: Record<NonNullable<ChipVariant>, LucideIcon> = {
  neutral: Info,
  track: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  locked: Lock,
  unavailable: CircleDashed,
  "coming-soon": Clock,
  verified: ShieldCheck,
  partial: HelpCircle,
  unverified: AlertTriangle,
  "ai-generated": Sparkles
};

type ChipVariant = VariantProps<typeof chipVariants>["variant"];

export interface StatusChipProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children">,
    VariantProps<typeof chipVariants> {
  /** The state, in words. Required — a chip with no readable label is not a status. */
  children: React.ReactNode;
  /** Override the reinforcement icon, or pass `null` for none. Always rendered aria-hidden. */
  icon?: LucideIcon | null;
}

export function StatusChip({ className, variant, icon, children, ...props }: StatusChipProps) {
  const Icon = icon === null ? null : (icon ?? DEFAULT_ICON[variant ?? "neutral"]);
  return (
    // A <span> with phrasing content only, so a chip may legally appear inside a <button>.
    <span className={cn(chipVariants({ variant }), className)} {...props}>
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
      <span className="min-w-0">{children}</span>
    </span>
  );
}
