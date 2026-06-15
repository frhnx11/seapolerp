import { headers } from "next/headers";

import { auth } from "@/core/auth/auth";

/**
 * Role guard for server actions: returns the session when the caller holds one
 * of the given roles, otherwise throws "Unauthorized". (Pages/layouts use
 * `core/auth/guards.ts`, which redirects instead of throwing.)
 */
export async function requireActionRole(...roles: string[]) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !roles.includes(session.user.role ?? "")) {
    throw new Error("Unauthorized");
  }
  return session;
}
