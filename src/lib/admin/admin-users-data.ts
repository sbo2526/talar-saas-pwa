/* eslint-disable @typescript-eslint/no-explicit-any */
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getPrisma } from "@/lib/prisma";
import { decimalToNumber, getRemainingDays, normalizeSearchParam } from "@/lib/admin/admin-utils";

export type AdminUserListParams = {
  q?: string;
  status?: string;
  role?: string;
  subscription?: string;
  tab?: string;
  sort?: string;
  view?: string;
  page?: string;
  tickets?: string;
  workspace?: string;
  inactive?: string;
  emailVerified?: string;
  phoneVerified?: string;
};

export type UserHealthTone = "emerald" | "amber" | "rose";

export type AdminUserHealth = {
  label: "خوب" | "نیازمند بررسی" | "در خطر";
  tone: UserHealthTone;
  reasons: string[];
};

export type AdminUserListItem = {
  id: string;
  fullName: string;
  email: string;
  mobile: string | null;
  status: string;
  statusLabel: string;
  statusTone: "emerald" | "amber" | "rose" | "slate";
  roleLabel: string;
  roleTone: "emerald" | "amber" | "rose" | "navy" | "slate";
  isPlatformAdmin: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  lastActivityAt: Date | null;
  activityLabel: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  membershipsCount: number;
  ownedTenantsCount: number;
  workspacesCount: number;
  primaryWorkspaceName: string;
  primaryTenantId: string | null;
  openTicketsCount: number;
  urgentTicketsCount: number;
  contractsCount: number;
  receiptsTotal: number;
  subscriptionStatus: string | null;
  subscriptionLabel: string;
  trialEndsAt: Date | null;
  remainingTrialDays: number | null;
  health: AdminUserHealth;
  availableActions: {
    detailsHref: string;
    workspacesHref: string;
    ticketsHref: string;
    subscriptionHref: string;
  };
};

export type AdminUsersPageData = {
  kpis: Array<{ key: string; title: string; value: string; description: string; tone: "navy" | "emerald" | "amber" | "rose" }>;
  tabs: Array<{ key: string; label: string; count: number }>;
  users: AdminUserListItem[];
  totalCount: number;
  filteredCount: number;
  page: number;
  limit: number;
  totalPages: number;
  from: number;
  to: number;
  currentFilters: AdminUserListParams;
};

const PAGE_SIZE = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

function getPage(value: string | undefined) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
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

function normalizeEmail(email: string | null | undefined) {
  return String(email || "").trim().toLowerCase();
}

function getPlatformAdminEmails() {
  const raw = [process.env.PLATFORM_ADMIN_EMAIL, process.env.PLATFORM_ADMIN_EMAILS].filter(Boolean).join(",");
  return new Set(raw.split(",").map((email) => normalizeEmail(email)).filter(Boolean));
}

function isPlatformAdminEmail(email: string | null | undefined) {
  const emails = getPlatformAdminEmails();
  return emails.size > 0 && emails.has(normalizeEmail(email));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function getStatusLabel(status: string | null | undefined) {
  if (status === "ACTIVE") return "فعال";
  if (status === "SUSPENDED") return "غیرفعال";
  if (status === "INVITED") return "دعوت‌شده";
  return "نامشخص";
}

function getStatusTone(status: string | null | undefined) {
  if (status === "ACTIVE") return "emerald" as const;
  if (status === "SUSPENDED") return "rose" as const;
  if (status === "INVITED") return "amber" as const;
  return "slate" as const;
}

function getMainRole(user: any, isPlatformAdmin: boolean) {
  if (isPlatformAdmin) {
    return { label: "مدیر کل سامانه", tone: "rose" as const, key: "platform-admin" };
  }

  if ((user.ownedTenants?.length ?? 0) > 0 || user.memberships?.some((item: any) => item.role === "OWNER")) {
    return { label: "مالک تالار", tone: "navy" as const, key: "owner" };
  }

  if (user.memberships?.some((item: any) => item.role === "ADMIN")) {
    return { label: "مدیر تالار", tone: "amber" as const, key: "admin" };
  }

  if ((user.memberships?.length ?? 0) > 0) {
    return { label: "عضو", tone: "slate" as const, key: "member" };
  }

  return { label: "بدون فضای کاری", tone: "rose" as const, key: "no-workspace" };
}

function getSubscriptionLabel(status: string | null | undefined) {
  if (status === "ACTIVE") return "اشتراک فعال";
  if (status === "TRIALING") return "دوره بررسی فعال";
  if (status === "PAST_DUE") return "نیازمند تمدید";
  if (status === "EXPIRED") return "منقضی‌شده";
  if (status === "CANCELED") return "لغوشده";
  return "بدون اشتراک";
}

function getActivityLabel(lastLoginAt: Date | null, lastActivityAt: Date | null) {
  const mostRecent = latestDate(lastLoginAt, lastActivityAt);
  const diff = daysSince(mostRecent);

  if (diff === null) return "فعالیتی ثبت نشده";
  if (diff <= 0) return "فعال امروز";
  if (diff <= 7) return "فعال در هفته اخیر";
  return "بدون فعالیت";
}

function buildUserHealth(input: {
  status: string;
  isPlatformAdmin: boolean;
  lastLoginAt: Date | null;
  lastActivityAt: Date | null;
  openTicketsCount: number;
  urgentTicketsCount: number;
  workspacesCount: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  subscriptionStatus: string | null;
  remainingTrialDays: number | null;
}): AdminUserHealth {
  const reasons: string[] = [];
  const mostRecent = latestDate(input.lastLoginAt, input.lastActivityAt);
  const inactiveDays = daysSince(mostRecent);

  if (input.status === "SUSPENDED") reasons.push("حساب غیرفعال");
  if (input.status === "INVITED") reasons.push("دعوت تکمیل نشده");
  if (input.urgentTicketsCount > 0) reasons.push("تیکت فوری باز");
  if (input.openTicketsCount > 0) reasons.push("تیکت باز");
  if (input.workspacesCount === 0 && !input.isPlatformAdmin) reasons.push("بدون فضای کاری");
  if (inactiveDays !== null && inactiveDays >= 14) reasons.push("بدون فعالیت ۱۴ روز اخیر");
  else if (inactiveDays !== null && inactiveDays >= 7) reasons.push("بدون فعالیت ۷ روز اخیر");
  if (inactiveDays === null) reasons.push("فعالیتی ثبت نشده");
  if (!input.emailVerified) reasons.push("ایمیل تأیید نشده");
  if (!input.phoneVerified) reasons.push("موبایل تأیید نشده");
  if (input.subscriptionStatus === "EXPIRED" || input.subscriptionStatus === "PAST_DUE" || input.subscriptionStatus === "CANCELED") reasons.push("وضعیت اشتراک نیازمند بررسی");
  if (input.remainingTrialDays !== null && input.remainingTrialDays >= 0 && input.remainingTrialDays <= 7) reasons.push("دوره بررسی رو به پایان");

  const atRisk = input.status === "SUSPENDED" || input.urgentTicketsCount > 0 || (inactiveDays !== null && inactiveDays >= 14) || ["EXPIRED", "PAST_DUE", "CANCELED"].includes(input.subscriptionStatus ?? "");

  if (atRisk) {
    return { label: "در خطر", tone: "rose", reasons: reasons.slice(0, 4) };
  }

  if (reasons.length > 0) {
    return { label: "نیازمند بررسی", tone: "amber", reasons: reasons.slice(0, 4) };
  }

  return { label: "خوب", tone: "emerald", reasons: ["وضعیت پایدار"] };
}

function countMapBy<T extends string | number>(rows: any[], key: string): Map<T, number> {
  const map = new Map<T, number>();
  rows.forEach((row) => {
    if (row[key] !== null && row[key] !== undefined) {
      map.set(row[key] as T, row._count?._all ?? row._count?.id ?? 0);
    }
  });
  return map;
}

function dateMapBy<T extends string | number>(rows: any[], groupKey: string, dateKey = "createdAt"): Map<T, Date | null> {
  const map = new Map<T, Date | null>();
  rows.forEach((row) => {
    if (row[groupKey] !== null && row[groupKey] !== undefined) {
      map.set(row[groupKey] as T, row._max?.[dateKey] ?? null);
    }
  });
  return map;
}

function sumMapByTenant(rows: any[]) {
  const map = new Map<string, number>();
  rows.forEach((row) => map.set(row.tenantId, decimalToNumber(row._sum?.amount)));
  return map;
}

function getPrimaryTenant(user: any) {
  return user.memberships?.[0]?.tenant || user.ownedTenants?.[0] || null;
}

function uniqueTenantIds(user: any) {
  return Array.from(new Set([...(user.memberships ?? []).map((item: any) => item.tenantId), ...(user.ownedTenants ?? []).map((item: any) => item.id)].filter(Boolean))) as string[];
}

function getPrimarySubscription(user: any) {
  return getPrimaryTenant(user)?.subscription ?? null;
}

function buildHref(pathname: string, params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "all") search.set(key, value);
  });
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function mapUserToItem(input: {
  user: any;
  userAuditDate: Date | null;
  userOpenTickets: number;
  userUrgentTickets: number;
  userLastTicketAt: Date | null;
  contractsByTenant: Map<string, number>;
  lastContractByTenant: Map<string, Date | null>;
  paymentsByTenant: Map<string, number>;
  lastPaymentByTenant: Map<string, Date | null>;
}) {
  const { user } = input;
  const tenantIds = uniqueTenantIds(user);
  const primaryTenant = getPrimaryTenant(user);
  const primarySubscription = getPrimarySubscription(user);
  const isPlatformAdmin = isPlatformAdminEmail(user.email);
  const mainRole = getMainRole(user, isPlatformAdmin);
  const contractsCount = tenantIds.reduce((sum, tenantId) => sum + (input.contractsByTenant.get(tenantId) ?? 0), 0);
  const receiptsTotal = tenantIds.reduce((sum, tenantId) => sum + (input.paymentsByTenant.get(tenantId) ?? 0), 0);
  const lastContractAt = latestDate(...tenantIds.map((tenantId) => input.lastContractByTenant.get(tenantId) ?? null));
  const lastReceiptAt = latestDate(...tenantIds.map((tenantId) => input.lastPaymentByTenant.get(tenantId) ?? null));
  const lastActivityAt = latestDate(input.userAuditDate, input.userLastTicketAt, lastContractAt, lastReceiptAt, user.updatedAt);
  const remainingTrialDays = getRemainingDays(primarySubscription?.currentPeriodEnd ?? user.demoAccesses?.[0]?.expiresAt ?? null);
  const emailVerified = Boolean(user.emailVerifiedAt);
  const phoneVerified = Boolean(user.phoneVerifiedAt || user.phone);
  const workspacesCount = tenantIds.length;

  const health = buildUserHealth({
    status: user.status,
    isPlatformAdmin,
    lastLoginAt: user.lastLoginAt,
    lastActivityAt,
    openTicketsCount: input.userOpenTickets,
    urgentTicketsCount: input.userUrgentTickets,
    workspacesCount,
    emailVerified,
    phoneVerified,
    subscriptionStatus: primarySubscription?.status ?? null,
    remainingTrialDays,
  });

  return {
    id: user.id,
    fullName: user.name || "کاربر بدون نام",
    email: user.email,
    mobile: user.phone,
    status: user.status,
    statusLabel: getStatusLabel(user.status),
    statusTone: getStatusTone(user.status),
    roleLabel: mainRole.label,
    roleTone: mainRole.tone,
    isPlatformAdmin,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    lastActivityAt,
    activityLabel: getActivityLabel(user.lastLoginAt, lastActivityAt),
    emailVerified,
    phoneVerified,
    membershipsCount: user._count?.memberships ?? user.memberships?.length ?? 0,
    ownedTenantsCount: user._count?.ownedTenants ?? user.ownedTenants?.length ?? 0,
    workspacesCount,
    primaryWorkspaceName: primaryTenant?.hallProfile?.brandName || primaryTenant?.name || "فضای کاری ثبت نشده",
    primaryTenantId: primaryTenant?.id ?? null,
    openTicketsCount: input.userOpenTickets,
    urgentTicketsCount: input.userUrgentTickets,
    contractsCount,
    receiptsTotal,
    subscriptionStatus: primarySubscription?.status ?? null,
    subscriptionLabel: getSubscriptionLabel(primarySubscription?.status ?? null),
    trialEndsAt: primarySubscription?.currentPeriodEnd ?? user.demoAccesses?.[0]?.expiresAt ?? null,
    remainingTrialDays,
    health,
    availableActions: {
      detailsHref: `/admin/users/${user.id}`,
      workspacesHref: primaryTenant?.id ? `/admin/tenants/${primaryTenant.id}` : "/admin/tenants",
      ticketsHref: buildHref("/admin/support", { userId: user.id }),
      subscriptionHref: primaryTenant?.id ? buildHref("/admin/subscriptions", { tenantId: primaryTenant.id }) : "/admin/subscriptions",
    },
  } satisfies AdminUserListItem;
}

function matchesTab(user: AdminUserListItem, tab: string | undefined) {
  if (!tab || tab === "all") return true;
  if (tab === "active") return user.status === "ACTIVE";
  if (tab === "inactive") return user.status === "SUSPENDED";
  if (tab === "owners") return user.roleLabel === "مالک تالار";
  if (tab === "platform-admins") return user.isPlatformAdmin;
  if (tab === "new") return user.createdAt >= new Date(Date.now() - 30 * DAY_MS);
  if (tab === "no-activity") return user.health.reasons.some((reason) => reason.includes("بدون فعالیت") || reason === "فعالیتی ثبت نشده");
  if (tab === "ticketed") return user.openTicketsCount > 0;
  return true;
}

function matchesAdvancedFilters(user: AdminUserListItem, params: AdminUserListParams) {
  if (params.role && params.role !== "all") {
    if (params.role === "owner" && user.roleLabel !== "مالک تالار") return false;
    if (params.role === "admin" && user.roleLabel !== "مدیر تالار") return false;
    if (params.role === "member" && user.roleLabel !== "عضو") return false;
    if (params.role === "platform-admin" && !user.isPlatformAdmin) return false;
    if (params.role === "no-workspace" && user.workspacesCount > 0) return false;
  }

  if (params.subscription && params.subscription !== "all") {
    if (params.subscription === "trialing" && user.subscriptionStatus !== "TRIALING") return false;
    if (params.subscription === "active" && user.subscriptionStatus !== "ACTIVE") return false;
    if (params.subscription === "expired" && !["EXPIRED", "PAST_DUE", "CANCELED"].includes(user.subscriptionStatus ?? "")) return false;
    if (params.subscription === "none" && user.subscriptionStatus) return false;
  }

  if (params.tickets === "open" && user.openTicketsCount <= 0) return false;
  if (params.tickets === "none" && user.openTicketsCount > 0) return false;
  if (params.workspace === "has" && user.workspacesCount <= 0) return false;
  if (params.workspace === "none" && user.workspacesCount > 0) return false;
  if (params.inactive === "yes" && !user.health.reasons.some((reason) => reason.includes("بدون فعالیت") || reason === "فعالیتی ثبت نشده")) return false;
  if (params.emailVerified === "yes" && !user.emailVerified) return false;
  if (params.emailVerified === "no" && user.emailVerified) return false;
  if (params.phoneVerified === "yes" && !user.phoneVerified) return false;
  if (params.phoneVerified === "no" && user.phoneVerified) return false;
  return true;
}

function sortUsers(users: AdminUserListItem[], sort: string | undefined) {
  const sorted = [...users];
  const riskRank = (user: AdminUserListItem) => user.health.tone === "rose" ? 0 : user.health.tone === "amber" ? 1 : 2;
  sorted.sort((a, b) => {
    if (sort === "oldest") return a.createdAt.getTime() - b.createdAt.getTime();
    if (sort === "last-login") return (b.lastLoginAt?.getTime() ?? 0) - (a.lastLoginAt?.getTime() ?? 0);
    if (sort === "workspaces") return b.workspacesCount - a.workspacesCount;
    if (sort === "tickets") return b.openTicketsCount - a.openTicketsCount;
    if (sort === "needs-review") return riskRank(a) - riskRank(b) || b.openTicketsCount - a.openTicketsCount;
    if (sort === "name") return a.fullName.localeCompare(b.fullName, "fa");
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  return sorted;
}

export async function getAdminUsersPageData(params: AdminUserListParams): Promise<AdminUsersPageData> {
  await requirePlatformAdmin();
  const db = await getPrisma();
  const page = getPage(params.page);
  const q = normalizeSearchParam(params.q);
  const monthStart = startOfMonth();

  const baseWhere: any = {
    ...(params.status && params.status !== "all" ? { status: params.status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { memberships: { some: { tenant: { name: { contains: q, mode: "insensitive" } } } } },
            { ownedTenants: { some: { name: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const users = await db.user.findMany({
    where: baseWhere,
    take: 1000,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      emailVerifiedAt: true,
      phoneVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      memberships: {
        select: {
          id: true,
          tenantId: true,
          role: true,
          createdAt: true,
          tenant: {
            select: {
              id: true,
              name: true,
              status: true,
              ownerId: true,
              createdAt: true,
              updatedAt: true,
              hallProfile: { select: { brandName: true } },
              subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 8,
      },
      ownedTenants: {
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          hallProfile: { select: { brandName: true } },
          subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
      demoAccesses: { select: { status: true, expiresAt: true, tenantId: true, usedAt: true }, orderBy: { createdAt: "desc" }, take: 3 },
      _count: { select: { memberships: true, ownedTenants: true } },
    },
  });

  const userIds = users.map((user: any) => user.id);
  const tenantIds = Array.from(new Set(users.flatMap((user: any) => uniqueTenantIds(user))));

  const [
    allUsersCount,
    activeUsersCount,
    suspendedUsersCount,
    newUsersThisMonth,
    openTicketsByUserRows,
    urgentTicketsByUserRows,
    lastTicketByUserRows,
    lastAuditByUserRows,
    contractsByTenantRows,
    lastContractByTenantRows,
    paymentsByTenantRows,
    lastPaymentByTenantRows,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { status: "ACTIVE" } }),
    db.user.count({ where: { status: "SUSPENDED" } }),
    db.user.count({ where: { createdAt: { gte: monthStart } } }),
    userIds.length
      ? db.supportTicket.groupBy({ by: ["createdByUserId"], where: { createdByUserId: { in: userIds }, status: { not: "CLOSED" } }, _count: { _all: true } })
      : [],
    userIds.length
      ? db.supportTicket.groupBy({ by: ["createdByUserId"], where: { createdByUserId: { in: userIds }, status: { not: "CLOSED" }, priority: "URGENT" }, _count: { _all: true } })
      : [],
    userIds.length
      ? db.supportTicket.groupBy({ by: ["createdByUserId"], where: { createdByUserId: { in: userIds } }, _max: { lastMessageAt: true } })
      : [],
    userIds.length ? db.auditLog.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _max: { createdAt: true } }) : [],
    tenantIds.length ? db.contract.groupBy({ by: ["tenantId"], where: { tenantId: { in: tenantIds } }, _count: { _all: true } }) : [],
    tenantIds.length ? db.contract.groupBy({ by: ["tenantId"], where: { tenantId: { in: tenantIds } }, _max: { createdAt: true } }) : [],
    tenantIds.length ? db.payment.groupBy({ by: ["tenantId"], where: { tenantId: { in: tenantIds }, status: { not: "CANCELED" } }, _sum: { amount: true } }) : [],
    tenantIds.length ? db.payment.groupBy({ by: ["tenantId"], where: { tenantId: { in: tenantIds }, status: { not: "CANCELED" } }, _max: { createdAt: true } }) : [],
  ]);

  const openTicketsByUser = countMapBy<string>(openTicketsByUserRows, "createdByUserId");
  const urgentTicketsByUser = countMapBy<string>(urgentTicketsByUserRows, "createdByUserId");
  const lastTicketByUser = dateMapBy<string>(lastTicketByUserRows, "createdByUserId", "lastMessageAt");
  const lastAuditByUser = dateMapBy<string>(lastAuditByUserRows, "userId", "createdAt");
  const contractsByTenant = countMapBy<string>(contractsByTenantRows, "tenantId");
  const lastContractByTenant = dateMapBy<string>(lastContractByTenantRows, "tenantId", "createdAt");
  const paymentsByTenant = sumMapByTenant(paymentsByTenantRows);
  const lastPaymentByTenant = dateMapBy<string>(lastPaymentByTenantRows, "tenantId", "createdAt");

  const mappedUsers: AdminUserListItem[] = users.map((user: any) => mapUserToItem({
    user,
    userAuditDate: lastAuditByUser.get(user.id) ?? null,
    userOpenTickets: openTicketsByUser.get(user.id) ?? 0,
    userUrgentTickets: urgentTicketsByUser.get(user.id) ?? 0,
    userLastTicketAt: lastTicketByUser.get(user.id) ?? null,
    contractsByTenant,
    lastContractByTenant,
    paymentsByTenant,
    lastPaymentByTenant,
  }));

  const tabs = [
    { key: "all", label: "همه کاربران", count: mappedUsers.length },
    { key: "active", label: "فعال", count: mappedUsers.filter((user) => matchesTab(user, "active")).length },
    { key: "inactive", label: "غیرفعال", count: mappedUsers.filter((user) => matchesTab(user, "inactive")).length },
    { key: "owners", label: "مالکان تالار", count: mappedUsers.filter((user) => matchesTab(user, "owners")).length },
    { key: "platform-admins", label: "مدیران سامانه", count: mappedUsers.filter((user) => matchesTab(user, "platform-admins")).length },
    { key: "new", label: "جدید", count: mappedUsers.filter((user) => matchesTab(user, "new")).length },
    { key: "no-activity", label: "بدون فعالیت", count: mappedUsers.filter((user) => matchesTab(user, "no-activity")).length },
    { key: "ticketed", label: "دارای تیکت", count: mappedUsers.filter((user) => matchesTab(user, "ticketed")).length },
  ];

  const filteredUsers = sortUsers(
    mappedUsers.filter((user) => matchesTab(user, params.tab)).filter((user) => matchesAdvancedFilters(user, params)),
    params.sort,
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const from = filteredUsers.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filteredUsers.length);
  const ownersCount = mappedUsers.filter((user) => user.roleLabel === "مالک تالار").length;
  const platformAdminsCount = mappedUsers.filter((user) => user.isPlatformAdmin).length;
  const inactiveCount = mappedUsers.filter((user) => matchesTab(user, "no-activity")).length;
  const usersWithTicketsCount = mappedUsers.filter((user) => user.openTicketsCount > 0).length;
  const activeDemoUsersCount = mappedUsers.filter((user) => user.subscriptionStatus === "TRIALING").length;

  const kpis = [
    { key: "total", title: "کل کاربران", value: formatNumber(allUsersCount), description: "همه حساب‌های ثبت‌شده", tone: "navy" as const },
    { key: "active", title: "کاربران فعال", value: formatNumber(activeUsersCount), description: "حساب‌های قابل ورود", tone: "emerald" as const },
    { key: "disabled", title: "کاربران غیرفعال", value: formatNumber(suspendedUsersCount), description: "نیازمند بررسی دسترسی", tone: suspendedUsersCount > 0 ? "rose" as const : "emerald" as const },
    { key: "new", title: "جدید این ماه", value: formatNumber(newUsersThisMonth), description: "ثبت‌نام‌های ماه جاری", tone: "navy" as const },
    { key: "owners", title: "مالکان تالار", value: formatNumber(ownersCount), description: "کاربران دارای مالکیت", tone: "navy" as const },
    { key: "platform", title: "مدیران کل سامانه", value: formatNumber(platformAdminsCount), description: "بر اساس تنظیمات امن سرور", tone: "rose" as const },
    { key: "inactive", title: "بدون فعالیت", value: formatNumber(inactiveCount), description: "بدون ورود یا فعالیت اخیر", tone: inactiveCount > 0 ? "amber" as const : "emerald" as const },
    { key: "tickets", title: "دارای تیکت باز", value: formatNumber(usersWithTicketsCount), description: "نیازمند پیگیری پشتیبانی", tone: usersWithTicketsCount > 0 ? "rose" as const : "emerald" as const },
    { key: "trials", title: "دارای دوره بررسی فعال", value: formatNumber(activeDemoUsersCount), description: "متصل به دوره دوره بررسی", tone: "amber" as const },
  ];

  return {
    kpis,
    tabs,
    users: pageUsers,
    totalCount: mappedUsers.length,
    filteredCount: filteredUsers.length,
    page: safePage,
    limit: PAGE_SIZE,
    totalPages,
    from,
    to,
    currentFilters: params,
  };
}

export async function getAdminUserDetailData(userId: string) {
  await requirePlatformAdmin();
  const db = await getPrisma();
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: { tenant: { include: { subscription: true, hallProfile: true } } },
        orderBy: { createdAt: "asc" },
      },
      ownedTenants: { include: { subscription: true, hallProfile: true }, orderBy: { createdAt: "desc" } },
      demoAccesses: { include: { tenant: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!user) return null;

  const ownedTenantIds = user.ownedTenants.map((tenant: any) => tenant.id);
  const memberTenantIds = Array.from(new Set(user.memberships.map((member: any) => member.tenantId))) as string[];
  const nonOwnedMemberTenantIds = memberTenantIds.filter((tenantId) => !ownedTenantIds.includes(tenantId));

  const [
    tickets,
    activity,
    ownedCustomersCount,
    ownedContractsCount,
    ownedPaymentsCount,
    ownedExpensesCount,
    ownedHallsCount,
    ownedSalonsCount,
    ownedSupportTicketsCount,
    directSupportTicketsCount,
    directSupportMessagesCount,
    directNotificationsCount,
    directAuditLogsCount,
  ] = await Promise.all([
    db.supportTicket.findMany({
      where: { createdByUserId: userId },
      take: 8,
      orderBy: { lastMessageAt: "desc" },
      include: { tenant: { select: { id: true, name: true } } },
    }),
    db.auditLog.findMany({
      where: { userId },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { id: true, name: true } } },
    }),
    ownedTenantIds.length ? db.customer.count({ where: { tenantId: { in: ownedTenantIds } } }) : 0,
    ownedTenantIds.length ? db.contract.count({ where: { tenantId: { in: ownedTenantIds } } }) : 0,
    ownedTenantIds.length ? db.payment.count({ where: { tenantId: { in: ownedTenantIds } } }) : 0,
    ownedTenantIds.length ? db.expense.count({ where: { tenantId: { in: ownedTenantIds } } }) : 0,
    ownedTenantIds.length ? db.hall.count({ where: { tenantId: { in: ownedTenantIds } } }) : 0,
    ownedTenantIds.length ? db.salon.count({ where: { tenantId: { in: ownedTenantIds } } }) : 0,
    ownedTenantIds.length ? db.supportTicket.count({ where: { tenantId: { in: ownedTenantIds } } }) : 0,
    db.supportTicket.count({ where: { createdByUserId: userId } }),
    db.supportTicketMessage.count({ where: { senderUserId: userId } }),
    db.inAppNotification.count({ where: { userId } }),
    db.auditLog.count({ where: { userId } }),
  ]);

  const deletionPreview = {
    ownedTenantIds,
    ownedTenantsCount: ownedTenantIds.length,
    nonOwnedMembershipsCount: nonOwnedMemberTenantIds.length,
    ownedCustomersCount,
    ownedContractsCount,
    ownedPaymentsCount,
    ownedExpensesCount,
    ownedHallsCount,
    ownedSalonsCount,
    ownedSupportTicketsCount,
    directSupportTicketsCount,
    directSupportMessagesCount,
    directNotificationsCount,
    directAuditLogsCount,
  };

  return { user, tickets, activity, deletionPreview };
}
