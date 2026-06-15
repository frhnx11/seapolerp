/**
 * Shared-kernel database access.
 *
 * Re-exports the single PrismaClient instance so feature modules import the
 * database through the kernel (`@/core/db`) rather than reaching into `@/lib`.
 */
export { prisma } from "@/lib/prisma";
