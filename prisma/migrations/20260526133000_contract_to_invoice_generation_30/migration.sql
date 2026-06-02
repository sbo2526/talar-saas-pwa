-- TALAR_CONTRACT_TO_INVOICE_GENERATION_30
-- Creates tenant-scoped post-event invoices generated from held contract confirmations.

CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'DISPUTED', 'ACCEPTED', 'SETTLED', 'CANCELED');
CREATE TYPE "InvoiceLineSourceType" AS ENUM ('CONTRACT_LINE', 'EXTRA_GUEST', 'EXTRA_SERVICE', 'DAMAGE', 'TIME_EXTENSION', 'OWNER_ADJUSTMENT');

CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "guestCountContracted" INTEGER NOT NULL,
    "guestCountActual" INTEGER NOT NULL,
    "extraGuestCount" INTEGER NOT NULL DEFAULT 0,
    "minimumPerGuestPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "contractSubtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "extraGuestTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paidAmountAtIssue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "payableAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "contractSnapshot" JSONB,
    "issuedByUserId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "contractLineItemId" TEXT,
    "sourceType" "InvoiceLineSourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitLabel" TEXT,
    "unitPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "minUnitPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invoice_contractId_key" ON "Invoice"("contractId");
CREATE UNIQUE INDEX "Invoice_tenantId_invoiceNo_key" ON "Invoice"("tenantId", "invoiceNo");
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");
CREATE INDEX "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");
CREATE INDEX "Invoice_tenantId_issuedAt_idx" ON "Invoice"("tenantId", "issuedAt");
CREATE INDEX "Invoice_issuedByUserId_idx" ON "Invoice"("issuedByUserId");
CREATE INDEX "Invoice_approvedByUserId_idx" ON "Invoice"("approvedByUserId");

CREATE INDEX "InvoiceLine_tenantId_idx" ON "InvoiceLine"("tenantId");
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");
CREATE INDEX "InvoiceLine_contractLineItemId_idx" ON "InvoiceLine"("contractLineItemId");
CREATE INDEX "InvoiceLine_tenantId_sourceType_idx" ON "InvoiceLine"("tenantId", "sourceType");

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_contractLineItemId_fkey" FOREIGN KEY ("contractLineItemId") REFERENCES "ContractLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
