"use server";

import { revalidatePath } from "next/cache";
import type { BaleSettingsActionState } from "@/lib/actions/bale-settings-state";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { formatJalaliDateTime } from "@/lib/date/jalali";
import {
  getBaleRecentChats,
  normalizeBaleChatLookup,
  sendBaleMessage,
} from "@/lib/integrations/bale";
import { createNotificationLog, ensureDefaultNotificationTemplates, markNotificationLogFailed, markNotificationLogSent } from "@/lib/notifications/notification-service";
import { renderNotificationTemplate } from "@/lib/notifications/template-renderer";
import { getPrisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/security/secret-field";
import { baleSettingsSchema } from "@/lib/validation/bale-settings";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";

type BaleSettingRow = {
  botTokenEncrypted: string | null;
  botTokenMasked: string | null;
  chatId: string | null;
  chatTitle: string | null;
  isEnabled: boolean;
};

type BaleTemplateRow = {
  title: string;
  body: string;
  isEnabled: boolean;
} | null;

type BaleActionsClient = {
  baleIntegrationSetting: {
    findUnique(args: unknown): Promise<BaleSettingRow | null>;
    upsert(args: unknown): Promise<unknown>;
    updateMany(args: unknown): Promise<unknown>;
  };
  notificationTemplate: {
    findUnique(args: unknown): Promise<BaleTemplateRow>;
  };
};

function booleanFromForm(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function revalidateBaleSettingsPaths() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/notifications");
  revalidatePath("/dashboard/settings/bale");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/message-templates");
}

function parseBaleSettingsForm(formData: FormData) {
  return baleSettingsSchema.safeParse({
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

  return "ذخیره تنظیمات بله با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.";
}

function cleanBaleActionError(error: unknown) {
  if (error instanceof Error && /NOTIFICATION_SECRET_KEY|NEXTAUTH_SECRET|AUTH_SECRET/.test(error.message)) {
    return "کلید امنیتی ذخیره اطلاعات محرمانه تنظیم نشده است.";
  }

  return "ارسال پیام تست بله با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.";
}

async function getSavedBaleToken(tenantId: string) {
  const db = (await getPrisma()) as unknown as BaleActionsClient;
  const setting = await db.baleIntegrationSetting.findUnique({
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
      message: "لطفاً ابتدا توکن بازو را ذخیره کنید.",
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
      message: cleanBaleActionError(error),
      db,
      setting,
    };
  }
}


function isBaleNetworkError(message: string) {
  return /tapi\.bale\.ai|VPN|Proxy|پراکسی|شبکه|زمان مناسب|دسترسی ندارد|Bale Bot API/i.test(message);
}

function getManualBaleTitle(chatId: string, submittedTitle?: string) {
  const title = submittedTitle?.trim();

  if (title) {
    return title;
  }

  if (chatId.startsWith("@")) {
    return chatId;
  }

  return "گفتگوی بله، ثبت دستی";
}

function escapeBaleText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function saveBaleSettingsAction(
  _previousState: BaleSettingsActionState,
  formData: FormData,
): Promise<BaleSettingsActionState> {
  const membership = await requireTenantPermission("notifications.manage");
  const parsed = parseBaleSettingsForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "اطلاعات تنظیمات بله معتبر نیست.",
    };
  }

  const db = (await getPrisma()) as unknown as BaleActionsClient;
  const existing = await db.baleIntegrationSetting.findUnique({
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
      message: "برای فعال‌سازی بله، توکن بازو الزامی است.",
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

  const savedSettings = await db.baleIntegrationSetting.upsert({
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
    entityType: "BALE_SETTING",
    title: "به‌روزرسانی تنظیمات بله",
    message: `تنظیمات بله توسط ${getAuditActorName(membership.user)} به‌روزرسانی شد.`,
    beforeData: existing,
    afterData: savedSettings,
    href: "/dashboard/settings/bale",
  });

  revalidateBaleSettingsPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "تنظیمات بله با موفقیت ذخیره شد.",
  };
}

export async function sendBaleTestMessageAction(
  _previousState: BaleSettingsActionState,
  _formData: FormData,
): Promise<BaleSettingsActionState> {
  void _previousState;
  void _formData;

  const membership = await requireTenantPermission("notifications.manage");
  const db = (await getPrisma()) as unknown as BaleActionsClient;
  const setting = await db.baleIntegrationSetting.findUnique({
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
        channel: "BALE",
        eventType: "TEST_MESSAGE",
      },
    },
    select: { title: true, body: true, isEnabled: true },
  });

  const title = template?.title || "پیام تست بله";
  const message = renderNotificationTemplate(
    template?.body ||
      [
        "پیام تست بله | {{tenantName}}",
        "",
        "اتصال بله با موفقیت بررسی شد.",
        "پیام‌های مدیریتی با متن رسمی، دقیق و قابل پیگیری ارسال می‌شوند.",
        "",
        "زمان تست: {{currentDateTime}}",
      ].join("\n"),
    {
      tenantName: escapeBaleText(membership.tenant.name),
      currentDateTime: escapeBaleText(formatJalaliDateTime(new Date())),
    },
  );

  const log = await createNotificationLog({
    tenantId: membership.tenantId,
    channel: "BALE",
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
    const messageText = cleanBaleActionError(error);
    await markNotificationLogFailed(log.id, membership.tenantId, messageText);
    await db.baleIntegrationSetting.updateMany({
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
      entityType: "BALE_SETTING",
      entityId: log.id,
      title: "خطای ارسال پیام تست بله",
      message: `ارسال پیام تست بله توسط ${getAuditActorName(membership.user)} ناموفق بود.`,
      metadata: { channel: "BALE", reason: messageText },
      href: "/dashboard/settings/notification-logs",
    });
    revalidateBaleSettingsPaths();
    return { ok: false, message: messageText };
  }

  const result = await sendBaleMessage({
    botToken,
    chatId: setting.chatId,
    text: message,
  });

  if (result.ok) {
    await markNotificationLogSent(log.id, membership.tenantId);
    await db.baleIntegrationSetting.updateMany({
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
      entityType: "BALE_SETTING",
      entityId: log.id,
      title: "ارسال پیام تست بله",
      message: `پیام تست بله توسط ${getAuditActorName(membership.user)} ارسال شد.`,
      metadata: { channel: "BALE", chatId: setting.chatId },
      href: "/dashboard/settings/notification-logs",
    });
    revalidateBaleSettingsPaths();
    return { ok: true, message: "پیام تست بله با موفقیت ارسال شد." };
  }

  await markNotificationLogFailed(log.id, membership.tenantId, result.error);
  await db.baleIntegrationSetting.updateMany({
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
    entityType: "BALE_SETTING",
    entityId: log.id,
    title: "خطای ارسال پیام تست بله",
    message: `ارسال پیام تست بله توسط ${getAuditActorName(membership.user)} ناموفق بود.`,
    metadata: { channel: "BALE", chatId: setting.chatId, reason: result.error },
    href: "/dashboard/settings/notification-logs",
  });
  revalidateBaleSettingsPaths();

  return {
    ok: false,
    message: result.error || "ارسال پیام تست بله ناموفق بود.",
  };
}

export async function discoverBaleChatAction(
  _previousState: BaleSettingsActionState,
  formData: FormData,
): Promise<BaleSettingsActionState> {
  void _previousState;

  const membership = await requireTenantPermission("notifications.manage");
  const lookup = String(formData.get("chatLookup") ?? "");
  const tokenResult = await getSavedBaleToken(membership.tenantId);

  if (!tokenResult.ok) {
    return { ok: false, message: tokenResult.message };
  }

  const normalizedLookup = normalizeBaleChatLookup(lookup);

  if (!normalizedLookup) {
    return { ok: false, message: "شناسه یا لینک گفتگوی بله معتبر نیست." };
  }

  await tokenResult.db.baleIntegrationSetting.updateMany({
    where: { tenantId: membership.tenantId },
    data: {
      chatId: normalizedLookup,
      chatTitle: getManualBaleTitle(normalizedLookup),
      lastErrorMessage: null,
    },
  });

  revalidateBaleSettingsPaths();

  return {
    ok: true,
    message: "شناسه گفتگوی بله آماده و ذخیره شد. برای تأیید واقعی اتصال، پیام تست ارسال کنید.",
    chatId: normalizedLookup,
    chatTitle: getManualBaleTitle(normalizedLookup),
  };
}

export async function fetchBaleRecentChatsAction(
  _previousState: BaleSettingsActionState,
  _formData: FormData,
): Promise<BaleSettingsActionState> {
  void _previousState;
  void _formData;

  const membership = await requireTenantPermission("notifications.manage");
  const tokenResult = await getSavedBaleToken(membership.tenantId);

  if (!tokenResult.ok) {
    return { ok: false, message: tokenResult.message };
  }

  const result = await getBaleRecentChats({ botToken: tokenResult.botToken });

  if (!result.ok) {
    await tokenResult.db.baleIntegrationSetting.updateMany({
      where: { tenantId: membership.tenantId },
      data: {
        lastErrorAt: new Date(),
        lastErrorMessage: result.error,
      },
    });
    revalidateBaleSettingsPaths();
    return { ok: false, message: result.error };
  }

  if (result.chats.length === 0) {
    return {
      ok: false,
      message:
        "ابتدا در بله یک پیام به بازو ارسال کنید یا بازو را به گروه اضافه کنید، سپس دوباره تلاش کنید.",
      recentChats: [],
    };
  }

  return {
    ok: true,
    message: "گفتگوهای اخیر بات دریافت شد.",
    recentChats: result.chats,
  };
}

export async function selectBaleDiscoveredChatAction(
  _previousState: BaleSettingsActionState,
  formData: FormData,
): Promise<BaleSettingsActionState> {
  const membership = await requireTenantPermission("notifications.manage");
  const submittedChatId = String(formData.get("chatId") ?? "").trim();
  const normalizedChatId = normalizeBaleChatLookup(submittedChatId);
  const chatId = normalizedChatId || submittedChatId;
  const chatTitle = getManualBaleTitle(chatId, String(formData.get("chatTitle") ?? ""));

  if (!normalizedChatId && !/^-?\d{5,30}$/.test(submittedChatId)) {
    return {
      ok: false,
      message: "شناسه گفتگو معتبر نیست. مقدار مجاز: @username، شناسه عددی مثل -1001234567890، یا لینک عمومی ble.ir/username.",
    };
  }

  const db = (await getPrisma()) as unknown as BaleActionsClient;

  await db.baleIntegrationSetting.updateMany({
    where: { tenantId: membership.tenantId },
    data: {
      chatId,
      chatTitle: chatTitle || null,
      lastErrorMessage: null,
    },
  });

  revalidateBaleSettingsPaths();

  return {
    ok: true,
    message: "گفتگوی انتخاب‌شده ذخیره شد.",
    chatId,
    chatTitle,
  };
}
