import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/core/db";
import { getTodayIso } from "@/features/trucks/truck";
import { fetchWoHeader } from "@/features/work-orders/wo-header";
import { formatWoNumber } from "@/features/work-orders/work-order";

import { type CandidateTrip, type InvoiceListRow } from "./invoice-lib";
import { WoInvoicesClient } from "./wo-invoices-client";

/** Invoices for a work order — list + create/edit wizard (accountant + admin). */
export async function WoInvoicesScreen({
  id,
  basePath,
}: {
  id: string;
  basePath: string;
}) {
  const workOrder = await fetchWoHeader(id);
  if (!workOrder) notFound();

  const [invoices, settledTrips, woParty] = await Promise.all([
    prisma.invoice.findMany({
      where: { workOrderId: workOrder.id },
      orderBy: { seq: "desc" },
      include: { truckOrders: { select: { id: true } } },
    }),
    // Every settled trip (billable or already invoiced) — the wizard offers
    // the free ones plus, in edit mode, the edited invoice's own trips.
    prisma.truckOrder.findMany({
      where: {
        workOrderId: workOrder.id,
        status: "COMPLETED",
        netWeightReceived: { not: null },
      },
      orderBy: { seq: "asc" },
      select: {
        id: true,
        seq: true,
        vtNumber: true,
        netWeight: true,
        netWeightReceived: true,
        invoiceId: true,
        truck: {
          select: { vehicleNo: true, owner: { select: { name: true } } },
        },
      },
    }),
    prisma.workOrder.findUnique({
      where: { id },
      select: { party: { select: { rate: true } } },
    }),
  ]);

  const rows: InvoiceListRow[] = invoices.map((inv) => ({
    id: inv.id,
    seq: inv.seq,
    date: inv.date,
    truckOwner: inv.truckOwner,
    rate: inv.rate.toNumber(),
    totalQty: inv.totalQty.toNumber(),
    amount: inv.amount.toNumber(),
    discountPct: inv.discountPct.toNumber(),
    finalAmount: inv.finalAmount.toNumber(),
    remarks: inv.remarks,
    tripIds: inv.truckOrders.map((t) => t.id),
  }));

  const candidates: CandidateTrip[] = settledTrips.map((t) => ({
    id: t.id,
    seq: t.seq,
    vtNumber: t.vtNumber,
    vehicleNo: t.truck.vehicleNo,
    owner: t.truck.owner.name,
    netWeight: t.netWeight!.toNumber(),
    netWeightReceived: t.netWeightReceived!.toNumber(),
    invoiceId: t.invoiceId,
  }));

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <Link
        href={`${basePath}/${workOrder.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-[#0483ca]"
      >
        <ArrowLeft size={18} />
        Back to {formatWoNumber(workOrder.seq)}
      </Link>

      <WoInvoicesClient
        wo={workOrder}
        invoices={rows}
        candidates={candidates}
        partyRate={woParty?.party.rate?.toNumber() ?? null}
        todayIso={getTodayIso()}
        initialMonth={getTodayIso().slice(0, 7)}
      />
    </div>
  );
}
