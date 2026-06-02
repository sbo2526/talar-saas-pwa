import "server-only";

import { formatJalaliDate, formatJalaliDateTime } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import {
  formatEventLine,
  formatOutstandingLine,
  toNumber,
} from "@/lib/notifications/report-data";

const emptyLine = "موردی ثبت نشده است.";

type RelationName = { name?: string | null } | null | undefined;
type CustomerName = { fullName?: string | null } | null | undefined;
type EventSummaryRow = {
  customer?: CustomerName;
  eventTypeName?: string | null;
  eventStartTime?: string | null;
  guestCount?: number | null;
  hall?: RelationName;
  salon?: RelationName;
  remainingAmount?: unknown;
};
type OutstandingSummaryRow = {
  contractNo?: string | null;
  customer?: CustomerName;
  eventDate?: Date | string | number | null;
  remainingAmount?: unknown;
};
type PaymentSummaryRow = {
  amount?: unknown;
  contract?: { contractNo?: string | null } | null;
  customer?: CustomerName;
};
type ExpenseSummaryRow = {
  title?: string | null;
  amount?: unknown;
  financialCategory?: { title?: string | null } | null;
};
type FinancialData = {
  contractsCount?: number;
  paymentsCount?: number;
  expensesCount?: number;
  contractsTotal?: unknown;
  paymentsTotal?: unknown;
  expensesTotal?: unknown;
  estimatedProfit?: unknown;
};
type OutstandingData = {
  outstandingTotal?: unknown;
  outstandingContractsCount?: number;
  contracts?: OutstandingSummaryRow[];
};
type ReportData = {
  tenantName: string;
  reportPeriod: string;
  financial: FinancialData;
  outstanding: OutstandingData;
  todayEventsCount?: number;
  tomorrowEventsCount?: number;
  tomorrowEvents?: EventSummaryRow[];
  upcomingEvents?: EventSummaryRow[];
  events?: EventSummaryRow[];
  movements?: {
    payments?: PaymentSummaryRow[];
    expenses?: ExpenseSummaryRow[];
  };
  date?: Date;
};

function eventSummary(events: EventSummaryRow[] | undefined) {
  if (!events?.length) return emptyLine;
  return events.map(formatEventLine).join("\n");
}

function outstandingSummary(contracts: OutstandingSummaryRow[] | undefined) {
  if (!contracts?.length) return "مانده قابل پیگیری ثبت نشده است.";
  return contracts.map(formatOutstandingLine).join("\n");
}

function paymentSummary(payments: PaymentSummaryRow[] | undefined) {
  if (!payments?.length) return "دریافتی ثبت نشده است.";
  return payments
    .map((payment) => `- ${payment.customer?.fullName ?? "مشتری"} · ${payment.contract?.contractNo ?? "بدون قرارداد"} · ${formatIRR(toNumber(payment.amount))}`)
    .join("\n");
}

function expenseSummary(expenses: ExpenseSummaryRow[] | undefined) {
  if (!expenses?.length) return "هزینه‌ای ثبت نشده است.";
  return expenses
    .map((expense) => `- ${expense.title ?? "هزینه"} · ${expense.financialCategory?.title ?? "بدون دسته"} · ${formatIRR(toNumber(expense.amount))}`)
    .join("\n");
}

function baseVariables(data: Pick<ReportData, "tenantName" | "reportPeriod">) {
  const now = new Date();
  return {
    tenantName: data.tenantName,
    currentDate: formatJalaliDate(now),
    currentDateTime: formatJalaliDateTime(now),
    reportPeriod: data.reportPeriod,
  };
}

function financialVariables(data: Pick<ReportData, "financial" | "outstanding">) {
  const paymentsTotal = toNumber(data.financial.paymentsTotal);
  const expensesTotal = toNumber(data.financial.expensesTotal);
  const estimatedProfit = toNumber(data.financial.estimatedProfit);
  return {
    contractsCount: formatPersianNumber(data.financial.contractsCount ?? 0),
    todayContractsCount: formatPersianNumber(data.financial.contractsCount ?? 0),
    paymentsCount: formatPersianNumber(data.financial.paymentsCount ?? 0),
    expensesCount: formatPersianNumber(data.financial.expensesCount ?? 0),
    contractsTotal: formatIRR(toNumber(data.financial.contractsTotal)),
    paymentsTotal: formatIRR(paymentsTotal),
    expensesTotal: formatIRR(expensesTotal),
    estimatedProfit: formatIRR(estimatedProfit),
    outstandingTotal: formatIRR(toNumber(data.outstanding.outstandingTotal)),
    outstandingContractsCount: formatPersianNumber(data.outstanding.outstandingContractsCount ?? 0),
  };
}

export function buildDailyReportVariables(data: ReportData) {
  return {
    ...baseVariables(data),
    ...financialVariables(data),
    todayEventsCount: formatPersianNumber(data.todayEventsCount ?? 0),
    tomorrowEventsCount: formatPersianNumber(data.tomorrowEventsCount ?? 0),
    upcomingEventsSummary: eventSummary(data.tomorrowEvents),
    outstandingBalancesSummary: outstandingSummary(data.outstanding.contracts),
    latestPaymentsSummary: paymentSummary(data.movements?.payments),
    latestExpensesSummary: expenseSummary(data.movements?.expenses),
  };
}

export function buildWeeklyReportVariables(data: ReportData) {
  return {
    ...baseVariables(data),
    ...financialVariables(data),
    todayEventsCount: "—",
    tomorrowEventsCount: formatPersianNumber(data.upcomingEvents?.length ?? 0),
    upcomingEventsSummary: eventSummary(data.upcomingEvents),
    outstandingBalancesSummary: outstandingSummary(data.outstanding.contracts),
  };
}

export function buildMonthlyReportVariables(data: ReportData) {
  return {
    ...baseVariables(data),
    ...financialVariables(data),
    todayEventsCount: "—",
    tomorrowEventsCount: formatPersianNumber(data.upcomingEvents?.length ?? 0),
    upcomingEventsSummary: eventSummary(data.upcomingEvents),
    outstandingBalancesSummary: outstandingSummary(data.outstanding.contracts),
  };
}

export function buildTomorrowReminderVariables(data: { tenantName?: string; date?: Date; events?: EventSummaryRow[] }) {
  return {
    tenantName: data.tenantName ?? "تالار",
    currentDate: formatJalaliDate(data.date ?? new Date()),
    currentDateTime: formatJalaliDateTime(new Date()),
    reportPeriod: formatJalaliDate(data.date ?? new Date()),
    tomorrowEventsCount: formatPersianNumber(data.events?.length ?? 0),
    upcomingEventsSummary: eventSummary(data.events),
  };
}

export function buildOutstandingBalanceVariables(data: OutstandingData & { tenantName?: string }) {
  return {
    tenantName: data.tenantName ?? "تالار",
    currentDate: formatJalaliDate(new Date()),
    currentDateTime: formatJalaliDateTime(new Date()),
    reportPeriod: formatJalaliDate(new Date()),
    outstandingTotal: formatIRR(toNumber(data.outstandingTotal)),
    outstandingContractsCount: formatPersianNumber(data.outstandingContractsCount ?? 0),
    outstandingBalancesSummary: outstandingSummary(data.contracts),
  };
}
