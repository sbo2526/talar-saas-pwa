import "server-only";

import { sendSmsMessage } from "@/lib/integrations/sms";
import {
  getNotificationEventLabel,
  isNotificationEventType,
  type NotificationEventType,
} from "@/lib/notifications/constants";
import {
  createNotificationLog,
  createSkippedNotificationLog,
  markNotificationLogFailed,
  markNotificationLogSent,
} from "@/lib/notifications/notification-service";
import { parseSmsRecipients } from "@/lib/notifications/recipient-utils";
import {
  getDefaultNotificationTemplate,
  getForcedNotificationTemplate,
  renderNotificationTemplate,
  shouldUpgradeStoredNotificationTemplate,
} from "@/lib/notifications/template-renderer";
import { getPrisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/secret-field";

type SmsDispatchInput = {
  tenantId: string;
  eventType: string;
  variables: Record<string, unknown>;
  relatedContractId?: string | null;
  relatedPaymentId?: string | null;
  relatedExpenseId?: string | null;
  relatedCustomerId?: string | null;
};

type SmsDispatchResult =
  | { ok: true; status: "SENT"; sentCount: number; failedCount: number }
  | { ok: false; status: "FAILED"; sentCount: number; failedCount: number; error: string }
  | { ok: false; status: "SKIPPED"; error?: string };

type SmsSettingRow = {
  isEnabled: boolean;
  provider: string | null;
  apiKeyEncrypted: string | null;
  senderNumber: string | null;
  managerMobile: string | null;
  sendToManager: boolean;
  sendContractEvents: boolean;
  sendPaymentEvents: boolean;
  sendExpenseEvents: boolean;
  sendCustomerEvents: boolean;
  sendDailyReports: boolean;
  sendWeeklyReports: boolean;
  sendMonthlyReports: boolean;
  sendEventReminders: boolean;
  sendOutstandingBalanceReminders: boolean;
};

type SmsTemplateRow = {
  title: string;
  body: string;
  isEnabled: boolean;
} | null;

type SmsDispatchClient = {
  smsIntegrationSetting: {
    findUnique(args: unknown): Promise<SmsSettingRow | null>;
    updateMany(args: unknown): Promise<unknown>;
  };
  notificationTemplate: {
    findUnique(args: unknown): Promise<SmsTemplateRow>;
  };
};

async function getSmsDispatchClient() {
  return (await getPrisma()) as unknown as SmsDispatchClient;
}

function getToggleName(eventType: NotificationEventType): keyof SmsSettingRow | null {
  if (eventType.startsWith("CONTRACT_")) return "sendContractEvents";
  if (eventType.startsWith("PAYMENT_")) return "sendPaymentEvents";
  if (eventType.startsWith("EXPENSE_")) return "sendExpenseEvents";
  if (eventType.startsWith("CUSTOMER_")) return "sendCustomerEvents";
  if (eventType === "DAILY_REPORT") return "sendDailyReports";
  if (eventType === "WEEKLY_REPORT") return "sendWeeklyReports";
  if (eventType === "MONTHLY_REPORT") return "sendMonthlyReports";
  if (eventType === "EVENT_REMINDER_TOMORROW") return "sendEventReminders";
  if (eventType === "OUTSTANDING_BALANCE_REMINDER") return "sendOutstandingBalanceReminders";
  if (eventType === "POST_EVENT_INVOICE_DELIVERY_MANAGER") return "sendContractEvents";
  if (eventType === "TEST_MESSAGE") return null;
  return null;
}

function cleanDispatcherError(error: unknown) {
  if (error instanceof Error) {
    if (/NOTIFICATION_SECRET_KEY|NEXTAUTH_SECRET|AUTH_SECRET/.test(error.message)) {
      return "کلید امنیتی ذخیره اطلاعات محرمانه تنظیم نشده است.";
    }

    return error.message.slice(0, 500) || "ارسال اعلان پیامکی ناموفق بود.";
  }

  return "ارسال اعلان پیامکی ناموفق بود.";
}

function renderWithVariables(template: string, variables: Record<string, unknown>) {
  return renderNotificationTemplate(template, variables).trim();
}

export async function dispatchSmsNotification(input: SmsDispatchInput): Promise<SmsDispatchResult> {
  try {
    if (!input.tenantId?.trim() || !isNotificationEventType(input.eventType)) {
      return { ok: false, status: "SKIPPED", error: "نوع اعلان معتبر نیست." };
    }

    const eventType = input.eventType;
    const db = await getSmsDispatchClient();
    const setting = await db.smsIntegrationSetting.findUnique({
      where: { tenantId: input.tenantId },
      select: {
        isEnabled: true,
        provider: true,
        apiKeyEncrypted: true,
        senderNumber: true,
        managerMobile: true,
        sendToManager: true,
        sendContractEvents: true,
        sendPaymentEvents: true,
        sendExpenseEvents: true,
        sendCustomerEvents: true,
        sendDailyReports: true,
        sendWeeklyReports: true,
        sendMonthlyReports: true,
        sendEventReminders: true,
        sendOutstandingBalanceReminders: true,
      },
    });

    if (!setting?.isEnabled || !setting.sendToManager) {
      return { ok: false, status: "SKIPPED" };
    }

    const toggleName = getToggleName(eventType);
    if (toggleName && !setting[toggleName]) {
      return { ok: false, status: "SKIPPED" };
    }

    const forcedTemplate = getForcedNotificationTemplate("SMS", eventType);
    const defaultTemplate = forcedTemplate ?? getDefaultNotificationTemplate("SMS", eventType);
    const titleFallback = defaultTemplate?.title ?? getNotificationEventLabel(eventType);
    const bodyFallback = defaultTemplate?.body ?? "اعلان {{eventType}} برای {{tenantName}} ثبت شد.";

    const template = forcedTemplate
      ? null
      : await db.notificationTemplate.findUnique({
          where: {
            tenantId_channel_eventType: {
              tenantId: input.tenantId,
              channel: "SMS",
              eventType,
            },
          },
          select: { title: true, body: true, isEnabled: true },
        });

    if (template && !template.isEnabled) {
      return { ok: false, status: "SKIPPED" };
    }

    const usableTemplate = template && !shouldUpgradeStoredNotificationTemplate({
      channel: "SMS",
      eventType,
      title: template.title,
      body: template.body,
    }) ? template : null;

    const variables = {
      eventType: getNotificationEventLabel(eventType),
      ...input.variables,
    };
    const title = renderWithVariables(usableTemplate?.title ?? titleFallback, variables) || titleFallback;
    const message = renderWithVariables(usableTemplate?.body ?? bodyFallback, variables) || title;
    const recipients = parseSmsRecipients(setting.managerMobile);

    if (!setting.provider || !setting.apiKeyEncrypted || recipients.length === 0) {
      await createSkippedNotificationLog({
        tenantId: input.tenantId,
        channel: "SMS",
        eventType,
        recipient: setting.managerMobile,
        recipientLabel: "شماره‌های مالک/مدیر",
        title,
        message: "تنظیمات پیامک برای ارسال این اعلان کامل نیست.",
        relatedContractId: input.relatedContractId ?? null,
        relatedPaymentId: input.relatedPaymentId ?? null,
        relatedExpenseId: input.relatedExpenseId ?? null,
        relatedCustomerId: input.relatedCustomerId ?? null,
      });
      return { ok: false, status: "SKIPPED", error: "تنظیمات پیامک کامل نیست." };
    }

    let apiKey: string;
    try {
      apiKey = decryptSecret(setting.apiKeyEncrypted);
    } catch (error) {
      const messageText = cleanDispatcherError(error);
      await db.smsIntegrationSetting.updateMany({
        where: { tenantId: input.tenantId },
        data: { lastErrorAt: new Date(), lastErrorMessage: messageText },
      });
      return { ok: false, status: "FAILED", sentCount: 0, failedCount: recipients.length, error: messageText };
    }

    let sentCount = 0;
    let failedCount = 0;
    let lastError: string | null = null;

    for (const recipient of recipients) {
      const log = await createNotificationLog({
        tenantId: input.tenantId,
        channel: "SMS",
        eventType,
        recipient,
        recipientLabel: recipients.length > 1 ? "شماره مالک/مدیر" : "شماره مدیر",
        title,
        message,
        status: "QUEUED",
        relatedContractId: input.relatedContractId ?? null,
        relatedPaymentId: input.relatedPaymentId ?? null,
        relatedExpenseId: input.relatedExpenseId ?? null,
        relatedCustomerId: input.relatedCustomerId ?? null,
      });

      const sent = await sendSmsMessage({
        provider: setting.provider,
        apiKey,
        senderNumber: setting.senderNumber,
        receptor: recipient,
        message,
      });

      if (sent.ok) {
        sentCount += 1;
        await markNotificationLogSent(log.id, input.tenantId);
      } else {
        failedCount += 1;
        lastError = sent.error;
        await markNotificationLogFailed(log.id, input.tenantId, sent.error);
      }
    }

    if (sentCount > 0) {
      await db.smsIntegrationSetting.updateMany({
        where: { tenantId: input.tenantId },
        data: { lastSuccessAt: new Date(), lastErrorMessage: failedCount > 0 ? lastError : null },
      });
      return { ok: true, status: "SENT", sentCount, failedCount };
    }

    const errorMessage = lastError ?? "ارسال پیامک ناموفق بود.";
    await db.smsIntegrationSetting.updateMany({
      where: { tenantId: input.tenantId },
      data: { lastErrorAt: new Date(), lastErrorMessage: errorMessage },
    });
    return { ok: false, status: "FAILED", sentCount, failedCount, error: errorMessage };
  } catch (error) {
    return { ok: false, status: "FAILED", sentCount: 0, failedCount: 1, error: cleanDispatcherError(error) };
  }
}
