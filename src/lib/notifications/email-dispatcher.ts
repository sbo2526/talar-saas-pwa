import "server-only";

import { generateAndSaveContractPdfForEmail } from "@/lib/contracts/contract-pdf-export";
import { sendEmailMessage } from "@/lib/integrations/email";
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
import { parseEmailRecipients } from "@/lib/notifications/recipient-utils";
import {
  getDefaultNotificationTemplate,
  renderNotificationTemplate,
  shouldUpgradeStoredNotificationTemplate,
  stripDemoWordingFromNotificationText,
} from "@/lib/notifications/template-renderer";
import { getPrisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/secret-field";

type EmailDispatchInput = {
  tenantId: string;
  eventType: string;
  variables: Record<string, unknown>;
  relatedContractId?: string | null;
  relatedPaymentId?: string | null;
  relatedExpenseId?: string | null;
  relatedCustomerId?: string | null;
};

type EmailDispatchResult =
  | { ok: true; status: "SENT"; sentCount: number; failedCount: number }
  | {
      ok: false;
      status: "FAILED";
      sentCount: number;
      failedCount: number;
      error: string;
    }
  | { ok: false; status: "SKIPPED"; error?: string };

type EmailSettingRow = {
  isEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUsername: string | null;
  smtpPasswordEncrypted: string | null;
  fromEmail: string | null;
  fromName: string | null;
  managerEmails: string | null;
  sendToManager: boolean;
  sendContractEvents: boolean;
  sendPaymentEvents: boolean;
  sendExpenseEvents: boolean;
  sendCustomerEvents: boolean;
  sendSecurityEvents: boolean;
  sendDailyReports: boolean;
  sendWeeklyReports: boolean;
  sendMonthlyReports: boolean;
  sendEventReminders: boolean;
  sendOutstandingBalanceReminders: boolean;
};

type EmailDispatchClient = {
  emailIntegrationSetting?: {
    findUnique(args: unknown): Promise<EmailSettingRow | null>;
    updateMany(args: unknown): Promise<unknown>;
  } | null;
  notificationTemplate: {
    findUnique(
      args: unknown,
    ): Promise<{ title: string; body: string; isEnabled: boolean } | null>;
  };
};

async function getEmailDispatchClient() {
  return (await getPrisma()) as unknown as EmailDispatchClient;
}

function hasEmailDispatchDelegate(
  db: EmailDispatchClient,
): db is EmailDispatchClient & {
  emailIntegrationSetting: NonNullable<
    EmailDispatchClient["emailIntegrationSetting"]
  >;
} {
  return Boolean(
    db.emailIntegrationSetting &&
    typeof db.emailIntegrationSetting.findUnique === "function" &&
    typeof db.emailIntegrationSetting.updateMany === "function",
  );
}

function getToggleName(
  eventType: NotificationEventType,
): keyof EmailSettingRow | null {
  if (eventType.startsWith("CONTRACT_")) return "sendContractEvents";
  if (eventType.startsWith("PAYMENT_")) return "sendPaymentEvents";
  if (eventType.startsWith("EXPENSE_")) return "sendExpenseEvents";
  if (eventType.startsWith("CUSTOMER_")) return "sendCustomerEvents";
  if (eventType === "SECURITY_EVENT") return "sendSecurityEvents";
  if (eventType === "DAILY_REPORT") return "sendDailyReports";
  if (eventType === "WEEKLY_REPORT") return "sendWeeklyReports";
  if (eventType === "MONTHLY_REPORT") return "sendMonthlyReports";
  if (eventType === "EVENT_REMINDER_TOMORROW") return "sendEventReminders";
  if (eventType === "OUTSTANDING_BALANCE_REMINDER")
    return "sendOutstandingBalanceReminders";
  if (eventType === "POST_EVENT_INVOICE_DELIVERY_MANAGER")
    return "sendContractEvents";
  if (eventType === "TEST_MESSAGE") return null;
  return null;
}

function cleanDispatcherError(error: unknown) {
  if (error instanceof Error) {
    if (
      /NOTIFICATION_SECRET_KEY|NEXTAUTH_SECRET|AUTH_SECRET/.test(error.message)
    )
      return "کلید امنیتی ذخیره اطلاعات محرمانه تنظیم نشده است.";
    return error.message.slice(0, 700) || "ارسال ایمیل مدیریتی ناموفق بود.";
  }
  return "ارسال ایمیل مدیریتی ناموفق بود.";
}

export async function dispatchEmailNotification(
  input: EmailDispatchInput,
): Promise<EmailDispatchResult> {
  try {
    if (!input.tenantId?.trim() || !isNotificationEventType(input.eventType))
      return { ok: false, status: "SKIPPED", error: "نوع اعلان معتبر نیست." };
    const eventType = input.eventType;
    const db = await getEmailDispatchClient();
    if (!hasEmailDispatchDelegate(db))
      return {
        ok: false,
        status: "SKIPPED",
        error: "زیرساخت ایمیل هنوز آماده نیست.",
      };

    const setting = await db.emailIntegrationSetting.findUnique({
      where: { tenantId: input.tenantId },
      select: {
        isEnabled: true,
        smtpHost: true,
        smtpPort: true,
        smtpSecure: true,
        smtpUsername: true,
        smtpPasswordEncrypted: true,
        fromEmail: true,
        fromName: true,
        managerEmails: true,
        sendToManager: true,
        sendContractEvents: true,
        sendPaymentEvents: true,
        sendExpenseEvents: true,
        sendCustomerEvents: true,
        sendSecurityEvents: true,
        sendDailyReports: true,
        sendWeeklyReports: true,
        sendMonthlyReports: true,
        sendEventReminders: true,
        sendOutstandingBalanceReminders: true,
      },
    });
    if (!setting?.isEnabled || !setting.sendToManager)
      return { ok: false, status: "SKIPPED" };
    const toggleName = getToggleName(eventType);
    if (toggleName && !setting[toggleName])
      return { ok: false, status: "SKIPPED" };

    const fallback = getDefaultNotificationTemplate("EMAIL", eventType) ?? {
      title: getNotificationEventLabel(eventType),
      body: "اعلان {{eventType}} برای {{tenantName}} ثبت شد.",
    };
    const template = await db.notificationTemplate.findUnique({
      where: {
        tenantId_channel_eventType: {
          tenantId: input.tenantId,
          channel: "EMAIL",
          eventType,
        },
      },
      select: { title: true, body: true, isEnabled: true },
    });
    if (template && !template.isEnabled)
      return { ok: false, status: "SKIPPED" };
    const usableTemplate =
      template &&
      !shouldUpgradeStoredNotificationTemplate({
        channel: "EMAIL",
        eventType,
        title: template.title,
        body: template.body,
      })
        ? template
        : null;
    const variables = {
      eventType: getNotificationEventLabel(eventType),
      ...input.variables,
    };
    const title =
      renderNotificationTemplate(
        usableTemplate?.title ?? fallback.title,
        variables,
      ).trim() || fallback.title;
    const message =
      renderNotificationTemplate(
        usableTemplate?.body ?? fallback.body,
        variables,
      ).trim() || title;
    const recipients = parseEmailRecipients(setting.managerEmails);

    if (
      !setting.smtpHost ||
      !setting.smtpPort ||
      !setting.fromEmail ||
      recipients.length === 0
    ) {
      await createSkippedNotificationLog({
        tenantId: input.tenantId,
        channel: "EMAIL",
        eventType,
        recipient: setting.managerEmails,
        recipientLabel: "ایمیل‌های مالک/مدیر",
        title,
        message: "تنظیمات ایمیل برای ارسال این اعلان کامل نیست.",
        relatedContractId: input.relatedContractId ?? null,
        relatedPaymentId: input.relatedPaymentId ?? null,
        relatedExpenseId: input.relatedExpenseId ?? null,
        relatedCustomerId: input.relatedCustomerId ?? null,
      });
      return {
        ok: false,
        status: "SKIPPED",
        error: "تنظیمات ایمیل کامل نیست.",
      };
    }

    let smtpPassword: string | null = null;
    if (setting.smtpPasswordEncrypted) {
      try {
        smtpPassword = decryptSecret(setting.smtpPasswordEncrypted);
      } catch (error) {
        const messageText = cleanDispatcherError(error);
        await db.emailIntegrationSetting.updateMany({
          where: { tenantId: input.tenantId },
          data: { lastErrorAt: new Date(), lastErrorMessage: messageText },
        });
        return {
          ok: false,
          status: "FAILED",
          sentCount: 0,
          failedCount: recipients.length,
          error: messageText,
        };
      }
    }

    let attachment:
      | {
          filename: string;
          contentType: string;
          content: Buffer;
        }
      | null = null;
    let attachmentNote = "";

    if (eventType === "CONTRACT_CREATED" && input.relatedContractId) {
      try {
        const contractPdf = await generateAndSaveContractPdfForEmail({
          tenantId: input.tenantId,
          contractId: input.relatedContractId,
        });

        if (contractPdf) {
          attachment = {
            filename: contractPdf.fileName,
            contentType: contractPdf.contentType,
            content: contractPdf.content,
          };
          attachmentNote = `

فایل PDF قرارداد ساخته و در این مسیر ذخیره شد:
${contractPdf.filePath}`;
        }
      } catch (error) {
        attachmentNote = `

توجه: فایل PDF قرارداد ساخته/ذخیره نشد. ${cleanDispatcherError(error)}`;
      }
    }

    const emailMessage = stripDemoWordingFromNotificationText(`${message}${attachmentNote}`);
    const emailTitle = stripDemoWordingFromNotificationText(title);

    let sentCount = 0;
    let failedCount = 0;
    let lastError: string | null = null;
    for (const recipient of recipients) {
      const log = await createNotificationLog({
        tenantId: input.tenantId,
        channel: "EMAIL",
        eventType,
        recipient,
        recipientLabel:
          recipients.length > 1 ? "ایمیل مالک/مدیر" : "ایمیل مدیر",
        title: emailTitle,
        message: emailMessage,
        status: "QUEUED",
        relatedContractId: input.relatedContractId ?? null,
        relatedPaymentId: input.relatedPaymentId ?? null,
        relatedExpenseId: input.relatedExpenseId ?? null,
        relatedCustomerId: input.relatedCustomerId ?? null,
      });
      const sent = await sendEmailMessage({
        smtpHost: setting.smtpHost,
        smtpPort: setting.smtpPort,
        smtpSecure: setting.smtpSecure,
        smtpUsername: setting.smtpUsername,
        smtpPassword,
        fromEmail: setting.fromEmail,
        fromName: setting.fromName,
        to: recipient,
        subject: emailTitle,
        text: emailMessage,
        attachments: attachment ? [attachment] : null,
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
      await db.emailIntegrationSetting.updateMany({
        where: { tenantId: input.tenantId },
        data: {
          lastSuccessAt: new Date(),
          lastErrorMessage: failedCount ? lastError : null,
        },
      });
      return { ok: true, status: "SENT", sentCount, failedCount };
    }
    const errorMessage = lastError ?? "ارسال ایمیل ناموفق بود.";
    await db.emailIntegrationSetting.updateMany({
      where: { tenantId: input.tenantId },
      data: { lastErrorAt: new Date(), lastErrorMessage: errorMessage },
    });
    return {
      ok: false,
      status: "FAILED",
      sentCount,
      failedCount,
      error: errorMessage,
    };
  } catch (error) {
    return {
      ok: false,
      status: "FAILED",
      sentCount: 0,
      failedCount: 1,
      error: cleanDispatcherError(error),
    };
  }
}
