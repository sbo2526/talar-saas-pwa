/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Database,
  FileSignature,
  HeartPulse,
  LifeBuoy,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UsersRound,
  Zap,
} from "lucide-react";
import type { ElementType, ReactNode } from "react";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminStatCard } from "@/components/admin/stat-card";
import { StatusChip, type AdminChipTone } from "@/components/admin/status-chip";
import { getPlatformDashboardData } from "@/lib/admin/admin-dashboard-data";
import {
  getTicketPriorityLabel,
  getTicketPriorityTone,
  getTicketStatusLabel,
  getTicketStatusTone,
} from "@/lib/admin/admin-labels";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import {
  formatJalaliAuditDateTime,
  formatJalaliDate,
  formatJalaliMonthYear,
} from "@/lib/date/jalali";

const adminQuickActions = [
  {
    title: "تالارها و فضاهای کاری",
    href: "/admin/tenants",
    icon: Building2,
    primary: true,
  },
  {
    title: "اشتراک‌ها و دوره‌های بررسی",
    href: "/admin/subscriptions",
    icon: CreditCard,
  },
  {
    title: "تیکت‌های فوری",
    href: "/admin/support?priority=urgent",
    icon: LifeBuoy,
  },
  { title: "کاربران جدید", href: "/admin/users?sort=newest", icon: UserCheck },
  { title: "فعالیت‌های اخیر", href: "/admin/activity", icon: ListChecks },
  { title: "گزارش سامانه", href: "/admin/reports", icon: TrendingUp },
];

function SectionHeader({
  title,
  description,
  href,
  action,
  eyebrow,
}: {
  title: string;
  description?: string;
  href?: string;
  action?: string;
  eyebrow?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#b58a25]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-lg font-black text-[#172033]">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-3xl text-xs font-bold leading-6 text-[#6d5f49]">
            {description}
          </p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 rounded-2xl border border-[#d8b76a]/70 bg-[#fff7e6] px-3 py-2 text-xs font-black text-[#4a3514] transition hover:border-[#c7a15a] hover:bg-[#fff0c7]"
        >
          {action || "مشاهده"}
          <ArrowLeft size={14} />
        </Link>
      ) : null}
    </div>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#d8c08b]/55 bg-[#fffaf0]/70 p-5 text-center text-sm font-bold leading-7 text-[#7b6a4b]">
      {children}
    </div>
  );
}

function CompactRow({
  title,
  description,
  href,
  tone = "navy",
  meta,
  actionLabel = "مشاهده",
}: {
  title: string;
  description?: string;
  href: string;
  tone?: AdminChipTone;
  meta?: string;
  actionLabel?: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-3xl border border-[#e8c478]/28 bg-[#fffaf0]/80 p-3 transition hover:-translate-y-0.5 hover:border-[#d8a738] hover:shadow-[0_18px_42px_rgba(23,32,51,0.08)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#172033]">{title}</p>
          {description ? (
            <p className="mt-1 line-clamp-2 text-xs font-bold leading-6 text-[#7b6a4b]">
              {description}
            </p>
          ) : null}
        </div>
        {meta ? <StatusChip tone={tone}>{meta}</StatusChip> : null}
      </div>
      <div className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#8a6a22]">
        {actionLabel}
        <ArrowLeft
          size={13}
          className="transition group-hover:-translate-x-0.5"
        />
      </div>
    </Link>
  );
}

function MiniMetric({
  title,
  value,
  tone = "navy",
  description,
}: {
  title: string;
  value: string;
  tone?: AdminChipTone;
  description?: string;
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "rose"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-[#e8c478]/35 bg-white/75 text-[#172033]";

  return (
    <div className={`rounded-3xl border p-3 ${toneClass}`}>
      <p className="text-[11px] font-black opacity-80">{title}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
      {description ? (
        <p className="mt-1 text-[11px] font-bold leading-5 opacity-75">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function AdminQuickActionCard({
  title,
  href,
  icon,
  primary,
}: {
  title: string;
  href: string;
  icon: ElementType;
  primary?: boolean;
}) {
  const Icon = icon;

  return (
    <Link
      href={href}
      className={`group flex min-h-24 flex-col justify-between rounded-[1.25rem] border p-3 text-[#172033] transition hover:-translate-y-0.5 sm:min-h-28 ${
        primary
          ? "border-[#172033]/18 bg-[#172033] text-[#fff8ea] shadow-[0_18px_44px_rgba(23,32,51,0.16)]"
          : "border-[#d8c08b]/62 bg-[#fff8ea]/82 hover:border-[#c7a15a]/70 hover:bg-[#fff0c7]/45"
      }`}
    >
      <span
        className={`flex size-10 items-center justify-center rounded-2xl shadow-[0_12px_28px_rgba(23,32,51,0.12)] ${primary ? "bg-[#f0dba9] text-[#172033]" : "bg-[#172033] text-[#f0dba9]"}`}
      >
        <Icon size={18} />
      </span>
      <span className="mt-3 text-sm font-black leading-6">{title}</span>
    </Link>
  );
}

function HealthRow({
  title,
  status,
  description,
  tone = "emerald",
  icon,
}: {
  title: string;
  status: string;
  description: string;
  tone?: AdminChipTone;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-3xl border border-[#e8c478]/25 bg-[#fffaf0]/70 p-3">
      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-[#172033] text-[#f0dba9]">
        {icon || <CheckCircle2 size={17} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-black text-[#172033]">{title}</p>
          <StatusChip tone={tone}>{status}</StatusChip>
        </div>
        <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">
          {description}
        </p>
      </div>
    </div>
  );
}

function HeroMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3">
      <p className="text-[11px] font-black text-[#d8c08b]">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function PlatformStatusChip({ status }: { status: string }) {
  if (status === "STABLE") {
    return <StatusChip tone="emerald">پایدار</StatusChip>;
  }

  return <StatusChip tone="amber">نیازمند بررسی</StatusChip>;
}

function formatMaybeDate(date: Date | null | undefined) {
  return date ? formatJalaliAuditDateTime(date) : "فعالیت مهم ثبت نشده";
}

export default async function AdminHomePage() {
  const data = await getPlatformDashboardData();

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#172033] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-7">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:px-4 sm:py-2 sm:text-sm">
                <LayoutDashboard size={15} />
                مرکز فرمان کل سامانه
              </span>
              <PlatformStatusChip status={data.platformStatus} />
              <span className="rounded-full border border-[#172033]/10 bg-white/65 px-3 py-1.5 text-xs font-black text-[#6d5f49]">
                به‌روزرسانی: {formatJalaliDate(data.generatedAt)}
              </span>
            </div>
            <h1 className="mt-4 text-2xl font-black leading-tight sm:mt-5 sm:text-4xl">
              مدیریت کل سامانه
            </h1>
            <p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-[#6d5f49] sm:mt-4 sm:text-base sm:leading-8">
              نمای متمرکز مالک پلتفرم برای پایش تالارها، کاربران، اشتراک‌ها،
              تیکت‌ها، سلامت سامانه و اقدام‌های ضروری روزانه.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/admin/tenants"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#172033] px-4 py-2.5 text-sm font-black text-[#fff8ea] shadow-[0_14px_38px_rgba(23,32,51,0.16)]"
              >
                مدیریت تالارها
                <ArrowLeft size={17} />
              </Link>
              <Link
                href="/admin/subscriptions"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2.5 text-sm font-black text-[#4a3514]"
              >
                اشتراک‌ها و دوره‌های بررسی
                <CreditCard size={17} />
              </Link>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[#d8c08b]/70 bg-[#172033] p-4 text-[#fff8ea] shadow-[0_18px_56px_rgba(23,32,51,0.18)] sm:p-5">
            <p className="text-xs font-black text-[#f0dba9]">
              خلاصه کنترل امروز
            </p>
            <p className="mt-1 text-lg font-black">
              مدیر سامانه: {data.admin.name || data.admin.email}
            </p>
            <p className="mt-2 text-xs font-bold leading-6 text-[#d8c08b]">
              وضعیت کل سامانه، فروش و پشتیبانی در یک نگاه.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <HeroMiniStat
                label="اشتراک فعال"
                value={formatPersianNumber(data.kpis.activeSubscriptions)}
              />
              <HeroMiniStat
                label="تیکت باز"
                value={formatPersianNumber(data.kpis.openTickets)}
              />
              <HeroMiniStat
                label="دوره بررسی رو به پایان"
                value={formatPersianNumber(data.kpis.expiringDemos)}
              />
              <HeroMiniStat
                label="کاربر فعال امروز"
                value={formatPersianNumber(data.kpis.usersActiveToday)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/92 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
        <SectionHeader
          eyebrow="اقدام‌های سریع"
          title="کارهای مدیریتی پرتکرار"
          description="دسترسی مستقیم به مسیرهای اصلی مالک سامانه، بدون شلوغ کردن هدر صفحه."
        />
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
          {adminQuickActions.map((action) => (
            <AdminQuickActionCard
              key={action.href}
              title={action.title}
              href={action.href}
              icon={action.icon}
              primary={Boolean(action.primary)}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {data.kpis.monthlyRevenue.available ? (
          <AdminStatCard
            title="درآمد ماه جاری"
            value={formatIRR(data.kpis.monthlyRevenue.value)}
            description="درآمد اشتراک‌ها"
            icon={<TrendingUp size={20} />}
            tone="emerald"
          />
        ) : (
          <AdminStatCard
            title="درآمد ماه جاری"
            value="—"
            description={data.kpis.monthlyRevenue.description}
            icon={<TrendingUp size={20} />}
            tone="navy"
          />
        )}
        <AdminStatCard
          title="اشتراک‌های فعال"
          value={formatPersianNumber(data.kpis.activeSubscriptions)}
          description="پلن‌های فعال"
          icon={<CreditCard size={20} />}
          tone="emerald"
        />
        <AdminStatCard
          title="دوره‌های بررسی نزدیک پایان"
          value={formatPersianNumber(data.kpis.expiringDemos)}
          description="تا ۷ روز آینده"
          icon={<CalendarClock size={20} />}
          tone={data.kpis.expiringDemos > 0 ? "amber" : "emerald"}
        />
        <AdminStatCard
          title="تیکت‌های فوری / باز"
          value={`${formatPersianNumber(data.kpis.urgentTickets)} / ${formatPersianNumber(data.kpis.openTickets)}`}
          description="فوری در برابر کل باز"
          icon={<LifeBuoy size={20} />}
          tone={
            data.kpis.urgentTickets > 0
              ? "rose"
              : data.kpis.openTickets > 0
                ? "amber"
                : "emerald"
          }
        />
        <AdminStatCard
          title="کاربران فعال امروز"
          value={formatPersianNumber(data.kpis.usersActiveToday)}
          description="بر اساس آخرین ورود"
          icon={<UserCheck size={20} />}
          tone="navy"
        />
        <AdminStatCard
          title="تالارهای بدون فعالیت"
          value={formatPersianNumber(data.kpis.inactiveTenants)}
          description="بدون فعالیت مهم در ۷ روز اخیر"
          icon={<AlertTriangle size={20} />}
          tone={data.kpis.inactiveTenants > 0 ? "amber" : "emerald"}
        />
      </section>

      <AdminCard className="border-amber-200/70 bg-amber-50/50">
        <SectionHeader
          title="نیازمند اقدام امروز"
          description="مواردی که برای حفظ فروش، کاهش ریزش و پاسخ‌گویی سریع باید زودتر بررسی شوند."
          href="/admin/subscriptions"
          action="مدیریت پیگیری‌ها"
        />
        {data.needsAttention.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {data.needsAttention.map((item: any) => (
              <Link
                key={item.id}
                href={item.href}
                className="group rounded-3xl border border-white/70 bg-white/85 p-3 shadow-[0_12px_32px_rgba(146,97,20,0.08)] transition hover:-translate-y-0.5 hover:border-[#d8a738]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-black text-[#172033]">
                    {item.title}
                  </p>
                  <StatusChip tone={item.tone}>{item.label}</StatusChip>
                </div>
                <p className="mt-1 text-xs font-bold text-[#6d5f49]">
                  {item.subject}
                </p>
                <p className="mt-2 line-clamp-2 text-xs font-bold leading-6 text-[#7b6a4b]">
                  {item.reason}
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[#8a6a22]">
                  {item.actionLabel}
                  <ArrowLeft
                    size={13}
                    className="transition group-hover:-translate-x-0.5"
                  />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState>فعلاً مورد فوری برای پیگیری وجود ندارد.</EmptyState>
        )}
      </AdminCard>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.25fr]">
        <AdminCard>
          <SectionHeader
            title="وضعیت فروش و اشتراک‌ها"
            description="قیف عملیاتی ثبت‌نام تا تبدیل به اشتراک فعال، بر اساس داده‌های واقعی سامانه."
            href="/admin/subscriptions"
            action="مدیریت اشتراک‌ها"
          />
          <div className="grid gap-2 sm:grid-cols-5">
            {data.businessHealth.funnel.map((step: any, index: number) => (
              <Link
                key={step.label}
                href={step.href}
                className="rounded-3xl border border-[#e8c478]/30 bg-[#fffaf0]/80 p-3 text-center transition hover:border-[#d8a738]"
              >
                <p className="text-[11px] font-black text-[#7b6a4b]">
                  {step.label}
                </p>
                <p className="mt-1 text-2xl font-black text-[#172033]">
                  {formatPersianNumber(step.value)}
                </p>
                {index < data.businessHealth.funnel.length - 1 ? (
                  <p className="mt-1 text-[10px] font-black text-[#b58a25]">
                    مرحله بعد
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <MiniMetric
              title="تالارهای جدید ماه"
              value={formatPersianNumber(
                data.businessHealth.newTenantsThisMonth,
              )}
              tone="navy"
            />
            <MiniMetric
              title="دریافتی ماه جاری"
              value={formatIRR(data.businessHealth.currentMonthReceipts)}
              tone="emerald"
              description="دریافتی tenantها، نه درآمد اشتراک"
            />
            <MiniMetric
              title="مدل درآمد اشتراک"
              value="تعریف نشده"
              tone="amber"
              description="پرداخت اشتراک در schema فعلی رکورد مالی جدا ندارد."
            />
          </div>
        </AdminCard>

        <AdminCard>
          <SectionHeader
            title="دوره‌های بررسی نزدیک به پایان"
            description="تالارهایی که باید قبل از پایان دوره بررسی پیگیری شوند."
            href="/admin/subscriptions?filter=trial-ending"
            action="مشاهده دوره‌های بررسی"
          />
          <div className="space-y-3">
            {data.businessHealth.endingDemos.map((tenant: any) => (
              <CompactRow
                key={tenant.id}
                href={`/admin/tenants/${tenant.id}`}
                title={tenant.hallProfile?.brandName || tenant.name}
                description={`مالک: ${tenant.owner.name || tenant.owner.email} · پایان دوره بررسی: ${formatJalaliDate(tenant.subscription?.currentPeriodEnd)}`}
                meta={`${formatPersianNumber(tenant.remainingDays)} روز`}
                tone="amber"
                actionLabel="مشاهده تالار"
              />
            ))}
            {data.businessHealth.endingDemos.length === 0 ? (
              <EmptyState>دوره بررسی نزدیک به پایان ثبت نشده است.</EmptyState>
            ) : null}
          </div>
        </AdminCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <AdminCard className="xl:col-span-2">
          <SectionHeader
            title="پایش فعالیت تالارها"
            description="فعال‌ترین تالارها، تالارهای بدون فعالیت و onboardingهای ناقص برای پیگیری سریع."
            href="/admin/tenants"
            action="مدیریت تالارها"
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-black text-emerald-800">
                فعال‌ترین تالارها
              </h3>
              <div className="space-y-3">
                {data.tenantActivity.activeTenants.map((tenant: any) => (
                  <CompactRow
                    key={tenant.id}
                    href={`/admin/tenants/${tenant.id}`}
                    title={tenant.name}
                    description={`${tenant.ownerName} · ${formatPersianNumber(tenant.contractCount30)} قرارداد در ۳۰ روز · ${formatIRR(tenant.receipts30)}`}
                    meta={formatMaybeDate(tenant.lastActivityAt)}
                    tone="emerald"
                  />
                ))}
                {data.tenantActivity.activeTenants.length === 0 ? (
                  <EmptyState>
                    فعالیت قابل توجهی در ۳۰ روز اخیر ثبت نشده است.
                  </EmptyState>
                ) : null}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-black text-amber-800">
                تالارهای نیازمند پیگیری
              </h3>
              <div className="space-y-3">
                {data.tenantActivity.inactiveTenants
                  .slice(0, 3)
                  .map((tenant: any) => (
                    <CompactRow
                      key={tenant.id}
                      href={`/admin/tenants/${tenant.id}`}
                      title={tenant.name}
                      description={`${tenant.ownerName} · آخرین فعالیت: ${formatMaybeDate(tenant.lastActivityAt)}`}
                      meta="بدون فعالیت"
                      tone="amber"
                    />
                  ))}
                {data.tenantActivity.zeroContractTenants
                  .slice(0, 2)
                  .map((tenant: any) => (
                    <CompactRow
                      key={`zero-${tenant.id}`}
                      href={`/admin/tenants/${tenant.id}`}
                      title={tenant.name}
                      description={`${tenant.ownerName} · از زمان ثبت‌نام هنوز قراردادی ثبت نشده است.`}
                      meta="بدون قرارداد"
                      tone="rose"
                    />
                  ))}
                {data.tenantActivity.inactiveTenants.length === 0 &&
                data.tenantActivity.zeroContractTenants.length === 0 ? (
                  <EmptyState>
                    تالار پرریسک مهمی برای نمایش وجود ندارد.
                  </EmptyState>
                ) : null}
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <SectionHeader
            title="اطلاعات پایه ناقص"
            description="مواردی که مانع استفاده واقعی تالار از سامانه می‌شود."
          />
          <div className="space-y-3">
            {data.tenantActivity.incompleteSetupTenants.map((tenant: any) => (
              <CompactRow
                key={tenant.id}
                href={`/admin/tenants/${tenant.id}`}
                title={tenant.name}
                description={`نیازمند تکمیل: ${tenant.reasons.slice(0, 4).join("، ")}${tenant.reasons.length > 4 ? " و موارد دیگر" : ""}`}
                meta={`${formatPersianNumber(tenant.reasons.length)} مورد`}
                tone="amber"
                actionLabel="بررسی راه‌اندازی"
              />
            ))}
            {data.tenantActivity.incompleteSetupTenants.length === 0 ? (
              <EmptyState>اطلاعات پایه مهم تالارها تکمیل است.</EmptyState>
            ) : null}
          </div>
        </AdminCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <AdminCard>
          <SectionHeader
            title="عملیات پشتیبانی"
            description="تیکت‌های فوری، باز و وضعیت پاسخ‌گویی پشتیبانی."
            href="/admin/support"
            action="پنل پشتیبانی"
          />
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniMetric
              title="فوری"
              value={formatPersianNumber(data.support.counts.urgent)}
              tone={data.support.counts.urgent > 0 ? "rose" : "emerald"}
            />
            <MiniMetric
              title="باز"
              value={formatPersianNumber(data.support.counts.open)}
              tone={data.support.counts.open > 0 ? "amber" : "emerald"}
            />
            <MiniMetric
              title="در بررسی"
              value={formatPersianNumber(data.support.counts.inReview)}
              tone="amber"
            />
            <MiniMetric
              title="منتظر کاربر"
              value={formatPersianNumber(data.support.counts.waitingForUser)}
              tone="navy"
            />
          </div>
          <div className="space-y-3">
            {(data.support.urgentTickets.length > 0
              ? data.support.urgentTickets
              : data.support.latestOpenTickets
            ).map((ticket: any) => (
              <Link
                key={ticket.id}
                href={`/admin/support/${ticket.id}`}
                className="block rounded-3xl border border-[#e8c478]/28 bg-[#fffaf0]/80 p-3 transition hover:border-[#d8a738]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-[#172033]">
                    {ticket.ticketNumber} · {ticket.title}
                  </p>
                  <div className="flex items-center gap-1">
                    <StatusChip tone={getTicketPriorityTone(ticket.priority)}>
                      {getTicketPriorityLabel(ticket.priority)}
                    </StatusChip>
                    <StatusChip tone={getTicketStatusTone(ticket.status)}>
                      {getTicketStatusLabel(ticket.status)}
                    </StatusChip>
                  </div>
                </div>
                <p className="mt-1 text-xs font-bold text-[#7b6a4b]">
                  {ticket.tenant.hallProfile?.brandName || ticket.tenant.name} ·
                  آخرین پیام: {formatJalaliAuditDateTime(ticket.lastMessageAt)}
                </p>
              </Link>
            ))}
            {data.support.latestOpenTickets.length === 0 ? (
              <EmptyState>سیستم تیکتینگ فعلاً تیکت باز ندارد.</EmptyState>
            ) : null}
          </div>
        </AdminCard>

        <AdminCard>
          <SectionHeader
            title="آخرین فعالیت‌های مهم سامانه"
            description="بر اساس AuditLog و در صورت نبود لاگ، آخرین رخدادهای واقعی سامانه."
            href="/admin/activity"
            action="مشاهده لاگ‌ها"
          />
          <div className="space-y-3">
            {data.recentActivity.map((item: any) => (
              <CompactRow
                key={item.id}
                href={item.href}
                title={item.title}
                description={`${item.tenantName} · ${item.message}`}
                meta={formatJalaliAuditDateTime(item.createdAt)}
                tone={item.tone}
                actionLabel="جزئیات"
              />
            ))}
            {data.recentActivity.length === 0 ? (
              <EmptyState>هنوز فعالیت مهمی برای نمایش ثبت نشده است.</EmptyState>
            ) : null}
          </div>
        </AdminCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminCard>
          <SectionHeader
            title="سلامت سامانه"
            description="وضعیت عملیاتی سرویس‌ها و داده‌های مهم زیرساختی."
            href="/admin/reports"
            action="گزارش سامانه"
          />
          <div className="grid gap-3 lg:grid-cols-2">
            <HealthRow
              title="وضعیت کلی سامانه"
              status={
                data.systemHealth.overall === "STABLE"
                  ? "پایدار"
                  : "نیازمند بررسی"
              }
              tone={
                data.systemHealth.overall === "STABLE" ? "emerald" : "amber"
              }
              description="بر اساس تیکت‌های فوری، دوره‌های بررسی منقضی، خطاهای اعلان و اتصال‌ها."
              icon={<HeartPulse size={17} />}
            />
            <HealthRow
              title="دیتابیس"
              status="پایدار"
              tone="emerald"
              description="خواندن داده‌های داشبورد با موفقیت انجام شد."
              icon={<Database size={17} />}
            />
            <HealthRow
              title="آخرین بکاپ"
              status={data.systemHealth.backup ? "ثبت شده" : "ثبت نشده"}
              tone={data.systemHealth.backup ? "emerald" : "amber"}
              description={
                data.systemHealth.backup
                  ? `${data.systemHealth.backup.tenant.name} · ${formatJalaliAuditDateTime(data.systemHealth.backup.createdAt)}`
                  : "بکاپ زمان‌بندی‌شده هنوز ثبت نشده است."
              }
              icon={<ShieldCheck size={17} />}
            />
            <HealthRow
              title="خطاهای اعلان"
              status={formatPersianNumber(
                data.systemHealth.failedNotificationsCount,
              )}
              tone={
                data.systemHealth.failedNotificationsCount > 0
                  ? "rose"
                  : "emerald"
              }
              description="خطاهای تلگرام/پیامک/اعلان در ۷ روز اخیر."
              icon={<AlertTriangle size={17} />}
            />
            <HealthRow
              title="وضعیت تلگرام"
              status={`${formatPersianNumber(data.systemHealth.telegram.active)} فعال`}
              tone={
                data.systemHealth.telegram.problems > 0 ? "amber" : "emerald"
              }
              description={
                data.systemHealth.telegram.problems > 0
                  ? `${formatPersianNumber(data.systemHealth.telegram.problems)} اتصال دارای خطای اخیر است.`
                  : "اتصال‌های فعال بدون خطای اخیر ثبت‌شده."
              }
              icon={<MessagesSquare size={17} />}
            />
            <HealthRow
              title="وضعیت پیامک"
              status={`${formatPersianNumber(data.systemHealth.sms.active)} فعال`}
              tone={data.systemHealth.sms.problems > 0 ? "amber" : "emerald"}
              description={
                data.systemHealth.sms.problems > 0
                  ? `${formatPersianNumber(data.systemHealth.sms.problems)} اتصال دارای خطای اخیر است.`
                  : "اتصال‌های فعال بدون خطای اخیر ثبت‌شده."
              }
              icon={<Zap size={17} />}
            />
          </div>
        </AdminCard>

        <AdminCard>
          <SectionHeader
            title="عملیات ماه جاری"
            description={`نمای فشرده برای ${formatJalaliMonthYear(data.generatedAt)}`}
          />
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <MiniMetric
              title="قراردادهای جدید"
              value={formatPersianNumber(
                data.systemHealth.monthlyOperations.contracts,
              )}
              tone="navy"
            />
            <MiniMetric
              title="دریافتی‌های ثبت‌شده"
              value={formatPersianNumber(
                data.systemHealth.monthlyOperations.receipts,
              )}
              tone="emerald"
            />
            <MiniMetric
              title="هزینه‌های ثبت‌شده"
              value={formatPersianNumber(
                data.systemHealth.monthlyOperations.expenses,
              )}
              tone="amber"
            />
          </div>
        </AdminCard>
      </section>

      <AdminCard>
        <SectionHeader
          title="دسترسی سریع مدیریتی"
          description="ورود سریع به بخش‌های کلیدی پنل مالک پلتفرم، بدون اضافه کردن چیزی به داشبورد تالارها."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.quickLinks.map((link: any) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-3xl border border-[#e8c478]/30 bg-[#fffaf0]/80 p-4 transition hover:-translate-y-0.5 hover:border-[#d8a738] hover:shadow-[0_18px_42px_rgba(23,32,51,0.08)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#172033] text-[#f0dba9]">
                <ListChecks size={18} />
              </div>
              <p className="mt-3 text-sm font-black text-[#172033]">
                {link.title}
              </p>
              <p className="mt-1 text-xs font-bold leading-6 text-[#7b6a4b]">
                {link.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[#8a6a22]">
                ورود
                <ArrowLeft
                  size={13}
                  className="transition group-hover:-translate-x-0.5"
                />
              </span>
            </Link>
          ))}
        </div>
      </AdminCard>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard
          title="کل تالارها"
          value={formatPersianNumber(data.kpis.totalTenants)}
          description="همه فضاهای کاری"
          icon={<Building2 size={20} />}
        />
        <AdminStatCard
          title="تالارهای فعال"
          value={formatPersianNumber(data.kpis.activeTenants)}
          description="وضعیت فعال"
          icon={<Sparkles size={20} />}
          tone="emerald"
        />
        <AdminStatCard
          title="کاربران ثبت‌نام‌شده"
          value={formatPersianNumber(data.kpis.totalUsers)}
          description={`${formatPersianNumber(data.kpis.newUsersThisMonth)} کاربر جدید ماه`}
          icon={<UsersRound size={20} />}
        />
        <AdminStatCard
          title="قراردادهای کل سامانه"
          value={formatPersianNumber(data.kpis.totalContracts)}
          description="همه tenantها"
          icon={<FileSignature size={20} />}
        />
        <AdminStatCard
          title="دریافتی‌های کل سامانه"
          value={formatIRR(data.kpis.totalReceipts)}
          description="داده tenantها، نه درآمد SaaS"
          icon={<ReceiptText size={20} />}
          tone="emerald"
        />
      </section>
    </div>
  );
}
