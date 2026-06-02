import type { ContractStatus } from "@prisma/client";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  FileSignature,
  Filter,
  MapPin,
  ShieldCheck,
  Phone,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { ConfirmSubmitButton } from "@/components/dashboard/confirm-submit-button";
import { ContractActionsMenu } from "@/components/dashboard/contracts/contract-actions-menu";
import { finalizeContractSettlementAction } from "@/lib/actions/contract-actions";
import { confirmPostEventAction } from "@/lib/actions/post-event-confirmation-actions";
import { requireTenantMember } from "@/lib/auth/session";
import {
  contractStatusLabels,
  formatContractTimeRange,
  getContractStatusStyle,
  paymentStatusLabels,
  toNumber,
  type PaymentStatus,
} from "@/lib/contracts/display";
import {
  contractPageSortLabels,
  getContractsPageData,
  type ContractListItem,
  type ContractsPageSearchParams,
  type ContractQuickFilter,
} from "@/lib/contracts/contracts-page-data";
import {
  formatJalaliDate,
  formatJalaliTime,
  formatJalaliWeekday,
  toPersianDigits,
} from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import {
  getOwnerOperationStartDateForTenant,
  isLegacyContractEventDate,
} from "@/lib/post-event/post-event-decision-gate";
import {
  calculateContractCancellationEstimate,
  formatCancellationDaysLabel,
} from "@/lib/contracts/cancellation-policy";

type ContractsPageProps = {
  searchParams: Promise<
    ContractsPageSearchParams & {
      created?: string;
      deleted?: string;
      settled?: string;
      canceled?: string;
      error?: string;
    }
  >;
};

const contractStatuses: ContractStatus[] = [
  "DRAFT",
  "RESERVED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELED",
];
const paymentStatuses: PaymentStatus[] = ["PAID", "PARTIAL", "UNPAID"];

function getContractPageErrorMessage(error: string) {
  if (error === "protected-delete") {
    return "حذف قرارداد انجام نشد. دوباره تلاش کنید یا گزارش خطا را بررسی کنید.";
  }

  if (error === "not-found") {
    return "این رکورد پیدا نشد.";
  }

  if (error === "settlement-failed") {
    return "تسویه نهایی قرارداد انجام نشد. چند دقیقه دیگر دوباره تلاش کنید.";
  }

  if (error === "invalid-settlement") {
    return "درخواست تسویه نهایی معتبر نیست.";
  }

  if (error === "invalid-cancellation-amount") {
    return "مبلغ کنسلی معتبر نیست.";
  }

  return "درخواست قرارداد معتبر نبود یا دسترسی شما مجاز نیست.";
}

function getContractDeleteConfirmMessage(contractNo: string) {
  return `آیا مطمئن هستید که می‌خواهید این قرارداد حذف شود؟
با حذف این قرارداد، تمام اطلاعات مربوط به این قرارداد شامل جزئیات مراسم، منوها، خدمات، دریافت‌ها، پرداخت‌ها و اطلاعات مالی وابسته حذف خواهد شد. فقط اطلاعات پایه مشتری باقی می‌ماند. این عملیات قابل بازگشت نیست.
قرارداد ${contractNo}`;
}

function getContractFinalSettlementConfirmMessage(contract: ContractListItem) {
  return `آیا مطمئن هستید که می‌خواهید این قرارداد را تسویه نهایی کنید؟
مبلغ مانده قرارداد به‌صورت خودکار تسویه می‌شود و وضعیت قرارداد به تسویه‌شده و برگزارشده تغییر می‌کند.
نام مشتری: ${contract.customer.fullName}
شماره قرارداد: ${toPersianDigits(contract.contractNo)}
مبلغ مانده فعلی: ${formatIRR(contract.remainingComputed)}
مبلغ نهایی قرارداد: ${formatIRR(toNumber(contract.finalTotal))}
مبلغ دریافت‌شده فعلی: ${formatIRR(contract.paidAmount)}`;
}

function canRegisterHeldConfirmationForInvoice(
  contract: ContractListItem,
  isLegacyContract: boolean,
) {
  if (isLegacyContract || contract.invoice || contract.postEventConfirmation)
    return false;
  if (
    contract.status !== "RESERVED" &&
    contract.status !== "CONFIRMED" &&
    contract.status !== "COMPLETED"
  )
    return false;
  return (
    contract.urgencyLabel === "گذشته" || contract.urgencyLabel === "برگزار شده"
  );
}

function isContractFinalSettled(contract: ContractListItem) {
  return contract.status === "COMPLETED" && contract.remainingComputed <= 0;
}

function isContractFinanciallyClosed(contract: ContractListItem) {
  return contract.status === "CANCELED" || isContractFinalSettled(contract);
}

function getPostEventInvoiceConfirmMessage(contract: ContractListItem) {
  return `برای قرارداد ${toPersianDigits(contract.contractNo)} وضعیت مراسم «برگزار شده» ثبت می‌شود و سپس صفحه پیش‌نمایش فاکتور باز می‌شود.
مشتری: ${contract.customer.fullName}
تاریخ مراسم: ${formatJalaliDate(contract.eventDate)}
مبلغ قرارداد: ${formatIRR(toNumber(contract.finalTotal))}`;
}

function buildContractsHref(
  params: Record<string, string | number | undefined | null>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== "all"
    ) {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `/dashboard/contracts?${query}` : "/dashboard/contracts";
}

export default async function ContractsPage({
  searchParams,
}: ContractsPageProps) {
  const membership = await requireTenantMember();
  const params = await searchParams;
  const data = await getContractsPageData(membership.tenantId, params);
  const ownerOperationStartDate = await getOwnerOperationStartDateForTenant(
    membership.tenantId,
  );
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";

  return (
    <section className="space-y-4 sm:space-y-5">
      <PageHeader />

      {params.created ? (
        <Notice tone="success">قرارداد جدید با موفقیت ثبت شد.</Notice>
      ) : null}
      {params.deleted ? (
        <Notice tone="success">قرارداد با موفقیت حذف شد.</Notice>
      ) : null}
      {params.settled === "1" ? (
        <Notice tone="success">
          قرارداد با موفقیت تسویه نهایی شد و دریافت مانده به‌صورت خودکار ثبت شد.
        </Notice>
      ) : null}
      {params.settled === "zero" ? (
        <Notice tone="success">
          قرارداد مانده مالی نداشت؛ وضعیت آن به تسویه‌شده و برگزارشده تغییر کرد.
        </Notice>
      ) : null}
      {params.settled === "already" ? (
        <Notice tone="success">
          این قرارداد قبلاً تسویه نهایی شده بود و تغییری دوباره ثبت نشد.
        </Notice>
      ) : null}
      {params.canceled === "1" ? (
        <Notice tone="success">قرارداد با موفقیت وارد فرآیند کنسلی شد.</Notice>
      ) : null}
      {params.error ? (
        <Notice tone="danger">
          {getContractPageErrorMessage(params.error)}
        </Notice>
      ) : null}

      <OperatorSummaryCards data={data} />

      <ContractFilters data={data} />

      <section className="space-y-2.5">
        <ListToolbar data={data} />
        {data.contracts.length > 0 ? (
          <>
            <div
              className={
                data.filters.view === "compact" ? "grid gap-2" : "grid gap-2.5"
              }
            >
              {data.contracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  canEdit={canEdit}
                  compact={data.filters.view === "compact"}
                  returnTo={buildContractsHref({
                    ...getCurrentHrefParams(data),
                    page: data.pagination.page,
                  })}
                  ownerOperationStartDate={ownerOperationStartDate}
                />
              ))}
            </div>
            <Pagination data={data} />
          </>
        ) : (
          <EmptyState hasAnyContract={data.hasAnyContract} />
        )}
      </section>
    </section>
  );
}

function getCurrentHrefParams(
  data: Awaited<ReturnType<typeof getContractsPageData>>,
) {
  const f = data.filters;
  return {
    q: f.query || undefined,
    status: f.status,
    paymentStatus: f.paymentStatus,
    hallId: f.hallId,
    salonId: f.salonId,
    eventTypeId: f.eventTypeId,
    from: f.from || undefined,
    to: f.to || undefined,
    sort: f.sort,
    pageSize: f.pageSize,
    view: f.view,
    quick: f.quick,
  };
}

function PageHeader() {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-[#d8c08b]/54 bg-[radial-gradient(circle_at_10%_0%,rgba(199,161,90,0.12),transparent_13rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.92))] px-3.5 py-3 text-[#111827] shadow-[0_14px_42px_rgba(17,24,39,0.065)] sm:rounded-[1.65rem] sm:px-5 sm:py-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/28 bg-white/54 px-2.5 py-1 text-[10px] font-black text-[#17483f] shadow-[0_6px_18px_rgba(17,24,39,0.035)]">
            <FileSignature size={13} />
            فهرست کاری قراردادها
          </div>
          <div className="mt-2.5 flex flex-col gap-1.5">
            <h1 className="text-2xl font-black leading-tight sm:text-[1.9rem]">
              مدیریت قراردادها
            </h1>
            <p className="max-w-2xl text-sm font-bold leading-7 text-[#6d5f49]">
              قرارداد را پیدا کن، وضعیتش را ببین، همان یک اقدام درست را انجام
              بده.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          <Link
            href="/dashboard/contracts/new"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#111827]/12 bg-[#111827] px-4 py-2 text-sm font-black text-[#fff8ea] shadow-[0_10px_22px_rgba(17,24,39,0.11)] transition hover:-translate-y-0.5 hover:border-[#c7a15a]/60"
          >
            <Plus size={16} />
            ثبت قرارداد جدید
          </Link>
          <Link
            href="/dashboard/calendar"
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#d8c08b]/48 bg-[#fff8ea]/58 px-3 py-1.5 text-xs font-black text-[#7d6841] transition hover:-translate-y-0.5 hover:border-[#c7a15a]/70"
          >
            <CalendarDays size={15} />
            تقویم رزرو
          </Link>
          <Link
            href="/dashboard/reports"
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#d8c08b]/42 bg-white/52 px-3 py-1.5 text-xs font-black text-[#7d6841] transition hover:-translate-y-0.5 hover:border-[#c7a15a]/70"
          >
            <ArrowLeft size={15} />
            گزارش قراردادها
          </Link>
        </div>
      </div>
    </div>
  );
}

function OperatorSummaryCards({
  data,
}: {
  data: Awaited<ReturnType<typeof getContractsPageData>>;
}) {
  return (
    <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={FileSignature}
        label="قراردادهای فعال"
        value={formatPersianNumber(data.kpis.activeContractsCount)}
        hint="در جریان پیگیری"
        href="/dashboard/contracts?status=CONFIRMED"
        tone="navy"
      />
      <KpiCard
        icon={ReceiptText}
        label="نیازمند اقدام"
        value={formatPersianNumber(data.kpis.actionRequiredContractsCount)}
        hint="مانده، بدون دریافت یا موعد نزدیک"
        href="/dashboard/contracts?quick=needsAction&sort=highestRemaining"
        tone={data.kpis.actionRequiredContractsCount > 0 ? "amber" : "emerald"}
      />
      <KpiCard
        icon={WalletCards}
        label="تسویه‌نشده / دارای مانده"
        value={formatIRR(data.kpis.outstandingRemainingTotal)}
        hint={`${formatPersianNumber(data.kpis.outstandingContractsCount)} قرارداد`}
        href="/dashboard/contracts?quick=outstanding&sort=highestRemaining"
        tone={data.kpis.outstandingRemainingTotal > 0 ? "rose" : "emerald"}
      />
      <KpiCard
        icon={CalendarDays}
        label="مراسم‌های پیش‌رو"
        value={formatPersianNumber(data.kpis.upcomingEventsCount)}
        hint="۷ روز آینده"
        href="/dashboard/contracts?quick=upcoming&sort=nearestEvent"
        tone={data.kpis.upcomingEventsCount > 0 ? "amber" : "navy"}
      />
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
      className={`group grid min-h-[6.25rem] grid-cols-[minmax(0,1fr)_2.35rem] items-center gap-3 rounded-[1.15rem] border bg-[#fff9ee]/92 p-3 text-right text-[#111827] shadow-[0_10px_30px_rgba(17,24,39,0.045)] transition hover:-translate-y-0.5 hover:border-[#c7a15a]/70 ${toneBorder(tone)}`}
    >
      <div className="min-w-0">
        <p className="truncate text-[11px] font-black leading-5 text-[#7d6841]">
          {label}
        </p>
        <p className="mt-1.5 truncate text-base font-black leading-tight sm:text-lg">
          {value}
        </p>
        <p className="mt-1 truncate text-[11px] font-black text-[#17483f]">
          {hint}
        </p>
      </div>
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-2xl ${toneIcon(tone)}`}
      >
        <Icon size={16} />
      </span>
    </Link>
  );
}

const quickFilters: Array<{
  value?: ContractQuickFilter;
  label: string;
  href: string;
}> = [
  { label: "همه", href: "/dashboard/contracts" },
  {
    value: "needsAction",
    label: "نیازمند اقدام",
    href: "/dashboard/contracts?quick=needsAction&sort=highestRemaining",
  },
  {
    value: "outstanding",
    label: "دارای مانده",
    href: "/dashboard/contracts?quick=outstanding&sort=highestRemaining",
  },
  {
    value: "unpaid",
    label: "بدون دریافت",
    href: "/dashboard/contracts?quick=unpaid",
  },
  {
    value: "paid",
    label: "تسویه‌شده",
    href: "/dashboard/contracts?quick=paid",
  },
  {
    value: "upcoming",
    label: "مراسم پیش‌رو",
    href: "/dashboard/contracts?quick=upcoming&sort=nearestEvent",
  },
];

function QuickFilterBar({
  data,
}: {
  data: Awaited<ReturnType<typeof getContractsPageData>>;
}) {
  const activeQuick = data.filters.quick;
  return (
    <div className="mt-3 flex flex-nowrap items-center gap-2 overflow-x-auto border-t border-[#d8c08b]/30 pt-3 pb-1 whitespace-nowrap sm:flex-wrap sm:overflow-visible sm:whitespace-normal">
      <span className="shrink-0 text-[11px] font-black text-[#7d6841]">
        فیلتر سریع
      </span>
      {quickFilters.map((item) => {
        const active =
          activeQuick === item.value || (!activeQuick && !item.value);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`inline-flex min-h-8 items-center justify-center rounded-xl border px-3 py-1 text-[11px] font-black transition ${active ? "border-[#111827]/16 bg-[#111827] text-[#fff8ea]" : "border-[#d8c08b]/48 bg-[#fff8ea]/70 text-[#7d6841] hover:border-[#c7a15a]/70"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function ContractFilters({
  data,
}: {
  data: Awaited<ReturnType<typeof getContractsPageData>>;
}) {
  const f = data.filters;
  const advancedActive =
    f.hallId !== "all" ||
    f.salonId !== "all" ||
    f.eventTypeId !== "all" ||
    Boolean(f.from || f.to);

  return (
    <form
      action="/dashboard/contracts"
      className="rounded-[1.25rem] border border-[#d8c08b]/56 bg-[#fff9ee]/90 p-3 text-[#111827] shadow-[0_10px_30px_rgba(17,24,39,0.045)]"
    >
      <input type="hidden" name="pageSize" value={f.pageSize} />
      {f.quick ? <input type="hidden" name="quick" value={f.quick} /> : null}
      <input type="hidden" name="view" value={f.view} />
      <div className="grid gap-2 xl:grid-cols-[minmax(24rem,2fr)_10rem_10rem_11rem_9.5rem] xl:items-end">
        <label className="grid gap-1.5 text-[11px] font-black text-[#172033]">
          <span>جستجوی اصلی</span>
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9f7131]"
            />
            <input
              name="q"
              defaultValue={f.query}
              placeholder="جستجوی نام مشتری، موبایل یا شماره قرارداد"
              className="input-luxury min-h-12 py-3 pl-10 text-base"
            />
          </div>
        </label>
        <Select
          name="status"
          label="وضعیت قرارداد"
          defaultValue={f.status ?? "all"}
        >
          <option value="all">همه وضعیت‌ها</option>
          {contractStatuses.map((status) => (
            <option key={status} value={status}>
              {contractStatusLabels[status]}
            </option>
          ))}
        </Select>
        <Select
          name="paymentStatus"
          label="وضعیت مالی"
          defaultValue={f.paymentStatus ?? "all"}
        >
          <option value="all">همه دریافتی‌ها</option>
          {paymentStatuses.map((status) => (
            <option key={status} value={status}>
              {paymentStatusLabels[status]}
            </option>
          ))}
        </Select>
        <Select name="sort" label="مرتب‌سازی" defaultValue={f.sort}>
          {Object.entries(contractPageSortLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="submit"
            className="btn-luxury-dark min-h-10 px-3 py-2 text-sm"
          >
            اعمال
          </button>
          <Link
            href="/dashboard/contracts"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border border-[#d8c08b]/58 bg-[#fff8ea]/74 px-3 py-2 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
          >
            <RotateCcw size={14} />
            پاک کردن
          </Link>
        </div>
      </div>

      <details
        className="group mt-3 rounded-[1rem] border border-[#d8c08b]/38 bg-[#fff8ea]/44 p-2"
        open={advancedActive}
      >
        <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1.5 text-xs font-black text-[#17483f]">
          <span className="inline-flex items-center gap-2">
            <Filter size={15} />
            فیلترهای بیشتر
          </span>
          <ChevronDown
            size={15}
            className="text-[#9f7131] transition group-open:rotate-180"
          />
        </summary>
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <Select name="hallId" label="تالار" defaultValue={f.hallId}>
            <option value="all">همه تالارها</option>
            {data.options.halls.map((hall) => (
              <option key={hall.id} value={hall.id}>
                {hall.name}
              </option>
            ))}
          </Select>
          <Select name="salonId" label="سالن" defaultValue={f.salonId}>
            <option value="all">همه سالن‌ها</option>
            {data.options.salons.map((salon) => (
              <option key={salon.id} value={salon.id}>
                {salon.name} - {salon.hall.name}
              </option>
            ))}
          </Select>
          <Select
            name="eventTypeId"
            label="نوع مراسم"
            defaultValue={f.eventTypeId}
          >
            <option value="all">همه مراسم‌ها</option>
            {data.options.eventTypes.map((eventType) => (
              <option key={eventType.id} value={eventType.id}>
                {eventType.name}
              </option>
            ))}
          </Select>
          <JalaliDatePicker
            name="from"
            label="از تاریخ مراسم"
            defaultValue={f.from}
          />
          <JalaliDatePicker
            name="to"
            label="تا تاریخ مراسم"
            defaultValue={f.to}
          />
        </div>
      </details>
      <QuickFilterBar data={data} />
    </form>
  );
}

function ListToolbar({
  data,
}: {
  data: Awaited<ReturnType<typeof getContractsPageData>>;
}) {
  const f = data.filters;
  const base = getCurrentHrefParams(data);
  return (
    <div className="flex flex-col gap-3 rounded-[1.15rem] border border-[#d8c08b]/48 bg-[#fff9ee]/82 px-3.5 py-3 text-[#111827] shadow-[0_8px_24px_rgba(17,24,39,0.04)] xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-black text-[#17483f]">
          <FileSignature size={17} />
          فهرست عملیاتی قراردادها
        </div>
        <p className="mt-1 text-xs font-bold leading-5 text-[#7d6841]">
          {data.currentViewSummary}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <p className="rounded-full border border-[#d8c08b]/42 bg-[#fff8ea]/68 px-3 py-1.5 text-[11px] font-black text-[#7d6841]">
          نمایش {formatPersianNumber(data.pagination.firstItem)} تا{" "}
          {formatPersianNumber(data.pagination.lastItem)} از{" "}
          {formatPersianNumber(data.pagination.total)}
        </p>
        <div className="flex rounded-xl border border-[#d8c08b]/48 bg-[#fff8ea]/72 p-1 text-[11px] font-black">
          <Link
            href={buildContractsHref({ ...base, view: "cards", page: 1 })}
            className={`rounded-lg px-3 py-1.5 ${f.view === "cards" ? "bg-[#111827] text-[#fff8ea]" : "text-[#7d6841]"}`}
          >
            کارت‌ها
          </Link>
          <Link
            href={buildContractsHref({ ...base, view: "compact", page: 1 })}
            className={`rounded-lg px-3 py-1.5 ${f.view === "compact" ? "bg-[#111827] text-[#fff8ea]" : "text-[#7d6841]"}`}
          >
            فشرده
          </Link>
        </div>
        <div className="flex rounded-xl border border-[#d8c08b]/48 bg-[#fff8ea]/72 p-1 text-[11px] font-black">
          {[10, 20, 50].map((size) => (
            <Link
              key={size}
              href={buildContractsHref({ ...base, pageSize: size, page: 1 })}
              className={`rounded-lg px-3 py-1.5 ${f.pageSize === size ? "bg-[#111827] text-[#fff8ea]" : "text-[#7d6841]"}`}
            >
              {toPersianDigits(size)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContractCard({
  contract,
  canEdit,
  compact,
  returnTo,
  ownerOperationStartDate,
}: {
  contract: ContractListItem;
  canEdit: boolean;
  compact: boolean;
  returnTo: string;
  ownerOperationStartDate: Date;
}) {
  const nationalCode =
    contract.customer.nationalCode ?? contract.customer.nationalId;
  const isLegacyContract = isLegacyContractEventDate(
    contract.eventDate,
    ownerOperationStartDate,
  );
  const isFinalSettled = isContractFinalSettled(contract);
  const isFinanciallyClosed = isContractFinanciallyClosed(contract);
  const canManageContract = canEdit && !isLegacyContract && !isFinanciallyClosed;
  const canRegisterHeldForInvoice =
    canEdit &&
    canRegisterHeldConfirmationForInvoice(contract, isLegacyContract);
  const canIssueInvoiceNow =
    contract.postEventConfirmation?.status === "HELD" &&
    contract.postEventConfirmation.invoiceRequired &&
    !contract.invoice;
  const invoiceActionHref = contract.invoice
    ? `/dashboard/invoices/${contract.invoice.id}`
    : `/dashboard/contracts/${contract.id}/invoice`;
  const invoiceActionLabel = contract.invoice ? "مشاهده فاکتور" : "صدور فاکتور";
  const ceremonyDate = `${formatJalaliWeekday(contract.eventDate)}، ${formatJalaliDate(contract.eventDate)}`;
  const ceremonyTime = formatContractTimeRange(
    contract.eventStartTime,
    contract.eventEndTime,
  );
  const place = `${contract.hall?.name ?? "تالار ثبت نشده"} / ${contract.salon?.name ?? "سالن ثبت نشده"}`;
  const lastActivityText = contract.lastPaymentAt
    ? `${formatIRR(contract.lastPaymentAmount)} در ${formatJalaliDate(contract.lastPaymentAt)}`
    : `${formatJalaliDate(contract.updatedAt)} ساعت ${formatJalaliTime(contract.updatedAt)}`;
  const cancellationEstimate = calculateContractCancellationEstimate({
    eventDate: contract.eventDate,
    finalTotal: toNumber(contract.finalTotal),
    depositAmount: toNumber(contract.depositAmount),
  });
  const cancellationHint = cancellationEstimate.isPenaltyActive
    ? `${formatCancellationDaysLabel(cancellationEstimate.daysUntilEvent)} · ${formatPersianNumber(cancellationEstimate.penaltyPercent)}٪ خسارت`
    : "بیشتر از ۳۰ روز مانده؛ خسارت خودکار فعال نیست";
  const visibleFlags = contract.actionFlags.slice(0, 2);
  const hiddenFlags = contract.actionFlags.slice(2);
  const financialLabel = isLegacyContract
    ? "مالی آرشیوی"
    : contract.status === "CANCELED"
      ? "بسته‌شده / کنسلی"
      : isFinalSettled || contract.remainingComputed <= 0
        ? "تسویه‌شده"
        : `مانده ${formatIRR(contract.remainingComputed)}`;
  const financialTone =
    isLegacyContract || contract.status === "CANCELED" || contract.remainingComputed <= 0 ? "success" : "warning";
  const ceremonyStatus = getCeremonyStatus(contract, isLegacyContract);

  const primaryAction = (() => {
    if (isLegacyContract) {
      return (
        <PrimaryActionLink
          href={`/dashboard/contracts/${contract.id}`}
          tone="dark"
          icon={<Eye size={14} />}
        >
          مشاهده جزئیات
        </PrimaryActionLink>
      );
    }

    if (isFinalSettled) {
      return (
        <PrimaryActionLink
          href={`/dashboard/contracts/${contract.id}`}
          tone="dark"
          icon={<CheckCircle2 size={14} />}
        >
          مشاهده قرارداد
        </PrimaryActionLink>
      );
    }

    if (contract.invoice || canIssueInvoiceNow) {
      return (
        <PrimaryActionLink
          href={invoiceActionHref}
          tone="invoice"
          icon={<ReceiptText size={14} />}
        >
          {invoiceActionLabel}
        </PrimaryActionLink>
      );
    }

    if (canRegisterHeldForInvoice) {
      return (
        <form action={confirmPostEventAction} className="grid">
          <input type="hidden" name="contractId" value={contract.id} />
          <input type="hidden" name="decision" value="HELD" />
          <input
            type="hidden"
            name="note"
            value="ثبت برگزاری از فهرست قراردادها برای صدور فاکتور بعد از مراسم."
          />
          <ConfirmSubmitButton
            confirmTitle="ثبت برگزاری و ادامه صدور فاکتور"
            confirmLabel="ثبت و رفتن به فاکتور"
            confirmTone="success"
            confirmMessage={getPostEventInvoiceConfirmMessage(contract)}
            className={`${primaryActionBaseClass} ${getPrimaryActionToneClass("invoice")}`}
          >
            <ReceiptText size={14} />
            صدور فاکتور
          </ConfirmSubmitButton>
        </form>
      );
    }

    if (canManageContract && contract.remainingComputed > 0) {
      return (
        <form action={finalizeContractSettlementAction} className="grid">
          <input type="hidden" name="contractId" value={contract.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <ConfirmSubmitButton
            confirmTitle="تأیید تسویه نهایی قرارداد"
            confirmLabel="تأیید تسویه نهایی"
            confirmTone="success"
            confirmMessage={getContractFinalSettlementConfirmMessage(contract)}
            className={`${primaryActionBaseClass} ${getPrimaryActionToneClass("success")}`}
          >
            <CheckCircle2 size={14} />
            تسویه نهایی
          </ConfirmSubmitButton>
        </form>
      );
    }

    return (
      <PrimaryActionLink
        href={`/dashboard/contracts/${contract.id}`}
        tone="dark"
        icon={<Eye size={14} />}
      >
        مشاهده جزئیات
      </PrimaryActionLink>
    );
  })();

  return (
    <article
      className={`rounded-[1.15rem] border border-[#d8c08b]/50 bg-[#fff9ee]/92 p-2.5 text-[#111827] shadow-[0_8px_26px_rgba(17,24,39,0.045)] transition hover:border-[#c7a15a]/70 ${compact ? "sm:p-3" : "sm:p-3.5"}`}
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_12.75rem] xl:items-center">
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex min-h-7 items-center rounded-full border border-[#111827]/12 bg-[#111827] px-2.5 text-[10px] font-black text-[#fff8ea]">
                  قرارداد {toPersianDigits(contract.contractNo)}
                </span>
                {visibleFlags.map((flag) => (
                  <StatusChip key={flag} label={flag} />
                ))}
              </div>
              <h2 className="mt-2 truncate text-lg font-black leading-7 sm:text-xl">
                {contract.customer.fullName}
              </h2>
              <p className="mt-0.5 truncate text-xs font-black leading-5 text-[#6d5f49] sm:text-sm">
                {contract.eventTypeName || "نوع مراسم ثبت نشده"}
              </p>
            </div>

            <div className="grid gap-1.5 sm:grid-cols-3 lg:w-[29rem]">
              <StatePill
                label="وضعیت قرارداد"
                value={contractStatusLabels[contract.status]}
                className={getContractStatusStyle(contract.status)}
              />
              <StatePill
                label="وضعیت مراسم"
                value={ceremonyStatus.label}
                className={ceremonyStatus.className}
              />
              <StatePill
                label="وضعیت مالی"
                value={financialLabel}
                className={
                  financialTone === "success"
                    ? "border-[#25a46d]/22 bg-[#25a46d]/10 text-[#17483f]"
                    : "border-[#c7a15a]/32 bg-[#fff7e6] text-[#7a4a12]"
                }
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)]">
            <DecisionInfo
              icon={CalendarDays}
              label="تاریخ و ساعت مراسم"
              value={ceremonyDate}
              hint={ceremonyTime}
              emphasize={
                contract.urgencyLabel === "امروز" ||
                contract.urgencyLabel === "فردا"
              }
            />
            <DecisionInfo
              icon={WalletCards}
              label="مالی"
              value={financialLabel}
              hint={
                isLegacyContract
                  ? "قبل از جریان مالی جدید"
                  : `دریافت‌شده: ${formatIRR(contract.paidAmount)}`
              }
              emphasize={!isLegacyContract && contract.remainingComputed > 0}
            />
          </div>
        </div>

        <aside className="grid gap-2 rounded-[1rem] border border-[#d8c08b]/34 bg-white/44 p-2.5">
          <p className="text-center text-[10px] font-black text-[#7d6841]">
            اقدام اصلی این قرارداد
          </p>
          {primaryAction}
          <ContractActionsMenu
            contractId={contract.id}
            contractNo={toPersianDigits(contract.contractNo)}
            customerName={contract.customer.fullName}
            currentStatus={contract.status}
            returnTo={returnTo}
            canEdit={canEdit && !isLegacyContract}
            isLegacyContract={isLegacyContract}
            isFinalSettled={isFinanciallyClosed}
            canRegisterHeldForInvoice={canRegisterHeldForInvoice}
            invoiceActionHref={invoiceActionHref}
            invoiceActionLabel={invoiceActionLabel}
            finalSettlementConfirmMessage={getContractFinalSettlementConfirmMessage(
              contract,
            )}
            postEventInvoiceConfirmMessage={getPostEventInvoiceConfirmMessage(
              contract,
            )}
            deleteConfirmMessage={getContractDeleteConfirmMessage(
              contract.contractNo,
            )}
            cancellationEventLabel={`${ceremonyDate} · ${ceremonyTime}`}
            finalTotal={toNumber(contract.finalTotal)}
            paidAmount={contract.paidAmount}
            remainingAmount={contract.remainingComputed}
          />
        </aside>
      </div>

      <details className="group mt-2 rounded-[0.95rem] border border-[#d8c08b]/30 bg-[#fff8ea]/36 p-1.5">
        <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-[11px] font-black text-[#7d6841] transition hover:bg-white/62 hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#c7a15a]/42 focus:ring-offset-2 focus:ring-offset-[#fff8ea]">
          <span className="inline-flex items-center gap-1.5">
            <ChevronDown
              size={14}
              className="transition group-open:rotate-180"
            />
            جزئیات کمتر ضروری
          </span>
          <span className="hidden text-[#9f7131] sm:inline">
            تماس، محل، مبلغ‌ها و برچسب‌های بیشتر
          </span>
        </summary>
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <InfoTile
            icon={Phone}
            label="موبایل"
            value={toPersianDigits(contract.customer.phone)}
            hint={
              nationalCode
                ? `کد ملی: ${toPersianDigits(nationalCode)}`
                : "کد ملی ثبت نشده"
            }
          />
          <InfoTile
            icon={MapPin}
            label="محل برگزاری"
            value={place}
            hint={contract.hasMissingInfo ? "نیازمند تکمیل" : "ثبت شده"}
            emphasize={contract.hasMissingInfo}
          />
          <InfoTile
            icon={Clock3}
            label={isLegacyContract ? "آرشیو" : contract.lastActivityLabel}
            value={isLegacyContract ? "قرارداد قدیمی" : lastActivityText}
            hint={
              isLegacyContract
                ? "قبل از جریان مالک"
                : contract.lastPaymentAt
                  ? "آخرین حرکت مالی"
                  : "آخرین عملیات"
            }
          />
          <InfoTile
            icon={ShieldCheck}
            label={isLegacyContract ? "کنترل" : "کنسلی"}
            value={
              isLegacyContract
                ? "خارج از مالی جدید"
                : cancellationEstimate.isPenaltyActive
                  ? formatIRR(cancellationEstimate.penaltyAmount)
                  : "بدون خسارت فعلی"
            }
            hint={isLegacyContract ? "آرشیوی" : cancellationHint}
            emphasize={
              !isLegacyContract && cancellationEstimate.isPenaltyActive
            }
          />
        </div>
        {!isLegacyContract ? (
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
            <MoneyMetric
              label="مبلغ نهایی"
              value={formatIRR(toNumber(contract.finalTotal))}
              strong
            />
            <MoneyMetric
              label="دریافت‌شده"
              value={formatIRR(contract.paidAmount)}
            />
            <MoneyMetric
              label="مانده"
              value={contract.status === "CANCELED" ? "بسته‌شده" : formatIRR(contract.remainingComputed)}
              alert={contract.status !== "CANCELED" && contract.remainingComputed > 0}
            />
            <MoneyMetric
              label="بیعانه"
              value={formatIRR(toNumber(contract.depositAmount))}
            />
          </div>
        ) : null}
        {hiddenFlags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5 rounded-xl border border-[#c7a15a]/22 bg-[#fff7e6]/46 px-2.5 py-1.5">
            {hiddenFlags.map((flag) => (
              <StatusChip key={flag} label={flag} />
            ))}
          </div>
        ) : null}
      </details>
    </article>
  );
}

function getCeremonyStatus(
  contract: ContractListItem,
  isLegacyContract: boolean,
) {
  if (isLegacyContract) {
    return {
      label: "آرشیوی",
      className: "border-[#d8c08b]/58 bg-[#fff8ea]/80 text-[#7d6841]",
    };
  }

  if (contract.postEventConfirmation?.status === "HELD") {
    return {
      label: "برگزار شده",
      className: "border-[#25a46d]/22 bg-[#25a46d]/10 text-[#17483f]",
    };
  }

  if (
    contract.postEventConfirmation?.status === "NOT_HELD" ||
    contract.status === "CANCELED"
  ) {
    return {
      label: "برگزار نشده / کنسلی",
      className: "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]",
    };
  }

  if (
    contract.urgencyLabel === "گذشته" ||
    contract.urgencyLabel === "برگزار شده"
  ) {
    return {
      label: "نیازمند تعیین‌تکلیف",
      className: "border-[#c7a15a]/32 bg-[#fff7e6] text-[#7a4a12]",
    };
  }

  return {
    label: contract.urgencyLabel,
    className: "border-[#d8c08b]/46 bg-[#fff8ea]/70 text-[#7d6841]",
  };
}

const primaryActionBaseClass =
  "inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-black leading-5 transition";

function getPrimaryActionToneClass(
  tone: "dark" | "success" | "invoice" | "neutral",
) {
  if (tone === "dark")
    return "border-[#111827]/14 bg-[#111827] text-[#fff8ea] hover:border-[#c7a15a]/60";
  if (tone === "success")
    return "border-[#25a46d]/20 bg-[#25a46d]/10 text-[#17483f] hover:border-[#25a46d]/42";
  if (tone === "invoice")
    return "border-[#b8860b]/24 bg-[#fff6df] text-[#7a4a12] hover:border-[#b8860b]/45";
  return "border-[#d8c08b]/52 bg-[#fff8ea]/70 text-[#7d6841] hover:border-[#c7a15a]/72";
}

function PrimaryActionLink({
  href,
  tone,
  icon,
  children,
}: {
  href: string;
  tone: "dark" | "success" | "invoice" | "neutral";
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${primaryActionBaseClass} ${getPrimaryActionToneClass(tone)}`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </Link>
  );
}

function Select({
  name,
  label,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-[11px] font-black text-[#172033]">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="input-luxury min-h-10 py-2 text-sm"
      >
        {children}
      </select>
    </label>
  );
}

function DecisionInfo({
  icon: Icon,
  label,
  value,
  hint,
  emphasize,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`grid min-h-16 grid-cols-[2.2rem_minmax(0,1fr)] items-center gap-2 rounded-xl border px-2.5 py-2 ${emphasize ? "border-[#c7a15a]/38 bg-[#fff7e6]/72" : "border-[#d8c08b]/30 bg-white/42"}`}
    >
      <span className="flex size-8 items-center justify-center rounded-xl bg-[#fff8ea] text-[#9f7131]">
        <Icon size={15} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-black text-[#7d6841]">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-[13px] font-black text-[#111827]">
          {value}
        </span>
        <span className="block truncate text-[10px] font-bold text-[#6d5f49]">
          {hint}
        </span>
      </span>
    </div>
  );
}

function StatePill({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div className={`min-w-0 rounded-xl border px-2.5 py-1.5 ${className}`}>
      <p className="truncate text-[10px] font-black opacity-80">{label}</p>
      <p className="mt-0.5 truncate text-[11px] font-black">{value}</p>
    </div>
  );
}

function StatusChip({
  label,
  tone = "warning",
}: {
  label: string;
  tone?: "warning" | "success";
}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${tone === "success" ? "border-[#25a46d]/22 bg-[#25a46d]/10 text-[#17483f]" : "border-[#c7a15a]/28 bg-[#fff7e6]/78 text-[#7a4a12]"}`}
    >
      {label}
    </span>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  hint,
  emphasize,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-lg border px-2 py-1.5 ${emphasize ? "border-[#c7a15a]/38 bg-[#fff7e6]/72" : "border-[#d8c08b]/30 bg-white/42"}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-black text-[#7d6841]">
        <Icon size={12} className="shrink-0 text-[#9f7131]" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-0.5 truncate text-[12px] font-black leading-5 text-[#111827]">
        {value}
      </p>
      <p className="truncate text-[10px] font-bold leading-4 text-[#6d5f49]">
        {hint}
      </p>
    </div>
  );
}

function MoneyMetric({
  label,
  value,
  strong,
  alert,
}: {
  label: string;
  value: string;
  strong?: boolean;
  alert?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-lg border px-2.5 py-1.5 ${strong ? "border-[#111827]/10 bg-[#111827] text-[#fff8ea]" : alert ? "border-[#c7a15a]/28 bg-[#fff7e6]/72 text-[#7d6841]" : "border-[#d8c08b]/40 bg-[#fff8ea]/62 text-[#111827]"}`}
    >
      <p
        className={`text-[10px] font-black ${strong ? "text-[#f0dba9]" : "text-[#7d6841]"}`}
      >
        {label}
      </p>
      <p className="mt-0.5 truncate text-[12px] font-black leading-5 sm:text-[13px]">
        {value}
      </p>
    </div>
  );
}

function Pagination({
  data,
}: {
  data: Awaited<ReturnType<typeof getContractsPageData>>;
}) {
  const { pagination } = data;
  if (pagination.totalPages <= 1) return null;
  const base = getCurrentHrefParams(data);
  return (
    <nav className="flex flex-col gap-3 rounded-[1.15rem] border border-[#d8c08b]/48 bg-[#fff9ee]/82 px-3.5 py-3 text-[#111827] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-black text-[#17483f]">
        صفحه {formatPersianNumber(pagination.page)} از{" "}
        {formatPersianNumber(pagination.totalPages)}
      </p>
      <div className="flex gap-2">
        <Link
          href={buildContractsHref({
            ...base,
            page: Math.max(1, pagination.page - 1),
          })}
          aria-disabled={pagination.page <= 1}
          className={`inline-flex min-h-9 items-center justify-center rounded-xl border px-4 text-sm font-black ${pagination.page <= 1 ? "pointer-events-none border-[#d8c08b]/32 bg-[#f5ead3]/56 text-[#9b8b70]" : "border-[#d8c08b]/58 bg-[#fff8ea]/74 text-[#7d6841] hover:border-[#c7a15a]/70"}`}
        >
          صفحه قبل
        </Link>
        <Link
          href={buildContractsHref({
            ...base,
            page: Math.min(pagination.totalPages, pagination.page + 1),
          })}
          aria-disabled={pagination.page >= pagination.totalPages}
          className={`inline-flex min-h-9 items-center justify-center rounded-xl border px-4 text-sm font-black ${pagination.page >= pagination.totalPages ? "pointer-events-none border-[#d8c08b]/32 bg-[#f5ead3]/56 text-[#9b8b70]" : "border-[#111827]/16 bg-[#111827] text-[#fff8ea] hover:border-[#c7a15a]/60"}`}
        >
          صفحه بعد
        </Link>
      </div>
    </nav>
  );
}

function EmptyState({ hasAnyContract }: { hasAnyContract: boolean }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-[#c7a15a]/58 bg-[#fff9ee]/92 p-6 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.08)]">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
        <FileSignature size={22} />
      </span>
      <h2 className="mt-4 text-xl font-black">
        {hasAnyContract
          ? "قراردادی با این فیلترها پیدا نشد."
          : "هنوز قراردادی ثبت نشده است."}
      </h2>
      <p className="mt-3 leading-8 text-[#6d5f49]">
        {hasAnyContract
          ? "فیلترها را حذف کنید یا قرارداد جدیدی ثبت کنید."
          : "برای شروع، اولین قرارداد مراسم را ثبت کنید."}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {hasAnyContract ? (
          <Link
            href="/dashboard/contracts"
            className="btn-luxury-primary px-5 py-3"
          >
            <RotateCcw size={18} />
            حذف فیلترها
          </Link>
        ) : null}
        <Link
          href="/dashboard/contracts/new"
          className="btn-luxury-primary px-5 py-3"
        >
          <Plus size={18} />
          ثبت قرارداد جدید
        </Link>
        <Link
          href="/dashboard/calendar"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/64 bg-[#fff8ea]/82 px-5 py-3 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
        >
          <CalendarDays size={18} />
          تقویم رزرو
        </Link>
      </div>
    </div>
  );
}

function Notice({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "danger";
}) {
  return (
    <div
      className={`rounded-3xl border px-5 py-4 text-sm font-black ${tone === "success" ? "border-[#25a46d]/22 bg-[#ecfff5] text-[#17483f]" : "border-[#b45353]/18 bg-[#fff1f1] text-[#8f2c2c]"}`}
    >
      {children}
    </div>
  );
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
