// Shared "edit window" rule + timestamp formatting, used by any flow that lets a
// value be corrected for a limited time after first entry (work-order truck
// orders, delivery-order truck DOs, …).

/**
 * Each recorded value is editable for this long after its *first* entry. After
 * that only an admin can change it (and only until the record is locked, e.g.
 * invoiced).
 */
export const EDIT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

export type EditLock = { canEdit: boolean; reason: string | null };

/**
 * The single rule governing whether a value may be edited, shared by the server
 * actions (authoritative) and the popups (mirrors it for the UI).
 *
 * - `firstEnteredAt` is the immutable first-entry anchor; `null` means the value
 *   hasn't been entered yet, so this is a first entry — always allowed.
 * - Invoiced/locked records are locked for everyone.
 * - Admins have no time limit (until locked); everyone else gets `EDIT_WINDOW_MS`.
 */
export function evaluateEditLock(p: {
  firstEnteredAt: string | Date | null;
  isAdmin: boolean;
  invoiced: boolean;
  now: number;
}): EditLock {
  if (p.invoiced) {
    return {
      canEdit: false,
      reason: "This trip is on an invoice — edit or delete that invoice first.",
    };
  }
  if (p.isAdmin) return { canEdit: true, reason: null };
  if (p.firstEnteredAt == null) return { canEdit: true, reason: null };
  const at =
    typeof p.firstEnteredAt === "string"
      ? Date.parse(p.firstEnteredAt)
      : p.firstEnteredAt.getTime();
  if (p.now <= at + EDIT_WINDOW_MS) return { canEdit: true, reason: null };
  return {
    canEdit: false,
    reason:
      "The 30-minute editing window has closed — ask an admin to make changes.",
  };
}

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

/** ISO timestamp -> "DD Mon HH:mm" (display only, local time). */
export function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${hh}:${mm}`;
}
