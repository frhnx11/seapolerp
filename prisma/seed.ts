import "dotenv/config";
import { randomUUID } from "node:crypto";

import { auth } from "@/core/auth/auth";
import { prisma } from "@/core/db";

/**
 * Seeds the initial SUPER_ADMIN. Idempotent — safe to run repeatedly.
 *
 * Public sign-up is disabled, so the very first account is bootstrapped here using
 * Better Auth's own password hasher (`auth.$context`), guaranteeing the stored
 * credential verifies on login exactly like an admin-created account would.
 */
const SUPER_ADMIN = {
  email: "superadmin@seapolerp.com",
  password: "1234567890",
  name: "Super Admin",
} as const;

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: SUPER_ADMIN.email },
  });

  if (existing) {
    console.log(`Super admin already exists (${SUPER_ADMIN.email}). Skipping.`);
    return;
  }

  const ctx = await auth.$context;
  const hashedPassword = await ctx.password.hash(SUPER_ADMIN.password);
  const userId = randomUUID();

  await prisma.user.create({
    data: {
      id: userId,
      name: SUPER_ADMIN.name,
      email: SUPER_ADMIN.email,
      emailVerified: true,
      role: "SUPER_ADMIN",
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          password: hashedPassword,
        },
      },
    },
  });

  console.log(`Seeded super admin: ${SUPER_ADMIN.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
