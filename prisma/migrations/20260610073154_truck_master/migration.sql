-- CreateTable
CREATE TABLE "trucks" (
    "id" TEXT NOT NULL,
    "vehicle_no" TEXT NOT NULL,
    "wheels" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    "rc_validity" TEXT NOT NULL,
    "insurance_validity" TEXT NOT NULL,
    "fc_validity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trucks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trucks_vehicle_no_key" ON "trucks"("vehicle_no");
