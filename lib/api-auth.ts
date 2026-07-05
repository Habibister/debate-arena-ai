import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { HttpError } from "@/lib/api";

export type AuthedUser = {
  id: string;
  role?: string | null;
  organization?: string | null;
  email?: string | null;
};

export function sessionUserId(session: { user?: { id?: unknown } } | null | undefined): string | null {
  const id = session?.user?.id;
  return typeof id === "string" && id.trim().length > 0 ? id : null;
}

export async function requireUser(): Promise<AuthedUser> {
  const session = await getServerSession(authOptions);
  const id = sessionUserId(session);

  if (!id) {
    throw new HttpError("You must be signed in to do that.", 401);
  }

  return { ...(session?.user ?? {}), id } as AuthedUser;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
