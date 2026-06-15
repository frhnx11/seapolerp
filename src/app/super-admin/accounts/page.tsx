import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/core/auth/auth";
import { prisma } from "@/core/db";

import { AccountsClient } from "./accounts-client";

/** Account management — SUPER_ADMIN only. */
export default async function AccountsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const accounts = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      dateOfBirth: true,
      contactEmail: true,
      rollNo: true,
    },
    orderBy: [{ role: "asc" }, { rollNo: "asc" }, { createdAt: "asc" }],
  });

  return <AccountsClient accounts={accounts} />;
}
