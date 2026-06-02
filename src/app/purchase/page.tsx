import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronLeft,
  Crown,
  FileSignature,
  Gem,
  HelpCircle,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Utensils,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { formatJalaliDate } from "@/lib/date/jalali";

type IconCard = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type PricingPlan = {
  title: string;
  price: string;
  priceNote: string;
  description: string;
  bestFor: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
  badge?: string;
};

type ComparisonRow = {
  feature: string;
  base: string;
  professional: string;
  enterprise: string;
};

const heroBullets = [
  "انتخاب پلن مناسب قبل از فعال‌سازی",
  "فضای اختصاصی برای تالار شما",
  "ثبت قرارداد، رزرو، خدمات و مالی",
  "قابل استفاده روی موبایل و کامپیوتر",
];

const summaryItems = [
  ["وضعیت", "آماده انتخاب پلن"],
  ["قدم بعدی", "ورود یا ثبت‌نام"],
  ["فضا", "ویژه تالار شما"],
  ["شروع استفاده", "پس از فعال‌سازی"],
  ["مناسب برای", "تالار، باغ‌تالار و تشریفات"],
  ["ساختار", "قرارداد، رزرو، مالی، گزارش"],
];

const pricingPlans: PricingPlan[] = [
  {
    title: "پلن پایه",
    price: "درخواست قیمت ماهانه",
    priceNote: "قیمت نهایی هنگام فعال‌سازی اعلام می‌شود.",
    description: "مناسب تالارهای کوچک یا شروع مدیریت دیجیتال",
    bestFor: "برای شروع ساده و خروج از دفتر، اکسل و پیام‌رسان",
    cta: "انتخاب پایه و ادامه خرید",
    href: "#account-cta",
    features: [
      "۱ سالن برای شروع مدیریت دیجیتال",
      "ثبت قرارداد و رزرو",
      "مدیریت پایه خدمات و منوها",
      "گزارش‌های پایه مدیریتی",
      "پشتیبانی معمولی راه‌اندازی",
    ],
  },
  {
    title: "پلن حرفه‌ای",
    price: "پلن پیشنهادی",
    priceNote: "بهترین انتخاب برای بیشتر تالارهای فعال.",
    description: "برای استفاده واقعی، روزمره و حرفه‌ای",
    bestFor: "پیشنهادی برای بیشتر تالارها و باغ‌تالارها",
    cta: "انتخاب حرفه‌ای و ادامه خرید",
    href: "#account-cta",
    featured: true,
    badge: "پیشنهادی برای شروع واقعی",
    features: [
      "چند سالن و ساختار حرفه‌ای",
      "ثبت قرارداد و رزرو نامحدود",
      "مدیریت کامل خدمات و منوها",
      "کنترل پرداخت، اقساط و تسویه",
      "گزارش‌های مدیریتی کامل‌تر",
      "همراهی اولیه در راه‌اندازی",
    ],
  },
  {
    title: "پلن سازمانی",
    price: "قیمت‌گذاری سفارشی",
    priceNote: "پس از بررسی نیاز مجموعه اعلام می‌شود.",
    description: "برای مجموعه‌های چندسالن، چندتالار یا سفارشی",
    bestFor: "مناسب مجموعه‌های بزرگ و برندهای تشریفاتی",
    cta: "درخواست مشاوره سازمانی",
    href: "#account-cta",
    badge: "مشاوره و فعال‌سازی اختصاصی",
    features: [
      "همه امکانات حرفه‌ای",
      "مناسب چند تالار یا چند شعبه",
      "ساختار اختصاصی فعال‌سازی",
      "گزارش‌ها و دسترسی‌های توسعه‌پذیر",
      "پشتیبانی اختصاصی",
      "امکان توسعه اختصاصی",
    ],
  },
];

const purchaseValues: IconCard[] = [
  {
    title: "فضای اختصاصی تالار",
    description:
      "پس از فعال‌سازی، فضای کاری جداگانه برای مدیریت اطلاعات و عملیات تالار شما آماده می‌شود.",
    icon: ShieldCheck,
  },
  {
    title: "تعریف سالن‌ها و ساختار پایه",
    description:
      "تالار، سالن، منو، خدمات، روش پرداخت و دسته‌بندی‌های مالی از ابتدا منظم ثبت می‌شوند.",
    icon: Building2,
  },
  {
    title: "ثبت قرارداد حرفه‌ای",
    description:
      "مسیر آماده برای ثبت قرارداد، دریافت بیعانه، بندهای قرارداد و خروجی چاپی حرفه‌ای.",
    icon: FileSignature,
  },
  {
    title: "مدیریت منوها و خدمات",
    description:
      "خدمات، منوها و اقلام قابل ارائه در قراردادها ساختارمند و قابل استفاده مجدد می‌شوند.",
    icon: Utensils,
  },
  {
    title: "کنترل بیعانه، اقساط و تسویه",
    description:
      "دریافت‌ها، پرداخت اقساط، مانده تسویه نهایی و هزینه‌ها با دید مدیریتی کنترل می‌شوند.",
    icon: WalletCards,
  },
  {
    title: "گزارش‌های مالی و هزینه‌ها",
    description:
      "زیرساخت گزارش‌گیری برای درآمد، هزینه، وضعیت قراردادها و تصمیم‌گیری مدیریتی آماده است.",
    icon: ChartNoAxesCombined,
  },
];

const comparisonRows: ComparisonRow[] = [
  {
    feature: "مناسب برای",
    base: "تالار کوچک",
    professional: "بیشتر تالارها",
    enterprise: "مجموعه‌های بزرگ",
  },
  {
    feature: "تعداد سالن",
    base: "۱ سالن",
    professional: "چند سالن",
    enterprise: "سفارشی",
  },
  {
    feature: "ثبت قرارداد",
    base: "دارد",
    professional: "نامحدود و کامل‌تر",
    enterprise: "کامل و توسعه‌پذیر",
  },
  {
    feature: "خدمات و منوها",
    base: "پایه",
    professional: "کامل",
    enterprise: "کامل + سفارشی",
  },
  {
    feature: "پرداخت و تسویه",
    base: "ساده",
    professional: "بیعانه، اقساط و مانده",
    enterprise: "سفارشی و قابل توسعه",
  },
  {
    feature: "گزارش مدیریتی",
    base: "پایه",
    professional: "کامل‌تر",
    enterprise: "پیشرفته و سفارشی",
  },
  {
    feature: "پشتیبانی",
    base: "معمولی",
    professional: "همراهی راه‌اندازی",
    enterprise: "اختصاصی",
  },
];

const trustValues: IconCard[] = [
  {
    title: "بررسی دوره بررسی قبل از خرید",
    description:
      "قبل از فعال‌سازی اشتراک، می‌توانید فضای دوره بررسی را بررسی و با مسیر کار سامانه آشنا شوید.",
    icon: ShieldCheck,
  },
  {
    title: "قابل استفاده روی موبایل و کامپیوتر",
    description:
      "سامانه به‌صورت PWA طراحی شده تا مدیر تالار روی موبایل و دسکتاپ به آن دسترسی داشته باشد.",
    icon: Gem,
  },
  {
    title: "همراهی در شروع راه‌اندازی",
    description:
      "مسیر ورود، انتخاب پلن و فعال‌سازی به حساب کاربری وصل می‌شود تا شروع کار شفاف باشد.",
    icon: BadgeCheck,
  },
  {
    title: "امکان ارتقا در آینده",
    description:
      "اگر تالار رشد کند یا ساختار چندسالن نیاز شود، مسیر انتخاب پلن‌های بالاتر روشن است.",
    icon: CalendarDays,
  },
];

const journeySteps = [
  "ابتدا دوره بررسی را برای بررسی اولیه و آشنایی با سامانه ببینید.",
  "پلن مناسب را بر اساس اندازه و نیاز تالار انتخاب کنید.",
  "برای ادامه خرید وارد حساب شوید یا حساب جدید بسازید.",
  "پس از فعال‌سازی، فضای اختصاصی تالار شما آماده مدیریت واقعی می‌شود.",
];

const faqs = [
  {
    question: "آیا قبل از خرید می‌توانم سامانه را بررسی کنم؟",
    answer:
      "بله، بهتر است ابتدا دوره بررسی را بررسی کنید و سپس پلن مناسب تالار خود را انتخاب کنید.",
  },
  {
    question: "پس از خرید چه اتفاقی می‌افتد؟",
    answer:
      "پس از ورود یا ثبت‌نام و تکمیل مسیر فعال‌سازی، فضای اختصاصی تالار شما آماده بهره‌برداری می‌شود.",
  },
  {
    question: "آیا سامانه برای چند سالن مناسب است؟",
    answer:
      "بله، پلن حرفه‌ای و سازمانی برای ساختار چندسالن و مجموعه‌های بزرگ مناسب‌تر هستند.",
  },
  {
    question: "آیا روی موبایل هم قابل استفاده است؟",
    answer:
      "بله، سامانه به‌صورت PWA قابل استفاده و نصب روی موبایل و دسکتاپ است.",
  },
];

export default async function PurchasePage() {
  const user = await getCurrentUser();
  const today = new Date();

  return (
    <main
      dir="rtl"
      className="font-sans isolate min-h-screen overflow-hidden bg-[#070b12] text-[#fff8ea]"
    >
      <LuxuryBackground />

      <section className="relative px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-[1.5rem] border border-[#e8c478]/20 bg-[#070b12]/70 px-4 py-3 shadow-[0_18px_70px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-[#e8c478]/35 bg-[#e8c478]/10 text-[#f0dba9]">
              <Gem size={21} />
            </span>
            <span>
              <span className="block text-lg font-black text-[#fff4d5]">
                تالار منیجر
              </span>
              <span className="hidden text-xs font-bold text-[#d9caa9] sm:block">
                سامانه لوکس مدیریت تالار
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/demo"
              className="hidden rounded-2xl border border-white/[0.10] bg-white/[0.05] px-4 py-2 text-sm font-black text-[#eadcc0] backdrop-blur-xl hover:border-[#e8c478]/35 hover:text-[#f0dba9] sm:inline-flex"
            >
              بازگشت به دوره بررسی
            </Link>
            <Link
              href="#plans"
              className="btn-luxury-primary min-h-0 rounded-2xl px-4 py-2 text-sm"
            >
              انتخاب پلن مناسب
              <ChevronLeft size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-20 sm:px-6 lg:px-8">
        <div className="absolute inset-x-0 top-20 -z-10 mx-auto h-96 max-w-6xl rounded-full bg-[#e8c478]/10 blur-3xl" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/35 bg-[#e8c478]/12 px-4 py-2 text-sm font-black text-[#ffe8ad] shadow-[0_0_50px_rgba(232,196,120,0.16)] backdrop-blur-2xl">
              <Crown size={18} />
              فعال‌سازی اشتراک و شروع بهره‌برداری واقعی
            </div>

            <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[1.18] tracking-normal text-[#fff9ed] drop-shadow-2xl sm:text-5xl lg:text-6xl">
              پلن مناسب تالار خود را انتخاب کنید
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-9 text-[#eadcc0] sm:text-xl">
              پس از بررسی دوره بررسی، پلن مناسب تالار خود را انتخاب کنید و فضای
              اختصاصی مدیریت قراردادها، رزروها، خدمات، منوها، پرداخت‌ها و
              گزارش‌های مالی را راه‌اندازی کنید.
            </p>

            <div className="mt-7 grid max-w-2xl gap-3 sm:grid-cols-2">
              {heroBullets.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/[0.10] bg-white/[0.06] px-4 py-3 text-sm font-black text-[#f3dfb7] backdrop-blur-xl"
                >
                  <CheckCircle2 className="ml-2 inline text-[#d9b86f]" size={17} />
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="#plans" className="btn-luxury-primary px-7 py-3">
                انتخاب پلن مناسب
                <ArrowLeft size={19} />
              </Link>
              <Link href="/" className="btn-luxury-secondary px-7 py-3">
                بازگشت به صفحه اصلی
              </Link>
            </div>
          </div>

          <SubscriptionSummary today={today} />
        </div>
      </section>

      <section id="plans" className="relative px-4 py-[5rem] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="پلن‌های اشتراک"
            title="پلن مناسب تالار خود را انتخاب کنید"
            description="برای شروع ساده، مدیریت حرفه‌ای یا مجموعه‌های چندسالن، یکی از مسیرهای زیر را انتخاب کنید. اگر قیمت قطعی هنوز عمومی نیست، درخواست فعال‌سازی یا مشاوره ثبت می‌شود."
          />

          <div className="mt-11 grid gap-5 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <PricingCard key={plan.title} plan={plan} />
            ))}
          </div>

          <PlanComparison />
        </div>
      </section>

      <section className="relative px-4 py-[5rem] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="ارزش اشتراک"
            title="پس از خرید، چه چیزی در اختیار شما قرار می‌گیرد؟"
            description="با فعال‌سازی اشتراک، فضای اختصاصی تالار آماده می‌شود و قراردادها، سالن‌ها، خدمات، پرداخت‌ها و گزارش‌های مالی در یک مسیر منظم مدیریت می‌شوند."
          />

          <div className="mt-11 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {purchaseValues.map((value) => (
              <FeatureCard key={value.title} feature={value} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 py-[5rem] sm:px-6 lg:px-8">
        <div className="absolute inset-x-0 top-16 -z-10 mx-auto h-72 max-w-5xl rounded-full bg-[#17483f]/30 blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="rounded-[2rem] border border-[#e8c478]/24 bg-[#101825]/82 p-7 shadow-[0_30px_110px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="inline-flex size-14 items-center justify-center rounded-2xl border border-[#e8c478]/35 bg-[#e8c478]/12 text-[#f0dba9]">
              <CalendarDays size={27} />
            </div>
            <h2 className="mt-6 text-3xl font-black leading-tight text-[#fff9ed] sm:text-4xl">
              از بررسی دوره بررسی تا راه‌اندازی واقعی
            </h2>
            <p className="mt-4 leading-8 text-[#d9caa9]">
              مسیر خرید باید روشن باشد: دوره بررسی برای ارزیابی، اشتراک برای شروع
              عملیات واقعی و فضای اختصاصی برای داده‌های تالار شما.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {journeySteps.map((step, index) => (
              <article
                key={step}
                className="relative overflow-hidden rounded-[1.75rem] border border-[#e8c478]/22 bg-[linear-gradient(145deg,rgba(255,248,234,0.11),rgba(255,248,234,0.045))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
              >
                <span className="absolute -left-5 -top-5 h-20 w-20 rounded-full bg-[#e8c478]/10 blur-2xl" />
                <p className="text-3xl font-black text-[#f0dba9]">
                  {["۰۱", "۰۲", "۰۳", "۰۴"][index]}
                </p>
                <p className="mt-4 leading-8 text-[#fff0cf]">{step}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 py-[5rem] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="پرسش‌های متداول"
            title="پاسخ‌های کوتاه برای تصمیم خرید"
            description="پرسش‌های اصلی قبل از فعال‌سازی اشتراک، شفاف و مستقیم پاسخ داده شده‌اند."
          />

          <div className="mt-11 grid gap-5 md:grid-cols-2">
            {faqs.map((item) => (
              <article
                key={item.question}
                className="rounded-[1.75rem] border border-[#e8c478]/22 bg-[linear-gradient(145deg,rgba(255,248,234,0.11),rgba(255,248,234,0.045))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
              >
                <div className="flex items-start gap-3">
                  <HelpCircle className="mt-1 shrink-0 text-[#f0dba9]" size={22} />
                  <div>
                    <h3 className="text-lg font-black text-[#fff9ed]">
                      {item.question}
                    </h3>
                    <p className="mt-3 leading-8 text-[#d9caa9]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 py-[5rem] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="شروع مطمئن"
            title="با خیال راحت اشتراک را انتخاب کنید"
            description="قبل از تصمیم نهایی، دوره بررسی را می‌بینید، مسیر فعال‌سازی روشن است و شروع استفاده واقعی به حساب کاربری شما متصل می‌شود."
          />

          <div className="mt-11 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {trustValues.map((value) => (
              <FeatureCard key={value.title} feature={value} compact />
            ))}
          </div>
        </div>
      </section>

      <section id="account-cta" className="relative px-4 py-[5rem] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <AccountAwareCta userIsLoggedIn={Boolean(user)} />
        </div>
      </section>

      <section className="relative px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] border border-[#e8c478]/30 bg-[radial-gradient(circle_at_12%_0%,rgba(232,196,120,0.22),transparent_20rem),linear-gradient(135deg,rgba(23,35,51,0.97),rgba(8,13,20,0.98))] p-7 shadow-[0_36px_130px_rgba(0,0,0,0.36)] sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/28 bg-[#e8c478]/10 px-4 py-2 text-sm font-black text-[#f0dba9]">
                <Sparkles size={17} />
                شروع بهره‌برداری واقعی
              </div>
              <h2 className="mt-5 text-3xl font-black leading-tight text-[#fff9ed] sm:text-4xl">
                آماده‌اید مدیریت تالار را حرفه‌ای‌تر آغاز کنید؟
              </h2>
              <p className="mt-4 max-w-3xl leading-9 text-[#d9caa9]">
                با فعال‌سازی اشتراک تالار منیجر، قراردادها، رزروها، خدمات و
                امور مالی را در یک محیط منظم، زیبا و حرفه‌ای مدیریت کنید.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="#plans" className="btn-luxury-primary px-7 py-3">
                انتخاب پلن مناسب
                <ArrowLeft size={18} />
              </Link>
              <Link href="/demo" className="btn-luxury-secondary px-7 py-3">
                بازگشت به دوره بررسی
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function LuxuryBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_12%,rgba(232,196,120,0.16),transparent_25rem),radial-gradient(circle_at_92%_18%,rgba(23,72,63,0.28),transparent_28rem),linear-gradient(135deg,#050810_0%,#0a1019_48%,#111a28_100%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="absolute inset-0 opacity-[0.09] [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.55)_0.6px,transparent_0.8px)] [background-size:18px_18px]" />
    </div>
  );
}

function SubscriptionSummary({ today }: { today: Date }) {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-5 rounded-[2.5rem] bg-[conic-gradient(from_140deg,rgba(232,196,120,0.28),rgba(23,72,63,0.16),transparent,rgba(232,196,120,0.22))] blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-[#e8c478]/30 bg-[linear-gradient(145deg,rgba(14,22,34,0.94),rgba(7,11,18,0.94))] p-5 shadow-[0_38px_140px_rgba(0,0,0,0.46)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-[#f0dba9]">
              خلاصه فعال‌سازی اشتراک
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#fff9ed]">
              فضای اختصاصی تالار
            </h2>
            <p className="mt-2 text-sm font-bold text-[#d9caa9]">
              تاریخ بررسی: {formatJalaliDate(today)}
            </p>
          </div>
          <span className="rounded-2xl border border-[#25a46d]/30 bg-[#25a46d]/12 px-3 py-2 text-xs font-black text-[#a9f2cf]">
آماده انتخاب
          </span>
        </div>

        <div className="gold-divider my-5" />

        <div className="grid gap-3 sm:grid-cols-2">
          {summaryItems.map(([label, value]) => (
            <div
              key={label}
              className="rounded-3xl border border-white/[0.10] bg-[#fff8ea]/[0.07] p-4"
            >
              <p className="text-xs font-black text-[#cfc0a0]">{label}</p>
              <p className="mt-2 text-base font-black text-[#fff9ed]">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-3xl border border-[#e8c478]/20 bg-[#e8c478]/[0.08] p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-black text-[#eadcc0]">
مسیر فعال‌سازی
            </span>
            <span className="text-sm font-black text-[#f0dba9]">
انتخاب پلن، ورود، شروع
            </span>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/[0.10]">
            <div className="h-full w-[88%] rounded-full bg-gradient-to-l from-[#f0dba9] via-[#d9b86f] to-[#9f7131]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <article
      className={`relative overflow-hidden rounded-[2rem] p-7 shadow-[0_28px_100px_rgba(0,0,0,0.28)] ${
        plan.featured
          ? "border border-[#f0dba9]/46 bg-[radial-gradient(circle_at_12%_0%,rgba(232,196,120,0.24),transparent_17rem),linear-gradient(145deg,rgba(255,248,234,0.16),rgba(15,23,35,0.94))]"
          : "border border-[#e8c478]/22 bg-[linear-gradient(145deg,rgba(255,248,234,0.12),rgba(255,248,234,0.05))]"
      }`}
    >
      {plan.badge ? (
        <div className="absolute left-5 top-5 rounded-full border border-[#f0dba9]/28 bg-[#f0dba9]/12 px-3 py-1 text-xs font-black text-[#f0dba9]">
          {plan.badge}
        </div>
      ) : null}

      <ReceiptText className="text-[#f0dba9]" size={30} />
      <h3 className="mt-6 text-2xl font-black text-[#fff9ed]">{plan.title}</h3>
      <p className="mt-3 text-3xl font-black leading-tight text-[#f0dba9] sm:text-4xl">
        {plan.price}
      </p>
      <p className="mt-2 text-sm font-black text-[#ffe8ad]">
        {plan.priceNote}
      </p>
      <p className="mt-4 leading-8 text-[#d9caa9]">{plan.description}</p>
      <div className="mt-4 rounded-2xl border border-[#e8c478]/18 bg-[#e8c478]/[0.07] px-4 py-3 text-sm font-black leading-7 text-[#fff0cf]">
        {plan.bestFor}
      </div>

      <ul className="mt-6 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm font-bold text-[#fff0cf]">
            <CheckCircle2 size={17} className="shrink-0 text-[#d9b86f]" />
            {feature}
          </li>
        ))}
      </ul>

      <Link
        href={plan.href}
        className={`mt-8 w-full px-5 py-3 ${
          plan.featured ? "btn-luxury-primary" : "btn-luxury-secondary"
        }`}
      >
        {plan.cta}
        <ChevronLeft size={18} />
      </Link>
    </article>
  );
}

function PlanComparison() {
  return (
    <div className="mt-12 overflow-hidden rounded-[2rem] border border-[#e8c478]/24 bg-[linear-gradient(145deg,rgba(255,248,234,0.10),rgba(255,248,234,0.045))] shadow-[0_30px_110px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
      <div className="border-b border-[#e8c478]/18 p-6 sm:p-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/25 bg-[#e8c478]/10 px-4 py-2 text-sm font-black text-[#f0dba9]">
          <BadgeCheck size={17} />
          مقایسه سریع پلن‌ها
        </div>
        <h3 className="mt-4 text-2xl font-black text-[#fff9ed]">
          تفاوت پلن‌ها را سریع ببینید
        </h3>
        <p className="mt-3 leading-8 text-[#d9caa9]">
          کارت‌های بالا برای انتخاب سریع‌اند؛ این جدول تفاوت قابلیت‌ها را روشن‌تر می‌کند تا انتخاب پلن برای مدیر تالار ساده‌تر و مطمئن‌تر باشد.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-right">
          <thead>
            <tr className="bg-[#fff8ea]/[0.06] text-sm font-black text-[#ffe8ad]">
              <th className="border-b border-[#e8c478]/16 px-5 py-4">قابلیت</th>
              <th className="border-b border-[#e8c478]/16 px-5 py-4">پایه</th>
              <th className="border-b border-[#e8c478]/16 px-5 py-4">حرفه‌ای</th>
              <th className="border-b border-[#e8c478]/16 px-5 py-4">سازمانی</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => (
              <tr key={row.feature} className="border-b border-white/[0.07] last:border-b-0">
                <td className="px-5 py-4 text-sm font-black text-[#fff0cf]">
                  {row.feature}
                </td>
                <td className="px-5 py-4 text-sm font-bold leading-7 text-[#d9caa9]">
                  {row.base}
                </td>
                <td className="px-5 py-4 text-sm font-bold leading-7 text-[#f0dba9]">
                  {row.professional}
                </td>
                <td className="px-5 py-4 text-sm font-bold leading-7 text-[#d9caa9]">
                  {row.enterprise}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeatureCard({
  feature,
  compact = false,
}: {
  feature: IconCard;
  compact?: boolean;
}) {
  const Icon = feature.icon;

  return (
    <article
      className={`group relative overflow-hidden rounded-[1.75rem] border border-[#e8c478]/22 bg-[linear-gradient(145deg,rgba(255,248,234,0.11),rgba(255,248,234,0.045))] shadow-[0_26px_95px_rgba(0,0,0,0.24)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-[#e8c478]/45 ${
        compact ? "p-5" : "p-6"
      }`}
    >
      <div className="absolute -left-12 -top-12 h-28 w-28 rounded-full bg-[#d9b86f]/10 blur-2xl transition group-hover:bg-[#d9b86f]/18" />
      <div className="flex size-12 items-center justify-center rounded-2xl border border-[#e8c478]/28 bg-[#e8c478]/10 text-[#f0dba9]">
        <Icon size={24} />
      </div>
      <h3 className="mt-6 text-xl font-black text-[#fff9ed]">
        {feature.title}
      </h3>
      <p className={`${compact ? "mt-3 text-sm leading-7" : "mt-3 leading-8"} text-[#d9caa9]`}>
        {feature.description}
      </p>
    </article>
  );
}

function AccountAwareCta({ userIsLoggedIn }: { userIsLoggedIn: boolean }) {
  if (!userIsLoggedIn) {
    return (
      <div className="rounded-[2rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(255,248,234,0.13),rgba(255,248,234,0.055))] p-7 shadow-[0_30px_110px_rgba(0,0,0,0.30)] backdrop-blur-2xl sm:p-9">
        <p className="text-sm font-black text-[#f0dba9]">
          ادامه خرید با حساب کاربری
        </p>
        <h2 className="mt-3 text-3xl font-black text-[#fff9ed]">
          برای خرید اشتراک، وارد حساب شوید یا ثبت‌نام کنید
        </h2>
        <p className="mt-4 leading-8 text-[#d9caa9]">
          انتخاب پلن و فعال‌سازی اشتراک به حساب شما متصل می‌شود تا فضای
          اختصاصی تالار با مالکیت درست ایجاد شود.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className="btn-luxury-primary px-7 py-3">
            ورود و ادامه خرید
          </Link>
          <Link href="/register" className="btn-luxury-secondary px-7 py-3">
            ثبت‌نام و انتخاب پلن
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-[#e8c478]/28 bg-[radial-gradient(circle_at_12%_0%,rgba(232,196,120,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,248,234,0.14),rgba(15,23,35,0.94))] p-7 shadow-[0_30px_110px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-9">
      <p className="text-sm font-black text-[#f0dba9]">
        حساب شما آماده ادامه مسیر است
      </p>
      <h2 className="mt-3 text-3xl font-black text-[#fff9ed]">
        پس از انتخاب پلن، می‌توانید برای فعال‌سازی اشتراک اقدام کنید
      </h2>
      <p className="mt-4 leading-8 text-[#d9caa9]">
        پلن مناسب را از داخل حساب کاربری انتخاب کنید و مسیر فعال‌سازی اشتراک را ادامه دهید.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link href="/dashboard/account/plans" className="btn-luxury-primary px-7 py-3">
          انتخاب پلن در حساب کاربری
        </Link>
        <Link href="/dashboard" className="btn-luxury-secondary px-7 py-3">
          بازگشت به داشبورد
        </Link>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/25 bg-[#e8c478]/10 px-4 py-2 text-sm font-black text-[#f0dba9]">
        <BadgeCheck size={17} />
        {eyebrow}
      </div>
      <h2 className="mt-5 text-3xl font-black leading-tight text-[#fff9ed] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 leading-8 text-[#d9caa9]">{description}</p>
    </div>
  );
}
