import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Access-control statement — the resources and the actions allowed on them.
 *
 * Starts from Better Auth's admin defaults (user/session management). SeaPole
 * resources (work orders, trips, weighbridge readings, …) are added here as their
 * module phases land, then granted to the operational roles below.
 */
export const statement = {
  ...defaultStatements,
} as const;

export const ac = createAccessControl(statement);

/**
 * SeaPole roles. Only `SUPER_ADMIN` is provisioned today (it manages all other
 * accounts); the remaining roles are placeholders whose concrete permissions are
 * filled in alongside the features they govern.
 */
export const roles = {
  SUPER_ADMIN: ac.newRole({ ...adminAc.statements }),
  ADMIN: ac.newRole({}),
  PORT_WB: ac.newRole({}),
  PARTY_WB: ac.newRole({}),
  ACCOUNTANT: ac.newRole({}),
} as const;

export type AppRole = keyof typeof roles;

export const APP_ROLES = Object.keys(roles) as AppRole[];
