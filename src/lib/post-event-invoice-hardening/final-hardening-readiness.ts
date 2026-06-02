import "server-only";

import { formatJalaliMonthTitle, getTodayJalali, jalaliToDate } from "@/lib/date/jalali";
import { defaultOwnerOperationStartDate } from "@/lib/owner-operation/owner-operation-settings";
import { getPrisma } from "@/lib/prisma";

export type PostEventInvoiceHardeningStatus = "READY" | "REVIEW_REQUIRED" | "BLOCKED";

export type PostEventInvoiceHardeningCheck = {
  id: string;
  title: string;
  description: string;
  status: PostEventInvoiceHardeningStatus;
  count: number;
  href: string;
};

const closedSettlementStatuses = ["APPROVED", "PAID"] as const;
const unresolvedContractStatuses = ["RESERVED", "CONFIRMED"] as const;
const monthlyCloseBlockedActions = [
  "MONTHLY_CLOSE_BLOCKED_POST_EVENT_CONFIRMATION",
  "MONTHLY_CLOSE_BLOCKED_POST_EVENT_INVOICE",
  "MONTHLY_CLOSE_BLOCKED_INVOICE_SEND",
  "MONTHLY_CLOSE_BLOCKED_CUSTOMER_INVOICE_FEEDBACK",
  "MONTHLY_CLOSE_BLOCKED_INVOICE_ADJUSTMENT_REQUEST",
  "MONTHLY_CLOSE_BLOCKED_INVOICE_ADJUSTMENT_APPLY",
  "MONTHLY_CLOSE_BLOCKED_OWNER_SETTLEMENT_REGENERATION",
] as const;

function maxStatus(statuses: PostEventInvoiceHardeningStatus[]): PostEventInvoiceHardeningStatus {
  if (statuses.includes("BLOCKED")) return "BLOCKED";
  if (statuses.includes("REVIEW_REQUIRED")) return "REVIEW_REQUIRED";
  return "READY";
}

function makeCheck(input: PostEventInvoiceHardeningCheck): PostEventInvoiceHardeningCheck {
  return input;
}

export function getPostEventInvoiceHardeningStatusStyle(status: PostEventInvoiceHardeningStatus) {
  if (status === "BLOCKED") return "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]";
  if (status === "REVIEW_REQUIRED") return "border-[#c7a15a]/38 bg-[#fff7e6] text-[#7a4a12]";
  return "border-[#17483f]/20 bg-[#f1fbf5] text-[#17483f]";
}

export const postEventInvoiceHardeningStatusLabels: Record<PostEventInvoiceHardeningStatus, string> = {
  READY: "آماده",
  REVIEW_REQUIRED: "نیازمند بررسی",
  BLOCKED: "مسدود",
};

export async function getPostEventInvoiceFinalHardeningData(input: { tenantId: string }) {
  const db = await getPrisma();
  const today = getTodayJalali();
  const todayStart = jalaliToDate(today.year, today.month, today.day);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ownerOperationSetting = await db.ownerOperationSetting.findUnique({
    where: { tenantId: input.tenantId },
    select: { effectiveFrom: true },
  });
  const postEventConfirmationStartDate = ownerOperationSetting?.effectiveFrom ?? defaultOwnerOperationStartDate;

  const [
    ownerSetting,
    pendingPostEventConfirmations,
    heldWithoutInvoice,
    notHeldNeedsCancellation,
    sentWithoutFeedback,
    disputedInvoices,
    pendingAdjustments,
    activeCustomerInvoiceLinks,
    closedPeriods,
    blockedAttemptsLast30Days,
    notificationReviewRequiredLast30Days,
    latestClosedSettlement,
  ] = await Promise.all([
    db.ownerOperationSetting.findFirst({
      where: { tenantId: input.tenantId, isActive: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        operationModel: true,
        ownerRevenueSharePercent: true,
        ownerCancellationSharePercent: true,
        monthlyMinimumGuarantee: true,
      },
    }),
    db.contract.count({
      where: {
        tenantId: input.tenantId,
        status: { in: [...unresolvedContractStatuses] },
        eventDate: { gte: postEventConfirmationStartDate, lt: todayStart },
        postEventConfirmation: { is: null },
      },
    }),
    db.postEventConfirmation.count({
      where: {
        tenantId: input.tenantId,
        status: "HELD",
        contract: { is: { eventDate: { gte: postEventConfirmationStartDate }, invoice: { is: null } } },
      },
    }),
    db.postEventConfirmation.count({
      where: {
        tenantId: input.tenantId,
        status: "NOT_HELD",
        cancellationRequired: true,
        contract: { is: { eventDate: { gte: postEventConfirmationStartDate }, status: { not: "CANCELED" } } },
      },
    }),
    db.invoice.count({
      where: {
        tenantId: input.tenantId,
        status: "SENT",
        contract: { is: { eventDate: { gte: postEventConfirmationStartDate } } },
        customerFeedbacks: { none: {} },
      },
    }),
    db.invoice.count({
      where: {
        tenantId: input.tenantId,
        status: "DISPUTED",
        contract: { is: { eventDate: { gte: postEventConfirmationStartDate } } },
      },
    }),
    db.invoiceAdjustmentRequest.count({ where: { tenantId: input.tenantId, status: "PENDING" } }),
    db.contractAccessLink.count({
      where: {
        tenantId: input.tenantId,
        kind: "CUSTOMER_INVOICE",
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    }),
    db.ownerMonthlySettlement.count({
      where: { tenantId: input.tenantId, status: { in: [...closedSettlementStatuses] } },
    }),
    db.auditLog.count({
      where: {
        tenantId: input.tenantId,
        action: { in: [...monthlyCloseBlockedActions] },
        createdAt: { gte: since },
      },
    }),
    db.auditLog.count({
      where: {
        tenantId: input.tenantId,
        action: "INVOICE_NOTIFICATION_DELIVERY_REVIEW_REQUIRED",
        createdAt: { gte: since },
      },
    }),
    db.ownerMonthlySettlement.findFirst({
      where: { tenantId: input.tenantId, status: { in: [...closedSettlementStatuses] } },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { updatedAt: "desc" }],
      select: { id: true, periodYear: true, periodMonth: true, periodLabel: true, status: true, finalOwnerPayable: true },
    }),
  ]);

  const checks: PostEventInvoiceHardeningCheck[] = [
    makeCheck({
      id: "owner-operation-setting",
      title: "تنظیمات مالک و پیمان فعال",
      description: ownerSetting
        ? "مدل بهره‌برداری مالک، درصد سهم مراسم، سهم کنسلی و حداقل تضمین ماهانه فعال است."
        : "بدون تنظیمات فعال مالک، تسویه ماهانه و سهم مالک مبنای قطعی ندارد.",
      status: ownerSetting ? "READY" : "BLOCKED",
      count: ownerSetting ? 1 : 0,
      href: "/dashboard/settings/owner-operation",
    }),
    makeCheck({
      id: "pending-post-event-confirmations",
      title: "مراسم‌های گذشته بدون تعیین وضعیت",
      description: "هیچ قرارداد گذشته‌ای نباید بدون پاسخ برگزار شده/برگزار نشده باقی بماند.",
      status: pendingPostEventConfirmations > 0 ? "BLOCKED" : "READY",
      count: pendingPostEventConfirmations,
      href: "/dashboard",
    }),
    makeCheck({
      id: "held-without-invoice",
      title: "برگزار شده بدون صورتحساب",
      description: "هر مراسم برگزارشده باید مستقیم به صورتحساب بعد از مراسم وصل شود.",
      status: heldWithoutInvoice > 0 ? "BLOCKED" : "READY",
      count: heldWithoutInvoice,
      href: "/dashboard/owner-financial-audit",
    }),
    makeCheck({
      id: "not-held-needs-cancellation",
      title: "برگزار نشده بدون تکمیل کنسلی",
      description: "مسیر برگزار نشده باید به کنسلی رسمی برسد تا سهم مالک از کنسلی گم نشود.",
      status: notHeldNeedsCancellation > 0 ? "REVIEW_REQUIRED" : "READY",
      count: notHeldNeedsCancellation,
      href: "/dashboard/owner-financial-audit",
    }),
    makeCheck({
      id: "customer-feedback-gap",
      title: "صورتحساب ارسال‌شده بدون پاسخ مشتری",
      description: "تا وقتی مشتری تأیید یا اعتراض نکند، ریسک اختلاف و پرداخت خارج از فاکتور باز است.",
      status: sentWithoutFeedback > 0 ? "REVIEW_REQUIRED" : "READY",
      count: sentWithoutFeedback,
      href: "/dashboard/owner-financial-audit",
    }),
    makeCheck({
      id: "disputed-invoices",
      title: "صورتحساب‌های دارای اختلاف",
      description: "اعتراض مشتری یا گزارش پرداخت خارج از فاکتور باید قبل از بستن ماه بررسی شود.",
      status: disputedInvoices > 0 ? "REVIEW_REQUIRED" : "READY",
      count: disputedInvoices,
      href: "/dashboard/owner-financial-audit",
    }),
    makeCheck({
      id: "pending-adjustments",
      title: "درخواست‌های اصلاح در انتظار مالک",
      description: "اصلاح فاکتور فقط بعد از تأیید مالک قابل اعمال است و نباید در وضعیت معلق بماند.",
      status: pendingAdjustments > 0 ? "REVIEW_REQUIRED" : "READY",
      count: pendingAdjustments,
      href: "/dashboard/owner-financial-audit",
    }),
    makeCheck({
      id: "monthly-close-lock",
      title: "قفل ماه مالی فعال شده",
      description: "وجود حداقل یک دوره بسته‌شده نشان می‌دهد مسیر قفل بعد از تأیید/پرداخت تسویه فعال است.",
      status: closedPeriods > 0 ? "READY" : "REVIEW_REQUIRED",
      count: closedPeriods,
      href: "/dashboard/monthly-close-lock",
    }),
    makeCheck({
      id: "blocked-attempts",
      title: "تلاش‌های مسدودشده ۳۰ روز اخیر",
      description: "وجود تلاش مسدودشده بد نیست؛ یعنی قفل کار کرده است. اما تعداد بالا باید بررسی شود.",
      status: blockedAttemptsLast30Days > 0 ? "REVIEW_REQUIRED" : "READY",
      count: blockedAttemptsLast30Days,
      href: "/dashboard/settings/activity",
    }),
    makeCheck({
      id: "notification-review-required",
      title: "ارسال اعلان نیازمند بررسی در ۳۰ روز اخیر",
      description: "خطای پیامک/تلگرام/ارسال مشتری باید از تنظیمات اعلان‌ها پیگیری شود.",
      status: notificationReviewRequiredLast30Days > 0 ? "REVIEW_REQUIRED" : "READY",
      count: notificationReviewRequiredLast30Days,
      href: "/dashboard/settings/notification-logs",
    }),
    makeCheck({
      id: "customer-invoice-links",
      title: "لینک‌های فعال صورتحساب مشتری",
      description: "لینک‌های مشتری با hash ذخیره می‌شوند و نمایش توکن خام در داشبورد حذف شده است.",
      status: "READY",
      count: activeCustomerInvoiceLinks,
      href: "/dashboard/invoices",
    }),
  ];

  return {
    taskId: "TALAR_POST_EVENT_INVOICE_FINAL_HARDENING_40",
    overallStatus: maxStatus(checks.map((check) => check.status)),
    generatedAt: new Date(),
    currentJalaliPeriod: {
      year: today.year,
      month: today.month,
      label: formatJalaliMonthTitle(today.year, today.month),
    },
    ownerSetting,
    latestClosedSettlement,
    summary: {
      ready: checks.filter((check) => check.status === "READY").length,
      reviewRequired: checks.filter((check) => check.status === "REVIEW_REQUIRED").length,
      blocked: checks.filter((check) => check.status === "BLOCKED").length,
    },
    checks,
  };
}
