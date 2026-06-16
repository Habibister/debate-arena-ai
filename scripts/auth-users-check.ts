/**
 * Safe local auth diagnostic: lists users so you can confirm demo/custom accounts exist and have a
 * password hash. It NEVER prints password hashes, DATABASE_URL, or any secret — only whether a hash
 * is present. Run with: npm run auth:check
 */
import { readFileSync } from "node:fs";

// Load DB connection env from .env files without printing anything from them.
function loadEnv(file: string) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2];
      }
    }
  } catch {
    // file may not exist; ignore
  }
}

loadEnv(".env.local");
loadEnv(".env");

async function main() {
  const { prisma } = await import("../lib/prisma");

  const users = await prisma.user.findMany({
    select: { email: true, username: true, role: true, passwordHash: true, createdAt: true },
    orderBy: { createdAt: "asc" }
  });

  console.log(`Found ${users.length} user(s):`);
  for (const user of users) {
    console.log(
      [
        `email=${user.email ?? "(none)"}`,
        `username=${user.username ?? "(none)"}`,
        `role=${user.role}`,
        `hasPasswordHash=${Boolean(user.passwordHash)}`,
        `createdAt=${user.createdAt.toISOString()}`
      ].join("  |  ")
    );
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("auth-users-check failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
