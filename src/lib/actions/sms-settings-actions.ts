"use server";

import { revalidatePath } from "next/cache";
import type { SmsSettingsActionState } from "@/lib/actions/sms-settings-state";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/date/jalali";
import { sendSmsMessage } from "@/lib/integrations/sms";
import { formatSmsProviderLabel } from "@/lib/integrations/sms-providers";
import {
  createNotificationLog,
  ensureDefaultNotificationTemplates,
  markNotificationLogFailed,
  markNotificationLogSent,
} from "@/lib/notifications/notification-service";
import { parseSmsRecipients } from "@/lib/notifications/recipient-utils";
import { renderNotificationTemplate } from "@/lib/notifications/template-renderer";
import { getPrisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/security/secret-field";
import { smsSettingsSchema } from "@/lib/validation/sms-settings";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";

type SmsSettingRow = {
  apiKeyEncrypted: string | null;
  apiKeyMasked: string | null;
  provider: string | null;
  senderNumber: string | null;
  managerMobile: string | null;
  isEnabled: boolean;
};

type SmsTemplateRow = {
  title: string;
  body: string;
  isEnabled: boolean;
} | null;

type SmsActionsClient = {
  smsIntegrationSetting: {
    findUnique(args: unknown): Promise<SmsSettingRow | null>;
    upsert(args: unknown): Promise<unknown>;
    updateMany(args: unknown): Promise<unknown>;
  };
  notificationTemplate: {
    findUnique(args: unknown): Promise<SmsTemplateRow>;
  };
};

function booleanFromForm(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function revalidateSmsSettingsPaths() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/notifications");
  revalidatePath("/dashboard/settings/sms");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/message-templates");
}

function parseSmsSettingsForm(formData: FormData) {
  return smsSettingsSchema.safeParse({
    isEnabled: booleanFromForm(formData, "isEnabled"),
    provider: formData.get("provider"),
    apiKey: formData.get("apiKey"),
    senderNumber: formData.get("senderNumber"),
    managerMobile: formData.get("managerMobile"),
    sendToManager: booleanFromForm(formData, "sendToManager"),
    sendToCustomer: booleanFromForm(formData, "sendToCustomer"),
    sendContractEvents: booleanFromForm(formData, "sendContractEvents"),
    sendPaymentEvents: booleanFromForm(formData, "sendPaymentEvents"),
    sendExpenseEvents: booleanFromForm(formData, "sendExpenseEvents"),
    sendCustomerEvents: booleanFromForm(formData, "sendCustomerEvents"),
    sendDailyReports: booleanFromForm(formData, "sendDailyReports"),
    sendWeeklyReports: booleanFromForm(formData, "sendWeeklyReports"),
    sendMonthlyReports: booleanFromForm(formData, "sendMonthlyReports"),
    sendEventReminders: booleanFromForm(formData, "sendEventReminders"),
    sendOutstandingBalanceReminders: booleanFromForm(formData, "sendOutstandingBalanceReminders"),
  });
}

function cleanSecretError(error: unknown) {
  if (error instanceof Error && /NOTIFICATION_SECRET_KEY|NEXTAUTH_SECRET|AUTH_SECRET/.test(error.message)) {
    return "کلید امنیتی ذخیره اطلاعات محرمانه تنظیم نشده است.";
  }

  return "ذخیره تنظیمات پیامک با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.";
}

function cleanSmsActionError(error: unknown) {
  if (error instanceof Error && /NOTIFICATION_SECRET_KEY|NEXTAUTH_SECRET|AUTH_SECRET/.test(error.message)) {
    return "کلید امنیتی ذخیره اطلاعات محرمانه تنظیم نشده است.";
  }

  return "ارسال پیامک تست با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.";
}

export async function saveSmsSettingsAction(
  _previousState: SmsSettingsActionState,
  formData: FormData,
): Promise<SmsSettingsActionState> {
  const membership = await requireTenantPermission("notifications.manage");
  const parsed = parseSmsSettingsForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "اطلاعات تنظیمات پیامک معتبر نیست.",
    };
  }

  const db = (await getPrisma()) as unknown as SmsActionsClient;
  const existing = await db.smsIntegrationSetting.findUnique({
    where: { tenantId: membership.tenantId },
    select: {
      apiKeyEncrypted: true,
      apiKeyMasked: true,
      provider: true,
      senderNumber: true,
      managerMobile: true,
      isEnabled: true,
    },
  });

  if (parsed.data.isEnabled && !parsed.data.apiKey && !existing?.apiKeyEncrypted) {
    return {
      ok: false,
      message: "برای فعال‌سازی پیامک، کلید API پنل پیامکی الزامی است.",
    };
  }

  let apiKeyEncrypted = existing?.apiKeyEncrypted ?? null;
  let apiKeyMasked = existing?.apiKeyMasked ?? null;

  if (parsed.data.apiKey) {
    try {
      apiKeyEncrypted = encryptSecret(parsed.data.apiKey);
      apiKeyMasked = maskSecret(parsed.data.apiKey, 4, 4);
    } catch (error) {
      return { ok: false, message: cleanSecretError(error) };
    }
  }

  const savedSettings = await db.smsIntegrationSetting.upsert({
    where: { tenantId: membership.tenantId },
    create: {
      tenantId: membership.tenantId,
      isEnabled: parsed.data.isEnabled,
      provider: parsed.data.provider ?? null,
      apiKeyEncrypted,
      apiKeyMasked,
      senderNumber: parsed.data.senderNumber ?? null,
      managerMobile: parsed.data.managerMobile ?? null,
      sendToManager: parsed.data.sendToManager,
      sendToCustomer: parsed.data.sendToCustomer,
      sendContractEvents: parsed.data.sendContractEvents,
      sendPaymentEvents: parsed.data.sendPaymentEvents,
      sendExpenseEvents: parsed.data.sendExpenseEvents,
      sendCustomerEvents: parsed.data.sendCustomerEvents,
      sendDailyReports: parsed.data.sendDailyReports,
      sendWeeklyReports: parsed.data.sendWeeklyReports,
      sendMonthlyReports: parsed.data.sendMonthlyReports,
      sendEventReminders: parsed.data.sendEventReminders,
      sendOutstandingBalanceReminders: parsed.data.sendOutstandingBalanceReminders,
      lastErrorMessage: null,
    },
    update: {
      isEnabled: parsed.data.isEnabled,
      provider: parsed.data.provider ?? null,
      apiKeyEncrypted,
      apiKeyMasked,
      senderNumber: parsed.data.senderNumber ?? null,
      managerMobile: parsed.data.managerMobile ?? null,
      sendToManager: parsed.data.sendToManager,
      sendToCustomer: parsed.data.sendToCustomer,
      sendContractEvents: parsed.data.sendContractEvents,
      sendPaymentEvents: parsed.data.sendPaymentEvents,
      sendExpenseEvents: parsed.data.sendExpenseEvents,
      sendCustomerEvents: parsed.data.sendCustomerEvents,
      sendDailyReports: parsed.data.sendDailyReports,
      sendWeeklyReports: parsed.data.sendWeeklyReports,
      sendMonthlyReports: parsed.data.sendMonthlyReports,
      sendEventReminders: parsed.data.sendEventReminders,
      sendOutstandingBalanceReminders: parsed.data.sendOutstandingBalanceReminders,
      ...(parsed.data.isEnabled ? {} : { lastErrorMessage: null }),
    },
  });

  await createAuditLog({
    tenantId: membership.tenantId,
    userId: membership.userId,
    action: "SETTINGS_UPDATE",
    entityType: "SMS_SETTING",
    title: "به‌روزرسانی تنظیمات پیامک",
    message: `تنظیمات پیامک توسط ${getAuditActorName(membership.user)} به‌روزرسانی شد.`,
    beforeData: existing,
    afterData: savedSettings,
    href: "/dashboard/settings/sms",
  });

  revalidateSmsSettingsPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "تنظیمات پنل پیامکی با موفقیت ذخیره شد.",
  };
}

export async function sendSmsTestMessageAction(
  _previousState: SmsSettingsActionState,
  _formData: FormData,
): Promise<SmsSettingsActionState> {
  const membership = await requireTenantPermission("notifications.manage");
  const db = (await getPrisma()) as unknown as SmsActionsClient;
  const setting = await db.smsIntegrationSetting.findUnique({
    where: { tenantId: membership.tenantId },
    select: {
      isEnabled: true,
      provider: true,
      apiKeyEncrypted: true,
      apiKeyMasked: true,
      senderNumber: true,
      managerMobile: true,
    },
  });

  const recipients = parseSmsRecipients(setting?.managerMobile);
  if (!setting?.isEnabled || !setting.provider || !setting.apiKeyEncrypted || recipients.length === 0) {
    return {
      ok: false,
      message: "ابتدا ارائه‌دهنده، کلید API و حداقل یک شماره مالک/مدیر را ذخیره کنید.",
    };
  }

  await ensureDefaultNotificationTemplates(membership.tenantId);

  const template = await db.notificationTemplate.findUnique({
    where: {
      tenantId_channel_eventType: {
        tenantId: membership.tenantId,
        channel: "SMS",
        eventType: "TEST_MESSAGE",
      },
    },
    select: { title: true, body: true, isEnabled: true },
  });

  const title = template?.title || "پیامک تست";
  const message = renderNotificationTemplate(
    template?.body ||
      [
        "پیام تست مدیریت | {{tenantName}}",
        "اتصال پنل پیامکی با موفقیت بررسی شد.",
        "پیام‌های مدیریتی با متن رسمی، دقیق و قابل پیگیری ارسال می‌شوند.",
        "زمان تست: {{currentDateTime}}",
      ].join("\n"),
    {
      tenantName: membership.tenant.name,
      currentDate: formatJalaliDate(new Date()),
      currentDateTime: formatJalaliDateTime(new Date()),
    },
  );

  let apiKey: string;

  try {
    apiKey = decryptSecret(setting.apiKeyEncrypted);
  } catch (error) {
    const messageText = cleanSmsActionError(error);
    await db.smsIntegrationSetting.updateMany({
      where: { tenantId: membership.tenantId },
      data: {
        lastTestAt: new Date(),
        lastErrorAt: new Date(),
        lastErrorMessage: messageText,
      },
    });
    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "NOTIFICATION_FAILED",
      entityType: "SMS_SETTING",
      title: "خطای ارسال پیامک تست",
      message: `ارسال پیامک تست توسط ${getAuditActorName(membership.user)} ناموفق بود.`,
      metadata: { channel: "SMS", reason: messageText },
      href: "/dashboard/settings/notification-logs",
    });
    revalidateSmsSettingsPaths();
    return { ok: false, message: messageText };
  }

  let sentCount = 0;
  let failedCount = 0;
  let lastError = "";
  let lastLogId: string | undefined;

  for (const recipient of recipients) {
    const log = await createNotificationLog({
      tenantId: membership.tenantId,
      channel: "SMS",
      eventType: "TEST_MESSAGE",
      recipient,
      recipientLabel: recipients.length > 1 ? "شماره مالک/مدیر" : "شماره مدیر",
      title,
      message,
      status: "QUEUED",
    });
    lastLogId = log.id;

    const result = await sendSmsMessage({
      provider: setting.provider,
      apiKey,
      senderNumber: setting.senderNumber,
      receptor: recipient,
      message,
    });

    if (result.ok) {
      sentCount += 1;
      await markNotificationLogSent(log.id, membership.tenantId);
    } else {
      failedCount += 1;
      lastError = result.error;
      await markNotificationLogFailed(log.id, membership.tenantId, result.error);
    }
  }

  if (sentCount > 0) {
    await db.smsIntegrationSetting.updateMany({
      where: { tenantId: membership.tenantId },
      data: {
        lastTestAt: new Date(),
        lastSuccessAt: new Date(),
        lastErrorMessage: failedCount > 0 ? lastError : null,
      },
    });
    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "NOTIFICATION_SENT",
      entityType: "SMS_SETTING",
      entityId: lastLogId,
      title: "ارسال پیامک تست",
      message: `پیامک تست توسط ${getAuditActorName(membership.user)} ارسال شد.`,
      metadata: { channel: "SMS", provider: setting.provider, sentCount, failedCount },
      href: "/dashboard/settings/notification-logs",
    });
    revalidateSmsSettingsPaths();
    return {
      ok: true,
      message: `پیامک تست برای ${sentCount} شماره از طریق ${formatSmsProviderLabel(setting.provider)} ارسال شد.`,
    };
  }

  await db.smsIntegrationSetting.updateMany({
    where: { tenantId: membership.tenantId },
    data: {
      lastTestAt: new Date(),
      lastErrorAt: new Date(),
      lastErrorMessage: lastError,
    },
  });
  await createAuditLog({
    tenantId: membership.tenantId,
    userId: membership.userId,
    action: "NOTIFICATION_FAILED",
    entityType: "SMS_SETTING",
    entityId: lastLogId,
    title: "خطای ارسال پیامک تست",
    message: `ارسال پیامک تست توسط ${getAuditActorName(membership.user)} ناموفق بود.`,
    metadata: { channel: "SMS", provider: setting.provider, reason: lastError },
    href: "/dashboard/settings/notification-logs",
  });
  revalidateSmsSettingsPaths();

  return {
    ok: false,
    message: lastError || "ارسال پیامک تست ناموفق بود.",
  };
}
