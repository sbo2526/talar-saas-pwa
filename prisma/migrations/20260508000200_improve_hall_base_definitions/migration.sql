-- AlterTable
ALTER TABLE "Hall"
ADD COLUMN "code" TEXT,
ADD COLUMN "province" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "managerName" TEXT,
ADD COLUMN "totalCapacity" INTEGER,
ADD COLUMN "description" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Hall_tenantId_code_key" ON "Hall"("tenantId", "code");
