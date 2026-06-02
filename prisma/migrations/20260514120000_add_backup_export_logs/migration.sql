CREATE TABLE "BackupExportLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "fileName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "requestedBy" TEXT,
  "recordCount" INTEGER,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BackupExportLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BackupExportLog_tenantId_idx" ON "BackupExportLog"("tenantId");
CREATE INDEX "BackupExportLog_type_idx" ON "BackupExportLog"("type");
CREATE INDEX "BackupExportLog_status_idx" ON "BackupExportLog"("status");
CREATE INDEX "BackupExportLog_createdAt_idx" ON "BackupExportLog"("createdAt");

ALTER TABLE "BackupExportLog"
ADD CONSTRAINT "BackupExportLog_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
