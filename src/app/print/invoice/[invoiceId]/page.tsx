import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/core/auth/auth";
import { prisma } from "@/core/db";
import { roleHome } from "@/core/shell/portal-config";
import { InvoiceDocView } from "@/features/invoices/invoice-doc";
import { formatInvoiceNo } from "@/features/invoices/invoice-lib";
import { PrintToolbar } from "@/features/work-orders/print/print-toolbar";

/** Shell-free printable view of one payment bill. */
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
      discountParty: { select: { name: true } },
      workOrder: { select: { vessel: { select: { name: true } } } },
    },
  });
  if (!invoice) notFound();

  return (
    <main className="min-h-svh bg-gray-100 py-8 print:bg-white print:py-0">
      <PrintToolbar title={`${formatInvoiceNo(invoice.seq)} · Payment Bill`} />
      <div className="flex justify-center">
        <InvoiceDocView
          data={{
            invoiceNo: formatInvoiceNo(invoice.seq),
            date: invoice.date,
            vesselName: invoice.workOrder.vessel.name,
            discountPartyName: invoice.discountParty?.name ?? "—",
            vendorInvoiceNumber: invoice.vendorInvoiceNumber ?? "",
            vendorInvoiceDate: invoice.vendorInvoiceDate ?? "",
            rate: invoice.rate.toNumber(),
            totalQty: invoice.totalQty.toNumber(),
            discountPct: invoice.discountPct.toNumber(),
            remarks: invoice.remarks,
          }}
        />
      </div>
    </main>
  );
}
