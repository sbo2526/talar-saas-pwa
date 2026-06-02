-- PHASE 31: customer invoice review link and confidential off-invoice control.
-- Safe additive migration only. No settlement/payment/tax/public accounting side effects.

DO $$ BEGIN
    CREATE TYPE "PostEventInvoiceCustomerFeedbackStatus" AS ENUM ('SUBMITTED', 'OWNER_REVIEW_REQUIRED', 'OWNER_REVIEWED', 'ACCEPTED_BY_OWNER', 'REJECTED_BY_OWNER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PostEventInvoiceMismatchType" AS ENUM ('GUEST_COUNT', 'UNDELIVERED_SERVICE', 'EXTRA_AMOUNT', 'UNRECORDED_PAYMENT', 'SERVICE_QUALITY', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PostEventInvoiceOffInvoiceReportType" AS ENUM ('GENERAL_EXTRA_PAYMENT', 'PHOTO_VIDEO', 'DECORATION_FLOWER', 'MUSIC_SOUND_LIGHT', 'EXTRA_FOOD_DRINK', 'PARKING_TIP_SERVICE', 'STAFF_REQUESTED_PAYMENT', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PostEventInvoiceOwnerReviewStatus" AS ENUM ('REPORTED', 'OWNER_REVIEW_REQUIRED', 'CONFIRMED_OFF_INVOICE', 'REJECTED', 'MARKED_AS_ALLOWED_SIDE_SERVICE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "PostEventInvoiceAccessLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "customerId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "tokenPreview" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "firstViewedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PostEventInvoiceAccessLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PostEventInvoiceCustomerFeedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "customerId" TEXT,
    "accessLinkId" TEXT,
    "feedbackStatus" "PostEventInvoiceCustomerFeedbackStatus" NOT NULL DEFAULT 'SUBMITTED',
    "customerConfirmedInvoice" BOOLEAN,
    "hasMismatch" BOOLEAN NOT NULL DEFAULT false,
    "mismatchType" "PostEventInvoiceMismatchType",
    "mismatchDescription" TEXT,
    "hasOffInvoicePayment" BOOLEAN NOT NULL DEFAULT false,
    "customerGeneralNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerIpHash" TEXT,
    "userAgentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PostEventInvoiceCustomerFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PostEventInvoiceOffInvoiceReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "reportType" "PostEventInvoiceOffInvoiceReportType" NOT NULL,
    "serviceTitle" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paidToName" TEXT,
    "paidToRole" TEXT,
    "paymentMethod" TEXT,
    "paymentDate" TIMESTAMP(3),
    "receiptFileUrl" TEXT,
    "customerDescription" TEXT,
    "ownerReviewStatus" "PostEventInvoiceOwnerReviewStatus" NOT NULL DEFAULT 'REPORTED',
    "ownerDecision" TEXT,
    "ownerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PostEventInvoiceOffInvoiceReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PostEventInvoiceAccessLink_tokenHash_key" ON "PostEventInvoiceAccessLink"("tokenHash");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceAccessLink_tenantId_idx" ON "PostEventInvoiceAccessLink"("tenantId");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceAccessLink_invoiceId_idx" ON "PostEventInvoiceAccessLink"("invoiceId");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceAccessLink_contractId_idx" ON "PostEventInvoiceAccessLink"("contractId");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceAccessLink_customerId_idx" ON "PostEventInvoiceAccessLink"("customerId");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceAccessLink_expiresAt_idx" ON "PostEventInvoiceAccessLink"("expiresAt");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceAccessLink_revokedAt_idx" ON "PostEventInvoiceAccessLink"("revokedAt");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceAccessLink_tenantId_invoiceId_idx" ON "PostEventInvoiceAccessLink"("tenantId", "invoiceId");

CREATE INDEX IF NOT EXISTS "PostEventInvoiceCustomerFeedback_tenantId_idx" ON "PostEventInvoiceCustomerFeedback"("tenantId");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceCustomerFeedback_invoiceId_idx" ON "PostEventInvoiceCustomerFeedback"("invoiceId");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceCustomerFeedback_contractId_idx" ON "PostEventInvoiceCustomerFeedback"("contractId");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceCustomerFeedback_customerId_idx" ON "PostEventInvoiceCustomerFeedback"("customerId");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceCustomerFeedback_accessLinkId_idx" ON "PostEventInvoiceCustomerFeedback"("accessLinkId");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceCustomerFeedback_feedbackStatus_idx" ON "PostEventInvoiceCustomerFeedback"("feedbackStatus");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceCustomerFeedback_tenantId_feedbackStatus_idx" ON "PostEventInvoiceCustomerFeedback"("tenantId", "feedbackStatus");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceCustomerFeedback_tenantId_hasOffInvoicePayment_idx" ON "PostEventInvoiceCustomerFeedback"("tenantId", "hasOffInvoicePayment");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceCustomerFeedback_tenantId_hasMismatch_idx" ON "PostEventInvoiceCustomerFeedback"("tenantId", "hasMismatch");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceCustomerFeedback_submittedAt_idx" ON "PostEventInvoiceCustomerFeedback"("submittedAt");

CREATE INDEX IF NOT EXISTS "PostEventInvoiceOffInvoiceReport_tenantId_idx" ON "PostEventInvoiceOffInvoiceReport"("tenantId");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceOffInvoiceReport_invoiceId_idx" ON "PostEventInvoiceOffInvoiceReport"("invoiceId");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceOffInvoiceReport_contractId_idx" ON "PostEventInvoiceOffInvoiceReport"("contractId");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceOffInvoiceReport_feedbackId_idx" ON "PostEventInvoiceOffInvoiceReport"("feedbackId");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceOffInvoiceReport_reportType_idx" ON "PostEventInvoiceOffInvoiceReport"("reportType");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceOffInvoiceReport_ownerReviewStatus_idx" ON "PostEventInvoiceOffInvoiceReport"("ownerReviewStatus");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceOffInvoiceReport_tenantId_ownerReviewStatus_idx" ON "PostEventInvoiceOffInvoiceReport"("tenantId", "ownerReviewStatus");
CREATE INDEX IF NOT EXISTS "PostEventInvoiceOffInvoiceReport_createdAt_idx" ON "PostEventInvoiceOffInvoiceReport"("createdAt");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PostEventInvoiceAccessLink_tenantId_fkey') THEN
        ALTER TABLE "PostEventInvoiceAccessLink" ADD CONSTRAINT "PostEventInvoiceAccessLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PostEventInvoiceAccessLink_invoiceId_fkey') THEN
        ALTER TABLE "PostEventInvoiceAccessLink" ADD CONSTRAINT "PostEventInvoiceAccessLink_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PostEventInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PostEventInvoiceAccessLink_contractId_fkey') THEN
        ALTER TABLE "PostEventInvoiceAccessLink" ADD CONSTRAINT "PostEventInvoiceAccessLink_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PostEventInvoiceAccessLink_customerId_fkey') THEN
        ALTER TABLE "PostEventInvoiceAccessLink" ADD CONSTRAINT "PostEventInvoiceAccessLink_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PostEventInvoiceCustomerFeedback_tenantId_fkey') THEN
        ALTER TABLE "PostEventInvoiceCustomerFeedback" ADD CONSTRAINT "PostEventInvoiceCustomerFeedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PostEventInvoiceCustomerFeedback_invoiceId_fkey') THEN
        ALTER TABLE "PostEventInvoiceCustomerFeedback" ADD CONSTRAINT "PostEventInvoiceCustomerFeedback_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PostEventInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PostEventInvoiceCustomerFeedback_contractId_fkey') THEN
        ALTER TABLE "PostEventInvoiceCustomerFeedback" ADD CONSTRAINT "PostEventInvoiceCustomerFeedback_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PostEventInvoiceCustomerFeedback_customerId_fkey') THEN
        ALTER TABLE "PostEventInvoiceCustomerFeedback" ADD CONSTRAINT "PostEventInvoiceCustomerFeedback_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PostEventInvoiceCustomerFeedback_accessLinkId_fkey') THEN
        ALTER TABLE "PostEventInvoiceCustomerFeedback" ADD CONSTRAINT "PostEventInvoiceCustomerFeedback_accessLinkId_fkey" FOREIGN KEY ("accessLinkId") REFERENCES "PostEventInvoiceAccessLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PostEventInvoiceOffInvoiceReport_tenantId_fkey') THEN
        ALTER TABLE "PostEventInvoiceOffInvoiceReport" ADD CONSTRAINT "PostEventInvoiceOffInvoiceReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PostEventInvoiceOffInvoiceReport_invoiceId_fkey') THEN
        ALTER TABLE "PostEventInvoiceOffInvoiceReport" ADD CONSTRAINT "PostEventInvoiceOffInvoiceReport_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PostEventInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PostEventInvoiceOffInvoiceReport_contractId_fkey') THEN
        ALTER TABLE "PostEventInvoiceOffInvoiceReport" ADD CONSTRAINT "PostEventInvoiceOffInvoiceReport_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PostEventInvoiceOffInvoiceReport_feedbackId_fkey') THEN
        ALTER TABLE "PostEventInvoiceOffInvoiceReport" ADD CONSTRAINT "PostEventInvoiceOffInvoiceReport_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "PostEventInvoiceCustomerFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
