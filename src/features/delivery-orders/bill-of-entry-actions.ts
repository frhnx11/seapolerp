"use server";

import { requireActionRole } from "@/core/auth/action-guards";
import { prisma } from "@/core/db";
import type { Prisma } from "@/generated/prisma/client";

import { assertBeCoversDos } from "./availability";
import {
  beCreateSchema,
  beUpdateSchema,
  type BillOfEntryCreateInput,
  type BillOfEntryUpdateInput,
} from "./bill-of-entry";
import { revalidateDelivery } from "./delivery-paths";

// Bills of entry are managed by both ADMIN and C&F.
const requireManage = () => requireActionRole("ADMIN", "C_AND_F");

// A BE change also restamps the "BE Number" column on the bills-of-lading page.
const revalidateBe = () =>
  revalidateDelivery("/bills-of-entry", "/bills-of-lading");

function toMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") {
      return "A bill of entry with this BE number already exists for this vessel.";
    }
    if (code === "P2003") {
      return "The selected vessel, importer or cargo type no longer exists.";
    }
    if (code === "P2034") {
      return "Another change to these bills of lading happened at the same time — please try again.";
    }
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

/**
 * Loads the selected BLs and asserts each one exists, matches the BE's
 * vessel/importer/cargo, and is assignable (unassigned, or already on this BE when
 * editing). Throws a clear message otherwise. Runs inside the transaction so the
 * checks and the assignment are atomic.
 */
async function assertBlsAssignable(
  tx: Prisma.TransactionClient,
  blIds: string[],
  filters: { vesselId: string; importerId: string; cargoTypeId: string },
  ownBeId?: string,
) {
  const bls = await tx.billOfLading.findMany({
    where: { id: { in: blIds } },
    select: {
      id: true,
      vesselId: true,
      importerId: true,
      cargoTypeId: true,
      billOfEntryId: true,
    },
  });
  if (bls.length !== blIds.length) {
    throw new Error("One or more selected bills of lading no longer exist.");
  }
  for (const bl of bls) {
    if (
      bl.vesselId !== filters.vesselId ||
      bl.importerId !== filters.importerId ||
      bl.cargoTypeId !== filters.cargoTypeId
    ) {
      throw new Error(
        "A selected bill of lading doesn't match this bill of entry's vessel, importer and cargo type.",
      );
    }
    if (bl.billOfEntryId && bl.billOfEntryId !== ownBeId) {
      throw new Error(
        "A selected bill of lading is already in another bill of entry — refresh and try again.",
      );
    }
  }
}

export async function createBillOfEntry(input: BillOfEntryCreateInput) {
  const session = await requireManage();
  const parsed = beCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { beNumber, vesselId, importerId, cargoTypeId, blIds } = parsed.data;
  try {
    await prisma.$transaction(
      async (tx) => {
        await assertBlsAssignable(tx, blIds, {
          vesselId,
          importerId,
          cargoTypeId,
        });
        const be = await tx.billOfEntry.create({
          data: {
            beNumber,
            vesselId,
            importerId,
            cargoTypeId,
            createdByName: session.user.name,
          },
        });
        await tx.billOfLading.updateMany({
          where: { id: { in: blIds } },
          data: { billOfEntryId: be.id },
        });
      },
      { isolationLevel: "Serializable" },
    );
    revalidateBe();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

export async function updateBillOfEntry(
  id: string,
  input: BillOfEntryUpdateInput,
) {
  await requireManage();
  const parsed = beUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { beNumber, blIds } = parsed.data;
  try {
    await prisma.$transaction(
      async (tx) => {
        const be = await tx.billOfEntry.findUnique({
          where: { id },
          select: {
            vesselId: true,
            importerId: true,
            cargoTypeId: true,
            billsOfLading: { select: { id: true } },
          },
        });
        if (!be) throw new Error("This bill of entry no longer exists.");

        await assertBlsAssignable(
          tx,
          blIds,
          {
            vesselId: be.vesselId,
            importerId: be.importerId,
            cargoTypeId: be.cargoTypeId,
          },
          id,
        );

        // Release BLs that were on this BE but are no longer selected.
        const keep = new Set(blIds);
        const releasedIds = be.billsOfLading
          .map((b) => b.id)
          .filter((bid) => !keep.has(bid));
        if (releasedIds.length > 0) {
          await tx.billOfLading.updateMany({
            where: { id: { in: releasedIds } },
            data: { billOfEntryId: null },
          });
        }
        // Assign the selected BLs (idempotent for ones already on this BE).
        await tx.billOfLading.updateMany({
          where: { id: { in: blIds } },
          data: { billOfEntryId: id },
        });
        await tx.billOfEntry.update({ where: { id }, data: { beNumber } });

        // Releasing BLs shrinks this combo's BE total — it must still cover the
        // combo's delivery orders.
        await assertBeCoversDos(tx, be.vesselId, be.importerId, be.cargoTypeId);
      },
      { isolationLevel: "Serializable" },
    );
    revalidateBe();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

export async function deleteBillOfEntry(id: string) {
  await requireManage();
  try {
    await prisma.$transaction(
      async (tx) => {
        const be = await tx.billOfEntry.findUnique({
          where: { id },
          select: { vesselId: true, importerId: true, cargoTypeId: true },
        });
        if (!be) throw new Error("This bill of entry no longer exists.");
        // The BL → BE relation is onDelete: SetNull, so member BLs are released.
        await tx.billOfEntry.delete({ where: { id } });
        // The released BLs no longer count toward the combo's BE total — it must
        // still cover the combo's delivery orders.
        await assertBeCoversDos(tx, be.vesselId, be.importerId, be.cargoTypeId);
      },
      { isolationLevel: "Serializable" },
    );
    revalidateBe();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}
