"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Settings as SettingsIcon,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ROLE_LABELS } from "../accounts/username";
import { clearAllData, resetWithSampleData } from "./actions";
import type { SeededLogin } from "./reset-data";

const CONFIRM_PHRASE = "RESET";

type ResetAction = "clear" | "sample";

const ACTION_COPY: Record<
  ResetAction,
  { title: string; confirmLabel: string; warning: string }
> = {
  clear: {
    title: "Clear all data?",
    confirmLabel: "Clear all data",
    warning:
      "This permanently deletes every account (except the super admin), vessel, work order, truck, invoice, and all master data. The system is reset to a fresh state. This cannot be undone.",
  },
  sample: {
    title: "Clear all data and load sample?",
    confirmLabel: "Clear & load sample",
    warning:
      "This first permanently deletes everything (except the super admin), then fills the database with sample accounts, masters, trucks, and vessels for testing. This cannot be undone.",
  },
};

type SampleResult = { logins: SeededLogin[]; password: string };

export function SettingsClient() {
  const router = useRouter();
  const [confirm, setConfirm] = useState<ResetAction | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sampleResult, setSampleResult] = useState<SampleResult | null>(null);

  function closeConfirm() {
    if (loading) return;
    setConfirm(null);
    setConfirmText("");
  }

  async function runReset() {
    if (!confirm || confirmText.trim() !== CONFIRM_PHRASE) return;
    setLoading(true);

    if (confirm === "clear") {
      const res = await clearAllData();
      setLoading(false);
      if (res.ok) {
        toast.success("All data cleared — the system is now fresh.");
        setSampleResult(null);
        setConfirm(null);
        setConfirmText("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to clear data");
      }
      return;
    }

    const res = await resetWithSampleData();
    setLoading(false);
    if (res.ok) {
      toast.success("Sample data loaded.");
      setSampleResult({ logins: res.logins, password: res.password });
      setConfirm(null);
      setConfirmText("");
      router.refresh();
    } else {
      toast.error(res.error ?? "Failed to load sample data");
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
          <SettingsIcon className="text-[#0483ca]" size={32} />
          Settings
        </h1>
        <p className="mt-1 text-gray-500">
          System-level controls for the whole ERP
        </p>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-200 bg-white">
        <div className="border-b border-red-100 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-red-700">
            <AlertTriangle size={20} />
            Danger Zone
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            These actions wipe the entire database and cannot be undone. The
            super-admin account is always kept.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {/* Clear all data */}
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-red-50 p-2">
                <Trash2 className="text-red-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Clear all data</h3>
                <p className="mt-0.5 max-w-2xl text-sm text-gray-500">
                  Reset to a fresh ERP. Removes all accounts (except the super
                  admin), master data, vessels, work orders, trucks, and
                  invoices.
                </p>
              </div>
            </div>
            <button
              onClick={() => setConfirm("clear")}
              className="shrink-0 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Clear all data
            </button>
          </div>

          {/* Clear + sample */}
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-50 p-2">
                <Sparkles className="text-amber-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Clear all data and fill with sample
                </h3>
                <p className="mt-0.5 max-w-2xl text-sm text-gray-500">
                  Wipes everything, then loads sample accounts, masters, ~100
                  trucks, and vessels so an admin can immediately create their
                  first work order for testing.
                </p>
              </div>
            </div>
            <button
              onClick={() => setConfirm("sample")}
              className="shrink-0 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
            >
              Clear &amp; load sample
            </button>
          </div>
        </div>
      </div>

      {/* Seeded logins (after a sample reset) */}
      {sampleResult && (
        <div className="rounded-2xl border border-green-200 bg-white">
          <div className="flex items-start justify-between border-b border-green-100 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-green-700">
              <CheckCircle2 size={20} />
              Sample accounts created
            </h2>
            <button
              onClick={() => setSampleResult(null)}
              aria-label="Dismiss"
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>
          <div className="px-6 py-5">
            <p className="mb-4 text-sm text-gray-600">
              All sample accounts use the password{" "}
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono font-semibold text-gray-900">
                {sampleResult.password}
              </span>{" "}
              and can log in right away.
            </p>
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                      Username
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sampleResult.logins.map((login) => (
                    <tr key={login.username}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {login.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {ROLE_LABELS[login.role] ?? login.role}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-600">
                        {login.username}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Typed-confirmation modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <AlertTriangle className="text-red-600" size={22} />
              {ACTION_COPY[confirm].title}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {ACTION_COPY[confirm].warning}
            </p>

            <label
              htmlFor="confirm-phrase"
              className="mt-5 block text-sm font-medium text-gray-700"
            >
              Type <span className="font-bold">{CONFIRM_PHRASE}</span> to
              confirm
            </label>
            <input
              id="confirm-phrase"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              autoFocus
              placeholder={CONFIRM_PHRASE}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-2.5 transition outline-none focus:border-transparent focus:ring-2 focus:ring-red-500"
            />

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeConfirm}
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={runReset}
                disabled={loading || confirmText.trim() !== CONFIRM_PHRASE}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Working..." : ACTION_COPY[confirm].confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
