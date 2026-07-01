"use server";

import { requireActionRole } from "@/core/auth/action-guards";
import { prisma } from "@/core/db";
import { formatQty } from "@/core/format";
import type { Prisma } from "@/generated/prisma/client";

import { assertBeCoversDos } from "./availability";
import { blSchema, type BillOfLadingInput } from "./bill-of-lading";
import { revalidateDelivery } from "./delivery-paths";

const requireAdmin = () => requireActionRole("ADMIN");

// A BL change also shifts the vessel's Allocated BL / Available figures.
const revalidateBl = () => revalidateDelivery("/bills-of-lading", "/vessels");

function toMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") {
      return "A bill of lading with this BL number already exists for this vessel.";
    }
    if (code === "P2003") {
      return "The selected vessel, importer or cargo type no longer exists.";
    }
    if (code === "P2034") {
      return "Another change to this vessel's bills of lading happened at the same time — please try again.";
    }
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

/**
 * Enforces Σ(BL quantity) ≤ vessel total within the transaction. Mirrors the
 * work-order flow's `assertVesselAvailability`. On edit, the BL being changed is
 * excluded so its own quantity frees up first.
 */
async function assertVesselBlAvailability(
  tx: Prisma.TransactionClient,
  vesselId: string,
  blQuantity: number,
  excludeBlId?: string,
) {
  const vessel = await tx.doVessel.findUnique({
    where: { id: vesselId },
    select: { totalQuantity: true, name: true },
  });
  if (!vessel) throw new Error("The selected vessel no longer exists.");

  const agg = await tx.billOfLading.aggregate({
    where: {
      vesselId,
      ...(excludeBlId ? { id: { not: excludeBlId } } : {}),
    },
    _sum: { blQuantity: true },
  });
  const allocated = agg._sum.blQuantity?.toNumber() ?? 0;
  const available = vessel.totalQuantity.toNumber() - allocated;

  if (blQuantity > available) {
    throw new Error(
      `BL quantity exceeds ${vessel.name}'s availability — only ${formatQty(
        Math.max(available, 0),
      )} MT of its total is unallocated.`,
    );
  }
}

export async function createBillOfLading(input: BillOfLadingInput) {
  const session = await requireAdmin();
  const parsed = blSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { vesselId, blNumber, importerId, cargoTypeId, blQuantity } =
    parsed.data;
  try {
    await prisma.$transaction(
      async (tx) => {
        await assertVesselBlAvailability(tx, vesselId, blQuantity);
        await tx.billOfLading.create({
          data: {
            vesselId,
            blNumber,
            importerId,
            cargoTypeId,
            blQuantity,
            createdByName: session.user.name,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
    revalidateBl();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

export async function updateBillOfLading(id: string, input: BillOfLadingInput) {
  await requireAdmin();
  const parsed = blSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { vesselId, blNumber, importerId, cargoTypeId, blQuantity } =
    parsed.data;
  try {
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.billOfLading.findUnique({
          where: { id },
          select: {
            billOfEntryId: true,
            vesselId: true,
            importerId: true,
            cargoTypeId: true,
          },
        });
        if (!existing) throw new Error("This bill of lading no longer exists.");
        // A BL already inside a BE pins that BE's vessel/importer/cargo, so those
        // can't change here (quantity edits are still fine).
        if (
          existing.billOfEntryId &&
          (existing.vesselId !== vesselId ||
            existing.importerId !== importerId ||
            existing.cargoTypeId !== cargoTypeId)
        ) {
          throw new Error(
            "This BL is part of a bill of entry — remove it from that BE before changing its vessel, importer or cargo type.",
          );
        }
        await assertVesselBlAvailability(tx, vesselId, blQuantity, id);
        await tx.billOfLading.update({
          where: { id },
          data: { vesselId, blNumber, importerId, cargoTypeId, blQuantity },
        });

        // Shrinking a BL that's inside a BE lowers the combo's BE total — it must
        // still cover the combo's delivery orders. (Combo is pinned above, so the
        // existing vessel/importer/cargo equal the new ones here.)
        if (existing.billOfEntryId) {
          await assertBeCoversDos(tx, vesselId, importerId, cargoTypeId);
        }
      },
      { isolationLevel: "Serializable" },
    );
    revalidateBl();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

export async function deleteBillOfLading(id: string) {
  await requireAdmin();
  try {
    // Check-and-delete in one tx so a BE assignment can't land between them.
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.billOfLading.findUnique({
          where: { id },
          select: { billOfEntryId: true },
        });
        if (!existing) throw new Error("This bill of lading no longer exists.");
        if (existing.billOfEntryId) {
          throw new Error(
            "This BL is part of a bill of entry — remove it from that BE first.",
          );
        }
        await tx.billOfLading.delete({ where: { id } });
      },
      { isolationLevel: "Serializable" },
    );
    revalidateBl();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}
