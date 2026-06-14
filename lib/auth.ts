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
    role: "STUDENT" as const,
    organization: "DEBATE" as const,
    level: "BEGINNER" as const,
    rank: "BRONZE" as const,
    xp: 375
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

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          organization: user.organization,
          level: user.level,
          rank: user.rank,
          xp: user.xp
        };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organization = user.organization;
        token.level = user.level;
        token.rank = user.rank;
        token.xp = user.xp;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.organization = token.organization;
        session.user.level = token.level;
        session.user.rank = token.rank;
        session.user.xp = token.xp;
      }

      return session;
    }
  }
};
