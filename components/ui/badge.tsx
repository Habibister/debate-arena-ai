import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Base string is unchanged: an existing caller that already spaces its own icon (`mr-1`) must not
// suddenly gain a second gap.
const badgeVariants = cva("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-primary/10 text-primary",
      secondary: "bg-secondary/10 text-secondary",
      accent: "bg-accent/10 text-accent",
      outline: "border border-border text-muted-foreground",
      // ---- Semantic state variants (M12B) ----------------------------------------------------
      // Every one of these is a tint of its own semantic token, measured against the surfaces it
      // sits on in all six modes. A badge is a LABEL: the word inside it always states the state,
      // so the colour is redundant reinforcement, never the message.
      success: "bg-success/10 text-success",
      warning: "bg-warning/10 text-warning",
      info: "bg-info/10 text-info",
      locked: "bg-locked/10 text-locked",
      unavailable: "border border-dashed border-unavailable/50 bg-unavailable/10 text-unavailable",
      // Track-scoped label. Like the Button `track` variant, the accent is the fill and the edge —
      // never the text — because the preserved Debate gold measures 2.65:1 as text on light.
      track: "border border-border bg-track/10 text-foreground",
      // AI disclosure. Deliberately the same weight and size as every other badge: an AI label is
      // never de-emphasised, and the caller must still put the words in the badge.
      "ai-generated": "border border-info/40 bg-info/10 text-info"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
