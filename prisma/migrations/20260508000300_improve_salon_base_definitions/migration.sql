-- AlterTable
ALTER TABLE "Salon"
  ADD COLUMN "basePrice" DECIMAL(14,2),
  ADD COLUMN "code" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "hasDanceFloor" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasProjector" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasSeparateEntrance" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasSoundSystem" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasStage" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasVipRoom" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "locationNote" TEXT,
  ADD COLUMN "maxCapacity" INTEGER,
  ADD COLUMN "minCapacity" INTEGER,
  ALTER COLUMN "capacity" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Salon_tenantId_code_key" ON "Salon"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Salon_hallId_idx" ON "Salon"("hallId");

-- CreateIndex
CREATE INDEX "Salon_tenantId_hallId_idx" ON "Salon"("tenantId", "hallId");
