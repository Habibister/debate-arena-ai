import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { User as PrismaUser } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

const DEV_DEMO_EMAIL = "student@debatearena.ai";
const DEV_DEMO_PASSWORD = "password123";

function isDevDemoLogin(email: string, password: string) {
  return (
    process.env.NODE_ENV === "development" &&
    email.trim().toLowerCase() === DEV_DEMO_EMAIL &&
    password === DEV_DEMO_PASSWORD
  );
}

function getDevDemoStudent() {
  return {
    id: "dev-demo-student",
    name: "Demo Student",
    email: DEV_DEMO_EMAIL,
    image: null,
    username: "demo_student",
    displayName: "Demo Student",
    avatarUrl: null,
    bio: "Local demo competitor for testing DebateArena AI without a seeded database user.",
    schoolOrClub: "DebateArena Demo Lab",
    preferredOrganization: "DEBATE" as const,
    role: "STUDENT" as const,
    organization: "DEBATE" as const,
    level: "BEGINNER" as const,
    rank: "BRONZE" as const,
    xp: 375
  };
}

function serializeUserProfile(user: PrismaUser) {
  return {
    id: user.id,
    name: user.displayName ?? user.name,
    email: user.email,
    image: user.avatarUrl ?? user.image,
    username: user.username,
    displayName: user.displayName ?? user.name,
    avatarUrl: user.avatarUrl ?? user.image,
    bio: user.bio,
    schoolOrClub: user.schoolOrClub,
    preferredOrganization: user.preferredOrganization ?? user.organization,
    role: user.role,
    organization: user.organization,
    level: user.level,
    rank: user.rank,
    xp: user.xp
  };
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/signin"
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;
        const allowDevDemoLogin = isDevDemoLogin(email, password);

        let user: PrismaUser | null;

        try {
          user = await prisma.user.findUnique({
            where: { email }
          });
        } catch (error) {
          if (allowDevDemoLogin) {
            console.warn("[dev-only demo auth] Database lookup failed. Using local demo student fallback.");
            return getDevDemoStudent();
          }

          throw error;
        }

        if (!user && allowDevDemoLogin) {
          console.warn("[dev-only demo auth] Demo user is missing from the database. Using local fallback.");
          return getDevDemoStudent();
        }

        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return serializeUserProfile(user);
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organization = user.organization;
      }

      // Keep the JWT — and therefore the session cookie — small. Profile fields
      // like avatarUrl and bio are unbounded free text; persisting them here can
      // push the cookie past the server's request-header size limit and trigger
      // HTTP 431 (Request Header Fields Too Large). The session() callback
      // rehydrates the full profile from the database on every request instead.
      // NextAuth copies user.image (the avatar URL) into token.picture by
      // default, so drop it explicitly as well.
      delete token.picture;
      delete token.username;
      delete token.displayName;
      delete token.avatarUrl;
      delete token.bio;
      delete token.schoolOrClub;
      delete token.preferredOrganization;
      delete token.level;
      delete token.rank;
      delete token.xp;

      return token;
    },
    async session({ session, token }) {
      let latestUser: ReturnType<typeof serializeUserProfile> | null = null;

      if (token.id === "dev-demo-student") {
        latestUser = getDevDemoStudent();
      } else if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
          });

          latestUser = dbUser ? serializeUserProfile(dbUser) : null;
        } catch (error) {
          console.warn("[auth] Could not refresh session profile from database. Falling back to JWT values.", error);
        }
      }

      if (session.user) {
        // The JWT only carries minimal identity (see jwt callback). When the
        // database profile is unavailable we fall back to those few claims and
        // leave the richer fields null rather than bloating the cookie.
        const profile = latestUser ?? {
          id: token.id,
          name: token.name,
          email: token.email,
          image: null,
          username: null,
          displayName: token.name,
          avatarUrl: null,
          bio: null,
          schoolOrClub: null,
          preferredOrganization: token.organization ?? null,
          role: token.role,
          organization: token.organization,
          level: undefined,
          rank: undefined,
          xp: undefined
        };

        session.user.id = profile.id;
        session.user.name = profile.displayName ?? profile.name ?? null;
        session.user.email = profile.email ?? null;
        session.user.image = profile.avatarUrl ?? profile.image ?? null;
        session.user.role = profile.role;
        session.user.username = profile.username ?? null;
        session.user.displayName = profile.displayName ?? profile.name ?? null;
        session.user.avatarUrl = profile.avatarUrl ?? profile.image ?? null;
        session.user.bio = profile.bio ?? null;
        session.user.schoolOrClub = profile.schoolOrClub ?? null;
        session.user.preferredOrganization = profile.preferredOrganization ?? null;
        session.user.organization = profile.organization;
        session.user.level = profile.level;
        session.user.rank = profile.rank;
        session.user.xp = profile.xp;
      }

      return session;
    }
  }
};
