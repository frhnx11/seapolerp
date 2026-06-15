"use client";

import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { Account } from "./accounts-client";
import { createAccount } from "./actions";
import {
  buildUsername,
  CREATABLE_ROLES,
  type CreatableRole,
  DEFAULT_PASSWORD,
  nextRollFor,
  ROLE_LABELS,
} from "./username";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca]";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

export function CreateAccountModal({
  accounts,
  onClose,
  onCreated,
}: {
  accounts: Account[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<"" | CreatableRole>("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const usernamePreview = useMemo(() => {
    if (!name.trim() || !role) return "";
    return buildUsername(name, role, nextRollFor(accounts, role));
  }, [name, role, accounts]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!role) {
      setError("Type of account is required");
      return;
    }

    setLoading(true);
    const result = await createAccount({
      name: name.trim(),
      role,
      phone,
      contactEmail: email,
      dateOfBirth,
    });
    setLoading(false);

    if (result.ok) {
      toast.success(
        `Account created: ${result.username} · password ${DEFAULT_PASSWORD}`,
      );
      onCreated();
    } else {
      setError(result.error ?? "Failed to create account");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-gray-100 bg-white p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Create New Account
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <Field label="Name" required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
              placeholder="Full name"
            />
          </Field>

          <Field label="Type of Account" required>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as CreatableRole)}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Select account type
              </option>
              {CREATABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Username (auto-generated)">
            <input
              value={usernamePreview}
              readOnly
              placeholder="Set automatically from name + account type"
              className={`${inputClass} bg-gray-50 text-gray-500`}
            />
          </Field>

          <Field label="Phone Number">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder="Phone number"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="Contact email"
            />
          </Field>

          <Field label="Date of Birth">
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={inputClass}
            />
          </Field>

          <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
            The password defaults to{" "}
            <span className="font-mono font-semibold">{DEFAULT_PASSWORD}</span>.
            The user can change it anytime from their profile.
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[#0483ca] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0] disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
