import { ArrowLeft, FileBarChart } from "lucide-react";
import Link from "next/link";

import { prisma } from "@/core/db";
import { getBusinessDayIso } from "@/features/trucks/truck";

import {
  CargoDeliveryReportCard,
  type DeliveryReportCombo,
} from "./cargo-delivery-report-card";
import { ReportCard } from "./report-card";

/** Admin → Delivery Orders → Reports: cargo delivery & stock report exports. */
export async function DeliveryReportsScreen() {
  const today = getBusinessDayIso();

  // (vessel, importer, cargo) combos that have at least one bill of lading — the
  // choices for the Cargo Delivery Report cascade.
  const [blCombos, vessels, importers, cargoTypes] = await Promise.all([
    prisma.billOfLading.findMany({
      distinct: ["vesselId", "importerId", "cargoTypeId"],
      select: { vesselId: true, importerId: true, cargoTypeId: true },
    }),
    prisma.doVessel.findMany({ select: { id: true, seq: true, name: true } }),
    prisma.importer.findMany({ select: { id: true, name: true } }),
    prisma.cargoType.findMany({ select: { id: true, name: true } }),
  ]);

  const vMap = new Map(vessels.map((v) => [v.id, v]));
  const iMap = new Map(importers.map((i) => [i.id, i.name]));
  const cMap = new Map(cargoTypes.map((c) => [c.id, c.name]));

  const combos: DeliveryReportCombo[] = blCombos.flatMap((b) => {
    const v = vMap.get(b.vesselId);
    const importerName = iMap.get(b.importerId);
    const cargoTypeName = cMap.get(b.cargoTypeId);
    if (!v || !importerName || !cargoTypeName) return [];
    return [
      {
        vesselId: b.vesselId,
        vesselSeq: v.seq,
        vesselName: v.name,
        importerId: b.importerId,
        importerName,
        cargoTypeId: b.cargoTypeId,
        cargoTypeName,
      },
    ];
  });

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <Link
        href="/admin/delivery-orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-[#0483ca]"
      >
        <ArrowLeft size={18} />
        Back to Delivery Orders
      </Link>

      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
          <FileBarChart className="text-[#0483ca]" size={32} />
          Reports
        </h1>
        <p className="mt-1 text-gray-500">
          Generate cargo delivery and stock reports.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <CargoDeliveryReportCard combos={combos} defaultDate={today} />
        <ReportCard
          title="Cargo Stock Report"
          defaultDate={today}
          reportKey="cargo-stock"
        />
      </div>
    </div>
  );
}
