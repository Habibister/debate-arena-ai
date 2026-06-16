import type { DefaultSession } from "next-auth";
import type { Level, Organization, Rank, Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      username?: string | null;
      displayName?: string | null;
      avatarUrl?: string | null;
      bio?: string | null;
      schoolOrClub?: string | null;
      preferredOrganization?: Organization | null;
      organization?: Organization | null;
      level?: Level;
      rank?: Rank;
      xp?: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    username?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    schoolOrClub?: string | null;
    preferredOrganization?: Organization | null;
    organization?: Organization | null;
    level?: Level;
    rank?: Rank;
    xp?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    username?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    schoolOrClub?: string | null;
    preferredOrganization?: Organization | null;
    organization?: Organization | null;
    level?: Level;
    rank?: Rank;
    xp?: number;
  }
}
