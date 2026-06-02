import type { LucideIcon } from "lucide-react";
import type { Prisma } from "@prisma/client";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  Edit3,
  Filter,
  LayoutDashboard,
  MapPin,
  Music2,
  Plus,
  Search,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import {
  SalonForm,
  type SalonFormHall,
  type SalonFormValues,
  ToggleSalonStatusForm,
} from "@/components/dashboard/salon-management-forms";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";

type SalonsPageProps = {
  searchParams: Promise<{
    hallId?: string;
    status?: string;
    q?: string;
  }>;
};

const setupSteps = [
  "تالار اصلی را ثبت کنید",
  "سالن‌های مرتبط را اضافه کنید",
  "ظرفیت و امکانات هر سالن را مشخص کنید",
  "از سالن‌ها در قرارداد و رزرو استفاده کنید",
];

export default async function SalonsPage({ searchParams }: SalonsPageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const tenantId = membership.tenantId;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";
  const resolvedSearchParams = await searchParams;

  const halls = await db.hall.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      isActive: true,
    },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });

  if (!halls.length) {
    return (
      <section className="space-y-5 sm:space-y-7">
        <PageHero
          tenantName={membership.tenant.name}
          ctaHref="/dashboard/halls"
          ctaLabel="افزودن تالار"
        />
        <PrerequisiteState />
      </section>
    );
  }

  const selectedHallId = halls.some(
    (hall) => hall.id === resolvedSearchParams.hallId,
  )
    ? resolvedSearchParams.hallId
    : undefined;
  const selectedStatus =
    resolvedSearchParams.status === "active" ||
    resolvedSearchParams.status === "inactive"
      ? resolvedSearchParams.status
      : "all";
  const query = resolvedSearchParams.q?.trim() ?? "";

  const where: Prisma.SalonWhereInput = {
    tenantId,
  };

  if (selectedHallId) {
    where.hallId = selectedHallId;
  }

  if (selectedStatus === "active") {
    where.isActive = true;
  }

  if (selectedStatus === "inactive") {
    where.isActive = false;
  }

  if (query) {
    where.OR = [
      { name: { contains: query } },
      { code: { contains: query } },
    ];
  }

  const [salons, allSalons] = await Promise.all([
    db.salon.findMany({
      where,
      include: {
        hall: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    }),
    db.salon.findMany({
      where: { tenantId },
      include: {
        hall: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
  ]);

  const activeCount = allSalons.filter((salon) => salon.isActive).length;
  const capacityValues = allSalons
    .map((salon) => salon.capacity ?? salon.maxCapacity ?? 0)
    .filter((capacity) => capacity > 0);
  const totalCapacity = capacityValues.reduce(
    (sum, capacity) => sum + capacity,
    0,
  );
  const averageCapacity = capacityValues.length
    ? Math.round(totalCapacity / capacityValues.length)
    : 0;
  const lastUpdated = allSalons[0]?.updatedAt ?? null;
  const formHalls: SalonFormHall[] = halls.map((hall) => ({
    id: hall.id,
    name: hall.name,
  }));
  const hasAnySalon = allSalons.length > 0;

  return (
    <section className="space-y-5 sm:space-y-7">
      <PageHero
        tenantName={membership.tenant.name}
        ctaHref="#new-salon"
        ctaLabel="افزودن سالن جدید"
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <SummaryCard
          label="تعداد سالن‌ها"
          value={formatPersianNumber(allSalons.length)}
        />
        <SummaryCard
          label="سالن‌های فعال"
          value={formatPersianNumber(activeCount)}
        />
        <SummaryCard
          label="مجموع ظرفیت ثبت‌شده"
          value={
            totalCapacity
              ? `${formatPersianNumber(totalCapacity)} نفر`
              : formatPersianNumber(0)
          }
        />
        <SummaryCard
          label="میانگین ظرفیت"
          value={
            averageCapacity
              ? `${formatPersianNumber(averageCapacity)} نفر`
              : formatPersianNumber(0)
          }
        />
        <SummaryCard
          label="آخرین به‌روزرسانی"
          value={formatJalaliDate(lastUpdated)}
        />
      </div>

      <FilterBar
        halls={formHalls}
        selectedHallId={selectedHallId ?? "all"}
        selectedStatus={selectedStatus}
        query={query}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          {salons.length ? (
            salons.map((salon) => (
              <SalonCard
                key={salon.id}
                salon={{
                  id: salon.id,
                  hallId: salon.hallId,
                  hallName: salon.hall.name,
                  name: salon.name,
                  code: salon.code,
                  floor: salon.floor,
                  locationNote: salon.locationNote,
                  capacity: salon.capacity,
                  minCapacity: salon.minCapacity,
                  maxCapacity: salon.maxCapacity,
                  basePrice: salon.basePrice?.toString() ?? null,
                  hasStage: salon.hasStage,
                  hasDanceFloor: salon.hasDanceFloor,
                  hasSeparateEntrance: salon.hasSeparateEntrance,
                  hasVipRoom: salon.hasVipRoom,
                  hasSoundSystem: salon.hasSoundSystem,
                  hasProjector: salon.hasProjector,
                  description: salon.description,
                  isActive: salon.isActive,
                  updatedAt: salon.updatedAt,
                }}
                halls={formHalls}
                canEdit={canEdit}
              />
            ))
          ) : hasAnySalon ? (
            <FilteredEmptyState />
          ) : (
            <EmptyState />
          )}
        </div>

        <aside className="space-y-4">
          <section
            id="new-salon"
            className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6"
          >
            <p className="text-xs font-black text-[#17483f]">
              افزودن سالن جدید
            </p>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              ثبت سالن یا فضای برگزاری
            </h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
              هر سالن باید به یک تالار متعلق به همین فضای کاری متصل شود تا در
              قراردادها و رزروهای آینده با ظرفیت و امکانات درست پیشنهاد شود.
            </p>
            <div className="mt-5">
              <SalonForm mode="create" halls={formHalls} canEdit={canEdit} />
            </div>
          </section>

          <RelatedSections />
        </aside>
      </div>
    </section>
  );
}

function PageHero({
  tenantName,
  ctaHref,
  ctaLabel,
}: {
  tenantName: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7 lg:p-8">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:px-4 sm:py-2 sm:text-sm">
            <LayoutDashboard size={15} />
            تعاریف پایه / سالن‌ها
          </div>
          <h1 className="mt-4 text-2xl font-black leading-tight sm:mt-5 sm:text-4xl">
            مدیریت سالن‌ها
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:mt-4 sm:text-base sm:leading-8">
            سالن‌ها و فضاهای برگزاری هر تالار را تعریف کنید تا در ثبت قرارداد،
            رزرو، ظرفیت‌سنجی و گزارش‌گیری استفاده شوند.
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
          <a href={ctaHref} className="btn-luxury-primary w-full px-5 py-3">
            <Plus size={17} />
            {ctaLabel}
          </a>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-3.5 text-[#111827] shadow-[0_18px_56px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-5">
      <p className="text-xs font-black leading-6 text-[#7d6841] sm:text-sm">
        {label}
      </p>
      <p className="mt-2 break-words text-xl font-black leading-tight sm:text-2xl">
        {value}
      </p>
    </article>
  );
}

function FilterBar({
  halls,
  selectedHallId,
  selectedStatus,
  query,
}: {
  halls: SalonFormHall[];
  selectedHallId: string;
  selectedStatus: string;
  query: string;
}) {
  return (
    <form
      action="/dashboard/salons"
      className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-5"
    >
      <div className="mb-4 flex items-center gap-2 text-sm font-black text-[#17483f]">
        <Filter size={18} />
        فیلتر و جست‌وجوی سالن‌ها
      </div>
      <div className="grid gap-3 md:grid-cols-[1.2fr_0.9fr_1.2fr_auto] md:items-end">
        <label className="grid gap-2 text-sm font-black text-[#172033]">
          <span>تالار</span>
          <select
            name="hallId"
            defaultValue={selectedHallId}
            className="input-luxury"
          >
            <option value="all">همه تالارها</option>
            {halls.map((hall) => (
              <option key={hall.id} value={hall.id}>
                {hall.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-black text-[#172033]">
          <span>وضعیت</span>
          <select
            name="status"
            defaultValue={selectedStatus}
            className="input-luxury"
          >
            <option value="all">همه</option>
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
          </select>
        </label>
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
              placeholder="نام یا کد سالن"
              className="input-luxury pl-11"
            />
          </div>
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn-luxury-dark min-h-12 px-5">
            اعمال فیلتر
          </button>
          <Link
            href="/dashboard/salons"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-4 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
          >
            حذف
          </Link>
        </div>
      </div>
    </form>
  );
}

type SalonCardProps = {
  salon: {
    id: string;
    hallId: string;
    hallName: string;
    name: string;
    code: string | null;
    floor: string | null;
    locationNote: string | null;
    capacity: number | null;
    minCapacity: number | null;
    maxCapacity: number | null;
    basePrice: string | null;
    hasStage: boolean;
    hasDanceFloor: boolean;
    hasSeparateEntrance: boolean;
    hasVipRoom: boolean;
    hasSoundSystem: boolean;
    hasProjector: boolean;
    description: string | null;
    isActive: boolean;
    updatedAt: Date;
  };
  halls: SalonFormHall[];
  canEdit: boolean;
};

function SalonCard({ salon, halls, canEdit }: SalonCardProps) {
  const features = [
    { enabled: salon.hasStage, label: "سن", icon: BadgeCheck },
    { enabled: salon.hasDanceFloor, label: "جایگاه رقص", icon: Sparkles },
    { enabled: salon.hasSeparateEntrance, label: "ورودی مجزا", icon: DoorOpen },
    { enabled: salon.hasVipRoom, label: "اتاق VIP", icon: Users },
    { enabled: salon.hasSoundSystem, label: "سیستم صوت", icon: Music2 },
    { enabled: salon.hasProjector, label: "ویدئو پروژکتور", icon: LayoutDashboard },
  ].filter((feature) => feature.enabled);

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-black ${
                salon.isActive
                  ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]"
                  : "border-[#b45353]/24 bg-[#fff1f1] text-[#8f2c2c]"
              }`}
            >
              {salon.isActive ? "فعال" : "غیرفعال"}
            </span>
            <span className="rounded-full border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#7d6841]">
              {salon.hallName}
            </span>
            {salon.code ? (
              <span className="rounded-full border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#7d6841]">
                کد: {salon.code}
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-2xl font-black leading-tight">
            {salon.name}
          </h2>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
            {salon.description ||
              "توضیحی برای این سالن ثبت نشده است. می‌توانید امکانات و محدودیت‌های سالن را در ویرایش تکمیل کنید."}
          </p>
        </div>

        <ToggleSalonStatusForm
          salonId={salon.id}
          isActive={salon.isActive}
          canEdit={canEdit}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <InfoItem
          icon={Building2}
          label="تالار مرتبط"
          value={salon.hallName}
          helper="سالن فقط در همین فضای کاری و تالار قابل استفاده است"
        />
        <InfoItem
          icon={Users}
          label="ظرفیت"
          value={formatCapacity(salon)}
          helper={formatCapacityRange(salon)}
        />
        <InfoItem
          icon={MapPin}
          label="موقعیت"
          value={salon.floor ?? "ثبت نشده"}
          helper={salon.locationNote ?? "توضیح موقعیت ثبت نشده است"}
        />
        <InfoItem
          icon={WalletCards}
          label="قیمت پایه"
          value={formatIRR(salon.basePrice)}
          helper="قیمت پایه برای توسعه قیمت‌گذاری قرارداد استفاده می‌شود"
        />
        <InfoItem
          icon={CalendarDays}
          label="آخرین به‌روزرسانی"
          value={formatJalaliDateTime(salon.updatedAt)}
          helper="بر اساس آخرین تغییر اطلاعات سالن"
        />
      </div>

      <div className="mt-5 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 p-3.5">
        <p className="text-xs font-black text-[#7d6841]">امکانات شاخص</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {features.length ? (
            features.map((feature) => {
              const Icon = feature.icon;

              return (
                <span
                  key={feature.label}
                  className="inline-flex items-center gap-2 rounded-full border border-[#25a46d]/18 bg-[#25a46d]/10 px-3 py-1.5 text-xs font-black text-[#17483f]"
                >
                  <Icon size={14} />
                  {feature.label}
                </span>
              );
            })
          ) : (
            <span className="text-sm font-bold leading-7 text-[#6d5f49]">
              امکانات ویژه‌ای برای این سالن ثبت نشده است.
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link href="/dashboard/contracts" className="btn-luxury-dark px-5 py-3">
          مشاهده قراردادها
          <ArrowLeft size={17} />
        </Link>
        <details className="group rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center gap-2 px-5 py-3 text-sm font-black text-[#111827]">
            <Edit3 size={17} />
            ویرایش
          </summary>
          <div className="border-t border-[#d8c08b]/50 p-4">
            <SalonForm
              mode="edit"
              halls={halls}
              values={toFormValues(salon)}
              canEdit={canEdit}
            />
          </div>
        </details>
      </div>
    </article>
  );
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

function EmptyState() {
  return (
    <section className="rounded-[1.75rem] border border-dashed border-[#c7a15a]/55 bg-[#fff9ee]/94 p-5 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-7">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
        <LayoutDashboard size={24} />
      </div>
      <h2 className="mt-5 text-2xl font-black">هنوز سالنی تعریف نشده است</h2>
      <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
        برای شروع ثبت قرارداد و مدیریت رزرو، سالن‌های هر تالار را با ظرفیت،
        امکانات و موقعیت آن‌ها تعریف کنید.
      </p>
      <a href="#new-salon" className="btn-luxury-primary mt-5 px-5 py-3">
        <Plus size={17} />
        افزودن اولین سالن
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
        سالنی با این فیلتر پیدا نشد
      </h2>
      <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49]">
        فیلتر تالار، وضعیت یا عبارت جست‌وجو را تغییر دهید تا سالن‌های بیشتری
        نمایش داده شود.
      </p>
      <Link href="/dashboard/salons" className="btn-luxury-secondary mt-5 px-5 py-3">
        حذف فیلترها
      </Link>
    </section>
  );
}

function PrerequisiteState() {
  return (
    <section className="rounded-[1.75rem] border border-dashed border-[#c7a15a]/55 bg-[#fff9ee]/94 p-5 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-7">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
        <Building2 size={24} />
      </div>
      <h2 className="mt-5 text-2xl font-black">ابتدا یک تالار تعریف کنید</h2>
      <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
        برای ثبت سالن‌ها، ابتدا باید حداقل یک تالار یا شعبه در بخش تعاریف پایه
        ثبت شود. سپس می‌توانید سالن‌های مرتبط با آن تالار را اضافه کنید.
      </p>
      <Link href="/dashboard/halls" className="btn-luxury-primary mt-5 px-5 py-3">
        <Plus size={17} />
        افزودن تالار
      </Link>
      <SetupGuide />
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
  const links = [
    {
      href: "/dashboard/halls",
      title: "مدیریت تالارها",
      icon: Building2,
    },
    {
      href: "/dashboard/menus",
      title: "تعریف منوها",
      icon: Sparkles,
    },
    {
      href: "/dashboard/services",
      title: "تعریف خدمات",
      icon: BadgeCheck,
    },
    {
      href: "/dashboard/contract-settings",
      title: "تنظیمات قرارداد",
      icon: ClipboardList,
    },
  ];

  return (
    <section className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem] sm:p-6">
      <p className="text-xs font-black text-[#f0dba9]">گام‌های بعدی</p>
      <h2 className="mt-1 text-xl font-black">بعد از تعریف سالن‌ها</h2>
      <div className="gold-divider my-5" />
      <div className="grid gap-2.5">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
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
  );
}

function formatCapacity(salon: SalonCardProps["salon"]) {
  if (salon.capacity) {
    return `${formatPersianNumber(salon.capacity)} نفر`;
  }

  if (salon.maxCapacity) {
    return `تا ${formatPersianNumber(salon.maxCapacity)} نفر`;
  }

  return "ظرفیت ثبت نشده";
}

function formatCapacityRange(salon: SalonCardProps["salon"]) {
  if (salon.minCapacity && salon.maxCapacity) {
    return `از ${formatPersianNumber(salon.minCapacity)} تا ${formatPersianNumber(salon.maxCapacity)} نفر`;
  }

  if (salon.minCapacity) {
    return `حداقل ${formatPersianNumber(salon.minCapacity)} نفر`;
  }

  if (salon.maxCapacity) {
    return `حداکثر ${formatPersianNumber(salon.maxCapacity)} نفر`;
  }

  return "بازه ظرفیت ثبت نشده است";
}

function toFormValues(salon: SalonCardProps["salon"]): SalonFormValues {
  return {
    id: salon.id,
    hallId: salon.hallId,
    name: salon.name,
    code: salon.code ?? "",
    floor: salon.floor ?? "",
    locationNote: salon.locationNote ?? "",
    capacity: salon.capacity ? String(salon.capacity) : "",
    minCapacity: salon.minCapacity ? String(salon.minCapacity) : "",
    maxCapacity: salon.maxCapacity ? String(salon.maxCapacity) : "",
    basePrice: salon.basePrice ?? "",
    hasStage: salon.hasStage,
    hasDanceFloor: salon.hasDanceFloor,
    hasSeparateEntrance: salon.hasSeparateEntrance,
    hasVipRoom: salon.hasVipRoom,
    hasSoundSystem: salon.hasSoundSystem,
    hasProjector: salon.hasProjector,
    description: salon.description ?? "",
    isActive: salon.isActive,
  };
}
