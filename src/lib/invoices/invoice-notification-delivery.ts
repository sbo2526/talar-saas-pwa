import "server-only";

import { createAuditLog } from "@/lib/audit/audit-log-service";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/date/jalali";
import { formatIRR } from "@/lib/formatters";
import { sendSmsMessage } from "@/lib/integrations/sms";
import { sendTelegramMessage } from "@/lib/integrations/telegram";
import { parseSmsRecipients } from "@/lib/notifications/recipient-utils";
import { formatCustomerSupportPhones, formatHallAddress } from "@/lib/notifications/support-contact";
import { stripDemoWordingFromNotificationText } from "@/lib/notifications/template-renderer";
import { getPrisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/secret-field";

type DeliveryStatus = "SENT" | "FAILED" | "SKIPPED";
type DeliveryChannel = "SMS" | "TELEGRAM" | "IN_APP";
type DeliveryAudience = "CUSTOMER" | "MANAGER";

type DeliveryAttempt = {
  channel: DeliveryChannel;
  audience: DeliveryAudience;
  status: DeliveryStatus;
  logId?: string;
  message: string;
  error?: string;
};

type DeliverCustomerInvoiceNotificationsInput = {
  tenantId: string;
  invoiceId: string;
  actorUserId: string;
  portalPath: string;
  portalUrl: string;
};

type DeliveryInvoiceRow = {
  id: string;
  tenantId: string;
  contractId: string;
  invoiceNo: string;
  payableAmount: unknown;
  subtotal: unknown;
  status: string;
  contract: {
    contractNo: string;
    eventTypeName: string | null;
    eventDate: Date;
    eventStartTime: string | null;
    guestCount: number;
    hall: { name: string | null; address: string | null; city: string | null; phone: string | null } | null;
    salon: { name: string | null } | null;
    customer: {
      id: string;
      fullName: string;
      phone: string | null;
    };
    tenant: {
      name: string;
      hallProfile: {
        brandName: string | null;
        province: string | null;
        city: string | null;
        address: string | null;
        phone: string | null;
        mobile: string | null;
      } | null;
    };
  };
};

type SmsSettingRow = {
  isEnabled: boolean;
  provider: string | null;
  apiKeyEncrypted: string | null;
  senderNumber: string | null;
  managerMobile: string | null;
  sendToManager: boolean;
  sendToCustomer: boolean;
};

type TelegramSettingRow = {
  isEnabled: boolean;
  botTokenEncrypted: string | null;
  chatId: string | null;
  chatTitle: string | null;
};

type InvoiceDeliveryClient = {
  invoice: {
    findFirst(args: unknown): Promise<DeliveryInvoiceRow | null>;
  };
  smsIntegrationSetting: {
    findUnique(args: unknown): Promise<SmsSettingRow | null>;
    updateMany(args: unknown): Promise<unknown>;
  };
  telegramIntegrationSetting: {
    findUnique(args: unknown): Promise<TelegramSettingRow | null>;
    updateMany(args: unknown): Promise<unknown>;
  };
  notificationLog: {
    create(args: unknown): Promise<{ id: string }>;
    updateMany(args: unknown): Promise<unknown>;
  };
  tenantMember: {
    findMany(args: unknown): Promise<Array<{ userId: string }>>;
  };
  inAppNotification: {
    createMany(args: unknown): Promise<unknown>;
  };
};

const customerEventType = "POST_EVENT_INVOICE_DELIVERY_CUSTOMER";
const managerEventType = "POST_EVENT_INVOICE_DELIVERY_MANAGER";

async function getInvoiceDeliveryClient() {
  return (await getPrisma()) as unknown as InvoiceDeliveryClient;
}

function cleanDeliveryError(error: unknown) {
  if (error instanceof Error) {
    if (/NOTIFICATION_SECRET_KEY|NEXTAUTH_SECRET|AUTH_SECRET/.test(error.message)) {
      return "کلید امنیتی ذخیره اطلاعات محرمانه تنظیم نشده است.";
    }

    return error.message.slice(0, 500) || "ارسال اعلان صورتحساب ناموفق بود.";
  }

  return "ارسال اعلان صورتحساب ناموفق بود.";
}

function escapeTelegramHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function tenantDisplayName(invoice: DeliveryInvoiceRow) {
  return invoice.contract.tenant.hallProfile?.brandName || invoice.contract.tenant.name || "تالار";
}

function invoiceHallAddress(invoice: DeliveryInvoiceRow) {
  return formatHallAddress([
    invoice.contract.tenant.hallProfile?.province,
    invoice.contract.tenant.hallProfile?.city ?? invoice.contract.hall?.city,
    invoice.contract.tenant.hallProfile?.address ?? invoice.contract.hall?.address,
  ]);
}

function invoiceSupportPhones(invoice: DeliveryInvoiceRow) {
  return formatCustomerSupportPhones([
    invoice.contract.tenant.hallProfile?.phone,
    invoice.contract.tenant.hallProfile?.mobile,
    invoice.contract.hall?.phone,
  ].filter(Boolean).join("، "));
}

function buildCustomerSms(invoice: DeliveryInvoiceRow, portalUrl: string) {
  const tenantName = tenantDisplayName(invoice);
  const hallAddress = invoiceHallAddress(invoice);

  return stripDemoWordingFromNotificationText([
    `${invoice.contract.customer.fullName} عزیز، صورتحساب مراسم شما در ${tenantName} آماده شد.`,
    `قرارداد: ${invoice.contract.contractNo}`,
    `مراسم: ${invoice.contract.eventTypeName ?? "مراسم"}`,
    `تاریخ مراسم: ${formatJalaliDate(invoice.contract.eventDate)}`,
    `مبلغ قابل پرداخت: ${formatIRR(String(invoice.payableAmount))}`,
    "",
    "برای مشاهده جزئیات، پیگیری و ثبت نظر از لینک زیر استفاده فرمایید:",
    portalUrl,
    "",
    `در صورت نیاز به هماهنگی، با شماره‌های ${invoiceSupportPhones(invoice)} تماس بگیرید.`,
    hallAddress ? `آدرس تالار: ${hallAddress}` : "",
    `سپاس از اینکه افتخار میزبانی لحظه‌های ارزشمندتان را به ما سپردید؛ ${tenantName}`,
  ].filter(Boolean).join("\n"));
}

function buildManagerSms(invoice: DeliveryInvoiceRow) {
  return stripDemoWordingFromNotificationText([
    `صورتحساب بعد از مراسم ثبت شد | ${tenantDisplayName(invoice)}`,
    `مشتری: ${invoice.contract.customer.fullName}`,
    `قرارداد: ${invoice.contract.contractNo}`,
    `صورتحساب: ${invoice.invoiceNo}`,
    `مبلغ قابل پرداخت: ${formatIRR(String(invoice.payableAmount))}`,
    "لینک خام مشتری برای امنیت اطلاعات فقط برای خود مشتری ارسال می‌شود و در پیام مدیر ذخیره نمی‌شود.",
  ].join("\n"));
}

function buildManagerTelegram(invoice: DeliveryInvoiceRow) {
  return [
    `<b>صورتحساب بعد از مراسم ثبت شد | ${escapeTelegramHtml(tenantDisplayName(invoice))}</b>`,
    "",
    `مشتری: ${escapeTelegramHtml(invoice.contract.customer.fullName)}`,
    `قرارداد: ${escapeTelegramHtml(invoice.contract.contractNo)}`,
    `صورتحساب: ${escapeTelegramHtml(invoice.invoiceNo)}`,
    `مبلغ قابل پرداخت: ${escapeTelegramHtml(formatIRR(String(invoice.payableAmount)))}`,
    `زمان ثبت: ${escapeTelegramHtml(formatJalaliDateTime(new Date()))}`,
    "",
    "لینک خام مشتری فقط برای خود مشتری ارسال می‌شود و در پیام مدیر ذخیره نمی‌شود.",
  ].join("\n");
}

async function createLog(input: {
  tenantId: string;
  channel: "SMS" | "TELEGRAM";
  eventType: string;
  recipient?: string | null;
  recipientLabel?: string | null;
  title: string;
  message: string;
  logMessage?: string;
  relatedContractId: string;
  relatedCustomerId: string;
}) {
  const db = await getInvoiceDeliveryClient();
  return db.notificationLog.create({
    data: {
      tenantId: input.tenantId,
      channel: input.channel,
      eventType: input.eventType,
      recipient: input.recipient ?? null,
      recipientLabel: input.recipientLabel ?? null,
      title: input.title,
      message: input.logMessage ?? input.message,
      status: "QUEUED",
      relatedContractId: input.relatedContractId,
      relatedCustomerId: input.relatedCustomerId,
    },
  });
}

async function markLog(logId: string, tenantId: string, status: DeliveryStatus, errorMessage?: string) {
  const db = await getInvoiceDeliveryClient();
  await db.notificationLog.updateMany({
    where: { id: logId, tenantId },
    data: {
      status,
      sentAt: status === "SENT" ? new Date() : null,
      failedAt: status === "FAILED" ? new Date() : null,
      errorMessage: status === "FAILED" ? (errorMessage || "ارسال اعلان ناموفق بود.").slice(0, 2000) : null,
      attemptCount: { increment: 1 },
    },
  });
}

async function sendCustomerSms(invoice: DeliveryInvoiceRow, sms: SmsSettingRow | null, portalUrl: string): Promise<DeliveryAttempt> {
  if (!sms?.isEnabled || !sms.sendToCustomer) {
    return { channel: "SMS", audience: "CUSTOMER", status: "SKIPPED", message: "ارسال پیامک مشتری غیرفعال است." };
  }

  const receptor = invoice.contract.customer.phone;
  const message = buildCustomerSms(invoice, portalUrl);
  const log = await createLog({
    tenantId: invoice.tenantId,
    channel: "SMS",
    eventType: customerEventType,
    recipient: receptor,
    recipientLabel: invoice.contract.customer.fullName,
    title: "ارسال پیامک صورتحساب به مشتری",
    message,
    logMessage: `${tenantDisplayName(invoice)}: پیامک صورتحساب ${invoice.invoiceNo} با لینک خام مشتری ارسال می‌شود، اما لینک خام در لاگ ذخیره نمی‌شود.`,
    relatedContractId: invoice.contractId,
    relatedCustomerId: invoice.contract.customer.id,
  });

  if (!sms.provider || !sms.apiKeyEncrypted || !receptor) {
    const error = "تنظیمات پیامک مشتری کامل نیست یا شماره مشتری ثبت نشده است.";
    await markLog(log.id, invoice.tenantId, "FAILED", error);
    return { channel: "SMS", audience: "CUSTOMER", status: "FAILED", logId: log.id, message, error };
  }

  let apiKey: string;
  try {
    apiKey = decryptSecret(sms.apiKeyEncrypted);
  } catch (error) {
    const messageText = cleanDeliveryError(error);
    await markLog(log.id, invoice.tenantId, "FAILED", messageText);
    return { channel: "SMS", audience: "CUSTOMER", status: "FAILED", logId: log.id, message, error: messageText };
  }

  const result = await sendSmsMessage({
    provider: sms.provider,
    apiKey,
    senderNumber: sms.senderNumber,
    receptor,
    message,
  });

  if (result.ok) {
    await markLog(log.id, invoice.tenantId, "SENT");
    return { channel: "SMS", audience: "CUSTOMER", status: "SENT", logId: log.id, message };
  }

  await markLog(log.id, invoice.tenantId, "FAILED", result.error);
  return { channel: "SMS", audience: "CUSTOMER", status: "FAILED", logId: log.id, message, error: result.error };
}

async function sendManagerSms(invoice: DeliveryInvoiceRow, sms: SmsSettingRow | null): Promise<DeliveryAttempt> {
  if (!sms?.isEnabled || !sms.sendToManager) {
    return { channel: "SMS", audience: "MANAGER", status: "SKIPPED", message: "ارسال پیامک مدیر غیرفعال است." };
  }

  const message = buildManagerSms(invoice);
  const recipients = parseSmsRecipients(sms.managerMobile);

  if (!sms.provider || !sms.apiKeyEncrypted || recipients.length === 0) {
    const log = await createLog({
      tenantId: invoice.tenantId,
      channel: "SMS",
      eventType: managerEventType,
      recipient: sms.managerMobile,
      recipientLabel: "شماره‌های مالک/مدیر",
      title: "اطلاع‌رسانی ارسال صورتحساب به مدیر",
      message,
      relatedContractId: invoice.contractId,
      relatedCustomerId: invoice.contract.customer.id,
    });
    const error = "تنظیمات پیامک مدیر کامل نیست.";
    await markLog(log.id, invoice.tenantId, "FAILED", error);
    return { channel: "SMS", audience: "MANAGER", status: "FAILED", logId: log.id, message, error };
  }

  let apiKey: string;
  try {
    apiKey = decryptSecret(sms.apiKeyEncrypted);
  } catch (error) {
    const messageText = cleanDeliveryError(error);
    return { channel: "SMS", audience: "MANAGER", status: "FAILED", message, error: messageText };
  }

  let sentCount = 0;
  let failedCount = 0;
  let lastError: string | undefined;
  let lastLogId: string | undefined;

  for (const recipient of recipients) {
    const log = await createLog({
      tenantId: invoice.tenantId,
      channel: "SMS",
      eventType: managerEventType,
      recipient,
      recipientLabel: recipients.length > 1 ? "شماره مالک/مدیر" : "شماره مدیر",
      title: "اطلاع‌رسانی ارسال صورتحساب به مدیر",
      message,
      relatedContractId: invoice.contractId,
      relatedCustomerId: invoice.contract.customer.id,
    });
    lastLogId = log.id;

    const result = await sendSmsMessage({
      provider: sms.provider,
      apiKey,
      senderNumber: sms.senderNumber,
      receptor: recipient,
      message,
    });

    if (result.ok) {
      sentCount += 1;
      await markLog(log.id, invoice.tenantId, "SENT");
    } else {
      failedCount += 1;
      lastError = result.error;
      await markLog(log.id, invoice.tenantId, "FAILED", result.error);
    }
  }

  if (sentCount > 0) {
    return { channel: "SMS", audience: "MANAGER", status: "SENT", logId: lastLogId, message: `${message}
ارسال موفق مدیر: ${sentCount}، ناموفق: ${failedCount}` };
  }

  return { channel: "SMS", audience: "MANAGER", status: "FAILED", logId: lastLogId, message, error: lastError ?? "ارسال پیامک مدیر ناموفق بود." };
}

async function sendManagerTelegram(invoice: DeliveryInvoiceRow, telegram: TelegramSettingRow | null): Promise<DeliveryAttempt> {
  if (!telegram?.isEnabled) {
    return { channel: "TELEGRAM", audience: "MANAGER", status: "SKIPPED", message: "ارسال تلگرام مدیر غیرفعال است." };
  }

  const message = buildManagerTelegram(invoice);
  const log = await createLog({
    tenantId: invoice.tenantId,
    channel: "TELEGRAM",
    eventType: managerEventType,
    recipient: telegram.chatId,
    recipientLabel: telegram.chatTitle,
    title: "اطلاع‌رسانی تلگرام ارسال صورتحساب",
    message,
    relatedContractId: invoice.contractId,
    relatedCustomerId: invoice.contract.customer.id,
  });

  if (!telegram.botTokenEncrypted || !telegram.chatId) {
    const error = "تنظیمات تلگرام مدیر کامل نیست.";
    await markLog(log.id, invoice.tenantId, "FAILED", error);
    return { channel: "TELEGRAM", audience: "MANAGER", status: "FAILED", logId: log.id, message, error };
  }

  let botToken: string;
  try {
    botToken = decryptSecret(telegram.botTokenEncrypted);
  } catch (error) {
    const messageText = cleanDeliveryError(error);
    await markLog(log.id, invoice.tenantId, "FAILED", messageText);
    return { channel: "TELEGRAM", audience: "MANAGER", status: "FAILED", logId: log.id, message, error: messageText };
  }

  const result = await sendTelegramMessage({
    botToken,
    chatId: telegram.chatId,
    text: message,
    parseMode: "HTML",
  });

  if (result.ok) {
    await markLog(log.id, invoice.tenantId, "SENT");
    return { channel: "TELEGRAM", audience: "MANAGER", status: "SENT", logId: log.id, message };
  }

  await markLog(log.id, invoice.tenantId, "FAILED", result.error);
  return { channel: "TELEGRAM", audience: "MANAGER", status: "FAILED", logId: log.id, message, error: result.error };
}

async function updateIntegrationHealth(tenantId: string, attempts: DeliveryAttempt[]) {
  const db = await getInvoiceDeliveryClient();
  const smsFailed = attempts.find((attempt) => attempt.channel === "SMS" && attempt.status === "FAILED");
  const smsSent = attempts.some((attempt) => attempt.channel === "SMS" && attempt.status === "SENT");
  const telegramFailed = attempts.find((attempt) => attempt.channel === "TELEGRAM" && attempt.status === "FAILED");
  const telegramSent = attempts.some((attempt) => attempt.channel === "TELEGRAM" && attempt.status === "SENT");

  if (smsSent || smsFailed) {
    await db.smsIntegrationSetting.updateMany({
      where: { tenantId },
      data: smsSent
        ? { lastSuccessAt: new Date(), lastErrorMessage: null }
        : { lastErrorAt: new Date(), lastErrorMessage: smsFailed?.error ?? "ارسال پیامک صورتحساب ناموفق بود." },
    });
  }

  if (telegramSent || telegramFailed) {
    await db.telegramIntegrationSetting.updateMany({
      where: { tenantId },
      data: telegramSent
        ? { lastSuccessAt: new Date(), lastErrorMessage: null }
        : { lastErrorAt: new Date(), lastErrorMessage: telegramFailed?.error ?? "ارسال تلگرام صورتحساب ناموفق بود." },
    });
  }
}

async function notifyManagers(invoice: DeliveryInvoiceRow, attempts: DeliveryAttempt[]) {
  const db = await getInvoiceDeliveryClient();
  const members = await db.tenantMember.findMany({
    where: { tenantId: invoice.tenantId, role: { in: ["OWNER", "ADMIN"] } },
    select: { userId: true },
  });

  if (members.length === 0) {
    return;
  }

  const sentCount = attempts.filter((attempt) => attempt.status === "SENT").length;
  const failedCount = attempts.filter((attempt) => attempt.status === "FAILED").length;
  const skippedCount = attempts.filter((attempt) => attempt.status === "SKIPPED").length;
  const severity = failedCount > 0 ? "WARNING" : sentCount > 0 ? "SUCCESS" : "INFO";
  const title = failedCount > 0 ? "ارسال صورتحساب نیازمند بررسی است" : "فرآیند ارسال صورتحساب ثبت شد";
  const message = `صورتحساب ${invoice.invoiceNo} برای ${invoice.contract.customer.fullName}: ${sentCount} ارسال موفق، ${failedCount} ناموفق، ${skippedCount} نادیده‌گرفته‌شده.`;

  await db.inAppNotification.createMany({
    data: members.map((member) => ({
      tenantId: invoice.tenantId,
      userId: member.userId,
      type: "POST_EVENT_INVOICE_DELIVERY",
      severity,
      title,
      message,
      href: `/dashboard/invoices/${invoice.id}`,
      entityType: "INVOICE",
      entityId: invoice.id,
      fingerprint: `post-event-invoice-delivery-${invoice.id}-${member.userId}-${Date.now()}`,
    })),
    skipDuplicates: true,
  });
}

export function buildPublicInvoiceUrl(portalPath: string) {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_PUBLIC_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    (process.env.VERCEL_URL?.trim() ? `https://${process.env.VERCEL_URL.trim()}` : "");

  if (!configured) {
    return portalPath;
  }

  try {
    return new URL(portalPath, configured.replace(/\/+$/, "/")).toString();
  } catch {
    return portalPath;
  }
}

export async function deliverCustomerInvoiceNotifications(input: DeliverCustomerInvoiceNotificationsInput) {
  const db = await getInvoiceDeliveryClient();
  const invoice = await db.invoice.findFirst({
    where: { id: input.invoiceId, tenantId: input.tenantId },
    select: {
      id: true,
      tenantId: true,
      contractId: true,
      invoiceNo: true,
      payableAmount: true,
      subtotal: true,
      status: true,
      contract: {
        select: {
          contractNo: true,
          eventTypeName: true,
          eventDate: true,
          eventStartTime: true,
          guestCount: true,
          hall: { select: { name: true, city: true, address: true, phone: true } },
          salon: { select: { name: true } },
          customer: { select: { id: true, fullName: true, phone: true } },
          tenant: { select: { name: true, hallProfile: { select: { brandName: true, province: true, city: true, address: true, phone: true, mobile: true } } } },
        },
      },
    },
  });

  if (!invoice) {
    return {
      ok: false,
      status: "FAILED" as const,
      attempts: [] as DeliveryAttempt[],
      message: "صورتحساب برای ارسال پیدا نشد.",
    };
  }

  const [sms, telegram] = await Promise.all([
    db.smsIntegrationSetting.findUnique({
      where: { tenantId: input.tenantId },
      select: {
        isEnabled: true,
        provider: true,
        apiKeyEncrypted: true,
        senderNumber: true,
        managerMobile: true,
        sendToManager: true,
        sendToCustomer: true,
      },
    }),
    db.telegramIntegrationSetting.findUnique({
      where: { tenantId: input.tenantId },
      select: { isEnabled: true, botTokenEncrypted: true, chatId: true, chatTitle: true },
    }),
  ]);

  const attempts: DeliveryAttempt[] = [];
  attempts.push(await sendCustomerSms(invoice, sms, input.portalUrl));
  attempts.push(await sendManagerSms(invoice, sms));
  attempts.push(await sendManagerTelegram(invoice, telegram));

  await updateIntegrationHealth(input.tenantId, attempts);
  await notifyManagers(invoice, attempts);

  const customerDelivered = attempts.some((attempt) => attempt.audience === "CUSTOMER" && attempt.status === "SENT");
  const failedCount = attempts.filter((attempt) => attempt.status === "FAILED").length;
  const sentCount = attempts.filter((attempt) => attempt.status === "SENT").length;
  const skippedCount = attempts.filter((attempt) => attempt.status === "SKIPPED").length;

  await createAuditLog({
    tenantId: input.tenantId,
    userId: input.actorUserId,
    action: failedCount > 0 ? "INVOICE_NOTIFICATION_DELIVERY_REVIEW_REQUIRED" : "INVOICE_NOTIFICATION_DELIVERY_COMPLETED",
    entityType: "INVOICE",
    entityId: invoice.id,
    title: failedCount > 0 ? "ارسال صورتحساب نیازمند بررسی" : "ثبت ارسال صورتحساب",
    message: `ارسال صورتحساب ${invoice.invoiceNo}: ${sentCount} موفق، ${failedCount} ناموفق، ${skippedCount} نادیده‌گرفته‌شده.`,
    afterData: {
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      customerPortalTokenRedacted: true,
      customerDelivered,
      attempts: attempts.map((attempt) => ({
        channel: attempt.channel,
        audience: attempt.audience,
        status: attempt.status,
        logId: attempt.logId ?? null,
        error: attempt.error ?? null,
      })),
    },
    metadata: {
      taskId: "TALAR_POST_EVENT_INVOICE_FINAL_HARDENING_40",
      previousTaskId: "TALAR_CUSTOMER_NOTIFICATION_DELIVERY_36",
      rawTokenStored: false,
      managerChannelRawTokenRedacted: true,
      customerNotificationLogRawTokenRedacted: true,
      externalDeliveryAttemptedOutsideDatabaseTransaction: true,
    },
    href: `/dashboard/invoices/${invoice.id}`,
  });

  return {
    ok: failedCount === 0,
    status: customerDelivered ? "CUSTOMER_SENT" as const : failedCount > 0 ? "REVIEW_REQUIRED" as const : "NO_CUSTOMER_CHANNEL" as const,
    attempts,
    message: `ارسال صورتحساب ثبت شد: ${sentCount} موفق، ${failedCount} ناموفق، ${skippedCount} نادیده‌گرفته‌شده.`,
  };
}
