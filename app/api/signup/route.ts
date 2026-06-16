import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = signupSchema.parse(body);

    // Case-insensitive duplicate checks so a mixed-case existing row is still caught.
    const emailTaken = await prisma.user.findFirst({
      where: { email: { equals: input.email, mode: "insensitive" } },
      select: { id: true }
    });
    if (emailTaken) {
      return NextResponse.json({ error: "An account with that email already exists. Try signing in instead." }, { status: 409 });
    }

    const usernameTaken = await prisma.user.findFirst({
      where: { username: { equals: input.username, mode: "insensitive" } },
      select: { id: true }
    });
    if (usernameTaken) {
      return NextResponse.json({ error: "That username is already taken. Try another one." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        username: input.username,
        displayName: input.displayName,
        name: input.displayName,
        avatarUrl: input.avatarUrl ?? null,
        image: input.avatarUrl ?? null,
        schoolOrClub: input.schoolOrClub ?? null,
        preferredOrganization: input.preferredOrganization ?? null,
        organization: input.preferredOrganization ?? null,
        role: "STUDENT",
        level: "BEGINNER",
        ageGroup: null,
        xp: 0,
        streak: 0,
        wins: 0,
        rank: "BRONZE"
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true
      }
    });

    return NextResponse.json({ user, message: "Account created. You can sign in now." }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Please check the signup form and try again." }, { status: 400 });
    }

    // Unique-constraint violation (e.g. a race between the duplicate check and create) — surface a
    // clear 409 instead of a silent 500.
    if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "P2002") {
      const target = String((error as { meta?: { target?: unknown } }).meta?.target ?? "");
      const field = target.includes("username") ? "username" : "email";
      return NextResponse.json(
        {
          error:
            field === "username"
              ? "That username is already taken. Try another one."
              : "An account with that email already exists. Try signing in instead."
        },
        { status: 409 }
      );
    }

    console.error("[signup]", error);
    return NextResponse.json({ error: "We could not create your account right now. Please try again." }, { status: 500 });
  }
}
