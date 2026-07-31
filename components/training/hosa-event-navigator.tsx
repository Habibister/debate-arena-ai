"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, ArrowRight, CheckCircle2, HelpCircle, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SourceFreshnessNote } from "@/components/source/source-freshness-note";
import {
  findHosaEvents,
  hosaEventsByFamily,
  hosaEventById,
  hosaFamily,
  hosaSourceMetadata,
  hosaStatusLabel,
  presentHosaEvent,
  HOSA_FAMILIES,
  HOSA_ASSOCIATION_NOTE,
  HOSA_SUPERVISION_POLICY_NOTE,
  type HosaEventRecord
} from "@/lib/hosa-events";

// HOSA Event Navigator (M8A). Orientation and routing only.
//
// Every official value shown here is read from lib/hosa-events.ts through `presentHosaEvent`. This
// component owns NO event facts of its own — no question count, no timing, no team size, no round
// count, no equipment or room detail. If the registry does not carry a fact, nothing is rendered in
// its place: no default, no "typical" value, no value borrowed from a sibling event.
//
// It writes nothing. No mastery, progress, XP, rating, ballot, storage, or server call.

/** One labeled fact row. Rendered only when the registry actually holds the value. */
function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

/** Status is always carried by words plus an icon — never by colour alone. */
function StatusLine({ record }: { record: HosaEventRecord }) {
  const verified = presentHosaEvent(record).verified;
  const Icon = verified ? CheckCircle2 : HelpCircle;
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${verified ? "text-emerald-600" : "text-amber-600"}`} aria-hidden />
      <span>{hosaStatusLabel(verified ? record.sourceStatus : "partial")}</span>
    </p>
  );
}

function EventDetail({ record }: { record: HosaEventRecord }) {
  const { verified, facts, degraded } = presentHosaEvent(record);
  const family = hosaFamily(record.family);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-lg">{record.name}</CardTitle>
        </div>
        {family ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{family.label}</span> — CompeteReady&apos;s training grouping.{" "}
            {family.summary}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <StatusLine record={record} />

        {/* Official category is deliberately absent: HOSA's own category names are not in our
            approved source record, so the Navigator points at the guideline rather than guessing. */}
        <p className="rounded-md border bg-muted/40 p-3 text-xs leading-6 text-muted-foreground">
          CompeteReady groups events by how they are trained. For your event&apos;s{" "}
          <span className="font-medium text-foreground">official category name</span>, read the current official
          guideline for this event — we don&apos;t show a category we haven&apos;t sourced.
        </p>

        {verified ? (
          <div className="space-y-3">
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

            <div className="grid gap-2 sm:grid-cols-2">
              {facts.questionCount !== undefined ? <FactRow label="Questions" value={String(facts.questionCount)} /> : null}
              {facts.timeMinutes !== undefined ? <FactRow label="Time" value={`${facts.timeMinutes} minutes`} /> : null}
              {facts.teamSize ? <FactRow label="Team size" value={facts.teamSize} /> : null}
              {facts.rounds?.length ? <FactRow label="Rounds" value={facts.rounds.join(" → ")} /> : null}
              {facts.resultsTiming ? <FactRow label="Results" value={facts.resultsTiming} /> : null}
              {facts.equipmentNote ? <FactRow label="Equipment" value={facts.equipmentNote} /> : null}
              {facts.prejudged !== undefined ? (
                <FactRow label="Prejudged" value={facts.prejudged ? "Yes — material is submitted in advance" : "No"} />
              ) : null}
              {facts.onsite !== undefined ? <FactRow label="Onsite" value={facts.onsite ? "Yes" : "No"} /> : null}
              {facts.ratingSheetAvailable !== undefined ? (
                <FactRow label="Rating sheet" value={facts.ratingSheetAvailable ? "Published — read it before you commit" : "Not published"} />
              ) : null}
              {facts.testPlanAvailable !== undefined ? (
                <FactRow label="Test plan" value={facts.testPlanAvailable ? "Published — study by its weightings" : "Not published"} />
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">
              Only the fields shown above are verified; anything this event&apos;s guideline covers that we
              haven&apos;t sourced is simply not shown.
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] p-3">
            <p className="flex items-start gap-1.5 font-medium">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <span>CompeteReady has not yet verified the complete current structure for this event.</span>
            </p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              We know this event exists and which kind of training it takes, and that&apos;s all we&apos;re willing to say.
              We are not going to show you a question count, a time limit, a team size, a round structure, an equipment
              list, or an advancement rule that we haven&apos;t sourced. Open this event&apos;s current official guideline
              and rating sheet — check the date on the document itself — and confirm anything you need with your advisor.
              {degraded ? " (This event's record is incomplete on our side, so it is shown as unverified.)" : ""}
            </p>
          </div>
        )}

        {/* Source, season, verification date, revalidation gate and variation all come from the
            shared indicator, driven by registry metadata — never restated here. */}
        <SourceFreshnessNote metadata={hosaSourceMetadata(record)} />
        {record.associationVariation ? (
          <p className="text-xs leading-6 text-muted-foreground">{HOSA_ASSOCIATION_NOTE}</p>
        ) : null}

        {family ? (
          <div className="border-t pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Where to train</p>
            <p className="mt-1 font-medium">{family.branchLabel}</p>
            {family.branchCaution ? (
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                {family.branchCaution} {HOSA_SUPERVISION_POLICY_NOTE}
              </p>
            ) : null}
            {family.branchHref ? (
              <Link
                href={(record.routeTarget ?? family.branchHref) as Route}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Go to {family.branchLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                This branch isn&apos;t built yet. When it is, it will appear here — we won&apos;t point you at another
                event&apos;s training in the meantime.
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Shown when a direct link carries an event identifier we do not recognize. Fails closed. */
function UnknownEvent({ requestedId }: { requestedId: string }) {
  return (
    <Card className="border-amber-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
          We do not have verified details for that event yet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Nothing in our HOSA record matches <span className="font-mono text-foreground">{requestedId}</span>. Rather than
          show you another event&apos;s details, we&apos;re showing you nothing — pick your event from the list below, or
          confirm the exact name with your advisor.
        </p>
      </CardContent>
    </Card>
  );
}

export function HosaEventNavigator({
  initialEventId,
  unknownEventId
}: {
  initialEventId?: string | null;
  unknownEventId?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialEventId ?? null);

  const results = useMemo(() => findHosaEvents(query), [query]);
  const groups = useMemo(() => hosaEventsByFamily(results), [results]);
  // Resolved through the same fail-closed lookup the server used — never an index into the list.
  const selected = hosaEventById(selectedId);

  return (
    <div className="space-y-5">
      {unknownEventId ? <UnknownEvent requestedId={unknownEventId} /> : null}
      {selected ? <EventDetail record={selected} /> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Find your event</CardTitle>
          <p className="text-sm text-muted-foreground">
            HOSA is not one format. Training that is right for a terminology test is wrong for a clinical skill or an
            interview, so start from the exact event on your registration — not &ldquo;something medical.&rdquo;
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="hosa-event-search" className="text-sm font-medium">
              Search HOSA events
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="hosa-event-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Event name, or a kind of event"
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Showing the HOSA events we can currently name. This list is not the full official event roster — your
              association&apos;s current event list is.
            </p>
          </div>

          {groups.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No events match that search"
              description="Try the exact event name from your registration, or clear the search to see every event we can currently name. If your event isn't listed, we haven't sourced it yet — your advisor and the current official guideline are the authority."
            />
          ) : (
            <div className="space-y-4">
              {groups.map(({ family, events }) => (
                <div key={family.id}>
                  <h3 className="text-sm font-semibold">{family.label}</h3>
                  <p className="text-xs text-muted-foreground">{family.summary}</p>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {events.map((event) => (
                      <li key={event.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(event.id)}
                          aria-pressed={selectedId === event.id}
                          className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted ${
                            selectedId === event.id ? "border-primary bg-primary/5" : "bg-card"
                          }`}
                        >
                          <span className="block font-medium">{event.name}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{family.label}</span>
                          <span className="mt-1 block">
                            <StatusLine record={event} />
                          </span>
                          {selectedId === event.id ? <span className="sr-only">Selected</span> : null}
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

      {/* Our event list is not the official roster, and some families contain no event we can name
          yet — clinical skill events in particular. Routing by FAMILY keeps those competitors from
          being stranded without inventing an event name to hang the branch on. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Don&apos;t see your event?</CardTitle>
          <p className="text-sm text-muted-foreground">
            We can only name the events we&apos;ve sourced, and that is fewer than HOSA offers. If yours isn&apos;t listed,
            find the kind of event it is below — the training branch is the same, and your own guideline stays the
            authority on its rules.
          </p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {HOSA_FAMILIES.map((family) => (
              <li key={family.id} className="rounded-lg border bg-card p-3">
                <p className="font-medium">{family.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{family.summary}</p>
                {family.branchCaution ? (
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    {family.branchCaution} {HOSA_SUPERVISION_POLICY_NOTE}
                  </p>
                ) : null}
                {family.branchHref ? (
                  <Link
                    href={family.branchHref as Route}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    {family.branchLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {family.branchLabel} — not built yet. We won&apos;t point you at another event&apos;s training in the
                    meantime.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
