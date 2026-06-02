import "server-only";
import type { ContractStatus, UserRole } from "@prisma/client";
import {
  getContractPaidAmount,
  getContractRemainingAmount,
  getPaymentStatusSummary,
  toNumber,
} from "@/lib/payments/display";
import {
  getJalaliMonthRange,
  getTodayJalali,
  jalaliToDate,
} from "@/lib/date/jalali";
import {
  getHeaderNotifications,
  syncInAppNotificationsForTenant,
  toHeaderNotificationView,
  type HeaderNotificationItem,
} from "@/lib/notifications/in-app-notification-service";
import { getPostEventDecisionGateData } from "@/lib/post-event/post-event-decision-gate";
import { getPrisma } from "@/lib/prisma";

const eventStatuses: ContractStatus[] = ["RESERVED", "CONFIRMED"];
const activeContractStatuses: ContractStatus[] = ["DRAFT", "RESERVED", "CONFIRMED"];
const countablePaymentStatuses = ["RECORDED", "CONFIRMED"];
const countableExpenseStatuses = ["RECORDED", "CONFIRMED"];

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function daysUntil(date: Date | null | undefined) {
  if (!date) return null;

  const today = getTodayJalali();
  const todayStart = jalaliToDate(today.year, today.month, today.day);
  const diff = date.getTime() - todayStart.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function paymentNetTotal(payments: Array<{ amount: unknown; type: string | null; status: string | null }>) {
  return payments.reduce((sum, payment) => {
    if (!countablePaymentStatuses.includes(payment.status ?? "RECORDED")) {
      return sum;
    }

    const amount = toNumber(payment.amount as { toString(): string });
    return sum + (payment.type === "REFUND" ? -amount : amount);
  }, 0);
}

function expenseTotal(expenses: Array<{ amount: unknown; status: string | null }>) {
  return expenses.reduce((sum, expense) => {
    if (!countableExpenseStatuses.includes(expense.status ?? "RECORDED")) {
      return sum;
    }

    return sum + toNumber(expense.amount as { toString(): string });
  }, 0);
}

export async function getDashboardOverviewData(input: {
  tenantId: string;
  userId: string;
  role: UserRole;
}) {
  const db = await getPrisma();
  const today = getTodayJalali();
  const todayStart = jalaliToDate(today.year, today.month, today.day);
  const tomorrowStart = addDays(todayStart, 1);
  const afterTomorrowStart = addDays(todayStart, 2);
  const nextSevenDaysEnd = addDays(todayStart, 7);
  const { startDate: monthStart, endDate: monthEnd } = getJalaliMonthRange(today.year, today.month);

  await syncInAppNotificationsForTenant({
    tenantId: input.tenantId,
    userId: input.userId,
  });

  const [
    todayEventsCount,
    tomorrowEventsCount,
    upcomingEventsCount,
    currentMonthContractsCount,
    todayPayments,
    todayExpenses,
    monthPayments,
    monthExpenses,
    outstandingContracts,
    upcomingEvents,
    latestContracts,
    latestPayments,
    latestExpenses,
    todayEvents,
    weekEvents,
    dueInstallments,
    dueCheques,
    hallStatusRows,
    hallProfile,
    contractSetting,
    user,
    subscription,
    baseCounts,
    notificationData,
  ] = await Promise.all([
    db.contract.count({
      where: {
        tenantId: input.tenantId,
        status: { in: eventStatuses },
        eventDate: { gte: todayStart, lt: tomorrowStart },
      },
    }),
    db.contract.count({
      where: {
        tenantId: input.tenantId,
        status: { in: eventStatuses },
        eventDate: { gte: tomorrowStart, lt: afterTomorrowStart },
      },
    }),
    db.contract.count({
      where: {
        tenantId: input.tenantId,
        status: { in: eventStatuses },
        eventDate: { gte: todayStart, lt: nextSevenDaysEnd },
      },
    }),
    db.contract.count({
      where: {
        tenantId: input.tenantId,
        status: { not: "CANCELED" },
        eventDate: { gte: monthStart, lt: monthEnd },
      },
    }),
    db.payment.findMany({
      where: {
        tenantId: input.tenantId,
        status: { in: countablePaymentStatuses },
        paidAt: { gte: todayStart, lt: tomorrowStart },
      },
      select: { amount: true, type: true, status: true },
    }),
    db.expense.findMany({
      where: {
        tenantId: input.tenantId,
        status: { in: countableExpenseStatuses },
        occurredAt: { gte: todayStart, lt: tomorrowStart },
      },
      select: { amount: true, status: true },
    }),
    db.payment.findMany({
      where: {
        tenantId: input.tenantId,
        status: { in: countablePaymentStatuses },
        paidAt: { gte: monthStart, lt: monthEnd },
      },
      select: { amount: true, type: true, status: true },
    }),
    db.expense.findMany({
      where: {
        tenantId: input.tenantId,
        status: { in: countableExpenseStatuses },
        occurredAt: { gte: monthStart, lt: monthEnd },
      },
      select: { amount: true, status: true },
    }),
    db.contract.findMany({
      where: {
        tenantId: input.tenantId,
        status: { in: activeContractStatuses },
        remainingAmount: { gt: 0 },
      },
      select: {
        id: true,
        contractNo: true,
        eventDate: true,
        remainingAmount: true,
        customer: { select: { fullName: true } },
      },
      orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    db.contract.findMany({
      where: {
        tenantId: input.tenantId,
        status: { in: eventStatuses },
        eventDate: { gte: todayStart },
      },
      select: {
        id: true,
        contractNo: true,
        eventTypeName: true,
        eventDate: true,
        eventStartTime: true,
        guestCount: true,
        status: true,
        customer: { select: { fullName: true } },
        hall: { select: { name: true } },
        salon: { select: { name: true } },
      },
      orderBy: [{ eventDate: "asc" }, { eventStartTime: "asc" }, { createdAt: "desc" }],
      take: 3,
    }),
    db.contract.findMany({
      where: { tenantId: input.tenantId },
      select: {
        id: true,
        contractNo: true,
        eventTypeName: true,
        eventDate: true,
        status: true,
        finalTotal: true,
        depositAmount: true,
        customer: { select: { fullName: true } },
        payments: { select: { amount: true, type: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    db.payment.findMany({
      where: { tenantId: input.tenantId },
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        paidAt: true,
        customer: { select: { fullName: true } },
        contract: { select: { id: true, contractNo: true, customer: { select: { fullName: true } } } },
        paymentMethod: { select: { title: true, type: true } },
      },
      orderBy: { paidAt: "desc" },
      take: 3,
    }),
    db.expense.findMany({
      where: { tenantId: input.tenantId },
      select: {
        id: true,
        title: true,
        amount: true,
        occurredAt: true,
        status: true,
        contract: { select: { id: true, contractNo: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 3,
    }),
    db.contract.findMany({
      where: {
        tenantId: input.tenantId,
        status: { in: eventStatuses },
        eventDate: { gte: todayStart, lt: tomorrowStart },
      },
      select: {
        id: true,
        contractNo: true,
        eventTypeName: true,
        eventDate: true,
        eventStartTime: true,
        guestCount: true,
        status: true,
        customer: { select: { fullName: true } },
        hall: { select: { name: true } },
        salon: { select: { name: true } },
      },
      orderBy: [{ eventStartTime: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
    db.contract.findMany({
      where: {
        tenantId: input.tenantId,
        status: { in: eventStatuses },
        eventDate: { gte: todayStart, lt: nextSevenDaysEnd },
      },
      select: {
        id: true,
        eventDate: true,
        hallId: true,
        salonId: true,
      },
      orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
      take: 120,
    }),
    db.paymentInstallment.findMany({
      where: {
        tenantId: input.tenantId,
        dueDate: { lt: tomorrowStart },
        status: { notIn: ["PAID", "CONFIRMED", "CANCELED"] },
      },
      select: {
        id: true,
        paymentId: true,
        installmentNumber: true,
        amount: true,
        dueDate: true,
        status: true,
        contract: { select: { id: true, contractNo: true, customer: { select: { fullName: true } } } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 20,
    }),
    db.paymentCheque.findMany({
      where: {
        tenantId: input.tenantId,
        dueDate: { lt: tomorrowStart },
        status: { notIn: ["PAID", "CONFIRMED", "CANCELED"] },
      },
      select: {
        id: true,
        paymentId: true,
        chequeNumber: true,
        ownerName: true,
        amount: true,
        dueDate: true,
        status: true,
        contract: { select: { id: true, contractNo: true, customer: { select: { fullName: true } } } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 20,
    }),
    db.hall.findMany({
      where: { tenantId: input.tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        totalCapacity: true,
        salons: { where: { isActive: true }, select: { id: true, name: true } },
        contracts: {
          where: {
            tenantId: input.tenantId,
            status: { in: eventStatuses },
            eventDate: { gte: todayStart, lt: nextSevenDaysEnd },
          },
          select: { id: true, eventDate: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 6,
    }),
    db.tenantHallProfile.findUnique({
      where: { tenantId: input.tenantId },
      select: {
        brandName: true,
        legalName: true,
        address: true,
        phone: true,
        mobile: true,
        licenseNumber: true,
      },
    }),
    db.contractSetting.findUnique({
      where: { tenantId: input.tenantId },
      select: {
        contractPrefix: true,
        nextNumber: true,
        printTemplateName: true,
        defaultClauses: true,
        paymentTerms: true,
      },
    }),
    db.user.findUnique({
      where: { id: input.userId },
      select: { name: true, phone: true, nationalCode: true, address: true, postalCode: true },
    }),
    db.subscription.findUnique({
      where: { tenantId: input.tenantId },
      select: { plan: true, status: true, currentPeriodStart: true, currentPeriodEnd: true },
    }),
    Promise.all([
      db.hall.count({ where: { tenantId: input.tenantId, isActive: true } }),
      db.salon.count({ where: { tenantId: input.tenantId, isActive: true } }),
      db.menu.count({ where: { tenantId: input.tenantId, isActive: true } }),
      db.service.count({ where: { tenantId: input.tenantId, isActive: true } }),
      db.menu.count({ where: { tenantId: input.tenantId, isActive: true, pricePerGuest: { lte: 0 } } }),
      db.service.count({ where: { tenantId: input.tenantId, isActive: true, price: { lte: 0 } } }),
      db.paymentMethod.count({ where: { tenantId: input.tenantId, isActive: true } }),
      db.financialCategory.count({ where: { tenantId: input.tenantId, isActive: true } }),
    ]).then(([halls, salons, menus, services, menusWithoutPrice, servicesWithoutPrice, paymentMethods, financialCategories]) => ({
      halls,
      salons,
      menus,
      services,
      menusWithoutPrice,
      servicesWithoutPrice,
      paymentMethods,
      financialCategories,
    })),
    getHeaderNotifications({ tenantId: input.tenantId, userId: input.userId, limit: 5 }),
  ]);

  const postEventDecisionGate = await getPostEventDecisionGateData({
    tenantId: input.tenantId,
    role: input.role,
  });

  const todayPaymentsTotal = paymentNetTotal(todayPayments);
  const todayExpensesTotal = expenseTotal(todayExpenses);
  const monthPaymentsTotal = paymentNetTotal(monthPayments);
  const monthExpensesTotal = expenseTotal(monthExpenses);
  const outstandingTotal = outstandingContracts.reduce(
    (sum, contract) => sum + toNumber(contract.remainingAmount),
    0,
  );
  const accountMissingFields = [
    user?.phone,
    user?.nationalCode,
    user?.address,
    user?.postalCode,
  ].filter((value) => !value).length;
  const hallMissingFields = [
    hallProfile?.brandName,
    hallProfile?.address,
    hallProfile?.phone || hallProfile?.mobile,
    hallProfile?.licenseNumber,
  ].filter((value) => !value).length;
  const contractSettingsMissingFields = [
    contractSetting?.contractPrefix,
    contractSetting?.nextNumber,
    contractSetting?.defaultClauses || contractSetting?.paymentTerms,
  ].filter((value) => !value).length;
  const overdueReceivables = [
    ...dueInstallments.map((item) => ({
      id: `installment-${item.id}`,
      kind: "installment" as const,
      title: `قسط ${item.installmentNumber}`,
      description: item.contract
        ? `قرارداد ${item.contract.contractNo} · ${item.contract.customer.fullName}`
        : "قسط بدون قرارداد مستقیم",
      amount: toNumber(item.amount as { toString(): string }),
      dueDate: item.dueDate,
      href: item.contract?.id ? `/dashboard/contracts/${item.contract.id}` : "/dashboard/payments",
    })),
    ...dueCheques.map((item) => ({
      id: `cheque-${item.id}`,
      kind: "cheque" as const,
      title: item.chequeNumber ? `چک ${item.chequeNumber}` : "چک دریافتنی",
      description: item.contract
        ? `قرارداد ${item.contract.contractNo} · ${item.contract.customer.fullName}`
        : item.ownerName || "چک بدون قرارداد مستقیم",
      amount: toNumber(item.amount as { toString(): string }),
      dueDate: item.dueDate,
      href: item.contract?.id ? `/dashboard/contracts/${item.contract.id}` : "/dashboard/payments",
    })),
  ].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const overdueReceivablesTotal = overdueReceivables.reduce((sum, item) => sum + item.amount, 0);
  const weekReservations = Array.from({ length: 7 }, (_, index) => {
    const dayStart = addDays(todayStart, index);
    const dayEnd = addDays(todayStart, index + 1);
    const dayEvents = weekEvents.filter((event) => event.eventDate >= dayStart && event.eventDate < dayEnd);

    return {
      date: dayStart,
      count: dayEvents.length,
    };
  });
  const hallStatuses = hallStatusRows.map((hall) => {
    const todayCount = hall.contracts.filter((contract) => contract.eventDate >= todayStart && contract.eventDate < tomorrowStart).length;
    return {
      id: hall.id,
      name: hall.name,
      totalCapacity: hall.totalCapacity,
      salonsCount: hall.salons.length,
      todayEventsCount: todayCount,
      nextSevenDaysEventsCount: hall.contracts.length,
    };
  });
  const setupHealthItems = [
    hallMissingFields === 0,
    baseCounts.halls > 0 && baseCounts.salons > 0,
    baseCounts.menus > 0 && baseCounts.services > 0 && baseCounts.menusWithoutPrice + baseCounts.servicesWithoutPrice === 0,
    baseCounts.paymentMethods > 0 && baseCounts.financialCategories > 0,
    contractSettingsMissingFields === 0,
    accountMissingFields === 0,
  ];
  const setupCompletionPercent = Math.round((setupHealthItems.filter(Boolean).length / setupHealthItems.length) * 100);
  const urgentActions = buildUrgentActions({
    reminders: notificationData.items.map(toHeaderNotificationView),
    overdueReceivablesCount: overdueReceivables.length,
    overdueReceivablesTotal,
    todayEventsCount,
    outstandingContractsCount: outstandingContracts.length,
    hallMissingFields,
    accountMissingFields,
    setupCompletionPercent,
  });
  const todayTimeline = buildTodayTimeline({
    todayEvents,
    overdueReceivables,
  });

  return {
    dateRanges: {
      todayStart,
      monthStart,
      monthEnd,
    },
    hero: {
      todayEventsCount,
      tomorrowEventsCount,
      upcomingEventsCount,
      todayPaymentsTotal,
      outstandingContractsCount: outstandingContracts.length,
      accessStatus: getAccessStatusLabel(subscription?.plan, subscription?.status),
      accessTone: getAccessTone(subscription?.status),
      daysLeft: daysUntil(subscription?.currentPeriodEnd),
    },
    updatedAt: new Date(),
    urgentActions,
    todayTimeline,
    weekReservations,
    hallStatuses,
    overdueReceivables: {
      count: overdueReceivables.length,
      total: overdueReceivablesTotal,
      items: overdueReceivables.slice(0, 4),
    },
    postEventConfirmations: {
      count: postEventDecisionGate.count,
      startDate: postEventDecisionGate.startDate,
      items: postEventDecisionGate.items,
    },
    kpis: {
      todayPaymentsTotal,
      todayPaymentsCount: todayPayments.length,
      todayExpensesTotal,
      todayExpensesCount: todayExpenses.length,
      outstandingTotal,
      outstandingCount: outstandingContracts.length,
      currentMonthContractsCount,
      upcomingEventsCount,
      estimatedMonthlyProfit: monthPaymentsTotal - monthExpensesTotal,
      monthPaymentsTotal,
      monthExpensesTotal,
    },
    reminders: notificationData.items.map(toHeaderNotificationView),
    upcomingEvents,
    latestContracts: latestContracts.map((contract) => {
      const paidAmount = getContractPaidAmount(contract.payments, contract.depositAmount);
      const remainingAmount = contract.status === "CANCELED"
        ? 0
        : getContractRemainingAmount(contract.finalTotal, paidAmount);
      return {
        ...contract,
        paidAmount,
        remainingAmount,
        paymentStatus: contract.status === "CANCELED"
          ? "PAID"
          : getPaymentStatusSummary(contract.finalTotal, paidAmount),
      };
    }),
    latestPayments,
    latestExpenses,
    recentActivity: buildRecentActivity({
      latestContracts,
      latestPayments,
      latestExpenses,
      notifications: notificationData.items,
    }),
    setupHealth: {
      completionPercent: setupCompletionPercent,
      hallInfo: {
        missingFields: hallMissingFields,
        isComplete: hallMissingFields === 0,
      },
      baseDefinitions: {
        halls: baseCounts.halls,
        salons: baseCounts.salons,
      },
      catalog: {
        menus: baseCounts.menus,
        services: baseCounts.services,
        withoutPrice: baseCounts.menusWithoutPrice + baseCounts.servicesWithoutPrice,
      },
      finance: {
        paymentMethods: baseCounts.paymentMethods,
        financialCategories: baseCounts.financialCategories,
      },
      contractSettings: {
        missingFields: contractSettingsMissingFields,
        isComplete: contractSettingsMissingFields === 0,
      },
      account: {
        missingFields: accountMissingFields,
        isComplete: accountMissingFields === 0,
      },
    },
  };
}

function buildUrgentActions(input: {
  reminders: ReturnType<typeof toHeaderNotificationView>[];
  overdueReceivablesCount: number;
  overdueReceivablesTotal: number;
  todayEventsCount: number;
  outstandingContractsCount: number;
  hallMissingFields: number;
  accountMissingFields: number;
  setupCompletionPercent: number;
}) {
  const criticalReminders = input.reminders.filter((item) => item.severity === "CRITICAL");
  const warningReminders = input.reminders.filter((item) => item.severity === "WARNING");
  const actions = [
    input.overdueReceivablesCount > 0
      ? {
          id: "overdue-receivables",
          severity: "CRITICAL" as const,
          title: "دریافت سررسید شده دارید",
          message: `${formatSafeCount(input.overdueReceivablesCount)} مورد به مبلغ ${formatSafeIRR(input.overdueReceivablesTotal)} نیازمند پیگیری است.`,
          href: "/dashboard/payments",
        }
      : null,
    criticalReminders[0]
      ? {
          id: `critical-${criticalReminders[0].id}`,
          severity: "CRITICAL" as const,
          title: criticalReminders[0].title,
          message: criticalReminders[0].message,
          href: criticalReminders[0].href ?? "/dashboard/settings/notifications",
        }
      : null,
    input.todayEventsCount > 0
      ? {
          id: "today-events",
          severity: "WARNING" as const,
          title: "مراسم امروز را مرور کنید",
          message: `${formatSafeCount(input.todayEventsCount)} مراسم برای امروز ثبت شده است. خدمات، منو و دریافت‌ها را کنترل کنید.`,
          href: "/dashboard/calendar",
        }
      : null,
    warningReminders[0]
      ? {
          id: `warning-${warningReminders[0].id}`,
          severity: "WARNING" as const,
          title: warningReminders[0].title,
          message: warningReminders[0].message,
          href: warningReminders[0].href ?? "/dashboard/settings/notifications",
        }
      : null,
    input.setupCompletionPercent < 100
      ? {
          id: "setup-health",
          severity: "INFO" as const,
          title: "اطلاعات پایه کامل نیست",
          message: `تکمیل اطلاعات سامانه ${formatSafeCount(input.setupCompletionPercent)}٪ است. برای قرارداد و گزارش دقیق‌تر، موارد ناقص را کامل کنید.`,
          href: "/dashboard/base",
        }
      : null,
    input.outstandingContractsCount > 0
      ? {
          id: "outstanding-contracts",
          severity: "INFO" as const,
          title: "قرارداد دارای مانده وجود دارد",
          message: `${formatSafeCount(input.outstandingContractsCount)} قرارداد هنوز مانده قابل دریافت دارد.`,
          href: "/dashboard/contracts?paymentStatus=unsettled",
        }
      : null,
  ].filter(Boolean);

  return actions.slice(0, 5) as Array<{
    id: string;
    severity: "INFO" | "WARNING" | "CRITICAL";
    title: string;
    message: string;
    href: string;
  }>;
}

function buildTodayTimeline(input: {
  todayEvents: Array<{
    id: string;
    contractNo: string;
    eventTypeName: string | null;
    eventDate: Date;
    eventStartTime: string | null;
    guestCount: number;
    customer: { fullName: string };
    hall: { name: string } | null;
    salon: { name: string } | null;
  }>;
  overdueReceivables: Array<{
    id: string;
    kind: "installment" | "cheque";
    title: string;
    description: string;
    amount: number;
    dueDate: Date;
    href: string;
  }>;
}) {
  return [
    ...input.todayEvents.map((event) => ({
      id: `event-${event.id}`,
      type: "event" as const,
      title: event.eventTypeName || "مراسم امروز",
      description: `${event.customer.fullName} · ${formatSafeCount(event.guestCount)} مهمان · ${event.hall?.name || "تالار ثبت نشده"}${event.salon?.name ? ` / ${event.salon.name}` : ""}`,
      timeLabel: event.eventStartTime || "زمان ثبت نشده",
      href: `/dashboard/contracts/${event.id}`,
      amount: null as number | null,
    })),
    ...input.overdueReceivables.slice(0, 3).map((item) => ({
      id: `due-${item.id}`,
      type: "receivable" as const,
      title: item.title,
      description: item.description,
      timeLabel: "سررسید شده",
      href: item.href,
      amount: item.amount,
    })),
  ].slice(0, 6);
}

function formatSafeCount(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function formatSafeIRR(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(value)} ریال`;
}

function getAccessStatusLabel(plan?: string, status?: string) {
  if (status === "ACTIVE") return "اشتراک فعال";
  if (plan === "DEMO" || status === "TRIALING") return "دوره بررسی";
  if (status === "PAST_DUE" || status === "EXPIRED" || status === "CANCELED") return "نیازمند تمدید";
  return "قابل بررسی";
}

function getAccessTone(status?: string) {
  if (status === "ACTIVE" || status === "TRIALING") return "success";
  if (status === "PAST_DUE" || status === "EXPIRED" || status === "CANCELED") return "danger";
  return "warning";
}

function buildRecentActivity(input: {
  latestContracts: Array<{
    id: string;
    contractNo: string;
    createdAt?: Date;
    eventDate: Date;
    customer: { fullName: string };
  }>;
  latestPayments: Array<{
    id: string;
    amount: unknown;
    paidAt: Date;
    contract: { id: string; contractNo: string; customer: { fullName: string } } | null;
    customer: { fullName: string } | null;
  }>;
  latestExpenses: Array<{
    id: string;
    title: string;
    amount: unknown;
    occurredAt: Date;
    contract: { id: string; contractNo: string } | null;
  }>;
  notifications: HeaderNotificationItem[];
}) {
  return [
    ...input.latestContracts.map((contract) => ({
      id: `contract-${contract.id}`,
      type: "contract" as const,
      title: `قرارداد ${contract.contractNo}`,
      description: contract.customer.fullName,
      date: contract.createdAt ?? contract.eventDate,
      href: `/dashboard/contracts/${contract.id}`,
      amount: null as number | null,
    })),
    ...input.latestPayments.map((payment) => ({
      id: `payment-${payment.id}`,
      type: "payment" as const,
      title: "دریافت ثبت شد",
      description: payment.contract?.customer.fullName ?? payment.customer?.fullName ?? "بدون مشتری",
      date: payment.paidAt,
      href: payment.contract?.id ? `/dashboard/contracts/${payment.contract.id}` : "/dashboard/payments",
      amount: toNumber(payment.amount as { toString(): string }),
    })),
    ...input.latestExpenses.map((expense) => ({
      id: `expense-${expense.id}`,
      type: "expense" as const,
      title: expense.title,
      description: expense.contract?.contractNo ? `قرارداد ${expense.contract.contractNo}` : "هزینه عملیاتی",
      date: expense.occurredAt,
      href: `/dashboard/expenses/${expense.id}`,
      amount: toNumber(expense.amount as { toString(): string }),
    })),
    ...input.notifications
      .filter((notification) => notification.severity === "CRITICAL" || notification.severity === "WARNING")
      .slice(0, 2)
      .map((notification) => ({
        id: `notification-${notification.id}`,
        type: "notification" as const,
        title: notification.title,
        description: notification.message,
        date: notification.createdAt,
        href: notification.href ?? "/dashboard/settings/notifications",
        amount: null as number | null,
      })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);
}
