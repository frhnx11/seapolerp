"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { requireActionRole } from "@/core/auth/action-guards";
import { auth } from "@/core/auth/auth";

import { provisionAccount } from "./provision";
import { CREATABLE_ROLES, DEFAULT_PASSWORD } from "./username";

const requireSuperAdmin = () => requireActionRole("SUPER_ADMIN");

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  role: z.enum(CREATABLE_ROLES),
  phone: z.string().trim().optional(),
  contactEmail: z
    .union([z.literal(""), z.string().trim().email("Enter a valid email")])
    .optional(),
  dateOfBirth: z.string().trim().optional(),
});

export type CreateAccountInput = z.infer<typeof createSchema>;

export async function createAccount(input: CreateAccountInput) {
  await requireSuperAdmin();

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const { username } = await provisionAccount(parsed.data);
    revalidatePath("/super-admin/accounts");
    return { ok: true as const, username };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Failed to create account",
    };
  }
}

export async function resetPassword(userId: string) {
  await requireSuperAdmin();

  try {
    await auth.api.setUserPassword({
      body: { userId, newPassword: DEFAULT_PASSWORD },
      headers: await headers(),
    });

    revalidatePath("/super-admin/accounts");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Failed to reset password",
    };
  }
}
