import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, parseJson, unauthorized } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { leaveTeam } from "@/lib/teams";
import { teamLeaveSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized();
    }

    const input = await parseJson(request, teamLeaveSchema);
    await leaveTeam({ userId: session.user.id, teamId: input.teamId });

    return NextResponse.json({ message: "You left the team." });
  } catch (error) {
    return apiError(error);
  }
}
