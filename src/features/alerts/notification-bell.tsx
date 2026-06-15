"use client";

import { AlertTriangle, Bell, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { formatStamp } from "@/features/work-orders/truck-order-lib";
import { formatWoNumber } from "@/features/work-orders/work-order";

import {
  type AdminNotification,
  dismissAllNotifications,
  dismissNotification,
  getNotifications,
} from "./notification-actions";

const POLL_MS = 30_000;

export function NotificationBell() {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initial load + lightweight polling so new alerts surface without a reload.
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getNotifications();
        if (active) setItems(data);
      } catch {
        // Silently ignore (e.g. transient/session errors); next poll retries.
      }
    }
    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Reading a notification removes it immediately (optimistic).
  async function dismiss(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await dismissNotification(id);
  }

  async function clearAll() {
    setItems([]);
    await dismissAllNotifications();
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Alerts"
        className="relative rounded-lg p-2 text-white transition-colors hover:bg-[#0372b0]"
      >
        <Bell size={24} />
        {items.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {items.length > 9 ? "9+" : items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="font-bold text-gray-900">Notifications</h3>
            {items.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs font-medium text-[#0483ca] hover:text-[#0372b0]"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No new alerts</p>
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => dismiss(item.id)}
                  title="Mark as read"
                  className="flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="mt-0.5 rounded-lg bg-amber-100 p-1.5">
                    <AlertTriangle size={14} className="text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      New Alert
                    </p>
                    <p className="mt-0.5 text-sm text-gray-600">
                      {formatWoNumber(item.workOrderSeq)} · {item.vehicleNo}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatStamp(item.createdAt)}
                    </p>
                  </div>
                  <X
                    size={15}
                    className="mt-0.5 flex-shrink-0 text-gray-300"
                    aria-hidden
                  />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
