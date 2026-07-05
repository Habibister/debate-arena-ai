import { Scale } from "lucide-react";
import type { Organization } from "@prisma/client";
import { findSpecForEvent, getSpecRubricBreakdown } from "@/lib/competition-specs";

// Registry-backed rubric display: categories, point values, and descriptors for the active
// competition spec, with per-category provenance badges. Reusable on debate/DECA/HOSA pages.
// Renders nothing when no spec exists so it is always safe to mount.
export async function RubricBreakdown({ organization, eventType }: { organization: Organization; eventType?: string }) {
  const spec = await findSpecForEvent(organization, eventType);
  if (!spec) {
    return null;
  }
  const breakdown = await getSpecRubricBreakdown(spec);
  if (breakdown.categories.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Scale className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold">
          Official rubric — {breakdown.eventName} ({breakdown.season})
        </h2>
        {breakdown.totalPoints ? (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{breakdown.totalPoints} points total</span>
        ) : null}
      </div>
      <ul className="mt-3 space-y-2">
        {breakdown.categories.map((category) => (
          <li key={category.order} className="rounded-md border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{category.name}</p>
              <div className="flex items-center gap-2">
                {category.points !== null ? (
                  <span className="text-sm font-bold text-primary">{category.points} pts</span>
                ) : (
                  <span className="text-xs text-muted-foreground">holistic</span>
                )}
                {category.provenance === "placeholder" ? (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600">
                    needs verification
                  </span>
                ) : null}
              </div>
            </div>
            {category.description ? <p className="mt-1 text-xs text-muted-foreground">{category.description}</p> : null}
            {category.descriptors.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {category.descriptors.map((descriptor) => (
                  <li key={descriptor.level} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{descriptor.level}:</span> {descriptor.description}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      {breakdown.notes ? <p className="mt-3 text-xs text-muted-foreground">{breakdown.notes}</p> : null}
    </div>
  );
}
