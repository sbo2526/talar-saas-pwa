import "server-only";

import { sendTelegramMessage } from "@/lib/integrations/telegram";
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
import { getDefaultNotificationTemplate, getForcedNotificationTemplate, renderNotificationTemplate } from "@/lib/notifications/template-renderer";
import { getPrisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/secret-field";

type TelegramDispatchInput = {
  tenantId: string;
  eventType: string;
  variables: Record<string, unknown>;
  relatedContractId?: string | null;
  relatedPaymentId?: string | null;
  relatedExpenseId?: string | null;
  relatedCustomerId?: string | null;
};

type TelegramDispatchResult =
  | { ok: true; status: "SENT"; logId: string }
  | { ok: false; status: "FAILED"; logId?: string; error: string }
  | { ok: false; status: "SKIPPED"; logId?: string; error?: string };

type TelegramSettingRow = {
  isEnabled: boolean;
  botTokenEncrypted: string | null;
  chatId: string | null;
  chatTitle: string | null;
  sendContractEvents: boolean;
  sendPaymentEvents: boolean;
  sendExpenseEvents: boolean;
  sendCustomerEvents: boolean;
  sendSecurityEvents: boolean;
  sendDailyReports: boolean;
  sendWeeklyReports: boolean;
  sendMonthlyReports: boolean;
};

type TelegramTemplateRow = {
  title: string;
  body: string;
  isEnabled: boolean;
} | null;

type TelegramDispatchClient = {
  telegramIntegrationSetting: {
    findUnique(args: unknown): Promise<TelegramSettingRow | null>;
    updateMany(args: unknown): Promise<unknown>;
  };
  notificationTemplate: {
    findUnique(args: unknown): Promise<TelegramTemplateRow>;
  };
};

async function getTelegramDispatchClient() {
  return (await getPrisma()) as unknown as TelegramDispatchClient;
}

function getToggleName(eventType: NotificationEventType): keyof TelegramSettingRow | null {
  if (eventType.startsWith("CONTRACT_")) {
    return "sendContractEvents";
  }

  if (eventType.startsWith("PAYMENT_")) {
    return "sendPaymentEvents";
  }

  if (eventType.startsWith("EXPENSE_")) {
    return "sendExpenseEvents";
  }

  if (eventType.startsWith("CUSTOMER_")) {
    return "sendCustomerEvents";
  }

  if (eventType === "SECURITY_EVENT") {
    return "sendSecurityEvents";
  }

  if (eventType === "DAILY_REPORT") {
    return "sendDailyReports";
  }

  if (eventType === "WEEKLY_REPORT") {
    return "sendWeeklyReports";
  }

  if (eventType === "MONTHLY_REPORT") {
    return "sendMonthlyReports";
  }

  if (eventType === "TEST_MESSAGE") {
    return null;
  }

  return null;
}

function cleanDispatcherError(error: unknown) {
  if (error instanceof Error) {
    if (/NOTIFICATION_SECRET_KEY|NEXTAUTH_SECRET|AUTH_SECRET/.test(error.message)) {
      return "کلید امنیتی ذخیره اطلاعات محرمانه تنظیم نشده است.";
    }

    return error.message.slice(0, 500) || "ارسال اعلان تلگرام ناموفق بود.";
  }

  return "ارسال اعلان تلگرام ناموفق بود.";
}

function renderWithVariables(template: string, variables: Record<string, unknown>) {
  return renderNotificationTemplate(template, variables).trim();
}

export async function dispatchTelegramNotification(
  input: TelegramDispatchInput,
): Promise<TelegramDispatchResult> {
  try {
    if (!input.tenantId?.trim() || !isNotificationEventType(input.eventType)) {
      return { ok: false, status: "SKIPPED", error: "نوع اعلان معتبر نیست." };
    }

    const eventType = input.eventType;
    const db = await getTelegramDispatchClient();
    const setting = await db.telegramIntegrationSetting.findUnique({
      where: { tenantId: input.tenantId },
      select: {
        isEnabled: true,
        botTokenEncrypted: true,
        chatId: true,
        chatTitle: true,
        sendContractEvents: true,
        sendPaymentEvents: true,
        sendExpenseEvents: true,
        sendCustomerEvents: true,
        sendSecurityEvents: true,
        sendDailyReports: true,
        sendWeeklyReports: true,
        sendMonthlyReports: true,
      },
    });

    if (!setting?.isEnabled) {
      return { ok: false, status: "SKIPPED" };
    }

    const toggleName = getToggleName(eventType);
    if (toggleName && !setting[toggleName]) {
      return { ok: false, status: "SKIPPED" };
    }

    const forcedTemplate = getForcedNotificationTemplate("TELEGRAM", eventType);
    const defaultTemplate = forcedTemplate ?? getDefaultNotificationTemplate("TELEGRAM", eventType);
    const titleFallback = defaultTemplate?.title ?? getNotificationEventLabel(eventType);
    const bodyFallback = defaultTemplate?.body ?? "اعلان {{eventType}} برای {{tenantName}} ثبت شد.";

    const template = forcedTemplate
      ? null
      : await db.notificationTemplate.findUnique({
          where: {
            tenantId_channel_eventType: {
              tenantId: input.tenantId,
              channel: "TELEGRAM",
              eventType,
            },
          },
          select: { title: true, body: true, isEnabled: true },
        });

    if (template && !template.isEnabled) {
      return { ok: false, status: "SKIPPED" };
    }

    const variables = {
      eventType: getNotificationEventLabel(eventType),
      ...input.variables,
    };
    const title = renderWithVariables(template?.title ?? titleFallback, variables) || titleFallback;
    const message = renderWithVariables(template?.body ?? bodyFallback, variables) || title;

    if (!setting.botTokenEncrypted || !setting.chatId) {
      await createSkippedNotificationLog({
        tenantId: input.tenantId,
        channel: "TELEGRAM",
        eventType,
        recipient: setting.chatId,
        recipientLabel: setting.chatTitle,
        title,
        message: "تنظیمات تلگرام برای ارسال این اعلان کامل نیست.",
        relatedContractId: input.relatedContractId ?? null,
        relatedPaymentId: input.relatedPaymentId ?? null,
        relatedExpenseId: input.relatedExpenseId ?? null,
        relatedCustomerId: input.relatedCustomerId ?? null,
      });
      return { ok: false, status: "SKIPPED", error: "تنظیمات تلگرام کامل نیست." };
    }

    const log = await createNotificationLog({
      tenantId: input.tenantId,
      channel: "TELEGRAM",
      eventType,
      recipient: setting.chatId,
      recipientLabel: setting.chatTitle,
      title,
      message,
      status: "QUEUED",
      relatedContractId: input.relatedContractId ?? null,
      relatedPaymentId: input.relatedPaymentId ?? null,
      relatedExpenseId: input.relatedExpenseId ?? null,
      relatedCustomerId: input.relatedCustomerId ?? null,
    });

    let botToken: string;
    try {
      botToken = decryptSecret(setting.botTokenEncrypted);
    } catch (error) {
      const messageText = cleanDispatcherError(error);
      await markNotificationLogFailed(log.id, input.tenantId, messageText);
      await db.telegramIntegrationSetting.updateMany({
        where: { tenantId: input.tenantId },
        data: {
          lastErrorAt: new Date(),
          lastErrorMessage: messageText,
        },
      });
      return { ok: false, status: "FAILED", logId: log.id, error: messageText };
    }

    const sent = await sendTelegramMessage({
      botToken,
      chatId: setting.chatId,
      text: message,
      parseMode: "HTML",
    });

    if (sent.ok) {
      await markNotificationLogSent(log.id, input.tenantId);
      await db.telegramIntegrationSetting.updateMany({
        where: { tenantId: input.tenantId },
        data: {
          lastSuccessAt: new Date(),
          lastErrorMessage: null,
        },
      });
      return { ok: true, status: "SENT", logId: log.id };
    }

    await markNotificationLogFailed(log.id, input.tenantId, sent.error);
    await db.telegramIntegrationSetting.updateMany({
      where: { tenantId: input.tenantId },
      data: {
        lastErrorAt: new Date(),
        lastErrorMessage: sent.error,
      },
    });

    return { ok: false, status: "FAILED", logId: log.id, error: sent.error };
  } catch (error) {
    return { ok: false, status: "FAILED", error: cleanDispatcherError(error) };
  }
}
