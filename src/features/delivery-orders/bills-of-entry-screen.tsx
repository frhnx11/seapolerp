import { shiftMonth } from "@/components/month";
import { prisma } from "@/core/db";
import { getTodayIso } from "@/features/trucks/truck";

import {
  type BeBlOption,
  type BeVesselOption,
  type BillOfEntryRow,
} from "./bill-of-entry";
import { BillsOfEntryClient } from "./bills-of-entry-client";

/** Admin → Delivery Orders → Bills of Entry: group unassigned BLs into BEs. */
export async function BillsOfEntryScreen({
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

  // The BE table is month-scoped (by creation date). The unassigned-BL pool and
  // vessel/importer/cargo options below stay global so the create picker is complete.
  const activeMonth = month ?? getTodayIso().slice(0, 7);
  const start = new Date(`${activeMonth}-01T00:00:00+05:30`);
  const end = new Date(`${shiftMonth(activeMonth, 1)}-01T00:00:00+05:30`);

  const [bes, importers, cargoTypes, vessels, unassignedBls] =
    await Promise.all([
      prisma.billOfEntry.findMany({
        where: {
          createdAt: { gte: start, lt: end },
          ...(vesselId ? { vesselId } : {}),
        },
        orderBy: { seq: "desc" },
        select: {
          id: true,
          seq: true,
          beNumber: true,
          createdAt: true,
          vesselId: true,
          importerId: true,
          cargoTypeId: true,
          vessel: { select: { seq: true, name: true } },
          importer: { select: { name: true } },
          cargoType: { select: { name: true } },
          billsOfLading: {
            orderBy: { blNumber: "asc" },
            select: { id: true, blNumber: true, blQuantity: true },
          },
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
        select: { id: true, seq: true, name: true },
      }),
      prisma.billOfLading.findMany({
        where: { billOfEntryId: null },
        orderBy: { blNumber: "asc" },
        select: {
          id: true,
          blNumber: true,
          vesselId: true,
          importerId: true,
          cargoTypeId: true,
          blQuantity: true,
        },
      }),
    ]);

  const vesselOptions: BeVesselOption[] = vessels.map((v) => ({
    id: v.id,
    seq: v.seq,
    name: v.name,
  }));

  const availableBls: BeBlOption[] = unassignedBls.map((b) => ({
    id: b.id,
    blNumber: b.blNumber,
    vesselId: b.vesselId,
    importerId: b.importerId,
    cargoTypeId: b.cargoTypeId,
    blQuantity: b.blQuantity.toNumber(),
  }));

  const rows: BillOfEntryRow[] = bes.map((b) => {
    const bls = b.billsOfLading.map((l) => ({
      id: l.id,
      blNumber: l.blNumber,
      blQuantity: l.blQuantity.toNumber(),
    }));
    return {
      id: b.id,
      seq: b.seq,
      beNumber: b.beNumber,
      vesselId: b.vesselId,
      vesselSeq: b.vessel.seq,
      vesselName: b.vessel.name,
      importerId: b.importerId,
      importerName: b.importer.name,
      cargoTypeId: b.cargoTypeId,
      cargoTypeName: b.cargoType.name,
      blQuantity: bls.reduce((s, l) => s + l.blQuantity, 0),
      bls,
      createdYmd: ymd.format(b.createdAt),
    };
  });

  return (
    <BillsOfEntryClient
      rows={rows}
      vessels={vesselOptions}
      importers={importers}
      cargoTypes={cargoTypes}
      availableBls={availableBls}
      basePath={basePath}
      canManage={canManage}
      month={activeMonth}
      scopedVesselId={vesselId}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
