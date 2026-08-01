import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Surface elevation (M12B). Four restrained levels, border-led:
//   level 0  the page ground itself (`bg-background`) — no class needed
//   level 1  a raised card: border + the existing `shadow-sm` — this is the DEFAULT, unchanged
//   level 2  an interactive / hovered surface: adds `shadow-raised`
//   level 3  an overlay: `shadow-overlay` (for dialogs and sheets; not a Card tone)
// `tone` is additive and optional. Omitting it produces exactly the classes Card produced before,
// so every existing caller is untouched.
export const cardVariants = cva("rounded-lg border bg-card text-card-foreground", {
  variants: {
    tone: {
      /** Level 1 — the unchanged default. */
      raised: "shadow-sm",
      /** Level 1 without the shadow, for a card nested inside another card. */
      flat: "",
      /** Level 2 — a card that is itself a control or a hover target. */
      interactive: "shadow-raised transition-colors hover:bg-surface-interactive",
      /** Level 1 with a track-scoped edge. The accent reinforces; it never carries meaning alone. */
      accent: "border-track/40 bg-track/5 shadow-sm"
    }
  },
  defaultVariants: {
    tone: "raised"
  }
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, tone, ...props }: CardProps) {
  return <div className={cn(cardVariants({ tone }), className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold leading-none", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-5 pt-0", className)} {...props} />;
}
