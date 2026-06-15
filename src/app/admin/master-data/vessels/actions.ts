"use server";

import { revalidatePath } from "next/cache";

import { requireActionRole } from "@/core/auth/action-guards";
import { prisma } from "@/core/db";
import { formatQty } from "@/core/format";

import { vesselSchema, type VesselInput } from "./vessel";

const VESSELS_PATH = "/admin/master-data/vessels";

const requireAdmin = () => requireActionRole("ADMIN");

function toMessage(error: unknown, op: string): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") {
      return "A vessel with this name already exists.";
    }
    if (code === "P2003") {
      return "This vessel has work orders and can't be deleted.";
    }
  }
  return error instanceof Error ? error.message : `Failed to ${op} vessel`;
}

export async function createVessel(input: VesselInput) {
  await requireAdmin();
  const parsed = vesselSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  try {
    await prisma.vessel.create({
      data: {
        name: parsed.data.name.trim(),
        blQuantity: parsed.data.blQuantity,
      },
    });
    revalidatePath(VESSELS_PATH);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error, "create") };
  }
}

export async function updateVessel(id: string, input: VesselInput) {
  await requireAdmin();
  const parsed = vesselSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { name, blQuantity } = parsed.data;
  try {
    await prisma.$transaction(
      async (tx) => {
        const vessel = await tx.vessel.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!vessel) throw new Error("Vessel not found");

        // The BL can never shrink below what work orders have already been
        // promised (Σ DO of this vessel).
        const agg = await tx.workOrder.aggregate({
          where: { vesselId: id },
          _sum: { doQuantity: true },
        });
        const allocated = agg._sum.doQuantity?.toNumber() ?? 0;
        if (blQuantity < allocated) {
          throw new Error(
            `BL quantity can't be less than the ${formatQty(allocated)} MT already allocated to this vessel's work orders.`,
          );
        }

        await tx.vessel.update({
          where: { id },
          data: { name: name.trim(), blQuantity },
        });
      },
      { isolationLevel: "Serializable" },
    );

    revalidatePath(VESSELS_PATH);
    revalidatePath("/admin/work-orders");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error, "update") };
  }
}

export async function deleteVessel(id: string) {
  await requireAdmin();
  try {
    await prisma.vessel.delete({ where: { id } });
    revalidatePath(VESSELS_PATH);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error, "delete") };
  }
}
