-- AlterEnum
ALTER TYPE "PaymentMethodType" ADD VALUE IF NOT EXISTS 'CARD_TO_CARD';
ALTER TYPE "PaymentMethodType" ADD VALUE IF NOT EXISTS 'OTHER';

-- AlterEnum
ALTER TYPE "FinancialCategoryType" ADD VALUE IF NOT EXISTS 'ASSET';
ALTER TYPE "FinancialCategoryType" ADD VALUE IF NOT EXISTS 'LIABILITY';
ALTER TYPE "FinancialCategoryType" ADD VALUE IF NOT EXISTS 'DISCOUNT';
ALTER TYPE "FinancialCategoryType" ADD VALUE IF NOT EXISTS 'TAX';
ALTER TYPE "FinancialCategoryType" ADD VALUE IF NOT EXISTS 'OTHER';

-- AlterTable
ALTER TABLE "PaymentMethod"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "bankName" TEXT,
  ADD COLUMN "accountHolder" TEXT,
  ADD COLUMN "accountNumber" TEXT,
  ADD COLUMN "cardNumber" TEXT,
  ADD COLUMN "iban" TEXT,
  ADD COLUMN "posTerminalId" TEXT,
  ADD COLUMN "gatewayName" TEXT,
  ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "FinancialCategory"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "color" TEXT,
  ADD COLUMN "icon" TEXT,
  ADD COLUMN "parentId" TEXT,
  ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_tenantId_code_key" ON "PaymentMethod"("tenantId", "code");

-- CreateIndex
CREATE INDEX "PaymentMethod_tenantId_isActive_idx" ON "PaymentMethod"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialCategory_tenantId_code_key" ON "FinancialCategory"("tenantId", "code");

-- CreateIndex
CREATE INDEX "FinancialCategory_tenantId_parentId_idx" ON "FinancialCategory"("tenantId", "parentId");

-- CreateIndex
CREATE INDEX "FinancialCategory_tenantId_isActive_idx" ON "FinancialCategory"("tenantId", "isActive");

-- AddForeignKey
ALTER TABLE "FinancialCategory" ADD CONSTRAINT "FinancialCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
