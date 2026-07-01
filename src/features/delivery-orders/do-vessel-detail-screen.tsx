import { ArrowLeft, Ship } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/core/db";
import { formatQty } from "@/core/format";
import { formatDate } from "@/features/work-orders/work-order";

import { DeliveryCardsGrid } from "./delivery-orders-hub";
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

/**
 * Admin → Delivery Orders → a single vessel: header details + cards linking to
 * this vessel's Bills of Lading / Bills of Entry / Delivery Orders.
 */
export async function DoVesselDetailScreen({
  id,
  basePath,
  cards,
}: {
  id: string;
  basePath: string;
  /** Which sub-cards to show (e.g. C&F omits "/orders"). */
  cards: string[];
}) {
  const [vessel, doAgg] = await Promise.all([
    prisma.doVessel.findUnique({
      where: { id },
      select: {
        seq: true,
        name: true,
        totalQuantity: true,
        depth: true,
        hatch: true,
        createdAt: true,
      },
    }),
    prisma.deliveryOrder.aggregate({
      where: { vesselId: id },
      _sum: { doQuantity: true, delivered: true },
    }),
  ]);
  if (!vessel) notFound();

  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
  const total = vessel.totalQuantity.toNumber();
  const allocatedDo = doAgg._sum.doQuantity?.toNumber() ?? 0;
  const delivered = doAgg._sum.delivered?.toNumber() ?? 0;
  const balance = total - delivered;
  const completed = total > 0 && delivered >= total;

  const vesselBase = `${basePath}/vessels/${id}`;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <Link
        href={`${basePath}/vessels`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-[#0483ca]"
      >
        <ArrowLeft size={18} />
        Back to Vessels
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <Ship className="text-[#0483ca]" size={28} />
            {formatDoVesselId(vessel.seq)}
            <span className="font-medium text-gray-500">— {vessel.name}</span>
          </h1>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
              completed
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {completed ? "Completed" : "Pending"}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          <HeaderItem
            label="Date"
            value={formatDate(ymd.format(vessel.createdAt))}
          />
          <HeaderItem label="Total Quantity (MT)" value={formatQty(total)} />
          <HeaderItem
            label="Allocated DO (MT)"
            value={formatQty(allocatedDo)}
          />
          <HeaderItem label="Delivered (MT)" value={formatQty(delivered)} />
          <HeaderItem label="Balance (MT)" value={formatQty(balance)} />
          <HeaderItem
            label="Depth"
            value={formatQty(vessel.depth.toNumber())}
          />
          <HeaderItem
            label="Hatch"
            value={formatQty(vessel.hatch.toNumber())}
          />
        </div>
      </div>

      <DeliveryCardsGrid basePath={vesselBase} cards={cards} />
    </div>
  );
}
