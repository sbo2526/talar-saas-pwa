"use server";

import { revalidatePath } from "next/cache";
import type { EmailSettingsActionState } from "@/lib/actions/email-settings-state";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";
import { formatJalaliDateTime } from "@/lib/date/jalali";
import { sendEmailMessage } from "@/lib/integrations/email";
import {
  createNotificationLog,
  ensureDefaultNotificationTemplates,
  markNotificationLogFailed,
  markNotificationLogSent,
} from "@/lib/notifications/notification-service";
import { parseEmailRecipients } from "@/lib/notifications/recipient-utils";
import { renderNotificationTemplate } from "@/lib/notifications/template-renderer";
import { getPrisma } from "@/lib/prisma";
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from "@/lib/security/secret-field";
import { emailSettingsSchema } from "@/lib/validation/email-settings";

type EmailSettingRow = {
  isEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUsername: string | null;
  smtpPasswordEncrypted: string | null;
  smtpPasswordMasked: string | null;
  fromEmail: string | null;
  fromName: string | null;
  managerEmails: string | null;
};

type EmailActionsClient = {
  emailIntegrationSetting?: {
    findUnique(args: unknown): Promise<EmailSettingRow | null>;
    upsert(args: unknown): Promise<unknown>;
    updateMany(args: unknown): Promise<unknown>;
  } | null;
};

function hasEmailSettingsDelegate(
  db: EmailActionsClient,
): db is EmailActionsClient & {
  emailIntegrationSetting: NonNullable<
    EmailActionsClient["emailIntegrationSetting"]
  >;
} {
  return Boolean(
    db.emailIntegrationSetting &&
    typeof db.emailIntegrationSetting.findUnique === "function" &&
    typeof db.emailIntegrationSetting.upsert === "function" &&
    typeof db.emailIntegrationSetting.updateMany === "function",
  );
}

function emailStorageNotReadyMessage() {
  return "بخش ایمیل هنوز در Prisma Client یا دیتابیس آماده نیست. ابتدا npm run prisma:migrate و npm run prisma:generate را اجرا کنید و سرور dev را ری‌استارت کنید.";
}

function isMissingEmailTableError(error: unknown) {
  const maybeError = error as {
    code?: string;
    message?: string;
    meta?: { modelName?: string; table?: string };
  };
  const message =
    typeof maybeError.message === "string" ? maybeError.message : "";
  const modelName =
    typeof maybeError.meta?.modelName === "string"
      ? maybeError.meta.modelName
      : "";
  const table =
    typeof maybeError.meta?.table === "string" ? maybeError.meta.table : "";

  return (
    maybeError.code === "P2021" &&
    (modelName === "EmailIntegrationSetting" ||
      table.includes("EmailIntegrationSetting") ||
      message.includes("EmailIntegrationSetting"))
  );
}

function booleanFromForm(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function parseEmailSettingsForm(formData: FormData) {
  return emailSettingsSchema.safeParse({
    isEnabled: booleanFromForm(formData, "isEnabled"),
    smtpHost: formData.get("smtpHost"),
    smtpPort: formData.get("smtpPort"),
    smtpSecure: booleanFromForm(formData, "smtpSecure"),
    smtpUsername: formData.get("smtpUsername"),
    smtpPassword: formData.get("smtpPassword"),
    fromEmail: formData.get("fromEmail"),
    fromName: formData.get("fromName"),
    managerEmails: formData.get("managerEmails"),
    sendToManager: booleanFromForm(formData, "sendToManager"),
    sendContractEvents: booleanFromForm(formData, "sendContractEvents"),
    sendPaymentEvents: booleanFromForm(formData, "sendPaymentEvents"),
    sendExpenseEvents: booleanFromForm(formData, "sendExpenseEvents"),
    sendCustomerEvents: booleanFromForm(formData, "sendCustomerEvents"),
    sendSecurityEvents: booleanFromForm(formData, "sendSecurityEvents"),
    sendDailyReports: booleanFromForm(formData, "sendDailyReports"),
    sendWeeklyReports: booleanFromForm(formData, "sendWeeklyReports"),
    sendMonthlyReports: booleanFromForm(formData, "sendMonthlyReports"),
    sendEventReminders: booleanFromForm(formData, "sendEventReminders"),
    sendOutstandingBalanceReminders: booleanFromForm(
      formData,
      "sendOutstandingBalanceReminders",
    ),
    dailyReportTime: formData.get("dailyReportTime"),
    weeklyReportDay: formData.get("weeklyReportDay"),
    monthlyReportDay: formData.get("monthlyReportDay"),
  });
}

function revalidateEmailSettingsPaths() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/notifications");
  revalidatePath("/dashboard/settings/email");
  revalidatePath("/dashboard/settings/message-templates");
  revalidatePath("/dashboard/messages");
}

function cleanSecretError(error: unknown) {
  if (
    error instanceof Error &&
    /NOTIFICATION_SECRET_KEY|NEXTAUTH_SECRET|AUTH_SECRET/.test(error.message)
  ) {
    return "کلید امنیتی ذخیره اطلاعات محرمانه تنظیم نشده است.";
  }
  return "ذخیره تنظیمات ایمیل با خطا مواجه شد.";
}

export async function saveEmailSettingsAction(
  _previousState: EmailSettingsActionState,
  formData: FormData,
): Promise<EmailSettingsActionState> {
  void _previousState;
  const membership = await requireTenantPermission("notifications.manage");
  const parsed = parseEmailSettingsForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "اطلاعات تنظیمات ایمیل معتبر نیست.",
    };
  }

  const db = (await getPrisma()) as unknown as EmailActionsClient;
  if (!hasEmailSettingsDelegate(db)) {
    return { ok: false, message: emailStorageNotReadyMessage() };
  }

  try {
    const existing = await db.emailIntegrationSetting.findUnique({
      where: { tenantId: membership.tenantId },
      select: {
        isEnabled: true,
        smtpHost: true,
        smtpPort: true,
        smtpSecure: true,
        smtpUsername: true,
        smtpPasswordEncrypted: true,
        smtpPasswordMasked: true,
        fromEmail: true,
        fromName: true,
        managerEmails: true,
      },
    });

    let smtpPasswordEncrypted = existing?.smtpPasswordEncrypted ?? null;
    let smtpPasswordMasked = existing?.smtpPasswordMasked ?? null;
    if (parsed.data.smtpPassword) {
      try {
        smtpPasswordEncrypted = encryptSecret(parsed.data.smtpPassword);
        smtpPasswordMasked = maskSecret(parsed.data.smtpPassword, 2, 2);
      } catch (error) {
        return { ok: false, message: cleanSecretError(error) };
      }
    }

    const saved = await db.emailIntegrationSetting.upsert({
      where: { tenantId: membership.tenantId },
      create: {
        tenantId: membership.tenantId,
        isEnabled: parsed.data.isEnabled,
        smtpHost: parsed.data.smtpHost ?? null,
        smtpPort: parsed.data.smtpPort ?? null,
        smtpSecure: parsed.data.smtpSecure,
        smtpUsername: parsed.data.smtpUsername ?? null,
        smtpPasswordEncrypted,
        smtpPasswordMasked,
        fromEmail: parsed.data.fromEmail ?? null,
        fromName: parsed.data.fromName ?? membership.tenant.name,
        managerEmails: parsed.data.managerEmails ?? null,
        sendToManager: parsed.data.sendToManager,
        sendContractEvents: parsed.data.sendContractEvents,
        sendPaymentEvents: parsed.data.sendPaymentEvents,
        sendExpenseEvents: parsed.data.sendExpenseEvents,
        sendCustomerEvents: parsed.data.sendCustomerEvents,
        sendSecurityEvents: parsed.data.sendSecurityEvents,
        sendDailyReports: parsed.data.sendDailyReports,
        sendWeeklyReports: parsed.data.sendWeeklyReports,
        sendMonthlyReports: parsed.data.sendMonthlyReports,
        sendEventReminders: parsed.data.sendEventReminders,
        sendOutstandingBalanceReminders:
          parsed.data.sendOutstandingBalanceReminders,
        dailyReportTime: parsed.data.dailyReportTime ?? "09:00",
        weeklyReportDay: parsed.data.weeklyReportDay ?? null,
        monthlyReportDay: parsed.data.monthlyReportDay ?? null,
        lastErrorMessage: null,
      },
      update: {
        isEnabled: parsed.data.isEnabled,
        smtpHost: parsed.data.smtpHost ?? null,
        smtpPort: parsed.data.smtpPort ?? null,
        smtpSecure: parsed.data.smtpSecure,
        smtpUsername: parsed.data.smtpUsername ?? null,
        smtpPasswordEncrypted,
        smtpPasswordMasked,
        fromEmail: parsed.data.fromEmail ?? null,
        fromName: parsed.data.fromName ?? membership.tenant.name,
        managerEmails: parsed.data.managerEmails ?? null,
        sendToManager: parsed.data.sendToManager,
        sendContractEvents: parsed.data.sendContractEvents,
        sendPaymentEvents: parsed.data.sendPaymentEvents,
        sendExpenseEvents: parsed.data.sendExpenseEvents,
        sendCustomerEvents: parsed.data.sendCustomerEvents,
        sendSecurityEvents: parsed.data.sendSecurityEvents,
        sendDailyReports: parsed.data.sendDailyReports,
        sendWeeklyReports: parsed.data.sendWeeklyReports,
        sendMonthlyReports: parsed.data.sendMonthlyReports,
        sendEventReminders: parsed.data.sendEventReminders,
        sendOutstandingBalanceReminders:
          parsed.data.sendOutstandingBalanceReminders,
        dailyReportTime: parsed.data.dailyReportTime ?? "09:00",
        weeklyReportDay: parsed.data.weeklyReportDay ?? null,
        monthlyReportDay: parsed.data.monthlyReportDay ?? null,
        ...(parsed.data.isEnabled ? {} : { lastErrorMessage: null }),
      },
    });

    await ensureDefaultNotificationTemplates(membership.tenantId);
    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "SETTINGS_UPDATE",
      entityType: "EMAIL_SETTING",
      title: "به‌روزرسانی تنظیمات ایمیل",
      message: `تنظیمات ایمیل مدیریتی توسط ${getAuditActorName(membership.user)} به‌روزرسانی شد.`,
      beforeData: existing,
      afterData: saved,
      href: "/dashboard/settings/email",
    });
    revalidateEmailSettingsPaths();
    revalidatePath("/dashboard/settings/activity");
    return { ok: true, message: "تنظیمات ایمیل مدیریتی با موفقیت ذخیره شد." };
  } catch (error) {
    if (isMissingEmailTableError(error)) {
      return { ok: false, message: emailStorageNotReadyMessage() };
    }

    throw error;
  }
}

export async function sendEmailTestMessageAction(
  _previousState: EmailSettingsActionState,
  _formData: FormData,
): Promise<EmailSettingsActionState> {
  void _previousState;
  void _formData;
  const membership = await requireTenantPermission("notifications.manage");
  const db = (await getPrisma()) as unknown as EmailActionsClient;
  if (!hasEmailSettingsDelegate(db)) {
    return { ok: false, message: emailStorageNotReadyMessage() };
  }

  try {
    const setting = await db.emailIntegrationSetting.findUnique({
      where: { tenantId: membership.tenantId },
      select: {
        isEnabled: true,
        smtpHost: true,
        smtpPort: true,
        smtpSecure: true,
        smtpUsername: true,
        smtpPasswordEncrypted: true,
        smtpPasswordMasked: true,
        fromEmail: true,
        fromName: true,
        managerEmails: true,
      },
    });
    const recipients = parseEmailRecipients(setting?.managerEmails);
    if (
      !setting?.isEnabled ||
      !setting.smtpHost ||
      !setting.smtpPort ||
      !setting.fromEmail ||
      recipients.length === 0
    ) {
      return {
        ok: false,
        message:
          "ابتدا تنظیمات ایمیل، فرستنده و ایمیل‌های مالک/مدیر را کامل ذخیره کنید.",
      };
    }

    let smtpPassword: string | null = null;
    if (setting.smtpPasswordEncrypted) {
      try {
        smtpPassword = decryptSecret(setting.smtpPasswordEncrypted);
      } catch (error) {
        return { ok: false, message: cleanSecretError(error) };
      }
    }

    const title = "ایمیل تست مدیریت";
    const message = renderNotificationTemplate(
      [
        "ایمیل تست مدیریت | {{tenantName}}",
        "اتصال ایمیل مدیریتی با موفقیت بررسی می‌شود.",
        "از این پس پیام‌های مدیریتی قرارداد، دریافت، هزینه، مشتری، امنیت و گزارش‌ها می‌توانند به ایمیل مالک/مدیر ارسال شوند.",
        "زمان تست: {{currentDateTime}}",
      ].join("\n"),
      {
        tenantName: membership.tenant.name,
        currentDateTime: formatJalaliDateTime(new Date()),
      },
    );

    let sentCount = 0;
    let failedCount = 0;
    let lastError = "";
    for (const recipient of recipients) {
      const log = await createNotificationLog({
        tenantId: membership.tenantId,
        channel: "EMAIL",
        eventType: "TEST_MESSAGE",
        recipient,
        recipientLabel: "ایمیل مالک/مدیر",
        title,
        message,
        status: "QUEUED",
      });
      const result = await sendEmailMessage({
        smtpHost: setting.smtpHost,
        smtpPort: setting.smtpPort,
        smtpSecure: setting.smtpSecure,
        smtpUsername: setting.smtpUsername,
        smtpPassword,
        fromEmail: setting.fromEmail,
        fromName: setting.fromName ?? membership.tenant.name,
        to: recipient,
        subject: title,
        text: message,
      });
      if (result.ok) {
        sentCount += 1;
        await markNotificationLogSent(log.id, membership.tenantId);
      } else {
        failedCount += 1;
        lastError = result.error;
        await markNotificationLogFailed(
          log.id,
          membership.tenantId,
          result.error,
        );
      }
    }

    if (sentCount > 0) {
      await db.emailIntegrationSetting.updateMany({
        where: { tenantId: membership.tenantId },
        data: {
          lastTestAt: new Date(),
          lastSuccessAt: new Date(),
          lastErrorMessage: failedCount ? lastError : null,
        },
      });
      revalidateEmailSettingsPaths();
      return {
        ok: true,
        message: `ایمیل تست برای ${sentCount} گیرنده ارسال شد.`,
      };
    }

    await db.emailIntegrationSetting.updateMany({
      where: { tenantId: membership.tenantId },
      data: {
        lastTestAt: new Date(),
        lastErrorAt: new Date(),
        lastErrorMessage: lastError,
      },
    });
    revalidateEmailSettingsPaths();
    return { ok: false, message: lastError || "ارسال ایمیل تست ناموفق بود." };
  } catch (error) {
    if (isMissingEmailTableError(error)) {
      return { ok: false, message: emailStorageNotReadyMessage() };
    }

    throw error;
  }
}
