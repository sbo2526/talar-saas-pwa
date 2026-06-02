import type { InvoiceLineSourceType, InvoiceStatus, OwnerSettlementStatus } from "@prisma/client";
import { formatJalaliMonthTitle, getJalaliMonthRange } from "@/lib/date/jalali";
import { getPrisma } from "@/lib/prisma";
import {
  calculateOwnerMonthlySettlementPreview,
  getNextOwnerSettlementPeriod,
  getPreviousOwnerSettlementPeriod,
  normalizeOwnerSettlementPeriod,
} from "@/lib/owner-settlements/owner-monthly-settlement";
import { getOwnerFinancialControlAuditData } from "@/lib/owner-audit/owner-financial-control-audit";

const extraInvoiceLineSourceTypes: InvoiceLineSourceType[] = [
  "EXTRA_GUEST",
  "EXTRA_SERVICE",
  "DAMAGE",
  "TIME_EXTENSION",
  "OWNER_ADJUSTMENT",
];

const ownerVisibleInvoiceStatuses: InvoiceStatus[] = ["ISSUED", "SENT", "DISPUTED", "ACCEPTED", "SETTLED"];

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function statusCount<T extends string>(items: Array<{ status: T }>, status: T) {
  return items.filter((item) => item.status === status).length;
}

function getOwnerDashboardHealth(input: {
  hasActiveSetting: boolean;
  highRisk: number;
  heldWithoutInvoice: number;
  pendingAdjustments: number;
  existingSettlementStatus?: OwnerSettlementStatus | null;
}) {
  if (!input.hasActiveSetting) {
    return {
      tone: "danger" as const,
      label: "تنظیمات مالک ناقص است",
      description: "قبل از اتکا به سهم مالک، مدل بهره‌برداری و حداقل تضمین باید فعال باشد.",
    };
  }

  if (input.highRisk > 0 || input.heldWithoutInvoice > 0) {
    return {
      tone: "danger" as const,
      label: "نیازمند بررسی فوری مالک",
      description: "هشدار مالی پرریسک یا مراسم برگزارشده بدون فاکتور وجود دارد.",
    };
  }

  if (input.pendingAdjustments > 0) {
    return {
      tone: "warning" as const,
      label: "درخواست اصلاح باز است",
      description: "قبل از بستن ماه، درخواست‌های اصلاح فاکتور باید توسط مالک تعیین تکلیف شوند.",
    };
  }

  if (input.existingSettlementStatus === "PAID") {
    return {
      tone: "success" as const,
      label: "تسویه دوره پرداخت شده است",
      description: "برای این دوره گزارش تسویه ذخیره و پرداخت شده است.",
    };
  }

  if (input.existingSettlementStatus === "APPROVED") {
    return {
      tone: "success" as const,
      label: "تسویه دوره تأیید شده است",
      description: "گزارش این دوره تأیید شده و آماده پرداخت/ثبت پرداخت است.",
    };
  }

  return {
    tone: "warning" as const,
    label: "ماه مالی هنوز باز است",
    description: "گزارش دوره را مرور کنید و بعد از رفع هشدارها تسویه ماهانه را بسازید یا تأیید کنید.",
  };
}

export async function getOwnerFinancialOverviewData(input: {
  tenantId: string;
  year?: string | number | null;
  month?: string | number | null;
}) {
  const db = await getPrisma();
  const period = normalizeOwnerSettlementPeriod(input);
  const previous = getPreviousOwnerSettlementPeriod(period.year, period.month);
  const next = getNextOwnerSettlementPeriod(period.year, period.month);
  const { startDate, endDate } = getJalaliMonthRange(period.year, period.month);
  const periodLabel = formatJalaliMonthTitle(period.year, period.month);
  const setting = await db.ownerOperationSetting.findUnique({ where: { tenantId: input.tenantId } });
  const effectiveStartDate = setting?.effectiveFrom && setting.effectiveFrom > startDate ? setting.effectiveFrom : startDate;

  const [settlementPreview, auditData, invoices, feedbacks, pendingAdjustments, latestSettlements] = await Promise.all([
    calculateOwnerMonthlySettlementPreview({ tenantId: input.tenantId, year: period.year, month: period.month }),
    getOwnerFinancialControlAuditData({ tenantId: input.tenantId, year: period.year, month: period.month }),
    db.invoice.findMany({
      where: {
        tenantId: input.tenantId,
        status: { in: ownerVisibleInvoiceStatuses },
        contract: { is: { eventDate: { gte: effectiveStartDate, lt: endDate } } },
      },
      include: {
        contract: {
          select: {
            id: true,
            contractNo: true,
            eventDate: true,
            customer: { select: { fullName: true } },
          },
        },
        lines: {
          where: { sourceType: { in: extraInvoiceLineSourceTypes } },
          select: { sourceType: true, totalPrice: true },
        },
      },
      orderBy: [{ issuedAt: "desc" }],
      take: 120,
    }),
    db.customerInvoiceFeedback.findMany({
      where: {
        tenantId: input.tenantId,
        contract: { is: { eventDate: { gte: effectiveStartDate, lt: endDate } } },
      },
      select: {
        id: true,
        invoiceAccepted: true,
        hasExtraPayment: true,
        extraPaymentAmount: true,
        photographyPaidSeparately: true,
        photographyAmount: true,
        videographyPaidSeparately: true,
        videographyAmount: true,
        musicPaidSeparately: true,
        musicAmount: true,
        decorationPaidSeparately: true,
        decorationAmount: true,
        confidentialOwnerMessage: true,
      },
      take: 300,
    }),
    db.invoiceAdjustmentRequest.count({
      where: {
        tenantId: input.tenantId,
        status: "PENDING",
        invoice: { is: { contract: { is: { eventDate: { gte: effectiveStartDate, lt: endDate } } } } },
      },
    }),
    db.ownerMonthlySettlement.findMany({
      where: { tenantId: input.tenantId },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { generatedAt: "desc" }],
      take: 6,
    }),
  ]);

  const invoiceTotal = invoices.reduce((sum, invoice) => sum + toNumber(invoice.subtotal), 0);
  const payableTotal = invoices.reduce((sum, invoice) => sum + toNumber(invoice.payableAmount), 0);
  const extraGuestTotal = invoices.reduce((sum, invoice) => sum + toNumber(invoice.extraGuestTotal), 0);
  const extraServicesTotal = invoices.reduce((sum, invoice) => {
    const invoiceExtraTotal = invoice.lines.reduce((lineSum, line) => lineSum + toNumber(line.totalPrice), 0);
    return sum + invoiceExtraTotal;
  }, 0);

  const invoiceSummary = {
    count: invoices.length,
    invoiceTotal: roundMoney(invoiceTotal),
    payableTotal: roundMoney(payableTotal),
    extraGuestTotal: roundMoney(extraGuestTotal),
    extraServicesTotal: roundMoney(extraServicesTotal),
    issued: statusCount(invoices, "ISSUED"),
    sent: statusCount(invoices, "SENT"),
    disputed: statusCount(invoices, "DISPUTED"),
    accepted: statusCount(invoices, "ACCEPTED"),
    settled: statusCount(invoices, "SETTLED"),
  };

  const offInvoiceAmount = feedbacks.reduce((sum, feedback) => {
    const directPayment = feedback.hasExtraPayment ? toNumber(feedback.extraPaymentAmount) : 0;
    const separateServices =
      (feedback.photographyPaidSeparately ? toNumber(feedback.photographyAmount) : 0) +
      (feedback.videographyPaidSeparately ? toNumber(feedback.videographyAmount) : 0) +
      (feedback.musicPaidSeparately ? toNumber(feedback.musicAmount) : 0) +
      (feedback.decorationPaidSeparately ? toNumber(feedback.decorationAmount) : 0);
    return sum + directPayment + separateServices;
  }, 0);

  const feedbackSummary = {
    count: feedbacks.length,
    accepted: feedbacks.filter((feedback) => feedback.invoiceAccepted).length,
    disputed: feedbacks.filter((feedback) => !feedback.invoiceAccepted).length,
    offInvoicePaymentReports: feedbacks.filter((feedback) => feedback.hasExtraPayment).length,
    separateServiceReports: feedbacks.filter((feedback) =>
      feedback.photographyPaidSeparately || feedback.videographyPaidSeparately || feedback.musicPaidSeparately || feedback.decorationPaidSeparately,
    ).length,
    confidentialMessages: feedbacks.filter((feedback) => Boolean(feedback.confidentialOwnerMessage?.trim())).length,
    offInvoiceAmount: roundMoney(offInvoiceAmount),
  };

  const sentWithoutFeedback = auditData.flags.filter((flag) => flag.category === "SENT_WITHOUT_FEEDBACK").length;
  const notHeldNeedsCancellation = auditData.flags.filter((flag) => flag.category === "NOT_HELD_NEEDS_CANCELLATION").length;
  const separateServicePayments = auditData.flags.filter((flag) => flag.category === "SEPARATE_SERVICE_PAYMENT").length;
  const topRiskFlags = auditData.flags.slice(0, 5);
  const settlementReady = settlementPreview.ready && Boolean(settlementPreview.settlement);
  const existingSettlement = settlementPreview.ready ? settlementPreview.existingSettlement : null;
  const diagnosticSummary = settlementPreview.ready ? settlementPreview.settlement?.diagnosticSummary ?? null : null;

  const health = getOwnerDashboardHealth({
    hasActiveSetting: Boolean(setting?.isActive),
    highRisk: auditData.summary.highRisk,
    heldWithoutInvoice: auditData.summary.heldWithoutInvoice,
    pendingAdjustments,
    existingSettlementStatus: existingSettlement?.status,
  });

  const actionItems = [
    !setting?.isActive
      ? {
          tone: "danger" as const,
          title: "تنظیمات مدل مالک فعال نیست",
          description: "مدل بهره‌برداری، درصد سهم و حداقل تضمین را ثبت کنید تا محاسبه مالک قابل اتکا باشد.",
          href: "/dashboard/settings/owner-operation",
          cta: "تنظیم مدل مالک",
        }
      : null,
    auditData.summary.highRisk > 0
      ? {
          tone: "danger" as const,
          title: "هشدار مالی پرریسک وجود دارد",
          description: `${auditData.summary.highRisk} مورد ریسک زیاد در این دوره ثبت شده است. قبل از بستن ماه باید بررسی شود.`,
          href: `/dashboard/owner-financial-audit?year=${period.year}&month=${period.month}`,
          cta: "بررسی هشدارها",
        }
      : null,
    auditData.summary.heldWithoutInvoice > 0
      ? {
          tone: "danger" as const,
          title: "مراسم برگزارشده بدون فاکتور",
          description: `${auditData.summary.heldWithoutInvoice} مراسم برگزار شده اما هنوز صورتحساب ندارد. این همان سوراخی است که پول از آن فرار می‌کند.`,
          href: `/dashboard/owner-financial-audit?year=${period.year}&month=${period.month}`,
          cta: "مشاهده موارد",
        }
      : null,
    pendingAdjustments > 0
      ? {
          tone: "warning" as const,
          title: "درخواست اصلاح فاکتور باز است",
          description: `${pendingAdjustments} درخواست اصلاح هنوز تصمیم مالک ندارد.`,
          href: "/dashboard/invoices",
          cta: "رفتن به فاکتورها",
        }
      : null,
    diagnosticSummary && diagnosticSummary.count > 0
      ? {
          tone: diagnosticSummary.heldWithoutInvoice > 0 || diagnosticSummary.canceledInvoice > 0 ? "danger" as const : "warning" as const,
          title: "قرارداد خارج از تسویه وجود دارد",
          description: `${diagnosticSummary.count} قرارداد این دوره هنوز وارد تسویه مالک نشده است. دلیل هر مورد در صفحه تسویه نمایش داده می‌شود.`,
          href: `/dashboard/owner-settlements?year=${period.year}&month=${period.month}`,
          cta: "مشاهده دلایل",
        }
      : null,
    settlementReady && !existingSettlement
      ? {
          tone: "success" as const,
          title: "پیش‌نمایش تسویه آماده است",
          description: "می‌توانید بعد از کنترل هشدارها، گزارش تسویه ماهانه این دوره را بسازید.",
          href: `/dashboard/owner-settlements?year=${period.year}&month=${period.month}`,
          cta: "ساخت تسویه",
        }
      : null,
  ].filter(Boolean) as Array<{ tone: "danger" | "warning" | "success"; title: string; description: string; href: string; cta: string }>;

  return {
    period: { ...period, label: periodLabel, startDate, effectiveStartDate, ownerOperationStartDate: setting?.effectiveFrom ?? null, endDate },
    previous,
    next,
    setting,
    settlementPreview,
    existingSettlement,
    latestSettlements,
    invoiceSummary,
    feedbackSummary,
    audit: {
      ...auditData.summary,
      sentWithoutFeedback,
      notHeldNeedsCancellation,
      separateServicePayments,
      topRiskFlags,
    },
    pendingAdjustments,
    health,
    actionItems,
    generatedAt: new Date(),
  };
}
