-- TALAR_CUSTOMER_INVOICE_FEEDBACK_PORTAL_31
-- Customer-facing post-event invoice feedback and owner-control evidence.

CREATE TABLE IF NOT EXISTS "CustomerInvoiceFeedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "linkId" TEXT,
    "customerId" TEXT,
    "fullName" TEXT,
    "mobile" TEXT,
    "invoiceAccepted" BOOLEAN NOT NULL,
    "disputeMessage" TEXT,
    "hadExtraGuests" BOOLEAN NOT NULL DEFAULT false,
    "actualGuestCount" INTEGER,
    "hasExtraPayment" BOOLEAN NOT NULL DEFAULT false,
    "extraPaymentAmount" DECIMAL(14,2),
    "extraPaymentReason" TEXT,
    "extraPaymentReceiver" TEXT,
    "extraPaymentMethod" TEXT,
    "hadPhotography" BOOLEAN NOT NULL DEFAULT false,
    "photographyPaidSeparately" BOOLEAN NOT NULL DEFAULT false,
    "photographyAmount" DECIMAL(14,2),
    "hadVideography" BOOLEAN NOT NULL DEFAULT false,
    "videographyPaidSeparately" BOOLEAN NOT NULL DEFAULT false,
    "videographyAmount" DECIMAL(14,2),
    "hadMusic" BOOLEAN NOT NULL DEFAULT false,
    "musicPaidSeparately" BOOLEAN NOT NULL DEFAULT false,
    "musicAmount" DECIMAL(14,2),
    "hadDecoration" BOOLEAN NOT NULL DEFAULT false,
    "decorationPaidSeparately" BOOLEAN NOT NULL DEFAULT false,
    "decorationAmount" DECIMAL(14,2),
    "hadOtherServices" BOOLEAN NOT NULL DEFAULT false,
    "otherServicesDescription" TEXT,
    "otherServicesAmount" DECIMAL(14,2),
    "confidentialOwnerMessage" TEXT,
    "source" TEXT NOT NULL DEFAULT 'CUSTOMER_INVOICE_PORTAL',
    "isMobileVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerInvoiceFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CustomerInvoiceFeedback_tenantId_idx" ON "CustomerInvoiceFeedback"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerInvoiceFeedback_contractId_idx" ON "CustomerInvoiceFeedback"("contractId");
CREATE INDEX IF NOT EXISTS "CustomerInvoiceFeedback_invoiceId_idx" ON "CustomerInvoiceFeedback"("invoiceId");
CREATE INDEX IF NOT EXISTS "CustomerInvoiceFeedback_linkId_idx" ON "CustomerInvoiceFeedback"("linkId");
CREATE INDEX IF NOT EXISTS "CustomerInvoiceFeedback_customerId_idx" ON "CustomerInvoiceFeedback"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerInvoiceFeedback_invoiceAccepted_idx" ON "CustomerInvoiceFeedback"("invoiceAccepted");
CREATE INDEX IF NOT EXISTS "CustomerInvoiceFeedback_hasExtraPayment_idx" ON "CustomerInvoiceFeedback"("hasExtraPayment");
CREATE INDEX IF NOT EXISTS "CustomerInvoiceFeedback_createdAt_idx" ON "CustomerInvoiceFeedback"("createdAt");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CustomerInvoiceFeedback_tenantId_fkey') THEN
        ALTER TABLE "CustomerInvoiceFeedback" ADD CONSTRAINT "CustomerInvoiceFeedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CustomerInvoiceFeedback_contractId_fkey') THEN
        ALTER TABLE "CustomerInvoiceFeedback" ADD CONSTRAINT "CustomerInvoiceFeedback_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CustomerInvoiceFeedback_invoiceId_fkey') THEN
        ALTER TABLE "CustomerInvoiceFeedback" ADD CONSTRAINT "CustomerInvoiceFeedback_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CustomerInvoiceFeedback_customerId_fkey') THEN
        ALTER TABLE "CustomerInvoiceFeedback" ADD CONSTRAINT "CustomerInvoiceFeedback_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CustomerInvoiceFeedback_linkId_fkey') THEN
        ALTER TABLE "CustomerInvoiceFeedback" ADD CONSTRAINT "CustomerInvoiceFeedback_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "ContractAccessLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
