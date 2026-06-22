"use server";

import { revalidatePath } from "next/cache";

import { requireActionRole } from "@/core/auth/action-guards";
import { prisma } from "@/core/db";
import { formatQty } from "@/core/format";

import {
  type CreateTruckOrderInput,
  createTruckOrderSchema,
  type EditTareInput,
  editTareSchema,
  evaluateEditLock,
  formatTruckOrderNo,
  type GrossInput,
  grossSchema,
  isNetDiscrepancy,
  type LoadingSlipInput,
  loadingSlipSchema,
  type NetReceivedInput,
  netReceivedSchema,
  TRUCK_ORDER_STATUSES,
  truckOrderStatusIndex,
} from "./truck-order-lib";

/** Trip operations are performed by port staff; admin can also act/correct. */
const requirePortOps = () => requireActionRole("ADMIN", "PORT_WB");

const TRUCK_ORDER_PORTALS = [
  "admin",
  "port-weighbridge",
  "party-weighbridge",
  "accountant",
];

/** The four top-level Truck Orders pages — the new data-entry surface. */
function revalidateGlobalTruckOrderPaths() {
  for (const portal of TRUCK_ORDER_PORTALS) {
    revalidatePath(`/${portal}/truck-orders`);
  }
}

/** A work order's (read-only) per-WO truck-orders pages across every portal. */
function revalidateWoTruckOrderPaths(workOrderId: string) {
  for (const portal of TRUCK_ORDER_PORTALS) {
    revalidatePath(`/${portal}/work-orders/${workOrderId}/truck-orders`);
  }
}

function toMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2034"
  ) {
    return "Another change happened at the same time — please try again.";
  }
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    return "That VT number is already in use.";
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

/**
 * Loads a trip and enforces the stage *entry* sequence: stage `k` (0-based) may
 * be recorded once all earlier stages are done (progress ≥ k − 1). Whether an
 * already-entered value may still be *edited* is the caller's 30-minute-window
 * check (`evaluateEditLock`), not this helper's concern.
 */
async function loadTruckOrderForStage(tripId: string, stage: number) {
  const trip = await prisma.truckOrder.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      workOrderId: true,
      status: true,
      loadingSlipFirstAt: true,
      invoiceId: true,
    },
  });
  if (!trip) throw new Error("Truck order not found");

  const progress = truckOrderStatusIndex(trip.status);
  if (progress < stage - 1) {
    throw new Error("Earlier stages must be completed first.");
  }
  // Advance the status only forward; edits to earlier stages keep it as-is.
  const nextStatus = progress < stage ? TRUCK_ORDER_STATUSES[stage] : undefined;
  return { trip, nextStatus };
}

/**
 * Stage 1 (weighbridge in): creates the trip row with the tare weight. The work
 * order isn't known yet — it's assigned later at the gross stage. The truck must
 * be in the global allotted pool and not blocked.
 */
export async function createTruckOrder(input: CreateTruckOrderInput) {
  let session;
  try {
    session = await requirePortOps();
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }

  const parsed = createTruckOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { truckId, tareWeight } = parsed.data;

  try {
    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      select: {
        status: true,
        vehicleNo: true,
        allotment: { select: { id: true } },
      },
    });

    if (!truck) {
      return { ok: false as const, error: "Truck not found" };
    }
    if (truck.status === "BLOCKED") {
      return {
        ok: false as const,
        error: `${truck.vehicleNo} is blocked and can't make trips.`,
      };
    }
    if (!truck.allotment) {
      return {
        ok: false as const,
        error: `${truck.vehicleNo} is not in the allotted trucks pool.`,
      };
    }

    const created = await prisma.truckOrder.create({
      data: {
        truckId,
        tareWeight,
        tareByName: session.user.name,
        tareAt: new Date(),
        // First-entry stamp (immutable) — tare is entered at creation.
        tareFirstByName: session.user.name,
      },
      select: { id: true, seq: true },
    });

    revalidateGlobalTruckOrderPaths();
    return { ok: true as const, tripId: created.id, seq: created.seq };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

/**
 * Deletes a mistaken trip — only while it is still at the tare stage. Once a
 * loading slip is issued (a numbered document) or a weighment is recorded,
 * the trip is part of the record and can no longer be deleted. The status
 * condition on the delete itself makes the check race-safe.
 */
export async function deleteTruckOrder(tripId: string) {
  try {
    await requirePortOps();

    // A trip is deletable only at the tare stage, when it has no work order yet,
    // so only the global Truck Orders pages need refreshing. The status condition
    // on the delete itself makes the check race-safe.
    const deleted = await prisma.truckOrder.deleteMany({
      where: { id: tripId, status: "TARE_RECORDED" },
    });
    if (deleted.count === 0) {
      return {
        ok: false as const,
        error:
          "This trip has a loading slip or weighment recorded — it can no longer be deleted.",
      };
    }

    revalidateGlobalTruckOrderPaths();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

/** Edit the tare within its 30-minute window (anchored at trip creation). */
export async function updateTare(tripId: string, input: EditTareInput) {
  let session;
  try {
    session = await requirePortOps();
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }

  const parsed = editTareSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { tareWeight } = parsed.data;
  const isAdmin = session.user.role === "ADMIN";

  try {
    // Serializable so a tare edit can't race a concurrent gross completion
    // (which reads the tare to compute the net).
    let workOrderId: string | null = null;
    await prisma.$transaction(
      async (tx) => {
        const trip = await tx.truckOrder.findUnique({
          where: { id: tripId },
          select: { workOrderId: true, createdAt: true, invoiceId: true },
        });
        if (!trip) throw new Error("Truck order not found");
        const lock = evaluateEditLock({
          firstEnteredAt: trip.createdAt,
          isAdmin,
          invoiced: trip.invoiceId !== null,
          now: Date.now(),
        });
        if (!lock.canEdit) throw new Error(lock.reason ?? "Editing is locked.");
        workOrderId = trip.workOrderId;

        await tx.truckOrder.update({
          where: { id: tripId },
          data: {
            tareWeight,
            tareByName: session.user.name,
            tareAt: new Date(),
          },
        });
      },
      { isolationLevel: "Serializable" },
    );

    revalidateGlobalTruckOrderPaths();
    if (workOrderId) revalidateWoTruckOrderPaths(workOrderId);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

/** Stage 2: cargo loading slip — loading site + slip serial. */
export async function recordLoadingSlip(
  tripId: string,
  input: LoadingSlipInput,
) {
  try {
    const session = await requirePortOps();
    const parsed = loadingSlipSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }

    const { trip, nextStatus } = await loadTruckOrderForStage(tripId, 1);
    const lock = evaluateEditLock({
      firstEnteredAt: trip.loadingSlipFirstAt,
      isAdmin: session.user.role === "ADMIN",
      invoiced: trip.invoiceId !== null,
      now: Date.now(),
    });
    if (!lock.canEdit) {
      return { ok: false as const, error: lock.reason ?? "Editing is locked." };
    }

    await prisma.truckOrder.update({
      where: { id: tripId },
      data: {
        loadingSiteId: parsed.data.loadingSiteId,
        loadingSlipByName: session.user.name,
        loadingSlipAt: new Date(),
        // First-entry stamp (immutable) — set once, anchors the edit window.
        ...(trip.loadingSlipFirstAt === null
          ? {
              loadingSlipFirstAt: new Date(),
              loadingSlipFirstByName: session.user.name,
            }
          : {}),
        ...(nextStatus ? { status: nextStatus } : {}),
      },
    });

    revalidateGlobalTruckOrderPaths();
    if (trip.workOrderId) revalidateWoTruckOrderPaths(trip.workOrderId);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

/**
 * Stage 3 (weighbridge out): the operator picks the work order, then records the
 * VT number and gross weight. net = gross − tare is added to the chosen work
 * order's delivered quantity and the trip completes. The work order, VT and gross
 * stay editable for 30 minutes after first entry (admins until the trip is
 * invoiced) — each edit re-balances delivered, moving it between work orders if
 * the selection changes.
 */
export async function recordGross(tripId: string, input: GrossInput) {
  try {
    const session = await requirePortOps();
    const parsed = grossSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    const { workOrderId, vtNumber, grossWeight } = parsed.data;

    // The target WO always needs a refresh; a re-map also touches the old one.
    const affectedWorkOrderIds = new Set<string>([workOrderId]);

    await prisma.$transaction(
      async (tx) => {
        const trip = await tx.truckOrder.findUnique({
          where: { id: tripId },
          select: {
            status: true,
            tareWeight: true,
            netWeight: true,
            grossFirstAt: true,
            invoiceId: true,
            workOrderId: true,
          },
        });
        if (!trip) throw new Error("Truck order not found");
        if (truckOrderStatusIndex(trip.status) < 1) {
          throw new Error("Earlier stages must be completed first.");
        }
        const lock = evaluateEditLock({
          firstEnteredAt: trip.grossFirstAt,
          isAdmin: session.user.role === "ADMIN",
          invoiced: trip.invoiceId !== null,
          now: Date.now(),
        });
        if (!lock.canEdit) throw new Error(lock.reason ?? "Editing is locked.");

        // VT number is a search key — keep it unique across all trips.
        const dup = await tx.truckOrder.findFirst({
          where: { vtNumber, id: { not: tripId } },
          select: { seq: true },
        });
        if (dup) {
          throw new Error(
            `VT# ${vtNumber} is already used by ${formatTruckOrderNo(dup.seq)}.`,
          );
        }

        const tare = trip.tareWeight.toNumber();
        if (grossWeight <= tare) {
          throw new Error(
            `Gross weight must be greater than the tare (${formatQty(tare)} MT).`,
          );
        }

        const net = grossWeight - tare;
        const oldNet = trip.netWeight?.toNumber() ?? 0;
        const previousWorkOrderId = trip.workOrderId;
        const sameWorkOrder = previousWorkOrderId === workOrderId;

        const target = await tx.workOrder.findUnique({
          where: { id: workOrderId },
          select: { doQuantity: true, delivered: true },
        });
        if (!target) throw new Error("Work order not found");

        // On a same-WO edit the trip's own previous net frees up first; on a
        // (re)assignment the full net must fit the target's remaining balance.
        const headroom =
          target.doQuantity.toNumber() -
          target.delivered.toNumber() +
          (sameWorkOrder ? oldNet : 0);
        if (net > headroom) {
          throw new Error(
            `Net weight (${formatQty(net)} MT) exceeds the selected work order's remaining balance (${formatQty(headroom)} MT).`,
          );
        }

        await tx.truckOrder.update({
          where: { id: tripId },
          data: {
            workOrderId,
            vtNumber,
            grossWeight,
            netWeight: net,
            completedByName: session.user.name,
            completedAt: new Date(),
            // First-entry stamp (immutable) — set once, anchors the edit window.
            ...(trip.grossFirstAt === null
              ? {
                  grossFirstAt: new Date(),
                  grossFirstByName: session.user.name,
                }
              : {}),
            status: "COMPLETED",
          },
        });

        if (sameWorkOrder) {
          await tx.workOrder.update({
            where: { id: workOrderId },
            data: { delivered: { increment: net - oldNet } },
          });
        } else {
          // Re-map: credit the previous WO back (if any), charge the new one.
          if (previousWorkOrderId) {
            affectedWorkOrderIds.add(previousWorkOrderId);
            await tx.workOrder.update({
              where: { id: previousWorkOrderId },
              data: { delivered: { decrement: oldNet } },
            });
          }
          await tx.workOrder.update({
            where: { id: workOrderId },
            data: { delivered: { increment: net } },
          });
        }
      },
      { isolationLevel: "Serializable" },
    );

    // Delivered changed — refresh the global grid plus each affected WO's pages.
    revalidateGlobalTruckOrderPaths();
    revalidatePath("/admin/work-orders");
    revalidatePath("/port-weighbridge/work-orders");
    for (const id of affectedWorkOrderIds) {
      revalidateWoTruckOrderPaths(id);
      revalidatePath(`/admin/work-orders/${id}`);
      revalidatePath(`/port-weighbridge/work-orders/${id}`);
    }
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

/**
 * Party weighbridge: net weight received at the destination. Only allowed once
 * the trip is COMPLETED at the port; editable for 30 minutes after first entry
 * (admins until the trip is invoiced). Re-saving is a correction — the stamps
 * update, nothing else changes (WO totals stay driven by the port's net).
 */
export async function recordNetReceived(
  tripId: string,
  input: NetReceivedInput,
) {
  try {
    const session = await requireActionRole("ADMIN", "PARTY_WB");
    const parsed = netReceivedSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }

    const trip = await prisma.truckOrder.findUnique({
      where: { id: tripId },
      select: {
        status: true,
        workOrderId: true,
        invoiceId: true,
        netWeight: true,
        netReceivedFirstAt: true,
        workOrder: { select: { seq: true } },
        truck: { select: { vehicleNo: true } },
      },
    });
    if (!trip) return { ok: false as const, error: "Truck order not found" };
    if (trip.status !== "COMPLETED") {
      return {
        ok: false as const,
        error: "The trip must be completed at the port first.",
      };
    }
    // 30-minute window after first entry; an invoiced trip is locked for all
    // (the weight is billed and must never drift).
    const lock = evaluateEditLock({
      firstEnteredAt: trip.netReceivedFirstAt,
      isAdmin: session.user.role === "ADMIN",
      invoiced: trip.invoiceId !== null,
      now: Date.now(),
    });
    if (!lock.canEdit) {
      return { ok: false as const, error: lock.reason ?? "Editing is locked." };
    }

    await prisma.truckOrder.update({
      where: { id: tripId },
      data: {
        netWeightReceived: parsed.data.netWeightReceived,
        netReceivedByName: session.user.name,
        netReceivedAt: new Date(),
        // First-entry stamp (immutable) — set once, anchors the edit window.
        ...(trip.netReceivedFirstAt === null
          ? {
              netReceivedFirstAt: new Date(),
              netReceivedFirstByName: session.user.name,
            }
          : {}),
      },
    });

    // Net received vs net sent over tolerance → notify every admin. Best-effort:
    // a notification failure must never fail the weighbridge save. (A COMPLETED
    // trip always has a work order, but guard for the type all the same.)
    try {
      const netSent = trip.netWeight?.toNumber() ?? null;
      if (
        trip.workOrder &&
        isNetDiscrepancy(netSent, parsed.data.netWeightReceived)
      ) {
        const admins = await prisma.user.findMany({
          where: { role: "ADMIN" },
          select: { id: true },
        });
        if (admins.length > 0) {
          await prisma.notification.createMany({
            data: admins.map((a) => ({
              userId: a.id,
              truckOrderId: tripId,
              workOrderSeq: trip.workOrder!.seq,
              vehicleNo: trip.truck.vehicleNo,
            })),
            skipDuplicates: true,
          });
        }
      }
    } catch {
      // Ignore — the received weight is saved regardless.
    }

    revalidateGlobalTruckOrderPaths();
    if (trip.workOrderId) revalidateWoTruckOrderPaths(trip.workOrderId);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}
