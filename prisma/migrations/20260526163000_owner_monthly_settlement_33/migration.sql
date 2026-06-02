-- TALAR_OWNER_MONTHLY_SETTLEMENT_33
-- Shadow-database safety repair (2026-06-02):
-- An older experimental migration in this project created legacy owner-settlement
-- tables with the same public table name but a different shape. Prisma replays all
-- migrations into a shadow database during `prisma migrate dev`; without this
-- cleanup the replay fails with P3006/P3018 because `OwnerMonthlySettlement`
-- already exists before this final migration creates the canonical table.
-- The legacy objects are not present in the current Prisma schema. They are
-- removed only when this migration is replayed/applied, before the canonical
-- OwnerMonthlySettlement structure below is created.
DROP TABLE IF EXISTS "OwnerSettlementPayment" CASCADE;
DROP TABLE IF EXISTS "OwnerMonthlySettlementEntry" CASCADE;
DROP TABLE IF EXISTS "OwnerMonthlySettlement" CASCADE;
DROP TYPE IF EXISTS "OwnerMonthlySettlementEntryReviewStatus" CASCADE;
DROP TYPE IF EXISTS "OwnerMonthlySettlementEntryType" CASCADE;
DROP TYPE IF EXISTS "OwnerMonthlySettlementStatus" CASCADE;

-- Monthly owner settlement foundation for held event invoices, cancellation income estimates, extra services, and minimum guarantee.

CREATE TYPE "OwnerSettlementStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

CREATE TABLE "OwnerMonthlySettlement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "ownerOperationSettingId" TEXT,
    "operationModel" "OwnerOperationModel" NOT NULL,
    "ownerRevenueSharePercent" DECIMAL(5,2) NOT NULL,
    "ownerCancellationSharePercent" DECIMAL(5,2) NOT NULL,
    "monthlyMinimumGuarantee" DECIMAL(14,2) NOT NULL,
    "settlementCycle" "OwnerSettlementCycle" NOT NULL DEFAULT 'MONTHLY',
    "heldEventsCount" INTEGER NOT NULL DEFAULT 0,
    "canceledEventsCount" INTEGER NOT NULL DEFAULT 0,
    "invoiceTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "extraServicesTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cancellationIncomeTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "ownerEventShare" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "ownerCancellationShare" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "calculatedOwnerShare" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "minimumGuaranteeApplied" BOOLEAN NOT NULL DEFAULT false,
    "minimumGuaranteeShortfall" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "finalOwnerPayable" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "OwnerSettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedByUserId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidByUserId" TEXT,
    "paidAt" TIMESTAMP(3),
    "snapshot" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerMonthlySettlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OwnerMonthlySettlement_tenantId_periodYear_periodMonth_key" ON "OwnerMonthlySettlement"("tenantId", "periodYear", "periodMonth");
CREATE INDEX "OwnerMonthlySettlement_tenantId_idx" ON "OwnerMonthlySettlement"("tenantId");
CREATE INDEX "OwnerMonthlySettlement_tenantId_status_idx" ON "OwnerMonthlySettlement"("tenantId", "status");
CREATE INDEX "OwnerMonthlySettlement_tenantId_periodYear_periodMonth_idx" ON "OwnerMonthlySettlement"("tenantId", "periodYear", "periodMonth");
CREATE INDEX "OwnerMonthlySettlement_generatedByUserId_idx" ON "OwnerMonthlySettlement"("generatedByUserId");
CREATE INDEX "OwnerMonthlySettlement_approvedByUserId_idx" ON "OwnerMonthlySettlement"("approvedByUserId");
CREATE INDEX "OwnerMonthlySettlement_paidByUserId_idx" ON "OwnerMonthlySettlement"("paidByUserId");

ALTER TABLE "OwnerMonthlySettlement" ADD CONSTRAINT "OwnerMonthlySettlement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
