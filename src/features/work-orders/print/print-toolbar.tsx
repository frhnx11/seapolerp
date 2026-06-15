"use client";

import { Printer } from "lucide-react";

/** Screen-only toolbar above a printable document. */
export function PrintToolbar({ title }: { title: string }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-4 print:hidden">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-2 rounded-xl bg-[#0483ca] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0372b0]"
      >
        <Printer size={16} />
        Print
      </button>
    </div>
  );
}
