-- TALAR_POST_EVENT_MANDATORY_CONFIRMATION_29
-- Adds a narrow tenant-scoped post-event confirmation table.

CREATE TYPE "PostEventConfirmationStatus" AS ENUM ('HELD', 'NOT_HELD');
CREATE TYPE "PostEventConfirmationSource" AS ENUM ('DASHBOARD_GATE');

CREATE TABLE "PostEventConfirmation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "confirmedByUserId" TEXT NOT NULL,
    "status" "PostEventConfirmationStatus" NOT NULL,
    "source" "PostEventConfirmationSource" NOT NULL DEFAULT 'DASHBOARD_GATE',
    "note" TEXT,
    "invoiceRequired" BOOLEAN NOT NULL DEFAULT false,
    "cancellationRequired" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostEventConfirmation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostEventConfirmation_contractId_key" ON "PostEventConfirmation"("contractId");
CREATE INDEX "PostEventConfirmation_tenantId_idx" ON "PostEventConfirmation"("tenantId");
CREATE INDEX "PostEventConfirmation_tenantId_status_idx" ON "PostEventConfirmation"("tenantId", "status");
CREATE INDEX "PostEventConfirmation_tenantId_confirmedAt_idx" ON "PostEventConfirmation"("tenantId", "confirmedAt");
CREATE INDEX "PostEventConfirmation_confirmedByUserId_idx" ON "PostEventConfirmation"("confirmedByUserId");

ALTER TABLE "PostEventConfirmation" ADD CONSTRAINT "PostEventConfirmation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostEventConfirmation" ADD CONSTRAINT "PostEventConfirmation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostEventConfirmation" ADD CONSTRAINT "PostEventConfirmation_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
