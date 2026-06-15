import ExcelJS from "exceljs";
import { headers } from "next/headers";

import { auth } from "@/core/auth/auth";

export const runtime = "nodejs";

const COLUMNS = [
  { header: "Vehicle No", key: "vehicleNo", width: 18 },
  { header: "Type", key: "wheels", width: 10 },
  { header: "Owner", key: "owner", width: 24 },
  { header: "RC Validity", key: "rcValidity", width: 16 },
  { header: "Insurance Validity", key: "insuranceValidity", width: 20 },
  { header: "FC Certificate Validity", key: "fcValidity", width: 24 },
  { header: "Status", key: "status", width: 12 },
];

/** Downloads a blank truck-import template (.xlsx) with the expected columns. */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Trucks");
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };

  // Keep the date columns as text so DD-MM-YYYY entries are not auto-converted.
  for (const key of ["rcValidity", "insuranceValidity", "fcValidity"]) {
    sheet.getColumn(key).numFmt = "@";
  }

  // One example row showing the expected formats (replace it with real data).
  // Owner must match a name in Master Data → Truck Owners exactly.
  sheet.addRow({
    vehicleNo: "MH12AB1234",
    wheels: 10,
    owner: "Rajesh Kumar",
    rcValidity: "15-06-2026",
    insuranceValidity: "15-06-2026",
    fcValidity: "15-06-2026",
    status: "Active",
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="truck-template.xlsx"',
    },
  });
}
