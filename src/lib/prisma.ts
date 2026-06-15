import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/env";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Single shared PrismaClient instance.
 *
 * Prisma 7 is "Rust-free": the client uses the query compiler together with a JS
 * driver adapter (`@prisma/adapter-pg`) rather than a native query engine. The
 * adapter owns an internal `pg` connection pool, so a single long-lived client
 * is what we want — creating a new client per request would exhaust Postgres
 * connections quickly at our scale.
 *
 * The instance is cached on `globalThis` so Next.js hot-reloading in development
 * does not spawn a new client (and a new pool) on every edit.
 */
const createPrismaClient = () => {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
