-- Add tenant-scoped notification database foundation for future Telegram/SMS integrations.
CREATE TABLE "TelegramIntegrationSetting" (
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
    "dailyReportTime" TEXT,
    "weeklyReportDay" TEXT,
    "monthlyReportDay" INTEGER,
    "lastTestAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramIntegrationSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SmsIntegrationSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT,
    "apiKeyEncrypted" TEXT,
    "apiKeyMasked" TEXT,
    "senderNumber" TEXT,
    "managerMobile" TEXT,
    "sendToManager" BOOLEAN NOT NULL DEFAULT true,
    "sendToCustomer" BOOLEAN NOT NULL DEFAULT false,
    "sendContractEvents" BOOLEAN NOT NULL DEFAULT false,
    "sendPaymentEvents" BOOLEAN NOT NULL DEFAULT false,
    "sendExpenseEvents" BOOLEAN NOT NULL DEFAULT false,
    "sendCustomerEvents" BOOLEAN NOT NULL DEFAULT false,
    "sendDailyReports" BOOLEAN NOT NULL DEFAULT false,
    "lastTestAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsIntegrationSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "recipient" TEXT,
    "recipientLabel" TEXT,
    "title" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "relatedContractId" TEXT,
    "relatedPaymentId" TEXT,
    "relatedExpenseId" TEXT,
    "relatedCustomerId" TEXT,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramIntegrationSetting_tenantId_key" ON "TelegramIntegrationSetting"("tenantId");
CREATE INDEX "TelegramIntegrationSetting_tenantId_idx" ON "TelegramIntegrationSetting"("tenantId");
CREATE INDEX "TelegramIntegrationSetting_isEnabled_idx" ON "TelegramIntegrationSetting"("isEnabled");

CREATE UNIQUE INDEX "SmsIntegrationSetting_tenantId_key" ON "SmsIntegrationSetting"("tenantId");
CREATE INDEX "SmsIntegrationSetting_tenantId_idx" ON "SmsIntegrationSetting"("tenantId");
CREATE INDEX "SmsIntegrationSetting_isEnabled_idx" ON "SmsIntegrationSetting"("isEnabled");

CREATE UNIQUE INDEX "NotificationTemplate_tenantId_channel_eventType_key" ON "NotificationTemplate"("tenantId", "channel", "eventType");
CREATE INDEX "NotificationTemplate_tenantId_idx" ON "NotificationTemplate"("tenantId");
CREATE INDEX "NotificationTemplate_channel_idx" ON "NotificationTemplate"("channel");
CREATE INDEX "NotificationTemplate_eventType_idx" ON "NotificationTemplate"("eventType");

CREATE INDEX "NotificationLog_tenantId_idx" ON "NotificationLog"("tenantId");
CREATE INDEX "NotificationLog_channel_idx" ON "NotificationLog"("channel");
CREATE INDEX "NotificationLog_eventType_idx" ON "NotificationLog"("eventType");
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");
CREATE INDEX "NotificationLog_relatedContractId_idx" ON "NotificationLog"("relatedContractId");
CREATE INDEX "NotificationLog_relatedPaymentId_idx" ON "NotificationLog"("relatedPaymentId");
CREATE INDEX "NotificationLog_relatedExpenseId_idx" ON "NotificationLog"("relatedExpenseId");
CREATE INDEX "NotificationLog_relatedCustomerId_idx" ON "NotificationLog"("relatedCustomerId");

ALTER TABLE "TelegramIntegrationSetting" ADD CONSTRAINT "TelegramIntegrationSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SmsIntegrationSetting" ADD CONSTRAINT "SmsIntegrationSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationTemplate" ADD CONSTRAINT "NotificationTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
