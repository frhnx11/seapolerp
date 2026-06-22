-- CreateTable
CREATE TABLE "allotted_trucks" (
    "id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "allotted_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allotted_trucks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allotted_trucks_truck_id_key" ON "allotted_trucks"("truck_id");

-- AddForeignKey
ALTER TABLE "allotted_trucks" ADD CONSTRAINT "allotted_trucks_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
