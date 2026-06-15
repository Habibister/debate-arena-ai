import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validators";

function profileSelect() {
  return {
    id: true,
    name: true,
    email: true,
    role: true,
    username: true,
    displayName: true,
    avatarUrl: true,
    image: true,
    bio: true,
    schoolOrClub: true,
    preferredOrganization: true,
    organization: true,
    level: true,
    xp: true,
    streak: true,
    wins: true,
    rank: true
  } satisfies Prisma.UserSelect;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to view your profile." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: profileSelect()
  });

  if (!user) {
    return NextResponse.json({ error: "We could not find your profile. Please sign in again." }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to update your profile." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const input = profileUpdateSchema.parse(body);

    const existingUsername = await prisma.user.findUnique({
      where: { username: input.username },
      select: { id: true }
    });

    if (existingUsername && existingUsername.id !== session.user.id) {
      return NextResponse.json({ error: "That username is already taken. Try another one." }, { status: 409 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        username: input.username,
        displayName: input.displayName,
        name: input.displayName,
        avatarUrl: input.avatarUrl ?? null,
        image: input.avatarUrl ?? null,
        bio: input.bio ?? null,
        schoolOrClub: input.schoolOrClub ?? null,
        preferredOrganization: input.preferredOrganization ?? null,
        organization: input.preferredOrganization ?? undefined,
        level: input.level
      },
      select: profileSelect()
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Please check the profile fields and try again." }, { status: 400 });
    }

    console.error("[profile:update]", error);
    return NextResponse.json({ error: "We could not save your profile right now. Please try again." }, { status: 500 });
  }
}
