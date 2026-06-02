import "server-only";

import { formatJalaliDate } from "@/lib/date/jalali";
import { formatIRR } from "@/lib/formatters";
import { sendSmsMessage } from "@/lib/integrations/sms";
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
import { parseSmsRecipients } from "@/lib/notifications/recipient-utils";
import { formatHallAddress, formatCustomerSupportPhones } from "@/lib/notifications/support-contact";
import { stripDemoWordingFromNotificationText } from "@/lib/notifications/template-renderer";
import { getPrisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/secret-field";

type CustomerSmsEventType = Extract<
  NotificationEventType,
  | "CUSTOMER_CREATED"
  | "CONTRACT_CREATED"
  | "CONTRACT_STATUS_CHANGED"
  | "CONTRACT_CANCELED"
  | "PAYMENT_CREATED"
  | "POST_EVENT_INVOICE_DELIVERY_CUSTOMER"
  | "CUSTOMER_BALANCE_DUE_TOMORROW"
>;

type CustomerNotificationInput = {
  tenantId: string;
  eventType: CustomerSmsEventType;
  customerMobile?: string | null;
  customerName?: string | null;
  variables: Record<string, unknown>;
  relatedContractId?: string | null;
  relatedPaymentId?: string | null;
  relatedCustomerId?: string | null;
};

type TenantContactRow = {
  province: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  mobile: string | null;
};

type SmsSettingRow = {
  isEnabled: boolean;
  provider: string | null;
  apiKeyEncrypted: string | null;
  senderNumber: string | null;
  sendToCustomer: boolean;
  sendContractEvents: boolean;
  sendPaymentEvents: boolean;
  sendCustomerEvents: boolean;
};

type CustomerSmsClient = {
  smsIntegrationSetting: {
    findUnique(args: unknown): Promise<SmsSettingRow | null>;
    updateMany(args: unknown): Promise<unknown>;
  };
  contract: {
    findMany(args: unknown): Promise<CustomerBalanceDueContractRow[]>;
  };
  notificationLog: {
    findFirst(args: unknown): Promise<NotificationLogLookupRow | null>;
  };
  tenantHallProfile?: {
    findUnique(args: unknown): Promise<TenantContactRow | null>;
  };
};

type CustomerBalanceDueContractRow = {
  id: string;
  contractNo: string | null;
  eventTypeName: string | null;
  eventDate: Date | string | number | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
  finalTotal: unknown;
  remainingAmount: unknown;
  customerId: string;
  customer: { fullName: string | null; phone: string | null } | null;
  hall: { name: string | null; address?: string | null; city?: string | null; phone?: string | null } | null;
  salon: { name: string | null } | null;
};

type NotificationLogLookupRow = {
  id?: string;
  status?: string | null;
  errorMessage?: string | null;
};

async function getCustomerSmsClient() {
  return (await getPrisma()) as unknown as CustomerSmsClient;
}

function cleanError(error: unknown) {
  if (error instanceof Error) {
    if (/NOTIFICATION_SECRET_KEY|NEXTAUTH_SECRET|AUTH_SECRET/.test(error.message)) {
      return "کلید امنیتی ذخیره اطلاعات محرمانه تنظیم نشده است.";
    }

    return error.message.slice(0, 500) || "ارسال پیامک مشتری ناموفق بود.";
  }

  return "ارسال پیامک مشتری ناموفق بود.";
}

function text(value: unknown, fallback = "ثبت نشده") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized || fallback;
}

function getToggleName(eventType: CustomerSmsEventType): keyof SmsSettingRow | null {
  if (eventType === "CUSTOMER_CREATED") {
    return null;
  }

  if (
    eventType === "CONTRACT_CREATED" ||
    eventType === "CONTRACT_STATUS_CHANGED" ||
    eventType === "CONTRACT_CANCELED"
  ) {
    return "sendContractEvents";
  }

  if (eventType === "PAYMENT_CREATED" || eventType === "CUSTOMER_BALANCE_DUE_TOMORROW") {
    return "sendPaymentEvents";
  }

  if (eventType === "POST_EVENT_INVOICE_DELIVERY_CUSTOMER") {
    return null;
  }

  return null;
}


function optionalText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).replace(/\s+/g, " ").trim();
}

async function getTenantContactVariables(client: CustomerSmsClient, tenantId: string) {
  try {
    const profile = await client.tenantHallProfile?.findUnique({
      where: { tenantId },
      select: { province: true, city: true, address: true, phone: true, mobile: true },
    });
    const hallAddress = formatHallAddress([profile?.province, profile?.city, profile?.address]);
    const customerSupportPhone = formatCustomerSupportPhones([profile?.phone, profile?.mobile].filter(Boolean).join("، "));

    return {
      customerSupportPhone,
      supportPhone: customerSupportPhone,
      hallAddress,
      tenantAddress: hallAddress,
    };
  } catch {
    const customerSupportPhone = formatCustomerSupportPhones();

    return {
      customerSupportPhone,
      supportPhone: customerSupportPhone,
      hallAddress: "",
      tenantAddress: "",
    };
  }
}

function getSupportPhones(variables: Record<string, unknown>) {
  return formatCustomerSupportPhones(variables.customerSupportPhone ?? variables.supportPhone);
}

function getHallAddress(variables: Record<string, unknown>) {
  return optionalText(variables.hallAddress ?? variables.tenantAddress);
}

function contactAddressLine(variables: Record<string, unknown>) {
  const address = getHallAddress(variables);
  return address ? `آدرس تالار: ${address}` : "";
}

function contactLines(variables: Record<string, unknown>) {
  const addressLine = contactAddressLine(variables);
  return addressLine ? [addressLine] : [];
}

function money(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return formatIRR(value);
  }

  if (typeof value === "object" && value !== null && "toString" in value) {
    const numericValue = Number(value.toString());

    if (Number.isFinite(numericValue)) {
      return formatIRR(numericValue);
    }
  }

  return text(value);
}

function eventTimeRange(start: unknown, end: unknown) {
  const startText = text(start, "");
  const endText = text(end, "");

  if (startText && endText) {
    return `${startText} تا ${endText}`;
  }

  return startText || endText || "ثبت نشده";
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function notificationStatus(status: string | null | undefined): "SENT" | "FAILED" | "SKIPPED" {
  if (status === "SENT") return "SENT";
  if (status === "FAILED") return "FAILED";
  return "SKIPPED";
}

function buildCustomerSmsMessage(eventType: CustomerSmsEventType, variables: Record<string, unknown>) {
  const tenantName = text(variables.tenantName, "تالار");
  const customerName = text(variables.customerName, "مشتری گرامی");
  const supportPhone = getSupportPhones(variables);

  if (eventType === "CUSTOMER_CREATED") {
    return [
      `${customerName} عزیز، به خانواده ${tenantName} خوش آمدید.`,
      `از انتخاب ارزشمند شما برای میزبانی مراسم‌تان صمیمانه سپاسگزاریم.`,
      "اطلاعات شما با موفقیت ثبت شد و تیم ما از این لحظه با دقت و احترام، همراه شما خواهد بود.",
      `با آرزوی مراسمی باشکوه و خاطره‌انگیز؛ ${tenantName}`,
    ].join("\n");
  }

  if (eventType === "CONTRACT_CREATED") {
    return [
      `${customerName} عزیز، قرارداد مراسم شما با موفقیت در ${tenantName} ثبت شد.`,
      `شماره قرارداد: ${text(variables.contractNumber)}`,
      `مراسم: ${text(variables.eventType)}`,
      `تاریخ و ساعت: ${text(variables.eventDateFull ?? variables.eventDate)}، ${text(variables.eventTimeRange ?? variables.eventTime)}`,
      `محل برگزاری: ${text(variables.salonName)}`,
      `مبلغ قرارداد: ${money(variables.finalTotal)}`,
      `پرداخت‌شده: ${money(variables.paidAmount)}`,
      `مانده: ${money(variables.remainingAmount)}`,
      "",
      `لطفاً اطلاعات قرارداد را بررسی فرمایید. در صورت هرگونه مغایرت با شماره‌های ${supportPhone} تماس بگیرید.`,
      ...contactLines(variables),
      `با احترام؛ ${tenantName}`,
    ].join("\n");
  }

  if (eventType === "CONTRACT_CANCELED") {
    return [
      `${customerName} عزیز، قرارداد شما در ${tenantName} لغو شد.`,
      `شماره قرارداد: ${text(variables.contractNumber)}`,
      `مراسم: ${text(variables.eventType)}`,
      `تاریخ مراسم: ${text(variables.eventDateFull ?? variables.eventDate)}`,
      "",
      "این قرارداد از نظر مالی بسته شد و مانده قابل پرداخت آن صفر است.",
      `برای پیگیری بیعانه، وجه کنسلی یا هرگونه مغایرت، با شماره‌های ${supportPhone} تماس بگیرید.`,
      ...contactLines(variables),
      `امیدواریم در فرصتی دیگر افتخار میزبانی لحظه‌های زیبای شما را داشته باشیم؛ ${tenantName}`,
    ].join("\n");
  }

  if (eventType === "CONTRACT_STATUS_CHANGED") {
    return [
      `${customerName} عزیز، قرارداد شما در ${tenantName} با موفقیت نهایی شد.`,
      `شماره قرارداد: ${text(variables.contractNumber)}`,
      `مراسم: ${text(variables.eventType)}`,
      `تاریخ مراسم: ${text(variables.eventDateFull ?? variables.eventDate)}`,
      "",
      "از اینکه میزبانی مراسم ارزشمندتان را به ما سپردید، صمیمانه سپاسگزاریم.",
      "امیدواریم لحظه‌هایی آرام، باشکوه و ماندگار را در کنار عزیزانتان تجربه کرده باشید.",
      `با آرزوی روزهایی سرشار از شادی و مهر؛ ${tenantName}`,
    ].join("\n");
  }

  if (eventType === "PAYMENT_CREATED") {
    return [
      `${customerName} عزیز، پرداخت شما با موفقیت در ${tenantName} ثبت شد.`,
      `شماره قرارداد: ${text(variables.contractNumber)}`,
      `مبلغ پرداختی: ${money(variables.paymentAmount)}`,
      `روش پرداخت: ${text(variables.paymentMethod)}`,
      `تاریخ ثبت: ${text(variables.paidAt)}`,
      `کد پیگیری: ${text(variables.trackingCode)}`,
      `مانده قرارداد: ${money(variables.remainingAmount)}`,
      "",
      `سپاس از اعتماد و همراهی شما؛ ${tenantName}`,
    ].join("\n");
  }

  if (eventType === "CUSTOMER_BALANCE_DUE_TOMORROW") {
    return [
      `${customerName} عزیز، یادآوری محترمانه ${tenantName}: تا برگزاری مراسم شما زمان کوتاهی باقی مانده است.`,
      `شماره قرارداد: ${text(variables.contractNumber)}`,
      `مراسم: ${text(variables.eventType)}`,
      `تاریخ و ساعت: ${text(variables.eventDateFull ?? variables.eventDate)}، ${text(variables.eventTimeRange ?? variables.eventTime)}`,
      "",
      "برای تکمیل هماهنگی‌های نهایی و آماده‌سازی هرچه شایسته‌تر مراسم، لطفاً بابت تسویه کامل قرارداد اقدام فرمایید.",
      `اگر پرداخت انجام شده یا نیاز به هماهنگی دارید، با شماره‌های ${supportPhone} تماس بگیرید.`,
      ...contactLines(variables),
      `با احترام و آرزوی مراسمی باشکوه؛ ${tenantName}`,
    ].join("\n");
  }

  return [
    `${customerName} عزیز، صورتحساب مراسم شما در ${tenantName} آماده مشاهده است.`,
    `شماره قرارداد: ${text(variables.contractNumber)}`,
    `شماره صورتحساب: ${text(variables.invoiceNumber)}`,
    `مبلغ قابل پرداخت: ${money(variables.payableAmount)}`,
    "",
    "مشاهده و پیگیری صورتحساب:",
    `${text(variables.portalUrl)}`,
    "",
    `در صورت مشاهده مغایرت، با شماره‌های ${supportPhone} تماس بگیرید.`,
    ...contactLines(variables),
    `با احترام؛ ${tenantName}`,
  ].join("\n");
}

export async function dispatchTomorrowCustomerBalanceDueSmsReminders(input: {
  tenantId: string;
  tenantName: string;
  now?: Date;
}): Promise<Array<{
  tenantId: string;
  channel: "SMS";
  eventType: "CUSTOMER_BALANCE_DUE_TOMORROW";
  status: "SENT" | "FAILED" | "SKIPPED";
  error?: string;
}>> {
  const eventType = "CUSTOMER_BALANCE_DUE_TOMORROW" as const;
  const now = input.now ?? new Date();
  const today = startOfUtcDay(now);
  const reminderDate = addDays(today, 2);
  const reminderDateEnd = addDays(reminderDate, 1);
  const client = await getCustomerSmsClient();
  const results: Array<{
    tenantId: string;
    channel: "SMS";
    eventType: "CUSTOMER_BALANCE_DUE_TOMORROW";
    status: "SENT" | "FAILED" | "SKIPPED";
    error?: string;
  }> = [];

  const setting = await client.smsIntegrationSetting.findUnique({
    where: { tenantId: input.tenantId },
    select: {
      isEnabled: true,
      sendToCustomer: true,
      sendPaymentEvents: true,
      provider: true,
      apiKeyEncrypted: true,
      senderNumber: true,
      sendContractEvents: true,
      sendCustomerEvents: true,
    },
  });

  if (!setting?.isEnabled || !setting.sendToCustomer || !setting.sendPaymentEvents) {
    return results;
  }

  const contracts = await client.contract.findMany({
    where: {
      tenantId: input.tenantId,
      eventDate: { gte: reminderDate, lt: reminderDateEnd },
      status: { not: "CANCELED" },
      remainingAmount: { gt: 0 },
    },
    select: {
      id: true,
      contractNo: true,
      eventTypeName: true,
      eventDate: true,
      eventStartTime: true,
      eventEndTime: true,
      finalTotal: true,
      remainingAmount: true,
      customerId: true,
      customer: { select: { fullName: true, phone: true } },
      hall: { select: { name: true, city: true, address: true, phone: true } },
      salon: { select: { name: true } },
    },
    orderBy: [{ eventDate: "asc" }, { eventStartTime: "asc" }],
    take: 100,
  });

  for (const contract of contracts) {
    const alreadyHandled = await client.notificationLog.findFirst({
      where: {
        tenantId: input.tenantId,
        channel: "SMS",
        eventType,
        relatedContractId: contract.id,
        relatedCustomerId: contract.customerId,
        status: { in: ["QUEUED", "SENT", "FAILED"] },
        createdAt: { gte: today, lt: addDays(today, 1) },
      },
      select: { id: true, status: true, errorMessage: true },
      orderBy: { createdAt: "desc" },
    });

    if (alreadyHandled) {
      results.push({
        tenantId: input.tenantId,
        channel: "SMS",
        eventType,
        status: notificationStatus(alreadyHandled.status),
        error: alreadyHandled.errorMessage ?? "یادآوری تسویه این قرارداد امروز قبلاً پردازش شده است.",
      });
      continue;
    }

    await dispatchCustomerSmsNotification({
      tenantId: input.tenantId,
      eventType,
      customerMobile: contract.customer?.phone ?? null,
      customerName: contract.customer?.fullName ?? null,
      relatedContractId: contract.id,
      relatedCustomerId: contract.customerId,
      variables: {
        tenantName: input.tenantName,
        customerName: contract.customer?.fullName,
        contractNumber: contract.contractNo,
        eventType: contract.eventTypeName,
        eventDateFull: formatJalaliDate(contract.eventDate),
        eventTimeRange: eventTimeRange(contract.eventStartTime, contract.eventEndTime),
        hallName: contract.hall?.name,
        hallAddress: formatHallAddress([contract.hall?.city, contract.hall?.address]),
        salonName: contract.salon?.name,
        finalTotal: contract.finalTotal,
        remainingAmount: contract.remainingAmount,
      },
    });

    const latestLog = await client.notificationLog.findFirst({
      where: {
        tenantId: input.tenantId,
        channel: "SMS",
        eventType,
        relatedContractId: contract.id,
        relatedCustomerId: contract.customerId,
        createdAt: { gte: today, lt: addDays(today, 1) },
      },
      select: { id: true, status: true, errorMessage: true },
      orderBy: { createdAt: "desc" },
    });

    results.push({
      tenantId: input.tenantId,
      channel: "SMS",
      eventType,
      status: notificationStatus(latestLog?.status),
      error: latestLog?.errorMessage ?? undefined,
    });
  }

  return results;
}

export async function dispatchCustomerSmsNotification(
  input: CustomerNotificationInput,
): Promise<void> {
  try {
    if (!input.tenantId?.trim() || !isNotificationEventType(input.eventType)) {
      return;
    }

    const db = await getCustomerSmsClient();
    const eventType = input.eventType;
    const setting = await db.smsIntegrationSetting.findUnique({
      where: { tenantId: input.tenantId },
      select: {
        isEnabled: true,
        provider: true,
        apiKeyEncrypted: true,
        senderNumber: true,
        sendToCustomer: true,
        sendContractEvents: true,
        sendPaymentEvents: true,
        sendCustomerEvents: true,
      },
    });
    const tenantContactVariables = await getTenantContactVariables(db, input.tenantId);
    const variables = {
      ...tenantContactVariables,
      ...input.variables,
    };
    variables.customerSupportPhone = formatCustomerSupportPhones(
      input.variables.customerSupportPhone ?? input.variables.supportPhone ?? tenantContactVariables.customerSupportPhone,
    );
    variables.supportPhone = variables.customerSupportPhone;
    variables.hallAddress = optionalText(input.variables.hallAddress ?? input.variables.tenantAddress) || tenantContactVariables.hallAddress;
    variables.tenantAddress = variables.hallAddress;

    const message = stripDemoWordingFromNotificationText(buildCustomerSmsMessage(eventType, variables));
    const title = stripDemoWordingFromNotificationText(`پیام مشتری - ${getNotificationEventLabel(eventType)}`);
    const recipient = parseSmsRecipients(input.customerMobile).at(0) ?? null;

    const directCustomerDeliveryEnabled = eventType === "CUSTOMER_CREATED"
      ? Boolean(setting?.sendToCustomer || setting?.sendCustomerEvents)
      : Boolean(setting?.sendToCustomer);

    if (!setting?.isEnabled || !directCustomerDeliveryEnabled) {
      await createSkippedNotificationLog({
        tenantId: input.tenantId,
        channel: "SMS",
        eventType,
        recipient,
        recipientLabel: input.customerName ?? "مشتری",
        title,
        message: "ارسال پیامک مشتری در تنظیمات فعال نیست. برای پیام خوش‌آمدگویی، «ارسال مستقیم به مشتریان» یا «اعلان مشتریان» را فعال کنید.",
        relatedContractId: input.relatedContractId ?? null,
        relatedPaymentId: input.relatedPaymentId ?? null,
        relatedCustomerId: input.relatedCustomerId ?? null,
      });
      return;
    }

    const toggleName = getToggleName(eventType);
    if (toggleName && !setting[toggleName]) {
      await createSkippedNotificationLog({
        tenantId: input.tenantId,
        channel: "SMS",
        eventType,
        recipient,
        recipientLabel: input.customerName ?? "مشتری",
        title,
        message: "ارسال این نوع پیام مشتری در تنظیمات فعال نیست. برای پیام خوش‌آمدگویی، فعال بودن «ارسال مستقیم به مشتریان» کافی است.",
        relatedContractId: input.relatedContractId ?? null,
        relatedPaymentId: input.relatedPaymentId ?? null,
        relatedCustomerId: input.relatedCustomerId ?? null,
      });
      return;
    }

    if (!setting.provider || !setting.apiKeyEncrypted || !recipient) {
      await createSkippedNotificationLog({
        tenantId: input.tenantId,
        channel: "SMS",
        eventType,
        recipient: input.customerMobile ?? null,
        recipientLabel: input.customerName ?? "مشتری",
        title,
        message: "تنظیمات پیامک مشتری کامل نیست یا شماره مشتری معتبر نیست.",
        relatedContractId: input.relatedContractId ?? null,
        relatedPaymentId: input.relatedPaymentId ?? null,
        relatedCustomerId: input.relatedCustomerId ?? null,
      });
      return;
    }

    const log = await createNotificationLog({
      tenantId: input.tenantId,
      channel: "SMS",
      eventType,
      recipient,
      recipientLabel: input.customerName ?? "مشتری",
      title,
      message,
      status: "QUEUED",
      relatedContractId: input.relatedContractId ?? null,
      relatedPaymentId: input.relatedPaymentId ?? null,
      relatedCustomerId: input.relatedCustomerId ?? null,
    });

    let apiKey: string;
    try {
      apiKey = decryptSecret(setting.apiKeyEncrypted);
    } catch (error) {
      const messageText = cleanError(error);
      await markNotificationLogFailed(log.id, input.tenantId, messageText);
      await db.smsIntegrationSetting.updateMany({
        where: { tenantId: input.tenantId },
        data: { lastErrorAt: new Date(), lastErrorMessage: messageText },
      });
      return;
    }

    const sent = await sendSmsMessage({
      provider: setting.provider,
      apiKey,
      senderNumber: setting.senderNumber,
      receptor: recipient,
      message,
    });

    if (sent.ok) {
      await markNotificationLogSent(log.id, input.tenantId);
      await db.smsIntegrationSetting.updateMany({
        where: { tenantId: input.tenantId },
        data: { lastSuccessAt: new Date(), lastErrorMessage: null },
      });
      return;
    }

    await markNotificationLogFailed(log.id, input.tenantId, sent.error);
    await db.smsIntegrationSetting.updateMany({
      where: { tenantId: input.tenantId },
      data: { lastErrorAt: new Date(), lastErrorMessage: sent.error },
    });
  } catch {
    // پیام مشتری best-effort است و نباید عملیات اصلی تالار را شکست دهد.
  }
}
