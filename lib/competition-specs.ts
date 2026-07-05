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

// --- Rubric breakdown -------------------------------------------------------

export type RubricDescriptorItem = { level: string; description: string };

export type RubricBreakdownCategory = {
  order: number;
  name: string;
  points: number | null;
  description: string | null;
  descriptors: RubricDescriptorItem[];
  provenance: "sourced" | "placeholder";
};

export type RubricBreakdown = {
  specId: string;
  eventName: string;
  season: string;
  verificationStatus: CompetitionSpec["verificationStatus"];
  // "registry-structured" = SpecRubricCategory rows; "registry-json" = parsed from the spec's Json
  // blob (pre-migration fallback). Consumers should treat both as registry data.
  source: "registry-structured" | "registry-json";
  totalPoints: number | null;
  notes: string | null;
  categories: RubricBreakdownCategory[];
};

type RubricJsonShape = {
  totalPoints?: number | null;
  notes?: string;
  categories?: Array<{ name?: string; points?: number | null; description?: string }>;
};

function normalizeDescriptors(value: unknown): RubricDescriptorItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((d): d is { level?: unknown; description?: unknown } => Boolean(d) && typeof d === "object")
    .map((d) => ({ level: String(d.level ?? ""), description: String(d.description ?? "") }))
    .filter((d) => d.level || d.description);
}

// Structured rows win; the spec's rubric Json is the fallback so the breakdown works even before
// the SpecRubricCategory table exists in an environment.
export async function getSpecRubricBreakdown(spec: CompetitionSpec): Promise<RubricBreakdown> {
  const json = (spec.rubric ?? {}) as RubricJsonShape;
  const base: RubricBreakdown = {
    specId: spec.id,
    eventName: spec.eventName,
    season: spec.season,
    verificationStatus: spec.verificationStatus,
    source: "registry-json",
    totalPoints: typeof json.totalPoints === "number" ? json.totalPoints : null,
    notes: typeof json.notes === "string" ? json.notes : null,
    categories: (json.categories ?? []).map((category, index) => ({
      order: index + 1,
      name: String(category.name ?? `Category ${index + 1}`),
      points: typeof category.points === "number" ? category.points : null,
      description: category.description ?? null,
      descriptors: [],
      provenance: /placeholder/i.test(`${category.description ?? ""}`) ? "placeholder" : "sourced"
    }))
  };

  try {
    const rows = await prisma.specRubricCategory.findMany({
      where: { specId: spec.id },
      orderBy: { order: "asc" }
    });
    if (rows.length > 0) {
      return {
        ...base,
        source: "registry-structured",
        categories: rows.map((row) => ({
          order: row.order,
          name: row.name,
          points: row.points,
          description: row.description,
          descriptors: normalizeDescriptors(row.descriptors),
          provenance: row.provenance === "sourced" ? "sourced" : "placeholder"
        }))
      };
    }
  } catch {
    // table not pushed yet — Json fallback already prepared
  }

  return base;
}

// Judge functions and UI look up "the spec for this practice event". Practice eventType values
// (EVENT_OPTIONS) are broader than official events, so this maps only where the match is honest —
// a generic DECA ROLEPLAY is represented by the seeded series spec, clearly attributed.
const EVENT_TYPE_TO_SPEC_EVENT: Partial<Record<Organization, Record<string, string>>> = {
  DEBATE: { PUBLIC_FORUM: "Public Forum Debate" },
  DECA: { ROLEPLAY: "Hotel and Lodging Management Series", CASE_STUDY: "Hotel and Lodging Management Series" },
  HOSA: { HEALTH_SCIENCE_EVENT: "Medical Terminology" },
  MODEL_UN: { COMMITTEE_SPEECH: "General Assembly Committee Session", RESOLUTION_DEFENSE: "General Assembly Committee Session" }
};

export async function findSpecForEvent(organization: Organization, eventType?: string): Promise<CompetitionSpec | null> {
  if (eventType) {
    // An explicit event type must map to a spec honestly, or get no attribution at all — never
    // attribute (say) a Parliamentary round to the Public Forum spec just because it's the same org.
    const mapped = EVENT_TYPE_TO_SPEC_EVENT[organization]?.[eventType];
    return mapped ? getActiveSpec(organization, mapped) : null;
  }
  return getActiveSpec(organization);
}
