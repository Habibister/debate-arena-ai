import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowRight, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalDate } from "@/components/ui/local-date";
import { assignmentStatusLabel, assignmentTypeLabel, statusForSubmission } from "@/lib/assignment-types";
import { getStudentAssignments } from "@/lib/assignments";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

function dueLabel(date?: Date | null) {
  if (!date) return "No due date";
  return <>Due <LocalDate value={date} /></>;
}

function isPastDue(date?: Date | null) {
  return !!date && date.getTime() < Date.now();
}

function isDueSoon(date?: Date | null) {
  if (!date) return false;
  const diff = date.getTime() - Date.now();
  return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 7;
}

export default async function AssignmentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/assignments");
  }

  const assignments = await getStudentAssignments(session.user.id);

  const groups = [
    {
      title: "Due soon",
      rows: assignments.filter((assignment) => statusForSubmission(assignment.submissions[0]) !== "COMPLETED" && isDueSoon(assignment.dueDate))
    },
    {
      title: "Active",
      rows: assignments.filter(
        (assignment) =>
          statusForSubmission(assignment.submissions[0]) !== "COMPLETED" &&
          !isDueSoon(assignment.dueDate) &&
          !isPastDue(assignment.dueDate)
      )
    },
    {
      title: "Past due",
      rows: assignments.filter((assignment) => statusForSubmission(assignment.submissions[0]) !== "COMPLETED" && isPastDue(assignment.dueDate))
    },
    {
      title: "Completed",
      rows: assignments.filter((assignment) => statusForSubmission(assignment.submissions[0]) === "COMPLETED")
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary">Assigned Work</Badge>
        <h1 className="mt-3 text-3xl font-bold">Assignments</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Start coach-assigned practice, then submit real completed work so your coach can track progress.
        </p>
      </div>

      {assignments.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No assignments yet." description="When a coach assigns work to one of your teams, it will appear here." />
      ) : (
        groups.map((group) =>
          group.rows.length > 0 ? (
            <Card key={group.title}>
              <CardHeader>
                <CardTitle>{group.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.rows.map((assignment) => {
                  const status = statusForSubmission(assignment.submissions[0]);
                  const coachName =
                    assignment.team.coach?.user?.displayName ??
                    assignment.team.coach?.user?.name ??
                    assignment.team.coach?.user?.username ??
                    "Coach";
                  return (
                    <Link
                      key={assignment.id}
                      href={`/assignments/${assignment.id}` as Route}
                      className="flex flex-col gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span>
                        <span className="font-semibold">{assignment.title}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {assignmentTypeLabel(assignment.type)} · {assignment.team.name} · {coachName}
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge variant={status === "COMPLETED" ? "secondary" : status === "IN_PROGRESS" ? "accent" : "outline"}>
                          {assignmentStatusLabel(status)}
                        </Badge>
                        <Badge variant="outline">{dueLabel(assignment.dueDate)}</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                      </span>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          ) : null
        )
      )}
    </div>
  );
}
