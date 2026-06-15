"use server";

import { headers } from "next/headers";

import { auth } from "@/core/auth/auth";

/**
 * Self-service password change for the signed-in user. Verifies the current
 * password (Better Auth throws if it's wrong) and keeps the session valid.
 */
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false as const, error: "Not authenticated" };
  }
  if (input.newPassword.length < 6) {
    return {
      ok: false as const,
      error: "New password must be at least 6 characters",
    };
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: false,
      },
      headers: await headers(),
    });

    return { ok: true as const };
  } catch {
    // Better Auth throws when the current password is wrong.
    return {
      ok: false as const,
      error: "Current password is incorrect.",
    };
  }
}
