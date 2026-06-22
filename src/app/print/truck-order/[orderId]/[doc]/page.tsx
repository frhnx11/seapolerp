import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/core/auth/auth";
import { prisma } from "@/core/db";
import { roleHome } from "@/core/shell/portal-config";
import { LoadingSlip } from "@/features/work-orders/print/loading-slip";
import { type TruckOrderPrintData } from "@/features/work-orders/print/print-doc";
import { PrintToolbar } from "@/features/work-orders/print/print-toolbar";
import { formatTruckOrderNo } from "@/features/work-orders/truck-order-lib";

const DOC_TITLES = {
  "loading-slip": "Cargo Loading Slip",
} as const;

type DocKey = keyof typeof DOC_TITLES;

/** Shell-free printable view of one trip document. */
export default async function PrintVtPage({
  params,
}: {
  params: Promise<{ orderId: string; doc: string }>;
}) {
  const { orderId, doc } = await params;
  if (!(doc in DOC_TITLES)) notFound();
  const docKey = doc as DocKey;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "PORT_WB") redirect(roleHome(role));

  const trip = await prisma.truckOrder.findUnique({
    where: { id: orderId },
    include: {
      truck: { select: { vehicleNo: true } },
      loadingSite: { select: { name: true } },
    },
  });
  if (!trip) notFound();

  const data: TruckOrderPrintData = {
    seq: trip.seq,
    vehicleNo: trip.truck.vehicleNo,
    loadingSiteName: trip.loadingSite?.name ?? null,
    loadingSlipAt: trip.loadingSlipAt?.toISOString() ?? null,
  };

  return (
    <main className="min-h-svh bg-gray-100 py-8 print:bg-white print:py-0">
      <PrintToolbar
        title={`${formatTruckOrderNo(data.seq)} · ${DOC_TITLES[docKey]}`}
      />
      <div className="flex justify-center">
        {docKey === "loading-slip" && <LoadingSlip data={data} />}
      </div>
    </main>
  );
}
