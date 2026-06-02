const displayTimeZone = "Asia/Tehran";
const jalaliLocale = "fa-IR-u-ca-persian";
const jalaliMonths = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

const jalaliWeekdays = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const;

function normalizeDate(
  date: Date | string | number | null | undefined,
): Date | null {
  if (date === null || date === undefined || date === "") {
    return null;
  }

  const normalized = date instanceof Date ? date : new Date(date);

  return Number.isNaN(normalized.getTime()) ? null : normalized;
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

const latinDigits = "0123456789";

export function toLatinDigits(value: string | number): string {
  return String(value).replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = "۰۱۲۳۴۵۶۷۸۹".indexOf(digit);
    if (persianIndex >= 0) {
      return latinDigits[persianIndex];
    }

    const arabicIndex = "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
    return arabicIndex >= 0 ? latinDigits[arabicIndex] : digit;
  });
}

export function formatJalaliDate(
  date: Date | string | number | null | undefined,
): string {
  const normalized = normalizeDate(date);

  if (!normalized) {
    return "—";
  }

  return new Intl.DateTimeFormat(jalaliLocale, {
    timeZone: displayTimeZone,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(normalized);
}

export function formatJalaliDateTime(
  date: Date | string | number | null | undefined,
): string {
  const normalized = normalizeDate(date);

  if (!normalized) {
    return "—";
  }

  return new Intl.DateTimeFormat(jalaliLocale, {
    timeZone: displayTimeZone,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(normalized);
}


export function formatJalaliTime(
  date: Date | string | number | null | undefined,
): string {
  const normalized = normalizeDate(date);

  if (!normalized) {
    return "—";
  }

  return toPersianDigits(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: displayTimeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(normalized),
  );
}

function getTehranDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: displayTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatJalaliAuditDateTime(
  date: Date | string | number | null | undefined,
): string {
  const normalized = normalizeDate(date);

  if (!normalized) {
    return "—";
  }

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateKey = getTehranDateKey(normalized);
  const todayKey = getTehranDateKey(now);
  const yesterdayKey = getTehranDateKey(yesterday);
  const timeLabel = formatJalaliTime(normalized);

  if (dateKey === todayKey) {
    return `امروز، ساعت ${timeLabel}`;
  }

  if (dateKey === yesterdayKey) {
    return `دیروز، ساعت ${timeLabel}`;
  }

  return `${formatJalaliDate(normalized)}، ساعت ${timeLabel}`;
}

export function formatJalaliMonthYear(
  date: Date | string | number | null | undefined,
): string {
  const normalized = normalizeDate(date);

  if (!normalized) {
    return "—";
  }

  return new Intl.DateTimeFormat(jalaliLocale, {
    timeZone: displayTimeZone,
    year: "numeric",
    month: "long",
  }).format(normalized);
}

export function formatJalaliWeekday(
  date: Date | string | number | null | undefined,
): string {
  const normalized = normalizeDate(date);

  if (!normalized) {
    return "—";
  }

  return new Intl.DateTimeFormat(jalaliLocale, {
    timeZone: displayTimeZone,
    weekday: "long",
  }).format(normalized);
}


export function toDateOnlyString(
  date: Date | string | number | null | undefined,
): string {
  const normalized = normalizeDate(date);

  if (!normalized) {
    return "";
  }

  return `${normalized.getUTCFullYear()}-${String(normalized.getUTCMonth() + 1).padStart(2, "0")}-${String(normalized.getUTCDate()).padStart(2, "0")}`;
}

export function parseIsoDateOnly(
  value: string | null | undefined,
): Date | null {
  if (!value) {
    return null;
  }

  const normalized = toLatinDigits(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function parseDateLikeToDate(
  value: Date | string | number | null | undefined,
): Date | null {
  if (value instanceof Date || typeof value === "number") {
    return normalizeDate(value);
  }

  if (!value) {
    return null;
  }

  const normalized = toLatinDigits(value).trim();
  const normalizedDayKey = normalized.replace(/[\/\.]/g, "-");
  const maybeDayKey = /^(\d{3,4})-(\d{1,2})-(\d{1,2})$/.exec(normalizedDayKey);

  if (maybeDayKey) {
    const year = Number(maybeDayKey[1]);

    if (year >= 1200 && year <= 1600) {
      const jalaliParts = parseJalaliDayKey(normalizedDayKey);

      if (jalaliParts) {
        return jalaliToDate(jalaliParts.year, jalaliParts.month, jalaliParts.day);
      }
    }
  }

  const isoDateOnly = parseIsoDateOnly(normalizedDayKey);

  if (isoDateOnly) {
    return isoDateOnly;
  }

  return normalizeDate(normalized);
}

export type JalaliDateParts = {
  year: number;
  month: number;
  day: number;
};

export type JalaliCalendarDay = JalaliDateParts & {
  date: Date;
  dayKey: string;
  weekdayIndex: number;
  isFriday: boolean;
  isToday: boolean;
};

export const JALALI_MONTH_NAMES = jalaliMonths;
export const JALALI_WEEKDAY_NAMES = jalaliWeekdays;

const jalaliBreaks = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
  2192, 2262, 2324, 2394, 2456, 3178,
] as const;

function div(a: number, b: number) {
  return ~~(a / b);
}

function mod(a: number, b: number) {
  return a - ~~(a / b) * b;
}

function g2d(gy: number, gm: number, gd: number) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j =
    j +
    div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 -
    3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function jalCal(jy: number) {
  const breakCount = jalaliBreaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp: number = jalaliBreaks[0];
  let jm = 0;
  let jump = 0;

  if (jy < jp || jy >= jalaliBreaks[breakCount - 1]) {
    throw new Error("Invalid Jalali year");
  }

  for (let i = 1; i < breakCount; i += 1) {
    jm = jalaliBreaks[i];
    jump = jm - jp;
    if (jy < jm) {
      break;
    }
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) {
    leapJ += 1;
  }

  const leapG =
    div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33;
  }

  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) {
    leap = 4;
  }

  return { leap, gy, march };
}

function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return (
    g2d(r.gy, 3, r.march) +
    (jm - 1) * 31 -
    div(jm, 7) * (jm - 7) +
    jd -
    1
  );
}

function d2j(jdn: number) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) {
      const jm = 1 + div(k, 31);
      const jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) {
      k += 1;
    }
  }

  const jm = 7 + div(k, 30);
  const jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

export function isJalaliLeapYear(year: number) {
  return jalCal(year).leap === 0;
}

export function getJalaliMonthLength(year: number, month: number) {
  if (month <= 6) {
    return 31;
  }

  if (month <= 11) {
    return 30;
  }

  return isJalaliLeapYear(year) ? 30 : 29;
}

export function jalaliToDate(year: number, month: number, day: number) {
  const gregorian = d2g(j2d(year, month, day));
  return new Date(
    Date.UTC(gregorian.gy, gregorian.gm - 1, gregorian.gd, 0, 0, 0, 0),
  );
}

export function dateToJalaliParts(date: Date): JalaliDateParts {
  const j = d2j(
    g2d(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
  );

  return {
    year: j.jy,
    month: j.jm,
    day: j.jd,
  };
}

export function getTodayJalali(): JalaliDateParts {
  return dateToJalaliParts(new Date());
}

export function formatJalaliDayKey(
  dateOrParts: Date | JalaliDateParts,
): string {
  const parts =
    dateOrParts instanceof Date ? dateToJalaliParts(dateOrParts) : dateOrParts;
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function parseJalaliDayKey(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  const match = normalized.match(/^(\d{3,4})-(\d{1,2})-(\d{1,2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > getJalaliMonthLength(year, month)
  ) {
    return null;
  }

  return { year, month, day };
}

export function getJalaliWeekdayIndex(date: Date) {
  return (date.getUTCDay() + 1) % 7;
}

export function getJalaliMonthRange(year: number, month: number) {
  const startDate = jalaliToDate(year, month, 1);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = jalaliToDate(nextYear, nextMonth, 1);

  return { startDate, endDate };
}

export function getJalaliMonthDays(year: number, month: number) {
  const todayKey = formatJalaliDayKey(new Date());
  const length = getJalaliMonthLength(year, month);

  return Array.from({ length }, (_, index) => {
    const day = index + 1;
    const date = jalaliToDate(year, month, day);
    const dayKey = formatJalaliDayKey({ year, month, day });
    const weekdayIndex = getJalaliWeekdayIndex(date);

    return {
      year,
      month,
      day,
      date,
      dayKey,
      weekdayIndex,
      isFriday: weekdayIndex === 6,
      isToday: dayKey === todayKey,
    };
  });
}

export function parseJalaliMonthFromSearchParams(params: {
  year?: string;
  month?: string;
}) {
  const today = getTodayJalali();
  const year = Number(params.year);
  const month = Number(params.month);

  if (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    year >= 1200 &&
    year <= 1600 &&
    month >= 1 &&
    month <= 12
  ) {
    return { year, month };
  }

  return { year: today.year, month: today.month };
}

export function getNextJalaliMonth(year: number, month: number) {
  return month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 };
}

export function getPreviousJalaliMonth(year: number, month: number) {
  return month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 };
}

export function formatJalaliMonthTitle(year: number, month: number) {
  return `${jalaliMonths[month - 1]} ${toPersianDigits(year)}`;
}

export function formatJalaliDayTitle(parts: JalaliDateParts) {
  return `${toPersianDigits(parts.day)} ${jalaliMonths[parts.month - 1]} ${toPersianDigits(parts.year)}`;
}
