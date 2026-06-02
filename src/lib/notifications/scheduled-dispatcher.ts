import "server-only";

import { dispatchTomorrowCustomerBalanceDueSmsReminders } from "@/lib/notifications/customer-notification-dispatcher";
import { sendBaleMessage } from "@/lib/integrations/bale";
import { sendRubikaMessage } from "@/lib/integrations/rubika";
import { sendSmsMessage } from "@/lib/integrations/sms";
import { sendEmailMessage } from "@/lib/integrations/email";
import { sendTelegramMessage } from "@/lib/integrations/telegram";
import {
  getNotificationEventLabel,
  type NotificationChannel,
  type NotificationEventType,
} from "@/lib/notifications/constants";
import {
  getDailyNotificationReportData,
  getDayRange,
  getMonthRange,
  getOutstandingBalanceReminderData,
  getTomorrowEventReminderData,
  getWeekRange,
} from "@/lib/notifications/report-data";
import {
  buildDailyReportVariables,
  buildMonthlyReportVariables,
  buildOutstandingBalanceVariables,
  buildTomorrowReminderVariables,
  buildWeeklyReportVariables,
} from "@/lib/notifications/report-message-builders";
import {
  createNotificationLog,
  ensureDefaultNotificationTemplates,
  markNotificationLogFailed,
  markNotificationLogSent,
} from "@/lib/notifications/notification-service";
import {
  parseSmsRecipients,
  parseEmailRecipients,
} from "@/lib/notifications/recipient-utils";
import {
  getDefaultNotificationTemplate,
  renderNotificationTemplate,
  shouldUpgradeStoredNotificationTemplate,
} from "@/lib/notifications/template-renderer";
import { getPrisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/secret-field";
import { dateToJalaliParts, getJalaliWeekdayIndex } from "@/lib/date/jalali";

export type ScheduledDispatchSummary = {
  ok: true;
  processedTenants: number;
  sent: number;
  failed: number;
  skipped: number;
  details: Array<{
    tenantId: string;
    channel: string;
    eventType: string;
    status: "SENT" | "FAILED" | "SKIPPED";
    error?: string;
  }>;
};

type TenantRow = { id: string; name: string };
type TelegramSetting = {
  isEnabled: boolean;
  botTokenEncrypted: string | null;
  chatId: string | null;
  chatTitle: string | null;
  sendDailyReports: boolean;
  sendWeeklyReports: boolean;
  sendMonthlyReports: boolean;
  sendEventReminders: boolean;
  sendOutstandingBalanceReminders: boolean;
  dailyReportTime: string | null;
  weeklyReportDay: string | null;
  monthlyReportDay: number | null;
};
type BaleSetting = {
  isEnabled: boolean;
  botTokenEncrypted: string | null;
  chatId: string | null;
  chatTitle: string | null;
  sendDailyReports: boolean;
  sendWeeklyReports: boolean;
  sendMonthlyReports: boolean;
  sendEventReminders: boolean;
  sendOutstandingBalanceReminders: boolean;
  dailyReportTime: string | null;
  weeklyReportDay: string | null;
  monthlyReportDay: number | null;
};
type RubikaSetting = {
  isEnabled: boolean;
  botTokenEncrypted: string | null;
  chatId: string | null;
  chatTitle: string | null;
  sendDailyReports: boolean;
  sendWeeklyReports: boolean;
  sendMonthlyReports: boolean;
  sendEventReminders: boolean;
  sendOutstandingBalanceReminders: boolean;
  dailyReportTime: string | null;
  weeklyReportDay: string | null;
  monthlyReportDay: number | null;
};
type SmsSetting = {
  isEnabled: boolean;
  provider: string | null;
  apiKeyEncrypted: string | null;
  senderNumber: string | null;
  managerMobile: string | null;
  sendToManager: boolean;
  sendDailyReports: boolean;
  sendWeeklyReports: boolean;
  sendMonthlyReports: boolean;
  sendEventReminders: boolean;
  sendOutstandingBalanceReminders: boolean;
};
type EmailSetting = {
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
  sendDailyReports: boolean;
  sendWeeklyReports: boolean;
  sendMonthlyReports: boolean;
  sendEventReminders: boolean;
  sendOutstandingBalanceReminders: boolean;
  dailyReportTime: string | null;
  weeklyReportDay: string | null;
  monthlyReportDay: number | null;
};

type Db = {
  tenant: {
    findMany(args: unknown): Promise<TenantRow[]>;
    findUnique(args: unknown): Promise<TenantRow | null>;
  };
  telegramIntegrationSetting: {
    findUnique(args: unknown): Promise<TelegramSetting | null>;
    updateMany(args: unknown): Promise<unknown>;
  };
  baleIntegrationSetting: {
    findUnique(args: unknown): Promise<BaleSetting | null>;
    updateMany(args: unknown): Promise<unknown>;
  };
  rubikaIntegrationSetting: {
    findUnique(args: unknown): Promise<RubikaSetting | null>;
    updateMany(args: unknown): Promise<unknown>;
  };
  smsIntegrationSetting: {
    findUnique(args: unknown): Promise<SmsSetting | null>;
    updateMany(args: unknown): Promise<unknown>;
  };
  emailIntegrationSetting?: {
    findUnique(args: unknown): Promise<EmailSetting | null>;
    updateMany(args: unknown): Promise<unknown>;
  } | null;
  notificationTemplate: {
    findUnique(
      args: unknown,
    ): Promise<{ title: string; body: string; isEnabled: boolean } | null>;
  };
  notificationLog: { findFirst(args: unknown): Promise<{ id: string } | null> };
};

async function db() {
  return (await getPrisma()) as unknown as Db;
}

function hasEmailIntegrationDelegate(
  client: Db,
): client is Db & {
  emailIntegrationSetting: NonNullable<Db["emailIntegrationSetting"]>;
} {
  return Boolean(
    client.emailIntegrationSetting &&
    typeof client.emailIntegrationSetting.findUnique === "function" &&
    typeof client.emailIntegrationSetting.updateMany === "function",
  );
}

function cleanSecretOrProviderError(error: unknown) {
  if (error instanceof Error) {
    if (
      /NOTIFICATION_SECRET_KEY|NEXTAUTH_SECRET|AUTH_SECRET/.test(error.message)
    ) {
      return "کلید امنیتی ذخیره اطلاعات محرمانه تنظیم نشده است.";
    }
    return error.message.slice(0, 500) || "ارسال اعلان ناموفق بود.";
  }
  return "ارسال اعلان ناموفق بود.";
}

function parseClockToMinutes(value: string | null | undefined) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? "").trim());

  if (!match) {
    return 0;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return 0;
  }

  return hour * 60 + minute;
}

function hasClockPassed(clock: string | null | undefined, now: Date) {
  const targetMinutes = parseClockToMinutes(clock ?? "09:00");
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return currentMinutes >= targetMinutes;
}

function currentWeekdayName(now: Date) {
  return (
    [
      "SATURDAY",
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
    ][getJalaliWeekdayIndex(now)] ?? "SATURDAY"
  );
}

function reportPeriod(eventType: NotificationEventType, now: Date) {
  if (eventType === "WEEKLY_REPORT") return getWeekRange(now);
  if (eventType === "MONTHLY_REPORT") return getMonthRange(now);
  return getDayRange(now);
}

async function alreadySentScheduled(
  tenantId: string,
  channel: NotificationChannel,
  eventType: NotificationEventType,
  now: Date,
) {
  const { start, end } = reportPeriod(eventType, now);
  const client = await db();
  return client.notificationLog.findFirst({
    where: {
      tenantId,
      channel,
      eventType,
      status: { in: ["SENT", "QUEUED"] },
      createdAt: { gte: start, lt: end },
    },
    select: { id: true },
  });
}

async function buildVariables(
  tenantId: string,
  tenantName: string,
  eventType: NotificationEventType,
  now: Date,
) {
  if (eventType === "DAILY_REPORT") {
    return buildDailyReportVariables(
      await getDailyNotificationReportData(tenantId, now),
    );
  }
  if (eventType === "WEEKLY_REPORT") {
    const { getWeeklyNotificationReportData } =
      await import("@/lib/notifications/report-data");
    return buildWeeklyReportVariables(
      await getWeeklyNotificationReportData(tenantId, now),
    );
  }
  if (eventType === "MONTHLY_REPORT") {
    const { getMonthlyNotificationReportData } =
      await import("@/lib/notifications/report-data");
    return buildMonthlyReportVariables(
      await getMonthlyNotificationReportData(tenantId, now),
    );
  }
  if (eventType === "EVENT_REMINDER_TOMORROW") {
    const data = await getTomorrowEventReminderData(tenantId, now);
    return buildTomorrowReminderVariables({ ...data, tenantName });
  }
  const data = await getOutstandingBalanceReminderData(tenantId);
  return buildOutstandingBalanceVariables({ ...data, tenantName });
}

async function renderTemplate(
  tenantId: string,
  channel: NotificationChannel,
  eventType: NotificationEventType,
  variables: Record<string, unknown>,
) {
  const client = await db();
  const fallback = getDefaultNotificationTemplate(channel, eventType) ?? {
    title: getNotificationEventLabel(eventType),
    body: "{{tenantName}}\n{{reportPeriod}}",
  };
  const template = await client.notificationTemplate.findUnique({
    where: { tenantId_channel_eventType: { tenantId, channel, eventType } },
    select: { title: true, body: true, isEnabled: true },
  });
  if (template && !template.isEnabled) return null;
  const usableTemplate =
    template &&
    !shouldUpgradeStoredNotificationTemplate({
      channel,
      eventType,
      title: template.title,
      body: template.body,
    })
      ? template
      : null;
  return {
    title:
      renderNotificationTemplate(
        usableTemplate?.title ?? fallback.title,
        variables,
      ).trim() || fallback.title,
    message:
      renderNotificationTemplate(
        usableTemplate?.body ?? fallback.body,
        variables,
      ).trim() || fallback.title,
  };
}

async function sendTelegramScheduled(
  tenant: TenantRow,
  eventType: NotificationEventType,
  now: Date,
  manual: boolean,
) {
  const client = await db();
  const setting = await client.telegramIntegrationSetting.findUnique({
    where: { tenantId: tenant.id },
    select: {
      isEnabled: true,
      botTokenEncrypted: true,
      chatId: true,
      chatTitle: true,
      sendDailyReports: true,
      sendWeeklyReports: true,
      sendMonthlyReports: true,
      sendEventReminders: true,
      sendOutstandingBalanceReminders: true,
      dailyReportTime: true,
      weeklyReportDay: true,
      monthlyReportDay: true,
    },
  });
  if (!setting?.isEnabled) return { status: "SKIPPED" as const };
  if (eventType === "DAILY_REPORT" && !setting.sendDailyReports)
    return { status: "SKIPPED" as const };
  if (eventType === "WEEKLY_REPORT" && !setting.sendWeeklyReports)
    return { status: "SKIPPED" as const };
  if (eventType === "MONTHLY_REPORT" && !setting.sendMonthlyReports)
    return { status: "SKIPPED" as const };
  if (eventType === "EVENT_REMINDER_TOMORROW" && !setting.sendEventReminders)
    return { status: "SKIPPED" as const };
  if (
    eventType === "OUTSTANDING_BALANCE_REMINDER" &&
    !setting.sendOutstandingBalanceReminders
  )
    return { status: "SKIPPED" as const };
  if (
    !manual &&
    (await alreadySentScheduled(tenant.id, "TELEGRAM", eventType, now))
  )
    return {
      status: "SKIPPED" as const,
      error: "برای این دوره قبلاً ارسال شده است.",
    };

  const variables = await buildVariables(
    tenant.id,
    tenant.name,
    eventType,
    now,
  );
  const rendered = await renderTemplate(
    tenant.id,
    "TELEGRAM",
    eventType,
    variables,
  );
  if (!rendered) return { status: "SKIPPED" as const };
  if (!setting.botTokenEncrypted || !setting.chatId)
    return { status: "SKIPPED" as const, error: "تنظیمات تلگرام کامل نیست." };

  const log = await createNotificationLog({
    tenantId: tenant.id,
    channel: "TELEGRAM",
    eventType,
    recipient: setting.chatId,
    recipientLabel:
      setting.chatTitle ?? (manual ? "ارسال دستی" : "ارسال زمان‌بندی‌شده"),
    title: `${rendered.title}${manual ? " · ارسال دستی" : ""}`,
    message: rendered.message,
    status: "QUEUED",
  });

  let token: string;
  try {
    token = decryptSecret(setting.botTokenEncrypted);
  } catch (error) {
    const message = cleanSecretOrProviderError(error);
    await markNotificationLogFailed(log.id, tenant.id, message);
    await client.telegramIntegrationSetting.updateMany({
      where: { tenantId: tenant.id },
      data: { lastErrorAt: new Date(), lastErrorMessage: message },
    });
    return { status: "FAILED" as const, logId: log.id, error: message };
  }

  const sent = await sendTelegramMessage({
    botToken: token,
    chatId: setting.chatId,
    text: rendered.message,
    parseMode: "HTML",
  });
  if (sent.ok) {
    await markNotificationLogSent(log.id, tenant.id);
    await client.telegramIntegrationSetting.updateMany({
      where: { tenantId: tenant.id },
      data: { lastSuccessAt: new Date(), lastErrorMessage: null },
    });
    return { status: "SENT" as const, logId: log.id };
  }
  await markNotificationLogFailed(log.id, tenant.id, sent.error);
  await client.telegramIntegrationSetting.updateMany({
    where: { tenantId: tenant.id },
    data: { lastErrorAt: new Date(), lastErrorMessage: sent.error },
  });
  return { status: "FAILED" as const, logId: log.id, error: sent.error };
}

async function sendBaleScheduled(
  tenant: TenantRow,
  eventType: NotificationEventType,
  now: Date,
  manual: boolean,
) {
  const client = await db();
  const setting = await client.baleIntegrationSetting.findUnique({
    where: { tenantId: tenant.id },
    select: {
      isEnabled: true,
      botTokenEncrypted: true,
      chatId: true,
      chatTitle: true,
      sendDailyReports: true,
      sendWeeklyReports: true,
      sendMonthlyReports: true,
      sendEventReminders: true,
      sendOutstandingBalanceReminders: true,
      dailyReportTime: true,
      weeklyReportDay: true,
      monthlyReportDay: true,
    },
  });
  if (!setting?.isEnabled) return { status: "SKIPPED" as const };
  if (eventType === "DAILY_REPORT" && !setting.sendDailyReports)
    return { status: "SKIPPED" as const };
  if (eventType === "WEEKLY_REPORT" && !setting.sendWeeklyReports)
    return { status: "SKIPPED" as const };
  if (eventType === "MONTHLY_REPORT" && !setting.sendMonthlyReports)
    return { status: "SKIPPED" as const };
  if (eventType === "EVENT_REMINDER_TOMORROW" && !setting.sendEventReminders)
    return { status: "SKIPPED" as const };
  if (
    eventType === "OUTSTANDING_BALANCE_REMINDER" &&
    !setting.sendOutstandingBalanceReminders
  )
    return { status: "SKIPPED" as const };
  if (
    !manual &&
    (await alreadySentScheduled(tenant.id, "BALE", eventType, now))
  )
    return {
      status: "SKIPPED" as const,
      error: "برای این دوره قبلاً ارسال شده است.",
    };

  const variables = await buildVariables(
    tenant.id,
    tenant.name,
    eventType,
    now,
  );
  const rendered = await renderTemplate(
    tenant.id,
    "BALE",
    eventType,
    variables,
  );
  if (!rendered) return { status: "SKIPPED" as const };
  if (!setting.botTokenEncrypted || !setting.chatId)
    return { status: "SKIPPED" as const, error: "تنظیمات بله کامل نیست." };

  const log = await createNotificationLog({
    tenantId: tenant.id,
    channel: "BALE",
    eventType,
    recipient: setting.chatId,
    recipientLabel:
      setting.chatTitle ?? (manual ? "ارسال دستی" : "ارسال زمان‌بندی‌شده"),
    title: `${rendered.title}${manual ? " · ارسال دستی" : ""}`,
    message: rendered.message,
    status: "QUEUED",
  });

  let token: string;
  try {
    token = decryptSecret(setting.botTokenEncrypted);
  } catch (error) {
    const message = cleanSecretOrProviderError(error);
    await markNotificationLogFailed(log.id, tenant.id, message);
    await client.baleIntegrationSetting.updateMany({
      where: { tenantId: tenant.id },
      data: { lastErrorAt: new Date(), lastErrorMessage: message },
    });
    return { status: "FAILED" as const, logId: log.id, error: message };
  }

  const sent = await sendBaleMessage({
    botToken: token,
    chatId: setting.chatId,
    text: rendered.message,
  });
  if (sent.ok) {
    await markNotificationLogSent(log.id, tenant.id);
    await client.baleIntegrationSetting.updateMany({
      where: { tenantId: tenant.id },
      data: { lastSuccessAt: new Date(), lastErrorMessage: null },
    });
    return { status: "SENT" as const, logId: log.id };
  }
  await markNotificationLogFailed(log.id, tenant.id, sent.error);
  await client.baleIntegrationSetting.updateMany({
    where: { tenantId: tenant.id },
    data: { lastErrorAt: new Date(), lastErrorMessage: sent.error },
  });
  return { status: "FAILED" as const, logId: log.id, error: sent.error };
}

async function sendRubikaScheduled(
  tenant: TenantRow,
  eventType: NotificationEventType,
  now: Date,
  manual: boolean,
) {
  const client = await db();
  const setting = await client.rubikaIntegrationSetting.findUnique({
    where: { tenantId: tenant.id },
    select: {
      isEnabled: true,
      botTokenEncrypted: true,
      chatId: true,
      chatTitle: true,
      sendDailyReports: true,
      sendWeeklyReports: true,
      sendMonthlyReports: true,
      sendEventReminders: true,
      sendOutstandingBalanceReminders: true,
      dailyReportTime: true,
      weeklyReportDay: true,
      monthlyReportDay: true,
    },
  });
  if (!setting?.isEnabled) return { status: "SKIPPED" as const };
  if (eventType === "DAILY_REPORT" && !setting.sendDailyReports)
    return { status: "SKIPPED" as const };
  if (eventType === "WEEKLY_REPORT" && !setting.sendWeeklyReports)
    return { status: "SKIPPED" as const };
  if (eventType === "MONTHLY_REPORT" && !setting.sendMonthlyReports)
    return { status: "SKIPPED" as const };
  if (eventType === "EVENT_REMINDER_TOMORROW" && !setting.sendEventReminders)
    return { status: "SKIPPED" as const };
  if (
    eventType === "OUTSTANDING_BALANCE_REMINDER" &&
    !setting.sendOutstandingBalanceReminders
  )
    return { status: "SKIPPED" as const };
  if (
    !manual &&
    (await alreadySentScheduled(tenant.id, "RUBIKA", eventType, now))
  )
    return {
      status: "SKIPPED" as const,
      error: "برای این دوره قبلاً ارسال شده است.",
    };

  const variables = await buildVariables(
    tenant.id,
    tenant.name,
    eventType,
    now,
  );
  const rendered = await renderTemplate(
    tenant.id,
    "RUBIKA",
    eventType,
    variables,
  );
  if (!rendered) return { status: "SKIPPED" as const };
  if (!setting.botTokenEncrypted || !setting.chatId)
    return { status: "SKIPPED" as const, error: "تنظیمات روبیکا کامل نیست." };

  const log = await createNotificationLog({
    tenantId: tenant.id,
    channel: "RUBIKA",
    eventType,
    recipient: setting.chatId,
    recipientLabel:
      setting.chatTitle ?? (manual ? "ارسال دستی" : "ارسال زمان‌بندی‌شده"),
    title: `${rendered.title}${manual ? " · ارسال دستی" : ""}`,
    message: rendered.message,
    status: "QUEUED",
  });

  let token: string;
  try {
    token = decryptSecret(setting.botTokenEncrypted);
  } catch (error) {
    const message = cleanSecretOrProviderError(error);
    await markNotificationLogFailed(log.id, tenant.id, message);
    await client.rubikaIntegrationSetting.updateMany({
      where: { tenantId: tenant.id },
      data: { lastErrorAt: new Date(), lastErrorMessage: message },
    });
    return { status: "FAILED" as const, logId: log.id, error: message };
  }

  const sent = await sendRubikaMessage({
    botToken: token,
    chatId: setting.chatId,
    text: rendered.message,
  });
  if (sent.ok) {
    await markNotificationLogSent(log.id, tenant.id);
    await client.rubikaIntegrationSetting.updateMany({
      where: { tenantId: tenant.id },
      data: { lastSuccessAt: new Date(), lastErrorMessage: null },
    });
    return { status: "SENT" as const, logId: log.id };
  }
  await markNotificationLogFailed(log.id, tenant.id, sent.error);
  await client.rubikaIntegrationSetting.updateMany({
    where: { tenantId: tenant.id },
    data: { lastErrorAt: new Date(), lastErrorMessage: sent.error },
  });
  return { status: "FAILED" as const, logId: log.id, error: sent.error };
}

async function sendSmsScheduled(
  tenant: TenantRow,
  eventType: NotificationEventType,
  now: Date,
  manual: boolean,
) {
  const client = await db();
  const setting = await client.smsIntegrationSetting.findUnique({
    where: { tenantId: tenant.id },
    select: {
      isEnabled: true,
      provider: true,
      apiKeyEncrypted: true,
      senderNumber: true,
      managerMobile: true,
      sendToManager: true,
      sendDailyReports: true,
      sendWeeklyReports: true,
      sendMonthlyReports: true,
      sendEventReminders: true,
      sendOutstandingBalanceReminders: true,
    },
  });
  if (!setting?.isEnabled || !setting.sendToManager)
    return { status: "SKIPPED" as const };
  if (eventType === "DAILY_REPORT" && !setting.sendDailyReports)
    return { status: "SKIPPED" as const };
  if (eventType === "WEEKLY_REPORT" && !setting.sendWeeklyReports)
    return { status: "SKIPPED" as const };
  if (eventType === "MONTHLY_REPORT" && !setting.sendMonthlyReports)
    return { status: "SKIPPED" as const };
  if (eventType === "EVENT_REMINDER_TOMORROW" && !setting.sendEventReminders)
    return { status: "SKIPPED" as const };
  if (
    eventType === "OUTSTANDING_BALANCE_REMINDER" &&
    !setting.sendOutstandingBalanceReminders
  )
    return { status: "SKIPPED" as const };
  if (!manual && (await alreadySentScheduled(tenant.id, "SMS", eventType, now)))
    return {
      status: "SKIPPED" as const,
      error: "برای این دوره قبلاً ارسال شده است.",
    };

  const variables = await buildVariables(
    tenant.id,
    tenant.name,
    eventType,
    now,
  );
  const rendered = await renderTemplate(tenant.id, "SMS", eventType, variables);
  if (!rendered) return { status: "SKIPPED" as const };
  const recipients = parseSmsRecipients(setting.managerMobile);
  if (!setting.provider || !setting.apiKeyEncrypted || recipients.length === 0)
    return { status: "SKIPPED" as const, error: "تنظیمات پیامک کامل نیست." };

  let apiKey: string;
  try {
    apiKey = decryptSecret(setting.apiKeyEncrypted);
  } catch (error) {
    const message = cleanSecretOrProviderError(error);
    await client.smsIntegrationSetting.updateMany({
      where: { tenantId: tenant.id },
      data: { lastErrorAt: new Date(), lastErrorMessage: message },
    });
    return { status: "FAILED" as const, error: message };
  }

  let sentCount = 0;
  let failedCount = 0;
  let lastError: string | undefined;
  for (const recipient of recipients) {
    const log = await createNotificationLog({
      tenantId: tenant.id,
      channel: "SMS",
      eventType,
      recipient,
      recipientLabel: recipients.length > 1 ? "شماره مالک/مدیر" : "شماره مدیر",
      title: `${rendered.title}${manual ? " · ارسال دستی" : ""}`,
      message: rendered.message,
      status: "QUEUED",
    });

    const sent = await sendSmsMessage({
      provider: setting.provider,
      apiKey,
      senderNumber: setting.senderNumber,
      receptor: recipient,
      message: rendered.message,
    });
    if (sent.ok) {
      sentCount += 1;
      await markNotificationLogSent(log.id, tenant.id);
    } else {
      failedCount += 1;
      lastError = sent.error;
      await markNotificationLogFailed(log.id, tenant.id, sent.error);
    }
  }

  if (sentCount > 0) {
    await client.smsIntegrationSetting.updateMany({
      where: { tenantId: tenant.id },
      data: {
        lastSuccessAt: new Date(),
        lastErrorMessage: failedCount > 0 ? lastError : null,
      },
    });
    return { status: "SENT" as const };
  }

  const error = lastError ?? "ارسال پیامک ناموفق بود.";
  await client.smsIntegrationSetting.updateMany({
    where: { tenantId: tenant.id },
    data: { lastErrorAt: new Date(), lastErrorMessage: error },
  });
  return { status: "FAILED" as const, error };
}

async function sendEmailScheduled(
  tenant: TenantRow,
  eventType: NotificationEventType,
  now: Date,
  manual: boolean,
) {
  const client = await db();
  if (!hasEmailIntegrationDelegate(client))
    return { status: "SKIPPED" as const };

  const setting = await client.emailIntegrationSetting.findUnique({
    where: { tenantId: tenant.id },
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
      sendDailyReports: true,
      sendWeeklyReports: true,
      sendMonthlyReports: true,
      sendEventReminders: true,
      sendOutstandingBalanceReminders: true,
      dailyReportTime: true,
      weeklyReportDay: true,
      monthlyReportDay: true,
    },
  });
  if (!setting?.isEnabled || !setting.sendToManager)
    return { status: "SKIPPED" as const };
  if (eventType === "DAILY_REPORT" && !setting.sendDailyReports)
    return { status: "SKIPPED" as const };
  if (eventType === "WEEKLY_REPORT" && !setting.sendWeeklyReports)
    return { status: "SKIPPED" as const };
  if (eventType === "MONTHLY_REPORT" && !setting.sendMonthlyReports)
    return { status: "SKIPPED" as const };
  if (eventType === "EVENT_REMINDER_TOMORROW" && !setting.sendEventReminders)
    return { status: "SKIPPED" as const };
  if (
    eventType === "OUTSTANDING_BALANCE_REMINDER" &&
    !setting.sendOutstandingBalanceReminders
  )
    return { status: "SKIPPED" as const };
  if (
    !manual &&
    (await alreadySentScheduled(tenant.id, "EMAIL", eventType, now))
  )
    return {
      status: "SKIPPED" as const,
      error: "برای این دوره قبلاً ارسال شده است.",
    };

  const variables = await buildVariables(
    tenant.id,
    tenant.name,
    eventType,
    now,
  );
  const rendered = await renderTemplate(
    tenant.id,
    "EMAIL",
    eventType,
    variables,
  );
  if (!rendered) return { status: "SKIPPED" as const };
  const recipients = parseEmailRecipients(setting.managerEmails);
  if (
    !setting.smtpHost ||
    !setting.smtpPort ||
    !setting.fromEmail ||
    recipients.length === 0
  )
    return { status: "SKIPPED" as const, error: "تنظیمات ایمیل کامل نیست." };

  let smtpPassword: string | null = null;
  if (setting.smtpPasswordEncrypted) {
    try {
      smtpPassword = decryptSecret(setting.smtpPasswordEncrypted);
    } catch (error) {
      const message = cleanSecretOrProviderError(error);
      await client.emailIntegrationSetting.updateMany({
        where: { tenantId: tenant.id },
        data: { lastErrorAt: new Date(), lastErrorMessage: message },
      });
      return { status: "FAILED" as const, error: message };
    }
  }

  let sentCount = 0;
  let failedCount = 0;
  let lastError: string | undefined;
  for (const recipient of recipients) {
    const log = await createNotificationLog({
      tenantId: tenant.id,
      channel: "EMAIL",
      eventType,
      recipient,
      recipientLabel: recipients.length > 1 ? "ایمیل مالک/مدیر" : "ایمیل مدیر",
      title: `${rendered.title}${manual ? " · ارسال دستی" : ""}`,
      message: rendered.message,
      status: "QUEUED",
    });
    const sent = await sendEmailMessage({
      smtpHost: setting.smtpHost,
      smtpPort: setting.smtpPort,
      smtpSecure: setting.smtpSecure,
      smtpUsername: setting.smtpUsername,
      smtpPassword,
      fromEmail: setting.fromEmail,
      fromName: setting.fromName ?? tenant.name,
      to: recipient,
      subject: rendered.title,
      text: rendered.message,
    });
    if (sent.ok) {
      sentCount += 1;
      await markNotificationLogSent(log.id, tenant.id);
    } else {
      failedCount += 1;
      lastError = sent.error;
      await markNotificationLogFailed(log.id, tenant.id, sent.error);
    }
  }
  if (sentCount > 0) {
    await client.emailIntegrationSetting.updateMany({
      where: { tenantId: tenant.id },
      data: {
        lastSuccessAt: new Date(),
        lastErrorMessage: failedCount > 0 ? lastError : null,
      },
    });
    return { status: "SENT" as const };
  }
  const error = lastError ?? "ارسال ایمیل ناموفق بود.";
  await client.emailIntegrationSetting.updateMany({
    where: { tenantId: tenant.id },
    data: { lastErrorAt: new Date(), lastErrorMessage: error },
  });
  return { status: "FAILED" as const, error };
}

export async function sendScheduledNotificationForTenant(
  tenantId: string,
  eventType: NotificationEventType,
  now = new Date(),
  options?: { manual?: boolean },
) {
  const client = await db();
  const tenant = await client.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true },
  });
  if (!tenant)
    return [
      {
        tenantId,
        channel: "SYSTEM",
        eventType,
        status: "SKIPPED" as const,
        error: "فضای کاری پیدا نشد.",
      },
    ];
  await ensureDefaultNotificationTemplates(tenant.id);
  const results = [] as Array<{
    tenantId: string;
    channel: string;
    eventType: string;
    status: "SENT" | "FAILED" | "SKIPPED";
    error?: string;
  }>;
  for (const [channel, sender] of [
    ["TELEGRAM", sendTelegramScheduled],
    ["BALE", sendBaleScheduled],
    ["RUBIKA", sendRubikaScheduled],
    ["SMS", sendSmsScheduled],
    ["EMAIL", sendEmailScheduled],
  ] as const) {
    try {
      const result = await sender(
        tenant,
        eventType,
        now,
        Boolean(options?.manual),
      );
      results.push({
        tenantId: tenant.id,
        channel,
        eventType,
        status: result.status,
        error: result.error,
      });
    } catch (error) {
      results.push({
        tenantId: tenant.id,
        channel,
        eventType,
        status: "FAILED",
        error: cleanSecretOrProviderError(error),
      });
    }
  }
  return results;
}

function dueEventsForTenant(
  telegram: TelegramSetting | null,
  bale: BaleSetting | null,
  rubika: RubikaSetting | null,
  sms: SmsSetting | null,
  email: EmailSetting | null,
  now: Date,
): NotificationEventType[] {
  const events = new Set<NotificationEventType>();
  const weekday = currentWeekdayName(now);
  const jalaliDay = dateToJalaliParts(now).day;

  const telegramReady = telegram?.isEnabled === true ? telegram : null;
  const baleReady = bale?.isEnabled === true ? bale : null;
  const rubikaReady = rubika?.isEnabled === true ? rubika : null;
  const smsReady =
    sms?.isEnabled === true && sms.sendToManager === true ? sms : null;
  const emailReady =
    email?.isEnabled === true && email.sendToManager === true ? email : null;

  const dailyDue =
    Boolean(
      telegramReady?.sendDailyReports &&
      hasClockPassed(telegramReady.dailyReportTime, now),
    ) ||
    Boolean(
      baleReady?.sendDailyReports &&
      hasClockPassed(baleReady.dailyReportTime, now),
    ) ||
    Boolean(
      rubikaReady?.sendDailyReports &&
      hasClockPassed(rubikaReady.dailyReportTime, now),
    ) ||
    Boolean(smsReady?.sendDailyReports && hasClockPassed("09:00", now)) ||
    Boolean(
      emailReady?.sendDailyReports &&
      hasClockPassed(emailReady.dailyReportTime, now),
    );

  const weeklyDue =
    Boolean(
      telegramReady?.sendWeeklyReports &&
      (!telegramReady.weeklyReportDay ||
        telegramReady.weeklyReportDay === weekday),
    ) ||
    Boolean(
      baleReady?.sendWeeklyReports &&
      (!baleReady.weeklyReportDay || baleReady.weeklyReportDay === weekday),
    ) ||
    Boolean(
      rubikaReady?.sendWeeklyReports &&
      (!rubikaReady.weeklyReportDay || rubikaReady.weeklyReportDay === weekday),
    ) ||
    Boolean(smsReady?.sendWeeklyReports) ||
    Boolean(
      emailReady?.sendWeeklyReports &&
      (!emailReady.weeklyReportDay || emailReady.weeklyReportDay === weekday),
    );

  const monthlyDue =
    Boolean(
      telegramReady?.sendMonthlyReports &&
      (!telegramReady.monthlyReportDay ||
        telegramReady.monthlyReportDay === jalaliDay),
    ) ||
    Boolean(
      baleReady?.sendMonthlyReports &&
      (!baleReady.monthlyReportDay || baleReady.monthlyReportDay === jalaliDay),
    ) ||
    Boolean(
      rubikaReady?.sendMonthlyReports &&
      (!rubikaReady.monthlyReportDay ||
        rubikaReady.monthlyReportDay === jalaliDay),
    ) ||
    Boolean(smsReady?.sendMonthlyReports) ||
    Boolean(
      emailReady?.sendMonthlyReports &&
      (!emailReady.monthlyReportDay ||
        emailReady.monthlyReportDay === jalaliDay),
    );

  if (dailyDue) events.add("DAILY_REPORT");
  if (weeklyDue) events.add("WEEKLY_REPORT");
  if (monthlyDue) events.add("MONTHLY_REPORT");
  if (
    telegramReady?.sendEventReminders ||
    baleReady?.sendEventReminders ||
    rubikaReady?.sendEventReminders ||
    smsReady?.sendEventReminders ||
    emailReady?.sendEventReminders
  )
    events.add("EVENT_REMINDER_TOMORROW");
  if (
    telegramReady?.sendOutstandingBalanceReminders ||
    baleReady?.sendOutstandingBalanceReminders ||
    rubikaReady?.sendOutstandingBalanceReminders ||
    smsReady?.sendOutstandingBalanceReminders ||
    emailReady?.sendOutstandingBalanceReminders
  )
    events.add("OUTSTANDING_BALANCE_REMINDER");

  return [...events];
}

export async function runScheduledNotificationDispatch(options?: {
  now?: Date;
  tenantId?: string;
  dryRun?: boolean;
}): Promise<ScheduledDispatchSummary> {
  const now = options?.now ?? new Date();
  const client = await db();
  const tenantWhere = options?.tenantId
    ? { id: options.tenantId }
    : {
        OR: [
          { telegramIntegrationSetting: { isEnabled: true } },
          { baleIntegrationSetting: { isEnabled: true } },
          { rubikaIntegrationSetting: { isEnabled: true } },
          { smsIntegrationSetting: { isEnabled: true } },
          ...(hasEmailIntegrationDelegate(client)
            ? [{ emailIntegrationSetting: { isEnabled: true } }]
            : []),
        ],
      };
  const tenants = await client.tenant.findMany({
    where: tenantWhere,
    select: { id: true, name: true },
    take: 500,
  });
  const details: ScheduledDispatchSummary["details"] = [];
  for (const tenant of tenants) {
    const [telegram, bale, rubika, sms, email] = await Promise.all([
      client.telegramIntegrationSetting.findUnique({
        where: { tenantId: tenant.id },
        select: {
          isEnabled: true,
          botTokenEncrypted: true,
          chatId: true,
          chatTitle: true,
          sendDailyReports: true,
          sendWeeklyReports: true,
          sendMonthlyReports: true,
          sendEventReminders: true,
          sendOutstandingBalanceReminders: true,
          dailyReportTime: true,
          weeklyReportDay: true,
          monthlyReportDay: true,
        },
      }),
      client.baleIntegrationSetting.findUnique({
        where: { tenantId: tenant.id },
        select: {
          isEnabled: true,
          botTokenEncrypted: true,
          chatId: true,
          chatTitle: true,
          sendDailyReports: true,
          sendWeeklyReports: true,
          sendMonthlyReports: true,
          sendEventReminders: true,
          sendOutstandingBalanceReminders: true,
          dailyReportTime: true,
          weeklyReportDay: true,
          monthlyReportDay: true,
        },
      }),
      client.rubikaIntegrationSetting.findUnique({
        where: { tenantId: tenant.id },
        select: {
          isEnabled: true,
          botTokenEncrypted: true,
          chatId: true,
          chatTitle: true,
          sendDailyReports: true,
          sendWeeklyReports: true,
          sendMonthlyReports: true,
          sendEventReminders: true,
          sendOutstandingBalanceReminders: true,
          dailyReportTime: true,
          weeklyReportDay: true,
          monthlyReportDay: true,
        },
      }),
      client.smsIntegrationSetting.findUnique({
        where: { tenantId: tenant.id },
        select: {
          isEnabled: true,
          provider: true,
          apiKeyEncrypted: true,
          senderNumber: true,
          managerMobile: true,
          sendToManager: true,
          sendDailyReports: true,
          sendWeeklyReports: true,
          sendMonthlyReports: true,
          sendEventReminders: true,
          sendOutstandingBalanceReminders: true,
        },
      }),
      hasEmailIntegrationDelegate(client)
        ? client.emailIntegrationSetting.findUnique({
            where: { tenantId: tenant.id },
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
              sendDailyReports: true,
              sendWeeklyReports: true,
              sendMonthlyReports: true,
              sendEventReminders: true,
              sendOutstandingBalanceReminders: true,
              dailyReportTime: true,
              weeklyReportDay: true,
              monthlyReportDay: true,
            },
          })
        : Promise.resolve(null),
    ]);
    const events = dueEventsForTenant(telegram, bale, rubika, sms, email, now);
    for (const eventType of events) {
      if (options?.dryRun) {
        details.push({
          tenantId: tenant.id,
          channel: "SYSTEM",
          eventType,
          status: "SKIPPED",
          error: "dryRun",
        });
        continue;
      }
      details.push(
        ...(await sendScheduledNotificationForTenant(
          tenant.id,
          eventType,
          now,
          { manual: false },
        )),
      );
    }

    if (!options?.dryRun) {
      try {
        details.push(
          ...(await dispatchTomorrowCustomerBalanceDueSmsReminders({
            tenantId: tenant.id,
            tenantName: tenant.name,
            now,
          })),
        );
      } catch (error) {
        details.push({
          tenantId: tenant.id,
          channel: "SMS",
          eventType: "CUSTOMER_BALANCE_DUE_TOMORROW",
          status: "FAILED",
          error: cleanSecretOrProviderError(error),
        });
      }
    }
  }
  return {
    ok: true,
    processedTenants: tenants.length,
    sent: details.filter((item) => item.status === "SENT").length,
    failed: details.filter((item) => item.status === "FAILED").length,
    skipped: details.filter((item) => item.status === "SKIPPED").length,
    details,
  };
}

export async function sendDailyReportForTenant(
  tenantId: string,
  now = new Date(),
) {
  return sendScheduledNotificationForTenant(tenantId, "DAILY_REPORT", now, {
    manual: true,
  });
}
export async function sendWeeklyReportForTenant(
  tenantId: string,
  now = new Date(),
) {
  return sendScheduledNotificationForTenant(tenantId, "WEEKLY_REPORT", now, {
    manual: true,
  });
}
export async function sendMonthlyReportForTenant(
  tenantId: string,
  now = new Date(),
) {
  return sendScheduledNotificationForTenant(tenantId, "MONTHLY_REPORT", now, {
    manual: true,
  });
}
export async function sendTomorrowEventReminderForTenant(
  tenantId: string,
  now = new Date(),
) {
  return sendScheduledNotificationForTenant(
    tenantId,
    "EVENT_REMINDER_TOMORROW",
    now,
    { manual: true },
  );
}
export async function sendOutstandingBalanceReminderForTenant(
  tenantId: string,
  now = new Date(),
) {
  return sendScheduledNotificationForTenant(
    tenantId,
    "OUTSTANDING_BALANCE_REMINDER",
    now,
    { manual: true },
  );
}
