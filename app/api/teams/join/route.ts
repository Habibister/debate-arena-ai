import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, parseJson, unauthorized } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { joinTeamByCode } from "@/lib/teams";
import { teamJoinSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized();
    }

    const input = await parseJson(request, teamJoinSchema);
    const { team } = await joinTeamByCode({ userId: session.user.id, joinCode: input.joinCode });

    return NextResponse.json({ team, message: `You joined ${team.name}.` }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
