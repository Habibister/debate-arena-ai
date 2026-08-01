import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Label — a real `<label>`, nothing more.
 *
 * The project's existing fields already pair a visible `<label htmlFor>` with an `id`; this gives
 * that pairing one shared treatment instead of a hand-written class string per form.
 *
 * Deliberately NOT supported: floating labels and placeholder-as-label. Both hide the field's name
 * once typing starts, and the placeholder variant never exposes a name to assistive technology at
 * all. A label here is always visible text next to its control.
 *
 * `htmlFor` is a native attribute and is simply passed through — this component never generates or
 * guesses an id, so a caller cannot accidentally end up with a label pointing at nothing.
 */
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Appends a visible "(optional)" note. Optionality is stated in words, never by colour. */
  optional?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, optional, children, ...props }, ref) => {
    return (
      <label ref={ref} className={cn("block text-sm font-medium text-foreground", className)} {...props}>
        {children}
        {optional ? <span className="ml-1 font-normal text-muted-foreground">(optional)</span> : null}
      </label>
    );
  }
);

Label.displayName = "Label";
