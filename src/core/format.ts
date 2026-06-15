/**
 * Shared display formatters.
 */

/** Quantity in metric tons, grouped, up to 3 decimals (trailing zeros trimmed). */
export function formatQty(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

/** Amount in ₹ with Indian digit grouping, e.g. 286650 -> "₹2,86,650.00". */
export function formatInr(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
