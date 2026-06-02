-- CreateEnum
CREATE TYPE "ServicePricingType" AS ENUM ('FIXED', 'PER_GUEST', 'PER_HOUR', 'PER_ITEM', 'CUSTOM');

-- AlterTable
ALTER TABLE "Menu"
  ADD COLUMN "basePrice" DECIMAL(14,2),
  ADD COLUMN "category" TEXT,
  ADD COLUMN "code" TEXT,
  ADD COLUMN "includedItems" TEXT,
  ADD COLUMN "isRecommended" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isTaxable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "maxGuests" INTEGER,
  ADD COLUMN "minGuests" INTEGER,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Service"
  ADD COLUMN "basePrice" DECIMAL(14,2),
  ADD COLUMN "category" TEXT,
  ADD COLUMN "code" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "isRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "pricingType" "ServicePricingType" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ContractSetting"
  ADD COLUMN "cancellationPolicy" TEXT,
  ADD COLUMN "customerSignatureLabel" TEXT NOT NULL DEFAULT 'امضای مشتری',
  ADD COLUMN "defaultDepositPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "defaultDiscountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "fiscalYear" TEXT,
  ADD COLUMN "footerNote" TEXT,
  ADD COLUMN "managerSignatureLabel" TEXT NOT NULL DEFAULT 'امضای مدیر تالار',
  ADD COLUMN "paymentTerms" TEXT,
  ADD COLUMN "printTemplateName" TEXT,
  ADD COLUMN "requireNationalCode" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requirePhone" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showLicenseInfoOnPrint" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showLogoOnPrint" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "Menu_tenantId_code_key" ON "Menu"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Menu_tenantId_isActive_idx" ON "Menu"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Service_tenantId_code_key" ON "Service"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Service_tenantId_isActive_idx" ON "Service"("tenantId", "isActive");
