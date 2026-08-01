import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * PageHeader — the visual wrapper around the block every page already builds by hand: an optional
 * eyebrow, an optional row of badges, the page heading, an optional lead paragraph, and optional
 * actions.
 *
 * It is a LAYOUT component only. Deliberately, it:
 *  - does not render a heading element of its own. The caller passes the real `<h1>` (or whichever
 *    level the page needs) as `heading`, so page owners keep sole responsibility for the document
 *    outline and for there being exactly one h1.
 *  - derives no copy from the route, the track, the session or any registry.
 *  - claims nothing about a track, a status or any progress. Anything of that kind is a badge the
 *    caller passes, with the caller's own words.
 */
export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  /** The real heading element, supplied by the page. e.g. `<h1 className="page-title">DECA</h1>` */
  heading: React.ReactNode;
  /** Small uppercase label above the badges. */
  eyebrow?: string;
  /** Badges / chips. Caller-authored — this component adds none. */
  badges?: React.ReactNode;
  /** Lead paragraph under the heading. */
  description?: React.ReactNode;
  /** Actions aligned to the end on wide screens, wrapping underneath on small ones. */
  actions?: React.ReactNode;
}

export function PageHeader({
  heading,
  eyebrow,
  badges,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-6 gap-y-4", className)} {...props}>
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        {badges ? <div className={cn("flex flex-wrap items-center gap-2", eyebrow && "mt-2")}>{badges}</div> : null}
        <div className={cn((eyebrow || badges) && "mt-3")}>{heading}</div>
        {description ? (
          // max-w-2xl keeps the lead paragraph inside a readable measure on wide screens.
          <div className="mt-2 max-w-2xl text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
