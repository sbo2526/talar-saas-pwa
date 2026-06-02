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
  Search,
  Table2,
  Ticket,
  WalletCards,
} from "lucide-react";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminStatCard } from "@/components/admin/stat-card";
import { StatusChip, type AdminChipTone } from "@/components/admin/status-chip";
import { getAdminTenantsPageData, type AdminTenantListItem, type AdminTenantListParams } from "@/lib/admin/tenant-admin-data";
import { getSubscriptionPlanLabel, getSubscriptionStatusLabel, getSubscriptionStatusTone, getTenantStatusLabel, getTenantStatusTone } from "@/lib/admin/admin-labels";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { formatJalaliDate, formatJalaliDateTime, formatJalaliAuditDateTime } from "@/lib/date/jalali";

const smartTabs = [
  { key: "all", label: "همه تالارها", countKey: "all" },
  { key: "attention", label: "نیازمند پیگیری", countKey: "attention" },
  { key: "trial-ending", label: "دوره‌های بررسی نزدیک پایان", countKey: "trialEnding" },
  { key: "incomplete", label: "اطلاعات ناقص", countKey: "incomplete" },
  { key: "inactive", label: "بدون فعالیت", countKey: "inactive" },
  { key: "tickets", label: "تیکت‌دار", countKey: "tickets" },
] as const;

type PageProps = { searchParams?: Promise<AdminTenantListParams> };

type SearchInput = Record<string, string | undefined | null>;

function buildTenantsHref(current: SearchInput, overrides: SearchInput = {}) {
  const search = new URLSearchParams();
  const merged = { ...current, ...overrides };

  Object.entries(merged).forEach(([key, value]) => {
    if (!value || value === "all" || value === "cards" || (key === "page" && value === "1")) return;
    search.set(key, value);
  });

  const query = search.toString();
  return query ? `/admin/tenants?${query}` : "/admin/tenants";
}

function remainingDaysLabel(days: number | null) {
  if (days === null) return "تاریخ پایان ثبت نشده";
  if (days < 0) return `${formatPersianNumber(Math.abs(days))} روز از پایان گذشته`;
  if (days === 0) return "امروز به پایان می‌رسد";
  return `${formatPersianNumber(days)} روز باقی‌مانده`;
}

function lastActivityLabel(date: Date | null) {
  if (!date) return "فعالیتی ثبت نشده";
  return formatJalaliAuditDateTime(date);
}

export default async function AdminTenantsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const data = await getAdminTenantsPageData(params);
  const current = data.currentFilters;
  const cardView = current.view !== "table";

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-[#e8c478]/35 bg-[radial-gradient(circle_at_top_left,rgba(232,196,120,0.24),transparent_30%),linear-gradient(145deg,rgba(23,32,51,0.98),rgba(10,16,27,0.98))] p-5 text-[#fff8ea] shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="inline-flex rounded-full border border-[#e8c478]/25 bg-[#e8c478]/10 px-3 py-1 text-xs font-black text-[#f0dba9]">مرکز کنترل مشتریان سامانه</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">تالارها و فضاهای کاری</h1>
            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-[#d9caa9]">همه تالارهای ثبت‌شده، وضعیت دوره بررسی و اشتراک، میزان استفاده، تیکت‌ها و نیازهای پیگیری را از این بخش مدیریت کنید.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={buildTenantsHref(current, { tab: "attention", page: "1" })} className="rounded-2xl border border-amber-300/35 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-100">فقط نیازمند پیگیری</Link>
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-2xl border border-[#e8c478]/30 bg-white/10 px-4 py-2 text-xs font-black text-[#f0dba9]"><ArrowLeft size={15} /> بازگشت به نمای کلی</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="کل تالارها" value={formatPersianNumber(data.kpis.totalTenants)} description="همه فضاهای کاری ثبت‌شده" icon={<Building2 size={19} />} tone="navy" />
        <AdminStatCard title="تالارهای فعال" value={formatPersianNumber(data.kpis.activeTenants)} description="فعال یا دارای اشتراک فعال" icon={<CheckCircle2 size={19} />} tone="emerald" />
        <AdminStatCard title="دوره‌های بررسی نزدیک پایان" value={formatPersianNumber(data.kpis.expiringTrials)} description="پایان دوره بررسی تا هفت روز آینده" icon={<CalendarClock size={19} />} tone={data.kpis.expiringTrials > 0 ? "amber" : "emerald"} />
        <AdminStatCard title="نیازمند پیگیری" value={formatPersianNumber(data.tabCounts.attention)} description="ریسک، تیکت، بی‌فعالیتی یا نقص setup" icon={<AlertTriangle size={19} />} tone={data.tabCounts.attention > 0 ? "rose" : "emerald"} />
        <AdminStatCard title="اطلاعات ناقص" value={formatPersianNumber(data.kpis.incompleteTenants)} description="تالارهایی که راه‌اندازی پایه کامل نیست" icon={<ListChecks size={19} />} tone={data.kpis.incompleteTenants > 0 ? "amber" : "emerald"} />
        <AdminStatCard title="بدون فعالیت" value={formatPersianNumber(data.kpis.inactiveTenants)} description="بدون فعالیت مهم در هفت روز اخیر" icon={<Clock3 size={19} />} tone={data.kpis.inactiveTenants > 0 ? "amber" : "emerald"} />
        <AdminStatCard title="تیکت‌های باز" value={formatPersianNumber(data.kpis.openTicketsCount)} description="تیکت‌های بسته‌نشده مرتبط با تالارها" icon={<Ticket size={19} />} tone={data.kpis.openTicketsCount > 0 ? "rose" : "emerald"} />
        <AdminStatCard title="مجموع دریافتی‌ها" value={formatIRR(data.kpis.receiptsTotal)} description="جمع دریافتی‌های ثبت‌شده تالارها" icon={<WalletCards size={19} />} tone="navy" />
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
                  href={buildTenantsHref(current, { tab: tab.key, page: "1" })}
                  className={`rounded-full border px-3 py-2 text-xs font-black transition ${active ? "border-[#172033] bg-[#172033] text-[#f0dba9]" : "border-[#e8c478]/45 bg-[#fffaf0] text-[#172033] hover:border-[#c79b3b]"}`}
                >
                  {tab.label} <span className="opacity-75">({formatPersianNumber(count)})</span>
                </Link>
              );
            })}
          </div>
          <div className="flex rounded-2xl border border-[#e8c478]/45 bg-[#fffaf0] p-1 text-xs font-black">
            <Link href={buildTenantsHref(current, { view: "cards" })} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 ${cardView ? "bg-[#172033] text-[#f0dba9]" : "text-[#6d5f49]"}`}><LayoutGrid size={14} /> نمای کارت</Link>
            <Link href={buildTenantsHref(current, { view: "table" })} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 ${!cardView ? "bg-[#172033] text-[#f0dba9]" : "text-[#6d5f49]"}`}><Table2 size={14} /> نمای جدول</Link>
          </div>
        </div>

        <form className="grid gap-3 lg:grid-cols-[1.4fr_11rem_12rem_13rem_auto]">
          <input type="hidden" name="tab" value={current.tab} />
          <input type="hidden" name="view" value={current.view} />
          <label className="relative block">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9a875f]" size={17} />
            <input name="q" defaultValue={params.q ?? ""} placeholder="جست‌وجوی نام تالار، مالک، موبایل یا ایمیل" className="h-12 w-full rounded-2xl border border-[#e8c478]/45 bg-white/85 pr-10 pl-3 text-sm font-bold outline-none focus:border-[#c79b3b]" />
          </label>
          <select name="status" defaultValue={params.status ?? "all"} className="h-12 rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-sm font-bold outline-none">
            <option value="all">همه وضعیت‌ها</option>
            <option value="DEMO">دوره بررسی</option>
            <option value="ACTIVE">فعال</option>
            <option value="SUSPENDED">تعلیق‌شده</option>
            <option value="ARCHIVED">آرشیوشده</option>
          </select>
          <select name="plan" defaultValue={params.plan ?? "all"} className="h-12 rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-sm font-bold outline-none">
            <option value="all">همه پلن‌ها</option>
            <option value="DEMO">دوره بررسی</option>
            <option value="STARTER">شروع</option>
            <option value="PROFESSIONAL">حرفه‌ای</option>
            <option value="ENTERPRISE">سازمانی</option>
          </select>
          <select name="sort" defaultValue={current.sort} className="h-12 rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-sm font-bold outline-none">
            <option value="newest">جدیدترین</option>
            <option value="oldest">قدیمی‌ترین</option>
            <option value="last-activity">آخرین فعالیت</option>
            <option value="trial-ending">پایان دوره بررسی نزدیک‌تر</option>
            <option value="receipts">بیشترین دریافتی</option>
            <option value="contracts">بیشترین قرارداد</option>
            <option value="tickets">بیشترین تیکت باز</option>
            <option value="attention">نیازمند پیگیری</option>
          </select>
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#172033] px-5 text-sm font-black text-[#f0dba9]"><Filter size={16} /> اعمال</button>

          <details className="lg:col-span-5 rounded-2xl border border-[#e8c478]/30 bg-[#fffaf0] p-3">
            <summary className="cursor-pointer text-sm font-black text-[#172033]">فیلترهای پیشرفته</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <select name="activity" defaultValue={params.activity ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">همه فعالیت‌ها</option>
                <option value="active">فعال در ۷ روز اخیر</option>
                <option value="inactive">بدون فعالیت ۷ روز اخیر</option>
              </select>
              <select name="setup" defaultValue={params.setup ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">همه وضعیت‌های تکمیل</option>
                <option value="complete">راه‌اندازی کامل</option>
                <option value="incomplete">راه‌اندازی ناقص</option>
              </select>
              <select name="tickets" defaultValue={params.tickets ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">همه تیکت‌ها</option>
                <option value="open">دارای تیکت باز</option>
                <option value="none">بدون تیکت باز</option>
              </select>
              <select name="contracts" defaultValue={params.contracts ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">همه قراردادها</option>
                <option value="has">دارای قرارداد</option>
                <option value="none">بدون قرارداد</option>
              </select>
              <input name="minReceipts" defaultValue={params.minReceipts ?? ""} placeholder="حداقل دریافتی" className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none" inputMode="numeric" />
              <input name="maxReceipts" defaultValue={params.maxReceipts ?? ""} placeholder="حداکثر دریافتی" className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none" inputMode="numeric" />
            </div>
          </details>
        </form>
      </AdminCard>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-[#6d5f49]">
        <p>نمایش {formatPersianNumber(data.from)} تا {formatPersianNumber(data.to)} از {formatPersianNumber(data.totalCount)} تالار</p>
        <Link href="/admin/tenants" className="rounded-full border border-[#d8c08b]/55 bg-white/70 px-3 py-1.5 font-black text-[#172033]">حذف فیلترها</Link>
      </div>

      {data.tenants.length === 0 ? (
        <AdminCard className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#172033] text-[#f0dba9]"><Building2 size={24} /></div>
          <h2 className="mt-4 text-lg font-black text-[#172033]">هیچ تالاری با این فیلترها پیدا نشد.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-[#7b6a4b]">فیلترها را تغییر دهید یا همه تالارهای ثبت‌شده را دوباره مشاهده کنید.</p>
          <Link href="/admin/tenants" className="mt-4 inline-flex rounded-2xl bg-[#172033] px-5 py-3 text-sm font-black text-[#f0dba9]">حذف فیلترها</Link>
        </AdminCard>
      ) : cardView ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {data.tenants.map((item) => <TenantCard key={item.id} item={item} />)}
        </section>
      ) : (
        <TenantTable tenants={data.tenants} />
      )}

      {data.totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {data.page > 1 ? <Link href={buildTenantsHref(current, { page: String(data.page - 1) })} className="rounded-2xl border border-[#d8c08b]/55 bg-white/70 px-4 py-2 text-sm font-black">قبلی</Link> : null}
          <span className="rounded-2xl border border-[#d8c08b]/55 bg-[#fffaf0] px-4 py-2 text-sm font-black text-[#172033]">صفحه {formatPersianNumber(data.page)} از {formatPersianNumber(data.totalPages)}</span>
          {data.page < data.totalPages ? <Link href={buildTenantsHref(current, { page: String(data.page + 1) })} className="rounded-2xl border border-[#d8c08b]/55 bg-white/70 px-4 py-2 text-sm font-black">بعدی</Link> : null}
        </div>
      ) : null}
    </div>
  );
}

function TenantCard({ item }: { item: AdminTenantListItem }) {
  return (
    <AdminCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#172033] text-[#f0dba9]"><Building2 size={21} /></div>
          <div className="min-w-0">
            <Link href={item.availableActions.detailsHref} className="block truncate text-lg font-black text-[#172033] hover:text-[#9a6a15]">{item.displayName}</Link>
            <p className="mt-1 text-xs font-bold leading-6 text-[#7b6a4b]">مالک: {item.owner.name || item.owner.email} — {item.owner.phone || "موبایل ثبت نشده"}</p>
            <p className="text-xs font-bold text-[#8a795a]">{item.owner.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <StatusChip tone={item.health.tone}>{item.health.label}</StatusChip>
          <StatusChip tone={getTenantStatusTone(item.status)}>{getTenantStatusLabel(item.status)}</StatusChip>
          <StatusChip tone={item.setupCompleteness.tone}>{item.setupCompleteness.label === "کامل" ? "راه‌اندازی کامل" : "اطلاعات ناقص"}</StatusChip>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
          <p className="text-xs font-black text-[#7b6a4b]">وضعیت دوره بررسی و اشتراک</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusChip tone={getSubscriptionStatusTone(item.subscription?.status)}>{getSubscriptionStatusLabel(item.subscription?.status)}</StatusChip>
            <StatusChip tone="navy">پلن {getSubscriptionPlanLabel(item.subscription?.plan)}</StatusChip>
          </div>
          <p className="mt-2 text-xs font-bold leading-6 text-[#6d5f49]">پایان دوره: {item.trialEndsAt ? formatJalaliDate(item.trialEndsAt) : "ثبت نشده"}</p>
          <p className="text-xs font-black text-[#172033]">{remainingDaysLabel(item.remainingTrialDays)}</p>
        </div>
        <div className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
          <p className="text-xs font-black text-[#7b6a4b]">دلیل‌های پیگیری</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.health.reasons.map((reason) => <StatusChip key={reason} tone={reason === "وضعیت پایدار" ? "emerald" : item.health.tone}>{reason}</StatusChip>)}
          </div>
          <p className="mt-2 text-xs font-bold text-[#6d5f49]">تکمیل اطلاعات: {formatPersianNumber(item.setupCompleteness.percent)}٪</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <MiniMetric label="کاربران" value={formatPersianNumber(item.usersCount)} />
        <MiniMetric label="مشتریان" value={formatPersianNumber(item.customersCount)} />
        <MiniMetric label="قراردادها" value={formatPersianNumber(item.contractsCount)} />
        <MiniMetric label="دریافتی‌ها" value={formatIRR(item.receiptsTotal)} />
        <MiniMetric label="تیکت باز" value={formatPersianNumber(item.openTicketsCount)} tone={item.openTicketsCount > 0 ? "rose" : "navy"} />
      </div>

      <div className="grid gap-2 rounded-2xl border border-[#e8c478]/25 bg-white/65 p-3 text-xs font-bold leading-6 text-[#6d5f49] sm:grid-cols-2">
        <span>آخرین ورود مالک: {item.lastOwnerLoginAt ? formatJalaliDateTime(item.lastOwnerLoginAt) : "ثبت نشده"}</span>
        <span>آخرین فعالیت: {lastActivityLabel(item.lastActivityAt)}</span>
        <span>آخرین قرارداد: {item.lastContractAt ? formatJalaliDate(item.lastContractAt) : "ثبت نشده"}</span>
        <span>آخرین دریافت: {item.lastReceiptAt ? formatJalaliDate(item.lastReceiptAt) : "ثبت نشده"}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8c478]/25 pt-3">
        <div className="text-xs font-bold text-[#7b6a4b]">ثبت‌نام: {formatJalaliDate(item.createdAt)}</div>
        <div className="flex flex-wrap gap-2">
          <Link href={item.availableActions.detailsHref} className="inline-flex items-center gap-2 rounded-2xl bg-[#172033] px-4 py-2.5 text-xs font-black text-[#f0dba9]"><Eye size={15} /> مشاهده جزئیات</Link>
          <Link href={item.availableActions.supportHref} className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/55 bg-white/80 px-4 py-2.5 text-xs font-black text-[#172033]"><Headphones size={15} /> تیکت‌ها</Link>
          <Link href={item.availableActions.subscriptionHref} className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/55 bg-white/80 px-4 py-2.5 text-xs font-black text-[#172033]"><BarChart3 size={15} /> دوره بررسی و پلن</Link>
        </div>
      </div>
    </AdminCard>
  );
}

function MiniMetric({ label, value, tone = "navy" }: { label: string; value: string; tone?: "navy" | "rose" }) {
  return (
    <div className={`rounded-2xl border p-3 text-center ${tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-[#e8c478]/28 bg-[#fffaf0] text-[#172033]"}`}>
      <p className="text-sm font-black leading-6">{value}</p>
      <p className="mt-1 text-[11px] font-bold opacity-75">{label}</p>
    </div>
  );
}

function TenantTable({ tenants }: { tenants: AdminTenantListItem[] }) {
  return (
    <AdminCard className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-[1120px] w-full border-collapse text-right text-xs">
          <thead className="bg-[#172033] text-[#f0dba9]">
            <tr>
              {['تالار', 'مالک', 'سلامت', 'پلن / دوره بررسی', 'پایان دوره بررسی', 'آخرین فعالیت', 'قراردادها', 'دریافتی‌ها', 'تیکت‌ها', 'تکمیل اطلاعات', 'عملیات'].map((header) => <th key={header} className="px-3 py-3 font-black">{header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8c478]/25 bg-white/72">
            {tenants.map((item) => (
              <tr key={item.id} className="align-top hover:bg-[#fffaf0]">
                <td className="px-3 py-3">
                  <Link href={item.availableActions.detailsHref} className="font-black text-[#172033] hover:text-[#9a6a15]">{item.displayName}</Link>
                  <p className="mt-1 font-bold text-[#8a795a]">ثبت‌نام: {formatJalaliDate(item.createdAt)}</p>
                </td>
                <td className="px-3 py-3 font-bold text-[#6d5f49]">
                  <p className="font-black text-[#172033]">{item.owner.name || "بدون نام"}</p>
                  <p>{item.owner.phone || "موبایل ثبت نشده"}</p>
                  <p>{item.owner.email}</p>
                </td>
                <td className="px-3 py-3"><StatusChip tone={item.health.tone}>{item.health.label}</StatusChip></td>
                <td className="px-3 py-3">
                  <div className="flex flex-col items-start gap-1.5">
                    <StatusChip tone={getSubscriptionStatusTone(item.subscription?.status)}>{getSubscriptionStatusLabel(item.subscription?.status)}</StatusChip>
                    <StatusChip tone="navy">{getSubscriptionPlanLabel(item.subscription?.plan)}</StatusChip>
                  </div>
                </td>
                <td className="px-3 py-3 font-bold text-[#6d5f49]">
                  <p>{item.trialEndsAt ? formatJalaliDate(item.trialEndsAt) : "ثبت نشده"}</p>
                  <p className="font-black text-[#172033]">{remainingDaysLabel(item.remainingTrialDays)}</p>
                </td>
                <td className="px-3 py-3 font-bold text-[#6d5f49]">{lastActivityLabel(item.lastActivityAt)}</td>
                <td className="px-3 py-3 font-black text-[#172033]">{formatPersianNumber(item.contractsCount)}</td>
                <td className="px-3 py-3 font-black text-[#172033]">{formatIRR(item.receiptsTotal)}</td>
                <td className="px-3 py-3"><StatusChip tone={item.openTicketsCount > 0 ? "rose" : "slate"}>{formatPersianNumber(item.openTicketsCount)}</StatusChip></td>
                <td className="px-3 py-3">
                  <StatusChip tone={item.setupCompleteness.tone as AdminChipTone}>{formatPersianNumber(item.setupCompleteness.percent)}٪</StatusChip>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Link href={item.availableActions.detailsHref} className="rounded-xl bg-[#172033] px-3 py-2 font-black text-[#f0dba9]">جزئیات</Link>
                    <Link href={item.availableActions.supportHref} className="rounded-xl border border-[#d8c08b]/55 bg-white px-3 py-2 font-black text-[#172033]">تیکت‌ها</Link>
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
