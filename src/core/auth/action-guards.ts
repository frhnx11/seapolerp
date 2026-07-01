import { headers } from "next/headers";

import { auth } from "@/core/auth/auth";
import { prisma } from "@/core/db";

/**
 * Role guard for server actions: returns the session when the caller holds one
 * of the given roles, otherwise throws "Unauthorized". (Pages/layouts use
 * `core/auth/guards.ts`, which redirects instead of throwing.)
 *
 * The role is re-read from the DB — not the cached session — so a user demoted
 * in the DB immediately loses mutate rights (matching the page guard), and the
 * returned session's role is refreshed so downstream isAdmin checks are current.
 */
export async function requireActionRole(...roles: string[]) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const role = dbUser?.role ?? "";
  if (!roles.includes(role)) {
    throw new Error("Unauthorized");
  }

  session.user.role = role;
  return session;
}
