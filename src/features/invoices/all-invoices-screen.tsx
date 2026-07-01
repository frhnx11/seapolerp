import { prisma } from "@/core/db";
import { getTodayIso } from "@/features/trucks/truck";

import { AllInvoicesClient, type AllInvoiceRow } from "./all-invoices-client";

/** Global invoices list — every work order's invoices in one read-only table. */
export async function AllInvoicesScreen({ date }: { date?: string }) {
  // Scoped to the active day so the query never grows past one window.
  const activeDate = date ?? getTodayIso();
  const invoices = await prisma.invoice.findMany({
    where: { date: activeDate },
    orderBy: { seq: "desc" },
    include: {
      workOrder: { select: { seq: true } },
      discountParty: { select: { name: true } },
      truckOrders: {
        select: { vtNumber: true, truck: { select: { vehicleNo: true } } },
      },
    },
  });

  const rows: AllInvoiceRow[] = invoices.map((inv) => ({
    id: inv.id,
    seq: inv.seq,
    woSeq: inv.workOrder.seq,
    date: inv.date,
    discountPartyName: inv.discountParty?.name ?? null,
    rate: inv.rate.toNumber(),
    totalQty: inv.totalQty.toNumber(),
    amount: inv.amount.toNumber(),
    discountPct: inv.discountPct.toNumber(),
    finalAmount: inv.finalAmount.toNumber(),
    trips: inv.truckOrders.map((t) => ({
      vtNumber: t.vtNumber,
      vehicleNo: t.truck.vehicleNo,
    })),
  }));

  return <AllInvoicesClient rows={rows} date={activeDate} />;
}
