"use server";

import { revalidatePath } from "next/cache";

import { requireActionRole } from "@/core/auth/action-guards";
import { prisma } from "@/core/db";
import { formatQty } from "@/core/format";
import type { Prisma } from "@/generated/prisma/client";

import { woSchema, type WorkOrderInput } from "./work-order";

const WO_PATH = "/admin/work-orders";

const requireAdmin = () => requireActionRole("ADMIN");

function toMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "P2003") {
      return "The selected vessel, cargo type, supplier or party no longer exists.";
    }
    if (code === "P2034") {
      return "Another change to this vessel's work orders happened at the same time — please try again.";
    }
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

/**
 * Validates the vessel's WO budget inside the transaction: the sum of WO
 * quantities across a vessel's work orders can never exceed its total quantity.
 * Run with Serializable isolation so concurrent edits can't oversubscribe.
 */
async function assertVesselAvailability(
  tx: Prisma.TransactionClient,
  vesselId: string,
  woQuantity: number,
  excludeWorkOrderId?: string,
) {
  const vessel = await tx.vessel.findUnique({
    where: { id: vesselId },
    select: { totalQuantity: true, name: true },
  });
  if (!vessel) throw new Error("The selected vessel no longer exists.");

  const agg = await tx.workOrder.aggregate({
    where: {
      vesselId,
      ...(excludeWorkOrderId ? { id: { not: excludeWorkOrderId } } : {}),
    },
    _sum: { woQuantity: true },
  });
  const allocated = agg._sum.woQuantity?.toNumber() ?? 0;
  const available = vessel.totalQuantity.toNumber() - allocated;

  if (woQuantity > available) {
    throw new Error(
      `WO quantity exceeds ${vessel.name}'s availability — only ${formatQty(
        Math.max(available, 0),
      )} MT of its total is unallocated.`,
    );
  }
}

export async function createWorkOrder(input: WorkOrderInput) {
  const session = await requireAdmin();
  const parsed = woSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { date, vesselId, cargoTypeId, supplierId, partyId, woQuantity } =
    parsed.data;
  // Optional customs refs: empty strings are stored as NULL.
  const customsRefs = {
    bePermissionNo: parsed.data.bePermissionNo || null,
    eaIaNo: parsed.data.eaIaNo || null,
    eaIaDate: parsed.data.eaIaDate || null,
    sbBeNo: parsed.data.sbBeNo || null,
    sbBeDate: parsed.data.sbBeDate || null,
  };
  try {
    await prisma.$transaction(
      async (tx) => {
        await assertVesselAvailability(tx, vesselId, woQuantity);
        await tx.workOrder.create({
          data: {
            date,
            vesselId,
            cargoTypeId,
            supplierId,
            partyId,
            woQuantity,
            createdByName: session.user.name,
            ...customsRefs,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
    revalidatePath(WO_PATH);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

/**
 * Deletes a work order — only allowed while it has no truck orders (nothing
 * has been executed against it). Truck allotments cascade away with it, and
 * the vessel's WO availability frees automatically (it is computed as
 * total − Σ work-order WO). A trip racing this delete is caught by the
 * TruckOrder→WorkOrder Restrict FK.
 */
export async function deleteWorkOrder(id: string) {
  await requireAdmin();
  try {
    await prisma.$transaction(
      async (tx) => {
        const workOrder = await tx.workOrder.findUnique({
          where: { id },
          select: { _count: { select: { truckOrders: true } } },
        });
        if (!workOrder) throw new Error("Work order not found");
        if (workOrder._count.truckOrders > 0) {
          throw new Error(
            "This work order already has truck orders — it can't be deleted.",
          );
        }
        await tx.workOrder.delete({ where: { id } });
      },
      { isolationLevel: "Serializable" },
    );
    revalidatePath(WO_PATH);
    return { ok: true as const };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2003"
    ) {
      return {
        ok: false as const,
        error:
          "This work order already has truck orders — it can't be deleted.",
      };
    }
    return { ok: false as const, error: toMessage(error) };
  }
}

export async function updateWorkOrder(id: string, input: WorkOrderInput) {
  await requireAdmin();
  const parsed = woSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { date, vesselId, cargoTypeId, supplierId, partyId, woQuantity } =
    parsed.data;
  // Optional customs refs: empty strings are stored as NULL.
  const customsRefs = {
    bePermissionNo: parsed.data.bePermissionNo || null,
    eaIaNo: parsed.data.eaIaNo || null,
    eaIaDate: parsed.data.eaIaDate || null,
    sbBeNo: parsed.data.sbBeNo || null,
    sbBeDate: parsed.data.sbBeDate || null,
  };
  try {
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.workOrder.findUnique({
          where: { id },
          select: {
            delivered: true,
            vesselId: true,
            cargoTypeId: true,
            supplierId: true,
            partyId: true,
            _count: { select: { truckOrders: true } },
          },
        });
        if (!existing) throw new Error("Work order not found");

        // Trips and invoices print the work order's vessel/cargo/supplier/
        // party — once a trip exists, changing them would rewrite those
        // documents (e.g. an invoice showing a party that never agreed to
        // the frozen rate). Date, WO quantity and customs refs stay editable.
        const partiesChanged =
          vesselId !== existing.vesselId ||
          cargoTypeId !== existing.cargoTypeId ||
          supplierId !== existing.supplierId ||
          partyId !== existing.partyId;
        if (partiesChanged && existing._count.truckOrders > 0) {
          throw new Error(
            "This work order has truck orders — its vessel, cargo type, supplier and party are locked.",
          );
        }

        const delivered = existing.delivered.toNumber();
        if (woQuantity < delivered) {
          throw new Error(
            `WO quantity can't be less than the delivered amount (${formatQty(delivered)} MT).`,
          );
        }

        await assertVesselAvailability(tx, vesselId, woQuantity, id);
        await tx.workOrder.update({
          where: { id },
          data: {
            date,
            vesselId,
            cargoTypeId,
            supplierId,
            partyId,
            woQuantity,
            ...customsRefs,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
    revalidatePath(WO_PATH);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}
