"use server";

import { revalidatePath } from "next/cache";

import { requireActionRole } from "@/core/auth/action-guards";
import { prisma } from "@/core/db";

/** Every portal that shows the allotted-trucks pool (admin edits, others view). */
const ALLOTTED_TRUCKS_PATHS = [
  "/admin/allotted-trucks",
  "/port-weighbridge/allotted-trucks",
  "/party-weighbridge/allotted-trucks",
  "/accountant/allotted-trucks",
];

/**
 * Replaces the global allotted-truck pool with `truckIds`. This pool is no longer
 * tied to a work order — a truck in it can deliver any work order. Blocked trucks
 * (master status) may stay in the pool if they already were, but can't be newly
 * added; the UI prevents it and this guard backstops a stale client. Admin only.
 */
export async function setAllottedTrucks(truckIds: string[]) {
  const session = await requireActionRole("ADMIN");

  const ids = [...new Set(truckIds)];

  try {
    const [trucks, existing] = await Promise.all([
      prisma.truck.findMany({
        where: { id: { in: ids } },
        select: { id: true, status: true, vehicleNo: true },
      }),
      prisma.allottedTruck.findMany({ select: { truckId: true } }),
    ]);

    if (trucks.length !== ids.length) {
      return {
        ok: false as const,
        error: "One or more selected trucks no longer exist.",
      };
    }

    const alreadyAllotted = new Set(existing.map((e) => e.truckId));
    const newlyBlocked = trucks.filter(
      (t) => t.status === "BLOCKED" && !alreadyAllotted.has(t.id),
    );
    if (newlyBlocked.length > 0) {
      return {
        ok: false as const,
        error: `Blocked trucks can't be allotted: ${newlyBlocked
          .map((t) => t.vehicleNo)
          .join(", ")}`,
      };
    }

    await prisma.$transaction([
      prisma.allottedTruck.deleteMany({
        where: { truckId: { notIn: ids } },
      }),
      prisma.allottedTruck.createMany({
        data: ids.map((truckId) => ({
          truckId,
          allottedByName: session.user.name,
        })),
        skipDuplicates: true,
      }),
    ]);

    for (const path of ALLOTTED_TRUCKS_PATHS) revalidatePath(path);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to allot trucks",
    };
  }
}
