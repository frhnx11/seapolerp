"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { monthLabel, shiftMonth } from "./month";

// Re-exported so existing client importers can keep using
// "@/components/month-navigator" for these helpers.
export { monthLabel, shiftMonth } from "./month";

/** ◀ Month Year ▶ pill — month is "YYYY-MM"; arrows shift ±1 month. */
export function MonthNavigator({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  return (
    <div className="flex items-center rounded-xl border border-gray-200 bg-white">
      <button
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Previous month"
        className="rounded-l-xl p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="min-w-28 px-1 text-center text-sm font-medium text-gray-900">
        {monthLabel(month)}
      </span>
      <button
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label="Next month"
        className="rounded-r-xl p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
