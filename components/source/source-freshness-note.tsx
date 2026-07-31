import { AlertTriangle, HelpCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { presentSourceFreshness, type SourceFreshnessMetadata } from "@/lib/source-freshness";

// Shared source / provenance / freshness indicator (M9).
//
// Renders ONLY what `presentSourceFreshness` allows. This component owns no source label, no
// season, no verification date, no revalidation trigger and no variation wording — if the decision
// layer returns null for a line, nothing renders in its place.
//
// Deliberately NOT a client component and NOT a tooltip: essential source information is visible
// text in the document, so it survives keyboard-only use, screen readers, print, and small screens.
// There is no live region — this content never updates in place, so announcing it would be noise.
//
// It writes nothing and fetches nothing.

/**
 * @param metadata  Supplied by a registry or lesson record — never assembled in a component.
 * @param compact   Drops the secondary detail lines, for dense list contexts.
 */
export function SourceFreshnessNote({
  metadata,
  compact = false,
  className
}: {
  metadata: SourceFreshnessMetadata;
  compact?: boolean;
  className?: string;
}) {
  const view = presentSourceFreshness(metadata);
  // Icon is a redundant cue only: every state is fully readable from its words alone.
  const Icon = view.tone === "verified" ? ShieldCheck : view.authority === "official" ? ShieldAlert : HelpCircle;
  const iconTone = view.tone === "verified" ? "text-emerald-600" : "text-amber-600";

  const details = [view.freshnessLabel, view.verifiedLabel, view.sourceLabel].filter(Boolean) as string[];

  return (
    <div className={`rounded-md border bg-muted/40 p-3 text-xs leading-6 text-muted-foreground ${className ?? ""}`}>
      <p className="flex items-start gap-1.5 font-medium text-foreground">
        <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${iconTone}`} aria-hidden />
        <span>{view.authorityLabel}</span>
      </p>

      {details.length > 0 ? (
        // A plain list, so the relationship between source, season and date is explicit rather than
        // implied by punctuation.
        <ul className="mt-1.5 space-y-0.5">
          {details.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      {!compact && view.revalidationLabel ? (
        <p className="mt-1.5 flex items-start gap-1.5">
          <ShieldAlert className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
          <span>
            {view.revalidationLabel}
            {view.revalidationNote ? <span className="mt-0.5 block">{view.revalidationNote}</span> : null}
          </span>
        </p>
      ) : null}

      {!compact && view.variationLabels.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5">
          {view.variationLabels.map((label) => (
            <li key={label} className="flex items-start gap-1.5">
              <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {!compact && view.degraded ? (
        <p className="mt-1.5">
          Part of this record&apos;s source information is missing on our side, so we&apos;ve shown less rather than
          filling in the gap.
        </p>
      ) : null}
    </div>
  );
}
