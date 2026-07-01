import { revalidatePath } from "next/cache";

/**
 * Every portal that renders delivery-order pages. A mutation in one is relevant
 * to the others (they share the same data), so server actions revalidate the
 * affected sub-pages under all of them (non-existent paths are harmless no-ops).
 */
const DELIVERY_BASES = [
  "/admin/delivery-orders",
  "/c-and-f/delivery-orders",
  "/port-weighbridge/delivery-orders",
];

/**
 * Revalidate the given delivery-order sub-pages (e.g. "/vessels",
 * "/bills-of-lading") across all delivery-order portals.
 */
export function revalidateDelivery(...subPaths: string[]) {
  for (const base of DELIVERY_BASES) {
    for (const sub of subPaths) revalidatePath(base + sub);
  }
}
