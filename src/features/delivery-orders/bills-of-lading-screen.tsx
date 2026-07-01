import { shiftMonth } from "@/components/month";
import { prisma } from "@/core/db";
import { getTodayIso } from "@/features/trucks/truck";

import { type BillOfLadingRow, type BlVesselOption } from "./bill-of-lading";
import { BillsOfLadingClient } from "./bills-of-lading-client";

/** Admin → Delivery Orders → Bills of Lading: create + list BLs against DoVessels. */
export async function BillsOfLadingScreen({
  basePath,
  canManage,
  month,
  vesselId,
  backHref,
  backLabel,
}: {
  basePath: string;
  canManage: boolean;
  month?: string;
  /** When set, scope the table to one vessel (hides the Vessel column + filter). */
  vesselId?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });

  // The BL table is month-scoped (by creation date). Vessel options + the Σ BL
  // allocation below stay global so the create form's availability math is right.
  const activeMonth = month ?? getTodayIso().slice(0, 7);
  const start = new Date(`${activeMonth}-01T00:00:00+05:30`);
  const end = new Date(`${shiftMonth(activeMonth, 1)}-01T00:00:00+05:30`);

  const [bls, importers, cargoTypes, vessels, alloc] = await Promise.all([
    prisma.billOfLading.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        ...(vesselId ? { vesselId } : {}),
      },
      orderBy: { seq: "desc" },
      select: {
        id: true,
        seq: true,
        blNumber: true,
        blQuantity: true,
        createdAt: true,
        vesselId: true,
        importerId: true,
        cargoTypeId: true,
        vessel: { select: { seq: true, name: true } },
        importer: { select: { name: true } },
        cargoType: { select: { name: true } },
        billOfEntry: { select: { beNumber: true } },
      },
    }),
    prisma.importer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.cargoType.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.doVessel.findMany({
      orderBy: { seq: "desc" },
      select: { id: true, seq: true, name: true, totalQuantity: true },
    }),
    prisma.billOfLading.groupBy({
      by: ["vesselId"],
      _sum: { blQuantity: true },
    }),
  ]);

  const allocatedByVessel = new Map(
    alloc.map((a) => [a.vesselId, a._sum.blQuantity?.toNumber() ?? 0]),
  );

  const vesselOptions: BlVesselOption[] = vessels.map((v) => {
    const total = v.totalQuantity.toNumber();
    const allocatedBl = allocatedByVessel.get(v.id) ?? 0;
    return {
      id: v.id,
      seq: v.seq,
      name: v.name,
      totalQuantity: total,
      allocatedBl,
      available: total - allocatedBl,
    };
  });

  const rows: BillOfLadingRow[] = bls.map((b) => ({
    id: b.id,
    seq: b.seq,
    blNumber: b.blNumber,
    vesselId: b.vesselId,
    vesselSeq: b.vessel.seq,
    vesselName: b.vessel.name,
    importerId: b.importerId,
    importerName: b.importer.name,
    cargoTypeId: b.cargoTypeId,
    cargoTypeName: b.cargoType.name,
    blQuantity: b.blQuantity.toNumber(),
    beNumber: b.billOfEntry?.beNumber ?? null,
    createdYmd: ymd.format(b.createdAt),
  }));

  return (
    <BillsOfLadingClient
      rows={rows}
      vessels={vesselOptions}
      importers={importers}
      cargoTypes={cargoTypes}
      basePath={basePath}
      canManage={canManage}
      month={activeMonth}
      scopedVesselId={vesselId}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
