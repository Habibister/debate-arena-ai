import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, forbidden, parseJson, unauthorized } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { createTeam, getTeamsForCoach } from "@/lib/teams";
import { canAccessCoachTools } from "@/lib/roles";
import { teamCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";

const isCoach = canAccessCoachTools;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized();
    }
    if (!isCoach(session.user.role)) {
      return forbidden("You need a coach account to view teams.");
    }

    const teams = await getTeamsForCoach(session.user.id);
    return NextResponse.json({ teams });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized();
    }
    if (!isCoach(session.user.role)) {
      return forbidden("You need a coach account to create teams.");
    }

    const input = await parseJson(request, teamCreateSchema);
    const team = await createTeam({
      userId: session.user.id,
      role: session.user.role,
      name: input.name,
      organization: input.organization ?? "DEBATE",
      schoolOrClub: input.schoolOrClub ?? null
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
