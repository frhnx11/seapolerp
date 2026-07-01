/**
 * Account identity helpers (pure — shared by the client modals and the server
 * actions). The login "username" is an @seapolerp.com email of the form
 * `name_abbr-rollNo@seapolerp.com`, e.g. `johndoe_adm-001@seapolerp.com`.
 */
export const DEFAULT_PASSWORD = "123456";

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  PORT_WB: "Port Weighbridge",
  PARTY_WB: "Party Weighbridge",
  ACCOUNTANT: "Accountant",
  C_AND_F: "C&F",
};

/** Username abbreviation per creatable account type. */
export const ROLE_ABBR: Record<string, string> = {
  ADMIN: "adm",
  PORT_WB: "prt",
  PARTY_WB: "pty",
  ACCOUNTANT: "act",
  C_AND_F: "cnf",
};

/** Roles a super admin can create here (everything except SUPER_ADMIN). */
export const CREATABLE_ROLES = [
  "ADMIN",
  "PORT_WB",
  "PARTY_WB",
  "ACCOUNTANT",
  "C_AND_F",
] as const;

export type CreatableRole = (typeof CREATABLE_ROLES)[number];

export function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
}

export function buildUsername(
  name: string,
  role: string,
  rollNo: number,
): string {
  const abbr = ROLE_ABBR[role] ?? "usr";
  return `${sanitizeName(name)}_${abbr}-${String(rollNo).padStart(3, "0")}@seapolerp.com`;
}

/** Next sequential roll number for a role = max existing + 1 (starts at 1). */
export function nextRollFor(
  accounts: { role: string | null; rollNo: number | null }[],
  role: string,
): number {
  const max = accounts
    .filter((a) => a.role === role)
    .reduce((acc, a) => Math.max(acc, a.rollNo ?? 0), 0);
  return max + 1;
}
