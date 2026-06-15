"use server";

import { requireActionRole } from "@/core/auth/action-guards";
import { prisma } from "@/core/db";

export type AdminNotification = {
  id: string;
  workOrderSeq: number;
  vehicleNo: string;
  createdAt: string; // ISO
};

/** The calling admin's unacknowledged net-weight alerts, newest first. */
export async function getNotifications(): Promise<AdminNotification[]> {
  const session = await requireActionRole("ADMIN");
  const rows = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      workOrderSeq: true,
      vehicleNo: true,
      createdAt: true,
    },
  });
  return rows.map((n) => ({
    id: n.id,
    workOrderSeq: n.workOrderSeq,
    vehicleNo: n.vehicleNo,
    createdAt: n.createdAt.toISOString(),
  }));
}

/** Reading a notification removes it (scoped to the caller). */
export async function dismissNotification(id: string) {
  const session = await requireActionRole("ADMIN");
  await prisma.notification.deleteMany({
    where: { id, userId: session.user.id },
  });
  return { ok: true as const };
}

/** Clears all of the caller's notifications. */
export async function dismissAllNotifications() {
  const session = await requireActionRole("ADMIN");
  await prisma.notification.deleteMany({ where: { userId: session.user.id } });
  return { ok: true as const };
}
