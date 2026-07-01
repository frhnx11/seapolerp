"use server";

import { requireActionRole } from "@/core/auth/action-guards";
import { prisma } from "@/core/db";
import { formatQty } from "@/core/format";
import type { Prisma } from "@/generated/prisma/client";

import { doSchema, type DeliveryOrderInput } from "./delivery-order";
import { revalidateDelivery } from "./delivery-paths";

// Delivery orders are created/managed by ADMIN only (C&F is view-only).
const requireAdmin = () => requireActionRole("ADMIN");

const revalidateDo = () => revalidateDelivery("/orders");

function toMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "P2003") {
      return "The selected vessel, importer, party or cargo type no longer exists.";
    }
    if (code === "P2034") {
      return "Another delivery order for this vessel/importer/cargo happened at the same time — please try again.";
    }
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

/**
 * Enforces Σ(DO quantity) ≤ Σ(BE quantity) for a (vessel, importer, cargo) combo,
 * inside the transaction. The combo's BE total is the Σ of its bills of lading
 * that have been grouped into a bill of entry. On edit the current DO is excluded
 * so its own quantity frees up first.
 */
async function assertComboAvailability(
  tx: Prisma.TransactionClient,
  vesselId: string,
  importerId: string,
  cargoTypeId: string,
  doQuantity: number,
  excludeDoId?: string,
) {
  const combo = { vesselId, importerId, cargoTypeId };

  const beAgg = await tx.billOfLading.aggregate({
    where: { ...combo, billOfEntryId: { not: null } },
    _sum: { blQuantity: true },
  });
  const beTotal = beAgg._sum.blQuantity?.toNumber() ?? 0;

  const doAgg = await tx.deliveryOrder.aggregate({
    where: {
      ...combo,
      ...(excludeDoId ? { id: { not: excludeDoId } } : {}),
    },
    _sum: { doQuantity: true },
  });
  const allocated = doAgg._sum.doQuantity?.toNumber() ?? 0;

  const available = beTotal - allocated;
  if (doQuantity > available) {
    throw new Error(
      `DO quantity exceeds availability — only ${formatQty(
        Math.max(available, 0),
      )} MT of this vessel/importer/cargo's bills of entry is undelivered.`,
    );
  }
}

export async function createDeliveryOrder(input: DeliveryOrderInput) {
  const session = await requireAdmin();
  const parsed = doSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { vesselId, importerId, cargoTypeId, partyId, doQuantity } =
    parsed.data;
  try {
    await prisma.$transaction(
      async (tx) => {
        await assertComboAvailability(
          tx,
          vesselId,
          importerId,
          cargoTypeId,
          doQuantity,
        );
        await tx.deliveryOrder.create({
          data: {
            vesselId,
            importerId,
            cargoTypeId,
            partyId,
            doQuantity,
            createdByName: session.user.name,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
    revalidateDo();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

export async function updateDeliveryOrder(
  id: string,
  input: DeliveryOrderInput,
) {
  await requireAdmin();
  const parsed = doSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { vesselId, importerId, cargoTypeId, partyId, doQuantity } =
    parsed.data;
  try {
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.deliveryOrder.findUnique({
          where: { id },
          select: {
            vesselId: true,
            importerId: true,
            cargoTypeId: true,
            partyId: true,
            delivered: true,
            _count: { select: { truckOrders: true } },
          },
        });
        if (!existing) throw new Error("Delivery order not found.");
        const delivered = existing.delivered.toNumber();

        // Can't shrink a DO below the tonnage its trucks have already delivered.
        if (doQuantity < delivered) {
          throw new Error(
            `DO quantity can't be less than the ${formatQty(delivered)} MT already delivered.`,
          );
        }

        // Re-pointing a DO that already has trucks to a different combo/party
        // would strand its delivered tonnage on the old combo — block it.
        const comboOrPartyChanged =
          existing.vesselId !== vesselId ||
          existing.importerId !== importerId ||
          existing.cargoTypeId !== cargoTypeId ||
          existing.partyId !== partyId;
        if (comboOrPartyChanged && existing._count.truckOrders > 0) {
          throw new Error(
            "This delivery order already has truck orders — remove them before changing the vessel, importer, cargo, or party.",
          );
        }

        await assertComboAvailability(
          tx,
          vesselId,
          importerId,
          cargoTypeId,
          doQuantity,
          id,
        );
        await tx.deliveryOrder.update({
          where: { id },
          data: { vesselId, importerId, cargoTypeId, partyId, doQuantity },
        });
      },
      { isolationLevel: "Serializable" },
    );
    revalidateDo();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

export async function deleteDeliveryOrder(id: string) {
  await requireAdmin();
  try {
    // Truck orders are onDelete: Restrict — pre-check so the user gets a clear
    // message instead of a raw FK error.
    const trucks = await prisma.doTruckOrder.count({
      where: { deliveryOrderId: id },
    });
    if (trucks > 0) {
      return {
        ok: false as const,
        error: `This delivery order has ${trucks} truck order${
          trucks === 1 ? "" : "s"
        } — delete them first.`,
      };
    }
    await prisma.deliveryOrder.delete({ where: { id } });
    revalidateDo();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}
