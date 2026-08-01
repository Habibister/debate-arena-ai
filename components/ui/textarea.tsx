import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // Same contract as Input: min-height, focus utility and native props unchanged; only the
        // fill becomes semantic and the disabled / aria-invalid states become visible.
        "focus-ring flex min-h-32 w-full rounded-md border border-input bg-surface-interactive px-3 py-3 text-sm text-surface-interactive-foreground placeholder:text-muted-foreground",
        "disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";
