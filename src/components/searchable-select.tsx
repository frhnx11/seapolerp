"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0483ca] disabled:bg-gray-50 disabled:text-gray-500";

/**
 * A generic searchable single-select (combobox): type to filter, click or
 * Enter to select, X to clear, click-outside/Escape to close. The selected
 * option's label fills the input; the dropdown is hidden while a value is set
 * (clear or type to search again). Shared by the trip truck-picker and the
 * gross-stage work-order selector, so each supplies its own option rendering.
 */
export function SearchableSelect<T>({
  options,
  value,
  onChange,
  getKey,
  getLabel,
  getSearchText,
  renderOption,
  placeholder,
  disabled = false,
  id,
  emptyText = "No matches found.",
}: {
  options: T[];
  /** Key of the selected option, or null. */
  value: string | null;
  onChange: (key: string | null) => void;
  getKey: (option: T) => string;
  /** Text shown in the input once an option is chosen. */
  getLabel: (option: T) => string;
  /** Free text matched against the query (include every searchable field). */
  getSearchText: (option: T) => string;
  /** Custom row content in the dropdown; defaults to the label. */
  renderOption?: (option: T) => React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  emptyText?: string;
}) {
  const selected = useMemo(
    () => options.find((o) => getKey(o) === value) ?? null,
    [options, value, getKey],
  );

  // Initialised once from the incoming value; thereafter the input mirrors what
  // the user types / picks (the modal re-mounts per trip, so no external resync).
  const [query, setQuery] = useState(selected ? getLabel(selected) : "");
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

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => getSearchText(o).toLowerCase().includes(q));
  }, [options, query, getSearchText]);

  function pick(option: T) {
    onChange(getKey(option));
    setQuery(getLabel(option));
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery("");
    setOpen(true);
  }

  // Once a value is chosen the list collapses; the input shows its label.
  const showList = open && !value;

  return (
    <div className="relative" ref={containerRef}>
      <input
        id={id}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value) onChange(null);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            if (matches[highlight]) {
              e.preventDefault();
              pick(matches[highlight]);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        className={`${inputClass} pr-10`}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => (value ? clear() : setOpen((o) => !o))}
        aria-label={value ? "Clear selection" : "Toggle list"}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-40"
      >
        {value ? <X size={18} /> : <ChevronDown size={18} />}
      </button>

      {showList && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {matches.length > 0 ? (
            matches.map((o, i) => {
              const key = getKey(o);
              return (
                <button
                  key={key}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(o)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === highlight ? "bg-blue-50" : "hover:bg-blue-50"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    {renderOption ? (
                      renderOption(o)
                    ) : (
                      <span className="text-sm font-medium text-gray-800">
                        {getLabel(o)}
                      </span>
                    )}
                  </span>
                  {key === value && (
                    <Check size={16} className="shrink-0 text-[#0483ca]" />
                  )}
                </button>
              );
            })
          ) : (
            <p className="px-4 py-3 text-sm text-gray-500">{emptyText}</p>
          )}
        </div>
      )}
    </div>
  );
}
