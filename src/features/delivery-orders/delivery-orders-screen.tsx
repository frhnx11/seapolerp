import { shiftMonth } from "@/components/month";
import { prisma } from "@/core/db";
import { getTodayIso } from "@/features/trucks/truck";

import {
  type DeliveryOrderRow,
  type DoComboOption,
  type Option,
} from "./delivery-order";
import { DeliveryOrdersClient } from "./delivery-orders-client";

/** Admin/C&F → Delivery Orders → Delivery Orders: issue DOs against BE headroom. */
export async function DeliveryOrdersScreen({
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

  // The DO table is month-scoped (by creation date). The combo headroom below
  // is global so the create form's availability math spans all months.
  const activeMonth = month ?? getTodayIso().slice(0, 7);
  const start = new Date(`${activeMonth}-01T00:00:00+05:30`);
  const end = new Date(`${shiftMonth(activeMonth, 1)}-01T00:00:00+05:30`);

  const [dos, beByCombo, doByCombo, vessels, importers, cargoTypes, parties] =
    await Promise.all([
      prisma.deliveryOrder.findMany({
        where: {
          createdAt: { gte: start, lt: end },
          ...(vesselId ? { vesselId } : {}),
        },
        orderBy: { seq: "desc" },
        select: {
          id: true,
          seq: true,
          doQuantity: true,
          delivered: true,
          createdAt: true,
          vesselId: true,
          importerId: true,
          cargoTypeId: true,
          partyId: true,
          vessel: { select: { seq: true, name: true } },
          importer: { select: { name: true } },
          cargoType: { select: { name: true } },
          party: { select: { name: true } },
        },
      }),
      // BE total per combo = Σ of BLs that have been grouped into a BE.
      prisma.billOfLading.groupBy({
        by: ["vesselId", "importerId", "cargoTypeId"],
        where: { billOfEntryId: { not: null } },
        _sum: { blQuantity: true },
      }),
      prisma.deliveryOrder.groupBy({
        by: ["vesselId", "importerId", "cargoTypeId"],
        _sum: { doQuantity: true },
      }),
      prisma.doVessel.findMany({ select: { id: true, seq: true, name: true } }),
      prisma.importer.findMany({ select: { id: true, name: true } }),
      prisma.cargoType.findMany({ select: { id: true, name: true } }),
      // Party master (work-order Party) — the DO receiver, independent of combos.
      prisma.party.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

  const vesselMap = new Map(vessels.map((v) => [v.id, v]));
  const importerMap = new Map(importers.map((p) => [p.id, p.name]));
  const cargoMap = new Map(cargoTypes.map((c) => [c.id, c.name]));
  const comboKey = (v: string, p: string, c: string) => `${v}|${p}|${c}`;
  const allocatedByCombo = new Map(
    doByCombo.map((d) => [
      comboKey(d.vesselId, d.importerId, d.cargoTypeId),
      d._sum.doQuantity?.toNumber() ?? 0,
    ]),
  );

  const combos: DoComboOption[] = beByCombo.flatMap((c) => {
    const beTotal = c._sum.blQuantity?.toNumber() ?? 0;
    const vessel = vesselMap.get(c.vesselId);
    const importerName = importerMap.get(c.importerId);
    const cargoTypeName = cargoMap.get(c.cargoTypeId);
    if (beTotal <= 0 || !vessel || !importerName || !cargoTypeName) return [];
    const allocatedDo =
      allocatedByCombo.get(comboKey(c.vesselId, c.importerId, c.cargoTypeId)) ??
      0;
    return [
      {
        vesselId: c.vesselId,
        vesselSeq: vessel.seq,
        vesselName: vessel.name,
        importerId: c.importerId,
        importerName,
        cargoTypeId: c.cargoTypeId,
        cargoTypeName,
        beTotal,
        allocatedDo,
        available: beTotal - allocatedDo,
      },
    ];
  });

  const rows: DeliveryOrderRow[] = dos.map((d) => ({
    id: d.id,
    seq: d.seq,
    vesselId: d.vesselId,
    vesselSeq: d.vessel.seq,
    vesselName: d.vessel.name,
    importerId: d.importerId,
    importerName: d.importer.name,
    cargoTypeId: d.cargoTypeId,
    cargoTypeName: d.cargoType.name,
    partyId: d.partyId,
    partyName: d.party.name,
    doQuantity: d.doQuantity.toNumber(),
    delivered: d.delivered.toNumber(),
    createdYmd: ymd.format(d.createdAt),
  }));

  const partyOptions: Option[] = parties;

  return (
    <DeliveryOrdersClient
      rows={rows}
      combos={combos}
      parties={partyOptions}
      basePath={basePath}
      canManage={canManage}
      month={activeMonth}
      scopedVesselId={vesselId}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
