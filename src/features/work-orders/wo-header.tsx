import { ClipboardList } from "lucide-react";

import { prisma } from "@/core/db";

import {
  formatDate,
  formatQty,
  formatWoNumber,
  STATUS_META,
  workOrderStatus,
} from "./work-order";

export type WoHeaderData = {
  id: string;
  seq: number;
  date: string;
  vesselName: string;
  vesselBl: number;
  cargoTypeName: string;
  supplierName: string;
  partyName: string;
  doQuantity: number;
  delivered: number;
  balance: number;
  bePermissionNo: string | null;
  eaIaNo: string | null;
  eaIaDate: string | null;
  sbBeNo: string | null;
  sbBeDate: string | null;
  createdByName: string | null;
};

/** Loads the header summary for a work order (null if it doesn't exist). */
export async function fetchWoHeader(id: string): Promise<WoHeaderData | null> {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      vessel: { select: { name: true, blQuantity: true } },
      cargoType: { select: { name: true } },
      supplier: { select: { name: true } },
      party: { select: { name: true } },
    },
  });
  if (!workOrder) return null;

  return {
    id: workOrder.id,
    seq: workOrder.seq,
    date: workOrder.date,
    vesselName: workOrder.vessel.name,
    vesselBl: workOrder.vessel.blQuantity.toNumber(),
    cargoTypeName: workOrder.cargoType.name,
    supplierName: workOrder.supplier.name,
    partyName: workOrder.party.name,
    doQuantity: workOrder.doQuantity.toNumber(),
    delivered: workOrder.delivered.toNumber(),
    balance: workOrder.doQuantity.minus(workOrder.delivered).toNumber(),
    bePermissionNo: workOrder.bePermissionNo,
    eaIaNo: workOrder.eaIaNo,
    eaIaDate: workOrder.eaIaDate,
    sbBeNo: workOrder.sbBeNo,
    sbBeDate: workOrder.sbBeDate,
    createdByName: workOrder.createdByName,
  };
}

function refWithDate(no: string, date: string | null): string {
  return date ? `${no} · ${formatDate(date)}` : no;
}

function HeaderItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

/** The common work-order info header shown on the WO hub and its subpages. */
export function WoHeader({ workOrder }: { workOrder: WoHeaderData }) {
  const pill =
    STATUS_META[workOrderStatus(workOrder.doQuantity, workOrder.delivered)];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
          <ClipboardList className="text-[#0483ca]" size={32} />
          {formatWoNumber(workOrder.seq)}
        </h1>
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${pill.className}`}
        >
          {pill.label}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-3 lg:grid-cols-5">
        <HeaderItem label="Date" value={formatDate(workOrder.date)} />
        <HeaderItem label="Vessel" value={workOrder.vesselName} />
        <HeaderItem label="Cargo Type" value={workOrder.cargoTypeName} />
        <HeaderItem label="Supplier" value={workOrder.supplierName} />
        <HeaderItem label="Party" value={workOrder.partyName} />
        <HeaderItem
          label="Vessel BL (MT)"
          value={formatQty(workOrder.vesselBl)}
        />
        <HeaderItem
          label="DO Qty (MT)"
          value={formatQty(workOrder.doQuantity)}
        />
        <HeaderItem
          label="Delivered (MT)"
          value={formatQty(workOrder.delivered)}
        />
        <HeaderItem label="Balance (MT)" value={formatQty(workOrder.balance)} />
      </div>

      {(workOrder.bePermissionNo || workOrder.eaIaNo || workOrder.sbBeNo) && (
        <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-gray-100 pt-5 md:grid-cols-3">
          {workOrder.bePermissionNo && (
            <HeaderItem
              label="B.E. Permission"
              value={workOrder.bePermissionNo}
            />
          )}
          {workOrder.eaIaNo && (
            <HeaderItem
              label="E.A./I.A. No & Date"
              value={refWithDate(workOrder.eaIaNo, workOrder.eaIaDate)}
            />
          )}
          {workOrder.sbBeNo && (
            <HeaderItem
              label="S.B./B.E. No & Date"
              value={refWithDate(workOrder.sbBeNo, workOrder.sbBeDate)}
            />
          )}
        </div>
      )}

      {workOrder.createdByName && (
        <p className="mt-5 border-t border-gray-100 pt-4 text-xs text-gray-400">
          Created by{" "}
          <span className="font-medium text-gray-600">
            {workOrder.createdByName}
          </span>
        </p>
      )}
    </div>
  );
}
