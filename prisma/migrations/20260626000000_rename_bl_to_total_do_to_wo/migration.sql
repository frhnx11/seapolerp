-- Rename the Work-Order flow's quantity columns so the terms "BL" (Bill of
-- Lading) and "DO" (Delivery Order) are reserved for the new Delivery-Order
-- flow. The Work-Order flow now speaks "Total" (vessel) and "WO" (work order).
--
-- Data-preserving rename (ALTER … RENAME COLUMN), NOT drop/add — existing
-- vessel and work-order quantities are kept intact.
ALTER TABLE "vessels" RENAME COLUMN "bl_quantity" TO "total_quantity";
ALTER TABLE "work_orders" RENAME COLUMN "do_quantity" TO "wo_quantity";
