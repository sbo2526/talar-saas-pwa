import "server-only";

import type { CalendarDayStatus, ContractStatus, Prisma } from "@prisma/client";
import {
  contractStatusLabels,
  getPaidAmount,
  getPaymentStatus,
  getRemainingAmount,
  toNumber,
  type PaymentStatus,
} from "@/lib/contracts/display";
import {
  formatJalaliDayKey,
  getJalaliMonthDays,
  getJalaliMonthRange,
  getTodayJalali,
  jalaliToDate,
  parseJalaliMonthFromSearchParams,
  toPersianDigits,
  type JalaliCalendarDay,
} from "@/lib/date/jalali";
import { getJalaliDayOccasions, type JalaliOccasion } from "@/lib/date/jalali-holidays";
import { getPrisma } from "@/lib/prisma";
import { toEnglishDigits } from "@/lib/validation/normalizers";

export type CalendarViewMode = "month" | "upcoming";

export type CalendarVisualStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "CONTRACTED"
  | "CLOSED"
  | "BLOCKED"
  | "NOTE"
  | "FOLLOW_UP";

export type CalendarFilterStatus = CalendarVisualStatus | "all";

export type CalendarPageSearchParams = {
  year?: string;
  month?: string;
  day?: string;
  hallId?: string;
  salonId?: string;
  status?: string;
  q?: string;
  eventTypeId?: string;
  outstandingOnly?: string;
  upcomingOnly?: string;
  view?: string;
};

export type CalendarNoteItem = {
  id: string;
  date: Date;
  status: CalendarDayStatus;
  title: string | null;
  note: string | null;
  color: string | null;
  updatedAt: Date;
};

export type CalendarContractEvent = Prisma.ContractGetPayload<{
  include: {
    customer: { select: { fullName: true; phone: true; nationalCode: true; nationalId: true } };
    hall: { select: { id: true; name: true } };
    salon: { select: { id: true; name: true; hallId: true } };
    payments: { select: { amount: true; type: true; status: true } };
  };
}> & {
  paidAmount: number;
  remainingComputed: number;
  paymentStatus: PaymentStatus;
};

export type CalendarDaySummary = {
  day: JalaliCalendarDay;
  note: CalendarNoteItem | null;
  contracts: CalendarContractEvent[];
  occasions: JalaliOccasion[];
  status: CalendarVisualStatus;
  isMutedByStatus: boolean;
  eventCount: number;
  uniqueHallCount: number;
  busySalonCount: number;
  availableSalonCount: number;
  remainingTotal: number;
  finalTotal: number;
  paidTotal: number;
};

const eventStatuses: ContractStatus[] = ["RESERVED", "CONFIRMED"];

export const calendarVisualStatusLabels: Record<CalendarVisualStatus, string> = {
  AVAILABLE: "آزاد",
  RESERVED: "رزرو شده",
  CONTRACTED: "قرارداد ثبت‌شده",
  CLOSED: "تعطیل رسمی",
  BLOCKED: "مسدود",
  NOTE: "یادداشت مدیریتی",
  FOLLOW_UP: "در انتظار پیگیری",
};

export const calendarStatusLegend: Array<{
  status: CalendarVisualStatus;
  label: string;
  dotClassName: string;
}> = [
  { status: "AVAILABLE", label: "آزاد", dotClassName: "bg-[#25a46d]" },
  { status: "RESERVED", label: "رزرو شده", dotClassName: "bg-[#c7a15a]" },
  { status: "CONTRACTED", label: "قرارداد ثبت‌شده", dotClassName: "bg-[#111827]" },
  { status: "CLOSED", label: "تعطیل رسمی", dotClassName: "bg-[#b45353]" },
  { status: "BLOCKED", label: "مسدود", dotClassName: "bg-[#6b7280]" },
  { status: "NOTE", label: "یادداشت مدیریتی", dotClassName: "bg-[#5367b4]" },
  { status: "FOLLOW_UP", label: "در انتظار پیگیری", dotClassName: "bg-[#d08a20]" },
];

export function isCalendarFilterStatus(value: string | undefined): value is CalendarFilterStatus {
  return (
    value === "all" ||
    value === "AVAILABLE" ||
    value === "RESERVED" ||
    value === "CONTRACTED" ||
    value === "CLOSED" ||
    value === "BLOCKED" ||
    value === "NOTE" ||
    value === "FOLLOW_UP"
  );
}

function parseView(value: string | undefined): CalendarViewMode {
  return value === "upcoming" ? "upcoming" : "month";
}

function normalizeFilterValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized !== "all" ? normalized : undefined;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseSelectedDay(params: CalendarPageSearchParams, year: number, month: number) {
  const monthDays = getJalaliMonthDays(year, month);
  const today = getTodayJalali();
  const requested = Number(toEnglishDigits(params.day ?? ""));
  if (Number.isInteger(requested) && requested >= 1 && requested <= monthDays.length) {
    return requested;
  }

  return today.year === year && today.month === month ? today.day : 1;
}

function buildContractWhere(input: {
  tenantId: string;
  startDate: Date;
  endDate: Date;
  hallId?: string;
  salonId?: string;
  eventTypeId?: string;
  query: string;
  outstandingOnly: boolean;
  upcomingOnly: boolean;
  todayStart: Date;
}) {
  const normalizedQuery = toEnglishDigits(input.query).replace(/[\s-]/g, "");
  const where: Prisma.ContractWhereInput = {
    tenantId: input.tenantId,
    eventDate: {
      gte: input.upcomingOnly && input.todayStart > input.startDate ? input.todayStart : input.startDate,
      lt: input.endDate,
    },
    status: { not: "CANCELED" },
    ...(input.hallId ? { hallId: input.hallId } : {}),
    ...(input.salonId ? { salonId: input.salonId } : {}),
    ...(input.eventTypeId ? { eventTypeId: input.eventTypeId } : {}),
    ...(input.outstandingOnly ? { remainingAmount: { gt: 0 } } : {}),
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

function decorateContract(contract: Prisma.ContractGetPayload<{
  include: {
    customer: { select: { fullName: true; phone: true; nationalCode: true; nationalId: true } };
    hall: { select: { id: true; name: true } };
    salon: { select: { id: true; name: true; hallId: true } };
    payments: { select: { amount: true; type: true; status: true } };
  };
}>): CalendarContractEvent {
  const paidAmount = getPaidAmount(contract.payments, contract.depositAmount);
  const remainingComputed = getRemainingAmount(contract.finalTotal, paidAmount);

  return {
    ...contract,
    paidAmount,
    remainingComputed,
    paymentStatus: getPaymentStatus(contract.finalTotal, paidAmount),
  };
}

function getDayVisualStatus(
  note: CalendarNoteItem | null,
  contracts: CalendarContractEvent[],
  isFriday: boolean,
  occasions: JalaliOccasion[],
): CalendarVisualStatus {
  if (contracts.some((contract) => ["CONFIRMED", "COMPLETED"].includes(contract.status))) {
    return "CONTRACTED";
  }

  if (contracts.some((contract) => contract.status === "RESERVED" || contract.status === "DRAFT")) {
    return "RESERVED";
  }

  if (note?.status === "CLOSED" || note?.status === "HOLIDAY") {
    return "CLOSED";
  }

  if (note?.status === "BLOCKED") {
    return "BLOCKED";
  }

  if (isFriday || occasions.some((occasion) => occasion.isOfficialHoliday)) {
    return "CLOSED";
  }

  if (note?.status === "FOLLOW_UP") {
    return "FOLLOW_UP";
  }

  if (note) {
    return "NOTE";
  }

  return "AVAILABLE";
}

function summarizeDay(input: {
  day: JalaliCalendarDay;
  note: CalendarNoteItem | null;
  contracts: CalendarContractEvent[];
  occasions: JalaliOccasion[];
  statusFilter: CalendarFilterStatus;
  activeSalonCount: number;
}) {
  const status = getDayVisualStatus(input.note, input.contracts, input.day.isFriday, input.occasions);
  const busySalonIds = new Set(input.contracts.map((contract) => contract.salonId).filter(Boolean));
  const uniqueHallIds = new Set(input.contracts.map((contract) => contract.hallId).filter(Boolean));
  const paidTotal = input.contracts.reduce((sum, contract) => sum + contract.paidAmount, 0);
  const finalTotal = input.contracts.reduce((sum, contract) => sum + toNumber(contract.finalTotal), 0);
  const remainingTotal = input.contracts.reduce((sum, contract) => sum + contract.remainingComputed, 0);

  return {
    day: input.day,
    note: input.note,
    contracts: input.contracts,
    occasions: input.occasions,
    status,
    isMutedByStatus: input.statusFilter !== "all" && input.statusFilter !== status,
    eventCount: input.contracts.length,
    uniqueHallCount: uniqueHallIds.size,
    busySalonCount: busySalonIds.size,
    availableSalonCount: Math.max(0, input.activeSalonCount - busySalonIds.size),
    remainingTotal,
    finalTotal,
    paidTotal,
  } satisfies CalendarDaySummary;
}

export async function getCalendarPageData(tenantId: string, searchParams: CalendarPageSearchParams) {
  const db = await getPrisma();
  const currentMonth = parseJalaliMonthFromSearchParams(searchParams);
  const selectedDayNumber = parseSelectedDay(searchParams, currentMonth.year, currentMonth.month);
  const selectedStatus = isCalendarFilterStatus(searchParams.status) ? searchParams.status : "all";
  const hallId = normalizeFilterValue(searchParams.hallId);
  const salonId = normalizeFilterValue(searchParams.salonId);
  const eventTypeId = normalizeFilterValue(searchParams.eventTypeId);
  const query = searchParams.q?.trim() ?? "";
  const outstandingOnly = searchParams.outstandingOnly === "1";
  const upcomingOnly = searchParams.upcomingOnly === "1";
  const view = parseView(searchParams.view);
  const { startDate, endDate } = getJalaliMonthRange(currentMonth.year, currentMonth.month);
  const today = getTodayJalali();
  const todayStart = jalaliToDate(today.year, today.month, today.day);
  const upcomingEndDate = addDays(todayStart, 30);
  const monthDays = getJalaliMonthDays(currentMonth.year, currentMonth.month);
  const selectedDay = monthDays.find((day) => day.day === selectedDayNumber) ?? monthDays[0];

  const contractWhere = buildContractWhere({
    tenantId,
    startDate,
    endDate,
    hallId,
    salonId,
    eventTypeId,
    query,
    outstandingOnly,
    upcomingOnly,
    todayStart,
  });

  const upcomingWhere = buildContractWhere({
    tenantId,
    startDate: todayStart,
    endDate: upcomingEndDate,
    hallId,
    salonId,
    eventTypeId,
    query,
    outstandingOnly,
    upcomingOnly: false,
    todayStart,
  });

  const [halls, salons, allActiveSalons, eventTypes, notes, contracts, upcomingContracts] = await Promise.all([
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
    db.salon.findMany({
      where: { tenantId, isActive: true, ...(hallId ? { hallId } : {}), ...(salonId ? { id: salonId } : {}) },
      select: { id: true },
    }),
    db.contractEventType.findMany({
      where: { tenantId },
      select: { id: true, name: true, isActive: true },
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    db.calendarDayNote.findMany({
      where: { tenantId, date: { gte: startDate, lt: endDate } },
      orderBy: { date: "asc" },
    }),
    db.contract.findMany({
      where: contractWhere,
      include: {
        customer: { select: { fullName: true, phone: true, nationalCode: true, nationalId: true } },
        hall: { select: { id: true, name: true } },
        salon: { select: { id: true, name: true, hallId: true } },
        payments: { select: { amount: true, type: true, status: true } },
      },
      orderBy: [{ eventDate: "asc" }, { eventStartTime: "asc" }, { contractNo: "asc" }],
    }),
    db.contract.findMany({
      where: upcomingWhere,
      include: {
        customer: { select: { fullName: true, phone: true, nationalCode: true, nationalId: true } },
        hall: { select: { id: true, name: true } },
        salon: { select: { id: true, name: true, hallId: true } },
        payments: { select: { amount: true, type: true, status: true } },
      },
      orderBy: [{ eventDate: "asc" }, { eventStartTime: "asc" }, { contractNo: "asc" }],
      take: 12,
    }),
  ]);

  const decoratedContracts = contracts.map(decorateContract);
  const decoratedUpcomingContracts = upcomingContracts.map(decorateContract);
  const notesByDay = new Map(notes.map((note) => [formatJalaliDayKey(note.date), note]));
  const contractsByDay = new Map<string, CalendarContractEvent[]>();

  for (const contract of decoratedContracts) {
    const key = formatJalaliDayKey(contract.eventDate);
    contractsByDay.set(key, [...(contractsByDay.get(key) ?? []), contract]);
  }

  const daySummaries = monthDays.map((day) =>
    summarizeDay({
      day,
      note: notesByDay.get(day.dayKey) ?? null,
      contracts: contractsByDay.get(day.dayKey) ?? [],
      occasions: getJalaliDayOccasions(day.year, day.month, day.day),
      statusFilter: selectedStatus,
      activeSalonCount: allActiveSalons.length,
    }),
  );

  const selectedDaySummary = daySummaries.find((summary) => summary.day.dayKey === selectedDay.dayKey) ?? daySummaries[0];
  const officialHolidayCount = daySummaries.filter(
    (summary) => summary.day.isFriday || summary.occasions.some((occasion) => occasion.isOfficialHoliday) || summary.note?.status === "HOLIDAY",
  ).length;
  const blockedCount = daySummaries.filter((summary) => summary.status === "BLOCKED").length;
  const manualStatusCount = notes.filter((note) => ["BLOCKED", "CLOSED", "HOLIDAY", "FOLLOW_UP", "NOTE"].includes(note.status)).length;
  const upcomingEventsInMonthCount = daySummaries.reduce(
    (count, summary) => count + summary.contracts.filter((contract) => eventStatuses.includes(contract.status) && contract.eventDate >= todayStart).length,
    0,
  );

  return {
    month: currentMonth,
    selectedDay,
    filters: {
      hallId: hallId ?? "all",
      salonId: salonId ?? "all",
      eventTypeId: eventTypeId ?? "all",
      status: selectedStatus,
      query,
      outstandingOnly,
      upcomingOnly,
      view,
    },
    options: { halls, salons, eventTypes },
    daySummaries,
    selectedDaySummary,
    upcomingEvents: decoratedUpcomingContracts,
    kpis: {
      availableDays: daySummaries.filter((summary) => summary.status === "AVAILABLE").length,
      reservedDays: daySummaries.filter((summary) => summary.status === "RESERVED" || summary.status === "CONTRACTED").length,
      upcomingEvents: upcomingEventsInMonthCount,
      blockedDays: blockedCount,
      officialHolidays: officialHolidayCount,
      manualStatuses: manualStatusCount,
    },
    activeSalonCount: allActiveSalons.length,
    hasFilters: Boolean(hallId || salonId || eventTypeId || query || outstandingOnly || upcomingOnly || selectedStatus !== "all"),
    headerSummary: buildHeaderSummary({
      daySummaries,
      upcomingEventsCount: upcomingEventsInMonthCount,
      blockedCount,
    }),
  };
}

function buildHeaderSummary(input: {
  daySummaries: CalendarDaySummary[];
  upcomingEventsCount: number;
  blockedCount: number;
}) {
  const todayEvents = input.daySummaries.find((summary) => summary.day.isToday)?.eventCount ?? 0;
  const available = input.daySummaries.filter((summary) => summary.status === "AVAILABLE").length;
  const reserved = input.daySummaries.filter((summary) => summary.status === "RESERVED" || summary.status === "CONTRACTED").length;

  if (todayEvents > 0) {
    return `امروز ${toPersianDigits(todayEvents)} مراسم در تقویم ثبت شده و ${toPersianDigits(input.upcomingEventsCount)} مراسم پیش‌رو در این ماه دارید.`;
  }

  if (reserved > 0) {
    return `${toPersianDigits(reserved)} روز دارای رزرو یا قرارداد است و ${toPersianDigits(available)} روز آزاد برای برنامه‌ریزی باقی مانده است.`;
  }

  if (input.blockedCount > 0) {
    return `${toPersianDigits(input.blockedCount)} روز مسدود شده و باقی ماه برای رزرو قابل بررسی است.`;
  }

  return `برای این ماه هنوز مراسمی ثبت نشده است و ${toPersianDigits(available)} روز آزاد در تقویم دیده می‌شود.`;
}

export function getContractEventLabel(contract: CalendarContractEvent) {
  return contract.eventTypeName || contract.title || "مراسم ثبت‌شده";
}

export function getPrimaryDayOccasion(summary: Pick<CalendarDaySummary, "occasions">) {
  return summary.occasions.find((occasion) => occasion.isOfficialHoliday) ?? summary.occasions[0] ?? null;
}

export function getCompactDayLabel(summary: CalendarDaySummary) {
  const primaryOccasion = getPrimaryDayOccasion(summary);

  if (summary.eventCount > 0) {
    return `${toPersianDigits(summary.eventCount)} مراسم`;
  }

  if (summary.note?.status === "BLOCKED") return "مسدود";
  if (summary.note?.status === "CLOSED" || summary.note?.status === "HOLIDAY") return "تعطیل";
  if (summary.status === "FOLLOW_UP") return "پیگیری";
  if (summary.status === "NOTE") return "یادداشت";

  if (primaryOccasion?.isOfficialHoliday) {
    return primaryOccasion.title.length <= 14 ? primaryOccasion.title : "تعطیل رسمی";
  }

  if (summary.day.isFriday) return "جمعه";

  return "";
}

export function getContractStatusPersianLabel(status: ContractStatus) {
  return contractStatusLabels[status];
}
