"use server";

import { revalidatePath } from "next/cache";

import { requireActionRole } from "@/core/auth/action-guards";

import { seedSampleData, type SeededLogin, wipeAllData } from "./reset-data";

const requireSuperAdmin = () => requireActionRole("SUPER_ADMIN");

/** Revalidate the portals that surface counts/lists after a reset. */
function revalidateAfterReset() {
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/accounts");
}

/**
 * Wipes the whole database to a fresh ERP, keeping only the super-admin
 * account(s). SUPER_ADMIN only.
 */
export async function clearAllData() {
  await requireSuperAdmin();
  try {
    await wipeAllData();
    revalidateAfterReset();
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to clear data",
    };
  }
}

/**
 * Wipes everything, then seeds sample master data, ~100 trucks, work-order +
 * delivery-order vessels, and the five sample staff accounts. SUPER_ADMIN only.
 * Returns the seeded logins.
 */
export async function resetWithSampleData(): Promise<
  | { ok: true; logins: SeededLogin[]; password: string }
  | { ok: false; error: string }
> {
  await requireSuperAdmin();
  try {
    await wipeAllData();
    const { logins, password } = await seedSampleData();
    revalidateAfterReset();
    return { ok: true as const, logins, password };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Failed to load sample data",
    };
  }
}
