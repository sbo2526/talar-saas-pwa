import "server-only";

import { formatJalaliDate, formatJalaliDayKey, dateToJalaliParts, jalaliToDate } from "@/lib/date/jalali";
import { formatIRR } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";

const validFinancialStatuses = ["RECORDED", "CONFIRMED", "PAID", "SETTLED"];
const excludedStatuses = ["CANCELED", "CANCELLED", "RETURNED", "VOID"];

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "object" && "toString" in value) return Number(value.toString()) || 0;
  return Number(value) || 0;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getDayRange(date: Date) {
  const start = startOfUtcDay(date);
  return { start, end: addDays(start, 1) };
}

function getWeekRange(date: Date) {
  const day = startOfUtcDay(date);
  const weekday = (day.getUTCDay() + 1) % 7;
  const start = addDays(day, -weekday);
  return { start, end: addDays(start, 7) };
}

function getMonthRange(date: Date) {
  const parts = dateToJalaliParts(date);
  const start = jalaliToDate(parts.year, parts.month, 1);
  const nextMonth = parts.month === 12 ? 1 : parts.month + 1;
  const nextYear = parts.month === 12 ? parts.year + 1 : parts.year;
  const end = jalaliToDate(nextYear, nextMonth, 1);
  return { start, end, label: `${parts.year}/${String(parts.month).padStart(2, "0")}` };
}

type Db = {
  tenant: { findUnique(args: unknown): Promise<{ id: string; name: string } | null> };
  contract: {
    count(args: unknown): Promise<number>;
    aggregate(args: unknown): Promise<{ _sum?: Record<string, unknown>; _avg?: Record<string, unknown> }>;
    findMany(args: unknown): Promise<Array<Record<string, unknown>>>;
  };
  payment: {
    count(args: unknown): Promise<number>;
    aggregate(args: unknown): Promise<{ _sum?: Record<string, unknown> }>;
    findMany(args: unknown): Promise<Array<Record<string, unknown>>>;
  };
  expense: {
    count(args: unknown): Promise<number>;
    aggregate(args: unknown): Promise<{ _sum?: Record<string, unknown> }>;
    findMany(args: unknown): Promise<Array<Record<string, unknown>>>;
  };
};

async function getDb() {
  return (await getPrisma()) as unknown as Db;
}

async function getTenantName(tenantId: string) {
  const db = await getDb();
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true } });
  return tenant?.name ?? "تالار";
}

async function getFinancialSnapshot(tenantId: string, start: Date, end: Date) {
  const db = await getDb();
  const [contractsCount, contractsTotal, paymentsTotal, paymentsCount, expensesTotal, expensesCount] = await Promise.all([
    db.contract.count({ where: { tenantId, eventDate: { gte: start, lt: end }, status: { not: "CANCELED" } } }),
    db.contract.aggregate({ where: { tenantId, eventDate: { gte: start, lt: end }, status: { not: "CANCELED" } }, _sum: { finalTotal: true, remainingAmount: true } }),
    db.payment.aggregate({ where: { tenantId, paidAt: { gte: start, lt: end }, status: { in: validFinancialStatuses } }, _sum: { amount: true } }),
    db.payment.count({ where: { tenantId, paidAt: { gte: start, lt: end }, status: { in: validFinancialStatuses } } }),
    db.expense.aggregate({ where: { tenantId, occurredAt: { gte: start, lt: end }, status: { notIn: excludedStatuses } }, _sum: { amount: true } }),
    db.expense.count({ where: { tenantId, occurredAt: { gte: start, lt: end }, status: { notIn: excludedStatuses } } }),
  ]);
  const payments = toNumber(paymentsTotal._sum?.amount);
  const expenses = toNumber(expensesTotal._sum?.amount);
  return {
    contractsCount,
    contractsTotal: toNumber(contractsTotal._sum?.finalTotal),
    paymentsTotal: payments,
    paymentsCount,
    expensesTotal: expenses,
    expensesCount,
    estimatedProfit: payments - expenses,
  };
}

export async function getTomorrowEventReminderData(tenantId: string, date: Date = new Date()) {
  const db = await getDb();
  const tomorrow = addDays(startOfUtcDay(date), 1);
  const { start, end } = getDayRange(tomorrow);
  const events = await db.contract.findMany({
    where: { tenantId, eventDate: { gte: start, lt: end }, status: { not: "CANCELED" } },
    select: {
      id: true,
      contractNo: true,
      eventTypeName: true,
      eventDate: true,
      eventStartTime: true,
      guestCount: true,
      remainingAmount: true,
      customer: { select: { fullName: true, phone: true } },
      hall: { select: { name: true } },
      salon: { select: { name: true } },
    },
    orderBy: [{ eventDate: "asc" }, { eventStartTime: "asc" }],
    take: 10,
  });
  return { date: start, events };
}

export async function getOutstandingBalanceReminderData(tenantId: string) {
  const db = await getDb();
  const contracts = await db.contract.findMany({
    where: { tenantId, remainingAmount: { gt: 0 }, status: { not: "CANCELED" } },
    select: {
      id: true,
      contractNo: true,
      eventDate: true,
      finalTotal: true,
      remainingAmount: true,
      customer: { select: { fullName: true, phone: true } },
    },
    orderBy: [{ remainingAmount: "desc" }, { eventDate: "asc" }],
    take: 10,
  });
  const outstandingTotal = contracts.reduce((sum, contract) => sum + toNumber(contract.remainingAmount), 0);
  return { contracts, outstandingTotal, outstandingContractsCount: contracts.length };
}

async function latestMovements(tenantId: string, start: Date, end: Date) {
  const db = await getDb();
  const [payments, expenses] = await Promise.all([
    db.payment.findMany({
      where: { tenantId, paidAt: { gte: start, lt: end }, status: { in: validFinancialStatuses } },
      select: { amount: true, paidAt: true, contract: { select: { contractNo: true } }, customer: { select: { fullName: true } } },
      orderBy: { paidAt: "desc" },
      take: 5,
    }),
    db.expense.findMany({
      where: { tenantId, occurredAt: { gte: start, lt: end }, status: { notIn: excludedStatuses } },
      select: { title: true, amount: true, occurredAt: true, financialCategory: { select: { title: true } } },
      orderBy: { occurredAt: "desc" },
      take: 5,
    }),
  ]);
  return { payments, expenses };
}

export async function getDailyNotificationReportData(tenantId: string, date: Date = new Date()) {
  const tenantName = await getTenantName(tenantId);
  const { start, end } = getDayRange(date);
  const tomorrow = await getTomorrowEventReminderData(tenantId, date);
  const outstanding = await getOutstandingBalanceReminderData(tenantId);
  const financial = await getFinancialSnapshot(tenantId, start, end);
  const movements = await latestMovements(tenantId, start, end);
  const db = await getDb();
  const todayEventsCount = await db.contract.count({ where: { tenantId, eventDate: { gte: start, lt: end }, status: { not: "CANCELED" } } });
  return { tenantId, tenantName, date: start, reportPeriod: formatJalaliDate(start), todayEventsCount, tomorrowEventsCount: tomorrow.events.length, tomorrowEvents: tomorrow.events, outstanding, financial, movements };
}

export async function getWeeklyNotificationReportData(tenantId: string, date: Date = new Date()) {
  const tenantName = await getTenantName(tenantId);
  const { start, end } = getWeekRange(date);
  const financial = await getFinancialSnapshot(tenantId, start, end);
  const outstanding = await getOutstandingBalanceReminderData(tenantId);
  const nextWeekEvents = await (await getDb()).contract.findMany({
    where: { tenantId, eventDate: { gte: end, lt: addDays(end, 7) }, status: { not: "CANCELED" } },
    select: { id: true, contractNo: true, eventTypeName: true, eventDate: true, eventStartTime: true, guestCount: true, remainingAmount: true, customer: { select: { fullName: true } }, hall: { select: { name: true } }, salon: { select: { name: true } } },
    orderBy: { eventDate: "asc" },
    take: 10,
  });
  return { tenantId, tenantName, date: start, reportPeriod: `${formatJalaliDate(start)} تا ${formatJalaliDate(addDays(end, -1))}`, upcomingEvents: nextWeekEvents, outstanding, financial };
}

export async function getMonthlyNotificationReportData(tenantId: string, date: Date = new Date()) {
  const tenantName = await getTenantName(tenantId);
  const { start, end, label } = getMonthRange(date);
  const financial = await getFinancialSnapshot(tenantId, start, end);
  const outstanding = await getOutstandingBalanceReminderData(tenantId);
  const db = await getDb();
  const events = await db.contract.findMany({
    where: { tenantId, eventDate: { gte: start, lt: end }, status: { not: "CANCELED" } },
    select: { id: true, contractNo: true, eventTypeName: true, eventDate: true, eventStartTime: true, guestCount: true, remainingAmount: true, customer: { select: { fullName: true } }, hall: { select: { name: true } }, salon: { select: { name: true } } },
    orderBy: { eventDate: "asc" },
    take: 10,
  });
  return { tenantId, tenantName, date: start, reportPeriod: label, upcomingEvents: events, outstanding, financial };
}

type NamedRelation = { name?: string | null } | null | undefined;
type CustomerRelation = { fullName?: string | null } | null | undefined;
type EventLike = {
  customer?: CustomerRelation;
  eventTypeName?: string | null;
  eventStartTime?: string | null;
  guestCount?: number | null;
  hall?: NamedRelation;
  salon?: NamedRelation;
  remainingAmount?: unknown;
};
type ContractLike = {
  contractNo?: string | null;
  customer?: CustomerRelation;
  eventDate?: Date | string | number | null;
  remainingAmount?: unknown;
};

export function formatEventLine(event: EventLike) {
  const customer = event.customer?.fullName ?? "مشتری ثبت نشده";
  const type = event.eventTypeName ?? "مراسم";
  const time = event.eventStartTime ?? "ساعت ثبت نشده";
  const guests = event.guestCount ? `${event.guestCount} مهمان` : "تعداد مهمان ثبت نشده";
  const location = [event.hall?.name, event.salon?.name].filter(Boolean).join(" / ") || "محل ثبت نشده";
  const remaining = toNumber(event.remainingAmount) > 0 ? ` · مانده: ${formatIRR(toNumber(event.remainingAmount))}` : "";
  return `- ${customer} · ${type} · ${time} · ${guests} · ${location}${remaining}`;
}

export function formatOutstandingLine(contract: ContractLike) {
  return `- ${contract.contractNo ?? "قرارداد"} · ${contract.customer?.fullName ?? "مشتری"} · ${formatJalaliDate(contract.eventDate)} · مانده: ${formatIRR(toNumber(contract.remainingAmount))}`;
}

export { toNumber, getDayRange, getWeekRange, getMonthRange, addDays, startOfUtcDay };
