import type { LucideIcon } from "lucide-react";
import {
  ArchiveRestore,
  BadgeCheck,
  BellRing,
  Building2,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  ListChecks,
  MapPin,
  MessageSquareText,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Utensils,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { formatPersianNumber } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";

type CountCard = {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  countLabel: string;
  status: string;
};

type QuickSection = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

type HallProfileSummary = {
  brandName: string | null;
  hallLogoUrl: string | null;
  phone: string | null;
  mobile: string | null;
  province: string | null;
  city: string | null;
  address: string | null;
  legalName: string | null;
  registrationNumber: string | null;
  economicCode: string | null;
  licenseNumber: string | null;
  description: string | null;
};

const quickSections: QuickSection[] = [
  {
    id: "hall-info",
    title: "اطلاعات تالار",
    description: "هویت رسمی، لوگو، تماس و نشانی",
    href: "#hall-info",
    icon: Building2,
  },
  {
    id: "base-definitions",
    title: "تعاریف پایه",
    description: "سالن‌ها، منو، خدمات و کاتالوگ",
    href: "#base-definitions",
    icon: Sparkles,
  },
  {
    id: "contract-settings",
    title: "تنظیمات قرارداد",
    description: "شماره‌گذاری، شروط و چاپ",
    href: "#contract-settings",
    icon: FileText,
  },
  {
    id: "finance-settings",
    title: "روش‌های دریافت و مالی",
    description: "روش دریافت و دسته‌بندی‌ها",
    href: "#finance-settings",
    icon: WalletCards,
  },
  {
    id: "communications",
    title: "اعلان‌ها و ارتباطات",
    description: "تلگرام، پیامک و قالب پیام‌ها",
    href: "#communications",
    icon: BellRing,
  },
];

export default async function GeneralSettingsPage() {
  const membership = await requireTenantPermission("settings.view");
  const db = await getPrisma();

  const [
    hallProfile,
    hallCount,
    activeHallCount,
    salonCount,
    activeSalonCount,
    menuCount,
    activeMenuCount,
    serviceCount,
    activeServiceCount,
    paymentMethodCount,
    activePaymentMethodCount,
    financialCategoryCount,
    activeFinancialCategoryCount,
    contractSetting,
  ] = await Promise.all([
    db.tenantHallProfile.findUnique({
      where: { tenantId: membership.tenantId },
      select: {
        brandName: true,
        hallLogoUrl: true,
        phone: true,
        mobile: true,
        province: true,
        city: true,
        address: true,
        legalName: true,
        registrationNumber: true,
        economicCode: true,
        licenseNumber: true,
        description: true,
      },
    }),
    db.hall.count({ where: { tenantId: membership.tenantId } }),
    db.hall.count({ where: { tenantId: membership.tenantId, isActive: true } }),
    db.salon.count({ where: { tenantId: membership.tenantId } }),
    db.salon.count({ where: { tenantId: membership.tenantId, isActive: true } }),
    db.menu.count({ where: { tenantId: membership.tenantId } }),
    db.menu.count({ where: { tenantId: membership.tenantId, isActive: true } }),
    db.service.count({ where: { tenantId: membership.tenantId } }),
    db.service.count({ where: { tenantId: membership.tenantId, isActive: true } }),
    db.paymentMethod.count({ where: { tenantId: membership.tenantId } }),
    db.paymentMethod.count({ where: { tenantId: membership.tenantId, isActive: true } }),
    db.financialCategory.count({ where: { tenantId: membership.tenantId } }),
    db.financialCategory.count({ where: { tenantId: membership.tenantId, isActive: true } }),
    db.contractSetting.findUnique({
      where: { tenantId: membership.tenantId },
      select: {
        contractPrefix: true,
        showLogoOnPrint: true,
        showLicenseInfoOnPrint: true,
        defaultClauses: true,
        paymentTerms: true,
      },
    }),
  ]);

  const hallCompleteness = getHallCompleteness(hallProfile);
  const baseCards: CountCard[] = [
    {
      title: "تالارها",
      description: "تعریف شعبه‌ها یا تالارهای قابل انتخاب در قرارداد و هزینه.",
      href: "/dashboard/halls",
      cta: "مدیریت تالارها",
      icon: Building2,
      countLabel: `${formatPersianNumber(activeHallCount)} فعال از ${formatPersianNumber(hallCount)}`,
      status: hallCount > 0 ? "آماده" : "نیازمند تعریف",
    },
    {
      title: "سالن‌ها",
      description: "ظرفیت، موقعیت و قیمت پایه سالن‌های قابل رزرو.",
      href: "/dashboard/salons",
      cta: "مدیریت سالن‌ها",
      icon: LayoutDashboard,
      countLabel: `${formatPersianNumber(activeSalonCount)} فعال از ${formatPersianNumber(salonCount)}`,
      status: salonCount > 0 ? "آماده" : "نیازمند تعریف",
    },
    {
      title: "منوی پذیرایی / غذاها",
      description: "غذا، نوشیدنی و دسر با قیمت‌های پایه قابل ویرایش.",
      href: "/dashboard/menus",
      cta: "مدیریت منوها",
      icon: Utensils,
      countLabel: `${formatPersianNumber(activeMenuCount)} فعال از ${formatPersianNumber(menuCount)}`,
      status: menuCount > 0 ? "کاتالوگ فعال" : "نیازمند تعریف",
    },
    {
      title: "خدمات مراسم",
      description: "تشریفات، موسیقی، عکاسی، فیلم‌برداری و خدمات انتخابی قرارداد.",
      href: "/dashboard/services",
      cta: "مدیریت خدمات",
      icon: Sparkles,
      countLabel: `${formatPersianNumber(activeServiceCount)} فعال از ${formatPersianNumber(serviceCount)}`,
      status: serviceCount > 0 ? "کاتالوگ فعال" : "نیازمند تعریف",
    },
  ];

  const financeCards: CountCard[] = [
    {
      title: "روش‌های دریافت",
      description: "نقدی، کارت‌خوان، حواله، چک و سایر مسیرهای دریافت از مشتری.",
      href: "/dashboard/payment-methods",
      cta: "مدیریت روش‌های دریافت",
      icon: CreditCard,
      countLabel: `${formatPersianNumber(activePaymentMethodCount)} فعال از ${formatPersianNumber(paymentMethodCount)}`,
      status: paymentMethodCount > 0 ? "آماده دریافت" : "نیازمند تعریف",
    },
    {
      title: "دسته‌بندی‌های مالی",
      description: "سرفصل‌های درآمد و هزینه برای گزارش‌های مالی و کنترل هزینه‌ها.",
      href: "/dashboard/financial-categories",
      cta: "مدیریت دسته‌بندی‌ها",
      icon: WalletCards,
      countLabel: `${formatPersianNumber(activeFinancialCategoryCount)} فعال از ${formatPersianNumber(financialCategoryCount)}`,
      status: financialCategoryCount > 0 ? "آماده گزارش" : "نیازمند تعریف",
    },
  ];

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-[2.4rem] border border-[#e8c478]/32 bg-[radial-gradient(circle_at_top_left,rgba(240,219,169,0.30),transparent_34%),linear-gradient(145deg,rgba(23,32,51,0.98),rgba(9,14,23,0.98))] p-5 text-[#fff8ea] shadow-[0_28px_90px_rgba(17,24,39,0.26)] sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/28 bg-[#e8c478]/10 px-3 py-1 text-xs font-black text-[#f0dba9]">
          <SlidersHorizontal size={15} /> مرکز پیکربندی سامانه
        </p>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">تنظیمات کلی سامانه</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-[#d9caa9]">
              اطلاعات تالار، تعاریف پایه، گزینه‌های عمومی و داده‌های مورد استفاده در فرم‌های سامانه را از این بخش مدیریت کنید.
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-white/[0.10] bg-white/[0.055] p-4">
            <p className="text-xs font-black text-[#f0dba9]">وضعیت اطلاعات تالار</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-black text-[#fff9ed]">{hallCompleteness.statusLabel}</p>
                <p className="mt-1 text-xs font-bold text-[#d9caa9]">
                  {hallCompleteness.missingCount === 0
                    ? "تمام داده‌های ضروری ثبت شده است."
                    : `${formatPersianNumber(hallCompleteness.missingCount)} مورد نیازمند تکمیل`}
                </p>
              </div>
              <div className="grid size-16 place-items-center rounded-full border border-[#e8c478]/28 bg-[#e8c478]/12 text-lg font-black text-[#f0dba9]">
                {formatPersianNumber(hallCompleteness.percent)}٪
              </div>
            </div>
          </div>
        </div>
      </section>

      <nav className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="بخش‌های تنظیمات کلی سامانه">
        {quickSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.id}
              href={section.href}
              className="group rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_14px_42px_rgba(17,24,39,0.06)] transition hover:-translate-y-0.5 hover:border-[#c7a15a]/70 hover:bg-white"
            >
              <span className="grid size-10 place-items-center rounded-2xl bg-[#172033] text-[#f0dba9]"><Icon size={18} /></span>
              <h2 className="mt-3 text-sm font-black">{section.title}</h2>
              <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">{section.description}</p>
            </Link>
          );
        })}
      </nav>

      <section id="hall-info" className="scroll-mt-28 rounded-[1.9rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:p-6">
        <SectionHeading
          eyebrow="بخش اول"
          title="اطلاعات تالار"
          description="این بخش هویت رسمی تالار، لوگوی چاپ قرارداد، تماس، نشانی و متن‌های قابل نمایش در فاکتور یا پیش‌فاکتور را به مسیر اصلی مدیریت اطلاعات تالار متصل می‌کند."
          actionHref="/dashboard/hall-info"
          actionLabel="مدیریت اطلاعات تالار"
        />

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <HallChecklistCard icon={Building2} title="نام تالار" complete={Boolean(hallProfile?.brandName)} value={hallProfile?.brandName ?? membership.tenant.name} />
          <HallChecklistCard icon={ImageIcon} title="لوگوی تالار" complete={Boolean(hallProfile?.hallLogoUrl)} value={hallProfile?.hallLogoUrl ? "لوگو بارگذاری شده" : "لوگو ثبت نشده"} />
          <HallChecklistCard icon={Phone} title="شماره تماس" complete={Boolean(hallProfile?.phone || hallProfile?.mobile)} value={hallProfile?.phone || hallProfile?.mobile || "ثبت نشده"} />
          <HallChecklistCard icon={MapPin} title="آدرس" complete={Boolean(hallProfile?.address && (hallProfile.city || hallProfile.province))} value={formatAddressSummary(hallProfile)} />
          <HallChecklistCard icon={BadgeCheck} title="اطلاعات حقوقی/ثبتی" complete={Boolean(hallProfile?.legalName || hallProfile?.registrationNumber || hallProfile?.economicCode)} value={getLegalSummary(hallProfile)} />
          <HallChecklistCard icon={FileText} title="توضیحات چاپی" complete={Boolean(hallProfile?.description)} value={hallProfile?.description ? "متن معرفی ثبت شده" : "برای فاکتور/پیش‌فاکتور تکمیل شود"} />
          <HallChecklistCard icon={ListChecks} title="شماره مجوز" complete={Boolean(hallProfile?.licenseNumber)} value={hallProfile?.licenseNumber ?? "ثبت نشده"} />
          <div className="rounded-[1.5rem] border border-[#17483f]/14 bg-[#eef7f0] p-4">
            <p className="text-xs font-black text-[#17483f]">وضعیت تکمیل</p>
            <p className="mt-2 text-2xl font-black text-[#17483f]">{hallCompleteness.statusLabel}</p>
            <p className="mt-2 text-sm font-bold leading-7 text-[#376157]">
              {hallCompleteness.missingCount === 0
                ? "اطلاعات اصلی تالار برای چاپ و نمایش مدیریتی آماده است."
                : `${formatPersianNumber(hallCompleteness.missingCount)} مورد از اطلاعات اصلی هنوز تکمیل نشده است.`}
            </p>
          </div>
        </div>
      </section>

      <section id="base-definitions" className="scroll-mt-28 rounded-[1.9rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:p-6">
        <SectionHeading
          eyebrow="بخش دوم"
          title="تعاریف پایه"
          description="مرکز کنترل داده‌هایی که فرم قرارداد، تقویم، دریافت‌ها، هزینه‌ها و گزارش‌ها از آن‌ها استفاده می‌کنند. این صفحه فقط مسیر مدیریت را نشان می‌دهد و فرم‌های موجود را تکرار نمی‌کند."
          actionHref="/dashboard/base"
          actionLabel="ورود به مرکز تعاریف پایه"
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {baseCards.map((card) => (
            <SettingsCountCard key={card.href} card={card} />
          ))}
        </div>
      </section>

      <section id="contract-settings" className="scroll-mt-28 rounded-[1.9rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:p-6">
        <SectionHeading
          eyebrow="بخش سوم"
          title="تنظیمات قرارداد"
          description="شماره‌گذاری قرارداد، متن شروط، شرایط دریافت، تنظیمات چاپ و نمایش لوگوی تالار در قرارداد و پیش‌فاکتور از مسیر موجود مدیریت می‌شود."
          actionHref="/dashboard/contract-settings"
          actionLabel="مدیریت تنظیمات قرارداد"
        />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <StatusInfoCard title="پیشوند قرارداد" value={contractSetting?.contractPrefix ?? "ثبت نشده"} tone={contractSetting?.contractPrefix ? "success" : "warning"} />
          <StatusInfoCard title="نمایش لوگو در چاپ" value={contractSetting?.showLogoOnPrint ? "فعال" : "غیرفعال"} tone={contractSetting?.showLogoOnPrint ? "success" : "muted"} />
          <StatusInfoCard title="شروط و شرایط" value={contractSetting?.defaultClauses || contractSetting?.paymentTerms ? "متن‌ها ثبت شده‌اند" : "نیازمند تکمیل"} tone={contractSetting?.defaultClauses || contractSetting?.paymentTerms ? "success" : "warning"} />
        </div>
      </section>

      <section id="finance-settings" className="scroll-mt-28 rounded-[1.9rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:p-6">
        <SectionHeading
          eyebrow="بخش چهارم"
          title="روش‌های دریافت و مالی"
          description="روش‌های دریافت و سرفصل‌های مالی باید از مسیرهای اصلی مدیریت شوند تا گزارش‌ها، قراردادها و هزینه‌ها بدون داده ساختگی کار کنند."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {financeCards.map((card) => (
            <SettingsCountCard key={card.href} card={card} />
          ))}
        </div>
      </section>

      <section id="communications" className="scroll-mt-28 rounded-[1.9rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:p-6">
        <SectionHeading
          eyebrow="بخش پنجم"
          title="اعلان‌ها و ارتباطات"
          description="تنظیم اعلان‌ها، تلگرام، پیامک، قالب پیام‌ها، امنیت و پشتیبان‌گیری از مسیرهای موجود قابل مدیریت است."
          actionHref="/dashboard/settings"
          actionLabel="مشاهده همه تنظیمات"
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SimpleLinkCard title="اعلان‌ها" description="رویدادهای مدیریتی، کانال‌ها و قواعد ارسال." href="/dashboard/settings/notifications" cta="تنظیم اعلان‌ها" icon={BellRing} />
          <SimpleLinkCard title="قالب پیام‌ها" description="متن‌های فارسی پیامک، تلگرام و یادآوری‌ها." href="/dashboard/settings/message-templates" cta="مدیریت قالب‌ها" icon={MessageSquareText} />
          <SimpleLinkCard title="امنیت" description="رمز عبور، نشست‌ها و تنظیمات حساس حساب." href="/dashboard/settings/security" cta="تنظیم امنیت" icon={ShieldCheck} />
          <SimpleLinkCard title="پشتیبان‌گیری" description="خروجی اطلاعات و نسخه‌های پشتیبان امن." href="/dashboard/settings/backups" cta="مدیریت پشتیبان‌گیری" icon={ArchiveRestore} />
        </div>
      </section>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-black text-[#17483f]">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black text-[#172033]">{title}</h2>
        <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-[#6d5f49]">{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#172033] px-4 py-2 text-sm font-black text-[#fff8ea] shadow-[0_14px_32px_rgba(17,24,39,0.18)] transition hover:-translate-y-0.5 hover:bg-[#111827]">
          {actionLabel}
          <ChevronLeft size={16} />
        </Link>
      ) : null}
    </div>
  );
}

function HallChecklistCard({
  icon: Icon,
  title,
  complete,
  value,
}: {
  icon: LucideIcon;
  title: string;
  complete: boolean;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-white/62 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-[#172033] text-[#f0dba9]"><Icon size={18} /></span>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${complete ? "border-[#9fc9b4] bg-[#eef7f0] text-[#17483f]" : "border-[#e8c478]/50 bg-[#fff4d8] text-[#7d5d23]"}`}>
          {complete ? <CheckCircle2 size={12} /> : null}
          {complete ? "کامل" : "نیازمند تکمیل"}
        </span>
      </div>
      <h3 className="mt-4 text-sm font-black text-[#172033]">{title}</h3>
      <p className="mt-1 line-clamp-2 text-sm font-bold leading-7 text-[#6d5f49]">{value}</p>
    </div>
  );
}

function SettingsCountCard({ card }: { card: CountCard }) {
  const Icon = card.icon;
  const isReady = card.status.includes("آماده") || card.status.includes("فعال") || card.status.includes("گزارش");

  return (
    <Link href={card.href} className="group rounded-[1.5rem] border border-[#d8c08b]/62 bg-white/62 p-4 transition hover:-translate-y-0.5 hover:border-[#c7a15a]/70 hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-[#172033] text-[#f0dba9]"><Icon size={19} /></span>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${isReady ? "border-[#9fc9b4] bg-[#eef7f0] text-[#17483f]" : "border-[#e8c478]/50 bg-[#fff4d8] text-[#7d5d23]"}`}>{card.status}</span>
      </div>
      <h3 className="mt-4 text-base font-black text-[#172033]">{card.title}</h3>
      <p className="mt-2 min-h-14 text-sm font-bold leading-7 text-[#6d5f49]">{card.description}</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#d8c08b]/45 pt-3">
        <span className="text-xs font-black text-[#17483f]">{card.countLabel}</span>
        <span className="inline-flex items-center gap-1 text-xs font-black text-[#9f7131] group-hover:text-[#172033]">{card.cta}<ChevronLeft size={14} /></span>
      </div>
    </Link>
  );
}

function StatusInfoCard({ title, value, tone }: { title: string; value: string; tone: "success" | "warning" | "muted" }) {
  const toneClasses = {
    success: "border-[#9fc9b4] bg-[#eef7f0] text-[#17483f]",
    warning: "border-[#e8c478]/50 bg-[#fff4d8] text-[#7d5d23]",
    muted: "border-[#d8c08b]/62 bg-white/62 text-[#6d5f49]",
  }[tone];

  return (
    <div className={`rounded-[1.5rem] border p-4 ${toneClasses}`}>
      <p className="text-xs font-black opacity-80">{title}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}

function SimpleLinkCard({
  title,
  description,
  href,
  cta,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
}) {
  return (
    <Link href={href} className="group rounded-[1.5rem] border border-[#d8c08b]/62 bg-white/62 p-4 transition hover:-translate-y-0.5 hover:border-[#c7a15a]/70 hover:bg-white">
      <span className="grid size-11 place-items-center rounded-2xl bg-[#172033] text-[#f0dba9]"><Icon size={19} /></span>
      <h3 className="mt-4 text-base font-black text-[#172033]">{title}</h3>
      <p className="mt-2 min-h-14 text-sm font-bold leading-7 text-[#6d5f49]">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-[#9f7131] group-hover:text-[#172033]">{cta}<ChevronLeft size={14} /></span>
    </Link>
  );
}

function getHallCompleteness(profile: HallProfileSummary | null) {
  const checks = [
    Boolean(profile?.brandName),
    Boolean(profile?.hallLogoUrl),
    Boolean(profile?.phone || profile?.mobile),
    Boolean(profile?.address && (profile.city || profile.province)),
    Boolean(profile?.legalName || profile?.registrationNumber || profile?.economicCode),
    Boolean(profile?.description),
    Boolean(profile?.licenseNumber),
  ];
  const completed = checks.filter(Boolean).length;
  const missingCount = checks.length - completed;

  return {
    missingCount,
    percent: Math.round((completed / checks.length) * 100),
    statusLabel: missingCount === 0 ? "کامل" : "نیازمند تکمیل",
  };
}

function formatAddressSummary(profile: HallProfileSummary | null) {
  const parts = [profile?.province, profile?.city, profile?.address].filter(Boolean);
  return parts.length > 0 ? parts.join("، ") : "ثبت نشده";
}

function getLegalSummary(profile: HallProfileSummary | null) {
  if (profile?.legalName) {
    return profile.legalName;
  }

  if (profile?.registrationNumber) {
    return `شماره ثبت ${profile.registrationNumber}`;
  }

  if (profile?.economicCode) {
    return `کد اقتصادی ${profile.economicCode}`;
  }

  return "ثبت نشده";
}
