import { getServerSession } from "next-auth";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, ClipboardList, Lock, Users } from "lucide-react";
import { CreateAssignmentForm } from "@/components/assignments/create-assignment-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listAssignmentContentOptions } from "@/lib/assignments";
import { authOptions } from "@/lib/auth";
import { getTeamsForCoach } from "@/lib/teams";

export const dynamic = "force-dynamic";

export default async function NewAssignmentPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!session?.user?.id || (role !== "COACH" && role !== "ADMIN")) {
    return (
      <div className="space-y-6">
        <Badge variant="secondary">Coach Assignments</Badge>
        <EmptyState
          icon={Lock}
          title="You need a coach account to create assignments."
          description="Coach assignment tools are only available to coaches and admins."
          actionLabel="Back to dashboard"
          actionHref="/dashboard"
        />
      </div>
    );
  }

  const [teams, content] = await Promise.all([getTeamsForCoach(session.user.id), listAssignmentContentOptions()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={"/coach/assignments" as Route} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Assignments
          </Link>
          <Badge variant="secondary" className="mt-4 block w-fit">
            Coach Assignments
          </Badge>
          <h1 className="mt-3 text-3xl font-bold">Create assignment</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Assign an existing DebateArena activity to a whole team or selected students. Students must submit real completion evidence.
          </p>
        </div>
      </div>

      {teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Create a team before assigning work."
          description="Assignments belong to coach-owned teams. Create a team, share the join code, then return here."
          actionLabel="Open coach dashboard"
          actionHref="/coach"
        />
      ) : (
        <CreateAssignmentForm teams={teams} decks={content.decks} lessons={content.lessons} />
      )}

      <EmptyState
        icon={ClipboardList}
        title="Completion is evidence-based."
        description="Start buttons only mark work in progress. Completion requires a judged debate, completed test, completed lesson practice, or a reflection for study activities that do not yet store sessions."
        className="min-h-32"
      />
    </div>
  );
}
