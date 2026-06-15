-- Record who created each work order (name snapshot, same convention as
-- invoices and truck-order stages). Nullable: pre-existing rows have no
-- recorded creator.
ALTER TABLE "work_orders" ADD COLUMN "created_by_name" TEXT;
