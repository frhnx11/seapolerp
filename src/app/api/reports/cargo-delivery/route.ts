import { headers } from "next/headers";

import { auth } from "@/core/auth/auth";
import { isValidYmd } from "@/core/date";
import {
  buildCargoDeliveryWorkbook,
  getCargoDeliveryData,
} from "@/features/delivery-orders/reports/cargo-delivery-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin-only Cargo Delivery Report download (.xlsx). */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const vesselId = url.searchParams.get("vesselId");
  const importerId = url.searchParams.get("importerId");
  const cargoTypeId = url.searchParams.get("cargoTypeId");
  const date = url.searchParams.get("date");
  if (!vesselId || !importerId || !cargoTypeId || !date || !isValidYmd(date)) {
    return new Response("Missing or invalid parameters", { status: 400 });
  }

  const data = await getCargoDeliveryData({
    vesselId,
    importerId,
    cargoTypeId,
    date,
  });
  if (!data) return new Response("Report data not found", { status: 404 });

  const bytes = await buildCargoDeliveryWorkbook(data);
  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const safe = data.vesselName.replace(/[^\w .-]+/g, "_");
  const filename = `Cargo Delivery Report - ${safe} - ${date}.xlsx`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
