-- CreateEnum
CREATE TYPE "ContractLineItemType" AS ENUM ('SERVICE', 'MENU', 'DRINK', 'DESSERT');

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "depositAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "eventEndTime" TEXT,
ADD COLUMN     "eventStartTime" TEXT,
ADD COLUMN     "eventTypeId" TEXT,
ADD COLUMN     "eventTypeName" TEXT,
ADD COLUMN     "finalTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "hallId" TEXT,
ADD COLUMN     "menuTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "remainingAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "salonId" TEXT,
ADD COLUMN     "servicesTotal" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "address" TEXT,
ADD COLUMN     "nationalCode" TEXT,
ADD COLUMN     "salutation" TEXT;

-- CreateTable
CREATE TABLE "ContractEventType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractEventType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractLineItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "ContractLineItemType" NOT NULL,
    "category" TEXT,
    "name" TEXT NOT NULL,
    "sourceId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractEventType_tenantId_idx" ON "ContractEventType"("tenantId");

-- CreateIndex
CREATE INDEX "ContractEventType_tenantId_isActive_idx" ON "ContractEventType"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ContractEventType_tenantId_name_key" ON "ContractEventType"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ContractLineItem_tenantId_idx" ON "ContractLineItem"("tenantId");

-- CreateIndex
CREATE INDEX "ContractLineItem_contractId_idx" ON "ContractLineItem"("contractId");

-- CreateIndex
CREATE INDEX "ContractLineItem_tenantId_type_idx" ON "ContractLineItem"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Contract_tenantId_hallId_idx" ON "Contract"("tenantId", "hallId");

-- CreateIndex
CREATE INDEX "Contract_tenantId_salonId_idx" ON "Contract"("tenantId", "salonId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_nationalCode_idx" ON "Customer"("tenantId", "nationalCode");

-- AddForeignKey
ALTER TABLE "ContractEventType" ADD CONSTRAINT "ContractEventType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "ContractEventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractLineItem" ADD CONSTRAINT "ContractLineItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractLineItem" ADD CONSTRAINT "ContractLineItem_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
