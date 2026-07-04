import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { HttpError } from "@/lib/api";

// Server-only: the single gate every AI/generation route uses. Returns the server-authoritative
// session user or throws HttpError(401). The user id comes from the signed session — NEVER from the
// request body — so a client cannot impersonate another user.
export type AuthedUser = {
  id: string;
  role?: string | null;
  organization?: string | null;
  email?: string | null;
};

export async function requireUser(): Promise<AuthedUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new HttpError("You must be signed in to do that.", 401);
  }
  return session.user as AuthedUser;
}

// Best-effort client IP for abuse signals. On Vercel, `x-forwarded-for` is set by the platform (client
// IP is the FIRST entry); we read only platform-provided headers and never trust an arbitrary value for
// anything security-critical (it is a secondary signal on top of the authenticated user id).
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
