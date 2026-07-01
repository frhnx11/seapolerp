"use client";

import { Check, ChevronDown, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { type DoTruckOption, normalizeVehicleNo } from "./do-truck";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca]";

export type DoTruckSelection =
  | { kind: "existing"; id: string; vehicleNo: string }
  | { kind: "new"; vehicleNo: string };

/**
 * Creatable vehicle-number combobox over the DoTruck registry: type to search;
 * a pinned "Create new" row adds a brand-new number (disabled when it already
 * exists). Emits an existing-truck or new-number selection.
 */
export function DoTruckCombobox({
  options,
  selection,
  onChange,
  id,
}: {
  options: DoTruckOption[];
  selection: DoTruckSelection | null;
  onChange: (selection: DoTruckSelection | null) => void;
  id?: string;
}) {
  const [query, setQuery] = useState(selection?.vehicleNo ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const trimmed = query.trim();
  const matches = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.vehicleNo.toLowerCase().includes(q));
  }, [options, trimmed]);

  const exactMatch = useMemo(() => {
    if (!trimmed) return null;
    const norm = normalizeVehicleNo(trimmed);
    return (
      options.find((o) => normalizeVehicleNo(o.vehicleNo) === norm) ?? null
    );
  }, [options, trimmed]);

  const canCreate = trimmed.length > 0 && !exactMatch;

  function pickExisting(option: DoTruckOption) {
    onChange({ kind: "existing", id: option.id, vehicleNo: option.vehicleNo });
    setQuery(option.vehicleNo);
    setOpen(false);
  }

  function create() {
    if (!canCreate) return;
    onChange({ kind: "new", vehicleNo: trimmed });
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery("");
    setOpen(true);
  }

  const showExistsNote =
    Boolean(exactMatch) &&
    !(selection?.kind === "existing" && selection.id === exactMatch?.id);

  return (
    <div>
      <div className="relative" ref={containerRef}>
        <input
          id={id}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selection) onChange(null);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              if (matches[highlight]) {
                e.preventDefault();
                pickExisting(matches[highlight]);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Type vehicle number…"
          autoComplete="off"
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => (selection ? clear() : setOpen((o) => !o))}
          aria-label={selection ? "Clear selection" : "Toggle list"}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
        >
          {selection ? <X size={18} /> : <ChevronDown size={18} />}
        </button>

        {open && (
          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {/* Pinned "Create new" row — always first when something is typed. */}
            {trimmed.length > 0 && (
              <button
                type="button"
                onClick={create}
                disabled={!canCreate}
                className="flex w-full items-center gap-2 border-b border-gray-100 px-4 py-2.5 text-left transition-colors enabled:hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={16} className="shrink-0 text-[#0483ca]" />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium text-gray-900">
                    Create new truck:{" "}
                  </span>
                  <span className="font-semibold text-[#0483ca]">
                    {trimmed}
                  </span>
                  {!canCreate && (
                    <span className="text-gray-500">
                      {" "}
                      — already in the registry
                    </span>
                  )}
                </span>
              </button>
            )}

            {matches.length > 0
              ? matches.map((o, i) => (
                  <button
                    key={o.id}
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => pickExisting(o)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === highlight ? "bg-blue-50" : "hover:bg-blue-50"
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-800">
                      {o.vehicleNo}
                    </span>
                    {selection?.kind === "existing" &&
                      selection.id === o.id && (
                        <Check size={16} className="shrink-0 text-[#0483ca]" />
                      )}
                  </button>
                ))
              : trimmed.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-500">
                    Type a vehicle number to search or create one.
                  </p>
                )}
          </div>
        )}
      </div>

      {showExistsNote && (
        <p className="mt-1 text-xs text-amber-600">
          Truck {exactMatch?.vehicleNo} already exists — select it from the
          list.
        </p>
      )}
      {selection?.kind === "new" && (
        <p className="mt-1 text-xs text-gray-500">
          New truck — added to the registry on save.
        </p>
      )}
    </div>
  );
}
