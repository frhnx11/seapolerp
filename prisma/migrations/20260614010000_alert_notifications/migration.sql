-- Replace the derived alert bell (per-user alertsSeenAt timestamp) with stored
-- per-admin notifications that are deleted once read.

-- Drop the now-unused last-seen timestamp.
ALTER TABLE "user" DROP COLUMN "alertsSeenAt";

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "truck_order_id" TEXT NOT NULL,
    "work_order_seq" INTEGER NOT NULL,
    "vehicle_no" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_truck_order_id_user_id_key" ON "notifications"("truck_order_id", "user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_truck_order_id_fkey" FOREIGN KEY ("truck_order_id") REFERENCES "truck_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
