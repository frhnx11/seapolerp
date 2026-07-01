import { formatQty } from "@/core/format";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Asserts Σ(DO quantity) ≤ Σ(BE quantity) for a (vessel, importer, cargo) combo
 * after a change that could REDUCE the BE side — releasing/deleting a bill of
 * entry, or shrinking a BL that's inside one. Throws if the combo's remaining
 * bills of entry no longer cover its existing delivery orders. The Σ DO ≤ Σ BE
 * invariant is otherwise only guarded from the DO side (`assertComboAvailability`
 * in delivery-order-actions.ts); this closes the BE/BL side. Run inside the
 * transaction so the aggregates reflect the just-applied change.
 */
export async function assertBeCoversDos(
  tx: Prisma.TransactionClient,
  vesselId: string,
  importerId: string,
  cargoTypeId: string,
) {
  const combo = { vesselId, importerId, cargoTypeId };

  const beAgg = await tx.billOfLading.aggregate({
    where: { ...combo, billOfEntryId: { not: null } },
    _sum: { blQuantity: true },
  });
  const beTotal = beAgg._sum.blQuantity?.toNumber() ?? 0;

  const doAgg = await tx.deliveryOrder.aggregate({
    where: combo,
    _sum: { doQuantity: true },
  });
  const allocated = doAgg._sum.doQuantity?.toNumber() ?? 0;

  if (allocated > beTotal) {
    throw new Error(
      `This change would leave only ${formatQty(beTotal)} MT of bills of entry covering ${formatQty(
        allocated,
      )} MT of delivery orders for this vessel/importer/cargo — reduce or remove those delivery orders first.`,
    );
  }
}
