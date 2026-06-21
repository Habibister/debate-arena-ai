"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { AssignmentType, Organization } from "@prisma/client";
import { Loader2, Send } from "lucide-react";
import { ASSIGNMENT_TYPE_META, assignmentTypeLabel } from "@/lib/assignment-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type TeamOption = {
  id: string;
  name: string;
  organization: Organization;
  members: Array<{
    user: {
      id: string;
      displayName: string | null;
      name: string | null;
      username: string | null;
    };
  }>;
};

type ContentOption = {
  id: string;
  label: string;
  description: string;
};

const assignmentTypes = Object.keys(ASSIGNMENT_TYPE_META) as AssignmentType[];

export function CreateAssignmentForm({
  teams,
  decks,
  lessons
}: {
  teams: TeamOption[];
  decks: ContentOption[];
  lessons: ContentOption[];
}) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [type, setType] = useState<AssignmentType>("DEBATE_ROUND");
  const [targetAllTeam, setTargetAllTeam] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedTeam = teams.find((team) => team.id === teamId);
  const targetOptions = useMemo(() => {
    if (type === "FLASHCARD_DECK" || type === "REVIEW_GAME") {
      return decks;
    }
    if (type === "LESSON") {
      return lessons;
    }
    return [];
  }, [decks, lessons, type]);
  const requiresTarget = ASSIGNMENT_TYPE_META[type].requiresTarget;

  function toggleStudent(studentId: string) {
    setSelectedStudents((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      teamId,
      type,
      title: formData.get("title")?.toString() ?? "",
      instructions: formData.get("instructions")?.toString() ?? "",
      dueDate: formData.get("dueDate")?.toString() ?? "",
      targetAllTeam,
      studentIds: targetAllTeam ? [] : selectedStudents,
      targetId: requiresTarget ? targetId : null,
      points: null
    };

    try {
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json().catch(() => ({}))) as { assignment?: { id: string }; error?: string };

      if (!response.ok || !result.assignment?.id) {
        throw new Error(result.error ?? "Could not create this assignment. Please check the form and try again.");
      }

      router.push(`/coach/assignments/${result.assignment.id}` as Route);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create this assignment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Assignment details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold" htmlFor="teamId">
                Team
              </label>
              <select
                id="teamId"
                value={teamId}
                onChange={(event) => {
                  setTeamId(event.target.value);
                  setSelectedStudents([]);
                }}
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                required
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.organization.replace("_", " ")})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="type">
                Assignment type
              </label>
              <select
                id="type"
                value={type}
                onChange={(event) => {
                  setType(event.target.value as AssignmentType);
                  setTargetId("");
                }}
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {assignmentTypes.map((option) => (
                  <option key={option} value={option}>
                    {assignmentTypeLabel(option)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="rounded-md border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">{ASSIGNMENT_TYPE_META[type].description}</p>

          <div>
            <label className="text-sm font-semibold" htmlFor="title">
              Title
            </label>
            <Input id="title" name="title" placeholder="Practice Rebuttal Drill" required className="mt-2" />
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor="instructions">
              Instructions
            </label>
            <Textarea
              id="instructions"
              name="instructions"
              placeholder="Complete the activity and submit the evidence requested below."
              required
              className="mt-2 min-h-28"
            />
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor="dueDate">
              Due date <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input id="dueDate" name="dueDate" type="datetime-local" className="mt-2" />
          </div>

          {requiresTarget ? (
            <div>
              <label className="text-sm font-semibold" htmlFor="targetId">
                Existing content
              </label>
              <select
                id="targetId"
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                required
              >
                <option value="">Choose content</option>
                {targetOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} — {option.description}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign to students</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-md border bg-background p-3">
              <input type="radio" checked={targetAllTeam} onChange={() => setTargetAllTeam(true)} />
              <span>
                <span className="block font-semibold">Entire team</span>
                <span className="block text-xs text-muted-foreground">All active student members in this team.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-md border bg-background p-3">
              <input type="radio" checked={!targetAllTeam} onChange={() => setTargetAllTeam(false)} />
              <span>
                <span className="block font-semibold">Selected students</span>
                <span className="block text-xs text-muted-foreground">Only the students you choose below.</span>
              </span>
            </label>
          </div>

          {!targetAllTeam ? (
            selectedTeam?.members.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {selectedTeam.members.map((member) => {
                  const student = member.user;
                  const label = student.displayName ?? student.name ?? student.username ?? "Student";
                  return (
                    <label key={student.id} className="flex cursor-pointer items-center gap-3 rounded-md border bg-background p-3 text-sm">
                      <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => toggleStudent(student.id)} />
                      <span>
                        <span className="block font-semibold">{label}</span>
                        <span className="block text-xs text-muted-foreground">@{student.username ?? "student"}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">Students will appear here after they join your team.</p>
            )
          ) : null}
        </CardContent>
      </Card>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isSaving || teams.length === 0 || (requiresTarget && !targetId)}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
        Create assignment
      </Button>
    </form>
  );
}
