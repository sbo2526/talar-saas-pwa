-- TALAR_INVOICE_ADJUSTMENT_AND_OWNER_APPROVAL_35
-- Adds owner-controlled invoice adjustment requests. Adjustments are positive-only and applied as locked OWNER_ADJUSTMENT invoice lines after owner approval.

CREATE TYPE "InvoiceAdjustmentStatus" AS ENUM ('PENDING', 'APPLIED', 'REJECTED');

CREATE TABLE "InvoiceAdjustmentRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "rejectedByUserId" TEXT,
    "appliedLineId" TEXT,
    "status" "InvoiceAdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reason" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitLabel" TEXT,
    "unitPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "minUnitPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "beforeSubtotal" DECIMAL(14,2),
    "beforePayable" DECIMAL(14,2),
    "afterSubtotal" DECIMAL(14,2),
    "afterPayable" DECIMAL(14,2),
    "ownerDecisionNote" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceAdjustmentRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvoiceAdjustmentRequest_tenantId_idx" ON "InvoiceAdjustmentRequest"("tenantId");
CREATE INDEX "InvoiceAdjustmentRequest_invoiceId_idx" ON "InvoiceAdjustmentRequest"("invoiceId");
CREATE INDEX "InvoiceAdjustmentRequest_contractId_idx" ON "InvoiceAdjustmentRequest"("contractId");
CREATE INDEX "InvoiceAdjustmentRequest_requestedByUserId_idx" ON "InvoiceAdjustmentRequest"("requestedByUserId");
CREATE INDEX "InvoiceAdjustmentRequest_approvedByUserId_idx" ON "InvoiceAdjustmentRequest"("approvedByUserId");
CREATE INDEX "InvoiceAdjustmentRequest_rejectedByUserId_idx" ON "InvoiceAdjustmentRequest"("rejectedByUserId");
CREATE INDEX "InvoiceAdjustmentRequest_tenantId_status_idx" ON "InvoiceAdjustmentRequest"("tenantId", "status");
CREATE INDEX "InvoiceAdjustmentRequest_appliedLineId_idx" ON "InvoiceAdjustmentRequest"("appliedLineId");

ALTER TABLE "InvoiceAdjustmentRequest" ADD CONSTRAINT "InvoiceAdjustmentRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceAdjustmentRequest" ADD CONSTRAINT "InvoiceAdjustmentRequest_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceAdjustmentRequest" ADD CONSTRAINT "InvoiceAdjustmentRequest_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceAdjustmentRequest" ADD CONSTRAINT "InvoiceAdjustmentRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceAdjustmentRequest" ADD CONSTRAINT "InvoiceAdjustmentRequest_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvoiceAdjustmentRequest" ADD CONSTRAINT "InvoiceAdjustmentRequest_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
