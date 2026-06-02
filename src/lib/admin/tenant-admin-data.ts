/* eslint-disable @typescript-eslint/no-explicit-any */
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getPrisma } from "@/lib/prisma";
import { decimalToNumber, getRemainingDays, normalizeSearchParam } from "@/lib/admin/admin-utils";

export type AdminTenantListParams = {
  q?: string;
  status?: string;
  plan?: string;
  sort?: string;
  tab?: string;
  view?: string;
  page?: string;
  activity?: string;
  setup?: string;
  tickets?: string;
  contracts?: string;
  minReceipts?: string;
  maxReceipts?: string;
};

export type TenantHealthTone = "emerald" | "amber" | "rose";

export type AdminTenantHealth = {
  label: "خوب" | "نیازمند پیگیری" | "در خطر ریزش";
  tone: TenantHealthTone;
  reasons: string[];
};

export type AdminTenantSetupCompleteness = {
  label: "کامل" | "ناقص";
  tone: "emerald" | "amber";
  percent: number;
  completedCount: number;
  totalCount: number;
  missingItems: string[];
};

export type AdminTenantListItem = {
  id: string;
  name: string;
  displayName: string;
  createdAt: Date;
  status: string;
  owner: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    lastLoginAt: Date | null;
  };
  subscription: {
    plan: string | null;
    status: string | null;
    currentPeriodEnd: Date | null;
  } | null;
  trialEndsAt: Date | null;
  remainingTrialDays: number | null;
  usersCount: number;
  customersCount: number;
  contractsCount: number;
  receiptsTotal: number;
  receiptsCount: number;
  openTicketsCount: number;
  urgentTicketsCount: number;
  servicesCount: number;
  menusCount: number;
  paymentMethodsCount: number;
  hallsCount: number;
  salonsCount: number;
  hasContractSettings: boolean;
  hasHallProfile: boolean;
  hasLogo: boolean;
  lastOwnerLoginAt: Date | null;
  lastActivityAt: Date | null;
  lastContractAt: Date | null;
  lastReceiptAt: Date | null;
  lastTicketAt: Date | null;
  setupCompleteness: AdminTenantSetupCompleteness;
  health: AdminTenantHealth;
  availableActions: {
    detailsHref: string;
    previewHref: string;
    supportHref: string;
    subscriptionHref: string;
  };
};

type CountMap = Map<string, number>;
type DateMap = Map<string, Date | null>;

const PAGE_SIZE = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

function getPage(value: string | undefined) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function parseMoneyFilter(value: string | undefined) {
  if (!value) return null;
  const normalized = String(value).replace(/[٬,،\s]/g, "").replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = "۰۱۲۳۴۵۶۷۸۹".indexOf(digit);
    if (persian >= 0) return String(persian);
    const arabic = "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
    return arabic >= 0 ? String(arabic) : digit;
  });
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
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

function getDateMap(rows: any[], key: string) {
  const map: DateMap = new Map();
  rows.forEach((row) => map.set(row.tenantId, row._max?.[key] ?? null));
  return map;
}

function getCountMap(rows: any[]) {
  const map: CountMap = new Map();
  rows.forEach((row) => map.set(row.tenantId, row._count?._all ?? row._count?.id ?? 0));
  return map;
}

function buildSetupCompleteness(input: {
  hallProfile: any;
  hallsCount: number;
  salonsCount: number;
  servicesCount: number;
  menusCount: number;
  paymentMethodsCount: number;
  hasContractSettings: boolean;
}): AdminTenantSetupCompleteness {
  const checks = [
    { label: "اطلاعات تالار", ok: Boolean(input.hallProfile?.brandName && input.hallProfile?.phone && input.hallProfile?.address) },
    { label: "لوگوی تالار", ok: Boolean(input.hallProfile?.hallLogoUrl) },
    { label: "تالارها", ok: input.hallsCount > 0 },
    { label: "سالن‌ها", ok: input.salonsCount > 0 },
    { label: "خدمات مراسم", ok: input.servicesCount > 0 },
    { label: "منوی پذیرایی", ok: input.menusCount > 0 },
    { label: "روش‌های دریافت", ok: input.paymentMethodsCount > 0 },
    { label: "تنظیمات قرارداد", ok: input.hasContractSettings },
  ];

  const completedCount = checks.filter((item) => item.ok).length;
  const percent = Math.round((completedCount / checks.length) * 100);
  const missingItems = checks.filter((item) => !item.ok).map((item) => item.label);

  return {
    label: completedCount === checks.length ? "کامل" : "ناقص",
    tone: completedCount === checks.length ? "emerald" : "amber",
    percent,
    completedCount,
    totalCount: checks.length,
    missingItems,
  };
}

function buildTenantHealth(input: {
  subscriptionStatus?: string | null;
  remainingTrialDays: number | null;
  openTicketsCount: number;
  urgentTicketsCount: number;
  setupCompleteness: AdminTenantSetupCompleteness;
  contractsCount: number;
  createdAt: Date;
  lastActivityAt: Date | null;
}): AdminTenantHealth {
  const reasons: string[] = [];
  const inactivityDays = input.lastActivityAt ? daysSince(input.lastActivityAt) : daysSince(input.createdAt);

  if (input.subscriptionStatus === "EXPIRED" || input.subscriptionStatus === "PAST_DUE" || input.subscriptionStatus === "CANCELED") {
    reasons.push(input.subscriptionStatus === "CANCELED" ? "اشتراک لغوشده" : "اشتراک/دوره بررسی منقضی");
  }

  if (input.remainingTrialDays !== null && input.remainingTrialDays >= 0 && input.remainingTrialDays <= 7) {
    reasons.push("دوره بررسی رو به پایان");
  }

  if (input.urgentTicketsCount > 0) {
    reasons.push("تیکت فوری باز");
  } else if (input.openTicketsCount > 0) {
    reasons.push("تیکت باز");
  }

  if (input.setupCompleteness.label === "ناقص") {
    reasons.push("اطلاعات ناقص");
  }

  if (input.contractsCount === 0 && daysSince(input.createdAt)! >= 3) {
    reasons.push("بدون قرارداد");
  }

  if (inactivityDays !== null && inactivityDays >= 14) {
    reasons.push("بدون فعالیت ۱۴ روز اخیر");
  } else if (inactivityDays !== null && inactivityDays >= 7) {
    reasons.push("بدون فعالیت ۷ روز اخیر");
  }

  const uniqueReasons = Array.from(new Set(reasons));
  const isAtRisk = uniqueReasons.some((reason) => ["اشتراک/دوره بررسی منقضی", "اشتراک لغوشده", "تیکت فوری باز", "بدون فعالیت ۱۴ روز اخیر"].includes(reason)) || uniqueReasons.length >= 3;

  if (isAtRisk) {
    return { label: "در خطر ریزش", tone: "rose", reasons: uniqueReasons.slice(0, 4) };
  }

  if (uniqueReasons.length > 0) {
    return { label: "نیازمند پیگیری", tone: "amber", reasons: uniqueReasons.slice(0, 4) };
  }

  return { label: "خوب", tone: "emerald", reasons: ["وضعیت پایدار"] };
}

function matchesSmartTab(item: AdminTenantListItem, tab: string) {
  if (!tab || tab === "all") return true;
  if (tab === "attention") return item.health.label !== "خوب";
  if (tab === "trial-ending") return item.remainingTrialDays !== null && item.remainingTrialDays >= 0 && item.remainingTrialDays <= 7;
  if (tab === "incomplete") return item.setupCompleteness.label === "ناقص";
  if (tab === "inactive") return !item.lastActivityAt || (daysSince(item.lastActivityAt) ?? 0) >= 7;
  if (tab === "tickets") return item.openTicketsCount > 0;
  return true;
}

function matchesAdvancedFilters(item: AdminTenantListItem, params: AdminTenantListParams) {
  if (params.activity === "active" && (!item.lastActivityAt || (daysSince(item.lastActivityAt) ?? 999) > 7)) return false;
  if (params.activity === "inactive" && item.lastActivityAt && (daysSince(item.lastActivityAt) ?? 0) < 7) return false;
  if (params.setup === "complete" && item.setupCompleteness.label !== "کامل") return false;
  if (params.setup === "incomplete" && item.setupCompleteness.label !== "ناقص") return false;
  if (params.tickets === "open" && item.openTicketsCount <= 0) return false;
  if (params.tickets === "none" && item.openTicketsCount > 0) return false;
  if (params.contracts === "has" && item.contractsCount <= 0) return false;
  if (params.contracts === "none" && item.contractsCount > 0) return false;

  const minReceipts = parseMoneyFilter(params.minReceipts);
  const maxReceipts = parseMoneyFilter(params.maxReceipts);
  if (minReceipts !== null && item.receiptsTotal < minReceipts) return false;
  if (maxReceipts !== null && item.receiptsTotal > maxReceipts) return false;

  return true;
}

function sortTenantItems(items: AdminTenantListItem[], sort: string | undefined) {
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (sort === "oldest") return a.createdAt.getTime() - b.createdAt.getTime();
    if (sort === "last-activity") return (b.lastActivityAt?.getTime() ?? 0) - (a.lastActivityAt?.getTime() ?? 0);
    if (sort === "trial-ending") return (a.trialEndsAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.trialEndsAt?.getTime() ?? Number.MAX_SAFE_INTEGER);
    if (sort === "receipts") return b.receiptsTotal - a.receiptsTotal;
    if (sort === "contracts") return b.contractsCount - a.contractsCount;
    if (sort === "tickets") return b.openTicketsCount - a.openTicketsCount;
    if (sort === "attention") {
      const score = (item: AdminTenantListItem) => (item.health.tone === "rose" ? 3 : item.health.tone === "amber" ? 2 : 1);
      return score(b) - score(a);
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  return sorted;
}

function getBaseWhere(params: AdminTenantListParams) {
  const q = normalizeSearchParam(params.q);

  return {
    ...(params.status && params.status !== "all" ? { status: params.status as never } : {}),
    ...(params.plan && params.plan !== "all" ? { subscription: { is: { plan: params.plan as never } } } : {}),
    ...(q
      ? {
          OR: [
            { id: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { owner: { is: { name: { contains: q, mode: "insensitive" as const } } } },
            { owner: { is: { email: { contains: q, mode: "insensitive" as const } } } },
            { owner: { is: { phone: { contains: q, mode: "insensitive" as const } } } },
            { hallProfile: { is: { brandName: { contains: q, mode: "insensitive" as const } } } },
            { hallProfile: { is: { phone: { contains: q, mode: "insensitive" as const } } } },
            { hallProfile: { is: { mobile: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };
}

export async function getAdminTenantsPageData(params: AdminTenantListParams) {
  await requirePlatformAdmin();

  const db = await getPrisma();
  const page = getPage(params.page);
  const where = getBaseWhere(params);
  const now = new Date();
  const nextSevenDays = new Date(now.getTime() + 7 * DAY_MS);

  const [tenants, paymentSums, paymentLasts, contractLasts, expenseLasts, ticketLasts, auditLasts, openTickets, urgentTickets, serviceCounts, menuCounts, paymentMethodCounts, hallCounts, salonCounts, contractSettingCounts] = await Promise.all([
    db.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true, lastLoginAt: true } },
        subscription: true,
        hallProfile: true,
        demoAccesses: { select: { expiresAt: true, status: true }, orderBy: { expiresAt: "desc" }, take: 1 },
        _count: { select: { members: true, contracts: true, customers: true } },
      },
    }),
    db.payment.groupBy({ by: ["tenantId"], _sum: { amount: true }, _count: { _all: true }, where: { status: { notIn: ["CANCELED", "VOID"] } } }),
    db.payment.groupBy({ by: ["tenantId"], _max: { paidAt: true }, where: { status: { notIn: ["CANCELED", "VOID"] } } }),
    db.contract.groupBy({ by: ["tenantId"], _max: { createdAt: true } }),
    db.expense.groupBy({ by: ["tenantId"], _max: { createdAt: true } }),
    db.supportTicket.groupBy({ by: ["tenantId"], _max: { lastMessageAt: true } }),
    db.auditLog.groupBy({ by: ["tenantId"], _max: { createdAt: true } }),
    db.supportTicket.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { status: { not: "CLOSED" } } }),
    db.supportTicket.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { status: { not: "CLOSED" }, priority: "URGENT" } }),
    db.service.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { isActive: true } }),
    db.menu.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { isActive: true } }),
    db.paymentMethod.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { isActive: true } }),
    db.hall.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { isActive: true } }),
    db.salon.groupBy({ by: ["tenantId"], _count: { _all: true }, where: { isActive: true } }),
    db.contractSetting.groupBy({ by: ["tenantId"], _count: { _all: true } }),
  ]);

  const paymentSumByTenant = new Map(paymentSums.map((item: any) => [item.tenantId, decimalToNumber(item._sum.amount)]));
  const paymentCountByTenant = getCountMap(paymentSums);
  const lastReceiptByTenant = getDateMap(paymentLasts, "paidAt");
  const lastContractByTenant = getDateMap(contractLasts, "createdAt");
  const lastExpenseByTenant = getDateMap(expenseLasts, "createdAt");
  const lastTicketByTenant = getDateMap(ticketLasts, "lastMessageAt");
  const lastAuditByTenant = getDateMap(auditLasts, "createdAt");
  const openTicketsByTenant = getCountMap(openTickets);
  const urgentTicketsByTenant = getCountMap(urgentTickets);
  const servicesByTenant = getCountMap(serviceCounts);
  const menusByTenant = getCountMap(menuCounts);
  const paymentMethodsByTenant = getCountMap(paymentMethodCounts);
  const hallsByTenant = getCountMap(hallCounts);
  const salonsByTenant = getCountMap(salonCounts);
  const contractSettingsByTenant = getCountMap(contractSettingCounts);

  const enriched: AdminTenantListItem[] = tenants.map((tenant: any) => {
    const subscriptionEnd = tenant.subscription?.currentPeriodEnd ?? null;
    const demoEnd = tenant.demoAccesses?.[0]?.expiresAt ?? null;
    const trialEndsAt = subscriptionEnd ?? demoEnd;
    const remainingTrialDays = getRemainingDays(trialEndsAt);
    const lastContractAt = lastContractByTenant.get(tenant.id) ?? null;
    const lastReceiptAt = lastReceiptByTenant.get(tenant.id) ?? null;
    const lastTicketAt = lastTicketByTenant.get(tenant.id) ?? null;
    const lastActivityAt = latestDate(
      lastAuditByTenant.get(tenant.id),
      lastContractAt,
      lastReceiptAt,
      lastExpenseByTenant.get(tenant.id),
      lastTicketAt,
      tenant.owner?.lastLoginAt,
    );
    const servicesCount = servicesByTenant.get(tenant.id) ?? 0;
    const menusCount = menusByTenant.get(tenant.id) ?? 0;
    const paymentMethodsCount = paymentMethodsByTenant.get(tenant.id) ?? 0;
    const hallsCount = hallsByTenant.get(tenant.id) ?? 0;
    const salonsCount = salonsByTenant.get(tenant.id) ?? 0;
    const hasContractSettings = (contractSettingsByTenant.get(tenant.id) ?? 0) > 0;
    const setupCompleteness = buildSetupCompleteness({
      hallProfile: tenant.hallProfile,
      hallsCount,
      salonsCount,
      servicesCount,
      menusCount,
      paymentMethodsCount,
      hasContractSettings,
    });
    const openTicketsCount = openTicketsByTenant.get(tenant.id) ?? 0;
    const urgentTicketsCount = urgentTicketsByTenant.get(tenant.id) ?? 0;
    const health = buildTenantHealth({
      subscriptionStatus: tenant.subscription?.status,
      remainingTrialDays,
      openTicketsCount,
      urgentTicketsCount,
      setupCompleteness,
      contractsCount: tenant._count.contracts,
      createdAt: tenant.createdAt,
      lastActivityAt,
    });

    return {
      id: tenant.id,
      name: tenant.name,
      displayName: tenant.hallProfile?.brandName || tenant.name,
      createdAt: tenant.createdAt,
      status: tenant.status,
      owner: tenant.owner,
      subscription: tenant.subscription ? { plan: tenant.subscription.plan, status: tenant.subscription.status, currentPeriodEnd: tenant.subscription.currentPeriodEnd } : null,
      trialEndsAt,
      remainingTrialDays,
      usersCount: tenant._count.members,
      customersCount: tenant._count.customers,
      contractsCount: tenant._count.contracts,
      receiptsTotal: paymentSumByTenant.get(tenant.id) ?? 0,
      receiptsCount: paymentCountByTenant.get(tenant.id) ?? 0,
      openTicketsCount,
      urgentTicketsCount,
      servicesCount,
      menusCount,
      paymentMethodsCount,
      hallsCount,
      salonsCount,
      hasContractSettings,
      hasHallProfile: Boolean(tenant.hallProfile?.brandName),
      hasLogo: Boolean(tenant.hallProfile?.hallLogoUrl),
      lastOwnerLoginAt: tenant.owner?.lastLoginAt ?? null,
      lastActivityAt,
      lastContractAt,
      lastReceiptAt,
      lastTicketAt,
      setupCompleteness,
      health,
      availableActions: {
        detailsHref: `/admin/tenants/${tenant.id}`,
        previewHref: `/admin/tenants/${tenant.id}`,
        supportHref: `/admin/support?tenantId=${tenant.id}`,
        subscriptionHref: `/admin/subscriptions?tenantId=${tenant.id}`,
      },
    };
  });

  const tabCounts = {
    all: enriched.length,
    attention: enriched.filter((item) => matchesSmartTab(item, "attention")).length,
    trialEnding: enriched.filter((item) => matchesSmartTab(item, "trial-ending")).length,
    incomplete: enriched.filter((item) => matchesSmartTab(item, "incomplete")).length,
    inactive: enriched.filter((item) => matchesSmartTab(item, "inactive")).length,
    tickets: enriched.filter((item) => matchesSmartTab(item, "tickets")).length,
  };

  const filtered = sortTenantItems(
    enriched
      .filter((item) => matchesSmartTab(item, params.tab ?? "all"))
      .filter((item) => matchesAdvancedFilters(item, params)),
    params.sort,
  );

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const tenantsPage = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeTenants = enriched.filter((item) => item.status === "ACTIVE" || item.subscription?.status === "ACTIVE").length;
  const expiringTrials = enriched.filter((item) => item.remainingTrialDays !== null && item.remainingTrialDays >= 0 && item.remainingTrialDays <= 7).length;
  const expiredTrials = enriched.filter((item) => item.subscription?.status === "EXPIRED" || (item.remainingTrialDays !== null && item.remainingTrialDays < 0 && item.subscription?.status !== "ACTIVE")).length;
  const inactiveTenants = enriched.filter((item) => !item.lastActivityAt || (daysSince(item.lastActivityAt) ?? 0) >= 7).length;
  const incompleteTenants = enriched.filter((item) => item.setupCompleteness.label === "ناقص").length;
  const openTicketsCount = enriched.reduce((sum, item) => sum + item.openTicketsCount, 0);
  const receiptsTotal = enriched.reduce((sum, item) => sum + item.receiptsTotal, 0);

  return {
    kpis: {
      totalTenants: enriched.length,
      activeTenants,
      expiringTrials,
      expiredTrials,
      inactiveTenants,
      incompleteTenants,
      openTicketsCount,
      receiptsTotal,
    },
    tabCounts,
    tenants: tenantsPage,
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
      sort: params.sort ?? "newest",
    },
    filterOptions: {
      hasSubscriptionData: enriched.some((item) => item.subscription),
      now,
      nextSevenDays,
    },
  };
}

export async function getAdminTenantDetailData(tenantId: string) {
  await requirePlatformAdmin();

  const db = await getPrisma();
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      owner: { select: { id: true, name: true, email: true, phone: true, status: true, lastLoginAt: true, createdAt: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, phone: true, status: true, lastLoginAt: true } } }, orderBy: { createdAt: "asc" } },
      subscription: true,
      hallProfile: true,
      halls: { include: { salons: true }, orderBy: { createdAt: "asc" } },
      _count: { select: { contracts: true, customers: true, payments: true, expenses: true, supportTickets: true, members: true } },
    },
  });

  if (!tenant) return null;

  const [paymentSum, expenseSum, recentContracts, recentPayments, recentExpenses, tickets, activity] = await Promise.all([
    db.payment.aggregate({ _sum: { amount: true }, where: { tenantId, status: { notIn: ["CANCELED", "VOID"] } } }),
    db.expense.aggregate({ _sum: { amount: true }, where: { tenantId, status: { notIn: ["CANCELED", "VOID"] } } }),
    db.contract.findMany({
      where: { tenantId },
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { fullName: true, phone: true } } },
    }),
    db.payment.findMany({
      where: { tenantId },
      take: 6,
      orderBy: { paidAt: "desc" },
      include: { contract: { select: { contractNo: true } }, customer: { select: { fullName: true } } },
    }),
    db.expense.findMany({
      where: { tenantId },
      take: 6,
      orderBy: { occurredAt: "desc" },
      include: { financialCategory: { select: { title: true } } },
    }),
    db.supportTicket.findMany({
      where: { tenantId },
      take: 6,
      orderBy: { lastMessageAt: "desc" },
    }),
    db.auditLog.findMany({
      where: { tenantId },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    tenant,
    totals: {
      receipts: decimalToNumber(paymentSum._sum.amount),
      expenses: decimalToNumber(expenseSum._sum.amount),
    },
    recentContracts,
    recentPayments,
    recentExpenses,
    tickets,
    activity,
  };
}
