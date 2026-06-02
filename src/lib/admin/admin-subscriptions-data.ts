import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getPrisma } from "@/lib/prisma";
import { decimalToNumber, getRemainingDays, normalizeSearchParam } from "@/lib/admin/admin-utils";
import { parseDateLikeToDate } from "@/lib/date/jalali";

export type AdminSubscriptionListParams = {
  q?: string;
  tab?: string;
  view?: string;
  page?: string;
  status?: string;
  demoStatus?: string;
  subscriptionStatus?: string;
  plan?: string;
  sort?: string;
  remainingDays?: string;
  trialStartFrom?: string;
  trialStartTo?: string;
  trialEndFrom?: string;
  trialEndTo?: string;
  activity?: string;
  contracts?: string;
  tickets?: string;
  setup?: string;
  minReceipts?: string;
  maxReceipts?: string;
};

export type AdminSalesHealthTone = "emerald" | "amber" | "rose" | "navy";
export type AdminPeriodStatus =
  | "active-demo"
  | "ending-demo"
  | "expired-demo"
  | "active-subscription"
  | "ending-subscription"
  | "expired-subscription"
  | "canceled-subscription"
  | "registered";

export type AdminSetupCompleteness = {
  label: "کامل" | "ناقص";
  tone: "emerald" | "amber";
  percent: number;
  missingItems: string[];
  hasHallProfile: boolean;
  hasCatalog: boolean;
  hasLogo: boolean;
};

export type AdminSalesHealth = {
  label: "سالم" | "نیازمند پیگیری" | "فوری" | "تبدیل‌شده";
  tone: AdminSalesHealthTone;
  reasons: string[];
};

export type AdminSubscriptionListItem = {
  tenantId: string;
  hallName: string;
  ownerName: string;
  ownerEmail: string;
  ownerMobile: string | null;
  createdAt: Date;
  planName: string;
  planKey: string | null;
  rawSubscriptionStatus: string | null;
  status: AdminPeriodStatus;
  statusLabel: string;
  statusTone: AdminSalesHealthTone;
  isTrial: boolean;
  isConverted: boolean;
  trialStartsAt: Date | null;
  trialEndsAt: Date | null;
  subscriptionStartsAt: Date | null;
  subscriptionEndsAt: Date | null;
  periodStartsAt: Date | null;
  periodEndsAt: Date | null;
  remainingDays: number | null;
  expiredDays: number | null;
  contractsCount: number;
  customersCount: number;
  receiptsTotal: number;
  openTicketsCount: number;
  urgentTicketsCount: number;
  lastActivityAt: Date | null;
  lastOwnerLoginAt: Date | null;
  setupCompleteness: AdminSetupCompleteness;
  salesHealth: AdminSalesHealth;
  availableActions: {
    detailsHref: string;
    supportHref: string | null;
    manageHref: string;
  };
};

export type AdminSubscriptionsPageData = {
  kpis: {
    activeDemos: number;
    demosEndingSoon: number;
    expiredDemos: number;
    needsRenewal: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    convertedSubscriptions: number;
    renewalsThisWeek: number;
    averageDemoRemainingDays: number | null;
    subscriptionRevenueAvailable: false;
  };
  needsFollowUp: AdminSubscriptionListItem[];
  funnel: Array<{ key: string; label: string; count: number }>;
  conversionRate: number | null;
  tabCounts: Record<string, number>;
  subscriptions: AdminSubscriptionListItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  from: number;
  to: number;
  currentFilters: Required<Pick<AdminSubscriptionListParams, "tab" | "view" | "sort">> & AdminSubscriptionListParams;
  filterOptions: {
    plans: Array<{ value: string; label: string }>;
    statuses: Array<{ value: string; label: string }>;
  };
};

type CountMap = Map<string, number>;
type DateMap = Map<string, Date | null>;

const PAGE_SIZE = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const PLAN_LABELS: Record<string, string> = {
  DEMO: "دوره بررسی",
  STARTER: "شروع",
  PROFESSIONAL: "حرفه‌ای",
  ENTERPRISE: "سازمانی",
};

const STATUS_LABELS: Record<AdminPeriodStatus, string> = {
  "active-demo": "دوره بررسی فعال",
  "ending-demo": "دوره بررسی رو به پایان",
  "expired-demo": "دوره بررسی منقضی‌شده",
  "active-subscription": "اشتراک فعال",
  "ending-subscription": "اشتراک رو به پایان",
  "expired-subscription": "اشتراک منقضی‌شده",
  "canceled-subscription": "اشتراک لغوشده",
  registered: "ثبت‌نام‌شده",
};

function getPage(value: string | undefined) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function parseMoneyFilter(value: string | undefined) {
  if (!value) return null;
  const normalized = String(value)
    .replace(/[٬,،\s]/g, "")
    .replace(/[۰-۹٠-٩]/g, (digit) => {
      const persian = "۰۱۲۳۴۵۶۷۸۹".indexOf(digit);
      if (persian >= 0) return String(persian);
      const arabic = "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
      return arabic >= 0 ? String(arabic) : digit;
    });
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseDayFilter(value: string | undefined) {
  const parsed = parseDateLikeToDate(value);
  return parsed && Number.isFinite(parsed.getTime()) ? parsed : null;
}

function endOfDay(date: Date | null) {
  if (!date) return null;
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCMilliseconds(next.getUTCMilliseconds() - 1);
  return next;
}

function daysSince(date: Date | null | undefined) {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / DAY_MS);
}

function latestDate(...dates: Array<Date | null | undefined>) {
  const valid = dates.filter((date): date is Date => Boolean(date));
  if (valid.length === 0) return null;
  return new Date(Math.max(...valid.map((date) => date.getTime())));
}

function getCountMap(rows: Array<{ tenantId: string; _count?: { _all?: number; id?: number } }>) {
  const map: CountMap = new Map();
  rows.forEach((row) => map.set(row.tenantId, row._count?._all ?? row._count?.id ?? 0));
  return map;
}

function getDateMap(rows: Array<{ tenantId: string; _max?: Record<string, Date | null> }>, key: string) {
  const map: DateMap = new Map();
  rows.forEach((row) => map.set(row.tenantId, row._max?.[key] ?? null));
  return map;
}

function getPlanLabel(plan: string | null | undefined) {
  return PLAN_LABELS[plan ?? ""] ?? "بدون پلن";
}

function buildSetupCompleteness(input: {
  hallProfile: {
    brandName?: string | null;
    phone?: string | null;
    address?: string | null;
    hallLogoUrl?: string | null;
  } | null;
  hallsCount: number;
  salonsCount: number;
  servicesCount: number;
  menusCount: number;
  paymentMethodsCount: number;
  hasContractSettings: boolean;
}): AdminSetupCompleteness {
  const checks = [
    { label: "اطلاعات تالار", ok: Boolean(input.hallProfile?.brandName && input.hallProfile?.phone && input.hallProfile?.address) },
    { label: "تالارها و سالن‌ها", ok: input.hallsCount > 0 && input.salonsCount > 0 },
    { label: "خدمات و منو", ok: input.servicesCount > 0 && input.menusCount > 0 },
    { label: "روش‌های دریافت", ok: input.paymentMethodsCount > 0 },
    { label: "تنظیمات قرارداد", ok: input.hasContractSettings },
  ];
  const completed = checks.filter((item) => item.ok).length;
  const missingItems = checks.filter((item) => !item.ok).map((item) => item.label);
  const percent = Math.round((completed / checks.length) * 100);

  return {
    label: missingItems.length === 0 ? "کامل" : "ناقص",
    tone: missingItems.length === 0 ? "emerald" : "amber",
    percent,
    missingItems,
    hasHallProfile: Boolean(input.hallProfile?.brandName && input.hallProfile?.phone && input.hallProfile?.address),
    hasCatalog: input.servicesCount > 0 && input.menusCount > 0,
    hasLogo: Boolean(input.hallProfile?.hallLogoUrl),
  };
}

function getPeriodStatus(input: {
  subscriptionStatus: string | null;
  plan: string | null;
  isTrial: boolean;
  remainingDays: number | null;
}): AdminPeriodStatus {
  const isPaidPlan = Boolean(input.plan && input.plan !== "DEMO");

  if (input.subscriptionStatus === "ACTIVE" && isPaidPlan) {
    if (input.remainingDays !== null && input.remainingDays >= 0 && input.remainingDays <= 7) {
      return "ending-subscription";
    }
    return "active-subscription";
  }

  if (input.subscriptionStatus === "CANCELED") return "canceled-subscription";
  if (input.subscriptionStatus === "EXPIRED" || input.subscriptionStatus === "PAST_DUE") {
    return isPaidPlan ? "expired-subscription" : "expired-demo";
  }

  if (input.isTrial) {
    if (input.remainingDays !== null && input.remainingDays < 0) return "expired-demo";
    if (input.remainingDays !== null && input.remainingDays <= 7) return "ending-demo";
    return "active-demo";
  }

  return "registered";
}

function getStatusTone(status: AdminPeriodStatus): AdminSalesHealthTone {
  if (status === "active-subscription") return "emerald";
  if (status === "active-demo" || status === "ending-demo" || status === "ending-subscription") return "amber";
  if (status === "registered") return "navy";
  return "rose";
}

function buildSalesHealth(input: {
  status: AdminPeriodStatus;
  isConverted: boolean;
  isTrial: boolean;
  remainingDays: number | null;
  expiredDays: number | null;
  contractsCount: number;
  openTicketsCount: number;
  urgentTicketsCount: number;
  setupCompleteness: AdminSetupCompleteness;
  createdAt: Date;
  lastActivityAt: Date | null;
}): AdminSalesHealth {
  if (input.isConverted && input.status === "active-subscription") {
    return { label: "تبدیل‌شده", tone: "emerald", reasons: ["اشتراک فعال دارد"] };
  }

  const reasons: string[] = [];
  const inactivityDays = input.lastActivityAt ? daysSince(input.lastActivityAt) : daysSince(input.createdAt);

  if (input.status === "expired-demo") reasons.push("دوره بررسی منقضی شده");
  if (input.status === "expired-subscription") reasons.push("اشتراک منقضی شده");
  if (input.status === "canceled-subscription") reasons.push("اشتراک لغو شده");
  if ((input.status === "ending-demo" || input.status === "ending-subscription") && input.remainingDays !== null) {
    reasons.push(input.remainingDays <= 3 ? "پایان دوره بسیار نزدیک است" : "پایان دوره نزدیک است");
  }
  if (input.isTrial && input.contractsCount === 0 && inactivityDays !== null && inactivityDays >= 7) {
    reasons.push("بدون فعالیت در دوره دوره بررسی");
  }
  if (input.setupCompleteness.label === "ناقص") reasons.push("اطلاعات تالار ناقص است");
  if (input.urgentTicketsCount > 0) reasons.push("تیکت فوری باز دارد");
  else if (input.openTicketsCount > 0) reasons.push("تیکت باز دارد");
  if (input.isTrial && input.contractsCount > 0) reasons.push("آماده تبدیل به اشتراک است");

  const uniqueReasons = Array.from(new Set(reasons));
  const urgent = input.status === "expired-demo"
    || input.status === "expired-subscription"
    || input.status === "canceled-subscription"
    || input.urgentTicketsCount > 0
    || (input.remainingDays !== null && input.remainingDays >= 0 && input.remainingDays <= 3);

  if (urgent) return { label: "فوری", tone: "rose", reasons: uniqueReasons.slice(0, 4) };
  if (uniqueReasons.length > 0) return { label: "نیازمند پیگیری", tone: "amber", reasons: uniqueReasons.slice(0, 4) };
  return { label: "سالم", tone: "emerald", reasons: ["وضعیت فروش پایدار است"] };
}

function matchesSmartTab(item: AdminSubscriptionListItem, tab: string) {
  if (!tab || tab === "all") return true;
  if (tab === "active-demo") return item.status === "active-demo" || item.status === "ending-demo";
  if (tab === "ending-soon") return item.remainingDays !== null && item.remainingDays >= 0 && item.remainingDays <= 7;
  if (tab === "expired") return item.status === "expired-demo" || item.status === "expired-subscription" || item.status === "canceled-subscription";
  if (tab === "renewal") return item.salesHealth.label === "فوری" || item.salesHealth.label === "نیازمند پیگیری";
  if (tab === "active-subscription") return item.status === "active-subscription" || item.status === "ending-subscription";
  if (tab === "inactive") return item.isTrial && (!item.lastActivityAt || (daysSince(item.lastActivityAt) ?? 0) >= 7);
  if (tab === "converted") return item.isConverted;
  return true;
}

function matchesAdvancedFilters(item: AdminSubscriptionListItem, params: AdminSubscriptionListParams) {
  if (params.status && params.status !== "all" && item.status !== params.status) return false;
  if (params.demoStatus === "active" && !(item.status === "active-demo" || item.status === "ending-demo")) return false;
  if (params.demoStatus === "ending" && item.status !== "ending-demo") return false;
  if (params.demoStatus === "expired" && item.status !== "expired-demo") return false;
  if (params.subscriptionStatus === "active" && !(item.status === "active-subscription" || item.status === "ending-subscription")) return false;
  if (params.subscriptionStatus === "ending" && item.status !== "ending-subscription") return false;
  if (params.subscriptionStatus === "expired" && !(item.status === "expired-subscription" || item.status === "canceled-subscription")) return false;
  if (params.plan && params.plan !== "all" && item.planKey !== params.plan) return false;

  if (params.remainingDays === "0-3" && !(item.remainingDays !== null && item.remainingDays >= 0 && item.remainingDays <= 3)) return false;
  if (params.remainingDays === "4-7" && !(item.remainingDays !== null && item.remainingDays >= 4 && item.remainingDays <= 7)) return false;
  if (params.remainingDays === "expired" && !(item.remainingDays !== null && item.remainingDays < 0)) return false;
  if (params.remainingDays === "unknown" && item.remainingDays !== null) return false;

  const trialStartFrom = parseDayFilter(params.trialStartFrom);
  const trialStartTo = endOfDay(parseDayFilter(params.trialStartTo));
  const trialEndFrom = parseDayFilter(params.trialEndFrom);
  const trialEndTo = endOfDay(parseDayFilter(params.trialEndTo));

  if (trialStartFrom && (!item.trialStartsAt || item.trialStartsAt < trialStartFrom)) return false;
  if (trialStartTo && (!item.trialStartsAt || item.trialStartsAt > trialStartTo)) return false;
  if (trialEndFrom && (!item.trialEndsAt || item.trialEndsAt < trialEndFrom)) return false;
  if (trialEndTo && (!item.trialEndsAt || item.trialEndsAt > trialEndTo)) return false;

  if (params.activity === "active-7" && (!item.lastActivityAt || (daysSince(item.lastActivityAt) ?? 999) > 7)) return false;
  if (params.activity === "inactive-7" && item.lastActivityAt && (daysSince(item.lastActivityAt) ?? 0) < 7) return false;
  if (params.activity === "inactive-14" && item.lastActivityAt && (daysSince(item.lastActivityAt) ?? 0) < 14) return false;
  if (params.activity === "none" && item.lastActivityAt) return false;

  if (params.contracts === "has" && item.contractsCount <= 0) return false;
  if (params.contracts === "none" && item.contractsCount > 0) return false;
  if (params.tickets === "open" && item.openTicketsCount <= 0) return false;
  if (params.tickets === "none" && item.openTicketsCount > 0) return false;
  if (params.setup === "complete" && item.setupCompleteness.label !== "کامل") return false;
  if (params.setup === "incomplete" && item.setupCompleteness.label !== "ناقص") return false;

  const minReceipts = parseMoneyFilter(params.minReceipts);
  const maxReceipts = parseMoneyFilter(params.maxReceipts);
  if (minReceipts !== null && item.receiptsTotal < minReceipts) return false;
  if (maxReceipts !== null && item.receiptsTotal > maxReceipts) return false;

  return true;
}

function sortItems(items: AdminSubscriptionListItem[], sort: string | undefined) {
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (sort === "oldest") return a.createdAt.getTime() - b.createdAt.getTime();
    if (sort === "trial-ending") return (a.periodEndsAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.periodEndsAt?.getTime() ?? Number.MAX_SAFE_INTEGER);
    if (sort === "most-activity") return (b.lastActivityAt?.getTime() ?? 0) - (a.lastActivityAt?.getTime() ?? 0);
    if (sort === "least-activity") return (a.lastActivityAt?.getTime() ?? 0) - (b.lastActivityAt?.getTime() ?? 0);
    if (sort === "contracts") return b.contractsCount - a.contractsCount;
    if (sort === "receipts") return b.receiptsTotal - a.receiptsTotal;
    if (sort === "follow-up") {
      const score = (item: AdminSubscriptionListItem) => (item.salesHealth.tone === "rose" ? 4 : item.salesHealth.tone === "amber" ? 3 : item.salesHealth.label === "تبدیل‌شده" ? 2 : 1);
      return score(b) - score(a);
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  return sorted;
}

function getBaseWhere(params: AdminSubscriptionListParams) {
  const q = normalizeSearchParam(params.q);
  return q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { owner: { is: { name: { contains: q, mode: "insensitive" as const } } } },
          { owner: { is: { email: { contains: q, mode: "insensitive" as const } } } },
          { owner: { is: { phone: { contains: q, mode: "insensitive" as const } } } },
          { hallProfile: { is: { brandName: { contains: q, mode: "insensitive" as const } } } },
          { hallProfile: { is: { phone: { contains: q, mode: "insensitive" as const } } } },
          { hallProfile: { is: { mobile: { contains: q, mode: "insensitive" as const } } } },
        ],
      }
    : {};
}

export async function getAdminSubscriptionsPageData(params: AdminSubscriptionListParams): Promise<AdminSubscriptionsPageData> {
  await requirePlatformAdmin();

  const db = await getPrisma();
  const page = getPage(params.page);
  const where = getBaseWhere(params);

  const [
    tenants,
    paymentSums,
    paymentLasts,
    contractLasts,
    ticketLasts,
    auditLasts,
    expenseLasts,
    openTickets,
    urgentTickets,
    serviceCounts,
    menuCounts,
    paymentMethodCounts,
    hallCounts,
    salonCounts,
    contractSettingCounts,
  ] = await Promise.all([
    db.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { name: true, email: true, phone: true, lastLoginAt: true } },
        subscription: true,
        hallProfile: { select: { brandName: true, phone: true, mobile: true, address: true, hallLogoUrl: true } },
        demoAccesses: { select: { status: true, usedAt: true, expiresAt: true }, orderBy: { usedAt: "desc" }, take: 1 },
        _count: { select: { contracts: true, customers: true } },
      },
    }),
    db.payment.groupBy({ by: ["tenantId"], _sum: { amount: true }, _count: { _all: true }, where: { status: { notIn: ["CANCELED", "VOID"] } } }),
    db.payment.groupBy({ by: ["tenantId"], _max: { paidAt: true }, where: { status: { notIn: ["CANCELED", "VOID"] } } }),
    db.contract.groupBy({ by: ["tenantId"], _max: { createdAt: true } }),
    db.supportTicket.groupBy({ by: ["tenantId"], _max: { lastMessageAt: true } }),
    db.auditLog.groupBy({ by: ["tenantId"], _max: { createdAt: true } }),
    db.expense.groupBy({ by: ["tenantId"], _max: { createdAt: true } }),
    db.supportTicket.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { status: { not: "CLOSED" } } }),
    db.supportTicket.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { status: { not: "CLOSED" }, priority: "URGENT" } }),
    db.service.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { isActive: true } }),
    db.menu.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { isActive: true } }),
    db.paymentMethod.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { isActive: true } }),
    db.hall.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { isActive: true } }),
    db.salon.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { isActive: true } }),
    db.contractSetting.groupBy({ by: ["tenantId"], _count: { _all: true } }),
  ]);

  const paymentSumByTenant = new Map(paymentSums.map((item) => [item.tenantId, decimalToNumber(item._sum.amount)]));
  const lastReceiptByTenant = getDateMap(paymentLasts, "paidAt");
  const lastContractByTenant = getDateMap(contractLasts, "createdAt");
  const lastTicketByTenant = getDateMap(ticketLasts, "lastMessageAt");
  const lastAuditByTenant = getDateMap(auditLasts, "createdAt");
  const lastExpenseByTenant = getDateMap(expenseLasts, "createdAt");
  const openTicketsByTenant = getCountMap(openTickets);
  const urgentTicketsByTenant = getCountMap(urgentTickets);
  const servicesByTenant = getCountMap(serviceCounts);
  const menusByTenant = getCountMap(menuCounts);
  const paymentMethodsByTenant = getCountMap(paymentMethodCounts);
  const hallsByTenant = getCountMap(hallCounts);
  const salonsByTenant = getCountMap(salonCounts);
  const contractSettingsByTenant = getCountMap(contractSettingCounts);

  const enriched: AdminSubscriptionListItem[] = tenants.map((tenant) => {
    const subscription = tenant.subscription;
    const demoAccess = tenant.demoAccesses[0] ?? null;
    const isPaidPlan = Boolean(subscription?.plan && subscription.plan !== "DEMO");
    const isTrial = subscription?.status === "TRIALING" || subscription?.plan === "DEMO" || tenant.status === "DEMO";
    const trialStartsAt = subscription?.plan === "DEMO" || subscription?.status === "TRIALING"
      ? subscription.currentPeriodStart ?? demoAccess?.usedAt ?? tenant.createdAt
      : demoAccess?.usedAt ?? null;
    const trialEndsAt = subscription?.plan === "DEMO" || subscription?.status === "TRIALING"
      ? subscription.currentPeriodEnd ?? demoAccess?.expiresAt ?? null
      : demoAccess?.expiresAt ?? null;
    const subscriptionStartsAt = isPaidPlan ? subscription?.currentPeriodStart ?? null : null;
    const subscriptionEndsAt = isPaidPlan ? subscription?.currentPeriodEnd ?? null : null;
    const periodStartsAt = isPaidPlan ? subscriptionStartsAt : trialStartsAt;
    const periodEndsAt = isPaidPlan ? subscriptionEndsAt : trialEndsAt;
    const remainingDays = getRemainingDays(periodEndsAt);
    const expiredDays = remainingDays !== null && remainingDays < 0 ? Math.abs(remainingDays) : null;
    const lastContractAt = lastContractByTenant.get(tenant.id) ?? null;
    const lastReceiptAt = lastReceiptByTenant.get(tenant.id) ?? null;
    const lastActivityAt = latestDate(
      lastAuditByTenant.get(tenant.id),
      lastContractAt,
      lastReceiptAt,
      lastExpenseByTenant.get(tenant.id),
      lastTicketByTenant.get(tenant.id),
      tenant.owner.lastLoginAt,
    );
    const setupCompleteness = buildSetupCompleteness({
      hallProfile: tenant.hallProfile,
      hallsCount: hallsByTenant.get(tenant.id) ?? 0,
      salonsCount: salonsByTenant.get(tenant.id) ?? 0,
      servicesCount: servicesByTenant.get(tenant.id) ?? 0,
      menusCount: menusByTenant.get(tenant.id) ?? 0,
      paymentMethodsCount: paymentMethodsByTenant.get(tenant.id) ?? 0,
      hasContractSettings: (contractSettingsByTenant.get(tenant.id) ?? 0) > 0,
    });
    const status = getPeriodStatus({
      subscriptionStatus: subscription?.status ?? null,
      plan: subscription?.plan ?? null,
      isTrial,
      remainingDays,
    });
    const isConverted = subscription?.status === "ACTIVE" && isPaidPlan;
    const openTicketsCount = openTicketsByTenant.get(tenant.id) ?? 0;
    const urgentTicketsCount = urgentTicketsByTenant.get(tenant.id) ?? 0;
    const salesHealth = buildSalesHealth({
      status,
      isConverted,
      isTrial,
      remainingDays,
      expiredDays,
      contractsCount: tenant._count.contracts,
      openTicketsCount,
      urgentTicketsCount,
      setupCompleteness,
      createdAt: tenant.createdAt,
      lastActivityAt,
    });

    return {
      tenantId: tenant.id,
      hallName: tenant.hallProfile?.brandName || tenant.name,
      ownerName: tenant.owner.name || "مالک ثبت‌نشده",
      ownerEmail: tenant.owner.email,
      ownerMobile: tenant.owner.phone ?? tenant.hallProfile?.mobile ?? tenant.hallProfile?.phone ?? null,
      createdAt: tenant.createdAt,
      planName: getPlanLabel(subscription?.plan),
      planKey: subscription?.plan ?? null,
      rawSubscriptionStatus: subscription?.status ?? null,
      status,
      statusLabel: STATUS_LABELS[status],
      statusTone: getStatusTone(status),
      isTrial,
      isConverted,
      trialStartsAt,
      trialEndsAt,
      subscriptionStartsAt,
      subscriptionEndsAt,
      periodStartsAt,
      periodEndsAt,
      remainingDays,
      expiredDays,
      contractsCount: tenant._count.contracts,
      customersCount: tenant._count.customers,
      receiptsTotal: paymentSumByTenant.get(tenant.id) ?? 0,
      openTicketsCount,
      urgentTicketsCount,
      lastActivityAt,
      lastOwnerLoginAt: tenant.owner.lastLoginAt,
      setupCompleteness,
      salesHealth,
      availableActions: {
        detailsHref: `/admin/tenants/${tenant.id}`,
        supportHref: openTicketsCount > 0 ? `/admin/support?tenantId=${tenant.id}` : null,
        manageHref: `/admin/tenants/${tenant.id}`,
      },
    };
  });

  const activeDemos = enriched.filter((item) => item.status === "active-demo" || item.status === "ending-demo").length;
  const demosEndingSoon = enriched.filter((item) => item.status === "ending-demo").length;
  const expiredDemos = enriched.filter((item) => item.status === "expired-demo").length;
  const activeSubscriptions = enriched.filter((item) => item.status === "active-subscription" || item.status === "ending-subscription").length;
  const expiredSubscriptions = enriched.filter((item) => item.status === "expired-subscription" || item.status === "canceled-subscription").length;
  const convertedSubscriptions = enriched.filter((item) => item.isConverted).length;
  const needsRenewal = enriched.filter((item) => item.salesHealth.label === "فوری" || item.salesHealth.label === "نیازمند پیگیری").length;
  const renewalsThisWeek = enriched.filter((item) => item.status === "ending-subscription" && item.remainingDays !== null && item.remainingDays <= 7).length;
  const demoRemaining = enriched
    .filter((item) => item.isTrial && item.remainingDays !== null && item.remainingDays >= 0)
    .map((item) => item.remainingDays as number);
  const averageDemoRemainingDays = demoRemaining.length > 0
    ? Math.round(demoRemaining.reduce((sum, days) => sum + days, 0) / demoRemaining.length)
    : null;

  const tabCounts = {
    all: enriched.length,
    activeDemo: enriched.filter((item) => matchesSmartTab(item, "active-demo")).length,
    endingSoon: enriched.filter((item) => matchesSmartTab(item, "ending-soon")).length,
    expired: enriched.filter((item) => matchesSmartTab(item, "expired")).length,
    renewal: enriched.filter((item) => matchesSmartTab(item, "renewal")).length,
    activeSubscription: enriched.filter((item) => matchesSmartTab(item, "active-subscription")).length,
    inactive: enriched.filter((item) => matchesSmartTab(item, "inactive")).length,
    converted: enriched.filter((item) => matchesSmartTab(item, "converted")).length,
  };

  const filtered = sortItems(
    enriched
      .filter((item) => matchesSmartTab(item, params.tab ?? "all"))
      .filter((item) => matchesAdvancedFilters(item, params)),
    params.sort,
  );

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const subscriptions = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const followUpScore = (item: AdminSubscriptionListItem) => {
    let score = item.salesHealth.tone === "rose" ? 100 : item.salesHealth.tone === "amber" ? 60 : 0;
    if (item.remainingDays !== null && item.remainingDays >= 0) score += Math.max(0, 10 - item.remainingDays);
    if (item.contractsCount > 0 && item.isTrial) score += 12;
    if (item.openTicketsCount > 0) score += 10;
    return score;
  };
  const needsFollowUp = enriched
    .filter((item) => item.salesHealth.label === "فوری" || item.salesHealth.label === "نیازمند پیگیری")
    .sort((a, b) => followUpScore(b) - followUpScore(a))
    .slice(0, 6);
  const conversionRate = activeDemos + expiredDemos + convertedSubscriptions > 0
    ? Math.round((convertedSubscriptions / (activeDemos + expiredDemos + convertedSubscriptions)) * 100)
    : null;

  return {
    kpis: {
      activeDemos,
      demosEndingSoon,
      expiredDemos,
      needsRenewal,
      activeSubscriptions,
      expiredSubscriptions,
      convertedSubscriptions,
      renewalsThisWeek,
      averageDemoRemainingDays,
      subscriptionRevenueAvailable: false,
    },
    needsFollowUp,
    funnel: [
      { key: "registered", label: "ثبت‌نام‌شده", count: enriched.length },
      { key: "active-demo", label: "دوره بررسی فعال", count: activeDemos },
      { key: "ending-demo", label: "دوره بررسی رو به پایان", count: demosEndingSoon },
      { key: "expired-demo", label: "منقضی‌شده", count: expiredDemos },
      { key: "active-subscription", label: "اشتراک فعال", count: activeSubscriptions },
    ],
    conversionRate,
    tabCounts,
    subscriptions,
    totalCount,
    page: currentPage,
    limit: PAGE_SIZE,
    totalPages,
    from: totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1,
    to: Math.min(currentPage * PAGE_SIZE, totalCount),
    currentFilters: {
      ...params,
      tab: params.tab ?? "all",
      view: params.view === "table" ? "table" : "cards",
      sort: params.sort ?? "follow-up",
    },
    filterOptions: {
      plans: [
        { value: "DEMO", label: "دوره بررسی" },
        { value: "STARTER", label: "شروع" },
        { value: "PROFESSIONAL", label: "حرفه‌ای" },
        { value: "ENTERPRISE", label: "سازمانی" },
      ],
      statuses: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
    },
  };
}
