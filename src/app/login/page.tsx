import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/core/auth/auth";

import { LoginForm } from "./login-form";

/** Public login page. Authenticated visitors are sent straight to the app. */
export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    redirect("/");
  }

  return <LoginForm />;
}
