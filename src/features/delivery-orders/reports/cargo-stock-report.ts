import ExcelJS from "exceljs";

import { prisma } from "@/core/db";

import {
  allHair,
  allMed,
  allThin,
  center,
  fmtMDY,
  fmtMMDDYY,
  INT,
  left,
  makePut,
  medium,
  QTY,
  right,
  WT,
  WT_BAL,
} from "./xlsx-helpers";

export type CargoStockParams = {
  date: string; // YYYY-MM-DD report day; window [date 06:00, date+1 06:00) IST
};

type StockRow = {
  vesselName: string;
  cargoName: string;
  consignee: string;
  ata: string | null; // YYYY-MM-DD
  blQty: number;
  onTrips: number;
  onWt: number;
  upTrips: number;
  upWt: number;
  totalDelivered: number;
  balance: number; // >= 0
  excess: number; // <= 0 (over-delivery, shown negative)
};

type SummaryRow = {
  cargo: string;
  onTrips: number;
  onWt: number;
  balance: number;
};

export type CargoStockData = {
  reportYmd: string;
  rows: StockRow[];
  totals: {
    blQty: number;
    onTrips: number;
    onWt: number;
    upTrips: number;
    upWt: number;
    totalDelivered: number;
    balance: number;
    excess: number;
  };
  summary: SummaryRow[];
  summaryTotal: { onTrips: number; onWt: number; balance: number };
};

const IST = "Asia/Kolkata";
const istYmd = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(d);

// Weights are Decimal(12,3); sum in JS floats then round back to 3 dp so tiny
// binary-float drift can't show a phantom balance or flip a delivered status.
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Combined stock report across all vessels — one row per (vessel, importer,
 * cargo) combo, as of a report date (6 AM–6 AM window; a truck order counts by
 * its creation time, only once completed). BL Qty = Σ of the combo's bills of
 * lading; delivered comes from the combo's DOs' truck orders.
 */
export async function getCargoStockData(
  p: CargoStockParams,
): Promise<CargoStockData> {
  const start = new Date(`${p.date}T06:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const key = (v: string, i: string, c: string) => `${v}|${i}|${c}`;

  const [bls, trucks, vessels, importers, cargoTypes] = await Promise.all([
    prisma.billOfLading.findMany({
      where: { createdAt: { lt: end } },
      select: {
        vesselId: true,
        importerId: true,
        cargoTypeId: true,
        blQuantity: true,
      },
    }),
    prisma.doTruckOrder.findMany({
      // Completed (gross recorded) as of the window end. grossFirstAt is the
      // immutable completion stamp, so a past-date report stays reproducible even
      // as trucks are completed later.
      where: { grossFirstAt: { lt: end } },
      select: {
        grossFirstAt: true,
        netWeight: true,
        deliveryOrder: {
          select: { vesselId: true, importerId: true, cargoTypeId: true },
        },
      },
    }),
    prisma.doVessel.findMany({
      select: { id: true, name: true, arrivalDate: true },
    }),
    prisma.importer.findMany({ select: { id: true, name: true } }),
    prisma.cargoType.findMany({ select: { id: true, name: true } }),
  ]);

  const vMap = new Map(vessels.map((v) => [v.id, v]));
  const iMap = new Map(importers.map((i) => [i.id, i.name]));
  const cMap = new Map(cargoTypes.map((c) => [c.id, c.name]));

  type Agg = {
    v: string;
    i: string;
    c: string;
    blQty: number;
    onTrips: number;
    onWt: number;
    upTrips: number;
    upWt: number;
  };
  const combos = new Map<string, Agg>();
  const get = (v: string, i: string, c: string) => {
    const k = key(v, i, c);
    let a = combos.get(k);
    if (!a) {
      a = { v, i, c, blQty: 0, onTrips: 0, onWt: 0, upTrips: 0, upWt: 0 };
      combos.set(k, a);
    }
    return a;
  };

  for (const b of bls) {
    get(b.vesselId, b.importerId, b.cargoTypeId).blQty +=
      b.blQuantity.toNumber();
  }
  for (const t of trucks) {
    const d = t.deliveryOrder;
    const a = get(d.vesselId, d.importerId, d.cargoTypeId);
    const net = t.netWeight?.toNumber() ?? 0;
    a.upTrips += 1; // grossFirstAt already < end
    a.upWt += net;
    if (t.grossFirstAt !== null && t.grossFirstAt >= start) {
      a.onTrips += 1;
      a.onWt += net;
    }
  }

  const rows: StockRow[] = [...combos.values()]
    .map((a) => {
      const vessel = vMap.get(a.v);
      const totalDelivered = round3(a.upWt); // + rail 0
      const diff = round3(a.blQty - totalDelivered);
      return {
        vesselName: vessel?.name ?? "—",
        cargoName: cMap.get(a.c) ?? "—",
        consignee: iMap.get(a.i) ?? "—",
        ata: vessel?.arrivalDate ? istYmd(vessel.arrivalDate) : null,
        blQty: round3(a.blQty),
        onTrips: a.onTrips,
        onWt: round3(a.onWt),
        upTrips: a.upTrips,
        upWt: round3(a.upWt),
        totalDelivered,
        balance: Math.max(0, diff),
        excess: Math.min(0, diff),
      };
    })
    .sort(
      (x, y) =>
        x.vesselName.localeCompare(y.vesselName) ||
        x.cargoName.localeCompare(y.cargoName) ||
        x.consignee.localeCompare(y.consignee),
    );

  const totals = rows.reduce(
    (t, r) => ({
      blQty: t.blQty + r.blQty,
      onTrips: t.onTrips + r.onTrips,
      onWt: t.onWt + r.onWt,
      upTrips: t.upTrips + r.upTrips,
      upWt: t.upWt + r.upWt,
      totalDelivered: t.totalDelivered + r.totalDelivered,
      balance: t.balance + r.balance,
      excess: t.excess + r.excess,
    }),
    {
      blQty: 0,
      onTrips: 0,
      onWt: 0,
      upTrips: 0,
      upWt: 0,
      totalDelivered: 0,
      balance: 0,
      excess: 0,
    },
  );

  // Cargo-wise summary (grouped by cargo, in first-appearance order).
  const sumMap = new Map<string, SummaryRow>();
  for (const r of rows) {
    let s = sumMap.get(r.cargoName);
    if (!s) {
      s = { cargo: r.cargoName, onTrips: 0, onWt: 0, balance: 0 };
      sumMap.set(r.cargoName, s);
    }
    s.onTrips += r.onTrips;
    s.onWt += r.onWt;
    s.balance += r.balance;
  }
  const summary = [...sumMap.values()];
  const summaryTotal = summary.reduce(
    (t, s) => ({
      onTrips: t.onTrips + s.onTrips,
      onWt: t.onWt + s.onWt,
      balance: t.balance + s.balance,
    }),
    { onTrips: 0, onWt: 0, balance: 0 },
  );

  return { reportYmd: p.date, rows, totals, summary, summaryTotal };
}

// ---- Workbook (mirrors public/cargostockreport.xlsx exactly) ----

const SUMWT = "#,##0.000";

export async function buildCargoStockWorkbook(
  data: CargoStockData,
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Stock_Position");
  const put = makePut(ws);

  const widths = [
    3.4, 3.4, 5, 15.1, 8.4, 6.7, 6.7, 5, 8.4, 2.4, 10.9, 0.2, 12.5, 2.4, 3.7,
    4.7, 11.5, 8.4, 14.9, 8.5, 11.5, 8.4, 14.9, 14.9, 14.9, 14.9, 15.6,
  ];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Row 1 — title + report date
  ws.getRow(1).height = 29;
  put("B1:H1", "Cargo Stock & Delivery Report -", {
    font: { size: 18 },
    alignment: left,
  });
  put("I1:N1", fmtMDY(data.reportYmd), { font: { size: 16 }, alignment: left });

  // Row 2 — divider
  put("B2:Z2", undefined, { border: { top: medium } });

  // Row 3 — group headers
  const hd = {
    font: { size: 10, bold: true },
    alignment: center,
    border: allThin,
  };
  const hdSmall = { ...hd, font: { size: 8, bold: true } };
  put("O3:S3", "By Road", hd);
  put("T3:W3", "By Rail", hd);

  // Rows 4-5 — column header
  put("B4:B5", "#", hd);
  put("C4:D5", "Vessel Name", hd);
  put("E4:F5", "Cargo Type", hd);
  put("G4:J5", "Consignee", hd);
  put("K4:K5", "ATA", hd);
  put("L4:N5", "BL Qty\n(MT)", hd);
  put("O4:Q4", "On Date", hd);
  put("R4:S4", "Up to date", hd);
  put("T4:U4", "On Date", hd);
  put("V4:W4", "Up to date", hd);
  put("X4:X5", "Total Delivered\n(MT)", hdSmall);
  put("Y4:Y5", "Balance Qty\n(MT)", hdSmall);
  put("Z4:Z5", "Excess Delivered\n(MT)", hdSmall);
  put("O5:P5", "# Trips", hd);
  put("Q5", "Wt (MT)", hd);
  put("R5", "# Trips", hd);
  put("S5", "Wt (MT)", hd);
  put("T5", "# Box", hd);
  put("U5", "Wt (MT)", hd);
  put("V5", "# Box", hd);
  put("W5", "Wt (MT)", hd);
  ws.getRow(4).height = 17;
  ws.getRow(5).height = 17;

  // Data rows — hair grid; the "By Road / On Date" movement is bold + thin.
  const hairL = { font: { size: 9 }, alignment: left, border: allHair };
  const hairL8 = { font: { size: 8 }, alignment: left, border: allHair };
  const hairR = { font: { size: 9 }, alignment: right, border: allHair };
  const onR = {
    font: { size: 9, bold: true },
    alignment: right,
    border: allThin,
  };
  let r = 6;
  for (let idx = 0; idx < data.rows.length; idx++) {
    const row = data.rows[idx];
    put(`B${r}`, idx + 1, hairR);
    put(`C${r}:D${r}`, row.vesselName, hairL);
    put(`E${r}:F${r}`, row.cargoName, hairL);
    put(`G${r}:J${r}`, row.consignee, hairL8);
    put(`K${r}`, row.ata ? fmtMMDDYY(row.ata) : "", hairL);
    put(`L${r}:N${r}`, row.blQty, { ...hairR, numFmt: QTY });
    put(`O${r}:P${r}`, row.onTrips, onR);
    put(`Q${r}`, row.onWt, { ...onR, numFmt: WT });
    put(`R${r}`, row.upTrips, hairR);
    put(`S${r}`, row.upWt, { ...hairR, numFmt: WT });
    put(`T${r}`, 0, hairR);
    put(`U${r}`, 0, { ...hairR, numFmt: WT });
    put(`V${r}`, 0, hairR);
    put(`W${r}`, 0, { ...hairR, numFmt: WT });
    put(`X${r}`, row.totalDelivered, { ...hairR, numFmt: WT });
    put(`Y${r}`, row.balance, { ...hairR, numFmt: WT });
    put(`Z${r}`, row.excess, { ...hairR, numFmt: WT_BAL });
    r += 1;
  }

  // Totals row
  const t = data.totals;
  put(`B${r}:K${r}`, "Total", {
    font: { size: 10, bold: true },
    alignment: right,
  });
  const tNum = {
    font: { size: 9, bold: true },
    alignment: right,
    border: allMed,
  };
  put(`L${r}:N${r}`, t.blQty, { ...tNum, numFmt: QTY });
  put(`O${r}:P${r}`, t.onTrips, { ...tNum, numFmt: INT });
  put(`Q${r}`, t.onWt, { ...tNum, numFmt: WT });
  put(`R${r}`, t.upTrips, { ...tNum, numFmt: INT });
  put(`S${r}`, t.upWt, { ...tNum, numFmt: WT });
  put(`T${r}`, 0, { ...tNum, numFmt: INT });
  put(`U${r}`, 0, { ...tNum, numFmt: WT });
  put(`V${r}`, 0, { ...tNum, numFmt: INT });
  put(`W${r}`, 0, { ...tNum, numFmt: WT });
  put(`X${r}`, t.totalDelivered, { ...tNum, numFmt: WT });
  put(`Y${r}`, t.balance, { ...tNum, numFmt: WT });
  put(`Z${r}`, t.excess, { ...tNum, numFmt: WT_BAL });

  // Cargo-wise summary
  let s = r + 1;
  put(`C${s}:M${s}`, "Cargowise Summary", {
    font: { size: 12, bold: true },
    alignment: left,
  });
  s += 1;
  put(`F${s}:L${s}`, "On Date movement", hd);
  put(`M${s}:O${s}`, "Balance", hd);
  s += 1;
  put(`D${s}:E${s}`, "Cargo", hd);
  put(`F${s}:G${s}`, "Trips", hd);
  put(`H${s}:I${s}`, "Boxes", hd);
  put(`J${s}:L${s}`, "Weight (MT)", hd);
  put(`M${s}:O${s}`, "Weight (MT)", hd);
  s += 1;
  const sumL = { font: { size: 10 }, alignment: left, border: allThin };
  const sumR = { font: { size: 10 }, alignment: right, border: allThin };
  for (const row of data.summary) {
    put(`D${s}:E${s}`, row.cargo, sumL);
    put(`F${s}:G${s}`, row.onTrips, sumR);
    put(`H${s}:I${s}`, 0, sumR);
    put(`J${s}:L${s}`, row.onWt, { ...sumR, numFmt: SUMWT });
    put(`M${s}:O${s}`, row.balance, { ...sumR, numFmt: SUMWT });
    s += 1;
  }
  const st = data.summaryTotal;
  put(`D${s}:E${s}`, "Total", {
    font: { size: 10, bold: true },
    alignment: right,
    border: allThin,
  });
  const sumTot = {
    font: { size: 10, bold: true },
    alignment: right,
    border: allMed,
  };
  put(`F${s}:G${s}`, st.onTrips, { ...sumTot, numFmt: INT });
  put(`H${s}:I${s}`, 0, { ...sumTot, numFmt: INT });
  put(`J${s}:L${s}`, st.onWt, { ...sumTot, numFmt: SUMWT });
  put(`M${s}:O${s}`, st.balance, { ...sumTot, numFmt: SUMWT });

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}
