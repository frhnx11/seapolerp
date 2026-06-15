"use client";

import { KeyRound, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { Account } from "./accounts-client";
import { resetPassword } from "./actions";
import { DEFAULT_PASSWORD, ROLE_LABELS } from "./username";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-medium break-all text-gray-900">
        {value || "—"}
      </span>
    </div>
  );
}

export function InfoModal({
  account,
  onClose,
  onChanged,
}: {
  account: Account;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSuperAdmin = account.role === "SUPER_ADMIN";

  async function handleReset() {
    setLoading(true);
    const result = await resetPassword(account.id);
    setLoading(false);
    if (result.ok) {
      toast.success(`Password reset to ${DEFAULT_PASSWORD}`);
      onChanged();
    } else {
      toast.error(result.error ?? "Failed to reset password");
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-gray-100 bg-white p-6">
          <h2 className="text-2xl font-bold text-gray-900">Account Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-xl bg-gray-50 px-4">
            <DetailRow label="Name" value={account.name} />
            <DetailRow label="Username" value={account.email} />
            <DetailRow
              label="Type of Account"
              value={
                account.role ? (ROLE_LABELS[account.role] ?? account.role) : ""
              }
            />
            <DetailRow label="Phone Number" value={account.phone ?? ""} />
            <DetailRow label="Email" value={account.contactEmail ?? ""} />
            <DetailRow
              label="Date of Birth"
              value={account.dateOfBirth ?? ""}
            />
          </div>

          {!isSuperAdmin && (
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="mb-1 flex items-center gap-2">
                <KeyRound size={18} className="text-[#0483ca]" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Reset Password
                </h3>
              </div>
              <p className="mb-3 text-sm text-gray-500">
                Resets this account&apos;s password to{" "}
                <span className="font-mono font-medium">
                  {DEFAULT_PASSWORD}
                </span>
                . They will be required to set a new password on next login.
              </p>
              {confirming ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={loading}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={loading}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading
                      ? "Resetting..."
                      : `Yes, reset to ${DEFAULT_PASSWORD}`}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="rounded-lg bg-[#0483ca] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0372b0]"
                >
                  Reset Password
                </button>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-[#0483ca] px-5 py-2 font-medium text-white transition-colors hover:bg-[#0372b0]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
