import { getPrisma } from "@/lib/prisma";
import {
  isNotificationChannel,
  isNotificationEventType,
  isNotificationStatus,
} from "@/lib/notifications/constants";
import { parseDateLikeToDate } from "@/lib/date/jalali";
import { stripDemoWordingFromNotificationText } from "@/lib/notifications/template-renderer";

export type IntegrationSettingStatus = {
  isEnabled: boolean;
  hasSecret: boolean;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
};

export type NotificationLogFilters = {
  channel?: string;
  eventType?: string;
  status?: string;
  from?: string;
  to?: string;
  q?: string;
};

type TelegramSettingRow = {
  isEnabled: boolean;
  botTokenMasked: string | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
};

type BaleSettingRow = {
  isEnabled: boolean;
  botTokenMasked: string | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
};

type RubikaSettingRow = {
  isEnabled: boolean;
  botTokenMasked: string | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
};

type SmsSettingRow = {
  isEnabled: boolean;
  apiKeyMasked: string | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
};

type EmailSettingRow = {
  isEnabled: boolean;
  smtpHost: string | null;
  fromEmail: string | null;
  managerEmails: string | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
};

type SanitizableNotificationLog = {
  title?: string | null;
  message?: string | null;
  errorMessage?: string | null;
};

function sanitizeNotificationLogText<T extends SanitizableNotificationLog>(
  log: T,
): T {
  return {
    ...log,
    title: log.title
      ? stripDemoWordingFromNotificationText(log.title)
      : (log.title ?? null),
    message: stripDemoWordingFromNotificationText(log.message ?? ""),
    errorMessage: log.errorMessage
      ? stripDemoWordingFromNotificationText(log.errorMessage)
      : (log.errorMessage ?? null),
  };
}

type NotificationDelegate<Row = unknown> = {
  findUnique(args: unknown): Promise<Row | null>;
  findFirst(args: unknown): Promise<Row | null>;
  findMany(args: unknown): Promise<Row[]>;
  count(args: unknown): Promise<number>;
};

type OptionalNotificationDelegate<Row = unknown> =
  | NotificationDelegate<Row>
  | null
  | undefined;

type NotificationDataClient = {
  telegramIntegrationSetting: NotificationDelegate<TelegramSettingRow>;
  baleIntegrationSetting: OptionalNotificationDelegate<BaleSettingRow>;
  rubikaIntegrationSetting: OptionalNotificationDelegate<RubikaSettingRow>;
  smsIntegrationSetting: NotificationDelegate<SmsSettingRow>;
  emailIntegrationSetting: OptionalNotificationDelegate<EmailSettingRow>;
  notificationTemplate: NotificationDelegate;
  notificationLog: NotificationDelegate;
};

async function getNotificationDataClient() {
  return (await getPrisma()) as unknown as NotificationDataClient;
}

function isMissingNotificationProviderTableError(
  error: unknown,
  tableName: string,
) {
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

  if (maybeError.code !== "P2021") {
    return false;
  }

  return (
    modelName === tableName ||
    table.includes(tableName) ||
    message.includes(tableName) ||
    message.includes(`public.${tableName}`)
  );
}

function isNotificationDelegate<Row>(
  delegate: OptionalNotificationDelegate<Row>,
): delegate is NotificationDelegate<Row> {
  return Boolean(
    delegate &&
    typeof delegate.findUnique === "function" &&
    typeof delegate.findFirst === "function" &&
    typeof delegate.findMany === "function" &&
    typeof delegate.count === "function",
  );
}

async function findOptionalNotificationProviderSetting<Row>(
  tableName: string,
  delegate: OptionalNotificationDelegate<Row>,
  args: unknown,
) {
  if (!isNotificationDelegate(delegate)) {
    return null;
  }

  try {
    return await delegate.findUnique(args);
  } catch (error) {
    if (isMissingNotificationProviderTableError(error, tableName)) {
      return null;
    }

    throw error;
  }
}

export async function getEmailIntegrationStorageStatus() {
  const db = await getNotificationDataClient();
  const delegate = db.emailIntegrationSetting;

  if (!isNotificationDelegate(delegate)) {
    return {
      ready: false,
      message:
        "مدل ایمیل هنوز داخل Prisma Client فعلی بارگذاری نشده است. دستورهای prisma:migrate و prisma:generate را اجرا کنید و سرور dev را یک‌بار ری‌استارت کنید.",
    };
  }

  try {
    await delegate.findFirst({ select: { id: true }, take: 1 });
    return { ready: true, message: null };
  } catch (error) {
    if (
      isMissingNotificationProviderTableError(error, "EmailIntegrationSetting")
    ) {
      return {
        ready: false,
        message:
          "جدول تنظیمات ایمیل هنوز در دیتابیس ساخته نشده است. دستور prisma:migrate را اجرا کنید و سپس prisma:generate بزنید.",
      };
    }

    throw error;
  }
}

export function getIntegrationStatusLabel(
  setting: IntegrationSettingStatus | null,
) {
  if (!setting) {
    return "آماده تنظیم";
  }

  if (!setting.isEnabled) {
    return "غیرفعال";
  }

  if (!setting.hasSecret) {
    return "نیازمند تکمیل";
  }

  if (
    setting.lastErrorAt &&
    (!setting.lastSuccessAt ||
      setting.lastErrorAt.getTime() >= setting.lastSuccessAt.getTime())
  ) {
    return "خطا در اتصال";
  }

  if (setting.lastSuccessAt) {
    return "متصل";
  }

  return "آماده تست";
}

export async function getNotificationSettingsOverview(tenantId: string) {
  const db = await getNotificationDataClient();

  const [
    telegram,
    bale,
    rubika,
    sms,
    email,
    templateCount,
    logCount,
    failedLogCount,
  ] = await Promise.all([
    db.telegramIntegrationSetting.findUnique({
      where: { tenantId },
      select: {
        isEnabled: true,
        botTokenMasked: true,
        lastSuccessAt: true,
        lastErrorAt: true,
        lastErrorMessage: true,
      },
    }),
    findOptionalNotificationProviderSetting(
      "BaleIntegrationSetting",
      db.baleIntegrationSetting,
      {
        where: { tenantId },
        select: {
          isEnabled: true,
          botTokenMasked: true,
          lastSuccessAt: true,
          lastErrorAt: true,
          lastErrorMessage: true,
        },
      },
    ),
    findOptionalNotificationProviderSetting(
      "RubikaIntegrationSetting",
      db.rubikaIntegrationSetting,
      {
        where: { tenantId },
        select: {
          isEnabled: true,
          botTokenMasked: true,
          lastSuccessAt: true,
          lastErrorAt: true,
          lastErrorMessage: true,
        },
      },
    ),
    db.smsIntegrationSetting.findUnique({
      where: { tenantId },
      select: {
        isEnabled: true,
        apiKeyMasked: true,
        lastSuccessAt: true,
        lastErrorAt: true,
        lastErrorMessage: true,
      },
    }),
    findOptionalNotificationProviderSetting(
      "EmailIntegrationSetting",
      db.emailIntegrationSetting,
      {
        where: { tenantId },
        select: {
          isEnabled: true,
          smtpHost: true,
          fromEmail: true,
          managerEmails: true,
          lastSuccessAt: true,
          lastErrorAt: true,
          lastErrorMessage: true,
        },
      },
    ),
    db.notificationTemplate.count({ where: { tenantId } }),
    db.notificationLog.count({ where: { tenantId } }),
    db.notificationLog.count({ where: { tenantId, status: "FAILED" } }),
  ]);

  const telegramStatus = telegram
    ? {
        isEnabled: Boolean(telegram.isEnabled),
        hasSecret: Boolean(telegram.botTokenMasked),
        lastSuccessAt: telegram.lastSuccessAt ?? null,
        lastErrorAt: telegram.lastErrorAt ?? null,
        lastErrorMessage: telegram.lastErrorMessage ?? null,
      }
    : null;
  const baleStatus = bale
    ? {
        isEnabled: Boolean(bale.isEnabled),
        hasSecret: Boolean(bale.botTokenMasked),
        lastSuccessAt: bale.lastSuccessAt ?? null,
        lastErrorAt: bale.lastErrorAt ?? null,
        lastErrorMessage: bale.lastErrorMessage ?? null,
      }
    : null;
  const rubikaStatus = rubika
    ? {
        isEnabled: Boolean(rubika.isEnabled),
        hasSecret: Boolean(rubika.botTokenMasked),
        lastSuccessAt: rubika.lastSuccessAt ?? null,
        lastErrorAt: rubika.lastErrorAt ?? null,
        lastErrorMessage: rubika.lastErrorMessage ?? null,
      }
    : null;
  const smsStatus = sms
    ? {
        isEnabled: Boolean(sms.isEnabled),
        hasSecret: Boolean(sms.apiKeyMasked),
        lastSuccessAt: sms.lastSuccessAt ?? null,
        lastErrorAt: sms.lastErrorAt ?? null,
        lastErrorMessage: sms.lastErrorMessage ?? null,
      }
    : null;
  const emailStatus = email
    ? {
        isEnabled: Boolean(email.isEnabled),
        hasSecret: Boolean(
          email.smtpHost && email.fromEmail && email.managerEmails,
        ),
        lastSuccessAt: email.lastSuccessAt ?? null,
        lastErrorAt: email.lastErrorAt ?? null,
        lastErrorMessage: email.lastErrorMessage ?? null,
      }
    : null;

  return {
    telegramStatus,
    baleStatus,
    rubikaStatus,
    smsStatus,
    emailStatus,
    templateCount,
    logCount,
    failedLogCount,
  };
}

export async function getTelegramIntegrationSetting(tenantId: string) {
  const db = await getNotificationDataClient();

  return db.telegramIntegrationSetting.findUnique({
    where: { tenantId },
    select: {
      isEnabled: true,
      botTokenMasked: true,
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
      sendEventReminders: true,
      sendOutstandingBalanceReminders: true,
      dailyReportTime: true,
      weeklyReportDay: true,
      monthlyReportDay: true,
      lastTestAt: true,
      lastSuccessAt: true,
      lastErrorAt: true,
      lastErrorMessage: true,
      updatedAt: true,
    },
  });
}

export async function getBaleIntegrationSetting(tenantId: string) {
  const db = await getNotificationDataClient();

  return findOptionalNotificationProviderSetting(
    "BaleIntegrationSetting",
    db.baleIntegrationSetting,
    {
      where: { tenantId },
      select: {
        isEnabled: true,
        botTokenMasked: true,
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
        sendEventReminders: true,
        sendOutstandingBalanceReminders: true,
        dailyReportTime: true,
        weeklyReportDay: true,
        monthlyReportDay: true,
        lastTestAt: true,
        lastSuccessAt: true,
        lastErrorAt: true,
        lastErrorMessage: true,
        updatedAt: true,
      },
    },
  );
}

export async function getRubikaIntegrationSetting(tenantId: string) {
  const db = await getNotificationDataClient();

  return findOptionalNotificationProviderSetting(
    "RubikaIntegrationSetting",
    db.rubikaIntegrationSetting,
    {
      where: { tenantId },
      select: {
        isEnabled: true,
        botTokenMasked: true,
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
        sendEventReminders: true,
        sendOutstandingBalanceReminders: true,
        dailyReportTime: true,
        weeklyReportDay: true,
        monthlyReportDay: true,
        lastTestAt: true,
        lastSuccessAt: true,
        lastErrorAt: true,
        lastErrorMessage: true,
        updatedAt: true,
      },
    },
  );
}

export async function getSmsIntegrationSetting(tenantId: string) {
  const db = await getNotificationDataClient();

  return db.smsIntegrationSetting.findUnique({
    where: { tenantId },
    select: {
      isEnabled: true,
      provider: true,
      apiKeyMasked: true,
      senderNumber: true,
      managerMobile: true,
      sendToManager: true,
      sendToCustomer: true,
      sendContractEvents: true,
      sendPaymentEvents: true,
      sendExpenseEvents: true,
      sendCustomerEvents: true,
      sendDailyReports: true,
      sendWeeklyReports: true,
      sendMonthlyReports: true,
      sendEventReminders: true,
      sendOutstandingBalanceReminders: true,
      lastTestAt: true,
      lastSuccessAt: true,
      lastErrorAt: true,
      lastErrorMessage: true,
      updatedAt: true,
    },
  });
}

export async function getEmailIntegrationSetting(tenantId: string) {
  const db = await getNotificationDataClient();

  return findOptionalNotificationProviderSetting(
    "EmailIntegrationSetting",
    db.emailIntegrationSetting,
    {
      where: { tenantId },
      select: {
        isEnabled: true,
        smtpHost: true,
        smtpPort: true,
        smtpSecure: true,
        smtpUsername: true,
        smtpPasswordMasked: true,
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
        dailyReportTime: true,
        weeklyReportDay: true,
        monthlyReportDay: true,
        lastTestAt: true,
        lastSuccessAt: true,
        lastErrorAt: true,
        lastErrorMessage: true,
        updatedAt: true,
      },
    },
  );
}

export async function getNotificationTemplates(tenantId: string) {
  const db = await getNotificationDataClient();

  return db.notificationTemplate.findMany({
    where: { tenantId },
    select: {
      id: true,
      channel: true,
      eventType: true,
      title: true,
      body: true,
      isEnabled: true,
      updatedAt: true,
    },
    orderBy: [{ channel: "asc" }, { eventType: "asc" }],
  });
}

export async function getNotificationTemplateById(
  tenantId: string,
  templateId: string,
) {
  const db = await getNotificationDataClient();

  return db.notificationTemplate.findFirst({
    where: { id: templateId, tenantId },
    select: {
      id: true,
      channel: true,
      eventType: true,
      title: true,
      body: true,
      isEnabled: true,
      updatedAt: true,
      createdAt: true,
    },
  });
}

function buildLogWhere(tenantId: string, filters?: NotificationLogFilters) {
  const where: Record<string, unknown> = { tenantId };

  if (filters?.channel && isNotificationChannel(filters.channel)) {
    where.channel = filters.channel;
  }

  if (filters?.eventType && isNotificationEventType(filters.eventType)) {
    where.eventType = filters.eventType;
  }

  if (filters?.status && isNotificationStatus(filters.status)) {
    where.status = filters.status;
  }

  const from = parseDateLikeToDate(filters?.from ?? null);
  const to = parseDateLikeToDate(filters?.to ?? null);

  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1) } : {}),
    };
  }

  const q = filters?.q?.trim();
  if (q) {
    where.OR = [
      { recipient: { contains: q, mode: "insensitive" } },
      { recipientLabel: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
      { message: { contains: q, mode: "insensitive" } },
      { errorMessage: { contains: q, mode: "insensitive" } },
      { relatedContractId: { contains: q, mode: "insensitive" } },
      { relatedPaymentId: { contains: q, mode: "insensitive" } },
      { relatedExpenseId: { contains: q, mode: "insensitive" } },
      { relatedCustomerId: { contains: q, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function getNotificationLogs(
  tenantId: string,
  filters?: NotificationLogFilters,
) {
  const db = await getNotificationDataClient();
  const where = buildLogWhere(tenantId, filters);

  const logs = await db.notificationLog.findMany({
    where,
    select: {
      id: true,
      channel: true,
      eventType: true,
      recipient: true,
      recipientLabel: true,
      title: true,
      message: true,
      status: true,
      errorMessage: true,
      attemptCount: true,
      relatedContractId: true,
      relatedPaymentId: true,
      relatedExpenseId: true,
      relatedCustomerId: true,
      sentAt: true,
      failedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return logs.map(sanitizeNotificationLogText);
}

export async function getNotificationLogStats(
  tenantId: string,
  filters?: NotificationLogFilters,
) {
  const db = await getNotificationDataClient();
  const where = buildLogWhere(tenantId, filters);

  const [total, sent, failed, queued, skipped, canceled, latestSent] =
    await Promise.all([
      db.notificationLog.count({ where }),
      db.notificationLog.count({ where: { ...where, status: "SENT" } }),
      db.notificationLog.count({ where: { ...where, status: "FAILED" } }),
      db.notificationLog.count({ where: { ...where, status: "QUEUED" } }),
      db.notificationLog.count({ where: { ...where, status: "SKIPPED" } }),
      db.notificationLog.count({ where: { ...where, status: "CANCELED" } }),
      db.notificationLog.findFirst({
        where: { ...where, status: "SENT" },
        select: { sentAt: true, createdAt: true },
        orderBy: { sentAt: "desc" },
      }),
    ]);

  return { total, sent, failed, queued, skipped, canceled, latestSent };
}

export async function getNotificationLogById(tenantId: string, logId: string) {
  const db = await getNotificationDataClient();

  const log = await db.notificationLog.findFirst({
    where: { id: logId, tenantId },
    select: {
      id: true,
      channel: true,
      eventType: true,
      recipient: true,
      recipientLabel: true,
      title: true,
      message: true,
      status: true,
      errorMessage: true,
      attemptCount: true,
      relatedContractId: true,
      relatedPaymentId: true,
      relatedExpenseId: true,
      relatedCustomerId: true,
      sentAt: true,
      failedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return log ? sanitizeNotificationLogText(log) : null;
}
