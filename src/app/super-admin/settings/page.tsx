import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/core/auth/auth";

import { SettingsClient } from "./settings-client";

/** System settings — SUPER_ADMIN only. */
export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  return <SettingsClient />;
}
