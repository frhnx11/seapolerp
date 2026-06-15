import {
  AtSign,
  Calendar,
  IdCard,
  type LucideIcon,
  Mail,
  Phone,
  ShieldCheck,
  UserCircle,
  UserRound,
} from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/core/auth/auth";
import { prisma } from "@/core/db";

import { ProfileChangePassword } from "./profile-change-password";

/** Friendly role names for the profile (the portal labels read awkwardly here). */
const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrator",
  PORT_WB: "Port Weighbridge",
  PARTY_WB: "Party Weighbridge",
  ACCOUNTANT: "Accountant",
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "YYYY-MM-DD" -> "DD Mon YYYY"; null/blank -> null (rendered as "Not set"). */
function formatDob(value: string | null): string | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return value;
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
  return letters || "U";
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
      <Icon className="mt-0.5 flex-shrink-0 text-gray-400" size={20} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {value ? (
          <p className="mt-0.5 font-medium break-words text-gray-900">
            {value}
          </p>
        ) : (
          <p className="mt-0.5 font-medium text-gray-400">Not set</p>
        )}
      </div>
    </div>
  );
}

/**
 * Shared account profile — personal details, account info and a change-password
 * card. Rendered by each role portal's /profile route (the portal layout
 * supplies the shell and already guards the role).
 */
export async function ProfileScreen() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      role: true,
      phone: true,
      dateOfBirth: true,
      contactEmail: true,
      rollNo: true,
      createdAt: true,
    },
  });
  if (!user) redirect("/login");

  const username = user.email.split("@")[0];
  const roleLabel = (user.role && ROLE_LABEL[user.role]) || "—";
  const memberSince = user.createdAt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
          <UserCircle className="text-[#0483ca]" size={32} />
          My Profile
        </h1>
        <p className="mt-1 text-gray-500">
          View your account details and change your password
        </p>
      </div>

      {/* Identity banner */}
      <div className="flex items-center gap-6 rounded-2xl bg-gradient-to-br from-[#0483ca] to-[#0372b0] p-8 text-white shadow-lg">
        <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full border-4 border-white/80 bg-white text-3xl font-bold text-[#0483ca] shadow-lg">
          {initialsOf(user.name)}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-3xl font-bold">{user.name}</h2>
          <p className="mt-1 text-white/80">@{username}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur-sm">
            <ShieldCheck size={14} />
            {roleLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal information */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-[#0483ca]/10 p-2">
              <UserRound className="text-[#0483ca]" size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Personal Information
            </h2>
          </div>
          <div className="space-y-4">
            <InfoRow icon={UserRound} label="Full Name" value={user.name} />
            <InfoRow
              icon={Calendar}
              label="Date of Birth"
              value={formatDob(user.dateOfBirth)}
            />
            <InfoRow icon={Phone} label="Phone" value={user.phone} />
            <InfoRow
              icon={Mail}
              label="Contact Email"
              value={user.contactEmail}
            />
          </div>
        </div>

        {/* Account */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-[#0483ca]/10 p-2">
              <IdCard className="text-[#0483ca]" size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Account</h2>
          </div>
          <div className="space-y-4">
            <InfoRow icon={AtSign} label="Username" value={user.email} />
            <InfoRow icon={ShieldCheck} label="Role" value={roleLabel} />
            <InfoRow
              icon={IdCard}
              label="Roll No"
              value={user.rollNo != null ? String(user.rollNo) : null}
            />
            <InfoRow icon={Calendar} label="Member Since" value={memberSince} />
          </div>
        </div>
      </div>

      <ProfileChangePassword />
    </div>
  );
}
