import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { ac, roles } from "@/core/auth/permissions";

/**
 * Better Auth browser client. The base URL defaults to the current origin, so no
 * configuration is needed in development or production. Roles/permissions mirror
 * the server so client-side permission checks stay in sync.
 */
export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles })],
});

export const { signIn, signOut, useSession } = authClient;
