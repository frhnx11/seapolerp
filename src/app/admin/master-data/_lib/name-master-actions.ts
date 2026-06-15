"use server";

import { revalidatePath } from "next/cache";

import { requireActionRole } from "@/core/auth/action-guards";
import { prisma } from "@/core/db";

import {
  NAME_MASTERS,
  type NameMasterKey,
  nameSchema,
  rateSchema,
} from "./name-masters";

const requireAdmin = () => requireActionRole("ADMIN");

export type NameItemInput = {
  name: string;
  /** ₹/MT rate — parties only; null clears it. Ignored for other masters. */
  rate?: number | null;
};

/**
 * Validates the name (all masters) and the rate (rate-bearing masters only).
 * The rate is rounded to 2 dp to match the Decimal(12,2) column.
 */
function parseInput(
  key: NameMasterKey,
  input: NameItemInput,
):
  | { ok: true; name: string; rate: number | null }
  | { ok: false; error: string } {
  const name = nameSchema.safeParse(input.name);
  if (!name.success) {
    return {
      ok: false,
      error: name.error.issues[0]?.message ?? "Invalid name",
    };
  }
  let rate: number | null = null;
  if (NAME_MASTERS[key].withRate && input.rate != null) {
    const parsed = rateSchema.safeParse(input.rate);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid rate",
      };
    }
    rate = Math.round(parsed.data * 100) / 100;
  }
  return { ok: true, name: name.data, rate };
}

function toMessage(error: unknown, key: NameMasterKey): string {
  const singular = NAME_MASTERS[key].singular.toLowerCase();
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") {
      return `A ${singular} with this name already exists.`;
    }
    if (code === "P2003") {
      return `This ${singular} is used by one or more ${NAME_MASTERS[key].usedBy} and can't be deleted.`;
    }
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

// Per-entity Prisma calls (the models are separate so each branch is explicit
// and type-safe; everything else in this file is shared).
function createRow(key: NameMasterKey, name: string, rate: number | null) {
  switch (key) {
    case "cargoType":
      return prisma.cargoType.create({ data: { name } });
    case "party":
      return prisma.party.create({ data: { name, rate } });
    case "supplier":
      return prisma.supplier.create({ data: { name } });
    case "loadingSite":
      return prisma.loadingSite.create({ data: { name } });
    case "truckOwner":
      return prisma.truckOwner.create({ data: { name } });
  }
}

function updateRow(
  key: NameMasterKey,
  id: string,
  name: string,
  rate: number | null,
) {
  switch (key) {
    case "cargoType":
      return prisma.cargoType.update({ where: { id }, data: { name } });
    case "party":
      return prisma.party.update({ where: { id }, data: { name, rate } });
    case "supplier":
      return prisma.supplier.update({ where: { id }, data: { name } });
    case "loadingSite":
      return prisma.loadingSite.update({ where: { id }, data: { name } });
    case "truckOwner":
      return prisma.truckOwner.update({ where: { id }, data: { name } });
  }
}

function deleteRow(key: NameMasterKey, id: string) {
  switch (key) {
    case "cargoType":
      return prisma.cargoType.delete({ where: { id } });
    case "party":
      return prisma.party.delete({ where: { id } });
    case "supplier":
      return prisma.supplier.delete({ where: { id } });
    case "loadingSite":
      return prisma.loadingSite.delete({ where: { id } });
    case "truckOwner":
      return prisma.truckOwner.delete({ where: { id } });
  }
}

export async function createNameItem(key: NameMasterKey, input: NameItemInput) {
  await requireAdmin();
  const parsed = parseInput(key, input);
  if (!parsed.ok) {
    return { ok: false as const, error: parsed.error };
  }
  try {
    await createRow(key, parsed.name, parsed.rate);
    revalidatePath(NAME_MASTERS[key].route);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error, key) };
  }
}

export async function updateNameItem(
  key: NameMasterKey,
  id: string,
  input: NameItemInput,
) {
  await requireAdmin();
  const parsed = parseInput(key, input);
  if (!parsed.ok) {
    return { ok: false as const, error: parsed.error };
  }
  try {
    await updateRow(key, id, parsed.name, parsed.rate);
    revalidatePath(NAME_MASTERS[key].route);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error, key) };
  }
}

export async function deleteNameItem(key: NameMasterKey, id: string) {
  await requireAdmin();
  try {
    await deleteRow(key, id);
    revalidatePath(NAME_MASTERS[key].route);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error, key) };
  }
}
