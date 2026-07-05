import type { CompetitionSpec, Organization } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Server-side reads for the Competition Specification Registry. Every lookup is defensive: if the
// registry table does not exist yet (fresh environment before `db push`) or the query fails, pages
// render without a spec banner instead of crashing — the registry must never take down training.

export async function getActiveSpec(organization: Organization, eventName?: string): Promise<CompetitionSpec | null> {
  try {
    return await prisma.competitionSpec.findFirst({
      where: { organization, isActive: true, ...(eventName ? { eventName } : {}) },
      orderBy: [{ season: "desc" }, { version: "desc" }]
    });
  } catch {
    return null;
  }
}

export async function getActiveSpecs(organization?: Organization): Promise<CompetitionSpec[]> {
  try {
    return await prisma.competitionSpec.findMany({
      where: { isActive: true, ...(organization ? { organization } : {}) },
      orderBy: [{ organization: "asc" }, { season: "desc" }, { version: "desc" }]
    });
  } catch {
    return [];
  }
}

export function specAttribution(spec: CompetitionSpec): string {
  const org = spec.organization.replace(/_/g, " ");
  const verified = spec.lastVerifiedAt
    ? ` — last verified ${spec.lastVerifiedAt.toISOString().slice(0, 10)}`
    : " — not yet verified";
  return `Using ${org} ${spec.season} guidelines${verified}`;
}
