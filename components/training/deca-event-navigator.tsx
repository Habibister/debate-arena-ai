"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, ArrowRight, CheckCircle2, HelpCircle, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SourceFreshnessNote } from "@/components/source/source-freshness-note";
import { searchDecaNavigator } from "@/lib/deca-navigator-search";
import {
  decaFamiliesByScope,
  decaFamilyById,
  decaScope,
  decaSourceMetadata,
  decaStatusLabel,
  presentDecaFamily,
  DECA_ASSOCIATION_NOTE,
  DECA_DRESS_NOTE,
  DECA_OUT_OF_SCOPE_EXAMPLES,
  DECA_OUT_OF_SCOPE_NOTE,
  DECA_UNRESOLVED_SCOPE_NOTE,
  DECA_PI_RULE_NOTE,
  DECA_PROVENANCE_NOTE,
  DECA_SCAFFOLD_NOTE,
  DECA_SCOPES,
  DECA_TDM_WEIGHTING_NOTE,
  DECA_WEIGHTING_NOTE,
  type DecaFamilyRecord
} from "@/lib/deca-events";

// DECA Event Navigator (M8B). Orientation and routing only.
//
// Every official value shown here is read from lib/deca-events.ts through `presentDecaFamily`. This
// component owns NO facts of its own — no timing, no exam count, no Performance Indicator count, no
// weighting, no judge-question rule. If the registry does not carry a fact for THIS family, nothing
// renders in its place: no default, no "typical" value, and never a value borrowed from another
// family. Individual Series is not the default DECA format.
//
// It writes nothing. No mastery, progress, XP, rating, ballot, storage, or server call.

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

/** Status is always carried by words plus an icon — never by colour alone. */
function StatusLine({ record }: { record: DecaFamilyRecord }) {
  const { verified } = presentDecaFamily(record);
  const Icon = verified ? CheckCircle2 : HelpCircle;
  // M11R9: a SPAN, not a paragraph. This line renders inside the result <button>s below, and a
  // button may only contain phrasing content — `flex` gives the same layout without invalid markup.
  return (
    <span className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${verified ? "text-emerald-600" : "text-amber-600"}`} aria-hidden />
      <span>{decaStatusLabel(verified ? record.sourceStatus : record.sourceStatus === "unresolved" ? "unresolved" : "partial")}</span>
    </span>
  );
}

function FamilyDetail({ record }: { record: DecaFamilyRecord }) {
  const { verified, facts, degraded, outOfScope, unresolvedScope, hasExamComponent } = presentDecaFamily(record);
  const scope = decaScope(record.scope);
  const isTdm = record.id === "team-decision-making";

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold leading-none text-lg">
          {record.name}
          {record.abbreviation ? <span className="ml-2 text-base font-normal text-muted-foreground">({record.abbreviation})</span> : null}
        </h2>
        {scope ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{scope.label}</span> — {scope.summary}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <StatusLine record={record} />

        {/* M11R3: an UNRESOLVED family gets its own card. It previously fell through to the
            prepared/written/online banner and was shown statements of assurance, penalty points and
            page/slide limits that our record attributes to those families, not to this one. */}
        {unresolvedScope ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] p-3">
            <p className="flex items-start gap-1.5 font-medium">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <span>{DECA_UNRESOLVED_SCOPE_NOTE}</span>
            </p>
          </div>
        ) : outOfScope ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] p-3">
            <p className="flex items-start gap-1.5 font-medium">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <span>{DECA_OUT_OF_SCOPE_NOTE}</span>
            </p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              We are not going to hand you the role-play family&apos;s timing, Performance Indicator rules,
              judge-question procedure, or score-sheet categories and let you assume they apply here — they do not.
              Work from this event&apos;s current official guideline, and confirm details with your advisor.
            </p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">{DECA_OUT_OF_SCOPE_EXAMPLES}</p>
          </div>
        ) : null}

        {degraded ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs leading-6">
            This family&apos;s record is incomplete on our side, so none of its details are shown. Use the current
            official guideline for your event.
          </p>
        ) : null}

        {/* Facts render one by one, only where the registry holds them for THIS family. */}
        <div className="grid gap-2 sm:grid-cols-2">
          {facts.examQuestionCount !== undefined ? <FactRow label="Exam" value={`${facts.examQuestionCount} questions`} /> : null}
          {facts.preparationMinutes !== undefined ? <FactRow label="Preparation" value={`${facts.preparationMinutes} minutes`} /> : null}
          {facts.rolePlayMinutes !== undefined ? <FactRow label="Role-play" value={`Up to ${facts.rolePlayMinutes} minutes`} /> : null}
          {facts.presentationMinutes !== undefined ? <FactRow label="Presentation" value={`${facts.presentationMinutes} minutes`} /> : null}
          {facts.participantStructure ? <FactRow label="Participants" value={facts.participantStructure} /> : null}
          {facts.bothMembersMustSpeak ? <FactRow label="Speaking" value="Both members must speak." /> : null}
          {facts.examCombinationNote ? <FactRow label="Exams" value={facts.examCombinationNote} /> : null}
        </div>

        {record.components?.length ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Components</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {record.components.map((c) => (
                <li key={c.type} className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium">
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {facts.eligibilityNote ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eligibility</p>
            <p className="mt-1 leading-6">{facts.eligibilityNote}</p>
          </div>
        ) : null}

        {facts.judgeQuestionFlow ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Judge questions</p>
            <p className="mt-1 leading-6">{facts.judgeQuestionFlow}</p>
          </div>
        ) : null}

        {facts.performanceIndicatorNote ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Performance Indicators</p>
            <p className="mt-1 leading-6">{facts.performanceIndicatorNote}</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">{DECA_PI_RULE_NOTE}</p>
          </div>
        ) : null}

        {facts.preparationMaterialsNote || facts.visualAidNote ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Materials</p>
            {facts.preparationMaterialsNote ? <p className="mt-1 leading-6">{facts.preparationMaterialsNote}</p> : null}
            {facts.visualAidNote ? <p className="mt-1 leading-6">{facts.visualAidNote}</p> : null}
          </div>
        ) : null}

        {/* Weighting: a qualitative note where sourced, and an explicit refusal of any figure.
            M11R10: shown ONLY where this family's own record establishes that an exam applies. On a
            family whose exam we could not establish, an "Exam weighting" heading plus "we do not
            show a figure" asserts an exam exists and implies we merely withheld the number. Those
            families carry their unresolved exam entry in "Not shown, and why" below instead. */}
        {hasExamComponent ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exam weighting</p>
            {facts.examWeightingNote ? <p className="mt-1 leading-6">{facts.examWeightingNote}</p> : null}
            <p className="mt-1 text-xs leading-6 text-muted-foreground">{isTdm ? DECA_TDM_WEIGHTING_NOTE : DECA_WEIGHTING_NOTE}</p>
          </div>
        ) : null}

        {record.unresolvedFields?.length ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Not shown, and why</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-6 text-muted-foreground">
              {record.unresolvedFields.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Source, season, verification date and variation all come from the shared indicator,
            driven by registry metadata — never restated here. */}
        <SourceFreshnessNote metadata={decaSourceMetadata(record)} />
        {record.associationVariation ? (
          <p className="text-xs leading-6 text-muted-foreground">{DECA_ASSOCIATION_NOTE}</p>
        ) : null}

        <p className="text-xs leading-6 text-muted-foreground">{DECA_DRESS_NOTE}</p>

        {record.routeTarget ? (
          <div className="border-t pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Where to train</p>
            {outOfScope ? (
              <>
                <p className="mt-1 leading-6">
                  We have no lesson for this family. The DECA hub has what we do offer — nothing there claims to cover
                  this event.
                </p>
                <Link
                  href={record.routeTarget as Route}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Go to the DECA hub
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </>
            ) : (
              <>
                <p className="mt-1 leading-6">How a DECA Role-Play Works — the sequence this family runs on.</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">{DECA_SCAFFOLD_NOTE}</p>
                <Link
                  href={record.routeTarget as Route}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Go to the role-play lesson
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </>
            )}
          </div>
        ) : null}

        {/* M11R1: no DECA family is displayable as verified, because the approved record supplies no
            season, document version or source label. The facts above are still ours to show; the
            provenance behind them is not something we can attest, and this says so. */}
        <p className="text-xs text-muted-foreground">{DECA_PROVENANCE_NOTE}</p>
      </CardContent>
    </Card>
  );
}

/** Shown when a direct link carries a family identifier we do not recognize. Fails closed. */
function UnknownFamily({ requestedId }: { requestedId: string }) {
  return (
    <Card className="border-amber-500/30">
      <CardHeader>
        <h2 className="flex items-center gap-2 font-semibold leading-none text-base">
          <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
          We do not have verified details for that event family yet
        </h2>
      </CardHeader>
      <CardContent className="text-sm">
        <p className="text-muted-foreground">
          Nothing in our DECA record matches <span className="font-mono text-foreground">{requestedId}</span>. Rather than
          show you another family&apos;s rules — which really would be wrong for your event — we&apos;re showing you
          nothing. Pick your family below, or confirm it against your current official guideline.
        </p>
      </CardContent>
    </Card>
  );
}

export function DecaEventNavigator({
  initialFamilyId,
  unknownFamilyId
}: {
  initialFamilyId?: string | null;
  unknownFamilyId?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialFamilyId ?? null);

  // One search, three kinds of answer: families (unchanged), the events we hold a page for, and the
  // practice-test clusters. Each is rendered under its own heading and its own truthful description,
  // so finding something can never be read as more support than it is.
  const results = useMemo(() => searchDecaNavigator(query), [query]);
  const groups = useMemo(() => decaFamiliesByScope(results.families), [results.families]);
  const hasAnyMatch = groups.length > 0 || results.events.length > 0 || results.clusters.length > 0;
  // Resolved through the same fail-closed lookup the server used — never an index into the list.
  const selected = decaFamilyById(selectedId);

  return (
    <div className="space-y-5">
      {unknownFamilyId ? <UnknownFamily requestedId={unknownFamilyId} /> : null}
      {selected ? <FamilyDetail record={selected} /> : null}

      <Card>
        <CardHeader>
          <h2 className="font-semibold leading-none text-base">Find your event family</h2>
          <p className="text-sm text-muted-foreground">
            DECA&apos;s families run on different rules. Timing, Performance Indicator counts, exam structure, and when
            the judge may ask questions all change between them — so a formula learned for one family is wrong for
            another. Start from the family on your registration.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="deca-family-search" className="text-sm font-medium">
              Search DECA families, events and practice clusters
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="deca-family-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Family, event name, abbreviation, or cluster"
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              The families below are not a list of every DECA event, and searching an event name finds one only where we
              already hold a page for it. Your association&apos;s current event list is the authority on what it offers.
            </p>
          </div>

          {/* Events we hold a page for. A row here means exactly one thing: this event has a page.
              Its season, verification date and any partial-verification state live on that page,
              taken from the record — never restated here, and never upgraded by a search match. */}
          {results.events.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold">Events we hold a page for</h3>
              <p className="text-xs text-muted-foreground">
                Our DECA record is family-level. These are the individual events we also hold a page for — open one to see
                whatever our record holds for it. Holding a page is not itself evidence that an event is sourced, and where
                an event does carry its own sourced guidelines, that says nothing about the rest of its family.
              </p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {results.events.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/training/deca/event/${event.id}` as Route}
                      className="focus-ring block rounded-lg border bg-card p-3 transition-colors hover:bg-muted"
                    >
                      <span className="block font-medium">
                        {event.displayName}
                        {event.code ? ` (${event.code})` : ""}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{event.name}</span>
                      <span className="mt-1 block text-xs font-semibold text-primary">Open its Event HQ page</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Practice-test clusters. CompeteReady practice, stated as such — not a DECA exam and not
              a claim that the cluster names an event we support. */}
          {results.clusters.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold">Practice-test clusters</h3>
              <p className="text-xs text-muted-foreground">
                Clusters you can generate CompeteReady practice questions for. These are our own practice sets, not an
                official DECA exam, and matching one here does not identify your event. Practice tests carry their own
                cluster selector — pick yours there.
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {results.clusters.map((cluster) => (
                  <li key={cluster}>
                    <Link
                      href={"/tests?track=deca" as Route}
                      className="focus-ring inline-flex min-h-11 items-center rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      {cluster}
                      <span className="ml-2 text-xs font-semibold text-primary">Open practice tests</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!hasAnyMatch ? (
            <EmptyState
              icon={Search}
              title="Nothing in our DECA record matches that search"
              description="Try the family name or its abbreviation, an event name we hold a page for, or a practice-test cluster — or clear the search to see every family. Our record is family-level, so an event we do not hold a page for will not appear here even when DECA offers it; your current official guideline names its family."
            />
          ) : groups.length === 0 ? null : (
            <div className="space-y-4">
              {/* M11R7: the scope headings below (role-play / prepared / written / online) are OURS — a
                  training sort, not DECA's published taxonomy. Say so where the learner is browsing.
                  It sits INSIDE the family block, so it describes the headings it is about and not the
                  event or cluster groups above, which name their own provenance. */}
              <p className="rounded-md border bg-muted/40 p-3 text-xs leading-6 text-muted-foreground">
                The headings below are{" "}
                <span className="font-medium text-foreground">CompeteReady training groups</span> — we sort families by
                how they are trained, not by DECA&apos;s own classification. Your current official event guideline controls
                your event&apos;s official classification and its requirements.
              </p>
              {groups.map(({ scope, families }) => (
                <div key={scope.id}>
                  <h3 className="text-sm font-semibold">{scope.label}</h3>
                  <p className="text-xs text-muted-foreground">{scope.summary}</p>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {families.map((family) => (
                      <li key={family.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(family.id)}
                          aria-pressed={selectedId === family.id}
                          className={`focus-ring w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted ${
                            selectedId === family.id ? "border-primary bg-primary/5" : "bg-card"
                          }`}
                        >
                          <span className="block font-medium">
                            {family.name}
                            {family.abbreviation ? ` (${family.abbreviation})` : ""}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{scope.label}</span>
                          <span className="mt-1 block">
                            <StatusLine record={family} />
                          </span>
                          {selectedId === family.id ? <span className="sr-only">Selected</span> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold leading-none text-base">What each scope means</h2>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {DECA_SCOPES.map((scope) => (
              <li key={scope.id} className="rounded-lg border bg-card p-3">
                <p className="font-medium">{scope.label}</p>
                <p className="mt-0.5 text-muted-foreground">{scope.summary}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
