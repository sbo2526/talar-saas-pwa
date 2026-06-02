import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Clock3,
  CreditCard,
  FileSignature,
  Hourglass,
  Landmark,
  LayoutDashboard,
  Plus,
  ReceiptText,
  Settings2,
  TrendingUp,
  UserPlus,
  WalletCards,
} from "lucide-react";
import {
  contractStatusLabels,
  formatContractTime,
  getContractStatusStyle,
  getPaymentStatusStyle,
  type PaymentStatus,
  paymentStatusLabels,
} from "@/lib/contracts/display";
import { requireTenantMember } from "@/lib/auth/session";
import {
  formatJalaliDate,
  formatJalaliDateTime,
  formatJalaliWeekday,
  toPersianDigits,
} from "@/lib/date/jalali";
import { getDashboardOverviewData } from "@/lib/dashboard/dashboard-data";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import {
  formatPaymentMethodLabel,
  getPaymentRecordStatusLabel,
  getPaymentRecordStatusStyle,
  getPaymentTypeLabel,
  getPaymentTypeStyle,
} from "@/lib/payments/display";

type DashboardData = Awaited<ReturnType<typeof getDashboardOverviewData>>;
type KpiTone = "emerald" | "amber" | "rose" | "navy";
type DashboardIcon = typeof TrendingUp;

const quickActions = [
  {
    title: "ثبت قرارداد جدید",
    description: "شروع قرارداد با مشتری",
    href: "/dashboard/contracts/new",
    icon: FileSignature,
    primary: true,
  },
  { title: "ثبت دریافت", description: "بیعانه، قسط یا تسویه", href: "/dashboard/payments/new", icon: CreditCard },
  { title: "رزرو تاریخ", description: "مشاهده و رزرو تقویم", href: "/dashboard/calendar", icon: CalendarDays },
  { title: "مشتری جدید", description: "افزودن پرونده مشتری", href: "/dashboard/customers/new", icon: UserPlus },
  { title: "گزارش امروز", description: "خلاصه مالی و عملیاتی", href: "/dashboard/reports", icon: TrendingUp },
  { title: "ثبت هزینه", description: "خرج روزانه یا مرتبط با قرارداد", href: "/dashboard/expenses/new", icon: ReceiptText },
];

export default async function DashboardPage() {
  const membership = await requireTenantMember();
  const data = await getDashboardOverviewData({
    tenantId: membership.tenantId,
    userId: membership.userId,
    role: membership.role,
  });
  const today = new Date();
  const summary = buildHeroSummary(data);

  return (
    <section className="dashboard-page-structural-rebalance-67 space-y-3 sm:space-y-3.5">
      <section className="overflow-hidden rounded-[1.35rem] border border-[#d8c08b]/55 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.11),transparent_13rem),linear-gradient(135deg,rgba(255,250,241,0.99),rgba(249,241,222,0.96))] p-2.5 text-[#111827] shadow-[0_12px_34px_rgba(17,24,39,0.06)] sm:rounded-[1.55rem] sm:p-3">
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_13.75rem] lg:items-stretch">
          <div className="min-w-0 rounded-[1.05rem] border border-[#d8c08b]/32 bg-white/50 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:p-3.5">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-2.5 py-1 text-[11px] font-black text-[#17483f]">
                <LayoutDashboard size={13} />
                داشبورد عملیاتی امروز
              </span>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${accessChipClass(data.hero.accessTone)}`}>
                {data.hero.accessStatus}
                {typeof data.hero.daysLeft === "number" && data.hero.daysLeft >= 0 ? ` · ${toPersianDigits(data.hero.daysLeft)} روز مانده` : ""}
              </span>
            </div>
            <div className="mt-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <div className="min-w-0">
                <h1 className="text-[1.55rem] font-black leading-tight tracking-[-0.02em] text-[#111827] sm:text-[2rem]">
                  داشبورد امروز تالار
                </h1>
                <p className="mt-1.5 max-w-4xl text-sm font-bold leading-6 text-[#6d5f49] sm:text-[15px]">
                  {summary}
                </p>
              </div>
              <div className="hidden min-w-[10.5rem] rounded-2xl border border-[#d8c08b]/42 bg-[#fff7e6]/72 px-3 py-2 text-right shadow-[0_8px_22px_rgba(17,24,39,0.045)] xl:block">
                <p className="text-[10px] font-black text-[#7d6841]">وضعیت امروز</p>
                <p className="mt-1 text-lg font-black leading-none text-[#17483f]">{formatPersianNumber(data.hero.todayEventsCount)}</p>
                <p className="mt-1 text-[10px] font-bold text-[#7d6841]">مراسم ثبت‌شده برای امروز</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.05rem] border border-[#d8c08b]/34 bg-[#fff9ee]/78 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="text-[11px] font-black text-[#7d6841]">اقدام سریع</p>
              <span className="h-px flex-1 bg-[#d8c08b]/32" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <Link href="/dashboard/contracts/new" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 py-2 text-sm font-black text-[#fff8ea] shadow-[0_10px_22px_rgba(17,24,39,0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(17,24,39,0.18)]">
                ثبت قرارداد جدید
                <Plus size={16} />
              </Link>
              <Link href="/dashboard/calendar" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#d8b76a]/75 bg-white/70 px-4 py-2 text-sm font-black text-[#4a3514] shadow-[0_8px_18px_rgba(17,24,39,0.045)] transition hover:-translate-y-0.5 hover:bg-[#fff7e6]">
                مشاهده تقویم
                <ArrowLeft size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {membership.role === "OWNER" && data.postEventConfirmations.count > 0 ? (
        <OwnerPostEventWarning
          count={data.postEventConfirmations.count}
          startDate={data.postEventConfirmations.startDate}
        />
      ) : null}

      <QuickActions />
      <FinancialOverview data={data} />
      <ScheduleOverview data={data} />

      <section className="grid gap-3 xl:grid-cols-3">
        <UpcomingEventsCard data={data} />
        <RecentContractsCard data={data} />
        <RecentPaymentsCard data={data} />
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
        <SetupHealth data={data} />
        <RecentActivityCard data={data} />
      </section>
    </section>
  );
}

function OwnerPostEventWarning({ count, startDate }: { count: number; startDate: Date }) {
  return (
    <section className="grid gap-2.5 rounded-[1.05rem] border border-[#c7a15a]/38 bg-[#fff7e6]/94 p-2.5 text-[#4a3514] shadow-[0_8px_22px_rgba(199,161,90,0.075)] sm:p-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-[#f0dba9]">
        <AlertTriangle size={18} />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-black sm:text-base">{formatPersianNumber(count)} قرارداد بعد از مراسم هنوز تعیین تکلیف نشده است.</h2>
        <p className="mt-0.5 text-xs font-bold leading-5 text-[#7d6841] sm:text-sm">
این یادآوری برای مالک نمایش داده می‌شود و قراردادهای قبل از {formatJalaliDate(startDate)} در آن محاسبه نمی‌شوند. برای دقیق ماندن گزارش‌ها، وضعیت این قراردادها را مشخص کنید.
        </p>
      </div>
      <Link href="/dashboard/contracts" className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl bg-[#111827] px-3.5 py-1.5 text-xs font-black text-[#fff8ea]">
        مشاهده قراردادها
      </Link>
    </section>
  );
}

function buildHeroSummary(data: DashboardData) {
  const parts = [
    data.hero.todayEventsCount > 0 ? `${formatPersianNumber(data.hero.todayEventsCount)} مراسم امروز` : null,
    data.overdueReceivables.count > 0 ? `${formatPersianNumber(data.overdueReceivables.count)} دریافت سررسید شده` : null,
    data.kpis.todayPaymentsCount > 0 ? `${formatPersianNumber(data.kpis.todayPaymentsCount)} دریافت جدید` : null,
    data.hero.outstandingContractsCount > 0 ? `${formatPersianNumber(data.hero.outstandingContractsCount)} قرارداد دارای مانده` : null,
  ].filter(Boolean);

  if (parts.length === 0) {
    return "وضعیت رزروها، قراردادها، دریافت‌ها و کارهای مهم امروز را یکجا ببینید.";
  }

  return `امروز ${parts.join("، ")} دارید. دریافت امروز ${formatIRR(data.kpis.todayPaymentsTotal)} و مانده قابل دریافت ${formatIRR(data.kpis.outstandingTotal)} است.`;
}

function accessChipClass(tone: string) {
  if (tone === "success") return "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]";
  if (tone === "danger") return "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]";
  return "border-[#c7a15a]/36 bg-[#fff7e6] text-[#7a4a12]";
}

function SectionHeader({
  eyebrow,
  title,
  actionHref,
  actionLabel,
  surface = "light",
}: {
  eyebrow: string;
  title: string;
  actionHref?: string;
  actionLabel?: string;
  surface?: "light" | "dark";
}) {
  const isDark = surface === "dark";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className={`text-xs font-black ${isDark ? "text-[#f0dba9]" : "text-[#17483f]"}`}>{eyebrow}</p>
        <h2 className={`mt-0.5 text-base font-black sm:text-xl ${isDark ? "text-[#fff8ea] drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]" : "text-[#111827]"}`}>{title}</h2>
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black ${isDark ? "border-[#f0dba9]/30 bg-white/[0.07] text-[#fff8ea] hover:bg-white/[0.11]" : "border-[#d8b76a]/85 bg-[#fff7e6] text-[#4a3514]"}`}>
          {actionLabel}
          <ArrowLeft size={16} />
        </Link>
      ) : null}
    </div>
  );
}

function QuickActions() {
  return (
    <section className="rounded-[1.22rem] border border-[#d8c08b]/58 bg-[#fff9ee]/92 p-3 text-[#111827] shadow-[0_10px_30px_rgba(17,24,39,0.05)] sm:rounded-[1.45rem] sm:p-3.5">
      <SectionHeader eyebrow="اقدام‌های سریع" title="کارهای روزانه و پرتکرار" actionHref="/dashboard/reports" actionLabel="گزارش‌ها" />
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {quickActions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className={`group grid min-h-[5.15rem] grid-cols-[2rem_1fr] items-start gap-2 rounded-xl border p-2.5 text-[#111827] transition hover:-translate-y-0.5 ${
                action.primary
                  ? "border-[#c7a15a]/48 bg-[#172033] text-[#fff8ea] shadow-[0_8px_20px_rgba(17,24,39,0.085)]"
                  : "border-[#d8c08b]/58 bg-white/58 hover:border-[#c7a15a]/70 hover:bg-[#fff7e6]/72"
              }`}
            >
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${action.primary ? "bg-[#f0dba9] text-[#111827]" : "bg-[#fff7e6] text-[#17483f] ring-1 ring-[#d8c08b]/55"}`}>
                <Icon size={16} />
              </span>
              <span className="min-w-0 self-stretch">
                <span className="block text-sm font-black leading-5">{action.title}</span>
                <span className={`mt-1 block text-[11px] font-bold leading-5 ${action.primary ? "text-[#f0dba9]" : "text-[#6d5f49]"}`}>{action.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FinancialOverview({ data }: { data: DashboardData }) {
  const netToday = data.kpis.todayPaymentsTotal - data.kpis.todayExpensesTotal;

  return (
    <section className="rounded-[1.18rem] border border-[#d8c08b]/56 bg-[linear-gradient(145deg,rgba(255,249,238,0.96),rgba(255,252,245,0.88))] p-3 text-[#111827] shadow-[0_8px_24px_rgba(17,24,39,0.045)] sm:rounded-[1.42rem] sm:p-3.5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black text-[#17483f]">خلاصه مالی</p>
          <h2 className="mt-0.5 text-base font-black leading-6 text-[#111827] sm:text-xl">خلاصه مالی امروز و ماه جاری</h2>
        </div>
        <Link href="/dashboard/reports" className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#d8b76a]/80 bg-white/66 px-3.5 py-1.5 text-xs font-black text-[#4a3514] transition hover:border-[#c7a15a]/90 hover:bg-[#fff7e6]">
          گزارش مالی
          <ArrowLeft size={15} />
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="مانده قابل دریافت" value={formatIRR(data.kpis.outstandingTotal)} hint={`${formatPersianNumber(data.kpis.outstandingCount)} قرارداد نیازمند پیگیری`} href="/dashboard/contracts?paymentStatus=unsettled" icon={AlertTriangle} tone="amber" featured />
        <KpiCard label="دریافت امروز" value={formatIRR(data.kpis.todayPaymentsTotal)} hint={`${formatPersianNumber(data.kpis.todayPaymentsCount)} دریافت`} href="/dashboard/payments" icon={WalletCards} tone="emerald" />
        <KpiCard label="خالص امروز" value={formatIRR(netToday)} hint="دریافت منهای هزینه" href="/dashboard/reports" icon={Landmark} tone={netToday >= 0 ? "emerald" : "rose"} />
        <KpiCard label="دریافت‌های سررسید شده" value={formatIRR(data.overdueReceivables.total)} hint={`${formatPersianNumber(data.overdueReceivables.count)} مورد نیازمند پیگیری`} href="/dashboard/payments" icon={Hourglass} tone={data.overdueReceivables.count > 0 ? "rose" : "emerald"} />
        <KpiCard label="دریافت ماه جاری" value={formatIRR(data.kpis.monthPaymentsTotal)} hint="مجموع دریافت‌های ماه" href="/dashboard/reports" icon={TrendingUp} tone="emerald" />
        <KpiCard label="هزینه ماه جاری" value={formatIRR(data.kpis.monthExpensesTotal)} hint="مجموع هزینه‌های ماه" href="/dashboard/reports" icon={ReceiptText} tone="rose" />
      </div>
    </section>
  );
}

function ScheduleOverview({ data }: { data: DashboardData }) {
  return (
    <section className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr]">
      <Panel title="برنامه امروز" eyebrow="تایم‌لاین" href="/dashboard/calendar" action="تقویم" icon={Clock3}>
        {data.todayTimeline.length > 0 ? (
          <div className="grid gap-2.5">
            {data.todayTimeline.map((item) => (
              <Link key={item.id} href={item.href} className="flex gap-2 rounded-xl border border-[#d8c08b]/48 bg-white/50 p-2.5 transition hover:border-[#c7a15a]/70">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${item.type === "receivable" ? "bg-[#fff1f1] text-[#8f2c2c]" : "bg-[#111827] text-[#f0dba9]"}`}>
                  {item.type === "receivable" ? <CreditCard size={17} /> : <CalendarClock size={17} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-[#111827]">{item.timeLabel} · {item.title}</span>
                  <span className="mt-1 block text-xs font-bold leading-6 text-[#6d5f49]">{item.description}</span>
                  {item.amount ? <span className="mt-1 block text-xs font-black text-[#17483f]">{formatIRR(item.amount)}</span> : null}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState text="برای امروز برنامه‌ای ثبت نشده است." href="/dashboard/contracts/new" action="ثبت قرارداد" />
        )}
      </Panel>

      <Panel title="رزرو ۷ روز آینده" eyebrow="تقویم کوچک" href="/dashboard/calendar" action="مشاهده تقویم" icon={CalendarDays}>
        <div className="grid grid-cols-7 gap-1.5">
          {data.weekReservations.map((day) => (
            <Link key={day.date.toISOString()} href="/dashboard/calendar" className={`rounded-xl border p-1.5 text-center transition hover:-translate-y-0.5 ${day.count > 0 ? "border-[#c7a15a]/55 bg-[#fff7e6] text-[#7a4a12]" : "border-[#d8c08b]/55 bg-white/55 text-[#6d5f49]"}`}>
              <p className="text-[10px] font-black">{formatJalaliWeekday(day.date).replace("‌", " ").slice(0, 3)}</p>
              <p className="mt-1 text-sm font-black">{toPersianDigits(formatJalaliDate(day.date).split("/").at(-1) ?? "")}</p>
              <p className="mt-1 text-[10px] font-black">{formatPersianNumber(day.count)} رزرو</p>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel title="وضعیت سالن‌ها" eyebrow="ظرفیت و رزرو" href="/dashboard/halls" action="سالن‌ها" icon={Building2}>
        {data.hallStatuses.length > 0 ? (
          <div className="grid gap-2.5">
            {data.hallStatuses.slice(0, 4).map((hall) => (
              <Link key={hall.id} href="/dashboard/halls" className="rounded-xl border border-[#d8c08b]/48 bg-white/50 p-2.5 transition hover:border-[#c7a15a]/70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[#111827]">{hall.name}</p>
                    <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">{formatPersianNumber(hall.salonsCount)} سالن{hall.totalCapacity ? ` · ظرفیت ${formatPersianNumber(hall.totalCapacity)} نفر` : ""}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${hall.todayEventsCount > 0 ? "border-[#c7a15a]/36 bg-[#fff7e6] text-[#7a4a12]" : "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]"}`}>
                    امروز {hall.todayEventsCount > 0 ? `${formatPersianNumber(hall.todayEventsCount)} رزرو` : "آزاد"}
                  </span>
                </div>
                <p className="mt-2 text-xs font-black text-[#17483f]">۷ روز آینده: {formatPersianNumber(hall.nextSevenDaysEventsCount)} رزرو</p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState text="هنوز تالار یا سالن فعالی ثبت نشده است." href="/dashboard/base" action="تعریف تالار و سالن" />
        )}
      </Panel>
    </section>
  );
}

function KpiCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone,
  featured = false,
}: {
  label: string;
  value: string;
  hint: string;
  href: string;
  icon: DashboardIcon;
  tone: KpiTone;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-[6.15rem] min-w-0 flex-col justify-between overflow-hidden rounded-xl border p-2.5 text-right text-[#111827] transition hover:-translate-y-0.5 hover:border-[#c7a15a]/80 sm:p-3 ${featured ? "border-[#d8b76a]/72 bg-[linear-gradient(145deg,rgba(255,247,230,0.98),rgba(255,252,245,0.94))] shadow-[0_8px_22px_rgba(199,161,90,0.075)] ring-1 ring-[#f0dba9]/24" : `bg-white/64 shadow-[0_7px_18px_rgba(17,24,39,0.035)] ${toneBorder(tone)}`}`}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${toneIcon(tone)}`}>
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black leading-5 text-[#6d5f49]">{label}</p>
          <p className={`mt-1 break-words font-black leading-tight text-[#111827] ${featured ? "text-[clamp(1.02rem,2.55vw,1.26rem)] sm:text-[1.26rem]" : "text-[clamp(0.96rem,2.2vw,1.12rem)] sm:text-[1.12rem]"}`}>{value}</p>
        </div>
      </div>
      <p className={`mt-2 border-t pt-2 text-[11px] font-black leading-5 ${featured ? "border-[#d8b76a]/28 text-[#7a4a12]" : "border-[#d8c08b]/30 text-[#17483f]"}`}>{hint}</p>
    </Link>
  );
}

function toneBorder(tone: KpiTone) {
  if (tone === "emerald") return "border-[#25a46d]/22";
  if (tone === "rose") return "border-[#b45353]/22";
  if (tone === "amber") return "border-[#c7a15a]/52";
  return "border-[#d8c08b]/62";
}

function toneIcon(tone: KpiTone) {
  if (tone === "emerald") return "bg-[#25a46d]/12 text-[#17483f]";
  if (tone === "rose") return "bg-[#fff1f1] text-[#8f2c2c]";
  if (tone === "amber") return "bg-[#fff7e6] text-[#7a4a12]";
  return "bg-[#111827] text-[#f0dba9]";
}

function UpcomingEventsCard({ data }: { data: DashboardData }) {
  return (
    <Panel title="مراسم‌های نزدیک" eyebrow="عملیات" href="/dashboard/calendar" action="مشاهده تقویم" icon={CalendarDays}>
      {data.upcomingEvents.length > 0 ? (
        <div className="grid gap-2.5">
          {data.upcomingEvents.map((event) => (
            <Link key={event.id} href={`/dashboard/contracts/${event.id}`} className="rounded-xl border border-[#d8c08b]/48 bg-white/50 p-2.5 transition hover:border-[#c7a15a]/70">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#111827]">{event.eventTypeName || "مراسم"}</p>
                  <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">{event.customer.fullName} · {formatPersianNumber(event.guestCount)} مهمان</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black ${getContractStatusStyle(event.status)}`}>{contractStatusLabels[event.status]}</span>
              </div>
              <p className="mt-2 text-xs font-black text-[#17483f]">{formatJalaliDate(event.eventDate)} · ساعت {formatContractTime(event.eventStartTime)}</p>
              <p className="mt-1 text-xs font-bold text-[#7d6841]">{event.hall?.name || "تالار ثبت نشده"} / {event.salon?.name || "سالن ثبت نشده"}</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState text="مراسم نزدیکی ثبت نشده است." href="/dashboard/contracts/new" action="ثبت قرارداد" />
      )}
    </Panel>
  );
}

function RecentContractsCard({ data }: { data: DashboardData }) {
  return (
    <Panel title="آخرین قراردادها" eyebrow="پرونده‌ها" href="/dashboard/contracts" action="مشاهده قراردادها" icon={ClipboardList}>
      {data.latestContracts.length > 0 ? (
        <div className="grid gap-2.5">
          {data.latestContracts.map((contract) => (
            <Link key={contract.id} href={`/dashboard/contracts/${contract.id}`} className="rounded-xl border border-[#d8c08b]/48 bg-white/50 p-2.5 transition hover:border-[#c7a15a]/70">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#111827]">قرارداد {toPersianDigits(contract.contractNo)}</p>
                  <p className="mt-1 text-xs font-bold text-[#6d5f49]">{contract.customer.fullName} · {formatJalaliDate(contract.eventDate)}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${getPaymentStatusStyle(contract.paymentStatus as PaymentStatus)}`}>{paymentStatusLabels[contract.paymentStatus as PaymentStatus]}</span>
              </div>
              <p className="mt-2 text-sm font-black text-[#17483f]">{formatIRR(contract.finalTotal.toString())}</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState text="هنوز قراردادی ثبت نشده است." href="/dashboard/contracts/new" action="ثبت قرارداد جدید" />
      )}
    </Panel>
  );
}

function RecentPaymentsCard({ data }: { data: DashboardData }) {
  return (
    <Panel title="آخرین دریافتی‌ها" eyebrow="دریافت‌ها" href="/dashboard/payments" action="مشاهده دریافتی‌ها" icon={WalletCards}>
      {data.latestPayments.length > 0 ? (
        <div className="grid gap-2.5">
          {data.latestPayments.map((payment) => (
            <Link key={payment.id} href={payment.contract?.id ? `/dashboard/contracts/${payment.contract.id}` : "/dashboard/payments"} className="rounded-xl border border-[#d8c08b]/48 bg-white/50 p-2.5 transition hover:border-[#c7a15a]/70">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${getPaymentTypeStyle(payment.type)}`}>{getPaymentTypeLabel(payment.type)}</span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${getPaymentRecordStatusStyle(payment.status)}`}>{getPaymentRecordStatusLabel(payment.status)}</span>
              </div>
              <p className="mt-2 text-sm font-black text-[#111827]">{payment.contract?.customer.fullName ?? payment.customer?.fullName ?? "بدون مشتری"}</p>
              <p className="mt-1 text-xs font-bold text-[#6d5f49]">{formatJalaliDate(payment.paidAt)} · {formatPaymentMethodLabel(payment.paymentMethod)}</p>
              <p className="mt-2 text-sm font-black text-[#17483f]">{formatIRR(payment.amount.toString())}</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState text="هنوز دریافتی ثبت نشده است." href="/dashboard/payments/new" action="ثبت دریافت" />
      )}
    </Panel>
  );
}

function RecentActivityCard({ data }: { data: DashboardData }) {
  return (
    <Panel title="آخرین فعالیت‌ها" eyebrow="جریان کار" href="/dashboard/settings/notification-logs" action="لاگ اعلان‌ها" icon={BellRing}>
      {data.recentActivity.length > 0 ? (
        <div className="grid gap-2">
          {data.recentActivity.map((activity) => {
            const ActivityIcon = activity.type === "payment" ? CreditCard : activity.type === "expense" ? ReceiptText : activity.type === "notification" ? BellRing : FileSignature;

            return (
              <Link key={activity.id} href={activity.href} className="group grid grid-cols-[1fr_auto] items-start gap-2 rounded-xl border border-[#d8c08b]/48 bg-white/52 p-2.5 transition hover:border-[#c7a15a]/70">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black leading-5 text-[#111827]">{activity.title}</span>
                  <span className="mt-0.5 block text-xs font-bold leading-5 text-[#6d5f49]">{activity.description}</span>
                  <span className="mt-1 block text-[11px] font-black leading-5 text-[#17483f]">{formatJalaliDateTime(activity.date)}{activity.amount ? ` · ${formatIRR(activity.amount)}` : ""}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5 text-left">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-[#111827] text-[#f0dba9] transition group-hover:bg-[#172033]">
                    <ActivityIcon size={16} />
                  </span>
                  <span className="hidden max-w-[6.5rem] truncate text-[10px] font-black leading-4 text-[#7d6841] sm:block">{formatJalaliDateTime(activity.date).split("،").at(-1)?.trim() ?? ""}</span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState text="هنوز فعالیتی برای نمایش وجود ندارد." href="/dashboard/contracts/new" action="شروع با ثبت قرارداد" />
      )}
    </Panel>
  );
}

function SetupHealth({ data }: { data: DashboardData }) {
  const items = [
    {
      title: "اطلاعات تالار",
      href: "/dashboard/hall-info",
      status: data.setupHealth.hallInfo.isComplete ? "تکمیل‌شده" : `${formatPersianNumber(data.setupHealth.hallInfo.missingFields)} مورد ناقص`,
      tone: data.setupHealth.hallInfo.isComplete ? "success" : "warning",
      detail: "برای چاپ قرارداد و هویت رسمی تالار",
    },
    {
      title: "تالارها و سالن‌ها",
      href: "/dashboard/base",
      status: `${formatPersianNumber(data.setupHealth.baseDefinitions.halls)} تالار · ${formatPersianNumber(data.setupHealth.baseDefinitions.salons)} سالن`,
      tone: data.setupHealth.baseDefinitions.halls > 0 && data.setupHealth.baseDefinitions.salons > 0 ? "success" : "warning",
      detail: "ساختار رزرو و ظرفیت‌ها",
    },
    {
      title: "منو و خدمات",
      href: "/dashboard/base",
      status: `${formatPersianNumber(data.setupHealth.catalog.menus)} منو · ${formatPersianNumber(data.setupHealth.catalog.services)} خدمت`,
      tone: data.setupHealth.catalog.withoutPrice === 0 && data.setupHealth.catalog.menus + data.setupHealth.catalog.services > 0 ? "success" : "warning",
      detail: data.setupHealth.catalog.withoutPrice > 0 ? `${formatPersianNumber(data.setupHealth.catalog.withoutPrice)} آیتم بدون قیمت` : "قیمت‌ها آماده هستند",
    },
    {
      title: "روش‌های دریافت و مالی",
      href: "/dashboard/payment-methods",
      status: `${formatPersianNumber(data.setupHealth.finance.paymentMethods)} روش دریافت · ${formatPersianNumber(data.setupHealth.finance.financialCategories)} دسته مالی`,
      tone: data.setupHealth.finance.paymentMethods > 0 ? "success" : "warning",
      detail: "برای دریافت‌ها، هزینه‌ها و گزارش‌ها",
    },
    {
      title: "تنظیمات قرارداد",
      href: "/dashboard/contract-settings",
      status: data.setupHealth.contractSettings.isComplete ? "آماده" : `${formatPersianNumber(data.setupHealth.contractSettings.missingFields)} مورد ناقص`,
      tone: data.setupHealth.contractSettings.isComplete ? "success" : "warning",
      detail: "شماره‌گذاری و متن‌های رسمی",
    },
    {
      title: "حساب کاربری",
      href: "/dashboard/account",
      status: data.setupHealth.account.isComplete ? "تکمیل‌شده" : `${formatPersianNumber(data.setupHealth.account.missingFields)} مورد ناقص`,
      tone: data.setupHealth.account.isComplete ? "success" : "warning",
      detail: "برای ارتباط، پشتیبانی و امنیت حساب",
    },
  ];

  return (
    <Panel title="راه‌اندازی و اطلاعات پایه" eyebrow="سلامت پایه‌ها" href="/dashboard/base" action="تکمیل اطلاعات پایه" icon={Settings2}>
      <div className="mb-3 rounded-xl border border-[#d8c08b]/55 bg-white/55 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black text-[#111827]">درصد تکمیل اطلاعات سامانه</p>
          <p className="text-lg font-black text-[#17483f]">{formatPersianNumber(data.setupHealth.completionPercent)}٪</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#d8c08b]/30">
          <div className="h-full rounded-full bg-[#17483f]" style={{ width: `${data.setupHealth.completionPercent}%` }} />
        </div>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map((item) => (
          <Link key={item.title} href={item.href} className="rounded-xl border border-[#d8c08b]/48 bg-white/50 p-2.5 transition hover:border-[#c7a15a]/70">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-[#111827]">{item.title}</p>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${item.tone === "success" ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]" : "border-[#c7a15a]/36 bg-[#fff7e6] text-[#7a4a12]"}`}>
                {item.status}
              </span>
            </div>
            <p className="mt-2 text-xs font-bold leading-6 text-[#6d5f49]">{item.detail}</p>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function Panel({
  title,
  eyebrow,
  href,
  action,
  icon: Icon,
  children,
}: {
  title: string;
  eyebrow: string;
  href: string;
  action: string;
  icon: DashboardIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.22rem] border border-[#d8c08b]/58 bg-[#fff9ee]/90 p-3.5 text-[#111827] shadow-[0_10px_30px_rgba(17,24,39,0.052)] sm:rounded-[1.45rem]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-[#f0dba9]">
            <Icon size={17} />
          </span>
          <div>
            <p className="text-xs font-black text-[#17483f]">{eyebrow}</p>
            <h2 className="mt-0.5 text-base font-black text-[#111827]">{title}</h2>
          </div>
        </div>
        <Link href={href} className="min-h-8 shrink-0 rounded-xl border border-[#d8b76a]/85 bg-[#fff7e6] px-3 py-1.5 text-xs font-black text-[#4a3514]">
          {action}
        </Link>
      </div>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function EmptyState({ text, href, action }: { text: string; href: string; action: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#d8c08b]/64 bg-white/42 px-3 py-2.5 text-center">
      <div>
        <p className="text-xs font-bold leading-6 text-[#6d5f49] sm:text-sm">{text}</p>
        <p className="mt-1 text-[11px] font-bold leading-5 text-[#7d6841]">این کارت از داده‌های ثبت‌شده همین بخش تغذیه می‌شود؛ وقتی داده‌ای ثبت نشده باشد، مسیر اقدام زیر منبع فعال‌سازی آن است.</p>
      </div>
      <Link href={href} className="inline-flex min-h-8 shrink-0 justify-center rounded-xl bg-[#111827] px-3 py-1.5 text-xs font-black text-[#fff8ea]">{action}</Link>
    </div>
  );
}
