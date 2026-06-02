-- Add scheduled reminder toggles for Telegram and SMS integrations
ALTER TABLE "TelegramIntegrationSetting"
  ADD COLUMN "sendEventReminders" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sendOutstandingBalanceReminders" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SmsIntegrationSetting"
  ADD COLUMN "sendWeeklyReports" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sendMonthlyReports" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sendEventReminders" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sendOutstandingBalanceReminders" BOOLEAN NOT NULL DEFAULT false;
