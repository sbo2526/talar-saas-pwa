CREATE TABLE "EmailIntegrationSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "smtpUsername" TEXT,
    "smtpPasswordEncrypted" TEXT,
    "smtpPasswordMasked" TEXT,
    "fromEmail" TEXT,
    "fromName" TEXT,
    "managerEmails" TEXT,
    "sendToManager" BOOLEAN NOT NULL DEFAULT true,
    "sendContractEvents" BOOLEAN NOT NULL DEFAULT false,
    "sendPaymentEvents" BOOLEAN NOT NULL DEFAULT false,
    "sendExpenseEvents" BOOLEAN NOT NULL DEFAULT false,
    "sendCustomerEvents" BOOLEAN NOT NULL DEFAULT false,
    "sendSecurityEvents" BOOLEAN NOT NULL DEFAULT false,
    "sendDailyReports" BOOLEAN NOT NULL DEFAULT false,
    "sendWeeklyReports" BOOLEAN NOT NULL DEFAULT false,
    "sendMonthlyReports" BOOLEAN NOT NULL DEFAULT false,
    "sendEventReminders" BOOLEAN NOT NULL DEFAULT false,
    "sendOutstandingBalanceReminders" BOOLEAN NOT NULL DEFAULT false,
    "dailyReportTime" TEXT,
    "weeklyReportDay" TEXT,
    "monthlyReportDay" INTEGER,
    "lastTestAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailIntegrationSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailIntegrationSetting_tenantId_key" ON "EmailIntegrationSetting"("tenantId");
CREATE INDEX "EmailIntegrationSetting_tenantId_idx" ON "EmailIntegrationSetting"("tenantId");
CREATE INDEX "EmailIntegrationSetting_isEnabled_idx" ON "EmailIntegrationSetting"("isEnabled");

ALTER TABLE "EmailIntegrationSetting" ADD CONSTRAINT "EmailIntegrationSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
