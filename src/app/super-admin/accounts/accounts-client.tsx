"use client";

import { Info, Search, UserPlus, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { CreateAccountModal } from "./create-account-modal";
import { InfoModal } from "./info-modal";
import { ROLE_LABELS } from "./username";

export type Account = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  contactEmail: string | null;
  rollNo: number | null;
};

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: "bg-blue-50 text-blue-700 border-blue-200",
  ADMIN: "bg-indigo-50 text-indigo-700 border-indigo-200",
  PORT_WB: "bg-cyan-50 text-cyan-700 border-cyan-200",
  PARTY_WB: "bg-amber-50 text-amber-700 border-amber-200",
  ACCOUNTANT: "bg-green-50 text-green-700 border-green-200",
  C_AND_F: "bg-purple-50 text-purple-700 border-purple-200",
};

const FALLBACK_BADGE = "bg-gray-50 text-gray-700 border-gray-200";

function roleLabel(role: string | null) {
  return role ? (ROLE_LABELS[role] ?? role) : "—";
}

export function AccountsClient({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Account | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [roleFilter, setRoleFilter] = useState("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (roleFilter !== "ALL" && a.role !== roleFilter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        roleLabel(a.role).toLowerCase().includes(q)
      );
    });
  }, [accounts, search, roleFilter]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <Users className="text-[#0483ca]" size={32} />
            Accounts
          </h1>
          <p className="mt-1 text-gray-500">
            Create and manage Seapol staff accounts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by account type"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium text-gray-700 transition-colors outline-none hover:bg-gray-50 focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]"
          >
            <option value="ALL">All Types</option>
            {Object.keys(ROLE_LABELS).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center space-x-2 rounded-xl bg-[#0483ca] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0]"
          >
            <UserPlus size={20} />
            <span>Create New Account</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
          size={20}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, username, or role..."
          className="w-full rounded-xl border border-gray-200 py-3 pr-4 pl-12 transition outline-none focus:border-[#0483ca] focus:ring-2 focus:ring-[#0483ca]"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Info
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length > 0 ? (
                filtered.map((account) => (
                  <tr
                    key={account.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {account.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                          (account.role && ROLE_BADGE[account.role]) ||
                          FALLBACK_BADGE
                        }`}
                      >
                        {roleLabel(account.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelected(account)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0483ca] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#0372b0]"
                      >
                        <Info size={18} />
                        Info
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-16 text-center">
                    <Users size={48} className="mx-auto mb-4 text-gray-200" />
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">
                      No accounts found
                    </h3>
                    <p className="text-gray-500">
                      {search || roleFilter !== "ALL"
                        ? "Try a different search or filter."
                        : "Create your first account."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <InfoModal
          account={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            router.refresh();
          }}
        />
      )}
      {showCreate && (
        <CreateAccountModal
          accounts={accounts}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
