import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Crown,
  FileSignature,
  Gem,
  HandCoins,
  LayoutDashboard,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Utensils,
  WalletCards,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatJalaliDate } from "@/lib/date/jalali";
import { formatIRR } from "@/lib/formatters";

type IconItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type PricingPlan = {
  title: string;
  price: string;
  description: string;
  href: string;
  cta: string;
  featured: boolean;
  badge?: string;
  benefits: string[];
};

const audienceItems = [
  "تالار پذیرایی",
  "باغ‌تالار",
  "سالن عقد",
  "تشریفات",
  "مجموعه چندسالن",
  "مدیر فروش و حسابداری تالار",
];

const trustItems = [
  "بدون نیاز به نصب پیچیده",
  "قابل استفاده روی موبایل و کامپیوتر",
  "شروع با دوره بررسی رایگان قبل از خرید",
  "پشتیبانی برای راه‌اندازی اولیه",
];

const problemCards: IconItem[] = [
  {
    title: "جلوگیری از تداخل رزروها",
    description:
      "تاریخ مراسم، سالن، وضعیت رزرو و پیگیری‌ها در یک مسیر مشخص ثبت می‌شود.",
    icon: CalendarDays,
  },
  {
    title: "کنترل دقیق بیعانه و مانده حساب",
    description:
      "دریافت‌ها، اقساط، مانده تسویه و وضعیت پرداخت هر قرارداد شفاف می‌ماند.",
    icon: WalletCards,
  },
  {
    title: "ثبت منظم منو و خدمات هر مراسم",
    description:
      "غذا، خدمات جانبی، تشریفات و انتخاب‌های قرارداد پراکنده و فراموش‌شده نمی‌ماند.",
    icon: Utensils,
  },
  {
    title: "گزارش سریع برای مدیریت و حسابداری",
    description:
      "مدیر تالار می‌تواند وضعیت قراردادها، دریافت‌ها و عملکرد مالی را سریع‌تر ببیند.",
    icon: ChartNoAxesCombined,
  },
];

const featureCards: IconItem[] = [
  {
    title: "مدیریت چند تالار و چند سالن",
    description:
      "تعریف تالار، سالن، ظرفیت، اطلاعات پایه و ساختار مناسب برای مجموعه‌های تشریفاتی چندبخشی.",
    icon: Building2,
  },
  {
    title: "ثبت قرارداد حرفه‌ای",
    description:
      "ثبت مشتری، تاریخ مراسم، سالن، مبلغ قرارداد، بیعانه، خدمات و خروجی رسمی قرارداد در یک جریان منظم.",
    icon: FileSignature,
  },
  {
    title: "تقویم رزرو شمسی",
    description:
      "نمایش رزروها با تقویم جلالی برای پیگیری مراسم، تاریخ‌های قطعی و جلوگیری از تداخل زمانی.",
    icon: CalendarDays,
  },
  {
    title: "منو و خدمات قرارداد",
    description:
      "انتخاب غذا، خدمات، گل‌آرایی، موسیقی، تشریفات و موارد جانبی برای هر قرارداد.",
    icon: Utensils,
  },
  {
    title: "پرداخت‌ها و تسویه",
    description:
      "ثبت بیعانه، اقساط، مانده حساب، هزینه‌ها و وضعیت تسویه هر قرارداد برای کنترل مالی دقیق‌تر.",
    icon: WalletCards,
  },
  {
    title: "گزارش‌های مالی شفاف",
    description:
      "نمای مدیریتی از قراردادها، دریافت‌ها، مانده‌ها و وضعیت مالی تالار بدون گشتن بین دفتر، اکسل و پیام‌رسان.",
    icon: ChartNoAxesCombined,
  },
];

const previewCards: IconItem[] = [
  {
    title: "صفحه ثبت قرارداد",
    description:
      "ثبت مشتری، مراسم، سالن، خدمات، منو، مبلغ و شرایط قرارداد در یک فرم مدیریتی.",
    icon: FileSignature,
  },
  {
    title: "تقویم رزروها",
    description:
      "مشاهده وضعیت رزروهای قطعی و پیگیری‌های روزانه با تاریخ شمسی.",
    icon: CalendarDays,
  },
  {
    title: "خدمات و منوها",
    description:
      "تعریف خدمات ثابت، منوهای غذایی و گزینه‌هایی که هنگام ثبت قرارداد استفاده می‌شوند.",
    icon: Utensils,
  },
  {
    title: "مالی قرارداد",
    description:
      "نمایش بیعانه، دریافتی، اقساط، مانده تسویه و وضعیت مالی هر مراسم.",
    icon: WalletCards,
  },
];

const stats = [
  {
    value: "۳ سالن فعال",
    label: "نمونه مدیریت چند سالن",
    icon: LayoutDashboard,
  },
  {
    value: "۱۲ قرارداد ماه جاری",
    label: "نمونه ثبت قرارداد حرفه‌ای",
    icon: ClipboardCheck,
  },
  {
    value: "۸۵٪ تسویه‌شده",
    label: "نمونه گزارش مالی شفاف",
    icon: HandCoins,
  },
  {
    value: "PWA قابل نصب",
    label: "موبایل و دسکتاپ",
    icon: Smartphone,
  },
];

const workflowSteps = [
  {
    title: "ورود به دوره بررسی رایگان",
    description:
      "بدون پرداخت وارد محیط دوره بررسی شوید و مسیر ثبت قرارداد، خدمات، منو و پرداخت را ببینید.",
  },
  {
    title: "بررسی امکانات و انتخاب پلن",
    description:
      "تالار، سالن، خدمات، منو، روش پرداخت، قرارداد و گزارش‌ها را بررسی کنید و پلن مناسب را انتخاب کنید.",
  },
  {
    title: "فعال‌سازی فضای واقعی تالار",
    description:
      "پس از خرید اشتراک، فضای اختصاصی تالار فعال می‌شود و مدیریت واقعی قراردادها آغاز می‌گردد.",
  },
];

const pricingPlans: PricingPlan[] = [
  {
    title: "دوره بررسی رایگان سامانه",
    price: "رایگان",
    description: "برای بررسی اولیه قبل از خرید",
    href: "/demo",
    cta: "شروع دوره بررسی رایگان",
    featured: false,
    benefits: [
      "تست محیط واقعی سامانه",
      "بدون نیاز به پرداخت",
      "مناسب بررسی اولیه",
      "بدون فعال‌سازی نهایی تالار",
    ],
  },
  {
    title: "اشتراک ماهانه ویژه",
    price: "به‌زودی",
    description: "مناسب شروع واقعی مدیریت تالار",
    href: "/purchase",
    cta: "انتخاب پلن ماهانه",
    featured: true,
    badge: "پیشنهادی برای شروع واقعی",
    benefits: [
      "ثبت قرارداد و رزرو",
      "مدیریت خدمات و منوها",
      "کنترل پرداخت‌ها و مانده حساب",
      "گزارش‌های مدیریتی تالار",
    ],
  },
  {
    title: "اشتراک سالانه پیشرفته",
    price: "پیشنهادی",
    description: "برای مجموعه‌های حرفه‌ای و دائمی",
    href: "/purchase",
    cta: "درخواست فعال‌سازی سالانه",
    featured: false,
    benefits: [
      "همه امکانات پلن ماهانه",
      "مناسب استفاده دائمی",
      "اولویت در راه‌اندازی و پشتیبانی",
      "به‌صرفه‌تر نسبت به پرداخت ماهانه",
    ],
  },
];

const contractRows = [
  ["نام مشتری نمونه", "خانواده احمدی"],
  ["مبلغ کل", formatIRR(1200000000)],
  ["دریافتی", formatIRR(860000000)],
  ["مانده تسویه", formatIRR(340000000)],
];

export default function Home() {
  const today = new Date();

  return (
    <main
      dir="rtl"
      className="talar-home-page font-sans isolate min-h-screen overflow-hidden bg-[#070b12] text-[#fff8ea]"
    >
      <LuxuryBackground />
      <Header />

      <section className="relative px-4 pb-10 pt-20 sm:px-6 sm:pb-14 sm:pt-28 lg:px-8">
        <Image
          src="/hero-banquet.png"
          alt="تالار پذیرایی لوکس برای معرفی تالار منیجر"
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover opacity-[0.42]"
        />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(232,196,120,0.30),transparent_26rem),radial-gradient(circle_at_82%_32%,rgba(22,86,70,0.30),transparent_27rem),linear-gradient(90deg,rgba(7,11,18,0.50),rgba(7,11,18,0.90)_48%,rgba(7,11,18,0.99)_82%)]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#070b12] to-transparent" />

        <div className="relative mx-auto grid min-h-0 max-w-7xl items-center gap-8 py-5 sm:gap-12 sm:py-10 lg:min-h-[650px] lg:grid-cols-[1.02fr_0.98fr]">
          <div className="order-2 lg:order-1">
            <HeroMockup today={today} />
          </div>

          <div className="order-1 text-center lg:order-2 lg:text-right">
            <div className="inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-[#e8c478]/35 bg-[#e8c478]/12 px-3 py-2 text-xs font-black leading-6 text-[#ffe8ad] shadow-[0_0_50px_rgba(232,196,120,0.18)] backdrop-blur-2xl sm:px-4 sm:text-sm">
              <Crown size={18} />
              مخصوص مدیران تالار، باغ‌تالار، تشریفات و سالن‌های مراسم
            </div>

            <h1 className="mx-auto mt-5 max-w-4xl text-[1.85rem] font-black leading-[1.35] tracking-normal text-[#fff9ed] drop-shadow-2xl sm:mt-7 sm:text-5xl sm:leading-[1.18] lg:mx-0 lg:text-6xl">
              مدیریت قرارداد، رزرو، خدمات و مالی تالار در یک سامانه لوکس و
              یکپارچه
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-[0.95rem] leading-8 text-[#eadcc0] sm:mt-6 sm:text-xl sm:leading-9 lg:mx-0">
              ثبت قرارداد، انتخاب منو و خدمات، کنترل بیعانه و اقساط، مدیریت
              رزروها و گزارش‌گیری مالی را در یک مسیر منظم انجام دهید.
            </p>

            <div className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:mt-9 sm:max-w-none sm:flex-row lg:mx-0">
              <Link
                href="/demo"
                className="btn-luxury-primary w-full px-7 py-3 text-base shadow-[0_22px_70px_rgba(232,196,120,0.28)] sm:w-auto"
              >
                شروع دوره بررسی رایگان
                <ArrowLeft size={19} />
              </Link>
              <a
                href="#pricing"
                className="btn-luxury-secondary w-full px-7 py-3 text-base sm:w-auto"
              >
                مشاهده تعرفه‌ها
              </a>
            </div>

            <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-2 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3 lg:mx-0">
              {audienceItems.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/[0.10] bg-white/[0.06] px-3 py-2.5 text-center text-[0.72rem] font-black leading-5 text-[#f3dfb7] backdrop-blur-xl sm:px-4 sm:py-3 sm:text-sm"
                >
                  <CheckCircle2 className="ml-2 inline text-[#d9b86f]" size={17} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="نمونه وضعیت یک تالار در سامانه" className="relative z-10 px-4 pb-10 pt-0 sm:px-6 sm:pb-14 sm:pt-2 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 text-center text-sm font-black text-[#f0dba9]">
            نمونه وضعیت یک تالار در سامانه
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <article
                  key={stat.value}
                  className="group rounded-[1.35rem] border border-[#e8c478]/22 bg-[linear-gradient(145deg,rgba(255,248,234,0.12),rgba(255,248,234,0.045))] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition hover:-translate-y-1 hover:border-[#e8c478]/45 sm:rounded-[1.75rem] sm:p-5 sm:shadow-[0_28px_90px_rgba(0,0,0,0.24)]"
                >
                  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex size-10 items-center justify-center rounded-2xl border border-[#e8c478]/28 bg-[#e8c478]/10 text-[#f0dba9] sm:size-12">
                      <Icon size={23} />
                    </div>
                    <span className="h-px w-full flex-none bg-gradient-to-l from-[#e8c478]/55 to-transparent sm:w-auto sm:flex-1" />
                  </div>
                  <p className="mt-4 text-base font-black leading-7 text-[#fff9ed] sm:mt-5 sm:text-2xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-bold leading-5 text-[#cfc0a0] sm:mt-2 sm:text-sm">
                    {stat.label}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="مسئله‌ای که حل می‌کند"
            title="اگر هنوز قراردادها را در دفتر، اکسل یا پیام‌رسان مدیریت می‌کنید..."
            description="تالار منیجر کمک می‌کند همه چیز از رزرو تا پرداخت و گزارش مالی در یک مسیر منظم ثبت شود، نه در هزار جای پراکنده که آخرش همه دنبال یک پیام گمشده می‌گردند."
          />

          <div className="mt-7 grid gap-3 sm:mt-11 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
            {problemCards.map((item) => (
              <CompactCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="relative px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="امکانات محصول"
            title="پایه محصول واقعی، آماده مدیریت مرحله‌ای تالار"
            description="این فقط یک صفحه نمایشی نیست؛ ساختار حساب، دوره بررسی، اشتراک، تالار، سالن، منو، خدمات، قرارداد و مالی از ابتدا برای استفاده واقعی طراحی شده است."
          />

          <div className="mt-7 grid gap-3 sm:mt-11 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="نمای داخل سامانه"
            title="داخل سامانه چه می‌بینید؟"
            description="کاربر قبل از خرید باید بفهمد با چه محیطی طرف است؛ این بخش مسیرهای اصلی داخل پنل را روشن و قابل‌تصور می‌کند."
          />

          <div className="mt-7 grid gap-3 sm:mt-11 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
            {previewCards.map((item) => (
              <CompactCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="relative px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="absolute inset-x-0 top-16 -z-10 mx-auto h-72 max-w-5xl rounded-full bg-[#17483f]/30 blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-5 sm:gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div className="rounded-[1.5rem] border border-[#e8c478]/24 bg-[#101825]/82 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.30)] backdrop-blur-2xl sm:rounded-[2rem] sm:p-7 sm:shadow-[0_30px_110px_rgba(0,0,0,0.32)]">
            <div className="inline-flex size-14 items-center justify-center rounded-2xl border border-[#e8c478]/35 bg-[#e8c478]/12 text-[#f0dba9]">
              <ShieldCheck size={27} />
            </div>
            <h2 className="mt-5 text-2xl font-black leading-tight text-[#fff9ed] sm:mt-6 sm:text-4xl">
              قبل از خرید، سامانه را واقعی تست کنید
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#d9caa9] sm:mt-4 sm:text-base sm:leading-8">
              بدون نیاز به پرداخت، وارد محیط دوره بررسی شوید و ثبت قرارداد، خدمات،
              منوها، پرداخت‌ها و گزارش‌ها را بررسی کنید.
            </p>
            <Link href="/demo" className="btn-luxury-primary mt-7 px-6 py-3">
              ورود به دوره بررسی رایگان
              <ArrowLeft size={18} />
            </Link>
          </div>

          <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <article
                key={step.title}
                className="relative overflow-hidden rounded-[1.35rem] border border-[#e8c478]/24 bg-[linear-gradient(150deg,rgba(255,249,238,0.14),rgba(255,249,238,0.055))] p-4 shadow-[0_18px_64px_rgba(0,0,0,0.20)] backdrop-blur-2xl sm:rounded-[1.75rem] sm:p-6 sm:shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
              >
                <div className="absolute -left-10 -top-10 h-24 w-24 rounded-full bg-[#d9b86f]/16 blur-2xl" />
                <p className="text-3xl font-black text-[#f0dba9] sm:text-4xl">
                  {["۰۱", "۰۲", "۰۳"][index]}
                </p>
                <h3 className="mt-3 text-lg font-black text-[#fff9ed] sm:mt-5 sm:text-xl">
                  {step.title}
                </h3>
                <p className="mt-2 text-[0.88rem] leading-7 text-[#d9caa9] sm:mt-3 sm:text-[0.95rem]">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[1.5rem] border border-[#e8c478]/25 bg-[linear-gradient(145deg,rgba(255,248,234,0.10),rgba(14,22,34,0.92))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:rounded-[2.25rem] sm:p-9 sm:shadow-[0_30px_110px_rgba(0,0,0,0.30)]">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/28 bg-[#e8c478]/10 px-4 py-2 text-sm font-black text-[#f0dba9]">
                <ShieldCheck size={17} />
                اعتمادسازی قبل از خرید
              </div>
              <h2 className="mt-4 text-2xl font-black leading-tight text-[#fff9ed] sm:mt-5 sm:text-4xl">
                چرا با خیال راحت شروع می‌کنید؟
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#d9caa9] sm:mt-4 sm:text-base sm:leading-9">
                دوره بررسی قبل از خرید، استفاده روی موبایل و کامپیوتر، راه‌اندازی اولیه
                و مسیر روشن خرید باعث می‌شود مدیر تالار بدون ریسک اولیه سامانه
                را بررسی کند.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {trustItems.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/[0.10] bg-white/[0.055] p-4 text-sm font-black leading-7 text-[#f3dfb7]"
                >
                  <CheckCircle2 className="ml-2 inline text-[#d9b86f]" size={18} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="relative px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="تعرفه‌ها"
            title="پلن‌های شفاف برای شروع دوره بررسی و خرید اشتراک"
            description="کاربر باید دقیق بداند بررسی رایگان برای ارزیابی اولیه است، پلن ماهانه برای شروع واقعی است و پلن سالانه برای استفاده دائمی و حرفه‌ای مناسب‌تر است."
          />

          <div className="mt-7 grid gap-4 sm:mt-11 sm:gap-5 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <PricingCard key={plan.title} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-12 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[1.5rem] border border-[#e8c478]/30 bg-[radial-gradient(circle_at_12%_0%,rgba(232,196,120,0.22),transparent_20rem),linear-gradient(135deg,rgba(23,35,51,0.97),rgba(8,13,20,0.98))] p-5 shadow-[0_28px_100px_rgba(0,0,0,0.34)] sm:rounded-[2.25rem] sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/28 bg-[#e8c478]/10 px-4 py-2 text-sm font-black text-[#f0dba9]">
                <Sparkles size={17} />
                شروع حرفه‌ای
              </div>
              <h2 className="mt-4 text-2xl font-black leading-tight text-[#fff9ed] sm:mt-5 sm:text-4xl">
                قبل از خرید، سامانه را تست کنید
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#d9caa9] sm:mt-4 sm:text-base sm:leading-9">
                دوره بررسی رایگان را ببینید، امکانات را بررسی کنید و بعد برای
                فعال‌سازی فضای واقعی تالار تصمیم بگیرید.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/demo" className="btn-luxury-primary px-7 py-3">
                شروع دوره بررسی رایگان
                <ArrowLeft size={18} />
              </Link>
              <a href="#pricing" className="btn-luxury-secondary px-7 py-3">
                مشاهده تعرفه‌ها
              </a>
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

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#e8c478]/20 bg-[#070b12]/72 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="flex size-10 items-center justify-center rounded-[0.95rem] border border-[#e8c478]/38 bg-[linear-gradient(145deg,rgba(232,196,120,0.22),rgba(232,196,120,0.08))] text-[#f0dba9] shadow-[0_12px_42px_rgba(232,196,120,0.18)] sm:size-12 sm:rounded-[1.1rem]">
            <Gem size={23} />
          </span>
          <span>
            <span className="block whitespace-nowrap text-base font-black text-[#fff4d5] sm:text-xl">
              تالار منیجر
            </span>
            <span className="hidden text-xs font-bold text-[#d9caa9] sm:block">
              سامانه لوکس مدیریت تالار
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 text-sm font-black text-[#d9caa9] lg:flex">
          <a href="#features" className="hover:text-[#f0dba9]">
            امکانات
          </a>
          <a href="#demo" className="hover:text-[#f0dba9]">
            دوره بررسی
          </a>
          <a href="#pricing" className="hover:text-[#f0dba9]">
            تعرفه‌ها
          </a>
          <Link href="/login" className="hover:text-[#f0dba9]">
            ورود
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-2xl border border-white/[0.10] bg-white/[0.05] px-4 py-2 text-sm font-black text-[#eadcc0] backdrop-blur-xl hover:border-[#e8c478]/35 hover:text-[#f0dba9] sm:inline-flex"
          >
            ورود
          </Link>
          <Link
            href="/demo"
            className="btn-luxury-primary min-h-0 rounded-xl px-3 py-2 text-xs sm:rounded-2xl sm:px-4 sm:text-sm"
          >
            شروع دوره بررسی رایگان
            <ChevronLeft size={17} />
          </Link>
        </div>
      </nav>
    </header>
  );
}

function HeroMockup({ today }: { today: Date }) {
  return (
    <div className="relative mx-auto max-w-[23rem] sm:max-w-xl">
      <div className="absolute -inset-3 rounded-[2rem] bg-[conic-gradient(from_140deg,rgba(232,196,120,0.28),rgba(23,72,63,0.16),transparent,rgba(232,196,120,0.22))] blur-2xl sm:-inset-5 sm:rounded-[2.5rem]" />
      <div className="relative overflow-hidden rounded-[1.5rem] border border-[#e8c478]/30 bg-[linear-gradient(145deg,rgba(14,22,34,0.94),rgba(7,11,18,0.94))] p-3 shadow-[0_26px_100px_rgba(0,0,0,0.40)] backdrop-blur-2xl sm:rounded-[2rem] sm:p-4 sm:shadow-[0_38px_140px_rgba(0,0,0,0.46)]">
        <div className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.045] p-3 sm:rounded-[1.5rem] sm:p-4">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div>
              <p className="text-sm font-black text-[#f0dba9]">
                قرارداد امروز
              </p>
              <h2 className="mt-2 text-xl font-black text-[#fff9ed] sm:text-2xl">
                مراسم عقد و پذیرایی
              </h2>
              <p className="mt-2 text-sm font-bold text-[#d9caa9]">
                {formatJalaliDate(today)}
              </p>
            </div>
            <div className="rounded-2xl border border-[#25a46d]/30 bg-[#25a46d]/12 px-3 py-2 text-xs font-black text-[#a9f2cf]">
              وضعیت قرارداد: تایید شده
            </div>
          </div>

          <div className="gold-divider my-5" />

          <div className="grid gap-3 sm:grid-cols-2">
            {contractRows.map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/[0.10] bg-[#fff8ea]/[0.07] p-3 sm:rounded-3xl sm:p-4"
              >
                <p className="text-xs font-black text-[#cfc0a0]">{label}</p>
                <p className="mt-2 text-base font-black leading-7 text-[#fff9ed] sm:text-lg">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-[#e8c478]/20 bg-[#e8c478]/[0.08] p-3 sm:rounded-3xl sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-[#eadcc0]">
                  رزروهای هفته
                </span>
                <CalendarDays size={19} className="text-[#f0dba9]" />
              </div>
              <p className="mt-2 text-2xl font-black text-[#fff9ed] sm:mt-3 sm:text-3xl">
                ۲۸ رزرو
              </p>
              <p className="mt-1 text-xs font-bold text-[#cfc0a0]">
                ۶ مراسم قطعی، ۴ پیش‌قرارداد
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.10] bg-white/[0.045] p-3 sm:rounded-3xl sm:p-4">
              <div className="flex items-center justify-between text-sm font-black text-[#eadcc0]">
                <span>پیشرفت تسویه</span>
                <span className="text-[#f0dba9]">۷۲٪</span>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/[0.10]">
                <div className="h-full w-[72%] rounded-full bg-gradient-to-l from-[#f0dba9] via-[#d9b86f] to-[#9f7131]" />
              </div>
              <p className="mt-3 text-xs font-bold text-[#cfc0a0]">
                مانده تسویه قبل از تاریخ مراسم
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["سالن", "رویال"],
            ["منو", "طلایی"],
            ["خدمات", "تشریفات کامل"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 text-center"
            >
              <p className="text-xs font-bold text-[#cfc0a0]">{label}</p>
              <p className="mt-1 text-sm font-black text-[#fff9ed]">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ feature }: { feature: IconItem }) {
  const Icon = feature.icon;

  return (
    <article className="group relative overflow-hidden rounded-[1.35rem] border border-[#e8c478]/22 bg-[linear-gradient(145deg,rgba(255,248,234,0.11),rgba(255,248,234,0.045))] p-4 shadow-[0_20px_72px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-[#e8c478]/45 sm:rounded-[1.75rem] sm:p-6 sm:shadow-[0_26px_95px_rgba(0,0,0,0.24)]">
      <div className="absolute -left-12 -top-12 h-28 w-28 rounded-full bg-[#d9b86f]/10 blur-2xl transition group-hover:bg-[#d9b86f]/18" />
      <div className="flex size-10 items-center justify-center rounded-2xl border border-[#e8c478]/28 bg-[#e8c478]/10 text-[#f0dba9] sm:size-12">
        <Icon size={24} />
      </div>
      <h3 className="mt-4 text-lg font-black text-[#fff9ed] sm:mt-6 sm:text-xl">
        {feature.title}
      </h3>
      <p className="mt-2 text-[0.9rem] leading-7 text-[#d9caa9] sm:mt-3 sm:text-[0.98rem] sm:leading-8">{feature.description}</p>
    </article>
  );
}

function CompactCard({ item }: { item: IconItem }) {
  const Icon = item.icon;

  return (
    <article className="relative overflow-hidden rounded-[1.25rem] border border-[#e8c478]/20 bg-[linear-gradient(145deg,rgba(255,248,234,0.10),rgba(255,248,234,0.042))] p-4 shadow-[0_18px_64px_rgba(0,0,0,0.20)] backdrop-blur-2xl transition hover:-translate-y-1 hover:border-[#e8c478]/42 sm:rounded-[1.6rem] sm:p-5 sm:shadow-[0_22px_80px_rgba(0,0,0,0.22)]">
      <div className="absolute -left-12 -top-12 h-24 w-24 rounded-full bg-[#e8c478]/10 blur-2xl" />
      <div className="flex size-10 items-center justify-center rounded-2xl border border-[#e8c478]/28 bg-[#e8c478]/10 text-[#f0dba9] sm:size-11">
        <Icon size={22} />
      </div>
      <h3 className="mt-4 text-base font-black leading-7 text-[#fff9ed] sm:mt-5 sm:text-lg">{item.title}</h3>
      <p className="mt-2 text-[0.88rem] leading-7 text-[#d9caa9] sm:mt-3 sm:text-[0.95rem]">
        {item.description}
      </p>
    </article>
  );
}

function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <article
      className={`relative overflow-hidden rounded-[1.5rem] p-5 shadow-[0_22px_78px_rgba(0,0,0,0.24)] sm:rounded-[2rem] sm:p-7 sm:shadow-[0_28px_100px_rgba(0,0,0,0.28)] ${
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
      <h3 className="mt-5 text-xl font-black text-[#fff9ed] sm:mt-6 sm:text-2xl">{plan.title}</h3>
      <p className="mt-3 text-3xl font-black text-[#f0dba9] sm:text-4xl">{plan.price}</p>
      <p className="mt-3 text-sm leading-7 text-[#d9caa9] sm:mt-4 sm:text-base sm:leading-8">{plan.description}</p>
      <ul className="mt-5 space-y-3">
        {plan.benefits.map((benefit) => (
          <li
            key={benefit}
            className="flex items-start gap-2 text-sm font-bold leading-7 text-[#eadcc0]"
          >
            <CheckCircle2 className="mt-1 shrink-0 text-[#d9b86f]" size={17} />
            <span>{benefit}</span>
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
    <div className="mx-auto max-w-3xl px-1 text-center sm:px-0">
      <div className="inline-flex items-center justify-center gap-2 rounded-full border border-[#e8c478]/25 bg-[#e8c478]/10 px-3 py-2 text-xs font-black text-[#f0dba9] sm:px-4 sm:text-sm">
        <BadgeCheck size={17} />
        {eyebrow}
      </div>
      <h2 className="mt-4 text-2xl font-black leading-tight text-[#fff9ed] sm:mt-5 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-[#d9caa9] sm:mt-4 sm:text-base sm:leading-8">{description}</p>
    </div>
  );
}
