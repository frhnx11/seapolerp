"use server";

import { requireActionRole } from "@/core/auth/action-guards";
import { prisma } from "@/core/db";
import { formatQty } from "@/core/format";

import { doVesselSchema, type DoVesselInput } from "./do-vessel";
import { revalidateDelivery } from "./delivery-paths";

const requireAdmin = () => requireActionRole("ADMIN");

/** Parse a "YYYY-MM-DD" arrival date as midnight IST. */
const parseArrival = (ymd: string) => new Date(`${ymd}T00:00:00+05:30`);

function toMessage(error: unknown, op: string): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") {
      return "A vessel with this name already exists.";
    }
    if (code === "P2003") {
      return "This vessel is in use and can't be deleted.";
    }
  }
  return error instanceof Error ? error.message : `Failed to ${op} vessel`;
}

export async function createDoVessel(input: DoVesselInput) {
  const session = await requireAdmin();
  const parsed = doVesselSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  try {
    await prisma.doVessel.create({
      data: {
        name: parsed.data.name.trim(),
        totalQuantity: parsed.data.totalQuantity,
        depth: parsed.data.depth,
        hatch: parsed.data.hatch,
        arrivalDate: parseArrival(parsed.data.arrivalDate),
        createdByName: session.user.name,
      },
    });
    revalidateDelivery("/vessels");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error, "create") };
  }
}

export async function updateDoVessel(id: string, input: DoVesselInput) {
  await requireAdmin();
  const parsed = doVesselSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  try {
    await prisma.$transaction(
      async (tx) => {
        // The total can't shrink below what's already on this vessel's bills of
        // lading (which would break the Σ BL ≤ total invariant).
        const agg = await tx.billOfLading.aggregate({
          where: { vesselId: id },
          _sum: { blQuantity: true },
        });
        const allocatedBl = agg._sum.blQuantity?.toNumber() ?? 0;
        if (parsed.data.totalQuantity < allocatedBl) {
          throw new Error(
            `Total quantity can't be less than the ${formatQty(allocatedBl)} MT already allocated to this vessel's bills of lading.`,
          );
        }
        await tx.doVessel.update({
          where: { id },
          data: {
            name: parsed.data.name.trim(),
            totalQuantity: parsed.data.totalQuantity,
            depth: parsed.data.depth,
            hatch: parsed.data.hatch,
            arrivalDate: parseArrival(parsed.data.arrivalDate),
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
    revalidateDelivery("/vessels");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error, "update") };
  }
}

export async function deleteDoVessel(id: string) {
  await requireAdmin();
  try {
    await prisma.doVessel.delete({ where: { id } });
    revalidateDelivery("/vessels");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: toMessage(error, "delete") };
  }
}
