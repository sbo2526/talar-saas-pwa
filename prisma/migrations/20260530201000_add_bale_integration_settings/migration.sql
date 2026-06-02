-- Add Bale messenger integration settings.
-- This table mirrors TelegramIntegrationSetting so Bale can behave as a first-class notification channel.
CREATE TABLE "BaleIntegrationSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "botTokenEncrypted" TEXT,
    "botTokenMasked" TEXT,
    "chatId" TEXT,
    "chatTitle" TEXT,
    "sendContractEvents" BOOLEAN NOT NULL DEFAULT true,
    "sendPaymentEvents" BOOLEAN NOT NULL DEFAULT true,
    "sendExpenseEvents" BOOLEAN NOT NULL DEFAULT true,
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

    CONSTRAINT "BaleIntegrationSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BaleIntegrationSetting_tenantId_key" ON "BaleIntegrationSetting"("tenantId");
CREATE INDEX "BaleIntegrationSetting_tenantId_idx" ON "BaleIntegrationSetting"("tenantId");
CREATE INDEX "BaleIntegrationSetting_isEnabled_idx" ON "BaleIntegrationSetting"("isEnabled");

ALTER TABLE "BaleIntegrationSetting" ADD CONSTRAINT "BaleIntegrationSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
