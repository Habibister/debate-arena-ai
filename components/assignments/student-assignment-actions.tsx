"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { CheckCircle2, Loader2, Play, Send } from "lucide-react";
import { ASSIGNMENT_TYPE_META, assignmentStatusLabel } from "@/lib/assignment-types";
import type { AssignmentStatus, AssignmentType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type EvidenceOption = {
  id: string;
  label: string;
  detail: string;
};

type StudentAssignmentActionsProps = {
  assignmentId: string;
  type: AssignmentType;
  status: AssignmentStatus;
  evidenceOptions: EvidenceOption[];
  manualReflectionAllowed: boolean;
};

export function StudentAssignmentActions({
  assignmentId,
  type,
  status,
  evidenceOptions,
  manualReflectionAllowed
}: StudentAssignmentActionsProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(evidenceOptions[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const completed = status === "COMPLETED";
  const requiresEvidenceChoice = !manualReflectionAllowed;

  async function startAssignment() {
    setError(null);
    setIsStarting(true);

    try {
      const response = await fetch(`/api/assignments/${assignmentId}/start`, { method: "POST" });
      const result = (await response.json().catch(() => ({}))) as { launchPath?: string; error?: string };

      if (!response.ok || !result.launchPath) {
        throw new Error(result.error ?? "Could not start this assignment. Please try again.");
      }

      router.push(result.launchPath as Route);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not start this assignment. Please try again.");
    } finally {
      setIsStarting(false);
    }
  }

  async function submitAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceType: manualReflectionAllowed ? "MANUAL_REFLECTION" : undefined,
          evidenceId: manualReflectionAllowed ? assignmentId : selectedEvidenceId,
          notes
        })
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not submit this assignment. Please check the evidence and try again.");
      }

      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not submit this assignment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Your status</p>
        <p className="mt-1 text-lg font-bold">{assignmentStatusLabel(status)}</p>
      </div>

      {completed ? (
        <div className="flex items-start gap-3 rounded-md border bg-secondary/10 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-secondary" aria-hidden />
          <p className="leading-6">This assignment is complete. Your coach can see the submitted evidence and completion time.</p>
        </div>
      ) : (
        <>
          <Button type="button" onClick={startAssignment} disabled={isStarting}>
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
            {status === "IN_PROGRESS" ? "Continue activity" : "Start activity"}
          </Button>

          <form onSubmit={submitAssignment} className="space-y-3 border-t pt-4">
            <div>
              <p className="text-sm font-semibold">Submit completed work</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{ASSIGNMENT_TYPE_META[type].evidenceLabel}</p>
            </div>

            {manualReflectionAllowed ? (
              <div>
                <label htmlFor="notes" className="text-sm font-semibold">
                  Reflection
                </label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Tell your coach what you completed, what you reviewed, and one thing you still need to practice."
                  className="mt-2 min-h-28"
                  required
                />
              </div>
            ) : evidenceOptions.length > 0 ? (
              <>
                <div>
                  <label htmlFor="evidence" className="text-sm font-semibold">
                    Completed activity
                  </label>
                  <select
                    id="evidence"
                    value={selectedEvidenceId}
                    onChange={(event) => setSelectedEvidenceId(event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    required
                  >
                    {evidenceOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label} — {option.detail}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="notes" className="text-sm font-semibold">
                    Notes <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Add a note for your coach."
                    className="mt-2"
                  />
                </div>
              </>
            ) : (
              <p className="rounded-md border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
                No matching completed activity is available yet. Start the assignment, finish the required activity, then return here to submit it.
              </p>
            )}

            {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p> : null}

            <Button type="submit" variant="secondary" disabled={isSubmitting || (requiresEvidenceChoice && evidenceOptions.length === 0)}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
              Submit assignment
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
