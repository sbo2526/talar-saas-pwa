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
import { getPrisma } from "@/lib/prisma";
import { toEnglishDigits } from "@/lib/validation/normalizers";

const activeContractStatuses: ContractStatus[] = ["RESERVED", "CONFIRMED"];
const visibleContractStatuses: ContractStatus[] = ["DRAFT", "RESERVED", "CONFIRMED", "COMPLETED"];
const computedSorts = ["highestRemaining", "nearestEvent", "highestContractTotal", "mostContracts"] as const;

export type CustomerSortKey =
  | "newest"
  | "name"
  | "highestRemaining"
  | "nearestEvent"
  | "highestContractTotal"
  | "mostContracts";

export type CustomerStatusFilter = "all" | "active" | "inactive";
export type CustomerPaymentFilter = "all" | "settled" | "outstanding" | "unpaid";
export type CustomerContractFilter = "all" | "none" | "has" | "active" | "upcoming";
export type CustomerInfoFilter = "all" | "incomplete" | "complete";
export type CustomersViewMode = "cards" | "compact";

export type CustomersPageSearchParams = {
  q?: string;
  customerStatus?: string;
  status?: string;
  paymentStatus?: string;
  balanceStatus?: string;
  contractStatus?: string;
  hasContract?: string;
  eventType?: string;
  infoStatus?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
  view?: string;
};

type CustomerForCard = Prisma.CustomerGetPayload<{
  include: {
    contracts: {
      include: {
        payments: { select: { amount: true; type: true; status: true } };
      };
    };
    payments: {
      include: {
        contract: { select: { id: true; contractNo: true; eventTypeName: true; eventDate: true } };
        paymentMethod: { select: { title: true; type: true } };
      };
    };
  };
}>;

export type CustomerCardData = {
  customer: CustomerForCard;
  summary: CustomerFinancialSummary;
};

export type CustomerFinancialSummary = {
  contractCount: number;
  activeContractCount: number;
  totalContractAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus | "NO_CONTRACT";
  hasOutstandingBalance: boolean;
  hasUpcomingEvent: boolean;
  latestContract: CustomerForCard["contracts"][number] | null;
  nearestUpcomingContract: CustomerForCard["contracts"][number] | null;
  outstandingContractId: string | null;
};

export type CustomersPageData = Awaited<ReturnType<typeof getCustomersPageData>>;

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(toEnglishDigits(value ?? ""));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePageSize(value: string | undefined) {
  const parsed = parsePositiveInt(value, 10);
  return [10, 50, 100].includes(parsed) ? parsed : 10;
}

function parseView(value: string | undefined): CustomersViewMode {
  if (value === "cards") return "cards";
  return "compact";
}

function parseSort(value: string | undefined): CustomerSortKey {
  if (
    value === "name" ||
    value === "highestRemaining" ||
    value === "nearestEvent" ||
    value === "highestContractTotal" ||
    value === "mostContracts"
  ) {
    return value;
  }

  return "newest";
}

function parseCustomerStatus(value: string | undefined): CustomerStatusFilter {
  return value === "active" || value === "inactive" ? value : "all";
}

function parsePaymentStatus(value: string | undefined): CustomerPaymentFilter {
  if (value === "outstanding" || value === "due") return "outstanding";
  if (value === "settled") return "settled";
  if (value === "unpaid" || value === "withoutPayment") return "unpaid";
  return "all";
}

function parseInfoStatus(value: string | undefined): CustomerInfoFilter {
  if (value === "incomplete") return "incomplete";
  if (value === "complete") return "complete";
  return "all";
}

function parseContractStatus(value: string | undefined, legacyHasContract: string | undefined): CustomerContractFilter {
  if (value === "none" || legacyHasContract === "no") return "none";
  if (value === "has" || legacyHasContract === "yes") return "has";
  if (value === "active") return "active";
  if (value === "upcoming") return "upcoming";
  return "all";
}

function parseDateFilter(value: string | undefined) {
  if (!value) return null;
  return parseDateLikeToDate(toEnglishDigits(value).replace(/[\/\.]/g, "-"));
}

function normalizeSearch(value: string | undefined) {
  return (value ?? "").trim();
}

function buildCustomerWhere(input: {
  tenantId: string;
  query: string;
  customerStatus: CustomerStatusFilter;
  paymentStatus: CustomerPaymentFilter;
  contractStatus: CustomerContractFilter;
  eventType: string;
  infoStatus: CustomerInfoFilter;
  fromDate: Date | null;
  toDate: Date | null;
  todayStart: Date;
  nextThirtyDaysEnd: Date;
}) {
  const normalizedDigits = toEnglishDigits(input.query).replace(/[\s-]/g, "");
  const and: Prisma.CustomerWhereInput[] = [{ tenantId: input.tenantId }];

  if (input.customerStatus === "active") {
    and.push({ isActive: true });
  } else if (input.customerStatus === "inactive") {
    and.push({ isActive: false });
  }

  if (input.infoStatus === "incomplete") {
    and.push({
      OR: [
        { address: null },
        { address: "" },
        { AND: [{ nationalCode: null }, { nationalId: null }] },
        { AND: [{ nationalCode: "" }, { nationalId: "" }] },
        { AND: [{ nationalCode: null }, { nationalId: "" }] },
        { AND: [{ nationalCode: "" }, { nationalId: null }] },
      ],
    });
  } else if (input.infoStatus === "complete") {
    and.push({
      AND: [
        { address: { not: null } },
        { address: { not: "" } },
        {
          OR: [
            { AND: [{ nationalCode: { not: null } }, { nationalCode: { not: "" } }] },
            { AND: [{ nationalId: { not: null } }, { nationalId: { not: "" } }] },
          ],
        },
      ],
    });
  }

  if (input.query) {
    and.push({
      OR: [
        { fullName: { contains: input.query } },
        { phone: { contains: normalizedDigits || input.query } },
        { nationalCode: { contains: normalizedDigits || input.query } },
        { nationalId: { contains: normalizedDigits || input.query } },
      ],
    });
  }

  if (input.paymentStatus === "outstanding") {
    and.push({
      contracts: {
        some: {
          status: { in: visibleContractStatuses },
          remainingAmount: { gt: 0 },
        },
      },
    });
  } else if (input.paymentStatus === "settled") {
    and.push({
      contracts: {
        some: {},
        none: {
          status: { in: visibleContractStatuses },
          remainingAmount: { gt: 0 },
        },
      },
    });
  } else if (input.paymentStatus === "unpaid") {
    and.push({
      contracts: { some: { status: { in: visibleContractStatuses } } },
      payments: { none: {} },
    });
  }

  if (input.contractStatus === "none") {
    and.push({ contracts: { none: {} } });
  } else if (input.contractStatus === "has") {
    and.push({ contracts: { some: {} } });
  } else if (input.contractStatus === "active") {
    and.push({ contracts: { some: { status: { in: activeContractStatuses } } } });
  } else if (input.contractStatus === "upcoming") {
    and.push({
      contracts: {
        some: {
          status: { in: activeContractStatuses },
          eventDate: { gte: input.todayStart },
        },
      },
    });
  }

  if (input.eventType) {
    and.push({ contracts: { some: { eventTypeName: input.eventType } } });
  }

  if (input.fromDate || input.toDate) {
    and.push({
      contracts: {
        some: {
          eventDate: {
            ...(input.fromDate ? { gte: input.fromDate } : {}),
            ...(input.toDate ? { lt: addDays(input.toDate, 1) } : {}),
          },
        },
      },
    });
  }

  return { AND: and };
}

function getOrderBy(sort: CustomerSortKey): Prisma.CustomerOrderByWithRelationInput {
  if (sort === "name") return { fullName: "asc" };
  return { createdAt: "desc" };
}

function buildSummary(customer: CustomerForCard, todayStart: Date): CustomerFinancialSummary {
  const contracts = [...customer.contracts];
  const latestContract = contracts.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime())[0] ?? null;
  const upcoming = contracts
    .filter((contract) => contract.eventDate >= todayStart && activeContractStatuses.includes(contract.status))
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

  let paidAmount = 0;
  let totalContractAmount = 0;
  let remainingAmount = 0;
  let outstandingContractId: string | null = null;

  for (const contract of contracts) {
    const paid = getPaidAmount(contract.payments, contract.depositAmount);
    const isCanceled = contract.status === "CANCELED";
    const remaining = isCanceled ? 0 : getRemainingAmount(contract.finalTotal, paid);
    totalContractAmount += isCanceled ? paid : toNumber(contract.finalTotal);
    paidAmount += paid;
    remainingAmount += remaining;

    if (!outstandingContractId && remaining > 0 && visibleContractStatuses.includes(contract.status)) {
      outstandingContractId = contract.id;
    }
  }

  const paymentStatus = contracts.length === 0
    ? "NO_CONTRACT"
    : getPaymentStatus(totalContractAmount, paidAmount);

  return {
    contractCount: contracts.length,
    activeContractCount: contracts.filter((contract) => activeContractStatuses.includes(contract.status)).length,
    totalContractAmount,
    paidAmount,
    remainingAmount,
    paymentStatus,
    hasOutstandingBalance: remainingAmount > 0,
    hasUpcomingEvent: upcoming.length > 0,
    latestContract,
    nearestUpcomingContract: upcoming[0] ?? null,
    outstandingContractId,
  };
}

function sortCards(cards: CustomerCardData[], sort: CustomerSortKey) {
  if (sort === "highestRemaining") {
    return cards.sort((a, b) => b.summary.remainingAmount - a.summary.remainingAmount);
  }

  if (sort === "highestContractTotal") {
    return cards.sort((a, b) => b.summary.totalContractAmount - a.summary.totalContractAmount);
  }

  if (sort === "nearestEvent") {
    return cards.sort((a, b) => {
      const aTime = a.summary.nearestUpcomingContract?.eventDate.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.summary.nearestUpcomingContract?.eventDate.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  }

  if (sort === "mostContracts") {
    return cards.sort((a, b) => b.summary.contractCount - a.summary.contractCount);
  }

  return cards;
}

function getCurrentViewSummary(input: {
  query: string;
  customerStatus: CustomerStatusFilter;
  paymentStatus: CustomerPaymentFilter;
  contractStatus: CustomerContractFilter;
  infoStatus: CustomerInfoFilter;
  sort: CustomerSortKey;
}) {
  const items: string[] = [];
  if (input.query) items.push("جست‌وجوی فعال");
  if (input.customerStatus === "active") items.push("مشتریان فعال");
  if (input.customerStatus === "inactive") items.push("مشتریان غیرفعال");
  if (input.paymentStatus === "outstanding") items.push("مشتریان دارای مانده");
  if (input.paymentStatus === "settled") items.push("مشتریان تسویه‌شده");
  if (input.paymentStatus === "unpaid") items.push("بدون دریافت");
  if (input.contractStatus === "none") items.push("بدون قرارداد");
  if (input.contractStatus === "has") items.push("دارای قرارداد");
  if (input.contractStatus === "active") items.push("دارای قرارداد فعال");
  if (input.contractStatus === "upcoming") items.push("دارای مراسم پیش‌رو");
  if (input.infoStatus === "incomplete") items.push("اطلاعات ناقص");
  if (input.infoStatus === "complete") items.push("اطلاعات کامل");
  items.push(`مرتب‌سازی: ${sortLabels[input.sort]}`);
  return items.join("، ");
}

export const sortLabels: Record<CustomerSortKey, string> = {
  newest: "جدیدترین مشتریان",
  name: "نام مشتری",
  highestRemaining: "بیشترین مانده",
  nearestEvent: "نزدیک‌ترین مراسم",
  highestContractTotal: "بیشترین مبلغ قرارداد",
  mostContracts: "بیشترین تعداد قرارداد",
};

export async function getCustomersPageData(tenantId: string, searchParams: CustomersPageSearchParams) {
  const db = await getPrisma();
  const today = getTodayJalali();
  const todayStart = jalaliToDate(today.year, today.month, today.day);
  const nextThirtyDaysEnd = addDays(todayStart, 30);
  const { startDate: monthStart, endDate: monthEnd } = getJalaliMonthRange(today.year, today.month);
  const page = parsePositiveInt(searchParams.page, 1);
  const pageSize = parsePageSize(searchParams.pageSize);
  const view = parseView(searchParams.view);
  const query = normalizeSearch(searchParams.q);
  const customerStatus = parseCustomerStatus(searchParams.customerStatus ?? searchParams.status);
  const paymentStatus = parsePaymentStatus(searchParams.paymentStatus ?? searchParams.balanceStatus);
  const contractStatus = parseContractStatus(searchParams.contractStatus, searchParams.hasContract);
  const eventType = searchParams.eventType && searchParams.eventType !== "all" ? searchParams.eventType : "";
  const infoStatus = parseInfoStatus(searchParams.infoStatus);
  const fromDate = parseDateFilter(searchParams.from);
  const toDate = parseDateFilter(searchParams.to);
  const sort = parseSort(searchParams.sort);
  const where = buildCustomerWhere({
    tenantId,
    query,
    customerStatus,
    paymentStatus,
    contractStatus,
    eventType,
    infoStatus,
    fromDate,
    toDate,
    todayStart,
    nextThirtyDaysEnd,
  });
  const isComputedSort = computedSorts.includes(sort as (typeof computedSorts)[number]);

  const [kpiData, eventTypeRows, totalFiltered, rawCustomers] = await Promise.all([
    getCustomerKpis(tenantId, monthStart, monthEnd, todayStart, nextThirtyDaysEnd),
    db.contract.findMany({
      where: {
        tenantId,
        eventTypeName: { not: null },
      },
      select: { eventTypeName: true },
      distinct: ["eventTypeName"],
      orderBy: { eventTypeName: "asc" },
      take: 50,
    }),
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      include: {
        contracts: {
          include: {
            payments: { select: { amount: true, type: true, status: true } },
          },
          orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
        },
        payments: {
          include: {
            contract: { select: { id: true, contractNo: true, eventTypeName: true, eventDate: true } },
            paymentMethod: { select: { title: true, type: true } },
          },
          orderBy: { paidAt: "desc" },
          take: 2,
        },
      },
      orderBy: getOrderBy(sort),
      skip: isComputedSort ? 0 : (page - 1) * pageSize,
      take: isComputedSort ? 400 : pageSize,
    }),
  ]);

  const enriched = rawCustomers.map((customer) => ({
    customer,
    summary: buildSummary(customer, todayStart),
  }));
  const sorted = isComputedSort ? sortCards(enriched, sort) : enriched;
  const paged = isComputedSort ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  return {
    kpis: kpiData,
    customers: paged,
    eventTypes: eventTypeRows.map((row) => row.eventTypeName).filter(Boolean) as string[],
    filters: {
      query,
      customerStatus,
      paymentStatus,
      contractStatus,
      eventType,
      infoStatus,
      from: searchParams.from ?? "",
      to: searchParams.to ?? "",
      sort,
      page,
      pageSize,
      view,
    },
    pagination: {
      page,
      pageSize,
      total: totalFiltered,
      totalPages,
      firstItem: totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1,
      lastItem: Math.min(page * pageSize, totalFiltered),
    },
    currentViewSummary: getCurrentViewSummary({ query, customerStatus, paymentStatus, contractStatus, infoStatus, sort }),
    hasActiveFilters: Boolean(query || customerStatus !== "all" || paymentStatus !== "all" || contractStatus !== "all" || infoStatus !== "all" || eventType || searchParams.from || searchParams.to),
    hasAnyCustomer: kpiData.totalCustomers > 0,
  };
}

async function getCustomerKpis(
  tenantId: string,
  monthStart: Date,
  monthEnd: Date,
  todayStart: Date,
  nextThirtyDaysEnd: Date,
) {
  const db = await getPrisma();
  const [
    totalCustomers,
    activeCustomers,
    newCustomersThisMonth,
    incompleteCustomers,
    withoutPaymentCustomers,
    outstandingContracts,
    outstandingAggregate,
    upcomingContracts,
  ] = await Promise.all([
    db.customer.count({ where: { tenantId } }),
    db.customer.count({ where: { tenantId, isActive: true } }),
    db.customer.count({ where: { tenantId, createdAt: { gte: monthStart, lt: monthEnd } } }),
    db.customer.count({
      where: {
        tenantId,
        OR: [
          { address: null },
          { address: "" },
          { AND: [{ nationalCode: null }, { nationalId: null }] },
          { AND: [{ nationalCode: "" }, { nationalId: "" }] },
          { AND: [{ nationalCode: null }, { nationalId: "" }] },
          { AND: [{ nationalCode: "" }, { nationalId: null }] },
        ],
      },
    }),
    db.customer.count({
      where: {
        tenantId,
        contracts: { some: { status: { in: visibleContractStatuses } } },
        payments: { none: {} },
      },
    }),
    db.contract.findMany({
      where: {
        tenantId,
        status: { in: visibleContractStatuses },
        remainingAmount: { gt: 0 },
      },
      select: { customerId: true },
      distinct: ["customerId"],
    }),
    db.contract.aggregate({
      where: {
        tenantId,
        status: { in: visibleContractStatuses },
        remainingAmount: { gt: 0 },
      },
      _sum: { remainingAmount: true },
    }),
    db.contract.count({
      where: {
        tenantId,
        status: { in: activeContractStatuses },
        eventDate: { gte: todayStart, lt: nextThirtyDaysEnd },
      },
    }),
  ]);

  return {
    totalCustomers,
    activeCustomers,
    customersWithOutstanding: outstandingContracts.length,
    totalOutstanding: toNumber(outstandingAggregate._sum.remainingAmount),
    newCustomersThisMonth,
    incompleteCustomers,
    customersWithoutPayment: withoutPaymentCustomers,
    upcomingEvents: upcomingContracts,
  };
}
