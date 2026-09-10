import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * Select — the native `<select>`, wearing the Input primitive's vocabulary (DESIGN F1).
 *
 * Twenty raw selects existed with five different class strings and no shared height, focus or
 * disabled treatment. This is the one control they migrate to, surface by surface. It is a real native
 * select: keyboard, screen-reader and mobile behaviour come from the platform, not from a rebuilt menu.
 *
 * The 44px height, the focus ring, the surface fill and the disabled/invalid states are the Input's
 * own, so a select and a text field in the same form read as one control family.
 */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  return (
    <span className="relative block">
      <select
        ref={ref}
        className={cn(
          "focus-ring flex h-11 w-full appearance-none rounded-md border border-input bg-surface-interactive pl-3 pr-9 text-sm text-surface-interactive-foreground",
          "disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {/* Decorative only: the native control carries the semantics, the chevron just says "this opens". */}
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </span>
  );
});

Select.displayName = "Select";

export interface SelectFieldProps extends SelectProps {
  /** The control's id — required, because the label is associated through it and nothing is guessed. */
  id: string;
  /** Visible label text. Always rendered as a real <label htmlFor={id}>. */
  label: React.ReactNode;
  /** Optional help text, associated through aria-describedby. */
  help?: React.ReactNode;
  /** Optional error text. Sets aria-invalid on the control and is associated the same way. */
  error?: React.ReactNode;
  /** Appends the Label primitive's "(optional)" note. */
  optional?: boolean;
}

/**
 * SelectField — a labelled Select with the association wired for you. The label is a visible
 * `<label htmlFor>`, help and error text are announced through `aria-describedby`, and an error also
 * marks the control invalid — in words and attributes, never by colour alone.
 */
export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ id, label, help, error, optional, className, ...props }, ref) => {
    const helpId = help ? `${id}-help` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
    return (
      <div className={cn("block", className)}>
        <Label htmlFor={id} optional={optional} className="mb-1">
          {label}
        </Label>
        <Select ref={ref} id={id} aria-describedby={describedBy} aria-invalid={error ? true : undefined} {...props} />
        {help ? (
          <p id={helpId} className="mt-1 text-xs leading-5 text-muted-foreground">
            {help}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} className="mt-1 text-xs font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);

SelectField.displayName = "SelectField";
