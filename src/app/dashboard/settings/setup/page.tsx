import {
  BellRing,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Gem,
  ListChecks,
  ReceiptText,
  Sparkles,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import {
  BackToSettingsLink,
  SettingsPageShell,
  SettingsPrimaryLink,
} from "@/components/dashboard/settings/settings-page-shell";
import { requireTenantMember } from "@/lib/auth/session";
import {
  getInitialSetupOverview,
  type InitialSetupOverview,
  type InitialSetupSectionKey,
} from "@/lib/settings/initial-setup";

const setupCards: Array<{
  key: InitialSetupSectionKey | "notifications";
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: typeof Building2;
}> = [
  {
    key: "hallInfo",
    title: "اطلاعات تالار",
    description:
      "نام تالار، لوگو، اطلاعات تماس، آدرس و متن‌های قابل نمایش در فاکتور یا پیش‌فاکتور را تکمیل کنید.",
    href: "/dashboard/hall-info",
    cta: "مدیریت اطلاعات تالار",
    icon: Building2,
  },
  {
    key: "hallsAndSalons",
    title: "تالارها و سالن‌ها",
    description:
      "تالارها، سالن‌ها، ظرفیت‌ها و قیمت‌های پایه سالن‌ها را برای استفاده در قراردادها آماده کنید.",
    href: "/dashboard/base",
    cta: "مدیریت تالار و سالن",
    icon: Gem,
  },
  {
    key: "services",
    title: "خدمات مراسم",
    description:
      "خدمات قابل انتخاب در قرارداد مانند تشریفات، موسیقی، عکاسی و افکت‌های مراسم را مدیریت کنید.",
    href: "/dashboard/services",
    cta: "مدیریت خدمات مراسم",
    icon: Sparkles,
  },
  {
    key: "menus",
    title: "منوی پذیرایی",
    description:
      "غذاها، نوشیدنی‌ها، دسرها و قیمت‌های هر نفر را برای محاسبه دقیق قرارداد تکمیل کنید.",
    href: "/dashboard/menus",
    cta: "مدیریت منوها",
    icon: Utensils,
  },
  {
    key: "paymentMethods",
    title: "روش‌های دریافت",
    description:
      "روش‌های دریافت وجه مانند نقدی، کارت‌خوان، حواله و چک را برای ثبت دریافتی‌ها آماده کنید.",
    href: "/dashboard/payment-methods",
    cta: "مدیریت روش‌های دریافت",
    icon: CreditCard,
  },
  {
    key: "financialCategories",
    title: "دسته‌بندی مالی",
    description:
      "دسته‌بندی‌های درآمد و هزینه را برای گزارش‌های مالی و ثبت هزینه‌ها منظم کنید.",
    href: "/dashboard/financial-categories",
    cta: "مدیریت دسته‌بندی‌ها",
    icon: ReceiptText,
  },
  {
    key: "contractSettings",
    title: "تنظیمات قرارداد",
    description:
      "شماره‌گذاری قرارداد، متن‌های حقوقی، شرایط دریافت و گزینه‌های چاپ را از این بخش تنظیم کنید.",
    href: "/dashboard/contract-settings",
    cta: "مدیریت تنظیمات قرارداد",
    icon: FileText,
  },
  {
    key: "notifications",
    title: "اعلان‌ها و ارتباطات",
    description:
      "پس از تکمیل تعاریف پایه، اعلان‌های تلگرام، پیامک و قالب‌های پیام را برای جریان‌های عملیاتی آماده کنید.",
    href: "/dashboard/settings/notifications",
    cta: "مدیریت اعلان‌ها",
    icon: BellRing,
  },
];

export default async function InitialSetupPage() {
  const membership = await requireTenantMember();
  const overview = await getInitialSetupOverview(membership.tenantId);

  return (
    <SettingsPageShell
      title="راه‌اندازی اولیه سامانه"
      subtitle="برای آماده‌سازی سامانه جهت استفاده واقعی، بخش‌های پایه را بررسی و تکمیل کنید. این صفحه فقط هاب راهبری است و فرم‌های اصلی در مسیرهای تخصصی خودشان باقی می‌مانند."
      badge="آماده‌سازی سامانه"
      tenantName={membership.tenant.name}
      actions={
        <>
          <SettingsPrimaryLink href="/dashboard/base">
            تعاریف پایه
          </SettingsPrimaryLink>
          <BackToSettingsLink />
        </>
      }
    >
      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-5 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl border border-[#e8c478]/28 bg-[#e8c478]/10 text-[#f0dba9]">
              <ListChecks size={23} />
            </span>
            <span className="rounded-full border border-[#25a46d]/25 bg-[#25a46d]/12 px-3 py-1 text-[11px] font-black text-[#a9f2cf]">
              {overview.statusLabel}
            </span>
          </div>
          <h2 className="mt-5 text-2xl font-black leading-9">وضعیت آماده‌سازی</h2>
          <p className="mt-3 text-sm font-bold leading-7 text-[#d9caa9]">
            {overview.readinessLabel} همه وضعیت‌ها از داده‌های tenant فعلی خوانده می‌شوند و عدد نمایشی ساختگی نیست.
          </p>
          <div className="gold-divider my-5" />
          <div className="grid gap-2.5">
            {overview.sections.map((section) => (
              <div
                key={section.key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.10] bg-white/[0.055] px-3 py-2.5 text-sm font-black"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <CheckCircle2
                    size={16}
                    className={section.isComplete ? "text-[#a9f2cf]" : "text-[#f0dba9]"}
                  />
                  <span className="truncate">{section.title}</span>
                </span>
                <span className="shrink-0 text-xs text-[#d9caa9]">{section.status}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="grid gap-4 md:grid-cols-2">
          {setupCards.map((card) => (
            <SetupCard key={card.href} card={card} overview={overview} />
          ))}
        </div>
      </section>
    </SettingsPageShell>
  );
}

function SetupCard({
  card,
  overview,
}: {
  card: (typeof setupCards)[number];
  overview: InitialSetupOverview;
}) {
  const Icon = card.icon;
  const section = overview.sections.find((item) => item.key === card.key);
  const isComplete = card.key === "notifications" ? true : section?.isComplete;
  const status = card.key === "notifications" ? "قابل پیکربندی" : section?.status ?? "نیازمند بررسی";

  return (
    <article className="flex h-full flex-col rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] transition hover:-translate-y-0.5 hover:border-[#c7a15a]/70 hover:shadow-[0_24px_72px_rgba(17,24,39,0.10)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#c7a15a]/35 bg-[#c7a15a]/10 text-[#17483f]">
          <Icon size={22} />
        </span>
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-black ${
            isComplete
              ? "border-[#25a46d]/22 bg-[#25a46d]/9 text-[#17483f]"
              : "border-[#d8a434]/32 bg-[#d8a434]/10 text-[#7d4f14]"
          }`}
        >
          {status}
        </span>
      </div>
      <h2 className="mt-4 text-xl font-black leading-8">{card.title}</h2>
      <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
        {card.description}
      </p>
      {section?.missingFields?.length ? (
        <p className="mt-3 rounded-2xl border border-[#d8a434]/28 bg-[#fff2d1]/70 px-3 py-2 text-xs font-black leading-6 text-[#7d4f14]">
          نیازمند تکمیل: {section.missingFields.join("، ")}
        </p>
      ) : null}
      <div className="mt-auto pt-5">
        <Link
          href={card.href}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-black text-[#fff8ea] shadow-[0_16px_38px_rgba(17,24,39,0.16)] transition hover:border-[#c7a15a] hover:bg-[#0f172a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7a15a]"
        >
          {card.cta}
        </Link>
      </div>
    </article>
  );
}
