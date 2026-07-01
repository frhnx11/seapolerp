"use client";

import { FileSpreadsheet } from "lucide-react";
import { useMemo, useState } from "react";

import { downloadReport } from "./download-report";
import { formatDoVesselId } from "./do-vessel";

/** A (vessel, importer, cargo) combo that has at least one bill of lading. */
export type DeliveryReportCombo = {
  vesselId: string;
  vesselSeq: number;
  vesselName: string;
  importerId: string;
  importerName: string;
  cargoTypeId: string;
  cargoTypeName: string;
};

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400";

/** Cargo Delivery Report box: vessel → importer → cargo cascade + date, then
 * downloads the .xlsx from the admin report route. */
export function CargoDeliveryReportCard({
  combos,
  defaultDate,
}: {
  combos: DeliveryReportCombo[];
  defaultDate: string;
}) {
  const [vesselId, setVesselId] = useState("");
  const [importerId, setImporterId] = useState("");
  const [cargoTypeId, setCargoTypeId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [downloading, setDownloading] = useState(false);

  const vesselOptions = useMemo(() => {
    const seen = new Map<string, { seq: number; name: string }>();
    for (const c of combos) {
      if (!seen.has(c.vesselId)) {
        seen.set(c.vesselId, { seq: c.vesselSeq, name: c.vesselName });
      }
    }
    return [...seen.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.seq - b.seq);
  }, [combos]);

  const importerOptions = useMemo(() => {
    if (!vesselId) return [];
    const seen = new Map<string, string>();
    for (const c of combos) {
      if (c.vesselId === vesselId && !seen.has(c.importerId)) {
        seen.set(c.importerId, c.importerName);
      }
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [combos, vesselId]);

  const cargoOptions = useMemo(() => {
    if (!vesselId || !importerId) return [];
    const seen = new Map<string, string>();
    for (const c of combos) {
      if (
        c.vesselId === vesselId &&
        c.importerId === importerId &&
        !seen.has(c.cargoTypeId)
      ) {
        seen.set(c.cargoTypeId, c.cargoTypeName);
      }
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [combos, vesselId, importerId]);

  const ready = Boolean(vesselId && importerId && cargoTypeId && date);

  async function generate() {
    if (!ready || downloading) return;
    setDownloading(true);
    try {
      const params = new URLSearchParams({
        vesselId,
        importerId,
        cargoTypeId,
        date,
      });
      await downloadReport(
        `/api/reports/cargo-delivery?${params.toString()}`,
        `Cargo Delivery Report - ${date}.xlsx`,
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <h2 className="text-lg font-bold text-gray-900">Cargo Delivery Report</h2>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Vessel
          </label>
          <select
            value={vesselId}
            onChange={(e) => {
              setVesselId(e.target.value);
              setImporterId("");
              setCargoTypeId("");
            }}
            className={inputClass}
          >
            <option value="" disabled>
              {vesselOptions.length === 0
                ? "No vessels with bills of lading"
                : "Select vessel"}
            </option>
            {vesselOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {formatDoVesselId(v.seq)} — {v.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Importer
          </label>
          <select
            value={importerId}
            onChange={(e) => {
              setImporterId(e.target.value);
              setCargoTypeId("");
            }}
            disabled={!vesselId}
            className={inputClass}
          >
            <option value="" disabled>
              {!vesselId ? "Select a vessel first" : "Select importer"}
            </option>
            {importerOptions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Cargo Type
          </label>
          <select
            value={cargoTypeId}
            onChange={(e) => setCargoTypeId(e.target.value)}
            disabled={!importerId}
            className={inputClass}
          >
            <option value="" disabled>
              {!importerId ? "Select an importer first" : "Select cargo type"}
            </option>
            {cargoOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={!ready || downloading}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileSpreadsheet size={20} />
        <span>{downloading ? "Generating…" : "Generate Report"}</span>
      </button>
    </div>
  );
}
