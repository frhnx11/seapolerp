import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/core/auth/auth";
import { prisma } from "@/core/db";
import { roleHome } from "@/core/shell/portal-config";
import { InvoiceDocView } from "@/features/invoices/invoice-doc";
import { formatInvoiceNo, lowestNet } from "@/features/invoices/invoice-lib";
import { PrintToolbar } from "@/features/work-orders/print/print-toolbar";
import { formatWoNumber } from "@/features/work-orders/work-order";

/** Shell-free printable view of one transport invoice. */
export default async function PrintInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "ACCOUNTANT") redirect(roleHome(role));

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      workOrder: {
        include: {
          vessel: { select: { name: true } },
          cargoType: { select: { name: true } },
          supplier: { select: { name: true } },
          party: { select: { name: true } },
        },
      },
      truckOrders: {
        orderBy: { seq: "asc" },
        select: {
          id: true,
          vtNumber: true,
          netWeight: true,
          netWeightReceived: true,
          truck: { select: { vehicleNo: true } },
        },
      },
    },
  });
  if (!invoice) notFound();

  return (
    <main className="min-h-svh bg-gray-100 py-8 print:bg-white print:py-0">
      <PrintToolbar
        title={`${formatInvoiceNo(invoice.seq)} · Transport Invoice`}
      />
      <div className="flex justify-center">
        <InvoiceDocView
          data={{
            invoiceNo: formatInvoiceNo(invoice.seq),
            date: invoice.date,
            truckOwner: invoice.truckOwner,
            rate: invoice.rate.toNumber(),
            discountPct: invoice.discountPct.toNumber(),
            workOrder: {
              woNumber: formatWoNumber(invoice.workOrder.seq),
              vesselName: invoice.workOrder.vessel.name,
              supplierName: invoice.workOrder.supplier.name,
              partyName: invoice.workOrder.party.name,
              cargoTypeName: invoice.workOrder.cargoType.name,
            },
            trips: invoice.truckOrders.map((t) => ({
              id: t.id,
              vtNumber: t.vtNumber,
              vehicleNo: t.truck.vehicleNo,
              qty: lowestNet({
                netWeight: t.netWeight!.toNumber(),
                netWeightReceived: t.netWeightReceived!.toNumber(),
              }),
            })),
          }}
        />
      </div>
    </main>
  );
}
