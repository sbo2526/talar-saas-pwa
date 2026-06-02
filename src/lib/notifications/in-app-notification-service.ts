import "server-only";

import type { Prisma } from "@prisma/client";
import {
  formatContractTime,
  getPaidAmount,
  getRemainingAmount,
  toNumber,
} from "@/lib/contracts/display";
import {
  formatJalaliDateTime,
  getTodayJalali,
  jalaliToDate,
  toPersianDigits,
} from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import {
  getNotificationChannelLabel,
  getNotificationEventLabel,
} from "@/lib/notifications/constants";
import { getPrisma } from "@/lib/prisma";

export type InAppSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

export type HeaderNotificationItem = {
  id: string;
  type: string;
  severity: InAppSeverity;
  title: string;
  message: string;
  href: string | null;
  readAt: Date | null;
  dueAt: Date | null;
  createdAt: Date;
};

const managedTypes = [
  "EVENT_TODAY",
  "EVENT_TOMORROW",
  "EVENT_UPCOMING",
  "CONTRACT_OUTSTANDING_BALANCE",
  "NOTIFICATION_DELIVERY_FAILED",
  "TELEGRAM_SETTINGS_INCOMPLETE",
  "SMS_SETTINGS_INCOMPLETE",
  "DEMO_ENDING_SOON",
  "SUBSCRIPTION_ENDING_SOON",
  "ACCOUNT_INCOMPLETE",
  "HALL_INFO_INCOMPLETE",
  "PAYMENT_NEEDS_REVIEW",
  "EXPENSE_NEEDS_REVIEW",
] as const;

type NotificationDraft = {
  type: (typeof managedTypes)[number];
  severity: InAppSeverity;
  title: string;
  message: string;
  href?: string;
  entityType?: string;
  entityId?: string;
  fingerprint: string;
  dueAt?: Date;
  userId?: string;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getDayRange(offset: number) {
  const today = getTodayJalali();
  const start = addDays(jalaliToDate(today.year, today.month, today.day), offset);
  const end = addDays(start, 1);

  return { start, end };
}

function daysUntil(date: Date | null | undefined) {
  if (!date) return null;
  const today = getDayRange(0).start;
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
}

function isWithinDays(date: Date | null | undefined, days: number) {
  const remaining = daysUntil(date);
  return remaining !== null && remaining >= 0 && remaining <= days;
}

function activeContractWhere(tenantId: string): Prisma.ContractWhereInput {
  return {
    tenantId,
    status: { in: ["RESERVED", "CONFIRMED"] },
  };
}

function formatCustomerName(customer?: { fullName?: string | null } | null) {
  return customer?.fullName || "مشتری ثبت‌شده";
}

function buildEventMessage(contract: {
  eventTypeName: string | null;
  eventStartTime: string | null;
  customer: { fullName: string } | null;
}) {
  const eventType = contract.eventTypeName || "مراسم";
  const customerName = formatCustomerName(contract.customer);
  const eventTime = formatContractTime(contract.eventStartTime);

  return `مراسم ${eventType} برای ${customerName} در ساعت ${eventTime} برنامه‌ریزی شده است.`;
}

async function buildNotificationDrafts(tenantId: string, userId?: string) {
  const db = await getPrisma();
  const today = getDayRange(0);
  const tomorrow = getDayRange(1);
  const upcomingEnd = getDayRange(4).start;
  const tenDaysEnd = getDayRange(11).start;

  const [
    todayContracts,
    tomorrowContracts,
    upcomingContracts,
    outstandingContracts,
    failedLogs,
    telegramSetting,
    smsSetting,
    subscription,
    demoAccess,
    user,
    hallProfile,
    pendingPayments,
    pendingExpenses,
  ] = await Promise.all([
    db.contract.findMany({
      where: {
        ...activeContractWhere(tenantId),
        eventDate: { gte: today.start, lt: today.end },
      },
      include: { customer: { select: { fullName: true } } },
      orderBy: { eventStartTime: "asc" },
      take: 8,
    }),
    db.contract.findMany({
      where: {
        ...activeContractWhere(tenantId),
        eventDate: { gte: tomorrow.start, lt: tomorrow.end },
      },
      include: { customer: { select: { fullName: true } } },
      orderBy: { eventStartTime: "asc" },
      take: 8,
    }),
    db.contract.findMany({
      where: {
        ...activeContractWhere(tenantId),
        eventDate: { gte: addDays(today.start, 2), lt: upcomingEnd },
      },
      include: { customer: { select: { fullName: true } } },
      orderBy: [{ eventDate: "asc" }, { eventStartTime: "asc" }],
      take: 8,
    }),
    db.contract.findMany({
      where: {
        tenantId,
        status: { not: "CANCELED" },
        eventDate: { gte: today.start, lt: tenDaysEnd },
        remainingAmount: { gt: 0 },
      },
      include: {
        customer: { select: { fullName: true } },
        payments: { select: { amount: true, status: true, type: true } },
      },
      orderBy: { eventDate: "asc" },
      take: 10,
    }),
    db.notificationLog.findMany({
      where: {
        tenantId,
        status: "FAILED",
        channel: { in: ["TELEGRAM", "SMS"] },
        createdAt: { gte: addDays(today.start, -7) },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.telegramIntegrationSetting.findUnique({
      where: { tenantId },
      select: {
        isEnabled: true,
        botTokenEncrypted: true,
        chatId: true,
      },
    }),
    db.smsIntegrationSetting.findUnique({
      where: { tenantId },
      select: {
        isEnabled: true,
        provider: true,
        apiKeyEncrypted: true,
        managerMobile: true,
      },
    }),
    db.subscription.findUnique({
      where: { tenantId },
      select: {
        status: true,
        currentPeriodEnd: true,
      },
    }),
    userId
      ? db.demoAccess.findUnique({
          where: { userId },
          select: { status: true, expiresAt: true, tenantId: true },
        })
      : Promise.resolve(null),
    userId
      ? db.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            phone: true,
            nationalCode: true,
            address: true,
            postalCode: true,
          },
        })
      : Promise.resolve(null),
    db.tenantHallProfile.findUnique({
      where: { tenantId },
      select: {
        brandName: true,
        legalName: true,
        address: true,
        phone: true,
        mobile: true,
        licenseNumber: true,
      },
    }),
    db.payment.findMany({
      where: { tenantId, status: "PENDING" },
      include: {
        contract: { select: { contractNo: true } },
        customer: { select: { fullName: true } },
      },
      orderBy: { paidAt: "desc" },
      take: 3,
    }),
    db.expense.findMany({
      where: { tenantId, status: "PENDING" },
      orderBy: { occurredAt: "desc" },
      take: 3,
    }),
  ]);

  const drafts: NotificationDraft[] = [];

  for (const contract of todayContracts) {
    drafts.push({
      type: "EVENT_TODAY",
      severity: "WARNING",
      title: "مراسم امروز",
      message: buildEventMessage(contract),
      href: `/dashboard/contracts/${contract.id}`,
      entityType: "Contract",
      entityId: contract.id,
      fingerprint: `event-today:${contract.id}:${today.start.toISOString().slice(0, 10)}`,
      dueAt: contract.eventDate,
    });
  }

  for (const contract of tomorrowContracts) {
    drafts.push({
      type: "EVENT_TOMORROW",
      severity: "WARNING",
      title: "یادآوری مراسم فردا",
      message: `مراسم ${contract.eventTypeName || "ثبت‌شده"} برای ${formatCustomerName(contract.customer)} فردا برگزار می‌شود.`,
      href: `/dashboard/contracts/${contract.id}`,
      entityType: "Contract",
      entityId: contract.id,
      fingerprint: `event-tomorrow:${contract.id}:${tomorrow.start.toISOString().slice(0, 10)}`,
      dueAt: contract.eventDate,
    });
  }

  for (const contract of upcomingContracts) {
    drafts.push({
      type: "EVENT_UPCOMING",
      severity: "INFO",
      title: "مراسم نزدیک",
      message: `مراسم ${contract.eventTypeName || "ثبت‌شده"} برای ${formatCustomerName(contract.customer)} طی چند روز آینده برگزار می‌شود.`,
      href: `/dashboard/contracts/${contract.id}`,
      entityType: "Contract",
      entityId: contract.id,
      fingerprint: `event-upcoming:${contract.id}:${contract.eventDate.toISOString().slice(0, 10)}`,
      dueAt: contract.eventDate,
    });
  }

  for (const contract of outstandingContracts) {
    const paidAmount = getPaidAmount(contract.payments, contract.depositAmount);
    const remainingAmount = getRemainingAmount(contract.finalTotal, paidAmount);

    if (remainingAmount <= 0) {
      continue;
    }

    const eventDaysLeft = daysUntil(contract.eventDate);

    drafts.push({
      type: "CONTRACT_OUTSTANDING_BALANCE",
      severity: eventDaysLeft !== null && eventDaysLeft <= 3 ? "CRITICAL" : "WARNING",
      title: "مانده قرارداد قابل پیگیری",
      message: `قرارداد ${toPersianDigits(contract.contractNo)} برای ${formatCustomerName(contract.customer)} دارای مانده ${formatIRR(remainingAmount)} است.`,
      href: `/dashboard/contracts/${contract.id}`,
      entityType: "Contract",
      entityId: contract.id,
      fingerprint: `outstanding-balance:${contract.id}:${Math.round(remainingAmount)}`,
      dueAt: contract.eventDate,
    });
  }

  for (const log of failedLogs) {
    drafts.push({
      type: "NOTIFICATION_DELIVERY_FAILED",
      severity: "WARNING",
      title: "خطا در ارسال اعلان",
      message: `ارسال اعلان ${getNotificationChannelLabel(log.channel)} برای ${getNotificationEventLabel(log.eventType)} ناموفق بود.`,
      href: "/dashboard/settings/notification-logs",
      entityType: "NotificationLog",
      entityId: log.id,
      fingerprint: `notification-failed:${log.id}`,
      dueAt: log.createdAt,
    });
  }

  if (telegramSetting?.isEnabled && (!telegramSetting.botTokenEncrypted || !telegramSetting.chatId)) {
    drafts.push({
      type: "TELEGRAM_SETTINGS_INCOMPLETE",
      severity: "WARNING",
      title: "تنظیمات تلگرام ناقص است",
      message: "برای ارسال اعلان‌های تلگرام، توکن بات و شناسه گفتگو را کامل کنید.",
      href: "/dashboard/settings/telegram",
      entityType: "TelegramIntegrationSetting",
      fingerprint: "telegram-settings-incomplete",
    });
  }

  if (smsSetting?.isEnabled && (!smsSetting.provider || !smsSetting.apiKeyEncrypted || !smsSetting.managerMobile)) {
    drafts.push({
      type: "SMS_SETTINGS_INCOMPLETE",
      severity: "WARNING",
      title: "تنظیمات پیامک ناقص است",
      message: "برای ارسال پیامک‌های مدیریتی، ارائه‌دهنده، کلید API و شماره مدیر را کامل کنید.",
      href: "/dashboard/settings/sms",
      entityType: "SmsIntegrationSetting",
      fingerprint: "sms-settings-incomplete",
    });
  }

  if (
    demoAccess?.tenantId === tenantId &&
    demoAccess.status === "USED" &&
    isWithinDays(demoAccess.expiresAt, 7)
  ) {
    const daysLeft = Math.max(0, daysUntil(demoAccess.expiresAt) ?? 0);
    drafts.push({
      type: "DEMO_ENDING_SOON",
      severity: "WARNING",
      title: "پایان نزدیک دسترسی",
      message: `${formatPersianNumber(daysLeft)} روز تا پایان دسترسی دوره بررسی باقی مانده است.`,
      href: "/dashboard/account",
      entityType: "DemoAccess",
      fingerprint: `demo-ending-soon:${userId}:${demoAccess.expiresAt?.toISOString().slice(0, 10)}`,
      dueAt: demoAccess.expiresAt ?? undefined,
      userId,
    });
  }

  if (
    subscription &&
    ["TRIALING", "ACTIVE"].includes(subscription.status) &&
    isWithinDays(subscription.currentPeriodEnd, 7)
  ) {
    const daysLeft = Math.max(0, daysUntil(subscription.currentPeriodEnd) ?? 0);
    drafts.push({
      type: "SUBSCRIPTION_ENDING_SOON",
      severity: "WARNING",
      title: "پایان نزدیک اشتراک",
      message: `${formatPersianNumber(daysLeft)} روز تا پایان اشتراک فعلی باقی مانده است.`,
      href: "/purchase",
      entityType: "Subscription",
      fingerprint: `subscription-ending-soon:${subscription.currentPeriodEnd?.toISOString().slice(0, 10)}`,
      dueAt: subscription.currentPeriodEnd ?? undefined,
    });
  }

  if (user && (!user.phone || !user.nationalCode || !user.address || !user.postalCode)) {
    drafts.push({
      type: "ACCOUNT_INCOMPLETE",
      severity: "INFO",
      title: "اطلاعات حساب ناقص است",
      message: "برای تکمیل حساب کاربری، اطلاعات شخصی خود را کامل کنید.",
      href: "/dashboard/account",
      entityType: "User",
      entityId: user.id,
      fingerprint: `account-incomplete:${user.id}`,
      userId,
    });
  }

  if (
    !hallProfile?.brandName ||
    !hallProfile.address ||
    (!hallProfile.phone && !hallProfile.mobile) ||
    !hallProfile.licenseNumber
  ) {
    drafts.push({
      type: "HALL_INFO_INCOMPLETE",
      severity: "INFO",
      title: "اطلاعات تالار ناقص است",
      message: "برای چاپ قرارداد و مدیریت حرفه‌ای، اطلاعات تالار را کامل کنید.",
      href: "/dashboard/hall-info",
      entityType: "TenantHallProfile",
      fingerprint: "hall-info-incomplete",
    });
  }

  for (const payment of pendingPayments) {
    drafts.push({
      type: "PAYMENT_NEEDS_REVIEW",
      severity: "WARNING",
      title: "دریافت نیازمند پیگیری",
      message: `دریافت ${formatIRR(toNumber(payment.amount))} برای ${payment.customer?.fullName ?? payment.contract?.contractNo ?? "یک پرونده"} در انتظار بررسی است.`,
      href: payment.contractId
        ? `/dashboard/contracts/${payment.contractId}`
        : `/dashboard/payments/${payment.id}`,
      entityType: "Payment",
      entityId: payment.id,
      fingerprint: `payment-review:${payment.id}:${payment.status}`,
      dueAt: payment.paidAt,
    });
  }

  for (const expense of pendingExpenses) {
    drafts.push({
      type: "EXPENSE_NEEDS_REVIEW",
      severity: "INFO",
      title: "هزینه نیازمند بررسی",
      message: `هزینه ${expense.title} به مبلغ ${formatIRR(toNumber(expense.amount))} در انتظار بررسی است.`,
      href: `/dashboard/expenses/${expense.id}`,
      entityType: "Expense",
      entityId: expense.id,
      fingerprint: `expense-review:${expense.id}:${expense.status}`,
      dueAt: expense.occurredAt,
    });
  }

  return drafts;
}

export async function syncInAppNotificationsForTenant(input: {
  tenantId: string;
  userId?: string;
}) {
  const db = await getPrisma();
  const drafts = await buildNotificationDrafts(input.tenantId, input.userId);
  const activeFingerprints = drafts.map((draft) => draft.fingerprint);
  const now = new Date();

  await Promise.all(
    drafts.map((draft) =>
      db.inAppNotification.upsert({
        where: {
          tenantId_fingerprint: {
            tenantId: input.tenantId,
            fingerprint: draft.fingerprint,
          },
        },
        create: {
          tenantId: input.tenantId,
          userId: draft.userId ?? null,
          type: draft.type,
          severity: draft.severity,
          title: draft.title,
          message: draft.message,
          href: draft.href ?? null,
          entityType: draft.entityType ?? null,
          entityId: draft.entityId ?? null,
          fingerprint: draft.fingerprint,
          dueAt: draft.dueAt ?? null,
        },
        update: {
          userId: draft.userId ?? null,
          severity: draft.severity,
          title: draft.title,
          message: draft.message,
          href: draft.href ?? null,
          entityType: draft.entityType ?? null,
          entityId: draft.entityId ?? null,
          dueAt: draft.dueAt ?? null,
        },
      }),
    ),
  );

  await db.inAppNotification.updateMany({
    where: {
      tenantId: input.tenantId,
      type: { in: [...managedTypes] },
      dismissedAt: null,
      fingerprint: { notIn: activeFingerprints.length ? activeFingerprints : ["__none__"] },
      OR: [{ userId: null }, ...(input.userId ? [{ userId: input.userId }] : [])],
    },
    data: { dismissedAt: now },
  });
}

export async function getHeaderNotifications(input: {
  tenantId: string;
  userId?: string;
  limit?: number;
}) {
  const db = await getPrisma();
  const ownerWhere = {
    tenantId: input.tenantId,
    dismissedAt: null,
    OR: [{ userId: null }, ...(input.userId ? [{ userId: input.userId }] : [])],
  } satisfies Prisma.InAppNotificationWhereInput;
  const [unreadCount, criticalCount, items] = await Promise.all([
    db.inAppNotification.count({
      where: { ...ownerWhere, readAt: null },
    }),
    db.inAppNotification.count({
      where: { ...ownerWhere, readAt: null, severity: "CRITICAL" },
    }),
    db.inAppNotification.findMany({
      where: ownerWhere,
      orderBy: [
        { readAt: "asc" },
        { dueAt: "asc" },
        { createdAt: "desc" },
      ],
      take: Math.max(input.limit ?? 10, 20),
    }),
  ]);
  const severityRank: Record<string, number> = {
    CRITICAL: 0,
    WARNING: 1,
    INFO: 2,
    SUCCESS: 3,
  };
  const sortedItems = [...items]
    .sort((a, b) => {
      if (Boolean(a.readAt) !== Boolean(b.readAt)) {
        return a.readAt ? 1 : -1;
      }

      const severityDiff =
        (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);

      if (severityDiff !== 0) {
        return severityDiff;
      }

      const aDue = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bDue = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;

      if (aDue !== bDue) {
        return aDue - bDue;
      }

      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, input.limit ?? 10);

  return {
    unreadCount,
    criticalCount,
    items: sortedItems as HeaderNotificationItem[],
  };
}

export async function markInAppNotificationRead(input: {
  tenantId: string;
  notificationId: string;
  userId?: string;
}) {
  const db = await getPrisma();

  await db.inAppNotification.updateMany({
    where: {
      id: input.notificationId,
      tenantId: input.tenantId,
      OR: [{ userId: null }, ...(input.userId ? [{ userId: input.userId }] : [])],
    },
    data: { readAt: new Date() },
  });
}

export async function markAllInAppNotificationsRead(input: {
  tenantId: string;
  userId?: string;
}) {
  const db = await getPrisma();

  await db.inAppNotification.updateMany({
    where: {
      tenantId: input.tenantId,
      dismissedAt: null,
      readAt: null,
      OR: [{ userId: null }, ...(input.userId ? [{ userId: input.userId }] : [])],
    },
    data: { readAt: new Date() },
  });
}

export async function dismissInAppNotification(input: {
  tenantId: string;
  notificationId: string;
  userId?: string;
}) {
  const db = await getPrisma();

  await db.inAppNotification.updateMany({
    where: {
      id: input.notificationId,
      tenantId: input.tenantId,
      OR: [{ userId: null }, ...(input.userId ? [{ userId: input.userId }] : [])],
    },
    data: { dismissedAt: new Date() },
  });
}

export function toHeaderNotificationView(item: HeaderNotificationItem) {
  return {
    id: item.id,
    type: item.type,
    severity: item.severity,
    title: item.title,
    message: item.message,
    href: item.href,
    isRead: Boolean(item.readAt),
    createdAtLabel: formatJalaliDateTime(item.createdAt),
    dueAtLabel: item.dueAt ? formatJalaliDateTime(item.dueAt) : null,
  };
}
