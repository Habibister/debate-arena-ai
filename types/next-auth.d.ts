import type { DefaultSession } from "next-auth";
import type { Level, Organization, Rank, Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      organization?: Organization | null;
      level?: Level;
      rank?: Rank;
      xp?: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
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
    organization?: Organization | null;
    level?: Level;
    rank?: Rank;
    xp?: number;
  }
}
