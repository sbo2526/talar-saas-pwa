import type { ReactNode } from "react";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Edit3,
  Filter,
  Landmark,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import {
  PaymentMethodForm,
  SetDefaultPaymentMethodForm,
  TogglePaymentMethodStatusForm,
  type PaymentMethodFormValues,
} from "@/components/dashboard/payment-method-forms";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/date/jalali";
import { formatPersianNumber } from "@/lib/formatters";
import {
  formatPaymentMethodLabel,
  getPaymentMethodPrimaryDetail,
  getPaymentMethodReadinessLabel,
  getPaymentTypeLabel,
  isPaymentMethodIncomplete,
  isPaymentTypeValue,
  maskAccountNumber,
  maskCardNumber,
  maskIban,
  paymentTypeOptions,
  type PaymentTypeValue,
} from "@/lib/payment-method-options";
import { getPrisma } from "@/lib/prisma";

type PaymentMethodsPageProps = {
  searchParams: Promise<{
    status?: string;
    type?: string;
    q?: string;
    default?: string;
    completeness?: string;
    sort?: string;
  }>;
};

type StatusFilter = "all" | "active" | "inactive";
type DefaultFilter = "all" | "default" | "not-default";
type CompletenessFilter = "all" | "complete" | "incomplete";
type SortMode = "latest" | "name" | "type" | "defaultFirst" | "incompleteFirst";
type TypeFilter = PaymentTypeValue | "all";

type PaymentMethodCardData = {
  id: string;
  title: string;
  code: string | null;
  type: PaymentTypeValue;
  description: string | null;
  bankName: string | null;
  accountHolder: string | null;
  accountNumber: string | null;
  cardNumber: string | null;
  iban: string | null;
  posTerminalId: string | null;
  gatewayName: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

const typeChips: Array<{ value: TypeFilter | "incomplete"; label: string }> = [
  { value: "all", label: "همه" },
  { value: "CASH", label: "نقدی" },
  { value: "CARD", label: "کارت‌خوان" },
  { value: "CARD_TO_CARD", label: "کارت‌به‌کارت" },
  { value: "BANK_TRANSFER", label: "حواله بانکی" },
  { value: "CHECK", label: "چک" },
  { value: "ONLINE", label: "درگاه آنلاین" },
  { value: "OTHER", label: "سایر" },
  { value: "incomplete", label: "ناقص" },
];

export default async function PaymentMethodsPage({
  searchParams,
}: PaymentMethodsPageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const tenantId = membership.tenantId;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";
  const params = await searchParams;

  const selectedStatus = parseStatus(params.status);
  const selectedType = isPaymentTypeValue(params.type) ? params.type : "all";
  const defaultFilter = parseDefault(params.default);
  const completenessFilter = parseCompleteness(params.completeness);
  const sortMode = parseSort(params.sort);
  const query = params.q?.trim() ?? "";
  const showIncompleteChip = params.type === "incomplete";

  const allMethods: PaymentMethodCardData[] = (
    await db.paymentMethod.findMany({
      where: { tenantId },
      orderBy: [
        { isDefault: "desc" },
        { isActive: "desc" },
        { sortOrder: "asc" },
        { updatedAt: "desc" },
      ],
    })
  ).map((method: PaymentMethodCardData) => ({
    ...method,
    type: method.type as PaymentTypeValue,
  }));

  const activeCount = allMethods.filter((method) => method.isActive).length;
  const defaultMethod = allMethods.find(
    (method) => method.isDefault && method.isActive,
  );
  const bankCount = allMethods.filter((method) =>
    ["CARD", "BANK_TRANSFER", "CARD_TO_CARD", "ONLINE"].includes(
      method.type,
    ),
  ).length;
  const incompleteCount = allMethods.filter(isPaymentMethodIncomplete).length;
  const lastUpdated = [...allMethods].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  )[0]?.updatedAt;

  const filteredMethods = sortMethods(
    allMethods.filter((method) => {
      if (selectedStatus === "active" && !method.isActive) return false;
      if (selectedStatus === "inactive" && method.isActive) return false;
      if (selectedType !== "all" && method.type !== selectedType) return false;
      if (showIncompleteChip && !isPaymentMethodIncomplete(method)) return false;
      if (defaultFilter === "default" && !method.isDefault) return false;
      if (defaultFilter === "not-default" && method.isDefault) return false;
      if (completenessFilter === "complete" && isPaymentMethodIncomplete(method)) return false;
      if (completenessFilter === "incomplete" && !isPaymentMethodIncomplete(method)) return false;
      if (query && !matchesQuery(method, query)) return false;
      return true;
    }),
    sortMode,
  );

  const hasAnyMethod = allMethods.length > 0;

  return (
    <section className="space-y-5 sm:space-y-7">
      <PageHeader tenantName={membership.tenant.name} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <SummaryCard
          label="تعداد روش‌ها"
          value={formatPersianNumber(allMethods.length)}
          icon={<WalletCards size={17} />}
        />
        <SummaryCard
          label="روش‌های فعال"
          value={formatPersianNumber(activeCount)}
          icon={<CheckCircle2 size={17} />}
        />
        <SummaryCard
          label="روش پیش‌فرض"
          value={defaultMethod?.title ?? "ثبت نشده"}
          icon={<Star size={17} />}
        />
        <SummaryCard
          label="روش‌های بانکی"
          value={formatPersianNumber(bankCount)}
          icon={<Landmark size={17} />}
        />
        <SummaryCard
          label="روش‌های ناقص"
          value={formatPersianNumber(incompleteCount)}
          icon={<ShieldAlert size={17} />}
          tone={incompleteCount > 0 ? "warning" : "success"}
        />
        <SummaryCard
          label="آخرین به‌روزرسانی"
          value={lastUpdated ? formatJalaliDateTime(lastUpdated) : "ثبت نشده"}
          icon={<CalendarDays size={17} />}
        />
      </div>

      {incompleteCount > 0 ? (
        <MissingInfoNotice count={incompleteCount} />
      ) : null}

      <TypeChips
        selectedType={selectedType}
        showIncompleteChip={showIncompleteChip}
        params={{
          q: query,
          status: selectedStatus,
          default: defaultFilter,
          completeness: completenessFilter,
          sort: sortMode,
        }}
      />

      <FilterBar
        query={query}
        selectedStatus={selectedStatus}
        selectedType={selectedType}
        defaultFilter={defaultFilter}
        completenessFilter={completenessFilter}
        sortMode={sortMode}
      />

      <details
        id="new-payment-method"
        className="group rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem]"
      >
        <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-xs font-black text-[#17483f]">افزودن روش دریافت</p>
            <h2 className="mt-1 text-xl font-black">ثبت روش دریافت وجه</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
              فقط اطلاعات مرتبط با نوع دریافت انتخاب‌شده نمایش داده می‌شود.
            </p>
          </div>
          <span className="btn-luxury-dark px-5 py-3">
            <Plus size={17} />
            باز کردن فرم
          </span>
        </summary>
        <div className="border-t border-[#d8c08b]/55 p-4 sm:p-5">
          <PaymentMethodForm mode="create" canEdit={canEdit} />
        </div>
      </details>

      <div className="space-y-3">
        {filteredMethods.length ? (
          filteredMethods.map((method) => (
            <PaymentMethodCard key={method.id} method={method} canEdit={canEdit} />
          ))
        ) : hasAnyMethod ? (
          <FilteredEmptyState />
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}

function PageHeader({ tenantName }: { tenantName: string }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.20),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:px-4 sm:py-2">
              <CreditCard size={15} />
              تعاریف پایه / روش‌های دریافت
            </span>
            <span className="rounded-full border border-[#111827]/12 bg-[#111827] px-3 py-1.5 text-xs font-black text-[#fff8ea]">
              {tenantName}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/78 px-3 py-1.5 text-xs font-black text-[#7d6841]">
              <CalendarDays size={14} />
              {formatJalaliDate(new Date())}
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">
            مدیریت روش‌های دریافت
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
            روش‌های دریافت وجه مانند نقدی، کارت‌خوان، حواله، کارت‌به‌کارت، چک و درگاه آنلاین را برای ثبت دریافتی‌ها مدیریت کنید.
          </p>
        </div>
        <div className="grid gap-2 sm:flex sm:items-center">
          <a href="#new-payment-method" className="btn-luxury-primary px-5 py-3">
            <Plus size={17} />
            افزودن روش دریافت
          </a>
          <Link
            href="/dashboard/payments"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-5 py-3 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
          >
            دریافتی‌های ثبت‌شده
            <ArrowLeft size={17} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  const iconClass =
    tone === "success"
      ? "bg-[#17483f] text-[#d8fff0]"
      : tone === "warning"
        ? "bg-[#fff1df] text-[#9f7131]"
        : "bg-[#111827] text-[#f0dba9]";

  return (
    <article className="flex min-h-32 flex-col justify-between rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-3.5 text-[#111827] shadow-[0_18px_56px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-5">
      <span className={`flex size-9 items-center justify-center rounded-2xl ${iconClass}`}>
        {icon}
      </span>
      <div>
        <p className="mt-3 text-xs font-black leading-6 text-[#7d6841] sm:text-sm">
          {label}
        </p>
        <p className="mt-1 line-clamp-2 break-words text-lg font-black leading-tight sm:text-xl">
          {value}
        </p>
      </div>
    </article>
  );
}

function MissingInfoNotice({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[#c7a15a]/40 bg-[linear-gradient(135deg,rgba(255,248,234,0.96),rgba(255,241,223,0.92))] p-4 text-[#111827] shadow-[0_16px_50px_rgba(159,113,49,0.10)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff1df] text-[#9f7131]">
          <ShieldAlert size={19} />
        </span>
        <div>
          <p className="text-sm font-black text-[#172033]">
            {formatPersianNumber(count)} روش فعال نیازمند تکمیل اطلاعات است.
          </p>
          <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">
            تکمیل اطلاعات کلیدی باعث انتخاب دقیق‌تر روش دریافت در ثبت دریافتی‌ها می‌شود.
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/payment-methods?completeness=incomplete&sort=incompleteFirst"
        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#c7a15a]/48 bg-[#111827] px-4 py-2 text-sm font-black text-[#fff8ea]"
      >
        مشاهده ناقص‌ها
      </Link>
    </div>
  );
}

function TypeChips({
  selectedType,
  showIncompleteChip,
  params,
}: {
  selectedType: TypeFilter;
  showIncompleteChip: boolean;
  params: {
    q: string;
    status: StatusFilter;
    default: DefaultFilter;
    completeness: CompletenessFilter;
    sort: SortMode;
  };
}) {
  return (
    <nav className="overflow-x-auto pb-1" aria-label="نوع روش دریافت">
      <div className="flex min-w-max gap-2">
        {typeChips.map((chip) => {
          const isActive =
            chip.value === "incomplete"
              ? showIncompleteChip
              : !showIncompleteChip && selectedType === chip.value;
          const href =
            chip.value === "incomplete"
              ? buildPaymentMethodHref({ ...params, type: "incomplete", completeness: "incomplete" })
              : buildPaymentMethodHref({ ...params, type: chip.value, completeness: params.completeness });

          return (
            <Link
              key={chip.value}
              href={href}
              className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                isActive
                  ? "border-[#111827] bg-[#111827] text-[#fff8ea] shadow-[0_12px_34px_rgba(17,24,39,0.18)]"
                  : "border-[#d8c08b]/62 bg-[#fff9ee]/86 text-[#7d6841] hover:border-[#c7a15a]/70"
              }`}
            >
              {chip.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function FilterBar({
  query,
  selectedStatus,
  selectedType,
  defaultFilter,
  completenessFilter,
  sortMode,
}: {
  query: string;
  selectedStatus: StatusFilter;
  selectedType: TypeFilter;
  defaultFilter: DefaultFilter;
  completenessFilter: CompletenessFilter;
  sortMode: SortMode;
}) {
  return (
    <details className="group rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem]" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">
        <span className="flex items-center gap-2 text-sm font-black text-[#17483f]">
          <Filter size={18} />
          فیلتر و جست‌وجوی روش‌ها
        </span>
        <span className="rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-3 py-1 text-xs font-black text-[#7d6841]">
          جمع‌وجور
        </span>
      </summary>
      <form action="/dashboard/payment-methods" className="border-t border-[#d8c08b]/50 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.9fr_auto] xl:items-end">
          <label className="grid gap-2 text-sm font-black text-[#172033]">
            <span>جست‌وجو</span>
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9f7131]"
              />
              <input
                name="q"
                defaultValue={query}
                placeholder="نام، کد، بانک، کارت، شبا یا ترمینال"
                className="input-luxury pl-11"
              />
            </div>
          </label>
          <Select name="type" label="نوع دریافت" defaultValue={selectedType}>
            <option value="all">همه</option>
            {paymentTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select name="status" label="وضعیت" defaultValue={selectedStatus}>
            <option value="all">همه</option>
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
          </Select>
          <Select name="default" label="پیش‌فرض" defaultValue={defaultFilter}>
            <option value="all">همه</option>
            <option value="default">پیش‌فرض</option>
            <option value="not-default">غیر پیش‌فرض</option>
          </Select>
          <Select name="completeness" label="تکمیل اطلاعات" defaultValue={completenessFilter}>
            <option value="all">همه</option>
            <option value="complete">کامل</option>
            <option value="incomplete">ناقص</option>
          </Select>
          <Select name="sort" label="مرتب‌سازی" defaultValue={sortMode}>
            <option value="latest">جدیدترین</option>
            <option value="name">نام</option>
            <option value="type">نوع دریافت</option>
            <option value="defaultFirst">روش پیش‌فرض اول</option>
            <option value="incompleteFirst">ناقص‌ها ابتدا</option>
          </Select>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
            <button type="submit" className="btn-luxury-dark min-h-12 px-5">
              اعمال
            </button>
            <Link
              href="/dashboard/payment-methods"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-4 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
            >
              حذف
            </Link>
          </div>
        </div>
      </form>
    </details>
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
    <label className="grid gap-2 text-sm font-black text-[#172033]">
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue} className="input-luxury">
        {children}
      </select>
    </label>
  );
}

function PaymentMethodCard({
  method,
  canEdit,
}: {
  method: PaymentMethodCardData;
  canEdit: boolean;
}) {
  const incomplete = isPaymentMethodIncomplete(method);
  const details = getMethodDetails(method);

  return (
    <article className="overflow-hidden rounded-[1.45rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 text-[#111827] shadow-[0_14px_44px_rgba(17,24,39,0.065)] sm:rounded-[1.8rem]">
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.85fr)_auto] lg:items-center sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <MethodStatusBadge active={method.isActive} />
            <span className="rounded-full border border-[#25a46d]/18 bg-[#25a46d]/10 px-3 py-1 text-xs font-black text-[#17483f]">
              {getPaymentTypeLabel(method.type)}
            </span>
            {method.isDefault ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/14 px-3 py-1 text-xs font-black text-[#7d6841]">
                <Star size={13} />
                پیش‌فرض
              </span>
            ) : null}
            <ReadinessBadge incomplete={incomplete} />
            {method.code ? (
              <span className="rounded-full border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#7d6841]">
                کد: {method.code}
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-xl font-black leading-tight sm:text-2xl">
            {formatPaymentMethodLabel(method)}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm font-bold leading-7 text-[#6d5f49]">
            {getPaymentMethodPrimaryDetail(method)}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {details.map((detail) => (
            <MiniInfo key={detail.label} {...detail} />
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-44 lg:grid-cols-1">
          <SetDefaultPaymentMethodForm
            paymentMethodId={method.id}
            isDefault={method.isDefault}
            isActive={method.isActive}
            canEdit={canEdit}
          />
          <TogglePaymentMethodStatusForm
            paymentMethodId={method.id}
            isActive={method.isActive}
            canEdit={canEdit}
          />
          <Link
            href="/dashboard/payments"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-4 py-2 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
          >
            دریافتی‌های مرتبط
            <ArrowLeft size={15} />
          </Link>
        </div>
      </div>

      <div className="grid gap-3 border-t border-[#d8c08b]/45 bg-[#fff8ea]/48 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        <InfoPill
          icon={<SlidersHorizontal size={15} />}
          label="وضعیت استفاده"
          value={getPaymentMethodReadinessLabel(method)}
          strong={!incomplete}
        />
        <InfoPill
          icon={<Landmark size={15} />}
          label="بانک / درگاه"
          value={method.bankName || method.gatewayName || (method.type === "CASH" ? "دریافت نقدی" : "ثبت نشده")}
        />
        <InfoPill
          icon={<CreditCard size={15} />}
          label="اطلاعات حساس"
          value={getSensitivePreview(method)}
        />
        <InfoPill
          icon={<CalendarDays size={15} />}
          label="آخرین تغییر"
          value={formatJalaliDateTime(method.updatedAt)}
        />
      </div>

      <div className="border-t border-[#d8c08b]/45 p-4 sm:p-5">
        <details className="group rounded-2xl border border-[#d8c08b]/62 bg-[#fff9ee]/72">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-[#111827]">
            <span className="inline-flex items-center gap-2">
              <Edit3 size={17} />
              {incomplete ? "تکمیل اطلاعات" : "ویرایش"}
            </span>
            <span className="text-xs text-[#7d6841]">باز کردن</span>
          </summary>
          <div className="border-t border-[#d8c08b]/50 p-4">
            <PaymentMethodForm
              mode="edit"
              values={toPaymentMethodFormValues(method)}
              canEdit={canEdit}
              focus={incomplete ? "details" : "all"}
            />
          </div>
        </details>
      </div>
    </article>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#d8c08b]/48 bg-[#fff8ea]/70 px-3 py-2">
      <p className="text-[11px] font-black text-[#7d6841]">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-[#172033]">{value}</p>
    </div>
  );
}

function InfoPill({
  icon,
  label,
  value,
  strong,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#d8c08b]/48 bg-white/38 px-3 py-2">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#7d6841]">
        {icon}
        {label}
      </p>
      <p className={`mt-1 truncate text-sm font-black ${strong ? "text-[#17483f]" : "text-[#172033]"}`}>
        {value}
      </p>
    </div>
  );
}

function MethodStatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="rounded-full border border-[#25a46d]/24 bg-[#25a46d]/10 px-3 py-1 text-xs font-black text-[#17483f]">
      فعال
    </span>
  ) : (
    <span className="rounded-full border border-[#b45353]/18 bg-[#fff1f1] px-3 py-1 text-xs font-black text-[#8f2c2c]">
      غیرفعال
    </span>
  );
}

function ReadinessBadge({ incomplete }: { incomplete: boolean }) {
  return incomplete ? (
    <span className="rounded-full border border-[#c7a15a]/34 bg-[#fff1df] px-3 py-1 text-xs font-black text-[#9f7131]">
      نیازمند تکمیل
    </span>
  ) : (
    <span className="rounded-full border border-[#25a46d]/24 bg-[#ecfff5] px-3 py-1 text-xs font-black text-[#126141]">
      آماده استفاده
    </span>
  );
}

function getMethodDetails(method: PaymentMethodCardData) {
  switch (method.type) {
    case "CASH":
      return [{ label: "نوع دریافت", value: "دریافت نقدی" }];
    case "CARD":
      return [
        { label: "شناسه ترمینال", value: method.posTerminalId || "ثبت نشده" },
        { label: "بانک", value: method.bankName || "ثبت نشده" },
      ];
    case "CARD_TO_CARD":
      return [
        { label: "شماره کارت", value: maskCardNumber(method.cardNumber) },
        { label: "بانک", value: method.bankName || "ثبت نشده" },
      ];
    case "BANK_TRANSFER":
      return [
        { label: "شماره شبا", value: maskIban(method.iban) },
        { label: "حساب", value: maskAccountNumber(method.accountNumber) },
      ];
    case "CHECK":
      return [
        { label: "نوع دریافت", value: "چک" },
        { label: "حساب مقصد", value: method.bankName || "اختیاری" },
      ];
    case "ONLINE":
      return [
        { label: "نام درگاه", value: method.gatewayName || "ثبت نشده" },
        { label: "شناسه پذیرنده", value: method.posTerminalId || "ثبت نشده" },
      ];
    case "OTHER":
      return [{ label: "شرح روش", value: method.description || "ثبت نشده" }];
  }
}

function getSensitivePreview(method: PaymentMethodCardData) {
  if (method.type === "CARD_TO_CARD") return maskCardNumber(method.cardNumber);
  if (method.type === "BANK_TRANSFER") {
    return method.iban ? maskIban(method.iban) : maskAccountNumber(method.accountNumber);
  }
  if (method.type === "CARD" || method.type === "ONLINE") {
    return method.posTerminalId ? `ترمینال ${method.posTerminalId}` : "ثبت نشده";
  }
  return "اطلاعات حساس ندارد";
}

function toPaymentMethodFormValues(
  method: PaymentMethodCardData,
): PaymentMethodFormValues {
  return {
    id: method.id,
    title: method.title,
    code: method.code ?? "",
    type: method.type,
    description: method.description ?? "",
    bankName: method.bankName ?? "",
    accountHolder: method.accountHolder ?? "",
    accountNumber: method.accountNumber ?? "",
    cardNumber: method.cardNumber ?? "",
    iban: method.iban ?? "",
    posTerminalId: method.posTerminalId ?? "",
    gatewayName: method.gatewayName ?? "",
    isDefault: method.isDefault,
    isActive: method.isActive,
  };
}

function EmptyState() {
  return (
    <section className="rounded-[2rem] border border-dashed border-[#c7a15a]/58 bg-[#fff9ee]/92 p-6 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.08)]">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
        <WalletCards size={22} />
      </span>
      <h2 className="mt-4 text-2xl font-black">هنوز روش دریافتی ثبت نشده است</h2>
      <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-[#6d5f49]">
        اولین روش دریافت وجه را تعریف کنید تا در ثبت دریافتی‌های جدید استفاده شود.
      </p>
      <a href="#new-payment-method" className="btn-luxury-primary mt-5 px-5 py-3">
        افزودن روش دریافت
      </a>
    </section>
  );
}

function FilteredEmptyState() {
  return (
    <section className="rounded-[2rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-6 text-center text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.08)]">
      <ShieldCheck className="mx-auto text-[#9f7131]" size={34} />
      <h2 className="mt-3 text-xl font-black">روشی با این فیلتر پیدا نشد</h2>
      <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
        فیلترها را حذف کنید یا روش دریافت جدیدی ثبت کنید.
      </p>
      <Link href="/dashboard/payment-methods" className="btn-luxury-dark mt-5 px-5 py-3">
        حذف فیلترها
      </Link>
    </section>
  );
}

function parseStatus(value: string | undefined): StatusFilter {
  return value === "active" || value === "inactive" ? value : "all";
}

function parseDefault(value: string | undefined): DefaultFilter {
  return value === "default" || value === "not-default" ? value : "all";
}

function parseCompleteness(value: string | undefined): CompletenessFilter {
  return value === "complete" || value === "incomplete" ? value : "all";
}

function parseSort(value: string | undefined): SortMode {
  if (
    value === "name" ||
    value === "type" ||
    value === "defaultFirst" ||
    value === "incompleteFirst"
  ) {
    return value;
  }

  return "latest";
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .toLowerCase();
}

function matchesQuery(method: PaymentMethodCardData, query: string) {
  const needle = normalizeSearch(query);
  const haystack = [
    method.title,
    method.code,
    method.description,
    method.bankName,
    method.accountHolder,
    method.accountNumber,
    method.cardNumber,
    method.iban,
    method.posTerminalId,
    method.gatewayName,
    getPaymentTypeLabel(method.type),
    formatPaymentMethodLabel(method),
  ]
    .filter(Boolean)
    .join(" ");

  return normalizeSearch(haystack).includes(needle);
}

function sortMethods(methods: PaymentMethodCardData[], sortMode: SortMode) {
  return [...methods].sort((a, b) => {
    if (sortMode === "name") {
      return a.title.localeCompare(b.title, "fa");
    }

    if (sortMode === "type") {
      return getPaymentTypeLabel(a.type).localeCompare(getPaymentTypeLabel(b.type), "fa");
    }

    if (sortMode === "defaultFirst") {
      return Number(b.isDefault) - Number(a.isDefault) || a.title.localeCompare(b.title, "fa");
    }

    if (sortMode === "incompleteFirst") {
      return (
        Number(isPaymentMethodIncomplete(b)) - Number(isPaymentMethodIncomplete(a)) ||
        b.updatedAt.getTime() - a.updatedAt.getTime()
      );
    }

    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

function buildPaymentMethodHref(params: {
  type?: TypeFilter | "incomplete";
  q?: string;
  status?: StatusFilter;
  default?: DefaultFilter;
  completeness?: CompletenessFilter;
  sort?: SortMode;
}) {
  const search = new URLSearchParams();

  if (params.type && params.type !== "all") search.set("type", params.type);
  if (params.q) search.set("q", params.q);
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.default && params.default !== "all") search.set("default", params.default);
  if (params.completeness && params.completeness !== "all") search.set("completeness", params.completeness);
  if (params.sort && params.sort !== "latest") search.set("sort", params.sort);

  const query = search.toString();
  return query ? `/dashboard/payment-methods?${query}` : "/dashboard/payment-methods";
}
