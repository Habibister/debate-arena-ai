"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AlertCircle, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// M15 Learning Architecture Slice 3 — the AI Coach's one learner surface. This component asks the
// server ONE question — "what is my evidence-backed next action?" — and renders exactly what comes
// back. The request body is a literal empty object: the client submits NO learning-state claims
// (no weaknesses, no scores, no skill), because the server derives the action from the
// authenticated user's own durable record. Every href below is server-constructed; nothing here
// decides, ranks, or invents a destination.

type CoachAction =
  | { type: "NO_DUE_ACTION" }
  | {
      type: "REVIEW_LESSON_THEN_DRILL";
      skill: { slug: string; name: string; organization: string };
      dueSinceDate: string;
      lesson: { id: string; title: string; href: string };
      drill: { label: string; href: string };
    }
  | {
      type: "REDO_EXACT_DRILL";
      skill: { slug: string; name: string; organization: string };
      dueSinceDate: string;
      drill: { label: string; href: string };
    }
  | {
      type: "EXISTING_REVIEW_DESTINATION";
      skill: { slug: string; name: string; organization: string };
      dueSinceDate: string;
      destination: { href: string; label: string };
    };

type CoachState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; action: CoachAction; explanation: string; aiNotice?: string };

export function CoachNextActionCard() {
  const [state, setState] = useState<CoachState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/ai/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });
        if (!response.ok) throw new Error(`coach request failed (${response.status})`);
        const data = (await response.json()) as { action: CoachAction; explanation: string; aiNotice?: string };
        if (!cancelled) setState({ status: "ready", action: data.action, explanation: data.explanation, aiNotice: data.aiNotice });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card aria-busy={state.status === "loading"}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          AI Coach — your next action
        </CardTitle>
      </CardHeader>
      <CardContent aria-live="polite">
        {state.status === "loading" ? (
          <p className="text-sm text-muted-foreground">Checking your review record…</p>
        ) : state.status === "error" ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            The coach could not load your next action right now. Your record is unchanged — try again later.
          </p>
        ) : (
          <div className="space-y-3">
            {state.action.type !== "NO_DUE_ACTION" ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{state.action.skill.organization.replace(/_/g, " ")}</Badge>
                <span className="text-sm font-semibold">{state.action.skill.name}</span>
                <span className="text-xs text-muted-foreground">{`Due since ${state.action.dueSinceDate}.`}</span>
              </div>
            ) : null}
            <p className="text-sm leading-6 text-muted-foreground">{state.explanation}</p>
            <div className="flex flex-col items-start gap-2">
              {state.action.type === "REVIEW_LESSON_THEN_DRILL" ? (
                <>
                  <Link href={state.action.lesson.href as Route} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                    {`Review: ${state.action.lesson.title}`}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <Link href={state.action.drill.href as Route} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                    {`Retry the ${state.action.drill.label} drill`}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </>
              ) : state.action.type === "REDO_EXACT_DRILL" ? (
                <Link href={state.action.drill.href as Route} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  {`Retry the ${state.action.drill.label} drill`}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : state.action.type === "EXISTING_REVIEW_DESTINATION" ? (
                <Link href={state.action.destination.href as Route} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  {state.action.destination.label}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>
                    Open the{" "}
                    <Link href={"/study-arcade" as Route} className="font-semibold text-primary hover:underline">
                      Study Arcade
                    </Link>{" "}
                    to choose a server-graded drill that can build durable skill evidence. This suggestion is the
                    same for everyone, not personalized.
                  </span>
                </p>
              )}
            </div>
            {state.aiNotice ? <p className="text-xs text-muted-foreground">{state.aiNotice}</p> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
