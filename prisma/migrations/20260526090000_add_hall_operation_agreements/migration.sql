-- Phase 28: hall operation / ownership / operator settlement configuration foundation.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HallOperationModel') THEN
        CREATE TYPE "HallOperationModel" AS ENUM (
            'OWNER_DIRECT',
            'FIXED_RENT',
            'PERCENTAGE_MANAGEMENT',
            'GUARANTEED_PERCENTAGE_MANAGEMENT',
            'FIXED_RENT_PLUS_PERCENTAGE'
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HallOperationAgreementStatus') THEN
        CREATE TYPE "HallOperationAgreementStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HallOperationSettlementCycle') THEN
        CREATE TYPE "HallOperationSettlementCycle" AS ENUM ('MONTHLY');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HallOperationOffInvoicePolicy') THEN
        CREATE TYPE "HallOperationOffInvoicePolicy" AS ENUM (
            'REPORT_ONLY',
            'OWNER_REVIEW_REQUIRED',
            'INCLUDE_WITH_EVENT_PERCENT_AFTER_OWNER_APPROVAL',
            'INCLUDE_WITH_CUSTOM_PERCENT_AFTER_OWNER_APPROVAL'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "HallOperationAgreement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hallId" TEXT,
    "operationModel" "HallOperationModel" NOT NULL,
    "ownerName" TEXT NOT NULL,
    "operatorName" TEXT,
    "agreementTitle" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" "HallOperationAgreementStatus" NOT NULL DEFAULT 'ACTIVE',
    "ownerEventSharePercent" DECIMAL(5,2),
    "ownerCancellationSharePercent" DECIMAL(5,2),
    "ownerExtraServiceSharePercent" DECIMAL(5,2),
    "includeExtraServicesInOwnerShare" BOOLEAN NOT NULL DEFAULT false,
    "monthlyMinimumGuaranteeAmount" DECIMAL(14,2),
    "monthlyFixedRentAmount" DECIMAL(14,2),
    "settlementCycle" "HallOperationSettlementCycle" NOT NULL DEFAULT 'MONTHLY',
    "settlementDayOfMonth" INTEGER,
    "offInvoiceIncomePolicy" "HallOperationOffInvoicePolicy" NOT NULL DEFAULT 'REPORT_ONLY',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HallOperationAgreement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HallOperationAgreement_tenantId_idx" ON "HallOperationAgreement"("tenantId");
CREATE INDEX IF NOT EXISTS "HallOperationAgreement_hallId_idx" ON "HallOperationAgreement"("hallId");
CREATE INDEX IF NOT EXISTS "HallOperationAgreement_tenantId_status_idx" ON "HallOperationAgreement"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "HallOperationAgreement_tenantId_hallId_status_idx" ON "HallOperationAgreement"("tenantId", "hallId", "status");
CREATE INDEX IF NOT EXISTS "HallOperationAgreement_effectiveFrom_idx" ON "HallOperationAgreement"("effectiveFrom");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'HallOperationAgreement_tenantId_fkey'
    ) THEN
        ALTER TABLE "HallOperationAgreement"
        ADD CONSTRAINT "HallOperationAgreement_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'HallOperationAgreement_hallId_fkey'
    ) THEN
        ALTER TABLE "HallOperationAgreement"
        ADD CONSTRAINT "HallOperationAgreement_hallId_fkey"
        FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
