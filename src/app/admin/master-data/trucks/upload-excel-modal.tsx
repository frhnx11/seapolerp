"use client";

import { Download, Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { uploadTrucksExcel } from "./actions";

type Mode = "append" | "replace";

export function UploadExcelModal({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [mode, setMode] = useState<Mode>("append");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<string[]>([]);

  async function handleUpload() {
    setError("");
    setDetails([]);
    if (!file) {
      setError("Choose an Excel file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    const result = await uploadTrucksExcel(mode, formData);
    setLoading(false);

    if (result.ok) {
      toast.success(
        `Imported ${result.inserted} truck(s)` +
          (result.skipped ? `, skipped ${result.skipped} duplicate(s)` : ""),
      );
      onUploaded();
    } else {
      setError(result.error ?? "Upload failed");
      setDetails((result as { details?: string[] }).details ?? []);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Upload Truck Excel
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="space-y-5 px-6 pt-4 pb-6">
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-700">
                How should this import be applied?
              </p>
              <a
                href="/admin/master-data/trucks/template"
                download
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0483ca] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#0372b0]"
              >
                <Download size={16} />
                Download Template
              </a>
            </div>
            <div className="space-y-2">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  mode === "append"
                    ? "border-[#0483ca] bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="upload-mode"
                  checked={mode === "append"}
                  onChange={() => setMode("append")}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">
                    Append to list
                  </span>
                  <span className="block text-sm text-gray-500">
                    Add these trucks to the existing list. Rows whose Vehicle No
                    already exists are skipped.
                  </span>
                </span>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  mode === "replace"
                    ? "border-[#0483ca] bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="upload-mode"
                  checked={mode === "replace"}
                  onChange={() => setMode("replace")}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">
                    Replace whole table
                  </span>
                  <span className="block text-sm text-gray-500">
                    Deletes all existing trucks, then imports this sheet.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Excel file (.xlsx)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#0483ca] file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-[#0372b0]"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              <p>{error}</p>
              {details.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-5">
                  {details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
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
              type="button"
              onClick={handleUpload}
              disabled={loading || !file}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0483ca] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#0372b0] disabled:opacity-50"
            >
              <Upload size={18} />
              {loading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
