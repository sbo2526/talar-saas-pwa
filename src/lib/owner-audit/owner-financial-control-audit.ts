import type { InvoiceLineSourceType } from "@prisma/client";
import { formatJalaliDate, formatJalaliMonthTitle, getJalaliMonthRange } from "@/lib/date/jalali";
import { getPrisma } from "@/lib/prisma";
import { normalizeOwnerSettlementPeriod } from "@/lib/owner-settlements/owner-monthly-settlement";

export type OwnerFinancialAuditSeverity = "HIGH" | "MEDIUM" | "LOW";
export type OwnerFinancialAuditCategory =
  | "OFF_INVOICE_PAYMENT"
  | "SEPARATE_SERVICE_PAYMENT"
  | "EXTRA_GUEST_MISMATCH"
  | "INVOICE_DISPUTED"
  | "SENT_WITHOUT_FEEDBACK"
  | "HELD_WITHOUT_INVOICE"
  | "NOT_HELD_NEEDS_CANCELLATION"
  | "EXTRA_GUEST_PRICE_UNDER_MINIMUM"
  | "CUSTOMER_CONFIDENTIAL_MESSAGE";

export type OwnerFinancialAuditFlag = {
  id: string;
  severity: OwnerFinancialAuditSeverity;
  category: OwnerFinancialAuditCategory;
  title: string;
  description: string;
  contractId?: string;
  contractNo?: string;
  invoiceId?: string;
  invoiceNo?: string;
  customerName?: string;
  eventDateLabel?: string;
  createdAt?: string;
  amount?: number;
  href?: string;
  evidence: string[];
  ownerOnlyMessage?: string | null;
};

const separatePaymentFields = [
  { flag: "photographyPaidSeparately", amount: "photographyAmount", label: "عکاسی" },
  { flag: "videographyPaidSeparately", amount: "videographyAmount", label: "فیلم‌برداری" },
  { flag: "musicPaidSeparately", amount: "musicAmount", label: "موزیک" },
  { flag: "decorationPaidSeparately", amount: "decorationAmount", label: "گل‌آرایی / دکور" },
] as const;

const extraLineSourceTypes: InvoiceLineSourceType[] = [
  "EXTRA_GUEST",
  "EXTRA_SERVICE",
  "DAMAGE",
  "TIME_EXTENSION",
  "OWNER_ADJUSTMENT",
];

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function hasPositiveMoney(value: unknown) {
  return toNumber(value) > 0;
}

function bySeverity(left: OwnerFinancialAuditFlag, right: OwnerFinancialAuditFlag) {
  const order: Record<OwnerFinancialAuditSeverity, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const severityDiff = order[right.severity] - order[left.severity];
  if (severityDiff !== 0) return severityDiff;
  return String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""));
}

function makeFlag(input: OwnerFinancialAuditFlag): OwnerFinancialAuditFlag {
  return {
    ...input,
    evidence: input.evidence.filter(Boolean),
  };
}

export const ownerFinancialAuditSeverityLabels: Record<OwnerFinancialAuditSeverity, string> = {
  HIGH: "ریسک زیاد",
  MEDIUM: "نیازمند بررسی",
  LOW: "اطلاع حسابرسی",
};

export const ownerFinancialAuditCategoryLabels: Record<OwnerFinancialAuditCategory, string> = {
  OFF_INVOICE_PAYMENT: "پرداخت خارج از فاکتور",
  SEPARATE_SERVICE_PAYMENT: "خدمت جانبی جداگانه",
  EXTRA_GUEST_MISMATCH: "اختلاف نفرات اضافه",
  INVOICE_DISPUTED: "اعتراض مشتری",
  SENT_WITHOUT_FEEDBACK: "ارسال شده بدون پاسخ مشتری",
  HELD_WITHOUT_INVOICE: "مراسم برگزارشده بدون فاکتور",
  NOT_HELD_NEEDS_CANCELLATION: "عدم برگزاری نیازمند کنسلی",
  EXTRA_GUEST_PRICE_UNDER_MINIMUM: "قیمت نفر اضافه زیر حداقل",
  CUSTOMER_CONFIDENTIAL_MESSAGE: "پیام محرمانه مشتری",
};

export function getOwnerFinancialAuditSeverityStyle(severity: OwnerFinancialAuditSeverity) {
  if (severity === "HIGH") return "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]";
  if (severity === "MEDIUM") return "border-[#c7a15a]/38 bg-[#fff7e6] text-[#7a4a12]";
  return "border-[#17483f]/20 bg-[#f1fbf5] text-[#17483f]";
}

export function getOwnerFinancialAuditCategoryLabel(category: OwnerFinancialAuditCategory) {
  return ownerFinancialAuditCategoryLabels[category] ?? category;
}

export async function getOwnerFinancialControlAuditData(input: {
  tenantId: string;
  year?: string | number | null;
  month?: string | number | null;
}) {
  const db = await getPrisma();
  const period = normalizeOwnerSettlementPeriod(input);
  const { startDate, endDate } = getJalaliMonthRange(period.year, period.month);
  const periodLabel = formatJalaliMonthTitle(period.year, period.month);
  const setting = await db.ownerOperationSetting.findUnique({
    where: { tenantId: input.tenantId },
    select: { effectiveFrom: true },
  });
  const effectiveStartDate = setting?.effectiveFrom && setting.effectiveFrom > startDate ? setting.effectiveFrom : startDate;
  const isBeforeOwnerOperationStart = effectiveStartDate >= endDate;

  const [feedbacks, sentInvoicesWithoutFeedback, heldWithoutInvoices, notHeldConfirmations, extraGuestLines, latestSettlements] = await Promise.all([
    db.customerInvoiceFeedback.findMany({
      where: {
        tenantId: input.tenantId,
        contract: { is: { eventDate: { gte: effectiveStartDate, lt: endDate } } },
      },
      include: {
        contract: {
          select: {
            id: true,
            contractNo: true,
            eventDate: true,
            guestCount: true,
            customer: { select: { fullName: true, phone: true } },
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNo: true,
            status: true,
            guestCountActual: true,
            extraGuestCount: true,
            minimumPerGuestPrice: true,
            extraGuestTotal: true,
            lines: {
              where: { sourceType: { in: extraLineSourceTypes } },
              select: { id: true, sourceType: true, name: true, quantity: true, unitPrice: true, minUnitPrice: true, totalPrice: true },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    }),
    db.invoice.findMany({
      where: {
        tenantId: input.tenantId,
        status: "SENT",
        customerFeedbacks: { none: {} },
        contract: { is: { eventDate: { gte: effectiveStartDate, lt: endDate } } },
      },
      include: {
        contract: { select: { id: true, contractNo: true, eventDate: true, customer: { select: { fullName: true, phone: true } } } },
      },
      orderBy: [{ sentAt: "asc" }, { issuedAt: "asc" }],
      take: 100,
    }),
    db.postEventConfirmation.findMany({
      where: {
        tenantId: input.tenantId,
        status: "HELD",
        invoiceRequired: true,
        contract: {
          is: {
            eventDate: { gte: effectiveStartDate, lt: endDate },
            invoice: { is: null },
          },
        },
      },
      include: {
        contract: { select: { id: true, contractNo: true, eventDate: true, customer: { select: { fullName: true } } } },
      },
      orderBy: [{ confirmedAt: "desc" }],
      take: 100,
    }),
    db.postEventConfirmation.findMany({
      where: {
        tenantId: input.tenantId,
        status: "NOT_HELD",
        cancellationRequired: true,
        contract: {
          is: {
            eventDate: { gte: effectiveStartDate, lt: endDate },
            status: { not: "CANCELED" },
          },
        },
      },
      include: {
        contract: { select: { id: true, contractNo: true, status: true, eventDate: true, customer: { select: { fullName: true } } } },
      },
      orderBy: [{ confirmedAt: "desc" }],
      take: 100,
    }),
    db.invoiceLine.findMany({
      where: {
        tenantId: input.tenantId,
        sourceType: "EXTRA_GUEST",
        invoice: {
          is: {
            status: { not: "CANCELED" },
            contract: { is: { eventDate: { gte: effectiveStartDate, lt: endDate } } },
          },
        },
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNo: true,
            contract: { select: { id: true, contractNo: true, eventDate: true, customer: { select: { fullName: true } } } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    }),
    db.ownerMonthlySettlement.findMany({
      where: { tenantId: input.tenantId },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { generatedAt: "desc" }],
      take: 6,
    }),
  ]);

  const flags: OwnerFinancialAuditFlag[] = [];

  for (const feedback of feedbacks) {
    const contract = feedback.contract;
    const invoice = feedback.invoice;
    const eventDateLabel = formatJalaliDate(contract.eventDate);
    const base = {
      contractId: contract.id,
      contractNo: contract.contractNo,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      customerName: contract.customer.fullName,
      eventDateLabel,
      createdAt: feedback.createdAt.toISOString(),
      href: `/dashboard/invoices/${invoice.id}`,
    };

    if (!feedback.invoiceAccepted || invoice.status === "DISPUTED") {
      flags.push(makeFlag({
        id: `disputed-${feedback.id}`,
        severity: "HIGH",
        category: "INVOICE_DISPUTED",
        title: "مشتری مبلغ یا ردیف صورتحساب را نیازمند بررسی دانسته است",
        description: feedback.disputeMessage || "صورتحساب توسط مشتری تأیید نشده یا وضعیت فاکتور DISPUTED است.",
        ...base,
        evidence: [
          `وضعیت فاکتور: ${invoice.status}`,
          feedback.disputeMessage ? `متن اعتراض: ${feedback.disputeMessage}` : "متن اعتراض جداگانه ثبت نشده است.",
        ],
        ownerOnlyMessage: feedback.confidentialOwnerMessage,
      }));
    }

    if (feedback.hasExtraPayment || hasPositiveMoney(feedback.extraPaymentAmount)) {
      flags.push(makeFlag({
        id: `off-invoice-${feedback.id}`,
        severity: "HIGH",
        category: "OFF_INVOICE_PAYMENT",
        title: "مشتری پرداخت خارج از صورتحساب گزارش کرده است",
        description: feedback.extraPaymentReason || "پرداختی خارج از مبلغ فاکتور گزارش شده و باید توسط مالک بررسی شود.",
        ...base,
        amount: roundMoney(toNumber(feedback.extraPaymentAmount)),
        evidence: [
          feedback.extraPaymentAmount ? `مبلغ اعلامی: ${roundMoney(toNumber(feedback.extraPaymentAmount)).toLocaleString("fa-IR")} تومان` : "مبلغ دقیق اعلام نشده است.",
          feedback.extraPaymentReceiver ? `دریافت‌کننده: ${feedback.extraPaymentReceiver}` : "دریافت‌کننده مشخص نشده است.",
          feedback.extraPaymentMethod ? `روش پرداخت: ${feedback.extraPaymentMethod}` : "روش پرداخت مشخص نشده است.",
        ],
        ownerOnlyMessage: feedback.confidentialOwnerMessage,
      }));
    }

    if (feedback.hadExtraGuests) {
      const reportedGuestCount = feedback.actualGuestCount ?? 0;
      const invoiceGuestCount = invoice.guestCountActual;
      const invoiceHasExtraGuestLine = invoice.lines.some((line) => line.sourceType === "EXTRA_GUEST" && toNumber(line.totalPrice) > 0);
      if (reportedGuestCount > invoiceGuestCount || !invoiceHasExtraGuestLine) {
        flags.push(makeFlag({
          id: `extra-guest-${feedback.id}`,
          severity: "HIGH",
          category: "EXTRA_GUEST_MISMATCH",
          title: "مشتری نفرات اضافه را گزارش کرده ولی صورتحساب با آن همخوان نیست",
          description: "گزارش مشتری درباره نفرات اضافه باید با ردیف نفر اضافه و تعداد واقعی فاکتور تطبیق داده شود.",
          ...base,
          evidence: [
            `تعداد قرارداد: ${contract.guestCount}`,
            `تعداد واقعی فاکتور: ${invoiceGuestCount}`,
            reportedGuestCount ? `تعداد اعلامی مشتری: ${reportedGuestCount}` : "مشتری تعداد تقریبی را وارد نکرده است.",
            invoiceHasExtraGuestLine ? "ردیف نفر اضافه در فاکتور وجود دارد." : "ردیف نفر اضافه در فاکتور پیدا نشد.",
          ],
          ownerOnlyMessage: feedback.confidentialOwnerMessage,
        }));
      }
    }

    const feedbackRecord = feedback as Record<string, unknown>;

    for (const service of separatePaymentFields) {
      const separatelyPaid = Boolean(feedbackRecord[service.flag]);
      const amount = toNumber(feedbackRecord[service.amount]);
      if (separatelyPaid || amount > 0) {
        flags.push(makeFlag({
          id: `${service.flag}-${feedback.id}`,
          severity: "MEDIUM",
          category: "SEPARATE_SERVICE_PAYMENT",
          title: `پرداخت جداگانه برای ${service.label} گزارش شده است`,
          description: "این مورد باید با ردیف‌های خدمات اضافه، قرارداد اصلی و دریافت‌های رسمی تطبیق داده شود.",
          ...base,
          amount: roundMoney(amount),
          evidence: [
            amount > 0 ? `مبلغ اعلامی: ${roundMoney(amount).toLocaleString("fa-IR")} تومان` : "مبلغ دقیق اعلام نشده است.",
            `نوع خدمت: ${service.label}`,
          ],
          ownerOnlyMessage: feedback.confidentialOwnerMessage,
        }));
      }
    }

    if (feedback.hadOtherServices || hasPositiveMoney(feedback.otherServicesAmount)) {
      flags.push(makeFlag({
        id: `other-service-${feedback.id}`,
        severity: "MEDIUM",
        category: "SEPARATE_SERVICE_PAYMENT",
        title: "مشتری خدمات جانبی دیگر گزارش کرده است",
        description: feedback.otherServicesDescription || "خدمات جانبی خارج از ردیف‌های روشن فاکتور گزارش شده است.",
        ...base,
        amount: roundMoney(toNumber(feedback.otherServicesAmount)),
        evidence: [
          feedback.otherServicesDescription ? `شرح مشتری: ${feedback.otherServicesDescription}` : "شرح خدمت وارد نشده است.",
          feedback.otherServicesAmount ? `مبلغ اعلامی: ${roundMoney(toNumber(feedback.otherServicesAmount)).toLocaleString("fa-IR")} تومان` : "مبلغ دقیق اعلام نشده است.",
        ],
        ownerOnlyMessage: feedback.confidentialOwnerMessage,
      }));
    }

    if (feedback.confidentialOwnerMessage) {
      flags.push(makeFlag({
        id: `confidential-${feedback.id}`,
        severity: "LOW",
        category: "CUSTOMER_CONFIDENTIAL_MESSAGE",
        title: "مشتری پیام محرمانه برای مالک ثبت کرده است",
        description: "این پیام فقط در سطح مالک/مدیر ارشد باید بررسی شود و در دسترس کارکنان معمولی نباشد.",
        ...base,
        evidence: ["پیام محرمانه مشتری موجود است."],
        ownerOnlyMessage: feedback.confidentialOwnerMessage,
      }));
    }
  }

  for (const invoice of sentInvoicesWithoutFeedback) {
    flags.push(makeFlag({
      id: `sent-without-feedback-${invoice.id}`,
      severity: "MEDIUM",
      category: "SENT_WITHOUT_FEEDBACK",
      title: "صورتحساب برای مشتری ارسال شده ولی هنوز پاسخی ثبت نشده است",
      description: "تا زمانی که مشتری فاکتور را تأیید یا اعتراض نکند، ریسک اختلاف بعدی باز می‌ماند.",
      contractId: invoice.contract.id,
      contractNo: invoice.contract.contractNo,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      customerName: invoice.contract.customer.fullName,
      eventDateLabel: formatJalaliDate(invoice.contract.eventDate),
      createdAt: (invoice.sentAt ?? invoice.issuedAt).toISOString(),
      href: `/dashboard/invoices/${invoice.id}`,
      evidence: [
        "وضعیت فاکتور SENT است.",
        "هیچ CustomerInvoiceFeedback برای این فاکتور ثبت نشده است.",
      ],
    }));
  }

  for (const confirmation of heldWithoutInvoices) {
    flags.push(makeFlag({
      id: `held-without-invoice-${confirmation.id}`,
      severity: "HIGH",
      category: "HELD_WITHOUT_INVOICE",
      title: "مراسم برگزارشده تأیید شده ولی هنوز صورتحساب ندارد",
      description: "این مورد باید سریعاً وارد مسیر صدور صورتحساب از قرارداد شود.",
      contractId: confirmation.contract.id,
      contractNo: confirmation.contract.contractNo,
      customerName: confirmation.contract.customer.fullName,
      eventDateLabel: formatJalaliDate(confirmation.contract.eventDate),
      createdAt: confirmation.confirmedAt.toISOString(),
      href: `/dashboard/contracts/${confirmation.contract.id}/invoice`,
      evidence: [
        "PostEventConfirmation.status = HELD",
        "invoiceRequired = true",
        "Invoice برای قرارداد پیدا نشد.",
      ],
    }));
  }

  for (const confirmation of notHeldConfirmations) {
    flags.push(makeFlag({
      id: `not-held-cancellation-${confirmation.id}`,
      severity: "HIGH",
      category: "NOT_HELD_NEEDS_CANCELLATION",
      title: "مراسم برگزار نشده ولی قرارداد هنوز CANCELED نیست",
      description: "این مورد باید از مسیر کنسلی مجاز تعیین تکلیف شود تا سهم مالک از کنسلی در تسویه گم نشود.",
      contractId: confirmation.contract.id,
      contractNo: confirmation.contract.contractNo,
      customerName: confirmation.contract.customer.fullName,
      eventDateLabel: formatJalaliDate(confirmation.contract.eventDate),
      createdAt: confirmation.confirmedAt.toISOString(),
      href: `/dashboard/contracts/${confirmation.contract.id}`,
      evidence: [
        "PostEventConfirmation.status = NOT_HELD",
        "cancellationRequired = true",
        `وضعیت فعلی قرارداد: ${confirmation.contract.status}`,
      ],
    }));
  }

  for (const line of extraGuestLines) {
    const unitPrice = toNumber(line.unitPrice);
    const minUnitPrice = toNumber(line.minUnitPrice);
    const quantity = Math.max(0, line.quantity);
    const totalPrice = toNumber(line.totalPrice);
    const minimumTotal = minUnitPrice * quantity;
    if (minUnitPrice > 0 && (unitPrice < minUnitPrice || totalPrice < minimumTotal)) {
      flags.push(makeFlag({
        id: `extra-guest-price-${line.id}`,
        severity: "HIGH",
        category: "EXTRA_GUEST_PRICE_UNDER_MINIMUM",
        title: "ردیف نفر اضافه کمتر از حداقل مجاز ثبت شده است",
        description: "قانون کنترل مالی اجازه کاهش مبلغ پیشنهادی هر نفر اضافه را نمی‌دهد. این مورد باید بررسی و اصلاح شود.",
        contractId: line.invoice.contract.id,
        contractNo: line.invoice.contract.contractNo,
        invoiceId: line.invoice.id,
        invoiceNo: line.invoice.invoiceNo,
        customerName: line.invoice.contract.customer.fullName,
        eventDateLabel: formatJalaliDate(line.invoice.contract.eventDate),
        createdAt: line.createdAt.toISOString(),
        amount: roundMoney(minimumTotal - totalPrice),
        href: `/dashboard/invoices/${line.invoice.id}`,
        evidence: [
          `تعداد: ${quantity}`,
          `قیمت واحد ثبت‌شده: ${roundMoney(unitPrice).toLocaleString("fa-IR")} تومان`,
          `حداقل واحد: ${roundMoney(minUnitPrice).toLocaleString("fa-IR")} تومان`,
          `جمع ثبت‌شده: ${roundMoney(totalPrice).toLocaleString("fa-IR")} تومان`,
          `جمع حداقلی: ${roundMoney(minimumTotal).toLocaleString("fa-IR")} تومان`,
        ],
      }));
    }
  }

  const sortedFlags = flags.sort(bySeverity);
  const summary = {
    totalFlags: sortedFlags.length,
    highRisk: sortedFlags.filter((flag) => flag.severity === "HIGH").length,
    mediumRisk: sortedFlags.filter((flag) => flag.severity === "MEDIUM").length,
    lowRisk: sortedFlags.filter((flag) => flag.severity === "LOW").length,
    offInvoicePayments: sortedFlags.filter((flag) => flag.category === "OFF_INVOICE_PAYMENT").length,
    extraGuestMismatches: sortedFlags.filter((flag) => flag.category === "EXTRA_GUEST_MISMATCH").length,
    heldWithoutInvoice: sortedFlags.filter((flag) => flag.category === "HELD_WITHOUT_INVOICE").length,
  };

  return {
    period: {
      year: period.year,
      month: period.month,
      label: periodLabel,
      startDate,
      effectiveStartDate,
      ownerOperationStartDate: setting?.effectiveFrom ?? null,
      endDate,
    },
    summary,
    flags: sortedFlags,
    latestSettlements,
    ownerOperationStartDate: setting?.effectiveFrom ?? null,
    isBeforeOwnerOperationStart,
  };
}
