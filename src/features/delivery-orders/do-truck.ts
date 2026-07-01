/** A truck in the DO truck registry, for the create-truck-DO combobox. */
export type DoTruckOption = { id: string; vehicleNo: string };

/** Canonical form of a vehicle number — trimmed + uppercased (for storage + dedup). */
export function normalizeVehicleNo(vehicleNo: string): string {
  return vehicleNo.trim().toUpperCase();
}
