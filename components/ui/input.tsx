import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        // Height, focus utility and native props are unchanged. The fill moves from --background to
        // the semantic --surface-interactive so a field reads as an editable surface on both grounds
        // and inside a card; the disabled and aria-invalid treatments make states that already
        // existed in the DOM visible, without changing any behaviour.
        "focus-ring flex h-11 w-full rounded-md border border-input bg-surface-interactive px-3 text-sm text-surface-interactive-foreground placeholder:text-muted-foreground",
        "disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";
