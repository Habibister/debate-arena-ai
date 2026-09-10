import { ShieldCheck, ShieldAlert } from "lucide-react";
import type { Organization } from "@prisma/client";
import { getActiveSpec, specAttribution } from "@/lib/competition-specs";
import { HOSA_REVALIDATION_DUE_ON } from "@/lib/hosa-events";
import { revalidationIsDue } from "@/lib/source-freshness";

// "Using [Org] [Season] guidelines — last verified [date]" attribution, sourced from the
// Competition Specification Registry. Renders nothing when no spec exists for the organization
// (including environments where the registry table has not been pushed yet), so it can be placed
// on any page without a failure mode.
export async function SpecBanner({ organization, eventName }: { organization: Organization; eventName?: string }) {
  const spec = await getActiveSpec(organization, eventName);
  if (!spec) {
    return null;
  }

  const verified = spec.verificationStatus === "VERIFIED";
  const Icon = verified ? ShieldCheck : ShieldAlert;

  // HOSA H2 — "Using [Org] [Season] guidelines — last verified [date]" reads as the document in force,
  // and until now nothing noticed when the record's own stated re-check date had gone by. The HOSA
  // record says its revalidation was expected after September 1, 2026 and was verified in July, so a
  // re-check is owed. The verification stays on the banner exactly as before: this adds the second
  // half of the truth, it does not withdraw the first, and it makes no claim about what any newer
  // document says. Scoped to HOSA because HOSA is the record that states a date.
  const revalidationDue =
    spec.organization === "HOSA" &&
    revalidationIsDue({
      dueOn: HOSA_REVALIDATION_DUE_ON,
      lastVerifiedAt: spec.lastVerifiedAt ? spec.lastVerifiedAt.toISOString().slice(0, 10) : null,
      now: new Date()
    });

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <Icon className={`h-3.5 w-3.5 ${verified ? "text-primary" : "text-amber-500"}`} aria-hidden />
      <span>
        {specAttribution(spec)}
        {spec.eventCode ? ` · ${spec.eventName} (${spec.eventCode})` : ` · ${spec.eventName}`}
      </span>
      {!verified ? (
        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-600">
          {spec.verificationStatus === "PARTIALLY_VERIFIED" ? "partially verified" : "unverified draft"}
        </span>
      ) : null}
      {revalidationDue ? (
        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-600">revalidation due</span>
      ) : null}
    </div>
  );
}
