"use server";

import { revalidatePath } from "next/cache";

import { requireActionRole } from "@/core/auth/action-guards";
import { prisma } from "@/core/db";
import { type Prisma } from "@/generated/prisma/client";

import {
  computeInvoiceTotals,
  type InvoiceInput,
  invoiceInputSchema,
  totalLowestNet,
} from "./invoice-lib";

/** Invoicing is the accountant's job; admin can also act/correct. */
const requireAccounts = () => requireActionRole("ADMIN", "ACCOUNTANT");

function revalidateInvoicePaths(workOrderId: string) {
  revalidatePath(`/accountant/work-orders/${workOrderId}/invoices`);
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
  return error instanceof Error ? error.message : "Something went wrong";
}

/**
 * Loads the selected trips and enforces every invoicing rule in one place:
 * same work order, settled (COMPLETED + received), and either a free trip of
 * the chosen owner's trucks or a trip already on `allowInvoiceId` (the
 * invoice being edited — matched by id, not owner name, so renaming a truck
 * owner can never strand an invoice's own trips). Throws when any selected
 * trip fails a rule.
 */
async function loadBillableTrips(
  tx: Prisma.TransactionClient,
  workOrderId: string,
  tripIds: string[],
  truckOwner: string,
  allowInvoiceId: string | null,
) {
  const trips = await tx.truckOrder.findMany({
    where: {
      id: { in: tripIds },
      workOrderId,
      status: "COMPLETED",
      netWeightReceived: { not: null },
      OR: [
        { invoiceId: null, truck: { owner: { name: truckOwner } } },
        ...(allowInvoiceId ? [{ invoiceId: allowInvoiceId }] : []),
      ],
    },
    select: { id: true, netWeight: true, netWeightReceived: true },
  });
  if (trips.length !== new Set(tripIds).size) {
    throw new Error(
      "Some selected trips are no longer available for this invoice — refresh and try again.",
    );
  }
  return trips.map((t) => ({
    id: t.id,
    netWeight: t.netWeight!.toNumber(),
    netWeightReceived: t.netWeightReceived!.toNumber(),
  }));
}

/** Creates an invoice, snapshotting the party's current ₹/MT rate forever. */
export async function createInvoice(workOrderId: string, input: InvoiceInput) {
  try {
    const session = await requireAccounts();
    const parsed = invoiceInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    const { date, truckOwner, tripIds, discountPct } = parsed.data;

    const created = await prisma.$transaction(
      async (tx) => {
        const workOrder = await tx.workOrder.findUnique({
          where: { id: workOrderId },
          select: { id: true, party: { select: { name: true, rate: true } } },
        });
        if (!workOrder) throw new Error("Work order not found");
        if (workOrder.party.rate === null) {
          throw new Error(
            `${workOrder.party.name} has no rate set — an admin must set it in Master Data first.`,
          );
        }
        const rate = workOrder.party.rate.toNumber();

        const trips = await loadBillableTrips(
          tx,
          workOrderId,
          tripIds,
          truckOwner,
          null,
        );
        const totalQty = totalLowestNet(trips);
        const { amount, finalAmount } = computeInvoiceTotals(
          totalQty,
          rate,
          discountPct,
        );

        const invoice = await tx.invoice.create({
          data: {
            workOrderId,
            date,
            truckOwner,
            rate,
            totalQty,
            amount,
            discountPct,
            finalAmount,
            createdByName: session.user.name,
          },
          select: { id: true, seq: true },
        });

        // Claim the trips; the invoiceId:null condition catches a concurrent
        // invoice racing for the same trips.
        const claimed = await tx.truckOrder.updateMany({
          where: { id: { in: tripIds }, invoiceId: null },
          data: { invoiceId: invoice.id },
        });
        if (claimed.count !== trips.length) {
          throw new Error(
            "Some trips were just added to another invoice — refresh and try again.",
          );
        }
        return invoice;
      },
      { isolationLevel: "Serializable" },
    );

    revalidateInvoicePaths(workOrderId);
    return { ok: true as const, seq: created.seq };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

/**
 * Edits an invoice through the same wizard. Recomputes every figure with the
 * invoice's ORIGINAL stored rate — admin rate changes never touch existing
 * invoices, edited or not.
 */
export async function updateInvoice(invoiceId: string, input: InvoiceInput) {
  try {
    await requireAccounts();
    const parsed = invoiceInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    const { date, truckOwner, tripIds, discountPct } = parsed.data;

    const updated = await prisma.$transaction(
      async (tx) => {
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
          select: {
            id: true,
            seq: true,
            workOrderId: true,
            rate: true,
            truckOwner: true,
          },
        });
        if (!invoice) throw new Error("Invoice not found");
        const rate = invoice.rate.toNumber();

        // The invoice's own trips stay claimable only while the owner
        // selection is unchanged — switching owners must start from free
        // trips, so one invoice can never mix two owners' trucks.
        const trips = await loadBillableTrips(
          tx,
          invoice.workOrderId,
          tripIds,
          truckOwner,
          truckOwner === invoice.truckOwner ? invoiceId : null,
        );

        // Release the current set, then claim the new one (count-checked).
        await tx.truckOrder.updateMany({
          where: { invoiceId },
          data: { invoiceId: null },
        });
        const claimed = await tx.truckOrder.updateMany({
          where: { id: { in: tripIds }, invoiceId: null },
          data: { invoiceId },
        });
        if (claimed.count !== trips.length) {
          throw new Error(
            "Some trips were just added to another invoice — refresh and try again.",
          );
        }

        const totalQty = totalLowestNet(trips);
        const { amount, finalAmount } = computeInvoiceTotals(
          totalQty,
          rate,
          discountPct,
        );
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            date,
            truckOwner,
            totalQty,
            amount,
            discountPct,
            finalAmount,
          },
        });
        return invoice;
      },
      { isolationLevel: "Serializable" },
    );

    revalidateInvoicePaths(updated.workOrderId);
    return { ok: true as const, seq: updated.seq };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}

/** Deletes an invoice; the DB frees its trips (invoice_id SET NULL). */
export async function deleteInvoice(invoiceId: string) {
  try {
    await requireAccounts();
    const invoice = await prisma.invoice.delete({
      where: { id: invoiceId },
      select: { workOrderId: true },
    });
    revalidateInvoicePaths(invoice.workOrderId);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error) };
  }
}
