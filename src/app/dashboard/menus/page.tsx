import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { Prisma, ServicePricingType } from "@prisma/client";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  Filter,
  Layers3,
  PackageCheck,
  Plus,
  Search,
  Sparkles,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  MenuForm,
  QuickMenuPriceForm,
  type MenuFormValues,
  ToggleMenuStatusForm,
} from "@/components/dashboard/menu-management-forms";
import { requireTenantMember } from "@/lib/auth/session";
import { ensureContractCatalogDefaults } from "@/lib/contract-defaults";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";

type MenusPageProps = {
  searchParams: Promise<{
    status?: string;
    category?: string;
    pricingType?: string;
    priceStatus?: string;
    missingPrice?: string;
    sort?: string;
    q?: string;
    action?: string;
    edit?: string;
  }>;
};

type CategoryKey = "ALL" | "FOOD" | "DRINK" | "DESSERT" | "PACKAGE";
type PriceStatus = "all" | "priced" | "missing";
type SortMode = "newest" | "name" | "price_asc" | "price_desc" | "missing_first";

type MenuView = {
  id: string;
  title: string;
  code: string | null;
  category: string | null;
  pricingType: ServicePricingType;
  unit: string;
  pricePerGuest: string;
  basePrice: string | null;
  sortOrder: number | null;
  minGuests: number | null;
  maxGuests: number | null;
  includedItems: string | null;
  description: string | null;
  notes: string | null;
  isRecommended: boolean;
  isTaxable: boolean;
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
  { key: "FOOD", label: "غذاهای اصلی", value: "غذاهای اصلی", icon: Utensils },
  { key: "DRINK", label: "نوشیدنی‌ها", value: "نوشیدنی‌ها", icon: Sparkles },
  { key: "DESSERT", label: "دسرها و مخلفات", value: "دسرها و مخلفات", icon: PackageCheck },
  { key: "PACKAGE", label: "پکیج‌ها", value: "پکیج‌ها", icon: BadgeCheck },
];

const pricingTypeLabels: Record<ServicePricingType, string> = {
  FIXED: "مبلغ ثابت",
  PER_GUEST: "به ازای هر مهمان",
  PER_HOUR: "به ازای هر ساعت",
  PER_ITEM: "به ازای تعداد",
  CUSTOM: "توافقی",
};

const formulaPreviewLabels: Record<ServicePricingType, string> = {
  FIXED: "مبلغ ثابت",
  PER_GUEST: "تعداد مهمان × قیمت هر نفر",
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

const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: "newest", label: "جدیدترین" },
  { value: "name", label: "نام" },
  { value: "price_asc", label: "کمترین قیمت" },
  { value: "price_desc", label: "بیشترین قیمت" },
  { value: "missing_first", label: "بدون قیمت‌ها ابتدا" },
];

export default async function MenusPage({ searchParams }: MenusPageProps) {
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
  const selectedSort = getSortMode(params.sort);
  const query = params.q?.trim() ?? "";
  const selectedCategoryValue = categoryDefinitions.find(
    (category) => category.key === selectedCategory,
  )?.value;
  const currentQuery = sanitizeQuery(params);

  const where: Prisma.MenuWhereInput = { tenantId };

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

  if (query) {
    where.OR = [{ title: { contains: query } }, { code: { contains: query } }];
  }

  const [rawMenus, allMenus] = await Promise.all([
    db.menu.findMany({
      where,
      orderBy: [
        { isActive: "desc" },
        { sortOrder: "asc" },
        { updatedAt: "desc" },
      ],
    }),
    db.menu.findMany({
      where: { tenantId },
      orderBy: [{ updatedAt: "desc" }],
    }),
  ]);

  const menus = sortMenus(
    rawMenus
      .map(toMenuView)
      .filter((menu) => filterByPriceStatus(menu, selectedPriceStatus)),
    selectedSort,
  );
  const menuViews = allMenus.map(toMenuView);
  const activeCount = menuViews.filter((menu) => menu.isActive).length;
  const missingPriceMenus = menuViews.filter(
    (menu) => menu.isActive && isMissingPrice(menu),
  );
  const readyCount = menuViews.filter(
    (menu) => menu.isActive && !isMissingPrice(menu),
  ).length;
  const averagePerGuest = calculateAveragePerGuest(menuViews);
  const lastUpdatedAt = menuViews[0]?.updatedAt ?? null;
  const selectedEditorMenu = params.edit
    ? menuViews.find((menu) => menu.id === params.edit)
    : null;
  const showCreateDrawer = params.action === "add";
  const showEditDrawer = Boolean(selectedEditorMenu);
  const closeDrawerHref = makeMenusHref(currentQuery, {
    action: null,
    edit: null,
  });
  const hasAnyMenu = menuViews.length > 0;

  return (
    <section className="space-y-5 sm:space-y-7">
      <PageHero
        tenantName={membership.tenant.name}
        today={formatJalaliDate(new Date())}
        addHref={makeMenusHref(currentQuery, { action: "add", edit: null })}
        missingHref={makeMenusHref(currentQuery, {
          status: "active",
          priceStatus: "missing",
          missingPrice: "1",
          category: "ALL",
          action: null,
          edit: null,
        })}
      />

      <KpiGrid
        totalCount={menuViews.length}
        activeCount={activeCount}
        readyCount={readyCount}
        missingCount={missingPriceMenus.length}
        averagePerGuest={averagePerGuest}
        lastUpdatedAt={lastUpdatedAt}
      />

      {missingPriceMenus.length > 0 ? (
        <MissingPriceNotice
          count={missingPriceMenus.length}
          href={makeMenusHref(currentQuery, {
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
        menus={menuViews}
        missingCount={missingPriceMenus.length}
      />

      <FilterBar
        selectedCategory={selectedCategory}
        selectedStatus={selectedStatus}
        selectedPricingType={selectedPricingType}
        selectedPriceStatus={selectedPriceStatus}
        selectedSort={selectedSort}
        query={query}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 rounded-[1.4rem] border border-[#d8c08b]/50 bg-[#fff9ee]/90 px-4 py-3 text-[#111827] shadow-[0_14px_42px_rgba(17,24,39,0.06)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black">فهرست قیمت پذیرایی</h2>
              <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">
                قیمت‌ها منبع اصلی قراردادهای جدید هستند و قراردادهای قبلی snapshot خود را حفظ می‌کنند.
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#7d6841]">
              {formatPersianNumber(menus.length)} آیتم نمایش داده شده
            </span>
          </div>

          {menus.length ? (
            menus.map((menu) => (
              <MenuCatalogRow
                key={menu.id}
                menu={menu}
                canEdit={canEdit}
                editHref={makeMenusHref(currentQuery, {
                  edit: menu.id,
                  action: null,
                })}
              />
            ))
          ) : hasAnyMenu ? (
            <FilteredEmptyState />
          ) : (
            <EmptyState addHref={makeMenusHref(currentQuery, { action: "add" })} />
          )}
        </div>

        <RelatedSections addHref={makeMenusHref(currentQuery, { action: "add" })} />
      </div>

      {showCreateDrawer ? (
        <MenuEditorDrawer
          title="افزودن آیتم پذیرایی"
          description="آیتم جدید را با دسته‌بندی، نوع قیمت‌گذاری و قیمت ریالی ثبت کنید تا در قراردادهای جدید قابل انتخاب باشد."
          closeHref={closeDrawerHref}
        >
          <MenuForm mode="create" canEdit={canEdit} />
        </MenuEditorDrawer>
      ) : null}

      {showEditDrawer && selectedEditorMenu ? (
        <MenuEditorDrawer
          title="ویرایش آیتم پذیرایی"
          description="ویرایش اطلاعات پایه فقط برای قراردادهای آینده استفاده می‌شود و روی snapshot قراردادهای قبلی اثر ندارد."
          closeHref={closeDrawerHref}
        >
          <MenuForm
            mode="edit"
            values={toFormValues(selectedEditorMenu)}
            canEdit={canEdit}
          />
        </MenuEditorDrawer>
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
            <Utensils size={15} />
            تعاریف پایه / فهرست پذیرایی
          </div>
          <h1 className="mt-4 text-2xl font-black leading-tight sm:mt-5 sm:text-4xl">
            مدیریت منوی پذیرایی
          </h1>
          <p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-[#6d5f49] sm:mt-4 sm:text-base sm:leading-8">
            قیمت آیتم‌های پذیرایی، نوشیدنی، دسر و پکیج‌ها را تعریف کنید تا ثبت قراردادها با آخرین قیمت‌های فعال انجام شود.
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
            افزودن آیتم پذیرایی
          </Link>
          <Link
            href={missingHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#c7a15a]/38 bg-[#fff8ea]/82 px-5 py-3 text-sm font-black text-[#7d6841] hover:border-[#c7a15a]/70"
          >
            <AlertTriangle size={17} />
            مشاهده آیتم‌های بدون قیمت
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
  averagePerGuest,
  lastUpdatedAt,
}: {
  totalCount: number;
  activeCount: number;
  readyCount: number;
  missingCount: number;
  averagePerGuest: number | null;
  lastUpdatedAt: Date | null;
}) {
  const cards = [
    { label: "تعداد آیتم‌ها", value: formatPersianNumber(totalCount), icon: Layers3 },
    { label: "آیتم‌های فعال", value: formatPersianNumber(activeCount), icon: CheckCircle2 },
    { label: "آماده قرارداد", value: formatPersianNumber(readyCount), icon: BadgeCheck },
    { label: "بدون قیمت", value: formatPersianNumber(missingCount), icon: AlertTriangle, tone: "warning" as const },
    { label: "میانگین قیمت هر نفر", value: averagePerGuest === null ? "—" : formatIRR(averagePerGuest), icon: WalletCards },
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
    <section className="flex flex-col gap-3 rounded-[1.55rem] border border-[#d9a441]/34 bg-[linear-gradient(135deg,rgba(255,247,220,0.96),rgba(255,249,238,0.94))] p-4 text-[#111827] shadow-[0_16px_48px_rgba(217,164,65,0.10)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#8a5b10] text-[#fff8ea]">
          <AlertTriangle size={18} />
        </span>
        <div>
          <h2 className="text-sm font-black text-[#8a5b10]">
            {formatPersianNumber(count)} آیتم فعال بدون قیمت هستند.
          </h2>
          <p className="mt-1 text-sm font-bold leading-7 text-[#6d5f49]">
            برای استفاده دقیق در قراردادها، قیمت این آیتم‌ها را از قیمت سریع یا فرم ویرایش تکمیل کنید.
          </p>
        </div>
      </div>
      <Link href={href} className="btn-luxury-dark min-h-11 px-4 py-2 text-sm">
        مشاهده بدون قیمت‌ها
      </Link>
    </section>
  );
}

function CategoryTabs({
  selectedCategory,
  currentQuery,
  menus,
  missingCount,
}: {
  selectedCategory: CategoryKey;
  currentQuery: Record<string, string | undefined>;
  menus: MenuView[];
  missingCount: number;
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex min-w-max gap-2">
        {categoryDefinitions.map((category) => {
          const Icon = category.icon;
          const active = selectedCategory === category.key;
          const count = category.value
            ? menus.filter((menu) => menu.category === category.value).length
            : menus.length;

          return (
            <Link
              key={category.key}
              href={makeMenusHref(currentQuery, {
                category: category.key,
                priceStatus: null,
                missingPrice: null,
                action: null,
                edit: null,
              })}
              className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-black ${
                active
                  ? "border-[#c7a15a]/70 bg-[#f0dba9] text-[#111827] shadow-[0_12px_36px_rgba(199,161,90,0.22)]"
                  : "border-[#d8c08b]/35 bg-[#fff9ee]/12 text-[#fff0c7] backdrop-blur hover:bg-[#fff9ee]/18"
              }`}
            >
              <Icon size={16} />
              {category.label}
              <span className="rounded-full bg-black/10 px-2 py-0.5 text-[0.7rem]">
                {formatPersianNumber(count)}
              </span>
            </Link>
          );
        })}
        <Link
          href={makeMenusHref(currentQuery, {
            category: "ALL",
            status: "active",
            priceStatus: "missing",
            missingPrice: "1",
            action: null,
            edit: null,
          })}
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#d9a441]/36 bg-[#fff7dc]/14 px-4 py-2 text-sm font-black text-[#ffe3a1] backdrop-blur hover:bg-[#fff7dc]/20"
        >
          <AlertTriangle size={16} />
          بدون قیمت
          <span className="rounded-full bg-black/10 px-2 py-0.5 text-[0.7rem]">
            {formatPersianNumber(missingCount)}
          </span>
        </Link>
      </div>
    </div>
  );
}

function FilterBar({
  selectedCategory,
  selectedStatus,
  selectedPricingType,
  selectedPriceStatus,
  selectedSort,
  query,
}: {
  selectedCategory: CategoryKey;
  selectedStatus: string;
  selectedPricingType: ServicePricingType | "all";
  selectedPriceStatus: PriceStatus;
  selectedSort: SortMode;
  query: string;
}) {
  return (
    <form
      action="/dashboard/menus"
      className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[1.85rem]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black text-[#17483f]">
          <Filter size={18} />
          جست‌وجو و فیلتر سریع
        </div>
        <Link
          href="/dashboard/menus"
          className="text-xs font-black text-[#7d6841] underline-offset-4 hover:underline"
        >
          حذف فیلترها
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_0.8fr_0.8fr_0.85fr_0.85fr_auto] xl:items-end">
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
              placeholder="نام یا کد آیتم"
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

function MenuCatalogRow({
  menu,
  canEdit,
  editHref,
}: {
  menu: MenuView;
  canEdit: boolean;
  editHref: string;
}) {
  const missingPrice = isMissingPrice(menu);
  const catalogPrice = getMenuCatalogPrice(menu);
  const readinessLabel = menu.isActive
    ? missingPrice
      ? "قیمت ثبت نشده"
      : "آماده قرارداد"
    : "غیرفعال";

  return (
    <article className="overflow-hidden rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_14px_48px_rgba(17,24,39,0.06)] sm:rounded-[1.85rem]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.78fr)_minmax(17rem,0.72fr)] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge active={menu.isActive} />
            <PriceStatusBadge missing={missingPrice} />
            {menu.category ? <CategoryBadge label={menu.category} /> : null}
            {menu.code ? (
              <span className="rounded-full border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#7d6841]">
                کد: {menu.code}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="min-w-0 text-lg font-black leading-tight sm:text-xl">
              {menu.title}
            </h2>
            <span className="shrink-0 text-left text-xl font-black text-[#17483f] sm:text-2xl">
              {catalogPrice > 0 ? formatIRR(catalogPrice) : "—"}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm font-bold leading-7 text-[#6d5f49]">
            {menu.description || "توضیحی ثبت نشده است."}
          </p>
          {menu.category === "پکیج‌ها" && menu.includedItems ? (
            <details className="mt-3 rounded-2xl border border-[#d8c08b]/52 bg-[#fff8ea]/76 p-3">
              <summary className="cursor-pointer list-none text-xs font-black text-[#7d6841]">
                اقلام داخل پکیج
              </summary>
              <p className="mt-2 whitespace-pre-line text-sm font-bold leading-7 text-[#111827]">
                {menu.includedItems}
              </p>
            </details>
          ) : null}
        </div>

        <div className="grid gap-2 rounded-3xl border border-[#d8c08b]/52 bg-[#fff8ea]/74 p-3.5">
          <InfoLine label="نوع قیمت‌گذاری" value={pricingTypeLabels[menu.pricingType]} />
          <InfoLine label="واحد" value={menu.unit || "—"} />
          <InfoLine label="فرمول" value={formulaPreviewLabels[menu.pricingType]} />
          <InfoLine label="محدوده مهمان" value={formatGuestRange(menu)} />
          <div className="mt-1 rounded-2xl border border-[#c7a15a]/32 bg-[#c7a15a]/10 px-3 py-2 text-xs font-black leading-6 text-[#7d6841]">
            نمونه: {formatFormulaExample(menu)}
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
              آخرین تغییر: {formatJalaliDateTime(menu.updatedAt)}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
            <Link href={editHref} className="btn-luxury-dark min-h-11 px-4 py-2 text-sm">
              <Edit3 size={16} />
              {missingPrice ? "تکمیل قیمت" : "ویرایش"}
            </Link>
            <PreviewDetails menu={menu} />
          </div>

          <QuickMenuPriceForm
            menuId={menu.id}
            unitPrice={menu.pricePerGuest}
            basePrice={menu.basePrice ?? ""}
            pricingType={menu.pricingType}
            canEdit={canEdit}
          />
          <ToggleMenuStatusForm
            menuId={menu.id}
            isActive={menu.isActive}
            canEdit={canEdit}
          />
        </div>
      </div>
    </article>
  );
}

function PreviewDetails({ menu }: { menu: MenuView }) {
  return (
    <details className="group rounded-2xl border border-[#d8c08b]/60 bg-[#fff8ea]/80">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 px-4 py-2 text-sm font-black text-[#172033]">
        <CircleDollarSign size={16} className="text-[#9f7131]" />
        پیش‌نمایش
      </summary>
      <div className="grid gap-2 border-t border-[#d8c08b]/50 p-3 text-xs font-bold leading-6 text-[#6d5f49]">
        <p>{formatFormulaExample(menu)}</p>
        <p>قیمت قرارداد هنگام ذخیره به‌صورت snapshot ثبت می‌شود.</p>
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

function CategoryBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#25a46d]/18 bg-[#25a46d]/10 px-3 py-1 text-xs font-black text-[#17483f]">
      {label}
    </span>
  );
}

function MenuEditorDrawer({
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
    <div className="fixed inset-0 z-50 bg-[#070b11]/72 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex min-h-full items-end justify-center lg:items-center lg:justify-end">
        <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] border border-[#d8c08b]/64 bg-[#fff9ee] p-4 text-[#111827] shadow-[0_32px_120px_rgba(0,0,0,0.32)] sm:rounded-[2rem] sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black text-[#17483f]">مدیریت کاتالوگ پذیرایی</p>
              <h2 className="mt-1 text-2xl font-black">{title}</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
                {description}
              </p>
            </div>
            <Link
              href={closeHref}
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea] text-[#7d6841]"
              aria-label="بستن"
            >
              <X size={19} />
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ addHref }: { addHref: string }) {
  return (
    <section className="rounded-[1.75rem] border border-dashed border-[#c7a15a]/55 bg-[#fff9ee]/94 p-5 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-7">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
        <Utensils size={24} />
      </div>
      <h2 className="mt-5 text-2xl font-black">هنوز آیتم پذیرایی تعریف نشده است</h2>
      <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
        برای شروع ثبت قراردادهای حرفه‌ای، غذاها، نوشیدنی‌ها، دسرها و پکیج‌های قابل فروش را به‌عنوان تعاریف پایه ثبت کنید.
      </p>
      <Link href={addHref} className="btn-luxury-primary mt-5 px-5 py-3">
        <Plus size={17} />
        افزودن اولین آیتم
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
      <h2 className="mt-5 text-2xl font-black">آیتمی با این فیلتر پیدا نشد</h2>
      <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49]">
        فیلتر دسته‌بندی، وضعیت قیمت یا عبارت جست‌وجو را تغییر دهید.
      </p>
      <Link href="/dashboard/menus" className="btn-luxury-dark mt-5 px-5 py-3">
        حذف فیلترها
      </Link>
    </section>
  );
}

function RelatedSections({ addHref }: { addHref: string }) {
  const links = [
    { href: addHref, title: "افزودن آیتم پذیرایی", icon: Plus },
    { href: "/dashboard/services", title: "تعریف خدمات اضافه", icon: Sparkles },
    { href: "/dashboard/contracts/new", title: "ثبت قرارداد جدید", icon: BadgeCheck },
    { href: "/dashboard/base", title: "بازگشت به تعاریف پایه", icon: ArrowLeft },
  ];

  return (
    <aside className="space-y-4 xl:sticky xl:top-6">
      <section className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem] sm:p-5">
        <p className="text-xs font-black text-[#f0dba9]">اتصال عملیاتی</p>
        <h2 className="mt-1 text-lg font-black">بعد از تکمیل قیمت‌ها</h2>
        <p className="mt-2 text-xs font-bold leading-6 text-[#d9caa9]">
          آیتم‌های فعال بلافاصله در ثبت قرارداد جدید نمایش داده می‌شوند.
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

function formatGuestRange(menu: MenuView) {
  if (menu.minGuests && menu.maxGuests) {
    return `${formatPersianNumber(menu.minGuests)} تا ${formatPersianNumber(menu.maxGuests)} مهمان`;
  }

  if (menu.minGuests) {
    return `حداقل ${formatPersianNumber(menu.minGuests)} مهمان`;
  }

  if (menu.maxGuests) {
    return `حداکثر ${formatPersianNumber(menu.maxGuests)} مهمان`;
  }

  return "بدون محدودیت";
}

function formatFormulaExample(menu: MenuView) {
  const price = getMenuCatalogPrice(menu);

  if (menu.pricingType === "FIXED") {
    return price > 0 ? `مبلغ ثابت ${formatIRR(price)}` : "مبلغ ثابت هنوز ثبت نشده است.";
  }

  if (menu.pricingType === "PER_GUEST") {
    return price > 0
      ? `۱۰۰ مهمان × ${formatIRR(price)} = ${formatIRR(price * 100)}`
      : "۱۰۰ مهمان × قیمت هر نفر";
  }

  if (menu.pricingType === "PER_ITEM") {
    return price > 0
      ? `تعداد × ${formatIRR(price)} برای هر ${menu.unit || "مورد"}`
      : "تعداد × قیمت واحد";
  }

  if (menu.pricingType === "PER_HOUR") {
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

function getMenuCatalogPrice(menu: {
  pricingType: ServicePricingType;
  pricePerGuest: string | { toString(): string };
  basePrice: string | { toString(): string } | null;
}) {
  const unitPrice = toNumber(menu.pricePerGuest);
  const basePrice = menu.basePrice === null ? null : toNumber(menu.basePrice);

  return menu.pricingType === "FIXED" ? (basePrice ?? unitPrice) : unitPrice;
}

function isMissingPrice(menu: MenuView) {
  return getMenuCatalogPrice(menu) <= 0;
}

function filterByPriceStatus(menu: MenuView, priceStatus: PriceStatus) {
  if (priceStatus === "missing") {
    return menu.isActive && isMissingPrice(menu);
  }

  if (priceStatus === "priced") {
    return !isMissingPrice(menu);
  }

  return true;
}

function sortMenus(menus: MenuView[], sort: SortMode) {
  const sorted = [...menus];

  if (sort === "name") {
    return sorted.sort((a, b) => a.title.localeCompare(b.title, "fa"));
  }

  if (sort === "price_asc") {
    return sorted.sort((a, b) => getMenuCatalogPrice(a) - getMenuCatalogPrice(b));
  }

  if (sort === "price_desc") {
    return sorted.sort((a, b) => getMenuCatalogPrice(b) - getMenuCatalogPrice(a));
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

function calculateAveragePerGuest(menus: MenuView[]) {
  const prices = menus
    .filter((menu) => menu.isActive && menu.pricingType === "PER_GUEST")
    .map(getMenuCatalogPrice)
    .filter((price) => price > 0);

  if (!prices.length) {
    return null;
  }

  return Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
}

function toMenuView(menu: {
  id: string;
  title: string;
  code: string | null;
  category: string | null;
  pricingType: ServicePricingType;
  unit: string;
  pricePerGuest: { toString(): string };
  basePrice: { toString(): string } | null;
  sortOrder: number | null;
  minGuests: number | null;
  maxGuests: number | null;
  includedItems: string | null;
  description: string | null;
  notes: string | null;
  isRecommended: boolean;
  isTaxable: boolean;
  allowPriceOverride: boolean;
  isActive: boolean;
  updatedAt: Date;
}): MenuView {
  return {
    ...menu,
    pricePerGuest: menu.pricePerGuest.toString(),
    basePrice: menu.basePrice?.toString() ?? null,
  };
}

function toFormValues(menu: MenuView): MenuFormValues {
  return {
    id: menu.id,
    title: menu.title,
    code: menu.code ?? "",
    category: menu.category ?? "غذاهای اصلی",
    pricingType: menu.pricingType,
    unit: menu.unit,
    pricePerGuest: menu.pricePerGuest,
    basePrice: menu.basePrice ?? "",
    sortOrder: menu.sortOrder === null ? "" : String(menu.sortOrder),
    minGuests: menu.minGuests ? String(menu.minGuests) : "",
    maxGuests: menu.maxGuests ? String(menu.maxGuests) : "",
    includedItems: menu.includedItems ?? "",
    description: menu.description ?? "",
    notes: menu.notes ?? "",
    isRecommended: menu.isRecommended,
    isTaxable: menu.isTaxable,
    allowPriceOverride: menu.allowPriceOverride,
    isActive: menu.isActive,
  };
}

function sanitizeQuery(params: MenusPageProps["searchParams"] extends Promise<infer T> ? T : never) {
  const clean: Record<string, string | undefined> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) {
      clean[key] = value;
    }
  });

  return clean;
}

function makeMenusHref(
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
  return query ? `/dashboard/menus?${query}` : "/dashboard/menus";
}
