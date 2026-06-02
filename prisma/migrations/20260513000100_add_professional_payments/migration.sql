-- Professional payment operations model extension.
-- Keeps existing Payment rows and enriches them for payment type/status, customer link, cheque/receipt metadata and reporting.

-- AlterTable
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "customerId" TEXT,
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'DEPOSIT',
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'RECORDED',
  ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "trackingCode" TEXT,
  ADD COLUMN IF NOT EXISTS "chequeNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "chequeDueDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "receiptImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "receiptImageKey" TEXT,
  ADD COLUMN IF NOT EXISTS "note" TEXT;

-- Backfill customerId from existing contract relation where available.
UPDATE "Payment" AS p
SET "customerId" = c."customerId"
FROM "Contract" AS c
WHERE p."contractId" = c."id"
  AND p."customerId" IS NULL;

-- Make contractId optional and switch contract/customer relations to SET NULL.
ALTER TABLE "Payment" ALTER COLUMN "contractId" DROP NOT NULL;

ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_contractId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes for operations and reporting.
CREATE INDEX IF NOT EXISTS "Payment_tenantId_idx" ON "Payment"("tenantId");
CREATE INDEX IF NOT EXISTS "Payment_customerId_idx" ON "Payment"("customerId");
CREATE INDEX IF NOT EXISTS "Payment_paymentMethodId_idx" ON "Payment"("paymentMethodId");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");
CREATE INDEX IF NOT EXISTS "Payment_type_idx" ON "Payment"("type");
