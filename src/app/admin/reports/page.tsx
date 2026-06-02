import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  HelpCircle,
  LifeBuoy,
  PieChart,
  ReceiptText,
  Search,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminStatCard } from "@/components/admin/stat-card";
import { StatusChip, type AdminChipTone } from "@/components/admin/status-chip";
import {
  getAdminReportsPageData,
  type AdminReportTopTenant,
  type AdminReportsParams,
  type AdminReportsTone,
} from "@/lib/admin/reports-admin-data";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { formatJalaliAuditDateTime } from "@/lib/date/jalali";

type PageProps = { searchParams?: Promise<AdminReportsParams> };
type SearchInput = Record<string, string | undefined | null>;

const periodOptions = [
  { value: "today", label: "امروز" },
  { value: "week", label: "این هفته" },
  { value: "month", label: "این ماه" },
  { value: "quarter", label: "سه ماه اخیر" },
  { value: "year", label: "امسال" },
  { value: "custom", label: "سفارشی" },
];

const reportTypeOptions = [
  { value: "overview", label: "نمای کلی" },
  { value: "growth", label: "رشد سامانه" },
  { value: "finance", label: "مالی" },
  { value: "subscription", label: "دوره بررسی و اشتراک" },
  { value: "support", label: "پشتیبانی" },
  { value: "activity", label: "فعالیت تالارها" },
];

const hallStatusOptions = [
  { value: "all", label: "همه" },
  { value: "active", label: "فعال" },
  { value: "inactive", label: "غیرفعال" },
  { value: "demo", label: "دوره بررسی فعال" },
  { value: "expired", label: "منقضی‌شده" },
];

const planOptions = [
  { value: "all", label: "همه پلن‌ها" },
  { value: "demo", label: "دوره بررسی" },
  { value: "active", label: "اشتراک فعال" },
  { value: "expired", label: "منقضی‌شده" },
];

const sortOptions = [
  { value: "receipts", label: "بیشترین دریافتی" },
  { value: "contracts", label: "بیشترین قرارداد" },
  { value: "activity", label: "بیشترین فعالیت" },
  { value: "newest", label: "جدیدترین تالار" },
  { value: "follow-up", label: "نیازمند پیگیری" },
  { value: "tickets", label: "بیشترین تیکت" },
];

function buildReportsHref(current: SearchInput, overrides: SearchInput = {}) {
  const search = new URLSearchParams();
  const merged = { ...current, ...overrides };

  Object.entries(merged).forEach(([key, value]) => {
    if (!value || value === "all" || value === "overview" || (key === "period" && value === "month") || (key === "sort" && value === "receipts")) return;
    search.set(key, value);
  });

  const query = search.toString();
  return query ? `/admin/reports?${query}` : "/admin/reports";
}

function toChipTone(tone: AdminReportsTone): AdminChipTone {
  return tone === "slate" ? "slate" : tone;
}

function toStatTone(tone: AdminReportsTone): "navy" | "emerald" | "amber" | "rose" {
  return tone === "slate" ? "navy" : tone;
}

function formatKpiValue(value: number, formattedValue?: string) {
  return formattedValue === "money" ? formatIRR(value) : formatPersianNumber(value);
}

function comparisonText(comparison?: { label: string; tone: AdminReportsTone }) {
  if (!comparison) return null;
  return <span className={comparison.tone === "rose" ? "text-rose-700" : "text-emerald-700"}>{comparison.label}</span>;
}

function formatNullableMoney(value: number | null | undefined) {
  return typeof value === "number" ? formatIRR(value) : "داده کافی ندارد";
}

function formatAverageResponse(minutes: number | null) {
  if (minutes === null) return "داده کافی ندارد";
  if (minutes < 60) return `${formatPersianNumber(minutes)} دقیقه`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  if (hours < 24) return `${formatPersianNumber(hours)} ساعت`;
  return `${formatPersianNumber(Math.round(hours / 24))} روز`;
}

function dateLabel(date: Date | null) {
  return date ? formatJalaliAuditDateTime(date) : "فعالیتی ثبت نشده";
}

function SectionHeader({ icon, title, subtitle, action }: { icon: ReactNode; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#172033] text-[#f0dba9]">{icon}</span>
        <div>
          <h2 className="text-lg font-black text-[#172033]">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs font-bold leading-6 text-[#7b6a4b]">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function MetricTile({ label, value, tone = "navy" }: { label: string; value: string; tone?: AdminReportsTone }) {
  const toneClass = tone === "emerald"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "rose"
        ? "border-rose-200 bg-rose-50 text-rose-800"
        : "border-[#e8c478]/35 bg-[#fffaf0] text-[#172033]";

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="text-[11px] font-black opacity-75">{label}</p>
      <p className="mt-2 text-lg font-black">{value}</p>
    </div>
  );
}

function HorizontalBars({ rows, money = false, emptyText = "داده‌ای برای نمایش وجود ندارد." }: {
  rows: Array<{ label: string; value: number; href?: string }>;
  money?: boolean;
  emptyText?: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (rows.length === 0 || rows.every((row) => row.value === 0)) {
    return <p className="rounded-2xl border border-dashed border-[#e8c478]/45 bg-[#fffaf0] p-4 text-sm font-bold text-[#7b6a4b]">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const body = (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs font-black text-[#172033]">
              <span className="truncate">{row.label}</span>
              <span className="shrink-0">{money ? formatIRR(row.value) : formatPersianNumber(row.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#efe3c4]">
              <div className="h-full rounded-full bg-[#172033]" style={{ width: `${Math.max(6, (row.value / max) * 100)}%` }} />
            </div>
          </div>
        );

        return row.href ? (
          <Link key={row.label} href={row.href} className="block rounded-2xl border border-transparent p-2 transition hover:border-[#e8c478]/45 hover:bg-[#fffaf0]">
            {body}
          </Link>
        ) : (
          <div key={row.label} className="rounded-2xl p-2">{body}</div>
        );
      })}
    </div>
  );
}

function TrendCard({ title, rows, metric, money = false }: {
  title: string;
  rows: Array<{ label: string; tenants: number; contracts: number; receipts: number; users: number }>;
  metric: "tenants" | "contracts" | "receipts" | "users";
  money?: boolean;
}) {
  const max = Math.max(1, ...rows.map((row) => row[metric]));

  return (
    <AdminCard className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-[#172033]">{title}</h3>
        <StatusChip tone="navy">۶ ماه اخیر</StatusChip>
      </div>
      <div className="mt-5 flex h-36 items-end gap-2">
        {rows.map((row) => {
          const value = row[metric];
          return (
            <div key={`${title}-${row.label}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-24 w-full items-end rounded-t-2xl bg-[#f4ead2]">
                <div
                  className="w-full rounded-t-2xl bg-[linear-gradient(180deg,#d8a738,#172033)]"
                  style={{ height: `${value === 0 ? 4 : Math.max(10, (value / max) * 100)}%` }}
                  title={money ? formatIRR(value) : formatPersianNumber(value)}
                />
              </div>
              <span className="w-full truncate text-center text-[10px] font-black text-[#7b6a4b]">{row.label}</span>
            </div>
          );
        })}
      </div>
    </AdminCard>
  );
}

function TenantMiniList({ items, metric, emptyText }: {
  items: AdminReportTopTenant[];
  metric: (item: AdminReportTopTenant) => string;
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="rounded-2xl border border-dashed border-[#e8c478]/45 bg-[#fffaf0] p-4 text-sm font-bold text-[#7b6a4b]">{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link key={item.id} href={item.href} className="flex items-center justify-between gap-3 rounded-2xl border border-[#e8c478]/30 bg-[#fffaf0]/70 p-3 transition hover:border-[#d8a738]">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#172033]">{item.hallName}</p>
            <p className="mt-1 truncate text-[11px] font-bold text-[#7b6a4b]">{item.ownerName}</p>
          </div>
          <span className="shrink-0 text-xs font-black text-[#172033]">{metric(item)}</span>
        </Link>
      ))}
    </div>
  );
}

export default async function AdminReportsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const data = await getAdminReportsPageData(params);
  const currentFilters: SearchInput = {
    period: data.filters.period,
    from: data.filters.fromValue,
    to: data.filters.toValue,
    reportType: data.filters.reportType,
    status: data.filters.status,
    plan: data.filters.plan,
    sort: data.filters.sort,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#e8c478]/35 bg-[radial-gradient(circle_at_top_left,rgba(232,196,120,0.22),transparent_30%),linear-gradient(145deg,rgba(23,32,51,0.98),rgba(9,14,23,0.98))] p-5 text-[#fff8ea] shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className="inline-flex rounded-full border border-[#e8c478]/28 bg-[#e8c478]/10 px-3 py-1 text-xs font-black text-[#f0dba9]">داشبورد تحلیلی مدیریت سامانه</p>
            <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">گزارش‌ها و آمار سامانه</h1>
            <p className="mt-3 text-sm font-bold leading-8 text-[#d9caa9]">
              نمای تحلیلی رشد سامانه، تالارها، کاربران، دوره‌های بررسی، قراردادها، دریافتی‌ها، هزینه‌ها و وضعیت پشتیبانی.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-2xl border border-[#e8c478]/25 bg-white/[0.06] px-3 py-2 text-xs font-black text-[#d9caa9] opacity-80" title={data.exportAvailability.message}>
              <FileSpreadsheet size={16} /> خروجی اکسل
            </button>
            <button disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-2xl border border-[#e8c478]/25 bg-white/[0.06] px-3 py-2 text-xs font-black text-[#d9caa9] opacity-80" title={data.exportAvailability.message}>
              <Download size={16} /> خروجی CSV
            </button>
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-2xl border border-[#e8c478]/25 bg-[#e8c478]/10 px-3 py-2 text-xs font-black text-[#f0dba9] transition hover:bg-[#e8c478]/18">
              <ArrowLeft size={16} /> بازگشت به نمای کلی
            </Link>
          </div>
        </div>
      </section>

      <AdminCard>
        <SectionHeader icon={<Filter size={18} />} title="فیلترهای گزارش" subtitle={`بازه فعال: ${data.filters.rangeLabel}`} />
        <form action="/admin/reports" className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="space-y-1">
            <span className="text-xs font-black text-[#7b6a4b]">بازه زمانی</span>
            <select name="period" defaultValue={data.filters.period} className="input-luxury h-12 w-full rounded-2xl">
              {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-black text-[#7b6a4b]">از تاریخ</span>
            <input name="from" defaultValue={data.filters.fromValue} placeholder="۱۴۰۵-۰۲-۰۱" className="input-luxury h-12 w-full rounded-2xl" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-black text-[#7b6a4b]">تا تاریخ</span>
            <input name="to" defaultValue={data.filters.toValue} placeholder="۱۴۰۵-۰۲-۳۱" className="input-luxury h-12 w-full rounded-2xl" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-black text-[#7b6a4b]">نوع گزارش</span>
            <select name="reportType" defaultValue={data.filters.reportType} className="input-luxury h-12 w-full rounded-2xl">
              {reportTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-black text-[#7b6a4b]">وضعیت تالار</span>
            <select name="status" defaultValue={data.filters.status} className="input-luxury h-12 w-full rounded-2xl">
              {hallStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-black text-[#7b6a4b]">پلن</span>
            <select name="plan" defaultValue={data.filters.plan} className="input-luxury h-12 w-full rounded-2xl">
              {planOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-1 xl:col-span-2">
            <span className="text-xs font-black text-[#7b6a4b]">مرتب‌سازی</span>
            <select name="sort" defaultValue={data.filters.sort} className="input-luxury h-12 w-full rounded-2xl">
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2 xl:col-span-4">
            <button className="btn-luxury-primary h-12 rounded-2xl px-5" type="submit">
              <Search size={16} /> اعمال فیلتر
            </button>
            <Link href="/admin/reports" className="btn-luxury-secondary h-12 rounded-2xl px-5">
              حذف فیلترها
            </Link>
          </div>
        </form>
      </AdminCard>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi, index) => (
          <AdminStatCard
            key={kpi.key}
            title={kpi.title}
            value={formatKpiValue(kpi.value, kpi.formattedValue)}
            description={<>{kpi.helper}{kpi.comparison ? <> · {comparisonText(kpi.comparison)}</> : null}</>}
            icon={index % 4 === 0 ? <Building2 size={20} /> : index % 4 === 1 ? <TrendingUp size={20} /> : index % 4 === 2 ? <ReceiptText size={20} /> : <LifeBuoy size={20} />}
            tone={toStatTone(kpi.tone)}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <TrendCard title="روند ثبت تالارها" rows={data.growthTrends} metric="tenants" />
        <TrendCard title="روند قراردادها" rows={data.growthTrends} metric="contracts" />
        <TrendCard title="روند دریافتی‌ها" rows={data.growthTrends} metric="receipts" money />
        <TrendCard title="روند کاربران جدید" rows={data.growthTrends} metric="users" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminCard>
          <SectionHeader icon={<WalletCards size={18} />} title="تحلیل مالی کل سامانه" subtitle="دریافتی‌های ثبت‌شده در تالارها، هزینه‌ها و سود تقریبی عملیاتی." />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="کل دریافتی‌ها" value={formatIRR(data.financialAnalytics.totalReceipts)} tone="emerald" />
            <MetricTile label="دریافتی این دوره" value={formatIRR(data.financialAnalytics.periodReceipts)} tone="emerald" />
            <MetricTile label="کل هزینه‌ها" value={formatIRR(data.financialAnalytics.totalExpenses)} tone="rose" />
            <MetricTile label="هزینه این دوره" value={formatIRR(data.financialAnalytics.periodExpenses)} tone="rose" />
            <MetricTile label="سود تقریبی" value={formatIRR(data.financialAnalytics.approximateProfit)} tone={data.financialAnalytics.approximateProfit >= 0 ? "emerald" : "rose"} />
            <MetricTile label="میانگین مبلغ قرارداد" value={formatNullableMoney(data.financialAnalytics.averageContractAmount)} tone="navy" />
            <MetricTile label="مانده قابل پیگیری" value={formatIRR(data.financialAnalytics.outstandingTotal)} tone={data.financialAnalytics.outstandingTotal > 0 ? "amber" : "emerald"} />
            <MetricTile label="بیشترین دریافتی از تالار" value={data.financialAnalytics.topReceiptTenant?.hallName ?? "داده کافی ندارد"} tone="navy" />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div>
              <h3 className="mb-3 text-sm font-black text-[#172033]">دریافتی بر اساس ماه</h3>
              <HorizontalBars rows={data.financialAnalytics.monthlyReceipts} money />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-black text-[#172033]">دریافتی بر اساس تالار</h3>
              <HorizontalBars rows={data.financialAnalytics.tenantReceipts} money emptyText="هنوز دریافتی ثبت‌شده‌ای برای رتبه‌بندی تالارها وجود ندارد." />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-black text-[#172033]">هزینه بر اساس دسته‌بندی</h3>
              <HorizontalBars rows={data.financialAnalytics.expenseCategories} money emptyText="هزینه‌ای در این بازه ثبت نشده است." />
            </div>
          </div>
        </AdminCard>

        <AdminCard>
          <SectionHeader icon={<Building2 size={18} />} title="تحلیل فعالیت تالارها" />
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile label="درصد تالارهای فعال" value={`${formatPersianNumber(data.tenantAnalytics.activePercent)}٪`} tone="emerald" />
            <MetricTile label="درصد بدون فعالیت" value={`${formatPersianNumber(data.tenantAnalytics.inactivePercent)}٪`} tone={data.tenantAnalytics.inactivePercent > 0 ? "amber" : "emerald"} />
            <MetricTile label="میانگین قرارداد" value={formatPersianNumber(data.tenantAnalytics.averageContractsPerTenant)} tone="navy" />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-black text-[#172033]">فعال‌ترین تالارها</h3>
              <TenantMiniList items={data.tenantAnalytics.mostActive} metric={(item) => dateLabel(item.lastActivityAt)} emptyText="فعلاً فعالیتی ثبت نشده است." />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-black text-[#172033]">بدون فعالیت</h3>
              <TenantMiniList items={data.tenantAnalytics.inactiveTenants} metric={() => "نیازمند پیگیری"} emptyText="تالار بدون فعالیت در این بازه دیده نشد." />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-black text-[#172033]">بیشترین قرارداد</h3>
              <TenantMiniList items={data.tenantAnalytics.topContracts} metric={(item) => `${formatPersianNumber(item.contractsCount)} قرارداد`} emptyText="هنوز قراردادی ثبت نشده است." />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-black text-[#172033]">اطلاعات ناقص</h3>
              <TenantMiniList items={data.tenantAnalytics.incompleteTenants} metric={() => "راه‌اندازی ناقص"} emptyText="مورد ناقصی در راه‌اندازی دیده نشد." />
            </div>
          </div>
        </AdminCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <AdminCard>
          <SectionHeader icon={<PieChart size={18} />} title="تحلیل دوره بررسی و اشتراک" subtitle="چرخه تبدیل تالارها از ثبت‌نام تا دوره بررسی و اشتراک فعال." action={<StatusChip tone="slate">گزارش درآمد اشتراک پس از ثبت تراکنش‌های فروش نمایش داده می‌شود.</StatusChip>} />
          <div className="grid gap-3 sm:grid-cols-5">
            {data.subscriptionAnalytics.funnel.map((stage, index) => (
              <div key={stage.key} className="relative rounded-2xl border border-[#e8c478]/35 bg-[#fffaf0] p-3">
                <p className="text-[11px] font-black text-[#7b6a4b]">{stage.label}</p>
                <p className="mt-2 text-2xl font-black text-[#172033]">{formatPersianNumber(stage.count)}</p>
                {index < data.subscriptionAnalytics.funnel.length - 1 ? <span className="absolute -left-2 top-1/2 hidden h-4 w-4 -translate-y-1/2 rotate-45 border-b border-l border-[#e8c478]/40 bg-[#fffaf0] sm:block" /> : null}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MetricTile label="دوره‌های بررسی فعال" value={formatPersianNumber(data.subscriptionAnalytics.activeDemos)} tone="amber" />
            <MetricTile label="نیازمند تمدید" value={formatPersianNumber(data.subscriptionAnalytics.needsRenewal)} tone={data.subscriptionAnalytics.needsRenewal > 0 ? "rose" : "emerald"} />
            <MetricTile label="نرخ تبدیل" value={data.subscriptionAnalytics.conversionRate === null ? "داده کافی ندارد" : `${formatPersianNumber(data.subscriptionAnalytics.conversionRate)}٪`} tone="navy" />
          </div>
        </AdminCard>

        <AdminCard>
          <SectionHeader icon={<LifeBuoy size={18} />} title="تحلیل پشتیبانی" subtitle="وضعیت درخواست‌ها، اولویت‌ها و زمان پاسخ‌گویی." />
          <div className="grid gap-3 sm:grid-cols-4">
            <MetricTile label="کل تیکت‌ها" value={formatPersianNumber(data.supportAnalytics.totalTickets)} />
            <MetricTile label="باز" value={formatPersianNumber(data.supportAnalytics.openTickets)} tone={data.supportAnalytics.openTickets > 0 ? "amber" : "emerald"} />
            <MetricTile label="فوری" value={formatPersianNumber(data.supportAnalytics.urgentTickets)} tone={data.supportAnalytics.urgentTickets > 0 ? "rose" : "emerald"} />
            <MetricTile label="بسته‌شده" value={formatPersianNumber(data.supportAnalytics.closedTickets)} tone="emerald" />
            <MetricTile label="منتظر پاسخ پشتیبانی" value={formatPersianNumber(data.supportAnalytics.waitingSupport)} tone={data.supportAnalytics.waitingSupport > 0 ? "rose" : "emerald"} />
            <MetricTile label="منتظر پاسخ کاربر" value={formatPersianNumber(data.supportAnalytics.waitingUser)} tone="amber" />
            <MetricTile label="میانگین زمان پاسخ" value={formatAverageResponse(data.supportAnalytics.averageResponseMinutes)} />
            <MetricTile label="پرتکرارترین موضوع" value={data.supportAnalytics.topCategory ?? "داده کافی ندارد"} />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <HorizontalBars rows={data.supportAnalytics.byStatus.map((item) => ({ label: item.label, value: item.count }))} emptyText="تیکتی برای تحلیل وضعیت وجود ندارد." />
            <HorizontalBars rows={data.supportAnalytics.byPriority.map((item) => ({ label: item.label, value: item.count }))} emptyText="تیکتی برای تحلیل اولویت وجود ندارد." />
            <HorizontalBars rows={data.supportAnalytics.byCategory.map((item) => ({ label: item.label, value: item.count }))} emptyText="تیکتی برای تحلیل موضوع وجود ندارد." />
          </div>
        </AdminCard>
      </section>

      <AdminCard>
        <SectionHeader icon={<BarChart3 size={18} />} title="برترین تالارها بر اساس عملکرد" subtitle="رتبه‌بندی بر اساس فیلترها و مرتب‌سازی انتخاب‌شده." />
        {data.topTenants.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#e8c478]/45 bg-[#fffaf0] p-6 text-center">
            <p className="text-lg font-black text-[#172033]">هنوز داده کافی برای رتبه‌بندی تالارها وجود ندارد.</p>
            <p className="mt-2 text-sm font-bold text-[#7b6a4b]">با ثبت قرارداد، دریافتی یا فعالیت بیشتر، این جدول تکمیل می‌شود.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-[#e8c478]/30 bg-white">
            <div className="hidden lg:block">
              <table className="w-full text-right text-sm">
                <thead className="bg-[#fff7e3] text-xs font-black text-[#7b6a4b]">
                  <tr>
                    <th className="px-4 py-3">تالار</th>
                    <th className="px-4 py-3">مالک</th>
                    <th className="px-4 py-3">وضعیت</th>
                    <th className="px-4 py-3">پلن/دوره بررسی</th>
                    <th className="px-4 py-3">قراردادها</th>
                    <th className="px-4 py-3">مشتریان</th>
                    <th className="px-4 py-3">دریافتی‌ها</th>
                    <th className="px-4 py-3">تیکت‌ها</th>
                    <th className="px-4 py-3">آخرین فعالیت</th>
                    <th className="px-4 py-3">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8c478]/20">
                  {data.topTenants.map((item) => (
                    <tr key={item.id} className="align-top transition hover:bg-[#fffaf0]">
                      <td className="px-4 py-3">
                        <Link href={item.href} className="font-black text-[#172033] hover:text-[#b88724]">{item.hallName}</Link>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-[#6d5f49]">
                        <p>{item.ownerName}</p>
                        <p dir="ltr" className="mt-1 text-left">{item.ownerEmail}</p>
                      </td>
                      <td className="px-4 py-3"><StatusChip tone={toChipTone(item.statusTone)}>{item.statusLabel}</StatusChip></td>
                      <td className="px-4 py-3"><StatusChip tone={toChipTone(item.planTone)}>{item.planLabel}</StatusChip></td>
                      <td className="px-4 py-3 font-black text-[#172033]">{formatPersianNumber(item.contractsCount)}</td>
                      <td className="px-4 py-3 font-black text-[#172033]">{formatPersianNumber(item.customersCount)}</td>
                      <td className="px-4 py-3 font-black text-emerald-700">{formatIRR(item.receiptsTotal)}</td>
                      <td className="px-4 py-3"><StatusChip tone={item.ticketsCount > 0 ? "amber" : "emerald"}>{formatPersianNumber(item.ticketsCount)}</StatusChip></td>
                      <td className="px-4 py-3 text-xs font-bold text-[#6d5f49]">{dateLabel(item.lastActivityAt)}</td>
                      <td className="px-4 py-3">
                        <Link href={item.href} className="inline-flex items-center gap-1 rounded-xl border border-[#e8c478]/45 px-3 py-2 text-xs font-black text-[#172033] hover:bg-[#fff7e3]">
                          <Eye size={14} /> مشاهده
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 lg:hidden">
              {data.topTenants.map((item) => (
                <Link key={item.id} href={item.href} className="rounded-2xl border border-[#e8c478]/30 bg-[#fffaf0] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-[#172033]">{item.hallName}</p>
                      <p className="mt-1 truncate text-xs font-bold text-[#7b6a4b]">{item.ownerName}</p>
                    </div>
                    <StatusChip tone={toChipTone(item.planTone)}>{item.planLabel}</StatusChip>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black text-[#172033]">
                    <span>قرارداد: {formatPersianNumber(item.contractsCount)}</span>
                    <span>مشتری: {formatPersianNumber(item.customersCount)}</span>
                    <span>دریافتی: {formatIRR(item.receiptsTotal)}</span>
                    <span>تیکت: {formatPersianNumber(item.ticketsCount)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </AdminCard>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <AdminCard>
          <SectionHeader icon={<Sparkles size={18} />} title="بینش‌های قابل اقدام" subtitle="بینش‌ها فقط از داده‌های واقعی همین سامانه تولید می‌شوند." />
          {data.actionableInsights.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#e8c478]/45 bg-[#fffaf0] p-4 text-sm font-bold text-[#7b6a4b]">فعلاً بینش فوری برای اقدام مدیریتی وجود ندارد.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.actionableInsights.map((insight) => (
                <div key={insight.key} className="rounded-3xl border border-[#e8c478]/35 bg-[#fffaf0] p-4">
                  <div className="flex items-start gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${insight.tone === "rose" ? "bg-rose-600" : insight.tone === "amber" ? "bg-amber-500" : "bg-emerald-600"} text-white`}>
                      <HelpCircle size={18} />
                    </span>
                    <div>
                      <p className="font-black text-[#172033]">{insight.title}</p>
                      <p className="mt-2 text-xs font-bold leading-6 text-[#7b6a4b]">{insight.description}</p>
                      {insight.href && insight.action ? (
                        <Link href={insight.href} className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[#b88724]">
                          {insight.action} <ArrowLeft size={14} />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>

        <AdminCard>
          <SectionHeader icon={<FileText size={18} />} title="خروجی گزارش" subtitle="خروجی‌ها بعد از آماده‌سازی مسیر امن، با همین فیلترها تولید می‌شوند." />
          <div className="space-y-3">
            <button disabled className="flex w-full cursor-not-allowed items-center justify-between rounded-2xl border border-[#e8c478]/35 bg-[#fffaf0] p-4 text-right opacity-75">
              <span className="font-black text-[#172033]">خروجی اکسل</span>
              <StatusChip tone="slate">غیرفعال</StatusChip>
            </button>
            <button disabled className="flex w-full cursor-not-allowed items-center justify-between rounded-2xl border border-[#e8c478]/35 bg-[#fffaf0] p-4 text-right opacity-75">
              <span className="font-black text-[#172033]">خروجی CSV</span>
              <StatusChip tone="slate">غیرفعال</StatusChip>
            </button>
            <button disabled className="flex w-full cursor-not-allowed items-center justify-between rounded-2xl border border-[#e8c478]/35 bg-[#fffaf0] p-4 text-right opacity-75">
              <span className="font-black text-[#172033]">خروجی PDF</span>
              <StatusChip tone="slate">غیرفعال</StatusChip>
            </button>
          </div>
          <p className="mt-4 rounded-2xl border border-[#e8c478]/35 bg-[#172033]/[0.04] p-3 text-xs font-bold leading-6 text-[#7b6a4b]">{data.exportAvailability.message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={buildReportsHref(currentFilters, { reportType: "finance" })} className="rounded-2xl border border-[#e8c478]/45 px-3 py-2 text-xs font-black text-[#172033] hover:bg-[#fff7e3]">تمرکز مالی</Link>
            <Link href={buildReportsHref(currentFilters, { reportType: "support" })} className="rounded-2xl border border-[#e8c478]/45 px-3 py-2 text-xs font-black text-[#172033] hover:bg-[#fff7e3]">تمرکز پشتیبانی</Link>
            <Link href={buildReportsHref(currentFilters, { status: "inactive", sort: "follow-up" })} className="rounded-2xl border border-[#e8c478]/45 px-3 py-2 text-xs font-black text-[#172033] hover:bg-[#fff7e3]">نیازمند پیگیری</Link>
          </div>
        </AdminCard>
      </section>
    </div>
  );
}
