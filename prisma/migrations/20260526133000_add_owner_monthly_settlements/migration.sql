-- PHASE 32 - Owner monthly settlement foundation.
-- Additive only: does not mutate existing invoices, contracts, feedback, or payments.

CREATE TYPE "OwnerMonthlySettlementStatus" AS ENUM (
  'DRAFT',
  'CALCULATED',
  'PAYMENT_PENDING',
  'PARTIALLY_PAID',
  'PAID',
  'LOCKED',
  'CANCELLED'
);

CREATE TYPE "OwnerMonthlySettlementEntryType" AS ENUM (
  'EVENT_INVOICE',
  'CANCELLATION',
  'EXTRA_SERVICE',
  'APPROVED_OFF_INVOICE',
  'FIXED_RENT',
  'GUARANTEE_SHORTFALL',
  'MANUAL_ADJUSTMENT'
);

CREATE TYPE "OwnerMonthlySettlementEntryReviewStatus" AS ENUM (
  'INCLUDED',
  'INFORMATIONAL',
  'REVIEW_REQUIRED',
  'EXCLUDED'
);

CREATE TABLE "OwnerMonthlySettlement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "hallId" TEXT,
  "operationAgreementId" TEXT NOT NULL,
  "settlementYear" INTEGER NOT NULL,
  "settlementMonth" INTEGER NOT NULL,
  "settlementPeriodStart" TIMESTAMP(3) NOT NULL,
  "settlementPeriodEnd" TIMESTAMP(3) NOT NULL,
  "status" "OwnerMonthlySettlementStatus" NOT NULL DEFAULT 'DRAFT',
  "operationModelSnapshot" "HallOperationModel" NOT NULL,
  "ownerNameSnapshot" TEXT NOT NULL,
  "operatorNameSnapshot" TEXT,
  "ownerEventSharePercentSnapshot" DECIMAL(5,2),
  "ownerCancellationSharePercentSnapshot" DECIMAL(5,2),
  "ownerExtraServiceSharePercentSnapshot" DECIMAL(5,2),
  "monthlyMinimumGuaranteeAmountSnapshot" DECIMAL(14,2),
  "monthlyFixedRentAmountSnapshot" DECIMAL(14,2),
  "eventInvoiceBaseAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "eventInvoiceOwnerShareAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "cancellationBaseAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "cancellationOwnerShareAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "extraServiceBaseAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "extraServiceOwnerShareAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "approvedOffInvoiceBaseAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "approvedOffInvoiceOwnerShareAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "calculatedOwnerShareAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "guaranteeShortfallAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "fixedRentAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "finalPayableToOwnerAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "paidToOwnerAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "remainingPayableAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "calculatedAt" TIMESTAMP(3),
  "calculatedByUserId" TEXT,
  "lockedAt" TIMESTAMP(3),
  "lockedByUserId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OwnerMonthlySettlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OwnerMonthlySettlementEntry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "settlementId" TEXT NOT NULL,
  "contractId" TEXT,
  "invoiceId" TEXT,
  "cancellationReferenceId" TEXT,
  "offInvoiceReportId" TEXT,
  "entryType" "OwnerMonthlySettlementEntryType" NOT NULL,
  "sourceDate" TIMESTAMP(3) NOT NULL,
  "sourceTitle" TEXT NOT NULL,
  "baseAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "ownerSharePercent" DECIMAL(5,2),
  "ownerShareAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "includedInSettlement" BOOLEAN NOT NULL DEFAULT true,
  "reviewStatus" "OwnerMonthlySettlementEntryReviewStatus" NOT NULL DEFAULT 'INCLUDED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OwnerMonthlySettlementEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OwnerSettlementPayment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "settlementId" TEXT NOT NULL,
  "paidAmount" DECIMAL(14,2) NOT NULL,
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "referenceNumber" TEXT,
  "receiptFileUrl" TEXT,
  "note" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OwnerSettlementPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OwnerMonthlySettlement_tenantId_operationAgreementId_settlementYear_settlementMonth_key" ON "OwnerMonthlySettlement"("tenantId", "operationAgreementId", "settlementYear", "settlementMonth");
CREATE INDEX "OwnerMonthlySettlement_tenantId_idx" ON "OwnerMonthlySettlement"("tenantId");
CREATE INDEX "OwnerMonthlySettlement_hallId_idx" ON "OwnerMonthlySettlement"("hallId");
CREATE INDEX "OwnerMonthlySettlement_operationAgreementId_idx" ON "OwnerMonthlySettlement"("operationAgreementId");
CREATE INDEX "OwnerMonthlySettlement_tenantId_status_idx" ON "OwnerMonthlySettlement"("tenantId", "status");
CREATE INDEX "OwnerMonthlySettlement_settlementPeriodStart_idx" ON "OwnerMonthlySettlement"("settlementPeriodStart");
CREATE INDEX "OwnerMonthlySettlement_settlementPeriodEnd_idx" ON "OwnerMonthlySettlement"("settlementPeriodEnd");

CREATE INDEX "OwnerMonthlySettlementEntry_tenantId_idx" ON "OwnerMonthlySettlementEntry"("tenantId");
CREATE INDEX "OwnerMonthlySettlementEntry_settlementId_idx" ON "OwnerMonthlySettlementEntry"("settlementId");
CREATE INDEX "OwnerMonthlySettlementEntry_contractId_idx" ON "OwnerMonthlySettlementEntry"("contractId");
CREATE INDEX "OwnerMonthlySettlementEntry_invoiceId_idx" ON "OwnerMonthlySettlementEntry"("invoiceId");
CREATE INDEX "OwnerMonthlySettlementEntry_offInvoiceReportId_idx" ON "OwnerMonthlySettlementEntry"("offInvoiceReportId");
CREATE INDEX "OwnerMonthlySettlementEntry_entryType_idx" ON "OwnerMonthlySettlementEntry"("entryType");
CREATE INDEX "OwnerMonthlySettlementEntry_tenantId_entryType_idx" ON "OwnerMonthlySettlementEntry"("tenantId", "entryType");
CREATE INDEX "OwnerMonthlySettlementEntry_reviewStatus_idx" ON "OwnerMonthlySettlementEntry"("reviewStatus");

CREATE INDEX "OwnerSettlementPayment_tenantId_idx" ON "OwnerSettlementPayment"("tenantId");
CREATE INDEX "OwnerSettlementPayment_settlementId_idx" ON "OwnerSettlementPayment"("settlementId");
CREATE INDEX "OwnerSettlementPayment_createdByUserId_idx" ON "OwnerSettlementPayment"("createdByUserId");
CREATE INDEX "OwnerSettlementPayment_paymentDate_idx" ON "OwnerSettlementPayment"("paymentDate");

ALTER TABLE "OwnerMonthlySettlement" ADD CONSTRAINT "OwnerMonthlySettlement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OwnerMonthlySettlement" ADD CONSTRAINT "OwnerMonthlySettlement_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OwnerMonthlySettlement" ADD CONSTRAINT "OwnerMonthlySettlement_operationAgreementId_fkey" FOREIGN KEY ("operationAgreementId") REFERENCES "HallOperationAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OwnerMonthlySettlement" ADD CONSTRAINT "OwnerMonthlySettlement_calculatedByUserId_fkey" FOREIGN KEY ("calculatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OwnerMonthlySettlement" ADD CONSTRAINT "OwnerMonthlySettlement_lockedByUserId_fkey" FOREIGN KEY ("lockedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OwnerMonthlySettlementEntry" ADD CONSTRAINT "OwnerMonthlySettlementEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OwnerMonthlySettlementEntry" ADD CONSTRAINT "OwnerMonthlySettlementEntry_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "OwnerMonthlySettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OwnerMonthlySettlementEntry" ADD CONSTRAINT "OwnerMonthlySettlementEntry_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OwnerMonthlySettlementEntry" ADD CONSTRAINT "OwnerMonthlySettlementEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PostEventInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OwnerMonthlySettlementEntry" ADD CONSTRAINT "OwnerMonthlySettlementEntry_offInvoiceReportId_fkey" FOREIGN KEY ("offInvoiceReportId") REFERENCES "PostEventInvoiceOffInvoiceReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OwnerSettlementPayment" ADD CONSTRAINT "OwnerSettlementPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OwnerSettlementPayment" ADD CONSTRAINT "OwnerSettlementPayment_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "OwnerMonthlySettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OwnerSettlementPayment" ADD CONSTRAINT "OwnerSettlementPayment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
