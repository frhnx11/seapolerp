"use server";

import { revalidatePath } from "next/cache";

import { requireActionRole } from "@/core/auth/action-guards";
import { prisma } from "@/core/db";

const requireAdmin = () => requireActionRole("ADMIN");

/**
 * Replaces a work order's allotted-truck set with `truckIds`. Blocked trucks
 * may stay allotted (if they already were) but cannot be newly added — the UI
 * prevents it and this guard backstops a stale client.
 */
export async function setAllottedTrucks(
  workOrderId: string,
  truckIds: string[],
) {
  await requireAdmin();

  const ids = [...new Set(truckIds)];

  try {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true },
    });
    if (!workOrder) {
      return { ok: false as const, error: "Work order not found" };
    }

    const [trucks, existing] = await Promise.all([
      prisma.truck.findMany({
        where: { id: { in: ids } },
        select: { id: true, status: true, vehicleNo: true },
      }),
      prisma.workOrderTruck.findMany({
        where: { workOrderId },
        select: { truckId: true },
      }),
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
      prisma.workOrderTruck.deleteMany({
        where: { workOrderId, truckId: { notIn: ids } },
      }),
      prisma.workOrderTruck.createMany({
        data: ids.map((truckId) => ({ workOrderId, truckId })),
        skipDuplicates: true,
      }),
    ]);

    revalidatePath(`/admin/work-orders/${workOrderId}/allotted-trucks`);
    revalidatePath(`/admin/work-orders/${workOrderId}`);
    revalidatePath("/admin/work-orders");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to allot trucks",
    };
  }
}

const WO_PORTAL_BASES = [
  "/admin/work-orders",
  "/port-weighbridge/work-orders",
  "/party-weighbridge/work-orders",
  "/accountant/work-orders",
];

/**
 * Work-order-specific block: blocks/unblocks one truck for one work order.
 * Only gates NEW trips (createTruckOrder) — existing trips are unaffected. The
 * truck stays usable by other work orders. (Universal blocking lives on the
 * trucks master via Truck.status.)
 */
export async function setWorkOrderTruckBlocked(
  workOrderId: string,
  truckId: string,
  blocked: boolean,
) {
  await requireAdmin();
  try {
    await prisma.workOrderTruck.update({
      where: { workOrderId_truckId: { workOrderId, truckId } },
      data: { blocked },
    });
    // Refresh the allotted-trucks pill and the create-trip picker on every portal.
    for (const base of WO_PORTAL_BASES) {
      revalidatePath(`${base}/${workOrderId}/allotted-trucks`);
      revalidatePath(`${base}/${workOrderId}/truck-orders`);
    }
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update block status",
    };
  }
}
