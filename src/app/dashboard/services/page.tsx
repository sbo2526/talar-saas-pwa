import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { Prisma, ServicePricingType } from "@prisma/client";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  Filter,
  Layers3,
  Music2,
  Plus,
  Search,
  Sparkles,
  UsersRound,
  WalletCards,
  WandSparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  QuickServicePriceForm,
  ServiceForm,
  type ServiceFormValues,
  ToggleServiceStatusForm,
} from "@/components/dashboard/service-management-forms";
import { requireTenantMember } from "@/lib/auth/session";
import { ensureContractCatalogDefaults } from "@/lib/contract-defaults";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";

type ServicesPageProps = {
  searchParams: Promise<{
    status?: string;
    category?: string;
    pricingType?: string;
    priceStatus?: string;
    missingPrice?: string;
    required?: string;
    sort?: string;
    q?: string;
    action?: string;
    edit?: string;
  }>;
};

type CategoryKey = "ALL" | "VISUAL" | "PHOTO_VIDEO" | "MUSIC" | "CEREMONY" | "STAFF" | "EFFECTS";
type PriceStatus = "all" | "priced" | "missing";
type RequiredStatus = "all" | "required" | "optional";
type SortMode = "newest" | "name" | "price_asc" | "price_desc" | "missing_first";

type ServiceView = {
  id: string;
  title: string;
  code: string | null;
  category: string | null;
  pricingType: ServicePricingType;
  unit: string;
  price: string;
  basePrice: string | null;
  sortOrder: number | null;
  description: string | null;
  notes: string | null;
  isRequired: boolean;
  allowPriceOverride: boolean;
  isActive: boolean;
  updatedAt: Date;
};

type QueryPatch = Record<string, string | null | undefined>;

const categoryDefinitions: Array<{
  key: CategoryKey;
  label: string;
  value: string | null;
  icon: LucideIcon;
}> = [
  { key: "ALL", label: "همه", value: null, icon: Layers3 },
  {
    key: "VISUAL",
    label: "خدمات تصویری و اجرایی",
    value: "خدمات تصویری و اجرایی",
    icon: Sparkles,
  },
  {
    key: "PHOTO_VIDEO",
    label: "عکاسی و فیلم‌برداری",
    value: "عکاسی و فیلم‌برداری",
    icon: Camera,
  },
  {
    key: "MUSIC",
    label: "خدمات موسیقی و هنری",
    value: "خدمات موسیقی و هنری",
    icon: Music2,
  },
  {
    key: "CEREMONY",
    label: "خدمات تشریفاتی عقد",
    value: "خدمات تشریفاتی عقد",
    icon: BadgeCheck,
  },
  {
    key: "STAFF",
    label: "خدمات نیروی انسانی عمومی",
    value: "خدمات نیروی انسانی عمومی",
    icon: UsersRound,
  },
  {
    key: "EFFECTS",
    label: "افکت‌ها و جلوه‌های ویژه",
    value: "افکت‌ها و جلوه‌های ویژه",
    icon: WandSparkles,
  },
];

const pricingTypeLabels: Record<ServicePricingType, string> = {
  FIXED: "مبلغ ثابت",
  PER_GUEST: "به ازای هر مهمان",
  PER_HOUR: "به ازای هر ساعت",
  PER_ITEM: "به ازای تعداد",
  CUSTOM: "توافقی",
};

const formulaPreviewLabels: Record<ServicePricingType, string> = {
  FIXED: "مبلغ ثابت در قرارداد",
  PER_GUEST: "تعداد مهمان × قیمت هر مهمان",
  PER_HOUR: "ساعت × قیمت هر ساعت",
  PER_ITEM: "تعداد × قیمت واحد",
  CUSTOM: "توافقی هنگام قرارداد",
};

const statusOptions = [
  { value: "all", label: "همه" },
  { value: "active", label: "فعال" },
  { value: "inactive", label: "غیرفعال" },
];

const priceStatusOptions: Array<{ value: PriceStatus; label: string }> = [
  { value: "all", label: "همه" },
  { value: "priced", label: "قیمت ثبت‌شده" },
  { value: "missing", label: "بدون قیمت" },
];

const requiredOptions: Array<{ value: RequiredStatus; label: string }> = [
  { value: "all", label: "همه" },
  { value: "required", label: "الزامی" },
  { value: "optional", label: "اختیاری" },
];

const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: "newest", label: "جدیدترین" },
  { value: "name", label: "نام" },
  { value: "price_asc", label: "کمترین قیمت" },
  { value: "price_desc", label: "بیشترین قیمت" },
  { value: "missing_first", label: "بدون قیمت‌ها ابتدا" },
];

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const tenantId = membership.tenantId;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";

  if (canEdit) {
    await ensureContractCatalogDefaults(db, tenantId);
  }

  const params = await searchParams;
  const selectedStatus = getStatus(params.status);
  const selectedCategory = getCategoryKey(params.category);
  const selectedPricingType = isPricingType(params.pricingType)
    ? params.pricingType
    : "all";
  const selectedPriceStatus = getPriceStatus(
    params.missingPrice === "1" ? "missing" : params.priceStatus,
  );
  const selectedRequired = getRequiredStatus(params.required);
  const selectedSort = getSortMode(params.sort);
  const query = params.q?.trim() ?? "";
  const selectedCategoryValue = categoryDefinitions.find(
    (category) => category.key === selectedCategory,
  )?.value;
  const currentQuery = sanitizeQuery(params);

  const where: Prisma.ServiceWhereInput = { tenantId };

  if (selectedStatus === "active") {
    where.isActive = true;
  }

  if (selectedStatus === "inactive") {
    where.isActive = false;
  }

  if (selectedCategoryValue) {
    where.category = selectedCategoryValue;
  }

  if (selectedPricingType !== "all") {
    where.pricingType = selectedPricingType;
  }

  if (selectedRequired === "required") {
    where.isRequired = true;
  }

  if (selectedRequired === "optional") {
    where.isRequired = false;
  }

  if (query) {
    where.OR = [{ title: { contains: query } }, { code: { contains: query } }];
  }

  const [rawServices, allServices] = await Promise.all([
    db.service.findMany({
      where,
      orderBy: [
        { isRequired: "desc" },
        { isActive: "desc" },
        { sortOrder: "asc" },
        { updatedAt: "desc" },
      ],
    }),
    db.service.findMany({
      where: { tenantId },
      orderBy: [{ updatedAt: "desc" }],
    }),
  ]);

  const serviceViews = allServices.map(toServiceView);
  const services = sortServices(
    rawServices
      .map(toServiceView)
      .filter((service) => filterByPriceStatus(service, selectedPriceStatus)),
    selectedSort,
  );
  const activeCount = serviceViews.filter((service) => service.isActive).length;
  const missingPriceServices = serviceViews.filter(
    (service) => service.isActive && isMissingPrice(service),
  );
  const readyCount = serviceViews.filter(
    (service) => service.isActive && !isMissingPrice(service),
  ).length;
  const requiredCount = serviceViews.filter((service) => service.isRequired).length;
  const lastUpdatedAt = serviceViews[0]?.updatedAt ?? null;
  const selectedEditorService = params.edit
    ? serviceViews.find((service) => service.id === params.edit)
    : null;
  const showCreateDrawer = params.action === "add";
  const showEditDrawer = Boolean(selectedEditorService);
  const closeDrawerHref = makeServicesHref(currentQuery, {
    action: null,
    edit: null,
  });
  const hasAnyService = serviceViews.length > 0;

  return (
    <section className="space-y-5 sm:space-y-7">
      <PageHero
        tenantName={membership.tenant.name}
        today={formatJalaliDate(new Date())}
        addHref={makeServicesHref(currentQuery, { action: "add", edit: null })}
        missingHref={makeServicesHref(currentQuery, {
          status: "active",
          priceStatus: "missing",
          missingPrice: "1",
          category: "ALL",
          action: null,
          edit: null,
        })}
      />

      <KpiGrid
        totalCount={serviceViews.length}
        activeCount={activeCount}
        readyCount={readyCount}
        missingCount={missingPriceServices.length}
        requiredCount={requiredCount}
        lastUpdatedAt={lastUpdatedAt}
      />

      {missingPriceServices.length > 0 ? (
        <MissingPriceNotice
          count={missingPriceServices.length}
          href={makeServicesHref(currentQuery, {
            status: "active",
            priceStatus: "missing",
            missingPrice: "1",
            category: "ALL",
            action: null,
            edit: null,
          })}
        />
      ) : null}

      <CategoryTabs
        selectedCategory={selectedCategory}
        currentQuery={currentQuery}
        services={serviceViews}
        missingCount={missingPriceServices.length}
      />

      <FilterBar
        selectedCategory={selectedCategory}
        selectedStatus={selectedStatus}
        selectedPricingType={selectedPricingType}
        selectedPriceStatus={selectedPriceStatus}
        selectedRequired={selectedRequired}
        selectedSort={selectedSort}
        query={query}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 rounded-[1.4rem] border border-[#d8c08b]/50 bg-[#fff9ee]/90 px-4 py-3 text-[#111827] shadow-[0_14px_42px_rgba(17,24,39,0.06)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black">فهرست قیمت خدمات مراسم</h2>
              <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">
                خدمات فعال در قراردادهای جدید پیشنهاد می‌شوند و قیمت‌های این بخش مبنای محاسبه آینده هستند.
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#7d6841]">
              {formatPersianNumber(services.length)} خدمت نمایش داده شده
            </span>
          </div>

          {services.length ? (
            services.map((service) => (
              <ServiceCatalogRow
                key={service.id}
                service={service}
                canEdit={canEdit}
                editHref={makeServicesHref(currentQuery, {
                  edit: service.id,
                  action: null,
                })}
              />
            ))
          ) : hasAnyService ? (
            <FilteredEmptyState />
          ) : (
            <EmptyState addHref={makeServicesHref(currentQuery, { action: "add" })} />
          )}
        </div>

        <RelatedSections addHref={makeServicesHref(currentQuery, { action: "add" })} />
      </div>

      {showCreateDrawer ? (
        <ServiceEditorDrawer
          title="افزودن خدمت جدید"
          description="خدمت جدید را با دسته‌بندی، نوع قیمت‌گذاری و قیمت ریالی ثبت کنید تا در قراردادهای جدید قابل انتخاب باشد."
          closeHref={closeDrawerHref}
        >
          <ServiceForm mode="create" canEdit={canEdit} />
        </ServiceEditorDrawer>
      ) : null}

      {showEditDrawer && selectedEditorService ? (
        <ServiceEditorDrawer
          title="ویرایش خدمت مراسم"
          description="اطلاعات پایه خدمت را برای استفاده در قراردادهای آینده به‌روزرسانی کنید."
          closeHref={closeDrawerHref}
        >
          <ServiceForm
            mode="edit"
            values={toFormValues(selectedEditorService)}
            canEdit={canEdit}
          />
        </ServiceEditorDrawer>
      ) : null}
    </section>
  );
}

function PageHero({
  tenantName,
  today,
  addHref,
  missingHref,
}: {
  tenantName: string;
  today: string;
  addHref: string;
  missingHref: string;
}) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.24),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7 lg:p-8">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:px-4 sm:py-2 sm:text-sm">
            <Sparkles size={15} />
            تعاریف پایه / خدمات مراسم
          </div>
          <h1 className="mt-4 text-2xl font-black leading-tight sm:mt-5 sm:text-4xl">
            مدیریت خدمات مراسم
          </h1>
          <p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-[#6d5f49] sm:mt-4 sm:text-base sm:leading-8">
            خدمات قابل ارائه در قراردادها، نوع قیمت‌گذاری، قیمت ریالی و وضعیت فعال هر خدمت را از این بخش مدیریت کنید.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black text-[#7d6841]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/60 bg-[#fff8ea]/76 px-3 py-1.5">
              <CalendarDays size={16} className="text-[#9f7131]" />
              {today}
            </span>
            <span className="inline-flex rounded-full border border-[#25a46d]/20 bg-[#25a46d]/10 px-3 py-1.5 text-[#17483f]">
              فضای کاری: {tenantName}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:min-w-80">
          <Link href={addHref} className="btn-luxury-primary px-5 py-3">
            <Plus size={17} />
            افزودن خدمت جدید
          </Link>
          <Link
            href={missingHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#c7a15a]/38 bg-[#fff8ea]/82 px-5 py-3 text-sm font-black text-[#7d6841] hover:border-[#c7a15a]/70"
          >
            <AlertTriangle size={17} />
            مشاهده خدمات بدون قیمت
          </Link>
        </div>
      </div>
    </div>
  );
}

function KpiGrid({
  totalCount,
  activeCount,
  readyCount,
  missingCount,
  requiredCount,
  lastUpdatedAt,
}: {
  totalCount: number;
  activeCount: number;
  readyCount: number;
  missingCount: number;
  requiredCount: number;
  lastUpdatedAt: Date | null;
}) {
  const cards = [
    { label: "تعداد خدمات", value: formatPersianNumber(totalCount), icon: Layers3 },
    { label: "خدمات فعال", value: formatPersianNumber(activeCount), icon: CheckCircle2 },
    { label: "آماده قرارداد", value: formatPersianNumber(readyCount), icon: BadgeCheck },
    { label: "بدون قیمت", value: formatPersianNumber(missingCount), icon: AlertTriangle, tone: "warning" as const },
    { label: "خدمات الزامی", value: formatPersianNumber(requiredCount), icon: UsersRound },
    { label: "آخرین به‌روزرسانی", value: lastUpdatedAt ? formatJalaliDateTime(lastUpdatedAt) : "—", icon: CalendarDays },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.label}
            className={`flex min-h-32 flex-col justify-between rounded-[1.35rem] border p-3.5 text-[#111827] shadow-[0_18px_56px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-4 ${
              card.tone === "warning"
                ? "border-[#d9a441]/35 bg-[#fff7dc]/96"
                : "border-[#d8c08b]/62 bg-[#fff9ee]/96"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black leading-6 text-[#7d6841]">
                {card.label}
              </p>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
                <Icon size={16} />
              </span>
            </div>
            <p className="mt-3 break-words text-lg font-black leading-tight sm:text-xl">
              {card.value}
            </p>
          </article>
        );
      })}
    </div>
  );
}

function MissingPriceNotice({ count, href }: { count: number; href: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-[1.55rem] border border-[#d9a441]/35 bg-[#fff7dc]/92 p-4 text-[#111827] shadow-[0_16px_48px_rgba(138,91,16,0.08)] sm:flex-row sm:items-center sm:justify-between sm:rounded-[1.85rem]">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#8a5b10] text-[#fff8ea]">
          <AlertTriangle size={18} />
        </span>
        <div>
          <h2 className="text-sm font-black text-[#8a5b10]">
            {formatPersianNumber(count)} خدمت فعال بدون قیمت هستند.
          </h2>
          <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">
            برای محاسبه دقیق قراردادها، قیمت این خدمات را تکمیل کنید.
          </p>
        </div>
      </div>
      <Link href={href} className="btn-luxury-dark min-h-11 px-4 py-2 text-sm">
        مشاهده بدون قیمت‌ها
        <ArrowLeft size={16} />
      </Link>
    </section>
  );
}

function CategoryTabs({
  selectedCategory,
  currentQuery,
  services,
  missingCount,
}: {
  selectedCategory: CategoryKey;
  currentQuery: Record<string, string | undefined>;
  services: ServiceView[];
  missingCount: number;
}) {
  const tabs = [
    ...categoryDefinitions.map((category) => ({
      key: category.key,
      label: category.label,
      icon: category.icon,
      count: category.value
        ? services.filter((service) => service.category === category.value).length
        : services.length,
      href: makeServicesHref(currentQuery, {
        category: category.key,
        missingPrice: null,
        priceStatus: null,
        action: null,
        edit: null,
      }),
      active: selectedCategory === category.key && currentQuery.missingPrice !== "1",
    })),
    {
      key: "MISSING",
      label: "بدون قیمت",
      icon: AlertTriangle,
      count: missingCount,
      href: makeServicesHref(currentQuery, {
        category: "ALL",
        status: "active",
        priceStatus: "missing",
        missingPrice: "1",
        action: null,
        edit: null,
      }),
      active: currentQuery.missingPrice === "1",
    },
  ];

  return (
    <nav className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex min-w-max gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-black transition ${
                tab.active
                  ? "border-[#111827] bg-[#111827] text-[#fff8ea] shadow-[0_14px_34px_rgba(17,24,39,0.18)]"
                  : "border-[#d8c08b]/62 bg-[#fff9ee]/90 text-[#7d6841] hover:border-[#c7a15a]/70"
              }`}
            >
              <Icon size={16} className={tab.active ? "text-[#f0dba9]" : "text-[#9f7131]"} />
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-[0.7rem] ${
                  tab.active ? "bg-white/12 text-[#f0dba9]" : "bg-[#c7a15a]/12 text-[#7d6841]"
                }`}
              >
                {formatPersianNumber(tab.count)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function FilterBar({
  selectedCategory,
  selectedStatus,
  selectedPricingType,
  selectedPriceStatus,
  selectedRequired,
  selectedSort,
  query,
}: {
  selectedCategory: CategoryKey;
  selectedStatus: string;
  selectedPricingType: string;
  selectedPriceStatus: PriceStatus;
  selectedRequired: RequiredStatus;
  selectedSort: SortMode;
  query: string;
}) {
  return (
    <form
      action="/dashboard/services"
      className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[1.85rem] sm:p-5"
    >
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm font-black text-[#17483f]">
          <Filter size={18} />
          فیلتر سریع خدمات
        </div>
        <Link
          href="/dashboard/services"
          className="inline-flex w-fit min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-4 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
        >
          <X size={14} />
          حذف
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.25fr_0.9fr_0.9fr_0.9fr_0.85fr_0.95fr_auto] xl:items-end">
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
              placeholder="نام یا کد خدمت"
              className="input-luxury pl-11"
            />
          </div>
        </label>
        <SelectFilter name="category" label="دسته‌بندی" defaultValue={selectedCategory}>
          {categoryDefinitions.map((category) => (
            <option key={category.key} value={category.key}>
              {category.label}
            </option>
          ))}
        </SelectFilter>
        <SelectFilter name="pricingType" label="نوع قیمت" defaultValue={selectedPricingType}>
          <option value="all">همه</option>
          {Object.entries(pricingTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectFilter>
        <SelectFilter name="status" label="وضعیت" defaultValue={selectedStatus}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectFilter>
        <SelectFilter name="priceStatus" label="قیمت" defaultValue={selectedPriceStatus}>
          {priceStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectFilter>
        <SelectFilter name="required" label="الزام" defaultValue={selectedRequired}>
          {requiredOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectFilter>
        <div className="grid gap-2 md:grid-cols-[1fr_auto] xl:grid-cols-1">
          <SelectFilter name="sort" label="مرتب‌سازی" defaultValue={selectedSort}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectFilter>
          <button type="submit" className="btn-luxury-dark min-h-12 px-5 xl:mt-0">
            اعمال
          </button>
        </div>
      </div>
    </form>
  );
}

function SelectFilter({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
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

function ServiceCatalogRow({
  service,
  canEdit,
  editHref,
}: {
  service: ServiceView;
  canEdit: boolean;
  editHref: string;
}) {
  const missingPrice = isMissingPrice(service);
  const catalogPrice = getServiceCatalogPrice(service);
  const readinessLabel = service.isActive
    ? missingPrice
      ? "قیمت ثبت نشده"
      : "آماده قرارداد"
    : "غیرفعال";

  return (
    <article className="overflow-hidden rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_14px_48px_rgba(17,24,39,0.06)] sm:rounded-[1.85rem]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.78fr)_minmax(17rem,0.72fr)] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge active={service.isActive} />
            <PriceStatusBadge missing={missingPrice} />
            {service.isRequired ? <RequiredBadge /> : null}
            {service.category ? <CategoryBadge label={service.category} /> : null}
            {service.code ? (
              <span className="rounded-full border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#7d6841]">
                کد: {service.code}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="min-w-0 text-lg font-black leading-tight sm:text-xl">
              {service.title}
            </h2>
            <span className="shrink-0 text-left text-xl font-black text-[#17483f] sm:text-2xl">
              {service.pricingType === "CUSTOM"
                ? "توافقی"
                : catalogPrice > 0
                  ? formatIRR(catalogPrice)
                  : "—"}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm font-bold leading-7 text-[#6d5f49]">
            {service.description || "توضیحی ثبت نشده است."}
          </p>
        </div>

        <div className="grid gap-2 rounded-3xl border border-[#d8c08b]/52 bg-[#fff8ea]/74 p-3.5">
          <InfoLine label="نوع قیمت‌گذاری" value={pricingTypeLabels[service.pricingType]} />
          <InfoLine label="واحد" value={service.unit || "—"} />
          <InfoLine label="قیمت واحد" value={service.price === "0" ? "—" : formatIRR(service.price)} />
          <InfoLine label="مبلغ پایه" value={service.basePrice ? formatIRR(service.basePrice) : "—"} />
          <InfoLine label="فرمول" value={formulaPreviewLabels[service.pricingType]} />
          <div className="mt-1 rounded-2xl border border-[#c7a15a]/32 bg-[#c7a15a]/10 px-3 py-2 text-xs font-black leading-6 text-[#7d6841]">
            نمونه: {formatFormulaExample(service)}
          </div>
        </div>

        <div className="grid gap-3">
          <div
            className={`rounded-3xl border p-3.5 ${
              missingPrice
                ? "border-[#d9a441]/35 bg-[#fff7dc] text-[#8a5b10]"
                : "border-[#25a46d]/20 bg-[#ecfff5] text-[#126141]"
            }`}
          >
            <p className="text-xs font-black">وضعیت استفاده</p>
            <p className="mt-1 text-sm font-black">{readinessLabel}</p>
            <p className="mt-2 text-xs font-bold leading-6 text-[#6d5f49]">
              آخرین تغییر: {formatJalaliDateTime(service.updatedAt)}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
            <Link href={editHref} className="btn-luxury-dark min-h-11 px-4 py-2 text-sm">
              <Edit3 size={16} />
              {missingPrice ? "تکمیل قیمت" : "ویرایش"}
            </Link>
            <PreviewDetails service={service} />
          </div>

          <QuickServicePriceForm
            serviceId={service.id}
            unitPrice={service.price}
            basePrice={service.basePrice ?? ""}
            pricingType={service.pricingType}
            canEdit={canEdit}
          />
          <ToggleServiceStatusForm
            serviceId={service.id}
            isActive={service.isActive}
            canEdit={canEdit}
          />
        </div>
      </div>
    </article>
  );
}

function PreviewDetails({ service }: { service: ServiceView }) {
  return (
    <details className="group rounded-2xl border border-[#d8c08b]/60 bg-[#fff8ea]/80">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 px-4 py-2 text-sm font-black text-[#172033]">
        <CircleDollarSign size={16} className="text-[#9f7131]" />
        پیش‌نمایش
      </summary>
      <div className="grid gap-2 border-t border-[#d8c08b]/50 p-3 text-xs font-bold leading-6 text-[#6d5f49]">
        <p>{formatFormulaExample(service)}</p>
        <p>{service.allowPriceOverride ? "قیمت هنگام ثبت قرارداد قابل تغییر است." : "قیمت از همین فهرست اعمال می‌شود."}</p>
      </div>
    </details>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 font-bold text-[#7d6841]">{label}</span>
      <span className="text-left font-black leading-6 text-[#111827]">{value}</span>
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

function PriceStatusBadge({ missing }: { missing: boolean }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${
        missing
          ? "border-[#d9a441]/32 bg-[#fff7dc] text-[#8a5b10]"
          : "border-[#25a46d]/20 bg-[#ecfff5] text-[#126141]"
      }`}
    >
      {missing ? "قیمت ثبت نشده" : "قیمت ثبت‌شده"}
    </span>
  );
}

function RequiredBadge() {
  return (
    <span className="rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/14 px-3 py-1 text-xs font-black text-[#7d6841]">
      الزامی
    </span>
  );
}

function CategoryBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#25a46d]/18 bg-[#25a46d]/10 px-3 py-1 text-xs font-black text-[#17483f]">
      {label}
    </span>
  );
}

function ServiceEditorDrawer({
  title,
  description,
  closeHref,
  children,
}: {
  title: string;
  description: string;
  closeHref: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#07111f]/55 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-6">
      <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-[#d8c08b]/62 bg-[#fff9ee] p-4 text-[#111827] shadow-[0_32px_120px_rgba(0,0,0,0.32)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-[#17483f]">فرم خدمات مراسم</p>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
              {description}
            </p>
          </div>
          <Link
            href={closeHref}
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/80 text-[#7d6841]"
            aria-label="بستن فرم"
          >
            <X size={18} />
          </Link>
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}

function EmptyState({ addHref }: { addHref: string }) {
  return (
    <section className="rounded-[1.75rem] border border-dashed border-[#c7a15a]/55 bg-[#fff9ee]/94 p-5 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-7">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
        <Music2 size={24} />
      </div>
      <h2 className="mt-5 text-2xl font-black">هنوز خدمتی تعریف نشده است</h2>
      <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
        خدمات تصویری، موسیقی، تشریفات عقد، نیروی انسانی و جلوه‌های ویژه را به‌عنوان تعاریف پایه ثبت کنید.
      </p>
      <Link href={addHref} className="btn-luxury-primary mt-5 px-5 py-3">
        <Plus size={17} />
        افزودن اولین خدمت
      </Link>
    </section>
  );
}

function FilteredEmptyState() {
  return (
    <section className="rounded-[1.75rem] border border-dashed border-[#c7a15a]/55 bg-[#fff9ee]/94 p-5 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-7">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
        <Search size={24} />
      </div>
      <h2 className="mt-5 text-2xl font-black">خدمتی با این فیلتر پیدا نشد</h2>
      <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49]">
        فیلتر دسته‌بندی، وضعیت قیمت، الزام یا عبارت جست‌وجو را تغییر دهید.
      </p>
      <Link href="/dashboard/services" className="btn-luxury-dark mt-5 px-5 py-3">
        حذف فیلترها
      </Link>
    </section>
  );
}

function RelatedSections({ addHref }: { addHref: string }) {
  const links = [
    { href: addHref, title: "افزودن خدمت جدید", icon: Plus },
    { href: "/dashboard/menus", title: "تعریف منوی پذیرایی", icon: Sparkles },
    { href: "/dashboard/contracts/new", title: "ثبت قرارداد جدید", icon: BadgeCheck },
    { href: "/dashboard/base", title: "بازگشت به تعاریف پایه", icon: ArrowLeft },
  ];

  return (
    <aside className="space-y-4 xl:sticky xl:top-6">
      <section className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem] sm:p-5">
        <p className="text-xs font-black text-[#f0dba9]">اتصال عملیاتی</p>
        <h2 className="mt-1 text-lg font-black">بعد از تکمیل قیمت‌ها</h2>
        <p className="mt-2 text-xs font-bold leading-6 text-[#d9caa9]">
          خدمات فعال بلافاصله در ثبت قرارداد جدید قابل انتخاب هستند.
        </p>
        <div className="gold-divider my-5" />
        <div className="grid gap-2.5">
          {links.map((link) => {
            const Icon = link.icon;

            return (
              <Link
                key={`${link.href}-${link.title}`}
                href={link.href}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3 text-sm font-black text-[#fff8ea] transition hover:border-[#e8c478]/30 hover:bg-white/[0.08]"
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} className="text-[#f0dba9]" />
                  {link.title}
                </span>
                <ArrowLeft size={16} className="text-[#f0dba9]" />
              </Link>
            );
          })}
        </div>
      </section>
    </aside>
  );
}

function formatFormulaExample(service: ServiceView) {
  const price = getServiceCatalogPrice(service);

  if (service.pricingType === "FIXED") {
    return price > 0 ? `مبلغ ثابت ${formatIRR(price)}` : "مبلغ ثابت هنوز ثبت نشده است.";
  }

  if (service.pricingType === "PER_GUEST") {
    return price > 0
      ? `۱۰۰ مهمان × ${formatIRR(price)} = ${formatIRR(price * 100)}`
      : "تعداد مهمان × قیمت هر مهمان";
  }

  if (service.pricingType === "PER_ITEM") {
    return price > 0
      ? `تعداد × ${formatIRR(price)} برای هر ${service.unit || "مورد"}`
      : "تعداد × قیمت واحد";
  }

  if (service.pricingType === "PER_HOUR") {
    return price > 0
      ? `ساعت × ${formatIRR(price)} برای هر ساعت`
      : "ساعت × قیمت هر ساعت";
  }

  return "مبلغ توافقی هنگام ثبت قرارداد وارد می‌شود.";
}

function isPricingType(value: string | undefined): value is ServicePricingType {
  return Boolean(value && value in pricingTypeLabels);
}

function getStatus(value: string | undefined) {
  return value === "active" || value === "inactive" ? value : "all";
}

function getPriceStatus(value: string | undefined): PriceStatus {
  return value === "priced" || value === "missing" ? value : "all";
}

function getRequiredStatus(value: string | undefined): RequiredStatus {
  return value === "required" || value === "optional" ? value : "all";
}

function getSortMode(value: string | undefined): SortMode {
  return sortOptions.some((option) => option.value === value)
    ? (value as SortMode)
    : "newest";
}

function getCategoryKey(value: string | undefined): CategoryKey {
  if (value && categoryDefinitions.some((category) => category.key === value)) {
    return value as CategoryKey;
  }

  const byPersianValue = categoryDefinitions.find(
    (category) => category.value === value,
  );

  return byPersianValue?.key ?? "ALL";
}

function toNumber(value: string | null | { toString(): string } | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

function getServiceCatalogPrice(service: {
  pricingType: ServicePricingType;
  price: string | { toString(): string };
  basePrice: string | { toString(): string } | null;
}) {
  const unitPrice = toNumber(service.price);
  const basePrice = service.basePrice === null ? null : toNumber(service.basePrice);

  return service.pricingType === "FIXED" ? (basePrice ?? unitPrice) : unitPrice;
}

function isMissingPrice(service: ServiceView) {
  return service.pricingType !== "CUSTOM" && getServiceCatalogPrice(service) <= 0;
}

function filterByPriceStatus(service: ServiceView, priceStatus: PriceStatus) {
  if (priceStatus === "missing") {
    return service.isActive && isMissingPrice(service);
  }

  if (priceStatus === "priced") {
    return !isMissingPrice(service);
  }

  return true;
}

function sortServices(services: ServiceView[], sort: SortMode) {
  const sorted = [...services];

  if (sort === "name") {
    return sorted.sort((a, b) => a.title.localeCompare(b.title, "fa"));
  }

  if (sort === "price_asc") {
    return sorted.sort((a, b) => getServiceCatalogPrice(a) - getServiceCatalogPrice(b));
  }

  if (sort === "price_desc") {
    return sorted.sort((a, b) => getServiceCatalogPrice(b) - getServiceCatalogPrice(a));
  }

  if (sort === "missing_first") {
    return sorted.sort((a, b) => {
      const missingDiff = Number(isMissingPrice(b)) - Number(isMissingPrice(a));
      if (missingDiff !== 0) {
        return missingDiff;
      }

      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  }

  return sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

function toServiceView(service: {
  id: string;
  title: string;
  code: string | null;
  category: string | null;
  pricingType: ServicePricingType;
  unit: string;
  price: { toString(): string };
  basePrice: { toString(): string } | null;
  sortOrder: number | null;
  description: string | null;
  notes: string | null;
  isRequired: boolean;
  allowPriceOverride: boolean;
  isActive: boolean;
  updatedAt: Date;
}): ServiceView {
  return {
    ...service,
    price: service.price.toString(),
    basePrice: service.basePrice?.toString() ?? null,
  };
}

function toFormValues(service: ServiceView): ServiceFormValues {
  return {
    id: service.id,
    title: service.title,
    code: service.code ?? "",
    category: service.category ?? "خدمات تصویری و اجرایی",
    pricingType: service.pricingType,
    unit: service.unit,
    price: service.price,
    basePrice: service.basePrice ?? "",
    sortOrder: service.sortOrder === null ? "" : String(service.sortOrder),
    description: service.description ?? "",
    notes: service.notes ?? "",
    isRequired: service.isRequired,
    allowPriceOverride: service.allowPriceOverride,
    isActive: service.isActive,
  };
}

function sanitizeQuery(params: ServicesPageProps["searchParams"] extends Promise<infer T> ? T : never) {
  const clean: Record<string, string | undefined> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) {
      clean[key] = value;
    }
  });

  return clean;
}

function makeServicesHref(
  currentQuery: Record<string, string | undefined>,
  patch: QueryPatch,
) {
  const params = new URLSearchParams();

  Object.entries(currentQuery).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  Object.entries(patch).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `/dashboard/services?${query}` : "/dashboard/services";
}
