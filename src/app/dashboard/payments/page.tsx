import type { Prisma } from "@prisma/client";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  Coins,
  CreditCard,
  Eye,
  FileText,
  Filter,
  Landmark,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
  WalletCards,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cancelPaymentAction } from "@/lib/actions/payment-actions";
import { requireTenantMember } from "@/lib/auth/session";
import {
  contractStatusLabels,
  paymentStatusLabels,
  toNumber,
} from "@/lib/contracts/display";
import {
  formatJalaliDate,
  formatJalaliMonthYear,
  formatJalaliTime,
  formatJalaliWeekday,
  getJalaliMonthRange,
  getTodayJalali,
  parseDateLikeToDate,
  toPersianDigits,
} from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import {
  formatPaymentMethodLabel,
  formatReference,
  getContractPaidAmount,
  getContractRemainingAmount,
  getEffectivePaidAmount,
  getPaymentRecordStatusLabel,
  getPaymentRecordStatusStyle,
  getPaymentStatusSummary,
  getPaymentTypeLabel,
  getPaymentTypeStyle,
  isPaymentRecordStatus,
  isPaymentType,
  paymentMethodTypeLabels,
  paymentStatusRecordLabels,
  paymentStatusValues,
  paymentTypeLabels,
  paymentTypeValues,
  type PaymentRecordStatus,
  type PaymentTypeValue,
} from "@/lib/payments/display";
import { getPrisma } from "@/lib/prisma";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { toEnglishDigits } from "@/lib/validation/normalizers";

type PaymentsPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    methodId?: string;
    contractId?: string;
    customerId?: string;
    view?: string;
    from?: string;
    to?: string;
    sort?: string;
    page?: string;
    canceled?: string;
    paymentError?: string;
  }>;
};

type SortKey = "newest" | "oldest" | "highestAmount" | "lowestAmount";

const pageSize = 10;
const sortLabels: Record<SortKey, string> = {
  newest: "جدیدترین دریافت",
  oldest: "قدیمی‌ترین",
  highestAmount: "بیشترین مبلغ",
  lowestAmount: "کمترین مبلغ",
};

type PaymentListItem = Prisma.PaymentGetPayload<{
  include: {
    customer: { select: { id: true; fullName: true; phone: true; nationalCode: true; nationalId: true } };
    contract: { select: { id: true; contractNo: true; eventDate: true; eventTypeName: true; finalTotal: true; depositAmount: true; status: true; customer: { select: { fullName: true; phone: true } }; payments: { select: { id: true; amount: true; type: true; status: true; paidAt: true; createdAt: true } } } };
    paymentMethod: { select: { id: true; title: true; type: true } };
    installments: { select: { id: true; installmentNumber: true; amount: true; dueDate: true; status: true } };
    cheques: { select: { id: true; chequeNumber: true; amount: true; dueDate: true; status: true } };
  };
}>;

function normalizeFilterValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized !== "all" ? normalized : undefined;
}

function parsePage(value: string | undefined) {
  const page = Number(toEnglishDigits(value ?? "1"));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parseSort(value: string | undefined): SortKey {
  return value === "oldest" || value === "highestAmount" || value === "lowestAmount"
    ? value
    : "newest";
}

function parseJalaliFilterDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  return parseDateLikeToDate(toEnglishDigits(value).replace(/[\/\.]/g, "-"));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getOrderBy(sort: SortKey): Prisma.PaymentOrderByWithRelationInput[] {
  if (sort === "oldest") {
    return [{ paidAt: "asc" }, { createdAt: "asc" }];
  }

  if (sort === "highestAmount") {
    return [{ amount: "desc" }, { paidAt: "desc" }];
  }

  if (sort === "lowestAmount") {
    return [{ amount: "asc" }, { paidAt: "desc" }];
  }

  return [{ paidAt: "desc" }, { createdAt: "desc" }];
}

function buildPaymentsHref(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== "all") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `/dashboard/payments?${query}` : "/dashboard/payments";
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const params = await searchParams;
  const tenantId = membership.tenantId;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";
  const query = params.q?.trim() ?? "";
  const selectedType = isPaymentType(params.type) ? params.type : undefined;
  const selectedStatus = isPaymentRecordStatus(params.status) ? params.status : undefined;
  const methodId = normalizeFilterValue(params.methodId);
  const contractId = normalizeFilterValue(params.contractId);
  const customerId = normalizeFilterValue(params.customerId);
  const fromDate = parseJalaliFilterDate(params.from);
  const toDate = parseJalaliFilterDate(params.to);
  const sort = parseSort(params.sort);
  const page = parsePage(params.page);
  const viewMode = params.view === "contract" ? "contract" : "payment";
  const todayJalali = getTodayJalali();
  const { startDate: currentMonthStart, endDate: currentMonthEnd } = getJalaliMonthRange(todayJalali.year, todayJalali.month);

  const where: Prisma.PaymentWhereInput = {
    tenantId,
    ...(selectedType ? { type: selectedType } : {}),
    ...(selectedStatus ? { status: selectedStatus } : {}),
    ...(methodId ? { paymentMethodId: methodId } : {}),
    ...(contractId ? { contractId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(fromDate || toDate
      ? {
          paidAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lt: addDays(toDate, 1) } : {}),
          },
        }
      : {}),
    ...(query
      ? {
          OR: [
            { reference: { contains: query } },
            { referenceNumber: { contains: query } },
            { trackingCode: { contains: query } },
            { chequeNumber: { contains: query } },
            { note: { contains: query } },
            { customer: { is: { OR: [
              { fullName: { contains: query } },
              { phone: { contains: toEnglishDigits(query) } },
              { nationalCode: { contains: toEnglishDigits(query) } },
              { nationalId: { contains: toEnglishDigits(query) } },
            ] } } },
            { contract: { is: { OR: [
              { contractNo: { contains: query } },
              { title: { contains: query } },
              { customer: { is: { OR: [
                { fullName: { contains: query } },
                { phone: { contains: toEnglishDigits(query) } },
              ] } } },
            ] } } },
          ],
        }
      : {}),
  };

  const [payments, totalCount, methods, customers, contracts, summaryPayments, summaryContracts] = await Promise.all([
    db.payment.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true, phone: true, nationalCode: true, nationalId: true } },
        contract: {
          select: {
            id: true,
            contractNo: true,
            eventDate: true,
            eventTypeName: true,
            finalTotal: true,
            depositAmount: true,
            status: true,
            customer: { select: { fullName: true, phone: true } },
            payments: { select: { id: true, amount: true, type: true, status: true, paidAt: true, createdAt: true } },
          },
        },
        paymentMethod: { select: { id: true, title: true, type: true } },
        installments: { select: { id: true, installmentNumber: true, amount: true, dueDate: true, status: true }, orderBy: { installmentNumber: "asc" } },
        cheques: { select: { id: true, chequeNumber: true, amount: true, dueDate: true, status: true }, orderBy: { dueDate: "asc" } },
      },
      orderBy: getOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.payment.count({ where }),
    db.paymentMethod.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, title: true, type: true, isDefault: true },
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { title: "asc" }],
    }),
    db.customer.findMany({
      where: { tenantId },
      select: { id: true, fullName: true, phone: true },
      orderBy: { fullName: "asc" },
      take: 200,
    }),
    db.contract.findMany({
      where: { tenantId },
      select: { id: true, contractNo: true, customer: { select: { fullName: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.payment.findMany({
      where: { tenantId },
      select: { amount: true, type: true, status: true, paidAt: true },
    }),
    db.contract.findMany({
      where: { tenantId },
      select: { finalTotal: true, depositAmount: true, payments: { select: { amount: true, type: true, status: true } } },
    }),
  ]);

  if (!methods.length) {
    return <PrerequisiteState tenantName={membership.tenant.name} />;
  }

  const totalReceived = getEffectivePaidAmount(summaryPayments);
  const monthReceived = getEffectivePaidAmount(summaryPayments.filter((payment) => payment.paidAt >= currentMonthStart && payment.paidAt < currentMonthEnd));
  const depositTotal = getEffectivePaidAmount(summaryPayments.filter((payment) => payment.type === "DEPOSIT"));
  const installmentTotal = getEffectivePaidAmount(summaryPayments.filter((payment) => payment.type === "INSTALLMENT"));
  const pendingCount = summaryPayments.filter((payment) => payment.status === "PENDING").length;
  const contractsRemaining = summaryContracts.reduce((sum, contract) => {
    const paid = getContractPaidAmount(contract.payments, contract.depositAmount);
    return sum + getContractRemainingAmount(contract.finalTotal, paid);
  }, 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const firstItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalCount);
  const currentParams = {
    q: query || undefined,
    type: selectedType ?? undefined,
    status: selectedStatus ?? undefined,
    methodId: methodId ?? undefined,
    contractId: contractId ?? undefined,
    customerId: customerId ?? undefined,
    from: params.from || undefined,
    to: params.to || undefined,
    sort,
    view: viewMode === "contract" ? "contract" : undefined,
  };

  return (
    <section className="space-y-4 sm:space-y-5">
      <PageHeader tenantName={membership.tenant.name} todayLabel={`${formatJalaliWeekday(new Date())}، ${formatJalaliDate(new Date())}`} />

      {params.canceled ? <Notice tone="success">دریافت با موفقیت لغو شد و مانده قرارداد دوباره محاسبه شد.</Notice> : null}
      {params.paymentError ? <Notice tone="danger">درخواست دریافت معتبر نبود یا دسترسی شما مجاز نیست.</Notice> : null}

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-6">
        <KpiCard icon={Coins} label="مجموع دریافت‌ها" value={formatIRR(totalReceived)} />
        <KpiCard icon={CalendarDays} label="دریافت‌های ماه جاری" value={formatIRR(monthReceived)} />
        <KpiCard icon={Banknote} label="بیعانه‌های ثبت‌شده" value={formatIRR(depositTotal)} />
        <KpiCard icon={WalletCards} label="اقساط دریافت‌شده" value={formatIRR(installmentTotal)} />
        <KpiCard icon={FileText} label="مانده قراردادها" value={formatIRR(contractsRemaining)} />
        <KpiCard icon={ShieldAlert} label="در انتظار تأیید" value={formatPersianNumber(pendingCount)} />
      </div>

      <FilterToolbar
        query={query}
        type={selectedType}
        status={selectedStatus}
        methodId={methodId ?? "all"}
        contractId={contractId ?? "all"}
        customerId={customerId ?? "all"}
        from={params.from ?? ""}
        to={params.to ?? ""}
        sort={sort}
        viewMode={viewMode}
        methods={methods}
        contracts={contracts}
        customers={customers}
      />

      {payments.length > 0 ? (
        <div className="space-y-2.5">
          <div className="flex flex-col gap-2 rounded-[1.15rem] border border-[#d8c08b]/48 bg-[#fff9ee]/82 px-4 py-2.5 text-[#111827] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-[#17483f]">
                <CreditCard size={17} />
                تراکنش‌های دریافت
              </div>
              <p className="mt-1 text-[0.72rem] font-bold text-[#7d6841]">دفتر دریافت‌ها با نمایش فشرده و قابل پیگیری.</p>
            </div>
            <p className="rounded-full border border-[#d8c08b]/48 bg-white/55 px-3 py-1 text-xs font-black text-[#7d6841]">
              نمایش {formatPersianNumber(firstItem)} تا {formatPersianNumber(lastItem)} از {formatPersianNumber(totalCount)} تراکنش
            </p>
          </div>
          {viewMode === "contract" ? (
            <GroupedPaymentLedger payments={payments} canEdit={canEdit} returnTo={buildPaymentsHref({ ...currentParams, page })} />
          ) : (
            <div className="grid gap-3">
              {payments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  canEdit={canEdit}
                  returnTo={buildPaymentsHref({ ...currentParams, page })}
                />
              ))}
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} currentParams={currentParams} />
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}


function PageHeader({ tenantName, todayLabel }: { tenantName: string; todayLabel: string }) {
  return (
    <div className="overflow-hidden rounded-[1.45rem] border border-[#d8c08b]/58 bg-[radial-gradient(circle_at_10%_0%,rgba(199,161,90,0.16),transparent_16rem),linear-gradient(145deg,rgba(255,249,238,0.98),rgba(247,236,211,0.94))] p-4 text-[#111827] shadow-[0_18px_58px_rgba(17,24,39,0.08)] sm:rounded-[1.75rem] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/30 bg-[#c7a15a]/10 px-3 py-1 text-[0.72rem] font-black text-[#17483f]">
            <CreditCard size={14} />
            مدیریت دریافتی‌ها
          </div>
          <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">دفتر دریافت‌های قراردادها</h1>
          <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49]">
            بیعانه، اقساط، تسویه و برگشت وجه را در یک دفتر مالی فشرده و قابل پیگیری مدیریت کنید.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:min-w-[25rem] lg:grid-cols-1">
          <div className="rounded-[1.15rem] border border-[#111827]/10 bg-[#111827] px-4 py-3 text-[#fff8ea] shadow-[0_14px_38px_rgba(17,24,39,0.14)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[0.68rem] font-black text-[#f0dba9]">فضای کاری فعال</p>
                <p className="mt-1 text-base font-black">{tenantName}</p>
              </div>
              <div className="text-right text-[0.7rem] font-bold leading-6 text-[#d9caa9] sm:text-left">
                <p>امروز: {todayLabel}</p>
                <p>ماه مالی: {formatJalaliMonthYear(new Date())}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link href="/dashboard/payments/new" className="btn-luxury-dark min-h-11 px-4 py-2 text-sm">
              <Plus size={16} />
              ثبت دریافت جدید
            </Link>
            <Link href="/dashboard/payment-methods" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/58 bg-[#fff8ea]/78 px-4 py-2 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70">
              <Landmark size={16} />
              روش‌های دریافت
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrerequisiteState({ tenantName }: { tenantName: string }) {
  return (
    <section className="space-y-5 sm:space-y-7">
      <PageHeader tenantName={tenantName} todayLabel={`${formatJalaliWeekday(new Date())}، ${formatJalaliDate(new Date())}`} />
      <div className="rounded-[2rem] border border-dashed border-[#c7a15a]/58 bg-[#fff9ee]/92 p-6 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.08)]">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
          <Landmark size={22} />
        </span>
        <h2 className="mt-4 text-2xl font-black">ابتدا روش دریافت تعریف کنید</h2>
        <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-[#6d5f49]">
          برای ثبت دریافت‌ها، ابتدا روش‌های دریافت مانند نقدی، کارت‌خوان، حواله یا چک را در تعاریف پایه ثبت کنید.
        </p>
        <Link href="/dashboard/payment-methods" className="btn-luxury-primary mt-5 px-5 py-3">
          تعریف روش دریافت
          <ArrowLeft size={17} />
        </Link>
      </div>
    </section>
  );
}

function Notice({ children, tone }: { children: ReactNode; tone: "success" | "danger" }) {
  return (
    <div className={`rounded-3xl border px-5 py-4 text-sm font-black ${tone === "success" ? "border-[#25a46d]/22 bg-[#ecfff5] text-[#17483f]" : "border-[#b45353]/18 bg-[#fff1f1] text-[#8f2c2c]"}`}>
      {children}
    </div>
  );
}


function KpiCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <article className="flex min-h-[6.1rem] items-center gap-3 rounded-[1.2rem] border border-[#d8c08b]/54 bg-[#fff9ee]/94 p-3 text-[#111827] shadow-[0_14px_42px_rgba(17,24,39,0.055)] sm:rounded-[1.35rem]">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]"><Icon size={16} /></span>
      <div className="min-w-0">
        <p className="text-[0.72rem] font-black leading-5 text-[#7d6841]">{label}</p>
        <p className="mt-1 break-words text-base font-black leading-tight sm:text-lg">{value}</p>
      </div>
    </article>
  );
}


function FilterToolbar({
  query,
  type,
  status,
  methodId,
  contractId,
  customerId,
  from,
  to,
  sort,
  viewMode,
  methods,
  contracts,
  customers,
}: {
  query: string;
  type: PaymentTypeValue | undefined;
  status: PaymentRecordStatus | undefined;
  methodId: string;
  contractId: string;
  customerId: string;
  from: string;
  to: string;
  sort: SortKey;
  viewMode: "payment" | "contract";
  methods: Array<{ id: string; title: string; type: keyof typeof paymentMethodTypeLabels; isDefault: boolean }>;
  contracts: Array<{ id: string; contractNo: string; customer: { fullName: string; phone: string } }>;
  customers: Array<{ id: string; fullName: string; phone: string }>;
}) {
  return (
    <form action="/dashboard/payments" className="rounded-[1.35rem] border border-[#d8c08b]/56 bg-[#fff9ee]/92 p-3.5 text-[#111827] shadow-[0_16px_48px_rgba(17,24,39,0.06)] sm:rounded-[1.65rem] sm:p-4">
      {viewMode === "contract" ? <input type="hidden" name="view" value="contract" /> : null}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-[#17483f]"><Filter size={17} />جست‌وجو و فیلتر دریافتی‌ها</div>
          <p className="mt-1 text-[0.72rem] font-bold text-[#7d6841]">فیلترها بدون تغییر رفتار، فقط فشرده‌تر و خواناتر نمایش داده می‌شوند.</p>
        </div>
        <div className="flex w-full items-center gap-1 rounded-2xl border border-[#d8c08b]/48 bg-[#fff8ea]/70 p-1 text-xs font-black text-[#7d6841] lg:w-auto">
          <Link href={buildPaymentsHref({ q: query || undefined, type: type ?? undefined, status: status ?? undefined, methodId, contractId, customerId, from: from || undefined, to: to || undefined, sort })} className={`inline-flex min-h-9 flex-1 items-center justify-center rounded-xl px-3 transition lg:flex-none ${viewMode === "payment" ? "bg-[#111827] text-[#fff8ea]" : "text-[#7d6841] hover:bg-white/55"}`}>همه دریافت‌ها</Link>
          <Link href={buildPaymentsHref({ q: query || undefined, type: type ?? undefined, status: status ?? undefined, methodId, contractId, customerId, from: from || undefined, to: to || undefined, sort, view: "contract" })} className={`inline-flex min-h-9 flex-1 items-center justify-center rounded-xl px-3 transition lg:flex-none ${viewMode === "contract" ? "bg-[#111827] text-[#fff8ea]" : "text-[#7d6841] hover:bg-white/55"}`}>گروه قراردادها</Link>
        </div>
      </div>
      <div className="mt-3 grid gap-2.5 lg:grid-cols-[minmax(0,1.55fr)_repeat(3,minmax(0,0.9fr))]">
        <label className="grid gap-1.5 text-xs font-black text-[#172033]">
          <span>جست‌وجو</span>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9f7131]" />
            <input name="q" defaultValue={query} placeholder="نام مشتری، شماره قرارداد، همراه، کد رهگیری یا شماره چک" className="input-luxury min-h-10 py-2 pl-10 text-sm" />
          </div>
        </label>
        <Select name="type" label="نوع دریافت" defaultValue={type ?? "all"}>
          <option value="all">همه انواع</option>
          {paymentTypeValues.map((item) => <option key={item} value={item}>{paymentTypeLabels[item]}</option>)}
        </Select>
        <Select name="status" label="وضعیت دریافت" defaultValue={status ?? "all"}>
          <option value="all">همه وضعیت‌ها</option>
          {paymentStatusValues.map((item) => <option key={item} value={item}>{paymentStatusRecordLabels[item]}</option>)}
        </Select>
        <Select name="sort" label="مرتب‌سازی" defaultValue={sort}>
          {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </div>
      <div className="mt-2.5 grid gap-2.5 md:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_minmax(12rem,0.82fr)]">
        <Select name="methodId" label="روش دریافت" defaultValue={methodId}>
          <option value="all">همه روش‌ها</option>
          {methods.map((method) => <option key={method.id} value={method.id}>{formatPaymentMethodLabel(method)}</option>)}
        </Select>
        <Select name="contractId" label="قرارداد" defaultValue={contractId}>
          <option value="all">همه قراردادها</option>
          {contracts.map((contract) => <option key={contract.id} value={contract.id}>{toPersianDigits(contract.contractNo)} - {contract.customer.fullName}</option>)}
        </Select>
        <Select name="customerId" label="مشتری" defaultValue={customerId}>
          <option value="all">همه مشتری‌ها</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName} - {toPersianDigits(customer.phone)}</option>)}
        </Select>
        <JalaliDatePicker name="from" label="از تاریخ دریافت" defaultValue={from} />
        <JalaliDatePicker name="to" label="تا تاریخ دریافت" defaultValue={to} />
        <div className="grid grid-cols-2 gap-2 self-end">
          <button type="submit" className="btn-luxury-dark min-h-10 px-4 py-2 text-sm">اعمال</button>
          <Link href="/dashboard/payments" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/58 bg-[#fff8ea]/76 px-3 py-2 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"><RotateCcw size={15} />حذف</Link>
        </div>
      </div>
    </form>
  );
}

function Select({ name, label, defaultValue, children }: { name: string; label: string; defaultValue: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-[#172033]">
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue} className="input-luxury min-h-10 py-2 text-sm">{children}</select>
    </label>
  );
}


function getPaymentSequence(payment: PaymentListItem) {
  const records = payment.contract?.payments
    ? [...payment.contract.payments].sort((a, b) => {
        const paidDiff = a.paidAt.getTime() - b.paidAt.getTime();
        return paidDiff !== 0 ? paidDiff : a.createdAt.getTime() - b.createdAt.getTime();
      })
    : [];

  const total = records.length;
  const index = records.findIndex((record) => record.id === payment.id);

  return total > 1 && index >= 0 ? { index: index + 1, total } : null;
}

function getPaymentLedgerTitle(payment: PaymentListItem) {
  if (payment.type === "DEPOSIT") return "بیعانه اولیه قرارداد";
  if (payment.type === "INSTALLMENT") return "قسط قرارداد";
  if (payment.type === "FINAL_SETTLEMENT") return "تسویه نهایی قرارداد";
  if (payment.type === "EXTRA_SERVICE") return "دریافت خدمات اضافه";
  if (payment.type === "REFUND") return "برگشت وجه قرارداد";
  if (payment.type === "ADJUSTMENT") return "اصلاحیه مالی قرارداد";
  return "تراکنش دریافت";
}


function PaymentCard({ payment, canEdit, returnTo }: { payment: PaymentListItem; canEdit: boolean; returnTo: string }) {
  const customerName = payment.customer?.fullName ?? payment.contract?.customer.fullName ?? "مشتری ثبت نشده";
  const customerPhone = payment.customer?.phone ?? payment.contract?.customer.phone ?? "";
  const paidAmount = payment.contract ? getContractPaidAmount(payment.contract.payments, payment.contract.depositAmount) : 0;
  const remainingAmount = payment.contract
    ? payment.contract.status === "CANCELED"
      ? 0
      : getContractRemainingAmount(payment.contract.finalTotal, paidAmount)
    : 0;
  const paymentSummary = payment.contract
    ? payment.contract.status === "CANCELED"
      ? "PAID"
      : getPaymentStatusSummary(payment.contract.finalTotal, paidAmount)
    : undefined;
  const sequence = getPaymentSequence(payment);
  const sequenceLabel = sequence ? `دریافت ${formatPersianNumber(sequence.index)} از ${formatPersianNumber(sequence.total)}` : "تراکنش دریافت";

  return (
    <article className="overflow-hidden rounded-[1.35rem] border border-[#d8c08b]/56 bg-[#fff9ee]/96 text-[#111827] shadow-[0_16px_46px_rgba(17,24,39,0.065)] transition hover:-translate-y-0.5 hover:border-[#c7a15a]/72 hover:shadow-[0_22px_64px_rgba(17,24,39,0.095)] sm:rounded-[1.65rem]">
      <div className="grid gap-3 p-3.5 xl:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.72fr)_minmax(14rem,0.58fr)] xl:items-stretch sm:p-4">
        <div className="min-w-0 rounded-[1.15rem] border border-[#d8c08b]/42 bg-white/42 p-3.5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-black ${getPaymentTypeStyle(payment.type)}`}>{getPaymentTypeLabel(payment.type)}</span>
                <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-black ${getPaymentRecordStatusStyle(payment.status)}`}>{getPaymentRecordStatusLabel(payment.status)}</span>
                <span className="rounded-full border border-[#d8c08b]/58 bg-[#fff8ea]/78 px-2.5 py-1 text-[0.68rem] font-black text-[#7d6841]">{sequenceLabel}</span>
                {payment.cheques.length ? <span className="rounded-full border border-[#c7a15a]/30 bg-[#c7a15a]/10 px-2.5 py-1 text-[0.68rem] font-black text-[#7d6841]">دریافت چکی</span> : null}
                {payment.installments.length ? <span className="rounded-full border border-[#25a46d]/22 bg-[#25a46d]/10 px-2.5 py-1 text-[0.68rem] font-black text-[#17483f]">{formatPersianNumber(payment.installments.length)} قسط</span> : null}
              </div>
              <h2 className="mt-2 text-base font-black leading-7 sm:text-lg">{getPaymentLedgerTitle(payment)}</h2>
              <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">
                {customerName} {customerPhone ? `· ${toPersianDigits(customerPhone)}` : ""}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#111827]/10 bg-[#111827] px-3.5 py-2.5 text-[#fff8ea] md:min-w-[11rem] md:text-left">
              <p className="text-[0.68rem] font-black text-[#f0dba9]">مبلغ دریافتی</p>
              <p className="mt-1 text-base font-black leading-tight sm:text-lg">{formatIRR(toNumber(payment.amount))}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-xs font-bold text-[#7d6841] md:grid-cols-2">
            <LedgerMetaPill icon={<CalendarDays size={14} />} label="تاریخ دریافت" value={`${formatJalaliDate(payment.paidAt)} ساعت ${formatJalaliTime(payment.paidAt)}`} />
            <LedgerMetaPill icon={<CalendarDays size={14} />} label="ثبت در سامانه" value={`${formatJalaliDate(payment.createdAt)} ساعت ${formatJalaliTime(payment.createdAt)}`} />
            <LedgerMetaPill icon={<CalendarDays size={14} />} label="آخرین تغییر" value={`${formatJalaliDate(payment.updatedAt)} ساعت ${formatJalaliTime(payment.updatedAt)}`} />
            <LedgerMetaPill icon={<Landmark size={14} />} label="روش" value={formatPaymentMethodLabel(payment.paymentMethod)} />
          </div>
        </div>

        <div className="grid gap-2.5 rounded-[1.15rem] border border-[#d8c08b]/48 bg-[#fff8ea]/66 p-3.5 text-sm font-bold text-[#6d5f49]">
          <div className="flex items-center justify-between gap-3 border-b border-[#d8c08b]/38 pb-2.5">
            <span className="text-xs font-black text-[#7d6841]">پرونده مرتبط</span>
            {payment.contract ? (
              <Link href={`/dashboard/contracts/${payment.contract.id}`} className="rounded-full border border-[#111827]/12 bg-[#111827]/7 px-3 py-1 text-xs font-black text-[#172033] hover:bg-[#111827] hover:text-[#fff8ea]">
                {toPersianDigits(payment.contract.contractNo)}
              </Link>
            ) : (
              <span className="rounded-full border border-[#d8c08b]/52 bg-white/50 px-3 py-1 text-xs font-black text-[#7d6841]">بدون قرارداد</span>
            )}
          </div>
          <InfoRow label="مشتری" value={customerName} />
          <InfoRow label="موبایل" value={customerPhone ? toPersianDigits(customerPhone) : "ثبت نشده"} />
          <InfoRow label="تاریخ مراسم" value={payment.contract ? formatJalaliDate(payment.contract.eventDate) : "—"} />
          <InfoRow label="وضعیت قرارداد" value={payment.contract ? contractStatusLabels[payment.contract.status] : "—"} />
          {paymentSummary ? <InfoRow label="وضعیت تسویه" value={paymentStatusLabels[paymentSummary]} strong /> : null}
          {payment.contract ? <InfoRow label="مانده قرارداد" value={formatIRR(remainingAmount)} strong /> : null}
        </div>

        <div className="grid content-between gap-2.5 rounded-[1.15rem] border border-[#d8c08b]/42 bg-white/35 p-3">
          <div className="grid gap-1.5 text-xs font-bold leading-6 text-[#7d6841]">
            <InfoRow label="کد/مرجع" value={formatReference(payment)} />
            <InfoRow label="روش دریافت" value={formatPaymentMethodLabel(payment.paymentMethod)} />
            {payment.cheques[0] ? <InfoRow label="وضعیت چک" value={getChequeStatusLabel(payment.cheques[0].status)} /> : null}
            {payment.installments.length ? <InfoRow label="تعداد اقساط" value={formatPersianNumber(payment.installments.length)} /> : null}
            {payment.installments[0] ? <InfoRow label="نزدیک‌ترین سررسید" value={formatJalaliDate(payment.installments[0].dueDate)} /> : null}
            <p className="rounded-2xl border border-[#d8c08b]/40 bg-[#fff8ea]/68 px-3 py-2 text-xs font-bold leading-6 text-[#7d6841]">
              {payment.note || payment.reference || "توضیحی برای این تراکنش ثبت نشده است."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/dashboard/payments/${payment.id}`} className="btn-luxury-dark min-h-10 px-3 py-2 text-xs"><Eye size={15} />جزئیات</Link>
            {payment.contract ? (
              <Link href={`/dashboard/contracts/${payment.contract.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/58 bg-[#fff8ea]/76 px-3 py-2 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"><FileText size={15} />قرارداد</Link>
            ) : (
              <Link href={`/dashboard/payments/${payment.id}/edit`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/58 bg-[#fff8ea]/76 px-3 py-2 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"><FileText size={15} />ویرایش</Link>
            )}
            <Link href={`/dashboard/payments/${payment.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/58 bg-[#fff8ea]/76 px-3 py-2 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"><Printer size={15} />چاپ رسید</Link>
            {canEdit && payment.status !== "CANCELED" ? (
              <form action={cancelPaymentAction}>
                <input type="hidden" name="paymentId" value={payment.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button type="submit" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[#b45353]/18 bg-[#fff1f1] px-3 py-2 text-xs font-black text-[#8f2c2c] transition hover:border-[#b45353]/40"><XCircle size={15} />لغو دریافت</button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}


function LedgerMetaPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 rounded-2xl border border-[#d8c08b]/45 bg-[#fff8ea]/64 px-3 py-2">
      <span className="shrink-0 text-[#9f7131]">{icon}</span>
      <span className="min-w-0 truncate"><span className="text-[#9f7131]">{label}: </span>{value}</span>
    </span>
  );
}

function GroupedPaymentLedger({ payments, canEdit, returnTo }: { payments: PaymentListItem[]; canEdit: boolean; returnTo: string }) {
  const groups = payments.reduce<Array<{ key: string; contract: PaymentListItem["contract"]; payments: PaymentListItem[] }>>((items, payment) => {
    const key = payment.contract?.id ?? `payment-${payment.id}`;
    const existing = items.find((item) => item.key === key);
    if (existing) {
      existing.payments.push(payment);
      return items;
    }
    return [...items, { key, contract: payment.contract, payments: [payment] }];
  }, []);

  return (
    <div className="grid gap-3">
      {groups.map((group) => {
        const firstPayment = group.payments[0];
        const customerName = firstPayment.customer?.fullName ?? group.contract?.customer.fullName ?? "مشتری ثبت نشده";
        const paidAmount = group.contract ? getContractPaidAmount(group.contract.payments, group.contract.depositAmount) : getEffectivePaidAmount(group.payments);
        const remainingAmount = group.contract
          ? group.contract.status === "CANCELED"
            ? 0
            : getContractRemainingAmount(group.contract.finalTotal, paidAmount)
          : 0;
        const paymentCount = group.contract?.payments.length ?? group.payments.length;

        return (
          <article key={group.key} className="rounded-[1.35rem] border border-[#d8c08b]/56 bg-[#fff9ee]/96 p-3.5 text-[#111827] shadow-[0_16px_46px_rgba(17,24,39,0.06)] sm:rounded-[1.6rem] sm:p-4">
            <div className="flex flex-col gap-3 border-b border-[#d8c08b]/45 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#111827]/14 bg-[#111827] px-3 py-1 text-xs font-black text-[#fff8ea]">{formatPersianNumber(paymentCount)} دریافت</span>
                  <span className="rounded-full border border-[#c7a15a]/32 bg-[#c7a15a]/12 px-3 py-1 text-xs font-black text-[#7d6841]">گروه قرارداد</span>
                </div>
                <h2 className="mt-3 text-lg font-black leading-7 sm:text-xl">
                  {group.contract ? `قرارداد ${toPersianDigits(group.contract.contractNo)} — ${customerName}` : `دریافت بدون قرارداد — ${customerName}`}
                </h2>
                <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">
                  {group.contract ? `تاریخ مراسم ${formatJalaliDate(group.contract.eventDate)} · ${contractStatusLabels[group.contract.status]}` : "تراکنش‌های بدون قرارداد مرتبط"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[28rem]">
                <MiniMetric label="مبلغ نهایی" value={group.contract ? formatIRR(toNumber(group.contract.finalTotal)) : "—"} />
                <MiniMetric label="دریافت‌شده" value={formatIRR(paidAmount)} />
                <MiniMetric label="مانده" value={group.contract ? formatIRR(remainingAmount) : "—"} emphasis />
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              {group.payments.map((payment) => (
                <CompactPaymentRow key={payment.id} payment={payment} canEdit={canEdit} returnTo={returnTo} />
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function CompactPaymentRow({ payment, canEdit, returnTo }: { payment: PaymentListItem; canEdit: boolean; returnTo: string }) {
  const sequence = getPaymentSequence(payment);
  return (
    <div className="grid gap-2.5 rounded-2xl border border-[#d8c08b]/48 bg-[#fff8ea]/68 p-2.5 md:grid-cols-[minmax(0,1.25fr)_minmax(11rem,0.5fr)_minmax(13rem,0.58fr)] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-black ${getPaymentTypeStyle(payment.type)}`}>{getPaymentTypeLabel(payment.type)}</span>
          <span className={`rounded-full border px-3 py-1 text-xs font-black ${getPaymentRecordStatusStyle(payment.status)}`}>{getPaymentRecordStatusLabel(payment.status)}</span>
          {sequence ? <span className="rounded-full border border-[#d8c08b]/62 bg-white/50 px-3 py-1 text-xs font-black text-[#7d6841]">دریافت {formatPersianNumber(sequence.index)} از {formatPersianNumber(sequence.total)}</span> : null}
          {payment.cheques.length ? <span className="rounded-full border border-[#c7a15a]/32 bg-[#c7a15a]/12 px-3 py-1 text-xs font-black text-[#7d6841]">چکی</span> : null}
          {payment.installments.length ? <span className="rounded-full border border-[#25a46d]/22 bg-[#25a46d]/10 px-3 py-1 text-xs font-black text-[#17483f]">{formatPersianNumber(payment.installments.length)} قسط</span> : null}
        </div>
        <p className="mt-2 text-sm font-black text-[#111827]">{getPaymentLedgerTitle(payment)}</p>
        <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">{formatJalaliDate(payment.paidAt)} · {formatPaymentMethodLabel(payment.paymentMethod)} · {formatReference(payment)}</p>
      </div>
      <div className="rounded-2xl border border-[#111827]/10 bg-[#111827] px-4 py-3 text-[#fff8ea]">
        <p className="text-[0.68rem] font-black text-[#f0dba9]">مبلغ دریافتی</p>
        <p className="mt-1 text-base font-black">{formatIRR(toNumber(payment.amount))}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link href={`/dashboard/payments/${payment.id}`} className="btn-luxury-dark min-h-10 px-3 py-2 text-xs"><Eye size={15} />جزئیات</Link>
        {canEdit && payment.status !== "CANCELED" ? (
          <form action={cancelPaymentAction}>
            <input type="hidden" name="paymentId" value={payment.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button type="submit" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[#b45353]/18 bg-[#fff1f1] px-3 py-2 text-xs font-black text-[#8f2c2c] transition hover:border-[#b45353]/40"><XCircle size={15} />لغو</button>
          </form>
        ) : (
          <Link href={`/dashboard/payments/${payment.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-3 py-2 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"><Printer size={15} />رسید</Link>
        )}
      </div>
    </div>
  );
}

function getChequeStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "CLEARED":
      return "وصول‌شده";
    case "BOUNCED":
      return "برگشتی";
    case "CANCELED":
      return "لغوشده";
    case "TRANSFERRED":
      return "خرج‌شده / واگذار شده";
    default:
      return "در انتظار وصول";
  }
}

function MiniMetric({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-2xl border px-3 py-2 ${emphasis ? "border-[#25a46d]/22 bg-[#25a46d]/10" : "border-[#d8c08b]/52 bg-[#fff8ea]/72"}`}>
      <p className="text-[0.68rem] font-black text-[#7d6841]">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-[#111827]">{value}</p>
    </div>
  );
}

function InfoRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3"><span>{label}</span><span className={strong ? "font-black text-[#17483f]" : "font-black text-[#111827]"}>{value}</span></div>
  );
}


function Pagination({ page, totalPages, currentParams }: { page: number; totalPages: number; currentParams: Record<string, string | number | undefined> }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex flex-col gap-3 rounded-[1.15rem] border border-[#d8c08b]/48 bg-[#fff9ee]/84 px-4 py-3 text-[#111827] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-black text-[#17483f]">صفحه {formatPersianNumber(page)} از {formatPersianNumber(totalPages)}</p>
      <div className="flex gap-2">
        <Link href={buildPaymentsHref({ ...currentParams, page: Math.max(1, page - 1) })} aria-disabled={page <= 1} className={`inline-flex min-h-10 items-center justify-center rounded-2xl border px-4 text-sm font-black ${page <= 1 ? "pointer-events-none border-[#d8c08b]/36 bg-[#f5ead3]/60 text-[#9b8b70]" : "border-[#d8c08b]/62 bg-[#fff8ea]/76 text-[#7d6841] hover:border-[#c7a15a]/70"}`}>قبلی</Link>
        <Link href={buildPaymentsHref({ ...currentParams, page: Math.min(totalPages, page + 1) })} aria-disabled={page >= totalPages} className={`inline-flex min-h-10 items-center justify-center rounded-2xl border px-4 text-sm font-black ${page >= totalPages ? "pointer-events-none border-[#d8c08b]/36 bg-[#f5ead3]/60 text-[#9b8b70]" : "border-[#111827]/16 bg-[#111827] text-[#fff8ea] hover:border-[#c7a15a]/60"}`}>بعدی</Link>
      </div>
    </nav>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[2rem] border border-dashed border-[#c7a15a]/58 bg-[#fff9ee]/92 p-6 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.08)]">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]"><CreditCard size={22} /></span>
      <h2 className="mt-4 text-xl font-black">هنوز دریافتی ثبت نشده است</h2>
      <p className="mt-3 max-w-3xl leading-8 text-[#6d5f49]">برای ثبت بیعانه، اقساط یا تسویه قراردادها، اولین دریافت را ثبت کنید.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/dashboard/payments/new" className="btn-luxury-primary px-5 py-3"><Plus size={18} />ثبت اولین دریافت</Link>
        <Link href="/dashboard/payment-methods" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/64 bg-[#fff8ea]/82 px-5 py-3 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"><Landmark size={18} />تعریف روش دریافت</Link>
      </div>
    </div>
  );
}
