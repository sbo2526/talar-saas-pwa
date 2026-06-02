import {
  dateToJalaliParts,
  formatJalaliDate,
  formatJalaliDayKey,
  formatJalaliMonthTitle,
  getJalaliMonthRange,
  getJalaliWeekdayIndex,
  getTodayJalali,
  jalaliToDate,
  parseDateLikeToDate,
  toDateOnlyString,
  toLatinDigits,
  toPersianDigits,
} from "@/lib/date/jalali";

export const reportPeriodValues = [
  "today",
  "week",
  "month",
  "season",
  "year",
  "custom",
] as const;

export type ReportPeriod = (typeof reportPeriodValues)[number];

export const reportPeriodLabels: Record<ReportPeriod, string> = {
  today: "امروز",
  week: "این هفته",
  month: "این ماه",
  season: "این فصل",
  year: "امسال",
  custom: "بازه دلخواه",
};

export const reportTypeValues = [
  "all",
  "contracts",
  "payments",
  "expenses",
  "balances",
] as const;

export type ReportType = (typeof reportTypeValues)[number];

export const reportTypeLabels: Record<ReportType, string> = {
  all: "همه گزارش‌ها",
  contracts: "قراردادها",
  payments: "دریافت‌ها",
  expenses: "هزینه‌ها",
  balances: "مانده‌ها",
};

export type ReportDateRange = {
  period: ReportPeriod;
  startDate: Date;
  endDate: Date;
  fromValue: string;
  toValue: string;
  label: string;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(year: number, month: number, amount: number) {
  const total = year * 12 + (month - 1) + amount;
  return {
    year: Math.floor(total / 12),
    month: (total % 12) + 1,
  };
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function parseFilterDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return parseDateLikeToDate(toLatinDigits(value).replace(/[\/\.]/g, "-"));
}

export function parseReportPeriod(value: string | null | undefined): ReportPeriod {
  return reportPeriodValues.includes(value as ReportPeriod)
    ? (value as ReportPeriod)
    : "month";
}

export function parseReportType(value: string | null | undefined): ReportType {
  return reportTypeValues.includes(value as ReportType)
    ? (value as ReportType)
    : "all";
}

export function getReportDateRange(params: {
  period?: string | null;
  from?: string | null;
  to?: string | null;
}): ReportDateRange {
  const period = parseReportPeriod(params.period);
  const todayParts = getTodayJalali();
  const todayDate = jalaliToDate(todayParts.year, todayParts.month, todayParts.day);

  let startDate: Date;
  let endDate: Date;

  if (period === "today") {
    startDate = todayDate;
    endDate = addDays(todayDate, 1);
  } else if (period === "week") {
    startDate = addDays(todayDate, -getJalaliWeekdayIndex(todayDate));
    endDate = addDays(startDate, 7);
  } else if (period === "season") {
    const seasonStartMonth = Math.floor((todayParts.month - 1) / 3) * 3 + 1;
    startDate = jalaliToDate(todayParts.year, seasonStartMonth, 1);
    const nextSeason = addMonths(todayParts.year, seasonStartMonth, 3);
    endDate = jalaliToDate(nextSeason.year, nextSeason.month, 1);
  } else if (period === "year") {
    startDate = jalaliToDate(todayParts.year, 1, 1);
    endDate = jalaliToDate(todayParts.year + 1, 1, 1);
  } else if (period === "custom") {
    const fromDate = parseFilterDate(params.from);
    const toDate = parseFilterDate(params.to);
    const fallback = getJalaliMonthRange(todayParts.year, todayParts.month);
    startDate = startOfUtcDay(fromDate ?? fallback.startDate);
    endDate = toDate ? addDays(startOfUtcDay(toDate), 1) : fallback.endDate;

    if (endDate <= startDate) {
      endDate = addDays(startDate, 1);
    }
  } else {
    const range = getJalaliMonthRange(todayParts.year, todayParts.month);
    startDate = range.startDate;
    endDate = range.endDate;
  }

  const inclusiveEnd = addDays(endDate, -1);
  const startParts = dateToJalaliParts(startDate);
  const label =
    period === "month"
      ? formatJalaliMonthTitle(startParts.year, startParts.month)
      : `${formatJalaliDate(startDate)} تا ${formatJalaliDate(inclusiveEnd)}`;

  return {
    period,
    startDate,
    endDate,
    fromValue: toDateOnlyString(startDate),
    toValue: toDateOnlyString(inclusiveEnd),
    label,
  };
}

export function getReportsCsvFilename() {
  return `گزارش-مالی-${toPersianDigits(formatJalaliDayKey(new Date()))}.csv`;
}
