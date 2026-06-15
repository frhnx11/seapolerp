import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/core/auth/auth";
import { prisma } from "@/core/db";
import { roleHome } from "@/core/shell/portal-config";

/**
 * Server guard for a role-specific route segment. Ensures the visitor is
 * authenticated and holds the expected role — otherwise redirects
 * appropriately. Returns the session.
 */
export async function requireRole(role: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const actualRole = dbUser?.role ?? session.user.role ?? null;
  if (actualRole !== role) {
    redirect(actualRole ? roleHome(actualRole) : "/login");
  }

  return session;
}
