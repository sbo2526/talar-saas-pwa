-- Add dedicated ceremony packages for contract registration.
ALTER TYPE "ContractLineItemType" ADD VALUE IF NOT EXISTS 'PACKAGE';

CREATE TABLE IF NOT EXISTS "CeremonyPackage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "pricePerGuest" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "serviceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "menuIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "includedItemsNote" TEXT,
    "allowPriceOverride" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CeremonyPackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CeremonyPackage_tenantId_title_key" ON "CeremonyPackage"("tenantId", "title");
CREATE UNIQUE INDEX IF NOT EXISTS "CeremonyPackage_tenantId_code_key" ON "CeremonyPackage"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "CeremonyPackage_tenantId_idx" ON "CeremonyPackage"("tenantId");
CREATE INDEX IF NOT EXISTS "CeremonyPackage_tenantId_isActive_idx" ON "CeremonyPackage"("tenantId", "isActive");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'CeremonyPackage_tenantId_fkey'
    ) THEN
        ALTER TABLE "CeremonyPackage"
        ADD CONSTRAINT "CeremonyPackage_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "packageId" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "packageName" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "packageTotal" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "packageTotalManual" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "packagePricePerGuest" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "packageSnapshot" JSONB;
