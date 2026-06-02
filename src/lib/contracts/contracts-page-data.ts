import "server-only";
import type { ContractStatus, Prisma } from "@prisma/client";
import {
  getPaidAmount,
  getPaymentStatus,
  getRemainingAmount,
  toNumber,
  type PaymentStatus,
} from "@/lib/contracts/display";
import {
  getJalaliMonthRange,
  getTodayJalali,
  jalaliToDate,
  parseDateLikeToDate,
} from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";
import { toEnglishDigits } from "@/lib/validation/normalizers";

export type ContractSortKey = "newest" | "nearestEvent" | "highestRemaining" | "highestTotal" | "updatedAt";
export type ContractsViewMode = "cards" | "compact";
export type ContractQuickFilter = "needsAction" | "outstanding" | "unpaid" | "paid" | "upcoming" | "missingInfo" | "currentMonth";

export type ContractsPageSearchParams = {
  q?: string;
  status?: string;
  paymentStatus?: string;
  hallId?: string;
  salonId?: string;
  eventTypeId?: string;
  eventType?: string;
  from?: string;
  to?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
  view?: string;
  quick?: string;
};

export type ContractListItem = Prisma.ContractGetPayload<{
  include: {
    customer: { select: { fullName: true; phone: true; nationalCode: true; nationalId: true } };
    hall: { select: { id: true; name: true } };
    salon: { select: { id: true; name: true } };
    payments: { select: { amount: true; type: true; status: true; paidAt: true; createdAt: true } };
    postEventConfirmation: { select: { status: true; invoiceRequired: true } };
    invoice: { select: { id: true; invoiceNo: true; status: true } };
  };
}> & {
  paidAmount: number;
  remainingComputed: number;
  paymentStatus: PaymentStatus;
  urgencyLabel: string;
  lastPaymentAt: Date | null;
  lastPaymentAmount: number;
  lastActivityLabel: string;
  actionFlags: string[];
  hasMissingInfo: boolean;
};

const contractStatuses: ContractStatus[] = ["DRAFT", "RESERVED", "CONFIRMED", "COMPLETED", "CANCELED"];
const paymentStatuses: PaymentStatus[] = ["PAID", "PARTIAL", "UNPAID"];
const activeStatuses: ContractStatus[] = ["DRAFT", "RESERVED", "CONFIRMED"];
const eventStatuses: ContractStatus[] = ["RESERVED", "CONFIRMED"];

export const contractQuickFilterLabels: Record<ContractQuickFilter, string> = {
  needsAction: "نیازمند اقدام",
  outstanding: "دارای مانده",
  unpaid: "بدون دریافت",
  paid: "تسویه‌شده",
  upcoming: "مراسم پیش‌رو",
  missingInfo: "اطلاعات ناقص",
  currentMonth: "ماه جاری",
};

export const contractPageSortLabels: Record<ContractSortKey, string> = {
  newest: "جدیدترین",
  nearestEvent: "نزدیک‌ترین مراسم",
  highestRemaining: "بیشترین مانده",
  highestTotal: "بیشترین مبلغ",
  updatedAt: "آخرین به‌روزرسانی",
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parsePage(value: string | undefined) {
  const page = Number(toEnglishDigits(value ?? "1"));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parsePageSize(value: string | undefined) {
  const pageSize = Number(toEnglishDigits(value ?? "10"));
  return [10, 20, 50].includes(pageSize) ? pageSize : 10;
}

function parseSort(value: string | undefined): ContractSortKey {
  if (value === "nearestEvent" || value === "eventDate") return "nearestEvent";
  if (value === "highestRemaining") return "highestRemaining";
  if (value === "highestTotal" || value === "highestAmount") return "highestTotal";
  if (value === "updatedAt") return "updatedAt";
  return "newest";
}

function parseView(value: string | undefined): ContractsViewMode {
  return value === "cards" ? "cards" : "compact";
}

function parseQuickFilter(value: string | undefined): ContractQuickFilter | undefined {
  if (value === "needsAction" || value === "outstanding" || value === "unpaid" || value === "paid" || value === "upcoming" || value === "missingInfo" || value === "currentMonth") {
    return value;
  }
  return undefined;
}

function parseStatus(value: string | undefined): ContractStatus | undefined {
  return contractStatuses.includes(value as ContractStatus) ? (value as ContractStatus) : undefined;
}

function parsePaymentStatus(value: string | undefined): PaymentStatus | undefined {
  return paymentStatuses.includes(value as PaymentStatus) ? (value as PaymentStatus) : undefined;
}

function normalizeFilterValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized !== "all" ? normalized : undefined;
}

function parseDateFilter(value: string | undefined) {
  if (!value) return null;
  return parseDateLikeToDate(toEnglishDigits(value).replace(/[\/\.]/g, "-"));
}

function getOrderBy(sort: ContractSortKey): Prisma.ContractOrderByWithRelationInput[] {
  if (sort === "nearestEvent") return [{ eventDate: "asc" }, { createdAt: "desc" }];
  if (sort === "highestRemaining") return [{ remainingAmount: "desc" }, { eventDate: "asc" }];
  if (sort === "highestTotal") return [{ finalTotal: "desc" }, { createdAt: "desc" }];
  if (sort === "updatedAt") return [{ updatedAt: "desc" }];
  return [{ createdAt: "desc" }];
}

function getMissingInfoWhere(): Prisma.ContractWhereInput {
  return {
    OR: [
      { eventTypeName: null },
      { eventTypeName: "" },
      { hallId: null },
      { salonId: null },
      { customer: { is: { AND: [{ nationalCode: null }, { nationalId: null }] } } },
    ],
  };
}

function buildQuickWhere(input: {
  quick?: ContractQuickFilter;
  todayStart: Date;
  nextSevenDaysEnd: Date;
  monthStart: Date;
  monthEnd: Date;
}): Prisma.ContractWhereInput | undefined {
  if (!input.quick) return undefined;
  if (input.quick === "outstanding") return { remainingAmount: { gt: 0 }, status: { in: activeStatuses } };
  if (input.quick === "unpaid") return { payments: { none: {} }, status: { in: activeStatuses } };
  if (input.quick === "paid") return { remainingAmount: { lte: 0 }, status: { not: "CANCELED" } };
  if (input.quick === "upcoming") return { status: { in: eventStatuses }, eventDate: { gte: input.todayStart, lt: input.nextSevenDaysEnd } };
  if (input.quick === "currentMonth") return { eventDate: { gte: input.monthStart, lt: input.monthEnd } };
  if (input.quick === "missingInfo") return { AND: [{ status: { in: activeStatuses } }, getMissingInfoWhere()] };
  return {
    OR: [
      { remainingAmount: { gt: 0 }, status: { in: activeStatuses } },
      { payments: { none: {} }, status: { in: activeStatuses } },
      { status: { in: eventStatuses }, eventDate: { gte: input.todayStart, lt: input.nextSevenDaysEnd } },
      { AND: [{ status: { in: activeStatuses } }, getMissingInfoWhere()] },
    ],
  };
}

function hasMissingContractInfo(contract: {
  eventTypeName: string | null;
  hallId: string | null;
  salonId: string | null;
  customer: { nationalCode: string | null; nationalId: string | null };
}) {
  return !contract.eventTypeName || !contract.hallId || !contract.salonId || (!contract.customer.nationalCode && !contract.customer.nationalId);
}

function isUpcomingEvent(contract: { status: ContractStatus; eventDate: Date }, todayStart: Date, nextSevenDaysEnd: Date) {
  return eventStatuses.includes(contract.status) && contract.eventDate >= todayStart && contract.eventDate < nextSevenDaysEnd;
}

function getContractFinancialSnapshot(contract: {
  status: ContractStatus;
  finalTotal: { toString(): string } | string | number | null | undefined;
  depositAmount: { toString(): string } | string | number | null | undefined;
  remainingAmount: { toString(): string } | string | number | null | undefined;
  payments: Array<{ amount: { toString(): string } | string | number | null | undefined; type?: string | null; status?: string | null }>;
}) {
  const finalTotal = toNumber(contract.finalTotal);
  const storedRemaining = Math.max(0, toNumber(contract.remainingAmount));
  const paidFromReceipts = getPaidAmount(contract.payments, contract.depositAmount);

  if (contract.status === "CANCELED") {
    return {
      paidAmount: paidFromReceipts,
      remainingComputed: 0,
      paymentStatus: getPaymentStatus(finalTotal, paidFromReceipts),
    };
  }

  if (contract.status === "COMPLETED" && storedRemaining <= 0) {
    return {
      paidAmount: Math.max(paidFromReceipts, finalTotal),
      remainingComputed: 0,
      paymentStatus: "PAID" as PaymentStatus,
    };
  }

  const remainingComputed = getRemainingAmount(finalTotal, paidFromReceipts);

  return {
    paidAmount: paidFromReceipts,
    remainingComputed,
    paymentStatus: getPaymentStatus(finalTotal, paidFromReceipts),
  };
}

function buildWhere(input: {
  tenantId: string;
  query: string;
  status?: ContractStatus;
  paymentStatus?: PaymentStatus;
  hallId?: string;
  salonId?: string;
  eventTypeId?: string;
  fromDate: Date | null;
  toDate: Date | null;
  quick?: ContractQuickFilter;
  todayStart: Date;
  nextSevenDaysEnd: Date;
  monthStart: Date;
  monthEnd: Date;
}) {
  const normalizedQuery = toEnglishDigits(input.query).replace(/[\s-]/g, "");
  const quickWhere = buildQuickWhere({ quick: input.quick, todayStart: input.todayStart, nextSevenDaysEnd: input.nextSevenDaysEnd, monthStart: input.monthStart, monthEnd: input.monthEnd });
  const where: Prisma.ContractWhereInput = {
    tenantId: input.tenantId,
    ...(quickWhere ? { AND: [quickWhere] } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.hallId ? { hallId: input.hallId } : {}),
    ...(input.salonId ? { salonId: input.salonId } : {}),
    ...(input.eventTypeId ? { eventTypeId: input.eventTypeId } : {}),
    ...(input.fromDate || input.toDate
      ? {
          eventDate: {
            ...(input.fromDate ? { gte: input.fromDate } : {}),
            ...(input.toDate ? { lt: addDays(input.toDate, 1) } : {}),
          },
        }
      : {}),
    ...(input.paymentStatus === "PAID"
      ? { remainingAmount: { lte: 0 }, status: { not: "CANCELED" } }
      : input.paymentStatus === "UNPAID"
        ? { payments: { none: {} }, status: { in: activeStatuses } }
        : input.paymentStatus === "PARTIAL"
          ? { payments: { some: {} }, remainingAmount: { gt: 0 }, status: { in: activeStatuses } }
          : {}),
    ...(input.query
      ? {
          OR: [
            { contractNo: { contains: input.query } },
            { title: { contains: input.query } },
            { eventTypeName: { contains: input.query } },
            {
              customer: {
                is: {
                  OR: [
                    { fullName: { contains: input.query } },
                    { phone: { contains: normalizedQuery || input.query } },
                    { nationalCode: { contains: normalizedQuery || input.query } },
                    { nationalId: { contains: normalizedQuery || input.query } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  return where;
}

function getUrgencyLabel(contract: { status: ContractStatus; eventDate: Date }, todayStart: Date) {
  if (contract.status === "CANCELED") return "لغو شده";
  if (contract.status === "COMPLETED") return "برگزار شده";

  const days = Math.ceil((contract.eventDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "امروز";
  if (days === 1) return "فردا";
  if (days > 1 && days <= 7) return `${days} روز مانده`;
  if (days < 0) return "گذشته";
  return "برنامه‌ریزی‌شده";
}

function getCurrentViewSummary(input: {
  query: string;
  status?: ContractStatus;
  paymentStatus?: PaymentStatus;
  quick?: ContractQuickFilter;
  sort: ContractSortKey;
}) {
  const items: string[] = [];
  if (input.query) items.push("جست‌وجوی فعال");
  if (input.quick) items.push(contractQuickFilterLabels[input.quick]);
  if (input.status) items.push("فیلتر وضعیت قرارداد");
  if (input.paymentStatus === "PAID") items.push("تسویه‌شده");
  if (input.paymentStatus === "PARTIAL") items.push("دارای مانده");
  if (input.paymentStatus === "UNPAID") items.push("بدون دریافت");
  items.push(`مرتب‌سازی: ${contractPageSortLabels[input.sort]}`);
  return items.join("، ");
}

export async function getContractsPageData(tenantId: string, searchParams: ContractsPageSearchParams) {
  const db = await getPrisma();
  const today = getTodayJalali();
  const todayStart = jalaliToDate(today.year, today.month, today.day);
  const nextSevenDaysEnd = addDays(todayStart, 7);
  const { startDate: monthStart, endDate: monthEnd } = getJalaliMonthRange(today.year, today.month);

  const page = parsePage(searchParams.page);
  const pageSize = parsePageSize(searchParams.pageSize);
  const query = (searchParams.q ?? "").trim();
  const status = parseStatus(searchParams.status);
  const paymentStatus = parsePaymentStatus(searchParams.paymentStatus);
  const hallId = normalizeFilterValue(searchParams.hallId);
  const salonId = normalizeFilterValue(searchParams.salonId);
  const eventTypeId = normalizeFilterValue(searchParams.eventTypeId ?? searchParams.eventType);
  const from = searchParams.from ?? searchParams.dateFrom ?? "";
  const to = searchParams.to ?? searchParams.dateTo ?? "";
  const fromDate = parseDateFilter(from);
  const toDate = parseDateFilter(to);
  const sort = parseSort(searchParams.sort);
  const view = parseView(searchParams.view);
  const quick = parseQuickFilter(searchParams.quick);
  const where = buildWhere({ tenantId, query, status, paymentStatus, hallId, salonId, eventTypeId, fromDate, toDate, quick, todayStart, nextSevenDaysEnd, monthStart, monthEnd });

  const [contracts, totalFiltered, halls, salons, eventTypes, summaryContracts] = await Promise.all([
    db.contract.findMany({
      where,
      include: {
        customer: { select: { fullName: true, phone: true, nationalCode: true, nationalId: true } },
        hall: { select: { id: true, name: true } },
        salon: { select: { id: true, name: true } },
        payments: { select: { amount: true, type: true, status: true, paidAt: true, createdAt: true } },
        postEventConfirmation: { select: { status: true, invoiceRequired: true } },
        invoice: { select: { id: true, invoiceNo: true, status: true } },
      },
      orderBy: getOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.contract.count({ where }),
    db.hall.findMany({
      where: { tenantId },
      select: { id: true, name: true, isActive: true },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    db.salon.findMany({
      where: { tenantId, ...(hallId ? { hallId } : {}) },
      select: { id: true, name: true, hallId: true, isActive: true, hall: { select: { name: true } } },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    db.contractEventType.findMany({
      where: { tenantId },
      select: { id: true, name: true, isActive: true },
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    db.contract.findMany({
      where: { tenantId },
      select: {
        id: true,
        status: true,
        eventDate: true,
        finalTotal: true,
        depositAmount: true,
        remainingAmount: true,
        remainingAmountManual: true,
        hallId: true,
        salonId: true,
        eventTypeName: true,
        customer: { select: { nationalCode: true, nationalId: true } },
        payments: { select: { amount: true, type: true, status: true, paidAt: true, createdAt: true } },
      },
    }),
  ]);

  const items: ContractListItem[] = contracts.map((contract) => {
    const financials = getContractFinancialSnapshot(contract);
    const paidAmount = financials.paidAmount;
    const remainingComputed = financials.remainingComputed;
    const paymentStatus = financials.paymentStatus;
    const hasMissingInfo = hasMissingContractInfo(contract);
    const isActionableContract = activeStatuses.includes(contract.status);
    const lastPayment = [...contract.payments].sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())[0] ?? null;
    const actionFlags = [
      isActionableContract && remainingComputed > 0 ? "مانده دارد" : "",
      isActionableContract && paymentStatus === "UNPAID" ? "بدون دریافت" : "",
      isActionableContract && hasMissingInfo ? "اطلاعات ناقص" : "",
      isUpcomingEvent(contract, todayStart, nextSevenDaysEnd) ? "مراسم پیش‌رو" : "",
    ].filter(Boolean);
    return {
      ...contract,
      paidAmount,
      remainingComputed,
      paymentStatus,
      urgencyLabel: getUrgencyLabel(contract, todayStart),
      lastPaymentAt: lastPayment?.paidAt ?? null,
      lastPaymentAmount: lastPayment ? toNumber(lastPayment.amount) : 0,
      lastActivityLabel: lastPayment ? "آخرین دریافت" : "آخرین بروزرسانی",
      actionFlags,
      hasMissingInfo,
    };
  });

  const totalPaid = summaryContracts.reduce(
    (sum, contract) => sum + getContractFinancialSnapshot(contract).paidAmount,
    0,
  );
  const totalFinal = summaryContracts.reduce((sum, contract) => sum + toNumber(contract.finalTotal), 0);
  const outstanding = summaryContracts.reduce((acc, contract) => {
    if (!activeStatuses.includes(contract.status)) return acc;
    const remaining = getContractFinancialSnapshot(contract).remainingComputed;
    if (remaining > 0) {
      acc.count += 1;
      acc.total += remaining;
    }
    return acc;
  }, { count: 0, total: 0 });

  return {
    contracts: items,
    filters: {
      query,
      status,
      paymentStatus,
      hallId: hallId ?? "all",
      salonId: salonId ?? "all",
      eventTypeId: eventTypeId ?? "all",
      from,
      to,
      sort,
      page,
      pageSize,
      view,
      quick,
    },
    options: { halls, salons, eventTypes },
    pagination: {
      page,
      pageSize,
      total: totalFiltered,
      totalPages: Math.max(1, Math.ceil(totalFiltered / pageSize)),
      firstItem: totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1,
      lastItem: Math.min(page * pageSize, totalFiltered),
    },
    kpis: {
      upcomingEventsCount: summaryContracts.filter((contract) => eventStatuses.includes(contract.status) && contract.eventDate >= todayStart && contract.eventDate < nextSevenDaysEnd).length,
      outstandingRemainingTotal: outstanding.total,
      outstandingContractsCount: outstanding.count,
      totalPaidAmount: totalPaid,
      totalContractAmount: totalFinal,
      currentMonthContractsCount: summaryContracts.filter((contract) => contract.eventDate >= monthStart && contract.eventDate < monthEnd).length,
      totalContractsCount: summaryContracts.length,
      activeContractsCount: summaryContracts.filter((contract) => activeStatuses.includes(contract.status)).length,
      actionRequiredContractsCount: summaryContracts.filter((contract) => {
        if (!activeStatuses.includes(contract.status)) return false;
        const financials = getContractFinancialSnapshot(contract);
        return financials.remainingComputed > 0 || financials.paymentStatus === "UNPAID" || hasMissingContractInfo(contract) || isUpcomingEvent(contract, todayStart, nextSevenDaysEnd);
      }).length,
      missingInfoContractsCount: summaryContracts.filter((contract) => activeStatuses.includes(contract.status) && hasMissingContractInfo(contract)).length,
      unpaidContractsCount: summaryContracts.filter((contract) => activeStatuses.includes(contract.status) && getContractFinancialSnapshot(contract).paymentStatus === "UNPAID").length,
      paidContractsCount: summaryContracts.filter((contract) => contract.status !== "CANCELED" && getContractFinancialSnapshot(contract).paymentStatus === "PAID").length,
    },
    headerSummary: buildHeaderSummary(summaryContracts.length, outstanding.count, outstanding.total, summaryContracts.filter((contract) => eventStatuses.includes(contract.status) && contract.eventDate >= todayStart && contract.eventDate < nextSevenDaysEnd).length),
    currentViewSummary: getCurrentViewSummary({ query, status, paymentStatus, quick, sort }),
    hasAnyContract: summaryContracts.length > 0,
  };
}

function buildHeaderSummary(total: number, outstandingCount: number, outstandingTotal: number, upcomingCount: number) {
  if (total === 0) {
    return "هنوز قراردادی ثبت نشده است. برای شروع، اولین قرارداد مراسم را ثبت کنید.";
  }

  if (outstandingCount > 0) {
    return `${formatPersianNumber(outstandingCount)} قرارداد دارای مانده هستند و ${formatPersianNumber(upcomingCount)} مراسم در ۷ روز آینده برگزار می‌شود.`;
  }

  return `${formatPersianNumber(total)} قرارداد ثبت شده؛ ${formatPersianNumber(upcomingCount)} مراسم پیش‌رو و ${formatIRR(outstandingTotal)} مانده قابل پیگیری.`;
}
