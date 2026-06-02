import type { ContractStatus, FinancialCategoryType, PaymentMethodType, Prisma } from "@prisma/client";
import { contractStatusLabels, getPaymentStatus, toNumber } from "@/lib/contracts/display";
import { formatJalaliMonthTitle, toLatinDigits } from "@/lib/date/jalali";
import {
  formatPaymentMethodLabel,
  getPaymentRecordStatusLabel,
  getPaymentTypeLabel,
} from "@/lib/payments/display";
import { paymentTypeLabels as paymentMethodTypeLabels } from "@/lib/payment-method-options";
import { getPrisma } from "@/lib/prisma";
import {
  getReportDateRange,
  parseReportType,
  type ReportDateRange,
  type ReportType,
} from "@/lib/reports/date-ranges";

export type ReportFilters = {
  period: string;
  reportType: ReportType;
  from?: string;
  to?: string;
  hallId?: string;
  salonId?: string;
  eventType?: string;
  paymentMethodId?: string;
  categoryId?: string;
  range: ReportDateRange;
};

type PaymentSource = {
  amount: Prisma.Decimal | number | string;
  type: string | null;
  status: string | null;
};

type ContractReportRow = Prisma.ContractGetPayload<{
  select: {
    id: true;
    contractNo: true;
    title: true;
    status: true;
    eventTypeName: true;
    eventDate: true;
    guestCount: true;
    finalTotal: true;
    remainingAmount: true;
    depositAmount: true;
    createdAt: true;
    customer: { select: { fullName: true; phone: true } };
    hall: { select: { name: true } };
    salon: { select: { name: true } };
    payments: { select: { amount: true; type: true; status: true; paidAt: true } };
  };
}>;

type PaymentReportRow = Prisma.PaymentGetPayload<{
  select: {
    id: true;
    type: true;
    status: true;
    amount: true;
    paidAt: true;
    referenceNumber: true;
    trackingCode: true;
    chequeNumber: true;
    customer: { select: { fullName: true; phone: true } };
    contract: { select: { id: true; contractNo: true; title: true; eventDate: true } };
    paymentMethod: { select: { id: true; title: true; type: true } };
  };
}>;

type ExpenseReportRow = Prisma.ExpenseGetPayload<{
  select: {
    id: true;
    title: true;
    amount: true;
    occurredAt: true;
    status: true;
    description: true;
    note: true;
    financialCategory: { select: { id: true; title: true; color: true; type: true } };
  };
}>;

export type ReportOption = {
  id: string;
  label: string;
};

export type ReportsData = {
  filters: ReportFilters;
  options: {
    halls: ReportOption[];
    salons: Array<ReportOption & { hallId: string }>;
    eventTypes: ReportOption[];
    paymentMethods: Array<ReportOption & { type: PaymentMethodType }>;
    financialCategories: Array<ReportOption & { type: FinancialCategoryType }>;
  };
  kpis: {
    contractsTotal: number;
    receivedTotal: number;
    outstandingTotal: number;
    expensesTotal: number;
    estimatedProfit: number;
    contractsCount: number;
    upcomingEventsCount: number;
    settledContractsCount: number;
  };
  paymentSummary: {
    todayReceived: number;
    monthReceived: number;
    cardReceived: number;
    cashReceived: number;
    transferReceived: number;
    chequeReceived: number;
    pendingCount: number;
    latestPayments: PaymentReportRow[];
  };
  contractPerformance: {
    statusCounts: Array<{ status: ContractStatus; label: string; count: number; total: number }>;
    byEventType: Array<{ label: string; count: number; total: number }>;
    byMonth: Array<{ label: string; count: number; total: number }>;
    averageAmount: number;
    maxAmount: number;
    nearestEvent: ContractReportRow | null;
  };
  expenses: {
    total: number;
    currentMonthTotal: number;
    byCategory: Array<{ id: string; label: string; amount: number; color: string | null }>;
    topCategory: { label: string; amount: number } | null;
    latestExpenses: ExpenseReportRow[];
  };
  upcomingEvents: ContractReportRow[];
  outstandingContracts: ContractReportRow[];
  charts: {
    paymentsByMonth: Array<{ label: string; amount: number }>;
    statusDistribution: Array<{ label: string; value: number }>;
    revenueByEventType: Array<{ label: string; amount: number }>;
    expensesByCategory: Array<{ label: string; amount: number }>;
  };
};

export function getReportFilters(searchParams: URLSearchParams | Record<string, string | undefined>): ReportFilters {
  const getValue = (key: string) =>
    searchParams instanceof URLSearchParams ? searchParams.get(key) ?? undefined : searchParams[key];
  const normalize = (value: string | undefined) => {
    const trimmed = value?.trim();
    return trimmed && trimmed !== "all" ? trimmed : undefined;
  };
  const period = getValue("period") ?? "month";
  const from = normalize(getValue("from"));
  const to = normalize(getValue("to"));

  return {
    period,
    reportType: parseReportType(getValue("reportType")),
    from,
    to,
    hallId: normalize(getValue("hallId")),
    salonId: normalize(getValue("salonId")),
    eventType: normalize(getValue("eventType")),
    paymentMethodId: normalize(getValue("paymentMethodId")),
    categoryId: normalize(getValue("categoryId")),
    range: getReportDateRange({ period, from, to }),
  };
}

export async function getReportsData(tenantId: string, filters: ReportFilters): Promise<ReportsData> {
  const db = await getPrisma();
  const contractWhere: Prisma.ContractWhereInput = {
    tenantId,
    eventDate: { gte: filters.range.startDate, lt: filters.range.endDate },
    ...(filters.hallId ? { hallId: filters.hallId } : {}),
    ...(filters.salonId ? { salonId: filters.salonId } : {}),
    ...(filters.eventType ? { eventTypeName: filters.eventType } : {}),
  };
  const activeContractWhere: Prisma.ContractWhereInput = {
    ...contractWhere,
    status: { not: "CANCELED" },
  };
  const paymentWhere: Prisma.PaymentWhereInput = {
    tenantId,
    paidAt: { gte: filters.range.startDate, lt: filters.range.endDate },
    ...(filters.paymentMethodId ? { paymentMethodId: filters.paymentMethodId } : {}),
  };
  const validPaymentWhere: Prisma.PaymentWhereInput = {
    ...paymentWhere,
    status: { in: ["RECORDED", "CONFIRMED"] },
  };
  const expenseWhere: Prisma.ExpenseWhereInput = {
    tenantId,
    status: { not: "CANCELED" },
    occurredAt: { gte: filters.range.startDate, lt: filters.range.endDate },
    ...(filters.categoryId ? { financialCategoryId: filters.categoryId } : {}),
  };
  const todayStart = getReportDateRange({ period: "today" }).startDate;
  const todayEnd = getReportDateRange({ period: "today" }).endDate;
  const currentMonth = getReportDateRange({ period: "month" });

  const [
    halls,
    salons,
    eventTypes,
    paymentMethods,
    financialCategories,
    contracts,
    payments,
    latestPayments,
    pendingPaymentsCount,
    expenses,
    latestExpenses,
    upcomingEvents,
    upcomingEventsCount,
    outstandingContracts,
    todayPayments,
    monthPayments,
    allContractsTotal,
  ] = await Promise.all([
    db.hall.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }],
    }),
    db.salon.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, hallId: true },
      orderBy: [{ name: "asc" }],
    }),
    db.contractEventType.findMany({
      where: { tenantId, isActive: true },
      select: { name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.paymentMethod.findMany({
      where: { tenantId },
      select: { id: true, title: true, type: true },
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { title: "asc" }],
    }),
    db.financialCategory.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, title: true, type: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    db.contract.findMany({
      where: contractWhere,
      select: contractSelect,
      orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
    }),
    db.payment.findMany({
      where: validPaymentWhere,
      select: paymentSelect,
      orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
    }),
    db.payment.findMany({
      where: paymentWhere,
      select: paymentSelect,
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    db.payment.count({
      where: { ...paymentWhere, status: "PENDING" },
    }),
    db.expense.findMany({
      where: expenseWhere,
      select: expenseSelect,
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    }),
    db.expense.findMany({
      where: expenseWhere,
      select: expenseSelect,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    db.contract.findMany({
      where: {
        tenantId,
        eventDate: { gte: todayStart },
        status: { not: "CANCELED" },
        ...(filters.hallId ? { hallId: filters.hallId } : {}),
        ...(filters.salonId ? { salonId: filters.salonId } : {}),
        ...(filters.eventType ? { eventTypeName: filters.eventType } : {}),
      },
      select: contractSelect,
      orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
      take: 8,
    }),
    db.contract.count({
      where: {
        tenantId,
        eventDate: { gte: todayStart },
        status: { not: "CANCELED" },
      },
    }),
    db.contract.findMany({
      where: {
        tenantId,
        remainingAmount: { gt: 0 },
        status: { not: "CANCELED" },
        ...(filters.hallId ? { hallId: filters.hallId } : {}),
        ...(filters.salonId ? { salonId: filters.salonId } : {}),
        ...(filters.eventType ? { eventTypeName: filters.eventType } : {}),
      },
      select: contractSelect,
      orderBy: [{ remainingAmount: "desc" }, { eventDate: "asc" }],
      take: 8,
    }),
    db.payment.findMany({
      where: {
        tenantId,
        paidAt: { gte: todayStart, lt: todayEnd },
        status: { in: ["RECORDED", "CONFIRMED"] },
      },
      select: { amount: true, type: true, status: true },
    }),
    db.payment.findMany({
      where: {
        tenantId,
        paidAt: { gte: currentMonth.startDate, lt: currentMonth.endDate },
        status: { in: ["RECORDED", "CONFIRMED"] },
      },
      select: { amount: true, type: true, status: true },
    }),
    db.contract.aggregate({
      where: activeContractWhere,
      _sum: { finalTotal: true },
    }),
  ]);

  const contractsTotal = toNumber(allContractsTotal._sum.finalTotal);
  const receivedTotal = sumEffectivePayments(payments);
  const expensesTotal = sumAmounts(expenses.map((expense) => expense.amount));
  const settledContractsCount = contracts.filter((contract) => {
    const paidAmount = getContractPaidAmount(contract);
    return getPaymentStatus(contract.finalTotal, paidAmount) === "PAID" && contract.status !== "CANCELED";
  }).length;
  const outstandingTotal = outstandingContracts.reduce(
    (sum, contract) => sum + getContractRemaining(contract),
    0,
  );
  const nonCanceledContracts = contracts.filter((contract) => contract.status !== "CANCELED");
  const activeContractAmounts = nonCanceledContracts.map((contract) => toNumber(contract.finalTotal));
  const averageAmount = activeContractAmounts.length
    ? Math.round(activeContractAmounts.reduce((sum, amount) => sum + amount, 0) / activeContractAmounts.length)
    : 0;
  const maxAmount = activeContractAmounts.length ? Math.max(...activeContractAmounts) : 0;
  const nearestEvent = upcomingEvents[0] ?? null;

  const byCategory = groupExpensesByCategory(expenses);
  const topCategory = byCategory.length
    ? byCategory.reduce((top, category) => (category.amount > top.amount ? category : top), byCategory[0])
    : null;

  return {
    filters,
    options: {
      halls: halls.map((hall) => ({ id: hall.id, label: hall.name })),
      salons: salons.map((salon) => ({ id: salon.id, label: salon.name, hallId: salon.hallId })),
      eventTypes: eventTypes.map((eventType) => ({ id: eventType.name, label: eventType.name })),
      paymentMethods: paymentMethods.map((method) => ({
        id: method.id,
        label: formatPaymentMethodLabel(method),
        type: method.type,
      })),
      financialCategories: financialCategories.map((category) => ({
        id: category.id,
        label: category.title,
        type: category.type,
      })),
    },
    kpis: {
      contractsTotal,
      receivedTotal,
      outstandingTotal,
      expensesTotal,
      estimatedProfit: receivedTotal - expensesTotal,
      contractsCount: contracts.length,
      upcomingEventsCount,
      settledContractsCount,
    },
    paymentSummary: {
      todayReceived: sumEffectivePayments(todayPayments),
      monthReceived: sumEffectivePayments(monthPayments),
      cardReceived: sumPaymentsByMethodType(payments, ["CARD"]),
      cashReceived: sumPaymentsByMethodType(payments, ["CASH"]),
      transferReceived: sumPaymentsByMethodType(payments, ["BANK_TRANSFER", "CARD_TO_CARD", "ONLINE"]),
      chequeReceived: sumPaymentsByMethodType(payments, ["CHECK"]),
      pendingCount: pendingPaymentsCount,
      latestPayments,
    },
    contractPerformance: {
      statusCounts: groupContractsByStatus(contracts),
      byEventType: groupContractsByEventType(nonCanceledContracts),
      byMonth: groupContractsByJalaliMonth(nonCanceledContracts),
      averageAmount,
      maxAmount,
      nearestEvent,
    },
    expenses: {
      total: expensesTotal,
      currentMonthTotal: sumAmounts(
        expenses
          .filter((expense) => expense.occurredAt >= currentMonth.startDate && expense.occurredAt < currentMonth.endDate)
          .map((expense) => expense.amount),
      ),
      byCategory,
      topCategory: topCategory ? { label: topCategory.label, amount: topCategory.amount } : null,
      latestExpenses,
    },
    upcomingEvents,
    outstandingContracts,
    charts: {
      paymentsByMonth: groupPaymentsByJalaliMonth(payments),
      statusDistribution: groupContractsByStatus(contracts).map((status) => ({ label: status.label, value: status.count })),
      revenueByEventType: groupContractsByEventType(nonCanceledContracts).map((item) => ({ label: item.label, amount: item.total })),
      expensesByCategory: byCategory.map((item) => ({ label: item.label, amount: item.amount })),
    },
  };
}

const contractSelect = {
  id: true,
  contractNo: true,
  title: true,
  status: true,
  eventTypeName: true,
  eventDate: true,
  guestCount: true,
  finalTotal: true,
  remainingAmount: true,
  depositAmount: true,
  createdAt: true,
  customer: { select: { fullName: true, phone: true } },
  hall: { select: { name: true } },
  salon: { select: { name: true } },
  payments: { select: { amount: true, type: true, status: true, paidAt: true } },
} satisfies Prisma.ContractSelect;

const paymentSelect = {
  id: true,
  type: true,
  status: true,
  amount: true,
  paidAt: true,
  referenceNumber: true,
  trackingCode: true,
  chequeNumber: true,
  customer: { select: { fullName: true, phone: true } },
  contract: { select: { id: true, contractNo: true, title: true, eventDate: true } },
  paymentMethod: { select: { id: true, title: true, type: true } },
} satisfies Prisma.PaymentSelect;

const expenseSelect = {
  id: true,
  title: true,
  amount: true,
  occurredAt: true,
  status: true,
  description: true,
  note: true,
  financialCategory: { select: { id: true, title: true, color: true, type: true } },
} satisfies Prisma.ExpenseSelect;

export function getPaymentNetAmount(payment: PaymentSource) {
  if (payment.status === "CANCELED" || payment.status === "RETURNED" || payment.status === "PENDING") {
    return 0;
  }

  const amount = toNumber(payment.amount);
  return payment.type === "REFUND" ? -amount : amount;
}

export function getContractPaidAmount(contract: Pick<ContractReportRow, "payments" | "depositAmount">) {
  const paymentsTotal = sumEffectivePayments(contract.payments);
  return paymentsTotal > 0 ? paymentsTotal : toNumber(contract.depositAmount);
}

export function getContractRemaining(contract: Pick<ContractReportRow, "finalTotal" | "payments" | "depositAmount" | "remainingAmount">) {
  const storedRemaining = toNumber(contract.remainingAmount);
  if (storedRemaining > 0) {
    return storedRemaining;
  }

  return Math.max(0, toNumber(contract.finalTotal) - getContractPaidAmount(contract));
}

export function sumEffectivePayments(payments: PaymentSource[]) {
  return payments.reduce<number>((sum, payment) => sum + getPaymentNetAmount(payment), 0);
}

function sumAmounts(amounts: Array<Prisma.Decimal | number | string>) {
  return amounts.reduce<number>((sum, amount) => sum + toNumber(amount), 0);
}

function sumPaymentsByMethodType(payments: PaymentReportRow[], types: PaymentMethodType[]) {
  return payments.reduce<number>((sum, payment) => {
    if (!payment.paymentMethod?.type || !types.includes(payment.paymentMethod.type)) {
      return sum;
    }

    return sum + getPaymentNetAmount(payment);
  }, 0);
}

function groupContractsByStatus(contracts: ContractReportRow[]) {
  const initial = new Map<ContractStatus, { count: number; total: number }>();
  const statuses: ContractStatus[] = ["DRAFT", "RESERVED", "CONFIRMED", "COMPLETED", "CANCELED"];
  statuses.forEach((status) => initial.set(status, { count: 0, total: 0 }));

  contracts.forEach((contract) => {
    const bucket = initial.get(contract.status) ?? { count: 0, total: 0 };
    bucket.count += 1;
    bucket.total += toNumber(contract.finalTotal);
    initial.set(contract.status, bucket);
  });

  return statuses.map((status) => ({
    status,
    label: contractStatusLabels[status],
    count: initial.get(status)?.count ?? 0,
    total: initial.get(status)?.total ?? 0,
  }));
}

function groupContractsByEventType(contracts: ContractReportRow[]) {
  const grouped = new Map<string, { count: number; total: number }>();

  contracts.forEach((contract) => {
    const label = contract.eventTypeName || "ثبت نشده";
    const bucket = grouped.get(label) ?? { count: 0, total: 0 };
    bucket.count += 1;
    bucket.total += toNumber(contract.finalTotal);
    grouped.set(label, bucket);
  });

  return [...grouped.entries()]
    .map(([label, value]) => ({ label, ...value }))
    .sort((a, b) => b.total - a.total || b.count - a.count)
    .slice(0, 6);
}

function groupContractsByJalaliMonth(contracts: ContractReportRow[]) {
  const grouped = new Map<string, { count: number; total: number }>();

  contracts.forEach((contract) => {
    const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "numeric",
    })
      .formatToParts(contract.eventDate)
      .reduce<Record<string, string>>((acc, part) => {
        acc[part.type] = toLatinDigits(part.value);
        return acc;
      }, {});
    const year = Number(parts.year);
    const month = Number(parts.month);
    const label = Number.isFinite(year) && Number.isFinite(month) ? formatJalaliMonthTitle(year, month) : "ثبت نشده";
    const bucket = grouped.get(label) ?? { count: 0, total: 0 };
    bucket.count += 1;
    bucket.total += toNumber(contract.finalTotal);
    grouped.set(label, bucket);
  });

  return [...grouped.entries()].map(([label, value]) => ({ label, ...value })).slice(-8);
}

function groupPaymentsByJalaliMonth(payments: PaymentReportRow[]) {
  const grouped = new Map<string, number>();

  payments.forEach((payment) => {
    const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "numeric",
    })
      .formatToParts(payment.paidAt)
      .reduce<Record<string, string>>((acc, part) => {
        acc[part.type] = toLatinDigits(part.value);
        return acc;
      }, {});
    const year = Number(parts.year);
    const month = Number(parts.month);
    const label = Number.isFinite(year) && Number.isFinite(month) ? formatJalaliMonthTitle(year, month) : "ثبت نشده";
    grouped.set(label, (grouped.get(label) ?? 0) + getPaymentNetAmount(payment));
  });

  return [...grouped.entries()].map(([label, amount]) => ({ label, amount })).slice(-8);
}

function groupExpensesByCategory(expenses: ExpenseReportRow[]) {
  const grouped = new Map<string, { id: string; label: string; amount: number; color: string | null }>();

  expenses.forEach((expense) => {
    const id = expense.financialCategory?.id ?? "uncategorized";
    const label = expense.financialCategory?.title ?? "بدون دسته‌بندی";
    const bucket = grouped.get(id) ?? { id, label, amount: 0, color: expense.financialCategory?.color ?? null };
    bucket.amount += toNumber(expense.amount);
    grouped.set(id, bucket);
  });

  return [...grouped.values()].sort((a, b) => b.amount - a.amount).slice(0, 6);
}

export function getPaymentMethodTypeLabel(type: PaymentMethodType | null | undefined) {
  return type ? paymentMethodTypeLabels[type] : "روش دریافت";
}

export function getPaymentCsvRows(data: ReportsData) {
  const rows = [
    ["بخش", "عنوان", "مقدار", "توضیح"],
    ["خلاصه", "مبلغ کل قراردادها", String(data.kpis.contractsTotal), data.filters.range.label],
    ["خلاصه", "مجموع دریافت‌شده", String(data.kpis.receivedTotal), data.filters.range.label],
    ["خلاصه", "مانده قابل دریافت", String(data.kpis.outstandingTotal), data.filters.range.label],
    ["خلاصه", "مجموع هزینه‌ها", String(data.kpis.expensesTotal), data.filters.range.label],
    ["خلاصه", "سود تقریبی", String(data.kpis.estimatedProfit), data.filters.range.label],
    ...data.paymentSummary.latestPayments.map((payment) => [
      "آخرین دریافت‌ها",
      payment.customer?.fullName ?? payment.contract?.contractNo ?? "ثبت نشده",
      String(toNumber(payment.amount)),
      `${getPaymentTypeLabel(payment.type)} - ${getPaymentRecordStatusLabel(payment.status)}`,
    ]),
    ...data.outstandingContracts.map((contract) => [
      "مانده‌ها",
      `${contract.customer.fullName} - ${contract.contractNo}`,
      String(getContractRemaining(contract)),
      contract.eventTypeName ?? "ثبت نشده",
    ]),
    ...data.expenses.latestExpenses.map((expense) => [
      "آخرین هزینه‌ها",
      expense.title || expense.description || "هزینه ثبت‌شده",
      String(toNumber(expense.amount)),
      expense.financialCategory?.title ?? "بدون دسته‌بندی",
    ]),
  ];

  return rows;
}
