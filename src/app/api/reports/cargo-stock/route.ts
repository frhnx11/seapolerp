import { headers } from "next/headers";

import { auth } from "@/core/auth/auth";
import { isValidYmd } from "@/core/date";
import {
  buildCargoStockWorkbook,
  getCargoStockData,
} from "@/features/delivery-orders/reports/cargo-stock-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin-only Cargo Stock Report download (.xlsx) — combined across all vessels. */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const date = new URL(req.url).searchParams.get("date");
  if (!date || !isValidYmd(date)) {
    return new Response("Missing or invalid date", { status: 400 });
  }

  const data = await getCargoStockData({ date });
  const bytes = await buildCargoStockWorkbook(data);
  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Cargo Stock Report - ${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
