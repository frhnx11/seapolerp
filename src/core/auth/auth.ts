import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

import { ac, roles } from "@/core/auth/permissions";
import { prisma } from "@/core/db";
import { env } from "@/env";

/**
 * Better Auth server instance — the single source of truth for authentication.
 *
 * - Email + password only, with **public sign-up disabled**: accounts are
 *   provisioned by a SUPER_ADMIN / ADMIN, never self-registered.
 * - Roles and fine-grained permissions come from `@/core/auth/permissions`.
 * - `nextCookies()` must remain the LAST plugin so cookies set during server
 *   actions are forwarded correctly.
 */
export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 6,
  },
  user: {
    // Extra columns on the user table. They are server-controlled (`input: false`)
    // and written via Prisma; declaring them here is what makes the Better Auth
    // CLI generate the corresponding Prisma columns.
    additionalFields: {
      phone: { type: "string", required: false, input: false },
      dateOfBirth: { type: "string", required: false, input: false },
      contactEmail: { type: "string", required: false, input: false },
      rollNo: { type: "number", required: false, input: false },
    },
  },
  plugins: [
    admin({
      ac,
      roles,
      adminRoles: ["SUPER_ADMIN"],
      defaultRole: "ACCOUNTANT",
    }),
    nextCookies(),
  ],
});
