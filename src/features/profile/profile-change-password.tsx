"use client";

import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { changePassword } from "@/features/profile/profile-actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-11 outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#0483ca]";

/** A password input with a show/hide toggle. */
function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

/**
 * Self-service password change on the profile page. Reuses the same server
 * action as the forced-change flow; on success the user stays signed in (this
 * is a voluntary change, not a forced reset).
 */
export function ProfileChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return setError("All fields are required");
    }
    if (newPassword.length < 6) {
      return setError("New password must be at least 6 characters");
    }
    if (newPassword !== confirmPassword) {
      return setError("New passwords do not match");
    }
    if (newPassword === currentPassword) {
      return setError(
        "New password must be different from your current password",
      );
    }

    setLoading(true);
    const result = await changePassword({ currentPassword, newPassword });
    setLoading(false);

    if (result.ok) {
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setError(result.error ?? "Failed to change password");
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-[#0483ca]/10 p-2">
          <KeyRound className="text-[#0483ca]" size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
          <p className="text-sm text-gray-500">
            Update the password you use to sign in
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4" noValidate>
        <PasswordField
          id="current-password"
          label="Current Password"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
          placeholder="Enter current password"
        />
        <PasswordField
          id="new-password"
          label="New Password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          placeholder="Enter new password (min 6 characters)"
        />
        <PasswordField
          id="confirm-password"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          placeholder="Re-enter new password"
        />

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#0483ca] px-6 py-2.5 font-semibold text-white transition hover:bg-[#0372b0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Changing..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}
