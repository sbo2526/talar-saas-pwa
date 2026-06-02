CREATE TABLE "InAppNotification" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'INFO',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "href" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "fingerprint" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InAppNotification_tenantId_fingerprint_key" ON "InAppNotification"("tenantId", "fingerprint");
CREATE INDEX "InAppNotification_tenantId_idx" ON "InAppNotification"("tenantId");
CREATE INDEX "InAppNotification_userId_idx" ON "InAppNotification"("userId");
CREATE INDEX "InAppNotification_type_idx" ON "InAppNotification"("type");
CREATE INDEX "InAppNotification_severity_idx" ON "InAppNotification"("severity");
CREATE INDEX "InAppNotification_readAt_idx" ON "InAppNotification"("readAt");
CREATE INDEX "InAppNotification_dismissedAt_idx" ON "InAppNotification"("dismissedAt");
CREATE INDEX "InAppNotification_dueAt_idx" ON "InAppNotification"("dueAt");
CREATE INDEX "InAppNotification_createdAt_idx" ON "InAppNotification"("createdAt");

ALTER TABLE "InAppNotification"
ADD CONSTRAINT "InAppNotification_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
