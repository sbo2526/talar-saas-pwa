import {
  CalendarDays,
  CheckCircle2,
  Crown,
  FileSignature,
  Gem,
  LayoutDashboard,
  LockKeyhole,
  Sparkles,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

type AuthShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footerText: string;
  footerHref: string;
  footerLink: string;
};

const trustBadges = [
  "دوره بررسی رایگان قبل از خرید",
  "فضای اختصاصی هر تالار",
  "امنیت اطلاعات قراردادها",
];

const benefitItems = [
  "مدیریت قراردادها",
  "رزرو و تقویم شمسی",
  "گزارش‌های مالی",
];

const previewMetrics = [
  {
    label: "قرارداد فعال",
    value: "۱۲",
    icon: FileSignature,
  },
  {
    label: "رزرو هفته",
    value: "۲۸",
    icon: CalendarDays,
  },
  {
    label: "وضعیت مالی",
    value: "۸۵٪",
    icon: WalletCards,
  },
  {
    label: "فضای اختصاصی",
    value: "آماده",
    icon: LayoutDashboard,
  },
];

export function AuthShell({
  title,
  description,
  children,
  footerText,
  footerHref,
  footerLink,
}: AuthShellProps) {
  return (
    <main
      dir="rtl"
      className="font-sans isolate min-h-screen overflow-hidden bg-[#070b12] text-[#fff8ea]"
    >
      <LuxuryBackdrop />
      <AuthTopLinks />

      <div
        dir="ltr"
        className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 pb-5 pt-20 sm:px-6 lg:flex-row-reverse lg:items-stretch lg:gap-8 lg:px-8 lg:pb-8 lg:pt-20"
      >
        <section
          dir="rtl"
          className="order-1 flex flex-1 items-center justify-center lg:order-none lg:max-w-[35rem]"
        >
          <div className="relative w-full overflow-hidden rounded-[2.25rem] border border-[#e8c478]/35 bg-[radial-gradient(circle_at_14%_0%,rgba(232,196,120,0.20),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.98),rgba(246,233,204,0.97))] p-5 text-[#111827] shadow-[0_36px_120px_rgba(0,0,0,0.40)] sm:p-7 lg:p-8">
            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-l from-transparent via-[#c7a15a] to-transparent" />
            <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-[#d9b86f]/20 blur-3xl" />

            <Link href="/" className="relative inline-flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl border border-[#c7a15a]/45 bg-[#111827] text-[#f0dba9] shadow-[0_18px_45px_rgba(17,24,39,0.22)]">
                <Gem size={23} />
              </span>
              <span>
                <span className="block text-xl font-black text-[#111827]">
                  تالار منیجر
                </span>
                <span className="block text-xs font-black text-[#7d6841]">
                  سامانه لوکس مدیریت تالار
                </span>
              </span>
            </Link>

            <div className="relative mt-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/35 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
                <LockKeyhole size={15} />
                دسترسی امن به حساب کاربری
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight text-[#101722] sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 leading-8 text-[#6d5f49]">{description}</p>
            </div>

            <div className="gold-divider mt-6" />

            <div className="relative mt-6">{children}</div>

            <p className="relative mt-6 rounded-2xl border border-[#d8c08b]/55 bg-[#fff8ea]/72 px-4 py-3 text-center text-sm font-bold text-[#6d5f49]">
              {footerText}{" "}
              <Link
                href={footerHref}
                className="font-black text-[#17483f] underline-offset-4 hover:text-[#9f7131] hover:underline"
              >
                {footerLink}
              </Link>
            </p>
          </div>
        </section>

        <aside
          dir="rtl"
          className="order-2 relative flex flex-1 overflow-hidden rounded-[2.25rem] border border-[#e8c478]/24 bg-[radial-gradient(circle_at_18%_0%,rgba(232,196,120,0.24),transparent_22rem),radial-gradient(circle_at_85%_28%,rgba(23,72,63,0.34),transparent_24rem),linear-gradient(145deg,rgba(16,24,37,0.94),rgba(6,10,16,0.97))] p-6 shadow-[0_36px_130px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:p-8 lg:order-none lg:min-h-[calc(100vh-5rem)]"
        >
          <div className="absolute -left-24 top-24 h-56 w-56 rounded-full bg-[#d9b86f]/16 blur-3xl" />
          <div className="absolute -right-24 bottom-12 h-64 w-64 rounded-full bg-[#17483f]/32 blur-3xl" />

          <div className="relative flex w-full flex-col justify-between gap-10">
            <div>
              <div className="flex items-center justify-between gap-4">
                <Link href="/" className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl border border-[#e8c478]/35 bg-[#e8c478]/10 text-[#f0dba9]">
                    <Gem size={23} />
                  </span>
                  <span>
                    <span className="block text-2xl font-black text-[#fff4d5]">
                      تالار منیجر
                    </span>
                    <span className="text-xs font-bold text-[#d9caa9]">
                      سامانه لوکس مدیریت تالار
                    </span>
                  </span>
                </Link>
                <div className="hidden rounded-full border border-[#e8c478]/25 bg-[#e8c478]/10 px-3 py-1.5 text-xs font-black text-[#f0dba9] sm:block">
                  PWA قابل نصب
                </div>
              </div>

              <div className="mt-14 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/35 bg-[#e8c478]/12 px-4 py-2 text-sm font-black text-[#ffe8ad] shadow-[0_0_50px_rgba(232,196,120,0.16)] backdrop-blur-2xl">
                  <Crown size={18} />
                  ورود امن به سامانه مدیریت تالار
                </div>
                <h2 className="mt-7 text-4xl font-black leading-tight text-[#fff9ed] sm:text-5xl">
                  مدیریت تالار از قرارداد تا گزارش مالی
                </h2>
                <p className="mt-5 max-w-xl leading-9 text-[#d9caa9]">
                  قراردادها، رزروها، پرداخت‌ها و گزارش‌های مالی تالار را در یک محیط امن و یکپارچه مدیریت کنید.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {trustBadges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-[#e8c478]/24 bg-white/[0.06] px-4 py-2 text-sm font-black text-[#f0dba9] backdrop-blur-xl"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="grid gap-3">
                {benefitItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-3xl border border-white/[0.10] bg-white/[0.055] p-4 backdrop-blur-xl"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-[#d9b86f]" size={20} />
                      <p className="font-black text-[#fff9ed]">{item}</p>
                    </div>
                  </div>
                ))}
              </div>

              <MiniDashboardCard />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function AuthTopLinks() {
  return (
    <div
      dir="rtl"
      className="absolute inset-x-0 top-4 z-20 px-4 sm:px-6 lg:px-8"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,35rem)] lg:gap-8">
        <nav
          aria-label="دسترسی سریع"
          className="inline-flex items-center gap-2 justify-self-center rounded-full border border-[#e8c478]/20 bg-[#070b12]/76 p-1 shadow-[0_18px_65px_rgba(0,0,0,0.30)] backdrop-blur-2xl lg:col-start-2 lg:justify-self-end"
        >
          <Link
            href="/"
            className="rounded-full px-4 py-2 text-xs font-black text-[#fff4d5] transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8c478]/65"
          >
            صفحه اصلی
          </Link>
          <Link
            href="/purchase"
            className="rounded-full border border-[#e8c478]/30 bg-[#e8c478]/18 px-4 py-2 text-xs font-black text-[#f6d58a] transition hover:bg-[#e8c478]/26 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8c478]/65"
          >
            مشاهده پلن‌ها
          </Link>
        </nav>
      </div>
    </div>
  );
}

function LuxuryBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_12%,rgba(232,196,120,0.16),transparent_25rem),radial-gradient(circle_at_92%_18%,rgba(23,72,63,0.28),transparent_28rem),linear-gradient(135deg,#050810_0%,#0a1019_48%,#111a28_100%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="absolute inset-0 opacity-[0.09] [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.55)_0.6px,transparent_0.8px)] [background-size:18px_18px]" />
    </div>
  );
}

function MiniDashboardCard() {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(255,248,234,0.13),rgba(255,248,234,0.055))] p-5 shadow-[0_28px_95px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
      <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-[#e8c478]/14 blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-[#f0dba9]">
            نمای حساب تالار
          </p>
          <h3 className="mt-2 text-2xl font-black text-[#fff9ed]">
            فضای اختصاصی
          </h3>
        </div>
        <span className="rounded-2xl border border-[#25a46d]/30 bg-[#25a46d]/12 px-3 py-2 text-xs font-black text-[#a9f2cf]">
          امن
        </span>
      </div>

      <div className="gold-divider my-5" />

      <div className="grid gap-3 sm:grid-cols-2">
        {previewMetrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.label}
              className="rounded-3xl border border-white/[0.10] bg-[#fff8ea]/[0.07] p-4"
            >
              <div className="flex items-center gap-2 text-[#f0dba9]">
                <Icon size={18} />
                <p className="text-xs font-black">{metric.label}</p>
              </div>
              <p className="mt-3 text-xl font-black text-[#fff9ed]">
                {metric.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-3xl border border-[#e8c478]/20 bg-[#e8c478]/[0.08] p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-black text-[#eadcc0]">
            مسیر کاربر
          </span>
          <Sparkles className="text-[#f0dba9]" size={18} />
        </div>
        <p className="mt-3 text-sm leading-7 text-[#d9caa9]">
          ثبت‌نام، فعال‌سازی دوره بررسی، بررسی سامانه و سپس انتخاب پلن مناسب.
        </p>
      </div>
    </div>
  );
}
