-- Expand expense records into full financial operations entries.
ALTER TABLE "Expense" ADD COLUMN "contractId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "customerId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "hallId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "salonId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "paymentMethodId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "title" TEXT NOT NULL DEFAULT 'هزینه عملیاتی';
ALTER TABLE "Expense" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'RECORDED';
ALTER TABLE "Expense" ADD COLUMN "vendorName" TEXT;
ALTER TABLE "Expense" ADD COLUMN "referenceNumber" TEXT;
ALTER TABLE "Expense" ADD COLUMN "receiptImageUrl" TEXT;
ALTER TABLE "Expense" ADD COLUMN "receiptImageKey" TEXT;
ALTER TABLE "Expense" ADD COLUMN "note" TEXT;
ALTER TABLE "Expense" ALTER COLUMN "description" SET DEFAULT '';

UPDATE "Expense"
SET "title" = COALESCE(NULLIF("description", ''), "title")
WHERE "title" = 'هزینه عملیاتی';

CREATE INDEX "Expense_tenantId_idx" ON "Expense"("tenantId");
CREATE INDEX "Expense_contractId_idx" ON "Expense"("contractId");
CREATE INDEX "Expense_customerId_idx" ON "Expense"("customerId");
CREATE INDEX "Expense_hallId_idx" ON "Expense"("hallId");
CREATE INDEX "Expense_salonId_idx" ON "Expense"("salonId");
CREATE INDEX "Expense_financialCategoryId_idx" ON "Expense"("financialCategoryId");
CREATE INDEX "Expense_paymentMethodId_idx" ON "Expense"("paymentMethodId");
CREATE INDEX "Expense_occurredAt_idx" ON "Expense"("occurredAt");
CREATE INDEX "Expense_status_idx" ON "Expense"("status");
CREATE INDEX "Expense_tenantId_status_idx" ON "Expense"("tenantId", "status");

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
