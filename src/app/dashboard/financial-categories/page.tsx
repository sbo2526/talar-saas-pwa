import type { FinancialCategoryType, Prisma } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  Filter,
  FolderTree,
  Layers3,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Tag,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import {
  FinancialCategoryForm,
  ToggleFinancialCategoryStatusForm,
  type FinancialCategoryFormValues,
} from "@/components/dashboard/financial-category-forms";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/date/jalali";
import {
  categoryTypeLabels,
  categoryTypeOptions,
  isCategoryTypeValue,
} from "@/lib/financial-category-options";
import { formatPersianNumber } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";

type FinancialCategoriesPageProps = {
  searchParams: Promise<{
    status?: string;
    type?: string;
    q?: string;
  }>;
};

type FinancialCategoryCardData = {
  id: string;
  title: string;
  code: string | null;
  type: FinancialCategoryType;
  description: string | null;
  color: string | null;
  icon: string | null;
  parentId: string | null;
  parent: { id: string; title: string } | null;
  isSystem: boolean;
  isActive: boolean;
  updatedAt: Date;
  _count: { children: number };
};

const setupSteps = [
  "دسته‌های درآمد، هزینه، مالیات و تخفیف را جدا تعریف کنید",
  "برای گزارش‌های مالی دقیق، کد داخلی کوتاه و قابل فهم بگذارید",
  "دسته‌های غیرفعال را حذف نکنید تا سوابق مالی قابل گزارش بماند",
  "در مرحله‌های بعد از این دسته‌ها در هزینه‌ها و گزارش‌های مالی استفاده می‌شود",
];

export default async function FinancialCategoriesPage({
  searchParams,
}: FinancialCategoriesPageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const tenantId = membership.tenantId;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";
  const resolvedSearchParams = await searchParams;
  const selectedStatus =
    resolvedSearchParams.status === "active" ||
    resolvedSearchParams.status === "inactive"
      ? resolvedSearchParams.status
      : "all";
  const selectedType = isCategoryType(resolvedSearchParams.type)
    ? resolvedSearchParams.type
    : "all";
  const query = resolvedSearchParams.q?.trim() ?? "";

  const where: Prisma.FinancialCategoryWhereInput = { tenantId };

  if (selectedStatus === "active") {
    where.isActive = true;
  }

  if (selectedStatus === "inactive") {
    where.isActive = false;
  }

  if (selectedType !== "all") {
    where.type = selectedType;
  }

  if (query) {
    where.OR = [{ title: { contains: query } }, { code: { contains: query } }];
  }

  const [categories, allCategories] = await Promise.all([
    db.financialCategory.findMany({
      where,
      include: {
        parent: { select: { id: true, title: true } },
        _count: { select: { children: true } },
      },
      orderBy: [
        { isActive: "desc" },
        { type: "asc" },
        { sortOrder: "asc" },
        { updatedAt: "desc" },
      ],
    }),
    db.financialCategory.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        type: true,
        isActive: true,
        updatedAt: true,
      },
      orderBy: [{ type: "asc" }, { title: "asc" }],
    }),
  ]);
  const activeCount = allCategories.filter((category) => category.isActive).length;
  const incomeCount = allCategories.filter(
    (category) => category.type === "INCOME",
  ).length;
  const expenseCount = allCategories.filter(
    (category) => category.type === "EXPENSE",
  ).length;
  const hasAnyCategory = allCategories.length > 0;
  const parentOptions = allCategories.map((category) => ({
    id: category.id,
    title: category.title,
  }));

  return (
    <section className="space-y-5 sm:space-y-7">
      <PageHero tenantName={membership.tenant.name} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard
          label="تعداد دسته‌ها"
          value={formatPersianNumber(allCategories.length)}
          icon={Layers3}
        />
        <SummaryCard
          label="دسته‌های درآمد"
          value={formatPersianNumber(incomeCount)}
          icon={CircleDollarSign}
        />
        <SummaryCard
          label="دسته‌های هزینه"
          value={formatPersianNumber(expenseCount)}
          icon={ReceiptText}
        />
        <SummaryCard
          label="دسته‌های فعال"
          value={formatPersianNumber(activeCount)}
          icon={CheckCircle2}
        />
      </div>

      <FilterBar
        selectedStatus={selectedStatus}
        selectedType={selectedType}
        query={query}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          {categories.length ? (
            categories.map((category) => (
              <FinancialCategoryCard
                key={category.id}
                category={category}
                parentOptions={parentOptions}
                canEdit={canEdit}
              />
            ))
          ) : hasAnyCategory ? (
            <FilteredEmptyState />
          ) : (
            <EmptyState />
          )}
        </div>

        <aside className="space-y-4">
          <section
            id="new-financial-category"
            className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6"
          >
            <p className="text-xs font-black text-[#17483f]">
              افزودن دسته مالی
            </p>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              تعریف سرفصل گزارش‌گیری
            </h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
              دسته‌بندی مالی پایه گزارش‌های درآمد، هزینه، تخفیف و مالیات تالار
              است و بعداً در ثبت هزینه‌ها و تحلیل مالی استفاده می‌شود.
            </p>
            <div className="mt-5">
              <FinancialCategoryForm
                mode="create"
                parentOptions={parentOptions}
                canEdit={canEdit}
              />
            </div>
          </section>

          <RelatedSections />
        </aside>
      </div>
    </section>
  );
}

function PageHero({ tenantName }: { tenantName: string }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7 lg:p-8">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:px-4 sm:py-2 sm:text-sm">
            <WalletCards size={15} />
            تعاریف پایه / دسته‌بندی مالی
          </div>
          <h1 className="mt-4 text-2xl font-black leading-tight sm:mt-5 sm:text-4xl">
            مدیریت دسته‌بندی مالی
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:mt-4 sm:text-base sm:leading-8">
            دسته‌بندی درآمدها، هزینه‌ها، تخفیف‌ها، مالیات و گزارش‌های مالی را
            تعریف کنید تا گزارش‌گیری تالار دقیق، قابل اتکا و شفاف باشد.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs font-black text-[#7d6841]">
            <CalendarDays size={16} className="text-[#9f7131]" />
            <span>{formatJalaliDate(new Date())}</span>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:min-w-80 sm:p-5">
          <p className="text-xs font-black text-[#f0dba9]">فضای کاری</p>
          <h2 className="mt-2 text-2xl font-black text-[#fff9ed]">
            {tenantName}
          </h2>
          <div className="gold-divider my-4" />
          <a
            href="#new-financial-category"
            className="btn-luxury-primary w-full px-5 py-3"
          >
            <Plus size={17} />
            افزودن دسته مالی
          </a>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <article className="rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-3.5 text-[#111827] shadow-[0_18px_56px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-5">
      <span className="flex size-9 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
        <Icon size={17} />
      </span>
      <p className="mt-3 text-xs font-black leading-6 text-[#7d6841] sm:text-sm">
        {label}
      </p>
      <p className="mt-2 break-words text-xl font-black leading-tight sm:text-2xl">
        {value}
      </p>
    </article>
  );
}

function FilterBar({
  selectedStatus,
  selectedType,
  query,
}: {
  selectedStatus: string;
  selectedType: string;
  query: string;
}) {
  return (
    <form
      action="/dashboard/financial-categories"
      className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-5"
    >
      <div className="mb-4 flex items-center gap-2 text-sm font-black text-[#17483f]">
        <Filter size={18} />
        فیلتر و جست‌وجوی دسته‌ها
      </div>
      <div className="grid gap-3 md:grid-cols-[0.9fr_0.9fr_1.2fr_auto] md:items-end">
        <Select name="type" label="نوع دسته" defaultValue={selectedType}>
          <option value="all">همه دسته‌ها</option>
          {categoryTypeOptions.map((option) => (
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
              placeholder="نام یا کد دسته مالی"
              className="input-luxury pl-11"
            />
          </div>
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn-luxury-dark min-h-12 px-5">
            اعمال فیلتر
          </button>
          <Link
            href="/dashboard/financial-categories"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-4 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
          >
            حذف
          </Link>
        </div>
      </div>
    </form>
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
  children: React.ReactNode;
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

function FinancialCategoryCard({
  category,
  parentOptions,
  canEdit,
}: {
  category: FinancialCategoryCardData;
  parentOptions: Array<{ id: string; title: string }>;
  canEdit: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge active={category.isActive} />
            {category.isSystem ? (
              <span className="rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/14 px-3 py-1 text-xs font-black text-[#7d6841]">
                سیستمی
              </span>
            ) : null}
            <span className="rounded-full border border-[#25a46d]/18 bg-[#25a46d]/10 px-3 py-1 text-xs font-black text-[#17483f]">
              {categoryTypeLabels[category.type]}
            </span>
            {category.code ? (
              <span className="rounded-full border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#7d6841]">
                کد: {category.code}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span
              className="block size-5 shrink-0 rounded-full border border-[#111827]/15"
              style={{ backgroundColor: category.color ?? "#C7A15A" }}
            />
            <h2 className="text-2xl font-black leading-tight">
              {category.title}
            </h2>
          </div>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
            {category.description ||
              "توضیحی برای این دسته‌بندی مالی ثبت نشده است."}
          </p>
        </div>

        <ToggleFinancialCategoryStatusForm
          financialCategoryId={category.id}
          isActive={category.isActive}
          canEdit={canEdit}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoItem
          icon={FolderTree}
          label="دسته مادر"
          value={category.parent?.title ?? "بدون دسته مادر"}
          helper="برای ساختار گزارش‌گیری چندسطحی"
        />
        <InfoItem
          icon={Layers3}
          label="زیرمجموعه‌ها"
          value={formatPersianNumber(category._count.children)}
          helper="تعداد دسته‌های متصل به این دسته"
        />
        <InfoItem
          icon={Tag}
          label="آیکن نمایشی"
          value={category.icon || "ثبت نشده"}
          helper="برای نمایش داخلی و آینده گزارش‌ها"
        />
        <InfoItem
          icon={CalendarDays}
          label="آخرین به‌روزرسانی"
          value={formatJalaliDateTime(category.updatedAt)}
          helper="بر اساس آخرین تغییر اطلاعات دسته"
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link href="/dashboard/reports" className="btn-luxury-dark px-5 py-3">
          مشاهده گزارش‌ها
          <ArrowLeft size={17} />
        </Link>
        <details className="group rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center gap-2 px-5 py-3 text-sm font-black text-[#111827]">
            <Edit3 size={17} />
            ویرایش
          </summary>
          <div className="border-t border-[#d8c08b]/50 p-4">
            <FinancialCategoryForm
              mode="edit"
              values={toFinancialCategoryFormValues(category)}
              parentOptions={parentOptions}
              canEdit={canEdit}
            />
          </div>
        </details>
      </div>
    </article>
  );
}

function toFinancialCategoryFormValues(
  category: FinancialCategoryCardData,
): FinancialCategoryFormValues {
  return {
    id: category.id,
    title: category.title,
    code: category.code ?? "",
    type: category.type,
    parentId: category.parentId ?? "",
    color: category.color ?? "#C7A15A",
    icon: category.icon ?? "",
    description: category.description ?? "",
    isSystem: category.isSystem,
    isActive: category.isActive,
  };
}

function InfoItem({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 p-3.5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black text-[#7d6841]">{label}</p>
          <p className="mt-1 break-words text-sm font-black leading-6 text-[#111827]">
            {value}
          </p>
          <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">
            {helper}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${
        active
          ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]"
          : "border-[#b45353]/24 bg-[#fff1f1] text-[#8f2c2c]"
      }`}
    >
      {active ? "فعال" : "غیرفعال"}
    </span>
  );
}

function EmptyState() {
  return (
    <section className="rounded-[1.75rem] border border-dashed border-[#c7a15a]/55 bg-[#fff9ee]/94 p-5 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-7">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
        <WalletCards size={24} />
      </div>
      <h2 className="mt-5 text-2xl font-black">
        هنوز دسته‌بندی مالی تعریف نشده است
      </h2>
      <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
        برای گزارش‌گیری دقیق درآمدها، هزینه‌ها و سودآوری تالار، دسته‌بندی‌های
        مالی پایه را تعریف کنید.
      </p>
      <a
        href="#new-financial-category"
        className="btn-luxury-primary mt-5 px-5 py-3"
      >
        <Plus size={17} />
        افزودن اولین دسته مالی
      </a>
      <SetupGuide />
    </section>
  );
}

function FilteredEmptyState() {
  return (
    <section className="rounded-[1.75rem] border border-dashed border-[#c7a15a]/55 bg-[#fff9ee]/94 p-5 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-7">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
        <Search size={24} />
      </div>
      <h2 className="mt-5 text-2xl font-black">
        دسته مالی با این فیلتر پیدا نشد
      </h2>
      <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49]">
        فیلتر نوع دسته، وضعیت یا عبارت جست‌وجو را تغییر دهید.
      </p>
      <Link
        href="/dashboard/financial-categories"
        className="btn-luxury-secondary mt-5 px-5 py-3"
      >
        حذف فیلترها
      </Link>
    </section>
  );
}

function SetupGuide() {
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2">
      {setupSteps.map((step, index) => (
        <div
          key={step}
          className="flex items-start gap-3 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 p-4 text-sm font-bold leading-7 text-[#111827]"
        >
          <CheckCircle2 className="mt-1 shrink-0 text-[#c7a15a]" size={17} />
          <span>
            {formatPersianNumber(index + 1)}. {step}
          </span>
        </div>
      ))}
    </div>
  );
}

function RelatedSections() {
  return (
    <section className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem] sm:p-6">
      <p className="text-xs font-black text-[#f0dba9]">گزارش‌گیری شفاف</p>
      <h2 className="mt-1 text-xl font-black">
        دسته‌ها پایه تحلیل مالی تالار هستند
      </h2>
      <div className="gold-divider my-5" />
      <div className="flex items-start gap-3 rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3 text-sm font-bold leading-7 text-[#d9caa9]">
        <ShieldCheck className="mt-1 shrink-0 text-[#f0dba9]" size={18} />
        <span>
          دسته‌های مالی به فضای کاری همین تالار محدود هستند و به جای حذف سخت،
          غیرفعال می‌شوند تا سوابق گزارش‌های مالی حفظ شود.
        </span>
      </div>
    </section>
  );
}

function isCategoryType(
  value: string | undefined,
): value is FinancialCategoryType | "all" {
  return value === "all" || isCategoryTypeValue(value);
}
