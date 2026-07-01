"use server";

import { requireActionRole } from "@/core/auth/action-guards";
import { prisma } from "@/core/db";
import { evaluateEditLock } from "@/core/edit-window";
import { formatQty } from "@/core/format";

import {
  createDoTruckOrderSchema,
  grossDoTruckOrderSchema,
  updateDoTruckOrderSchema,
  type CreateDoTruckOrderInput,
  type GrossDoTruckOrderInput,
  type UpdateDoTruckOrderInput,
} from "./do-truck-order";
import { normalizeVehicleNo } from "./do-truck";
import { revalidateDelivery } from "./delivery-paths";

// Truck DOs are the weighbridge data entry — managed by ADMIN + Port Admin.
const requireManage = () => requireActionRole("ADMIN", "PORT_WB");

// A truck-DO change can move the DO's Delivered/Balance and the vessel's
// Delivered, so refresh this DO's detail page plus the list + vessel pages
// across every portal that exposes them.
function revalidateDo(deliveryOrderId: string) {
  revalidateDelivery(`/orders/${deliveryOrderId}`, "/orders", "/vessels");
}

function toMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") {
      return "A truck with this number already exists — select it from the list instead.";
    }
    if (code === "P2003") {
      return "The selected delivery order or truck no longer exists.";
    }
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function createDoTruckOrder(input: CreateDoTruckOrderInput) {
  const session = await requireManage();
  const parsed = createDoTruckOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { deliveryOrderId, truckId, newVehicleNo, tareWeight } = parsed.data;
  try {
    await prisma.$transaction(
      async (tx) => {
        // Resolve the truck: reuse an existing registry entry, or create one now.
        let resolvedTruckId: string;
        if (newVehicleNo) {
          const truck = await tx.doTruck.create({
            data: {
              vehicleNo: normalizeVehicleNo(newVehicleNo),
              createdByName: session.user.name,
            },
            select: { id: true },
          });
          resolvedTruckId = truck.id;
        } else {
          const truck = await tx.doTruck.findUnique({
            where: { id: truckId! },
            select: { id: true },
          });
          if (!truck) throw new Error("The selected truck no longer exists.");
          resolvedTruckId = truck.id;
        }
        await tx.doTruckOrder.create({
          data: {
            deliveryOrderId,
            truckId: resolvedTruckId,
            tareWeight,
            createdByName: session.user.name,
            // Tare's "last updated" starts as the creator (first entry).
            tareByName: session.user.name,
            tareAt: new Date(),
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
    revalidateDo(deliveryOrderId);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

/** Edit a truck DO's tare. If gross is already set, net + DO.delivered recompute. */
export async function updateDoTruckOrder(
  id: string,
  input: UpdateDoTruckOrderInput,
) {
  const session = await requireManage();
  const isAdmin = session.user.role === "ADMIN";
  const parsed = updateDoTruckOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { deliveryOrderId, tareWeight } = parsed.data;
  try {
    await prisma.$transaction(
      async (tx) => {
        const trip = await tx.doTruckOrder.findUnique({
          where: { id },
          select: {
            deliveryOrderId: true,
            grossWeight: true,
            netWeight: true,
            createdAt: true,
          },
        });
        if (!trip) throw new Error("Truck DO not found.");
        // The trip's own DO is authoritative — never trust the client-supplied id
        // to move Delivered onto a different DO.
        if (trip.deliveryOrderId !== deliveryOrderId) {
          throw new Error(
            "This truck order belongs to a different delivery order — refresh and try again.",
          );
        }

        // Tare's edit window is anchored on the row's creation (tare first entry).
        const lock = evaluateEditLock({
          firstEnteredAt: trip.createdAt,
          isAdmin,
          invoiced: false,
          now: Date.now(),
        });
        if (!lock.canEdit) throw new Error(lock.reason ?? "Editing is locked.");

        const stamps = { tareByName: session.user.name, tareAt: new Date() };

        if (trip.grossWeight === null) {
          await tx.doTruckOrder.update({
            where: { id },
            data: { tareWeight, ...stamps },
          });
          return;
        }

        // Gross already recorded — re-derive net and re-balance DO.delivered.
        const gross = trip.grossWeight.toNumber();
        if (tareWeight >= gross) {
          throw new Error(
            `Tare must be less than the gross weight (${formatQty(gross)} MT).`,
          );
        }
        const newNet = gross - tareWeight;
        const oldNet = trip.netWeight?.toNumber() ?? 0;
        const order = await tx.deliveryOrder.findUnique({
          where: { id: deliveryOrderId },
          select: { doQuantity: true, delivered: true },
        });
        if (!order) throw new Error("Delivery order not found.");
        const headroom =
          order.doQuantity.toNumber() - order.delivered.toNumber() + oldNet;
        if (newNet > headroom) {
          throw new Error(
            `Net weight (${formatQty(newNet)} MT) exceeds the delivery order's remaining balance (${formatQty(headroom)} MT).`,
          );
        }
        await tx.doTruckOrder.update({
          where: { id },
          data: { tareWeight, netWeight: newNet, ...stamps },
        });
        await tx.deliveryOrder.update({
          where: { id: deliveryOrderId },
          data: { delivered: { increment: newNet - oldNet } },
        });
      },
      { isolationLevel: "Serializable" },
    );
    revalidateDo(deliveryOrderId);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

/** Record/edit a truck DO's gross weight; net = gross − tare rolls into DO.delivered. */
export async function recordDoGross(id: string, input: GrossDoTruckOrderInput) {
  const session = await requireManage();
  const isAdmin = session.user.role === "ADMIN";
  const parsed = grossDoTruckOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { deliveryOrderId, grossWeight } = parsed.data;
  try {
    await prisma.$transaction(
      async (tx) => {
        const trip = await tx.doTruckOrder.findUnique({
          where: { id },
          select: {
            deliveryOrderId: true,
            tareWeight: true,
            netWeight: true,
            grossFirstAt: true,
          },
        });
        if (!trip) throw new Error("Truck DO not found.");
        // The trip's own DO is authoritative — never trust the client-supplied id
        // to move Delivered onto a different DO.
        if (trip.deliveryOrderId !== deliveryOrderId) {
          throw new Error(
            "This truck order belongs to a different delivery order — refresh and try again.",
          );
        }

        // Gross's edit window is anchored on its first entry (null = first entry,
        // always allowed).
        const lock = evaluateEditLock({
          firstEnteredAt: trip.grossFirstAt,
          isAdmin,
          invoiced: false,
          now: Date.now(),
        });
        if (!lock.canEdit) throw new Error(lock.reason ?? "Editing is locked.");

        const tare = trip.tareWeight.toNumber();
        if (grossWeight <= tare) {
          throw new Error(
            `Gross weight must be greater than the tare (${formatQty(tare)} MT).`,
          );
        }
        const net = grossWeight - tare;
        const oldNet = trip.netWeight?.toNumber() ?? 0;

        const order = await tx.deliveryOrder.findUnique({
          where: { id: deliveryOrderId },
          select: { doQuantity: true, delivered: true },
        });
        if (!order) throw new Error("Delivery order not found.");
        const headroom =
          order.doQuantity.toNumber() - order.delivered.toNumber() + oldNet;
        if (net > headroom) {
          throw new Error(
            `Net weight (${formatQty(net)} MT) exceeds the delivery order's remaining balance (${formatQty(headroom)} MT).`,
          );
        }

        const now = new Date();
        await tx.doTruckOrder.update({
          where: { id },
          data: {
            grossWeight,
            netWeight: net,
            grossByName: session.user.name,
            grossAt: now,
            // Immutable first-entry stamp (the gross window anchor), set once.
            ...(trip.grossFirstAt === null
              ? { grossFirstByName: session.user.name, grossFirstAt: now }
              : {}),
          },
        });
        await tx.deliveryOrder.update({
          where: { id: deliveryOrderId },
          data: { delivered: { increment: net - oldNet } },
        });
      },
      { isolationLevel: "Serializable" },
    );
    revalidateDo(deliveryOrderId);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

export async function deleteDoTruckOrder(id: string, deliveryOrderId: string) {
  const session = await requireManage();
  const isAdmin = session.user.role === "ADMIN";
  try {
    await prisma.$transaction(
      async (tx) => {
        const trip = await tx.doTruckOrder.findUnique({
          where: { id },
          select: { deliveryOrderId: true, netWeight: true, createdAt: true },
        });
        if (!trip) throw new Error("Truck DO not found.");
        // The trip's own DO is authoritative — never trust the client-supplied id
        // to move Delivered off a different DO.
        if (trip.deliveryOrderId !== deliveryOrderId) {
          throw new Error(
            "This truck order belongs to a different delivery order — refresh and try again.",
          );
        }

        // Deleting is a change — same 30-min window as tare (anchored on creation).
        const lock = evaluateEditLock({
          firstEnteredAt: trip.createdAt,
          isAdmin,
          invoiced: false,
          now: Date.now(),
        });
        if (!lock.canEdit) throw new Error(lock.reason ?? "Editing is locked.");

        await tx.doTruckOrder.delete({ where: { id } });
        const net = trip.netWeight?.toNumber() ?? 0;
        if (net > 0) {
          await tx.deliveryOrder.update({
            where: { id: deliveryOrderId },
            data: { delivered: { decrement: net } },
          });
        }
      },
      { isolationLevel: "Serializable" },
    );
    revalidateDo(deliveryOrderId);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}
