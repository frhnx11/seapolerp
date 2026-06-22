import { type TruckOrderRow, type TruckOrderStatus } from "./truck-order-lib";

/**
 * The Prisma `include` shared by both Truck Orders screens (the global page and a
 * single work order's page), so the row shape and `toTruckOrderRow` never drift.
 */
export const truckOrderInclude = {
  truck: {
    select: {
      vehicleNo: true,
      wheels: true,
      owner: { select: { name: true } },
    },
  },
  loadingSite: { select: { name: true } },
  invoice: { select: { seq: true } },
  workOrder: { select: { seq: true } },
} as const;

/** Structural shape of a `truckOrder.findMany({ include: truckOrderInclude })` row. */
type Decimalish = { toNumber(): number };
type RawTruckOrder = {
  id: string;
  seq: number;
  status: string;
  truckId: string;
  createdAt: Date;
  workOrderId: string | null;
  tareWeight: Decimalish;
  tareByName: string;
  tareAt: Date;
  tareFirstByName: string | null;
  loadingSiteId: string | null;
  loadingSlipByName: string | null;
  loadingSlipAt: Date | null;
  loadingSlipFirstByName: string | null;
  loadingSlipFirstAt: Date | null;
  vtNumber: string | null;
  grossWeight: Decimalish | null;
  netWeight: Decimalish | null;
  completedByName: string | null;
  completedAt: Date | null;
  grossFirstByName: string | null;
  grossFirstAt: Date | null;
  netWeightReceived: Decimalish | null;
  netReceivedByName: string | null;
  netReceivedAt: Date | null;
  netReceivedFirstByName: string | null;
  netReceivedFirstAt: Date | null;
  invoiceId: string | null;
  truck: { vehicleNo: string; wheels: number; owner: { name: string } };
  loadingSite: { name: string } | null;
  invoice: { seq: number } | null;
  workOrder: { seq: number } | null;
};

/** Maps a Prisma truck-order row to the serialisable `TruckOrderRow` for the grid. */
export function toTruckOrderRow(t: RawTruckOrder): TruckOrderRow {
  return {
    id: t.id,
    seq: t.seq,
    status: t.status as TruckOrderStatus,
    truckId: t.truckId,
    vehicleNo: t.truck.vehicleNo,
    wheels: t.truck.wheels,
    owner: t.truck.owner.name,
    createdAt: t.createdAt.toISOString(),
    workOrderId: t.workOrderId,
    workOrderSeq: t.workOrder?.seq ?? null,
    tareWeight: t.tareWeight.toNumber(),
    tareByName: t.tareByName,
    tareAt: t.tareAt.toISOString(),
    tareFirstByName: t.tareFirstByName,
    loadingSiteId: t.loadingSiteId,
    loadingSiteName: t.loadingSite?.name ?? null,
    loadingSlipByName: t.loadingSlipByName,
    loadingSlipAt: t.loadingSlipAt?.toISOString() ?? null,
    loadingSlipFirstByName: t.loadingSlipFirstByName,
    loadingSlipFirstAt: t.loadingSlipFirstAt?.toISOString() ?? null,
    vtNumber: t.vtNumber,
    grossWeight: t.grossWeight?.toNumber() ?? null,
    netWeight: t.netWeight?.toNumber() ?? null,
    completedByName: t.completedByName,
    completedAt: t.completedAt?.toISOString() ?? null,
    grossFirstByName: t.grossFirstByName,
    grossFirstAt: t.grossFirstAt?.toISOString() ?? null,
    netWeightReceived: t.netWeightReceived?.toNumber() ?? null,
    netReceivedByName: t.netReceivedByName,
    netReceivedAt: t.netReceivedAt?.toISOString() ?? null,
    netReceivedFirstByName: t.netReceivedFirstByName,
    netReceivedFirstAt: t.netReceivedFirstAt?.toISOString() ?? null,
    invoiceId: t.invoiceId,
    invoiceSeq: t.invoice?.seq ?? null,
  };
}
