/* eslint-disable @typescript-eslint/no-explicit-any */
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getPrisma } from "@/lib/prisma";
import { decimalToNumber, getRemainingDays } from "@/lib/admin/admin-utils";

const DAY = 24 * 60 * 60 * 1000;

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * DAY);
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * DAY);
}

function sortByDateDesc<T extends { createdAt?: Date | null; lastMessageAt?: Date | null; lastActivityAt?: Date | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const first = (a.lastActivityAt ?? a.lastMessageAt ?? a.createdAt)?.getTime() ?? 0;
    const second = (b.lastActivityAt ?? b.lastMessageAt ?? b.createdAt)?.getTime() ?? 0;
    return second - first;
  });
}

function getTenantDisplayName(tenant: { name: string; hallProfile?: { brandName?: string | null } | null }) {
  return tenant.hallProfile?.brandName || tenant.name;
}

function buildIncompleteSetupReasons(tenant: {
  hallProfile?: { brandName?: string | null; phone?: string | null; address?: string | null; hallLogoUrl?: string | null } | null;
  contractSettings?: { id: string } | null;
  _count: { halls: number; salons: number; services: number; menus: number; paymentMethods: number; contracts: number };
}) {
  const reasons: string[] = [];

  if (!tenant.hallProfile?.brandName) reasons.push("نام تالار");
  if (!tenant.hallProfile?.phone) reasons.push("شماره تماس");
  if (!tenant.hallProfile?.address) reasons.push("نشانی");
  if (!tenant.hallProfile?.hallLogoUrl) reasons.push("لوگوی چاپ");
  if (tenant._count.halls === 0) reasons.push("تالار");
  if (tenant._count.salons === 0) reasons.push("سالن");
  if (tenant._count.services === 0) reasons.push("خدمات");
  if (tenant._count.menus === 0) reasons.push("منو");
  if (tenant._count.paymentMethods === 0) reasons.push("روش دریافت");
  if (!tenant.contractSettings) reasons.push("تنظیمات قرارداد");

  return reasons;
}

async function getLatestTenantActivityAt(tenantId: string) {
  const db = await getPrisma();
  const [contract, payment, expense, ticket, audit] = await Promise.all([
    db.contract.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    db.payment.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    db.expense.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    db.supportTicket.findFirst({ where: { tenantId }, orderBy: { lastMessageAt: "desc" }, select: { lastMessageAt: true } }),
    db.auditLog.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);

  const candidates = [
    contract?.createdAt,
    payment?.createdAt,
    expense?.createdAt,
    ticket?.lastMessageAt,
    audit?.createdAt,
  ].filter(Boolean) as Date[];

  return candidates.sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
}

export async function getPlatformDashboardData() {
  const admin = await requirePlatformAdmin();
  const db = await getPrisma();
  const now = new Date();
  const todayStart = startOfToday();
  const monthStart = startOfCurrentMonth();
  const sevenDaysAgo = daysAgo(7);
  const thirtyDaysAgo = daysAgo(30);
  const threeDaysFromNow = daysFromNow(3);
  const sevenDaysFromNow = daysFromNow(7);

  const [
    totalTenants,
    activeTenants,
    totalUsers,
    activeSubscriptions,
    activeDemos,
    expiringDemosCount,
    expiredDemos,
    openTickets,
    urgentTicketsCount,
    usersActiveToday,
    totalContracts,
    totalPaymentSum,
    currentMonthPaymentSum,
    currentMonthNewTenants,
    currentMonthNewUsers,
    contractsThisMonth,
    receiptsThisMonth,
    expensesThisMonth,
    latestUsers,
    latestTenants,
    endingDemos,
    endingDemosSoon,
    expiredDemoTenants,
    urgentTickets,
    openSupportTickets,
    waitingForUserTicketsCount,
    inReviewTicketsCount,
    recentAuditLogs,
    latestBackup,
    failedNotificationsCount,
    telegramActiveCount,
    telegramProblemCount,
    smsActiveCount,
    smsProblemCount,
  ] = await Promise.all([
    db.tenant.count(),
    db.tenant.count({ where: { status: "ACTIVE" } }),
    db.user.count(),
    db.subscription.count({ where: { status: "ACTIVE" } }),
    db.subscription.count({ where: { status: "TRIALING", OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gte: now } }] } }),
    db.subscription.count({ where: { status: "TRIALING", currentPeriodEnd: { gte: now, lte: sevenDaysFromNow } } }),
    db.subscription.count({ where: { OR: [{ status: "EXPIRED" }, { status: "TRIALING", currentPeriodEnd: { lt: now } }] } }),
    db.supportTicket.count({ where: { status: { not: "CLOSED" } } }),
    db.supportTicket.count({ where: { priority: "URGENT", status: { not: "CLOSED" } } }),
    db.user.count({ where: { lastLoginAt: { gte: todayStart } } }),
    db.contract.count(),
    db.payment.aggregate({ _sum: { amount: true }, where: { status: { notIn: ["CANCELED", "VOID"] } } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { status: { notIn: ["CANCELED", "VOID"] }, createdAt: { gte: monthStart } } }),
    db.tenant.count({ where: { createdAt: { gte: monthStart } } }),
    db.user.count({ where: { createdAt: { gte: monthStart } } }),
    db.contract.count({ where: { createdAt: { gte: monthStart } } }),
    db.payment.count({ where: { createdAt: { gte: monthStart }, status: { notIn: ["CANCELED", "VOID"] } } }),
    db.expense.count({ where: { createdAt: { gte: monthStart }, status: { notIn: ["CANCELED", "VOID"] } } }),
    db.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, phone: true, status: true, createdAt: true, lastLoginAt: true },
    }),
    db.tenant.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true, lastLoginAt: true } },
        subscription: true,
        hallProfile: { select: { brandName: true, city: true, phone: true, hallLogoUrl: true } },
        _count: { select: { contracts: true, customers: true, members: true, services: true, menus: true, paymentMethods: true, halls: true, salons: true } },
      },
    }),
    db.tenant.findMany({
      take: 5,
      where: { subscription: { status: "TRIALING", currentPeriodEnd: { gte: now, lte: sevenDaysFromNow } } },
      orderBy: { subscription: { currentPeriodEnd: "asc" } },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        subscription: true,
        hallProfile: { select: { brandName: true, city: true } },
        _count: { select: { contracts: true, customers: true } },
      },
    }),
    db.tenant.findMany({
      take: 5,
      where: { subscription: { status: "TRIALING", currentPeriodEnd: { gte: now, lte: threeDaysFromNow } } },
      orderBy: { subscription: { currentPeriodEnd: "asc" } },
      include: { owner: { select: { name: true, email: true, phone: true } }, subscription: true, hallProfile: { select: { brandName: true } } },
    }),
    db.tenant.findMany({
      take: 5,
      where: { subscription: { OR: [{ status: "EXPIRED" }, { status: "TRIALING", currentPeriodEnd: { lt: now } }] } },
      orderBy: { updatedAt: "desc" },
      include: { owner: { select: { name: true, email: true, phone: true } }, subscription: true, hallProfile: { select: { brandName: true } } },
    }),
    db.supportTicket.findMany({
      take: 5,
      where: { priority: "URGENT", status: { not: "CLOSED" } },
      orderBy: { lastMessageAt: "desc" },
      include: { tenant: { select: { id: true, name: true, hallProfile: { select: { brandName: true } } } } },
    }),
    db.supportTicket.findMany({
      take: 5,
      where: { status: { not: "CLOSED" } },
      orderBy: { lastMessageAt: "desc" },
      include: { tenant: { select: { id: true, name: true, hallProfile: { select: { brandName: true } } } } },
    }),
    db.supportTicket.count({ where: { status: "WAITING_FOR_USER" } }),
    db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    db.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { id: true, name: true, hallProfile: { select: { brandName: true } } } } },
    }),
    db.backupExportLog.findFirst({ orderBy: { createdAt: "desc" }, include: { tenant: { select: { id: true, name: true } } } }),
    db.notificationLog.count({ where: { status: { in: ["FAILED", "ERROR"] }, createdAt: { gte: daysAgo(7) } } }),
    db.telegramIntegrationSetting.count({ where: { isEnabled: true } }),
    db.telegramIntegrationSetting.count({ where: { isEnabled: true, lastErrorAt: { not: null } } }),
    db.smsIntegrationSetting.count({ where: { isEnabled: true } }),
    db.smsIntegrationSetting.count({ where: { isEnabled: true, lastErrorAt: { not: null } } }),
  ]);

  const [activeTenantRows, inactiveTenantRows, zeroContractTenants, setupCandidates] = await Promise.all([
    db.tenant.findMany({
      take: 8,
      where: {
        OR: [
          { contracts: { some: { createdAt: { gte: thirtyDaysAgo } } } },
          { payments: { some: { createdAt: { gte: thirtyDaysAgo } } } },
          { expenses: { some: { createdAt: { gte: thirtyDaysAgo } } } },
          { supportTickets: { some: { updatedAt: { gte: thirtyDaysAgo } } } },
          { auditLogs: { some: { createdAt: { gte: thirtyDaysAgo } } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        subscription: true,
        hallProfile: { select: { brandName: true, city: true } },
        _count: { select: { contracts: true, payments: true, expenses: true, supportTickets: true } },
      },
    }),
    db.tenant.findMany({
      take: 6,
      where: {
        createdAt: { lt: sevenDaysAgo },
        contracts: { none: { createdAt: { gte: sevenDaysAgo } } },
        payments: { none: { createdAt: { gte: sevenDaysAgo } } },
        expenses: { none: { createdAt: { gte: sevenDaysAgo } } },
        supportTickets: { none: { updatedAt: { gte: sevenDaysAgo } } },
        auditLogs: { none: { createdAt: { gte: sevenDaysAgo } } },
      },
      orderBy: { updatedAt: "asc" },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true, lastLoginAt: true } },
        subscription: true,
        hallProfile: { select: { brandName: true, city: true } },
        _count: { select: { contracts: true, customers: true } },
      },
    }),
    db.tenant.findMany({
      take: 5,
      where: { contracts: { none: {} } },
      orderBy: { createdAt: "asc" },
      include: { owner: { select: { id: true, name: true, email: true, phone: true } }, subscription: true, hallProfile: { select: { brandName: true, city: true } } },
    }),
    db.tenant.findMany({
      take: 40,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        subscription: true,
        hallProfile: { select: { brandName: true, phone: true, address: true, hallLogoUrl: true } },
        contractSettings: { select: { id: true } },
        _count: { select: { halls: true, salons: true, services: true, menus: true, paymentMethods: true, contracts: true } },
      },
    }),
  ]);

  const [activeTenantStats, inactiveTenants] = await Promise.all([
    Promise.all(
      activeTenantRows.slice(0, 5).map(async (tenant: any) => {
        const [contractCount30, receipts30, lastActivityAt] = await Promise.all([
          db.contract.count({ where: { tenantId: tenant.id, createdAt: { gte: thirtyDaysAgo } } }),
          db.payment.aggregate({ _sum: { amount: true }, where: { tenantId: tenant.id, createdAt: { gte: thirtyDaysAgo }, status: { notIn: ["CANCELED", "VOID"] } } }),
          getLatestTenantActivityAt(tenant.id),
        ]);

        return {
          id: tenant.id,
          name: getTenantDisplayName(tenant),
          ownerName: tenant.owner.name || tenant.owner.email,
          status: tenant.status,
          subscriptionStatus: tenant.subscription?.status ?? null,
          contractCount30,
          receipts30: decimalToNumber(receipts30._sum.amount),
          lastActivityAt,
        };
      }),
    ),
    Promise.all(
      inactiveTenantRows.slice(0, 5).map(async (tenant: any) => ({
        id: tenant.id,
        name: getTenantDisplayName(tenant),
        ownerName: tenant.owner.name || tenant.owner.email,
        status: tenant.status,
        subscriptionStatus: tenant.subscription?.status ?? null,
        lastActivityAt: await getLatestTenantActivityAt(tenant.id),
        contractsCount: tenant._count.contracts,
      })),
    ),
  ]);

  const incompleteSetupTenants = setupCandidates
    .map((tenant: any) => ({
      id: tenant.id,
      name: getTenantDisplayName(tenant),
      ownerName: tenant.owner.name || tenant.owner.email,
      reasons: buildIncompleteSetupReasons(tenant),
      contractsCount: tenant._count.contracts,
    }))
    .filter((tenant: any) => tenant.reasons.length > 0)
    .slice(0, 5);

  const needsAttention = [
    ...urgentTickets.map((ticket: any) => ({
      id: `ticket-${ticket.id}`,
      title: `تیکت فوری ${ticket.ticketNumber}`,
      subject: ticket.title,
      reason: `${getTenantDisplayName(ticket.tenant)} · نیازمند پاسخ پشتیبانی`,
      tone: "rose" as const,
      label: "فوری",
      href: `/admin/support/${ticket.id}`,
      actionLabel: "پاسخ",
      createdAt: ticket.lastMessageAt,
    })),
    ...endingDemosSoon.map((tenant: any) => ({
      id: `ending-demo-${tenant.id}`,
      title: `دوره بررسی ${getTenantDisplayName(tenant)}`,
      subject: tenant.owner.name || tenant.owner.email,
      reason: `پایان دوره بررسی در ${getRemainingDays(tenant.subscription?.currentPeriodEnd) ?? "—"} روز آینده`,
      tone: "amber" as const,
      label: "رو به پایان",
      href: `/admin/tenants/${tenant.id}`,
      actionLabel: "مشاهده تالار",
      createdAt: tenant.subscription?.currentPeriodEnd ?? tenant.updatedAt,
    })),
    ...expiredDemoTenants.map((tenant: any) => ({
      id: `expired-demo-${tenant.id}`,
      title: `دوره بررسی منقضی‌شده ${getTenantDisplayName(tenant)}`,
      subject: tenant.owner.name || tenant.owner.email,
      reason: "دوره بررسی تمام شده و نیازمند پیگیری تمدید یا تبدیل است.",
      tone: "rose" as const,
      label: "منقضی‌شده",
      href: `/admin/tenants/${tenant.id}`,
      actionLabel: "پیگیری",
      createdAt: tenant.subscription?.currentPeriodEnd ?? tenant.updatedAt,
    })),
    ...inactiveTenants.slice(0, 3).map((tenant: any) => ({
      id: `inactive-${tenant.id}`,
      title: `تالار بدون فعالیت: ${tenant.name}`,
      subject: tenant.ownerName,
      reason: tenant.lastActivityAt ? "بیش از ۷ روز فعالیت مهمی ثبت نشده است." : "فعالیت عملیاتی مهمی برای این تالار ثبت نشده است.",
      tone: "amber" as const,
      label: "بدون فعالیت",
      href: `/admin/tenants/${tenant.id}`,
      actionLabel: "مشاهده",
      createdAt: tenant.lastActivityAt,
    })),
    ...incompleteSetupTenants.slice(0, 3).map((tenant: any) => ({
      id: `setup-${tenant.id}`,
      title: `راه‌اندازی ناقص: ${tenant.name}`,
      subject: tenant.ownerName,
      reason: `نیازمند تکمیل: ${tenant.reasons.slice(0, 3).join("، ")}${tenant.reasons.length > 3 ? " و موارد دیگر" : ""}`,
      tone: "amber" as const,
      label: "اطلاعات ناقص",
      href: `/admin/tenants/${tenant.id}`,
      actionLabel: "بررسی",
      createdAt: null,
    })),
  ].slice(0, 9);

  const fallbackActivity = [
    ...latestTenants.map((tenant: any) => ({
      id: `tenant-${tenant.id}`,
      title: "تالار جدید ثبت شد",
      message: `${getTenantDisplayName(tenant)} توسط ${tenant.owner.name || tenant.owner.email} ثبت شد.`,
      tenantName: getTenantDisplayName(tenant),
      href: `/admin/tenants/${tenant.id}`,
      createdAt: tenant.createdAt,
      tone: "emerald" as const,
    })),
    ...latestUsers.map((user: any) => ({
      id: `user-${user.id}`,
      title: "کاربر جدید ثبت شد",
      message: `${user.name || user.email} به سامانه اضافه شد.`,
      tenantName: "سامانه",
      href: `/admin/users/${user.id}`,
      createdAt: user.createdAt,
      tone: "navy" as const,
    })),
    ...openSupportTickets.map((ticket: any) => ({
      id: `ticket-feed-${ticket.id}`,
      title: "تیکت پشتیبانی فعال است",
      message: `${ticket.ticketNumber} برای ${getTenantDisplayName(ticket.tenant)}: ${ticket.title}`,
      tenantName: getTenantDisplayName(ticket.tenant),
      href: `/admin/support/${ticket.id}`,
      createdAt: ticket.lastMessageAt,
      tone: ticket.priority === "URGENT" ? ("rose" as const) : ("amber" as const),
    })),
  ];

  const recentActivity = recentAuditLogs.length > 0
    ? recentAuditLogs.map((item: any) => ({
        id: item.id,
        title: item.title,
        message: item.message,
        tenantName: getTenantDisplayName(item.tenant),
        href: item.href?.startsWith("/admin") ? item.href : `/admin/tenants/${item.tenantId}`,
        createdAt: item.createdAt,
        tone: item.action === "DELETE" || item.action === "SECURITY_CHANGE" ? ("rose" as const) : item.action === "CREATE" || item.action === "PAYMENT_RECEIVED" ? ("emerald" as const) : ("navy" as const),
      }))
    : sortByDateDesc(fallbackActivity).slice(0, 8);

  const funnel = [
    { label: "ثبت‌نام‌شده", value: totalTenants, href: "/admin/tenants" },
    { label: "دوره بررسی فعال", value: activeDemos, href: "/admin/subscriptions?status=trialing" },
    { label: "رو به پایان", value: expiringDemosCount, href: "/admin/subscriptions?filter=trial-ending" },
    { label: "منقضی‌شده", value: expiredDemos, href: "/admin/subscriptions?status=expired" },
    { label: "اشتراک فعال", value: activeSubscriptions, href: "/admin/subscriptions?status=active" },
  ];

  const systemNeedsAttention = urgentTicketsCount > 0 || expiringDemosCount > 0 || expiredDemos > 0 || failedNotificationsCount > 0 || telegramProblemCount > 0 || smsProblemCount > 0;

  return {
    admin: { name: admin.name, email: admin.email },
    generatedAt: now,
    platformStatus: systemNeedsAttention ? "NEEDS_REVIEW" : "STABLE",
    kpis: {
      monthlyRevenue: {
        available: false,
        value: null,
        description: "نمایش درآمد اشتراک پس از اتصال پرداخت اشتراک فعال می‌شود.",
      },
      activeSubscriptions,
      activeDemos,
      expiringDemos: expiringDemosCount,
      expiredDemos,
      urgentTickets: urgentTicketsCount,
      openTickets,
      usersActiveToday,
      inactiveTenants: inactiveTenants.length,
      totalTenants,
      activeTenants,
      totalUsers,
      totalContracts,
      totalReceipts: decimalToNumber(totalPaymentSum._sum.amount),
      currentMonthReceipts: decimalToNumber(currentMonthPaymentSum._sum.amount),
      newTenantsThisMonth: currentMonthNewTenants,
      newUsersThisMonth: currentMonthNewUsers,
    },
    needsAttention,
    businessHealth: {
      funnel,
      activeDemos,
      expiredDemos,
      activeSubscriptions,
      expiringDemos: expiringDemosCount,
      newTenantsThisMonth: currentMonthNewTenants,
      currentMonthReceipts: decimalToNumber(currentMonthPaymentSum._sum.amount),
      subscriptionRevenueAvailable: false,
      endingDemos: endingDemos.map((tenant: any) => ({
        ...tenant,
        remainingDays: Math.max(0, getRemainingDays(tenant.subscription?.currentPeriodEnd) ?? 0),
      })),
    },
    tenantActivity: {
      activeTenants: activeTenantStats.sort((a: any, b: any) => b.contractCount30 - a.contractCount30 || b.receipts30 - a.receipts30).slice(0, 5),
      inactiveTenants,
      zeroContractTenants: zeroContractTenants.map((tenant: any) => ({
        id: tenant.id,
        name: getTenantDisplayName(tenant),
        ownerName: tenant.owner.name || tenant.owner.email,
        createdAt: tenant.createdAt,
        status: tenant.status,
        subscriptionStatus: tenant.subscription?.status ?? null,
      })),
      incompleteSetupTenants,
    },
    support: {
      urgentTickets,
      latestOpenTickets: openSupportTickets,
      counts: {
        urgent: urgentTicketsCount,
        open: openTickets,
        inReview: inReviewTicketsCount,
        waitingForUser: waitingForUserTicketsCount,
      },
    },
    recentActivity,
    systemHealth: {
      overall: systemNeedsAttention ? "NEEDS_REVIEW" : "STABLE",
      database: "STABLE",
      backup: latestBackup,
      failedNotificationsCount,
      telegram: { active: telegramActiveCount, problems: telegramProblemCount },
      sms: { active: smsActiveCount, problems: smsProblemCount },
      monthlyOperations: { contracts: contractsThisMonth, receipts: receiptsThisMonth, expenses: expensesThisMonth },
    },
    quickLinks: [
      { title: "مدیریت تالارها", description: "فهرست و جزئیات همه فضاهای کاری", href: "/admin/tenants" },
      { title: "مدیریت کاربران", description: "کاربران ثبت‌نام‌شده و عضویت‌ها", href: "/admin/users" },
      { title: "اشتراک‌ها و دوره‌های بررسی", description: "پیگیری دوره‌های بررسی، تمدیدها و وضعیت پلن‌ها", href: "/admin/subscriptions" },
      { title: "تیکت‌های پشتیبانی", description: "پاسخ‌گویی و کنترل وضعیت درخواست‌ها", href: "/admin/support" },
      { title: "گزارش‌ها و آمار سامانه", description: "نمای تحلیلی از رشد و عملکرد SaaS", href: "/admin/reports" },
      { title: "فعالیت‌ها و لاگ‌ها", description: "ردیابی عملیات مهم در tenantها", href: "/admin/activity" },
      { title: "تنظیمات سامانه", description: "تنظیمات سطح پلتفرم و دسترسی ادمین", href: "/admin/settings" },
    ],
  };
}
