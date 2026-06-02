import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  Headphones,
  LayoutGrid,
  ListChecks,
  Phone,
  Search,
  Table2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminStatCard } from "@/components/admin/stat-card";
import { StatusChip, type AdminChipTone } from "@/components/admin/status-chip";
import {
  getAdminSubscriptionsPageData,
  type AdminSubscriptionListItem,
  type AdminSubscriptionListParams,
} from "@/lib/admin/admin-subscriptions-data";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { formatJalaliAuditDateTime, formatJalaliDate } from "@/lib/date/jalali";

type PageProps = { searchParams?: Promise<AdminSubscriptionListParams> };
type SearchInput = Record<string, string | undefined | null>;

const smartTabs = [
  { key: "all", label: "همه", countKey: "all" },
  { key: "active-demo", label: "دوره بررسی فعال", countKey: "activeDemo" },
  { key: "ending-soon", label: "نزدیک پایان", countKey: "endingSoon" },
  { key: "expired", label: "منقضی‌شده", countKey: "expired" },
  { key: "renewal", label: "نیازمند تمدید", countKey: "renewal" },
  { key: "active-subscription", label: "اشتراک فعال", countKey: "activeSubscription" },
  { key: "inactive", label: "بدون فعالیت", countKey: "inactive" },
  { key: "converted", label: "تبدیل‌شده", countKey: "converted" },
] as const;

function buildSubscriptionsHref(current: SearchInput, overrides: SearchInput = {}) {
  const search = new URLSearchParams();
  const merged = { ...current, ...overrides };

  Object.entries(merged).forEach(([key, value]) => {
    if (!value || value === "all" || value === "cards" || (key === "page" && value === "1")) return;
    search.set(key, value);
  });

  const query = search.toString();
  return query ? `/admin/subscriptions?${query}` : "/admin/subscriptions";
}

function remainingDaysLabel(days: number | null) {
  if (days === null) return "تاریخ پایان ثبت نشده";
  if (days < 0) return `${formatPersianNumber(Math.abs(days))} روز گذشته`;
  if (days === 0) return "امروز پایان می‌یابد";
  return `${formatPersianNumber(days)} روز باقی‌مانده`;
}

function dateLabel(date: Date | null) {
  return date ? formatJalaliDate(date) : "ثبت نشده";
}

function lastActivityLabel(date: Date | null) {
  return date ? formatJalaliAuditDateTime(date) : "فعالیتی ثبت نشده";
}

function hasAdvancedFilters(params: AdminSubscriptionListParams) {
  return Boolean(
    params.demoStatus
      || params.subscriptionStatus
      || params.remainingDays
      || params.trialStartFrom
      || params.trialStartTo
      || params.trialEndFrom
      || params.trialEndTo
      || params.activity
      || params.contracts
      || params.tickets
      || params.setup
      || params.minReceipts
      || params.maxReceipts,
  );
}

export default async function AdminSubscriptionsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const data = await getAdminSubscriptionsPageData(params);
  const current = data.currentFilters;
  const cardView = current.view !== "table";
  const hasFilters = Object.entries(params).some(([, value]) => Boolean(value) && value !== "all" && value !== "cards" && value !== "follow-up");

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-[#e8c478]/35 bg-[radial-gradient(circle_at_top_left,rgba(232,196,120,0.22),transparent_28%),linear-gradient(145deg,rgba(23,32,51,0.98),rgba(10,16,27,0.98))] p-5 text-[#fff8ea] shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="inline-flex rounded-full border border-[#e8c478]/25 bg-[#e8c478]/10 px-3 py-1 text-xs font-black text-[#f0dba9]">مرکز مدیریت دوره بررسی، تمدید و اشتراک مشتریان</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">اشتراک‌ها و دوره‌های بررسی</h1>
            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-[#d9caa9]">
              وضعیت دوره بررسی، پلن، تمدید، پایان دوره و نیازهای پیگیری تالارهای ثبت‌شده را از این بخش مدیریت کنید.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={buildSubscriptionsHref(current, { tab: "ending-soon", page: "1" })} className="rounded-2xl border border-amber-300/35 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-100">دوره‌های بررسی نزدیک پایان</Link>
            <Link href={buildSubscriptionsHref(current, { tab: "renewal", page: "1" })} className="rounded-2xl border border-rose-300/35 bg-rose-300/10 px-4 py-2 text-xs font-black text-rose-100">نیازمند تمدید</Link>
            <Link href="/admin/tenants" className="rounded-2xl border border-[#e8c478]/30 bg-white/10 px-4 py-2 text-xs font-black text-[#f0dba9]">مشاهده تالارها</Link>
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-2xl border border-[#e8c478]/30 bg-white/10 px-4 py-2 text-xs font-black text-[#f0dba9]"><ArrowLeft size={15} /> بازگشت به نمای کلی</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="دوره‌های بررسی فعال" value={formatPersianNumber(data.kpis.activeDemos)} description="تالارهایی که هنوز در دوره دوره بررسی هستند" icon={<Clock3 size={19} />} tone="amber" />
        <AdminStatCard title="دوره‌های بررسی نزدیک پایان" value={formatPersianNumber(data.kpis.demosEndingSoon)} description="پایان دوره بررسی تا هفت روز آینده" icon={<CalendarClock size={19} />} tone={data.kpis.demosEndingSoon > 0 ? "amber" : "emerald"} />
        <AdminStatCard title="دوره‌های بررسی منقضی‌شده" value={formatPersianNumber(data.kpis.expiredDemos)} description="نیازمند تماس برای خرید یا تمدید دوره بررسی" icon={<AlertTriangle size={19} />} tone={data.kpis.expiredDemos > 0 ? "rose" : "emerald"} />
        <AdminStatCard title="نیازمند تمدید" value={formatPersianNumber(data.kpis.needsRenewal)} description="دوره بررسی یا اشتراکی که پیگیری فروش می‌خواهد" icon={<Phone size={19} />} tone={data.kpis.needsRenewal > 0 ? "rose" : "emerald"} />
        <AdminStatCard title="اشتراک‌های فعال" value={formatPersianNumber(data.kpis.activeSubscriptions)} description="مشتریان دارای اشتراک فعال" icon={<CheckCircle2 size={19} />} tone="emerald" />
        <AdminStatCard title="اشتراک‌های منقضی‌شده" value={formatPersianNumber(data.kpis.expiredSubscriptions)} description="اشتراک لغوشده یا پایان‌یافته" icon={<AlertTriangle size={19} />} tone={data.kpis.expiredSubscriptions > 0 ? "rose" : "emerald"} />
        <AdminStatCard title="تبدیل‌شده به اشتراک" value={formatPersianNumber(data.kpis.convertedSubscriptions)} description="دوره‌های بررسیی که به پلن فعال رسیده‌اند" icon={<TrendingUp size={19} />} tone="emerald" />
        <AdminStatCard title="تمدیدهای این هفته" value={formatPersianNumber(data.kpis.renewalsThisWeek)} description="اشتراک‌هایی که تا هفت روز آینده پایان می‌یابند" icon={<CalendarClock size={19} />} tone={data.kpis.renewalsThisWeek > 0 ? "amber" : "emerald"} />
        <AdminStatCard title="میانگین مانده دوره بررسی" value={data.kpis.averageDemoRemainingDays === null ? "ثبت نشده" : `${formatPersianNumber(data.kpis.averageDemoRemainingDays)} روز`} description="میانگین روزهای باقی‌مانده دوره‌های بررسی فعال" icon={<BarChart3 size={19} />} tone="navy" />
        <AdminStatCard title="درآمد اشتراک" value="غیرفعال" description="ماژول پرداخت اشتراک هنوز فعال نشده است" icon={<WalletCards size={19} />} tone="navy" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <AdminCard className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#172033]">نیازمند پیگیری فروش</h2>
              <p className="mt-1 text-xs font-bold text-[#7b6a4b]">اولویت تماس امروز بر اساس پایان دوره، بی‌فعالیتی، آمادگی خرید و تیکت‌های باز.</p>
            </div>
            <Link href={buildSubscriptionsHref(current, { tab: "renewal", page: "1" })} className="rounded-2xl border border-[#d8c08b]/55 bg-white/80 px-4 py-2 text-xs font-black text-[#172033]">مشاهده همه</Link>
          </div>
          {data.needsFollowUp.length > 0 ? (
            <div className="grid gap-3">
              {data.needsFollowUp.map((item) => (
                <div key={item.tenantId} className="grid gap-3 rounded-3xl border border-[#e8c478]/30 bg-[#fffaf0] p-3 lg:grid-cols-[1fr_13rem_9rem] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={item.availableActions.detailsHref} className="truncate text-sm font-black text-[#172033] hover:text-[#9a6a15]">{item.hallName}</Link>
                      <StatusChip tone={item.salesHealth.tone as AdminChipTone}>{item.salesHealth.label}</StatusChip>
                      <StatusChip tone={item.statusTone as AdminChipTone}>{item.statusLabel}</StatusChip>
                    </div>
                    <p className="mt-1 text-xs font-bold leading-6 text-[#7b6a4b]">{item.ownerName} · {item.ownerMobile || "موبایل ثبت نشده"} · {remainingDaysLabel(item.remainingDays)}</p>
                    <p className="text-xs font-bold leading-6 text-[#6d5f49]">قراردادها: {formatPersianNumber(item.contractsCount)} · آخرین فعالیت: {lastActivityLabel(item.lastActivityAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.salesHealth.reasons.slice(0, 3).map((reason) => (
                      <StatusChip key={reason} tone={item.salesHealth.tone as AdminChipTone}>{reason}</StatusChip>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                    <Link href={item.availableActions.detailsHref} className="rounded-2xl bg-[#172033] px-3 py-2 text-xs font-black text-[#f0dba9]">مشاهده تالار</Link>
                    <Link href={`/admin/subscriptions/${item.tenantId}/activate`} className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800"><WalletCards size={14} /> فعال‌سازی پلن</Link>
                    {item.availableActions.supportHref ? <Link href={item.availableActions.supportHref} className="rounded-2xl border border-[#d8c08b]/55 bg-white px-3 py-2 text-xs font-black text-[#172033]">تیکت‌ها</Link> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center text-sm font-black text-emerald-800">فعلاً مورد فوری برای پیگیری فروش وجود ندارد.</div>
          )}
        </AdminCard>

        <AdminCard className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-[#172033]">مسیر تبدیل دوره بررسی به اشتراک</h2>
            <p className="mt-1 text-xs font-bold text-[#7b6a4b]">نمای فشرده قیف فروش با شمارش واقعی.</p>
          </div>
          <div className="grid gap-2">
            {data.funnel.map((stage, index) => (
              <div key={stage.key} className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#172033] text-xs font-black text-[#f0dba9]">{formatPersianNumber(index + 1)}</div>
                <div className="min-w-0 flex-1 rounded-2xl border border-[#e8c478]/30 bg-[#fffaf0] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-[#172033]">{stage.label}</span>
                    <span className="text-sm font-black text-[#9a6a15]">{formatPersianNumber(stage.count)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {data.conversionRate !== null ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-black leading-6 text-emerald-800">نرخ تبدیل دوره بررسی به اشتراک: {formatPersianNumber(data.conversionRate)}٪</div>
          ) : null}
          <div className="rounded-3xl border border-[#e8c478]/35 bg-white/70 p-3 text-xs font-bold leading-6 text-[#6d5f49]">
            ماژول پرداخت اشتراک هنوز فعال نشده است؛ بنابراین درآمد اشتراک در این صفحه نمایش داده نمی‌شود.
          </div>
        </AdminCard>
      </section>

      <AdminCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {smartTabs.map((tab) => {
              const active = current.tab === tab.key;
              const count = data.tabCounts[tab.countKey];
              return (
                <Link
                  key={tab.key}
                  href={buildSubscriptionsHref(current, { tab: tab.key, page: "1" })}
                  className={`rounded-full border px-3 py-2 text-xs font-black transition ${active ? "border-[#172033] bg-[#172033] text-[#f0dba9]" : "border-[#e8c478]/45 bg-[#fffaf0] text-[#172033] hover:border-[#c79b3b]"}`}
                >
                  {tab.label} <span className="opacity-75">({formatPersianNumber(count)})</span>
                </Link>
              );
            })}
          </div>
          <div className="flex rounded-2xl border border-[#e8c478]/45 bg-[#fffaf0] p-1 text-xs font-black">
            <Link href={buildSubscriptionsHref(current, { view: "cards" })} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 ${cardView ? "bg-[#172033] text-[#f0dba9]" : "text-[#6d5f49]"}`}><LayoutGrid size={14} /> نمای کارت</Link>
            <Link href={buildSubscriptionsHref(current, { view: "table" })} className={`hidden items-center gap-1 rounded-xl px-3 py-2 md:inline-flex ${!cardView ? "bg-[#172033] text-[#f0dba9]" : "text-[#6d5f49]"}`}><Table2 size={14} /> نمای جدول</Link>
          </div>
        </div>

        <form className="grid gap-3 lg:grid-cols-[1.4fr_12rem_12rem_13rem_auto_auto]">
          <input type="hidden" name="tab" value={current.tab} />
          <input type="hidden" name="view" value={current.view} />
          <label className="relative block">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9a875f]" size={17} />
            <input name="q" defaultValue={params.q ?? ""} placeholder="جست‌وجوی تالار، مالک، موبایل یا ایمیل" className="h-12 w-full rounded-2xl border border-[#e8c478]/45 bg-white/85 pr-10 pl-3 text-sm font-bold outline-none focus:border-[#c79b3b]" />
          </label>
          <select name="status" defaultValue={params.status ?? "all"} className="h-12 rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-sm font-bold outline-none">
            <option value="all">همه وضعیت‌ها</option>
            {data.filterOptions.statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <select name="plan" defaultValue={params.plan ?? "all"} className="h-12 rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-sm font-bold outline-none">
            <option value="all">همه پلن‌ها</option>
            {data.filterOptions.plans.map((plan) => <option key={plan.value} value={plan.value}>{plan.label}</option>)}
          </select>
          <select name="sort" defaultValue={current.sort} className="h-12 rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-sm font-bold outline-none">
            <option value="follow-up">نیازمند پیگیری</option>
            <option value="trial-ending">نزدیک‌ترین پایان دوره بررسی</option>
            <option value="newest">جدیدترین</option>
            <option value="oldest">قدیمی‌ترین</option>
            <option value="most-activity">بیشترین فعالیت</option>
            <option value="least-activity">کمترین فعالیت</option>
            <option value="contracts">بیشترین قرارداد</option>
            <option value="receipts">بیشترین دریافتی</option>
          </select>
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#172033] px-5 text-sm font-black text-[#f0dba9]"><Filter size={16} /> اعمال</button>
          <Link href="/admin/subscriptions" className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8c08b]/55 bg-white/80 px-4 text-sm font-black text-[#172033]">حذف فیلترها</Link>

          <details open={hasAdvancedFilters(params)} className="rounded-2xl border border-[#e8c478]/30 bg-[#fffaf0] p-3 lg:col-span-6">
            <summary className="cursor-pointer text-sm font-black text-[#172033]">فیلترهای پیشرفته</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <select name="demoStatus" defaultValue={params.demoStatus ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">وضعیت دوره بررسی</option>
                <option value="active">دوره بررسی فعال</option>
                <option value="ending">دوره بررسی رو به پایان</option>
                <option value="expired">دوره بررسی منقضی‌شده</option>
              </select>
              <select name="subscriptionStatus" defaultValue={params.subscriptionStatus ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">وضعیت اشتراک</option>
                <option value="active">اشتراک فعال</option>
                <option value="ending">اشتراک رو به پایان</option>
                <option value="expired">اشتراک منقضی‌شده</option>
              </select>
              <select name="remainingDays" defaultValue={params.remainingDays ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">روزهای باقی‌مانده</option>
                <option value="0-3">۰ تا ۳ روز</option>
                <option value="4-7">۴ تا ۷ روز</option>
                <option value="expired">گذشته از پایان</option>
                <option value="unknown">بدون تاریخ پایان</option>
              </select>
              <select name="activity" defaultValue={params.activity ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">آخرین فعالیت</option>
                <option value="active-7">فعال در ۷ روز اخیر</option>
                <option value="inactive-7">بی‌فعالیت ۷ روزه</option>
                <option value="inactive-14">بی‌فعالیت ۱۴ روزه</option>
                <option value="none">بدون فعالیت ثبت‌شده</option>
              </select>
              <select name="contracts" defaultValue={params.contracts ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">وضعیت قرارداد</option>
                <option value="has">دارای قرارداد</option>
                <option value="none">بدون قرارداد</option>
              </select>
              <select name="tickets" defaultValue={params.tickets ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">وضعیت تیکت</option>
                <option value="open">دارای تیکت باز</option>
                <option value="none">بدون تیکت باز</option>
              </select>
              <select name="setup" defaultValue={params.setup ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">تکمیل اطلاعات تالار</option>
                <option value="complete">کامل</option>
                <option value="incomplete">ناقص</option>
              </select>
              <input name="trialStartFrom" defaultValue={params.trialStartFrom ?? ""} placeholder="شروع دوره بررسی از ۱۴۰۵-۰۲-۰۱" className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none" />
              <input name="trialStartTo" defaultValue={params.trialStartTo ?? ""} placeholder="شروع دوره بررسی تا ۱۴۰۵-۰۲-۳۱" className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none" />
              <input name="trialEndFrom" defaultValue={params.trialEndFrom ?? ""} placeholder="پایان دوره بررسی از ۱۴۰۵-۰۲-۰۱" className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none" />
              <input name="trialEndTo" defaultValue={params.trialEndTo ?? ""} placeholder="پایان دوره بررسی تا ۱۴۰۵-۰۲-۳۱" className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none" />
              <input name="minReceipts" defaultValue={params.minReceipts ?? ""} placeholder="حداقل دریافتی تالار" className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none" inputMode="numeric" />
              <input name="maxReceipts" defaultValue={params.maxReceipts ?? ""} placeholder="حداکثر دریافتی تالار" className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none" inputMode="numeric" />
            </div>
          </details>
        </form>
      </AdminCard>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-[#6d5f49]">
        <p>نمایش {formatPersianNumber(data.from)} تا {formatPersianNumber(data.to)} از {formatPersianNumber(data.totalCount)} مورد</p>
        <div className="flex flex-wrap gap-2">
          <StatusChip tone="navy">نمای فعلی: {cardView ? "کارت" : "جدول"}</StatusChip>
          <StatusChip tone={data.kpis.subscriptionRevenueAvailable ? "emerald" : "slate"}>{data.kpis.subscriptionRevenueAvailable ? "درآمد اشتراک فعال" : "درآمد اشتراک غیرفعال"}</StatusChip>
        </div>
      </div>

      {data.subscriptions.length === 0 ? (
        <AdminCard className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#172033] text-[#f0dba9]"><Building2 size={24} /></div>
          <h2 className="mt-4 text-lg font-black text-[#172033]">{hasFilters ? "هیچ موردی با این فیلترها پیدا نشد." : "هنوز دوره بررسی یا اشتراکی ثبت نشده است."}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-[#7b6a4b]">
            {hasFilters ? "فیلترها را تغییر دهید یا همه تالارهای ثبت‌شده را دوباره مشاهده کنید." : "پس از ثبت‌نام تالارها، وضعیت دوره بررسی و اشتراک آن‌ها در این بخش نمایش داده می‌شود."}
          </p>
          <Link href="/admin/subscriptions" className="mt-4 inline-flex rounded-2xl bg-[#172033] px-5 py-3 text-sm font-black text-[#f0dba9]">حذف فیلترها</Link>
        </AdminCard>
      ) : cardView ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {data.subscriptions.map((item) => <SubscriptionCard key={item.tenantId} item={item} />)}
        </section>
      ) : (
        <SubscriptionTable items={data.subscriptions} />
      )}

      {data.totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {data.page > 1 ? <Link href={buildSubscriptionsHref(current, { page: String(data.page - 1) })} className="rounded-2xl border border-[#d8c08b]/55 bg-white/70 px-4 py-2 text-sm font-black">قبلی</Link> : null}
          <span className="rounded-2xl border border-[#d8c08b]/55 bg-[#fffaf0] px-4 py-2 text-sm font-black text-[#172033]">صفحه {formatPersianNumber(data.page)} از {formatPersianNumber(data.totalPages)}</span>
          {data.page < data.totalPages ? <Link href={buildSubscriptionsHref(current, { page: String(data.page + 1) })} className="rounded-2xl border border-[#d8c08b]/55 bg-white/70 px-4 py-2 text-sm font-black">بعدی</Link> : null}
        </div>
      ) : null}
    </div>
  );
}

function SubscriptionCard({ item }: { item: AdminSubscriptionListItem }) {
  return (
    <AdminCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#172033] text-[#f0dba9]"><Building2 size={21} /></div>
          <div className="min-w-0">
            <Link href={item.availableActions.detailsHref} className="block truncate text-lg font-black text-[#172033] hover:text-[#9a6a15]">{item.hallName}</Link>
            <p className="mt-1 text-xs font-bold leading-6 text-[#7b6a4b]">{item.ownerName} · {item.ownerMobile || "موبایل ثبت نشده"}</p>
            <p className="text-xs font-bold text-[#8a795a]">{item.ownerEmail}</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <StatusChip tone={item.salesHealth.tone as AdminChipTone}>{item.salesHealth.label}</StatusChip>
          <StatusChip tone={item.statusTone as AdminChipTone}>{item.statusLabel}</StatusChip>
          <StatusChip tone="navy">پلن {item.planName}</StatusChip>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
          <p className="text-xs font-black text-[#7b6a4b]">وضعیت دوره</p>
          <div className="mt-2 grid gap-1 text-xs font-bold leading-6 text-[#6d5f49]">
            <span>شروع دوره: {dateLabel(item.periodStartsAt)}</span>
            <span>پایان دوره: {dateLabel(item.periodEndsAt)}</span>
            <span className="font-black text-[#172033]">{remainingDaysLabel(item.remainingDays)}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
          <p className="text-xs font-black text-[#7b6a4b]">نیاز فروش</p>
          <p className="mt-2 text-xs font-black text-[#172033]">نیازمند پیگیری: {item.salesHealth.label === "سالم" || item.salesHealth.label === "تبدیل‌شده" ? "خیر" : "بله"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.salesHealth.reasons.map((reason) => <StatusChip key={reason} tone={item.salesHealth.tone as AdminChipTone}>{reason}</StatusChip>)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <MiniMetric label="قراردادها" value={formatPersianNumber(item.contractsCount)} />
        <MiniMetric label="مشتریان" value={formatPersianNumber(item.customersCount)} />
        <MiniMetric label="دریافتی‌ها" value={formatIRR(item.receiptsTotal)} />
        <MiniMetric label="تیکت باز" value={formatPersianNumber(item.openTicketsCount)} tone={item.openTicketsCount > 0 ? "rose" : "navy"} />
        <MiniMetric label="آخرین فعالیت" value={lastActivityLabel(item.lastActivityAt)} />
      </div>

      <div className="grid gap-2 rounded-2xl border border-[#e8c478]/25 bg-white/65 p-3 text-xs font-bold leading-6 text-[#6d5f49] sm:grid-cols-3">
        <span>اطلاعات تالار: {item.setupCompleteness.hasHallProfile ? "کامل" : "ناقص"}</span>
        <span>خدمات و منو: {item.setupCompleteness.hasCatalog ? "تعریف شده" : "تعریف نشده"}</span>
        <span>لوگوی چاپ قرارداد: {item.setupCompleteness.hasLogo ? "ثبت شده" : "ثبت نشده"}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8c478]/25 pt-3">
        <div className="text-xs font-bold text-[#7b6a4b]">ثبت‌نام: {formatJalaliDate(item.createdAt)}</div>
        <div className="flex flex-wrap gap-2">
          <Link href={item.availableActions.detailsHref} className="inline-flex items-center gap-2 rounded-2xl bg-[#172033] px-4 py-2.5 text-xs font-black text-[#f0dba9]"><Eye size={15} /> مشاهده تالار</Link>
          <Link href={`/admin/subscriptions/${item.tenantId}/activate`} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-800"><WalletCards size={15} /> ارتقا/فعال‌سازی</Link>
          {item.availableActions.supportHref ? <Link href={item.availableActions.supportHref} className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/55 bg-white/80 px-4 py-2.5 text-xs font-black text-[#172033]"><Headphones size={15} /> مشاهده تیکت‌ها</Link> : null}
          <Link href={item.availableActions.manageHref} className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/55 bg-white/80 px-4 py-2.5 text-xs font-black text-[#172033]"><ListChecks size={15} /> مدیریت از جزئیات تالار</Link>
        </div>
      </div>
    </AdminCard>
  );
}

function MiniMetric({ label, value, tone = "navy" }: { label: string; value: string; tone?: "navy" | "rose" }) {
  return (
    <div className={`rounded-2xl border p-3 text-center ${tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-[#e8c478]/28 bg-[#fffaf0] text-[#172033]"}`}>
      <p className="break-words text-sm font-black leading-6">{value}</p>
      <p className="mt-1 text-[11px] font-bold opacity-75">{label}</p>
    </div>
  );
}

function SubscriptionTable({ items }: { items: AdminSubscriptionListItem[] }) {
  return (
    <AdminCard className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-right text-xs">
          <thead className="bg-[#172033] text-[#f0dba9]">
            <tr>
              {["تالار", "مالک", "پلن", "وضعیت", "شروع دوره", "پایان دوره", "روزهای باقی‌مانده", "آخرین فعالیت", "قراردادها", "دریافتی‌ها", "سلامت فروش", "عملیات"].map((header) => (
                <th key={header} className="px-3 py-3 font-black">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8c478]/25 bg-white/72">
            {items.map((item) => (
              <tr key={item.tenantId} className="align-top">
                <td className="px-3 py-3">
                  <Link href={item.availableActions.detailsHref} className="font-black text-[#172033] hover:text-[#9a6a15]">{item.hallName}</Link>
                  <p className="mt-1 text-[11px] font-bold text-[#7b6a4b]">ثبت‌نام: {formatJalaliDate(item.createdAt)}</p>
                </td>
                <td className="px-3 py-3 font-bold leading-6 text-[#6d5f49]">
                  <p className="font-black text-[#172033]">{item.ownerName}</p>
                  <p>{item.ownerMobile || "موبایل ثبت نشده"}</p>
                  <p>{item.ownerEmail}</p>
                </td>
                <td className="px-3 py-3"><StatusChip tone="navy">{item.planName}</StatusChip></td>
                <td className="px-3 py-3"><StatusChip tone={item.statusTone as AdminChipTone}>{item.statusLabel}</StatusChip></td>
                <td className="px-3 py-3 font-bold text-[#6d5f49]">{dateLabel(item.periodStartsAt)}</td>
                <td className="px-3 py-3 font-bold text-[#6d5f49]">{dateLabel(item.periodEndsAt)}</td>
                <td className="px-3 py-3 font-black text-[#172033]">{remainingDaysLabel(item.remainingDays)}</td>
                <td className="px-3 py-3 font-bold text-[#6d5f49]">{lastActivityLabel(item.lastActivityAt)}</td>
                <td className="px-3 py-3 font-black text-[#172033]">{formatPersianNumber(item.contractsCount)}</td>
                <td className="px-3 py-3 font-black text-[#172033]">{formatIRR(item.receiptsTotal)}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <StatusChip tone={item.salesHealth.tone as AdminChipTone}>{item.salesHealth.label}</StatusChip>
                    {item.salesHealth.reasons.slice(0, 2).map((reason) => <StatusChip key={reason} tone={item.salesHealth.tone as AdminChipTone}>{reason}</StatusChip>)}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={item.availableActions.detailsHref} className="rounded-2xl bg-[#172033] px-3 py-2 font-black text-[#f0dba9]">مشاهده</Link>
                    <Link href={`/admin/subscriptions/${item.tenantId}/activate`} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-black text-emerald-800">فعال‌سازی</Link>
                    {item.availableActions.supportHref ? <Link href={item.availableActions.supportHref} className="rounded-2xl border border-[#d8c08b]/55 bg-white px-3 py-2 font-black text-[#172033]">تیکت‌ها</Link> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminCard>
  );
}
