import { ClipboardCheck, ListChecks, ShieldAlert, ExternalLink } from "lucide-react";
import { RubricBreakdown } from "@/components/specs/rubric-breakdown";
import { SpecBanner } from "@/components/specs/spec-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveSpec } from "@/lib/competition-specs";
import { hosaMedTermRemediation } from "@/lib/education/hosa-medterm-practice";
import type { MedTermFocusId } from "@/lib/hosa-medterm-focus";
import { MEDTERM_AREAS } from "@/lib/hosa-medterm";
import { HosaMedTermEngine } from "@/components/training/hosa-medterm-engine";

type Stage = { order?: number; name?: string; minutes?: number | null; notes?: string };
type Penalty = { name?: string; description?: string; consequence?: string };
type AiPolicy = { allowed?: string[]; forbidden?: string[]; notes?: string; enforcedInApp?: string };
type Reference = { label?: string; url?: string };

// HOSA Medical Terminology Event Preparation Room. Reads the registry spec for the official stages,
// rules, and references, reuses SpecBanner + RubricBreakdown, then mounts the knowledge engine.
// Honest degradation: with no spec, everything is clearly labeled generic/unofficial practice.
//
// `focus` is the practice choice the page read from its `focus` query value (null when none was
// given, or it was unknown); the engine preselects it and starts nothing. The canonical area list is
// handed to the engine here, from the server, so the client component never imports the bank module.
//
// So is what the results offer for each area a learner misses questions in: the published lesson
// that teaches it, or a plain statement that no lesson does yet (lib/education/hosa-medterm-practice).
// Resolved here, once, from the registry, so the client engine imports no curriculum module. An area
// whose chain cannot be proven is left out, and the results then show the weak area alone.
export async function HosaEventPrep({ focus = null }: { focus?: MedTermFocusId | null } = {}) {
  const spec = await getActiveSpec("HOSA", "Medical Terminology");
  const official = Boolean(spec);
  const areas = MEDTERM_AREAS.map(({ id, label, description }) => ({ id, label, description }));
  const remediation = MEDTERM_AREAS.flatMap(({ id, label }) => {
    const action = hosaMedTermRemediation(id, label);
    return action ? [action] : [];
  });

  const stages = (Array.isArray(spec?.roundStructure) ? spec?.roundStructure : []) as Stage[];
  const penalties = (Array.isArray(spec?.penalties) ? spec?.penalties : []) as Penalty[];
  const aiPolicy = (spec?.aiAssistanceRestrictions ?? null) as AiPolicy | null;
  const references = (Array.isArray(spec?.officialReferences) ? spec?.officialReferences : []) as Reference[];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">HOSA</Badge>
          <Badge variant="outline">Medical Terminology</Badge>
          {official ? null : <Badge variant="outline">Unofficial practice</Badge>}
        </div>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <ClipboardCheck className="h-6 w-6 text-primary" aria-hidden />
          Event Preparation Room
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          {official
            ? "Everything you need before test day: the official format, rules, a checklist, and timed practice on original questions."
            : "No competition specification is loaded for this event, so this is generic practice — rules and format below are not official."}
        </p>
        <div className="mt-4 space-y-3">
          <SpecBanner organization="HOSA" eventName="Medical Terminology" />
          <RubricBreakdown organization="HOSA" />
        </div>
      </div>

      {official && stages.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4 text-primary" aria-hidden />
              Event stages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stages.map((stage, i) => (
              <div key={i} className="rounded-md border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {stage.order ? `${stage.order}. ` : ""}
                    {stage.name}
                  </p>
                  {typeof stage.minutes === "number" ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{stage.minutes} min</span>
                  ) : null}
                </div>
                {stage.notes ? <p className="mt-1 text-xs text-muted-foreground">{stage.notes}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {official ? (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-amber-500" aria-hidden />
              Competition-day checklist & rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {penalties.map((penalty, i) => (
                <li key={i}>
                  <span className="font-medium text-foreground">{penalty.name}:</span> {penalty.description}
                  {penalty.consequence ? ` (${penalty.consequence})` : ""}
                </li>
              ))}
              {aiPolicy?.forbidden?.length ? <li>During testing: {aiPolicy.forbidden.join("; ")}.</li> : null}
              <li>Arrive early, bring your competitor ID, and confirm your seat/section on the roster.</li>
            </ul>
            {aiPolicy?.enforcedInApp ? (
              <p className="rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground">
                <span className="font-semibold">CompeteReady integrity:</span> {aiPolicy.enforcedInApp}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <HosaMedTermEngine official={official} areas={areas} initialFocus={focus} remediation={remediation} />

      {references.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Official references:{" "}
          {references.map((ref, i) => (
            <span key={i}>
              {i > 0 ? " · " : ""}
              <a href={ref.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                {ref.label}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
