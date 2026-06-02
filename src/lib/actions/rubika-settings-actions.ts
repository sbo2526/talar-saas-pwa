"use server";

import { revalidatePath } from "next/cache";
import type { RubikaSettingsActionState } from "@/lib/actions/rubika-settings-state";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { formatJalaliDateTime } from "@/lib/date/jalali";
import {
  getRubikaRecentChats,
  normalizeRubikaChatLookup,
  sendRubikaMessage,
} from "@/lib/integrations/rubika";
import { createNotificationLog, ensureDefaultNotificationTemplates, markNotificationLogFailed, markNotificationLogSent } from "@/lib/notifications/notification-service";
import { renderNotificationTemplate } from "@/lib/notifications/template-renderer";
import { getPrisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/security/secret-field";
import { rubikaSettingsSchema } from "@/lib/validation/rubika-settings";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";

type RubikaSettingRow = {
  botTokenEncrypted: string | null;
  botTokenMasked: string | null;
  chatId: string | null;
  chatTitle: string | null;
  isEnabled: boolean;
};

type RubikaTemplateRow = {
  title: string;
  body: string;
  isEnabled: boolean;
} | null;

type RubikaActionsClient = {
  rubikaIntegrationSetting: {
    findUnique(args: unknown): Promise<RubikaSettingRow | null>;
    upsert(args: unknown): Promise<unknown>;
    updateMany(args: unknown): Promise<unknown>;
  };
  notificationTemplate: {
    findUnique(args: unknown): Promise<RubikaTemplateRow>;
  };
};

function booleanFromForm(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function revalidateRubikaSettingsPaths() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/notifications");
  revalidatePath("/dashboard/settings/rubika");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/message-templates");
}

function parseRubikaSettingsForm(formData: FormData) {
  return rubikaSettingsSchema.safeParse({
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

  return "ذخیره تنظیمات روبیکا با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.";
}

function cleanRubikaActionError(error: unknown) {
  if (error instanceof Error && /NOTIFICATION_SECRET_KEY|NEXTAUTH_SECRET|AUTH_SECRET/.test(error.message)) {
    return "کلید امنیتی ذخیره اطلاعات محرمانه تنظیم نشده است.";
  }

  return "ارسال پیام تست روبیکا با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.";
}

async function getSavedRubikaToken(tenantId: string) {
  const db = (await getPrisma()) as unknown as RubikaActionsClient;
  const setting = await db.rubikaIntegrationSetting.findUnique({
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
      message: cleanRubikaActionError(error),
      db,
      setting,
    };
  }
}


function isRubikaNetworkError(message: string) {
  return /botapi\.rubika\.ir|VPN|Proxy|پراکسی|شبکه|زمان مناسب|دسترسی ندارد|Rubika Bot API/i.test(message);
}

function getManualRubikaTitle(chatId: string, submittedTitle?: string) {
  const title = submittedTitle?.trim();

  if (title) {
    return title;
  }

  if (chatId.startsWith("@")) {
    return chatId;
  }

  return "گفتگوی روبیکا، ثبت دستی";
}

function escapeRubikaText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function saveRubikaSettingsAction(
  _previousState: RubikaSettingsActionState,
  formData: FormData,
): Promise<RubikaSettingsActionState> {
  const membership = await requireTenantPermission("notifications.manage");
  const parsed = parseRubikaSettingsForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "اطلاعات تنظیمات روبیکا معتبر نیست.",
    };
  }

  const db = (await getPrisma()) as unknown as RubikaActionsClient;
  const existing = await db.rubikaIntegrationSetting.findUnique({
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
      message: "برای فعال‌سازی روبیکا، توکن بات الزامی است.",
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

  const savedSettings = await db.rubikaIntegrationSetting.upsert({
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
    entityType: "RUBIKA_SETTING",
    title: "به‌روزرسانی تنظیمات روبیکا",
    message: `تنظیمات روبیکا توسط ${getAuditActorName(membership.user)} به‌روزرسانی شد.`,
    beforeData: existing,
    afterData: savedSettings,
    href: "/dashboard/settings/rubika",
  });

  revalidateRubikaSettingsPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "تنظیمات روبیکا با موفقیت ذخیره شد.",
  };
}

export async function sendRubikaTestMessageAction(
  _previousState: RubikaSettingsActionState,
  _formData: FormData,
): Promise<RubikaSettingsActionState> {
  void _previousState;
  void _formData;

  const membership = await requireTenantPermission("notifications.manage");
  const db = (await getPrisma()) as unknown as RubikaActionsClient;
  const setting = await db.rubikaIntegrationSetting.findUnique({
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
        channel: "RUBIKA",
        eventType: "TEST_MESSAGE",
      },
    },
    select: { title: true, body: true, isEnabled: true },
  });

  const title = template?.title || "پیام تست روبیکا";
  const message = renderNotificationTemplate(
    template?.body ||
      [
        "پیام تست روبیکا | {{tenantName}}",
        "",
        "اتصال روبیکا با موفقیت بررسی شد.",
        "پیام‌های مدیریتی با متن رسمی، دقیق و قابل پیگیری ارسال می‌شوند.",
        "",
        "زمان تست: {{currentDateTime}}",
      ].join("\n"),
    {
      tenantName: escapeRubikaText(membership.tenant.name),
      currentDateTime: escapeRubikaText(formatJalaliDateTime(new Date())),
    },
  );

  const log = await createNotificationLog({
    tenantId: membership.tenantId,
    channel: "RUBIKA",
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
    const messageText = cleanRubikaActionError(error);
    await markNotificationLogFailed(log.id, membership.tenantId, messageText);
    await db.rubikaIntegrationSetting.updateMany({
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
      entityType: "RUBIKA_SETTING",
      entityId: log.id,
      title: "خطای ارسال پیام تست روبیکا",
      message: `ارسال پیام تست روبیکا توسط ${getAuditActorName(membership.user)} ناموفق بود.`,
      metadata: { channel: "RUBIKA", reason: messageText },
      href: "/dashboard/settings/notification-logs",
    });
    revalidateRubikaSettingsPaths();
    return { ok: false, message: messageText };
  }

  const result = await sendRubikaMessage({
    botToken,
    chatId: setting.chatId,
    text: message,
  });

  if (result.ok) {
    await markNotificationLogSent(log.id, membership.tenantId);
    await db.rubikaIntegrationSetting.updateMany({
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
      entityType: "RUBIKA_SETTING",
      entityId: log.id,
      title: "ارسال پیام تست روبیکا",
      message: `پیام تست روبیکا توسط ${getAuditActorName(membership.user)} ارسال شد.`,
      metadata: { channel: "RUBIKA", chatId: setting.chatId },
      href: "/dashboard/settings/notification-logs",
    });
    revalidateRubikaSettingsPaths();
    return { ok: true, message: "پیام تست روبیکا با موفقیت ارسال شد." };
  }

  await markNotificationLogFailed(log.id, membership.tenantId, result.error);
  await db.rubikaIntegrationSetting.updateMany({
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
    entityType: "RUBIKA_SETTING",
    entityId: log.id,
    title: "خطای ارسال پیام تست روبیکا",
    message: `ارسال پیام تست روبیکا توسط ${getAuditActorName(membership.user)} ناموفق بود.`,
    metadata: { channel: "RUBIKA", chatId: setting.chatId, reason: result.error },
    href: "/dashboard/settings/notification-logs",
  });
  revalidateRubikaSettingsPaths();

  return {
    ok: false,
    message: result.error || "ارسال پیام تست روبیکا ناموفق بود.",
  };
}

export async function discoverRubikaChatAction(
  _previousState: RubikaSettingsActionState,
  formData: FormData,
): Promise<RubikaSettingsActionState> {
  void _previousState;

  const membership = await requireTenantPermission("notifications.manage");
  const lookup = String(formData.get("chatLookup") ?? "");
  const tokenResult = await getSavedRubikaToken(membership.tenantId);

  if (!tokenResult.ok) {
    return { ok: false, message: tokenResult.message };
  }

  const normalizedLookup = normalizeRubikaChatLookup(lookup);

  if (!normalizedLookup) {
    return { ok: false, message: "شناسه یا لینک گفتگوی روبیکا معتبر نیست." };
  }

  await tokenResult.db.rubikaIntegrationSetting.updateMany({
    where: { tenantId: membership.tenantId },
    data: {
      chatId: normalizedLookup,
      chatTitle: getManualRubikaTitle(normalizedLookup),
      lastErrorMessage: null,
    },
  });

  revalidateRubikaSettingsPaths();

  return {
    ok: true,
    message: "شناسه گفتگوی روبیکا آماده و ذخیره شد. برای تأیید واقعی اتصال، پیام تست ارسال کنید.",
    chatId: normalizedLookup,
    chatTitle: getManualRubikaTitle(normalizedLookup),
  };
}

export async function fetchRubikaRecentChatsAction(
  _previousState: RubikaSettingsActionState,
  _formData: FormData,
): Promise<RubikaSettingsActionState> {
  void _previousState;
  void _formData;

  const membership = await requireTenantPermission("notifications.manage");
  const tokenResult = await getSavedRubikaToken(membership.tenantId);

  if (!tokenResult.ok) {
    return { ok: false, message: tokenResult.message };
  }

  const result = await getRubikaRecentChats({ botToken: tokenResult.botToken });

  if (!result.ok) {
    await tokenResult.db.rubikaIntegrationSetting.updateMany({
      where: { tenantId: membership.tenantId },
      data: {
        lastErrorAt: new Date(),
        lastErrorMessage: result.error,
      },
    });
    revalidateRubikaSettingsPaths();
    return { ok: false, message: result.error };
  }

  if (result.chats.length === 0) {
    return {
      ok: false,
      message:
        "ابتدا در روبیکا یک پیام به بات ارسال کنید یا بات را به گروه اضافه کنید، سپس دوباره تلاش کنید.",
      recentChats: [],
    };
  }

  return {
    ok: true,
    message: "گفتگوهای اخیر بات دریافت شد.",
    recentChats: result.chats,
  };
}

export async function selectRubikaDiscoveredChatAction(
  _previousState: RubikaSettingsActionState,
  formData: FormData,
): Promise<RubikaSettingsActionState> {
  const membership = await requireTenantPermission("notifications.manage");
  const submittedChatId = String(formData.get("chatId") ?? "").trim();
  const normalizedChatId = normalizeRubikaChatLookup(submittedChatId);
  const chatId = normalizedChatId || submittedChatId;
  const chatTitle = getManualRubikaTitle(chatId, String(formData.get("chatTitle") ?? ""));

  if (!normalizedChatId && !/^[A-Za-z0-9_@:-]{3,128}$/.test(submittedChatId)) {
    return {
      ok: false,
      message: "شناسه گفتگو معتبر نیست. مقدار مجاز: chat_id دریافتی از getUpdates یا لینک/شناسه عمومی rubika.ir/username.",
    };
  }

  const db = (await getPrisma()) as unknown as RubikaActionsClient;

  await db.rubikaIntegrationSetting.updateMany({
    where: { tenantId: membership.tenantId },
    data: {
      chatId,
      chatTitle: chatTitle || null,
      lastErrorMessage: null,
    },
  });

  revalidateRubikaSettingsPaths();

  return {
    ok: true,
    message: "گفتگوی انتخاب‌شده ذخیره شد.",
    chatId,
    chatTitle,
  };
}
