"use client";

import { FileSpreadsheet } from "lucide-react";
import { useState } from "react";

import { downloadReport } from "./download-report";

/**
 * One report box: a date picker (defaulting to today) + a "Generate Report"
 * Excel button. When `reportKey` is set, Generate downloads the .xlsx from the
 * matching admin route; otherwise the button is inert (placeholder).
 */
export function ReportCard({
  title,
  defaultDate,
  reportKey,
}: {
  title: string;
  defaultDate: string;
  reportKey?: string;
}) {
  const [date, setDate] = useState(defaultDate);
  const [downloading, setDownloading] = useState(false);

  async function generate() {
    if (!reportKey || !date || downloading) return;
    setDownloading(true);
    try {
      await downloadReport(
        `/api/reports/${reportKey}?date=${encodeURIComponent(date)}`,
        `${title} - ${date}.xlsx`,
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>

      <div className="mt-5">
        <label
          htmlFor={`report-date-${title}`}
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Date
        </label>
        <input
          id={`report-date-${title}`}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca]"
        />
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={!date || downloading}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileSpreadsheet size={20} />
        <span>{downloading ? "Generating…" : "Generate Report"}</span>
      </button>
    </div>
  );
}
