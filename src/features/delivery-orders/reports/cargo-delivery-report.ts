import ExcelJS from "exceljs";

import { prisma } from "@/core/db";

import { formatDoNumber } from "../delivery-order";
import {
  allMed,
  allThin,
  center,
  fmtDMY,
  fmtMDY,
  INT,
  left,
  makePut,
  medium,
  QTY,
  right,
  thin,
  WT,
  WT_BAL,
} from "./xlsx-helpers";

/** Report input — one (vessel, importer, cargo) combo for one report date. */
export type CargoDeliveryParams = {
  vesselId: string;
  importerId: string;
  cargoTypeId: string;
  date: string; // YYYY-MM-DD (report day; window is [date 06:00, date+1 06:00) IST)
};

type DoReportRow = {
  doNumber: string;
  party: string;
  doQuantity: number;
  cargo: string;
  onTrips: number;
  onWt: number;
  upTrips: number;
  upWt: number;
  totalDelivered: number;
  balance: number;
  status: string;
};

export type CargoDeliveryData = {
  reportYmd: string;
  vesselName: string;
  importerName: string;
  cargoName: string;
  arrivalYmd: string | null;
  totalBlQty: number;
  totalDelivered: number;
  balanceCargo: number;
  rows: DoReportRow[];
  totals: {
    onTrips: number;
    onWt: number;
    upTrips: number;
    upWt: number;
    totalDelivered: number;
    balance: number;
  };
};

const IST = "Asia/Kolkata";
const istYmd = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(d);

// Weights are Decimal(12,3); sum in JS floats then round back to 3 dp so tiny
// binary-float drift can't show a phantom balance or flip a delivered status.
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Gather the Cargo Delivery Report for a (vessel, importer, cargo) combo on a
 * report date. The report "day" runs 06:00 IST → 06:00 IST the next day; a truck
 * order belongs to the report by its CREATION time (first tare entry) and counts
 * only once completed (gross entered). Returns null if the combo doesn't resolve.
 */
export async function getCargoDeliveryData(
  p: CargoDeliveryParams,
): Promise<CargoDeliveryData | null> {
  const start = new Date(`${p.date}T06:00:00+05:30`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const [vessel, importer, cargo, blAgg, dos] = await Promise.all([
    prisma.doVessel.findUnique({
      where: { id: p.vesselId },
      select: { name: true, arrivalDate: true },
    }),
    prisma.importer.findUnique({
      where: { id: p.importerId },
      select: { name: true },
    }),
    prisma.cargoType.findUnique({
      where: { id: p.cargoTypeId },
      select: { name: true },
    }),
    prisma.billOfLading.aggregate({
      where: {
        vesselId: p.vesselId,
        importerId: p.importerId,
        cargoTypeId: p.cargoTypeId,
      },
      _sum: { blQuantity: true },
    }),
    prisma.deliveryOrder.findMany({
      where: {
        vesselId: p.vesselId,
        importerId: p.importerId,
        cargoTypeId: p.cargoTypeId,
        createdAt: { lt: end },
      },
      select: {
        seq: true,
        doQuantity: true,
        party: { select: { name: true } },
        truckOrders: {
          select: { grossFirstAt: true, netWeight: true },
        },
      },
    }),
  ]);
  if (!vessel || !importer || !cargo) return null;

  const totalBlQty = blAgg._sum.blQuantity?.toNumber() ?? 0;

  const rows: DoReportRow[] = dos
    .map((d) => {
      let onTrips = 0;
      let onWt = 0;
      let upTrips = 0;
      let upWt = 0;
      for (const t of d.truckOrders) {
        // Completed = gross recorded; grossFirstAt is the immutable completion
        // stamp, so a past-date report stays reproducible as trucks finish later.
        if (t.grossFirstAt === null) continue;
        const net = t.netWeight?.toNumber() ?? 0;
        // Up to date: completed before the report window's end (cumulative).
        if (t.grossFirstAt < end) {
          upTrips += 1;
          upWt += net;
        }
        // On date: completed within the report day's window.
        if (t.grossFirstAt >= start && t.grossFirstAt < end) {
          onTrips += 1;
          onWt += net;
        }
      }
      const doQuantity = d.doQuantity.toNumber();
      const totalDelivered = round3(upWt); // + By Rail (0)
      const balance = round3(doQuantity - totalDelivered);
      return {
        doNumber: formatDoNumber(d.seq),
        party: d.party.name,
        doQuantity,
        cargo: cargo.name,
        onTrips,
        onWt: round3(onWt),
        upTrips,
        upWt: round3(upWt),
        totalDelivered,
        balance,
        status: balance > 0 ? "Delivery Open" : "Delivery Closed",
      };
    })
    .sort((a, b) => a.party.localeCompare(b.party));

  const totals = rows.reduce(
    (acc, r) => ({
      onTrips: acc.onTrips + r.onTrips,
      onWt: acc.onWt + r.onWt,
      upTrips: acc.upTrips + r.upTrips,
      upWt: acc.upWt + r.upWt,
      totalDelivered: acc.totalDelivered + r.totalDelivered,
      balance: acc.balance + r.balance,
    }),
    { onTrips: 0, onWt: 0, upTrips: 0, upWt: 0, totalDelivered: 0, balance: 0 },
  );

  const totalDelivered = totals.upWt;
  return {
    reportYmd: p.date,
    vesselName: vessel.name,
    importerName: importer.name,
    cargoName: cargo.name,
    arrivalYmd: vessel.arrivalDate ? istYmd(vessel.arrivalDate) : null,
    totalBlQty,
    totalDelivered,
    balanceCargo: totalBlQty - totalDelivered,
    rows,
    totals,
  };
}

// ---- Workbook (mirrors public/cargo delivery report.xlsx exactly) ----

export async function buildCargoDeliveryWorkbook(
  data: CargoDeliveryData,
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Stock_Position");
  const put = makePut(ws);

  const widths = [
    3.4, 15.1, 11.7, 15.1, 13.5, 6.7, 9.9, 6.9, 6.7, 10.1, 6.7, 10.1, 6.7, 10.1,
    6.7, 10.1, 13.5, 13.5, 19.8, 3.4,
  ];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Row 1 — title + report date
  ws.getRow(1).height = 29;
  put("B1:D1", "Cargo Delivery Report", {
    font: { size: 18 },
    alignment: left,
  });
  put("E1:G1", fmtDMY(data.reportYmd), { font: { size: 16 }, alignment: left });

  // Row 2 — divider (medium top border across the report width)
  put("B2:S2", undefined, { border: { top: medium } });

  // Row 3 — section label
  put("B3", "Vessel Details:", {
    font: { size: 10, bold: true },
    alignment: left,
    border: { bottom: thin },
  });

  // Rows 4-6 — vessel details block
  const lbl = { font: { size: 9 }, alignment: left, border: allThin };
  const val = {
    font: { size: 9, bold: true },
    alignment: left,
    border: allThin,
  };
  const num = {
    font: { size: 9, bold: true },
    alignment: right,
    border: allThin,
  };
  put("B4", "Vessel", lbl);
  put("C4:E4", data.vesselName, val);
  put("F4:H4", "Total BL Qty (MT)", lbl);
  put("I4:J4", data.totalBlQty, { ...num, numFmt: WT });
  put("B5", "Date of Arrival", lbl);
  put("C5:E5", data.arrivalYmd ? fmtMDY(data.arrivalYmd) : "", val);
  put("F5:H5", "Total Delivered (MT)", lbl);
  put("I5:J5", data.totalDelivered, { ...num, numFmt: WT });
  put("B6", "Importer", lbl);
  put("C6:E6", data.importerName, val);
  put("F6:H6", "Balance Cargo (MT)", lbl);
  put("I6:J6", data.balanceCargo, { ...num, numFmt: WT_BAL });

  // Row 7 — By Road / By Rail group headers
  const grp = {
    font: { size: 9, bold: true },
    alignment: center,
    border: allMed,
  };
  put("I7:L7", "By Road", grp);
  put("M7:P7", "By Rail", grp);

  // Rows 8-9 — table header
  const hd = {
    font: { size: 10, bold: true },
    alignment: center,
    border: allMed,
  };
  // Smaller font for the two 3-line labels so they fit their merged cell.
  const hdSmall = { ...hd, font: { size: 8, bold: true } };
  put("B8:B9", "DO#", hd);
  put("C8:D9", "To Party", hd);
  put("E8:E9", "DO Qty\n(MT)", hd);
  put("F8:H9", "Cargo", hd);
  put("I8:J8", "On Date", hd);
  put("K8:L8", "Up to date", hd);
  put("M8:N8", "On Date", hd);
  put("O8:P8", "Up to date", hd);
  put("Q8:Q9", "Total Delivered\n(MT)", hdSmall);
  put("R8:R9", "Balance Qty\n(MT)", hdSmall);
  put("S8:S9", "Status", hd);
  put("I9", "Trips", hd);
  put("J9", "Wt (MT)", hd);
  put("K9", "Trips", hd);
  put("L9", "Wt (MT)", hd);
  put("M9", "Boxes", hd);
  put("N9", "Wt (MT)", hd);
  put("O9", "Boxes", hd);
  put("P9", "Wt (MT)", hd);
  ws.getRow(8).height = 17;
  ws.getRow(9).height = 17;

  // Data rows
  const dCenter = { font: { size: 9 }, alignment: center, border: allThin };
  const dLeft = { font: { size: 9 }, alignment: left, border: allThin };
  const dNum = { font: { size: 9 }, alignment: right, border: allThin };
  let r = 10;
  for (const row of data.rows) {
    put(`B${r}`, row.doNumber, dCenter);
    put(`C${r}:D${r}`, row.party, dLeft);
    put(`E${r}`, row.doQuantity, { ...dNum, numFmt: QTY });
    put(`F${r}:H${r}`, row.cargo, dCenter);
    put(`I${r}`, row.onTrips, dNum);
    put(`J${r}`, row.onWt, { ...dNum, numFmt: WT });
    put(`K${r}`, row.upTrips, dNum);
    put(`L${r}`, row.upWt, { ...dNum, numFmt: WT });
    put(`M${r}`, 0, dNum);
    put(`N${r}`, 0, { ...dNum, numFmt: WT });
    put(`O${r}`, 0, dNum);
    put(`P${r}`, 0, { ...dNum, numFmt: WT });
    put(`Q${r}`, row.totalDelivered, { ...dNum, numFmt: WT });
    put(`R${r}`, row.balance, { ...dNum, numFmt: WT });
    put(`S${r}`, row.status, dCenter);
    r += 1;
  }

  // Totals row
  const t = data.totals;
  put(`F${r}:H${r}`, "Total", {
    font: { size: 10, bold: true },
    alignment: right,
    border: allThin,
  });
  const tNum = {
    font: { size: 9, bold: true },
    alignment: right,
    border: allMed,
  };
  put(`I${r}`, t.onTrips, { ...tNum, numFmt: INT });
  put(`J${r}`, t.onWt, { ...tNum, numFmt: WT });
  put(`K${r}`, t.upTrips, { ...tNum, numFmt: INT });
  put(`L${r}`, t.upWt, { ...tNum, numFmt: WT });
  put(`M${r}`, 0, { ...tNum, numFmt: INT });
  put(`N${r}`, 0, { ...tNum, numFmt: WT });
  put(`O${r}`, 0, { ...tNum, numFmt: INT });
  put(`P${r}`, 0, { ...tNum, numFmt: WT });
  put(`Q${r}`, t.totalDelivered, { ...tNum, numFmt: WT });
  put(`R${r}`, t.balance, { ...tNum, numFmt: WT });

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}
