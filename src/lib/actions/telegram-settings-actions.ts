"use server";

import { revalidatePath } from "next/cache";
import type { TelegramSettingsActionState } from "@/lib/actions/telegram-settings-state";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { formatJalaliDateTime } from "@/lib/date/jalali";
import {
  getTelegramChat,
  getTelegramRecentChats,
  normalizeTelegramChatLookup,
  sendTelegramMessage,
} from "@/lib/integrations/telegram";
import { createNotificationLog, ensureDefaultNotificationTemplates, markNotificationLogFailed, markNotificationLogSent } from "@/lib/notifications/notification-service";
import { renderNotificationTemplate } from "@/lib/notifications/template-renderer";
import { getPrisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/security/secret-field";
import { telegramSettingsSchema } from "@/lib/validation/telegram-settings";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";

type TelegramSettingRow = {
  botTokenEncrypted: string | null;
  botTokenMasked: string | null;
  chatId: string | null;
  chatTitle: string | null;
  isEnabled: boolean;
};

type TelegramTemplateRow = {
  title: string;
  body: string;
  isEnabled: boolean;
} | null;

type TelegramActionsClient = {
  telegramIntegrationSetting: {
    findUnique(args: unknown): Promise<TelegramSettingRow | null>;
    upsert(args: unknown): Promise<unknown>;
    updateMany(args: unknown): Promise<unknown>;
  };
  notificationTemplate: {
    findUnique(args: unknown): Promise<TelegramTemplateRow>;
  };
};

function booleanFromForm(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function revalidateTelegramSettingsPaths() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/notifications");
  revalidatePath("/dashboard/settings/telegram");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/message-templates");
}

function parseTelegramSettingsForm(formData: FormData) {
  return telegramSettingsSchema.safeParse({
    isEnabled: booleanFromForm(formData, "isEnabled"),
    botToken: formData.get("botToken"),
    chatId: formData.get("chatId"),
    chatTitle: formData.get("chatTitle"),
    sendContractEvents: booleanFromForm(formData, "sendContractEvents"),
    sendPaymentEvents: booleanFromForm(formData, "sendPaymentEvents"),
    sendExpenseEvents: booleanFromForm(formData, "sendExpenseEvents"),
    sendCustomerEvents: booleanFromForm(formData, "sendCustomerEvents"),
    sendSecurityEvents: booleanFromForm(formData, "sendSecurityEvents"),
    sendDailyReports: booleanFromForm(formData, "sendDailyReports"),
    sendWeeklyReports: booleanFromForm(formData, "sendWeeklyReports"),
    sendMonthlyReports: booleanFromForm(formData, "sendMonthlyReports"),
    sendEventReminders: booleanFromForm(formData, "sendEventReminders"),
    sendOutstandingBalanceReminders: booleanFromForm(formData, "sendOutstandingBalanceReminders"),
    dailyReportTime: formData.get("dailyReportTime"),
    weeklyReportDay: formData.get("weeklyReportDay"),
    monthlyReportDay: formData.get("monthlyReportDay"),
  });
}

function cleanSecretError(error: unknown) {
  if (error instanceof Error && /NOTIFICATION_SECRET_KEY|NEXTAUTH_SECRET|AUTH_SECRET/.test(error.message)) {
    return "کلید امنیتی ذخیره اطلاعات محرمانه تنظیم نشده است.";
  }

  return "ذخیره تنظیمات تلگرام با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.";
}

function cleanTelegramActionError(error: unknown) {
  if (error instanceof Error && /NOTIFICATION_SECRET_KEY|NEXTAUTH_SECRET|AUTH_SECRET/.test(error.message)) {
    return "کلید امنیتی ذخیره اطلاعات محرمانه تنظیم نشده است.";
  }

  return "ارسال پیام تست تلگرام با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.";
}

async function getSavedTelegramToken(tenantId: string) {
  const db = (await getPrisma()) as unknown as TelegramActionsClient;
  const setting = await db.telegramIntegrationSetting.findUnique({
    where: { tenantId },
    select: {
      isEnabled: true,
      botTokenEncrypted: true,
      botTokenMasked: true,
      chatId: true,
      chatTitle: true,
    },
  });

  if (!setting?.botTokenEncrypted) {
    return {
      ok: false as const,
      message: "لطفاً ابتدا توکن بات را ذخیره کنید.",
      db,
      setting,
    };
  }

  try {
    return {
      ok: true as const,
      botToken: decryptSecret(setting.botTokenEncrypted),
      db,
      setting,
    };
  } catch (error) {
    return {
      ok: false as const,
      message: cleanTelegramActionError(error),
      db,
      setting,
    };
  }
}


function isTelegramNetworkError(message: string) {
  return /api\.telegram\.org|VPN|Proxy|پراکسی|شبکه|زمان مناسب|دسترسی ندارد|Telegram Bot API/i.test(message);
}

function getManualTelegramTitle(chatId: string, submittedTitle?: string) {
  const title = submittedTitle?.trim();

  if (title) {
    return title;
  }

  if (chatId.startsWith("@")) {
    return chatId;
  }

  return "گفتگوی تلگرام، ثبت دستی";
}

function escapeTelegramHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function saveTelegramSettingsAction(
  _previousState: TelegramSettingsActionState,
  formData: FormData,
): Promise<TelegramSettingsActionState> {
  const membership = await requireTenantPermission("notifications.manage");
  const parsed = parseTelegramSettingsForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "اطلاعات تنظیمات تلگرام معتبر نیست.",
    };
  }

  const db = (await getPrisma()) as unknown as TelegramActionsClient;
  const existing = await db.telegramIntegrationSetting.findUnique({
    where: { tenantId: membership.tenantId },
    select: {
      botTokenEncrypted: true,
      botTokenMasked: true,
      chatId: true,
      chatTitle: true,
      isEnabled: true,
    },
  });

  if (parsed.data.isEnabled && !parsed.data.botToken && !existing?.botTokenEncrypted) {
    return {
      ok: false,
      message: "برای فعال‌سازی تلگرام، توکن بات الزامی است.",
    };
  }

  let botTokenEncrypted = existing?.botTokenEncrypted ?? null;
  let botTokenMasked = existing?.botTokenMasked ?? null;

  if (parsed.data.botToken) {
    try {
      botTokenEncrypted = encryptSecret(parsed.data.botToken);
      botTokenMasked = maskSecret(parsed.data.botToken, 10, 4);
    } catch (error) {
      return { ok: false, message: cleanSecretError(error) };
    }
  }

  const savedSettings = await db.telegramIntegrationSetting.upsert({
    where: { tenantId: membership.tenantId },
    create: {
      tenantId: membership.tenantId,
      isEnabled: parsed.data.isEnabled,
      botTokenEncrypted,
      botTokenMasked,
      chatId: parsed.data.chatId ?? null,
      chatTitle: parsed.data.chatTitle ?? null,
      sendContractEvents: parsed.data.sendContractEvents,
      sendPaymentEvents: parsed.data.sendPaymentEvents,
      sendExpenseEvents: parsed.data.sendExpenseEvents,
      sendCustomerEvents: parsed.data.sendCustomerEvents,
      sendSecurityEvents: parsed.data.sendSecurityEvents,
      sendDailyReports: parsed.data.sendDailyReports,
      sendWeeklyReports: parsed.data.sendWeeklyReports,
      sendMonthlyReports: parsed.data.sendMonthlyReports,
      sendEventReminders: parsed.data.sendEventReminders,
      sendOutstandingBalanceReminders: parsed.data.sendOutstandingBalanceReminders,
      dailyReportTime: parsed.data.dailyReportTime ?? null,
      weeklyReportDay: parsed.data.weeklyReportDay ?? null,
      monthlyReportDay: parsed.data.monthlyReportDay ?? null,
      lastErrorMessage: null,
    },
    update: {
      isEnabled: parsed.data.isEnabled,
      botTokenEncrypted,
      botTokenMasked,
      chatId: parsed.data.chatId ?? null,
      chatTitle: parsed.data.chatTitle ?? null,
      sendContractEvents: parsed.data.sendContractEvents,
      sendPaymentEvents: parsed.data.sendPaymentEvents,
      sendExpenseEvents: parsed.data.sendExpenseEvents,
      sendCustomerEvents: parsed.data.sendCustomerEvents,
      sendSecurityEvents: parsed.data.sendSecurityEvents,
      sendDailyReports: parsed.data.sendDailyReports,
      sendWeeklyReports: parsed.data.sendWeeklyReports,
      sendMonthlyReports: parsed.data.sendMonthlyReports,
      sendEventReminders: parsed.data.sendEventReminders,
      sendOutstandingBalanceReminders: parsed.data.sendOutstandingBalanceReminders,
      dailyReportTime: parsed.data.dailyReportTime ?? null,
      weeklyReportDay: parsed.data.weeklyReportDay ?? null,
      monthlyReportDay: parsed.data.monthlyReportDay ?? null,
      ...(parsed.data.isEnabled ? {} : { lastErrorMessage: null }),
    },
  });

  await createAuditLog({
    tenantId: membership.tenantId,
    userId: membership.userId,
    action: "SETTINGS_UPDATE",
    entityType: "TELEGRAM_SETTING",
    title: "به‌روزرسانی تنظیمات تلگرام",
    message: `تنظیمات تلگرام توسط ${getAuditActorName(membership.user)} به‌روزرسانی شد.`,
    beforeData: existing,
    afterData: savedSettings,
    href: "/dashboard/settings/telegram",
  });

  revalidateTelegramSettingsPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "تنظیمات تلگرام با موفقیت ذخیره شد.",
  };
}

export async function sendTelegramTestMessageAction(
  _previousState: TelegramSettingsActionState,
  _formData: FormData,
): Promise<TelegramSettingsActionState> {
  void _previousState;
  void _formData;

  const membership = await requireTenantPermission("notifications.manage");
  const db = (await getPrisma()) as unknown as TelegramActionsClient;
  const setting = await db.telegramIntegrationSetting.findUnique({
    where: { tenantId: membership.tenantId },
    select: {
      isEnabled: true,
      botTokenEncrypted: true,
      botTokenMasked: true,
      chatId: true,
      chatTitle: true,
    },
  });

  if (!setting?.isEnabled || !setting.botTokenEncrypted || !setting.chatId) {
    return {
      ok: false,
      message: "ابتدا توکن، شناسه گفت‌وگو و وضعیت فعال را ذخیره کنید.",
    };
  }

  await ensureDefaultNotificationTemplates(membership.tenantId);

  const template = await db.notificationTemplate.findUnique({
    where: {
      tenantId_channel_eventType: {
        tenantId: membership.tenantId,
        channel: "TELEGRAM",
        eventType: "TEST_MESSAGE",
      },
    },
    select: { title: true, body: true, isEnabled: true },
  });

  const title = template?.title || "پیام تست تلگرام";
  const message = renderNotificationTemplate(
    template?.body ||
      [
        "پیام تست تلگرام | {{tenantName}}",
        "",
        "اتصال تلگرام با موفقیت بررسی شد.",
        "پیام‌های مدیریتی با متن رسمی، دقیق و قابل پیگیری ارسال می‌شوند.",
        "",
        "زمان تست: {{currentDateTime}}",
      ].join("\n"),
    {
      tenantName: escapeTelegramHtml(membership.tenant.name),
      currentDateTime: escapeTelegramHtml(formatJalaliDateTime(new Date())),
    },
  );

  const log = await createNotificationLog({
    tenantId: membership.tenantId,
    channel: "TELEGRAM",
    eventType: "TEST_MESSAGE",
    recipient: setting.chatId,
    recipientLabel: setting.chatTitle,
    title,
    message,
    status: "QUEUED",
  });

  let botToken: string;

  try {
    botToken = decryptSecret(setting.botTokenEncrypted);
  } catch (error) {
    const messageText = cleanTelegramActionError(error);
    await markNotificationLogFailed(log.id, membership.tenantId, messageText);
    await db.telegramIntegrationSetting.updateMany({
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
      entityType: "TELEGRAM_SETTING",
      entityId: log.id,
      title: "خطای ارسال پیام تست تلگرام",
      message: `ارسال پیام تست تلگرام توسط ${getAuditActorName(membership.user)} ناموفق بود.`,
      metadata: { channel: "TELEGRAM", reason: messageText },
      href: "/dashboard/settings/notification-logs",
    });
    revalidateTelegramSettingsPaths();
    return { ok: false, message: messageText };
  }

  const result = await sendTelegramMessage({
    botToken,
    chatId: setting.chatId,
    text: message,
    parseMode: "HTML",
  });

  if (result.ok) {
    await markNotificationLogSent(log.id, membership.tenantId);
    await db.telegramIntegrationSetting.updateMany({
      where: { tenantId: membership.tenantId },
      data: {
        lastTestAt: new Date(),
        lastSuccessAt: new Date(),
        lastErrorMessage: null,
      },
    });
    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "NOTIFICATION_SENT",
      entityType: "TELEGRAM_SETTING",
      entityId: log.id,
      title: "ارسال پیام تست تلگرام",
      message: `پیام تست تلگرام توسط ${getAuditActorName(membership.user)} ارسال شد.`,
      metadata: { channel: "TELEGRAM", chatId: setting.chatId },
      href: "/dashboard/settings/notification-logs",
    });
    revalidateTelegramSettingsPaths();
    return { ok: true, message: "پیام تست تلگرام با موفقیت ارسال شد." };
  }

  await markNotificationLogFailed(log.id, membership.tenantId, result.error);
  await db.telegramIntegrationSetting.updateMany({
    where: { tenantId: membership.tenantId },
    data: {
      lastTestAt: new Date(),
      lastErrorAt: new Date(),
      lastErrorMessage: result.error,
    },
  });
  await createAuditLog({
    tenantId: membership.tenantId,
    userId: membership.userId,
    action: "NOTIFICATION_FAILED",
    entityType: "TELEGRAM_SETTING",
    entityId: log.id,
    title: "خطای ارسال پیام تست تلگرام",
    message: `ارسال پیام تست تلگرام توسط ${getAuditActorName(membership.user)} ناموفق بود.`,
    metadata: { channel: "TELEGRAM", chatId: setting.chatId, reason: result.error },
    href: "/dashboard/settings/notification-logs",
  });
  revalidateTelegramSettingsPaths();

  return {
    ok: false,
    message: result.error || "ارسال پیام تست تلگرام ناموفق بود.",
  };
}

export async function discoverTelegramChatAction(
  _previousState: TelegramSettingsActionState,
  formData: FormData,
): Promise<TelegramSettingsActionState> {
  const membership = await requireTenantPermission("notifications.manage");
  const lookup = String(formData.get("chatLookup") ?? "");
  const tokenResult = await getSavedTelegramToken(membership.tenantId);

  if (!tokenResult.ok) {
    return { ok: false, message: tokenResult.message };
  }

  const normalizedLookup = normalizeTelegramChatLookup(lookup);
  const result = await getTelegramChat({
    botToken: tokenResult.botToken,
    chatIdOrUsername: lookup,
  });

  if (!result.ok) {
    await tokenResult.db.telegramIntegrationSetting.updateMany({
      where: { tenantId: membership.tenantId },
      data: {
        lastErrorAt: new Date(),
        lastErrorMessage: result.error,
      },
    });
    revalidateTelegramSettingsPaths();

    if (normalizedLookup && isTelegramNetworkError(result.error)) {
      return {
        ok: true,
        message: `${result.error} شناسه گفتگو به‌صورت دستی آماده شد؛ برای ادامه، دکمه «ذخیره گفتگو» را بزنید. ارسال واقعی همچنان به دسترسی سرور برنامه به Telegram Bot API نیاز دارد.`,
        chatId: normalizedLookup,
        chatTitle: getManualTelegramTitle(normalizedLookup),
      };
    }

    return { ok: false, message: result.error };
  }

  await tokenResult.db.telegramIntegrationSetting.updateMany({
    where: { tenantId: membership.tenantId },
    data: {
      chatId: result.chatId,
      chatTitle: result.title,
      lastErrorMessage: null,
    },
  });

  revalidateTelegramSettingsPaths();

  return {
    ok: true,
    message: "اطلاعات گفتگو با موفقیت دریافت شد.",
    chatId: result.chatId,
    chatTitle: result.title,
  };
}

export async function fetchTelegramRecentChatsAction(
  _previousState: TelegramSettingsActionState,
  _formData: FormData,
): Promise<TelegramSettingsActionState> {
  void _previousState;
  void _formData;

  const membership = await requireTenantPermission("notifications.manage");
  const tokenResult = await getSavedTelegramToken(membership.tenantId);

  if (!tokenResult.ok) {
    return { ok: false, message: tokenResult.message };
  }

  const result = await getTelegramRecentChats({ botToken: tokenResult.botToken });

  if (!result.ok) {
    await tokenResult.db.telegramIntegrationSetting.updateMany({
      where: { tenantId: membership.tenantId },
      data: {
        lastErrorAt: new Date(),
        lastErrorMessage: result.error,
      },
    });
    revalidateTelegramSettingsPaths();
    return { ok: false, message: result.error };
  }

  if (result.chats.length === 0) {
    return {
      ok: false,
      message:
        "ابتدا در تلگرام یک پیام به بات ارسال کنید یا بات را به گروه اضافه کنید، سپس دوباره تلاش کنید.",
      recentChats: [],
    };
  }

  return {
    ok: true,
    message: "گفتگوهای اخیر بات دریافت شد.",
    recentChats: result.chats,
  };
}

export async function selectTelegramDiscoveredChatAction(
  _previousState: TelegramSettingsActionState,
  formData: FormData,
): Promise<TelegramSettingsActionState> {
  const membership = await requireTenantPermission("notifications.manage");
  const submittedChatId = String(formData.get("chatId") ?? "").trim();
  const normalizedChatId = normalizeTelegramChatLookup(submittedChatId);
  const chatId = normalizedChatId || submittedChatId;
  const chatTitle = getManualTelegramTitle(chatId, String(formData.get("chatTitle") ?? ""));

  if (!normalizedChatId && !/^-?\d{5,30}$/.test(submittedChatId)) {
    return {
      ok: false,
      message: "شناسه گفتگو معتبر نیست. مقدار مجاز: @username، شناسه عددی مثل -1001234567890، یا لینک عمومی t.me/username.",
    };
  }

  const db = (await getPrisma()) as unknown as TelegramActionsClient;

  await db.telegramIntegrationSetting.updateMany({
    where: { tenantId: membership.tenantId },
    data: {
      chatId,
      chatTitle: chatTitle || null,
      lastErrorMessage: null,
    },
  });

  revalidateTelegramSettingsPaths();

  return {
    ok: true,
    message: "گفتگوی انتخاب‌شده ذخیره شد.",
    chatId,
    chatTitle,
  };
}
