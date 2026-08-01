import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "focus-ring inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        outline: "border border-border bg-background hover:bg-muted",
        ghost: "hover:bg-muted",
        subtle: "bg-muted text-foreground hover:bg-muted/80",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Track-scoped action. The accent is carried by the FILL, never by the label: the three
        // track tokens are preserved as-is and Debate gold measures 2.65:1 as text on the light
        // ground, so a track-coloured label could not meet 4.5:1. The boundary uses --border, the
        // same visible edge the `outline` variant already relies on, and the label stays
        // --foreground (measured 11.09:1 at worst across all three tracks and every mode).
        // Deliberately additive and opt-in — primary actions stay `default` in every track.
        track: "border border-border bg-track/10 text-foreground hover:bg-track/20"
      },
      size: {
        sm: "h-9 px-3",
        default: "h-10 px-4",
        lg: "h-12 px-5 text-base",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  }
);

Button.displayName = "Button";
