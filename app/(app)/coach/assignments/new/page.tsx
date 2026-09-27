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
import { canAccessCoachTools } from "@/lib/roles";
import { getTeamsForCoach } from "@/lib/teams";
import { PUBLIC_TRACKS_PHRASE, isRetiredOrganization } from "@/lib/training-tracks";

export const dynamic = "force-dynamic";

export default async function NewAssignmentPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!session?.user?.id || !canAccessCoachTools(role)) {
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

  const [allTeams, content] = await Promise.all([getTeamsForCoach(session.user.id), listAssignmentContentOptions()]);
  // A team whose organization is a dormant track (HOSA, Model UN) keeps its members and history, but new
  // work cannot be assigned to it: that track is not part of the public product. createAssignment
  // refuses it on the server as well.
  const teams = allTeams.filter((team) => !isRetiredOrganization(team.organization));
  const dormantTeamCount = allTeams.length - teams.length;

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
            Assign an existing CompeteReady activity to a whole team or selected students. Students must submit real completion evidence.
          </p>
        </div>
      </div>

      {teams.length === 0 && dormantTeamCount > 0 ? (
        <EmptyState
          icon={Users}
          title="Your teams are on a track that is no longer offered."
          description={`Their members and history are kept, but new work can only be assigned to ${PUBLIC_TRACKS_PHRASE} teams. Create a ${PUBLIC_TRACKS_PHRASE} team to assign work.`}
          actionLabel="Open coach dashboard"
          actionHref="/coach"
        />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Create a team before assigning work."
          description="Assignments belong to coach-owned teams. Create a team, share the join code, then return here."
          actionLabel="Open coach dashboard"
          actionHref="/coach"
        />
      ) : (
        <>
          {dormantTeamCount > 0 ? (
            <p className="text-sm text-muted-foreground">
              {dormantTeamCount === 1 ? "One of your teams is" : `${dormantTeamCount} of your teams are`} on a track that is no longer
              offered, so {dormantTeamCount === 1 ? "it is" : "they are"} not listed here.
            </p>
          ) : null}
          <CreateAssignmentForm teams={teams} decks={content.decks} lessons={content.lessons} />
        </>
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
