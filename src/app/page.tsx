import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/core/auth/auth";
import { prisma } from "@/core/db";
import { roleHome } from "@/core/shell/portal-config";

/** Routes each visitor to their role's home (or login). */
export default async function RootPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  redirect(roleHome(dbUser?.role ?? session.user.role ?? null));
}
