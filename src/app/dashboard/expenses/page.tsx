import type { PaymentMethodType, Prisma } from "@prisma/client";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Eye,
  FileText,
  Filter,
  FolderTree,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  TrendingDown,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cancelExpenseAction } from "@/lib/actions/expense-actions";
import { requireTenantMember } from "@/lib/auth/session";
import {
  formatJalaliDate,
  formatJalaliTime,
  getJalaliMonthRange,
  getTodayJalali,
  jalaliToDate,
  parseDateLikeToDate,
  toPersianDigits,
} from "@/lib/date/jalali";
import {
  expenseStatusOptions,
  getExpenseChequeStatusLabel,
  getExpenseChequeStatusStyle,
  getExpenseStatusLabel,
  getExpenseStatusStyle,
  isExpenseCountable,
  isExpenseStatus,
  type ExpenseStatus,
} from "@/lib/expenses/display";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { formatPaymentMethodLabel } from "@/lib/payments/display";
import { getPrisma } from "@/lib/prisma";
import { toEnglishDigits } from "@/lib/validation/normalizers";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";

type ExpensesPageProps = {
  searchParams: Promise<{
    q?: string;
    from?: string;
    to?: string;
    categoryId?: string;
    paymentMethodId?: string;
    status?: string;
    hallId?: string;
    salonId?: string;
    contractId?: string;
    sort?: string;
    canceled?: string;
    expenseError?: string;
  }>;
};


const secondaryGoldButtonClass =
  "btn-luxury-secondary !border-[#c7a15a] !bg-[#fff7e6] !text-[#4a3514] shadow-sm hover:!border-[#b98a3a] hover:!bg-[#f4dfaa] hover:!text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a15a]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff9ee]";
const secondaryNeutralButtonClass =
  "btn-luxury-secondary !border-[#d8c08b] !bg-white/80 !text-[#172033] shadow-sm hover:!border-[#c7a15a] hover:!bg-[#fff1d6] hover:!text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a15a]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff9ee]";
const disabledNeutralButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-[#f7edd9]/70 px-5 py-2 text-sm font-black text-[#7d6841] opacity-80";
const secondarySuccessButtonClass =
  "btn-luxury-secondary !border-[#17483f]/35 !bg-[#eaf7ef] !text-[#17483f] shadow-sm hover:!border-[#17483f]/55 hover:!bg-[#d9f1e4] hover:!text-[#0f302a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25a46d]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff9ee]";
const secondaryDangerButtonClass =
  "btn-luxury-secondary !border-[#b45353]/35 !bg-[#fff1f1] !text-[#8f2c2c] shadow-sm hover:!border-[#b45353]/55 hover:!bg-[#ffe2e2] hover:!text-[#6f1f1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b45353]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff9ee]";

type SortKey =
  | "newest"
  | "oldest"
  | "highestAmount"
  | "lowestAmount"
  | "category";
const sortLabels: Record<SortKey, string> = {
  newest: "جدیدترین",
  oldest: "قدیمی‌ترین",
  highestAmount: "بیشترین مبلغ",
  lowestAmount: "کمترین مبلغ",
  category: "دسته‌بندی",
};

const expenseListSelect = {
  id: true,
  title: true,
  amount: true,
  occurredAt: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  description: true,
  vendorName: true,
  referenceNumber: true,
  receiptImageUrl: true,
  note: true,
  contractId: true,
  financialCategory: {
    select: { id: true, title: true, color: true, type: true },
  },
  paymentMethod: { select: { id: true, title: true, type: true } },
  contract: {
    select: { id: true, contractNo: true, eventDate: true, title: true },
  },
  customer: { select: { id: true, fullName: true, phone: true } },
  hall: { select: { id: true, name: true } },
  salon: { select: { id: true, name: true } },
  cheques: {
    select: { amount: true, dueDate: true, status: true, chequeNumber: true },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
} satisfies Prisma.ExpenseSelect;

type ExpenseListItem = Prisma.ExpenseGetPayload<{
  select: typeof expenseListSelect;
}>;

function normalizeFilterValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized !== "all" ? normalized : undefined;
}

function parseSort(value: string | undefined): SortKey {
  return value === "oldest" ||
    value === "highestAmount" ||
    value === "lowestAmount" ||
    value === "category"
    ? value
    : "newest";
}

function parseJalaliFilterDate(value: string | undefined) {
  if (!value) return null;
  return parseDateLikeToDate(toEnglishDigits(value).replace(/[\/\.]/g, "-"));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getOrderBy(sort: SortKey): Prisma.ExpenseOrderByWithRelationInput[] {
  if (sort === "oldest") return [{ occurredAt: "asc" }, { createdAt: "asc" }];
  if (sort === "highestAmount")
    return [{ amount: "desc" }, { occurredAt: "desc" }];
  if (sort === "lowestAmount")
    return [{ amount: "asc" }, { occurredAt: "desc" }];
  if (sort === "category")
    return [
      { financialCategoryId: "asc" },
      { occurredAt: "desc" },
      { createdAt: "desc" },
    ];
  return [{ occurredAt: "desc" }, { createdAt: "desc" }];
}

function toNumber(
  value: { toString(): string } | string | number | null | undefined,
) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function ExpensesPage({
  searchParams,
}: ExpensesPageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const params = await searchParams;
  const tenantId = membership.tenantId;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";
  const query = params.q?.trim() ?? "";
  const fromDate = parseJalaliFilterDate(params.from);
  const toDate = parseJalaliFilterDate(params.to);
  const categoryId = normalizeFilterValue(params.categoryId);
  const paymentMethodId = normalizeFilterValue(params.paymentMethodId);
  const status = isExpenseStatus(params.status) ? params.status : undefined;
  const hallId = normalizeFilterValue(params.hallId);
  const salonId = normalizeFilterValue(params.salonId);
  const contractId = normalizeFilterValue(params.contractId);
  const sort = parseSort(params.sort);
  const today = getTodayJalali();
  const currentMonth = getJalaliMonthRange(today.year, today.month);

  const where: Prisma.ExpenseWhereInput = {
    tenantId,
    ...(categoryId ? { financialCategoryId: categoryId } : {}),
    ...(paymentMethodId ? { paymentMethodId } : {}),
    ...(status ? { status } : {}),
    ...(hallId ? { hallId } : {}),
    ...(salonId ? { salonId } : {}),
    ...(contractId ? { contractId } : {}),
    ...(fromDate || toDate
      ? {
          occurredAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lt: addDays(toDate, 1) } : {}),
          },
        }
      : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
            { note: { contains: query } },
            { vendorName: { contains: query } },
            { referenceNumber: { contains: toEnglishDigits(query) } },
            {
              contract: {
                is: {
                  OR: [
                    { contractNo: { contains: toEnglishDigits(query) } },
                    { title: { contains: query } },
                  ],
                },
              },
            },
            {
              customer: {
                is: {
                  OR: [
                    { fullName: { contains: query } },
                    { phone: { contains: toEnglishDigits(query) } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const [
    expenses,
    categories,
    paymentMethods,
    halls,
    salons,
    contracts,
    allForSummary,
    currentMonthExpenses,
  ] = await Promise.all([
    db.expense.findMany({
      where,
      select: expenseListSelect,
      orderBy: getOrderBy(sort),
      take: 50,
    }),
    db.financialCategory.findMany({
      where: { tenantId, type: "EXPENSE", isActive: true },
      select: { id: true, title: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    db.paymentMethod.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, title: true, type: true },
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { title: "asc" }],
    }),
    db.hall.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.salon.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, hallId: true },
      orderBy: { name: "asc" },
    }),
    db.contract.findMany({
      where: { tenantId },
      select: {
        id: true,
        contractNo: true,
        title: true,
        customer: { select: { fullName: true } },
      },
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    db.expense.findMany({
      where: { ...where, status: { not: "CANCELED" } },
      select: {
        amount: true,
        contractId: true,
        financialCategory: { select: { title: true } },
      },
    }),
    db.expense.findMany({
      where: {
        tenantId,
        status: { not: "CANCELED" },
        occurredAt: { gte: currentMonth.startDate, lt: currentMonth.endDate },
      },
      select: { amount: true },
    }),
  ]);

  const totalAmount = allForSummary.reduce(
    (sum, expense) => sum + toNumber(expense.amount),
    0,
  );
  const monthAmount = currentMonthExpenses.reduce(
    (sum, expense) => sum + toNumber(expense.amount),
    0,
  );
  const todayStart = jalaliToDate(today.year, today.month, today.day);
  const todayEnd = addDays(todayStart, 1);
  const todayAmount = expenses
    .filter(
      (expense) =>
        isExpenseCountable(expense.status) &&
        expense.occurredAt >= todayStart &&
        expense.occurredAt < todayEnd,
    )
    .reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const linkedToContractCount = allForSummary.filter(
    (expense) => expense.contractId,
  ).length;
  const topCategory = getTopCategory(allForSummary);
  const hasAnyExpense = await db.expense.count({ where: { tenantId } });

  return (
    <section className="space-y-4 sm:space-y-5">
      <PageHeader tenantName={membership.tenant.name} />

      {params.canceled ? (
        <Alert tone="success">
          هزینه با موفقیت لغو شد و در گزارش‌ها محاسبه نمی‌شود.
        </Alert>
      ) : null}
      {params.expenseError ? (
        <Alert tone="error">
          عملیات هزینه انجام نشد. لطفاً دوباره تلاش کنید.
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <SummaryCard
          label="مجموع هزینه‌ها"
          value={formatIRR(totalAmount)}
          icon={TrendingDown}
          tone="expense"
        />
        <SummaryCard
          label="هزینه‌های ماه جاری"
          value={formatIRR(monthAmount)}
          icon={CalendarDays}
        />
        <SummaryCard
          label="هزینه‌های امروز"
          value={formatIRR(todayAmount)}
          icon={Banknote}
        />
        <SummaryCard
          label="تعداد هزینه‌ها"
          value={formatPersianNumber(allForSummary.length)}
          icon={ReceiptText}
        />
        <SummaryCard
          label="مرتبط با قرارداد"
          value={formatPersianNumber(linkedToContractCount)}
          icon={FileText}
        />
        <SummaryCard
          label="بیشترین دسته هزینه"
          value={topCategory?.label ?? "ثبت نشده"}
          icon={FolderTree}
        />
      </div>

      <FilterBar
        query={query}
        from={params.from}
        to={params.to}
        categoryId={categoryId}
        paymentMethodId={paymentMethodId}
        status={status}
        hallId={hallId}
        salonId={salonId}
        contractId={contractId}
        sort={sort}
        categories={categories}
        paymentMethods={paymentMethods}
        halls={halls}
        salons={salons}
        contracts={contracts}
      />

      <AnalyticsSummary
        totalAmount={totalAmount}
        monthAmount={monthAmount}
        topCategory={topCategory}
        count={allForSummary.length}
      />

      <div className="space-y-3">
        {expenses.length ? (
          expenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} canEdit={canEdit} />
          ))
        ) : hasAnyExpense ? (
          <FilteredEmptyState />
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}

function getTopCategory(
  expenses: Array<{
    amount: { toString(): string } | string | number | null;
    financialCategory: { title: string } | null;
  }>,
) {
  const grouped = new Map<string, number>();
  expenses.forEach((expense) => {
    const label = expense.financialCategory?.title ?? "بدون دسته‌بندی";
    grouped.set(
      label,
      (grouped.get(label) ?? 0) + toNumber(expense.amount as never),
    );
  });
  const items = Array.from(grouped.entries()).map(([label, amount]) => ({
    label,
    amount,
  }));
  return items.length
    ? items.reduce(
        (top, item) => (item.amount > top.amount ? item : top),
        items[0],
      )
    : null;
}

function PageHeader({ tenantName }: { tenantName: string }) {
  return (
    <div className="overflow-hidden rounded-[1.55rem] border border-[#d8c08b]/60 bg-[linear-gradient(145deg,rgba(255,249,238,0.98),rgba(247,236,211,0.92))] p-4 text-[#111827] shadow-[0_16px_54px_rgba(17,24,39,0.08)] sm:rounded-[1.9rem] sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-[#7d6841]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c7a15a]/36 bg-[#fff4d8] px-2.5 py-1">
              <ReceiptText size={13} />
              عملیات مالی
            </span>
            <span className="rounded-full border border-[#d8c08b]/56 bg-white/55 px-2.5 py-1">
              {tenantName}
            </span>
            <span className="rounded-full border border-[#d8c08b]/56 bg-white/55 px-2.5 py-1">
              {formatJalaliDate(new Date())}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#101826] sm:text-3xl">
            مدیریت هزینه‌ها
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49]">
            هزینه‌های عملیاتی، خریدها، حقوق، فاکتورها و هزینه‌های مرتبط با قراردادها را در یک دفتر مالی منظم ثبت و پیگیری کنید.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
          <Link
            href="/dashboard/expenses/new"
            className="btn-luxury-dark min-h-11 justify-center px-4 py-2.5 text-sm shadow-[0_10px_28px_rgba(23,32,51,0.18)]"
          >
            <Plus size={16} />
            ثبت هزینه جدید
          </Link>
          <Link
            href="/dashboard/financial-categories"
            className={`${secondaryGoldButtonClass} min-h-11 justify-center px-4 py-2.5 text-sm`}
          >
            <FolderTree size={16} />
            دسته‌بندی‌های مالی
          </Link>
        </div>
      </div>
    </div>
  );
}

function getExpenseFilterSummary({
  query,
  from,
  to,
  categoryId,
  paymentMethodId,
  status,
  hallId,
  salonId,
  contractId,
  sort,
  categories,
  paymentMethods,
  halls,
  salons,
  contracts,
}: {
  query: string;
  from?: string;
  to?: string;
  categoryId?: string;
  paymentMethodId?: string;
  status?: ExpenseStatus;
  hallId?: string;
  salonId?: string;
  contractId?: string;
  sort: SortKey;
  categories: Array<{ id: string; title: string }>;
  paymentMethods: Array<{ id: string; title: string; type: PaymentMethodType }>;
  halls: Array<{ id: string; name: string }>;
  salons: Array<{ id: string; name: string }>;
  contracts: Array<{
    id: string;
    contractNo: string;
    title: string;
    customer: { fullName: string };
  }>;
}) {
  const items: string[] = [];
  if (query) items.push(`جست‌وجو: ${query}`);
  if (from || to)
    items.push(
      `${from ? `از ${toPersianDigits(from)}` : "از ابتدا"} تا ${to ? toPersianDigits(to) : "امروز"}`,
    );
  if (categoryId)
    items.push(
      categories.find((category) => category.id === categoryId)?.title ??
        "دسته انتخاب‌شده",
    );
  if (paymentMethodId)
    items.push(
      paymentMethods.find((method) => method.id === paymentMethodId)
        ? formatPaymentMethodLabel(
            paymentMethods.find((method) => method.id === paymentMethodId)!,
          )
        : "روش پرداخت انتخاب‌شده",
    );
  if (status) items.push(getExpenseStatusLabel(status));
  if (hallId)
    items.push(
      halls.find((hall) => hall.id === hallId)?.name ?? "تالار انتخاب‌شده",
    );
  if (salonId)
    items.push(
      salons.find((salon) => salon.id === salonId)?.name ?? "سالن انتخاب‌شده",
    );
  if (contractId) {
    const contract = contracts.find((item) => item.id === contractId);
    items.push(
      contract
        ? `قرارداد ${toPersianDigits(contract.contractNo)}`
        : "قرارداد انتخاب‌شده",
    );
  }
  if (sort !== "newest") items.push(`مرتب‌سازی: ${sortLabels[sort]}`);
  return items;
}

function FilterBar({
  query,
  from,
  to,
  categoryId,
  paymentMethodId,
  status,
  hallId,
  salonId,
  contractId,
  sort,
  categories,
  paymentMethods,
  halls,
  salons,
  contracts,
}: {
  query: string;
  from?: string;
  to?: string;
  categoryId?: string;
  paymentMethodId?: string;
  status?: ExpenseStatus;
  hallId?: string;
  salonId?: string;
  contractId?: string;
  sort: SortKey;
  categories: Array<{ id: string; title: string }>;
  paymentMethods: Array<{ id: string; title: string; type: PaymentMethodType }>;
  halls: Array<{ id: string; name: string }>;
  salons: Array<{ id: string; name: string }>;
  contracts: Array<{
    id: string;
    contractNo: string;
    title: string;
    customer: { fullName: string };
  }>;
}) {
  const activeFilters = getExpenseFilterSummary({
    query,
    from,
    to,
    categoryId,
    paymentMethodId,
    status,
    hallId,
    salonId,
    contractId,
    sort,
    categories,
    paymentMethods,
    halls,
    salons,
    contracts,
  });

  return (
    <section className="rounded-[1.45rem] border border-[#d8c08b]/58 bg-[#fff9ee]/95 p-3 text-[#111827] shadow-[0_10px_34px_rgba(17,24,39,0.05)] sm:p-4">
      <form className="space-y-3" action="/dashboard/expenses">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <label className="relative grid gap-1.5 text-xs font-black text-[#172033]">
            <span className="inline-flex items-center gap-1.5">
              <Search size={14} className="text-[#9f7131]" />
              جست‌وجوی سریع دفتر هزینه‌ها
            </span>
            <input
              name="q"
              defaultValue={query}
              placeholder="جستجوی عنوان هزینه، توضیح یا شماره قرارداد"
              className="input-luxury min-h-10 py-2 pl-4 pr-4 text-sm"
            />
          </label>
          <button
            type="submit"
            className="btn-luxury-dark min-h-10 justify-center px-4 py-2 text-sm"
          >
            <Search size={16} />
            اعمال فیلتر
          </button>
          {activeFilters.length ? (
            <Link
              href="/dashboard/expenses"
              className={`${secondaryGoldButtonClass} min-h-10 justify-center px-4 py-2 text-sm`}
            >
              <RotateCcw size={16} />
              حذف فیلترها
            </Link>
          ) : (
            <span className={`${disabledNeutralButtonClass} min-h-10 px-4 py-2 text-sm`} aria-disabled="true">
              <RotateCcw size={16} />
              حذف فیلترها
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-[1.1rem] border border-[#d8c08b]/45 bg-white/45 px-3 py-2 text-xs font-black text-[#6d5f49]">
          <span className="inline-flex items-center gap-1.5 text-[#172033]">
            <Filter size={14} className="text-[#9f7131]" />
            {activeFilters.length ? "فیلتر فعال" : "نمای فعلی"}
          </span>
          {activeFilters.length ? (
            activeFilters.slice(0, 6).map((item) => (
              <span
                key={item}
                className="rounded-full border border-[#c7a15a]/34 bg-[#fff4d8] px-2.5 py-1 text-[#7d6841]"
              >
                {item}
              </span>
            ))
          ) : (
            <span>همه هزینه‌های ثبت‌شده بر اساس جدیدترین تاریخ</span>
          )}
          {activeFilters.length > 6 ? (
            <span className="text-[#7d6841]">
              +{formatPersianNumber(activeFilters.length - 6)} مورد دیگر
            </span>
          ) : null}
        </div>

        <details className="group rounded-[1.15rem] border border-[#d8c08b]/46 bg-white/40">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-black text-[#172033] sm:px-4">
            <span className="inline-flex items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#172033] text-[#f0dba9]">
                <Filter size={15} />
              </span>
              فیلترهای پیشرفته
            </span>
            <span className="rounded-full border border-[#d8c08b]/70 bg-[#fff9ee] px-3 py-1 text-[11px] text-[#7d6841] group-open:hidden">
              باز کردن
            </span>
            <span className="hidden rounded-full border border-[#d8c08b]/70 bg-[#fff9ee] px-3 py-1 text-[11px] text-[#7d6841] group-open:inline-flex">
              بستن
            </span>
          </summary>
          <div className="grid gap-2.5 border-t border-[#d8c08b]/42 p-3 sm:p-4 lg:grid-cols-6">
            <JalaliDatePicker
              name="from"
              label="از تاریخ"
              defaultValue={from ?? null}
            />
            <JalaliDatePicker
              name="to"
              label="تا تاریخ"
              defaultValue={to ?? null}
            />
            <Select
              name="categoryId"
              label="دسته‌بندی مالی"
              defaultValue={categoryId ?? "all"}
            >
              <option value="all">همه دسته‌ها</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))}
            </Select>
            <Select
              name="paymentMethodId"
              label="روش پرداخت"
              defaultValue={paymentMethodId ?? "all"}
            >
              <option value="all">همه روش‌ها</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {formatPaymentMethodLabel(method)}
                </option>
              ))}
            </Select>
            <Select
              name="status"
              label="وضعیت هزینه"
              defaultValue={status ?? "all"}
            >
              <option value="all">همه وضعیت‌ها</option>
              {expenseStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select name="hallId" label="تالار" defaultValue={hallId ?? "all"}>
              <option value="all">همه تالارها</option>
              {halls.map((hall) => (
                <option key={hall.id} value={hall.id}>
                  {hall.name}
                </option>
              ))}
            </Select>
            <Select name="salonId" label="سالن" defaultValue={salonId ?? "all"}>
              <option value="all">همه سالن‌ها</option>
              {salons.map((salon) => (
                <option key={salon.id} value={salon.id}>
                  {salon.name}
                </option>
              ))}
            </Select>
            <Select
              name="contractId"
              label="قرارداد"
              defaultValue={contractId ?? "all"}
            >
              <option value="all">همه قراردادها</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {toPersianDigits(contract.contractNo)} —{" "}
                  {contract.customer.fullName}
                </option>
              ))}
            </Select>
            <Select name="sort" label="مرتب‌سازی" defaultValue={sort}>
              {Object.entries(sortLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </details>
      </form>
    </section>
  );
}

function AnalyticsSummary({
  totalAmount,
  monthAmount,
  topCategory,
  count,
}: {
  totalAmount: number;
  monthAmount: number;
  topCategory: { label: string; amount: number } | null;
  count: number;
}) {
  const averageAmount = count > 0 ? Math.round(totalAmount / count) : 0;
  const monthShare =
    totalAmount > 0 ? Math.round((monthAmount / totalAmount) * 100) : 0;
  return (
    <section className="rounded-[1.55rem] border border-[#d8c08b]/58 bg-[#fff9ee]/94 p-4 shadow-[0_12px_38px_rgba(17,24,39,0.05)]">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.6fr)] lg:items-end">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-black text-[#7d6841]">
            <TrendingDown size={14} className="text-[#9f7131]" />
            نمای تحلیلی هزینه‌ها
          </p>
          <h2 className="mt-1 text-lg font-black text-[#172033] sm:text-xl">
            اثر هزینه‌ها روی سودآوری تالار
          </h2>
        </div>
        {count < 3 ? (
          <p className="text-xs font-bold leading-6 text-[#6d5f49]">
            برای تحلیل دقیق‌تر، هزینه‌های حقوق، خریدها، فاکتورها و هزینه‌های مرتبط با قراردادها را ثبت کنید.
          </p>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniAnalytics
          label="میانگین هزینه"
          value={formatIRR(averageAmount)}
          icon={<Banknote size={16} />}
          detail="میانگین هزینه‌های قابل محاسبه"
        />
        <MiniAnalytics
          label="سهم ماه جاری"
          value={totalAmount > 0 ? `${formatPersianNumber(monthShare)}٪` : "—"}
          icon={<CalendarDays size={16} />}
          detail="نسبت هزینه این ماه به کل بازه"
        />
        <MiniAnalytics
          label="بیشترین دسته هزینه"
          value={topCategory?.label ?? "ثبت نشده"}
          icon={<FolderTree size={16} />}
          detail={
            topCategory
              ? formatIRR(topCategory.amount)
              : "با ثبت هزینه، دسته غالب مشخص می‌شود"
          }
        />
        <MiniAnalytics
          label="اثر در گزارش سود"
          value="لحاظ می‌شود"
          icon={<CheckCircle2 size={16} />}
          detail="هزینه‌های لغوشده در گزارش‌ها محاسبه نمی‌شوند"
        />
      </div>
    </section>
  );
}

function ExpenseCard({
  expense,
  canEdit,
}: {
  expense: ExpenseListItem;
  canEdit: boolean;
}) {
  const amount = toNumber(expense.amount);
  const statusStyle = getExpenseStatusStyle(expense.status);
  const isCanceled = expense.status === "CANCELED";
  const contextLabel = expense.contract ? "مرتبط با قرارداد" : "هزینه عمومی";
  const location = [expense.hall?.name, expense.salon?.name]
    .filter(Boolean)
    .join(" / ");
  const notePreview = expense.note ?? expense.description;
  const cheque = expense.cheques[0];

  return (
    <article
      className={`rounded-[1.55rem] border p-4 text-[#111827] shadow-[0_14px_42px_rgba(17,24,39,0.055)] transition sm:p-5 ${isCanceled ? "border-[#b45353]/20 bg-[#fff1f1]/55 opacity-90" : "border-[#d8c08b]/62 bg-[#fff9ee]/96 hover:-translate-y-0.5 hover:shadow-[0_18px_52px_rgba(17,24,39,0.08)]"}`}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black ${statusStyle}`}
                >
                  {getExpenseStatusLabel(expense.status)}
                </span>
                <span className="rounded-full border border-[#c7a15a]/30 bg-[#c7a15a]/10 px-3 py-1 text-[11px] font-black text-[#7d6841]">
                  {expense.financialCategory?.title ?? "بدون دسته‌بندی"}
                </span>
                <span className="rounded-full border border-[#172033]/10 bg-white/55 px-3 py-1 text-[11px] font-black text-[#172033]">
                  {contextLabel}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black ${expense.receiptImageUrl ? "border-[#17483f]/18 bg-[#25a46d]/10 text-[#17483f]" : "border-[#d8c08b]/60 bg-white/50 text-[#7d6841]"}`}
                >
                  {expense.receiptImageUrl ? "رسید دارد" : "بدون رسید"}
                </span>
                {cheque ? (
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${getExpenseChequeStatusStyle(cheque.status)}`}>
                    هزینه چکی · {getExpenseChequeStatusLabel(cheque.status)}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 text-lg font-black leading-8 text-[#172033] sm:text-xl">
                {expense.title}
              </h2>
            </div>
            <div className="rounded-[1.2rem] border border-[#d8c08b]/55 bg-white/65 px-4 py-3 text-right shadow-[0_8px_24px_rgba(17,24,39,0.04)] sm:min-w-52">
              <p className="text-[11px] font-black text-[#7d6841]">
                مبلغ هزینه
              </p>
              <p className="mt-1 text-xl font-black text-[#172033]">
                {formatIRR(amount)}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <LedgerMeta
              label="تاریخ وقوع"
              value={`${formatJalaliDate(expense.occurredAt)} ساعت ${formatJalaliTime(expense.occurredAt)}`}
            />
            <LedgerMeta
              label="ثبت در سامانه"
              value={`${formatJalaliDate(expense.createdAt)} ساعت ${formatJalaliTime(expense.createdAt)}`}
            />
            <LedgerMeta
              label="آخرین تغییر"
              value={`${formatJalaliDate(expense.updatedAt)} ساعت ${formatJalaliTime(expense.updatedAt)}`}
            />
            <LedgerMeta
              label="روش پرداخت"
              value={
                expense.paymentMethod
                  ? formatPaymentMethodLabel(expense.paymentMethod)
                  : "ثبت نشده"
              }
            />
            <LedgerMeta
              label="قرارداد"
              value={
                expense.contract
                  ? toPersianDigits(expense.contract.contractNo)
                  : "—"
              }
            />
            <LedgerMeta
              label="مشتری"
              value={expense.customer?.fullName ?? "—"}
            />
            {location ? (
              <LedgerMeta label="تالار / سالن" value={location} />
            ) : null}
            {expense.vendorName ? (
              <LedgerMeta label="فروشنده" value={expense.vendorName} />
            ) : null}
            {expense.referenceNumber ? (
              <LedgerMeta
                label="شماره مرجع"
                value={toPersianDigits(expense.referenceNumber)}
              />
            ) : null}
            {cheque ? (
              <LedgerMeta label="چک هزینه" value={`${getExpenseChequeStatusLabel(cheque.status)} · ${formatIRR(toNumber(cheque.amount))}`} />
            ) : null}
            {cheque ? (
              <LedgerMeta label="سررسید چک" value={formatJalaliDate(cheque.dueDate)} />
            ) : null}
            <LedgerMeta
              label="اثر مالی"
              value={
                isExpenseCountable(expense.status)
                  ? "در گزارش‌ها لحاظ می‌شود"
                  : "در گزارش‌ها محاسبه نمی‌شود"
              }
            />
          </div>

          {notePreview ? (
            <p className="line-clamp-2 rounded-2xl border border-[#d8c08b]/45 bg-white/45 px-3 py-2 text-xs font-bold leading-6 text-[#6d5f49]">
              {notePreview}
            </p>
          ) : null}
        </div>

        <div className="rounded-[1.35rem] border border-white/70 bg-white/52 p-3">
          <p className="mb-3 text-xs font-black text-[#7d6841]">عملیات هزینه</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <Link
              href={`/dashboard/expenses/${expense.id}`}
              className="btn-luxury-dark min-h-10 px-4 py-2 text-sm"
            >
              <Eye size={16} />
              مشاهده جزئیات
            </Link>
            <Link
              href={`/dashboard/expenses/${expense.id}/edit`}
              className={`${secondaryNeutralButtonClass} min-h-10 px-4 py-2 text-sm`}
            >
              <ArrowLeft size={16} />
              ویرایش
            </Link>
            {expense.receiptImageUrl ? (
              <a
                href={expense.receiptImageUrl}
                target="_blank"
                rel="noreferrer"
                className={`${secondarySuccessButtonClass} min-h-10 px-4 py-2 text-sm`}
              >
                <FileText size={16} />
                مشاهده رسید
              </a>
            ) : null}
            {canEdit && !isCanceled ? (
              <form action={cancelExpenseAction}>
                <input type="hidden" name="expenseId" value={expense.id} />
                <input
                  type="hidden"
                  name="returnTo"
                  value="/dashboard/expenses"
                />
                <button
                  className={`${secondaryDangerButtonClass} min-h-10 w-full px-4 py-2 text-sm`}
                  type="submit"
                >
                  <XCircle size={16} />
                  لغو هزینه
                </button>
              </form>
            ) : isCanceled ? (
              <span className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#b45353]/18 bg-[#fff1f1] px-4 py-2 text-sm font-black text-[#8f2c2c]">
                لغوشده
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "expense";
}) {
  return (
    <div
      className={`flex min-h-[5.15rem] flex-col justify-between rounded-[1.05rem] border p-3 shadow-[0_7px_20px_rgba(17,24,39,0.035)] ${tone === "expense" ? "border-[#d8c08b]/64 bg-[linear-gradient(135deg,#fff9ee,#fff4e4)]" : "border-[#d8c08b]/54 bg-[#fff9ee]/92"}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <p className="min-w-0 flex-1 truncate text-xs font-black leading-5 text-[#7d6841]">{label}</p>
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#172033] text-[#f0dba9] shadow-[0_7px_18px_rgba(23,32,51,0.14)]">
          <Icon size={15} />
        </span>
      </div>
      <p className="mt-2 min-w-0 text-base font-black leading-6 text-[#172033] sm:text-[1.08rem]">
        <span className="block truncate">{value}</span>
      </p>
    </div>
  );
}

function MiniAnalytics({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  detail?: string;
}) {
  return (
    <div className="flex min-h-[6.35rem] flex-col justify-between rounded-[1.05rem] border border-[#d8c08b]/50 bg-white/62 p-3 shadow-[0_7px_18px_rgba(17,24,39,0.03)]">
      <div className="flex items-start justify-between gap-2.5 text-xs font-black text-[#7d6841]">
        <span className="min-w-0 flex-1 truncate leading-5">{label}</span>
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#172033] text-[#f0dba9] shadow-[0_7px_18px_rgba(23,32,51,0.14)] [&_svg]:size-[15px]">
          {icon}
        </span>
      </div>
      <div className="mt-2 min-w-0">
        <p className="truncate text-base font-black leading-6 text-[#172033] sm:text-[1.05rem]">
          {value}
        </p>
        {detail ? (
          <p className="mt-1.5 line-clamp-2 text-xs font-bold leading-5 text-[#6d5f49]">
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function LedgerMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#d8c08b]/38 bg-white/45 px-3 py-2">
      <p className="text-[11px] font-black text-[#7d6841]">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-[#172033]">{value}</p>
    </div>
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
  defaultValue?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-[#172033]">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="input-luxury min-h-11 py-2 text-sm"
      >
        {children}
      </select>
    </label>
  );
}

function EmptyState() {
  return (
    <section className="rounded-[1.55rem] border border-dashed border-[#c7a15a]/55 bg-[#fff9ee]/92 p-4 text-[#111827] shadow-[0_14px_46px_rgba(17,24,39,0.06)] sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#111827] text-[#f0dba9]">
          <ReceiptText size={21} />
        </span>
        <div>
          <h2 className="text-xl font-black sm:text-2xl">هنوز هزینه‌ای ثبت نشده است</h2>
          <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49]">
            برای محاسبه دقیق سود و زیان تالار، هزینه‌های عملیاتی، خریدها، حقوق و فاکتورها را ثبت کنید.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
          <Link
            href="/dashboard/expenses/new"
            className="btn-luxury-dark min-h-11 justify-center px-4 py-2.5 text-sm"
          >
            <Plus size={16} />
            ثبت اولین هزینه
          </Link>
          <Link
            href="/dashboard/financial-categories"
            className={`${secondaryGoldButtonClass} min-h-11 justify-center px-4 py-2.5 text-sm`}
          >
            <FolderTree size={16} />
            تعریف دسته‌بندی مالی
          </Link>
        </div>
      </div>
    </section>
  );
}

function FilteredEmptyState() {
  return (
    <section className="rounded-[1.6rem] border border-[#d8c08b]/62 bg-[#fff9ee]/92 p-5 text-center text-sm font-bold text-[#6d5f49]">
      هزینه‌ای با فیلترهای فعلی پیدا نشد.
    </section>
  );
}

function Alert({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "error";
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm font-black ${tone === "success" ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]" : "border-[#b45353]/20 bg-[#fff1f1] text-[#8f2c2c]"}`}
    >
      {children}
    </div>
  );
}
