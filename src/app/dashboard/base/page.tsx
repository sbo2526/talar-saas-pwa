import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  CreditCard,
  LayoutDashboard,
  PackagePlus,
  Settings2,
  Sparkles,
  Utensils,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { requireTenantMember } from "@/lib/auth/session";
import { ensureContractCatalogDefaults } from "@/lib/contract-defaults";
import { formatJalaliDate, formatJalaliWeekday } from "@/lib/date/jalali";
import { formatPersianNumber } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";

type HubCard = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status: string;
};

const categories: Array<{
  title: string;
  description: string;
  items: HubCard[];
}> = [
  {
    title: "ساختار مکانی",
    description: "تالارها، شعبه‌ها و سالن‌های قابل انتخاب در قراردادها.",
    items: [
      {
        title: "تالارها",
        description: "تعریف تالارها یا شعبه‌های مجموعه.",
        href: "/dashboard/halls",
        icon: Building2,
        status: "ساختار پایه",
      },
      {
        title: "سالن‌ها",
        description: "تعریف سالن‌ها، ظرفیت و موقعیت هر سالن.",
        href: "/dashboard/salons",
        icon: LayoutDashboard,
        status: "ظرفیت و موقعیت",
      },
    ],
  },
  {
    title: "فروش و قرارداد",
    description: "اطلاعاتی که بعداً در ثبت قرارداد حرفه‌ای استفاده می‌شود.",
    items: [
      {
        title: "منوها",
        description: "تعریف غذا، نوشیدنی و قیمت‌های پایه.",
        href: "/dashboard/menus",
        icon: Utensils,
        status: "پذیرایی",
      },
      {
        title: "خدمات",
        description: "خدمات اضافه، تشریفات، موسیقی، گل‌آرایی و موارد مشابه.",
        href: "/dashboard/services",
        icon: Sparkles,
        status: "افزودنی‌ها",
      },
      {
        title: "تنظیم پکیج‌ها",
        description:
          "ساخت پکیج‌های فروش مراسم و انتخاب زیرمجموعه‌ها از منوها و خدمات.",
        href: "/dashboard/packages",
        icon: PackagePlus,
        status: "پکیج‌های مراسم",
      },
    ],
  },
  {
    title: "مالی",
    description: "پایه دریافت‌ها، هزینه‌ها و گزارش‌های مالی تالار.",
    items: [
      {
        title: "روش‌های دریافت",
        description: "کارت‌خوان، نقدی، حواله، چک و روش‌های دریافت.",
        href: "/dashboard/payment-methods",
        icon: CreditCard,
        status: "دریافت وجه",
      },
      {
        title: "دسته‌بندی مالی",
        description: "دسته‌بندی درآمدها، هزینه‌ها و گزارش‌های مالی.",
        href: "/dashboard/financial-categories",
        icon: WalletCards,
        status: "سرفصل مالی",
      },
    ],
  },
  {
    title: "اطلاعات کسب‌وکار",
    description: "هویت رسمی و اطلاعات راه‌اندازی فضای اختصاصی تالار.",
    items: [
      {
        title: "اطلاعات تالار",
        description: "نشانی، مجوز، اطلاعات تماس و مشخصات رسمی تالار.",
        href: "/dashboard/hall-info",
        icon: BadgeCheck,
        status: "هویت مجموعه",
      },
    ],
  },
];

export default async function BaseDefinitionsHubPage() {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const tenantId = membership.tenantId;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";

  if (canEdit) {
    await ensureContractCatalogDefaults(db, tenantId);
  }

  const [
    hallCount,
    salonCount,
    menuCount,
    packageCount,
    serviceCount,
    paymentMethodCount,
    activePaymentMethodCount,
    financialCategoryCount,
    activeFinancialCategoryCount,
    contractSetting,
    hallProfile,
  ] = await Promise.all([
    db.hall.count({ where: { tenantId } }),
    db.salon.count({ where: { tenantId } }),
    db.menu.count({ where: { tenantId } }),
    db.ceremonyPackage.count({ where: { tenantId } }),
    db.service.count({ where: { tenantId } }),
    db.paymentMethod.count({ where: { tenantId } }),
    db.paymentMethod.count({ where: { tenantId, isActive: true } }),
    db.financialCategory.count({ where: { tenantId } }),
    db.financialCategory.count({ where: { tenantId, isActive: true } }),
    db.contractSetting.findUnique({
      where: { tenantId },
      select: {
        id: true,
        defaultClauses: true,
        paymentTerms: true,
        printTemplateName: true,
      },
    }),
    db.tenantHallProfile.findUnique({
      where: { tenantId },
      select: {
        id: true,
        brandName: true,
        legalName: true,
        managerName: true,
        province: true,
        city: true,
        address: true,
        phone: true,
        mobile: true,
        licenseNumber: true,
        licenseImageUrl: true,
        totalCapacity: true,
        parkingCapacity: true,
      },
    }),
  ]);
  const hallProfileCompletionPercent =
    getHallProfileCompletionPercent(hallProfile);

  const checklist = [
    {
      label: "اطلاعات تالار را تکمیل کنید",
      complete: Boolean(hallProfile?.id),
    },
    {
      label: "تالارها و سالن‌ها را تعریف کنید",
      complete: hallCount > 0 && salonCount > 0,
    },
    {
      label: "منوها و خدمات را ثبت کنید",
      complete: menuCount > 0 && serviceCount > 0,
    },
    {
      label: "روش‌های دریافت را مشخص کنید",
      complete: paymentMethodCount > 0,
    },
    {
      label: "در صورت نیاز پکیج‌های مراسم را تعریف کنید",
      complete: packageCount > 0,
    },
  ];
  const progress = Math.round(
    (checklist.filter((item) => item.complete).length / checklist.length) * 100,
  );

  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7 lg:p-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:px-4 sm:py-2 sm:text-sm">
              <Settings2 size={15} />
              مرکز تعاریف پایه
            </div>
            <h1 className="mt-4 text-2xl font-black leading-tight sm:mt-5 sm:text-4xl">
              تعاریف پایه
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:mt-4 sm:text-base sm:leading-8">
              اطلاعات پایه تالار، سالن‌ها، منوها، خدمات، پکیج‌های مراسم و
              بخش‌های مالی را از این مرکز مدیریت کنید.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-black text-[#7d6841]">
              <CalendarDays size={16} className="text-[#9f7131]" />
              <span>
                {formatJalaliWeekday(new Date())}،{" "}
                {formatJalaliDate(new Date())}
              </span>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:min-w-96 sm:p-5">
            <p className="text-xs font-black text-[#f0dba9]">فضای کاری</p>
            <h2 className="mt-2 text-2xl font-black text-[#fff9ed]">
              {hallProfile?.brandName ?? membership.tenant.name}
            </h2>
            <div className="gold-divider my-4" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[#d9caa9]">
                  تکمیل راه‌اندازی
                </p>
                <p className="mt-1 text-3xl font-black text-[#fff9ed]">
                  {formatPersianNumber(progress)}٪
                </p>
              </div>
              <div className="size-20 rounded-full border border-[#e8c478]/24 bg-[#e8c478]/10 p-2">
                <div className="flex size-full items-center justify-center rounded-full bg-[#111827] text-lg font-black text-[#f0dba9]">
                  {formatPersianNumber(
                    checklist.filter((item) => item.complete).length,
                  )}
                  /{formatPersianNumber(checklist.length)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          {categories.map((category) => (
            <section
              key={category.title}
              className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black text-[#17483f]">
                    {category.title}
                  </p>
                  <h2 className="mt-1 text-xl font-black sm:text-2xl">
                    {category.description}
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {category.items.map((item) => (
                  <DefinitionCard
                    key={item.href}
                    item={item}
                    status={getDefinitionStatus(item, {
                      hallCount,
                      salonCount,
                      menuCount,
                      packageCount,
                      serviceCount,
                      activePaymentMethodCount,
                      activeFinancialCategoryCount,
                      contractSettingReady: Boolean(
                        contractSetting?.id &&
                        contractSetting.defaultClauses &&
                        contractSetting.paymentTerms &&
                        contractSetting.printTemplateName,
                      ),
                      hallProfileCompletionPercent,
                    })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-4">
          <section className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem] sm:p-6">
            <p className="text-xs font-black text-[#f0dba9]">
              راهنمای راه‌اندازی
            </p>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              ترتیب پیشنهادی تعاریف پایه
            </h2>
            <div className="gold-divider my-5" />
            <div className="grid gap-2.5">
              {checklist.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3"
                >
                  {item.complete ? (
                    <CheckCircle2
                      className="shrink-0 text-[#a9f2cf]"
                      size={18}
                    />
                  ) : (
                    <CircleDashed
                      className="shrink-0 text-[#d9caa9]"
                      size={18}
                    />
                  )}
                  <span className="text-sm font-black leading-6">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
            <p className="text-xs font-black text-[#17483f]">وضعیت فعلی</p>
            <div className="mt-4 grid gap-2.5">
              <Metric label="تالارها" value={hallCount} />
              <Metric label="سالن‌ها" value={salonCount} />
              <Metric label="منوها" value={menuCount} />
              <Metric label="پکیج‌ها" value={packageCount} />
              <Metric label="خدمات" value={serviceCount} />
              <Metric label="روش دریافت" value={paymentMethodCount} />
              <Metric label="دسته‌بندی مالی" value={financialCategoryCount} />
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function DefinitionCard({ item, status }: { item: HubCard; status: string }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="group flex min-h-44 flex-col justify-between rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff8ea]/80 p-4 text-[#111827] shadow-[0_14px_44px_rgba(17,24,39,0.06)] transition hover:-translate-y-0.5 hover:border-[#c7a15a]/70 hover:bg-[#fff0c7]/45"
    >
      <span>
        <span className="flex size-11 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9] shadow-[0_12px_28px_rgba(17,24,39,0.16)]">
          <Icon size={20} />
        </span>
        <span className="mt-4 inline-flex rounded-full border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#7d6841]">
          {status}
        </span>
        <span className="mt-3 block text-lg font-black">{item.title}</span>
        <span className="mt-2 block text-sm font-bold leading-7 text-[#6d5f49]">
          {item.description}
        </span>
      </span>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#9f7131]">
        ورود به بخش
        <ArrowLeft size={17} />
      </span>
    </Link>
  );
}

function getDefinitionStatus(
  item: HubCard,
  counts: {
    hallCount: number;
    salonCount: number;
    menuCount: number;
    packageCount: number;
    serviceCount: number;
    activePaymentMethodCount: number;
    activeFinancialCategoryCount: number;
    contractSettingReady: boolean;
    hallProfileCompletionPercent: number;
  },
) {
  if (item.href === "/dashboard/halls") {
    return counts.hallCount > 0
      ? `${formatPersianNumber(counts.hallCount)} تالار ثبت‌شده`
      : "نیازمند تکمیل";
  }

  if (item.href === "/dashboard/salons") {
    if (counts.hallCount === 0) {
      return "نیازمند تعریف تالار";
    }

    return counts.salonCount > 0
      ? `${formatPersianNumber(counts.salonCount)} سالن ثبت‌شده`
      : "نیازمند تکمیل";
  }

  if (item.href === "/dashboard/menus") {
    return counts.menuCount > 0
      ? `${formatPersianNumber(counts.menuCount)} منو ثبت‌شده`
      : "نیازمند تکمیل";
  }

  if (item.href === "/dashboard/packages") {
    return counts.packageCount > 0
      ? `${formatPersianNumber(counts.packageCount)} پکیج ثبت‌شده`
      : "اختیاری / قابل تکمیل";
  }

  if (item.href === "/dashboard/services") {
    return counts.serviceCount > 0
      ? `${formatPersianNumber(counts.serviceCount)} خدمت ثبت‌شده`
      : "نیازمند تکمیل";
  }

  if (item.href === "/dashboard/contract-settings") {
    return counts.contractSettingReady ? "تکمیل‌شده" : "نیازمند تکمیل";
  }

  if (item.href === "/dashboard/payment-methods") {
    return counts.activePaymentMethodCount > 0
      ? `${formatPersianNumber(counts.activePaymentMethodCount)} روش فعال`
      : "نیازمند تکمیل";
  }

  if (item.href === "/dashboard/financial-categories") {
    return counts.activeFinancialCategoryCount > 0
      ? `${formatPersianNumber(counts.activeFinancialCategoryCount)} دسته فعال`
      : "نیازمند تکمیل";
  }

  if (item.href === "/dashboard/hall-info") {
    return counts.hallProfileCompletionPercent > 0
      ? `${formatPersianNumber(counts.hallProfileCompletionPercent)}٪ تکمیل‌شده`
      : "نیازمند تکمیل";
  }

  return item.status;
}

function getHallProfileCompletionPercent(
  profile: {
    brandName: string | null;
    legalName: string | null;
    managerName: string | null;
    province: string | null;
    city: string | null;
    address: string | null;
    phone: string | null;
    mobile: string | null;
    licenseNumber: string | null;
    licenseImageUrl: string | null;
    totalCapacity: number | null;
    parkingCapacity: number | null;
  } | null,
) {
  const items = [
    Boolean(profile?.brandName && profile?.legalName && profile?.managerName),
    Boolean(profile?.province && profile?.city && profile?.address),
    Boolean(profile?.phone || profile?.mobile),
    Boolean(profile?.licenseNumber),
    Boolean(profile?.licenseImageUrl),
    Boolean(profile?.totalCapacity || profile?.parkingCapacity),
  ];

  return Math.round((items.filter(Boolean).length / items.length) * 100);
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 p-3 text-sm font-black">
      <span className="text-[#6d5f49]">{label}</span>
      <span className="text-[#111827]">{formatPersianNumber(value)}</span>
    </div>
  );
}
