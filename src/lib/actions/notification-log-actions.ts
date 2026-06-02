"use server";

import { revalidatePath } from "next/cache";
import type { NotificationLogActionState } from "@/lib/actions/notification-log-state";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { sendBaleMessage } from "@/lib/integrations/bale";
import { sendRubikaMessage } from "@/lib/integrations/rubika";
import { sendSmsMessage } from "@/lib/integrations/sms";
import { sendEmailMessage } from "@/lib/integrations/email";
import { sendTelegramMessage } from "@/lib/integrations/telegram";
import { stripDemoWordingFromNotificationText } from "@/lib/notifications/template-renderer";
import { getPrisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/secret-field";

type RetryLogRow = {
  id: string;
  tenantId: string;
  channel: string;
  eventType: string;
  recipient: string | null;
  recipientLabel: string | null;
  title: string | null;
  message: string;
  status: string;
};

type RetryBaleSettingRow = {
  isEnabled: boolean;
  botTokenEncrypted: string | null;
  chatId: string | null;
  chatTitle: string | null;
};

type RetryRubikaSettingRow = {
  isEnabled: boolean;
  botTokenEncrypted: string | null;
  chatId: string | null;
  chatTitle: string | null;
};

type RetryTelegramSettingRow = {
  isEnabled: boolean;
  botTokenEncrypted: string | null;
  chatId: string | null;
  chatTitle: string | null;
};

type RetrySmsSettingRow = {
  isEnabled: boolean;
  provider: string | null;
  apiKeyEncrypted: string | null;
  senderNumber: string | null;
  managerMobile: string | null;
};

type RetryEmailSettingRow = {
  isEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUsername: string | null;
  smtpPasswordEncrypted: string | null;
  fromEmail: string | null;
  fromName: string | null;
  managerEmails: string | null;
};

type NotificationLogActionClient = {
  notificationLog: {
    findFirst(args: unknown): Promise<RetryLogRow | null>;
    updateMany(args: unknown): Promise<unknown>;
  };
  telegramIntegrationSetting: {
    findUnique(args: unknown): Promise<RetryTelegramSettingRow | null>;
    updateMany(args: unknown): Promise<unknown>;
  };
  baleIntegrationSetting: {
    findUnique(args: unknown): Promise<RetryBaleSettingRow | null>;
    updateMany(args: unknown): Promise<unknown>;
  };
  rubikaIntegrationSetting: {
    findUnique(args: unknown): Promise<RetryRubikaSettingRow | null>;
    updateMany(args: unknown): Promise<unknown>;
  };
  smsIntegrationSetting: {
    findUnique(args: unknown): Promise<RetrySmsSettingRow | null>;
    updateMany(args: unknown): Promise<unknown>;
  };
  emailIntegrationSetting?: {
    findUnique(args: unknown): Promise<RetryEmailSettingRow | null>;
    updateMany(args: unknown): Promise<unknown>;
  } | null;
};

function hasRetryEmailDelegate(
  db: NotificationLogActionClient,
): db is NotificationLogActionClient & {
  emailIntegrationSetting: NonNullable<
    NotificationLogActionClient["emailIntegrationSetting"]
  >;
} {
  return Boolean(
    db.emailIntegrationSetting &&
    typeof db.emailIntegrationSetting.findUnique === "function" &&
    typeof db.emailIntegrationSetting.updateMany === "function",
  );
}

function revalidateLogPaths() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/notifications");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard/settings/telegram");
  revalidatePath("/dashboard/settings/bale");
  revalidatePath("/dashboard/settings/rubika");
  revalidatePath("/dashboard/settings/sms");
  revalidatePath("/dashboard/settings/email");
}

function cleanSecretError(error: unknown) {
  if (
    error instanceof Error &&
    /NOTIFICATION_SECRET_KEY|NEXTAUTH_SECRET|AUTH_SECRET/.test(error.message)
  ) {
    return "کلید امنیتی ذخیره اطلاعات محرمانه تنظیم نشده است.";
  }

  return "ارسال مجدد اعلان با خطا مواجه شد.";
}

async function loadRetryLog(
  db: NotificationLogActionClient,
  tenantId: string,
  logId: string,
) {
  return db.notificationLog.findFirst({
    where: { id: logId, tenantId },
    select: {
      id: true,
      tenantId: true,
      channel: true,
      eventType: true,
      recipient: true,
      recipientLabel: true,
      title: true,
      message: true,
      status: true,
    },
  });
}

export async function retryNotificationLogAction(
  _previousState: NotificationLogActionState,
  formData: FormData,
): Promise<NotificationLogActionState> {
  const membership = await requireTenantPermission("notifications.manage");
  const logId = String(formData.get("logId") ?? "").trim();

  if (!logId) {
    return { ok: false, message: "لاگ انتخاب‌شده معتبر نیست." };
  }

  const db = (await getPrisma()) as unknown as NotificationLogActionClient;
  const log = await loadRetryLog(db, membership.tenantId, logId);

  if (
    !log ||
    !["FAILED", "QUEUED"].includes(log.status) ||
    !log.message?.trim()
  ) {
    return {
      ok: false,
      message: "فقط پیام‌های ناموفق یا در صف قابل ارسال مجدد هستند.",
    };
  }

  const retryMessage = stripDemoWordingFromNotificationText(log.message);
  const retryTitle = log.title
    ? stripDemoWordingFromNotificationText(log.title)
    : log.title;
  if (!retryMessage) {
    return { ok: false, message: "متن اعلان برای ارسال مجدد معتبر نیست." };
  }

  await db.notificationLog.updateMany({
    where: { id: log.id, tenantId: membership.tenantId },
    data: { message: retryMessage, title: retryTitle },
  });

  if (log.channel === "EMAIL") {
    if (!hasRetryEmailDelegate(db)) {
      const errorMessage =
        "زیرساخت ایمیل هنوز در Prisma Client یا دیتابیس آماده نیست.";
      await db.notificationLog.updateMany({
        where: { id: log.id, tenantId: membership.tenantId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage,
          attemptCount: { increment: 1 },
        },
      });
      revalidateLogPaths();
      return { ok: false, message: errorMessage };
    }

    const setting = await db.emailIntegrationSetting.findUnique({
      where: { tenantId: membership.tenantId },
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
      },
    });
    const recipient =
      log.recipient ||
      setting?.managerEmails
        ?.split(/\n|,|،|;|؛/)
        .map((item) => item.trim())
        .find(Boolean);
    if (
      !setting?.isEnabled ||
      !setting.smtpHost ||
      !setting.smtpPort ||
      !setting.fromEmail ||
      !recipient
    ) {
      const errorMessage = "تنظیمات ایمیل برای ارسال مجدد کامل نیست.";
      await db.notificationLog.updateMany({
        where: { id: log.id, tenantId: membership.tenantId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage,
          attemptCount: { increment: 1 },
        },
      });
      revalidateLogPaths();
      return { ok: false, message: errorMessage };
    }
    let smtpPassword: string | null = null;
    if (setting.smtpPasswordEncrypted) {
      try {
        smtpPassword = decryptSecret(setting.smtpPasswordEncrypted);
      } catch (error) {
        const errorMessage = cleanSecretError(error);
        await db.notificationLog.updateMany({
          where: { id: log.id, tenantId: membership.tenantId },
          data: {
            status: "FAILED",
            failedAt: new Date(),
            errorMessage,
            attemptCount: { increment: 1 },
          },
        });
        await db.emailIntegrationSetting.updateMany({
          where: { tenantId: membership.tenantId },
          data: { lastErrorAt: new Date(), lastErrorMessage: errorMessage },
        });
        revalidateLogPaths();
        return { ok: false, message: errorMessage };
      }
    }
    const result = await sendEmailMessage({
      smtpHost: setting.smtpHost,
      smtpPort: setting.smtpPort,
      smtpSecure: setting.smtpSecure,
      smtpUsername: setting.smtpUsername,
      smtpPassword,
      fromEmail: setting.fromEmail,
      fromName: setting.fromName,
      to: recipient,
      subject: retryTitle || "اعلان مدیریت تالار",
      text: retryMessage,
    });
    if (result.ok) {
      await db.notificationLog.updateMany({
        where: { id: log.id, tenantId: membership.tenantId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          failedAt: null,
          errorMessage: null,
          attemptCount: { increment: 1 },
        },
      });
      await db.emailIntegrationSetting.updateMany({
        where: { tenantId: membership.tenantId },
        data: { lastSuccessAt: new Date(), lastErrorMessage: null },
      });
      revalidateLogPaths();
      return { ok: true, message: "ایمیل با موفقیت دوباره ارسال شد." };
    }
    await db.notificationLog.updateMany({
      where: { id: log.id, tenantId: membership.tenantId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage: result.error,
        attemptCount: { increment: 1 },
      },
    });
    await db.emailIntegrationSetting.updateMany({
      where: { tenantId: membership.tenantId },
      data: { lastErrorAt: new Date(), lastErrorMessage: result.error },
    });
    revalidateLogPaths();
    return {
      ok: false,
      message: result.error || "ارسال مجدد ایمیل ناموفق بود.",
    };
  }

  if (log.channel === "SMS") {
    const setting = await db.smsIntegrationSetting.findUnique({
      where: { tenantId: membership.tenantId },
      select: {
        isEnabled: true,
        provider: true,
        apiKeyEncrypted: true,
        senderNumber: true,
        managerMobile: true,
      },
    });
    const receptor = log.recipient || setting?.managerMobile;
    if (
      !setting?.isEnabled ||
      !setting.provider ||
      !setting.apiKeyEncrypted ||
      !receptor
    ) {
      const errorMessage = "تنظیمات پیامک برای ارسال مجدد کامل نیست.";
      await db.notificationLog.updateMany({
        where: { id: log.id, tenantId: membership.tenantId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage,
          attemptCount: { increment: 1 },
        },
      });
      revalidateLogPaths();
      return { ok: false, message: errorMessage };
    }
    let apiKey: string;
    try {
      apiKey = decryptSecret(setting.apiKeyEncrypted);
    } catch (error) {
      const errorMessage = cleanSecretError(error);
      await db.notificationLog.updateMany({
        where: { id: log.id, tenantId: membership.tenantId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage,
          attemptCount: { increment: 1 },
        },
      });
      await db.smsIntegrationSetting.updateMany({
        where: { tenantId: membership.tenantId },
        data: { lastErrorAt: new Date(), lastErrorMessage: errorMessage },
      });
      revalidateLogPaths();
      return { ok: false, message: errorMessage };
    }
    const result = await sendSmsMessage({
      provider: setting.provider,
      apiKey,
      senderNumber: setting.senderNumber,
      receptor,
      message: retryMessage,
    });
    if (result.ok) {
      await db.notificationLog.updateMany({
        where: { id: log.id, tenantId: membership.tenantId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          failedAt: null,
          errorMessage: null,
          attemptCount: { increment: 1 },
        },
      });
      await db.smsIntegrationSetting.updateMany({
        where: { tenantId: membership.tenantId },
        data: { lastSuccessAt: new Date(), lastErrorMessage: null },
      });
      revalidateLogPaths();
      return { ok: true, message: "پیامک با موفقیت دوباره ارسال شد." };
    }
    await db.notificationLog.updateMany({
      where: { id: log.id, tenantId: membership.tenantId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage: result.error,
        attemptCount: { increment: 1 },
      },
    });
    await db.smsIntegrationSetting.updateMany({
      where: { tenantId: membership.tenantId },
      data: { lastErrorAt: new Date(), lastErrorMessage: result.error },
    });
    revalidateLogPaths();
    return {
      ok: false,
      message: result.error || "ارسال مجدد پیامک ناموفق بود.",
    };
  }

  if (log.channel === "BALE") {
    const setting = await db.baleIntegrationSetting.findUnique({
      where: { tenantId: membership.tenantId },
      select: {
        isEnabled: true,
        botTokenEncrypted: true,
        chatId: true,
        chatTitle: true,
      },
    });

    if (!setting?.isEnabled || !setting.botTokenEncrypted || !setting.chatId) {
      const errorMessage = "تنظیمات بله برای ارسال مجدد کامل نیست.";
      await db.notificationLog.updateMany({
        where: { id: log.id, tenantId: membership.tenantId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage,
          attemptCount: { increment: 1 },
        },
      });
      revalidateLogPaths();
      return { ok: false, message: errorMessage };
    }

    let botToken: string;
    try {
      botToken = decryptSecret(setting.botTokenEncrypted);
    } catch (error) {
      const errorMessage = cleanSecretError(error);
      await db.notificationLog.updateMany({
        where: { id: log.id, tenantId: membership.tenantId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage,
          attemptCount: { increment: 1 },
        },
      });
      await db.baleIntegrationSetting.updateMany({
        where: { tenantId: membership.tenantId },
        data: { lastErrorAt: new Date(), lastErrorMessage: errorMessage },
      });
      revalidateLogPaths();
      return { ok: false, message: errorMessage };
    }

    const result = await sendBaleMessage({
      botToken,
      chatId: setting.chatId,
      text: retryMessage,
    });

    if (result.ok) {
      await db.notificationLog.updateMany({
        where: { id: log.id, tenantId: membership.tenantId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          failedAt: null,
          errorMessage: null,
          attemptCount: { increment: 1 },
        },
      });
      await db.baleIntegrationSetting.updateMany({
        where: { tenantId: membership.tenantId },
        data: { lastSuccessAt: new Date(), lastErrorMessage: null },
      });
      revalidateLogPaths();
      return { ok: true, message: "اعلان بله با موفقیت دوباره ارسال شد." };
    }

    await db.notificationLog.updateMany({
      where: { id: log.id, tenantId: membership.tenantId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage: result.error,
        attemptCount: { increment: 1 },
      },
    });
    await db.baleIntegrationSetting.updateMany({
      where: { tenantId: membership.tenantId },
      data: { lastErrorAt: new Date(), lastErrorMessage: result.error },
    });
    revalidateLogPaths();
    return {
      ok: false,
      message: result.error || "ارسال مجدد اعلان بله ناموفق بود.",
    };
  }

  if (log.channel === "RUBIKA") {
    const setting = await db.rubikaIntegrationSetting.findUnique({
      where: { tenantId: membership.tenantId },
      select: {
        isEnabled: true,
        botTokenEncrypted: true,
        chatId: true,
        chatTitle: true,
      },
    });

    if (!setting?.isEnabled || !setting.botTokenEncrypted || !setting.chatId) {
      const errorMessage = "تنظیمات روبیکا برای ارسال مجدد کامل نیست.";
      await db.notificationLog.updateMany({
        where: { id: log.id, tenantId: membership.tenantId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage,
          attemptCount: { increment: 1 },
        },
      });
      revalidateLogPaths();
      return { ok: false, message: errorMessage };
    }

    let botToken: string;
    try {
      botToken = decryptSecret(setting.botTokenEncrypted);
    } catch (error) {
      const errorMessage = cleanSecretError(error);
      await db.notificationLog.updateMany({
        where: { id: log.id, tenantId: membership.tenantId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage,
          attemptCount: { increment: 1 },
        },
      });
      await db.rubikaIntegrationSetting.updateMany({
        where: { tenantId: membership.tenantId },
        data: { lastErrorAt: new Date(), lastErrorMessage: errorMessage },
      });
      revalidateLogPaths();
      return { ok: false, message: errorMessage };
    }

    const result = await sendRubikaMessage({
      botToken,
      chatId: setting.chatId,
      text: retryMessage,
    });

    if (result.ok) {
      await db.notificationLog.updateMany({
        where: { id: log.id, tenantId: membership.tenantId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          failedAt: null,
          errorMessage: null,
          attemptCount: { increment: 1 },
        },
      });
      await db.rubikaIntegrationSetting.updateMany({
        where: { tenantId: membership.tenantId },
        data: { lastSuccessAt: new Date(), lastErrorMessage: null },
      });
      revalidateLogPaths();
      return { ok: true, message: "اعلان روبیکا با موفقیت دوباره ارسال شد." };
    }

    await db.notificationLog.updateMany({
      where: { id: log.id, tenantId: membership.tenantId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage: result.error,
        attemptCount: { increment: 1 },
      },
    });
    await db.rubikaIntegrationSetting.updateMany({
      where: { tenantId: membership.tenantId },
      data: { lastErrorAt: new Date(), lastErrorMessage: result.error },
    });
    revalidateLogPaths();
    return {
      ok: false,
      message: result.error || "ارسال مجدد اعلان روبیکا ناموفق بود.",
    };
  }

  if (log.channel !== "TELEGRAM") {
    return {
      ok: false,
      message: "این کانال برای ارسال مجدد پشتیبانی نمی‌شود.",
    };
  }

  const setting = await db.telegramIntegrationSetting.findUnique({
    where: { tenantId: membership.tenantId },
    select: {
      isEnabled: true,
      botTokenEncrypted: true,
      chatId: true,
      chatTitle: true,
    },
  });

  if (!setting?.isEnabled || !setting.botTokenEncrypted || !setting.chatId) {
    const errorMessage = "تنظیمات تلگرام برای ارسال مجدد کامل نیست.";
    await db.notificationLog.updateMany({
      where: { id: log.id, tenantId: membership.tenantId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage,
        attemptCount: { increment: 1 },
      },
    });
    revalidateLogPaths();
    return { ok: false, message: errorMessage };
  }

  let botToken: string;
  try {
    botToken = decryptSecret(setting.botTokenEncrypted);
  } catch (error) {
    const errorMessage = cleanSecretError(error);
    await db.notificationLog.updateMany({
      where: { id: log.id, tenantId: membership.tenantId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorMessage,
        attemptCount: { increment: 1 },
      },
    });
    await db.telegramIntegrationSetting.updateMany({
      where: { tenantId: membership.tenantId },
      data: { lastErrorAt: new Date(), lastErrorMessage: errorMessage },
    });
    revalidateLogPaths();
    return { ok: false, message: errorMessage };
  }

  const result = await sendTelegramMessage({
    botToken,
    chatId: setting.chatId,
    text: retryMessage,
    parseMode: "HTML",
  });

  if (result.ok) {
    await db.notificationLog.updateMany({
      where: { id: log.id, tenantId: membership.tenantId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        failedAt: null,
        errorMessage: null,
        attemptCount: { increment: 1 },
      },
    });
    await db.telegramIntegrationSetting.updateMany({
      where: { tenantId: membership.tenantId },
      data: { lastSuccessAt: new Date(), lastErrorMessage: null },
    });
    revalidateLogPaths();
    return { ok: true, message: "اعلان تلگرام با موفقیت دوباره ارسال شد." };
  }

  await db.notificationLog.updateMany({
    where: { id: log.id, tenantId: membership.tenantId },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      errorMessage: result.error,
      attemptCount: { increment: 1 },
    },
  });
  await db.telegramIntegrationSetting.updateMany({
    where: { tenantId: membership.tenantId },
    data: { lastErrorAt: new Date(), lastErrorMessage: result.error },
  });
  revalidateLogPaths();

  return {
    ok: false,
    message: result.error || "ارسال مجدد اعلان تلگرام ناموفق بود.",
  };
}

export const retryTelegramNotificationLogAction = retryNotificationLogAction;
