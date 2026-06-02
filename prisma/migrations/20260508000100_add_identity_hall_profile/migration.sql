-- AlterTable
ALTER TABLE "User"
ADD COLUMN "nationalCode" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "postalCode" TEXT;

-- CreateTable
CREATE TABLE "TenantHallProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "brandName" TEXT,
    "legalName" TEXT,
    "managerName" TEXT,
    "managerNationalCode" TEXT,
    "registrationNumber" TEXT,
    "economicCode" TEXT,
    "licenseNumber" TEXT,
    "licenseIssuedAt" TIMESTAMP(3),
    "licenseExpiresAt" TIMESTAMP(3),
    "licenseImageUrl" TEXT,
    "licenseImageKey" TEXT,
    "province" TEXT,
    "city" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "totalCapacity" INTEGER,
    "parkingCapacity" INTEGER,
    "hasParking" BOOLEAN NOT NULL DEFAULT false,
    "hasBrideRoom" BOOLEAN NOT NULL DEFAULT false,
    "hasCateringKitchen" BOOLEAN NOT NULL DEFAULT false,
    "hasOutdoorSpace" BOOLEAN NOT NULL DEFAULT false,
    "hasValet" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantHallProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_nationalCode_key" ON "User"("nationalCode");

-- CreateIndex
CREATE UNIQUE INDEX "TenantHallProfile_tenantId_key" ON "TenantHallProfile"("tenantId");

-- CreateIndex
CREATE INDEX "TenantHallProfile_brandName_idx" ON "TenantHallProfile"("brandName");

-- CreateIndex
CREATE INDEX "TenantHallProfile_licenseNumber_idx" ON "TenantHallProfile"("licenseNumber");

-- AddForeignKey
ALTER TABLE "TenantHallProfile" ADD CONSTRAINT "TenantHallProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
