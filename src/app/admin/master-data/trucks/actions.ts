"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActionRole } from "@/core/auth/action-guards";
import { prisma } from "@/core/db";

import { truckSchema, type TruckInput } from "@/features/trucks/truck";

const TRUCKS_PATH = "/admin/master-data/trucks";

const requireAdmin = () => requireActionRole("ADMIN");

function normalize(input: TruckInput) {
  return {
    vehicleNo: input.vehicleNo.trim().toUpperCase(),
    wheels: input.wheels,
    ownerId: input.ownerId,
    rcValidity: input.rcValidity,
    insuranceValidity: input.insuranceValidity,
    fcValidity: input.fcValidity,
    status: input.status,
  };
}

function toMessage(error: unknown, op: string): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") {
      return "A truck with this Vehicle No already exists.";
    }
    if (code === "P2003") {
      return "This truck is allotted to one or more work orders and can't be deleted.";
    }
  }
  return error instanceof Error ? error.message : `Failed to ${op} truck`;
}

export async function createTruck(input: TruckInput) {
  await requireAdmin();
  const parsed = truckSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  try {
    await prisma.truck.create({ data: normalize(parsed.data) });
    revalidatePath(TRUCKS_PATH);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error, "create") };
  }
}

export async function updateTruck(id: string, input: TruckInput) {
  await requireAdmin();
  const parsed = truckSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  try {
    await prisma.truck.update({ where: { id }, data: normalize(parsed.data) });
    revalidatePath(TRUCKS_PATH);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error, "update") };
  }
}

export async function deleteTruck(id: string) {
  await requireAdmin();
  try {
    await prisma.truck.delete({ where: { id } });
    revalidatePath(TRUCKS_PATH);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error, "delete") };
  }
}

// ---- Excel bulk upload ----

const HEADER_MAP: Record<string, string> = {
  vehicleno: "vehicleNo",
  vehiclenumber: "vehicleNo",
  type: "wheels",
  wheels: "wheels",
  owner: "owner",
  rcvalidity: "rcValidity",
  rc: "rcValidity",
  insurancevalidity: "insuranceValidity",
  insurance: "insuranceValidity",
  fccertificatevalidity: "fcValidity",
  fcvalidity: "fcValidity",
  fc: "fcValidity",
  status: "status",
};

function headerKey(value: unknown): string | null {
  const key = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return HEADER_MAP[key] ?? null;
}

function valueToText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const obj = value as {
      text?: unknown;
      result?: unknown;
      richText?: { text?: string }[];
    };
    if (typeof obj.text === "string") return obj.text.trim();
    if (Array.isArray(obj.richText)) {
      return obj.richText
        .map((part) => part.text ?? "")
        .join("")
        .trim();
    }
    if (obj.result != null) return String(obj.result).trim();
    return "";
  }
  return String(value).trim();
}

/**
 * Parse a strict DD-MM-YYYY date string into a "YYYY-MM-DD" value, or null if it
 * is not a valid DD-MM-YYYY date. Excel date-formatted cells arrive as
 * "YYYY-MM-DD" (via valueToText) and therefore also fail this check — the upload
 * requires dates typed as DD-MM-YYYY text.
 */
function parseExcelDate(text: string): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const iso = `${yyyy}-${mm}-${dd}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCMonth() + 1 !== Number(mm) ||
    date.getUTCDate() !== Number(dd)
  ) {
    return null;
  }
  return iso;
}

function parseWheels(text: string): number {
  return Number(text.replace(/[^0-9]/g, ""));
}

/**
 * An Excel row carries the owner's *name* (resolved against the Truck Owners
 * master after parsing); the form actions submit an ownerId directly.
 */
const excelRowSchema = truckSchema.omit({ ownerId: true }).extend({
  owner: z.string().trim().min(1, "Owner is required"),
});
type ExcelRow = z.infer<typeof excelRowSchema>;

export async function uploadTrucksExcel(
  mode: "append" | "replace",
  formData: FormData,
) {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Choose an Excel file to upload." };
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return { ok: false as const, error: "Could not read the Excel file." };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    return { ok: false as const, error: "The sheet has no data rows." };
  }

  const cols: Record<string, number> = {};
  sheet.getRow(1).eachCell((cell, col) => {
    const key = headerKey(cell.value);
    if (key) cols[key] = col;
  });

  const required = [
    "vehicleNo",
    "wheels",
    "owner",
    "rcValidity",
    "insuranceValidity",
    "fcValidity",
  ];
  if (required.some((key) => !cols[key])) {
    return {
      ok: false as const,
      error:
        "Missing column(s). Expected headers: Vehicle No, Type, Owner, RC Validity, Insurance Validity, FC Certificate Validity, Status.",
    };
  }

  const valid: { row: number; data: ExcelRow }[] = [];
  const errors: string[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const vehicleNo = valueToText(row.getCell(cols.vehicleNo).value);
    if (!vehicleNo) continue; // skip blank rows

    const rcValidity = parseExcelDate(
      valueToText(row.getCell(cols.rcValidity).value),
    );
    const insuranceValidity = parseExcelDate(
      valueToText(row.getCell(cols.insuranceValidity).value),
    );
    const fcValidity = parseExcelDate(
      valueToText(row.getCell(cols.fcValidity).value),
    );
    if (!rcValidity || !insuranceValidity || !fcValidity) {
      errors.push(`Row ${r}: dates must be in DD-MM-YYYY format`);
      continue;
    }

    const parsed = excelRowSchema.safeParse({
      vehicleNo,
      wheels: parseWheels(valueToText(row.getCell(cols.wheels).value)),
      owner: valueToText(row.getCell(cols.owner).value),
      rcValidity,
      insuranceValidity,
      fcValidity,
      // Only "Blocked" is a stored intent; Active/Expired/blank all mean "not
      // blocked" (Expired is derived from the dates on display).
      status:
        cols.status &&
        valueToText(row.getCell(cols.status).value).trim().toUpperCase() ===
          "BLOCKED"
          ? "BLOCKED"
          : "ACTIVE",
    });

    if (parsed.success) {
      valid.push({ row: r, data: parsed.data });
    } else {
      errors.push(`Row ${r}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
    }
  }

  if (errors.length) {
    return {
      ok: false as const,
      error: `Found ${errors.length} invalid row(s); nothing was imported.`,
      details: errors.slice(0, 10),
    };
  }
  if (!valid.length) {
    return { ok: false as const, error: "No truck rows found in the sheet." };
  }

  // Owners must already exist in the Truck Owners master — the whole file is
  // rejected otherwise so a typo can't silently create a new owner company.
  const ownerNames = [...new Set(valid.map((v) => v.data.owner))];
  const foundOwners = await prisma.truckOwner.findMany({
    where: { name: { in: ownerNames } },
    select: { id: true, name: true },
  });
  const ownerIdByName = new Map(foundOwners.map((o) => [o.name, o.id]));
  const unknownRows = valid.filter((v) => !ownerIdByName.has(v.data.owner));
  if (unknownRows.length) {
    const unknownNames = new Set(unknownRows.map((v) => v.data.owner));
    return {
      ok: false as const,
      error: `${unknownNames.size} owner name(s) are not in the Truck Owners master — add them under Master Data → Truck Owners first; nothing was imported.`,
      details: unknownRows
        .slice(0, 10)
        .map(
          (v) =>
            `Row ${v.row}: owner "${v.data.owner}" is not in the Truck Owners master`,
        ),
    };
  }

  // De-duplicate within the file by Vehicle No (keep the first occurrence).
  const seen = new Set<string>();
  const data: ReturnType<typeof normalize>[] = [];
  for (const { data: rowData } of valid) {
    const { owner, ...rest } = rowData;
    const truck = normalize({ ...rest, ownerId: ownerIdByName.get(owner)! });
    if (seen.has(truck.vehicleNo)) continue;
    seen.add(truck.vehicleNo);
    data.push(truck);
  }

  try {
    if (mode === "replace") {
      await prisma.$transaction([
        prisma.truck.deleteMany({}),
        prisma.truck.createMany({ data }),
      ]);
      revalidatePath(TRUCKS_PATH);
      return { ok: true as const, inserted: data.length, skipped: 0 };
    }

    const result = await prisma.truck.createMany({
      data,
      skipDuplicates: true,
    });
    revalidatePath(TRUCKS_PATH);
    return {
      ok: true as const,
      inserted: result.count,
      skipped: data.length - result.count,
    };
  } catch (error) {
    return { ok: false as const, error: toMessage(error, "import") };
  }
}
