-- TALAR_OWNER_OPERATION_MODEL_SETTINGS_32
-- Owner operation model settings for contractual commercialization and owner settlement readiness.

CREATE TYPE "OwnerOperationModel" AS ENUM (
  'OWNER_OPERATED',
  'FIXED_RENT',
  'MANAGEMENT_CONTRACT',
  'MANAGEMENT_CONTRACT_WITH_MINIMUM_GUARANTEE'
);

CREATE TYPE "OwnerSettlementCycle" AS ENUM ('MONTHLY');

CREATE TABLE "OwnerOperationSetting" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "operationModel" "OwnerOperationModel" NOT NULL DEFAULT 'MANAGEMENT_CONTRACT_WITH_MINIMUM_GUARANTEE',
  "ownerRevenueSharePercent" DECIMAL(5,2) NOT NULL DEFAULT 25,
  "ownerCancellationSharePercent" DECIMAL(5,2) NOT NULL DEFAULT 50,
  "monthlyMinimumGuarantee" DECIMAL(14,2) NOT NULL DEFAULT 150000000,
  "settlementCycle" "OwnerSettlementCycle" NOT NULL DEFAULT 'MONTHLY',
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OwnerOperationSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OwnerOperationSetting_tenantId_key" ON "OwnerOperationSetting"("tenantId");
CREATE INDEX "OwnerOperationSetting_tenantId_idx" ON "OwnerOperationSetting"("tenantId");
CREATE INDEX "OwnerOperationSetting_operationModel_idx" ON "OwnerOperationSetting"("operationModel");
CREATE INDEX "OwnerOperationSetting_isActive_idx" ON "OwnerOperationSetting"("isActive");
CREATE INDEX "OwnerOperationSetting_effectiveFrom_idx" ON "OwnerOperationSetting"("effectiveFrom");

ALTER TABLE "OwnerOperationSetting"
  ADD CONSTRAINT "OwnerOperationSetting_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
