-- PHASE 30: post-event invoice persistence.
-- Safe additive migration only; existing contract financial values are not mutated.

CREATE TYPE "PostEventInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED', 'VOIDED');

CREATE TYPE "PostEventInvoiceLineType" AS ENUM ('CONTRACT_ITEM', 'EXTRA_GUEST', 'EXTRA_SERVICE', 'MANAGER_DEDUCTION', 'NOTE');

CREATE TABLE "PostEventInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "hallId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "status" "PostEventInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "issuedByUserId" TEXT,
    "contractFinalAmountSnapshot" DECIMAL(14,2) NOT NULL,
    "contractGuestCountSnapshot" INTEGER NOT NULL,
    "suggestedPerGuestAmount" DECIMAL(14,2) NOT NULL,
    "finalPerGuestAmount" DECIMAL(14,2) NOT NULL,
    "actualGuestCount" INTEGER,
    "extraGuestCount" INTEGER NOT NULL DEFAULT 0,
    "extraGuestAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "extraServiceAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "managerApprovedDeductionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "previousPaymentsAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "invoiceTotalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "finalBalanceAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "operatorNote" TEXT,
    "managerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostEventInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostEventInvoiceLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "lineType" "PostEventInvoiceLineType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(14,2) NOT NULL DEFAULT 1,
    "unitAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sourceContractLineItemId" TEXT,
    "isLockedFromContract" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostEventInvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostEventInvoice_contractId_key" ON "PostEventInvoice"("contractId");
CREATE UNIQUE INDEX "PostEventInvoice_tenantId_invoiceNumber_key" ON "PostEventInvoice"("tenantId", "invoiceNumber");
CREATE INDEX "PostEventInvoice_tenantId_idx" ON "PostEventInvoice"("tenantId");
CREATE INDEX "PostEventInvoice_hallId_idx" ON "PostEventInvoice"("hallId");
CREATE INDEX "PostEventInvoice_issuedByUserId_idx" ON "PostEventInvoice"("issuedByUserId");
CREATE INDEX "PostEventInvoice_status_idx" ON "PostEventInvoice"("status");
CREATE INDEX "PostEventInvoice_tenantId_status_idx" ON "PostEventInvoice"("tenantId", "status");
CREATE INDEX "PostEventInvoice_issuedAt_idx" ON "PostEventInvoice"("issuedAt");
CREATE INDEX "PostEventInvoiceLine_tenantId_idx" ON "PostEventInvoiceLine"("tenantId");
CREATE INDEX "PostEventInvoiceLine_invoiceId_idx" ON "PostEventInvoiceLine"("invoiceId");
CREATE INDEX "PostEventInvoiceLine_contractId_idx" ON "PostEventInvoiceLine"("contractId");
CREATE INDEX "PostEventInvoiceLine_sourceContractLineItemId_idx" ON "PostEventInvoiceLine"("sourceContractLineItemId");
CREATE INDEX "PostEventInvoiceLine_tenantId_lineType_idx" ON "PostEventInvoiceLine"("tenantId", "lineType");

ALTER TABLE "PostEventInvoice" ADD CONSTRAINT "PostEventInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostEventInvoice" ADD CONSTRAINT "PostEventInvoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostEventInvoice" ADD CONSTRAINT "PostEventInvoice_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PostEventInvoice" ADD CONSTRAINT "PostEventInvoice_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PostEventInvoiceLine" ADD CONSTRAINT "PostEventInvoiceLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostEventInvoiceLine" ADD CONSTRAINT "PostEventInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PostEventInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostEventInvoiceLine" ADD CONSTRAINT "PostEventInvoiceLine_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostEventInvoiceLine" ADD CONSTRAINT "PostEventInvoiceLine_sourceContractLineItemId_fkey" FOREIGN KEY ("sourceContractLineItemId") REFERENCES "ContractLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
