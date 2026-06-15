import { headers } from "next/headers";

import { auth } from "@/core/auth/auth";
import { prisma } from "@/core/db";

import {
  buildUsername,
  type CreatableRole,
  DEFAULT_PASSWORD,
} from "./username";

/**
 * Provisions a single staff account the same way the admin UI does: a per-role
 * sequential roll number, an `@seapolerp.com` username, a Better Auth credential
 * (default password), then the extra profile columns. Shared by the
 * `createAccount` server action and the super-admin sample-data seeder.
 *
 * Not a server action: it does no auth guard and no revalidation — callers own
 * those. It must run inside a request context (it reads `headers()` so the
 * `auth.api.createUser` call inherits the acting super-admin's session).
 */
export async function provisionAccount(input: {
  name: string;
  role: CreatableRole;
  phone?: string | null;
  contactEmail?: string | null;
  dateOfBirth?: string | null;
}): Promise<{ username: string; userId: string }> {
  const { name, role, phone, contactEmail, dateOfBirth } = input;

  // Per-type sequential roll number (max existing + 1). The unique email
  // constraint backstops the rare concurrent-create race.
  const agg = await prisma.user.aggregate({
    where: { role },
    _max: { rollNo: true },
  });
  const rollNo = (agg._max.rollNo ?? 0) + 1;
  const username = buildUsername(name, role, rollNo);

  const created = await auth.api.createUser({
    body: { email: username, password: DEFAULT_PASSWORD, name, role },
    headers: await headers(),
  });

  await prisma.user.update({
    where: { id: created.user.id },
    data: {
      phone: phone || null,
      contactEmail: contactEmail || null,
      dateOfBirth: dateOfBirth || null,
      rollNo,
      emailVerified: true,
    },
  });

  return { username, userId: created.user.id };
}
