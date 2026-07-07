"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, CircleAlert, Loader2, Network, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ArgumentFlowNode, ArgumentFlowResult, ArgumentFlowStatus } from "@/lib/ai";

// Accessibility: status is conveyed by icon + TEXT LABEL + color, never color alone. Colors are
// paired with a written status word and a distinct icon shape.
const STATUS_META: Record<ArgumentFlowStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  extended: { label: "Extended", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700", Icon: CheckCircle2 },
  survived: { label: "Survived", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700", Icon: CheckCircle2 },
  abandoned: { label: "Abandoned", className: "border-red-500/40 bg-red-500/10 text-red-700", Icon: XCircle },
  unaddressed: { label: "Never addressed", className: "border-amber-500/40 bg-amber-500/10 text-amber-700", Icon: CircleAlert }
};

export function ArgumentFlow({ debateId }: { debateId: string }) {
  const [result, setResult] = useState<ArgumentFlowResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/debate/argument-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debateId })
      });
      const data = (await res.json().catch(() => ({}))) as ArgumentFlowResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not analyze this debate.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not analyze this debate.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="h-4 w-4 text-primary" aria-hidden />
            Argument flow
          </CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={analyze} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {busy ? "Analyzing..." : result ? "Re-analyze" : "Analyze argument flow"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!result ? (
          <p className="text-sm text-muted-foreground">
            Map each argument you made — claim, warrant, evidence — through the opponent&apos;s response and your defense, and see
            which ones survived, were extended, or went unaddressed.
          </p>
        ) : !result.mappable ? (
          // Honest degradation: a clear message, never an empty or fake-looking graph.
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <p className="text-sm text-amber-700">{result.reason ?? "This debate could not be mapped into an argument flow."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <ol className="space-y-3">
              {result.arguments.map((node, i) => (
                <ArgumentCard key={i} node={node} index={i + 1} />
              ))}
            </ol>
            <StatusLegend />
          </div>
        )}
        {error ? <p className="mt-3 text-sm font-semibold text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

function ArgumentCard({ node, index }: { node: ArgumentFlowNode; index: number }) {
  const meta = STATUS_META[node.status];
  const { Icon } = meta;
  return (
    <li className="rounded-lg border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Argument {index}</p>
        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${meta.className}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {meta.label}
        </span>
      </div>
      <div className="mt-2 space-y-1.5 text-sm">
        <FlowStep label="Claim" value={node.claim} />
        {node.warrant ? <FlowStep label="Warrant" value={node.warrant} /> : null}
        {node.evidence ? <FlowStep label="Evidence" value={node.evidence} /> : null}
        {node.opponentResponse ? <FlowStep label="Opponent response" value={node.opponentResponse} muted /> : null}
        {node.studentResponse ? <FlowStep label="Your response" value={node.studentResponse} /> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <Tag on={node.survived} labelOn="Survived clash" labelOff="Did not survive" />
        <Tag on={node.extended} labelOn="Extended" labelOff="Not extended" />
        <Tag on={node.weighed} labelOn="Weighed" labelOff="Not weighed" />
      </div>
    </li>
  );
}

function FlowStep({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <p className={`flex gap-2 ${muted ? "text-muted-foreground" : ""}`}>
      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span>
        <span className="font-semibold">{label}:</span> {value}
      </span>
    </p>
  );
}

function Tag({ on, labelOn, labelOff }: { on: boolean; labelOn: string; labelOff: string }) {
  return (
    <span className={`rounded px-1.5 py-0.5 font-medium ${on ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
      {on ? `✓ ${labelOn}` : `— ${labelOff}`}
    </span>
  );
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-3 border-t pt-3 text-xs text-muted-foreground">
      {(Object.keys(STATUS_META) as ArgumentFlowStatus[]).map((status) => {
        const meta = STATUS_META[status];
        const { Icon } = meta;
        return (
          <span key={status} className="inline-flex items-center gap-1">
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}
