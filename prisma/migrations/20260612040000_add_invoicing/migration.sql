-- Invoicing: the accountant pays a truck-owner company for a set of settled
-- trips of one work order. The party's transport rate (₹/MT) lives on the
-- party master and is snapshotted onto each invoice at creation; a trip can be
-- on at most one invoice (invoice deletion frees its trips via SET NULL).

ALTER TABLE "parties" ADD COLUMN "rate" DECIMAL(12,2);

-- Dev convenience (user-requested): seed existing parties with realistic
-- random rates (₹300–495 in steps of 5). The admin-facing rate UI comes later.
UPDATE "parties" SET "rate" = 300 + floor(random() * 40) * 5;

CREATE TABLE "invoices" (
  "id" TEXT NOT NULL,
  "seq" SERIAL NOT NULL,
  "work_order_id" TEXT NOT NULL,
  "invoice_date" TEXT NOT NULL,
  "truck_owner" TEXT NOT NULL,
  "rate" DECIMAL(12,2) NOT NULL,
  "total_qty" DECIMAL(12,3) NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "final_amount" DECIMAL(14,2) NOT NULL,
  "created_by_name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_seq_key" ON "invoices"("seq");
CREATE INDEX "invoices_work_order_id_idx" ON "invoices"("work_order_id");

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_work_order_id_fkey"
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "truck_orders" ADD COLUMN "invoice_id" TEXT;

CREATE INDEX "truck_orders_invoice_id_idx" ON "truck_orders"("invoice_id");

ALTER TABLE "truck_orders" ADD CONSTRAINT "truck_orders_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
