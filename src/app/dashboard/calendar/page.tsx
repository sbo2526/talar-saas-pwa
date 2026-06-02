import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Eye,
  FileSignature,
  Filter,
  Landmark,
  ListChecks,
  MapPin,
  MessageSquareText,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { CalendarNoteForm } from "@/components/dashboard/calendar/calendar-note-form";
import { requireTenantMember } from "@/lib/auth/session";
import { calendarDayStatusLabels } from "@/lib/calendar-status-options";
import {
  calendarStatusLegend,
  calendarVisualStatusLabels,
  getCalendarPageData,
  getCompactDayLabel,
  getContractEventLabel,
  getContractStatusPersianLabel,
  getPrimaryDayOccasion,
  type CalendarContractEvent,
  type CalendarDaySummary,
  type CalendarFilterStatus,
  type CalendarPageSearchParams,
  type CalendarViewMode,
  type CalendarVisualStatus,
} from "@/lib/calendar/calendar-page-data";
import {
  formatJalaliDate,
  formatJalaliDayTitle,
  formatJalaliMonthTitle,
  formatJalaliWeekday,
  getNextJalaliMonth,
  getPreviousJalaliMonth,
  getTodayJalali,
  JALALI_WEEKDAY_NAMES,
  toPersianDigits,
} from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import {
  calculateContractCancellationEstimate,
  formatCancellationDaysLabel,
} from "@/lib/contracts/cancellation-policy";
import {
  formatContractTimeRange,
  getContractStatusStyle,
  getPaymentStatusStyle,
  paymentStatusLabels,
  toNumber,
} from "@/lib/contracts/display";

type CalendarPageProps = {
  searchParams: Promise<CalendarPageSearchParams>;
};

function buildCalendarHref({
  year,
  month,
  day,
  hallId = "all",
  salonId = "all",
  status = "all",
  q = "",
  eventTypeId = "all",
  outstandingOnly = false,
  upcomingOnly = false,
  view = "month",
}: {
  year: number;
  month: number;
  day: number;
  hallId?: string;
  salonId?: string;
  status?: CalendarFilterStatus;
  q?: string;
  eventTypeId?: string;
  outstandingOnly?: boolean;
  upcomingOnly?: boolean;
  view?: CalendarViewMode;
}) {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
    day: String(day),
  });

  if (hallId !== "all") params.set("hallId", hallId);
  if (salonId !== "all") params.set("salonId", salonId);
  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  if (eventTypeId !== "all") params.set("eventTypeId", eventTypeId);
  if (outstandingOnly) params.set("outstandingOnly", "1");
  if (upcomingOnly) params.set("upcomingOnly", "1");
  if (view !== "month") params.set("view", view);

  return `/dashboard/calendar?${params.toString()}`;
}

export default async function ReservationCalendarPage({ searchParams }: CalendarPageProps) {
  const membership = await requireTenantMember();
  const params = await searchParams;
  const data = await getCalendarPageData(membership.tenantId, params);
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";

  return (
    <section className="space-y-5 sm:space-y-6">
      <CalendarHeader
        summary={data.headerSummary}
        month={data.month}
        selectedDay={data.selectedDay}
        filters={data.filters}
      />

      {data.filters.view === "upcoming" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
          <UpcomingList events={data.upcomingEvents} />
          <SelectedDayPanel summary={data.selectedDaySummary} canEdit={canEdit} activeSalonCount={data.activeSalonCount} compact />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-start">
          <main className="min-w-0 overflow-hidden rounded-[1.45rem] border border-[#d8c08b]/54 bg-[#fff9ee]/88 p-2 shadow-[0_14px_42px_rgba(17,24,39,0.055)] sm:rounded-[1.75rem] sm:p-2.5">
            <MonthControlBar month={data.month} selectedDay={data.selectedDay.day} filters={data.filters} />
            <CalendarGrid data={data} />
          </main>
          <SelectedDayPanel summary={data.selectedDaySummary} canEdit={canEdit} activeSalonCount={data.activeSalonCount} compact />
        </div>
      )}

      <CalendarSupportPanel data={data} />

      {data.filters.view === "month" ? <UpcomingList events={data.upcomingEvents} compact /> : null}
    </section>
  );
}

function getCurrentParams(data: Awaited<ReturnType<typeof getCalendarPageData>>) {
  return {
    year: data.month.year,
    month: data.month.month,
    day: data.selectedDay.day,
    hallId: data.filters.hallId,
    salonId: data.filters.salonId,
    status: data.filters.status,
    q: data.filters.query,
    eventTypeId: data.filters.eventTypeId,
    outstandingOnly: data.filters.outstandingOnly,
    upcomingOnly: data.filters.upcomingOnly,
    view: data.filters.view,
  };
}


function CalendarHeader({
  summary,
  month,
  selectedDay,
  filters,
}: {
  summary: string;
  month: { year: number; month: number };
  selectedDay: { date: Date; year: number; month: number; day: number };
  filters: Awaited<ReturnType<typeof getCalendarPageData>>["filters"];
}) {
  const today = new Date();
  const eventDateHref = `/dashboard/contracts/new?eventDate=${encodeURIComponent(selectedDay.date.toISOString())}`;
  const upcomingHref = buildCalendarHref({ ...filters, year: month.year, month: month.month, day: selectedDay.day, view: "upcoming" });

  return (
    <header className="overflow-hidden rounded-[1.35rem] border border-[#d8c08b]/52 bg-[linear-gradient(145deg,rgba(255,250,240,0.98),rgba(248,239,220,0.9))] p-3.5 text-[#111827] shadow-[0_12px_34px_rgba(17,24,39,0.05)] sm:rounded-[1.65rem] sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0 text-right">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c7a15a]/32 bg-[#c7a15a]/10 px-2.5 py-1 text-[11px] font-black text-[#17483f] sm:text-xs">
              <CalendarDays size={13} />
              مرکز فرمان رزرو
            </span>
            <HeaderChip icon={ClipboardList} label={formatJalaliMonthTitle(month.year, month.month)} />
            <HeaderChip icon={CheckCircle2} label={`روز انتخاب‌شده: ${formatJalaliDayTitle(selectedDay)}`} />
            <HeaderChip icon={Clock3} label={`امروز: ${formatJalaliDate(today)}`} />
          </div>
          <h1 className="mt-2 text-2xl font-black leading-tight sm:text-[1.85rem]">تقویم رزرو تالار</h1>
          <p className="mt-1.5 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49]">{summary}</p>
        </div>

        <div className="flex flex-col gap-2 rounded-[1.15rem] border border-[#d8c08b]/42 bg-[#fffdf8]/66 p-2.5 shadow-[0_8px_22px_rgba(17,24,39,0.035)] sm:flex-row sm:items-center sm:justify-end lg:min-w-[26rem] lg:bg-white/45">
          <Link href={eventDateHref} className="btn-luxury-dark min-h-10 justify-center rounded-2xl px-4 py-2 text-sm sm:min-w-[13rem]">
            <Plus size={16} />
            ثبت مراسم برای روز انتخاب‌شده
          </Link>
          <Link
            href={upcomingHref}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-4 py-2 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/72 sm:min-w-[10rem]"
          >
            <ListChecks size={16} />
            مراسم‌های پیش‌رو
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeaderChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d8c08b]/48 bg-[#fff8ea]/68 px-2.5 py-1 text-[11px] font-black text-[#7d6841] sm:text-xs">
      <Icon size={13} className="text-[#9f7131]" />
      {label}
    </span>
  );
}


function MonthControlBar({
  month,
  selectedDay,
  filters,
}: {
  month: { year: number; month: number };
  selectedDay: number;
  filters: Awaited<ReturnType<typeof getCalendarPageData>>["filters"];
}) {
  const previous = getPreviousJalaliMonth(month.year, month.month);
  const next = getNextJalaliMonth(month.year, month.month);
  const today = getTodayJalali();

  return (
    <section className="rounded-t-[1.3rem] border border-b-0 border-[#d8c08b]/50 bg-[#fffdf8]/78 px-3 py-3 text-[#111827] sm:rounded-t-[1.6rem] sm:px-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0 text-right">
          <p className="text-[11px] font-black text-[#7d6841]">ماه عملیاتی</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black leading-tight sm:text-2xl">{formatJalaliMonthTitle(month.year, month.month)}</h2>
            <span className="inline-flex rounded-full border border-[#d8c08b]/48 bg-[#fff8ea]/70 px-2.5 py-1 text-[11px] font-black text-[#7d6841]">
              روز انتخاب‌شده: {toPersianDigits(String(selectedDay))}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-[#d8c08b]/46 bg-[#fff8ea]/70 p-1 text-xs font-black sm:min-w-[23rem] sm:text-sm">
          <Link
            href={buildCalendarHref({ ...filters, ...previous, day: 1 })}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-[#7d6841] transition hover:bg-white/70"
          >
            <ChevronRight size={16} />
            ماه قبل
          </Link>
          <Link
            href={buildCalendarHref({ ...filters, year: today.year, month: today.month, day: today.day })}
            className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#111827] px-2 py-1.5 text-[#fff8ea] shadow-[0_8px_20px_rgba(17,24,39,0.16)]"
          >
            امروز
          </Link>
          <Link
            href={buildCalendarHref({ ...filters, ...next, day: selectedDay })}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-[#7d6841] transition hover:bg-white/70"
          >
            ماه بعد
            <ChevronLeft size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}


function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "navy" | "emerald" | "amber" | "rose" | "neutral";
}) {
  return (
    <article className={`grid min-h-20 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2.5 rounded-[1rem] border bg-[#fffdf8]/84 p-2.5 text-right text-[#111827] shadow-[0_8px_22px_rgba(17,24,39,0.04)] ${toneBorder(tone)}`}>
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${toneIcon(tone)}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-black leading-5 text-[#7d6841] sm:text-xs">{label}</p>
        <p className="mt-0.5 text-base font-black leading-tight sm:text-lg">{value}</p>
      </div>
    </article>
  );
}


function CalendarSupportPanel({ data }: { data: Awaited<ReturnType<typeof getCalendarPageData>> }) {
  const f = data.filters;
  const hasActiveFilter =
    f.hallId !== "all" ||
    f.salonId !== "all" ||
    f.status !== "all" ||
    f.query.length > 0 ||
    f.eventTypeId !== "all" ||
    f.outstandingOnly ||
    f.upcomingOnly ||
    f.view !== "month";

  return (
    <details className="group rounded-[1.25rem] border border-[#d8c08b]/46 bg-[#fffdf8]/78 text-[#111827] shadow-[0_10px_28px_rgba(17,24,39,0.04)]" open={hasActiveFilter}>
      <summary className="flex cursor-pointer list-none flex-col gap-2 px-3 py-3 text-right sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <span className="inline-flex items-center gap-2 text-sm font-black text-[#17483f]">
          <Filter size={17} />
          ابزارها، آمار و فیلترهای تقویم
        </span>
        <span className="inline-flex items-center gap-2 text-xs font-bold text-[#7d6841]">
          مدیریت فیلترها و نمای لیستی در یک نوار جمع‌وجور
          <ChevronDown size={16} className="text-[#9f7131] transition group-open:rotate-180" />
        </span>
      </summary>
      <div className="grid gap-3 border-t border-[#d8c08b]/30 px-3 pb-3 pt-3 sm:px-4">
        <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard icon={CheckCircle2} label="روزهای آزاد ماه" value={formatPersianNumber(data.kpis.availableDays)} tone="emerald" />
          <KpiCard icon={CalendarCheck} label="روزهای رزروشده" value={formatPersianNumber(data.kpis.reservedDays)} tone="amber" />
          <KpiCard icon={FileSignature} label="مراسم‌های پیش‌رو" value={formatPersianNumber(data.kpis.upcomingEvents)} tone="navy" />
          <KpiCard icon={Ban} label="روزهای مسدود" value={formatPersianNumber(data.kpis.blockedDays)} tone="rose" />
          <KpiCard icon={Landmark} label="تعطیلات رسمی" value={formatPersianNumber(data.kpis.officialHolidays)} tone="rose" />
          <KpiCard icon={MessageSquareText} label="یادداشت‌های مدیریتی" value={formatPersianNumber(data.kpis.manualStatuses)} tone="neutral" />
        </section>

        <ViewToggle data={data} />
        <CalendarQuickFilters data={data} />
        <FilterBar data={data} />
      </div>
    </details>
  );
}

function FilterBar({ data }: { data: Awaited<ReturnType<typeof getCalendarPageData>> }) {
  const f = data.filters;
  const advancedActive = f.eventTypeId !== "all" || f.outstandingOnly || f.upcomingOnly;

  return (
    <form action="/dashboard/calendar" className="rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-3 text-[#111827] shadow-[0_14px_44px_rgba(17,24,39,0.055)]">
      <input type="hidden" name="year" value={data.month.year} />
      <input type="hidden" name="month" value={data.month.month} />
      <input type="hidden" name="day" value={data.selectedDay.day} />
      <input type="hidden" name="view" value={f.view} />

      <div className="grid gap-3 xl:grid-cols-[11rem_11rem_11rem_minmax(0,1fr)_auto] xl:items-end">
        <Select name="hallId" label="تالار" defaultValue={f.hallId}>
          <option value="all">همه تالارها</option>
          {data.options.halls.map((hall) => <option key={hall.id} value={hall.id}>{hall.name}</option>)}
        </Select>
        <Select name="salonId" label="سالن" defaultValue={f.salonId}>
          <option value="all">همه سالن‌ها</option>
          {data.options.salons.map((salon) => <option key={salon.id} value={salon.id}>{salon.name} - {salon.hall.name}</option>)}
        </Select>
        <Select name="status" label="وضعیت" defaultValue={f.status}>
          <option value="all">همه وضعیت‌ها</option>
          {calendarStatusLegend.map((item) => <option key={item.status} value={item.status}>{item.label}</option>)}
        </Select>
        <label className="grid gap-1.5 text-xs font-black text-[#172033]">
          <span>جستجو</span>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9f7131]" />
            <input name="q" defaultValue={f.query} placeholder="جستجوی مشتری، شماره قرارداد یا عنوان مراسم" className="input-luxury min-h-11 py-2 pl-10 text-sm" />
          </div>
        </label>
        <div className="grid grid-cols-2 gap-2 xl:min-w-44">
          <button type="submit" className="btn-luxury-dark min-h-11 px-4 py-2 text-sm">اعمال</button>
          <Link
            href={buildCalendarHref({ year: data.month.year, month: data.month.month, day: data.selectedDay.day })}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-4 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
          >
            حذف
          </Link>
        </div>
      </div>

      <details className="group mt-3 rounded-[1.1rem] border border-[#d8c08b]/42 bg-[#fff8ea]/52 p-2.5" open={advancedActive}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-1 text-sm font-black text-[#17483f]">
          <span className="inline-flex items-center gap-2"><Filter size={17} />فیلترهای پیشرفته</span>
          <ChevronDown size={17} className="text-[#9f7131] transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Select name="eventTypeId" label="نوع مراسم" defaultValue={f.eventTypeId}>
            <option value="all">همه مراسم‌ها</option>
            {data.options.eventTypes.map((eventType) => <option key={eventType.id} value={eventType.id}>{eventType.name}</option>)}
          </Select>
          <CheckboxFilter name="outstandingOnly" checked={f.outstandingOnly} label="فقط مراسم‌های دارای مانده" />
          <CheckboxFilter name="upcomingOnly" checked={f.upcomingOnly} label="فقط مراسم‌های پیش‌رو" />
        </div>
      </details>
    </form>
  );
}

function Select({ name, label, defaultValue, children }: { name: string; label: string; defaultValue: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-[#172033]">
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue} className="input-luxury min-h-11 py-2 text-sm">{children}</select>
    </label>
  );
}

function CheckboxFilter({ name, checked, label }: { name: string; checked: boolean; label: string }) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-[#d8c08b]/50 bg-[#fff9ee]/70 px-3 py-2 text-xs font-black text-[#172033]">
      <input name={name} value="1" type="checkbox" defaultChecked={checked} className="size-4 accent-[#111827]" />
      {label}
    </label>
  );
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black text-[#6d5f49] sm:gap-2">
      {calendarStatusLegend.map((item) => (
        <span key={item.status} className="inline-flex items-center gap-1.5 rounded-full border border-[#d8c08b]/52 bg-[#fff8ea]/82 px-2.5 py-1">
          <span className={`size-2 rounded-full ${item.dotClassName}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function CalendarQuickFilters({ data }: { data: Awaited<ReturnType<typeof getCalendarPageData>> }) {
  const base = getCurrentParams(data);
  const chips: Array<{ label: string; href: string; active: boolean; tone?: "dark" | "gold" | "green" | "rose" }> = [
    {
      label: "همه روزها",
      href: buildCalendarHref({ ...base, status: "all", outstandingOnly: false, upcomingOnly: false }),
      active: data.filters.status === "all" && !data.filters.outstandingOnly && !data.filters.upcomingOnly,
      tone: "dark",
    },
    {
      label: "روزهای آزاد",
      href: buildCalendarHref({ ...base, status: "AVAILABLE", outstandingOnly: false, upcomingOnly: false }),
      active: data.filters.status === "AVAILABLE",
      tone: "green",
    },
    {
      label: "رزرو شده",
      href: buildCalendarHref({ ...base, status: "RESERVED", outstandingOnly: false, upcomingOnly: false }),
      active: data.filters.status === "RESERVED",
      tone: "gold",
    },
    {
      label: "دارای مانده",
      href: buildCalendarHref({ ...base, status: "all", outstandingOnly: true, upcomingOnly: false }),
      active: data.filters.outstandingOnly,
      tone: "rose",
    },
    {
      label: "مراسم‌های پیش‌رو",
      href: buildCalendarHref({ ...base, status: "all", outstandingOnly: false, upcomingOnly: true }),
      active: data.filters.upcomingOnly,
      tone: "gold",
    },
    {
      label: "مسدود / تعطیل",
      href: buildCalendarHref({ ...base, status: "BLOCKED", outstandingOnly: false, upcomingOnly: false }),
      active: data.filters.status === "BLOCKED",
      tone: "rose",
    },
  ];

  return (
    <section className="rounded-[1.15rem] border border-[#d8c08b]/42 bg-[#fff9ee]/72 px-3 py-2.5 text-[#111827] shadow-[0_10px_28px_rgba(17,24,39,0.04)]">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-black text-[#17483f]">فیلترهای سریع رزرو</p>
          <p className="mt-0.5 text-xs font-bold text-[#7d6841]">مسیرهای پرتکرار بدون باز کردن فیلتر پیشرفته</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <Link key={chip.label} href={chip.href} className={quickCalendarChipClass(chip.active, chip.tone)}>
              {chip.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function quickCalendarChipClass(active: boolean, tone: "dark" | "gold" | "green" | "rose" = "gold") {
  if (active) return "inline-flex min-h-9 items-center rounded-full border border-[#111827]/16 bg-[#111827] px-3 py-1.5 text-xs font-black text-[#fff8ea] shadow-[0_10px_24px_rgba(17,24,39,0.16)]";
  if (tone === "green") return "inline-flex min-h-9 items-center rounded-full border border-[#25a46d]/18 bg-[#25a46d]/[0.08] px-3 py-1.5 text-xs font-black text-[#17483f] transition hover:border-[#25a46d]/36";
  if (tone === "rose") return "inline-flex min-h-9 items-center rounded-full border border-[#b45353]/16 bg-[#fff1f1]/62 px-3 py-1.5 text-xs font-black text-[#8f2c2c] transition hover:border-[#b45353]/30";
  if (tone === "dark") return "inline-flex min-h-9 items-center rounded-full border border-[#111827]/12 bg-[#fff8ea]/76 px-3 py-1.5 text-xs font-black text-[#172033] transition hover:border-[#111827]/24";
  return "inline-flex min-h-9 items-center rounded-full border border-[#d8c08b]/56 bg-[#fff8ea]/80 px-3 py-1.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70";
}


function ViewToggle({ data }: { data: Awaited<ReturnType<typeof getCalendarPageData>> }) {
  const base = getCurrentParams(data);

  return (
    <div className="grid gap-3 rounded-[1.15rem] border border-[#d8c08b]/44 bg-[#fff9ee]/78 px-3 py-3 text-[#111827] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0 space-y-2">
        <p className="inline-flex items-center gap-2 text-sm font-black text-[#17483f]">
          <Eye size={16} className="text-[#9f7131]" />
          نمای رزروها
        </p>
        <StatusLegend />
      </div>
      <div className="grid grid-cols-2 rounded-2xl border border-[#d8c08b]/46 bg-[#fff8ea]/70 p-1 text-xs font-black sm:min-w-72">
        <Link href={buildCalendarHref({ ...base, view: "month" })} className={`rounded-xl px-3 py-2 text-center ${data.filters.view === "month" ? "bg-[#111827] text-[#fff8ea]" : "text-[#7d6841]"}`}>نمای ماهانه</Link>
        <Link href={buildCalendarHref({ ...base, view: "upcoming" })} className={`rounded-xl px-3 py-2 text-center ${data.filters.view === "upcoming" ? "bg-[#111827] text-[#fff8ea]" : "text-[#7d6841]"}`}>مراسم‌های پیش‌رو</Link>
      </div>
    </div>
  );
}


function CalendarGrid({ data }: { data: Awaited<ReturnType<typeof getCalendarPageData>> }) {
  return (
    <section className="rounded-b-[1.3rem] border border-[#d8c08b]/50 bg-[#fffdf8]/76 p-2 text-[#111827] sm:rounded-b-[1.6rem] sm:p-2.5">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" dir="rtl">
        {JALALI_WEEKDAY_NAMES.map((weekday) => (
          <div key={weekday} className="px-1 pb-1.5 pt-0.5 text-center text-[10px] font-black text-[#7d6841] sm:text-xs">
            {weekday}
          </div>
        ))}
        {Array.from({ length: data.daySummaries[0]?.day.weekdayIndex ?? 0 }).map((_, index) => (
          <div key={`blank-${index}`} className="min-h-16 rounded-xl border border-dashed border-[#d8c08b]/20 bg-[#fff8ea]/30 sm:min-h-[5.25rem]" />
        ))}
        {data.daySummaries.map((summary) => (
          <DayCell
            key={summary.day.dayKey}
            summary={summary}
            selected={summary.day.dayKey === data.selectedDay.dayKey}
            href={buildCalendarHref({ ...getCurrentParams(data), day: summary.day.day })}
          />
        ))}
      </div>
    </section>
  );
}


function DayCell({ summary, selected, href }: { summary: CalendarDaySummary; selected: boolean; href: string }) {
  const style = getDayStatusStyle(summary.status);
  const label = getCompactDayLabel(summary);
  const primaryOccasion = getPrimaryDayOccasion(summary);
  const isHolidayLike = summary.day.isFriday || primaryOccasion?.isOfficialHoliday;
  const firstContract = summary.contracts[0];

  return (
    <Link
      href={href}
      className={`group relative flex min-h-16 flex-col rounded-xl border p-1.5 transition sm:min-h-[5.25rem] sm:rounded-2xl sm:p-2 ${
        selected
          ? "border-[#111827]/72 bg-[#fff4d6] shadow-[0_12px_28px_rgba(17,24,39,0.12)] ring-2 ring-[#c7a15a]/32"
          : `${style.cellClassName} hover:-translate-y-0.5 hover:border-[#c7a15a]/70`
      } ${summary.isMutedByStatus ? "opacity-[0.38]" : ""}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={`flex size-6 items-center justify-center rounded-lg text-xs font-black sm:size-7 sm:rounded-xl sm:text-sm ${summary.day.isToday ? "bg-[#17483f] text-[#fff8ea]" : "bg-white/[0.72] text-[#111827]"}`}>
          {toPersianDigits(summary.day.day)}
        </span>
        <span className={`mt-1 size-2 rounded-full sm:size-2.5 ${style.dotClassName}`} />
      </div>

      <div className="mt-auto min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1">
          {selected ? (
            <span className="inline-flex rounded-full border border-[#111827]/14 bg-[#111827] px-1.5 py-0.5 text-[9px] font-black text-[#fff8ea] sm:px-2 sm:text-[10px]">انتخاب‌شده</span>
          ) : null}
          {label ? (
            <span className={`inline-flex max-w-full truncate rounded-full border px-1.5 py-0.5 text-[9px] font-black sm:px-2 sm:py-1 sm:text-[10px] ${style.badgeClassName}`}>{label}</span>
          ) : isHolidayLike ? (
            <span className="inline-flex max-w-full truncate rounded-full border border-[#b45353]/18 bg-[#fff1f1]/78 px-1.5 py-0.5 text-[9px] font-black text-[#8f2c2c] sm:px-2 sm:text-[10px]">
              {summary.day.isFriday ? "جمعه" : "تعطیل"}
            </span>
          ) : null}
        </div>
        {summary.eventCount > 0 ? (
          <div className="hidden min-w-0 rounded-lg bg-white/[0.42] px-2 py-1 text-[10px] font-bold leading-4 text-[#6d5f49] sm:block">
            <p className="truncate">{firstContract ? firstContract.customer.fullName : "مراسم ثبت‌شده"}</p>
            <p className="truncate">{summary.busySalonCount > 0 ? `${formatPersianNumber(summary.busySalonCount)} سالن درگیر` : ""}</p>
          </div>
        ) : summary.status === "AVAILABLE" ? (
          <div className="hidden items-center gap-1 rounded-lg bg-[#25a46d]/[0.07] px-2 py-1 text-[10px] font-black text-[#17483f] sm:flex">
            <span className="size-1.5 rounded-full bg-[#25a46d]" />
            آماده رزرو
          </div>
        ) : null}
      </div>
    </Link>
  );
}


function SelectedDayPanel({
  summary,
  canEdit,
  activeSalonCount,
  compact = false,
}: {
  summary: CalendarDaySummary;
  canEdit: boolean;
  activeSalonCount: number;
  compact?: boolean;
}) {
  const statusStyle = getDayStatusStyle(summary.status);
  const isBlocked = summary.status === "BLOCKED";
  const hasContracts = summary.contracts.length > 0;
  const noteStatus = summary.note?.status ? calendarDayStatusLabels[summary.note.status] : null;

  return (
    <aside className="space-y-3 xl:sticky xl:top-24">
      <section className={`rounded-[1.35rem] border border-[#d8c08b]/54 bg-[#fffdf8]/88 text-[#111827] shadow-[0_12px_36px_rgba(17,24,39,0.055)] sm:rounded-[1.65rem] ${compact ? "p-3" : "p-3.5"}`}>
        <div className="flex items-start justify-between gap-3 text-right">
          <div className="min-w-0">
            <p className="text-[11px] font-black text-[#17483f]">جزئیات روز انتخاب‌شده</p>
            <h2 className="mt-1 text-lg font-black leading-7 sm:text-xl">{formatJalaliDayTitle(summary.day)}</h2>
            <p className="mt-0.5 text-xs font-bold text-[#7d6841]">{formatJalaliWeekday(summary.day.date)}</p>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black ${statusStyle.badgeClassName}`}>{calendarVisualStatusLabels[summary.status]}</span>
        </div>

        <div className="mt-3 grid gap-2.5">
          <DayOccasions summary={summary} />
          <AvailabilitySummary summary={summary} activeSalonCount={activeSalonCount} />
          {hasContracts ? <DayFinancialSummary summary={summary} /> : null}

          <section className="rounded-2xl border border-[#d8c08b]/44 bg-[#fff9ee]/62 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-2 text-sm font-black text-[#111827]"><CalendarCheck size={16} className="text-[#9f7131]" />مراسم‌ها و رزروها</h3>
              <span className="rounded-full border border-[#d8c08b]/42 bg-white/60 px-2 py-0.5 text-[10px] font-black text-[#7d6841]">{formatPersianNumber(summary.contracts.length)}</span>
            </div>
            {hasContracts ? (
              <div className="grid gap-2">
                {summary.contracts.map((contract) => <ContractEventCard key={contract.id} contract={contract} />)}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#d8c08b]/56 bg-[#fffdf8]/66 p-3 text-sm font-bold leading-7 text-[#6d5f49]">
                <p>برای این روز هنوز مراسمی ثبت نشده است.</p>
                {!isBlocked ? (
                  <Link href={`/dashboard/contracts/new?eventDate=${encodeURIComponent(summary.day.date.toISOString())}`} className="mt-2 inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#111827]/14 bg-[#111827] px-3 py-1.5 text-xs font-black text-[#fff8ea]">
                    <Plus size={14} />
                    ثبت اولین مراسم این روز
                  </Link>
                ) : null}
              </div>
            )}
          </section>

          {summary.note ? <DayNoteCard summary={summary} noteStatus={noteStatus} /> : null}

          <section className="rounded-2xl border border-[#d8c08b]/44 bg-[#fff8ea]/56 p-2.5">
            <p className="text-xs font-black text-[#7d6841]">اقدامات روز</p>
            {isBlocked ? (
              <div className="mt-2 rounded-2xl border border-[#6b7280]/20 bg-[#f3f4f6] px-3 py-2 text-sm font-bold leading-7 text-[#374151]">
                این روز مسدود شده است. برای ثبت مراسم، ابتدا وضعیت روز را از فرم مدیریت روز آزاد کنید.
              </div>
            ) : (
              <Link
                href={`/dashboard/contracts/new?eventDate=${encodeURIComponent(summary.day.date.toISOString())}`}
                className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[#111827]/16 bg-[#111827] px-4 py-2 text-sm font-black text-[#fff8ea] transition hover:border-[#c7a15a]/60 hover:bg-[#1f2937]"
              >
                <FileSignature size={16} />
                ثبت مراسم برای این روز
              </Link>
            )}
            {summary.status === "CLOSED" && !isBlocked ? (
              <p className="mt-2 flex items-start gap-2 rounded-2xl border border-[#b45353]/16 bg-[#fff7f4]/66 px-3 py-2 text-xs font-bold leading-6 text-[#8f2c2c]">
                <AlertTriangle className="mt-1 shrink-0" size={15} />
                این روز تعطیل رسمی یا جمعه است؛ در صورت نیاز همچنان می‌توانید مراسم ثبت کنید.
              </p>
            ) : null}
            <div id="day-note-form" className="mt-2">
              <CalendarNoteForm
                dateIso={summary.day.date.toISOString()}
                canEdit={canEdit}
                defaultValues={
                  summary.note
                    ? {
                        status: summary.note.status,
                        title: summary.note.title ?? "",
                        note: summary.note.note ?? "",
                        color: summary.note.color ?? "#C7A15A",
                      }
                    : null
                }
              />
            </div>
          </section>
        </div>
      </section>
    </aside>
  );
}


function DayOccasions({ summary }: { summary: CalendarDaySummary }) {
  const items = [
    ...summary.occasions,
    ...(summary.day.isFriday ? [{ title: "جمعه", isOfficialHoliday: true }] : []),
  ];

  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[#b45353]/14 bg-[#fff7f4]/54 p-2.5">
      <p className="text-xs font-black text-[#8f2c2c]">مناسبت‌های این روز</p>
      <div className="mt-2 grid gap-1.5">
        {items.map((occasion) => (
          <div key={`${occasion.title}-${occasion.isOfficialHoliday}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#b45353]/10 bg-white/[0.46] px-2.5 py-1.5 text-xs font-bold leading-6 text-[#6d3340]">
            <span className="min-w-0 truncate">{occasion.title}</span>
            <span className="shrink-0 rounded-full border border-[#b45353]/16 bg-[#fff1f1] px-2 py-0.5 text-[10px] font-black text-[#8f2c2c]">
              {occasion.isOfficialHoliday ? "تعطیل رسمی" : "مناسبت"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}


function AvailabilitySummary({ summary, activeSalonCount }: { summary: CalendarDaySummary; activeSalonCount: number }) {
  return (
    <section className="grid grid-cols-2 gap-2">
      <MiniStat label="وضعیت روز" value={calendarVisualStatusLabels[summary.status]} />
      <MiniStat label="تعداد مراسم" value={`${formatPersianNumber(summary.eventCount)} مراسم`} />
      <MiniStat label="سالن‌های درگیر" value={`${formatPersianNumber(summary.busySalonCount)} سالن`} />
      <MiniStat label="سالن‌های آزاد" value={activeSalonCount > 0 ? `${formatPersianNumber(summary.availableSalonCount)} سالن` : "ثبت نشده"} />
    </section>
  );
}


function DayFinancialSummary({ summary }: { summary: CalendarDaySummary }) {
  return (
    <section className="grid grid-cols-2 gap-2 rounded-2xl border border-[#d8c08b]/44 bg-[#fff8ea]/56 p-2 text-center">
      <MiniStat label="جمع قراردادهای روز" value={formatIRR(summary.finalTotal)} dark />
      <MiniStat label="دریافت‌شده" value={formatIRR(summary.paidTotal)} />
      <MiniStat label="مانده" value={formatIRR(summary.remainingTotal)} alert={summary.remainingTotal > 0} />
      <MiniStat label="تعداد مراسم" value={`${formatPersianNumber(summary.eventCount)} مراسم`} />
    </section>
  );
}


function MiniStat({ label, value, dark, alert }: { label: string; value: string; dark?: boolean; alert?: boolean }) {
  return (
    <div className={`rounded-xl border px-2.5 py-2 text-right ${dark ? "border-[#111827]/12 bg-[#111827] text-[#fff8ea]" : alert ? "border-[#c7a15a]/24 bg-[#c7a15a]/10 text-[#7d6841]" : "border-[#d8c08b]/44 bg-[#fffdf8]/70 text-[#111827]"}`}>
      <p className={`text-[10px] font-black ${dark ? "text-[#f0dba9]" : "text-[#7d6841]"}`}>{label}</p>
      <p className="mt-1 text-xs font-black leading-5">{value}</p>
    </div>
  );
}


function DayNoteCard({ summary, noteStatus }: { summary: CalendarDaySummary; noteStatus: string | null }) {
  return (
    <section className="rounded-2xl border border-[#d8c08b]/48 bg-[#fff8ea]/60 p-2.5">
      <div className="flex items-start gap-2.5">
        <MessageSquareText className="mt-1 shrink-0 text-[#9f7131]" size={17} />
        <div className="min-w-0">
          <p className="text-xs font-black text-[#7d6841]">یادداشت مدیریتی</p>
          <p className="mt-1 text-sm font-black text-[#111827]">{summary.note?.title || noteStatus || "یادداشت مدیریتی"}</p>
          {noteStatus ? <p className="mt-1 text-xs font-black text-[#7d6841]">{noteStatus}</p> : null}
          {summary.note?.note ? <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">{summary.note.note}</p> : null}
        </div>
      </div>
    </section>
  );
}


function ContractEventCard({ contract }: { contract: CalendarContractEvent }) {
  const canPay = contract.remainingComputed > 0 && contract.status !== "CANCELED";
  const cancellationEstimate = calculateContractCancellationEstimate({
    eventDate: contract.eventDate,
    finalTotal: toNumber(contract.finalTotal),
    depositAmount: toNumber(contract.depositAmount),
  });

  return (
    <article className="rounded-2xl border border-[#d8c08b]/50 bg-[#fffdf8]/70 p-2.5">
      <div className="grid gap-2">
        <div className="flex items-start gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
            <ClipboardList size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${getContractStatusStyle(contract.status)}`}>{getContractStatusPersianLabel(contract.status)}</span>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${getPaymentStatusStyle(contract.paymentStatus)}`}>{paymentStatusLabels[contract.paymentStatus]}</span>
            </div>
            <h3 className="mt-1.5 text-sm font-black leading-6">{getContractEventLabel(contract)}</h3>
            <p className="mt-0.5 text-xs font-bold leading-6 text-[#6d5f49]">{contract.customer.fullName}، {formatPersianNumber(contract.guestCount)} مهمان</p>
          </div>
        </div>
        <div className="grid gap-1.5 text-[11px] font-black text-[#7d6841]">
          <span className="inline-flex items-center gap-2"><Clock3 size={14} />{formatContractTimeRange(contract.eventStartTime, contract.eventEndTime)}</span>
          <span className="inline-flex items-center gap-2"><MapPin size={14} />{contract.hall?.name ?? "تالار ثبت نشده"} / {contract.salon?.name ?? "سالن ثبت نشده"}</span>
          <span className="inline-flex items-center gap-2"><ReceiptText size={14} />{toPersianDigits(contract.contractNo)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="مبلغ نهایی" value={formatIRR(toNumber(contract.finalTotal))} />
          <MiniStat label="مانده" value={formatIRR(contract.remainingComputed)} alert={contract.remainingComputed > 0} />
          <MiniStat label="خسارت کنسلی" value={cancellationEstimate.isPenaltyActive ? formatIRR(cancellationEstimate.penaltyAmount) : "فعلاً ندارد"} alert={cancellationEstimate.isPenaltyActive} />
          <MiniStat label="مهلت کنسلی" value={formatCancellationDaysLabel(cancellationEstimate.daysUntilEvent)} alert={cancellationEstimate.isPenaltyActive} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href={`/dashboard/contracts/${contract.id}`} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#111827]/16 bg-[#111827] px-3 py-2 text-xs font-black text-[#fff8ea] transition hover:border-[#c7a15a]/60 hover:bg-[#1f2937]">
            <Eye size={15} />
            مشاهده جزئیات قرارداد
          </Link>
          <Link href={`/dashboard/contracts/${contract.id}#cancellation-policy`} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#b45353]/18 bg-[#fff1f1]/70 px-3 py-2 text-xs font-black text-[#8f2c2c] transition hover:border-[#b45353]/36">
            <ShieldCheck size={15} />
            کنسلی
          </Link>
          {canPay ? (
            <Link href={`/dashboard/payments/new?contractId=${contract.id}`} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#25a46d]/22 bg-[#25a46d]/10 px-3 py-2 text-xs font-black text-[#17483f] transition hover:border-[#25a46d]/42 sm:col-span-2">
              <WalletCards size={15} />
              ثبت دریافت
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}


function UpcomingList({ events, compact }: { events: CalendarContractEvent[]; compact?: boolean }) {
  return (
    <section className={`rounded-[1.35rem] border border-[#d8c08b]/50 bg-[#fffdf8]/88 p-3 text-[#111827] shadow-[0_12px_34px_rgba(17,24,39,0.05)] sm:rounded-[1.65rem] sm:p-3.5 ${compact ? "" : "min-h-[12rem]"}`}>
      <div className="flex flex-col gap-2 text-right sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black text-[#7d6841]">نمای لیستی</p>
          <h2 className="mt-0.5 text-lg font-black leading-7">مراسم‌های پیش‌رو</h2>
        </div>
        <Link href="/dashboard/contracts?sort=nearestEvent" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#d8c08b]/56 bg-[#fff8ea]/76 px-3 py-2 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70 sm:w-auto">
          مشاهده قراردادها
          <ArrowLeft size={15} />
        </Link>
      </div>
      {events.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {events.map((event) => {
            const remainingLabel = event.remainingComputed > 0 ? formatIRR(event.remainingComputed) : "تسویه‌شده";
            const remainingClass = event.remainingComputed > 0
              ? "border-[#c7a15a]/34 bg-[#c7a15a]/12 text-[#7d6841]"
              : "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]";

            return (
              <Link key={event.id} href={`/dashboard/contracts/${event.id}`} className="grid gap-2 rounded-2xl border border-[#d8c08b]/42 bg-[#fff8ea]/52 p-2.5 transition hover:border-[#c7a15a]/70 hover:bg-[#fff6df]/80 lg:grid-cols-[7.25rem_minmax(0,1fr)_auto] lg:items-center">
                <div className="rounded-xl border border-[#d8c08b]/32 bg-white/58 px-2.5 py-2 text-right lg:min-h-[4.25rem]">
                  <p className="text-[11px] font-black text-[#7d6841]">{formatJalaliWeekday(event.eventDate)}</p>
                  <p className="mt-0.5 text-sm font-black leading-6">{formatJalaliDate(event.eventDate)}</p>
                </div>
                <div className="min-w-0 text-right">
                  <p className="truncate text-sm font-black leading-6">{getContractEventLabel(event)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-[#6d5f49]">
                    <span className="min-w-0 truncate">{event.customer.fullName}</span>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <Clock3 size={13} className="text-[#9f7131]" />
                      {formatContractTimeRange(event.eventStartTime, event.eventEndTime)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 lg:justify-end lg:whitespace-nowrap">
                  <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-black ${remainingClass}`}>
                    {remainingLabel}
                  </span>
                  <span className="inline-flex items-center justify-center rounded-full border border-[#d8c08b]/40 bg-white/62 px-2.5 py-1 text-[11px] font-black text-[#7d6841]">جزئیات</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-[#d8c08b]/54 bg-[#fff8ea]/50 p-4 text-sm font-bold leading-7 text-[#6d5f49]">
          <p>مراسم پیش‌رویی مطابق فیلترهای فعلی پیدا نشد.</p>
          <Link href="/dashboard/contracts/new" className="mt-2 inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#111827]/14 bg-[#111827] px-3 py-1.5 text-xs font-black text-[#fff8ea]">
            <Plus size={14} />
            ثبت قرارداد جدید
          </Link>
        </div>
      )}
    </section>
  );
}

function getDayStatusStyle(status: CalendarVisualStatus) {
  const styles: Record<
    CalendarVisualStatus,
    {
      cellClassName: string;
      badgeClassName: string;
      dotClassName: string;
    }
  > = {
    AVAILABLE: {
      cellClassName: "border-[#25a46d]/18 bg-[#fffdf8]/82",
      badgeClassName: "border-[#25a46d]/20 bg-[#25a46d]/[0.08] text-[#17483f]",
      dotClassName: "bg-[#25a46d]",
    },
    RESERVED: {
      cellClassName: "border-[#c7a15a]/58 bg-[#fff6dd]/92 shadow-[0_10px_28px_rgba(199,161,90,0.10)]",
      badgeClassName: "border-[#c7a15a]/34 bg-[#c7a15a]/12 text-[#7d6841]",
      dotClassName: "bg-[#c7a15a]",
    },
    CONTRACTED: {
      cellClassName: "border-[#111827]/24 bg-[#efe4cf]/88 shadow-[0_10px_28px_rgba(17,24,39,0.10)]",
      badgeClassName: "border-[#111827]/18 bg-[#111827] text-[#fff8ea]",
      dotClassName: "bg-[#111827]",
    },
    CLOSED: {
      cellClassName: "border-[#b45353]/18 bg-[#fff7f4]/74",
      badgeClassName: "border-[#b45353]/20 bg-[#fff1f1]/82 text-[#8f2c2c]",
      dotClassName: "bg-[#b45353]",
    },
    BLOCKED: {
      cellClassName: "border-[#6b7280]/24 bg-[#f3f4f6]/86",
      badgeClassName: "border-[#6b7280]/24 bg-[#f3f4f6] text-[#374151]",
      dotClassName: "bg-[#6b7280]",
    },
    NOTE: {
      cellClassName: "border-[#5367b4]/22 bg-[#eef2ff]/74",
      badgeClassName: "border-[#5367b4]/24 bg-[#eef2ff] text-[#35458f]",
      dotClassName: "bg-[#5367b4]",
    },
    FOLLOW_UP: {
      cellClassName: "border-[#d08a20]/24 bg-[#fff7e6]/82",
      badgeClassName: "border-[#d08a20]/24 bg-[#fff7e6] text-[#9a5c00]",
      dotClassName: "bg-[#d08a20]",
    },
  };

  return styles[status];
}

function toneBorder(tone: "navy" | "emerald" | "amber" | "rose" | "neutral") {
  if (tone === "emerald") return "border-[#25a46d]/22";
  if (tone === "amber") return "border-[#c7a15a]/52";
  if (tone === "rose") return "border-[#b45353]/22";
  if (tone === "neutral") return "border-[#d8c08b]/58";
  return "border-[#111827]/14";
}

function toneIcon(tone: "navy" | "emerald" | "amber" | "rose" | "neutral") {
  if (tone === "emerald") return "bg-[#25a46d]/12 text-[#17483f]";
  if (tone === "amber") return "bg-[#fff7e6] text-[#7a4a12]";
  if (tone === "rose") return "bg-[#fff1f1] text-[#8f2c2c]";
  if (tone === "neutral") return "bg-[#fff8ea] text-[#7d6841]";
  return "bg-[#111827] text-[#f0dba9]";
}
