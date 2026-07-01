import { ArrowLeft, Truck } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/core/auth/auth";
import { prisma } from "@/core/db";
import { formatQty } from "@/core/format";
import { formatDate } from "@/features/work-orders/work-order";

import { formatDoNumber } from "./delivery-order";
import { type DoTruckOption } from "./do-truck";
import { type DoTruckOrderRow } from "./do-truck-order";
import { DeliveryOrderTrucksClient } from "./delivery-order-trucks-client";
import { formatDoVesselId } from "./do-vessel";

function HeaderItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium tracking-wider text-gray-500 uppercase">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

/** Admin → Delivery Orders → a single DO: header details (Truck DOs come next). */
export async function DeliveryOrderDetailScreen({
  id,
  basePath,
  backHref,
}: {
  id: string;
  basePath: string;
  /** Where the back link returns to (defaults to the global DO list). */
  backHref?: string;
}) {
  const order = await prisma.deliveryOrder.findUnique({
    where: { id },
    select: {
      seq: true,
      doQuantity: true,
      delivered: true,
      createdByName: true,
      createdAt: true,
      vessel: { select: { seq: true, name: true } },
      importer: { select: { name: true } },
      cargoType: { select: { name: true } },
      party: { select: { name: true } },
    },
  });
  if (!order) notFound();

  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
  const doQuantity = order.doQuantity.toNumber();
  const delivered = order.delivered.toNumber();
  const createdYmd = ymd.format(order.createdAt);

  const trucks = await prisma.doTruckOrder.findMany({
    where: { deliveryOrderId: id },
    orderBy: { seq: "desc" },
    select: {
      id: true,
      seq: true,
      tareWeight: true,
      grossWeight: true,
      netWeight: true,
      createdAt: true,
      createdByName: true,
      tareByName: true,
      tareAt: true,
      grossByName: true,
      grossAt: true,
      grossFirstByName: true,
      grossFirstAt: true,
      truck: { select: { vehicleNo: true } },
    },
  });
  const truckRows: DoTruckOrderRow[] = trucks.map((t) => ({
    id: t.id,
    seq: t.seq,
    vehicleNo: t.truck.vehicleNo,
    tareWeight: t.tareWeight.toNumber(),
    grossWeight: t.grossWeight?.toNumber() ?? null,
    netWeight: t.netWeight?.toNumber() ?? null,
    createdYmd: ymd.format(t.createdAt),
    createdByName: t.createdByName,
    createdAt: t.createdAt.toISOString(),
    tareByName: t.tareByName,
    tareAt: t.tareAt?.toISOString() ?? null,
    grossByName: t.grossByName,
    grossAt: t.grossAt?.toISOString() ?? null,
    grossFirstByName: t.grossFirstByName,
    grossFirstAt: t.grossFirstAt?.toISOString() ?? null,
  }));

  // Admins are never time-limited; everyone else (port) gets the 30-min window.
  const session = await auth.api.getSession({ headers: await headers() });
  const isAdmin = session?.user.role === "ADMIN";

  // The DO truck registry, for the create-truck-DO combobox.
  const doTrucks: DoTruckOption[] = await prisma.doTruck.findMany({
    select: { id: true, vehicleNo: true },
    orderBy: { vehicleNo: "asc" },
  });

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <Link
        href={backHref ?? `${basePath}/orders`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-[#0483ca]"
      >
        <ArrowLeft size={18} />
        Back to Delivery Orders
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
          <Truck className="text-[#0483ca]" size={28} />
          {formatDoNumber(order.seq)}
        </h1>

        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          <HeaderItem label="Date" value={formatDate(createdYmd)} />
          <HeaderItem
            label="Vessel"
            value={`${formatDoVesselId(order.vessel.seq)} — ${order.vessel.name}`}
          />
          <HeaderItem label="Importer" value={order.importer.name} />
          <HeaderItem label="Cargo Type" value={order.cargoType.name} />
          <HeaderItem label="Party" value={order.party.name} />
          <HeaderItem label="DO Quantity (MT)" value={formatQty(doQuantity)} />
          <HeaderItem label="Delivered (MT)" value={formatQty(delivered)} />
          <HeaderItem
            label="Balance (MT)"
            value={formatQty(doQuantity - delivered)}
          />
          {order.createdByName && (
            <div className="flex items-end justify-end">
              <span className="text-xs whitespace-nowrap text-gray-400">
                Created by {order.createdByName}
              </span>
            </div>
          )}
        </div>
      </div>

      <DeliveryOrderTrucksClient
        rows={truckRows}
        deliveryOrderId={id}
        doTrucks={doTrucks}
        isAdmin={isAdmin}
      />
    </div>
  );
}
