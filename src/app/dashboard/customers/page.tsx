import type { ReactNode } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Eye,
  FileSignature,
  Filter,
  MoreHorizontal,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { ConfirmSubmitButton } from "@/components/dashboard/confirm-submit-button";
import { requireTenantMember } from "@/lib/auth/session";
import {
  getCustomersPageData,
  sortLabels,
  type CustomerCardData,
  type CustomerContractFilter,
  type CustomerInfoFilter,
  type CustomerPaymentFilter,
  type CustomerStatusFilter,
  type CustomersPageSearchParams,
} from "@/lib/customers/customer-page-data";
import { paymentStatusLabels } from "@/lib/contracts/display";
import { formatJalaliDate, formatJalaliTime, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { deleteCustomerAction } from "@/lib/actions/customer-actions";

type CustomersPageProps = {
  searchParams: Promise<CustomersPageSearchParams & {
    created?: string;
    updated?: string;
    statusUpdated?: string;
    deleted?: string;
    customerError?: string;
  }>;
};

const customerStatusLabels: Record<CustomerStatusFilter, string> = {
  all: "همه مشتریان",
  active: "فعال",
  inactive: "غیرفعال",
};

const paymentFilterLabels: Record<CustomerPaymentFilter, string> = {
  all: "همه وضعیت‌ها",
  settled: "تسویه‌شده",
  outstanding: "دارای مانده",
  unpaid: "بدون دریافت",
};

const contractFilterLabels: Record<CustomerContractFilter, string> = {
  all: "همه پرونده‌ها",
  none: "بدون قرارداد",
  has: "دارای قرارداد",
  active: "دارای قرارداد فعال",
  upcoming: "دارای مراسم پیش‌رو",
};

const infoFilterLabels: Record<CustomerInfoFilter, string> = {
  all: "همه اطلاعات",
  incomplete: "اطلاعات ناقص",
  complete: "اطلاعات کامل",
};

function getCustomerPageErrorMessage(error: string) {
  if (error === "has-contracts") {
    return "این مشتری دارای قرارداد ثبت‌شده است و امکان حذف آن وجود ندارد.";
  }

  if (error === "not-found") {
    return "این رکورد پیدا نشد.";
  }

  return "درخواست مشتری معتبر نبود یا دسترسی شما مجاز نیست.";
}

function buildCustomersHref(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== "all") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `/dashboard/customers?${query}` : "/dashboard/customers";
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const membership = await requireTenantMember();
  const params = await searchParams;
  const data = await getCustomersPageData(membership.tenantId, params);

  return (
    <section className="space-y-5 sm:space-y-6">
      <PageHeader />

      {params.created ? <Notice tone="success">مشتری با موفقیت ثبت شد.</Notice> : null}
      {params.updated ? <Notice tone="success">اطلاعات مشتری ذخیره شد.</Notice> : null}
      {params.statusUpdated ? <Notice tone="success">وضعیت مشتری به‌روزرسانی شد.</Notice> : null}
      {params.deleted ? <Notice tone="success">مشتری با موفقیت حذف شد.</Notice> : null}
      {params.customerError ? <Notice tone="danger">{getCustomerPageErrorMessage(params.customerError)}</Notice> : null}

      <CustomerKpis data={data} />
      <FollowUpStrip data={data} />
      <CustomerFilters data={data} />

      <section className="space-y-3">
        <ListToolbar data={data} />
        {data.customers.length > 0 ? (
          <>
            <div className={data.filters.view === "compact" ? "grid gap-2.5" : "grid gap-3"}>
              {data.customers.map((item) => (
                <CustomerCard key={item.customer.id} item={item} compact={data.filters.view === "compact"} />
              ))}
            </div>
            <Pagination data={data} />
          </>
        ) : (
          <EmptyState hasAnyCustomer={data.hasAnyCustomer} hasActiveFilters={data.hasActiveFilters} />
        )}
      </section>
    </section>
  );
}

function getCurrentHrefParams(data: Awaited<ReturnType<typeof getCustomersPageData>>) {
  const f = data.filters;
  return {
    q: f.query || undefined,
    customerStatus: f.customerStatus,
    paymentStatus: f.paymentStatus,
    contractStatus: f.contractStatus,
    infoStatus: f.infoStatus,
    eventType: f.eventType || undefined,
    from: f.from || undefined,
    to: f.to || undefined,
    sort: f.sort,
    pageSize: f.pageSize,
    view: f.view,
  };
}

function PageHeader() {
  return (
    <div className="overflow-hidden rounded-[1.3rem] border border-[#d8c08b]/54 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.12),transparent_13rem),linear-gradient(145deg,rgba(255,249,238,0.98),rgba(248,238,216,0.93))] p-3 text-[#111827] shadow-[0_12px_36px_rgba(17,24,39,0.06)] sm:rounded-[1.55rem] sm:p-3.5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-center">
        <div className="min-w-0 text-center lg:text-right">
          <div className="flex justify-center lg:justify-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/26 bg-white/55 px-3 py-1 text-[11px] font-black text-[#17483f] shadow-[0_8px_18px_rgba(17,24,39,0.045)]">
              <UsersRound size={13} />
              مرکز CRM تالار
            </span>
          </div>
          <h1 className="mt-2 text-[1.55rem] font-black leading-tight tracking-[-0.02em] sm:text-[2rem]">
            مدیریت مشتریان
          </h1>
          <p className="mx-auto mt-1.5 max-w-2xl text-xs font-bold leading-6 text-[#6d5f49] sm:text-[13px] sm:leading-7 lg:mx-0">
            پرونده مشتریان، اطلاعات تماس، سوابق قراردادها، وضعیت مالی، مراسم بعدی و آخرین تعامل هر مشتری را از این بخش مدیریت کنید.
          </p>
        </div>

        <div className="rounded-[1.1rem] border border-[#d8c08b]/46 bg-white/45 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] sm:p-3">
          <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
            <span className="text-[11px] font-black text-[#7d6841]">اقدام‌های سریع CRM</span>
            <span className="h-px min-w-8 flex-1 bg-[#d8c08b]/42" aria-hidden="true" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Link href="/dashboard/customers/new" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#111827] px-3.5 py-2 text-[13px] font-black text-[#fff8ea] shadow-[0_10px_22px_rgba(17,24,39,0.14)] transition hover:-translate-y-0.5 hover:bg-[#1f2937]">
              <Plus size={16} />
              افزودن مشتری جدید
            </Link>
            <Link href="/dashboard/contracts/new" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#d8c08b]/62 bg-[#fffaf0]/78 px-3.5 py-2 text-[13px] font-black text-[#7d6841] transition hover:border-[#c7a15a]/70 hover:bg-[#fff8ea]">
              <FileSignature size={16} />
              ثبت قرارداد جدید
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerKpis({ data }: { data: Awaited<ReturnType<typeof getCustomersPageData>> }) {
  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      <KpiCard icon={UsersRound} label="کل مشتریان" value={formatPersianNumber(data.kpis.totalCustomers)} hint="کل پرونده‌ها" href="/dashboard/customers" tone="navy" />
      <KpiCard icon={UserRound} label="مشتریان فعال" value={formatPersianNumber(data.kpis.activeCustomers)} hint="پرونده فعال" href="/dashboard/customers?customerStatus=active" tone="emerald" />
      <KpiCard icon={WalletCards} label="دارای مانده" value={formatPersianNumber(data.kpis.customersWithOutstanding)} hint="نیازمند پیگیری مالی" href="/dashboard/customers?paymentStatus=outstanding" tone="amber" />
      <KpiCard icon={AlertTriangle} label="اطلاعات ناقص" value={formatPersianNumber(data.kpis.incompleteCustomers)} hint="نیازمند تکمیل" href="/dashboard/customers?infoStatus=incomplete" tone="rose" />
      <KpiCard icon={Plus} label="مشتریان جدید" value={formatPersianNumber(data.kpis.newCustomersThisMonth)} hint="ماه جاری" href="/dashboard/customers?sort=newest" tone="navy" />
      <KpiCard icon={CalendarDays} label="مراسم پیش‌رو" value={formatPersianNumber(data.kpis.upcomingEvents)} hint="۳۰ روز آینده" href="/dashboard/customers?contractStatus=upcoming&sort=nearestEvent" tone="emerald" />
    </section>
  );
}

function FollowUpStrip({ data }: { data: Awaited<ReturnType<typeof getCustomersPageData>> }) {
  const items = [
    {
      label: "دارای مانده",
      value: formatPersianNumber(data.kpis.customersWithOutstanding),
      href: "/dashboard/customers?paymentStatus=outstanding",
      tone: "amber" as const,
    },
    {
      label: "بدون دریافت",
      value: formatPersianNumber(data.kpis.customersWithoutPayment),
      href: "/dashboard/customers?paymentStatus=unpaid",
      tone: "rose" as const,
    },
    {
      label: "اطلاعات ناقص",
      value: formatPersianNumber(data.kpis.incompleteCustomers),
      href: "/dashboard/customers?infoStatus=incomplete",
      tone: "rose" as const,
    },
    {
      label: "مراسم پیش‌رو",
      value: formatPersianNumber(data.kpis.upcomingEvents),
      href: "/dashboard/customers?contractStatus=upcoming&sort=nearestEvent",
      tone: "emerald" as const,
    },
  ];

  return (
    <section className="rounded-[1.25rem] border border-[#d8c08b]/48 bg-[#fff9ee]/90 p-3 text-[#111827] shadow-[0_10px_32px_rgba(17,24,39,0.045)] sm:rounded-[1.55rem]">
      <div className="grid gap-3 lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1fr)] lg:items-center">
        <div className="text-center lg:text-right">
          <p className="text-[11px] font-black text-[#17483f]">نیازمند پیگیری</p>
          <h2 className="mt-1 text-base font-black sm:text-lg">مشتری‌هایی که بهتر است زودتر بررسی شوند</h2>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <Link key={item.label} href={item.href} className={`grid grid-cols-[auto_1fr] items-center gap-2 rounded-2xl border px-3 py-2 text-right text-xs font-black transition hover:-translate-y-0.5 ${followUpTone(item.tone)}`}>
              <span className="text-base leading-none">{item.value}</span>
              <span className="text-[11px] opacity-80">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  href: string;
  tone: "navy" | "emerald" | "amber" | "rose";
}) {
  return (
    <Link
      href={href}
      className={`group grid min-h-20 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-[1.15rem] border bg-[#fff9ee]/94 p-2.5 text-right text-[#111827] shadow-[0_10px_28px_rgba(17,24,39,0.045)] transition hover:-translate-y-0.5 hover:border-[#c7a15a]/70 sm:rounded-[1.35rem] sm:p-3 ${toneBorder(tone)}`}
    >
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-2xl ${toneIcon(tone)}`}>
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-black leading-tight sm:text-xl">{value}</p>
        <p className="mt-0.5 truncate text-[11px] font-black leading-5 text-[#7d6841] sm:text-xs">{label}</p>
        <p className="truncate text-[10px] font-black text-[#17483f] sm:text-[11px]">{hint}</p>
      </div>
    </Link>
  );
}

function CustomerFilters({ data }: { data: Awaited<ReturnType<typeof getCustomersPageData>> }) {
  const filters = data.filters;
  const base = getCurrentHrefParams(data);
  const quickFilters = [
    { label: "همه", href: "/dashboard/customers", active: !data.hasActiveFilters },
    { label: "دارای مانده", href: buildCustomersHref({ ...base, paymentStatus: "outstanding", page: 1 }), active: filters.paymentStatus === "outstanding" },
    { label: "بدون دریافت", href: buildCustomersHref({ ...base, paymentStatus: "unpaid", page: 1 }), active: filters.paymentStatus === "unpaid" },
    { label: "اطلاعات ناقص", href: buildCustomersHref({ ...base, infoStatus: "incomplete", page: 1 }), active: filters.infoStatus === "incomplete" },
    { label: "مراسم پیش‌رو", href: buildCustomersHref({ ...base, contractStatus: "upcoming", sort: "nearestEvent", page: 1 }), active: filters.contractStatus === "upcoming" },
  ];

  return (
    <form action="/dashboard/customers" className="rounded-[1.35rem] border border-[#d8c08b]/58 bg-[#fff9ee]/92 p-3 text-[#111827] shadow-[0_10px_34px_rgba(17,24,39,0.05)] sm:rounded-[1.65rem]">
      <input type="hidden" name="pageSize" value={filters.pageSize} />
      <input type="hidden" name="view" value={filters.view} />
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label className="grid gap-1.5 text-xs font-black text-[#172033]">
          <span>جستجوی مشتریان</span>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9f7131]" />
            <input
              name="q"
              defaultValue={filters.query}
              placeholder="جستجوی نام مشتری، شماره همراه یا کد ملی"
              className="input-luxury min-h-10 py-2 pl-10 text-sm"
            />
          </div>
        </label>
        <div className="grid grid-cols-2 gap-2 lg:min-w-56">
          <button type="submit" className="btn-luxury-dark min-h-10 px-4 py-2 text-sm">اعمال فیلتر</button>
          <Link href="/dashboard/customers" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-3 py-2 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70">
            <RotateCcw size={15} />
            حذف فیلترها
          </Link>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {quickFilters.map((item) => (
          <Link key={item.label} href={item.href} className={`rounded-full border px-2.5 py-1 text-[11px] font-black transition sm:text-xs ${item.active ? "border-[#111827]/12 bg-[#111827] text-[#fff8ea]" : "border-[#d8c08b]/52 bg-[#fff8ea]/72 text-[#7d6841] hover:border-[#c7a15a]/70"}`}>
            {item.label}
          </Link>
        ))}
      </div>
      <details className="group mt-2.5 rounded-[1.05rem] border border-[#d8c08b]/40 bg-[#fff8ea]/48 p-2.5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-1 text-sm font-black text-[#17483f]">
          <span className="inline-flex items-center gap-2">
            <Filter size={17} />
            فیلترهای پیشرفته مشتریان
          </span>
          <ChevronDown size={17} className="text-[#9f7131] transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select name="customerStatus" label="وضعیت مشتری" defaultValue={filters.customerStatus}>
            {Object.entries(customerStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select name="paymentStatus" label="وضعیت دریافت" defaultValue={filters.paymentStatus}>
            {Object.entries(paymentFilterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select name="contractStatus" label="وضعیت قرارداد" defaultValue={filters.contractStatus}>
            {Object.entries(contractFilterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select name="infoStatus" label="کامل بودن اطلاعات" defaultValue={filters.infoStatus}>
            {Object.entries(infoFilterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select name="eventType" label="نوع آخرین مراسم" defaultValue={filters.eventType || "all"}>
            <option value="all">همه مراسم‌ها</option>
            {data.eventTypes.map((eventType) => <option key={eventType} value={eventType}>{eventType}</option>)}
          </Select>
          <JalaliDatePicker name="from" label="از تاریخ مراسم" defaultValue={filters.from} />
          <JalaliDatePicker name="to" label="تا تاریخ مراسم" defaultValue={filters.to} />
          <Select name="sort" label="مرتب‌سازی" defaultValue={filters.sort}>
            {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </div>
      </details>
    </form>
  );
}

function ListToolbar({ data }: { data: Awaited<ReturnType<typeof getCustomersPageData>> }) {
  const f = data.filters;
  const base = getCurrentHrefParams(data);

  return (
    <div className="grid gap-2.5 rounded-[1.25rem] border border-[#d8c08b]/50 bg-[#fff9ee]/88 px-3 py-2.5 text-[#111827] shadow-[0_8px_24px_rgba(17,24,39,0.035)] xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
      <div className="min-w-0 text-center xl:text-right">
        <div className="flex items-center justify-center gap-2 text-sm font-black text-[#17483f] xl:justify-start">
          <BriefcaseBusiness size={17} />
          پرونده‌های مشتریان
        </div>
        <p className="mt-0.5 text-xs font-bold leading-6 text-[#7d6841]">{data.currentViewSummary}</p>
      </div>
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center xl:justify-end">
        <p className="rounded-full border border-[#d8c08b]/42 bg-[#fff8ea]/62 px-3 py-1 text-[11px] font-black text-[#7d6841]">
          {formatPersianNumber(data.pagination.firstItem)} تا {formatPersianNumber(data.pagination.lastItem)} از {formatPersianNumber(data.pagination.total)} مشتری
        </p>
        <div className="flex rounded-2xl border border-[#d8c08b]/52 bg-[#fff8ea]/76 p-1 text-xs font-black">
          <Link href={buildCustomersHref({ ...base, view: "cards", page: 1 })} className={`rounded-xl px-3 py-1.5 ${f.view === "cards" ? "bg-[#111827] text-[#fff8ea]" : "text-[#7d6841]"}`}>کارتی</Link>
          <Link href={buildCustomersHref({ ...base, view: "compact", page: 1 })} className={`rounded-xl px-3 py-1.5 ${f.view === "compact" ? "bg-[#111827] text-[#fff8ea]" : "text-[#7d6841]"}`}>فشرده</Link>
        </div>
        <div className="flex rounded-2xl border border-[#d8c08b]/52 bg-[#fff8ea]/76 p-1 text-xs font-black">
          {[10, 50, 100].map((size) => (
            <Link key={size} href={buildCustomersHref({ ...base, pageSize: size, page: 1 })} className={`rounded-xl px-3 py-1.5 ${f.pageSize === size ? "bg-[#111827] text-[#fff8ea]" : "text-[#7d6841]"}`}>{toPersianDigits(size)}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function CustomerCard({ item, compact }: { item: CustomerCardData; compact: boolean }) {
  const { customer, summary } = item;
  const nationalCode = customer.nationalCode ?? customer.nationalId;
  const salutation = customer.salutation ? `${customer.salutation} ` : "";
  const fullName = `${salutation}${customer.fullName}`;
  const profileStatus = getProfileStatus(customer);
  const financialStatus = getFinancialStatus(summary);
  const nextEvent = summary.nearestUpcomingContract
    ? `${formatJalaliDate(summary.nearestUpcomingContract.eventDate)}${summary.nearestUpcomingContract.eventTypeName ? ` | ${summary.nearestUpcomingContract.eventTypeName}` : ""}`
    : "مراسم پیش‌رو ندارد";
  const lastInteraction = getLastInteraction(item);
  const paymentHref = summary.outstandingContractId
    ? `/dashboard/payments/new?contractId=${summary.outstandingContractId}`
    : "/dashboard/payments/new";
  const addressLabel = customer.address ? customer.address.slice(0, 80) : "نشانی ثبت نشده";

  if (compact) {
    return (
      <article className="rounded-[1.05rem] border border-[#d8c08b]/52 bg-[#fff9ee]/94 p-2.5 text-[#111827] shadow-[0_8px_22px_rgba(17,24,39,0.04)] transition hover:border-[#c7a15a]/70 sm:rounded-[1.25rem]">
        <div className="grid gap-2.5 xl:grid-cols-[minmax(16rem,0.9fr)_minmax(0,1.35fr)_auto] xl:items-center">
          <CustomerIdentityBlock
            fullName={fullName}
            phone={customer.phone}
            customerInitial={customer.fullName.trim().slice(0, 1) || "م"}
            customerIsActive={customer.isActive}
            profileStatus={profileStatus}
            financialStatus={financialStatus}
            compact
          />

          <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
            <CompactMetric label="قرارداد" value={`${formatPersianNumber(summary.contractCount)} مورد`} />
            <CompactMetric label="مراسم بعدی" value={nextEvent} muted={!summary.nearestUpcomingContract} />
            <CompactMetric label="مانده" value={formatIRR(summary.remainingAmount)} alert={summary.remainingAmount > 0} />
            <CompactMetric label="آخرین تعامل" value={lastInteraction} />
          </div>

          <CustomerActions customerId={customer.id} customerName={customer.fullName} customerPhone={customer.phone} contractCount={summary.contractCount} paymentHref={paymentHref} showPayment={summary.remainingAmount > 0} compact />
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-visible rounded-[1.2rem] border border-[#d8c08b]/58 bg-[#fff9ee]/95 p-3 text-[#111827] shadow-[0_10px_34px_rgba(17,24,39,0.055)] transition hover:-translate-y-0.5 hover:border-[#c7a15a]/70 sm:rounded-[1.45rem]">
      <div className="grid gap-2.5 xl:grid-cols-[minmax(18rem,0.95fr)_minmax(0,1.35fr)_minmax(16rem,0.78fr)] xl:items-stretch">
        <div className="grid gap-2.5 rounded-[1.05rem] border border-[#111827]/8 bg-white/[0.32] p-3">
          <CustomerIdentityBlock
            fullName={fullName}
            phone={customer.phone}
            customerInitial={customer.fullName.trim().slice(0, 1) || "م"}
            customerIsActive={customer.isActive}
            profileStatus={profileStatus}
            financialStatus={financialStatus}
          />
          <div className="grid gap-1.5 text-xs font-bold leading-5 text-[#6d5f49]">
            <p className="truncate">{nationalCode ? `کد ملی: ${toPersianDigits(nationalCode)}` : "کد ملی ثبت نشده"}</p>
            <p className={customer.address ? "truncate" : "truncate text-[#9b8b70]"}>{addressLabel}</p>
            <p className="truncate font-black text-[#17483f]">آخرین تعامل: {lastInteraction}</p>
            {summary.hasUpcomingEvent ? <p className="truncate font-black text-[#7a4a12]">مراسم پیش‌رو ثبت شده است.</p> : null}
          </div>
        </div>

        <div className="grid content-start gap-1.5 rounded-[1.05rem] border border-[#d8c08b]/48 bg-[#fff8ea]/62 p-2.5 text-sm font-bold text-[#6d5f49] sm:grid-cols-2">
          <InfoRow label="تاریخ ثبت مشتری" value={`${formatJalaliDate(customer.createdAt)} ساعت ${formatJalaliTime(customer.createdAt)}`} />
          <InfoRow label="تعداد قراردادها" value={formatPersianNumber(summary.contractCount)} />
          <InfoRow label="قرارداد فعال" value={formatPersianNumber(summary.activeContractCount)} />
          <InfoRow label="آخرین مراسم" value={summary.latestContract ? formatJalaliDate(summary.latestContract.eventDate) : "هنوز مراسمی ثبت نشده"} />
          <InfoRow label="مراسم بعدی" value={nextEvent} />
          <InfoRow label="نوع آخرین مراسم" value={summary.latestContract?.eventTypeName ?? "ثبت نشده"} />
        </div>

        <div className="grid content-start gap-2 rounded-[1.05rem] border border-[#d8c08b]/48 bg-white/[0.30] p-2.5">
          <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-1">
            <MoneyMetric label="مجموع قراردادها" value={formatIRR(summary.totalContractAmount)} strong />
            <MoneyMetric label="دریافت‌شده" value={formatIRR(summary.paidAmount)} />
            <MoneyMetric label="مانده" value={formatIRR(summary.remainingAmount)} alert={summary.remainingAmount > 0} />
            <MoneyMetric label="وضعیت" value={financialStatus.label} alert={financialStatus.tone === "warning" || financialStatus.tone === "danger"} />
          </div>
          <CustomerActions customerId={customer.id} customerName={customer.fullName} customerPhone={customer.phone} contractCount={summary.contractCount} paymentHref={paymentHref} showPayment={summary.remainingAmount > 0} />
        </div>
      </div>
    </article>
  );
}


function CustomerIdentityBlock({
  fullName,
  phone,
  customerInitial,
  customerIsActive,
  profileStatus,
  financialStatus,
  compact,
}: {
  fullName: string;
  phone: string;
  customerInitial: string;
  customerIsActive: boolean;
  profileStatus: { label: string; tone: "success" | "warning" };
  financialStatus: { label: string; tone: "success" | "danger" | "warning" | "muted" };
  compact?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={compact ? "flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-sm font-black text-[#f0dba9]" : "flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-base font-black text-[#f0dba9]"}>
        {customerInitial}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1.5">
          <StatusPill tone={customerIsActive ? "success" : "danger"}>{customerIsActive ? "فعال" : "غیرفعال"}</StatusPill>
          <StatusPill tone={profileStatus.tone}>{profileStatus.label}</StatusPill>
          <StatusPill tone={financialStatus.tone}>{financialStatus.label}</StatusPill>
        </div>
        <h2 className={compact ? "mt-1.5 truncate text-sm font-black leading-6 sm:text-base" : "mt-2 truncate text-lg font-black leading-7 sm:text-xl"}>{fullName}</h2>
        <p className="mt-0.5 inline-flex items-center gap-1.5 truncate text-[11px] font-bold leading-5 text-[#7d6841] sm:text-xs">
          <Phone size={13} />
          {toPersianDigits(phone)}
        </p>
      </div>
    </div>
  );
}

function CustomerActions({
  customerId,
  customerName,
  customerPhone,
  contractCount,
  paymentHref,
  showPayment,
  compact,
}: {
  customerId: string;
  customerName: string;
  customerPhone: string;
  contractCount: number;
  paymentHref: string;
  showPayment: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex flex-wrap justify-start gap-1.5 xl:justify-end" : "grid gap-1.5 sm:grid-cols-3 xl:grid-cols-1"}>
      <Link href={`/dashboard/customers/${customerId}`} className={compact ? "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-xl border border-[#111827]/14 bg-[#fff8ea]/78 px-3 py-1.5 text-[11px] font-black text-[#172033]" : "inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#111827]/14 bg-[#fff8ea]/78 px-3 py-2 text-xs font-black text-[#172033] transition hover:bg-[#111827] hover:text-[#fff8ea]"}>
        <Eye size={compact ? 13 : 14} />
        پرونده
      </Link>
      <Link href={`/dashboard/contracts/new?customerId=${customerId}`} className={compact ? "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-xl border border-[#25a46d]/20 bg-[#25a46d]/10 px-3 py-1.5 text-[11px] font-black text-[#17483f]" : "inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#25a46d]/22 bg-[#25a46d]/10 px-3 py-2 text-xs font-black text-[#17483f] transition hover:border-[#25a46d]/42"}>
        <Plus size={compact ? 13 : 14} />
        ثبت قرارداد
      </Link>
      <details className="relative">
        <summary className={compact ? "inline-flex min-h-8 cursor-pointer list-none items-center justify-center gap-1.5 rounded-xl border border-[#d8c08b]/62 bg-[#fff8ea]/78 px-3 py-1.5 text-[11px] font-black text-[#7d6841]" : "inline-flex min-h-9 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-[#d8c08b]/62 bg-[#fff8ea]/78 px-3 py-2 text-xs font-black text-[#7d6841]"}>
          <MoreHorizontal size={compact ? 13 : 15} />
          بیشتر
        </summary>
        <div className="absolute left-0 z-20 mt-2 grid w-56 gap-1 rounded-2xl border border-[#d8c08b]/62 bg-[#fff9ee] p-2 text-xs font-black text-[#111827] shadow-[0_18px_50px_rgba(17,24,39,0.22)]">
          <Link href={`/dashboard/customers/${customerId}/edit`} className="rounded-xl px-3 py-2 text-[#7d6841] hover:bg-[#fff1d6]">ویرایش مشتری</Link>
          {showPayment ? <Link href={paymentHref} className="rounded-xl px-3 py-2 text-[#7a4a12] hover:bg-[#fff1d6]">ثبت دریافت</Link> : null}
          <Link href={`/dashboard/contracts?q=${encodeURIComponent(customerName)}`} className="rounded-xl px-3 py-2 text-[#7d6841] hover:bg-[#fff1d6]">مشاهده قراردادها</Link>
          <Link href={`/dashboard/payments?q=${encodeURIComponent(customerName)}`} className="rounded-xl px-3 py-2 text-[#7d6841] hover:bg-[#fff1d6]">مشاهده دریافتی‌ها</Link>
          <form action={deleteCustomerAction}>
            <input type="hidden" name="customerId" value={customerId} />
            <input type="hidden" name="returnTo" value="/dashboard/customers" />
            <ConfirmSubmitButton
              confirmMessage={`آیا از حذف این مشتری مطمئن هستید؟ این عملیات قابل بازگشت نیست.\n${customerName} — ${customerPhone}`}
              disabled={contractCount > 0}
              disabledMessage="این مشتری دارای قرارداد ثبت‌شده است و امکان حذف آن وجود ندارد."
              className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#b45353]/18 bg-[#fff1f1]/75 px-3 py-2 text-xs font-black text-[#8f2c2c] transition hover:border-[#b45353]/36 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Trash2 size={14} />
              حذف مشتری
            </ConfirmSubmitButton>
          </form>
        </div>
      </details>
    </div>
  );
}

function Pagination({ data }: { data: Awaited<ReturnType<typeof getCustomersPageData>> }) {
  const { pagination } = data;
  if (pagination.totalPages <= 1) return null;
  const base = getCurrentHrefParams(data);

  return (
    <nav className="flex flex-col items-center gap-2.5 rounded-[1.2rem] border border-[#d8c08b]/50 bg-[#fff9ee]/88 px-3.5 py-3 text-center text-[#111827] sm:flex-row sm:justify-between sm:text-right">
      <div>
        <p className="text-sm font-black text-[#17483f]">صفحه {formatPersianNumber(pagination.page)} از {formatPersianNumber(pagination.totalPages)}</p>
        <p className="mt-0.5 text-xs font-bold text-[#7d6841]">نمایش {formatPersianNumber(pagination.firstItem)} تا {formatPersianNumber(pagination.lastItem)} از {formatPersianNumber(pagination.total)} مشتری</p>
      </div>
      <div className="flex gap-2">
        <Link
          href={buildCustomersHref({ ...base, page: Math.max(1, pagination.page - 1) })}
          aria-disabled={pagination.page <= 1}
          className={`inline-flex min-h-10 items-center justify-center rounded-2xl border px-4 text-sm font-black ${pagination.page <= 1 ? "pointer-events-none border-[#d8c08b]/36 bg-[#f5ead3]/60 text-[#9b8b70]" : "border-[#d8c08b]/62 bg-[#fff8ea]/76 text-[#7d6841] hover:border-[#c7a15a]/70"}`}
        >
          صفحه قبل
        </Link>
        <Link
          href={buildCustomersHref({ ...base, page: Math.min(pagination.totalPages, pagination.page + 1) })}
          aria-disabled={pagination.page >= pagination.totalPages}
          className={`inline-flex min-h-10 items-center justify-center rounded-2xl border px-4 text-sm font-black ${pagination.page >= pagination.totalPages ? "pointer-events-none border-[#d8c08b]/36 bg-[#f5ead3]/60 text-[#9b8b70]" : "border-[#111827]/16 bg-[#111827] text-[#fff8ea] hover:border-[#c7a15a]/60"}`}
        >
          صفحه بعد
        </Link>
      </div>
    </nav>
  );
}

function EmptyState({ hasAnyCustomer, hasActiveFilters }: { hasAnyCustomer: boolean; hasActiveFilters: boolean }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-[#c7a15a]/58 bg-[#fff9ee]/92 p-5 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.08)] sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
            <UsersRound size={22} />
          </span>
          <div>
            <h2 className="text-xl font-black">{hasAnyCustomer ? "مشتری‌ای با این فیلترها پیدا نشد." : "هنوز مشتری ثبت نشده است."}</h2>
            <p className="mt-2 leading-8 text-[#6d5f49]">
              {hasAnyCustomer
                ? hasActiveFilters
                  ? "عبارت جست‌وجو یا فیلترها را تغییر دهید تا نتیجه مناسب پیدا شود."
                  : "فعلاً مشتری قابل نمایش وجود ندارد."
                : "برای شروع، اولین مشتری را ثبت کنید یا مستقیماً قرارداد جدید بسازید."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasAnyCustomer ? <Link href="/dashboard/customers" className="btn-luxury-primary px-5 py-3"><RotateCcw size={18} />حذف فیلترها</Link> : null}
          <Link href="/dashboard/customers/new" className="btn-luxury-primary px-5 py-3"><Plus size={18} />افزودن مشتری جدید</Link>
          <Link href="/dashboard/contracts/new" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/64 bg-[#fff8ea]/82 px-5 py-3 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"><FileSignature size={18} />ثبت قرارداد جدید</Link>
        </div>
      </div>
    </div>
  );
}

function Select({ name, label, defaultValue, children }: { name: string; label: string; defaultValue: string | number; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-[#172033]">
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue} className="input-luxury min-h-11 py-2 text-sm">
        {children}
      </select>
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const muted = value === "ثبت نشده" || value === "هنوز مراسمی ثبت نشده" || value === "مراسم پیش‌رو ندارد";
  return (
    <div className="grid min-h-12 content-center gap-0.5 rounded-xl border border-[#d8c08b]/28 bg-white/[0.38] px-2.5 py-1.5">
      <span className="truncate text-[10px] font-black text-[#7d6841]">{label}</span>
      <span className={muted ? "truncate text-xs font-black text-[#9b8b70]" : "truncate text-xs font-black text-[#111827]"}>{value}</span>
    </div>
  );
}

function CompactMetric({ label, value, muted, alert }: { label: string; value: string; muted?: boolean; alert?: boolean }) {
  return (
    <div className={`min-w-0 rounded-xl border px-2.5 py-1.5 ${alert ? "border-[#c7a15a]/38 bg-[#fff1d6]/72" : "border-[#d8c08b]/42 bg-white/[0.48]"}`}>
      <p className="text-[10px] font-black text-[#7d6841]">{label}</p>
      <p className={`mt-1 truncate text-[11px] font-black leading-tight ${muted ? "text-[#9b8b70]" : alert ? "text-[#7a4a12]" : "text-[#111827]"}`}>{value}</p>
    </div>
  );
}

function MoneyMetric({ label, value, strong, alert }: { label: string; value: string; strong?: boolean; alert?: boolean }) {
  return (
    <div className={`grid min-h-12 content-center rounded-xl border px-2.5 py-1.5 text-right ${strong ? "border-[#111827]/10 bg-[#111827] text-[#fff8ea]" : alert ? "border-[#c7a15a]/32 bg-[#c7a15a]/12 text-[#7d6841]" : "border-[#d8c08b]/52 bg-[#fff8ea]/72 text-[#111827]"}`}>
      <p className={`truncate text-[10px] font-black ${strong ? "text-[#f0dba9]" : "text-[#7d6841]"}`}>{label}</p>
      <p className="mt-0.5 truncate text-xs font-black leading-tight">{value}</p>
    </div>
  );
}

function Notice({ children, tone }: { children: ReactNode; tone: "success" | "danger" }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-black ${tone === "success" ? "border-[#25a46d]/22 bg-[#ecfff5] text-[#17483f]" : "border-[#b45353]/18 bg-[#fff1f1] text-[#8f2c2c]"}`}>
      {children}
    </div>
  );
}

function StatusPill({ children, tone }: { children: ReactNode; tone: "success" | "danger" | "info" | "warning" | "muted" }) {
  const className = tone === "success"
    ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]"
    : tone === "danger"
      ? "border-[#b45353]/20 bg-[#fff1f1] text-[#8f2c2c]"
      : tone === "warning"
        ? "border-[#c7a15a]/34 bg-[#fff7e6] text-[#7a4a12]"
        : tone === "muted"
          ? "border-[#6b7280]/24 bg-[#f3f4f6] text-[#374151]"
          : "border-[#111827]/14 bg-[#111827]/7 text-[#172033]";
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black sm:px-3 sm:text-xs ${className}`}>{children}</span>;
}

function getProfileStatus(customer: CustomerCardData["customer"]): { label: string; tone: "success" | "warning"; missing: string[] } {
  const nationalCode = customer.nationalCode ?? customer.nationalId;
  const missing: string[] = [];
  if (!nationalCode) missing.push("کد ملی");
  if (!customer.address) missing.push("نشانی");
  return missing.length > 0
    ? { label: "اطلاعات ناقص", tone: "warning", missing }
    : { label: "اطلاعات کامل", tone: "success", missing };
}

function getFinancialStatus(summary: CustomerCardData["summary"]): { label: string; tone: "success" | "danger" | "warning" | "muted" } {
  if (summary.contractCount === 0) return { label: "بدون قرارداد", tone: "muted" };
  if (summary.paidAmount <= 0) return { label: "بدون دریافت", tone: "danger" };
  if (summary.remainingAmount > 0) return { label: "دارای مانده", tone: "warning" };
  return { label: paymentStatusLabels[summary.paymentStatus as keyof typeof paymentStatusLabels] ?? "تسویه‌شده", tone: "success" };
}

function getLastInteraction(item: CustomerCardData) {
  const latestPayment = item.customer.payments[0];
  if (latestPayment) {
    return `دریافت ${formatJalaliDate(latestPayment.paidAt)} | ${formatIRR(Number(latestPayment.amount))}`;
  }
  if (item.summary.latestContract) {
    return `قرارداد ${item.summary.latestContract.contractNo} | ${formatJalaliDate(item.summary.latestContract.eventDate)}`;
  }
  return `بروزرسانی ${formatJalaliDate(item.customer.updatedAt)}`;
}

function followUpTone(tone: "emerald" | "amber" | "rose") {
  if (tone === "emerald") return "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]";
  if (tone === "rose") return "border-[#b45353]/20 bg-[#fff1f1] text-[#8f2c2c]";
  return "border-[#c7a15a]/34 bg-[#fff7e6] text-[#7a4a12]";
}

function toneBorder(tone: "navy" | "emerald" | "amber" | "rose") {
  if (tone === "emerald") return "border-[#25a46d]/22";
  if (tone === "amber") return "border-[#c7a15a]/52";
  if (tone === "rose") return "border-[#b45353]/22";
  return "border-[#d8c08b]/62";
}

function toneIcon(tone: "navy" | "emerald" | "amber" | "rose") {
  if (tone === "emerald") return "bg-[#25a46d]/12 text-[#17483f]";
  if (tone === "amber") return "bg-[#fff7e6] text-[#7a4a12]";
  if (tone === "rose") return "bg-[#fff1f1] text-[#8f2c2c]";
  return "bg-[#111827] text-[#f0dba9]";
}
