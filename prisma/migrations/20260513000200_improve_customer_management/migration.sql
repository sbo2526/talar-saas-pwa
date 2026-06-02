ALTER TABLE "Customer" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Customer_tenantId_isActive_idx" ON "Customer"("tenantId", "isActive");
