import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "focus-ring flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";
