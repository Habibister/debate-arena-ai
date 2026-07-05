import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaAtStartup?: string;
  prismaStaleWatcher?: ReturnType<typeof setInterval>;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;

  // Stale-client detector (dev only). The client instance above is cached on globalThis and
  // survives hot reloads, so running `prisma generate` while the dev server is up leaves this
  // process querying with the OLD client — new models silently error and defensive fallbacks hide
  // it (this cost real debugging time three times). The generated client ships a copy of the
  // schema it was built from; we snapshot it when the client is created and poll for divergence
  // every 30s. Divergence = loud, repeated, unmissable error until the server is restarted.
  try {
    const schemaPath = "node_modules/.prisma/client/schema.prisma";
    if (!globalForPrisma.prismaSchemaAtStartup) {
      globalForPrisma.prismaSchemaAtStartup = readFileSync(schemaPath, "utf8");
    }
    if (!globalForPrisma.prismaStaleWatcher) {
      globalForPrisma.prismaStaleWatcher = setInterval(() => {
        try {
          if (readFileSync(schemaPath, "utf8") !== globalForPrisma.prismaSchemaAtStartup) {
            console.error(
              "\n[prisma] ******************************************************************\n" +
                "[prisma] STALE PRISMA CLIENT: `prisma generate` ran after this dev server\n" +
                "[prisma] started. This process is still using the OLD client — queries on\n" +
                "[prisma] new models/fields will fail silently into fallbacks.\n" +
                "[prisma] RESTART THE DEV SERVER NOW (`npm run dev`).\n" +
                "[prisma] ******************************************************************\n"
            );
          }
        } catch {
          // never let the detector itself break dev
        }
      }, 30_000);
      globalForPrisma.prismaStaleWatcher.unref?.();
    }
  } catch {
    // best-effort guard — never let the detector itself break dev
  }
}
