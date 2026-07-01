import ExcelJS from "exceljs";

// Shared exceljs building blocks for the delivery-order report workbooks
// (borders/fonts/formats/merges). Both report builders replicate their .xlsx
// templates, which use no fills — only borders, bold, merges and number formats.

export const FONT = "Calibri";

// Number formats
export const WT = "#,##0.000;(#,##0.000-)";
export const WT_BAL = "#,##0.000;(#,##0.000)";
export const QTY = "#,##0.###;(#,##0.###)";
export const INT = "#,##0";

// Borders
export const thin = { style: "thin" as const };
export const medium = { style: "medium" as const };
export const hair = { style: "hair" as const };
export const allThin = { top: thin, left: thin, bottom: thin, right: thin };
export const allMed = {
  top: medium,
  left: medium,
  bottom: medium,
  right: medium,
};
export const allHair = { top: hair, left: hair, bottom: hair, right: hair };

// Alignments
export const left = {
  horizontal: "left" as const,
  vertical: "middle" as const,
  wrapText: true,
};
export const center = {
  horizontal: "center" as const,
  vertical: "middle" as const,
  wrapText: true,
};
export const right = {
  horizontal: "right" as const,
  vertical: "middle" as const,
  wrapText: true,
};

const MON = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
/** "YYYY-MM-DD" → "D Mon YYYY" (e.g. "22 Jun 2026"). */
export const fmtDMY = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${MON[m - 1]} ${y}`;
};
/** "YYYY-MM-DD" → "Mon D, YYYY" (e.g. "Jun 22, 2026"). */
export const fmtMDY = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${MON[m - 1]} ${d}, ${y}`;
};
/** "YYYY-MM-DD" → "MM-DD-YY" (e.g. "06-22-26"). */
export const fmtMMDDYY = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(m)}-${p(d)}-${String(y).slice(2)}`;
};

export type CellStyle = {
  font?: Partial<ExcelJS.Font>;
  alignment?: Partial<ExcelJS.Alignment>;
  border?: Partial<ExcelJS.Borders>;
  numFmt?: string;
};

const decode = (addr: string): [number, number] => {
  const m = /^([A-Z]+)(\d+)$/.exec(addr)!;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return [Number(m[2]), col];
};

/**
 * Returns a `put(range, value, style)` bound to a worksheet: merges the range
 * (if any), writes the value into the top-left cell, and applies the style to
 * every cell in the range (so merged borders render fully).
 */
export function makePut(ws: ExcelJS.Worksheet) {
  return (range: string, value: unknown, style: CellStyle = {}) => {
    const [p1, p2] = range.split(":");
    const [r1, c1] = decode(p1);
    const [r2, c2] = p2 ? decode(p2) : [r1, c1];
    if (p2) ws.mergeCells(range);
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const cell = ws.getCell(r, c);
        if (r === r1 && c === c1 && value !== undefined) {
          cell.value = value as ExcelJS.CellValue;
        }
        if (style.font) cell.font = { name: FONT, ...style.font };
        if (style.alignment) cell.alignment = style.alignment;
        if (style.border) cell.border = style.border;
        if (style.numFmt) cell.numFmt = style.numFmt;
      }
    }
  };
}
