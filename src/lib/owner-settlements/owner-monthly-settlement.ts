import type { InvoiceLineSourceType, OwnerOperationModel, OwnerSettlementCycle } from "@prisma/client";
import { calculateContractCancellationEstimate } from "@/lib/contracts/cancellation-policy";
import {
  dateToJalaliParts,
  formatJalaliDate,
  formatJalaliMonthTitle,
  getJalaliMonthRange,
  getTodayJalali,
} from "@/lib/date/jalali";
import { getPrisma } from "@/lib/prisma";

const extraInvoiceLineSourceTypes: InvoiceLineSourceType[] = [
  "EXTRA_GUEST",
  "EXTRA_SERVICE",
  "DAMAGE",
  "TIME_EXTENSION",
  "OWNER_ADJUSTMENT",
];

export const ownerSettlementStatusLabels = {
  DRAFT: "پیش‌نویس",
  APPROVED: "تأیید شده",
  PAID: "پرداخت شده",
} as const;

export function getOwnerSettlementStatusStyle(status: keyof typeof ownerSettlementStatusLabels) {
  if (status === "PAID") return "border-[#25a46d]/24 bg-[#f1fbf5] text-[#17483f]";
  if (status === "APPROVED") return "border-[#17483f]/20 bg-[#eaf6f2] text-[#17483f]";
  return "border-[#d8c08b]/70 bg-[#fff4d8] text-[#7d6841]";
}

export type OwnerSettlementDiagnosticReason =
  | "BEFORE_OWNER_OPERATION_START"
  | "POST_EVENT_CONFIRMATION_MISSING"
  | "HELD_BUT_INVOICE_MISSING"
  | "HELD_INVOICE_NOT_REQUIRED"
  | "INVOICE_CANCELED"
  | "NOT_HELD_WITHOUT_CANCELLATION"
  | "OTHER_NOT_PAYABLE_POLICY";

export const ownerSettlementDiagnosticReasonLabels: Record<OwnerSettlementDiagnosticReason, string> = {
  BEFORE_OWNER_OPERATION_START: "قبل از شروع محاسبات مالک",
  POST_EVENT_CONFIRMATION_MISSING: "بدون تعیین تکلیف بعد از مراسم",
  HELD_BUT_INVOICE_MISSING: "برگزار شده ولی بدون فاکتور",
  HELD_INVOICE_NOT_REQUIRED: "برگزار شده اما فاکتور برای آن الزامی نشده",
  INVOICE_CANCELED: "فاکتور لغو شده",
  NOT_HELD_WITHOUT_CANCELLATION: "عدم برگزاری بدون محاسبه کنسلی",
  OTHER_NOT_PAYABLE_POLICY: "خارج از قواعد قابل تسویه",
};

export function getOwnerSettlementDiagnosticReasonStyle(reason: OwnerSettlementDiagnosticReason) {
  if (reason === "HELD_BUT_INVOICE_MISSING" || reason === "INVOICE_CANCELED") {
    return "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]";
  }

  if (reason === "BEFORE_OWNER_OPERATION_START") {
    return "border-[#c7a15a]/38 bg-[#fff7e6] text-[#7a4a12]";
  }

  return "border-[#d8c08b]/64 bg-white/78 text-[#6d5f49]";
}

export function getDefaultOwnerSettlementPeriod() {
  const today = getTodayJalali();
  return { year: today.year, month: today.month };
}

export function normalizeOwnerSettlementPeriod(input: { year?: string | number | null; month?: string | number | null }) {
  const fallback = getDefaultOwnerSettlementPeriod();
  const year = Number(input.year);
  const month = Number(input.month);

  if (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    year >= 1200 &&
    year <= 1600 &&
    month >= 1 &&
    month <= 12
  ) {
    return { year, month };
  }

  return fallback;
}

function roundMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyString(value: number) {
  return roundMoney(value).toFixed(2);
}

function calculateFinalOwnerPayable(input: {
  operationModel: OwnerOperationModel;
  invoiceTotal: number;
  cancellationIncomeTotal: number;
  calculatedOwnerShare: number;
  monthlyMinimumGuarantee: number;
}) {
  if (input.operationModel === "OWNER_OPERATED") {
    const finalOwnerPayable = roundMoney(input.invoiceTotal + input.cancellationIncomeTotal);
    return {
      finalOwnerPayable,
      minimumGuaranteeApplied: false,
      minimumGuaranteeShortfall: 0,
    };
  }

  if (input.operationModel === "FIXED_RENT") {
    const finalOwnerPayable = roundMoney(input.monthlyMinimumGuarantee);
    return {
      finalOwnerPayable,
      minimumGuaranteeApplied: true,
      minimumGuaranteeShortfall: Math.max(0, finalOwnerPayable - input.calculatedOwnerShare),
    };
  }

  if (input.operationModel === "MANAGEMENT_CONTRACT_WITH_MINIMUM_GUARANTEE") {
    const calculatedOwnerShare = roundMoney(input.calculatedOwnerShare);
    const minimumGuarantee = roundMoney(input.monthlyMinimumGuarantee);
    const finalOwnerPayable = Math.max(calculatedOwnerShare, minimumGuarantee);

    return {
      finalOwnerPayable,
      minimumGuaranteeApplied: finalOwnerPayable === minimumGuarantee && minimumGuarantee > calculatedOwnerShare,
      minimumGuaranteeShortfall: Math.max(0, minimumGuarantee - calculatedOwnerShare),
    };
  }

  return {
    finalOwnerPayable: roundMoney(input.calculatedOwnerShare),
    minimumGuaranteeApplied: false,
    minimumGuaranteeShortfall: 0,
  };
}

function getOwnerSettlementDiagnosticReason(input: {
  eventDate: Date;
  status: string;
  invoice: { status: string } | null;
  postEventConfirmation: { status: string; invoiceRequired: boolean; cancellationRequired: boolean } | null;
  effectiveStartDate: Date;
}): OwnerSettlementDiagnosticReason | null {
  if (input.eventDate < input.effectiveStartDate) return "BEFORE_OWNER_OPERATION_START";

  if (input.invoice && input.invoice.status !== "CANCELED") return null;

  if (
    input.status === "CANCELED" ||
    (input.postEventConfirmation?.status === "NOT_HELD" && input.postEventConfirmation.cancellationRequired)
  ) {
    return null;
  }

  if (input.invoice?.status === "CANCELED") return "INVOICE_CANCELED";

  if (!input.postEventConfirmation) return "POST_EVENT_CONFIRMATION_MISSING";

  if (input.postEventConfirmation.status === "HELD" && input.postEventConfirmation.invoiceRequired) {
    return "HELD_BUT_INVOICE_MISSING";
  }

  if (input.postEventConfirmation.status === "HELD" && !input.postEventConfirmation.invoiceRequired) {
    return "HELD_INVOICE_NOT_REQUIRED";
  }

  if (input.postEventConfirmation.status === "NOT_HELD" && !input.postEventConfirmation.cancellationRequired) {
    return "NOT_HELD_WITHOUT_CANCELLATION";
  }

  return "OTHER_NOT_PAYABLE_POLICY";
}

export async function calculateOwnerMonthlySettlementPreview(input: {
  tenantId: string;
  year: number;
  month: number;
}) {
  const db = await getPrisma();
  const { startDate, endDate } = getJalaliMonthRange(input.year, input.month);
  const periodLabel = formatJalaliMonthTitle(input.year, input.month);

  const setting = await db.ownerOperationSetting.findUnique({
    where: { tenantId: input.tenantId },
  });

  if (!setting || !setting.isActive) {
    return {
      ready: false as const,
      reason: "OWNER_OPERATION_SETTING_INACTIVE_OR_MISSING",
      period: { year: input.year, month: input.month, label: periodLabel, startDate, effectiveStartDate: startDate, endDate },
      setting: null,
      settlement: null,
    };
  }

  const effectiveStartDate = setting.effectiveFrom > startDate ? setting.effectiveFrom : startDate;
  const isBeforeOwnerOperationStart = effectiveStartDate >= endDate;

  const [invoices, cancellationContracts, monthContracts, existingSettlement] = await Promise.all([
    isBeforeOwnerOperationStart
      ? Promise.resolve([])
      : db.invoice.findMany({
      where: {
        tenantId: input.tenantId,
        status: { notIn: ["CANCELED"] },
        contract: {
          is: { eventDate: { gte: effectiveStartDate, lt: endDate } },
        },
      },
      include: {
        contract: {
          select: {
            id: true,
            contractNo: true,
            title: true,
            eventDate: true,
            customer: { select: { fullName: true, phone: true } },
          },
        },
        lines: {
          where: { sourceType: { in: extraInvoiceLineSourceTypes } },
          select: { id: true, sourceType: true, name: true, quantity: true, totalPrice: true },
        },
      },
      orderBy: [{ contract: { eventDate: "asc" } }, { issuedAt: "asc" }],
    }),
    isBeforeOwnerOperationStart
      ? Promise.resolve([])
      : db.contract.findMany({
      where: {
        tenantId: input.tenantId,
        eventDate: { gte: effectiveStartDate, lt: endDate },
        OR: [
          { status: "CANCELED" },
          { postEventConfirmation: { is: { status: "NOT_HELD", cancellationRequired: true } } },
        ],
      },
      select: {
        id: true,
        contractNo: true,
        title: true,
        status: true,
        eventDate: true,
        updatedAt: true,
        finalTotal: true,
        depositAmount: true,
        customer: { select: { fullName: true, phone: true } },
        postEventConfirmation: { select: { id: true, confirmedAt: true, status: true, cancellationRequired: true, cancellationAmount: true, cancellationAmountManual: true } },
      },
      orderBy: [{ eventDate: "asc" }, { updatedAt: "asc" }],
    }),
    db.contract.findMany({
      where: {
        tenantId: input.tenantId,
        eventDate: { gte: startDate, lt: endDate },
      },
      select: {
        id: true,
        contractNo: true,
        title: true,
        status: true,
        eventDate: true,
        finalTotal: true,
        customer: { select: { fullName: true, phone: true } },
        invoice: { select: { id: true, invoiceNo: true, status: true, subtotal: true, payableAmount: true, issuedAt: true } },
        postEventConfirmation: { select: { id: true, confirmedAt: true, status: true, invoiceRequired: true, cancellationRequired: true } },
      },
      orderBy: [{ eventDate: "asc" }, { updatedAt: "asc" }],
    }),
    db.ownerMonthlySettlement.findUnique({
      where: {
        tenantId_periodYear_periodMonth: {
          tenantId: input.tenantId,
          periodYear: input.year,
          periodMonth: input.month,
        },
      },
    }),
  ]);

  const invoiceRows = invoices.map((invoice) => {
    const subtotal = toNumber(invoice.subtotal);
    const extraTotal = invoice.lines.reduce((sum, line) => sum + toNumber(line.totalPrice), 0);

    return {
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      invoiceStatus: invoice.status,
      contractId: invoice.contractId,
      contractNo: invoice.contract.contractNo,
      customerName: invoice.contract.customer.fullName,
      eventDate: invoice.contract.eventDate.toISOString(),
      eventDateLabel: formatJalaliDate(invoice.contract.eventDate),
      invoiceTotal: roundMoney(subtotal),
      extraServicesTotal: roundMoney(extraTotal),
      extraLines: invoice.lines.map((line) => ({
        id: line.id,
        sourceType: line.sourceType,
        name: line.name,
        quantity: line.quantity,
        totalPrice: roundMoney(toNumber(line.totalPrice)),
      })),
    };
  });

  const cancellationRows = cancellationContracts.map((contract) => {
    const estimate = calculateContractCancellationEstimate({
      eventDate: contract.eventDate,
      finalTotal: toNumber(contract.finalTotal),
      depositAmount: toNumber(contract.depositAmount),
      now: contract.postEventConfirmation?.confirmedAt ?? contract.updatedAt,
    });

    const manualAmount = contract.postEventConfirmation?.cancellationAmountManual
      ? roundMoney(toNumber(contract.postEventConfirmation.cancellationAmount))
      : null;

    return {
      contractId: contract.id,
      contractNo: contract.contractNo,
      contractStatus: contract.status,
      customerName: contract.customer.fullName,
      eventDate: contract.eventDate.toISOString(),
      eventDateLabel: formatJalaliDate(contract.eventDate),
      cancellationReferenceDate: (contract.postEventConfirmation?.confirmedAt ?? contract.updatedAt).toISOString(),
      finalTotal: roundMoney(toNumber(contract.finalTotal)),
      depositAmount: roundMoney(toNumber(contract.depositAmount)),
      penaltyPercent: estimate.penaltyPercent,
      penaltyAmount: manualAmount ?? roundMoney(estimate.penaltyAmount),
      cancellationAmountManual: manualAmount !== null,
      ownerAuditWarning: manualAmount !== null
        ? "مبلغ کنسلی به صورت دستی ثبت شده و جایگزین محاسبه درصدی شده است."
        : "کنسلی تا قبل از مدل تسویه مستقل بر اساس وضعیت CANCELED/NOT_HELD و زمان تأیید/آخرین ویرایش محاسبه می‌شود.",
    };
  });

  const diagnosticRows = monthContracts.flatMap((contract) => {
    const reason = getOwnerSettlementDiagnosticReason({
      eventDate: contract.eventDate,
      status: contract.status,
      invoice: contract.invoice,
      postEventConfirmation: contract.postEventConfirmation,
      effectiveStartDate,
    });

    if (!reason) return [];

    return [{
      contractId: contract.id,
      contractNo: contract.contractNo,
      contractStatus: contract.status,
      customerName: contract.customer.fullName,
      eventDate: contract.eventDate.toISOString(),
      eventDateLabel: formatJalaliDate(contract.eventDate),
      reason,
      reasonLabel: ownerSettlementDiagnosticReasonLabels[reason],
      finalTotal: roundMoney(toNumber(contract.finalTotal)),
      invoiceId: contract.invoice?.id ?? null,
      invoiceNo: contract.invoice?.invoiceNo ?? null,
      invoiceStatus: contract.invoice?.status ?? null,
      postEventStatus: contract.postEventConfirmation?.status ?? null,
      invoiceRequired: contract.postEventConfirmation?.invoiceRequired ?? null,
      cancellationRequired: contract.postEventConfirmation?.cancellationRequired ?? null,
      settlementImpact: "در مبلغ قابل پرداخت مالک وارد نشده است؛ این ردیف فقط برای تشخیص و رفع نقص نمایش داده می‌شود.",
    }];
  });

  const diagnosticSummary = {
    count: diagnosticRows.length,
    beforeOwnerOperationStart: diagnosticRows.filter((row) => row.reason === "BEFORE_OWNER_OPERATION_START").length,
    missingPostEventConfirmation: diagnosticRows.filter((row) => row.reason === "POST_EVENT_CONFIRMATION_MISSING").length,
    heldWithoutInvoice: diagnosticRows.filter((row) => row.reason === "HELD_BUT_INVOICE_MISSING").length,
    canceledInvoice: diagnosticRows.filter((row) => row.reason === "INVOICE_CANCELED").length,
    notHeldWithoutCancellation: diagnosticRows.filter((row) => row.reason === "NOT_HELD_WITHOUT_CANCELLATION").length,
  };

  const invoiceTotal = invoiceRows.reduce((sum, row) => sum + row.invoiceTotal, 0);
  const extraServicesTotal = invoiceRows.reduce((sum, row) => sum + row.extraServicesTotal, 0);
  const cancellationIncomeTotal = cancellationRows.reduce((sum, row) => sum + row.penaltyAmount, 0);
  const revenuePercent = toNumber(setting.ownerRevenueSharePercent);
  const cancellationPercent = toNumber(setting.ownerCancellationSharePercent);
  const ownerEventShare = roundMoney((invoiceTotal * revenuePercent) / 100);
  const ownerCancellationShare = roundMoney((cancellationIncomeTotal * cancellationPercent) / 100);
  const calculatedOwnerShare = roundMoney(ownerEventShare + ownerCancellationShare);
  const monthlyMinimumGuarantee = roundMoney(toNumber(setting.monthlyMinimumGuarantee));
  const guarantee = calculateFinalOwnerPayable({
    operationModel: setting.operationModel,
    invoiceTotal,
    cancellationIncomeTotal,
    calculatedOwnerShare,
    monthlyMinimumGuarantee,
  });

  const snapshot = {
    taskId: "TALAR_OWNER_MONTHLY_SETTLEMENT_33",
    period: {
      year: input.year,
      month: input.month,
      label: periodLabel,
      startDate: startDate.toISOString(),
      effectiveStartDate: effectiveStartDate.toISOString(),
      ownerOperationStartDate: setting.effectiveFrom.toISOString(),
      endDateExclusive: endDate.toISOString(),
    },
    setting: {
      id: setting.id,
      operationModel: setting.operationModel,
      ownerRevenueSharePercent: setting.ownerRevenueSharePercent.toString(),
      ownerCancellationSharePercent: setting.ownerCancellationSharePercent.toString(),
      monthlyMinimumGuarantee: setting.monthlyMinimumGuarantee.toString(),
      settlementCycle: setting.settlementCycle,
      effectiveFrom: setting.effectiveFrom.toISOString(),
    },
    invoiceRows,
    cancellationRows,
    diagnosticRows,
    diagnosticSummary,
    auditNotes: [
      "فاکتورهای CANCELED در سهم مالک لحاظ نشده‌اند.",
      "مبنای دوره، تاریخ مراسم قرارداد است نه تاریخ صدور فاکتور؛ چون مالک سهم ماه مراسم را می‌خواهد.",
      "درآمد کنسلی اگر مبلغ دستی داشته باشد از همان عدد استفاده می‌کند؛ در غیر این صورت از سیاست درصدی کنسلی محاسبه می‌شود و در گزارش با هشدار حسابرسی نگهداری می‌شود.",
      `محاسبات مالک فقط از ${formatJalaliDate(effectiveStartDate)} به بعد لحاظ شده است؛ داده‌های قبل از شروع بهره‌برداری مالک صرفاً آرشیو هستند.`,
      diagnosticSummary.count > 0
        ? `${diagnosticSummary.count} قرارداد این دوره فقط برای تشخیص نمایش داده شده و وارد مبلغ قابل پرداخت مالک نشده است.`
        : "قرارداد خارج از تسویه برای این دوره شناسایی نشد.",
    ],
  };

  return {
    ready: true as const,
    reason: null,
    period: { year: input.year, month: input.month, label: periodLabel, startDate, effectiveStartDate, endDate },
    existingSettlement,
    setting,
    settlement: {
      ownerOperationSettingId: setting.id,
      operationModel: setting.operationModel,
      ownerRevenueSharePercent: moneyString(revenuePercent),
      ownerCancellationSharePercent: moneyString(cancellationPercent),
      monthlyMinimumGuarantee: moneyString(monthlyMinimumGuarantee),
      settlementCycle: setting.settlementCycle as OwnerSettlementCycle,
      heldEventsCount: invoiceRows.length,
      canceledEventsCount: cancellationRows.length,
      invoiceTotal: moneyString(invoiceTotal),
      extraServicesTotal: moneyString(extraServicesTotal),
      cancellationIncomeTotal: moneyString(cancellationIncomeTotal),
      ownerEventShare: moneyString(ownerEventShare),
      ownerCancellationShare: moneyString(ownerCancellationShare),
      calculatedOwnerShare: moneyString(calculatedOwnerShare),
      minimumGuaranteeApplied: guarantee.minimumGuaranteeApplied,
      minimumGuaranteeShortfall: moneyString(guarantee.minimumGuaranteeShortfall),
      finalOwnerPayable: moneyString(guarantee.finalOwnerPayable),
      diagnosticRows,
      diagnosticSummary,
      snapshot,
    },
  };
}

export async function getOwnerSettlementPageData(input: {
  tenantId: string;
  year?: string | number | null;
  month?: string | number | null;
}) {
  const db = await getPrisma();
  const period = normalizeOwnerSettlementPeriod(input);
  const preview = await calculateOwnerMonthlySettlementPreview({
    tenantId: input.tenantId,
    year: period.year,
    month: period.month,
  });
  const latestSettlements = await db.ownerMonthlySettlement.findMany({
    where: { tenantId: input.tenantId },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { generatedAt: "desc" }],
    take: 18,
  });

  return { period, preview, latestSettlements };
}

export function getPreviousOwnerSettlementPeriod(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function getNextOwnerSettlementPeriod(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export function getOwnerSettlementPeriodFromDate(date: Date) {
  const parts = dateToJalaliParts(date);
  return { year: parts.year, month: parts.month };
}
