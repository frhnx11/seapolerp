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

function revalidateTruckOrderPaths(workOrderId: string) {
  revalidatePath(`/admin/work-orders/${workOrderId}/truck-orders`);
  revalidatePath(`/port-weighbridge/work-orders/${workOrderId}/truck-orders`);
  revalidatePath(`/party-weighbridge/work-orders/${workOrderId}/truck-orders`);
  revalidatePath(`/accountant/work-orders/${workOrderId}/truck-orders`);
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
 * Loads a trip and enforces the stage sequence: stage `k` (0-based) may be
 * recorded once all earlier stages are done (progress ≥ k − 1). Re-recording
 * an already-done stage is an edit, allowed until the party's net weight
 * received closes the trip.
 */
async function loadTruckOrderForStage(tripId: string, stage: number) {
  const trip = await prisma.truckOrder.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      workOrderId: true,
      status: true,
      netWeightReceived: true,
    },
  });
  if (!trip) throw new Error("Truck order not found");
  if (trip.netWeightReceived !== null) {
    throw new Error(
      "Net weight received has been recorded — this trip is closed and can no longer be edited.",
    );
  }

  const progress = truckOrderStatusIndex(trip.status);
  if (progress < stage - 1) {
    throw new Error("Earlier stages must be completed first.");
  }
  // Advance the status only forward; edits to earlier stages keep it as-is.
  const nextStatus = progress < stage ? TRUCK_ORDER_STATUSES[stage] : undefined;
  return { trip, nextStatus };
}

/** Stage 1 (weighbridge in): creates the trip row with the tare weight. */
export async function createTruckOrder(
  workOrderId: string,
  input: CreateTruckOrderInput,
) {
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
    const [workOrder, allotment, truck] = await Promise.all([
      prisma.workOrder.findUnique({
        where: { id: workOrderId },
        select: { id: true },
      }),
      prisma.workOrderTruck.findUnique({
        where: { workOrderId_truckId: { workOrderId, truckId } },
        select: { id: true, blocked: true },
      }),
      prisma.truck.findUnique({
        where: { id: truckId },
        select: { status: true, vehicleNo: true },
      }),
    ]);

    if (!workOrder) {
      return { ok: false as const, error: "Work order not found" };
    }
    if (!truck) {
      return { ok: false as const, error: "Truck not found" };
    }
    if (!allotment) {
      return {
        ok: false as const,
        error: `${truck.vehicleNo} is not allotted to this work order.`,
      };
    }
    if (truck.status === "BLOCKED") {
      return {
        ok: false as const,
        error: `${truck.vehicleNo} is blocked and can't make trips.`,
      };
    }
    if (allotment.blocked) {
      return {
        ok: false as const,
        error: `${truck.vehicleNo} is blocked for this work order.`,
      };
    }

    const created = await prisma.truckOrder.create({
      data: {
        workOrderId,
        truckId,
        tareWeight,
        tareByName: session.user.name,
        tareAt: new Date(),
      },
      select: { id: true, seq: true },
    });

    revalidateTruckOrderPaths(workOrderId);
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

    const trip = await prisma.truckOrder.findUnique({
      where: { id: tripId },
      select: { workOrderId: true },
    });
    if (!trip) return { ok: false as const, error: "Truck order not found" };

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

    revalidateTruckOrderPaths(trip.workOrderId);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

/** Edit the tare while the trip is open (locks once COMPLETED — net depends on it). */
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

  try {
    // Serializable so a tare edit can't race a concurrent gross completion
    // (which reads the tare to compute the net).
    let workOrderId = "";
    await prisma.$transaction(
      async (tx) => {
        const trip = await tx.truckOrder.findUnique({
          where: { id: tripId },
          select: { workOrderId: true, status: true },
        });
        if (!trip) throw new Error("Truck order not found");
        if (trip.status === "COMPLETED") {
          throw new Error(
            "This trip is completed — the tare weight is locked because the net has already been delivered.",
          );
        }
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

    revalidateTruckOrderPaths(workOrderId);
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
    await prisma.truckOrder.update({
      where: { id: tripId },
      data: {
        loadingSiteId: parsed.data.loadingSiteId,
        loadingSlipByName: session.user.name,
        loadingSlipAt: new Date(),
        ...(nextStatus ? { status: nextStatus } : {}),
      },
    });

    revalidateTruckOrderPaths(trip.workOrderId);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

/**
 * Stage 3 (weighbridge out): gross weight → net = gross − tare is added to the
 * work order's delivered quantity and the trip completes. Gross/VT stay
 * editable after completion — each edit adjusts the work order's delivered by
 * the net delta — until the party's net weight received is recorded, which
 * closes the trip and locks its weights.
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
    const { vtNumber, grossWeight } = parsed.data;

    const existing = await prisma.truckOrder.findUnique({
      where: { id: tripId },
      select: { workOrderId: true },
    });
    if (!existing)
      return { ok: false as const, error: "Truck order not found" };

    await prisma.$transaction(
      async (tx) => {
        const trip = await tx.truckOrder.findUnique({
          where: { id: tripId },
          select: {
            status: true,
            tareWeight: true,
            netWeight: true,
            netWeightReceived: true,
            workOrderId: true,
            workOrder: { select: { doQuantity: true, delivered: true } },
          },
        });
        if (!trip) throw new Error("Truck order not found");
        if (truckOrderStatusIndex(trip.status) < 1) {
          throw new Error("Earlier stages must be completed first.");
        }
        if (trip.netWeightReceived !== null) {
          throw new Error(
            "Net weight received has been recorded — this trip is closed and its weights are locked.",
          );
        }

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

        // On an edit the trip's own previous net frees up before the new one
        // is checked against the work order's remaining balance.
        const net = grossWeight - tare;
        const oldNet = trip.netWeight?.toNumber() ?? 0;
        const headroom =
          trip.workOrder.doQuantity.toNumber() -
          trip.workOrder.delivered.toNumber() +
          oldNet;
        if (net > headroom) {
          throw new Error(
            `Net weight (${formatQty(net)} MT) exceeds this work order's remaining balance (${formatQty(headroom)} MT).`,
          );
        }

        await tx.truckOrder.update({
          where: { id: tripId },
          data: {
            vtNumber,
            grossWeight,
            netWeight: net,
            completedByName: session.user.name,
            completedAt: new Date(),
            status: "COMPLETED",
          },
        });
        await tx.workOrder.update({
          where: { id: trip.workOrderId },
          data: { delivered: { increment: net - oldNet } },
        });
      },
      { isolationLevel: "Serializable" },
    );

    // Delivered changed — refresh the WO pages too.
    revalidateTruckOrderPaths(existing.workOrderId);
    revalidatePath("/admin/work-orders");
    revalidatePath(`/admin/work-orders/${existing.workOrderId}`);
    revalidatePath("/port-weighbridge/work-orders");
    revalidatePath(`/port-weighbridge/work-orders/${existing.workOrderId}`);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

/**
 * Party weighbridge: net weight received at the destination. Only allowed once
 * the trip is COMPLETED at the port; re-saving is a correction (stamps update,
 * nothing else changes — WO totals stay driven by the port's net).
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
    // Invoiced amounts must never drift — the weight is billed already.
    if (trip.invoiceId) {
      return {
        ok: false as const,
        error:
          "This trip is on an invoice — edit or delete that invoice first.",
      };
    }

    await prisma.truckOrder.update({
      where: { id: tripId },
      data: {
        netWeightReceived: parsed.data.netWeightReceived,
        netReceivedByName: session.user.name,
        netReceivedAt: new Date(),
      },
    });

    // Net received vs net sent over tolerance → notify every admin. Best-effort:
    // a notification failure must never fail the weighbridge save.
    try {
      const netSent = trip.netWeight?.toNumber() ?? null;
      if (isNetDiscrepancy(netSent, parsed.data.netWeightReceived)) {
        const admins = await prisma.user.findMany({
          where: { role: "ADMIN" },
          select: { id: true },
        });
        if (admins.length > 0) {
          await prisma.notification.createMany({
            data: admins.map((a) => ({
              userId: a.id,
              truckOrderId: tripId,
              workOrderSeq: trip.workOrder.seq,
              vehicleNo: trip.truck.vehicleNo,
            })),
            skipDuplicates: true,
          });
        }
      }
    } catch {
      // Ignore — the received weight is saved regardless.
    }

    revalidateTruckOrderPaths(trip.workOrderId);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}
