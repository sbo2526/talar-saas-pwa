import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getPrisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/admin/admin-utils";
import {
  dateToJalaliParts,
  formatJalaliDate,
  formatJalaliMonthTitle,
  getJalaliMonthRange,
  getPreviousJalaliMonth,
  getTodayJalali,
  jalaliToDate,
  parseDateLikeToDate,
  toDateOnlyString,
} from "@/lib/date/jalali";

export type AdminReportsParams = {
  period?: string;
  from?: string;
  to?: string;
  reportType?: string;
  status?: string;
  plan?: string;
  sort?: string;
};

export type AdminReportsTone = "emerald" | "amber" | "rose" | "navy" | "slate";

export type AdminReportKpi = {
  key: string;
  title: string;
  value: number;
  formattedValue?: string;
  helper: string;
  tone: AdminReportsTone;
  comparison?: {
    value: number;
    label: string;
    tone: AdminReportsTone;
  };
};

export type AdminTrendPoint = {
  label: string;
  tenants: number;
  contracts: number;
  receipts: number;
  users: number;
};

export type AdminReportTopTenant = {
  id: string;
  hallName: string;
  ownerName: string;
  ownerEmail: string;
  statusLabel: string;
  statusTone: AdminReportsTone;
  planLabel: string;
  planTone: AdminReportsTone;
  contractsCount: number;
  customersCount: number;
  receiptsTotal: number;
  ticketsCount: number;
  lastActivityAt: Date | null;
  createdAt: Date;
  href: string;
};

export type AdminReportsPageData = {
  filters: {
    period: string;
    reportType: string;
    status: string;
    plan: string;
    sort: string;
    fromValue: string;
    toValue: string;
    rangeLabel: string;
  };
  kpis: AdminReportKpi[];
  growthTrends: AdminTrendPoint[];
  financialAnalytics: {
    totalReceipts: number;
    periodReceipts: number;
    totalExpenses: number;
    periodExpenses: number;
    approximateProfit: number;
    averageContractAmount: number | null;
    topReceiptTenant: AdminReportTopTenant | null;
    outstandingTotal: number;
    monthlyReceipts: Array<{ label: string; value: number }>;
    tenantReceipts: Array<{ label: string; value: number; href: string }>;
    expenseCategories: Array<{ label: string; value: number }>;
  };
  tenantAnalytics: {
    activePercent: number;
    inactivePercent: number;
    averageContractsPerTenant: number;
    mostActive: AdminReportTopTenant[];
    inactiveTenants: AdminReportTopTenant[];
    noContractTenants: AdminReportTopTenant[];
    incompleteTenants: AdminReportTopTenant[];
    topContracts: AdminReportTopTenant[];
    topReceipts: AdminReportTopTenant[];
  };
  subscriptionAnalytics: {
    funnel: Array<{ key: string; label: string; count: number }>;
    activeDemos: number;
    demosEndingSoon: number;
    expiredDemos: number;
    needsRenewal: number;
    convertedSubscriptions: number;
    conversionRate: number | null;
    paidBillingEnabled: false;
  };
  supportAnalytics: {
    totalTickets: number;
    openTickets: number;
    urgentTickets: number;
    closedTickets: number;
    waitingSupport: number;
    waitingUser: number;
    averageResponseMinutes: number | null;
    topCategory: string | null;
    topTicketTenants: AdminReportTopTenant[];
    byStatus: Array<{ label: string; count: number; tone: AdminReportsTone }>;
    byPriority: Array<{ label: string; count: number; tone: AdminReportsTone }>;
    byCategory: Array<{ label: string; count: number; tone: AdminReportsTone }>;
  };
  topTenants: AdminReportTopTenant[];
  actionableInsights: Array<{
    key: string;
    title: string;
    description: string;
    tone: AdminReportsTone;
    href?: string;
    action?: string;
  }>;
  exportAvailability: {
    csv: false;
    excel: false;
    pdf: false;
    message: string;
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;

const periodLabels: Record<string, string> = {
  today: "امروز",
  week: "این هفته",
  month: "این ماه",
  quarter: "سه ماه اخیر",
  year: "امسال",
  custom: "سفارشی",
};

const reportTypeLabels: Record<string, string> = {
  overview: "نمای کلی",
  growth: "رشد سامانه",
  finance: "مالی",
  subscription: "دوره بررسی و اشتراک",
  support: "پشتیبانی",
  activity: "فعالیت تالارها",
};

const tenantStatusLabels: Record<string, string> = {
  ACTIVE: "فعال",
  DEMO: "دوره بررسی فعال",
  SUSPENDED: "تعلیق‌شده",
  ARCHIVED: "آرشیوشده",
};

const subscriptionStatusLabels: Record<string, string> = {
  ACTIVE: "اشتراک فعال",
  TRIALING: "دوره بررسی فعال",
  EXPIRED: "منقضی‌شده",
  PAST_DUE: "نیازمند تمدید",
  CANCELED: "لغوشده",
};

const supportStatusLabels: Record<string, string> = {
  OPEN: "باز",
  IN_REVIEW: "در حال بررسی",
  ANSWERED: "پاسخ داده‌شده",
  WAITING_FOR_USER: "منتظر پاسخ کاربر",
  WAITING_FOR_SUPPORT: "منتظر پاسخ پشتیبانی",
  CLOSED: "بسته‌شده",
};

const supportPriorityLabels: Record<string, string> = {
  LOW: "کم",
  NORMAL: "متوسط",
  HIGH: "زیاد",
  URGENT: "فوری",
};

const supportCategoryLabels: Record<string, string> = {
  TECHNICAL: "فنی",
  BILLING: "مالی / اشتراک",
  ACCOUNT: "حساب کاربری",
  FEATURE: "درخواست قابلیت",
  OTHER: "سایر",
  CONTRACT: "قرارداد",
  PAYMENTS: "دریافتی‌ها",
  EXPENSES: "هزینه‌ها",
  REPORTS: "گزارش‌ها",
  CONTRACT_PRINT: "چاپ قرارداد",
  NOTIFICATIONS: "اعلان‌ها",
  TRAINING: "آموزش",
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function safePeriod(value: string | undefined) {
  return value && value in periodLabels ? value : "month";
}

function safeReportType(value: string | undefined) {
  return value && value in reportTypeLabels ? value : "overview";
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getDateRange(params: AdminReportsParams) {
  const period = safePeriod(params.period);
  const today = getTodayJalali();
  const todayDate = jalaliToDate(today.year, today.month, today.day);
  let startDate: Date;
  let endDate: Date;

  if (period === "today") {
    startDate = todayDate;
    endDate = addDays(todayDate, 1);
  } else if (period === "week") {
    const weekdayIndex = (todayDate.getUTCDay() + 1) % 7;
    startDate = addDays(todayDate, -weekdayIndex);
    endDate = addDays(startDate, 7);
  } else if (period === "quarter") {
    const first = getJalaliMonthRange(today.month <= 2 ? today.year - 1 : today.year, today.month <= 2 ? today.month + 10 : today.month - 2);
    startDate = first.startDate;
    endDate = addDays(todayDate, 1);
  } else if (period === "year") {
    startDate = jalaliToDate(today.year, 1, 1);
    endDate = jalaliToDate(today.year + 1, 1, 1);
  } else if (period === "custom") {
    const from = parseDateLikeToDate(params.from);
    const to = parseDateLikeToDate(params.to);
    const fallback = getJalaliMonthRange(today.year, today.month);
    startDate = startOfUtcDay(from ?? fallback.startDate);
    endDate = to ? addDays(startOfUtcDay(to), 1) : fallback.endDate;
    if (endDate <= startDate) endDate = addDays(startDate, 1);
  } else {
    const range = getJalaliMonthRange(today.year, today.month);
    startDate = range.startDate;
    endDate = range.endDate;
  }

  const previousEndDate = startDate;
  const previousStartDate = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
  const inclusiveEnd = addDays(endDate, -1);
  const startParts = dateToJalaliParts(startDate);
  const label = period === "month" ? formatJalaliMonthTitle(startParts.year, startParts.month) : `${formatJalaliDate(startDate)} تا ${formatJalaliDate(inclusiveEnd)}`;

  return {
    period,
    startDate,
    endDate,
    previousStartDate,
    previousEndDate,
    fromValue: toDateOnlyString(startDate),
    toValue: toDateOnlyString(inclusiveEnd),
    label,
  };
}

function getStatusTone(status: string | null | undefined): AdminReportsTone {
  if (status === "ACTIVE") return "emerald";
  if (status === "DEMO" || status === "TRIALING") return "amber";
  if (status === "SUSPENDED" || status === "ARCHIVED" || status === "EXPIRED" || status === "PAST_DUE" || status === "CANCELED") return "rose";
  return "slate";
}

function getSupportTone(value: string | null | undefined): AdminReportsTone {
  if (value === "CLOSED" || value === "LOW") return "emerald";
  if (value === "URGENT" || value === "OPEN" || value === "WAITING_FOR_SUPPORT") return "rose";
  if (value === "HIGH" || value === "IN_REVIEW") return "amber";
  return "navy";
}

function getPlanLabel(subscription: { plan: string; status: string } | null) {
  if (!subscription) return { label: "بدون پلن", tone: "slate" as AdminReportsTone };
  if (subscription.status === "ACTIVE" && subscription.plan !== "DEMO") return { label: "اشتراک فعال", tone: "emerald" as AdminReportsTone };
  if (subscription.status === "TRIALING" || subscription.plan === "DEMO") return { label: "دوره بررسی", tone: "amber" as AdminReportsTone };
  if (subscription.status === "EXPIRED" || subscription.status === "PAST_DUE") return { label: "منقضی‌شده", tone: "rose" as AdminReportsTone };
  return { label: subscriptionStatusLabels[subscription.status] ?? "ثبت‌شده", tone: getStatusTone(subscription.status) };
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function buildComparison(current: number, previous: number) {
  const change = percentChange(current, previous);
  if (change === null) return undefined;
  return {
    value: change,
    label: `${change > 0 ? "+" : ""}${change}% نسبت به دوره قبل`,
    tone: change >= 0 ? "emerald" as AdminReportsTone : "rose" as AdminReportsTone,
  };
}

function countMap<T extends { tenantId: string; _count?: { _all?: number; id?: number } }>(rows: T[]) {
  return new Map(rows.map((row) => [row.tenantId, row._count?._all ?? row._count?.id ?? 0]));
}

function sumMap<T extends { tenantId: string; _sum?: Record<string, unknown> }>(rows: T[], key: string) {
  return new Map(rows.map((row) => [row.tenantId, decimalToNumber(row._sum?.[key])]));
}

function dateMap<T extends { tenantId: string; _max?: Record<string, Date | null> }>(rows: T[], key: string) {
  return new Map(rows.map((row) => [row.tenantId, row._max?.[key] ?? null]));
}

function latestDate(...dates: Array<Date | null | undefined>) {
  const valid = dates.filter((date): date is Date => Boolean(date));
  if (valid.length === 0) return null;
  return new Date(Math.max(...valid.map((date) => date.getTime())));
}

function isInactive(date: Date | null) {
  if (!date) return true;
  return Date.now() - date.getTime() >= 7 * DAY_MS;
}

function maxValue(rows: Array<{ value: number }>) {
  return Math.max(1, ...rows.map((row) => row.value));
}

async function buildTrends(rangeEnd: Date) {
  const db = await getPrisma();
  const endParts = dateToJalaliParts(addDays(rangeEnd, -1));
  const months = Array.from({ length: 6 }).map((_, index) => {
    let year = endParts.year;
    let month = endParts.month;
    for (let i = 0; i < 5 - index; i += 1) {
      const previous = getPreviousJalaliMonth(year, month);
      year = previous.year;
      month = previous.month;
    }
    const range = getJalaliMonthRange(year, month);
    return { label: formatJalaliMonthTitle(year, month), startDate: range.startDate, endDate: range.endDate };
  });

  return Promise.all(months.map(async (month) => {
    const [tenants, contracts, receipts, users] = await Promise.all([
      db.tenant.count({ where: { createdAt: { gte: month.startDate, lt: month.endDate } } }),
      db.contract.count({ where: { createdAt: { gte: month.startDate, lt: month.endDate } } }),
      db.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: month.startDate, lt: month.endDate }, status: { notIn: ["CANCELED", "VOID"] } } }),
      db.user.count({ where: { createdAt: { gte: month.startDate, lt: month.endDate } } }),
    ]);

    return {
      label: month.label,
      tenants,
      contracts,
      receipts: decimalToNumber(receipts._sum.amount),
      users,
    };
  }));
}

export async function getAdminReportsPageData(params: AdminReportsParams = {}): Promise<AdminReportsPageData> {
  await requirePlatformAdmin();
  const db = await getPrisma();
  const range = getDateRange(params);
  const now = new Date();
  const reportType = safeReportType(params.reportType);
  const sort = params.sort ?? "receipts";

  const [
    totalTenants,
    activeTenants,
    newTenantsInRange,
    newTenantsPrevious,
    totalUsers,
    activeUsers,
    activeDemos,
    demosEndingSoon,
    expiredDemos,
    totalContracts,
    contractsInRange,
    contractsPrevious,
    totalReceipts,
    receiptsInRange,
    receiptsPrevious,
    totalExpenses,
    expensesInRange,
    totalTickets,
    openTickets,
    urgentTickets,
    closedTickets,
    supportMessages,
    tenants,
    contractCounts,
    customerCounts,
    paymentSums,
    ticketCounts,
    contractLasts,
    paymentLasts,
    ticketLasts,
    auditLasts,
    hallCounts,
    serviceCounts,
    menuCounts,
    expenseCategories,
    supportStatusCounts,
    supportPriorityCounts,
    supportCategoryCounts,
    trends,
  ] = await Promise.all([
    db.tenant.count(),
    db.tenant.count({ where: { status: "ACTIVE" } }),
    db.tenant.count({ where: { createdAt: { gte: range.startDate, lt: range.endDate } } }),
    db.tenant.count({ where: { createdAt: { gte: range.previousStartDate, lt: range.previousEndDate } } }),
    db.user.count(),
    db.user.count({ where: { lastLoginAt: { gte: addDays(now, -30) } } }),
    db.subscription.count({ where: { OR: [{ status: "TRIALING" }, { plan: "DEMO", status: { notIn: ["EXPIRED", "CANCELED"] } }] } }),
    db.subscription.count({ where: { currentPeriodEnd: { gte: now, lte: addDays(now, 7) }, status: { in: ["TRIALING", "ACTIVE"] } } }),
    db.subscription.count({ where: { OR: [{ status: "EXPIRED" }, { currentPeriodEnd: { lt: now }, status: { not: "ACTIVE" } }] } }),
    db.contract.count(),
    db.contract.count({ where: { createdAt: { gte: range.startDate, lt: range.endDate } } }),
    db.contract.count({ where: { createdAt: { gte: range.previousStartDate, lt: range.previousEndDate } } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { status: { notIn: ["CANCELED", "VOID"] } } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: range.startDate, lt: range.endDate }, status: { notIn: ["CANCELED", "VOID"] } } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: range.previousStartDate, lt: range.previousEndDate }, status: { notIn: ["CANCELED", "VOID"] } } }),
    db.expense.aggregate({ _sum: { amount: true }, where: { status: { notIn: ["CANCELED", "VOID"] } } }),
    db.expense.aggregate({ _sum: { amount: true }, where: { occurredAt: { gte: range.startDate, lt: range.endDate }, status: { notIn: ["CANCELED", "VOID"] } } }),
    db.supportTicket.count(),
    db.supportTicket.count({ where: { status: { not: "CLOSED" } } }),
    db.supportTicket.count({ where: { priority: "URGENT", status: { not: "CLOSED" } } }),
    db.supportTicket.count({ where: { status: "CLOSED" } }),
    db.supportTicket.findMany({ select: { id: true, createdAt: true, status: true, messages: { orderBy: { createdAt: "asc" }, select: { senderType: true, createdAt: true } } } }),
    db.tenant.findMany({
      include: {
        owner: { select: { name: true, email: true, lastLoginAt: true } },
        hallProfile: { select: { brandName: true, phone: true, address: true } },
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
      },
    }),
    db.contract.groupBy({ by: ["tenantId"], _count: { _all: true }, _sum: { finalTotal: true } }),
    db.customer.groupBy({ by: ["tenantId"], _count: { _all: true } }),
    db.payment.groupBy({ by: ["tenantId"], _sum: { amount: true }, where: { status: { notIn: ["CANCELED", "VOID"] } } }),
    db.supportTicket.groupBy({ by: ["tenantId"], _count: { _all: true } }),
    db.contract.groupBy({ by: ["tenantId"], _max: { createdAt: true } }),
    db.payment.groupBy({ by: ["tenantId"], _max: { paidAt: true }, where: { status: { notIn: ["CANCELED", "VOID"] } } }),
    db.supportTicket.groupBy({ by: ["tenantId"], _max: { lastMessageAt: true } }),
    db.auditLog.groupBy({ by: ["tenantId"], _max: { createdAt: true } }),
    db.hall.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { isActive: true } }),
    db.service.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { isActive: true } }),
    db.menu.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { isActive: true } }),
    db.expense.groupBy({ by: ["financialCategoryId"], _sum: { amount: true }, where: { occurredAt: { gte: range.startDate, lt: range.endDate }, status: { notIn: ["CANCELED", "VOID"] } } }),
    db.supportTicket.groupBy({ by: ["status"], _count: { _all: true } }),
    db.supportTicket.groupBy({ by: ["priority"], _count: { _all: true } }),
    db.supportTicket.groupBy({ by: ["category"], _count: { _all: true } }),
    buildTrends(range.endDate),
  ]);

  const contractsByTenant = countMap(contractCounts);
  const customersByTenant = countMap(customerCounts);
  const paymentsByTenant = sumMap(paymentSums, "amount");
  const ticketsByTenant = countMap(ticketCounts);
  const lastContractByTenant = dateMap(contractLasts, "createdAt");
  const lastPaymentByTenant = dateMap(paymentLasts, "paidAt");
  const lastTicketByTenant = dateMap(ticketLasts, "lastMessageAt");
  const lastAuditByTenant = dateMap(auditLasts, "createdAt");
  const hallsByTenant = countMap(hallCounts);
  const servicesByTenant = countMap(serviceCounts);
  const menusByTenant = countMap(menuCounts);
  const expenseCategoryTitles = new Map(
    (await db.financialCategory.findMany({
      where: { id: { in: expenseCategories.map((row) => row.financialCategoryId).filter((id): id is string => Boolean(id)) } },
      select: { id: true, title: true },
    })).map((category) => [category.id, category.title]),
  );

  const enrichedTenants: AdminReportTopTenant[] = tenants.map((tenant) => {
    const plan = getPlanLabel(tenant.subscription);
    const lastActivityAt = latestDate(
      tenant.owner.lastLoginAt,
      lastContractByTenant.get(tenant.id),
      lastPaymentByTenant.get(tenant.id),
      lastTicketByTenant.get(tenant.id),
      lastAuditByTenant.get(tenant.id),
    );

    return {
      id: tenant.id,
      hallName: tenant.hallProfile?.brandName || tenant.name,
      ownerName: tenant.owner.name || tenant.owner.email,
      ownerEmail: tenant.owner.email,
      statusLabel: tenantStatusLabels[tenant.status] ?? "نامشخص",
      statusTone: getStatusTone(tenant.status),
      planLabel: plan.label,
      planTone: plan.tone,
      contractsCount: contractsByTenant.get(tenant.id) ?? 0,
      customersCount: customersByTenant.get(tenant.id) ?? 0,
      receiptsTotal: paymentsByTenant.get(tenant.id) ?? 0,
      ticketsCount: ticketsByTenant.get(tenant.id) ?? 0,
      lastActivityAt,
      createdAt: tenant.createdAt,
      href: `/admin/tenants/${tenant.id}`,
    };
  });

  const filteredTenants = enrichedTenants.filter((tenant) => {
    if (params.status === "active" && tenant.statusLabel !== "فعال") return false;
    if (params.status === "inactive" && !isInactive(tenant.lastActivityAt)) return false;
    if (params.status === "demo" && tenant.planLabel !== "دوره بررسی") return false;
    if (params.status === "expired" && !tenant.planLabel.includes("منقضی")) return false;
    if (params.plan === "demo" && tenant.planLabel !== "دوره بررسی") return false;
    if (params.plan === "active" && tenant.planLabel !== "اشتراک فعال") return false;
    if (params.plan === "expired" && !tenant.planLabel.includes("منقضی")) return false;
    return true;
  });

  const sortTenants = (items: AdminReportTopTenant[], sortKey = sort) => [...items].sort((a, b) => {
    if (sortKey === "contracts") return b.contractsCount - a.contractsCount;
    if (sortKey === "activity") return (b.lastActivityAt?.getTime() ?? 0) - (a.lastActivityAt?.getTime() ?? 0);
    if (sortKey === "newest") return b.createdAt.getTime() - a.createdAt.getTime();
    if (sortKey === "follow-up") {
      const score = (item: AdminReportTopTenant) => (isInactive(item.lastActivityAt) ? 2 : 0) + (item.ticketsCount > 0 ? 1 : 0);
      return score(b) - score(a);
    }
    if (sortKey === "tickets") return b.ticketsCount - a.ticketsCount;
    return b.receiptsTotal - a.receiptsTotal;
  });

  const totalReceiptsValue = decimalToNumber(totalReceipts._sum.amount);
  const periodReceiptsValue = decimalToNumber(receiptsInRange._sum.amount);
  const totalExpensesValue = decimalToNumber(totalExpenses._sum.amount);
  const periodExpensesValue = decimalToNumber(expensesInRange._sum.amount);
  const totalContractsFinal = contractCounts.reduce((sum, row) => sum + decimalToNumber(row._sum.finalTotal), 0);
  const averageContractAmount = totalContracts > 0 ? Math.round(totalContractsFinal / totalContracts) : null;
  const outstandingTotal = totalContractsFinal - totalReceiptsValue;
  const inactiveTenants = enrichedTenants.filter((tenant) => isInactive(tenant.lastActivityAt));
  const incompleteTenants = tenants.filter((tenant) => {
    const hasProfile = Boolean(tenant.hallProfile?.brandName && tenant.hallProfile?.phone && tenant.hallProfile?.address);
    const hasBase = (hallsByTenant.get(tenant.id) ?? 0) > 0 && (servicesByTenant.get(tenant.id) ?? 0) > 0 && (menusByTenant.get(tenant.id) ?? 0) > 0;
    return !hasProfile || !hasBase;
  });
  const convertedSubscriptions = tenants.filter((tenant) => tenant.subscription?.status === "ACTIVE" && tenant.subscription.plan !== "DEMO").length;
  const needsRenewal = demosEndingSoon + expiredDemos;
  const conversionBase = activeDemos + expiredDemos + convertedSubscriptions;
  const conversionRate = conversionBase > 0 ? Math.round((convertedSubscriptions / conversionBase) * 100) : null;

  const supportResponseTimes = supportMessages
    .map((ticket) => {
      const firstSupport = ticket.messages.find((message) => message.senderType === "SUPPORT");
      return firstSupport ? Math.max(0, Math.floor((firstSupport.createdAt.getTime() - ticket.createdAt.getTime()) / (60 * 1000))) : null;
    })
    .filter((value): value is number => value !== null);
  const averageResponseMinutes = supportResponseTimes.length
    ? Math.round(supportResponseTimes.reduce((sum, value) => sum + value, 0) / supportResponseTimes.length)
    : null;
  const waitingSupport = supportMessages.filter((ticket) => {
    if (ticket.status === "CLOSED") return false;
    const last = ticket.messages.filter((message) => message.senderType !== "INTERNAL_NOTE").at(-1);
    return !ticket.messages.some((message) => message.senderType === "SUPPORT") || last?.senderType === "USER";
  }).length;
  const waitingUser = supportMessages.filter((ticket) => {
    if (ticket.status === "CLOSED") return false;
    const last = ticket.messages.filter((message) => message.senderType !== "INTERNAL_NOTE").at(-1);
    return last?.senderType === "SUPPORT";
  }).length;

  const byStatus = supportStatusCounts.map((row) => ({ label: supportStatusLabels[row.status] ?? "نامشخص", count: row._count._all, tone: getSupportTone(row.status) }));
  const byPriority = supportPriorityCounts.map((row) => ({ label: supportPriorityLabels[row.priority] ?? "نامشخص", count: row._count._all, tone: getSupportTone(row.priority) }));
  const byCategory = supportCategoryCounts.map((row) => ({ label: supportCategoryLabels[row.category] ?? "سایر", count: row._count._all, tone: "navy" as AdminReportsTone }));
  const topCategory = [...byCategory].sort((a, b) => b.count - a.count)[0]?.label ?? null;
  const topReceiptTenant = sortTenants(enrichedTenants, "receipts")[0] ?? null;
  const topTenants = sortTenants(filteredTenants).slice(0, 10);

  const insights: AdminReportsPageData["actionableInsights"] = [];
  if (demosEndingSoon > 0) insights.push({ key: "ending-demos", title: `${demosEndingSoon} دوره بررسی در ۷ روز آینده به پایان می‌رسد.`, description: "برای تبدیل یا تمدید، پیگیری فروش لازم است.", tone: "amber", href: "/admin/subscriptions?tab=ending-soon", action: "مشاهده دوره‌های بررسی" });
  if (incompleteTenants.length > 0) insights.push({ key: "incomplete", title: `${incompleteTenants.length} تالار اطلاعات پایه ناقص دارد.`, description: "تکمیل راه‌اندازی می‌تواند استفاده از سامانه را افزایش دهد.", tone: "amber", href: "/admin/tenants?tab=incomplete", action: "مشاهده تالارها" });
  if (inactiveTenants.length > 0) insights.push({ key: "inactive", title: `${inactiveTenants.length} تالار در ۷ روز اخیر فعالیتی نداشته‌اند.`, description: "این تالارها برای تماس موفقیت مشتری مناسب هستند.", tone: "rose", href: "/admin/tenants?tab=inactive", action: "پیگیری فعالیت" });
  if (urgentTickets > 0) insights.push({ key: "urgent", title: `${urgentTickets} تیکت فوری نیازمند پاسخ است.`, description: "اولویت رسیدگی پشتیبانی را روی موارد فوری قرار دهید.", tone: "rose", href: "/admin/support?tab=urgent", action: "مشاهده تیکت‌ها" });
  if (topReceiptTenant && topReceiptTenant.receiptsTotal > 0) insights.push({ key: "top-receipts", title: `تالار «${topReceiptTenant.hallName}» بیشترین دریافتی را در این دوره داشته است.`, description: "این تالار می‌تواند الگوی استفاده موفق سامانه باشد.", tone: "emerald", href: topReceiptTenant.href, action: "مشاهده تالار" });

  const kpis: AdminReportKpi[] = [
    { key: "total-tenants", title: "کل تالارها", value: totalTenants, helper: "همه تالارهای ثبت‌شده", tone: "navy" },
    { key: "active-tenants", title: "تالارهای فعال", value: activeTenants, helper: "وضعیت فعال در سامانه", tone: "emerald" },
    { key: "new-tenants", title: "تالارهای جدید این دوره", value: newTenantsInRange, helper: range.label, tone: "amber", comparison: buildComparison(newTenantsInRange, newTenantsPrevious) },
    { key: "total-users", title: "کل کاربران", value: totalUsers, helper: "همه حساب‌های ثبت‌شده", tone: "navy" },
    { key: "active-users", title: "کاربران فعال", value: activeUsers, helper: "ورود در ۳۰ روز اخیر", tone: "emerald" },
    { key: "active-demos", title: "دوره‌های بررسی فعال", value: activeDemos, helper: "در چرخه بررسی رایگان", tone: "amber" },
    { key: "ending-demos", title: "دوره‌های بررسی نزدیک پایان", value: demosEndingSoon, helper: "پایان تا ۷ روز آینده", tone: demosEndingSoon > 0 ? "rose" : "emerald" },
    { key: "expired-demos", title: "دوره‌های بررسی منقضی‌شده", value: expiredDemos, helper: "نیازمند پیگیری فروش", tone: expiredDemos > 0 ? "rose" : "emerald" },
    { key: "contracts", title: "کل قراردادها", value: totalContracts, helper: "قراردادهای ثبت‌شده", tone: "navy" },
    { key: "period-contracts", title: "قراردادهای این دوره", value: contractsInRange, helper: range.label, tone: "emerald", comparison: buildComparison(contractsInRange, contractsPrevious) },
    { key: "receipts", title: "کل دریافتی‌ها", value: totalReceiptsValue, formattedValue: "money", helper: "دریافتی‌های ثبت‌شده در تالارها", tone: "emerald" },
    { key: "period-receipts", title: "دریافتی این دوره", value: periodReceiptsValue, formattedValue: "money", helper: range.label, tone: "emerald", comparison: buildComparison(periodReceiptsValue, decimalToNumber(receiptsPrevious._sum.amount)) },
    { key: "expenses", title: "کل هزینه‌ها", value: totalExpensesValue, formattedValue: "money", helper: "هزینه‌های ثبت‌شده در تالارها", tone: "rose" },
    { key: "profit", title: "سود تقریبی کل", value: totalReceiptsValue - totalExpensesValue, formattedValue: "money", helper: "دریافتی‌ها منهای هزینه‌ها", tone: totalReceiptsValue >= totalExpensesValue ? "emerald" : "rose" },
    { key: "open-tickets", title: "تیکت‌های باز", value: openTickets, helper: "پرونده‌های پشتیبانی باز", tone: openTickets > 0 ? "amber" : "emerald" },
    { key: "urgent-tickets", title: "تیکت‌های فوری", value: urgentTickets, helper: "نیازمند رسیدگی سریع", tone: urgentTickets > 0 ? "rose" : "emerald" },
  ];

  return {
    filters: {
      period: range.period,
      reportType,
      status: params.status ?? "all",
      plan: params.plan ?? "all",
      sort,
      fromValue: params.from ?? range.fromValue,
      toValue: params.to ?? range.toValue,
      rangeLabel: range.label,
    },
    kpis,
    growthTrends: trends,
    financialAnalytics: {
      totalReceipts: totalReceiptsValue,
      periodReceipts: periodReceiptsValue,
      totalExpenses: totalExpensesValue,
      periodExpenses: periodExpensesValue,
      approximateProfit: totalReceiptsValue - totalExpensesValue,
      averageContractAmount,
      topReceiptTenant,
      outstandingTotal: Math.max(0, outstandingTotal),
      monthlyReceipts: trends.map((point) => ({ label: point.label, value: point.receipts })),
      tenantReceipts: sortTenants(enrichedTenants, "receipts").slice(0, 6).map((tenant) => ({ label: tenant.hallName, value: tenant.receiptsTotal, href: tenant.href })),
      expenseCategories: expenseCategories.map((row) => ({ label: row.financialCategoryId ? (expenseCategoryTitles.get(row.financialCategoryId) ?? "دسته‌بندی مالی") : "بدون دسته‌بندی", value: decimalToNumber(row._sum.amount) })).sort((a, b) => b.value - a.value).slice(0, 6),
    },
    tenantAnalytics: {
      activePercent: totalTenants > 0 ? Math.round((activeTenants / totalTenants) * 100) : 0,
      inactivePercent: totalTenants > 0 ? Math.round((inactiveTenants.length / totalTenants) * 100) : 0,
      averageContractsPerTenant: totalTenants > 0 ? Math.round((totalContracts / totalTenants) * 10) / 10 : 0,
      mostActive: sortTenants(enrichedTenants, "activity").slice(0, 5),
      inactiveTenants: inactiveTenants.slice(0, 5),
      noContractTenants: enrichedTenants.filter((tenant) => tenant.contractsCount === 0).slice(0, 5),
      incompleteTenants: enrichedTenants.filter((tenant) => incompleteTenants.some((raw) => raw.id === tenant.id)).slice(0, 5),
      topContracts: sortTenants(enrichedTenants, "contracts").slice(0, 5),
      topReceipts: sortTenants(enrichedTenants, "receipts").slice(0, 5),
    },
    subscriptionAnalytics: {
      funnel: [
        { key: "registered", label: "ثبت‌نام‌شده", count: totalTenants },
        { key: "active-demo", label: "دوره بررسی فعال", count: activeDemos },
        { key: "ending-demo", label: "نزدیک پایان", count: demosEndingSoon },
        { key: "expired", label: "منقضی‌شده", count: expiredDemos },
        { key: "active-subscription", label: "اشتراک فعال", count: convertedSubscriptions },
      ],
      activeDemos,
      demosEndingSoon,
      expiredDemos,
      needsRenewal,
      convertedSubscriptions,
      conversionRate,
      paidBillingEnabled: false,
    },
    supportAnalytics: {
      totalTickets,
      openTickets,
      urgentTickets,
      closedTickets,
      waitingSupport,
      waitingUser,
      averageResponseMinutes,
      topCategory,
      topTicketTenants: sortTenants(enrichedTenants, "tickets").slice(0, 5),
      byStatus,
      byPriority,
      byCategory,
    },
    topTenants,
    actionableInsights: insights,
    exportAvailability: {
      csv: false,
      excel: false,
      pdf: false,
      message: "خروجی فایل در نسخه بعدی فعال می‌شود.",
    },
  };
}

export async function getAdminReportsData() {
  return getAdminReportsPageData({});
}

export { maxValue };
