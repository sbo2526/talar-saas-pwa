import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  ClipboardList,
  Gem,
  HandCoins,
  LayoutDashboard,
  ListChecks,
  MonitorSmartphone,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { startDemoAction } from "@/lib/actions/auth-actions";

const gettingStarted = [
  {
    title: "فعال‌سازی دوره بررسی یا خرید اشتراک",
    text: "ابتدا فضای بررسی را فعال کنید یا مسیر خرید اشتراک را ادامه دهید.",
  },
  {
    title: "تعریف اطلاعات پایه تالار",
    text: "تالار، سالن، منو، خدمات، روش دریافت و دسته‌بندی مالی را آماده کنید.",
  },
  {
    title: "شروع ثبت قرارداد و مدیریت مالی",
    text: "پس از آماده‌سازی، قراردادها، دریافت‌ها و گزارش‌های مالی را مدیریت کنید.",
  },
];

const benefits = [
  { title: "ثبت قرارداد حرفه‌ای", icon: ClipboardList },
  { title: "مدیریت سالن‌ها", icon: LayoutDashboard },
  { title: "پیگیری دریافت‌ها و اقساط", icon: WalletCards },
  { title: "گزارش‌های مالی", icon: HandCoins },
];

const pwaTips = [
  "در اندروید، سامانه را به صفحه اصلی اضافه کنید.",
  "در آیفون، از Safari و گزینه Add to Home Screen استفاده کنید.",
  "در ویندوز، تالار منیجر را در Chrome یا Edge مانند یک برنامه مستقل اجرا کنید.",
];

export function NoTenantState() {
  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7 lg:p-9">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:px-4 sm:py-2 sm:text-sm">
              <Gem size={15} />
              آماده شروع بهره‌برداری
            </div>
            <h1 className="mt-4 max-w-3xl text-2xl font-black leading-tight sm:mt-5 sm:text-4xl">
              هنوز فضای کاری فعالی برای شما ایجاد نشده است
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:mt-4 sm:text-base sm:leading-8">
              برای شروع، دوره بررسی یک‌باره را فعال کنید یا پس از خرید، فضای اختصاصی
              تالار خود را راه‌اندازی نمایید.
            </p>

            <div className="mt-5 grid gap-2.5 sm:mt-7 sm:flex sm:flex-wrap">
              <form action={startDemoAction}>
                <button className="btn-luxury-dark w-full px-5 py-3 sm:w-auto sm:px-6">
                  شروع دوره بررسی یک‌باره
                  <ArrowLeft size={18} />
                </button>
              </form>
              <Link
                href="/dashboard/account/plans"
                className="btn-luxury-secondary w-full px-5 py-3 !text-[#111827] sm:w-auto sm:px-6"
              >
                مشاهده پلن خرید
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/72 bg-[#fff8ea]/72 px-5 py-3 text-sm font-black text-[#6d5f49] hover:border-[#c7a15a] sm:w-auto"
              >
                بازگشت به صفحه اصلی
              </Link>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-[#f0dba9] sm:text-sm">
                  نقشه راه شروع
                </p>
                <h2 className="mt-1 text-xl font-black sm:text-2xl">
                  مرحله فعلی
                </h2>
              </div>
              <span className="rounded-2xl border border-[#25a46d]/30 bg-[#25a46d]/12 px-3 py-2 text-xs font-black text-[#a9f2cf]">
                آماده شروع
              </span>
            </div>
            <div className="gold-divider my-4 sm:my-5" />
            <div className="rounded-3xl border border-[#e8c478]/20 bg-[#e8c478]/[0.08] p-3.5 sm:p-4">
              <p className="text-xs font-black text-[#cfc0a0]">گام بعدی</p>
              <p className="mt-2 text-base font-black leading-7 text-[#fff9ed] sm:text-lg">
                فعال‌سازی فضای بررسی یا خرید اشتراک
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:gap-3">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;

                return (
                  <div
                    key={benefit.title}
                    className="rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3"
                  >
                    <Icon className="text-[#f0dba9]" size={18} />
                    <p className="mt-2 text-xs font-black leading-5 sm:text-sm">
                      {benefit.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {gettingStarted.map((step, index) => (
          <article
            key={step.title}
            className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff9ee]/92 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[1.75rem] sm:p-5"
          >
            <p className="text-2xl font-black text-[#c7a15a] sm:text-3xl">
              {["۰۱", "۰۲", "۰۳"][index]}
            </p>
            <h2 className="mt-3 text-lg font-black sm:mt-4 sm:text-xl">
              {step.title}
            </h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49] sm:mt-3">
              {step.text}
            </p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.86fr]">
        <section className="rounded-[1.65rem] border border-[#d8c08b]/62 bg-[#fff9ee]/92 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9] sm:size-12">
              <MonitorSmartphone size={21} />
            </span>
            <div>
              <h2 className="text-lg font-black sm:text-xl">
                سامانه را مانند یک اپلیکیشن نصب کنید
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49] sm:mt-3 sm:text-base sm:leading-8">
                برای دسترسی سریع‌تر و تجربه‌ای نزدیک به اپلیکیشن، تالار منیجر
                را روی موبایل یا ویندوز نصب کنید.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2.5 sm:mt-5">
            {pwaTips.map((tip) => (
              <div
                key={tip}
                className="flex items-start gap-3 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/78 p-3 text-sm font-bold leading-7 text-[#6d5f49] sm:p-4"
              >
                <BadgeCheck className="mt-1 shrink-0 text-[#c7a15a]" size={17} />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.65rem] border border-[#e8c478]/26 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_22px_72px_rgba(17,24,39,0.18)] sm:rounded-[2rem] sm:p-6">
          <div className="inline-flex size-10 items-center justify-center rounded-2xl border border-[#e8c478]/30 bg-[#e8c478]/10 text-[#f0dba9] sm:size-12">
            <ShieldCheck size={21} />
          </div>
          <h2 className="mt-4 text-xl font-black sm:mt-5 sm:text-2xl">
            چرا ابتدا فضای کاری؟
          </h2>
          <p className="mt-3 text-sm font-bold leading-7 text-[#d9caa9] sm:text-base sm:leading-8">
            اطلاعات تالار، قراردادها، دریافت‌ها و گزارش‌های مالی باید در یک
            فضای کاری امن و جداگانه ثبت شوند تا داده‌های هر تالار از سایر
            مجموعه‌ها تفکیک شود.
          </p>
          <div className="gold-divider my-4 sm:my-5" />
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3.5 sm:p-4">
            <ListChecks className="shrink-0 text-[#f0dba9]" size={21} />
            <span className="text-sm font-black leading-6 sm:text-base">
              مسیر بعدی: تعریف اطلاعات پایه
            </span>
          </div>
        </section>
      </div>
    </section>
  );
}
